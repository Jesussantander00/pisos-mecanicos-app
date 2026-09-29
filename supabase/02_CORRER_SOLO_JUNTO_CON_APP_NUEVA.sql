-- ============================================================
-- MIGRACIÓN A SUPABASE AUTH — Paso 2 de 2: cerrar app_storage
-- ============================================================
-- ⚠️ ADVERTENCIA — LEE ESTO ANTES DE CORRERLO ⚠️
--
-- Este script hace que app_storage EXIJA una sesión real de Supabase Auth para leer o escribir
-- cualquier cosa. Ahora mismo (mientras escribo esto) tu app en producción TODAVÍA NO sabe iniciar
-- sesión con Supabase Auth — solo usa la clave pública directo, sin sesión.
--
-- SI CORRES ESTE SCRIPT ANTES DE QUE App.jsx ESTÉ ACTUALIZADO Y DESPLEGADO CON EL LOGIN NUEVO,
-- LA APP DEJA DE FUNCIONAR PARA TODO EL MUNDO AL INSTANTE — nadie va a poder ver ni guardar nada,
-- ni siquiera entrar, hasta que se revierta este cambio o se termine la actualización del código.
--
-- Por eso este script está en un archivo APARTE del Paso 1: para que no se corran los dos de
-- una sentada por error. Solo corre esto en el MISMO momento en que subas a producción la
-- versión de App.jsx que ya inicia sesión de verdad con Supabase Auth — idealmente los dos
-- pasos (subir el código nuevo + correr este script) uno justo después del otro, sin dejar
-- mucho tiempo en el medio.
--
-- Si algo sale mal después de correr esto y la app queda bloqueada, el "botón de pánico" es
-- volver a poner las políticas viejas (abre otra consulta nueva y corre esto):
--
--   drop policy if exists "app_storage_select_approved" on app_storage;
--   drop policy if exists "app_storage_insert_approved" on app_storage;
--   drop policy if exists "app_storage_update_approved" on app_storage;
--   create policy "allow all read" on app_storage for select using (true);
--   create policy "allow all insert" on app_storage for insert with check (true);
--   create policy "allow all update" on app_storage for update using (true);
--
-- (eso deja todo como estaba antes de este cambio, mientras se arregla lo que haya fallado)

drop policy if exists "allow all read" on app_storage;
drop policy if exists "allow all insert" on app_storage;
drop policy if exists "allow all update" on app_storage;

create policy "app_storage_select_approved"
  on app_storage for select
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

create policy "app_storage_insert_approved"
  on app_storage for insert
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

create policy "app_storage_update_approved"
  on app_storage for update
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from profiles where id = auth.uid() and approved = true)
  );

select 'app_storage ahora exige sesión real y cuenta aprobada. Confirma YA MISMO que la app sigue funcionando con una cuenta de prueba.' as resultado;
