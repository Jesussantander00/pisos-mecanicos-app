import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Gauge, TrendingUp, Wrench, X } from "lucide-react";
import { C, MESES_CORTOS, computeComplianceForMonth, computeEquipmentStats, computeEquipoStats, computeSystemCoverage, currentEquipoStatus, elapsed, fmtDT, fmtHours, hoursBetween, localDateIso, median } from "../shared/core";
import { SystemCoverageGrid } from "./SystemCoverageGrid";
import { HorizontalBarChart, MiniDonut, MiniGauge, StatCard, TimeSeriesLineChart } from "../shared/components";



export function MaintenanceAnalyticsView({ equipos, mttoLog, issueHistory, activeIssues, roundsIndex, coldRoundsIndex, meterRoundsIndex }) {
  const activeEquipos = equipos.filter(e => e.active !== false);

  // ===== Filtros globales de analítica ===================================
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");
  const [filterSistema, setFilterSistema] = useState("");
  const [tsGrouping, setTsGrouping] = useState("mes"); // "mes" | "semana" | "turno"

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };

  const tecnicos = useMemo(() => [...new Set(mttoLog.map(r => r.tecnico).filter(Boolean))].sort(), [mttoLog]);
  const sistemasDisponibles = useMemo(() => [...new Set(activeEquipos.map(e => e.sistema).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipos]);

  const filteredLog = useMemo(() => {
    return mttoLog.filter(r => {
      const d = new Date(r.fecha);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(r.fecha) !== filterTurno) return false;
      if (filterTecnico && r.tecnico !== filterTecnico) return false;
      if (filterSistema) {
        const eq = activeEquipos.find(e => e.id === r.equipoId);
        if (!eq || eq.sistema !== filterSistema) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, dateFrom, dateTo, filterTurno, filterTecnico, filterSistema, equipos]);

  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico || filterSistema;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); setFilterSistema(""); };

  // ===== Datos derivados (sobre filteredLog) ==============================
  const bySistema = useMemo(() => {
    const map = {};
    filteredLog.forEach(r => {
      const eq = activeEquipos.find(e => e.id === r.equipoId);
      if (!eq) return;
      map[eq.sistema] = (map[eq.sistema] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([sistema, mantenimientos]) => ({ sistema, mantenimientos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);
  const bySistemaTotal = bySistema.reduce((s, d) => s + d.mantenimientos, 0);

  const topCorrectivos = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, correctivos: filteredLog.filter(r => r.equipoId === eq.id && r.tipo === "correctivo").length }))
      .filter(x => x.correctivos > 0)
      .sort((a, b) => b.correctivos - a.correctivos)
      .slice(0, 10)
      .map(x => ({ label: x.eq.nombre, fallas: x.correctivos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);

  const criticalityData = useMemo(() => {
    return activeEquipos.map(eq => {
      const records = filteredLog.filter(r => r.equipoId === eq.id);
      const frecuencia = records.filter(r => r.tipo === "correctivo").length;
      const costo = records.reduce((s, r) => s + (Number(r.costo) || 0), 0);
      return { nombre: eq.nombre, sistema: eq.sistema, frecuencia, costo };
    }).filter(d => d.frecuencia > 0 || d.costo > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);

  // Estado actual "fuera de servicio" y candidatos a reemplazo: se calculan sobre TODO el
  // historial (no solo lo filtrado), porque son sobre la situación real ahora mismo, no sobre
  // un período de análisis.
  const outOfService = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, status: currentEquipoStatus(eq.id, mttoLog) }))
      .filter(x => x.status.outOfService)
      .sort((a, b) => new Date(a.status.since) - new Date(b.status.since));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const replaceCandidates = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, stats: computeEquipoStats(eq, mttoLog) }))
      .filter(x => x.stats.correctivos >= 3)
      .sort((a, b) => b.stats.correctivos - a.stats.correctivos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const totalMantenimientos = filteredLog.length;
  const totalCosto = filteredLog.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const totalCorrectivos = filteredLog.filter(r => r.tipo === "correctivo").length;
  const totalPreventivos = totalMantenimientos - totalCorrectivos;
  const pctPreventivo = totalMantenimientos > 0 ? Math.round((totalPreventivos / totalMantenimientos) * 100) : 0;
  const tipoSplit = [
    { name: "Preventivo", value: totalPreventivos },
    { name: "Correctivo", value: totalCorrectivos },
  ].filter(d => d.value > 0);

  // ===== MTTR / MTBF — de la vida real de los equipos (cuánto duran fuera de servicio, y cada
  // cuánto vuelven a fallar), usando el mismo historial de fallas que Análisis de fallas =========
  const equipmentStats = useMemo(() => computeEquipmentStats(issueHistory || [], activeIssues || {}, null), [issueHistory, activeIssues]);
  const { mttr, mtbf } = useMemo(() => {
    const resolved = equipmentStats.flatMap(e => e.incidents).filter(i => !i.ongoing);
    const mttrVal = resolved.length ? resolved.reduce((s, i) => s + i.hours, 0) / resolved.length : null;
    const gaps = [];
    equipmentStats.forEach(e => {
      const sorted = [...e.incidents].sort((a, b) => new Date(a.from) - new Date(b.from));
      for (let i = 1; i < sorted.length; i++) gaps.push(hoursBetween(sorted[i - 1].from, sorted[i].from));
    });
    const mtbfVal = gaps.length ? gaps.reduce((s, v) => s + v, 0) / gaps.length : null;
    return { mttr: mttrVal, mtbf: mtbfVal };
  }, [equipmentStats]);

  // ===== Cumplimiento de rondas del mes actual, con decimales =====
  const roundsCompliance = useMemo(() => computeComplianceForMonth(new Date(), roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const roundsPctDecimal = roundsCompliance.ronda.expected > 0
    ? Math.min(100, (roundsCompliance.ronda.actual / roundsCompliance.ronda.expected) * 100)
    : 100;

  // ===== Serie de tiempo (Mes / Semana / Turno) con tendencia (promedio móvil de fallas) =====
  const timeSeries = useMemo(() => {
    const buckets = {};
    const keyFor = (fecha) => {
      const d = new Date(fecha);
      if (tsGrouping === "turno") return `${localDateIso(d)} ${turnoOf(fecha)}`;
      if (tsGrouping === "semana") {
        const monday = new Date(d);
        const day = (monday.getDay() + 6) % 7; // 0 = lunes
        monday.setDate(monday.getDate() - day);
        return localDateIso(monday);
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    filteredLog.forEach(r => {
      const k = keyFor(r.fecha);
      if (!buckets[k]) buckets[k] = { preventivo: 0, correctivo: 0 };
      buckets[k][r.tipo === "correctivo" ? "correctivo" : "preventivo"]++;
    });
    const keys = Object.keys(buckets).sort();
    const labelFor = (k) => {
      if (tsGrouping === "turno") return k.split(" ")[1]?.slice(0, 3) || k;
      if (tsGrouping === "semana") return k.slice(5); // MM-DD
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
  }, [filteredLog, tsGrouping]);

  const systemCoverage = useMemo(() => {
    const sinceDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    return computeSystemCoverage(equipos, mttoLog, sinceDate);
  }, [equipos, mttoLog, dateFrom]);

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Análisis de Mantenimiento</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Historial de mantenimientos y fallas por equipo, para decidir con datos si vale la pena seguir reparando algo o es mejor reemplazarlo.
      </p>

      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Todos los sistemas — cuáles ya se trabajaron y cuáles no</div>
        <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <SystemCoverageGrid coverage={systemCoverage} positiveLabel="Con mantenimiento" negativeLabel="Sin ningún registro" showTimeSeries />
        </div>
      </div>

      {/* Filtros globales de analítica */}
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
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Sistema</div>
          <select value={filterSistema} onChange={e => setFilterSistema(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {sistemasDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
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
          ? `${dateFrom || "inicio"} – ${dateTo || "hoy"}${filterTurno ? ` · ${filterTurno}` : ""}${filterTecnico ? ` · ${filterTecnico}` : ""}${filterSistema ? ` · ${filterSistema}` : ""}`
          : "Todo el historial"}
      </div>

      {/* KPIs de eficiencia */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatCard label="Fuera de servicio" value={outOfService.length} valueColor={outOfService.length ? C.red : C.ink}
          leading={
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: outOfService.length ? C.redSoft : C.greenSoft }}>
              {outOfService.length ? <AlertTriangle size={18} color={C.red} /> : <CheckCircle2 size={18} color={C.green} />}
            </div>
          } />
        <StatCard label="Mantenimientos (filtro)" value={totalMantenimientos}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><Wrench size={18} color={C.blue} /></div>}
          breakdown={totalMantenimientos > 0 ? [
            { label: "Preventivo", value: totalPreventivos, color: C.green },
            { label: "Correctivo", value: totalCorrectivos, color: C.red },
          ] : null} />
        <StatCard label="MTTR (reparación)" value={mttr != null ? fmtHours(mttr) : "—"}
          tooltip="Tiempo Medio de Reparación: el promedio de horas que un equipo pasa fuera de servicio, desde que se marca dañado hasta que se resuelve. Se calcula con todos los incidentes ya cerrados."
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <StatCard label="MTBF (entre fallas)" value={mtbf != null ? fmtHours(mtbf) : "—"}
          tooltip="Tiempo Medio Entre Fallas: el promedio de tiempo que pasa entre el cierre de una falla y el inicio de la siguiente, en el mismo equipo. Más alto es mejor — indica equipos más confiables."
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><TrendingUp size={18} color={C.blue} /></div>} />
        <StatCard label="Cumplimiento de rondas" value={`${roundsPctDecimal.toFixed(1)}%`} valueColor={roundsPctDecimal >= 90 ? C.green : C.red}
          tooltip="Rondas de revisión guardadas este mes, sobre el total que deberían haberse hecho a este punto del mes (según el número de pisos y días transcurridos)."
          leading={<MiniGauge value={roundsPctDecimal} max={100} size={40} stroke={5} color={roundsPctDecimal >= 90 ? C.green : C.red} />} />
        <StatCard label="Costo acumulado (filtro)" value={totalCosto ? `$${totalCosto.toLocaleString("es-CO")}` : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Gauge size={18} color={C.amber} /></div>} />
      </div>

      {totalMantenimientos === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          {hasActiveFilters ? "No hay mantenimientos que coincidan con estos filtros." : "Todavía no hay mantenimientos registrados desde la app."}
        </p>
      ) : (
        <>
          {/* Tendencia temporal */}
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Preventivo vs. correctivo en el tiempo</div>
              <div className="flex rounded-md border overflow-hidden text-xs">
                {[{ v: "mes", l: "Mes" }, { v: "semana", l: "Semana" }, { v: "turno", l: "Turno" }].map(o => (
                  <button key={o.v} onClick={() => setTsGrouping(o.v)}
                    className="px-2.5 py-1 font-semibold"
                    style={{ background: tsGrouping === o.v ? C.amber : C.panel, color: tsGrouping === o.v ? "#fff" : C.inkSoft, borderLeft: o.v !== "mes" ? `1px solid ${C.line}` : "none" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <TimeSeriesLineChart
              labels={timeSeries.labels}
              series={[
                { name: "Preventivo", color: C.green, points: timeSeries.preventivoPts },
                { name: "Correctivo", color: C.red, points: timeSeries.correctivoPts },
              ]}
              trend={timeSeries.trend}
            />
            <div className="text-xs mt-2" style={{ color: C.gray }}>
              La línea punteada es el promedio móvil de fallas correctivas — si sube de forma sostenida, es señal de que algún equipo se está acercando a su ciclo de falla.
            </div>
          </div>

          {/* Donut + barras por sistema */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {tipoSplit.length > 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.gray }}>Preventivo vs. correctivo</div>
                <div className="flex items-center gap-6">
                  <MiniDonut segments={tipoSplit.map(d => ({ name: d.name, value: d.value, color: d.name === "Preventivo" ? C.green : C.red }))} size={150} stroke={24} />
                  <div className="space-y-3 flex-1">
                    {tipoSplit.map(d => (
                      <div key={d.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.name === "Preventivo" ? C.green : C.red }} />
                          {d.name}
                        </span>
                        <span className="text-right">
                          <span className="font-bold tabular-nums" style={{ color: d.name === "Preventivo" ? C.green : C.red }}>{d.value}</span>
                          <span className="text-xs ml-1" style={{ color: C.gray }}>({Math.round((d.value / totalMantenimientos) * 100)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs mt-3" style={{ color: C.gray }}>Pasa el cursor sobre el anillo para ver el detalle de cada tipo.</div>
              </div>
            )}

            {bySistema.length > 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.gray }}>Carga operativa por sistema</div>
                <HorizontalBarChart data={bySistema} labelKey="sistema" valueKey="mantenimientos" colorFor={() => C.blue} gradient
                  formatValue={v => `${v} · ${bySistemaTotal ? ((v / bySistemaTotal) * 100).toFixed(1) : "0.0"}%`} />
              </div>
            )}
          </div>

          {/* Matriz de criticidad */}
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Matriz de criticidad — frecuencia de fallas vs. costo acumulado</div>
            <div className="text-xs mb-3" style={{ color: C.inkSoft }}>Cada punto es un equipo. Pasa el cursor sobre uno para ver el detalle. Los del cuadrante rojo son los que más vale la pena evaluar para reemplazo.</div>
            <CriticalityScatter data={criticalityData} />
          </div>

          {topCorrectivos.length > 0 && (
            <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Equipos con más fallas (correctivos)</div>
              <HorizontalBarChart data={topCorrectivos} labelKey="label" valueKey="fallas" colorFor={() => C.red} />
            </div>
          )}

          {replaceCandidates.length > 0 && (
            <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.amber, background: C.amberSoft }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.amber }}>Candidatos a evaluar reemplazo</div>
              <div className="text-xs mb-2" style={{ color: C.amber }}>
                3 o más reparaciones registradas — vale la pena revisar si sale más rentable cambiarlos que seguir reparándolos.
                Esto es solo una guía simple según la cantidad de fallas (y el costo, si lo registras); no es un análisis financiero completo.
              </div>
              {replaceCandidates.map(({ eq, stats }) => (
                <div key={eq.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.08)", color: C.amber }}>
                  <b>{eq.nombre}</b> ({eq.sistema}) — {stats.correctivos} fallas{stats.costoTotal ? `, $${stats.costoTotal.toLocaleString("es-CO")} acumulado` : ""}
                </div>
              ))}
            </div>
          )}

          {outOfService.length > 0 && (
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Fuera de servicio ahora mismo</div>
              {outOfService.map(({ eq, status }) => (
                <div key={eq.id} className="text-xs py-1.5 border-b last:border-0 flex items-center justify-between" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <span style={{ color: C.ink }}>{eq.nombre} <span style={{ color: C.gray }}>({eq.sistema})</span></span>
                  <span style={{ color: C.red }}>Desde {fmtDT(status.since)} · {elapsed(status.since)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Matriz de criticidad: frecuencia de fallas (eje X) vs. costo acumulado (eje Y), un punto por
 * equipo. El cuadrante superior derecho (alta frecuencia + alto costo) es el que vale la pena
 * evaluar para reemplazo — se resalta con fondo rojo suave.
 */
function CriticalityScatter({ data }) {
  const width = 640, height = 320;
  const padL = 46, padR = 16, padT = 16, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const [hover, setHover] = useState(null);

  if (data.length === 0) return <div className="text-sm text-center py-10" style={{ color: C.gray }}>Sin fallas correctivas registradas todavía.</div>;

  const maxF = Math.max(1, ...data.map(d => d.frecuencia));
  const maxC = Math.max(1, ...data.map(d => d.costo));
  const medF = median(data.map(d => d.frecuencia));
  const medC = median(data.map(d => d.costo));
  const xAt = (f) => padL + (f / maxF) * plotW;
  const yAt = (c) => padT + (1 - c / maxC) * plotH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible", display: "block" }}>
        <rect x={xAt(medF)} y={padT} width={Math.max(0, width - padR - xAt(medF))} height={Math.max(0, yAt(medC) - padT)} fill={C.redSoft} opacity={0.6} />
        <text x={width - padR - 4} y={padT + 14} textAnchor="end" fontSize={9} fill={C.red} fontWeight="600">Evaluar reemplazo</text>
        <line x1={xAt(medF)} x2={xAt(medF)} y1={padT} y2={height - padB} stroke={C.line} strokeDasharray="3 3" />
        <line x1={padL} x2={width - padR} y1={yAt(medC)} y2={yAt(medC)} stroke={C.line} strokeDasharray="3 3" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={C.line} strokeWidth={1} />
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={C.line} strokeWidth={1} />
        <text x={(padL + width - padR) / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={C.gray}>Frecuencia de fallas (correctivos) →</text>
        <text x={12} y={(padT + height - padB) / 2} textAnchor="middle" fontSize={10} fill={C.gray} transform={`rotate(-90 12 ${(padT + height - padB) / 2})`}>Costo acumulado →</text>
        {data.map((d, i) => {
          const critical = d.frecuencia >= medF && d.costo >= medC && d.frecuencia > 0;
          return (
            <circle key={i} cx={xAt(d.frecuencia)} cy={yAt(d.costo)} r={hover === d ? 8 : 6}
              fill={critical ? C.red : C.blue} opacity={0.85} stroke="#fff" strokeWidth={1.5}
              style={{ cursor: "pointer", transition: "r 150ms" }}
              onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(h => h === d ? null : h)} />
          );
        })}
      </svg>
      {hover && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-2 text-xs pointer-events-none"
          style={{
            left: `${Math.min(85, Math.max(15, (xAt(hover.frecuencia) / width) * 100))}%`,
            top: `${Math.max(4, (yAt(hover.costo) / height) * 100 - 14)}%`,
            transform: "translate(-50%, -100%)", background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10,
          }}>
          <div className="font-semibold">{hover.nombre}</div>
          <div style={{ color: C.gray }}>{hover.sistema}</div>
          <div>{hover.frecuencia} falla{hover.frecuencia === 1 ? "" : "s"} · ${hover.costo.toLocaleString("es-CO")}</div>
        </div>
      )}
    </div>
  );
}