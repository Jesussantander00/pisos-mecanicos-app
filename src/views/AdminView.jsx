import React, { useState } from "react";
import { Gauge, Settings as SettingsIcon } from "lucide-react";
import { C, TECH_SKILL_AREAS, fmtDT, looksLikeGhostAccount, normalizeTaskState, useTechSkills } from "../shared/core";
import { BackupButton, Button, Pill } from "../shared/components";
import { UserEditModal } from "./UserEditModal";


/** Matriz de habilidades (solo administradores): toca una celda para subir el nivel 0 → 3. */
function TechSkillsCard({ accounts }) {
  const [skills, setLevel] = useTechSkills();
  const people = Object.keys(accounts || {}).filter(u => { const a = accounts[u]; return a && a.approved !== false && !a.is_viewer && !a.is_gerencia && !looksLikeGhostAccount(a.display_name); });
  const bg = ["#eef1f4", "#cfe0ee", "#7fb0d1", "#24496b"], fg = ["#8a96a3", "#24496b", "#10304a", "#ffffff"];
  if (!people.length) return null;
  return (
    <div className="rounded-xl border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Habilidades del equipo</div>
      <div className="text-xs mb-2" style={{ color: C.inkSoft }}>Toca para cambiar el nivel: 0 sin experiencia · 1 básico · 2 autónomo · 3 puede enseñar. Se usa para sugerir a quién asignar cada tarea.</div>
      {skills === null ? <div className="text-xs" style={{ color: C.gray }}>Cargando…</div> : (
        <div className="overflow-x-auto">
          <div className="grid gap-1 items-center text-[11px]" style={{ gridTemplateColumns: `minmax(90px,1.4fr) repeat(${TECH_SKILL_AREAS.length}, minmax(52px,1fr))`, minWidth: 360 }}>
            <span />{TECH_SKILL_AREAS.map(a => <span key={a} className="text-center font-bold" style={{ color: C.gray }}>{a}</span>)}
            {people.map(u => (
              <React.Fragment key={u}>
                <span className="truncate font-semibold text-xs" style={{ color: C.ink }}>{accounts[u]?.display_name || u}</span>
                {TECH_SKILL_AREAS.map(a => {
                  const lv = Number(skills?.[u]?.[a] || 0);
                  return <button key={a} type="button" aria-label={`${accounts[u]?.display_name || u}, ${a}: nivel ${lv}`} onClick={() => setLevel(u, a, (lv + 1) % 4)}
                    className="rounded-md text-xs font-bold" style={{ minHeight: 36, background: bg[lv], color: fg[lv] }}>{lv}</button>;
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminView({ accounts, tasks, reportEmail, reportWhatsapp, onSaveEmail, onSaveWhatsapp, onToggleAdmin, onToggleAlmacenista, onToggleGerencia, onToggleViewer, onToggleScheduleManager, onToggleSupervisor, onToggleInspector, onDeleteAccount, onResetPassword, onApproveAccount, onRejectAccount, onTransferTasks, loginLog, currentUsername, aiUsageStats }) {
  const [email, setEmail] = useState(reportEmail || "");
  const [saved, setSaved] = useState(false);
  const [wa, setWa] = useState(reportWhatsapp || "");
  const [waSaved, setWaSaved] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const list = Object.entries(accounts).sort((a, b) => (a[1].created_at || "").localeCompare(b[1].created_at || ""));
  const adminCount = list.filter(([, a]) => a.is_admin).length;
  const pending = list.filter(([, a]) => a.approved === false);
  const posiblesFantasma = list.filter(([, a]) => looksLikeGhostAccount(a.display_name));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Panel de administrador</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Configura el correo y WhatsApp para el envío de informes, y administra los usuarios del sistema.</p>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.amber, background: C.amberSoft }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.amber }}>Respaldo completo</div>
        <p className="text-xs mb-2" style={{ color: C.amber }}>
          Descarga TODA la información de la app (rondas, inventario, mantenimiento, horarios, todo) en un solo archivo,
          como copia de seguridad propia — aparte de lo que ya guarda Supabase.
        </p>
        <BackupButton />
      </div>

      <TechSkillsCard accounts={accounts} />

      {(() => {
        const limite = Date.now() - 30 * 86400000;
        const inactivas = list.filter(([uid, a]) => a.approved !== false).map(([uid, a]) => {
          const ult = (loginLog || []).find(l => l.userId === uid);
          return { uid, a, ult: ult ? new Date(ult.at).getTime() : 0 };
        }).filter(x => x.ult < limite);
        if (inactivas.length === 0) return null;
        return (
          <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Cuentas sin entrar en 30 días o más ({inactivas.length})</div>
            <p className="text-xs mb-2" style={{ color: C.gray }}>Si alguien ya no trabaja aquí, abre su tarjeta más abajo y elimina la cuenta (queda en la papelera por si te equivocas).</p>
            {inactivas.map(({ uid, a, ult }) => (
              <div key={uid} className="flex justify-between gap-2 text-xs py-1.5 border-t" style={{ borderColor: C.line, color: C.ink }}>
                <span className="truncate">{a.display_name || a.email}</span>
                <span className="shrink-0" style={{ color: C.gray }}>{ult ? `Último ingreso: ${fmtDT(new Date(ult).toISOString())}` : "Nunca ha entrado"}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {posiblesFantasma.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.red }}>⚠️ Posibles cuentas que no son una persona</div>
          <p className="text-xs mb-2" style={{ color: C.ink }}>
            Estos nombres no parecen ser el de una persona (parecen más bien una tarea o un turno) — por eso pueden
            aparecer como "técnico" en los reportes de Tareas. Revísalos y corrígeles el nombre (o elimínalos si no
            hacen falta) tocando "Editar" más abajo.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {posiblesFantasma.map(([uid, a]) => (
              <button key={uid} onClick={() => setEditingUser(uid)} className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#fff", color: C.red, border: `1px solid ${C.red}` }}>
                {a.display_name} ✎
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={15} color={C.amber} />
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Salud de la app — uso de IA</div>
        </div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          Un conteo aproximado de este dispositivo/sesión hacia adelante — no es el número exacto de Google, pero te
          da una idea de cuánto se está usando. Para el número real y el límite de tu cuenta de Gemini, entra a{" "}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline" style={{ color: C.amber }}>aistudio.google.com</a> → tu cuenta → Usage & billing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Fotos de medidores leídas", value: aiUsageStats?.meterReadings || 0 },
            { label: "Horarios generados", value: aiUsageStats?.scheduleGenerations || 0 },
            { label: "Resúmenes semanales", value: aiUsageStats?.weeklySummaries || 0 },
            { label: "Notas de reorden", value: aiUsageStats?.reorderNotes || 0 },
          ].map(s => (
            <div key={s.label} className="rounded-md p-2 text-center" style={{ background: C.bg }}>
              <div className="text-lg font-semibold" style={{ color: C.ink }}>{s.value}</div>
              <div className="text-[10px]" style={{ color: C.gray }}>{s.label}</div>
            </div>
          ))}
        </div>
        {(() => {
          const ym = new Date().toISOString().slice(0, 7);
          // [campo, nombre, tokens de entrada aprox., tokens de salida aprox.]
          const kinds = [["assistantQueries", "Preguntas al asistente", 9000, 500], ["meterReadings", "Fotos de medidores", 1500, 100], ["scheduleGenerations", "Horarios", 3000, 2000], ["weeklySummaries", "Resúmenes semanales", 3000, 600], ["reorderNotes", "Notas de reorden", 1500, 400], ["procedureRequests", "Procedimientos", 2000, 800]];
          const PRICE_IN = 0.10, PRICE_OUT = 0.40; // USD por millón de tokens — precio de referencia, confírmalo en Google
          let cost = 0, total = 0;
          const parts = kinds.map(([f, label, tin, tout]) => { const n = aiUsageStats?.[`mo:${ym}:${f}`] || 0; total += n; cost += n * (tin * PRICE_IN + tout * PRICE_OUT) / 1e6; return n ? `${label}: ${n}` : null; }).filter(Boolean);
          return (
            <div className="mt-3 rounded-md p-2.5 text-xs" style={{ background: C.bg, color: C.inkSoft }}>
              <div className="font-semibold mb-0.5" style={{ color: C.ink }}>Este mes ({ym}): {total} usos de IA · costo estimado ≈ US$ {cost < 0.01 ? "menos de 0.01" : cost.toFixed(2)}</div>
              <div>{parts.length ? parts.join(" · ") : "Todavía no hay usos registrados este mes."}</div>
              <div className="text-[10px] mt-1" style={{ color: C.gray }}>Estimado con tamaños típicos de cada consulta y precio de referencia de Gemini Flash-Lite; el valor real es el que muestra Google AI Studio.</div>
            </div>
          );
        })()}
        {aiUsageStats?.lastUpdated && <div className="text-[10px] mt-2" style={{ color: C.gray }}>Última actividad: {fmtDT(aiUsageStats.lastUpdated)}</div>}
      </div>

      {pending.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.red }}>
            {pending.length} cuenta{pending.length !== 1 ? "s" : ""} esperando aprobación
          </div>
          {pending.map(([uid, acc]) => (
            <div key={uid} className="flex items-center justify-between gap-2 py-1.5 flex-wrap">
              <div className="text-sm" style={{ color: C.ink }}>{acc.display_name || acc.email} <span style={{ color: C.gray }}>({acc.email})</span></div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => onApproveAccount(uid)}>Aprobar</Button>
                <Button size="sm" variant="red" onClick={() => onRejectAccount(uid)}>Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Correo para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => { setEmail(e.target.value); setSaved(false); }} placeholder="correo@hotel.com"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 220 }} />
          <Button onClick={() => { onSaveEmail(email.trim()); setSaved(true); }}>Guardar</Button>
        </div>
        {saved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Correo guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Este correo se usará por defecto al enviar informes desde la sección Reportes (cualquier usuario puede cambiarlo al momento de enviar).</div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Número de WhatsApp para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={wa} onChange={e => { setWa(e.target.value); setWaSaved(false); }} placeholder="573001234567 (con indicativo de país, sin + ni espacios)"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 220 }} />
          <Button onClick={() => { onSaveWhatsapp(wa.trim()); setWaSaved(true); }}>Guardar</Button>
        </div>
        {waSaved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Número guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Al enviar por WhatsApp se abre una conversación con el informe ya escrito; el usuario debe darle enviar manualmente (no hay envío automático real sin una integración de WhatsApp Business).</div>
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Usuarios ({list.length})</div>
        {list.map(([uid, acc]) => (
          <div key={uid} className="py-2 border-b last:border-0 flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div>
              <div className="text-sm font-medium" style={{ color: C.ink }}>
                {acc.display_name || acc.email} {uid === currentUsername && <span className="text-xs" style={{ color: C.gray }}>(tú)</span>}
              </div>
              <div className="text-xs" style={{ color: C.gray }}>{acc.email}</div>
              <div className="text-xs" style={{ color: C.gray }}>Creado: {fmtDT(acc.created_at)}</div>
              <div className="text-xs" style={{ color: C.gray }}>
                {(() => {
                  const entries = (loginLog || []).filter(l => l.userId === uid);
                  if (entries.length === 0) return "Nunca ha entrado";
                  return `Último ingreso: ${fmtDT(entries[0].at)} · ${entries.length} ingreso${entries.length !== 1 ? "s" : ""} en total`;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {acc.is_admin ? <Pill tone="amber">Administrador</Pill> : <Pill tone="gray">Operador</Pill>}
              {acc.is_almacenista && <Pill tone="blue">Almacenista</Pill>}
              {acc.is_gerencia && <Pill tone="green">Gerencia</Pill>}
              {acc.is_viewer && <Pill tone="gray">Solo ver</Pill>}
              {acc.is_supervisor && <Pill tone="amber">Supervisor</Pill>}
              {acc.is_inspector && <Pill tone="amber">Inspector</Pill>}
              {!acc.is_admin && acc.can_manage_schedule && <Pill tone="blue">Gestiona horarios</Pill>}
              <Button size="sm" variant="ghost" icon={SettingsIcon} onClick={() => setEditingUser(uid)}>Editar usuario</Button>
            </div>
          </div>
        ))}
      </div>

      {editingUser && accounts[editingUser] && (
        <UserEditModal
          uid={editingUser}
          acc={accounts[editingUser]}
          adminCount={adminCount}
          openTaskCount={(tasks || []).filter(t => t.asignadoA === editingUser && normalizeTaskState(t.estado) !== "finalizada").length}
          otherUsers={list.filter(([u2]) => u2 !== editingUser)}
          currentUsername={currentUsername}
          onClose={() => setEditingUser(null)}
          onToggleAdmin={onToggleAdmin}
          onToggleAlmacenista={onToggleAlmacenista}
          onToggleGerencia={onToggleGerencia}
          onToggleViewer={onToggleViewer}
          onToggleScheduleManager={onToggleScheduleManager}
          onToggleSupervisor={onToggleSupervisor} onToggleInspector={onToggleInspector}
          onDeleteAccount={onDeleteAccount}
          onResetPassword={onResetPassword}
          onTransferTasks={onTransferTasks}
        />
      )}
    </div>
  );
}