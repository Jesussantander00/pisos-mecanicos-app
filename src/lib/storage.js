import { supabase } from "./supabaseClient";

/**
 * Reemplaza el window.storage que solo existe dentro de los artifacts de Claude.
 * Misma firma que antes: sGet(key, shared) / sSet(key, value, shared).
 *
 * - shared = true  -> se guarda en Supabase (visible para TODOS los técnicos, en cualquier
 *                      teléfono/computador). Así es como debe guardarse casi todo en esta app:
 *                      cuentas, rondas, equipos dañados, tanques, entregas de turno, etc.
 * - shared = false -> se guarda solo en este dispositivo (localStorage). Se usa únicamente
 *                      para la sesión de login local de este teléfono/computador.
 *
 * IMPORTANTE: un error real de conexión (sin internet, Supabase caído, etc.) SIEMPRE se
 * relanza (throw), nunca se convierte en null. Si lo convirtiéramos en null, la app no
 * podría distinguir "esta cuenta no existe" de "no me pude conectar a la base de datos" —
 * y eso llevaba a mensajes como "Usuario no encontrado" cuando en realidad el problema era
 * de red, no de la cuenta. Quien llame a sGet/sSet debe envolver la llamada en try/catch si
 * quiere manejar el fallo de conexión explícitamente (la pantalla de carga inicial ya lo hace).
 */
export async function sGet(key, shared) {
  if (!shared) {
    try {
      const raw = localStorage.getItem(`pm-local:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("sGet (local) error:", e);
      return null; // localStorage no tiene "errores de red", un fallo aquí sí es seguro tratarlo como vacío
    }
  }
  const { data, error } = await supabase
    .from("app_storage")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("sGet error:", error);
    throw new Error(`No se pudo leer "${key}" de la base de datos: ${error.message || "error de conexión"}`);
  }
  return data ? data.value : null;
}

export async function sSet(key, value, shared) {
  if (!shared) {
    try {
      localStorage.setItem(`pm-local:${key}`, JSON.stringify(value));
      return;
    } catch (e) {
      console.error("sSet (local) error:", e);
      return;
    }
  }
  const { error } = await supabase
    .from("app_storage")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.error("sSet error:", error);
    throw new Error(`No se pudo guardar "${key}" en la base de datos: ${error.message || "error de conexión"}`);
  }
}
