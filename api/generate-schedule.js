// Función serverless de Vercel. Recibe el mes a programar, la lista de empleados, lo que YA
// está en el horario (vacaciones, incapacidades, turnos ya puestos a mano — esto NUNCA se toca),
// un ejemplo de cómo trabajó cada quien en los últimos días (para copiar el mismo patrón de
// turnos) y las reglas que escribió el usuario en español normal. Le pide a Claude que arme
// SOLO los días que están vacíos, respetando todo lo anterior, y devuelve un borrador para
// revisar — nunca guarda nada por su cuenta, eso lo hace la app cuando el usuario confirma.
//
// Configúrala en Vercel → tu proyecto → Settings → Environment Variables:
//   ANTHROPIC_API_KEY  = tu clave secreta de console.anthropic.com (empieza con "sk-ant-")

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Método no permitido." });
    return;
  }

  const { monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget } = req.body || {};

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ ok: false, message: "Faltan los días del mes." });
    return;
  }
  if (!Array.isArray(employees) || employees.length === 0) {
    res.status(400).json({ ok: false, message: "Faltan los empleados." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: "Falta configurar ANTHROPIC_API_KEY en Vercel." });
    return;
  }

  const prompt = `Eres un asistente que arma borradores de horario mensual para el equipo de ingeniería/mantenimiento de un hotel (Hyatt Regency Cartagena). Trabajas con datos en bruto, no le hables al usuario directamente en el JSON final, solo en el campo "notas".

MES A PROGRAMAR: ${monthLabel}
DÍAS DEL MES (cada uno con su fecha ISO y si es domingo/festivo — trabajar domingo/festivo cuenta contra el límite recomendado de 3 al mes por persona, salvo que las reglas del usuario den un número distinto para un cargo o una persona en concreto, en cuyo caso ese número manda):
${JSON.stringify(days, null, 0)}

EMPLEADOS (id, nombre, cargo, día de descanso fijo si tiene uno — 0=domingo, 1=lunes... 6=sábado, null si no tiene uno fijo):
${JSON.stringify(employees, null, 0)}

DÍAS QUE YA ESTÁN LLENOS EN EL HORARIO (vacaciones, incapacidades, turnos ya puestos a mano, etc.) — NO LOS TOQUES, NO LOS REPITAS EN TU RESPUESTA, son un dato fijo para que sepas quién ya no está disponible ese día:
${JSON.stringify(existingEntries || {}, null, 0)}

EJEMPLO DE CÓMO TRABAJÓ CADA EMPLEADO EN EL MES ANTERIOR COMPLETO (para que copies el mismo tipo de turno/horario y las mismas rotaciones de cada persona — hora de entrada y salida en formato decimal, ej. 8.5 = 8:30 a.m., 22.0 = 10:00 p.m., un turno puede cruzar la medianoche si la salida es menor que la entrada):
${JSON.stringify(referenceEntries || {}, null, 0)}

REGLAS QUE ESCRIBIÓ EL USUARIO PARA ESTE MES (tienen prioridad sobre todo lo demás — incluido el límite de 3 domingos/festivos — síguelas literalmente, y si mencionan a alguien por nombre parcial, búscalo en la lista de empleados):
"""
${rulesText || "(sin reglas adicionales — sigue el patrón habitual de cada empleado)"}
"""

QUÉ HACER:
- Llena SOLO los días de cada empleado que NO aparecen ya en "DÍAS QUE YA ESTÁN LLENOS". No incluyas en tu respuesta ningún día que ya esté ahí.
- Para cada día que llenes, decide si la persona trabaja (con hora de entrada y salida) o descansa (simplemente no la incluyas ese día — un día sin turno es un día libre, no hace falta ningún código para eso).
- Copia el mismo tipo de horario que cada persona ya tenía en el mes de ejemplo (mismo cargo, turno parecido, misma rotación si la tiene), salvo que las reglas del usuario digan otra cosa.
- Respeta el día de descanso fijo de cada empleado si lo tiene (no le pongas turno ese día, salvo que las reglas digan explícitamente lo contrario).
- Intenta que cada empleado llegue cerca de ${weeklyHoursTarget || 42} horas por semana en promedio, como ya viene trabajando.
- Si una regla habla de "horas acumuladas" o "compensatorios" para armar un día de descanso, no inventes la fecha exacta del descanso por tu cuenta — dilo en "notas" para que el usuario decida cuándo, salvo que las reglas te den una fecha concreta.
- Si las reglas del usuario piden un mínimo de personas por turno o por día, priorízalo por encima de las horas objetivo.
- Si hay un conflicto que no puedas resolver bien (ej. no hay suficiente personal para cubrir algo), dilo en el campo "notas" en vez de inventar una solución forzada.
- IMPORTANTE — formato de salida compacto (el mes puede tener cientos de turnos, así que cada uno debe ocupar lo menos posible): agrupa por empleado, y dentro de cada empleado usa la fecha como llave. El valor de cada día es un texto: "8.5-16.5" para un turno normal (entrada-salida), o "C:VAC" para un código especial (usa VAC, LIBRE, INC, ALT o LIC_PAT). No repitas el id del empleado en cada día, va una sola vez como llave del objeto exterior.

Responde ÚNICAMENTE con este JSON, sin texto antes ni después, sin \`\`\`, sin espacios ni saltos de línea extra:
{"e":{"id-del-empleado":{"2026-09-01":"8.5-16.5","2026-09-02":"C:VAC"}},"notas":"2-4 frases en español explicando decisiones importantes o advertencias, o vacío si no hay nada que avisar"}`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000, // Sonnet 4.6 permite hasta 64k en la API síncrona — 16k sobra para un mes
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo generar el borrador." });
      return;
    }

    const wasTruncated = data?.stop_reason === "max_tokens";
    const raw = data?.content?.[0]?.text || "";
    let parsed = null;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      // Por si el modelo agregó algo de texto extra pese a la instrucción: toma el bloque {...} más grande.
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        try { parsed = JSON.parse(raw.slice(first, last + 1)); } catch { parsed = null; }
      }
    }

    if (!parsed || typeof parsed.e !== "object" || parsed.e === null) {
      const truncMsg = wasTruncated
        ? "El borrador quedó a la mitad porque era muy largo. Intenta de nuevo — si sigue pasando, prueba con reglas más cortas."
        : "La IA no devolvió un borrador legible. Intenta de nuevo, o simplifica las reglas escritas.";
      res.status(200).json({ ok: false, message: truncMsg });
      return;
    }

    // Convierte el formato compacto {e:{empId:{fecha:"8.5-16.5"|"C:VAC"}}} a la lista plana que espera la app.
    const cleanEntries = [];
    Object.entries(parsed.e).forEach(([employeeId, byDate]) => {
      if (!byDate || typeof byDate !== "object") return;
      Object.entries(byDate).forEach(([date, val]) => {
        if (typeof val !== "string" || !date) return;
        if (val.startsWith("C:")) {
          const code = val.slice(2).trim();
          if (code) cleanEntries.push({ employeeId, date, code });
        } else {
          const [ea, sa] = val.split("-");
          const entrada = Number(ea), salida = Number(sa);
          if (Number.isFinite(entrada) && Number.isFinite(salida)) cleanEntries.push({ employeeId, date, entrada, salida });
        }
      });
    });

    res.status(200).json({ ok: true, entries: cleanEntries, notes: parsed.notas || "" });
  } catch (e) {
    console.error("Error generando borrador de horario:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de IA. Intenta de nuevo." });
  }
}
