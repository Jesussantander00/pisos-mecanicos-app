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
  const resp = await fetch(`${BASE}/index.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
    redirect: "manual",
  });
  const cookies = getSetCookies(resp);
  if (!cookies.length) {
    throw new Error("Telkonet no devolvió una sesión — revisa que TELKONET_USERNAME/TELKONET_PASSWORD sean correctos.");
  }
  const cookie = cookies.map(c => c.split(";")[0].trim()).join("; ");
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
 *  reintenta UNA vez iniciando sesión de nuevo antes de rendirse. */
async function telkonetFetch(path, { method = "GET", params, body, retry = true } = {}) {
  const cookie = await getCookie();
  const url = new URL(`${BASE}/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const resp = await fetch(url.toString(), {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* no era JSON — probablemente sesión vencida */ }

  if (!data && retry) {
    await getCookie(true);
    return telkonetFetch(path, { method, params, body, retry: false });
  }
  return data;
}

/** Trae TODAS las habitaciones de la propiedad, paginando (Telkonet solo entrega de a un bloque
 *  por pedido — en este hotel hay más de 360 habitaciones). */
async function fetchAllRooms() {
  const limit = 100;
  let start = 0;
  let all = [];
  let total = Infinity;
  while (start < total) {
    const data = await telkonetFetch("modules/ecosmart/ajax/data_roomstatus.php", {
      params: {
        nodeid: NODE_ID,
        _nodeid: NODE_ID,
        filter: "",
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
  return all;
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

async function fetchHistory(roomId) {
  const deviceId = await fetchRoomDeviceId(roomId);
  if (!deviceId) throw new Error("No se encontró el termostato de esa habitación.");
  const data = await telkonetFetch("modules/ecosmart/ajax/data_opmodal_ems.php", {
    method: "POST",
    body: { DeviceID: deviceId, propID: PROP_ID, nodeid: NODE_ID, _nodeid: NODE_ID, page: "1", start: "0", limit: "20" },
  });
  return Array.isArray(data?.data) ? data.data : [];
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
      _nodeid: NODE_ID,
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
        const history = await fetchHistory(roomId);
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
