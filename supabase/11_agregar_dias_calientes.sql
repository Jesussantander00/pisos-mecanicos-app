-- Agrega a la tabla de salud de habitaciones cuántos días (de los últimos ~7) cada una estuvo
-- mucho más caliente que su objetivo, y cuáles días. Lo llena el escaneo diario automático.
-- Ejecuta esto en: Supabase -> tu proyecto -> SQL Editor -> New query -> Run
alter table telkonet_room_health add column if not exists hot_days integer;
alter table telkonet_room_health add column if not exists hot_days_list text;
