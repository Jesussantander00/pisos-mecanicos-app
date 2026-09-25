// Función serverless de Vercel. Corre en un servidor real (no en el navegador del técnico),
// así que aquí SÍ se puede guardar de forma segura la clave secreta de Resend y disparar
// el envío del correo automáticamente, con el archivo adjunto (PDF o Excel), sin que nadie
// tenga que darle "Enviar" a mano.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   RESEND_API_KEY     = tu clave secreta de resend.com
//   REPORT_FROM_EMAIL  = remitente verificado en Resend (opcional mientras pruebas,
//                        usa el dominio de pruebas onboarding@resend.dev)
//   SUPABASE_SERVICE_ROLE_KEY = ya la tienes configurada, se reutiliza aquí para comprobar
//                                que quien pide el envío es una cuenta real y aprobada.

import {
  getSupabaseAdmin, requireApprovedUser, checkRateLimit, sendRateLimited,
  isValidEmail, isAllowedReportDomain, base64SizeBytes,
} from "./_lib/security.js";

// Tope de tamaño del archivo adjunto — Resend acepta hasta 40 MB, pero para un informe de
// mantenimiento (PDF o Excel) 15 MB es más que generoso y evita que un pedido gigante (por error
// o a propósito) se quede colgado o agote memoria de la función serverless.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

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
  // cuenta ya aprobada — así nadie puede usar TU cuenta de Resend (y tu dominio verificado) para
  // mandar correo a nombre del hotel sin haber iniciado sesión de verdad en la app.
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

  // Límite de uso: máximo 15 correos cada 10 minutos por cuenta — para que nadie (por accidente o
  // a propósito) agote la cuota de Resend mandando correos en cadena.
  const rl = await checkRateLimit(supabaseAdmin, "send-report", auth.userId, { max: 15, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) { sendRateLimited(res, rl.retryAfterSeconds); return; }

  const { to, subject, text, pdfBase64, attachmentBase64, filename } = req.body || {};
  const fileBase64 = attachmentBase64 || pdfBase64; // acepta cualquiera de los dos nombres, para no romper llamadas existentes

  if (!to || !String(to).trim()) {
    res.status(400).json({ ok: false, message: "Falta el correo destino." });
    return;
  }
  const toClean = String(to).trim();
  if (!isValidEmail(toClean)) {
    res.status(400).json({ ok: false, message: "El correo destino no tiene un formato válido." });
    return;
  }
  // Solo restringe si se configuró ALLOWED_REPORT_DOMAINS en Vercel — si no, no cambia nada del
  // comportamiento actual (ver api/_lib/security.js).
  if (!isAllowedReportDomain(toClean)) {
    res.status(403).json({ ok: false, message: "Ese dominio de correo no está permitido como destino de informes." });
    return;
  }
  if (!fileBase64) {
    res.status(400).json({ ok: false, message: "Falta el archivo a adjuntar." });
    return;
  }
  if (base64SizeBytes(fileBase64) > MAX_ATTACHMENT_BYTES) {
    res.status(413).json({ ok: false, message: `El archivo adjunto es demasiado grande (máximo ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB).` });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REPORT_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    res.status(500).json({
      ok: false,
      message: "El servidor no tiene configurada RESEND_API_KEY. Agrégala en las variables de entorno de Vercel y vuelve a desplegar.",
    });
    return;
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toClean],
        subject: subject || "Informe - Pisos Mecánicos",
        text: text || "Se adjunta el informe.",
        attachments: [
          {
            filename: filename || "informe.pdf",
            content: fileBase64, // base64 puro, sin el prefijo "data:...;base64,"
          },
        ],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      res.status(resp.status).json({
        ok: false,
        message: data?.message || "Resend rechazó el envío. Revisa el remitente/dominio verificado.",
      });
      return;
    }

    res.status(200).json({ ok: true, message: `Correo enviado a ${toClean} con el archivo adjunto.`, id: data.id });
  } catch (e) {
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de correo (Resend)." });
  }
}
