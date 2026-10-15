import { useState } from "react";
import { C, FUEL_ITEMS, fmtDT } from "../shared/core";
import { Button, Sparkline } from "../shared/components";



/**
 * Combustibles y gas — tanques de ACPM/gas para calderas y plantas eléctricas (distinto de
 * "Tanques agua potable"). Cada tanque tiene un volumen inicial y una capacidad total; los
 * registros de consumo por turno bajan el nivel, los de reabastecimiento lo suben. La barra de
 * llenado y la alerta cambian solas de color cuando cae por debajo del % mínimo operativo.
 */
/**
 * Combustibles y gas — ACPM para plantas eléctricas y calderas. Se alimenta de las mismas
 * lecturas que ya se capturan en el recorrido diario (los ítems de "Nivel Tanque de ACPM" en
 * cada piso), igual que ya hace "Tanques agua potable" — no es un registro aparte. Mismo formato
 * de tarjetas, gráfica y detalle por equipo que Análisis de fallas.
 */
/** Tanque de combustible dibujado como un tanque real: el líquido sube hasta el nivel y la raya punteada marca el mínimo (20%). */
function TankGauge({ name, floor, value }) {
  const v = value == null ? null : Math.max(0, Math.min(100, value));
  const col = v == null ? C.gray : v < 20 ? C.red : v < 35 ? C.amber : C.green;
  const label = v == null ? "Sin datos" : v < 20 ? "Reabastecer ya" : v < 35 ? "Casi en el mínimo" : "Bien";
  const bg = v == null ? C.bg : v < 20 ? C.redSoft : v < 35 ? C.amberSoft : C.greenSoft;
  const fg = v == null ? C.gray : v < 20 ? "#8a2a12" : v < 35 ? "#7a4e00" : "#14532d";
  return (
    <div className="rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center" style={{ borderColor: v != null && v < 20 ? C.red : C.line, background: C.panel }}>
      <div role="img" aria-label={`${name}: ${v == null ? "sin datos" : v + " por ciento"}`} className="relative overflow-hidden" style={{ width: 58, height: 130, borderRadius: 12, border: `3px solid ${C.steel}`, background: C.bg }}>
        {v != null && <div className="absolute left-0 right-0 bottom-0" style={{ height: `${v}%`, background: col }}>
          <svg className="pm-tankwave" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: 0, top: -6, width: "200%", height: 10 }}><path d="M0 5Q12 0 25 5T50 5T75 5T100 5T125 5T150 5T175 5T200 5V10H0Z" fill={col} /></svg>
        </div>}
        <div className="absolute" style={{ left: -3, right: -3, bottom: "20%", borderTop: `2px dashed ${C.ink}` }} />
      </div>
      <div className="text-2xl font-bold leading-none" style={{ color: col, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{v == null ? "—" : `${v}%`}</div>
      <div className="text-xs font-semibold leading-tight" style={{ color: C.ink }}>{name}</div>
      {floor && <div className="text-[11px] leading-tight" style={{ color: C.gray }}>{floor}</div>}
      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: bg, color: fg }}>{label}</span>
    </div>
  );
}

