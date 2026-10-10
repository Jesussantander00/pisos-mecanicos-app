import { useMemo, useState } from "react";
import { C, TASK_PRIORITY_COLORS, employeesWorkingNow, hoursBetween, isTaskSnoozed, normalizeTaskState, nowIso, roomOfTask } from "../shared/core";



/**
 * Panel "Hoy" para el supervisor: por cada técnico, sus órdenes en tres columnas (pendientes,
 * en proceso, hechas hoy), lo que queda programado para mañana en adelante, y alertas de lo que
 * lleva demasiado tiempo abierto o sigue sin asignar. Puede verse solo con lo de HotSOS.
 * Todo sale de las tareas que ya existen (incluidas las importadas de HotSOS) — no guarda nada nuevo.
 */
export function TodayBoardView({ tasks, accounts, employees, scheduleEntries, onNavigate, onAssign, onReview, pushSubscriptions = [] }) {
  const [onlyHotsos, setOnlyHotsos] = useState(false);
  const [staleHours, setStaleHours] = useState(24);
  const [showTomorrow, setShowTomorrow] = useState(true);
  const [showFloors, setShowFloors] = useState(false);
  const [openFloor, setOpenFloor] = useState(null);

  const data = useMemo(() => {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1);
    const dayAfter0 = new Date(tomorrow0); dayAfter0.setDate(dayAfter0.getDate() + 1);
    const base = (tasks || []).filter(t => !onlyHotsos || t.origen === "hotsos");
    const byUser = {};
    const bucket = (u) => (byUser[u] = byUser[u] || { username: u, pendientes: [], enProceso: [], hechasHoy: [] });
    const programadas = [];
    const alertas = [];
    base.forEach(t => {
      const est = normalizeTaskState(t.estado);
      const u = t.asignadoA || "";
      if (est === "finalizada") {
        if (t.finishedAt && new Date(t.finishedAt) >= today0) bucket(u).hechasHoy.push(t);
        return;
      }
      if (isTaskSnoozed(t) && new Date(t.snoozedUntil) >= tomorrow0) { programadas.push(t); return; }
      if (est === "en-proceso") bucket(u).enProceso.push(t); else bucket(u).pendientes.push(t);
      const horas = hoursBetween(t.createdAt || t.assignedAt || nowIso(), nowIso());
      if (!u) alertas.push({ t, motivo: "Sin asignar", horas });
      else if (!t.esperaRepuesto && horas > staleHours) alertas.push({ t, motivo: `Abierta hace ${horas >= 48 ? Math.floor(horas / 24) + " días" : Math.floor(horas) + " h"}`, horas });
    });
    alertas.sort((a, b) => b.horas - a.horas);
    const users = Object.values(byUser).sort((a, b) => (a.username === "") - (b.username === "") || (b.pendientes.length + b.enProceso.length) - (a.pendientes.length + a.enProceso.length));
    const manana = programadas.filter(t => new Date(t.snoozedUntil) < dayAfter0);
    const hotsosTimes = (tasks || []).filter(t => t.origen === "hotsos").map(t => new Date(t.createdAt || 0).getTime()).filter(Boolean);
    const lastImportAt = hotsosTimes.length ? Math.max(...hotsosTimes) : null;
    // Cierres para revisar (item 10): cerradas en los últimos 7 días que conviene mirar — "sin falla",
    // "en observación", cierres en menos de 3 minutos — y que nadie ha marcado como revisadas.
    const weekAgo = Date.now() - 7 * 86400000;
    const porRevisar = [];
    (tasks || []).forEach(t => {
      if (normalizeTaskState(t.estado) !== "finalizada" || t.revisadaAt || !t.finishedAt || new Date(t.finishedAt).getTime() < weekAgo) return;
      const nota = String(t.notaCierre || "");
      let motivo = null;
      if (/sin falla/i.test(nota)) motivo = "Cerrada como \"sin falla\"";
      else if (/observaci[oó]n/i.test(nota)) motivo = "Queda en observación";
      else if (t.startedAt && (new Date(t.finishedAt) - new Date(t.startedAt)) < 3 * 60000) motivo = "Cerrada en menos de 3 min";
      if (motivo) porRevisar.push({ t, motivo });
    });
    const esperando = base.filter(t => normalizeTaskState(t.estado) !== "finalizada" && t.esperaRepuesto);
    const pisos = {};
    base.forEach(t => {
      if (normalizeTaskState(t.estado) === "finalizada") return;
      const room = roomOfTask(t);
      if (!room) return;
      const n = Math.floor(Number(room) / 100);
      if (!n) return;
      (pisos[n] = pisos[n] || []).push(t);
    });
    const porPiso = Object.entries(pisos).map(([piso, list]) => ({ piso: Number(piso), list })).sort((a, b) => b.list.length - a.list.length || a.piso - b.piso);
    // Ráfagas: 4 o más cierres de la misma persona dentro de 10 minutos.
    {
      const yaFlag = new Set(porRevisar.map(x => x.t.id));
      const porUsuario = {};
      (tasks || []).forEach(t => {
        if (normalizeTaskState(t.estado) !== "finalizada" || t.revisadaAt || !t.finishedAt || new Date(t.finishedAt).getTime() < weekAgo || !t.asignadoA) return;
        (porUsuario[t.asignadoA] = porUsuario[t.asignadoA] || []).push(t);
      });
      Object.values(porUsuario).forEach(list => {
        list.sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));
        for (let i = 0; i + 3 < list.length; i++) {
          if (new Date(list[i + 3].finishedAt) - new Date(list[i].finishedAt) <= 10 * 60000) {
            list.slice(i, i + 4).forEach(t => { if (!yaFlag.has(t.id)) { yaFlag.add(t.id); porRevisar.push({ t, motivo: "Varios cierres en pocos minutos" }); } });
          }
        }
      });
    }
    const totals = users.reduce((a, u) => ({ p: a.p + u.pendientes.length, e: a.e + u.enProceso.length, h: a.h + u.hechasHoy.length }), { p: 0, e: 0, h: 0 });
    return { users, programadas, manana, alertas, lastImportAt, totals, porRevisar, esperando, porPiso };
  }, [tasks, onlyHotsos, staleHours]);

  // Candidatos para asignar: primero quienes están trabajando ahora mismo (según el Horario Mensual),
  // y entre ellos quien tenga menos tareas abiertas — esa persona es la "sugerida".
  const candidates = useMemo(() => {
    const working = new Set(employeesWorkingNow(employees || [], scheduleEntries || []).map(e => e.id));
    const open = {};
    (tasks || []).forEach(t => { if (t.asignadoA && normalizeTaskState(t.estado) !== "finalizada") open[t.asignadoA] = (open[t.asignadoA] || 0) + 1; });
    return Object.keys(accounts || {})
      .filter(u => { const a = accounts[u]; return a && a.approved !== false && !a.is_viewer && !a.is_gerencia; })
      .map(u => ({ u, working: working.has(accounts[u]?.linked_employee_id), open: open[u] || 0 }))
      .sort((a, b) => (b.working - a.working) || (a.open - b.open));
  }, [tasks, accounts, employees, scheduleEntries]);
  const suggested = candidates[0] || null;
  const [assigning, setAssigning] = useState(null);
  const doAssign = async (taskId, username) => {
    if (!username || !onAssign) return;
    setAssigning(taskId);
    try { await onAssign(taskId, username); } finally { setAssigning(null); }
  };
  const AssignControl = ({ t }) => (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">
      {suggested && (
        <button disabled={assigning === t.id} onClick={() => doAssign(t.id, suggested.u)} className="text-xs font-semibold rounded-lg px-2.5" style={{ background: C.amber, color: C.steelDark, minHeight: 36 }}
          title={`${suggested.working ? "Está de turno ahora" : "No está de turno ahora"} · ${suggested.open} abiertas`}>
          Asignar a {(accounts[suggested.u]?.display_name || suggested.u).split(" ")[0]} (sugerido)
        </button>
      )}
      <select disabled={assigning === t.id} value="" onChange={e => doAssign(t.id, e.target.value)} className="text-xs border rounded-lg px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }} aria-label="Asignar a otra persona">
        <option value="">Otra persona…</option>
        {candidates.map(c => <option key={c.u} value={c.u}>{(accounts[c.u]?.display_name || c.u)} · {c.open} abiertas{c.working ? " · de turno" : ""}</option>)}
      </select>
    </div>
  );

  const nameOf = (u) => (u ? (accounts?.[u]?.display_name || u) : "Sin asignar");
  const sinAvisos = candidates.map(c => c.u).filter(u => !(pushSubscriptions || []).some(s => s.ownerUsername === u));
  const lugarOf = (t) => (t.origen === "hotsos" ? String(t.descripcion || "").split(" — ")[0] : "");
  const horasDesdeImport = data.lastImportAt ? (Date.now() - data.lastImportAt) / 36e5 : null;
  const importStale = data.lastImportAt == null || horasDesdeImport > 6;

  const Row = ({ t }) => (
    <button onClick={() => onNavigate("tasks")} className="w-full text-left rounded-md border px-2 py-1.5 text-xs flex items-start gap-1.5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: TASK_PRIORITY_COLORS[t.prioridad] || C.gray }} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{t.titulo}</span>
        <span className="block truncate" style={{ color: C.gray }}>{[lugarOf(t), t.origen === "hotsos" ? "🛎️ HotSOS" : "", t.reincidencia ? "↻ Reincidencia" : ""].filter(Boolean).join(" · ") || "—"}</span>
      </span>
    </button>
  );
  const Col = ({ title, color, items }) => (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold mb-1.5 flex items-center justify-between" style={{ color }}>
        <span>{title}</span><span className="px-1.5 rounded-full" style={{ background: C.bg }}>{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map(t => <Row key={t.id} t={t} />)}
        {items.length > 5 && <div className="text-[11px] px-1" style={{ color: C.gray }}>+{items.length - 5} más</div>}
        {items.length === 0 && <div className="text-[11px] px-1" style={{ color: C.gray }}>—</div>}
      </div>
    </div>
  );

  return (
    <div className="pm-tab-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Panel de hoy</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Qué tiene cada técnico, qué se hizo hoy y qué queda para mañana.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setOnlyHotsos(v => !v)} className="text-xs font-semibold px-3 rounded-md border" style={{ minHeight: 36, background: onlyHotsos ? C.steelDark : C.panel, color: onlyHotsos ? "#fff" : C.inkSoft, borderColor: onlyHotsos ? C.steelDark : C.line }}>
            {onlyHotsos ? "✓ Solo HotSOS" : "Solo HotSOS"}
          </button>
          <select value={staleHours} onChange={e => setStaleHours(Number(e.target.value))} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }} title="Desde cuántas horas abierta se marca como atrasada">
            <option value={8}>Alerta: más de 8 h</option>
            <option value={24}>Alerta: más de 24 h</option>
            <option value={48}>Alerta: más de 48 h</option>
          </select>
        </div>
      </div>

      {importStale && (
        <div className="rounded-md px-3 py-2 text-sm mb-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: C.ink }}>
          <span>🛎️ {data.lastImportAt == null ? "Todavía no hay órdenes importadas de HotSOS." : `Las órdenes de HotSOS se importaron hace ${horasDesdeImport >= 24 ? Math.floor(horasDesdeImport / 24) + " día(s)" : Math.floor(horasDesdeImport) + " h"} — puede que haya órdenes nuevas.`}</span>
          <button onClick={() => onNavigate("hotsos-import")} className="text-xs font-semibold underline">Importar ahora</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[["Pendientes", data.totals.p, C.amber], ["En proceso", data.totals.e, C.blue], ["Hechas hoy", data.totals.h, C.green]].map(([l, n, c]) => (
          <div key={l} className="rounded-lg border p-3 text-center" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-2xl font-bold tabular-nums" style={{ color: c }}>{n}</div>
            <div className="text-xs" style={{ color: C.inkSoft }}>{l}</div>
          </div>
        ))}
      </div>

      {data.alertas.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.red, background: C.panel }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.red }}>⚠️ Requieren atención ({data.alertas.length})</div>
          <div className="space-y-1">
            {data.alertas.slice(0, 8).map(({ t, motivo }) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: C.ink }}>{t.titulo}{lugarOf(t) ? ` — ${lugarOf(t)}` : ""}</span>
                <span className="shrink-0 font-semibold" style={{ color: C.red }}>{motivo}</span>
              </div>
            ))}
            {data.alertas.length > 8 && <div className="text-xs" style={{ color: C.gray }}>+{data.alertas.length - 8} más</div>}
          </div>
        </div>
      )}

      {data.esperando.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>📦 Esperando repuesto ({data.esperando.length}) <span className="text-xs font-normal" style={{ color: C.gray }}>— no cuentan como atrasadas</span></div>
          <div className="space-y-1">
            {data.esperando.slice(0, 10).map(t => (
              <div key={t.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: C.ink }}>{t.titulo}{lugarOf(t) ? ` — ${lugarOf(t)}` : ""}</span>
                <span className="shrink-0 font-semibold" style={{ color: C.amber }}>Falta: {t.esperaRepuesto.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.porPiso.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <button onClick={() => setShowFloors(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.ink }}>
            <span>🏢 Por piso ({data.porPiso.length} pisos con órdenes)</span><span className="text-xs" style={{ color: C.gray }}>{showFloors ? "Ocultar" : "Ver"}</span>
          </button>
          {showFloors && (
            <div className="mt-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {data.porPiso.map(({ piso, list }) => (
                  <button key={piso} onClick={() => setOpenFloor(openFloor === piso ? null : piso)} className="rounded-lg p-2 text-center" style={{ background: openFloor === piso ? C.steelDark : C.bg, color: openFloor === piso ? "#fff" : C.ink, minHeight: 52 }}>
                    <div className="text-[10px]" style={{ opacity: 0.8 }}>Piso {piso}</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: openFloor === piso ? "#fff" : (list.length >= 5 ? C.red : list.length >= 3 ? C.amber : C.green) }}>{list.length}</div>
                  </button>
                ))}
              </div>
              {openFloor != null && (
                <div className="mt-2 space-y-1">
                  {(data.porPiso.find(x => x.piso === openFloor)?.list || []).slice(0, 15).map(t => <Row key={t.id} t={t} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {data.porRevisar.length > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.amber, background: C.panel }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.amber }}>🔎 Cierres para revisar ({data.porRevisar.length})</div>
          <div className="space-y-2">
            {data.porRevisar.slice(0, 8).map(({ t, motivo }) => (
              <div key={t.id} className="text-xs">
                <div className="flex justify-between gap-2" style={{ color: C.ink }}>
                  <span className="truncate font-medium">{t.titulo}{lugarOf(t) ? ` — ${lugarOf(t)}` : ""}</span>
                  <span className="shrink-0" style={{ color: C.gray }}>{nameOf(t.asignadoA)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span style={{ color: C.amber }}>{motivo}</span>
                  {onReview && (
                    <>
                      <button onClick={() => onReview(t.id, { revisadaAt: nowIso() })} className="font-semibold rounded-lg px-2.5" style={{ minHeight: 32, background: C.greenSoft, color: C.green }}>✓ Revisada</button>
                      <button onClick={() => onReview(t.id, { estado: "en-proceso", finishedAt: null, devueltaAt: nowIso(), timeLog: [...(t.timeLog || []), { estado: "en-proceso", at: nowIso(), nota: "Devuelta por el administrador" }] })} className="font-semibold rounded-lg px-2.5" style={{ minHeight: 32, background: C.redSoft, color: C.red }}>↩ Devolver</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sinAvisos.length > 0 && (
        <div className="rounded-lg border p-3 mb-4 text-xs" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>🔔 Sin avisos activados ({sinAvisos.length})</div>
          <div className="mb-1">{sinAvisos.map(u => nameOf(u)).join(", ")}</div>
          <div style={{ color: C.gray }}>A ellos no les llegan las notificaciones de órdenes nuevas. Pídeles abrir Inicio en su celular y tocar "Activar avisos".</div>
        </div>
      )}

      <div className="space-y-3">
        {data.users.map(u => (
          <div key={u.username || "_none"} className="rounded-lg border p-3" style={{ borderColor: u.username ? C.line : C.amber, background: C.panel }}>
            <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>{u.username ? "👷 " : "📥 "}{nameOf(u.username)}</div>
            {!u.username && onAssign ? (
              <div className="space-y-2">
                {u.pendientes.slice(0, 12).map(t => (
                  <div key={t.id}><Row t={t} /><AssignControl t={t} /></div>
                ))}
                {u.pendientes.length > 12 && <div className="text-[11px] px-1" style={{ color: C.gray }}>+{u.pendientes.length - 12} más</div>}
                {u.pendientes.length === 0 && <div className="text-[11px] px-1" style={{ color: C.gray }}>Nada sin asignar.</div>}
              </div>
            ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              <Col title="Pendientes" color={C.amber} items={u.pendientes} />
              <Col title="En proceso" color={C.blue} items={u.enProceso} />
              <Col title="Hechas hoy" color={C.green} items={u.hechasHoy} />
            </div>
            )}
          </div>
        ))}
        {data.users.length === 0 && <div className="text-sm text-center py-8" style={{ color: C.gray }}>No hay tareas para mostrar.</div>}
      </div>

      <div className="rounded-lg border p-3 mt-4" style={{ borderColor: C.line, background: C.panel }}>
        <button onClick={() => setShowTomorrow(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.ink }}>
          <span>📅 Programadas para mañana en adelante ({data.programadas.length})</span><span className="text-xs" style={{ color: C.gray }}>{showTomorrow ? "Ocultar" : "Ver"}</span>
        </button>
        {showTomorrow && (
          <div className="mt-2 space-y-1">
            {data.programadas.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Nada programado. Para dejar una orden para otro día, abre la tarea y usa "Posponer".</div>}
            {data.programadas.sort((a, b) => new Date(a.snoozedUntil) - new Date(b.snoozedUntil)).slice(0, 15).map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: C.ink }}>{t.titulo}{lugarOf(t) ? ` — ${lugarOf(t)}` : ""} <span style={{ color: C.gray }}>· {nameOf(t.asignadoA)}</span></span>
                <span className="shrink-0" style={{ color: C.blue }}>{new Date(t.snoozedUntil).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}