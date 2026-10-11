import { supabase } from "../lib/supabaseClient";
import { sGet, sSet } from "../lib/storage";
import * as XLSX from "xlsx";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { FLOORS } from "./seeds";

export const __pmState = {
  _toastListeners: [],
  __pmBackStack: [],
  __pmScrollLockCount: 0,
  __pmTasksEntryFilter: null,
};



/* ============================================================
   PALETA / TOKENS
   Panel de control industrial: azul acero oscuro + ámbar de alerta.
   ============================================================ */
const LIGHT_COLORS = {
  bg: "#eef1f4",
  panel: "#ffffff",
  ink: "#16212e",
  inkSoft: "#5a6b7d",
  steel: "#1f3247",
  steelDark: "#132030",
  line: "#dde3e9",
  amber: "#d98e04",
  amberSoft: "#fbeed4",
  green: "#2f9e44",
  greenSoft: "#e6f6ea",
  red: "#d1401f",
  redSoft: "#fbe6e0",
  blue: "#3b6fa0",
  blueSoft: "#e4edf5",
  gray: "#707d8a",
  cardAlt: "#fafbfc",
  white: "#ffffff",
  purple: "#7c3aed",
  purpleSoft: "#ede9fe",
  graySoft: "#f1f5f9",
  panelSoft: "#f8fafc",
};
const DARK_COLORS = {
  bg: "#0f1720",
  panel: "#1a2531",
  ink: "#e7edf3",
  inkSoft: "#b7c4d0",
  steel: "#0c1a28",
  steelDark: "#0a1521",
  line: "#2b3947",
  amber: "#e8a53a",
  amberSoft: "#3a2e14",
  green: "#4cb765",
  greenSoft: "#173622",
  red: "#e2604a",
  redSoft: "#3a1c17",
  blue: "#6ea3d8",
  blueSoft: "#182634",
  gray: "#9fb0bf",
  cardAlt: "#1f2b38",
  white: "#1a2531",
  purple: "#c4a1f5",
  purpleSoft: "#2b2142",
  graySoft: "#243241",
  panelSoft: "#1f2b38",
};
// C es un objeto MUTABLE compartido por toda la app (todos los componentes leen C.xxx al dibujarse).
// Cambiar de tema es simplemente sobrescribir sus valores y forzar un redibujado — así no hay que
// tocar cada componente uno por uno para que reaccionen al modo oscuro.
export const C = { ...LIGHT_COLORS };
/** Refleja los colores que se usan en hover/active de Tailwind como variables CSS reales —
 * así "hover:border-[var(--pm-amber)]" se actualiza solo entre modo claro/oscuro. */
function syncCssVars() {
  try {
    document.documentElement.style.setProperty("--pm-amber", C.amber);
    document.documentElement.style.setProperty("--pm-line", C.line);
  } catch { /* noop (por si corre antes de que exista document, poco probable) */ }
}
/** ¿Es de noche ahora mismo? 6:00 p.m. a 6:00 a.m. — el disparador de modo oscuro automático. */
// Coordenadas de Cartagena de Indias — para calcular la hora real de amanecer/atardecer en vez
// de usar una franja fija (6pm-6am), que en la práctica sí varía un poco durante el año.
const CARTAGENA_LAT = 10.39;
const CARTAGENA_LON = -75.51;

/** Amanecer/atardecer real aproximado (algoritmo estándar del Almanac) para una fecha y coordenadas
 * dadas. Devuelve horas decimales en el huso horario de Colombia (UTC-5, sin horario de verano). */
function sunriseSunsetHours(date, lat = CARTAGENA_LAT, lon = CARTAGENA_LON) {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const zenith = 90.83;
  const lngHour = lon / 15;
  const calc = (isRise) => {
    const t = dayOfYear + ((isRise ? 6 : 18) - lngHour) / 24;
    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
    L = (L + 360) % 360;
    let RA = (1 / rad) * Math.atan(0.91764 * Math.tan(L * rad));
    RA = (RA + 360) % 360;
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = (RA + (Lquadrant - RAquadrant)) / 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * rad) - (sinDec * Math.sin(lat * rad))) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null; // no hay amanecer/atardecer ese día a esa latitud (no aplica cerca del ecuador)
    let H = isRise ? 360 - (1 / rad) * Math.acos(cosH) : (1 / rad) * Math.acos(cosH);
    H = H / 15;
    const T = H + RA - (0.06571 * t) - 6.622;
    return (T - lngHour + 24) % 24; // hora UT
  };
  const riseUT = calc(true);
  const setUT = calc(false);
  const tzOffset = -5; // Colombia, todo el año
  return {
    sunrise: riseUT != null ? (riseUT + tzOffset + 24) % 24 : 6,
    sunset: setUT != null ? (setUT + tzOffset + 24) % 24 : 18,
  };
}

export function isNightHour(d = new Date()) {
  const hourDecimal = d.getHours() + d.getMinutes() / 60;
  const { sunrise, sunset } = sunriseSunsetHours(d);
  return hourDecimal >= sunset || hourDecimal < sunrise;
}

/** Identificador anónimo de este dispositivo (se crea una vez y queda en el navegador). Sirve para avisar de ingresos desde un aparato nuevo. */
export function getDeviceId() {
  try {
    let id = localStorage.getItem("pm-local:device-id");
    if (!id) { id = "dev_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem("pm-local:device-id", id); }
    return id;
  } catch { return "dev_sin-almacenamiento"; }
}

/**
 * Navegador y sistema operativo de quien hizo el cambio — para el historial de auditoría. Un
 * navegador no puede leer la IP real por sí solo (eso solo lo puede capturar un servidor), pero
 * saber "desde qué tipo de dispositivo" es lo que de verdad ayuda a rastrear un cambio.
 */
export function getDeviceInfo() {
  try {
    const ua = navigator.userAgent || "";
    let os = "Dispositivo desconocido";
    if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/Macintosh/.test(ua)) os = "Mac";
    else if (/Linux/.test(ua)) os = "Linux";
    let browser = "Navegador";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
    return `${browser} en ${os}`;
  } catch { return "Dispositivo desconocido"; }
}
try {
  const savedTheme = localStorage.getItem("pm-local:theme"); // "dark" | "light" | null (nunca eligió = automático por hora)
  const useDark = savedTheme === "dark" || (savedTheme !== "light" && isNightHour());
  if (useDark) {
    Object.assign(C, DARK_COLORS);
    document.documentElement.classList.add("pm-dark");
    document.documentElement.style.colorScheme = "dark"; // controles nativos (fechas, listas, scroll) también oscuros
  }
} catch { /* noop */ }
syncCssVars();
export function applyTheme(dark) {
  Object.assign(C, dark ? DARK_COLORS : LIGHT_COLORS);
  syncCssVars();
}

/** Tamaño de letra ajustable (item de accesibilidad): como Tailwind usa "rem" para casi todos los
 * tamaños de texto (text-xs, text-sm, etc.), cambiar el font-size del <html> reescala toda la app
 * de una vez, sin tener que tocar cada clase una por una. Se guarda en localStorage para que la
 * elección persista entre sesiones. */
export const FONT_SCALE_OPTS = [
  { id: "sm", label: "Pequeño", pct: 87.5 },
  { id: "md", label: "Normal", pct: 100 },
  { id: "lg", label: "Grande", pct: 112.5 },
  { id: "xl", label: "Muy grande", pct: 125 },
];
export function applyFontScale(id) {
  const opt = FONT_SCALE_OPTS.find(o => o.id === id) || FONT_SCALE_OPTS[1];
  try {
    document.documentElement.style.fontSize = `${opt.pct}%`;
    localStorage.setItem("pm-local:font-scale", opt.id);
  } catch { /* noop */ }
}
try {
  const savedFontScale = localStorage.getItem("pm-local:font-scale");
  if (savedFontScale) applyFontScale(savedFontScale);
} catch { /* noop */ }

export const STATUS_OPTS = ["Automático", "Manual", "Apagado"];
// Vistas a las que SÍ puede entrar una cuenta marcada como "Gerencia" pura (sin admin/almacenista) — todo lo demás queda bloqueado.
export const GERENCIA_ALLOWED_VIEWS = ["home", "executive", "maintenance-analytics", "analytics"];

// Aplanar con id único por equipo (piso+código) — resuelve códigos duplicados (ej. "24")
FLOORS.forEach(f => f.items.forEach(it => { it.id = `${f.id}-${it.c}`; it.floorId = f.id; it.floorName = f.name; }));
const ALL_ITEMS = FLOORS.flatMap(f => f.items);
export const TANK_ITEMS = ALL_ITEMS.filter(it => it.tank);
export const FUEL_ITEMS = ALL_ITEMS.filter(it => it.fuel);

/* ============================================================
   DATOS: CUARTOS FRÍOS Y MÁQUINAS DE HIELO
   (según "Temperatura_Cuartos_Frios_Actualizada.xlsx", Sheet1)
   ============================================================ */
// Objeto "piso" sintético para poder reutilizar el mismo sistema de
// fuera-de-servicio (activeIssues/issueHistory) que ya usan los pisos mecánicos.
export const COLD_ROOMS_FLOOR = { id: "cuartos-frios", name: "Cuartos Fríos" };

export const COLD_ROOMS = [
  { c: "CC1", n: "BT Pescados — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE2", n: "MT Frutas — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE3", n: "MT Verduras — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC4", n: "BT Carnes — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE5", n: "MT Carnes — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC6", n: "BT Aves — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE7", n: "MT Aves — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE8", n: "MT Refrigerada — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE9", n: "MT Huevos — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE10", n: "MT Pasteles — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC11", n: "BT Pasteles — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CC12", n: "BT General — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE13", n: "MT General — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE14", n: "MT Bebidas — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC15", n: "MT Refrigerada — Piso 3", setpoint: "1 °C a 4 °C" },
  { c: "CE16", n: "MT Banquetes — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE17", n: "MT Preparación — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE18", n: "MT General — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE19", n: "MT Bebidas — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE20", n: "MT Refrigerada — Piso 11", setpoint: "1 °C a 4 °C" },
  { c: "CE21", n: "MT Flores — Piso 0", setpoint: "13 °C a 19 °C" },
  { c: "CE22", n: "MT Basuras — Piso 0", setpoint: "1 °C a 4 °C" },
  { c: "CE23", n: "MT Ritual — Piso 12", setpoint: "1 °C a 4 °C" },
].map(x => ({ ...x, id: `cf-${x.c}`, k: "numeric", u: "°C" }));

export const ICE_STATUS_OPTS = ["ON", "OFF", "Fuera de servicio"];

export const ICE_MACHINES_AB = [
  { c: "3A", n: "Frappé — Panadería" },
  { c: "", n: "Cubo — Panadería" },
  { c: "10", n: "Cubo — Eventos" },
  { c: "11", n: "Frappé — Cocina Kokau" },
  { c: "", n: "Cubo — Cocina Kokau" },
  { c: "", n: "Cubo — Bar Signature" },
  { c: "12", n: "Cubo — Amacagua" },
  { c: "", n: "Cubo — Ritual 12" },
  { c: "", n: "Cubo — Pool Bar" },
  { c: "14", n: "Cubo — Chiringuito" },
].map((x, i) => ({ ...x, id: `im-ab-${i + 1}`, k: "status" }));

export const ICE_MACHINES_LINOS = [17, 18, 20, 22, 24, 26, 28, 29, 30, 31, 34, 36, 38]
  .map((piso, i) => ({ id: `im-li-${i + 1}`, c: String(piso), n: "Máquina de Hielo Cubos", k: "status" }));

export const ALL_COLD_ROOM_ITEMS = [...COLD_ROOMS, ...ICE_MACHINES_AB, ...ICE_MACHINES_LINOS];

/** Lee un rango tipo "-16 °C a -18 °C" o "1 °C a 4 °C" y devuelve {min, max}. */
function parseSetpointRange(setpoint) {
  if (!setpoint) return null;
  const nums = (setpoint.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  if (nums.length < 2) return null;
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}
/** true si el valor registrado de un cuarto frío está fuera de su rango objetivo. */
export function isColdRoomOutOfRange(item, value) {
  if (value === undefined || value === "" || value === null || isNaN(Number(value))) return false;
  const range = parseSetpointRange(item.setpoint);
  if (!range) return false;
  const v = Number(value);
  return v < range.min || v > range.max;
}
/** Cuenta cuántos cuartos fríos están fuera de rango ahora mismo, según la última lectura guardada. */
export function computeColdOutOfRange(latestColdValues) {
  return COLD_ROOMS.filter(item => {
    const lv = latestColdValues[item.id];
    return lv && isColdRoomOutOfRange(item, lv.value);
  });
}
/** Detecta medidores cuyo último consumo calculado salió negativo (probable error de lectura o reinicio del medidor). */
export function computeMeterAnomalies(meterHistory) {
  const anomalies = [];
  ALL_METERS.forEach(meter => {
    const hist = meterHistory[meter.id] || [];
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    const subs = meter.subs || ["value"];
    subs.forEach(sub => {
      const c = last.consumos ? last.consumos[sub] : undefined;
      if (c !== undefined && c < 0) anomalies.push({ meter, sub, consumo: c, at: last.at });
    });
  });
  return anomalies;
}

/* ============================================================
   INVENTARIO — helpers
   ============================================================ */
export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
/** URL única de una estantería (lo que va codificado en su código QR). */
export function shelfUrl(shelfId) {
  return `${window.location.origin}${window.location.pathname}?shelf=${shelfId}`;
}
/** URL única de un equipo de mantenimiento (lo que va codificado en su código QR). */
export function equipoUrl(equipoId) {
  return `${window.location.origin}${window.location.pathname}?equipo=${equipoId}`;
}
/** URL única de un diagrama de sistema (lo que va codificado en el QR que se pega en el sitio). */
export function diagramUrl(diagramId) {
  return `${window.location.origin}${window.location.pathname}?diagram=${diagramId}`;
}
const DIAGRAM_COMPONENT_TIPOS = ["Válvula", "Bomba", "Chiller", "Torre", "Intercambiador", "Tanque", "Otro"];
export const DIAGRAM_ESTADOS = [
  { value: "abierta", label: "Abierta / Encendida", color: "#16a34a" },
  { value: "cerrada", label: "Cerrada / Apagada", color: "#dc2626" },
  { value: "no-afecta", label: "No afecta", color: "#9ca3af" },
];
export const PROCEDURE_COLORS = [
  { label: "Azul", value: C.blue }, { label: "Verde", value: C.green }, { label: "Ámbar", value: C.amber }, { label: "Rojo", value: C.red }, { label: "Morado", value: "#8b5cf6" },
];
/** Repuestos cuya cantidad actual está en o por debajo de su mínimo configurado. */
export function computeLowStock(invItems) {
  return invItems.filter(it => it.minThreshold > 0 && it.quantity <= it.minThreshold);
}
/** "Crítico" es un escalón más urgente que "bajo": la mitad o menos del mínimo (o ya en cero) —
 * esto es lo que dispara la alerta roja en la cabecera, no cualquier cosa apenas por debajo. */
export function computeCriticalStock(invItems) {
  return invItems.filter(it => it.minThreshold > 0 && it.quantity <= it.minThreshold * 0.5);
}

/**
 * Mira qué tan rápido se ha estado consumiendo cada repuesto en los últimos `windowDays` días
 * (según los retiros registrados en invMovements) y proyecta en cuántos días se agotaría si sigue
 * al mismo ritmo — así avisa ANTES de que llegue al mínimo, no solo cuando ya está bajo. Un
 * repuesto que se está gastando rápido puede necesitar pedirse ya, aunque todavía le quede stock.
 */
export function computeReorderForecast(invItems, invMovements, windowDays = 30, alertDays = 21) {
  const since = new Date(); since.setDate(since.getDate() - windowDays);
  const consumedByItem = {};
  (invMovements || []).forEach(m => {
    if (m.type !== "retiro") return;
    if (new Date(m.at) < since) return;
    consumedByItem[m.itemId] = (consumedByItem[m.itemId] || 0) + Math.abs(m.quantity);
  });

  const forecast = [];
  (invItems || []).forEach(it => {
    const consumed = consumedByItem[it.id];
    if (!consumed) return; // sin movimiento reciente, no hay ritmo que proyectar
    const dailyRate = consumed / windowDays;
    if (dailyRate <= 0) return;
    const daysUntilOut = it.quantity / dailyRate;
    if (daysUntilOut > alertDays) return; // todavía falta bastante al ritmo actual, no hace falta avisar
    const suggestedQty = Math.max(Math.ceil(dailyRate * windowDays) - it.quantity, Math.ceil(dailyRate * windowDays));
    forecast.push({
      ...it,
      dailyRate: Math.round(dailyRate * 100) / 100,
      consumedInWindow: consumed,
      daysUntilOut: Math.round(daysUntilOut),
      alreadyLow: it.minThreshold > 0 && it.quantity <= it.minThreshold,
      suggestedQty,
    });
  });
  return forecast.sort((a, b) => a.daysUntilOut - b.daysUntilOut);
}

/**
 * Encabezado que se manda en cada pedido a las funciones de IA del servidor (/api/generate-*,
 * /api/read-meter). Si en Vercel se configuró la variable APP_SHARED_SECRET, el servidor exige
 * que este valor coincida antes de atender el pedido — así una URL encontrada por casualidad
 * (o un bot rastreando internet) no puede gastar la cuota gratis de la IA. No es un secreto
 * perfecto (vive en el código del navegador), pero sí una barrera real contra abuso casual.
 * Configúrala en tu archivo .env como VITE_APP_SECRET (el mismo valor que pongas en Vercel como
 * APP_SHARED_SECRET) — si no la configuras, la app sigue funcionando igual, sin esta barrera.
 */
export function aiRequestHeaders() {
  const secret = import.meta.env.VITE_APP_SECRET;
  return { "Content-Type": "application/json", ...(secret ? { "x-app-secret": secret } : {}) };
}

/**
 * Igual que aiRequestHeaders(), pero además manda el token de la sesión real de quien está
 * usando la app (Authorization: Bearer ...). Se usa en /api/send-report y /api/send-push, que
 * ahora exigen una cuenta real y aprobada antes de mandar nada a nombre del hotel — no solo la
 * clave compartida (que protege contra bots, pero no contra alguien sin cuenta que encuentre la URL).
 */
export async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { ...aiRequestHeaders(), ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}

/** Le pide al servidor que cree la fila de "perfil" (rol, aprobación) justo después de que
 *  alguien se registra con Supabase Auth — ver register-profile.js. */
export async function requestCreateProfile(accessToken) {
  const resp = await fetch("/api/register-profile", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ accessToken }),
  });
  return resp.json();
}

/** Le pide al servidor que haga una acción de administrador (aprobar, roles, reset de
 *  contraseña, eliminar) — ver admin-actions.js. El servidor comprueba ahí, de verdad, que
 *  quien llama es un administrador aprobado antes de hacer nada. */
export async function requestAdminAction(accessToken, action, targetUserId, extra = {}) {
  const resp = await fetch("/api/admin-actions", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ accessToken, action, targetUserId, ...extra }),
  });
  return resp.json();
}

export async function requestReorderNotes({ items }) {
  const resp = await fetch("/api/generate-reorder-notes", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ items }),
  });
  return resp.json();
}

/** Le pregunta algo en español simple al asistente de IA, mandándole un resumen compacto de los
 *  datos actuales de la app (no la base de datos completa) para que responda con información
 *  real, no genérica. Ver api/ai-assistant.js. */
export async function requestAiAssistant(question, contextSummary, history) {
  const resp = await fetch("/api/ai-assistant", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ question, contextSummary, history }),
  });
  let data = null;
  try { data = await resp.json(); } catch { /* la respuesta no era JSON válido — se maneja abajo */ }
  if (!resp.ok) {
    console.error("requestAiAssistant HTTP error:", resp.status, data);
    throw new Error(data?.message || `El servidor respondió con error ${resp.status}`);
  }
  if (!data) throw new Error("El servidor respondió algo que no pude leer");
  return data;
}

/** Le pide a la IA un procedimiento paso a paso para una tarea específica en un equipo, usando
 *  el historial real de ese equipo como referencia. Ver api/generate-procedure.js. */
export async function requestProcedure({ equipoNombre, sistema, tarea, historial }) {
  const resp = await fetch("/api/generate-procedure", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ equipoNombre, sistema, tarea, historial }),
  });
  let data = null;
  try { data = await resp.json(); } catch { /* la respuesta no era JSON válido — se maneja abajo */ }
  if (!resp.ok) {
    console.error("requestProcedure HTTP error:", resp.status, data);
    throw new Error(data?.message || `El servidor respondió con error ${resp.status}`);
  }
  if (!data) throw new Error("El servidor respondió algo que no pude leer");
  return data;
}

/**
 * Suma 1 al contador de uso de IA que corresponda (fotos de medidores leídas, horarios generados,
 * resúmenes semanales, notas de reorden) — solo para el panel de "Salud de la app" del admin, un
 * estimado aproximado, no el número exacto de Google. Se guarda directo en la base de datos sin
 * pasar por el estado de React, para no tener que enchufar esta función en cada componente que la
 * necesita — es más simple así, y no pasa nada si dos conteos casi al tiempo se pisan un poco.
 */
export async function bumpAiUsage(field) {
  try {
    const current = (await sGet("ai-usage-stats", true)) || {};
    const next = { ...current, [field]: (current[field] || 0) + 1, lastUpdated: nowIso() };
    await sSet("ai-usage-stats", next, true);
  } catch { /* es solo una estadística informativa, no pasa nada si falla */ }
}

/** Revisa una ronda antes de guardar: qué ítems faltan por llenar, y cuáles están dañados sin comentario. */
export function validateRoundEntries(items, entries) {
  const missing = [];
  const missingComment = [];
  items.forEach(item => {
    const e = entries[item.id];
    const hasValue = e && (e.status || (e.value !== undefined && e.value !== "") || e.damaged || e.ph || e.cloro || e.operador);
    if (!hasValue) missing.push({ id: item.id, n: item.n });
    if (e?.damaged && !e?.stillSame && !(e.observation || "").trim()) missingComment.push({ id: item.id, n: item.n });
  });
  return { missing, missingComment, ok: missing.length === 0 && missingComment.length === 0 };
}

/** Lleva la pantalla directo al equipo (usado al hacer clic en la lista de pendientes) y lo resalta un momento. */
/** Comprime una foto y la convierte a base64 (sin el prefijo "data:...") — lista para mandar a la
 *  función que lee el número del medidor. Más liviana que la de subir a Supabase (no hace falta
 *  tanta resolución solo para leer un número).
 *
 *  IMPORTANTE: usa createImageBitmap con imageOrientation:"from-image" en vez del Image() normal,
 *  porque muchas fotos de celular tomadas en vertical guardan la imagen "acostada" por dentro,
 *  con una marca (EXIF) que dice "gírala al mostrarla". El Image()+canvas normal ignora esa marca
 *  y manda la foto acostada tal cual, lo que hacía que la lectura saliera mal. createImageBitmap
 *  sí respeta esa marca y entrega la foto ya derecha, como se ve a simple vista. */
async function imageFileToBase64ForReading(file, maxWidth = 900, quality = 0.75) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file); // navegador viejo sin soporte para imageOrientation
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1]; // solo el base64, sin el "data:image/jpeg;base64,"
}

/** Le pide a la función serverless que lea el número que muestra un medidor en la foto. */
export async function readMeterFromPhoto(file, previousReading, meterName) {
  const imageBase64 = await imageFileToBase64ForReading(file);
  const resp = await fetch("/api/read-meter", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ imageBase64, mediaType: "image/jpeg", previousReading, meterName }),
  });
  return resp.json();
}

/**
 * Le pide a la función serverless que arme un borrador de horario mensual con IA.
 * Solo llena los días vacíos (los que ya tienen algo — vacaciones, turnos puestos a mano, etc.
 * — se le mandan como "esto ya está, no lo toques"). Nunca guarda nada por su cuenta: la app
 * recibe el borrador, lo muestra para revisar/editar, y solo se guarda de verdad cuando el
 * usuario confirma.
 */
export async function requestAiScheduleDraft({ monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget, sundaysAlreadyWorked }) {
  const resp = await fetch("/api/generate-schedule", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget, sundaysAlreadyWorked }),
  });
  return resp.json();
}

/** Una celda de hora de Excel se guarda como una fracción del día (0.354166... = 8:30). Se pasa
 *  a decimal (8.5) multiplicando por 24 — más simple y sin líos de zona horaria que usar fechas. */
