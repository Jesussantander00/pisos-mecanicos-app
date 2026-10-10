import { useRef, useState } from "react";
import { CheckCircle2, MoreVertical } from "lucide-react";
import { C, KANBAN_COLUMNS, TASK_PRIORITY_COLORS, badgeToneFor, cargoForUsername, diasTareaAbierta, fmtDT, isTaskSnoozed, normalizeTaskState } from "../shared/core";
import { Avatar, Badge, TaskTimer } from "../shared/components";



export function TaskKanbanCard({ task, accounts, employees, equipos, canAct, onOpenDrawer, onMove, onZoom, selectMode, isSelected, onToggleSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swiping = useRef(false);
  const swipeDecided = useRef(null); // null = todavía no se sabe, "h" = horizontal (swipe de acción), "v" = vertical (scroll normal)
  const estado = normalizeTaskState(task.estado);
  const assigneeName = task.asignadoA ? (accounts[task.asignadoA]?.display_name || task.asignadoA) : null;
  const linkedEquipo = task.equipoId && equipos ? equipos.find(e => e.id === task.equipoId) : null;

  const SWIPE_THRESHOLD = 80;
  const canSwipe = canAct && estado !== "finalizada" && !selectMode;

  const onTouchStart = (e) => {
    if (!canSwipe) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
    swipeDecided.current = null;
  };
  const onTouchMove = (e) => {
    if (!canSwipe || touchStartX.current == null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Antes esto solo miraba el movimiento horizontal, así que un scroll vertical con el dedo
    // apenas inclinado ya desplazaba la tarjeta (y podía disparar "Completar"/"Pausar" sin
    // querer) — ahora, apenas hay suficiente movimiento para saber la intención, se decide UNA
    // vez si esto es un swipe de acción o un scroll normal, y si es scroll no se toca swipeX.
    if (swipeDecided.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeDecided.current = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
    }
    if (swipeDecided.current === "v") return; // deja que la página scrollee normal
    if (swipeDecided.current === "h") swiping.current = true;
    setSwipeX(Math.max(-120, Math.min(120, dx)));
  };
  const onTouchEnd = () => {
    if (!canSwipe) return;
    if (swipeDecided.current === "h") {
      if (swipeX > SWIPE_THRESHOLD) onMove(task, "finalizada"); // derecha → completar
      else if (swipeX < -SWIPE_THRESHOLD) onMove(task, estado === "pausada" ? "asignada" : "pausada"); // izquierda → pausar (o reanudar)
    }
    setSwipeX(0);
    touchStartX.current = null;
    touchStartY.current = null;
    swipeDecided.current = null;
  };

  return (
    <div className="relative mb-2 rounded-lg overflow-hidden">
      {/* Fondos que aparecen detrás al deslizar — dan la pista visual de qué va a pasar */}
      {canSwipe && swipeX !== 0 && (
        <div className="absolute inset-0 flex items-center rounded-lg" style={{ background: swipeX > 0 ? C.greenSoft : C.amberSoft, justifyContent: swipeX > 0 ? "flex-start" : "flex-end" }}>
          <span className="px-3 text-xs font-bold" style={{ color: swipeX > 0 ? C.green : "#7a5405" }}>
            {swipeX > 0 ? "✓ Completar" : (estado === "pausada" ? "↺ Reanudar" : "⏸ Pausar")}
          </span>
        </div>
      )}
      <div draggable={canAct && !selectMode} onDragStart={e => e.dataTransfer.setData("text/plain", task.id)}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        className="rounded-lg border p-2.5 cursor-pointer relative" style={{ borderColor: isSelected ? C.amber : C.line, borderWidth: isSelected ? 2 : 1, borderLeftWidth: 3, borderLeftColor: TASK_PRIORITY_COLORS[task.prioridad] || C.line, background: isSelected ? C.amberSoft : C.panel, minHeight: 48, transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 150ms" : "none" }}
        onClick={() => { if (swiping.current) return; if (selectMode) onToggleSelect(); else onOpenDrawer(task.id); }}>
        {selectMode && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
            style={{ borderColor: isSelected ? C.amber : C.gray, background: isSelected ? C.amber : C.panel }}>
            {isSelected && <CheckCircle2 size={12} color="#fff" />}
          </div>
        )}
        {canAct && estado !== "finalizada" && !selectMode && (
          <div className="absolute top-1.5 right-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Más opciones" title="Más opciones" className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: C.gray }}>
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border shadow-lg overflow-hidden" style={{ background: C.panel, borderColor: C.line }}>
                  {KANBAN_COLUMNS.filter(c => c.code !== estado).map(c => (
                    <button key={c.code} onClick={() => { onMove(task, c.code); setMenuOpen(false); }}
                      className="block w-full text-left text-xs px-2.5 hover:bg-black/5" style={{ color: C.ink, minHeight: 36 }}>
                      Mover a {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {task.origen && (
          <div className="mb-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{
              background: task.origen === "cronograma" ? C.blueSoft : task.origen === "hotsos" ? "#ede9fe" : C.bg,
              color: task.origen === "cronograma" ? C.blue : task.origen === "hotsos" ? "#6d28d9" : C.gray,
            }}>
              {task.origen === "cronograma" ? "📅 Cronograma" : task.origen === "hotsos" ? "🛎️ HotSOS" : "🛠️ Manual"}
            </span>
          </div>
        )}
        <div className={`flex items-center gap-1.5 mb-1 pr-6 ${selectMode ? "pl-6" : ""}`}>
          <div className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: C.ink }}>{task.titulo}</div>
        </div>
        {task.etiquetas && task.etiquetas.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            {task.etiquetas.map((tag, i) => (
              <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.amberSoft, color: C.amber }}>{tag}</span>
            ))}
          </div>
        )}
        {linkedEquipo?.sistema && (
          <div className="mb-1.5"><Badge tone={badgeToneFor("sistema", linkedEquipo.sistema)}>{linkedEquipo.sistema}</Badge></div>
        )}
        {(task.checklist?.length > 0 || task.comments?.length > 0 || (estado !== "finalizada" && diasTareaAbierta(task) >= 3) || isTaskSnoozed(task)) && (
          <div className="flex items-center gap-2 flex-wrap mb-1.5 text-[9px] font-semibold" style={{ color: C.gray }}>
            {task.checklist?.length > 0 && (
              <span className="inline-flex items-center gap-0.5" title="Pasos del checklist">
                <CheckCircle2 size={10} /> {task.checklist.filter(c => c.done).length}/{task.checklist.length}
              </span>
            )}
            {task.comments?.length > 0 && (
              <span className="inline-flex items-center gap-0.5" title="Comentarios">💬 {task.comments.length}</span>
            )}
            {estado !== "finalizada" && diasTareaAbierta(task) >= 3 && (
              <span className="inline-flex items-center gap-0.5" style={{ color: diasTareaAbierta(task) >= 7 ? C.red : C.amber }} title="Días abierta desde que se creó">
                ⏳ {diasTareaAbierta(task)}d
              </span>
            )}
            {isTaskSnoozed(task) && (
              <span className="inline-flex items-center gap-0.5" style={{ color: C.blue }} title={`Pospuesta hasta ${fmtDT(task.snoozedUntil)}`}>😴 hasta {new Date(task.snoozedUntil).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        )}
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            <TaskTimer assignedAt={task.assignedAt} finishedAt={task.finishedAt} estado={estado} />
            {task.fotosAntes && task.fotosAntes.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                {task.fotosAntes.slice(0, 3).map((url, i) => (
                  <button key={i} onClick={() => onZoom(url)} aria-label="Ver foto ampliada">
                    <img loading="lazy" src={url} alt="" className="w-7 h-7 object-cover rounded border" style={{ borderColor: C.line }} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Avatar del responsable — esquina inferior derecha, solo si hay alguien asignado */}
          {assigneeName && <Avatar name={assigneeName} cargo={cargoForUsername(task.asignadoA, accounts, employees)} size={22} />}
        </div>
      </div>
    </div>
  );
}