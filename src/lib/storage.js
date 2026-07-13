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
 */
export async function sGet(key, shared) {
  try {
    if (!shared) {
      const raw = localStorage.getItem(`pm-local:${key}`);
      return raw ? JSON.parse(raw) : null;
    }
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) { console.error("sGet error:", error); return null; }
    return data ? data.value : null;
  } catch (e) {
    console.error("sGet error:", e);
    return null;
  }
}

export async function sSet(key, value, shared) {
  try {
    if (!shared) {
      localStorage.setItem(`pm-local:${key}`, JSON.stringify(value));
      return;
    }
    const { error } = await supabase
      .from("app_storage")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) console.error("sSet error:", error);
  } catch (e) {
    console.error("sSet error:", e);
  }
}
