-- ============================================================
-- PARCHE — solo personal aprobado puede SUBIR fotos/videos
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO — no rompe ninguna foto ni video ya subido, ni ningún enlace
-- que ya esté guardado en tareas, mantenimientos, equipos dañados, etc.
--
-- Qué hace y qué NO hace (léelo antes de correrlo):
-- - SÍ exige sesión real y cuenta aprobada para SUBIR (insertar) archivos nuevos a los buckets
--   "maintenance-photos" y "maintenance-videos" — antes cualquiera con la clave pública (sin
--   iniciar sesión siquiera) podía subir lo que fuera a esos dos buckets.
-- - NO cambia que los archivos ya subidos (y los que se suban de ahora en adelante) se puedan
--   VER por cualquiera que tenga el enlace exacto — eso sigue igual, a propósito: cambiarlo
--   requeriría una migración más grande (URLs firmadas con vencimiento) que tocaría cómo se
--   guardan y se muestran las fotos en TODA la app, y no es prudente correrla sin probarla
--   primero. Avísame cuando quieras que la planeemos juntos.
--
-- ⚠️ IMPORTANTE — revisa esto ANTES de correr el script (desde acá no puedo ver tus políticas
-- actuales de Supabase, así que esto hay que confirmarlo a mano):
-- Ve a Supabase → tu proyecto → Storage → busca el bucket "maintenance-photos" → pestaña
-- "Policies" (o Authentication → Policies → tabla storage.objects). Si ya existe una política
-- de INSERT muy abierta para este bucket (por ejemplo "Public Insert" o algo con "true" sin
-- condiciones), tienes que BORRARLA — si se queda ahí junto con la nueva de abajo, las dos
-- conviven y la vieja sigue dejando subir a cualquiera, porque en Supabase estas políticas se
-- combinan con "O" (si CUALQUIERA de las políticas lo permite, se permite). Haz lo mismo para
-- "maintenance-videos". Si no encuentras ninguna política de INSERT ya puesta, no hay nada que
-- borrar y puedes correr el script tranquilo.
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

drop policy if exists "maintenance_photos_insert_approved" on storage.objects;
drop policy if exists "maintenance_videos_insert_approved" on storage.objects;

create policy "maintenance_photos_insert_approved"
  on storage.objects for insert
  with check (
    bucket_id = 'maintenance-photos'
    and auth.role() = 'authenticated'
    and exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

create policy "maintenance_videos_insert_approved"
  on storage.objects for insert
  with check (
    bucket_id = 'maintenance-videos'
    and auth.role() = 'authenticated'
    and exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

select 'Listo: ahora solo cuentas aprobadas pueden SUBIR fotos/videos nuevos. Ver los que ya existen (por enlace) sigue igual que antes.' as resultado;
