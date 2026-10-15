import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { C, ROOM_PREVENTIVE_STEPS, authFetchRetry, authHeaders, categoryOfTask, hvacStateTone, normalizeSearchText, normalizeTaskState, planColorOf, planGroupOf, roomOfTask } from "../shared/core";
import { Button, HorizontalBarChart, MiniDonut, PcbBackground } from "../shared/components";



export function HVACView({ isAdmin, isGerencia, tasks = [], onCreateTask, onCreateTasksBatch, accounts = {}, onNavigate }) {
  // Última lectura guardada en este celular: se muestra al instante y se actualiza por detrás.
  const telkCache = useMemo(() => { try { const c = JSON.parse(localStorage.getItem("pm-local:telk-rooms") || "null"); return c && Array.isArray(c.rooms) ? c : null; } catch { return null; } }, []);
  const [rooms, setRooms] = useState(() => telkCache?.rooms || []);
  const [profileTypes, setProfileTypes] = useState(() => telkCache?.profileTypes || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [historyRoom, setHistoryRoom] = useState(null); // { RoomID, RoomName }
  const [stateRoom, setStateRoom] = useState(null); // { RoomID, RoomName, choice }
  const [vipTask, setVipTask] = useState(true); // al poner VIP, crear una tarea de revisión previa con checklist
  const [busyRoomId, setBusyRoomId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "dashboard"
  const [maintenanceReport, setMaintenanceReport] = useState({ rows: [], loading: true, error: null, oldestScan: null, newestScan: null });

  const canControl = isAdmin || isGerencia;
  // Órdenes de HotSOS todavía abiertas, agrupadas por número de habitación (se toma de "lugar",
  // que HotSOS escribe al inicio de la descripción) — para ver junto al aire si ya hay una orden.
  const hotsosByRoom = useMemo(() => {
    const map = {};
    (tasks || []).forEach(t => {
      if (t.origen !== "hotsos" || normalizeTaskState(t.estado) === "finalizada") return;
      const m = /\b(\d{3,5})\b/.exec(String(t.descripcion || "").split(" — ")[0]);
      if (m) (map[m[1]] = map[m[1]] || []).push(t);
    });
    return map;
  }, [tasks]);
  // Tareas ya creadas desde esta pantalla (por habitación) que siguen abiertas — para no crear dos veces.
  const telkTaskByRoom = useMemo(() => {
    const map = {};
    (tasks || []).forEach(t => {
      if (normalizeTaskState(t.estado) === "finalizada") return;
      const m = /^Revisar aire hab\. (\S+)/.exec(t.titulo || "");
      if (m) map[m[1]] = t;
    });
    return map;
  }, [tasks]);
  const [creatingRoom, setCreatingRoom] = useState(null);
  // ---- Preventivo por habitación (item 14): propone las habitaciones que llevan más tiempo sin
  // revisión de aire/filtros y crea el lote con un toque, sin que el administrador arme una a una.
  const [showPrev, setShowPrev] = useState(false);
  const [prevMonths, setPrevMonths] = useState(6);
  const [prevCount, setPrevCount] = useState(20);
  const [prevAssignee, setPrevAssignee] = useState("");
  const [prevConfirm, setPrevConfirm] = useState(false);
  const [prevBusy, setPrevBusy] = useState(false);
  const prevPlan = useMemo(() => {
    const last = {}, open = new Set();
    (tasks || []).forEach(t => {
      if (t.origen !== "preventivo-hab" || !t.roomKey) return;
      if (normalizeTaskState(t.estado) !== "finalizada") { open.add(t.roomKey); return; }
      const ts = new Date(t.finishedAt || t.updatedAt || 0).getTime();
      if (ts > (last[t.roomKey] || 0)) last[t.roomKey] = ts;
    });
    const limit = Date.now() - prevMonths * 30.4 * 86400000;
    const due = (rooms || []).map(r => String(r.RoomName || "").trim()).filter(Boolean)
      .filter((n, i, a) => a.indexOf(n) === i && !open.has(n) && (!last[n] || last[n] < limit))
      .sort((a, b) => ((last[a] || 0) - (last[b] || 0)) || a.localeCompare(b, "es", { numeric: true }));
    return { due, openCount: open.size };
  }, [tasks, rooms, prevMonths]);
  const generatePrev = async () => {
    if (!onCreateTasksBatch) return;
    setPrevBusy(true);
    try {
      const lote = prevPlan.due.slice(0, prevCount);
      const n = await onCreateTasksBatch(lote.map(name => ({
        titulo: `Preventivo aire hab. ${name}`,
        descripcion: `Habitación ${name} — revisión preventiva programada (filtros, drenaje y funcionamiento del aire).`,
        prioridad: "baja", asignadoA: prevAssignee, checklist: ROOM_PREVENTIVE_STEPS, origen: "preventivo-hab", roomKey: name,
      })));
      setFlash({ ok: true, msg: `Se crearon ${n} tareas de preventivo${prevAssignee ? "" : " (sin asignar, aparecen en Panel de hoy)"}.` });
      setPrevConfirm(false);
    } catch (e) {
      setFlash({ ok: false, msg: e.message || "No se pudieron crear las tareas." });
    } finally { setPrevBusy(false); }
  };
  // Desde la lista "Mantenimiento recomendado": una tarea por habitación, que revisa y aprueba el
  // administrador con un toque (no se crean solas, para no llenar la lista de tareas sin que lo decida).
  const createMaintTask = async (r) => {
    if (!onCreateTask) return;
    setCreatingRoom(r.room_id);
    try {
      const room = String(r.room_name || "").trim();
      await onCreateTask({
        titulo: `Revisar aire hab. ${room}`,
        descripcion: `Habitación ${room} — ${Number(r.out_of_range_count)} de ${Number(r.total_readings)} lecturas fuera de rango en la última semana (${Number(r.out_of_range_pct).toFixed(0)}%). Creada desde el reporte de Mantenimiento recomendado de TelkHab.`,
        prioridad: Number(r.out_of_range_pct) >= 50 ? "alta" : "media", asignadoA: "", recurrencia: "", fotosAntes: [], equipoId: null, etiquetas: [],
      });
      setFlash({ ok: true, msg: `Tarea creada para la habitación ${room}. Aparece en Panel de hoy, sin asignar.` });
    } catch (e) {
      setFlash({ ok: false, msg: e.message || "No se pudo crear la tarea." });
    } finally { setCreatingRoom(null); }
  };
  const createRoomTask = async (r) => {
    if (!onCreateTask) return;
    setCreatingRoom(r.RoomID);
    try {
      const room = String(r.RoomName || "").trim();
      await onCreateTask({
        titulo: `Revisar aire hab. ${room}`,
        descripcion: `Habitación ${room} — temperatura ambiente ${r.Temperature != null ? r.Temperature + "°F" : "—"}, punto de ajuste ${r.UserSetPoint != null ? Number(r.UserSetPoint) + "°F" : "—"}${Number(r.AlertCount || 0) > 0 ? `, ${r.AlertCount} alerta(s)` : ""}. Creada desde TelkHab.`,
        prioridad: "media", asignadoA: "", recurrencia: "", fotosAntes: [], equipoId: null, etiquetas: [],
      });
      setFlash({ ok: true, msg: `Tarea creada para la habitación ${room}. Aparece en Panel de hoy, sin asignar.` });
    } catch (e) {
      setFlash({ ok: false, msg: e.message || "No se pudo crear la tarea." });
    } finally { setCreatingRoom(null); }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await authFetchRetry("/api/telkonet?action=rooms");
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "No se pudo cargar el estado de las habitaciones.");
      setRooms(data.rooms || []);
      setProfileTypes(data.profileTypes || []);
      setUpdatedAt(Date.now());
      try { localStorage.setItem("pm-local:telk-rooms", JSON.stringify({ rooms: data.rooms || [], profileTypes: data.profileTypes || [], at: Date.now() })); } catch { /* cuota llena: se sigue sin guardar */ }
    } catch (e) {
      setError(e.message || "No se pudo conectar con Telkonet.");
    } finally {
      setLoading(false);
    }
  };

  // Reporte de "última semana" para mantenimiento — lo calcula un proceso en segundo plano una
  // vez al día (api/telkonet-scan.js) y aquí solo se lee lo que ya quedó guardado, así que es
  // rápido aunque haya 361 habitaciones.
  const loadMaintenanceReport = async () => {
    setMaintenanceReport(m => ({ ...m, loading: true, error: null }));
    try {
      const resp = await authFetchRetry("/api/telkonet?action=maintenanceReport");
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "No se pudo cargar el reporte de mantenimiento.");
      setMaintenanceReport({ rows: data.rows || [], loading: false, error: null, oldestScan: data.oldestScan || null, newestScan: data.newestScan || null });
    } catch (e) {
      setMaintenanceReport(m => ({ ...m, loading: false, error: e.message || "No se pudo cargar el reporte de mantenimiento." }));
    }
  };

  useEffect(() => { load(); loadMaintenanceReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const searchNorm = normalizeSearchText(search.trim());
  const filtered = searchNorm
    ? rooms.filter(r => normalizeSearchText(r.RoomName || "").includes(searchNorm) || normalizeSearchText(r.ProfileName || "").includes(searchNorm))
    : rooms;

  // Estadísticas del Dashboard — todo se calcula de lo que ya trae /api/telkonet?action=rooms,
  // sin pedirle nada extra a Telkonet (que ya es lento con 361 habitaciones).
  const dashboard = useMemo(() => {
    const occupiedCount = rooms.filter(r => r.Occupied && r.Occupied !== "0").length;
    const vipCount = rooms.filter(r => r.ProfileName === "VIP").length;
    const checkInCount = rooms.filter(r => (r.ProfileName || "").includes("Check IN")).length;
    const checkOutCount = rooms.filter(r => (r.ProfileName || "").includes("Check OUT") && r.ProfileName !== "VIP").length;
    const lowBattery = rooms.filter(r => r.BatteryPercent != null && Number(r.BatteryPercent) >= 0 && Number(r.BatteryPercent) < 30)
      .sort((a, b) => Number(a.BatteryPercent) - Number(b.BatteryPercent));
    const withAlerts = rooms.filter(r => Number(r.AlertCount || 0) > 0 || Number(r.TKOAlertCount || 0) > 0)
      .sort((a, b) => (Number(b.AlertCount || 0) + Number(b.TKOAlertCount || 0)) - (Number(a.AlertCount || 0) + Number(a.TKOAlertCount || 0)));
    const tempIssues = rooms
      .map(r => ({ r, delta: (r.Temperature != null && r.UserSetPoint != null) ? Math.abs(Number(r.Temperature) - Number(r.UserSetPoint)) : null }))
      .filter(x => x.delta != null && x.delta >= 6)
      .sort((a, b) => b.delta - a.delta);
    // Ocupación por piso — se infiere del primer dígito(s) del nombre de habitación (1701 -> piso 17).
    const byFloor = {};
    for (const r of rooms) {
      const m = String(r.RoomName || "").match(/^(\d{1,2})\d{2}/);
      const floor = m ? m[1] : "otro";
      byFloor[floor] = byFloor[floor] || { floor, total: 0, occupied: 0 };
      byFloor[floor].total += 1;
      if (r.Occupied && r.Occupied !== "0") byFloor[floor].occupied += 1;
    }
    const floors = Object.values(byFloor).sort((a, b) => a.floor.localeCompare(b.floor, undefined, { numeric: true }));
    const checkoutActive = rooms
      .filter(r => (r.ProfileName || "").includes("Check OUT") && r.ProfileName !== "VIP")
      .map(r => ({ r, presence: !!(r.Occupied && r.Occupied !== "0"), watts: Number(r.Watts) || 0 }))
      .filter(x => x.presence || x.watts >= 100)
      .sort((a, b) => b.watts - a.watts);
    return { occupiedCount, vipCount, checkInCount, checkOutCount, lowBattery, withAlerts, tempIssues, floors, checkoutActive };
  }, [rooms]);

  const openHistory = async (room) => {
    setHistoryRoom({ RoomID: room.RoomID, RoomName: room.RoomName, loading: true, graphs: {}, startDate: null, endDate: null, dataLog: [], error: null });
    try {
      const headers = await authHeaders();
      const resp = await fetch(`/api/telkonet?action=history&roomId=${encodeURIComponent(room.RoomID)}`, { headers });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "No se pudo cargar el historial.");
      const h = data.history || {};
      setHistoryRoom({ RoomID: room.RoomID, RoomName: room.RoomName, loading: false, graphs: h.graphs || {}, startDate: h.startDate || null, endDate: h.endDate || null, dataLog: h.dataLog || [], error: null });
    } catch (e) {
      setHistoryRoom(h => h && ({ ...h, loading: false, error: e.message || "No se pudo cargar el historial." }));
    }
  };

  const confirmSetState = async () => {
    if (!stateRoom?.choice) return;
    setBusyRoomId(stateRoom.RoomID);
    try {
      const headers = await authHeaders();
      const resp = await fetch("/api/telkonet", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "setState",
          roomId: stateRoom.RoomID,
          profileTypeId: stateRoom.choice.id,
          profileTypeName: stateRoom.choice.name,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "Telkonet no confirmó el cambio.");
      let vipMsg = "";
      if (stateRoom.choice.name === "VIP" && vipTask && onCreateTasksBatch) {
        try {
          const room = String(stateRoom.RoomName || "").trim();
          await onCreateTasksBatch([{
            titulo: `Revisión VIP hab. ${room}`,
            descripcion: `Habitación ${room} puesta en VIP desde TelkHab — revisar el aire y el termostato antes de la llegada del huésped.`,
            prioridad: "media", asignadoA: "", origen: "vip-hab", roomKey: room,
            checklist: ["Probar que el aire enfríe y el termostato responda", "Revisar que no haya goteo ni ruido raro", "Limpiar o revisar el filtro", "Confirmar temperatura de confort (set point)", "Probar el control remoto o la pantalla"],
          }]);
          vipMsg = " Se creó la tarea de revisión VIP.";
        } catch { vipMsg = " (No se pudo crear la tarea de revisión.)"; }
      }
      setFlash({ ok: true, msg: `${stateRoom.RoomName}: estado cambiado a ${stateRoom.choice.name}.${vipMsg}` });
      setStateRoom(null);
      await load();
    } catch (e) {
      setFlash({ ok: false, msg: e.message || "No se pudo cambiar el estado." });
    } finally {
      setBusyRoomId(null);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  // ---- Rediseño: filtros, mapa por piso y hoja de detalle ----
  const [filter, setFilter] = useState("all"); // all | attention | range | alerts | battery | vip | in | out | occupied
  const [mapFloor, setMapFloor] = useState("");
  const [shown, setShown] = useState(40);
  const [detail, setDetail] = useState(null); // { room, loading, dataLog, error }
  const [updatedAt, setUpdatedAt] = useState(() => telkCache?.at || null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 15000); return () => clearInterval(t); }, []);
  const agoText = (ts) => {
    if (!ts) return "sin datos";
    const sec = Math.max(0, Math.round((nowTick - ts) / 1000));
    return sec < 60 ? `hace ${sec} s` : sec < 3600 ? `hace ${Math.round(sec / 60)} min` : `hace ${Math.round(sec / 3600)} h`;
  };
  const isOcc = (r) => !!(r.Occupied && r.Occupied !== "0");
  // Motivos por los que una habitación pide atención (los mismos umbrales del Resumen).
  const reasonsOf = (r) => {
    const out = [];
    const delta = (r.Temperature != null && r.UserSetPoint != null) ? Math.abs(Number(r.Temperature) - Number(r.UserSetPoint)) : null;
    if (delta != null && delta >= 6) out.push({ k: "range", label: `Δ ${delta.toFixed(0)} °F`, tone: "red", delta });
    if (Number(r.AlertCount || 0) > 0 || Number(r.TKOAlertCount || 0) > 0) out.push({ k: "alerts", label: `${Number(r.AlertCount || 0) + Number(r.TKOAlertCount || 0)} alerta(s)`, tone: "red" });
    if (r.BatteryPercent != null && Number(r.BatteryPercent) >= 0 && Number(r.BatteryPercent) < 30) out.push({ k: "battery", label: `Batería ${r.BatteryPercent}%`, tone: "amber" });
    if ((r.ProfileName || "").includes("Check OUT") && r.ProfileName !== "VIP" && (isOcc(r) || (Number(r.Watts) || 0) >= 100)) out.push({ k: "checkout", label: "Check OUT con presencia/consumo", tone: "amber" });
    return out;
  };
  const roomMeta = useMemo(() => {
    const m = new Map();
    rooms.forEach(r => m.set(r.RoomID, reasonsOf(r)));
    return m;
  }, [rooms]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    let range = 0, alerts = 0, battery = 0, attention = 0;
    rooms.forEach(r => {
      const rs = roomMeta.get(r.RoomID) || [];
      if (rs.some(x => x.k === "range")) range++;
      if (rs.some(x => x.k === "alerts")) alerts++;
      if (rs.some(x => x.k === "battery")) battery++;
      if (rs.length) attention++;
    });
    return { range, alerts, battery, attention };
  }, [rooms, roomMeta]);
  const matchesFilter = (r) => {
    const rs = roomMeta.get(r.RoomID) || [];
    const p = r.ProfileName || "";
    switch (filter) {
      case "attention": return rs.length > 0;
      case "range": return rs.some(x => x.k === "range");
      case "alerts": return rs.some(x => x.k === "alerts");
      case "battery": return rs.some(x => x.k === "battery");
      case "vip": return p === "VIP";
      case "in": return p.includes("Check IN");
      case "out": return p.includes("Check OUT") && p !== "VIP";
      case "occupied": return isOcc(r);
      default: return true;
    }
  };
  const listRooms = useMemo(
    () => filtered.filter(matchesFilter).sort((a, b) => String(a.RoomName).localeCompare(String(b.RoomName), "es", { numeric: true })),
    [filtered, filter, roomMeta] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const attentionRooms = useMemo(
    () => (filter === "all" && !searchNorm ? rooms.filter(r => (roomMeta.get(r.RoomID) || []).length > 0)
      .sort((a, b) => ((roomMeta.get(b.RoomID) || []).length - (roomMeta.get(a.RoomID) || []).length) || String(a.RoomName).localeCompare(String(b.RoomName), "es", { numeric: true })) : []),
    [rooms, roomMeta, filter, searchNorm]
  );
  const floorsList = dashboard.floors.filter(f => f.floor !== "otro");
  const activeFloor = mapFloor || (floorsList[0]?.floor || "");
  const mapRooms = useMemo(
    () => rooms.filter(r => (String(r.RoomName || "").match(/^(\d{1,2})\d{2}/) || [])[1] === activeFloor)
      .sort((a, b) => String(a.RoomName).localeCompare(String(b.RoomName), "es", { numeric: true })),
    [rooms, activeFloor]
  );
  const mapColor = (r) => {
    const rs = roomMeta.get(r.RoomID) || [];
    if (rs.some(x => x.tone === "red")) return { bg: "#f4a3a3", bd: "#b42318", ink: "#4a0d0a" };
    if (rs.length) return { bg: "#fcd9a0", bd: "#c98a1b", ink: "#4a2f00" };
    if ((r.ProfileName || "") === "VIP") return { bg: "#d8c7f5", bd: "#8b5cf6", ink: "#2e1065" };
    if (isOcc(r)) return { bg: "#bfe3f7", bd: "#38a1d6", ink: "#07324a" };
    return { bg: "#e3e9f0", bd: "#c5d1de", ink: "#35506a" };
  };
  const openDetail = async (room) => {
    setDetail({ room, loading: true, dataLog: [], error: null });
    try {
      const headers = await authHeaders();
      const resp = await fetch(`/api/telkonet?action=history&roomId=${encodeURIComponent(room.RoomID)}`, { headers });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "No se pudo cargar la tendencia.");
      setDetail(d => d && d.room.RoomID === room.RoomID ? { ...d, loading: false, dataLog: (data.history && data.history.dataLog) || [] } : d);
    } catch (e) {
      setDetail(d => d && d.room.RoomID === room.RoomID ? { ...d, loading: false, error: e.message || "No se pudo cargar la tendencia." } : d);
    }
  };
  const roomWork = (name) => {
    const n = String(name || "").trim();
    const by = {};
    (tasks || []).forEach(t => {
      if (roomOfTask(t) !== n) return;
      const g = planGroupOf(`${t.titulo || ""} ${t.descripcion || ""}`, categoryOfTask(t));
      by[g] = (by[g] || 0) + 1;
    });
    return by;
  };
  const pill = (tone) => tone === "red" ? { background: C.redSoft, color: C.red } : { background: C.amberSoft, color: C.amber };

  return (
    <div>
      <div className="relative rounded-2xl p-4 mb-3 overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.steel} 0%, ${C.steelDark} 100%)`, isolation: "isolate" }}>
        <div className="absolute inset-0" style={{ zIndex: -1, pointerEvents: "none", opacity: 0.55 }}><PcbBackground variant="home" /></div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>TelkHab</h2>
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "#c3d0dd" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: loading ? C.amber : "#38bdf8", display: "inline-block", boxShadow: "0 0 0 0 rgba(56,189,248,.6)", animation: loading ? "none" : "pmLive 2s ease-out infinite" }} />
              {loading ? "Actualizando…" : `Datos ${agoText(updatedAt)}`} · {rooms.length} habitaciones
            </div>
          </div>
          <button onClick={load} disabled={loading} aria-label="Actualizar ahora" className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)", color: "#fff" }}>
            <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <style>{`@keyframes pmLive{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.6)}70%{box-shadow:0 0 0 7px rgba(56,189,248,0)}}`}</style>
      </div>

      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { k: "range", n: counts.range, label: "Fuera de rango", color: C.red, bd: "#f2c2c2" },
            { k: "alerts", n: counts.alerts, label: "Con alertas", color: C.amber, bd: "#f1d9a8" },
            { k: "battery", n: counts.battery, label: "Batería baja", color: C.ink, bd: C.line },
            { k: "occupied", n: dashboard.occupiedCount, label: `Ocupadas / ${rooms.length}`, color: C.ink, bd: C.line },
          ].map(t => (
            <button key={t.k} onClick={() => { setViewMode("list"); setFilter(f => f === t.k ? "all" : t.k); setShown(40); }} aria-pressed={filter === t.k}
              className="rounded-xl text-left px-2.5 py-2" style={{ background: C.panel, border: `${filter === t.k ? 2 : 1}px solid ${filter === t.k ? C.blue : t.bd}`, minHeight: 64 }}>
              <div className="text-xl font-bold tabular-nums leading-none" style={{ color: t.n > 0 && t.k !== "occupied" ? t.color : C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{t.n}</div>
              <div className="text-[11px] mt-1 leading-tight" style={{ color: C.inkSoft }}>{t.label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="flex rounded-xl p-0.5 mb-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        {[["list", "Lista"], ["map", "Mapa por piso"], ["dashboard", "Resumen"]].map(([id, label]) => (
          <button key={id} onClick={() => setViewMode(id)} className="flex-1 text-sm font-semibold rounded-[10px]" style={{ minHeight: 40, background: viewMode === id ? C.steelDark : "transparent", color: viewMode === id ? "#fff" : C.inkSoft }}>{label}</button>
        ))}
      </div>

      {flash && (
        <div className="rounded-md px-3 py-2 text-sm mb-3" style={{ background: flash.ok ? C.greenSoft || "#dcfce7" : C.redSoft, color: flash.ok ? C.green : C.red }}>
          {flash.msg}
        </div>
      )}

      {isAdmin && onCreateTasksBatch && rooms.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <button onClick={() => setShowPrev(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.ink }}>
            <span>Plan preventivo de aires · {prevPlan.due.length} por revisar</span><span className="text-xs" style={{ color: C.gray }}>{showPrev ? "Ocultar" : "Abrir"}</span>
          </button>
          <div className="mt-2 rounded" style={{ height: 8, background: C.line, overflow: "hidden" }}><div style={{ width: `${rooms.length ? Math.round(((rooms.length - prevPlan.due.length) / rooms.length) * 100) : 0}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#2563eb)" }} /></div>
          <div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>{rooms.length - prevPlan.due.length} de {rooms.length} al día (meta: {prevMonths} meses)</div>
          {showPrev && (
            <div className="mt-2 text-xs space-y-2" style={{ color: C.inkSoft }}>
              <p>Habitaciones sin revisión de aire en los últimos meses. Crea un lote con los pasos ya cargados (filtro, drenaje, enfriamiento). {prevPlan.openCount > 0 ? `Ya hay ${prevPlan.openCount} abiertas.` : ""}</p>
              <div className="flex gap-2 flex-wrap items-center">
                <select value={prevMonths} onChange={e => { setPrevMonths(Number(e.target.value)); setPrevConfirm(false); }} className="border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value={3}>Más de 3 meses</option><option value={6}>Más de 6 meses</option><option value={12}>Más de 12 meses</option>
                </select>
                <select value={prevCount} onChange={e => { setPrevCount(Number(e.target.value)); setPrevConfirm(false); }} className="border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value={10}>Lote de 10</option><option value={20}>Lote de 20</option><option value={40}>Lote de 40</option>
                </select>
                <select value={prevAssignee} onChange={e => { setPrevAssignee(e.target.value); setPrevConfirm(false); }} className="border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Sin asignar</option>
                  {Object.keys(accounts || {}).filter(u => accounts[u]?.approved !== false && !accounts[u]?.is_viewer && !accounts[u]?.is_gerencia).map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
                </select>
              </div>
              {prevPlan.due.length === 0 ? <div style={{ color: C.green }}>Todas las habitaciones están al día.</div> : (
                <>
                  <div>Próximas: {prevPlan.due.slice(0, Math.min(prevCount, 12)).join(", ")}{prevPlan.due.length > 12 ? "…" : ""}</div>
                  {!prevConfirm ? (
                    <Button size="sm" onClick={() => setPrevConfirm(true)}>Crear {Math.min(prevCount, prevPlan.due.length)} tareas</Button>
                  ) : (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="font-semibold" style={{ color: C.ink }}>¿Crear {Math.min(prevCount, prevPlan.due.length)} tareas ahora?</span>
                      <Button size="sm" disabled={prevBusy} onClick={generatePrev}>{prevBusy ? "Creando…" : "Sí, crear"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setPrevConfirm(false)}>Cancelar</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {loading && <SkeletonRows rows={4} />}
      {error && !loading && (
        <div className="rounded-md px-3 py-2 text-sm mb-3" style={{ background: C.redSoft, color: C.red }}>
          {error} <button className="underline ml-1" onClick={load}>Reintentar</button>
        </div>
      )}

      {!loading && !error && viewMode === "dashboard" && (
        <div className="pm-tab-in space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 flex items-center gap-4" style={{ borderColor: C.line, background: C.panel }}>
              <MiniDonut
                size={96} stroke={16}
                segments={[
                  { name: "Ocupadas", value: dashboard.occupiedCount, color: "#3b82f6" },
                  { name: "Desocupadas", value: rooms.length - dashboard.occupiedCount, color: C.gray },
                ]}
                centerValue={dashboard.occupiedCount} centerLabel="ocupadas"
              />
              <div className="text-sm" style={{ color: C.inkSoft }}>
                <div><b style={{ color: C.ink }}>{dashboard.occupiedCount}</b> de {rooms.length} habitaciones ocupadas</div>
                <div className="mt-1">{rooms.length - dashboard.occupiedCount} desocupadas</div>
              </div>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.inkSoft }}>Estados activos</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span style={{ color: C.inkSoft }}>Check IN</span><b style={{ color: C.ink }}>{dashboard.checkInCount}</b></div>
                <div className="flex justify-between"><span style={{ color: C.inkSoft }}>Check OUT</span><b style={{ color: C.ink }}>{dashboard.checkOutCount}</b></div>
                <div className="flex justify-between"><span style={{ color: C.purple }}>VIP</span><b style={{ color: C.ink }}>{dashboard.vipCount}</b></div>
              </div>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.inkSoft }}>Señales de mantenimiento</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span style={{ color: C.inkSoft }}>Temp. fuera de rango (≥6°F del set point)</span><b style={{ color: dashboard.tempIssues.length ? C.red : C.ink }}>{dashboard.tempIssues.length}</b></div>
                <div className="flex justify-between"><span style={{ color: C.inkSoft }}>Batería baja (&lt;30%)</span><b style={{ color: dashboard.lowBattery.length ? C.red : C.ink }}>{dashboard.lowBattery.length}</b></div>
                <div className="flex justify-between"><span style={{ color: C.inkSoft }}>Con alertas</span><b style={{ color: dashboard.withAlerts.length ? C.red : C.ink }}>{dashboard.withAlerts.length}</b></div>
              </div>
            </div>
          </div>

          {dashboard.floors.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-3" style={{ color: C.inkSoft }}>Ocupación por piso</div>
              <HorizontalBarChart data={dashboard.floors} labelKey="floor" valueKey="occupied" max={Math.max(...dashboard.floors.map(f => f.total), 1)}
                colorFor={() => "#3b82f6"} formatValue={(v, d) => `${v}/${d.total}`} />
            </div>
          )}

          {dashboard.tempIssues.length > 0 && (() => {
            const isOccRow = ({ r }) => !!(r.Occupied && r.Occupied !== "0");
            const occ = dashboard.tempIssues.filter(isOccRow);
            const empty = dashboard.tempIssues.filter(x => !isOccRow(x));
            const row = ({ r, delta }) => (
              <div key={r.RoomID} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                <span style={{ color: C.ink }}>{r.RoomName}</span>
                <span style={{ color: C.inkSoft }}>{r.Temperature}°F / set {Number(r.UserSetPoint)}°F</span>
                <span className="font-semibold" style={{ color: C.red }}>Δ {delta.toFixed(1)}°F</span>
              </div>
            );
            return (
              <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>Habitaciones con temperatura fuera de rango ahora mismo</div>
                <p className="text-[11px] mb-2" style={{ color: C.gray }}>Diferencia entre temperatura actual y set point de 6°F o más — candidatas a revisión de equipo.</p>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.red }}>Ocupadas — hay un huésped ahí ({occ.length})</div>
                <div className="space-y-1 mb-3">
                  {occ.length === 0 ? <div className="text-xs" style={{ color: C.gray }}>Ninguna ahora mismo.</div> : occ.slice(0, 20).map(row)}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Vacías — pueden esperar ({empty.length})</div>
                <div className="space-y-1">
                  {empty.length === 0 ? <div className="text-xs" style={{ color: C.gray }}>Ninguna ahora mismo.</div> : empty.slice(0, 20).map(row)}
                </div>
              </div>
            );
          })()}

          {(() => {
            const rep = (maintenanceReport?.rows || []).filter(x => Number(x.hot_days) >= 3).sort((a, b) => Number(b.hot_days) - Number(a.hot_days));
            if (!rep.length) return null;
            return (
              <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>Calientes varios días seguidos ({rep.length})</div>
                <p className="text-[11px] mb-2" style={{ color: C.gray }}>Habitaciones que en 3 o más de los últimos 7 días pasaron buena parte del día 6°F o más por encima de su objetivo — el problema no se está resolviendo solo.</p>
                <div className="space-y-1">
                  {rep.slice(0, 20).map(x => (
                    <div key={x.room_id} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                      <span style={{ color: C.ink }}>{x.room_name}</span>
                      <span style={{ color: C.inkSoft }}>{String(x.hot_days_list || "").split(",").filter(Boolean).map(d => d.slice(5)).join(" · ")}</span>
                      <span className="font-semibold" style={{ color: C.red }}>{x.hot_days} días</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {dashboard.checkoutActive.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>Check OUT con presencia o consumo ({dashboard.checkoutActive.length})</div>
              <p className="text-[11px] mb-2" style={{ color: C.gray }}>Habitaciones que figuran vacías (Check OUT) pero detectan presencia o consumo de energía — pueden estar gastando aire sin necesidad.</p>
              <div className="space-y-1">
                {dashboard.checkoutActive.slice(0, 20).map(({ r, presence, watts }) => (
                  <div key={r.RoomID} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.amberSoft }}>
                    <span style={{ color: C.ink }}>{r.RoomName}</span>
                    <span style={{ color: C.inkSoft }}>{r.Temperature != null ? `${r.Temperature}°F / set ${Number(r.UserSetPoint)}°F` : ""}</span>
                    <span className="font-semibold" style={{ color: C.amber }}>{[presence ? "presencia" : "", watts >= 100 ? `${Math.round(watts)} W` : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dashboard.lowBattery.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.inkSoft }}>Batería baja</div>
              <div className="space-y-1">
                {dashboard.lowBattery.slice(0, 20).map(r => (
                  <div key={r.RoomID} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                    <span style={{ color: C.ink }}>{r.RoomName}</span>
                    <span className="font-semibold" style={{ color: C.red }}>{r.BatteryPercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dashboard.withAlerts.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.inkSoft }}>Habitaciones con alertas</div>
              <div className="space-y-1">
                {dashboard.withAlerts.slice(0, 20).map(r => (
                  <div key={r.RoomID} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                    <span style={{ color: C.ink }}>{r.RoomName}</span>
                    <span style={{ color: C.inkSoft }}>{Number(r.AlertCount || 0)} alerta(s) · {Number(r.TKOAlertCount || 0)} TKO</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold" style={{ color: C.inkSoft }}>Mantenimiento recomendado (últimos ~7 días)</div>
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={loadMaintenanceReport} disabled={maintenanceReport.loading}>Actualizar</Button>
            </div>
            <p className="text-[11px] mb-2" style={{ color: C.gray }}>
              Habitaciones cuya temperatura estuvo fuera de rango (6°F o más del set point) en al menos el 25% de las lecturas de la última semana — buenas candidatas para revisar el equipo.
              Este número se calcula una vez al día en segundo plano, no en vivo, por eso puede tardar un día en reflejar habitaciones nuevas.
            </p>
            {maintenanceReport.loading && <SkeletonRows rows={3} />}
            {maintenanceReport.error && !maintenanceReport.loading && (
              <div className="rounded-md px-3 py-2 text-sm" style={{ background: C.redSoft, color: C.red }}>
                {maintenanceReport.error} <button className="underline ml-1" onClick={loadMaintenanceReport}>Reintentar</button>
              </div>
            )}
            {!maintenanceReport.loading && !maintenanceReport.error && (
              maintenanceReport.rows.length === 0 ? (
                <div className="text-sm text-center py-4" style={{ color: C.gray }}>
                  Todavía no hay datos — el proceso en segundo plano corre una vez al día y puede tardar unos días en cubrir las 361 habitaciones.
                </div>
              ) : (() => {
                const flagged = maintenanceReport.rows.filter(r => r.needs_maintenance).sort((a, b) => (b.out_of_range_pct || 0) - (a.out_of_range_pct || 0));
                return flagged.length === 0 ? (
                  <div className="text-sm text-center py-4" style={{ color: C.gray }}>Ninguna habitación supera el umbral esta semana. 👍</div>
                ) : (
                  <div className="space-y-1">
                    {flagged.slice(0, 20).map(r => (
                      <div key={r.room_id} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                        <span style={{ color: C.ink }}>{r.room_name}</span>
                        <span style={{ color: C.inkSoft }}>{Number(r.out_of_range_count)} de {Number(r.total_readings)} lecturas fuera de rango</span>
                        <span className="font-semibold" style={{ color: C.red }}>{Number(r.out_of_range_pct).toFixed(0)}%</span>
                        {onCreateTask && (telkTaskByRoom[String(r.room_name || "").trim()]
                          ? <span className="font-semibold" style={{ color: C.green }}>✓ Tarea</span>
                          : <button disabled={creatingRoom === r.room_id} onClick={() => createMaintTask(r)} className="font-semibold rounded-md border px-2" style={{ borderColor: C.red, color: C.red, background: C.panel, minHeight: 32 }}>Crear tarea</button>)}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
            {!maintenanceReport.loading && !maintenanceReport.error && maintenanceReport.rows.length > 0 && (
              <p className="text-[11px] mt-2" style={{ color: C.gray }}>
                {maintenanceReport.rows.length} de {rooms.length} habitaciones ya revisadas · última actualización: {maintenanceReport.newestScan ? new Date(maintenanceReport.newestScan).toLocaleString() : "—"}
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && viewMode === "list" && (
        <>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setShown(40); }} placeholder="Habitación (3615) o estado (VIP, Check IN…)" aria-label="Buscar habitación"
            className="w-full text-sm border rounded-xl px-3 outline-none mb-2" style={{ minHeight: 46, borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
            {[["all", "Todas"], ["attention", `Necesitan atención · ${counts.attention}`], ["vip", `VIP · ${dashboard.vipCount}`], ["in", `Check IN · ${dashboard.checkInCount}`], ["out", `Check OUT · ${dashboard.checkOutCount}`], ["occupied", "Ocupadas"]].map(([id, label]) => (
              <button key={id} onClick={() => { setFilter(id); setShown(40); }} className="shrink-0 text-xs font-semibold rounded-full px-3" style={{ minHeight: 36, background: filter === id ? C.steelDark : C.panel, color: filter === id ? "#fff" : C.inkSoft, border: `1px solid ${filter === id ? C.steelDark : C.line}` }}>{label}</button>
            ))}
          </div>

          {attentionRooms.length > 0 && (
            <div className="pm-tab-in mb-4">
              <div className="flex items-baseline justify-between mb-2 mt-1">
                <div className="text-[13px] font-bold uppercase" style={{ color: C.red, letterSpacing: "0.12em", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Necesitan atención</div>
                <div className="text-xs" style={{ color: C.inkSoft }}>{attentionRooms.length} habitaciones</div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {attentionRooms.slice(0, 6).map(r => {
                  const rs = roomMeta.get(r.RoomID) || [];
                  const rangeR = rs.find(x => x.k === "range");
                  const tone = hvacStateTone(r.ProfileName);
                  const sp = r.UserSetPoint != null ? Number(r.UserSetPoint) : null;
                  const tp = r.Temperature != null ? Number(r.Temperature) : null;
                  const pct = (v) => Math.max(2, Math.min(98, ((v - 55) / 40) * 100));
                  return (
                    <div key={r.RoomID} className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${rs.some(x => x.tone === "red") ? "#f0b4b4" : "#f0d9a6"}` }}>
                      <button onClick={() => openDetail(r)} className="w-full text-left">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{r.RoomName}</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tone.bg, color: tone.color }}>{r.ProfileName || "—"}</span>
                          </div>
                          {rangeR && <span className="text-xs font-bold px-2 py-1 rounded-lg" style={pill("red")}>{rangeR.label}</span>}
                        </div>
                        {tp != null && sp != null && (
                          <div className="flex items-center gap-3 mt-2">
                            <div><div className="text-2xl font-bold leading-none tabular-nums" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{tp}°<span className="text-xs font-medium" style={{ color: C.inkSoft }}>F</span></div><div className="text-[11px]" style={{ color: C.inkSoft }}>ambiente</div></div>
                            <div className="flex-1">
                              <div className="relative rounded" style={{ height: 8, background: "linear-gradient(90deg,#7dd3fc,#d9e6f2 45%,#fca5a5)" }}>
                                <div style={{ position: "absolute", left: `${pct(sp)}%`, top: -4, width: 3, height: 16, borderRadius: 2, background: "#0e2d4a" }} />
                                <div style={{ position: "absolute", left: `calc(${pct(tp)}% - 7px)`, top: -5, width: 14, height: 18, borderRadius: 7, background: rangeR ? "#b42318" : "#2563eb", border: "2px solid #fff", boxSizing: "border-box" }} />
                              </div>
                              <div className="text-[11px] mt-2" style={{ color: C.inkSoft }}>objetivo {sp}°F</div>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rs.filter(x => x.k !== "range").map(x => <span key={x.k} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={pill(x.tone)}>{x.label}</span>)}
                          {(hotsosByRoom[String(r.RoomName || "").trim()] || []).length > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.purpleSoft, color: C.purple }}>{(hotsosByRoom[String(r.RoomName || "").trim()] || []).length} orden(es) HotSOS</span>}
                        </div>
                      </button>
                      <div className="flex gap-2 mt-3">
                        {onCreateTask && (telkTaskByRoom[String(r.RoomName || "").trim()]
                          ? <span className="flex-1 text-center text-xs font-semibold rounded-xl flex items-center justify-center" style={{ minHeight: 44, color: C.green, border: `1px solid ${C.line}` }}>✓ Tarea abierta</span>
                          : <button disabled={creatingRoom === r.RoomID} onClick={() => createRoomTask(r)} className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>{creatingRoom === r.RoomID ? "Creando…" : "Crear tarea"}</button>)}
                        <button onClick={() => openDetail(r)} className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: C.panel, color: C.ink, border: `1px solid ${C.line}` }}>Ver detalle</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {attentionRooms.length > 6 && <button onClick={() => setFilter("attention")} className="w-full mt-2 text-sm font-semibold rounded-xl" style={{ minHeight: 44, color: C.blue, border: `1px dashed ${C.line}` }}>Ver las {attentionRooms.length} que necesitan atención →</button>}
            </div>
          )}

          <div className="flex items-baseline justify-between mb-2 mt-1">
            <div className="text-[13px] font-bold uppercase" style={{ color: C.inkSoft, letterSpacing: "0.12em", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{filter === "all" ? "Todas" : "Resultados"}</div>
            <div className="text-xs" style={{ color: C.inkSoft }}>{listRooms.length} de {rooms.length}</div>
          </div>
          <div className="rounded-2xl overflow-hidden pm-tab-in" style={{ border: `1px solid ${C.line}`, background: C.panel }}>
            {listRooms.slice(0, shown).map((r, i) => {
              const tone = hvacStateTone(r.ProfileName);
              const rs = roomMeta.get(r.RoomID) || [];
              const sp = r.UserSetPoint != null ? Number(r.UserSetPoint) : null;
              return (
                <button key={r.RoomID} onClick={() => openDetail(r)} className="w-full flex items-center gap-2.5 px-3 text-left" style={{ minHeight: 60, borderTop: i > 0 ? `1px solid ${C.line}` : "none", background: "transparent" }}>
                  <span style={{ width: 6, alignSelf: "stretch", margin: "8px 0", borderRadius: 3, background: rs.length ? (rs.some(x => x.tone === "red") ? "#ef4444" : "#f59e0b") : isOcc(r) ? "#0ea5e9" : "#cbd5e1" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{r.RoomName}</div>
                    <div className="text-xs truncate" style={{ color: C.inkSoft }}>{isOcc(r) ? "Ocupada" : "Vacía"} · {r.Temperature != null ? `${r.Temperature}°` : "—"} / {sp != null ? `${sp}°` : "—"}{rs.length ? ` · ${rs[0].label}` : ""}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: tone.bg, color: tone.color }}>{r.ProfileName || "—"}</span>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: C.inkSoft, width: 34, textAlign: "right" }}>{r.BatteryPercent != null ? `${r.BatteryPercent}%` : "—"}</span>
                </button>
              );
            })}
          </div>
          {listRooms.length > shown && <button onClick={() => setShown(n => n + 50)} className="w-full mt-2 text-sm font-semibold rounded-xl" style={{ minHeight: 44, color: C.inkSoft, border: `1px dashed ${C.line}` }}>Cargar 50 más ({listRooms.length - shown} restantes)</button>}
          {listRooms.length === 0 && <div className="text-sm text-center py-8" style={{ color: C.gray }}>Sin resultados{search ? ` para "${search}"` : ""}.</div>}
        </>
      )}

      {!loading && !error && viewMode === "map" && (
        <div className="pm-tab-in">
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {floorsList.map(f => (
              <button key={f.floor} onClick={() => setMapFloor(f.floor)} className="shrink-0 text-sm font-semibold rounded-lg px-3.5" style={{ minHeight: 40, background: f.floor === activeFloor ? C.steelDark : C.panel, color: f.floor === activeFloor ? "#fff" : C.inkSoft, border: `1px solid ${f.floor === activeFloor ? C.steelDark : C.line}` }}>Piso {f.floor}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] my-2" style={{ color: C.inkSoft }}>
            {[["#bfe3f7", "Ocupada"], ["#e3e9f0", "Vacía"], ["#d8c7f5", "VIP"], ["#fcd9a0", "Revisar"], ["#f4a3a3", "Fuera de rango / alerta"]].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><i style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />{l}</span>)}
          </div>
          <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))" }}>
              {mapRooms.map(r => { const c = mapColor(r); const hasRed = (roomMeta.get(r.RoomID) || []).some(x => x.tone === "red"); return (
                <button key={r.RoomID} onClick={() => openDetail(r)} aria-label={`Habitación ${r.RoomName}`}
                  className="rounded-lg font-bold" style={{ minHeight: 52, background: c.bg, color: c.ink, border: `${hasRed ? 2 : 1}px solid ${c.bd}`, fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 12 }}>
                  {r.RoomName}
                  <div className="text-[10px] font-medium" style={{ opacity: 0.8 }}>{r.Temperature != null ? `${r.Temperature}°` : "—"}</div>
                </button>); })}
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color: C.inkSoft }}>Piso {activeFloor}: {mapRooms.length} habitaciones · {mapRooms.filter(r => (roomMeta.get(r.RoomID) || []).length).length} piden atención</div>
        </div>
      )}

      {detail && (() => {
        const r = rooms.find(x => x.RoomID === detail.room.RoomID) || detail.room;
        const rs = roomMeta.get(r.RoomID) || [];
        const tone = hvacStateTone(r.ProfileName);
        const work = roomWork(r.RoomName);
        const pts = (detail.dataLog || []).slice(0, 96).slice().reverse().filter(p => p.temperature != null);
        const temps = pts.map(p => Number(p.temperature)); const sps = pts.map(p => Number(p.userSetPoint)).filter(v => !Number.isNaN(v));
        const all = [...temps, ...sps]; const lo = all.length ? Math.min(...all) - 2 : 0; const hi = all.length ? Math.max(...all) + 2 : 1;
        const X = (i) => pts.length > 1 ? (i / (pts.length - 1)) * 326 : 0; const Y = (v) => 110 - ((v - lo) / (hi - lo || 1)) * 100;
        const line = temps.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
        const spNow = r.UserSetPoint != null ? Number(r.UserSetPoint) : null;
        const rising = temps.length > 8 && spNow != null && temps.slice(-8).every(v => v - spNow >= 5);
        return (
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" style={{ background: "rgba(2,8,15,.55)" }} onClick={() => setDetail(null)}>
            <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-4 overflow-y-auto" style={{ background: C.panel, color: C.ink, maxHeight: "88vh", border: `1px solid ${C.line}` }} onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-2" style={{ width: 44, height: 5, borderRadius: 3, background: C.line }} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-2xl font-bold leading-none" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Habitación {r.RoomName}</div>
                  <div className="text-xs mt-1.5 flex items-center gap-2" style={{ color: C.inkSoft }}><span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: tone.bg, color: tone.color }}>{r.ProfileName || "—"}</span>{isOcc(r) ? "Ocupada" : "Vacía"} · datos {agoText(updatedAt)}</div>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Cerrar" className="rounded-full flex items-center justify-center" style={{ width: 44, height: 44, background: C.bg }}><X size={18} /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-xl p-2.5" style={{ background: rs.some(x => x.k === "range") ? C.redSoft : C.bg }}><div className="text-2xl font-bold leading-none tabular-nums" style={{ color: rs.some(x => x.k === "range") ? C.red : C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{r.Temperature != null ? `${r.Temperature}°F` : "—"}</div><div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>ambiente</div></div>
                <div className="rounded-xl p-2.5" style={{ background: C.bg }}><div className="text-2xl font-bold leading-none tabular-nums" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{spNow != null ? `${spNow}°F` : "—"}</div><div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>objetivo</div></div>
                <div className="rounded-xl p-2.5" style={{ background: C.bg }}><div className="text-2xl font-bold leading-none tabular-nums" style={{ color: r.BatteryPercent != null && Number(r.BatteryPercent) < 30 ? C.red : C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{r.BatteryPercent != null ? `${r.BatteryPercent}%` : "—"}</div><div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>batería</div></div>
              </div>

              <div className="rounded-2xl p-3 mt-3" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex items-baseline justify-between"><div className="text-[13px] font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Tendencia reciente</div><div className="text-[11px]" style={{ color: C.inkSoft }}>línea punteada = objetivo</div></div>
                {detail.loading && <SkeletonRows rows={2} />}
                {detail.error && <div className="text-xs mt-2" style={{ color: C.red }}>{detail.error}</div>}
                {!detail.loading && !detail.error && pts.length < 2 && <div className="text-xs py-4 text-center" style={{ color: C.gray }}>Todavía no hay suficientes lecturas.</div>}
                {!detail.loading && pts.length >= 2 && (
                  <>
                    <svg viewBox="0 0 326 120" role="img" aria-label={`Temperatura de las últimas ${pts.length} lecturas`} style={{ width: "100%", height: "auto", marginTop: 6 }}>
                      {spNow != null && <line x1="0" x2="326" y1={Y(spNow)} y2={Y(spNow)} stroke={C.steelDark} strokeWidth="1.5" strokeDasharray="4 4" />}
                      <path d={line} fill="none" stroke={rising ? "#b42318" : "#2563eb"} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
                      <circle cx={X(temps.length - 1)} cy={Y(temps[temps.length - 1])} r="4.5" fill={rising ? "#b42318" : "#2563eb"} stroke="#fff" strokeWidth="2" />
                    </svg>
                    <div className="flex justify-between text-[11px]" style={{ color: C.inkSoft }}><span>{pts[0].dateTime}</span><span>ahora</span></div>
                    {rising && <div className="mt-2 text-xs rounded-lg px-2.5 py-2" style={{ background: C.redSoft, color: C.red }}>Lleva varias lecturas 5 °F o más por encima del objetivo. Posible falla del equipo.</div>}
                  </>
                )}
              </div>

              {rs.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{rs.map(x => <span key={x.k} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={pill(x.tone)}>{x.label}</span>)}</div>}

              {canControl && (
                <>
                  <div className="text-[12px] font-bold uppercase mt-4 mb-2" style={{ color: C.inkSoft, letterSpacing: "0.1em", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Estado de la habitación</div>
                  <div className="flex gap-2">
                    {profileTypes.filter(p => /^(VIP|Check IN|Check OUT)/i.test(p.name)).slice(0, 4).map(p => {
                      const on = (r.ProfileName || "") === p.name;
                      return <button key={p.id} disabled={on || busyRoomId === r.RoomID} onClick={() => setStateRoom({ RoomID: r.RoomID, RoomName: r.RoomName, current: r.ProfileName, choice: p })}
                        className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: on ? C.steelDark : C.panel, color: on ? "#fff" : C.ink, border: `1px solid ${on ? C.steelDark : C.line}` }}>{p.name}</button>;
                    })}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: C.gray }}>Pide confirmación antes de cambiar: mueve el aire real de la habitación.</div>
                </>
              )}

              <div className="text-[12px] font-bold uppercase mt-4 mb-2" style={{ color: C.inkSoft, letterSpacing: "0.1em", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Mantenimiento de esta habitación</div>
              <div className="grid grid-cols-3 gap-2">
                {["Aire / HVAC", "Pintura", "Hidráulico"].map(g => (
                  <div key={g} className="rounded-xl p-2.5" style={{ border: `1px solid ${C.line}`, background: work[g] ? `${planColorOf(g)}14` : C.bg }}>
                    <div className="text-[11px] font-semibold" style={{ color: planColorOf(g) }}>{g}</div>
                    <div className="text-xl font-bold leading-tight tabular-nums">{work[g] || 0}</div>
                    <div className="text-[10.5px]" style={{ color: C.inkSoft }}>{work[g] ? "registros" : "ninguno"}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                {onCreateTask && (telkTaskByRoom[String(r.RoomName || "").trim()]
                  ? <span className="flex-1 text-center text-sm font-semibold rounded-xl flex items-center justify-center" style={{ minHeight: 48, color: C.green, border: `1px solid ${C.line}` }}>✓ Tarea abierta</span>
                  : <button disabled={creatingRoom === r.RoomID} onClick={() => createRoomTask(r)} className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 48, background: C.steelDark, color: "#fff" }}>{creatingRoom === r.RoomID ? "Creando…" : "Crear tarea"}</button>)}
                <button onClick={() => { const rr = r; setDetail(null); openHistory(rr); }} className="text-sm font-semibold rounded-xl px-4" style={{ minHeight: 48, background: C.panel, color: C.ink, border: `1px solid ${C.line}` }}>Historial</button>
                {onNavigate && <button onClick={() => { setDetail(null); onNavigate("floorplans"); }} className="text-sm font-semibold rounded-xl px-4" style={{ minHeight: 48, background: C.panel, color: C.ink, border: `1px solid ${C.line}` }}>Plano</button>}
              </div>
              <button onClick={() => setExpandedRoomId(id => id === r.RoomID ? null : r.RoomID)} className="w-full text-xs font-semibold mt-3" style={{ color: C.inkSoft, minHeight: 36 }}>{expandedRoomId === r.RoomID ? "Menos datos técnicos" : "Más datos técnicos"}</button>
              {expandedRoomId === r.RoomID && (
                <div className="pt-2 border-t grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" style={{ borderColor: C.line, color: C.inkSoft }}>
                  <span>Config. HVAC: <b style={{ color: C.ink }}>{r.HVACConfigName || "—"}</b></span>
                  <span>Termostatos: <b style={{ color: C.ink }}>{r.NumThermostat ?? "—"}</b></span>
                  <span>EcoGuard: <b style={{ color: C.ink }}>{r.NumEcoGuard ?? "—"}</b></span>
                  <span>EcoSwitch: <b style={{ color: C.ink }}>{r.NumEcoSwitch ?? "—"}</b></span>
                  <span>Alertas TKO: <b style={{ color: Number(r.TKOAlertCount) > 0 ? C.red : C.ink }}>{r.TKOAlertCount ?? "—"}</b></span>
                  <span>Cola de comandos: <b style={{ color: C.ink }}>{r.CommandQueueCount ?? "—"}</b></span>
                  <span>Volts: <b style={{ color: C.ink }}>{r.Volts ?? "—"}</b></span><span>Amps: <b style={{ color: C.ink }}>{r.Amps ?? "—"}</b></span><span>Watts: <b style={{ color: C.ink }}>{r.Watts ?? "—"}</b></span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Confirmación antes de cambiar el estado — esto mueve equipo real del hotel. */}
      {stateRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setStateRoom(null)}>
          <div className="rounded-xl max-w-sm w-full p-5" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} color={C.amber} />
              <h3 className="text-base font-semibold" style={{ color: C.ink }}>Confirmar cambio de estado</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
              Vas a cambiar la habitación <b>{stateRoom.RoomName}</b> de <b>{stateRoom.current || "—"}</b> a <b>{stateRoom.choice.name}</b>.
              Esto cambia de verdad el aire acondicionado de esa habitación — confirma solo si estás seguro.
            </p>
            {stateRoom.choice.name === "VIP" && onCreateTasksBatch && (
              <label className="flex items-start gap-2 text-xs mb-4 cursor-pointer" style={{ color: C.ink }}>
                <input type="checkbox" checked={vipTask} onChange={e => setVipTask(e.target.checked)} style={{ marginTop: 2 }} />
                <span>Crear una tarea de revisión previa con checklist (aire, termostato, filtro, goteo) para que quede lista antes del huésped.</span>
              </label>
            )}
            <div className="flex items-center gap-2">
              <Button onClick={confirmSetState} disabled={busyRoomId === stateRoom.RoomID}>
                {busyRoomId === stateRoom.RoomID ? "Cambiando…" : "Sí, cambiar"}
              </Button>
              <Button variant="ghost" onClick={() => setStateRoom(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de la habitación */}
      {historyRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setHistoryRoom(null)}>
          <div className="rounded-xl max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold" style={{ color: C.ink }}>Historial — {historyRoom.RoomName}</h3>
              <button onClick={() => setHistoryRoom(null)} style={{ color: C.gray }}><X size={18} /></button>
            </div>
            {!historyRoom.loading && !historyRoom.error && historyRoom.startDate && (
              <p className="text-xs mb-3" style={{ color: C.gray }}>{historyRoom.startDate} — {historyRoom.endDate}</p>
            )}
            {historyRoom.loading && <SkeletonRows rows={3} />}
            {historyRoom.error && <div className="rounded-md px-3 py-2 text-sm" style={{ background: C.redSoft, color: C.red }}>{historyRoom.error}</div>}
            {!historyRoom.loading && !historyRoom.error && (
              Object.keys(historyRoom.graphs || {}).length === 0 ? (
                <div className="text-sm text-center py-6" style={{ color: C.gray }}>Sin historial reciente.</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(historyRoom.graphs).map(([key, g]) => (
                    <div key={key}>
                      <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>{g.label || key}</div>
                      <img src={g.image} alt={g.label || key} className="w-full rounded-md border" style={{ borderColor: C.line }} />
                    </div>
                  ))}
                </div>
              )
            )}
            {!historyRoom.loading && !historyRoom.error && (historyRoom.dataLog || []).length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>
                  Registro de estado (Data) — últimas {historyRoom.dataLog.length} lecturas
                </div>
                <p className="text-[11px] mb-2" style={{ color: C.gray }}>
                  Una lectura cada ~15 min. Útil para comprobar si un cambio de estado (p.ej. a VIP) se mantuvo o Telkonet lo revirtió solo — mira si "Estado" cambia entre filas sin que nadie lo haya tocado desde aquí.
                </p>
                <div className="space-y-1">
                  {historyRoom.dataLog.map((rec, i) => {
                    const prev = historyRoom.dataLog[i + 1]; // el array viene más reciente primero
                    const changed = prev && prev.profileName !== rec.profileName;
                    const tone = hvacStateTone(rec.profileName);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: changed ? C.amberSoft : (i % 2 === 0 ? "transparent" : C.panelSoft) }}>
                        <span style={{ color: C.inkSoft }}>{rec.dateTime}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tone.bg, color: tone.color }}>{rec.profileName}</span>
                        <span style={{ color: C.ink }}>{rec.temperature != null ? `${rec.temperature}°F` : "—"} / set {rec.userSetPoint != null ? `${rec.userSetPoint}°F` : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Bloques grises que "respiran" mientras llegan los datos. */
function SkeletonRows({ rows = 3 }) {
  return (
    <div className="py-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="pm-skeleton rounded-lg mb-2" style={{ height: 44, background: C.line, opacity: 1 - i * 0.18 }} />)}
    </div>
  );
}