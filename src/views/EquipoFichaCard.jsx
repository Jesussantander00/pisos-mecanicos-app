import { useState } from "react";
import { uploadPhoto } from "../lib/storage";
import { C, nowIso, readPlacaFromPhoto, showToast } from "../shared/core";
import { Button, PhotoSourceButtons } from "../shared/components";



/** Datos de placa (con lectura por cámara) y documentos del equipo: manuales, planos, diagramas. */
export function EquipoFichaCard({ equipo, isAdmin, onUpdateEquipoInfo }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState({});
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [docNombre, setDocNombre] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [quitar, setQuitar] = useState(null);
  const docs = equipo.documentos || [];
  const campos = [["marca", "Marca"], ["modelo", "Modelo"], ["serial", "Serie"], ["voltaje", "Voltaje"], ["capacidad", "Capacidad"]];
  const hay = campos.some(([k]) => equipo[k]);
  const abrir = () => { setD({ marca: equipo.marca || "", modelo: equipo.modelo || "", serial: equipo.serial || "", voltaje: equipo.voltaje || "", capacidad: equipo.capacidad || "" }); setMsg(null); setEdit(true); };
  const leer = async ([file]) => {
    if (!file) return;
    setReading(true); setMsg(null);
    try {
      const r = await readPlacaFromPhoto(file);
      if (r.ok && r.placa) { setD(x => ({ ...x, marca: r.placa.marca || x.marca, modelo: r.placa.modelo || x.modelo, serial: r.placa.serie || x.serial, voltaje: r.placa.voltaje || x.voltaje, capacidad: r.placa.capacidad || x.capacidad })); setMsg({ ok: true, text: "Leído. Revisa que todo esté bien antes de guardar." }); }
      else setMsg({ ok: false, text: r.message || "No se pudo leer la placa. Escribe los datos a mano." });
    } catch { setMsg({ ok: false, text: "No se pudo leer la placa (¿sin señal?). Escribe los datos a mano." }); }
    setReading(false);
  };
  const guardar = async () => {
    setSaving(true);
    try { await onUpdateEquipoInfo?.(equipo.id, { marca: d.marca.trim() || null, modelo: d.modelo.trim() || null, serial: d.serial.trim() || null, voltaje: d.voltaje.trim() || null, capacidad: d.capacidad.trim() || null }); setEdit(false); }
    finally { setSaving(false); }
  };
  const addDoc = async (nombre, url) => {
    const n = (nombre || "").trim() || "Documento";
    if (!url) return;
    await onUpdateEquipoInfo?.(equipo.id, { documentos: [...docs, { id: "d" + Date.now().toString(36), nombre: n, url, at: nowIso() }] });
  };
  return (
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Datos de placa</div>
        {isAdmin && !edit && <button onClick={abrir} className="text-xs font-semibold" style={{ color: C.amber }}>{hay ? "Editar" : "Agregar"}</button>}
      </div>
      {edit ? (
        <div>
          <div className="mb-2"><PhotoSourceButtons size="sm" busy={reading} disabled={reading} camLabel="📷 Leer placa" galLabel="Desde galería" onFiles={leer} /></div>
          {msg && <div className="text-xs mb-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {campos.map(([k, l]) => (
              <div key={k}><label className="text-[10px] block mb-0.5" style={{ color: C.gray }}>{l}</label>
                <input value={d[k] || ""} onChange={e => setD(x => ({ ...x, [k]: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.bg, color: C.ink }} /></div>
            ))}
          </div>
          <div className="flex items-center gap-2"><Button size="sm" disabled={saving || reading} onClick={guardar}>{saving ? "Guardando…" : "Guardar"}</Button><button onClick={() => setEdit(false)} className="text-xs font-semibold" style={{ color: C.gray }}>Cancelar</button></div>
        </div>
      ) : hay ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">{campos.filter(([k]) => equipo[k]).map(([k, l]) => <div key={k} className="text-xs" style={{ color: C.ink }}><span style={{ color: C.gray }}>{l}: </span><b>{equipo[k]}</b></div>)}</div>
      ) : <p className="text-xs" style={{ color: C.gray }}>Sin datos de placa. {isAdmin ? "Toca Agregar y fotografía la placa para llenarlos solos." : ""}</p>}

      <div className="text-xs font-semibold uppercase tracking-wide mt-3 mb-1.5" style={{ color: C.inkSoft }}>Documentos</div>
      {docs.length === 0 && !equipo.manualUrl && <p className="text-xs" style={{ color: C.gray }}>Sin documentos. Aquí van manuales, planos y diagramas eléctricos.</p>}
      {equipo.manualUrl && <div className="text-sm py-0.5"><a href={equipo.manualUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: C.blue }}>📖 Manual del fabricante ↗</a></div>}
      {docs.map(x => (
        <div key={x.id} className="flex items-center justify-between gap-2 text-sm py-0.5">
          <a href={x.url} target="_blank" rel="noreferrer" className="underline min-w-0 truncate" style={{ color: C.blue }}>📄 {x.nombre} ↗</a>
          {isAdmin && (quitar === x.id
            ? <span className="text-xs shrink-0"><button className="font-bold mr-2" style={{ color: C.red }} onClick={async () => { await onUpdateEquipoInfo?.(equipo.id, { documentos: docs.filter(y => y.id !== x.id) }); setQuitar(null); }}>Sí, quitar</button><button style={{ color: C.gray }} onClick={() => setQuitar(null)}>No</button></span>
            : <button className="text-xs shrink-0" style={{ color: C.gray }} onClick={() => setQuitar(x.id)}>Quitar</button>)}
        </div>
      ))}
      {isAdmin && (
        <div className="mt-2 rounded-md border p-2" style={{ borderColor: C.line, background: C.bg }}>
          <div className="text-[11px] mb-1" style={{ color: C.gray }}>Agregar un documento por enlace (Drive, Dropbox…) o fotografiando una hoja o plano</div>
          <input value={docNombre} onChange={e => setDocNombre(e.target.value)} placeholder="Nombre (ej. Diagrama eléctrico)" className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-1.5" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="flex items-center gap-2 flex-wrap">
            <input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="Enlace https://…" className="flex-1 min-w-[160px] text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <Button size="sm" disabled={!/^https?:\/\//i.test(docUrl.trim())} onClick={async () => { await addDoc(docNombre, docUrl.trim()); setDocNombre(""); setDocUrl(""); }}>Agregar enlace</Button>
          </div>
          <div className="mt-1.5"><PhotoSourceButtons size="sm" busy={uploading} disabled={uploading} camLabel="Foto de hoja" galLabel="Imagen guardada" onFiles={async ([file]) => { if (!file) return; setUploading(true); try { const url = await uploadPhoto(file, `equipo-doc-${equipo.id}`); await addDoc(docNombre, url); setDocNombre(""); } catch { showToast("✗ No se pudo subir la imagen.", false); } setUploading(false); }} /></div>
        </div>
      )}
    </div>
  );
}