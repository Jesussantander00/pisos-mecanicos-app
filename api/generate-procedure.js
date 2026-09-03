// api/generate-procedure.js
//
// Copiloto de Procedimientos: recibe el nombre de un equipo, su sistema, la tarea que alguien
// necesita hacer, y su historial reciente de mantenimiento — y le pide a Gemini que arme un
// procedimiento paso a paso, apoyándose en ese historial real en vez de un manual genérico.
// Mismo patrón de seguridad y de llamada a Gemini que api/ai-assistant.js.
//
// Variables de entorno necesarias (ya deberían existir si las otras funciones de IA funcionan):
//   GEMINI_API_KEY     — tu clave de la API de Gemini
//   APP_SHARED_SECRET  — opcional, la misma que ya usan las otras funciones de IA

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido." });
  }

  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret) {
    const provided = req.headers["x-app-secret"];
    if (provided !== expectedSecret) {
      return res.status(401).json({ message: "No autorizado." });
    }
  }

  const { equipoNombre, sistema, tarea, historial } = req.body || {};
  if (!equipoNombre || !tarea || typeof tarea !== "string" || !tarea.trim()) {
    return res.status(400).json({ message: "Falta el equipo o la tarea a realizar." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "El servidor no tiene configurada la clave de Gemini (GEMINI_API_KEY)." });
  }

  const systemInstruction = [
    "Eres un técnico experto en mantenimiento industrial de hoteles, ayudando a otro técnico en el sitio.",
    "Respondes SIEMPRE en español, en un procedimiento numerado, paso a paso, claro y directo — sin relleno ni introducciones largas.",
    "Incluye advertencias de seguridad breves cuando aplique (ej: cortar energía antes de intervenir, usar EPP).",
    "Si el historial del equipo menciona algo relevante para esta tarea (una pieza que se ha cambiado antes, un problema recurrente), tenlo en cuenta en el procedimiento.",
    "Si no tienes información suficiente para un paso específico, dilo con honestidad ('verifica el manual del fabricante para este valor exacto') en vez de inventar cifras técnicas precisas (torques, presiones, voltajes) que no conoces con certeza.",
    "No sugieras nada que ponga en riesgo la seguridad de la persona sin la advertencia correspondiente.",
  ].join(" ");

  const historialTxt = Array.isArray(historial) && historial.length
    ? historial.map(h => `- ${h}`).join("\n")
    : "(sin historial de mantenimiento registrado todavía para este equipo)";

  const prompt = [
    `Equipo: ${equipoNombre}${sistema ? ` (sistema: ${sistema})` : ""}`,
    `Historial reciente de mantenimiento de este equipo:\n${historialTxt}`,
    `Tarea solicitada: ${tarea.trim()}`,
    "Genera el procedimiento paso a paso para realizar esta tarea en este equipo específico.",
  ].join("\n\n");

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return res.status(502).json({ message: `Gemini no pudo responder (${resp.status}). ${errText.slice(0, 200)}` });
    }

    const data = await resp.json();
    const procedure = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || null;

    if (!procedure) {
      return res.status(502).json({ message: "Gemini no devolvió un procedimiento utilizable." });
    }

    return res.status(200).json({ procedure: procedure.trim() });
  } catch (err) {
    return res.status(500).json({ message: "No se pudo contactar a Gemini. Intenta de nuevo." });
  }
}
