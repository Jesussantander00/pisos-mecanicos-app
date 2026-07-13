# Pisos Mecánicos — Ronda de Equipos

App real (ya no un artifact de Claude) para que se pueda abrir desde cualquier teléfono con un
link normal, y que el correo con el PDF adjunto salga solo, sin que nadie tenga que darle
"Enviar" a mano.

## Qué cambia respecto a la versión anterior

- **Antes**: corría solo dentro de Claude (usaba `window.storage`, que no existe fuera de
  claude.ai). Por eso el link no cargaba en el teléfono.
- **Ahora**: es un proyecto React normal + una base de datos real (Supabase) + un backend
  pequeño (una función en Vercel) que sí puede mandar correos de verdad, con el PDF adjunto,
  usando una clave secreta que nunca toca el navegador.
- **WhatsApp**: sigue sin poder adjuntar el PDF por enlace. Eso no lo decide esta app — lo
  decide WhatsApp/Meta, y solo se puede saltar con su API de negocios oficial (aprobación de
  Meta, número de teléfono verificado, plantillas de mensaje aprobadas: un trámite aparte,
  no una función que se pueda simplemente "agregar"). Por ahora WhatsApp manda el resumen en
  texto y el PDF se adjunta a mano.

## 1. Crear la base de datos (Supabase) — gratis

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta y un proyecto nuevo (elige
   una región cercana, ej. `sa-east-1`).
2. Cuando el proyecto esté listo, ve a **SQL Editor → New query**, pega todo el contenido del
   archivo [`supabase/schema.sql`](./supabase/schema.sql) de este proyecto, y dale **Run**.
   Esto crea la tabla donde vive toda la información de la app (cuentas, rondas, equipos
   dañados, tanques, entregas de turno, etc.).
3. Ve a **Settings → API** y copia dos valores:
   - **Project URL** → lo vas a usar como `VITE_SUPABASE_URL`
   - **anon public key** → lo vas a usar como `VITE_SUPABASE_ANON_KEY`

## 2. Crear la cuenta de correo (Resend) — gratis para empezar

1. Entra a [resend.com](https://resend.com) y crea una cuenta.
2. Ve a **API Keys → Create API Key** y copia la clave (empieza con `re_...`). La vas a usar
   como `RESEND_API_KEY`. **Nunca la pongas en el frontend ni la subas a un repositorio
   público** — solo va en las variables de entorno del servidor (Vercel).
3. Mientras no verifiques un dominio propio, Resend solo te deja enviar correos a la
   dirección con la que creaste la cuenta (modo de pruebas). Para mandar a cualquier
   destinatario (por ejemplo el correo del hotel), ve a **Domains → Add Domain**, agrega el
   dominio del hotel y sigue las instrucciones para poner los registros DNS. Una vez
   verificado, usa un remitente de ese dominio, ej. `pisos-mecanicos@tudominio.com`, como
   `REPORT_FROM_EMAIL`.

## 3. Subir el proyecto y desplegarlo (Vercel) — gratis

1. Sube esta carpeta a un repositorio de GitHub (puedes arrastrarla directamente en
   github.com → "Add file → Upload files" si no usas git desde la terminal).
2. Entra a [vercel.com](https://vercel.com), conecta tu cuenta de GitHub, y elige
   **Add New → Project**, seleccionando ese repositorio. Vercel detecta que es un proyecto
   Vite automáticamente.
3. Antes de darle a "Deploy", abre **Environment Variables** y agrega:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | el Project URL que copiaste de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | el anon key que copiaste de Supabase |
   | `RESEND_API_KEY` | la clave de Resend |
   | `REPORT_FROM_EMAIL` | tu remitente verificado (o déjalo vacío mientras pruebas, usa `onboarding@resend.dev`) |

4. Dale **Deploy**. En 1-2 minutos te da un link tipo `https://tu-proyecto.vercel.app` — ese
   es el que sí funciona en cualquier teléfono, sin necesidad de estar en Claude.

## 4. Primer uso

1. Abre el link de Vercel desde cualquier teléfono o computador.
2. Crea una cuenta con usuario y contraseña — **la primera cuenta que se crea queda como
   administrador automáticamente.**
3. Entra al **Panel de administrador** y configura el correo al que quieres que se manden las
   entregas de turno automáticamente (y, si quieres, un número de WhatsApp por defecto).
4. Haz un recorrido de prueba: revisa un piso, guarda, sigue al siguiente, hasta el último.
   Al guardar el último piso, la app arma el PDF y lo manda sola al correo configurado — revisa
   la pestaña **Entrega de turno** para ver si el envío automático funcionó o si hubo algún
   error (por ejemplo, si el correo de Resend aún está en modo de pruebas y el destino no
   coincide con tu cuenta).

## Desarrollo local (opcional, para probar cambios antes de subirlos)

```bash
npm install
cp .env.example .env   # y pon ahí tus claves de Supabase
npm run dev -- --host  # el --host permite abrirlo desde el teléfono en la misma red WiFi
```

Nota: en desarrollo local, `/api/send-report` no corre a menos que uses `vercel dev` en vez de
`npm run dev` (necesita el CLI de Vercel: `npm i -g vercel`, luego `vercel dev`).

## Estructura del proyecto

```
├── api/
│   └── send-report.js      ← backend real: manda el correo con PDF adjunto (usa RESEND_API_KEY)
├── src/
│   ├── App.jsx              ← toda la app (rondas, tanques, entrega de turno, reportes, admin)
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   └── storage.js       ← sGet/sSet, ahora respaldados por Supabase en vez de window.storage
│   └── main.jsx
├── supabase/
│   └── schema.sql           ← corre esto una vez en el SQL Editor de tu proyecto de Supabase
├── .env.example
└── package.json
```

## Preguntas frecuentes

**¿Por qué WhatsApp no manda el PDF adjunto también?**
Porque el enlace `wa.me` (lo único que un sitio web puede usar para abrir WhatsApp) solo admite
texto. Adjuntar un archivo automáticamente requiere la API de WhatsApp Business de Meta, que
implica verificación de la empresa, un número de teléfono dedicado y aprobación de plantillas
de mensaje — un proceso de negocio, no algo que se resuelva con más código en esta app. Si en
algún momento quieres ese camino, puedo ayudarte a evaluarlo, pero es un proyecto aparte.

**¿Esto tiene algún costo?**
Con volúmenes de un hotel normal, los planes gratuitos de Supabase, Vercel y Resend alcanzan
sin problema. Si más adelante creces mucho, cada uno tiene planes pagos, pero no es necesario
para empezar.

**¿Puedo seguir usando la versión de Claude (artifact) en paralelo?**
Sí, pero ojo: son dos bases de datos distintas (una vive en Claude, la otra en Supabase). No se
sincronizan entre sí. Lo recomendable es que, una vez tengas esta versión desplegada y
funcionando, la uses como la única oficial.
