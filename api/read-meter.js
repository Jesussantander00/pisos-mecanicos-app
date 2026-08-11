// Función serverless de Vercel. Recibe la foto de un medidor y le pide a Claude (el modelo más
// económico, Haiku) que lea el número que muestra — así el técnico no tiene que transcribirlo
// a mano. Corre en el servidor, así que aquí sí se puede guardar de forma segura la clave secreta.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   ANTHROPIC_API_KEY  = tu clave secreta de console.anthropic.com (empieza con "sk-ant-")

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ ok: false, message: "Falta la foto." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar ANTHROPIC_API_KEY en Vercel." });
    return;
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
              {
                type: "text",
                text: "Esta es una foto de un medidor (agua, luz, gas, etc). Lee el número que muestra el " +
                  "medidor, tal cual aparece (solo dígitos, sin unidades ni texto). " +
                  "Responde ÚNICAMENTE con este formato JSON, sin nada más, sin explicación: " +
                  '{"lectura": "el número que leíste, o null si no se alcanza a leer con seguridad"}',
              },
            ],
          },
        ],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo leer la foto." });
      return;
    }

    const raw = data?.content?.[0]?.text || "";
    let lectura = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/); // por si Claude agrega texto de más alrededor del JSON
      lectura = match ? JSON.parse(match[0]).lectura : null;
    } catch {
      lectura = null;
    }

    if (!lectura) {
      res.status(200).json({ ok: false, message: "No se logró leer el número con seguridad. Escríbelo a mano." });
      return;
    }

    res.status(200).json({ ok: true, lectura: String(lectura).trim() });
  } catch (e) {
    console.error("Error leyendo medidor:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de lectura. Escríbelo a mano." });
  }
}
