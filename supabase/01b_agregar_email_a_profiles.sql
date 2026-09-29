-- ============================================================
-- PARCHE PEQUEÑO — agregar columna de correo a "profiles"
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO, junto con el 01 (o después, en cualquier momento antes del
-- Paso 2). Solo agrega una columna nueva vacía — no borra ni cambia nada de lo que ya había.
-- Sin esto, el Panel de Administrador no podría mostrar el correo de cada persona (porque por
-- privacidad, Supabase no deja ver el correo de OTROS usuarios directo desde el navegador —
-- por eso se guarda una copia aquí, en profiles, al momento de registrarse cada quien).
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

alter table profiles add column if not exists email text;

select 'Listo: columna email agregada a profiles.' as resultado;
