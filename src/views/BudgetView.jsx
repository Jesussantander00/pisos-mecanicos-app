import { useEffect, useState } from "react";
import { sGet, sSet } from "../lib/storage";
import { C } from "../shared/core";



/* ===== Presupuesto y costos (se llena a mano; se guarda en "budget-data") ===== */
export function BudgetView({ mttoLog }) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const [data, setData] = useState(null);
  const [budget, setBudget] = useState("");
  const [cat, setCat] = useState("Repuestos");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [baseBudget, setBaseBudget] = useState(0); // el mismo "Presupuesto del mes" de Inicio
  useEffect(() => { sGet("budget-data", true).then(v => setData(v && typeof v === "object" ? v : { budgets: {}, entries: [] })).catch(() => setData({ budgets: {}, entries: [] })); sGet("budget-mensual", true).then(v => setBaseBudget(Number(v?.monto) || 0)).catch(() => {}); }, []);
  const persist = async (next) => { setData(next); try { await sSet("budget-data", next, true); setErr(""); } catch { setErr("No se pudo guardar. Intenta otra vez."); } };
  const CATS = ["Repuestos", "Mano de obra externa", "Materiales", "Combustible", "Otros"];
  if (!data) return <div className="text-sm" style={{ color: C.gray }}>Cargando…</div>;
  const entries = (data.entries || []).filter(e => String(e.fecha).startsWith(monthKey));
  const manual = entries.reduce((a, e) => a + Number(e.monto || 0), 0);
  const nowD = new Date();
  const fromLog = (mttoLog || []).reduce((a, r) => { const d = new Date(r.fecha); return (d.getFullYear() === nowD.getFullYear() && d.getMonth() === nowD.getMonth()) ? a + (Number(r.costo) || 0) : a; }, 0);
  const spent = manual + fromLog;
  const tot = Number(data.budgets?.[monthKey] || 0) || baseBudget;
  const day = new Date().getDate(); const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const proj = spent / Math.max(1, day) * dim;
  const money = (n) => "$ " + Math.round(n).toLocaleString("es-CO");
  const byCat = CATS.map(c => [c, entries.filter(e => e.cat === c).reduce((a, e) => a + Number(e.monto || 0), 0)]).filter(x => x[1] > 0);
  const addEntry = () => { const a = Number(String(amount).replace(/[^\d.]/g, "")); if (!a) { setErr("Escribe el valor en pesos."); return; } persist({ ...data, entries: [{ id: "e" + Date.now(), fecha: new Date().toISOString(), cat, monto: a, nota: note.trim() }, ...(data.entries || [])].slice(0, 2000) }); setAmount(""); setNote(""); };
  const inp = { minHeight: 44, borderColor: C.line, background: C.panel, color: C.ink };
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Presupuesto y costos</h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>Escribe el presupuesto del mes y ve registrando los gastos. La app calcula el ritmo y avisa si te vas a pasar.</p>
      </div>
      <div className="rounded-xl border p-4 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-[11px] font-semibold uppercase" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Gasto del mes</div>
        <div className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{money(spent)} {tot ? <span className="text-sm font-medium" style={{ color: C.inkSoft }}>de {money(tot)}</span> : null}</div>
        {tot > 0 && <><div style={{ height: 8, borderRadius: 4, background: C.bg, margin: "8px 0" }}><div style={{ width: `${Math.min(100, spent / tot * 100)}%`, height: 8, borderRadius: 4, background: spent > tot ? C.red : spent / tot > day / dim + 0.15 ? C.amber : C.green }} /></div>
          <div className="text-[11px] mb-1" style={{ color: C.inkSoft }}>Incluye {money(fromLog)} de los costos de los mantenimientos registrados y {money(manual)} de gastos que anotes aquí.</div>
          <div className="text-xs" style={{ color: proj > tot ? C.red : C.inkSoft }}>{Math.round(spent / tot * 100)} % usado al día {day} de {dim}. Al ritmo actual cerrarías el mes en {money(proj)}{proj > tot ? ", por encima del presupuesto." : "."}</div></>}
        <div className="flex gap-2 mt-3 items-center">
          <input value={budget} onChange={e => setBudget(e.target.value)} inputMode="numeric" placeholder={tot ? "Cambiar presupuesto" : "Presupuesto del mes en pesos"} aria-label="Presupuesto del mes" className="flex-1 text-sm border rounded-md px-3 outline-none" style={inp} />
          <button onClick={() => { const n = Number(String(budget).replace(/[^\d.]/g, "")); if (n > 0) { persist({ ...data, budgets: { ...(data.budgets || {}), [monthKey]: n } }); sSet("budget-mensual", { monto: n, by: new Date().toISOString() }, true).catch(() => {}); setBaseBudget(n); setBudget(""); } }} className="text-sm font-semibold rounded-xl px-4" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Guardar</button>
        </div>
      </div>
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Registrar un gasto</div>
        <div className="grid grid-cols-2 gap-2">
          <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoría" className="text-sm border rounded-md px-2 outline-none" style={inp}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" placeholder="Valor en pesos" aria-label="Valor" className="text-sm border rounded-md px-3 outline-none" style={inp} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Detalle (opcional)" aria-label="Detalle" className="col-span-2 text-sm border rounded-md px-3 outline-none" style={inp} />
        </div>
        <button onClick={addEntry} className="mt-2 text-sm font-semibold rounded-xl px-4" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Agregar gasto</button>
        {err && <div className="text-xs mt-2" style={{ color: C.red }} role="alert">{err}</div>}
      </div>
      {byCat.length > 0 && <div className="rounded-xl border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Por categoría</div>
        {byCat.map(([c, v]) => <div key={c} className="flex justify-between py-1.5 text-sm border-t" style={{ borderColor: C.line, color: C.ink }}><span>{c}</span><b>{money(v)}</b></div>)}
      </div>}
      {entries.length > 0 && <div className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Gastos del mes</div>
        {entries.slice(0, 30).map(e => (
          <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-t text-xs" style={{ borderColor: C.line, color: C.ink }}>
            <span className="min-w-0 truncate">{new Date(e.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · {e.cat}{e.nota ? ` · ${e.nota}` : ""}</span>
            <span className="flex items-center gap-2 shrink-0"><b>{money(e.monto)}</b><button onClick={() => persist({ ...data, entries: data.entries.filter(x => x.id !== e.id) })} aria-label="Quitar gasto" className="px-2 rounded" style={{ minHeight: 32, color: C.red }}>Quitar</button></span>
          </div>
        ))}
      </div>}
    </div>
  );
}