function excelSerialToDecimalHour(serial) {
  return Math.round(serial * 24 * 100) / 100;
}

/**
 * Lee un archivo Excel de horario EN EL MISMO FORMATO que ya se ha usado siempre (una fila
 * "Hora" con los números de día por columna, una fila de nombres de día de la semana, y debajo
 * una fila por empleado con hora de entrada/salida por día, o texto como "Vacaciones"). Puede
 * tener uno o dos bloques de quincena en la misma hoja — los detecta solos, no hace falta que
 * sean siempre dos. year/month1based dicen a qué mes pertenecen los números de día del archivo
 * (se usa el mes que esté seleccionado en pantalla al momento de importar).
 */
export function parseHorarioExcelWorkbook(workbook, year, month1based) {
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  if (!ws || !ws["!ref"]) return { entries: [], names: [], warnings: ["El archivo no tiene datos en la primera hoja."] };
  const range = XLSX.utils.decode_range(ws["!ref"]);

  const codeMap = {
    "vacaciones": "VAC", "libre": "LIBRE", "incapacidad": "INC",
    "alterno": "ALT", "alterno / cambio": "ALT",
    "lic. paternidad": "LIC_PAT", "licencia de paternidad": "LIC_PAT", "lic paternidad": "LIC_PAT",
  };

  const cellAt = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell ? cell.v : null;
  };

  // Filas de encabezado: cualquier fila donde la columna B diga "Hora" (una por cada quincena/bloque)
  const headerRows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const v = cellAt(r, 1);
    if (typeof v === "string" && v.trim().toLowerCase() === "hora") headerRows.push(r);
  }

  const entries = [];
  const namesSet = new Set();
  const warnings = [];

  headerRows.forEach(headerRow => {
    const dayCols = []; // [{entradaCol, salidaCol, day}]
    for (let c = 2; c <= range.e.c; c++) {
      const v = cellAt(headerRow, c);
      if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 31) {
        dayCols.push({ entradaCol: c, salidaCol: c + 1, day: v });
      }
    }
    if (dayCols.length === 0) return;

    let r = headerRow + 2; // se salta la fila de encabezado y la de nombres de día (LUNES, MARTES…)
    while (r <= range.e.r) {
      const rawName = cellAt(r, 1);
      if (rawName == null || typeof rawName !== "string" || !rawName.trim()) break;
      const lower = rawName.trim().toLowerCase();
      if (lower === "fecha" || lower === "hora") break;
      const name = rawName.trim();
      namesSet.add(name);

      dayCols.forEach(({ entradaCol, salidaCol, day }) => {
        const eVal = cellAt(r, entradaCol);
        const sVal = cellAt(r, salidaCol);
        if (eVal == null && sVal == null) return;
        const dateIso = `${year}-${String(month1based).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (typeof eVal === "string") {
          const code = codeMap[eVal.trim().toLowerCase()];
          if (!code) { warnings.push(`${name}, día ${day}: texto "${eVal}" no reconocido — ese día se dejó vacío, agrégalo a mano.`); return; }
          entries.push({ name, date: dateIso, code });
        } else if (typeof eVal === "number") {
          const entrada = excelSerialToDecimalHour(eVal);
          const salida = typeof sVal === "number" ? excelSerialToDecimalHour(sVal) : null;
          if (salida == null) { warnings.push(`${name}, día ${day}: tiene hora de entrada pero no de salida — ese día se dejó vacío, agrégalo a mano.`); return; }
          entries.push({ name, date: dateIso, entrada, salida });
        }
      });
      r++;
    }
  });

  if (headerRows.length === 0) warnings.unshift("No se encontró ninguna fila \"Hora\" — ¿es el mismo formato de siempre?");
  return { entries, names: Array.from(namesSet), warnings };
}

export function scrollToItem(itemId) {
  const el = document.getElementById(`item-row-${itemId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.transition = "box-shadow 0.2s ease";
  el.style.boxShadow = `0 0 0 3px ${C.amber}`;
  setTimeout(() => { el.style.boxShadow = ""; }, 1800);
}

/**
 * Revisa, para HOY, si cada turno ya cumplió con las rondas que le corresponden según lo estipulado:
 * Mañana (termina 14:00) = Lecturas + Ronda + Cuartos Fríos. Tarde (termina 22:00) = Ronda.
 * Noche (termina 6:00 del día siguiente) = Ronda + Gimnasio. Solo avisa después de que el turno ya terminó.
 */
export function computeShiftCompletionAlerts(now, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex) {
  const todayD = todayStr();
  const yesterdayD = (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })();
  const hour = now.getHours() + now.getMinutes() / 60;
  const hasRound = (index, date, shiftLabel) => (index || []).some(r => r.date === date && r.shift === shiftLabel);

  const alerts = [];
  if (hour >= 14) {
    const missing = [];
    if (!hasRound(meterRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Lecturas de Medidores");
    if (!hasRound(roundsIndex, todayD, "06:00 – 14:00")) missing.push("Ronda de revisión");
    if (!hasRound(coldRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Cuartos Fríos");
    if (!hasRound(calderaRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Check List Caldera");
    if (!(lavanderiaRoundsIndex || []).some(r => r.date === todayD)) missing.push("Equipos de Lavandería");
    if (missing.length) alerts.push({ turno: "Turno mañana (6:00-14:00) de hoy", missing });
  }
  if (hour >= 22) {
    const missing = [];
    if (!hasRound(roundsIndex, todayD, "14:00 – 22:00")) missing.push("Ronda de revisión");
    if (!hasRound(calderaRoundsIndex, todayD, "14:00 – 22:00")) missing.push("Check List Caldera");
    if (missing.length) alerts.push({ turno: "Turno tarde (14:00-22:00) de hoy", missing });
  }
  if (hour >= 6) {
    const missing = [];
    const nightDone = (idx) => hasRound(idx, todayD, "22:00 – 06:00") || hasRound(idx, yesterdayD, "22:00 – 06:00");
    if (!nightDone(roundsIndex)) missing.push("Ronda de revisión");
    if (!nightDone(gymRoundsIndex)) missing.push("Equipos de Gimnasio");
    if (!nightDone(calderaRoundsIndex)) missing.push("Check List Caldera");
    if (missing.length) alerts.push({ turno: "Turno noche (22:00-6:00) más reciente", missing });
  }
  return alerts;
}

/**
 * Equipos programados para ESTE mes en el Cronograma Anual que siguen pendientes o atrasados,
 * a partir de que quedan 10 días o menos del mes — para avisar ANTES de que se venza, no solo
 * después. (No calcula por día exacto porque el cronograma solo maneja mes, no día puntual.)
 */
export function computeUpcomingMaintenance(now, equipos, mttoCronograma) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  if (daysLeft > 10) return { daysLeft, items: [] };

  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const currentMonth = now.getMonth() + 1;
  const items = [];
  (mttoCronograma || []).forEach(c => {
    if (c.mesNum !== currentMonth) return;
    if (c.estado !== "pendiente" && c.estado !== "atrasado") return;
    const eq = activeEquipos.find(e => e.id === c.equipoId);
    if (!eq) return;
    items.push({ equipo: eq.nombre, sistema: eq.sistema, estado: c.estado });
  });
  return { daysLeft, items };
}

/**
 * Sugerencias inteligentes de mantenimiento: por cada equipo activo, compara cuánto tiempo lleva
 * desde su último mantenimiento (mttoLog) contra la frecuencia que de verdad tiene programada en
 * el cronograma anual (cuántos meses al año tiene marcados como "programado"). Si no tiene nada
 * programado, asume trimestral (90 días) como un supuesto razonable por defecto. Ordena de más a
 * menos atrasado — lo primero de la lista es lo más crítico.
 */
export function computeMaintenanceSuggestions(equipos, mttoLog, mttoCronograma, now = new Date()) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const results = activeEquipos.map(eq => {
    const records = (mttoLog || []).filter(r => r.equipoId === eq.id);
    const last = records.length ? records.reduce((a, b) => new Date(a.fecha) > new Date(b.fecha) ? a : b) : null;
    const diasSinIntervencion = last ? Math.floor(hoursBetween(last.fecha, now) / 24) : null;

    const mesesProgramados = new Set((mttoCronograma || []).filter(c => c.equipoId === eq.id && c.programado).map(c => c.mesNum)).size;
    const frecuenciaEsperadaDias = mesesProgramados > 0 ? Math.round(365 / mesesProgramados) : 90;

    const overdueDays = diasSinIntervencion == null ? frecuenciaEsperadaDias : diasSinIntervencion - frecuenciaEsperadaDias;
    return {
      equipo: eq, diasSinIntervencion, frecuenciaEsperadaDias, overdueDays,
      lastDate: last?.fecha || null, lastTipo: last?.tipo || null,
      nuncaIntervenido: !last,
    };
  });
  return results.filter(r => r.overdueDays > 0).sort((a, b) => b.overdueDays - a.overdueDays);
}

/** Igual que computeMaintenanceSuggestions, pero para la vista "Próximos 7 días" del cronograma:
 *  acá interesa también lo que TODAVÍA no está atrasado pero le toca esta semana (overdueDays
 *  entre -7 y 0), no solo lo que ya se pasó de fecha. */
export function computeUpcoming7Days(equipos, mttoLog, mttoCronograma, now = new Date()) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const results = activeEquipos.map(eq => {
    const records = (mttoLog || []).filter(r => r.equipoId === eq.id);
    const last = records.length ? records.reduce((a, b) => new Date(a.fecha) > new Date(b.fecha) ? a : b) : null;
    const diasSinIntervencion = last ? Math.floor(hoursBetween(last.fecha, now) / 24) : null;
    const mesesProgramados = new Set((mttoCronograma || []).filter(c => c.equipoId === eq.id && c.programado).map(c => c.mesNum)).size;
    const frecuenciaEsperadaDias = mesesProgramados > 0 ? Math.round(365 / mesesProgramados) : 90;
    if (diasSinIntervencion == null) return null; // nunca intervenido — ya sale en "Sugerencias", no hace falta duplicar acá
    const overdueDays = diasSinIntervencion - frecuenciaEsperadaDias;
    const diasParaVencer = -overdueDays;
    return { equipo: eq, diasParaVencer, frecuenciaEsperadaDias, lastDate: last.fecha };
  }).filter(Boolean);
  return results.filter(r => r.diasParaVencer <= 7).sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

/**
 * Arma un resumen compacto (texto plano, no la base de datos completa) con lo más importante de
 * la operación ahora mismo — esto es lo que se le manda a la IA junto con la pregunta, para que
 * responda con datos reales de este hotel y no con información genérica.
 */
export function buildAiContextSummary({ equipos, mttoLog, tasks, invItems, activeIssues, mttoCronograma, fuelTanksCritical }) {
  const L = [];
  L.push(`Fecha y hora actual: ${fmtDT(nowIso())}`);

  const equiposActivos = (equipos || []).filter(e => e.active !== false);
  L.push(`Equipos de mantenimiento activos: ${equiposActivos.length}`);

  const outOfService = Object.values(activeIssues || {});
  L.push(`Equipos fuera de servicio ahora mismo: ${outOfService.length}`);
  outOfService.slice(0, 12).forEach(iss => L.push(`  - ${iss.name} (${iss.floorName || "sin piso"}), fuera de servicio desde ${fmtDT(iss.openedAt)}`));

  const openTasks = (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada");
  L.push(`Tareas abiertas (sin contar las ya finalizadas): ${openTasks.length}`);
  openTasks.slice(0, 15).forEach(t => L.push(`  - "${t.titulo}" — prioridad ${t.prioridad}, estado ${normalizeTaskState(t.estado)}, asignada a ${t.asignadoA || "nadie todavía"}`));

  const lowStock = computeLowStock(invItems || []);
  L.push(`Repuestos con stock bajo o crítico: ${lowStock.length}`);
  lowStock.slice(0, 12).forEach(it => L.push(`  - ${it.name}: quedan ${it.quantity} ${it.unit} (mínimo ${it.minThreshold})`));

  if (fuelTanksCritical && fuelTanksCritical.length) {
    L.push(`Tanques de combustible (ACPM) en nivel crítico: ${fuelTanksCritical.length}`);
    fuelTanksCritical.forEach(t => L.push(`  - ${t.nombre}: ${t.pct}%`));
  }

  const suggestions = computeMaintenanceSuggestions(equipos, mttoLog, mttoCronograma);
  L.push(`Equipos atrasados según su cronograma de mantenimiento (comparando el último mantenimiento real contra la frecuencia programada): ${suggestions.length}`);
  suggestions.slice(0, 15).forEach(s => L.push(`  - ${s.equipo.nombre} (${s.equipo.sistema}): ${s.nuncaIntervenido ? "nunca se le ha registrado mantenimiento" : `${s.diasSinIntervencion} días sin intervención`}, ${s.overdueDays} días atrasado respecto a lo esperado`));

  const mtto30 = (mttoLog || []).filter(m => hoursBetween(m.fecha, nowIso()) / 24 <= 30);
  L.push(`Mantenimientos registrados en los últimos 30 días: ${mtto30.length} (${mtto30.filter(m => m.tipo === "preventivo").length} preventivos, ${mtto30.filter(m => m.tipo === "correctivo").length} correctivos)`);

  return L.join("\n");
}

/**
 * Helpers para importar el Excel de "Órdenes Pendientes" que exporta HotSOS — columnas:
 * Núm. de orden | Edad | Problema | Habitación/equipo | Asignado | Seguimiento.
 * No es una integración en tiempo real (HotSOS no tiene API pública para este hotel todavía);
 * es una carga rápida del reporte que ya exporta la misma plataforma — nada de scraping.
 */

/** "1d 14h 56m" / "19h 21m" / "45m" → horas totales, para reconstruir cuándo se abrió la orden
 *  de verdad en HotSOS (no solo "ahora", que es cuando se importa). */
export function parseHotsosAge(str) {
  if (!str || typeof str !== "string") return 0;
  const d = /(\d+)\s*d/.exec(str);
  const h = /(\d+)\s*h/.exec(str);
  const m = /(\d+)\s*m/.exec(str);
  return (d ? Number(d[1]) * 24 : 0) + (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0);
}

/** Categoriza el problema por palabras clave — no es una lista cerrada de sistemas de tu
 *  inventario, es una guía visual para saber de un vistazo qué tipo de especialidad necesita
 *  cada orden nueva que llega de HotSOS. */
const HOTSOS_CATEGORIES = [
  { match: ["aire acondicionado", "calefacci", "ventilaci", "rejilla"], label: "HVAC" },
  { match: ["grifo", "lavamanos", "inodoro", "ducha", "bañera", "agua", "filtracion", "filtración", "cemento", "macilla", "lechada", "silicio"], label: "Hidráulico" },
  { match: ["luz", "luces", "lámpara", "lampara", "interruptor"], label: "Eléctrico" },
  { match: ["puerta", "cerradura", "seguro", "pestillo", "cadena", "marco", "perilla", "burlete", "bisagra"], label: "Carpintería / Cerrajería" },
  { match: ["tv", "televisi", "control remoto", "cable telefónico", "cable telefonico"], label: "Electrónica" },
  { match: ["mesa", "silla", "mueble", "velador", "gabinete", "tocador"], label: "Carpintería / Mobiliario" },
  { match: ["cortina", "visillo", "varilla"], label: "Textiles / Cortinas" },
  { match: ["detector de humo", "alarma de incendio"], label: "Contra incendios" },
  { match: ["techo", "pared", "pintura", "pintar"], label: "Estructural / Pintura" },
  { match: ["refrigerador", "congelador", "hielera"], label: "Refrigeración" },
  { match: ["equipos de ejercicio"], label: "Gimnasio" },
];
export function classifyHotsosProblem(problema) {
  const s = normalizeSearchText(problema || "");
  const found = HOTSOS_CATEGORIES.find(g => g.match.some(kw => s.includes(kw)));
  return found ? found.label : "General";
}

/** Cruza el nombre tal como viene escrito en HotSOS ("Jesus Daniel Quintana") contra los nombres
 *  de las cuentas ya creadas en la app. No exige que el nombre completo sea idéntico — HotSOS y
 *  la app casi nunca tienen el nombre escrito exactamente igual (segundo nombre, apellidos en
 *  otro orden, etc.) — en vez de eso cuenta cuántas palabras del nombre coinciden, y solo asigna
 *  si comparten al menos 2 (para no confundir a dos personas que solo comparten el primer
 *  nombre). Si no encuentra una coincidencia suficientemente clara, la deja sin asignar. */
export function matchHotsosAssignee(nombreHotsos, accounts) {
  if (!nombreHotsos || !nombreHotsos.trim()) return null;
  const targetWords = normalizeSearchText(nombreHotsos.trim()).split(/\s+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  Object.entries(accounts || {}).forEach(([uid, acc]) => {
    const nameWords = normalizeSearchText(acc.display_name || "").split(/\s+/).filter(w => w.length > 2);
    const score = targetWords.filter(w => nameWords.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = uid; }
  });
  return bestScore >= 2 ? best : null;
}

/** Intenta vincular automáticamente una orden de HotSOS a un equipo real del catálogo, buscando
 *  el número de habitación/ubicación (ej: "3901") dentro del nombre del equipo — así el gráfico
 *  "Trabajo abierto por sistema" deja de mostrar casi todo como "Sin equipo vinculado". Solo
 *  vincula cuando encuentra EXACTAMENTE un equipo activo que calce, para no adivinar mal; si hay
 *  varios candidatos (ej. dos aires en el mismo cuarto) lo deja sin vincular a propósito. */
export function matchHotsosEquipo(lugar, problema, equipos) {
  if (!lugar || !equipos || !equipos.length) return null;
  const roomMatch = /\b(\d{3,5})\b/.exec(lugar);
  if (!roomMatch) return null;
  const room = roomMatch[1];
  const categoria = classifyHotsosProblem(problema);
  let candidatos = (equipos || []).filter(e => e.active !== false && e.nombre && e.nombre.includes(room));
  if (candidatos.length > 1 && categoria === "HVAC") {
    const soloHvac = candidatos.filter(e => e.sistema === "HVAC");
    if (soloHvac.length >= 1) candidatos = soloHvac;
  }
  return candidatos.length === 1 ? candidatos[0].id : null;
}

/** Heurística para detectar cuentas que probablemente no son una persona real, sino una tarea o
 *  turno mal registrado como "usuario" (ej: "recorridos y lecturas diarias pisos tecnicos") — no
 *  es 100% infalible, es una señal para que un administrador la revise y la corrija a mano. */
export function looksLikeGhostAccount(displayName) {
  const name = (displayName || "").trim();
  if (!name) return false;
  const words = name.split(/\s+/);
  const allLower = name === name.toLowerCase() && /[a-záéíóúñ]/.test(name);
  const tooManyWords = words.length >= 5;
  const suspiciousWords = ["diaria", "diarias", "recorrido", "recorridos", "lectura", "lecturas", "ronda", "rondas", "turno", "turnos", "check", "checklist"];
  const hasSuspiciousWord = suspiciousWords.some(w => normalizeSearchText(name).includes(w));
  return (tooManyWords && allLower) || (hasSuspiciousWord && tooManyWords);
}

/* ============================================================
   PANEL EJECUTIVO — helpers
   ============================================================ */
/** % de equipos funcionando vs. fuera de servicio, por sistema, según el último registro de cada uno. */
export function computeUptimeBySystem(equipos, mttoLog) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const bySistema = {};
  activeEquipos.forEach(eq => {
    if (!bySistema[eq.sistema]) bySistema[eq.sistema] = { total: 0, fuera: 0 };
    bySistema[eq.sistema].total++;
    if (currentEquipoStatus(eq.id, mttoLog).outOfService) bySistema[eq.sistema].fuera++;
  });
  return Object.entries(bySistema)
    .map(([sistema, v]) => ({ sistema, total: v.total, fuera: v.fuera, pct: v.total ? Math.round(((v.total - v.fuera) / v.total) * 100) : 100 }))
    .sort((a, b) => a.pct - b.pct);
}

/** Compara cuántas rondas se guardaron este mes contra cuántas deberían haberse hecho, por tipo. */
export function computeComplianceForMonth(targetDate, roundsIndex, coldRoundsIndex, meterRoundsIndex) {
  const month = targetDate.getMonth() + 1, year = targetDate.getFullYear();
  const now = new Date();
  const isCurrentMonth = now.getMonth() === targetDate.getMonth() && now.getFullYear() === targetDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const inMonth = (dateStr) => {
    const p = (dateStr || "").split("/");
    return p.length === 3 && Number(p[1]) === month && Number(p[2]) === year;
  };
  const mk = (index, perDay) => {
    const actual = (index || []).filter(r => inMonth(r.date)).length;
    const expected = daysElapsed * perDay;
    return { actual, expected, pct: expected ? Math.min(100, Math.round((actual / expected) * 100)) : 100 };
  };
  return {
    ronda: mk(roundsIndex, 3),
    cuartosFrios: mk(coldRoundsIndex, 1),
    medidores: mk(meterRoundsIndex, 1),
  };
}

/** Costo acumulado de mantenimiento, total y por sistema. Si se pasa targetDate, filtra solo a ese mes. */
export function computeMaintenanceCost(equipos, mttoLog, targetDate) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const bySistema = {};
  let total = 0;
  const month = targetDate ? targetDate.getMonth() + 1 : null;
  const year = targetDate ? targetDate.getFullYear() : null;
  (mttoLog || []).forEach(r => {
    const costo = Number(r.costo) || 0;
    if (!costo) return;
    if (targetDate) {
      const d = new Date(r.fecha);
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return;
    }
    total += costo;
    const eq = activeEquipos.find(e => e.id === r.equipoId);
    const sistema = eq?.sistema || "Otros";
    bySistema[sistema] = (bySistema[sistema] || 0) + costo;
  });
  return { total, bySistema: Object.entries(bySistema).sort((a, b) => b[1] - a[1]) };
}

/* ============================================================
   NOTIFICACIONES PUSH — helpers
   ============================================================ */
// Llave pública VAPID — es segura de mostrar en el navegador, solo la privada es secreta (esa vive
// únicamente en Vercel, dentro de api/send-push.js).
const VAPID_PUBLIC_KEY = "BEe7p1TzsxOCqH4RTh88jgs0fDzryslTfZ9I5IhvkVF4LO_p9MnlmO22NqeIJSMV_xwY_Bnoy9m4OGl8p_-6yHU";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Pide permiso y suscribe este dispositivo a notificaciones push. Devuelve la suscripción o null. */
export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing.toJSON();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return sub.toJSON();
}

/** Manda una notificación push real a la lista de suscripciones guardadas (los administradores que la activaron). */
export async function sendPushToSubscriptions(subscriptions, title, body, url) {
  if (!subscriptions || subscriptions.length === 0) return;
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ subscriptions, title, body, url }),
    });
  } catch (e) {
    console.warn("No se pudo enviar la notificación push:", e?.message);
  }
}

/* ============================================================
   MANTENIMIENTO — helpers
   ============================================================ */
/** Último registro de mantenimiento de un equipo (el más reciente por fecha). */
function lastMaintenanceOf(equipoId, mttoLog) {
  const list = mttoLog.filter(m => m.equipoId === equipoId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return list[0] || null;
}
/** Estado actual de un equipo: fuera de servicio (y desde cuándo) según su último registro. */
export function currentEquipoStatus(equipoId, mttoLog) {
  const last = lastMaintenanceOf(equipoId, mttoLog);
  if (!last) return { outOfService: false, since: null };
  return { outOfService: last.estado === "fuera-de-servicio", since: last.estado === "fuera-de-servicio" ? last.fecha : null };
}
/** Resumen por equipo: cuántos mantenimientos, cuántos correctivos (fallas), costo acumulado, estado actual. */
export function computeEquipoStats(equipo, mttoLog) {
  const records = mttoLog.filter(m => m.equipoId === equipo.id);
  const correctivos = records.filter(r => r.tipo === "correctivo");
  const costoTotal = records.reduce((sum, r) => sum + (Number(r.costo) || 0), 0);
  const status = currentEquipoStatus(equipo.id, mttoLog);
  return { total: records.length, correctivos: correctivos.length, costoTotal, ...status };
}

/**
 * Mantenimiento preventivo automático — en vez de depender solo del Cronograma Anual (fechas
 * fijas en el calendario), esto avisa según cuánto tiempo REAL lleva un equipo sin que le hagan
 * un preventivo, comparado con la frecuencia que el admin le haya configurado (equipo.frecuenciaDias).
 * No usa horas de funcionamiento porque la app no registra ese dato todavía — solo días desde el
 * último preventivo (o desde que se creó el equipo, si nunca se le ha hecho ninguno).
 */
/**
 * Si un mantenimiento está pendiente de revisión — cuenta como pendiente tanto los que dicen
 * "pendiente" explícitamente (los nuevos) como los que NO TIENEN el campo en absoluto (los
 * registrados antes de que existiera este flujo de aprobación). Sin esto, todo lo viejo se
 * queda invisible para el supervisor porque `=== "pendiente"` nunca es cierto en un `undefined`.
 */
export function isPendingReview(r) {
  return r.revisionEstado !== "aprobado" && r.revisionEstado !== "rechazado";
}

export function computePreventiveStatus(equipo, mttoLog) {
  const frecuencia = equipo.frecuenciaDias;
  if (!frecuencia || frecuencia <= 0) return { configured: false };

  const preventivos = mttoLog.filter(m => m.equipoId === equipo.id && m.tipo === "preventivo").sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const lastPreventive = preventivos[0];
  const sinceDate = lastPreventive ? new Date(lastPreventive.fecha) : (equipo.createdAt ? new Date(equipo.createdAt) : null);
  if (!sinceDate) return { configured: true, daysSince: null };

  const daysSince = Math.floor((Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = frecuencia - daysSince;
  return {
    configured: true,
    daysSince,
    daysRemaining,
    overdue: daysRemaining < 0,
    dueSoon: daysRemaining >= 0 && daysRemaining <= 7,
    lastPreventiveDate: lastPreventive?.fecha || null,
    neverDone: !lastPreventive,
  };
}

/**
 * Cobertura de trabajo por sistema — para ver TODOS los sistemas a la vez (no uno por uno):
 * de los equipos de cada sistema, ¿a cuántos se les ha hecho algún mantenimiento (de cualquier
 * tipo) en el período? Devuelve un arreglo con un renglón por sistema, cada uno con su lista de
 * equipos intervenidos y sin intervenir, para poder entrar al detalle de cualquiera.
 */
export function computeSystemCoverage(equipos, mttoLog, sinceDate) {
  const activos = equipos.filter(e => e.active !== false);
  const bySistema = {};
  activos.forEach(e => {
    const s = e.sistema || "Otros";
    if (!bySistema[s]) bySistema[s] = [];
    bySistema[s].push(e);
  });
  return Object.entries(bySistema).map(([sistema, eqs]) => {
    const intervenidos = [];
    const sinIntervenir = [];
    let preventivo = 0, correctivo = 0;
    const logsForSistema = [];
    eqs.forEach(eq => {
      const registros = mttoLog.filter(r => r.equipoId === eq.id && (!sinceDate || new Date(r.fecha) >= sinceDate));
      preventivo += registros.filter(r => r.tipo === "preventivo").length;
      correctivo += registros.filter(r => r.tipo === "correctivo").length;
      (registros.length > 0 ? intervenidos : sinIntervenir).push({ ...eq, registrosCount: registros.length, dotOk: registros.length > 0 });
      logsForSistema.push(...registros);
    });
    const pct = eqs.length ? Math.round((intervenidos.length / eqs.length) * 100) : 0;
    return { sistema, total: eqs.length, intervenidosCount: intervenidos.length, pct, intervenidos, sinIntervenir, preventivo, correctivo, logsForSistema };
  }).sort((a, b) => b.pct - a.pct);
}

/**
 * Serie de tiempo Preventivo vs Correctivo — la misma lógica que ya usa "Análisis de
 * Mantenimiento" en su gráfica de tendencia, pero como función aparte para poder generar UNA
 * POR SISTEMA (no solo una gráfica global). Recibe SOLO los registros de un sistema/grupo.
 */
export function computeTimeSeriesData(logs, grouping) {
  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const buckets = {};
  const keyFor = (fecha) => {
    const d = new Date(fecha);
    if (grouping === "turno") return `${localDateIso(d)} ${turnoOf(fecha)}`;
    if (grouping === "semana") {
      const monday = new Date(d);
      const day = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - day);
      return localDateIso(monday);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  logs.forEach(r => {
    const k = keyFor(r.fecha);
    if (!buckets[k]) buckets[k] = { preventivo: 0, correctivo: 0 };
    buckets[k][r.tipo === "correctivo" ? "correctivo" : "preventivo"]++;
  });
  const keys = Object.keys(buckets).sort();
  const labelFor = (k) => {
    if (grouping === "turno") return k.split(" ")[1]?.slice(0, 3) || k;
    if (grouping === "semana") return k.slice(5);
    const [y, m] = k.split("-");
    return `${MESES_CORTOS[Number(m) - 1]} ${y.slice(2)}`;
  };
  const labels = keys.map(labelFor);
  const preventivoPts = keys.map(k => buckets[k].preventivo);
  const correctivoPts = keys.map(k => buckets[k].correctivo);
  const trend = correctivoPts.map((_, i) => {
    const win = correctivoPts.slice(Math.max(0, i - 2), i + 1);
    return Math.round((win.reduce((s, v) => s + v, 0) / win.length) * 10) / 10;
  });
  return { labels, preventivoPts, correctivoPts, trend };
}


/**
 * Hoja de vida — parte 1: detecta solo, buscando palabras clave en la descripción de cada
 * mantenimiento, qué piezas se le han cambiado a un equipo (correa, rodamiento, variador, etc.)
 * — para que quede como referencia rápida sin tener que leer todo el historial completo.
 */
const PIEZA_KEYWORDS = [
  { match: /correa/i, label: "Correa" },
  { match: /rodamiento/i, label: "Rodamiento" },
  { match: /variador/i, label: "Variador" },
  { match: /motor/i, label: "Motor" },
  { match: /bomba/i, label: "Bomba" },
  { match: /filtro/i, label: "Filtro" },
  { match: /banda/i, label: "Banda" },
  { match: /cojinete/i, label: "Cojinete" },
  { match: /sello|empaque/i, label: "Sello / empaque" },
  { match: /compresor/i, label: "Compresor" },
  { match: /ventilador|turbina/i, label: "Ventilador / turbina" },
  { match: /contactor|breaker|relé|rele\b/i, label: "Contactor / breaker / relé" },
  { match: /sensor/i, label: "Sensor" },
  { match: /manguera|tubería|tuberia/i, label: "Manguera / tubería" },
  { match: /v[aá]lvula/i, label: "Válvula" },
];
export function detectPartsChanged(records) {
  const found = [];
  records.forEach(r => {
    PIEZA_KEYWORDS.forEach(({ match, label }) => {
      if (match.test(r.descripcion || "")) found.push({ parte: label, fecha: r.fecha, tipo: r.tipo, descripcion: r.descripcion, tecnico: r.tecnico });
    });
  });
  return found.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}





/* ============================================================
   DATOS: LAVANDERÍA, GIMNASIO Y CALDERA
   (según "formato_revision_de_equipos_de_lavanderia.xlsx",
   "2_check_list_de_equipos_de_gimnasio.xlsx" y "Check_list_Caldera.xlsx")
   ============================================================ */
export const LAVANDERIA_ITEMS = [
  { id: "lv1", c: 1, n: "Lavadora Fagor 70kg #1", k: "statusNumeric", u: "A" },
  { id: "lv2", c: 2, n: "Lavadora Fagor 70kg #2", k: "statusNumeric", u: "A" },
  { id: "lv3", c: 3, n: "Lavadora Fagor 40kg #3", k: "statusNumeric", u: "A" },
  { id: "lv4", c: 4, n: "Lavadora Milnor 27kg #4", k: "statusNumeric", u: "A" },
  { id: "lv5", c: 5, n: "Lavadora Milnor 27kg #5", k: "statusNumeric", u: "A" },
  { id: "lv6", c: 6, n: "Lavadora Fagor 18kg #6", k: "statusNumeric", u: "A" },
  { id: "lv7", c: 7, n: "Secadora Fagor 45kg #1", k: "statusNumeric", u: "A" },
  { id: "lv8", c: 8, n: "Secadora Fagor 35kg #2", k: "statusNumeric", u: "A" },
  { id: "lv9", c: 9, n: "Secadora Fagor 60kg #3", k: "statusNumeric", u: "A" },
  { id: "lv10", c: 10, n: "Secadora Milnor 60kg #4", k: "statusNumeric", u: "A" },
  { id: "lv11", c: 11, n: "Secadora Milnor 35kg #6", k: "statusNumeric", u: "A" },
  { id: "lv12", c: 12, n: "Lavaseco", k: "status" },
  { id: "lv13", c: 13, n: "Compresor de Aire", k: "status" },
  { id: "lv14", c: 14, n: "Rodillo", k: "status" },
  { id: "lv15", c: 15, n: "Prensa + Planchado de Acabado", k: "status" },
  { id: "lv16", c: 16, n: "Prensa de Cuello", k: "status" },
  { id: "lv17", c: 17, n: "Prensa de Planchado", k: "status" },
  { id: "lv18", c: 18, n: "Maniquí de Planchado", k: "status" },
  { id: "lv19", c: 19, n: "Mesa de Repaso #1", k: "status" },
  { id: "lv20", c: 20, n: "Mesa de Repaso #2", k: "status" },
  { id: "lv21", c: 21, n: "Caldera", k: "status" },
  { id: "lv22", c: 22, n: "Suavizador", k: "status" },
  { id: "lv23", c: 23, n: "Unidad de Extracción 401", k: "status" },
  { id: "lv24", c: 24, n: "Drenajes de Pisos", k: "status" },
  { id: "lv25", c: 25, n: "Luces", k: "status" },
];
export const LAVANDERIA_STATUS_OPTS = ["OK", "Fallo"];

export const GYM_CARDIO_ITEMS = [
  { id: "gy1", c: 1, n: "Trotador Precor TRM600 #1", sku: "AF37G1724D001", k: "status" },
  { id: "gy2", c: 2, n: "Trotador Precor TRM600 #2", sku: "AF37G1824D021", k: "status" },
  { id: "gy3", c: 3, n: "Trotador Precor TRM600 #3", sku: "AF37G1824D028", k: "status" },
  { id: "gy4", c: 4, n: "Trotador Precor TRM600 #4", sku: "AF37G1824D020", k: "status" },
  { id: "gy5", c: 5, n: "Trotador Precor TRM600 #5", sku: "AF37G1824D029", k: "status" },
  { id: "gy6", c: 6, n: "Elíptico Precor EFX600 #1", sku: "A485F14240075", k: "status" },
  { id: "gy7", c: 7, n: "Elíptico Precor EFX600 #2", sku: "A485F27240035", k: "status" },
  { id: "gy8", c: 8, n: "Elíptico Precor EFX600 #3", sku: "A485F27240032", k: "status" },
  { id: "gy9", c: 9, n: "Remo ARW865", sku: "F2104BL0680", k: "status" },
  { id: "gy10", c: 10, n: "Air Bike ABK865 #1", sku: "F2212BJ0303", k: "status" },
  { id: "gy11", c: 11, n: "Air Bike ABK865 #2", sku: "E2212BJ0324", k: "status" },
];
export const GYM_FUERZA_ITEMS = [
  { id: "gy12", c: 12, n: "Pull Down", sku: "BDSC09160006", k: "status" },
  { id: "gy13", c: 13, n: "Multi Press", sku: "BDS1A27160014", k: "status" },
  { id: "gy14", c: 14, n: "Chest Press", sku: "BDS6H07150010", k: "status" },
  { id: "gy15", c: 15, n: "Prone Leg Curl", sku: "BA74D03160001", k: "status" },
  { id: "gy16", c: 16, n: "Vertical", sku: "BBMF26150023", k: "status" },
  { id: "gy17", c: 17, n: "Leg Press", sku: "BDS1A41360008", k: "status" },
  { id: "gy18", c: 18, n: "Angled Leg Press", sku: "B136I16220025", k: "status" },
  { id: "gy19", c: 19, n: "FTS Glide", sku: "ANCDA29160030", k: "status" },
  { id: "gy20", c: 20, n: "Smith Machine", k: "status" },
  { id: "gy21", c: 21, n: "Banco VBR 6117 #1", sku: "B12ML30227064", k: "status" },
  { id: "gy22", c: 22, n: "Banco VBR 6117 #2", sku: "B12ML30227060", k: "status" },
  { id: "gy23", c: 23, n: "Banco Lumbar", k: "status" },
  { id: "gy24", c: 24, n: "Spinning Studio Cycle II #1", k: "status" },
  { id: "gy25", c: 25, n: "Spinning Studio Cycle II #2", k: "status" },
];
export const GYM_AREA_ITEMS = [
  { id: "gy26", c: 26, n: "TV", k: "status" },
  { id: "gy27", c: 27, n: "Dispensador de agua", k: "status" },
  { id: "gy28", c: 28, n: "Luces", k: "status" },
  { id: "gy29", c: 29, n: "Aire acondicionado", k: "status" },
  { id: "gy30", c: 30, n: "Teléfono", k: "status" },
  { id: "gy31", c: 31, n: "Sonido ambiente", k: "status" },
];
export const GYM_ALL_ITEMS = [...GYM_CARDIO_ITEMS, ...GYM_FUERZA_ITEMS, ...GYM_AREA_ITEMS];
export const GYM_STATUS_OPTS = ["OK", "No OK"];
export const LAVANDERIA_FLOOR = { id: "lavanderia", name: "Lavandería — Piso 4" };
export const GYM_FLOOR = { id: "gimnasio", name: "Gimnasio — Piso 14" };

/* ============================================================
   DATOS: TAREAS / PENDIENTES
   ============================================================ */
export const TASK_STATES = [
  { code: "asignada", label: "Asignada" },
  { code: "en-proceso", label: "En proceso" },
  { code: "pausada", label: "Pausada" },
  { code: "finalizada", label: "Finalizada" },
];
export const TASK_STATE_COLORS = {
  "asignada": { bg: "#eef1f4", fg: "#5c6b7a" },
  "en-proceso": { bg: "#e3f0ff", fg: "#1a4f8a" },
  "pausada": { bg: "#fff3d6", fg: "#8a5a00" },
  "finalizada": { bg: "#dff5e3", fg: "#1c7a34" },
  // compatibilidad con tareas creadas antes de este cambio (otros nombres de estado), para que
  // no se rompan ni queden "huérfanas" — ver normalizeTaskState() más abajo.
  "pendiente": { bg: "#eef1f4", fg: "#5c6b7a" },
  "en-progreso": { bg: "#e3f0ff", fg: "#1a4f8a" },
  "espera-repuesto": { bg: "#fff3d6", fg: "#8a5a00" },
  "hecho": { bg: "#dff5e3", fg: "#1c7a34" },
};
/** Tareas creadas antes de este cambio usaban otros nombres de estado — esto los traduce a los
 * 4 nuevos para que las cuentas y los filtros los sigan reconociendo sin romperse. */
const TASK_STATE_MIGRATE = { "pendiente": "asignada", "en-progreso": "en-proceso", "espera-repuesto": "pausada", "hecho": "finalizada" };
export function normalizeTaskState(estado) { return TASK_STATE_MIGRATE[estado] || estado || "asignada"; }
/** Días completos desde que se creó la tarea — para avisar visualmente cuando algo lleva
 *  demasiado tiempo abierto, aunque no sea "crítica >24h" (ese contador es solo para prioridad alta). */
export function diasTareaAbierta(task) { return Math.floor(hoursBetween(task.createdAt || task.assignedAt || nowIso(), nowIso()) / 24); }
/** Una tarea "pospuesta" (snooze) sigue existiendo pero se esconde de las listas normales hasta
 *  la fecha elegida — útil para "esto no se puede hacer hasta que llegue el repuesto el jueves". */
export function isTaskSnoozed(task) { return !!task.snoozedUntil && new Date(task.snoozedUntil) > new Date(); }

export const TASK_PRIORITIES = [
  { code: "alta", label: "Alta" },
  { code: "media", label: "Media" },
  { code: "baja", label: "Baja" },
];
export const TASK_PRIORITY_COLORS = { alta: "#D93025", media: "#D97706", baja: "#5C6B7A" };
/** Palabras que casi siempre significan que algo es urgente de verdad — si aparecen en el título
 *  o la descripción de una tarea nueva, se sugiere Prioridad Alta automáticamente (la persona
 *  puede cambiarla igual; es solo una sugerencia, no obliga a nada). */
const TASK_EMERGENCY_KEYWORDS = [
  "fuga", "incendio", "fuego", "humo", "corto circuito", "cortocircuito", "corto electrico", "corto eléctrico",
  "inundacion", "inundación", "explosion", "explosión", "chispa", "electrocut", "quemad", "derrame",
  "emergencia", "se esta incendiando", "se está incendiando", "huele a gas", "fuga de gas", "no hay agua",
  "sin energia", "sin energía", "se cayo el ascensor", "se cayó el ascensor", "atrapado", "atrapada",
];
export function suggestsHighPriority(text) {
  const norm = normalizeSearchText(text || "");
  if (!norm.trim()) return false;
  return TASK_EMERGENCY_KEYWORDS.some(k => norm.includes(normalizeSearchText(k)));
}
export const TASK_RECURRENCES = [
  { code: "", label: "No se repite" },
  { code: "semanal", label: "Cada semana" },
  { code: "mensual", label: "Cada mes" },
];
/** "Clave" del periodo actual (semana o mes) — sirve para saber si ya existe una tarea de este ciclo o hay que crear una nueva. */
export function periodKeyFor(date, recurrence) {
  if (recurrence === "semanal") {
    const start = startOfWeek(date);
    return `w-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  }
  if (recurrence === "mensual") return `m-${date.getFullYear()}-${date.getMonth() + 1}`;
  return null;
}

/* ============================================================
   DATOS: LECTURAS DE MEDIDORES
   (según "consumo_de_servicios_publicos_hyatt_2026.xlsx": hojas
   SP [mes], Resc [mes] y Agua torres [mes] — mismos medidores cada mes)
   ============================================================ */
export const METER_GROUPS = [
  {
    id: "sp", title: "Servicios Públicos Generales",
    meters: [
      { c: "m01", n: "Energía Piso 16 — Medidor Principal (NIC 7784481)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m02", n: "Energía Piso 16 — Medidor Respaldo (NIC 7784482)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m03", n: "Agua Hotel — Póliza 256023 (Medidor 596202)", subs: null, u: "m³" },
      { c: "m04", n: "Gas Hotel (Medidor 4404155)", subs: null, u: "m³" },
      { c: "m05", n: "Gas Residencias (Medidor 16730521218 / 4673538)", subs: null, u: "m³" },
      { c: "m06", n: "Energía Piso 33 — Hyatt 150KVA Electricaribe (NIC 7942254)", subs: ["Activa Pi", "Activa FP", "Reactiva"], u: "kWh" },
      { c: "m07", n: "Energía Piso 43 (C P C)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m08", n: "Lectura Medidor Piso Cero", subs: null, u: "" },
      { c: "m09", n: "Agua Piso 43 Residencias", subs: null, u: "m³" },
      { c: "m10", n: "Energía Piso 43 — Ascensor 21", subs: null, u: "kWh" },
      { c: "m11", n: "Energía Piso 43 — Ascensor 22", subs: null, u: "kWh" },
      { c: "m12", n: "Energía Piso 43 — Ascensor 23", subs: null, u: "kWh" },
      { c: "m13", n: "QMC — Telefónica 132220070 (Piso 44)", subs: null, u: "" },
      { c: "m14", n: "QMC — Telefónica AS1440 (Piso 44)", subs: null, u: "" },
      { c: "m15", n: "QMC — Claro 24728084 (Piso 44)", subs: null, u: "" },
      { c: "m16", n: "QMC — Claro 24728083 (Piso 9)", subs: null, u: "" },
      { c: "m17", n: "QMC — Telefónica 888190 (Piso 9)", subs: null, u: "" },
    ],
  },
  {
    id: "resc", title: "Zonas Comunes / Residencias",
    meters: [
      { c: "r01", n: "Medidor Distrito Frío — Chiller 33", subs: null, u: "" },
      { c: "r02", n: "Energía Habitaciones y Agua Caliente 34 (180-181)", subs: ["Activa", "Activa Pico"], u: "kWh" },
      { c: "r03", n: "Medidor Zonas Comunes Piso 34-35-36", subs: null, u: "" },
      { c: "r04", n: "Medidor Zonas Comunes Piso 37-38", subs: null, u: "" },
      { c: "r05", n: "Medidor Sistema Hidrosanitario Piso 43", subs: null, u: "" },
      { c: "r06", n: "Medidor Torres de Enfriamiento Piso 43", subs: null, u: "" },
      { c: "r07", n: "Energía Piso 33 — Residencias (NIC 7942250)", subs: ["Activa AT", "Activa FA", "Reactiva"], u: "kWh" },
    ],
  },
  {
    id: "torres", title: "Agua Torres de Enfriamiento",
    meters: [
      { c: "t01", n: "Agua Torres", subs: null, u: "m³" },
      { c: "t02", n: "Agua Torres Residencias", subs: null, u: "m³" },
      { c: "t03", n: "Agua Torres Enfriamiento HN", subs: null, u: "m³" },
    ],
  },
  {
    // Contadores de energía por apartamento — "Contadores_Energia_Residencias_2026.xlsx"
    id: "hab", title: "Contadores de Energía — Habitaciones / Residencias",
    meters: [
      ["3901", "7943031"], ["3902", "7943051"], ["3903", "7943057"], ["3904", "7943098"],
      ["3905", "7943104"], ["3906", "7943106"], ["3907", "7943108"], ["3908", "7943111"],
      ["4001", "7943113"], ["4002", "7943114"], ["4003", "7943115"], ["4004", "7943116"],
      ["4005", "7943120"], ["4006", "7943122"], ["4007", "7943125"], ["4008", "7943127"],
      ["4101", "7943131"], ["4102", "7943135"], ["4103", "7943138"], ["4104", "7943161"],
      ["4105", "7943166"], ["4106", "7943171"], ["4107", "7943185"], ["4108", "7943221"],
      ["4109", "7943224"], ["4201", "7943226"], ["4202", "7943227"], ["4203", "7943228"],
      ["4204", "7943229"], ["4205", "7943231"], ["4206", "7943232"], ["4208", "7943236"],
      ["4209", "7943240"],
    ].map(([apto, serial]) => ({ c: apto, n: `Apartamento ${apto} (Medidor ${serial})`, subs: null, u: "kWh" })),
  },
];
METER_GROUPS.forEach(g => g.meters.forEach(m => { m.id = `mt-${g.id}-${m.c}`; }));
export const ALL_METERS = METER_GROUPS.flatMap(g => g.meters);

export const SHIFTS = ["06:00 – 14:00", "14:00 – 22:00", "22:00 – 06:00"];
export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * De todo el equipo (Horario Mensual), ¿quién trabaja el turno elegido, en la fecha elegida?
 * Se fija en la hora de entrada guardada en el horario ese día, y la compara contra la hora de
 * inicio del turno (con 2 horas de margen, por si el turno real no arranca exacto a la hora
 * "oficial" del bloque). No cuenta a quien tenga ese día un código especial (VAC/LIBRE/INC/etc.)
 * ni a quien no tenga nada guardado ese día.
 */
export function employeesOnShift(employees, scheduleEntries, dateIso, shiftLabel) {
  const startHour = parseFloat(shiftLabel.split("–")[0].trim().split(":")[0]);
  return (employees || []).filter(emp => {
    if (emp.active === false) return false;
    const entry = scheduleEntries[`${emp.id}::${dateIso}`];
    if (!entry || entry.code || entry.entrada == null) return false;
    const diff = Math.abs(entry.entrada - startHour);
    return diff < 2 || diff > 22; // el margen "envuelve" la medianoche para el turno 22:00–06:00
  });
}

export function localDateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Quién está trabajando AHORA MISMO, con la hora real de entrada/salida de cada persona (no
 * turnos fijos de 3 bloques) — así alguien que entra a las 9:00 también cuenta, y no solo quien
 * calza con 06:00/14:00/22:00. Revisa tanto el turno de hoy como el de ayer, por si un turno
 * nocturno que empezó ayer todavía sigue activo pasada la medianoche.
 */
export function employeesWorkingNow(employees, scheduleEntries, now = new Date()) {
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const todayIso = localDateIso(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = localDateIso(yesterday);

  return (employees || []).filter(emp => {
    if (emp.active === false) return false;
    const todayEntry = scheduleEntries[`${emp.id}::${todayIso}`];
    const yestEntry = scheduleEntries[`${emp.id}::${yesterdayIso}`];

    if (todayEntry && !todayEntry.code && todayEntry.entrada != null && todayEntry.salida != null) {
      const { entrada, salida } = todayEntry;
      if (salida > entrada) {
        if (currentHour >= entrada && currentHour < salida) return true; // turno normal, mismo día
      } else if (currentHour >= entrada) {
        return true; // turno que cruza medianoche, empezó hoy y sigue activo
      }
    }
    if (yestEntry && !yestEntry.code && yestEntry.entrada != null && yestEntry.salida != null) {
      const { entrada, salida } = yestEntry;
      if (salida < entrada && currentHour < salida) return true; // turno de ayer, todavía no termina
    }
    return false;
  });
}

/* ============================================================
   HORARIOS — festivos Colombia 2026 y reglas de turnistas
   ============================================================ */
/** Calcula los festivos de Colombia para CUALQUIER año (antes esto era una lista escrita a mano
 *  solo para 2026 — funcionaba mientras durara ese año, pero se hubiera "roto" en silencio en
 *  enero de 2027, dejando de reconocer festivos sin ningún aviso). Se calcula con la fecha de
 *  Pascua (algoritmo de Meeus/Jones/Butcher) y la Ley Emiliani (varios festivos se trasladan al
 *  lunes siguiente si no caen ya en lunes), y se guarda en caché por año para no recalcular. */
const _colombiaHolidaysCache = {};
function _fmtIsoUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function _addDaysUTC(d, days) {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}
function _toNextMondayUTC(d) {
  const day = d.getUTCDay(); // 0=domingo … 1=lunes
  if (day === 1) return d;
  const add = (8 - day) % 7 || 7;
  return _addDaysUTC(d, add);
}
function _easterSundayUTC(year) {
  // Algoritmo de Meeus/Jones/Butcher (calendario gregoriano) — devuelve el Domingo de Pascua.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
function colombiaHolidaysForYear(year) {
  if (_colombiaHolidaysCache[year]) return _colombiaHolidaysCache[year];
  const fixed = [`${year}-01-01`, `${year}-05-01`, `${year}-07-20`, `${year}-08-07`, `${year}-12-08`, `${year}-12-25`];
  const emilianiRaw = [
    Date.UTC(year, 0, 6),   // Reyes Magos
    Date.UTC(year, 2, 19),  // San José
    Date.UTC(year, 5, 29),  // San Pedro y San Pablo
    Date.UTC(year, 7, 15),  // Asunción de la Virgen
    Date.UTC(year, 9, 12),  // Día de la Raza
    Date.UTC(year, 10, 1),  // Todos los Santos
    Date.UTC(year, 10, 11), // Independencia de Cartagena
  ].map(ms => _fmtIsoUTC(_toNextMondayUTC(new Date(ms))));
  const easter = _easterSundayUTC(year);
  const easterBased = [
    _fmtIsoUTC(_addDaysUTC(easter, -3)), // Jueves Santo
    _fmtIsoUTC(_addDaysUTC(easter, -2)), // Viernes Santo
    _fmtIsoUTC(_toNextMondayUTC(_addDaysUTC(easter, 39))), // Ascensión
    _fmtIsoUTC(_toNextMondayUTC(_addDaysUTC(easter, 60))), // Corpus Christi
    _fmtIsoUTC(_toNextMondayUTC(_addDaysUTC(easter, 68))), // Sagrado Corazón
  ];
  const all = [...fixed, ...emilianiRaw, ...easterBased];
  _colombiaHolidaysCache[year] = all;
  return all;
}

export const SPECIAL_CODES = [
  { code: "VAC", label: "Vacaciones" },
  { code: "LIBRE", label: "Libre" },
  { code: "INC", label: "Incapacidad" },
  { code: "ALT", label: "Alterno / cambio" },
  { code: "LIC_PAT", label: "Licencia de paternidad" },
  { code: "COMP", label: "Compensatorio (día ganado por horas de reducción)" },
];
// Función (no objeto fijo) para que los colores de cada código especial se adapten al modo
// oscuro — se leen de C en el momento en que se llama, no una sola vez al cargar la página.
export function getSpecialCodeColors() {
  const dark = C.bg === DARK_COLORS.bg;
  return {
    VAC: { bg: C.greenSoft, fg: C.green },
    LIBRE: { bg: C.line, fg: C.gray },
    INC: { bg: C.redSoft, fg: C.red },
    ALT: { bg: C.amberSoft, fg: C.amber },
    LIC_PAT: { bg: C.blueSoft, fg: C.blue },
    COMP: { bg: dark ? "#2a2140" : "#e8e0fb", fg: dark ? "#c9a8f0" : "#6b21a8" },
  };
}
/**
 * Horas que se guardan por cada día trabajado (para quien tiene turnos de 8h en vez de las 7h
 * "reducidas" que trabaja la mayoría) y cuántas horas juntas hacen un día de descanso completo.
 * HOURS_FOR_FULL_COMP_DAY = 8 porque un día de descanso "vale" un turno completo de 8h.
 */
const HOURS_FOR_FULL_COMP_DAY = 8;

/**
 * Cuántas horas de reducción tiene acumuladas un empleado HASTA HOY, mirando TODO su historial
 * real en scheduleEntries (no solo el mes en pantalla): suma 1 hora por cada día trabajado
 * (según employee.reductionHoursPerDay) y resta 8 horas por cada día "COMP" que ya se le haya
 * dado (para no volver a contar un descanso que ya se cobró). Es informativo — nunca asigna nada
 * solo, la app únicamente lo muestra para que el admin decida cuándo darle el día.
 */
export function computeCompBalance(employee, scheduleEntries) {
  const rate = Number(employee.reductionHoursPerDay) || 0;
  if (!rate) return { hours: 0, fullDays: 0 };
  const prefix = `${employee.id}::`;
  let hours = 0;
  Object.entries(scheduleEntries || {}).forEach(([key, entry]) => {
    if (!key.startsWith(prefix)) return;
    if (isWorkedDay(entry)) hours += rate;
    else if (entry?.code === "COMP") hours -= HOURS_FOR_FULL_COMP_DAY;
  });
  hours = Math.max(0, hours);
  return { hours, fullDays: Math.floor(hours / HOURS_FOR_FULL_COMP_DAY) };
}
export const WEEKLY_HOURS_TARGET = 42; // igual al que ya usa tu Excel en las columnas "Diferencia semana"

/**
 * Punto de partida de las "reglas generales del equipo" — se guarda editable en la base de datos
 * (ver standingRules en SchedulesView), esto es solo lo que se precarga la primera vez, con todo
 * lo que ya se había acordado en conversaciones anteriores, para no perderlo.
 */
export const DEFAULT_STANDING_RULES = `- Quintana Jesus Daniel: descansa todos los sábados (ya tiene su día de descanso fijo puesto en el sistema — nunca se le pone turno un sábado, ni siquiera si otras reglas hablan de cubrir sábados con normalidad). Si por su rotación le tocaría turno de noche un sábado, ese turno de noche se pasa al domingo siguiente en su lugar.
- Turnistas en general: máximo 1 domingo trabajado al mes cada uno, y se alternan entre sí — un domingo trabaja uno, el siguiente domingo trabaja otro (no el mismo dos domingos seguidos).
- Cada domingo debe quedar cubierto por UN SOLO turnista (no varios al tiempo), más un turno de apoyo intermedio aparte de 9:00 a.m. a 5:30 p.m. ese mismo día.
- Esalas Felix Jose y Durant Zarith Elias: no pueden coincidir trabajando el mismo domingo — se alternan entre ellos (mientras uno trabaja un domingo, el otro descansa ese domingo, y al siguiente domingo se cambian).`;

export const DEFAULT_CHANGELOG_SEED = [
  { id: "cl-seed-13", title: "Sugerencias de texto al registrar mantenimiento", description: "Al escribir qué se hizo en un mantenimiento, ahora aparecen frases sugeridas según la especialidad del equipo (eléctrico, HVAC, hidráulico, etc.) — tócalas para usarlas y agrega lo que hiciste de más.", at: "2026-08-31T20:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-12", title: "Repuestos usados se descuentan solos", description: "Al registrar un mantenimiento, ahora puedes marcar qué repuestos usaste y se descuentan solos del inventario — sin tener que ir aparte a hacer el retiro a mano.", at: "2026-08-31T12:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-11", title: "Cronograma en matriz con detalle por celda", description: "El cronograma anual ahora se ve como una tabla de equipo × mes con colores, y tocar cualquier celda abre el detalle: última intervención, reprogramar, o registrar un mantenimiento extraordinario.", at: "2026-08-30T18:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-10", title: "Sugerencias inteligentes del cronograma en Tareas", description: "\"Nueva tarea\" ahora tiene una pestaña de Sugerencias: equipos atrasados según su cronograma real, con un botón para convertir la sugerencia en tarea de un solo toque.", at: "2026-08-30T14:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-9", title: "Tablero Kanban de tareas", description: "Las tareas ahora se pueden ver como tablero (Pendiente / En progreso / En espera de repuesto / Hecho), con arrastrar-y-soltar en computador y \"Mover a…\" de un toque en celular.", at: "2026-08-29T22:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-8", title: "Combustibles y gas", description: "Nuevo módulo que toma las lecturas de ACPM del recorrido diario y las convierte en niveles, alertas de reabastecimiento y gráficas — sin registro aparte.", at: "2026-08-29T16:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-7", title: "Cronómetro, cierre con foto y reporte automático en tareas", description: "Las tareas ahora tienen estados con cronómetro en vivo, exigen una foto del \"después\" para cerrarse, y generan un reporte descargable con el historial completo.", at: "2026-08-28T18:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-6", title: "Cuentas y seguridad reforzadas", description: "Ahora se entra con correo y contraseña de verdad (Supabase Auth), con aprobación del admin. La base de datos, el correo y las notificaciones push ya exigen una sesión real — antes de esto, cualquiera con la clave pública podía leer o escribir todo.", at: "2026-08-12T20:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-5", title: "Cambio a Gemini para las funciones de IA", description: "Lectura de medidores por foto y horario mensual con IA ahora corren en Gemini en vez de Claude, para aprovechar la capa gratis.", at: "2026-08-11T23:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-4", title: "Horario Mensual con IA", description: "Generación automática del horario a partir de reglas escritas en español, respetando reglas generales guardadas, con revisión antes de guardar.", at: "2026-08-11T18:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-3", title: "Resumen semanal y sugerencias de reorden con IA", description: "Un correo semanal redactado por IA con lo que pasó, y avisos de qué repuestos se van a agotar pronto según el consumo.", at: "2026-08-12T02:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-2", title: "Modo sin señal mejorado", description: "Las fotos de mantenimiento ya no se pierden si falla la conexión — se guardan y suben solas apenas vuelva la señal.", at: "2026-08-12T01:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-1", title: "Mi horario y accesos rápidos", description: "Cada quien puede ver solo sus propios turnos, y hay botones grandes en Inicio para las acciones más comunes.", at: "2026-08-12T00:00:00.000Z", by: "Sistema" },
];

function isColombiaHoliday(dateIso) {
  const year = parseInt(String(dateIso).slice(0, 4), 10);
  if (!year) return false;
  return colombiaHolidaysForYear(year).includes(dateIso);
}
export function isSundayOrHoliday(dateIso) {
  const d = new Date(dateIso + "T00:00:00");
  return d.getDay() === 0 || isColombiaHoliday(dateIso);
}
export function scheduleKey(employeeId, dateIso) { return `${employeeId}::${dateIso}`; }

/** Avisa (no bloquea) si el turno que se está por guardar se cruza con el del día anterior o el
 *  del día siguiente de la misma persona — pensado para turnos nocturnos que cruzan medianoche,
 *  que son el caso real donde puede pasar un doble cubrimiento sin querer. */
export function checkShiftOverlap(employeeId, dateIso, entrada, salida, scheduleEntries) {
  if (entrada == null || salida == null) return null;
  const d = new Date(dateIso + "T00:00:00");
  const prevDate = new Date(d); prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(d); nextDate.setDate(nextDate.getDate() + 1);
  const prevEntry = scheduleEntries[scheduleKey(employeeId, localDateIso(prevDate))];
  const nextEntry = scheduleEntries[scheduleKey(employeeId, localDateIso(nextDate))];

  if (prevEntry && prevEntry.entrada != null && prevEntry.salida != null && prevEntry.salida < prevEntry.entrada) {
    if (entrada < prevEntry.salida) return `Se cruza con el turno de ayer, que termina a las ${prevEntry.salida}:00 de hoy.`;
  }
  if (salida < entrada && nextEntry && nextEntry.entrada != null) {
    if (nextEntry.entrada < salida) return `Se cruza con el turno de mañana, que empieza a las ${nextEntry.entrada}:00.`;
  }
  return null;
}

/** Horas trabajadas ese día según la entrada/salida exactas (0 si es un código especial como VAC/LIBRE). */
function hoursForEntry(entry) {
  if (!entry || entry.code) return 0;
  if (entry.entrada == null || entry.salida == null) return 0;
  let h = entry.salida - entry.entrada;
  if (h < 0) h += 24; // turno que cruza la medianoche (ej. 22 → 6)
  return h;
}
export function isWorkedDay(entry) { return !!entry && !entry.code && entry.entrada != null; }

/** Arma el contenido de un archivo .ics (calendario) con los turnos de un empleado, listo para descargar. */
export function buildIcsForEmployee(employee, daysIso, entriesByEmployee) {
  const pad = (n) => String(n).padStart(2, "0");
  const fmtIcsDate = (dateIso, hourDecimal) => {
    const [y, m, d] = dateIso.split("-").map(Number);
    const hh = Math.floor(hourDecimal), mm = Math.round((hourDecimal - hh) * 60);
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  };
  const events = [];
  daysIso.forEach(d => {
    const entry = entriesByEmployee[employee.id]?.[d];
    if (!isWorkedDay(entry)) return;
    const start = fmtIcsDate(d, entry.entrada);
    let endDateIso = d;
    if (entry.salida < entry.entrada) { // cruza medianoche
      const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + 1);
      endDateIso = dt.toISOString().slice(0, 10);
    }
    const end = fmtIcsDate(endDateIso, entry.salida);
    events.push(
      "BEGIN:VEVENT",
      `UID:${employee.id}-${d}@quintech-hcc.com`,
      `DTSTAMP:${nowIso().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Turno — QuinTech`,
      `DESCRIPTION:Turno de mantenimiento — QuinTech`,
      "END:VEVENT"
    );
  });
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QuinTech//ES", "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Agrupa una lista de fechas ISO en semanas lunes-domingo (para las columnas "Horas"/"Diferencia" del Excel). */
export function weeksInRange(daysIso) {
  const weeks = [];
  let current = [];
  daysIso.forEach(d => {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow === 1 && current.length) { weeks.push(current); current = []; }
    current.push(d);
  });
  if (current.length) weeks.push(current);
  return weeks;
}
export function weekTotalHours(week, entries) {
  return week.reduce((sum, d) => sum + hoursForEntry(entries[d]), 0);
}

/**
 * Alertas (informativas, no un veredicto legal) para el horario de un empleado en un mes dado.
 * daysIso: lista de fechas ISO del mes. entries: { [dateIso]: { entrada, salida, code, note } } de ESE empleado.
 */
export function computeScheduleWarnings(employee, daysIso, entries) {
  const warnings = [];
  const sundaysHolidaysWorked = daysIso.filter(d => isSundayOrHoliday(d) && isWorkedDay(entries[d]));
  if (sundaysHolidaysWorked.length > 3) {
    warnings.push(`Trabajó ${sundaysHolidaysWorked.length} domingos/festivos este mes (máximo recomendado: 3).`);
  }
  if (employee.fixedRestDay !== null && employee.fixedRestDay !== undefined) {
    const violated = daysIso.filter(d => new Date(d + "T00:00:00").getDay() === employee.fixedRestDay && isWorkedDay(entries[d]));
    if (violated.length > 0) {
      const dayName = DAY_NAMES[employee.fixedRestDay];
      warnings.push(`Tiene ${dayName} marcado como descanso fijo, pero aparece trabajando ${violated.length} ${dayName}(s) este mes.`);
    }
  }
  for (let i = 0; i < daysIso.length - 1; i++) {
    const d1 = daysIso[i], d2 = daysIso[i + 1];
    if (isSundayOrHoliday(d1) && isSundayOrHoliday(d2) && isWorkedDay(entries[d1]) && isWorkedDay(entries[d2])) {
      warnings.push(`Trabajó dos domingos/festivos seguidos (${fmtDayFull(new Date(d1 + "T00:00:00"))} y ${fmtDayFull(new Date(d2 + "T00:00:00"))}).`);
    }
  }
  const weeks = weeksInRange(daysIso);
  weeks.forEach(week => {
    const total = weekTotalHours(week, entries);
    const diff = total - WEEKLY_HOURS_TARGET;
    if (Math.abs(diff) >= 4 && total > 0) {
      const lbl = `${fmtDayShort(new Date(week[0] + "T00:00:00"))}–${fmtDayShort(new Date(week[week.length - 1] + "T00:00:00"))}`;
      warnings.push(`Semana ${lbl}: ${total}h trabajadas (objetivo ${WEEKLY_HOURS_TARGET}h, ${diff > 0 ? "+" : ""}${diff}h de diferencia).`);
    }
  });
  return { sundaysHolidaysCount: sundaysHolidaysWorked.length, warnings };
}


/* ============================================================
   HELPERS
   (sGet/sSet ahora viven en ./lib/storage.js, respaldados por Supabase)
   ============================================================ */

export function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
}
export function nowIso() { return new Date().toISOString(); }
export function fmtDT(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
/**
 * NOTA DE SEGURIDAD: las contraseñas ya NO se manejan a mano en este archivo — desde la
 * migración a Supabase Auth, Supabase se encarga de guardar y verificar las contraseñas de
 * forma segura (con su propio hash con salt, mejor de lo que se podía hacer aquí). Ver las
 * funciones register/login más abajo, que usan supabase.auth.signUp / signInWithPassword.
 */
export function elapsed(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} d ${h % 24} h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} h ${m} min`;
}

/* ---- Helpers de semana (lunes a domingo), para la vista semanal de medidores ---- */
export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MESES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export function startOfWeek(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // retrocede hasta el lunes
  date.setDate(date.getDate() + diff);
  return date;
}
export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function fmtDayShort(d) { return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; }
export function fmtDayFull(d) { return `${DAY_NAMES[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; }
export function isSameCalendarDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
export function daysInMonthIso(year, month) {
  const days = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= count; i++) days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  return days;
}
export function showToast(text, ok = true) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  __pmState._toastListeners.forEach(fn => fn({ id, text, ok }));
}

/* ============================================================
   FONDO DE PLACA DE CIRCUITO (ingreso e Inicio)
   Buses de pistas, chips, resistencias, vías, serigrafía y pulsos de luz. Solo decorativo.
   ============================================================ */
export const PCB_CONFIGS = {
  login: {
    vb: "0 0 390 844", par: "xMidYMid slice", w: 390, h: 844,
    buses: [
      { d: "M-10 94 H48 L72 118 H250", ys: [0, 6, 12, 18] },
      { d: "M330 118 H352 L372 138 V250 L384 262 H400", ys: [0, 6, 12] },
      { d: "M116 700 H186 L210 724 H400", ys: [0, 6, 12, 18] },
      { d: "M-10 596 H30 L48 614 V690 H36", ys: [0, 6, 12] },
    ],
    traces: ["M-10 190 H34", "M58 190 H108 L128 210 H184 V250", "M-10 420 H56 V470 H140 L166 496 H290 V540", "M400 440 H340 L322 458 V520", "M150 854 V804 L170 784 H300 L316 800 V854", "M-10 780 H60 L76 796 V854", "M110 -10 V40 L126 56 H200", "M290 -10 V30 L306 46 H400", "M36 742 V770", "M44 742 V770"],
    pulses: [
      { d: "M-10 94 H48 L72 118 H250", t: 4.4, o: 0 }, { d: "M-10 106 H48 L72 130 H250", t: 5.6, o: -1.4 },
      { d: "M330 118 H352 L372 138 V250 L384 262 H400", t: 6.2, o: -3, tr: "translate(0 6)" },
      { d: "M116 700 H186 L210 724 H400", t: 5, o: -0.6 }, { d: "M116 712 H186 L210 736 H400", t: 6.6, o: -2.4 },
      { d: "M-10 596 H30 L48 614 V690 H36", t: 5.8, o: -4 }, { d: "M-10 420 H56 V470 H140 L166 496 H290 V540", t: 7, o: -1 },
      { d: "M150 854 V804 L170 784 H300 L316 800 V854", t: 6, o: -5 }, { d: "M110 -10 V40 L126 56 H200", t: 4.8, o: -2 },
    ],
    chips: [[250, 108, "U1"], [36, 690, "U2"]],
    res: [[46, 190, 0], [320, 486, 90], [236, 784, 0], [200, 56, 0], [348, 46, 0]],
    caps: [[262, 500], [82, 640]],
    vias: [[184, 250], [290, 540], [322, 520], [200, 56], [316, 854], [76, 854], [150, 854], [36, 770], [44, 770], [110, 40], [400, 46], [34, 190], [58, 190]],
    nodes: [[72, 118, 0], [210, 724, 0.8], [372, 138, 1.5], [56, 470, 0.4]],
    holes: [[352, 806, 12]],
    texts: [[262, 102, "U1"], [48, 684, "U2"], [40, 180, "R12"], [228, 778, "R7"], [256, 518, "C4"], [78, 660, "C9"], [300, 834, "J2"], [338, 832, "TP1"], [132, 68, "V+ 5.0"], [30, 40, "QT-REV.C"]],
  },
  home: {
    vb: "0 0 390 258", par: "xMidYMax slice", w: 390, h: 258,
    buses: [
      { d: "M-10 188 H36 L52 204 H160", ys: [0, 6, 12, 18] },
      { d: "M248 204 H290 L314 228 H400", ys: [0, 6, 12, 18] },
    ],
    traces: ["M-10 250 H20", "M52 250 H110", "M340 -10 V12 L356 28 H400"],
    pulses: [
      { d: "M-10 188 H36 L52 204 H160", t: 4, o: 0 }, { d: "M-10 200 H36 L52 216 H160", t: 5.2, o: -1.8 },
      { d: "M248 204 H290 L314 228 H400", t: 4.6, o: -0.8 }, { d: "M248 216 H290 L314 240 H400", t: 6, o: -3 },
      { d: "M340 -10 V12 L356 28 H400", t: 5, o: -2 },
    ],
    chips: [[160, 194, "U1"]],
    res: [[36, 250, 0]],
    caps: [],
    vias: [[20, 250], [52, 250], [400, 28]],
    nodes: [[52, 204, 0], [314, 228, 1], [356, 28, 1.8]],
    holes: [],
    texts: [[170, 192, "U1"], [28, 240, "R3"], [318, 200, "V+ 5.0"]],
  },
};

/**
 * Panel lateral de detalle de una tarea: descripción, fotos de antes, cronología completa de
 * cambios de estado, y — si todavía no está finalizada — el flujo de cierre (foto obligatoria).
 * Si ya está finalizada, muestra las fotos de después y el botón para descargar el reporte.
 */
// Nombres de columna EXACTOS pedidos para el Kanban — por dentro se siguen usando los mismos
// códigos de estado de siempre (asignada/en-proceso/pausada/finalizada), solo cambia la etiqueta
// que se ve en esta vista, para no crear dos sistemas de estado distintos en la misma app.
export const KANBAN_COLUMNS = [
  { code: "asignada", label: "Pendiente" },
  { code: "en-proceso", label: "En progreso" },
  { code: "pausada", label: "En espera de repuesto" },
  { code: "finalizada", label: "Hecho" },
];
/** Si "Pendiente" pasa de esta cantidad, la columna se resalta — es una señal de que se están
 *  generando más tickets de los que el equipo puede empezar a atender. */
export const KANBAN_WIP_LIMIT = 20;

/** Tarjeta compacta de una columna del Kanban — se puede arrastrar y soltar en otra columna
 * (escritorio) o tocar "Mover a…" para un menú rápido de un solo toque (más confiable en
 * celular/tablet, donde arrastrar y soltar es más difícil de acertar con el dedo). */
/** El cargo (puesto) de quien tiene una cuenta, cruzando su perfil con la lista de empleados —
 * usado para el tooltip del avatar (nombre + cargo). */
export function cargoForUsername(username, accounts, employees) {
  if (!username || !employees) return null;
  const empId = accounts?.[username]?.linked_employee_id;
  return employees.find(e => e.id === empId)?.cargo || null;
}

/** Pasos sugeridos según el tipo de orden (item 1): se detecta por palabras del título/descripción. */
const CHECKLIST_TEMPLATES = [
  { label: "Aire acondicionado", re: /aire|fan ?coil|clima|enfri|termostato|a\/c/, steps: ["Revisar y limpiar el filtro", "Revisar drenaje (sin goteo ni obstrucción)", "Probar enfriamiento y termostato", "Revisar ruido o vibración", "Confirmar con el huésped/recepción que quedó bien"] },
  { label: "Fuga de agua", re: /fuga|gote|lavamanos|ducha|grifo|llave|sanitario|inodoro|tuber|desag|ca[ñn]er/, steps: ["Cerrar la llave de paso si hace falta", "Ubicar el origen de la fuga", "Reparar o cambiar empaque/pieza", "Probar 5 minutos sin fuga", "Secar y dejar limpia la zona"] },
  { label: "Televisor", re: /\btv\b|televis|se[ñn]al|canales|control remoto/, steps: ["Revisar cable y fuente de poder", "Probar con otro control", "Reiniciar y volver a sintonizar canales", "Confirmar imagen y sonido"] },
  { label: "Iluminación", re: /luz|luces|l[aá]mpara|bombill|luminaria|apagador|interruptor/, steps: ["Verificar bombillo/balastro", "Revisar breaker y conexiones", "Cambiar la pieza dañada", "Probar encendido"] },
  { label: "Cerradura / puerta", re: /cerradura|chapa|puerta|tarjeta|bisagra/, steps: ["Revisar batería de la cerradura", "Probar tarjeta/llave", "Ajustar o cambiar mecanismo", "Probar apertura y cierre 3 veces"] },
];
export function suggestChecklist(task) {
  const txt = normalizeSearchText(`${task?.titulo || ""} ${task?.descripcion || ""}`);
  return CHECKLIST_TEMPLATES.find(t => t.re.test(txt)) || null;
}
export const ROOM_PREVENTIVE_STEPS = ["Limpiar o cambiar el filtro del fan coil", "Revisar drenaje y ausencia de goteo", "Probar enfriamiento y termostato", "Revisar ruido o vibración", "Revisar sensor/control de temperatura"];

/* ============================================================
   MANTENIMIENTO — componentes de vista
   ============================================================ */
export const MTTO_TIPOS = [
  { code: "preventivo", label: "Preventivo" },
  { code: "correctivo", label: "Correctivo (falla)" },
  { code: "inspeccion", label: "Inspección" },
];
export const MTTO_ESTADOS = [
  { code: "funcionando", label: "Funcionando" },
  { code: "fuera-de-servicio", label: "Fuera de servicio" },
];

/**
 * Frases sugeridas de "qué se hizo", según la especialidad (sistema) del equipo — para que el
 * técnico no tenga que redactar desde cero un mantenimiento de rutina, y solo agregue lo que
 * hizo de más. Búsqueda por palabra clave, no exacta, porque el nombre del sistema en el
 * inventario real puede variar ("Eléctrico", "Sistema Eléctrico", "Tableros Eléctricos", etc.).
 */
const MAINTENANCE_TEMPLATES = [
  { match: ["electric", "tablero"], preventivo: [
      "Limpieza general del tablero eléctrico, revisión de conexiones y ajuste de breakers. Sin novedades.",
      "Medición de amperaje en las líneas principales y verificación de contactores. Todo dentro de rango normal.",
      "Revisión de puestas a tierra y torque de terminales. Se ajustaron conexiones flojas encontradas.",
    ], correctivo: [
      "Se identificó y corrigió falla en el circuito. Se reemplazó el componente dañado y se verificó el funcionamiento.",
      "Se reparó conexión suelta que causaba intermitencia. Se ajustó y se probó el sistema, quedando operativo.",
      "Se reemplazó breaker/contactor dañado y se verificó que el circuito quedara protegido correctamente.",
    ] },
  { match: ["hvac", "aire acondicionado", "climatiz", "manejadora", "chiller"], preventivo: [
      "Limpieza de filtros y serpentines, y verificación de la presión del refrigerante. Sin fugas detectadas.",
      "Revisión del funcionamiento del compresor y lubricación de rodamientos del motor.",
      "Verificación de temperaturas de entrada/salida y limpieza de bandeja de condensado.",
    ], correctivo: [
      "Se identificó fuga de refrigerante, se reparó y se recargó el sistema a la presión correcta.",
      "Se reemplazó componente dañado (motor/capacitor/contactor) y se verificó el arranque correcto del equipo.",
      "Se destapó línea de condensado obstruida y se verificó el drenaje correcto.",
    ] },
  { match: ["hidraul", "fontaner", "plomer", "bomba", "agua"], preventivo: [
      "Revisión de conexiones y empaques en busca de fugas. Se verificó la presión del sistema.",
      "Purga de aire en las líneas y verificación del funcionamiento de la bomba.",
      "Lubricación de rodamientos y verificación de vibración/ruido anormal en la bomba.",
    ], correctivo: [
      "Se reparó fuga en la tubería/empaque y se verificó que no quedara humedad ni goteo.",
      "Se reemplazó la bomba/componente dañado y se verificó el correcto funcionamiento del sistema.",
      "Se destapó obstrucción en la línea y se restableció el flujo normal.",
    ] },
  { match: ["incendio", "contraincendio", "extintor", "rociador"], preventivo: [
      "Revisión de presión en el sistema y verificación visual de rociadores/válvulas. Sin novedades.",
      "Verificación del estado y vigencia de extintores en el área asignada.",
    ], correctivo: [
      "Se corrigió la falla de presión detectada y se verificó que el sistema quedara operativo.",
      "Se reemplazó componente dañado del sistema contra incendios y se probó su funcionamiento.",
    ] },
  { match: ["refriger", "cuarto frio", "nevera", "cava"], preventivo: [
      "Limpieza de serpentines y verificación de temperatura interna. Dentro del rango correcto.",
      "Revisión de empaques de puerta y verificación del ciclo de deshielo.",
    ], correctivo: [
      "Se identificó y corrigió la causa de la pérdida de frío. Se verificó que la temperatura volviera a rango.",
      "Se reemplazó componente dañado (termostato/compresor/empaque) y se verificó el funcionamiento.",
    ] },
  { match: ["ascensor", "elevador", "escalera electrica"], preventivo: [
      "Revisión de frenos, cables y niveles de aceite según protocolo. Sin novedades encontradas.",
      "Verificación de puertas, sensores de seguridad y botoneras. Todo operativo.",
    ], correctivo: [
      "Se identificó y corrigió la falla reportada. Se realizaron pruebas de funcionamiento y quedó operativo.",
    ] },
  { match: ["generador", "planta electrica", "acpm", "combustible", "gas"], preventivo: [
      "Prueba de encendido y verificación de nivel de combustible y aceite. Sin novedades.",
      "Revisión de batería, filtros y conexiones. Todo dentro de parámetros normales.",
    ], correctivo: [
      "Se identificó y corrigió la falla de arranque/funcionamiento. Se verificó el correcto funcionamiento tras la reparación.",
    ] },
];
const MAINTENANCE_TEMPLATE_FALLBACK = {
  preventivo: [
    "Se realizó inspección general del equipo, limpieza y verificación de funcionamiento. Sin novedades.",
    "Se verificaron parámetros normales de operación y se hizo mantenimiento de rutina según protocolo.",
  ],
  correctivo: [
    "Se identificó y corrigió la falla reportada. Se verificó el correcto funcionamiento del equipo tras la reparación.",
    "Se reemplazó el componente dañado y se realizaron pruebas de funcionamiento.",
  ],
};
export function getMaintenanceTemplates(sistema, tipo) {
  const s = normalizeSearchText(sistema || "");
  const found = MAINTENANCE_TEMPLATES.find(g => g.match.some(kw => s.includes(kw)));
  const group = found || MAINTENANCE_TEMPLATE_FALLBACK;
  return tipo === "correctivo" ? group.correctivo : group.preventivo;
}

/* ============================================================
   VISTA: PANEL EJECUTIVO
   ============================================================ */
/** Pequeña etiqueta "↑/↓ X% vs mes pasado" para el Panel Ejecutivo. */
/**
 * Tarjeta KPI: etiqueta pequeña arriba, número grande, y opcionalmente un desglose debajo de
 * una línea divisoria (ej: "Preventivo 12 / Correctivo 8") — el mismo patrón de las tarjetas
 * de reportes tipo BI (número protagonista + contexto secundario, sin saturar).
 */
/**
 * Etiqueta de estado/prioridad estandarizada para toda la app — una sola paleta fija en vez de
 * que cada vista invente su propio estilo: azul = preventivo, rojo = correctivo/crítico/vencido,
 * ámbar = en proceso/advertencia, verde = terminado/ejecutado.
 */
export const BADGE_TONES = {
  blue: { bg: C.blueSoft, fg: C.blue },
  red: { bg: C.redSoft, fg: C.red },
  amber: { bg: C.amberSoft, fg: "#7a5405" },
  green: { bg: C.greenSoft, fg: C.green },
  gray: { bg: C.bg, fg: C.gray },
};
/** Ordena una lista por una llave, alternando ascendente/descendente al tocar la misma columna
 * otra vez — usado junto con SortableTh en todas las tablas de la app. */
export function sortRows(rows, sort) {
  if (!sort.key) return rows;
  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av ?? "").localeCompare(String(bv ?? ""), "es");
  });
  return sort.dir === "desc" ? sorted.reverse() : sorted;
}

/** Traduce los distintos "vocabularios" de estado de la app (tipo de mantenimiento, estado de
 * tarea, estado de cronograma, prioridad) a un mismo tono de color, consistente en todos lados. */
export function badgeToneFor(kind, value) {
  if (kind === "tipoMtto") return value === "preventivo" ? "blue" : "red";
  if (kind === "taskEstado") {
    const e = normalizeTaskState(value);
    if (e === "finalizada") return "green";
    if (e === "en-proceso" || e === "pausada") return "amber";
    return "gray";
  }
  if (kind === "cronograma") return value === "ejecutado" ? "green" : value === "atrasado" ? "red" : "amber";
  if (kind === "prioridad") return value === "alta" ? "red" : value === "media" ? "amber" : "blue";
  if (kind === "sistema") {
    const v = (value || "").toLowerCase();
    if (v.includes("eléctric") || v.includes("electric")) return "amber";
    if (v.includes("hvac") || v.includes("clima") || v.includes("aire")) return "blue";
    if (v.includes("hidráulic") || v.includes("plomería") || v.includes("agua")) return "green";
    return "gray";
  }
  return "gray";
}

export const MTTO_ESTADO_COLORS = {
  ejecutado: { bg: C.greenSoft, fg: C.green, label: "Ejecutado" },
  atrasado: { bg: C.redSoft, fg: C.red, label: "Atrasado" },
  pendiente: { bg: C.amberSoft, fg: "#7a5405", label: "Pendiente" },
};

/**
 * Cómo se ve una celda de la matriz del cronograma: además de los 3 estados guardados
 * (ejecutado/atrasado/pendiente), distingue visualmente lo "pendiente" que ya está por vencer
 * (este mes o el próximo) de lo que apenas está programado más adelante — y lo gris/transparente
 * cuando ese mes no tiene nada programado para ese equipo.
 */
export function cronogramaCellVisual(c, mesNum, now) {
  if (!c) return { bg: "transparent", fg: C.gray, label: "—", tone: "vacio" };
  if (c.estado === "ejecutado") return { bg: C.greenSoft, fg: C.green, label: "Ejecutado", tone: "ejecutado" };
  if (c.estado === "atrasado") return { bg: C.redSoft, fg: C.red, label: "Atrasado", tone: "atrasado" };
  const currentMonth = now.getMonth() + 1;
  const imminent = mesNum === currentMonth || mesNum === currentMonth + 1 || (currentMonth === 12 && mesNum === 1);
  if (imminent) return { bg: C.amberSoft, fg: "#7a5405", label: "Por vencer", tone: "proximo" };
  return { bg: C.blueSoft, fg: C.blue, label: "Programado", tone: "programado" };
}

/* ============================================================
   HORARIOS — componentes de vista
   ============================================================ */
export const CARGOS = ["Administrativo", "Turnista", "Apoyo", "Mecánico", "Practicante", "Pintor", "Carpintero", "Albañil", "Jardinero"];
// Un color por cargo, solo para que el PDF del horario sea más fácil de leer de un vistazo
// (el nombre de cada quien sale en el color de su cargo). No afecta nada más de la app.
const CARGO_PDF_COLORS = {
  "Administrativo": "#1e4fa3",
  "Turnista": "#a31245",
  "Apoyo": "#1c7a34",
  "Mecánico": "#8a5a00",
  "Practicante": "#6b21a8",
  "Pintor": "#0e7490",
  "Carpintero": "#9a3412",
  "Albañil": "#4d7c0f",
  "Jardinero": "#166534",
};

/** Equipos que llevan reportados como dañados más de X días sin que nadie los marque como resueltos
 *  ni confirme "Sigue igual" — para que no se queden ahí "quietos" sin que nadie se dé cuenta. */
export function computeStaleIssues(activeIssues, thresholdDays = 15) {
  const now = Date.now();
  return Object.values(activeIssues)
    .map(iss => {
      const checkins = iss.checkins || [];
      const lastTouch = checkins.length ? checkins[checkins.length - 1].at : iss.openedAt;
      const daysOpen = Math.floor((now - new Date(lastTouch).getTime()) / (1000 * 60 * 60 * 24));
      return { ...iss, daysOpen };
    })
    .filter(iss => iss.daysOpen >= thresholdDays)
    .sort((a, b) => b.daysOpen - a.daysOpen);
}

/** Panel de uso y respaldo (item 20): cuánto espacio ocupan los datos, actividad del equipo y
 * descargas (respaldo completo y tareas en Excel). Solo administrador. */
/* ===== Archivo en Google Drive ("memoria" por mes) =====
 * Las fotos y videos con más de 60 días se copian a una carpeta de Drive por mes
 * (QuinTech / AAAA-MM / Fotos | Videos) junto con un informe en Excel de ese mes, y se borran de
 * Supabase para liberar espacio. Lo ESCRITO (tareas, seguimientos, registros) nunca se borra: en
 * lugar de la foto vieja queda una tarjeta "Archivada en Drive · mes". Si una corrida se corta a la
 * mitad, volver a correrla continúa donde quedó (no duplica archivos en Drive). */
export const DRIVE_KEEP_DAYS = 60;
const DRIVE_MEDIA_RE = /https?:\/\/[^"'\s\\]*\/storage\/v1\/object\/sign\/(maintenance-photos|maintenance-videos)\/([^"'\s\\?]+)\?[^"'\s\\]*/g;
export const monthKeyOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
export const archivedPlaceholder = (ym) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='100%' height='100%' fill='#243241'/><text x='50%' y='46%' fill='#e7edf3' font-family='sans-serif' font-size='17' text-anchor='middle'>Archivada en Drive</text><text x='50%' y='62%' fill='#9fb0bf' font-family='sans-serif' font-size='15' text-anchor='middle'>${ym}</text></svg>`);

/** Busca en TODAS las filas de la base las fotos/videos y los agrupa por mes de subida (la fecha
 * viene en el nombre del archivo). No toca fotos de equipos ni videos de referencia. */
export function scanArchivableMedia(rows) {
  const cutoff = Date.now() - DRIVE_KEEP_DAYS * 86400000;
  const byUrl = new Map();
  let total = 0, recent = 0;
  for (const r of rows) {
    const txt = JSON.stringify(r.value ?? null);
    for (const m of txt.matchAll(DRIVE_MEDIA_RE)) {
      const url = m[0], bucket = m[1], path = decodeURIComponent(m[2]);
      if (path.startsWith("equipo")) continue;
      const tm = path.match(/(\d{13})-[a-z0-9]+\.[a-z0-9]+$/i);
      if (!tm) continue;
      total++;
      const ts = Number(tm[1]);
      if (ts >= cutoff) { recent++; continue; }
      if (!byUrl.has(url)) byUrl.set(url, { url, bucket, path, ts, ym: monthKeyOf(ts), keys: new Set() });
      byUrl.get(url).keys.add(r.key);
    }
  }
  const months = {};
  for (const it of byUrl.values()) {
    months[it.ym] = months[it.ym] || { ym: it.ym, items: [], fotos: 0, videos: 0 };
    months[it.ym].items.push(it);
    if (it.bucket === "maintenance-videos") months[it.ym].videos++; else months[it.ym].fotos++;
  }
  return { months: Object.values(months).sort((a, b) => a.ym.localeCompare(b.ym)), total, recent };
}

async function driveApi(token, url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`Drive respondió ${r.status}`);
  return r;
}
export async function driveFolder(token, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId || "root"}' in parents`;
  const r = await driveApi(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  const j = await r.json();
  if (j.files?.[0]) return j.files[0].id;
  const c = await driveApi(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  });
  return (await c.json()).id;
}
export async function driveHasFile(token, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and trashed=false and '${parentId}' in parents`;
  const r = await driveApi(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  return ((await r.json()).files || []).length > 0;
}
export async function driveUpload(token, blob, name, parentId, mime) {
  const boundary = "pmarch" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name, parents: [parentId] });
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`, blob, `\r\n--${boundary}--`]);
  await driveApi(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  });
}

/** Informe en Excel de un rango de meses (AAAA-MM a AAAA-MM): resumen, tareas y mantenimientos. */
export async function buildActivityReport(fromYm, toYm, tasks, accounts) {
  const inRange = (iso) => { if (!iso) return false; const ym = monthKeyOf(new Date(iso).getTime()); return ym >= fromYm && ym <= toYm; };
  const nm = (u) => accounts?.[u]?.display_name || u || "Sin asignar";
  const mine = (tasks || []).filter(t => inRange(t.createdAt) || inRange(t.finishedAt));
  let mtto = [], equipos = [];
  try { const a = await sGet("mtto-log", true); const b = await sGet("mtto-log-archive", true); mtto = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(r => inRange(r.fecha || r.createdAt)); } catch { /* sin mantenimientos */ }
  try { const e = await sGet("mtto-equipos", true); equipos = Array.isArray(e) ? e : []; } catch { /* sin equipos */ }
  const eqName = (id) => { const e = equipos.find(x => x.id === id); return e ? (e.nombre || e.name || id) : id; };
  const cerradas = mine.filter(t => normalizeTaskState(t.estado) === "finalizada" && inRange(t.finishedAt));
  const porTec = {};
  cerradas.forEach(t => { const k = nm(t.asignadoA); porTec[k] = (porTec[k] || 0) + 1; });
  const costoTotal = mtto.reduce((a, r) => a + (Number(r.costo) || 0), 0);
  const wb = XLSX.utils.book_new();
  const resumen = [
    ["Informe de actividades", `${fromYm} a ${toYm}`],
    ["Tareas creadas en el período", mine.filter(t => inRange(t.createdAt)).length],
    ["Tareas cerradas en el período", cerradas.length],
    ["Mantenimientos registrados", mtto.length],
    ["Costo registrado en mantenimientos", costoTotal],
    [],
    ["Tareas cerradas por técnico", ""],
    ...Object.entries(porTec).sort((a, b) => b[1] - a[1]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mine.map(t => ({
    Titulo: t.titulo, Descripcion: t.descripcion || "", Estado: normalizeTaskState(t.estado), Prioridad: t.prioridad, Asignado: nm(t.asignadoA),
    Creada: t.createdAt ? fmtDT(t.createdAt) : "", Finalizada: t.finishedAt ? fmtDT(t.finishedAt) : "", NotaCierre: t.notaCierre || "",
    ReabiertaODevuelta: t.devueltaAt ? "Sí" : "",
  }))), "Tareas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mtto.map(r => ({
    Fecha: fmtDT(r.fecha || r.createdAt), Equipo: eqName(r.equipoId), Tipo: r.tipo, Tecnico: r.tecnico || r.createdBy || "", Estado: r.estado || "",
    Descripcion: r.descripcion || "", Costo: Number(r.costo) || 0,
    Repuestos: (r.repuestos || []).map(x => `${x.nombre} x${x.cantidad}`).join(", "),
  }))), "Mantenimientos");
  return wb;
}

