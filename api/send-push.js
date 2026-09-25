// Función serverless de Vercel. Envía notificaciones push de verdad (las que llegan al
// celular aunque la app esté cerrada), usando las llaves VAPID configuradas como variables
// de entorno — nunca se exponen al navegador, solo esta función las usa.
//
// Configura en Vercel → tu proyecto → Settings → Environment Variables:
//   VAPID_PUBLIC_KEY   = la llave pública (la misma que usa el navegador para suscribirse)
//   VAPID_PRIVATE_KEY  = la llave privada (secreta, solo aquí)
//   VAPID_SUBJECT      = mailto:tu-correo@ejemplo.com (opcional, identifica quién manda)
//   SUPABASE_SERVICE_ROLE_KEY = ya la tienes configurada, se reutiliza aquí para comprobar
//                                que quien pide el envío es una cuenta real y aprobada.

import webpush from "web-push";
import { getSupabaseAdmin, requireApprovedUser, checkRateLimit, sendRateLimited } from "./_lib/security.js";

// Topes de payload — ninguna notificación real de la app necesita más que esto. Sirven para que
// una cuenta comprometida o con mal uso no pueda usar este endpoint como cañón de spam (mandar a
// miles de suscripciones de una, textos larguísimos, o un link externo camuflado de aviso).
const MAX_SUBSCRIPTIONS_PER_CALL = 200;
const MAX_TEXT_LEN = 200;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  // Barrera básica: si se configuró APP_SHARED_SECRET en Vercel, solo se atienden pedidos que
  // manden ese mismo valor en el encabezado x-app-secret (la app ya lo manda sola, ver App.jsx).
  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  // Barrera real: exige que quien pide el envío tenga una sesión válida de Supabase Auth Y una
  // cuenta ya aprobada — para que solo alguien de verdad usando la app pueda mandar avisos a los
  // celulares de tus administradores, no cualquiera que encuentre esta URL.
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel." });
    return;
  }
  const auth = await requireApprovedUser(req, supabaseAdmin);
  if (!auth.ok) {
    res.status(auth.status).json({ ok: false, message: auth.message });
    return;
  }

  // Límite de uso: máximo 30 envíos cada 10 minutos por cuenta — la app manda push en varios
  // momentos normales (tarea asignada, equipo dañado, etc.), así que el tope es más alto que el
  // de correos, pero igual frena un uso en cadena fuera de lo normal.
  const rl = await checkRateLimit(supabaseAdmin, "send-push", auth.userId, { max: 30, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) { sendRateLimited(res, rl.retryAfterSeconds); return; }

  const { subscriptions, title, body, url } = req.body || {};

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    res.status(400).json({ ok: false, message: "Falta la lista de suscripciones." });
    return;
  }
  if (subscriptions.length > MAX_SUBSCRIPTIONS_PER_CALL) {
    res.status(400).json({ ok: false, message: `Demasiadas suscripciones en un solo pedido (máximo ${MAX_SUBSCRIPTIONS_PER_CALL}).` });
    return;
  }
  // El link de la notificación siempre debe ser una ruta propia de la app ("/", "/algo") — nunca
  // una URL externa, para que este endpoint no se pueda usar para mandar un link de phishing
  // disfrazado de aviso legítimo del hotel.
  if (url && (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//"))) {
    res.status(400).json({ ok: false, message: "El link de la notificación debe ser una ruta interna de la app." });
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@example.com";

  if (!publicKey || !privateKey) {
    res.status(500).json({
      ok: false,
      message: "El servidor no tiene configuradas VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. Agrégalas en Vercel y vuelve a desplegar.",
    });
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: String(title || "FacilitaSys").slice(0, MAX_TEXT_LEN),
    body: String(body || "Tienes una notificación nueva.").slice(0, MAX_TEXT_LEN),
    url: url || "/",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const expired = results
    .map((r, i) => ({ r, sub: subscriptions[i] }))
    .filter(({ r }) => r.status === "rejected" && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410))
    .map(({ sub }) => sub.endpoint);

  res.status(200).json({ ok: true, sent, total: subscriptions.length, expiredEndpoints: expired });
}
