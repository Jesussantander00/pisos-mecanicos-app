import { useState } from "react";
import { X } from "lucide-react";
import { C, MESES_LABELS, MTTO_ESTADO_COLORS, badgeToneFor, fmtDT, useBackCloseModal } from "../shared/core";
import { Badge, Button, EquipoHistorySuggestions, MaintenanceTextSuggestions, PartsPicker, PhotoPicker } from "../shared/components";



/**
 * Panel lateral de detalle de una celda del cronograma (equipo + mes): muestra la última
 * intervención real de ese mes (técnico, fecha, observaciones, fotos si las hay), y permite
 * reprogramar el estado/fecha de esa celda o registrar un mantenimiento extraordinario.
 */
export function CronogramaDetailDrawer({ equipo, mesNum, entry, equipoCronograma, mttoLog, invItems, onClose, onReprogram, onLogExtraordinary, onZoom }) {
  useBackCloseModal(true, onClose); // este drawer, al estar montado, siempre está "abierto"
  const [reprogramming, setReprogramming] = useState(false);
  const [newEstado, setNewEstado] = useState(entry?.estado || "pendiente");
  const [newFecha, setNewFecha] = useState(entry?.fechaEjecucion || "");
  const [reprogSaving, setReprogSaving] = useState(false);
  const [chainRest, setChainRest] = useState(false);

  const [showExtra, setShowExtra] = useState(false);
  const [extraForm, setExtraForm] = useState({ descripcion: "", costo: "", fotos: [], repuestos: [] });
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraMsg, setExtraMsg] = useState(null);

  const year = new Date().getFullYear();
  const matches = (mttoLog || []).filter(r => {
    if (r.equipoId !== equipo.id) return false;
    const d = new Date(r.fecha);
    return d.getMonth() + 1 === mesNum && d.getFullYear() === year;
  }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const lastReal = matches[0] || null;

  const doReprogram = async () => {
    setReprogSaving(true);
    await onReprogram(equipo.id, mesNum, { estado: newEstado, fechaEjecucion: newFecha || null });
    // "Reprogramar en cadena": si este mes se atrasó (ej. faltó el repuesto), correr también un
    // mes hacia adelante los meses programados que faltan este año — así no queda el resto del
    // cronograma anual desfasado sin que nadie se dé cuenta.
    if (chainRest) {
      const futuros = (equipoCronograma || []).filter(c => c.programado && c.mesNum > mesNum && c.mesNum <= 12).sort((a, b) => b.mesNum - a.mesNum);
      for (const c of futuros) {
        const destino = c.mesNum + 1;
        if (destino > 12) continue; // no se corre más allá de diciembre de este año
        await onReprogram(equipo.id, destino, { estado: "pendiente", programado: true, tipo: c.tipo, tecnico: c.tecnico, fechaEjecucion: null });
        await onReprogram(equipo.id, c.mesNum, { programado: false });
      }
    }
    setReprogSaving(false);
    setReprogramming(false);
    setChainRest(false);
  };

  const doExtra = async () => {
    if (extraForm.fotos.length === 0) { setExtraMsg({ ok: false, text: "Adjunta al menos una foto." }); return; }
    setExtraSaving(true); setExtraMsg(null);
    try {
      await onLogExtraordinary(equipo.id, { tipo: "correctivo", ...extraForm });
      setExtraMsg({ ok: true, text: "✓ Registrado en la hoja de vida del equipo." });
      setExtraForm({ descripcion: "", costo: "", fotos: [], repuestos: [] });
      setShowExtra(false);
    } catch (e) {
      setExtraMsg({ ok: false, text: e.message || "No se pudo registrar — revisa tu conexión e intenta de nuevo." });
    }
    setExtraSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0" style={{ background: "rgba(10,14,20,0.5)", zIndex: 150 }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] overflow-y-auto pm-stagger-in" style={{ background: C.panel, zIndex: 151, boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" }}>
        <div className="pm-safe-top sticky top-0 flex items-start justify-between gap-2 p-4 border-b" style={{ background: C.panel, borderColor: C.line }}>
          <div className="min-w-0">
            <div className="text-base font-semibold" style={{ color: C.ink }}>{equipo.nombre}</div>
            <div className="text-xs" style={{ color: C.gray }}>{equipo.sistema} · {MESES_LABELS[mesNum - 1]} {year}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="p-1.5 rounded-full shrink-0" style={{ color: C.gray }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Última intervención de este mes</div>
            {lastReal ? (
              <div className="rounded-lg border p-2.5" style={{ borderColor: C.line, background: C.bg }}>
                <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}>
                  <Badge tone={badgeToneFor("tipoMtto", lastReal.tipo)}>{lastReal.tipo === "preventivo" ? "Preventivo" : "Correctivo"}</Badge> {fmtDT(lastReal.fecha)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Técnico: {lastReal.tecnico || "—"}</div>
                {lastReal.descripcion && <div className="text-xs mt-1" style={{ color: C.ink }}>{lastReal.descripcion}</div>}
                {lastReal.fotos && lastReal.fotos.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {lastReal.fotos.map((url, i) => (
                      <button key={i} onClick={() => onZoom(url)} aria-label="Ver foto ampliada">
                        <img loading="lazy" src={url} alt="" className="w-14 h-14 object-cover rounded-md border" style={{ borderColor: C.line }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs rounded-lg border p-2.5" style={{ borderColor: C.line, background: C.bg, color: C.gray }}>
                {entry?.tecnico ? `Programado para ${entry.tecnico}${entry.fechaEjecucion ? `, ${fmtDT(entry.fechaEjecucion)}` : ""} — sin registro de ejecución todavía.` : "Sin registro de mantenimiento para este mes todavía."}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Reprogramar</div>
              {!reprogramming && <button onClick={() => setReprogramming(true)} className="text-xs font-semibold" style={{ color: C.amber }}>Cambiar</button>}
            </div>
            {reprogramming ? (
              <div className="rounded-lg border p-2.5" style={{ borderColor: C.line, background: C.bg }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <select value={newEstado} onChange={e => setNewEstado(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                    <option value="pendiente">Pendiente</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="ejecutado">Ejecutado</option>
                  </select>
                  <input type="date" value={newFecha ? newFecha.slice(0, 10) : ""} onChange={e => setNewFecha(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </div>
                <label className="flex items-start gap-1.5 text-xs mb-2 cursor-pointer select-none" style={{ color: C.inkSoft }}>
                  <input type="checkbox" checked={chainRest} onChange={e => setChainRest(e.target.checked)} className="mt-0.5" />
                  <span>Correr en cadena un mes los mantenimientos programados que faltan este año (ej: se atrasó por falta de repuesto y todo el resto del año se recorre igual)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled={reprogSaving} onClick={doReprogram}>{reprogSaving ? "Guardando…" : "Guardar"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setReprogramming(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="text-xs" style={{ color: C.inkSoft }}>
                Estado actual: <b style={{ color: entry ? MTTO_ESTADO_COLORS[entry.estado]?.fg : C.gray }}>{entry ? MTTO_ESTADO_COLORS[entry.estado]?.label : "Sin programar"}</b>
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Mantenimiento extraordinario</div>
            {!showExtra ? (
              <Button size="sm" variant="ghost" onClick={() => setShowExtra(true)}>+ Registrar mantenimiento extraordinario</Button>
            ) : (
              <div className="rounded-lg border p-2.5" style={{ borderColor: C.line, background: C.bg }}>
                <MaintenanceTextSuggestions sistema={equipo.sistema} tipo="correctivo" onPick={t => setExtraForm(f => ({ ...f, descripcion: f.descripcion.trim() ? `${f.descripcion.trim()} ${t}` : t }))} />
                <EquipoHistorySuggestions equipoId={equipo.id} mttoLog={mttoLog} onPick={t => setExtraForm(f => ({ ...f, descripcion: f.descripcion.trim() ? `${f.descripcion.trim()} ${t}` : t }))} />
                <textarea value={extraForm.descripcion} onChange={e => setExtraForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Qué se hizo"
                  className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <input type="number" value={extraForm.costo} onChange={e => setExtraForm(f => ({ ...f, costo: e.target.value }))} placeholder="Costo (opcional)"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none w-32 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Fotos (al menos una)</div>
                <PhotoPicker photos={extraForm.fotos} onChange={fotos => setExtraForm(f => ({ ...f, fotos }))} max={6} />
                {invItems && (
                  <>
                    <div className="text-xs font-medium mb-1 mt-2" style={{ color: C.inkSoft }}>Repuestos usados (opcional)</div>
                    <PartsPicker invItems={invItems} parts={extraForm.repuestos} onChange={repuestos => setExtraForm(f => ({ ...f, repuestos }))} />
                  </>
                )}
                {extraMsg && <div className="text-xs mt-1.5" style={{ color: extraMsg.ok ? C.green : C.red }}>{extraMsg.text}</div>}
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" disabled={extraSaving} onClick={doExtra}>{extraSaving ? "Guardando…" : "Guardar"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowExtra(false)}>Cancelar</Button>
                </div>
              </div>
            )}
            {!showExtra && extraMsg && <div className="text-xs mt-1.5" style={{ color: extraMsg.ok ? C.green : C.red }}>{extraMsg.text}</div>}
          </div>
        </div>
      </div>
    </>
  );
}