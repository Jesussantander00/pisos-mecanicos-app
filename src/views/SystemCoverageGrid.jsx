import { useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { C, computeTimeSeriesData } from "../shared/core";
import { HorizontalBarChart, TimeSeriesLineChart } from "../shared/components";



/**
 * Cobertura por sistema — dos formas de verlo, con un botón para alternar:
 * "Por sistema": cada sistema trabajado tiene su PROPIA gráfica (barra de % + gráfica de
 * tendencia Preventivo vs Correctivo en el tiempo, igual a la de Análisis de Mantenimiento pero
 * una por sistema), una debajo de otra, para poder mirarlas todas a la vez en la misma pestaña.
 * Los sistemas en 0% van aparte, en una sola gráfica separada.
 * "Panorama completo": una sola gráfica combinada con todos los sistemas juntos (trabajados y no).
 * En cualquiera de las 2, tocar un sistema abre el detalle: EXACTAMENTE qué equipos faltan y
 * cuáles ya se hicieron, por nombre — no solo un punto de color sin más contexto.
 */
export function SystemCoverageGrid({ coverage, positiveLabel = "Trabajados", negativeLabel = "Sin intervenir", detailLabel = "equipo", showTimeSeries = false }) {
  const [selected, setSelected] = useState(null);
  const [modo, setModo] = useState("individual"); // "individual" | "combinado"
  const [tsGrouping, setTsGrouping] = useState("mes");
  const conTrabajo = coverage.filter(c => c.intervenidosCount > 0);
  const sinTrabajar = coverage.filter(c => c.intervenidosCount === 0 && c.total > 0);
  const selectedRow = coverage.find(c => c.sistema === selected);

  const colorFor = (pct) => pct === 0 ? C.gray : pct >= 80 ? C.green : pct >= 40 ? C.amber : C.red;

  const DetailPanel = () => selectedRow && (
    <div className="mt-3 rounded-xl border p-4" style={{ borderColor: C.amber, background: C.panel }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold" style={{ color: C.ink }}>{selectedRow.sistema} — qué falta y qué ya se hizo</div>
        <button onClick={() => setSelected(null)} aria-label="Cerrar" title="Cerrar"><X size={16} color={C.gray} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg p-3" style={{ background: C.redSoft }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: C.red }}>
            <AlertTriangle size={13} /> ❌ Esto es lo que FALTA ({selectedRow.sinIntervenir.length})
          </div>
          {selectedRow.sinIntervenir.length === 0 ? (
            <p className="text-xs" style={{ color: C.gray }}>Nada — nótalo, se le hizo algo a cada {detailLabel} de este sistema.</p>
          ) : selectedRow.sinIntervenir.map(eq => (
            <div key={eq.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.08)", color: C.ink }}>{eq.nombre}</div>
          ))}
        </div>
        <div className="rounded-lg p-3" style={{ background: C.greenSoft }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: C.green }}>
            <CheckCircle2 size={13} /> ✅ Esto ya SE HIZO ({selectedRow.intervenidos.length})
          </div>
          {selectedRow.intervenidos.length === 0 ? (
            <p className="text-xs" style={{ color: C.gray }}>Ninguno todavía.</p>
          ) : selectedRow.intervenidos.map(eq => (
            <div key={eq.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.08)", color: C.ink }}>{eq.nombre}</div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
          <button onClick={() => setModo("individual")} className="px-3 font-semibold" style={{ background: modo === "individual" ? C.steelDark : C.panel, color: modo === "individual" ? "#fff" : C.inkSoft, minHeight: 32 }}>Por sistema</button>
          <button onClick={() => setModo("combinado")} className="px-3 font-semibold" style={{ background: modo === "combinado" ? C.steelDark : C.panel, color: modo === "combinado" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 32 }}>Panorama completo</button>
        </div>
      </div>

      {modo === "combinado" ? (
        <>
          <HorizontalBarChart data={coverage} labelKey="sistema" valueKey="pct" max={100}
            colorFor={(d) => colorFor(d.pct)} formatValue={(v, d) => `${v}% (${d.intervenidosCount}/${d.total})`} />
          <DetailPanel />
        </>
      ) : (
        <>
          {showTimeSeries && conTrabajo.length > 0 && (
            <div className="flex justify-end mb-3">
              <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
                {[{ v: "mes", l: "Mes" }, { v: "semana", l: "Semana" }, { v: "turno", l: "Turno" }].map((o, i) => (
                  <button key={o.v} onClick={() => setTsGrouping(o.v)} className="px-2.5 py-1 font-semibold"
                    style={{ background: tsGrouping === o.v ? C.amber : C.panel, color: tsGrouping === o.v ? "#fff" : C.inkSoft, borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          {conTrabajo.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Ningún sistema tiene trabajo registrado todavía en este período.</p>
          ) : conTrabajo.map(c => {
            const ts = showTimeSeries && c.logsForSistema ? computeTimeSeriesData(c.logsForSistema, tsGrouping) : null;
            return (
              <div key={c.sistema} className="w-full rounded-xl border p-4 mb-3"
                style={{ borderColor: selected === c.sistema ? C.amber : C.line, background: selected === c.sistema ? C.amberSoft : C.panel }}>
                <button onClick={() => setSelected(s => s === c.sistema ? null : c.sistema)} className="w-full text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold" style={{ color: C.ink }}>{c.sistema}</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: colorFor(c.pct) }}>{c.pct}%</div>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ background: C.bg, height: 12 }}>
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: colorFor(c.pct), transition: "width 600ms var(--ease-out)" }} />
                  </div>
                  <div className="text-xs mt-1.5" style={{ color: C.gray }}>{c.intervenidosCount} de {c.total} {detailLabel}s — toca para ver exactamente cuáles</div>
                </button>

                {ts && ts.labels.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Preventivo vs. correctivo en el tiempo</div>
                    <TimeSeriesLineChart height={140}
                      labels={ts.labels}
                      series={[
                        { name: "Preventivo", color: C.green, points: ts.preventivoPts },
                        { name: "Correctivo", color: C.red, points: ts.correctivoPts },
                      ]}
                      trend={ts.trend} />
                  </div>
                )}

                {/* Puntos — uno por equipo de este sistema, verde si ya se intervino, gris si no. Toca la tarjeta arriba para ver la lista exacta. */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                  {[...c.intervenidos, ...c.sinIntervenir].map(eq => (
                    <span key={eq.id} title={`${eq.nombre} — ${eq.dotOk ? positiveLabel : negativeLabel}`}
                      className="w-3 h-3 rounded-full shrink-0" style={{ background: eq.dotOk ? C.green : C.line, border: `1px solid ${eq.dotOk ? C.green : C.gray}` }} />
                  ))}
                </div>
              </div>
            );
          })}
          <DetailPanel />

          {sinTrabajar.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: C.red }}>
                <AlertTriangle size={13} /> Sin ningún trabajo todavía en este período
              </div>
              <HorizontalBarChart data={sinTrabajar} labelKey="sistema" valueKey="total" max={Math.max(...sinTrabajar.map(c => c.total), 1)}
                colorFor={() => C.line} formatValue={(v, d) => `0% (0/${d.total})`} />
            </div>
          )}
        </>
      )}
    </div>
  );
}