// Resumen diario por notificación push (corre solo, una vez al día, desde una tarea programada
// de Vercel — ver vercel.json y el bloque ?action=digest en api/telkonet.js). Hace dos cosas:
//
//  1) "Buenos días" a cada persona con trabajo: cuántas tareas tiene abiertas hoy y cuántas ya
//     están vencidas (más de 24 h desde que se le asignaron), con los primeros títulos.
//  2) Resumen para los administradores: cuántas tareas llevan más de 24 h abiertas en total,
//     quién las tiene, y cuántas siguen sin asignar.
//
// Solo LEE las tareas y las suscripciones — nunca escribe nada en la base de datos. Así no hay
// riesgo de pisar lo que la app guarda al mismo tiempo. Está en _lib para no contar como una
// función más de Vercel (el plan gratuito permite máximo 12).
import webpush from "web-push";

const OVERDUE_HOURS = 24;
const MAX_TEXT = 200;

const isOpen = (t) => {
  const e = t.estado;
  return !(e === "finalizada" || e === "hecho");
};
const isSnoozed = (t) => !!t.snoozedUntil && new Date(t.snoozedUntil) > new Date();
const lastActivityMs = (t) => {
  const c = (t.comments || []).reduce((m, x) => Math.max(m, new Date(x.at || 0).getTime() || 0), 0);
  return Math.max(new Date(t.updatedAt || 0).getTime() || 0, new Date(t.createdAt || t.assignedAt || 0).getTime() || 0, c);
};
const STALE_DAYS = 3;
const isStale = (t) => lastActivityMs(t) > 0 && (Date.now() - lastActivityMs(t)) / 864e5 >= STALE_DAYS;
const isOverdue = (t) => !!t.assignedAt && (Date.now() - new Date(t.assignedAt).getTime()) / 36e5 > OVERDUE_HOURS;

async function readKey(supabaseAdmin, key) {
  const { data, error } = await supabaseAdmin.from("app_storage").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`No se pudo leer "${key}": ${error.message}`);
  return Array.isArray(data?.value) ? data.value : [];
}

async function send(subs, title, body) {
  if (!subs.length) return 0;
  const payload = JSON.stringify({ title: String(title).slice(0, MAX_TEXT), body: String(body).slice(0, MAX_TEXT), url: "/" });
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));
  return results.filter((r) => r.status === "fulfilled").length;
}

export async function runDailyDigest(supabaseAdmin) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Vercel.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@example.com", publicKey, privateKey);

  const [tasks, subscriptions] = await Promise.all([readKey(supabaseAdmin, "tasks"), readKey(supabaseAdmin, "push-subscriptions")]);
  const { data: profiles, error: pErr } = await supabaseAdmin.from("profiles").select("id, display_name, is_admin, approved");
  if (pErr) throw new Error(`No se pudieron leer los perfiles: ${pErr.message}`);
  const nameOf = Object.fromEntries((profiles || []).map((p) => [p.id, p.display_name || "Sin nombre"]));

  const open = tasks.filter((t) => isOpen(t) && !isSnoozed(t));
  const byUser = {};
  open.forEach((t) => { if (t.asignadoA) (byUser[t.asignadoA] ||= []).push(t); });
  const subsOf = (userId) => subscriptions.filter((s) => s.ownerUsername === userId);

  // 1) Buenos días a cada persona con trabajo
  let morningSent = 0, morningPeople = 0;
  for (const [userId, list] of Object.entries(byUser)) {
    const subs = subsOf(userId);
    if (!subs.length) continue;
    const vencidas = list.filter(isOverdue).length;
    const titles = list.slice(0, 3).map((t) => t.titulo).join(" · ");
    const title = `☀️ Hoy tienes ${list.length} ${list.length === 1 ? "tarea" : "tareas"}`;
    const body = `${vencidas > 0 ? `${vencidas} vencida${vencidas === 1 ? "" : "s"}. ` : ""}${titles}${list.length > 3 ? ` y ${list.length - 3} más` : ""}`;
    morningSent += await send(subs, title, body);
    morningPeople++;
  }

  // 2) Resumen de vencidas para los administradores
  const overdue = open.filter(isOverdue);
  const unassigned = open.filter((t) => !t.asignadoA);
  // Escalamiento: tareas abiertas que llevan 3 o más días sin ningún movimiento (cambio o comentario).
  const stale = open.filter(isStale);
  let adminSent = 0, adminPeople = 0;
  if (overdue.length > 0 || unassigned.length > 0 || stale.length > 0) {
    const perUser = {};
    overdue.forEach((t) => { if (t.asignadoA) perUser[t.asignadoA] = (perUser[t.asignadoA] || 0) + 1; });
    const top = Object.entries(perUser).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u, n]) => `${nameOf[u] || "—"} ${n}`).join(" · ");
    const title = overdue.length > 0 ? `🔴 ${overdue.length} tarea${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"} (más de 24 h)` : unassigned.length > 0 ? "📥 Hay tareas sin asignar" : "⏳ Hay tareas sin movimiento";
    const body = [top, unassigned.length > 0 ? `${unassigned.length} sin asignar` : "", stale.length > 0 ? `${stale.length} sin movimiento ${STALE_DAYS}+ días` : ""].filter(Boolean).join(" · ");
    for (const admin of (profiles || []).filter((p) => p.is_admin && p.approved)) {
      const subs = subsOf(admin.id);
      if (!subs.length) continue;
      adminSent += await send(subs, title, body);
      adminPeople++;
    }
  }

  return { openTasks: open.length, stale: stale.length, overdue: overdue.length, unassigned: unassigned.length, morningPeople, morningSent, adminPeople, adminSent };
}

