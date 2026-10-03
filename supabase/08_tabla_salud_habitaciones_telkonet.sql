-- ============================================================
-- NUEVA TABLA — salud de temperatura de habitaciones (Telkonet), para el Dashboard de
-- mantenimiento del Historial de habitaciones.
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO — crea una tabla nueva, no toca ninguna tabla existente ni
-- ningún dato de la app.
--
-- Qué es esto:
-- Un proceso en segundo plano (api/telkonet-scan.js, programado una vez al día con Vercel Cron)
-- revisa poco a poco el registro de los últimos ~7 días de cada habitación en Telkonet y guarda
-- aquí, por habitación, cuántas de esas lecturas tuvieron la temperatura muy desviada del set
-- point. El Dashboard (pestaña "Dashboard" de TelkHab) lee esta tabla para mostrar qué
-- habitaciones conviene revisar — sin tener que consultar las 361 habitaciones en vivo cada vez
-- que alguien abre la pantalla, lo cual sería lento y le pegaría duro a Telkonet.
--
-- Nadie entra a leer ni a escribir esta tabla directo desde el navegador — solo la tocan las
-- funciones del servidor (api/telkonet.js para leer, api/telkonet-scan.js para escribir), ambas
-- usando la llave de servicio de Supabase, que se salta RLS. Por eso RLS queda activado pero SIN
-- ninguna política: nadie con la clave pública (anon) ni con sesión normal puede leer ni escribir
-- esta tabla directamente, solo el servidor.
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

create table if not exists telkonet_room_health (
  room_id text primary key,
  room_name text,
  device_id text,
  total_readings integer,
  out_of_range_count integer,
  out_of_range_pct numeric,
  avg_delta numeric,
  oldest_reading text,
  newest_reading text,
  needs_maintenance boolean default false,
  last_scanned_at timestamptz,
  scan_error text,
  updated_at timestamptz not null default now()
);

alter table telkonet_room_health enable row level security;
-- A propósito no se crea ninguna política: con RLS activado y sin políticas, nadie puede leer ni
-- escribir esta tabla salvo con la llave de servicio (la que ya usan api/telkonet.js y
-- api/telkonet-scan.js), que siempre se salta RLS.
