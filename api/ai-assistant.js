// api/ai-assistant.js
//
// Asistente conversacional de la app: recibe una pregunta en español + un resumen compacto de
// los datos actuales del hotel (armado en el navegador por buildAiContextSummary(), en App.jsx),
// y le pide a Gemini que responda usando SOLO esa información — no información genérica de
// internet.
//
// Variables de entorno necesarias (ya deberías tenerlas si la lectura de medidores funciona):
//   GEMINI_API_KEY     — tu clave de la API de Gemini
//   APP_SHARED_SECRET  — opcional, la misma que ya usan las otras funciones de IA
//
// Nota sobre el modelo: "gemini-2.0-flash" fue descontinuado por Google en junio de 2026 (por
// eso este endpoint dejó de responder). Usa "gemini-3.7-flash" — si en el futuro Google lo
// descontinua también, cambia el nombre del modelo en la URL de abajo por el que indique
// https://ai.google.dev/gemini-api/docs/changelog en ese momento.

const GEMINI_MODEL = "gemini-3.7-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret) {
    const provided = req.headers["x-app-secret"];
    if (provided !== expectedSecret) {
      res.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }
  }

  const { question, contextSummary, history } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ ok: false, message: "Falta la pregunta." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "El servidor no tiene configurada la clave de Gemini (GEMINI_API_KEY)." });
    return;
  }

  const systemInstruction = [
    "Eres el asistente interno de una aplicación de gestión de mantenimiento de un hotel (Hyatt Regency Cartagena).",
    "Respondes SIEMPRE en español, de forma breve, clara y directa — máximo 4-5 frases, sin relleno.",
    "Usa ÚNICAMENTE los datos que se te dan a continuación en 'DATOS ACTUALES DEL HOTEL'. No inventes cifras ni nombres de equipos que no estén ahí.",
    "Si la pregunta no se puede responder con esos datos, dilo con honestidad en vez de inventar una respuesta — sugiere en qué parte de la app podría estar esa información.",
    "No des consejos médicos, legales, ni de ningún tema fuera de la operación de mantenimiento del hotel.",
  ].join(" ");

  const prompt = [
    `DATOS ACTUALES DEL HOTEL:\n${contextSummary || "(sin datos disponibles)"}`,
    history ? `\nCONVERSACIÓN RECIENTE:\n${history}` : "",
    `\nPREGUNTA: ${question.trim()}`,
  ].join("\n");

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
      res.status(502).json({ ok: false, message: `Gemini no pudo responder (${resp.status}). ${errText.slice(0, 200)}` });
      return;
    }

    const data = await resp.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || null;

    if (!answer) {
      res.status(502).json({ ok: false, message: "Gemini no devolvió una respuesta utilizable." });
      return;
    }

    res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    res.status(500).json({ ok: false, message: "No se pudo contactar a Gemini. Intenta de nuevo." });
  }
}
