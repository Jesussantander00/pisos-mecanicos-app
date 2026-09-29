-- ============================================================
-- MIGRACIÓN A SUPABASE AUTH — Paso 1 de 2: tabla de perfiles
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO. No toca nada de lo que ya funciona (ni app_storage, ni las
-- cuentas actuales, ni nada de la app en producción). Solo agrega piezas nuevas que quedan sin
-- usarse hasta que el código de la app se actualice para usarlas — eso es el Paso 2, en otro
-- archivo aparte, y ESE sí hay que coordinarlo con el despliegue nuevo de App.jsx (ver ese
-- archivo para la advertencia completa de por qué).
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

-- ---- Tabla de perfiles: uno por cada persona que entre con Supabase Auth ----
-- Guarda el rol de cada quien (admin, almacenista, gerencia) y si ya fue aprobada la cuenta —
-- reemplaza lo que hoy vive "a mano" dentro de app_storage con la key "accounts".
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  is_almacenista boolean not null default false,
  is_gerencia boolean not null default false,
  approved boolean not null default false,
  linked_employee_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on profiles;
drop policy if exists "profiles_update_own" on profiles;

-- Cualquiera que haya iniciado sesión de verdad puede VER los perfiles (para listas de usuarios,
-- saber quién es admin, etc.) — pero solo si está autenticado, no cualquiera con la clave pública.
create policy "profiles_select_authenticated"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Cada quien puede actualizar su propio perfil (ej. cambiar su nombre para mostrar) — el trigger
-- de abajo se encarga de que NADIE pueda subirse el rol a sí mismo editando su propio registro.
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- Blindaje contra "autoascenderse" a admin ----
-- Una política de RLS normal no puede bloquear columnas específicas — por eso esto se hace con
-- un trigger: si alguien edita SU PROPIO perfil, los campos de rol/aprobación simplemente se
-- ignoran (quedan como estaban antes), sin importar qué manden en el pedido. Cambiar esos campos
-- de verdad solo se puede hacer desde una función de servidor con la clave de servicio (que se
-- salta RLS a propósito, y solo la usa el servidor, nunca el navegador).
create or replace function prevent_role_self_escalation()
returns trigger as $$
begin
  if auth.uid() = new.id then
    new.is_admin := old.is_admin;
    new.is_almacenista := old.is_almacenista;
    new.is_gerencia := old.is_gerencia;
    new.approved := old.approved;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_block_self_escalation on profiles;
create trigger profiles_block_self_escalation
  before update on profiles
  for each row execute function prevent_role_self_escalation();

select 'Listo: tabla profiles creada y protegida. La app en producción sigue funcionando exactamente igual que antes de correr esto.' as resultado;
