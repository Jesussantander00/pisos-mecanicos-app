// api/ai-assistant.js
//
// Asistente conversacional de la app: recibe una pregunta en español + un resumen compacto de
// los datos actuales del hotel (armado en el navegador por buildAiContextSummary(), en App.jsx),
// y le pide a Gemini que responda usando SOLO esa información — no información genérica de
// internet. Mismo patrón de seguridad que las demás funciones de IA del proyecto
// (api/generate-reorder-notes.js, api/read-meter.js, etc.): valida x-app-secret si está
// configurado, y usa GEMINI_API_KEY desde las variables de entorno de Vercel.
//
// Variables de entorno necesarias (ya deberían existir si las otras funciones de IA funcionan):
//   GEMINI_API_KEY     — tu clave de la API de Gemini
//   APP_SHARED_SECRET  — opcional, la misma que ya usan las otras funciones de IA

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido." });
  }

  // Misma barrera de seguridad que las demás funciones de IA del proyecto.
  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret) {
    const provided = req.headers["x-app-secret"];
    if (provided !== expectedSecret) {
      return res.status(401).json({ message: "No autorizado." });
    }
  }

  const { question, contextSummary, history } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ message: "Falta la pregunta." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "El servidor no tiene configurada la clave de Gemini (GEMINI_API_KEY)." });
  }

  const systemInstruction = [
    "Eres el asistente interno de una aplicación de gestión de mantenimiento de un hotel (Hyatt Regency Cartagena).",
    "Respondes SIEMPRE en español, de forma breve, clara y directa — máximo 4-5 frases, sin relleno.",
    "Usa ÚNICAMENTE los datos que se te dan a continuación en 'DATOS ACTUALES DEL HOTEL'. No inventes cifras ni nombres de equipos que no estén ahí.",
    "Si la pregunta no se puede responder con esos datos, dilo con honestidad en vez de inventar una respuesta — sugiere en qué parte de la app podría estar esa información.",
    "No dés consejos médicos, legales, ni de ningún tema fuera de la operación de mantenimiento del hotel.",
  ].join(" ");

  const prompt = [
    `DATOS ACTUALES DEL HOTEL:\n${contextSummary || "(sin datos disponibles)"}`,
    history ? `\nCONVERSACIÓN RECIENTE:\n${history}` : "",
    `\nPREGUNTA: ${question.trim()}`,
  ].join("\n");

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return res.status(502).json({ message: `Gemini no pudo responder (${resp.status}). ${errText.slice(0, 200)}` });
    }

    const data = await resp.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || null;

    if (!answer) {
      return res.status(502).json({ message: "Gemini no devolvió una respuesta utilizable." });
    }

    return res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    return res.status(500).json({ message: "No se pudo contactar a Gemini. Intenta de nuevo." });
  }
}