/* ============================================================
   RECORRIDO GUIADO (primera vez que alguien entra)
   ============================================================ */
export const ONBOARDING_STEPS = [
  { title: "¡Bienvenido a QuinTech!", body: "Esta es la app para tus rondas, mantenimiento, inventario y más — reemplaza los formatos en papel. Te mostramos rápido cómo usarla, toma un minuto." },
  { title: "Todo empieza en Inicio", body: "Ahí tienes una tarjeta por cada sección de la app. Toca la que necesites. Si alguna se ve atenuada/gris, es porque tu cuenta no tiene ese permiso — pídeselo a un administrador si crees que deberías tenerlo." },
  { title: "Tu ronda diaria", body: "Entra a \"Ronda de revisión\", elige tu turno arriba a la derecha, y ve marcando cada equipo piso por piso. Guarda al terminar cada piso, y sigue al siguiente." },
  { title: "Si algo está dañado", body: "Marca \"Dañado / Fuera de servicio\" en ese equipo y escribe qué pasó — es obligatorio. Queda registrado y avisa a los administradores." },
  { title: "Busca lo que necesites", body: "Arriba hay un buscador — te ayuda a encontrar cualquier equipo rápido, sin tener que navegar por los menús. Busca justo donde estés trabajando." },
  { title: "Instálala y activa los avisos", body: "Añade la app a la pantalla de inicio del celular y activa las notificaciones (en Inicio verás una tarjeta que te guía). Así te avisamos apenas te asignen una orden." },
  { title: "Escanea para ir directo", body: "El botón \"Escanear\" de abajo abre la cámara desde cualquier pantalla: apunta al QR de un equipo y ves su ficha." },
  { title: "¡Listo para empezar!", body: "Puedes volver a ver esta guía cuando quieras desde el botón de ayuda (?) arriba, junto al resto de íconos." },
];

