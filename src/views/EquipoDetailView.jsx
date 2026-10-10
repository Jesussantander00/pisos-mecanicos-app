import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { saveRecordWithPhotos, uploadPhoto, uploadVideo } from "../lib/storage";
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronDown, ChevronRight, Download, Upload, Video, Wrench } from "lucide-react";
import { C, MTTO_ESTADOS, MTTO_TIPOS, computeEquipoStats, computePreventiveStatus, currentEquipoStatus, detectPartsChanged, equipoUrl, fmtDT, generateHojaVidaPdf, showToast } from "../shared/core";
import { Avatar, Button, EquipoHistorySuggestions, MaintenanceTextSuggestions, PartsPicker, PhotoPicker, Pill, VoiceInputButton } from "../shared/components";



/** Convierte un enlace pegado (YouTube, Drive, o un .mp4 directo) en un reproductor embebido. */
function VideoEmbed({ url }) {
  let embedSrc = null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (yt) embedSrc = `https://www.youtube.com/embed/${yt[1]}`;
  else if (drive) embedSrc = `https://drive.google.com/file/d/${drive[1]}/preview`;

  if (embedSrc) {
    return (
      <div className="rounded-md overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
        <iframe src={embedSrc} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video de referencia" />
      </div>
    );
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return <video src={url} controls className="w-full rounded-md" style={{ maxHeight: 260, background: "#000" }} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm underline break-all" style={{ color: C.blue }}>{url}</a>
  );
}

