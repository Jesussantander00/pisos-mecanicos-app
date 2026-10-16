-- ============================================================
-- NUEVOS ROLES: Supervisor e Inspector (revisan y dan el cierre de las tareas)
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA. Solo agrega dos columnas (en false para todos) y una protección:
-- nadie puede ponerse estos roles a sí mismo desde la app; solo el administrador, por medio de la
-- función del servidor (admin-actions). No borra ni cambia nada de lo que ya había.
--
-- Ejecuta esto en: Supabase -> tu proyecto -> SQL Editor -> New query -> Run

alter table public.profiles add column if not exists is_supervisor boolean not null default false;
alter table public.profiles add column if not exists is_inspector  boolean not null default false;

-- Protección: si alguien intenta cambiar estos dos roles desde el navegador, se rechaza.
-- La función del servidor usa la clave de servicio (service_role) y sí puede.
create or replace function public.app_guard_review_roles()
returns trigger language plpgsql as $$
begin
  if (new.is_supervisor is distinct from old.is_supervisor
      or new.is_inspector is distinct from old.is_inspector)
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Solo un administrador puede cambiar los roles de supervisor e inspector.';
  end if;
  return new;
end $$;

drop trigger if exists app_guard_review_roles_trg on public.profiles;
create trigger app_guard_review_roles_trg
  before update on public.profiles
  for each row execute function public.app_guard_review_roles();

select 'Listo: roles Supervisor e Inspector creados. Ya los puedes asignar en Panel de administrador -> Editar usuario.' as resultado;
