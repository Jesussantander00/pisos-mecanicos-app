// Función serverless de Vercel. Se llama justo después de que alguien crea su cuenta con
// Supabase Auth (supabase.auth.signUp), para crear su fila en la tabla "profiles" — ahí es
// donde vive el rol de cada quien (admin, almacenista, gerencia) y si ya está aprobada la
// cuenta. Esto NO se puede hacer directo desde el navegador (la tabla profiles no deja
// insertar filas sin pasar por aquí, a propósito) porque decidir "¿eres el primer usuario del
// sistema, o no?" es una decisión que tiene que tomar el servidor, no confiar en lo que diga
// el navegador de quien se está registrando.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   SUPABASE_SERVICE_ROLE_KEY = la clave "service_role" de tu proyecto (Supabase → Settings →
//                                API → "service_role" — NUNCA la de "anon"). Es secreta,
//                                nunca debe verse en el navegador, por eso vive solo aquí.
// (Reutiliza VITE_SUPABASE_URL, que ya tienes configurada, para saber a qué proyecto conectarse.)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const { accessToken } = req.body || {};
  if (!accessToken) {
    res.status(400).json({ ok: false, message: "Falta la sesión." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ ok: false, message: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel." });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // Se verifica de verdad quién está detrás de este pedido (el token no se puede falsificar) —
    // nunca se confía en un id que mande el navegador directamente.
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      res.status(401).json({ ok: false, message: "Sesión inválida. Intenta iniciar sesión de nuevo." });
      return;
    }
    const user = userData.user;

    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existing) {
      res.status(200).json({ ok: true, alreadyExisted: true });
      return;
    }

    // ¿Es la primera cuenta que se crea en todo el sistema? Si sí, queda de admin y ya aprobada
    // de una — igual que funcionaba antes. Esto se decide aquí, con la clave de servicio (que
    // ve la tabla completa sin restricciones), nunca confiando en lo que diga el navegador.
    const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
    const isFirstEver = (count || 0) === 0;

    const displayName = user.user_metadata?.display_name || user.email;

    const { error: insertErr } = await supabaseAdmin.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      email: user.email,
      is_admin: isFirstEver,
      is_almacenista: false,
      is_gerencia: false,
      approved: isFirstEver,
    });
    if (insertErr) {
      res.status(500).json({ ok: false, message: insertErr.message || "No se pudo crear el perfil." });
      return;
    }

    res.status(200).json({ ok: true, isFirstEver });
  } catch (e) {
    console.error("Error creando perfil:", e);
    res.status(500).json({ ok: false, message: "No se pudo crear el perfil. Intenta de nuevo." });
  }
}
