-- 09_permisos_por_rol.sql
-- Permisos reales en la base de datos (no solo botones escondidos en la app).
-- Qué cambia:
--   1) Una persona ya no puede quitarse a sí misma la marca "solo ver" (is_viewer).
--      Antes el seguro (trigger) protegía is_admin, is_almacenista, is_gerencia y approved, pero NO is_viewer.
--   2) Las cuentas "solo ver" ya no pueden escribir en la tabla app_storage (tareas, mantenimientos,
--      inventario, etc.), salvo su registro de ingreso (login-log) y sus notificaciones (push-subscriptions).
--      Seguir leyendo sí pueden.
--   3) Las llaves report-email y report-whatsapp (a dónde se mandan los reportes) solo las puede cambiar un administrador.
-- No cambia nada para administradores, almacenistas, gerencia ni operadores normales.
-- Cómo correrlo: Supabase -> SQL Editor -> pegar todo -> Run. Para deshacerlo, ver el bloque final.

-- 1) Seguro contra auto-ascenso: ahora también protege is_viewer.
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
    new.approved := old.approved;
  end if;
  return new;
end;
$$;

-- 2) Quién puede escribir una llave de app_storage.
create or replace function public.app_can_write(k text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        p.is_admin = true
        or (coalesce(p.is_viewer, false) = false and k not in ('report-email', 'report-whatsapp'))
        -- las cuentas "solo ver" solo pueden guardar su registro de ingreso y sus notificaciones
        or (coalesce(p.is_viewer, false) = true and k in ('login-log', 'push-subscriptions'))
      )
  );
$$;

drop policy if exists app_storage_insert_approved on public.app_storage;
create policy app_storage_insert_approved on public.app_storage
  for insert to public
  with check (auth.role() = 'authenticated' and public.app_can_write(key));

drop policy if exists app_storage_update_approved on public.app_storage;
create policy app_storage_update_approved on public.app_storage
  for update to public
  using (auth.role() = 'authenticated' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true))
  with check (auth.role() = 'authenticated' and public.app_can_write(key));

-- (La lectura app_storage_select_approved queda igual: toda cuenta aprobada puede leer.)

-- ===================== PARA DESHACER (copiar y correr solo si algo sale mal) =====================
-- drop policy if exists app_storage_insert_approved on public.app_storage;
-- create policy app_storage_insert_approved on public.app_storage for insert to public
--   with check (auth.role() = 'authenticated' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.approved = true));
-- drop policy if exists app_storage_update_approved on public.app_storage;
-- create policy app_storage_update_approved on public.app_storage for update to public
--   using (auth.role() = 'authenticated' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.approved = true));
-- drop function if exists public.app_can_write(text);
