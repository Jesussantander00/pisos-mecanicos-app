import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, Download, PlusCircle, Trash2 } from "lucide-react";
import { C, CONTRACTOR_MOTIVOS, elapsed, fmtDT, hoursBetween, normalizeSearchText, todayStr, useBackCloseModal } from "../shared/core";
import { Button, ConfirmDialog, SignaturePad } from "../shared/components";



export function ContractorVisitsView({ visits, employees, isAdmin, onCreateVisit, onCheckOut, onDeleteVisit }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ empresa: "", contacto: "", telefono: "", motivo: CONTRACTOR_MOTIVOS[0], equipoNota: "", autorizadoPor: "", placaVehiculo: "" });
  const [firma, setFirma] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState(null);
  useBackCloseModal(!!checkingOutId, () => setCheckingOutId(null));
  const [firmaSalida, setFirmaSalida] = useState(null);
  const [costoSalida, setCostoSalida] = useState("");
  const [showResumen, setShowResumen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteVisitId, setConfirmDeleteVisitId] = useState(null);

  const inputCls = "text-sm border rounded-md px-3 py-2.5 outline-none w-full";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  const doCreate = async () => {
    if (!form.empresa.trim() || !form.contacto.trim() || !firma) return;
    setSaving(true);
    await onCreateVisit({ ...form, firma });
    setForm({ empresa: "", contacto: "", telefono: "", motivo: CONTRACTOR_MOTIVOS[0], equipoNota: "", autorizadoPor: "", placaVehiculo: "" });
    setFirma(null);
    setShowNew(false);
    setSaving(false);
  };

  const doCheckOut = async () => {
    if (!firmaSalida) return;
    await onCheckOut(checkingOutId, firmaSalida, costoSalida ? Number(costoSalida) : null);
    setCheckingOutId(null);
    setFirmaSalida(null);
    setCostoSalida("");
  };

  const searchNorm = normalizeSearchText(search.trim());
  const filtered = visits.filter(v => !searchNorm || normalizeSearchText(`${v.empresa} ${v.contacto}`).includes(searchNorm));
  const activas = filtered.filter(v => !v.horaSalida);
  const historial = filtered.filter(v => v.horaSalida).slice(0, 40);
  const resumen = useMemo(() => {
    const m = {};
    (visits || []).forEach(v => {
      const k = (v.empresa || "—").trim();
      const r = (m[k] = m[k] || { empresa: k, visitas: 0, horas: 0, costo: 0, ultima: null });
      r.visitas++;
      if (v.horaSalida) r.horas += hoursBetween(v.horaEntrada, v.horaSalida);
      r.costo += Number(v.costo || 0);
      if (!r.ultima || new Date(v.horaEntrada) > new Date(r.ultima)) r.ultima = v.horaEntrada;
    });
    return Object.values(m).sort((a, b) => b.visitas - a.visitas);
  }, [visits]);
  const exportResumen = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen.map(r => ({ Empresa: r.empresa, Visitas: r.visitas, "Horas en el hotel": Number(r.horas.toFixed(1)), "Costo total": r.costo, "Última visita": r.ultima ? fmtDT(r.ultima) : "" }))), "Contratistas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((visits || []).map(v => ({ Empresa: v.empresa, Contacto: v.contacto, Motivo: v.motivo, "Equipo o área": v.equipoNota || "", Entrada: fmtDT(v.horaEntrada), Salida: v.horaSalida ? fmtDT(v.horaSalida) : "", Costo: v.costo || "" }))), "Visitas");
    XLSX.writeFile(wb, `contratistas-${todayStr().replace(/\//g, "-")}.xlsx`);
  };

  if (showNew) {
    // Pantalla tipo "bitácora de portería" — grande y simple, pensada para que la llene el contratista mismo.
    return (
      <div>
        <button onClick={() => { setShowNew(false); setFirma(null); }} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.inkSoft }}>
          <ArrowLeft size={15} /> Cancelar
        </button>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Registro de visita</h2>
        <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Por favor llena tus datos y firma abajo para registrar tu entrada.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Empresa *</label>
            <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Nombre de la empresa" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Tu nombre *</label>
            <input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Nombre completo" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Teléfono</label>
            <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Opcional" inputMode="tel" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Motivo de la visita</label>
            <select value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} className={inputCls} style={inputStyle}>
              {CONTRACTOR_MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>¿A qué equipo o área viene?</label>
            <input value={form.equipoNota} onChange={e => setForm(f => ({ ...f, equipoNota: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ej: Chiller 1, cuarto de máquinas" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Placa del vehículo</label>
            <input value={form.placaVehiculo} onChange={e => setForm(f => ({ ...f, placaVehiculo: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Opcional" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>¿Quién de mantenimiento te espera?</label>
            <select value={form.autorizadoPor} onChange={e => setForm(f => ({ ...f, autorizadoPor: e.target.value }))} className={inputCls} style={inputStyle}>
              <option value="">Opcional — elige un nombre</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>Firma *</label>
            <SignaturePad onChange={setFirma} />
          </div>
          <div className="w-full [&>button]:w-full [&>button]:justify-center">
            <Button disabled={saving || !form.empresa.trim() || !form.contacto.trim() || !firma} onClick={doCreate}>
              {saving ? "Registrando…" : "Registrar entrada"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Visitas de contratistas</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>El contratista llena sus datos y firma él mismo, como una bitácora de portería.</p>
        </div>
        <Button icon={PlusCircle} onClick={() => setShowNew(true)}>Registrar visita</Button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por empresa o nombre…" className={`${inputCls} mb-4`} style={inputStyle} />

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
        Adentro ahora ({activas.length})
      </div>
      {activas.length === 0 ? (
        <p className="text-sm py-4 text-center mb-4" style={{ color: C.gray }}>No hay contratistas adentro en este momento.</p>
      ) : activas.map(v => (
        <div key={v.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.green, background: C.greenSoft }}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{v.empresa} — {v.contacto}</div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{v.motivo}{v.equipoNota ? ` · ${v.equipoNota}` : ""}</div>
              <div className="text-xs mt-0.5" style={{ color: C.gray }}>
                Entró hace {elapsed(v.horaEntrada)} · {v.autorizadoPor ? `Autorizado por ${v.autorizadoPor}` : "Sin autorización específica"}{v.telefono ? ` · ${v.telefono}` : ""}
              </div>
            </div>
            <Button size="sm" onClick={() => setCheckingOutId(v.id)}>Registrar salida</Button>
          </div>
        </div>
      ))}

      <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>
        Historial reciente
      </div>
      {historial.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: C.gray }}>Todavía no hay visitas completadas.</p>
      ) : historial.map(v => (
        <div key={v.id} className="rounded-lg border p-3 mb-2 flex items-start justify-between gap-2" style={{ borderColor: C.line, background: C.panel }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{v.empresa} — {v.contacto}</div>
            <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{v.motivo}{v.equipoNota ? ` · ${v.equipoNota}` : ""}</div>
            <div className="text-xs mt-0.5" style={{ color: C.gray }}>
              {fmtDT(v.horaEntrada)} → {fmtDT(v.horaSalida)}{v.costo ? ` · Costo $${Number(v.costo).toLocaleString("es-CO")}` : ""}
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setConfirmDeleteVisitId(v.id)} aria-label="Borrar visita" title="Borrar visita">
              <Trash2 size={14} color={C.gray} />
            </button>
          )}
        </div>
      ))}

      {isAdmin && resumen.length > 0 && (
        <div className="rounded-lg border p-3 mt-5" style={{ borderColor: C.line, background: C.panel }}>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setShowResumen(v => !v)} className="text-sm font-semibold" style={{ color: C.ink }}>📊 Resumen por empresa ({resumen.length}) {showResumen ? "▲" : "▼"}</button>
            <Button size="sm" variant="ghost" icon={Download} onClick={exportResumen}>Excel</Button>
          </div>
          {showResumen && resumen.map(r => (
            <div key={r.empresa} className="flex justify-between gap-2 text-xs py-1.5 border-t mt-1" style={{ borderColor: C.line, color: C.ink }}>
              <span className="truncate font-medium">{r.empresa}</span>
              <span className="shrink-0" style={{ color: C.inkSoft }}>{r.visitas} visitas · {r.horas.toFixed(1)} h · ${r.costo.toLocaleString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}

      {checkingOutId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setCheckingOutId(null)}>
          <div className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="text-base font-bold mb-1" style={{ color: C.ink }}>Firma de salida</div>
            <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Por favor firma para confirmar tu salida.</p>
            <SignaturePad onChange={setFirmaSalida} />
            <input type="number" inputMode="numeric" value={costoSalida} onChange={e => setCostoSalida(e.target.value)} placeholder="Costo del servicio (opcional)" className={`${inputCls} mt-3`} style={inputStyle} />
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 [&>button]:w-full [&>button]:justify-center">
                <Button disabled={!firmaSalida} onClick={doCheckOut}>Confirmar salida</Button>
              </div>
              <Button variant="ghost" onClick={() => { setCheckingOutId(null); setFirmaSalida(null); }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!confirmDeleteVisitId} title="Borrar registro de visita"
        message="¿Seguro que quieres borrar este registro de visita? No se puede deshacer."
        onConfirm={() => { onDeleteVisit(confirmDeleteVisitId); setConfirmDeleteVisitId(null); }}
        onCancel={() => setConfirmDeleteVisitId(null)} />
    </div>
  );
}