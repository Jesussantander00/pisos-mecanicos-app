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
// Nota sobre el modelo (septiembre 2026): se usa "gemini-3.1-flash-lite" en vez de un modelo
// "flash" normal — Google lo recomienda específicamente para preguntas simples que no necesitan
// razonamiento profundo (justo este caso), y es notablemente más rápido para empezar a responder.
// "gemini-3.7-flash" (el que se usaba antes) tiene reportes conocidos de lentitud/503 por alta
// demanda, según la propia ficha de modelo de Google. Si en el futuro este modelo también se
// descontinúa, revisa el nombre vigente en https://ai.google.dev/gemini-api/docs/changelog.

const GEMINI_MODEL = "gemini-3.1-flash-lite";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Llama a Gemini, reintentando una vez si la respuesta es 503 (alta demanda temporal) —
 *  el propio mensaje de error de Google recomienda reintentar, así que lo hacemos nosotros
 *  antes de molestar al técnico con un error. */
async function callGeminiWithRetry(url, body, attempts = 2) {
  let lastResp = null;
  for (let i = 0; i < attempts; i++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok || resp.status !== 503) return resp;
    lastResp = resp;
    if (i < attempts - 1) await sleep(600 * (i + 1)); // espera un poco más en cada intento
  }
  return lastResp;
}

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
    const resp = await callGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      const friendly = resp.status === 503
        ? "Gemini está saturado en este momento (alta demanda). Intenta de nuevo en unos segundos."
        : `Gemini no pudo responder (${resp.status}). ${errText.slice(0, 200)}`;
      res.status(502).json({ ok: false, message: friendly });
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
