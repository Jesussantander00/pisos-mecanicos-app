import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Download, History, Mail, PlusCircle, Sparkles, Trash2, Upload } from "lucide-react";
import { sGet, sSet } from "../lib/storage";
import * as XLSX from "xlsx";
import { C, CARGOS, DAY_NAMES, DEFAULT_STANDING_RULES, SPECIAL_CODES, WEEKLY_HOURS_TARGET, buildIcsForEmployee, bumpAiUsage, checkShiftOverlap, computeCompBalance, computeScheduleWarnings, daysInMonthIso, fmtDT, fmtDayFull, fmtDayShort, fmtEntryShort, generateSchedulePdf, getSpecialCodeColors, isSundayOrHoliday, isWorkedDay, nowIso, parseHorarioExcelWorkbook, requestAiScheduleDraft, scheduleKey, sendScheduleEmailAuto, weekTotalHours, weeksInRange } from "../shared/core";
import { Avatar, Button } from "../shared/components";



function EmployeeManagePanel({ employees, onCreateEmployee, onUpdateEmployee, onDeleteEmployee }) {
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [restDay, setRestDay] = useState("");
  const [creating, setCreating] = useState(false);

  const doCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreateEmployee(name.trim(), cargo, restDay);
    setName(""); setCargo(""); setRestDay("");
    setCreating(false);
  };

  const grouped = CARGOS.map(c => ({ cargo: c, list: employees.filter(e => e.cargo === c) }))
    .concat([{ cargo: "Sin cargo asignado", list: employees.filter(e => !e.cargo) }])
    .filter(g => g.list.length > 0);

  return (
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar empleado</div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo"
          className="text-sm border rounded-md px-2 py-1.5 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
        <select value={cargo} onChange={e => setCargo(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Cargo…</option>
          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={restDay} onChange={e => setRestDay(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Sin descanso fijo</option>
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>Descanso fijo: {d}</option>)}
        </select>
        <Button size="sm" icon={PlusCircle} disabled={creating} onClick={doCreate}>Agregar</Button>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Empleados ({employees.length})</div>
      {grouped.map(g => (
        <div key={g.cargo} className="mb-2">
          <div className="text-xs font-semibold mt-2 mb-1" style={{ color: C.blue }}>{g.cargo} ({g.list.length})</div>
          {g.list.map(emp => (
            <div key={emp.id} className="flex items-center justify-between py-1.5 border-b last:border-0 flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-sm" style={{ color: C.ink }}>
                {emp.name}
                {!emp.active && <span className="text-xs" style={{ color: C.gray }}> · Inactivo</span>}
              </div>
              <div className="flex items-center gap-2">
                <select value={emp.cargo || ""} onChange={e => onUpdateEmployee(emp.id, { cargo: e.target.value })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Cargo…</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={emp.fixedRestDay ?? ""} onChange={e => onUpdateEmployee(emp.id, { fixedRestDay: e.target.value === "" ? null : Number(e.target.value) })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Sin descanso fijo</option>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input defaultValue={emp.badge || ""} onBlur={e => { if (e.target.value !== (emp.badge || "")) onUpdateEmployee(emp.id, { badge: e.target.value.trim() }); }}
                  placeholder="Etiqueta (ej: acum. reducción)" title="Aparece como una marca de color junto al nombre, en pantalla y en el PDF"
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 160 }} />
                <input type="number" min="0" step="0.5" defaultValue={emp.reductionHoursPerDay || ""} onBlur={e => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (emp.reductionHoursPerDay ?? null)) onUpdateEmployee(emp.id, { reductionHoursPerDay: v }); }}
                  placeholder="Hrs. reducción/día" title="Cuántas horas se le acumulan por cada día trabajado (ej. 1 si trabaja 8h en vez de las 7h reducidas). Vacío = no acumula."
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 100 }} />
                <Button size="sm" variant="ghost" onClick={() => onUpdateEmployee(emp.id, { active: !emp.active })}>{emp.active ? "Desactivar" : "Activar"}</Button>
                <button onClick={() => onDeleteEmployee(emp.id)} aria-label="Eliminar empleado" className="flex items-center justify-center" style={{ minWidth: 40, minHeight: 40 }}><Trash2 size={14} color={C.gray} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SchedulesView({ employees, scheduleEntries, scheduleEditLog, isAdmin, canManageSchedule, currentUser, onCreateEmployee, onUpdateEmployee, onDeleteEmployee, onSetScheduleEntry, onImportJuly, onImportAugust, onImportExcel, onApplyAiDraft, reportEmail, onLogSent }) {
  const canEdit = isAdmin || canManageSchedule; // puede editar turnos día a día — distinto de isAdmin (que además gestiona empleados, importa en bloque y genera con IA)
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showManage, setShowManage] = useState(false);
  const [showEditLog, setShowEditLog] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [draftMode, setDraftMode] = useState("hours"); // "hours" | "special"
  const [draftEntrada, setDraftEntrada] = useState("");
  const [draftSalida, setDraftSalida] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [icsEmployeeId, setIcsEmployeeId] = useState("");

  // ---- Borrador de horario generado con IA (no se guarda hasta que el usuario lo confirma) ----
  const [showAiPanel, setShowAiPanel] = useState(false);
  // Reglas GENERALES del equipo: se guardan en la base de datos y se usan SIEMPRE, en todos los
  // meses, sin que haga falta volver a escribirlas cada vez (antes esto se perdía cada vez que se
  // generaba un mes nuevo, por eso reglas que ya se habían dado — como lo de Quintana los sábados,
  // o lo de Félix y Zarith los domingos — no se estaban aplicando si no se volvían a escribir).
  const [standingRules, setStandingRules] = useState("");
  const [standingRulesLog, setStandingRulesLog] = useState([]);
  const [showRulesLog, setShowRulesLog] = useState(false);
  // Guarda el último valor YA guardado en la base de datos (distinto de "standingRules", que
  // cambia con cada tecla mientras se edita) — sirve para poder registrar el "antes" real cuando
  // se guarda, sin depender de recargar la página.
  const lastSavedRulesRef = useRef("");
  const [standingRulesLoaded, setStandingRulesLoaded] = useState(false);
  const [standingRulesSaving, setStandingRulesSaving] = useState(false);
  const [standingRulesSaved, setStandingRulesSaved] = useState(false);
  const [aiRulesText, setAiRulesText] = useState(""); // solo algo puntual de ESTE mes, no se guarda
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiNotes, setAiNotes] = useState(null);
  const [draftActive, setDraftActive] = useState(false);
  const [draftOverrides, setDraftOverrides] = useState({}); // { [scheduleKey]: {entrada,salida} | {code} }
  const [applyingDraft, setApplyingDraft] = useState(false);

  useEffect(() => {
    (async () => {
      let saved = null;
      let log = null;
      try { saved = await sGet("schedule-standing-rules", true); } catch { /* usa el texto por defecto */ }
      try { log = await sGet("standing-rules-log", true); } catch { /* sin historial por ahora */ }
      const initial = saved || DEFAULT_STANDING_RULES;
      setStandingRules(initial);
      lastSavedRulesRef.current = initial;
      setStandingRulesLog(log || []);
      setStandingRulesLoaded(true);
    })();
  }, []);

  const saveStandingRules = async () => {
    setStandingRulesSaving(true);
    try {
      await sSet("schedule-standing-rules", standingRules, true);
      // Registro de quién cambió qué y cuándo — antes solo quedaba el texto final, sin rastro de
      // qué decía antes ni quién lo tocó, así que un cambio accidental o mal entendido no se podía
      // rastrear ni revertir con criterio.
      if (standingRules !== lastSavedRulesRef.current) {
        const entry = { before: lastSavedRulesRef.current, after: standingRules, by: currentUser || "—", at: nowIso() };
        const nextLog = [entry, ...standingRulesLog].slice(0, 200);
        setStandingRulesLog(nextLog);
        sSet("standing-rules-log", nextLog, true); // no se espera a propósito, no debe atrasar el guardado principal
      }
      lastSavedRulesRef.current = standingRules;
      setStandingRulesSaved(true);
      setTimeout(() => setStandingRulesSaved(false), 2500);
    } catch { setAiError("No se pudieron guardar las reglas generales. Intenta de nuevo."); }
    setStandingRulesSaving(false);
  };

  // ---- Al entrar, si ya hay un mes con datos cargados (ej. agosto), arranca de una vez mostrando
  // el mes SIGUIENTE a ese (ej. septiembre) en vez del mes calendario actual — así el panel de IA
  // ya aparece listo para el mes que realmente falta por armar. Solo pasa una vez, al cargar; si
  // el usuario navega a otro mes después, eso ya no se toca. ----
  const autoAdjustedMonthRef = useRef(false);
  useEffect(() => {
    if (autoAdjustedMonthRef.current) return;
    const dates = Object.keys(scheduleEntries || {}).map(k => k.split("::")[1]).filter(Boolean);
    if (dates.length === 0) return;
    const maxDate = dates.reduce((a, b) => (b > a ? b : a));
    const [y, m] = maxDate.split("-").map(Number); // m es 1-indexado (ej. 8 = agosto)
    setMonthDate(new Date(y, m, 1)); // new Date(y, m, 1) con m tal cual = el mes SIGUIENTE (0-indexado)
    autoAdjustedMonthRef.current = true;
  }, [scheduleEntries]);

  // ---- Subir un Excel de horario (mismo formato de siempre) para el mes que está en pantalla ----
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelParsed, setExcelParsed] = useState(null); // { entries, names, warnings }
  const [excelParseError, setExcelParseError] = useState(null);
  const [excelApplying, setExcelApplying] = useState(false);
  const excelInputRef = useRef(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const daysIso = useMemo(() => daysInMonthIso(year, month), [year, month]);
  const weeks = useMemo(() => weeksInRange(daysIso), [daysIso]);
  const monthLabel = monthDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const activeEmployees = employees.filter(e => e.active !== false);

  const entriesByEmployee = useMemo(() => {
    const map = {};
    activeEmployees.forEach(emp => {
      map[emp.id] = {};
      daysIso.forEach(d => {
        const e = scheduleEntries[scheduleKey(emp.id, d)];
        if (e) map[emp.id][d] = e;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, scheduleEntries, daysIso]);

  /** Lo que se ve en pantalla: si hay un borrador de IA activo, se le suman/reemplazan sus celdas
   *  encima de lo real (sin tocar lo real todavía) — así se puede revisar y editar antes de guardar. */
  const viewEntriesByEmployee = useMemo(() => {
    if (!draftActive) return entriesByEmployee;
    const map = {};
    activeEmployees.forEach(emp => {
      map[emp.id] = { ...(entriesByEmployee[emp.id] || {}) };
      daysIso.forEach(d => {
        const ov = draftOverrides[scheduleKey(emp.id, d)];
        if (ov) map[emp.id][d] = ov;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesByEmployee, draftActive, draftOverrides, activeEmployees, daysIso]);

  const sortedEmployees = useMemo(() => {
    const order = [...CARGOS, ""];
    return [...activeEmployees].sort((a, b) => order.indexOf(a.cargo || "") - order.indexOf(b.cargo || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployees]);

  const openCell = (employeeId, dateIso) => {
    const entry = viewEntriesByEmployee[employeeId]?.[dateIso];
    setEditingCell({ employeeId, dateIso });
    setDraftMode(entry?.code ? "special" : "hours");
    setDraftEntrada(entry?.entrada != null ? String(entry.entrada) : "");
    setDraftSalida(entry?.salida != null ? String(entry.salida) : "");
    setDraftCode(entry?.code || "");
    setDraftNote(entry?.note || "");
  };
  const saveCell = () => {
    const patch = draftMode === "special"
      ? { code: draftCode, note: draftNote }
      : { entrada: draftEntrada === "" ? null : Number(draftEntrada), salida: draftSalida === "" ? null : Number(draftSalida), note: draftNote };
    if (draftActive) {
      const key = scheduleKey(editingCell.employeeId, editingCell.dateIso);
      setDraftOverrides(prev => ({ ...prev, [key]: patch }));
    } else {
      onSetScheduleEntry(editingCell.employeeId, editingCell.dateIso, patch);
    }
    setEditingCell(null);
  };

  // ---- Vista previa de impacto: recalcula la semana de la celda que se está editando, CON el cambio en borrador ----
  const impact = useMemo(() => {
    if (!editingCell) return null;
    const week = weeks.find(w => w.includes(editingCell.dateIso));
    if (!week) return null;
    const entries = viewEntriesByEmployee[editingCell.employeeId] || {};
    const draftEntry = draftMode === "special"
      ? { code: draftCode }
      : { entrada: draftEntrada === "" ? null : Number(draftEntrada), salida: draftSalida === "" ? null : Number(draftSalida) };
    const before = weekTotalHours(week, entries);
    const afterEntries = { ...entries, [editingCell.dateIso]: draftEntry };
    const after = weekTotalHours(week, afterEntries);
    const diff = after - WEEKLY_HOURS_TARGET;
    const emp = activeEmployees.find(e => e.id === editingCell.employeeId);
    const label = `${fmtDayShort(new Date(week[0] + "T00:00:00"))}–${fmtDayShort(new Date(week[week.length - 1] + "T00:00:00"))}`;
    const restDayHit = emp && emp.fixedRestDay !== null && emp.fixedRestDay !== undefined
      && new Date(editingCell.dateIso + "T00:00:00").getDay() === emp.fixedRestDay && draftMode !== "special";
    return { weekLabel: label, before, after, diff, restDayHit, isSundayHoliday: isSundayOrHoliday(editingCell.dateIso) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, draftMode, draftEntrada, draftSalida, draftCode, viewEntriesByEmployee]);

  const doImport = async (importFn, label) => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await importFn();
      setImportMsg({ ok: true, text: `Listo: ${res.newEmployeesCount} empleado(s) nuevo(s) creados, ${res.entriesCount} registros de horario cargados (${label}).` });
    } catch {
      setImportMsg({ ok: false, text: "No se pudo importar — revisa que el archivo sea el formato correcto e intenta de nuevo." });
    }
    setImporting(false);
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelParseError(null); setExcelParsed(null); setExcelParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = parseHorarioExcelWorkbook(wb, year, month + 1);
      if (parsed.entries.length === 0) {
        setExcelParseError("No se encontró ningún dato reconocible en el archivo — revisa que sea el mismo formato de siempre (filas \"Hora\" con los días por columna).");
      } else {
        setExcelParsed(parsed);
      }
    } catch {
      setExcelParseError("No se pudo leer el archivo. ¿Es un .xlsx válido?");
    }
    setExcelParsing(false);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const doApplyExcelImport = async () => {
    setExcelApplying(true);
    try {
      const res = await onImportExcel(excelParsed);
      setImportMsg({ ok: true, text: `Excel importado a ${monthLabel}: ${res.newEmployeesCount} empleado(s) nuevo(s), ${res.entriesCount} registros cargados.` });
      setExcelParsed(null); setExcelParseError(null);
    } catch {
      setExcelParseError("No se pudo guardar la importación. Intenta de nuevo.");
    }
    setExcelApplying(false);
  };

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateSchedulePdf(monthLabel, sortedEmployees, daysIso, entriesByEmployee, currentUser);
      doc.save(`horario-${monthLabel.replace(/\s+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };
  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendScheduleEmailAuto(emailTo.trim(), monthLabel, sortedEmployees, daysIso, entriesByEmployee, currentUser);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Horario mensual (correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const doGenerateAiDraft = async () => {
    setAiGenerating(true); setAiError(null); setAiNotes(null);
    try {
      // Ejemplo de cómo trabaja cada quien: TODO el mes calendario anterior completo (ej. si se
      // arma septiembre, se manda agosto entero), para que la IA vea la secuencia real de turnos
      // de cada persona (incluye rotaciones que cambian semana a semana) y la continúe con lógica.
      const prevMonthFirstDay = new Date(year, month - 1, 1);
      const prevDaysIso = daysInMonthIso(prevMonthFirstDay.getFullYear(), prevMonthFirstDay.getMonth());
      const referenceEntries = {};
      activeEmployees.forEach(emp => {
        const list = [];
        prevDaysIso.forEach(iso => {
          const e = scheduleEntries[scheduleKey(emp.id, iso)];
          if (isWorkedDay(e)) list.push({ date: iso, entrada: e.entrada, salida: e.salida });
        });
        if (list.length) referenceEntries[emp.id] = list;
      });

      const days = daysIso.map(d => ({ date: d, isSundayOrHoliday: isSundayOrHoliday(d) }));
      const employeesForApi = activeEmployees.map(e => ({
        id: e.id, name: e.name, cargo: e.cargo || "", fixedRestDay: e.fixedRestDay ?? null,
        compBalance: e.reductionHoursPerDay > 0 ? computeCompBalance(e, scheduleEntries) : null,
      }));

      // Cuántos domingos/festivos tiene YA trabajados cada persona este mismo mes (lo que ya
      // estaba guardado antes de generar). Esto se le manda a cada tanda y se va actualizando
      // según lo que la IA vaya generando, para que ninguna tanda le ponga a alguien más domingos
      // de los que le quedan — sin esto, cada tanda decide "a ciegas" y pueden pasarse entre todas.
      const sundaysWorked = {};
      activeEmployees.forEach(emp => {
        let count = 0;
        daysIso.forEach(d => { if (isSundayOrHoliday(d) && isWorkedDay(entriesByEmployee[emp.id]?.[d])) count++; });
        sundaysWorked[emp.id] = count;
      });

      // Pedir el mes completo de una sola vez puede tardar tanto que Vercel corte la función a la
      // mitad. En vez de eso, se pide en tandas de máximo 15 días. Van UNA POR UNA (no todas al
      // tiempo) para poder pasarle a cada tanda cuántos domingos ya usó cada persona en la tanda
      // anterior — así entre todas respetan el mismo límite mensual en vez de calcularlo cada una
      // por su cuenta. Si alguna tanda falla, las demás igual quedan aplicadas.
      const CHUNK_SIZE = 15;
      const dayChunks = [];
      for (let i = 0; i < days.length; i += CHUNK_SIZE) dayChunks.push(days.slice(i, i + CHUNK_SIZE));

      // Las reglas generales del equipo (guardadas, siempre aplican) van primero, y lo que se haya
      // escrito solo para este mes se agrega después — así nunca se pierden las reglas de siempre
      // por no volver a escribirlas.
      const combinedRules = [standingRules, aiRulesText].map(t => (t || "").trim()).filter(Boolean).join("\n\n");

      const results = [];
      for (const chunkDays of dayChunks) {
        const res = await requestAiScheduleDraft({
          monthLabel, days: chunkDays, employees: employeesForApi,
          existingEntries: entriesByEmployee, referenceEntries,
          rulesText: combinedRules, weeklyHoursTarget: WEEKLY_HOURS_TARGET,
          sundaysAlreadyWorked: sundaysWorked,
        }).catch(() => ({ ok: false, message: "No se pudo conectar con el servicio de IA para esta parte del mes." }));
        results.push(res);
        if (res && res.ok) {
          res.entries.forEach(e => {
            if (!e.code && isSundayOrHoliday(e.date)) sundaysWorked[e.employeeId] = (sundaysWorked[e.employeeId] || 0) + 1;
          });
        }
      }

      const okResults = results.filter(r => r && r.ok);
      const failedCount = results.length - okResults.length;

      const overrides = {};
      okResults.forEach(r => {
        r.entries.forEach(e => {
          const key = scheduleKey(e.employeeId, e.date);
          overrides[key] = e.code ? { code: e.code } : { entrada: e.entrada, salida: e.salida };
        });
      });

      if (Object.keys(overrides).length === 0) {
        const firstMsg = results.find(r => r && !r.ok)?.message;
        setAiError(firstMsg || "La IA no llenó ningún día — puede que ya esté todo lleno este mes, o que no haya podido cumplir las reglas.");
        setAiGenerating(false);
        return;
      }

      setDraftOverrides(overrides);
      bumpAiUsage("scheduleGenerations");
      setDraftActive(true);
      let notes = okResults.map(r => r.notes).filter(Boolean).join(" ");
      if (failedCount > 0) {
        notes = (notes ? notes + " " : "") + `Aviso: ${failedCount} de ${results.length} parte(s) del mes no se pudieron generar — vuelve a darle "Generar borrador" para completar los días que falten (los que ya se generaron no se pierden).`;
      }
      setAiNotes(notes || null);
    } catch {
      setAiError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setAiGenerating(false);
  };

  const doApplyAiDraft = async () => {
    setApplyingDraft(true);
    try {
      await onApplyAiDraft(draftOverrides);
      setDraftActive(false); setDraftOverrides({}); setAiNotes(null); setAiError(null); setShowAiPanel(false);
      setImportMsg({ ok: true, text: `Horario generado guardado: ${Object.keys(draftOverrides).length} celda(s) aplicadas.` });
    } catch {
      setAiError("No se pudo guardar el horario generado. Intenta de nuevo.");
    }
    setApplyingDraft(false);
  };

  const doDiscardAiDraft = () => {
    setDraftActive(false); setDraftOverrides({}); setAiNotes(null); setAiError(null);
  };

  const employeeWarnings = activeEmployees.map(emp => ({
    emp, ...computeScheduleWarnings(emp, daysIso, viewEntriesByEmployee[emp.id] || {}),
  })).filter(w => w.warnings.length > 0);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Horario Mensual</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹ Mes anterior</Button>
          <span className="text-sm font-medium capitalize" style={{ color: C.ink }}>{monthLabel}</span>
          <Button size="sm" variant="ghost" onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Mes siguiente ›</Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setShowManage(v => !v)}>{showManage ? "Ocultar gestión" : "Gestionar empleados"}</Button>}
          {isAdmin && <Button size="sm" variant="ghost" icon={History} onClick={() => setShowEditLog(v => !v)}>{showEditLog ? "Ocultar historial" : "Historial de cambios"}</Button>}
        </div>
      </div>

      {isAdmin && showEditLog && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Historial de cambios del horario</div>
          {scheduleEditLog.length === 0 ? (
            <p className="text-xs" style={{ color: C.gray }}>Todavía no hay cambios registrados.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {scheduleEditLog.slice(0, 100).map(e => (
                <div key={e.id} className="text-xs rounded-md px-2 py-1.5" style={{ background: C.bg, color: C.ink }}>
                  <b>{e.by}</b> cambió el turno de <b>{e.employeeName}</b> del {new Date(e.date + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}:{" "}
                  <span style={{ color: C.gray }}>{e.before}</span> → <span style={{ color: C.amber, fontWeight: 600 }}>{e.after}</span>
                  {e.source === "ia" && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded" style={{ background: "#f0e6fb", color: "#6b21a8" }}>IA</span>}
                  <span className="ml-1.5" style={{ color: C.gray }}>· {fmtDT(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: C.blue }}>
          Solo puedes ver el horario. Si necesitas un cambio, pídeselo a un administrador.
        </div>
      )}

      {isAdmin && Object.keys(scheduleEntries || {}).length === 0 && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.amberSoft, color: C.amber }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span>¿Primera vez usando esto? Importa de una vez el horario real ya trabajado, para tener la base sobre la que la IA arma los siguientes meses.</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" disabled={importing} onClick={() => doImport(onImportJuly, "16 jul – 2 ago 2026")}>{importing ? "Importando…" : "Importar julio 2026"}</Button>
              <Button size="sm" disabled={importing} onClick={() => doImport(onImportAugust, "3 ago – 30 ago 2026")}>{importing ? "Importando…" : "Importar agosto 2026"}</Button>
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: `1px solid ${C.amber}` }}>
            <div className="mb-2">O sube tu propio Excel (el mismo formato de siempre — filas "Hora" con los días por columna) y se carga al mes que tienes seleccionado arriba: <b>{monthLabel}</b>.</div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFileChange} disabled={excelParsing}
                className="text-xs" style={{ color: C.amber }} />
              {excelParsing && <span>Leyendo archivo…</span>}
            </div>
            {excelParseError && <div className="mt-2" style={{ color: C.red }}>{excelParseError}</div>}

            {excelParsed && (
              <div className="mt-2 rounded-md p-2" style={{ background: C.panel }}>
                <div className="mb-1" style={{ color: C.ink }}>
                  Se cargarán <b>{excelParsed.entries.length}</b> registros para <b>{excelParsed.names.length}</b> persona(s) en <b>{monthLabel}</b>.
                </div>
                {excelParsed.warnings.length > 0 && (
                  <div className="mb-1" style={{ color: C.red }}>
                    {excelParsed.warnings.length} aviso(s) — estos días se dejaron vacíos, revísalos a mano después:
                    <ul className="list-disc pl-4 mt-1">
                      {excelParsed.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                      {excelParsed.warnings.length > 8 && <li>…y {excelParsed.warnings.length - 8} más.</li>}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Button size="sm" icon={Upload} disabled={excelApplying} onClick={doApplyExcelImport}>
                    {excelApplying ? "Guardando…" : `Confirmar e importar a ${monthLabel}`}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={excelApplying} onClick={() => { setExcelParsed(null); setExcelParseError(null); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {isAdmin && showManage && <EmployeeManagePanel employees={employees} onCreateEmployee={onCreateEmployee} onUpdateEmployee={onUpdateEmployee} onDeleteEmployee={onDeleteEmployee} />}

      {isAdmin && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.amber, background: C.panel }}>
          <button onClick={() => setShowAiPanel(v => !v)} className="flex items-center gap-2 w-full text-left">
            <Sparkles size={16} color={C.amber} />
            <span className="text-sm font-semibold flex-1" style={{ color: C.ink }}>Generar borrador de {monthLabel} con IA</span>
            {showAiPanel ? <ChevronDown size={16} color={C.gray} /> : <ChevronRight size={16} color={C.gray} />}
          </button>

          {showAiPanel && !draftActive && (
            <div className="mt-3">
              <div className="mb-3">
                <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>Reglas generales del equipo (se guardan y se usan SIEMPRE, en todos los meses)</div>
                <div className="text-xs mb-2" style={{ color: C.inkSoft }}>
                  Esto no hay que volver a escribirlo cada mes — se guarda una sola vez y la IA lo tiene en cuenta siempre que generes un horario, hasta que tú lo cambies aquí.
                </div>
                {standingRulesLoaded ? (
                  <>
                    <textarea value={standingRules} onChange={e => setStandingRules(e.target.value)} rows={5}
                      className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="ghost" disabled={standingRulesSaving} onClick={saveStandingRules}>
                        {standingRulesSaving ? "Guardando…" : "Guardar reglas generales"}
                      </Button>
                      {standingRulesSaved && <span className="text-xs" style={{ color: C.green }}>Guardado ✓</span>}
                      {standingRulesLog.length > 0 && (
                        <button onClick={() => setShowRulesLog(v => !v)} className="text-xs font-semibold ml-auto" style={{ color: C.blue }}>
                          {showRulesLog ? "Ocultar historial" : `Ver historial (${standingRulesLog.length})`}
                        </button>
                      )}
                    </div>
                    {showRulesLog && (
                      <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto rounded-md border p-2" style={{ borderColor: C.line }}>
                        {standingRulesLog.map((h, i) => (
                          <div key={i} className="text-xs rounded-md px-2 py-1.5" style={{ background: C.bg, color: C.ink }}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <b>{h.by}</b>
                              <span style={{ color: C.gray }}>{fmtDT(h.at)}</span>
                            </div>
                            <div style={{ color: C.gray }}>Antes: <span className="italic">{h.before ? h.before.slice(0, 140) + (h.before.length > 140 ? "…" : "") : "(vacío)"}</span></div>
                            <div style={{ color: C.ink }}>Después: <span className="italic">{h.after.slice(0, 140)}{h.after.length > 140 ? "…" : ""}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : <div className="text-xs" style={{ color: C.inkSoft }}>Cargando…</div>}
              </div>

              <div className="pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="text-xs font-semibold mb-1 mt-2" style={{ color: C.ink }}>¿Algo especial solo para {monthLabel}? (opcional, no se guarda)</div>
                <textarea value={aiRulesText} onChange={e => setAiRulesText(e.target.value)} rows={3}
                  placeholder="Ej: Barrios está de vacaciones del 10 al 15. Esta semana hace falta un refuerzo extra el jueves."
                  className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <Button size="sm" icon={Sparkles} disabled={aiGenerating} onClick={doGenerateAiDraft}>
                  {aiGenerating ? "Generando borrador…" : "Generar borrador"}
                </Button>
                {aiError && <div className="text-xs mt-2" style={{ color: C.red }}>{aiError}</div>}
              </div>
            </div>
          )}

          {draftActive && (
            <div className="mt-3">
              <div className="rounded-md p-2 mb-2 text-xs" style={{ background: C.amberSoft, color: C.amber }}>
                <b>Borrador sin guardar</b> — las celdas marcadas con <Sparkles size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> en
                la tabla de abajo son las que propuso la IA. Haz clic en cualquiera para editarla antes de guardar, igual que con una celda normal.
              </div>
              {aiNotes && <div className="text-xs mb-2" style={{ color: C.inkSoft }}><b>Notas de la IA:</b> {aiNotes}</div>}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" disabled={applyingDraft} onClick={doApplyAiDraft}>
                  {applyingDraft ? "Guardando…" : `Guardar este horario (${Object.keys(draftOverrides).length} celdas)`}
                </Button>
                <Button size="sm" variant="ghost" disabled={applyingDraft} onClick={doDiscardAiDraft}>Descartar borrador</Button>
              </div>
              {aiError && <div className="text-xs mt-2" style={{ color: C.red }}>{aiError}</div>}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <span className="text-xs" style={{ color: C.inkSoft }}>Descarga los turnos de este mes para agregarlos a tu calendario del celular:</span>
        <select value={icsEmployeeId} onChange={e => setIcsEmployeeId(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Elige tu nombre…</option>
          {sortedEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <Button size="sm" variant="ghost" icon={Download} disabled={!icsEmployeeId}
          onClick={() => {
            const emp = employees.find(e => e.id === icsEmployeeId);
            if (!emp) return;
            const ics = buildIcsForEmployee(emp, daysIso, entriesByEmployee);
            const blob = new Blob([ics], { type: "text/calendar" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `turnos-${emp.name.replace(/\s+/g, "-")}-${monthDate.getFullYear()}-${monthDate.getMonth() + 1}.ics`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
          Agregar al calendario
        </Button>
      </div>

      {canEdit && editingCell && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.amber, background: C.amberSoft }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.amber }}>
            {activeEmployees.find(e => e.id === editingCell.employeeId)?.name} — {fmtDayFull(new Date(editingCell.dateIso + "T00:00:00"))}
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-2 text-sm">
            <label className="flex items-center gap-1" style={{ color: C.amber }}>
              <input type="radio" checked={draftMode === "hours"} onChange={() => setDraftMode("hours")} /> Horas exactas
            </label>
            <label className="flex items-center gap-1" style={{ color: C.amber }}>
              <input type="radio" checked={draftMode === "special"} onChange={() => setDraftMode("special")} /> Día especial
            </label>
          </div>

          {draftMode === "hours" ? (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <input type="number" step="0.5" value={draftEntrada} onChange={e => setDraftEntrada(e.target.value)} placeholder="Entrada (ej. 8.5)"
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input type="number" step="0.5" value={draftSalida} onChange={e => setDraftSalida(e.target.value)} placeholder="Salida (ej. 16.5)"
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <span className="text-xs" style={{ color: C.gray }}>Formato decimal: 8.5 = 8:30, 16.5 = 4:30 p.m.</span>
            </div>
          ) : (
            <div className="mb-2">
              <select value={draftCode} onChange={e => setDraftCode(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <option value="">(elegir)</option>
                {SPECIAL_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
          )}

          <input value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="Nota (opcional)"
            className="text-sm border rounded-md px-2 py-1.5 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />

          {impact && (
            <div className="text-xs rounded-md p-2 mb-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <div style={{ color: C.ink }}>
                Semana {impact.weekLabel}: <b>{impact.before}h</b> antes → <b style={{ color: Math.abs(impact.diff) >= 4 ? C.red : C.ink }}>{impact.after}h</b> con este cambio
                (objetivo {WEEKLY_HOURS_TARGET}h, {impact.diff >= 0 ? "+" : ""}{Math.round(impact.diff * 10) / 10}h de diferencia).
              </div>
              {impact.isSundayHoliday && draftMode === "hours" && draftEntrada !== "" && (
                <div style={{ color: C.red }} className="mt-1">⚠ Este día es domingo o festivo.</div>
              )}
              {impact.restDayHit && (
                <div style={{ color: C.red }} className="mt-1">⚠ Este empleado tiene este día marcado como descanso fijo.</div>
              )}
            </div>
          )}

          {draftMode === "hours" && (() => {
            const entrada = draftEntrada === "" ? null : Number(draftEntrada);
            const salida = draftSalida === "" ? null : Number(draftSalida);
            const overlapWarning = checkShiftOverlap(editingCell.employeeId, editingCell.dateIso, entrada, salida, scheduleEntries);
            return overlapWarning ? (
              <div className="text-xs rounded-md p-2 mb-2 flex items-center gap-1.5" style={{ background: C.redSoft, color: C.red }}>
                <AlertTriangle size={13} className="shrink-0" /> {overlapWarning}
              </div>
            ) : null;
          })()}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveCell}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingCell(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este mes</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="text-xs mb-2" style={{ color: C.gray }}>
        Encabezado en rojo = domingo o festivo. Cada celda muestra hora de entrada-salida (ej. 8.5-16.5). Las alertas (⚠) son una ayuda
        visual según las reglas que nos diste — no reemplazan la revisión de las normas laborales vigentes.
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 150, position: "sticky", left: 0, zIndex: 2, background: C.steelDark, boxShadow: "2px 0 4px rgba(0,0,0,0.15)" }}>Empleado</th>
              {daysIso.map(d => {
                const dd = new Date(d + "T00:00:00");
                return (
                  <th key={d} className="px-1 py-2 text-center" style={{ minWidth: 46, background: isSundayOrHoliday(d) ? "#7a3535" : C.steelDark }}>
                    {dd.getDate()}
                  </th>
                );
              })}
              <th className="px-2 py-2 text-center" style={{ minWidth: 46 }}>Dom/Fest</th>
              <th className="px-2 py-2 text-center" style={{ minWidth: 50 }}>Total mes</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastCargo = null;
              return sortedEmployees.map((emp, i) => {
                const entries = viewEntriesByEmployee[emp.id] || {};
                const { sundaysHolidaysCount, warnings } = computeScheduleWarnings(emp, daysIso, entries);
                const monthTotal = weeks.reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
                const showGroupHeader = (emp.cargo || "") !== lastCargo;
                lastCargo = emp.cargo || "";
                return (
                  <React.Fragment key={emp.id}>
                    {showGroupHeader && (
                      <tr>
                        <td colSpan={daysIso.length + 3} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                          {emp.cargo || "Sin cargo asignado"}
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                      <td className="px-2 py-1.5" style={{ color: C.ink, fontWeight: 500, position: "sticky", left: 0, zIndex: 1, background: i % 2 ? C.cardAlt : C.panel, boxShadow: "2px 0 4px rgba(0,0,0,0.08)" }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={emp.name} cargo={emp.cargo} size={18} />
                          {emp.name}
                        </span>
                        {emp.badge && (
                          <span className="text-[10px] font-normal ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: "#f0e6fb", color: "#6b21a8" }}>
                            {emp.badge}
                          </span>
                        )}
                        {emp.reductionHoursPerDay > 0 && (() => {
                          const comp = computeCompBalance(emp, scheduleEntries);
                          return (
                            <span className="text-[10px] font-normal ml-1.5 px-1.5 py-0.5 rounded-full" title="Horas de reducción acumuladas (informativo — no se asigna sola, la das tú a mano poniendo el código COMP en el día que elijas)"
                              style={{ background: comp.fullDays >= 1 ? C.amberSoft : C.line, color: comp.fullDays >= 1 ? C.amber : C.gray }}>
                              {comp.fullDays >= 1 ? `¡${comp.fullDays} día(s) ganado(s)!` : `${comp.hours}h acum.`}
                            </span>
                          );
                        })()}
                        {warnings.length > 0 && <AlertTriangle size={12} style={{ display: "inline", color: C.red, marginLeft: 4, verticalAlign: "-1px" }} />}
                      </td>
                      {daysIso.map(d => {
                        const entry = entries[d];
                        const isDraftCell = draftActive && !!draftOverrides[scheduleKey(emp.id, d)];
                        const colors = entry?.code ? getSpecialCodeColors()[entry.code] : null;
                        return (
                          <td key={d} className="px-0.5 py-1 text-center" style={{
                            background: isDraftCell ? C.amberSoft : (colors?.bg || (isSundayOrHoliday(d) ? C.redSoft : "transparent")),
                            boxShadow: isDraftCell ? `inset 0 0 0 1px ${C.amber}` : "none",
                          }}>
                            {canEdit ? (
                              <button onClick={() => openCell(emp.id, d)} className="w-full text-xs py-1" style={{ color: colors?.fg || C.ink }}>
                                {fmtEntryShort(entry) || "·"}{isDraftCell && <Sparkles size={9} style={{ display: "inline", marginLeft: 2, verticalAlign: "1px", color: C.amber }} />}
                              </button>
                            ) : (
                              <span className="text-xs" style={{ color: colors?.fg || C.ink }}>{fmtEntryShort(entry)}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-semibold" style={{ color: sundaysHolidaysCount > 3 ? C.red : C.ink }}>{sundaysHolidaysCount}</td>
                      <td className="px-2 py-1.5 text-center font-semibold" style={{ color: C.ink }}>{monthTotal || ""}</td>
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
            {activeEmployees.length === 0 && (
              <tr><td className="px-2 py-6 text-center text-xs" colSpan={daysIso.length + 3} style={{ color: C.gray }}>
                Sin empleados registrados todavía.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {employeeWarnings.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Alertas de este mes</div>
          {employeeWarnings.map(({ emp, warnings }) => (
            <div key={emp.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}>
                <Avatar name={emp.name} cargo={emp.cargo} size={22} /> {emp.name}
              </div>
              {warnings.map((w, i) => <div key={i} className="text-xs" style={{ color: C.red }}>⚠ {w}</div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}