export function median(nums) {
  const arr = (nums || []).filter(n => n != null).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
export function useBackClose(isOpen, onClose) {
  const idRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const id = {};
    idRef.current = id;
    __pmState.__pmBackStack.push(id);
    try { window.history.pushState({ pmBack: true }, ""); } catch { /* noop */ }
    return () => {
      __pmState.__pmBackStack = __pmState.__pmBackStack.filter(x => x !== id);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      // Si esto ya no es lo último que se abrió (ej. hay una foto ampliada encima), el atrás le
      // toca a esa capa, no a esta — se ignora y se deja que su propio listener actúe.
      const top = __pmState.__pmBackStack[__pmState.__pmBackStack.length - 1];
      if (top === idRef.current) {
        __pmState.__pmBackStack.pop();
        onCloseRef.current();
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isOpen]);
}

/**
 * Igual que useBackClose, pero además bloquea el scroll de lo que está DETRÁS mientras esto está
 * abierto. Es para overlays de verdad (drawer, modal, foto ampliada) que flotan ENCIMA de una
 * pantalla que se queda montada debajo — sin esto, en el celular se puede arrastrar esa pantalla
 * de fondo con el dedo (sobre todo en iOS, con el "rebote" de goma que deja ver un hueco en
 * blanco detrás), lo cual se siente roto. NO usar esto para la navegación principal (cambiar de
 * sección con `view`): ahí no hay nada "detrás" que deba quedar congelado — la sección ES la
 * pantalla, y bloquear el scroll ahí dejaría a la sección misma sin poder desplazarse.
 * Un contador (no true/false) porque puede haber más de una capa abierta a la vez (ej. una foto
 * ampliada sobre un panel de tarea) — el scroll solo se vuelve a permitir al cerrar la última.
 */
export function useBackCloseModal(isOpen, onClose) {
  useBackClose(isOpen, onClose);
  useEffect(() => {
    if (!isOpen) return;
    __pmState.__pmScrollLockCount++;
    if (__pmState.__pmScrollLockCount === 1) document.body.style.overflow = "hidden";
    return () => {
      __pmState.__pmScrollLockCount = Math.max(0, __pmState.__pmScrollLockCount - 1);
      if (__pmState.__pmScrollLockCount === 0) document.body.style.overflow = "";
    };
  }, [isOpen]);
}

export function normalizeSearchText(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const MAX_FAVORITES = 5;

const FUEL_TANK_TYPES = ["Diesel (ACPM)", "Gas propano", "Gasolina"];

/** Nombre a mostrar + color según el estado activo de una habitación en Telkonet. */
export function hvacStateTone(profileName) {
  const p = (profileName || "").toUpperCase();
  if (p === "VIP") return { color: C.purple, bg: C.purpleSoft };
  if (p.includes("CHECK IN")) return { color: C.blue, bg: C.blueSoft };
  if (p.includes("CHECK OUT")) return { color: C.gray, bg: C.graySoft };
  return { color: C.amber, bg: C.amberSoft };
}

/**
 * Clima de habitaciones (BMS Telkonet) — tabla en vivo de temperatura/estado de todas las
 * habitaciones (aires acondicionados), con historial e, para administración/gerencia, la
 * posibilidad de cambiar el estado activo (VIP, Check IN, Check OUT) directamente desde acá,
 * en vez de tener que entrar al panel de Telkonet por separado.
 *
 * Todo pasa por /api/telkonet (ver ese archivo) — las credenciales de Telkonet nunca tocan el
 * navegador. El cambio de estado SÍ mueve equipo físico real, así que pide confirmación explícita
 * y el propio servidor vuelve a comprobar que quien llama es admin/gerencia antes de ejecutarlo.
 */
/**
 * Historial por habitación y fallas repetidas. Junta, para un cuarto, todas las tareas (incluidas las
 * órdenes de HotSOS) y los mantenimientos de sus equipos, en una sola línea de tiempo; y en la otra
 * pestaña muestra qué habitaciones, equipos y tipos de falla se repiten más en el periodo elegido.
 * Solo lee lo que ya está en la app — no guarda nada nuevo.
 */
export function roomOfTask(t) {
  if (t.origen === "hotsos") {
    const m = /\b(\d{3,5})\b/.exec(String(t.descripcion || "").split(" — ")[0]);
    return m ? m[1] : null;
  }
  const m = /hab(?:itaci[oó]n)?\.?\s*#?\s*(\d{3,5})/i.exec(`${t.titulo || ""} ${t.descripcion || ""}`);
  return m ? m[1] : null;
}
export function categoryOfTask(t) {
  const m = /categor[ií]a sugerida: ([^)]+)\)/i.exec(t.descripcion || "");
  return m ? m[1].trim() : null;
}

