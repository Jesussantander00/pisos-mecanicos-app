import { useState } from "react";
import { ArrowLeft, PackageMinus, PackagePlus, Pencil, PlusCircle } from "lucide-react";
import { Button, QrCodeBox } from "../shared/components";
import { C, fmtDT, shelfUrl } from "../shared/core";



export function ShelfDetailView({ bodega, shelf, items, canManage, onBack, onCreateItem, onRetiro, onEntrada, onEditItem, viewerLocked }) {
  const [showNewItem, setShowNewItem] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
  const [busyId, setBusyId] = useState(null);
  const [qtyDraft, setQtyDraft] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const doCreateItem = async () => {
    if (!form.name.trim()) return;
    await onCreateItem(shelf.id, bodega.id, form);
    setForm({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
    setShowNewItem(false);
  };

  const openMove = (itemId, mode) => setQtyDraft(prev => ({ ...prev, [itemId]: { mode, qty: "", note: "" } }));
  const closeMove = (itemId) => setQtyDraft(prev => { const n = { ...prev }; delete n[itemId]; return n; });

  const openEdit = (item) => { setEditingId(item.id); setEditForm({ name: item.name, sku: item.sku || "", unit: item.unit, minThreshold: item.minThreshold, fechaVencimiento: item.fechaVencimiento || "" }); };
  const doSaveEdit = async (id) => {
    await onEditItem(id, { name: editForm.name.trim(), sku: editForm.sku.trim(), unit: editForm.unit.trim() || "unidad", minThreshold: Number(editForm.minThreshold) || 0, fechaVencimiento: editForm.fechaVencimiento || null });
    setEditingId(null);
  };

  const doMove = async (item) => {
    const draft = qtyDraft[item.id];
    const n = Number(draft.qty);
    if (!n || n <= 0) return;
    setBusyId(item.id);
    if (draft.mode === "retiro") await onRetiro(item, n, draft.note);
    else await onEntrada(item, n, draft.note);
    setBusyId(null);
    closeMove(item.id);
  };

  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a {bodega.name}</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>
        Estantería {shelf.code}{shelf.name ? ` — ${shelf.name}` : ""}
      </h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{bodega.name} · {items.length} repuesto{items.length !== 1 ? "s" : ""}</p>

      <div className="flex items-start gap-3 flex-wrap mb-4">
        <QrCodeBox url={shelfUrl(shelf.id)} label={`Estantería ${shelf.code}`} filename={`qr-estanteria-${shelf.code}.png`} />
        {canManage && (
          <div className="flex-1 min-w-[240px]">
            <Button size="sm" icon={PlusCircle} onClick={() => setShowNewItem(v => !v)}>
              {showNewItem ? "Cancelar" : "Agregar repuesto a esta estantería"}
            </Button>
            {showNewItem && (
              <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del repuesto"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none col-span-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código / SKU (opcional)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unidad (ej. unidad, caja)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Cantidad inicial"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Mínimo para alertar"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </div>
                <Button size="sm" onClick={doCreateItem}>Guardar repuesto</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>Esta estantería todavía no tiene repuestos registrados.</p>
      ) : items.map(item => {
        const low = item.minThreshold > 0 && item.quantity <= item.minThreshold;
        const critical = item.minThreshold > 0 && item.quantity <= item.minThreshold * 0.5;
        const tone = critical ? C.red : low ? C.amber : null;
        const toneSoft = critical ? C.redSoft : low ? C.amberSoft : null;
        const barPct = item.minThreshold > 0 ? Math.min(100, (item.quantity / item.minThreshold) * 100) : 100;
        const draft = qtyDraft[item.id];
        return (
          <div key={item.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: tone || C.line, background: toneSoft || C.panel }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}>
                  {item.name}{item.sku ? <span style={{ color: C.gray }}> · {item.sku}</span> : ""}
                  {canManage && (
                    <button onClick={() => openEdit(item)} aria-label="Editar artículo" title="Editar artículo" className="p-0.5"><Pencil size={12} color={C.gray} /></button>
                  )}
                </div>
                <div className="text-xs" style={{ color: C.gray }}>Mínimo: {item.minThreshold} {item.unit}</div>
                {critical && <div className="text-xs font-semibold mt-0.5" style={{ color: C.red }}>⚠ Stock crítico — reponer ya</div>}
                {low && !critical && <div className="text-xs font-semibold mt-0.5" style={{ color: C.amber }}>Stock bajo — hay que reponer</div>}
                {item.fechaVencimiento && (() => {
                  const diasVence = Math.floor((new Date(item.fechaVencimiento) - Date.now()) / 86400000);
                  if (diasVence < 0) return <div className="text-xs font-semibold mt-0.5" style={{ color: C.red }}>⚠ Vencido desde {fmtDT(item.fechaVencimiento)}</div>;
                  if (diasVence <= 30) return <div className="text-xs font-semibold mt-0.5" style={{ color: C.amber }}>⏳ Vence en {diasVence} día(s) ({fmtDT(item.fechaVencimiento)})</div>;
                  return <div className="text-xs mt-0.5" style={{ color: C.gray }}>Vence: {fmtDT(item.fechaVencimiento)}</div>;
                })()}
                {item.minThreshold > 0 && (
                  <div className="w-full max-w-[160px] rounded-full overflow-hidden mt-1.5" style={{ background: C.bg, height: 5 }}>
                    <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: tone || C.green, transition: "width 500ms var(--ease-out)" }} />
                  </div>
                )}
              </div>
              <div className="text-xl font-bold" style={{ color: tone || C.ink }}>
                {item.quantity} <span className="text-xs font-normal" style={{ color: C.gray }}>{item.unit}</span>
              </div>
            </div>

            {editingId === item.id && (
              <div className="rounded-md p-2 mt-2" style={{ background: C.bg }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre"
                    className="text-sm border rounded-md px-2 py-1 outline-none col-span-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código / SKU"
                    className="text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unidad"
                    className="text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={editForm.minThreshold} onChange={e => setEditForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Mínimo"
                    className="text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <div>
                    <label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>Vence (opcional)</label>
                    <input type="date" value={editForm.fechaVencimiento} onChange={e => setEditForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                      className="text-sm border rounded-md px-2 py-1 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => doSaveEdit(item.id)}>Guardar cambios</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            {!draft && !viewerLocked && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" icon={PackageMinus} onClick={() => openMove(item.id, "retiro")}>Retirar</Button>
                {canManage && <Button size="sm" variant="ghost" icon={PackagePlus} onClick={() => openMove(item.id, "entrada")}>Registrar entrada</Button>}
              </div>
            )}
            {draft && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: C.inkSoft }}>{draft.mode === "retiro" ? "Retirar" : "Entrada de"} cantidad:</span>
                <input type="number" min={1} autoFocus value={draft.qty} onChange={e => setQtyDraft(prev => ({ ...prev, [item.id]: { ...draft, qty: e.target.value } }))}
                  className="w-20 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <input value={draft.note} onChange={e => setQtyDraft(prev => ({ ...prev, [item.id]: { ...draft, note: e.target.value } }))} placeholder="Motivo (opcional)"
                  className="text-sm border rounded-md px-2 py-1 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 140 }} />
                <Button size="sm" disabled={busyId === item.id} onClick={() => doMove(item)}>{busyId === item.id ? "Guardando…" : "Confirmar"}</Button>
                <Button size="sm" variant="ghost" onClick={() => closeMove(item.id)}>Cancelar</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}