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
 *
 * Antes de ir al servidor, revisa si HAY un cambio de este mismo celular que todavía no se pudo
 * subir (por ejemplo, alguien avanzando una ronda sin señal). Si lo hay, se usa ESE en vez del
 * servidor — porque es más reciente que lo que el servidor tiene (por definición, ya que no se
 * ha podido subir todavía). Esto evita que la app "regrese" el progreso al reabrirla sin señal,
 * o justo antes de que la señal vuelva y alcance a sincronizar.
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
  const pending = readQueue().find(item => item.key === key);
  if (pending) return pending.value;

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
const MAX_PHOTO_BYTES = 500 * 1024; // 500 KB — el techo que pidió el equipo

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function compressImage(file, maxWidth = 1280, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith("image/")) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // Si con la calidad normal todavía pesa más de 500 KB (fotos muy detalladas, buena luz,
      // etc.), se va bajando la calidad en pasos hasta que quepa — sin bajar de 0.4, para que
      // la foto no quede ilegible solo por cumplir el límite de peso.
      let q = quality;
      let blob = await canvasToBlob(canvas, q);
      while (blob && blob.size > MAX_PHOTO_BYTES && q > 0.4) {
        q -= 0.1;
        blob = await canvasToBlob(canvas, q);
      }
      if (!blob) { resolve(file); return; }
      resolve(new File([blob], (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
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

/**
 * Sube un video (sin comprimir como si fuera foto) al bucket "maintenance-videos" de Supabase
 * Storage y devuelve su URL pública. El bucket lo tiene que crear un administrador UNA sola vez
 * desde el panel de Supabase (Storage → New bucket → nombre exacto "maintenance-videos" →
 * marcarlo como público). Límite práctico: revisa el límite de tamaño de archivo de tu plan de
 * Supabase (por defecto suele ser 50 MB por archivo en el plan gratuito) — para videos cortos
 * de referencia (1-2 minutos grabados en celular) normalmente alcanza sin problema.
 */
export async function uploadVideo(file, pathPrefix = "equipo") {
  const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/) || [, "mp4"])[1].toLowerCase();
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("maintenance-videos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "video/mp4",
  });
  if (error) {
    console.error("uploadVideo error:", error);
    throw new Error(`No se pudo subir el video: ${error.message || "error de conexión"}. ¿Ya creaste el bucket "maintenance-videos" en Supabase Storage?`);
  }
  const { data } = supabase.storage.from("maintenance-videos").getPublicUrl(path);
  return data.publicUrl;
}

/* ------------------------------------------------------------------------------------------
 * Cola de registros con fotos pendientes (tareas, cierres de tareas, mantenimientos...).
 * Es como la cola de sSet/flushOfflineQueue, pero para guardados que además traen fotos que
 * subir — porque un archivo (File) no se puede meter tal cual en localStorage, hay que
 * convertirlo a texto (base64) primero, y reconstruirlo como archivo al reintentar.
 * ------------------------------------------------------------------------------------------ */

const PHOTO_QUEUE_KEY = "pm-local:photo-record-queue";

function readPhotoQueue() {
  try {
    const raw = localStorage.getItem(PHOTO_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writePhotoQueue(q) {
  try { localStorage.setItem(PHOTO_QUEUE_KEY, JSON.stringify(q)); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent("pm-photo-queue-changed")); } catch { /* noop */ }
}
/** Cuántos registros con fotos quedaron guardados solo en este celular, esperando poder subirse. */
export function getPendingPhotoRecordsCount() {
  return readPhotoQueue().length;
}

/** La cola completa (kind + payload de cada registro pendiente) — para poder mostrar, en cada
 *  tarea o equipo puntual, si TIENE algo esperando por subir (no solo el número total). */
export function getPendingPhotoQueue() {
  return readPhotoQueue();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Guarda un registro que trae fotos adjuntas (una tarea nueva, el cierre de una tarea, un
 * mantenimiento...). Intenta subir las fotos y guardar de una — si hay señal, esto termina
 * ahí mismo. Si no hay señal o algo falla en el camino, NO se pierde nada: deja todo guardado
 * en este celular (fotos incluidas, convertidas a texto) y lo reintenta solo más adelante,
 * igual que sSet/flushOfflineQueue.
 *
 * kind: una palabra que identifica el tipo de registro (ej: "task", "task-close", "maintenance").
 * payload: los datos del registro, sin las fotos.
 * photoFiles: arreglo de archivos (File) de las fotos, puede venir vacío.
 * onSaved(payload, urls): función que de verdad guarda el registro ya con las URLs de las fotos.
 */
export async function saveRecordWithPhotos(kind, payload, photoFiles, onSaved) {
  const files = (photoFiles || []).filter(Boolean);
  try {
    const urls = [];
    for (const file of files) {
      urls.push(await uploadPhoto(file, kind));
    }
    await onSaved(payload, urls);
    return { queued: false };
  } catch (e) {
    console.warn(`Sin conexión guardando "${kind}" con fotos — se deja en espera local hasta que vuelva la señal.`, e);
    const dataUrls = await Promise.all(files.map(f => fileToDataUrl(f)));
    const q = readPhotoQueue();
    q.push({ kind, payload, photos: dataUrls, at: new Date().toISOString() });
    writePhotoQueue(q);
    return { queued: true };
  }
}

/**
 * Reintenta subir todo lo que quedó pendiente por falta de señal. "handlers" es un objeto con
 * una función por cada "kind" que puede llegar a esta cola, ej:
 *   { maintenance: async (payload, urls) => { ... } }
 */
export async function flushPhotoRecordQueue(handlers) {
  const q = readPhotoQueue();
  if (q.length === 0) return { synced: 0, remaining: 0 };
  let synced = 0;
  const stillPending = [];
  for (const item of q) {
    try {
      const files = item.photos.map((dataUrl, i) => dataUrlToFile(dataUrl, `foto-${i}.jpg`));
      const urls = [];
      for (const file of files) urls.push(await uploadPhoto(file, item.kind));
      const handler = handlers[item.kind];
      if (handler) await handler(item.payload, urls);
      synced++;
    } catch {
      stillPending.push(item);
    }
  }
  writePhotoQueue(stillPending);
  return { synced, remaining: stillPending.length };
}
