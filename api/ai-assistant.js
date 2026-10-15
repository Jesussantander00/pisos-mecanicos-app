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

import { getSupabaseAdmin, checkRateLimit, sendRateLimited, callerIp } from "./_lib/security.js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_QUESTION_LEN = 500;

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

  // Límite de uso por IP (no hay sesión de usuario en este endpoint, solo la clave compartida) —
  // máximo 20 preguntas cada 10 minutos. Como varios técnicos pueden compartir la misma wifi del
  // hotel, el tope es por IP y no por persona, así que se deja generoso a propósito.
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const rl = await checkRateLimit(supabaseAdmin, "ai-assistant", callerIp(req), { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) { sendRateLimited(res, rl.retryAfterSeconds); return; }
  }

  const { question, contextSummary, history } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ ok: false, message: "Falta la pregunta." });
    return;
  }
  if (question.length > MAX_QUESTION_LEN) {
    res.status(400).json({ ok: false, message: `La pregunta es demasiado larga (máximo ${MAX_QUESTION_LEN} caracteres).` });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "El servidor no tiene configurada la clave de Gemini (GEMINI_API_KEY)." });
    return;
  }

  const systemInstruction = [
    "Eres el asistente interno de QuinTech, una aplicación de gestión de mantenimiento e ingeniería hotelera.",
    "Respondes SIEMPRE en español, de forma breve, clara y directa, sin relleno. Máximo 4-5 frases, EXCEPTO cuando te pidan un listado: entonces entrega la lista completa, una habitación o equipo por línea, tal como aparece en los datos.",
    "Usa ÚNICAMENTE los datos que se te dan a continuación en 'DATOS ACTUALES DEL HOTEL'. No inventes cifras ni nombres de equipos que no estén ahí.",
    "Si la pregunta no se puede responder con esos datos, dilo con honestidad en vez de inventar una respuesta — sugiere en qué parte de la app podría estar esa información.",
    "Si la pregunta es sobre temperaturas o habitaciones, usa la sección de termostatos (TelkHab) de los datos si existe: ahí están las listas completas y puedes citar habitaciones, temperaturas y diferencias. Nunca mandes al usuario a consultar otra sección si el dato está en esa sección.",
    "Si preguntan por personal, recorridos, rondas o quién hizo qué, usa las secciones RECORRIDOS, rondas de cuartos fríos, lecturas de medidores, tareas finalizadas por persona y mantenimientos por persona: ahí están los nombres reales. Un cuadro o tabla se entrega en formato de tabla de texto con columnas separadas por barras verticales.",
    "No des consejos médicos, legales, ni de ningún tema fuera de la operación de mantenimiento del hotel.",
  ].join(" ");

  const prompt = [
    `DATOS ACTUALES DEL HOTEL:\n${contextSummary || "(sin datos disponibles)"}`,
    history ? `\nCONVERSACIÓN RECIENTE:\n${history}` : "",
    `\nPREGUNTA: ${question.trim()}`,
  ].join("\n");

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
  };

  // Modo "en vivo": la respuesta se va enviando por pedacitos a medida que Gemini la escribe, así
  // la persona empieza a leer en ~1 segundo en vez de esperar la respuesta completa.
  if (req.body?.stream === true) {
    try {
      const sresp = await callGeminiWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
        body
      );
      if (!sresp.ok || !sresp.body) {
        const errText = await sresp.text().catch(() => "");
        const friendly = sresp.status === 503
          ? "Gemini está saturado en este momento (alta demanda). Intenta de nuevo en unos segundos."
          : `Gemini no pudo responder (${sresp.status}). ${errText.slice(0, 200)}`;
        res.status(502).json({ ok: false, message: friendly });
        return;
      }
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      const decoder = new TextDecoder();
      let buf = "", any = false;
      for await (const chunk of sresp.body) {
        buf += decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5));
            const t = j?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
            if (t) { any = true; res.write(JSON.stringify({ t }) + "\n"); }
          } catch { /* línea incompleta o sin texto: se ignora */ }
        }
      }
      if (!any) res.write(JSON.stringify({ err: "Gemini no devolvió una respuesta utilizable." }) + "\n");
      res.end();
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ ok: false, message: "No se pudo contactar a Gemini. Intenta de nuevo." });
      else { try { res.write(JSON.stringify({ err: "Se cortó la conexión con Gemini." }) + "\n"); res.end(); } catch { /* noop */ } }
    }
    return;
  }

  try {
    const resp = await callGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      body
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
