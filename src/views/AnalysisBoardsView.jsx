import { useMemo, useState } from "react";
import { C, TASK_PRIORITY_COLORS, normalizeTaskState, periodRanges, roomOfTask } from "../shared/core";


export function AnalysisBoardsView({ tasks, mttoLog, equipos, accounts, onNavigate }) {
  const [tab, setTab] = useState("comparar");
  const [period, setPeriod] = useState("mes");
  const [sistema, setSistema] = useState("");
  const [piso, setPiso] = useState("");
  const [days, setDays] = useState(90);
  const [copied, setCopied] = useState(false);
  const eqById = useMemo(() => { const m = {}; (equipos || []).forEach(e => { m[e.id] = e; }); return m; }, [equipos]);
  const sistemas = useMemo(() => [...new Set((equipos || []).map(e => e.sistema).filter(Boolean))].sort(), [equipos]);
  const pisos = useMemo(() => [...new Set((tasks || []).map(t => roomOfTask(t)).filter(Boolean).map(r => String(r).slice(0, 2)))].sort(), [tasks]);
  const nameOf = (u) => u ? (accounts?.[u]?.display_name || u) : "Sin asignar";
  const money = (n) => "$ " + Math.round(n).toLocaleString("es-CO");
  const pill = (on) => ({ minHeight: 36, background: on ? C.steelDark : C.panel, color: on ? "#fff" : C.inkSoft, border: `1px solid ${on ? C.steelDark : C.line}` });
  const card = { borderColor: C.line, background: C.panel };
  const sel = { minHeight: 40, borderColor: C.line, background: C.panel, color: C.ink };

  // ---------- Comparar ----------
  const cmp = useMemo(() => {
    const R = periodRanges(period);
    const inR = (iso, r) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= r[0] && t < r[1]; };
    const taskOk = (t) => !piso || String(roomOfTask(t) || "").slice(0, 2) === piso;
    const logOk = (r) => !sistema || eqById[r.equipoId]?.sistema === sistema;
    const calc = (r) => {
      const closed = (tasks || []).filter(t => taskOk(t) && inR(t.finishedAt, r));
      const hs = closed.map(t => (new Date(t.finishedAt) - new Date(t.createdAt || t.assignedAt || t.finishedAt)) / 3600000).filter(h => h >= 0 && isFinite(h));
      const logs = (mttoLog || []).filter(l => logOk(l) && inR(l.fecha, r));
      return {
        cerrados: closed.length,
        horas: hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) / hs.length) : 0,
        creados: (tasks || []).filter(t => taskOk(t) && inR(t.createdAt, r)).length,
        prev: logs.filter(l => l.tipo === "preventivo").length,
        corr: logs.filter(l => l.tipo === "correctivo").length,
        costo: logs.reduce((a, l) => a + (Number(l.costo) || 0), 0),
      };
    };
    return { a: calc(R.cur), b: calc(R.prev), label: R.label };
  }, [tasks, mttoLog, period, sistema, piso, eqById]);
  const rows = [
    { k: "cerrados", n: "Casos cerrados", up: true },
    { k: "horas", n: "Tiempo medio de cierre (h)", up: false },
    { k: "creados", n: "Casos nuevos", up: null },
    { k: "prev", n: "Preventivos hechos", up: true },
    { k: "corr", n: "Correctivos hechos", up: false },
    { k: "costo", n: "Costo de mantenimiento", up: false, money: true },
  ];
  const diffOf = (a, b) => b === 0 ? (a === 0 ? 0 : 100) : Math.round((a - b) / b * 100);
  const quick = () => {
    const parts = [];
    const dc = cmp.a.cerrados - cmp.b.cerrados;
    if (cmp.a.cerrados || cmp.b.cerrados) parts.push(dc === 0 ? "Se cerraron los mismos casos que el periodo anterior." : `Se cerraron ${Math.abs(dc)} casos ${dc > 0 ? "más" : "menos"} que el periodo anterior.`);
    if (cmp.a.horas && cmp.b.horas && cmp.a.horas !== cmp.b.horas) parts.push(`El tiempo medio ${cmp.a.horas < cmp.b.horas ? "bajó" : "subió"} ${Math.abs(cmp.b.horas - cmp.a.horas)} horas.`);
    if (cmp.b.costo && cmp.a.costo > cmp.b.costo * 1.15) parts.push("Sube el costo: revisa en qué sistema se está yendo.");
    return parts.join(" ") || "Todavía no hay suficientes datos para comparar estos periodos.";
  };
  const shareText = () => `*Comparación: ${cmp.label[0]} vs ${cmp.label[1]}*\n` + rows.map(r => { const a = cmp.a[r.k], b = cmp.b[r.k]; const f = (x) => r.money ? money(x) : x; return `• ${r.n}: ${f(a)} (antes ${f(b)})`; }).join("\n") + `\n${quick()}`;

  // ---------- Fallas ----------
  const fallas = useMemo(() => {
    const since = Date.now() - days * 86400000;
    const logs = (mttoLog || []).filter(l => l.tipo === "correctivo" && new Date(l.fecha).getTime() >= since);
    const bySis = {}; const byEq = {};
    logs.forEach(l => { const e = eqById[l.equipoId]; const s = e?.sistema || "Otros"; bySis[s] = (bySis[s] || 0) + 1; byEq[l.equipoId] = (byEq[l.equipoId] || 0) + 1; });
    const sis = Object.entries(bySis).sort((a, b) => b[1] - a[1]);
    const total = sis.reduce((a, x) => a + x[1], 0);
    const eqs = Object.entries(byEq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => {
      const fechas = (mttoLog || []).filter(l => l.equipoId === id && l.tipo === "correctivo").map(l => new Date(l.fecha).getTime()).sort((a, b) => a - b);
      let mtbf = null; if (fechas.length >= 2) mtbf = Math.round((fechas[fechas.length - 1] - fechas[0]) / (fechas.length - 1) / 86400000);
      return { id, n, mtbf, e: eqById[id] };
    });
    return { sis, total, eqs };
  }, [mttoLog, days, eqById]);

  // ---------- Carga ----------
  const carga = useMemo(() => {
    const open = (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada" && !t.finishedAt);
    const by = {};
    open.forEach(t => { const k = t.asignadoA || ""; (by[k] ||= { alta: 0, media: 0, baja: 0 }); by[k][t.prioridad === "alta" ? "alta" : t.prioridad === "baja" ? "baja" : "media"]++; });
    const list = Object.entries(by).map(([u, v]) => ({ u, ...v, tot: v.alta + v.media + v.baja })).sort((a, b) => b.tot - a.tot);
    const turno = { Mañana: 0, Tarde: 0, Noche: 0 };
    const since = Date.now() - 30 * 86400000;
    (tasks || []).forEach(t => { if (!t.finishedAt || new Date(t.finishedAt).getTime() < since) return; const h = new Date(t.finishedAt).getHours(); turno[h >= 6 && h < 14 ? "Mañana" : h >= 14 && h < 22 ? "Tarde" : "Noche"]++; });
    return { list, max: Math.max(1, ...list.map(x => x.tot)), turno, totalOpen: open.length };
  }, [tasks]);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Tableros de análisis</h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>Compara periodos, mira qué falla más y cómo está repartido el trabajo.</p>
      </div>
      <div className="flex gap-1.5 mb-3">
        {[["comparar", "Comparar"], ["fallas", "Fallas"], ["carga", "Carga"]].map(([id, l]) => <button key={id} onClick={() => setTab(id)} className="flex-1 text-sm font-semibold rounded-xl" style={pill(tab === id)}>{l}</button>)}
      </div>

      {tab === "comparar" && <>
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
          {[["semana", "Semana"], ["mes", "Mes"], ["trimestre", "Trimestre"], ["año", "Año"]].map(([id, l]) => <button key={id} onClick={() => setPeriod(id)} className="shrink-0 text-xs font-semibold rounded-full px-3" style={pill(period === id)}>{l}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select value={piso} onChange={e => setPiso(e.target.value)} aria-label="Piso" className="text-sm border rounded-md px-2 outline-none" style={sel}><option value="">Todos los pisos</option>{pisos.map(p => <option key={p} value={p}>Piso {p}</option>)}</select>
          <select value={sistema} onChange={e => setSistema(e.target.value)} aria-label="Sistema" className="text-sm border rounded-md px-2 outline-none" style={sel}><option value="">Todos los sistemas</option>{sistemas.map(s => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="rounded-xl border p-3 mb-3" style={card}>
          <div className="text-[11px] mb-1" style={{ color: C.inkSoft }}>{cmp.label[0]} contra {cmp.label[1].toLowerCase()}. El piso filtra las tareas; el sistema filtra los mantenimientos.</div>
          {rows.map(r => {
            const a = cmp.a[r.k], b = cmp.b[r.k], d = diffOf(a, b), mx = Math.max(a, b, 1);
            const noBase = b === 0 && a > 0;
            const good = r.up === null || d === 0 || noBase ? null : (d > 0) === r.up;
            const col = good === null ? C.inkSoft : good ? C.green : C.red;
            const f = (x) => r.money ? money(x) : x;
            return (
              <div key={r.k} className="py-2.5" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex justify-between items-baseline"><span className="text-sm font-semibold" style={{ color: C.ink }}>{r.n}</span>
                  <span className="text-xs font-semibold" style={{ color: col }}>{noBase ? "Sin datos antes" : d === 0 ? "Igual" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} %${good === null ? "" : good ? " mejor" : " peor"}`}</span></div>
                <div className="flex items-center gap-2 mt-1.5"><span className="text-[11px] w-16 shrink-0" style={{ color: C.inkSoft }}>Ahora</span><div style={{ height: 8, borderRadius: 4, background: C.steelDark, width: `${a / mx * 60}%`, minWidth: a ? 4 : 0 }} /><span className="text-xs font-semibold" style={{ color: C.ink }}>{f(a)}</span></div>
                <div className="flex items-center gap-2 mt-1"><span className="text-[11px] w-16 shrink-0" style={{ color: C.inkSoft }}>Antes</span><div style={{ height: 8, borderRadius: 4, background: "#9db3c7", width: `${b / mx * 60}%`, minWidth: b ? 4 : 0 }} /><span className="text-xs" style={{ color: C.inkSoft }}>{f(b)}</span></div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl border p-3 mb-3" style={card}><div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Lectura rápida</div><div className="text-sm" style={{ color: C.inkSoft }}>{quick()}</div></div>
        <div className="flex gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText())}`} target="_blank" rel="noreferrer" className="flex-1 text-sm font-semibold rounded-xl flex items-center justify-center" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Enviar por WhatsApp</a>
          <button onClick={() => { try { navigator.clipboard.writeText(shareText()); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ } }} className="flex-1 text-sm font-semibold rounded-xl border" style={{ minHeight: 44, borderColor: C.line, color: C.ink, background: C.panel }}>{copied ? "Copiado" : "Copiar resumen"}</button>
        </div>
      </>}

      {tab === "fallas" && <>
        <div className="flex gap-1.5 mb-3">{[[30, "30 días"], [90, "90 días"], [365, "12 meses"]].map(([d, l]) => <button key={d} onClick={() => setDays(d)} className="flex-1 text-xs font-semibold rounded-full px-3" style={pill(days === d)}>{l}</button>)}</div>
        <div className="rounded-xl border p-3 mb-3" style={card}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Fallas por sistema</div>
          <div className="text-[11px] mb-2" style={{ color: C.inkSoft }}>{fallas.total} correctivos registrados. Los primeros sistemas concentran la mayoría de los problemas.</div>
          {fallas.sis.length === 0 && <div className="text-sm" style={{ color: C.inkSoft }}>No hay correctivos en este periodo.</div>}
          {(() => { let acc = 0; return fallas.sis.slice(0, 8).map(([s, n]) => { acc += n; return (
            <div key={s} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs w-24 shrink-0 truncate" style={{ color: C.ink }}>{s}</span>
              <div className="flex-1"><div style={{ height: 10, borderRadius: 5, background: C.steelDark, width: `${n / fallas.sis[0][1] * 100}%`, minWidth: 4 }} /></div>
              <span className="text-xs font-semibold w-8 text-right" style={{ color: C.ink }}>{n}</span>
              <span className="text-[11px] w-10 text-right" style={{ color: C.inkSoft }}>{Math.round(acc / fallas.total * 100)} %</span>
            </div>); }); })()}
        </div>
        <div className="rounded-xl border p-3" style={card}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Equipos que más fallan</div>
          <div className="text-[11px] mb-2" style={{ color: C.inkSoft }}>"Cada X días" es el promedio entre una falla y la siguiente, con todo el historial.</div>
          {fallas.eqs.length === 0 && <div className="text-sm" style={{ color: C.inkSoft }}>Sin datos.</div>}
          {fallas.eqs.map(x => (
            <div key={x.id} className="flex items-center gap-2 py-2" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{x.e?.nombre || "(equipo eliminado)"}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>{x.e?.sistema || "Otros"}{x.mtbf ? ` · falla cada ${x.mtbf} días` : ""}</div></div>
              <span className="text-sm font-bold rounded-full px-2.5 py-0.5" style={{ background: x.n >= 4 ? "#fee2e2" : "#fef3c7", color: x.n >= 4 ? "#991b1b" : "#92400e" }}>{x.n} fallas</span>
            </div>
          ))}
        </div>
      </>}

      {tab === "carga" && <>
        <div className="rounded-xl border p-3 mb-3" style={card}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Tareas abiertas por persona</div>
          <div className="text-[11px] mb-2" style={{ color: C.inkSoft }}>{carga.totalOpen} abiertas. <span style={{ color: "#D93025" }}>■</span> alta · <span style={{ color: "#D97706" }}>■</span> media · <span style={{ color: "#5C6B7A" }}>■</span> baja</div>
          {carga.list.length === 0 && <div className="text-sm" style={{ color: C.inkSoft }}>No hay tareas abiertas.</div>}
          {carga.list.slice(0, 14).map(x => (
            <div key={x.u || "none"} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs w-24 shrink-0 truncate" style={{ color: x.u ? C.ink : C.red, fontWeight: x.u ? 400 : 600 }}>{nameOf(x.u)}</span>
              <div className="flex-1 flex" style={{ gap: 2 }}>
                {["alta", "media", "baja"].map(p => x[p] > 0 && <div key={p} style={{ height: 12, borderRadius: 3, background: TASK_PRIORITY_COLORS[p], width: `${x[p] / carga.max * 100}%`, minWidth: 4 }} title={`${p}: ${x[p]}`} />)}
              </div>
              <span className="text-xs font-semibold w-7 text-right" style={{ color: C.ink }}>{x.tot}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-3" style={card}>
          <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Tareas cerradas por turno (30 días)</div>
          {Object.entries(carga.turno).map(([k, n]) => { const mx = Math.max(1, ...Object.values(carga.turno)); return (
            <div key={k} className="flex items-center gap-2 mb-1.5"><span className="text-xs w-16" style={{ color: C.ink }}>{k}</span><div className="flex-1"><div style={{ height: 10, borderRadius: 5, background: C.steelDark, width: `${n / mx * 100}%`, minWidth: n ? 4 : 0 }} /></div><span className="text-xs font-semibold w-8 text-right" style={{ color: C.ink }}>{n}</span></div>); })}
        </div>
      </>}
    </div>
  );
}