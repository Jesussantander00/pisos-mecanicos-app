// Función serverless de Vercel. Envía notificaciones push de verdad (las que llegan al
// celular aunque la app esté cerrada), usando las llaves VAPID configuradas como variables
// de entorno — nunca se exponen al navegador, solo esta función las usa.
//
// Configura en Vercel → tu proyecto → Settings → Environment Variables:
//   VAPID_PUBLIC_KEY   = la llave pública (la misma que usa el navegador para suscribirse)
//   VAPID_PRIVATE_KEY  = la llave privada (secreta, solo aquí)
//   VAPID_SUBJECT      = mailto:tu-correo@ejemplo.com (opcional, identifica quién manda)

import webpush from "web-push";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  // Barrera básica: si se configuró APP_SHARED_SECRET en Vercel, solo se atienden pedidos que
  // manden ese mismo valor en el encabezado x-app-secret (la app ya lo manda sola, ver App.jsx).
  // Sin esto, cualquiera que encontrara esta URL y consiguiera suscripciones reales (por ejemplo,
  // porque las reglas de Supabase dejan leer "push-subscriptions" sin restricción) podría mandar
  // notificaciones falsas a los celulares de tus administradores.
  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
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
