import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Mail, Save, Search } from "lucide-react";
import { ALL_COLD_ROOM_ITEMS, C, COLD_ROOMS, ICE_MACHINES_AB, ICE_MACHINES_LINOS, ICE_STATUS_OPTS, addDays, buildColdRoomsWeekGrid, fmtDayFull, generateColdRoomsWeekPdf, isColdRoomOutOfRange, nowIso, sendColdRoomsWeekEmailAuto, showToast, startOfWeek, todayStr, validateRoundEntries } from "../shared/core";
import { Button, PendingItemsAlert, Pill } from "../shared/components";
import { EquipmentRow } from "./EquipmentRow";



export function ColdRoomsView({ currentUser, shift, activeIssues, latestColdValues, onResolveIssue, onSaveColdRound, reportEmail, onLogSent, lastColdRound, coldHistory, mySignature }) {
  const [entries, setEntries] = useState({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [ingeniero, setIngeniero] = useState("");
  const [saved, setSaved] = useState(false);
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  useEffect(() => {
    const seeded = {};
    ALL_COLD_ROOM_ITEMS.forEach(item => {
      const lv = latestColdValues[item.id];
      if (lv) {
        seeded[item.id] = { status: lv.status, value: lv.value, observation: activeIssues[item.id] ? undefined : lv.observation, damaged: !!activeIssues[item.id] };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
      }
    });
    setEntries(seeded);
  }, []);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = Object.values(entries).filter(e => e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged)).length;
  const damagedCount = Object.values(entries).filter(e => e?.damaged).length;
  const outOfRangeNow = COLD_ROOMS.filter(item => isColdRoomOutOfRange(item, entries[item.id]?.value));

  const todayIsSunday = new Date().getDay() === 0;
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekGrid = useMemo(() => buildColdRoomsWeekGrid(coldHistory || {}, weekStart), [coldHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;

  const handleSave = async () => {
    const { missing, missingComment } = validateRoundEntries(ALL_COLD_ROOM_ITEMS, entries);
    if (missingComment.length > 0) {
      setSendMsg({ ok: false, text: "Falta el comentario de qué pasó en:", items: missingComment });
      return;
    }
    if (missing.length > 0) {
      setSendMsg({ ok: false, text: "Todavía faltan estos por registrar:", items: missing });
      return;
    }
    setSaving(true);
    try {
      await onSaveColdRound(entries, notes, supervisor, ingeniero);
      setSaved(true);
      setSendMsg(null);
    } catch (e) {
      setSendMsg({ ok: false, text: "No se pudo guardar — revisa tu conexión e intenta de nuevo." });
      showToast("✗ No se pudo guardar la ronda de cuartos fríos.", false);
    } finally {
      setSaving(false);
    }
  };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateColdRoomsWeekPdf(weekGrid, weekLabel, currentUser, mySignature);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), weekGrid, weekLabel, currentUser, mySignature);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Cuartos Fríos (semana, correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Cuartos Fríos y Máquinas de Hielo</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{ALL_COLD_ROOM_ITEMS.length} puntos de control · Turno {shift} · {todayStr()}</p>
        </div>
        <div className="flex items-center gap-2">
          {damagedCount > 0 && <Pill tone="red">{damagedCount} fuera de rango / servicio</Pill>}
          <Pill tone="gray">{filledCount}/{ALL_COLD_ROOM_ITEMS.length} registrados</Pill>
        </div>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: C.blue }}>
        Los campos ya vienen con lo último registrado — revisa, corrige lo que cambió y guarda. Marca "Dañado / Fuera de servicio"
        si un cuarto está fuera de su rango de temperatura o una máquina de hielo no funciona.
      </div>

      {outOfRangeNow.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold flex items-center gap-2" style={{ background: C.redSoft, color: C.red }}>
          <AlertTriangle size={14} /> {outOfRangeNow.length} cuarto{outOfRangeNow.length !== 1 ? "s" : ""} fuera de rango ahora mismo:{" "}
          {outOfRangeNow.map(i => i.n).join(", ")}
        </div>
      )}

      <div className="relative mb-3">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un cuarto o máquina…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const visColdRooms = q ? COLD_ROOMS.filter(i => i.n.toLowerCase().includes(q)) : COLD_ROOMS;
        const visIceAB = q ? ICE_MACHINES_AB.filter(i => i.n.toLowerCase().includes(q)) : ICE_MACHINES_AB;
        const visIceLinos = q ? ICE_MACHINES_LINOS.filter(i => i.n.toLowerCase().includes(q)) : ICE_MACHINES_LINOS;
        const noResults = q && visColdRooms.length === 0 && visIceAB.length === 0 && visIceLinos.length === 0;
        if (noResults) return <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
        return (
          <>
            {visColdRooms.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>Cuartos fríos ({visColdRooms.length})</div>
                {visColdRooms.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} hint={item.setpoint}
                    outOfRange={isColdRoomOutOfRange(item, entries[item.id]?.value)}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
            {visIceAB.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo A&B ({visIceAB.length})</div>
                {visIceAB.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
            {visIceLinos.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo — Linos / Habitaciones ({visIceLinos.length})</div>
                {visIceLinos.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
          </>
        );
      })()}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales de la ronda…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Supervisor (opcional)</div>
            <input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Nombre del supervisor"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Ingeniero (opcional)</div>
            <input value={ingeniero} onChange={e => setIngeniero(e.target.value)} placeholder="Nombre del ingeniero"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 sticky bottom-16 sm:bottom-0 py-2 px-2 -mx-2 rounded-t-lg" style={{ background: C.bg }}>
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar ronda"}</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1 mb-3" style={{ color: C.green }}>✓ Ronda guardada correctamente</div>}
      {sendMsg && !sendMsg.ok && !sendMsg.items && (
        <div className="rounded-md p-2 mt-1 mb-3 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {sendMsg.text}</div>
      )}
      <PendingItemsAlert msg={sendMsg?.items ? { prefix: sendMsg.text, items: sendMsg.items } : null} onClose={() => setSendMsg(null)} />

      {lastColdRound && !todayIsSunday && (
        <div className="rounded-md p-2 text-xs" style={{ background: C.bg, color: C.inkSoft }}>
          El envío por correo de Cuartos Fríos se hace cada 7 días — el domingo, aquí mismo, va a aparecer el botón
          para enviar la semana completa. Si necesitas enviarla antes, ve a "Historial de Cuartos Fríos" en el menú.
        </div>
      )}

      {lastColdRound && todayIsSunday && (
        <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.amber, background: C.amberSoft }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.amber }}>
            ✓ Semana completa — envía el reporte semanal de Cuartos Fríos ({weekLabel})
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadPdf}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
            <Button icon={Mail} disabled={sending} onClick={doSendEmail}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
          </div>
          {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
        </div>
      )}
    </div>
  );
}