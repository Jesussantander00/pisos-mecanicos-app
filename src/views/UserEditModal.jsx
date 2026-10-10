import { useState } from "react";
import { X } from "lucide-react";
import { C, fmtDT, showToast, useBackCloseModal } from "../shared/core";
import { Button } from "../shared/components";



/** Modal "Editar usuario" — reemplaza la fila de 6-7 botones por usuario. Junta info básica,
 * acciones rápidas (clave/traspaso/eliminar), un selector de Rol Base (mutuamente excluyente:
 * Operador/Almacenista/Gerencia) y, aparte, "Es administrador" como interruptor propio ya que un
 * admin no es "un rol más" sino que ve y hace de todo. La sección de Permisos Específicos vive
 * ahí mismo para cuando se agreguen más permisos finos (hoy solo hay uno real: editar horarios). */
export function UserEditModal({ uid, acc, adminCount, openTaskCount, otherUsers, currentUsername, onClose,
  onToggleAdmin, onToggleAlmacenista, onToggleGerencia, onToggleViewer, onToggleScheduleManager, onDeleteAccount, onResetPassword, onTransferTasks }) {
  useBackCloseModal(true, onClose); // se desmonta solo cuando el padre deja de mostrarlo
  const [newPw, setNewPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferMsg, setTransferMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roleMsg, setRoleMsg] = useState(null); // { text, ok } — feedback de cambios de rol/permiso que sí pueden fallar

  const baseRole = acc.is_almacenista ? "almacenista" : acc.is_gerencia ? "gerencia" : acc.is_viewer ? "viewer" : "operador";
  const isLastAdmin = acc.is_admin && adminCount === 1;

  // Antes estas acciones no revisaban si el servidor las había rechazado (sesión vencida, columna
  // faltante en Supabase, etc.) — el checkbox se quedaba como si nada, sin ningún aviso de que no
  // se guardó. Ahora sí se revisa el resultado y, si falla, se le muestra el motivo al admin.
  const runRoleAction = async (fn, ...args) => {
    setBusy(true); setRoleMsg(null);
    try {
      const res = await fn(...args);
      if (res && res.ok === false) {
        setRoleMsg({ text: res.message || "No se pudo guardar el cambio.", ok: false });
        showToast(res.message || "No se pudo guardar el cambio.", false);
      }
    } catch (e) {
      setRoleMsg({ text: "No se pudo guardar el cambio — revisa tu conexión e intenta de nuevo.", ok: false });
      showToast("No se pudo guardar el cambio.", false);
    } finally {
      setBusy(false);
    }
  };

  const setBaseRole = async (next) => {
    setBusy(true); setRoleMsg(null);
    try {
      if (next !== "almacenista" && acc.is_almacenista) { const r = await onToggleAlmacenista(uid); if (r?.ok === false) throw new Error(r.message); }
      if (next !== "gerencia" && acc.is_gerencia) { const r = await onToggleGerencia(uid); if (r?.ok === false) throw new Error(r.message); }
      if (next !== "viewer" && acc.is_viewer) { const r = await onToggleViewer(uid); if (r?.ok === false) throw new Error(r.message); }
      if (next === "almacenista" && !acc.is_almacenista) { const r = await onToggleAlmacenista(uid); if (r?.ok === false) throw new Error(r.message); }
      if (next === "gerencia" && !acc.is_gerencia) { const r = await onToggleGerencia(uid); if (r?.ok === false) throw new Error(r.message); }
      if (next === "viewer" && !acc.is_viewer) { const r = await onToggleViewer(uid); if (r?.ok === false) throw new Error(r.message); }
    } catch (e) {
      setRoleMsg({ text: e.message || "No se pudo cambiar el rol.", ok: false });
      showToast(e.message || "No se pudo cambiar el rol.", false);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (!newPw || newPw.length < 8) { setResetMsg("La contraseña debe tener al menos 8 caracteres."); return; }
    const res = await onResetPassword(uid, newPw);
    if (res && res.ok === false) {
      setResetMsg(`✗ No se pudo cambiar la contraseña: ${res.message || "intenta de nuevo."}`);
      showToast("✗ No se pudo cambiar la contraseña.", false);
      return;
    }
    setResetMsg(`✓ Contraseña actualizada. Avísale la nueva clave a ${acc.display_name || acc.email}.`);
    showToast("✓ Contraseña actualizada.", true);
    setNewPw("");
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div className="fixed inset-x-2 top-10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-50 rounded-xl border shadow-xl max-h-[85vh] overflow-y-auto"
        style={{ background: C.panel, borderColor: C.line }}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0" style={{ borderColor: C.line, background: C.panel }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{acc.display_name || acc.email}</div>
            <div className="text-xs" style={{ color: C.gray }}>{acc.email}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="p-1"><X size={16} color={C.gray} /></button>
        </div>

        <div className="p-4">
          <div className="text-xs" style={{ color: C.gray }}>Creado: {fmtDT(acc.created_at)}</div>

          <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Acciones rápidas</div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <input value={newPw} onChange={e => { setNewPw(e.target.value); setResetMsg(""); }} type="text" placeholder="Nueva contraseña (mín. 8 caracteres)"
              className="flex-1 min-w-[180px] text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}
              onKeyDown={e => { if (e.key === "Enter") doReset(); }} />
            <Button size="sm" variant="ghost" onClick={doReset}>Restablecer contraseña</Button>
          </div>
          {resetMsg && <div className="text-xs mb-2" style={{ color: C.green }}>{resetMsg}</div>}

          {openTaskCount > 0 && (
            <div className="mb-2">
              <div className="text-xs mb-1" style={{ color: C.inkSoft }}>Traspasar {openTaskCount} tarea{openTaskCount === 1 ? "" : "s"} abierta{openTaskCount === 1 ? "" : "s"} a:</div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Elige a quién…</option>
                  {otherUsers.map(([u2, acc2]) => <option key={u2} value={u2}>{acc2.display_name || acc2.email}</option>)}
                </select>
                <Button size="sm" variant="ghost" disabled={!transferTo} onClick={async () => {
                  const count = await onTransferTasks(uid, transferTo);
                  setTransferMsg(`✓ Se pasaron ${count} tarea${count === 1 ? "" : "s"}.`);
                  showToast("✓ Tareas traspasadas.", true);
                }}>Traspasar</Button>
              </div>
              {transferMsg && <div className="text-xs mt-1" style={{ color: C.green }}>{transferMsg}</div>}
            </div>
          )}

          <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Rol base</div>
          <select value={baseRole} disabled={busy || acc.is_admin} onChange={e => setBaseRole(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 outline-none w-full mb-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <option value="operador">Operador</option>
            <option value="almacenista">Almacenista</option>
            <option value="gerencia">Gerencia (solo consulta — pocas pantallas)</option>
            <option value="viewer">Solo ver (ve todo, no puede crear/editar nada)</option>
          </select>
          {acc.is_admin && <div className="text-[11px] mb-2" style={{ color: C.gray }}>Un administrador ya tiene acceso a todo — quita el admin abajo si quieres asignarle un rol base específico.</div>}

          <label className="flex items-center justify-between gap-3 py-2 mt-1 cursor-pointer select-none">
            <div>
              <div className="text-sm" style={{ color: C.ink }}>Es administrador</div>
              <div className="text-[11px]" style={{ color: C.gray }}>Acceso total a todos los módulos, incluido este panel.</div>
            </div>
            <input type="checkbox" checked={!!acc.is_admin} disabled={isLastAdmin || busy} onChange={() => runRoleAction(onToggleAdmin, uid)} />
          </label>
          {isLastAdmin && <div className="text-[11px] mb-2" style={{ color: C.red }}>No puedes quitarle admin — es el único administrador que queda.</div>}

          <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Permisos específicos</div>
          <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
            <span className="text-sm" style={{ color: C.ink }}>Editar horarios (sin ser admin)</span>
            <input type="checkbox" checked={!!acc.can_manage_schedule} disabled={acc.is_admin || busy} onChange={() => runRoleAction(onToggleScheduleManager, uid)} />
          </label>
          {roleMsg && <div className="text-xs mt-1" style={{ color: roleMsg.ok === false ? C.red : C.green }}>{roleMsg.text}</div>}

          <div className="mt-5 pt-3 border-t" style={{ borderColor: C.line }}>
            {confirmDelete ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: C.red }}>¿Eliminar esta cuenta para siempre?</span>
                <Button size="sm" variant="red" onClick={() => { onDeleteAccount(uid); onClose(); }}>Sí, eliminar</Button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
              </div>
            ) : (
              <Button size="sm" variant="red" disabled={uid === currentUsername} onClick={() => setConfirmDelete(true)}>Eliminar usuario</Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}