/** Reincidencia (item 5): ¿esta habitación tuvo el mismo problema cerrado en los últimos N días?
 * Devuelve { id, titulo, dias } de la tarea cerrada más reciente que coincide, o null. */
export function findReincidencia(room, problema, categoria, closedTasks, days = 15) {
  if (!room) return null;
  const nb = normalizeSearchText(problema);
  const limit = Date.now() - days * 86400000;
  let best = null;
  (closedTasks || []).forEach(t => {
    if (!t.finishedAt) return;
    const ts = new Date(t.finishedAt).getTime();
    if (ts < limit || roomOfTask(t) !== room) return;
    const na = normalizeSearchText(t.titulo);
    const same = na === nb || (nb.length > 6 && (na.includes(nb) || nb.includes(na))) || (categoria && String(t.descripcion || "").includes(`categoría sugerida: ${categoria}`));
    if (same && (!best || ts > best.ts)) best = { id: t.id, titulo: t.titulo, ts };
  });
  return best ? { id: best.id, titulo: best.titulo, dias: Math.max(0, Math.floor((Date.now() - best.ts) / 86400000)) } : null;
}

/* ============================================================
   PLANOS POR PISO (solo administrador): se abre la planta del piso, se toca una habitación y se ve
   cuánto mantenimiento ha tenido (pintura, aire, hidráulico, eléctrico…) con fechas y detalle.
   Los datos salen de lo que la app ya guarda: tareas (incluidas las órdenes de HotSOS) y los
   mantenimientos de los equipos cuyo nombre trae el número de la habitación.
   ============================================================ */
