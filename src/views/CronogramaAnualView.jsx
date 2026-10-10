import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, Download, Mail } from "lucide-react";
import { C, MESES_LABELS, MTTO_ESTADO_COLORS, authHeaders, bufferToBase64, computeUpcoming7Days, cronogramaCellVisual, fmtDT, normalizeSearchText, nowIso, todayStr } from "../shared/core";
import { Button, Lightbox } from "../shared/components";
import { CronogramaDetailDrawer } from "./CronogramaDetailDrawer";



export function CronogramaAnualView({ equipos, mttoCronograma, mttoLog, invItems, onLogMaintenance, onUpdateCronograma, reportEmail, onLogSent, currentUser }) {
  const activeEquipos = equipos.filter(e => e.active !== false);
  const sistemas = useMemo(() => [...new Set(activeEquipos.map(e => e.sistema))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeEquipos]);
  const [sistemaFilter, setSistemaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState(""); // "" | "atrasado" | "proximo" | "ejecutado" | "pendiente"
  const [search, setSearch] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); // { equipo, mesNum } | null
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [cronoViewMode, setCronoViewMode] = useState("tabla"); // "tabla" | "calendario" | "semana"
  const now = new Date();

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { if (!sistemaFilter && sistemas.length) setSistemaFilter(sistemas[0]); }, [sistemas, sistemaFilter]);

  const upcoming7Days = useMemo(() => computeUpcoming7Days(activeEquipos, mttoLog, mttoCronograma, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeEquipos, mttoLog, mttoCronograma]);

  // ===== % de cumplimiento del cronograma por sistema, del mes en curso: de lo programado para
  // este mes, cuánto ya tiene un mantenimiento real registrado. =====
  const cumplimientoPorSistema = useMemo(() => {
    const mesActual = now.getMonth() + 1;
    return sistemas.map(sis => {
      const eqsDelSistema = activeEquipos.filter(e => e.sistema === sis);
      const programadosEsteMes = eqsDelSistema.filter(eq => mttoCronograma.some(c => c.equipoId === eq.id && c.mesNum === mesActual && c.programado));
      const cumplidos = programadosEsteMes.filter(eq => mttoLog.some(r => r.equipoId === eq.id && new Date(r.fecha).getMonth() + 1 === mesActual && new Date(r.fecha).getFullYear() === now.getFullYear()));
      return { sistema: sis, total: programadosEsteMes.length, cumplidos: cumplidos.length, pct: programadosEsteMes.length ? Math.round((cumplidos.length / programadosEsteMes.length) * 100) : null };
    }).filter(s => s.total > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sistemas, activeEquipos, mttoCronograma, mttoLog]);

  const eqInSistema = activeEquipos
    .filter(e => e.sistema === sistemaFilter)
    .filter(e => !search.trim() || normalizeSearchText(e.nombre).includes(normalizeSearchText(search.trim())))
    .sort((a, b) => sortAsc ? a.nombre.localeCompare(b.nombre, "es") : b.nombre.localeCompare(a.nombre, "es"));

  const cronoByEquipo = useMemo(() => {
    const map = {};
    eqInSistema.forEach(eq => {
      map[eq.id] = {};
      mttoCronograma.filter(c => c.equipoId === eq.id).forEach(c => { map[eq.id][c.mesNum] = c; });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eqInSistema, mttoCronograma]);

  // Cuando hay filtro de estado activo, solo se muestran los equipos que tengan AL MENOS una
  // celda con ese estado en el año — no oculta el resto de las celdas de esa fila, solo filtra
  // qué filas vale la pena mostrar.
  const eqVisible = !estadoFilter ? eqInSistema : eqInSistema.filter(eq => {
    for (let m = 1; m <= 12; m++) {
      const visual = cronogramaCellVisual(cronoByEquipo[eq.id]?.[m], m, now);
      if (visual.tone === estadoFilter) return true;
    }
    return false;
  });

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Equipo", ...MESES_LABELS];
    const data = eqVisible.map(eq => {
      const row = [eq.nombre];
      for (let m = 1; m <= 12; m++) {
        const c = cronoByEquipo[eq.id]?.[m];
        row.push(c ? (MTTO_ESTADO_COLORS[c.estado]?.label || c.estado) : "");
      }
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 40 }, ...MESES_LABELS.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, ws, (sistemaFilter || "Cronograma").slice(0, 31));
    return wb;
  };

  const [downloadingFull, setDownloadingFull] = useState(false);
  const buildFullWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();
    sistemas.forEach(sis => {
      const eqs = activeEquipos.filter(e => e.sistema === sis).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      const header = ["Equipo", ...MESES_LABELS];
      const data = eqs.map(eq => {
        const row = [eq.nombre];
        for (let m = 1; m <= 12; m++) {
          const c = mttoCronograma.find(c2 => c2.equipoId === eq.id && c2.mesNum === m);
          row.push(c ? (MTTO_ESTADO_COLORS[c.estado]?.label || c.estado) : "");
        }
        return row;
      });
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws["!cols"] = [{ wch: 40 }, ...MESES_LABELS.map(() => ({ wch: 12 }))];
      let name = sis.slice(0, 31) || "Sistema";
      let suffix = 1;
      while (usedNames.has(name)) { name = `${sis.slice(0, 28)}(${++suffix})`; }
      usedNames.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    return wb;
  };
  const doDownloadFull = () => {
    setDownloadingFull(true);
    try {
      const wb = buildFullWorkbook();
      XLSX.writeFile(wb, `cronograma-anual-completo-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel completo — revisa la conexión e intenta de nuevo." }); }
    setDownloadingFull(false);
  };
  const doSendFull = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    try {
      const wb = buildFullWorkbook();
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = bufferToBase64(out);
      const resp = await fetch("/api/send-report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `Cronograma Anual Completo de Mantenimiento — ${todayStr()}`,
          text: `Cronograma anual completo, con una pestaña por cada sistema (${sistemas.length} sistemas).`,
          attachmentBase64: base64,
          filename: `cronograma-anual-completo-${todayStr().replace(/\//g, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Cronograma anual completo (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `cronograma-${sistemaFilter.replace(/[^a-z0-9]+/gi, "-")}.xlsx`);
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
          subject: `Cronograma de Mantenimiento — ${sistemaFilter}`,
          text: `Cronograma anual de mantenimiento del sistema ${sistemaFilter}.`,
          attachmentBase64: base64,
          filename: `cronograma-${sistemaFilter.replace(/[^a-z0-9]+/gi, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Cronograma de mantenimiento (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  const filterSelectClass = "text-sm border rounded-md px-2 py-2 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Cronograma Anual de Mantenimiento</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>El año completo, mes a mes, por sistema — toca cualquier celda para ver el detalle.</p>

      {cumplimientoPorSistema.length > 0 && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>% de cumplimiento este mes, por sistema</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cumplimientoPorSistema.map(s => (
              <div key={s.sistema} className="rounded-md p-2" style={{ background: C.bg }}>
                <div className="text-[10px] truncate" style={{ color: C.gray }}>{s.sistema}</div>
                <div className="text-lg font-bold" style={{ color: s.pct >= 80 ? C.green : s.pct >= 50 ? C.amber : C.red }}>{s.pct}%</div>
                <div className="text-[10px]" style={{ color: C.gray }}>{s.cumplidos}/{s.total} equipos</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-xl border p-3 mb-3 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Sistema</div>
          <select value={sistemaFilter} onChange={e => setSistemaFilter(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Estado del cronograma</div>
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="atrasado">Solo atrasados</option>
            <option value="proximo">Solo por vencer</option>
            <option value="programado">Solo programados</option>
            <option value="ejecutado">Solo ejecutados</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Buscar equipo</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del equipo…" className={filterSelectClass} style={{ ...filterSelectStyle, width: "100%" }} />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: C.gray }}>
          <span className="flex items-center gap-1"><span style={{ color: C.green }}>●</span> Ejecutado</span>
          <span className="flex items-center gap-1"><span style={{ color: C.amber }}>●</span> Por vencer</span>
          <span className="flex items-center gap-1"><span style={{ color: C.blue }}>●</span> Programado</span>
          <span className="flex items-center gap-1"><span style={{ color: C.red }}>●</span> Atrasado</span>
          <span className="flex items-center gap-1"><span style={{ color: C.gray }}>○</span> Sin programar</span>
        </div>
        <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
          {[{ v: "tabla", l: "Tabla" }, { v: "calendario", l: "Calendario" }, { v: "semana", l: `Próximos 7 días${upcoming7Days.length ? ` (${upcoming7Days.length})` : ""}` }].map((opt, i) => (
            <button key={opt.v} onClick={() => setCronoViewMode(opt.v)} className="px-3 py-1.5 font-semibold"
              style={{ background: cronoViewMode === opt.v ? C.steelDark : C.panel, color: cronoViewMode === opt.v ? "#fff" : C.inkSoft, borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este sistema (Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
          <Button variant="ghost" icon={Download} disabled={downloadingFull} onClick={doDownloadFull}>{downloadingFull ? "Generando…" : "Descargar cronograma completo (todos los sistemas)"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar este sistema"}</Button>
          <Button icon={Mail} variant="ghost" disabled={sending} onClick={doSendFull}>{sending ? "Enviando…" : "Enviar cronograma completo"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      {cronoViewMode === "semana" ? (
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <p className="text-xs mb-3" style={{ color: C.gray }}>
            Equipos a los que, según su frecuencia programada, les toca mantenimiento esta semana (o ya se pasaron un poco) —
            calculado a partir de cuándo fue su último mantenimiento real, no de una fecha fija en el calendario.
          </p>
          {upcoming7Days.length === 0 ? (
            <div className="text-sm flex items-center gap-1.5 py-4 justify-center" style={{ color: C.green }}><CheckCircle2 size={16} /> Nada pendiente para esta semana.</div>
          ) : (
            <div className="space-y-1.5">
              {upcoming7Days.map(u => (
                <div key={u.equipo.id} className="rounded-md p-2 flex items-center justify-between gap-2" style={{ background: u.diasParaVencer <= 0 ? C.redSoft : C.amberSoft }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>{u.equipo.nombre}</div>
                    <div className="text-xs" style={{ color: C.gray }}>{u.equipo.sistema} · cada {u.frecuenciaEsperadaDias} días · último: {fmtDT(u.lastDate)}</div>
                  </div>
                  <div className="text-sm font-bold shrink-0" style={{ color: u.diasParaVencer <= 0 ? C.red : "#8a5a00" }}>
                    {u.diasParaVencer <= 0 ? `Vencido hace ${-u.diasParaVencer}d` : `En ${u.diasParaVencer}d`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : cronoViewMode === "tabla" ? (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.steelDark, color: "#fff" }}>
                <th onClick={() => setSortAsc(v => !v)} className="text-left px-2 py-2 sticky left-0 cursor-pointer select-none" style={{ minWidth: 220, background: C.steelDark, zIndex: 1 }}>
                  Equipo <span style={{ fontSize: 9, color: "#cdd8e2" }}>{sortAsc ? "▲" : "▼"}</span>
                </th>
                {MESES_LABELS.map(m => <th key={m} className="px-2 py-2 text-center" style={{ minWidth: 56 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {eqVisible.map((eq, i) => (
                <tr key={eq.id} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                  <td className="px-2 py-1.5 sticky left-0" style={{ color: C.ink, background: i % 2 ? C.cardAlt : C.panel }}>{eq.nombre}</td>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map(m => {
                    const c = cronoByEquipo[eq.id]?.[m];
                    const visual = cronogramaCellVisual(c, m, now);
                    return (
                      <td key={m} onClick={() => setSelectedCell({ equipo: eq, mesNum: m })}
                        className="px-1 py-1.5 text-center cursor-pointer transition hover:opacity-75"
                        style={{ background: visual.bg, color: visual.fg, fontWeight: visual.tone !== "vacio" ? 600 : 400, minHeight: 32 }}>
                        {visual.tone === "vacio" ? "—" : visual.label.slice(0, 4)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {eqVisible.length === 0 && (
                <tr><td colSpan={13} className="px-2 py-6 text-center text-xs" style={{ color: C.gray }}>Ningún equipo coincide con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MESES_LABELS.map((mLabel, idx) => {
            const mNum = idx + 1;
            const isCurrentMonth = mNum === now.getMonth() + 1;
            const cellsThisMonth = eqVisible.map(eq => ({ eq, visual: cronogramaCellVisual(cronoByEquipo[eq.id]?.[mNum], mNum, now) }))
              .filter(c => c.visual.tone !== "vacio");
            return (
              <div key={mLabel} className="rounded-xl border p-3" style={{ borderColor: isCurrentMonth ? C.amber : C.line, background: C.panel, borderWidth: isCurrentMonth ? 2 : 1 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{mLabel}</div>
                  {isCurrentMonth && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.amberSoft, color: C.amber }}>Mes actual</span>}
                </div>
                {cellsThisMonth.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Nada programado.</div>}
                <div className="flex flex-col gap-1">
                  {cellsThisMonth.map(({ eq, visual }) => (
                    <button key={eq.id} onClick={() => setSelectedCell({ equipo: eq, mesNum: mNum })}
                      className="text-left text-xs rounded-md px-2 py-1.5 flex items-center justify-between gap-2 transition hover:opacity-80"
                      style={{ background: visual.bg, color: visual.fg }}>
                      <span className="truncate">{eq.nombre}</span>
                      <span className="shrink-0 font-semibold">{visual.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCell && (
        <CronogramaDetailDrawer equipo={selectedCell.equipo} mesNum={selectedCell.mesNum}
          entry={cronoByEquipo[selectedCell.equipo.id]?.[selectedCell.mesNum]}
          equipoCronograma={mttoCronograma.filter(c => c.equipoId === selectedCell.equipo.id)}
          mttoLog={mttoLog} invItems={invItems} onClose={() => setSelectedCell(null)}
          onReprogram={onUpdateCronograma} onLogExtraordinary={onLogMaintenance} onZoom={setLightboxUrl} />
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}