// Función serverless de Vercel. Puente seguro hacia Telkonet EcoCentral (el BMS del hotel que
// controla los aires acondicionados/termostatos de las habitaciones) para poder ver su estado y
// temperatura, ver su historial, y cambiar su "Active State" (VIP, Check IN, Check OUT) desde
// QuinTech — sin que el navegador de nadie necesite nunca el usuario/contraseña de Telkonet. Esas
// credenciales quedan solo aquí, en el servidor, guardadas como variable de entorno.
//
// Configura en Vercel → tu proyecto → Settings → Environment Variables:
//   TELKONET_USERNAME = el usuario con el que entras a https://aws.telkonet.com/Central/
//   TELKONET_PASSWORD = la contraseña de esa cuenta
//
// Qué hace cada acción:
//   GET  /api/telkonet?action=rooms            -> estado/temperatura actual de TODAS las habitaciones
//   GET  /api/telkonet?action=history&roomId=  -> histórico reciente (temperatura, estado) de una habitación
//   POST { action: "setState", roomId, profileTypeId, profileTypeName } -> cambia el Active State (VIP, etc.)
//
// "setState" SÍ mueve equipo físico real en habitaciones que pueden estar ocupadas en ese momento
// — por eso, a diferencia de "rooms"/"history" (que solo piden una cuenta aprobada, de solo
// lectura), "setState" exige además que quien llama sea administrador o gerencia.
//
// Cómo funciona por dentro: Telkonet no tiene una API pública documentada — este archivo imita
// exactamente lo que hace el navegador cuando un humano usa el panel de Telkonet (inicia sesión
// con usuario/contraseña por POST, guarda la cookie de sesión que responde, y con esa cookie
// llama a los mismos endpoints internos que usa su propia interfaz). Si Telkonet cambia su sitio
// internamente esto podría dejar de funcionar y haría falta revisar/actualizar las rutas de abajo.

import { getSupabaseAdmin, requireApprovedUser } from "./_lib/security.js";
import { runDailyDigest } from "./_lib/dailyDigest.js";

const BASE = "https://aws.telkonet.com/Central";
const PROP_ID = "101414"; // Hyatt Regency - Cartagena Colombia (fijo para este hotel)
const NODE_ID = "p101414";

// Headers de navegador real — Telkonet rechaza silenciosamente peticiones que no parezcan venir
// de un navegador normal (sin esto, el login puede fallar incluso con usuario/contraseña correctos).
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Origin": BASE.replace(/\/Central$/, ""),
  "Referer": `${BASE}/index.php`,
};

// Estados activos que tiene sentido poder poner desde la app. Se dejan fuera a propósito
// "TestValve"/"TestOccupancy" (ids 4 y 5), que son pruebas técnicas internas de Telkonet, no
// estados operativos de una habitación.
export const PROFILE_TYPES = [
  { id: "1", name: "Check IN" },
  { id: "2", name: "Check OUT" },
  { id: "3", name: "VIP" },
];

// La sesión de Telkonet se reutiliza un rato entre llamadas (para no tener que iniciar sesión en
// cada clic) pero esta variable vive en memoria del proceso serverless, que Vercel puede reciclar
// en cualquier momento — por eso telkonetFetch() siempre sabe reintentar con sesión nueva si la
// que tenía guardada ya no sirve.
let cachedCookie = null;
let cachedCookieAt = 0;
const COOKIE_TTL_MS = 8 * 60 * 1000;

function getSetCookies(resp) {
  if (typeof resp.headers.getSetCookie === "function") {
    const list = resp.headers.getSetCookie();
    if (list && list.length) return list;
  }
  const raw = resp.headers.get("set-cookie");
  return raw ? [raw] : [];
}

