import React, { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Download, X } from "lucide-react";
import { uploadPhoto } from "../lib/storage";
import { C, TASK_PRIORITIES, TASK_STATES, TASK_STATE_COLORS, badgeToneFor, cargoForUsername, cierreFrases, elapsed, fmtDT, fmtHours, hatRoleFor, hoursBetween, isTaskSnoozed, lecturaFueraDeRango, localDateIso, looksLikeGhostAccount, normalizeTaskState, nowIso, plantillaEquipo, requestDiagnostico, showToast, skillAreaOfTask, suggestChecklist, uid, useBackCloseModal, useTechSkills } from "../shared/core";
import { Avatar, Badge, Button, EquipoHistorySuggestions, HardHatAvatar, MaintenanceTextSuggestions, PartsPicker, PhotoPicker, TaskTimer, VoiceInputButton, VoiceTextarea } from "../shared/components";


/** Para quien revisa o administra: sugiere a quién asignar según habilidad y carga actual. */
function SuggestedTechs({ task, equipo, accounts, allTasks, onAssign }) {
  const [skills] = useTechSkills();
  if (!skills) return null;
  const area = skillAreaOfTask(task, equipo);
  const open = {};
  (allTasks || []).forEach(t => { if (t.asignadoA && normalizeTaskState(t.estado) !== "finalizada" && !isTaskSnoozed(t)) open[t.asignadoA] = (open[t.asignadoA] || 0) + 1; });
  const ranked = Object.keys(accounts || {}).filter(u => { const a = accounts[u]; return a && a.approved !== false && !a.is_viewer && !a.is_gerencia && !a.is_admin && !looksLikeGhostAccount(a.display_name); })
    .map(u => ({ u, lv: Number(skills?.[u]?.[area] || 0), n: open[u] || 0 }))
    .filter(x => x.lv > 0).sort((a, b) => b.lv - a.lv || a.n - b.n).slice(0, 3);
  if (!ranked.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: C.blueSoft }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.blue }}>Sugeridos para esta tarea ({area})</div>
      <div className="flex gap-1.5 flex-wrap">
        {ranked.map(x => (
          <button key={x.u} type="button" onClick={() => onAssign(x.u)} className="text-xs font-semibold rounded-full border px-3" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
            {accounts[x.u]?.display_name || x.u} · nivel {x.lv} · {x.n} abiertas
          </button>
        ))}
      </div>
    </div>
  );
}

