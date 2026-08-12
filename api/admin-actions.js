// Función serverless de Vercel. Hace las acciones que solo un administrador puede hacer:
// aprobar cuentas, dar/quitar roles, restablecer contraseñas, eliminar cuentas. Todas pasan por
// aquí (nunca directo desde el navegador) porque la tabla "profiles" está protegida para que
// NADIE pueda cambiarle el rol a otra persona directamente — ni siquiera un admin de verdad —
// salvo a través de esta función, que primero comprueba en el servidor (nunca confiando en lo
// que diga el navegador) que quien llama es de verdad un administrador aprobado.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   SUPABASE_SERVICE_ROLE_KEY = la clave "service_role" de tu proyecto (Supabase → Settings →
//                                API → "service_role" — NUNCA la de "anon"). Es secreta.

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

  const { accessToken, action, targetUserId, newPassword } = req.body || {};
  if (!accessToken || !action || !targetUserId) {
    res.status(400).json({ ok: false, message: "Faltan datos del pedido." });
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
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (callerErr || !callerData?.user) {
      res.status(401).json({ ok: false, message: "Sesión inválida. Intenta iniciar sesión de nuevo." });
      return;
    }
    const callerId = callerData.user.id;

    // Comprobación real, en el servidor, de que quien llama es admin aprobado — esto es lo que
    // hace que estas acciones sean seguras de verdad (a diferencia de antes, donde "isAdmin" era
    // solo una revisión en la pantalla del navegador, saltable por cualquiera con la clave pública).
    const { data: callerProfile } = await supabaseAdmin.from("profiles").select("is_admin, approved").eq("id", callerId).maybeSingle();
    if (!callerProfile?.is_admin || !callerProfile?.approved) {
      res.status(403).json({ ok: false, message: "Solo un administrador puede hacer esto." });
      return;
    }

    if (action === "approve") {
      await supabaseAdmin.from("profiles").update({ approved: true }).eq("id", targetUserId);
    } else if (action === "reject" || action === "delete") {
      await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);
      await supabaseAdmin.auth.admin.deleteUser(targetUserId).catch(() => {}); // si ya no existe en Auth, no pasa nada
    } else if (action === "toggle-admin") {
      const { data: t } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", targetUserId).maybeSingle();
      await supabaseAdmin.from("profiles").update({ is_admin: !t?.is_admin }).eq("id", targetUserId);
    } else if (action === "toggle-almacenista") {
      const { data: t } = await supabaseAdmin.from("profiles").select("is_almacenista").eq("id", targetUserId).maybeSingle();
      await supabaseAdmin.from("profiles").update({ is_almacenista: !t?.is_almacenista }).eq("id", targetUserId);
    } else if (action === "toggle-gerencia") {
      const { data: t } = await supabaseAdmin.from("profiles").select("is_gerencia").eq("id", targetUserId).maybeSingle();
      await supabaseAdmin.from("profiles").update({ is_gerencia: !t?.is_gerencia }).eq("id", targetUserId);
    } else if (action === "reset-password") {
      if (!newPassword || newPassword.length < 4) {
        res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 4 caracteres." });
        return;
      }
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword });
      if (pwErr) { res.status(500).json({ ok: false, message: pwErr.message }); return; }
    } else {
      res.status(400).json({ ok: false, message: "Acción no reconocida." });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Error en acción de administrador:", e);
    res.status(500).json({ ok: false, message: "No se pudo completar la acción. Intenta de nuevo." });
  }
}
