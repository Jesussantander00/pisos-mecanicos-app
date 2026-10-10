import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Download, Mail, MessageCircle, Search, Sparkles } from "lucide-react";
import { C, CUSTOM_REPORT_SECTIONS, buildReportText, buildWeeklySummaryInput, buildWhatsAppLink, bumpAiUsage, downloadReportFile, fmtDT, generateCustomReportPdf, generateFullReportPdf, nowIso, requestWeeklySummary, sendCustomReportEmailAuto, sendFullReportEmailAuto, sendWeeklySummaryEmailAuto, todayStr } from "../shared/core";
import { Button, Pill } from "../shared/components";



/* ============================================================
   VISTA: HISTORIAL / REPORTES
   ============================================================ */
/**
 * Comparador de fotos antes/después con un deslizador — arrastras la barra para revelar más de
 * una foto u otra. Solo CSS, sin librerías externas: la foto "después" está encima con su ancho
 * recortado según la posición del deslizador, y debajo se ve la de "antes" completa.
 */
function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const [pos, setPos] = useState(50); // % de la izquierda que muestra la foto de "después"
  return (
    <div>
      <div className="relative rounded-md overflow-hidden select-none" style={{ maxWidth: 320, aspectRatio: "4/3", background: "#000" }}>
        <img loading="lazy" src={beforeUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img loading="lazy" src={afterUrl} alt="Después" className="h-full object-cover" style={{ width: "320px", maxWidth: "none" }} draggable={false} />
        </div>
        <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, width: 2, background: "#fff", transform: "translateX(-1px)" }} />
        <div className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Después</div>
        <div className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Antes</div>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))}
        className="w-full mt-1" style={{ maxWidth: 320 }} />
    </div>
  );
}

