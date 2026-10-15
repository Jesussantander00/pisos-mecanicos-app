import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { C, aiNorm, buildHvacAiSummary, bumpAiUsage, normalizeTaskState, nowIso, requestAiAssistantStream, splitAiAction, useBackCloseModal } from "../shared/core";
import { Button } from "../shared/components";



export function AiAssistantWidget({ contextSummary, profiles, tasks, onCreateTask, onUpdateTask }) {
  const [open, setOpen] = useState(false);
  const [hasOpenedBefore, setHasOpenedBeforeState] = useState(() => {
    try { return localStorage.getItem("pm-local:ai-fab-opened") === "1"; } catch { return false; }
  });
  const setHasOpenedBefore = (v) => { setHasOpenedBeforeState(v); try { localStorage.setItem("pm-local:ai-fab-opened", v ? "1" : "0"); } catch { /* noop */ } };
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", text }]
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  useBackCloseModal(open, () => setOpen(false));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, sending]);

  const SUGGESTIONS = [
    "¿Cuántas habitaciones tienen temperatura alta?",
    "Dame un cuadro de quién hizo recorrido",
    "¿Qué equipos están atrasados en su mantenimiento?",
    "¿Qué tareas llevan días sin movimiento?",
    "¿Qué repuestos están bajos?",
    "Hazme un resumen del turno",
    "Crea una tarea para revisar la bomba del sótano",
  ];
  const send = async (override) => {
    const q = (typeof override === "string" ? override : input).trim();
    if (!q || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", text: q }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const history = messages.slice(-6).map(m => `${m.role === "user" ? "Persona" : "Asistente"}: ${m.text}`).join("\n");
      // Si la pregunta (o la conversación reciente) trata de temperatura/habitaciones, se trae la lectura
      // más fresca; en cualquier otro caso se usa lo que ya hay guardado en este dispositivo, sin esperar.
      const hvacRe = /temperatur|calor|calient|fr[ií]o|fri[ao]|termostato|telk|habitaci[oó]n|hab\.? ?\d|clima|aire|bater[ií]a|listado|lista|cuales|cuáles|cuantas|cuántas/i;
      const wantsHvac = hvacRe.test(q) || messages.slice(-4).some(m => /temperatur|calor|calient|termostato|telk|habitaci[oó]n/i.test(m.text || ""));
      const hvac = await buildHvacAiSummary(wantsHvac).catch(() => "");
      const fullContext = hvac ? `${contextSummary}\n\n${hvac}` : contextSummary;
      let started = false;
      const answer = await requestAiAssistantStream(q, fullContext, history, (text) => {
        const sp = splitAiAction(text);
        const msg = { role: "assistant", text: sp.text, action: sp.action, actionState: sp.action ? "pending" : undefined };
        if (!started) { started = true; setSending(false); setMessages(m => [...m, msg]); }
        else setMessages(m => { const c = m.slice(); c[c.length - 1] = msg; return c; });
      });
      if (!started) { const sp = splitAiAction(answer); setMessages(m => [...m, { role: "assistant", text: sp.text, action: sp.action, actionState: sp.action ? "pending" : undefined }]); }
      bumpAiUsage("assistantQueries");
    } catch (err) {
      console.error("AiAssistantWidget send error:", err);
      const isRawNetworkError = /load failed|failed to fetch|networkerror/i.test(err.message || "");
      const friendlyText = isRawNetworkError
        ? "Red inestable — intenta de nuevo en un momento."
        : `No me pude conectar (${err.message || "error de conexión"}). Revisa tu conexión e intenta de nuevo.`;
      setMessages(m => [...m, { role: "assistant", text: friendlyText }]);
    }
    setSending(false);
  };

  const findPerson = (name) => {
    const n = aiNorm(name);
    if (!n) return null;
    const list = Object.entries(profiles || {}).filter(([, p]) => p && p.approved !== false);
    const exact = list.filter(([, p]) => aiNorm(p.display_name) === n);
    const part = exact.length ? exact : list.filter(([, p]) => aiNorm(p.display_name).includes(n) || n.includes(aiNorm(p.display_name)));
    return part.length === 1 ? { id: part[0][0], name: part[0][1].display_name } : null;
  };
  const findTask = (title) => {
    const n = aiNorm(title);
    if (!n) return null;
    const open_ = (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada");
    const exact = open_.filter(t => aiNorm(t.titulo) === n);
    const part = exact.length ? exact : open_.filter(t => aiNorm(t.titulo).includes(n));
    return part.length === 1 ? part[0] : null;
  };
  const setActionState = (idx, st, note) => setMessages(m => m.map((x, i) => i === idx ? { ...x, actionState: st, actionNote: note } : x));
  const runAction = async (idx, a) => {
    try {
      setActionState(idx, "working");
      if (a.tipo === "crear_tarea") {
        const titulo = String(a.titulo || "").trim();
        if (!titulo) { setActionState(idx, "error", "Falta el título de la tarea."); return; }
        let asignadoA = "";
        if (a.asignadoA) {
          const who = findPerson(a.asignadoA);
          if (!who) { setActionState(idx, "error", `No encontré a una sola persona llamada "${a.asignadoA}". Dímelo con el nombre completo.`); return; }
          asignadoA = who.id;
        }
        const prioridad = ["alta", "media", "baja"].includes(a.prioridad) ? a.prioridad : "media";
        await onCreateTask({ titulo, descripcion: String(a.descripcion || ""), prioridad, asignadoA });
        setActionState(idx, "done", "✓ Tarea creada." + (asignadoA ? " Ya se le avisó a la persona asignada." : ""));
      } else if (a.tipo === "asignar_tarea") {
        const t = findTask(a.tareaTitulo);
        if (!t) { setActionState(idx, "error", `No encontré una sola tarea abierta que se llame "${a.tareaTitulo}". Dame el título exacto.`); return; }
        const who = findPerson(a.asignadoA);
        if (!who) { setActionState(idx, "error", `No encontré a una sola persona llamada "${a.asignadoA}".`); return; }
        await onUpdateTask(t.id, { asignadoA: who.id, assignedAt: nowIso() });
        setActionState(idx, "done", `✓ "${t.titulo}" asignada a ${who.name}.`);
      }
    } catch (err) {
      console.error("AiAssistant action error:", err);
      setActionState(idx, "error", "No se pudo hacer. Intenta de nuevo o hazlo desde Tareas.");
    }
  };

  return (
    <>
      {!open && !hasOpenedBefore && (
        <div className="fixed bottom-24 sm:bottom-8 right-[68px] rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-lg" style={{ background: C.steelDark, color: "#fff", zIndex: 45 }}>
          Asistente IA
        </div>
      )}
      <button onClick={() => { setOpen(v => !v); setHasOpenedBefore(true); }} title="Pregúntale a la IA sobre la operación del hotel"
        className="fixed bottom-20 sm:bottom-5 right-5 rounded-full shadow-lg flex items-center justify-center"
        style={{ width: 52, height: 52, background: C.steelDark, color: "#fff", zIndex: 45 }}>
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[44]" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setOpen(false)} />
          <div className="fixed bottom-36 sm:bottom-20 right-3 left-3 sm:left-auto sm:w-96 rounded-xl border shadow-2xl flex flex-col"
            style={{ height: "62vh", maxHeight: 520, background: C.panel, backgroundColor: C.panel, borderColor: C.line, zIndex: 45 }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: C.line }}>
            <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: C.ink }}>
              <Sparkles size={15} color={C.amber} /> Pregúntale a la app
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" title="Cerrar"><X size={16} color={C.gray} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-xs rounded-lg p-2.5" style={{ background: C.bg, color: C.inkSoft }}>
                Prueba con algo como: <i>"¿qué equipos llevan más de 60 días sin mantenimiento?"</i>, <i>"¿cuántas tareas abiertas hay?"</i>, o <i>"¿qué repuestos están bajos?"</i> — respondo con los datos reales de tu app ahora mismo.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-sm rounded-lg px-3 py-2 max-w-[85%]"
                style={{ background: m.role === "user" ? C.steelDark : C.bg, color: m.role === "user" ? "#fff" : C.ink, marginLeft: m.role === "user" ? "auto" : 0, whiteSpace: "pre-wrap", overflowX: "auto", wordBreak: "break-word" }}>
                {m.text}
                {m.action && !sending && (
                  <div className="mt-2 rounded-lg p-2.5 text-xs" style={{ background: C.panel, border: `1.5px solid ${C.amber}`, color: C.ink, whiteSpace: "normal" }}>
                    <div className="font-bold mb-1">{m.action.tipo === "crear_tarea" ? "Crear esta tarea" : "Asignar esta tarea"}</div>
                    {m.action.tipo === "crear_tarea" ? (
                      <div>
                        <div><b>{m.action.titulo}</b></div>
                        {m.action.descripcion ? <div style={{ color: C.inkSoft }}>{m.action.descripcion}</div> : null}
                        <div style={{ color: C.inkSoft }}>Prioridad: {m.action.prioridad || "media"} · Asignada a: {m.action.asignadoA || "nadie (sin asignar)"}</div>
                      </div>
                    ) : (
                      <div><b>{m.action.tareaTitulo}</b> → {m.action.asignadoA}</div>
                    )}
                    {(!m.actionState || m.actionState === "pending" || m.actionState === "error") && (
                      <div className="flex gap-1.5 mt-2">
                        <Button size="sm" onClick={() => runAction(i, m.action)}>Confirmar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setActionState(i, "cancelled", "Cancelado, no se hizo nada.")}>Cancelar</Button>
                      </div>
                    )}
                    {m.actionState === "working" && <div className="mt-1.5" style={{ color: C.gray }}>Guardando…</div>}
                    {m.actionNote && <div className="mt-1.5 font-semibold" style={{ color: m.actionState === "done" ? C.green : m.actionState === "error" ? C.red : C.gray }}>{m.actionNote}</div>}
                  </div>
                )}
              </div>
            ))}
            {sending && <div className="text-xs" style={{ color: C.gray }}>Pensando…</div>}
          </div>
          <div className="px-2 pt-2 flex gap-1.5 overflow-x-auto shrink-0" style={{ borderTop: `1px solid ${C.line}` }}>
            {SUGGESTIONS.map(sg => (
              <button key={sg} disabled={sending} onClick={() => send(sg)} className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0" style={{ background: C.bg, color: C.inkSoft, border: `1px solid ${C.line}`, opacity: sending ? 0.5 : 1 }}>{sg}</button>
            ))}
          </div>
          <div className="p-2 flex items-center gap-1.5 shrink-0" style={{ borderColor: C.line }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Escribe tu pregunta…"
              className="flex-1 text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minHeight: 40 }} />
            <Button size="sm" disabled={sending || !input.trim()} onClick={send}>Enviar</Button>
          </div>
          </div>
        </>
      )}
    </>
  );
}