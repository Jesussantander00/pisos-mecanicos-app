import { useEffect, useMemo, useState } from "react";
import { sGet, sSet } from "../lib/storage";
import { C, HSO_KEY, hsoAge, hsoNow, hsoSeed, showToast } from "../shared/core";
import { Button, Pill } from "../shared/components";


export function HotsosOrdersView({ profiles, currentUser, canImpersonate }) {
  const techs = useMemo(() => Object.keys(profiles || {}).filter(u => !profiles[u].is_admin && !profiles[u].is_viewer && !profiles[u].is_gerencia && !profiles[u].is_almacenista), [profiles]);
  const nm = u => (u && profiles?.[u]?.display_name) || u || "—";
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("pan");
  const [filter, setFilter] = useState("todas");
  const [sel, setSel] = useState(null);
  const [asUser, setAsUser] = useState(currentUser);
  const [form, setForm] = useState({ notes: "", mat: "" });
  const [codeInput, setCodeInput] = useState("");
  const me = asUser;
  const meIsAdmin = !!profiles?.[me]?.is_admin;
  const myCode = !!data?.codes?.[me];

  useEffect(() => { (async () => {
    let d = null;
    try { d = await sGet(HSO_KEY, true); } catch { /* sin datos */ }
    if (!d || !Array.isArray(d.orders)) { d = { orders: hsoSeed(techs.slice(0, 3)), codes: Object.fromEntries(techs.slice(0, 2).map(u => [u, true])), nextSO: 602736 }; try { await sSet(HSO_KEY, d, true); } catch { /* sigue en memoria */ } }
    setData(d);
  })(); /* eslint-disable-next-line */ }, []);

  const save = async (d) => { setData(d); try { await sSet(HSO_KEY, d, true); } catch { showToast("✗ No se pudo guardar el cambio", false); } };
  const upd = (so, fn, msg) => {
    const orders = data.orders.map(o => o.so === so ? (() => { const n = { ...o, log: [...o.log] }; fn(n); if (msg) n.log.unshift({ t: hsoNow(), m: msg }); return n; })() : o);
    return save({ ...data, orders });
  };
  const order = data?.orders.find(o => o.so === sel);
  useEffect(() => { setForm({ notes: order?.notes || "", mat: order?.mat || "" }); }, [sel]); // eslint-disable-line

  if (!data) return <div className="p-6 text-sm" style={{ color: C.inkSoft }}>Cargando órdenes…</div>;
  const orders = data.orders;
  const open = orders.filter(o => o.status !== "cerrada");
  const sin = open.filter(o => !o.by).length;
  const withTech = open.filter(o => o.by).length;
  const closed = orders.filter(o => o.status === "cerrada");
  const quejas = open.filter(o => o.guest).length;
  const pend = orders.filter(o => o.sync === "pendiente").length;
  const rows = orders.filter({ todas: () => true, sin: o => !o.by && o.status !== "cerrada", mias: o => o.by === me && o.status !== "cerrada", abiertas: o => o.status !== "cerrada", cerradas: o => o.status === "cerrada" }[filter]);
  const byT = techs.map(u => ({ u, a: open.filter(o => o.by === u).length, c: closed.filter(o => o.closedBy === u).length })).filter(x => x.a + x.c > 0 || true).slice(0, 8);
  const maxT = Math.max(1, ...byT.map(x => x.a + x.c));
  const b1 = open.filter(o => o.ageH < 12).length, b2 = open.filter(o => o.ageH >= 12 && o.ageH < 24).length, b3 = open.filter(o => o.ageH >= 24).length;
  const maxB = Math.max(1, b1, b2, b3);
  const attention = open.filter(o => o.guest || (!o.by && o.ageH >= 20) || (o.pri === 1 && !o.by)).sort((a, b) => (b.guest - a.guest) || b.ageH - a.ageH).slice(0, 6);
  const feed = orders.flatMap(o => o.log.map(l => ({ ...l, so: o.so, who: o.by }))).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 7);

  const statusPill = o => o.status === "cerrada" ? <Pill tone="green">Cerrada</Pill> : o.status === "proceso" ? <Pill tone="blue">En proceso</Pill> : o.status === "tomada" ? <Pill tone="blue">Tomada</Pill> : <Pill tone="amber">Sin tomar</Pill>;
  const simulate = () => {
    const pool = [["Guestroom 3112 · RS1B", "Reparar/Sustituir · Caja fuerte"], ["Guestroom 2208 · KING", "Reparar/Sustituir · Cerradura"], ["Guestroom 3507 · 1VWK", "Reparar/Sustituir · Control de aire acondicionado"]];
    const p = pool[Math.floor(Math.random() * pool.length)];
    const o = { so: data.nextSO, pri: 1, place: p[0], type: p[1], ageH: 0, guest: false, by: null, status: "nueva", takenAt: null, closedAt: null, closedBy: null, notes: "", mat: "", photos: 0, sync: null, log: [{ t: hsoNow(), m: "llegó desde HotSOS (prioridad P1)" }] };
    save({ ...data, orders: [o, ...orders], nextSO: data.nextSO + 1 });
    showToast(`Llegó la orden SO# ${o.so} desde HotSOS`);
  };
  const close = () => {
    if (!form.notes.trim()) { showToast("Escribe qué se hizo antes de cerrar", false); return; }
    const so = order.so, who = nm(me);
    upd(so, o => { o.notes = form.notes.trim(); o.mat = form.mat.trim(); o.status = "cerrada"; o.closedAt = hsoNow(); o.closedBy = me; o.sync = "pendiente"; }, `${who} llenó y cerró la orden`);
    setTimeout(() => {
      sGet(HSO_KEY, true).then(d => { if (!d) return; const orders2 = d.orders.map(o => o.so === so ? { ...o, sync: "enviada", log: [{ t: hsoNow(), m: `enviada a HotSOS con el código de ${who}` }, ...o.log] } : o); return save({ ...d, orders: orders2 }); }).catch(() => {});
      showToast(`Orden cerrada en HotSOS a nombre de ${who}`);
    }, 1200);
  };
  const resetDemo = async () => { await save({ orders: hsoSeed(techs.slice(0, 3)), codes: Object.fromEntries(techs.slice(0, 2).map(u => [u, true])), nextSO: 602736 }); setSel(null); showToast("Datos de muestra restablecidos"); };

  const card = "rounded-lg border p-3";
  const cs = { background: C.panel, borderColor: C.line };
  const lbl = "text-xs font-semibold uppercase tracking-wide mb-2";
  const tabs = [["pan", "Panorama"], ["ord", "Órdenes"], ["his", "Historial"], ...(!meIsAdmin ? [["cod", "Mi código HotSOS"]] : [])];

  const detail = () => {
    if (!order) return <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Detalle</div><div className="text-sm" style={{ color: C.inkSoft }}>Elige una orden de la lista para ver su detalle y trabajarla.</div></div>;
    const o = order, mine = o.by === me;
    return (
      <div className={card} style={cs}>
        <div className="flex justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs font-mono" style={{ color: C.gray }}>SO# {o.so} · Prioridad P{o.pri}</div>
            <div className="font-semibold" style={{ color: C.ink }}>{o.place}</div>
            <div className="text-sm" style={{ color: C.inkSoft }}>{o.type}</div>
          </div>
          <div className="flex gap-1 items-start flex-wrap">{o.guest && <Pill tone="red">Queja de huésped</Pill>}{statusPill(o)}</div>
        </div>
        <div className="grid text-sm my-3 gap-y-1" style={{ gridTemplateColumns: "110px 1fr", color: C.ink }}>
          <span style={{ color: C.gray }}>Antigüedad</span><span>{hsoAge(o.ageH)}</span>
          <span style={{ color: C.gray }}>Responsable</span><span>{o.by ? nm(o.by) : "Sin asignar"}</span>
          <span style={{ color: C.gray }}>Tomada</span><span>{o.takenAt || "—"}</span>
          <span style={{ color: C.gray }}>Cerrada</span><span>{o.closedAt ? `${o.closedAt} por ${nm(o.closedBy)}` : "—"}</span>
        </div>
        {o.status === "cerrada" ? (
          <div className="rounded-md p-2 text-sm" style={{ background: C.greenSoft, color: C.green }}>
            {o.sync === "enviada" ? <>Cerrada en HotSOS a nombre de <b>{nm(o.closedBy)}</b> a las {o.closedAt}.</> : "Enviando a HotSOS con el código del técnico…"}
            {o.notes && <div className="mt-1" style={{ color: C.ink }}>{o.notes}</div>}
          </div>
        ) : !o.by && !meIsAdmin ? (
          <Button onClick={() => upd(o.so, n => { n.by = me; n.status = "tomada"; n.takenAt = hsoNow(); }, `la tomó ${nm(me)}`)}>Tomar esta orden</Button>
        ) : meIsAdmin ? (
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Asignar a un técnico</div>
            <select value="" onChange={e => { const u = e.target.value; if (u) upd(o.so, n => { n.by = u; n.status = "tomada"; n.takenAt = hsoNow(); }, `${nm(me)} la asignó a ${nm(u)}`); }} className="text-sm border rounded-md px-2 py-1.5 w-full" style={{ background: C.panel, color: C.ink, borderColor: C.line }}>
              <option value="">{o.by ? "Cambiar técnico" : "Elegir…"}</option>
              {techs.map(u => <option key={u} value={u}>{nm(u)}</option>)}
            </select>
            <div className="text-xs mt-1" style={{ color: C.gray }}>Solo el técnico que la tiene puede llenarla y cerrarla con su código.</div>
          </div>
        ) : !mine ? (
          <div className="text-sm" style={{ color: C.inkSoft }}>Esta orden la tiene {nm(o.by)}.</div>
        ) : (
          <div className="space-y-2">
            <div><div className="text-xs mb-1" style={{ color: C.gray }}>Qué se hizo</div>
              <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe el trabajo realizado" className="text-sm border rounded-md px-2 py-1.5 w-full resize-y" style={{ background: C.panel, color: C.ink, borderColor: C.line }} /></div>
            <div><div className="text-xs mb-1" style={{ color: C.gray }}>Materiales usados</div>
              <input value={form.mat} onChange={e => setForm(f => ({ ...f, mat: e.target.value }))} placeholder="Ej. 1 bombillo LED, silicona" className="text-sm border rounded-md px-2 py-1.5 w-full" style={{ background: C.panel, color: C.ink, borderColor: C.line }} /></div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => upd(o.so, n => { n.photos += 1; }, "foto agregada")}>Agregar foto ({o.photos})</Button>
              {o.status === "tomada" && <Button variant="ghost" onClick={() => upd(o.so, n => { n.status = "proceso"; }, `${nm(me)} inició el trabajo`)}>Iniciar trabajo</Button>}
              <Button variant="green" disabled={!myCode} onClick={close}>Cerrar y enviar a HotSOS</Button>
            </div>
            {myCode ? <div className="text-xs" style={{ color: C.gray }}>Se cerrará en HotSOS con tu código de acceso, a tu nombre.</div>
              : <div className="rounded-md p-2 text-sm" style={{ background: C.amberSoft, color: C.amber }}>Falta registrar tu código de HotSOS. Ve a la pestaña «Mi código HotSOS».</div>}
          </div>
        )}
        <div className={`${lbl} mt-4`} style={{ color: C.gray }}>Historial de esta orden</div>
        {o.log.length ? o.log.map((l, i) => <div key={i} className="flex gap-3 text-sm py-1 border-b border-dashed" style={{ borderColor: C.line, color: C.ink }}><span className="font-mono text-xs" style={{ color: C.gray, minWidth: 40 }}>{l.t}</span><span>{l.m}</span></div>) : <div className="text-sm" style={{ color: C.inkSoft }}>Sin movimientos.</div>}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md px-3 py-2 text-xs" style={{ background: C.amberSoft, color: C.amber }}><b>Prototipo de muestra.</b> Los datos son ejemplos con el formato de HotSOS. No hay conexión real con HotSOS ni se guarda ningún código.</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="font-semibold" style={{ color: C.ink }}>Órdenes de servicio HotSOS</div><div className="text-xs" style={{ color: C.gray }}>Hyatt Regency Cartagena · Mantenimiento</div></div>
        {canImpersonate && (
          <label className="flex items-center gap-2 text-xs" style={{ color: C.gray }}>Ver como
            <select value={asUser} onChange={e => { setAsUser(e.target.value); setSel(null); if (profiles[e.target.value]?.is_admin && tab === "cod") setTab("pan"); }} className="text-sm border rounded-md px-2 py-1" style={{ background: C.panel, color: C.ink, borderColor: C.line }}>
              <option value={currentUser}>{nm(currentUser)} (tú, administrador)</option>
              {techs.map(u => <option key={u} value={u}>{nm(u)} · técnico</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: C.line }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className="px-3 py-2 text-sm font-medium whitespace-nowrap" style={{ color: tab === k ? C.blue : C.gray, borderBottom: `2px solid ${tab === k ? C.blue : "transparent"}` }}>{l}</button>)}
      </div>

      {tab === "pan" && (
        <div className="space-y-3">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
            {[[sin, "Sin tomar", C.amber], [withTech, "En manos de un técnico", C.ink], [quejas, "Quejas de huésped abiertas", C.red], [closed.length, "Cerradas hoy", C.green], [pend, "Por enviar a HotSOS", pend ? C.amber : C.ink]].map(([n, l, c]) => (
              <div key={l} className={card} style={cs}><div className="text-2xl font-semibold tabular-nums" style={{ color: c }}>{n}</div><div className="text-xs" style={{ color: C.gray }}>{l}</div></div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Carga por técnico (abiertas / total)</div>
              {byT.length ? byT.map(x => <div key={x.u} className="flex items-center gap-2 text-sm my-1.5" style={{ color: C.ink }}><span className="truncate" style={{ width: 110 }}>{nm(x.u)}</span><div className="flex-1 rounded" style={{ background: C.bg, height: 10 }}><div className="rounded" style={{ width: `${(x.a + x.c) / maxT * 100}%`, height: 10, background: C.blue }} /></div><span className="tabular-nums text-xs" style={{ color: C.gray, width: 36, textAlign: "right" }}>{x.a}/{x.a + x.c}</span></div>) : <div className="text-sm" style={{ color: C.inkSoft }}>Aún no hay técnicos en la app.</div>}
            </div>
            <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Antigüedad de las abiertas</div>
              {[["Menos de 12 h", b1, C.blue], ["12 a 24 h", b2, C.amber], ["Más de 24 h", b3, C.red]].map(([l, n, c]) => <div key={l} className="flex items-center gap-2 text-sm my-1.5" style={{ color: C.ink }}><span style={{ width: 110 }}>{l}</span><div className="flex-1 rounded" style={{ background: C.bg, height: 10 }}><div className="rounded" style={{ width: `${n / maxB * 100}%`, height: 10, background: c }} /></div><span className="tabular-nums text-xs" style={{ color: C.gray, width: 36, textAlign: "right" }}>{n}</span></div>)}
              <div className="text-xs mt-1" style={{ color: C.gray }}>Las de más de 24 h son las que HotSOS marca como atrasadas.</div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Requieren atención ahora</div>
              {attention.length ? attention.map(o => <button key={o.so} onClick={() => { setSel(o.so); setTab("ord"); }} className="flex w-full justify-between gap-2 text-left py-1.5 border-b text-sm" style={{ borderColor: C.line, color: C.ink }}><span className="min-w-0"><span className="font-mono text-xs" style={{ color: C.gray }}>{o.so}</span> {o.place}<div className="text-xs" style={{ color: C.gray }}>{o.type} · {hsoAge(o.ageH)}</div></span>{o.guest ? <Pill tone="red">Queja</Pill> : statusPill(o)}</button>) : <div className="text-sm" style={{ color: C.inkSoft }}>Nada urgente.</div>}
            </div>
            <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Actividad reciente</div>
              {feed.length ? feed.map((f, i) => <div key={i} className="flex gap-3 text-sm py-1 border-b border-dashed" style={{ borderColor: C.line, color: C.ink }}><span className="font-mono text-xs" style={{ color: C.gray, minWidth: 40 }}>{f.t}</span><span><span className="font-mono text-xs" style={{ color: C.gray }}>SO# {f.so}</span> {f.m}</span></div>) : <div className="text-sm" style={{ color: C.inkSoft }}>Sin movimientos todavía. Prueba tomar una orden.</div>}
            </div>
          </div>
          {canImpersonate && <div className="flex gap-2 flex-wrap"><Button variant="ghost" onClick={simulate}>Simular orden nueva desde HotSOS</Button><Button variant="ghost" onClick={resetDemo}>Restablecer datos de muestra</Button></div>}
        </div>
      )}

      {tab === "ord" && (
        <div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {[["todas", "Todas"], ["sin", "Sin tomar"], ...(!meIsAdmin ? [["mias", "Mías"]] : []), ["abiertas", "Abiertas"], ["cerradas", "Cerradas"]].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className="px-3 py-1 rounded-full border text-sm" style={filter === k ? { background: C.blue, color: "#fff", borderColor: C.blue } : { background: C.panel, color: C.ink, borderColor: C.line }}>{l}</button>)}
          </div>
          <div className="grid gap-3 md:grid-cols-2 items-start">
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.line, background: C.panel }}>
              {rows.length ? rows.map(o => (
                <button key={o.so} onClick={() => setSel(o.so)} className="grid w-full text-left px-3 py-2 border-b gap-x-3" style={{ gridTemplateColumns: "auto 1fr auto", borderColor: C.line, background: sel === o.so ? C.blueSoft : C.panel }}>
                  <span className="text-xs font-mono rounded px-1.5 py-0.5 border self-start" style={o.pri === 1 ? { background: C.redSoft, color: C.red, borderColor: C.red } : { color: C.gray, borderColor: C.line }}>P{o.pri}</span>
                  <span className="min-w-0"><span className="font-semibold text-sm" style={{ color: C.ink }}>{o.place}</span><br /><span className="text-xs" style={{ color: C.inkSoft }}>{o.type}</span><br /><span className="text-xs font-mono" style={{ color: C.gray }}>SO# {o.so} · {hsoAge(o.ageH)}{o.by ? ` · ${nm(o.by)}` : ""}</span></span>
                  <span className="self-start">{o.guest ? <Pill tone="red">Queja</Pill> : statusPill(o)}</span>
                </button>
              )) : <div className="p-3 text-sm" style={{ color: C.inkSoft }}>No hay órdenes en este filtro.</div>}
            </div>
            <div>{detail()}</div>
          </div>
        </div>
      )}

      {tab === "his" && (
        <div className={card} style={cs}><div className={lbl} style={{ color: C.gray }}>Órdenes cerradas y quién las cerró</div>
          {closed.length ? <div className="overflow-x-auto"><table className="w-full text-sm" style={{ color: C.ink }}><thead><tr className="text-left text-xs" style={{ color: C.gray }}><th className="py-1 pr-2">SO#</th><th className="pr-2">Lugar</th><th className="pr-2">Técnico</th><th className="pr-2">Tomada</th><th className="pr-2">Cerrada</th><th>En HotSOS</th></tr></thead><tbody>
            {closed.map(o => <tr key={o.so} className="border-t" style={{ borderColor: C.line }}><td className="py-1.5 pr-2 font-mono text-xs">{o.so}</td><td className="pr-2">{o.place}<div className="text-xs" style={{ color: C.gray }}>{o.notes}</div></td><td className="pr-2">{nm(o.closedBy)}</td><td className="pr-2">{o.takenAt}</td><td className="pr-2">{o.closedAt}</td><td>{o.sync === "enviada" ? <Pill tone="green">Enviada</Pill> : <Pill tone="amber">Enviando</Pill>}</td></tr>)}
          </tbody></table></div> : <div className="text-sm" style={{ color: C.inkSoft }}>Todavía no hay órdenes cerradas.</div>}
        </div>
      )}

      {tab === "cod" && !meIsAdmin && (
        <div className={`${card} max-w-md`} style={cs}><div className={lbl} style={{ color: C.gray }}>Mi código de HotSOS</div>
          <div className="text-sm mb-2" style={{ color: C.inkSoft }}>Lo registras una sola vez. Cuando cierres una orden en QuinTech, se enviará a HotSOS con este código y quedará a tu nombre.</div>
          <div className="rounded-md p-2 text-sm mb-3" style={{ background: myCode ? C.greenSoft : C.amberSoft, color: myCode ? C.green : C.amber }}>{myCode ? "Código registrado y guardado cifrado." : "Todavía no has registrado tu código."}</div>
          <input type="password" value={codeInput} onChange={e => setCodeInput(e.target.value)} autoComplete="off" placeholder={myCode ? "••••••" : "Escríbelo aquí"} className="text-sm border rounded-md px-2 py-1.5 w-full mb-2" style={{ background: C.panel, color: C.ink, borderColor: C.line }} />
          <div className="flex gap-2">
            <Button onClick={() => { if (!codeInput) { showToast("Escribe un valor de ejemplo", false); return; } setCodeInput(""); save({ ...data, codes: { ...data.codes, [me]: true } }); showToast("Código guardado (demostración)"); }}>Guardar código</Button>
            {myCode && <Button variant="ghost" onClick={() => { const c = { ...data.codes }; delete c[me]; save({ ...data, codes: c }); showToast("Código borrado"); }}>Borrar mi código</Button>}
          </div>
          <div className="text-xs mt-2" style={{ color: C.gray }}>En este prototipo no se guarda nada de verdad.</div>
        </div>
      )}
    </div>
  );
}