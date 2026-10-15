-- Endurece la seguridad de la base de datos (RLS):
--  1) Fotos y videos: quita la "lectura pública" antigua; ahora solo cuentas aprobadas con sesión.
--  2) Perfiles: solo se ve el propio, o todos si la cuenta está aprobada.
--  3) app_storage: lectura y escritura restringidas para claves internas (solo administrador).
--  4) Retira permisos sobrantes del rol anónimo y de TRUNCATE/REFERENCES/TRIGGER.
-- Ejecuta esto en: Supabase -> tu proyecto -> SQL Editor -> New query -> Run

-- Función auxiliar: ¿la cuenta actual está aprobada? (SECURITY DEFINER evita recursión en las políticas)
create or replace function public.app_is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true);
$$;

-- Claves internas: solo el administrador las lee/escribe; el buffer de recorrido solo su dueño.
create or replace function public.app_can_read(k text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true
      and (
        p.is_admin = true
        or (
          k not in ('accounts', 'ops-alerts-sent', 'drive-archive-last', 'last-backup')
          and k not like 'ratelimit:%'
          and (k not like 'tour-buffer-%' or k = 'tour-buffer-' || auth.uid()::text)
        )
      )
  );
$$;

create or replace function public.app_can_write(k text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true
      and (
        p.is_admin = true
        or (
          coalesce(p.is_viewer, false) = false
          and k not in ('report-email', 'report-whatsapp', 'accounts', 'ops-alerts-sent', 'drive-archive-last', 'last-backup')
          and k not like 'ratelimit:%'
          and (k not like 'tour-buffer-%' or k = 'tour-buffer-' || auth.uid()::text)
        )
        or (coalesce(p.is_viewer, false) = true and k in ('login-log', 'push-subscriptions'))
      )
  );
$$;

-- 1) Fotos y videos
drop policy if exists "Allow public reads from maintenance-photos" on storage.objects;
drop policy if exists "Allow public reads from maintenance-videos" on storage.objects;
create policy "maintenance_photos_select_approved" on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-photos' and public.app_is_approved());
create policy "maintenance_videos_select_approved" on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-videos' and public.app_is_approved());

-- 2) Perfiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_own_or_approved" on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_is_approved());

-- 3) app_storage
drop policy if exists "app_storage_select_approved" on public.app_storage;
create policy "app_storage_select_approved" on public.app_storage for select to authenticated
  using (public.app_can_read(key));
drop policy if exists "app_storage_update_approved" on public.app_storage;
create policy "app_storage_update_approved" on public.app_storage for update to authenticated
  using (public.app_can_read(key)) with check (public.app_can_write(key));

-- 4) Permisos sobrantes
revoke all on public.app_storage, public.profiles, public.login_failures, public.telkonet_room_health, public.app_storage_backup_pre_signed_urls from anon;
revoke truncate, references, trigger on public.app_storage, public.profiles, public.login_failures, public.telkonet_room_health, public.app_storage_backup_pre_signed_urls from authenticated;
revoke all on public.login_failures, public.telkonet_room_health, public.app_storage_backup_pre_signed_urls from authenticated;
