// Función serverless de Vercel. Recibe el mes a programar, la lista de empleados, lo que YA
// está en el horario (vacaciones, incapacidades, turnos ya puestos a mano — esto NUNCA se toca),
// un ejemplo de cómo trabajó cada quien en los últimos días (para copiar el mismo patrón de
// turnos) y las reglas que escribió el usuario en español normal. Le pide a Gemini que arme
// SOLO los días que están vacíos, respetando todo lo anterior, y devuelve un borrador para
// revisar — nunca guarda nada por su cuenta, eso lo hace la app cuando el usuario confirma.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   GEMINI_API_KEY  = tu clave gratuita de aistudio.google.com/apikey (no hace falta tarjeta)
//
// Le pide a Vercel el máximo de tiempo posible para esta función (60 segundos — es el tope del
// plan gratuito; en un plan de pago se puede subir más). Aun así, quien llama a esta función
// (la app) manda como mucho ~15 días por pedido, no el mes completo, para que casi nunca haga
// falta tanto tiempo — ver la función doGenerateAiDraft en App.jsx.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget, sundaysAlreadyWorked } = req.body || {};

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ ok: false, message: "Faltan los días del mes." });
    return;
  }
  if (!Array.isArray(employees) || employees.length === 0) {
    res.status(400).json({ ok: false, message: "Faltan los empleados." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar GEMINI_API_KEY en Vercel." });
    return;
  }

  const prompt = `Eres un asistente que arma borradores de horario mensual para el equipo de ingeniería/mantenimiento de un hotel (Hyatt Regency Cartagena). Trabajas con datos en bruto, no le hables al usuario directamente en el JSON final, solo en el campo "notas".

MES A PROGRAMAR: ${monthLabel}
IMPORTANTE: este pedido cubre SOLO UNA PARTE del mes (los días de la lista de abajo), no el mes completo — el resto se arma en otro(s) pedido(s) aparte. No asumas que los días que no aparecen aquí no existen; simplemente no son tu responsabilidad en este pedido.

DÍAS A PROGRAMAR EN ESTE PEDIDO (cada uno con su fecha ISO y si es domingo/festivo):
${JSON.stringify(days, null, 0)}

REGLA DE DOMINGOS/FESTIVOS: por defecto cada persona puede trabajar hasta 3 domingos/festivos en el MES COMPLETO (no solo en esta parte) — salvo que las reglas del usuario den un número distinto para un cargo o una persona en concreto, en cuyo caso ese número manda. Costumbre normal del hotel (sigue esto como patrón por defecto salvo que las reglas digan otra cosa): a los turnistas normalmente se les programa domingo SÍ, domingo NO (alternados) — evita ponerle domingo a la misma persona dos domingos seguidos, porque ahí sí se genera un recargo/costo mayor para el hotel. Los SÁBADOS que NO sean festivo no tienen ningún tope de CANTIDAD para el equipo en general — cúbrelos con toda normalidad siguiendo el patrón del mes de referencia, igual que cualquier día entre semana; no los dejes vacíos por precaución. ADVERTENCIA IMPORTANTE: "sin tope de cantidad" es sobre cuántas personas del equipo trabajan sábado en general — NUNCA le pongas turno un sábado a alguien cuyo "día de descanso fijo" (ver EMPLEADOS más abajo) sea sábado (día 6), pase lo que pase; esa restricción individual manda siempre sobre esta regla general.

DOMINGOS/FESTIVOS QUE CADA PERSONA YA TIENE TRABAJADOS EN OTRAS PARTES DE ESTE MISMO MES (ya sea porque ya estaban en el horario, o porque ya se generaron en otro pedido de este mismo mes) — súmalos al decidir si a alguien todavía le queda "cupo" de domingos en los días que tú vas a programar:
${JSON.stringify(sundaysAlreadyWorked || {}, null, 0)}

EMPLEADOS (id, nombre, cargo, día de descanso fijo si tiene uno — 0=domingo, 1=lunes... 6=sábado, null si no tiene uno fijo. "compBalance" cuando existe: horas de reducción laboral que esa persona ya tiene acumuladas por trabajar turnos de 8h en vez de las 7h reducidas normales, y "fullDays" = cuántos días completos de descanso ya ganó con eso):
${JSON.stringify(employees, null, 0)}

DÍAS QUE YA ESTÁN LLENOS EN EL HORARIO (vacaciones, incapacidades, turnos ya puestos a mano, etc.) — NO LOS TOQUES, NO LOS REPITAS EN TU RESPUESTA, son un dato fijo para que sepas quién ya no está disponible ese día:
${JSON.stringify(existingEntries || {}, null, 0)}

EJEMPLO DE CÓMO TRABAJÓ CADA EMPLEADO EN EL MES ANTERIOR COMPLETO (para que copies el mismo tipo de turno/horario y las mismas rotaciones de cada persona, INCLUYENDO cómo cubría normalmente los sábados y domingos — hora de entrada y salida en formato decimal, ej. 8.5 = 8:30 a.m., 22.0 = 10:00 p.m., un turno puede cruzar la medianoche si la salida es menor que la entrada):
${JSON.stringify(referenceEntries || {}, null, 0)}

REGLAS QUE ESCRIBIÓ EL USUARIO PARA ESTE MES (tienen prioridad sobre todo lo demás — incluido el límite de domingos/festivos — síguelas literalmente, y si mencionan a alguien por nombre parcial, búscalo en la lista de empleados):
"""
${rulesText || "(sin reglas adicionales — sigue el patrón habitual de cada empleado)"}
"""

QUÉ HACER:
- Llena SOLO los días de la lista "DÍAS A PROGRAMAR EN ESTE PEDIDO" que además NO aparecen ya en "DÍAS QUE YA ESTÁN LLENOS". No incluyas en tu respuesta ningún día que ya esté ahí.
- Para cada día que llenes, decide si la persona trabaja (con hora de entrada y salida) o descansa (simplemente no la incluyas ese día — un día sin turno es un día libre, no hace falta ningún código para eso).
- Copia el mismo tipo de horario que cada persona ya tenía en el mes de ejemplo (mismo cargo, turno parecido, misma rotación si la tiene, incluyendo su patrón normal de sábados/domingos), salvo que las reglas del usuario digan otra cosa.
- Respeta el día de descanso fijo de cada empleado si lo tiene (no le pongas turno ese día, salvo que las reglas digan explícitamente lo contrario).
- Intenta que cada empleado llegue cerca de ${weeklyHoursTarget || 42} horas por semana en promedio, como ya viene trabajando.
- Si una regla habla de "horas acumuladas" o "compensatorios" para armar un día de descanso, no inventes la fecha exacta del descanso por tu cuenta — dilo en "notas" para que el usuario decida cuándo, salvo que las reglas te den una fecha concreta.
- Si un empleado tiene "compBalance.fullDays" de 1 o más (ver la lista de EMPLEADOS), NO le pongas tú un día de descanso extra por tu cuenta — solo menciónalo en "notas" (ej. "Fulano ya tiene 1 día de descanso acumulado por horas de reducción, pendiente de programar, idealmente en sábado o junto a un domingo libre"), para que el usuario lo agregue a mano con el código COMP en el día que decida.
- Si las reglas del usuario piden un mínimo de personas por turno o por día, priorízalo por encima de las horas objetivo.
- Si hay un conflicto que no puedas resolver bien (ej. no hay suficiente personal para cubrir algo), dilo en el campo "notas" en vez de inventar una solución forzada.
- IMPORTANTE — formato de salida compacto (esta parte del mes puede tener bastantes turnos, así que cada uno debe ocupar lo menos posible): agrupa por empleado, y dentro de cada empleado usa la fecha como llave. El valor de cada día es un texto: "8.5-16.5" para un turno normal (entrada-salida), o "C:VAC" para un código especial (usa VAC, LIBRE, INC, ALT, LIC_PAT o COMP — este último SOLO si las reglas del usuario piden explícitamente poner un día compensatorio en una fecha concreta, nunca por tu cuenta). No repitas el id del empleado en cada día, va una sola vez como llave del objeto exterior.

Responde ÚNICAMENTE con este JSON, sin texto antes ni después, sin \`\`\`, sin espacios ni saltos de línea extra:
{"e":{"id-del-empleado":{"2026-09-01":"8.5-16.5","2026-09-02":"C:VAC"}},"notas":"2-4 frases en español explicando decisiones importantes o advertencias, o vacío si no hay nada que avisar"}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 32000,
            responseMimeType: "application/json", // obliga a que la respuesta sea JSON válido, sin texto ni ``` alrededor
            // "low" gasta menos y responde más rápido — de sobra para esta tarea mecánica de llenar
            // casillas; Gemini 3 Flash no permite apagar el pensamiento del todo, pero sí bajarlo.
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo generar el borrador." });
      return;
    }

    const candidate = data?.candidates?.[0];
    const wasTruncated = candidate?.finishReason === "MAX_TOKENS";
    const raw = (candidate?.content?.parts || [])
      .filter(p => p && p.text && !p.thought)
      .map(p => p.text)
      .join("");

    // Primero se intenta el camino rápido: el JSON completo y bien formado.
    let parsed = null;
    try {
      parsed = JSON.parse(raw.trim());
    } catch { parsed = null; }

    let cleanEntries = [];
    let notes = "";

    if (parsed && typeof parsed.e === "object" && parsed.e !== null) {
      Object.entries(parsed.e).forEach(([employeeId, byDate]) => {
        if (!byDate || typeof byDate !== "object") return;
        Object.entries(byDate).forEach(([date, val]) => {
          const e = compactValueToEntry(employeeId, date, val);
          if (e) cleanEntries.push(e);
        });
      });
      notes = parsed.notas || "";
    } else {
      // El JSON no quedó completo (normalmente porque la respuesta se cortó a la mitad por ser muy
      // larga). En vez de descartar todo, se rescata cada bloque de empleado que SÍ quedó completo
      // — solo se pierde el último empleado que estaba a la mitad cuando se acabó el espacio.
      cleanEntries = rescuePartialEntries(raw);
      const m = raw.match(/"notas"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      notes = m ? m[1] : "";
    }

    if (cleanEntries.length === 0) {
      const truncMsg = wasTruncated
        ? "El borrador quedó a la mitad porque era muy largo y no se pudo rescatar nada legible. Intenta de nuevo, o genera el mes en dos partes (por ejemplo, pide primero solo del 1 al 15 en las reglas)."
        : "La IA no devolvió un borrador legible. Intenta de nuevo, o simplifica las reglas escritas.";
      res.status(200).json({ ok: false, message: truncMsg });
      return;
    }

    if (wasTruncated && !parsed) {
      notes = (notes ? notes + " " : "") + "Aviso: la respuesta se cortó por ser muy larga — este borrador puede no cubrir a todo el personal. Revisa que no falte nadie y, si hace falta, genera de nuevo.";
    }

    res.status(200).json({ ok: true, entries: cleanEntries, notes });
  } catch (e) {
    console.error("Error generando borrador de horario:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de IA. Intenta de nuevo." });
  }
}

