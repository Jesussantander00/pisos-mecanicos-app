-- ============================================================
-- PARCHE — forzar cambio de contraseña tras un reset de admin
-- ============================================================
-- ✅ SEGURO DE CORRER AHORA MISMO. Solo agrega una columna nueva (en false para todos) — no borra
-- ni cambia nada de lo que ya había.
--
-- Qué hace: cuando un administrador le resetea la contraseña a alguien desde el Panel de
-- administrador (por ejemplo porque olvidó la suya, o para dar de alta a alguien con una
-- contraseña temporal), esa persona queda obligada a cambiarla por una propia la primera vez
-- que entra — no puede quedarse usando indefinidamente la que el admin le puso a mano.
--
-- Ejecuta esto en: Supabase → tu proyecto → SQL Editor → New query → Run

alter table profiles add column if not exists must_change_password boolean not null default false;

select 'Listo: columna must_change_password agregada a profiles. A partir de ahora, cuando un admin resetee la contraseña de alguien desde el panel, esa persona va a tener que cambiarla por una propia al entrar.' as resultado;
