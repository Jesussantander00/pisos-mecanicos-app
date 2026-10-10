import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { C, STATUS_OPTS, elapsed, fmtDT } from "../shared/core";
import { Button, Pill, VoiceInputButton } from "../shared/components";



/* ============================================================
   COMPONENTE DE ITEM DE EQUIPO (dentro de una ronda)
   ============================================================ */
export function EquipmentRow({ item, entry, onChange, activeIssue, onResolve, previous, statusOptions, hint, outOfRange }) {
  const [resolving, setResolving] = useState(false);
  const [solution, setSolution] = useState("");
  const damaged = !!entry?.damaged;
  const alert = damaged || outOfRange;
  const opts = statusOptions || STATUS_OPTS;

  const update = (patch) => onChange(item.id, { ...entry, ...patch });

  return (
    <div id={`item-row-${item.id}`} className="rounded-lg border p-3 mb-2" style={{ borderColor: alert ? C.red : C.line, background: alert ? C.redSoft : C.panel }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2" style={{ minWidth: 200 }}>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ background: C.bg, color: C.inkSoft }}>#{item.c}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: C.ink }}>{item.n}</div>
            {item.tank && <Pill tone="blue">Tanque agua potable</Pill>}
            {hint && <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Rango objetivo: <b>{hint}</b></div>}
            {outOfRange && !damaged && (
              <div className="text-xs mt-0.5 font-semibold" style={{ color: C.red }}>⚠ Fuera del rango objetivo — considera marcarlo dañado.</div>
            )}
            {previous && (
              <div className="text-xs mt-0.5" style={{ color: C.blue }}>
                Turno anterior ({previous.shift}, {fmtDT(previous.updatedAt)} · {previous.updatedBy}):{" "}
                {previous.status && <b>{previous.status}</b>}
                {previous.value !== undefined && previous.value !== "" && <b>{previous.value}{item.u ? ` ${item.u}` : ""}</b>}
                {previous.observation && <span className="italic"> — "{previous.observation}"</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(item.k === "status" || item.k === "statusNumeric") && (
            <select value={entry?.status || ""} onChange={e => update({ status: e.target.value })}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Estado…</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {(item.k === "numeric" || item.k === "statusNumeric") && (
            <div className="flex items-center gap-1">
              <input type="number" step="any" inputMode="decimal" value={entry?.value ?? ""} onChange={e => update({ value: e.target.value })}
                placeholder="valor" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              {item.u && <span className="text-xs" style={{ color: C.gray }}>{item.u}</span>}
            </div>
          )}
          {item.k === "sample" && (
            <div className="flex items-center gap-1.5">
              <input value={entry?.ph ?? ""} onChange={e => update({ ph: e.target.value })} placeholder="PH" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.cloro ?? ""} onChange={e => update({ cloro: e.target.value })} placeholder="Cloro" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.operador ?? ""} onChange={e => update({ operador: e.target.value })} placeholder="Operador" className="w-28 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.pisoMuestra ?? ""} onChange={e => update({ pisoMuestra: e.target.value })} placeholder="Piso de muestra" className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer select-none"
            style={{ background: damaged ? C.red : C.bg, color: damaged ? "#fff" : C.inkSoft }}>
            <input type="checkbox" checked={damaged} onChange={e => update({ damaged: e.target.checked })} className="accent-current" />
            Dañado / Fuera de servicio
          </label>
          {damaged && activeIssue && (
            <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer select-none"
              style={{ background: entry?.stillSame ? C.amber : C.bg, color: entry?.stillSame ? "#fff" : C.inkSoft }}>
              <input type="checkbox" checked={!!entry?.stillSame} onChange={e => update({ stillSame: e.target.checked })} className="accent-current" />
              Continúa igual (sin novedad)
            </label>
          )}
        </div>
      </div>
      {damaged && activeIssue && (
        <div className="text-xs mt-1" style={{ color: C.red }}>
          Para que este equipo salga de "Fuera de servicio", destilda la casilla roja de arriba (o usa "Marcar resuelto" abajo) —
          cambiar el estado o solo escribir un comentario no lo quita de la lista por sí solo.
        </div>
      )}

      <div className="flex items-start gap-1.5 mt-2">
        <textarea value={entry?.observation ?? ""} onChange={e => update({ observation: e.target.value })}
          placeholder="Observaciones…" rows={1}
          className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        <VoiceInputButton onResult={text => update({ observation: ((entry?.observation ?? "") ? (entry?.observation ?? "") + " " : "") + text })} />
      </div>

      {activeIssue && (
        <div className="mt-2 rounded-md p-2 flex items-start justify-between gap-2" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <div className="text-xs" style={{ color: C.amber }}>
            <div className="font-semibold flex items-center gap-1"><AlertTriangle size={13} /> Reportado dañado desde el turno anterior</div>
            <div>Por <b>{activeIssue.openedBy}</b> el {fmtDT(activeIssue.openedAt)} ({elapsed(activeIssue.openedAt)} fuera de servicio)</div>
            <div className="italic mt-0.5">"{activeIssue.observation}"</div>
            <div className="mt-1">Si ya lo encendiste o reparaste, escribe abajo qué se hizo y confírmalo como resuelto.</div>
          </div>
          {!resolving ? (
            <Button size="sm" variant="ghost" onClick={() => setResolving(true)}>Marcar resuelto</Button>
          ) : null}
        </div>
      )}
      {resolving && (
        <div className="mt-2 flex items-center gap-2">
          <input value={solution} onChange={e => setSolution(e.target.value)} placeholder="¿Qué solución se aplicó?"
            className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <Button size="sm" variant="primary" icon={CheckCircle2}
            disabled={!solution.trim()}
            onClick={() => { onResolve(activeIssue, solution.trim()); setResolving(false); setSolution(""); update({ damaged: false }); }}>
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}