export const PLAN_GROUPS = [
  { id: "Pintura", color: "#a855f7" },
  { id: "Aire / HVAC", color: "#0ea5e9" },
  { id: "Hidráulico", color: "#2563eb" },
  { id: "Eléctrico", color: "#f59e0b" },
  { id: "Puertas y muebles", color: "#16a34a" },
  { id: "Remodelación", color: "#ec4899" },
  { id: "Otros", color: "#64748b" },
];
export function planGroupOf(text, label) {
  const s = normalizeSearchText(`${text || ""} ${label || ""}`);
  if (/remodel|renovaci|reforma/.test(s)) return "Remodelación";
  if (/pint|resane|estuco|macilla|estructural/.test(s)) return "Pintura";
  if (/\baire\b|fan ?coil|termostat|hvac|evaporador|condensador|ventilaci|calefacci|rejilla/.test(s)) return "Aire / HVAC";
  if (/agua|ducha|grifo|inodoro|lavamanos|fuga|filtraci|sanitari|hidraul|banera|desague|tuber/.test(s)) return "Hidráulico";
  if (/\bluz\b|luces|lampara|interruptor|toma ?corriente|electric|bombillo|breaker/.test(s)) return "Eléctrico";
  if (/puerta|cerradura|mueble|cortina|closet|carpinter|cerrajer|bisagra|gabinete|tocador|velador/.test(s)) return "Puertas y muebles";
  return "Otros";
}
export const planColorOf = (g) => (PLAN_GROUPS.find(x => x.id === g) || PLAN_GROUPS[PLAN_GROUPS.length - 1]).color;

/**
 * Inventario de herramientas — distinto al de repuestos: las herramientas no se consumen, se
 * prestan y se devuelven. Quién tiene qué prestado en este momento, para no perder herramientas
 * caras (multímetro, taladro, etc.).
 */
/** URL única de una herramienta (lo que va codificado en su QR). */
export function toolUrl(toolId) {
  return `${window.location.origin}${window.location.pathname}?tool=${toolId}`;
}

/* ============================================================
   INSIGHTS DE INICIO: equipos reincidentes, tareas sin movimiento, resumen de turno,
   costos del año por equipo y gráficas del mes.
   ============================================================ */
export function lastTaskActivityMs(t) {
  const c = (t.comments || []).reduce((m, x) => Math.max(m, new Date(x.at || 0).getTime() || 0), 0);
  return Math.max(new Date(t.updatedAt || 0).getTime() || 0, new Date(t.createdAt || t.assignedAt || 0).getTime() || 0, c);
}

/**
 * Registro de visitas de contratistas — como una bitácora de portería: el técnico del hotel
 * abre "Registrar visita" y le entrega el celular/tablet al contratista para que llene sus
 * datos y firme él mismo. Al terminar su trabajo, vuelve a marcar salida y firma de nuevo.
 */
export const CONTRACTOR_MOTIVOS = ["Mantenimiento preventivo", "Reparación / correctivo", "Instalación", "Inspección / auditoría", "Entrega de material", "Otro"];

export const WIKI_CATEGORIAS = ["General", "Emergencias", "Eléctrico", "Plomería / Agua", "Clima (A/C y chillers)", "Procedimientos administrativos"];

export const ROOM_BLOCK_REASONS = ["Mantenimiento", "Limpieza profunda", "Renovación", "Otro"];


/* ============================================================
   INFORME (texto) + IMPRESIÓN A PDF + ENVÍO POR CORREO
   Envío real de correo: usa el conector de Gmail conectado a esta cuenta
   de Claude (llamando a la API de Anthropic con la herramienta MCP de
   Gmail). Si el conector no está disponible, se informa con claridad
   y se puede igualmente descargar/imprimir el PDF para adjuntarlo a mano.
   ============================================================ */
export function buildReportText(activeIssues, issueHistory, roundsIndex) {
  const L = [];
  L.push("INFORME DE EQUIPOS — PISOS MECÁNICOS");
  L.push(`Generado: ${fmtDT(nowIso())}`);
  L.push("");
  const active = Object.values(activeIssues);
  L.push(`EQUIPOS FUERA DE SERVICIO ACTUALMENTE (${active.length})`);
  if (active.length === 0) L.push("— Ninguno. Todo en orden.");
  active.forEach(iss => L.push(`- [${iss.floorName}] #${iss.code} ${iss.name} — reportado por ${iss.openedBy} el ${fmtDT(iss.openedAt)} (${elapsed(iss.openedAt)} fuera de servicio). Obs: ${iss.observation}`));
  L.push("");
  L.push("ÚLTIMOS INCIDENTES RESUELTOS");
  if (issueHistory.length === 0) L.push("— Sin registros.");
  issueHistory.slice(0, 20).forEach(h => L.push(`- [${h.floorName}] #${h.code} ${h.name} — dañado ${fmtDT(h.openedAt)}, resuelto ${fmtDT(h.resolvedAt)} por ${h.resolvedBy} (duración ${h.duration}). Solución: ${h.solution}`));
  L.push("");
  L.push("ÚLTIMAS RONDAS REGISTRADAS");
  if (roundsIndex.length === 0) L.push("— Sin registros.");
  roundsIndex.slice(0, 20).forEach(r => L.push(`- ${r.floorName} · ${fmtDT(r.savedAt)} · turno ${r.shift} · ${r.user} · ${r.itemCount} equipos${r.damagedCount ? `, ${r.damagedCount} dañados` : ""}`));
  return L.join("\n");
}

function escHtml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function buildReportHtml(activeIssues, issueHistory, roundsIndex) {
  const active = Object.values(activeIssues);
  const rowsActive = active.length
    ? active.map(iss => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;"><b>[${escHtml(iss.floorName)}] #${iss.code} ${escHtml(iss.name)}</b> — reportado por ${escHtml(iss.openedBy)} el ${fmtDT(iss.openedAt)} (${elapsed(iss.openedAt)} fuera de servicio)<br><i>Obs: ${escHtml(iss.observation)}</i></div>`).join("")
    : `<p style="font-size:12px;">Ninguno. Todo en orden.</p>`;
  const rowsHist = issueHistory.length
    ? issueHistory.slice(0, 30).map(h => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;"><b>[${escHtml(h.floorName)}] #${h.code} ${escHtml(h.name)}</b><br>Dañado: ${fmtDT(h.openedAt)} · Resuelto: ${fmtDT(h.resolvedAt)} por ${escHtml(h.resolvedBy)} · Duración: ${h.duration}<br><i>Solución: ${escHtml(h.solution)}</i></div>`).join("")
    : `<p style="font-size:12px;">Sin registros.</p>`;
  const rowsRounds = roundsIndex.length
    ? roundsIndex.slice(0, 30).map(r => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;">${escHtml(r.floorName)} · ${fmtDT(r.savedAt)} · Turno ${escHtml(r.shift)} · ${escHtml(r.user)} · ${r.itemCount} equipos${r.damagedCount ? `, ${r.damagedCount} dañados` : ""}</div>`).join("")
    : `<p style="font-size:12px;">Sin registros.</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Informe de Equipos - QuinTech</title></head>
<body style="font-family:Arial, Helvetica, sans-serif; padding:32px; color:#111; max-width:800px; margin:0 auto;">
<h1 style="font-size:20px;">Informe de Equipos — QuinTech</h1>
<p style="font-size:12px;color:#555;">Generado: ${fmtDT(nowIso())}</p>
<h2 style="font-size:15px;margin-top:20px;">Equipos fuera de servicio actualmente (${active.length})</h2>
${rowsActive}
<h2 style="font-size:15px;margin-top:20px;">Últimos incidentes resueltos</h2>
${rowsHist}
<h2 style="font-size:15px;margin-top:20px;">Últimas rondas registradas</h2>
${rowsRounds}
<p style="font-size:11px;color:#999;margin-top:24px;">Abre este archivo en tu navegador y usa "Imprimir → Guardar como PDF" si necesitas la versión en PDF.</p>
</body></html>`;
}

/** Descarga real del informe como archivo .html (respaldo si el PDF no puede generarse, p.ej. sin internet). */
export function downloadReportFile(activeIssues, issueHistory, roundsIndex) {
  try {
    const html = buildReportHtml(activeIssues, issueHistory, roundsIndex);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-equipos-${todayStr().replace(/\//g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}

/** Carga jsPDF desde CDN la primera vez que se necesita (requiere internet en el dispositivo del usuario). */
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
    const existing = document.getElementById("jspdf-cdn-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf.jsPDF));
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el generador de PDF.")));
      return;
    }
    const script = document.createElement("script");
    script.id = "jspdf-cdn-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("No se pudo cargar el generador de PDF."));
    document.body.appendChild(script);
  });
}

function loadAutoTable() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF?.API?.autoTable) { resolve(); return; }
    const existing = document.getElementById("jspdf-autotable-cdn-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el generador de tablas del PDF.")));
      return;
    }
    const script = document.createElement("script");
    script.id = "jspdf-autotable-cdn-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el generador de tablas del PDF."));
    document.body.appendChild(script);
  });
}

/** Carga jsPDF + autoTable juntos; usar esto en vez de loadJsPDF a solas para reportes con tablas. */
async function loadPdfLibs() {
  const jsPDFCtor = await loadJsPDF();
  await loadAutoTable();
  return jsPDFCtor;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Paleta del PDF, tomada de la misma paleta de colores que usa la app (C), en formato RGB para jsPDF. */
const PDF_C = {
  steelDark: hexToRgb(C.steelDark),
  amber: hexToRgb(C.amber),
  amberSoft: hexToRgb(C.amberSoft),
  ink: hexToRgb(C.ink),
  inkSoft: hexToRgb(C.inkSoft),
  gray: hexToRgb(C.gray),
  line: hexToRgb(C.line),
  red: hexToRgb(C.red),
  green: hexToRgb(C.green),
  white: [255, 255, 255],
  rowStripe: [246, 248, 250],
};

/** Encabezado con banda de color, título y datos del reporte. Se dibuja solo en la primera página. Devuelve la Y donde puede empezar el contenido. */
function pdfLetterhead(doc, title, metaLines) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_C.steelDark);
  doc.rect(0, 0, pageW, 27, "F");
  doc.setFillColor(...PDF_C.amber);
  doc.rect(0, 27, pageW, 1.6, "F");
  doc.setTextColor(...PDF_C.white);
  doc.setFont(undefined, "bold"); doc.setFontSize(16);
  doc.text(title, 14, 12.5);
  doc.setFont(undefined, "normal"); doc.setFontSize(8.5);
  doc.text("QuinTech · Revisión Diaria de Equipos", 14, 18.5);
  doc.setFontSize(7.8);
  doc.text(metaLines.join("   ·   "), 14, 23.8);
  doc.setTextColor(...PDF_C.ink);
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  return 36;
}

/** Pie de página con línea divisoria, fecha de generación y "Página X de Y", aplicado a TODAS las páginas al final. */
/** Agrega la firma guardada de quien envía el reporte, si tiene una configurada en Mi Perfil. Devuelve la nueva posición Y. */
function pdfSignatureBlock(doc, y, pageH, signatureDataUrl, userLine) {
  if (!signatureDataUrl) return y;
  if (y > pageH - 55) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Firma");
  try {
    doc.addImage(signatureDataUrl, "PNG", 14, y, 70, 27);
    y += 30;
  } catch { /* si la imagen no carga, se omite sin romper el PDF */ }
  doc.setFontSize(8.5); doc.setTextColor(...PDF_C.inkSoft);
  doc.text(userLine, 14, y);
  doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
  return y + 6;
}

function pdfFooterAll(doc) {
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_C.line);
    doc.setLineWidth(0.2);
    doc.line(14, pageH - 13, pageW - 14, pageH - 13);
    doc.setFontSize(7.3);
    doc.setTextColor(...PDF_C.gray);
    doc.text(`Generado ${fmtDT(nowIso())} · QuinTech`, 14, pageH - 8.5);
    doc.text(`Página ${i} de ${pages}`, pageW - 14, pageH - 8.5, { align: "right" });
    doc.setTextColor(...PDF_C.ink);
  }
}

/** Título de sección con una barrita de color a la izquierda, estilo "ficha". Devuelve la Y siguiente. */
function pdfSectionTitle(doc, y, text, opts = {}) {
  doc.setFillColor(...(opts.color || PDF_C.amber));
  doc.rect(14, y - 4.2, 2, 6, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(11.5);
  doc.setTextColor(...PDF_C.ink);
  doc.text(text, 18.5, y);
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  return y + 7;
}

/** Fila de tarjetas de resumen (estilo "stat cards"), 2 a 4 tarjetas en una fila. Devuelve la Y siguiente. */
function pdfStatBoxes(doc, y, boxes) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14, gap = 4, boxH = 17;
  const boxW = (pageW - marginX * 2 - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach((b, i) => {
    const x = marginX + i * (boxW + gap);
    doc.setFillColor(...PDF_C.rowStripe);
    doc.setDrawColor(...PDF_C.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxW, boxH, 1.6, 1.6, "FD");
    doc.setFont(undefined, "normal"); doc.setFontSize(6.8);
    doc.setTextColor(...PDF_C.gray);
    doc.text(String(b.label).toUpperCase(), x + 3, y + 5.5);
    doc.setFont(undefined, "bold"); doc.setFontSize(11);
    doc.setTextColor(...(b.color || PDF_C.ink));
    const valLines = doc.splitTextToSize(String(b.value), boxW - 6);
    doc.text(valLines[0], x + 3, y + 12.2);
    doc.setFont(undefined, "normal");
  });
  doc.setTextColor(...PDF_C.ink);
  return y + boxH + 9;
}

/** Tabla estándar del reporte (usa autoTable). Devuelve la Y donde terminó, lista para lo siguiente. */
function pdfTable(doc, y, head, body, opts = {}) {
  doc.autoTable({
    startY: y,
    head: [head],
    body,
    theme: "striped",
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2.4, valign: "top", textColor: PDF_C.ink, lineColor: PDF_C.line, lineWidth: 0.1 },
    headStyles: { fillColor: opts.headColor || PDF_C.steelDark, textColor: PDF_C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: PDF_C.rowStripe },
    columnStyles: opts.columnStyles || {},
    didParseCell: opts.didParseCell,
  });
  return doc.lastAutoTable.finalY + 8;
}

/** Descarga una foto (URL pública de Supabase Storage) y la convierte a data URL, para poder
 * insertarla en el PDF con doc.addImage — que solo acepta data URLs, no URLs remotas directas. */
async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo descargar la foto");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Reporte automático de una tarea/novedad terminada: descripción, fotos de antes y después,
 * quién la resolvió, y el tiempo total que tomó resolverla (de la asignación al cierre).
 * Las fotos se intentan insertar de verdad en el PDF; si alguna falla al descargar, se omite
 * sin romper el resto del reporte.
 */
export async function generateTaskReportPdf(task, assigneeName, signatureDataUrl, signerCargo) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Reporte de Novedad", [task.titulo, `Generado ${fmtDT(nowIso())}`]);

  const totalHoras = task.assignedAt && task.finishedAt ? hoursBetween(task.assignedAt, task.finishedAt) : null;
  y = pdfStatBoxes(doc, y, [
    { label: "Asignado a", value: assigneeName || "—" },
    { label: "Tiempo total", value: totalHoras != null ? fmtHours(totalHoras) : "—" },
    { label: "Prioridad", value: TASK_PRIORITIES.find(p => p.code === task.prioridad)?.label || task.prioridad },
    { label: "Estado", value: TASK_STATES.find(s => s.code === normalizeTaskState(task.estado))?.label || task.estado },
  ]);

  y = pdfSectionTitle(doc, y, "Descripción de la novedad");
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  const descLines = doc.splitTextToSize(task.descripcion || "Sin descripción adicional.", 180);
  doc.text(descLines, 14, y);
  y += descLines.length * 4.5 + 6;

  y = pdfSectionTitle(doc, y, "Cronología");
  y = pdfTable(doc, y, ["Evento", "Fecha y hora"], [
    ["Asignada", task.assignedAt ? fmtDT(task.assignedAt) : "—"],
    ["Iniciada", task.startedAt ? fmtDT(task.startedAt) : "—"],
    ["Finalizada", task.finishedAt ? fmtDT(task.finishedAt) : "—"],
  ]);

  const addPhotoGrid = async (title, urls) => {
    if (!urls || urls.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, title);
    const cellW = 42, cellH = 42, gap = 4, marginX = 14, cols = 4;
    let col = 0;
    for (const url of urls) {
      if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
      const x = marginX + col * (cellW + gap);
      try {
        const dataUrl = await urlToDataUrl(url);
        doc.addImage(dataUrl, "JPEG", x, y, cellW, cellH);
      } catch { /* si una foto puntual falla al descargar, se omite sin romper el resto */ }
      col++;
      if (col >= cols) { col = 0; y += cellH + gap; }
    }
    if (col > 0) y += cellH + gap;
    y += 4;
  };

  // Cuando hay fotos de antes Y de después, se ponen lado a lado en parejas (antes | después) en
  // vez de dos cuadrículas separadas — así se ve de un vistazo el efecto del trabajo, que es lo
  // que de verdad importa en un reporte de novedad.
  const addBeforeAfterPairs = async (before, after) => {
    if (y > pageH - 50) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, "Antes / Después");
    const cellW = 84, cellH = 60, gap = 6, marginX = 14;
    const pairCount = Math.max(before.length, after.length);
    doc.setFontSize(8); doc.setTextColor(...PDF_C.inkSoft);
    doc.text("Antes", marginX + cellW / 2, y, { align: "center" });
    doc.text("Después", marginX + cellW + gap + cellW / 2, y, { align: "center" });
    doc.setTextColor(...PDF_C.ink);
    y += 4;
    for (let i = 0; i < pairCount; i++) {
      if (y + cellH > pageH - 16) { doc.addPage(); y = 18; }
      for (const [url, x] of [[before[i], marginX], [after[i], marginX + cellW + gap]]) {
        if (!url) continue;
        try {
          const dataUrl = await urlToDataUrl(url);
          doc.addImage(dataUrl, "JPEG", x, y, cellW, cellH);
        } catch { /* se omite esa foto puntual si falla al descargar */ }
      }
      y += cellH + gap;
    }
    y += 2;
  };

  if (task.fotosAntes?.length > 0 && task.fotosDespues?.length > 0) {
    await addBeforeAfterPairs(task.fotosAntes, task.fotosDespues);
  } else {
    await addPhotoGrid("Fotos — antes", task.fotosAntes);
    await addPhotoGrid("Fotos — después", task.fotosDespues);
  }

  if (task.notaCierre) {
    if (y > pageH - 30) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, "Nota de cierre");
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    const noteLines = doc.splitTextToSize(task.notaCierre, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5;
  }
  if (task.testigoCierre) {
    doc.setFontSize(9); doc.setFont(undefined, "bold");
    doc.text(`Verificado por: ${task.testigoCierre}`, 14, y);
    doc.setFont(undefined, "normal");
    y += 6;
  }

  // Firma de quien cerró la tarea (la misma que ya se usa en entrega de turno) — si todavía no
  // ha guardado una en Mi Perfil, el reporte sale igual, solo que sin ese bloque al final.
  if (signatureDataUrl) {
    const signerLine = `${assigneeName || ""}${signerCargo ? ` — ${signerCargo}` : ""} — ${fmtDT(nowIso())}`;
    y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, signerLine);
  }

  pdfFooterAll(doc);
  return doc;
}

/**
 * Reporte "arma el tuyo": el usuario elige qué secciones incluir (en vez de los formatos fijos
 * de siempre) — útil para pedidos puntuales de gerencia que no necesitan todo el informe completo.
 */
export const CUSTOM_REPORT_SECTIONS = [
  { id: "activos", label: "Equipos fuera de servicio ahora" },
  { id: "resueltos", label: "Incidentes resueltos recientes" },
  { id: "mantenimiento", label: "Mantenimientos recientes (correctivos)" },
  { id: "rondas", label: "Rondas registradas (resumen)" },
  { id: "detalle", label: "Detalle completo por piso y equipo" },
];