export function EquipoDetailView({ equipo, records, tasks, invItems, onBack, onLogMaintenance, isAdmin, onSetVideoUrl, onSetFrecuencia, onSetFotoMaestra, onUpdateEquipoInfo, mttoRequiredFields, onUpdateRequiredFields, viewerLocked, editLog = [] }) {
  const [editingEquipo, setEditingEquipo] = useState(false);
  const [equipoDraft, setEquipoDraft] = useState({ nombre: equipo.nombre, sistema: equipo.sistema });
  const [savingEquipo, setSavingEquipo] = useState(false);
  const [cascadeConfirm, setCascadeConfirm] = useState(null);
  const [prevOpen, setPrevOpen] = useState(!!equipo.frecuenciaDias);
  const [videoOpen, setVideoOpen] = useState(!!equipo.videoUrl);
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoDraft, setVideoDraft] = useState(equipo.videoUrl || "");
  const [savingVideo, setSavingVideo] = useState(false);
  const [editingFrecuencia, setEditingFrecuencia] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [frecuenciaDraft, setFrecuenciaDraft] = useState(equipo.frecuenciaDias || "");
  const [savingFrecuencia, setSavingFrecuencia] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState(null);
  const [tipo, setTipo] = useState("preventivo");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("funcionando");
  const [costo, setCosto] = useState("");
  const [costoRepuestos, setCostoRepuestos] = useState("");
  const [costoContratista, setCostoContratista] = useState("");
  const [photos, setPhotos] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [editingVidaUtil, setEditingVidaUtil] = useState(false);
  const [fechaInstalacionDraft, setFechaInstalacionDraft] = useState(equipo.fechaInstalacion || "");
  const [garantiaDraft, setGarantiaDraft] = useState(equipo.garantiaHasta || "");
  const [valorReempDraft, setValorReempDraft] = useState(equipo.valorReemplazo ? String(equipo.valorReemplazo) : "");
  const [showTimeline, setShowTimeline] = useState(false);
  const [vidaUtilDraft, setVidaUtilDraft] = useState(equipo.vidaUtilAnios || "");
  const [savingVidaUtil, setSavingVidaUtil] = useState(false);
  const [editingManual, setEditingManual] = useState(false);
  const [manualDraft, setManualDraft] = useState(equipo.manualUrl || "");
  const [savingManual, setSavingManual] = useState(false);

  const status = currentEquipoStatus(equipo.id, records);
  const stats = useMemo(() => computeEquipoStats(equipo, records), [equipo, records]);
  // ===== Vida útil estimada: años transcurridos desde la instalación vs. la vida útil que se
  // le puso a mano — ninguno de los dos datos existía antes, así que si no se han llenado no
  // se muestra nada (no se inventa una fecha ni un número). =====
  const vidaUtilInfo = useMemo(() => {
    if (!equipo.fechaInstalacion || !equipo.vidaUtilAnios) return null;
    const years = (Date.now() - new Date(equipo.fechaInstalacion).getTime()) / (365.25 * 86400000);
    const pct = Math.round((years / Number(equipo.vidaUtilAnios)) * 100);
    return { years: Math.round(years * 10) / 10, pct, overLife: pct >= 100 };
  }, [equipo.fechaInstalacion, equipo.vidaUtilAnios]);
  // ===== Fallas repetidas: 3 o más correctivos en los últimos 60 días — candidato a reemplazo,
  // no solo a otra reparación más. =====
  const repeatedFailures = useMemo(() => {
    const cutoff = Date.now() - 60 * 86400000;
    return (records || []).filter(r => r.tipo === "correctivo" && new Date(r.fecha).getTime() >= cutoff).length;
  }, [records]);
  const preventiveStatus = useMemo(() => computePreventiveStatus(equipo, records), [equipo, records]);
  const partsChanged = useMemo(() => detectPartsChanged(records), [records]);
  const fechaAlta = records.length ? records.reduce((a, b) => new Date(a.fecha) < new Date(b.fecha) ? a : b).fecha : equipo.createdAt;
  const [downloadingHV, setDownloadingHV] = useState(false);

  const doDownloadHojaVida = async () => {
    setDownloadingHV(true);
    try {
      const doc = await generateHojaVidaPdf(equipo, records, stats, partsChanged, fechaAlta);
      doc.save(`hoja-de-vida-${equipo.nombre.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch { /* no bloquea el resto de la pantalla si falla */ }
    setDownloadingHV(false);
  };

  const doDownloadQr = async () => {
    setDownloadingQr(true);
    try {
      const dataUrl = await QRCode.toDataURL(equipoUrl(equipo.id), { width: 320, margin: 1 });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `qr-equipo-${equipo.nombre.replace(/[^a-z0-9]+/gi, "-")}.png`; a.click();
    } catch { /* noop */ }
    setDownloadingQr(false);
  };

  // ===== Auditoría de ediciones en cascada =====
  // Cuenta cuántos mantenimientos y tareas ya guardados quedan vinculados a este equipo, para
  // que quien edite el sistema/nombre vea de un vistazo cuántos registros "viejos" van a
  // aparecer ahora bajo el valor nuevo (útil para no romper estadísticas por sistema sin darse
  // cuenta de cuántos registros históricos arrastra el cambio).
  const affectedCounts = useMemo(() => ({
    mantenimientos: (records || []).length,
    tareas: (tasks || []).filter(t => t.equipoId === equipo.id).length,
  }), [records, tasks, equipo.id]);

  const requestSaveEquipoInfo = () => {
    const nombre = (equipoDraft.nombre || "").trim();
    const sistema = (equipoDraft.sistema || "").trim();
    if (!nombre || !sistema) return;
    const sistemaChanged = sistema !== equipo.sistema;
    const nada = affectedCounts.mantenimientos + affectedCounts.tareas === 0;
    if (sistemaChanged && !nada) {
      setCascadeConfirm({ nombre, sistema });
    } else {
      doSaveEquipoInfo(nombre, sistema);
    }
  };

  const doSaveEquipoInfo = async (nombre, sistema) => {
    setSavingEquipo(true);
    try {
      await onUpdateEquipoInfo?.(equipo.id, { nombre, sistema });
      setEditingEquipo(false);
      setCascadeConfirm(null);
    } finally {
      setSavingEquipo(false);
    }
  };

  const [dupWarning, setDupWarning] = useState(null);
  const reqFields = mttoRequiredFields || { foto: false, costo: false, repuestos: false };

  const doSave = async (skipDupCheck = false) => {
    if (!descripcion.trim()) { setSaveMsg({ ok: false, text: "Escribe qué se hizo." }); return; }
    if (reqFields.foto && photos.length === 0) { setSaveMsg({ ok: false, text: "Falta al menos una foto — es obligatoria para este registro." }); return; }
    if (reqFields.costo && !(Number(costo) > 0)) { setSaveMsg({ ok: false, text: "Falta el costo — es obligatorio para este registro." }); return; }
    if (reqFields.repuestos && repuestos.length === 0) { setSaveMsg({ ok: false, text: "Falta registrar al menos un repuesto usado — es obligatorio para este registro." }); return; }
    if (!skipDupCheck) {
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);
      const dup = (records || []).find(r => new Date(r.fecha || r.createdAt) >= today0);
      if (dup) { setDupWarning(dup); return; }
    }
    setDupWarning(null);
    setSaving(true); setSaveMsg(null);
    try {
      const res = await saveRecordWithPhotos(
        "maintenance",
        { equipoId: equipo.id, tipo, descripcion: descripcion.trim(), estado, costo, costoRepuestos, costoContratista, repuestos },
        photos,
        async (payload, urls) => { await onLogMaintenance(payload.equipoId, { ...payload, fotos: urls }); }
      );
      setDescripcion(""); setCosto(""); setCostoRepuestos(""); setCostoContratista(""); setPhotos([]); setTipo("preventivo"); setEstado("funcionando"); setRepuestos([]); setDupWarning(null);
      setSaveMsg(res.queued
        ? { ok: true, text: "✓ Guardado en este celular — no había señal. Se sube solo apenas vuelva, sin que tengas que escribir nada de nuevo." }
        : { ok: true, text: "✓ Mantenimiento registrado." });
      showToast(res.queued ? "Guardado en este celular — se sube solo apenas vuelva la señal." : "✓ Mantenimiento registrado.", true);
    } catch (e) {
      const msg = e.message || "No se pudo guardar — revisa tu conexión e intenta de nuevo.";
      setSaveMsg({ ok: false, text: msg });
      showToast(msg, false);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a {equipo.sistema}</Button>
        {!viewerLocked && (
          <Button size="sm" onClick={() => {
            try { sessionStorage.setItem("pm-local:task-draft", JSON.stringify({ equipoId: equipo.id, titulo: `Revisar ${equipo.nombre}` })); } catch { /* noop */ }
            window.dispatchEvent(new CustomEvent("pm-go-view", { detail: "tasks" }));
          }}>➕ Nueva tarea para este equipo</Button>
        )}
      </div>
      <div className="flex items-start gap-3 mt-2 mb-4">
        {equipo.fotoMaestra ? (
          <img loading="lazy" src={equipo.fotoMaestra} alt="" className="w-16 h-16 rounded-lg object-cover border shrink-0" style={{ borderColor: C.line }} />
        ) : (
          <div className="w-16 h-16 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: C.line, background: C.bg }}>
            <Wrench size={22} color={C.gray} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{equipo.nombre}</h2>
            {status.outOfService && <Pill tone="red">Fuera de servicio desde {fmtDT(status.since)}</Pill>}
            {isAdmin && !editingEquipo && (
              <button onClick={() => { setEquipoDraft({ nombre: equipo.nombre, sistema: equipo.sistema }); setCascadeConfirm(null); setEditingEquipo(true); }}
                className="text-xs font-semibold" style={{ color: C.amber }}>
                Editar equipo
              </button>
            )}
          </div>
          {editingEquipo ? (
            <div className="rounded-md border p-2.5 mt-1.5 mb-1" style={{ borderColor: C.line, background: C.bg }}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <input value={equipoDraft.nombre} onChange={e => setEquipoDraft(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre del equipo"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none flex-1 min-w-[160px]" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <input value={equipoDraft.sistema} onChange={e => setEquipoDraft(d => ({ ...d, sistema: e.target.value }))} placeholder="Sistema"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none flex-1 min-w-[140px]" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              </div>
              {cascadeConfirm ? (
                <div className="rounded-md p-2.5 mb-2" style={{ background: C.amberSoft }}>
                  <div className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: C.amber }}>
                    <AlertTriangle size={13} /> Este cambio afecta registros existentes
                  </div>
                  <div className="text-xs" style={{ color: C.amber }}>
                    Este equipo tiene <b>{affectedCounts.mantenimientos}</b> mantenimiento{affectedCounts.mantenimientos !== 1 ? "s" : ""} y <b>{affectedCounts.tareas}</b> tarea{affectedCounts.tareas !== 1 ? "s" : ""} ya registrados bajo el sistema "<b>{equipo.sistema}</b>".
                    Si cambias al sistema "<b>{cascadeConfirm.sistema}</b>", esos registros no se borran ni se editan, pero de ahora en adelante aparecerán en reportes y estadísticas bajo el sistema nuevo.
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" disabled={savingEquipo} onClick={() => doSaveEquipoInfo(cascadeConfirm.nombre, cascadeConfirm.sistema)}>
                      {savingEquipo ? "Guardando…" : "Confirmar cambio"}
                    </Button>
                    <button onClick={() => setCascadeConfirm(null)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled={savingEquipo} onClick={requestSaveEquipoInfo}>{savingEquipo ? "Guardando…" : "Guardar"}</Button>
                  <button onClick={() => { setEditingEquipo(false); setCascadeConfirm(null); }} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: C.inkSoft }}>{equipo.sistema} · {records.length} mantenimiento{records.length !== 1 ? "s" : ""} registrado{records.length !== 1 ? "s" : ""}</p>
          )}
          {(() => {
            const costoTotal = (records || []).reduce((a, r) => a + Number(r.costo || 0), 0);
            const chips = [
              equipo.fechaInstalacion ? `📅 Instalado ${new Date(equipo.fechaInstalacion + "T00:00:00").toLocaleDateString("es-CO", { month: "short", year: "numeric" })}` : null,
              equipo.ubicacion ? `📍 ${equipo.ubicacion}` : null,
              costoTotal > 0 ? `💲 Costo acumulado $${costoTotal.toLocaleString("es-CO")}` : null,
              equipo.garantiaHasta ? `🛡️ Garantía hasta ${new Date(equipo.garantiaHasta + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}` : null,
            ].filter(Boolean);
            return chips.length ? <div className="flex flex-wrap gap-1.5 mt-1.5">{chips.map(c => <span key={c} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: C.bg, color: C.inkSoft }}>{c}</span>)}</div> : null;
          })()}
          {isAdmin && (
            <label className="inline-flex items-center gap-1 text-xs font-semibold mt-1 cursor-pointer" style={{ color: C.amber }}>
              {uploadingFoto ? "Subiendo…" : equipo.fotoMaestra ? "Cambiar foto oficial" : "Agregar foto oficial del equipo"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingFoto} onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingFoto(true);
                try { const url = await uploadPhoto(file, `equipo-foto-${equipo.id}`); await onSetFotoMaestra(equipo.id, url); }
                finally { setUploadingFoto(false); }
              }} />
            </label>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => { if (!preventiveStatus.configured && !editingFrecuencia) setPrevOpen(o => !o); }}>
          <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: C.inkSoft }}>
            <CalendarDays size={13} /> Mantenimiento preventivo
            {!preventiveStatus.configured && (prevOpen ? <ChevronDown size={13} color={C.gray} /> : <ChevronRight size={13} color={C.gray} />)}
          </div>
          {isAdmin && !editingFrecuencia && (
            <button onClick={(e) => { e.stopPropagation(); setFrecuenciaDraft(equipo.frecuenciaDias || ""); setEditingFrecuencia(true); setPrevOpen(true); }} className="text-xs font-semibold" style={{ color: C.amber }}>
              {equipo.frecuenciaDias ? "Cambiar" : "Configurar"}
            </button>
          )}
        </div>
        {(prevOpen || preventiveStatus.configured || editingFrecuencia) && (editingFrecuencia ? (
          <div className="flex items-center gap-2 flex-wrap">
            <select value={frecuenciaDraft} onChange={e => setFrecuenciaDraft(e.target.value)}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Sin configurar</option>
              <option value="30">Cada 30 días</option>
              <option value="60">Cada 60 días</option>
              <option value="90">Cada 90 días</option>
              <option value="180">Cada 180 días</option>
              <option value="365">Cada 365 días</option>
            </select>
            <Button size="sm" disabled={savingFrecuencia} onClick={async () => { setSavingFrecuencia(true); await onSetFrecuencia(equipo.id, frecuenciaDraft ? Number(frecuenciaDraft) : null); setSavingFrecuencia(false); setEditingFrecuencia(false); }}>
              {savingFrecuencia ? "Guardando…" : "Guardar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingFrecuencia(false)}>Cancelar</Button>
          </div>
        ) : preventiveStatus.configured ? (
          <div>
            <div className="text-sm" style={{ color: C.ink }}>Cada {equipo.frecuenciaDias} días</div>
            <div className="text-xs mt-1 font-semibold flex items-center gap-1" style={{ color: preventiveStatus.overdue ? C.red : preventiveStatus.dueSoon ? "#7a5405" : C.green }}>
              {(preventiveStatus.overdue || preventiveStatus.dueSoon) && <AlertTriangle size={12} />}
              {preventiveStatus.overdue
                ? (preventiveStatus.neverDone ? "Nunca se le ha hecho un preventivo" : `Atrasado por ${Math.abs(preventiveStatus.daysRemaining)} días`)
                : `Próximo en ${preventiveStatus.daysRemaining} días`}
            </div>
            {preventiveStatus.lastPreventiveDate && (
              <div className="text-xs mt-0.5" style={{ color: C.gray }}>Último preventivo: {fmtDT(preventiveStatus.lastPreventiveDate)}</div>
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: C.gray }}>Sin configurar — {isAdmin ? "define cada cuántos días se le debe hacer preventivo a este equipo, y la app te avisa sola cuando se acerque la fecha." : "no hay ninguna frecuencia definida todavía."}</p>
        ))}
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => { if (!equipo.videoUrl && !editingVideo) setVideoOpen(o => !o); }}>
          <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: C.inkSoft }}>
            <Video size={13} /> Video de referencia
            {!equipo.videoUrl && (videoOpen ? <ChevronDown size={13} color={C.gray} /> : <ChevronRight size={13} color={C.gray} />)}
          </div>
          {isAdmin && !editingVideo && (
            <button onClick={(e) => { e.stopPropagation(); setVideoDraft(equipo.videoUrl || ""); setEditingVideo(true); setVideoOpen(true); }} className="text-xs font-semibold" style={{ color: C.amber }}>
              {equipo.videoUrl ? "Cambiar" : "Agregar"}
            </button>
          )}
        </div>
        {(videoOpen || equipo.videoUrl || editingVideo) && (editingVideo ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <input value={videoDraft} onChange={e => setVideoDraft(e.target.value)} placeholder="Pega el enlace del video (YouTube, Drive, etc.)"
                className="flex-1 min-w-[200px] text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <Button size="sm" disabled={savingVideo || !videoDraft.trim()} onClick={async () => { setSavingVideo(true); await onSetVideoUrl(equipo.id, videoDraft); setSavingVideo(false); setEditingVideo(false); }}>
                {savingVideo ? "Guardando…" : "Guardar enlace"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingVideo(false); setVideoUploadError(null); }}>Cancelar</Button>
            </div>
            <div className="text-xs mb-1.5" style={{ color: C.gray }}>— o subir el video directo desde el celular —</div>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md cursor-pointer" style={{ background: C.bg, color: C.inkSoft }}>
              <Upload size={13} />
              {uploadingVideo ? "Subiendo…" : "Elegir video del celular"}
              <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingVideo(true);
                setVideoUploadError(null);
                try {
                  const url = await uploadVideo(file, `equipo-${equipo.id}`);
                  await onSetVideoUrl(equipo.id, url);
                  setEditingVideo(false);
                } catch (err) {
                  setVideoUploadError(err.message || "No se pudo subir el video.");
                } finally {
                  setUploadingVideo(false);
                }
              }} />
            </label>
            {videoUploadError && <p className="text-xs mt-1.5" style={{ color: C.red }}>{videoUploadError}</p>}
          </div>
        ) : equipo.videoUrl ? (
          <VideoEmbed url={equipo.videoUrl} />
        ) : (
          <p className="text-xs" style={{ color: C.gray }}>Sin video guardado — {isAdmin ? "agrega el enlace de un video corto mostrando cómo se hace el mantenimiento." : "no hay ninguno cargado todavía."}</p>
        ))}
      </div>

      <EquipoPartsCard records={records} invItems={invItems} />

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <button onClick={() => setShowTimeline(v => !v)} className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft, minHeight: 32 }}>
          <span>Línea de tiempo y cambios</span><span>{showTimeline ? "▲" : "▼"}</span>
        </button>
        {showTimeline && (() => {
          const ev = [];
          if (equipo.fechaInstalacion) ev.push({ at: equipo.fechaInstalacion + "T00:00:00", icon: "📅", text: "Instalación del equipo" });
          (records || []).forEach(r => ev.push({ at: r.fecha, icon: r.tipo === "preventivo" ? "🛠️" : "🔧", text: `${r.tipo === "preventivo" ? "Preventivo" : "Correctivo"}${r.descripcion ? ` — ${r.descripcion}` : ""}` }));
          (tasks || []).filter(t => t.equipoId === equipo.id).forEach(t => {
            ev.push({ at: t.createdAt, icon: "📋", text: `Tarea creada: ${t.titulo}` });
            if (t.finishedAt) ev.push({ at: t.finishedAt, icon: "✅", text: `Tarea cerrada: ${t.titulo}` });
          });
          (editLog || []).filter(l => l.entityLabel === equipo.nombre && l.kind === "equipo").forEach(l => ev.push({ at: l.at, icon: "✏️", text: `${l.by || "Alguien"} cambió ${l.field || "datos"}${l.before != null ? ` (${l.before} → ${l.after})` : ""}` }));
          ev.sort((a, b) => new Date(b.at) - new Date(a.at));
          return ev.length === 0 ? <p className="text-xs mt-2" style={{ color: C.gray }}>Todavía no hay eventos.</p> : (
            <div className="mt-2 space-y-1">
              {ev.slice(0, 40).map((e, i) => (
                <div key={i} className="flex gap-2 text-xs py-1 border-t" style={{ borderColor: C.line, color: C.ink }}>
                  <span className="shrink-0">{e.icon}</span>
                  <span className="flex-1">{e.text}</span>
                  <span className="shrink-0" style={{ color: C.gray }}>{e.at ? new Date(e.at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" }) : ""}</span>
                </div>
              ))}
              {ev.length > 40 && <div className="text-[11px]" style={{ color: C.gray }}>+{ev.length - 40} eventos más antiguos</div>}
            </div>
          );
        })()}
      </div>

      {repeatedFailures >= 3 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
          <div className="text-xs font-semibold" style={{ color: C.red }}>⚠️ Falla repetida — {repeatedFailures} correctivos en los últimos 60 días</div>
          <p className="text-xs mt-0.5" style={{ color: C.ink }}>Este equipo se está dañando seguido. Puede ser candidato a revisión a fondo o reemplazo, no solo a otra reparación más.</p>
        </div>
      )}

      {(() => {
        const v = Number(equipo.valorReemplazo) || 0;
        const gastado = (records || []).reduce((a, r) => a + (Number(r.costo) || 0), 0);
        const money = (n) => "$" + Math.round(n).toLocaleString("es-CO");
        if (!v) return isAdmin && gastado > 0 ? (
          <div className="rounded-lg border p-3 mb-4 text-xs" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
            💸 Se han gastado {money(gastado)} en este equipo. Agrega su <b>valor de reemplazo</b> (en "Vida útil estimada" → Editar) para saber si conviene seguir reparándolo.
          </div>
        ) : null;
        const pct = Math.round((gastado / v) * 100);
        const tone = pct >= 60 ? C.red : pct >= 40 ? C.amber : C.green;
        return (
          <div className="rounded-lg border p-3 mb-4" style={{ borderColor: tone, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Reparar o reemplazar</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{money(gastado)} gastados de {money(v)} que cuesta uno nuevo ({pct}%)</div>
            <div className="h-2 rounded-full overflow-hidden mt-1" style={{ background: C.bg }}><div style={{ width: Math.min(100, pct) + "%", height: "100%", background: tone }} /></div>
            <p className="text-xs mt-1" style={{ color: tone === C.green ? C.inkSoft : tone }}>
              {pct >= 60 ? "Ya se gastó más de la mitad de lo que cuesta uno nuevo: conviene reemplazarlo." : pct >= 40 ? "Va cerca de la mitad del costo de uno nuevo: vigílalo antes de otra reparación grande." : "Todavía sale más barato repararlo que cambiarlo."}
            </p>
          </div>
        );
      })()}

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Vida útil estimada</div>
        {editingVidaUtil ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>Fecha de instalación</label>
              <input type="date" value={fechaInstalacionDraft} onChange={e => setFechaInstalacionDraft(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>Vida útil (años)</label>
              <input type="number" min="1" value={vidaUtilDraft} onChange={e => setVidaUtilDraft(e.target.value)} placeholder="ej: 10"
                className="text-sm border rounded-md px-2 py-1.5 outline-none w-24" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>Garantía hasta</label>
              <input type="date" value={garantiaDraft} onChange={e => setGarantiaDraft(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>Valor de reemplazo ($)</label>
              <input type="text" inputMode="numeric" value={valorReempDraft} onChange={e => setValorReempDraft(e.target.value)} placeholder="ej: 4500000"
                className="text-sm border rounded-md px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            </div>
            <Button size="sm" disabled={savingVidaUtil} onClick={async () => {
              setSavingVidaUtil(true);
              await onUpdateEquipoInfo?.(equipo.id, { fechaInstalacion: fechaInstalacionDraft || null, vidaUtilAnios: vidaUtilDraft ? Number(vidaUtilDraft) : null, garantiaHasta: garantiaDraft || null, valorReemplazo: Number(String(valorReempDraft).replace(/[^\d]/g, "")) || null });
              setSavingVidaUtil(false); setEditingVidaUtil(false);
            }}>Guardar</Button>
            <button onClick={() => setEditingVidaUtil(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
          </div>
        ) : vidaUtilInfo ? (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: C.bg }}>
                <div className="h-full" style={{ width: `${Math.min(100, vidaUtilInfo.pct)}%`, background: vidaUtilInfo.overLife ? C.red : vidaUtilInfo.pct > 75 ? C.amber : C.green }} />
              </div>
              <div className="text-xs mt-1" style={{ color: vidaUtilInfo.overLife ? C.red : C.inkSoft }}>
                {vidaUtilInfo.years} años de {equipo.vidaUtilAnios} estimados ({vidaUtilInfo.pct}%){vidaUtilInfo.overLife ? " — ya superó su vida útil estimada" : ""}
              </div>
            </div>
            {isAdmin && <button onClick={() => setEditingVidaUtil(true)} className="text-xs font-semibold" style={{ color: C.amber }}>Editar</button>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: C.gray }}>Sin fecha de instalación / vida útil registradas.</p>
            {isAdmin && <button onClick={() => setEditingVidaUtil(true)} className="text-xs font-semibold" style={{ color: C.amber }}>Agregar</button>}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Manual del fabricante</div>
        {editingManual ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input value={manualDraft} onChange={e => setManualDraft(e.target.value)} placeholder="Enlace al manual (PDF en Drive, Dropbox, etc.)"
              className="flex-1 min-w-[200px] text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} />
            <Button size="sm" disabled={savingManual} onClick={async () => {
              setSavingManual(true);
              await onUpdateEquipoInfo?.(equipo.id, { manualUrl: manualDraft.trim() || null });
              setSavingManual(false); setEditingManual(false);
            }}>Guardar</Button>
            <button onClick={() => setEditingManual(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
          </div>
        ) : equipo.manualUrl ? (
          <div className="flex items-center justify-between">
            <a href={equipo.manualUrl} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: C.blue }}>Abrir manual del fabricante ↗</a>
            {isAdmin && <button onClick={() => { setManualDraft(equipo.manualUrl); setEditingManual(true); }} className="text-xs font-semibold" style={{ color: C.amber }}>Cambiar</button>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: C.gray }}>Sin manual adjunto.</p>
            {isAdmin && <button onClick={() => setEditingManual(true)} className="text-xs font-semibold" style={{ color: C.amber }}>Agregar enlace</button>}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 flex-wrap mb-4">
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <Button size="sm" variant="ghost" icon={Download} disabled={downloadingQr} onClick={doDownloadQr}>{downloadingQr ? "Generando…" : "Descargar QR"}</Button>
        </div>

        {!viewerLocked && (
        <div className="flex-1 min-w-[260px] rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Registrar mantenimiento</div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {MTTO_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {MTTO_ESTADOS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <input type="text" inputMode="numeric" value={costo ? Number(costo.toString().replace(/\D/g, "") || 0).toLocaleString("es-CO") : ""}
              onChange={e => setCosto(e.target.value.replace(/\D/g, ""))} placeholder="Costo total (opcional)"
              className="text-sm border rounded-md px-2 py-1.5 outline-none w-36" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          {Number(costo) > 0 && (
            <div className="mb-2">
              <div className="text-[10px] mb-1" style={{ color: C.gray }}>De ese total, ¿cuánto fue repuestos y cuánto contratista externo? (opcional — lo demás se cuenta como mano de obra propia)</div>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="text" inputMode="numeric" value={costoRepuestos ? Number(costoRepuestos.toString().replace(/\D/g, "") || 0).toLocaleString("es-CO") : ""}
                  onChange={e => setCostoRepuestos(e.target.value.replace(/\D/g, ""))} placeholder="Repuestos"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none w-28" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <input type="text" inputMode="numeric" value={costoContratista ? Number(costoContratista.toString().replace(/\D/g, "") || 0).toLocaleString("es-CO") : ""}
                  onChange={e => setCostoContratista(e.target.value.replace(/\D/g, ""))} placeholder="Contratista"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none w-28" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              </div>
            </div>
          )}
          <MaintenanceTextSuggestions sistema={equipo.sistema} tipo={tipo} onPick={t => setDescripcion(d => d.trim() ? `${d.trim()} ${t}` : t)} />
          <EquipoHistorySuggestions equipoId={equipo.id} mttoLog={records} onPick={t => setDescripcion(d => d.trim() ? `${d.trim()} ${t}` : t)} />
          <div className="flex items-start gap-1.5 mb-2">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="¿Qué se hizo?"
              className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <VoiceInputButton onResult={text => setDescripcion(d => (d ? d + " " : "") + text)} />
          </div>
          <div className="text-xs mb-1" style={{ color: C.gray }}>Fotos {reqFields.foto ? <b style={{ color: C.red }}>(obligatorio)</b> : "(opcional, hasta 2)"}</div>
          <PhotoPicker photos={photos} onChange={setPhotos} max={6} />
          {invItems && (
            <>
              <div className="text-xs mb-1 mt-2" style={{ color: C.gray }}>Repuestos usados {reqFields.repuestos ? <b style={{ color: C.red }}>(obligatorio)</b> : "(opcional)"} — se descuentan solos del inventario</div>
              <PartsPicker invItems={invItems} parts={repuestos} onChange={setRepuestos} />
            </>
          )}
          {reqFields.costo && <div className="text-[10px] mb-1" style={{ color: C.red }}>El costo total es obligatorio para este registro.</div>}
          {dupWarning && (
            <div className="rounded-md p-2.5 mt-2" style={{ background: C.amberSoft }}>
              <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.amber }}>
                <AlertTriangle size={13} /> Ya hay un registro de hoy para este equipo, a las {fmtDT(dupWarning.fecha || dupWarning.createdAt)}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Button size="sm" variant="ghost" onClick={() => doSave(true)}>Registrar de todos modos</Button>
                <button onClick={() => setDupWarning(null)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
              </div>
            </div>
          )}
          <div className="mt-2">
            <Button size="sm" disabled={saving} onClick={() => doSave(false)}>{saving ? "Guardando…" : "Guardar registro"}</Button>
          </div>
          {saveMsg && <div className="text-xs mt-2" style={{ color: saveMsg.ok ? C.green : C.red }}>{saveMsg.text}</div>}
        </div>
        )}
      </div>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Hoja de vida</div>
          <Button size="sm" variant="ghost" icon={Download} disabled={downloadingHV} onClick={doDownloadHojaVida}>
            {downloadingHV ? "Generando…" : "Descargar hoja de vida (PDF)"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Primer registro</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{fechaAlta ? fmtDT(fechaAlta).split(",")[0] : "—"}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Mantenimientos totales</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{stats.total} ({stats.correctivos} correctivos)</div>
          </div>
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Costo acumulado</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{stats.costoTotal ? `$${stats.costoTotal.toLocaleString("es-CO")}` : "—"}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: status.outOfService ? C.redSoft : C.greenSoft }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Estado actual</div>
            <div className="text-sm font-semibold" style={{ color: status.outOfService ? C.red : C.green }}>{status.outOfService ? "Fuera de servicio" : "Funcionando"}</div>
          </div>
        </div>
        {partsChanged.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.inkSoft }}>Piezas cambiadas (detectado en las descripciones)</div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(partsChanged.map(p => p.parte))].map(parte => {
                const ultima = partsChanged.find(p => p.parte === parte);
                return (
                  <span key={parte} className="text-xs px-2 py-1 rounded-full" style={{ background: C.amberSoft, color: C.amber }} title={ultima.descripcion}>
                    {parte} · {fmtDT(ultima.fecha).split(",")[0]}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Historial — línea de tiempo</div>
      {records.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin mantenimientos registrados todavía.</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute top-1 bottom-1 w-0.5" style={{ left: 5, background: C.line }} />
          {records.map(r => {
            const fueraDeServicio = r.estado === "fuera-de-servicio";
            return (
              <div key={r.id} className="relative mb-3">
                <div className="absolute rounded-full border-2" style={{ left: -20, top: 5, width: 11, height: 11, background: fueraDeServicio ? C.red : C.green, borderColor: C.panel }} />
                <div className="rounded-lg border p-3" style={{ borderColor: fueraDeServicio ? C.red : C.line, background: fueraDeServicio ? C.redSoft : C.panel }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs font-semibold" style={{ color: C.ink }}>
                      {MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo} · {fmtDT(r.fecha)}
                    </div>
                    <Pill tone={fueraDeServicio ? "red" : "green"}>{MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado}</Pill>
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.inkSoft }}>{r.descripcion}</div>
                  <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: C.gray }}><Avatar name={r.tecnico} size={16} /> Por {r.tecnico}{r.costo ? ` · Costo: ${r.costo.toLocaleString("es-CO")}` : ""}</div>
                  {r.fotos && r.fotos.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {r.fotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img loading="lazy" src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Repuestos que usa cada equipo según sus mantenimientos, con lo que hay hoy en bodega. */
function EquipoPartsCard({ records, invItems }) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const by = {};
    (records || []).forEach(r => (r.repuestos || []).forEach(p => {
      if (!p.itemId) return;
      const o = (by[p.itemId] = by[p.itemId] || { itemId: p.itemId, usado: 0, veces: 0 });
      o.usado += Number(p.cantidad) || 0; o.veces += 1;
    }));
    return Object.values(by).map(o => ({ ...o, it: (invItems || []).find(i => i.id === o.itemId) })).sort((a, b) => b.veces - a.veces);
  }, [records, invItems]);
  if (rows.length === 0) return null;
  const faltan = rows.filter(x => x.it && x.it.minThreshold > 0 ? x.it.quantity <= x.it.minThreshold : x.it && x.it.quantity <= 0).length;
  return (
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft, minHeight: 32 }}>
        <span>Repuestos de este equipo ({rows.length}){faltan > 0 ? ` · ⚠️ ${faltan} bajos` : ""}</span><span>{open ? "▲" : "▼"}</span>
      </button>
      {open && rows.map(x => {
        const bajo = x.it && (x.it.minThreshold > 0 ? x.it.quantity <= x.it.minThreshold : x.it.quantity <= 0);
        return (
          <div key={x.itemId} className="flex items-center justify-between gap-2 text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
            <span className="truncate">{x.it ? x.it.name : "Repuesto ya no está en el inventario"}</span>
            <span className="shrink-0" style={{ color: C.inkSoft }}>usado {x.usado} ({x.veces} {x.veces === 1 ? "vez" : "veces"})</span>
            <span className="shrink-0 font-semibold" style={{ color: bajo ? C.red : C.green }}>{x.it ? `bodega: ${x.it.quantity}${x.it.unit ? " " + x.it.unit : ""}` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}