export function ReportsView({ issueHistory, roundsIndex, activeIssues, latestValues, mttoLog, mttoEquipos, reportEmail, reportWhatsapp, onOpenPrint, sentReports, onLogSent, currentUser }) {
  const [tab, setTab] = useState("incidentes");
  const [q, setQ] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [waTo, setWaTo] = useState(reportWhatsapp || "");
  const [sendMsg, setSendMsg] = useState(null);
  const [downloadMsg, setDownloadMsg] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingAutoFull, setSendingAutoFull] = useState(false);

  // ---- Resumen semanal con IA ----
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklyError, setWeeklyError] = useState(null);
  const [weeklySending, setWeeklySending] = useState(false);
  const [weeklySendMsg, setWeeklySendMsg] = useState(null);

  // ---- Reporte personalizado ----
  const [customSections, setCustomSections] = useState(["activos", "resueltos"]);
  const [customBusy, setCustomBusy] = useState(false);
  const [customMsg, setCustomMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { setWaTo(reportWhatsapp || ""); }, [reportWhatsapp]);

  const filteredIssues = issueHistory
    .filter(h => !q || (h.name + h.floorName + h.observation + h.solution).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));

  const filteredRounds = roundsIndex
    .filter(r => !q || (r.floorName + r.user).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  const doDownloadPdf = async () => {
    setGeneratingPdf(true); setDownloadMsg(null);
    try {
      const doc = await generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, currentUser);
      const filename = `informe-equipos-${todayStr().replace(/\//g, "-")}.pdf`;
      doc.save(filename);
      setDownloadMsg("✓ PDF descargado con el detalle de los 12 pisos y todos los equipos (los que no tienen datos aparecen como 'Sin datos registrados').");
      onLogSent({ to: "(descarga local)", method: "PDF descargado", ok: true, message: filename, sentBy: currentUser, sentAt: nowIso() });
    } catch (e) {
      const ok = downloadReportFile(activeIssues, issueHistory, roundsIndex);
      setDownloadMsg(ok
        ? "No se pudo generar el PDF (revisa la conexión a internet del dispositivo, se necesita la primera vez). Se descargó en su lugar un archivo .html: ábrelo y usa Imprimir → Guardar como PDF."
        : "No se pudo generar la descarga. Usa 'Ver informe en pantalla' como alternativa.");
    }
    setGeneratingPdf(false);
  };

  const doOpenMailClient = () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    const text = buildReportText(activeIssues, issueHistory, roundsIndex);
    const subject = `Informe de equipos - QuinTech (${todayStr()})`;
    const body = text.length > 1500 ? text.slice(0, 1500) + "\n\n(Resumen. Descarga el PDF completo con todos los pisos desde la app y adjúntalo aquí.)" : text;
    window.open(`mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    onLogSent({ to: emailTo.trim(), method: "mailto (borrador manual)", ok: true, message: "Borrador abierto en el cliente de correo del dispositivo.", sentBy: currentUser, sentAt: nowIso() });
    setSendMsg({ ok: true, text: "Se abrió un borrador con el resumen en tu correo. Adjunta el PDF descargado si necesitas el detalle completo, y da clic en Enviar allá." });
  };

  const doSendAutoFull = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSendingAutoFull(true); setSendMsg(null);
    const res = await sendFullReportEmailAuto(emailTo.trim(), latestValues, activeIssues, issueHistory, roundsIndex, currentUser);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Informe completo (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSendingAutoFull(false);
  };

  const doOpenWhatsapp = () => {
    if (!waTo.trim()) { setSendMsg({ ok: false, text: "Escribe un número de WhatsApp (con indicativo de país, ej. 57...)." }); return; }
    const text = buildReportText(activeIssues, issueHistory, roundsIndex);
    window.open(buildWhatsAppLink(waTo.trim(), text), "_blank");
    onLogSent({ to: waTo.trim(), method: "WhatsApp (wa.me)", ok: true, message: "Se abrió WhatsApp con el resumen listo para enviar.", sentBy: currentUser, sentAt: nowIso() });
    setSendMsg({ ok: true, text: "Se abrió WhatsApp con el resumen como mensaje de texto. Adjunta el PDF descargado a mano si necesitas el detalle completo, y da enviar allá." });
  };

  const weekLabel = (() => {
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7);
    const fmt = (d) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const doGenerateWeekly = async () => {
    setWeeklyGenerating(true); setWeeklyError(null); setWeeklySummary(null); setWeeklySendMsg(null);
    try {
      const { resolved, pending, correctivos } = buildWeeklySummaryInput(issueHistory, activeIssues, mttoLog, mttoEquipos, 7);
      const res = await requestWeeklySummary({ weekLabel, resolved, pending, correctivos });
      if (res.ok) { setWeeklySummary(res.summary); bumpAiUsage("weeklySummaries"); }
      else setWeeklyError(res.message || "No se pudo redactar el resumen.");
    } catch {
      setWeeklyError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setWeeklyGenerating(false);
  };

  const doSendWeekly = async () => {
    if (!emailTo.trim()) { setWeeklySendMsg({ ok: false, text: "Escribe un correo destino arriba." }); return; }
    setWeeklySending(true); setWeeklySendMsg(null);
    const res = await sendWeeklySummaryEmailAuto(emailTo.trim(), weeklySummary, weekLabel, currentUser);
    setWeeklySendMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Resumen semanal (correo automático con IA)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setWeeklySending(false);
  };

  const toggleCustomSection = (id) => setCustomSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const customReportData = { activeIssues, issueHistory, roundsIndex, latestValues, mttoLog, mttoEquipos };
  const doDownloadCustom = async () => {
    if (customSections.length === 0) { setCustomMsg({ ok: false, text: "Elige al menos una sección." }); return; }
    setCustomBusy(true); setCustomMsg(null);
    try {
      const doc = await generateCustomReportPdf(customSections, customReportData, currentUser);
      doc.save(`reporte-personalizado-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setCustomMsg({ ok: false, text: "No se pudo generar el PDF." }); }
    setCustomBusy(false);
  };
  const doSendCustom = async () => {
    if (customSections.length === 0) { setCustomMsg({ ok: false, text: "Elige al menos una sección." }); return; }
    if (!emailTo.trim()) { setCustomMsg({ ok: false, text: "Escribe un correo destino arriba." }); return; }
    setCustomBusy(true); setCustomMsg(null);
    const res = await sendCustomReportEmailAuto(emailTo.trim(), customSections, customReportData, currentUser);
    setCustomMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Reporte personalizado", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setCustomBusy(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Reportes</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Genera el informe completo en PDF, o comparte un resumen por correo/WhatsApp.</p>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF completo (los 12 pisos, todos los equipos)</div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Button variant="amber" icon={Download} disabled={generatingPdf} onClick={doDownloadPdf}>
            {generatingPdf ? "Generando PDF…" : "Descargar informe en PDF"}
          </Button>
          <Button variant="ghost" onClick={onOpenPrint}>Ver resumen en pantalla</Button>
        </div>
        {downloadMsg && <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{downloadMsg}</div>}

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAutoFull} onClick={doSendAutoFull}>{sendingAutoFull ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={doOpenMailClient}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp (envía un resumen en texto, no el PDF adjunto)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número con indicativo, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button variant="ghost" icon={MessageCircle} onClick={doOpenWhatsapp}>Enviar por WhatsApp</Button>
        </div>

        {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
        <div className="text-xs mt-2 rounded-md p-2" style={{ background: C.amberSoft, color: C.amber }}>
          El correo ahora sí manda el PDF completo adjunto de forma automática (usa el servidor propio de la app).
          WhatsApp sigue sin poder llevar archivos adjuntos por enlace bajo ninguna circunstancia — eso lo decide la
          plataforma de WhatsApp, no esta app — así que ahí solo se manda el resumen en texto; el PDF hay que
          adjuntarlo a mano si lo necesitas por ese medio.
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.amber, background: C.panel, color: C.ink }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={15} color={C.amber} />
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Resumen semanal con IA ({weekLabel})</div>
        </div>
        <p className="text-xs mb-2" style={{ color: C.gray }}>
          Redacta en español natural qué se dañó, qué se resolvió y qué sigue pendiente en los últimos 7 días —
          lo revisas antes de mandarlo, no se envía nada solo.
        </p>
        {!weeklySummary && (
          <Button size="sm" icon={Sparkles} disabled={weeklyGenerating} onClick={doGenerateWeekly}>
            {weeklyGenerating ? "Redactando…" : "Generar resumen de esta semana"}
          </Button>
        )}
        {weeklyError && <div className="text-xs mt-2" style={{ color: C.red }}>{weeklyError}</div>}
        {weeklySummary && (
          <div className="mt-1">
            <textarea value={weeklySummary} onChange={e => setWeeklySummary(e.target.value)} rows={6}
              className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" icon={Mail} disabled={weeklySending} onClick={doSendWeekly}>
                {weeklySending ? "Enviando…" : "Enviar por correo (al de arriba)"}
              </Button>
              <Button size="sm" variant="ghost" disabled={weeklyGenerating} onClick={doGenerateWeekly}>Volver a generar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setWeeklySummary(null); setWeeklySendMsg(null); }}>Descartar</Button>
            </div>
            {weeklySendMsg && <div className="text-xs mt-2" style={{ color: weeklySendMsg.ok ? C.green : C.red }}>{weeklySendMsg.text}</div>}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Reporte personalizado</div>
        <p className="text-xs mb-2" style={{ color: C.gray }}>Elige qué secciones incluir, en vez de los formatos fijos de siempre.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CUSTOM_REPORT_SECTIONS.map(s => (
            <label key={s.id} className="text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer select-none flex items-center gap-1.5"
              style={{ background: customSections.includes(s.id) ? C.amberSoft : C.bg, color: customSections.includes(s.id) ? "#7a5405" : C.inkSoft, border: `1px solid ${customSections.includes(s.id) ? C.amber : C.line}` }}>
              <input type="checkbox" checked={customSections.includes(s.id)} onChange={() => toggleCustomSection(s.id)} className="accent-current" />
              {s.label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" icon={Download} disabled={customBusy} onClick={doDownloadCustom}>Descargar PDF</Button>
          <Button size="sm" icon={Mail} disabled={customBusy} onClick={doSendCustom}>{customBusy ? "…" : "Enviar por correo (al de arriba)"}</Button>
        </div>
        {customMsg && <div className="text-xs mt-2" style={{ color: customMsg.ok ? C.green : C.red }}>{customMsg.text}</div>}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap mt-3">
        <Button size="sm" variant={tab === "incidentes" ? "primary" : "ghost"} onClick={() => setTab("incidentes")}>Historial de incidentes</Button>
        <Button size="sm" variant={tab === "rondas" ? "primary" : "ghost"} onClick={() => setTab("rondas")}>Rondas registradas</Button>
        <Button size="sm" variant={tab === "enviados" ? "primary" : "ghost"} onClick={() => setTab("enviados")}>Informes enviados</Button>
        <div className="ml-auto flex items-center gap-1.5 border rounded-md px-2 py-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <Search size={13} color={C.gray} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="text-sm outline-none" />
        </div>
      </div>

      {tab === "incidentes" && (
        <div>
          {filteredIssues.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin incidentes resueltos registrados aún.</div>}
          {filteredIssues.map((h, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Pill tone="gray"><Building2 size={11} /> {h.floorName}</Pill>
                <Pill tone="green"><CheckCircle2 size={12} /> Resuelto</Pill>
                <span className="text-xs" style={{ color: C.gray }}>Duración fuera de servicio: <b>{h.duration}</b></span>
              </div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>#{h.code} · {h.name}</div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2 text-xs" style={{ color: C.inkSoft }}>
                <div><b>Reportado:</b> {fmtDT(h.openedAt)} por {h.openedBy}<br /><span className="italic">"{h.observation}"</span></div>
                <div><b>Resuelto:</b> {fmtDT(h.resolvedAt)} por {h.resolvedBy}<br /><span className="italic">"{h.solution}"</span></div>
              </div>
              {h.beforePhotoUrl && h.afterPhotoUrl && (
                <div className="mt-2">
                  <BeforeAfterSlider beforeUrl={h.beforePhotoUrl} afterUrl={h.afterPhotoUrl} />
                </div>
              )}
              {(h.beforePhotoUrl || h.afterPhotoUrl) && !(h.beforePhotoUrl && h.afterPhotoUrl) && (
                <div className="mt-2 flex gap-2">
                  {h.beforePhotoUrl && <img loading="lazy" src={h.beforePhotoUrl} alt="Antes" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />}
                  {h.afterPhotoUrl && <img loading="lazy" src={h.afterPhotoUrl} alt="Después" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "rondas" && (
        <div>
          {filteredRounds.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Aún no se han guardado rondas.</div>}
          {filteredRounds.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2 flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{r.floorName}</div>
                <div className="text-xs" style={{ color: C.inkSoft }}>{fmtDT(r.savedAt)} · Turno {r.shift} · {r.user}</div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="gray">{r.itemCount} registrados</Pill>
                {r.damagedCount > 0 && <Pill tone="red">{r.damagedCount} dañados</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "enviados" && (
        <div>
          <p className="text-xs mb-2" style={{ color: C.gray }}>
            Este registro queda guardado dentro de la aplicación aunque el correo real falle, para que siempre puedas ver qué se intentó enviar y cuándo.
          </p>
          {(!sentReports || sentReports.length === 0) && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Aún no se ha intentado enviar ningún informe.</div>}
          {(sentReports || []).map((s, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {s.ok ? <Pill tone="green"><CheckCircle2 size={12} /> {s.method}</Pill> : <Pill tone="red"><AlertTriangle size={12} /> Falló · {s.method}</Pill>}
                <span className="text-xs" style={{ color: C.gray }}>{fmtDT(s.sentAt)} · por {s.sentBy}</span>
              </div>
              <div className="text-sm" style={{ color: C.ink }}>Destino: <b>{s.to}</b></div>
              <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{s.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}