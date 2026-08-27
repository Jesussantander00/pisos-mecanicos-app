// Función serverless de Vercel. Se llama cada vez que alguien escribe mal su contraseña al
// intentar entrar. Lleva la cuenta de cuántas veces seguidas ha fallado esa misma cuenta, y si
// llega a 5 intentos en menos de 15 minutos, avisa por notificación push a los administradores
// — podría ser alguien de verdad que se equivocó varias veces, o alguien probando adivinar una
// contraseña. El conteo se reinicia solo si pasan más de 15 minutos sin un nuevo intento fallido.
//
// No necesita sesión iniciada (justamente porque quien falla el login, por definición, no tiene
// una) — pero sí pasa por la barrera de la clave compartida, igual que las demás funciones.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — ya las tienes configuradas,
//   se reutilizan aquí.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const WINDOW_MINUTES = 15;
const ALERT_THRESHOLD = 5;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ ok: false, message: "Falta el correo." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // No se pudo registrar el intento, pero esto NUNCA debe bloquear el login normal de nadie —
    // se responde ok igualmente, solo que sin avisar.
    res.status(200).json({ ok: true, tracked: false });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const { data: existing } = await supabaseAdmin.from("login_failures").select("*").eq("email", normalizedEmail).maybeSingle();
    const now = new Date();
    let count = 1;
    if (existing) {
      const minutesSince = (now - new Date(existing.last_attempt)) / 60000;
      count = minutesSince < WINDOW_MINUTES ? existing.count + 1 : 1;
    }
    await supabaseAdmin.from("login_failures").upsert({ email: normalizedEmail, count, last_attempt: now.toISOString() });

    // Avisa justo al llegar al umbral (no en cada intento después, para no saturar de avisos).
    if (count === ALERT_THRESHOLD) {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const { data: subsRow } = await supabaseAdmin.from("app_storage").select("value").eq("key", "push-subscriptions").maybeSingle();
      const subscriptions = subsRow?.value || [];
      if (publicKey && privateKey && subscriptions.length > 0) {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@example.com", publicKey, privateKey);
        const payload = JSON.stringify({
          title: "🔒 Varios intentos fallidos de inicio de sesión",
          body: `La cuenta "${normalizedEmail}" ha fallado la contraseña ${count} veces seguidas en los últimos ${WINDOW_MINUTES} minutos.`,
          url: "/",
        });
        await Promise.allSettled(subscriptions.map(sub => webpush.sendNotification(sub, payload)));
      }
    }

    res.status(200).json({ ok: true, tracked: true, count });
  } catch (e) {
    console.error("Error registrando intento fallido de login:", e);
    res.status(200).json({ ok: true, tracked: false }); // igual, nunca bloquear el login por esto
  }
}
