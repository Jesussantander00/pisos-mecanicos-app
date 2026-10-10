import { useState } from "react";
import { LogOut } from "lucide-react";
import { C, FONT_SCALE_OPTS, applyFontScale, fmtDT } from "../shared/core";
import { Button, SignaturePad } from "../shared/components";



export function ProfileView({ currentUser, mySignature, onSaveSignature, employees, linkedEmployeeId, onSetLinkedEmployee, onLogoutEverywhere, loginHistory }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [linkSaved, setLinkSaved] = useState(false);
  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false);

  const doSave = async () => {
    if (!draft) return;
    setSaveError(null);
    try {
      await onSaveSignature(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message || "No se pudo guardar la firma.");
    }
  };

  const doSetLink = async (employeeId) => {
    await onSetLinkedEmployee(employeeId || null);
    setLinkSaved(true);
    setTimeout(() => setLinkSaved(false), 2500);
  };

  const [fontScale, setFontScale] = useState(() => {
    try { return localStorage.getItem("pm-local:font-scale") || "md"; } catch { return "md"; }
  });
  const doSetFontScale = (id) => {
    setFontScale(id);
    applyFontScale(id);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi Perfil</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{currentUser}</p>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Tamaño de letra</div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>Ajusta el tamaño del texto en toda la app a lo que te resulte más cómodo de leer.</p>
        <div className="flex flex-wrap gap-2">
          {FONT_SCALE_OPTS.map(opt => (
            <button key={opt.id} onClick={() => doSetFontScale(opt.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                borderColor: fontScale === opt.id ? C.amber : C.line,
                background: fontScale === opt.id ? C.amber : "transparent",
                color: fontScale === opt.id ? "#1a1a1a" : C.ink,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {employees && employees.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>¿Cuál eres tú en el Horario Mensual?</div>
          <p className="text-xs mb-3" style={{ color: C.gray }}>
            Selecciónate una vez y desde entonces "Mi horario" te muestra solo tus turnos, sin tener que buscarte en la tabla completa.
          </p>
          <select value={linkedEmployeeId || ""} onChange={e => doSetLink(e.target.value)}
            className="text-sm border rounded-md px-2 py-2 outline-none w-full max-w-xs" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <option value="">No estoy en la lista / prefiero no elegir</option>
            {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {linkSaved && <div className="text-xs mt-2" style={{ color: C.green }}>✓ Guardado</div>}
        </div>
      )}

      <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Mi firma</div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          La guardas una sola vez aquí, y de ahí en adelante se agrega sola en cada Entrega de turno — no hace falta volver a firmar cada vez.
        </p>

        {mySignature && !draft && (
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: C.gray }}>Firma actual:</div>
            <img loading="lazy" src={mySignature} alt="Tu firma" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 240, background: "#fff" }} />
          </div>
        )}

        <div className="text-xs mb-1" style={{ color: C.gray }}>{mySignature ? "Dibuja aquí para reemplazarla:" : "Dibuja tu firma aquí:"}</div>
        <SignaturePad onChange={setDraft} />

        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" disabled={!draft} onClick={doSave}>Guardar firma</Button>
          {saved && <span className="text-xs font-medium" style={{ color: C.green }}>✓ Firma guardada</span>}
          {saveError && <span className="text-xs font-medium" style={{ color: C.red }}>{saveError}</span>}
        </div>
      </div>

      <div className="rounded-lg border p-4 mt-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Seguridad</div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          Si perdiste un celular con la app abierta, o dejaste la sesión abierta en un equipo que ya no usas, esto la cierra
          en TODOS los dispositivos donde esté conectada — vas a tener que volver a entrar aquí también.
        </p>
        {!confirmingLogoutAll ? (
          <Button size="sm" variant="ghost" icon={LogOut} onClick={() => setConfirmingLogoutAll(true)}>Cerrar sesión en todos los dispositivos</Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: C.red }}>¿Seguro? Vas a salir de aquí también.</span>
            <Button size="sm" variant="red" onClick={onLogoutEverywhere}>Sí, cerrar en todos lados</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingLogoutAll(false)}>Cancelar</Button>
          </div>
        )}
      </div>

      {loginHistory && loginHistory.length > 0 && (
        <div className="rounded-lg border p-4 mt-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Mis últimos inicios de sesión</div>
          <p className="text-xs mb-3" style={{ color: C.gray }}>Si ves un ingreso que no reconoces, cierra la sesión en todos los dispositivos arriba y avísale al admin.</p>
          <div className="flex flex-col gap-1">
            {loginHistory.slice(0, 15).map((l, i) => (
              <div key={i} className="text-xs flex items-center justify-between" style={{ color: i === 0 ? C.ink : C.inkSoft, fontWeight: i === 0 ? 600 : 400 }}>
                <span>{fmtDT(l.at)}</span>
                {i === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.greenSoft, color: C.green }}>Más reciente</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}