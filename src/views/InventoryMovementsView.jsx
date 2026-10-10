import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Mail } from "lucide-react";
import { C, authHeaders, bufferToBase64, fmtDT, nowIso, todayStr } from "../shared/core";
import { Button } from "../shared/components";



export function InventoryMovementsView({ invMovements, invItems, bodegas, shelves, reportEmail, onLogSent, currentUser, tasks }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [topPeriod, setTopPeriod] = useState(30);
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const rows = useMemo(() => {
    return invMovements.map(mv => {
      const item = invItems.find(it => it.id === mv.itemId);
      const shelf = item ? shelves.find(s => s.id === item.shelfId) : null;
      const bodega = item ? bodegas.find(b => b.id === item.bodegaId) : null;
      const tarea = mv.taskId ? (tasks || []).find(t => t.id === mv.taskId) : null;
      return {
        fecha: mv.at, tipo: mv.type === "retiro" ? "Retiro" : mv.type === "entrada" ? "Entrada" : mv.type,
        repuesto: item?.name || "(repuesto eliminado)", sku: item?.sku || "", bodega: bodega?.name || "—",
        estanteria: shelf?.code || "—", cantidad: mv.quantity, saldo: mv.balanceAfter, por: mv.by, nota: mv.note || "",
        tarea: tarea?.titulo || (mv.taskId ? "(tarea eliminada)" : ""),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invMovements, invItems, bodegas, shelves, tasks]);

  const filtered = rows
    .filter(r => !onlyMine || r.por === currentUser)
    .filter(r => !search.trim() || `${r.repuesto} ${r.sku} ${r.bodega} ${r.estanteria} ${r.por}`.toLowerCase().includes(search.toLowerCase()));

  const topUsedParts = useMemo(() => {
    const cutoff = topPeriod ? Date.now() - topPeriod * 864e5 : null;
    const totals = new Map();
    for (const mv of invMovements) {
      if (mv.type !== "retiro") continue;
      if (cutoff && new Date(mv.at).getTime() < cutoff) continue;
      const item = invItems.find(it => it.id === mv.itemId);
      const key = item?.id || mv.itemId;
      const prev = totals.get(key) || { name: item?.name || "(repuesto eliminado)", sku: item?.sku || "", qty: 0, moves: 0 };
      prev.qty += Number(mv.quantity) || 0;
      prev.moves += 1;
      totals.set(key, prev);
    }
    return [...totals.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invMovements, invItems, topPeriod]);
  const maxTopQty = topUsedParts.length ? topUsedParts[0].qty : 0;

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Fecha", "Tipo", "Repuesto", "SKU", "Bodega", "Estantería", "Cantidad", "Saldo después", "Por", "Nota"];
    const data = filtered.map(r => [fmtDT(r.fecha), r.tipo, r.repuesto, r.sku, r.bodega, r.estanteria, r.cantidad, r.saldo, r.por, r.nota]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 18 }, { wch: 9 }, { wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    return wb;
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `movimientos-inventario-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel — revisa la conexión e intenta de nuevo." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    try {
      const wb = buildWorkbook();
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = bufferToBase64(out);
      const resp = await fetch("/api/send-report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `Movimientos de Inventario (Excel) — ${todayStr()}`,
          text: `Historial de movimientos de inventario (${filtered.length} registros) en Excel.`,
          attachmentBase64: base64,
          filename: `movimientos-inventario-${todayStr().replace(/\//g, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Movimientos de inventario (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Movimientos de Inventario</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Cada retiro y entrada queda registrado aquí — quién lo hizo, cuánto, de dónde, y cuánto quedó después. En tiempo real, apenas alguien escanea una estantería y confirma.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar en Excel</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Repuestos más usados</div>
          <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
            {[{ v: 30, l: "30 días" }, { v: 90, l: "90 días" }, { v: null, l: "Todo" }].map((opt, i) => (
              <button key={opt.l} onClick={() => setTopPeriod(opt.v)} className="px-2.5 py-1 font-medium"
                style={{ background: topPeriod === opt.v ? C.steelDark : C.panel, color: topPeriod === opt.v ? "#fff" : C.inkSoft, borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        {topUsedParts.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Sin retiros registrados en ese período.</div>}
        {topUsedParts.map((p, i) => (
          <div key={i} className="mb-1.5 last:mb-0">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span style={{ color: C.ink }}>{p.name}{p.sku ? ` · ${p.sku}` : ""}</span>
              <span className="font-semibold" style={{ color: C.ink }}>{p.qty} und. · {p.moves} retiro{p.moves === 1 ? "" : "s"}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.line }}>
              <div className="h-full rounded-full" style={{ width: `${maxTopQty ? (p.qty / maxTopQty) * 100 : 0}%`, background: C.amber }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por repuesto, bodega, estantería o quién lo hizo…"
          className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        <button onClick={() => setOnlyMine(v => !v)} className="text-xs font-semibold px-3 rounded-md border shrink-0" style={{ background: onlyMine ? C.steelDark : C.panel, color: onlyMine ? "#fff" : C.inkSoft, borderColor: onlyMine ? C.steelDark : C.line, minHeight: 38 }}>
          {onlyMine ? "✓ Solo lo mío" : "Solo lo mío"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2">Fecha</th>
              <th className="text-left px-2 py-2">Tipo</th>
              <th className="text-left px-2 py-2">Repuesto</th>
              <th className="text-left px-2 py-2">Bodega / Estantería</th>
              <th className="text-right px-2 py-2">Cantidad</th>
              <th className="text-right px-2 py-2">Saldo</th>
              <th className="text-left px-2 py-2">Por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{fmtDT(r.fecha)}</td>
                <td className="px-2 py-1.5" style={{ color: r.tipo === "Retiro" ? C.red : C.green, fontWeight: 600 }}>{r.tipo}</td>
                <td className="px-2 py-1.5" style={{ color: C.ink }}>
                  {r.repuesto}
                  {r.tarea && <div className="text-[10px]" style={{ color: C.blue }}>🔗 {r.tarea}</div>}
                </td>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{r.bodega} · {r.estanteria}</td>
                <td className="px-2 py-1.5 text-right" style={{ color: C.ink }}>{r.cantidad}</td>
                <td className="px-2 py-1.5 text-right font-semibold" style={{ color: C.ink }}>{r.saldo}</td>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{r.por}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-xs" style={{ color: C.gray }}>Sin movimientos registrados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 300 && <div className="text-xs mt-2" style={{ color: C.gray }}>Mostrando los 300 más recientes — descarga el Excel para ver todos ({filtered.length}).</div>}
    </div>
  );
}