// Función serverless de Vercel. Recibe la foto de un medidor y le pide a Claude (Sonnet, para
// mayor precisión leyendo dígitos pequeños/ruedas mecánicas) que lea el número que muestra —
// así el técnico no tiene que transcribirlo a mano. Corre en el servidor, así que aquí sí se
// puede guardar de forma segura la clave secreta.
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
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
              {
                type: "text",
                text: `Esta es una foto de un medidor de consumo (agua, luz o gas). Necesito que leas la lectura EXACTA que muestra, con mucho cuidado, ya que se usa para calcular consumo y facturación.

Ten en cuenta estos formatos comunes de medidores, y fíjate cuál aplica en esta foto:
- Muchos medidores mecánicos de agua tienen una fila de RUEDAS/RODILLOS con números: las ruedas de fondo NEGRO (o blanco) son el número entero, y las últimas 1-2 ruedas de fondo ROJO son los decimales — el número completo se lee de corrido, con un punto decimal antes de las ruedas rojas. Ejemplo: si ves ruedas negras "032973" y luego ruedas rojas "59", la lectura es 32973.59 (los ceros a la izquierda del todo normalmente no se escriben).
- Otros medidores son digitales, con una sola pantalla de números.
- Ignora cualquier otro número que veas en la foto que NO sea la lectura (números de serie, modelo, año de fabricación, códigos de barra, etc.) — esos suelen estar en una etiqueta aparte, más pequeños, y no son la lectura de consumo.
- Si hay varias filas o ventanas de números, la lectura principal casi siempre es la fila más grande/prominente, normalmente cerca del centro del medidor.

Antes de responder, primero describe en 1-2 frases qué tipo de medidor ves y dónde está la lectura principal. Luego responde con el número exacto.

Termina tu respuesta ÚNICAMENTE con este JSON en la última línea, nada más después:
{"lectura": "el número exacto que leíste (con el punto decimal si aplica), o null si no se alcanza a leer con seguridad"}`,
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
      const matches = raw.match(/\{[^{}]*\}/g); // toma el ÚLTIMO bloque {...} de la respuesta (después de la descripción)
      const lastMatch = matches ? matches[matches.length - 1] : null;
      lectura = lastMatch ? JSON.parse(lastMatch).lectura : null;
    } catch {
      lectura = null;
    }

    if (!lectura || lectura === "null") {
      res.status(200).json({ ok: false, message: "No se logró leer el número con seguridad. Escríbelo a mano." });
      return;
    }

    res.status(200).json({ ok: true, lectura: String(lectura).trim() });
  } catch (e) {
    console.error("Error leyendo medidor:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de lectura. Escríbelo a mano." });
  }
}
