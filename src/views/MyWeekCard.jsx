import { useState } from "react";
import { C, hoursBetween, localDateIso, normalizeTaskState } from "../shared/core";



/** Mi semana (item 8): resumen personal de los últimos 7 días, para el técnico. */
export function MyWeekCard({ tasks, currentUser, profiles, employees, scheduleEntries }) {
  const [showCal, setShowCal] = useState(false);
  const [weekOff, setWeekOff] = useState(0);
  const week = Date.now() - 7 * 86400000;
  const mine = (tasks || []).filter(t => t.asignadoA === currentUser);
  const cerradas = mine.filter(t => normalizeTaskState(t.estado) === "finalizada" && t.finishedAt && new Date(t.finishedAt).getTime() >= week);
  const abiertas = mine.filter(t => normalizeTaskState(t.estado) !== "finalizada").length;
  const conTiempo = cerradas.filter(t => t.assignedAt);
  const prom = conTiempo.length ? conTiempo.reduce((a, t) => a + hoursBetween(t.assignedAt, t.finishedAt), 0) / conTiempo.length : null;
  const rei = cerradas.filter(t => t.reincidencia).length;
  if (mine.length === 0) return null;
  // Logros: se calculan con lo que ya hace (tareas cerradas por mí), sin competir con nadie.
  const dayKey = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const doneAll = mine.filter(t => normalizeTaskState(t.estado) === "finalizada" && t.finishedAt);
  const doneDays = new Set(doneAll.map(t => dayKey(t.finishedAt)));
  let streak = 0; { let d = dayKey(Date.now()); if (!doneDays.has(d)) d -= 86400000; while (doneDays.has(d)) { streak++; d -= 86400000; } }
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthN = doneAll.filter(t => new Date(t.finishedAt).getTime() >= monthStart.getTime()).length;
  const badges = [
    { k: "p", t: "Primera tarea", d: "Cerraste tu primera", ok: doneAll.length >= 1, bg: C.amberSoft, fg: "#9a6403" },
    { k: "d", t: "10 tareas", d: "Diez cerradas", ok: doneAll.length >= 10, bg: C.greenSoft, fg: "#1f7a35" },
    { k: "r", t: "Racha de 7", d: "7 días seguidos", ok: streak >= 7, bg: C.blueSoft, fg: "#24496b" },
    { k: "m", t: "Mes perfecto", d: "30 días seguidos", ok: streak >= 30, bg: C.line, fg: C.gray },
  ];
  const nextGoal = streak < 7 ? 7 : 30;
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="rounded-xl flex items-center gap-3 p-3 mb-3" style={{ background: "#132030", color: "#fff" }}>
        <div className="rounded-full flex items-center justify-center flex-none" style={{ width: 48, height: 48, background: "#f2b705", fontSize: 24 }} aria-hidden="true">🔥</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px]" style={{ color: "#c9d4df" }}>Tu racha</div>
          <div className="text-xl font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{streak === 0 ? "Empieza hoy" : `${streak} día${streak === 1 ? "" : "s"} seguido${streak === 1 ? "" : "s"}`}</div>
          <div className="text-[11px]" style={{ color: "#c9d4df" }}>cerrando tareas</div>
        </div>
        <div className="text-right"><div className="text-lg font-bold">{monthN}</div><div className="text-[11px]" style={{ color: "#c9d4df" }}>este mes</div></div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {badges.map(b => (
          <div key={b.k} className="text-center" style={{ opacity: b.ok ? 1 : 0.45 }} title={b.d}>
            <div className="mx-auto rounded-full flex items-center justify-center mb-1" style={{ width: 40, height: 40, background: b.bg, color: b.fg, fontSize: 18 }}>{b.ok ? "★" : "🔒"}</div>
            <div className="text-[11px] font-semibold leading-tight" style={{ color: C.ink }}>{b.t}</div>
          </div>
        ))}
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-[11px] mb-1" style={{ color: C.inkSoft }}><span>Siguiente logro: {nextGoal === 7 ? "Racha de 7" : "Mes perfecto"}</span><span>{Math.min(streak, nextGoal)} de {nextGoal}</span></div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: C.bg }}><div style={{ width: `${Math.min(100, streak / nextGoal * 100)}%`, height: "100%", background: C.amber }} /></div>
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.gray }}>Mi semana</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: C.green }}>{cerradas.length}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>cerradas</div></div>
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: C.ink }}>{prom == null ? "—" : prom < 24 ? `${prom.toFixed(1)} h` : `${(prom / 24).toFixed(1)} d`}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>tiempo promedio</div></div>
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: abiertas > 0 ? C.amber : C.green }}>{abiertas}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>abiertas</div></div>
      </div>
      <button type="button" onClick={() => setShowCal(v => !v)} aria-expanded={showCal} className="w-full mt-3 rounded-xl border text-sm font-semibold" style={{ minHeight: 44, borderColor: C.line, color: C.ink, background: C.bg }}>{showCal ? "Ocultar calendario" : "Ver mi calendario de la semana"}</button>
      {showCal && (() => {
        const emp = (employees || []).find(e => e.id === profiles?.[currentUser]?.linked_employee_id);
        const se = scheduleEntries || {};
        const start = new Date(); start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOff * 7);
        const todayKey = localDateIso(new Date());
        const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
        const dk = (x) => { const d = new Date(x); return localDateIso(d); };
        const shiftOf = (d) => {
          if (!emp) return null;
          const e = se[`${emp.id}::${localDateIso(d)}`];
          if (!e) return null;
          if (e.code) return { t: String(e.code), kind: "libre" };
          if (e.entrada == null) return null;
          return { t: e.entrada < 12 ? "Mañana" : e.entrada < 18 ? "Tarde" : "Noche", kind: "turno" };
        };
        let nT = 0, nC = 0;
        return (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setWeekOff(w => w - 1)} aria-label="Semana anterior" className="rounded-lg border font-bold" style={{ width: 44, height: 44, borderColor: C.line, background: C.panel }}>‹</button>
              <span className="text-xs font-semibold" style={{ color: C.inkSoft }}>{weekOff === 0 ? "Esta semana" : weekOff === -1 ? "Semana pasada" : weekOff === 1 ? "Próxima semana" : `${days[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`}</span>
              <button type="button" onClick={() => setWeekOff(w => w + 1)} aria-label="Semana siguiente" className="rounded-lg border font-bold" style={{ width: 44, height: 44, borderColor: C.line, background: C.panel }}>›</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const k = localDateIso(d), isToday = k === todayKey;
                const sh = shiftOf(d);
                if (sh && sh.kind === "turno") nT++;
                const closed = mine.filter(t => t.finishedAt && dk(t.finishedAt) === k).length;
                const urg = mine.filter(t => normalizeTaskState(t.estado) !== "finalizada" && t.prioridad === "alta" && dk(t.assignedAt || t.createdAt || Date.now()) === k).length;
                const opn = mine.filter(t => normalizeTaskState(t.estado) !== "finalizada" && t.prioridad !== "alta" && dk(t.assignedAt || t.createdAt || Date.now()) === k).length;
                nC += closed;
                return (
                  <div key={i} className="rounded-lg p-1 flex flex-col gap-1" style={{ background: C.bg, border: isToday ? `2px solid ${C.amber}` : `1px solid ${C.line}`, minHeight: 120 }}>
                    <div className="text-center text-[11px] font-bold" style={{ color: C.ink }}>{d.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "")}</div>
                    <div className="text-center text-[10px]" style={{ color: C.inkSoft }}>{isToday ? "Hoy " : ""}{d.getDate()}</div>
                    {sh && <div className="rounded text-[10px] font-semibold px-1 py-0.5 text-center leading-tight" style={{ background: sh.kind === "turno" ? C.blueSoft : C.line, color: sh.kind === "turno" ? "#24496b" : C.inkSoft }}>{sh.t}</div>}
                    {urg > 0 && <div className="rounded text-[10px] font-semibold px-1 py-0.5 text-center leading-tight" style={{ background: C.redSoft, color: "#8a2a12" }}>{urg} urgente{urg > 1 ? "s" : ""}</div>}
                    {opn > 0 && <div className="rounded text-[10px] font-semibold px-1 py-0.5 text-center leading-tight" style={{ background: C.amberSoft, color: "#7a4e00" }}>{opn} tarea{opn > 1 ? "s" : ""}</div>}
                    {closed > 0 && <div className="rounded text-[10px] font-semibold px-1 py-0.5 text-center leading-tight" style={{ background: C.greenSoft, color: "#14532d" }}>✓ {closed}</div>}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]" style={{ color: C.inkSoft }}>
              <span><span style={{ color: "#24496b" }}>■</span> Turno</span><span><span style={{ color: C.amber }}>■</span> Tarea asignada</span><span><span style={{ color: C.red }}>■</span> Urgente</span><span><span style={{ color: C.green }}>■</span> Cerradas</span>
            </div>
            <div className="text-xs mt-2" style={{ color: C.ink }}><b>Esta semana:</b> {nT} turno{nT === 1 ? "" : "s"}, {nC} tarea{nC === 1 ? "" : "s"} cerrada{nC === 1 ? "" : "s"}</div>
          </div>
        );
      })()}
      {rei > 0 && <div className="text-xs mt-2" style={{ color: C.red }}>↻ {rei} de tus cierres fueron reincidencias (el problema había vuelto a aparecer).</div>}
    </div>
  );
}