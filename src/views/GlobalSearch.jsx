import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { ALL_COLD_ROOM_ITEMS, ALL_METERS, C, GYM_ALL_ITEMS, LAVANDERIA_ITEMS, TASK_STATES, useBackCloseModal } from "../shared/core";
import { FLOORS } from "../shared/seeds";



/* ============================================================
   VISTA: EQUIPOS FUERA DE SERVICIO
   ============================================================ */
/* ============================================================
   VISTA: INICIO (pantalla de bienvenida según rol)
   ============================================================ */
/* ============================================================
   CAMPANA DE NOTIFICACIONES (admin) — turnos que no hicieron su recorrido
   ============================================================ */
/* ============================================================
   BÚSQUEDA GLOBAL — busca en TODOS los catálogos de equipos de la app
   ============================================================ */
export function GlobalSearch({ currentView, mttoEquipos, invItems, employees, tasks, wikiPages, onNavigate, onOpenEquipo, onOpenShelf, onOpenFloor }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useBackCloseModal(mobileOpen, () => { setMobileOpen(false); setQ(""); });

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];

    // Si estás DENTRO de una pantalla con su propio catálogo de equipos, la búsqueda se limita
    // solo a esa pantalla — así no te saca de lo que estás llenando para llevarte a otro lado.
    const scoped = {
      ronda: () => FLOORS.flatMap(floor => floor.items
        .filter(item => item.n.toLowerCase().includes(query))
        .map(item => ({ tipo: "Ronda de revisión", label: item.n, sub: floor.name, action: () => onOpenFloor(floor.id) }))),
      coldrooms: () => ALL_COLD_ROOM_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Cuartos Fríos", label: i.n, sub: "", action: () => onNavigate("coldrooms") })),
      meters: () => ALL_METERS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Medidores", label: i.n, sub: "", action: () => onNavigate("meters") })),
      laundry: () => LAVANDERIA_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Lavandería", label: i.n, sub: "", action: () => onNavigate("fichas-tecnicas") })),
      gym: () => GYM_ALL_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Gimnasio", label: i.n, sub: "", action: () => onNavigate("fichas-tecnicas") })),
      maintenance: () => (mttoEquipos || []).filter(e => e.active !== false && (e.nombre.toLowerCase().includes(query) || e.sistema.toLowerCase().includes(query)))
        .map(e => ({ tipo: "Mantenimiento", label: e.nombre, sub: e.sistema, action: () => onOpenEquipo(e.id) })),
      inventory: () => (invItems || []).filter(it => it.name.toLowerCase().includes(query) || (it.sku || "").toLowerCase().includes(query))
        .map(it => ({ tipo: "Inventario", label: it.name, sub: it.sku || "", action: () => onOpenShelf(it.shelfId) })),
      schedules: () => (employees || []).filter(e => e.active !== false && e.name.toLowerCase().includes(query))
        .map(e => ({ tipo: "Empleado", label: e.name, sub: e.cargo || "", action: () => onNavigate("schedules") })),
      tasks: () => (tasks || []).filter(t => t.titulo.toLowerCase().includes(query))
        .map(t => ({ tipo: "Tarea", label: t.titulo, sub: TASK_STATES.find(s => s.code === t.estado)?.label || "", action: () => onNavigate("tasks") })),
      wiki: () => (wikiPages || []).filter(p => (p.titulo || "").toLowerCase().includes(query) || (p.contenido || "").toLowerCase().includes(query))
        .map(p => ({ tipo: "Wiki", label: p.titulo, sub: "", action: () => onNavigate("wiki") })),
    };

    if (scoped[currentView]) return scoped[currentView]().slice(0, 25);

    // Fuera de esas pantallas (Inicio, Admin, etc.) sí busca en todo, para poder llegar a donde sea.
    return Object.values(scoped).flatMap(fn => fn()).slice(0, 25);
  }, [q, currentView, mttoEquipos, invItems, employees, tasks, wikiPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopedLabels = {
    ronda: "Buscar en la Ronda de revisión…", coldrooms: "Buscar en Cuartos Fríos…", meters: "Buscar en Medidores…",
    laundry: "Buscar en Lavandería…", gym: "Buscar en Gimnasio…", maintenance: "Buscar en Mantenimiento…",
    inventory: "Buscar en Inventario…", schedules: "Buscar empleado…", tasks: "Buscar tarea…",
  };

  return (
    <>
      {/* Escritorio: barra de búsqueda inline, como siempre */}
      <div className="relative flex-1 hidden sm:block" style={{ maxWidth: 280 }}>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
          <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder={scopedLabels[currentView] || "Buscar cualquier equipo, repuesto, empleado…"}
            className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        </div>
        {open && q.trim().length >= 2 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="pm-animate-in absolute left-0 mt-1 w-96 rounded-lg border shadow-lg z-50 max-h-[65vh] overflow-y-auto"
              style={{ background: C.panel, borderColor: C.line }}>
              {results.length === 0 ? (
                <div className="p-3 text-xs" style={{ color: C.gray }}>Sin resultados para "{q}".</div>
              ) : results.map((r, i) => (
                <button key={i} onClick={() => { r.action(); setOpen(false); setQ(""); }}
                  className="pm-stagger-in block w-full text-left px-3 py-2 border-b last:border-0" style={{ borderColor: C.line, animationDelay: `${Math.min(i, 10) * 25}ms` }}>
                  <div className="text-xs font-semibold" style={{ color: C.amber }}>{r.tipo}</div>
                  <div className="text-sm" style={{ color: C.ink }}>{r.label}</div>
                  {r.sub && <div className="text-xs" style={{ color: C.gray }}>{r.sub}</div>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Móvil: solo el ícono — al tocarlo, abre la búsqueda a pantalla completa */}
      <button onClick={() => setMobileOpen(true)} className="sm:hidden p-1.5 rounded-md shrink-0 flex items-center justify-center" style={{ background: C.bg, minWidth: 44, minHeight: 44 }} title="Buscar">
        <Search size={16} color={C.ink} />
      </button>
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col" style={{ background: C.panel }}>
          <div className="pm-safe-top flex items-center gap-2 p-3 border-b" style={{ borderColor: C.line }}>
            <button onClick={() => { setMobileOpen(false); setQ(""); }}><ArrowLeft size={20} color={C.ink} /></button>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder={scopedLabels[currentView] || "Buscar cualquier equipo, repuesto, empleado…"}
                className="text-sm border rounded-md pl-7 pr-2 py-2 outline-none w-full" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {q.trim().length < 2 ? (
              <div className="p-4 text-sm text-center" style={{ color: C.gray }}>Escribe al menos 2 letras para buscar.</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-center" style={{ color: C.gray }}>Sin resultados para "{q}".</div>
            ) : results.map((r, i) => (
              <button key={i} onClick={() => { r.action(); setMobileOpen(false); setQ(""); }}
                className="block w-full text-left px-4 py-3 border-b" style={{ borderColor: C.line }}>
                <div className="text-xs font-semibold" style={{ color: C.amber }}>{r.tipo}</div>
                <div className="text-sm" style={{ color: C.ink }}>{r.label}</div>
                {r.sub && <div className="text-xs" style={{ color: C.gray }}>{r.sub}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}