// Función serverless de Vercel. Recibe lo que pasó en los últimos 7 días (daños resueltos,
// daños que siguen pendientes, y mantenimientos correctivos hechos) y le pide a Gemini que
// escriba un resumen corto en español natural, como si se lo estuviera contando a alguien —
// no un reporte técnico frío. Solo redacta texto: la app decide a quién y cómo mandarlo.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   GEMINI_API_KEY  = tu clave gratuita de aistudio.google.com/apikey

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { weekLabel, resolved, pending, correctivos } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar GEMINI_API_KEY en Vercel." });
    return;
  }

  if ((resolved || []).length === 0 && (pending || []).length === 0 && (correctivos || []).length === 0) {
    res.status(200).json({ ok: true, summary: `Esta semana (${weekLabel}) no hubo daños reportados ni mantenimientos correctivos registrados — todo se mantuvo funcionando con normalidad.` });
    return;
  }

  const prompt = `Eres un asistente que le escribe a la gerencia de un hotel (Hyatt Regency Cartagena) un resumen semanal breve de lo que pasó con el equipo de ingeniería/mantenimiento. Escribe en español de Colombia, natural, como si se lo estuvieras contando a alguien — no un reporte técnico frío ni una lista de viñetas sin conexión. 3-6 frases en 1-2 párrafos cortos, nada más.

SEMANA: ${weekLabel}

DAÑOS QUE SE RESOLVIERON ESTA SEMANA:
${JSON.stringify(resolved || [], null, 0)}

DAÑOS QUE SIGUEN PENDIENTES (todavía fuera de servicio):
${JSON.stringify(pending || [], null, 0)}

MANTENIMIENTOS CORRECTIVOS (reparaciones) HECHOS ESTA SEMANA:
${JSON.stringify(correctivos || [], null, 0)}

QUÉ HACER:
- Menciona cuántos daños se resolvieron y cuántos siguen pendientes, con los nombres más relevantes (no hace falta listar los 20 si son muchos — resume, y menciona 2-3 ejemplos concretos si ayuda).
- Si algo lleva pendiente varios días, dilo — eso es justamente lo que le interesa saber a gerencia.
- Si no pasó nada grave, dilo con tranquilidad, no inventes drama.
- No repitas literalmente los datos en bruto (fechas ISO, IDs) — cuéntalo con naturalidad.
- Responde ÚNICAMENTE con el texto del resumen, sin JSON, sin encabezados, sin \`\`\`, sin firma al final.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, thinkingConfig: { thinkingLevel: "low" } },
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo redactar el resumen." });
      return;
    }

    const candidate = data?.candidates?.[0];
    const summary = (candidate?.content?.parts || [])
      .filter(p => p && p.text && !p.thought)
      .map(p => p.text)
      .join("")
      .trim();

    if (!summary) {
      res.status(200).json({ ok: false, message: "La IA no devolvió texto. Intenta de nuevo." });
      return;
    }

    res.status(200).json({ ok: true, summary });
  } catch (e) {
    console.error("Error redactando resumen semanal:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de IA. Intenta de nuevo." });
  }
}
