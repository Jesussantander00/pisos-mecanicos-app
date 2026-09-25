// Funciones compartidas de seguridad para las funciones serverless de la API (api/*.js).
// No es una función de Vercel por sí misma (el nombre empieza con "_" para que Vercel no la
// despliegue como endpoint) — solo un archivo de utilidades que las demás importan.
//
// Qué resuelve:
//   1) Comprobar que quien llama tiene una sesión real de Supabase Auth y una cuenta aprobada.
//   2) Límite de uso (rate limiting) sencillo, por usuario o por IP, sin necesitar una tabla
//      nueva en Supabase — reutiliza la misma tabla "app_storage" que ya usa toda la app.
//   3) Validar que un correo tenga formato válido, y opcionalmente restringir a una lista de
//      dominios permitidos (configurable en Vercel, sin tocar código).
//   4) Calcular el tamaño real en bytes de un archivo mandado en base64, para poner un tope.

import { createClient } from "@supabase/supabase-js";

/** Crea el cliente admin de Supabase (service role) a partir de las variables de entorno.
 *  Devuelve null si faltan — cada endpoint decide qué hacer en ese caso. */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

/**
 * Comprueba que el pedido trae un token de sesión válido de Supabase Auth (encabezado
 * "Authorization: Bearer ...") Y que esa cuenta ya está aprobada en "profiles". Es la misma
 * comprobación que ya usaban send-report.js y send-push.js, movida aquí para no repetirla.
 * Devuelve { ok: true, userId } o { ok: false, status, message } listo para mandar como respuesta.
 */
export async function requireApprovedUser(req, supabaseAdmin) {
  const authHeader = req.headers["authorization"] || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return { ok: false, status: 401, message: "No autorizado — inicia sesión e intenta de nuevo." };
  }
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, message: "Tu sesión ya no es válida — inicia sesión de nuevo e intenta otra vez." };
  }
  const { data: profile } = await supabaseAdmin.from("profiles").select("approved").eq("id", userData.user.id).maybeSingle();
  if (!profile?.approved) {
    return { ok: false, status: 403, message: "Tu cuenta todavía no está aprobada." };
  }
  return { ok: true, userId: userData.user.id };
}

/** La IP de quien llama (mejor esfuerzo — Vercel la manda en x-forwarded-for). Se usa como
 *  identidad para el límite de uso cuando no hay una cuenta con sesión de por medio
 *  (por ejemplo, read-meter y ai-assistant, que solo piden la clave compartida). */
export function callerIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim();
  return first || req.socket?.remoteAddress || "ip-desconocida";
}

/**
 * Límite de uso simple por ventana de tiempo: máximo "max" llamadas cada "windowMs" para una
 * misma identidad (userId o IP) en un mismo endpoint. Se guarda en la tabla "app_storage" que ya
 * usa toda la app (nada de tabla nueva ni migración de Supabase) bajo la llave
 * "ratelimit:<endpoint>:<identidad>", con la lista de momentos de sus últimas llamadas dentro de
 * la ventana.
 *
 * No es perfecto bajo concurrencia extrema (dos pedidos casi al mismo milisegundo podrían colarse
 * los dos antes de que el primero alcance a guardarse) pero es más que suficiente para frenar un
 * abuso accidental o a propósito en una app de uso interno de un solo hotel — el objetivo es
 * proteger la cuota de Gemini/Resend, no ser un sistema de límite de tráfico de nivel bancario.
 *
 * Si algo falla al comprobar el límite (ej. problema de conexión con Supabase), se deja pasar el
 * pedido en vez de bloquear a todo el mundo por un problema aparte.
 */
export async function checkRateLimit(supabaseAdmin, endpoint, identity, { max = 20, windowMs = 10 * 60 * 1000 } = {}) {
  const key = `ratelimit:${endpoint}:${identity}`;
  const now = Date.now();
  try {
    const { data, error: selErr } = await supabaseAdmin.from("app_storage").select("value").eq("key", key).maybeSingle();
    if (selErr) throw selErr;
    const prevTimes = Array.isArray(data?.value) ? data.value : [];
    const recent = prevTimes.filter(t => typeof t === "number" && now - t < windowMs);
    if (recent.length >= max) {
      const waitMs = windowMs - (now - recent[0]);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
    }
    recent.push(now);
    const { error: upErr } = await supabaseAdmin
      .from("app_storage")
      .upsert({ key, value: recent, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (upErr) throw upErr;
    return { ok: true };
  } catch (e) {
    console.warn(`No se pudo comprobar el límite de uso de "${endpoint}" (se deja pasar el pedido):`, e?.message || e);
    return { ok: true };
  }
}

/** Responde 429 con un mensaje claro cuando se excede el límite de uso. */
export function sendRateLimited(res, retryAfterSeconds) {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    ok: false,
    message: `Se hicieron demasiadas solicitudes seguidas. Espera ${retryAfterSeconds < 60 ? `${retryAfterSeconds} segundos` : `${Math.ceil(retryAfterSeconds / 60)} minuto(s)`} e intenta de nuevo.`,
  });
}

/** Formato de correo razonable (no perfecto según el RFC, pero suficiente para descartar
 *  errores de tecleo y basura evidente antes de gastar una llamada a Resend). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(value) {
  return typeof value === "string" && value.trim().length <= 254 && EMAIL_RE.test(value.trim());
}

/**
 * Si se configuró ALLOWED_REPORT_DOMAINS en Vercel (lista separada por comas, ej.
 * "gmail.com,hyattregencycartagena.com"), solo se permite mandar correos a esos dominios.
 * Si NO se configuró, no se restringe nada (para no romper el uso actual, donde cualquier
 * correo válido sirve de destino) — pero queda documentado en send-report.js como la forma
 * de cerrar esa puerta el día que se quiera.
 */
export function isAllowedReportDomain(email) {
  const allowList = (process.env.ALLOWED_REPORT_DOMAINS || "").split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
  if (allowList.length === 0) return true; // sin lista configurada = sin restricción (comportamiento actual)
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowList.includes(domain);
}

/** Tamaño real en bytes de un archivo mandado como base64 puro (sin el prefijo "data:...;base64,"). */
export function base64SizeBytes(base64) {
  if (!base64 || typeof base64 !== "string") return 0;
  const clean = base64.replace(/=+$/, "");
  return Math.floor((clean.length * 3) / 4);
}
