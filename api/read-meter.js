// Función serverless de Vercel. Recibe la foto de un medidor y le pide a Gemini que lea el
// número que muestra — así el técnico no tiene que transcribirlo a mano. Corre en el servidor,
// así que aquí sí se puede guardar de forma segura la clave secreta.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   GEMINI_API_KEY  = tu clave gratuita de aistudio.google.com/apikey (no hace falta tarjeta)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  // Barrera básica: si se configuró APP_SHARED_SECRET en Vercel, solo se atienden pedidos que
  // manden ese mismo valor en el encabezado x-app-secret (la app ya lo manda sola, ver App.jsx).
  // No es un sistema de autenticación de verdad (el valor vive en el código del navegador, así
  // que alguien con muchas ganas podría sacarlo) — pero sí evita que bots o curiosos que solo
  // encuentren la URL por casualidad puedan usarla para gastar la cuota gratis de la IA.
  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const { imageBase64, mediaType, previousReading, meterName } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ ok: false, message: "Falta la foto." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar GEMINI_API_KEY en Vercel." });
    return;
  }

  const contextLine = previousReading
    ? `\n\nDATO DE CONTEXTO IMPORTANTE: la última lectura registrada para este mismo medidor${meterName ? ` (${meterName})` : ""} fue ${previousReading}. Los medidores de consumo casi siempre SUBEN con el tiempo (nunca bajan, salvo casos raros de reinicio del contador) — así que la lectura nueva debería ser igual o mayor a ese número, y normalmente no muy distinta (el consumo de unos días no suele ser enorme). Usa este dato como referencia para revisar tu propia lectura: si lo que lees es mucho menor a ${previousReading}, o muchísimo mayor, vuelve a fijarte con cuidado en la foto antes de responder — es más probable que te hayas confundido de dígito que un salto así de grande.`
    : "";

  const promptText = `Esta es una foto de un medidor de consumo (agua, luz o gas). Necesito que leas la lectura EXACTA que muestra, con mucho cuidado, ya que se usa para calcular consumo y facturación.

Ten en cuenta estos formatos comunes de medidores, y fíjate cuál aplica en esta foto:
- Muchos medidores mecánicos de agua tienen una fila de RUEDAS/RODILLOS con números: las ruedas de fondo NEGRO (o blanco) son el número entero, y las últimas 1-2 ruedas de fondo ROJO son los decimales — el número completo se lee de corrido, con un punto decimal antes de las ruedas rojas. Ejemplo: si ves ruedas negras "032973" y luego ruedas rojas "59", la lectura es 32973.59 (los ceros a la izquierda del todo normalmente no se escriben).
- Otros medidores son digitales, con una sola pantalla de números.
- Ignora cualquier otro número que veas en la foto que NO sea la lectura (números de serie, modelo, año de fabricación, códigos de barra, etc.) — esos suelen estar en una etiqueta aparte, más pequeños, y no son la lectura de consumo.
- Si hay varias filas o ventanas de números, la lectura principal casi siempre es la fila más grande/prominente, normalmente cerca del centro del medidor.
${contextLine}

Responde ÚNICAMENTE con este JSON, sin texto antes ni después:
{"descripcion": "1-2 frases: qué tipo de medidor es y dónde está la lectura principal", "lectura": "el número exacto que leíste (con el punto decimal si aplica), o null si no se alcanza a leer con seguridad"}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
                { text: promptText },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            // "low" en vez del nivel por defecto: gasta menos crédito sin sacrificar la precisión
            // de la lectura (la precisión viene de la foto, no de cuánto "piense" antes de leerla).
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo leer la foto." });
      return;
    }

    const candidate = data?.candidates?.[0];
    const raw = (candidate?.content?.parts || [])
      .filter(p => p && p.text && !p.thought)
      .map(p => p.text)
      .join("");

    let lectura = null;
    try {
      lectura = JSON.parse(raw.trim()).lectura;
    } catch {
      // Por si acaso quedó algo de texto extra alrededor pese a pedir solo JSON.
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        try { lectura = JSON.parse(raw.slice(first, last + 1)).lectura; } catch { lectura = null; }
      }
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
