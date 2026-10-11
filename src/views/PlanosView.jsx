import { useMemo, useState } from "react";
import { PLANOS } from "../data/planos";
import { Layers, X } from "lucide-react";
import { C, PLAN_GROUPS, categoryOfTask, normalizeTaskState, planColorOf, planGroupOf, roomOfTask } from "../shared/core";



export function PlanosView({ tasks, mttoLog, equipos, accounts, onNavigate }) {
  const [floor, setFloor] = useState(41);
  const [group, setGroup] = useState("Todo");
  const [range, setRange] = useState(0); // días hacia atrás; 0 = todo el historial
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 2 : 1));
  const [sel, setSel] = useState(null);
  const [find, setFind] = useState("");
  const nameOf = (u) => (u ? (accounts?.[u]?.display_name || u) : "Sin asignar");
  const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }); } catch { return "—"; } };
  const ago = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d < 1 ? "hoy" : d < 31 ? `hace ${d} d` : d < 365 ? `hace ${Math.round(d / 30)} meses` : `hace ${(d / 365).toFixed(1).replace(".0", "")} años`;
  };

  const planKey = useMemo(() => Object.keys(PLANOS).find(k => PLANOS[k].floors.includes(floor)) || "41", [floor]);
  const plan = PLANOS[planKey];
  const roomsOfPlan = useMemo(
    () => plan.rooms.map(r => ({ number: r.n || String(floor * 100 + Number(r.s)), rect: r.r })),
    [plan, floor]
  );

  // Todos los eventos por habitación (de cualquier piso), una sola vez por cambio de datos.
  const eventsByRoom = useMemo(() => {
    const map = {};
    const add = (room, ev) => { (map[room] ||= []).push(ev); };
    (tasks || []).forEach(t => {
      const room = roomOfTask(t);
      if (!room) return;
      const done = normalizeTaskState(t.estado) === "finalizada";
      add(room, {
        key: "t" + t.id, at: t.finishedAt || t.createdAt || t.assignedAt, kind: t.origen === "hotsos" ? "HotSOS" : "Tarea",
        title: t.titulo || "Tarea", detail: nameOf(t.asignadoA), open: !done,
        group: planGroupOf(`${t.titulo || ""} ${t.descripcion || ""}`, categoryOfTask(t)),
      });
    });
    const roomsOfEq = {};
    (equipos || []).forEach(e => {
      const m = String(e.nombre || "").match(/\b[34]\d{3}\b/g);
      if (m) roomsOfEq[e.id] = [...new Set(m)];
    });
    (mttoLog || []).forEach(r => {
      const rooms = roomsOfEq[r.equipoId];
      if (!rooms) return;
      const eq = (equipos || []).find(e => e.id === r.equipoId);
      rooms.forEach(room => add(room, {
        key: "m" + (r.id || r.fecha + r.equipoId) + room, at: r.fecha, kind: r.tipo === "correctivo" ? "Correctivo" : "Mantenimiento",
        title: r.descripcion || "Mantenimiento registrado", detail: eq?.nombre || "", open: false,
        group: planGroupOf(`${r.descripcion || ""} ${eq?.sistema || ""} ${eq?.nombre || ""}`, ""),
      }));
    });
    Object.values(map).forEach(l => l.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)));
    return map;
  }, [tasks, mttoLog, equipos, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const since = range ? Date.now() - range * 86400000 : 0;
  const statsOf = (room) => {
    const all = (eventsByRoom[room] || []).filter(e => !since || new Date(e.at || 0).getTime() >= since);
    const byGroup = {};
    all.forEach(e => { byGroup[e.group] = (byGroup[e.group] || 0) + 1; });
    const shown = group === "Todo" ? all : all.filter(e => e.group === group);
    return { all, shown, byGroup, open: all.filter(e => e.open && (group === "Todo" || e.group === group)).length };
  };

  const selRoom = sel && roomsOfPlan.find(r => r.number === sel) ? sel : null;
  const jump = (value) => {
    setFind(value);
    const n = value.trim();
    if (!/^[34]\d{3}$/.test(n)) return;
    const fl = Math.floor(Number(n) / 100);
    const k = Object.keys(PLANOS).find(key => PLANOS[key].floors.includes(fl));
    if (!k) return;
    const exists = PLANOS[k].rooms.some(r => (r.n || String(fl * 100 + Number(r.s))) === n);
    if (!exists) return;
    setFloor(fl);
    setSel(n);
  };

  const totalFloorEvents = roomsOfPlan.reduce((a, r) => a + statsOf(r.number).shown.length, 0);
  const chip = (on) => ({ background: on ? C.steelDark : C.panel, color: on ? "#fff" : C.inkSoft, border: `1px solid ${on ? C.steelDark : C.line}`, minHeight: 36 });

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: C.ink }}><Layers size={18} color={C.amber} /> Planos por piso</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Toca una habitación del plano y mira cuánto mantenimiento ha tenido: pintura, aire, hidráulico y más.</p>
        </div>
        <input value={find} onChange={e => jump(e.target.value)} inputMode="numeric" placeholder="Ir a habitación (ej. 3615)" aria-label="Ir a habitación"
          className="text-sm border rounded-md px-3 outline-none" style={{ minHeight: 40, borderColor: C.line, background: C.panel, color: C.ink, width: 190 }} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2" role="tablist" aria-label="Piso">
        {[34, 35, 36, 37, 38, 39, 40, 41, 42].map(f => (
          <button key={f} role="tab" aria-selected={f === floor} onClick={() => { setFloor(f); setSel(null); }} className="shrink-0 text-sm font-semibold rounded-lg px-3.5" style={chip(f === floor)}>Piso {f}</button>
        ))}
      </div>
      {floor <= 38 && <p className="text-[11px] mb-2" style={{ color: C.inkSoft }}>Los pisos 34 al 38 comparten el mismo plano: elige el piso arriba y cada habitación cambia de número (ej. la del extremo es 3415, 3515, 3615…).</p>}

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
        {["Todo", ...PLAN_GROUPS.map(g => g.id)].map(g => (
          <button key={g} onClick={() => setGroup(g)} className="shrink-0 text-xs font-semibold rounded-full px-3 flex items-center gap-1.5" style={chip(g === group)}>
            {g !== "Todo" && <span style={{ width: 8, height: 8, borderRadius: 4, background: planColorOf(g), display: "inline-block" }} />}{g}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap text-xs" style={{ color: C.inkSoft }}>
        <span>Periodo:</span>
        {[[0, "Todo"], [365, "12 meses"], [180, "6 meses"], [90, "90 días"]].map(([d, l]) => (
          <button key={d} onClick={() => setRange(d)} className="rounded-full px-2.5 font-semibold" style={chip(range === d)}>{l}</button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="Alejar" className="rounded-md px-3 font-bold text-base" style={chip(false)}>−</button>
          <span className="tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))} aria-label="Acercar" className="rounded-md px-3 font-bold text-base" style={chip(false)}>+</button>
        </span>
      </div>

      <div className="rounded-xl border overflow-auto" style={{ borderColor: C.line, background: "#fff", maxHeight: "68vh", WebkitOverflowScrolling: "touch" }}>
        <div style={{ position: "relative", width: `${zoom * 100}%`, minWidth: "100%" }}>
          <img src={plan.img} alt={`Plano de los pisos ${plan.floors[0]} al ${plan.floors[plan.floors.length - 1]}`} style={{ display: "block", width: "100%", height: "auto" }} draggable={false} />
          {roomsOfPlan.map(r => {
            const st = statsOf(r.number);
            const n = st.shown.length;
            const on = r.number === selRoom;
            const hue = st.open > 0 ? "239,68,68" : n === 0 ? "100,116,139" : n <= 2 ? "245,158,11" : "249,115,22";
            const a = on ? 0.45 : n === 0 ? 0.08 : st.open > 0 ? 0.32 : n <= 2 ? 0.26 : 0.38;
            return (
              <button key={r.number} onClick={() => setSel(r.number)} aria-label={`Habitación ${r.number}, ${n} registros`}
                style={{ position: "absolute", left: `${r.rect[0] * 100}%`, top: `${r.rect[1] * 100}%`, width: `${r.rect[2] * 100}%`, height: `${r.rect[3] * 100}%`,
                  background: `rgba(${hue},${a})`, border: on ? "3px solid #0ea5e9" : `1.5px solid rgba(${hue},.7)`, borderRadius: 4, padding: 0, cursor: "pointer" }}>
                <span style={{ position: "absolute", top: 3, left: 3, background: "rgba(8,20,32,.82)", color: "#fff", fontSize: Math.max(9, 9 + zoom * 1.5), fontWeight: 700, lineHeight: 1, padding: "3px 5px", borderRadius: 5 }}>
                  {r.number}{n > 0 ? ` · ${n}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px]" style={{ color: C.inkSoft }}>
        <span><b style={{ color: "#64748b" }}>■</b> sin registros</span>
        <span><b style={{ color: "#f59e0b" }}>■</b> 1–2</span>
        <span><b style={{ color: "#f97316" }}>■</b> 3 o más</span>
        <span><b style={{ color: "#ef4444" }}>■</b> con pendientes abiertos</span>
        <span className="ml-auto">{totalFloorEvents} registro{totalFloorEvents === 1 ? "" : "s"} en {floor <= 38 ? `piso ${floor}` : `piso ${floor}`}</span>
      </div>

      {selRoom && (() => {
        const st = statsOf(selRoom);
        const list = st.shown;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(2,8,15,.55)" }} onClick={() => setSel(null)}>
            <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 overflow-y-auto" style={{ background: C.panel, color: C.ink, maxHeight: "82vh", border: `1px solid ${C.line}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Habitación {selRoom}</div>
                  <div className="text-xs" style={{ color: C.inkSoft }}>
                    {st.all.length === 0 ? "Sin registros todavía" : `${st.all.length} registro${st.all.length === 1 ? "" : "s"} · último ${ago(st.all[0].at)} (${fmtD(st.all[0].at)})`}
                  </div>
                </div>
                <button onClick={() => setSel(null)} aria-label="Cerrar" className="rounded-full p-2" style={{ background: C.bg }}><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {PLAN_GROUPS.map(g => {
                  const evs = st.all.filter(e => e.group === g.id);
                  return (
                    <button key={g.id} onClick={() => setGroup(group === g.id ? "Todo" : g.id)} className="text-left rounded-xl px-3 py-2" style={{ border: `1px solid ${group === g.id ? g.color : C.line}`, background: evs.length ? `${g.color}14` : C.bg }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: g.color }}>{g.id}</span>
                        <span className="text-lg font-extrabold tabular-nums" style={{ color: evs.length ? C.ink : C.gray }}>{evs.length}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: C.inkSoft }}>{evs.length ? `Último: ${ago(evs[0].at)}` : "Nunca"}</div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold uppercase mb-1" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{group === "Todo" ? "Historial" : `Historial · ${group}`}</div>
              {list.length === 0 ? (
                <div className="text-sm py-4 text-center" style={{ color: C.gray }}>No hay registros {group === "Todo" ? "" : `de ${group.toLowerCase()} `}en este periodo.</div>
              ) : list.slice(0, 40).map(e => (
                <div key={e.key} className="py-2 border-t" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium min-w-0 truncate">{e.title}</span>
                    <span className="text-[11px] shrink-0" style={{ color: e.open ? "#ef4444" : C.gray }}>{e.open ? "Abierta" : fmtD(e.at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: C.inkSoft }}>
                    <span style={{ color: planColorOf(e.group), fontWeight: 700 }}>{e.group}</span><span>· {e.kind}</span>{e.detail ? <span className="truncate">· {e.detail}</span> : null}
                  </div>
                </div>
              ))}
              {list.length > 40 && <div className="text-[11px] text-center pt-2" style={{ color: C.gray }}>Mostrando los 40 más recientes.</div>}
              <button onClick={() => onNavigate("room-history")} className="w-full mt-3 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: C.bg, border: `1px solid ${C.line}`, color: C.amber }}>Ver historial completo por habitación →</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}