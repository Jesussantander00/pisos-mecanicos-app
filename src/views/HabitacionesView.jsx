import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { C, ROOM_BLOCK_REASONS, fmtDT } from "../shared/core";
import { Badge, Button } from "../shared/components";



/**
 * Habitaciones — dos cosas distintas juntas en un solo módulo:
 * 1) Tipos de habitación: qué accesorios trae cada categoría (jacuzzi, balcón, etc.), para saber
 *    qué revisar según el tipo, no una lista genérica igual para todas.
 * 2) Bloqueos: por qué una habitación está fuera de servicio ahora mismo — visible de un
 *    vistazo, listo para el día que esto se conecte con el sistema de reservas.
 */
export function HabitacionesView({ roomTypes, roomBlocks, isAdmin, onCreateRoomType, onBlockRoom, onUnblockRoom }) {
  const [tab, setTab] = useState("bloqueos"); // "bloqueos" | "tipos"

  const [showNewBlock, setShowNewBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({ habitacion: "", tipoCodigo: "", motivo: ROOM_BLOCK_REASONS[0], nota: "" });
  const [savingBlock, setSavingBlock] = useState(false);

  const [showNewType, setShowNewType] = useState(false);
  const [typeForm, setTypeForm] = useState({ codigo: "", nombre: "", accesorios: "" });
  const [savingType, setSavingType] = useState(false);

  const activeBlocks = roomBlocks.filter(b => b.estado === "bloqueada").sort((a, b) => new Date(b.bloqueadaDesde) - new Date(a.bloqueadaDesde));
  const history = roomBlocks.filter(b => b.estado === "liberada").sort((a, b) => new Date(b.liberadaEn) - new Date(a.liberadaEn)).slice(0, 30);

  const doBlock = async () => {
    if (!blockForm.habitacion.trim()) return;
    setSavingBlock(true);
    await onBlockRoom(blockForm);
    setBlockForm({ habitacion: "", tipoCodigo: "", motivo: ROOM_BLOCK_REASONS[0], nota: "" });
    setShowNewBlock(false);
    setSavingBlock(false);
  };

  const doCreateType = async () => {
    if (!typeForm.codigo.trim() || !typeForm.nombre.trim()) return;
    setSavingType(true);
    await onCreateRoomType(typeForm);
    setTypeForm({ codigo: "", nombre: "", accesorios: "" });
    setShowNewType(false);
    setSavingType(false);
  };

  const inputCls = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Habitaciones</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Bloqueos activos con su motivo, y el catálogo de qué trae cada tipo de habitación.</p>

      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit" style={{ borderColor: C.line }}>
        <button onClick={() => setTab("bloqueos")} className="px-3 font-semibold" style={{ background: tab === "bloqueos" ? C.steelDark : C.panel, color: tab === "bloqueos" ? "#fff" : C.inkSoft, minHeight: 36 }}>
          Bloqueos {activeBlocks.length > 0 && `(${activeBlocks.length})`}
        </button>
        <button onClick={() => setTab("tipos")} className="px-3 font-semibold" style={{ background: tab === "tipos" ? C.steelDark : C.panel, color: tab === "tipos" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>
          Tipos de habitación
        </button>
      </div>

      {tab === "bloqueos" ? (
        <>
          {isAdmin && (
            <div className="mb-4">
              <Button icon={PlusCircle} onClick={() => setShowNewBlock(v => !v)}>{showNewBlock ? "Cancelar" : "Bloquear habitación"}</Button>
              {showNewBlock && (
                <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
                  <div className="grid sm:grid-cols-3 gap-2 mb-2">
                    <input value={blockForm.habitacion} onChange={e => setBlockForm(f => ({ ...f, habitacion: e.target.value }))} placeholder="Número de habitación" className={inputCls} style={inputStyle} />
                    <select value={blockForm.tipoCodigo} onChange={e => setBlockForm(f => ({ ...f, tipoCodigo: e.target.value }))} className={inputCls} style={inputStyle}>
                      <option value="">Tipo (opcional)</option>
                      {roomTypes.map(t => <option key={t.id} value={t.codigo}>{t.codigo} — {t.nombre}</option>)}
                    </select>
                    <select value={blockForm.motivo} onChange={e => setBlockForm(f => ({ ...f, motivo: e.target.value }))} className={inputCls} style={inputStyle}>
                      {ROOM_BLOCK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <input value={blockForm.nota} onChange={e => setBlockForm(f => ({ ...f, nota: e.target.value }))} placeholder="Nota (opcional)" className={`${inputCls} w-full mb-2`} style={inputStyle} />
                  <Button size="sm" disabled={savingBlock} onClick={doBlock}>{savingBlock ? "Guardando…" : "Bloquear"}</Button>
                </div>
              )}
            </div>
          )}

          {activeBlocks.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: C.gray }}>Ninguna habitación bloqueada ahora mismo.</p>
          ) : activeBlocks.map(b => (
            <div key={b.id} className="rounded-lg border p-3 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: C.red, background: C.redSoft }}>
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: C.ink }}>
                  Habitación {b.habitacion} <Badge tone="red">{b.motivo}</Badge>
                  {b.tipoCodigo && <span className="text-xs" style={{ color: C.gray }}>· {b.tipoCodigo}</span>}
                </div>
                <div className="text-xs" style={{ color: C.inkSoft }}>
                  Bloqueada desde {fmtDT(b.bloqueadaDesde)} por {b.createdBy}{b.nota ? ` — ${b.nota}` : ""}
                </div>
              </div>
              {isAdmin && <Button size="sm" onClick={() => onUnblockRoom(b.id)}>Liberar</Button>}
            </div>
          ))}

          {history.length > 0 && (
            <details className="mt-4 text-xs" style={{ color: C.inkSoft }}>
              <summary className="cursor-pointer font-semibold" style={{ color: C.ink }}>Historial de habitaciones ya liberadas ({history.length})</summary>
              <div className="mt-2 space-y-1">
                {history.map(b => (
                  <div key={b.id}>· Habitación {b.habitacion} — {b.motivo} · {fmtDT(b.bloqueadaDesde)} → {fmtDT(b.liberadaEn)}</div>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <>
          {isAdmin && (
            <div className="mb-4">
              <Button icon={PlusCircle} onClick={() => setShowNewType(v => !v)}>{showNewType ? "Cancelar" : "Nuevo tipo de habitación"}</Button>
              {showNewType && (
                <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <input value={typeForm.codigo} onChange={e => setTypeForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Código (ej: 2VWD)" className={inputCls} style={inputStyle} />
                    <input value={typeForm.nombre} onChange={e => setTypeForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Doble Vista al Mar)" className={inputCls} style={inputStyle} />
                  </div>
                  <input value={typeForm.accesorios} onChange={e => setTypeForm(f => ({ ...f, accesorios: e.target.value }))} placeholder="Accesorios separados por coma (ej: Jacuzzi, Balcón, Cocina)" className={`${inputCls} w-full mb-2`} style={inputStyle} />
                  <Button size="sm" disabled={savingType} onClick={doCreateType}>{savingType ? "Guardando…" : "Crear tipo"}</Button>
                </div>
              )}
            </div>
          )}

          {roomTypes.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: C.gray }}>Todavía no hay tipos de habitación registrados.</p>
          ) : roomTypes.map(t => (
            <div key={t.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{t.codigo} <span style={{ color: C.inkSoft, fontWeight: 400 }}>— {t.nombre}</span></div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {t.accesorios && t.accesorios.length > 0 ? t.accesorios.map((a, i) => <Badge key={i} tone="blue">{a}</Badge>) : <span className="text-xs" style={{ color: C.gray }}>Sin accesorios especiales registrados</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}