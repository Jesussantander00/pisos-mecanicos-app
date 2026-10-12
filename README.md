# QuinTech — Mantenimiento hotelero (Hyatt Cartagena)

App web instalable (PWA) para el equipo de mantenimiento del hotel: rondas de equipos, tareas,
equipos fuera de servicio, cuartos fríos, medidores, inventario, mantenimiento preventivo,
entrega de turno, planos por piso, horarios, análisis y panel ejecutivo. Funciona en celular y
computador, con o sin señal (los cambios se guardan en el teléfono y se suben al volver la red).

- **Sitio en producción:** https://pisosmecanicos-hcc.com
- **Hecha con:** React + Vite + Tailwind
- **Base de datos y archivos:** Supabase (tabla `app_storage`, Storage y Auth)
- **Servidor:** funciones de Vercel en la carpeta `api/`
- **Correo:** Resend · **Respaldo y archivo:** Google Drive

## Cómo se ve la app

- **Computador:** barra lateral de iconos (Inicio, Operario, Tareas, Fuera, Cuartos, Planta,
  Mtto, Inventario, Análisis), con «Todo» para ver todas las pantallas. Los administradores ven
  menos pestañas porque varias pantallas están agrupadas en centros con pestañas (Tareas,
  Cuartos, Estado de la planta, Panel ejecutivo y Mantenimiento).
- **Celular:** el menú abre la misma cuadrícula de iconos. «Operario» abre todo lo que ve un
  técnico (Ronda, Fríos, Medidores, Turno, Fuera de servicio, Mi trabajo, Fichas, Procedimientos,
  Tanques, Combustibles, Wiki y Mi horario).
- **Roles:** administrador, almacenista, gerencia, encargado de horarios y «solo ver».

## Qué hace el servidor (carpeta `api/`)

| Archivo | Para qué sirve |
|---|---|
| `send-report.js` | Envía por correo los PDF y Excel (entrega de turno, cuartos fríos, informes…) y **guarda una copia en Drive** (QuinTech / Informes / mes). |
| `admin-actions.js` | Acciones solo de administrador: aprobar cuentas, roles, contraseñas, permisos de Drive, y «Archivar ahora». |
| `telkonet.js` | Conexión con Telkonet EcoCentral (termostatos). También corre el resumen diario (cron `digest`) y, justo después, el **archivo automático a Drive**. |
| `send-push.js` | Notificaciones push. |
| `ai-assistant.js`, `generate-*.js`, `read-meter.js` | Asistente, resúmenes y lectura de medidores con IA. |
| `register-profile.js`, `log-failed-login.js` | Alta de perfiles y registro de ingresos fallidos. |
| `_lib/` | Funciones compartidas: seguridad, resumen diario y archivo en Drive (`driveArchive.js`). |

### Tareas programadas (Vercel Cron, hora UTC)

| Hora | Qué corre |
|---|---|
| 09:00 | `/api/telkonet?action=scan` — revisa los termostatos |
| 12:00 | `/api/telkonet?action=digest` — resumen diario por push y archivo automático a Drive |

El plan gratuito de Vercel permite 2 tareas programadas; por eso el archivo a Drive va dentro de
la del resumen diario y no tiene la suya.

## Fotos, videos e informes: dónde quedan

1. Las fotos (comprimidas) y los videos nuevos se suben a Supabase Storage
   (`maintenance-photos` y `maintenance-videos`).
2. **Cada día** el servidor pasa a Google Drive las fotos y videos de **más de 7 días**
   (`QuinTech / AAAA-MM / Fotos | Videos`). Solo después de confirmar que quedaron en Drive con el
   mismo tamaño, cambia el enlace en la app por la tarjeta «Archivada en Drive» y borra el
   original de Supabase. Así Supabase no se llena. No toca fotos de equipos.
3. En **Uso y respaldo → Archivo en Google Drive** se ve cuándo corrió por última vez, hay un
   botón **«Archivar ahora»** y se puede respaldar el texto (tareas, registros) a
   `QuinTech / Respaldos`.
4. Cada PDF o Excel enviado por correo se guarda también en `QuinTech / Informes / AAAA-MM`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Nombre | Para qué |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Conexión de la app con Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta del servidor (nunca en el navegador) |
| `RESEND_API_KEY`, `REPORT_FROM_EMAIL` | Envío de correos |
| `ALLOWED_REPORT_DOMAINS` | (opcional) limita a qué dominios se puede enviar |
| `APP_SHARED_SECRET` | (opcional) barrera extra para las funciones |
| `CRON_SECRET` | Autoriza a las tareas programadas de Vercel |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Permiso permanente para escribir en Drive |
| `TELKONET_USERNAME`, `TELKONET_PASSWORD` | Termostatos (TelkHab) |
| `GEMINI_API_KEY` | Funciones con IA |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Notificaciones push |

## Base de datos (Supabase)

1. **SQL Editor → New query** y corre `supabase/schema.sql` (tabla principal).
2. Corre los archivos `.sql` de la raíz y de `supabase/` en orden numérico (permisos, columnas de
   perfiles, seguridad de subida de fotos y videos, salud de habitaciones de Telkonet).
3. Crea los espacios de Storage `maintenance-photos` y `maintenance-videos`.

## Puesta en marcha

1. Sube el proyecto a GitHub y conéctalo a Vercel (detecta Vite solo; despliega en cada push).
2. Agrega las variables de entorno de arriba y despliega.
3. Abre el sitio y crea la primera cuenta: **queda como administrador** automáticamente.
4. En el Panel de administrador aprueba cuentas y configura el correo de las entregas de turno.

### Desarrollo local

```bash
npm install
cp .env.example .env   # pon ahí las claves de Supabase
npm run dev -- --host  # --host permite abrirlo desde el teléfono en la misma red
```

`/api/*` solo corre con `vercel dev` (necesita `npm i -g vercel`).

## Estructura del proyecto

```
├── api/                       ← funciones del servidor (ver tabla de arriba)
│   └── _lib/                  ← seguridad, resumen diario, archivo en Drive
├── src/
│   ├── App.jsx                ← navegación, menús y pantallas principales
│   ├── shared/                ← núcleo (core.jsx), componentes y datos base (seeds.js)
│   ├── views/                 ← una pantalla por archivo (Tareas, Ronda, Planta, Panel…)
│   └── main.jsx
├── supabase/                  ← SQL de la base de datos
├── public/                    ← iconos, manifest y service worker (PWA)
├── vercel.json                ← tareas programadas y tiempos máximos de las funciones
└── package.json
```

## Preguntas frecuentes

**¿Por qué WhatsApp no manda el PDF adjunto?**
El enlace `wa.me` solo admite texto. Adjuntar archivos automáticamente requiere la API oficial de
WhatsApp Business (verificación de empresa, número dedicado y plantillas aprobadas por Meta).
Por ahora se manda el resumen en texto y el PDF se adjunta a mano.

**¿Esto tiene costo?**
Con el volumen de un hotel, los planes gratuitos de Supabase, Vercel y Resend alcanzan. Drive
guarda las fotos, videos e informes viejos para que Supabase no se llene.

**¿Qué no se importa ni se hace solo?**
Los permisos finos por rol y la importación automática de HotSOS no están construidos.