async function telkonetLogin() {
  const username = process.env.TELKONET_USERNAME;
  const password = process.env.TELKONET_PASSWORD;
  if (!username || !password) {
    throw new Error("Falta configurar TELKONET_USERNAME y TELKONET_PASSWORD en Vercel.");
  }
  // Primero un GET (como hace un navegador real al abrir la página) para recibir una cookie de
  // sesión inicial, y luego el POST de login reutilizando esa cookie — Telkonet exige este orden.
  const getResp = await fetch(`${BASE}/index.php`, { headers: BROWSER_HEADERS });
  const initialCookies = getSetCookies(getResp).map(c => c.split(";")[0].trim()).join("; ");
  const resp = await fetch(`${BASE}/index.php`, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(initialCookies ? { Cookie: initialCookies } : {}),
    },
    body: new URLSearchParams({ username, password }).toString(),
    redirect: "manual",
  });
  const postCookies = getSetCookies(resp).map(c => c.split(";")[0].trim()).join("; ");
  const cookie = [initialCookies, postCookies].filter(Boolean).join("; ");
  if (!cookie) {
    throw new Error("Telkonet no devolvió una sesión — revisa que TELKONET_USERNAME/TELKONET_PASSWORD sean correctos.");
  }
  // Un navegador real, tras el login, carga la página del panel autenticado y dispara varias
  // llamadas internas de arranque antes de pedir datos — eso parece inicializar algo en la sesión
  // de Telkonet del lado del servidor (sin esto, algunas consultas de habitaciones devuelven un
  // error de SQL interno de Telkonet, como si faltara una preferencia de sesión).
  const warmupHeaders = { ...BROWSER_HEADERS, Cookie: cookie };
  await fetch(`${BASE}/index.php`, { headers: warmupHeaders }).catch(() => {});
  await fetch(`${BASE}/inc/ajax/LoadInfoPane.php`, { method: "POST", headers: { ...warmupHeaders, "Content-Type": "application/x-www-form-urlencoded" }, body: "" }).catch(() => {});
  await fetch(`${BASE}/inc/ajax/refreshPageTest.php`, { method: "POST", headers: { ...warmupHeaders, "Content-Type": "application/x-www-form-urlencoded" }, body: "" }).catch(() => {});
  cachedCookie = cookie;
  cachedCookieAt = Date.now();
  return cookie;
}

async function getCookie(forceFresh = false) {
  if (!forceFresh && cachedCookie && Date.now() - cachedCookieAt < COOKIE_TTL_MS) return cachedCookie;
  return telkonetLogin();
}

/** Llama un endpoint interno de Telkonet con la cookie de sesión. Si la respuesta no viene en
 *  JSON válido (típicamente porque la sesión expiró y Telkonet devolvió la página de login),
 *  reintenta UNA vez iniciando sesión de nuevo antes de rendirse.
 *
 *  Con raw:true devuelve el texto tal cual (sin intentar parsear JSON ni reintentar login) — lo
 *  usan los endpoints de gráficas de historial, que responden HTML con imágenes incrustadas, no JSON. */
