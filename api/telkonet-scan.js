// Función serverless de Vercel — SOLO la dispara Vercel Cron (ver vercel.json), nunca el
// navegador de nadie. Revisa, poco a poco, el registro de los últimos ~7 días de cada habitación
// en Telkonet, y guarda en Supabase (tabla "telkonet_room_health") cuántas de esas lecturas
// tuvieron la temperatura muy desviada del set point — eso es lo que el Dashboard de TelkHab
// (api/telkonet.js, acción "maintenanceReport") le muestra al personal para programar
// mantenimiento.
//
// Por qué no se calcula esto en vivo cuando alguien abre el Dashboard: hay 361 habitaciones, y
// revisar el historial de una habitación le toma a Telkonet entre medio segundo y un par de
// segundos — revisarlas todas de una sentada tardaría varios minutos y sería muy pesado para los
// servidores de Telkonet si se hiciera cada vez que alguien mira la pantalla. En cambio, este
// proceso corre una vez al día, de madrugada, y en cada corrida avanza con las habitaciones que
// lleven MÁS TIEMPO sin revisarse — así, aunque una sola corrida no alcance a revisar las 361
// (por el límite de tiempo que Vercel le da a una función), con los días se van poniendo todas al
// día solas, sin que haga falta hacer nada más.
//
// Configura en Vercel → tu proyecto → Settings → Environment Variables:
//   CRON_SECRET = una clave larga cualquiera que tú inventes (sirve para que nadie más que
//                 Vercel Cron pueda llamar a esta función) — Vercel la manda solo automáticamente
//                 como "Authorization: Bearer <CRON_SECRET>" en cada corrida programada, en
//                 cuanto la variable exista con ese nombre exacto.

import { getSupabaseAdmin } from "./_lib/security.js";
import { fetchAllRooms, fetchRoomDeviceId, fetchDataLog } from "./telkonet.js";

// Umbral para considerar una lectura "fuera de rango": 6°F de diferencia entre temperatura real
// y set point — el mismo umbral que ya usa el Dashboard para la vista en vivo, para que los dos
// números (en vivo y de la última semana) signifiquen lo mismo.
const OUT_OF_RANGE_DELTA = 6;
// Cuántas lecturas del registro "Data" pedir por habitación — a ~15 minutos por lectura, 700
// cubre un poco más de 7 días.
const LOG_LIMIT = 700;
// Cuántas habitaciones procesar en paralelo — ni tan pocas (tardaría demasiado) ni tantas que
// parezca un ataque a los servidores de Telkonet.
const CONCURRENCY = 10;
// Deja de empezar habitaciones nuevas pasado este tiempo, para no chocar con el límite de
// duración que Vercel le pone a la función (configurado en vercel.json). Las que no alcancen hoy
// quedan de primeras en la próxima corrida (se ordenan por "hace cuánto no se revisan").
const TIME_BUDGET_MS = 50 * 1000;

function average(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function scanOneRoom(room, knownDeviceId) {
  const roomId = room.RoomID;
  let deviceId = knownDeviceId || null;
  if (!deviceId) {
    deviceId = await fetchRoomDeviceId(roomId);
  }
  if (!deviceId) {
    return { roomId, roomName: room.RoomName, deviceId: null, scanError: "No se encontró el termostato de esta habitación." };
  }

  const log = await fetchDataLog(deviceId, LOG_LIMIT);
  const readings = log.filter(r => r.temperature != null && r.userSetPoint != null);
  const deltas = readings.map(r => Math.abs(r.temperature - r.userSetPoint));
  const outOfRangeCount = deltas.filter(d => d >= OUT_OF_RANGE_DELTA).length;
  const totalReadings = readings.length;
  const outOfRangePct = totalReadings > 0 ? (outOfRangeCount / totalReadings) * 100 : null;
  // Exige un mínimo de lecturas para no marcar "necesita mantenimiento" una habitación de la que
  // casi no hay datos (p.ej. un termostato recién instalado o que lleva días sin reportar).
  const needsMaintenance = totalReadings >= 20 && outOfRangePct != null && outOfRangePct >= 25;

  return {
    roomId,
    roomName: room.RoomName,
    deviceId,
    totalReadings,
    outOfRangeCount,
    outOfRangePct,
    avgDelta: average(deltas),
    oldestReading: log.length ? log[log.length - 1].dateTime : null,
    newestReading: log.length ? log[0].dateTime : null,
    needsMaintenance,
    scanError: null,
  };
}

export default async function handler(req, res) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && req.headers["authorization"] !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: "Falta configurar Supabase en el servidor." });
    return;
  }

  const startedAt = Date.now();
  try {
    const rooms = await fetchAllRooms();

    // Trae lo que ya se sabía de corridas anteriores (sobre todo el device_id de cada habitación,
    // para no tener que volver a buscarlo cada día) y decide con cuáles habitaciones empezar:
    // las que lleven más tiempo sin revisarse primero (o nunca revisadas).
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
    while (i < ordered.length && Date.now() - startedAt < TIME_BUDGET_MS) {
      const batch = ordered.slice(i, i + CONCURRENCY);
      i += CONCURRENCY;

      const results = await Promise.all(batch.map(room =>
        scanOneRoom(room, existingByRoomId.get(room.RoomID)?.device_id || null)
          .catch(e => ({ roomId: room.RoomID, roomName: room.RoomName, deviceId: null, scanError: e.message || "Error al revisar esta habitación." }))
      ));

      // Se guarda cada tanda apenas se calcula (no todo al final) — así, si la función se corta
      // por el límite de tiempo, lo ya revisado hoy no se pierde.
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

    res.status(200).json({
      ok: true,
      roomsTotal: rooms.length,
      roomsProcessedThisRun: processed,
      roomsFailedThisRun: failed,
      roomsRemaining: Math.max(0, ordered.length - processed),
      tookMs: Date.now() - startedAt,
    });
  } catch (e) {
    console.error("Error en /api/telkonet-scan:", e);
    res.status(500).json({ ok: false, message: e.message || "No se pudo completar el escaneo." });
  }
}