export async function generateCustomReportPdf(selectedIds, { activeIssues, issueHistory, roundsIndex, latestValues, mttoLog, mttoEquipos }, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const sectionLabels = CUSTOM_REPORT_SECTIONS.filter(s => selectedIds.includes(s.id)).map(s => s.label);
  let y = pdfLetterhead(doc, "Reporte Personalizado", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`, `Incluye: ${sectionLabels.join(", ")}`]);

  const ensureSpace = (min) => { if (y > pageH - min) { doc.addPage(); y = 18; } };
  const equipoNombre = (id) => (mttoEquipos || []).find(e => e.id === id)?.nombre || "Equipo";

  if (selectedIds.includes("activos")) {
    const active = Object.values(activeIssues || {});
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, `Equipos fuera de servicio ahora (${active.length})`, { color: PDF_C.red });
    if (active.length === 0) { doc.setFontSize(9); doc.text("Ninguno. Todo en orden.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Piso", "#", "Equipo", "Reportado por", "Desde", "Observación"],
      active.map(iss => [iss.floorName, String(iss.code), iss.name, iss.openedBy, fmtDT(iss.openedAt), iss.observation || "—"]),
      { headColor: PDF_C.red, columnStyles: { 1: { cellWidth: 8 } } });
  }

  if (selectedIds.includes("resueltos")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Incidentes resueltos recientes");
    const list = (issueHistory || []).slice(0, 25);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Piso", "#", "Equipo", "Dañado", "Resuelto", "Duración", "Solución"],
      list.map(h => [h.floorName, String(h.code), h.name, fmtDT(h.openedAt), fmtDT(h.resolvedAt), h.duration, h.solution || "—"]),
      { columnStyles: { 1: { cellWidth: 8 } } });
  }

  if (selectedIds.includes("mantenimiento")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Mantenimientos recientes (correctivos)");
    const list = (mttoLog || []).filter(m => m.tipo === "correctivo").slice(0, 25);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Fecha", "Equipo", "Descripción", "Costo", "Por"],
      list.map(m => [fmtDT(m.fecha || m.createdAt), equipoNombre(m.equipoId), m.descripcion || "—", m.costo ? `$${m.costo}` : "—", m.createdBy || "—"]));
  }

  if (selectedIds.includes("rondas")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Rondas registradas (resumen)");
    const list = (roundsIndex || []).slice(0, 30);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Fecha", "Piso", "Turno", "Por", "Ítems", "Dañados"],
      list.map(r => [r.date, r.floorName, r.shift || "—", r.user, String(r.itemCount || 0), String(r.damagedCount || 0)]));
  }

  if (selectedIds.includes("detalle")) {
    doc.addPage(); y = 18;
    y = pdfSectionTitle(doc, y, "Detalle completo por piso y equipo");
    FLOORS.forEach(floor => {
      ensureSpace(45);
      y = pdfSectionTitle(doc, y, floor.name);
      const rows = floor.items.map(item => {
        const lv = latestValues[item.id];
        const dmg = activeIssues[item.id];
        let valueStr = "Sin datos registrados";
        if (lv) {
          const parts = [];
          if (lv.status) parts.push(lv.status);
          if (lv.value !== undefined && lv.value !== "") parts.push(`${lv.value}${item.u ? " " + item.u : ""}`);
          if (parts.length) valueStr = parts.join(" · ");
        }
        return [String(item.c), item.n, valueStr + (dmg ? "  [FUERA DE SERVICIO]" : ""), lv?.observation || dmg?.observation || "—"];
      });
      y = pdfTable(doc, y, ["#", "Equipo", "Última lectura", "Observación"], rows, { columnStyles: { 0: { cellWidth: 8 } } });
    });
  }

  pdfFooterAll(doc);
  return doc;
}

export async function sendCustomReportEmailAuto(to, selectedIds, data, generatedBy) {
  try {
    const doc = await generateCustomReportPdf(selectedIds, data, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to, subject: `Reporte personalizado — QuinTech (${todayStr()})`,
        text: "Se adjunta el reporte personalizado que armaste.", pdfBase64,
        filename: `reporte-personalizado-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const dataRes = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: dataRes?.message || "El servidor rechazó el envío." };
    return dataRes;
  } catch {
    return { ok: false, message: "No se pudo generar o enviar el reporte. Revisa la conexión e intenta de nuevo." };
  }
}

export async function generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Informe de Equipos", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);

  const active = Object.values(activeIssues);
  y = pdfStatBoxes(doc, y, [
    { label: "Fuera de servicio", value: String(active.length), color: active.length ? PDF_C.red : PDF_C.green },
    { label: "Incidentes resueltos (historial)", value: String(issueHistory.length) },
    { label: "Rondas registradas", value: String(roundsIndex.length) },
  ]);

  y = pdfSectionTitle(doc, y, `Equipos fuera de servicio actualmente (${active.length})`, { color: PDF_C.red });
  if (active.length === 0) {
    doc.setFontSize(9); doc.text("Ninguno. Todo en orden.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y,
      ["Piso", "#", "Equipo", "Reportado por", "Desde", "Fuera de servicio", "Observación"],
      active.map(iss => [iss.floorName, String(iss.code), iss.name, iss.openedBy, fmtDT(iss.openedAt), elapsed(iss.openedAt), iss.observation || "—"]),
      { headColor: PDF_C.red, columnStyles: { 1: { cellWidth: 8 }, 4: { cellWidth: 24 }, 5: { cellWidth: 20 } } });
  }

  if (y > pageH - 40) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Últimos incidentes resueltos");
  if (issueHistory.length === 0) {
    doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y,
      ["Piso", "#", "Equipo", "Dañado", "Resuelto", "Duración", "Por", "Solución"],
      issueHistory.slice(0, 25).map(h => [h.floorName, String(h.code), h.name, fmtDT(h.openedAt), fmtDT(h.resolvedAt), h.duration, h.resolvedBy, h.solution || "—"]),
      { columnStyles: { 1: { cellWidth: 8 }, 5: { cellWidth: 18 } } });
  }

  doc.addPage(); y = 18;
  y = pdfSectionTitle(doc, y, "Detalle completo por piso y equipo");
  doc.setFontSize(8); doc.setTextColor(...PDF_C.gray);
  doc.text("Muestra la última lectura registrada en cualquier ronda para cada equipo, aunque no se haya llenado en la más reciente.", 14, y);
  doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
  y += 7;

  FLOORS.forEach(floor => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, floor.name);
    const rows = floor.items.map(item => {
      const lv = latestValues[item.id];
      const dmg = activeIssues[item.id];
      let valueStr = "Sin datos registrados";
      if (lv) {
        const parts = [];
        if (lv.status) parts.push(lv.status);
        if (lv.value !== undefined && lv.value !== "") parts.push(`${lv.value}${item.u ? " " + item.u : ""}`);
        if (lv.ph) parts.push(`PH ${lv.ph}`);
        if (lv.cloro) parts.push(`Cloro ${lv.cloro}`);
        if (lv.operador) parts.push(`Operador ${lv.operador}`);
        if (parts.length) valueStr = parts.join(" · ");
      }
      const obs = lv?.observation || dmg?.observation || "—";
      const updated = lv?.updatedAt ? `${fmtDT(lv.updatedAt)} · ${lv.updatedBy}` : "—";
      return [String(item.c), item.n, valueStr + (dmg ? "  [FUERA DE SERVICIO]" : ""), obs, updated];
    });
    y = pdfTable(doc, y, ["#", "Equipo", "Última lectura", "Observación", "Actualizado"], rows,
      { columnStyles: { 0: { cellWidth: 8 } } });
  });

  pdfFooterAll(doc);
  return doc;
}


/**
 * Construye el texto de "Entrega de turno": el detalle de TODOS los pisos recorridos
 * en la ronda que se acaba de terminar, piso por piso y equipo por equipo, para que
 * el técnico del siguiente turno sepa exactamente cómo quedó todo.
 */
export function buildTourText(tour) {
  if (!tour) return "";
  const L = [];
  L.push("ENTREGA DE TURNO — QuinTech");
  L.push(`Turno ${tour.shift} · ${tour.date} · Recorrido realizado por ${tour.user}`);
  L.push(`Equipos revisados: ${tour.itemCount}${tour.damagedCount ? ` · Fuera de servicio: ${tour.damagedCount}` : " · Todo en orden"}`);
  if (tour.shiftSummary) {
    const s = tour.shiftSummary;
    L.push("");
    L.push("— Resumen del turno —");
    L.push(`Tareas cerradas por ${tour.user} en este turno: ${s.tasksClosedCount}`);
    if (s.tasksClosedTitles?.length) s.tasksClosedTitles.forEach(t => L.push(`  · ${t}`));
    L.push(`Tareas abiertas en total (todo el equipo): ${s.openTasksCount}`);
    L.push(`Daños/incidencias activas: ${s.activeIssuesCount}`);
  }
  L.push("");
  tour.floors.forEach(f => {
    L.push(`— ${f.floorName} —`);
    if (f.items.length === 0) L.push("(sin equipos registrados en este piso)");
    f.items.forEach(it => {
      L.push(`#${it.code} ${it.name}: ${it.valueStr}${it.damaged ? "  [FUERA DE SERVICIO]" : ""}`);
      if (it.observation) L.push(`   Obs: ${it.observation}`);
    });
    if (f.notes) L.push(`Notas del piso: ${f.notes}`);
    L.push("");
  });
  return L.join("\n");
}

/** Convierte el documento jsPDF en base64 puro (sin el prefijo data:), listo para mandar al backend. */
function pdfDocToBase64(doc) {
  return new Promise((resolve, reject) => {
    try {
      const blob = doc.output("blob");
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) { reject(e); }
  });
}

/** PDF de UNA entrega de turno (el recorrido que se acaba de completar), piso por piso. */
export async function generateTourPdf(tour, signatureDataUrl, signerCargo) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Entrega de Turno", [`Turno ${tour.shift}`, tour.date, `Recorrido de ${tour.user}`]);

  y = pdfStatBoxes(doc, y, [
    { label: "Equipos revisados", value: String(tour.itemCount) },
    { label: "Fuera de servicio", value: String(tour.damagedCount), color: tour.damagedCount ? PDF_C.red : PDF_C.green },
    ...(tour.shiftSummary ? [
      { label: "Tareas cerradas (turno)", value: String(tour.shiftSummary.tasksClosedCount) },
      { label: "Tareas abiertas (total)", value: String(tour.shiftSummary.openTasksCount) },
      { label: "Daños activos", value: String(tour.shiftSummary.activeIssuesCount), color: tour.shiftSummary.activeIssuesCount ? PDF_C.amber : PDF_C.green },
    ] : []),
  ]);

  tour.floors.forEach(f => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, f.floorName);
    if (f.items.length === 0) {
      doc.setFontSize(9); doc.text("Sin equipos registrados en este piso.", 14, y); y += 8;
    } else {
      y = pdfTable(doc, y, ["#", "Equipo", "Valor / Estado", "Observación"],
        f.items.map(it => [String(it.code), it.name, it.valueStr + (it.damaged ? "  [FUERA DE SERVICIO]" : ""), it.observation || "—"]),
        { columnStyles: { 0: { cellWidth: 8 } } });
    }
    if (f.notes) {
      doc.setFontSize(8.5); doc.setTextColor(...PDF_C.inkSoft);
      const wrapped = doc.splitTextToSize(`Notas del piso: ${f.notes}`, 182);
      wrapped.forEach(w => { doc.text(w, 14, y); y += 4.4; });
      doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
      y += 3;
    }
  });

  // El nombre + cargo (cuando se sabe cuál es) queda junto a la firma, para que el documento
  // deje más claro quién es la persona responsable, no solo su nombre suelto.
  const signerLine = `${tour.user}${signerCargo ? ` — ${signerCargo}` : ""} — ${fmtDT(nowIso())}`;
  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, signerLine);

  pdfFooterAll(doc);
  return doc;
}


/**
 * Envío REAL y automático del correo con el PDF adjunto: genera el PDF en el navegador,
 * lo manda como base64 al backend (/api/send-report), y el backend (con la clave secreta
 * de Resend, que nunca toca el navegador) dispara el correo. No requiere que nadie
 * confirme "Enviar" en ninguna app — sucede solo.
 */
export async function sendTourEmailAuto(to, tour, signatureDataUrl, signerCargo) {
  try {
    const doc = await generateTourPdf(tour, signatureDataUrl, signerCargo);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Entrega de turno ${tour.shift} - ${tour.date}`,
        text: buildTourText(tour),
        pdfBase64,
        filename: `entrega-turno-${String(tour.date).replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente (revisa la conexión). Puedes intentarlo de nuevo o usar el envío manual." };
  }
}

/**
 * Igual que sendTourEmailAuto, pero para el informe completo de los 12 pisos
 * (Reportes → PDF completo), también con el PDF adjunto de verdad vía el backend.
 */
export async function sendFullReportEmailAuto(to, latestValues, activeIssues, issueHistory, roundsIndex, generatedBy) {
  try {
    const doc = await generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Informe de equipos - QuinTech (${todayStr()})`,
        text: buildReportText(activeIssues, issueHistory, roundsIndex),
        pdfBase64,
        filename: `informe-equipos-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente (revisa la conexión). Puedes intentarlo de nuevo o usar el envío manual." };
  }
}

export function buildWhatsAppLink(phone, text) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  const short = text.length > 1500 ? text.slice(0, 1500) + "\n\n(mensaje truncado, descarga el informe completo en PDF desde la app)" : text;
  return `https://wa.me/${digits}?text=${encodeURIComponent(short)}`;
}

/* ============================================================
   RESUMEN SEMANAL CON IA
   ============================================================ */
/** Junta lo que pasó en los últimos `days` días (por defecto 7): daños resueltos, daños que
 *  siguen pendientes, y mantenimientos correctivos — en un formato liviano, listo para mandarle
 *  a la IA a que lo redacte en español natural. */
export function buildWeeklySummaryInput(issueHistory, activeIssues, mttoLog, mttoEquipos, days = 7) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const resolved = (issueHistory || [])
    .filter(h => new Date(h.resolvedAt) >= since)
    .map(h => ({ equipo: h.name, piso: h.floorName, observacion: h.observation, solucion: h.solution, diasAbierto: Math.round(elapsedHours(h.openedAt, h.resolvedAt) / 24) }));
  const pending = Object.values(activeIssues || {})
    .map(iss => ({ equipo: iss.name, piso: iss.floorName, observacion: iss.observation, diasAbierto: Math.round(elapsedHours(iss.openedAt, new Date().toISOString()) / 24) }));
  const equipoNombre = (id) => (mttoEquipos || []).find(e => e.id === id)?.nombre || "Equipo";
  const correctivos = (mttoLog || [])
    .filter(m => m.tipo === "correctivo" && new Date(m.fecha) >= since)
    .map(m => ({ equipo: equipoNombre(m.equipoId), descripcion: m.descripcion, costo: m.costo || 0 }));
  return { resolved, pending, correctivos };
}
function elapsedHours(fromIso, toIso) {
  return Math.max(0, (new Date(toIso) - new Date(fromIso)) / 36e5);
}

export async function requestWeeklySummary({ weekLabel, resolved, pending, correctivos }) {
  const resp = await fetch("/api/generate-weekly-summary", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ weekLabel, resolved, pending, correctivos }),
  });
  return resp.json();
}

