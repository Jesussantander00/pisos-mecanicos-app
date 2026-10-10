import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, Download, Mail, TrendingUp, X } from "lucide-react";
import { C, computeEquipmentStats, fmtDT, fmtHours, generateAnalyticsPdf, localDateIso, nowIso, sendAnalyticsEmailAuto, todayStr, useBackCloseModal } from "../shared/core";
import { SystemCoverageGrid } from "./SystemCoverageGrid";
import { Button, HorizontalBarChart, Pill, StatCard } from "../shared/components";



export function EquipmentAnalyticsView({ issueHistory, activeIssues, reportEmail, onLogSent, currentUser }) {
  const [expanded, setExpanded] = useState(null);
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  // ===== Filtros estandarizados (mismo patrón que Análisis de Mantenimiento / Panel Ejecutivo) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  useBackCloseModal(showExportModal, () => setShowExportModal(false));

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const tecnicos = useMemo(() => [...new Set(issueHistory.map(h => h.resolvedBy).filter(Boolean))].sort(), [issueHistory]);
  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); };

  const setQuickRange = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setDateFrom(localDateIso(d));
    setDateTo(localDateIso(new Date()));
  };

  const sinceDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const untilDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

  const filteredIssueHistory = useMemo(() => {
    return issueHistory.filter(h => {
      const d = new Date(h.openedAt);
      if (sinceDate && d < sinceDate) return false;
      if (untilDate && d > untilDate) return false;
      if (filterTurno && turnoOf(h.openedAt) !== filterTurno) return false;
      if (filterTecnico && h.resolvedBy !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueHistory, dateFrom, dateTo, filterTurno, filterTecnico]);

  const filteredActiveIssues = useMemo(() => {
    const entries = Object.entries(activeIssues || {}).filter(([, a]) => {
      const d = new Date(a.openedAt);
      if (sinceDate && d < sinceDate) return false;
      if (untilDate && d > untilDate) return false;
      if (filterTurno && turnoOf(a.openedAt) !== filterTurno) return false;
      if (filterTecnico) return false; // aún no resuelta -> no tiene "resuelto por" con quien comparar
      return true;
    });
    return Object.fromEntries(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIssues, dateFrom, dateTo, filterTurno, filterTecnico]);

  const stats = useMemo(() => computeEquipmentStats(filteredIssueHistory, filteredActiveIssues, null), [filteredIssueHistory, filteredActiveIssues]);

  // ===== "Cobertura" adaptada a fallas: por piso/área (no hay "sistema" en este listado de
  // equipos), qué % NUNCA ha fallado — lo positivo aquí es "cero incidentes", no "se le hizo algo" =====
  const floorCoverage = useMemo(() => {
    const byFloor = {};
    stats.forEach(e => {
      const floor = e.floorName || "Sin piso";
      if (!byFloor[floor]) byFloor[floor] = [];
      byFloor[floor].push(e);
    });
    return Object.entries(byFloor).map(([sistema, eqs]) => {
      const intervenidos = eqs.filter(e => e.incidents.length === 0).map(e => ({ id: e.equipmentId, nombre: e.name, dotOk: true }));
      const sinIntervenir = eqs.filter(e => e.incidents.length > 0).map(e => ({ id: e.equipmentId, nombre: `${e.name} (${e.incidents.length} falla${e.incidents.length !== 1 ? "s" : ""})`, dotOk: false }));
      const pct = eqs.length ? Math.round((intervenidos.length / eqs.length) * 100) : 0;
      return { sistema, total: eqs.length, intervenidosCount: intervenidos.length, pct, intervenidos, sinIntervenir };
    }).sort((a, b) => b.pct - a.pct);
  }, [stats]);


  const byDowntime = stats.slice(0, 10).map(e => ({ label: `${e.name} (${e.floorName})`, hours: Math.round(e.totalHours * 10) / 10 }));
  const byFrequencySorted = [...stats].sort((a, b) => b.incidents.length - a.incidents.length).slice(0, 10);
  const byFrequencyTotalAll = stats.reduce((s, e) => s + e.incidents.length, 0);
  let cumIncidents = 0;
  const byFrequency = byFrequencySorted.map(e => {
    cumIncidents += e.incidents.length;
    return { label: `${e.name} (${e.floorName})`, incidentes: e.incidents.length, cumPct: byFrequencyTotalAll ? (cumIncidents / byFrequencyTotalAll) * 100 : 0 };
  });

  const totalCurrentlyDown = stats.filter(e => e.currentlyDown).length;
  const totalIncidents = stats.reduce((a, e) => a + e.incidents.length, 0);
  const longestActive = stats.filter(e => e.currentlyDown).sort((a, b) => b.totalHours - a.totalHours)[0];
  const topIncidencia = byFrequencySorted[0];

  // "Fallas críticas": incidentes (resueltos o activos) que duraron/llevan más de 24h fuera de servicio.
  const fallasCriticas = stats.reduce((s, e) => s + e.incidents.filter(inc => inc.hours > 24).length, 0);

  // "Tiempo promedio de diagnóstico" (MTTR): promedio de horas de los incidentes ya resueltos en el período.
  const resolvedIncidents = stats.flatMap(e => e.incidents).filter(inc => !inc.ongoing);
  const mttr = resolvedIncidents.length ? resolvedIncidents.reduce((s, inc) => s + inc.hours, 0) / resolvedIncidents.length : null;

  const rangeLabel = hasActiveFilters
    ? `${dateFrom || "inicio"} – ${dateTo || "hoy"}${filterTurno ? ` · ${filterTurno}` : ""}${filterTecnico ? ` · ${filterTecnico}` : ""}`
    : "Todo el historial";
  const summary = { totalCurrentlyDown, totalIncidents };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateAnalyticsPdf(stats, rangeLabel, summary, currentUser);
      doc.save(`analisis-fallas-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch {
      setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión a internet)." });
    }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendAnalyticsEmailAuto(emailTo.trim(), stats, rangeLabel, summary, currentUser);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Análisis de fallas (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Análisis de fallas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Cuánto tiempo y con qué frecuencia ha estado cada equipo fuera de servicio, para darle seguimiento a los que fallan seguido.
      </p>

      {floorCoverage.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Todos los pisos/áreas — cuáles equipos nunca han fallado</div>
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <SystemCoverageGrid coverage={floorCoverage} positiveLabel="Nunca han fallado" negativeLabel="Con al menos una falla" detailLabel="equipo" />
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-1.5">
          {[30, 90, 365].map(d => (
            <button key={d} onClick={() => setQuickRange(d)} className="text-xs font-medium px-2 py-1.5 rounded-md" style={{ background: C.bg, color: C.inkSoft }}>
              {d}d
            </button>
          ))}
        </div>
        {(showAdvFilters || filterTurno || filterTecnico) && (
          <>
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
          </>
        )}
        {!showAdvFilters && !filterTurno && !filterTecnico && (
          <button onClick={() => setShowAdvFilters(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ color: C.amber }}>
            Filtros avanzados
          </button>
        )}
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
        <button onClick={() => setShowExportModal(true)} title="Descargar o enviar PDF" className="p-2 rounded-md shrink-0 ml-auto" style={{ background: C.bg }}>
          <Download size={16} color={C.ink} />
        </button>
      </div>

      <div className="text-xs font-medium mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: hasActiveFilters ? C.amberSoft : C.bg, color: hasActiveFilters ? "#7a5405" : C.inkSoft }}>
        <CalendarDays size={12} /> Viendo: {rangeLabel}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Fallas críticas (>24h)" value={fallasCriticas} valueColor={fallasCriticas ? C.red : C.ink}
          accent={fallasCriticas ? "red" : null}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: fallasCriticas ? C.redSoft : C.greenSoft }}><AlertTriangle size={18} color={fallasCriticas ? C.red : C.green} /></div>} />
        <StatCard label="Tiempo prom. de diagnóstico" value={mttr != null ? fmtHours(mttr) : "—"}
          tooltip="Promedio de horas que un equipo estuvo fuera de servicio hasta resolverse, entre los incidentes ya cerrados en el período filtrado."
          accent={mttr != null && mttr > 48 ? "red" : mttr != null && mttr > 24 ? "amber" : null}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Mayor incidencia</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><TrendingUp size={18} color={C.blue} /></div>
            <div className="text-sm font-bold leading-tight" style={{ color: C.ink }}>
              {topIncidencia ? `${topIncidencia.name} · ${topIncidencia.incidents.length} fallas` : "Ninguna"}
            </div>
          </div>
        </div>
        <StatCard label="Estado actual de reparaciones" value={totalCurrentlyDown ? `${totalCurrentlyDown} activas` : "Al día"} valueColor={totalCurrentlyDown ? C.red : C.green}
          leading={
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: totalCurrentlyDown ? C.redSoft : C.greenSoft }}>
              {totalCurrentlyDown ? <AlertTriangle size={18} color={C.red} /> : <CheckCircle2 size={18} color={C.green} />}
            </div>
          } />
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowExportModal(false)}>
          <div className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold" style={{ color: C.ink }}>PDF de este reporte ({rangeLabel})</div>
              <button onClick={() => setShowExportModal(false)} aria-label="Cerrar"><X size={18} color={C.gray} /></button>
            </div>
            <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadPdf}>
              {downloading ? "Generando…" : "Descargar PDF"}
            </Button>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
                className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
              <Button icon={Mail} disabled={sending} onClick={doSendEmail}>{sending ? "Enviando…" : "Enviar"}</Button>
            </div>
            {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
          </div>
        </div>
      )}

      {stats.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          {hasActiveFilters ? "No hay incidentes que coincidan con estos filtros." : "No hay incidentes registrados en este período."}
        </p>
      ) : (
        <>
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Tiempo total fuera de servicio (horas)</div>
            <HorizontalBarChart data={byDowntime} labelKey="label" valueKey="hours" colorFor={(d, i) => i === 0 ? C.red : C.gray} gradient formatValue={v => `${v} h`} />
          </div>

          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Equipos que más veces han fallado — orden de Pareto</div>
            <div className="text-xs mb-3" style={{ color: C.gray }}>Ordenados de mayor a menor, con el % acumulado — para ver de un vistazo dónde enfocar el mantenimiento correctivo.</div>
            <HorizontalBarChart data={byFrequency} labelKey="label" valueKey="incidentes" colorFor={() => C.amber} gradient
              formatValue={(v, d) => `${v} · ${d.cumPct.toFixed(1)}% acum.`} />
          </div>

          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Detalle por equipo</div>
            {stats.map(eq => (
              <div key={eq.equipmentId} className="border-b last:border-0 py-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <button onClick={() => setExpanded(expanded === eq.equipmentId ? null : eq.equipmentId)}
                  className="w-full flex items-center justify-between text-left">
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>
                      {eq.name} <span style={{ color: C.gray, fontWeight: 400 }}>· {eq.floorName}</span>
                      {eq.currentlyDown && <span className="ml-2 inline-block"><Pill tone="red">Fuera de servicio</Pill></span>}
                    </div>
                    <div className="text-xs" style={{ color: C.gray }}>
                      {eq.incidents.length} incidente{eq.incidents.length !== 1 ? "s" : ""} · {fmtHours(eq.totalHours)} acumuladas
                    </div>
                  </div>
                  {expanded === eq.equipmentId ? <ChevronDown size={16} style={{ color: C.gray }} /> : <ChevronRight size={16} style={{ color: C.gray }} />}
                </button>
                {expanded === eq.equipmentId && (
                  <div className="mt-2 pl-1">
                    {eq.incidents.map((inc, i) => (
                      <div key={i} className="text-xs py-1.5 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                        <div style={{ color: C.ink }}>
                          Desde {fmtDT(inc.from)} — {inc.ongoing ? <b style={{ color: C.red }}>sigue fuera de servicio</b> : `hasta ${fmtDT(inc.to)}`}
                          <span style={{ color: C.gray }}> · {fmtHours(inc.hours)}</span>
                        </div>
                        {inc.solution && <div style={{ color: C.gray }}>Solución: {inc.solution} (por {inc.resolvedBy})</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}