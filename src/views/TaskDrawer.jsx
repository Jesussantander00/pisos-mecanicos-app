import { useEffect, useMemo, useState } from "react";
import { uploadPhoto } from "../lib/storage";
import { Camera, Download, X } from "lucide-react";
import { C, TASK_PRIORITIES, TASK_STATES, TASK_STATE_COLORS, badgeToneFor, cargoForUsername, elapsed, fmtDT, isTaskSnoozed, localDateIso, normalizeTaskState, nowIso, showToast, suggestChecklist, uid, useBackCloseModal } from "../shared/core";
import { Avatar, Badge, Button, EquipoHistorySuggestions, MaintenanceTextSuggestions, PartsPicker, PhotoPicker, SignaturePad, TaskTimer, VoiceInputButton } from "../shared/components";



export function TaskDrawer({ task, accounts, employees, canAct, equipos, mttoLog, invItems, onLogMaintenance, onClose, onTransition, onCloseTask, onDownloadReport, downloadingReport, onZoom, onMarkViewed, hasPendingUpload, onUpdateTask, onAddComment, currentUsername, currentUser, allUsernames, mySignature, signerCargo, viewerLocked, onGoToProfile }) {
  useBackCloseModal(true, onClose); // este drawer, al estar montado, siempre está "abierto"
  const [closePhotos, setClosePhotos] = useState([]);
  const [closeNote, setCloseNote] = useState("");
  const [closeWitness, setCloseWitness] = useState("");
  const [closeWitnessSignature, setCloseWitnessSignature] = useState(null);
  const [closeSaving, setCloseSaving] = useState(false);
  const [closeMsg, setCloseMsg] = useState(null);
  const [closeParts, setCloseParts] = useState([]);
  const [showWaitForm, setShowWaitForm] = useState(false);
  const [waitText, setWaitText] = useState("");
  const [commentPhotos, setCommentPhotos] = useState([]);
  const [closeWarned, setCloseWarned] = useState(false);
  const [showMttoForm, setShowMttoForm] = useState(false);
  const [mttoForm, setMttoForm] = useState({ tipo: "preventivo", descripcion: "", costo: "", fotos: [], repuestos: [] });
  const [mttoSaving, setMttoSaving] = useState(false);
  const [mttoMsg, setMttoMsg] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showSnoozeForm, setShowSnoozeForm] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState("");

  // Deja registro de quién abrió esta tarea — para saber si alguien ya se enteró de algo
  // crítico, aunque todavía no haya actuado. Una vez por persona, no cada vez que la abre.
  useEffect(() => { onMarkViewed(task); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const estado = normalizeTaskState(task.estado);
  const stateColors = TASK_STATE_COLORS[estado];
  const assigneeName = task.asignadoA ? (accounts[task.asignadoA]?.display_name || task.asignadoA) : "Sin asignar";
  const linkedEquipo = task.equipoId && equipos ? equipos.find(e => e.id === task.equipoId) : null;
  const equipoHistory = useMemo(
    () => linkedEquipo ? (mttoLog || []).filter(r => r.equipoId === linkedEquipo.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5) : [],
    [linkedEquipo, mttoLog]
  );

  const doClose = async () => {
    if (closePhotos.length === 0) { setCloseMsg({ ok: false, text: "Necesitas al menos una foto de cómo quedó, para poder cerrarla." }); return; }
    if (estado !== "finalizada" && task.prioridad === "alta" && !closeWitness.trim()) {
      setCloseMsg({ ok: false, text: "Por ser Prioridad Alta, necesitas el nombre de un testigo que verificó cómo quedó, antes de cerrarla." });
      return;
    }
    const pasosSinMarcar = (task.checklist || []).filter(c => !c.done).length;
    if (pasosSinMarcar > 0 && !closeWarned) {
      setCloseWarned(true);
      setCloseMsg({ ok: false, text: `Quedan ${pasosSinMarcar} paso(s) del checklist sin marcar. Márcalos, o toca "Confirmar cierre" otra vez para cerrar igual.` });
      return;
    }
    setCloseSaving(true); setCloseMsg(null);
    try {
      await onCloseTask(task, closePhotos, closeNote.trim(), closeWitness.trim(), closeWitnessSignature, closeParts);
      onClose();
    } catch (e) {
      setCloseMsg({ ok: false, text: e.message || "No se pudo cerrar la tarea — revisa tu conexión e intenta de nuevo." });
    }
    setCloseSaving(false);
  };

  const toggleChecklistItem = (id) => {
    const checklist = (task.checklist || []).map(c => c.id === id ? { ...c, done: !c.done } : c);
    onUpdateTask(task.id, { checklist });
  };
  const addChecklistItem = () => {
    const text = checklistDraft.trim();
    if (!text) return;
    const checklist = [...(task.checklist || []), { id: uid("chk"), text, done: false }];
    onUpdateTask(task.id, { checklist });
    setChecklistDraft("");
  };
  const sugerido = estado !== "finalizada" && canAct && !(task.checklist || []).length ? suggestChecklist(task) : null;
  const loadSuggestedChecklist = () => {
    if (!sugerido) return;
    onUpdateTask(task.id, { checklist: sugerido.steps.map(text => ({ id: uid("chk"), text, done: false })) });
  };
  const removeChecklistItem = (id) => {
    onUpdateTask(task.id, { checklist: (task.checklist || []).filter(c => c.id !== id) });
  };

  const postComment = async () => {
    if (!commentDraft.trim() && commentPhotos.length === 0) return;
    setPostingComment(true);
    try {
      const urls = [];
      for (const f of commentPhotos) urls.push(await uploadPhoto(f, "task-comment"));
      await onAddComment(task.id, commentDraft.trim(), urls);
      setCommentDraft(""); setCommentPhotos([]);
    }
    catch { showToast("No se pudo enviar el comentario — revisa la señal (las fotos necesitan conexión) e intenta de nuevo.", false); }
    setPostingComment(false);
  };

  const doSnooze = (dateIso) => {
    const d = typeof dateIso === "string" && dateIso ? dateIso : snoozeDate;
    if (!d) return;
    onUpdateTask(task.id, { snoozedUntil: new Date(d + "T00:00:00").toISOString() });
    setShowSnoozeForm(false); setSnoozeDate("");
    showToast("Tarea pospuesta — se esconde de las listas hasta esa fecha.", true);
  };
  const cancelSnooze = () => onUpdateTask(task.id, { snoozedUntil: null });

  const doLogMaintenance = async () => {
    if (mttoForm.fotos.length === 0) { setMttoMsg({ ok: false, text: "Adjunta al menos una foto del mantenimiento." }); return; }
    setMttoSaving(true); setMttoMsg(null);
    try {
      await onLogMaintenance(linkedEquipo.id, { ...mttoForm, taskId: task.id });
      setShowMttoForm(false);
      setMttoForm({ tipo: "preventivo", descripcion: "", costo: "", fotos: [], repuestos: [] });
      setMttoMsg({ ok: true, text: "✓ Mantenimiento registrado en la hoja de vida del equipo." });
    } catch (e) {
      setMttoMsg({ ok: false, text: e.message || "No se pudo registrar el mantenimiento — revisa tu conexión e intenta de nuevo." });
    }
    setMttoSaving(false);
  };

  const timeline = [...(task.timeLog || [])].sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <>
      <div className="fixed inset-0" style={{ background: "rgba(10,14,20,0.5)", zIndex: 150 }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] overflow-y-auto pm-stagger-in" style={{ background: C.panel, zIndex: 151, boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" }}>
        <div className="pm-safe-top sticky top-0 flex items-start justify-between gap-2 p-4 border-b" style={{ background: C.panel, borderColor: C.line }}>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: stateColors.bg, color: stateColors.fg }}>{TASK_STATES.find(s => s.code === estado)?.label || estado}</span>
            <div className="text-base font-semibold mt-1" style={{ color: C.ink }}>{task.titulo}</div>
            {task.etiquetas && task.etiquetas.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-1">
                {task.etiquetas.map((tag, i) => (
                  <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.amberSoft, color: C.amber }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="p-1.5 rounded-full shrink-0" style={{ color: C.gray }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Avatar name={assigneeName} cargo={cargoForUsername(task.asignadoA, accounts, employees)} size={32} />
            <div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{assigneeName}</div>
              <Badge tone={badgeToneFor("prioridad", task.prioridad)}>{TASK_PRIORITIES.find(p => p.code === task.prioridad)?.label}</Badge>
            </div>
            <div className="ml-auto"><TaskTimer assignedAt={task.assignedAt} finishedAt={task.finishedAt} estado={estado} /></div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Descripción</div>
            <div className="text-sm" style={{ color: C.ink }}>{task.descripcion || "Sin descripción adicional."}</div>
          </div>

          {canAct && estado !== "finalizada" && (
            <div className="rounded-lg border p-2.5" style={{ borderColor: isTaskSnoozed(task) ? C.blue : C.line, background: isTaskSnoozed(task) ? "#eef4fb" : C.panel }}>
              {isTaskSnoozed(task) ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: C.blue }}>😴 Pospuesta hasta {fmtDT(task.snoozedUntil)} — no aparece en las listas normales hasta esa fecha.</span>
                  <button onClick={cancelSnooze} className="text-xs font-semibold shrink-0" style={{ color: C.blue }}>Quitar</button>
                </div>
              ) : showSnoozeForm ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={snoozeDate} onChange={e => setSnoozeDate(e.target.value)} min={localDateIso(new Date())}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <Button size="sm" onClick={() => doSnooze()} disabled={!snoozeDate}>Posponer</Button>
                  <button onClick={() => setShowSnoozeForm(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
                  <div className="w-full flex items-center gap-1.5 flex-wrap">
                    {[["Mañana", 1], ["En 2 días", 2], ["Próximo lunes", "lunes"], ["En 1 semana", 7]].map(([label, n]) => {
                      const d = new Date(); d.setHours(0, 0, 0, 0);
                      if (n === "lunes") { const add = ((8 - d.getDay()) % 7) || 7; d.setDate(d.getDate() + add); } else d.setDate(d.getDate() + n);
                      return <button key={label} onClick={() => doSnooze(localDateIso(d))} className="text-xs font-semibold rounded-full border px-3" style={{ borderColor: C.line, background: C.bg, color: C.ink, minHeight: 36 }}>{label}</button>;
                    })}
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSnoozeForm(true)} className="text-xs font-semibold" style={{ color: C.inkSoft }}>😴 Posponer hasta una fecha (ej: falta el repuesto)</button>
              )}
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Checklist {task.checklist?.length > 0 ? `(${task.checklist.filter(c => c.done).length}/${task.checklist.length})` : ""}</div>
            {sugerido && (
              <button type="button" onClick={loadSuggestedChecklist} className="text-xs font-semibold rounded-lg px-3 mb-1.5" style={{ minHeight: 36, background: C.amberSoft, color: C.amber }}>
                ✨ Cargar pasos sugeridos ({sugerido.label})
              </button>
            )}
            {(task.checklist || []).map(item => (
              <label key={item.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer" style={{ color: item.done ? C.gray : C.ink, textDecoration: item.done ? "line-through" : "none" }}>
                <input type="checkbox" checked={!!item.done} onChange={() => canAct && toggleChecklistItem(item.id)} disabled={!canAct} />
                <span className="flex-1">{item.text}</span>
                {canAct && <button onClick={() => removeChecklistItem(item.id)} aria-label="Quitar paso"><X size={12} color={C.gray} /></button>}
              </label>
            ))}
            {canAct && (
              <div className="flex items-center gap-1.5 mt-1">
                <input value={checklistDraft} onChange={e => setChecklistDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                  placeholder="Agregar paso (ej: desmontar, pedir repuesto, instalar)…"
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <button onClick={addChecklistItem} className="text-xs font-semibold px-2 py-1.5 rounded-md" style={{ background: C.bg, color: C.inkSoft }}>+</button>
              </div>
            )}
          </div>

          {linkedEquipo && (
            <div className="rounded-lg border p-2.5" style={{ borderColor: C.blueSoft, background: C.blueSoft }}>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.blue }}>🔗 Equipo vinculado</div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{linkedEquipo.nombre}</div>
              <div className="text-xs mb-2" style={{ color: C.gray }}>{linkedEquipo.sistema}</div>
              {(linkedEquipo.manualUrl || linkedEquipo.videoUrl) && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {linkedEquipo.manualUrl && <a href={linkedEquipo.manualUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold rounded-lg px-3 flex items-center" style={{ minHeight: 36, background: C.panel, color: C.blue }}>📖 Manual</a>}
                  {linkedEquipo.videoUrl && <a href={linkedEquipo.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold rounded-lg px-3 flex items-center" style={{ minHeight: 36, background: C.panel, color: C.blue }}>🎬 Video de guía</a>}
                </div>
              )}

              {equipoHistory.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Historial reciente</div>
                  {equipoHistory.map(r => (
                    <div key={r.id} className="text-xs py-0.5 flex items-center gap-1.5" style={{ color: C.inkSoft }}>
                      <Badge tone={badgeToneFor("tipoMtto", r.tipo)}>{r.tipo === "preventivo" ? "Preventivo" : "Correctivo"}</Badge>
                      {fmtDT(r.fecha)} — {r.descripcion || "sin descripción"}
                    </div>
                  ))}
                </div>
              )}

              {!showMttoForm ? (
                <Button size="sm" variant="ghost" onClick={() => setShowMttoForm(true)}>+ Registrar Mantenimiento</Button>
              ) : (
                <div className="rounded-md p-2 mt-1" style={{ background: C.panel }}>
                  <div className="flex items-center gap-2 mb-2">
                    <select value={mttoForm.tipo} onChange={e => setMttoForm(f => ({ ...f, tipo: e.target.value }))}
                      className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                      <option value="preventivo">Preventivo</option>
                      <option value="correctivo">Correctivo</option>
                    </select>
                    <input type="number" value={mttoForm.costo} onChange={e => setMttoForm(f => ({ ...f, costo: e.target.value }))} placeholder="Costo (opcional)"
                      className="text-sm border rounded-md px-2 py-1.5 outline-none w-28" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  </div>
                  <MaintenanceTextSuggestions sistema={linkedEquipo.sistema} tipo={mttoForm.tipo} onPick={t => setMttoForm(f => ({ ...f, descripcion: f.descripcion.trim() ? `${f.descripcion.trim()} ${t}` : t }))} />
                  <EquipoHistorySuggestions equipoId={linkedEquipo.id} mttoLog={mttoLog} onPick={t => setMttoForm(f => ({ ...f, descripcion: f.descripcion.trim() ? `${f.descripcion.trim()} ${t}` : t }))} />
                  <div className="flex items-start gap-1.5">
                    <textarea value={mttoForm.descripcion} onChange={e => setMttoForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Qué se hizo"
                      className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                    <VoiceInputButton onResult={text => setMttoForm(f => ({ ...f, descripcion: (f.descripcion ? f.descripcion + " " : "") + text }))} />
                  </div>
                  <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Fotos (al menos una)</div>
                  <PhotoPicker photos={mttoForm.fotos} onChange={fotos => setMttoForm(f => ({ ...f, fotos }))} max={6} />
                  {invItems && (
                    <>
                      <div className="text-xs font-medium mb-1 mt-2" style={{ color: C.inkSoft }}>Repuestos usados (opcional)</div>
                      <PartsPicker invItems={invItems} parts={mttoForm.repuestos} onChange={repuestos => setMttoForm(f => ({ ...f, repuestos }))} />
                    </>
                  )}
                  {mttoMsg && <div className="text-xs mt-1.5" style={{ color: mttoMsg.ok ? C.green : C.red }}>{mttoMsg.text}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" disabled={mttoSaving} onClick={doLogMaintenance}>{mttoSaving ? "Guardando…" : "Guardar"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowMttoForm(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
              {!showMttoForm && mttoMsg && <div className="text-xs mt-1.5" style={{ color: mttoMsg.ok ? C.green : C.red }}>{mttoMsg.text}</div>}
            </div>
          )}

          {task.fotosAntes && task.fotosAntes.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Fotos — antes</div>
              <div className="flex items-center gap-2 flex-wrap">
                {task.fotosAntes.map((url, pi) => (
                  <button key={pi} onClick={() => onZoom(url)} aria-label="Ver foto ampliada">
                    <img loading="lazy" src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Cronología</div>
            <div className="space-y-1.5">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: C.ink }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TASK_STATE_COLORS[normalizeTaskState(ev.estado)]?.fg || C.gray }} />
                    {TASK_STATES.find(s => s.code === normalizeTaskState(ev.estado))?.label || ev.estado}
                    {ev.nota ? <span style={{ color: C.inkSoft }}> — {ev.nota}</span> : null}
                    {ev.by ? <span style={{ color: C.gray }}> · {ev.by}</span> : null}
                  </span>
                  <span style={{ color: C.gray }}>{fmtDT(ev.at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Comentarios {task.comments?.length > 0 ? `(${task.comments.length})` : ""}</div>
            <div className="space-y-2 mb-2">
              {(task.comments || []).length === 0 && <p className="text-xs" style={{ color: C.gray }}>Todavía no hay comentarios.</p>}
              {(task.comments || []).map(c => (
                <div key={c.id} className="rounded-md p-2" style={{ background: C.bg }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: C.ink }}>{c.by}</span>
                    <span className="text-[10px]" style={{ color: C.gray }}>{fmtDT(c.at)}</span>
                  </div>
                  {c.text && <div className="text-sm" style={{ color: C.ink }}>{c.text}</div>}
                  {(c.fotos || []).length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {c.fotos.map(u => <img key={u} loading="lazy" src={u} alt="Foto del comentario" onClick={() => onZoom && onZoom(u)} className="rounded border cursor-pointer" style={{ width: 72, height: 72, objectFit: "cover", borderColor: C.line }} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-1.5">
              <textarea value={commentDraft} onChange={e => setCommentDraft(e.target.value)} rows={2}
                placeholder={`Escribe un comentario… usa @${(allUsernames || []).length ? "nombre" : "alguien"} para avisarle a una persona en particular`}
                className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <VoiceInputButton onResult={text => setCommentDraft(d => (d ? d + " " : "") + text)} />
            </div>
            <div className="mt-1.5"><PhotoPicker photos={commentPhotos} onChange={setCommentPhotos} max={2} /></div>
            <Button size="sm" variant="ghost" disabled={postingComment || (!commentDraft.trim() && commentPhotos.length === 0)} onClick={postComment} className="mt-1.5">
              {postingComment ? "Enviando…" : "Comentar"}
            </Button>
          </div>

          {task.vistoPor && task.vistoPor.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Visto por</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[...task.vistoPor].sort((a, b) => new Date(b.at) - new Date(a.at)).map((v, i) => (
                  <span key={i} title={fmtDT(v.at)} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: C.bg, color: C.inkSoft }}>
                    <Avatar name={v.displayName} size={14} /> {v.displayName} · {elapsed(v.at)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {estado === "finalizada" ? (
            <>
              {task.fotosDespues && task.fotosDespues.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.green }}>Fotos — después</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.fotosDespues.map((url, pi) => (
                      <button key={pi} onClick={() => onZoom(url)} aria-label="Ver foto ampliada">
                        <img loading="lazy" src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.green }} />
                      </button>
                    ))}
                  </div>
                  {task.notaCierre && <div className="text-xs mt-2 italic" style={{ color: C.inkSoft }}>"{task.notaCierre}"</div>}
                  {task.testigoCierre && <div className="text-xs mt-1 font-medium" style={{ color: C.gray }}>✓ Verificado por: {task.testigoCierre}</div>}
                  {hasPendingUpload && (
                    <div className="text-xs mt-1.5 font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: C.amberSoft, color: C.amber }}>
                      <Camera size={11} /> Fotos aún esperando a subirse (sin señal)
                    </div>
                  )}
                </div>
              )}
              <Button icon={Download} disabled={downloadingReport} onClick={() => onDownloadReport(task)} className="w-full justify-center">
                {downloadingReport ? "Generando…" : "Descargar reporte de cierre"}
              </Button>
            </>
          ) : canAct ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {estado === "asignada" && <Button size="sm" onClick={() => onTransition(task, "en-proceso")}>▶ Iniciar</Button>}
                {estado === "en-proceso" && <Button size="sm" variant="ghost" onClick={() => onTransition(task, "pausada")}>⏸ Pausar</Button>}
                {estado === "pausada" && <Button size="sm" onClick={() => onTransition(task, "en-proceso")}>▶ Reanudar</Button>}
                {!task.esperaRepuesto && <Button size="sm" variant="ghost" onClick={() => setShowWaitForm(v => !v)}>📦 Esperando repuesto</Button>}
              </div>
              {task.esperaRepuesto && (
                <div className="rounded-md p-2 text-xs" style={{ background: C.amberSoft, color: C.amber }}>📦 Esperando repuesto: <b>{task.esperaRepuesto.texto}</b> (desde {fmtDT(task.esperaRepuesto.at)}). Al reanudar se quita solo.</div>
              )}
              {showWaitForm && !task.esperaRepuesto && (
                <div className="flex items-center gap-1.5">
                  <input value={waitText} onChange={e => setWaitText(e.target.value)} placeholder="¿Qué repuesto falta?" className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <Button size="sm" disabled={!waitText.trim()} onClick={() => { const at = nowIso(); onUpdateTask(task.id, { estado: "pausada", esperaRepuesto: { texto: waitText.trim(), at }, timeLog: [...(task.timeLog || []), { estado: "pausada", at, nota: `Esperando repuesto: ${waitText.trim()}` }] }); setShowWaitForm(false); setWaitText(""); }}>Guardar</Button>
                </div>
              )}
              <div className="rounded-md p-2.5" style={{ background: C.bg }}>
                <div className="text-xs font-semibold mb-1.5" style={{ color: C.ink }}>Cerrar tarea — sube al menos una foto de cómo quedó</div>
                {mySignature ? (
                  <div className="flex items-center gap-2 mb-2 p-1.5 rounded-md" style={{ background: C.greenSoft }}>
                    <img loading="lazy" src={mySignature} alt="Tu firma" className="rounded border shrink-0" style={{ borderColor: C.line, width: 60, height: 28, objectFit: "contain", background: "#fff" }} />
                    <span className="text-[11px] font-medium" style={{ color: C.green }}>✓ Se firma sola con tu firma guardada — no hace falta volver a dibujarla.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2 p-1.5 rounded-md flex-wrap" style={{ background: C.amberSoft }}>
                    <span className="text-[11px] font-medium" style={{ color: C.amber }}>Todavía no has guardado tu firma — guárdala una sola vez y de ahí en adelante se agrega sola al cerrar tareas.</span>
                    {onGoToProfile && (
                      <button onClick={onGoToProfile} className="text-[11px] font-bold underline shrink-0" style={{ color: C.amber }}>Ir a Mi Perfil</button>
                    )}
                  </div>
                )}
                <PhotoPicker photos={closePhotos} onChange={setClosePhotos} max={4} />
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {["Reparado", "Repuesto cambiado", "Limpieza y ajuste", "Sin falla, se ajustó", "Queda en observación"].map(chip => (
                    <button key={chip} type="button" onClick={() => setCloseNote(prev => (prev && !prev.includes(chip) ? prev.replace(/\s+$/, "") + ". " + chip : (prev || chip)))}
                      className="text-xs font-semibold rounded-full border px-3" style={{ borderColor: C.line, background: C.panel, color: C.ink, minHeight: 36 }}>{chip}</button>
                  ))}
                </div>
                {invItems && invItems.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Repuestos usados (opcional) — se descuentan solos del inventario</div>
                    <PartsPicker invItems={invItems} parts={closeParts} onChange={setCloseParts} />
                  </div>
                )}
                <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2} placeholder="Nota de cierre (opcional)"
                  className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                {task.prioridad === "alta" && (
                  <div className="mt-2">
                    <label className="text-xs font-semibold mb-1 block" style={{ color: C.red }}>Testigo que verificó cómo quedó (obligatorio por ser Prioridad Alta) *</label>
                    <input value={closeWitness} onChange={e => setCloseWitness(e.target.value)} placeholder="Nombre de quien verificó"
                      className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                    <div className="text-[11px] mt-1.5 mb-1" style={{ color: C.gray }}>Firma de conformidad del testigo (opcional, pero deja constancia más fuerte que solo el nombre):</div>
                    {closeWitnessSignature ? (
                      <div className="flex items-center gap-2">
                        <img loading="lazy" src={closeWitnessSignature} alt="Firma del testigo" className="rounded border" style={{ borderColor: C.line, maxWidth: 160, background: "#fff" }} />
                        <button onClick={() => setCloseWitnessSignature(null)} className="text-xs font-semibold" style={{ color: C.gray }}>Borrar y firmar de nuevo</button>
                      </div>
                    ) : (
                      <SignaturePad onChange={setCloseWitnessSignature} />
                    )}
                  </div>
                )}
                {closeMsg && <div className="text-xs mt-1.5" style={{ color: closeMsg.ok ? C.green : C.red }}>{closeMsg.text}</div>}
                <Button size="sm" disabled={closeSaving} onClick={doClose} className="w-full justify-center mt-2">{closeSaving ? "Guardando…" : "✓ Confirmar cierre"}</Button>
              </div>
            </>
          ) : (
            <div className="text-xs rounded-md p-2.5" style={{ background: C.bg, color: C.gray }}>Solo la persona asignada (o un administrador) puede cambiar el estado de esta tarea.</div>
          )}
        </div>
      </div>
    </>
  );
}