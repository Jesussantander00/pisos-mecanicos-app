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
  let adminSent = 0, adminPeople = 0;
  if (overdue.length > 0 || unassigned.length > 0) {
    const perUser = {};
    overdue.forEach((t) => { if (t.asignadoA) perUser[t.asignadoA] = (perUser[t.asignadoA] || 0) + 1; });
    const top = Object.entries(perUser).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u, n]) => `${nameOf[u] || "—"} ${n}`).join(" · ");
    const title = overdue.length > 0 ? `🔴 ${overdue.length} tarea${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"} (más de 24 h)` : "📥 Hay tareas sin asignar";
    const body = [top, unassigned.length > 0 ? `${unassigned.length} sin asignar` : ""].filter(Boolean).join(" · ");
    for (const admin of (profiles || []).filter((p) => p.is_admin && p.approved)) {
      const subs = subsOf(admin.id);
      if (!subs.length) continue;
      adminSent += await send(subs, title, body);
      adminPeople++;
    }
  }

  return { openTasks: open.length, overdue: overdue.length, unassigned: unassigned.length, morningPeople, morningSent, adminPeople, adminSent };
}

// Aviso urgente a los administradores (por ejemplo, cuando falla el respaldo automático).
// Solo LEE las suscripciones y los perfiles; no escribe nada.
export async function notifyAdmins(supabaseAdmin, title, body) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Vercel.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@example.com", publicKey, privateKey);
  const subscriptions = await readKey(supabaseAdmin, "push-subscriptions");
  const { data: profiles, error } = await supabaseAdmin.from("profiles").select("id, is_admin, approved");
  if (error) throw new Error(`No se pudieron leer los perfiles: ${error.message}`);
  let sent = 0;
  for (const admin of (profiles || []).filter((p) => p.is_admin && p.approved)) {
    sent += await send(subscriptions.filter((s) => s.ownerUsername === admin.id), title, body);
  }
  return sent;
}
