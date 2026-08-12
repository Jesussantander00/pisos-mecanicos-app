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
import { createClient } from "@supabase/supabase-js";

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
  const authHeader = req.headers["authorization"] || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accessToken || !supabaseUrl || !serviceKey) {
    res.status(401).json({ ok: false, message: "No autorizado — inicia sesión e intenta de nuevo." });
    return;
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    res.status(401).json({ ok: false, message: "Tu sesión ya no es válida — inicia sesión de nuevo e intenta otra vez." });
    return;
  }
  const { data: profile } = await supabaseAdmin.from("profiles").select("approved").eq("id", userData.user.id).maybeSingle();
  if (!profile?.approved) {
    res.status(403).json({ ok: false, message: "Tu cuenta todavía no está aprobada." });
    return;
  }

  const { subscriptions, title, body, url } = req.body || {};

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    res.status(400).json({ ok: false, message: "Falta la lista de suscripciones." });
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
    title: title || "Pisos Mecánicos",
    body: body || "Tienes una notificación nueva.",
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