// ---------------------------------------------------------------------------------------------
// Aviso por piso: habitaciones OCUPADAS que están 6 °F o más por encima de su objetivo. Si en un
// mismo piso hay 3 o más, se avisa por push a quien esté de turno ahora (según el Horario Mensual);
// si no hay nadie de turno con cuenta enlazada, a los administradores. Solo lee, no escribe.
const FLOOR_MIN_ROOMS = 3;
const HOT_DELTA = 6;

async function readObject(supabaseAdmin, key) {
  const { data } = await supabaseAdmin.from("app_storage").select("value").eq("key", key).maybeSingle();
  return data?.value && typeof data.value === "object" ? data.value : {};
}

/** Hora actual de Colombia (UTC-5, sin horario de verano), para comparar con las horas del horario. */
function bogotaNow() {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  const iso = (x) => x.toISOString().slice(0, 10);
  return { hour: d.getUTCHours() + d.getUTCMinutes() / 60, todayIso: iso(d), yesterdayIso: iso(new Date(d.getTime() - 864e5)) };
}

function isWorkingNow(emp, entries, now) {
  const today = entries[`${emp.id}::${now.todayIso}`];
  const yest = entries[`${emp.id}::${now.yesterdayIso}`];
  if (today && !today.code && today.entrada != null && today.salida != null) {
    if (today.salida > today.entrada) { if (now.hour >= today.entrada && now.hour < today.salida) return true; }
    else if (now.hour >= today.entrada) return true;
  }
  if (yest && !yest.code && yest.entrada != null && yest.salida != null && yest.salida < yest.entrada && now.hour < yest.salida) return true;
  return false;
}

export async function runFloorAlerts(supabaseAdmin, rooms) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Vercel.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@example.com", publicKey, privateKey);

  const byFloor = {};
  for (const r of rooms || []) {
    const t = Number(r.Temperature), sp = Number(r.UserSetPoint);
    const occupied = !!(r.Occupied && r.Occupied !== "0");
    if (!occupied || r.Temperature == null || r.UserSetPoint == null || !isFinite(t) || !isFinite(sp)) continue;
    if (t - sp < HOT_DELTA) continue;
    const m = String(r.RoomName || "").match(/^(\d{1,2})\d{2}/);
    if (!m) continue;
    (byFloor[m[1]] ||= []).push(String(r.RoomName));
  }
  const alerts = Object.entries(byFloor).filter(([, l]) => l.length >= FLOOR_MIN_ROOMS)
    .sort((a, b) => b[1].length - a[1].length);
  if (!alerts.length) return { floors: 0, sent: 0 };

  const [employees, entries, subscriptions] = await Promise.all([
    readKey(supabaseAdmin, "employees"), readObject(supabaseAdmin, "schedule-entries"), readKey(supabaseAdmin, "push-subscriptions"),
  ]);
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, linked_employee_id, is_admin, approved, is_viewer");
  const now = bogotaNow();
  const workingIds = new Set(employees.filter((e) => e.active !== false && isWorkingNow(e, entries, now)).map((e) => e.id));
  let targets = (profiles || []).filter((p) => p.approved && !p.is_viewer && p.linked_employee_id && workingIds.has(p.linked_employee_id));
  const toAdmins = targets.length === 0;
  if (toAdmins) targets = (profiles || []).filter((p) => p.approved && p.is_admin);

  const title = `🌡️ ${alerts.length === 1 ? "Piso" : "Pisos"} con habitaciones ocupadas muy calientes`;
  const body = alerts.slice(0, 3).map(([f, l]) => `Piso ${f}: ${l.length} (${l.slice(0, 4).join(", ")}${l.length > 4 ? "…" : ""})`).join(" · ");
  let sent = 0;
  for (const p of targets) sent += await send(subscriptions.filter((s) => s.ownerUsername === p.id), title, body);
  return { floors: alerts.length, sent, people: targets.length, toAdmins };
}

// ---------------------------------------------------------------------------------------------
// Alerta de fallas del servidor: si algo de lo que corre solo cada día falló (Telkonet, archivo en
// Drive, Gemini), avisa por push a los administradores para que no se enteren días después.
export async function checkGeminiAlive() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return 'Falta GEMINI_API_KEY en Vercel';
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite?key=' + key);
    if (r.ok) return null;
    return 'Gemini respondió ' + r.status + (r.status === 400 || r.status === 403 ? ' (clave inválida o vencida)' : '');
  } catch { return 'No se pudo contactar a Gemini'; }
}

export async function runHealthAlert(supabaseAdmin, problems) {
  const list = (problems || []).filter(Boolean);
  if (!list.length) return { problems: 0, sent: 0 };
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { problems: list.length, sent: 0 };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:soporte@example.com', publicKey, privateKey);
  const subscriptions = await readKey(supabaseAdmin, 'push-subscriptions');
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, is_admin, approved');
  let sent = 0;
  for (const a of (profiles || []).filter((p) => p.is_admin && p.approved)) {
    sent += await send(subscriptions.filter((s) => s.ownerUsername === a.id), '⚠️ Falla en el servidor', list.join(' · '));
  }
  return { problems: list.length, sent };
}
