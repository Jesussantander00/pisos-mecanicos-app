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
DÍAS DEL MES (cada uno con su fecha ISO y si es domingo/festivo — trabajar domingo/festivo cuenta contra el límite recomendado de 3 al mes por persona):
${JSON.stringify(days, null, 0)}

EMPLEADOS (id, nombre, cargo, día de descanso fijo si tiene uno — 0=domingo, 1=lunes... 6=sábado, null si no tiene uno fijo):
${JSON.stringify(employees, null, 0)}

DÍAS QUE YA ESTÁN LLENOS EN EL HORARIO (vacaciones, incapacidades, turnos ya puestos a mano, etc.) — NO LOS TOQUES, NO LOS REPITAS EN TU RESPUESTA, son un dato fijo para que sepas quién ya no está disponible ese día:
${JSON.stringify(existingEntries || {}, null, 0)}

EJEMPLO DE CÓMO TRABAJÓ CADA EMPLEADO EN LOS DÍAS RECIENTES (para que copies el mismo tipo de turno/horario de cada persona — hora de entrada y salida en formato decimal, ej. 8.5 = 8:30 a.m., 22.0 = 10:00 p.m., un turno puede cruzar la medianoche si la salida es menor que la entrada):
${JSON.stringify(referenceEntries || {}, null, 0)}

REGLAS QUE ESCRIBIÓ EL USUARIO PARA ESTE MES (tienen prioridad sobre todo lo demás, síguelas literalmente):
"""
${rulesText || "(sin reglas adicionales — sigue el patrón habitual de cada empleado)"}
"""

QUÉ HACER:
- Llena SOLO los días de cada empleado que NO aparecen ya en "DÍAS QUE YA ESTÁN LLENOS". No incluyas en tu respuesta ningún día que ya esté ahí.
- Para cada día que llenes, decide si la persona trabaja (con hora de entrada y salida) o descansa (simplemente no la incluyas ese día — un día sin turno es un día libre, no hace falta ningún código para eso).
- Copia el mismo tipo de horario que cada persona ya tenía en los días de ejemplo (mismo cargo, turno parecido), salvo que las reglas del usuario digan otra cosa.
- Respeta el día de descanso fijo de cada empleado si lo tiene (no le pongas turno ese día, salvo que las reglas digan explícitamente lo contrario).
- Intenta que cada empleado llegue cerca de ${weeklyHoursTarget || 42} horas por semana en promedio, como ya viene trabajando.
- Evita que una misma persona trabaje más de 3 domingos/festivos en el mes, y evita ponerle dos domingos/festivos seguidos.
- Si las reglas del usuario piden un mínimo de personas por turno o por día, priorízalo por encima de las horas objetivo.
- Si hay un conflicto que no puedas resolver bien (ej. no hay suficiente personal para cubrir algo), dilo en el campo "notas" en vez de inventar una solución forzada.

Responde ÚNICAMENTE con este JSON, sin texto antes ni después, sin \`\`\`:
{"entries":[{"employeeId":"id-del-empleado","date":"AAAA-MM-DD","entrada":8.5,"salida":16.5}, ...],"notas":"2-4 frases en español explicando decisiones importantes o advertencias, o vacío si no hay nada que avisar"}`;

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
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(500).json({ ok: false, message: data?.error?.message || "No se pudo generar el borrador." });
      return;
    }

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

    if (!parsed || !Array.isArray(parsed.entries)) {
      res.status(200).json({ ok: false, message: "La IA no devolvió un borrador legible. Intenta de nuevo, o simplifica las reglas escritas." });
      return;
    }

    const cleanEntries = parsed.entries.filter(e => e && e.employeeId && e.date && (e.code || (e.entrada != null && e.salida != null)));

    res.status(200).json({ ok: true, entries: cleanEntries, notes: parsed.notas || "" });
  } catch (e) {
    console.error("Error generando borrador de horario:", e);
    res.status(500).json({ ok: false, message: "No se pudo conectar con el servicio de IA. Intenta de nuevo." });
  }
}
