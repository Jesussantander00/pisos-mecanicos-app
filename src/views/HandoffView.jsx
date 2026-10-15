import { useEffect, useMemo, useState } from "react";
import { sGet, sSet } from "../lib/storage";
import { Download, Mail, MessageCircle, Search } from "lucide-react";
import { C, buildTourText, buildWhatsAppLink, generateTourPdf, hoursBetween, isTaskSnoozed, normalizeTaskState, nowIso, sendTourEmailAuto } from "../shared/core";
import { Button } from "../shared/components";



/** Relevo de turno: lo que deja el turno que sale para el que entra — pendientes, cerradas, habitaciones
 * bloqueadas y una nota. Quien entra confirma que lo recibió y queda registro de quién lo leyó. */
function ShiftRelevoCard({ tasks, accounts, currentUser }) {
  const [blocked, setBlocked] = useState([]);
  const [notes, setNotes] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    sGet("blocked-rooms", true).then(v => setBlocked(Array.isArray(v) ? v.filter(b => !b.releasedAt) : [])).catch(() => {});
    sGet("handoff-notes", true).then(v => setNotes(Array.isArray(v) ? v : [])).catch(() => setNotes([]));
  }, []);
  const nameOf = (u) => accounts?.[u]?.display_name || u || "";
  const all = tasks || [];
  const open = all.filter(t => normalizeTaskState(t.estado) !== "finalizada" && !t.finishedAt && !isTaskSnoozed(t));
  const ageH = (t) => hoursBetween(t.assignedAt || t.createdAt || nowIso(), nowIso());
  const pending = [...open].sort((a, b) => (b.prioridad === "alta") - (a.prioridad === "alta") || ageH(b) - ageH(a));
  const closed8h = all.filter(t => t.finishedAt && Date.now() - new Date(t.finishedAt).getTime() < 8 * 3600000).length;
  const since = Date.now() - 8 * 3600000;
  const lastNote = (notes || []).filter(n => n.kind === "note").sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  const acks = lastNote ? (notes || []).filter(n => n.kind === "ack" && n.noteId === lastNote.id) : [];
  const iAcked = acks.some(a => a.by === currentUser);
  const fmtT = (iso) => { try { return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const persist = async (next) => {
    setBusy(true); setErr("");
    try { await sSet("handoff-notes", next.slice(0, 60), true); setNotes(next.slice(0, 60)); }
    catch { setErr("No se pudo guardar. Revisa tu conexión e intenta otra vez."); }
    setBusy(false);
  };
  const postNote = async () => {
    const text = draft.trim(); if (!text) return;
    await persist([{ id: "hn" + Date.now(), kind: "note", at: nowIso(), by: currentUser, text }, ...(notes || [])]);
    setDraft("");
  };
  const ack = () => lastNote && persist([{ id: "ha" + Date.now(), kind: "ack", at: nowIso(), by: currentUser, noteId: lastNote.id }, ...(notes || [])]);
  const Sec = ({ color, children }) => <div className="flex items-center gap-2 text-sm font-bold mb-1.5" style={{ color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}><span className="rounded-full" style={{ width: 10, height: 10, background: color }} />{children}</div>;
  return (
    <div className="rounded-xl border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Relevo de turno</div>
      <p className="text-xs mb-3" style={{ color: C.inkSoft }}>Lo que deja el turno que sale para el que entra, armado con lo que pasó.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg p-3" style={{ background: C.bg }}>
          <Sec color={C.red}>Queda pendiente ({pending.length})</Sec>
          {pending.length === 0 ? <div className="text-xs" style={{ color: C.green }}>Nada pendiente.</div> : pending.slice(0, 4).map(t => (
            <div key={t.id} className="text-sm rounded-md px-2.5 py-1.5 mb-1" style={{ background: C.panel, color: C.ink }}>
              {t.titulo}<span className="text-[11px] ml-1" style={{ color: ageH(t) > 24 ? C.red : C.gray }}>· {t.asignadoA ? nameOf(t.asignadoA) : "sin asignar"}{ageH(t) > 24 ? " · atrasada" : ""}</span>
            </div>
          ))}
          {pending.length > 4 && <div className="text-[11px]" style={{ color: C.gray }}>y {pending.length - 4} más</div>}
          <div className="mt-2"><Sec color={C.green}>Se cerró ({closed8h})</Sec><div className="text-xs" style={{ color: C.inkSoft }}>En las últimas 8 horas.</div></div>
        </div>
        <div className="rounded-lg p-3" style={{ background: C.bg }}>
          <Sec color={C.amber}>Ojo con esto</Sec>
          {blocked.length === 0 ? <div className="text-xs mb-2" style={{ color: C.inkSoft }}>Sin habitaciones bloqueadas.</div> : (
            <div className="text-sm rounded-md px-2.5 py-1.5 mb-2" style={{ background: C.amberSoft, color: "#5a3a02" }}>Bloqueadas: {blocked.map(b => b.room).join(", ")}</div>
          )}
          <Sec color={C.blue}>Nota del turno</Sec>
          {lastNote ? (
            <div className="text-sm rounded-md px-2.5 py-2" style={{ background: C.blueSoft, color: C.ink }}>
              “{lastNote.text}”
              <div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>{nameOf(lastNote.by)} · {fmtT(lastNote.at)}{new Date(lastNote.at).getTime() < since ? " · de un turno anterior" : ""}</div>
            </div>
          ) : <div className="text-xs" style={{ color: C.inkSoft }}>Aún no hay nota.</div>}
          {acks.length > 0 && <div className="text-[11px] mt-1.5 flex items-center gap-1.5" style={{ color: C.inkSoft }}><span className="rounded-full" style={{ width: 8, height: 8, background: C.green }} />Ya lo leyó: {acks.map(a => `${nameOf(a.by).split(" ")[0]} ${fmtT(a.at)}`).join(", ")}</div>}
        </div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escribe una nota para el turno que entra…" aria-label="Nota para el turno que entra" maxLength={400}
          className="flex-1 text-sm border rounded-md px-3 outline-none" style={{ minHeight: 44, minWidth: 180, borderColor: C.line, background: C.panel, color: C.ink }} />
        <button onClick={postNote} disabled={busy || !draft.trim()} className="text-sm font-semibold rounded-xl px-4 disabled:opacity-50" style={{ minHeight: 44, background: C.steelDark, color: "#fff" }}>Dejar nota</button>
      </div>
      {lastNote && !iAcked && lastNote.by !== currentUser && (
        <button onClick={ack} disabled={busy} className="w-full mt-2 text-sm font-bold rounded-xl disabled:opacity-50" style={{ minHeight: 48, background: C.steelDark, color: "#fff", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Confirmar que recibí el relevo</button>
      )}
      {err && <div className="text-xs mt-2" style={{ color: C.red }} role="alert">{err}</div>}
    </div>
  );
}

export function HandoffView({ tasks, accounts, lastTour, tourHistory, reportEmail, reportWhatsapp, onLogSent, currentUser, justFinished, onAckFinished, autoSendResult, mySignature, signerCargo, onGoToProfile }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [waTo, setWaTo] = useState(reportWhatsapp || "");
  const [sentNow, setSentNow] = useState(null);
  const [sendingAuto, setSendingAuto] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  // Buscar en el historial de entregas de turno por fecha o por técnico, en vez de solo poder
  // desplazarse por las últimas 20 en orden.
  const [historySearch, setHistorySearch] = useState("");
  const historyTecnicos = useMemo(() => [...new Set((tourHistory || []).slice(1).map(t => t.user))].sort(), [tourHistory]);
  const [historyTecnico, setHistoryTecnico] = useState("");
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return (tourHistory || []).slice(1).filter(t => {
      if (historyTecnico && t.user !== historyTecnico) return false;
      if (q && !(`${t.date} ${t.shift} ${t.user}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tourHistory, historySearch, historyTecnico]);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { setWaTo(reportWhatsapp || ""); }, [reportWhatsapp]);

  if (!lastTour) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Entrega de turno</h2>
        <ShiftRelevoCard tasks={tasks} accounts={accounts} currentUser={currentUser} />
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no se ha completado un recorrido. Cuando termines de revisar todos los pisos, desde el primero hasta el
          último, aquí aparecerá automáticamente el resumen listo para enviar.
        </p>
      </div>
    );
  }

  const text = buildTourText(lastTour);

  const doDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const doc = await generateTourPdf(lastTour, mySignature, signerCargo);
      doc.save(`entrega-turno-${String(lastTour.date).replace(/\//g, "-")}.pdf`);
    } catch {
      setSentNow({ ok: false, text: "No se pudo generar el PDF (revisa la conexión a internet, se necesita la primera vez)." });
    }
    setDownloadingPdf(false);
  };

  const doSendAutoEmail = async () => {
    if (!emailTo.trim()) { setSentNow({ ok: false, text: "Escribe un correo destino." }); return; }
    setSendingAuto(true); setSentNow(null);
    const res = await sendTourEmailAuto(emailTo.trim(), lastTour, mySignature, signerCargo);
    setSentNow({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Entrega de turno (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSendingAuto(false);
  };

  const sendMailManual = () => {
    if (!emailTo.trim()) { setSentNow({ ok: false, text: "Escribe un correo destino." }); return; }
    const subject = `Entrega de turno ${lastTour.shift} - ${lastTour.date}`;
    const body = text.length > 1800 ? text.slice(0, 1800) + "\n\n(resumen truncado, descarga el PDF desde el botón de arriba y adjúntalo aquí)" : text;
    window.open(`mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    onLogSent({ to: emailTo.trim(), method: "Entrega de turno (borrador manual)", ok: true, message: "Se abrió el borrador de correo, listo para adjuntar el PDF y enviar.", sentBy: currentUser, sentAt: nowIso() });
    setSentNow({ ok: true, text: "Se abrió tu correo con el resumen. Adjunta el PDF descargado arriba y dale Enviar allá." });
  };

  const sendWa = () => {
    if (!waTo.trim()) { setSentNow({ ok: false, text: "Escribe un número de WhatsApp (con indicativo, ej. 573001234567)." }); return; }
    window.open(buildWhatsAppLink(waTo.trim(), text), "_blank");
    onLogSent({ to: waTo.trim(), method: "Entrega de turno (WhatsApp, sin PDF)", ok: true, message: "Se abrió WhatsApp con el resumen en texto. WhatsApp no permite adjuntar el PDF por enlace: adjúntalo tú mismo desde tus descargas.", sentBy: currentUser, sentAt: nowIso() });
    setSentNow({ ok: true, text: "Se abrió WhatsApp con el resumen en texto. Descarga el PDF arriba y adjúntalo tú mismo dentro de WhatsApp — la plataforma no permite adjuntarlo por enlace." });
  };

  return (
    <div>
      <ShiftRelevoCard tasks={tasks} accounts={accounts} currentUser={currentUser} />
      {justFinished && (
        <div className="rounded-lg p-3 mb-4" style={{ background: C.greenSoft, border: `1px solid ${C.green}` }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm" style={{ color: "#1c5e2e" }}>
              <b>✓ Recorrido finalizado.</b> {reportEmail ? "Se intentó enviar automáticamente por correo con el PDF adjunto." : "Configura un correo en el Panel de Administrador para que esto se envíe solo la próxima vez."}
            </div>
            <Button size="sm" variant="ghost" onClick={onAckFinished}>Entendido</Button>
          </div>
        </div>
      )}
      {autoSendResult && (
        <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: autoSendResult.ok ? C.greenSoft : C.redSoft, border: `1px solid ${autoSendResult.ok ? C.green : C.red}`, color: autoSendResult.ok ? "#1c5e2e" : C.red }}>
          {autoSendResult.ok ? "✓ " : "✗ "}{autoSendResult.message}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Entrega de turno</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Turno <b>{lastTour.shift}</b> · {lastTour.date} · recorrido de <b>{lastTour.user}</b> ·{" "}
        {lastTour.itemCount} equipos revisados{lastTour.damagedCount ? `, ${lastTour.damagedCount} dañados` : ", todo en orden"}
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: mySignature ? C.line : C.red, background: mySignature ? C.panel : C.redSoft, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Firma de quien entrega el turno</div>
        {mySignature ? (
          <div>
            <img loading="lazy" src={mySignature} alt="Tu firma" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 200, background: "#fff" }} />
            <div className="text-xs mt-1" style={{ color: C.gray }}>
              Esta es la firma guardada en tu perfil — se incluye sola en el PDF. <button onClick={onGoToProfile} className="underline" style={{ color: C.blue }}>Cambiarla</button>
            </div>
          </div>
        ) : (
          <div className="text-xs" style={{ color: C.red }}>
            <b>⚠ Todavía no has guardado tu firma — es obligatoria para poder enviar el recorrido.</b>{" "}
            <button onClick={onGoToProfile} className="underline font-semibold" style={{ color: C.blue }}>Configúrala en Mi Perfil</button> — la guardas una sola vez y de ahí en adelante se agrega sola en cada entrega de turno.
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF de este recorrido</div>
        <Button variant="ghost" icon={Download} disabled={downloadingPdf || !mySignature} onClick={doDownloadPdf}>
          {downloadingPdf ? "Generando…" : "Descargar PDF"}
        </Button>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAuto || !mySignature} onClick={doSendAutoEmail}>{sendingAuto ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" disabled={!mySignature} onClick={sendMailManual}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp — resumen en texto (el PDF se adjunta a mano)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número WhatsApp, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button variant="ghost" icon={MessageCircle} disabled={!mySignature} onClick={sendWa}>Enviar por WhatsApp</Button>
        </div>
        <div className="text-xs mt-1" style={{ color: C.gray }}>
          WhatsApp no permite adjuntar archivos por enlace bajo ninguna circunstancia (ni Meta lo permite a terceros
          sin su API de negocios aprobada). Descarga el PDF arriba y adjúntalo tú mismo dentro de la conversación.
        </div>

        {!mySignature && <div className="text-xs mt-2 font-medium" style={{ color: C.red }}>Guarda tu firma en Mi Perfil para poder usar estos botones.</div>}
        {sentNow && <div className="text-xs mt-2" style={{ color: sentNow.ok ? C.green : C.red }}>{sentNow.text}</div>}
      </div>

      {lastTour.floors.map(f => (
        <div key={f.floorId} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{f.floorName}</div>
          {f.items.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Sin equipos registrados en este piso.</div>}
          {f.items.map((it, i) => (
            <div key={i} className="text-xs py-1 flex items-start justify-between gap-2 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <span style={{ color: C.inkSoft }}>
                #{it.code} {it.name}
                {it.observation && <span className="italic"> — {it.observation}</span>}
              </span>
              <span className="shrink-0 text-right" style={{ color: it.damaged ? C.red : C.ink, fontWeight: it.damaged ? 700 : 500 }}>
                {it.valueStr}{it.damaged ? " · DAÑADO" : ""}
              </span>
            </div>
          ))}
          {f.notes && <div className="text-xs italic mt-1.5" style={{ color: C.inkSoft }}>Notas del piso: {f.notes}</div>}
        </div>
      ))}

      {tourHistory.length > 1 && (
        <details className="mt-4">
          <summary className="text-xs cursor-pointer select-none" style={{ color: C.gray }}>
            Ver recorridos anteriores ({tourHistory.length - 1})
          </summary>
          <div className="mt-2">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <div className="relative flex-1 min-w-[140px]">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
                <input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar por fecha o turno…"
                  className="text-xs border rounded-md pl-6 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              </div>
              <select value={historyTecnico} onChange={e => setHistoryTecnico(e.target.value)}
                className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <option value="">Todos los técnicos</option>
                {historyTecnicos.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {filteredHistory.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: C.gray }}>Sin resultados para esa búsqueda.</p>
            ) : filteredHistory.slice(0, 30).map(t => (
              <div key={t.id} className="text-xs py-1.5 border-b flex items-center justify-between" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <span>{t.date} · Turno {t.shift} · {t.user}</span>
                <span style={{ color: C.gray }}>{t.itemCount} equipos{t.damagedCount ? `, ${t.damagedCount} dañados` : ""}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}