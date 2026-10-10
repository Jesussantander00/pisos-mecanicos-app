import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Users, X } from "lucide-react";
import { C, ROOM_PREVENTIVE_STEPS, authHeaders, hvacStateTone, normalizeSearchText, normalizeTaskState } from "../shared/core";
import { Button, HorizontalBarChart, MiniDonut } from "../shared/components";



export function HVACView({ isAdmin, isGerencia, tasks = [], onCreateTask, onCreateTasksBatch, accounts = {} }) {
  const [rooms, setRooms] = useState([]);
  const [profileTypes, setProfileTypes] = useState([]);
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
      const headers = await authHeaders();
      const resp = await fetch("/api/telkonet?action=rooms", { headers });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) throw new Error(data.message || "No se pudo cargar el estado de las habitaciones.");
      setRooms(data.rooms || []);
      setProfileTypes(data.profileTypes || []);
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
      const headers = await authHeaders();
      const resp = await fetch("/api/telkonet?action=maintenanceReport", { headers });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>TelkHab — Clima de habitaciones (BMS)</h2>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={load} disabled={loading}>Actualizar</Button>
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Temperatura y estado de los aires acondicionados de todas las habitaciones, en vivo desde Telkonet EcoCentral.
        {canControl ? " Puedes cambiar el estado (VIP, Check IN, Check OUT) de cualquier habitación desde aquí." : " Para cambiar el estado de una habitación, pide a un administrador o a gerencia."}
      </p>

      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setViewMode("list")}
          className="text-sm font-medium px-3 py-1.5 rounded-md"
          style={viewMode === "list" ? { background: C.blue, color: "#fff" } : { background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
          Habitaciones
        </button>
        <button onClick={() => setViewMode("dashboard")}
          className="text-sm font-medium px-3 py-1.5 rounded-md"
          style={viewMode === "dashboard" ? { background: C.blue, color: "#fff" } : { background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
          Dashboard
        </button>
      </div>

      {flash && (
        <div className="rounded-md px-3 py-2 text-sm mb-3" style={{ background: flash.ok ? C.greenSoft || "#dcfce7" : C.redSoft, color: flash.ok ? C.green : C.red }}>
          {flash.msg}
        </div>
      )}

      {isAdmin && onCreateTasksBatch && rooms.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <button onClick={() => setShowPrev(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.ink }}>
            <span>🗓️ Preventivo por habitación ({prevPlan.due.length} por revisar)</span><span className="text-xs" style={{ color: C.gray }}>{showPrev ? "Ocultar" : "Abrir"}</span>
          </button>
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

          {dashboard.tempIssues.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>Habitaciones con temperatura fuera de rango ahora mismo</div>
              <p className="text-[11px] mb-2" style={{ color: C.gray }}>Diferencia entre temperatura actual y set point de 6°F o más — candidatas a revisión de equipo.</p>
              <div className="space-y-1">
                {dashboard.tempIssues.slice(0, 20).map(({ r, delta }) => (
                  <div key={r.RoomID} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5" style={{ background: C.redSoft }}>
                    <span style={{ color: C.ink }}>{r.RoomName}</span>
                    <span style={{ color: C.inkSoft }}>{r.Temperature}°F / set {Number(r.UserSetPoint)}°F</span>
                    <span className="font-semibold" style={{ color: C.red }}>Δ {delta.toFixed(1)}°F</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar habitación o estado (VIP, Check IN...)"
            className="w-full text-sm border rounded-md px-3 py-2 outline-none mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="text-xs mb-2" style={{ color: C.gray }}>{filtered.length} de {rooms.length} habitaciones</div>
          <div className="pm-tab-in grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.map(r => {
              const tone = hvacStateTone(r.ProfileName);
              const hasAlert = Number(r.AlertCount || 0) > 0;
              return (
                <div key={r.RoomID} className="pm-card-hover rounded-lg border p-3" style={{ borderColor: hasAlert ? C.red : C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold" style={{ color: C.ink }}>{r.RoomName}</div>
                      <Users size={14} color={r.Occupied && r.Occupied !== "0" ? C.blue : C.gray} title={r.Occupied && r.Occupied !== "0" ? "Ocupada" : "Desocupada"} />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tone.bg, color: tone.color }}>{r.ProfileName || "—"}</span>
                    {(hotsosByRoom[String(r.RoomName || "").trim()] || []).length > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.purpleSoft, color: C.purple }}
                        title={(hotsosByRoom[String(r.RoomName || "").trim()] || []).map(t => t.titulo).join(" · ")}>
                        🛎️ {(hotsosByRoom[String(r.RoomName || "").trim()] || []).length} orden(es)
                      </span>
                    )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm mb-1.5">
                    <span style={{ color: C.ink }}>{r.Temperature != null ? `${r.Temperature}°F` : "—"} <span className="text-xs" style={{ color: C.gray }}>amb.</span></span>
                    <span style={{ color: C.gray }}>·</span>
                    <span style={{ color: C.ink }}>{r.UserSetPoint != null ? `${Number(r.UserSetPoint)}°F` : "—"} <span className="text-xs" style={{ color: C.gray }}>set</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: C.gray }}>
                    <span>Batería {r.BatteryPercent != null ? `${r.BatteryPercent}%` : "—"}</span>
                    {hasAlert && <span style={{ color: C.red }}>· {r.AlertCount} alerta(s)</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => openHistory(r)}>Historial</Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedRoomId(id => id === r.RoomID ? null : r.RoomID)}>
                      {expandedRoomId === r.RoomID ? "Menos datos" : "Más datos"}
                    </Button>
                    {onCreateTask && (telkTaskByRoom[String(r.RoomName || "").trim()]
                      ? <span className="text-xs font-semibold px-2" style={{ color: C.green }}>✓ Tarea abierta</span>
                      : <Button size="sm" variant="ghost" disabled={creatingRoom === r.RoomID} onClick={() => createRoomTask(r)}>Crear tarea</Button>)}
                    {canControl && (
                      <select
                        value=""
                        disabled={busyRoomId === r.RoomID}
                        onChange={e => {
                          const choice = profileTypes.find(p => p.id === e.target.value);
                          if (choice) setStateRoom({ RoomID: r.RoomID, RoomName: r.RoomName, current: r.ProfileName, choice });
                        }}
                        className="text-xs border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                        <option value="" disabled>{busyRoomId === r.RoomID ? "Cambiando…" : "Cambiar estado a…"}</option>
                        {profileTypes.filter(p => p.name !== r.ProfileName).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {expandedRoomId === r.RoomID && (
                    <div className="mt-2.5 pt-2.5 border-t grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" style={{ borderColor: C.line, color: C.inkSoft }}>
                      <span>Ocupada: <b style={{ color: C.ink }}>{r.Occupied != null ? (r.Occupied !== "0" ? "Sí" : "No") : "—"}</b></span>
                      <span>Config. HVAC: <b style={{ color: C.ink }}>{r.HVACConfigName || "—"}</b></span>
                      <span>Termostatos: <b style={{ color: C.ink }}>{r.NumThermostat ?? "—"}</b></span>
                      <span>EcoGuard: <b style={{ color: C.ink }}>{r.NumEcoGuard ?? "—"}</b></span>
                      <span>EcoSwitch: <b style={{ color: C.ink }}>{r.NumEcoSwitch ?? "—"}</b></span>
                      <span>Alertas TKO: <b style={{ color: r.TKOAlertCount > 0 ? C.red : C.ink }}>{r.TKOAlertCount ?? "—"}</b></span>
                      <span>Notas: <b style={{ color: C.ink }}>{r.NoteCount ?? "—"}</b></span>
                      <span>Tickets: <b style={{ color: C.ink }}>{r.TicketCount ?? "—"}</b></span>
                      <span>Cola de comandos: <b style={{ color: C.ink }}>{r.CommandQueueCount ?? "—"}</b></span>
                      <span>Volts: <b style={{ color: C.ink }}>{r.Volts ?? "—"}</b></span>
                      <span>Amps: <b style={{ color: C.ink }}>{r.Amps ?? "—"}</b></span>
                      <span>Watts: <b style={{ color: C.ink }}>{r.Watts ?? "—"}</b></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: C.gray }}>Sin resultados para "{search}".</div>}
        </>
      )}

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