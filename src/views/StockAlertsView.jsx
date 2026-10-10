import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, ChevronDown, ChevronRight, Download, Mail, Sparkles, TrendingDown } from "lucide-react";
import { C, bumpAiUsage, computeLowStock, computeReorderForecast, generateStockAlertsPdf, nowIso, requestReorderNotes, sendStockAlertsEmailAuto, sortRows, todayStr } from "../shared/core";
import { Badge, Button, StatCard } from "../shared/components";



export function StockAlertsView({ invItems, invMovements, bodegas, shelves, reportEmail, onLogSent, currentUser }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ---- Sugerencias de reorden (proyección por ritmo de consumo, no solo cuando ya está bajo) ----
  const [reorderNotes, setReorderNotes] = useState(null);
  const [reorderGenerating, setReorderGenerating] = useState(false);
  const [reorderError, setReorderError] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const onSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const low = useMemo(() => computeLowStock(invItems).map(it => {
    const pct = it.minThreshold > 0 ? Math.round((it.quantity / it.minThreshold) * 100) : 0;
    return {
      ...it,
      bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
      shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
      pct, critical: it.quantity <= it.minThreshold * 0.5,
    };
  }), [invItems, bodegas, shelves]);
  const sortedLow = useMemo(() => sortRows(low, sort), [low, sort]);

  const forecast = useMemo(() => computeReorderForecast(invItems, invMovements).map(it => ({
    ...it,
    bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
    shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
  })), [invItems, invMovements, bodegas, shelves]);

  // ---- Repuestos que nunca se piden: tienen stock pero jamás se ha registrado un retiro. No
  // significa que sobren de una vez — puede ser un repuesto de emergencia que nunca ha hecho
  // falta — pero vale la pena revisarlos para no seguir comprando/guardando algo que no se usa. ----
  const expiringSoon = useMemo(() => {
    const cutoff = Date.now() + 30 * 86400000;
    return (invItems || []).filter(it => it.fechaVencimiento && new Date(it.fechaVencimiento).getTime() <= cutoff)
      .map(it => ({ ...it, bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—", shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—" }))
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  }, [invItems, bodegas, shelves]);
  const [showNeverUsed, setShowNeverUsed] = useState(false);
  const neverUsed = useMemo(() => {
    const usedIds = new Set((invMovements || []).filter(m => m.type === "retiro").map(m => m.itemId));
    return (invItems || []).filter(it => it.quantity > 0 && !usedIds.has(it.id)).map(it => ({
      ...it,
      bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
      shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
    }));
  }, [invItems, invMovements, bodegas, shelves]);

  const doGenerateReorderNotes = async () => {
    setReorderGenerating(true); setReorderError(null); setReorderNotes(null);
    try {
      const res = await requestReorderNotes({ items: forecast.map(f => ({
        nombre: f.name, cantidadActual: f.quantity, unidad: f.unit, consumidoUltimos30dias: f.consumedInWindow,
        diasEstimadosRestantes: f.daysUntilOut, yaEstaBajoElMinimo: f.alreadyLow, cantidadSugerida: f.suggestedQty,
      })) });
      if (res.ok) { setReorderNotes(res.notes); bumpAiUsage("reorderNotes"); }
      else setReorderError(res.message || "No se pudo redactar la nota.");
    } catch {
      setReorderError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setReorderGenerating(false);
  };

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateStockAlertsPdf(low, currentUser);
      doc.save(`lista-de-compras-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };
  const doDownloadExcel = () => {
    setDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      const header = ["Repuesto", "SKU", "Bodega", "Estantería", "Cantidad actual", "Mínimo", "Unidad"];
      const data = low.map(it => [it.name, it.sku || "", it.bodegaName, it.shelfCode, it.quantity, it.minThreshold, it.unit]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, "Lista de compras");
      XLSX.writeFile(wb, `lista-de-compras-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel — revisa la conexión e intenta de nuevo." }); }
    setDownloading(false);
  };
  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendStockAlertsEmailAuto(emailTo.trim(), low, currentUser);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Alertas de stock (correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Alertas de Stock</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Repuestos que llegaron a su cantidad mínima y necesitan reposición.</p>

      {low.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Todo el inventario está por encima de su mínimo. Nada que reponer por ahora.</p>
      ) : (
        <>
          <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Lista de compras</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
              <Button size="sm" variant="ghost" onClick={doDownload}>o descargar en PDF</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
                className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
              <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
            </div>
            {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
          </div>

          {forecast.length > 0 && (
            <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.amber, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={15} color={C.amber} />
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>
                  Se van a agotar pronto según el consumo — {forecast.length} repuesto(s)
                </div>
              </div>
              <p className="text-xs mb-3" style={{ color: C.gray }}>
                Esto no es solo "ya está bajo" — es una proyección con el ritmo real de los últimos 30 días. Algunos de estos
                todavía tienen stock por encima del mínimo, pero se están gastando rápido.
              </p>
              <div className="space-y-2 mb-3">
                {forecast.map(it => (
                  <div key={it.id} className="rounded-md p-2 flex items-center justify-between gap-2" style={{ background: it.alreadyLow ? C.redSoft : C.amberSoft }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: C.ink }}>
                        {it.name}{it.sku ? ` · ${it.sku}` : ""}
                        {it.alreadyLow && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.red, color: "#fff" }}>YA BAJO EL MÍNIMO</span>}
                      </div>
                      <div className="text-xs" style={{ color: C.inkSoft }}>
                        {it.bodegaName} · Estantería {it.shelfCode} · consumo: {it.dailyRate} {it.unit}/día
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: it.daysUntilOut <= 7 ? C.red : "#8a5a00" }}>
                        {it.daysUntilOut <= 0 ? "Ya agotado" : `${it.daysUntilOut} día(s)`}
                      </div>
                      <div className="text-xs" style={{ color: C.gray }}>pedir ≈ {it.suggestedQty} {it.unit}</div>
                    </div>
                  </div>
                ))}
              </div>

              {!reorderNotes && (
                <Button size="sm" icon={Sparkles} disabled={reorderGenerating} onClick={doGenerateReorderNotes}>
                  {reorderGenerating ? "Redactando…" : "Redactar nota de prioridad con IA"}
                </Button>
              )}
              {reorderError && <div className="text-xs mt-2" style={{ color: C.red }}>{reorderError}</div>}
              {reorderNotes && (
                <div className="mt-1">
                  <div className="text-sm rounded-md p-2 mb-2" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink }}>{reorderNotes}</div>
                  <Button size="sm" variant="ghost" disabled={reorderGenerating} onClick={doGenerateReorderNotes}>Volver a generar</Button>
                </div>
              )}
            </div>
          )}

          {expiringSoon.length > 0 && (
            <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.red }}>
                ⚠️ Repuestos vencidos o por vencer — {expiringSoon.length}
              </div>
              <div className="space-y-1">
                {expiringSoon.map(it => {
                  const diasVence = Math.floor((new Date(it.fechaVencimiento) - Date.now()) / 86400000);
                  return (
                    <div key={it.id} className="text-xs flex items-center justify-between gap-2 py-0.5">
                      <span style={{ color: C.ink }}>{it.name}{it.sku ? ` · ${it.sku}` : ""} — {it.bodegaName} · {it.shelfCode}</span>
                      <span className="font-semibold" style={{ color: C.red }}>{diasVence < 0 ? "Vencido" : `${diasVence}d`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {neverUsed.length > 0 && (
            <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
              <button onClick={() => setShowNeverUsed(v => !v)} className="w-full flex items-center justify-between text-left">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>
                  Repuestos que nunca se han pedido — {neverUsed.length}
                </div>
                {showNeverUsed ? <ChevronDown size={14} color={C.gray} /> : <ChevronRight size={14} color={C.gray} />}
              </button>
              {showNeverUsed && (
                <>
                  <p className="text-xs mt-1.5 mb-2" style={{ color: C.gray }}>
                    Tienen stock guardado pero nunca se ha registrado un retiro. No quiere decir que sobren de una vez —
                    puede ser un repuesto de emergencia que nunca ha hecho falta — pero vale la pena revisarlos.
                  </p>
                  <div className="space-y-1">
                    {neverUsed.slice(0, 30).map(it => (
                      <div key={it.id} className="text-xs flex items-center justify-between gap-2 py-0.5">
                        <span style={{ color: C.ink }}>{it.name}{it.sku ? ` · ${it.sku}` : ""}</span>
                        <span style={{ color: C.gray }}>{it.bodegaName} · {it.shelfCode} · {it.quantity} {it.unit}</span>
                      </div>
                    ))}
                    {neverUsed.length > 30 && <div className="text-xs" style={{ color: C.gray }}>y {neverUsed.length - 30} más…</div>}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Stock bajo" value={low.length} valueColor={low.length ? "#8a5a00" : C.ink}
              leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><TrendingDown size={18} color="#8a5a00" /></div>} />
            <StatCard label="Stock crítico (≤50% del mínimo)" value={low.filter(it => it.quantity <= it.minThreshold * 0.5).length} valueColor={C.red}
              leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.redSoft }}><AlertTriangle size={18} color={C.red} /></div>} />
          </div>

          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: C.line, background: C.panel }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <SortableTh label="Repuesto" sortKey="name" sort={sort} onSort={onSort} />
                  <SortableTh label="Ubicación" sortKey="bodegaName" sort={sort} onSort={onSort} />
                  <SortableTh label="Cantidad" sortKey="quantity" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="Mínimo" sortKey="minThreshold" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="% del mínimo" sortKey="pct" sort={sort} onSort={onSort} align="right" />
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: C.inkSoft }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedLow.map((it, i) => (
                  <tr key={it.id} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2" style={{ color: C.ink }}>{it.name}{it.sku ? <span style={{ color: C.gray }}> · {it.sku}</span> : ""}</td>
                    <td className="px-3 py-2" style={{ color: C.inkSoft }}>{it.bodegaName} · Est. {it.shelfCode}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: it.critical ? C.red : "#8a5a00" }}>{it.quantity} {it.unit}</td>
                    <td className="px-3 py-2 text-right" style={{ color: C.gray }}>{it.minThreshold} {it.unit}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: it.critical ? C.red : "#8a5a00" }}>{it.pct}%</td>
                    <td className="px-3 py-2"><Badge tone={it.critical ? "red" : "amber"}>{it.critical ? "Crítico" : "Bajo"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Cabecera de tabla ordenable — toca la columna y ordena ascendente/descendente, con una
 * flechita que muestra cuál columna manda y en qué sentido. */
function SortableTh({ label, sortKey, sort, onSort, align = "left" }) {
  const active = sort.key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)} className={`px-3 py-2 font-semibold cursor-pointer select-none text-${align}`}
      style={{ color: active ? C.ink : C.inkSoft, minHeight: 32 }}>
      <span className="inline-flex items-center gap-1" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        {label}
        <span style={{ color: active ? C.amber : C.line, fontSize: 10 }}>{active && sort.dir === "desc" ? "▼" : "▲"}</span>
      </span>
    </th>
  );
}