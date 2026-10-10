import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, ChevronRight, Layers, PlusCircle, X } from "lucide-react";
import { C, DIAGRAM_ESTADOS, PROCEDURE_COLORS, diagramUrl, normalizeSearchText, useBackCloseModal } from "../shared/core";
import { Badge, Button, ConfirmDialog, Lightbox } from "../shared/components";



/**
 * Diagramas de Sistemas — versión digital de los planos grandes que hoy se imprimen y se pegan
 * en el sitio (chillers, torres, bombas). Toca un componente o un procedimiento guardado y ve la
 * secuencia paso a paso con colores; genera un QR para pegar en el sitio físico y que cualquiera
 * lo escanee y llegue directo aquí desde el celular.
 *
 * IMPORTANTE: la lista de componentes (válvulas, bombas, etc.) se puede precargar desde la
 * convención del plano — eso es solo transcripción. Pero las SECUENCIAS (qué válvula abrir
 * primero, en qué orden) las tiene que armar un admin que conozca el sistema real — no se
 * inventan aquí, porque un orden equivocado puede dañar un equipo de verdad.
 */
export function DiagramsView({ diagrams, procedures, isAdmin, initialDiagramId, onConsumedInitialDiagram, onCreateDiagram, onDeleteDiagram, onCreateProcedure, onDeleteProcedure, onSetComponentPosition }) {
  const [selectedId, setSelectedId] = useState(initialDiagramId || null);
  useEffect(() => {
    if (initialDiagramId) { setSelectedId(initialDiagramId); onConsumedInitialDiagram(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDiagramId]);

  const [showNewDiagram, setShowNewDiagram] = useState(false);
  const [diagramForm, setDiagramForm] = useState({ nombre: "", componentesTexto: "" });
  const [diagramImageFile, setDiagramImageFile] = useState(null);
  const [savingDiagram, setSavingDiagram] = useState(false);
  const [diagramSaveError, setDiagramSaveError] = useState(null);
  const [procSaveError, setProcSaveError] = useState(null);

  const [confirmDeleteDiagram, setConfirmDeleteDiagram] = useState(false);
  const [confirmDeleteProcedure, setConfirmDeleteProcedure] = useState(false);
  const [showNewProcedure, setShowNewProcedure] = useState(false);
  const [procForm, setProcForm] = useState({ nombre: "", color: PROCEDURE_COLORS[0].value, componentePrincipal: "" });
  const [procSteps, setProcSteps] = useState([]);
  const [savingProc, setSavingProc] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [activeProcedure, setActiveProcedure] = useState(null);
  const [verifiedSteps, setVerifiedSteps] = useState({});
  const [componentSearch, setComponentSearch] = useState("");
  const [zoomImage, setZoomImage] = useState(null);
  const [positioningMode, setPositioningMode] = useState(false);
  const [positioningCodigo, setPositioningCodigo] = useState("");
  const [tappedComponent, setTappedComponent] = useState(null);
  useBackCloseModal(!!tappedComponent, () => setTappedComponent(null));

  const selected = diagrams.find(d => d.id === selectedId);
  const diagramProcedures = procedures.filter(p => p.diagramId === selectedId);

  useEffect(() => {
    if (!selected) { setQrDataUrl(null); return; }
    let cancelled = false;
    QRCode.toDataURL(diagramUrl(selected.id), { width: 260, margin: 1 }).then(d => { if (!cancelled) setQrDataUrl(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.id]);

  const inputCls = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  const doCreateDiagram = async () => {
    if (!diagramForm.nombre.trim()) return;
    setSavingDiagram(true); setDiagramSaveError(null);
    const componentes = diagramForm.componentesTexto.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [codigo, ...rest] = line.split("-");
      return { codigo: (codigo || "").trim(), nombre: rest.join("-").trim() || (codigo || "").trim(), tipo: "Otro" };
    });
    // Antes esto no tenía try/catch: si la foto no se podía subir (sin señal, por ejemplo), el
    // botón se quedaba pegado en "Guardando…" para siempre, el formulario no se limpiaba, y no
    // había ningún aviso de que algo había fallado.
    try {
      await onCreateDiagram({ nombre: diagramForm.nombre.trim(), componentes, imageFile: diagramImageFile });
      setDiagramForm({ nombre: "", componentesTexto: "" });
      setDiagramImageFile(null);
      setShowNewDiagram(false);
    } catch (e) {
      setDiagramSaveError(e.message || "No se pudo guardar el diagrama — revisa tu conexión e intenta de nuevo.");
    }
    setSavingDiagram(false);
  };

  const addStep = () => setProcSteps(s => [...s, { codigo: selected?.componentes?.[0]?.codigo || "", estado: "abierta", nota: "" }]);
  const doCreateProcedure = async () => {
    if (!procForm.nombre.trim() || procSteps.length === 0) return;
    setSavingProc(true); setProcSaveError(null);
    try {
      await onCreateProcedure({ diagramId: selected.id, nombre: procForm.nombre.trim(), color: procForm.color, componentePrincipal: procForm.componentePrincipal, pasos: procSteps.map((s, i) => ({ ...s, orden: i + 1 })) });
      setProcForm({ nombre: "", color: PROCEDURE_COLORS[0].value, componentePrincipal: "" });
      setProcSteps([]);
      setShowNewProcedure(false);
    } catch (e) {
      setProcSaveError(e.message || "No se pudo guardar la secuencia — revisa tu conexión e intenta de nuevo.");
    }
    setSavingProc(false);
  };

  const componentesFiltrados = selected ? selected.componentes.filter(c =>
    !componentSearch.trim() || normalizeSearchText(`${c.codigo} ${c.nombre}`).includes(normalizeSearchText(componentSearch.trim()))
  ) : [];

  /** Para el diagrama activo, un mapa código → paso — así el plano se puede pintar solo
   *  mientras se sigue una maniobra, sin tocar nada más del componente. */
  const stepByCodigo = {};
  if (activeProcedure) activeProcedure.pasos.forEach((s, i) => { stepByCodigo[s.codigo] = { ...s, _i: i }; });
  const estadoInfo = (val) => DIAGRAM_ESTADOS.find(e => e.value === val) || DIAGRAM_ESTADOS[2];

  const verifiedCount = activeProcedure ? activeProcedure.pasos.filter((s, i) => verifiedSteps[i]).length : 0;
  const allVerified = activeProcedure && verifiedCount === activeProcedure.pasos.length;

  // Puntos "abierta" en orden, para dibujar la línea animada de recorrido de agua sobre el plano.
  const flowPoints = activeProcedure
    ? activeProcedure.pasos.filter(s => s.estado === "abierta").map(s => selected?.componentes.find(c => c.codigo === s.codigo)).filter(c => c && c.x != null)
    : [];
  const flowPath = flowPoints.length >= 2 ? flowPoints.map(c => `${c.x},${c.y}`).join(" ") : null;

  // ---- Vista de lista (sin diagrama seleccionado) ----
  if (!selected) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Diagramas de sistemas</h2>
        <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Versión digital de los planos de chillers, torres y bombas — con secuencias paso a paso y un QR para pegar en el sitio.</p>

        {isAdmin && (
          <div className="mb-4">
            <Button icon={PlusCircle} onClick={() => setShowNewDiagram(v => !v)}>{showNewDiagram ? "Cancelar" : "Nuevo diagrama"}</Button>
            {showNewDiagram && (
              <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
                <input value={diagramForm.nombre} onChange={e => setDiagramForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Condensación Piso 33)" className={`${inputCls} w-full mb-2`} style={inputStyle} />
                <div className="mb-2">
                  <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Imagen del plano (opcional, puedes agregarla después)</div>
                  <input type="file" accept="image/*" onChange={e => setDiagramImageFile(e.target.files?.[0] || null)} className="text-xs" />
                </div>
                <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Componentes — uno por línea, formato "Código - Nombre" (igual que la tabla de convenciones)</div>
                <textarea value={diagramForm.componentesTexto} onChange={e => setDiagramForm(f => ({ ...f, componentesTexto: e.target.value }))} rows={5}
                  placeholder={"V-1 - Válvula entrada a la torre #1\nV-2 - Válvula entrada a la torre #1\nBAC1 - Bomba de condensación #1"}
                  className={`${inputCls} w-full mb-2 resize-y font-mono`} style={inputStyle} />
                <Button size="sm" disabled={savingDiagram} onClick={doCreateDiagram}>{savingDiagram ? "Guardando…" : "Crear diagrama"}</Button>
                {diagramSaveError && <div className="text-xs mt-1.5" style={{ color: C.red }}>✗ {diagramSaveError}</div>}
              </div>
            )}
          </div>
        )}

        {diagrams.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Todavía no hay diagramas cargados.</p>
        ) : diagrams.map(d => (
          <button key={d.id} onClick={() => setSelectedId(d.id)} className="w-full text-left rounded-lg border p-3 mb-2 flex items-center gap-3" style={{ borderColor: C.line, background: C.panel }}>
            {d.imagenUrl ? <img loading="lazy" src={d.imagenUrl} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" /> : <div className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center" style={{ background: C.bg }}><Layers size={20} color={C.gray} /></div>}
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{d.nombre}</div>
              <div className="text-xs" style={{ color: C.gray }}>{d.componentes.length} componentes · {procedures.filter(p => p.diagramId === d.id).length} secuencia{procedures.filter(p => p.diagramId === d.id).length === 1 ? "" : "s"} guardada{procedures.filter(p => p.diagramId === d.id).length === 1 ? "" : "s"}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ---- Vista de detalle de un diagrama ----
  return (
    <div>
      <style>{`
        @keyframes pmPulseGreen { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.7); } 50% { box-shadow: 0 0 0 8px rgba(22,163,74,0); } }
        @keyframes pmFlowDash { to { stroke-dashoffset: -24; } }
      `}</style>
      <button onClick={() => { setSelectedId(null); setActiveProcedure(null); }} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.inkSoft }}>
        <ArrowLeft size={15} /> Todos los diagramas
      </button>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{selected.nombre}</h2>
        {isAdmin && <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteDiagram(true)} style={{ color: C.red }}>Borrar diagrama</Button>}
      </div>

      {activeProcedure && (
        <div className="rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: `${activeProcedure.color}18`, border: `1.5px solid ${activeProcedure.color}` }}>
          <div className="text-sm font-semibold" style={{ color: activeProcedure.color }}>
            Maniobra activa: {activeProcedure.nombre} — el plano está pintado según esta secuencia
          </div>
          <button onClick={() => { setActiveProcedure(null); setVerifiedSteps({}); }} className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: C.panel, color: C.inkSoft }}>Salir de la maniobra</button>
        </div>
      )}

      {selected.imagenUrl && (
        <div className="mb-4">
          {isAdmin && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button onClick={() => { setPositioningMode(v => !v); setPositioningCodigo(""); }} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: positioningMode ? C.amberSoft : C.bg, color: positioningMode ? "#7a5405" : C.inkSoft }}>
                {positioningMode ? "✓ Saliendo de posicionar" : "Posicionar componentes en el plano"}
              </button>
              {positioningMode && (
                <select value={positioningCodigo} onChange={e => setPositioningCodigo(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Elige qué componente vas a ubicar…</option>
                  {selected.componentes.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}{c.x != null ? " (ya ubicado)" : ""}</option>)}
                </select>
              )}
            </div>
          )}
          {positioningMode && positioningCodigo && (
            <div className="text-xs rounded-md p-2 mb-2" style={{ background: C.blueSoft, color: C.blue }}>Toca en el plano exactamente dónde está "{positioningCodigo}".</div>
          )}
          <div className="relative rounded-lg border overflow-hidden" style={{ borderColor: C.line, background: C.bg }}>
            <img loading="lazy" src={selected.imagenUrl} alt={selected.nombre}
              onClick={e => {
                if (positioningMode && positioningCodigo) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
                  onSetComponentPosition(selected.id, positioningCodigo, x, y);
                  setPositioningCodigo("");
                } else if (!positioningMode) {
                  setZoomImage(selected.imagenUrl);
                }
              }}
              className="w-full block" style={{ height: "auto", cursor: positioningMode ? "crosshair" : "zoom-in" }} />

            {/* Animación del recorrido del agua: une los puntos "abierta" de la maniobra activa */}
            {flowPath && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={flowPath} fill="none" stroke={activeProcedure.color} strokeWidth="0.6"
                  strokeDasharray="3,2" style={{ animation: "pmFlowDash 1s linear infinite" }} vectorEffect="non-scaling-stroke" />
              </svg>
            )}

            {selected.componentes.filter(c => c.x != null && c.y != null).map(c => {
              const step = stepByCodigo[c.codigo];
              const est = step ? estadoInfo(step.estado) : null;
              const bg = est ? est.color : C.amber;
              return (
                <button key={c.codigo} onClick={e => {
                    e.stopPropagation();
                    if (positioningMode) return;
                    if (activeProcedure && step) setVerifiedSteps(vs => ({ ...vs, [step._i]: !vs[step._i] }));
                    else setTappedComponent(c);
                  }}
                  className="absolute rounded-full flex items-center justify-center font-bold shadow"
                  style={{
                    left: `${c.x}%`, top: `${c.y}%`, width: activeProcedure && step ? 30 : 24, height: activeProcedure && step ? 30 : 24,
                    transform: "translate(-50%, -50%)", background: verifiedSteps[step?._i] ? C.green : bg, color: "#fff", fontSize: 9, border: "2px solid #fff",
                    opacity: activeProcedure && !step ? 0.35 : 1,
                    animation: step?.estado === "abierta" && !verifiedSteps[step?._i] ? "pmPulseGreen 1.4s infinite" : "none",
                    transition: "all 150ms",
                  }}
                  title={`${c.codigo} — ${c.nombre}${step ? ` · ${estadoInfo(step.estado).label}${verifiedSteps[step._i] ? " · ✓ verificada" : " · toca para verificar"}` : ""}`}>
                  {verifiedSteps[step?._i] ? "✓" : c.codigo.slice(0, 3)}
                </button>
              );
            })}
          </div>
          {isAdmin && !positioningMode && (
            <div className="text-xs mt-1" style={{ color: C.gray }}>
              {selected.componentes.filter(c => c.x != null).length} de {selected.componentes.length} componentes ya ubicados en el plano.
            </div>
          )}
          {!isAdmin && !activeProcedure && (
            <div className="text-xs mt-1" style={{ color: C.gray }}>🟠 Toca cualquier punto del plano para ver qué maniobras aplican, o abre una secuencia guardada abajo.</div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Componentes ({selected.componentes.length})</div>
          <input value={componentSearch} onChange={e => setComponentSearch(e.target.value)} placeholder="Buscar…" className={`${inputCls} w-full mb-2`} style={inputStyle} />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {componentesFiltrados.map((c, i) => (
              <div key={i} className="text-xs flex items-center gap-1.5">
                <Badge tone="blue">{c.codigo}</Badge> <span style={{ color: C.ink }}>{c.nombre}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-3 flex flex-col items-center justify-center text-center" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>QR para pegar en el sitio</div>
          {qrDataUrl ? (
            <>
              <img loading="lazy" src={qrDataUrl} alt="QR" className="w-32 h-32 mb-2" />
              <a href={qrDataUrl} download={`diagrama-${normalizeSearchText(selected.nombre).replace(/\s+/g, "-")}.png`} className="text-xs font-semibold" style={{ color: C.amber }}>Descargar imagen</a>
            </>
          ) : <div className="text-xs py-8" style={{ color: C.gray }}>Generando…</div>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Secuencias guardadas ({diagramProcedures.length})</div>
        {isAdmin && <button onClick={() => { setShowNewProcedure(v => !v); setProcSteps([]); }} className="text-xs font-semibold" style={{ color: C.amber }}>{showNewProcedure ? "Cancelar" : "+ Nueva secuencia"}</button>}
      </div>

      {showNewProcedure && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <input value={procForm.nombre} onChange={e => setProcForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Encender Chiller 1)" className={inputCls} style={inputStyle} />
            <select value={procForm.color} onChange={e => setProcForm(f => ({ ...f, color: e.target.value }))} className={inputCls} style={inputStyle}>
              {PROCEDURE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <select value={procForm.componentePrincipal} onChange={e => setProcForm(f => ({ ...f, componentePrincipal: e.target.value }))} className={`${inputCls} w-full mb-2`} style={inputStyle}>
            <option value="">¿De qué componente es esta secuencia? (opcional, para que aparezca al tocarlo en el plano)</option>
            {selected.componentes.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
          </select>
          <div className="text-xs mb-1.5" style={{ color: C.inkSoft }}>Por cada válvula/equipo que participa, elige en qué estado debe quedar:</div>
          {procSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <select value={s.codigo} onChange={e => setProcSteps(arr => arr.map((st, idx) => idx === i ? { ...st, codigo: e.target.value } : st))} className={inputCls} style={{ ...inputStyle, minWidth: 140 }}>
                {selected.componentes.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
              </select>
              <select value={s.estado} onChange={e => setProcSteps(arr => arr.map((st, idx) => idx === i ? { ...st, estado: e.target.value } : st))} className={inputCls}
                style={{ ...inputStyle, color: estadoInfo(s.estado).color, fontWeight: 700 }}>
                {DIAGRAM_ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <input value={s.nota} onChange={e => setProcSteps(arr => arr.map((st, idx) => idx === i ? { ...st, nota: e.target.value } : st))} placeholder="Nota (opcional)" className={inputCls} style={{ ...inputStyle, flex: 1, minWidth: 100 }} />
              <button onClick={() => setProcSteps(arr => arr.filter((_, idx) => idx !== i))} aria-label="Quitar paso" title="Quitar paso"><X size={14} color={C.gray} /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={addStep}>+ Agregar componente</Button>
            <Button size="sm" disabled={savingProc || !procForm.nombre.trim() || procSteps.length === 0} onClick={doCreateProcedure}>{savingProc ? "Guardando…" : "Guardar secuencia"}</Button>
          </div>
          {procSaveError && <div className="text-xs mt-1.5" style={{ color: C.red }}>✗ {procSaveError}</div>}
        </div>
      )}

      {diagramProcedures.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Todavía no hay secuencias guardadas para este diagrama.</p>
      ) : diagramProcedures.map(p => (
        <button key={p.id} onClick={() => { setActiveProcedure(p); setVerifiedSteps({}); }} className="w-full text-left rounded-lg border p-3 mb-2 flex items-center justify-between" style={{ borderColor: p.color, background: activeProcedure?.id === p.id ? `${p.color}18` : C.panel }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: p.color }}>{p.nombre}</div>
            <div className="text-xs" style={{ color: C.gray }}>{p.pasos.length} componente{p.pasos.length === 1 ? "" : "s"} involucrado{p.pasos.length === 1 ? "" : "s"}</div>
          </div>
          <ChevronRight size={16} color={C.gray} />
        </button>
      ))}

      {/* Lista de válvulas de la maniobra activa — debajo del plano, ya no como panel flotante */}
      {activeProcedure && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: activeProcedure.color, background: C.panel }}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-base font-bold" style={{ color: activeProcedure.color }}>{activeProcedure.nombre}</div>
          </div>
          <div className="text-xs mb-3" style={{ color: C.gray }}>
            {verifiedCount}/{activeProcedure.pasos.length} verificadas en campo
            <div className="w-full rounded-full mt-1" style={{ height: 5, background: C.bg }}>
              <div className="h-full rounded-full" style={{ width: `${(verifiedCount / activeProcedure.pasos.length) * 100}%`, background: allVerified ? C.green : activeProcedure.color, transition: "width 200ms" }} />
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setConfirmDeleteProcedure(true)} className="text-xs font-semibold mb-3" style={{ color: C.red }}>Borrar esta secuencia</button>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            {DIAGRAM_ESTADOS.map(grupo => {
              const items = activeProcedure.pasos.map((s, i) => ({ ...s, _i: i })).filter(s => s.estado === grupo.value);
              if (items.length === 0) return null;
              return (
                <div key={grupo.value}>
                  <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: grupo.color }}>
                    {grupo.value === "abierta" ? "Deben quedar ABIERTAS" : grupo.value === "cerrada" ? "Deben quedar CERRADAS" : "No afectan a esta maniobra"}
                  </div>
                  <div className="space-y-1.5">
                    {items.map(s => {
                      const comp = selected.componentes.find(c => c.codigo === s.codigo);
                      const done = !!verifiedSteps[s._i];
                      return (
                        <button key={s._i} onClick={() => setVerifiedSteps(vs => ({ ...vs, [s._i]: !vs[s._i] }))}
                          className="w-full text-left rounded-lg p-2.5 flex items-start gap-2.5" style={{ background: done ? "#f0fdf4" : C.bg, opacity: done ? 0.65 : 1 }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5" style={{ background: done ? C.green : grupo.color, color: "#fff" }}>
                            {done ? "✓" : ""}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: C.ink, textDecoration: done ? "line-through" : "none" }}>{s.codigo} — {comp?.nombre || ""}</div>
                            {s.nota && <div className="text-xs mt-0.5" style={{ color: C.gray }}>{s.nota}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {allVerified && (
            <div className="rounded-lg p-2.5 text-xs font-semibold text-center mt-3" style={{ background: C.greenSoft, color: C.green }}>
              ✓ Maniobra verificada por completo en campo
            </div>
          )}
        </div>
      )}

      {tappedComponent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setTappedComponent(null)}>
          <div className="w-full sm:w-96 max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Badge tone="blue">{tappedComponent.codigo}</Badge>
                <div className="text-base font-bold mt-1" style={{ color: C.ink }}>{tappedComponent.nombre}</div>
              </div>
              <button onClick={() => setTappedComponent(null)} aria-label="Cerrar" title="Cerrar"><X size={18} color={C.gray} /></button>
            </div>
            {(() => {
              const related = diagramProcedures.filter(p => p.componentePrincipal === tappedComponent.codigo);
              return related.length === 0 ? (
                <p className="text-sm" style={{ color: C.gray }}>Todavía no hay ninguna secuencia guardada para este componente.</p>
              ) : related.map(p => (
                <button key={p.id} onClick={() => { setTappedComponent(null); setActiveProcedure(p); setVerifiedSteps({}); }}
                  className="w-full text-left rounded-lg border p-3 mb-2" style={{ borderColor: p.color, background: C.panel }}>
                  <div className="text-sm font-semibold" style={{ color: p.color }}>{p.nombre}</div>
                  <div className="text-xs" style={{ color: C.gray }}>{p.pasos.length} componente{p.pasos.length === 1 ? "" : "s"}</div>
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      <Lightbox url={zoomImage} onClose={() => setZoomImage(null)} />
      <ConfirmDialog open={confirmDeleteDiagram} title="Borrar diagrama"
        message="¿Seguro que quieres borrar este diagrama y todas sus secuencias guardadas? No se puede deshacer."
        onConfirm={() => { onDeleteDiagram(selected.id); setSelectedId(null); setConfirmDeleteDiagram(false); }}
        onCancel={() => setConfirmDeleteDiagram(false)} />
      <ConfirmDialog open={confirmDeleteProcedure} title="Borrar secuencia"
        message="¿Seguro que quieres borrar esta secuencia? No se puede deshacer."
        onConfirm={() => { onDeleteProcedure(activeProcedure.id); setActiveProcedure(null); setConfirmDeleteProcedure(false); }}
        onCancel={() => setConfirmDeleteProcedure(false)} />
    </div>
  );
}