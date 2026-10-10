import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { C, showToast, todayStr, validateRoundEntries } from "../shared/core";
import { Button, PendingItemsAlert, Pill } from "../shared/components";
import { EquipmentRow } from "./EquipmentRow";



/* ============================================================
   VISTA: RONDA DE REVISIÓN
   ============================================================ */
export function RoundView({ floor, currentUser, shift, activeIssues, latestValues, onResolveIssue, onSaveRound, floorIndex, floorCount, onGoFloor, tourProgressCount, resumedTour, onDismissResumed }) {
  const [entries, setEntries] = useState({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  // Al cambiar de piso: precargar cada equipo con lo último registrado (turno anterior),
  // para que el técnico vea y pueda ajustar en vez de partir de cero.
  useEffect(() => {
    const seeded = {};
    floor.items.forEach(item => {
      const lv = latestValues[item.id];
      if (lv) {
        seeded[item.id] = {
          status: lv.status, value: lv.value, ph: lv.ph, cloro: lv.cloro, operador: lv.operador,
          observation: activeIssues[item.id] ? undefined : lv.observation, // si sigue dañado, no precargar el comentario viejo: hay que confirmar algo nuevo o marcar "Continúa igual"
          damaged: !!activeIssues[item.id],
        };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
      }
    });
    setEntries(seeded);
    setSaved(false);
    setNotes("");
  }, [floor.id]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = Object.values(entries).filter(e => e && (e.status || e.value !== undefined && e.value !== "" || e.observation || e.ph || e.damaged)).length;
  const damagedCount = Object.values(entries).filter(e => e?.damaged).length;

  const isLast = floorIndex === floorCount - 1;
  const [validationMsg, setValidationMsg] = useState(null);
  const visibleItems = floor.items;

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const { missing, missingComment } = validateRoundEntries(floor.items, entries);
    if (missingComment.length > 0) {
      setValidationMsg({ prefix: "Falta el comentario de qué pasó en:", items: missingComment, suffix: "Los equipos marcados como dañados necesitan una observación antes de guardar." });
      return;
    }
    if (missing.length > 0) {
      setValidationMsg({ prefix: "Todavía faltan estos equipos por registrar:", items: missing });
      return;
    }
    setValidationMsg(null);
    setSaving(true);
    try {
      // Antes esto no esperaba a que se confirmara el guardado en Supabase: si fallaba la red
      // (wifi del hotel cortándose, por ejemplo), la app decía "Guardado" y avanzaba al siguiente
      // piso igual, perdiendo esta ronda sin que nadie se enterara. Ahora sí se espera de verdad.
      await onSaveRound(floor, entries, notes);
      setSaved(true);
      if (!isLast) {
        setTimeout(() => onGoFloor(floorIndex + 1), 700);
      }
    } catch (e) {
      setValidationMsg({ prefix: "No se pudo guardar esta ronda — revisa tu conexión e intenta de nuevo.", items: [] });
      showToast("✗ No se pudo guardar la ronda. Intenta de nuevo.", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {resumedTour && (
        <div className="rounded-md p-2 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <span className="text-xs" style={{ color: C.amber }}>
            ↺ Tienes un recorrido en curso de este mismo turno — llevas <b>{tourProgressCount} de {floorCount} pisos</b>. Sigues donde ibas, no hace falta empezar de cero.
          </span>
          <Button size="sm" variant="ghost" onClick={onDismissResumed}>Entendido</Button>
        </div>
      )}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={floorIndex === 0} onClick={() => onGoFloor(floorIndex - 1)}>‹ Piso anterior</Button>
        <span className="text-xs font-medium" style={{ color: C.gray }}>Piso {floorIndex + 1} de {floorCount}</span>
        <Button size="sm" variant="ghost" disabled={isLast} onClick={() => onGoFloor(floorIndex + 1)}>Siguiente piso ›</Button>
      </div>
      <div className="mb-2">
        <div className="text-[11px] mb-1 text-right" style={{ color: C.gray }}>Recorrido completo: {tourProgressCount} de {floorCount} pisos hechos</div>
        <div className="w-full rounded-full h-1.5" style={{ background: C.bg }}>
          <div className="h-1.5 rounded-full" style={{ width: `${Math.round((tourProgressCount / floorCount) * 100)}%`, background: tourProgressCount >= floorCount ? C.green : C.amber }} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{floor.name}</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{floor.items.length} equipos · Turno {shift} · {todayStr()}</p>
        </div>
        <div className="flex items-center gap-2">
          {damagedCount > 0 && <Pill tone="red">{damagedCount} marcado(s) dañado</Pill>}
          <Pill tone="gray">{filledCount}/{floor.items.length} registrados</Pill>
        </div>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: C.blue }}>
        Los campos ya vienen con lo último registrado por el turno anterior — revisa, corrige lo que cambió y guarda.
      </div>

      {visibleItems.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestValues[item.id]}
          onResolve={(it, solution) => onResolveIssue(it, solution)} />
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes del recorrido</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales del piso, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <PendingItemsAlert msg={validationMsg} onClose={() => setValidationMsg(null)} />

      <div className="flex items-center justify-between mt-4 sticky bottom-16 sm:bottom-0 py-2 px-2 -mx-2 rounded-t-lg" style={{ background: C.bg }}>
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Vo.Bo. pendiente de supervisor</div>
        <Button icon={Save} variant="amber" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : (isLast ? "Finalizar y enviar" : "Guardar y pasar al siguiente piso")}
        </Button>
      </div>
      {saved && (
        <div className="text-right text-sm mt-1" style={{ color: C.green }}>
          ✓ Ronda guardada correctamente {!isLast && "· pasando al siguiente piso…"}
        </div>
      )}
    </div>
  );
}