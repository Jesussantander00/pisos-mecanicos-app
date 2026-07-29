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

/**
 * Sube una foto al bucket "maintenance-photos" de Supabase Storage y devuelve su URL pública.
 * El bucket lo tiene que crear un administrador UNA sola vez desde el panel de Supabase
 * (Storage → New bucket → nombre exacto "maintenance-photos" → marcarlo como público).
 */
/**
 * Comprime una foto en el navegador antes de subirla: la reduce a máximo 1280px de ancho
 * y la guarda como JPEG de calidad media. Una foto de celular de 3-5 MB queda normalmente
 * en 150-300 KB, sin que se note mucho a simple vista — así el espacio gratis de Supabase
 * Storage (1 GB) alcanza para miles de fotos en vez de unos cientos.
 */
function compressImage(file, maxWidth = 1280, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith("image/")) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); }; // si algo falla, sube la original sin comprimir
    img.src = url;
  });
}

export async function uploadPhoto(file, pathPrefix = "mtto") {
  const compressed = await compressImage(file);
  const ext = "jpg";
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("maintenance-photos").upload(path, compressed, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });
  if (error) {
    console.error("uploadPhoto error:", error);
    throw new Error(`No se pudo subir la foto: ${error.message || "error de conexión"}. ¿Ya creaste el bucket "maintenance-photos" en Supabase Storage?`);
  }
  const { data } = supabase.storage.from("maintenance-photos").getPublicUrl(path);
  return data.publicUrl;
}

