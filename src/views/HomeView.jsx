import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Building2, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Download, Droplets, Gauge, History, Package, Send, Snowflake, Sparkles, Thermometer, TrendingUp, Upload, Users, Wrench, X, Zap } from "lucide-react";
import { C, GERENCIA_ALLOWED_VIEWS, MAX_FAVORITES, elapsed, hoursBetween, normalizeSearchText, normalizeTaskState, nowIso } from "../shared/core";
import { Button, MiniGauge, PcbBackground } from "../shared/components";
import { __pmState } from "../shared/core";



/**
 * Avisa de la novedad más reciente una sola vez por persona — se guarda en este dispositivo cuál
 * fue la última que ya vio, y no la vuelve a mostrar hasta que haya una entrada nueva de verdad.
 */
function WhatsNewBanner({ entries, currentUser }) {
  const latest = entries?.[0];
  const storageKey = `pm-local:changelog-seen:${currentUser}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === latest?.id; } catch { return false; }
  });
  if (!latest || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, latest.id); } catch { /* noop */ }
  };
  return (
    <div className="rounded-lg p-3 mb-4 flex items-start justify-between gap-3" style={{ background: C.blueSoft, border: `1px solid ${C.blue}` }}>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: C.blue }}>✨ Novedad</div>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>{latest.title}</div>
        <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{latest.description}</div>
      </div>
      <button onClick={dismiss} aria-label="Cerrar" title="Cerrar" className="p-0.5 shrink-0" style={{ minWidth: 24, minHeight: 24 }}><X size={16} color={C.gray} /></button>
    </div>
  );
}

export function HomeView({ currentUser, isAdmin, isAlmacenista, isGerencia, onNavigate, hasSignature, onGoToProfile, counts, tourProgress, tasksToday, lowStockDetail, activeIssuesList, mttoWeekCount, changelogEntries, shiftAlerts, topSlot, bottomSlot }) {
  const [dismissedSigReminder, setDismissedSigReminder] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pm-local:favorites:${currentUser}`) || "[]"); } catch { return []; }
  });
  const [favMsg, setFavMsg] = useState(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pm-local:recent:${currentUser}`) || "[]"); } catch { return []; }
  });
  const [showAllModules, setShowAllModules] = useState(false);
  const [moduleViewMode, setModuleViewMode] = useState(() => {
    try { return localStorage.getItem("pm-local:module-view") || "cards"; } catch { return "cards"; }
  });
  const setModuleView = (mode) => { setModuleViewMode(mode); try { localStorage.setItem("pm-local:module-view", mode); } catch { /* noop */ } };
  const goTo = (id) => {
    setRecent(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 6);
      try { localStorage.setItem(`pm-local:recent:${currentUser}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
    onNavigate(id);
  };
  const canManageInv = isAdmin || isAlmacenista;
  const gerenciaLocked = isGerencia && !isAdmin && !isAlmacenista;
  // Memoizado: esta lista (con sus badges/accesos) se recalculaba en CADA render — cada tecla
  // escrita en el buscador, cada vez que se cerraba el aviso de firma, etc. — aunque nada de lo
  // que la afecta (counts, roles) hubiera cambiado. Con 24 módulos no se nota a simple vista,
  // pero es trabajo de sobra repetido en cada pantallazo del día.
  const modules = useMemo(() => [
    { id: "ronda", label: "Ronda de revisión", icon: ClipboardList, desc: "Revisión diaria de los pisos mecánicos", access: true, group: "Operación en Campo" },
    { id: "coldrooms", label: "Cuartos fríos", icon: Snowflake, desc: "Cuartos fríos y máquinas de hielo", access: true, badge: counts.coldOutOfRange, group: "Operación en Campo" },
    { id: "meters", label: "Lecturas de medidores", icon: Zap, desc: "Consumo de servicios públicos", access: true, badge: counts.meterAnomalies, group: "Operación en Campo" },
    { id: "inventory", label: "Inventario", icon: Package, desc: "Bodegas, estanterías, alertas, movimientos y herramientas", access: isAdmin || isAlmacenista, badge: counts.lowStock, urgentBadge: false, group: "Gestión e Inventario" },
    { id: "maintenance", label: "Mantenimiento", icon: Wrench, desc: "Registrar mantenimientos por QR", access: isAdmin, group: "Operación en Campo", badge: counts.preventiveOverdue, urgentBadge: false },
    { id: "maintenance-analytics", label: "Análisis de mantenimiento", icon: TrendingUp, desc: "Gráficas, fallas y reemplazos", access: isAdmin || isGerencia, group: "Reportes y Análisis" },
    { id: "executive", label: "Panel ejecutivo", icon: Gauge, desc: "KPIs para la gerencia", access: isAdmin || isGerencia, group: "Reportes y Análisis" },
    { id: "maintenance-log", label: "Historial de mantenimientos", icon: History, desc: "Auditoría de lo registrado", access: isAdmin, group: "Reportes y Análisis" },
    { id: "maintenance-schedule", label: "Cronograma anual", icon: CalendarDays, desc: "Seguimiento del año completo", access: isAdmin, group: "Gestión e Inventario" },
    { id: "fichas-tecnicas", label: "Fichas técnicas", icon: ClipboardList, desc: "Lavandería, gimnasio y caldera", access: true, group: "Operación en Campo" },
    { id: "schedules", label: "Horario mensual", icon: Users, desc: "Turnos del personal", access: true, group: "Gestión e Inventario" },
    { id: "tasks", label: isAdmin ? "Tareas" : "Mi trabajo", icon: ClipboardCheck, desc: isAdmin ? "El buzón de lo que va saliendo" : "Lo que tienes asignado, listo para ejecutar", access: true, badge: counts.openTasks, urgentBadge: false, group: "Operación en Campo" },
    { id: "changelog", label: "Novedades", icon: Sparkles, desc: "Qué ha cambiado en la app", access: true, group: "Reportes y Análisis" },
    { id: "handoff", label: "Entrega de turno", icon: Send, desc: "Resumen del recorrido, por correo", access: true, badge: counts.justFinished ? "!" : 0, pulse: true, group: "Operación en Campo" },
    { id: "issues", label: "Fuera de servicio", icon: Wrench, desc: "Equipos dañados activos", access: true, badge: counts.activeIssues, pulse: true, group: "Operación en Campo" },
    { id: "reports", label: "Reportes", icon: History, desc: "Informe completo en PDF", access: true, group: "Reportes y Análisis" },
    { id: "tanks", label: "Tanques de agua potable", icon: Droplets, desc: "Niveles, con edición manual", access: true, group: "Operación en Campo" },
    { id: "fuel", label: "Combustibles y gas", icon: Gauge, desc: "ACPM, gas, calderas y planta eléctrica", access: true, group: "Operación en Campo" },
    { id: "contractor-visits", label: "Visitas de contratistas", icon: Users, desc: "Bitácora de entrada y salida, con firma", access: true, group: "Operación en Campo" },
    { id: "wiki", label: "Wiki interna", icon: BookOpen, desc: "Protocolos generales — emergencias, qué hacer si...", access: true, group: "Reportes y Análisis" },
    { id: "rooms", label: "Habitaciones", icon: Building2, desc: "Bloqueos y tipos de habitación", access: true, group: "Gestión e Inventario" },
    { id: "procedures", label: "Procedimientos", icon: Sparkles, desc: "Copiloto de IA y diagramas interactivos", access: true, group: "Operación en Campo", highlight: true },
    { id: "today", label: "Panel de hoy", icon: Gauge, desc: "Qué tiene cada técnico, hecho hoy y programado", access: isAdmin, group: "Operación en Campo" },
    { id: "calendar", label: "Calendario de tareas", icon: CalendarDays, desc: "El mes completo: creadas, cerradas y programadas", access: isAdmin, group: "Operación en Campo" },
    { id: "templates", label: "Plantillas de tareas", icon: ClipboardList, desc: "Tareas que repites, listas con un toque", access: isAdmin, group: "Operación en Campo" },
    { id: "usage", label: "Uso y respaldo", icon: Download, desc: "Espacio de datos, actividad del equipo y descargas", access: isAdmin, group: "Reportes y Análisis" },
    { id: "room-history", label: "Historial por habitación", icon: History, desc: "Órdenes y mantenimientos de un cuarto, y fallas repetidas", access: isAdmin, group: "Reportes y Análisis" },
    { id: "hotsos-import", label: "Importación HotSOS", icon: Upload, desc: "Convierte el Excel de órdenes en tareas", access: isAdmin, group: "Gestión e Inventario" },
    { id: "analytics", label: "Análisis de fallas", icon: TrendingUp, desc: "Historial de equipos dañados", access: isAdmin || isGerencia, group: "Reportes y Análisis" },
    { id: "hvac", label: "TelkHab", icon: Thermometer, desc: "Temperatura, estado e historial de aires — Telkonet", access: isAdmin, group: "Operación en Campo" },
  ].map(m => gerenciaLocked ? { ...m, access: GERENCIA_ALLOWED_VIEWS.includes(m.id) } : m),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [isAdmin, isAlmacenista, isGerencia, gerenciaLocked, counts]);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else {
        if (prev.length >= MAX_FAVORITES) {
          setFavMsg(`Ya tienes ${MAX_FAVORITES} favoritos — quita uno antes de agregar otro.`);
          setTimeout(() => setFavMsg(null), 2500);
          return prev;
        }
        next = [...prev, id];
      }
      try { localStorage.setItem(`pm-local:favorites:${currentUser}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const favModules = useMemo(() => modules.filter(m => favorites.includes(m.id) && m.access), [modules, favorites]);
  const recentModules = useMemo(() => recent.map(id => modules.find(m => m.id === id)).filter(m => m && m.access && !favorites.includes(m.id)).slice(0, 4), [recent, modules, favorites]);
  const searchNorm = normalizeSearchText(search.trim());
  const visibleModules = useMemo(() => (searchNorm ? modules.filter(m => normalizeSearchText(m.label).includes(searchNorm) || normalizeSearchText(m.desc).includes(searchNorm)) : modules).filter(m => m.access), [modules, searchNorm]);
  const GROUP_COLORS = { "Operación en Campo": C.amber, "Gestión e Inventario": "#0ea5e9", "Reportes y Análisis": "#2563eb", "Administración": "#64748b" };
  const groupOrder = ["Operación en Campo", "Gestión e Inventario", "Reportes y Análisis", "Administración"];
  const groupedModules = useMemo(() => groupOrder.map(g => ({ group: g, items: visibleModules.filter(m => m.group === g) })).filter(g => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleModules]);

  // Memoizado: dependen de activeIssuesList, que puede traer decenas de equipos — sin esto se
  // recorría/ordenaba la lista completa en cada render del Inicio, no solo cuando cambiaba.
  const oldestIssue = useMemo(() => (
    activeIssuesList.length
      ? activeIssuesList.reduce((a, b) => new Date(a.openedAt) < new Date(b.openedAt) ? a : b)
      : null
  ), [activeIssuesList]);
  // Equipos que llevan MUCHO tiempo fuera de servicio (más de un mes) — esto es distinto de
  // "fuera de servicio ahora" en general: acá lo que importa es avisar que algo lleva
  // demasiado tiempo sin resolverse, no solo que está dañado hoy.
  const longDownIssues = useMemo(() => (
    activeIssuesList.filter(iss => hoursBetween(iss.openedAt, nowIso()) / 24 >= 30).sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt))
  ), [activeIssuesList]);

  // Progreso general del turno (recorrido + tareas de hoy) — se muestra como tercera cifra del encabezado.
  const shiftPct = (() => {
    if (gerenciaLocked) return null;
    const tasksDone = (tasksToday || []).filter(t => normalizeTaskState(t.estado) === "finalizada").length;
    const totalExpected = (tourProgress?.total || 0) + (tasksToday?.length || 0);
    if (totalExpected <= 0) return null;
    return Math.round((((tourProgress?.done || 0) + tasksDone) / totalExpected) * 100);
  })();

  return (
    <div className="pb-20">
      {/* pb-20: deja espacio para que el botón flotante "Asistente IA" nunca tape
          contenido real (como "Ver todos los módulos") cuando se hace scroll hasta el final. */}
      <div className="relative rounded-2xl p-4 mb-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.steel} 0%, ${C.steelDark} 100%)`, isolation: "isolate", paddingBottom: 78 }}>
        {/* Fondo de placa de circuito impreso animada — solo estético, no interactivo */}
        <div className="absolute inset-0" style={{ zIndex: -1, pointerEvents: "none" }}><PcbBackground variant="home" /></div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <div className="text-white text-lg font-bold leading-tight truncate">Hola, {(currentUser || "").trim().split(/\s+/)[0]}</div>
              <div className="text-xs" style={{ color: "#c3d0dd" }}>
                {isAdmin ? "Administrador" : isAlmacenista ? "Almacenista" : gerenciaLocked ? "Gerencia (solo consulta)" : "Operador"}
              </div>
            </div>
          </div>
          <Gauge size={26} color={C.amber} className="shrink-0" />
        </div>
        {!gerenciaLocked && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button onClick={() => { __pmState.__pmTasksEntryFilter = "vencidas"; onNavigate("tasks"); }} className="text-left rounded-xl px-3 py-2.5" style={{ background: "#2a4058" }} title="Tareas asignadas a ti con más de 24 horas abiertas">
              <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: (counts.misTareasVencidas || 0) > 0 ? "#ffb4a0" : "#8fdca0" }}>{counts.misTareasVencidas || 0}</div>
              <div className="text-[11.5px] mt-1" style={{ color: "#c3d0dd" }}>Tareas vencidas</div>
            </button>
            <button onClick={() => onNavigate("issues")} className="text-left rounded-xl px-3 py-2.5" style={{ background: "#2a4058" }}>
              <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: (counts.activeIssues || 0) > 0 ? "#f3b73f" : "#8fdca0" }}>{counts.activeIssues || 0}</div>
              <div className="text-[11.5px] mt-1" style={{ color: "#c3d0dd" }}>Fuera de servicio</div>
            </button>
            <div className="rounded-xl px-3 py-2.5" style={{ background: "#2a4058" }} title="Recorrido y tareas de hoy">
              <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: shiftPct != null && shiftPct >= 100 ? "#8fdca0" : "#fff" }}>{shiftPct != null ? `${shiftPct}%` : "—"}</div>
              <div className="text-[11.5px] mt-1" style={{ color: "#c3d0dd" }}>Progreso del turno</div>
            </div>
          </div>
        )}
      </div>

      {topSlot}

      <WhatsNewBanner entries={changelogEntries} currentUser={currentUser} />

      {!gerenciaLocked && !searchNorm && (tasksToday || []).length > 0 && (() => {
        const misPendientes = tasksToday.filter(t => normalizeTaskState(t.estado) !== "finalizada");
        const misHechas = tasksToday.length - misPendientes.length;
        const fechaHoy = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
        return (
          <div className="rounded-xl border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold capitalize" style={{ color: C.ink }}>Mi día — {fechaHoy}</div>
              <span className="text-xs" style={{ color: C.gray }}>{misHechas}/{tasksToday.length} hechas</span>
            </div>
            {misPendientes.length === 0 ? (
              <div className="text-xs" style={{ color: C.green }}>✓ Ya terminaste todo lo tuyo de hoy.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {misPendientes.slice(0, 5).map(t => (
                  <button key={t.id} onClick={() => onNavigate("tasks")} className="text-left text-xs rounded-md px-2 py-1.5 flex items-center gap-2 hover:opacity-80"
                    style={{ background: C.bg, color: C.ink }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.prioridad === "alta" ? C.red : t.prioridad === "media" ? C.amber : C.gray }} />
                    <span className="truncate flex-1">{t.titulo}</span>
                  </button>
                ))}
                {misPendientes.length > 5 && <div className="text-xs" style={{ color: C.gray }}>+ {misPendientes.length - 5} más — ve a Tareas para ver todo.</div>}
              </div>
            )}
          </div>
        );
      })()}

      {!hasSignature && !dismissedSigReminder && (
        <div className="rounded-lg p-3 mb-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <div className="text-sm" style={{ color: C.amber }}>
            <b>✍️ Todavía no has guardado tu firma.</b> La necesitas para poder enviar tus recorridos y entregas de turno —
            se guarda una sola vez y de ahí en adelante se agrega sola.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onGoToProfile}>Configurarla ahora</Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissedSigReminder(true)}>Después</Button>
          </div>
        </div>
      )}

      {!gerenciaLocked && !searchNorm && (shiftAlerts || []).length > 0 && (() => {
        const checklistShortcuts = {
          "Lecturas de Medidores": "meters", "Ronda de revisión": "ronda", "Cuartos Fríos": "coldrooms",
          "Equipos de Gimnasio": "fichas-tecnicas", "Check List Caldera": "fichas-tecnicas", "Equipos de Lavandería": "fichas-tecnicas",
        };
        return (
          <div className="rounded-lg p-3 mb-4" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold" style={{ color: C.amber }}>
              <ClipboardList size={16} /> Checklist de inicio de turno
            </div>
            {shiftAlerts.map((a, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="text-xs font-medium mb-1" style={{ color: C.amber }}>{a.turno} — faltó registrar:</div>
                <div className="flex flex-wrap gap-1.5">
                  {a.missing.map((m, j) => (
                    <button key={j} onClick={() => checklistShortcuts[m] && onNavigate(checklistShortcuts[m])}
                      className="text-xs rounded-full px-2.5 py-1 border transition hover:-translate-y-0.5"
                      style={{ borderColor: C.amber, background: C.panel, color: C.amber }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {!gerenciaLocked && !searchNorm && longDownIssues.length > 0 && (
        <button onClick={() => onNavigate("issues")} className="w-full text-left rounded-lg p-3 mb-4" style={{ background: C.redSoft, border: `1px solid ${C.red}` }}>
          <div className="flex items-center gap-2 mb-1.5 text-sm font-semibold" style={{ color: C.red }}>
            <AlertTriangle size={16} /> {longDownIssues.length} equipo{longDownIssues.length === 1 ? "" : "s"} lleva{longDownIssues.length === 1 ? "" : "n"} más de un mes fuera de servicio
          </div>
          <div className="text-xs" style={{ color: C.ink }}>
            {longDownIssues.slice(0, 3).map(iss => iss.name).join(", ")}{longDownIssues.length > 3 ? `, y ${longDownIssues.length - 3} más` : ""} — toca para revisarlos.
          </div>
        </button>
      )}

      {/* PILAR 1 — Widgets vivos: el tablero de instrumentos del día, no solo accesos directos */}
      {!gerenciaLocked && !searchNorm && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {counts.misTareasVencidas > 0 && (
            <button onClick={() => { __pmState.__pmTasksEntryFilter = "vencidas"; onNavigate("tasks"); }} title="Tareas asignadas a ti, sin cerrar, que llevan más de 24 horas abiertas"
              className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md col-span-2 lg:col-span-1" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: C.panel }}>
                <AlertTriangle size={22} color={C.red} />
              </div>
              <div>
                <div className="text-lg font-bold leading-none" style={{ color: C.red }}>{counts.misTareasVencidas}</div>
                <div className="text-xs mt-0.5" style={{ color: C.red }}>Mis tareas vencidas — más de 24h</div>
              </div>
            </button>
          )}
          <button onClick={() => onNavigate("ronda")} title="Pisos ya revisados en la ronda de hoy, sobre el total de pisos mecánicos" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: C.line, background: C.panel }}>
            <MiniGauge value={tourProgress.done} max={tourProgress.total} color={tourProgress.done >= tourProgress.total ? C.green : C.amber} />
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{tourProgress.done}<span className="text-xs font-normal" style={{ color: C.gray }}>/{tourProgress.total}</span></div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Pisos revisados hoy</div>
            </div>
          </button>

          <button onClick={() => onNavigate("maintenance-log")} title="Mantenimientos (preventivos y correctivos) registrados en los últimos 7 días" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: C.line, background: C.panel }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft || C.amberSoft }}>
              <Wrench size={22} color={C.blue} />
            </div>
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{mttoWeekCount}</div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Mantenimientos esta semana</div>
            </div>
          </button>

          <button onClick={() => onNavigate("issues")} title="Equipos marcados como dañados que siguen sin resolverse" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: activeIssuesList.length ? C.red : C.line, background: activeIssuesList.length ? C.redSoft : C.panel }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: activeIssuesList.length ? C.panel : C.greenSoft }}>
              {activeIssuesList.length ? <AlertTriangle size={22} color={C.red} /> : <CheckCircle2 size={22} color={C.green} />}
            </div>
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{activeIssuesList.length}</div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>
                {oldestIssue ? `Fuera de servicio · ${elapsed(oldestIssue.openedAt)} el más viejo` : "Fuera de servicio — ninguno"}
              </div>
            </div>
          </button>

          {canManageInv && <button onClick={() => onNavigate("inventory")} title="Artículos de inventario en o por debajo de su cantidad mínima definida" className="text-left rounded-xl border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.inkSoft }}>Stock más crítico</div>
            {lowStockDetail.length === 0 ? (
              <div className="text-xs flex items-center gap-1" style={{ color: C.green }}><CheckCircle2 size={13} /> Todo por encima del mínimo</div>
            ) : (
              <div className="space-y-1">
                {lowStockDetail.slice(0, 3).map(it => (
                  <div key={it.id} className="text-xs flex items-center justify-between gap-1" style={{ color: C.ink }}>
                    <span className="truncate">{it.name}</span>
                    <span className="font-semibold shrink-0" style={{ color: C.amber }}>{it.quantity}/{it.minThreshold}</span>
                  </div>
                ))}
              </div>
            )}
          </button>}
        </div>
      )}

      {/* Usados recientemente — lo último que se abrió, para no tener que buscarlo si no está en favoritos */}
      {!gerenciaLocked && !searchNorm && recentModules.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Usados recientemente</div>
          <div className="flex items-stretch rounded-xl border overflow-hidden" style={{ borderColor: C.line, background: C.panel }}>
            {recentModules.map((m, i) => (
              <button key={m.id} onClick={() => goTo(m.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 transition hover:bg-black/[0.03] active:bg-black/[0.06]"
                style={{ borderLeft: i > 0 ? `1px solid ${C.line}` : "none", minHeight: 48 }}>
                <m.icon size={18} color={GROUP_COLORS[m.group] || C.gray} />
                <span className="text-xs font-semibold text-center truncate w-full" style={{ color: C.ink }} title={m.label}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {bottomSlot}
    </div>
  );
}