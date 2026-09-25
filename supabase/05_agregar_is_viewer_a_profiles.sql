-- ============================================================
-- PARCHE — agregar columna del rol "Solo ver" a "profiles"
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO. Solo agrega una columna nueva (en false para todos) — no borra
-- ni cambia nada de lo que ya había. Esto es lo que hace falta para poder marcar a alguien como
-- "Solo ver" desde el Panel de administrador → Editar usuario → Rol base.
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

alter table profiles add column if not exists is_viewer boolean not null default false;

select 'Listo: columna is_viewer agregada a profiles. Ya puedes marcar cuentas como "Solo ver" desde el panel de administrador.' as resultado;
