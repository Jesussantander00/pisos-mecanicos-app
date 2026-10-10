import { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { exportFullBackup, sGet, sSet } from "../lib/storage";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { C, DRIVE_KEEP_DAYS, archivedPlaceholder, buildActivityReport, driveFolder, driveHasFile, driveUpload, monthKeyOf, requestAdminAction, scanArchivableMedia, showToast, todayStr } from "../shared/core";
import { Button } from "../shared/components";



export function DriveArchivePanel({ tasks, accounts }) {
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [err, setErr] = useState(null);
  const [needReload, setNeedReload] = useState(false);
  const [folders, setFolders] = useState(() => { try { return JSON.parse(localStorage.getItem("pm-local:drive-folders") || "{}"); } catch { return {}; } });
  const rememberFolder = (key, id) => setFolders(f => { const n = { ...f, [key]: id }; try { localStorage.setItem("pm-local:drive-folders", JSON.stringify(n)); } catch { /* noop */ } return n; });
  const driveLink = (id) => `https://drive.google.com/drive/folders/${id}`;
  const [repFrom, setRepFrom] = useState(() => monthKeyOf(Date.now() - 62 * 86400000));
  const [repTo, setRepTo] = useState(() => monthKeyOf(Date.now()));
  const tokenRef = useRef({ token: null, at: 0 });
  const say = (m) => setLog(l => [...l.slice(-40), m]);

  const getToken = async () => {
    if (tokenRef.current.token && Date.now() - tokenRef.current.at < 45 * 60000) return tokenRef.current.token;
    const { data: { session } } = await supabase.auth.getSession();
    const r = await requestAdminAction(session?.access_token, "drive-token", "drive");
    if (!r.ok) throw new Error(r.message || "No se pudo conectar con Drive.");
    tokenRef.current = { token: r.driveToken, at: Date.now() };
    return r.driveToken;
  };
  const doScan = async () => {
    setBusy(true); setErr(null); setLog([]);
    try { setScan(scanArchivableMedia(await exportFullBackup())); }
    catch (e) { setErr(e.message || "No se pudo revisar."); }
    setBusy(false);
  };
  const testConn = async () => {
    setBusy(true); setErr(null);
    try { tokenRef.current = { token: null, at: 0 }; await getToken(); showToast("✓ Conexión con Drive lista.", true); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const archiveMonth = async (month) => {
    setBusy(true); setErr(null);
    const ym = month.ym;
    try {
      say(`Mes ${ym}: conectando con Drive…`);
      let token = await getToken();
      const root = await driveFolder(token, "QuinTech", null);
      const mf = await driveFolder(token, ym, root);
      rememberFolder("root", root); rememberFolder(ym, mf);
      const ff = await driveFolder(token, "Fotos", mf);
      const vf = await driveFolder(token, "Videos", mf);
      const done = [];
      let n = 0;
      for (const it of month.items) {
        n++;
        try {
          token = await getToken();
          const folder = it.bucket === "maintenance-videos" ? vf : ff;
          const name = it.path.replace(/\//g, "_");
          if (!(await driveHasFile(token, name, folder))) {
            const resp = await fetch(it.url);
            if (!resp.ok) throw new Error("no se pudo leer el archivo original");
            const blob = await resp.blob();
            await driveUpload(token, blob, name, folder, blob.type || (it.bucket === "maintenance-videos" ? "video/mp4" : "image/jpeg"));
          }
          done.push(it);
        } catch (e) { say(`  ⚠ ${it.path}: ${e.message}`); }
        if (n % 5 === 0 || n === month.items.length) say(`  ${n} de ${month.items.length} archivos revisados…`);
      }
      if (done.length === 0) throw new Error("No se pudo copiar ningún archivo a Drive.");
      // Informe del mes (con fecha de generación en el nombre, así no pisa uno anterior).
      say("  Generando informe del mes…");
      const wb = await buildActivityReport(ym, ym, tasks, accounts);
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      token = await getToken();
      await driveUpload(token, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Informe ${ym} (generado ${todayStr().replace(/\//g, "-")}).xlsx`, mf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      // Reemplazar los enlaces en la base (leyendo cada fila de nuevo justo antes de escribir).
      say("  Actualizando la app…");
      const placeholder = archivedPlaceholder(ym);
      const keys = new Set(); done.forEach(it => it.keys.forEach(k => keys.add(k)));
      for (const key of keys) {
        const fresh = await sGet(key, true);
        let txt = JSON.stringify(fresh ?? null);
        for (const it of done) txt = txt.split(it.url).join(placeholder);
        await sSet(key, JSON.parse(txt), true);
      }
      // Borrar los originales de Supabase (ya están a salvo en Drive).
      say("  Liberando espacio…");
      const { data: { session } } = await supabase.auth.getSession();
      let removed = 0;
      for (let i = 0; i < done.length; i += 100) {
        const r = await requestAdminAction(session?.access_token, "drive-delete", "drive", { files: done.slice(i, i + 100).map(it => ({ bucket: it.bucket, path: it.path })) });
        if (!r.ok) throw new Error(r.message || "No se pudieron borrar los originales.");
        removed += r.removed || 0;
      }
      say(`✓ ${ym}: ${done.length} archivos en Drive, informe guardado y ${removed} originales borrados de la app.`);
      setNeedReload(true);
    } catch (e) { setErr(e.message || "Algo falló."); say(`✗ ${ym}: ${e.message || "falló"}`); }
    setBusy(false);
  };

  /** Respaldo del texto (tareas, seguimientos, mantenimientos) en Drive, en QuinTech/Respaldos. Las fotos no entran aquí. */
  const backupText = async () => {
    setBusy(true); setErr(null);
    try {
      say("Respaldo de texto: conectando con Drive…");
      let token = await getToken();
      const root = await driveFolder(token, "QuinTech", null);
      const rf = await driveFolder(token, "Respaldos", root);
      rememberFolder("root", root); rememberFolder("respaldos", rf);
      say("  Generando el Excel con todo lo escrito…");
      const wb = await buildActivityReport("2020-01", monthKeyOf(Date.now()), tasks, accounts);
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      token = await getToken();
      const name = `Respaldo texto ${new Date().toISOString().slice(0, 10)}.xlsx`;
      await driveUpload(token, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name, rf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      say(`✓ Guardado en Drive: QuinTech/Respaldos/${name}`);
      showToast("✓ Respaldo guardado en Drive.", true);
      sSet("last-backup", { at: new Date().toISOString() }, true).catch(() => {});
    } catch (e) { setErr(e.message || "No se pudo guardar el respaldo."); say(`✗ ${e.message || "falló"}`); }
    setBusy(false);
  };

  const downloadReport = async () => {
    setBusy(true); setErr(null);
    try {
      const a = repFrom <= repTo ? repFrom : repTo, b = repFrom <= repTo ? repTo : repFrom;
      const wb = await buildActivityReport(a, b, tasks, accounts);
      XLSX.writeFile(wb, `informe-actividades-${a}_a_${b}.xlsx`);
    } catch (e) { setErr(e.message || "No se pudo generar el informe."); }
    setBusy(false);
  };
  const monthOpts = (() => { const out = []; const d = new Date(); for (let i = 0; i < 24; i++) { out.push(monthKeyOf(d.getTime())); d.setMonth(d.getMonth() - 1); } return out; })();
  const sel = "text-xs border rounded-md px-2 outline-none";
  const selStyle = { minHeight: 36, borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>Archivo en Google Drive</div>
      <p className="text-xs mb-3" style={{ color: C.inkSoft }}>
        Las fotos y videos con más de {DRIVE_KEEP_DAYS} días se guardan en tu Drive, en una carpeta por mes, junto con el informe de ese mes. Lo escrito (tareas, seguimientos, registros) se queda en la app; en lugar de la foto vieja aparece "Archivada en Drive". Hazlo de preferencia cuando nadie más esté usando la app.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant="ghost" disabled={busy} onClick={testConn}>Probar conexión</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={doScan}>{busy ? "Trabajando…" : "Buscar qué se puede archivar"}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={backupText}>Respaldar el texto a Drive</Button>
        {folders.root && <a href={driveLink(folders.root)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold px-2" style={{ color: C.amber, minHeight: 36 }}>Abrir carpeta en Drive ↗</a>}
      </div>
      {err && <div className="text-xs mb-2" style={{ color: C.red }}>{err}</div>}
      {scan && (
        <div className="mb-3">
          <div className="text-xs mb-2" style={{ color: C.inkSoft }}>{scan.total} archivos en total · {scan.recent} recientes (se quedan en la app).</div>
          {scan.months.length === 0 ? <div className="text-xs" style={{ color: C.green }}>No hay nada con más de {DRIVE_KEEP_DAYS} días. 👍</div> : scan.months.map(mo => (
            <div key={mo.ym} className="flex items-center justify-between gap-2 text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
              <span>{mo.ym} · 📷 {mo.fotos} · 🎬 {mo.videos} · ≈ {Math.max(1, Math.round(mo.fotos * 0.15 + mo.videos * 20))} MB</span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => archiveMonth(mo)}>Archivar este mes</Button>
            </div>
          ))}
        </div>
      )}
      {log.length > 0 && <div className="rounded-lg p-2 mb-3 text-[11px] whitespace-pre-wrap" style={{ background: C.bg, color: C.inkSoft, maxHeight: 160, overflowY: "auto" }}>{log.join("\n")}</div>}
      {needReload && <div className="rounded-lg p-2 mb-3 text-xs flex items-center justify-between gap-2" style={{ background: C.amberSoft, color: C.ink }}><span>Recarga la app para ver los cambios.</span><Button size="sm" onClick={() => window.location.reload()}>Recargar</Button></div>}
      <div className="border-t pt-3" style={{ borderColor: C.line }}>
        <div className="text-xs font-semibold mb-2" style={{ color: C.ink }}>Informe de actividades de un mes a otro</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={repFrom} onChange={e => setRepFrom(e.target.value)} className={sel} style={selStyle}>{monthOpts.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <span className="text-xs" style={{ color: C.inkSoft }}>a</span>
          <select value={repTo} onChange={e => setRepTo(e.target.value)} className={sel} style={selStyle}>{monthOpts.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <Button size="sm" variant="ghost" icon={Download} disabled={busy} onClick={downloadReport}>Descargar Excel</Button>
        </div>
      </div>
    </div>
  );
}