/** Convierte un valor del formato compacto ("8.5-16.5" o "C:VAC") a un registro {employeeId,date,...}. */
function compactValueToEntry(employeeId, date, val) {
  if (typeof val !== "string" || !date) return null;
  if (val.startsWith("C:")) {
    const code = val.slice(2).trim();
    return code ? { employeeId, date, code } : null;
  }
  const [ea, sa] = val.split("-");
  const entrada = Number(ea), salida = Number(sa);
  return Number.isFinite(entrada) && Number.isFinite(salida) ? { employeeId, date, entrada, salida } : null;
}

/**
 * Recorre el texto crudo de la respuesta (que puede haber quedado a la mitad) y saca cada bloque
 * de empleado "id":{...} que haya quedado completo, ignorando el resto. Así, si la respuesta se
 * corta por ser muy larga, no se pierde TODO el trabajo — solo el último empleado a medio escribir.
 */
function rescuePartialEntries(raw) {
  const entries = [];
  const eKeyIdx = raw.indexOf('"e"');
  if (eKeyIdx === -1) return entries;
  const braceStart = raw.indexOf("{", eKeyIdx + 3);
  if (braceStart === -1) return entries;

  let i = braceStart + 1;
  while (i < raw.length) {
    while (i < raw.length && /[\s,]/.test(raw[i])) i++;
    if (i >= raw.length || raw[i] === "}") break;
    if (raw[i] !== '"') break;
    const keyEnd = raw.indexOf('"', i + 1);
    if (keyEnd === -1) break; // se cortó a mitad del id del empleado
    const employeeId = raw.slice(i + 1, keyEnd);
    i = keyEnd + 1;
    while (i < raw.length && /[\s:]/.test(raw[i])) i++;
    if (raw[i] !== "{") break;
    let depth = 1, j = i + 1;
    while (j < raw.length && depth > 0) {
      if (raw[j] === "{") depth++;
      else if (raw[j] === "}") depth--;
      j++;
    }
    if (depth !== 0) break; // este empleado quedó a la mitad — se descarta solo este, se detiene aquí
    const block = raw.slice(i, j);
    try {
      const byDate = JSON.parse(block);
      Object.entries(byDate).forEach(([date, val]) => {
        const e = compactValueToEntry(employeeId, date, val);
        if (e) entries.push(e);
      });
    } catch { /* bloque de este empleado no se pudo leer, se salta */ }
    i = j;
  }
  return entries;
}
