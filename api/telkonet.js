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
async function fetchAllRooms() {
  const limit = 100;
  let start = 0;
  let all = [];
  let total = Infinity;
  while (start < total) {
    const data = await telkonetFetch("modules/ecosmart/ajax/data_roomstatus.php", {
      params: {
        nodeid: NODE_ID,
        filter: "",
        page: String(Math.floor(start / limit) + 1),
        start: String(start),
        limit: String(limit),
        sort: JSON.stringify([{ property: "RoomName", direction: "ASC" }]),
      },
    });
    console.log("[telkonet debug] fetchAllRooms page", { start, dataIsNull: data === null, isArray: Array.isArray(data?.data), length: data?.data?.length, filterCount: data?.filterCount, totalCount: data?.totalCount });
    if (!data || !Array.isArray(data.data) || data.data.length === 0) break;
    all = all.concat(data.data);
    total = Number(data.filterCount || data.totalCount || all.length);
    start += limit;
  }
  console.log("[telkonet debug] fetchAllRooms done", { allLength: all.length });
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
async function fetchRoomDeviceId(roomId) {
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

/** Trae el panel de historial real de una habitación — las mismas 3 gráficas (Temperatura vs.
 *  Setpoint, Ciclo de encendido del aire, y Porcentaje de ocupación por hora) que muestra el panel
 *  "Historical Data" de Telkonet. Telkonet las genera como imágenes PNG ya dibujadas en su
 *  servidor (no hay datos numéricos sueltos que pedir aparte), así que aquí se extraen esas 3
 *  imágenes y se devuelven listas para mostrar tal cual en QuinTech. */
async function fetchHistory(roomId, days = 7) {
  const deviceId = await fetchRoomDeviceId(roomId);
  if (!deviceId) throw new Error("No se encontró el termostato de esa habitación.");

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const html = await telkonetFetch("modules/ecosmart/ajax/data_ecoinsightopmodal_historicaldata.php", {
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
  });

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
  };
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

export default async function handler(req, res) {
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