async function telkonetFetch(path, { method = "GET", params, body, retry = true, raw = false } = {}) {
  const cookie = await getCookie();
  const url = new URL(`${BASE}/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const resp = await fetch(url.toString(), {
    method,
    headers: {
      ...BROWSER_HEADERS,
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const text = await resp.text();

  if (raw) return text;

  let data = null;
  try { data = JSON.parse(text); } catch { /* no era JSON — probablemente sesión vencida */ }

  if (!data && retry) {
    await getCookie(true);
    return telkonetFetch(path, { method, params, body, retry: false });
  }
  return data;
}

/** Trae TODAS las habitaciones de la propiedad, paginando (Telkonet solo entrega de a un bloque
 *  por pedido — en este hotel hay más de 360 habitaciones).
 *
 *  Telkonet devuelve cada habitación repetida varias veces (su "filterCount" cuenta filas, no
 *  habitaciones únicas) — por eso aquí se filtra por RoomID, quedándonos con una sola copia de
 *  cada habitación real. */
export async function fetchAllRooms() {
  const limit = 100;
  let start = 0;
  let all = [];
  let total = Infinity;
  while (start < total) {
    const data = await telkonetFetch("modules/ecosmart/ajax/data_roomstatus.php", {
      params: {
        nodeid: NODE_ID,
        _nodeid: NODE_ID,
        page: String(Math.floor(start / limit) + 1),
        start: String(start),
        limit: String(limit),
        sort: JSON.stringify([{ property: "RoomName", direction: "ASC" }]),
      },
    });
    if (!data || !Array.isArray(data.data) || data.data.length === 0) break;
    all = all.concat(data.data);
    total = Number(data.filterCount || data.totalCount || all.length);
    start += limit;
  }
  const seen = new Set();
  const unique = [];
  for (const room of all) {
    const id = room.RoomID;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(room);
  }
  return unique;
}

/** Encuentra el termostato (DeviceID) de una habitación a partir de su RoomID — hace falta para
 *  tanto el histórico como el cambio de estado, que se piden por DeviceID, no por RoomID. */
export async function fetchRoomDeviceId(roomId) {
  const data = await telkonetFetch("modules/ecosmart/ajax/data_roomopmodal.php", {
    params: {
      propID: "0",
      RoomID: String(roomId),
      nodeid: NODE_ID,
      _nodeid: NODE_ID,
      page: "1",
      start: "0",
      limit: "25",
      sort: JSON.stringify([{ property: "DeviceTypeNum", direction: "ASC" }]),
    },
  });
  const thermostat = (data?.data || []).find(d => typeof d.DeviceID === "string" && d.DeviceID.startsWith("d_"));
  if (!thermostat) return null;
  return thermostat.DeviceID.replace(/^d_/, "");
}

function telkonetDateFormat(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Nombres de todos los "Active State"/perfil que Telkonet puede reportar en el registro (Data) —
// incluye los 3 que se pueden asignar desde QuinTech (ver PROFILE_TYPES) más los que Telkonet usa
// internamente y que sí pueden aparecer en el historial aunque no se puedan elegir desde acá.
const PROFILE_TYPE_NAMES = {
  "1": "Check IN",
  "2": "Check OUT",
  "3": "VIP",
  "4": "TestValve",
  "5": "TestOccupancy",
};

/** Trae el panel de historial real de una habitación — las mismas 3 gráficas (Temperatura vs.
 *  Setpoint, Ciclo de encendido del aire, y Porcentaje de ocupación por hora) que muestra el panel
 *  "Historical Data" de Telkonet, MÁS el registro fila-por-fila (pestaña "Data" en Telkonet) con
 *  una lectura cada ~15 minutos: fecha/hora, el "Active State" (VIP, Check IN, Check OUT) que tenía
 *  en ese momento, temperatura y setpoint. Telkonet genera las gráficas como imágenes PNG ya
 *  dibujadas en su servidor (no hay datos numéricos sueltos que pedir aparte para esas), así que
 *  aquí se extraen esas 3 imágenes tal cual para mostrarlas, y por separado se trae el registro de
 *  la pestaña "Data" — este último sirve para poder comprobar, mirando la columna de estado, si un
 *  cambio de estado (p.ej. a VIP) se mantuvo con el tiempo o Telkonet lo revirtió solo. */
async function fetchHistory(roomId, days = 7) {
  const deviceId = await fetchRoomDeviceId(roomId);
  if (!deviceId) throw new Error("No se encontró el termostato de esa habitación.");

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const [html, log] = await Promise.all([
    telkonetFetch("modules/ecosmart/ajax/data_ecoinsightopmodal_historicaldata.php", {
      method: "POST",
      raw: true,
      body: {
        action: "getTempvssetpointGraph",
        deviceid: deviceId,
        propID: PROP_ID,
        isTouch: "false",
        startdate: telkonetDateFormat(start),
        enddate: telkonetDateFormat(end),
        _nodeid: NODE_ID,
      },
    }),
    fetchDataLog(deviceId),
  ]);

  const graphs = {};
  const labels = {
    TempvssetpointGraph: "Temperatura vs. Setpoint",
    DutycycleGraph: "Ciclo de encendido del aire (duty cycle)",
    OccupancyTimeOfDayGraph: "Ocupación física por hora del día",
  };
  const imgPattern = /<img id="([^"]+)"[^>]*src="(data:image\/[a-zA-Z]+;base64,[^"]+)"/g;
  let match;
  while ((match = imgPattern.exec(html)) !== null) {
    const [, id, src] = match;
    graphs[id] = { label: labels[id] || id, image: src };
  }

  return {
    deviceId,
    startDate: telkonetDateFormat(start),
    endDate: telkonetDateFormat(end),
    graphs,
    dataLog: log,
  };
}

/** Pestaña "Data" de Telkonet: el registro crudo de lecturas del termostato, una cada ~15 minutos,
 *  incluyendo qué "Active State" (perfil: VIP, Check IN, Check OUT) tenía en ese momento exacto.
 *  Trae las últimas `limit` lecturas (más recientes primero, igual que en Telkonet). */
export async function fetchDataLog(deviceId, limit = 40) {
  // Telkonet exige, igual que hace su propio navegador al abrir la pestaña "Data", pedir primero
  // las preferencias de la grilla (columnas guardadas del usuario) antes de pedir los datos —
  // si se salta este paso, el registro vuelve vacío (longitud 0) aunque "totalCount" sí sea
  // correcto, porque esa cuenta se calcula aparte y no depende de este paso.
  await telkonetFetch("modules/ecosmart/ajax/data_gridpreferences.php", {
    method: "POST",
    body: { gridid: "EMSInfoDataGrid", _nodeid: NODE_ID },
  });

  // Lista exacta de columnas que pide el navegador real de Telkonet en la pestaña "Data" (capturada
  // en vivo). Importante: el nombre real de la columna de ocupación es "SensorOccupiedBits", no
  // "Occupied" (ese nombre no existe en Telkonet) — pedir un campo inexistente era lo que hacía
  // que toda la respuesta volviera vacía.
  const fields = [
    "DateTime", "CurrentlyActiveProfileType", "FirmwareVersion", "UserSetPoint", "Temperature",
    "ThermostatMode", "DryContactMap", "SensorOccupiedBits", "SensorTimeoutBits",
    "Flags1", "Flags2", "Flags3", "Flags4", "Flags5", "BootCount",
  ];
  const data = await telkonetFetch("modules/ecosmart/ajax/data_opmodal_ems.php", {
    method: "POST",
    body: {
      deviceID: deviceId,
      propID: PROP_ID,
      deviceType: "5.2",
      fields: JSON.stringify(fields),
      startDate: "",
      page: "1",
      start: "0",
      limit: String(limit),
      _nodeid: NODE_ID,
    },
  });
  return (data?.data || []).map(r => ({
    dateTime: r.DateTime,
    profileId: r.CurrentlyActiveProfileType,
    profileName: PROFILE_TYPE_NAMES[r.CurrentlyActiveProfileType] || `Perfil ${r.CurrentlyActiveProfileType}`,
    userSetPoint: r.UserSetPoint != null ? Number(r.UserSetPoint) : null,
    temperature: r.Temperature != null ? Number(r.Temperature) : null,
    thermostatMode: r.ThermostatMode || null,
    occupied: r.SensorOccupiedBits != null && Number(r.SensorOccupiedBits) !== 0,
  }));
}

async function setRoomState(roomId, profileTypeId, profileTypeName) {
  const deviceId = await fetchRoomDeviceId(roomId);
  if (!deviceId) throw new Error("No se encontró el termostato de esa habitación.");
  const data = await telkonetFetch("modules/ecosmart/ajax/processForm_opmodal.php", {
    method: "POST",
    body: {
      action: "updateActiveProfile",
      ProfileTypeName: profileTypeName,
      ProfileTypeID: String(profileTypeId),
      DeviceID: deviceId,
      propID: PROP_ID,
      nodeid: NODE_ID,
    },
  });
  return data;
}

// Umbral para considerar una lectura "fuera de rango": 6°F de diferencia entre temperatura real
// y set point — el mismo umbral que usa el Dashboard para la vista en vivo.
const SCAN_OUT_OF_RANGE_DELTA = 6;
// Cuántas lecturas del registro "Data" pedir por habitación — a ~15 minutos por lectura, 700
// cubre un poco más de 7 días.
const SCAN_LOG_LIMIT = 700;
// Cuántas habitaciones procesar en paralelo durante el escaneo.
const SCAN_CONCURRENCY = 10;
// Deja de empezar habitaciones nuevas pasado este tiempo, para no chocar con el límite de
// duración que Vercel le pone a la función (ver vercel.json). Las que no alcancen hoy quedan de
// primeras en la próxima corrida (se ordenan por "hace cuánto no se revisan").
const SCAN_TIME_BUDGET_MS = 50 * 1000;

function scanAverage(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function scanOneRoom(room, knownDeviceId) {
  const roomId = room.RoomID;
  let deviceId = knownDeviceId || null;
  if (!deviceId) deviceId = await fetchRoomDeviceId(roomId);
  if (!deviceId) {
    return { roomId, roomName: room.RoomName, deviceId: null, scanError: "No se encontró el termostato de esta habitación." };
  }
  const log = await fetchDataLog(deviceId, SCAN_LOG_LIMIT);
  const readings = log.filter(r => r.temperature != null && r.userSetPoint != null);
  const deltas = readings.map(r => Math.abs(r.temperature - r.userSetPoint));
  const outOfRangeCount = deltas.filter(d => d >= SCAN_OUT_OF_RANGE_DELTA).length;
  const totalReadings = readings.length;
  const outOfRangePct = totalReadings > 0 ? (outOfRangeCount / totalReadings) * 100 : null;
  const needsMaintenance = totalReadings >= 20 && outOfRangePct != null && outOfRangePct >= 25;
  return {
    roomId, roomName: room.RoomName, deviceId, totalReadings, outOfRangeCount, outOfRangePct,
    avgDelta: scanAverage(deltas),
    oldestReading: log.length ? log[log.length - 1].dateTime : null,
    newestReading: log.length ? log[0].dateTime : null,
    needsMaintenance, scanError: null,
  };
}

/** Revisa, poco a poco (lo que alcance en SCAN_TIME_BUDGET_MS), el historial de ~7 días de cada
 *  habitación y guarda en Supabase cuántas lecturas estuvieron fuera de rango de temperatura —
 *  esto alimenta la sección "Mantenimiento recomendado" del Dashboard. Lo dispara únicamente
 *  Vercel Cron (ver vercel.json), nunca el navegador de nadie. Empieza siempre por las
 *  habitaciones que lleven más tiempo sin revisarse, así que aunque una sola corrida no alcance
 *  a cubrir las 361, con los días se van poniendo todas al día solas. */
async function runMaintenanceScan(supabaseAdmin) {
  const startedAt = Date.now();
  const rooms = await fetchAllRooms();

  const { data: existingRows } = await supabaseAdmin
    .from("telkonet_room_health")
    .select("room_id, device_id, last_scanned_at");
  const existingByRoomId = new Map((existingRows || []).map(r => [r.room_id, r]));

  const ordered = [...rooms].sort((a, b) => {
    const aAt = existingByRoomId.get(a.RoomID)?.last_scanned_at || "";
    const bAt = existingByRoomId.get(b.RoomID)?.last_scanned_at || "";
    return aAt.localeCompare(bAt); // "" (nunca revisada) siempre queda primero
  });

  let processed = 0;
  let failed = 0;
  let i = 0;
  while (i < ordered.length && Date.now() - startedAt < SCAN_TIME_BUDGET_MS) {
    const batch = ordered.slice(i, i + SCAN_CONCURRENCY);
    i += SCAN_CONCURRENCY;
    const results = await Promise.all(batch.map(room =>
      scanOneRoom(room, existingByRoomId.get(room.RoomID)?.device_id || null)
        .catch(e => ({ roomId: room.RoomID, roomName: room.RoomName, deviceId: null, scanError: e.message || "Error al revisar esta habitación." }))
    ));
    const upsertRows = results.map(r => ({
      room_id: r.roomId,
      room_name: r.roomName,
      device_id: r.deviceId,
      total_readings: r.totalReadings ?? null,
      out_of_range_count: r.outOfRangeCount ?? null,
      out_of_range_pct: r.outOfRangePct ?? null,
      avg_delta: r.avgDelta ?? null,
      oldest_reading: r.oldestReading ?? null,
      newest_reading: r.newestReading ?? null,
      needs_maintenance: r.needsMaintenance ?? false,
      last_scanned_at: new Date().toISOString(),
      scan_error: r.scanError ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertErr } = await supabaseAdmin.from("telkonet_room_health").upsert(upsertRows, { onConflict: "room_id" });
    if (upsertErr) console.error("Error guardando telkonet_room_health:", upsertErr);
    processed += results.length;
    failed += results.filter(r => r.scanError).length;
  }

  return {
    roomsTotal: rooms.length,
    roomsProcessedThisRun: processed,
    roomsFailedThisRun: failed,
    roomsRemaining: Math.max(0, ordered.length - processed),
    tookMs: Date.now() - startedAt,
  };
}

export default async function handler(req, res) {
  // Acción del cron de mantenimiento semanal — la dispara solo Vercel Cron (ver vercel.json),
  // nunca el navegador de nadie, así que no trae sesión de usuario ni "x-app-secret": se valida
  // aparte con CRON_SECRET, antes que cualquier otra comprobación de abajo.
  // Resumen diario por notificación push (buenos días a cada técnico + vencidas para el admin).
  // Mismo mecanismo de autenticación que el escaneo: solo Vercel Cron, con CRON_SECRET.
  if (req.method === "GET" && req.query.action === "digest") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers["authorization"] !== `Bearer ${cronSecret}`) {
      res.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(500).json({ ok: false, message: "Falta configurar Supabase en el servidor." });
      return;
    }
    try {
      const result = await runDailyDigest(supabaseAdmin);
      res.status(200).json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message || "Error en el resumen diario." });
    }
    return;
  }

  if (req.method === "GET" && req.query.action === "scan") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers["authorization"] !== `Bearer ${cronSecret}`) {
      res.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(500).json({ ok: false, message: "Falta configurar Supabase en el servidor." });
      return;
    }
    try {
      const result = await runMaintenanceScan(supabaseAdmin);
      res.status(200).json({ ok: true, ...result });
    } catch (e) {
      console.error("Error en /api/telkonet?action=scan:", e);
      res.status(500).json({ ok: false, message: e.message || "No se pudo completar el escaneo." });
    }
    return;
  }

  const expectedSecret = process.env.APP_SHARED_SECRET;
  if (expectedSecret && req.headers["x-app-secret"] !== expectedSecret) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: "Falta configurar Supabase en el servidor." });
    return;
  }
  const auth = await requireApprovedUser(req, supabaseAdmin);
  if (!auth.ok) {
    res.status(auth.status).json({ ok: false, message: auth.message });
    return;
  }
  // TelkHab es, por ahora, una función exclusiva del administrador (se está reservando como un
  // plus de la app). Se exige aquí, en el servidor, y no solo escondiendo el botón en pantalla:
  // así nadie con otra cuenta puede llamar a este endpoint directamente.
  {
    const { data: adminProfile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", auth.userId).maybeSingle();
    if (!adminProfile?.is_admin) {
      res.status(403).json({ ok: false, message: "TelkHab solo está disponible para el administrador." });
      return;
    }
  }

  try {
    if (req.method === "GET") {
      const action = req.query.action;

      if (action === "rooms") {
        const rooms = await fetchAllRooms();
        res.status(200).json({ ok: true, rooms, profileTypes: PROFILE_TYPES });
        return;
      }

      if (action === "history") {
        const roomId = req.query.roomId;
        if (!roomId) { res.status(400).json({ ok: false, message: "Falta roomId." }); return; }
        const days = req.query.days ? Number(req.query.days) : 7;
        const history = await fetchHistory(roomId, days);
        res.status(200).json({ ok: true, history });
        return;
      }

      // Reporte de mantenimiento semanal: lee lo que el cron "telkonet-scan" ya calculó y guardó
      // en Supabase (cuántas lecturas de los últimos ~7 días estuvieron fuera de rango de
      // temperatura, por habitación). No vuelve a pedirle nada a Telkonet — por eso es rápido,
      // a diferencia de calcular esto en vivo, que requeriría revisar las 361 habitaciones una
      // por una cada vez que alguien abre el Dashboard.
      if (action === "maintenanceReport") {
        const { data: rows, error: selErr } = await supabaseAdmin
          .from("telkonet_room_health")
          .select("*")
          .order("out_of_range_pct", { ascending: false, nullsFirst: false });
        if (selErr) throw selErr;
        const scannedAts = (rows || []).map(r => r.last_scanned_at).filter(Boolean).sort();
        res.status(200).json({
          ok: true,
          rows: rows || [],
          totalRoomsKnown: (rows || []).length,
          oldestScan: scannedAts[0] || null,
          newestScan: scannedAts[scannedAts.length - 1] || null,
        });
        return;
      }

      res.status(400).json({ ok: false, message: "Acción no reconocida." });
      return;
    }

    if (req.method === "POST") {
      const { action, roomId, profileTypeId, profileTypeName } = req.body || {};

      if (action === "setState") {
        // Esto SÍ controla un aire acondicionado real, posiblemente en una habitación ocupada —
        // por eso, a diferencia del resto de este endpoint, exige administrador o gerencia.
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_admin, is_gerencia")
          .eq("id", auth.userId)
          .maybeSingle();
        if (!profile?.is_admin && !profile?.is_gerencia) {
          res.status(403).json({ ok: false, message: "Solo administración o gerencia puede cambiar el estado de una habitación." });
          return;
        }
        if (!roomId || !profileTypeId || !profileTypeName) {
          res.status(400).json({ ok: false, message: "Faltan datos para cambiar el estado." });
          return;
        }
        const result = await setRoomState(roomId, profileTypeId, profileTypeName);
        if (!result || result.success === false) {
          res.status(502).json({ ok: false, message: result?.msg || "Telkonet no confirmó el cambio." });
          return;
        }
        res.status(200).json({ ok: true, message: result.msg || "Estado actualizado." });
        return;
      }

      res.status(400).json({ ok: false, message: "Acción no reconocida." });
      return;
    }

    res.status(405).json({ ok: false, message: "Método no permitido." });
  } catch (e) {
    console.error("Error en /api/telkonet:", e);
    res.status(500).json({ ok: false, message: e.message || "No se pudo conectar con Telkonet." });
  }
}
