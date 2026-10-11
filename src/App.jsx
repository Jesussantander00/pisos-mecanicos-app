import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Bell, BookOpen, Building2, CalendarDays, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock, Cloud, CloudOff, Download, Droplets, Eye, Gauge, History, Home, Layers, LogOut, Mail, Menu as MenuIcon, Moon, Package, PackagePlus, PlusCircle, QrCode, RotateCcw, Save, Search, Send, Settings as SettingsIcon, ShieldCheck, Snowflake, Sparkles, Sun, Thermometer, Trash2, TrendingDown, TrendingUp, Upload, User, Users, WifiOff, Wrench, X, Zap } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import * as XLSX from "xlsx";
import { exportFullBackup, flushOfflineQueue, flushPhotoRecordQueue, getPendingCount, getPendingPhotoQueue, getPendingPhotoRecordsCount, sGet, sSet, uploadPhoto } from "./lib/storage";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Avatar, BackupButton, Badge, Button, ConfirmDialog, NavBadge, PcbBackground, PendingItemsAlert, Pill, QrCodeBox, Sparkline, VerticalBarChart, VoiceInputButton } from "./shared/components";
import { ALL_COLD_ROOM_ITEMS, ALL_METERS, AUDIT_ACTION_COLORS, AUDIT_ACTION_LABELS, AUDIT_KIND_COLORS, AUDIT_KIND_LABELS, C, COLD_ROOMS, COLD_ROOMS_FLOOR, DEFAULT_CHANGELOG_SEED, FUEL_ITEMS, GERENCIA_ALLOWED_VIEWS, GYM_ALL_ITEMS, GYM_AREA_ITEMS, GYM_CARDIO_ITEMS, GYM_FLOOR, GYM_FUERZA_ITEMS, GYM_STATUS_OPTS, ICE_MACHINES_AB, LAVANDERIA_FLOOR, LAVANDERIA_ITEMS, LAVANDERIA_STATUS_OPTS, METER_GROUPS, ONBOARDING_STEPS, SHIFTS, SPECIAL_CODES, TANK_ITEMS, TASK_PRIORITIES, TASK_STATES, TRASH_TYPE_LABELS, WIKI_CATEGORIAS, addDays, aiRequestHeaders, applyTheme, authHeaders, bufferToBase64, buildAiContextSummary, buildColdRoomsWeekGrid, buildMeterWeekGrid, buildMetersWeekWorkbook, bumpAiUsage, computeColdOutOfRange, computeCompBalance, computeCriticalStock, computeEquipoStats, computeLowStock, computeMeterAnomalies, computePreventiveStatus, computeRoundCompletionSummary, computeShiftCompletionAlerts, computeStaleIssues, computeUpcomingMaintenance, currentEquipoStatus, daysInMonthIso, elapsed, fmtDT, fmtDayFull, fmtDayShort, fmtEntryShort, generateAllShelvesQrPdf, generateColdRoomsWeekPdf, generateMetersWeekPdf, getDeviceId, getDeviceInfo, getSpecialCodeColors, hoursBetween, isColdRoomOutOfRange, isNightHour, isPendingReview, isSameCalendarDay, isSundayOrHoliday, isTaskSnoozed, lastTaskActivityMs, localDateIso, matchHotsosAssignee, monthKeyOf, normalizeSearchText, normalizeTaskState, nowIso, periodKeyFor, readMeterFromPhoto, requestAdminAction, requestAiAssistant, requestCreateProfile, requestProcedure, scheduleKey, sendColdRoomsWeekEmailAuto, sendMetersWeekExcelEmailAuto, sendPushToSubscriptions, sendTourEmailAuto, shelfUrl, showToast, startOfWeek, subscribeToPush, todayStr, toolUrl, uid, useBackClose, useBackCloseModal, validateRoundEntries, weekTotalHours, weeksInRange } from "./shared/core";
import { ColdRoomsView } from "./views/ColdRoomsView";
import { EquipmentRow } from "./views/EquipmentRow";
import { StockAlertsView } from "./views/StockAlertsView";
import { InventoryMovementsView } from "./views/InventoryMovementsView";
import { ShelfDetailView } from "./views/ShelfDetailView";
import { EquipoDetailView } from "./views/EquipoDetailView";
import { SistemasListView } from "./views/SistemasListView";
import { DriveArchivePanel } from "./views/DriveArchivePanel";
import { DiagramsView } from "./views/DiagramsView";
import { DEFAULT_SYSTEM_DIAGRAMS_SEED, DEFAULT_SYSTEM_PROCEDURES_SEED, FLOORS } from "./shared/seeds";
import { GlobalSearch } from "./views/GlobalSearch";
import { HomeView } from "./views/HomeView";
import { RoundView } from "./views/RoundView";
import { ProfileView } from "./views/ProfileView";
import { HandoffView } from "./views/HandoffView";
import { ReportsView } from "./views/ReportsView";
import { FuelTanksView } from "./views/FuelTanksView";
import { ContractorVisitsView } from "./views/ContractorVisitsView";
import { HabitacionesView } from "./views/HabitacionesView";
import { HotsosImportView } from "./views/HotsosImportView";
import { HVACView } from "./views/HVACView";
import { EquipmentAnalyticsView } from "./views/EquipmentAnalyticsView";
import { MaintenanceAnalyticsView } from "./views/MaintenanceAnalyticsView";
import { ExecutivePanelView } from "./views/ExecutivePanelView";
import { MaintenanceLogAuditView } from "./views/MaintenanceLogAuditView";
import { CronogramaAnualView } from "./views/CronogramaAnualView";
import { SchedulesView } from "./views/SchedulesView";
import { TasksView } from "./views/TasksView";
import { PlanosView } from "./views/PlanosView";
import { RoomHistoryView } from "./views/RoomHistoryView";
import { TodayBoardView } from "./views/TodayBoardView";
import { AdminView } from "./views/AdminView";
import { __pmState } from "./shared/core";


function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setItems(prev => [...prev, t]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), 3800);
    };
    __pmState._toastListeners.push(handler);
    return () => { __pmState._toastListeners = __pmState._toastListeners.filter(l => l !== handler); };
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center px-4 w-full sm:w-auto pointer-events-none">
      {items.map(t => (
        <div key={t.id} className="pm-slide-up-in rounded-xl shadow-lg px-4 py-2.5 text-sm font-medium max-w-[90vw] sm:max-w-sm text-center pointer-events-auto flex items-center justify-center gap-2"
          style={{ background: t.ok ? "linear-gradient(135deg,#1a7f4a,#15803d)" : "linear-gradient(135deg,#c0392b,#a93226)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}>
          {t.ok ? <CheckCircle2 size={16} className="shrink-0 pm-pop" aria-hidden="true" /> : <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   AUTENTICACIÓN (usuario + contraseña)
   Nota de seguridad real: las contraseñas se guardan como hash SHA-256
   en el almacenamiento compartido del artifact. Es una protección básica
   de acceso para el equipo, NO un sistema de autenticación de nivel
   empresarial (no hay servidor propio, recuperación de contraseña, etc.).
   ============================================================ */
function AuthScreen({ onLogin, onRegister, error, busy }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = () => {
    if (!email.trim() || !password) return;
    if (mode === "register") {
      if (!displayName.trim() || password !== password2) return;
      onRegister(email.trim(), password, displayName.trim());
    } else {
      onLogin(email.trim(), password);
    }
  };

  return (
    <div className="pcb-auth min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(120% 70% at 50% 18%, #0d2740 0%, #071522 55%, #040b13 100%)" }}>
      <PcbBackground variant="login" />
      <div className="w-full max-w-sm mx-4 relative" style={{ zIndex: 2 }}>
        <div className="text-center mb-6">
          <img src="/icon-192.png" alt="QuinTech" className="mx-auto rounded-3xl mb-3 object-cover" style={{ width: 84, height: 84, border: "1px solid rgba(125,211,252,.55)", boxShadow: "0 0 0 6px rgba(56,189,248,.08), 0 0 42px rgba(56,189,248,.55)" }} />
          <h1 className="text-white text-3xl font-bold tracking-tight" style={{ textShadow: "0 2px 14px rgba(4,12,20,.9)" }}>QuinTech</h1>
          <p className="text-sm" style={{ color: "#8fa3b8" }}>{mode === "login" ? "Inicia sesión para comenzar el recorrido" : "Crea tu cuenta de operador"}</p>
          <p className="text-xs font-semibold mt-1" style={{ color: "#7dd3fc", letterSpacing: "0.22em", textTransform: "uppercase", textShadow: "0 2px 12px rgba(4,12,20,.9)" }}>Innovación Tecnológica</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "rgba(8,20,33,.72)", border: "1px solid rgba(125,211,252,.3)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)" }}>
          <div className="flex rounded-xl overflow-hidden mb-4 p-1 gap-1" style={{ background: "rgba(3,10,18,.7)" }}>
            <button onClick={() => setMode("login")} className="flex-1 py-2 text-sm font-semibold"
              style={{ background: mode === "login" ? "linear-gradient(135deg,#38bdf8,#2563eb)" : "transparent", color: mode === "login" ? "#04121f" : "#9fb8cc", borderRadius: 9, minHeight: 40 }}>Iniciar sesión</button>
            <button onClick={() => setMode("register")} className="flex-1 py-2 text-sm font-semibold"
              style={{ background: mode === "register" ? "linear-gradient(135deg,#38bdf8,#2563eb)" : "transparent", color: mode === "register" ? "#04121f" : "#9fb8cc", borderRadius: 9, minHeight: 40 }}>Crear cuenta</button>
          </div>

          <div className="space-y-2.5">
            {mode === "register" && (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tu nombre completo"
                autoComplete="name"
                className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: "rgba(148,197,235,.28)", background: "rgba(5,14,24,.7)", color: "#e8f3fc", minHeight: 46 }} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo" type="email"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email"
              className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: "rgba(148,197,235,.28)", background: "rgba(5,14,24,.7)", color: "#e8f3fc", minHeight: 46 }} />
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Contraseña"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-3 py-2 pr-16 rounded-md text-sm border outline-none" style={{ borderColor: "rgba(148,197,235,.28)", background: "rgba(5,14,24,.7)", color: "#e8f3fc", minHeight: 46 }}
                onKeyDown={e => { if (e.key === "Enter" && mode === "login") submit(); }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-1" style={{ color: "#7dd3fc" }}>
                {showPw ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "register" && (
              <input value={password2} onChange={e => setPassword2(e.target.value)} type={showPw ? "text" : "password"} placeholder="Confirmar contraseña"
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: "rgba(148,197,235,.28)", background: "rgba(5,14,24,.7)", color: "#e8f3fc", minHeight: 46 }}
                onKeyDown={e => { if (e.key === "Enter") submit(); }} />
            )}
            {mode === "register" && password2 && password !== password2 && (
              <div className="text-xs" style={{ color: "#fca5a5" }}>Las contraseñas no coinciden.</div>
            )}
            {error && <div className="text-xs" style={{ color: "#fca5a5" }}>{error}</div>}
            {mode === "register" && (
              <div className="text-xs rounded-md p-2" style={{ background: C.amberSoft, color: C.ink }}>
                Tu cuenta queda pendiente de aprobación por un administrador (salvo que seas la primera persona en registrarse en todo el sistema).
              </div>
            )}
            <Button icon={mode === "login" ? User : PlusCircle} disabled={busy} onClick={submit} size="md">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
            {mode === "login" && (
              <p className="text-xs text-center" style={{ color: "#9fb8cc" }}>
                ¿Olvidaste tu contraseña? Pídele a un administrador que te la restablezca desde el Panel de administrador.
              </p>
            )}
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: "#7f97ad" }}>
          Acceso por correo y contraseña para identificar cada recorrido. No sustituye un sistema de seguridad corporativo.
          Una vez inicias sesión en este navegador, queda recordada aquí — no hace falta volver a entrar cada vez que abres la página,
          salvo que borres los datos de navegación o uses una pestaña de incógnito.
        </p>
      </div>
    </div>
  );
}

/** Pantalla obligatoria cuando un administrador le puso la contraseña a esta cuenta (reset o
 *  cuenta nueva): no deja pasar al resto de la app hasta que la persona ponga una contraseña
 *  propia, para que el admin no siga sabiendo la clave real de ahí en adelante. */
function ForcedPasswordChangeScreen({ onDone, onLogout }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== password2) { setError("Las dos contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message || "No se pudo cambiar la contraseña."); setBusy(false); return; }
      await onDone();
    } catch {
      setError("No se pudo conectar para cambiar la contraseña. Revisa tu conexión e intenta de nuevo.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="max-w-sm w-full rounded-xl border p-6" style={{ borderColor: C.line, background: C.panel }}>
        <ShieldCheck size={32} style={{ color: C.amber, margin: "0 auto 12px", display: "block" }} />
        <h2 className="text-base font-semibold mb-2 text-center" style={{ color: C.ink }}>Pon tu propia contraseña</h2>
        <p className="text-sm mb-4 text-center" style={{ color: C.inkSoft }}>
          Un administrador te dio acceso con una contraseña provisional. Antes de seguir, escribe una nueva que solo tú conozcas.
        </p>
        <div className="relative mb-2">
          <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nueva contraseña (mínimo 8 caracteres)"
            className="w-full text-sm border rounded-md px-3 py-2.5 outline-none pr-10" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPw ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: C.gray }}>
            <Eye size={16} />
          </button>
        </div>
        <input type={showPw ? "text" : "password"} value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Repite la nueva contraseña"
          className="w-full text-sm border rounded-md px-3 py-2.5 outline-none mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        {error && <div className="text-xs mb-3" style={{ color: C.red }}>{error}</div>}
        <Button className="w-full mb-2" disabled={busy || !password || !password2} onClick={submit}>
          {busy ? "Guardando…" : "Guardar y continuar"}
        </Button>
        <Button variant="ghost" className="w-full" icon={LogOut} onClick={onLogout}>Salir</Button>
      </div>
    </div>
  );
}

/* ============================================================
   VISTA: CUARTOS FRÍOS Y MÁQUINAS DE HIELO
   ============================================================ */
/** Envuelve la vista diaria y el historial semanal en pestañas, para no tener 2 tarjetas separadas en Inicio. */
function TabbedColdRoomsView(props) {
  const [tab, setTab] = useState("diario");
  return (
    <div>
      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit" style={{ borderColor: C.line }}>
        <button onClick={() => setTab("diario")} className="px-3 font-semibold" style={{ background: tab === "diario" ? C.steelDark : C.panel, color: tab === "diario" ? "#fff" : C.inkSoft, minHeight: 36 }}>Diario</button>
        <button onClick={() => setTab("historial")} className="px-3 font-semibold" style={{ background: tab === "historial" ? C.steelDark : C.panel, color: tab === "historial" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>Historial semanal</button>
      </div>
      {tab === "diario"
        ? <ColdRoomsView {...props} />
        : <ColdRoomsWeeklyView coldHistory={props.coldHistory} reportEmail={props.reportEmail} onLogSent={props.onLogSent} currentUser={props.currentUser} mySignature={props.mySignature} />}
    </div>
  );
}

/** Igual que arriba, pero para medidores. */
function TabbedMetersView(props) {
  const [tab, setTab] = useState("diario");
  return (
    <div>
      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit" style={{ borderColor: C.line }}>
        <button onClick={() => setTab("diario")} className="px-3 font-semibold" style={{ background: tab === "diario" ? C.steelDark : C.panel, color: tab === "diario" ? "#fff" : C.inkSoft, minHeight: 36 }}>Diario</button>
        <button onClick={() => setTab("historial")} className="px-3 font-semibold" style={{ background: tab === "historial" ? C.steelDark : C.panel, color: tab === "historial" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>Historial semanal</button>
      </div>
      {tab === "diario"
        ? <MetersView {...props} />
        : <MetersWeeklyView meterHistory={props.meterHistory} reportEmail={props.reportEmail} onLogSent={props.onLogSent} currentUser={props.currentUser} mySignature={props.mySignature} />}
    </div>
  );
}

/* ============================================================
   VISTA: LECTURAS DE MEDIDORES
   ============================================================ */
function MeterRow({ meter, entry, onChange, previous }) {
  const subs = meter.subs || ["value"];
  const update = (sub, v) => onChange(meter.id, { ...entry, [sub]: v });
  const [reading, setReading] = useState(null); // qué "sub" está leyendo ahora mismo, o null
  const [readMsg, setReadMsg] = useState(null);
  const [confirmedSubs, setConfirmedSubs] = useState({}); // {sub: true} — quedó leído por foto y sin tocar desde entonces

  const doRead = async (sub, file) => {
    setReading(sub); setReadMsg(null);
    try {
      const prevVal = previous?.[sub];
      const res = await readMeterFromPhoto(file, prevVal !== undefined && prevVal !== "" ? prevVal : null, meter.n);
      if (res.ok) {
        update(sub, res.lectura);
        setConfirmedSubs(prev => ({ ...prev, [sub]: true }));
        setReadMsg({ ok: true, text: `Leído: ${res.lectura}` });
        bumpAiUsage("meterReadings");
      } else setReadMsg({ ok: false, text: res.message || "No se pudo leer." });
    } catch { setReadMsg({ ok: false, text: "No se pudo leer (revisa la conexión)." }); }
    setReading(null);
  };

  const updateManual = (sub, v) => {
    update(sub, v);
    setConfirmedSubs(prev => { const next = { ...prev }; delete next[sub]; return next; }); // si lo editan a mano, ya no es "confirmado por foto"
  };

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <div className="text-sm font-medium mb-2" style={{ color: C.ink }}>{meter.n}</div>
      <div className="flex flex-wrap gap-4">
        {subs.map(sub => {
          const val = entry?.[sub];
          const prevVal = previous?.[sub];
          const hasBoth = val !== undefined && val !== "" && prevVal !== undefined && prevVal !== "" && !isNaN(Number(val)) && !isNaN(Number(prevVal));
          const consumo = hasBoth ? Number(val) - Number(prevVal) : null;
          const confirmed = !!confirmedSubs[sub];
          return (
            <div key={sub} className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: C.gray }}>
                {meter.subs ? sub : "Lectura"}{meter.u ? ` (${meter.u})` : ""}
              </label>
              <div className="flex items-center gap-1">
                <input type="number" step="any" inputMode="decimal" value={val ?? ""} onChange={e => updateManual(sub, e.target.value)}
                  placeholder="valor" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none"
                  style={{ borderColor: confirmed ? C.green : C.line, borderWidth: confirmed ? 2 : 1, background: confirmed ? C.greenSoft : C.panel, color: C.ink }} />
                <label className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer shrink-0" style={{ background: C.blueSoft, color: C.blue }}>
                  {reading === sub ? "…" : <Camera size={13} />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={reading !== null}
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doRead(sub, f); }} />
                </label>
              </div>
              {confirmed && <span className="text-xs mt-1 font-medium" style={{ color: C.green }}>✓ Leído por foto</span>}
              {consumo !== null ? (
                <span className="text-xs mt-1" style={{ color: consumo < 0 ? C.red : C.green }}>
                  Consumo: {consumo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}{meter.u ? ` ${meter.u}` : ""}
                </span>
              ) : prevVal !== undefined && prevVal !== "" ? (
                <span className="text-xs mt-1" style={{ color: C.gray }}>Anterior: {prevVal}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {readMsg && (
        <div className="text-xs font-medium mt-1" style={{ color: readMsg.ok ? C.amber : C.red }}>
          {readMsg.ok ? "📷" : "⚠"} {readMsg.text}{readMsg.ok ? " — revisa que coincida con el medidor antes de guardar." : ""}
        </div>
      )}
    </div>
  );
}

function MetersView({ currentUser, shift, latestMeterValues, onSaveMetersRound, meterHistory }) {
  const DRAFT_KEY = "pm-local:meters-draft";
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").entries || {}; } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").notes || ""; } catch { return ""; }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [restoredDraft] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").entries || {}).length > 0; } catch { return false; }
  });

  // Guarda un borrador en este celular cada vez que algo cambia — así, si la app se recarga o se
  // cierra por sorpresa (por ejemplo al actualizar a una versión nueva) antes de darle "Guardar
  // lecturas", lo que ya se había escrito no se pierde: se recupera solo al volver a entrar.
  useEffect(() => {
    try {
      if (Object.keys(entries).length > 0 || notes) localStorage.setItem(DRAFT_KEY, JSON.stringify({ entries, notes }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
  }, [entries, notes]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = ALL_METERS.filter(m => {
    const e = entries[m.id]; if (!e) return false;
    const subs = m.subs || ["value"];
    return subs.some(s => e[s] !== undefined && e[s] !== "");
  }).length;

  const anomalies = useMemo(() => computeMeterAnomalies(meterHistory || {}), [meterHistory]);

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      await onSaveMetersRound(entries, notes);
      setSaved(true);
      setEntries({});
      setNotes("");
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    } catch (e) {
      setSaveError("No se pudo guardar — revisa tu conexión e intenta de nuevo.");
      showToast("✗ No se pudieron guardar las lecturas.", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Lecturas de Medidores</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{ALL_METERS.length} medidores · Turno {shift} · {todayStr()}</p>
        </div>
        <Pill tone="gray">{filledCount}/{ALL_METERS.length} registrados</Pill>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: C.blue }}>
        Escribe la lectura actual de cada medidor. El consumo (diferencia contra la última lectura guardada) se calcula solo, igual que en el Excel.
      </div>

      {restoredDraft && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold" style={{ background: C.amberSoft, color: C.amber }}>
          📋 Recuperamos lecturas que habías escrito y no habías guardado todavía — revísalas antes de continuar.
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold flex items-start gap-2" style={{ background: C.redSoft, color: C.red }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {anomalies.length} lectura{anomalies.length !== 1 ? "s" : ""} con consumo negativo detectada{anomalies.length !== 1 ? "s" : ""} (probable error de lectura o medidor reiniciado):{" "}
            {anomalies.map((a, i) => `${a.meter.n}${a.sub && a.sub !== "value" ? ` (${a.sub})` : ""}`).join(", ")}
          </span>
        </div>
      )}

      {METER_GROUPS.map(group => (
        <div key={group.id}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>{group.title}</div>
          {group.meters.map(m => (
            <MeterRow key={m.id} meter={m} entry={entries[m.id]} onChange={onChange} previous={latestMeterValues[m.id]} />
          ))}
        </div>
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones sobre las lecturas de hoy…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <div className="flex items-center justify-between mt-4 sticky bottom-16 sm:bottom-0 py-2 px-2 -mx-2 rounded-t-lg" style={{ background: C.bg }}>
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar lecturas"}</Button>
      </div>
      {saveError && <div className="text-right text-sm mt-1" style={{ color: C.red }}>{saveError}</div>}
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Lecturas guardadas correctamente</div>}
    </div>
  );
}

/* ============================================================
   VISTA: CHECKLIST DE ÁREA (Lavandería / Gimnasio — mismo patrón)
   ============================================================ */
/** Une Lavandería, Gimnasio y Caldera bajo un solo módulo, en vez de 3 tarjetas sueltas en Inicio. */
function FichasTecnicasHubView(props) {
  const [tab, setTab] = useState("laundry");
  const tabs = [
    { id: "laundry", label: "Lavandería" },
    { id: "gym", label: "Gimnasio" },
    { id: "boiler", label: "Caldera" },
  ];
  return (
    <div>
      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit" style={{ borderColor: C.line }}>
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-3 font-semibold"
            style={{ background: tab === t.id ? C.steelDark : C.panel, color: tab === t.id ? "#fff" : C.inkSoft, borderLeft: i > 0 ? `1px solid ${C.line}` : "none", minHeight: 36 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "laundry" && (
        <AreaChecklistView title="Equipos de Lavandería" subtitle="Piso 4"
          sections={[{ title: null, items: LAVANDERIA_ITEMS }]} statusOptions={LAVANDERIA_STATUS_OPTS}
          currentUser={props.currentUser} shift={props.shift} activeIssues={props.activeIssues} latestValues={props.latestLavanderiaValues}
          onResolveIssue={props.onResolveIssue} onSaveRound={props.onSaveLavanderiaRound} />
      )}
      {tab === "gym" && (
        <AreaChecklistView title="Equipos de Gimnasio" subtitle="Piso 14"
          sections={[
            { title: "Equipos de Cardio", items: GYM_CARDIO_ITEMS },
            { title: "Máquinas de Fuerza", items: GYM_FUERZA_ITEMS },
            { title: "Equipo / Área", items: GYM_AREA_ITEMS },
          ]} statusOptions={GYM_STATUS_OPTS}
          currentUser={props.currentUser} shift={props.shift} activeIssues={props.activeIssues} latestValues={props.latestGymValues}
          onResolveIssue={props.onResolveIssue} onSaveRound={props.onSaveGymRound} />
      )}
      {tab === "boiler" && (
        <CalderaView currentUser={props.currentUser} shift={props.shift} onSaveCaldera={props.onSaveCalderaRound} lastCalderaRound={props.lastCalderaRound} />
      )}
    </div>
  );
}

function AreaChecklistView({ title, subtitle, sections, statusOptions, currentUser, shift, activeIssues, latestValues, onResolveIssue, onSaveRound }) {
  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const [entries, setEntries] = useState({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const seeded = {};
    allItems.forEach(item => {
      const lv = latestValues[item.id];
      if (lv) seeded[item.id] = { status: lv.status, value: lv.value, observation: activeIssues[item.id] ? undefined : lv.observation, damaged: !!activeIssues[item.id] };
      else if (activeIssues[item.id]) seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
    });
    setEntries(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = allItems.filter(item => {
    const e = entries[item.id];
    return e && (e.status || (e.value !== undefined && e.value !== "") || e.damaged);
  }).length;

  const handleSave = async () => {
    const { missing, missingComment } = validateRoundEntries(allItems, entries);
    if (missingComment.length > 0) {
      setValidationMsg({ prefix: "Falta el comentario de qué pasó en:", items: missingComment, suffix: "Los equipos marcados como dañados necesitan una observación antes de guardar." });
      return;
    }
    if (missing.length > 0) {
      setValidationMsg({ prefix: "Todavía faltan estos equipos por registrar:", items: missing });
      return;
    }
    setValidationMsg(null);
    setSaving(true);
    try {
      await onSaveRound(entries, notes);
      setSaved(true);
    } catch (e) {
      setValidationMsg({ prefix: "No se pudo guardar — revisa tu conexión e intenta de nuevo.", items: [] });
      showToast("✗ No se pudo guardar el check list.", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{title}</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{subtitle} · Turno {shift} · {todayStr()}</p>
        </div>
        <Pill tone="gray">{filledCount}/{allItems.length} registrados</Pill>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: C.blue }}>
        Los campos ya vienen con lo último registrado — revisa, corrige lo que cambió y guarda. Marca "Dañado / Fuera de servicio" si algo no funciona; te va a pedir un comentario obligatorio.
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un equipo…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const visSections = sections.map(sec => ({ ...sec, items: q ? sec.items.filter(it => it.n.toLowerCase().includes(q)) : sec.items }));
        const totalVisible = visSections.reduce((s, sec) => s + sec.items.length, 0);
        if (q && totalVisible === 0) return <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
        return visSections.map(sec => sec.items.length > 0 && (
          <div key={sec.title || "unica"}>
            {sec.title && <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>{sec.title} ({sec.items.length})</div>}
            {sec.items.map(item => (
              <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                activeIssue={activeIssues[item.id]} previous={latestValues[item.id]} statusOptions={statusOptions}
                onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
            ))}
          </div>
        ));
      })()}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <PendingItemsAlert msg={validationMsg} onClose={() => setValidationMsg(null)} />

      <div className="flex items-center justify-between mt-4 sticky bottom-16 sm:bottom-0 py-2 px-2 -mx-2 rounded-t-lg" style={{ background: C.bg }}>
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar ronda"}</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Ronda guardada correctamente</div>}
    </div>
  );
}

/* ============================================================
   VISTA: CHECK LIST CALDERA
   ============================================================ */
function CalderaView({ currentUser, shift, onSaveCaldera, lastCalderaRound }) {
  const blank = { horaManometro: "", horaMcDonell: "", horaFondo: "", horaTqDistribucion: "", presionVaporPsi: "", observaciones: "" };
  const draftKey = `pm-local:caldera-draft:${currentUser}:${todayStr()}:${shift}`;
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? { ...blank, ...JSON.parse(saved) } : blank;
    } catch { return blank; }
  });
  const [saved, setSaved] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restoredDraft] = useState(() => {
    try { return !!localStorage.getItem(draftKey); } catch { return false; }
  });

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const required = ["horaManometro", "horaMcDonell", "horaFondo", "horaTqDistribucion", "presionVaporPsi"];
    const missing = required.filter(k => !form[k]);
    if (missing.length > 0) {
      setValidationMsg("Faltan campos por llenar: purgas y presión son obligatorias antes de guardar.");
      return;
    }
    setValidationMsg(null);
    setSaving(true);
    try {
      await onSaveCaldera(form);
      setSaved(true);
      setForm(blank);
      try { localStorage.removeItem(draftKey); } catch { /* noop */ }
    } catch (e) {
      setValidationMsg("No se pudo guardar — revisa tu conexión e intenta de nuevo.");
      showToast("✗ No se pudo guardar el check list de la caldera.", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Check List Caldera</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Equipo: Caldera Piso 4 Lavandería · Turno {shift} · {todayStr()}</p>
      {restoredDraft && (
        <div className="rounded-lg p-2.5 mb-3 text-xs flex items-center gap-2" style={{ background: C.blueSoft, color: C.blue }}>
          <RotateCcw size={13} /> Recuperamos lo que ya habías llenado antes de que se cerrara la app — sigue donde ibas.
        </div>
      )}

      <div className="rounded-lg border p-4 mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Purgas (hora)</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Manómetro</label>
            <input type="time" value={form.horaManometro} onChange={e => set("horaManometro", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Mc Donell</label>
            <input type="time" value={form.horaMcDonell} onChange={e => set("horaMcDonell", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Fondo</label>
            <input type="time" value={form.horaFondo} onChange={e => set("horaFondo", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Tanque de distribución</label>
            <input type="time" value={form.horaTqDistribucion} onChange={e => set("horaTqDistribucion", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Presión</div>
        <div className="mb-1">
          <label className="text-xs" style={{ color: C.gray }}>Vapor (PSI)</label>
          <input type="number" value={form.presionVaporPsi} onChange={e => set("presionVaporPsi", e.target.value)}
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones (opcional)</div>
        <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={2}
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {validationMsg && (
        <div className="rounded-md p-2 mb-3 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {validationMsg}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar check list"}</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Check list guardado correctamente</div>}

      {lastCalderaRound && (
        <div className="rounded-lg border p-3 mt-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Último registro</div>
          <div className="text-xs" style={{ color: C.inkSoft }}>
            {fmtDT(lastCalderaRound.savedAt)} · Turno {lastCalderaRound.shift} · Por {lastCalderaRound.user}
          </div>
          <div className="text-sm mt-1" style={{ color: C.ink }}>
            Purgas: {lastCalderaRound.horaManometro}, {lastCalderaRound.horaMcDonell}, {lastCalderaRound.horaFondo}, {lastCalderaRound.horaTqDistribucion} · Vapor: {lastCalderaRound.presionVaporPsi} PSI
          </div>
          {lastCalderaRound.observaciones && <div className="text-xs italic mt-1" style={{ color: C.gray }}>"{lastCalderaRound.observaciones}"</div>}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   VISTA: HISTORIAL SEMANAL DE MEDIDORES
   ============================================================ */
/* ============================================================
   VISTA SEMANAL DE MEDIDORES
   ============================================================ */
function MetersWeeklyView({ meterHistory, reportEmail, onLogSent, currentUser, mySignature }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const grid = useMemo(() => buildMeterWeekGrid(meterHistory, weekStart), [meterHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;
  const isCurrentWeek = isSameCalendarDay(startOfWeek(new Date()), weekStart);

  const doDownloadExcel = () => {
    setDownloading(true);
    try {
      const wb = buildMetersWeekWorkbook(grid, weekLabel);
      XLSX.writeFile(wb, `lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel — revisa la conexión e intenta de nuevo." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendMetersWeekExcelEmailAuto(emailTo.trim(), grid, weekLabel);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Lecturas de medidores (semana, correo con Excel)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateMetersWeekPdf(grid, weekLabel, currentUser, mySignature);
      doc.save(`lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  let lastGroupRendered = null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Lecturas de Medidores — Historial semanal</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(w => addDays(w, -7))}>‹ Semana anterior</Button>
          <span className="text-sm font-medium" style={{ color: C.ink }}>{weekLabel}</span>
          <Button size="sm" variant="ghost" disabled={isCurrentWeek} onClick={() => setWeekStart(w => addDays(w, 7))}>Semana siguiente ›</Button>
        </div>
        {!isCurrentWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Ir a esta semana</Button>}
      </div>

      <p className="text-xs mb-3" style={{ color: C.gray }}>
        La columna "Antes" muestra la última lectura guardada justo antes de esta semana, para poder comparar el primer
        día de la semana y seguir la misma secuencia sin cortes — igual que pasa entre meses en el Excel.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar esta semana (en Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
          <Button size="sm" variant="ghost" onClick={doDownloadPdf}>o descargar en PDF</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="min-w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 240 }}>Medidor</th>
              <th className="px-2 py-2 text-right">Antes</th>
              {grid.days.map((d, i) => <th key={i} className="px-2 py-2 text-right whitespace-nowrap">{fmtDayShort(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, i) => {
              const showGroupHeader = row.groupTitle !== lastGroupRendered;
              lastGroupRendered = row.groupTitle;
              return (
                <React.Fragment key={i}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={grid.days.length + 2} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.ink }}>{row.label}{row.unit ? ` (${row.unit})` : ""}</td>
                    <td className="px-2 py-1.5 text-right" style={{ color: C.gray }}>{row.before ?? "—"}</td>
                    {row.days.map((v, di) => {
                      const neg = row.daysConsumo?.[di] < 0;
                      return (
                        <td key={di} className="px-2 py-1.5 text-right" title={neg ? `Consumo negativo: ${row.daysConsumo[di]}` : undefined}
                          style={{ color: neg ? "#fff" : v != null ? C.ink : C.gray, background: neg ? C.red : "transparent", fontWeight: neg ? 700 : 400 }}>
                          {v ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   VISTA SEMANAL DE CUARTOS FRÍOS
   ============================================================ */
function ColdRoomsWeeklyView({ coldHistory, reportEmail, onLogSent, currentUser, mySignature }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const grid = useMemo(() => buildColdRoomsWeekGrid(coldHistory, weekStart), [coldHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;
  const isCurrentWeek = isSameCalendarDay(startOfWeek(new Date()), weekStart);
  const weekComplete = isSameCalendarDay(new Date(), addDays(weekStart, 6)) || addDays(weekStart, 6) < new Date();

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateColdRoomsWeekPdf(grid, weekLabel, currentUser, mySignature);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), grid, weekLabel, currentUser, mySignature);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Cuartos Fríos (semana, correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  let lastGroupRendered = null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Cuartos Fríos — Historial semanal</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(w => addDays(w, -7))}>‹ Semana anterior</Button>
          <span className="text-sm font-medium" style={{ color: C.ink }}>{weekLabel}</span>
          <Button size="sm" variant="ghost" disabled={isCurrentWeek} onClick={() => setWeekStart(w => addDays(w, 7))}>Semana siguiente ›</Button>
        </div>
        {!isCurrentWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Ir a esta semana</Button>}
      </div>

      <p className="text-xs mb-3" style={{ color: C.gray }}>
        El formato de cuartos fríos se guarda todos los días, pero el envío por correo está pensado para hacerse
        cada 7 días (al completar la semana) — igual que el papel original. Aquí puedes descargar o enviar la
        semana que quieras, cuando quieras.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
          Descargar / enviar esta semana {weekComplete ? "" : "(semana en curso, aún no termina)"}
        </div>
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

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="min-w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 220 }}>Equipo</th>
              {grid.days.map((d, i) => <th key={i} className="px-2 py-2 text-right whitespace-nowrap">{fmtDayShort(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, i) => {
              const showGroupHeader = row.groupTitle !== lastGroupRendered;
              lastGroupRendered = row.groupTitle;
              return (
                <React.Fragment key={i}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={grid.days.length + 1} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.ink }}>{row.label}</td>
                    {row.days.map((v, di) => {
                      const bad = row.item.k !== "status" ? isColdRoomOutOfRange(row.item, v) : v === "Fuera de servicio";
                      return (
                        <td key={di} className="px-2 py-1.5 text-right"
                          style={{ color: bad ? "#fff" : v != null ? C.ink : C.gray, background: bad ? C.red : "transparent", fontWeight: bad ? 700 : 400 }}>
                          {v ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BodegasListView({ bodegas, shelves, invItems, canManage, onSelectBodega, onCreateBodega, onImportInventory, onDeleteBodega }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const doCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateBodega(newName.trim());
    setNewName("");
    setCreating(false);
  };

  const doImport = async () => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await onImportInventory();
      setImportMsg({ ok: true, text: `Listo: ${res.newBodegasCount} bodega(s), ${res.newShelvesCount} estantería(s) y ${res.newItemsCount} repuesto(s) nuevos importados.` });
    } catch {
      setImportMsg({ ok: false, text: "No se pudo importar — revisa que el archivo sea el formato correcto e intenta de nuevo." });
    }
    setImporting(false);
  };

  const doDownloadAllQr = async () => {
    setGeneratingQr(true);
    try {
      const doc = await generateAllShelvesQrPdf(bodegas, shelves);
      doc.save("codigos-qr-estanterias.pdf");
    } catch { setImportMsg({ ok: false, text: "No se pudieron generar los códigos QR." }); }
    setGeneratingQr(false);
  };

  const doDelete = async (id) => {
    const res = await onDeleteBodega(id);
    if (res && !res.ok) setImportMsg({ ok: false, text: res.message });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Inventario — Bodegas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige una bodega para ver sus estanterías y repuestos.</p>

      {canManage && bodegas.length === 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: C.amber }}>
          <span>¿Primera vez usando esto? Importa de una vez el inventario real del hotel (29 bodegas, ~316 estanterías, ~2897 repuestos).</span>
          <Button size="sm" disabled={importing} onClick={doImport}>{importing ? "Importando…" : "Importar inventario completo"}</Button>
        </div>
      )}
      {canManage && bodegas.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.blueSoft, color: C.blue }}>
          <span>Descarga en un solo PDF todos los códigos QR de todas las estanterías, listos para imprimir y pegar.</span>
          <Button size="sm" variant="ghost" disabled={generatingQr} onClick={doDownloadAllQr}>{generatingQr ? "Generando…" : "Descargar todos los QR"}</Button>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {canManage && (
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la bodega nueva"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
          <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Crear bodega</Button>
        </div>
      )}

      {bodegas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no hay bodegas creadas. {canManage ? "Crea la primera arriba, o importa el inventario completo." : "Pídele a un administrador o al almacenista que cree la primera."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {bodegas.map(b => {
            const myShelves = shelves.filter(s => s.bodegaId === b.id);
            const myItems = invItems.filter(i => i.bodegaId === b.id);
            const low = computeLowStock(myItems).length;
            const critical = computeCriticalStock(myItems).length;
            return (
              <div key={b.id} className="relative">
                <button onClick={() => onSelectBodega(b.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>{b.name}</div>
                    {low > 0 && (
                      <Pill tone={critical > 0 ? "red" : "amber"}>
                        {critical > 0 ? `${critical} crítico${critical !== 1 ? "s" : ""}` : `${low} bajo stock`}
                      </Pill>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.gray }}>
                    {myShelves.length} estantería{myShelves.length !== 1 ? "s" : ""} · {myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}
                  </div>
                </button>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); doDelete(b.id); }} aria-label="Eliminar bodega" title="Eliminar bodega" className="absolute top-2 right-2 p-1">
                    <Trash2 size={13} color={C.gray} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BodegaShelvesView({ bodega, shelves, invItems, canManage, onBack, onSelectShelf, onCreateShelf, onDeleteShelf }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newShelf, setNewShelf] = useState(null);

  const doCreate = async () => {
    if (!code.trim()) return;
    setCreating(true);
    const rec = await onCreateShelf(bodega.id, code.trim(), name.trim());
    setNewShelf(rec);
    setCode(""); setName("");
    setCreating(false);
  };

  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a bodegas</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>{bodega.name} — Estanterías</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige una estantería para ver o retirar repuestos.</p>

      {canManage && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Crear estantería nueva</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código, ej. A-01"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 140 }} />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Descripción (opcional)"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 160 }} />
            <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Crear</Button>
          </div>
          {newShelf && (
            <div className="mt-3 flex items-start gap-3 flex-wrap">
              <QrCodeBox url={shelfUrl(newShelf.id)} label={`Estantería ${newShelf.code}`} filename={`qr-estanteria-${newShelf.code}.png`} />
              <div className="text-xs max-w-xs" style={{ color: C.inkSoft }}>
                Imprime este código y pégalo en la estantería <b>{newShelf.code}</b>. Al escanearlo con el celular, cualquier
                técnico llega directo a esta estantería en la app, sin tener que buscarla en el menú.
              </div>
            </div>
          )}
        </div>
      )}

      {shelves.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin estanterías todavía en esta bodega.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shelves.map(s => {
            const myItems = invItems.filter(i => i.shelfId === s.id);
            const low = computeLowStock(myItems).length;
            const critical = computeCriticalStock(myItems).length;
            return (
              <div key={s.id} className="relative">
                <button onClick={() => onSelectShelf(s.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>Estantería {s.code}</div>
                    {low > 0 && (
                      <Pill tone={critical > 0 ? "red" : "amber"}>
                        {critical > 0 ? `${critical} crítico${critical !== 1 ? "s" : ""}` : `${low} bajo stock`}
                      </Pill>
                    )}
                  </div>
                  {s.name && <div className="text-xs" style={{ color: C.inkSoft }}>{s.name}</div>}
                  <div className="text-xs mt-1" style={{ color: C.gray }}>{myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}</div>
                </button>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteShelf(s.id); }} aria-label="Eliminar estantería" title="Eliminar estantería" className="absolute top-2 right-2 p-1">
                    <Trash2 size={13} color={C.gray} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Une Inventario, Alertas de Stock, Movimientos y Herramientas en un solo módulo con pestañas. */
function InventoryHubView(props) {
  const [tab, setTab] = useState("inventario");
  const tabs = [
    { id: "inventario", label: "Inventario" },
    { id: "alertas", label: "Alertas de Stock", badge: computeLowStock(props.invItems).length },
    { id: "movimientos", label: "Movimientos" },
    { id: "herramientas", label: "Herramientas" },
  ];
  return (
    <div>
      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit flex-wrap" style={{ borderColor: C.line }}>
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-3 font-semibold flex items-center gap-1.5"
            style={{ background: tab === t.id ? C.steelDark : C.panel, color: tab === t.id ? "#fff" : C.inkSoft, borderLeft: i > 0 ? `1px solid ${C.line}` : "none", minHeight: 36 }}>
            {t.label}
            {t.badge > 0 && <NavBadge count={t.badge} pulse={false} />}
          </button>
        ))}
      </div>
      {tab === "inventario" && (
        <InventoryView bodegas={props.bodegas} shelves={props.shelves} invItems={props.invItems} isAdmin={props.isAdmin} isAlmacenista={props.isAlmacenista}
          onCreateBodega={props.onCreateBodega} onCreateShelf={props.onCreateShelf} onCreateItem={props.onCreateItem}
          onRetiro={props.onRetiro} onEntrada={props.onEntrada} onEditItem={props.onEditItem} onImportInventory={props.onImportInventory}
          onDeleteBodega={props.onDeleteBodega} onDeleteShelf={props.onDeleteShelf}
          initialShelfId={props.initialShelfId} onConsumedInitialShelf={props.onConsumedInitialShelf} viewerLocked={props.viewerLocked} />
      )}
      {tab === "alertas" && (
        <StockAlertsView invItems={props.invItems} invMovements={props.invMovements} bodegas={props.bodegas} shelves={props.shelves}
          reportEmail={props.reportEmail} onLogSent={props.onLogSent} currentUser={props.currentUser} />
      )}
      {tab === "movimientos" && (
        <InventoryMovementsView invMovements={props.invMovements} invItems={props.invItems} bodegas={props.bodegas} shelves={props.shelves}
          reportEmail={props.reportEmail} onLogSent={props.onLogSent} currentUser={props.currentUser} tasks={props.tasks} />
      )}
      {tab === "herramientas" && (
        <ToolsView tools={props.tools} accounts={props.accounts} isAdmin={props.isAdmin} onCreateTool={props.onCreateTool} onLendTool={props.onLendTool} onReturnTool={props.onReturnTool} />
      )}
    </div>
  );
}

function InventoryView({ bodegas, shelves, invItems, isAdmin, isAlmacenista, onCreateBodega, onCreateShelf, onCreateItem, onRetiro, onEntrada, onEditItem, onImportInventory, onDeleteBodega, onDeleteShelf, initialShelfId, onConsumedInitialShelf, viewerLocked }) {
  const [selectedBodegaId, setSelectedBodegaId] = useState(null);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const canManage = (isAdmin || isAlmacenista) && !viewerLocked;

  useEffect(() => {
    if (initialShelfId) {
      const shelf = shelves.find(s => s.id === initialShelfId);
      if (shelf) { setSelectedBodegaId(shelf.bodegaId); setSelectedShelfId(shelf.id); }
      onConsumedInitialShelf?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShelfId]);

  const shelf = selectedShelfId ? shelves.find(s => s.id === selectedShelfId) : null;
  const bodegaForShelf = shelf ? bodegas.find(b => b.id === shelf.bodegaId) : null;
  if (shelf && bodegaForShelf) {
    return (
      <ShelfDetailView bodega={bodegaForShelf} shelf={shelf} items={invItems.filter(i => i.shelfId === shelf.id)}
        canManage={canManage} onBack={() => setSelectedShelfId(null)}
        onCreateItem={onCreateItem} onRetiro={onRetiro} onEntrada={onEntrada} onEditItem={onEditItem} viewerLocked={viewerLocked} />
    );
  }

  const bodega = selectedBodegaId ? bodegas.find(b => b.id === selectedBodegaId) : null;
  if (bodega) {
    return (
      <BodegaShelvesView bodega={bodega} shelves={shelves.filter(s => s.bodegaId === bodega.id)} invItems={invItems}
        canManage={canManage} onBack={() => setSelectedBodegaId(null)} onSelectShelf={setSelectedShelfId} onCreateShelf={onCreateShelf} onDeleteShelf={onDeleteShelf} />
    );
  }

  return (
    <BodegasListView bodegas={bodegas} shelves={shelves} invItems={invItems} canManage={canManage}
      onSelectBodega={setSelectedBodegaId} onCreateBodega={onCreateBodega} onImportInventory={onImportInventory} onDeleteBodega={onDeleteBodega} />
  );
}

/** Mi semana (item 8): resumen personal de los últimos 7 días, para el técnico. */
function MyWeekCard({ tasks, currentUser }) {
  const week = Date.now() - 7 * 86400000;
  const mine = (tasks || []).filter(t => t.asignadoA === currentUser);
  const cerradas = mine.filter(t => normalizeTaskState(t.estado) === "finalizada" && t.finishedAt && new Date(t.finishedAt).getTime() >= week);
  const abiertas = mine.filter(t => normalizeTaskState(t.estado) !== "finalizada").length;
  const conTiempo = cerradas.filter(t => t.assignedAt);
  const prom = conTiempo.length ? conTiempo.reduce((a, t) => a + hoursBetween(t.assignedAt, t.finishedAt), 0) / conTiempo.length : null;
  const rei = cerradas.filter(t => t.reincidencia).length;
  if (mine.length === 0) return null;
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.gray }}>Mi semana</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: C.green }}>{cerradas.length}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>cerradas</div></div>
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: C.ink }}>{prom == null ? "—" : prom < 24 ? `${prom.toFixed(1)} h` : `${(prom / 24).toFixed(1)} d`}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>tiempo promedio</div></div>
        <div><div className="text-2xl font-extrabold tabular-nums" style={{ color: abiertas > 0 ? C.amber : C.green }}>{abiertas}</div><div className="text-[11px]" style={{ color: C.inkSoft }}>abiertas</div></div>
      </div>
      {rei > 0 && <div className="text-xs mt-2" style={{ color: C.red }}>↻ {rei} de tus cierres fueron reincidencias (el problema había vuelto a aparecer).</div>}
    </div>
  );
}

function SistemaEquiposView({ sistema, equipos, mttoLog, canManage, onBack, onSelectEquipo, onDeleteEquipo, pendingMaintenanceEquipoIds }) {
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const q = search.trim().toLowerCase();
  const visEquipos = q ? equipos.filter(eq => eq.nombre.toLowerCase().includes(q)) : equipos;
  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a sistemas</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>{sistema}</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Elige un equipo para ver su historial o registrar un mantenimiento.</p>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar un equipo de ${sistema}…`}
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {visEquipos.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>{q ? `Sin resultados para "${search}".` : "Sin equipos en este sistema."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visEquipos.map(eq => {
            const status = currentEquipoStatus(eq.id, mttoLog);
            const stats = computeEquipoStats(eq, mttoLog);
            const prevent = computePreventiveStatus(eq, mttoLog);
            return (
              <div key={eq.id} className="relative">
                <button onClick={() => onSelectEquipo(eq.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: status.outOfService ? C.red : (prevent.overdue ? C.amber : C.line), background: status.outOfService ? C.redSoft : (prevent.overdue ? C.amberSoft : C.panel) }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>{eq.nombre}</div>
                    {status.outOfService && <Pill tone="red">Fuera de servicio</Pill>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.gray }}>{stats.total} mantenimiento{stats.total !== 1 ? "s" : ""} registrado{stats.total !== 1 ? "s" : ""}</div>
                  {pendingMaintenanceEquipoIds && pendingMaintenanceEquipoIds.has(eq.id) && (
                    <div className="text-[11px] mt-1 font-semibold flex items-center gap-1" style={{ color: C.amber }}>
                      <Camera size={11} /> Fotos pendientes de subir
                    </div>
                  )}
                  {!status.outOfService && prevent.configured && (prevent.overdue || prevent.dueSoon) && (
                    <div className="text-[11px] mt-1 font-semibold flex items-center gap-1" style={{ color: prevent.overdue ? "#7a5405" : C.amber }}>
                      <AlertTriangle size={11} />
                      {prevent.overdue
                        ? (prevent.neverDone ? "Preventivo nunca hecho" : `Preventivo atrasado ${Math.abs(prevent.daysRemaining)} días`)
                        : `Preventivo en ${prevent.daysRemaining} días`}
                    </div>
                  )}
                </button>
                {canManage && (
                  confirmDeleteId === eq.id ? (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md px-1.5 py-1" style={{ background: C.panel, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteEquipo(eq.id); setConfirmDeleteId(null); }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: C.red, color: "#fff" }}>
                        Sí, borrar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="text-[10px] font-semibold px-1" style={{ color: C.gray }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(eq.id); }} aria-label="Eliminar equipo" title="Eliminar equipo" className="absolute top-2 right-2 p-1">
                      <Trash2 size={13} color={C.gray} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MaintenanceView({ equipos, mttoLog, invItems, isAdmin, isAlmacenista, onCreateEquipo, onImportCatalog, onLogMaintenance, onDeleteEquipo, onSetVideoUrl, onSetFrecuencia, onSetFotoMaestra, onUpdateEquipoInfo, tasks, mttoRequiredFields, onUpdateRequiredFields, initialEquipoId, onConsumedInitialEquipo, pendingMaintenanceEquipoIds, viewerLocked, editLog = [] }) {
  const [selectedSistema, setSelectedSistema] = useState(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState(null);
  const canManage = (isAdmin || isAlmacenista) && !viewerLocked;

  useEffect(() => {
    if (initialEquipoId) {
      const eq = equipos.find(e => e.id === initialEquipoId);
      if (eq) { setSelectedSistema(eq.sistema); setSelectedEquipoId(eq.id); }
      onConsumedInitialEquipo?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEquipoId]);

  const equipo = selectedEquipoId ? equipos.find(e => e.id === selectedEquipoId) : null;
  if (equipo) {
    const records = mttoLog.filter(m => m.equipoId === equipo.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return <EquipoDetailView equipo={equipo} records={records} tasks={tasks} invItems={invItems} onBack={() => setSelectedEquipoId(null)} onLogMaintenance={onLogMaintenance} isAdmin={canManage} onSetVideoUrl={onSetVideoUrl} onSetFrecuencia={onSetFrecuencia} onSetFotoMaestra={onSetFotoMaestra} onUpdateEquipoInfo={onUpdateEquipoInfo} mttoRequiredFields={mttoRequiredFields} onUpdateRequiredFields={onUpdateRequiredFields} viewerLocked={viewerLocked} editLog={editLog} />;
  }

  if (selectedSistema) {
    const eqs = equipos.filter(e => e.sistema === selectedSistema && e.active !== false);
    return <SistemaEquiposView sistema={selectedSistema} equipos={eqs} mttoLog={mttoLog} canManage={canManage} onBack={() => setSelectedSistema(null)} onSelectEquipo={setSelectedEquipoId} onDeleteEquipo={onDeleteEquipo} pendingMaintenanceEquipoIds={pendingMaintenanceEquipoIds} />;
  }

  return (
    <>
      {isAdmin && <RequiredFieldsSettings value={mttoRequiredFields} onChange={onUpdateRequiredFields} />}
      <SistemasListView equipos={equipos} mttoLog={mttoLog} canManage={canManage}
        onSelectSistema={setSelectedSistema} onSelectEquipo={setSelectedEquipoId} onCreateEquipo={onCreateEquipo} onImportCatalog={onImportCatalog}
        pendingMaintenanceEquipoIds={pendingMaintenanceEquipoIds} />
    </>
  );
}

/** Panel de configuración (solo admin) para decidir qué campos son obligatorios al registrar un
 * mantenimiento, sin necesidad de tocar código: foto, costo, repuestos usados. Se guarda en
 * app_storage vía sGet/sSet igual que el resto de la configuración de la app. */
function RequiredFieldsSettings({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const v = value || { foto: false, costo: false, repuestos: false };
  const Toggle = ({ label, field }) => (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-sm" style={{ color: C.ink }}>{label}</span>
      <input type="checkbox" checked={!!v[field]} onChange={e => onChange?.({ [field]: e.target.checked })} />
    </label>
  );
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: C.line, background: C.panel }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: C.inkSoft }}>
          <SettingsIcon size={13} /> Campos obligatorios al registrar mantenimiento
        </span>
        {open ? <ChevronDown size={15} color={C.gray} /> : <ChevronRight size={15} color={C.gray} />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: C.line }}>
          <div className="text-xs mt-2 mb-1" style={{ color: C.gray }}>
            Decide qué debe llenar quien registra un mantenimiento antes de poder guardar. Aplica a todos los equipos.
          </div>
          <Toggle label="Foto obligatoria" field="foto" />
          <Toggle label="Costo obligatorio" field="costo" />
          <Toggle label="Repuestos usados obligatorios" field="repuestos" />
        </div>
      )}
    </div>
  );
}

/**
 * Estado de red en la barra superior: verde "En línea" cuando hay conexión de verdad con
 * internet, ámbar "Guardando localmente" cuando no — para que quede claro que lo que se registre
 * ahora se sube solo apenas vuelva la señal, sin que nadie se quede con la duda.
 */
/**
 * Asistente conversacional con IA: un botón flotante que abre un chat donde cualquiera pregunta
 * algo en español simple sobre la operación ("¿qué equipos llevan más de 60 días sin
 * mantenimiento?") y la IA responde usando los datos reales de este hotel (ver
 * buildAiContextSummary), no información genérica.
 */
function AiAssistantWidget({ contextSummary }) {
  const [open, setOpen] = useState(false);
  const [hasOpenedBefore, setHasOpenedBeforeState] = useState(() => {
    try { return localStorage.getItem("pm-local:ai-fab-opened") === "1"; } catch { return false; }
  });
  const setHasOpenedBefore = (v) => { setHasOpenedBeforeState(v); try { localStorage.setItem("pm-local:ai-fab-opened", v ? "1" : "0"); } catch { /* noop */ } };
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", text }]
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  useBackCloseModal(open, () => setOpen(false));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, sending]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", text: q }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const history = messages.slice(-6).map(m => `${m.role === "user" ? "Persona" : "Asistente"}: ${m.text}`).join("\n");
      const res = await requestAiAssistant(q, contextSummary, history);
      setMessages(m => [...m, { role: "assistant", text: res.answer || res.message || "No pude responder eso — intenta preguntarlo de otra forma." }]);
      bumpAiUsage("assistantQueries");
    } catch (err) {
      console.error("AiAssistantWidget send error:", err);
      const isRawNetworkError = /load failed|failed to fetch|networkerror/i.test(err.message || "");
      const friendlyText = isRawNetworkError
        ? "Red inestable — intenta de nuevo en un momento."
        : `No me pude conectar (${err.message || "error de conexión"}). Revisa tu conexión e intenta de nuevo.`;
      setMessages(m => [...m, { role: "assistant", text: friendlyText }]);
    }
    setSending(false);
  };

  return (
    <>
      {!open && !hasOpenedBefore && (
        <div className="fixed bottom-24 sm:bottom-8 right-[68px] rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-lg" style={{ background: C.steelDark, color: "#fff", zIndex: 45 }}>
          Asistente IA
        </div>
      )}
      <button onClick={() => { setOpen(v => !v); setHasOpenedBefore(true); }} title="Pregúntale a la IA sobre la operación del hotel"
        className="fixed bottom-20 sm:bottom-5 right-5 rounded-full shadow-lg flex items-center justify-center"
        style={{ width: 52, height: 52, background: C.steelDark, color: "#fff", zIndex: 45 }}>
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[44]" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setOpen(false)} />
          <div className="fixed bottom-36 sm:bottom-20 right-3 left-3 sm:left-auto sm:w-96 rounded-xl border shadow-2xl flex flex-col"
            style={{ height: "62vh", maxHeight: 520, background: C.panel, backgroundColor: C.panel, borderColor: C.line, zIndex: 45 }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: C.line }}>
            <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: C.ink }}>
              <Sparkles size={15} color={C.amber} /> Pregúntale a la app
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" title="Cerrar"><X size={16} color={C.gray} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-xs rounded-lg p-2.5" style={{ background: C.bg, color: C.inkSoft }}>
                Prueba con algo como: <i>"¿qué equipos llevan más de 60 días sin mantenimiento?"</i>, <i>"¿cuántas tareas abiertas hay?"</i>, o <i>"¿qué repuestos están bajos?"</i> — respondo con los datos reales de tu app ahora mismo.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-sm rounded-lg px-3 py-2 max-w-[85%]"
                style={{ background: m.role === "user" ? C.steelDark : C.bg, color: m.role === "user" ? "#fff" : C.ink, marginLeft: m.role === "user" ? "auto" : 0 }}>
                {m.text}
              </div>
            ))}
            {sending && <div className="text-xs" style={{ color: C.gray }}>Pensando…</div>}
          </div>
          <div className="p-2 border-t flex items-center gap-1.5 shrink-0" style={{ borderColor: C.line }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Escribe tu pregunta…"
              className="flex-1 text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minHeight: 40 }} />
            <Button size="sm" disabled={sending || !input.trim()} onClick={send}>Enviar</Button>
          </div>
          </div>
        </>
      )}
    </>
  );
}


/** Barra de estado de sincronización (item 16): una sola, visible también en el celular.
 * - Sin señal: franja ámbar arriba, con cuántos registros esperan para subirse.
 * - Con señal pero con registros guardados sin subir: píldora azul abajo con botón "Reintentar". */
function SyncStatusBar({ online, pending = 0, retrying = false, onRetry }) {
  if (!online) {
    return (
      <div className="pm-safe-top fixed top-0 left-0 right-0 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 text-center"
        style={{ background: "#7a5405", color: "#fff", zIndex: 500 }}>
        <WifiOff size={13} className="shrink-0" />
        <span>Sin señal — lo que registres (incluidas fotos) queda guardado en este celular y se sube solo cuando vuelva{pending > 0 ? ` · ${pending} por subir` : ""}</span>
      </div>
    );
  }
  if (pending <= 0) return null;
  return (
    <div className="pm-slide-up-in fixed left-3 right-3 sm:left-auto sm:right-4 bottom-[68px] sm:bottom-4 z-[90] flex items-center gap-2 rounded-xl shadow-lg px-3 py-2"
      style={{ background: C.panel, border: `1.5px solid ${C.blue}`, color: C.ink }}>
      <Cloud size={16} color={C.blue} className="animate-pulse shrink-0" />
      <span className="text-xs font-semibold flex-1">{pending} registro{pending === 1 ? "" : "s"} guardado{pending === 1 ? "" : "s"} en este celular, subiendo…</span>
      <button onClick={onRetry} disabled={retrying} className="text-xs font-bold px-2.5 rounded-lg disabled:opacity-60"
        style={{ background: C.blue, color: "#fff", minHeight: 32 }}>{retrying ? "Subiendo…" : "Reintentar"}</button>
    </div>
  );
}

/** Ficha rápida al escanear el QR de un equipo cuando la persona no tiene acceso a Mantenimiento
 * (item 17): muestra el equipo y sus tareas abiertas, sin sacarla de lo suyo. */
function ScannedEquipoSheet({ equipo, tasks, accounts, onClose, onGoTasks }) {
  useBackCloseModal(true, onClose);
  const abiertas = (tasks || []).filter(t => t.equipoId === equipo?.id && normalizeTaskState(t.estado) !== "finalizada");
  const nameOf = (u) => accounts?.[u]?.display_name || "Sin asignar";
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="pm-animate-in rounded-2xl max-w-sm w-full p-5" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
        {!equipo ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>Ese código QR es de un equipo que ya no está registrado.</p>
        ) : (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray }}>Equipo escaneado</div>
            <h3 className="text-lg font-bold mt-0.5" style={{ color: C.ink }}>{equipo.nombre}</h3>
            {equipo.sistema && <div className="text-sm" style={{ color: C.inkSoft }}>{equipo.sistema}</div>}
            <div className="mt-3 text-xs font-bold uppercase tracking-wide" style={{ color: abiertas.length ? C.red : C.green }}>
              {abiertas.length ? `Tareas abiertas · ${abiertas.length}` : "Sin tareas abiertas"}
            </div>
            {abiertas.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between gap-2 text-sm py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
                <span className="truncate">{t.titulo}</span>
                <span className="text-xs shrink-0" style={{ color: C.inkSoft }}>{nameOf(t.asignadoA)}</span>
              </div>
            ))}
          </>
        )}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button size="sm" onClick={onGoTasks}>Ir a mis tareas</Button>
        </div>
      </div>
    </div>
  );
}

/** Tarjeta de arranque (item 18): guía corta para instalar la app y activar avisos. Se muestra en
 * Inicio hasta que la persona tenga ambas cosas listas o la cierre. */
function SetupGuideCard({ onEnablePush, userKey }) {
  const dismissKey = `pm-local:setup-dismissed:${userKey}`;
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(dismissKey) === "1"; } catch { return false; } });
  const [perm, setPerm] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [installEvt, setInstallEvt] = useState(() => (typeof window !== "undefined" ? window.__pmInstallEvt || null : null));
  useEffect(() => {
    const h = (e) => { e.preventDefault(); window.__pmInstallEvt = e; setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const standalone = typeof window !== "undefined" && ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true);
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const pushOk = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const notifDone = perm === "granted";
  if (dismissed || (standalone && (notifDone || !pushOk))) return null;
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(dismissKey, "1"); } catch { /* noop */ } };
  const enable = async () => {
    setBusy(true);
    const res = await onEnablePush();
    setMsg(res); setBusy(false);
    setPerm(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  };
  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* noop */ }
    window.__pmInstallEvt = null; setInstallEvt(null);
  };
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: C.panel, border: `1.5px solid ${C.amber}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.amber }}>Deja la app lista</div>
          <div className="text-sm font-semibold mt-0.5" style={{ color: C.ink }}>Para que te lleguen los avisos de tus tareas</div>
        </div>
        <button onClick={dismiss} aria-label="Cerrar" title="Cerrar" style={{ minWidth: 28, minHeight: 28 }}><X size={16} color={C.gray} /></button>
      </div>
      <div className="mt-3 space-y-3 text-sm" style={{ color: C.ink }}>
        <div className="flex items-start gap-2">
          <span className="font-bold" style={{ color: standalone ? C.green : C.amber }}>{standalone ? "✓" : "1"}</span>
          <div className="flex-1">
            <div className="font-semibold">Instalar en el celular</div>
            {standalone ? <div className="text-xs" style={{ color: C.inkSoft }}>Ya está instalada.</div>
              : installEvt ? <Button size="sm" onClick={install}>Instalar ahora</Button>
              : <div><div className="text-xs" style={{ color: C.inkSoft }}>{isIos ? "En iPhone es necesario instalarla para recibir avisos." : "Así se instala en el celular:"}</div><InstallSteps isIos={isIos} /></div>}
          </div>
        </div>
        {pushOk && (
          <div className="flex items-start gap-2">
            <span className="font-bold" style={{ color: notifDone ? C.green : C.amber }}>{notifDone ? "✓" : "2"}</span>
            <div className="flex-1">
              <div className="font-semibold">Activar notificaciones</div>
              {notifDone ? <div className="text-xs" style={{ color: C.inkSoft }}>Activadas en este dispositivo.</div>
                : perm === "denied" ? <div className="text-xs" style={{ color: C.red }}>Las bloqueaste. Actívalas en los ajustes del navegador para este sitio.</div>
                : <Button size="sm" disabled={busy || (isIos && !standalone)} onClick={enable}>{busy ? "Activando…" : "Activar avisos"}</Button>}
              {isIos && !standalone && !notifDone && <div className="text-xs mt-1" style={{ color: C.inkSoft }}>Primero instálala (paso 1) y ábrela desde el ícono.</div>}
              {msg && <div className="text-xs mt-1" style={{ color: msg.ok ? C.green : C.red }}>{msg.message}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsagePanelView({ tasks, accounts }) {
  const [rows, setRows] = useState(null);
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const calc = async () => {
    setBusy(true); setErr(null);
    try {
      const data = await exportFullBackup();
      let fotos = 0, videos = 0;
      const mapped = data.map(r => {
        const txt = JSON.stringify(r.value ?? null);
        fotos += (txt.match(/maintenance-photos\//g) || []).length;
        videos += (txt.match(/maintenance-videos\//g) || []).length;
        return { key: r.key, bytes: txt.length, items: Array.isArray(r.value) ? r.value.length : null };
      }).sort((a, b) => b.bytes - a.bytes);
      setRows(mapped);
      setMedia({ fotos, videos });
      const totalB = mapped.reduce((a, r) => a + r.bytes, 0);
      try { localStorage.setItem("pm-local:space-check", JSON.stringify({ at: nowIso(), pct: Math.round((totalB / (500 * 1048576)) * 100), fotos, videos })); } catch { /* noop */ }
    } catch (e) { setErr(e.message || "No se pudo leer el tamaño de los datos."); }
    setBusy(false);
  };
  const total = (rows || []).reduce((a, r) => a + r.bytes, 0);
  const fmt = (b) => b > 1048576 ? `${(b / 1048576).toFixed(2)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  const LIMIT = 500 * 1048576;
  const since = Date.now() - 30 * 86400000;
  const perUser = {};
  (tasks || []).forEach(t => {
    const u = t.asignadoA || "";
    if (!u) return;
    perUser[u] = perUser[u] || { abiertas: 0, cerradas30: 0 };
    if (normalizeTaskState(t.estado) === "finalizada") { if (t.finishedAt && new Date(t.finishedAt).getTime() >= since) perUser[u].cerradas30++; }
    else perUser[u].abiertas++;
  });
  const users = Object.entries(perUser).sort((a, b) => b[1].cerradas30 - a[1].cerradas30);
  const exportTasks = () => {
    const nm = (u) => accounts?.[u]?.display_name || u || "";
    const data = (tasks || []).map(t => ({
      Titulo: t.titulo, Estado: normalizeTaskState(t.estado), Prioridad: t.prioridad, Asignado: nm(t.asignadoA),
      Origen: t.origen || "", Creada: t.createdAt || "", Iniciada: t.startedAt || "", Finalizada: t.finishedAt || "", NotaCierre: t.notaCierre || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Tareas");
    XLSX.writeFile(wb, `tareas-${todayStr().replace(/\//g, "-")}.xlsx`);
  };
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-1" style={{ color: C.ink }}>Uso y respaldo</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Cuánto espacio llevan tus datos y cómo guardarlos fuera de la app.</p>

      <div className="rounded-xl p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold" style={{ color: C.ink }}>Espacio de datos</div>
          <Button size="sm" variant="ghost" disabled={busy} onClick={calc}>{busy ? "Calculando…" : rows ? "Recalcular" : "Calcular"}</Button>
        </div>
        {err && <div className="text-xs" style={{ color: C.red }}>{err}</div>}
        {rows ? (
          <>
            <div className="text-xs mb-1" style={{ color: C.inkSoft }}>{fmt(total)} de 500 MB del plan gratuito ({((total / LIMIT) * 100).toFixed(2)}%)</div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: C.line }}>
              <div className="h-full" style={{ width: `${Math.max(1, Math.min(100, (total / LIMIT) * 100))}%`, background: total / LIMIT > 0.7 ? C.red : C.green }} />
            </div>
            {rows.slice(0, 12).map(r => (
              <div key={r.key} className="flex justify-between text-xs py-1 border-t" style={{ borderColor: C.line, color: C.ink }}>
                <span className="truncate">{r.key}{r.items != null ? ` · ${r.items} registros` : ""}</span>
                <span className="shrink-0 ml-2" style={{ color: C.inkSoft }}>{fmt(r.bytes)}</span>
              </div>
            ))}
            {media && (
              <div className="rounded-lg p-2.5 mt-3" style={{ background: C.bg }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>Archivos guardados (almacenamiento, 1 GB gratis)</div>
                <div className="text-xs" style={{ color: C.inkSoft }}>📷 {media.fotos} fotos · 🎬 {media.videos} videos subidos</div>
                <div className="text-xs mt-1" style={{ color: C.inkSoft }}>Espacio estimado: ≈ {((media.fotos * 0.15 + media.videos * 20)).toFixed(0)} MB de 1024 MB (referencia aproximada: 150 KB por foto y 20 MB por video).</div>
              </div>
            )}
          </>
        ) : <div className="text-xs" style={{ color: C.inkSoft }}>Toca "Calcular" para medir los datos guardados.</div>}
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="text-sm font-bold mb-2" style={{ color: C.ink }}>Actividad del equipo · últimos 30 días</div>
        {users.length === 0 ? <div className="text-xs" style={{ color: C.inkSoft }}>Todavía no hay tareas asignadas.</div> : users.map(([u, v]) => (
          <div key={u} className="flex justify-between text-sm py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
            <span>{accounts?.[u]?.display_name || u}</span>
            <span className="text-xs" style={{ color: C.inkSoft }}>{v.cerradas30} cerradas · {v.abiertas} abiertas</span>
          </div>
        ))}
      </div>

      <DriveArchivePanel tasks={tasks} accounts={accounts} />

      <div className="rounded-xl p-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="text-sm font-bold mb-2" style={{ color: C.ink }}>Descargas</div>
        <div className="flex flex-wrap gap-3 items-start">
          <BackupButton />
          <Button size="sm" variant="ghost" icon={Download} onClick={exportTasks}>Tareas en Excel</Button>
        </div>
      </div>
    </div>
  );
}

function NetworkStatusIndicator({ pendingCount = 0 }) {
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  const hasPending = pendingCount > 0;
  const label = !online ? "Guardando localmente" : hasPending ? `Subiendo ${pendingCount}…` : "En línea";
  const tone = !online ? { bg: C.amberSoft, fg: "#7a5405" } : hasPending ? { bg: C.blueSoft, fg: C.blue } : { bg: C.greenSoft, fg: C.green };
  return (
    <div title={!online ? "Sin señal — lo que registres se guarda en este celular y se sube solo apenas vuelva la conexión." : hasPending ? `${pendingCount} registro${pendingCount === 1 ? "" : "s"} guardado${pendingCount === 1 ? "" : "s"} en este celular, subiendo a la nube ahora.` : "Conectado — todo se guarda en la nube al instante."}
      className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full"
      style={{ background: tone.bg, color: tone.fg }}>
      {!online ? <CloudOff size={13} /> : hasPending ? <Cloud size={13} className="animate-pulse" /> : <Cloud size={13} />}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function NotificationBell({ alerts, maintenanceDue, staleIssues, fuelAlerts, onNavigate }) {
  const [open, setOpen] = useState(false);
  useBackCloseModal(open, () => setOpen(false));
  const shortcuts = {
    "Lecturas de Medidores": "meters", "Ronda de revisión": "ronda", "Cuartos Fríos": "coldrooms", "Equipos de Gimnasio": "fichas-tecnicas",
    "Check List Caldera": "fichas-tecnicas", "Equipos de Lavandería": "fichas-tecnicas",
  };
  const totalCount = alerts.length + (maintenanceDue?.items?.length ? 1 : 0) + (staleIssues?.length || 0) + (fuelAlerts?.length || 0);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label="Notificaciones" title="Notificaciones" className="relative p-1.5 rounded-md" style={{ background: C.bg }}>
        <Bell size={16} color={C.ink} />
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${fuelAlerts?.length ? "animate-pulse" : ""}`} style={{ background: C.red, color: "#fff" }}>
            {totalCount}
          </span>
        )}
      </button>
      {open && (
        <>
          {/* fondo invisible: tocar en cualquier parte fuera del panel lo cierra */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pm-animate-in fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-lg border shadow-lg z-50 max-h-[70vh] overflow-y-auto"
            style={{ background: C.panel, borderColor: C.line }}>
            <div className="flex items-center justify-between p-3 border-b sticky top-0" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Notificaciones</div>
              <button onClick={() => setOpen(false)} className="p-0.5"><X size={14} color={C.gray} /></button>
            </div>

            {fuelAlerts && fuelAlerts.length > 0 && (
              <>
                <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.red }}>⚠ Combustible crítico — reabastecer ya</div>
                <div className="px-3 pb-3">
                  {fuelAlerts.map((t, i) => (
                    <button key={i} onClick={() => { onNavigate("fuel"); setOpen(false); }}
                      className="block text-xs text-left w-full py-1" style={{ color: C.red }}>
                      · {t.nombre} — {t.pct}% <span style={{ color: C.gray }}>(mínimo 20%)</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Recorridos pendientes de hoy</div>
            {alerts.length === 0 ? (
              <div className="px-3 pb-3 text-xs" style={{ color: C.gray }}>Todo al día — ningún turno tiene pendientes por ahora.</div>
            ) : alerts.map((a, i) => (
              <div key={i} className="p-3 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.red }}>{a.turno}</div>
                {a.missing.map((m, j) => (
                  <button key={j} onClick={() => { onNavigate(shortcuts[m] || "home"); setOpen(false); }}
                    className="block text-xs text-left w-full py-0.5" style={{ color: C.ink }}>
                    · {m} — sin registrar
                  </button>
                ))}
              </div>
            ))}

            {staleIssues && staleIssues.length > 0 && (
              <>
                <div className="p-3 pb-1 border-t text-xs font-semibold uppercase tracking-wide" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
                  Llevan mucho tiempo sin resolverse
                </div>
                <div className="px-3 pb-3">
                  {staleIssues.map((iss, i) => (
                    <button key={i} onClick={() => { onNavigate("issues"); setOpen(false); }}
                      className="block text-xs text-left w-full py-1" style={{ color: C.red }}>
                      · #{iss.code} {iss.name} <span style={{ color: C.gray }}>({iss.floorName})</span> — lleva {iss.daysOpen} días
                    </button>
                  ))}
                </div>
              </>
            )}

            {maintenanceDue && (
              <>
                <div className="p-3 pb-1 border-t text-xs font-semibold uppercase tracking-wide" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
                  Mantenimiento por vencer este mes {maintenanceDue.daysLeft <= 10 ? `(quedan ${maintenanceDue.daysLeft} días)` : ""}
                </div>
                {maintenanceDue.items.length === 0 ? (
                  <div className="px-3 pb-3 text-xs" style={{ color: C.gray }}>Nada urgente por ahora.</div>
                ) : (
                  <div className="px-3 pb-3">
                    {maintenanceDue.items.map((it, i) => (
                      <button key={i} onClick={() => { onNavigate("maintenance-schedule"); setOpen(false); }}
                        className="block text-xs text-left w-full py-1" style={{ color: it.estado === "atrasado" ? C.red : C.ink }}>
                        · {it.equipo} <span style={{ color: C.gray }}>({it.sistema})</span> — {it.estado === "atrasado" ? "atrasado" : "pendiente"}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PushEnableButton({ onEnable }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  if (!supported) return null;

  const click = async () => {
    setBusy(true); setMsg(null);
    const res = await onEnable();
    setMsg(res);
    setBusy(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="relative">
      <button onClick={click} disabled={busy} title="Activar notificaciones en este dispositivo"
        className="p-1.5 rounded-md" style={{ background: C.bg }}>
        <Bell size={16} color={busy ? C.gray : C.amber} />
      </button>
      {msg && (
        <div className="pm-animate-in fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64 rounded-lg border shadow-lg z-50 p-3 text-xs"
          style={{ background: C.panel, borderColor: C.line, color: msg.ok ? C.green : C.red }}>
          {msg.message}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ESCÁNER DE QR (con la cámara, para saltar directo a un equipo/estantería)
   ============================================================ */
function QrScannerView({ onClose, onFoundEquipo, onFoundShelf, onFoundTool }) {
  useBackCloseModal(true, onClose); // sin esto, el atrás del celular podía dejar la cámara encendida
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let jsQR = null;
    (async () => {
      try {
        jsQR = (await import("jsqr")).default;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanLoop();
      } catch {
        setError("No se pudo acceder a la cámara — revisa que le hayas dado permiso a la app en la configuración del celular.");
      }
    })();

    const canvas = document.createElement("canvas");
    function scanLoop() {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scanLoop); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR ? jsQR(imgData.data, imgData.width, imgData.height) : null;
      if (code && code.data) {
        try {
          const url = new URL(code.data);
          const equipoId = url.searchParams.get("equipo");
          const shelfId = url.searchParams.get("shelf");
          const toolId = url.searchParams.get("tool");
          if (equipoId || shelfId || toolId) {
            setFound(true);
            setTimeout(() => { equipoId ? onFoundEquipo(equipoId) : shelfId ? onFoundShelf(shelfId) : (onFoundTool && onFoundTool(toolId)); }, 300);
            return; // deja de escanear, ya encontró algo
          }
        } catch { /* el QR no era una URL válida de esta app — sigue escaneando */ }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: "#000" }}>
      <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="pm-safe-top absolute top-4 right-4 z-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", minWidth: 44, minHeight: 44 }}>
        <X size={22} color="#fff" />
      </button>
      {error ? (
        <div className="text-center px-6">
          <AlertTriangle size={32} color={C.amber} className="mx-auto mb-3" />
          <p className="text-sm text-white mb-4">{error}</p>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-2xl" style={{
              width: 240, height: 240,
              border: `3px solid ${found ? C.green : "#fff"}`,
              boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)",
              transition: "border-color 0.2s ease",
            }} />
          </div>
          <div className="absolute bottom-8 left-0 right-0 text-center px-6">
            <p className="text-sm text-white font-medium">{found ? "✓ Código encontrado" : "Apunta la cámara al código QR del equipo, estantería o herramienta"}</p>
          </div>
        </>
      )}
    </div>
  );
}


function OnboardingTour({ onClose }) {
  useBackCloseModal(true, onClose); // se desmonta solo cuando el padre deja de mostrarlo
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="pm-animate-in rounded-xl max-w-sm w-full p-5" style={{ background: C.panel }}>
        <div className="flex items-center gap-1 mb-4">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? C.amber : C.line }} />
          ))}
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: C.ink }}>{s.title}</h3>
        <p className="text-sm mb-6" style={{ color: C.inkSoft }}>{s.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs" style={{ color: C.gray }}>Saltar</button>
          <div className="flex items-center gap-2">
            {step > 0 && <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>}
            <Button size="sm" onClick={() => isLast ? onClose() : setStep(step + 1)}>{isLast ? "Entendido" : "Siguiente"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VISTA: EQUIPOS FUERA DE SERVICIO
   ============================================================ */
function IssuesView({ activeIssues, onResolve, onCheckIn, onAttachPhoto }) {
  const list = Object.values(activeIssues).sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Equipos fuera de servicio</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{list.length} equipo(s) actualmente reportado(s). Se mantienen visibles en cada recorrido hasta marcarse como resueltos.</p>
      {list.length === 0 && (
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: C.line, background: C.greenSoft }}>
          <CheckCircle2 className="mx-auto mb-2" color={C.green} />
          <div className="text-sm font-medium" style={{ color: C.green }}>No hay equipos reportados como dañados. Todo en orden.</div>
        </div>
      )}
      {list.map(iss => <IssueResolveCard key={iss.equipmentId} iss={iss} onResolve={onResolve} onCheckIn={onCheckIn} onAttachPhoto={onAttachPhoto} />)}
    </div>
  );
}

function IssueResolveCard({ iss, onResolve, onCheckIn, onAttachPhoto }) {
  const [open, setOpen] = useState(false);
  const [solution, setSolution] = useState("");
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [resolving, setResolving] = useState(false);
  const checkins = iss.checkins || [];

  // Libera la vista previa anterior cada vez que se reemplaza o se quita, y también al cerrar la
  // tarjeta — sin esto, cada foto que el técnico probaba antes de decidirse quedaba en memoria
  // sin liberar (URL.createObjectURL sin su URL.revokeObjectURL).
  useEffect(() => {
    return () => { if (afterPhotoPreview) URL.revokeObjectURL(afterPhotoPreview); };
  }, [afterPhotoPreview]);

  const doAttachBefore = async (file) => {
    if (!file) return;
    setUploadingBefore(true);
    try {
      await onAttachPhoto(iss.equipmentId, file);
    } catch (e) {
      showToast("✗ No se pudo subir la foto — intenta de nuevo.", false);
    }
    setUploadingBefore(false);
  };

  const doResolve = async () => {
    setResolving(true);
    let afterUrl = null;
    try {
      if (afterPhotoFile) afterUrl = await uploadPhoto(afterPhotoFile, `issue-${iss.equipmentId}`);
    } catch {
      showToast("La foto de \"después\" no se pudo subir, pero se va a guardar la resolución igual.", false);
    }
    try {
      await onResolve(iss, solution.trim(), afterUrl);
      setOpen(false); setSolution(""); setAfterPhotoFile(null); setAfterPhotoPreview(null);
    } catch (e) {
      showToast("✗ No se pudo guardar la resolución — revisa tu conexión e intenta de nuevo.", false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.red, background: C.redSoft }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Pill tone="red"><AlertTriangle size={12} /> Fuera de servicio</Pill>
            <Pill tone="gray"><Building2 size={11} /> {iss.floorName}</Pill>
          </div>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>#{iss.code} · {iss.name}</div>
          <div className="text-xs mt-1" style={{ color: "#7a3a26" }}>Reportado por <b>{iss.openedBy}</b> · {fmtDT(iss.openedAt)} · lleva <b>{elapsed(iss.openedAt)}</b></div>
          <div className="text-sm italic mt-1" style={{ color: C.ink }}>"{iss.observation}"</div>
          {checkins.length > 0 && (
            <div className="mt-2 pl-2" style={{ borderLeft: `2px solid ${C.red}` }}>
              {checkins.map((c, i) => (
                <div key={i} className="text-xs" style={{ color: "#7a3a26" }}>
                  ↳ Sigue igual — confirmado por <b>{c.by}</b> · {fmtDT(c.at)}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            {iss.beforePhotoUrl ? (
              <img loading="lazy" src={iss.beforePhotoUrl} alt="Foto del daño" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />
            ) : (
              <label className="text-xs font-medium px-2 py-1 rounded-md cursor-pointer inline-flex items-center gap-1" style={{ background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
                <Camera size={12} /> {uploadingBefore ? "Subiendo…" : "Agregar foto del daño"}
                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploadingBefore}
                  onChange={e => doAttachBefore(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
        {!open && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => { onCheckIn(iss).catch(() => showToast("✗ No se pudo guardar — intenta de nuevo.", false)); }}>Sigue igual</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Marcar resuelto</Button>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <input value={solution} onChange={e => setSolution(e.target.value)} placeholder="Solución aplicada…"
              className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <VoiceInputButton onResult={text => setSolution(s => (s ? s + " " : "") + text)} />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <label className="text-xs font-medium px-2 py-1 rounded-md cursor-pointer inline-flex items-center gap-1" style={{ background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
              <Camera size={12} /> {afterPhotoFile ? "Cambiar foto de la reparación" : "Foto de la reparación (opcional)"}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; setAfterPhotoFile(f || null); setAfterPhotoPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            {afterPhotoPreview && <img loading="lazy" src={afterPhotoPreview} alt="Vista previa" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 80, maxHeight: 60 }} />}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" icon={CheckCircle2} disabled={!solution.trim() || resolving} onClick={doResolve}>
              {resolving ? "Guardando…" : "Confirmar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: TANQUES DE AGUA POTABLE
   ============================================================ */
function TanksView({ latestValues, tankHistory, onSaveTankReading, currentUser }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(null);

  const data = TANK_ITEMS.map(t => {
    const lv = latestValues[t.id];
    const val = lv && lv.value !== "" && lv.value !== undefined ? Number(lv.value) : null;
    return { id: t.id, item: t, name: `${t.n}`, floor: t.floorName, value: val, updatedAt: lv?.updatedAt, updatedBy: lv?.updatedBy };
  });

  const colorFor = (v) => v === null ? C.gray : v < 20 ? C.red : v < 50 ? C.amber : C.green;

  const startEdit = (d) => { setEditing(d.id); setDraft(d.value === null ? "" : String(d.value)); setSavedFlash(null); };
  const doSave = async (d) => {
    const num = Number(draft);
    if (draft === "" || isNaN(num) || num < 0 || num > 100) return;
    await onSaveTankReading(d.item, num);
    setEditing(null);
    setSavedFlash(d.id);
    setTimeout(() => setSavedFlash(null), 2500);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Niveles de tanques de agua potable</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Solo tanques de agua potable (no incluye contraincendio ni ACPM). Se alimenta de los valores capturados en cada
        ronda, pero también puedes actualizar cualquiera manualmente aquí mismo — útil en cortes de agua, cuando
        necesitas revisar y dejar registrado el porcentaje sin esperar a la próxima ronda completa del piso.
      </p>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <VerticalBarChart data={data} labelKey="name" valueKey="value" colorFor={colorFor} formatValue={v => `${v}%`} />
        <div className="flex items-center gap-4 justify-center mt-2 text-xs" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.green }} /> ≥ 50%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.amber }} /> 20–49%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.red }} /> &lt; 20%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.gray }} /> Sin datos</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {data.map(d => {
          const hist = (tankHistory[d.id] || []).slice(-12).map(h => ({ t: fmtDT(h.at).slice(0, 11), v: Number(h.value) }));
          return (
            <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{d.name}</div>
                  <div className="text-xs" style={{ color: C.gray }}>{d.floor}</div>
                </div>
                <div className="text-lg font-bold" style={{ color: colorFor(d.value) }}>{d.value === null ? "—" : `${d.value}%`}</div>
              </div>

              {editing === d.id ? (
                <div className="flex items-center gap-2 my-2">
                  <input type="number" min={0} max={100} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") doSave(d); if (e.key === "Escape") setEditing(null); }}
                    placeholder="0-100" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <span className="text-xs" style={{ color: C.gray }}>%</span>
                  <Button size="sm" onClick={() => doSave(d)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="my-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>Actualizar nivel manualmente</Button>
                  {savedFlash === d.id && <span className="text-xs ml-2" style={{ color: C.green }}>✓ Guardado</span>}
                </div>
              )}

              {hist.length > 1 ? (
                <div style={{ width: "100%", height: 70 }}>
                  <Sparkline points={hist} />
                </div>
              ) : <div className="text-xs py-4 text-center" style={{ color: C.gray }}>Sin histórico suficiente</div>}
              <div className="text-xs mt-1" style={{ color: C.gray }}>
                {d.updatedAt ? `Últ. registro: ${fmtDT(d.updatedAt)} · ${d.updatedBy}` : "Sin registros aún"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Semáforo de la semana (item 11) — para el administrador en Inicio. */
function WeekSemaphore({ tasks, criticalStock = 0 }) {
  const abiertas = (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada");
  const vencidas = abiertas.filter(t => !t.esperaRepuesto && !isTaskSnoozed(t) && hoursBetween(t.createdAt || t.assignedAt || nowIso(), nowIso()) > 48).length;
  const reinc = abiertas.filter(t => t.reincidencia).length;
  const sinAsignar = abiertas.filter(t => !t.asignadoA).length;
  const rojo = vencidas >= 5 || reinc >= 3 || criticalStock >= 5;
  const amarillo = vencidas > 0 || reinc > 0 || criticalStock > 0 || sinAsignar > 0;
  const color = rojo ? C.red : amarillo ? C.amber : C.green;
  const titulo = rojo ? "Semana complicada" : amarillo ? "Semana con pendientes" : "Semana en orden";
  return (
    <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: C.panel, border: `1.5px solid ${color}` }}>
      <span className="w-4 h-4 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: C.ink }}>{titulo}</div>
        <div className="text-xs" style={{ color: C.inkSoft }}>{vencidas} vencidas (+48 h) · {reinc} reincidencias · {sinAsignar} sin asignar · {criticalStock} repuestos críticos</div>
      </div>
    </div>
  );
}

/** Ficha al escanear el QR de una herramienta (item 10). */
function ScannedToolSheet({ tool, accounts, currentUser, onClose, onLend, onReturn }) {
  useBackCloseModal(true, onClose);
  const quien = tool?.prestadaA ? (accounts?.[tool.prestadaA]?.display_name || tool.prestadaA) : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="pm-animate-in rounded-2xl max-w-sm w-full p-5" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
        {!tool ? <p className="text-sm" style={{ color: C.inkSoft }}>Esa herramienta ya no está registrada.</p> : (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray }}>Herramienta</div>
            <h3 className="text-lg font-bold" style={{ color: C.ink }}>{tool.nombre}</h3>
            <div className="text-sm mb-3" style={{ color: tool.estado === "prestada" ? C.amber : C.green }}>{tool.estado === "prestada" ? `Prestada a ${quien} desde ${fmtDT(tool.prestadaDesde)}` : "Disponible"}</div>
            <div className="flex gap-2">
              {tool.estado === "prestada"
                ? <Button size="sm" onClick={async () => { await onReturn(tool.id); onClose(); showToast("✓ Herramienta devuelta.", true); }}>Marcar devuelta</Button>
                : <Button size="sm" onClick={async () => { await onLend(tool.id, currentUser); onClose(); showToast("✓ Herramienta prestada a ti.", true); }}>Prestármela a mí</Button>}
              <Button size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Pasos ilustrados para instalar la app (item 19). */
function InstallSteps({ isIos }) {
  const Step = ({ n, icon, text }) => (
    <div className="flex items-center gap-3 rounded-lg p-2" style={{ background: C.bg }}>
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: C.amber, color: "#fff" }}>{n}</span>
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.panel, border: `1px solid ${C.line}` }}>{icon}</span>
      <span className="text-xs" style={{ color: C.ink }}>{text}</span>
    </div>
  );
  const shareIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>;
  const plusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>;
  const dotsIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill={C.ink}><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>;
  const phoneIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>;
  return (
    <div className="space-y-1.5 mt-2">
      {isIos ? (
        <>
          <Step n={1} icon={shareIcon} text="En Safari, toca el botón Compartir (el cuadro con la flecha hacia arriba)." />
          <Step n={2} icon={plusIcon} text={"Baja y toca «Añadir a pantalla de inicio»."} />
          <Step n={3} icon={phoneIcon} text="Toca Añadir y abre QuinTech desde el nuevo ícono." />
        </>
      ) : (
        <>
          <Step n={1} icon={dotsIcon} text="En Chrome, toca el menú de los tres puntos arriba a la derecha." />
          <Step n={2} icon={plusIcon} text={"Toca «Instalar aplicación» o «Añadir a pantalla de inicio»."} />
          <Step n={3} icon={phoneIcon} text="Confirma y abre QuinTech desde el nuevo ícono." />
        </>
      )}
    </div>
  );
}

/** Calendario de tareas (item 13): el mes completo, con lo creado, lo cerrado y lo programado. */
function CalendarView({ tasks, accounts }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [selected, setSelected] = useState(null);
  const key = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const byDay = useMemo(() => {
    const m = {};
    const add = (iso, kind, t) => { if (!iso) return; const k = key(iso); (m[k] = m[k] || { creadas: [], cerradas: [], programadas: [] })[kind].push(t); };
    (tasks || []).forEach(t => {
      add(t.createdAt, "creadas", t);
      if (normalizeTaskState(t.estado) === "finalizada") add(t.finishedAt, "cerradas", t);
      else if (t.snoozedUntil) add(t.snoozedUntil, "programadas", t);
    });
    return m;
  }, [tasks]);
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // semana empieza el lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const todayKey = key(new Date());
  const sel = selected ? byDay[selected] : null;
  const nameOf = (u) => (u ? (accounts?.[u]?.display_name || u) : "Sin asignar");
  const List = ({ title, color, items }) => items.length === 0 ? null : (
    <div className="mb-2">
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{title} · {items.length}</div>
      {items.slice(0, 12).map(t => <div key={t.id} className="flex justify-between gap-2 text-xs py-1 border-t" style={{ borderColor: C.line, color: C.ink }}><span className="truncate">{t.titulo}</span><span className="shrink-0" style={{ color: C.gray }}>{nameOf(t.asignadoA)}</span></div>)}
    </div>
  );
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-3 rounded-lg" style={{ minHeight: 40, background: C.panel, border: `1px solid ${C.line}` }} aria-label="Mes anterior"><ChevronLeft size={18} color={C.ink} /></button>
        <h2 className="text-lg font-semibold capitalize" style={{ color: C.ink }}>{cursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-3 rounded-lg" style={{ minHeight: 40, background: C.panel, border: `1px solid ${C.line}` }} aria-label="Mes siguiente"><ChevronRight size={18} color={C.ink} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold mb-1" style={{ color: C.gray }}>{["L", "M", "X", "J", "V", "S", "D"].map(d => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const k = key(d), info = byDay[k];
          return (
            <button key={k} onClick={() => setSelected(selected === k ? null : k)} className="rounded-lg p-1 flex flex-col items-center" style={{ minHeight: 52, background: selected === k ? C.steelDark : C.panel, color: selected === k ? "#fff" : C.ink, border: `1px solid ${k === todayKey ? C.amber : C.line}` }}>
              <span className="text-xs font-semibold">{d.getDate()}</span>
              <span className="flex gap-0.5 mt-1">
                {info?.creadas.length > 0 && <span className="text-[9px] font-bold px-1 rounded" style={{ background: C.blueSoft, color: C.blue }}>{info.creadas.length}</span>}
                {info?.cerradas.length > 0 && <span className="text-[9px] font-bold px-1 rounded" style={{ background: C.greenSoft, color: C.green }}>{info.cerradas.length}</span>}
                {info?.programadas.length > 0 && <span className="text-[9px] font-bold px-1 rounded" style={{ background: C.amberSoft, color: C.amber }}>{info.programadas.length}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 text-[11px] mt-2" style={{ color: C.inkSoft }}>
        <span><b style={{ color: C.blue }}>azul</b> creadas</span><span><b style={{ color: C.green }}>verde</b> cerradas</span><span><b style={{ color: C.amber }}>ámbar</b> programadas</span>
      </div>
      {sel && (
        <div className="rounded-xl p-3 mt-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
          <List title="Programadas" color={C.amber} items={sel.programadas} />
          <List title="Creadas" color={C.blue} items={sel.creadas} />
          <List title="Cerradas" color={C.green} items={sel.cerradas} />
        </div>
      )}
    </div>
  );
}

/** Plantillas de tareas (item 12): las tareas que repites a mano, listas para crear con un toque. */
function TaskTemplatesView({ templates, accounts, onSave, onDelete, onCreate }) {
  const empty = { nombre: "", descripcion: "", prioridad: "media", asignadoA: "", pasos: "" };
  const [form, setForm] = useState(empty);
  const [busyId, setBusyId] = useState(null);
  const inputCls = "text-sm border rounded-md px-2 py-1.5 outline-none w-full";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };
  const save = async () => {
    if (!form.nombre.trim()) return;
    await onSave({ id: uid("tpl"), nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), prioridad: form.prioridad, asignadoA: form.asignadoA, pasos: form.pasos.split("\n").map(x => x.trim()).filter(Boolean) });
    setForm(empty);
  };
  const crear = async (t) => {
    setBusyId(t.id);
    try { await onCreate([{ titulo: t.nombre, descripcion: t.descripcion, prioridad: t.prioridad, asignadoA: t.asignadoA, checklist: t.pasos, origen: "plantilla" }]); showToast(`✓ Tarea creada: ${t.nombre}`, true); }
    catch { showToast("No se pudo crear la tarea.", false); }
    setBusyId(null);
  };
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Plantillas de tareas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Guarda una vez las tareas que repites (revisión de bomba, limpieza de filtros) y créalas con un toque.</p>
      <div className="rounded-xl p-3 mb-4 space-y-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la tarea (ej: Revisión de bomba de agua helada)" className={inputCls} style={inputStyle} />
        <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Descripción (opcional)" className={`${inputCls} resize-y`} style={inputStyle} />
        <textarea value={form.pasos} onChange={e => setForm(f => ({ ...f, pasos: e.target.value }))} rows={3} placeholder={"Pasos, uno por línea (opcional)\nRevisar presión\nRevisar fugas"} className={`${inputCls} resize-y`} style={inputStyle} />
        <div className="flex gap-2 flex-wrap">
          <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))} className="text-sm border rounded-md px-2 outline-none" style={{ minHeight: 36, ...inputStyle }}>
            {TASK_PRIORITIES.map(pr => <option key={pr.code} value={pr.code}>Prioridad {pr.label}</option>)}
          </select>
          <select value={form.asignadoA} onChange={e => setForm(f => ({ ...f, asignadoA: e.target.value }))} className="text-sm border rounded-md px-2 outline-none" style={{ minHeight: 36, ...inputStyle }}>
            <option value="">Sin asignar</option>
            {Object.keys(accounts || {}).filter(u => accounts[u]?.approved !== false && !accounts[u]?.is_viewer && !accounts[u]?.is_gerencia).map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
          </select>
          <Button size="sm" disabled={!form.nombre.trim()} onClick={save}>Guardar plantilla</Button>
        </div>
      </div>
      {(templates || []).length === 0 ? <EmptyState icon={ClipboardList} title="Todavía no hay plantillas" hint="Guarda una tarea que repites seguido y la creas luego en un toque." /> : (templates || []).map(t => (
        <div key={t.id} className="rounded-xl p-3 mb-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{t.nombre}</div>
              <div className="text-xs" style={{ color: C.inkSoft }}>Prioridad {TASK_PRIORITIES.find(x => x.code === t.prioridad)?.label} · {t.asignadoA ? (accounts?.[t.asignadoA]?.display_name || t.asignadoA) : "Sin asignar"} · {(t.pasos || []).length} pasos</div>
            </div>
            <button onClick={() => onDelete(t.id)} aria-label="Borrar plantilla" style={{ minWidth: 32, minHeight: 32 }}><Trash2 size={15} color={C.gray} /></button>
          </div>
          <div className="mt-2"><Button size="sm" disabled={busyId === t.id} onClick={() => crear(t)}>{busyId === t.id ? "Creando…" : "Crear tarea ahora"}</Button></div>
        </div>
      ))}
    </div>
  );
}

/** Alerta de espacio (item 3): usa el último cálculo hecho en "Uso y respaldo". */
function StorageAlert({ onNavigate }) {
  let info = null;
  try { info = JSON.parse(localStorage.getItem("pm-local:space-check") || "null"); } catch { /* noop */ }
  const dias = info?.at ? Math.floor((Date.now() - new Date(info.at).getTime()) / 86400000) : null;
  const filesPct = info ? Math.round((((info.fotos || 0) * 0.15 + (info.videos || 0) * 20) / 1024) * 100) : 0;
  const hot = info && (info.pct >= 70 || filesPct >= 70);
  if (info && !hot && dias != null && dias <= 45) return null;
  return (
    <div className="rounded-xl p-3 mb-4 flex items-center justify-between gap-2 flex-wrap" style={{ background: hot ? C.redSoft : C.blueSoft, border: `1px solid ${hot ? C.red : C.blue}` }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>
        {hot ? `⚠️ El espacio gratuito va por encima del 70% (${Math.max(info.pct, filesPct)}%)` : info ? `📦 Hace ${dias} días que no revisas el espacio` : "📦 Todavía no has medido cuánto espacio llevas usado"}
      </div>
      <Button size="sm" variant="ghost" onClick={() => onNavigate("usage")}>Revisar espacio</Button>
    </div>
  );
}

/** Garantías por vencer (item 9). */
function WarrantyAlert({ equipos, onOpenEquipo }) {
  const now = Date.now();
  const list = (equipos || []).filter(e => e.active !== false && e.garantiaHasta)
    .map(e => ({ e, dias: Math.ceil((new Date(e.garantiaHasta + "T23:59:59").getTime() - now) / 86400000) }))
    .filter(x => x.dias <= 60 && x.dias >= -30).sort((a, b) => a.dias - b.dias);
  if (list.length === 0) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
      <div className="text-sm font-semibold mb-1" style={{ color: C.ink }}>🛡️ Garantías por vencer ({list.length})</div>
      {list.slice(0, 6).map(({ e, dias }) => (
        <button key={e.id} onClick={() => onOpenEquipo(e.id)} className="w-full flex justify-between gap-2 text-xs py-1.5 border-t text-left" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
          <span className="truncate">{e.nombre}</span>
          <span className="shrink-0 font-semibold" style={{ color: dias < 0 ? C.red : C.amber }}>{dias < 0 ? `venció hace ${-dias} d` : dias === 0 ? "vence hoy" : `vence en ${dias} d`}</span>
        </button>
      ))}
    </div>
  );
}

/** Meta mensual de preventivos (item 12) y equipos sin ningún mantenimiento (item 13). */
function PreventiveGoalCard({ mttoLog, equipos, onOpenEquipo }) {
  const [meta, setMeta] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showNone, setShowNone] = useState(false);
  useEffect(() => { sGet("preventive-goal", true).then(v => setMeta(v && Number(v.meta) > 0 ? Number(v.meta) : 0)).catch(() => setMeta(0)); }, []);
  const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
  const hechos = (mttoLog || []).filter(r => r.tipo === "preventivo" && new Date(r.fecha).getTime() >= ini.getTime()).length;
  const conRegistro = new Set((mttoLog || []).map(r => r.equipoId));
  const sinMtto = (equipos || []).filter(e => e.active !== false && !conRegistro.has(e.id));
  const pct = meta ? Math.min(100, Math.round((hechos / meta) * 100)) : 0;
  const guardar = async () => { const n = Number(draft); if (!n || n < 1) return; setMeta(n); setEditing(false); try { await sSet("preventive-goal", { meta: n }, true); } catch { /* noop */ } };
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold" style={{ color: C.ink }}>🛠️ Preventivos del mes</div>
        {!editing && <button onClick={() => { setDraft(meta ? String(meta) : ""); setEditing(true); }} className="text-xs font-semibold" style={{ color: C.amber, minHeight: 32 }}>{meta ? "Cambiar meta" : "Poner meta"}</button>}
      </div>
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <input type="number" min="1" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Meta del mes (ej: 40)" className="text-sm border rounded-md px-2 outline-none w-40" style={{ minHeight: 36, borderColor: C.line, background: C.bg, color: C.ink }} />
          <Button size="sm" onClick={guardar}>Guardar</Button>
          <button onClick={() => setEditing(false)} className="text-xs" style={{ color: C.gray }}>Cancelar</button>
        </div>
      )}
      {meta ? (
        <>
          <div className="h-2.5 rounded-full overflow-hidden mt-2" style={{ background: C.bg }}><div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? C.green : C.amber, transition: "width 600ms var(--ease-out)" }} /></div>
          <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{hechos} de {meta} ({pct}%)</div>
        </>
      ) : <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{hechos} preventivos este mes. Pon una meta para ver el avance.</div>}
      {sinMtto.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowNone(v => !v)} className="text-xs font-semibold" style={{ color: C.red, minHeight: 32 }}>{sinMtto.length} equipos sin ningún mantenimiento registrado {showNone ? "▲" : "▼"}</button>
          {showNone && sinMtto.slice(0, 15).map(e => (
            <button key={e.id} onClick={() => onOpenEquipo(e.id)} className="w-full text-left text-xs py-1.5 border-t flex justify-between gap-2" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
              <span className="truncate">{e.nombre}</span><span className="shrink-0" style={{ color: C.gray }}>{e.sistema}</span>
            </button>
          ))}
          {showNone && sinMtto.length > 15 && <div className="text-[11px]" style={{ color: C.gray }}>+{sinMtto.length - 15} más</div>}
        </div>
      )}
    </div>
  );
}

/** Equipos con 3 o más fallas (correctivos o tareas) en los últimos 60 días: mejor cambiarlos que seguir reparando. */
function ReincidentCard({ mttoLog, equipos, tasks, onOpenEquipo }) {
  const since = Date.now() - 60 * 86400000;
  const count = {};
  (mttoLog || []).forEach(r => { if (r.tipo === "correctivo" && new Date(r.fecha).getTime() >= since) count[r.equipoId] = (count[r.equipoId] || 0) + 1; });
  (tasks || []).forEach(t => {
    if (!t.equipoId || t.origen === "preventivo-hab" || t.origen === "plantilla") return;
    if (new Date(t.createdAt || 0).getTime() < since) return;
    count[t.equipoId] = (count[t.equipoId] || 0) + 1;
  });
  const list = (equipos || []).filter(e => e.active !== false && (count[e.id] || 0) >= 3)
    .map(e => ({ e, n: count[e.id] })).sort((a, b) => b.n - a.n).slice(0, 6);
  if (list.length === 0) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.redSoft, border: `1px solid ${C.red}` }}>
      <div className="text-sm font-semibold mb-0.5" style={{ color: C.ink }}><TitleIco i={RotateCcw} color={C.red} />Equipos que fallan seguido ({list.length})</div>
      <div className="text-[11px] mb-1" style={{ color: C.inkSoft }}>3 o más fallas en 60 días. Puede convenir cambiarlos en vez de seguir reparando.</div>
      {list.map(({ e, n }) => (
        <button key={e.id} onClick={() => onOpenEquipo(e.id)} className="w-full flex justify-between gap-2 text-xs py-1.5 border-t text-left" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
          <span className="truncate">{e.nombre}</span>
          <span className="shrink-0 font-semibold" style={{ color: C.red }}>{n} fallas</span>
        </button>
      ))}
    </div>
  );
}

/** Tareas abiertas que llevan 3 o más días sin ningún movimiento (cambio, comentario). */
function StaleTasksCard({ tasks, currentUser, isAdmin, nameOf, onNavigate }) {
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const list = (tasks || []).filter(t => {
    if (normalizeTaskState(t.estado) === "finalizada" || isTaskSnoozed(t)) return false;
    if (!isAdmin && t.asignadoA !== currentUser) return false;
    return (now - lastTaskActivityMs(t)) / 86400000 >= 3;
  }).map(t => ({ t, d: Math.floor((now - lastTaskActivityMs(t)) / 86400000) })).sort((a, b) => b.d - a.d);
  if (list.length === 0) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-semibold" style={{ color: C.ink }}>⏳ {isAdmin ? "Tareas sin movimiento" : "Tus tareas sin movimiento"} ({list.length})</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && list.slice(0, 10).map(({ t, d }) => (
        <button key={t.id} onClick={() => onNavigate("tasks")} className="w-full flex justify-between gap-2 text-xs py-1.5 border-t text-left" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
          <span className="truncate">{t.titulo}{isAdmin && t.asignadoA ? ` · ${nameOf(t.asignadoA)}` : ""}</span>
          <span className="shrink-0 font-semibold" style={{ color: C.amber }}>{d} días</span>
        </button>
      ))}
      {open && list.length > 10 && <div className="text-[11px] pt-1" style={{ color: C.gray }}>+{list.length - 10} más en Tareas</div>}
    </div>
  );
}

/** Costos del año por equipo y por sistema, según lo anotado en los mantenimientos. */
function YearCostCard({ mttoLog, equipos, onOpenEquipo }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const money = (n) => "$" + Math.round(n).toLocaleString("es-CO");
  const rows = useMemo(() => {
    const byEq = {};
    let total = 0;
    (mttoLog || []).forEach(r => {
      const c = Number(r.costo) || 0;
      if (!c || new Date(r.fecha).getFullYear() !== year) return;
      byEq[r.equipoId] = (byEq[r.equipoId] || 0) + c; total += c;
    });
    const list = Object.entries(byEq).map(([id, v]) => ({ id, v, e: (equipos || []).find(x => x.id === id) })).sort((a, b) => b.v - a.v);
    return { list, total };
  }, [mttoLog, equipos, year]);
  const years = [...new Set((mttoLog || []).map(r => new Date(r.fecha).getFullYear()).filter(y => y > 2000))];
  if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
  years.sort((a, b) => b - a);
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={TrendingUp} />Costos de mantenimiento del año</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Ver ▼"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-sm font-bold" style={{ color: C.ink }}>Total: {money(rows.total)}</span>
          </div>
          {rows.list.length === 0 ? <div className="text-xs" style={{ color: C.inkSoft }}>No hay costos anotados en {year}. Se llenan al registrar un mantenimiento con valor.</div> : rows.list.slice(0, 15).map(({ id, v, e }) => (
            <button key={id} onClick={() => e && onOpenEquipo(id)} className="w-full text-left text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
              <div className="flex justify-between gap-2"><span className="truncate">{e?.nombre || "Equipo borrado"}</span><span className="shrink-0 font-semibold">{money(v)}</span></div>
              <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: C.bg }}><div className="h-full" style={{ width: `${Math.max(3, Math.round((v / rows.list[0].v) * 100))}%`, background: C.amber }} /></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Gráficas del mes: tareas cerradas por semana, tiempo promedio de cierre y equipos con más fallas. */
function MonthChartsCard({ tasks, mttoLog, equipos }) {
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState(() => monthKeyOf(Date.now()));
  const data = useMemo(() => {
    const inMonth = (iso) => iso && monthKeyOf(new Date(iso).getTime()) === ym;
    const closed = (tasks || []).filter(t => normalizeTaskState(t.estado) === "finalizada" && inMonth(t.finishedAt));
    const weeks = [0, 0, 0, 0, 0];
    closed.forEach(t => { const d = new Date(t.finishedAt).getDate(); weeks[Math.min(4, Math.floor((d - 1) / 7))]++; });
    const hrs = closed.map(t => (new Date(t.finishedAt) - new Date(t.createdAt || t.assignedAt || t.finishedAt)) / 3600000).filter(h => h >= 0 && isFinite(h));
    const avg = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const fallas = {};
    (mttoLog || []).forEach(r => { if (r.tipo === "correctivo" && inMonth(r.fecha)) fallas[r.equipoId] = (fallas[r.equipoId] || 0) + 1; });
    const top = Object.entries(fallas).map(([id, n]) => ({ n, nombre: (equipos || []).find(e => e.id === id)?.nombre || "Equipo borrado" })).sort((a, b) => b.n - a.n).slice(0, 5);
    const created = (tasks || []).filter(t => inMonth(t.createdAt)).length;
    return { weeks, closed: closed.length, avg, top, created };
  }, [tasks, mttoLog, equipos, ym]);
  const monthOpts = (() => { const out = []; const d = new Date(); for (let i = 0; i < 12; i++) { out.push(monthKeyOf(d.getTime())); d.setMonth(d.getMonth() - 1); } return out; })();
  const maxW = Math.max(1, ...data.weeks), maxT = Math.max(1, ...data.top.map(x => x.n));
  const avgTxt = data.avg < 1 ? `${Math.round(data.avg * 60)} min` : data.avg < 48 ? `${data.avg.toFixed(1)} h` : `${(data.avg / 24).toFixed(1)} días`;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={CalendarDays} />Resumen del mes con gráficas</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Ver ▼"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <select value={ym} onChange={e => setYm(e.target.value)} className="text-xs border rounded-md px-2 outline-none mb-3" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
            {monthOpts.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="rounded-lg p-2" style={{ background: C.bg }}><div className="text-lg font-bold" style={{ color: C.ink }}>{data.created}</div><div className="text-[10px]" style={{ color: C.inkSoft }}>creadas</div></div>
            <div className="rounded-lg p-2" style={{ background: C.bg }}><div className="text-lg font-bold" style={{ color: C.green }}>{data.closed}</div><div className="text-[10px]" style={{ color: C.inkSoft }}>cerradas</div></div>
            <div className="rounded-lg p-2" style={{ background: C.bg }}><div className="text-lg font-bold" style={{ color: C.ink }}>{data.closed ? avgTxt : "—"}</div><div className="text-[10px]" style={{ color: C.inkSoft }}>cierre promedio</div></div>
          </div>
          <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>Cerradas por semana</div>
          <div className="flex items-end gap-2 mb-3" style={{ height: 80 }}>
            {data.weeks.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-[10px] mb-0.5" style={{ color: C.inkSoft }}>{n}</div>
                <div className="w-full rounded-t pm-grow-y" style={{ height: `${Math.max(2, Math.round((n / maxW) * 56))}px`, background: `linear-gradient(180deg, ${C.amber}, #f5c26b)`, animationDelay: `${i * 0.08}s` }} />
                <div className="text-[10px] mt-0.5" style={{ color: C.gray }}>S{i + 1}</div>
              </div>
            ))}
          </div>
          <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>Equipos con más fallas</div>
          {data.top.length === 0 ? <div className="text-xs" style={{ color: C.inkSoft }}>Sin correctivos registrados este mes.</div> : data.top.map(x => (
            <div key={x.nombre} className="mb-1.5">
              <div className="flex justify-between text-xs" style={{ color: C.ink }}><span className="truncate">{x.nombre}</span><span className="font-semibold">{x.n}</span></div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.bg }}><div className="h-full pm-grow-x" style={{ width: `${Math.round((x.n / maxT) * 100)}%`, background: C.red }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/** Buscador global: tareas, equipos, repuestos y habitaciones desde una sola caja. */
function GlobalSearchCard({ tasks, equipos, invItems, onNavigate, onOpenEquipo }) {
  const [q, setQ] = useState("");
  const n = normalizeSearchText(q.trim());
  const res = useMemo(() => {
    if (n.length < 2) return null;
    const hit = (v) => normalizeSearchText(String(v || "")).includes(n);
    return {
      tareas: (tasks || []).filter(t => hit(t.titulo) || hit(t.descripcion) || hit(t.roomKey)).slice(0, 5),
      equipos: (equipos || []).filter(e => e.active !== false && (hit(e.nombre) || hit(e.sistema) || hit(e.marca) || hit(e.modelo) || hit(e.serial))).slice(0, 5),
      repuestos: (invItems || []).filter(i => hit(i.name) || hit(i.sku)).slice(0, 5),
      room: /^\d{3,5}$/.test(q.trim()) ? q.trim() : null,
    };
  }, [n, tasks, equipos, invItems, q]);
  const total = res ? res.tareas.length + res.equipos.length + res.repuestos.length + (res.room ? 1 : 0) : 0;
  const rowCls = "w-full flex justify-between gap-2 text-xs py-1.5 border-t text-left";
  const rowSt = { borderColor: C.line, color: C.ink, minHeight: 36 };
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en todo: tareas, equipos, repuestos, habitaciones…"
        className="w-full text-sm border rounded-md px-3 outline-none" style={{ minHeight: 40, borderColor: C.line, background: C.bg, color: C.ink }} />
      {res && total === 0 && <div className="text-xs mt-2" style={{ color: C.inkSoft }}>No encontré nada con "{q.trim()}".</div>}
      {res && res.room && <button onClick={() => onNavigate("room-history")} className={rowCls} style={rowSt}><span>🛏️ Habitación {res.room}</span><span style={{ color: C.amber }}>Ver historial →</span></button>}
      {res && res.tareas.length > 0 && <div className="text-[10px] font-semibold uppercase mt-2" style={{ color: C.gray }}>Tareas</div>}
      {res && res.tareas.map(t => <button key={t.id} onClick={() => onNavigate("tasks")} className={rowCls} style={rowSt}><span className="truncate">{t.titulo}</span><span className="shrink-0" style={{ color: C.gray }}>{TASK_STATES.find(x => x.code === normalizeTaskState(t.estado))?.label || ""}</span></button>)}
      {res && res.equipos.length > 0 && <div className="text-[10px] font-semibold uppercase mt-2" style={{ color: C.gray }}>Equipos</div>}
      {res && res.equipos.map(e => <button key={e.id} onClick={() => onOpenEquipo(e.id)} className={rowCls} style={rowSt}><span className="truncate">{e.nombre}</span><span className="shrink-0" style={{ color: C.gray }}>{e.sistema}</span></button>)}
      {res && res.repuestos.length > 0 && <div className="text-[10px] font-semibold uppercase mt-2" style={{ color: C.gray }}>Repuestos</div>}
      {res && res.repuestos.map(i => <button key={i.id} onClick={() => onNavigate("inventory")} className={rowCls} style={rowSt}><span className="truncate">{i.name}{i.sku ? ` · ${i.sku}` : ""}</span><span className="shrink-0" style={{ color: i.minThreshold > 0 && i.quantity <= i.minThreshold ? C.red : C.gray }}>{i.quantity} {i.unit || ""}</span></button>)}
    </div>
  );
}

/** Modo emergencia: una pantalla simple con letras grandes para reportar algo urgente en segundos. */
function EmergencyButton({ tasks, currentUser, onCreateTask, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [lugar, setLugar] = useState("");
  const [que, setQue] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = (tasks || []).filter(t => t.asignadoA === currentUser && normalizeTaskState(t.estado) !== "finalizada" && (t.prioridad === "alta" || t.prioridad === "critica"));
  const send = async () => {
    if (!que.trim()) { showToast("Cuenta en pocas palabras qué pasa.", false); return; }
    setBusy(true);
    try {
      await onCreateTask({ titulo: `🚨 EMERGENCIA — ${lugar.trim() || "sin lugar"}: ${que.trim().slice(0, 80)}`, descripcion: `${que.trim()}\n\nLugar: ${lugar.trim() || "no indicado"}. Reportada desde el modo emergencia.`, prioridad: "alta", asignadoA: "", recurrencia: "", fotosAntes: [], equipoId: null, etiquetas: ["emergencia"] });
      showToast("🚨 Emergencia reportada como tarea de prioridad alta.", true);
      setOpen(false); setLugar(""); setQue("");
    } catch (e) { showToast(e.message || "No se pudo reportar — intenta de nuevo.", false); }
    setBusy(false);
  };
  return (
    <>
      <style>{`
        @keyframes pmSosBeat{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}70%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}
        .pm-sos{animation:pmSosBeat 2.4s ease-out infinite;transition:transform .15s}
        .pm-sos:active{transform:scale(.98)}
        @media (prefers-reduced-motion:reduce){.pm-sos{animation:none}}
      `}</style>
      <button onClick={() => setOpen(true)} className="pm-sos w-full rounded-2xl mb-4 font-bold text-sm tracking-wide" style={{ minHeight: 52, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "1px solid #fca5a5" }}><AlertTriangle size={18} strokeWidth={2.2} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }} aria-hidden="true" />Emergencia — reportar ya</button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)}>
          <div className="rounded-2xl w-full max-w-md p-5" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold mb-3" style={{ color: C.red }}><TitleIco i={AlertTriangle} color={C.red} />Modo emergencia</div>
            <input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="¿Dónde? (habitación, piso, cuarto…)" className="w-full text-base border rounded-lg px-3 mb-2 outline-none" style={{ minHeight: 52, borderColor: C.line, background: C.bg, color: C.ink }} />
            <div className="flex items-start gap-2 mb-3">
              <textarea value={que} onChange={e => setQue(e.target.value)} rows={3} placeholder="¿Qué pasa?" className="flex-1 text-base border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
              <VoiceInputButton onResult={t => setQue(d => (d ? d + " " : "") + t)} />
            </div>
            <button onClick={send} disabled={busy} className="w-full rounded-xl font-bold text-base mb-2" style={{ minHeight: 56, background: C.red, color: "#fff", opacity: busy ? 0.6 : 1 }}>{busy ? "Enviando…" : "REPORTAR EMERGENCIA"}</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setOpen(false); onNavigate("tasks"); }} className="rounded-xl text-sm font-semibold" style={{ minHeight: 48, background: C.bg, color: C.ink, border: `1px solid ${C.line}` }}>Mis tareas{mine.length ? ` (${mine.length} críticas)` : ""}</button>
              <button onClick={() => setOpen(false)} className="rounded-xl text-sm font-semibold" style={{ minHeight: 48, background: C.bg, color: C.inkSoft, border: `1px solid ${C.line}` }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Entrega de turno guiada: se marca qué pendientes pasan al siguiente turno, se escribe una nota y todo queda guardado. */
function ShiftHandoverCard({ tasks, mttoLog, nameOf, byName }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(8);
  const [note, setNote] = useState("");
  const [sel, setSel] = useState(null);
  const [last, setLast] = useState(null);
  const [saving, setSaving] = useState(false);
  const isAlta = (t) => t.prioridad === "alta" || t.prioridad === "critica";
  const pend = useMemo(() => (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada" && !isTaskSnoozed(t))
    .sort((a, b) => (isAlta(b) ? 1 : 0) - (isAlta(a) ? 1 : 0)).slice(0, 25), [tasks]);
  const chosen = sel || new Set(pend.filter(isAlta).map(t => t.id));
  const toggle = (id) => { const n = new Set(chosen); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  useEffect(() => { if (open) sGet("shift-handovers", true).then(v => setLast(Array.isArray(v) && v.length ? v[0] : null)).catch(() => {}); }, [open]);
  const text = useMemo(() => {
    const since = Date.now() - hours * 3600000;
    const inWin = (iso) => iso && new Date(iso).getTime() >= since;
    const closed = (tasks || []).filter(t => normalizeTaskState(t.estado) === "finalizada" && inWin(t.finishedAt));
    const created = (tasks || []).filter(t => inWin(t.createdAt));
    const mtto = (mttoLog || []).filter(r => inWin(r.fecha));
    const L = [`*Entrega de turno* — ${byName} (${fmtDT(new Date().toISOString())})`, "", `✅ Cerradas en ${hours} h: ${closed.length}`];
    closed.slice(0, 10).forEach(t => L.push(`  • ${t.titulo}${t.asignadoA ? ` (${nameOf(t.asignadoA)})` : ""}`));
    L.push(`🆕 Nuevas: ${created.length}   🛠️ Mantenimientos: ${mtto.length}`, "");
    const pass = pend.filter(t => chosen.has(t.id));
    L.push(`➡️ Pasan al siguiente turno (${pass.length}):`);
    pass.forEach(t => L.push(`  ${isAlta(t) ? "🔴" : "•"} ${t.titulo}${t.asignadoA ? ` — ${nameOf(t.asignadoA)}` : ""}`));
    if (note.trim()) L.push("", `📝 Nota: ${note.trim()}`);
    return L.join("\n");
  }, [tasks, mttoLog, hours, note, pend, sel, byName]);
  const save = async () => {
    setSaving(true);
    try {
      const prev = await sGet("shift-handovers", true);
      const entry = { at: new Date().toISOString(), by: byName, text };
      await sSet("shift-handovers", [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 30), true);
      setLast(entry); showToast("✓ Entrega guardada — el siguiente turno la verá.", true);
    } catch { showToast("No se pudo guardar la entrega.", false); }
    setSaving(false);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); showToast("✓ Entrega copiada.", true); } catch { showToast("No se pudo copiar.", false); } };
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={ClipboardCheck} />Entrega de turno guiada</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Abrir ▼"}</span>
      </button>
      {open && (
        <div className="mt-2">
          {last && <div className="rounded-lg p-2 mb-2 text-[11px] whitespace-pre-wrap" style={{ background: C.bg, color: C.inkSoft, maxHeight: 120, overflowY: "auto" }}><b>Última entrega ({last.by}, {fmtDT(last.at)}):</b>{"\n"}{last.text}</div>}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs" style={{ color: C.inkSoft }}>Resumir las últimas</span>
            <select value={hours} onChange={e => setHours(Number(e.target.value))} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>{[4, 8, 12, 24].map(h => <option key={h} value={h}>{h} horas</option>)}</select>
          </div>
          <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>¿Qué pasa al siguiente turno?</div>
          {pend.length === 0 ? <div className="text-xs mb-2" style={{ color: C.green }}>No hay pendientes abiertos. 👍</div> : (
            <div className="mb-2" style={{ maxHeight: 180, overflowY: "auto" }}>
              {pend.map(t => (
                <label key={t.id} className="flex items-start gap-2 text-xs py-1.5 border-t cursor-pointer" style={{ borderColor: C.line, color: C.ink }}>
                  <input type="checkbox" checked={chosen.has(t.id)} onChange={() => toggle(t.id)} style={{ marginTop: 2 }} />
                  <span>{isAlta(t) ? "🔴 " : ""}{t.titulo}{t.asignadoA ? ` — ${nameOf(t.asignadoA)}` : ""}</span>
                </label>
              ))}
            </div>
          )}
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Nota para el siguiente turno (opcional)…" className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
          <textarea readOnly value={text} rows={8} className="w-full text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
          <div className="flex gap-2 mt-2 flex-wrap">
            <Button size="sm" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar entrega"}</Button>
            <Button size="sm" variant="ghost" onClick={copy}>Copiar</Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")}>WhatsApp</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Recordatorio de respaldo: el cron gratis de Vercel ya está ocupado, así que avisa al administrador cuando hace más de 7 días que no hay respaldo en Drive. */
function BackupReminderCard({ onNavigate }) {
  const [at, setAt] = useState(undefined);
  useEffect(() => { let on = true; sGet("last-backup", true).then(v => { if (on) setAt(v?.at || null); }).catch(() => { if (on) setAt(null); }); return () => { on = false; }; }, []);
  if (at === undefined) return null;
  const days = at ? Math.floor((Date.now() - new Date(at).getTime()) / 86400000) : null;
  if (days != null && days < 7) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.amberSoft || C.panel, border: `1px solid ${C.amber}` }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}><TitleIco i={Save} />{days == null ? "Todavía no hay un respaldo en Drive" : `Hace ${days} días no se hace un respaldo en Drive`}</div>
      <div className="text-[11px] mt-0.5 mb-2" style={{ color: C.inkSoft }}>Un respaldo guarda tareas, seguimientos y mantenimientos en tu Drive por si algo se daña.</div>
      <button onClick={() => onNavigate("admin")} className="text-xs font-semibold rounded-lg px-3" style={{ minHeight: 36, background: C.amber, color: "#fff" }}>Ir a respaldar</button>
    </div>
  );
}

/** Avisa al administrador de cuentas que entraron en los últimos 7 días desde un dispositivo que nunca habían usado. */
function NewDeviceCard({ loginLog, nameOf }) {
  const [open, setOpen] = useState(false);
  const since = Date.now() - 7 * 86400000;
  const log = (loginLog || []).filter(l => l.deviceId);
  const firstSeen = {};
  [...log].reverse().forEach(l => { const k = l.userId + "|" + l.deviceId; if (!firstSeen[k]) firstSeen[k] = l; });
  const hadBefore = {};
  (loginLog || []).forEach(l => { if (!l.deviceId) hadBefore[l.userId] = true; });
  const nuevos = Object.values(firstSeen).filter(l => new Date(l.at).getTime() >= since)
    .filter(l => (loginLog || []).some(o => o.userId === l.userId && new Date(o.at).getTime() < new Date(l.at).getTime() - 60000))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  if (nuevos.length === 0) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={Users} />Ingresos desde dispositivos nuevos ({nuevos.length})</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Ver ▼"}</span>
      </button>
      {open && nuevos.map(l => (
        <div key={l.userId + l.deviceId} className="text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
          <b>{nameOf(l.userId)}</b> · {l.device || "Dispositivo"} · {fmtDT(l.at)}
        </div>
      ))}
      {open && <div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>Si no reconoces alguno, cambia la contraseña de esa cuenta desde Administración.</div>}
    </div>
  );
}

/** Equipos cuyas fallas se están acercando: el tiempo entre las últimas dos es mucho menor que el anterior. */
function FailurePredictCard({ mttoLog, equipos, onOpenEquipo }) {
  const by = {};
  (mttoLog || []).forEach(r => { if (r.tipo === "correctivo" && r.equipoId) (by[r.equipoId] = by[r.equipoId] || []).push(new Date(r.fecha).getTime()); });
  const list = [];
  Object.entries(by).forEach(([id, arr]) => {
    const d = arr.filter(x => x > 0).sort((a, b) => a - b);
    if (d.length < 3) return;
    const last = (d[d.length - 1] - d[d.length - 2]) / 86400000;
    const prev = (d[d.length - 2] - d[d.length - 3]) / 86400000;
    const e = (equipos || []).find(x => x.id === id);
    if (!e || e.active === false) return;
    if (prev >= 5 && last <= prev * 0.6) list.push({ e, prev: Math.round(prev), last: Math.max(1, Math.round(last)) });
  });
  list.sort((a, b) => (a.last / a.prev) - (b.last / b.prev));
  if (list.length === 0) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-sm font-semibold mb-0.5" style={{ color: C.ink }}><TitleIco i={TrendingDown} color={C.red} />Fallas cada vez más seguidas ({list.length})</div>
      <div className="text-[11px] mb-1" style={{ color: C.inkSoft }}>El tiempo entre las últimas fallas se está acortando. Conviene una revisión a fondo antes de la próxima.</div>
      {list.slice(0, 6).map(({ e, prev, last }) => (
        <button key={e.id} onClick={() => onOpenEquipo(e.id)} className="w-full flex justify-between gap-2 text-xs py-1.5 border-t text-left" style={{ borderColor: C.line, color: C.ink, minHeight: 36 }}>
          <span className="truncate">{e.nombre}</span>
          <span className="shrink-0" style={{ color: C.amber }}>cada {prev} d → {last} d</span>
        </button>
      ))}
    </div>
  );
}

/** Presupuesto mensual de mantenimiento vs. lo gastado en el mes (según los costos de los registros). */
function MonthlyBudgetCard({ mttoLog }) {
  const [budget, setBudget] = useState(undefined);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => { let on = true; sGet("budget-mensual", true).then(v => { if (on) setBudget(Number(v?.monto) || 0); }).catch(() => { if (on) setBudget(0); }); return () => { on = false; }; }, []);
  const now = new Date();
  const spent = (mttoLog || []).reduce((a, r) => { const d = new Date(r.fecha); return (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) ? a + (Number(r.costo) || 0) : a; }, 0);
  const money = (n) => "$" + Math.round(n).toLocaleString("es-CO");
  if (budget === undefined) return null;
  const save = async () => { const n = Number(String(draft).replace(/[^\d]/g, "")) || 0; setBudget(n); setEdit(false); try { await sSet("budget-mensual", { monto: n, by: nowIso() }, true); } catch { showToast("No se pudo guardar el presupuesto.", false); } };
  const day = now.getDate(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const proj = day > 0 ? (spent / day) * dim : 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${over ? C.red : C.line}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={ClipboardCheck} />Presupuesto del mes</span>
        <button onClick={() => { setDraft(budget ? String(budget) : ""); setEdit(v => !v); }} className="text-xs" style={{ color: C.amber, minHeight: 32 }}>{edit ? "Cancelar" : (budget ? "Cambiar" : "Definir")}</button>
      </div>
      {edit && (
        <div className="flex gap-2 my-2">
          <input inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Monto en pesos (ej: 2000000)" className="flex-1 rounded-lg px-3 text-sm" style={{ minHeight: 40, background: C.bg, border: `1px solid ${C.line}`, color: C.ink }} />
          <button onClick={save} className="rounded-lg px-3 text-xs font-semibold" style={{ minHeight: 40, background: C.amber, color: "#fff" }}>Guardar</button>
        </div>
      )}
      {budget > 0 ? (
        <>
          <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{money(spent)} de {money(budget)} ({pct}%){over ? " — te pasaste" : ""}</div>
          <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: C.line }}><div style={{ width: pct + "%", height: "100%", background: over ? C.red : pct >= 80 ? C.amber : C.green }} /></div>
          <div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>A este ritmo cerrarías el mes en {money(proj)}{proj > budget ? " (por encima del presupuesto)" : ""}.</div>
        </>
      ) : <div className="text-[11px] mt-1" style={{ color: C.inkSoft }}>Gastado este mes: {money(spent)}. Define un presupuesto para ver el avance.</div>}
    </div>
  );
}

/** Arma el mensaje de pedido con lo que está bajo el mínimo y lo abre en WhatsApp (tú eliges a quién enviarlo). */
function LowStockOrderCard({ invItems }) {
  const low = computeLowStock(invItems || []);
  const [open, setOpen] = useState(false);
  if (low.length === 0) return null;
  const falta = (it) => Math.max(1, Math.ceil((it.minThreshold || 0) * 2 - (it.quantity || 0)));
  const text = `Pedido de repuestos — ${new Date().toLocaleDateString("es-CO")}\n` + low.slice(0, 40).map(it => `• ${it.name}${it.sku ? " (" + it.sku + ")" : ""}: pedir ${falta(it)} ${it.unit || "unidad"} (quedan ${it.quantity})`).join("\n");
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={PackagePlus} />Repuestos por pedir ({low.length})</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Ver ▼"}</span>
      </button>
      {open && (
        <>
          {low.slice(0, 40).map(it => <div key={it.id} className="flex justify-between gap-2 text-xs py-1 border-t" style={{ borderColor: C.line, color: C.ink }}><span className="truncate">{it.name}</span><span className="shrink-0">quedan {it.quantity} · pedir {falta(it)}</span></div>)}
          <div className="flex gap-2 mt-2">
            <a href={"https://wa.me/?text=" + encodeURIComponent(text)} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 text-xs font-semibold flex items-center" style={{ minHeight: 40, background: "#25D366", color: "#fff" }}>Enviar por WhatsApp</a>
            <button onClick={() => { try { navigator.clipboard.writeText(text); showToast("✓ Lista copiada", true); } catch { showToast("No se pudo copiar", false); } }} className="rounded-lg px-3 text-xs font-semibold" style={{ minHeight: 40, border: `1px solid ${C.line}`, color: C.ink }}>Copiar lista</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Cierre de sesión automático por inactividad — se elige por dispositivo (útil en tablets compartidas). */
function IdleLogoutSetting() {
  const [min, setMin] = useState(() => { try { return localStorage.getItem("pm-local:idle-min") || "0"; } catch { return "0"; } });
  return (
    <div className="rounded-xl p-3 mb-4 flex items-center justify-between gap-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <span className="text-xs" style={{ color: C.ink }}><TitleIco i={ShieldCheck} />Cerrar sesión sola en este dispositivo</span>
      <select value={min} onChange={e => { setMin(e.target.value); try { localStorage.setItem("pm-local:idle-min", e.target.value); } catch { /* sin almacenamiento */ } }}
        className="rounded-lg px-2 text-xs" style={{ minHeight: 36, background: C.bg, border: `1px solid ${C.line}`, color: C.ink }}>
        <option value="0">Nunca</option><option value="30">Tras 30 min sin usar</option><option value="120">Tras 2 horas</option><option value="480">Tras 8 horas</option>
      </select>
    </div>
  );
}

/** Módulos agrupados en fichas (misma lista que el menú lateral): una forma rápida de llegar a cualquier módulo desde Inicio. */
function ModuleGroupsCard({ groups, onNavigate }) {
  const list = (groups || []).filter(g => g.items && g.items.length);
  const [gid, setGid] = useState(() => { try { return localStorage.getItem("pm-local:home-group") || ""; } catch { return ""; } });
  if (list.length === 0) return null;
  const cur = list.find(g => g.id === gid) || list[0];
  const palette = ["#2563eb", "#0891b2", "#d97706", "#7c3aed", "#16a34a", "#0d9488", "#dc2626", "#0ea5e9"];
  const pick = (id) => { setGid(id); try { localStorage.setItem("pm-local:home-group", id); } catch { /* sin almacenamiento */ } };
  const badgeText = (b) => (b === "!" ? "!" : Number(b) > 99 ? "99+" : String(b));
  return (
    <div className="mb-4">
      <style>{`
        @keyframes pmTileIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes pmBadge{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
        .pm-tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;text-align:left;box-sizing:border-box;min-height:88px;padding:11px 12px;border-radius:16px;overflow:hidden;animation:pmTileIn .45s cubic-bezier(.2,.8,.2,1) both;transition:transform .2s,box-shadow .2s,border-color .2s}
        .pm-tile:hover{transform:translateY(-3px);border-color:#38bdf8 !important;box-shadow:0 10px 26px rgba(37,99,235,.16)}
        .pm-tile:active{transform:scale(.98)}
        .pm-tile:after{content:"";position:absolute;right:-20px;bottom:-20px;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,.2),transparent 70%);pointer-events:none}
        .pm-tile .pm-ic{transition:transform .25s}
        .pm-tile:hover .pm-ic{transform:scale(1.12) rotate(-4deg)}
        .pm-tile-badge{position:absolute;top:8px;right:8px;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;animation:pmBadge 2.2s ease-in-out infinite}
        .pm-strip{display:flex;gap:8px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}
        .pm-strip::-webkit-scrollbar{display:none}
        @media (prefers-reduced-motion:reduce){.pm-tile,.pm-tile-badge{animation:none}}
      `}</style>
      <div className="flex items-baseline justify-between mb-2 px-0.5">
        <div className="text-[13px] font-bold uppercase" style={{ color: C.inkSoft, letterSpacing: "0.14em" }}>Módulos</div>
        <div className="text-[11px]" style={{ color: C.inkSoft }}>{cur.items.length} disponibles</div>
      </div>
      <div className="pm-strip" role="tablist" aria-label="Grupos de módulos">
        {list.map(g => {
          const on = g.id === cur.id;
          return (
            <button key={g.id} role="tab" aria-selected={on} onClick={() => pick(g.id)} className="shrink-0 text-[13px] font-semibold whitespace-nowrap"
              style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, background: on ? "linear-gradient(135deg,#38bdf8,#2563eb)" : C.panel, color: on ? "#04121f" : C.inkSoft, border: `1px solid ${on ? "transparent" : C.line}` }}>
              {g.label} · {g.items.length}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        {cur.items.map((n, i) => (
          <button key={n.id} onClick={() => onNavigate(n.id)} className="pm-tile" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink, animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
            {n.badge ? <span className="pm-tile-badge">{badgeText(n.badge)}</span> : null}
            <n.icon size={26} className="pm-ic" color={palette[i % palette.length]} strokeWidth={1.8} />
            <div className="text-sm font-bold leading-tight pr-1" style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}>{n.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ícono de línea para los títulos de las tarjetas (reemplaza los emojis, que se ven distintos en cada celular). */
export function TitleIco({ i: I, color }) {
  return <I size={15} strokeWidth={2} color={color || C.amber} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />;
}

/** Muestra solo los primeros avisos y esconde el resto detrás de "Ver N más", para que Inicio no sea una pila interminable. */
function AlertsStack({ max = 3, children }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setCount(el.children.length);
    upd();
    const mo = new MutationObserver(upd);
    mo.observe(el, { childList: true });
    return () => mo.disconnect();
  }, []);
  const extra = Math.max(0, count - max);
  return (
    <div>
      <style>{`.pm-alerts-2:not(.pm-open)>*:nth-child(n+3),.pm-alerts-3:not(.pm-open)>*:nth-child(n+4){display:none}`}</style>
      <div ref={ref} className={`pm-alerts-${max}${open ? " pm-open" : ""}`}>{children}</div>
      {extra > 0 && (
        <button onClick={() => setOpen(v => !v)} className="w-full text-xs font-semibold rounded-xl mb-4" style={{ minHeight: 40, background: C.panel, border: `1px solid ${C.line}`, color: C.amber }}>
          {open ? "Mostrar menos ▲" : `Ver ${extra} aviso${extra === 1 ? "" : "s"} más ▼`}
        </button>
      )}
    </div>
  );
}

/** Mensaje amable cuando una lista está vacía. */
function EmptyState({ icon: I = ClipboardList, title, hint }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="mx-auto mb-2 flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: C.blueSoft }}><I size={24} color={C.blue} strokeWidth={1.8} /></div>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>{title}</div>
      {hint && <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{hint}</div>}
    </div>
  );
}

function HomeInsights({ part, tasks, mttoLog, equipos, invItems, currentUser, isAdmin, nameOf, onNavigate, onOpenEquipo, onCreateTask, viewerLocked, loginLog, navGroups, extraAlerts }) {
  const style = (
    <style>{`
        @keyframes pmRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .pm-stagger > *{animation:pmRise .5s cubic-bezier(.2,.8,.2,1) both}
        .pm-stagger > *:nth-child(2){animation-delay:.05s}.pm-stagger > *:nth-child(3){animation-delay:.1s}.pm-stagger > *:nth-child(4){animation-delay:.15s}
        .pm-stagger > *:nth-child(5){animation-delay:.2s}.pm-stagger > *:nth-child(6){animation-delay:.25s}.pm-stagger > *:nth-child(n+7){animation-delay:.3s}
        @media (prefers-reduced-motion:reduce){.pm-stagger > *{animation:none}}
      `}</style>
  );
  if (part === "top") {
    return (
      <div className="pm-stagger">
        {style}
        {!viewerLocked && <EmergencyButton tasks={tasks} currentUser={currentUser} onCreateTask={onCreateTask} onNavigate={onNavigate} />}
        <GlobalSearchCard tasks={tasks} equipos={equipos} invItems={invItems} onNavigate={onNavigate} onOpenEquipo={onOpenEquipo} />
        <AlertsStack max={3}>
          {extraAlerts}
          {isAdmin && <ReincidentCard mttoLog={mttoLog} equipos={equipos} tasks={tasks} onOpenEquipo={onOpenEquipo} />}
          <StaleTasksCard tasks={tasks} currentUser={currentUser} isAdmin={isAdmin} nameOf={nameOf} onNavigate={onNavigate} />
          {isAdmin && <FailurePredictCard mttoLog={mttoLog} equipos={equipos} onOpenEquipo={onOpenEquipo} />}
          {isAdmin && <BackupReminderCard onNavigate={onNavigate} />}
          {isAdmin && <NewDeviceCard loginLog={loginLog} nameOf={nameOf} />}
        </AlertsStack>
      </div>
    );
  }
  return (
    <div className="pm-stagger">
      {style}
      <ModuleGroupsCard groups={navGroups} onNavigate={onNavigate} />
      <ShiftHandoverCard tasks={tasks} mttoLog={mttoLog} nameOf={nameOf} byName={nameOf(currentUser)} />
      {isAdmin && <MonthChartsCard tasks={tasks} mttoLog={mttoLog} equipos={equipos} />}
      {isAdmin && <YearCostCard mttoLog={mttoLog} equipos={equipos} onOpenEquipo={onOpenEquipo} />}
      {isAdmin && <MonthlyBudgetCard mttoLog={mttoLog} />}
      {isAdmin && <LowStockOrderCard invItems={invItems} />}
      <IdleLogoutSetting />
    </div>
  );
}

function ToolsView({ tools, accounts, isAdmin, onCreateTool, onLendTool, onReturnTool }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "", nota: "" });
  const [saving, setSaving] = useState(false);
  const [lendingId, setLendingId] = useState(null);
  const [lendTo, setLendTo] = useState("");
  const [search, setSearch] = useState("");
  const [qrToolId, setQrToolId] = useState(null);

  const doCreate = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onCreateTool(form);
    setForm({ nombre: "", categoria: "", nota: "" });
    setShowNew(false);
    setSaving(false);
  };

  const filtered = tools.filter(t => !search.trim() || normalizeSearchText(t.nombre).includes(normalizeSearchText(search.trim())));
  const prestadas = filtered.filter(t => t.estado === "prestada");
  const disponibles = filtered.filter(t => t.estado !== "prestada");

  const inputCls = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Herramientas</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Quién tiene prestado qué ahora mismo — para no perder herramientas caras.</p>
        </div>
        {isAdmin && <Button icon={PlusCircle} onClick={() => setShowNew(v => !v)}>{showNew ? "Cancelar" : "Nueva herramienta"}</Button>}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar herramienta…" className={`${inputCls} w-full mb-4`} style={inputStyle} />

      {showNew && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Multímetro Fluke)" className={inputCls} style={inputStyle} />
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Categoría (opcional)" className={inputCls} style={inputStyle} />
          </div>
          <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Nota (opcional, ej: número de serie)" className={`${inputCls} w-full mb-2`} style={inputStyle} />
          <Button size="sm" disabled={saving} onClick={doCreate}>{saving ? "Guardando…" : "Crear herramienta"}</Button>
        </div>
      )}

      {prestadas.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Prestadas ahora ({prestadas.length})</div>
          <div className="space-y-2 mb-4">
            {prestadas.map(t => (
              <div key={t.id} className="rounded-lg border p-3 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: C.amber, background: C.amberSoft }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={accounts?.[t.prestadaA]?.display_name || t.prestadaA} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: C.ink }}>{t.nombre}</div>
                    <div className="text-xs" style={{ color: C.amber }}>Con {accounts?.[t.prestadaA]?.display_name || t.prestadaA} · desde {fmtDT(t.prestadaDesde)}</div>
                    {isAdmin && <button onClick={() => setQrToolId(qrToolId === t.id ? null : t.id)} className="text-xs font-semibold underline" style={{ color: C.inkSoft, minHeight: 28 }}>{qrToolId === t.id ? "Ocultar QR" : "Ver QR"}</button>}
                    {qrToolId === t.id && <QrCodeBox url={toolUrl(t.id)} label={t.nombre} filename={`qr-herramienta-${t.nombre.replace(/[^a-z0-9]+/gi, "-")}.png`} />}
                  </div>
                </div>
                <Button size="sm" onClick={() => onReturnTool(t.id)}>Marcar devuelta</Button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Disponibles ({disponibles.length})</div>
      {disponibles.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>Nada disponible — o no hay coincidencias con la búsqueda.</p>
      ) : disponibles.map(t => (
        <div key={t.id} className="rounded-lg border p-3 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: C.ink }}>{t.nombre}</div>
            <div className="text-xs" style={{ color: C.gray }}>{t.categoria || "Sin categoría"}{t.nota ? ` · ${t.nota}` : ""}</div>
            {isAdmin && <button onClick={() => setQrToolId(qrToolId === t.id ? null : t.id)} className="text-xs font-semibold underline" style={{ color: C.inkSoft, minHeight: 28 }}>{qrToolId === t.id ? "Ocultar QR" : "Ver QR"}</button>}
            {qrToolId === t.id && <QrCodeBox url={toolUrl(t.id)} label={t.nombre} filename={`qr-herramienta-${t.nombre.replace(/[^a-z0-9]+/gi, "-")}.png`} />}
          </div>
          {lendingId === t.id ? (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={lendTo} onChange={e => setLendTo(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">¿A quién?</option>
                {Object.entries(accounts || {}).map(([uid, acc]) => <option key={uid} value={uid}>{acc.display_name || acc.email}</option>)}
              </select>
              <Button size="sm" disabled={!lendTo} onClick={() => { onLendTool(t.id, lendTo); setLendingId(null); setLendTo(""); }}>Confirmar</Button>
              <Button size="sm" variant="ghost" onClick={() => setLendingId(null)}>Cancelar</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setLendingId(t.id)}>Prestar</Button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Wiki interna — páginas de consulta rápida tipo "qué hacer si..." que no son maniobras técnicas
 * paso a paso (esas viven en Procedimientos), sino procedimientos generales: protocolo de
 * huracán, qué hacer si se va la luz, etc. Cualquiera puede leer; solo admin crea/edita.
 */
function WikiView({ pages, isAdmin, onSave, onDelete }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [form, setForm] = useState({ titulo: "", categoria: WIKI_CATEGORIAS[0], contenido: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const searchNorm = normalizeSearchText(search.trim());
  const filtered = pages.filter(p => !searchNorm || normalizeSearchText(`${p.titulo} ${p.contenido}`).includes(searchNorm));
  const selected = pages.find(p => p.id === selectedId);

  const inputCls = "text-sm border rounded-md px-3 py-2 outline-none w-full";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  const startEdit = (page) => {
    if (page) setForm({ titulo: page.titulo, categoria: page.categoria || WIKI_CATEGORIAS[0], contenido: page.contenido });
    else setForm({ titulo: "", categoria: WIKI_CATEGORIAS[0], contenido: "" });
    setEditing(page ? page.id : "new");
  };

  const doSave = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) return;
    setSaving(true);
    await onSave(form, editing === "new" ? null : editing);
    setSaving(false);
    setEditing(null);
  };

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.inkSoft }}>
          <ArrowLeft size={15} /> Cancelar
        </button>
        <h2 className="text-lg font-semibold mb-4" style={{ color: C.ink }}>{editing === "new" ? "Nueva página" : "Editar página"}</h2>
        <div className="space-y-3">
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título (ej: Qué hacer si se va la luz)" className={inputCls} style={inputStyle} />
          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputCls} style={inputStyle}>
            {WIKI_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={form.contenido} onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} rows={14}
            placeholder="Escribe el procedimiento paso a paso, con todo el detalle que necesite quien lo lea sin haberlo hecho antes…"
            className={`${inputCls} resize-y font-mono`} style={inputStyle} />
          <Button disabled={saving || !form.titulo.trim() || !form.contenido.trim()} onClick={doSave}>{saving ? "Guardando…" : "Guardar página"}</Button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.inkSoft }}>
          <ArrowLeft size={15} /> Todas las páginas
        </button>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{selected.titulo}</h2>
          {isAdmin && (
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => startEdit(selected)} className="text-xs font-semibold" style={{ color: C.amber }}>Editar</button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs font-semibold" style={{ color: C.red }}>Borrar</button>
            </div>
          )}
        </div>
        <Badge tone="blue">{selected.categoria || "General"}</Badge>
        <div className="text-sm mt-4 whitespace-pre-wrap" style={{ color: C.ink, lineHeight: 1.6 }}>{selected.contenido}</div>
        <div className="text-xs mt-6 pt-3 border-t" style={{ color: C.gray, borderColor: C.line }}>
          Última edición: {fmtDT(selected.updatedAt)} · {selected.updatedBy}
        </div>
        <ConfirmDialog open={confirmDelete} title="Borrar página de la wiki"
          message="¿Seguro que quieres borrar esta página? No se puede deshacer."
          onConfirm={() => { onDelete(selected.id); setSelectedId(null); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Wiki interna</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Procedimientos generales de consulta — protocolo de emergencias, qué hacer si..., etc.</p>
        </div>
        {isAdmin && <Button icon={PlusCircle} onClick={() => startEdit(null)}>Nueva página</Button>}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en la wiki…" className={`${inputCls} mb-4`} style={inputStyle} />
      {filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          {pages.length === 0 ? "Todavía no hay páginas en la wiki." : `No encontré nada para "${search.trim()}".`}
        </p>
      ) : filtered.map(p => (
        <button key={p.id} onClick={() => setSelectedId(p.id)} className="w-full text-left rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>{p.titulo}</div>
          <div className="text-xs mt-1" style={{ color: C.inkSoft, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.contenido}</div>
          <Badge tone="blue">{p.categoria || "General"}</Badge>
        </button>
      ))}
    </div>
  );
}

/**
 * Procedimientos — un solo lugar con dos formas de llegar a "qué hacer": preguntarle a la IA
 * (Copiloto), o tocar el componente directo en el plano interactivo del sistema.
 */
function ProcedimientosHubView(props) {
  const [tab, setTab] = useState(() => (props.pendingDiagramId ? "diagramas" : "copiloto"));
  useEffect(() => { if (props.pendingDiagramId) setTab("diagramas"); }, [props.pendingDiagramId]);

  return (
    <div>
      <div className="flex rounded-md border overflow-hidden text-xs mb-4 w-fit" style={{ borderColor: C.line }}>
        <button onClick={() => setTab("copiloto")} className="px-3 font-semibold flex items-center gap-1.5" style={{ background: tab === "copiloto" ? C.steelDark : C.panel, color: tab === "copiloto" ? "#fff" : C.inkSoft, minHeight: 36 }}>
          <Sparkles size={13} /> Copiloto IA
        </button>
        <button onClick={() => setTab("diagramas")} className="px-3 font-semibold flex items-center gap-1.5" style={{ background: tab === "diagramas" ? C.steelDark : C.panel, color: tab === "diagramas" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>
          <Layers size={13} /> Diagramas interactivos
        </button>
      </div>

      {tab === "copiloto" ? (
        <ProcedureCopilotView equipos={props.equipos} mttoLog={props.mttoLog} />
      ) : (
        <DiagramsView diagrams={props.diagrams} procedures={props.procedures} isAdmin={props.isAdmin}
          initialDiagramId={props.pendingDiagramId} onConsumedInitialDiagram={props.onConsumedInitialDiagram}
          onCreateDiagram={props.onCreateDiagram} onDeleteDiagram={props.onDeleteDiagram}
          onCreateProcedure={props.onCreateProcedure} onDeleteProcedure={props.onDeleteProcedure}
          onSetComponentPosition={props.onSetComponentPosition} />
      )}
    </div>
  );
}

function ProcedureCopilotView({ equipos, mttoLog }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const activeEquipos = equipos.filter(e => e.active !== false);
  const matches = search.trim() && !selectedId
    ? activeEquipos.filter(e => normalizeSearchText(e.nombre).includes(normalizeSearchText(search.trim()))).slice(0, 8)
    : [];
  const selected = activeEquipos.find(e => e.id === selectedId);

  const doGenerate = async () => {
    if (!selected || !task.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const historial = mttoLog.filter(r => r.equipoId === selected.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8)
        .map(r => `${r.tipo === "preventivo" ? "Preventivo" : "Correctivo"} (${fmtDT(r.fecha)}): ${r.descripcion || "sin descripción"}`);
      const res = await requestProcedure({ equipoNombre: selected.nombre, sistema: selected.sistema, tarea: task.trim(), historial });
      if (res.procedure) { setResult(res.procedure); bumpAiUsage("procedureRequests"); }
      else setError(res.message || "No se pudo generar el procedimiento.");
    } catch (err) {
      console.error("ProcedureCopilot doGenerate error:", err);
      const isRawNetworkError = /load failed|failed to fetch|networkerror/i.test(err.message || "");
      setError(isRawNetworkError ? "Red inestable — intenta de nuevo en un momento." : `No me pude conectar (${err.message || "error de conexión"}). Revisa tu conexión e intenta de nuevo.`);
    }
    setLoading(false);
  };

  const inputCls = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const inputStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Procedimientos</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Describe qué necesitas hacer con un equipo, y la IA arma un procedimiento paso a paso — apoyándose en el historial real de ese equipo.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Equipo</div>
        <div className="relative mb-2">
          {selected ? (
            <div className="flex items-center justify-between text-sm border rounded-md px-2 py-1.5" style={{ borderColor: C.line, background: C.bg, color: C.ink }}>
              <span>{selected.nombre} <span style={{ color: C.gray }}>· {selected.sistema}</span></span>
              <button onClick={() => { setSelectedId(""); setSearch(""); }} className="text-xs font-semibold" style={{ color: C.amber }}>Cambiar</button>
            </div>
          ) : (
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo…" className={`${inputCls} w-full`} style={inputStyle} />
          )}
          {matches.length > 0 && (
            <div className="rounded-md border mt-1 overflow-hidden" style={{ borderColor: C.line }}>
              {matches.map(eq => (
                <button key={eq.id} onClick={() => { setSelectedId(eq.id); setSearch(""); }}
                  className="block w-full text-left text-xs px-2 py-1.5" style={{ color: C.ink, background: C.panel }}>
                  {eq.nombre} <span style={{ color: C.gray }}>· {eq.sistema}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-xs font-medium mb-1" style={{ color: C.inkSoft }}>¿Qué necesitas hacer?</div>
        <textarea value={task} onChange={e => setTask(e.target.value)} rows={2} placeholder="Ej: destapar la válvula de drenaje, cambiar el filtro, revisar por qué hace ruido…"
          className={`${inputCls} w-full resize-y mb-2`} style={inputStyle} />
        <Button icon={Sparkles} disabled={!selected || !task.trim() || loading} onClick={doGenerate}>
          {loading ? "Generando…" : "Generar procedimiento"}
        </Button>
        {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}
      </div>

      {result && (
        <div className="rounded-lg border p-4" style={{ borderColor: C.blue, background: C.blueSoft }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: C.blue }}>
            <Sparkles size={13} /> Procedimiento sugerido — {selected?.nombre}
          </div>
          <div className="text-sm whitespace-pre-wrap" style={{ color: C.ink, lineHeight: 1.6 }}>{result}</div>
          <div className="text-xs mt-3" style={{ color: C.gray }}>Generado por IA a partir del historial de este equipo — revísalo con criterio antes de aplicarlo.</div>
        </div>
      )}
    </div>
  );
}


function PrintableReport({ activeIssues, issueHistory, roundsIndex, onClose }) {
  useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);
  const active = Object.values(activeIssues);
  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#111", padding: 32, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button icon={Save} onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
        <Button variant="ghost" icon={X} onClick={onClose}>Cerrar</Button>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Informe de Equipos — QuinTech</h1>
      <p style={{ fontSize: 12, color: "#555" }}>Generado: {fmtDT(nowIso())}</p>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Equipos fuera de servicio actualmente ({active.length})</h2>
      {active.length === 0 && <p style={{ fontSize: 12 }}>Ninguno. Todo en orden.</p>}
      {active.map((iss, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          <b>[{iss.floorName}] #{iss.code} {iss.name}</b> — reportado por {iss.openedBy} el {fmtDT(iss.openedAt)} ({elapsed(iss.openedAt)} fuera de servicio)<br />
          <i>Obs: {iss.observation}</i>
        </div>
      ))}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Últimos incidentes resueltos</h2>
      {issueHistory.length === 0 && <p style={{ fontSize: 12 }}>Sin registros.</p>}
      {issueHistory.slice(0, 20).map((h, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          <b>[{h.floorName}] #{h.code} {h.name}</b><br />
          Dañado: {fmtDT(h.openedAt)} · Resuelto: {fmtDT(h.resolvedAt)} por {h.resolvedBy} · Duración: {h.duration}<br />
          <i>Solución: {h.solution}</i>
        </div>
      ))}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Últimas rondas registradas</h2>
      {roundsIndex.length === 0 && <p style={{ fontSize: 12 }}>Sin registros.</p>}
      {roundsIndex.slice(0, 20).map((r, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          {r.floorName} · {fmtDT(r.savedAt)} · Turno {r.shift} · {r.user} · {r.itemCount} equipos registrados{r.damagedCount ? `, ${r.damagedCount} dañados` : ""}
        </div>
      ))}
    </div>
  );
}

function RoundCompletionView({ roundsIndex, tourHistory }) {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const summary = useMemo(() => computeRoundCompletionSummary(roundsIndex, tourHistory, FLOORS.length), [roundsIndex, tourHistory]);
  const filtered = onlyIncomplete ? summary.filter(s => !s.completed) : summary;
  const incompleteCount = summary.filter(s => !s.completed).length;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Recorridos completados</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Compara los pisos que se fueron guardando contra los recorridos que sí se cerraron completos (los {FLOORS.length} pisos).
      </p>

      {incompleteCount > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.redSoft, color: C.red }}>
          ⚠ Hay {incompleteCount} recorrido(s) que se empezaron pero no se terminaron completos.
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-medium mb-3 cursor-pointer select-none" style={{ color: C.inkSoft }}>
        <input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} />
        Mostrar solo los incompletos
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>
          {onlyIncomplete ? "No hay recorridos incompletos — todo bien." : "Todavía no hay recorridos registrados."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 flex-wrap"
              style={{ background: s.completed ? C.panel : C.redSoft, border: `1px solid ${s.completed ? C.line : "#e0a0b0"}` }}>
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>{s.user} · {s.date} · Turno {s.shift}</div>
                <div className="text-xs" style={{ color: C.gray }}>Último guardado: {fmtDT(s.lastSavedAt)}</div>
              </div>
              <div className="text-right">
                {s.completed ? (
                  <Pill tone="green"><CheckCircle2 size={12} /> Completo</Pill>
                ) : (
                  <Pill tone="red"><AlertTriangle size={12} /> {s.floorsDone} de {s.totalFloors} pisos</Pill>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneralHistoryView({ entries }) {
  const [filter, setFilter] = useState("all"); // all | empleado | inventario | tarea
  const filtered = filter === "all" ? entries : entries.filter(e => e.kind === filter);

  // Antes se renderizaban hasta 300 filas de golpe en cuanto se entraba a esta pantalla o se
  // cambiaba el filtro — en un celular de gama media/baja eso se siente con tirones al abrir o
  // al hacer scroll. Ahora se cargan de a 40, y se piden más solas cuando el centinela invisible
  // al final entra en pantalla (mismo patrón que ya se usa en Historial de mantenimientos).
  const [visibleCount, setVisibleCount] = useState(40);
  useEffect(() => { setVisibleCount(40); }, [filter]);
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (visibleCount >= Math.min(filtered.length, 300)) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((ents) => {
      if (ents[0].isIntersecting) setVisibleCount(v => v + 40);
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Historial de cambios</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Registro de auditoría: quién hizo qué, desde qué dispositivo y cuándo — en empleados, inventario y tareas. Más reciente primero.
      </p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[["all", "Todo"], ["empleado", "Empleados"], ["inventario", "Inventario"], ["tarea", "Tareas"], ["combustible", "Combustible"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className="text-xs px-2.5 py-1 rounded-full border"
            style={{ borderColor: filter === id ? C.amber : C.line, background: filter === id ? C.amberSoft : C.panel, color: filter === id ? "#7a5405" : C.inkSoft }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>No hay cambios registrados todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.slice(0, 300).slice(0, visibleCount).map(e => {
            const action = e.action || "edicion";
            const actionColor = AUDIT_ACTION_COLORS[action];
            const kindColor = AUDIT_KIND_COLORS[e.kind];
            return (
              <div key={e.id} className="text-xs rounded-md px-2 py-1.5" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink }}>
                <span className="mr-1.5 text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: actionColor.bg, color: actionColor.fg }}>
                  {AUDIT_ACTION_LABELS[action]}
                </span>
                <span className="mr-1.5 text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: kindColor.bg, color: kindColor.fg }}>
                  {AUDIT_KIND_LABELS[e.kind] || e.kind}
                </span>
                <b>{e.by}</b>{" "}
                {action === "creacion" && <>creó <b>{e.entityLabel}</b></>}
                {action === "eliminacion" && <>eliminó <b>{e.entityLabel}</b></>}
                {action === "edicion" && (
                  <>cambió <span style={{ color: C.inkSoft }}>{e.field}</span> de <b>{e.entityLabel}</b>:{" "}
                    <span style={{ color: C.gray }}>{e.before}</span> → <span style={{ color: C.amber, fontWeight: 600 }}>{e.after}</span></>
                )}
                <div className="mt-0.5" style={{ color: C.gray }}>
                  {e.device || "Dispositivo desconocido"} · {fmtDT(e.at)}
                </div>
              </div>
            );
          })}
          {visibleCount < Math.min(filtered.length, 300) && <div ref={sentinelRef} style={{ height: 1 }} />}
        </div>
      )}
    </div>
  );
}

function ChangelogView({ entries, isAdmin, currentUser, onAddEntry, onDeleteEntry }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const doAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onAddEntry({ title: title.trim(), description: description.trim() });
    setTitle(""); setDescription(""); setShowForm(false);
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Novedades</h2>
        {isAdmin && <Button size="sm" variant="ghost" icon={PlusCircle} onClick={() => setShowForm(v => !v)}>Agregar</Button>}
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Qué ha ido cambiando en la app, más reciente primero.</p>

      {showForm && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ej: Horario Mensual con IA)"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="¿Qué cambió, en pocas palabras?"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!title.trim() || saving} onClick={doAdd}>{saving ? "Guardando…" : "Publicar"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.map(e => (
          <div key={e.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{e.title}</div>
              {isAdmin && <button onClick={() => onDeleteEntry(e.id)} aria-label="Eliminar" className="flex items-center justify-center" style={{ minWidth: 40, minHeight: 40 }}><X size={14} color={C.gray} /></button>}
            </div>
            {e.description && <p className="text-sm mt-1" style={{ color: C.inkSoft }}>{e.description}</p>}
            <div className="text-xs mt-2" style={{ color: C.gray }}>{fmtDT(e.at)} {e.by ? `· ${e.by}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Vista simple, pensada para celular, de los turnos de UN SOLO empleado (el que se enlazó en
 * Mi Perfil) — en vez de tener que buscarse en la tabla grande de todo el equipo. Muestra el mes
 * en tarjetas, una por día trabajado, con navegación de mes.
 */
function MyScheduleView({ employee, scheduleEntries, onGoToProfile }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  if (!employee) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi horario</h2>
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Todavía no te has seleccionado en el Horario Mensual.{" "}
          <button onClick={onGoToProfile} className="underline font-medium" style={{ color: C.amber }}>Ve a Mi Perfil</button> y elige cuál eres tú en la lista.
        </p>
      </div>
    );
  }

  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const daysIso = daysInMonthIso(year, month);
  const monthLabel = monthDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const weeks = weeksInRange(daysIso);
  const entries = {};
  daysIso.forEach(d => { const e = scheduleEntries[scheduleKey(employee.id, d)]; if (e) entries[d] = e; });
  const monthTotal = weeks.reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
  const comp = employee.reductionHoursPerDay > 0 ? computeCompBalance(employee, scheduleEntries) : null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi horario — {employee.name}</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{employee.cargo || "—"}</p>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthDate(new Date(year, month - 1, 1))} aria-label="Mes anterior" title="Mes anterior" className="p-1.5 rounded-md border" style={{ borderColor: C.line }}><ChevronLeft size={16} color={C.ink} /></button>
        <span className="text-sm font-semibold capitalize" style={{ color: C.ink }}>{monthLabel}</span>
        <button onClick={() => setMonthDate(new Date(year, month + 1, 1))} aria-label="Mes siguiente" title="Mes siguiente" className="p-1.5 rounded-md border" style={{ borderColor: C.line }}><ChevronRight size={16} color={C.ink} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs" style={{ color: C.gray }}>Horas del mes</div>
          <div className="text-lg font-semibold" style={{ color: C.ink }}>{monthTotal}h</div>
        </div>
        {comp && (
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: comp.fullDays >= 1 ? C.amber : C.line, background: comp.fullDays >= 1 ? C.amberSoft : C.panel }}>
            <div className="text-xs" style={{ color: C.gray }}>Reducción acumulada</div>
            <div className="text-lg font-semibold" style={{ color: comp.fullDays >= 1 ? C.amber : C.ink }}>
              {comp.fullDays >= 1 ? `¡${comp.fullDays} día(s)!` : `${comp.hours}h`}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {daysIso.map(d => {
          const dd = new Date(d + "T00:00:00");
          const entry = entries[d];
          const colors = entry?.code ? getSpecialCodeColors()[entry.code] : null;
          const label = SPECIAL_CODES.find(s => s.code === entry?.code)?.label;
          return (
            <div key={d} className="rounded-lg border px-3 py-2 flex items-center justify-between"
              style={{ borderColor: C.line, background: colors?.bg || (isSundayOrHoliday(d) ? C.redSoft : C.panel) }}>
              <div>
                <div className="text-sm font-medium capitalize" style={{ color: C.ink }}>
                  {dd.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                  {isSundayOrHoliday(d) && <span className="ml-1 text-xs" style={{ color: C.red }}>· dom/fest</span>}
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: colors?.fg || (entry ? C.ink : C.gray) }}>
                {entry ? (entry.code ? (label || entry.code) : fmtEntryShort(entry)) : "Libre"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function TrashView({ trash, onRestore, onPurge }) {
  const sorted = [...trash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Papelera</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Lo que se ha borrado queda aquí, por si fue un error — puedes restaurarlo o eliminarlo para siempre.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>La papelera está vacía.</p>
      ) : sorted.map(t => (
        <div key={t.id} className="rounded-lg border p-3 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div>
            <div className="text-sm font-medium" style={{ color: C.ink }}>{t.label}</div>
            <div className="text-xs" style={{ color: C.gray }}>
              {TRASH_TYPE_LABELS[t.tipo] || t.tipo} · Borrado por {t.deletedBy} · {fmtDT(t.deletedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onRestore(t.id)}>Restaurar</Button>
            <Button size="sm" variant="red" onClick={() => onPurge(t.id)}>Eliminar definitivamente</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [profiles, setProfiles] = useState({}); // { [id de Supabase Auth]: { display_name, is_admin, is_almacenista, is_gerencia, approved, created_at, email } }
  const [currentUser, setCurrentUser] = useState(null); // id de Supabase Auth (uuid), o null
  const [authReady, setAuthReady] = useState(false); // true una vez ya se revisó si había sesión guardada
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Qué categorías del menú lateral se dejaron abiertas a mano (ver NAV_GROUPS más abajo). Este
  // hook TIENE que estar aquí arriba, antes de cualquier "return" condicional del componente —
  // si un hook se ejecuta unas veces sí y otras no (según si ya cargó, si hay sesión, etc.),
  // React se confunde sobre cuántos hooks hay y la app se cae con un error críptico.
  const [manuallyToggled, setManuallyToggled] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pm-local:nav-groups-open") || "{}"); } catch { return {}; }
  });
  const [reportEmail, setReportEmail] = useState("");
  const [reportWhatsapp, setReportWhatsapp] = useState("");
  const [sentReports, setSentReports] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [shift, setShift] = useState(SHIFTS[0]);
  const [view, setViewRaw] = useState(() => localStorage.getItem("pm-local:last-view") || "ronda");
  const setView = useCallback((v) => {
    setViewRaw(v);
    try { localStorage.setItem("pm-local:last-view", v); } catch { /* noop */ }
  }, []);
  // El botón/gesto de "atrás" del celular ahora regresa a Inicio en vez de salir de la app (o no
  // hacer nada) cuando se está en cualquier otra sección — ver useBackClose más abajo para el
  // porqué. Cambiar de una sección a otra sin pasar por Inicio no apila más "atrases": basta un
  // solo toque de atrás para volver a Inicio desde donde sea.
  useBackClose(view !== "home", () => setView("home"));
  useEffect(() => {
    const h = (e) => { if (e?.detail) setView(e.detail); };
    window.addEventListener("pm-go-view", h);
    return () => window.removeEventListener("pm-go-view", h);
  }, [setView]);
  const [nowClock, setNowClock] = useState(() => new Date());
  // Detecta cuándo hay una versión nueva de la app lista para usar (así no hace falta borrar
  // e instalar de nuevo cada vez que se sube una actualización) — revisa cada 30 min mientras
  // está abierta, y también apenas se vuelve a abrir el celular con la app en la pantalla.
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(() => { registration.update().catch(() => {}); }, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    },
  });

  const [themeOverride, setThemeOverride] = useState(() => { try { return localStorage.getItem("pm-local:theme"); } catch { return null; } }); // "dark" | "light" | null = automático
  const [darkMode, setDarkMode] = useState(() => themeOverride === "dark" ? true : themeOverride === "light" ? false : isNightHour());
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("pm-local:onboarded"); } catch { return false; } });
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannedEquipoId, setScannedEquipoId] = useState(null);
  const [scannedToolId, setScannedToolId] = useState(() => new URLSearchParams(window.location.search).get("tool"));
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [undoToast, setUndoToast] = useState(null); // { label, trashId } | null
  const undoTimerRef = useRef(null);
  const offerUndo = (label, trashId) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ label, trashId });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 10000);
  };
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  useBackCloseModal(showProfileMenu, () => setShowProfileMenu(false));
  const closeOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("pm-local:onboarded", "1"); } catch { /* noop */ }
  };
  const toggleTheme = () => {
    const next = !darkMode;
    applyTheme(next); // muta el objeto C compartido ANTES de redibujar, para que no haya parpadeo
    setDarkMode(next);
    setThemeOverride(next ? "dark" : "light"); // a partir de aquí ya no sigue la hora sola — quedó fijo
    try { localStorage.setItem("pm-local:theme", next ? "dark" : "light"); } catch { /* noop */ }
  };
  // Letra grande — escala TODO el texto de la app de una sola vez, cambiando el tamaño base del
  // documento (los tamaños de Tailwind son relativos a eso), sin tener que tocar cada componente.
  const [largeText, setLargeText] = useState(() => { try { return localStorage.getItem("pm-local:large-text") === "1"; } catch { return false; } });
  useEffect(() => {
    document.documentElement.style.fontSize = largeText ? "118%" : "";
  }, [largeText]);
  const toggleLargeText = () => {
    setLargeText(v => {
      const next = !v;
      try { localStorage.setItem("pm-local:large-text", next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  };
  // Mientras nadie haya fijado el modo a mano, revisa la hora cada vez que el reloj de la app se
  // refresca (cada 30s) y cambia solo de claro a oscuro al anochecer, y de vuelta al amanecer.
  useEffect(() => {
    if (themeOverride) return;
    const shouldBeDark = isNightHour(nowClock);
    if (shouldBeDark !== darkMode) { applyTheme(shouldBeDark); setDarkMode(shouldBeDark); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowClock, themeOverride]);
  useEffect(() => {
    const id = setInterval(() => setNowClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const [pendingSync, setPendingSync] = useState(() => getPendingCount());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  const [justSynced, setJustSynced] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastSyncError, setLastSyncError] = useState(null);
  const [showSyncDetail, setShowSyncDetail] = useState(false);
  const tryFlush = useCallback(async () => {
    const res = await flushOfflineQueue();
    const remaining = getPendingCount();
    setPendingSync(remaining);
    setLastSyncError(res.lastError || null);
    if (res.synced > 0 && remaining === 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
    return res;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await tryFlush(); };
    run(); // por si quedó algo pendiente de una sesión anterior sin señal
    window.addEventListener("online", run);
    const onQueueChanged = () => setPendingSync(getPendingCount());
    window.addEventListener("pm-queue-changed", onQueueChanged);
    const id = setInterval(run, 20000); // reintento silencioso, por si "online" no se dispara bien
    return () => { cancelled = true; window.removeEventListener("online", run); window.removeEventListener("pm-queue-changed", onQueueChanged); clearInterval(id); };
  }, [tryFlush]);

  const [floorId, setFloorIdRaw] = useState(() => {
    try {
      const saved = localStorage.getItem("pm-local:last-floor");
      return saved && FLOORS.some(f => f.id === saved) ? saved : FLOORS[0].id;
    } catch { return FLOORS[0].id; }
  });
  const setFloorId = useCallback((id) => {
    setFloorIdRaw(id);
    try { localStorage.setItem("pm-local:last-floor", id); } catch { /* noop */ }
  }, []);
  const [activeIssues, setActiveIssues] = useState({});
  const [issueHistory, setIssueHistory] = useState([]);
  const [roundsIndex, setRoundsIndex] = useState([]);
  const [latestValues, setLatestValues] = useState({});
  const [tankHistory, setTankHistory] = useState({});
  const [fuelHistory, setFuelHistory] = useState({});
  const [tools, setTools] = useState([]);
  const [contractorVisits, setContractorVisits] = useState([]);
  const [wikiPages, setWikiPages] = useState([]);
  const [mttoRequiredFields, setMttoRequiredFields] = useState({ foto: false, costo: false, repuestos: false });
  const [roomTypes, setRoomTypes] = useState([]);
  const [systemDiagrams, setSystemDiagrams] = useState([]);
  const [systemProcedures, setSystemProcedures] = useState([]);
  const [roomBlocks, setRoomBlocks] = useState([]);
  const [latestColdValues, setLatestColdValues] = useState({});
  const [coldRoundsIndex, setColdRoundsIndex] = useState([]);
  const [lastColdRound, setLastColdRound] = useState(null);
  const [coldHistory, setColdHistory] = useState({});
  const [latestMeterValues, setLatestMeterValues] = useState({});
  const [meterHistory, setMeterHistory] = useState({});
  const [meterRoundsIndex, setMeterRoundsIndex] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [invMovements, setInvMovements] = useState([]);
  const [pendingShelfId, setPendingShelfId] = useState(() => new URLSearchParams(window.location.search).get("shelf"));
  const [pendingEquipoId, setPendingEquipoId] = useState(() => new URLSearchParams(window.location.search).get("equipo"));
  const [pendingDiagramId, setPendingDiagramId] = useState(() => new URLSearchParams(window.location.search).get("diagram"));
  const [mttoEquipos, setMttoEquipos] = useState([]);
  const [latestLavanderiaValues, setLatestLavanderiaValues] = useState({});
  const [lavanderiaRoundsIndex, setLavanderiaRoundsIndex] = useState([]);
  const [latestGymValues, setLatestGymValues] = useState({});
  const [gymRoundsIndex, setGymRoundsIndex] = useState([]);
  const [calderaRoundsIndex, setCalderaRoundsIndex] = useState([]);
  const [lastCalderaRound, setLastCalderaRound] = useState(null);
  const [pushSubscriptions, setPushSubscriptions] = useState([]);
  const [tasks, setTasks] = useState([]);

  // ---- Cola de registros con fotos pendientes (ej. mantenimientos guardados sin señal) ----
  // NOTA: este bloque tiene que ir DESPUÉS de "const [tasks, ...]" de arriba — el arreglo de
  // dependencias de tryFlushPhotos usa "tasks", y en JS un "const" no se puede leer (ni en su
  // propio arreglo de dependencias) antes de la línea donde se declara en el mismo render.
  const [pendingPhotoRecords, setPendingPhotoRecords] = useState(() => getPendingPhotoRecordsCount());
  const [pendingPhotoQueue, setPendingPhotoQueue] = useState(() => getPendingPhotoQueue());
  const [justSyncedPhotos, setJustSyncedPhotos] = useState(false);
  const tryFlushPhotos = useCallback(async () => {
    const res = await flushPhotoRecordQueue({
      maintenance: async (payload, urls) => { await logMaintenance(payload.equipoId, { ...payload, fotos: urls }); },
      // Antes no había manejador para "task-close": al volver la señal, la cola subía las fotos
      // pero como flushPhotoRecordQueue solo llama al handler "if (handler)" y sigue contando el
      // ítem como sincronizado aunque no exista, el cierre de la tarea (estado, nota, testigo)
      // se perdía en silencio — la tarea quedaba abierta para siempre aunque las fotos sí se subieran.
      "task-close": async (payload, urls) => {
        const t = tasks.find(x => x.id === payload.taskId);
        await updateTask(payload.taskId, {
          estado: "finalizada", finishedAt: nowIso(), fotosDespues: urls, notaCierre: payload.notaCierre,
          testigoCierre: payload.testigoCierre,
          timeLog: [...((t && t.timeLog) || []), { estado: "finalizada", at: nowIso() }],
        });
        if (t && t.equipoId) {
          await logMaintenance(t.equipoId, {
            tipo: t.origen === "cronograma" ? "preventivo" : "correctivo",
            descripcion: `${t.titulo}${payload.notaCierre ? " — " + payload.notaCierre : ""}`,
            fotos: urls,
          });
        }
      },
    });
    const remaining = getPendingPhotoRecordsCount();
    setPendingPhotoRecords(remaining);
    setPendingPhotoQueue(getPendingPhotoQueue());
    if (res.synced > 0 && remaining === 0) {
      setJustSyncedPhotos(true);
      setTimeout(() => setJustSyncedPhotos(false), 4000);
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await tryFlushPhotos(); };
    run(); // por si quedó algo pendiente de una sesión anterior sin señal
    window.addEventListener("online", run);
    const onPhotoQueueChanged = () => { setPendingPhotoRecords(getPendingPhotoRecordsCount()); setPendingPhotoQueue(getPendingPhotoQueue()); };
    window.addEventListener("pm-photo-queue-changed", onPhotoQueueChanged);
    const id = setInterval(run, 20000);
    return () => { cancelled = true; window.removeEventListener("online", run); window.removeEventListener("pm-photo-queue-changed", onPhotoQueueChanged); clearInterval(id); };
  }, [tryFlushPhotos]);
  const pendingTaskCloseIds = useMemo(() => new Set(pendingPhotoQueue.filter(q => q.kind === "task-close" && q.payload && q.payload.taskId != null).map(q => q.payload.taskId)), [pendingPhotoQueue]);
  const pendingMaintenanceEquipoIds = useMemo(() => new Set(pendingPhotoQueue.filter(q => q.kind === "maintenance" && q.payload && q.payload.equipoId != null).map(q => q.payload.equipoId)), [pendingPhotoQueue]);

  const [trash, setTrash] = useState([]);
  const [loginLog, setLoginLog] = useState([]);
  const myLoginHistory = useMemo(() => (loginLog || []).filter(l => l.userId === currentUser), [loginLog, currentUser]);
  const [mttoLog, setMttoLog] = useState([]);
  const [mttoCronograma, setMttoCronograma] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState({});
  const [scheduleEditLog, setScheduleEditLog] = useState([]);
  const [generalEditLog, setGeneralEditLog] = useState([]);
  const [changelogEntries, setChangelogEntries] = useState([]);
  const [aiUsageStats, setAiUsageStats] = useState(null);
  // Se carga cada vez que se entra al Panel de administrador (no en el arranque general) porque
  // bumpAiUsage escribe directo a la base de datos por fuera del estado de React — así siempre se
  // ve el número más reciente al abrir el panel, sin tener que refrescar toda la app.
  useEffect(() => {
    if (view !== "admin") return;
    (async () => { try { setAiUsageStats((await sGet("ai-usage-stats", true)) || {}); } catch { /* noop */ } })();
  }, [view]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // El menú lateral en celular/tablet no tenía fondo oscuro ni se cerraba con "atrás" — quedaba
  // abierto sobre el contenido sin que se notara bien, dando la sensación de que "no pasa nada".
  useBackCloseModal(sidebarOpen, () => setSidebarOpen(false));
  const [confirmUpdateApp, setConfirmUpdateApp] = useState(false);
  const [lastTour, setLastTour] = useState(null);
  const [tourHistory, setTourHistory] = useState([]);
  const [justFinished, setJustFinished] = useState(false);
  const [roundSaveMsg, setRoundSaveMsg] = useState(null); // aviso si intentan "cerrar" el recorrido sin haber pasado por todos los pisos
  const [autoSendResult, setAutoSendResult] = useState(null);
  const tourBufferRef = useRef({}); // acumula lo guardado piso por piso durante el recorrido en curso
  // Van de la mano con tourBufferRef, pero SÍ disparan un re-render (un useRef solo no lo hace) —
  // para poder mostrar en pantalla "X de 11 pisos" y el aviso de "recorrido en curso, sigues donde ibas".
  const [tourProgressCount, setTourProgressCount] = useState(0);
  const [resumedTour, setResumedTour] = useState(false);

  // Si el recorrido se interrumpió a mitad de camino (se cerró la sesión sola, se cambió de
  // celular a mitad de turno, etc.), esto lo recupera — guardado en la nube (no solo en este
  // celular), así que se puede seguir el MISMO recorrido desde cualquier otro dispositivo.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await sGet(`tour-buffer-${currentUser}`, true);
        if (cancelled || !saved) return;
        if (saved.date === todayStr() && saved.shift === shift) {
          tourBufferRef.current = saved.buffer || {};
          const count = Object.keys(tourBufferRef.current).length;
          setTourProgressCount(count);
          setResumedTour(count > 0);
        }
      } catch { /* sin conexión: se sigue como si no hubiera nada guardado, no es grave */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser, shift]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ai, ih, ri, lv, th, email, sr, wa, lt, thist, lcv, cri, lmv, mh, mri, lcr, ch, bod, shv, iit, imv, emp, sch, mte, mtl, mtc, llv, lri, lgv, gri, cari, lcar, psub, tsk, trs, llog, schLog, chgl, gel, fh, tls, rtp, rbk, sd, sp, cvis, wiki, mrf] = await Promise.all([
        sGet("active-issues", true),
        sGet("issue-history", true), sGet("rounds-index", true), sGet("latest-values", true),
        sGet("tank-history", true), sGet("report-email", true), sGet("sent-reports", true),
        sGet("report-whatsapp", true), sGet("last-tour", true), sGet("tour-history", true),
        sGet("latest-cold-values", true), sGet("cold-rounds-index", true),
        sGet("latest-meter-values", true), sGet("meter-history", true), sGet("meter-rounds-index", true),
        sGet("last-cold-round", true), sGet("cold-history", true),
        sGet("inventory-bodegas", true), sGet("inventory-shelves", true),
        sGet("inventory-items", true), sGet("inventory-movements", true),
        sGet("employees", true), sGet("schedule-entries", true),
        sGet("mtto-equipos", true), sGet("mtto-log", true), sGet("mtto-cronograma", true),
        sGet("latest-lavanderia-values", true), sGet("lavanderia-rounds-index", true),
        sGet("latest-gym-values", true), sGet("gym-rounds-index", true),
        sGet("caldera-rounds-index", true), sGet("last-caldera-round", true),
        sGet("push-subscriptions", true),
        sGet("tasks", true),
        sGet("trash", true),
        sGet("login-log", true),
        sGet("schedule-edit-log", true),
        sGet("changelog", true),
        sGet("general-edit-log", true),
        sGet("fuel-history", true),
        sGet("tools", true),
        sGet("room-types", true),
        sGet("room-blocks", true),
        sGet("system-diagrams", true),
        sGet("system-procedures", true),
        sGet("contractor-visits", true),
        sGet("wiki-pages", true),
        sGet("mtto-required-fields", true),
      ]);
      setActiveIssues(ai || {});
      setIssueHistory(ih || []);
      setRoundsIndex(ri || []);
      setLatestValues(lv || {});
      setTankHistory(th || {});
      // Si NUNCA se ha guardado un correo de reportes (no existe el registro todavía), se usa uno
      // por defecto en vez de dejarlo vacío — así los recorridos/reportes automáticos no se quedan
      // sin destinatario solo porque nadie entró al Panel de administrador desde el día uno.
      // Ojo: si el registro SÍ existe pero un admin lo dejó vacío a propósito (para apagar el
      // envío automático), eso se respeta tal cual — no se le vuelve a poner el correo por defecto.
      setReportEmail(email ? (email.value || "") : "pisosmecanicosapp@gmail.com");
      setReportWhatsapp(wa?.value || "");
      setSentReports(sr || []);
      setLastTour(lt || null);
      setTourHistory(thist || []);
      setLatestColdValues(lcv || {});
      setLastColdRound(lcr || null);
      setColdHistory(ch || {});
      setColdRoundsIndex(cri || []);
      setLatestMeterValues(lmv || {});
      setMeterHistory(mh || {});
      setMeterRoundsIndex(mri || []);
      setBodegas(bod || []);
      setShelves(shv || []);
      setInvItems(iit || []);
      setInvMovements(imv || []);
      setEmployees(emp || []);
      setScheduleEntries(sch || {});
      setMttoEquipos(mte || []);
      setMttoLog(mtl || []);
      setMttoCronograma(mtc || []);
      setLatestLavanderiaValues(llv || {});
      setLavanderiaRoundsIndex(lri || []);
      setLatestGymValues(lgv || {});
      setGymRoundsIndex(gri || []);
      setCalderaRoundsIndex(cari || []);
      setLastCalderaRound(lcar || null);
      setPushSubscriptions(psub || []);
      setTasks(tsk || []);
      setTrash(trs || []);
      setLoginLog(llog || []);
      setScheduleEditLog(schLog || []);
      // Fusiona las entradas "de fábrica" con las que ya haya guardadas — así, cada vez que se
      // agreguen novedades nuevas al código, le llegan también a cuentas que ya tenían historial
      // guardado (antes solo se usaba el seed si la lista estaba vacía del todo).
      const existingIds = new Set((chgl || []).map(e => e.id));
      const missingSeed = DEFAULT_CHANGELOG_SEED.filter(e => !existingIds.has(e.id));
      setChangelogEntries([...missingSeed, ...(chgl || [])]);
      setGeneralEditLog(gel || []);
      setFuelHistory(fh || {});
      setTools(tls || []);
      setContractorVisits(cvis || []);
      setWikiPages(wiki || []);
      setMttoRequiredFields(mrf || { foto: false, costo: false, repuestos: false });
      setRoomTypes(rtp || []);
      setRoomBlocks(rbk || []);
      // Igual que con el changelog: fusiona los diagramas "de fábrica" con los que ya haya
      // guardados, sin duplicar (por id) — así llegan aunque ya exista data guardada.
      // Los diagramas "de fábrica" (Condensación/Evaporación) siempre se actualizan a la última
      // versión del código — así una corrección nueva sí llega, en vez de quedarse pegada a la
      // primera vez que se guardaron en Supabase. Los diagramas que el usuario haya creado por su
      // cuenta (con otro id) se respetan tal cual están.
      const seedDiagramIds = new Set(DEFAULT_SYSTEM_DIAGRAMS_SEED.map(d => d.id));
      const customDiagrams = (sd || []).filter(d => !seedDiagramIds.has(d.id));
      setSystemDiagrams([...DEFAULT_SYSTEM_DIAGRAMS_SEED, ...customDiagrams]);
      const existingProcIds = new Set((sp || []).map(p => p.id));
      const missingProcSeed = DEFAULT_SYSTEM_PROCEDURES_SEED.filter(p => !existingProcIds.has(p.id));
      setSystemProcedures([...(sp || []), ...missingProcSeed]);
      setLoading(false);
    } catch (e) {
      console.error("Error cargando datos iniciales:", e);
      setLoadError("No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.");
      setLoading(false);
    }
  }, []);

  /** Trae los perfiles de TODOS los usuarios (para el Panel de administrador, listas, etc.) —
   *  cualquiera con sesión iniciada puede verlos (ver política "profiles_select_authenticated"),
   *  aunque su propia cuenta todavía no esté aprobada. */
  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    const map = {};
    (data || []).forEach(p => { map[p.id] = p; });
    setProfiles(map);
    return map;
  }, []);

  /** Se llama cada vez que cambia la sesión de Supabase Auth (al abrir la app, al iniciar
   *  sesión, al cerrarla, o si el token se refresca solo). Decide qué cargar según si hay
   *  sesión y si esa cuenta ya está aprobada — para no intentar leer datos que las reglas de
   *  Supabase van a rechazar de todas formas si la cuenta no está aprobada todavía. */
  const handleAuthChange = useCallback(async (session) => {
    if (!session?.user) {
      setCurrentUser(null);
      setProfiles({});
      setLoading(false);
      return;
    }
    setCurrentUser(session.user.id);
    let map = await loadAllProfiles();
    if (!map[session.user.id]) {
      // No tiene fila en "profiles" todavía — pasa si el correo se confirmó por fuera del flujo
      // normal de registro (a mano desde Supabase, por ejemplo), o si algo se cortó a mitad de
      // camino la primera vez. Se crea aquí mismo, para que nadie quede "colgado" sin rol.
      await requestCreateProfile(session.access_token);
      map = await loadAllProfiles();
    }
    const mine = map[session.user.id];
    if (mine?.approved) {
      await loadAll();
      // Copia de respaldo de la firma en este celular (además de la del servidor) — así, si
      // alguna vez la del servidor se pierde (como pasó una vez por una columna que faltaba),
      // se puede recuperar sola sin que la persona tenga que volver a dibujarla.
      try {
        const backupKey = `pm-local:signature-backup:${session.user.id}`;
        if (mine.signature) {
          localStorage.setItem(backupKey, mine.signature);
        } else {
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            const { error } = await supabase.from("profiles").update({ signature: backup }).eq("id", session.user.id);
            if (!error) setProfiles(m => ({ ...m, [session.user.id]: { ...m[session.user.id], signature: backup } }));
          }
        }
      } catch { /* la copia local es un extra de seguridad, nunca debe romper el login si falla */ }
    } else {
      setLoading(false); // cuenta todavía no aprobada: no se intenta cargar el resto de la app
    }
  }, [loadAllProfiles, loadAll]);

  // Se usa para saber, dentro del listener de abajo, quién es "quien ya estaba conectado" sin
  // depender de que el efecto se vuelva a ejecutar (el efecto corre una sola vez, con []).
  const currentUserRef = useRef(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    let subscription;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthChange(session);
      setAuthReady(true);
      const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
        // Supabase dispara este evento en varios momentos que NO son un login/logout de verdad
        // (ej. cada vez que la pestaña/app recupera el foco, o cuando el token se renueva solo
        // por detrás) — antes esto hacía que TODA la app se volviera a cargar (pantalla de
        // "Cargando…") cada vez que alguien volvía a la pestaña o cambiaba de pantalla. Ahora
        // solo se reacciona quando de verdad cambia la sesión: alguien entra, alguien sale, o
        // cambia la persona conectada — nunca por una simple renovación de token o de foco.
        if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "USER_UPDATED") return;
        if (event === "SIGNED_IN" && newSession?.user?.id === currentUserRef.current) return;
        handleAuthChange(newSession);
      });
      subscription = sub.subscription;
    })();
    return () => { if (subscription) subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Revisa cada 30 segundos si a la persona que tiene la app abierta le quitaron el acceso
   * (la rechazaron, la eliminaron, o le quitaron la aprobación) — y si es así, la saca de la
   * app de inmediato, sin esperar a que recargue la página. Sin esto, alguien que ya tenía la
   * app abierta seguiría viendo (y en teoría manipulando) todo lo que ya se había cargado en su
   * navegador, aunque su cuenta ya no exista del lado del servidor.
   */
  useEffect(() => {
    if (!currentUser) return;
    const check = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser).maybeSingle();
      if (error) return; // no se pudo revisar (sin señal, hotel wifi cortándose, etc.) — nunca se saca
                          // a nadie por un problema de conexión, solo cuando de verdad ya no está aprobado
      if (!data || !data.approved) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setProfiles({});
      } else {
        setProfiles(p => ({ ...p, [currentUser]: data }));
      }
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [currentUser]);

  const register = async (email, password, fullName) => {
    setAuthError(""); setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: fullName } },
      });
      if (error) {
        setAuthError(
          error.message?.includes("already registered") || error.message?.includes("already been registered")
            ? "Ese correo ya tiene una cuenta. Inicia sesión en vez de crear una nueva."
            : (error.message || "No se pudo crear la cuenta.")
        );
        setAuthBusy(false);
        return;
      }
      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        // Algunos proyectos de Supabase piden confirmar el correo antes de dar una sesión — en
        // ese caso no hay token todavía para crear el perfil de una vez.
        setAuthError("Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja antes de iniciar sesión.");
        setAuthBusy(false);
        return;
      }
      const profRes = await requestCreateProfile(accessToken);
      if (!profRes.ok) {
        setAuthError(profRes.message || "La cuenta se creó, pero no se pudo terminar de configurar. Intenta iniciar sesión.");
        setAuthBusy(false);
        return;
      }
      await handleAuthChange(data.session);
      setView("home");
      if (!profRes.isFirstEver && pushSubscriptions.length > 0) {
        sendPushToSubscriptions(pushSubscriptions, "👤 Cuenta nueva esperando aprobación", `"${fullName}" se registró y necesita que la aprueben.`, "/");
      }
    } catch (e) {
      console.error("Error creando cuenta:", e);
      setAuthError("No se pudo conectar con el servidor para crear la cuenta. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const login = async (email, password) => {
    setAuthError(""); setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message?.includes("Invalid login") ? "Correo o contraseña incorrectos." : (error.message || "No se pudo iniciar sesión."));
        setAuthBusy(false);
        // Se registra el intento fallido para poder avisar si se repite muchas veces seguidas —
        // no se espera (await) la respuesta, para no atrasar el mensaje de error al usuario.
        fetch("/api/log-failed-login", { method: "POST", headers: aiRequestHeaders(), body: JSON.stringify({ email }) }).catch(() => {});
        return;
      }
      await handleAuthChange(data.session);
      setView("home");
      // Registra el ingreso para poder ver, como admin, quién está usando la app y con qué frecuencia.
      const logEntry = { userId: data.session.user.id, at: nowIso(), device: getDeviceInfo(), deviceId: getDeviceId() };
      const nextLog = [logEntry, ...loginLog].slice(0, 2000);
      setLoginLog(nextLog);
      sSet("login-log", nextLog, true); // no se espera (await) a propósito, para no atrasar el ingreso
    } catch (e) {
      console.error("Error iniciando sesión:", e);
      setAuthError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const updateMySignature = async (dataUrl) => {
    const { error } = await supabase.from("profiles").update({ signature: dataUrl }).eq("id", currentUser);
    if (error) {
      console.error("Error guardando la firma:", error);
      throw new Error("No se pudo guardar la firma. Avísale al admin — puede que falte una columna en la base de datos.");
    }
    setProfiles(p => ({ ...p, [currentUser]: { ...p[currentUser], signature: dataUrl } }));
  };

  /** Guarda cuál empleado del Horario Mensual es "yo", para que "Mi horario" sepa cuáles turnos mostrar. */
  const updateMyLinkedEmployee = async (employeeId) => {
    await supabase.from("profiles").update({ linked_employee_id: employeeId }).eq("id", currentUser);
    setProfiles(p => ({ ...p, [currentUser]: { ...p[currentUser], linked_employee_id: employeeId } }));
  };

  /** Estas cuatro pasan por el servidor (api/admin-actions.js) porque cambiar el rol o aprobar
   *  a OTRA persona no se puede hacer directo desde el navegador — a propósito, para que ni
   *  siquiera alguien con la clave pública pueda auto-asignarse un rol. El servidor comprueba
   *  ahí, de verdad, que quien llama ya es un administrador aprobado. */
  const callAdminAction = async (action, targetUserId, extra) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await requestAdminAction(session?.access_token, action, targetUserId, extra);
    if (res.ok) await loadAllProfiles();
    return res;
  };
  const approveAccount = (userId) => callAdminAction("approve", userId);
  const rejectAccount = (userId) => callAdminAction("reject", userId);
  const toggleAdmin = (userId) => callAdminAction("toggle-admin", userId);
  const toggleAlmacenista = (userId) => callAdminAction("toggle-almacenista", userId);
  const toggleGerencia = (userId) => callAdminAction("toggle-gerencia", userId);
  const toggleViewer = (userId) => callAdminAction("toggle-viewer", userId);
  const toggleScheduleManager = (userId) => callAdminAction("toggle-schedule-manager", userId);
  const resetPassword = (userId, newPassword) => callAdminAction("reset-password", userId, { newPassword });
  const deleteAccount = async (userId) => {
    const data = profiles[userId];
    if (data) await moveToTrash("account", { userId, ...data }, `${data.display_name || data.email || userId} (usuario)`);
    return callAdminAction("delete", userId);
  };

  const logout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setProfiles({}); };
  const logoutRef = useRef(null); logoutRef.current = logout;
  // Cierre de sesión por inactividad (opcional, por dispositivo): se mide con toques, teclas y clics.
  useEffect(() => {
    if (!currentUser) return;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const evs = ["pointerdown", "keydown", "touchstart", "scroll"];
    evs.forEach(ev => window.addEventListener(ev, bump, { passive: true }));
    const iv = setInterval(() => {
      let min = 0; try { min = Number(localStorage.getItem("pm-local:idle-min")) || 0; } catch { /* sin almacenamiento */ }
      if (min > 0 && Date.now() - last > min * 60000) { clearInterval(iv); showToast("Sesión cerrada por inactividad.", true); logoutRef.current?.(); }
    }, 30000);
    return () => { clearInterval(iv); evs.forEach(ev => window.removeEventListener(ev, bump)); };
  }, [currentUser]);

  const addChangelogEntry = async ({ title, description }) => {
    const entry = { id: uid("cl"), title, description, at: nowIso(), by: displayName };
    const next = [entry, ...changelogEntries];
    setChangelogEntries(next);
    await sSet("changelog", next, true);
  };
  const deleteChangelogEntry = async (id) => {
    const next = changelogEntries.filter(e => e.id !== id);
    setChangelogEntries(next);
    await sSet("changelog", next, true);
  };
  /** Cierra la sesión en TODOS los dispositivos donde esa cuenta esté conectada (no solo este) —
   *  útil si se perdió un celular con la app abierta, o se dejó la sesión abierta en un equipo
   *  que ya no se usa. Supabase Auth ya trae esto incorporado (scope: "global"). */
  const logoutEverywhere = async () => { await supabase.auth.signOut({ scope: "global" }); setCurrentUser(null); setProfiles({}); };

  const saveReportEmail = async (email) => {
    setReportEmail(email);
    await sSet("report-email", { value: email }, true);
  };

  const saveReportWhatsapp = async (wa) => {
    setReportWhatsapp(wa);
    await sSet("report-whatsapp", { value: wa }, true);
  };

  const logSentReport = async (rec) => {
    const next = [rec, ...sentReports].slice(0, 200);
    setSentReports(next);
    await sSet("sent-reports", next, true);
  };

  /* ---- Papelera ---- */
  const moveToTrash = async (tipo, data, label) => {
    const entry = { id: uid("trash"), tipo, data, label: label || data.titulo || data.nombre || data.displayName || data.username || "—", deletedBy: displayName, deletedAt: nowIso() };
    const next = [entry, ...trash];
    setTrash(next);
    await sSet("trash", next, true);
    return entry;
  };

  const restoreFromTrash = async (trashId) => {
    const entry = trash.find(t => t.id === trashId);
    if (!entry) return;
    if (entry.tipo === "task") {
      const next = [entry.data, ...tasks]; setTasks(next); await sSet("tasks", next, true);
    } else if (entry.tipo === "account") {
      // Una cuenta eliminada no se puede "restaurar" sola — la persona tiene que volver a
      // registrarse con su correo (el inicio de sesión de Supabase Auth ya no existe una vez
      // se elimina). Esta entrada de la papelera queda solo como registro de quién era.
      return;
    } else if (entry.tipo === "employee") {
      const next = [entry.data, ...employees]; setEmployees(next); await sSet("employees", next, true);
    } else if (entry.tipo === "mttoEquipo") {
      const next = [entry.data, ...mttoEquipos]; setMttoEquipos(next); await sSet("mtto-equipos", next, true);
    } else if (entry.tipo === "bodega") {
      const next = [entry.data, ...bodegas]; setBodegas(next); await sSet("inventory-bodegas", next, true);
    } else if (entry.tipo === "shelf") {
      const next = [entry.data, ...shelves]; setShelves(next); await sSet("inventory-shelves", next, true);
    }
    const nextTrash = trash.filter(t => t.id !== trashId);
    setTrash(nextTrash);
    await sSet("trash", nextTrash, true);
  };

  const purgeFromTrash = async (trashId) => {
    const nextTrash = trash.filter(t => t.id !== trashId);
    setTrash(nextTrash);
    await sSet("trash", nextTrash, true);
  };

  const resolveIssue = async (iss, solution, afterPhotoUrl) => {
    const rec = {
      equipmentId: iss.equipmentId || iss.id, code: iss.code, name: iss.name, floorName: iss.floorName, floorId: iss.floorId,
      openedAt: iss.openedAt, openedBy: iss.openedBy, observation: iss.observation,
      resolvedAt: nowIso(), resolvedBy: displayName, solution,
      duration: elapsed(iss.openedAt),
      beforePhotoUrl: iss.beforePhotoUrl || null, afterPhotoUrl: afterPhotoUrl || null,
    };
    const newHistory = [rec, ...issueHistory].slice(0, 500);
    const newActive = { ...activeIssues };
    delete newActive[rec.equipmentId];
    const prevHistory = issueHistory, prevActive = activeIssues;
    setIssueHistory(newHistory); setActiveIssues(newActive);
    try {
      await sSet("issue-history", newHistory, true);
      await sSet("active-issues", newActive, true);
    } catch (e) {
      setIssueHistory(prevHistory); setActiveIssues(prevActive);
      throw e;
    }
  };

  /** Guarda una foto de "cómo está ahora" mientras el daño sigue activo (el "antes" para el
   *  comparador antes/después que se muestra una vez resuelto). */
  const attachIssuePhoto = async (equipmentId, file) => {
    const url = await uploadPhoto(file, `issue-${equipmentId}`);
    const newActive = { ...activeIssues, [equipmentId]: { ...activeIssues[equipmentId], beforePhotoUrl: url } };
    setActiveIssues(newActive);
    await sSet("active-issues", newActive, true);
    return url;
  };

  /** "Sigue igual": deja constancia de que se revisó y el equipo sigue con la misma falla,
   *  sin obligar a escribir un comentario nuevo cada turno. Queda como una lista de confirmaciones. */
  const checkInIssue = async (iss) => {
    const id = iss.equipmentId || iss.id;
    const entry = { by: displayName, at: nowIso(), shift };
    const newActive = { ...activeIssues, [id]: { ...activeIssues[id], checkins: [...(activeIssues[id]?.checkins || []), entry] } };
    setActiveIssues(newActive);
    await sSet("active-issues", newActive, true);
  };

  /**
   * Actualiza el nivel de un tanque manualmente, SIN pasar por la ronda completa del piso.
   * Pensado para cortes de agua u otras emergencias donde hay que revisar/actualizar
   * rápido el porcentaje de los tanques. Usa el mismo almacenamiento que las rondas
   * normales (latestValues/tankHistory), así que queda 100% integrado: la próxima
   * ronda normal de ese piso ya va a mostrar este valor como "turno anterior".
   */
  const saveTankReading = async (item, value) => {
    const ts = nowIso();
    const newLatest = { ...latestValues, [item.id]: { value, updatedAt: ts, updatedBy: displayName, shift, code: item.c, name: item.n, manual: true } };
    const arr = (tankHistory[item.id] || []).concat([{ value, at: ts, by: displayName }]).slice(-20);
    const newTankHist = { ...tankHistory, [item.id]: arr };
    setLatestValues(newLatest); setTankHistory(newTankHist);
    await Promise.all([
      sSet("latest-values", newLatest, true),
      sSet("tank-history", newTankHist, true),
    ]);
  };

  /** Actualiza manualmente un nivel de ACPM desde el módulo de Combustibles (sin esperar al
   *  recorrido) — escribe exactamente en el mismo lugar que ya usa el recorrido (latestValues +
   *  fuelHistory), así que el próximo técnico que revise ese piso ve este valor como "el de
   *  antes" en su ronda, sin que nadie tenga que avisarle aparte. */
  const saveFuelReading = async (item, value) => {
    const ts = nowIso();
    const newLatest = { ...latestValues, [item.id]: { value, updatedAt: ts, updatedBy: displayName, shift, code: item.c, name: item.n, floorName: item.floorName, manual: true } };
    const arr = (fuelHistory[item.id] || []).concat([{ value, at: ts, by: displayName, shift, manual: true }]).slice(-30);
    const newFuelHist = { ...fuelHistory, [item.id]: arr };
    setLatestValues(newLatest); setFuelHistory(newFuelHist);
    await Promise.all([
      sSet("latest-values", newLatest, true),
      sSet("fuel-history", newFuelHist, true),
    ]);
  };

  /* ---- Inventario ---- */
  const logInvMovement = async (itemId, type, quantity, balanceAfter, note, movementsBase, taskId) => {
    const rec = { id: uid("mov"), itemId, type, quantity, balanceAfter, by: displayName, at: nowIso(), note: note || "", taskId: taskId || null };
    const next = [rec, ...(movementsBase ?? invMovements)].slice(0, 3000);
    setInvMovements(next);
    await sSet("inventory-movements", next, true);
    return next;
  };

  const createBodega = async (name) => {
    const rec = { id: uid("bod"), name, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...bodegas];
    setBodegas(next);
    await sSet("inventory-bodegas", next, true);
    return rec;
  };

  const createShelf = async (bodegaId, code, name) => {
    const rec = { id: uid("shf"), bodegaId, code, name, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...shelves];
    setShelves(next);
    await sSet("inventory-shelves", next, true);
    return rec;
  };

  const deleteBodega = async (id) => {
    const item = bodegas.find(b => b.id === id);
    const myShelves = shelves.filter(s => s.bodegaId === id);
    const myItems = invItems.filter(i => i.bodegaId === id);
    if (myShelves.length > 0 || myItems.length > 0) {
      return { ok: false, message: `Esta bodega todavía tiene ${myShelves.length} estantería(s) y ${myItems.length} repuesto(s). Bórralos primero.` };
    }
    if (item) { const entry = await moveToTrash("bodega", item, `${item.name} (bodega)`); offerUndo(`Bodega "${item.name}" eliminada`, entry.id); }
    const next = bodegas.filter(b => b.id !== id);
    setBodegas(next);
    await sSet("inventory-bodegas", next, true);
    return { ok: true };
  };

  const deleteShelf = async (id) => {
    const item = shelves.find(s => s.id === id);
    const myItems = invItems.filter(i => i.shelfId === id);
    if (myItems.length > 0) {
      return { ok: false, message: `Esta estantería todavía tiene ${myItems.length} repuesto(s). Bórralos primero.` };
    }
    if (item) { const entry = await moveToTrash("shelf", item, `Estantería ${item.code} (${item.name || "sin nombre"})`); offerUndo(`Estantería "${item.code}" eliminada`, entry.id); }
    const next = shelves.filter(s => s.id !== id);
    setShelves(next);
    await sSet("inventory-shelves", next, true);
    return { ok: true };
  };

  const createInvItem = async (shelfId, bodegaId, form) => {
    const quantity = Number(form.quantity) || 0;
    const rec = {
      id: uid("itm"), shelfId, bodegaId, name: form.name.trim(), sku: (form.sku || "").trim(),
      unit: (form.unit || "unidad").trim() || "unidad", quantity, minThreshold: Number(form.minThreshold) || 0,
      createdBy: displayName, createdAt: nowIso(), updatedAt: nowIso(),
    };
    const next = [rec, ...invItems];
    setInvItems(next);
    await sSet("inventory-items", next, true);
    logGeneralEdit({ kind: "inventario", action: "creacion", entityLabel: rec.name });
    if (quantity > 0) await logInvMovement(rec.id, "entrada", quantity, quantity, "Alta inicial del repuesto");
    return rec;
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el inventario real
   * del Excel del hotel: crea las 29 bodegas y sus estanterías si no existen, y da de alta
   * los ~2897 repuestos con su cantidad y mínimo actuales. No duplica si ya existen (empareja
   * por nombre de bodega, código de estantería, y nombre+bodega+estantería del repuesto).
   */
  const importFullInventory = async () => {
    const { INV_IMPORT_BODEGAS, INV_IMPORT_SHELVES, INV_IMPORT_ITEMS } = await import("./data/inventoryImportData.js");
    const bodegaByName = {};
    bodegas.forEach(b => { bodegaByName[b.name.trim().toLowerCase()] = b; });
    const newBodegas = [];
    INV_IMPORT_BODEGAS.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!bodegaByName[key]) {
        const rec = { id: uid("bod"), name, createdBy: displayName, createdAt: nowIso() };
        newBodegas.push(rec);
        bodegaByName[key] = rec;
      }
    });
    const allBodegas = [...bodegas, ...newBodegas];
    if (newBodegas.length) { setBodegas(allBodegas); await sSet("inventory-bodegas", allBodegas, true); }

    const shelfByKey = {}; // `${bodegaId}::${code}` -> shelf
    shelves.forEach(s => { shelfByKey[`${s.bodegaId}::${s.code.trim().toLowerCase()}`] = s; });
    const newShelves = [];
    INV_IMPORT_SHELVES.forEach(([bIdx, code]) => {
      const bodega = bodegaByName[INV_IMPORT_BODEGAS[bIdx].trim().toLowerCase()];
      const key = `${bodega.id}::${code.trim().toLowerCase()}`;
      if (!shelfByKey[key]) {
        const rec = { id: uid("shf"), bodegaId: bodega.id, code, name: "", createdBy: displayName, createdAt: nowIso() };
        newShelves.push(rec);
        shelfByKey[key] = rec;
      }
    });
    const allShelves = [...shelves, ...newShelves];
    if (newShelves.length) { setShelves(allShelves); await sSet("inventory-shelves", allShelves, true); }

    const itemExists = {}; // `${shelfId}::${name}` -> true, para no duplicar si se corre dos veces
    invItems.forEach(it => { itemExists[`${it.shelfId}::${it.name.trim().toLowerCase()}`] = true; });
    const newItems = [];
    const ts = nowIso();
    INV_IMPORT_ITEMS.forEach(([bIdx, shelfCode, name, sku, unit, qty, min]) => {
      const bodega = bodegaByName[INV_IMPORT_BODEGAS[bIdx].trim().toLowerCase()];
      const shelf = shelfByKey[`${bodega.id}::${shelfCode.trim().toLowerCase()}`];
      const key = `${shelf.id}::${name.trim().toLowerCase()}`;
      if (itemExists[key]) return;
      itemExists[key] = true;
      newItems.push({
        id: uid("itm"), shelfId: shelf.id, bodegaId: bodega.id, name, sku, unit: unit || "unidad",
        quantity: qty, minThreshold: min, createdBy: displayName, createdAt: ts, updatedAt: ts,
      });
    });
    const allItems = [...invItems, ...newItems];
    if (newItems.length) { setInvItems(allItems); await sSet("inventory-items", allItems, true); }

    return { newBodegasCount: newBodegas.length, newShelvesCount: newShelves.length, newItemsCount: newItems.length };
  };

  /* ---- Mantenimiento ---- */
  const importMaintenanceFull = async () => {
    const { MTTO_IMPORT_SISTEMAS, MTTO_IMPORT_EQUIPOS, MTTO_CRONOGRAMA } = await import("./data/mttoImportData.js");
    const existing = {};
    mttoEquipos.forEach(e => { existing[`${e.sistema.trim().toLowerCase()}::${e.nombre.trim().toLowerCase()}`] = e; });
    const newEquipos = [];
    MTTO_IMPORT_EQUIPOS.forEach(([sIdx, nombre]) => {
      const sistema = MTTO_IMPORT_SISTEMAS[sIdx];
      const key = `${sistema.trim().toLowerCase()}::${nombre.trim().toLowerCase()}`;
      if (!existing[key]) {
        const rec = { id: uid("eq"), sistema, nombre, active: true, createdBy: displayName, createdAt: nowIso() };
        newEquipos.push(rec);
        existing[key] = rec;
      }
    });
    const allEquipos = [...mttoEquipos, ...newEquipos];
    if (newEquipos.length) { setMttoEquipos(allEquipos); await sSet("mtto-equipos", allEquipos, true); }

    // Reconstruye, en el mismo orden que se generó el catálogo, a qué equipo real corresponde cada posición
    const idxToEquipo = MTTO_IMPORT_EQUIPOS.map(([sIdx, nombre]) => {
      const sistema = MTTO_IMPORT_SISTEMAS[sIdx];
      const key = `${sistema.trim().toLowerCase()}::${nombre.trim().toLowerCase()}`;
      return existing[key];
    });

    const cronoExists = {};
    mttoCronograma.forEach(c => { cronoExists[`${c.equipoId}::${c.mesNum}::${c.tipo}::${c.fechaEjecucion}`] = true; });
    const newCrono = [];
    const ts = nowIso();
    MTTO_CRONOGRAMA.forEach(([eIdx, mesNum, programado, tipo, fecha, tecnico, estado]) => {
      const equipo = idxToEquipo[eIdx];
      if (!equipo) return;
      const tipoStr = tipo === 1 ? "externo" : "interno";
      const key = `${equipo.id}::${mesNum}::${tipoStr}::${fecha}`;
      if (cronoExists[key]) return;
      cronoExists[key] = true;
      newCrono.push({
        id: uid("cr"), equipoId: equipo.id, mesNum, programado: !!programado, tipo: tipoStr,
        fechaEjecucion: fecha || null, tecnico, estado: estado === 2 ? "ejecutado" : estado === 1 ? "atrasado" : "pendiente",
        createdAt: ts,
      });
    });
    const allCrono = [...mttoCronograma, ...newCrono];
    if (newCrono.length) { setMttoCronograma(allCrono); await sSet("mtto-cronograma", allCrono, true); }

    // Por cada registro del cronograma que YA se ejecutó, crea también su entrada en el
    // historial de mantenimiento del equipo (para que salga en su ficha y en Análisis).
    const logExists = {};
    mttoLog.forEach(m => { logExists[`${m.equipoId}::${m.fecha}::import`] = true; });
    const newLogs = [];
    newCrono.forEach(c => {
      if (c.estado !== "ejecutado" || !c.fechaEjecucion) return;
      const key = `${c.equipoId}::${c.fechaEjecucion}::import`;
      if (logExists[key]) return;
      logExists[key] = true;
      newLogs.push({
        id: uid("mtl"), equipoId: c.equipoId, tipo: "preventivo", fecha: c.fechaEjecucion,
        tecnico: c.tecnico || "(cronograma)", descripcion: `Mantenimiento ${c.tipo === "externo" ? "externo" : "interno"} programado, importado del cronograma.`,
        estado: "funcionando", costo: 0, fotos: [], createdBy: displayName, createdAt: ts, fromImport: true,
      });
    });
    const allLogs = [...mttoLog, ...newLogs];
    if (newLogs.length) { setMttoLog(allLogs); await sSet("mtto-log", allLogs, true); }

    return { newEquiposCount: newEquipos.length, newCronoCount: newCrono.length, newLogsCount: newLogs.length };
  };

  const createMttoEquipo = async (sistema, nombre) => {
    const rec = { id: uid("eq"), sistema: sistema.trim(), nombre: nombre.trim(), active: true, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...mttoEquipos];
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
    return rec;
  };

  const deleteMttoEquipo = async (id) => {
    const item = mttoEquipos.find(e => e.id === id);
    if (item) { const entry = await moveToTrash("mttoEquipo", item, `${item.nombre} (equipo de mantenimiento)`); offerUndo(`Equipo "${item.nombre}" eliminado`, entry.id); }
    const next = mttoEquipos.filter(e => e.id !== id);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
  };

  const setEquipoVideoUrl = async (id, videoUrl) => {
    const next = mttoEquipos.map(e => e.id === id ? { ...e, videoUrl: videoUrl.trim() || null } : e);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
  };

  const setEquipoFrecuencia = async (id, frecuenciaDias) => {
    const next = mttoEquipos.map(e => e.id === id ? { ...e, frecuenciaDias: frecuenciaDias || null } : e);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
  };

  /** Edita nombre/sistema de un equipo ya existente. Se usa junto con la auditoría de cascada:
   * la UI le muestra antes al usuario cuántos mantenimientos/tareas quedarían bajo el sistema
   * nuevo, y solo si confirma se llama a esta función. */
  const updateMttoEquipoInfo = async (id, patch) => {
    const before = mttoEquipos.find(e => e.id === id);
    if (!before) return;
    const next = mttoEquipos.map(e => e.id === id ? { ...e, ...patch } : e);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
    if (patch.sistema && patch.sistema !== before.sistema) {
      logGeneralEdit({
        kind: "equipo", action: "edicion", entityLabel: before.nombre,
        detail: `Sistema cambiado de "${before.sistema}" a "${patch.sistema}"`,
      });
    }
  };

  const setEquipoFotoMaestra = async (id, url) => {
    const next = mttoEquipos.map(e => e.id === id ? { ...e, fotoMaestra: url || null } : e);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
  };

  /** Registra un mantenimiento y, si se marcaron repuestos usados, los descuenta del inventario
   *  solo — sin tener que ir aparte a Inventario a hacer el retiro a mano. Guarda una copia del
   *  nombre/cantidad en el propio registro (no solo el id), para que la hoja de vida del equipo
   *  siga mostrando bien qué se usó aunque ese repuesto se edite o se borre más adelante. */
  const logMaintenance = async (equipoId, form) => {
    const repuestosUsados = (form.repuestos || []).filter(r => r.itemId && Number(r.cantidad) > 0);
    const rec = {
      id: uid("mtl"), equipoId, tipo: form.tipo || "preventivo", fecha: form.fecha || nowIso(),
      tecnico: displayName, descripcion: form.descripcion || "", estado: form.estado || "funcionando",
      costo: form.costo ? Number(form.costo) : 0, fotos: form.fotos || [],
      costoRepuestos: form.costoRepuestos ? Number(form.costoRepuestos) : 0,
      costoContratista: form.costoContratista ? Number(form.costoContratista) : 0,
      repuestos: repuestosUsados.map(r => ({ itemId: r.itemId, nombre: invItems.find(it => it.id === r.itemId)?.name || "Repuesto", cantidad: Number(r.cantidad) })),
      createdBy: displayName, createdByUsername: currentUser, createdAt: nowIso(),
      revisionEstado: "pendiente", // pendiente | aprobado | rechazado — lo cierra un supervisor
      taskId: form.taskId || null, // si vino desde el cajón de una tarea, queda la trazabilidad de cuál
    };
    const all = [rec, ...mttoLog];
    const next = all.slice(0, 5000);
    const overflow = all.slice(5000);
    // Lo que pasa del tope no se borra: se guarda aparte en un archivo de historial.
    if (overflow.length > 0) {
      try {
        const prev = await sGet("mtto-log-archive", true);
        await sSet("mtto-log-archive", [...overflow, ...(Array.isArray(prev) ? prev : [])], true);
      } catch { /* si falla el archivo, igual se guarda el registro nuevo */ }
    }
    setMttoLog(next);
    await sSet("mtto-log", next, true);

    await consumeParts(repuestosUsados, `Usado en mantenimiento de equipo (${rec.tipo})`, form.taskId || null);
    return rec;
  };

  /** Descuenta varios repuestos del inventario con UNA sola escritura (antes, descontar dos
   *  repuestos seguidos hacía que el segundo pisara al primero) y deja cada movimiento anotado. */
  const consumeParts = async (parts, note, taskId) => {
    const used = (parts || []).filter(r => r.itemId && Number(r.cantidad) > 0);
    if (used.length === 0) return;
    const nextItems = invItems.map(it => {
      const r = used.find(x => x.itemId === it.id);
      return r ? { ...it, quantity: Math.max(0, it.quantity - Math.abs(Number(r.cantidad))), updatedAt: nowIso() } : it;
    });
    setInvItems(nextItems);
    await sSet("inventory-items", nextItems, true);
    for (const r of used) {
      const after = nextItems.find(x => x.id === r.itemId);
      if (after) await logInvMovement(after.id, "retiro", -Math.abs(Number(r.cantidad)), after.quantity, note, undefined, taskId || undefined);
    }
  };

  /** El supervisor cierra el ciclo de un mantenimiento — aprobándolo o devolviéndolo con un
   *  comentario. Queda guardado quién lo revisó y cuándo, para que quede trazabilidad real. */
  const reviewMaintenanceRecord = async (recordId, decision, comentario) => {
    const original = mttoLog.find(r => r.id === recordId);
    const next = mttoLog.map(r => r.id === recordId ? {
      ...r, revisionEstado: decision, revisionComentario: comentario || "",
      revisadoPor: displayName, revisadoAt: nowIso(),
    } : r);
    setMttoLog(next);
    await sSet("mtto-log", next, true);

    // Al devolver un mantenimiento, avisarle al técnico que lo registró — solo a él, no a todos
    // los que tengan las notificaciones activadas (por eso se filtra por ownerUsername).
    if (decision === "rechazado" && original?.createdByUsername) {
      const eq = mttoEquipos.find(e => e.id === original.equipoId);
      const suyas = pushSubscriptions.filter(s => s.ownerUsername === original.createdByUsername);
      if (suyas.length > 0) {
        sendPushToSubscriptions(suyas, "↩ Mantenimiento devuelto",
          `Tu mantenimiento en ${eq?.nombre || "un equipo"} fue devuelto.${comentario ? ` Motivo: ${comentario}` : ""}`, "/");
      }
    }
  };

  /** Reprograma una celda del cronograma anual (equipo + mes) — si no existía todavía una entrada
   *  para ese mes, la crea; si ya existía, la actualiza. Usado por "Reprogramar" en el detalle. */
  const updateCronogramaEntry = async (equipoId, mesNum, patch) => {
    const existing = mttoCronograma.find(c => c.equipoId === equipoId && c.mesNum === mesNum);
    let next;
    if (existing) {
      next = mttoCronograma.map(c => c === existing ? { ...c, ...patch, updatedBy: displayName, updatedAt: nowIso() } : c);
    } else {
      next = [...mttoCronograma, { id: uid("cr"), equipoId, mesNum, programado: true, tipo: "interno", tecnico: "", createdAt: nowIso(), ...patch, updatedBy: displayName, updatedAt: nowIso() }];
    }
    setMttoCronograma(next);
    await sSet("mtto-cronograma", next, true);
  };

  const adjustInvStock = async (item, delta, type, note, taskId) => {
    const newQty = Math.max(0, item.quantity + delta);
    const nextItems = invItems.map(it => it.id === item.id ? { ...it, quantity: newQty, updatedAt: nowIso() } : it);
    setInvItems(nextItems);
    await sSet("inventory-items", nextItems, true);
    await logInvMovement(item.id, type, delta, newQty, note, undefined, taskId);
  };

  const doInvRetiro = (item, qty, note) => adjustInvStock(item, -Math.abs(qty), "retiro", note);
  const doInvEntrada = (item, qty, note) => adjustInvStock(item, Math.abs(qty), "entrada", note);

  /** Edita el nombre/código/unidad/mínimo de un repuesto (no la cantidad — eso sigue siendo un
   *  movimiento de entrada/retiro aparte, con su propio historial). Cada campo que cambie queda
   *  en el historial general de cambios. */
  const editInvItem = async (id, patch) => {
    const before = invItems.find(it => it.id === id);
    if (!before) return;
    const next = invItems.map(it => it.id === id ? { ...it, ...patch, updatedAt: nowIso() } : it);
    setInvItems(next);
    await sSet("inventory-items", next, true);
    Object.keys(patch).forEach(field => {
      const b = before[field], a = patch[field];
      if (String(b ?? "") === String(a ?? "")) return;
      logGeneralEdit({
        kind: "inventario", entityLabel: before.name, field: FIELD_LABELS[field] || field,
        before: b === "" || b == null ? "(vacío)" : String(b), after: a === "" || a == null ? "(vacío)" : String(a),
      });
    });
  };

  /* ---- Horarios ---- */
  const createEmployee = async (name, cargo, fixedRestDay) => {
    const rec = { id: uid("emp"), name, cargo: cargo || "", fixedRestDay: fixedRestDay === "" ? null : Number(fixedRestDay), active: true, createdBy: displayName, createdAt: nowIso() };
    const next = [...employees, rec];
    setEmployees(next);
    await sSet("employees", next, true);
    logGeneralEdit({ kind: "empleado", action: "creacion", entityLabel: rec.name });
    return rec;
  };

  /** Historial de cambios "general" — empleados, inventario y tareas. Mismo patrón siempre: quién
   *  cambió qué, desde qué dispositivo, y antes/después (para ediciones). */
  const logGeneralEdit = async (entry) => {
    const next = [{ id: uid("gel"), at: nowIso(), by: displayName, device: getDeviceInfo(), action: entry.action || "edicion", ...entry }, ...generalEditLog].slice(0, 2000);
    setGeneralEditLog(next);
    await sSet("general-edit-log", next, true);
  };

  const FIELD_LABELS = {
    cargo: "Cargo", fixedRestDay: "Descanso fijo", badge: "Etiqueta", reductionHoursPerDay: "Hrs. reducción/día",
    name: "Nombre", sku: "Código", unit: "Unidad", minThreshold: "Mínimo",
  };
  const updateEmployee = async (id, patch) => {
    const before = employees.find(e => e.id === id);
    const next = employees.map(e => e.id === id ? { ...e, ...patch } : e);
    setEmployees(next);
    await sSet("employees", next, true);
    if (before) {
      Object.keys(patch).forEach(field => {
        const b = before[field], a = patch[field];
        if (String(b ?? "") === String(a ?? "")) return;
        logGeneralEdit({
          kind: "empleado", entityLabel: before.name, field: FIELD_LABELS[field] || field,
          before: b === "" || b == null ? "(vacío)" : String(b), after: a === "" || a == null ? "(vacío)" : String(a),
        });
      });
    }
  };

  const deleteEmployee = async (id) => {
    const item = employees.find(e => e.id === id);
    if (item) {
      const entry = await moveToTrash("employee", item, `${item.name} (empleado)`);
      logGeneralEdit({ kind: "empleado", action: "eliminacion", entityLabel: item.name });
      offerUndo(`Empleado "${item.name}" eliminado`, entry.id);
    }
    const next = employees.filter(e => e.id !== id);
    setEmployees(next);
    await sSet("employees", next, true);
  };

  /** Si el cambio que se acaba de guardar hace que alguien complete un día nuevo de descanso por
   *  horas de reducción (ver computeCompBalance), avisa por push a los administradores suscritos.
   *  Compara el saldo ANTES y DESPUÉS del cambio, así solo avisa una vez por cada día ganado. */
  const notifyCompDaysEarned = (prevEntries, nextEntries, employeeIds) => {
    if (pushSubscriptions.length === 0) return;
    employeeIds.forEach(id => {
      const emp = employees.find(e => e.id === id);
      if (!emp || !(emp.reductionHoursPerDay > 0)) return;
      const before = computeCompBalance(emp, prevEntries).fullDays;
      const after = computeCompBalance(emp, nextEntries).fullDays;
      if (after > before) {
        sendPushToSubscriptions(pushSubscriptions, "🟣 Día de descanso acumulado",
          `${emp.name} ya completó ${after} día(s) de descanso por horas de reducción — pendiente de programar.`, "/");
      }
    });
  };

  /** Agrega entradas al historial de cambios del horario (quién cambió qué, cuándo, y qué había antes). */
  const logScheduleEdits = async (edits) => {
    if (!edits.length) return;
    const next = [...edits, ...scheduleEditLog].slice(0, 2000);
    setScheduleEditLog(next);
    await sSet("schedule-edit-log", next, true);
  };

  const setScheduleEntry = async (employeeId, dateIso, patch) => {
    const key = scheduleKey(employeeId, dateIso);
    const before = scheduleEntries[key] || null;
    const next = { ...scheduleEntries };
    const isEmpty = !patch || (!patch.code && patch.entrada == null && patch.salida == null);
    if (isEmpty) delete next[key];
    else next[key] = { entrada: patch.entrada ?? null, salida: patch.salida ?? null, code: patch.code || null, note: patch.note || "", updatedBy: displayName, updatedAt: nowIso() };
    notifyCompDaysEarned(scheduleEntries, next, [employeeId]);
    setScheduleEntries(next);
    await sSet("schedule-entries", next, true);
    const emp = employees.find(e => e.id === employeeId);
    logScheduleEdits([{
      id: uid("sel"), employeeId, employeeName: emp?.name || employeeId, date: dateIso,
      before: fmtEntryShort(before) || "(vacío)", after: fmtEntryShort(next[key]) || "(vacío)",
      by: displayName, at: nowIso(), source: "manual",
    }]);
  };

  /**
   * Guarda de una sola vez todas las celdas de un borrador de horario generado con IA (o ya
   * editado a mano por el usuario sobre ese borrador). "overrides" viene en el mismo formato que
   * scheduleEntries: { "empleadoId::AAAA-MM-DD": {entrada,salida} | {code} }. Es un solo guardado,
   * no uno por celda, para que sea rápido aunque sea un mes completo.
   */
  const applyAiScheduleDraft = async (overrides) => {
    const next = { ...scheduleEntries };
    const affectedIds = new Set();
    const edits = [];
    Object.entries(overrides || {}).forEach(([key, patch]) => {
      const [employeeId, dateIso] = key.split("::");
      const before = scheduleEntries[key] || null;
      const isEmpty = !patch || (!patch.code && patch.entrada == null && patch.salida == null);
      if (isEmpty) { delete next[key]; }
      else next[key] = { entrada: patch.entrada ?? null, salida: patch.salida ?? null, code: patch.code || null, note: patch.note || "Generado con IA", updatedBy: displayName, updatedAt: nowIso() };
      affectedIds.add(employeeId);
      const emp = employees.find(e => e.id === employeeId);
      edits.push({
        id: uid("sel"), employeeId, employeeName: emp?.name || employeeId, date: dateIso,
        before: fmtEntryShort(before) || "(vacío)", after: fmtEntryShort(next[key]) || "(vacío)",
        by: displayName, at: nowIso(), source: "ia",
      });
    });
    notifyCompDaysEarned(scheduleEntries, next, Array.from(affectedIds));
    setScheduleEntries(next);
    await sSet("schedule-entries", next, true);
    logScheduleEdits(edits);
  };

  /**
   * Guarda lo que se sacó de un Excel de horario que el usuario subió desde la pantalla (mismo
   * formato de siempre — ver parseHorarioExcelWorkbook). Crea los empleados que hagan falta
   * (sin cargo asignado si son nuevos del todo, para que el admin lo complete después en
   * "Gestionar empleados") y guarda todos los registros de una sola vez.
   */
  const importScheduleFromParsedExcel = async (parsed) => {
    const { entries, names } = parsed;
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    names.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = { id: uid("emp"), name, cargo: "", fixedRestDay: null, active: true, createdBy: displayName, createdAt: nowIso() };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    entries.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "Importado de Excel", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: entries.length };
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el horario real
   * que se sacó del Excel "11__Horario_Julio2_2026.xlsx": crea los empleados que falten
   * (ya con su cargo asignado) y carga las 396 lecturas de entrada/salida del 16/07 al 02/08/2026.
   */
  const importJulySchedule2026 = async () => {
    const { JULY2026_IMPORT_NAMES, JULY2026_IMPORT_ENTRIES, JULY2026_IMPORT_CARGOS } = await import("./data/julyScheduleImportData.js");
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    JULY2026_IMPORT_NAMES.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = {
          id: uid("emp"), name, cargo: JULY2026_IMPORT_CARGOS[name] || "",
          fixedRestDay: name === "Quintana Jesus Daniel" ? 6 : null,
          active: true, createdBy: displayName, createdAt: nowIso(),
        };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    JULY2026_IMPORT_ENTRIES.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: JULY2026_IMPORT_ENTRIES.length };
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el horario real
   * que se sacó del Excel "12__Horario_Agosto_2026.xlsx": crea los empleados que falten
   * (ya con su cargo asignado) y carga las 601 lecturas de entrada/salida del 03/08 al 30/08/2026.
   * Esta es la base real sobre la que trabaja después el generador de horario con IA (usa estos
   * mismos días como ejemplo del patrón de turnos de cada persona).
   */
  const importAugustSchedule2026 = async () => {
    const { AUGUST2026_IMPORT_NAMES, AUGUST2026_IMPORT_ENTRIES, AUGUST2026_IMPORT_CARGOS } = await import("./data/augustScheduleImportData.js");
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    AUGUST2026_IMPORT_NAMES.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = {
          id: uid("emp"), name, cargo: AUGUST2026_IMPORT_CARGOS[name] || "",
          fixedRestDay: name === "Quintana Jesus Daniel" ? 6 : null,
          active: true, createdBy: displayName, createdAt: nowIso(),
        };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    AUGUST2026_IMPORT_ENTRIES.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: AUGUST2026_IMPORT_ENTRIES.length };
  };

  /** Manda push a los administradores suscritos cuando aparece un equipo dañado NUEVO (no repite si ya estaba). */
  const notifyNewDamagedEquipment = (prevActive, newActiveObj) => {
    if (pushSubscriptions.length === 0) return;
    Object.keys(newActiveObj).filter(k => !prevActive[k]).forEach(k => {
      const issue = newActiveObj[k];
      sendPushToSubscriptions(pushSubscriptions, "⚠ Equipo fuera de servicio", `${issue.name} — ${issue.floorName}`, "/");
    });
  };

  const enablePushNotifications = async () => {
    const sub = await subscribeToPush();
    if (!sub) return { ok: false, message: "No se pudo activar. ¿Le diste permiso a las notificaciones cuando te lo pidió el navegador?" };
    const tagged = { ...sub, ownerUsername: currentUser };
    const next = [...pushSubscriptions.filter(s => s.endpoint !== sub.endpoint), tagged];
    setPushSubscriptions(next);
    await sSet("push-subscriptions", next, true);
    return { ok: true, message: "✓ Notificaciones activadas en este dispositivo." };
  };

  /* ---- Tareas / Pendientes ---- */
  const createTask = async (form) => {
    const id = uid("task");
    const recurrence = form.recurrencia || "";
    const now = nowIso();
    const rec = {
      id, titulo: form.titulo.trim(), descripcion: (form.descripcion || "").trim(),
      estado: "asignada", prioridad: form.prioridad || "media", asignadoA: form.asignadoA || "",
      recurrencia: recurrence, recurrenceGroupId: recurrence ? id : null,
      recurrencePeriodKey: recurrence ? periodKeyFor(new Date(), recurrence) : null,
      fotosAntes: form.fotosAntes || [], fotosDespues: [], notaCierre: "",
      equipoId: form.equipoId || null, origen: form.equipoId ? "cronograma" : "manual",
      assignedAt: form.asignadoA ? now : null, startedAt: null, finishedAt: null,
      timeLog: [{ estado: "asignada", at: now }],
      createdBy: displayName, createdAt: now, updatedAt: now,
    };
    const next = [rec, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({ kind: "tarea", action: "creacion", entityLabel: rec.titulo });
    if (rec.prioridad === "alta" && pushSubscriptions.length > 0) {
      sendPushToSubscriptions(pushSubscriptions, "🔴 Tarea de prioridad alta", rec.titulo, "/");
    }
    // Aviso directo a la persona asignada — antes solo se enteraba si abría la app y la veía en
    // su lista; ahora le llega un push al instante, igual que ya pasa con otras alertas.
    if (rec.asignadoA) {
      const suyas = pushSubscriptions.filter(s => s.ownerUsername === rec.asignadoA);
      if (suyas.length > 0) {
        sendPushToSubscriptions(suyas, "📋 Te asignaron una tarea", rec.titulo, "/");
      }
    }
    return rec;
  };

  /** Avisa por push a cada persona a la que le acaban de asignar trabajo, en UN solo mensaje por
   *  persona (si fueron varias órdenes de golpe, no le llegan 20 notificaciones seguidas). No avisa
   *  a quien hizo la asignación sobre lo que se asignó a sí mismo. `grupos` = { usuario: [títulos] }. */
  const notifyAssignedGroups = (grupos, { hotsos = false } = {}) => {
    if (!pushSubscriptions || pushSubscriptions.length === 0) return;
    Object.entries(grupos).forEach(([username, titulos]) => {
      if (!username || username === currentUser || titulos.length === 0) return;
      const suyas = pushSubscriptions.filter(s => s.ownerUsername === username);
      if (suyas.length === 0) return;
      const title = titulos.length === 1
        ? (hotsos ? "🛎️ Te asignaron una orden de HotSOS" : "📋 Te asignaron una tarea")
        : (hotsos ? `🛎️ Te asignaron ${titulos.length} órdenes de HotSOS` : `📋 Te asignaron ${titulos.length} tareas`);
      const body = titulos.length === 1 ? titulos[0] : titulos.slice(0, 3).join(" · ") + (titulos.length > 3 ? ` y ${titulos.length - 3} más` : "");
      sendPushToSubscriptions(suyas, title, body, "/");
    });
  };

  /** Convierte filas ya revisadas del Excel de HotSOS en tareas — reconstruye la fecha real de
   *  apertura usando la "Edad" que trae HotSOS (no la fecha de hoy, que es solo cuándo se
   *  importó), y prioriza alto automáticamente lo que ya lleva más de 2 días abierto. */
  const importHotsosOrders = async (rowsToImport) => {
    const importedAt = nowIso();
    const newRecs = rowsToImport.map(r => {
      const createdAt = new Date(Date.now() - r.edadHoras * 3600000).toISOString();
      const id = uid("task");
      const prioBase = r.edadHoras > 48 ? "alta" : r.edadHoras > 12 ? "media" : "baja";
      const prioFinal = r.reincidencia ? (prioBase === "baja" ? "media" : "alta") : prioBase; // una reincidencia sube un nivel
      return {
        id, titulo: r.problema, descripcion: `${r.lugar} — orden HotSOS #${r.orderId} (categoría sugerida: ${r.categoria})`,
        reincidencia: r.reincidencia || null,
        estado: "asignada", prioridad: prioFinal,
        asignadoA: r.matchedUser || "",
        recurrencia: "", recurrenceGroupId: null, recurrencePeriodKey: null,
        fotosAntes: [], fotosDespues: [], notaCierre: "",
        equipoId: r.matchedEquipoId || null, origen: "hotsos", hotsosOrderId: r.orderId, hotsosAsignadoOriginal: r.asignadoHotsos || "",
        assignedAt: r.matchedUser ? createdAt : null, startedAt: null, finishedAt: null,
        timeLog: [{ estado: "asignada", at: createdAt }],
        createdBy: displayName, createdAt, updatedAt: importedAt,
      };
    });
    const next = [...newRecs, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({ kind: "tarea", action: "creacion", entityLabel: `${newRecs.length} orden(es) importadas de HotSOS` });
    {
      const grupos = {};
      newRecs.forEach(t => { if (t.asignadoA) (grupos[t.asignadoA] ||= []).push(t.titulo); });
      notifyAssignedGroups(grupos, { hotsos: true });
    }
    return newRecs.length;
  };

  /** Vuelve a intentar el cruce de nombres en tareas de HotSOS que quedaron sin asignar — útil
   *  cuando se mejora la lógica de cruce después de haber importado, o cuando se crean cuentas
   *  nuevas después de la importación. Solo funciona en tareas que sí guardaron el nombre
   *  original de HotSOS (hotsosAsignadoOriginal) — las importadas antes de que ese campo
   *  existiera no se pueden recuperar así, hay que reimportarlas desde el Excel. */
  const retryHotsosAssignments = async () => {
    const ts = nowIso();
    let fixed = 0;
    const grupoReintento = {};
    const next = tasks.map(t => {
      if (t.origen !== "hotsos" || t.asignadoA || !t.hotsosAsignadoOriginal) return t;
      const matched = matchHotsosAssignee(t.hotsosAsignadoOriginal, profiles);
      if (!matched) return t;
      fixed++;
      (grupoReintento[matched] ||= []).push(t.titulo);
      return { ...t, asignadoA: matched, assignedAt: t.assignedAt || ts, timeLog: [...(t.timeLog || []), { estado: normalizeTaskState(t.estado), at: ts, nota: "Asignación reintentada" }] };
    });
    if (fixed > 0) { setTasks(next); await sSet("tasks", next, true); notifyAssignedGroups(grupoReintento, { hotsos: true }); }
    return fixed;
  };

  /** Borra en bloque TODAS las tareas que vinieron de una importación de HotSOS (y solo esas —
   *  nunca toca tareas creadas a mano ni de ningún otro origen) — pensado para el caso de
   *  reimportar desde cero cuando algo quedó mal la primera vez, sin tener que borrar tarea por
   *  tarea a mano. Las manda a la papelera, no las borra para siempre. */
  const bulkDeleteHotsosTasks = async () => {
    const toRemove = tasks.filter(t => t.origen === "hotsos");
    if (toRemove.length === 0) return 0;
    await Promise.all(toRemove.map(t => moveToTrash("task", t)));
    const next = tasks.filter(t => t.origen !== "hotsos");
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({ kind: "tarea", action: "eliminacion", entityLabel: `${toRemove.length} tarea(s) importadas de HotSOS (borrado en bloque para reimportar)` });
    return toRemove.length;
  };

  /** Crea varias tareas con una sola escritura (createTask usa la lista vieja de tareas y, en un
   *  ciclo, cada una pisaría a la anterior). Cada item: { titulo, descripcion, prioridad, asignadoA, checklist, origen, roomKey }. */
  const createTasksBatch = async (items) => {
    const now = nowIso();
    const recs = items.map(f => ({
      id: uid("task"), titulo: f.titulo, descripcion: f.descripcion || "",
      estado: "asignada", prioridad: f.prioridad || "baja", asignadoA: f.asignadoA || "",
      recurrencia: "", recurrenceGroupId: null, recurrencePeriodKey: null,
      fotosAntes: [], fotosDespues: [], notaCierre: "",
      checklist: (f.checklist || []).map(text => ({ id: uid("chk"), text, done: false })),
      equipoId: null, origen: f.origen || "manual", roomKey: f.roomKey || null,
      assignedAt: f.asignadoA ? now : null, startedAt: null, finishedAt: null,
      timeLog: [{ estado: "asignada", at: now }],
      createdBy: displayName, createdAt: now, updatedAt: now,
    }));
    if (recs.length === 0) return 0;
    const next = [...recs, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({ kind: "tarea", action: "creacion", entityLabel: `${recs.length} tarea(s) de preventivo por habitación` });
    const grupos = {};
    recs.forEach(r => { if (r.asignadoA) (grupos[r.asignadoA] ||= []).push(r.titulo); });
    notifyAssignedGroups(grupos);
    return recs.length;
  };

  /** Revisa las tareas que se repiten: si ya empezó un nuevo periodo (semana/mes) y no hay una instancia de ese ciclo, crea una nueva copia en "asignada". */
  const checkRecurringTasks = async () => {
    const templates = tasks.filter(t => t.recurrencia && t.recurrenceGroupId);
    const groups = {};
    templates.forEach(t => { (groups[t.recurrenceGroupId] ||= []).push(t); });

    const now = new Date();
    const nowStr = nowIso();
    const newOnes = [];
    Object.values(groups).forEach(group => {
      const latest = group.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
      const currentKey = periodKeyFor(now, latest.recurrencia);
      if (latest.recurrencePeriodKey === currentKey) return; // ya hay una tarea de este ciclo
      newOnes.push({
        id: uid("task"), titulo: latest.titulo, descripcion: latest.descripcion,
        estado: "asignada", prioridad: latest.prioridad, asignadoA: latest.asignadoA,
        recurrencia: latest.recurrencia, recurrenceGroupId: latest.recurrenceGroupId, recurrencePeriodKey: currentKey,
        fotosAntes: [], fotosDespues: [], notaCierre: "",
        equipoId: latest.equipoId || null, origen: latest.origen || "manual",
        assignedAt: latest.asignadoA ? nowStr : null, startedAt: null, finishedAt: null,
        timeLog: [{ estado: "asignada", at: nowStr }],
        createdBy: latest.createdBy, createdAt: nowStr, updatedAt: nowStr,
      });
    });
    if (newOnes.length === 0) return;
    const next = [...newOnes, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
  };

  /** Anota quién hizo cada cambio en la cronología de la tarea: a las entradas nuevas de timeLog les pone
   *  el nombre de quien está usando la app, y si solo cambió la persona asignada deja una entrada "Reasignada a …". */
  const withActor = (before, patch) => {
    const prev = (before && before.timeLog) || [];
    if (patch.timeLog && patch.timeLog.length > prev.length) {
      return { ...patch, timeLog: patch.timeLog.map((e, i) => (i >= prev.length && !e.by ? { ...e, by: displayName } : e)) };
    }
    if (before && !patch.timeLog && patch.asignadoA !== undefined && patch.asignadoA !== before.asignadoA) {
      const nuevo = profiles?.[patch.asignadoA]?.display_name || patch.asignadoA || "nadie";
      return { ...patch, timeLog: [...prev, { estado: normalizeTaskState(patch.estado || before.estado), at: nowIso(), nota: `Reasignada a ${nuevo}`, by: displayName }] };
    }
    return patch;
  };

  const updateTask = async (id, patch) => {
    const before = tasks.find(t => t.id === id);
    patch = withActor(before, patch);
    // Una orden que el administrador devolvió y vuelve a cerrarse: se marca y se le avisa (una sola vez).
    const reCierre = !!(before && before.devueltaAt && !before.reCerradaAt && patch.estado && normalizeTaskState(patch.estado) === "finalizada" && normalizeTaskState(before.estado) !== "finalizada");
    if (reCierre) patch = { ...patch, reCerradaAt: nowIso() };
    const next = tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t);
    setTasks(next);
    await sSet("tasks", next, true);
    if (before && patch.estado && patch.estado !== before.estado) {
      logGeneralEdit({
        kind: "tarea", entityLabel: before.titulo, field: "Estado",
        before: TASK_STATES.find(s => s.code === normalizeTaskState(before.estado))?.label || before.estado,
        after: TASK_STATES.find(s => s.code === normalizeTaskState(patch.estado))?.label || patch.estado,
      });
    }
    if (before && patch.prioridad && patch.prioridad !== before.prioridad) {
      logGeneralEdit({ kind: "tarea", entityLabel: before.titulo, field: "Prioridad", before: before.prioridad, after: patch.prioridad });
    }
    if (before && patch.asignadoA !== undefined && patch.asignadoA !== before.asignadoA) {
      logGeneralEdit({
        kind: "tarea", entityLabel: before.titulo, field: "Asignado a",
        before: profiles?.[before.asignadoA]?.display_name || before.asignadoA || "Sin asignar",
        after: profiles?.[patch.asignadoA]?.display_name || patch.asignadoA || "Sin asignar",
      });
    }
    // Si la reasignaron a alguien nuevo (no solo se creó), le llega el mismo push directo.
    if (before && patch.asignadoA && patch.asignadoA !== before.asignadoA && pushSubscriptions.length > 0) {
      const suyas = pushSubscriptions.filter(s => s.ownerUsername === patch.asignadoA);
      if (suyas.length > 0) sendPushToSubscriptions(suyas, "📋 Te asignaron una tarea", before.titulo, "/");
    }
    if (reCierre && pushSubscriptions.length > 0) {
      const admins = pushSubscriptions.filter(s => profiles?.[s.ownerUsername]?.is_admin && s.ownerUsername !== currentUser);
      if (admins.length > 0) sendPushToSubscriptions(admins, "✅ Orden devuelta, cerrada de nuevo", before.titulo, "/");
    }
  };

  /** Igual que updateTask, pero para varias tareas a la vez (acciones masivas del panel de
   *  Tareas — mover, reasignar, cambiar prioridad de una selección). Aplica todos los cambios
   *  en un solo `map`/`setTasks`/`sSet` en vez de llamar a updateTask una vez por tarea: antes,
   *  llamar a updateTask en un ciclo hacía que cada llamada partiera del MISMO arreglo "tasks"
   *  (el de cuando se abrió el panel), así que cada guardado sobreescribía por completo la lista
   *  con solo SU propio cambio — perdiendo en silencio los cambios de las tareas anteriores del
   *  mismo lote. patchesById: { [taskId]: { ...camposACambiar } }. */
  const updateTasksBatch = async (patchesById) => {
    const ts = nowIso();
    const ids = Object.keys(patchesById);
    if (ids.length === 0) return;
    const befores = {};
    ids.forEach(id => { befores[id] = tasks.find(t => t.id === id); });
    const next = tasks.map(t => patchesById[t.id] ? { ...t, ...withActor(t, patchesById[t.id]), updatedAt: ts } : t);
    setTasks(next);
    await sSet("tasks", next, true);
    ids.forEach(id => {
      const before = befores[id];
      const patch = patchesById[id];
      if (before && patch.estado && patch.estado !== before.estado) {
        logGeneralEdit({
          kind: "tarea", entityLabel: before.titulo, field: "Estado",
          before: TASK_STATES.find(s => s.code === normalizeTaskState(before.estado))?.label || before.estado,
          after: TASK_STATES.find(s => s.code === normalizeTaskState(patch.estado))?.label || patch.estado,
        });
      }
      if (before && patch.asignadoA && patch.asignadoA !== before.asignadoA && pushSubscriptions.length > 0) {
        const suyas = pushSubscriptions.filter(s => s.ownerUsername === patch.asignadoA);
        if (suyas.length > 0) sendPushToSubscriptions(suyas, "📋 Te asignaron una tarea", before.titulo, "/");
      }
    });
  };

  /** Agrega un comentario al hilo de una tarea — para dejar contexto sin tener que cambiar de
   *  estado ("le falta el repuesto", "ya lo vio mantenimiento", etc.). Si el texto trae @alguien
   *  y ese "alguien" coincide con una cuenta real, le llega una notificación directa. */
  const addTaskComment = async (taskId, text, fotos = []) => {
    const clean = (text || "").trim();
    if (!clean && (!fotos || fotos.length === 0)) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const mentioned = [];
    Object.entries(profiles || {}).forEach(([uname, acc]) => {
      const first = (acc.display_name || "").split(" ")[0];
      if (first && first.length > 2 && clean.toLowerCase().includes(`@${first.toLowerCase()}`)) mentioned.push(uname);
    });
    const comment = { id: uid("cmt"), text: clean, by: displayName, byUsername: currentUser, at: nowIso(), mentions: mentioned, fotos: fotos || [] };
    const next = tasks.map(t => t.id === taskId ? { ...t, comments: [...(t.comments || []), comment] } : t);
    setTasks(next);
    await sSet("tasks", next, true);
    if (mentioned.length > 0 && pushSubscriptions.length > 0) {
      const suyas = pushSubscriptions.filter(s => mentioned.includes(s.ownerUsername) && s.ownerUsername !== currentUser);
      if (suyas.length > 0) sendPushToSubscriptions(suyas, `💬 ${displayName} te mencionó`, `En "${task.titulo}": ${clean || "📷 foto"}`, "/");
    }
  };

  /** Pasa todas las tareas abiertas (no finalizadas) de una persona a otra de un jalón — por
   *  ejemplo si alguien sale de vacaciones o cambia de turno fijo. Deja registro en la
   *  cronología de cada tarea y en el historial de auditoría general. */
  const transferTasks = async (fromUsername, toUsername) => {
    const ts = nowIso();
    const toMove = tasks.filter(t => t.asignadoA === fromUsername && normalizeTaskState(t.estado) !== "finalizada");
    if (toMove.length === 0) return 0;
    const next = tasks.map(t => {
      if (t.asignadoA !== fromUsername || normalizeTaskState(t.estado) === "finalizada") return t;
      return { ...t, asignadoA: toUsername, assignedAt: ts, updatedAt: ts, timeLog: [...(t.timeLog || []), { estado: normalizeTaskState(t.estado), at: ts, nota: "Traspasada a otra persona" }] };
    });
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({
      kind: "tarea", action: "edicion", entityLabel: `${toMove.length} tarea${toMove.length === 1 ? "" : "s"}`,
      field: "Asignado a", before: profiles[fromUsername]?.display_name || fromUsername, after: profiles[toUsername]?.display_name || toUsername,
    });
    notifyAssignedGroups({ [toUsername]: toMove.map(t => t.titulo) });
    return toMove.length;
  };

  /* ---- Herramientas (distinto a repuestos: se prestan y devuelven, no se consumen) ---- */
  const createTool = async (form) => {
    const rec = { id: uid("tool"), nombre: form.nombre.trim(), categoria: (form.categoria || "").trim(), nota: (form.nota || "").trim(), estado: "disponible", prestadaA: null, prestadaDesde: null, createdBy: displayName, createdAt: nowIso() };
    const next = [...tools, rec];
    setTools(next);
    await sSet("tools", next, true);
    return rec;
  };

  const lendTool = async (toolId, toUsername) => {
    const next = tools.map(t => t.id === toolId ? { ...t, estado: "prestada", prestadaA: toUsername, prestadaDesde: nowIso() } : t);
    setTools(next);
    await sSet("tools", next, true);
  };

  const returnTool = async (toolId) => {
    const next = tools.map(t => t.id === toolId ? { ...t, estado: "disponible", prestadaA: null, prestadaDesde: null } : t);
    setTools(next);
    await sSet("tools", next, true);
  };

  /* ---- Visitas de contratistas: el contratista firma solo, como una bitácora de portería ---- */
  const createContractorVisit = async (form) => {
    const rec = {
      id: uid("visita"), empresa: form.empresa.trim(), contacto: form.contacto.trim(),
      telefono: (form.telefono || "").trim(), motivo: form.motivo, equipoNota: (form.equipoNota || "").trim(),
      autorizadoPor: form.autorizadoPor || "", placaVehiculo: (form.placaVehiculo || "").trim(),
      firmaEntrada: form.firma, horaEntrada: nowIso(), horaSalida: null, firmaSalida: null,
    };
    const next = [rec, ...contractorVisits];
    setContractorVisits(next);
    await sSet("contractor-visits", next, true);
    return rec;
  };

  const checkOutContractorVisit = async (visitId, firmaSalida, costo = null) => {
    const next = contractorVisits.map(v => v.id === visitId ? { ...v, horaSalida: nowIso(), firmaSalida, costo: costo || null } : v);
    setContractorVisits(next);
    await sSet("contractor-visits", next, true);
  };

  const deleteContractorVisit = async (visitId) => {
    const next = contractorVisits.filter(v => v.id !== visitId);
    setContractorVisits(next);
    await sSet("contractor-visits", next, true);
  };

  /* ---- Wiki interna: páginas de consulta rápida, cualquiera lee, solo admin edita ---- */
  const saveWikiPage = async (form, existingId) => {
    let next;
    if (existingId) {
      next = wikiPages.map(p => p.id === existingId ? { ...p, titulo: form.titulo.trim(), categoria: form.categoria.trim(), contenido: form.contenido, updatedAt: nowIso(), updatedBy: displayName } : p);
    } else {
      const rec = { id: uid("wiki"), titulo: form.titulo.trim(), categoria: form.categoria.trim(), contenido: form.contenido, createdBy: displayName, createdAt: nowIso(), updatedAt: nowIso(), updatedBy: displayName };
      next = [rec, ...wikiPages];
    }
    setWikiPages(next);
    await sSet("wiki-pages", next, true);
  };

  const deleteWikiPage = async (pageId) => {
    const next = wikiPages.filter(p => p.id !== pageId);
    setWikiPages(next);
    await sSet("wiki-pages", next, true);
  };

  /* ---- Campos obligatorios configurables por admin al registrar un mantenimiento ---- */
  const updateMttoRequiredFields = async (patch) => {
    const next = { ...mttoRequiredFields, ...patch };
    setMttoRequiredFields(next);
    await sSet("mtto-required-fields", next, true);
  };

  /* ---- Habitaciones: tipos (con sus accesorios) y bloqueos con motivo ---- */
  const createRoomType = async (form) => {
    const rec = {
      id: uid("rtype"), codigo: form.codigo.trim(), nombre: form.nombre.trim(),
      accesorios: (form.accesorios || "").split(",").map(a => a.trim()).filter(Boolean),
      createdBy: displayName, createdAt: nowIso(),
    };
    const next = [...roomTypes, rec];
    setRoomTypes(next);
    await sSet("room-types", next, true);
    return rec;
  };

  const blockRoom = async (form) => {
    const rec = {
      id: uid("rblock"), habitacion: form.habitacion.trim(), tipoCodigo: form.tipoCodigo || "", motivo: form.motivo, nota: (form.nota || "").trim(),
      estado: "bloqueada", bloqueadaDesde: nowIso(), liberadaEn: null,
      createdBy: displayName, createdAt: nowIso(),
    };
    const next = [rec, ...roomBlocks];
    setRoomBlocks(next);
    await sSet("room-blocks", next, true);
    logGeneralEdit({ kind: "habitacion", action: "creacion", entityLabel: `Habitación ${rec.habitacion} (${rec.motivo})` });
    return rec;
  };

  const unblockRoom = async (id) => {
    const item = roomBlocks.find(b => b.id === id);
    const next = roomBlocks.map(b => b.id === id ? { ...b, estado: "liberada", liberadaEn: nowIso() } : b);
    setRoomBlocks(next);
    await sSet("room-blocks", next, true);
    if (item) logGeneralEdit({ kind: "habitacion", action: "edicion", entityLabel: `Habitación ${item.habitacion}`, field: "Estado", before: "Bloqueada", after: "Liberada" });
  };

  /* ---- Diagramas de sistemas (chillers, torres, bombas) y sus secuencias paso a paso ---- */
  const createSystemDiagram = async (form) => {
    let imagenUrl = null;
    if (form.imageFile) imagenUrl = await uploadPhoto(form.imageFile, "diagram");
    const rec = { id: uid("diag"), nombre: form.nombre, imagenUrl, componentes: form.componentes || [], createdBy: displayName, createdAt: nowIso() };
    const next = [...systemDiagrams, rec];
    setSystemDiagrams(next);
    await sSet("system-diagrams", next, true);
    return rec;
  };

  const deleteSystemDiagram = async (id) => {
    const nextDiagrams = systemDiagrams.filter(d => d.id !== id);
    const nextProcs = systemProcedures.filter(p => p.diagramId !== id);
    setSystemDiagrams(nextDiagrams);
    setSystemProcedures(nextProcs);
    await Promise.all([sSet("system-diagrams", nextDiagrams, true), sSet("system-procedures", nextProcs, true)]);
  };

  const createSystemProcedure = async (form) => {
    const rec = { id: uid("proc"), diagramId: form.diagramId, nombre: form.nombre, color: form.color, pasos: form.pasos, createdBy: displayName, createdAt: nowIso() };
    const next = [...systemProcedures, rec];
    setSystemProcedures(next);
    await sSet("system-procedures", next, true);
    return rec;
  };

  const deleteSystemProcedure = async (id) => {
    const next = systemProcedures.filter(p => p.id !== id);
    setSystemProcedures(next);
    await sSet("system-procedures", next, true);
  };

  /** Guarda dónde está un componente dentro de la imagen del plano (en % del ancho/alto), para
   *  poder dibujar su marcador tocable encima del diagrama. */
  const setComponentPosition = async (diagramId, codigo, x, y) => {
    const next = systemDiagrams.map(d => d.id !== diagramId ? d : {
      ...d, componentes: d.componentes.map(c => c.codigo === codigo ? { ...c, x, y } : c),
    });
    setSystemDiagrams(next);
    await sSet("system-diagrams", next, true);
  };

  const deleteTask = async (id) => {
    const item = tasks.find(t => t.id === id);
    if (item) {
      const entry = await moveToTrash("task", item);
      logGeneralEdit({ kind: "tarea", action: "eliminacion", entityLabel: item.titulo });
      offerUndo(`Tarea "${item.titulo}" eliminada`, entry.id);
    }
    const next = tasks.filter(t => t.id !== id);
    setTasks(next);
    await sSet("tasks", next, true);
  };

  const saveRound = async (floor, entries, notes) => {
    const ts = nowIso();
    const id = `${floor.id}-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestValues };
    const newActive = { ...activeIssues };
    const newTankHist = { ...tankHistory };
    const newFuelHist = { ...fuelHistory };
    const autoResolved = []; // equipos que se destildaron "Dañado" en esta ronda — se resuelven solos

    for (const item of floor.items) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.ph || e.cloro || e.operador || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n, kind: item.k };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, floorName: floor.name, updatedAt: ts, updatedBy: displayName, shift };

      if (item.tank && e.value !== undefined && e.value !== "") {
        const arr = (newTankHist[item.id] || []).concat([{ value: e.value, at: ts, by: displayName }]).slice(-20);
        newTankHist[item.id] = arr;
      }
      if (item.fuel && e.value !== undefined && e.value !== "") {
        const arr = (newFuelHist[item.id] || []).concat([{ value: e.value, at: ts, by: displayName, shift }]).slice(-30);
        newFuelHist[item.id] = arr;
      }

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: floor.name, floorId: floor.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        // Estaba fuera de servicio y en esta ronda se destildó "Dañado" — se resuelve solo, sin
        // tener que ir aparte a "Fuera de servicio" a darle "Marcar resuelto". El comentario que
        // se haya escrito ahora queda como la solución, para que quede en el historial.
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, floorId: floor.id, floorName: floor.name, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIndex].slice(0, 1000);
    const newHistory = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;

    setRoundsIndex(newIndex); setLatestValues(newLatest); setActiveIssues(newActive); setTankHistory(newTankHist); setFuelHistory(newFuelHist);
    if (autoResolved.length) setIssueHistory(newHistory);
    notifyNewDamagedEquipment(activeIssues, newActive);
    await Promise.all([
      sSet(`round-${id}`, cleanEntries, true),
      sSet("rounds-index", newIndex, true),
      sSet("latest-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("tank-history", newTankHist, true),
      sSet("fuel-history", newFuelHist, true),
      ...(autoResolved.length ? [sSet("issue-history", newHistory, true)] : []),
    ]);

    // --- Entrega de turno: acumula cada piso guardado durante el recorrido actual ---
    const floorIdx = FLOORS.findIndex(f => f.id === floor.id);
    if (floorIdx === 0) tourBufferRef.current = {}; // se reinicia el buffer al empezar por el primer piso

    tourBufferRef.current[floor.id] = {
      floorId: floor.id,
      floorName: floor.name,
      notes,
      itemCount, damagedCount,
      items: floor.items.reduce((acc, item) => {
        const e = entries[item.id];
        if (!e || !(e.status || (e.value !== undefined && e.value !== "") || e.observation || e.ph || e.cloro || e.operador || e.damaged)) return acc;
        const parts = [];
        if (e.status) parts.push(e.status);
        if (e.value !== undefined && e.value !== "") parts.push(`${e.value}${item.u ? " " + item.u : ""}`);
        if (e.ph) parts.push(`PH ${e.ph}`);
        if (e.cloro) parts.push(`Cloro ${e.cloro}`);
        if (e.operador) parts.push(`Operador ${e.operador}`);
        acc.push({ code: item.c, name: item.n, valueStr: parts.join(" · ") || "(sin valor)", damaged: !!e.damaged, observation: e.observation || "" });
        return acc;
      }, []),
    };
    // Se guarda en la nube (por usuario) por si algo interrumpe la sesión antes de terminar el
    // recorrido completo, o si la persona sigue el mismo recorrido desde otro dispositivo.
    sSet(`tour-buffer-${currentUser}`, { date: todayStr(), shift, buffer: tourBufferRef.current }, true).catch(() => {});
    setTourProgressCount(Object.keys(tourBufferRef.current).length);

    // Si se guardó el último piso, el recorrido quedó completo — PERO solo si de verdad se
    // pasó por TODOS los pisos en esta misma sesión (no solo por este). Si alguien entra
    // directo al último piso sin haber hecho los demás, no se deja "cerrar" el recorrido con
    // los datos de un solo piso — se avisa y se manda de vuelta al piso 0 a empezar bien.
    if (floorIdx === FLOORS.length - 1) {
      const floorsDone = FLOORS.map(f => tourBufferRef.current[f.id]).filter(Boolean);
      if (floorsDone.length < FLOORS.length) {
        const faltantes = FLOORS.filter(f => !tourBufferRef.current[f.id]).map(f => f.name).join(", ");
        setRoundSaveMsg({
          ok: false,
          text: `Este piso quedó guardado, pero todavía faltan pisos por revisar en este recorrido: ${faltantes}. Hay que pasar por todos, empezando por el primero, para poder cerrar y enviar la entrega de turno.`,
        });
        setFloorId(FLOORS[0].id);
        return;
      }
      const tourItemCount = floorsDone.reduce((a, f) => a + f.itemCount, 0);
      const tourDamagedCount = floorsDone.reduce((a, f) => a + f.damagedCount, 0);
      // Resumen automático de cierre de turno: además del recorrido piso por piso, se arma un
      // vistazo rápido de cómo queda todo al cerrar — cuántas tareas cerró esta persona en las
      // últimas horas, cuántas quedan abiertas en total, y cuántos daños activos hay — para que
      // el siguiente turno (y quien recibe el correo) no tenga que ir a buscarlo por separado.
      const shiftCutoff = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
      const tasksClosedByMe = tasks.filter(t => normalizeTaskState(t.estado) === "finalizada" && t.asignadoA === currentUser && t.finishedAt && t.finishedAt >= shiftCutoff);
      const shiftSummary = {
        tasksClosedCount: tasksClosedByMe.length,
        tasksClosedTitles: tasksClosedByMe.slice(0, 10).map(t => t.titulo),
        openTasksCount: tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada").length,
        activeIssuesCount: Object.keys(activeIssues || {}).length,
      };
      const tourRec = {
        id: `tour-${Date.now()}`, date: todayStr(), shift, user: displayName, finishedAt: nowIso(),
        floors: floorsDone, itemCount: tourItemCount, damagedCount: tourDamagedCount, shiftSummary,
      };
      const newTourHistory = [tourRec, ...tourHistory].slice(0, 200);
      setLastTour(tourRec);
      setTourHistory(newTourHistory);
      setJustFinished(true);
      setAutoSendResult(null);
      await Promise.all([
        sSet("last-tour", tourRec, true),
        sSet("tour-history", newTourHistory, true),
      ]);
      tourBufferRef.current = {};
      sSet(`tour-buffer-${currentUser}`, null, true).catch(() => {});
      setTourProgressCount(0);
      setResumedTour(false);
      // El recorrido quedó completo — se regresa al primer piso, en vez de dejarlo parado en el
      // último. Así, si alguien vuelve a entrar más tarde, tiene que pasar por todos los pisos de
      // nuevo (verificando de verdad, no solo el que estaba fuera de servicio) para poder armar
      // otra entrega de turno, en vez de quedarle fácil "reenviar" solo tocando el último piso.
      setFloorId(FLOORS[0].id);
      setView("handoff");

      // Envío automático real: si hay un correo configurado, se manda solo, con el PDF
      // adjunto, sin que nadie tenga que tocar nada. Si falla (sin internet, backend sin
      // configurar, etc.) queda registrado y el técnico puede reintentarlo desde la pantalla.
      if (reportEmail) {
        sendTourEmailAuto(reportEmail, tourRec, account.signature, mySignerCargo).then(async (res) => {
          setAutoSendResult(res);
          await logSentReport({ to: reportEmail, method: "Entrega de turno (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: displayName, sentAt: nowIso() });
        });
      }
    }
  };

  const saveColdRound = async (entries, notes, supervisor, ingeniero) => {
    const ts = nowIso();
    const id = `cf-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestColdValues };
    const newActive = { ...activeIssues };
    const autoResolved = [];

    for (const item of ALL_COLD_ROOM_ITEMS) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, updatedAt: ts, updatedBy: displayName, shift };

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: COLD_ROOMS_FLOOR.name, floorId: COLD_ROOMS_FLOOR.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes, supervisor, ingeniero };
    const newIndex = [idxRec, ...coldRoundsIndex].slice(0, 500);

    const sectionOf = (item) => COLD_ROOMS.includes(item) ? "cuartos" : ICE_MACHINES_AB.includes(item) ? "hielo-ab" : "hielo-linos";
    const record = {
      ...idxRec,
      items: ALL_COLD_ROOM_ITEMS.filter(item => cleanEntries[item.id]).map(item => {
        const e = cleanEntries[item.id];
        const parts = [];
        if (e.status) parts.push(e.status);
        if (e.value !== undefined && e.value !== "") parts.push(`${e.value}${item.u ? " " + item.u : ""}`);
        return {
          code: item.c, name: item.n, hint: item.setpoint, section: sectionOf(item),
          valueStr: parts.join(" · ") || "(sin valor)", damaged: !!e.damaged, observation: e.observation || "",
        };
      }),
    };

    const newColdHistory = { ...coldHistory };
    ALL_COLD_ROOM_ITEMS.filter(item => cleanEntries[item.id]).forEach(item => {
      const e = cleanEntries[item.id];
      const hist = (newColdHistory[item.id] || []).concat([{ status: e.status, value: e.value, damaged: !!e.damaged, at: ts, by: displayName }]).slice(-30);
      newColdHistory[item.id] = hist;
    });

    setLatestColdValues(newLatest); setActiveIssues(newActive); setColdRoundsIndex(newIndex);
    notifyNewDamagedEquipment(activeIssues, newActive);
    setLastColdRound(record); setColdHistory(newColdHistory);
    const newIssueHist = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;
    if (autoResolved.length) setIssueHistory(newIssueHist);
    await Promise.all([
      sSet(`cold-round-${id}`, cleanEntries, true),
      sSet("cold-rounds-index", newIndex, true),
      sSet("latest-cold-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("last-cold-round", record, true),
      sSet("cold-history", newColdHistory, true),
      ...(autoResolved.length ? [sSet("issue-history", newIssueHist, true)] : []),
    ]);
    return record;
  };

  /** Guarda una ronda de un "área" genérica (lavandería o gimnasio): mismo patrón que Cuartos Fríos. */
  const saveAreaRound = async (allItems, syntheticFloor, entries, notes, latestVals, setLatestVals, roundsIdx, setRoundsIdx, latestKey, indexKey) => {
    const ts = nowIso();
    const id = `${syntheticFloor.id}-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestVals };
    const newActive = { ...activeIssues };
    const autoResolved = [];

    for (const item of allItems) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, updatedAt: ts, updatedBy: displayName, shift };

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: syntheticFloor.name, floorId: syntheticFloor.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIdx].slice(0, 500);
    const newIssueHist = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;

    setLatestVals(newLatest); setActiveIssues(newActive); setRoundsIdx(newIndex);
    notifyNewDamagedEquipment(activeIssues, newActive);
    if (autoResolved.length) setIssueHistory(newIssueHist);
    await Promise.all([
      sSet(`${syntheticFloor.id}-round-${id}`, cleanEntries, true),
      sSet(indexKey, newIndex, true),
      sSet(latestKey, newLatest, true),
      sSet("active-issues", newActive, true),
      ...(autoResolved.length ? [sSet("issue-history", newIssueHist, true)] : []),
    ]);
    return idxRec;
  };

  const saveLavanderiaRound = (entries, notes) =>
    saveAreaRound(LAVANDERIA_ITEMS, LAVANDERIA_FLOOR, entries, notes, latestLavanderiaValues, setLatestLavanderiaValues,
      lavanderiaRoundsIndex, setLavanderiaRoundsIndex, "latest-lavanderia-values", "lavanderia-rounds-index");

  const saveGymRound = (entries, notes) =>
    saveAreaRound(GYM_ALL_ITEMS, GYM_FLOOR, entries, notes, latestGymValues, setLatestGymValues,
      gymRoundsIndex, setGymRoundsIndex, "latest-gym-values", "gym-rounds-index");

  const saveCalderaRound = async (form) => {
    const ts = nowIso();
    const record = { id: `cald-${Date.now()}`, date: todayStr(), shift, user: displayName, savedAt: ts, ...form };
    const newIndex = [record, ...calderaRoundsIndex].slice(0, 500);
    setCalderaRoundsIndex(newIndex);
    setLastCalderaRound(record);
    await Promise.all([
      sSet("caldera-rounds-index", newIndex, true),
      sSet("last-caldera-round", record, true),
    ]);
    return record;
  };

  const saveMetersRound = async (entries, notes) => {
    const ts = nowIso();
    const id = `mt-${Date.now()}`;
    const cleanEntries = {};
    const newLatest = { ...latestMeterValues };
    const newHistory = { ...meterHistory };
    let itemCount = 0;

    for (const meter of ALL_METERS) {
      const e = entries[meter.id];
      const subs = meter.subs || ["value"];
      const hasContent = e && subs.some(s => e[s] !== undefined && e[s] !== "");
      if (!hasContent) continue;
      itemCount++;

      const prev = newLatest[meter.id] || {};
      const consumos = {};
      subs.forEach(s => {
        if (e[s] !== undefined && e[s] !== "" && prev[s] !== undefined && prev[s] !== "") {
          consumos[s] = Number(e[s]) - Number(prev[s]);
        }
      });

      cleanEntries[meter.id] = { ...e, consumos };
      newLatest[meter.id] = { ...prev, ...e, updatedAt: ts, updatedBy: displayName, shift };

      const hist = (newHistory[meter.id] || []).concat([{ ...e, consumos, at: ts, by: displayName }]).slice(-60);
      newHistory[meter.id] = hist;
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, notes };
    const newIndex = [idxRec, ...meterRoundsIndex].slice(0, 500);

    setLatestMeterValues(newLatest); setMeterHistory(newHistory); setMeterRoundsIndex(newIndex);
    await Promise.all([
      sSet(`meter-round-${id}`, cleanEntries, true),
      sSet("meter-rounds-index", newIndex, true),
      sSet("latest-meter-values", newLatest, true),
      sSet("meter-history", newHistory, true),
    ]);
  };


  const account = profiles[currentUser] || {};
  const displayName = account.display_name || account.email || "—";
  const isAdmin = !!account.is_admin;
  const isAlmacenista = !!account.is_almacenista;
  const isGerencia = !!account.is_gerencia;
  const isViewer = !!account.is_viewer;
  const canManageSchedule = isAdmin || !!account.can_manage_schedule;
  const gerenciaLocked = isGerencia && !isAdmin && !isAlmacenista; // gerencia "pura": solo consulta
  // "Solo ver": a diferencia de Gerencia (que solo ve un puñado de pantallas de KPIs), esta cuenta
  // puede navegar y VER cualquier módulo de la app — pero en las pantallas principales de captura
  // (tareas, rondas, cuartos fríos, medidores, caldera, inventario) no aparecen los botones para
  // crear, editar o cerrar nada, solo para consultar.
  const viewerLocked = isViewer && !isAdmin && !isAlmacenista && !isGerencia;
  // Si esta cuenta está vinculada a un empleado del Horario Mensual (ver Mi Perfil), se usa su
  // cargo para que la firma en los PDF diga "Nombre — Cargo", no solo el nombre suelto.
  const mySignerCargo = employees.find(e => e.id === account.linked_employee_id)?.cargo || null;

  const coldOutOfRange = useMemo(() => computeColdOutOfRange(latestColdValues), [latestColdValues]);
  const meterAnomalies = useMemo(() => computeMeterAnomalies(meterHistory), [meterHistory]);
  const lowStockItems = useMemo(() => computeLowStock(invItems), [invItems]);
  const preventiveOverdueCount = useMemo(() =>
    mttoEquipos.filter(e => e.active !== false && computePreventiveStatus(e, mttoLog).overdue).length,
    [mttoEquipos, mttoLog]);
  const pendingReviewCount = useMemo(() => mttoLog.filter(isPendingReview).length, [mttoLog]);
  const criticalStockItems = useMemo(() => computeCriticalStock(invItems), [invItems]);
  const criticalFuelTanks = useMemo(() => {
    return FUEL_ITEMS.filter(it => it.u === "%").map(it => {
      const v = latestValues[it.id];
      return v && v.value !== undefined && v.value !== "" ? { nombre: `${it.n} (${it.floorName})`, pct: Number(v.value) } : null;
    }).filter(t => t && t.pct <= 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestValues]);
  const aiContextSummary = useMemo(
    () => buildAiContextSummary({ equipos: mttoEquipos, mttoLog, tasks, invItems, activeIssues, mttoCronograma, fuelTanksCritical: criticalFuelTanks }),
    [mttoEquipos, mttoLog, tasks, invItems, activeIssues, mttoCronograma, criticalFuelTanks]
  );
  const hotsosExistingOrderIds = useMemo(() => new Set(tasks.filter(t => t.hotsosOrderId).map(t => t.hotsosOrderId)), [tasks]);
  const hotsosTaskCount = useMemo(() => tasks.filter(t => t.origen === "hotsos").length, [tasks]);
  const pendingAccountsCount = useMemo(() => Object.values(profiles).filter(a => a.approved === false).length, [profiles]);
  // Antes esto se calculaba en línea, sin memoizar, directo en las props de HomeView — se
  // recalculaba en CADA render de toda la app (que es un solo componente gigante), no solo
  // cuando cambiaban las tareas o el historial de mantenimiento.
  const mttoWeekCount = useMemo(() => mttoLog.filter(m => (new Date() - new Date(m.fecha || m.createdAt)) / 864e5 <= 7).length, [mttoLog]);
  const tasksTodayForHome = useMemo(
    () => tasks.filter(t => localDateIso(new Date(t.createdAt)) === localDateIso(new Date()) && (t.asignadoA === currentUser || t.createdBy === displayName)),
    [tasks, currentUser, displayName]
  );
  const openTasksCount = useMemo(() => tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada").length, [tasks]);
  // Tareas mías, sin cerrar, abiertas hace más de 24h — para el acceso rápido "Mis tareas
  // vencidas" en Inicio. Usa el mismo criterio de "vencida" que ya existía en Tareas
  // (Críticas >24h), pero sin exigir prioridad Alta, porque aquí es "lo mío que se está
  // demorando", no una métrica gerencial de criticidad.
  const misTareasVencidas = useMemo(
    () => tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada" && t.asignadoA === currentUser && !t.esperaRepuesto && t.assignedAt && hoursBetween(t.assignedAt, nowIso()) > 24).length,
    [tasks, currentUser]
  );
  const shiftAlerts = useMemo(
    () => computeShiftCompletionAlerts(nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex),
    [nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex]
  );
  const maintenanceDue = useMemo(
    () => computeUpcomingMaintenance(nowClock, mttoEquipos, mttoCronograma),
    [nowClock, mttoEquipos, mttoCronograma]
  );
  const staleIssues = useMemo(() => computeStaleIssues(activeIssues, 15), [activeIssues, nowClock]);

  useEffect(() => {
    if (!isAdmin || pushSubscriptions.length === 0) return;
    const dedupKey = `pm-local:pushed-alerts-${todayStr()}`;
    let already = [];
    try { already = JSON.parse(localStorage.getItem(dedupKey) || "[]"); } catch { /* noop */ }
    const toSend = [];
    shiftAlerts.forEach(a => {
      const tag = `turno:${a.turno}`;
      if (!already.includes(tag)) toSend.push({ tag, title: "⏰ Recorrido pendiente", body: `${a.turno}: ${a.missing.join(", ")}` });
    });
    if (maintenanceDue.items.length > 0) {
      const tag = `mtto:${todayStr()}`;
      if (!already.includes(tag)) toSend.push({ tag, title: "🔧 Mantenimiento por vencer", body: `${maintenanceDue.items.length} equipo(s) del cronograma, quedan ${maintenanceDue.daysLeft} días del mes.` });
    }
    if (toSend.length === 0) return;
    toSend.forEach(t => sendPushToSubscriptions(pushSubscriptions, t.title, t.body, "/"));
    try { localStorage.setItem(dedupKey, JSON.stringify([...already, ...toSend.map(t => t.tag)])); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftAlerts, maintenanceDue, isAdmin, pushSubscriptions]);

  // ---- Respaldo automático programado ----
  // No hay un servidor propio corriendo 24/7 solo para esto, así que el "automático" real es:
  // cuando un admin abre la app y ya pasó una semana desde el último respaldo enviado por correo,
  // se genera solo (sin que nadie toque nada) y se manda al correo de reportes configurado, igual
  // que ya pasa con los demás reportes automáticos (entrega de turno, etc.). Si nadie abre la app
  // en toda una semana, se manda en cuanto alguien vuelva a entrar.
  useEffect(() => {
    if (!isAdmin || !reportEmail || !currentUser) return;
    const KEY = "pm-local:last-auto-backup";
    let last = null;
    try { last = localStorage.getItem(KEY); } catch { /* noop */ }
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (last && (Date.now() - new Date(last).getTime()) < weekMs) return;
    (async () => {
      try {
        const rows = await exportFullBackup();
        const backup = { exportedAt: nowIso(), keyCount: rows.length, data: {} };
        rows.forEach(r => { backup.data[r.key] = r.value; });
        const base64 = bufferToBase64(new TextEncoder().encode(JSON.stringify(backup)));
        const resp = await fetch("/api/send-report", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            to: reportEmail,
            subject: `Respaldo automático semanal - QuinTech (${todayStr()})`,
            text: `Respaldo automático de la app (${rows.length} secciones de datos). Se genera solo cada semana, sin necesidad de que nadie lo pida.`,
            attachmentBase64: base64,
            filename: `respaldo-automatico-${todayStr().replace(/\//g, "-")}.json`,
          }),
        });
        const ok = resp.ok;
        try { localStorage.setItem(KEY, nowIso()); } catch { /* noop */ }
        logSentReport?.({ to: reportEmail, method: "Respaldo automático semanal (correo con JSON)", ok, sentBy: currentUser, sentAt: nowIso() });
      } catch {
        // Sin señal o falló — se reintentará la próxima vez que un admin abra la app.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, reportEmail, currentUser]);

  // ---- Aviso automático de stock mínimo por correo ----
  // Igual que el respaldo automático de arriba: no hay servidor propio corriendo aparte, así que
  // se revisa cada vez que un admin/almacenista abre la app, y si hay repuestos en nivel crítico
  // y no se ha mandado el aviso HOY, se manda solo (sin que nadie lo pida) al correo de reportes.
  useEffect(() => {
    if ((!isAdmin && !isAlmacenista) || !reportEmail || !currentUser) return;
    if (criticalStockItems.length === 0) return;
    const KEY = `pm-local:last-auto-stock-alert-${todayStr()}`;
    let already = null;
    try { already = localStorage.getItem(KEY); } catch { /* noop */ }
    if (already) return;
    (async () => {
      try {
        const lines = criticalStockItems.map(it => `- ${it.name}${it.sku ? ` (${it.sku})` : ""}: quedan ${it.quantity}, mínimo ${it.minThreshold}`).join("\n");
        const resp = await fetch("/api/send-report", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            to: reportEmail,
            subject: `⚠️ Stock mínimo — ${criticalStockItems.length} repuesto(s) crítico(s) (${todayStr()})`,
            text: `Estos repuestos están en nivel crítico de stock (la mitad o menos del mínimo, o ya en cero):\n\n${lines}\n\nEste aviso se genera solo, una vez al día, mientras sigan en ese nivel.`,
          }),
        });
        const ok = resp.ok;
        try { localStorage.setItem(KEY, nowIso()); } catch { /* noop */ }
        logSentReport?.({ to: reportEmail, method: "Aviso automático de stock mínimo (correo)", ok, sentBy: currentUser, sentAt: nowIso() });
      } catch {
        // Sin señal o falló — se reintentará la próxima vez que alguien abra la app hoy mismo.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isAlmacenista, reportEmail, currentUser, criticalStockItems]);

  useEffect(() => {
    if (currentUser) checkRecurringTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ---- Aviso automático de tareas críticas estancadas (>24h sin cerrar) ----
  // No hay servidor propio corriendo aparte (igual que el aviso de stock de arriba), así que esto
  // se revisa una vez al día cuando un administrador abre la app: a cada técnico con una tarea de
  // Prioridad Alta abierta hace más de 24 horas le llega un recordatorio directo, y a los
  // administradores un resumen de cuántas hay.
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const staleCritical = (tasks || []).filter(t => {
      const estado = normalizeTaskState(t.estado);
      return estado !== "finalizada" && t.prioridad === "alta" && t.assignedAt && hoursBetween(t.assignedAt, nowIso()) > 24;
    });
    if (staleCritical.length === 0) return;
    const KEY = `pm-local:last-stale-critical-alert-${todayStr()}`;
    let already = null;
    try { already = localStorage.getItem(KEY); } catch { /* noop */ }
    if (already) return;
    try { localStorage.setItem(KEY, nowIso()); } catch { /* noop */ }
    if (pushSubscriptions.length === 0) return;
    const byAssignee = {};
    staleCritical.forEach(t => { if (t.asignadoA) (byAssignee[t.asignadoA] = byAssignee[t.asignadoA] || []).push(t); });
    Object.entries(byAssignee).forEach(([username, ts]) => {
      const suyas = pushSubscriptions.filter(s => s.ownerUsername === username);
      if (suyas.length > 0) {
        sendPushToSubscriptions(suyas, "🔴 Tienes tareas críticas estancadas",
          ts.length === 1 ? `"${ts[0].titulo}" lleva más de 24h sin cerrarse.` : `${ts.length} tareas de prioridad alta llevan más de 24h sin cerrarse.`, "/");
      }
    });
    const admins = pushSubscriptions.filter(s => profiles?.[s.ownerUsername]?.is_admin);
    if (admins.length > 0) {
      sendPushToSubscriptions(admins, "🔴 Resumen: tareas críticas estancadas",
        `${staleCritical.length} tarea(s) de Prioridad Alta llevan más de 24h abiertas en toda la operación.`, "/tasks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, currentUser, tasks, pushSubscriptions]);

  useEffect(() => {
    if (gerenciaLocked && !GERENCIA_ALLOWED_VIEWS.includes(view)) setView("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gerenciaLocked, view]);

  useEffect(() => {
    if (currentUser && pendingShelfId) setView("inventory");
  }, [currentUser, pendingShelfId]);

  // Atajos del ícono del celular (?go=tasks / ?go=scan) y QR de herramientas que abren la app (?tool=)
  useEffect(() => {
    if (!currentUser) return;
    const go = new URLSearchParams(window.location.search).get("go");
    if (go === "scan") setShowQrScanner(true);
    else if (go === "tasks") setView("tasks");
    if (go || scannedToolId) { try { window.history.replaceState({}, "", window.location.pathname); } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Plantillas de tareas (solo las usa el administrador)
  useEffect(() => {
    if (!isAdmin) return;
    sGet("task-templates", true).then(v => setTaskTemplates(Array.isArray(v) ? v : [])).catch(() => {});
  }, [isAdmin]);
  const saveTaskTemplate = async (tpl) => { const next = [tpl, ...taskTemplates]; setTaskTemplates(next); await sSet("task-templates", next, true); };
  const deleteTaskTemplate = async (id) => { const next = taskTemplates.filter(t => t.id !== id); setTaskTemplates(next); await sSet("task-templates", next, true); };

  // Recordatorio suave (técnico): si hay 3 o más órdenes sin iniciar, avisa como máximo cada 4 horas.
  useEffect(() => {
    if (isAdmin || isGerencia || viewerLocked || !currentUser) return;
    const sinIniciar = tasks.filter(t => t.asignadoA === currentUser && normalizeTaskState(t.estado) === "asignada" && !isTaskSnoozed(t)).length;
    if (sinIniciar < 3) return;
    const KEY = `pm-local:last-reminder:${currentUser}`;
    let last = 0;
    try { last = Number(localStorage.getItem(KEY) || 0); } catch { /* noop */ }
    if (Date.now() - last < 4 * 3600000) return;
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* noop */ }
    showToast(`Tienes ${sinIniciar} órdenes sin iniciar. Revisa Mi trabajo.`, true);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") new Notification("QuinTech", { body: `Tienes ${sinIniciar} órdenes sin iniciar.` });
    } catch { /* noop */ }
  }, [tasks, nowClock]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser && pendingEquipoId) { if (isAdmin) setView("maintenance"); else { setScannedEquipoId(pendingEquipoId); setPendingEquipoId(null); } }
  }, [currentUser, pendingEquipoId]);

  useEffect(() => {
    if (currentUser && pendingDiagramId) setView("procedures");
  }, [currentUser, pendingDiagramId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg }}>
      <div className="p-4 border-b flex items-center gap-3" style={{ background: C.panel, borderColor: C.line }}>
        <div className="pm-skeleton rounded-md" style={{ width: 32, height: 32, background: C.line }} />
        <div className="pm-skeleton rounded-md" style={{ width: 140, height: 16, background: C.line }} />
        <div className="flex-1" />
        <div className="pm-skeleton rounded-full" style={{ width: 32, height: 32, background: C.line }} />
      </div>
      <div className="max-w-5xl w-full mx-auto p-4">
        <div className="pm-skeleton rounded-xl mb-4" style={{ height: 90, background: C.line }} />
        <div className="pm-skeleton rounded-md mb-3" style={{ width: 160, height: 12, background: C.line }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pm-skeleton rounded-lg" style={{ height: 68, background: C.line }} />
          ))}
        </div>
      </div>
    </div>
  );
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="max-w-sm text-center">
        <AlertTriangle size={32} style={{ color: C.red, margin: "0 auto 12px" }} />
        <p className="text-sm mb-4" style={{ color: C.ink }}>{loadError}</p>
        <Button onClick={loadAll}>Reintentar</Button>
      </div>
    </div>
  );
  if (!currentUser) return <AuthScreen onLogin={login} onRegister={register} error={authError} busy={authBusy} />;

  if (!account.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
        <div className="max-w-sm text-center rounded-xl border p-6" style={{ borderColor: C.line, background: C.panel }}>
          <Clock size={32} style={{ color: C.amber, margin: "0 auto 12px" }} />
          <h2 className="text-base font-semibold mb-2" style={{ color: C.ink }}>Cuenta pendiente de aprobación</h2>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            Ya creaste tu cuenta, pero un administrador todavía tiene que aprobarla antes de que puedas usar la app.
            Avísale — puede hacerlo desde el Panel de administrador.
          </p>
          <Button variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
        </div>
      </div>
    );
  }

  // La contraseña se la puso un administrador (reset o cuenta nueva) — se obliga a cambiarla
  // por una propia antes de dejar entrar al resto de la app, para que el admin no quede
  // sabiendo la clave real de la persona de ahí en adelante.
  if (account.must_change_password) {
    return <ForcedPasswordChangeScreen onDone={async () => {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", currentUser);
      setProfiles(m => ({ ...m, [currentUser]: { ...m[currentUser], must_change_password: false } }));
    }} onLogout={logout} />;
  }

  if (printMode) {
    return <PrintableReport activeIssues={activeIssues} issueHistory={issueHistory} roundsIndex={roundsIndex} onClose={() => setPrintMode(false)} />;
  }

  const floor = FLOORS.find(f => f.id === floorId);
  const activeCount = Object.keys(activeIssues).length;

  const NAV_GROUPS = [
    {
      id: "operacion", label: "Operación", items: [
        { id: "ronda", label: "Ronda de revisión", icon: ClipboardList },
        { id: "coldrooms", label: "Cuartos fríos", icon: Snowflake, badge: coldOutOfRange.length },
        { id: "meters", label: "Lecturas de medidores", icon: Zap, badge: meterAnomalies.length },
        { id: "fichas-tecnicas", label: "Fichas técnicas", icon: ClipboardList },
        ...(isAdmin ? [{ id: "maintenance", label: "Mantenimiento", icon: Wrench }] : []),
        ...((isAdmin || isAlmacenista) ? [{ id: "inventory", label: "Inventario", icon: Package, badge: lowStockItems.length, urgentBadge: false }] : []),
        { id: "tasks", label: isAdmin ? "Tareas" : "Mi trabajo", icon: ClipboardCheck, badge: tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada" && (isAdmin || t.asignadoA === currentUser)).length, urgentBadge: false },
        ...(isAdmin ? [{ id: "today", label: "Panel de hoy", icon: Gauge }] : []),
        { id: "issues", label: "Fuera de servicio", icon: Wrench, badge: activeCount },
        { id: "handoff", label: "Entrega de turno", icon: Send, badge: justFinished ? "!" : 0 },
        ...(isAdmin ? [{ id: "hvac", label: "TelkHab", icon: Thermometer }] : []),
        ...(isAdmin ? [{ id: "floorplans", label: "Planos por piso", icon: Layers }] : []),
      ],
    },
    {
      id: "historial", label: "Historial y reportes", items: [
        ...(isAdmin ? [{ id: "maintenance-log", label: "Historial de mantenimientos", icon: History, badge: pendingReviewCount, urgentBadge: pendingReviewCount > 0, pulse: pendingReviewCount > 0 }] : []),
        ...(isAdmin ? [{ id: "maintenance-schedule", label: "Cronograma anual", icon: CalendarDays }] : []),
        { id: "reports", label: "Reportes", icon: History },
        { id: "tanks", label: "Tanques de agua potable", icon: Droplets },
        { id: "fuel", label: "Combustibles y gas", icon: Gauge },
        { id: "contractor-visits", label: "Visitas de contratistas", icon: Users },
        { id: "wiki", label: "Wiki interna", icon: BookOpen },
        { id: "rooms", label: "Habitaciones", icon: Building2 },
        { id: "procedures", label: "Procedimientos", icon: Sparkles },
        ...(isAdmin ? [{ id: "room-history", label: "Historial por habitación", icon: History }] : []),
        ...(isAdmin ? [{ id: "calendar", label: "Calendario de tareas", icon: CalendarDays }] : []),
        ...(isAdmin ? [{ id: "templates", label: "Plantillas de tareas", icon: ClipboardList }] : []),
        ...(isAdmin ? [{ id: "usage", label: "Uso y respaldo", icon: Download }] : []),
        ...(isAdmin ? [{ id: "hotsos-import", label: "Importar HotSOS", icon: Upload }] : []),
        ...(isAdmin ? [{ id: "round-completion", label: "Recorridos completados", icon: ClipboardCheck }] : []),
      ],
    },
    {
      id: "analisis", label: "Análisis", items: [
        ...((isAdmin || isGerencia) ? [{ id: "maintenance-analytics", label: "Análisis de Mantenimiento", icon: TrendingUp }] : []),
        ...((isAdmin || isGerencia) ? [{ id: "executive", label: "Panel Ejecutivo", icon: Gauge }] : []),
        ...((isAdmin || isGerencia) ? [{ id: "analytics", label: "Análisis de fallas", icon: TrendingUp }] : []),
      ],
    },
    {
      id: "personal", label: "Personal", items: [
        { id: "schedules", label: "Horario Mensual", icon: Users },
        { id: "my-schedule", label: "Mi horario", icon: CalendarDays },
        { id: "profile", label: "Mi Perfil", icon: User },
        { id: "changelog", label: "Novedades", icon: Sparkles },
      ],
    },
    ...(isAdmin ? [{
      id: "administracion", label: "Administración", items: [
        { id: "admin", label: "Panel de administrador", icon: ShieldCheck, badge: pendingAccountsCount },
        { id: "trash", label: "Papelera", icon: Trash2, badge: trash.length, urgentBadge: false },
        { id: "general-history", label: "Historial de cambios", icon: History },
      ],
    }] : []),
  ].map(g => ({ ...g, items: g.items.filter(n => !gerenciaLocked || GERENCIA_ALLOWED_VIEWS.includes(n.id)) })).filter(g => g.items.length > 0);

  // Un grupo se abre solo si contiene la pantalla en la que estás — así nunca hay que buscar
  // "¿en qué categoría quedó esto?" a ciegas. Además recuerda qué grupos dejaste abiertos a mano.
  const groupContainingView = NAV_GROUPS.find(g => g.items.some(n => n.id === view))?.id;
  const toggleGroup = (gid) => {
    const next = { ...manuallyToggled, [gid]: !isGroupOpen(gid) };
    setManuallyToggled(next);
    try { localStorage.setItem("pm-local:nav-groups-open", JSON.stringify(next)); } catch { /* noop */ }
  };
  function isGroupOpen(gid) {
    if (gid in manuallyToggled) return manuallyToggled[gid];
    return gid === groupContainingView || gid === "operacion"; // "Operación" abierto por defecto
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: C.bg, fontFamily: "Inter, ui-sans-serif, system-ui", maxWidth: "100vw" }}>
      <ToastHost />
      <SyncStatusBar online={isOnline} pending={pendingSync + pendingPhotoRecords} retrying={retrying} onRetry={async () => { setRetrying(true); await tryFlush(); tryFlushPhotos(); setRetrying(false); }} />
      {/* Franja fija para la barra de estado nativa (hora/batería) — siempre azul oscuro, sin
          importar si la app está en modo claro u oscuro, para que combine con el theme-color
          del manifiesto y no se vea un bloque blanco cortado arriba en iOS. */}
      <div className="fixed top-0 left-0 right-0 z-[200]" style={{ height: "env(safe-area-inset-top)", background: "#132030" }} />
      {showOnboarding && <OnboardingTour onClose={closeOnboarding} />}
      {undoToast && (
        <div className="fixed bottom-36 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-[60] rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: C.steelDark, color: "#fff" }}>
          <span className="text-sm">{undoToast.label}</span>
          <button onClick={async () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            await restoreFromTrash(undoToast.trashId);
            setUndoToast(null);
          }} className="text-sm font-bold px-2 py-1 rounded-md ml-auto" style={{ color: C.amber }}>
            Deshacer
          </button>
        </div>
      )}
      {(isAdmin || isGerencia) && account?.approved && <AiAssistantWidget contextSummary={aiContextSummary} />}
      {showQrScanner && (
        <QrScannerView
          onClose={() => setShowQrScanner(false)}
          onFoundEquipo={(id) => { setShowQrScanner(false); if (isAdmin) { setPendingEquipoId(id); setView("maintenance"); } else setScannedEquipoId(id); }}
          onFoundShelf={(id) => { setPendingShelfId(id); setView("inventory"); setShowQrScanner(false); }}
          onFoundTool={(id) => { setShowQrScanner(false); setScannedToolId(id); }}
        />
      )}
      {scannedToolId && (
        <ScannedToolSheet tool={tools.find(t => t.id === scannedToolId)} accounts={profiles} currentUser={currentUser}
          onClose={() => setScannedToolId(null)} onLend={lendTool} onReturn={returnTool} />
      )}
      {scannedEquipoId && (
        <ScannedEquipoSheet equipo={mttoEquipos.find(e => e.id === scannedEquipoId)} tasks={tasks} accounts={profiles}
          onClose={() => setScannedEquipoId(null)} onGoTasks={() => { setScannedEquipoId(null); setView("tasks"); }} />
      )}
      {roundSaveMsg && !roundSaveMsg.ok && (
        <div className="pm-slide-up-in fixed bottom-0 left-0 right-0 z-[110] flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
          style={{ background: "#a31245" }}>
          <span className="text-sm text-white">⚠ {roundSaveMsg.text}</span>
          <Button size="sm" variant="ghost" onClick={() => setRoundSaveMsg(null)}>Entendido</Button>
        </div>
      )}
      {needRefresh && (
        <div className="pm-slide-up-in fixed bottom-0 left-0 right-0 z-[110] flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
          style={{ background: C.steelDark, borderTop: `2px solid ${C.amber}` }}>
          <span className="text-sm text-white">🔄 Hay una versión nueva de la app lista para usar.</span>
          <Button size="sm" onClick={() => setConfirmUpdateApp(true)}>Actualizar ahora</Button>
        </div>
      )}
      <ConfirmDialog open={confirmUpdateApp} title="Actualizar la app" danger={false} confirmLabel="Sí, actualizar"
        message="Esto va a recargar la app para tomar la versión nueva. Si tienes algo escrito sin guardar (una ronda, una lectura), guárdalo primero."
        onConfirm={() => { setConfirmUpdateApp(false); updateServiceWorker(true); }}
        onCancel={() => setConfirmUpdateApp(false)} />
      {/* Fondo oscuro detrás del menú lateral en celular/tablet — antes no existía, así que al
          abrir el menú el resto de la pantalla se veía igual y parecía que "no pasaba nada" o que
          quedaba trabado; ahora se ve claramente que hay un menú abierto y se puede tocar afuera
          para cerrarlo, como cualquier menú de app. */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-20 transition-opacity duration-200" style={{ background: "rgba(10,14,20,0.5)" }} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      {/* SIDEBAR */}
      <aside className={`fixed lg:static z-20 top-0 left-0 w-64 shrink-0 transition-transform duration-200 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ transitionTimingFunction: "var(--ease-out)", background: C.steel, height: "100vh" }}>
        <style>{`
          .floor-scroll::-webkit-scrollbar { width: 8px; }
          .floor-scroll::-webkit-scrollbar-track { background: transparent; }
          .floor-scroll::-webkit-scrollbar-thumb { background: #3d5674; border-radius: 8px; }
          .floor-scroll::-webkit-scrollbar-thumb:hover { background: #4d6a8a; }
        `}</style>
        <div className="pm-safe-top p-4 border-b shrink-0" style={{ borderColor: "#2a3f56" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="QuinTech" className="w-8 h-8 rounded-md object-cover" />
              <div>
                <div className="text-white text-sm font-semibold leading-tight">QuinTech</div>
                <div className="text-xs" style={{ color: "#8fa3b8" }}>Innovación tecnológica</div>
              </div>
            </div>
            <button className="lg:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium"
              onClick={() => setSidebarOpen(false)} style={{ color: "#c3d0dd", background: "#2a3f56" }}>
              <ChevronRight size={14} /> Volver
            </button>
          </div>
        </div>
        <div className="floor-scroll p-3 space-y-1" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
          <button onClick={() => { setView("home"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-out active:scale-[0.98] mb-2 ${view === "home" ? "" : "hover:bg-white/5 active:bg-white/10"}`}
            style={{ background: view === "home" ? "#2a3f56" : undefined, color: view === "home" ? "#fff" : "#c3d0dd" }}>
            <Home size={16} />
            <span className="flex-1 text-left">Inicio</span>
          </button>

          {NAV_GROUPS.map(group => {
            const open = isGroupOpen(group.id);
            return (
              <div key={group.id} className="mb-0.5">
                <button onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition hover:bg-white/5"
                  style={{ color: "#7d92a8" }}>
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="flex-1 text-left">{group.label}</span>
                </button>
                {open && (
                  <div className="space-y-0.5 mt-0.5 mb-1">
                    {group.items.map(n => (
                      <button key={n.id} onClick={() => { setView(n.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-2 pl-6 pr-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-out active:scale-[0.98] ${view === n.id ? "" : "hover:bg-white/5 active:bg-white/10"}`}
                        style={{ background: view === n.id ? "#2a3f56" : undefined, color: view === n.id ? "#fff" : "#c3d0dd" }}>
                        <n.icon size={15} />
                        <span className="flex-1 text-left">{n.label}</span>
                        <NavBadge count={n.badge} urgent={n.urgentBadge !== false} pulse={n.pulse} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {view === "ronda" && (
          <div className="p-3 pt-2 border-t flex flex-col shrink-0" style={{ borderColor: "#2a3f56", maxHeight: "40vh" }}>
            <div className="text-xs font-semibold uppercase tracking-wide px-2 mb-1 shrink-0" style={{ color: "#8fa3b8" }}>
              Pisos ({FLOORS.length}) — desliza para ver todos
            </div>
            <div className="floor-scroll space-y-0.5 pr-1" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
              {FLOORS.map(f => {
                const dmg = f.items.some(it => activeIssues[it.id]);
                return (
                  <button key={f.id} onClick={() => { setFloorId(f.id); setSidebarOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm shrink-0"
                    style={{ background: floorId === f.id ? "#2a3f56" : "transparent", color: floorId === f.id ? "#fff" : "#a9b8c6" }}>
                    <span>{f.name}</span>
                    {dmg && <AlertTriangle size={13} color={C.amber} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="pm-safe-top flex items-center justify-between px-4 py-3 border-b gap-2 flex-wrap" style={{ background: C.panel, borderColor: C.line }}>
          <button className="hidden sm:flex lg:hidden items-center justify-center" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"} title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"} style={{ minWidth: 44, minHeight: 44 }}>
            <ChevronDown size={20} color={C.ink} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none" }} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
            <Clock size={14} /> {todayStr()}
            {["ronda", "meters", "coldrooms", "fichas-tecnicas"].includes(view) ? (
              <select value={shift} onChange={e => setShift(e.target.value)} className="ml-2 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="ml-2">{nowClock.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {/* En móvil, el turno SÍ hace falta verlo (afecta lo que se registra) aunque se oculte la fecha/hora */}
          {["ronda", "meters", "coldrooms", "fichas-tecnicas"].includes(view) && (
            <select value={shift} onChange={e => setShift(e.target.value)} className="sm:hidden text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {isAdmin && (
            <>
              <GlobalSearch currentView={view} mttoEquipos={mttoEquipos} invItems={invItems} employees={employees} tasks={tasks} wikiPages={wikiPages}
                onNavigate={setView}
                onOpenEquipo={(id) => { setPendingEquipoId(id); setView("maintenance"); }}
                onOpenShelf={(id) => { setPendingShelfId(id); setView("inventory"); }}
                onOpenFloor={(id) => { setFloorId(id); setView("ronda"); }} />
              <button onClick={() => setShowQrScanner(true)} title="Escanear código QR" className="hidden sm:block p-1.5 rounded-md shrink-0" style={{ background: C.bg }}>
                <QrCode size={16} color={C.ink} />
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            <NetworkStatusIndicator pendingCount={pendingSync + pendingPhotoRecords} />
            {pendingSync > 0 && (
              <span className="flex flex-col text-xs font-medium px-2 py-1 rounded-md max-w-[220px]" style={{ background: C.amberSoft, color: C.amber }}>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0" />
                  <button onClick={() => setShowSyncDetail(s => !s)} className="underline decoration-dotted">{pendingSync} sin subir</button>
                  <button
                    onClick={async () => { setRetrying(true); await tryFlush(); setShowSyncDetail(true); setRetrying(false); }}
                    disabled={retrying}
                    className="underline font-semibold disabled:opacity-60 shrink-0"
                    style={{ color: C.amber }}>
                    {retrying ? "Subiendo…" : "Reintentar ahora"}
                  </button>
                </span>
                {showSyncDetail && (
                  <span className="mt-1 text-[10px] font-normal whitespace-normal" style={{ color: C.amber }}>
                    {lastSyncError
                      ? `No se pudo subir "${lastSyncError.key}": ${lastSyncError.message}`
                      : "Sigue guardado en tu celular, esperando a subir. Toca \"Reintentar ahora\" para ver el motivo si sigue fallando."}
                  </span>
                )}
              </span>
            )}
            {pendingPhotoRecords > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.amberSoft, color: C.amber }} title="Registros guardados en este celular con fotos que faltan por subir">
                <Camera size={12} /> {pendingPhotoRecords} foto(s) sin subir
                <button onClick={() => tryFlushPhotos()} className="underline font-semibold" style={{ color: C.amber }}>Reintentar</button>
              </span>
            )}
            {justSynced && pendingSync === 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.greenSoft, color: C.green }}>
                <CheckCircle2 size={12} /> Sincronizado
              </span>
            )}
            {justSyncedPhotos && pendingPhotoRecords === 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.greenSoft, color: C.green }}>
                <CheckCircle2 size={12} /> Fotos sincronizadas
              </span>
            )}
            <button onClick={() => setShowOnboarding(true)} title="Ver guía de bienvenida" className="hidden sm:block p-1.5 rounded-md" style={{ background: C.bg }}>
              <span className="text-xs font-bold w-4 h-4 flex items-center justify-center" style={{ color: C.ink }}>?</span>
            </button>
            <button onClick={toggleTheme} title={darkMode ? "Modo claro" : "Modo oscuro"} className="hidden sm:block p-1.5 rounded-md" style={{ background: C.bg }}>
              {darkMode ? <Sun size={16} color={C.amber} /> : <Moon size={16} color={C.ink} />}
            </button>
            <span className="hidden sm:inline-flex"><PushEnableButton onEnable={enablePushNotifications} /></span>
            {isAdmin && <span className="hidden sm:inline-flex"><NotificationBell alerts={shiftAlerts} maintenanceDue={maintenanceDue} staleIssues={staleIssues} fuelAlerts={criticalFuelTanks} onNavigate={setView} /></span>}
            {isAdmin && (
              <div className="relative hidden sm:block">
                <button onClick={() => setShowSettingsMenu(v => !v)} title="Configuración del sistema" className="p-1.5 rounded-md relative" style={{ background: showSettingsMenu ? C.amberSoft : C.bg }}>
                  <SettingsIcon size={16} color={C.ink} />
                  {pendingAccountsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse" style={{ background: C.red }}>
                      {pendingAccountsCount > 9 ? "9+" : pendingAccountsCount}
                    </span>
                  )}
                </button>
                {showSettingsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-50 py-1" style={{ background: C.panel, borderColor: C.line }}>
                      {[
                        { id: "admin", label: "Panel de administrador", icon: ShieldCheck, badge: pendingAccountsCount },
                        { id: "trash", label: "Papelera", icon: Trash2 },
                        { id: "general-history", label: "Historial de cambios", icon: History },
                        { id: "round-completion", label: "Recorridos completados", icon: ClipboardCheck },
                      ].map(opt => (
                        <button key={opt.id} onClick={() => { setView(opt.id); setShowSettingsMenu(false); }}
                          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.03]" style={{ color: C.ink }}>
                          <opt.icon size={14} color={C.gray} /> {opt.label}
                          {opt.badge > 0 && <NavBadge count={opt.badge} pulse />}
                        </button>
                      ))}
                      <div className="my-1 border-t" style={{ borderColor: C.line }} />
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Uso de la plataforma</div>
                      <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer" onClick={() => setShowSettingsMenu(false)}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.03]" style={{ color: C.ink }}>
                        <Cloud size={14} color={C.gray} /> Panel de Supabase
                      </a>
                      <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" onClick={() => setShowSettingsMenu(false)}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.03]" style={{ color: C.ink }}>
                        <Gauge size={14} color={C.gray} /> Panel de Vercel
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
            {isAdmin && <span className="hidden sm:inline-flex"><Pill tone="amber">Admin</Pill></span>}
            <span className="hidden sm:flex text-sm font-medium items-center gap-1.5" style={{ color: C.ink }}><User size={14} /> {displayName}</span>
            <span className="hidden sm:inline-flex"><Button size="sm" variant="ghost" icon={LogOut} onClick={logout}>Salir</Button></span>
            {/* En móvil: solo el avatar — toca para abrir la pantalla de Perfil con todo consolidado */}
            <button onClick={() => setShowProfileMenu(true)} className="sm:hidden rounded-full flex items-center justify-center shrink-0" style={{ background: isAdmin ? C.amberSoft : C.bg, minWidth: 44, minHeight: 44 }}>
              <User size={16} color={isAdmin ? "#7a5405" : C.ink} />
            </button>
          </div>
        </header>
        {/* Pantalla de Perfil (móvil) — todo lo que en escritorio vive suelto en el header
            (ayuda, modo oscuro, notificaciones, configuración) se consolida aquí para no saturar
            la barra superior en un celular. */}
        {showProfileMenu && (
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col" style={{ background: C.panel }}>
            <div className="pm-safe-top flex items-center gap-2 p-3 border-b" style={{ borderColor: C.line }}>
              <button onClick={() => setShowProfileMenu(false)}><ArrowLeft size={20} color={C.ink} /></button>
              <div className="text-base font-semibold" style={{ color: C.ink }}>Perfil</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: isAdmin ? C.amberSoft : C.bg }}>
                  <User size={22} color={isAdmin ? "#7a5405" : C.ink} />
                </div>
                <div>
                  <div className="text-base font-semibold" style={{ color: C.ink }}>{displayName}</div>
                  {isAdmin && <Pill tone="amber">Admin</Pill>}
                </div>
              </div>

              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.gray }}>General</div>
              <button onClick={() => { setShowOnboarding(true); setShowProfileMenu(false); }} className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                <span className="text-xs font-bold w-4 text-center">?</span> Guía de bienvenida
              </button>
              <button onClick={toggleTheme} className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                {darkMode ? <Sun size={16} color={C.amber} /> : <Moon size={16} color={C.gray} />} {darkMode ? "Modo claro" : "Modo oscuro"}
              </button>
              <button onClick={toggleLargeText} className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                <span className="font-bold" style={{ fontSize: largeText ? 18 : 12 }}>A</span> {largeText ? "Letra normal" : "Letra grande"}
              </button>
              <div className="px-1 py-2 flex items-center gap-2 text-sm" style={{ color: C.ink }}><PushEnableButton onEnable={enablePushNotifications} /> Activar notificaciones</div>
              {isAdmin && (
                <div className="px-1 py-2"><NotificationBell alerts={shiftAlerts} maintenanceDue={maintenanceDue} staleIssues={staleIssues} fuelAlerts={criticalFuelTanks} onNavigate={(v) => { setView(v); setShowProfileMenu(false); }} /></div>
              )}

              {isAdmin && (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.gray }}>Administración</div>
                  {[
                    { id: "admin", label: "Panel de administrador", icon: ShieldCheck, badge: pendingAccountsCount },
                    { id: "trash", label: "Papelera", icon: Trash2 },
                    { id: "general-history", label: "Historial de cambios", icon: History },
                    { id: "round-completion", label: "Recorridos completados", icon: ClipboardCheck },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => { setView(opt.id); setShowProfileMenu(false); }}
                      className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                      <opt.icon size={16} color={C.gray} /> {opt.label}
                      {opt.badge > 0 && <NavBadge count={opt.badge} pulse />}
                    </button>
                  ))}
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.gray }}>Uso de la plataforma</div>
                  <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer" className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                    <Cloud size={16} color={C.gray} /> Panel de Supabase
                  </a>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="w-full text-left px-1 py-2.5 text-sm flex items-center gap-2.5" style={{ color: C.ink }}>
                    <Gauge size={16} color={C.gray} /> Panel de Vercel
                  </a>
                </>
              )}

              <div className="mt-6 pt-4 border-t" style={{ borderColor: C.line }}>
                <Button variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
              </div>
            </div>
          </div>
        )}
        {/* Barra de navegación inferior — solo en móvil. Pensada para usar con una sola mano:
            los 4 destinos más comunes, sin tener que estirar el pulgar hasta arriba. */}
        <nav className="pm-safe-bottom sm:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t" style={{ background: C.panel, borderColor: C.line, boxShadow: "0 -6px 24px rgba(15,34,54,.10)" }}>
          {[
            { id: "home", label: "Inicio", icon: Home, onClick: () => setView("home") },
            { id: "tasks", label: isAdmin ? "Tareas" : "Mi trabajo", icon: ClipboardCheck, onClick: () => setView("tasks") },
            { id: "qr", label: "Escanear", icon: QrCode, onClick: () => setShowQrScanner(true) },
            { id: "profile", label: "Menú", icon: MenuIcon, onClick: () => setSidebarOpen(true) },
          ].map(item => (
            <button key={item.id} onClick={item.onClick} className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-95"
              style={{ color: (item.id === "home" ? view === "home" : item.id === "tasks" && view === "tasks") ? C.amber : C.inkSoft, minHeight: 52 }}>
              {(item.id === "home" ? view === "home" : item.id === "tasks" && view === "tasks") && <span aria-hidden="true" style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 3, borderRadius: "0 0 3px 3px", background: C.amber, boxShadow: `0 0 10px ${C.amber}` }} />}
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <main className="flex-1 p-4 pb-24 sm:pb-8 max-w-5xl w-full mx-auto overflow-x-hidden">
          <div key={view} className="pm-view-in">
          {viewerLocked && (
            <div className="rounded-lg p-2.5 mb-3 flex items-center gap-2 text-xs font-medium" style={{ background: C.bg, border: `1px solid ${C.line}`, color: C.inkSoft }}>
              <Eye size={14} /> Modo solo ver — puedes navegar y consultar todo, pero no vas a ver botones para crear, editar o cerrar nada.
            </div>
          )}
          {view !== "home" && (
            <button onClick={() => setView("home")}
              className="flex items-center gap-1 text-sm mb-3 px-2 py-1 rounded-md lg:hidden"
              style={{ color: C.inkSoft, background: C.panel, border: `1px solid ${C.line}` }}>
              <ArrowLeft size={14} /> Volver a Inicio
            </button>
          )}
          {view === "home" && (() => {
            const goEq = (id) => { setPendingEquipoId(id); setView("maintenance"); };
            const nm = (u) => profiles?.[u]?.display_name || u;
            const homeTop = (
              <>
                <HomeInsights part="top" tasks={tasks} mttoLog={mttoLog} equipos={mttoEquipos} invItems={invItems} currentUser={currentUser} isAdmin={isAdmin}
                  onCreateTask={createTask} viewerLocked={viewerLocked} loginLog={loginLog} navGroups={NAV_GROUPS} nameOf={nm} onNavigate={setView} onOpenEquipo={goEq}
                  extraAlerts={isAdmin ? [
                    <WeekSemaphore key="ws" tasks={tasks} criticalStock={criticalStockItems.length} />,
                    <StorageAlert key="sa" onNavigate={setView} />,
                    <WarrantyAlert key="wa" equipos={mttoEquipos} onOpenEquipo={goEq} />,
                    <PreventiveGoalCard key="pg" mttoLog={mttoLog} equipos={mttoEquipos} onOpenEquipo={goEq} />,
                  ] : null} />
                {!isAdmin && !isGerencia && <MyWeekCard tasks={tasks} currentUser={currentUser} />}
              </>
            );
            const homeBottom = (
              <>
                <HomeInsights part="bottom" tasks={tasks} mttoLog={mttoLog} equipos={mttoEquipos} invItems={invItems} currentUser={currentUser} isAdmin={isAdmin}
                  onCreateTask={createTask} viewerLocked={viewerLocked} loginLog={loginLog} navGroups={NAV_GROUPS} nameOf={nm} onNavigate={setView} onOpenEquipo={goEq} />
                <SetupGuideCard onEnablePush={enablePushNotifications} userKey={currentUser} />
              </>
            );
            return (
            <HomeView topSlot={homeTop} bottomSlot={homeBottom} currentUser={displayName} isAdmin={isAdmin} isAlmacenista={isAlmacenista} isGerencia={isGerencia} onNavigate={setView}
              hasSignature={!!account.signature} onGoToProfile={() => setView("profile")}
              tourProgress={{ done: tourProgressCount, total: FLOORS.length }}
              lowStockDetail={lowStockItems}
              activeIssuesList={Object.values(activeIssues)}
              mttoWeekCount={mttoWeekCount}
              tasksToday={tasksTodayForHome}
              changelogEntries={changelogEntries}
              shiftAlerts={shiftAlerts}
              counts={{ activeIssues: activeCount, lowStock: lowStockItems.length, criticalLowStock: criticalStockItems.length, coldOutOfRange: coldOutOfRange.length, meterAnomalies: meterAnomalies.length, justFinished, openTasks: openTasksCount, pendingAccounts: pendingAccountsCount, preventiveOverdue: preventiveOverdueCount, misTareasVencidas }} />
                      );
          })()}
          {view === "ronda" && (
            <RoundView floor={floor} currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestValues={latestValues} floorIndex={FLOORS.findIndex(f => f.id === floorId)} floorCount={FLOORS.length}
              onGoFloor={(idx) => setFloorId(FLOORS[idx].id)}
              onResolveIssue={resolveIssue} onSaveRound={saveRound}
              tourProgressCount={tourProgressCount} resumedTour={resumedTour} onDismissResumed={() => setResumedTour(false)} />
          )}
          {view === "coldrooms" && (
            <TabbedColdRoomsView currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestColdValues={latestColdValues} onResolveIssue={resolveIssue} onSaveColdRound={saveColdRound}
              reportEmail={reportEmail} onLogSent={logSentReport} lastColdRound={lastColdRound} coldHistory={coldHistory} mySignature={account.signature} />
          )}
          {view === "meters" && (
            <TabbedMetersView currentUser={displayName} shift={shift}
              latestMeterValues={latestMeterValues} onSaveMetersRound={saveMetersRound} meterHistory={meterHistory}
              reportEmail={reportEmail} onLogSent={logSentReport} mySignature={account.signature} />
          )}
          {view === "profile" && (
            <ProfileView currentUser={displayName} mySignature={account.signature} onSaveSignature={updateMySignature}
              employees={employees} linkedEmployeeId={account.linked_employee_id} onSetLinkedEmployee={updateMyLinkedEmployee} onLogoutEverywhere={logoutEverywhere}
              loginHistory={myLoginHistory} />
          )}
          {view === "changelog" && (
            <ChangelogView entries={changelogEntries} isAdmin={isAdmin} currentUser={displayName}
              onAddEntry={addChangelogEntry} onDeleteEntry={deleteChangelogEntry} />
          )}
          {view === "my-schedule" && (
            <MyScheduleView employee={employees.find(e => e.id === account.linked_employee_id)} scheduleEntries={scheduleEntries} onGoToProfile={() => setView("profile")} />
          )}
          {view === "handoff" && (
            <HandoffView lastTour={lastTour} tourHistory={tourHistory} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onLogSent={logSentReport} currentUser={displayName} justFinished={justFinished}
              onAckFinished={() => setJustFinished(false)} autoSendResult={autoSendResult}
              mySignature={account.signature} signerCargo={mySignerCargo} onGoToProfile={() => setView("profile")} />
          )}
          {view === "issues" && <IssuesView activeIssues={activeIssues} onResolve={resolveIssue} onCheckIn={checkInIssue} onAttachPhoto={attachIssuePhoto} />}
          {view === "reports" && (
            <ReportsView issueHistory={issueHistory} roundsIndex={roundsIndex} activeIssues={activeIssues} latestValues={latestValues}
              mttoLog={mttoLog} mttoEquipos={mttoEquipos}
              reportEmail={reportEmail} reportWhatsapp={reportWhatsapp} onOpenPrint={() => setPrintMode(true)}
              sentReports={sentReports} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "tanks" && <TanksView latestValues={latestValues} tankHistory={tankHistory} onSaveTankReading={saveTankReading} currentUser={displayName} />}
          {view === "fuel" && <FuelTanksView latestValues={latestValues} fuelHistory={fuelHistory} onManualUpdate={saveFuelReading} onNavigate={setView} />}
          {view === "tools" && <ToolsView tools={tools} accounts={profiles} isAdmin={isAdmin} onCreateTool={createTool} onLendTool={lendTool} onReturnTool={returnTool} />}
          {view === "contractor-visits" && <ContractorVisitsView visits={contractorVisits} employees={employees} isAdmin={isAdmin} onCreateVisit={createContractorVisit} onCheckOut={checkOutContractorVisit} onDeleteVisit={deleteContractorVisit} />}
          {view === "wiki" && <WikiView pages={wikiPages} isAdmin={isAdmin} onSave={saveWikiPage} onDelete={deleteWikiPage} />}
          {view === "rooms" && <HabitacionesView roomTypes={roomTypes} roomBlocks={roomBlocks} isAdmin={isAdmin} onCreateRoomType={createRoomType} onBlockRoom={blockRoom} onUnblockRoom={unblockRoom} />}
          {view === "procedures" && (
            <ProcedimientosHubView equipos={mttoEquipos} mttoLog={mttoLog}
              diagrams={systemDiagrams} procedures={systemProcedures} isAdmin={isAdmin}
              pendingDiagramId={pendingDiagramId} onConsumedInitialDiagram={() => setPendingDiagramId(null)}
              onCreateDiagram={createSystemDiagram} onDeleteDiagram={deleteSystemDiagram}
              onCreateProcedure={createSystemProcedure} onDeleteProcedure={deleteSystemProcedure}
              onSetComponentPosition={setComponentPosition} />
          )}
          {view === "hotsos-import" && isAdmin && (
            <HotsosImportView accounts={profiles} existingOrderIds={hotsosExistingOrderIds} currentUserDisplayName={displayName} hotsosTaskCount={hotsosTaskCount} equipos={mttoEquipos} openTasks={tasks.filter(t => normalizeTaskState(t.estado) !== "finalizada")} recentClosed={tasks.filter(t => normalizeTaskState(t.estado) === "finalizada" && t.finishedAt && Date.now() - new Date(t.finishedAt).getTime() < 15 * 86400000)}
              onImport={importHotsosOrders} onRetryAssignments={retryHotsosAssignments} onBulkDelete={bulkDeleteHotsosTasks} />
          )}
          {view === "hvac" && isAdmin && (
            <HVACView isAdmin={isAdmin} isGerencia={isGerencia} tasks={tasks} onCreateTask={createTask} onCreateTasksBatch={createTasksBatch} accounts={profiles} />
          )}
          {view === "analytics" && (isAdmin || isGerencia) && (
            <EquipmentAnalyticsView issueHistory={issueHistory} activeIssues={activeIssues}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "inventory" && (isAdmin || isAlmacenista) && (
            <InventoryHubView bodegas={bodegas} shelves={shelves} invItems={invItems} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateBodega={createBodega} onCreateShelf={createShelf} onCreateItem={createInvItem}
              onRetiro={doInvRetiro} onEntrada={doInvEntrada} onEditItem={editInvItem} onImportInventory={importFullInventory}
              onDeleteBodega={deleteBodega} onDeleteShelf={deleteShelf}
              initialShelfId={pendingShelfId} onConsumedInitialShelf={() => setPendingShelfId(null)}
              invMovements={invMovements} reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName}
              tools={tools} accounts={profiles} onCreateTool={createTool} onLendTool={lendTool} onReturnTool={returnTool} viewerLocked={viewerLocked} tasks={tasks} />
          )}
          {view === "maintenance" && isAdmin && (
            <MaintenanceView equipos={mttoEquipos} mttoLog={mttoLog} invItems={invItems} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateEquipo={createMttoEquipo} onImportCatalog={importMaintenanceFull} onLogMaintenance={logMaintenance} onDeleteEquipo={deleteMttoEquipo}
              onSetVideoUrl={setEquipoVideoUrl}
              onSetFrecuencia={setEquipoFrecuencia}
              onSetFotoMaestra={setEquipoFotoMaestra}
              onUpdateEquipoInfo={updateMttoEquipoInfo} tasks={tasks}
              mttoRequiredFields={mttoRequiredFields} onUpdateRequiredFields={updateMttoRequiredFields}
              pendingMaintenanceEquipoIds={pendingMaintenanceEquipoIds}
              initialEquipoId={pendingEquipoId} onConsumedInitialEquipo={() => setPendingEquipoId(null)} viewerLocked={viewerLocked} editLog={generalEditLog} />
          )}
          {view === "maintenance-analytics" && (isAdmin || isGerencia) && (
            <MaintenanceAnalyticsView equipos={mttoEquipos} mttoLog={mttoLog} issueHistory={issueHistory} activeIssues={activeIssues}
              roundsIndex={roundsIndex} coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} />
          )}
          {view === "executive" && (isAdmin || isGerencia) && (
            <ExecutivePanelView equipos={mttoEquipos} mttoLog={mttoLog} roundsIndex={roundsIndex}
              coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} currentUser={displayName} tasks={tasks} accounts={profiles}
              issueHistory={issueHistory} activeIssues={activeIssues} />
          )}
          {view === "maintenance-log" && isAdmin && (
            <MaintenanceLogAuditView equipos={mttoEquipos} mttoLog={mttoLog} isAdmin={isAdmin} onReview={reviewMaintenanceRecord}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName}
              onViewEquipoHistory={(equipoId) => { setPendingEquipoId(equipoId); setView("maintenance"); }} />
          )}
          {view === "maintenance-schedule" && isAdmin && (
            <CronogramaAnualView equipos={mttoEquipos} mttoCronograma={mttoCronograma} mttoLog={mttoLog} invItems={invItems}
              onLogMaintenance={logMaintenance} onUpdateCronograma={updateCronogramaEntry}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "fichas-tecnicas" && (
            <FichasTecnicasHubView currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestLavanderiaValues={latestLavanderiaValues} onSaveLavanderiaRound={saveLavanderiaRound}
              latestGymValues={latestGymValues} onSaveGymRound={saveGymRound}
              onResolveIssue={resolveIssue} onSaveCalderaRound={saveCalderaRound} lastCalderaRound={lastCalderaRound} />
          )}
          {view === "schedules" && (
            <SchedulesView employees={employees} scheduleEntries={scheduleEntries} scheduleEditLog={scheduleEditLog} isAdmin={isAdmin} canManageSchedule={canManageSchedule} currentUser={displayName}
              onCreateEmployee={createEmployee} onUpdateEmployee={updateEmployee} onDeleteEmployee={deleteEmployee} onSetScheduleEntry={setScheduleEntry}
              onImportJuly={importJulySchedule2026} onImportAugust={importAugustSchedule2026} onImportExcel={importScheduleFromParsedExcel} onApplyAiDraft={applyAiScheduleDraft} reportEmail={reportEmail} onLogSent={logSentReport} />
          )}
          {view === "tasks" && (
            <TasksView tasks={tasks} accounts={profiles} employees={employees} scheduleEntries={scheduleEntries} currentUser={displayName} currentUsername={currentUser} isAdmin={isAdmin}
              equipos={mttoEquipos} mttoLog={mttoLog} mttoCronograma={mttoCronograma} invItems={invItems} onLogMaintenance={logMaintenance} onConsumeParts={consumeParts}
              onCreateTask={createTask} onUpdateTask={updateTask} onUpdateTasksBatch={updateTasksBatch} onDeleteTask={deleteTask} onAddTaskComment={addTaskComment}
              mySignature={account.signature} signerCargo={mySignerCargo} pendingTaskCloseIds={pendingTaskCloseIds} viewerLocked={viewerLocked} onGoToProfile={() => setView("profile")} myWorkMode={!isAdmin} />
          )}
          {view === "calendar" && isAdmin && <CalendarView tasks={tasks} accounts={profiles} />}
          {view === "templates" && isAdmin && <TaskTemplatesView templates={taskTemplates} accounts={profiles} onSave={saveTaskTemplate} onDelete={deleteTaskTemplate} onCreate={createTasksBatch} />}
          {view === "usage" && isAdmin && <UsagePanelView tasks={tasks} accounts={profiles} />}
          {view === "floorplans" && isAdmin && (
            <PlanosView tasks={tasks} mttoLog={mttoLog} equipos={mttoEquipos} accounts={profiles} onNavigate={setView} />
          )}
          {view === "room-history" && isAdmin && (
            <RoomHistoryView tasks={tasks} mttoLog={mttoLog} equipos={mttoEquipos} accounts={profiles} />
          )}
          {view === "today" && isAdmin && (
            <TodayBoardView tasks={tasks} accounts={profiles} employees={employees} scheduleEntries={scheduleEntries} onNavigate={setView} onAssign={(id, username) => updateTask(id, { asignadoA: username, assignedAt: nowIso() })} onReview={updateTask} pushSubscriptions={pushSubscriptions} />
          )}
          {((view === "inventory" && !(isAdmin || isAlmacenista)) || (view === "maintenance" && !isAdmin) || (view === "hvac" && !isAdmin)) && (
            <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
              🔒 No tienes acceso a esta sección. Si la necesitas, pídesela al administrador.
            </div>
          )}
          {view === "admin" && isAdmin && (
            <AdminView accounts={profiles} tasks={tasks} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onSaveEmail={saveReportEmail} onSaveWhatsapp={saveReportWhatsapp}
              onToggleAdmin={toggleAdmin} onToggleAlmacenista={toggleAlmacenista} onToggleGerencia={toggleGerencia} onToggleViewer={toggleViewer} onToggleScheduleManager={toggleScheduleManager} onDeleteAccount={deleteAccount} onResetPassword={resetPassword}
              onApproveAccount={approveAccount} onRejectAccount={rejectAccount} onTransferTasks={transferTasks} loginLog={loginLog} currentUsername={currentUser} aiUsageStats={aiUsageStats} />
          )}
          {view === "trash" && isAdmin && (
            <TrashView trash={trash} onRestore={restoreFromTrash} onPurge={purgeFromTrash} />
          )}
          {view === "general-history" && isAdmin && (
            <GeneralHistoryView entries={generalEditLog} />
          )}
          {view === "round-completion" && isAdmin && (
            <RoundCompletionView roundsIndex={roundsIndex} tourHistory={tourHistory} />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}