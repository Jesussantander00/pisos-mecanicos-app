// Respaldo automático diario a Google Drive (carpeta QuinTech/Respaldos). Corre dentro del mismo
// cron diario del "digest" (ver api/telkonet.js), así que NO cuenta como una función más de
// Vercel ni usa un cron nuevo (el plan gratuito permite máximo 12 funciones y 2 crons).
//
// Qué guarda: una copia en JSON de TODA la tabla app_storage (tareas, mantenimientos, inventario,
// equipos, turnos, etc.). Las fotos y videos no entran: viven en Supabase Storage.
// Solo LEE la base de datos; lo único que escribe es la marca "last-backup" al terminar bien.
// Conserva los últimos 30 respaldos automáticos y borra los más viejos (solo los que lleven el
// nombre "Respaldo automático", nunca otros archivos).
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3/files";
const KEEP = 30;
const PREFIX = "Respaldo automático ";

async function getAccessToken() {
  const cid = process.env.GOOGLE_CLIENT_ID, csec = process.env.GOOGLE_CLIENT_SECRET, rtok = process.env.GOOGLE_REFRESH_TOKEN;
  if (!cid || !csec || !rtok) throw new Error("Faltan las claves de Google en Vercel.");
  const r = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: csec, refresh_token: rtok, grant_type: "refresh_token" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google no aceptó las claves (${j.error_description || j.error || r.status}).`);
  return j.access_token;
}

async function folder(token, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId || "root"}' in parents`;
  const r = await fetch(`${API}?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  if (j.files?.[0]) return j.files[0].id;
  const c = await fetch(`${API}?fields=id`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  });
  const cj = await c.json();
  if (!cj.id) throw new Error("No se pudo crear la carpeta en Drive.");
  return cj.id;
}

async function readAll(supabaseAdmin) {
  const out = {};
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin.from("app_storage").select("key,value,updated_at").order("key").range(from, from + 499);
    if (error) throw new Error(`No se pudo leer la base: ${error.message}`);
    (data || []).forEach(r => { out[r.key] = { value: r.value, updated_at: r.updated_at }; });
    if (!data || data.length < 500) break;
  }
  return out;
}

export async function runDriveBackup(supabaseAdmin) {
  const token = await getAccessToken();
  const root = await folder(token, "QuinTech", null);
  const rf = await folder(token, "Respaldos", root);
  const day = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); // fecha en hora de Colombia
  const name = `${PREFIX}${day}.json`;

  // Si ya hay uno de hoy, no se repite.
  const q = `name='${name}' and trashed=false and '${rf}' in parents`;
  const ex = await (await fetch(`${API}?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`, { headers: { Authorization: `Bearer ${token}` } })).json();
  if (ex.files?.length) return { skipped: true, name };

  const data = await readAll(supabaseAdmin);
  const body = JSON.stringify({ generado: new Date().toISOString(), llaves: Object.keys(data).length, data });
  const boundary = "qt" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name, parents: [rf], mimeType: "application/json" });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const up = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart,
  });
  const uj = await up.json().catch(() => ({}));
  if (!up.ok || !uj.id) throw new Error(`Drive no aceptó el archivo (${uj.error?.message || up.status}).`);

  // Limpieza: deja solo los últimos KEEP respaldos automáticos.
  let removed = 0;
  try {
    const lq = `name contains '${PREFIX}' and trashed=false and '${rf}' in parents`;
    const lj = await (await fetch(`${API}?q=${encodeURIComponent(lq)}&orderBy=name desc&pageSize=200&fields=files(id,name)&spaces=drive`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const old = (lj.files || []).filter(f => f.name.startsWith(PREFIX)).slice(KEEP);
    for (const f of old) { const d = await fetch(`${API}/${f.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); if (d.ok || d.status === 204) removed++; }
  } catch { /* la limpieza es opcional */ }

  await supabaseAdmin.from("app_storage").upsert({ key: "last-backup", value: { at: new Date().toISOString(), name, bytes: body.length, auto: true }, updated_at: new Date().toISOString() });
  return { ok: true, name, bytes: body.length, removed };
}
