import { useMemo, useState } from "react";
import { CalendarDays, ClipboardCheck, Clock, Download, X } from "lucide-react";
import { C, SHIFTS, computeComplianceForMonth, computeEquipmentStats, computeMaintenanceCost, computeSystemCoverage, computeUptimeBySystem, fmtHours, generateDirectorWeeklyPdf, generateExecutivePdf, generateMonthlyMaintenancePdf, hoursBetween, localDateIso, normalizeSearchText, normalizeTaskState, todayStr } from "../shared/core";
import { Button, HorizontalBarChart, MiniDonut, MiniGauge, StatCard } from "../shared/components";
import { SystemCoverageGrid } from "./SystemCoverageGrid";



/** Tabla de cumplimiento por turno (últimos 7 días): quién hizo la ronda, los medidores y los cuartos fríos en cada turno. */
function ShiftComplianceTable({ roundsIndex, coldRoundsIndex, meterRoundsIndex }) {
  const rows = useMemo(() => {
    const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const who = (idx, date, shift) => {
      const u = [...new Set((idx || []).filter(r => r.date === date && r.shift === shift).map(r => r.user).filter(Boolean))];
      return u;
    };
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const date = fmt(d);
      SHIFTS.forEach((shift, si) => {
        const over = i > 0 ? (si === 2 ? (i > 1 || hour >= 6) : true) : (si === 0 ? hour >= 14 : si === 1 ? hour >= 22 : false);
        out.push({
          date, shift, over,
          ronda: who(roundsIndex, date, shift),
          medidores: si === 0 ? who(meterRoundsIndex, date, shift) : null,
          frios: si === 0 ? who(coldRoundsIndex, date, shift) : null,
        });
      });
    }
    return out;
  }, [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const cell = (users, over) => {
    if (users === null) return <span style={{ color: C.gray }}>—</span>;
    if (users.length) return <span style={{ color: C.green }}>✓ {users.join(", ")}</span>;
    return over ? <span className="font-semibold" style={{ color: C.red }}>✗ Falta</span> : <span style={{ color: C.gray }}>pendiente</span>;
  };
  // Resumen: % de rondas hechas en los turnos que ya terminaron (7 días), en total y por turno.
  const stat = (list) => { const done = list.filter(r => r.ronda.length > 0).length; return { done, n: list.length, pct: list.length ? Math.round((done / list.length) * 100) : null }; };
  const overRows = rows.filter(r => r.over);
  const overall = stat(overRows);
  const perShift = SHIFTS.map(sh => ({ sh, ...stat(overRows.filter(r => r.shift === sh)) }));
  const tone = (pct) => pct == null ? C.gray : pct >= 90 ? C.green : pct >= 75 ? C.amber : C.red;
  return (
    <>
      {overall.pct != null && (
        <div className="grid sm:grid-cols-[170px_1fr] gap-3 mb-4">
          <div className="rounded-lg border p-3 flex flex-col items-center" style={{ borderColor: C.line, background: C.panel }}>
            <svg width="130" height="80" viewBox="0 0 120 76" role="img" aria-label={`Cumplimiento de rondas: ${overall.pct} por ciento`}>
              <path d="M10 66A50 50 0 0 1 110 66" fill="none" stroke={C.line} strokeWidth="12" strokeLinecap="round" />
              {overall.pct > 0 && <path d={`M10 66A50 50 0 0 1 ${60 - 50 * Math.cos(Math.PI * overall.pct / 100)} ${66 - 50 * Math.sin(Math.PI * overall.pct / 100)}`} fill="none" stroke={tone(overall.pct)} strokeWidth="12" strokeLinecap="round" />}
              <text x="60" y="64" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="24" fill={C.ink}>{overall.pct}%</text>
            </svg>
            <div className="text-xs" style={{ color: C.inkSoft }}>Rondas hechas · 7 días</div>
          </div>
          <div className="rounded-lg border p-3 space-y-2.5" style={{ borderColor: C.line, background: C.panel }}>
            {perShift.map(x => (
              <div key={x.sh} className="flex items-center gap-2 text-xs">
                <span className="shrink-0" style={{ width: 92, color: C.inkSoft }}>{x.sh}</span>
                <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: C.bg }}><div className="h-full" style={{ width: `${x.pct || 0}%`, background: tone(x.pct) }} /></div>
                <b className="shrink-0 text-right" style={{ width: 36, color: C.ink }}>{x.pct == null ? "—" : `${x.pct}%`}</b>
              </div>
            ))}
            <div className="text-[11px]" style={{ color: C.gray }}>Verde desde 90%, ámbar desde 75%, rojo por debajo.</div>
          </div>
        </div>
      )}
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cumplimiento por turno (últimos 7 días)</div>
      <div className="rounded-lg border mb-5 overflow-x-auto" style={{ borderColor: C.line, background: C.panel }}>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ background: C.bg }}>
            <th className="text-left p-2">Fecha</th><th className="text-left p-2">Turno</th><th className="text-left p-2">Ronda</th><th className="text-left p-2">Medidores</th><th className="text-left p-2">Cuartos fríos</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.date + r.shift} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                <td className="p-2" style={{ color: C.ink }}>{r.date}</td>
                <td className="p-2" style={{ color: C.inkSoft }}>{r.shift}</td>
                <td className="p-2">{cell(r.ronda, r.over)}</td>
                <td className="p-2">{cell(r.medidores, r.over)}</td>
                <td className="p-2">{cell(r.frios, r.over)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TrendBadge({ current, previous, unit = "%", goodDirection = "up" }) {
  if (previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 1) return <span className="text-xs block mt-1" style={{ color: C.gray }}>≈ igual que el mes pasado</span>;
  const up = diff > 0;
  const good = goodDirection === "up" ? up : !up;
  const text = unit === "%" ? `${Math.abs(Math.round(diff))}%` : `$${Math.abs(Math.round(diff)).toLocaleString("es-CO")}`;
  return <span className="text-xs font-medium block mt-1" style={{ color: good ? C.green : C.red }}>{up ? "↑" : "↓"} {text} vs. mes pasado</span>;
}

export function ExecutivePanelView({ equipos, mttoLog, roundsIndex, coldRoundsIndex, meterRoundsIndex, currentUser, tasks, accounts, issueHistory, activeIssues }) {
  const [downloading, setDownloading] = useState(false);
  const [repMonth, setRepMonth] = useState(() => localDateIso(new Date()).slice(0, 7));
  const [msg, setMsg] = useState(null);
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // ===== Filtros estandarizados (mismo patrón que Análisis de Mantenimiento) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const tecnicos = useMemo(() => [...new Set(mttoLog.map(r => r.tecnico).filter(Boolean))].sort(), [mttoLog]);
  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); };

  const filteredLog = useMemo(() => {
    return mttoLog.filter(r => {
      const d = new Date(r.fecha);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(r.fecha) !== filterTurno) return false;
      if (filterTecnico && r.tecnico !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, dateFrom, dateTo, filterTurno, filterTecnico]);

  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      if (!t.finishedAt) return false; // solo cerradas cuentan para "órdenes" y "horas hombre"
      const d = new Date(t.finishedAt);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(t.finishedAt) !== filterTurno) return false;
      if (filterTecnico && (accounts?.[t.asignadoA]?.display_name || t.asignadoA) !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dateFrom, dateTo, filterTurno, filterTecnico, accounts]);

  // ===== Datos base (disponibilidad es una foto del estado ACTUAL, no se filtra por fecha) =====
  const uptime = useMemo(() => computeUptimeBySystem(equipos, mttoLog), [equipos, mttoLog]);
  const compliance = useMemo(() => computeComplianceForMonth(now, roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const compliancePrev = useMemo(() => computeComplianceForMonth(lastMonthDate, roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  // Sin filtros activos: costo del mes actual (comparado con el mes pasado). Con filtros activos:
  // costo de exactamente el rango/turno/técnico elegido (ahí ya no aplica comparar "vs. mes pasado").
  const cost = useMemo(() => computeMaintenanceCost(equipos, filteredLog, hasActiveFilters ? null : now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipos, filteredLog, hasActiveFilters]);
  const costPrev = useMemo(() => computeMaintenanceCost(equipos, mttoLog, lastMonthDate), [equipos, mttoLog]); // eslint-disable-line react-hooks/exhaustive-deps
  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;

  // ===== Top 5 equipos con más tiempo fuera de servicio (usa el mismo cálculo que Análisis de Fallas) =====
  const top5Down = useMemo(() => {
    const sinceDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    return computeEquipmentStats(issueHistory || [], activeIssues || {}, sinceDate)
      .filter(e => e.totalHours > 0)
      .slice(0, 5)
      .map(e => ({ ...e, label: e.name || e.code || "(equipo eliminado)" }));
  }, [issueHistory, activeIssues, dateFrom]);

  // ===== Preventivo vs Correctivo, agrupado por sistema (con los mismos filtros de arriba) =====
  const preventivoVsCorrectivo = useMemo(() => {
    const map = {};
    filteredLog.forEach(r => {
      const eq = equipos.find(e => e.id === r.equipoId);
      const sistema = eq?.sistema || "Otros";
      if (!map[sistema]) map[sistema] = { sistema, preventivo: 0, correctivo: 0 };
      if (r.tipo === "preventivo") map[sistema].preventivo++;
      else if (r.tipo === "correctivo") map[sistema].correctivo++;
    });
    return Object.values(map).sort((a, b) => (b.preventivo + b.correctivo) - (a.preventivo + a.correctivo)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);

  // ===== Distribución de costos: Mano de obra / Repuestos / Contratista =====
  // Los 2 últimos son campos nuevos — los registros de mantenimiento de ANTES de agregarlos
  // cuentan su costo entero como "mano de obra" (es lo más honesto que se puede asumir sin ese
  // dato: no fue explícitamente ni repuesto ni contratista, así que no se puede reclasificar).
  const costBreakdown = useMemo(() => {
    let manoObra = 0, repuestos = 0, contratista = 0;
    filteredLog.forEach(r => {
      const total = Number(r.costo) || 0;
      if (!total) return;
      const rep = Number(r.costoRepuestos) || 0;
      const con = Number(r.costoContratista) || 0;
      repuestos += rep;
      contratista += con;
      manoObra += Math.max(0, total - rep - con);
    });
    return { manoObra, repuestos, contratista, total: manoObra + repuestos + contratista };
  }, [filteredLog]);

  // ===== Cobertura por sistema: todos a la vista al mismo tiempo, con detalle al seleccionar =====
  const systemCoverage = useMemo(() => {
    const sinceDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    return computeSystemCoverage(equipos, mttoLog, sinceDate);
  }, [equipos, mttoLog, dateFrom]);

  // ===== KPIs ejecutivos nuevos: órdenes cerradas y horas hombre, del sistema de tareas =====
  const ordenesCerradas = filteredTasks.length;
  const horasHombre = useMemo(() => {
    let total = 0;
    filteredTasks.forEach(t => {
      if (t.timeLog && t.timeLog.length > 1) {
        const sorted = [...t.timeLog].sort((a, b) => new Date(a.at) - new Date(b.at));
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].estado === "en-proceso") total += hoursBetween(sorted[i].at, sorted[i + 1].at);
        }
      } else if (t.assignedAt && t.finishedAt) {
        total += hoursBetween(t.assignedAt, t.finishedAt);
      }
    });
    return total;
  }, [filteredTasks]);

  // ===== Ranking de técnicos por productividad: tareas cerradas, tiempo promedio de resolución
  // y % cerradas a tiempo (menos de 24h desde que se asignaron) — respeta los mismos filtros de
  // fecha/turno/técnico de arriba. Es informativo, no punitivo: pensado para reconocer buen
  // trabajo, no para castigar (los volúmenes de trabajo no son iguales entre turnos). =====
  const technicianRanking = useMemo(() => {
    const byUser = {};
    filteredTasks.forEach(t => {
      if (!t.asignadoA) return;
      const key = t.asignadoA;
      if (!byUser[key]) byUser[key] = { username: key, cerradas: 0, horasTotal: 0, aTiempo: 0 };
      byUser[key].cerradas++;
      if (t.assignedAt && t.finishedAt) {
        const h = hoursBetween(t.assignedAt, t.finishedAt);
        byUser[key].horasTotal += h;
        if (h <= 24) byUser[key].aTiempo++;
      }
    });
    return Object.values(byUser)
      .map(u => ({ ...u, nombre: accounts?.[u.username]?.display_name || u.username, promedioHoras: u.cerradas ? u.horasTotal / u.cerradas : 0, pctATiempo: u.cerradas ? Math.round((u.aTiempo / u.cerradas) * 100) : 0 }))
      .sort((a, b) => b.cerradas - a.cerradas)
      .slice(0, 10);
  }, [filteredTasks, accounts]);

  const DONUT_PALETTE = [C.blue, C.amber, C.green, C.red, C.gray, "#8b5cf6", "#0ea5e9"];
  const costBySistemaTotal = cost.bySistema.reduce((s, [, v]) => s + v, 0);

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateExecutivePdf(uptime, compliance, cost, currentUser, compliancePrev, costPrev);
      doc.save(`panel-ejecutivo-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setMsg("No se pudo generar el PDF — revisa la conexión e intenta de nuevo."); }
    setDownloading(false);
  };

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Panel Ejecutivo</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Resumen general, listo para mostrarle a la gerencia.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={async () => {
            setDownloading(true); setMsg(null);
            try {
              const doc = await generateDirectorWeeklyPdf({ tasks, roundsIndex, coldRoundsIndex, meterRoundsIndex, activeIssues, accounts }, currentUser);
              doc.save(`reporte-semanal-${todayStr().replace(/\//g, "-")}.pdf`);
            } catch { setMsg("No se pudo generar el reporte semanal — revisa la conexión e intenta de nuevo."); }
            setDownloading(false);
          }}>Reporte semanal (PDF)</Button>
          <input type="month" value={repMonth} onChange={e => setRepMonth(e.target.value)} aria-label="Mes del informe" className="text-sm border rounded-md px-2 outline-none" style={{ minHeight: 44, borderColor: C.line, background: C.panel, color: C.ink }} />
          <Button variant="ghost" icon={Download} disabled={downloading || !repMonth} onClick={async () => {
            setDownloading(true); setMsg(null);
            try {
              const doc = await generateMonthlyMaintenancePdf({ tasks, equipos, month: repMonth, accounts }, currentUser);
              doc.save(`informe-mantenimiento-${repMonth}.pdf`);
            } catch { setMsg("No se pudo generar el informe mensual — revisa la conexión e intenta de nuevo."); }
            setDownloading(false);
          }}>Informe mensual (PDF)</Button>
          <Button icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
      </div>
      {msg && <div className="text-xs mb-3" style={{ color: C.red }}>{msg}</div>}

      <WeeklyTrendCard tasks={tasks} />
      <ReviewQualityCard tasks={tasks} equipos={equipos} />
      {/* Pulso del mes: lo esencial en 4 números, calculado con las tareas reales */}
      {(() => {
        const all = tasks || [];
        const y = now.getFullYear(), m = now.getMonth();
        const inMonth = (iso, mm) => { if (!iso) return false; const d = new Date(iso); return d.getFullYear() === (mm < 0 ? y - 1 : y) && d.getMonth() === ((mm + 12) % 12); };
        const closedNow = all.filter(t => inMonth(t.finishedAt, m));
        const closedPrev = all.filter(t => inMonth(t.finishedAt, m - 1));
        const avgH = (list) => { const v = list.map(t => (new Date(t.finishedAt) - new Date(t.createdAt || t.assignedAt || t.finishedAt)) / 3600000).filter(h => h >= 0 && isFinite(h)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
        const hNow = avgH(closedNow), hPrev = avgH(closedPrev);
        const open = all.filter(t => normalizeTaskState(t.estado) !== "finalizada" && !t.finishedAt);
        const stale = open.filter(t => Date.now() - new Date(t.createdAt || t.assignedAt || Date.now()).getTime() > 86400000);
        const unassigned = open.filter(t => !t.asignadoA).length;
        const diff = closedNow.length - closedPrev.length;
        const tiles = [
          { k: "Cerradas este mes", v: closedNow.length, s: closedPrev.length ? `${diff >= 0 ? "+" : ""}${diff} vs mes pasado` : "primer mes con datos", c: C.steelDark },
          { k: "Tiempo promedio", v: hNow == null ? "—" : hNow < 48 ? `${hNow.toFixed(1)} h` : `${(hNow / 24).toFixed(1)} d`, s: hNow != null && hPrev != null ? (hNow <= hPrev ? "más rápido que el mes pasado" : "más lento que el mes pasado") : "de abrir a cerrar", c: C.steelDark },
          { k: "Abiertas >24 h", v: stale.length, s: stale.length ? "necesitan seguimiento" : "todo al día", c: stale.length ? C.red : C.green },
          { k: "Sin asignar", v: unassigned, s: unassigned ? "reparte para avanzar" : "todas con responsable", c: unassigned ? "#b45309" : C.green },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4" aria-label="Pulso del mes">
            {tiles.map(t => (
              <div key={t.k} className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.panel }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>{t.k}</div>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: t.c, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{t.v}</div>
                <div className="text-[11px]" style={{ color: C.inkSoft }}>{t.s}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filtros globales */}
      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
          <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Técnico</div>
          <select value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="text-xs font-medium mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: hasActiveFilters ? C.amberSoft : C.bg, color: hasActiveFilters ? "#7a5405" : C.inkSoft }}>
        <CalendarDays size={12} /> Viendo: {hasActiveFilters
          ? `${dateFrom || "inicio"} – ${dateTo || "hoy"}${filterTurno ? ` · ${filterTurno}` : ""}${filterTecnico ? ` · ${filterTecnico}` : ""}`
          : "Este mes (sin filtros)"}
      </div>

      {/* KPIs ejecutivos */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Costo global de operación" value={cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—"}
          trend={!hasActiveFilters ? <TrendBadge current={cost.total} previous={costPrev.total} unit="$" goodDirection="down" /> : null} />
        <StatCard label="Eficiencia global de planta" value={`${avgUptime}%`} valueColor={avgUptime >= 90 ? C.green : C.red}
          tooltip="Promedio de disponibilidad de todos los sistemas: qué % de sus equipos están funcionando (no fuera de servicio) ahora mismo."
          leading={<MiniGauge value={avgUptime} max={100} size={44} color={avgUptime >= 90 ? C.green : C.red} />} />
        <StatCard label="Órdenes cerradas" value={ordenesCerradas}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><ClipboardCheck size={18} color={C.blue} /></div>} />
        <StatCard label="Horas hombre invertidas" value={fmtHours(horasHombre)}
          tooltip="Suma del tiempo que las tareas estuvieron realmente 'En proceso' (no el tiempo total abierto, solo cuando alguien estaba trabajando en ellas activamente), según los filtros de arriba."
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <StatCard label="Cumplimiento de rondas" value={`${compliance.ronda.pct}%`} valueColor={compliance.ronda.pct >= 90 ? C.green : C.red}
          tooltip="Rondas de revisión guardadas este mes, sobre el total que deberían haberse hecho a este punto del mes."
          leading={<MiniGauge value={compliance.ronda.pct} max={100} size={40} stroke={5} color={compliance.ronda.pct >= 90 ? C.green : C.red} />}
          trend={<TrendBadge current={compliance.ronda.pct} previous={compliancePrev.ronda.pct} goodDirection="up" />} />
      </div>

      {technicianRanking.length > 0 && (
        <div className="rounded-xl border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Ranking de técnicos por productividad</div>
          <p className="text-xs mb-3" style={{ color: C.gray }}>Según los filtros de arriba — es informativo (para reconocer buen trabajo), no punitivo: los turnos no siempre tienen la misma carga.</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.gray }}>
                  <th className="text-left py-1.5">#</th>
                  <th className="text-left py-1.5">Técnico</th>
                  <th className="text-right py-1.5">Cerradas</th>
                  <th className="text-right py-1.5">Tiempo promedio</th>
                  <th className="text-right py-1.5">% a tiempo (&lt;24h)</th>
                </tr>
              </thead>
              <tbody>
                {technicianRanking.map((u, i) => (
                  <tr key={u.username} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="py-1.5" style={{ color: C.gray }}>{i + 1}</td>
                    <td className="py-1.5 font-medium" style={{ color: C.ink }}>{u.nombre}</td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: C.blue }}>{u.cerradas}</td>
                    <td className="py-1.5 text-right" style={{ color: C.inkSoft }}>{fmtHours(u.promedioHoras)}</td>
                    <td className="py-1.5 text-right" style={{ color: u.pctATiempo >= 80 ? C.green : C.amber }}>{u.pctATiempo}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cobertura de trabajo por sistema — todos a la vez</div>
        <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <SystemCoverageGrid coverage={systemCoverage} positiveLabel="Con mantenimiento" negativeLabel="Sin ningún registro" showTimeSeries />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {top5Down.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Top 5 — equipos con más tiempo fuera de servicio</div>
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <HorizontalBarChart data={top5Down} labelKey="label" valueKey="totalHours"
                colorFor={e => e.totalHours > 72 ? C.red : C.amber} formatValue={v => fmtHours(v)} />
            </div>
          </div>
        )}
        {preventivoVsCorrectivo.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Preventivo vs. correctivo, por sistema</div>
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <StackedBarChart data={preventivoVsCorrectivo} labelKey="sistema"
                series={[{ key: "preventivo", label: "Preventivo", color: C.blue }, { key: "correctivo", label: "Correctivo", color: C.red }]} />
            </div>
          </div>
        )}
        {costBreakdown.total > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
              Distribución de costos: mano de obra, repuestos y contratista
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-5">
                <MiniDonut size={140} stroke={26}
                  centerValue={`$${(costBreakdown.total / 1000).toFixed(0)}k`} centerLabel="total"
                  segments={[
                    { name: "Mano de obra", value: costBreakdown.manoObra, color: C.blue },
                    { name: "Repuestos", value: costBreakdown.repuestos, color: C.amber },
                    { name: "Contratista", value: costBreakdown.contratista, color: "#8b5cf6" },
                  ]} />
                <div className="space-y-2 flex-1 min-w-0">
                  {[
                    { label: "Mano de obra", value: costBreakdown.manoObra, color: C.blue },
                    { label: "Repuestos", value: costBreakdown.repuestos, color: C.amber },
                    { label: "Contratista", value: costBreakdown.contratista, color: "#8b5cf6" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0" style={{ color: C.ink }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="font-bold shrink-0" style={{ color: C.ink }}>{costBreakdown.total ? ((row.value / costBreakdown.total) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] mt-3 pt-3 border-t" style={{ color: C.gray, borderColor: C.line }}>
                Los registros de antes de tener este desglose cuentan su costo entero como mano de obra — no hay forma honesta de reclasificarlos.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Disponibilidad de equipos por sistema</div>
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <HorizontalBarChart data={uptime} labelKey="sistema" valueKey="pct" max={100}
              colorFor={u => u.pct >= 90 ? C.green : C.red} formatValue={v => `${v}%`} />
          </div>
        </div>

        {cost.bySistema.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Distribución presupuestal por sistema</div>
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-5">
                <MiniDonut segments={cost.bySistema.slice(0, 7).map(([sistema, valor], i) => ({ name: sistema, value: valor, color: DONUT_PALETTE[i % DONUT_PALETTE.length] }))} size={140} stroke={22} />
                <div className="space-y-2 flex-1 min-w-0">
                  {cost.bySistema.slice(0, 7).map(([sistema, valor], i) => (
                    <div key={sistema} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0" style={{ color: C.ink }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
                        <span className="truncate">{sistema}</span>
                      </span>
                      <span className="font-bold shrink-0" style={{ color: C.ink }}>{costBySistemaTotal ? ((valor / costBySistemaTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cumplimiento de rondas este mes (vs. mes pasado)</div>
      <div className="rounded-lg border mb-5 overflow-hidden" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        {[
          { label: "Ronda de revisión", c: compliance.ronda, p: compliancePrev.ronda },
          { label: "Cuartos Fríos", c: compliance.cuartosFrios, p: compliancePrev.cuartosFrios },
          { label: "Lecturas de Medidores", c: compliance.medidores, p: compliancePrev.medidores },
        ].map((row, i) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <span style={{ color: C.ink }}>{row.label}</span>
            <span className="flex items-center gap-2">
              <span style={{ color: C.gray }}>{row.c.actual}/{row.c.expected}</span>
              <span className="font-semibold" style={{ color: row.c.pct >= 90 ? C.green : C.red }}>({row.c.pct}%)</span>
              <span style={{ color: C.gray }}>· antes {row.p.pct}%</span>
            </span>
          </div>
        ))}
      </div>

      <ShiftComplianceTable roundsIndex={roundsIndex} coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} />

      {cost.bySistema.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Costo de mantenimiento por sistema {hasActiveFilters ? "(filtro aplicado)" : "(este mes)"}</div>
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <HorizontalBarChart data={cost.bySistema.slice(0, 10).map(([sistema, valor]) => ({ sistema, valor }))}
              labelKey="sistema" valueKey="valor" colorFor={() => C.amber} gradient
              formatValue={v => `$${(v / 1000).toFixed(0)}k · ${costBySistemaTotal ? ((v / costBySistemaTotal) * 100).toFixed(1) : "0.0"}%`} />
          </div>
        </>
      )}
    </div>
  );
}

/** Barras horizontales APILADAS — cada fila es un sistema, dividida en 2 (o más) segmentos de
 *  color según "series". Útil para comparar preventivo vs correctivo sin necesitar recharts. */
function StackedBarChart({ data, labelKey, series }) {
  const totals = data.map(d => series.reduce((s, sr) => s + (Number(d[sr.key]) || 0), 0));
  const maxTotal = Math.max(1, ...totals);
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {series.map(sr => (
          <span key={sr.key} className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: sr.color }} /> {sr.label}
          </span>
        ))}
      </div>
      <div className="space-y-4">
        {data.map((d, i) => {
          const total = totals[i];
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1.5 gap-3">
                <span style={{ color: C.ink }} className="truncate" title={d[labelKey]}>{d[labelKey]}</span>
                <span className="font-bold shrink-0 tabular-nums" style={{ color: C.ink, fontSize: 15 }}>{total}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden flex" style={{ background: C.bg, height: 10 }}>
                {series.map(sr => {
                  const val = Number(d[sr.key]) || 0;
                  const pct = maxTotal ? (val / maxTotal) * 100 : 0;
                  return pct > 0 ? (
                    <div key={sr.key} title={`${sr.label}: ${val}`} style={{ width: `${pct}%`, background: sr.color, height: "100%", transition: "width 600ms var(--ease-out)" }} />
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Tableros de análisis (Comparar periodos · Fallas · Carga de trabajo) =====
function Spark({ vals, color = "#0e2d4a", w = 84, h = 26 }) {
  const v = vals && vals.length > 1 ? vals : [0, 0];
  const max = Math.max(...v, 1), min = Math.min(...v, 0);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * (w - 4) + 2},${h - 3 - ((x - min) / (max - min || 1)) * (h - 6)}`).join(" ");
  return <svg width={w} height={h} role="img" aria-label="Tendencia"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

// ===== Tendencia semanal (se muestra en el Panel Ejecutivo) =====
/** Calidad del flujo de revisión: cuánto tarda la revisión, cuántas se devuelven y por qué, y qué equipos se repiten. */
function ReviewQualityCard({ tasks, equipos }) {
  const data = useMemo(() => {
    const all = tasks || [];
    const since = Date.now() - 30 * 86400000;
    const rev = all.filter(t => (t.revisiones || []).length || (t.completedAt && t.finishedAt));
    const tiempos = all.filter(t => t.completedAt && t.finishedAt && new Date(t.finishedAt).getTime() >= since).map(t => hoursBetween(t.completedAt, t.finishedAt)).filter(h => h >= 0 && h < 24 * 14);
    const prom = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
    const acc = all.flatMap(t => (t.revisiones || []).filter(r => new Date(r.at).getTime() >= since));
    const devueltas = acc.filter(r => r.accion === "devuelta");
    const pct = acc.length ? Math.round((devueltas.length / acc.length) * 100) : null;
    const motivos = { "Falta foto": 0, "Nota incompleta": 0, "Quedó sin probar": 0, "Repuesto sin registrar": 0, "Otro motivo": 0 };
    devueltas.forEach(r => {
      const n = normalizeSearchText(r.nota || "");
      if (/foto|imagen/.test(n)) motivos["Falta foto"]++;
      else if (/nota|descri|detall|explic/.test(n)) motivos["Nota incompleta"]++;
      else if (/prueb|funcion|sin probar/.test(n)) motivos["Quedó sin probar"]++;
      else if (/repuesto|pieza|material/.test(n)) motivos["Repuesto sin registrar"]++;
      else motivos["Otro motivo"]++;
    });
    const fuera = all.filter(t => /fuera de rango/.test(String(t.notaCierre || "")) && new Date(t.completedAt || t.finishedAt || 0).getTime() >= since).length;
    const sesenta = Date.now() - 60 * 86400000;
    const porEq = {};
    all.filter(t => t.equipoId && t.origen !== "cronograma" && new Date(t.createdAt || t.assignedAt || 0).getTime() >= sesenta).forEach(t => { porEq[t.equipoId] = (porEq[t.equipoId] || 0) + 1; });
    const repetidos = Object.entries(porEq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([id, n]) => ({ nombre: (equipos || []).find(e => e.id === id)?.nombre || "Equipo", n }));
    return { prom, pct, motivos, fuera, repetidos, hayDatos: rev.length > 0 || acc.length > 0 };
  }, [tasks, equipos]);
  if (!data.hayDatos) return null;
  const maxM = Math.max(1, ...Object.values(data.motivos));
  return (
    <div className="rounded-xl border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Calidad de la revisión <span className="text-xs font-normal" style={{ color: C.gray }}>— últimos 30 días</span></div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[[data.prom == null ? "—" : fmtHours(data.prom), "tiempo medio de revisión"], [data.pct == null ? "—" : data.pct + " %", "devueltas"], [data.fuera, "lecturas fuera de rango"]].map(([v, l]) => (
          <div key={l} className="rounded-lg p-2" style={{ background: C.bg }}>
            <div className="text-lg font-extrabold tabular-nums" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{v}</div>
            <div className="text-[11px]" style={{ color: C.inkSoft }}>{l}</div>
          </div>
        ))}
      </div>
      {Object.values(data.motivos).some(v => v > 0) && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Devoluciones por motivo</div>
          {Object.entries(data.motivos).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs py-0.5">
              <span className="w-36 shrink-0" style={{ color: C.inkSoft }}>{k}</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: C.line }}><div style={{ width: `${(v / maxM) * 100}%`, height: "100%", background: C.steel, borderRadius: 4 }} /></div>
              <span className="w-6 text-right font-bold" style={{ color: C.ink }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {data.repetidos.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Equipos que se repiten (60 días)</div>
          {data.repetidos.map(r => <div key={r.nombre} className="text-xs py-0.5" style={{ color: C.ink }}>{r.nombre}: <b>{r.n}</b> fallas</div>)}
        </div>
      )}
    </div>
  );
}

function WeeklyTrendCard({ tasks }) {
  const weeks = useMemo(() => {
    const out = []; const end = new Date(); end.setHours(23, 59, 59, 999);
    for (let i = 7; i >= 0; i--) { const to = end.getTime() - i * 7 * 86400000, from = to - 7 * 86400000; out.push({ from, to, closed: 0, created: 0 }); }
    (tasks || []).forEach(t => { const f = t.finishedAt && new Date(t.finishedAt).getTime(); const c = t.createdAt && new Date(t.createdAt).getTime(); out.forEach(w => { if (f && f > w.from && f <= w.to) w.closed++; if (c && c > w.from && c <= w.to) w.created++; }); });
    return out;
  }, [tasks]);
  const mx = Math.max(1, ...weeks.map(w => w.closed));
  const last = weeks[weeks.length - 1], prev = weeks[weeks.length - 2];
  return (
    <div className="rounded-xl border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="flex items-start justify-between mb-2">
        <div><div className="text-sm font-semibold" style={{ color: C.ink }}>Casos cerrados por semana</div><div className="text-[11px]" style={{ color: C.inkSoft }}>Últimas 8 semanas. Esta semana {last.closed} · la anterior {prev.closed}.</div></div>
        <div className="text-right"><Spark vals={weeks.map(w => w.created)} color="#9db3c7" /><div className="text-[10px]" style={{ color: C.inkSoft }}>casos nuevos</div></div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 70 }}>
        {weeks.map((w, i) => <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}><span className="text-[10px]" style={{ color: C.inkSoft }}>{w.closed}</span><div style={{ width: "100%", height: `${Math.max(3, w.closed / mx * 48)}px`, background: i === weeks.length - 1 ? C.steelDark : "#9db3c7", borderRadius: "4px 4px 0 0" }} /></div>)}
      </div>
    </div>
  );
}