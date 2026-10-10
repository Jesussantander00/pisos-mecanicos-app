import { useMemo, useState } from "react";
import { C, categoryOfTask, normalizeTaskState, roomOfTask } from "../shared/core";



export function RoomHistoryView({ tasks, mttoLog, equipos, accounts }) {
  const [tab, setTab] = useState("room"); // "room" | "repeat"
  const [room, setRoom] = useState("");
  const [days, setDays] = useState(30);
  const nameOf = (u) => (u ? (accounts?.[u]?.display_name || u) : "Sin asignar");
  const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" }); } catch { return "—"; } };

  const roomClean = room.trim();
  const events = useMemo(() => {
    if (!/^\d{3,5}$/.test(roomClean)) return [];
    const out = [];
    (tasks || []).forEach(t => {
      if (roomOfTask(t) !== roomClean) return;
      const done = normalizeTaskState(t.estado) === "finalizada";
      out.push({
        key: "t" + t.id, at: t.createdAt || t.assignedAt, kind: t.origen === "hotsos" ? "HotSOS" : "Tarea",
        title: t.titulo, detail: [categoryOfTask(t), nameOf(t.asignadoA)].filter(Boolean).join(" · "),
        status: done ? "Cerrada" : "Abierta", tone: done ? "ok" : "open",
      });
    });
    const eqIds = new Set((equipos || []).filter(e => String(e.nombre || "").includes(roomClean)).map(e => e.id));
    (mttoLog || []).forEach(r => {
      if (!eqIds.has(r.equipoId)) return;
      const eq = (equipos || []).find(e => e.id === r.equipoId);
      out.push({
        key: "m" + (r.id || r.fecha + r.equipoId), at: r.fecha, kind: r.tipo === "correctivo" ? "Correctivo" : "Mantenimiento",
        title: r.descripcion || "Mantenimiento registrado", detail: eq?.nombre || "", status: "Hecho", tone: "ok",
      });
    });
    return out.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [tasks, mttoLog, equipos, roomClean, accounts]);

  const repeat = useMemo(() => {
    const since = Date.now() - days * 86400000;
    const byRoom = {}, byCat = {};
    (tasks || []).forEach(t => {
      if (new Date(t.createdAt || 0).getTime() < since) return;
      const r = roomOfTask(t);
      const c = categoryOfTask(t);
      if (c) byCat[c] = (byCat[c] || 0) + 1;
      if (!r) return;
      const o = (byRoom[r] = byRoom[r] || { room: r, total: 0, abiertas: 0, cats: {} });
      o.total++;
      if (normalizeTaskState(t.estado) !== "finalizada") o.abiertas++;
      if (c) o.cats[c] = (o.cats[c] || 0) + 1;
    });
    const rooms = Object.values(byRoom).filter(o => o.total >= 2).sort((a, b) => b.total - a.total).slice(0, 15);
    const byEq = {};
    (mttoLog || []).forEach(r => {
      if (r.tipo !== "correctivo" || new Date(r.fecha || 0).getTime() < since) return;
      byEq[r.equipoId] = (byEq[r.equipoId] || 0) + 1;
    });
    const equipos2 = Object.entries(byEq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, n]) => ({ nombre: (equipos || []).find(e => e.id === id)?.nombre || "Equipo", n }));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { rooms, equipos: equipos2, cats };
  }, [tasks, mttoLog, equipos, days]);

  const tab1 = (id, label) => (
    <button onClick={() => setTab(id)} className="text-sm font-medium px-3 py-1.5 rounded-md"
      style={tab === id ? { background: C.blue, color: "#fff" } : { background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>{label}</button>
  );
  const toneStyle = (tone) => tone === "open" ? { background: C.amberSoft, color: C.ink } : { background: C.greenSoft, color: C.ink };

  return (
    <div className="pm-tab-in">
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Historial por habitación</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Todo lo que ha pasado en un cuarto, y qué se repite más.</p>
      <div className="flex gap-1.5 mb-4 flex-wrap">{tab1("room", "Por habitación")}{tab1("repeat", "Fallas repetidas")}{tab1("heat", "Mapa de calor")}</div>

      {tab === "heat" && (() => {
        const meses = [];
        for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i); meses.push(d); }
        const keyM = (d) => `${d.getFullYear()}-${d.getMonth()}`;
        const grid = {};
        (tasks || []).forEach(t => {
          const room = roomOfTask(t); if (!room) return;
          const piso = Math.floor(Number(room) / 100); if (!piso) return;
          const d = new Date(t.createdAt); if (isNaN(d)) return;
          const k = keyM(d);
          (grid[piso] = grid[piso] || {})[k] = (grid[piso]?.[k] || 0) + 1;
        });
        const pisos = Object.keys(grid).map(Number).sort((a, b) => b - a);
        const max = Math.max(1, ...pisos.flatMap(pi => meses.map(m => grid[pi][keyM(m)] || 0)));
        if (pisos.length === 0) return <div className="text-sm text-center py-8" style={{ color: C.gray }}>Todavía no hay órdenes con número de habitación para armar el mapa.</div>;
        return (
          <div className="overflow-x-auto">
            <p className="text-xs mb-2" style={{ color: C.inkSoft }}>Órdenes creadas por piso y mes (últimos 6 meses). Más oscuro = más fallas.</p>
            <table className="text-xs border-separate" style={{ borderSpacing: 3 }}>
              <thead><tr><th></th>{meses.map(m => <th key={keyM(m)} className="font-semibold capitalize" style={{ color: C.inkSoft }}>{m.toLocaleDateString("es-CO", { month: "short" })}</th>)}</tr></thead>
              <tbody>
                {pisos.map(pi => (
                  <tr key={pi}>
                    <td className="font-semibold pr-1" style={{ color: C.ink }}>Piso {pi}</td>
                    {meses.map(m => { const n = grid[pi][keyM(m)] || 0; const a = n === 0 ? 0 : 0.15 + 0.85 * (n / max); return <td key={keyM(m)} className="text-center rounded" style={{ minWidth: 44, height: 34, background: n === 0 ? C.bg : `rgba(194,58,27,${a})`, color: a > 0.55 ? "#fff" : C.ink }}>{n || ""}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {tab === "room" && (
        <>
          <input value={room} onChange={e => setRoom(e.target.value)} inputMode="numeric" placeholder="Número de habitación (ej: 1204)" aria-label="Número de habitación"
            className="w-full text-sm border rounded-md px-3 outline-none mb-3" style={{ minHeight: 44, borderColor: C.line, background: C.panel, color: C.ink }} />
          {roomClean === "" ? (
            <div className="text-sm text-center py-8" style={{ color: C.gray }}>Escribe un número de habitación para ver su historial.</div>
          ) : !/^\d{3,5}$/.test(roomClean) ? (
            <div className="text-sm text-center py-8" style={{ color: C.gray }}>Usa solo el número, de 3 a 5 dígitos.</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: C.gray }}>No hay órdenes ni mantenimientos registrados para la habitación {roomClean}.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[["Eventos", events.length, C.ink], ["Abiertas", events.filter(e => e.tone === "open").length, C.amber], ["Últimos 30 días", events.filter(e => new Date(e.at || 0).getTime() > Date.now() - 30 * 86400000).length, C.blue]].map(([l, n, c]) => (
                  <div key={l} className="rounded-lg border p-2.5 text-center" style={{ borderColor: C.line, background: C.panel }}>
                    <div className="text-xl font-bold tabular-nums" style={{ color: c }}>{n}</div>
                    <div className="text-[11px]" style={{ color: C.inkSoft }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.key} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: C.inkSoft }}>{fmtD(e.at)} · {e.kind}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={toneStyle(e.tone)}>{e.status}</span>
                    </div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>{e.title}</div>
                    {e.detail && <div className="text-xs mt-0.5" style={{ color: C.gray }}>{e.detail}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "repeat" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: C.inkSoft }}>Periodo:</span>
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} className="text-xs font-semibold px-3 rounded-full border" style={{ minHeight: 36, borderColor: days === d ? C.blue : C.line, background: days === d ? C.blue : C.panel, color: days === d ? "#fff" : C.inkSoft }}>{d} días</button>
            ))}
          </div>

          <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Habitaciones con más órdenes</div>
            {repeat.rooms.length === 0 ? <div className="text-xs" style={{ color: C.gray }}>Ninguna habitación tiene 2 o más órdenes en este periodo.</div> : repeat.rooms.map(o => (
              <button key={o.room} onClick={() => { setRoom(o.room); setTab("room"); }} className="w-full flex items-center justify-between gap-2 py-2 border-t text-left" style={{ borderColor: C.line, minHeight: 44 }}>
                <span className="text-sm font-bold" style={{ color: C.ink, width: 52 }}>{o.room}</span>
                <span className="flex-1 text-xs truncate" style={{ color: C.inkSoft }}>{Object.entries(o.cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(" · ") || "—"}</span>
                <span className="text-xs font-bold" style={{ color: o.abiertas > 0 ? C.red : C.ink }}>{o.total} órdenes{o.abiertas > 0 ? ` · ${o.abiertas} abiertas` : ""}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Equipos con más fallas (correctivos)</div>
            {repeat.equipos.length === 0 ? <div className="text-xs" style={{ color: C.gray }}>Ningún equipo tiene 2 o más correctivos en este periodo.</div> : repeat.equipos.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-2 border-t text-sm" style={{ borderColor: C.line }}>
                <span className="truncate" style={{ color: C.ink }}>{e.nombre}</span><span className="font-bold shrink-0" style={{ color: C.red }}>{e.n}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Tipos de falla más frecuentes</div>
            {repeat.cats.length === 0 ? <div className="text-xs" style={{ color: C.gray }}>Sin datos de categoría todavía (vienen de las órdenes importadas de HotSOS).</div> : repeat.cats.map(([c, n]) => (
              <div key={c} className="flex items-center gap-2 py-1.5 text-xs">
                <span style={{ color: C.ink, width: 110 }} className="truncate">{c}</span>
                <span className="flex-1 rounded-full overflow-hidden" style={{ background: C.bg, height: 8 }}><span className="block h-full" style={{ width: `${(n / repeat.cats[0][1]) * 100}%`, background: C.amber }} /></span>
                <span className="font-bold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}