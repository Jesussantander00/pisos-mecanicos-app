import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { PlusCircle, Search } from "lucide-react";
import { C, EQUIPOS_XLSX_COLS, currentEquipoStatus, generateAllEquiposQrPdf } from "../shared/core";
import { Button, Pill } from "../shared/components";


function EquiposExcelImport({ equipos, onImportEquipos }) {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const norm = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const bajar = () => {
    const ws = XLSX.utils.aoa_to_sheet([EQUIPOS_XLSX_COLS]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Equipos");
    XLSX.writeFile(wb, "plantilla-equipos.xlsx");
  };
  const leer = async (file) => {
    if (!file) return;
    setMsg(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const existentes = new Set((equipos || []).filter(e => e.active !== false).map(e => norm(e.sistema) + "|" + norm(e.nombre)));
      const vistos = new Set();
      const out = raw.map((r, i) => {
        const g = {}; Object.keys(r).forEach(k => { g[norm(k)] = String(r[k] ?? "").trim(); });
        const row = { n: i + 2, sistema: g["sistema"] || "", nombre: g["nombre"] || g["equipo"] || "", ubicacion: g["ubicacion"] || "", marca: g["marca"] || "", modelo: g["modelo"] || "", serial: g["serie"] || g["serial"] || "", voltaje: g["voltaje"] || "", capacidad: g["capacidad"] || "" };
        const key = norm(row.sistema) + "|" + norm(row.nombre);
        row.estado = !row.sistema || !row.nombre ? "error" : (existentes.has(key) || vistos.has(key)) ? "existe" : "nuevo";
        if (row.estado === "nuevo") vistos.add(key);
        return row;
      }).filter(r => r.sistema || r.nombre || r.marca || r.modelo);
      if (!out.length) { setMsg({ ok: false, text: "El archivo no tiene filas. Usa la plantilla: columnas Sistema y Nombre son obligatorias." }); setRows(null); return; }
      setRows(out);
    } catch { setMsg({ ok: false, text: "No se pudo leer el archivo. Usa un Excel (.xlsx) con la plantilla." }); setRows(null); }
  };
  const nuevos = (rows || []).filter(r => r.estado === "nuevo");
  const color = { nuevo: [C.greenSoft, C.green], existe: [C.amberSoft, C.amber], error: [C.redSoft, C.red] };
  return (
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cargar equipos desde Excel</div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="ghost" onClick={bajar}>Descargar plantilla</Button>
        <label className="text-xs font-semibold rounded-md border px-3 flex items-center cursor-pointer" style={{ minHeight: 36, borderColor: C.line, background: C.bg, color: C.ink }}>
          Elegir archivo Excel
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { leer(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      {rows && (
        <div className="mt-2">
          <div className="text-xs mb-1" style={{ color: C.inkSoft }}>{nuevos.length} nuevos · {rows.filter(r => r.estado === "existe").length} ya existen · {rows.filter(r => r.estado === "error").length} con error</div>
          <div className="overflow-auto rounded-md border" style={{ borderColor: C.line, maxHeight: 260 }}>
            <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.bg }}><th className="text-left px-2 py-1">Fila</th><th className="text-left px-2 py-1">Sistema</th><th className="text-left px-2 py-1">Nombre</th><th className="text-left px-2 py-1">Estado</th></tr></thead>
              <tbody>{rows.slice(0, 300).map(r => (
                <tr key={r.n} style={{ borderTop: `1px solid ${C.line}` }}><td className="px-2 py-1">{r.n}</td><td className="px-2 py-1">{r.sistema || "—"}</td><td className="px-2 py-1">{r.nombre || "—"}</td>
                  <td className="px-2 py-1"><span className="font-semibold rounded-full px-2" style={{ background: color[r.estado][0], color: color[r.estado][1] }}>{r.estado === "nuevo" ? "Nuevo" : r.estado === "existe" ? "Ya existe" : "Falta sistema o nombre"}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" disabled={busy || nuevos.length === 0} onClick={async () => {
              setBusy(true);
              try { const n = await onImportEquipos(nuevos); setMsg({ ok: true, text: `Listo: ${n} equipo(s) nuevo(s) cargados.` }); setRows(null); }
              catch { setMsg({ ok: false, text: "No se pudo guardar. Revisa tu conexión e intenta de nuevo." }); }
              setBusy(false);
            }}>{busy ? "Cargando…" : `Cargar ${nuevos.length} equipo(s) nuevo(s)`}</Button>
            <button onClick={() => setRows(null)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button>
          </div>
          <div className="text-[11px] mt-1" style={{ color: C.gray }}>Los que "ya existen" o tienen error no se tocan.</div>
        </div>
      )}
    </div>
  );
}

export function SistemasListView({ equipos, mttoLog, canManage, onSelectSistema, onSelectEquipo, onCreateEquipo, onImportCatalog, onImportEquipos }) {
  const [sistema, setSistema] = useState("");
  const [nombre, setNombre] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [qrSistema, setQrSistema] = useState("");

  const doCreate = async () => {
    if (!sistema.trim() || !nombre.trim()) return;
    setCreating(true);
    await onCreateEquipo(sistema.trim(), nombre.trim());
    setNombre("");
    setCreating(false);
  };

  const doImport = async () => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await onImportCatalog();
      setImportMsg({ ok: true, text: `Listo: ${res.newEquiposCount} equipo(s) nuevo(s), ${res.newCronoCount} registro(s) del cronograma anual, y ${res.newLogsCount} mantenimiento(s) ya ejecutados cargados al historial.` });
    } catch { setImportMsg({ ok: false, text: "No se pudo importar — revisa que el archivo sea el formato correcto e intenta de nuevo." }); }
    setImporting(false);
  };

  const doDownloadAllQr = async () => {
    setGeneratingQr(true);
    try {
      const doc = await generateAllEquiposQrPdf(equipos.filter(e => e.active !== false && (!qrSistema || e.sistema === qrSistema)));
      doc.save(qrSistema ? `codigos-qr-${qrSistema.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf` : "codigos-qr-equipos-mantenimiento.pdf");
    } catch { setImportMsg({ ok: false, text: "No se pudieron generar los códigos QR." }); }
    setGeneratingQr(false);
  };

  const sistemas = useMemo(() => {
    const map = {};
    equipos.filter(e => e.active !== false).forEach(e => {
      if (!map[e.sistema]) map[e.sistema] = [];
      map[e.sistema].push(e);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipos]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mantenimiento — Sistemas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige un sistema para ver sus equipos y registrar mantenimientos.</p>

      {canManage && equipos.length === 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: C.amber }}>
          <span>¿Primera vez usando esto? Importa de una vez el cronograma completo (925 equipos, el año completo programado, y los ~914 mantenimientos ya ejecutados con su fecha y técnico).</span>
          <Button size="sm" disabled={importing} onClick={doImport}>{importing ? "Importando…" : "Importar cronograma completo"}</Button>
        </div>
      )}
      {canManage && equipos.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.blueSoft, color: C.blue }}>
          <span>Descarga en un solo PDF los códigos QR, listos para imprimir y pegar. Puedes elegir un sistema para imprimir por tandas.</span>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={qrSistema} onChange={e => setQrSistema(e.target.value)} className="text-xs border rounded-md px-2 outline-none" style={{ minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Todos los sistemas</option>
              {[...new Set(equipos.filter(e => e.active !== false).map(e => e.sistema).filter(Boolean))].sort().map(sx => <option key={sx} value={sx}>{sx}</option>)}
            </select>
            <Button size="sm" variant="ghost" disabled={generatingQr} onClick={doDownloadAllQr}>{generatingQr ? "Generando…" : qrSistema ? "Descargar QR del sistema" : "Descargar todos los QR"}</Button>
          </div>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {canManage && onImportEquipos && <EquiposExcelImport equipos={equipos} onImportEquipos={onImportEquipos} />}
      {canManage && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar equipo nuevo</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={sistema} onChange={e => setSistema(e.target.value)} placeholder="Sistema (ej. HVAC)"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 160 }} />
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del equipo"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
            <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Agregar</Button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un equipo en cualquier sistema…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {search.trim() ? (
        (() => {
          const q = search.trim().toLowerCase();
          const matches = equipos.filter(e => e.active !== false && e.nombre.toLowerCase().includes(q));
          if (matches.length === 0) return <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
          return (
            <div className="grid grid-cols-2 gap-3">
              {matches.map(eq => {
                const status = currentEquipoStatus(eq.id, mttoLog);
                return (
                  <button key={eq.id} onClick={() => onSelectEquipo(eq.id)}
                    className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: status.outOfService ? C.red : C.line, background: status.outOfService ? C.redSoft : C.panel }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold" style={{ color: C.ink }}>{eq.nombre}</div>
                      {status.outOfService && <Pill tone="red">Fuera de servicio</Pill>}
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.gray }}>{eq.sistema}</div>
                  </button>
                );
              })}
            </div>
          );
        })()
      ) : sistemas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no hay equipos registrados. {canManage ? "Importa el catálogo o agrega uno arriba." : "Pídele a un administrador que los cargue."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sistemas.map(([sistemaName, eqs]) => {
            const outCount = eqs.filter(e => currentEquipoStatus(e.id, mttoLog).outOfService).length;
            return (
              <button key={sistemaName} onClick={() => onSelectSistema(sistemaName)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{sistemaName}</div>
                  {outCount > 0 && <Pill tone="red">{outCount} fuera de servicio</Pill>}
                </div>
                <div className="text-xs mt-1" style={{ color: C.gray }}>{eqs.length} equipo{eqs.length !== 1 ? "s" : ""}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}