import { supabase } from "./supabaseClient";

const QUEUE_KEY = "pm-local:offline-queue";

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent("pm-queue-changed")); } catch { /* noop */ }
}
/** Cuántos cambios quedaron guardados solo en este celular, esperando poder subirse. */
export function getPendingCount() {
  return readQueue().length;
}

async function writeToSupabase(key, value) {
  const { error } = await supabase
    .from("app_storage")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

/**
 * Lee un valor guardado. shared=true -> Supabase (visible para todos los usuarios).
 * shared=false -> localStorage (solo este navegador/dispositivo).
 */
export async function sGet(key, shared) {
  if (!shared) {
    try {
      const raw = localStorage.getItem(`pm-local:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("sGet (local) error:", e);
      return null;
    }
  }
  const { data, error } = await supabase
    .from("app_storage")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("sGet error:", error);
    throw new Error(`No se pudo cargar "${key}" desde la base de datos: ${error.message || "error de conexión"}`);
  }
  return data ? data.value : null;
}

/**
 * Guarda un valor. Si es compartido (shared=true) e intenta subirlo pero no hay señal (o falla la
 * conexión), NO se pierde: se deja guardado en este celular en una "cola de espera" y se reintenta
 * solo apenas vuelva la señal (ver flushOfflineQueue). Mientras tanto la pantalla ya muestra el
 * cambio con normalidad, porque React ya actualizó su propio estado antes de llamar aquí.
 *
 * Importante: si dos personas cambian lo MISMO mientras ambas están sin señal, al reconectar gana
 * quien sincronice de último — no hay forma de "mezclar" ambos cambios. Es poco común en el uso
 * normal (cada quien trabaja su propio piso/turno), pero vale la pena saberlo.
 */
export async function sSet(key, value, shared) {
  if (!shared) {
    try {
      localStorage.setItem(`pm-local:${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("sSet (local) error:", e);
    }
    return;
  }
  try {
    await writeToSupabase(key, value);
    writeQueue(readQueue().filter(item => item.key !== key));
  } catch (e) {
    console.warn(`Sin conexión guardando "${key}" — se deja en espera local hasta que vuelva la señal.`);
    const q = readQueue().filter(item => item.key !== key);
    q.push({ key, value, at: new Date().toISOString() });
    writeQueue(q);
  }
}

/** Reintenta subir todo lo que quedó pendiente por falta de señal. Se llama sola al reconectar. */
export async function flushOfflineQueue() {
  const q = readQueue();
  if (q.length === 0) return { synced: 0, remaining: 0 };
  let synced = 0;
  const stillPending = [];
  for (const item of q) {
    try {
      await writeToSupabase(item.key, item.value);
      synced++;
    } catch {
      stillPending.push(item);
    }
  }
  writeQueue(stillPending);
  return { synced, remaining: stillPending.length };
}

/** Trae TODA la información guardada en la base de datos compartida, para hacer un respaldo completo. */
export async function exportFullBackup() {
  const { data, error } = await supabase.from("app_storage").select("*");
  if (error) throw new Error(`No se pudo generar el respaldo: ${error.message || "error de conexión"}`);
  return data; // [{ key, value, updated_at }, ...]
}

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

/**
 * Sube una foto al bucket "maintenance-photos" de Supabase Storage y devuelve su URL pública.
 * El bucket lo tiene que crear un administrador UNA sola vez desde el panel de Supabase
 * (Storage → New bucket → nombre exacto "maintenance-photos" → marcarlo como público).
 */
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
