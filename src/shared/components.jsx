import { AlertTriangle, ClipboardList, Clock, Download, Mic, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { exportFullBackup } from "../lib/storage";
import { BADGE_TONES, C, PCB_CONFIGS, fmtDT, fmtHours, getMaintenanceTemplates, hoursBetween, isTaskSnoozed, normalizeSearchText, normalizeTaskState, nowIso, scrollToItem, showToast, todayStr, useBackCloseModal } from "./core";
import { TitleIco } from "../App";



/** Aviso de "faltan estos equipos", con cada nombre clickeable para saltar directo a esa fila. */
export function PendingItemsAlert({ msg, onClose }) {
  useBackCloseModal(!!msg, onClose);
  if (!msg) return null;
  const jumpTo = (id) => {
    onClose();
    setTimeout(() => scrollToItem(id), 60); // deja que la ventana se cierre antes de saltar, para que se vea bien
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="pm-animate-in rounded-xl max-w-sm w-full p-5 max-h-[80vh] overflow-y-auto" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} color={C.red} />
          <h3 className="text-base font-semibold" style={{ color: C.ink }}>Antes de continuar</h3>
        </div>
        <p className="text-sm mb-3" style={{ color: C.inkSoft }}>{msg.prefix}</p>
        <div className="flex flex-col gap-1.5 mb-4">
          {msg.items.map(it => (
            <button key={it.id} onClick={() => jumpTo(it.id)}
              className="text-left text-sm px-3 py-2 rounded-md font-semibold"
              style={{ background: C.redSoft, color: C.red }}>
              {it.n} →
            </button>
          ))}
        </div>
        {msg.suffix && <p className="text-xs mb-4" style={{ color: C.gray }}>{msg.suffix}</p>}
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
export function Pill({ children, tone = "gray" }) {
  const map = {
    gray: { bg: C.bg, fg: C.inkSoft },
    green: { bg: C.greenSoft, fg: C.green },
    amber: { bg: C.amberSoft, fg: C.amber },
    red: { bg: C.redSoft, fg: C.red },
    blue: { bg: C.blueSoft, fg: C.blue },
  }[tone];
  return (
    <span style={{ background: map.bg, color: map.fg, fontWeight: 600 }}
      className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", disabled, icon: Icon, type = "button" }) {
  const base = "inline-flex items-center gap-1.5 rounded-md font-medium transition duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  const styles = {
    primary: { background: C.steel, color: "#fff" },
    amber: { background: C.amber, color: "#fff" },
    red: { background: C.red, color: "#fff" },
    green: { background: C.green, color: "#fff" },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    subtle: { background: C.bg, color: C.ink },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes}`} style={styles}>
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

/**
 * Reemplazo propio del confirm() nativo del navegador — ese cuadro siempre sale con el estilo del
 * sistema operativo (blanco, sin importar el modo oscuro de la app) y no se puede tocar desde CSS.
 * Este sí respeta el tema y el botón de "atrás" del celular, igual que el resto de los diálogos.
 */
export function ConfirmDialog({ open, title, message, confirmLabel = "Sí, continuar", cancelLabel = "Cancelar", danger = true, onConfirm, onCancel }) {
  useBackCloseModal(open, onCancel);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0" style={{ background: "rgba(10,14,20,0.5)", zIndex: 300 }} onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 w-[90%] max-w-sm rounded-xl border p-4"
        style={{ transform: "translate(-50%, -50%)", background: C.panel, borderColor: C.line, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 301 }}>
        {title && <div className="text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{title}</div>}
        <div className="text-sm mb-4" style={{ color: C.inkSoft }}>{message}</div>
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button size="sm" variant={danger ? "red" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </>
  );
}

function PcbTile({ variant = "login" }) {
  const cfg = PCB_CONFIGS[variant] || PCB_CONFIGS.login;
  const id = "pcb" + variant;
  return (
    <>
      <style>{`
        @keyframes pcbRun{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
        @keyframes pcbNode{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes pcbBlink{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes pcbScan{0%{transform:translateY(-20%)}100%{transform:translateY(120%)}}
        @keyframes pcbBurst{0%{stroke-dashoffset:100;opacity:1}28%{stroke-dashoffset:0;opacity:1}29%,100%{stroke-dashoffset:0;opacity:0}}
        .pcb-run{stroke-dasharray:5 95;animation:pcbRun 4.8s linear infinite}
        .pcb-run.pcb-fast{stroke-dasharray:7 93}
        .pcb-run.pcb-burst{stroke-dasharray:9 91;animation-name:pcbBurst;animation-timing-function:cubic-bezier(.3,.1,.2,1)}
        .pcb-node{animation:pcbNode 3s ease-in-out infinite}
        .pcb-blink{animation:pcbBlink 1.6s steps(2,end) infinite}
        .pcb-auth input::placeholder{color:#8aa2b8}
        .pcb-scan{position:absolute;left:0;right:0;height:160px;background:linear-gradient(180deg,transparent,rgba(56,189,248,.07),transparent);animation:pcbScan 8s linear infinite;pointer-events:none}
        /* Los circuitos son decoración suave: se mueven siempre (en PC con "animaciones desactivadas" del sistema también), pero más lentos y sin parpadeo brusco. */
        @media (prefers-reduced-motion:reduce){.pcb-blink{animation-duration:3.2s}.pcb-scan{display:none}}
      `}</style>
      <svg aria-hidden="true" viewBox={cfg.vb} preserveAspectRatio={cfg.par} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <filter id={id + "g"} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id={id + "grid"} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="rgba(125,211,252,.10)" /></pattern>
          <radialGradient id={id + "glow"} cx="85%" cy="12%" r="75%"><stop offset="0" stopColor="#38bdf8" stopOpacity=".3" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
          <g id={id + "via"}><circle r="5" fill="#06121f" stroke="#d9a441" strokeWidth="1.5" /><circle r="1.7" fill="#38bdf8" /></g>
          <g id={id + "res"}><rect x="-9" y="-3.6" width="18" height="7.2" rx="1" fill="#0b2238" stroke="#5aa9d6" strokeWidth="1" /><rect x="-9" y="-3.6" width="4" height="7.2" fill="#d9a441" /><rect x="5" y="-3.6" width="4" height="7.2" fill="#d9a441" /></g>
          <g id={id + "chip"}>
            <rect x="8" y="0" width="64" height="52" rx="4" fill="#0a1d30" stroke="#5aa9d6" strokeWidth="1.2" />
            <rect x="15" y="7" width="50" height="38" rx="2" fill="rgba(56,189,248,.06)" stroke="rgba(125,211,252,.3)" />
            <path d="M0 10h8M0 16h8M0 22h8M0 28h8M0 34h8M0 40h8M72 10h8M72 16h8M72 22h8M72 28h8M72 34h8M72 40h8M20 -8v8M28 -8v8M36 -8v8M44 -8v8M52 -8v8M60 -8v8M20 52v8M28 52v8M36 52v8M44 52v8M52 52v8M60 52v8" stroke="#d9a441" strokeWidth="2.4" />
            <circle cx="17" cy="9" r="1.8" fill="#7dd3fc" />
            <rect x="32" y="20" width="16" height="12" rx="1" fill="rgba(56,189,248,.25)" className="pcb-blink" />
          </g>
        </defs>
        <rect width={cfg.w} height={cfg.h} fill={`url(#${id}glow)`} />
        <rect width={cfg.w} height={cfg.h} fill={`url(#${id}grid)`} />
        <g fill="none" stroke="rgba(56,189,248,.42)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          {cfg.buses.map((b, i) => b.ys.map(y => <path key={i + "-" + y} d={b.d} transform={`translate(0 ${y})`} />))}
          {cfg.traces.map((d, i) => <path key={"t" + i} d={d} />)}
        </g>
        <g fill="none" stroke="#9be0ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}g)`}>
          {cfg.pulses.map((p, i) => { const k = i % 3; return <path key={i} className={"pcb-run" + (k === 1 ? " pcb-fast" : k === 2 ? " pcb-burst" : "")} pathLength="100" d={p.d} transform={p.tr} style={{ animationDuration: (k === 1 ? p.t * 0.45 : k === 2 ? p.t * 1.5 : p.t) + "s", animationDelay: p.o + "s" }} />; })}
        </g>
        {cfg.chips.map(([x, y], i) => <use key={"c" + i} href={`#${id}chip`} x={x} y={y} />)}
        {cfg.res.map(([x, y, r], i) => <use key={"r" + i} href={`#${id}res`} x={x} y={y} transform={r ? `rotate(${r} ${x} ${y})` : undefined} />)}
        {cfg.caps.map(([x, y], i) => (
          <g key={"k" + i}><rect x={x} y={y} width="14" height="8" rx="1" fill="#0b2238" stroke="#5aa9d6" strokeWidth="1" /><rect x={x} y={y} width="3.4" height="8" fill="#d9a441" /><rect x={x + 10.6} y={y} width="3.4" height="8" fill="#d9a441" /></g>
        ))}
        {cfg.vias.map(([x, y], i) => <use key={"v" + i} href={`#${id}via`} x={x} y={y} />)}
        <g fill="#38bdf8">{cfg.nodes.map(([x, y, d], i) => <circle key={i} className="pcb-node" cx={x} cy={y} r="2.2" style={{ animationDelay: d + "s" }} />)}</g>
        {cfg.holes.map(([x, y, r], i) => <g key={"h" + i}><circle cx={x} cy={y} r={r} fill="#050d16" stroke="#d9a441" strokeWidth="2" /><circle cx={x} cy={y} r={r / 2} fill="#02070d" stroke="rgba(125,211,252,.4)" /></g>)}
        <g fontFamily="ui-monospace, Menlo, Consolas, monospace" fontSize="7" fill="rgba(190,225,248,.42)" letterSpacing="1">
          {cfg.texts.map(([x, y, t], i) => <text key={i} x={x} y={y}>{t}</text>)}
        </g>
      </svg>
      {variant === "login" && <div className="pcb-scan" aria-hidden="true" />}
    </>
  );
}

/** Fondo de circuitos para cualquier tamaño de pantalla: en celular es una sola placa; en pantallas anchas
 *  (computador) se repiten varias placas lado a lado para que los circuitos mantengan su tamaño y densidad
 *  en vez de agrandarse. Todas se mueven igual. */
export function PcbBackground({ variant = "login" }) {
  const cfg = PCB_CONFIGS[variant] || PCB_CONFIGS.login;
  const ref = useRef(null);
  const [n, setN] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const calc = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      setN(Math.max(1, Math.min(6, Math.round(w / (h * (cfg.w / cfg.h))))));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cfg.w, cfg.h]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden", transform: i % 2 ? "scaleX(-1)" : undefined }}><PcbTile variant={variant} /></div>
      ))}
    </div>
  );
}

/* ============================================================
   INVENTARIO — componentes de vista
   ============================================================ */
export function QrCodeBox({ url, label, filename }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(d => { if (!cancelled) setDataUrl(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  const doDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || "qr.png";
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      {dataUrl
        ? <img loading="lazy" src={dataUrl} alt="Código QR" width={140} height={140} />
        : <div className="w-[140px] h-[140px] flex items-center justify-center text-xs" style={{ color: C.gray }}>Generando…</div>}
      {label && <div className="text-xs text-center" style={{ color: C.inkSoft }}>{label}</div>}
      <Button size="sm" variant="ghost" icon={Download} disabled={!dataUrl} onClick={doDownload}>Descargar QR</Button>
    </div>
  );
}

/* ============================================================
   VISTA: TAREAS / PENDIENTES
   ============================================================ */
/* ============================================================
   DICTADO POR VOZ (usa el reconocimiento de voz que ya trae el navegador — sin costo)
   ============================================================ */
export function VoiceInputButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognitionApi = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  if (!SpeechRecognitionApi) return null; // el navegador no lo soporta — no se muestra el botón, sin romper nada

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognitionApi();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button type="button" onClick={toggle} title={listening ? "Detener" : "Dictar por voz"}
      className="p-2 rounded-md shrink-0" style={{ background: listening ? C.red : C.blueSoft, color: listening ? "#fff" : C.blue }}>
      {listening ? <span className="pm-pulse block"><Mic size={15} /></span> : <Mic size={15} />}
    </button>
  );
}

export function PhotoPicker({ photos, onChange, max = 2 }) {
  const inputRef = useRef(null);
  // Antes esto llamaba a URL.createObjectURL(f) directo en el render — como ese render se repite
  // con cada tecla que se escribe en el resto del formulario (descripción, notas, etc.), se creaba
  // una URL nueva de memoria por cada foto en CADA render, sin liberar nunca las anteriores. En un
  // celular de gama baja, tras varios equipos seguidos en el mismo turno, esto podía degradar el
  // rendimiento o forzar a recargar la pestaña (perdiendo el formulario a medio llenar). Ahora se
  // crea una sola vez por archivo y se libera cuando la foto se quita o el formulario se cierra.
  const urlMapRef = useRef(new Map());
  useEffect(() => {
    const map = urlMapRef.current;
    photos.forEach(f => { if (typeof f !== "string" && !map.has(f)) map.set(f, URL.createObjectURL(f)); });
    for (const [file, url] of map) {
      if (!photos.includes(file)) { URL.revokeObjectURL(url); map.delete(file); }
    }
  }, [photos]);
  useEffect(() => () => {
    urlMapRef.current.forEach(url => URL.revokeObjectURL(url));
    urlMapRef.current.clear();
  }, []);
  const urlFor = (f) => typeof f === "string" ? f : (urlMapRef.current.get(f) || URL.createObjectURL(f));

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, max - photos.length);
    onChange([...photos, ...files]);
    e.target.value = "";
  };
  const removeAt = (i) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {photos.map((f, i) => (
          <div key={i} className="relative">
            <img loading="lazy" src={urlFor(f)} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <button type="button" onClick={() => removeAt(i)} className="absolute -top-1.5 -right-1.5 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              style={{ background: C.red, color: "#fff" }}>×</button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center text-xs" style={{ borderColor: C.line, background: C.panel, color: C.gray }}>
            + Foto
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
    </div>
  );
}

/**
 * Selector de repuestos usados en un mantenimiento — busca en el inventario real, se agrega con
 * cantidad a una lista. Esa lista se manda tal cual a logMaintenance(), que descuenta el stock
 * solo — no hay que ir aparte a Inventario a hacer el retiro a mano.
 */
export function PartsPicker({ invItems, parts, onChange }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("1");

  const matches = search.trim() && !selectedId
    ? invItems.filter(it => normalizeSearchText(it.name).includes(normalizeSearchText(search.trim()))).slice(0, 6)
    : [];

  const addPart = () => {
    const item = invItems.find(it => it.id === selectedId);
    if (!item || !qty || Number(qty) <= 0) return;
    onChange([...parts, { itemId: item.id, cantidad: Number(qty) }]);
    setSearch(""); setSelectedId(""); setQty("1");
  };
  const removePart = (idx) => onChange(parts.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1.5">
          <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(""); }} placeholder="Buscar repuesto usado…"
            className="flex-1 text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
            className="w-14 text-xs border rounded-md px-1.5 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <button type="button" onClick={addPart} disabled={!selectedId}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md shrink-0" style={{ background: selectedId ? C.amber : C.bg, color: selectedId ? "#fff" : C.gray, minHeight: 30 }}>
            Agregar
          </button>
        </div>
        {matches.length > 0 && (
          <div className="rounded-md border mb-1.5 overflow-hidden" style={{ borderColor: C.line }}>
            {matches.map(it => (
              <button key={it.id} type="button" onClick={() => { setSelectedId(it.id); setSearch(it.name); }}
                className="block w-full text-left text-xs px-2 py-1.5" style={{ color: C.ink, background: C.panel }}>
                {it.name} <span style={{ color: C.gray }}>· quedan {it.quantity} {it.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {parts.length > 0 && (
        <div className="space-y-1">
          {parts.map((p, i) => {
            const item = invItems.find(it => it.id === p.itemId);
            return (
              <div key={i} className="flex items-center justify-between text-xs rounded-md px-2 py-1" style={{ background: C.bg }}>
                <span style={{ color: C.ink }}>{item?.name || "Repuesto"} × {p.cantidad}</span>
                <button type="button" onClick={() => removePart(i)} aria-label="Quitar repuesto" title="Quitar repuesto"><X size={12} color={C.gray} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Chips de sugerencia sobre el campo de descripción — tocar una la agrega al texto (no lo
 * reemplaza si ya hay algo escrito, para que se pueda combinar con lo que el técnico ya puso). */
export function MaintenanceTextSuggestions({ sistema, tipo, onPick }) {
  const templates = getMaintenanceTemplates(sistema, tipo);
  if (!templates.length) return null;
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>
        Sugerencias para {sistema || "este equipo"} — toca una para usarla
      </div>
      <div className="flex flex-col gap-1">
        {templates.map((t, i) => (
          <button key={i} type="button" onClick={() => onPick(t)}
            className="text-left text-xs px-2 py-1.5 rounded-md border" style={{ borderColor: C.line, background: C.bg, color: C.inkSoft, minHeight: 32 }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Frases que ya se han usado antes para ESTE equipo específico (no por especialidad general,
 *  sino aprendiendo del propio historial) — las más recientes y sin repetir texto exacto. */
export function EquipoHistorySuggestions({ equipoId, mttoLog, onPick }) {
  if (!equipoId) return null;
  const past = (mttoLog || []).filter(r => r.equipoId === equipoId && r.descripcion && r.descripcion.trim())
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const seen = new Set();
  const distinct = [];
  for (const r of past) {
    const key = normalizeSearchText(r.descripcion.trim());
    if (!seen.has(key)) { seen.add(key); distinct.push(r.descripcion.trim()); }
    if (distinct.length >= 3) break;
  }
  if (distinct.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>
        Lo que ya se escribió antes para este equipo
      </div>
      <div className="flex flex-col gap-1">
        {distinct.map((t, i) => (
          <button key={i} type="button" onClick={() => onPick(t)}
            className="text-left text-xs px-2 py-1.5 rounded-md border" style={{ borderColor: C.blue, background: C.bg, color: C.inkSoft, minHeight: 32 }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Badge({ tone = "gray", pulse = false, children }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.gray;
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full inline-block leading-none ${pulse ? "animate-pulse" : ""}`} style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, valueColor, leading, breakdown, trend, tooltip, accent }) {
  const [showTip, setShowTip] = useState(false);
  const accentStyle = accent === "red" ? { borderColor: C.red, background: C.redSoft }
    : accent === "amber" ? { borderColor: C.amber, background: C.amberSoft }
    : { borderColor: C.line, background: C.panel };
  return (
    <div className="rounded-xl border p-5 relative overflow-hidden" style={accentStyle}>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>{label}</div>
        {tooltip && (
          <div className="relative shrink-0" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <button type="button" onClick={() => setShowTip(v => !v)} className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: C.bg, color: C.gray }}>?</button>
            {showTip && (
              <div className="absolute right-0 top-5 rounded-lg border shadow-lg p-2.5 text-xs z-20" style={{ background: C.panel, borderColor: C.line, color: C.inkSoft, width: "min(13rem, 70vw)" }}>
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 min-w-0">
        {leading}
        <div className={`font-bold leading-tight tabular-nums ${String(value).length > 10 ? "text-xl" : String(value).length > 7 ? "text-2xl" : "text-3xl"}`}
          style={{ color: valueColor || C.ink, wordBreak: "break-word" }}>{value}</div>
      </div>
      {trend}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
          {breakdown.map(b => (
            <div key={b.label} className="flex items-center justify-between text-xs">
              <span style={{ color: C.inkSoft }}>{b.label}</span>
              <span className="font-bold tabular-nums" style={{ color: b.color || C.ink }}>{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Aviso de "sin internet" bien visible en toda la app — no solo el punto pequeño del encabezado.
 * Aparece como una barra fija arriba de todo mientras no haya señal, para que sea imposible no
 * darse cuenta de que se está trabajando sin conexión (todo se sigue guardando en el celular). */
function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  if (online) return null;
  return (
    <div className="pm-safe-top fixed top-0 left-0 right-0 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3"
      style={{ background: "#7a5405", color: "#fff", zIndex: 500 }}>
      <WifiOff size={13} /> Sin conexión — lo que registres se guarda en este celular y se sube solo apenas vuelva la señal
    </div>
  );
}

/**
 * Medidor circular pequeño — la idea visual de todo el rediseño de Inicio: en vez de tarjetas de
 * "dashboard bancario" genéricas, widgets que se sienten como los manómetros del piso mecánico
 * mismo (coherente con el ícono de la app y el nombre "QuinTech").
 */
export function MiniGauge({ value, max, size = 56, stroke = 6, color, trackColor }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor || C.line} strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }} />
    </svg>
  );
}

/**
 * Donut de varios segmentos, en SVG puro (sin recharts) — recibe [{ value, color }, ...].
 * Se usa en vez del PieChart de recharts para evitar un bug conocido de esa librería.
 */
export function MiniDonut({ segments, size = 140, stroke = 22, centerValue, centerLabel }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const [hover, setHover] = useState(null);
  let offsetSoFar = 0;
  return (
    <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} onMouseLeave={() => setHover(null)}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = circumference * frac;
          const gap = circumference - dash;
          const rotation = -90 + (offsetSoFar / total) * 360;
          offsetSoFar += seg.value;
          if (frac <= 0) return null;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`} strokeLinecap="butt" transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ cursor: seg.name ? "pointer" : "default", transition: "opacity 120ms" }}
              opacity={hover && hover !== seg ? 0.45 : 1}
              onMouseEnter={() => seg.name && setHover(seg)} />
          );
        })}
      </svg>
      {centerValue != null && !hover && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-bold tabular-nums" style={{ color: C.ink, fontSize: size > 100 ? 18 : 14 }}>{centerValue}</div>
          {centerLabel && <div className="text-[10px]" style={{ color: C.gray }}>{centerLabel}</div>}
        </div>
      )}
      {hover && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-1.5 text-xs pointer-events-none"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10 }}>
          <div className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full" style={{ background: hover.color }} />{hover.name}</div>
          <div style={{ color: C.gray }}>{hover.value} ({Math.round((hover.value / total) * 100)}%)</div>
        </div>
      )}
    </div>
  );
}

/**
 * Barras horizontales hechas con divs simples — reemplaza el layout="vertical" de BarChart de
 * recharts, que tiene un historial largo de bugs conocidos en esa librería. data: array de
 * objetos; labelKey/valueKey: qué campo usar de cada uno; colorFor(d): color de esa barra;
 * formatValue(v): cómo mostrar el número al lado.
 */
export function HorizontalBarChart({ data, labelKey, valueKey, colorFor, formatValue, max, gradient = false }) {
  const maxVal = max ?? Math.max(1, ...data.map(d => Number(d[valueKey]) || 0));
  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.max(0, Math.min(100, (val / maxVal) * 100));
        const color = colorFor ? colorFor(d, i) : C.amber;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1.5 gap-3">
              <span style={{ color: C.ink }} className="truncate" title={d[labelKey]}>{d[labelKey]}</span>
              <span className="font-bold shrink-0 tabular-nums" style={{ color, fontSize: 15 }}>{formatValue ? formatValue(val, d) : val}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: C.bg, height: 10 }}>
              <div className="pm-bar-grow h-full rounded-full" style={{
                width: `${pct}%`,
                background: gradient ? `linear-gradient(90deg, ${color}99, ${color})` : color,
                transition: "width 600ms var(--ease-out)",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Barras verticales simples, sin recharts — cada barra es un div con altura en %. */
export function VerticalBarChart({ data, labelKey, valueKey, colorFor, formatValue, max = 100 }) {
  return (
    <div className="flex items-end gap-2" style={{ height: 180 }}>
      {data.map((d, i) => {
        const val = d[valueKey];
        const pct = val === null || val === undefined ? 0 : Math.max(2, Math.min(100, (Number(val) / max) * 100));
        const color = val === null || val === undefined ? C.gray : (colorFor ? colorFor(val) : C.amber);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[10px] font-semibold mb-1 truncate w-full text-center" style={{ color }}>
              {val === null || val === undefined ? "—" : (formatValue ? formatValue(val) : val)}
            </span>
            <div className="w-full rounded-t-md" style={{ height: `${pct}%`, minHeight: 4, background: color, transition: "height 500ms ease-out" }} />
            <span className="text-[9px] mt-1 truncate w-full text-center" style={{ color: C.gray }} title={d[labelKey]}>{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Línea de tendencia pequeña ("sparkline"), en SVG puro — sin recharts. */
export function Sparkline({ points, width = 200, height = 50, color }) {
  if (!points || points.length < 2) return null;
  const values = points.map(p => p.v);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={coords} fill="none" stroke={color || C.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Gráfico de líneas de tiempo (SVG propio, sin librerías) — una o más series (ej. Preventivo vs.
 * Correctivo) a lo largo de varios períodos, con línea de tendencia punteada opcional y un
 * tooltip flotante que sigue al cursor por columna.
 */
export function TimeSeriesLineChart({ series, labels, trend, height = 240 }) {
  const width = 640;
  const padL = 34, padR = 12, padT = 14, padB = 26;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const n = labels.length;
  const [hoverIdx, setHoverIdx] = useState(null);

  if (n === 0) return <div className="text-sm text-center py-10" style={{ color: C.gray }}>Sin datos suficientes para este período.</div>;

  const allY = series.flatMap(s => s.points).concat(trend || []);
  const maxY = Math.max(2, ...allY);
  const xAt = (i) => n > 1 ? padL + (i / (n - 1)) * plotW : padL + plotW / 2;
  const yAt = (v) => padT + (1 - v / maxY) * plotH;
  const gridSteps = 4;
  const gridVals = Array.from({ length: gridSteps + 1 }, (_, i) => Math.round((maxY / gridSteps) * i));
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible", display: "block" }}
        onMouseLeave={() => setHoverIdx(null)}>
        {gridVals.map((g, gi) => (
          <g key={gi}>
            <line x1={padL} x2={width - padR} y1={yAt(g)} y2={yAt(g)} stroke={C.line} strokeWidth={1} />
            <text x={padL - 6} y={yAt(g) + 3} textAnchor="end" fontSize={9} fill={C.gray}>{g}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % labelEvery === 0 || i === n - 1) && (
          <text key={i} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize={9} fill={C.gray}>{lb}</text>
        ))}
        {trend && trend.length > 1 && (
          <polyline points={trend.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            fill="none" stroke={C.gray} strokeWidth={1.5} strokeDasharray="5 4" />
        )}
        {series.map(s => (
          <polyline key={s.name} points={s.points.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {labels.map((_, i) => (
          <rect key={i} x={xAt(i) - (plotW / n) / 2} y={padT} width={plotW / Math.max(1, n)} height={plotH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}
        {hoverIdx != null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padT} y2={height - padB} stroke={C.gray} strokeWidth={1} strokeDasharray="2 2" />
        )}
        {hoverIdx != null && series.map(s => (
          <circle key={s.name} cx={xAt(hoverIdx)} cy={yAt(s.points[hoverIdx])} r={4} fill={s.color} stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
      {hoverIdx != null && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-2 text-xs pointer-events-none"
          style={{
            left: `${Math.min(88, Math.max(12, (xAt(hoverIdx) / width) * 100))}%`, top: 4, transform: "translateX(-50%)",
            background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10,
          }}>
          <div className="font-semibold mb-1">{labels[hoverIdx]}</div>
          {series.map(s => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.name}: <b>{s.points[hoverIdx]}</b>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map(s => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}
          </span>
        ))}
        {trend && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
            <span className="w-3 h-0.5" style={{ background: C.gray }} />Tendencia (promedio móvil)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Badge de alerta rediseñado (pilar 4 del rediseño): antes, cualquier número grande en rojo se
 * veía como una emergencia constante. Ahora: rojo se reserva de verdad para lo urgente (pocas
 * unidades, algo roto ahora mismo); los conteos grandes que son más "para tu información" que
 * "urgente" (como cuántos movimientos de inventario hay en el historial) usan un tono ámbar más
 * calmado, y cualquier número se recorta a "99+" para que nunca se sienta como una alarma sin fin.
 */
export function NavBadge({ count, urgent = true, pulse = false }) {
  if (!count) return null;
  const label = typeof count === "string" ? count : count > 99 ? "99+" : String(count);
  const bg = urgent ? C.red : C.amber;
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${pulse ? "animate-pulse" : ""}`}
      style={{ background: bg, color: "#fff", minWidth: 18, textAlign: "center", display: "inline-block" }}>
      {label}
    </span>
  );
}

/**
 * Cronómetro en vivo de una tarea: cuánto tiempo lleva abierta desde que se asignó, o el tiempo
 * total que tomó si ya se cerró. Se refresca solo cada 30s mientras siga activa — de sobra de
 * precisión para un tablero operativo, sin recalcular en cada render de la lista.
 */
export function TaskTimer({ assignedAt, finishedAt, estado }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (finishedAt) return; // ya cerró, no hace falta seguir refrescando
    const id = setInterval(() => forceTick(v => v + 1), 30000);
    return () => clearInterval(id);
  }, [finishedAt]);

  if (!assignedAt) return null;
  const end = finishedAt || nowIso();
  const hrs = hoursBetween(assignedAt, end);
  const label = finishedAt ? `Tomó ${fmtHours(hrs)}` : estado === "pausada" ? `${fmtHours(hrs)} abierta` : `${fmtHours(hrs)} abierta`;
  const { bg, fg } = finishedAt
    ? { bg: C.greenSoft, fg: C.green }
    : estado === "pausada" ? { bg: C.amberSoft, fg: "#8a5a00" }
      : hrs > 24 ? { bg: C.red, fg: "#fff" } : { bg: C.bg, fg: C.inkSoft };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: bg, color: fg }}>
      <Clock size={11} /> {label}
    </span>
  );
}

/** Avatar redondo con las iniciales de la persona — color consistente según su nombre, para
 * reconocer de un vistazo quién tiene asignada cada tarjeta sin tener que leer el nombre completo. */
export function Avatar({ name, cargo, size = 28 }) {
  const label = (name || "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const palette = [C.blue, C.amber, C.green, C.red, "#8b5cf6", "#0ea5e9", "#db2777"];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) % palette.length;
  const bg = palette[Math.abs(hash)];
  const tooltipText = name ? (cargo ? `${name} — ${cargo}` : name) : "Sin asignar";
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white" title={tooltipText}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

/** Visor de foto a pantalla completa — se abre al tocar cualquier miniatura, se cierra tocando
 * afuera o la X. */
export function Lightbox({ url, onClose }) {
  useBackCloseModal(!!url, onClose);
  if (!url) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(10,14,20,0.85)", zIndex: 200 }} onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
        <X size={20} />
      </button>
      <img loading="lazy" src={url} alt="" className="max-w-full max-h-full rounded-lg" style={{ objectFit: "contain" }} onClick={e => e.stopPropagation()} />
    </div>
  );
}

/** Recordatorio de respaldo (item 17): si hace más de 30 días que nadie descarga un respaldo. */
function BackupReminder() {
  const [hidden, setHidden] = useState(false);
  let last = 0;
  try {
    ["pm-local:last-manual-backup", "pm-local:last-auto-backup"].forEach(k => { const v = localStorage.getItem(k); if (v) last = Math.max(last, new Date(v).getTime() || 0); });
  } catch { /* noop */ }
  const dias = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (hidden || (dias != null && dias <= 30)) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold" style={{ color: C.ink }}>💾 {dias == null ? "Todavía no has descargado un respaldo en este dispositivo" : `Hace ${dias} días que no se descarga un respaldo`}</div>
        <button onClick={() => setHidden(true)} aria-label="Cerrar" style={{ minWidth: 28, minHeight: 28 }}><X size={16} color={C.gray} /></button>
      </div>
      <div className="mt-2"><BackupButton /></div>
    </div>
  );
}

/** Resumen de entrega de turno: lo cerrado, lo creado y lo pendiente de las últimas horas, listo para copiar o mandar. */
function ShiftSummaryCard({ tasks, mttoLog, nameOf }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(8);
  const [text, setText] = useState("");
  const build = () => {
    const since = Date.now() - hours * 3600000;
    const inWin = (iso) => iso && new Date(iso).getTime() >= since;
    const closed = (tasks || []).filter(t => normalizeTaskState(t.estado) === "finalizada" && inWin(t.finishedAt));
    const created = (tasks || []).filter(t => inWin(t.createdAt));
    const pend = (tasks || []).filter(t => normalizeTaskState(t.estado) !== "finalizada" && !isTaskSnoozed(t));
    const pendAlta = pend.filter(t => t.prioridad === "alta" || t.prioridad === "critica");
    const mtto = (mttoLog || []).filter(r => inWin(r.fecha));
    const L = [];
    L.push(`*Resumen de turno* — últimas ${hours} h (${fmtDT(new Date().toISOString())})`);
    L.push("");
    L.push(`✅ Cerradas: ${closed.length}`);
    closed.slice(0, 12).forEach(t => L.push(`  • ${t.titulo}${t.asignadoA ? ` (${nameOf(t.asignadoA)})` : ""}`));
    L.push(`🆕 Nuevas: ${created.length}`);
    L.push(`🛠️ Mantenimientos registrados: ${mtto.length}`);
    L.push("");
    L.push(`⏳ Pendientes abiertas: ${pend.length}${pendAlta.length ? ` (${pendAlta.length} de prioridad alta)` : ""}`);
    pendAlta.slice(0, 10).forEach(t => L.push(`  🔴 ${t.titulo}${t.asignadoA ? ` — ${nameOf(t.asignadoA)}` : ""}`));
    pend.filter(t => !pendAlta.includes(t)).slice(0, 8).forEach(t => L.push(`  • ${t.titulo}${t.asignadoA ? ` — ${nameOf(t.asignadoA)}` : ""}`));
    setText(L.join("\n"));
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); showToast("✓ Resumen copiado.", true); } catch { showToast("No se pudo copiar — selecciona el texto a mano.", false); } };
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <button onClick={() => { setOpen(v => !v); if (!open && !text) build(); }} className="w-full flex items-center justify-between gap-2 text-left" style={{ minHeight: 36 }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}><TitleIco i={ClipboardList} />Resumen de turno</span>
        <span className="text-xs" style={{ color: C.amber }}>{open ? "▲" : "Generar ▼"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs" style={{ color: C.inkSoft }}>Últimas</span>
            <select value={hours} onChange={e => setHours(Number(e.target.value))} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
              {[4, 8, 12, 24].map(h => <option key={h} value={h}>{h} horas</option>)}
            </select>
            <Button size="sm" variant="ghost" onClick={build}>Actualizar</Button>
          </div>
          <textarea readOnly value={text} rows={10} className="w-full text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={copy}>Copiar</Button>
            <Button size="sm" variant="ghost" onClick={wa}>Enviar por WhatsApp</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: ENTREGA DE TURNO
   Se genera automáticamente cada vez que se completa un recorrido
   (todos los pisos, desde el primero hasta el último). Muestra piso
   por piso cómo quedó cada equipo y permite enviarlo de inmediato
   por correo o WhatsApp con un solo toque.
   ============================================================ */
/* ============================================================
   FIRMA DIGITAL (canvas) — para la Entrega de Turno
   ============================================================ */
export function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={340} height={130}
        className="rounded-md border w-full touch-none" style={{ borderColor: C.line, background: "#fff", maxWidth: 340 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button onClick={clear} className="text-xs mt-1" style={{ color: C.gray }}>Borrar firma</button>
    </div>
  );
}

export function BackupButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const doExport = async () => {
    setBusy(true); setMsg(null);
    try {
      const rows = await exportFullBackup();
      const backup = { exportedAt: nowIso(), keyCount: rows.length, data: {} };
      rows.forEach(r => { backup.data[r.key] = r.value; });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-pisos-mecanicos-${todayStr().replace(/\//g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      try { localStorage.setItem("pm-local:last-manual-backup", nowIso()); } catch { /* noop */ }
      setMsg({ ok: true, text: `✓ Respaldo descargado (${rows.length} secciones de datos).` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || "No se pudo generar el respaldo." });
    }
    setBusy(false);
  };

  return (
    <div>
      <Button size="sm" icon={Download} disabled={busy} onClick={doExport}>{busy ? "Generando…" : "Descargar respaldo completo"}</Button>
      {msg && <div className="text-xs mt-2 font-medium" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
    </div>
  );
}