import { useEffect, useMemo, useRef, useState } from "react";
import { saveRecordWithPhotos } from "../lib/storage";
import * as XLSX from "xlsx";
import { AlertTriangle, Camera, ClipboardCheck, Download, PlusCircle, Trash2, Wrench, X } from "lucide-react";
import { C, KANBAN_COLUMNS, KANBAN_WIP_LIMIT, SHIFTS, TASK_PRIORITIES, TASK_RECURRENCES, TASK_STATES, TASK_STATE_COLORS, badgeToneFor, cargoForUsername, computeMaintenanceSuggestions, employeesOnShift, employeesWorkingNow, fmtDT, generateTaskReportPdf, hoursBetween, isTaskSnoozed, localDateIso, looksLikeGhostAccount, normalizeTaskState, nowIso, showToast, suggestsHighPriority } from "../shared/core";
import { Avatar, Badge, Button, Lightbox, MiniDonut, MiniGauge, NavBadge, PhotoPicker, Sparkline, TaskTimer, VoiceInputButton } from "../shared/components";
import { TaskKanbanCard } from "./TaskKanbanCard";
import { TaskDrawer } from "./TaskDrawer";
import { __pmState } from "../shared/core";



/** Modo "una mano" (item 6): muestra UNA orden a la vez, con botones grandes. Solo técnico. */
function FocusTaskCard({ tasks, onOpen, onStart }) {
  const [on, setOn] = useState(() => { try { return localStorage.getItem("pm-local:focus-mode") === "1"; } catch { return false; } });
  const [idx, setIdx] = useState(0);
  const toggle = () => setOn(v => { const n = !v; try { localStorage.setItem("pm-local:focus-mode", n ? "1" : "0"); } catch { /* noop */ } return n; });
  const prio = { alta: 0, media: 1, baja: 2 };
  const queue = useMemo(() => (tasks || [])
    .filter(t => normalizeTaskState(t.estado) !== "finalizada" && !isTaskSnoozed(t))
    .sort((a, b) => ((normalizeTaskState(b.estado) === "en-proceso") - (normalizeTaskState(a.estado) === "en-proceso")) || (prio[a.prioridad] - prio[b.prioridad]) || (new Date(a.createdAt) - new Date(b.createdAt))), [tasks]);
  if (!on) {
    return <button onClick={toggle} className="text-xs font-semibold rounded-lg px-3 mb-3" style={{ minHeight: 40, background: C.panel, border: `1px solid ${C.line}`, color: C.inkSoft }}>🖐️ Modo una mano</button>;
  }
  const t = queue[Math.min(idx, Math.max(0, queue.length - 1))];
  const est = t ? normalizeTaskState(t.estado) : null;
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: C.panel, border: `2px solid ${C.amber}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.amber }}>Modo una mano {queue.length > 0 ? `· ${Math.min(idx, queue.length - 1) + 1} de ${queue.length}` : ""}</span>
        <button onClick={toggle} className="text-xs font-semibold" style={{ color: C.gray, minHeight: 36 }}>Salir</button>
      </div>
      {!t ? <p className="text-base font-semibold py-6 text-center" style={{ color: C.green }}>No tienes órdenes pendientes 🎉</p> : (
        <>
          <div className="text-xs font-semibold" style={{ color: t.prioridad === "alta" ? C.red : C.inkSoft }}>Prioridad {TASK_PRIORITIES.find(x => x.code === t.prioridad)?.label || t.prioridad}{est === "en-proceso" ? " · En proceso" : ""}</div>
          <div className="text-xl font-bold my-1" style={{ color: C.ink }}>{t.titulo}</div>
          <div className="text-sm mb-4" style={{ color: C.inkSoft }}>{String(t.descripcion || "").split(" — ")[0]}</div>
          <div className="grid grid-cols-2 gap-2">
            {est === "asignada" || est === "pausada"
              ? <button onClick={() => onStart(t)} className="rounded-xl font-bold text-base" style={{ minHeight: 60, background: C.steelDark, color: "#fff" }}>▶ Iniciar</button>
              : <button onClick={() => onOpen(t.id)} className="rounded-xl font-bold text-base" style={{ minHeight: 60, background: C.green, color: "#fff" }}>✓ Finalizar</button>}
            <button onClick={() => setIdx(i => (i + 1) % Math.max(1, queue.length))} className="rounded-xl font-semibold text-base" style={{ minHeight: 60, background: C.bg, color: C.ink }}>Siguiente →</button>
          </div>
          <button onClick={() => onOpen(t.id)} className="w-full text-xs font-semibold mt-2" style={{ color: C.inkSoft, minHeight: 40 }}>Ver detalle</button>
        </>
      )}
    </div>
  );
}

export function TasksView({ tasks, accounts, employees, scheduleEntries, currentUser, currentUsername, isAdmin, equipos, mttoLog, mttoCronograma, invItems, onLogMaintenance, onCreateTask, onUpdateTask, onUpdateTasksBatch, onDeleteTask, onAddTaskComment, mySignature, signerCargo, pendingTaskCloseIds, viewerLocked, onGoToProfile, myWorkMode = false, onConsumeParts }) {
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  const [filterEstado, setFilterEstado] = useState("");
  const [filterOrigen, setFilterOrigen] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newTab, setNewTab] = useState("manual"); // "manual" | "sugerencias"
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "", fotosAntes: [], equipoId: null, etiquetas: [] });
  const [tagDraft, setTagDraft] = useState("");
  // Si la persona ya tocó el selector de prioridad a mano, no se lo volvemos a cambiar solos —
  // la sugerencia automática por palabras clave solo actúa mientras no se haya intervenido.
  const prioridadManualRef = useRef(false);
  const [prioritySuggested, setPrioritySuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [assignMode, setAssignMode] = useState("now"); // "now" (por defecto) | "manual"
  const [assignDate, setAssignDate] = useState(() => localDateIso(new Date()));
  const [assignShift, setAssignShift] = useState(SHIFTS[0]);
  const [showAllForAssign, setShowAllForAssign] = useState(false);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [repeatLastBusy, setRepeatLastBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pm-local:task-draft");
      if (!raw) return;
      sessionStorage.removeItem("pm-local:task-draft");
      const d = JSON.parse(raw);
      if (d && d.equipoId) { setForm(f => ({ ...f, equipoId: d.equipoId, titulo: d.titulo || f.titulo })); setShowNew(true); setNewTab("manual"); }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usernames = Object.keys(accounts || {});
  // Quién está trabajando en este preciso momento, según la hora real de entrada/salida de cada
  // quien en el Horario Mensual — esta es la asignación por defecto (Asignación Inteligente por
  // Turno). El picker manual de día/turno sigue disponible para reasignar a otra persona.
  const workingNowIds = useMemo(
    () => new Set(employeesWorkingNow(employees, scheduleEntries).map(e => e.id)),
    [employees, scheduleEntries]
  );
  const onShiftEmployeeIds = useMemo(
    () => new Set(employeesOnShift(employees, scheduleEntries, assignDate, assignShift).map(e => e.id)),
    [employees, scheduleEntries, assignDate, assignShift]
  );
  const openCountByUser = useMemo(() => {
    const m = {};
    (tasks || []).forEach(t => { if (t.asignadoA && normalizeTaskState(t.estado) !== "finalizada") m[t.asignadoA] = (m[t.asignadoA] || 0) + 1; });
    return m;
  }, [tasks]);
  const assignableUsernames = assignMode === "now"
    ? usernames.filter(u => workingNowIds.has(accounts[u]?.linked_employee_id)).sort((a, b) => (openCountByUser[a] || 0) - (openCountByUser[b] || 0))
    : showAllForAssign
      ? usernames
      : usernames.filter(u => onShiftEmployeeIds.has(accounts[u]?.linked_employee_id));

  // Preasigna automáticamente a la primera persona disponible (modo "ahora mismo"), sin pisar
  // una elección manual que ya haya hecho quien está creando la tarea.
  useEffect(() => {
    if (showNew && assignMode === "now" && !form.asignadoA && assignableUsernames.length > 0) {
      setForm(f => f.asignadoA ? f : { ...f, asignadoA: assignableUsernames[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNew, assignMode, assignableUsernames.join("|")]);

  // Sugerencias inteligentes del cronograma: equipos atrasados según su último mantenimiento real
  // vs. su frecuencia programada — de más a menos crítico.
  const suggestions = useMemo(
    () => (equipos ? computeMaintenanceSuggestions(equipos, mttoLog || [], mttoCronograma || []) : []),
    [equipos, mttoLog, mttoCronograma]
  );

  /** Convierte una sugerencia en el borrador de una tarea nueva: nombre del equipo, sistema y su
   * historial reciente quedan precargados; la persona solo revisa y confirma. */
  const applySuggestion = (s) => {
    const recientes = (mttoLog || []).filter(r => r.equipoId === s.equipo.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 3);
    const historialTxt = recientes.length
      ? "\n\nHistorial reciente:\n" + recientes.map(r => `· ${fmtDT(r.fecha)} (${r.tipo}): ${r.descripcion || "sin descripción"}`).join("\n")
      : "\n\n(Este equipo no tiene mantenimientos registrados todavía.)";
    setForm(f => ({
      ...f,
      titulo: `Mantenimiento preventivo — ${s.equipo.nombre}`,
      descripcion: `${s.nuncaIntervenido ? "Nunca se le ha registrado mantenimiento." : `Lleva ${s.diasSinIntervencion} días sin intervención`} (esperado cada ${s.frecuenciaEsperadaDias} días, según el cronograma).${historialTxt}`,
      prioridad: s.overdueDays > 60 ? "alta" : s.overdueDays > 20 ? "media" : "baja",
      equipoId: s.equipo.id,
    }));
    setNewTab("manual");
  };

  const [dupWarning, setDupWarning] = useState(null);
  const findDuplicateTask = (tituloRaw, equipoId) => {
    const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const titulo = norm(tituloRaw);
    if (!titulo) return null;
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    return (tasks || []).find(t => {
      const createdSameDay = new Date(t.createdAt) >= today0;
      if (!createdSameDay) return false;
      const sameEquipo = equipoId && t.equipoId === equipoId;
      const tTitulo = norm(t.titulo);
      const similarTitulo = tTitulo === titulo || (titulo.length > 6 && (tTitulo.includes(titulo) || titulo.includes(tTitulo)));
      return sameEquipo || similarTitulo;
    }) || null;
  };

  const doCreate = async (skipDupCheck = false) => {
    if (!form.titulo.trim()) { setSaveMsg({ ok: false, text: "Escribe qué hay que hacer antes de crear la tarea." }); return; }
    if (!skipDupCheck) {
      const dup = findDuplicateTask(form.titulo, form.equipoId);
      if (dup) { setDupWarning(dup); return; }
    }
    setDupWarning(null);
    setSaving(true); setSaveMsg(null);
    try {
      const { fotosAntes, ...rest } = form;
      const res = await saveRecordWithPhotos(
        "task",
        { ...rest, titulo: rest.titulo.trim() },
        fotosAntes,
        async (payload, urls) => { await onCreateTask({ ...payload, fotosAntes: urls }); }
      );
      // Se guarda como plantilla de "repetir última tarea" — así la próxima vez que se dañe lo
      // mismo (típico en fallas que se repiten) no hay que volver a escribir todo desde cero.
      try {
        localStorage.setItem(`pm-local:last-task:${currentUsername}`, JSON.stringify({
          titulo: rest.titulo.trim(), descripcion: rest.descripcion || "", prioridad: rest.prioridad,
          equipoId: rest.equipoId || null, etiquetas: rest.etiquetas || [],
        }));
      } catch { /* noop */ }
      setForm({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "", fotosAntes: [], equipoId: null, etiquetas: [] });
      setTagDraft("");
      prioridadManualRef.current = false; setPrioritySuggested(false);
      setShowNew(false); setNewTab("manual"); setDupWarning(null);
      if (res.queued) { setSaveMsg({ ok: true, text: "✓ Tarea guardada en este celular — no había señal. Se sube sola apenas vuelva." }); showToast("Tarea guardada en este celular — se sube sola apenas vuelva la señal.", true); }
      else showToast("✓ Tarea creada.", true);
    } catch (e) {
      const msg = e.message || "No se pudo crear la tarea — revisa tu conexión e intenta de nuevo.";
      setSaveMsg({ ok: false, text: msg });
      showToast(msg, false);
    }
    setSaving(false);
  };

  const repeatLastTask = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(`pm-local:last-task:${currentUsername}`) || "null");
      if (!saved) { showToast("Todavía no has creado ninguna tarea desde este celular para repetir.", false); return; }
      setForm(f => ({ ...f, ...saved, asignadoA: f.asignadoA, recurrencia: "", fotosAntes: [] }));
      setShowNew(true); setNewTab("manual");
      showToast("Se rellenó con tu última tarea — revisa y guarda.", true);
    } catch { /* noop */ }
  };

  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // ===== Filtros avanzados (además de los botones de estado) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterOperario, setFilterOperario] = useState("");
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [filterPrioridad, setFilterPrioridad] = useState("");
  const [filterEtiqueta, setFilterEtiqueta] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleSelected = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const bulkMove = async (code) => {
    setBulkBusy(true);
    try {
      const patches = {};
      selectedIds.forEach(id => {
        const t = tasks.find(x => x.id === id);
        if (t) patches[id] = { estado: code, finishedAt: code === "finalizada" ? nowIso() : t.finishedAt };
      });
      await onUpdateTasksBatch(patches);
      showToast(`✓ ${Object.keys(patches).length} tarea(s) actualizada(s).`, true);
      exitSelectMode();
    } catch (e) {
      showToast("✗ No se pudo actualizar las tareas seleccionadas — intenta de nuevo.", false);
    } finally {
      setBulkBusy(false);
    }
  };
  const bulkReassign = async (username) => {
    setBulkBusy(true);
    try {
      const patches = {};
      selectedIds.forEach(id => { patches[id] = { asignadoA: username, assignedAt: nowIso() }; });
      await onUpdateTasksBatch(patches);
      showToast(`✓ ${Object.keys(patches).length} tarea(s) reasignada(s).`, true);
      exitSelectMode();
    } catch (e) {
      showToast("✗ No se pudo reasignar las tareas seleccionadas — intenta de nuevo.", false);
    } finally {
      setBulkBusy(false);
    }
  };
  const bulkPriority = async (prioridad) => {
    setBulkBusy(true);
    try {
      const patches = {};
      selectedIds.forEach(id => { patches[id] = { prioridad }; });
      await onUpdateTasksBatch(patches);
      showToast(`✓ Prioridad actualizada en ${Object.keys(patches).length} tarea(s).`, true);
      exitSelectMode();
    } catch (e) {
      showToast("✗ No se pudo cambiar la prioridad — intenta de nuevo.", false);
    } finally {
      setBulkBusy(false);
    }
  };

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const allTags = useMemo(() => [...new Set(tasks.flatMap(t => t.etiquetas || []))].sort(), [tasks]);
  const hasAdvancedFilters = dateFrom || dateTo || filterTurno || filterPrioridad || filterEtiqueta;
  const clearAdvancedFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterOperario(""); setFilterPrioridad(""); setFilterOrigen(""); setFilterEtiqueta(""); };

  const [onlyMine, setOnlyMine] = useState(() => {
    if (myWorkMode) return true; // técnico: "Mi trabajo" siempre muestra solo lo suyo
    try { const saved = localStorage.getItem(`pm-local:tasks-only-mine:${currentUsername}`); return saved != null ? saved === "1" : !isAdmin; } catch { return !isAdmin; }
  });
  // Si se llegó aquí desde la tarjeta "Mis tareas vencidas" de Inicio, arranca ya con ese
  // filtro activo (y "Solo lo mío" forzado) — se consume una sola vez, no queda pegado si
  // luego se navega a Tareas por cualquier otro lado.
  const [onlyVencidas, setOnlyVencidas] = useState(() => {
    if (__pmState.__pmTasksEntryFilter === "vencidas") { __pmState.__pmTasksEntryFilter = null; return true; }
    return false;
  });
  const toggleOnlyMine = () => {
    setOnlyMine(v => {
      const next = !v;
      try { localStorage.setItem(`pm-local:tasks-only-mine:${currentUsername}`, next ? "1" : "0"); } catch { /* noop */ }
      if (next) setFilterOperario(""); // evita el conflicto: si se activa "Solo lo mío", el desplegable vuelve a "Todos"
      return next;
    });
  };

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const filtered = useMemo(() => tasks
    .filter(t => !onlyMine || t.asignadoA === currentUsername)
    .filter(t => !onlyVencidas || (normalizeTaskState(t.estado) !== "finalizada" && t.assignedAt && hoursBetween(t.assignedAt, nowIso()) > 24))
    .filter(t => showSnoozed || !isTaskSnoozed(t))
    .filter(t => !filterEstado || normalizeTaskState(t.estado) === filterEstado)
    .filter(t => {
      const d = new Date(t.createdAt);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(t.createdAt) !== filterTurno) return false;
      // "Solo lo mío" manda por encima del desplegable de Operario — si está activo, el
      // desplegable se ignora del todo (si no, entre los dos filtros se pisaban y la tarea
      // podía desaparecer aunque sí fuera del técnico).
      if (!onlyMine && filterOperario && t.asignadoA !== filterOperario) return false;
      if (filterOrigen && (t.origen || "manual") !== filterOrigen) return false;
      if (filterPrioridad && t.prioridad !== filterPrioridad) return false;
      if (filterEtiqueta && !(t.etiquetas || []).includes(filterEtiqueta)) return false;
      return true;
    })
    .sort((a, b) => (priorityOrder[a.prioridad] - priorityOrder[b.prioridad]) || (new Date(b.createdAt) - new Date(a.createdAt))),
    [tasks, onlyMine, onlyVencidas, showSnoozed, currentUsername, filterEstado, dateFrom, dateTo, filterTurno, filterOperario, filterOrigen, filterPrioridad, filterEtiqueta]
  );
  const snoozedCount = useMemo(() => tasks.filter(isTaskSnoozed).length, [tasks]);

  const counts = useMemo(
    () => TASK_STATES.reduce((acc, s) => { acc[s.code] = tasks.filter(t => normalizeTaskState(t.estado) === s.code).length; return acc; }, {}),
    [tasks]
  );

  // ===== KPIs compactos =====
  // "Tareas totales · últimos 7 días" y "Cumplimiento" deben mirar SOLO lo creado en los últimos
  // 7 días (así lo dice la etiqueta) — antes acá se colaba TODO el histórico (incluye años de
  // órdenes de HotSOS ya cerradas o abandonadas), lo que hacía que el % de cumplimiento saliera
  // artificialmente bajísimo y no reflejara el trabajo reciente de verdad.
  const last7Cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);
  const tasksLast7 = useMemo(
    () => tasks.filter(t => new Date(t.createdAt || t.assignedAt || 0) >= last7Cutoff),
    [tasks, last7Cutoff]
  );
  const totalTareas = tasksLast7.length;
  const cerradas = useMemo(() => tasks.filter(t => normalizeTaskState(t.estado) === "finalizada"), [tasks]); // histórico completo — usado para el tiempo promedio de resolución
  const cerradasLast7 = useMemo(() => tasksLast7.filter(t => normalizeTaskState(t.estado) === "finalizada"), [tasksLast7]);
  const tiempoCierrePromedio = useMemo(() => {
    const dur = cerradas.filter(t => t.assignedAt && t.finishedAt).map(t => hoursBetween(t.assignedAt, t.finishedAt));
    return dur.length ? dur.reduce((s, v) => s + v, 0) / dur.length : null;
  }, [cerradas]);
  const criticasVencidas = useMemo(() => tasks.filter(t => {
    const estado = normalizeTaskState(t.estado);
    if (estado === "finalizada" || t.prioridad !== "alta" || !t.assignedAt) return false;
    return hoursBetween(t.assignedAt, nowIso()) > 24;
  }).length, [tasks]);
  const cumplimientoPct = totalTareas > 0 ? Math.round((cerradasLast7.length / totalTareas) * 100) : 100;
  const misTareasAbiertas = useMemo(
    () => tasks.filter(t => t.asignadoA === currentUsername && normalizeTaskState(t.estado) !== "finalizada").length,
    [tasks, currentUsername]
  );

  // ===== Sparkline: tareas creadas por día, últimos 7 días =====
  const sparkCreadas = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map(d => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      return tasks.filter(t => { const c = new Date(t.createdAt || t.assignedAt || 0); return c >= d && c < next; }).length;
    });
  }, [tasks]);

  // ===== Leaderboard: técnicos y cuántas tareas cerraron HOY, con si están activos ahora mismo =====
  const leaderboard = useMemo(() => {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const byUser = {};
    tasks.forEach(t => {
      if (!t.asignadoA) return;
      if (!byUser[t.asignadoA]) byUser[t.asignadoA] = { username: t.asignadoA, cerradasHoy: 0, activo: false };
      if (normalizeTaskState(t.estado) === "finalizada" && t.finishedAt && new Date(t.finishedAt) >= today0) byUser[t.asignadoA].cerradasHoy++;
      if (normalizeTaskState(t.estado) === "en-proceso") byUser[t.asignadoA].activo = true;
    });
    return Object.values(byUser).sort((a, b) => b.cerradasHoy - a.cerradasHoy).slice(0, 6);
  }, [tasks]);

  // ===== Distribución de tareas ABIERTAS por sistema (dona) =====
  const tareasPorSistema = useMemo(() => {
    const map = {};
    tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada").forEach(t => {
      const eq = t.equipoId ? equipos.find(e => e.id === t.equipoId) : null;
      const s = eq?.sistema || "Sin equipo vinculado";
      map[s] = (map[s] || 0) + 1;
    });
    const palette = [C.blue, C.amber, C.green, "#8b5cf6", C.red, C.gray];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] })).sort((a, b) => b.value - a.value);
  }, [tasks, equipos]);

  /** Si alguien tiene notablemente más tareas abiertas que el promedio del equipo esta semana
   *  (al menos 1.5x el promedio, y al menos 2 de diferencia), lo señala — para repartir mejor,
   *  no como un reclamo, solo un aviso simple. */
  const workloadImbalance = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const openThisWeek = tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada" && t.asignadoA && new Date(t.createdAt) >= weekAgo);
    const byPerson = {};
    openThisWeek.forEach(t => { byPerson[t.asignadoA] = (byPerson[t.asignadoA] || 0) + 1; });
    const counts = Object.values(byPerson);
    if (counts.length < 2) return null;
    const avg = counts.reduce((s, v) => s + v, 0) / counts.length;
    const [maxUser, maxCount] = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0];
    if (avg === 0 || maxCount < avg * 1.5 || maxCount - avg < 2) return null;
    return { username: maxUser, count: maxCount, avg: Math.round(avg * 10) / 10 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  /** Cambia de estado (Iniciar / Pausar / Reanudar) y deja registro en la cronología de la tarea.
   * "Finalizar" NO pasa por aquí — ese vive en el panel de detalle porque exige foto de evidencia. */
  const transitionTask = (t, newEstado) => {
    const patch = { estado: newEstado, timeLog: [...(t.timeLog || []), { estado: newEstado, at: nowIso() }] };
    if (newEstado === "en-proceso" && !t.startedAt) patch.startedAt = nowIso();
    if (newEstado === "en-proceso" && t.esperaRepuesto) patch.esperaRepuesto = null;
    onUpdateTask(t.id, patch);
  };

  /** Deja registro de que esta persona abrió la tarea — una entrada por persona, se actualiza la
   *  fecha si ya la había visto antes en vez de duplicarla. */
  const markTaskViewed = (t) => {
    if (viewerLocked) return; // las cuentas de solo ver no escriben (ni siquiera el "visto por")
    const already = (t.vistoPor || []).find(v => v.username === currentUsername);
    const next = already
      ? t.vistoPor.map(v => v.username === currentUsername ? { ...v, at: nowIso() } : v)
      : [...(t.vistoPor || []), { username: currentUsername, displayName: accounts[currentUsername]?.display_name || currentUsername, at: nowIso() }];
    onUpdateTask(t.id, { vistoPor: next });
  };

  const doCloseTask = async (t, photos, note, witness, witnessSignature, parts = []) => {
    try {
      const repuestosUsados = (parts || []).filter(r => r.itemId && Number(r.cantidad) > 0).map(r => ({ itemId: r.itemId, cantidad: Number(r.cantidad) }));
      const res = await saveRecordWithPhotos(
        "task-close",
        { taskId: t.id, notaCierre: note, testigoCierre: witness || null, repuestos: repuestosUsados },
        photos,
        async (payload, urls) => {
          await onUpdateTask(payload.taskId, {
            estado: "finalizada", finishedAt: nowIso(), fotosDespues: urls, notaCierre: payload.notaCierre, esperaRepuesto: null,
            testigoCierre: payload.testigoCierre, testigoFirma: witnessSignature || null,
            timeLog: [...(t.timeLog || []), { estado: "finalizada", at: nowIso() }],
          });
          // Si la tarea está vinculada a un equipo, el cierre también queda como su mantenimiento
          // realizado — así el cronograma "reinicia el contador" solo, sin doble trabajo.
          if (t.equipoId && onLogMaintenance) {
            await onLogMaintenance(t.equipoId, {
              tipo: t.origen === "cronograma" ? "preventivo" : "correctivo",
              descripcion: `${t.titulo}${payload.notaCierre ? " — " + payload.notaCierre : ""}`,
              fotos: urls, repuestos: payload.repuestos || [], taskId: t.id,
            });
          } else if ((payload.repuestos || []).length > 0 && onConsumeParts) {
            await onConsumeParts(payload.repuestos, `Usado en la orden: ${t.titulo}`, t.id);
          }
        }
      );
      // El drawer se cierra apenas se llama a esto, así que un mensaje que solo viva dentro del
      // panel "Nueva tarea" nunca se llega a ver — por eso el aviso va por toast, que se ve sin
      // importar qué pantalla esté abierta.
      if (res.queued) showToast("✓ Cierre guardado en este celular — no había señal. Se sube solo apenas vuelva.", true);
      else showToast("✓ Tarea cerrada.", true);
    } catch (e) {
      showToast("✗ No se pudo cerrar la tarea — revisa tu conexión e intenta de nuevo.", false);
      throw e; // el drawer (TaskDrawer.doClose) también atrapa esto para no cerrarse solo y mostrar su propio mensaje
    }
  };

  const doDownloadReport = async (t) => {
    setDownloadingReportId(t.id);
    try {
      const doc = await generateTaskReportPdf(t, accounts[t.asignadoA]?.display_name || t.asignadoA || "Sin asignar", mySignature, signerCargo);
      doc.save(`reporte-novedad-${t.titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40)}.pdf`);
    } catch {
      showToast("✗ No se pudo generar el reporte — revisa la conexión (necesita descargar las fotos).", false);
    }
    setDownloadingReportId(null);
  };

  // Exportar a Excel las tareas CERRADAS dentro del rango de fechas que ya está filtrado arriba
  // (Desde / Hasta) — para armar informes de un período sin tener que copiar tarea por tarea.
  const [exportingRange, setExportingRange] = useState(false);
  const doExportClosedRange = () => {
    setExportingRange(true);
    try {
      const cerradasRango = filtered.filter(t => normalizeTaskState(t.estado) === "finalizada");
      if (cerradasRango.length === 0) {
        showToast("No hay tareas cerradas en el rango/filtros actuales.", false);
        setExportingRange(false);
        return;
      }
      const header = ["Título", "Descripción", "Prioridad", "Asignado a", "Creada", "Asignada", "Cerrada", "Horas de resolución", "Nota de cierre", "Verificado por"];
      const rows = cerradasRango.map(t => [
        t.titulo, t.descripcion || "", TASK_PRIORITIES.find(p => p.code === t.prioridad)?.label || t.prioridad,
        accounts[t.asignadoA]?.display_name || t.asignadoA || "Sin asignar",
        fmtDT(t.createdAt), t.assignedAt ? fmtDT(t.assignedAt) : "", t.finishedAt ? fmtDT(t.finishedAt) : "",
        (t.assignedAt && t.finishedAt) ? hoursBetween(t.assignedAt, t.finishedAt).toFixed(1) : "",
        t.notaCierre || "", t.testigoCierre || "",
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, "Tareas cerradas");
      const rangeLabel = `${dateFrom || "inicio"}_${dateTo || "hoy"}`.replace(/\//g, "-");
      XLSX.writeFile(wb, `tareas-cerradas-${rangeLabel}.xlsx`);
      showToast(`✓ ${cerradasRango.length} tarea(s) cerrada(s) exportada(s).`, true);
    } catch {
      showToast("✗ No se pudo generar el Excel.", false);
    }
    setExportingRange(false);
  };

  const drawerTask = drawerTaskId ? tasks.find(t => t.id === drawerTaskId) : null;
  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{myWorkMode ? "Mi trabajo" : "Tareas / Pendientes"}</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{myWorkMode ? "Lo que tienes asignado hoy y lo que está pendiente, listo para ejecutar y hacer seguimiento." : "El buzón de lo que va saliendo en el día a día — cualquiera puede agregar, y se le da prioridad y seguimiento."}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!myWorkMode && <button onClick={toggleOnlyMine} className="text-xs font-semibold px-3 rounded-md border transition" style={{ background: onlyMine ? C.steelDark : C.panel, color: onlyMine ? "#fff" : C.inkSoft, borderColor: onlyMine ? C.steelDark : C.line, minHeight: 36 }}>
            {onlyMine ? "✓ Solo lo mío" : "Solo lo mío"}
          </button>}
          <button onClick={() => setOnlyVencidas(v => !v)} title="Sin cerrar y abiertas hace más de 24 horas" className="text-xs font-semibold px-3 rounded-md border transition" style={{ background: onlyVencidas ? C.red : C.panel, color: onlyVencidas ? "#fff" : C.inkSoft, borderColor: onlyVencidas ? C.red : C.line, minHeight: 36 }}>
            {onlyVencidas ? "✓ Vencidas" : "Vencidas"}
          </button>
          {snoozedCount > 0 && (
            <button onClick={() => setShowSnoozed(v => !v)} title="Tareas pospuestas — escondidas de las listas hasta la fecha elegida" className="text-xs font-semibold px-3 rounded-md border transition" style={{ background: showSnoozed ? C.blue : C.panel, color: showSnoozed ? "#fff" : C.inkSoft, borderColor: showSnoozed ? C.blue : C.line, minHeight: 36 }}>
              😴 {showSnoozed ? "Ocultar pospuestas" : `Pospuestas (${snoozedCount})`}
            </button>
          )}
          <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
            <button onClick={() => setViewMode("kanban")} className="px-2.5 font-semibold" style={{ background: viewMode === "kanban" ? C.steelDark : C.panel, color: viewMode === "kanban" ? "#fff" : C.inkSoft, minHeight: 36 }}>Kanban</button>
            <button onClick={() => setViewMode("list")} className="px-2.5 font-semibold" style={{ background: viewMode === "list" ? C.steelDark : C.panel, color: viewMode === "list" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>Lista</button>
          </div>
          {!viewerLocked && !showNew && (
            <button onClick={repeatLastTask} title="Rellena el formulario con la última tarea que creaste, para algo que se repite" className="text-xs font-semibold px-3 rounded-md border transition" style={{ background: C.panel, color: C.inkSoft, borderColor: C.line, minHeight: 36 }}>
              ↺ Repetir última
            </button>
          )}
          {!viewerLocked && <Button icon={PlusCircle} onClick={() => setShowNew(v => !v)}>{showNew ? "Cancelar" : "Nueva tarea"}</Button>}
        </div>
      </div>

      {/* Analytics Ribbon — KPIs con tendencia a la izquierda, quién está resolviendo qué a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
        {/* Bloque izquierdo (40%) — KPIs compactos con sparkline de fondo */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border p-3 relative overflow-hidden col-span-2" style={{ borderColor: C.line, background: C.panel }}>
            <div className="absolute inset-x-0 bottom-0 h-10 opacity-40"><Sparkline points={sparkCreadas.map(v => ({ v }))} height={40} color={C.blue} /></div>
            <div className="relative">
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Tareas totales · últimos 7 días</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: C.ink }}>{totalTareas}</div>
            </div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: criticasVencidas ? C.red : C.line, background: criticasVencidas ? C.redSoft : C.panel }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: criticasVencidas ? C.red : C.gray }}>Críticas &gt;24h</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: criticasVencidas ? C.red : C.ink }}>{criticasVencidas}</div>
          </div>
          <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: C.line, background: C.panel }} title="De las tareas creadas en los últimos 7 días, cuántas ya se cerraron. No incluye el backlog viejo (HotSOS histórico, etc.) — ese se ve en 'Vencidas' y en el Kanban.">
            <MiniGauge value={cumplimientoPct} max={100} size={44} stroke={6} color={cumplimientoPct >= 80 ? C.green : C.amber} />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Cumplimiento (últimos 7 días)</div>
              <div className="text-lg font-bold tabular-nums" style={{ color: cumplimientoPct >= 80 ? C.green : C.amber }}>{totalTareas > 0 ? `${cumplimientoPct}%` : "—"}</div>
            </div>
          </div>
          <div className="rounded-xl border p-3 col-span-2" style={{ borderColor: C.line, background: C.panel }} title="Promedio de horas entre que se asigna una tarea y se cierra, sobre todas las tareas ya cerradas">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Tiempo promedio de resolución</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: C.ink }}>
              {tiempoCierrePromedio == null ? "—" : tiempoCierrePromedio < 24 ? `${tiempoCierrePromedio.toFixed(1)} h` : `${(tiempoCierrePromedio / 24).toFixed(1)} d`}
            </div>
          </div>
        </div>

        {/* Bloque derecho (60%) — quién está resolviendo (en vivo) + en qué está concentrado el trabajo */}
        <div className="lg:col-span-3 rounded-xl border p-3.5" style={{ borderColor: C.line, background: C.panel }}>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: C.gray }}>Técnicos hoy — tareas cerradas</div>
              {leaderboard.length === 0 ? (
                <p className="text-xs py-3" style={{ color: C.gray }}>Nadie tiene tareas asignadas todavía.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map(l => {
                    const maxCerradas = Math.max(1, ...leaderboard.map(x => x.cerradasHoy));
                    const displayName = accounts[l.username]?.display_name || l.username;
                    return (
                      <div key={l.username} className="relative rounded-md overflow-hidden" style={{ background: C.bg, height: 26 }}>
                        <div className="absolute inset-y-0 left-0" style={{ width: `${(l.cerradasHoy / maxCerradas) * 100}%`, background: C.blueSoft, transition: "width 600ms var(--ease-out)" }} />
                        <div className="relative flex items-center justify-between h-full px-2">
                          <span className="flex items-center gap-1.5 text-xs font-medium min-w-0" style={{ color: C.ink }}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${l.activo ? "pm-pulse" : ""}`} style={{ background: l.activo ? C.green : C.gray }} title={l.activo ? "Con una tarea en proceso ahora mismo" : "Sin actividad ahora mismo"} />
                            <span className="truncate">{displayName}</span>
                            {looksLikeGhostAccount(displayName) && <span title="Este nombre no parece ser el de una persona — revísalo en Panel de administrador." style={{ color: C.red }}>⚠️</span>}
                          </span>
                          <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: C.blue }}>{l.cerradasHoy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: C.gray }}>Trabajo abierto por sistema</div>
              {tareasPorSistema.length === 0 ? (
                <p className="text-xs py-3" style={{ color: C.gray }}>Sin tareas abiertas.</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <MiniDonut segments={tareasPorSistema} size={90} stroke={16} />
                  <div className="w-full space-y-1">
                    {tareasPorSistema.slice(0, 4).map(s => (
                      <div key={s.name} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="flex items-center gap-1 min-w-0" style={{ color: C.ink }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} /><span className="truncate">{s.name}</span>
                        </span>
                        <span className="font-bold shrink-0" style={{ color: C.gray }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {workloadImbalance && (
        <div className="rounded-lg p-2.5 mb-4 flex items-center gap-2 text-xs" style={{ background: C.amberSoft, color: C.amber }}>
          <AlertTriangle size={14} className="shrink-0" />
          <span><b>{accounts[workloadImbalance.username]?.display_name || workloadImbalance.username}</b> tiene {workloadImbalance.count} tareas abiertas esta semana — bien por encima del promedio del equipo ({workloadImbalance.avg}). Puede valer la pena repartir algo.</span>
        </div>
      )}

      {myWorkMode && <FocusTaskCard tasks={filtered} onOpen={setDrawerTaskId} onStart={(t) => transitionTask(t, "en-proceso")} />}

      {showNew && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          {equipos && (
            <div className="flex rounded-md border overflow-hidden text-xs mb-3 w-fit" style={{ borderColor: C.line }}>
              <button type="button" onClick={() => setNewTab("manual")} className="px-3 font-semibold" style={{ background: newTab === "manual" ? C.amber : C.panel, color: newTab === "manual" ? "#fff" : C.inkSoft, minHeight: 32 }}>
                Manual
              </button>
              <button type="button" onClick={() => setNewTab("sugerencias")} className="px-3 font-semibold flex items-center gap-1.5" style={{ background: newTab === "sugerencias" ? C.amber : C.panel, color: newTab === "sugerencias" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 32 }}>
                Sugerencias del cronograma
                {suggestions.length > 0 && <NavBadge count={suggestions.length} urgent={newTab !== "sugerencias"} />}
              </button>
            </div>
          )}

          {newTab === "sugerencias" ? (
            <div>
              <p className="text-xs mb-3" style={{ color: C.inkSoft }}>
                Equipos atrasados según cuánto tiempo llevan sin mantenimiento, comparado con lo que dice su cronograma — de más a menos crítico.
              </p>
              {suggestions.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Ningún equipo está atrasado según su cronograma ahora mismo. 🎉</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <div key={s.equipo.id} className="rounded-md p-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: s.overdueDays > 60 ? C.redSoft : C.amberSoft }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: C.ink }}>{s.equipo.nombre} <span style={{ color: C.gray, fontWeight: 400 }}>· {s.equipo.sistema}</span></div>
                        <div className="text-xs" style={{ color: s.overdueDays > 60 ? C.red : "#8a5a00" }}>
                          {s.nuncaIntervenido ? "Nunca se le ha registrado mantenimiento" : `${s.diasSinIntervencion} días sin intervención`} · {s.overdueDays} días atrasado (esperado cada {s.frecuenciaEsperadaDias} días)
                        </div>
                      </div>
                      <Button size="sm" onClick={() => applySuggestion(s)}>Convertir en Tarea Pendiente</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {form.equipoId ? (
                <div className="text-xs rounded-md px-2 py-1.5 mb-2 flex items-center justify-between" style={{ background: C.blueSoft, color: C.blue }}>
                  <span>🔗 Vinculada a {equipos.find(e => e.id === form.equipoId)?.nombre || "un equipo"}</span>
                  <button onClick={() => setForm(f => ({ ...f, equipoId: null }))} className="font-semibold">Quitar</button>
                </div>
              ) : (
                <div className="mb-2">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: C.inkSoft }}>¿Es sobre un equipo del catálogo? (opcional)</label>
                  <select value="" onChange={e => e.target.value && setForm(f => ({ ...f, equipoId: e.target.value }))}
                    className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                    <option value="">Sin vincular — es una tarea general (limpieza, ronda, etc.)</option>
                    {equipos.filter(e => e.active !== false).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => (
                      <option key={e.id} value={e.id}>{e.nombre} · {e.sistema}</option>
                    ))}
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: C.gray }}>Vincularla ayuda a llevar el historial real de ese equipo y a que las gráficas por sistema sean más útiles.</p>
                </div>
              )}
              <div className="flex items-center gap-1 mb-2">
                <input value={form.titulo} onChange={e => {
                  const titulo = e.target.value;
                  setForm(f => {
                    if (!prioridadManualRef.current && f.prioridad !== "alta" && suggestsHighPriority(titulo + " " + f.descripcion)) {
                      setPrioritySuggested(true);
                      return { ...f, titulo, prioridad: "alta" };
                    }
                    return { ...f, titulo };
                  });
                  setDupWarning(null);
                }} placeholder="¿Qué hay que hacer? *" aria-label="¿Qué hay que hacer? (obligatorio)"
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: !form.titulo.trim() && saveMsg?.ok === false ? C.red : C.line, background: C.panel, color: C.ink }} />
                <VoiceInputButton onResult={text => setForm(f => ({ ...f, titulo: (f.titulo ? f.titulo + " " : "") + text }))} />
              </div>
              <div className="flex items-start gap-1 mb-2">
                <textarea value={form.descripcion} onChange={e => {
                  const descripcion = e.target.value;
                  setForm(f => {
                    if (!prioridadManualRef.current && f.prioridad !== "alta" && suggestsHighPriority(f.titulo + " " + descripcion)) {
                      setPrioritySuggested(true);
                      return { ...f, descripcion, prioridad: "alta" };
                    }
                    return { ...f, descripcion };
                  });
                }} rows={2} placeholder="Detalles (opcional)"
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <VoiceInputButton onResult={text => setForm(f => ({ ...f, descripcion: (f.descripcion ? f.descripcion + " " : "") + text }))} />
              </div>
              {prioritySuggested && (
                <div className="rounded-md p-2 mb-2 text-xs flex items-center justify-between gap-2" style={{ background: C.redSoft, color: C.red }}>
                  <span>🔺 Se puso Prioridad Alta sola porque suena urgente — cámbiala abajo si no lo es.</span>
                  <button type="button" onClick={() => setPrioritySuggested(false)} className="font-semibold shrink-0">Ok</button>
                </div>
              )}
              <div className="rounded-md p-2 mb-2" style={{ background: C.bg }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="text-xs font-medium" style={{ color: C.inkSoft }}>¿A quién se la vas a asignar?</div>
              <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
                <button type="button" onClick={() => setAssignMode("now")}
                  className="px-2.5 py-1 font-semibold"
                  style={{ background: assignMode === "now" ? C.amber : C.panel, color: assignMode === "now" ? "#fff" : C.inkSoft }}>
                  Quien está de turno ahora
                </button>
                <button type="button" onClick={() => setAssignMode("manual")}
                  className="px-2.5 py-1 font-semibold" style={{ background: assignMode === "manual" ? C.amber : C.panel, color: assignMode === "manual" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}` }}>
                  Elegir otro día/turno
                </button>
              </div>
            </div>

            {assignMode === "now" ? (
              assignableUsernames.length === 0 ? (
                <div className="text-xs" style={{ color: C.red }}>
                  Nadie aparece trabajando ahora mismo según el Horario Mensual (o nadie ha vinculado su cuenta con su nombre del horario en Mi Perfil).
                  Usa "Elegir otro día/turno" para asignarla igual.
                </div>
              ) : (
                <div className="text-xs" style={{ color: C.inkSoft }}>
                  Se preasignó a <b style={{ color: C.ink }}>{accounts[assignableUsernames[0]]?.display_name || assignableUsernames[0]}</b>, quien está de turno ahora mismo
                  {assignableUsernames.length > 1 ? ` (también disponible: ${assignableUsernames.slice(1).map(u => accounts[u]?.display_name || u).join(", ")})` : ""}.
                  Puedes cambiarlo abajo si hace falta.
                </div>
              )
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <select value={assignShift} onChange={e => setAssignShift(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <label className="text-xs flex items-center gap-1.5 cursor-pointer select-none" style={{ color: C.inkSoft }}>
                    <input type="checkbox" checked={showAllForAssign} onChange={e => setShowAllForAssign(e.target.checked)} />
                    Ver a todos (no solo los de turno)
                  </label>
                </div>
                {!showAllForAssign && assignableUsernames.length === 0 && (
                  <div className="text-xs mb-2" style={{ color: C.red }}>
                    Nadie aparece de turno ese día/hora según el Horario Mensual (o nadie ha vinculado su cuenta con su nombre del horario en Mi Perfil). Marca "Ver a todos" si hace falta.
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={form.prioridad} onChange={e => { prioridadManualRef.current = true; setPrioritySuggested(false); setForm(f => ({ ...f, prioridad: e.target.value })); }}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>Prioridad {p.label}</option>)}
            </select>
            <select value={form.asignadoA} onChange={e => setForm(f => ({ ...f, asignadoA: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Sin asignar</option>
              {assignableUsernames.map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
            </select>
            <select value={form.recurrencia} onChange={e => setForm(f => ({ ...f, recurrencia: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {TASK_RECURRENCES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <div className="mb-2">
            <div className="text-xs font-medium mb-1.5" style={{ color: C.inkSoft }}>
              Fotos de la novedad (opcional) — así la persona asignada ve exactamente qué pasó y dónde, antes de ir a revisar.
            </div>
            <PhotoPicker photos={form.fotosAntes} onChange={fotosAntes => setForm(f => ({ ...f, fotosAntes }))} max={4} />
          </div>
          <div className="mb-2">
            <div className="text-xs font-medium mb-1.5" style={{ color: C.inkSoft }}>Etiquetas (opcional) — para agrupar o buscar tareas parecidas, ej: "aire acondicionado", "urgente huésped".</div>
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              {(form.etiquetas || []).map((tag, i) => (
                <span key={i} className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1" style={{ background: C.amberSoft, color: C.amber }}>
                  {tag}
                  <button type="button" onClick={() => setForm(f => ({ ...f, etiquetas: f.etiquetas.filter((_, j) => j !== i) }))} aria-label={`Quitar etiqueta ${tag}`} title="Quitar etiqueta"><X size={11} /></button>
                </span>
              ))}
            </div>
            <input value={tagDraft} onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) {
                  e.preventDefault();
                  const tag = tagDraft.trim().toLowerCase();
                  setForm(f => f.etiquetas.includes(tag) ? f : { ...f, etiquetas: [...f.etiquetas, tag] });
                  setTagDraft("");
                }
              }}
              placeholder="Escribe una etiqueta y presiona Enter…"
              className="text-sm border rounded-md px-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          {dupWarning && (
            <div className="rounded-md p-2.5 mb-2" style={{ background: C.amberSoft }}>
              <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.amber }}>
                <AlertTriangle size={13} /> Se parece a una tarea de hoy: "{dupWarning.titulo}"
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Button size="sm" variant="ghost" onClick={() => doCreate(true)}>Crear de todos modos</Button>
                <button onClick={() => setDupWarning(null)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
              </div>
            </div>
          )}
          {saveMsg && <div className="text-xs mb-2" style={{ color: saveMsg.ok ? C.green : C.red }}>{saveMsg.text}</div>}
          <Button size="sm" disabled={saving} onClick={() => doCreate(false)}>{saving ? "Guardando…" : "Crear tarea"}</Button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <button onClick={() => setFilterEstado("")} className="text-xs font-medium px-2.5 py-1.5 rounded-full"
          style={{ background: !filterEstado ? C.steelDark : C.panel, color: !filterEstado ? "#fff" : C.inkSoft }}>
          Todas ({tasks.length})
        </button>
        {TASK_STATES.map(s => (
          <button key={s.code} onClick={() => setFilterEstado(s.code)} className="text-xs font-medium px-2.5 py-1.5 rounded-full"
            style={{ background: filterEstado === s.code ? C.steelDark : C.panel, color: filterEstado === s.code ? "#fff" : C.inkSoft }}>
            {s.label} ({counts[s.code] || 0})
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Operario</div>
          <select value={filterOperario} onChange={e => setFilterOperario(e.target.value)} aria-label="Filtrar por operario" className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {Object.keys(accounts || {}).map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
          </select>
        </div>
        {(showAdvFilters || hasAdvancedFilters) && (
          <>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Prioridad</div>
              <select value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)} aria-label="Filtrar por prioridad" className={filterSelectClass} style={filterSelectStyle}>
                <option value="">Todas</option>
                {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="Filtrar desde esta fecha" className={filterSelectClass} style={filterSelectStyle} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="Filtrar hasta esta fecha" className={filterSelectClass} style={filterSelectStyle} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
              <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} aria-label="Filtrar por turno" className={filterSelectClass} style={filterSelectStyle}>
                <option value="">Todos</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>
            </div>
            {allTags.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Etiqueta</div>
                <select value={filterEtiqueta} onChange={e => setFilterEtiqueta(e.target.value)} aria-label="Filtrar por etiqueta" className={filterSelectClass} style={filterSelectStyle}>
                  <option value="">Todas</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-1">
          {[
            { v: "cronograma", l: "📅 Cronograma" },
            { v: "hotsos", l: "🛎️ HotSOS" },
            { v: "manual", l: "🛠️ Manual" },
          ].map(o => (
            <button key={o.v} onClick={() => setFilterOrigen(f => f === o.v ? "" : o.v)}
              className="text-[11px] font-semibold px-2 py-1.5 rounded-full border" style={{
                background: filterOrigen === o.v ? C.steelDark : C.panel,
                color: filterOrigen === o.v ? "#fff" : C.inkSoft,
                borderColor: filterOrigen === o.v ? C.steelDark : C.line,
              }}>
              {o.l}
            </button>
          ))}
        </div>
        {!showAdvFilters && !hasAdvancedFilters && (
          <button onClick={() => setShowAdvFilters(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ color: C.amber }}>
            Filtros avanzados
          </button>
        )}
        {hasAdvancedFilters && (
          <button onClick={clearAdvancedFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
        <button onClick={doExportClosedRange} disabled={exportingRange} title="Exporta a Excel las tareas cerradas dentro del rango de fechas y filtros de arriba" className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.blue }}>
          <Download size={13} /> {exportingRange ? "Generando…" : "Exportar cerradas"}
        </button>
        {!viewerLocked && (
          <button onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md ml-auto flex items-center gap-1" style={{ color: selectMode ? C.red : C.amber }}>
            {selectMode ? <><X size={13} /> Cancelar selección</> : <><ClipboardCheck size={13} /> Seleccionar varias</>}
          </button>
        )}
      </div>

      {viewMode === "kanban" && isAdmin && !viewerLocked && (
        <WorkloadStrip tasks={tasks} accounts={accounts} onAssign={(id, u, name) => {
          const t = (tasks || []).find(x => x.id === id);
          if (!t || t.asignadoA === u) return;
          onUpdateTask(id, { asignadoA: u });
          showToast(`"${t.titulo}" pasó a ${name}.`, true);
        }} />
      )}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => normalizeTaskState(t.estado) === col.code);
            const overWip = col.code === "asignada" && colTasks.length > KANBAN_WIP_LIMIT;
            return (
              <div key={col.code} className="rounded-xl border p-2.5" style={{ borderColor: overWip ? C.amber : C.line, background: overWip ? C.amberSoft : C.bg, minHeight: 140 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const taskId = e.dataTransfer.getData("text/plain");
                  const task = tasks.find(t => t.id === taskId);
                  if (!task || normalizeTaskState(task.estado) === col.code) return;
                  if (!(isAdmin || task.asignadoA === currentUsername)) { showToast("Solo puedes mover tus propias tareas.", false); return; }
                  if (col.code === "finalizada") setDrawerTaskId(task.id);
                  else transitionTask(task, col.code);
                }}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: overWip ? "#7a5405" : C.inkSoft }}>
                    {col.label} {overWip && <AlertTriangle size={12} />}
                  </div>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: overWip ? "#fff" : C.panel, color: overWip ? "#7a5405" : C.gray }}>{colTasks.length}</span>
                </div>
                {overWip && (
                  <div className="text-[10px] mb-2 px-0.5" style={{ color: C.amber }}>Muchas tareas pendientes sin empezar — puede valer la pena repartir antes de seguir creando más.</div>
                )}
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-5 gap-1.5" style={{ color: C.gray }}>
                    {col.code === "finalizada" ? <ClipboardCheck size={22} color={C.gray} opacity={0.5} /> : <Wrench size={22} color={C.gray} opacity={0.5} />}
                    <span className="text-[11px]">
                      {col.code === "asignada" ? "Nada pendiente por empezar" :
                       col.code === "en-proceso" ? "¡Todo al día en tu turno!" :
                       col.code === "pausada" ? "Nada esperando repuesto" :
                       "Todavía no se ha cerrado nada"}
                    </span>
                  </div>
                ) : colTasks.map(t => (
                  <TaskKanbanCard key={t.id} task={t} accounts={accounts} employees={employees} equipos={equipos} canAct={!viewerLocked && (isAdmin || t.asignadoA === currentUsername)}
                    onOpenDrawer={setDrawerTaskId}
                    onMove={(task, code) => code === "finalizada" ? setDrawerTaskId(task.id) : transitionTask(task, code)}
                    onZoom={setLightboxUrl}
                    selectMode={selectMode} isSelected={selectedIds.has(t.id)} onToggleSelect={() => toggleSelected(t.id)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && (filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Nada por aquí — todo al día.</p>
      ) : filtered.map((t, i) => {
        const estado = normalizeTaskState(t.estado);
        const stateColors = TASK_STATE_COLORS[estado];
        const canDelete = isAdmin || t.createdBy === currentUser;
        const canAct = !viewerLocked && (isAdmin || t.asignadoA === currentUsername);
        const assigneeName = t.asignadoA ? (accounts[t.asignadoA]?.display_name || t.asignadoA) : null;
        return (
          <div key={t.id} className="pm-stagger-in rounded-lg border p-3 mb-2 cursor-pointer transition hover:shadow-sm"
            style={{ borderColor: C.line, background: C.panel, color: C.ink, animationDelay: `${Math.min(i, 12) * 35}ms` }}
            onClick={() => setDrawerTaskId(t.id)}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
                <Avatar name={assigneeName} cargo={cargoForUsername(t.asignadoA, accounts, employees)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Badge tone={badgeToneFor("prioridad", t.prioridad)}>{TASK_PRIORITIES.find(p => p.code === t.prioridad)?.label}</Badge>
                    <div className="text-sm font-semibold" style={{ color: C.ink }}>{t.titulo}</div>
                    <Badge tone={badgeToneFor("taskEstado", t.estado)}>{TASK_STATES.find(s => s.code === estado)?.label || estado}</Badge>
                    {t.esperaRepuesto && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.amberSoft, color: C.amber }} title={`Falta: ${t.esperaRepuesto.texto}`}>📦 Esperando repuesto</span>}
                    {t.reincidencia && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.redSoft, color: C.red }} title={`Mismo problema cerrado hace ${t.reincidencia.dias} día(s): ${t.reincidencia.titulo}`}>↻ Reincidencia</span>}
                    {estado === "pausada" && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: C.amberSoft, color: C.amber }}>
                        ⏳ En espera
                      </span>
                    )}
                  </div>
                  {t.descripcion && <div className="text-xs mt-0.5 truncate" style={{ color: C.inkSoft }}>{t.descripcion}</div>}
                  {t.etiquetas && t.etiquetas.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      {t.etiquetas.map((tag, ti) => (
                        <button key={ti} onClick={e => { e.stopPropagation(); setFilterEtiqueta(tag); }}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.amberSoft, color: C.amber }}>{tag}</button>
                      ))}
                    </div>
                  )}
                  <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: C.gray }}>
                    <span>{assigneeName || "Sin asignar"} · {fmtDT(t.createdAt)}</span>
                    {t.recurrencia && <span>🔁 {t.recurrencia === "semanal" ? "Semanal" : "Mensual"}</span>}
                    <TaskTimer assignedAt={t.assignedAt} finishedAt={t.finishedAt} estado={estado} />
                    {pendingTaskCloseIds && pendingTaskCloseIds.has(t.id) && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: C.amberSoft, color: C.amber }} title="Este cierre tiene fotos esperando a subirse cuando haya señal">
                        <Camera size={11} /> Fotos pendientes de subir
                      </span>
                    )}
                  </div>
                  {t.fotosAntes && t.fotosAntes.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5" onClick={e => e.stopPropagation()}>
                      {t.fotosAntes.map((url, pi) => (
                        <button key={pi} onClick={() => setLightboxUrl(url)}>
                          <img loading="lazy" src={url} alt="" className="w-10 h-10 object-cover rounded-md border" style={{ borderColor: C.line }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                {canAct && estado === "asignada" && (
                  <Button size="sm" onClick={() => transitionTask(t, "en-proceso")}>▶ Iniciar</Button>
                )}
                {canAct && estado === "en-proceso" && (
                  <Button size="sm" variant="ghost" onClick={() => transitionTask(t, "pausada")}>⏸ Pausar</Button>
                )}
                {canAct && estado === "pausada" && (
                  <Button size="sm" onClick={() => transitionTask(t, "en-proceso")}>▶ Reanudar</Button>
                )}
                {estado === "finalizada" && (
                  <Button size="sm" variant="ghost" icon={Download} disabled={downloadingReportId === t.id} onClick={() => doDownloadReport(t)}>
                    {downloadingReportId === t.id ? "Generando…" : "Reporte"}
                  </Button>
                )}
                {canDelete && (
                  confirmDeleteTaskId === t.id ? (
                    <div className="flex items-center gap-1 rounded-md px-1.5 py-1" style={{ background: C.redSoft }}>
                      <span className="text-[11px]" style={{ color: C.red }}>¿Borrar?</span>
                      <button onClick={() => { onDeleteTask(t.id).catch(() => showToast("✗ No se pudo eliminar la tarea.", false)); setConfirmDeleteTaskId(null); }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: C.red, color: "#fff" }}>
                        Sí, borrar
                      </button>
                      <button onClick={() => setConfirmDeleteTaskId(null)} className="text-[10px] font-semibold px-1" style={{ color: C.gray }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteTaskId(t.id)} aria-label="Eliminar tarea" className="flex items-center justify-center" style={{ minWidth: 40, minHeight: 40 }}><Trash2 size={14} color={C.gray} /></button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      }))}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-auto z-40 rounded-xl border shadow-2xl p-3 flex items-center gap-2 flex-wrap"
          style={{ background: C.panel, borderColor: C.amber }}>
          <span className="text-sm font-bold shrink-0" style={{ color: C.ink }}>{selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}</span>
          {isAdmin && (
            <select disabled={bulkBusy} onChange={e => { if (e.target.value) bulkReassign(e.target.value); }} value=""
              className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }}>
              <option value="">Reasignar a…</option>
              {Object.keys(accounts || {}).map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
            </select>
          )}
          <select disabled={bulkBusy} onChange={e => { if (e.target.value) bulkPriority(e.target.value); }} value=""
            className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }}>
            <option value="">Prioridad…</option>
            {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
          <select disabled={bulkBusy} onChange={e => { if (e.target.value) bulkMove(e.target.value); }} value=""
            className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }}>
            <option value="">Mover a…</option>
            {KANBAN_COLUMNS.filter(c => c.code !== "finalizada").map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <div className="text-[10px] w-full sm:w-auto" style={{ color: C.gray }}>Para marcar como Hecho hace falta abrir cada una — se necesita foto de evidencia.</div>
          <button onClick={exitSelectMode} className="text-xs font-semibold px-2 py-1.5" style={{ color: C.gray }}>Cancelar</button>
        </div>
      )}

      {drawerTask && (
        <TaskDrawer task={drawerTask} accounts={accounts} employees={employees} canAct={!viewerLocked && (isAdmin || drawerTask.asignadoA === currentUsername)}
          equipos={equipos} mttoLog={mttoLog} invItems={invItems} onLogMaintenance={onLogMaintenance}
          onClose={() => setDrawerTaskId(null)} onTransition={transitionTask} onCloseTask={doCloseTask} onMarkViewed={markTaskViewed}
          onDownloadReport={doDownloadReport} downloadingReport={downloadingReportId === drawerTask.id} onZoom={setLightboxUrl}
          hasPendingUpload={pendingTaskCloseIds && pendingTaskCloseIds.has(drawerTask.id)}
          onUpdateTask={onUpdateTask} onAddComment={onAddTaskComment} currentUsername={currentUsername} currentUser={currentUser}
          allUsernames={Object.keys(accounts || {})} mySignature={mySignature} signerCargo={signerCargo} viewerLocked={viewerLocked} onGoToProfile={onGoToProfile} />
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}



/** Carga de trabajo por técnico (tareas abiertas) — y se puede soltar una tarjeta del tablero sobre una persona para reasignarla. */
function WorkloadStrip({ tasks, accounts, onAssign }) {
  const [over, setOver] = useState(null);
  const open = {};
  (tasks || []).forEach(t => { if (t.asignadoA && normalizeTaskState(t.estado) !== "finalizada" && !isTaskSnoozed(t)) open[t.asignadoA] = (open[t.asignadoA] || 0) + 1; });
  const people = Object.keys(accounts || {}).filter(u => { const a = accounts[u]; return a && a.approved !== false && !a.is_viewer && !a.is_gerencia; })
    .map(u => ({ u, n: open[u] || 0, name: accounts[u]?.display_name || u })).sort((a, b) => b.n - a.n);
  if (people.length === 0) return null;
  const max = Math.max(1, ...people.map(p => p.n));
  return (
    <div className="rounded-xl p-2.5 mb-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Carga por técnico · arrastra una tarjeta sobre una persona para reasignarla</div>
      <div className="flex gap-2 flex-wrap">
        {people.map(p => (
          <div key={p.u}
            onDragOver={e => { e.preventDefault(); setOver(p.u); }}
            onDragLeave={() => setOver(o => (o === p.u ? null : o))}
            onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) onAssign(id, p.u, p.name); }}
            className="rounded-lg px-2.5 py-1.5" style={{ minWidth: 112, background: over === p.u ? C.amberSoft : C.bg, border: `1px solid ${over === p.u ? C.amber : C.line}` }}>
            <div className="flex items-center justify-between gap-2 text-xs" style={{ color: C.ink }}><span className="truncate font-semibold">{p.name.split(" ")[0]}</span><b>{p.n}</b></div>
            <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: C.line }}><div className="h-full" style={{ width: `${Math.round((p.n / max) * 100)}%`, background: p.n >= 8 ? C.red : p.n >= 5 ? C.amber : C.green }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}