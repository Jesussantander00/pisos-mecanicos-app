// api/generate.js
//
// Una sola función de Vercel para las 4 funciones de IA que antes eran archivos separados
// (procedimientos, notas de reposición, horarios y resumen semanal). Así se liberan 3 espacios del
// plan gratuito de Vercel (máximo 12 funciones). Las direcciones viejas (/api/generate-procedure,
// etc.) siguen funcionando porque vercel.json las redirige aquí con ?kind=...
import procedure from "./_lib/gen-procedure.js";
import reorderNotes from "./_lib/gen-reorder-notes.js";
import schedule from "./_lib/gen-schedule.js";
import weeklySummary from "./_lib/gen-weekly-summary.js";

// El horario con IA es el más lento: se le da el mayor tiempo a toda la función.
export const config = { maxDuration: 60 };

const HANDLERS = {
  "procedure": procedure,
  "reorder-notes": reorderNotes,
  "schedule": schedule,
  "weekly-summary": weeklySummary,
};

export default async function handler(req, res) {
  const kind = String(req.query?.kind || "");
  const fn = HANDLERS[kind];
  if (!fn) {
    res.status(400).json({ ok: false, message: "Acción de IA no reconocida." });
    return;
  }
  return fn(req, res);
}
