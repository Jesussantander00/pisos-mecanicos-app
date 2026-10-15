-- 10_agregar_is_owner.sql
-- El "dueño" de la app (quien ve el menú completo y la herramienta "Ver como") ahora se marca en su
-- perfil (columna is_owner) y ya no depende de un correo escrito dentro del código.
-- Seguro de correr: no cambia nada visible. La app sigue reconociendo al dueño por su correo como respaldo.
-- Cómo correrlo: Supabase -> SQL Editor -> pegar todo -> Run.

alter table public.profiles add column if not exists is_owner boolean not null default false;

-- Nadie puede ponerse is_owner a sí mismo (igual que is_admin): se ignora si edita su propio perfil.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id then
    new.is_admin := old.is_admin;
    new.is_almacenista := old.is_almacenista;
    new.is_gerencia := old.is_gerencia;
    new.is_viewer := old.is_viewer;
    new.is_owner := old.is_owner;
    new.approved := old.approved;
  end if;
  return new;
end;
$$;

-- Marca al dueño actual.
update public.profiles
set is_owner = true
where id in (select id from auth.users where lower(email) = 'jesusdanielquintanasantander@gmail.com');

select display_name, is_owner from public.profiles where is_owner = true;

-- PARA DESHACER: alter table public.profiles drop column is_owner;  (y volver a correr 09_permisos_por_rol.sql para restaurar el trigger)
