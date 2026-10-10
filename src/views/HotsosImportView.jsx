import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { C, classifyHotsosProblem, findReincidencia, matchHotsosAssignee, matchHotsosEquipo, normalizeSearchText, parseHotsosAge } from "../shared/core";
import { Badge, Button } from "../shared/components";




/**
 * Importar el reporte "Órdenes Pendientes" que exporta HotSOS (Excel) y convertirlo en tareas —
 * cruzando el técnico que HotSOS ya asignó con las cuentas de esta app cuando el nombre coincide.
 * No duplica órdenes ya importadas antes (las reconoce por su número de orden de HotSOS).
 */
export function HotsosImportView({ accounts, existingOrderIds, currentUserDisplayName, hotsosTaskCount, onImport, onRetryAssignments, onBulkDelete, equipos, openTasks = [], recentClosed = [] }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});
  const [parseError, setParseError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [filterAsignado, setFilterAsignado] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null); setRows([]); setImportMsg(null); setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const dataRows = raw.slice(1).filter(r => r && r[0]);
      const parsed = dataRows.map(r => {
        const orderId = String(r[0]);
        const edadStr = String(r[1] || "");
        const problema = String(r[2] || "").replace(/^[^-]+-\s*/, "");
        const lugar = String(r[3] || "");
        const asignadoHotsos = String(r[4] || "").trim();
        return {
          orderId, edadStr, edadHoras: parseHotsosAge(edadStr), problema, lugar, asignadoHotsos,
          matchedUser: matchHotsosAssignee(asignadoHotsos, accounts), categoria: classifyHotsosProblem(problema),
          matchedEquipoId: matchHotsosEquipo(lugar, problema, equipos),
          alreadyImported: existingOrderIds.has(orderId),
        };
      });
      // Posibles duplicados: misma habitación y mismo problema (o misma categoría) que una tarea que
      // sigue abierta, o repetida dentro del propio Excel. No se marcan para importar por defecto.
      {
        const roomOf = (txt) => (/\b(\d{3,5})\b/.exec(txt || "") || [])[1] || null;
        const seen = [];
        parsed.forEach(p => {
          if (p.alreadyImported) return;
          const room = roomOf(p.lugar);
          if (!room) return;
          const nb = normalizeSearchText(p.problema);
          const dup = openTasks.find(t => {
            if (roomOf(String(t.descripcion || "").split(" — ")[0]) !== room) return false;
            const na = normalizeSearchText(t.titulo);
            return na === nb || (nb.length > 6 && (na.includes(nb) || nb.includes(na))) || String(t.descripcion || "").includes(`categoría sugerida: ${p.categoria}`);
          });
          if (dup) p.possibleDup = `ya hay una tarea abierta: «${dup.titulo}»`;
          else {
            const inFile = seen.find(x => x.room === room && (x.nb === nb || x.categoria === p.categoria));
            if (inFile) p.possibleDup = `se repite en este Excel (orden ${inFile.orderId})`;
          }
          seen.push({ room, nb, categoria: p.categoria, orderId: p.orderId });
          const rei = findReincidencia(room, p.problema, p.categoria, recentClosed);
          if (rei) p.reincidencia = rei;
        });
      }
      if (parsed.length === 0) {
        setParseError("No se encontró ninguna orden reconocible — revisa que sea el mismo formato que exporta HotSOS (Núm. de orden, Edad, Problema, Habitación/equipo, Asignado).");
      } else {
        setRows(parsed);
        const initSel = {};
        parsed.forEach(p => { initSel[p.orderId] = !p.alreadyImported && !p.possibleDup; });
        setSelected(initSel);
      }
    } catch {
      setParseError("No se pudo leer el archivo — revisa que sea el Excel exportado por HotSOS.");
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleAll = (val) => {
    const next = { ...selected };
    visibleRows.forEach(r => { next[r.orderId] = val && !r.alreadyImported; });
    setSelected(next);
  };
  const visibleRows = filterAsignado.trim()
    ? rows.filter(r => normalizeSearchText(r.asignadoHotsos).includes(normalizeSearchText(filterAsignado.trim())))
    : rows;

  const doImport = async () => {
    const toImport = rows.filter(r => selected[r.orderId] && !r.alreadyImported);
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      const count = await onImport(toImport);
      setImportMsg({ ok: true, text: `✓ Se crearon ${count} tarea${count === 1 ? "" : "s"} nueva${count === 1 ? "" : "s"}.` });
      setRows([]); setFileName("");
    } catch {
      setImportMsg({ ok: false, text: "No se pudieron crear las tareas — intenta de nuevo." });
    }
    setImporting(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Importar órdenes de HotSOS</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Exporta el reporte "Órdenes Pendientes" desde HotSOS (Excel) y súbelo aquí. Se convierten en tareas, cruzando el técnico que HotSOS ya asignó con las cuentas de esta app cuando el nombre coincide — las que no coincidan quedan sin asignar, para elegir a mano.
      </p>

      <details className="mb-4 text-xs rounded-md border p-2" style={{ borderColor: C.line, color: C.inkSoft }}>
        <summary className="cursor-pointer font-semibold" style={{ color: C.ink }}>
          Ver cuentas disponibles para el cruce ({Object.keys(accounts || {}).length}) — útil si algo no está quedando asignado como debería
        </summary>
        <div className="mt-2 space-y-0.5">
          {Object.keys(accounts || {}).length === 0 ? (
            <div style={{ color: C.red }}>⚠ No llegó ninguna cuenta a esta pantalla — por eso nada se puede cruzar. Avísame si ves esto.</div>
          ) : Object.entries(accounts).map(([uid, acc]) => (
            <div key={uid}>· {acc.display_name || <span style={{ color: C.red }}>(sin nombre — cuenta {uid.slice(0, 8)})</span>}</div>
          ))}
        </div>
      </details>

      {hotsosTaskCount > 0 && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.bg }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
            Ya hay {hotsosTaskCount} tarea{hotsosTaskCount === 1 ? "" : "s"} importada{hotsosTaskCount === 1 ? "" : "s"} de HotSOS
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="ghost" disabled={retrying} onClick={async () => {
              setRetrying(true);
              const fixed = await onRetryAssignments();
              setImportMsg({ ok: true, text: fixed > 0 ? `✓ Se asignaron ${fixed} tarea${fixed === 1 ? "" : "s"} más.` : "Ninguna tarea pendiente se pudo asignar de nuevo — puede que ya estén todas asignadas, o que sean de antes de este arreglo (esas hay que reimportarlas)." });
              setRetrying(false);
            }}>{retrying ? "Reintentando…" : "Reintentar asignación en las ya importadas"}</Button>

            {!confirmingDelete ? (
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} style={{ color: C.red }}>
                Borrar todas las importadas (para reimportar)
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-xs" style={{ color: C.red }}>
                ¿Seguro? Se van a la papelera las {hotsosTaskCount} tareas importadas de HotSOS (no toca ninguna otra tarea).
                <Button size="sm" disabled={deleting} onClick={async () => {
                  setDeleting(true);
                  const removed = await onBulkDelete();
                  setImportMsg({ ok: true, text: `✓ Se borraron ${removed} tareas. Ya puedes volver a subir el Excel para reimportarlas con el cruce corregido.` });
                  setConfirmingDelete(false); setDeleting(false);
                }}>{deleting ? "Borrando…" : "Sí, borrar"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed p-6 text-center mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <input type="file" accept=".xlsx,.xls" id="hotsos-file-input" className="hidden" onChange={handleFile} />
        <label htmlFor="hotsos-file-input" className="cursor-pointer block">
          <Upload size={26} style={{ margin: "0 auto 8px", color: C.gray }} />
          <div className="text-sm font-medium" style={{ color: C.ink }}>{fileName || "Toca para elegir el Excel exportado por HotSOS"}</div>
        </label>
      </div>
      {parseError && <div className="text-xs mb-4" style={{ color: C.red }}>{parseError}</div>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <input value={filterAsignado} onChange={e => setFilterAsignado(e.target.value)} placeholder="Filtrar por nombre del asignado en HotSOS…"
              className="text-xs border rounded-md px-2 py-1.5 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
            {currentUserDisplayName && (
              <button onClick={() => setFilterAsignado(v => v ? "" : currentUserDisplayName.split(" ")[0])}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: filterAsignado ? C.amberSoft : C.bg, color: filterAsignado ? "#7a5405" : C.inkSoft }}>
                {filterAsignado ? "Quitar filtro" : "Solo las mías"}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-xs" style={{ color: C.inkSoft }}>
              {visibleRows.length} de {rows.length} órdenes visibles · {rows.filter(r => r.alreadyImported).length} ya importadas antes · {rows.filter(r => r.possibleDup).length} posibles duplicados (sin marcar) · {selectedCount} seleccionadas
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleAll(true)} className="text-xs font-semibold" style={{ color: C.amber }}>Marcar visibles</button>
              <button onClick={() => toggleAll(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Ninguna</button>
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto mb-4" style={{ borderColor: C.line }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th className="p-2"></th>
                  <th className="text-left p-2">Orden</th>
                  <th className="text-left p-2">Problema</th>
                  <th className="text-left p-2">Ubicación</th>
                  <th className="text-left p-2">Especialidad</th>
                  <th className="text-left p-2">Equipo del catálogo</th>
                  <th className="text-left p-2">Asignado en HotSOS</th>
                  <th className="text-left p-2">Edad</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center" style={{ color: C.gray }}>Nadie coincide con ese filtro.</td></tr>
                ) : visibleRows.map((r, i) => (
                  <tr key={r.orderId} style={{ background: i % 2 ? C.cardAlt : C.panel, opacity: r.alreadyImported ? 0.5 : 1 }}>
                    <td className="p-2"><input type="checkbox" disabled={r.alreadyImported} checked={!!selected[r.orderId]} onChange={e => setSelected(s => ({ ...s, [r.orderId]: e.target.checked }))} /></td>
                    <td className="p-2" style={{ color: C.ink }}>{r.orderId}{r.alreadyImported && <div style={{ color: C.gray }}>ya importada</div>}{r.possibleDup && <div style={{ color: C.amber, fontWeight: 600 }}>⚠ Posible duplicado: {r.possibleDup}</div>}{r.reincidencia && <div style={{ color: C.red, fontWeight: 600 }}>↻ Reincidencia: «{r.reincidencia.titulo}» se cerró {r.reincidencia.dias === 0 ? "hoy" : `hace ${r.reincidencia.dias} día(s)`}</div>}</td>
                    <td className="p-2" style={{ color: C.ink }}>{r.problema}</td>
                    <td className="p-2" style={{ color: C.inkSoft }}>{r.lugar}</td>
                    <td className="p-2"><Badge tone="blue">{r.categoria}</Badge></td>
                    <td className="p-2">
                      {r.matchedEquipoId
                        ? <span style={{ color: C.green }}>{(equipos || []).find(e => e.id === r.matchedEquipoId)?.nombre} ✓</span>
                        : <span style={{ color: C.gray }}>Sin vincular</span>}
                    </td>
                    <td className="p-2">
                      {r.matchedUser ? <span style={{ color: C.green }}>{r.asignadoHotsos} ✓</span>
                        : r.asignadoHotsos ? <span style={{ color: C.amber }}>{r.asignadoHotsos} (sin cuenta en la app)</span>
                          : <span style={{ color: C.gray }}>Sin asignar</span>}
                    </td>
                    <td className="p-2" style={{ color: C.gray }}>{r.edadStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button disabled={selectedCount === 0 || importing} onClick={doImport}>
            {importing ? "Importando…" : `Importar ${selectedCount} tarea${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </>
      )}
      {importMsg && <div className="text-xs mt-2" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}
    </div>
  );
}