// Función serverless de Vercel. Recibe la lista de repuestos que, según su ritmo de consumo
// reciente, se van a agotar pronto (el cálculo de cuáles y cuándo ya lo hace la app misma,
// esto NO es matemática de IA, es un dato confiable) y le pide a Gemini que escriba una nota
// corta en español, priorizando qué pedir primero y por qué — para pasársela a compras/almacén.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   GEMINI_API_KEY  = tu clave gratuita de aistudio.google.com/apikey

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ ok: false, message: "Falta la lista de repuestos." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar GEMINI_API_KEY en Vercel." });
    return;
  }

  const prompt = `Eres un asistente que ayuda al equipo de mantenimiento de un hotel a priorizar qué repuestos pedir primero. Ya se calculó (con datos reales, no lo inventes tú) cuántos días le quedan a cada repuesto antes de agotarse, según su ritmo de consumo reciente. Tu trabajo es solo escribir una nota corta en español de Colombia, natural, priorizando qué pedir primero y por qué — no un reporte técnico frío.

REPUESTOS EN RIESGO DE AGOTARSE (nombre, cantidad actual, unidad, cuánto se ha consumido en los últimos 30 días, días estimados que quedan al ritmo actual, si ya está por debajo de su mínimo configurado, y cantidad sugerida a pedir):
${JSON.stringify(items, null, 0)}

QUÉ HACER:
- Agrupa mentalmente por urgencia: lo que se agota en pocos días primero, lo que tiene más margen después.
- Menciona 3-6 repuestos concretos por nombre (los más urgentes), no hace falta listar todos si son muchos.
- Si algo ya está por debajo del mínimo Y además se está consumiendo rápido, dilo — es más urgente que los demás.
- 3-5 frases en 1-2 párrafos cortos, nada de viñetas ni tablas.
- Responde ÚNICAMENTE con el texto de la nota, sin JSON, sin encabezados, sin \`\`\`.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, thinkingConfig: { thinkingLevel: "low" } },
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo redactar la nota." });
      return;
    }

    const candidate = data?.candidates?.[0];
    const notes = (candidate?.content?.parts || [])
      .filter(p => p && p.text && !p.thought)
      .map(p => p.text)
      .join("")
      .trim();

    if (!notes) {
      res.status(200).json({ ok: false, message: "La IA no devolvió texto. Intenta de nuevo." });
      return;
    }

    res.status(200).json({ ok: true, notes });
  } catch (e) {
    console.error("Error redactando notas de reorden:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de IA. Intenta de nuevo." });
  }
}
