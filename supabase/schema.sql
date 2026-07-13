-- Ejecuta esto una sola vez en: Supabase → tu proyecto → SQL Editor → New query → Run

create table if not exists app_storage (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_storage enable row level security;

-- Política simple para que la app funcione con la clave pública (anon key):
-- cualquiera con esa clave puede leer y escribir. Esto reproduce el mismo nivel
-- de "seguridad por complejidad" que ya tenía la app (usuarios con contraseña
-- hasheada, pero sin backend de autenticación separado). Si tu hotel maneja
-- información más sensible, avísame y lo pasamos a Supabase Auth con políticas
-- por usuario.
drop policy if exists "allow all read" on app_storage;
drop policy if exists "allow all insert" on app_storage;
drop policy if exists "allow all update" on app_storage;

create policy "allow all read" on app_storage for select using (true);
create policy "allow all insert" on app_storage for insert with check (true);
create policy "allow all update" on app_storage for update using (true);
