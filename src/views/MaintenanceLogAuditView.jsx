import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, ChevronRight, Download, Mail, Wrench, X } from "lucide-react";
import { C, MTTO_ESTADOS, MTTO_TIPOS, authHeaders, badgeToneFor, bufferToBase64, fmtDT, isPendingReview, nowIso, showToast, sortRows, todayStr, useBackCloseModal } from "../shared/core";
import { Avatar, Badge, Button, Lightbox, Pill } from "../shared/components";



export function MaintenanceLogAuditView({ equipos, mttoLog, isAdmin, onReview, reportEmail, onLogSent, currentUser, onViewEquipoHistory }) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState({ key: "fecha", dir: "desc" });
  const onSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "fecha" ? "desc" : "asc" });
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [reviewComment, setReviewComment] = useState("");
  const [drawerSwipeX, setDrawerSwipeX] = useState(0);
  const drawerTouchStartX = useRef(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const sentinelRef = useRef(null);
  useBackCloseModal(!!selectedId, () => setSelectedId(null));
  useBackCloseModal(showExportModal, () => setShowExportModal(false));

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { setVisibleCount(20); }, [search, filterTipo, onlyMine, sort]); // si cambian los filtros, vuelve a empezar
  useEffect(() => { setReviewComment(""); setConfirmApprove(false); }, [selectedId]); // no arrastrar el comentario de un registro al siguiente

  const rows = useMemo(() => {
    return mttoLog.map(r => {
      const eq = equipos.find(e => e.id === r.equipoId);
      return { ...r, equipoNombre: eq?.nombre || "(equipo eliminado)", sistema: eq?.sistema || "—", equipoFotoMaestra: eq?.fotoMaestra || null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const filtered = useMemo(() => {
    const base = sortRows(rows.filter(r => {
      if (filterTipo && r.tipo !== filterTipo) return false;
      if (onlyMine && r.tecnico !== currentUser) return false;
      if (!search.trim()) return true;
      return `${r.equipoNombre} ${r.sistema} ${r.tecnico} ${r.descripcion}`.toLowerCase().includes(search.toLowerCase());
    }), sort);
    // Los pendientes de revisión siempre van primero — es lo que el supervisor debe auditar hoy,
    // sin importar qué columna haya elegido para ordenar el resto de la lista.
    return [...base].sort((a, b) => (isPendingReview(a) ? 0 : 1) - (isPendingReview(b) ? 0 : 1));
  }, [rows, filterTipo, onlyMine, currentUser, search, sort]);

  const selected = filtered.find(r => r.id === selectedId) || rows.find(r => r.id === selectedId);
  const selectedIndex = mttoLog.findIndex(r => r.id === selectedId);
  const shortId = (id) => "#MT-" + (id || "").replace(/[^0-9]/g, "").slice(-4).padStart(4, "0");

  // Scroll infinito: cuando el "centinela" invisible al final de la lista entra en pantalla,
  // se cargan 20 más — así nunca se descargan los cientos de reportes de una sola vez.
  // Antes este efecto no tenía arreglo de dependencias, así que se volvía a ejecutar después de
  // CADA render (no solo al montar). Como observe() dispara su callback casi de inmediato con el
  // estado actual de intersección, si el centinela seguía visible en pantalla cada re-render
  // volvía a sumar 20 más — anulando por completo el scroll infinito (se cargaba todo de golpe).
  // Ahora solo se reconstruye cuando en verdad hace falta seguir cargando.
  useEffect(() => {
    if (visibleCount >= filtered.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount(v => v + 20);
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Fecha", "Sistema", "Equipo", "Tipo", "Estado", "Técnico", "Descripción", "Costo", "Fotos"];
    const data = filtered.map(r => [fmtDT(r.fecha), r.sistema, r.equipoNombre, MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo,
      MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado, r.tecnico, r.descripcion, r.costo || "", (r.fotos || []).join(" | ")]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
    return wb;
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `mantenimientos-realizados-${todayStr().replace(/\//g, "-")}.xlsx`);
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
          subject: `Mantenimientos Realizados (Excel) — ${todayStr()}`,
          text: `Historial de mantenimientos realizados (${filtered.length} registros) en Excel.`,
          attachmentBase64: base64,
          filename: `mantenimientos-realizados-${todayStr().replace(/\//g, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Mantenimientos realizados (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
      // Antes esto cerraba el modal en el mismo instante en que se ponía el mensaje de éxito —
      // como las dos actualizaciones de estado caen en el mismo render de React, el modal (que es
      // donde vive el mensaje) desaparecía antes de que nadie alcanzara a leer "Enviado.". El
      // toast se ve sin importar qué esté abierto, y el cierre se retrasa un poco para que
      // también alcance a verse el mensaje dentro del modal.
      if (resp.ok) {
        showToast("✓ Enviado por correo.", true);
        setTimeout(() => setShowExportModal(false), 900);
      }
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Historial de mantenimientos</h2>
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Todo lo que los técnicos han registrado, en un solo lugar — toca cualquiera para ver el detalle completo.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por equipo, sistema, técnico o descripción…"
          className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Todos los tipos</option>
          {MTTO_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        <button onClick={() => setOnlyMine(v => !v)} className="text-xs font-semibold px-3 rounded-md border shrink-0" style={{ background: onlyMine ? C.steelDark : C.panel, color: onlyMine ? "#fff" : C.inkSoft, borderColor: onlyMine ? C.steelDark : C.line, minHeight: 36 }}>
          {onlyMine ? "✓ Solo lo mío" : "Solo lo mío"}
        </button>
        <button onClick={() => setShowExportModal(true)} title="Descargar o enviar en Excel" aria-label="Descargar o enviar en Excel" className="p-2 rounded-md shrink-0" style={{ background: C.bg }}>
          <Download size={16} color={C.ink} />
        </button>
      </div>

      <SortBar sort={sort} onSort={onSort} options={[
        { key: "fecha", label: "Fecha" },
        { key: "equipoNombre", label: "Equipo" },
        { key: "tecnico", label: "Técnico" },
        { key: "costo", label: "Costo" },
      ]} />

      {filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin mantenimientos registrados todavía.</p>
      ) : filtered.slice(0, visibleCount).map(r => (
        <button key={r.id} onClick={() => setSelectedId(r.id)}
          className="w-full text-left rounded-lg border-2 p-3 mb-2 flex items-center gap-3 transition duration-150 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: isPendingReview(r) ? C.amber : r.estado === "fuera-de-servicio" ? C.red : C.line, background: isPendingReview(r) ? C.amberSoft : r.estado === "fuera-de-servicio" ? C.redSoft : C.panel }}>
          {r.fotos && r.fotos.length > 0 ? (
            <img loading="lazy" src={r.fotos[0]} alt="" className="w-14 h-14 object-cover rounded-lg border shrink-0" style={{ borderColor: C.line }} />
          ) : (
            <div className="w-14 h-14 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: C.line, background: C.bg }}>
              <Wrench size={18} color={C.gray} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate" style={{ color: C.ink }}>{r.equipoNombre}</div>
              <Pill tone={r.estado === "fuera-de-servicio" ? "red" : "green"}>{MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado}</Pill>
            </div>
            <div className="text-xs truncate" style={{ color: C.gray }}>{r.sistema}</div>
            <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: C.inkSoft }}>
              <Badge tone={badgeToneFor("tipoMtto", r.tipo)}>{MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo}</Badge>
              {isPendingReview(r) && <Badge tone="amber">Pendiente de revisión</Badge>}
              {r.revisionEstado === "rechazado" && <Badge tone="red">Devuelto</Badge>}
              <Avatar name={r.tecnico} size={16} /> {r.tecnico} · {fmtDT(r.fecha)}
            </div>
          </div>
          <ChevronRight size={16} color={C.gray} className="shrink-0" />
        </button>
      ))}
      {filtered.length > visibleCount && (
        <div ref={sentinelRef} className="py-4 text-center text-xs" style={{ color: C.gray }}>
          Cargando más… ({visibleCount} de {filtered.length})
        </div>
      )}

      {/* Modal de exportación — antes era un bloque gigante siempre visible, ahora vive detrás del ícono de descarga */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowExportModal(false)}>
          <div className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold" style={{ color: C.ink }}>Descargar / enviar en Excel</div>
              <button onClick={() => setShowExportModal(false)} aria-label="Cerrar"><X size={18} color={C.gray} /></button>
            </div>
            <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
                className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
              <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar"}</Button>
            </div>
            {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
          </div>
        </div>
      )}

      {/* Panel de detalle — reporte tipo documento industrial, con lo que de verdad se registra hoy.
          Se puede cerrar deslizando hacia la derecha (además del botón y de tocar el fondo). */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSelectedId(null)}>
          <div className="w-full sm:w-[440px] h-full flex flex-col" style={{ background: C.panel, transform: `translateX(${drawerSwipeX}px)`, transition: drawerSwipeX === 0 ? "transform 150ms" : "none" }}
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { drawerTouchStartX.current = e.touches[0].clientX; }}
            onTouchMove={e => {
              if (drawerTouchStartX.current == null) return;
              const dx = e.touches[0].clientX - drawerTouchStartX.current;
              if (dx > 0) setDrawerSwipeX(Math.min(300, dx));
            }}
            onTouchEnd={() => {
              if (drawerSwipeX > 90) setSelectedId(null);
              setDrawerSwipeX(0);
              drawerTouchStartX.current = null;
            }}>
          <div className="flex-1 overflow-y-auto p-5">
            <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.inkSoft }}>
              <ArrowLeft size={15} /> Cerrar
            </button>

            {/* Encabezado ejecutivo — Cabecera del Activo: foto maestra + hoja de vida */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-mono font-semibold" style={{ color: C.gray }}>{shortId(selected.id)}</div>
              <Pill tone={selected.estado === "fuera-de-servicio" ? "red" : "green"}>{MTTO_ESTADOS.find(s => s.code === selected.estado)?.label || selected.estado}</Pill>
            </div>
            <div className="flex items-start gap-3 mb-4">
              {selected.equipoFotoMaestra ? (
                <img loading="lazy" src={selected.equipoFotoMaestra} alt="" className="w-16 h-16 rounded-lg object-cover border shrink-0" style={{ borderColor: C.line }} />
              ) : (
                <div className="w-16 h-16 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: C.line, background: C.bg }}>
                  <Wrench size={22} color={C.gray} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-0.5" style={{ color: C.ink }}>{selected.equipoNombre}</h2>
                <div className="text-sm mb-1.5" style={{ color: C.inkSoft }}>{selected.sistema}</div>
                {selected.equipoId && onViewEquipoHistory && (
                  <button onClick={() => onViewEquipoHistory(selected.equipoId)} className="text-xs font-semibold flex items-center gap-1" style={{ color: C.amber }}>
                    📄 Ver hoja de vida del equipo
                  </button>
                )}
              </div>
            </div>

            {/* Sección 1: Datos de ejecución */}
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Datos de ejecución</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs" style={{ color: C.gray }}>Tipo</div>
                <Badge tone={badgeToneFor("tipoMtto", selected.tipo)}>{MTTO_TIPOS.find(t => t.code === selected.tipo)?.label || selected.tipo}</Badge>
              </div>
              <div>
                <div className="text-xs" style={{ color: C.gray }}>Técnico</div>
                <div className="flex items-center gap-1.5 mt-0.5"><Avatar name={selected.tecnico} size={18} /> <span className="text-sm" style={{ color: C.ink }}>{selected.tecnico}</span></div>
              </div>
              <div className="col-span-2">
                <div className="text-xs" style={{ color: C.gray }}>Fecha de registro</div>
                <div className="text-sm" style={{ color: C.ink }}>{fmtDT(selected.fecha)}</div>
              </div>
            </div>

            {/* Sección 2: Diagnóstico y trabajo realizado */}
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Diagnóstico y trabajo realizado</div>
            <div className="text-sm mb-4 pl-3" style={{ borderLeft: `3px solid ${C.amber}`, color: C.ink, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {selected.descripcion || "(sin descripción)"}
            </div>

            {/* Sección 3: Evidencia fotográfica */}
            {selected.fotos && selected.fotos.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Evidencia fotográfica</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selected.fotos.map((url, i) => (
                    <button key={i} onClick={() => setLightboxUrl(url)}>
                      <img loading="lazy" src={url} alt="" className="w-full aspect-square object-cover rounded-md border" style={{ borderColor: C.line }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Sección 4: Insumos y repuestos utilizados */}
            {selected.repuestos && selected.repuestos.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Insumos y repuestos utilizados</div>
                <div className="rounded-lg border overflow-hidden mb-4" style={{ borderColor: C.line }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: C.bg }}>
                      <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: C.inkSoft }}>Cant.</th>
                      <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: C.inkSoft }}>Repuesto</th>
                    </tr></thead>
                    <tbody>
                      {selected.repuestos.map((rp, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                          <td className="px-2.5 py-1.5" style={{ color: C.ink }}>{rp.cantidad}</td>
                          <td className="px-2.5 py-1.5" style={{ color: C.ink }}>{rp.nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {selected.costo > 0 && (
              <div className="text-sm mb-4" style={{ color: C.ink }}>Costo total: <b>${Number(selected.costo).toLocaleString("es-CO")}</b></div>
            )}

            {/* Sección 5: Trazabilidad */}
            <div className="text-xs pt-3 mt-2 border-t" style={{ color: C.gray, borderColor: C.line }}>
              Registrado por <b>{selected.createdBy}</b> el {fmtDT(selected.createdAt)}
              {selectedIndex >= 0 && <> · registro {selectedIndex + 1} de {mttoLog.length}</>}
            </div>

            {selected.revisionEstado && selected.revisionEstado !== "pendiente" && (
              <div className="text-xs mt-3 pt-3 border-t rounded-lg p-2.5" style={{ borderColor: C.line, background: selected.revisionEstado === "aprobado" ? C.greenSoft : C.redSoft, color: selected.revisionEstado === "aprobado" ? C.green : C.red }}>
                {selected.revisionEstado === "aprobado" ? "✓ Aprobado" : "↩ Devuelto"} por <b>{selected.revisadoPor}</b> el {fmtDT(selected.revisadoAt)}
                {selected.revisionComentario && <div className="mt-1" style={{ color: C.ink }}>"{selected.revisionComentario}"</div>}
              </div>
            )}
          </div>

          {/* Módulo de auditoría — footer FIJO, siempre visible sin importar cuánto se haya scrolleado arriba */}
          {isAdmin && isPendingReview(selected) && (
            <div className="shrink-0 border-t p-4" style={{ borderColor: C.line, background: C.bg }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Revisión de supervisor</div>
              <textarea value={reviewComment} onChange={e => { setReviewComment(e.target.value); setReviewError(null); }} rows={2} placeholder="Escribe un comentario o motivo de rechazo…"
                className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: reviewError ? C.red : C.line, background: C.panel, color: C.ink }} />
              {reviewError && <p className="text-xs mb-2" style={{ color: C.red }}>{reviewError}</p>}
              <div className="space-y-2">
                {confirmApprove ? (
                  <div className="rounded-md p-2.5 text-xs" style={{ background: C.greenSoft, color: C.green }}>
                    <div className="font-semibold mb-2">¿Confirmas aprobar y cerrar este ticket? No se puede deshacer desde aquí.</div>
                    <div className="flex items-center gap-2">
                      <button disabled={reviewing} onClick={async () => {
                        setReviewing(true); setReviewError(null);
                        try {
                          await onReview(selected.id, "aprobado", reviewComment);
                          setReviewComment(""); setConfirmApprove(false);
                          setSelectedId(null);
                          setSuccessToast("✓ Mantenimiento aprobado y cerrado.");
                          setTimeout(() => setSuccessToast(null), 4000);
                        } catch (e) {
                          setReviewError(e.message || "No se pudo aprobar — revisa tu conexión e intenta de nuevo.");
                        } finally {
                          setReviewing(false);
                        }
                      }} className="flex-1 text-xs font-semibold px-2 py-1.5 rounded" style={{ background: C.green, color: "#fff" }}>
                        {reviewing ? "Guardando…" : "Sí, aprobar y cerrar"}
                      </button>
                      <button disabled={reviewing} onClick={() => setConfirmApprove(false)} className="text-xs font-semibold px-2 py-1.5" style={{ color: C.gray }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="[&>button]:w-full [&>button]:justify-center">
                    <Button variant="green" disabled={reviewing} onClick={() => setConfirmApprove(true)}>
                      ✔️ Aprobar y Cerrar Ticket
                    </Button>
                  </div>
                )}
                <div className="[&>button]:w-full [&>button]:justify-center">
                  <Button variant="amber" disabled={reviewing} onClick={async () => {
                    if (!reviewComment.trim()) { setReviewError("Escribe el motivo antes de devolverlo — el técnico necesita saber qué corregir."); return; }
                    setReviewing(true); setReviewError(null);
                    try {
                      await onReview(selected.id, "rechazado", reviewComment);
                      setReviewComment("");
                      setSelectedId(null);
                      setSuccessToast("↩ Devuelto al técnico, con notificación enviada.");
                      setTimeout(() => setSuccessToast(null), 4000);
                    } catch (e) {
                      setReviewError(e.message || "No se pudo devolver el registro — revisa tu conexión e intenta de nuevo.");
                    } finally {
                      setReviewing(false);
                    }
                  }}>
                    ↩️ Rechazar / Devolver
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] rounded-xl shadow-2xl px-4 py-3" style={{ background: C.steelDark, color: "#fff" }}>
          <span className="text-sm">{successToast}</span>
        </div>
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
/** Mismo ordenamiento que SortableTh, pero en formato de botones — para listas mostradas como
 * tarjetas (no una <table> real, por ejemplo cuando cada fila necesita mostrar fotos) donde no
 * hay cabecera de columnas físicas donde hacer clic. */
function SortBar({ options, sort, onSort }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-3">
      <span className="text-xs" style={{ color: C.gray }}>Ordenar por:</span>
      {options.map(opt => {
        const active = sort.key === opt.key;
        return (
          <button key={opt.key} onClick={() => onSort(opt.key)}
            className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background: active ? C.amberSoft : C.bg, color: active ? "#7a5405" : C.inkSoft }}>
            {opt.label}
            {active && <span style={{ fontSize: 9 }}>{sort.dir === "desc" ? "▼" : "▲"}</span>}
          </button>
        );
      })}
    </div>
  );
}