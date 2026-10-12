// Archivo automático en Google Drive. Lo dispara el cron diario (ver api/telkonet.js, acción
// "digest"). Pasa a Drive (QuinTech / AAAA-MM / Fotos | Videos) las fotos y videos con más de
// KEEP_DAYS días, y SOLO después de confirmar que el archivo quedó en Drive con el mismo tamaño:
//   1) copia a Drive y verifica,  2) cambia el enlace en la app por la tarjeta "Archivada en Drive",
//   3) borra el original de Supabase Storage.
// Si se acaba el tiempo a la mitad, lo que falta se hace en la corrida del día siguiente.
// Nunca toca fotos de equipos ni videos de referencia (rutas que empiezan por "equipo").

const KEEP_DAYS = 7;
const MEDIA_RE = /https?:\/\/[^"'\s\\]*\/storage\/v1\/object\/sign\/(maintenance-photos|maintenance-videos)\/([^"'\s\\?]+)\?[^"'\s\\]*/g;

const monthKeyOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const placeholderFor = (ym) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='100%' height='100%' fill='#243241'/><text x='50%' y='46%' fill='#e7edf3' font-family='sans-serif' font-size='17' text-anchor='middle'>Archivada en Drive</text><text x='50%' y='62%' fill='#9fb0bf' font-family='sans-serif' font-size='15' text-anchor='middle'>${ym}</text></svg>`);

async function getDriveToken() {
  const cid = process.env.GOOGLE_CLIENT_ID, csec = process.env.GOOGLE_CLIENT_SECRET, rtok = process.env.GOOGLE_REFRESH_TOKEN;
  if (!cid || !csec || !rtok) throw new Error("Falta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN en Vercel.");
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: csec, refresh_token: rtok, grant_type: "refresh_token" }),
  });
  const tj = await tr.json().catch(() => ({}));
  if (!tr.ok || !tj.access_token) throw new Error(`Google no aceptó las claves (${tj.error_description || tj.error || tr.status}).`);
  return tj.access_token;
}

async function driveApi(token, url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`Drive respondió ${r.status}`);
  return r;
}
async function driveFolder(token, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId || "root"}' in parents`;
  const j = await (await driveApi(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`)).json();
  if (j.files?.[0]) return j.files[0].id;
  const c = await driveApi(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  });
  return (await c.json()).id;
}
async function driveFileSize(token, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and trashed=false and '${parentId}' in parents`;
  const j = await (await driveApi(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,size)&spaces=drive`)).json();
  return j.files?.[0] ? Number(j.files[0].size) : null;
}
async function driveUpload(token, buf, name, parentId, mime) {
  const boundary = "pmarch" + Math.random().toString(36).slice(2);
  const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parentId] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const r = await driveApi(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: Buffer.concat([head, buf, tail]),
  });
  return Number((await r.json()).size);
}

async function allRows(db) {
  const out = []; const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from("app_storage").select("key,value").range(from, from + PAGE - 1);
    if (error) throw new Error(`No se pudo leer la base (${error.message}).`);
    out.push(...data); if (data.length < PAGE) break;
  }
  return out;
}

async function recordRun(db, result) {
  try { await db.from("app_storage").upsert({ key: "drive-archive-last", value: { at: new Date().toISOString(), ...result }, updated_at: new Date().toISOString() }, { onConflict: "key" }); } catch { /* noop */ }
}

export async function runDriveArchive(db, opts = {}) {
  try { const r = await runDriveArchiveInner(db, opts); await recordRun(db, r); return r; }
  catch (e) { const r = { error: e.message || "falló el archivo en Drive" }; await recordRun(db, r); throw e; }
}

async function runDriveArchiveInner(db, { budgetMs = 40000 } = {}) {
  const t0 = Date.now();
  const left = () => budgetMs - (Date.now() - t0);
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  const rows = await allRows(db);
  const byUrl = new Map();
  for (const r of rows) {
    const txt = JSON.stringify(r.value ?? null);
    for (const m of txt.matchAll(MEDIA_RE)) {
      const url = m[0], bucket = m[1], path = decodeURIComponent(m[2]);
      if (path.startsWith("equipo")) continue;
      const tm = path.match(/(\d{13})-[a-z0-9]+\.[a-z0-9]+$/i);
      if (!tm) continue;
      const ts = Number(tm[1]);
      if (ts >= cutoff) continue;
      if (!byUrl.has(url)) byUrl.set(url, { url, bucket, path, ts, ym: monthKeyOf(ts), keys: new Set() });
      byUrl.get(url).keys.add(r.key);
    }
  }
  const pending = [...byUrl.values()].sort((a, b) => a.ts - b.ts);
  if (!pending.length) return { archived: 0, pending: 0, note: "Nada para archivar." };

  const token = await getDriveToken();
  const root = await driveFolder(token, "QuinTech", null);
  const folders = {};
  const folderFor = async (ym, bucket) => {
    const k = `${ym}/${bucket}`;
    if (!folders[k]) {
      const mf = folders[ym] || (folders[ym] = await driveFolder(token, ym, root));
      folders[k] = await driveFolder(token, bucket === "maintenance-videos" ? "Videos" : "Fotos", mf);
    }
    return folders[k];
  };

  const done = []; let failed = 0;
  for (const it of pending) {
    if (left() < 12000) break; // deja tiempo para actualizar la app y borrar originales
    try {
      const { data: blob, error } = await db.storage.from(it.bucket).download(it.path);
      if (error || !blob) throw new Error("no se pudo leer el original");
      const buf = Buffer.from(await blob.arrayBuffer());
      const folder = await folderFor(it.ym, it.bucket);
      const name = it.path.replace(/\//g, "_");
      let size = await driveFileSize(token, name, folder);
      if (size !== buf.length) size = await driveUpload(token, buf, name, folder, blob.type || (it.bucket === "maintenance-videos" ? "video/mp4" : "image/jpeg"));
      if (size !== buf.length) throw new Error("el tamaño en Drive no coincide");
      done.push(it);
    } catch (e) { failed++; }
  }
  if (!done.length) return { archived: 0, pending: pending.length, failed };

  // 2) reemplazar enlaces en la app (leyendo cada fila de nuevo justo antes de escribir)
  const keys = new Set(); done.forEach(it => it.keys.forEach(k => keys.add(k)));
  for (const key of keys) {
    const { data } = await db.from("app_storage").select("value").eq("key", key).maybeSingle();
    if (!data) continue;
    let txt = JSON.stringify(data.value ?? null); const before = txt;
    for (const it of done) txt = txt.split(it.url).join(placeholderFor(it.ym));
    if (txt !== before) {
      const { error } = await db.from("app_storage").upsert({ key, value: JSON.parse(txt), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new Error(`No se pudo actualizar "${key}" (${error.message}); no se borró ningún original.`);
    }
  }
  // 3) borrar originales (ya están en Drive y la app ya no los usa)
  let removed = 0;
  for (const bucket of ["maintenance-photos", "maintenance-videos"]) {
    const paths = done.filter(i => i.bucket === bucket).map(i => i.path);
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (!error) removed += (data || []).length;
    }
  }
  return { archived: done.length, removed, failed, pending: pending.length - done.length };
}
