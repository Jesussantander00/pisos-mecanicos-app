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
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (delErr && delErr.status !== 404) {
        // El perfil ya se borró, pero la cuenta de acceso (Supabase Auth) no se pudo eliminar —
        // esto es importante avisarlo, porque significa que esa persona podría seguir teniendo
        // una sesión válida por un rato más, aunque ya no tenga perfil ni permisos.
        res.status(200).json({ ok: true, warning: "El perfil se eliminó, pero no se pudo borrar la cuenta de acceso del todo. Si esa persona tenía la app abierta, se le va a cerrar la sesión sola en menos de un minuto." });
        return;
      }
    } else if (action === "toggle-admin" || action === "toggle-almacenista" || action === "toggle-gerencia" || action === "toggle-schedule-manager" || action === "toggle-viewer") {
      // Las casillas de rol/permiso comparten la misma forma: leer el valor actual y
      // apagarlo/prenderlo. Antes esto no revisaba errores de Supabase (por ejemplo si la columna
      // no existiera, o la fila no se encontrara) y respondía "ok" igual, dejando el checkbox del
      // panel sin ningún cambio real y sin ninguna pista de por qué. Ahora si algo falla en
      // cualquiera de los dos pasos, se lo decimos al que llama en vez de fingir que funcionó.
      // "toggle-viewer" es el rol "Solo ver": puede navegar y ver todos los módulos, pero la app
      // le esconde los botones de crear/editar/cerrar en las pantallas principales de captura.
      const column = { "toggle-admin": "is_admin", "toggle-almacenista": "is_almacenista", "toggle-gerencia": "is_gerencia", "toggle-schedule-manager": "can_manage_schedule", "toggle-viewer": "is_viewer" }[action];
      const { data: t, error: selErr } = await supabaseAdmin.from("profiles").select(column).eq("id", targetUserId).maybeSingle();
      if (selErr) {
        res.status(500).json({ ok: false, message: `No se pudo leer el estado actual (${selErr.message}). Si la columna "${column}" no existe todavía en la tabla "profiles" de Supabase, hay que agregarla primero.` });
        return;
      }
      if (!t) {
        res.status(404).json({ ok: false, message: "No se encontró esa cuenta." });
        return;
      }
      const { error: updErr } = await supabaseAdmin.from("profiles").update({ [column]: !t[column] }).eq("id", targetUserId);
      if (updErr) {
        res.status(500).json({ ok: false, message: `No se pudo guardar el cambio (${updErr.message}).` });
        return;
      }
    } else if (action === "reset-password") {
      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 8 caracteres." });
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