/** PDF de una sola página con el resumen semanal ya redactado — es lo que se adjunta al correo. */
async function generateWeeklySummaryPdf(summaryText, weekLabel, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = pdfLetterhead(doc, "Resumen Semanal", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  y += 4;
  doc.setFontSize(10.5); doc.setTextColor(...PDF_C.ink);
  const lines = doc.splitTextToSize(summaryText, 182);
  doc.text(lines, 14, y);
  pdfFooterAll(doc);
  return doc;
}

export async function sendWeeklySummaryEmailAuto(to, summaryText, weekLabel, generatedBy) {
  try {
    const doc = await generateWeeklySummaryPdf(summaryText, weekLabel, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to, subject: `Resumen semanal — QuinTech (${weekLabel})`,
        text: summaryText, pdfBase64, filename: `resumen-semanal-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch {
    return { ok: false, message: "No se pudo generar o enviar el resumen. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   VISTA: MI PERFIL (firma guardada, se usa sola en cada entrega de turno)
   ============================================================ */
/**
 * Muestra las novedades de la app — para que el equipo sepa qué es nuevo sin que tengas que
 * avisarles uno por uno. Cualquiera puede verlas; solo el admin puede agregar una nueva.
 */
/** Historial de cambios de empleados e inventario — quién cambió qué, antes y después. */
/**
 * Compara los pisos que se fueron guardando (roundsIndex, uno por piso) contra los recorridos
 * que sí llegaron a completarse (tourHistory, uno por recorrido entero) — para que el admin vea
 * de un vistazo si algún turno se quedó a medias sin terminar el recorrido completo.
 */
export function computeRoundCompletionSummary(roundsIndex, tourHistory, totalFloors) {
  const groups = {};
  (roundsIndex || []).forEach(r => {
    const key = `${r.date}::${r.shift}::${r.user}`;
    if (!groups[key]) groups[key] = { date: r.date, shift: r.shift, user: r.user, floorIds: new Set(), lastSavedAt: r.savedAt };
    groups[key].floorIds.add(r.floorId);
    if (r.savedAt > groups[key].lastSavedAt) groups[key].lastSavedAt = r.savedAt;
  });
  const completedKeys = new Set((tourHistory || []).map(t => `${t.date}::${t.shift}::${t.user}`));
  return Object.values(groups)
    .map(g => ({
      date: g.date, shift: g.shift, user: g.user, lastSavedAt: g.lastSavedAt,
      floorsDone: g.floorIds.size, totalFloors,
      completed: completedKeys.has(`${g.date}::${g.shift}::${g.user}`),
    }))
    .sort((a, b) => (b.date + b.lastSavedAt).localeCompare(a.date + a.lastSavedAt));
}

export const AUDIT_ACTION_LABELS = { creacion: "Creación", edicion: "Edición", eliminacion: "Eliminación" };
export const AUDIT_ACTION_COLORS = { creacion: { bg: "#dff5e3", fg: "#1c7a34" }, edicion: { bg: "#e3f0ff", fg: "#1a4f8a" }, eliminacion: { bg: "#ffe3ea", fg: "#a31245" } };
export const AUDIT_KIND_LABELS = { empleado: "Empleado", inventario: "Inventario", tarea: "Tarea", combustible: "Combustible", habitacion: "Habitación" };
export const AUDIT_KIND_COLORS = { empleado: { bg: "#e0ecff", fg: "#1e4fa3" }, inventario: { bg: "#dff5e3", fg: "#1c7a34" }, tarea: { bg: "#fff3d6", fg: "#8a5a00" }, combustible: { bg: "#f3e0ff", fg: "#6b1ea3" }, habitacion: { bg: "#ffe3ea", fg: "#a31245" } };

/* ============================================================
   VISTA: ANÁLISIS DE FALLAS (solo administradores)
   Seguimiento de cuánto tiempo y con qué frecuencia cada equipo
   ha estado fuera de servicio, con gráficas por fecha.
   ============================================================ */
export function hoursBetween(a, b) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3600000);
}
export function fmtHours(h) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} días`;
}
export function computeEquipmentStats(issueHistory, activeIssues, sinceDate) {
  const map = {};
  const ensure = (key, base) => {
    if (!map[key]) {
      map[key] = {
        equipmentId: key, code: base.code, name: base.name, floorName: base.floorName,
        incidents: [], totalHours: 0, currentlyDown: false, downSince: null,
      };
    }
  };
  issueHistory.forEach(h => {
    if (sinceDate && new Date(h.openedAt) < sinceDate) return;
    ensure(h.equipmentId, h);
    const hrs = hoursBetween(h.openedAt, h.resolvedAt);
    map[h.equipmentId].totalHours += hrs;
    map[h.equipmentId].incidents.push({ from: h.openedAt, to: h.resolvedAt, hours: hrs, solution: h.solution, resolvedBy: h.resolvedBy, ongoing: false });
  });
  Object.values(activeIssues).forEach(a => {
    if (sinceDate && new Date(a.openedAt) < sinceDate) return;
    ensure(a.equipmentId, a);
    const hrs = hoursBetween(a.openedAt, nowIso());
    map[a.equipmentId].totalHours += hrs;
    map[a.equipmentId].currentlyDown = true;
    map[a.equipmentId].downSince = a.openedAt;
    map[a.equipmentId].incidents.push({ from: a.openedAt, to: null, hours: hrs, solution: null, resolvedBy: null, ongoing: true });
  });
  Object.values(map).forEach(eq => eq.incidents.sort((a, b) => new Date(b.from) - new Date(a.from)));
  return Object.values(map).sort((a, b) => b.totalHours - a.totalHours);
}

/** PDF del reporte de Análisis de fallas: resumen + detalle de incidentes por equipo. */
export async function generateAnalyticsPdf(stats, rangeLabel, summary, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Análisis de Fallas", [`Período: ${rangeLabel}`, `Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);

  const longest = stats.filter(e => e.currentlyDown).sort((a, b) => b.totalHours - a.totalHours)[0];
  y = pdfStatBoxes(doc, y, [
    { label: "Fuera de servicio ahora", value: String(summary.totalCurrentlyDown), color: summary.totalCurrentlyDown ? PDF_C.red : PDF_C.green },
    { label: "Incidentes en el período", value: String(summary.totalIncidents) },
    { label: "Falla activa más larga", value: longest ? `${longest.name} · ${fmtHours(longest.totalHours)}` : "Ninguna" },
  ]);

  if (stats.length === 0) {
    doc.setFontSize(9); doc.text("No hay incidentes registrados en este período.", 14, y);
    pdfFooterAll(doc);
    return doc;
  }

  y = pdfSectionTitle(doc, y, "Resumen por equipo (ordenado por tiempo fuera de servicio)");
  y = pdfTable(doc, y, ["Equipo", "Piso", "Incidentes", "Horas acumuladas", "Estado"],
    stats.map(eq => [eq.name, eq.floorName, String(eq.incidents.length), fmtHours(eq.totalHours), eq.currentlyDown ? "Fuera de servicio" : "Resuelto"]),
    { columnStyles: { 2: { cellWidth: 20 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } } });

  if (y > pageH - 40) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Detalle de incidentes por equipo");
  stats.forEach(eq => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    doc.setFont(undefined, "bold"); doc.setFontSize(9.5);
    doc.text(`${eq.name} (${eq.floorName})`, 14, y);
    doc.setFont(undefined, "normal"); doc.setFontSize(9);
    y += 5;
    y = pdfTable(doc, y, ["Desde", "Hasta", "Duración", "Solución", "Resuelto por"],
      eq.incidents.map(inc => [fmtDT(inc.from), inc.ongoing ? "Sigue fuera de servicio" : fmtDT(inc.to), fmtHours(inc.hours), inc.solution || "—", inc.resolvedBy || "—"]),
      { columnStyles: { 2: { cellWidth: 22 } } });
  });

  pdfFooterAll(doc);
  return doc;
}

export async function sendAnalyticsEmailAuto(to, stats, rangeLabel, summary, generatedBy) {
  try {
    const doc = await generateAnalyticsPdf(stats, rangeLabel, summary, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const textLines = [
      "ANÁLISIS DE FALLAS — PISOS MECÁNICOS",
      `Período: ${rangeLabel}`,
      `Fuera de servicio ahora: ${summary.totalCurrentlyDown} · Incidentes en el período: ${summary.totalIncidents}`,
      "",
      "Ver el detalle completo por equipo en el PDF adjunto.",
    ];
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Análisis de fallas - QuinTech (${todayStr()})`,
        text: textLines.join("\n"),
        pdfBase64,
        filename: `analisis-fallas-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   PDF Y CORREO: INVENTARIO (lista de compras)
   ============================================================ */
/** Arma un PDF con TODOS los códigos QR de todas las estanterías, en cuadrícula, listos para imprimir y recortar. */
export async function generateAllShelvesQrPdf(bodegas, shelves) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Códigos QR — Estanterías de Inventario", [`${shelves.length} estanterías`, `Generado ${fmtDT(nowIso())}`]);

  const cols = 4, cellW = 46, cellH = 58, marginX = 14;
  const pageH = doc.internal.pageSize.getHeight();
  let col = 0;

  const bodegaName = (id) => bodegas.find(b => b.id === id)?.name || "—";

  for (const shelf of shelves) {
    if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
    const x = marginX + col * cellW;
    try {
      const dataUrl = await QRCode.toDataURL(shelfUrl(shelf.id), { width: 200, margin: 0 });
      doc.addImage(dataUrl, "PNG", x, y, 38, 38);
    } catch { /* si falla un QR puntual, sigue con los demás */ }
    doc.setFontSize(7.5); doc.setFont(undefined, "bold");
    const codeLines = doc.splitTextToSize(shelf.code, cellW - 2);
    doc.text(codeLines, x, y + 42);
    doc.setFont(undefined, "normal"); doc.setFontSize(6.5);
    const bLines = doc.splitTextToSize(bodegaName(shelf.bodegaId), cellW - 2);
    doc.text(bLines, x, y + 42 + codeLines.length * 3.2);

    col++;
    if (col >= cols) { col = 0; y += cellH; }
  }

  pdfFooterAll(doc);
  return doc;
}


/** Igual que generateAllShelvesQrPdf, pero para los equipos del módulo de Mantenimiento. */
export async function generateAllEquiposQrPdf(equipos) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Códigos QR — Equipos de Mantenimiento", [`${equipos.length} equipos`, `Generado ${fmtDT(nowIso())}`]);

  const cols = 4, cellW = 46, cellH = 58, marginX = 14;
  const pageH = doc.internal.pageSize.getHeight();
  let col = 0;

  for (const eq of equipos) {
    if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
    const x = marginX + col * cellW;
    try {
      const dataUrl = await QRCode.toDataURL(equipoUrl(eq.id), { width: 200, margin: 0 });
      doc.addImage(dataUrl, "PNG", x, y, 38, 38);
    } catch { /* si falla un QR puntual, sigue con los demás */ }
    doc.setFontSize(7); doc.setFont(undefined, "bold");
    const nameLines = doc.splitTextToSize(eq.nombre, cellW - 2).slice(0, 2);
    doc.text(nameLines, x, y + 42);
    doc.setFont(undefined, "normal"); doc.setFontSize(6.5);
    const sLines = doc.splitTextToSize(eq.sistema, cellW - 2);
    doc.text(sLines, x, y + 42 + nameLines.length * 3.1);

    col++;
    if (col >= cols) { col = 0; y += cellH; }
  }

  pdfFooterAll(doc);
  return doc;
}
/** PDF de una sola página con el resumen ejecutivo, listo para reuniones con la gerencia. */
/** Hoja de vida de un equipo, en PDF — el resumen estructurado + el historial completo, para
 *  tener siempre a mano una referencia del equipo aunque haya pasado mucho tiempo. */
export async function generateHojaVidaPdf(equipo, records, stats, partsChanged, fechaAlta) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Hoja de Vida del Equipo", [equipo.nombre, equipo.sistema]);

  y = pdfStatBoxes(doc, y, [
    { label: "Primer registro", value: fechaAlta ? fmtDT(fechaAlta).split(",")[0] : "—" },
    { label: "Mantenimientos", value: `${stats.total} (${stats.correctivos} correctivos)` },
    { label: "Costo acumulado", value: stats.costoTotal ? `$${stats.costoTotal.toLocaleString("es-CO")}` : "—", color: PDF_C.ink },
    { label: "Estado actual", value: stats.outOfService ? "Fuera de servicio" : "Funcionando", color: stats.outOfService ? PDF_C.red : PDF_C.green },
  ]);

  if (partsChanged.length > 0) {
    y = pdfSectionTitle(doc, y, "Piezas cambiadas");
    const uniqueParts = [...new Set(partsChanged.map(p => p.parte))].map(parte => partsChanged.find(p => p.parte === parte));
    y = pdfTable(doc, y, ["Pieza", "Última vez", "Descripción"],
      uniqueParts.map(p => [p.parte, fmtDT(p.fecha).split(",")[0], p.descripcion || "—"]));
  }

  y = pdfSectionTitle(doc, y, "Historial completo de mantenimientos");
  if (records.length === 0) {
    doc.setFontSize(9); doc.text("Sin mantenimientos registrados.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y, ["Fecha", "Tipo", "Descripción", "Costo", "Técnico"],
      records.map(r => [
        fmtDT(r.fecha).split(",")[0],
        MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo,
        r.descripcion || "—",
        r.costo ? `$${Number(r.costo).toLocaleString("es-CO")}` : "—",
        r.tecnico || "—",
      ]));
  }

  pdfFooterAll(doc);
  return doc;
}

export async function generateExecutivePdf(uptime, compliance, cost, generatedBy, compliancePrev, costPrev) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Panel Ejecutivo — Resumen del Mes", [fmtDT(nowIso()), `Generado por ${generatedBy || "—"}`]);

  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;
  const costDelta = costPrev ? cost.total - costPrev.total : null;
  y = pdfStatBoxes(doc, y, [
    { label: "Disponibilidad promedio", value: `${avgUptime}%`, color: avgUptime >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Cumplimiento rondas", value: `${compliance.ronda.pct}%${compliancePrev ? ` (antes ${compliancePrev.ronda.pct}%)` : ""}`, color: compliance.ronda.pct >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Costo mantenimiento", value: cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—", color: PDF_C.steelDark },
  ]);
  if (costDelta != null) {
    doc.setFontSize(8.5);
    doc.setTextColor(...(costDelta > 0 ? PDF_C.red : PDF_C.green));
    doc.text(`${costDelta > 0 ? "▲" : "▼"} ${Math.abs(costDelta).toLocaleString("es-CO")} vs. el mes pasado ($${(costPrev.total || 0).toLocaleString("es-CO")})`, 15, y);
    y += 6;
  }

  y = pdfSectionTitle(doc, y, "Disponibilidad de equipos por sistema");
  y = pdfTable(doc, y, ["Sistema", "Equipos", "Fuera de servicio", "Disponibilidad"],
    uptime.slice(0, 12).map(u => [u.sistema, String(u.total), String(u.fuera), `${u.pct}%`]));

  y = pdfSectionTitle(doc, y, "Cumplimiento de rondas este mes (vs. mes pasado)");
  y = pdfTable(doc, y, ["Tipo de ronda", "Hechas", "Esperadas", "Cumplimiento", "Mes pasado"], [
    ["Ronda de revisión", String(compliance.ronda.actual), String(compliance.ronda.expected), `${compliance.ronda.pct}%`, compliancePrev ? `${compliancePrev.ronda.pct}%` : "—"],
    ["Cuartos Fríos", String(compliance.cuartosFrios.actual), String(compliance.cuartosFrios.expected), `${compliance.cuartosFrios.pct}%`, compliancePrev ? `${compliancePrev.cuartosFrios.pct}%` : "—"],
    ["Lecturas de Medidores", String(compliance.medidores.actual), String(compliance.medidores.expected), `${compliance.medidores.pct}%`, compliancePrev ? `${compliancePrev.medidores.pct}%` : "—"],
  ]);

  if (cost.bySistema.length > 0) {
    y = pdfSectionTitle(doc, y, "Costo de mantenimiento por sistema (este mes)");
    pdfTable(doc, y, ["Sistema", "Costo acumulado"], cost.bySistema.slice(0, 10).map(([s, c]) => [s, `$${c.toLocaleString("es-CO")}`]));
  }

  pdfFooterAll(doc);
  return doc;
}

export async function generateStockAlertsPdf(low, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Lista de Compras — Inventario", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);
  y = pdfStatBoxes(doc, y, [{ label: "Repuestos por reponer", value: String(low.length), color: low.length ? PDF_C.red : PDF_C.green }]);
  y = pdfSectionTitle(doc, y, "Repuestos en o por debajo de su cantidad mínima", { color: PDF_C.red });
  if (low.length === 0) {
    doc.setFontSize(9); doc.text("No hay repuestos bajo el mínimo por ahora.", 14, y);
  } else {
    pdfTable(doc, y, ["Repuesto", "Bodega", "Estantería", "Actual", "Mínimo", "Unidad"],
      low.map(it => [it.name + (it.sku ? ` (${it.sku})` : ""), it.bodegaName, it.shelfCode, String(it.quantity), String(it.minThreshold), it.unit]),
      { headColor: PDF_C.red });
  }
  pdfFooterAll(doc);
  return doc;
}

export async function sendStockAlertsEmailAuto(to, low, generatedBy) {
  try {
    const doc = await generateStockAlertsPdf(low, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lista de compras - Inventario (${todayStr()})`,
        text: `Hay ${low.length} repuesto(s) en o por debajo de su cantidad mínima. Ver el detalle en el PDF adjunto.`,
        pdfBase64,
        filename: `lista-de-compras-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   PDF Y CORREO: HORARIO MENSUAL
   ============================================================ */
export function fmtEntryShort(entry) {
  if (!entry) return "";
  if (entry.code) return entry.code;
  if (entry.entrada == null) return "";
  return `${entry.entrada}${entry.salida != null ? `-${entry.salida}` : ""}`;
}

export async function generateSchedulePdf(monthLabel, employees, daysIso, entriesByEmployee, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });

  // Un mes completo (28-31 columnas de día) no cabe en una sola página ancha — por eso antes se
  // veía "cortado" a partir del día 15 o 16 (esas columnas quedaban dibujadas fuera del borde de
  // la hoja). La solución: partir el mes en dos quincenas, cada una en su propia tabla/página,
  // igual que ya venías acostumbrado a verlo en Excel.
  const midPoint = Math.ceil(daysIso.length / 2);
  const halves = [daysIso.slice(0, midPoint), daysIso.slice(midPoint)].filter(h => h.length > 0);

  const dayHeadLabel = (d) => {
    const dd = new Date(d + "T00:00:00");
    return `${String(dd.getDate()).padStart(2, "0")}${isSundayOrHoliday(d) ? "*" : ""}`;
  };
  const cargoColor = (cargo) => CARGO_PDF_COLORS[cargo] || PDF_C.gray;

  let y = pdfLetterhead(doc, "Horario Mensual", [monthLabel, `Generado por ${generatedBy || "—"}`]);

  halves.forEach((half, hi) => {
    if (hi > 0) {
      doc.addPage();
      const d0 = new Date(half[0] + "T00:00:00"), d1 = new Date(half[half.length - 1] + "T00:00:00");
      y = pdfLetterhead(doc, "Horario Mensual (continuación)", [monthLabel, `Del ${d0.getDate()} al ${d1.getDate()}`]);
    } else {
      const d0 = new Date(half[0] + "T00:00:00"), d1 = new Date(half[half.length - 1] + "T00:00:00");
      doc.setFontSize(8.5); doc.setTextColor(...PDF_C.gray);
      doc.text(`Primera quincena: del ${d0.getDate()} al ${d1.getDate()}`, 14, y); y += 5;
      doc.setTextColor(...PDF_C.ink);
    }

    const weeks = weeksInRange(half);
    const head = ["Empleado", ...half.map(dayHeadLabel), ...weeks.map((w, i) => `Sem${i + 1}`), "Total quinc."];

    const body = employees.map(emp => {
      const entries = entriesByEmployee[emp.id] || {};
      const weekTotals = weeks.map(w => weekTotalHours(w, entries));
      const halfTotal = weekTotals.reduce((a, b) => a + b, 0);
      const nameCell = emp.badge ? `${emp.name} (${emp.badge})` : emp.name;
      return [nameCell, ...half.map(d => fmtEntryShort(entries[d])), ...weekTotals.map(t => t || ""), halfTotal || ""];
    });

    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 40 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 0) {
          const emp = employees[data.row.index];
          if (emp?.cargo) data.cell.styles.textColor = hexToRgb(cargoColor(emp.cargo));
          return;
        }
        const raw = String(data.cell.raw || "");
        const colors = getSpecialCodeColors()[raw];
        if (colors) data.cell.styles.fillColor = hexToRgb(colors.bg);
      },
    });
  });

  // Resumen final: el total del mes completo por persona, en un solo lugar fácil de mirar.
  if (doc.lastAutoTable.finalY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 18; }
  else y = doc.lastAutoTable.finalY + 8;
  y = pdfSectionTitle(doc, y, "Resumen — total de horas del mes completo");
  const summaryBody = employees.map(emp => {
    const entries = entriesByEmployee[emp.id] || {};
    const monthTotal = weeksInRange(daysIso).reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
    return [emp.name, emp.cargo || "—", emp.badge || "—", `${monthTotal}h`];
  });
  pdfTable(doc, y, ["Empleado", "Cargo", "Nota", "Total del mes"], summaryBody, {
    columnStyles: { 0: { cellWidth: 55 }, 3: { cellWidth: 30 } },
  });

  doc.setFontSize(7.5); doc.setTextColor(...PDF_C.gray);
  const finalY = doc.lastAutoTable.finalY + 6;
  doc.text(`* Domingo o festivo. Las celdas muestran hora de entrada-salida (ej. 8.5-16.5). Objetivo semanal: ${WEEKLY_HOURS_TARGET}h. VAC = vacaciones · LIBRE = descanso · INC = incapacidad · ALT = alterno/cambio · LIC_PAT = licencia de paternidad · COMP = compensatorio (día ganado por horas de reducción).`, 14, finalY);
  doc.setTextColor(...PDF_C.ink);

  pdfFooterAll(doc);
  return doc;
}

export async function sendScheduleEmailAuto(to, monthLabel, employees, daysIso, entriesByEmployee, generatedBy) {
  try {
    const doc = await generateSchedulePdf(monthLabel, employees, daysIso, entriesByEmployee, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Horario Mensual — ${monthLabel}`,
        text: `Horario mensual del personal — ${monthLabel}. Ver el detalle en el PDF adjunto.`,
        pdfBase64,
        filename: `horario-${monthLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}


/* ============================================================
   PDF Y CORREO: CUARTOS FRÍOS
   ============================================================ */
async function generateColdRoomsPdf(record, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Cuartos Fríos y Máquinas de Hielo", [`Turno ${record.shift}`, record.date, `Realizado por ${record.user}`]);
  y = pdfStatBoxes(doc, y, [
    { label: "Puntos revisados", value: String(record.itemCount) },
    { label: "Fuera de rango / servicio", value: String(record.damagedCount), color: record.damagedCount ? PDF_C.red : PDF_C.green },
  ]);

  const sections = [
    { title: `Cuartos fríos (${COLD_ROOMS.length})`, items: record.items.filter(it => it.section === "cuartos") },
    { title: `Máquinas de hielo A&B (${ICE_MACHINES_AB.length})`, items: record.items.filter(it => it.section === "hielo-ab") },
    { title: `Máquinas de hielo — Linos/Habitaciones (${ICE_MACHINES_LINOS.length})`, items: record.items.filter(it => it.section === "hielo-linos") },
  ];
  sections.forEach(sec => {
    if (sec.items.length === 0) return;
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, sec.title);
    const head = sec.title.startsWith("Cuartos") ? ["#", "Equipo", "Rango objetivo", "Lectura", "Observación"] : ["#", "Equipo", "Estado", "Observación"];
    const rows = sec.items.map(it => sec.title.startsWith("Cuartos")
      ? [it.code, it.name, it.hint || "—", it.valueStr + (it.damaged ? "  [FUERA DE RANGO]" : ""), it.observation || "—"]
      : [it.code || "—", it.name, it.valueStr + (it.damaged ? "  [FUERA DE SERVICIO]" : ""), it.observation || "—"]);
    y = pdfTable(doc, y, head, rows, { columnStyles: { 0: { cellWidth: 12 } } });
  });

  if (record.notes) {
    if (y > pageH - 30) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, "Observaciones generales");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(record.notes, 182);
    wrapped.forEach(w => { doc.text(w, 14, y); y += 4.6; });
    y += 4;
  }
  if (record.supervisor || record.ingeniero) {
    doc.setFontSize(8.5); doc.setTextColor(...PDF_C.gray);
    doc.text(`Supervisor: ${record.supervisor || "—"}     Ingeniero: ${record.ingeniero || "—"}`, 14, y);
    doc.setTextColor(...PDF_C.ink);
    y += 6;
  }
  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${record.user} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

async function sendColdRoomsEmailAuto(to, record, signatureDataUrl) {
  try {
    const doc = await generateColdRoomsPdf(record, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Cuartos Fríos - ${record.date} (Turno ${record.shift})`,
        text: `Ronda de Cuartos Fríos y Máquinas de Hielo — ${record.date}, turno ${record.shift}, realizada por ${record.user}. ${record.itemCount} puntos revisados, ${record.damagedCount} fuera de rango/servicio. Ver el detalle completo en el PDF adjunto.`,
        pdfBase64,
        filename: `cuartos-frios-${record.date.replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/** true si la fecha indicada es domingo (el último día de la semana lunes-domingo que usa la app). */
function isSundayOf(dateIso) { return new Date(dateIso).getDay() === 0; }

/** Arma la cuadrícula semanal de Cuartos Fríos y Máquinas de Hielo, igual que la de medidores. */
export function buildColdRoomsWeekGrid(coldHistory, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const sections = [
    { title: `Cuartos fríos (${COLD_ROOMS.length})`, items: COLD_ROOMS },
    { title: `Máquinas de hielo A&B (${ICE_MACHINES_AB.length})`, items: ICE_MACHINES_AB },
    { title: `Máquinas de hielo — Linos/Habitaciones (${ICE_MACHINES_LINOS.length})`, items: ICE_MACHINES_LINOS },
  ];
  const rows = [];
  sections.forEach(sec => {
    sec.items.forEach(item => {
      const hist = coldHistory[item.id] || [];
      const cellFor = (entry) => {
        if (!entry) return null;
        if (item.k === "status") return entry.status || null;
        if (entry.value === undefined || entry.value === "") return null;
        return entry.value;
      };
      const valueOnDay = (day) => {
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
        let found = null;
        hist.forEach(h => { const hd = new Date(h.at); if (hd >= dayStart && hd <= dayEnd) found = h; });
        return found ? cellFor(found) : null;
      };
      rows.push({ groupTitle: sec.title, item, label: `${item.n}${item.c ? ` (#${item.c})` : ""}`, days: days.map(d => valueOnDay(d)) });
    });
  });
  return { days, rows };
}

export async function generateColdRoomsWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Cuartos Fríos y Máquinas de Hielo — Semana", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  const head = ["Equipo", ...grid.days.map(d => fmtDayShort(d))];

  let currentGroup = null;
  let groupRows = [];
  const flushGroup = () => {
    if (!currentGroup || groupRows.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, currentGroup);
    const body = groupRows.map(r => [r.label, ...r.days.map(v => v ?? "—")]);
    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 80 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = data.column.index;
        if (col < 1) return;
        const row = groupRows[data.row.index];
        const val = row?.days?.[col - 1];
        if (row?.item?.k !== "status" && isColdRoomOutOfRange(row.item, val)) {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        } else if (row?.item?.k === "status" && val === "Fuera de servicio") {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  };
  grid.rows.forEach(row => {
    if (row.groupTitle !== currentGroup) { flushGroup(); currentGroup = row.groupTitle; groupRows = []; }
    groupRows.push(row);
  });
  flushGroup();

  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${generatedBy || "—"} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

export async function sendColdRoomsWeekEmailAuto(to, grid, weekLabel, generatedBy, signatureDataUrl) {
  try {
    const doc = await generateColdRoomsWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Cuartos Fríos — Semana ${weekLabel}`,
        text: `Reporte semanal de Cuartos Fríos y Máquinas de Hielo: ${weekLabel}. Ver el detalle día por día en el PDF adjunto.`,
        pdfBase64,
        filename: `cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}


/** Arma la cuadrícula semanal: para cada medidor (y cada sub-lectura si tiene varias),
 *  busca en el historial la última lectura de CADA día de la semana, más la última
 *  lectura anterior al inicio de la semana (para poder comparar y seguir la secuencia). */
export function buildMeterWeekGrid(meterHistory, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const beforeCutoff = new Date(weekStart.getTime() - 1);

  const rows = [];
  METER_GROUPS.forEach(group => {
    group.meters.forEach(meter => {
      const subs = meter.subs || [null];
      const hist = meterHistory[meter.id] || [];
      subs.forEach(sub => {
        const valueOnOrBefore = (limit) => {
          let best = null;
          hist.forEach(h => {
            const hd = new Date(h.at);
            const v = sub ? h[sub] : h.value;
            if (hd <= limit && v !== undefined && v !== "" && (!best || hd > best.date)) best = { date: hd, value: v };
          });
          return best ? best.value : null;
        };
        const valueOnDay = (day) => {
          const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
          let found = null;
          hist.forEach(h => {
            const hd = new Date(h.at);
            const v = sub ? h[sub] : h.value;
            if (hd >= dayStart && hd <= dayEnd && v !== undefined && v !== "") found = v;
          });
          return found;
        };
        rows.push({
          groupTitle: group.title,
          label: sub ? `${meter.n} — ${sub}` : meter.n,
          unit: meter.u,
          before: valueOnOrBefore(beforeCutoff),
          days: days.map(d => valueOnDay(d)),
        });
      });
    });
  });
  // Calcula el consumo de cada día (valor de ese día menos el último valor disponible antes de ese día),
  // para poder resaltar en rojo los días donde el consumo salió negativo (probable error de lectura).
  rows.forEach(row => {
    const all = [row.before, ...row.days];
    row.daysConsumo = row.days.map((v, i) => {
      if (v === null || v === undefined) return null;
      const prevVal = all[i]; // el valor justo antes de este día en la secuencia (before o el día anterior)
      if (prevVal === null || prevVal === undefined) return null;
      return Number(v) - Number(prevVal);
    });
  });
  return { days, rows };
}

export async function generateMetersWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Lecturas de Medidores — Semana", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  const head = ["Medidor", "Antes", ...grid.days.map(d => fmtDayShort(d))];

  let currentGroup = null;
  let groupRows = [];
  const flushGroup = () => {
    if (!currentGroup || groupRows.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, currentGroup);
    const body = groupRows.map(r => [r.label + (r.unit ? ` (${r.unit})` : ""), r.before ?? "—", ...r.days.map(v => v ?? "—")]);
    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 70 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = data.column.index;
        if (col < 2) return; // "Medidor" y "Antes" no se resaltan
        const row = groupRows[data.row.index];
        if (row?.daysConsumo?.[col - 2] < 0) {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  };

  grid.rows.forEach(row => {
    if (row.groupTitle !== currentGroup) {
      flushGroup();
      currentGroup = row.groupTitle;
      groupRows = [];
    }
    groupRows.push(row);
  });
  flushGroup();

  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${generatedBy || "—"} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

async function sendMetersWeekEmailAuto(to, grid, weekLabel, generatedBy, signatureDataUrl) {
  try {
    const doc = await generateMetersWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lecturas de Medidores — ${weekLabel}`,
        text: `Lecturas de medidores de la semana: ${weekLabel}. Ver el detalle completo (todos los medidores, día por día) en el PDF adjunto.`,
        pdfBase64,
        filename: `lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/** Convierte un ArrayBuffer/Uint8Array en base64 puro, para mandarlo al backend de correo. */
export function bufferToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Arma el archivo Excel del historial semanal de medidores (una hoja por grupo), listo para tomar datos. */
export function buildMetersWeekWorkbook(grid, weekLabel) {
  const wb = XLSX.utils.book_new();
  const groups = [...new Set(grid.rows.map(r => r.groupTitle))];
  groups.forEach(groupTitle => {
    const rows = grid.rows.filter(r => r.groupTitle === groupTitle);
    const header = ["Medidor", "Unidad", "Antes", ...grid.days.map(d => fmtDayShort(d))];
    const data = rows.map(r => [r.label, r.unit || "", r.before ?? "", ...r.days.map(v => v ?? "")]);
    const ws = XLSX.utils.aoa_to_sheet([[weekLabel], header, ...data]);
    ws["!cols"] = [{ wch: 42 }, { wch: 8 }, { wch: 10 }, ...grid.days.map(() => ({ wch: 10 }))];
    const safeName = groupTitle.replace(/[\\/*?:\[\]]/g, "").slice(0, 31) || "Medidores";
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  return wb;
}

function generateMetersWeekExcelBase64(grid, weekLabel) {
  const wb = buildMetersWeekWorkbook(grid, weekLabel);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return bufferToBase64(out);
}

export async function sendMetersWeekExcelEmailAuto(to, grid, weekLabel) {
  try {
    const base64 = generateMetersWeekExcelBase64(grid, weekLabel);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lecturas de Medidores (Excel) — ${weekLabel}`,
        text: `Lecturas de medidores de la semana: ${weekLabel}, en Excel para trabajar los datos directamente. Ver el archivo adjunto.`,
        attachmentBase64: base64,
        filename: `lecturas-medidores-${weekLabel.replace(/[\s\/]+/g, "-")}.xlsx`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el Excel automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   VISTA: PANEL DE ADMINISTRADOR
   ============================================================ */
/* ============================================================
   VISTA: PAPELERA
   ============================================================ */
export const TRASH_TYPE_LABELS = { task: "Tarea", account: "Usuario", employee: "Empleado", mttoEquipo: "Equipo de mantenimiento", bodega: "Bodega", shelf: "Estantería" };