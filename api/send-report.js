// Función serverless de Vercel. Corre en un servidor real (no en el navegador del técnico),
// así que aquí SÍ se puede guardar de forma segura la clave secreta de Resend y disparar
// el envío del correo automáticamente, con el archivo adjunto (PDF o Excel), sin que nadie
// tenga que darle "Enviar" a mano.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   RESEND_API_KEY     = tu clave secreta de resend.com
//   REPORT_FROM_EMAIL  = remitente verificado en Resend (opcional mientras pruebas,
//                        usa el dominio de pruebas onboarding@resend.dev)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { to, subject, text, pdfBase64, attachmentBase64, filename } = req.body || {};
  const fileBase64 = attachmentBase64 || pdfBase64; // acepta cualquiera de los dos nombres, para no romper llamadas existentes

  if (!to || !String(to).trim()) {
    res.status(400).json({ ok: false, message: "Falta el correo destino." });
    return;
  }
  if (!fileBase64) {
    res.status(400).json({ ok: false, message: "Falta el archivo a adjuntar." });
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
        to: [to],
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

    res.status(200).json({ ok: true, message: `Correo enviado a ${to} con el archivo adjunto.`, id: data.id });
  } catch (e) {
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de correo (Resend)." });
  }
}

