-- ============================================================
-- Tabla para avisar de intentos de login fallidos repetidos
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO. No toca nada de lo que ya funciona — solo agrega una tabla
-- nueva, sin RLS abierta a nadie (ni con la clave pública, ni logueado): solo el servidor, con
-- la clave de servicio, puede leerla o escribirla. Por eso no hace falta ninguna política de
-- RLS aquí — sin políticas, con RLS activada, nadie del navegador puede tocarla, a propósito.
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

create table if not exists login_failures (
  email text primary key,
  count int not null default 0,
  last_attempt timestamptz not null default now()
);

alter table login_failures enable row level security;
-- (sin políticas = bloqueada para cualquiera que no sea el servidor con la clave de servicio)

select 'Listo: tabla login_failures creada.' as resultado;