export function FuelTanksView({ latestValues, fuelHistory, onManualUpdate, onNavigate }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(null);

  const pctData = FUEL_ITEMS.filter(it => it.u === "%").map(it => {
    const v = latestValues[it.id];
    const val = v && v.value !== "" && v.value !== undefined ? Number(v.value) : null;
    return { id: it.id, item: it, name: it.n, floor: it.floorName, value: val, updatedAt: v?.updatedAt, updatedBy: v?.updatedBy };
  });
  const meterData = FUEL_ITEMS.filter(it => it.u === "gln").map(it => {
    const v = latestValues[it.id];
    const val = v && v.value !== "" && v.value !== undefined ? Number(v.value) : null;
    return { id: it.id, item: it, name: it.n, floor: it.floorName, value: val, updatedAt: v?.updatedAt, updatedBy: v?.updatedBy };
  });

  const colorFor = (v) => v === null ? C.gray : v < 20 ? C.red : v < 50 ? C.amber : C.green;

  const startEdit = (d) => { setEditing(d.id); setDraft(d.value === null ? "" : String(d.value)); setSavedFlash(null); };
  const doSave = async (d, isPct) => {
    const num = Number(draft);
    if (draft === "" || isNaN(num) || num < 0 || (isPct && num > 100)) return;
    await onManualUpdate(d.item, num);
    setEditing(null);
    setSavedFlash(d.id);
    setTimeout(() => setSavedFlash(null), 2500);
  };

  const readPct = pctData.filter(d => d.value !== null);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Combustibles y gas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Nivel de ACPM en plantas eléctricas y calderas. Se alimenta de los valores capturados en cada ronda, pero
        también puedes actualizar cualquiera manualmente aquí mismo — el técnico lo verá como valor anterior en su
        próxima ronda de ese piso, igual que con los tanques de agua potable.
      </p>

      {readPct.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pctData.map(d => <TankGauge key={d.id} name={d.name} floor={d.floor} value={d.value} />)}
          </div>
          <p className="text-[11px] text-center mt-2" style={{ color: C.gray }}>La raya punteada es el mínimo del 20%.</p>
          <div className="flex items-center gap-4 justify-center mt-2 text-xs flex-wrap" style={{ color: C.inkSoft }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.green }} /> ≥ 50%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.amber }} /> 20–49%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.red }} /> &lt; 20%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.gray }} /> Sin datos</span>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {pctData.map(d => {
          const hist = (fuelHistory[d.id] || []).slice(-12).map(h => ({ t: fmtDT(h.at).slice(0, 11), v: Number(h.value) }));
          return (
            <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{d.name}</div>
                  <div className="text-xs" style={{ color: C.gray }}>{d.floor}</div>
                </div>
                <div className="text-lg font-bold" style={{ color: colorFor(d.value) }}>{d.value === null ? "—" : `${d.value}%`}</div>
              </div>

              {editing === d.id ? (
                <div className="flex items-center gap-2 my-2">
                  <input type="number" min={0} max={100} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") doSave(d, true); if (e.key === "Escape") setEditing(null); }}
                    placeholder="0-100" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <span className="text-xs" style={{ color: C.gray }}>%</span>
                  <Button size="sm" onClick={() => doSave(d, true)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="my-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>Actualizar nivel manualmente</Button>
                  {savedFlash === d.id && <span className="text-xs ml-2" style={{ color: C.green }}>✓ Guardado</span>}
                </div>
              )}

              {hist.length > 1 ? (
                <div style={{ width: "100%", height: 70 }}>
                  <Sparkline points={hist} />
                </div>
              ) : <div className="text-xs py-4 text-center" style={{ color: C.gray }}>Sin histórico suficiente</div>}
              <div className="text-xs mt-1" style={{ color: C.gray }}>
                {d.updatedAt ? `Últ. registro: ${fmtDT(d.updatedAt)} · ${d.updatedBy}` : "Sin registros aún"}
              </div>
            </div>
          );
        })}
      </div>

      {meterData.some(d => d.value !== null) && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Medidores de ACPM (galones acumulados, no % de llenado)</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {meterData.map(d => {
              const hist = (fuelHistory[d.id] || []).slice(-12).map(h => ({ t: fmtDT(h.at).slice(0, 11), v: Number(h.value) }));
              return (
                <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: C.ink }}>{d.name}</div>
                      <div className="text-xs" style={{ color: C.gray }}>{d.floor}</div>
                    </div>
                    <div className="text-lg font-bold" style={{ color: C.ink }}>{d.value === null ? "—" : d.value.toLocaleString("es-CO")} <span className="text-xs font-normal" style={{ color: C.gray }}>gln</span></div>
                  </div>

                  {editing === d.id ? (
                    <div className="flex items-center gap-2 my-2">
                      <input type="number" min={0} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") doSave(d, false); if (e.key === "Escape") setEditing(null); }}
                        placeholder="galones" className="w-28 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                      <Button size="sm" onClick={() => doSave(d, false)}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="my-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>Actualizar lectura manualmente</Button>
                      {savedFlash === d.id && <span className="text-xs ml-2" style={{ color: C.green }}>✓ Guardado</span>}
                    </div>
                  )}

                  {hist.length > 1 ? (
                    <div style={{ width: "100%", height: 70 }}>
                      <Sparkline points={hist} />
                    </div>
                  ) : <div className="text-xs py-4 text-center" style={{ color: C.gray }}>Sin histórico suficiente</div>}
                  <div className="text-xs mt-1" style={{ color: C.gray }}>
                    {d.updatedAt ? `Últ. registro: ${fmtDT(d.updatedAt)} · ${d.updatedBy}` : "Sin registros aún"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}