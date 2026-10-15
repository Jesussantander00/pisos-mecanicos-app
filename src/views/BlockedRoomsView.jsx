import { useEffect, useState } from "react";
import { sGet, sSet } from "../lib/storage";
import { C, normalizeTaskState, roomOfTask } from "../shared/core";



/* ===== Habitaciones bloqueadas por mantenimiento (se guarda en "blocked-rooms") ===== */
export function BlockedRoomsView({ accounts, currentUser, onNavigate, tasks }) {
  const [list, setList] = useState(null);
  const [room, setRoom] = useState("");
  const [reason, setReason] = useState("");
  const [eta, setEta] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { sGet("blocked-rooms", true).then(v => setList(Array.isArray(v) ? v : [])).catch(() => setList([])); }, []);
  const save = async (next) => { setList(next); try { await sSet("blocked-rooms", next, true); setErr(""); } catch { setErr("No se pudo guardar. Revisa tu conexión e intenta otra vez."); } };
  const nameOf = (u) => accounts?.[u]?.display_name || u || "";
  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" }); } catch { return "—"; } };
  const active = (list || []).filter(b => !b.releasedAt);
  const released = (list || []).filter(b => b.releasedAt).slice(0, 5);
  const add = () => {
    const n = room.trim();
    if (!/^[34]\d{3}$/.test(n)) { setErr("Escribe el número de habitación de 4 cifras (ej. 3917)."); return; }
    if (active.some(b => b.room === n)) { setErr(`La habitación ${n} ya está bloqueada.`); return; }
    if (!reason.trim()) { setErr("Cuéntale a recepción por qué está bloqueada."); return; }
    save([{ id: "b" + Date.now(), room: n, reason: reason.trim(), eta: eta || null, since: new Date().toISOString(), by: currentUser }, ...(list || [])]);
    setRoom(""); setReason(""); setEta(""); setErr("");
  };
  const release = (id) => save((list || []).map(b => b.id === id ? { ...b, releasedAt: new Date().toISOString(), releasedBy: currentUser } : b));
  const setEtaOf = (id, v) => save((list || []).map(b => b.id === id ? { ...b, eta: v || null } : b));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueToday = active.filter(b => b.eta && new Date(b.eta + "T00:00:00").getTime() <= today.getTime()).length;
  const avgDays = active.length ? active.reduce((a, b) => a + (Date.now() - new Date(b.since).getTime()) / 86400000, 0) / active.length : 0;
  const inp = { minHeight: 44, borderColor: C.line, background: C.panel, color: C.ink };
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Habitaciones bloqueadas</h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>Lo que recepción necesita saber: qué habitaciones no se pueden vender y cuándo se liberan. También se pintan en el plano.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[[active.length, "bloqueadas", C.ink], [dueToday, "debían liberarse", dueToday ? C.red : C.ink], [active.length ? avgDays.toFixed(1).replace(".0", "") + " d" : "—", "promedio bloqueo", C.ink]].map(([v, l, c]) => (
          <div key={l} className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xl font-extrabold tabular-nums" style={{ color: c, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{v}</div>
            <div className="text-[11px]" style={{ color: C.inkSoft }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Bloquear una habitación</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={room} onChange={e => setRoom(e.target.value)} inputMode="numeric" placeholder="Habitación (3917)" aria-label="Habitación" className="text-sm border rounded-md px-3 outline-none" style={inp} />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (ej. fuga en lavamanos)" aria-label="Motivo" className="text-sm border rounded-md px-3 outline-none sm:col-span-2" style={inp} />
          <input type="date" value={eta} onChange={e => setEta(e.target.value)} aria-label="Fecha estimada de liberación" className="text-sm border rounded-md px-3 outline-none" style={inp} />
        </div>
        <button onClick={add} className="mt-2 text-sm font-semibold rounded-xl px-4" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Bloquear</button>
        {err && <div className="text-xs mt-2" style={{ color: C.red }} role="alert">{err}</div>}
      </div>
      {list === null ? <div className="text-sm" style={{ color: C.gray }}>Cargando…</div> : active.length === 0 ? (
        <div className="text-sm text-center py-6 rounded-xl border" style={{ color: C.gray, borderColor: C.line }}>No hay habitaciones bloqueadas.</div>
      ) : active.map(b => {
        const late = b.eta && new Date(b.eta + "T23:59:59").getTime() < Date.now();
        const daysBlocked = Math.floor((Date.now() - new Date(b.since).getTime()) / 86400000);
        const roomTasks = (tasks || []).filter(t => roomOfTask(t) === b.room && new Date(t.createdAt || t.assignedAt || b.since).getTime() >= new Date(b.since).getTime() - 86400000);
        const doneN = roomTasks.filter(t => normalizeTaskState(t.estado) === "finalizada" || t.finishedAt).length;
        const pct = roomTasks.length ? Math.round((doneN / roomTasks.length) * 100) : null;
        const noTech = roomTasks.some(t => normalizeTaskState(t.estado) !== "finalizada" && !t.finishedAt && !t.asignadoA);
        return (
          <div key={b.id} className="rounded-xl border p-3 mb-2" style={{ borderColor: late || daysBlocked > 3 ? C.red : C.line, background: C.panel }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-lg font-bold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Hab {b.room}</div>
                  <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: daysBlocked > 3 ? C.redSoft : daysBlocked >= 1 ? C.amberSoft : C.greenSoft, color: daysBlocked > 3 ? "#8a2a12" : daysBlocked >= 1 ? "#7a4e00" : "#14532d" }}>{daysBlocked < 1 ? "Bloqueada hoy" : `${daysBlocked} día${daysBlocked === 1 ? "" : "s"} bloqueada`}</span>
                  {noTech && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: C.amberSoft, color: "#7a4e00" }}>Sin técnico</span>}
                </div>
                <div className="text-sm" style={{ color: C.inkSoft }}>{b.reason}</div>
                <div className="text-[11px] mt-0.5" style={{ color: C.gray }}>Bloqueada el {fmt(b.since)}{b.by ? ` por ${nameOf(b.by)}` : ""}</div>
                {pct !== null && (
                  <div className="mt-2" style={{ maxWidth: 260 }}>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.bg }}><div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? C.green : C.amber }} /></div>
                    <div className="text-[11px] mt-0.5" style={{ color: C.inkSoft }}>Reparación {pct}% · {doneN} de {roomTasks.length} tarea{roomTasks.length === 1 ? "" : "s"} cerrada{doneN === 1 ? "" : "s"}</div>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px]" style={{ color: C.inkSoft }}>Se libera</div>
                <input type="date" value={b.eta || ""} onChange={e => setEtaOf(b.id, e.target.value)} aria-label={`Fecha de liberación habitación ${b.room}`} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: late ? C.red : C.line, background: C.panel, color: late ? C.red : C.ink }} />
                {late && <div className="text-[11px] font-semibold" style={{ color: C.red }}>Pasó la fecha</div>}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {onNavigate && <button onClick={() => onNavigate("floorplans")} className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: C.bg, border: `1px solid ${C.line}`, color: C.ink }}>Ver en el plano</button>}
              <button onClick={() => release(b.id)} className="flex-1 text-sm font-semibold rounded-xl" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Liberar</button>
            </div>
          </div>
        );
      })}
      {released.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Liberadas recientemente</div>
          {released.map(b => (
            <div key={b.id} className="text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.inkSoft }}>Hab {b.room} · {b.reason} · {fmt(b.since)} → {fmt(b.releasedAt)}</div>
          ))}
        </div>
      )}
    </div>
  );
}