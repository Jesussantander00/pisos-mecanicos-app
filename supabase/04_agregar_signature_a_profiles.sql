-- ============================================================
-- PARCHE — agregar columna de firma a "profiles" (faltaba)
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO. Solo agrega una columna nueva vacía — no borra ni cambia nada
-- de lo que ya había. Esto es lo que faltaba para que la firma de cada quien se guarde de verdad
-- y no se pierda al salir de Mi Perfil (se me había quedado por fuera al armar la tabla).
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

alter table profiles add column if not exists signature text;

select 'Listo: columna signature agregada a profiles. Las firmas ya se van a guardar de verdad.' as resultado;