/** Antes y después lado a lado (se muestra al cerrar la tarea, si hay fotos de las dos etapas). */
function BeforeAfterCompare({ before, after, onZoom, duration }) {
  const [i, setI] = useState(0);
  const b = before[Math.min(i, before.length - 1)], a = after[Math.min(i, after.length - 1)];
  const n = Math.max(before.length, after.length);
  const pane = (url, label, color) => (
    <button type="button" onClick={() => onZoom && onZoom(url)} aria-label={`Ver foto ${label.toLowerCase()} ampliada`} className="relative rounded-xl overflow-hidden border" style={{ borderColor: C.line, aspectRatio: "1 / 1" }}>
      <img loading="lazy" src={url} alt={`Foto ${label.toLowerCase()}`} className="w-full h-full object-cover" />
      <span className="absolute left-2 top-2 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: color }}>{label}</span>
    </button>
  );
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.bg }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: C.gray }}>Antes y después{duration ? ` · duró ${duration}` : ""}</div>
      <div className="grid grid-cols-2 gap-2">{pane(b, "Antes", C.red)}{pane(a, "Después", C.green)}</div>
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-2">
          {Array.from({ length: n }).map((_, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Ver par ${k + 1}`} className="rounded-full" style={{ width: 14, height: 14, background: k === i ? C.steelDark : C.line, minWidth: 14 }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Línea de avance de una tarea: Creada → Asignada → En curso → Cerrada. Muestra de un vistazo en qué paso va. */
function TaskProgressLine({ estado, assigned }) {
  const idx = estado === "finalizada" ? 4 : estado === "en-revision" ? 3 : (estado === "en-proceso" || estado === "pausada") ? 2 : assigned ? 1 : 0;
  const steps = ["Creada", "Asignada", estado === "pausada" ? "Pausada" : "En curso", "En revisión", "Cerrada"];
  return (
    <div className="flex items-start" role="img" aria-label={`Avance de la tarea: ${steps[idx]}`}>
      {steps.map((label, i) => {
        const done = i < idx, cur = i === idx;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className="flex-1 h-0.5 mt-[11px]" style={{ background: i <= idx ? C.green : C.line }} />}
            <div className="flex flex-col items-center gap-1" style={{ minWidth: 52 }}>
              <div className="rounded-full flex items-center justify-center" style={{ width: 22, height: 22, background: done || (cur && idx === 4) ? C.green : cur ? C.amber : C.panel, border: done || cur ? "none" : `2px solid ${C.line}`, boxShadow: cur && idx !== 4 ? `0 0 0 3px ${C.amberSoft}` : "none" }}>
                {(done || (cur && idx === 4)) && <CheckCircle2 size={14} color="#fff" />}
              </div>
              <span className="text-[11px]" style={{ color: cur ? C.ink : C.gray, fontWeight: cur ? 700 : 500 }}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function TaskDrawer({ task, accounts, employees, canAct, equipos, mttoLog, invItems, onLogMaintenance, onClose, onTransition, onCloseTask, onDownloadReport, downloadingReport, onZoom, onMarkViewed, hasPendingUpload, onUpdateTask, onAddComment, currentUsername, currentUser, allUsernames, mySignature, signerCargo, viewerLocked, onGoToProfile, canReview, canCloseDirect, onReviewTask, allTasks }) {
  useBackCloseModal(true, onClose); // este drawer, al estar montado, siempre está "abierto"
  const [closePhotos, setClosePhotos] = useState([]);
  const [closeBefore, setCloseBefore] = useState([]);
  const [photoCaps, setPhotoCaps] = useState(() => new Map());
  const setCap = (f, v) => setPhotoCaps(m => { const n = new Map(m); n.set(f, v); return n; });
  const [closeNote, setCloseNote] = useState("");
  const [tab, setTab] = useState(() => { const e0 = normalizeTaskState(task.estado); return (e0 === "finalizada" || e0 === "en-revision") ? "resumen" : (canAct || (canReview && task.esperaRepuesto)) ? "trabajo" : "resumen"; });
  const [reviewNote, setReviewNote] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMsg, setReviewMsg] = useState(null);
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
    const pasosSinMarcar = (task.checklist || []).filter(c => !c.done).length;
    if (pasosSinMarcar > 0 && !closeWarned) {
      setCloseWarned(true);
      setCloseMsg({ ok: false, text: `Quedan ${pasosSinMarcar} paso(s) del checklist sin marcar. Márcalos, o toca "Confirmar cierre" otra vez para cerrar igual.` });
      return;
    }
    setCloseSaving(true); setCloseMsg(null);
    try {
      const lecturaTxt = (task.lecturas || []).filter(l => String(l.value || "").trim()).map(l => `${l.name}: ${String(l.value).trim()}${l.unit ? " " + l.unit : ""}${lecturaFueraDeRango(l) ? " ⚠ fuera de rango" : ""}`).join("; ");
      const capsTxt = [...closeBefore.map((f, i) => [`Antes ${i + 1}`, photoCaps.get(f)]), ...closePhotos.map((f, i) => [`Después ${i + 1}`, photoCaps.get(f)])]
        .filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v.trim()}`).join("; ");
      const notaFinal = [closeNote.trim(), lecturaTxt ? `Lecturas: ${lecturaTxt}` : "", capsTxt ? `Fotos — ${capsTxt}` : ""].filter(Boolean).join(". ");
      await onCloseTask(task, [...closeBefore, ...closePhotos], notaFinal, closeParts, !!canCloseDirect, closeBefore.length);
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
  const eqDeTarea = (equipos || []).find(e => e.id === task.equipoId) || null;
  const plantillaEq = plantillaEquipo(eqDeTarea);
  const sugerido = estado !== "finalizada" && canAct && !(task.checklist || []).length ? (plantillaEq || suggestChecklist(task)) : null;
  const [diag, setDiag] = useState({ busy: false, text: "", err: "" });
  const runDiagnostico = async () => {
    setDiag({ busy: true, text: "", err: "" });
    try { const text = await requestDiagnostico(task, eqDeTarea, allTasks, mttoLog); setDiag({ busy: false, text: text || "No hubo respuesta.", err: "" }); }
    catch (e) { setDiag({ busy: false, text: "", err: e.message || "No se pudo consultar al asistente." }); }
  };
  const loadSuggestedChecklist = () => {
    if (!sugerido) return;
    const pasos = [...(sugerido.safety || []).map(t => "Seguridad: " + t), ...sugerido.steps];
    const patch = { checklist: pasos.map(text => ({ id: uid("chk"), text, done: false })) };
    if ((sugerido.readings || []).length && !(task.lecturas || []).length) patch.lecturas = sugerido.readings.map(r => ({ id: uid("lec"), name: r.name, unit: r.unit, ref: r.ref, min: r.min ?? null, max: r.max ?? null, value: "" }));
    onUpdateTask(task.id, patch);
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
            {task.asignadoA
              ? <HardHatAvatar role={hatRoleFor(accounts[task.asignadoA], cargoForUsername(task.asignadoA, accounts, employees))} size={40} label={`${assigneeName} con casco`} />
              : <Avatar name={assigneeName} size={32} />}
            <div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{assigneeName}</div>
              <Badge tone={badgeToneFor("prioridad", task.prioridad)}>{TASK_PRIORITIES.find(p => p.code === task.prioridad)?.label}</Badge>
            </div>
            <div className="ml-auto"><TaskTimer assignedAt={task.assignedAt} finishedAt={task.finishedAt} estado={estado} /></div>
          </div>

          <TaskProgressLine estado={estado} assigned={!!task.asignadoA} />

          <div className="flex border-b" role="tablist" style={{ borderColor: C.line }}>
            {[["resumen", "Resumen"], ["trabajo", "Trabajo"], ["historial", "Historial"]].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="flex-1 text-sm font-semibold"
                style={{ minHeight: 44, color: tab === k ? C.ink : C.gray, borderBottom: `3px solid ${tab === k ? C.amber : "transparent"}`, marginBottom: -1 }}>{label}</button>
            ))}
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Descripción</div>
            <div className="text-sm" style={{ color: C.ink }}>{task.descripcion || "Sin descripción adicional."}</div>
          </div>

          {tab === "trabajo" && canAct && estado !== "finalizada" && (
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

          {tab === "trabajo" && canAct && estado !== "finalizada" && estado !== "en-revision" && (
            <div>
              <button type="button" onClick={runDiagnostico} disabled={diag.busy} className="text-xs font-semibold rounded-lg px-3" style={{ minHeight: 40, background: C.blueSoft, color: C.blue }}>
                {diag.busy ? "Consultando…" : "🔍 Sugerir causas probables"}
              </button>
              {diag.text && (
                <div className="mt-1.5 rounded-lg px-3 py-2 text-xs whitespace-pre-line" style={{ background: C.blueSoft, color: C.ink }}>
                  {diag.text}
                  <div className="mt-1" style={{ color: C.gray }}>Es una sugerencia con base en el historial: confírmala en sitio. No cierra ni aprueba nada.</div>
                </div>
              )}
              {diag.err && <div className="mt-1 text-xs" style={{ color: C.red }}>{diag.err}</div>}
            </div>
          )}
          {tab === "resumen" && canReview && estado !== "finalizada" && estado !== "en-revision" && !task.asignadoA && (
            <SuggestedTechs task={task} equipo={eqDeTarea} accounts={accounts} allTasks={allTasks} onAssign={(u) => onUpdateTask(task.id, { asignadoA: u })} />
          )}
          {tab === "trabajo" && task.equipoId && (() => {
            const prev = (allTasks || []).filter(t => t.id !== task.id && t.equipoId === task.equipoId && normalizeTaskState(t.estado) === "finalizada" && t.notaCierre)
              .sort((a, b) => String(b.finishedAt || b.completedAt || "").localeCompare(String(a.finishedAt || a.completedAt || ""))).slice(0, 3);
            if (!prev.length) return null;
            return (
              <div className="rounded-lg px-3 py-2" style={{ background: C.blueSoft }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.blue }}>Lo que se hizo antes en este equipo</div>
                {prev.map(t => <div key={t.id} className="text-xs py-0.5" style={{ color: C.ink }}><span style={{ color: C.gray }}>{fmtDT(t.finishedAt || t.completedAt)} · </span>{String(t.notaCierre).slice(0, 140)}</div>)}
              </div>
            );
          })()}
          {tab === "trabajo" && (task.lecturas || []).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Lecturas a registrar</div>
              <div className="rounded-lg border p-2" style={{ borderColor: C.line }}>
                {(task.lecturas || []).map(l => (
                  <div key={l.id} className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: C.line }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: C.ink }}>{l.name}</div>
                      <div className="text-[11px]" style={{ color: lecturaFueraDeRango(l) ? C.red : C.gray }}>{lecturaFueraDeRango(l) ? "⚠ Fuera de rango — referencia: " : "Referencia: "}{l.ref}</div>
                    </div>
                    <input defaultValue={l.value || ""} disabled={!canAct || estado === "finalizada" || estado === "en-revision"} inputMode="decimal" aria-label={`${l.name} (${l.unit})`}
                      onBlur={e => { const v = e.target.value.trim(); if (v !== (l.value || "")) onUpdateTask(task.id, { lecturas: (task.lecturas || []).map(x => x.id === l.id ? { ...x, value: v } : x) }); }}
                      className="w-20 text-sm text-center border rounded-md px-1 py-1.5 outline-none" style={{ borderColor: lecturaFueraDeRango(l) ? C.red : C.line, background: C.panel, color: C.ink, minHeight: 40 }} />
                    <span className="text-[11px] w-8" style={{ color: C.gray }}>{l.unit}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] mt-1" style={{ color: C.gray }}>Referencias generales. Ajústalas con la ficha del equipo.</div>
            </div>
          )}
          {tab === "trabajo" && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Checklist {task.checklist?.length > 0 ? `(${task.checklist.filter(c => c.done).length}/${task.checklist.length})` : ""}</div>
            {sugerido && (
              <button type="button" onClick={loadSuggestedChecklist} className="text-xs font-semibold rounded-lg px-3 mb-1.5" style={{ minHeight: 36, background: C.amberSoft, color: C.amber }}>
                ✨ Cargar guía técnica: {sugerido.label}
              </button>
            )}
            {sugerido && (sugerido.tools?.length > 0 || sugerido.time) && (
              <div className="text-[11px] mb-1.5" style={{ color: C.inkSoft }}>
                {sugerido.tools?.length > 0 && <>Herramientas: {sugerido.tools.join(", ")}. </>}{sugerido.time && <>Tiempo típico: {sugerido.time}.</>}
              </div>
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
          )}

          {tab === "resumen" && (
          <>
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

          </>)}
          {tab === "historial" && (<>
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

          </>)}

          {tab === ((estado === "finalizada" || estado === "en-revision") ? "resumen" : "trabajo") && (
          <>
          {estado === "finalizada" ? (
            <>
              {task.fotosAntes?.length > 0 && task.fotosDespues?.length > 0 && (
                <BeforeAfterCompare before={task.fotosAntes} after={task.fotosDespues} onZoom={onZoom}
                  duration={(() => { const h = hoursBetween(task.startedAt || task.assignedAt || task.createdAt, task.finishedAt); return isFinite(h) && h >= 0 ? fmtHours(h) : ""; })()} />
              )}
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
                  {task.aprobadoPor && <div className="text-xs mt-1 font-medium" style={{ color: C.gray }}>✓ Revisó y cerró: {task.aprobadoPor.name}{task.aprobadoPor.at ? ` · ${fmtDT(task.aprobadoPor.at)}` : ""}</div>}
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
          ) : estado === "en-revision" ? (
            <>
              <div className="rounded-lg p-3" style={{ background: C.amberSoft }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7a4e00" }}>En revisión</div>
                <div className="text-sm mt-1" style={{ color: C.ink }}>
                  {accounts[task.completedBy]?.display_name || task.completedBy || "El técnico"} la completó{task.completedAt ? ` el ${fmtDT(task.completedAt)}` : ""}. Falta el visto bueno de un supervisor o inspector.
                </div>
              </div>
              {task.fotosAntes?.length > 0 && task.fotosDespues?.length > 0 && (
                <BeforeAfterCompare before={task.fotosAntes} after={task.fotosDespues} onZoom={onZoom} duration="" />
              )}
              {(!(task.fotosAntes?.length > 0) && task.fotosDespues?.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {task.fotosDespues.map((url, pi) => (
                    <button key={pi} onClick={() => onZoom(url)} aria-label="Ver foto ampliada"><img loading="lazy" src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.green }} /></button>
                  ))}
                </div>
              )}
              {task.notaCierre && <div className="text-sm rounded-md p-2.5 italic" style={{ background: C.bg, color: C.inkSoft }}>"{task.notaCierre}"</div>}
              {(task.repuestosPendientes || []).length > 0 && <div className="text-xs" style={{ color: C.inkSoft }}>Repuestos usados: {(task.repuestosPendientes || []).map(r => `${(invItems || []).find(i => i.id === r.itemId)?.name || "repuesto"} × ${r.cantidad}`).join(", ")}</div>}
              {(task.revisiones || []).length > 0 && (
                <div className="text-xs rounded-md p-2" style={{ background: C.redSoft, color: C.red }}>
                  Antes fue devuelta: "{task.revisiones[task.revisiones.length - 1].nota}" ({task.revisiones[task.revisiones.length - 1].byName})
                </div>
              )}
              {canReview && !viewerLocked ? (
                task.completedBy === currentUsername && !accounts[currentUsername]?.is_admin ? (
                  <div className="text-xs rounded-md p-2.5" style={{ background: C.bg, color: C.gray }}>Tú la completaste: otro supervisor, inspector o un administrador debe revisarla.</div>
                ) : (
                  <div className="rounded-md p-2.5" style={{ background: C.bg }}>
                    <VoiceTextarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Comentario (obligatorio si la devuelves)"
                      className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                    {reviewMsg && <div className="text-xs mt-1.5" style={{ color: C.red }}>{reviewMsg}</div>}
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" disabled={reviewBusy} onClick={async () => { setReviewBusy(true); setReviewMsg(null); try { await onReviewTask(task, "aprobar", reviewNote.trim()); onClose(); } catch { setReviewMsg("No se pudo cerrar la tarea — revisa tu conexión e intenta de nuevo."); } setReviewBusy(false); }} className="flex-1 justify-center">✓ Aprobar y cerrar</Button>
                      <Button size="sm" variant="ghost" disabled={reviewBusy} onClick={async () => { if (!reviewNote.trim()) { setReviewMsg("Escribe qué falta para poder devolverla."); return; } setReviewBusy(true); setReviewMsg(null); try { await onReviewTask(task, "devolver", reviewNote.trim()); onClose(); } catch { setReviewMsg("No se pudo devolver la tarea — revisa tu conexión e intenta de nuevo."); } setReviewBusy(false); }} className="flex-1 justify-center">↩ Devolver</Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-xs rounded-md p-2.5" style={{ background: C.bg, color: C.gray }}>Te avisamos cuando la cierren o si hay que corregir algo.</div>
              )}
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
                <div className="rounded-md p-2 text-xs" style={{ background: C.amberSoft, color: C.amber }}>
                  📦 Esperando repuesto: <b>{task.esperaRepuesto.texto}</b> (desde {fmtDT(task.esperaRepuesto.at)}).
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {[["por-aprobar", "Por aprobar"], ["pedido", "Pedido"], ["llego", "Llegó"]].map(([k, l]) => {
                      const cur = task.esperaRepuesto.estado || "por-aprobar";
                      return <span key={k} className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: cur === k ? C.amber : "transparent", color: cur === k ? "#fff" : C.amber, border: `1px solid ${C.amber}` }}>{l}</span>;
                    })}
                  </div>
                  {canReview && (task.esperaRepuesto.estado || "por-aprobar") !== "llego" && (
                    <button type="button" className="mt-1.5 text-xs font-bold underline" style={{ color: C.amber }}
                      onClick={() => { const cur = task.esperaRepuesto.estado || "por-aprobar"; const nx = cur === "por-aprobar" ? "pedido" : "llego"; onUpdateTask(task.id, { esperaRepuesto: { ...task.esperaRepuesto, estado: nx, [nx + "At"]: nowIso(), [nx + "Por"]: currentUsername } }); }}>
                      {(task.esperaRepuesto.estado || "por-aprobar") === "por-aprobar" ? "Aprobar y marcar como pedido" : "Marcar como llegó"}
                    </button>
                  )}
                  <div className="mt-1">{(task.esperaRepuesto.estado || "por-aprobar") === "llego" ? "Ya llegó: pulsa Reanudar para seguir con la tarea." : "Al reanudar se quita solo."}</div>
                </div>
              )}
              {showWaitForm && !task.esperaRepuesto && (
                <div className="flex items-center gap-1.5">
                  <input value={waitText} onChange={e => setWaitText(e.target.value)} placeholder="¿Qué repuesto falta?" className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <Button size="sm" disabled={!waitText.trim()} onClick={() => { const at = nowIso(); onUpdateTask(task.id, { estado: "pausada", esperaRepuesto: { texto: waitText.trim(), at, estado: "por-aprobar", by: currentUsername }, timeLog: [...(task.timeLog || []), { estado: "pausada", at, nota: `Esperando repuesto: ${waitText.trim()}` }] }); setShowWaitForm(false); setWaitText(""); }}>Guardar</Button>
                </div>
              )}
              <div className="rounded-md p-2.5" style={{ background: C.bg }}>
                <div className="text-xs font-semibold mb-1.5" style={{ color: C.ink }}>{canCloseDirect ? "Cerrar tarea" : "Completar tarea"} — sube al menos una foto de cómo quedó</div>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md p-2" style={{ background: C.panel }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.red }}>Antes</div>
                    {(task.fotosAntes || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-1.5">
                        {task.fotosAntes.map((u, k) => <img key={k} src={u} alt="Antes" loading="lazy" onClick={() => onZoom && onZoom(u)} className="rounded border object-cover" style={{ width: 52, height: 52, borderColor: C.line, cursor: "zoom-in" }} />)}
                      </div>
                    )}
                    <PhotoPicker photos={closeBefore} onChange={setCloseBefore} max={3} />
                    <div className="text-[10px]" style={{ color: C.gray }}>{(task.fotosAntes || []).length ? "Puedes agregar más fotos de cómo estaba." : "Agrega una foto de cómo estaba."}</div>
                  </div>
                  <div className="rounded-md p-2" style={{ background: C.panel }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.green }}>Después (obligatoria)</div>
                    <PhotoPicker photos={closePhotos} onChange={setClosePhotos} max={4} />
                    <div className="text-[10px]" style={{ color: C.gray }}>Cómo quedó el trabajo.</div>
                  </div>
                </div>
                {(closeBefore.length > 0 || closePhotos.length > 0) && (
                  <div className="mt-2 flex flex-col gap-1">
                    {[...closeBefore.map((f, i) => ({ f, k: `Antes ${i + 1}` })), ...closePhotos.map((f, i) => ({ f, k: `Después ${i + 1}` }))].map(({ f, k }) => (
                      <label key={k} className="flex items-center gap-2 text-[11px]" style={{ color: C.inkSoft }}>
                        <span className="w-16 shrink-0 font-semibold">{k}</span>
                        <input value={photoCaps.get(f) || ""} onChange={e => setCap(f, e.target.value)} placeholder="Comentario de esta foto (opcional)"
                          className="flex-1 min-w-0 text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minHeight: 36 }} />
                      </label>
                    ))}
                  </div>
                )}
                <div className="text-xs font-semibold mt-2 mb-1" style={{ color: C.ink }}>Redacción técnica — toca para agregar a la nota</div>
                <div className="flex gap-1.5 flex-col">
                  {cierreFrases(task, eqDeTarea?.nombre, task.checklist, plantillaEq).map(fr => (
                    <button key={fr.label} type="button" onClick={() => setCloseNote(prev => (prev && !prev.includes(fr.text) ? prev.replace(/\s+$/, "") + " " + fr.text : (prev || fr.text)))}
                      className="text-left text-xs rounded-lg border px-3 py-2" style={{ borderColor: C.line, background: C.panel, color: C.ink, minHeight: 40 }}>
                      <span className="font-semibold">{fr.label}</span>
                      <span className="block mt-0.5" style={{ color: C.gray, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{fr.text}</span>
                    </button>
                  ))}
                </div>
                {invItems && invItems.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Repuestos usados (opcional) — se descuentan solos del inventario</div>
                    <PartsPicker invItems={invItems} parts={closeParts} onChange={setCloseParts} />
                  </div>
                )}
                <VoiceTextarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={5} placeholder="Nota de cierre: describe lo que se hizo (puedes editar las frases de arriba)"
                  className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                {closeMsg && <div className="text-xs mt-1.5" style={{ color: closeMsg.ok ? C.green : C.red }}>{closeMsg.text}</div>}
                <Button size="sm" disabled={closeSaving} onClick={doClose} className="w-full justify-center mt-2">{closeSaving ? "Guardando…" : canCloseDirect ? "✓ Confirmar cierre" : "Completar y enviar a revisión"}</Button>
                {!canCloseDirect && <div className="text-[11px] mt-1.5" style={{ color: C.gray }}>No necesitas testigo: un supervisor o inspector revisa y da el cierre.</div>}
              </div>
            </>
          ) : (
            <>
              {canReview && task.esperaRepuesto && estado !== "finalizada" && (
                <div className="rounded-md p-2 text-xs mb-2" style={{ background: C.amberSoft, color: C.amber }}>
                  📦 Repuesto: <b>{task.esperaRepuesto.texto}</b> — {(task.esperaRepuesto.estado || "por-aprobar") === "llego" ? "llegó" : (task.esperaRepuesto.estado || "por-aprobar") === "pedido" ? "pedido" : "por aprobar"}
                  {(task.esperaRepuesto.estado || "por-aprobar") !== "llego" && (
                    <button type="button" className="ml-2 text-xs font-bold underline" style={{ color: C.amber }}
                      onClick={() => { const cur = task.esperaRepuesto.estado || "por-aprobar"; const nx = cur === "por-aprobar" ? "pedido" : "llego"; onUpdateTask(task.id, { esperaRepuesto: { ...task.esperaRepuesto, estado: nx, [nx + "At"]: nowIso(), [nx + "Por"]: currentUsername } }); }}>
                      {(task.esperaRepuesto.estado || "por-aprobar") === "por-aprobar" ? "Aprobar y marcar como pedido" : "Marcar como llegó"}
                    </button>
                  )}
                </div>
              )}
              <div className="text-xs rounded-md p-2.5" style={{ background: C.bg, color: C.gray }}>Solo la persona asignada (o un administrador) puede cambiar el estado de esta tarea.</div>
            </>
          )}
          </>)}
        </div>
      </div>
    </>
  );
}