import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  AlertTriangle, CheckCircle2, Clock, User, LogOut, ChevronRight, ChevronDown, ChevronLeft,
  Droplets, ClipboardList, History, Gauge, Wrench, PlusCircle, X, Save, Search,
  Building2, ShieldCheck, MessageCircle, Download, Send, Mail, TrendingUp, TrendingDown, Snowflake, Zap, CalendarDays,
  Package, Warehouse, QrCode, PackageMinus, PackagePlus, Trash2, ArrowLeft, Users, Home, Bell, ClipboardCheck, Moon, Sun, RotateCcw, Camera, Mic, Sparkles, Upload, WifiOff, Pencil
} from "lucide-react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { sGet, sSet, uploadPhoto, getPendingCount, flushOfflineQueue, exportFullBackup, saveRecordWithPhotos, flushPhotoRecordQueue, getPendingPhotoRecordsCount } from "./lib/storage";
import { supabase } from "./lib/supabaseClient";

/* ============================================================
   PALETA / TOKENS
   Panel de control industrial: azul acero oscuro + ámbar de alerta.
   ============================================================ */
const LIGHT_COLORS = {
  bg: "#eef1f4",
  panel: "#ffffff",
  ink: "#16212e",
  inkSoft: "#5a6b7d",
  steel: "#1f3247",
  steelDark: "#132030",
  line: "#dde3e9",
  amber: "#d98e04",
  amberSoft: "#fbeed4",
  green: "#2f9e44",
  greenSoft: "#e6f6ea",
  red: "#d1401f",
  redSoft: "#fbe6e0",
  blue: "#3b6fa0",
  blueSoft: "#e4edf5",
  gray: "#8a97a3",
  cardAlt: "#fafbfc",
  white: "#ffffff",
};
const DARK_COLORS = {
  bg: "#0f1720",
  panel: "#1a2531",
  ink: "#e7edf3",
  inkSoft: "#a7b6c4",
  steel: "#0c1a28",
  steelDark: "#0a1521",
  line: "#2b3947",
  amber: "#e8a53a",
  amberSoft: "#3a2e14",
  green: "#4cb765",
  greenSoft: "#173622",
  red: "#e2604a",
  redSoft: "#3a1c17",
  blue: "#6ea3d8",
  blueSoft: "#182634",
  gray: "#8695a3",
  cardAlt: "#1f2b38",
  white: "#1a2531",
};
// C es un objeto MUTABLE compartido por toda la app (todos los componentes leen C.xxx al dibujarse).
// Cambiar de tema es simplemente sobrescribir sus valores y forzar un redibujado — así no hay que
// tocar cada componente uno por uno para que reaccionen al modo oscuro.
const C = { ...LIGHT_COLORS };
/** Refleja los colores que se usan en hover/active de Tailwind como variables CSS reales —
 * así "hover:border-[var(--pm-amber)]" se actualiza solo entre modo claro/oscuro. */
function syncCssVars() {
  try {
    document.documentElement.style.setProperty("--pm-amber", C.amber);
    document.documentElement.style.setProperty("--pm-line", C.line);
  } catch { /* noop (por si corre antes de que exista document, poco probable) */ }
}
/** ¿Es de noche ahora mismo? 6:00 p.m. a 6:00 a.m. — el disparador de modo oscuro automático. */
function isNightHour(d = new Date()) {
  const h = d.getHours();
  return h >= 18 || h < 6;
}

/**
 * Navegador y sistema operativo de quien hizo el cambio — para el historial de auditoría. Un
 * navegador no puede leer la IP real por sí solo (eso solo lo puede capturar un servidor), pero
 * saber "desde qué tipo de dispositivo" es lo que de verdad ayuda a rastrear un cambio.
 */
function getDeviceInfo() {
  try {
    const ua = navigator.userAgent || "";
    let os = "Dispositivo desconocido";
    if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/Macintosh/.test(ua)) os = "Mac";
    else if (/Linux/.test(ua)) os = "Linux";
    let browser = "Navegador";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
    return `${browser} en ${os}`;
  } catch { return "Dispositivo desconocido"; }
}
try {
  const savedTheme = localStorage.getItem("pm-local:theme"); // "dark" | "light" | null (nunca eligió = automático por hora)
  const useDark = savedTheme === "dark" || (savedTheme !== "light" && isNightHour());
  if (useDark) Object.assign(C, DARK_COLORS);
} catch { /* noop */ }
syncCssVars();
function applyTheme(dark) {
  Object.assign(C, dark ? DARK_COLORS : LIGHT_COLORS);
  syncCssVars();
}

const STATUS_OPTS = ["Automático", "Manual", "Apagado"];
// Vistas a las que SÍ puede entrar una cuenta marcada como "Gerencia" pura (sin admin/almacenista) — todo lo demás queda bloqueado.
const GERENCIA_ALLOWED_VIEWS = ["home", "executive", "maintenance-analytics", "analytics"];

/* ============================================================
   DATOS: PISOS Y EQUIPOS (según formato original, verificado
   página por página para respetar la agrupación real por piso)
   kind: 'status' | 'numeric' | 'statusNumeric' | 'sample' | 'note'
   ============================================================ */
const FLOORS = [
  { id: "p0", name: "Piso Mecánico 0", items: [
    { c: 1, n: "Bomba # 1 Suministro de Agua Potable", k: "status" },
    { c: 2, n: "Bomba # 2 Suministro de Agua Potable", k: "status" },
    { c: 3, n: "Nivel tanque de agua potable", k: "numeric", u: "%", tank: true },
    { c: 4, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 5, n: "Rejillas Desagües Cuarto Bomba Agua Potable", k: "status" },
    { c: 12, n: "Nivel tanque de agua contraincendio", k: "numeric", u: "%" },
    { c: 13, n: "Bomba # 1 Suministro de Agua Contraincendios", k: "status" },
    { c: 14, n: "Bomba # 2 Suministro de Agua Contraincendios", k: "status" },
    { c: 15, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 16, n: "Rejillas Desagüe Cuarto Bomba Agua Contraincendio", k: "status" },
    { c: 23, n: "Encendido de letras zona de Bahía", k: "status" },
    { c: 24, n: "Encendido de letras zona de playas", k: "status" },
  ]},
  { id: "p1", name: "Piso Mecánico 1", items: [
    { c: 24, n: "Nivel Tanque de ACPM", k: "numeric", u: "gln" , fuel: true },
    { c: 25, n: "Bomba Suministro ACPM", k: "status" },
    { c: 26, n: "Estado Dique de Rebose Tanque ACPM", k: "status" },
  ]},
  { id: "p2", name: "Piso Mecánico 2", items: [
    { c: 27, n: "Manejadora AC-001", k: "status" },
    { c: 28, n: "Manejadora AC-002", k: "status" },
    { c: 29, n: "Manejadora AC-003", k: "status" },
    { c: 30, n: "Manejadora AC-201", k: "status" },
    { c: 31, n: "Unidad de Extracción UE-001", k: "status" },
    { c: 32, n: "Unidad de Extracción UE-201", k: "status" },
  ]},
  { id: "p3", name: "Piso Mecánico 3", items: [
    { c: 33, n: "Manejadora AC-101", k: "status" },
    { c: 34, n: "Manejadora AC-301A", k: "status" },
    { c: 35, n: "Manejadora AC-301", k: "status" },
    { c: 36, n: "Manejadora AC-401", k: "status" },
    { c: 37, n: "Unidad Extracción Campana UE-301A", k: "status" },
    { c: 38, n: "Unidad Inyección Campana UI-301A", k: "status" },
    { c: 39, n: "Unidad Extracción UE-301", k: "status" },
    { c: 40, n: "Unidad Inyección UI-301", k: "status" },
  ]},
  { id: "p4", name: "Piso 4", items: [
    { c: 41, n: "Caldera", k: "status" },
    { c: 42, n: "Nivel pimpina químico Nesguard 22300 (61 Kg)", k: "numeric", u: "%" },
    { c: 43, n: "Nivel pimpina químico Tri-Act 1820 (56 Kg)", k: "numeric", u: "%" },
    { c: 44, n: "Nivel pimpina químico Nalco 780 (70 Kg)", k: "numeric", u: "%" },
    { c: 45, n: "Presión Caldera", k: "numeric", u: "psi" },
    { c: 46, n: "Sal en el Tanque del Suavizador", k: "status" },
    { c: 47, n: "Bombas Dosificadoras # 1-2-3", k: "status" },
    { c: 48, n: "Unidad de Extracción UE-401", k: "status" },
    { c: 49, n: "Compresor de Aire", k: "status" },
    { c: 50, n: "Horómetro Compresor de Aire", k: "numeric", u: "Hr" },
    { c: 51, n: "Lectura Medidor de Agua Lavandería", k: "numeric", u: "" },
  ]},
  { id: "p8", name: "Piso Mecánico 8", items: [
    { c: 52, n: "Manejadora AC-801", k: "status" },
    { c: 53, n: "Manejadora AC-901", k: "status" },
    { c: 54, n: "Manejadora AC-1005", k: "status" },
    { c: 55, n: "Manejadora AC-1006", k: "status" },
    { c: 56, n: "Ventilador Presurización Escalera PE-801", k: "status" },
    { c: 57, n: "Unidad de Extracción UE-901", k: "status" },
    { c: 58, n: "Calentador de Agua # 1", k: "status" },
    { c: 59, n: "Calentador de Agua # 2", k: "status" },
    { c: 60, n: "Calentador de Agua # 3", k: "status" },
    { c: 61, n: "Tablero de control sistema de agua caliente", k: "status" },
    { c: 64, n: "Bomba de agua caliente Principal", k: "status" },
    { c: 65, n: "Bomba de recirculación piso 8 al 0", k: "statusNumeric", u: "psi" },
    { c: 66, n: "Bomba de recirculación piso 8 al 14", k: "statusNumeric", u: "psi" },
    { c: 69, n: "Temperatura controlador agua caliente", k: "numeric", u: "°C" },
    { c: 70, n: "Temperatura controlador recirculación agua caliente", k: "numeric", u: "°C" },
    { c: 71, n: "Temperatura Tanque Agua Caliente", k: "numeric", u: "°C" },
    { c: 73, n: "Nivel Tanque de Agua Potable # 1", k: "numeric", u: "%", tank: true },
    { c: 74, n: "Nivel Tanque de Agua Potable # 2", k: "numeric", u: "%", tank: true },
    { c: 91, n: "Nivel tanque de Cloro Tanque Agua Potable", k: "numeric", u: "%" },
    { c: 92, n: "Bomba Dosificadora de Cloro Tanque Agua Potable", k: "status" },
    { c: 93, n: "Estado Regulador PROMINENT Tanque Agua Potable", k: "status" },
    { c: 94, n: "Numero de pimpinas de cloro llenas", k: "numeric", u: "#" },
    { c: 95, n: "Porcentaje de cloro en sistema", k: "numeric", u: "%" },
    { c: 78, n: "Bomba Suministro de Agua Potable #1", k: "status" },
    { c: 79, n: "Bomba Suministro de Agua Potable #2", k: "status" },
    { c: 80, n: "Bomba Suministro de Agua Potable #3", k: "status" },
    { c: 81, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
  ]},
  { id: "p10", name: "Piso 10 Mecánico", items: [
    { c: 85, n: "Luces pasillos y Foyer", k: "status" },
    { c: 86, n: "A/A Salón Navío", k: "status" },
    { c: 87, n: "A/A Salón Galeón 1 y 2", k: "status" },
    { c: 88, n: "A/A Sala de Juntas", k: "status" },
    { c: 89, n: "A/A Salón Fragata 1 y 2", k: "status" },
    { c: 90, n: "Manejadora AC-1003", k: "status" },
    { c: 91, n: "Manejadora AC-1002", k: "status" },
    { c: 92, n: "Manejadora AC-1004", k: "status" },
    { c: 93, n: "Manejadora AC-1001", k: "status" },
  ]},
  { id: "p11a", name: "Piso Mecánico 11A", items: [
    { c: 94, n: "Extracción de aire Entrada cuarto mecánico", k: "status" },
    { c: 95, n: "Bomba Piscina Niños Principal", k: "status" },
    { c: 96, n: "Bomba Piscina Niños Auxiliar", k: "status" },
    { c: 97, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 98, n: "Dosificador de Cloro", k: "status" },
    { c: 99, n: "Calentador Piscina Niños", k: "status" },
    { c: 100, n: "Bomba Piscina Asoleadora Principal", k: "status" },
    { c: 101, n: "Bomba Piscina Asoleadora Auxiliar", k: "status" },
    { c: 102, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 103, n: "Dosificador de Cloro", k: "status" },
    { c: 104, n: "Calentador Piscina Asoleadora", k: "status" },
    { c: 105, n: "Bomba Piscina Recreacional Principal", k: "status" },
    { c: 106, n: "Bomba Piscina Recreacional Auxiliar", k: "status" },
    { c: 107, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 108, n: "Dosificador de Cloro", k: "status" },
    { c: 109, n: "Calentador Piscina Recreacional #1", k: "status" },
    { c: 110, n: "Calentador Piscina Recreacional #2", k: "status" },
    { c: 111, n: "Bomba Piscina Ejercicios Principal", k: "status" },
    { c: 112, n: "Bomba Piscina Ejercicios Secundario", k: "status" },
    { c: 113, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 114, n: "Sistema automático de cloro", k: "status" },
    { c: 115, n: "Calentador Piscina Ejercicios #1", k: "status" },
    { c: 116, n: "Calentador Piscina Ejercicios #2", k: "status" },
    { c: 117, n: "Muestra de Agua cocina Piso 11", k: "sample" },
  ]},
  { id: "p15", name: "Piso Mecánico 15", items: [
    { c: 118, n: "Presurización Escalera PE-1501", k: "status" },
    { c: 119, n: "Presurización Escalera PE-1502", k: "status" },
    { c: 120, n: "Manejadora AC-1401", k: "status" },
    { c: 121, n: "Manejadora AC-1402", k: "status" },
    { c: 122, n: "Manejadora AC-1502", k: "status" },
    { c: 123, n: "Manejadora AC-1201", k: "status" },
    { c: 124, n: "Unidad de Extracción UE-1201", k: "status" },
    { c: 125, n: "Unidad de Extracción UE-1401", k: "status" },
  ]},
  { id: "p16", name: "Piso Mecánico 16", items: [
    { c: 126, n: "Estado de Chiller # 1", k: "status" },
    { c: 127, n: "Estado de Chiller # 2", k: "status" },
    { c: 128, n: "BAC SP #1", k: "status" },
    { c: 129, n: "BAC SP #2", k: "status" },
    { c: 130, n: "BAC SP #3", k: "status" },
    { c: 131, n: "BAF SP #1", k: "status" },
    { c: 132, n: "BAF SP #2", k: "status" },
    { c: 133, n: "BAF SP #3", k: "status" },
    { c: 134, n: "BAF SS #4", k: "status" },
    { c: 135, n: "BAF SS #5", k: "status" },
    { c: 136, n: "Presurización Escalera PE-1601", k: "status" },
    { c: 137, n: "Presurización Escalera PE-1602", k: "status" },
    { c: 138, n: "Nivel pimpina químico Trasar Trc 104 (74 Kg)", k: "numeric", u: "%" },
    { c: 139, n: "Nivel pimpina químico Nalco 7330 (18 Kg)", k: "numeric", u: "%" },
    { c: 140, n: "Controlador de luces piscinas del 14", k: "status" },
    { c: 141, n: "Manejadora AC-1501", k: "status" },
    { c: 142, n: "Manejadora AC-1103", k: "status" },
    { c: 143, n: "Manejadora AC-1601", k: "status" },
    { c: 199, n: "Manejadora AC-1602", k: "status" },
    { c: 144, n: "Recuperadora RE-1601", k: "status" },
    { c: 145, n: "Manejadora AC-1101", k: "status" },
    { c: 146, n: "Manejadora AC-1102", k: "status" },
    { c: 147, n: "Generador de Energía #1 CUMMINS 1500KVA", k: "status" },
    { c: 148, n: "Generador de Energía #2 CUMMINS 1500KVA", k: "status" },
    { c: 149, n: "Nivel Tanque de ACPM", k: "numeric", u: "gln" , fuel: true },
    { c: 150, n: "Bomba Suministro ACPM", k: "status" },
    { c: 151, n: "Estado Transferencias 220", k: "status" },
    { c: 152, n: "Estado Transferencias 440", k: "status" },
    { c: 153, n: "Aire de precisión sub estación eléctrica", k: "status" },
    { c: 154, n: "Temperatura Transformador #1 (1000KVA)", k: "numeric", u: "°C" },
    { c: 155, n: "Temperatura Transformador #2 (630KVA)", k: "numeric", u: "°C" },
    { c: 156, n: "Temperatura Transformador #3 (1250KVA)", k: "numeric", u: "°C" },
    { c: 157, n: "Temperatura Transformador #4 (630KVA)", k: "numeric", u: "°C" },
    { c: 158, n: "Temperatura Transformador #5 (1600KVA)", k: "numeric", u: "°C" },
  ]},
  { id: "p33", name: "Piso Mecánico 33", items: [
    { c: 159, n: "Motor y correas #1 Torre enfriamiento #1", k: "status" },
    { c: 160, n: "Motor y correas #2 Torre enfriamiento #1", k: "status" },
    { c: 161, n: "Motor y correas #3 Torre enfriamiento #1", k: "status" },
    { c: 162, n: "Válvula de llenado torre enfriamiento #1", k: "status" },
    { c: 163, n: "Válvula de desagüe torre enfriamiento #1", k: "status" },
    { c: 164, n: "Motor y correas #1 Torre enfriamiento #2", k: "status" },
    { c: 165, n: "Motor y correas #2 Torre enfriamiento #2", k: "status" },
    { c: 166, n: "Motor y correas #3 Torre enfriamiento #2", k: "status" },
    { c: 167, n: "Válvula de llenado torre enfriamiento #2", k: "status" },
    { c: 168, n: "Válvula de desagüe torre enfriamiento #2", k: "status" },
    { c: 169, n: "Electroválvula de purga torres enfriamiento", k: "status" },
    { c: 170, n: "Sensor de flujo equipo automático 3DTrasar", k: "status" },
    { c: 171, n: "Nivel pimpina químico Stabrex ST70 (75 Kg)", k: "numeric", u: "%" },
    { c: 172, n: "Nivel pimpina químico Nalsperse 73550 (21 Kg)", k: "numeric", u: "%" },
    { c: 173, n: "Nivel pimpina químico Trasar 3DT465 (63 Kg)", k: "numeric", u: "%" },
    { c: 176, n: "Lectura Medidor de Agua torres enfriamiento", k: "numeric", u: "" },
    { c: 177, n: "Sistema de Filtración de Agua Torre # 1", k: "status" },
    { c: 178, n: "Sistema de Filtración de Agua Torre # 2", k: "status" },
    { c: 179, n: "Estado Chiller #1", k: "status" },
    { c: 180, n: "Estado Chiller #2", k: "status" },
    { c: 181, n: "Estado Chiller #3", k: "status" },
    { c: 182, n: "Estado Chiller #4", k: "status" },
    { c: 183, n: "Estado Chiller #5", k: "status" },
    { c: 184, n: "Estado Chiller #6", k: "status" },
    { c: 185, n: "Estado Chiller #7", k: "status" },
    { c: 186, n: "Vigilante de tensión tablero eléctrico multichiller", k: "status" },
    { c: 187, n: "Bomba Agua Fría SP #1", k: "status" },
    { c: 188, n: "Bomba Agua Fría SP #2", k: "status" },
    { c: 189, n: "Bomba Agua Fría SP #3", k: "status" },
    { c: 190, n: "Bomba Agua Fría SS #4", k: "status" },
    { c: 191, n: "Bomba Agua Fría SS #5", k: "status" },
    { c: 192, n: "Bomba Agua Fría SS #6", k: "status" },
    { c: 193, n: "Manejadora Marca Weger", k: "status" },
    { c: 194, n: "Recuperadora Marca Weger", k: "status" },
    { c: 195, n: "Manejadora AC-3301", k: "status" },
    { c: 196, n: "Recuperadora RE-3301", k: "status" },
    { c: 197, n: "Manejadora AC-3302", k: "status" },
    { c: 198, n: "Calentador de Agua # 1", k: "status" },
    { c: 199, n: "Calentador de Agua # 2", k: "status" },
    { c: 200, n: "Calentador de Agua # 3", k: "status" },
    { c: 201, n: "Calentador de Agua # 4", k: "status" },
    { c: 202, n: "Calentador de Agua # 5", k: "status" },
    { c: 203, n: "Calentador de Agua # 6", k: "status" },
    { c: 204, n: "Calentador de Agua # 7", k: "status" },
    { c: 205, n: "Calentador de Agua # 8", k: "status" },
    { c: 206, n: "Tablero de control sistema de agua caliente", k: "status" },
    { c: 209, n: "Bomba de agua caliente #1", k: "status" },
    { c: 210, n: "Bomba de agua caliente #2", k: "status" },
    { c: 211, n: "Bomba de recirculación agua caliente #1", k: "status" },
    { c: 212, n: "Bomba de recirculación agua caliente #2", k: "status" },
    { c: 213, n: "Temperatura controlador de agua caliente", k: "numeric", u: "°C" },
    { c: 214, n: "Temperatura controlador de recirculación agua caliente", k: "numeric", u: "°C" },
    { c: 215, n: "Tanque de agua caliente #1", k: "statusNumeric", u: "°C" },
    { c: 216, n: "Tanque de agua caliente #2", k: "statusNumeric", u: "°C" },
    { c: 219, n: "Nivel Tanque Agua Potable # 1", k: "numeric", u: "%", tank: true },
    { c: 220, n: "Nivel Tanque Agua Potable # 2", k: "numeric", u: "%", tank: true },
    { c: 258, n: "Nivel tanque de Cloro Tanque Agua Potable", k: "numeric", u: "%" },
    { c: 259, n: "Bomba Dosificadora de Cloro Tanque Agua Potable", k: "status" },
    { c: 260, n: "Estado Regulador PROMINENT Tanque Agua Potable", k: "status" },
    { c: 261, n: "Numero de pimpinas de cloro llenas", k: "numeric", u: "#" },
    { c: 262, n: "Porcentaje de cloro en sistema", k: "numeric", u: "%" },
    { c: 223, n: "Tablero de control bombas de Agua Potable", k: "status" },
    { c: 224, n: "Bomba Suministro de Agua Potable #1", k: "status" },
    { c: 225, n: "Bomba Suministro de Agua Potable #2", k: "status" },
    { c: 226, n: "Bomba Suministro de Agua Potable #3", k: "status" },
    { c: 228, n: "Nivel Tanque de ACPM Contra Incendio HYATT", k: "numeric", u: "%" , fuel: true },
    { c: 229, n: "Nivel Tanque de ACPM Contra Incendio RENTAL", k: "numeric", u: "%" , fuel: true },
    { c: 230, n: "Panel principal bomba contraincendio Hyatt", k: "statusNumeric", u: "psi" },
    { c: 231, n: "Tablero de control bomba Jockey Hyatt", k: "statusNumeric", u: "psi" },
    { c: 232, n: "Válvula sistema enfriamiento contraincendio Hyatt", k: "status" },
    { c: 233, n: "Tablero de control bomba contraincendio Rental", k: "status" },
    { c: 234, n: "Tablero de control bomba Jockey Rental", k: "status" },
    { c: 235, n: "Válvula sistema enfriamiento contraincendio Rental", k: "status" },
    { c: 236, n: "Calentador de Agua HN #1", k: "status" },
    { c: 237, n: "Calentador de Agua HN #2", k: "status" },
    { c: 238, n: "Calentador de Agua HN #3", k: "status" },
    { c: 239, n: "Bomba Agua Caliente HN #1", k: "status" },
    { c: 240, n: "Bomba Agua Caliente HN #2", k: "status" },
    { c: 241, n: "Bomba Recirculación Agua Caliente HN #1", k: "status" },
    { c: 242, n: "Bomba Recirculación Agua Caliente HN #2", k: "status" },
    { c: 243, n: "Temperatura controlador agua caliente HN", k: "numeric", u: "°C" },
    { c: 244, n: "Temperatura controlador recirculación agua caliente HN", k: "numeric", u: "°C" },
    { c: 245, n: "Generador de Energía #3 PERKINS 200KVA", k: "status" },
    { c: 246, n: "Nivel Tanque de ACPM Generador #3", k: "numeric", u: "%" , fuel: true },
    { c: 247, n: "Nivel Tanque Agua Contraincendios", k: "numeric", u: "%" },
    { c: 248, n: "Generador de Energía #4 CUMMINS 375KVA", k: "status" },
    { c: 249, n: "Nivel Tanque de ACPM Generador #4", k: "numeric", u: "%" , fuel: true },
    { c: 250, n: "Generador de Energía #5 PERKINS 625KVA", k: "status" },
    { c: 251, n: "Nivel Tanque de ACPM Generador #5", k: "numeric", u: "%" , fuel: true },
    { c: 252, n: "Lectura Medidor de ACPM Residencias", k: "numeric", u: "gln" , fuel: true },
    { c: 253, n: "Temperatura Transformador 1 HYATT", k: "numeric", u: "°C" },
    { c: 254, n: "Temperatura Transformador 2 Residencias", k: "numeric", u: "°C" },
    { c: 255, n: "Temperatura Transformador 3 Res. Zona Común", k: "numeric", u: "°C" },
    { c: 256, n: "Aire acondicionado central sub estación eléctrica", k: "status" },
    { c: 257, n: "Muestra de Agua Linos Piso #", k: "sample" },
  ]},
  { id: "p43", name: "Piso Mecánico 43", items: [
    { c: 258, n: "Tablero y controlador avisos lado playa", k: "status" },
    { c: 259, n: "Nivel Tanque de Agua Potable RA #1", k: "numeric", u: "%", tank: true },
    { c: 260, n: "Nivel Tanque de Agua Potable RA #2", k: "numeric", u: "%", tank: true },
    { c: 261, n: "Calentador de Agua # 1A y 2A", k: "status" },
    { c: 262, n: "Calentador de Agua # 1B y 2B", k: "status" },
    { c: 263, n: "Bomba de recirculación de AC #1", k: "status" },
    { c: 264, n: "Temperatura controlador de agua caliente #1", k: "numeric", u: "°C" },
    { c: 265, n: "Temperatura controlador de agua caliente #2", k: "numeric", u: "°C" },
    { c: 266, n: "Ventilador Presurización Escalera PE-4301", k: "status" },
    { c: 267, n: "Ventilador Presurización Escalera PE-4302", k: "status" },
    { c: 268, n: "Variador motor torre enfriamiento HN #1", k: "status" },
    { c: 269, n: "Variador motor torre enfriamiento HN #2", k: "status" },
    { c: 270, n: "BAC HN #1", k: "status" },
    { c: 271, n: "BAC HN #2", k: "status" },
    { c: 272, n: "Sistema de Filtración de Agua Torre HN", k: "status" },
    { c: 273, n: "Vigilante de tensión Tablero eléctrico HN", k: "status" },
    { c: 274, n: "Variador motor torre enfriamiento Residencias #1", k: "status" },
    { c: 275, n: "Variador motor torre enfriamiento Residencias #2", k: "status" },
    { c: 276, n: "BAC Residencias #1", k: "status" },
    { c: 277, n: "BAC Residencias #2", k: "status" },
    { c: 278, n: "Sistema de Filtración de Agua Torre Residencias", k: "status" },
    { c: 279, n: "Manejadora Pasillo Residencias", k: "status" },
    { c: 280, n: "Lectura Medidor de Agua Residencias", k: "numeric", u: "" },
    { c: 281, n: "Bomba Suministro de Agua Potable Residencias #1", k: "status" },
    { c: 282, n: "Bomba Suministro de Agua Potable Residencias #2", k: "status" },
    { c: 283, n: "Tablero de control de bombas Residencias", k: "status" },
    { c: 284, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 285, n: "Bomba Suministro de Agua Potable HN #1", k: "status" },
    { c: 286, n: "Bomba Suministro de Agua Potable HN #2", k: "status" },
    { c: 287, n: "Bomba Suministro de Agua Potable HN #3", k: "status" },
    { c: 288, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 289, n: "Tablero de control de bombas HN", k: "status" },
    { c: 290, n: "Lectura Medidor de Agua torres enfriamiento Residencias", k: "numeric", u: "" },
    { c: 291, n: "Lectura Medidor de Agua torres enfriamiento HN", k: "numeric", u: "" },
    { c: 292, n: "Nivel pimpina químico NAGCLEAN 220", k: "numeric", u: "%" },
    { c: 293, n: "Nivel pimpina químico NAGCIDE 381", k: "numeric", u: "%" },
    { c: 294, n: "Nivel pimpina químico Stabrex ST70", k: "numeric", u: "%" },
    { c: 295, n: "Nivel pimpina químico NALCO 7330", k: "numeric", u: "%" },
    { c: 296, n: "Nivel pimpina químico Trasar 3DT465", k: "numeric", u: "%" },
    { c: 297, n: "Nivel Tanque de Agua Potable Piso 44 #1", k: "numeric", u: "%", tank: true },
    { c: 298, n: "Nivel Tanque de Agua Potable Piso 44 #2", k: "numeric", u: "%", tank: true },
    { c: 299, n: "Tablero y controlador avisos lado Bahía", k: "status" },
  ]},
];

// Aplanar con id único por equipo (piso+código) — resuelve códigos duplicados (ej. "24")
FLOORS.forEach(f => f.items.forEach(it => { it.id = `${f.id}-${it.c}`; it.floorId = f.id; it.floorName = f.name; }));
const ALL_ITEMS = FLOORS.flatMap(f => f.items);
const TANK_ITEMS = ALL_ITEMS.filter(it => it.tank);
const FUEL_ITEMS = ALL_ITEMS.filter(it => it.fuel);

/* ============================================================
   DATOS: CUARTOS FRÍOS Y MÁQUINAS DE HIELO
   (según "Temperatura_Cuartos_Frios_Actualizada.xlsx", Sheet1)
   ============================================================ */
// Objeto "piso" sintético para poder reutilizar el mismo sistema de
// fuera-de-servicio (activeIssues/issueHistory) que ya usan los pisos mecánicos.
const COLD_ROOMS_FLOOR = { id: "cuartos-frios", name: "Cuartos Fríos" };

const COLD_ROOMS = [
  { c: "CC1", n: "BT Pescados — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE2", n: "MT Frutas — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE3", n: "MT Verduras — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC4", n: "BT Carnes — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE5", n: "MT Carnes — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC6", n: "BT Aves — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE7", n: "MT Aves — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE8", n: "MT Refrigerada — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE9", n: "MT Huevos — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE10", n: "MT Pasteles — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC11", n: "BT Pasteles — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CC12", n: "BT General — Piso 3A", setpoint: "-16 °C a -18 °C" },
  { c: "CE13", n: "MT General — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CE14", n: "MT Bebidas — Piso 3A", setpoint: "1 °C a 4 °C" },
  { c: "CC15", n: "MT Refrigerada — Piso 3", setpoint: "1 °C a 4 °C" },
  { c: "CE16", n: "MT Banquetes — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE17", n: "MT Preparación — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE18", n: "MT General — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE19", n: "MT Bebidas — Piso 10", setpoint: "1 °C a 4 °C" },
  { c: "CE20", n: "MT Refrigerada — Piso 11", setpoint: "1 °C a 4 °C" },
  { c: "CE21", n: "MT Flores — Piso 0", setpoint: "13 °C a 19 °C" },
  { c: "CE22", n: "MT Basuras — Piso 0", setpoint: "1 °C a 4 °C" },
  { c: "CE23", n: "MT Ritual — Piso 12", setpoint: "1 °C a 4 °C" },
].map(x => ({ ...x, id: `cf-${x.c}`, k: "numeric", u: "°C" }));

const ICE_STATUS_OPTS = ["ON", "OFF", "Fuera de servicio"];

const ICE_MACHINES_AB = [
  { c: "3A", n: "Frappé — Panadería" },
  { c: "", n: "Cubo — Panadería" },
  { c: "10", n: "Cubo — Eventos" },
  { c: "11", n: "Frappé — Cocina Kokau" },
  { c: "", n: "Cubo — Cocina Kokau" },
  { c: "", n: "Cubo — Bar Signature" },
  { c: "12", n: "Cubo — Amacagua" },
  { c: "", n: "Cubo — Ritual 12" },
  { c: "", n: "Cubo — Pool Bar" },
  { c: "14", n: "Cubo — Chiringuito" },
].map((x, i) => ({ ...x, id: `im-ab-${i + 1}`, k: "status" }));

const ICE_MACHINES_LINOS = [17, 18, 20, 22, 24, 26, 28, 29, 30, 31, 34, 36, 38]
  .map((piso, i) => ({ id: `im-li-${i + 1}`, c: String(piso), n: "Máquina de Hielo Cubos", k: "status" }));

const ALL_COLD_ROOM_ITEMS = [...COLD_ROOMS, ...ICE_MACHINES_AB, ...ICE_MACHINES_LINOS];

/** Lee un rango tipo "-16 °C a -18 °C" o "1 °C a 4 °C" y devuelve {min, max}. */
function parseSetpointRange(setpoint) {
  if (!setpoint) return null;
  const nums = (setpoint.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  if (nums.length < 2) return null;
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}
/** true si el valor registrado de un cuarto frío está fuera de su rango objetivo. */
function isColdRoomOutOfRange(item, value) {
  if (value === undefined || value === "" || value === null || isNaN(Number(value))) return false;
  const range = parseSetpointRange(item.setpoint);
  if (!range) return false;
  const v = Number(value);
  return v < range.min || v > range.max;
}
/** Cuenta cuántos cuartos fríos están fuera de rango ahora mismo, según la última lectura guardada. */
function computeColdOutOfRange(latestColdValues) {
  return COLD_ROOMS.filter(item => {
    const lv = latestColdValues[item.id];
    return lv && isColdRoomOutOfRange(item, lv.value);
  });
}
/** Detecta medidores cuyo último consumo calculado salió negativo (probable error de lectura o reinicio del medidor). */
function computeMeterAnomalies(meterHistory) {
  const anomalies = [];
  ALL_METERS.forEach(meter => {
    const hist = meterHistory[meter.id] || [];
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    const subs = meter.subs || ["value"];
    subs.forEach(sub => {
      const c = last.consumos ? last.consumos[sub] : undefined;
      if (c !== undefined && c < 0) anomalies.push({ meter, sub, consumo: c, at: last.at });
    });
  });
  return anomalies;
}

/* ============================================================
   INVENTARIO — helpers
   ============================================================ */
function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
/** URL única de una estantería (lo que va codificado en su código QR). */
function shelfUrl(shelfId) {
  return `${window.location.origin}${window.location.pathname}?shelf=${shelfId}`;
}
/** URL única de un equipo de mantenimiento (lo que va codificado en su código QR). */
function equipoUrl(equipoId) {
  return `${window.location.origin}${window.location.pathname}?equipo=${equipoId}`;
}
/** Repuestos cuya cantidad actual está en o por debajo de su mínimo configurado. */
function computeLowStock(invItems) {
  return invItems.filter(it => it.minThreshold > 0 && it.quantity <= it.minThreshold);
}
/** "Crítico" es un escalón más urgente que "bajo": la mitad o menos del mínimo (o ya en cero) —
 * esto es lo que dispara la alerta roja en la cabecera, no cualquier cosa apenas por debajo. */
function computeCriticalStock(invItems) {
  return invItems.filter(it => it.minThreshold > 0 && it.quantity <= it.minThreshold * 0.5);
}

/**
 * Mira qué tan rápido se ha estado consumiendo cada repuesto en los últimos `windowDays` días
 * (según los retiros registrados en invMovements) y proyecta en cuántos días se agotaría si sigue
 * al mismo ritmo — así avisa ANTES de que llegue al mínimo, no solo cuando ya está bajo. Un
 * repuesto que se está gastando rápido puede necesitar pedirse ya, aunque todavía le quede stock.
 */
function computeReorderForecast(invItems, invMovements, windowDays = 30, alertDays = 21) {
  const since = new Date(); since.setDate(since.getDate() - windowDays);
  const consumedByItem = {};
  (invMovements || []).forEach(m => {
    if (m.type !== "retiro") return;
    if (new Date(m.at) < since) return;
    consumedByItem[m.itemId] = (consumedByItem[m.itemId] || 0) + Math.abs(m.quantity);
  });

  const forecast = [];
  (invItems || []).forEach(it => {
    const consumed = consumedByItem[it.id];
    if (!consumed) return; // sin movimiento reciente, no hay ritmo que proyectar
    const dailyRate = consumed / windowDays;
    if (dailyRate <= 0) return;
    const daysUntilOut = it.quantity / dailyRate;
    if (daysUntilOut > alertDays) return; // todavía falta bastante al ritmo actual, no hace falta avisar
    const suggestedQty = Math.max(Math.ceil(dailyRate * windowDays) - it.quantity, Math.ceil(dailyRate * windowDays));
    forecast.push({
      ...it,
      dailyRate: Math.round(dailyRate * 100) / 100,
      consumedInWindow: consumed,
      daysUntilOut: Math.round(daysUntilOut),
      alreadyLow: it.minThreshold > 0 && it.quantity <= it.minThreshold,
      suggestedQty,
    });
  });
  return forecast.sort((a, b) => a.daysUntilOut - b.daysUntilOut);
}

/**
 * Encabezado que se manda en cada pedido a las funciones de IA del servidor (/api/generate-*,
 * /api/read-meter). Si en Vercel se configuró la variable APP_SHARED_SECRET, el servidor exige
 * que este valor coincida antes de atender el pedido — así una URL encontrada por casualidad
 * (o un bot rastreando internet) no puede gastar la cuota gratis de la IA. No es un secreto
 * perfecto (vive en el código del navegador), pero sí una barrera real contra abuso casual.
 * Configúrala en tu archivo .env como VITE_APP_SECRET (el mismo valor que pongas en Vercel como
 * APP_SHARED_SECRET) — si no la configuras, la app sigue funcionando igual, sin esta barrera.
 */
function aiRequestHeaders() {
  const secret = import.meta.env.VITE_APP_SECRET;
  return { "Content-Type": "application/json", ...(secret ? { "x-app-secret": secret } : {}) };
}

/**
 * Igual que aiRequestHeaders(), pero además manda el token de la sesión real de quien está
 * usando la app (Authorization: Bearer ...). Se usa en /api/send-report y /api/send-push, que
 * ahora exigen una cuenta real y aprobada antes de mandar nada a nombre del hotel — no solo la
 * clave compartida (que protege contra bots, pero no contra alguien sin cuenta que encuentre la URL).
 */
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { ...aiRequestHeaders(), ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}

/** Le pide al servidor que cree la fila de "perfil" (rol, aprobación) justo después de que
 *  alguien se registra con Supabase Auth — ver register-profile.js. */
async function requestCreateProfile(accessToken) {
  const resp = await fetch("/api/register-profile", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ accessToken }),
  });
  return resp.json();
}

/** Le pide al servidor que haga una acción de administrador (aprobar, roles, reset de
 *  contraseña, eliminar) — ver admin-actions.js. El servidor comprueba ahí, de verdad, que
 *  quien llama es un administrador aprobado antes de hacer nada. */
async function requestAdminAction(accessToken, action, targetUserId, extra = {}) {
  const resp = await fetch("/api/admin-actions", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ accessToken, action, targetUserId, ...extra }),
  });
  return resp.json();
}

async function requestReorderNotes({ items }) {
  const resp = await fetch("/api/generate-reorder-notes", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ items }),
  });
  return resp.json();
}

/**
 * Suma 1 al contador de uso de IA que corresponda (fotos de medidores leídas, horarios generados,
 * resúmenes semanales, notas de reorden) — solo para el panel de "Salud de la app" del admin, un
 * estimado aproximado, no el número exacto de Google. Se guarda directo en la base de datos sin
 * pasar por el estado de React, para no tener que enchufar esta función en cada componente que la
 * necesita — es más simple así, y no pasa nada si dos conteos casi al tiempo se pisan un poco.
 */
async function bumpAiUsage(field) {
  try {
    const current = (await sGet("ai-usage-stats", true)) || {};
    const next = { ...current, [field]: (current[field] || 0) + 1, lastUpdated: nowIso() };
    await sSet("ai-usage-stats", next, true);
  } catch { /* es solo una estadística informativa, no pasa nada si falla */ }
}

/** Revisa una ronda antes de guardar: qué ítems faltan por llenar, y cuáles están dañados sin comentario. */
function validateRoundEntries(items, entries) {
  const missing = [];
  const missingComment = [];
  items.forEach(item => {
    const e = entries[item.id];
    const hasValue = e && (e.status || (e.value !== undefined && e.value !== "") || e.damaged || e.ph || e.cloro || e.operador);
    if (!hasValue) missing.push({ id: item.id, n: item.n });
    if (e?.damaged && !e?.stillSame && !(e.observation || "").trim()) missingComment.push({ id: item.id, n: item.n });
  });
  return { missing, missingComment, ok: missing.length === 0 && missingComment.length === 0 };
}

/** Lleva la pantalla directo al equipo (usado al hacer clic en la lista de pendientes) y lo resalta un momento. */
/** Comprime una foto y la convierte a base64 (sin el prefijo "data:...") — lista para mandar a la
 *  función que lee el número del medidor. Más liviana que la de subir a Supabase (no hace falta
 *  tanta resolución solo para leer un número).
 *
 *  IMPORTANTE: usa createImageBitmap con imageOrientation:"from-image" en vez del Image() normal,
 *  porque muchas fotos de celular tomadas en vertical guardan la imagen "acostada" por dentro,
 *  con una marca (EXIF) que dice "gírala al mostrarla". El Image()+canvas normal ignora esa marca
 *  y manda la foto acostada tal cual, lo que hacía que la lectura saliera mal. createImageBitmap
 *  sí respeta esa marca y entrega la foto ya derecha, como se ve a simple vista. */
async function imageFileToBase64ForReading(file, maxWidth = 900, quality = 0.75) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file); // navegador viejo sin soporte para imageOrientation
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1]; // solo el base64, sin el "data:image/jpeg;base64,"
}

/** Le pide a la función serverless que lea el número que muestra un medidor en la foto. */
async function readMeterFromPhoto(file, previousReading, meterName) {
  const imageBase64 = await imageFileToBase64ForReading(file);
  const resp = await fetch("/api/read-meter", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ imageBase64, mediaType: "image/jpeg", previousReading, meterName }),
  });
  return resp.json();
}

/**
 * Le pide a la función serverless que arme un borrador de horario mensual con IA.
 * Solo llena los días vacíos (los que ya tienen algo — vacaciones, turnos puestos a mano, etc.
 * — se le mandan como "esto ya está, no lo toques"). Nunca guarda nada por su cuenta: la app
 * recibe el borrador, lo muestra para revisar/editar, y solo se guarda de verdad cuando el
 * usuario confirma.
 */
async function requestAiScheduleDraft({ monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget, sundaysAlreadyWorked }) {
  const resp = await fetch("/api/generate-schedule", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ monthLabel, days, employees, existingEntries, referenceEntries, rulesText, weeklyHoursTarget, sundaysAlreadyWorked }),
  });
  return resp.json();
}

/** Una celda de hora de Excel se guarda como una fracción del día (0.354166... = 8:30). Se pasa
 *  a decimal (8.5) multiplicando por 24 — más simple y sin líos de zona horaria que usar fechas. */
function excelSerialToDecimalHour(serial) {
  return Math.round(serial * 24 * 100) / 100;
}

/**
 * Lee un archivo Excel de horario EN EL MISMO FORMATO que ya se ha usado siempre (una fila
 * "Hora" con los números de día por columna, una fila de nombres de día de la semana, y debajo
 * una fila por empleado con hora de entrada/salida por día, o texto como "Vacaciones"). Puede
 * tener uno o dos bloques de quincena en la misma hoja — los detecta solos, no hace falta que
 * sean siempre dos. year/month1based dicen a qué mes pertenecen los números de día del archivo
 * (se usa el mes que esté seleccionado en pantalla al momento de importar).
 */
function parseHorarioExcelWorkbook(workbook, year, month1based) {
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  if (!ws || !ws["!ref"]) return { entries: [], names: [], warnings: ["El archivo no tiene datos en la primera hoja."] };
  const range = XLSX.utils.decode_range(ws["!ref"]);

  const codeMap = {
    "vacaciones": "VAC", "libre": "LIBRE", "incapacidad": "INC",
    "alterno": "ALT", "alterno / cambio": "ALT",
    "lic. paternidad": "LIC_PAT", "licencia de paternidad": "LIC_PAT", "lic paternidad": "LIC_PAT",
  };

  const cellAt = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell ? cell.v : null;
  };

  // Filas de encabezado: cualquier fila donde la columna B diga "Hora" (una por cada quincena/bloque)
  const headerRows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const v = cellAt(r, 1);
    if (typeof v === "string" && v.trim().toLowerCase() === "hora") headerRows.push(r);
  }

  const entries = [];
  const namesSet = new Set();
  const warnings = [];

  headerRows.forEach(headerRow => {
    const dayCols = []; // [{entradaCol, salidaCol, day}]
    for (let c = 2; c <= range.e.c; c++) {
      const v = cellAt(headerRow, c);
      if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 31) {
        dayCols.push({ entradaCol: c, salidaCol: c + 1, day: v });
      }
    }
    if (dayCols.length === 0) return;

    let r = headerRow + 2; // se salta la fila de encabezado y la de nombres de día (LUNES, MARTES…)
    while (r <= range.e.r) {
      const rawName = cellAt(r, 1);
      if (rawName == null || typeof rawName !== "string" || !rawName.trim()) break;
      const lower = rawName.trim().toLowerCase();
      if (lower === "fecha" || lower === "hora") break;
      const name = rawName.trim();
      namesSet.add(name);

      dayCols.forEach(({ entradaCol, salidaCol, day }) => {
        const eVal = cellAt(r, entradaCol);
        const sVal = cellAt(r, salidaCol);
        if (eVal == null && sVal == null) return;
        const dateIso = `${year}-${String(month1based).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (typeof eVal === "string") {
          const code = codeMap[eVal.trim().toLowerCase()];
          if (!code) { warnings.push(`${name}, día ${day}: texto "${eVal}" no reconocido — ese día se dejó vacío, agrégalo a mano.`); return; }
          entries.push({ name, date: dateIso, code });
        } else if (typeof eVal === "number") {
          const entrada = excelSerialToDecimalHour(eVal);
          const salida = typeof sVal === "number" ? excelSerialToDecimalHour(sVal) : null;
          if (salida == null) { warnings.push(`${name}, día ${day}: tiene hora de entrada pero no de salida — ese día se dejó vacío, agrégalo a mano.`); return; }
          entries.push({ name, date: dateIso, entrada, salida });
        }
      });
      r++;
    }
  });

  if (headerRows.length === 0) warnings.unshift("No se encontró ninguna fila \"Hora\" — ¿es el mismo formato de siempre?");
  return { entries, names: Array.from(namesSet), warnings };
}

function scrollToItem(itemId) {
  const el = document.getElementById(`item-row-${itemId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.transition = "box-shadow 0.2s ease";
  el.style.boxShadow = `0 0 0 3px ${C.amber}`;
  setTimeout(() => { el.style.boxShadow = ""; }, 1800);
}

/** Aviso de "faltan estos equipos", con cada nombre clickeable para saltar directo a esa fila. */
function PendingItemsAlert({ msg, onClose }) {
  if (!msg) return null;
  const jumpTo = (id) => {
    onClose();
    setTimeout(() => scrollToItem(id), 60); // deja que la ventana se cierre antes de saltar, para que se vea bien
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="pm-animate-in rounded-xl max-w-sm w-full p-5 max-h-[80vh] overflow-y-auto" style={{ background: C.panel }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} color={C.red} />
          <h3 className="text-base font-semibold" style={{ color: C.ink }}>Antes de continuar</h3>
        </div>
        <p className="text-sm mb-3" style={{ color: C.inkSoft }}>{msg.prefix}</p>
        <div className="flex flex-col gap-1.5 mb-4">
          {msg.items.map(it => (
            <button key={it.id} onClick={() => jumpTo(it.id)}
              className="text-left text-sm px-3 py-2 rounded-md font-semibold"
              style={{ background: C.redSoft, color: C.red }}>
              {it.n} →
            </button>
          ))}
        </div>
        {msg.suffix && <p className="text-xs mb-4" style={{ color: C.gray }}>{msg.suffix}</p>}
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

/**
 * Revisa, para HOY, si cada turno ya cumplió con las rondas que le corresponden según lo estipulado:
 * Mañana (termina 14:00) = Lecturas + Ronda + Cuartos Fríos. Tarde (termina 22:00) = Ronda.
 * Noche (termina 6:00 del día siguiente) = Ronda + Gimnasio. Solo avisa después de que el turno ya terminó.
 */
function computeShiftCompletionAlerts(now, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex) {
  const todayD = todayStr();
  const yesterdayD = (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })();
  const hour = now.getHours() + now.getMinutes() / 60;
  const hasRound = (index, date, shiftLabel) => (index || []).some(r => r.date === date && r.shift === shiftLabel);

  const alerts = [];
  if (hour >= 14) {
    const missing = [];
    if (!hasRound(meterRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Lecturas de Medidores");
    if (!hasRound(roundsIndex, todayD, "06:00 – 14:00")) missing.push("Ronda de revisión");
    if (!hasRound(coldRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Cuartos Fríos");
    if (!hasRound(calderaRoundsIndex, todayD, "06:00 – 14:00")) missing.push("Check List Caldera");
    if (!(lavanderiaRoundsIndex || []).some(r => r.date === todayD)) missing.push("Equipos de Lavandería");
    if (missing.length) alerts.push({ turno: "Turno mañana (6:00-14:00) de hoy", missing });
  }
  if (hour >= 22) {
    const missing = [];
    if (!hasRound(roundsIndex, todayD, "14:00 – 22:00")) missing.push("Ronda de revisión");
    if (!hasRound(calderaRoundsIndex, todayD, "14:00 – 22:00")) missing.push("Check List Caldera");
    if (missing.length) alerts.push({ turno: "Turno tarde (14:00-22:00) de hoy", missing });
  }
  if (hour >= 6) {
    const missing = [];
    const nightDone = (idx) => hasRound(idx, todayD, "22:00 – 06:00") || hasRound(idx, yesterdayD, "22:00 – 06:00");
    if (!nightDone(roundsIndex)) missing.push("Ronda de revisión");
    if (!nightDone(gymRoundsIndex)) missing.push("Equipos de Gimnasio");
    if (!nightDone(calderaRoundsIndex)) missing.push("Check List Caldera");
    if (missing.length) alerts.push({ turno: "Turno noche (22:00-6:00) más reciente", missing });
  }
  return alerts;
}

/**
 * Equipos programados para ESTE mes en el Cronograma Anual que siguen pendientes o atrasados,
 * a partir de que quedan 10 días o menos del mes — para avisar ANTES de que se venza, no solo
 * después. (No calcula por día exacto porque el cronograma solo maneja mes, no día puntual.)
 */
function computeUpcomingMaintenance(now, equipos, mttoCronograma) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  if (daysLeft > 10) return { daysLeft, items: [] };

  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const currentMonth = now.getMonth() + 1;
  const items = [];
  (mttoCronograma || []).forEach(c => {
    if (c.mesNum !== currentMonth) return;
    if (c.estado !== "pendiente" && c.estado !== "atrasado") return;
    const eq = activeEquipos.find(e => e.id === c.equipoId);
    if (!eq) return;
    items.push({ equipo: eq.nombre, sistema: eq.sistema, estado: c.estado });
  });
  return { daysLeft, items };
}

/* ============================================================
   PANEL EJECUTIVO — helpers
   ============================================================ */
/** % de equipos funcionando vs. fuera de servicio, por sistema, según el último registro de cada uno. */
function computeUptimeBySystem(equipos, mttoLog) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const bySistema = {};
  activeEquipos.forEach(eq => {
    if (!bySistema[eq.sistema]) bySistema[eq.sistema] = { total: 0, fuera: 0 };
    bySistema[eq.sistema].total++;
    if (currentEquipoStatus(eq.id, mttoLog).outOfService) bySistema[eq.sistema].fuera++;
  });
  return Object.entries(bySistema)
    .map(([sistema, v]) => ({ sistema, total: v.total, fuera: v.fuera, pct: v.total ? Math.round(((v.total - v.fuera) / v.total) * 100) : 100 }))
    .sort((a, b) => a.pct - b.pct);
}

/** Compara cuántas rondas se guardaron este mes contra cuántas deberían haberse hecho, por tipo. */
function computeComplianceForMonth(targetDate, roundsIndex, coldRoundsIndex, meterRoundsIndex) {
  const month = targetDate.getMonth() + 1, year = targetDate.getFullYear();
  const now = new Date();
  const isCurrentMonth = now.getMonth() === targetDate.getMonth() && now.getFullYear() === targetDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const inMonth = (dateStr) => {
    const p = (dateStr || "").split("/");
    return p.length === 3 && Number(p[1]) === month && Number(p[2]) === year;
  };
  const mk = (index, perDay) => {
    const actual = (index || []).filter(r => inMonth(r.date)).length;
    const expected = daysElapsed * perDay;
    return { actual, expected, pct: expected ? Math.min(100, Math.round((actual / expected) * 100)) : 100 };
  };
  return {
    ronda: mk(roundsIndex, 3),
    cuartosFrios: mk(coldRoundsIndex, 1),
    medidores: mk(meterRoundsIndex, 1),
  };
}

/** Costo acumulado de mantenimiento, total y por sistema. Si se pasa targetDate, filtra solo a ese mes. */
function computeMaintenanceCost(equipos, mttoLog, targetDate) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const bySistema = {};
  let total = 0;
  const month = targetDate ? targetDate.getMonth() + 1 : null;
  const year = targetDate ? targetDate.getFullYear() : null;
  (mttoLog || []).forEach(r => {
    const costo = Number(r.costo) || 0;
    if (!costo) return;
    if (targetDate) {
      const d = new Date(r.fecha);
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return;
    }
    total += costo;
    const eq = activeEquipos.find(e => e.id === r.equipoId);
    const sistema = eq?.sistema || "Otros";
    bySistema[sistema] = (bySistema[sistema] || 0) + costo;
  });
  return { total, bySistema: Object.entries(bySistema).sort((a, b) => b[1] - a[1]) };
}

/* ============================================================
   NOTIFICACIONES PUSH — helpers
   ============================================================ */
// Llave pública VAPID — es segura de mostrar en el navegador, solo la privada es secreta (esa vive
// únicamente en Vercel, dentro de api/send-push.js).
const VAPID_PUBLIC_KEY = "BEe7p1TzsxOCqH4RTh88jgs0fDzryslTfZ9I5IhvkVF4LO_p9MnlmO22NqeIJSMV_xwY_Bnoy9m4OGl8p_-6yHU";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Pide permiso y suscribe este dispositivo a notificaciones push. Devuelve la suscripción o null. */
async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing.toJSON();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return sub.toJSON();
}

/** Manda una notificación push real a la lista de suscripciones guardadas (los administradores que la activaron). */
async function sendPushToSubscriptions(subscriptions, title, body, url) {
  if (!subscriptions || subscriptions.length === 0) return;
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ subscriptions, title, body, url }),
    });
  } catch (e) {
    console.warn("No se pudo enviar la notificación push:", e?.message);
  }
}

/* ============================================================
   MANTENIMIENTO — helpers
   ============================================================ */
/** Último registro de mantenimiento de un equipo (el más reciente por fecha). */
function lastMaintenanceOf(equipoId, mttoLog) {
  const list = mttoLog.filter(m => m.equipoId === equipoId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return list[0] || null;
}
/** Estado actual de un equipo: fuera de servicio (y desde cuándo) según su último registro. */
function currentEquipoStatus(equipoId, mttoLog) {
  const last = lastMaintenanceOf(equipoId, mttoLog);
  if (!last) return { outOfService: false, since: null };
  return { outOfService: last.estado === "fuera-de-servicio", since: last.estado === "fuera-de-servicio" ? last.fecha : null };
}
/** Resumen por equipo: cuántos mantenimientos, cuántos correctivos (fallas), costo acumulado, estado actual. */
function computeEquipoStats(equipo, mttoLog) {
  const records = mttoLog.filter(m => m.equipoId === equipo.id);
  const correctivos = records.filter(r => r.tipo === "correctivo");
  const costoTotal = records.reduce((sum, r) => sum + (Number(r.costo) || 0), 0);
  const status = currentEquipoStatus(equipo.id, mttoLog);
  return { total: records.length, correctivos: correctivos.length, costoTotal, ...status };
}

/**
 * Hoja de vida — parte 1: detecta solo, buscando palabras clave en la descripción de cada
 * mantenimiento, qué piezas se le han cambiado a un equipo (correa, rodamiento, variador, etc.)
 * — para que quede como referencia rápida sin tener que leer todo el historial completo.
 */
const PIEZA_KEYWORDS = [
  { match: /correa/i, label: "Correa" },
  { match: /rodamiento/i, label: "Rodamiento" },
  { match: /variador/i, label: "Variador" },
  { match: /motor/i, label: "Motor" },
  { match: /bomba/i, label: "Bomba" },
  { match: /filtro/i, label: "Filtro" },
  { match: /banda/i, label: "Banda" },
  { match: /cojinete/i, label: "Cojinete" },
  { match: /sello|empaque/i, label: "Sello / empaque" },
  { match: /compresor/i, label: "Compresor" },
  { match: /ventilador|turbina/i, label: "Ventilador / turbina" },
  { match: /contactor|breaker|relé|rele\b/i, label: "Contactor / breaker / relé" },
  { match: /sensor/i, label: "Sensor" },
  { match: /manguera|tubería|tuberia/i, label: "Manguera / tubería" },
  { match: /v[aá]lvula/i, label: "Válvula" },
];
function detectPartsChanged(records) {
  const found = [];
  records.forEach(r => {
    PIEZA_KEYWORDS.forEach(({ match, label }) => {
      if (match.test(r.descripcion || "")) found.push({ parte: label, fecha: r.fecha, tipo: r.tipo, descripcion: r.descripcion, tecnico: r.tecnico });
    });
  });
  return found.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}





/* ============================================================
   DATOS: LAVANDERÍA, GIMNASIO Y CALDERA
   (según "formato_revision_de_equipos_de_lavanderia.xlsx",
   "2_check_list_de_equipos_de_gimnasio.xlsx" y "Check_list_Caldera.xlsx")
   ============================================================ */
const LAVANDERIA_ITEMS = [
  { id: "lv1", c: 1, n: "Lavadora Fagor 70kg #1", k: "statusNumeric", u: "A" },
  { id: "lv2", c: 2, n: "Lavadora Fagor 70kg #2", k: "statusNumeric", u: "A" },
  { id: "lv3", c: 3, n: "Lavadora Fagor 40kg #3", k: "statusNumeric", u: "A" },
  { id: "lv4", c: 4, n: "Lavadora Milnor 27kg #4", k: "statusNumeric", u: "A" },
  { id: "lv5", c: 5, n: "Lavadora Milnor 27kg #5", k: "statusNumeric", u: "A" },
  { id: "lv6", c: 6, n: "Lavadora Fagor 18kg #6", k: "statusNumeric", u: "A" },
  { id: "lv7", c: 7, n: "Secadora Fagor 45kg #1", k: "statusNumeric", u: "A" },
  { id: "lv8", c: 8, n: "Secadora Fagor 35kg #2", k: "statusNumeric", u: "A" },
  { id: "lv9", c: 9, n: "Secadora Fagor 60kg #3", k: "statusNumeric", u: "A" },
  { id: "lv10", c: 10, n: "Secadora Milnor 60kg #4", k: "statusNumeric", u: "A" },
  { id: "lv11", c: 11, n: "Secadora Milnor 35kg #6", k: "statusNumeric", u: "A" },
  { id: "lv12", c: 12, n: "Lavaseco", k: "status" },
  { id: "lv13", c: 13, n: "Compresor de Aire", k: "status" },
  { id: "lv14", c: 14, n: "Rodillo", k: "status" },
  { id: "lv15", c: 15, n: "Prensa + Planchado de Acabado", k: "status" },
  { id: "lv16", c: 16, n: "Prensa de Cuello", k: "status" },
  { id: "lv17", c: 17, n: "Prensa de Planchado", k: "status" },
  { id: "lv18", c: 18, n: "Maniquí de Planchado", k: "status" },
  { id: "lv19", c: 19, n: "Mesa de Repaso #1", k: "status" },
  { id: "lv20", c: 20, n: "Mesa de Repaso #2", k: "status" },
  { id: "lv21", c: 21, n: "Caldera", k: "status" },
  { id: "lv22", c: 22, n: "Suavizador", k: "status" },
  { id: "lv23", c: 23, n: "Unidad de Extracción 401", k: "status" },
  { id: "lv24", c: 24, n: "Drenajes de Pisos", k: "status" },
  { id: "lv25", c: 25, n: "Luces", k: "status" },
];
const LAVANDERIA_STATUS_OPTS = ["OK", "Fallo"];

const GYM_CARDIO_ITEMS = [
  { id: "gy1", c: 1, n: "Trotador Precor TRM600 #1", sku: "AF37G1724D001", k: "status" },
  { id: "gy2", c: 2, n: "Trotador Precor TRM600 #2", sku: "AF37G1824D021", k: "status" },
  { id: "gy3", c: 3, n: "Trotador Precor TRM600 #3", sku: "AF37G1824D028", k: "status" },
  { id: "gy4", c: 4, n: "Trotador Precor TRM600 #4", sku: "AF37G1824D020", k: "status" },
  { id: "gy5", c: 5, n: "Trotador Precor TRM600 #5", sku: "AF37G1824D029", k: "status" },
  { id: "gy6", c: 6, n: "Elíptico Precor EFX600 #1", sku: "A485F14240075", k: "status" },
  { id: "gy7", c: 7, n: "Elíptico Precor EFX600 #2", sku: "A485F27240035", k: "status" },
  { id: "gy8", c: 8, n: "Elíptico Precor EFX600 #3", sku: "A485F27240032", k: "status" },
  { id: "gy9", c: 9, n: "Remo ARW865", sku: "F2104BL0680", k: "status" },
  { id: "gy10", c: 10, n: "Air Bike ABK865 #1", sku: "F2212BJ0303", k: "status" },
  { id: "gy11", c: 11, n: "Air Bike ABK865 #2", sku: "E2212BJ0324", k: "status" },
];
const GYM_FUERZA_ITEMS = [
  { id: "gy12", c: 12, n: "Pull Down", sku: "BDSC09160006", k: "status" },
  { id: "gy13", c: 13, n: "Multi Press", sku: "BDS1A27160014", k: "status" },
  { id: "gy14", c: 14, n: "Chest Press", sku: "BDS6H07150010", k: "status" },
  { id: "gy15", c: 15, n: "Prone Leg Curl", sku: "BA74D03160001", k: "status" },
  { id: "gy16", c: 16, n: "Vertical", sku: "BBMF26150023", k: "status" },
  { id: "gy17", c: 17, n: "Leg Press", sku: "BDS1A41360008", k: "status" },
  { id: "gy18", c: 18, n: "Angled Leg Press", sku: "B136I16220025", k: "status" },
  { id: "gy19", c: 19, n: "FTS Glide", sku: "ANCDA29160030", k: "status" },
  { id: "gy20", c: 20, n: "Smith Machine", k: "status" },
  { id: "gy21", c: 21, n: "Banco VBR 6117 #1", sku: "B12ML30227064", k: "status" },
  { id: "gy22", c: 22, n: "Banco VBR 6117 #2", sku: "B12ML30227060", k: "status" },
  { id: "gy23", c: 23, n: "Banco Lumbar", k: "status" },
  { id: "gy24", c: 24, n: "Spinning Studio Cycle II #1", k: "status" },
  { id: "gy25", c: 25, n: "Spinning Studio Cycle II #2", k: "status" },
];
const GYM_AREA_ITEMS = [
  { id: "gy26", c: 26, n: "TV", k: "status" },
  { id: "gy27", c: 27, n: "Dispensador de agua", k: "status" },
  { id: "gy28", c: 28, n: "Luces", k: "status" },
  { id: "gy29", c: 29, n: "Aire acondicionado", k: "status" },
  { id: "gy30", c: 30, n: "Teléfono", k: "status" },
  { id: "gy31", c: 31, n: "Sonido ambiente", k: "status" },
];
const GYM_ALL_ITEMS = [...GYM_CARDIO_ITEMS, ...GYM_FUERZA_ITEMS, ...GYM_AREA_ITEMS];
const GYM_STATUS_OPTS = ["OK", "No OK"];
const LAVANDERIA_FLOOR = { id: "lavanderia", name: "Lavandería — Piso 4" };
const GYM_FLOOR = { id: "gimnasio", name: "Gimnasio — Piso 14" };

/* ============================================================
   DATOS: TAREAS / PENDIENTES
   ============================================================ */
const TASK_STATES = [
  { code: "asignada", label: "Asignada" },
  { code: "en-proceso", label: "En proceso" },
  { code: "pausada", label: "Pausada" },
  { code: "finalizada", label: "Finalizada" },
];
const TASK_STATE_COLORS = {
  "asignada": { bg: "#eef1f4", fg: "#5c6b7a" },
  "en-proceso": { bg: "#e3f0ff", fg: "#1a4f8a" },
  "pausada": { bg: "#fff3d6", fg: "#8a5a00" },
  "finalizada": { bg: "#dff5e3", fg: "#1c7a34" },
  // compatibilidad con tareas creadas antes de este cambio (otros nombres de estado), para que
  // no se rompan ni queden "huérfanas" — ver normalizeTaskState() más abajo.
  "pendiente": { bg: "#eef1f4", fg: "#5c6b7a" },
  "en-progreso": { bg: "#e3f0ff", fg: "#1a4f8a" },
  "espera-repuesto": { bg: "#fff3d6", fg: "#8a5a00" },
  "hecho": { bg: "#dff5e3", fg: "#1c7a34" },
};
/** Tareas creadas antes de este cambio usaban otros nombres de estado — esto los traduce a los
 * 4 nuevos para que las cuentas y los filtros los sigan reconociendo sin romperse. */
const TASK_STATE_MIGRATE = { "pendiente": "asignada", "en-progreso": "en-proceso", "espera-repuesto": "pausada", "hecho": "finalizada" };
function normalizeTaskState(estado) { return TASK_STATE_MIGRATE[estado] || estado || "asignada"; }

const TASK_PRIORITIES = [
  { code: "alta", label: "Alta" },
  { code: "media", label: "Media" },
  { code: "baja", label: "Baja" },
];
const TASK_PRIORITY_COLORS = { alta: "D93025", media: "D97706", baja: "5C6B7A" };
const TASK_RECURRENCES = [
  { code: "", label: "No se repite" },
  { code: "semanal", label: "Cada semana" },
  { code: "mensual", label: "Cada mes" },
];
/** "Clave" del periodo actual (semana o mes) — sirve para saber si ya existe una tarea de este ciclo o hay que crear una nueva. */
function periodKeyFor(date, recurrence) {
  if (recurrence === "semanal") {
    const start = startOfWeek(date);
    return `w-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  }
  if (recurrence === "mensual") return `m-${date.getFullYear()}-${date.getMonth() + 1}`;
  return null;
}

/* ============================================================
   DATOS: LECTURAS DE MEDIDORES
   (según "consumo_de_servicios_publicos_hyatt_2026.xlsx": hojas
   SP [mes], Resc [mes] y Agua torres [mes] — mismos medidores cada mes)
   ============================================================ */
const METER_GROUPS = [
  {
    id: "sp", title: "Servicios Públicos Generales",
    meters: [
      { c: "m01", n: "Energía Piso 16 — Medidor Principal (NIC 7784481)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m02", n: "Energía Piso 16 — Medidor Respaldo (NIC 7784482)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m03", n: "Agua Hotel — Póliza 256023 (Medidor 596202)", subs: null, u: "m³" },
      { c: "m04", n: "Gas Hotel (Medidor 4404155)", subs: null, u: "m³" },
      { c: "m05", n: "Gas Residencias (Medidor 16730521218 / 4673538)", subs: null, u: "m³" },
      { c: "m06", n: "Energía Piso 33 — Hyatt 150KVA Electricaribe (NIC 7942254)", subs: ["Activa Pi", "Activa FP", "Reactiva"], u: "kWh" },
      { c: "m07", n: "Energía Piso 43 (C P C)", subs: ["ALTA", "BAJA"], u: "kWh" },
      { c: "m08", n: "Lectura Medidor Piso Cero", subs: null, u: "" },
      { c: "m09", n: "Agua Piso 43 Residencias", subs: null, u: "m³" },
      { c: "m10", n: "Energía Piso 43 — Ascensor 21", subs: null, u: "kWh" },
      { c: "m11", n: "Energía Piso 43 — Ascensor 22", subs: null, u: "kWh" },
      { c: "m12", n: "Energía Piso 43 — Ascensor 23", subs: null, u: "kWh" },
      { c: "m13", n: "QMC — Telefónica 132220070 (Piso 44)", subs: null, u: "" },
      { c: "m14", n: "QMC — Telefónica AS1440 (Piso 44)", subs: null, u: "" },
      { c: "m15", n: "QMC — Claro 24728084 (Piso 44)", subs: null, u: "" },
      { c: "m16", n: "QMC — Claro 24728083 (Piso 9)", subs: null, u: "" },
      { c: "m17", n: "QMC — Telefónica 888190 (Piso 9)", subs: null, u: "" },
    ],
  },
  {
    id: "resc", title: "Zonas Comunes / Residencias",
    meters: [
      { c: "r01", n: "Medidor Distrito Frío — Chiller 33", subs: null, u: "" },
      { c: "r02", n: "Energía Habitaciones y Agua Caliente 34 (180-181)", subs: ["Activa", "Activa Pico"], u: "kWh" },
      { c: "r03", n: "Medidor Zonas Comunes Piso 34-35-36", subs: null, u: "" },
      { c: "r04", n: "Medidor Zonas Comunes Piso 37-38", subs: null, u: "" },
      { c: "r05", n: "Medidor Sistema Hidrosanitario Piso 43", subs: null, u: "" },
      { c: "r06", n: "Medidor Torres de Enfriamiento Piso 43", subs: null, u: "" },
      { c: "r07", n: "Energía Piso 33 — Residencias (NIC 7942250)", subs: ["Activa AT", "Activa FA", "Reactiva"], u: "kWh" },
    ],
  },
  {
    id: "torres", title: "Agua Torres de Enfriamiento",
    meters: [
      { c: "t01", n: "Agua Torres", subs: null, u: "m³" },
      { c: "t02", n: "Agua Torres Residencias", subs: null, u: "m³" },
      { c: "t03", n: "Agua Torres Enfriamiento HN", subs: null, u: "m³" },
    ],
  },
  {
    // Contadores de energía por apartamento — "Contadores_Energia_Residencias_2026.xlsx"
    id: "hab", title: "Contadores de Energía — Habitaciones / Residencias",
    meters: [
      ["3901", "7943031"], ["3902", "7943051"], ["3903", "7943057"], ["3904", "7943098"],
      ["3905", "7943104"], ["3906", "7943106"], ["3907", "7943108"], ["3908", "7943111"],
      ["4001", "7943113"], ["4002", "7943114"], ["4003", "7943115"], ["4004", "7943116"],
      ["4005", "7943120"], ["4006", "7943122"], ["4007", "7943125"], ["4008", "7943127"],
      ["4101", "7943131"], ["4102", "7943135"], ["4103", "7943138"], ["4104", "7943161"],
      ["4105", "7943166"], ["4106", "7943171"], ["4107", "7943185"], ["4108", "7943221"],
      ["4109", "7943224"], ["4201", "7943226"], ["4202", "7943227"], ["4203", "7943228"],
      ["4204", "7943229"], ["4205", "7943231"], ["4206", "7943232"], ["4208", "7943236"],
      ["4209", "7943240"],
    ].map(([apto, serial]) => ({ c: apto, n: `Apartamento ${apto} (Medidor ${serial})`, subs: null, u: "kWh" })),
  },
];
METER_GROUPS.forEach(g => g.meters.forEach(m => { m.id = `mt-${g.id}-${m.c}`; }));
const ALL_METERS = METER_GROUPS.flatMap(g => g.meters);

const SHIFTS = ["06:00 – 14:00", "14:00 – 22:00", "22:00 – 06:00"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * De todo el equipo (Horario Mensual), ¿quién trabaja el turno elegido, en la fecha elegida?
 * Se fija en la hora de entrada guardada en el horario ese día, y la compara contra la hora de
 * inicio del turno (con 2 horas de margen, por si el turno real no arranca exacto a la hora
 * "oficial" del bloque). No cuenta a quien tenga ese día un código especial (VAC/LIBRE/INC/etc.)
 * ni a quien no tenga nada guardado ese día.
 */
function employeesOnShift(employees, scheduleEntries, dateIso, shiftLabel) {
  const startHour = parseFloat(shiftLabel.split("–")[0].trim().split(":")[0]);
  return (employees || []).filter(emp => {
    if (emp.active === false) return false;
    const entry = scheduleEntries[`${emp.id}::${dateIso}`];
    if (!entry || entry.code || entry.entrada == null) return false;
    const diff = Math.abs(entry.entrada - startHour);
    return diff < 2 || diff > 22; // el margen "envuelve" la medianoche para el turno 22:00–06:00
  });
}

function localDateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Quién está trabajando AHORA MISMO, con la hora real de entrada/salida de cada persona (no
 * turnos fijos de 3 bloques) — así alguien que entra a las 9:00 también cuenta, y no solo quien
 * calza con 06:00/14:00/22:00. Revisa tanto el turno de hoy como el de ayer, por si un turno
 * nocturno que empezó ayer todavía sigue activo pasada la medianoche.
 */
function employeesWorkingNow(employees, scheduleEntries, now = new Date()) {
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const todayIso = localDateIso(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = localDateIso(yesterday);

  return (employees || []).filter(emp => {
    if (emp.active === false) return false;
    const todayEntry = scheduleEntries[`${emp.id}::${todayIso}`];
    const yestEntry = scheduleEntries[`${emp.id}::${yesterdayIso}`];

    if (todayEntry && !todayEntry.code && todayEntry.entrada != null && todayEntry.salida != null) {
      const { entrada, salida } = todayEntry;
      if (salida > entrada) {
        if (currentHour >= entrada && currentHour < salida) return true; // turno normal, mismo día
      } else if (currentHour >= entrada) {
        return true; // turno que cruza medianoche, empezó hoy y sigue activo
      }
    }
    if (yestEntry && !yestEntry.code && yestEntry.entrada != null && yestEntry.salida != null) {
      const { entrada, salida } = yestEntry;
      if (salida < entrada && currentHour < salida) return true; // turno de ayer, todavía no termina
    }
    return false;
  });
}

/* ============================================================
   HORARIOS — festivos Colombia 2026 y reglas de turnistas
   ============================================================ */
const COLOMBIA_HOLIDAYS_2026 = [
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-13", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12",
  "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
];

const SPECIAL_CODES = [
  { code: "VAC", label: "Vacaciones" },
  { code: "LIBRE", label: "Libre" },
  { code: "INC", label: "Incapacidad" },
  { code: "ALT", label: "Alterno / cambio" },
  { code: "LIC_PAT", label: "Licencia de paternidad" },
  { code: "COMP", label: "Compensatorio (día ganado por horas de reducción)" },
];
const SPECIAL_CODE_COLORS = {
  VAC: { bg: "#dff5e3", fg: "#1c7a34" },
  LIBRE: { bg: "#eef1f4", fg: "#5c6b7a" },
  INC: { bg: "#ffe3ea", fg: "#a31245" },
  ALT: { bg: "#fff3d6", fg: "#8a5a00" },
  LIC_PAT: { bg: "#e0ecff", fg: "#1e4fa3" },
  COMP: { bg: "#e8e0fb", fg: "#6b21a8" },
};
/**
 * Horas que se guardan por cada día trabajado (para quien tiene turnos de 8h en vez de las 7h
 * "reducidas" que trabaja la mayoría) y cuántas horas juntas hacen un día de descanso completo.
 * HOURS_FOR_FULL_COMP_DAY = 8 porque un día de descanso "vale" un turno completo de 8h.
 */
const HOURS_FOR_FULL_COMP_DAY = 8;

/**
 * Cuántas horas de reducción tiene acumuladas un empleado HASTA HOY, mirando TODO su historial
 * real en scheduleEntries (no solo el mes en pantalla): suma 1 hora por cada día trabajado
 * (según employee.reductionHoursPerDay) y resta 8 horas por cada día "COMP" que ya se le haya
 * dado (para no volver a contar un descanso que ya se cobró). Es informativo — nunca asigna nada
 * solo, la app únicamente lo muestra para que el admin decida cuándo darle el día.
 */
function computeCompBalance(employee, scheduleEntries) {
  const rate = Number(employee.reductionHoursPerDay) || 0;
  if (!rate) return { hours: 0, fullDays: 0 };
  const prefix = `${employee.id}::`;
  let hours = 0;
  Object.entries(scheduleEntries || {}).forEach(([key, entry]) => {
    if (!key.startsWith(prefix)) return;
    if (isWorkedDay(entry)) hours += rate;
    else if (entry?.code === "COMP") hours -= HOURS_FOR_FULL_COMP_DAY;
  });
  hours = Math.max(0, hours);
  return { hours, fullDays: Math.floor(hours / HOURS_FOR_FULL_COMP_DAY) };
}
const WEEKLY_HOURS_TARGET = 42; // igual al que ya usa tu Excel en las columnas "Diferencia semana"

/**
 * Punto de partida de las "reglas generales del equipo" — se guarda editable en la base de datos
 * (ver standingRules en SchedulesView), esto es solo lo que se precarga la primera vez, con todo
 * lo que ya se había acordado en conversaciones anteriores, para no perderlo.
 */
const DEFAULT_STANDING_RULES = `- Quintana Jesus Daniel: descansa todos los sábados (ya tiene su día de descanso fijo puesto en el sistema — nunca se le pone turno un sábado, ni siquiera si otras reglas hablan de cubrir sábados con normalidad). Si por su rotación le tocaría turno de noche un sábado, ese turno de noche se pasa al domingo siguiente en su lugar.
- Turnistas en general: máximo 1 domingo trabajado al mes cada uno, y se alternan entre sí — un domingo trabaja uno, el siguiente domingo trabaja otro (no el mismo dos domingos seguidos).
- Cada domingo debe quedar cubierto por UN SOLO turnista (no varios al tiempo), más un turno de apoyo intermedio aparte de 9:00 a.m. a 5:30 p.m. ese mismo día.
- Esalas Felix Jose y Durant Zarith Elias: no pueden coincidir trabajando el mismo domingo — se alternan entre ellos (mientras uno trabaja un domingo, el otro descansa ese domingo, y al siguiente domingo se cambian).`;

/** Se precarga la primera vez que alguien abre "Novedades", con un resumen de lo construido
 *  hasta ahora — de ahí en adelante, el admin agrega las suyas desde la misma pantalla. */
const DEFAULT_CHANGELOG_SEED = [
  { id: "cl-seed-6", title: "Cuentas y seguridad reforzadas", description: "Ahora se entra con correo y contraseña de verdad (Supabase Auth), con aprobación del admin. La base de datos, el correo y las notificaciones push ya exigen una sesión real — antes de esto, cualquiera con la clave pública podía leer o escribir todo.", at: "2026-08-12T20:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-5", title: "Cambio a Gemini para las funciones de IA", description: "Lectura de medidores por foto y horario mensual con IA ahora corren en Gemini en vez de Claude, para aprovechar la capa gratis.", at: "2026-08-11T23:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-4", title: "Horario Mensual con IA", description: "Generación automática del horario a partir de reglas escritas en español, respetando reglas generales guardadas, con revisión antes de guardar.", at: "2026-08-11T18:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-3", title: "Resumen semanal y sugerencias de reorden con IA", description: "Un correo semanal redactado por IA con lo que pasó, y avisos de qué repuestos se van a agotar pronto según el consumo.", at: "2026-08-12T02:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-2", title: "Modo sin señal mejorado", description: "Las fotos de mantenimiento ya no se pierden si falla la conexión — se guardan y suben solas apenas vuelva la señal.", at: "2026-08-12T01:00:00.000Z", by: "Sistema" },
  { id: "cl-seed-1", title: "Mi horario y accesos rápidos", description: "Cada quien puede ver solo sus propios turnos, y hay botones grandes en Inicio para las acciones más comunes.", at: "2026-08-12T00:00:00.000Z", by: "Sistema" },
];

function isHoliday2026(dateIso) { return COLOMBIA_HOLIDAYS_2026.includes(dateIso); }
function isSundayOrHoliday(dateIso) {
  const d = new Date(dateIso + "T00:00:00");
  return d.getDay() === 0 || isHoliday2026(dateIso);
}
function scheduleKey(employeeId, dateIso) { return `${employeeId}::${dateIso}`; }

/** Horas trabajadas ese día según la entrada/salida exactas (0 si es un código especial como VAC/LIBRE). */
function hoursForEntry(entry) {
  if (!entry || entry.code) return 0;
  if (entry.entrada == null || entry.salida == null) return 0;
  let h = entry.salida - entry.entrada;
  if (h < 0) h += 24; // turno que cruza la medianoche (ej. 22 → 6)
  return h;
}
function isWorkedDay(entry) { return !!entry && !entry.code && entry.entrada != null; }

/** Arma el contenido de un archivo .ics (calendario) con los turnos de un empleado, listo para descargar. */
function buildIcsForEmployee(employee, daysIso, entriesByEmployee) {
  const pad = (n) => String(n).padStart(2, "0");
  const fmtIcsDate = (dateIso, hourDecimal) => {
    const [y, m, d] = dateIso.split("-").map(Number);
    const hh = Math.floor(hourDecimal), mm = Math.round((hourDecimal - hh) * 60);
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  };
  const events = [];
  daysIso.forEach(d => {
    const entry = entriesByEmployee[employee.id]?.[d];
    if (!isWorkedDay(entry)) return;
    const start = fmtIcsDate(d, entry.entrada);
    let endDateIso = d;
    if (entry.salida < entry.entrada) { // cruza medianoche
      const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + 1);
      endDateIso = dt.toISOString().slice(0, 10);
    }
    const end = fmtIcsDate(endDateIso, entry.salida);
    events.push(
      "BEGIN:VEVENT",
      `UID:${employee.id}-${d}@pisosmecanicos-hcc.com`,
      `DTSTAMP:${nowIso().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Turno — Pisos Mecánicos`,
      `DESCRIPTION:Hyatt Regency Cartagena, Ingeniería`,
      "END:VEVENT"
    );
  });
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pisos Mecanicos - Hyatt Regency Cartagena//ES", "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Agrupa una lista de fechas ISO en semanas lunes-domingo (para las columnas "Horas"/"Diferencia" del Excel). */
function weeksInRange(daysIso) {
  const weeks = [];
  let current = [];
  daysIso.forEach(d => {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow === 1 && current.length) { weeks.push(current); current = []; }
    current.push(d);
  });
  if (current.length) weeks.push(current);
  return weeks;
}
function weekTotalHours(week, entries) {
  return week.reduce((sum, d) => sum + hoursForEntry(entries[d]), 0);
}

/**
 * Alertas (informativas, no un veredicto legal) para el horario de un empleado en un mes dado.
 * daysIso: lista de fechas ISO del mes. entries: { [dateIso]: { entrada, salida, code, note } } de ESE empleado.
 */
function computeScheduleWarnings(employee, daysIso, entries) {
  const warnings = [];
  const sundaysHolidaysWorked = daysIso.filter(d => isSundayOrHoliday(d) && isWorkedDay(entries[d]));
  if (sundaysHolidaysWorked.length > 3) {
    warnings.push(`Trabajó ${sundaysHolidaysWorked.length} domingos/festivos este mes (máximo recomendado: 3).`);
  }
  if (employee.fixedRestDay !== null && employee.fixedRestDay !== undefined) {
    const violated = daysIso.filter(d => new Date(d + "T00:00:00").getDay() === employee.fixedRestDay && isWorkedDay(entries[d]));
    if (violated.length > 0) {
      const dayName = DAY_NAMES[employee.fixedRestDay];
      warnings.push(`Tiene ${dayName} marcado como descanso fijo, pero aparece trabajando ${violated.length} ${dayName}(s) este mes.`);
    }
  }
  for (let i = 0; i < daysIso.length - 1; i++) {
    const d1 = daysIso[i], d2 = daysIso[i + 1];
    if (isSundayOrHoliday(d1) && isSundayOrHoliday(d2) && isWorkedDay(entries[d1]) && isWorkedDay(entries[d2])) {
      warnings.push(`Trabajó dos domingos/festivos seguidos (${fmtDayFull(new Date(d1 + "T00:00:00"))} y ${fmtDayFull(new Date(d2 + "T00:00:00"))}).`);
    }
  }
  const weeks = weeksInRange(daysIso);
  weeks.forEach(week => {
    const total = weekTotalHours(week, entries);
    const diff = total - WEEKLY_HOURS_TARGET;
    if (Math.abs(diff) >= 4 && total > 0) {
      const lbl = `${fmtDayShort(new Date(week[0] + "T00:00:00"))}–${fmtDayShort(new Date(week[week.length - 1] + "T00:00:00"))}`;
      warnings.push(`Semana ${lbl}: ${total}h trabajadas (objetivo ${WEEKLY_HOURS_TARGET}h, ${diff > 0 ? "+" : ""}${diff}h de diferencia).`);
    }
  });
  return { sundaysHolidaysCount: sundaysHolidaysWorked.length, warnings };
}


/* ============================================================
   HELPERS
   (sGet/sSet ahora viven en ./lib/storage.js, respaldados por Supabase)
   ============================================================ */

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function nowIso() { return new Date().toISOString(); }
function fmtDT(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
/**
 * NOTA DE SEGURIDAD: las contraseñas ya NO se manejan a mano en este archivo — desde la
 * migración a Supabase Auth, Supabase se encarga de guardar y verificar las contraseñas de
 * forma segura (con su propio hash con salt, mejor de lo que se podía hacer aquí). Ver las
 * funciones register/login más abajo, que usan supabase.auth.signUp / signInWithPassword.
 */
function elapsed(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} d ${h % 24} h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} h ${m} min`;
}

/* ---- Helpers de semana (lunes a domingo), para la vista semanal de medidores ---- */
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function startOfWeek(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // retrocede hasta el lunes
  date.setDate(date.getDate() + diff);
  return date;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDayShort(d) { return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; }
function fmtDayFull(d) { return `${DAY_NAMES[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; }
function isSameCalendarDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function daysInMonthIso(year, month) {
  const days = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= count; i++) days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  return days;
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
function Pill({ children, tone = "gray" }) {
  const map = {
    gray: { bg: C.bg, fg: C.inkSoft },
    green: { bg: C.greenSoft, fg: C.green },
    amber: { bg: C.amberSoft, fg: C.amber },
    red: { bg: C.redSoft, fg: C.red },
    blue: { bg: C.blueSoft, fg: C.blue },
  }[tone];
  return (
    <span style={{ background: map.bg, color: map.fg, fontWeight: 600 }}
      className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", disabled, icon: Icon, type = "button" }) {
  const base = "inline-flex items-center gap-1.5 rounded-md font-medium transition duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  const styles = {
    primary: { background: C.steel, color: "#fff" },
    amber: { background: C.amber, color: "#fff" },
    red: { background: C.red, color: "#fff" },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    subtle: { background: C.bg, color: C.ink },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes}`} style={styles}>
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ============================================================
   AUTENTICACIÓN (usuario + contraseña)
   Nota de seguridad real: las contraseñas se guardan como hash SHA-256
   en el almacenamiento compartido del artifact. Es una protección básica
   de acceso para el equipo, NO un sistema de autenticación de nivel
   empresarial (no hay servidor propio, recuperación de contraseña, etc.).
   ============================================================ */
function AuthScreen({ onLogin, onRegister, error, busy }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = () => {
    if (!email.trim() || !password) return;
    if (mode === "register") {
      if (!displayName.trim() || password !== password2) return;
      onRegister(email.trim(), password, displayName.trim());
    } else {
      onLogin(email.trim(), password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.steelDark }}>
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-3" style={{ background: C.amber }}>
            <Gauge size={26} color="#fff" />
          </div>
          <h1 className="text-white text-lg font-semibold tracking-tight">Revisión Diaria de Equipos</h1>
          <p className="text-sm" style={{ color: "#8fa3b8" }}>Pisos Mecánicos · {mode === "login" ? "Inicia sesión para comenzar el recorrido" : "Crea tu cuenta de operador"}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: C.panel }}>
          <div className="flex rounded-md overflow-hidden mb-4 border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <button onClick={() => setMode("login")} className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === "login" ? C.steel : C.bg, color: mode === "login" ? "#fff" : C.inkSoft }}>Iniciar sesión</button>
            <button onClick={() => setMode("register")} className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === "register" ? C.steel : C.bg, color: mode === "register" ? "#fff" : C.inkSoft }}>Crear cuenta</button>
          </div>

          <div className="space-y-2.5">
            {mode === "register" && (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tu nombre completo"
                autoComplete="name"
                className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo" type="email"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email"
              className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Contraseña"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-3 py-2 pr-16 rounded-md text-sm border outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}
                onKeyDown={e => { if (e.key === "Enter" && mode === "login") submit(); }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-1" style={{ color: C.gray }}>
                {showPw ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "register" && (
              <input value={password2} onChange={e => setPassword2(e.target.value)} type={showPw ? "text" : "password"} placeholder="Confirmar contraseña"
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}
                onKeyDown={e => { if (e.key === "Enter") submit(); }} />
            )}
            {mode === "register" && password2 && password !== password2 && (
              <div className="text-xs" style={{ color: C.red }}>Las contraseñas no coinciden.</div>
            )}
            {error && <div className="text-xs" style={{ color: C.red }}>{error}</div>}
            {mode === "register" && (
              <div className="text-xs rounded-md p-2" style={{ background: C.amberSoft, color: "#7a5405" }}>
                Tu cuenta queda pendiente de aprobación por un administrador (salvo que seas la primera persona en registrarse en todo el sistema).
              </div>
            )}
            <Button icon={mode === "login" ? User : PlusCircle} disabled={busy} onClick={submit} size="md">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
            {mode === "login" && (
              <p className="text-xs text-center" style={{ color: C.gray }}>
                ¿Olvidaste tu contraseña? Pídele a un administrador que te la restablezca desde el Panel de administrador.
              </p>
            )}
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: "#657c92" }}>
          Acceso por correo y contraseña para identificar cada recorrido. No sustituye un sistema de seguridad corporativo.
          Una vez inicias sesión en este navegador, queda recordada aquí — no hace falta volver a entrar cada vez que abres la página,
          salvo que borres los datos de navegación o uses una pestaña de incógnito.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE DE ITEM DE EQUIPO (dentro de una ronda)
   ============================================================ */
function EquipmentRow({ item, entry, onChange, activeIssue, onResolve, previous, statusOptions, hint, outOfRange }) {
  const [resolving, setResolving] = useState(false);
  const [solution, setSolution] = useState("");
  const damaged = !!entry?.damaged;
  const alert = damaged || outOfRange;
  const opts = statusOptions || STATUS_OPTS;

  const update = (patch) => onChange(item.id, { ...entry, ...patch });

  return (
    <div id={`item-row-${item.id}`} className="rounded-lg border p-3 mb-2" style={{ borderColor: alert ? C.red : C.line, background: alert ? C.redSoft : C.panel }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2" style={{ minWidth: 200 }}>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ background: C.bg, color: C.inkSoft }}>#{item.c}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: C.ink }}>{item.n}</div>
            {item.tank && <Pill tone="blue">Tanque agua potable</Pill>}
            {hint && <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Rango objetivo: <b>{hint}</b></div>}
            {outOfRange && !damaged && (
              <div className="text-xs mt-0.5 font-semibold" style={{ color: C.red }}>⚠ Fuera del rango objetivo — considera marcarlo dañado.</div>
            )}
            {previous && (
              <div className="text-xs mt-0.5" style={{ color: C.blue }}>
                Turno anterior ({previous.shift}, {fmtDT(previous.updatedAt)} · {previous.updatedBy}):{" "}
                {previous.status && <b>{previous.status}</b>}
                {previous.value !== undefined && previous.value !== "" && <b>{previous.value}{item.u ? ` ${item.u}` : ""}</b>}
                {previous.observation && <span className="italic"> — "{previous.observation}"</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(item.k === "status" || item.k === "statusNumeric") && (
            <select value={entry?.status || ""} onChange={e => update({ status: e.target.value })}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Estado…</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {(item.k === "numeric" || item.k === "statusNumeric") && (
            <div className="flex items-center gap-1">
              <input type="number" step="any" value={entry?.value ?? ""} onChange={e => update({ value: e.target.value })}
                placeholder="valor" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              {item.u && <span className="text-xs" style={{ color: C.gray }}>{item.u}</span>}
            </div>
          )}
          {item.k === "sample" && (
            <div className="flex items-center gap-1.5">
              <input value={entry?.ph ?? ""} onChange={e => update({ ph: e.target.value })} placeholder="PH" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.cloro ?? ""} onChange={e => update({ cloro: e.target.value })} placeholder="Cloro" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.operador ?? ""} onChange={e => update({ operador: e.target.value })} placeholder="Operador" className="w-28 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input value={entry?.pisoMuestra ?? ""} onChange={e => update({ pisoMuestra: e.target.value })} placeholder="Piso de muestra" className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer select-none"
            style={{ background: damaged ? C.red : C.bg, color: damaged ? "#fff" : C.inkSoft }}>
            <input type="checkbox" checked={damaged} onChange={e => update({ damaged: e.target.checked })} className="accent-current" />
            Dañado / Fuera de servicio
          </label>
          {damaged && activeIssue && (
            <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer select-none"
              style={{ background: entry?.stillSame ? C.amber : C.bg, color: entry?.stillSame ? "#fff" : C.inkSoft }}>
              <input type="checkbox" checked={!!entry?.stillSame} onChange={e => update({ stillSame: e.target.checked })} className="accent-current" />
              Continúa igual (sin novedad)
            </label>
          )}
        </div>
      </div>
      {damaged && activeIssue && (
        <div className="text-xs mt-1" style={{ color: "#a31245" }}>
          Para que este equipo salga de "Fuera de servicio", destilda la casilla roja de arriba (o usa "Marcar resuelto" abajo) —
          cambiar el estado o solo escribir un comentario no lo quita de la lista por sí solo.
        </div>
      )}

      <div className="flex items-start gap-1.5 mt-2">
        <textarea value={entry?.observation ?? ""} onChange={e => update({ observation: e.target.value })}
          placeholder="Observaciones…" rows={1}
          className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        <VoiceInputButton onResult={text => update({ observation: ((entry?.observation ?? "") ? (entry?.observation ?? "") + " " : "") + text })} />
      </div>

      {activeIssue && (
        <div className="mt-2 rounded-md p-2 flex items-start justify-between gap-2" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <div className="text-xs" style={{ color: "#7a5405" }}>
            <div className="font-semibold flex items-center gap-1"><AlertTriangle size={13} /> Reportado dañado desde el turno anterior</div>
            <div>Por <b>{activeIssue.openedBy}</b> el {fmtDT(activeIssue.openedAt)} ({elapsed(activeIssue.openedAt)} fuera de servicio)</div>
            <div className="italic mt-0.5">"{activeIssue.observation}"</div>
            <div className="mt-1">Si ya lo encendiste o reparaste, escribe abajo qué se hizo y confírmalo como resuelto.</div>
          </div>
          {!resolving ? (
            <Button size="sm" variant="ghost" onClick={() => setResolving(true)}>Marcar resuelto</Button>
          ) : null}
        </div>
      )}
      {resolving && (
        <div className="mt-2 flex items-center gap-2">
          <input value={solution} onChange={e => setSolution(e.target.value)} placeholder="¿Qué solución se aplicó?"
            className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <Button size="sm" variant="primary" icon={CheckCircle2}
            disabled={!solution.trim()}
            onClick={() => { onResolve(activeIssue, solution.trim()); setResolving(false); setSolution(""); update({ damaged: false }); }}>
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: RONDA DE REVISIÓN
   ============================================================ */
function RoundView({ floor, currentUser, shift, activeIssues, latestValues, onResolveIssue, onSaveRound, floorIndex, floorCount, onGoFloor, tourProgressCount, resumedTour, onDismissResumed }) {
  const [entries, setEntries] = useState({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  // Al cambiar de piso: precargar cada equipo con lo último registrado (turno anterior),
  // para que el técnico vea y pueda ajustar en vez de partir de cero.
  useEffect(() => {
    const seeded = {};
    floor.items.forEach(item => {
      const lv = latestValues[item.id];
      if (lv) {
        seeded[item.id] = {
          status: lv.status, value: lv.value, ph: lv.ph, cloro: lv.cloro, operador: lv.operador,
          observation: activeIssues[item.id] ? undefined : lv.observation, // si sigue dañado, no precargar el comentario viejo: hay que confirmar algo nuevo o marcar "Continúa igual"
          damaged: !!activeIssues[item.id],
        };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
      }
    });
    setEntries(seeded);
    setSaved(false);
    setNotes("");
  }, [floor.id]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = Object.values(entries).filter(e => e && (e.status || e.value !== undefined && e.value !== "" || e.observation || e.ph || e.damaged)).length;
  const damagedCount = Object.values(entries).filter(e => e?.damaged).length;

  const isLast = floorIndex === floorCount - 1;
  const [validationMsg, setValidationMsg] = useState(null);
  const visibleItems = floor.items;

  const handleSave = () => {
    const { missing, missingComment } = validateRoundEntries(floor.items, entries);
    if (missingComment.length > 0) {
      setValidationMsg({ prefix: "Falta el comentario de qué pasó en:", items: missingComment, suffix: "Los equipos marcados como dañados necesitan una observación antes de guardar." });
      return;
    }
    if (missing.length > 0) {
      setValidationMsg({ prefix: "Todavía faltan estos equipos por registrar:", items: missing });
      return;
    }
    setValidationMsg(null);
    onSaveRound(floor, entries, notes);
    setSaved(true);
    if (!isLast) {
      setTimeout(() => onGoFloor(floorIndex + 1), 700);
    }
  };

  return (
    <div>
      {resumedTour && (
        <div className="rounded-md p-2 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <span className="text-xs" style={{ color: "#7a5405" }}>
            ↺ Tienes un recorrido en curso de este mismo turno — llevas <b>{tourProgressCount} de {floorCount} pisos</b>. Sigues donde ibas, no hace falta empezar de cero.
          </span>
          <Button size="sm" variant="ghost" onClick={onDismissResumed}>Entendido</Button>
        </div>
      )}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={floorIndex === 0} onClick={() => onGoFloor(floorIndex - 1)}>‹ Piso anterior</Button>
        <span className="text-xs font-medium" style={{ color: C.gray }}>Piso {floorIndex + 1} de {floorCount}</span>
        <Button size="sm" variant="ghost" disabled={isLast} onClick={() => onGoFloor(floorIndex + 1)}>Siguiente piso ›</Button>
      </div>
      <div className="mb-2">
        <div className="text-[11px] mb-1 text-right" style={{ color: C.gray }}>Recorrido completo: {tourProgressCount} de {floorCount} pisos hechos</div>
        <div className="w-full rounded-full h-1.5" style={{ background: C.bg }}>
          <div className="h-1.5 rounded-full" style={{ width: `${Math.round((tourProgressCount / floorCount) * 100)}%`, background: tourProgressCount >= floorCount ? C.green : C.amber }} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{floor.name}</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{floor.items.length} equipos · Turno {shift} · {todayStr()}</p>
        </div>
        <div className="flex items-center gap-2">
          {damagedCount > 0 && <Pill tone="red">{damagedCount} marcado(s) dañado</Pill>}
          <Pill tone="gray">{filledCount}/{floor.items.length} registrados</Pill>
        </div>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
        Los campos ya vienen con lo último registrado por el turno anterior — revisa, corrige lo que cambió y guarda.
      </div>

      {visibleItems.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestValues[item.id]}
          onResolve={(it, solution) => onResolveIssue(it, solution)} />
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes del recorrido</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales del piso, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <PendingItemsAlert msg={validationMsg} onClose={() => setValidationMsg(null)} />

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Vo.Bo. pendiente de supervisor</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>
          {isLast ? "Finalizar y enviar" : "Guardar y pasar al siguiente piso"}
        </Button>
      </div>
      {saved && (
        <div className="text-right text-sm mt-1" style={{ color: C.green }}>
          ✓ Ronda guardada correctamente {!isLast && "· pasando al siguiente piso…"}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: CUARTOS FRÍOS Y MÁQUINAS DE HIELO
   ============================================================ */
function ColdRoomsView({ currentUser, shift, activeIssues, latestColdValues, onResolveIssue, onSaveColdRound, reportEmail, onLogSent, lastColdRound, coldHistory, mySignature }) {
  const [entries, setEntries] = useState({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [ingeniero, setIngeniero] = useState("");
  const [saved, setSaved] = useState(false);
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  useEffect(() => {
    const seeded = {};
    ALL_COLD_ROOM_ITEMS.forEach(item => {
      const lv = latestColdValues[item.id];
      if (lv) {
        seeded[item.id] = { status: lv.status, value: lv.value, observation: activeIssues[item.id] ? undefined : lv.observation, damaged: !!activeIssues[item.id] };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
      }
    });
    setEntries(seeded);
  }, []);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = Object.values(entries).filter(e => e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged)).length;
  const damagedCount = Object.values(entries).filter(e => e?.damaged).length;
  const outOfRangeNow = COLD_ROOMS.filter(item => isColdRoomOutOfRange(item, entries[item.id]?.value));

  const todayIsSunday = new Date().getDay() === 0;
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekGrid = useMemo(() => buildColdRoomsWeekGrid(coldHistory || {}, weekStart), [coldHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;

  const handleSave = () => {
    const { missing, missingComment } = validateRoundEntries(ALL_COLD_ROOM_ITEMS, entries);
    if (missingComment.length > 0) {
      setSendMsg({ ok: false, text: "Falta el comentario de qué pasó en:", items: missingComment });
      return;
    }
    if (missing.length > 0) {
      setSendMsg({ ok: false, text: "Todavía faltan estos por registrar:", items: missing });
      return;
    }
    onSaveColdRound(entries, notes, supervisor, ingeniero);
    setSaved(true);
    setSendMsg(null);
  };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateColdRoomsWeekPdf(weekGrid, weekLabel, currentUser, mySignature);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), weekGrid, weekLabel, currentUser, mySignature);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Cuartos Fríos (semana, correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Cuartos Fríos y Máquinas de Hielo</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{ALL_COLD_ROOM_ITEMS.length} puntos de control · Turno {shift} · {todayStr()}</p>
        </div>
        <div className="flex items-center gap-2">
          {damagedCount > 0 && <Pill tone="red">{damagedCount} fuera de rango / servicio</Pill>}
          <Pill tone="gray">{filledCount}/{ALL_COLD_ROOM_ITEMS.length} registrados</Pill>
        </div>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
        Los campos ya vienen con lo último registrado — revisa, corrige lo que cambió y guarda. Marca "Dañado / Fuera de servicio"
        si un cuarto está fuera de su rango de temperatura o una máquina de hielo no funciona.
      </div>

      {outOfRangeNow.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold flex items-center gap-2" style={{ background: C.redSoft, color: C.red }}>
          <AlertTriangle size={14} /> {outOfRangeNow.length} cuarto{outOfRangeNow.length !== 1 ? "s" : ""} fuera de rango ahora mismo:{" "}
          {outOfRangeNow.map(i => i.n).join(", ")}
        </div>
      )}

      <div className="relative mb-3">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un cuarto o máquina…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const visColdRooms = q ? COLD_ROOMS.filter(i => i.n.toLowerCase().includes(q)) : COLD_ROOMS;
        const visIceAB = q ? ICE_MACHINES_AB.filter(i => i.n.toLowerCase().includes(q)) : ICE_MACHINES_AB;
        const visIceLinos = q ? ICE_MACHINES_LINOS.filter(i => i.n.toLowerCase().includes(q)) : ICE_MACHINES_LINOS;
        const noResults = q && visColdRooms.length === 0 && visIceAB.length === 0 && visIceLinos.length === 0;
        if (noResults) return <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
        return (
          <>
            {visColdRooms.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>Cuartos fríos ({visColdRooms.length})</div>
                {visColdRooms.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} hint={item.setpoint}
                    outOfRange={isColdRoomOutOfRange(item, entries[item.id]?.value)}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
            {visIceAB.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo A&B ({visIceAB.length})</div>
                {visIceAB.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
            {visIceLinos.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo — Linos / Habitaciones ({visIceLinos.length})</div>
                {visIceLinos.map(item => (
                  <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                    activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
                    onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
                ))}
              </>
            )}
          </>
        );
      })()}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales de la ronda…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Supervisor (opcional)</div>
            <input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Nombre del supervisor"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Ingeniero (opcional)</div>
            <input value={ingeniero} onChange={e => setIngeniero(e.target.value)} placeholder="Nombre del ingeniero"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>Guardar ronda</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1 mb-3" style={{ color: C.green }}>✓ Ronda guardada correctamente</div>}
      {sendMsg && !sendMsg.ok && !sendMsg.items && (
        <div className="rounded-md p-2 mt-1 mb-3 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {sendMsg.text}</div>
      )}
      <PendingItemsAlert msg={sendMsg?.items ? { prefix: sendMsg.text, items: sendMsg.items } : null} onClose={() => setSendMsg(null)} />

      {lastColdRound && !todayIsSunday && (
        <div className="rounded-md p-2 text-xs" style={{ background: C.bg, color: C.inkSoft }}>
          El envío por correo de Cuartos Fríos se hace cada 7 días — el domingo, aquí mismo, va a aparecer el botón
          para enviar la semana completa. Si necesitas enviarla antes, ve a "Historial de Cuartos Fríos" en el menú.
        </div>
      )}

      {lastColdRound && todayIsSunday && (
        <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.amber, background: C.amberSoft }}>
          <div className="text-sm font-semibold mb-2" style={{ color: "#7a5405" }}>
            ✓ Semana completa — envía el reporte semanal de Cuartos Fríos ({weekLabel})
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadPdf}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
            <Button icon={Mail} disabled={sending} onClick={doSendEmail}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
          </div>
          {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: LECTURAS DE MEDIDORES
   ============================================================ */
function MeterRow({ meter, entry, onChange, previous }) {
  const subs = meter.subs || ["value"];
  const update = (sub, v) => onChange(meter.id, { ...entry, [sub]: v });
  const [reading, setReading] = useState(null); // qué "sub" está leyendo ahora mismo, o null
  const [readMsg, setReadMsg] = useState(null);
  const [confirmedSubs, setConfirmedSubs] = useState({}); // {sub: true} — quedó leído por foto y sin tocar desde entonces

  const doRead = async (sub, file) => {
    setReading(sub); setReadMsg(null);
    try {
      const prevVal = previous?.[sub];
      const res = await readMeterFromPhoto(file, prevVal !== undefined && prevVal !== "" ? prevVal : null, meter.n);
      if (res.ok) {
        update(sub, res.lectura);
        setConfirmedSubs(prev => ({ ...prev, [sub]: true }));
        setReadMsg({ ok: true, text: `Leído: ${res.lectura}` });
        bumpAiUsage("meterReadings");
      } else setReadMsg({ ok: false, text: res.message || "No se pudo leer." });
    } catch { setReadMsg({ ok: false, text: "No se pudo leer (revisa la conexión)." }); }
    setReading(null);
  };

  const updateManual = (sub, v) => {
    update(sub, v);
    setConfirmedSubs(prev => { const next = { ...prev }; delete next[sub]; return next; }); // si lo editan a mano, ya no es "confirmado por foto"
  };

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <div className="text-sm font-medium mb-2" style={{ color: C.ink }}>{meter.n}</div>
      <div className="flex flex-wrap gap-4">
        {subs.map(sub => {
          const val = entry?.[sub];
          const prevVal = previous?.[sub];
          const hasBoth = val !== undefined && val !== "" && prevVal !== undefined && prevVal !== "" && !isNaN(Number(val)) && !isNaN(Number(prevVal));
          const consumo = hasBoth ? Number(val) - Number(prevVal) : null;
          const confirmed = !!confirmedSubs[sub];
          return (
            <div key={sub} className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: C.gray }}>
                {meter.subs ? sub : "Lectura"}{meter.u ? ` (${meter.u})` : ""}
              </label>
              <div className="flex items-center gap-1">
                <input type="number" step="any" value={val ?? ""} onChange={e => updateManual(sub, e.target.value)}
                  placeholder="valor" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none"
                  style={{ borderColor: confirmed ? C.green : C.line, borderWidth: confirmed ? 2 : 1, background: confirmed ? C.greenSoft : C.panel, color: C.ink }} />
                <label className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer shrink-0" style={{ background: C.blueSoft, color: C.blue }}>
                  {reading === sub ? "…" : <Camera size={13} />}
                  <input type="file" accept="image/*" className="hidden" disabled={reading !== null}
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doRead(sub, f); }} />
                </label>
              </div>
              {confirmed && <span className="text-xs mt-1 font-medium" style={{ color: C.green }}>✓ Leído por foto</span>}
              {consumo !== null ? (
                <span className="text-xs mt-1" style={{ color: consumo < 0 ? C.red : C.green }}>
                  Consumo: {consumo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}{meter.u ? ` ${meter.u}` : ""}
                </span>
              ) : prevVal !== undefined && prevVal !== "" ? (
                <span className="text-xs mt-1" style={{ color: C.gray }}>Anterior: {prevVal}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {readMsg && (
        <div className="text-xs font-medium mt-1" style={{ color: readMsg.ok ? C.amber : C.red }}>
          {readMsg.ok ? "📷" : "⚠"} {readMsg.text}{readMsg.ok ? " — revisa que coincida con el medidor antes de guardar." : ""}
        </div>
      )}
    </div>
  );
}

function MetersView({ currentUser, shift, latestMeterValues, onSaveMetersRound, meterHistory }) {
  const DRAFT_KEY = "pm-local:meters-draft";
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").entries || {}; } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").notes || ""; } catch { return ""; }
  });
  const [saved, setSaved] = useState(false);
  const [restoredDraft] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").entries || {}).length > 0; } catch { return false; }
  });

  // Guarda un borrador en este celular cada vez que algo cambia — así, si la app se recarga o se
  // cierra por sorpresa (por ejemplo al actualizar a una versión nueva) antes de darle "Guardar
  // lecturas", lo que ya se había escrito no se pierde: se recupera solo al volver a entrar.
  useEffect(() => {
    try {
      if (Object.keys(entries).length > 0 || notes) localStorage.setItem(DRAFT_KEY, JSON.stringify({ entries, notes }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
  }, [entries, notes]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = ALL_METERS.filter(m => {
    const e = entries[m.id]; if (!e) return false;
    const subs = m.subs || ["value"];
    return subs.some(s => e[s] !== undefined && e[s] !== "");
  }).length;

  const anomalies = useMemo(() => computeMeterAnomalies(meterHistory || {}), [meterHistory]);

  const handleSave = () => {
    onSaveMetersRound(entries, notes);
    setSaved(true);
    setEntries({});
    setNotes("");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Lecturas de Medidores</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{ALL_METERS.length} medidores · Turno {shift} · {todayStr()}</p>
        </div>
        <Pill tone="gray">{filledCount}/{ALL_METERS.length} registrados</Pill>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
        Escribe la lectura actual de cada medidor. El consumo (diferencia contra la última lectura guardada) se calcula solo, igual que en el Excel.
      </div>

      {restoredDraft && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold" style={{ background: C.amberSoft, color: "#7a5405" }}>
          📋 Recuperamos lecturas que habías escrito y no habías guardado todavía — revísalas antes de continuar.
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs font-semibold flex items-start gap-2" style={{ background: C.redSoft, color: C.red }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {anomalies.length} lectura{anomalies.length !== 1 ? "s" : ""} con consumo negativo detectada{anomalies.length !== 1 ? "s" : ""} (probable error de lectura o medidor reiniciado):{" "}
            {anomalies.map((a, i) => `${a.meter.n}${a.sub ? ` (${a.sub})` : ""}`).join(", ")}
          </span>
        </div>
      )}

      {METER_GROUPS.map(group => (
        <div key={group.id}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>{group.title}</div>
          {group.meters.map(m => (
            <MeterRow key={m.id} meter={m} entry={entries[m.id]} onChange={onChange} previous={latestMeterValues[m.id]} />
          ))}
        </div>
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones sobre las lecturas de hoy…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>Guardar lecturas</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Lecturas guardadas correctamente</div>}
    </div>
  );
}

/* ============================================================
   VISTA: CHECKLIST DE ÁREA (Lavandería / Gimnasio — mismo patrón)
   ============================================================ */
function AreaChecklistView({ title, subtitle, sections, statusOptions, currentUser, shift, activeIssues, latestValues, onResolveIssue, onSaveRound }) {
  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const [entries, setEntries] = useState({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);

  useEffect(() => {
    const seeded = {};
    allItems.forEach(item => {
      const lv = latestValues[item.id];
      if (lv) seeded[item.id] = { status: lv.status, value: lv.value, observation: activeIssues[item.id] ? undefined : lv.observation, damaged: !!activeIssues[item.id] };
      else if (activeIssues[item.id]) seeded[item.id] = { damaged: true }; // sin precargar la observación: hay que escribir algo nuevo o marcar "Continúa igual"
    });
    setEntries(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = allItems.filter(item => {
    const e = entries[item.id];
    return e && (e.status || (e.value !== undefined && e.value !== "") || e.damaged);
  }).length;

  const handleSave = () => {
    const { missing, missingComment } = validateRoundEntries(allItems, entries);
    if (missingComment.length > 0) {
      setValidationMsg({ prefix: "Falta el comentario de qué pasó en:", items: missingComment, suffix: "Los equipos marcados como dañados necesitan una observación antes de guardar." });
      return;
    }
    if (missing.length > 0) {
      setValidationMsg({ prefix: "Todavía faltan estos equipos por registrar:", items: missing });
      return;
    }
    setValidationMsg(null);
    onSaveRound(entries, notes);
    setSaved(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{title}</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>{subtitle} · Turno {shift} · {todayStr()}</p>
        </div>
        <Pill tone="gray">{filledCount}/{allItems.length} registrados</Pill>
      </div>

      <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
        Los campos ya vienen con lo último registrado — revisa, corrige lo que cambió y guarda. Marca "Dañado / Fuera de servicio" si algo no funciona; te va a pedir un comentario obligatorio.
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un equipo…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const visSections = sections.map(sec => ({ ...sec, items: q ? sec.items.filter(it => it.n.toLowerCase().includes(q)) : sec.items }));
        const totalVisible = visSections.reduce((s, sec) => s + sec.items.length, 0);
        if (q && totalVisible === 0) return <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
        return visSections.map(sec => sec.items.length > 0 && (
          <div key={sec.title || "unica"}>
            {sec.title && <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>{sec.title} ({sec.items.length})</div>}
            {sec.items.map(item => (
              <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
                activeIssue={activeIssues[item.id]} previous={latestValues[item.id]} statusOptions={statusOptions}
                onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
            ))}
          </div>
        ));
      })()}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      <PendingItemsAlert msg={validationMsg} onClose={() => setValidationMsg(null)} />

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>Guardar ronda</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Ronda guardada correctamente</div>}
    </div>
  );
}

/* ============================================================
   VISTA: CHECK LIST CALDERA
   ============================================================ */
function CalderaView({ currentUser, shift, onSaveCaldera, lastCalderaRound }) {
  const blank = { horaManometro: "", horaMcDonell: "", horaFondo: "", horaTqDistribucion: "", presionVaporPsi: "", observaciones: "" };
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const handleSave = () => {
    const required = ["horaManometro", "horaMcDonell", "horaFondo", "horaTqDistribucion", "presionVaporPsi"];
    const missing = required.filter(k => !form[k]);
    if (missing.length > 0) {
      setValidationMsg("Faltan campos por llenar: purgas y presión son obligatorias antes de guardar.");
      return;
    }
    setValidationMsg(null);
    onSaveCaldera(form);
    setSaved(true);
    setForm(blank);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Check List Caldera</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Equipo: Caldera Piso 4 Lavandería · Turno {shift} · {todayStr()}</p>

      <div className="rounded-lg border p-4 mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Purgas (hora)</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Manómetro</label>
            <input type="time" value={form.horaManometro} onChange={e => set("horaManometro", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Mc Donell</label>
            <input type="time" value={form.horaMcDonell} onChange={e => set("horaMcDonell", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Fondo</label>
            <input type="time" value={form.horaFondo} onChange={e => set("horaFondo", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Tanque de distribución</label>
            <input type="time" value={form.horaTqDistribucion} onChange={e => set("horaTqDistribucion", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Presión</div>
        <div className="mb-1">
          <label className="text-xs" style={{ color: C.gray }}>Vapor (PSI)</label>
          <input type="number" value={form.presionVaporPsi} onChange={e => set("presionVaporPsi", e.target.value)}
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones (opcional)</div>
        <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={2}
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {validationMsg && (
        <div className="rounded-md p-2 mb-3 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {validationMsg}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>Guardar check list</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1" style={{ color: C.green }}>✓ Check list guardado correctamente</div>}

      {lastCalderaRound && (
        <div className="rounded-lg border p-3 mt-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Último registro</div>
          <div className="text-xs" style={{ color: C.inkSoft }}>
            {fmtDT(lastCalderaRound.savedAt)} · Turno {lastCalderaRound.shift} · Por {lastCalderaRound.user}
          </div>
          <div className="text-sm mt-1" style={{ color: C.ink }}>
            Purgas: {lastCalderaRound.horaManometro}, {lastCalderaRound.horaMcDonell}, {lastCalderaRound.horaFondo}, {lastCalderaRound.horaTqDistribucion} · Vapor: {lastCalderaRound.presionVaporPsi} PSI
          </div>
          {lastCalderaRound.observaciones && <div className="text-xs italic mt-1" style={{ color: C.gray }}>"{lastCalderaRound.observaciones}"</div>}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   VISTA: HISTORIAL SEMANAL DE MEDIDORES
   ============================================================ */
/* ============================================================
   VISTA SEMANAL DE MEDIDORES
   ============================================================ */
function MetersWeeklyView({ meterHistory, reportEmail, onLogSent, currentUser, mySignature }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const grid = useMemo(() => buildMeterWeekGrid(meterHistory, weekStart), [meterHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;
  const isCurrentWeek = isSameCalendarDay(startOfWeek(new Date()), weekStart);

  const doDownloadExcel = () => {
    setDownloading(true);
    try {
      const wb = buildMetersWeekWorkbook(grid, weekLabel);
      XLSX.writeFile(wb, `lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendMetersWeekExcelEmailAuto(emailTo.trim(), grid, weekLabel);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Lecturas de medidores (semana, correo con Excel)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateMetersWeekPdf(grid, weekLabel, currentUser, mySignature);
      doc.save(`lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  let lastGroupRendered = null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Lecturas de Medidores — Historial semanal</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(w => addDays(w, -7))}>‹ Semana anterior</Button>
          <span className="text-sm font-medium" style={{ color: C.ink }}>{weekLabel}</span>
          <Button size="sm" variant="ghost" disabled={isCurrentWeek} onClick={() => setWeekStart(w => addDays(w, 7))}>Semana siguiente ›</Button>
        </div>
        {!isCurrentWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Ir a esta semana</Button>}
      </div>

      <p className="text-xs mb-3" style={{ color: C.gray }}>
        La columna "Antes" muestra la última lectura guardada justo antes de esta semana, para poder comparar el primer
        día de la semana y seguir la misma secuencia sin cortes — igual que pasa entre meses en el Excel.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar esta semana (en Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
          <Button size="sm" variant="ghost" onClick={doDownloadPdf}>o descargar en PDF</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="min-w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 240 }}>Medidor</th>
              <th className="px-2 py-2 text-right">Antes</th>
              {grid.days.map((d, i) => <th key={i} className="px-2 py-2 text-right whitespace-nowrap">{fmtDayShort(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, i) => {
              const showGroupHeader = row.groupTitle !== lastGroupRendered;
              lastGroupRendered = row.groupTitle;
              return (
                <React.Fragment key={i}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={grid.days.length + 2} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.ink }}>{row.label}{row.unit ? ` (${row.unit})` : ""}</td>
                    <td className="px-2 py-1.5 text-right" style={{ color: C.gray }}>{row.before ?? "—"}</td>
                    {row.days.map((v, di) => {
                      const neg = row.daysConsumo?.[di] < 0;
                      return (
                        <td key={di} className="px-2 py-1.5 text-right" title={neg ? `Consumo negativo: ${row.daysConsumo[di]}` : undefined}
                          style={{ color: neg ? "#fff" : v != null ? C.ink : C.gray, background: neg ? C.red : "transparent", fontWeight: neg ? 700 : 400 }}>
                          {v ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   VISTA SEMANAL DE CUARTOS FRÍOS
   ============================================================ */
function ColdRoomsWeeklyView({ coldHistory, reportEmail, onLogSent, currentUser, mySignature }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const grid = useMemo(() => buildColdRoomsWeekGrid(coldHistory, weekStart), [coldHistory, weekStart]);
  const weekLabel = `${fmtDayFull(weekStart)} — ${fmtDayFull(addDays(weekStart, 6))}`;
  const isCurrentWeek = isSameCalendarDay(startOfWeek(new Date()), weekStart);
  const weekComplete = isSameCalendarDay(new Date(), addDays(weekStart, 6)) || addDays(weekStart, 6) < new Date();

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateColdRoomsWeekPdf(grid, weekLabel, currentUser, mySignature);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), grid, weekLabel, currentUser, mySignature);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Cuartos Fríos (semana, correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  let lastGroupRendered = null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Cuartos Fríos — Historial semanal</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(w => addDays(w, -7))}>‹ Semana anterior</Button>
          <span className="text-sm font-medium" style={{ color: C.ink }}>{weekLabel}</span>
          <Button size="sm" variant="ghost" disabled={isCurrentWeek} onClick={() => setWeekStart(w => addDays(w, 7))}>Semana siguiente ›</Button>
        </div>
        {!isCurrentWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Ir a esta semana</Button>}
      </div>

      <p className="text-xs mb-3" style={{ color: C.gray }}>
        El formato de cuartos fríos se guarda todos los días, pero el envío por correo está pensado para hacerse
        cada 7 días (al completar la semana) — igual que el papel original. Aquí puedes descargar o enviar la
        semana que quieras, cuando quieras.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
          Descargar / enviar esta semana {weekComplete ? "" : "(semana en curso, aún no termina)"}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="min-w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 220 }}>Equipo</th>
              {grid.days.map((d, i) => <th key={i} className="px-2 py-2 text-right whitespace-nowrap">{fmtDayShort(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, i) => {
              const showGroupHeader = row.groupTitle !== lastGroupRendered;
              lastGroupRendered = row.groupTitle;
              return (
                <React.Fragment key={i}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={grid.days.length + 1} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.ink }}>{row.label}</td>
                    {row.days.map((v, di) => {
                      const bad = row.item.k !== "status" ? isColdRoomOutOfRange(row.item, v) : v === "Fuera de servicio";
                      return (
                        <td key={di} className="px-2 py-1.5 text-right"
                          style={{ color: bad ? "#fff" : v != null ? C.ink : C.gray, background: bad ? C.red : "transparent", fontWeight: bad ? 700 : 400 }}>
                          {v ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   INVENTARIO — componentes de vista
   ============================================================ */
function QrCodeBox({ url, label, filename }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(d => { if (!cancelled) setDataUrl(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  const doDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || "qr.png";
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      {dataUrl
        ? <img src={dataUrl} alt="Código QR" width={140} height={140} />
        : <div className="w-[140px] h-[140px] flex items-center justify-center text-xs" style={{ color: C.gray }}>Generando…</div>}
      {label && <div className="text-xs text-center" style={{ color: C.inkSoft }}>{label}</div>}
      <Button size="sm" variant="ghost" icon={Download} disabled={!dataUrl} onClick={doDownload}>Descargar QR</Button>
    </div>
  );
}

function BodegasListView({ bodegas, shelves, invItems, canManage, onSelectBodega, onCreateBodega, onImportInventory, onDeleteBodega }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const doCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateBodega(newName.trim());
    setNewName("");
    setCreating(false);
  };

  const doImport = async () => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await onImportInventory();
      setImportMsg({ ok: true, text: `Listo: ${res.newBodegasCount} bodega(s), ${res.newShelvesCount} estantería(s) y ${res.newItemsCount} repuesto(s) nuevos importados.` });
    } catch {
      setImportMsg({ ok: false, text: "No se pudo importar. Intenta de nuevo." });
    }
    setImporting(false);
  };

  const doDownloadAllQr = async () => {
    setGeneratingQr(true);
    try {
      const doc = await generateAllShelvesQrPdf(bodegas, shelves);
      doc.save("codigos-qr-estanterias.pdf");
    } catch { setImportMsg({ ok: false, text: "No se pudieron generar los códigos QR." }); }
    setGeneratingQr(false);
  };

  const doDelete = async (id) => {
    const res = await onDeleteBodega(id);
    if (res && !res.ok) setImportMsg({ ok: false, text: res.message });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Inventario — Bodegas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige una bodega para ver sus estanterías y repuestos.</p>

      {canManage && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: "#7a5405" }}>
          <span>¿Primera vez usando esto? Importa de una vez el inventario real del hotel (29 bodegas, ~316 estanterías, ~2897 repuestos).</span>
          <Button size="sm" disabled={importing} onClick={doImport}>{importing ? "Importando…" : "Importar inventario completo"}</Button>
        </div>
      )}
      {canManage && bodegas.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.blueSoft, color: "#274c6e" }}>
          <span>Descarga en un solo PDF todos los códigos QR de todas las estanterías, listos para imprimir y pegar.</span>
          <Button size="sm" variant="ghost" disabled={generatingQr} onClick={doDownloadAllQr}>{generatingQr ? "Generando…" : "Descargar todos los QR"}</Button>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {canManage && (
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la bodega nueva"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
          <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Crear bodega</Button>
        </div>
      )}

      {bodegas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no hay bodegas creadas. {canManage ? "Crea la primera arriba, o importa el inventario completo." : "Pídele a un administrador o al almacenista que cree la primera."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {bodegas.map(b => {
            const myShelves = shelves.filter(s => s.bodegaId === b.id);
            const myItems = invItems.filter(i => i.bodegaId === b.id);
            const low = computeLowStock(myItems).length;
            return (
              <div key={b.id} className="relative">
                <button onClick={() => onSelectBodega(b.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>{b.name}</div>
                    {low > 0 && <Pill tone="red">{low} bajo stock</Pill>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.gray }}>
                    {myShelves.length} estantería{myShelves.length !== 1 ? "s" : ""} · {myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}
                  </div>
                </button>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); doDelete(b.id); }} className="absolute top-2 right-2 p-1">
                    <Trash2 size={13} color={C.gray} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BodegaShelvesView({ bodega, shelves, invItems, canManage, onBack, onSelectShelf, onCreateShelf, onDeleteShelf }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newShelf, setNewShelf] = useState(null);

  const doCreate = async () => {
    if (!code.trim()) return;
    setCreating(true);
    const rec = await onCreateShelf(bodega.id, code.trim(), name.trim());
    setNewShelf(rec);
    setCode(""); setName("");
    setCreating(false);
  };

  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a bodegas</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>{bodega.name} — Estanterías</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige una estantería para ver o retirar repuestos.</p>

      {canManage && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Crear estantería nueva</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código, ej. A-01"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 140 }} />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Descripción (opcional)"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 160 }} />
            <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Crear</Button>
          </div>
          {newShelf && (
            <div className="mt-3 flex items-start gap-3 flex-wrap">
              <QrCodeBox url={shelfUrl(newShelf.id)} label={`Estantería ${newShelf.code}`} filename={`qr-estanteria-${newShelf.code}.png`} />
              <div className="text-xs max-w-xs" style={{ color: C.inkSoft }}>
                Imprime este código y pégalo en la estantería <b>{newShelf.code}</b>. Al escanearlo con el celular, cualquier
                técnico llega directo a esta estantería en la app, sin tener que buscarla en el menú.
              </div>
            </div>
          )}
        </div>
      )}

      {shelves.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin estanterías todavía en esta bodega.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shelves.map(s => {
            const myItems = invItems.filter(i => i.shelfId === s.id);
            const low = computeLowStock(myItems).length;
            return (
              <div key={s.id} className="relative">
                <button onClick={() => onSelectShelf(s.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>Estantería {s.code}</div>
                    {low > 0 && <Pill tone="red">{low} bajo stock</Pill>}
                  </div>
                  {s.name && <div className="text-xs" style={{ color: C.inkSoft }}>{s.name}</div>}
                  <div className="text-xs mt-1" style={{ color: C.gray }}>{myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}</div>
                </button>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteShelf(s.id); }} className="absolute top-2 right-2 p-1">
                    <Trash2 size={13} color={C.gray} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShelfDetailView({ bodega, shelf, items, canManage, onBack, onCreateItem, onRetiro, onEntrada, onEditItem }) {
  const [showNewItem, setShowNewItem] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
  const [busyId, setBusyId] = useState(null);
  const [qtyDraft, setQtyDraft] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const doCreateItem = async () => {
    if (!form.name.trim()) return;
    await onCreateItem(shelf.id, bodega.id, form);
    setForm({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
    setShowNewItem(false);
  };

  const openMove = (itemId, mode) => setQtyDraft(prev => ({ ...prev, [itemId]: { mode, qty: "", note: "" } }));
  const closeMove = (itemId) => setQtyDraft(prev => { const n = { ...prev }; delete n[itemId]; return n; });

  const openEdit = (item) => { setEditingId(item.id); setEditForm({ name: item.name, sku: item.sku || "", unit: item.unit, minThreshold: item.minThreshold }); };
  const doSaveEdit = async (id) => {
    await onEditItem(id, { name: editForm.name.trim(), sku: editForm.sku.trim(), unit: editForm.unit.trim() || "unidad", minThreshold: Number(editForm.minThreshold) || 0 });
    setEditingId(null);
  };

  const doMove = async (item) => {
    const draft = qtyDraft[item.id];
    const n = Number(draft.qty);
    if (!n || n <= 0) return;
    setBusyId(item.id);
    if (draft.mode === "retiro") await onRetiro(item, n, draft.note);
    else await onEntrada(item, n, draft.note);
    setBusyId(null);
    closeMove(item.id);
  };

  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a {bodega.name}</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>
        Estantería {shelf.code}{shelf.name ? ` — ${shelf.name}` : ""}
      </h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{bodega.name} · {items.length} repuesto{items.length !== 1 ? "s" : ""}</p>

      <div className="flex items-start gap-3 flex-wrap mb-4">
        <QrCodeBox url={shelfUrl(shelf.id)} label={`Estantería ${shelf.code}`} filename={`qr-estanteria-${shelf.code}.png`} />
        {canManage && (
          <div className="flex-1 min-w-[240px]">
            <Button size="sm" icon={PlusCircle} onClick={() => setShowNewItem(v => !v)}>
              {showNewItem ? "Cancelar" : "Agregar repuesto a esta estantería"}
            </Button>
            {showNewItem && (
              <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del repuesto"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none col-span-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código / SKU (opcional)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unidad (ej. unidad, caja)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Cantidad inicial"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Mínimo para alertar"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </div>
                <Button size="sm" onClick={doCreateItem}>Guardar repuesto</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>Esta estantería todavía no tiene repuestos registrados.</p>
      ) : items.map(item => {
        const low = item.minThreshold > 0 && item.quantity <= item.minThreshold;
        const critical = item.minThreshold > 0 && item.quantity <= item.minThreshold * 0.5;
        const tone = critical ? C.red : low ? C.amber : null;
        const toneSoft = critical ? C.redSoft : low ? C.amberSoft : null;
        const barPct = item.minThreshold > 0 ? Math.min(100, (item.quantity / item.minThreshold) * 100) : 100;
        const draft = qtyDraft[item.id];
        return (
          <div key={item.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: tone || C.line, background: toneSoft || C.panel }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}>
                  {item.name}{item.sku ? <span style={{ color: C.gray }}> · {item.sku}</span> : ""}
                  {canManage && (
                    <button onClick={() => openEdit(item)} className="p-0.5"><Pencil size={12} color={C.gray} /></button>
                  )}
                </div>
                <div className="text-xs" style={{ color: C.gray }}>Mínimo: {item.minThreshold} {item.unit}</div>
                {critical && <div className="text-xs font-semibold mt-0.5" style={{ color: C.red }}>⚠ Stock crítico — reponer ya</div>}
                {low && !critical && <div className="text-xs font-semibold mt-0.5" style={{ color: "#8a5a00" }}>Stock bajo — hay que reponer</div>}
                {item.minThreshold > 0 && (
                  <div className="w-full max-w-[160px] rounded-full overflow-hidden mt-1.5" style={{ background: C.bg, height: 5 }}>
                    <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: tone || C.green, transition: "width 500ms var(--ease-out)" }} />
                  </div>
                )}
              </div>
              <div className="text-xl font-bold" style={{ color: tone || C.ink }}>
                {item.quantity} <span className="text-xs font-normal" style={{ color: C.gray }}>{item.unit}</span>
              </div>
            </div>

            {editingId === item.id && (
              <div className="rounded-md p-2 mt-2" style={{ background: C.bg }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre"
                    className="text-sm border rounded-md px-2 py-1 outline-none col-span-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código / SKU"
                    className="text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unidad"
                    className="text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <input type="number" min={0} value={editForm.minThreshold} onChange={e => setEditForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Mínimo"
                    className="text-sm border rounded-md px-2 py-1 outline-none col-span-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => doSaveEdit(item.id)}>Guardar cambios</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            {!draft && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" icon={PackageMinus} onClick={() => openMove(item.id, "retiro")}>Retirar</Button>
                {canManage && <Button size="sm" variant="ghost" icon={PackagePlus} onClick={() => openMove(item.id, "entrada")}>Registrar entrada</Button>}
              </div>
            )}
            {draft && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: C.inkSoft }}>{draft.mode === "retiro" ? "Retirar" : "Entrada de"} cantidad:</span>
                <input type="number" min={1} autoFocus value={draft.qty} onChange={e => setQtyDraft(prev => ({ ...prev, [item.id]: { ...draft, qty: e.target.value } }))}
                  className="w-20 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <input value={draft.note} onChange={e => setQtyDraft(prev => ({ ...prev, [item.id]: { ...draft, note: e.target.value } }))} placeholder="Motivo (opcional)"
                  className="text-sm border rounded-md px-2 py-1 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 140 }} />
                <Button size="sm" disabled={busyId === item.id} onClick={() => doMove(item)}>{busyId === item.id ? "Guardando…" : "Confirmar"}</Button>
                <Button size="sm" variant="ghost" onClick={() => closeMove(item.id)}>Cancelar</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InventoryView({ bodegas, shelves, invItems, isAdmin, isAlmacenista, onCreateBodega, onCreateShelf, onCreateItem, onRetiro, onEntrada, onEditItem, onImportInventory, onDeleteBodega, onDeleteShelf, initialShelfId, onConsumedInitialShelf }) {
  const [selectedBodegaId, setSelectedBodegaId] = useState(null);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const canManage = isAdmin || isAlmacenista;

  useEffect(() => {
    if (initialShelfId) {
      const shelf = shelves.find(s => s.id === initialShelfId);
      if (shelf) { setSelectedBodegaId(shelf.bodegaId); setSelectedShelfId(shelf.id); }
      onConsumedInitialShelf?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShelfId]);

  const shelf = selectedShelfId ? shelves.find(s => s.id === selectedShelfId) : null;
  const bodegaForShelf = shelf ? bodegas.find(b => b.id === shelf.bodegaId) : null;
  if (shelf && bodegaForShelf) {
    return (
      <ShelfDetailView bodega={bodegaForShelf} shelf={shelf} items={invItems.filter(i => i.shelfId === shelf.id)}
        canManage={canManage} onBack={() => setSelectedShelfId(null)}
        onCreateItem={onCreateItem} onRetiro={onRetiro} onEntrada={onEntrada} onEditItem={onEditItem} />
    );
  }

  const bodega = selectedBodegaId ? bodegas.find(b => b.id === selectedBodegaId) : null;
  if (bodega) {
    return (
      <BodegaShelvesView bodega={bodega} shelves={shelves.filter(s => s.bodegaId === bodega.id)} invItems={invItems}
        canManage={canManage} onBack={() => setSelectedBodegaId(null)} onSelectShelf={setSelectedShelfId} onCreateShelf={onCreateShelf} onDeleteShelf={onDeleteShelf} />
    );
  }

  return (
    <BodegasListView bodegas={bodegas} shelves={shelves} invItems={invItems} canManage={canManage}
      onSelectBodega={setSelectedBodegaId} onCreateBodega={onCreateBodega} onImportInventory={onImportInventory} onDeleteBodega={onDeleteBodega} />
  );
}

function StockAlertsView({ invItems, invMovements, bodegas, shelves, reportEmail, onLogSent, currentUser }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ---- Sugerencias de reorden (proyección por ritmo de consumo, no solo cuando ya está bajo) ----
  const [reorderNotes, setReorderNotes] = useState(null);
  const [reorderGenerating, setReorderGenerating] = useState(false);
  const [reorderError, setReorderError] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const low = useMemo(() => computeLowStock(invItems).map(it => ({
    ...it,
    bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
    shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
  })), [invItems, bodegas, shelves]);

  const forecast = useMemo(() => computeReorderForecast(invItems, invMovements).map(it => ({
    ...it,
    bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
    shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
  })), [invItems, invMovements, bodegas, shelves]);

  const doGenerateReorderNotes = async () => {
    setReorderGenerating(true); setReorderError(null); setReorderNotes(null);
    try {
      const res = await requestReorderNotes({ items: forecast.map(f => ({
        nombre: f.name, cantidadActual: f.quantity, unidad: f.unit, consumidoUltimos30dias: f.consumedInWindow,
        diasEstimadosRestantes: f.daysUntilOut, yaEstaBajoElMinimo: f.alreadyLow, cantidadSugerida: f.suggestedQty,
      })) });
      if (res.ok) { setReorderNotes(res.notes); bumpAiUsage("reorderNotes"); }
      else setReorderError(res.message || "No se pudo redactar la nota.");
    } catch {
      setReorderError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setReorderGenerating(false);
  };

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateStockAlertsPdf(low, currentUser);
      doc.save(`lista-de-compras-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };
  const doDownloadExcel = () => {
    setDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      const header = ["Repuesto", "SKU", "Bodega", "Estantería", "Cantidad actual", "Mínimo", "Unidad"];
      const data = low.map(it => [it.name, it.sku || "", it.bodegaName, it.shelfCode, it.quantity, it.minThreshold, it.unit]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, "Lista de compras");
      XLSX.writeFile(wb, `lista-de-compras-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel." }); }
    setDownloading(false);
  };
  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendStockAlertsEmailAuto(emailTo.trim(), low, currentUser);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Alertas de stock (correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Alertas de Stock</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Repuestos que llegaron a su cantidad mínima y necesitan reposición.</p>

      {low.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Todo el inventario está por encima de su mínimo. Nada que reponer por ahora.</p>
      ) : (
        <>
          <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Lista de compras</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
              <Button size="sm" variant="ghost" onClick={doDownload}>o descargar en PDF</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
                className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
              <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
            </div>
            {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
          </div>

          {forecast.length > 0 && (
            <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.amber, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={15} color={C.amber} />
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>
                  Se van a agotar pronto según el consumo — {forecast.length} repuesto(s)
                </div>
              </div>
              <p className="text-xs mb-3" style={{ color: C.gray }}>
                Esto no es solo "ya está bajo" — es una proyección con el ritmo real de los últimos 30 días. Algunos de estos
                todavía tienen stock por encima del mínimo, pero se están gastando rápido.
              </p>
              <div className="space-y-2 mb-3">
                {forecast.map(it => (
                  <div key={it.id} className="rounded-md p-2 flex items-center justify-between gap-2" style={{ background: it.alreadyLow ? C.redSoft : C.amberSoft }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: C.ink }}>
                        {it.name}{it.sku ? ` · ${it.sku}` : ""}
                        {it.alreadyLow && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.red, color: "#fff" }}>YA BAJO EL MÍNIMO</span>}
                      </div>
                      <div className="text-xs" style={{ color: C.inkSoft }}>
                        {it.bodegaName} · Estantería {it.shelfCode} · consumo: {it.dailyRate} {it.unit}/día
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: it.daysUntilOut <= 7 ? C.red : "#8a5a00" }}>
                        {it.daysUntilOut <= 0 ? "Ya agotado" : `${it.daysUntilOut} día(s)`}
                      </div>
                      <div className="text-xs" style={{ color: C.gray }}>pedir ≈ {it.suggestedQty} {it.unit}</div>
                    </div>
                  </div>
                ))}
              </div>

              {!reorderNotes && (
                <Button size="sm" icon={Sparkles} disabled={reorderGenerating} onClick={doGenerateReorderNotes}>
                  {reorderGenerating ? "Redactando…" : "Redactar nota de prioridad con IA"}
                </Button>
              )}
              {reorderError && <div className="text-xs mt-2" style={{ color: C.red }}>{reorderError}</div>}
              {reorderNotes && (
                <div className="mt-1">
                  <div className="text-sm rounded-md p-2 mb-2" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink }}>{reorderNotes}</div>
                  <Button size="sm" variant="ghost" disabled={reorderGenerating} onClick={doGenerateReorderNotes}>Volver a generar</Button>
                </div>
              )}
            </div>
          )}

          {low.map(it => (
            <div key={it.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium" style={{ color: C.ink }}>{it.name}{it.sku ? ` · ${it.sku}` : ""}</div>
                  <div className="text-xs" style={{ color: C.inkSoft }}>{it.bodegaName} · Estantería {it.shelfCode}</div>
                </div>
                <div className="text-sm font-bold" style={{ color: C.red }}>{it.quantity} / {it.minThreshold} {it.unit}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: TAREAS / PENDIENTES
   ============================================================ */
/* ============================================================
   DICTADO POR VOZ (usa el reconocimiento de voz que ya trae el navegador — sin costo)
   ============================================================ */
function VoiceInputButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognitionApi = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  if (!SpeechRecognitionApi) return null; // el navegador no lo soporta — no se muestra el botón, sin romper nada

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognitionApi();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button type="button" onClick={toggle} title={listening ? "Detener" : "Dictar por voz"}
      className="p-2 rounded-md shrink-0" style={{ background: listening ? C.red : C.blueSoft, color: listening ? "#fff" : C.blue }}>
      {listening ? <span className="pm-pulse block"><Mic size={15} /></span> : <Mic size={15} />}
    </button>
  );
}

/**
 * Panel lateral de detalle de una tarea: descripción, fotos de antes, cronología completa de
 * cambios de estado, y — si todavía no está finalizada — el flujo de cierre (foto obligatoria).
 * Si ya está finalizada, muestra las fotos de después y el botón para descargar el reporte.
 */
// Nombres de columna EXACTOS pedidos para el Kanban — por dentro se siguen usando los mismos
// códigos de estado de siempre (asignada/en-proceso/pausada/finalizada), solo cambia la etiqueta
// que se ve en esta vista, para no crear dos sistemas de estado distintos en la misma app.
const KANBAN_COLUMNS = [
  { code: "asignada", label: "Pendiente" },
  { code: "en-proceso", label: "En progreso" },
  { code: "pausada", label: "En espera de repuesto" },
  { code: "finalizada", label: "Hecho" },
];

/** Tarjeta compacta de una columna del Kanban — se puede arrastrar y soltar en otra columna
 * (escritorio) o tocar "Mover a…" para un menú rápido de un solo toque (más confiable en
 * celular/tablet, donde arrastrar y soltar es más difícil de acertar con el dedo). */
function TaskKanbanCard({ task, accounts, canAct, onOpenDrawer, onMove, onZoom }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const estado = normalizeTaskState(task.estado);
  const assigneeName = task.asignadoA ? (accounts[task.asignadoA]?.display_name || task.asignadoA) : null;
  return (
    <div draggable={canAct} onDragStart={e => e.dataTransfer.setData("text/plain", task.id)}
      className="rounded-lg border p-2.5 mb-2 cursor-pointer" style={{ borderColor: C.line, background: C.panel, minHeight: 48 }}
      onClick={() => onOpenDrawer(task.id)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-bold shrink-0" style={{ color: TASK_PRIORITY_COLORS[task.prioridad] }}>●</span>
        <div className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: C.ink }}>{task.titulo}</div>
        <Avatar name={assigneeName} size={20} />
      </div>
      <TaskTimer assignedAt={task.assignedAt} finishedAt={task.finishedAt} estado={estado} />
      {task.fotosAntes && task.fotosAntes.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
          {task.fotosAntes.slice(0, 3).map((url, i) => (
            <button key={i} onClick={() => onZoom(url)}>
              <img src={url} alt="" className="w-7 h-7 object-cover rounded border" style={{ borderColor: C.line }} />
            </button>
          ))}
        </div>
      )}
      {canAct && estado !== "finalizada" && (
        <div className="relative mt-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(v => !v)} className="text-[10px] font-semibold px-1.5 rounded-md w-full text-center" style={{ background: C.bg, color: C.inkSoft, minHeight: 26 }}>
            Mover a…
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute z-20 mt-1 w-full rounded-md border shadow-lg overflow-hidden" style={{ background: C.panel, borderColor: C.line }}>
                {KANBAN_COLUMNS.filter(c => c.code !== estado).map(c => (
                  <button key={c.code} onClick={() => { onMove(task, c.code); setMenuOpen(false); }}
                    className="block w-full text-left text-xs px-2.5 hover:bg-black/5" style={{ color: C.ink, minHeight: 36 }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TaskDrawer({ task, accounts, canAct, onClose, onTransition, onCloseTask, onDownloadReport, downloadingReport, onZoom }) {
  const [closePhotos, setClosePhotos] = useState([]);
  const [closeNote, setCloseNote] = useState("");
  const [closeSaving, setCloseSaving] = useState(false);
  const [closeMsg, setCloseMsg] = useState(null);

  const estado = normalizeTaskState(task.estado);
  const stateColors = TASK_STATE_COLORS[estado];
  const assigneeName = task.asignadoA ? (accounts[task.asignadoA]?.display_name || task.asignadoA) : "Sin asignar";

  const doClose = async () => {
    if (closePhotos.length === 0) { setCloseMsg({ ok: false, text: "Necesitas al menos una foto de cómo quedó, para poder cerrarla." }); return; }
    setCloseSaving(true); setCloseMsg(null);
    try {
      await onCloseTask(task, closePhotos, closeNote.trim());
      onClose();
    } catch (e) {
      setCloseMsg({ ok: false, text: e.message || "No se pudo cerrar la tarea." });
    }
    setCloseSaving(false);
  };

  const timeline = [...(task.timeLog || [])].sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <>
      <div className="fixed inset-0" style={{ background: "rgba(10,14,20,0.5)", zIndex: 150 }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] overflow-y-auto pm-stagger-in" style={{ background: C.panel, zIndex: 151, boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" }}>
        <div className="sticky top-0 flex items-start justify-between gap-2 p-4 border-b" style={{ background: C.panel, borderColor: C.line }}>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: stateColors.bg, color: stateColors.fg }}>{TASK_STATES.find(s => s.code === estado)?.label || estado}</span>
            <div className="text-base font-semibold mt-1" style={{ color: C.ink }}>{task.titulo}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full shrink-0" style={{ color: C.gray }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Avatar name={assigneeName} size={32} />
            <div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{assigneeName}</div>
              <div className="text-xs" style={{ color: C.gray }}>Prioridad {TASK_PRIORITIES.find(p => p.code === task.prioridad)?.label}</div>
            </div>
            <div className="ml-auto"><TaskTimer assignedAt={task.assignedAt} finishedAt={task.finishedAt} estado={estado} /></div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Descripción</div>
            <div className="text-sm" style={{ color: C.ink }}>{task.descripcion || "Sin descripción adicional."}</div>
          </div>

          {task.fotosAntes && task.fotosAntes.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Fotos — antes</div>
              <div className="flex items-center gap-2 flex-wrap">
                {task.fotosAntes.map((url, pi) => (
                  <button key={pi} onClick={() => onZoom(url)}>
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.gray }}>Cronología</div>
            <div className="space-y-1.5">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: C.ink }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TASK_STATE_COLORS[normalizeTaskState(ev.estado)]?.fg || C.gray }} />
                    {TASK_STATES.find(s => s.code === normalizeTaskState(ev.estado))?.label || ev.estado}
                  </span>
                  <span style={{ color: C.gray }}>{fmtDT(ev.at)}</span>
                </div>
              ))}
            </div>
          </div>

          {estado === "finalizada" ? (
            <>
              {task.fotosDespues && task.fotosDespues.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.green }}>Fotos — después</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.fotosDespues.map((url, pi) => (
                      <button key={pi} onClick={() => onZoom(url)}>
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.green }} />
                      </button>
                    ))}
                  </div>
                  {task.notaCierre && <div className="text-xs mt-2 italic" style={{ color: C.inkSoft }}>"{task.notaCierre}"</div>}
                </div>
              )}
              <Button icon={Download} disabled={downloadingReport} onClick={() => onDownloadReport(task)} className="w-full justify-center">
                {downloadingReport ? "Generando…" : "Descargar reporte de cierre"}
              </Button>
            </>
          ) : canAct ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {estado === "asignada" && <Button size="sm" onClick={() => onTransition(task, "en-proceso")}>▶ Iniciar</Button>}
                {estado === "en-proceso" && <Button size="sm" variant="ghost" onClick={() => onTransition(task, "pausada")}>⏸ Pausar</Button>}
                {estado === "pausada" && <Button size="sm" onClick={() => onTransition(task, "en-proceso")}>▶ Reanudar</Button>}
              </div>
              <div className="rounded-md p-2.5" style={{ background: C.bg }}>
                <div className="text-xs font-semibold mb-1.5" style={{ color: C.ink }}>Cerrar tarea — sube al menos una foto de cómo quedó</div>
                <PhotoPicker photos={closePhotos} onChange={setClosePhotos} max={4} />
                <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2} placeholder="Nota de cierre (opcional)"
                  className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mt-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                {closeMsg && <div className="text-xs mt-1.5" style={{ color: closeMsg.ok ? C.green : C.red }}>{closeMsg.text}</div>}
                <Button size="sm" disabled={closeSaving} onClick={doClose} className="w-full justify-center mt-2">{closeSaving ? "Guardando…" : "✓ Confirmar cierre"}</Button>
              </div>
            </>
          ) : (
            <div className="text-xs rounded-md p-2.5" style={{ background: C.bg, color: C.gray }}>Solo la persona asignada (o un administrador) puede cambiar el estado de esta tarea.</div>
          )}
        </div>
      </div>
    </>
  );
}

function TasksView({ tasks, accounts, employees, scheduleEntries, currentUser, currentUsername, isAdmin, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  const [filterEstado, setFilterEstado] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "", fotosAntes: [] });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [assignMode, setAssignMode] = useState("now"); // "now" (por defecto) | "manual"
  const [assignDate, setAssignDate] = useState(() => localDateIso(new Date()));
  const [assignShift, setAssignShift] = useState(SHIFTS[0]);
  const [showAllForAssign, setShowAllForAssign] = useState(false);

  const usernames = Object.keys(accounts || {});
  // Quién está trabajando en este preciso momento, según la hora real de entrada/salida de cada
  // quien en el Horario Mensual — esta es la asignación por defecto (Asignación Inteligente por
  // Turno). El picker manual de día/turno sigue disponible para reasignar a otra persona.
  const workingNowIds = useMemo(
    () => new Set(employeesWorkingNow(employees, scheduleEntries).map(e => e.id)),
    [employees, scheduleEntries]
  );
  const onShiftEmployeeIds = useMemo(
    () => new Set(employeesOnShift(employees, scheduleEntries, assignDate, assignShift).map(e => e.id)),
    [employees, scheduleEntries, assignDate, assignShift]
  );
  const assignableUsernames = assignMode === "now"
    ? usernames.filter(u => workingNowIds.has(accounts[u]?.linked_employee_id))
    : showAllForAssign
      ? usernames
      : usernames.filter(u => onShiftEmployeeIds.has(accounts[u]?.linked_employee_id));

  // Preasigna automáticamente a la primera persona disponible (modo "ahora mismo"), sin pisar
  // una elección manual que ya haya hecho quien está creando la tarea.
  useEffect(() => {
    if (showNew && assignMode === "now" && !form.asignadoA && assignableUsernames.length > 0) {
      setForm(f => f.asignadoA ? f : { ...f, asignadoA: assignableUsernames[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNew, assignMode, assignableUsernames.join("|")]);

  const doCreate = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true); setSaveMsg(null);
    try {
      const { fotosAntes, ...rest } = form;
      const res = await saveRecordWithPhotos(
        "task",
        { ...rest, titulo: rest.titulo.trim() },
        fotosAntes,
        async (payload, urls) => { await onCreateTask({ ...payload, fotosAntes: urls }); }
      );
      setForm({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "", fotosAntes: [] });
      setShowNew(false);
      if (res.queued) setSaveMsg({ ok: true, text: "✓ Tarea guardada en este celular — no había señal. Se sube sola apenas vuelva." });
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message || "No se pudo crear la tarea." });
    }
    setSaving(false);
  };

  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // ===== Filtros avanzados (además de los botones de estado) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterOperario, setFilterOperario] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState("");

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const hasAdvancedFilters = dateFrom || dateTo || filterTurno || filterOperario || filterPrioridad;
  const clearAdvancedFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterOperario(""); setFilterPrioridad(""); };

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const filtered = tasks
    .filter(t => !filterEstado || normalizeTaskState(t.estado) === filterEstado)
    .filter(t => {
      const d = new Date(t.createdAt);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(t.createdAt) !== filterTurno) return false;
      if (filterOperario && t.asignadoA !== filterOperario) return false;
      if (filterPrioridad && t.prioridad !== filterPrioridad) return false;
      return true;
    })
    .sort((a, b) => (priorityOrder[a.prioridad] - priorityOrder[b.prioridad]) || (new Date(b.createdAt) - new Date(a.createdAt)));

  const counts = TASK_STATES.reduce((acc, s) => { acc[s.code] = tasks.filter(t => normalizeTaskState(t.estado) === s.code).length; return acc; }, {});

  // ===== KPIs compactos =====
  const totalTareas = tasks.length;
  const cerradas = tasks.filter(t => normalizeTaskState(t.estado) === "finalizada");
  const tiempoCierrePromedio = useMemo(() => {
    const dur = cerradas.filter(t => t.assignedAt && t.finishedAt).map(t => hoursBetween(t.assignedAt, t.finishedAt));
    return dur.length ? dur.reduce((s, v) => s + v, 0) / dur.length : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);
  const criticasVencidas = tasks.filter(t => {
    const estado = normalizeTaskState(t.estado);
    if (estado === "finalizada" || t.prioridad !== "alta" || !t.assignedAt) return false;
    return hoursBetween(t.assignedAt, nowIso()) > 24;
  }).length;
  const cumplimientoPct = totalTareas > 0 ? Math.round((cerradas.length / totalTareas) * 100) : 100;

  /** Cambia de estado (Iniciar / Pausar / Reanudar) y deja registro en la cronología de la tarea.
   * "Finalizar" NO pasa por aquí — ese vive en el panel de detalle porque exige foto de evidencia. */
  const transitionTask = (t, newEstado) => {
    const patch = { estado: newEstado, timeLog: [...(t.timeLog || []), { estado: newEstado, at: nowIso() }] };
    if (newEstado === "en-proceso" && !t.startedAt) patch.startedAt = nowIso();
    onUpdateTask(t.id, patch);
  };

  const doCloseTask = async (t, photos, note) => {
    const res = await saveRecordWithPhotos(
      "task-close",
      { taskId: t.id, notaCierre: note },
      photos,
      async (payload, urls) => {
        await onUpdateTask(payload.taskId, {
          estado: "finalizada", finishedAt: nowIso(), fotosDespues: urls, notaCierre: payload.notaCierre,
          timeLog: [...(t.timeLog || []), { estado: "finalizada", at: nowIso() }],
        });
      }
    );
    if (res.queued) setSaveMsg({ ok: true, text: "✓ Cierre guardado en este celular — no había señal. Se sube solo apenas vuelva." });
  };

  const doDownloadReport = async (t) => {
    setDownloadingReportId(t.id);
    try {
      const doc = await generateTaskReportPdf(t, accounts[t.asignadoA]?.display_name || t.asignadoA || "Sin asignar");
      doc.save(`reporte-novedad-${t.titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40)}.pdf`);
    } catch { setSaveMsg({ ok: false, text: "No se pudo generar el reporte (revisa la conexión — necesita descargar las fotos)." }); }
    setDownloadingReportId(null);
  };

  const drawerTask = drawerTaskId ? tasks.find(t => t.id === drawerTaskId) : null;
  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Tareas / Pendientes</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>El buzón de lo que va saliendo en el día a día — cualquiera puede agregar, y se le da prioridad y seguimiento.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
            <button onClick={() => setViewMode("kanban")} className="px-2.5 font-semibold" style={{ background: viewMode === "kanban" ? C.steelDark : C.panel, color: viewMode === "kanban" ? "#fff" : C.inkSoft, minHeight: 36 }}>Kanban</button>
            <button onClick={() => setViewMode("list")} className="px-2.5 font-semibold" style={{ background: viewMode === "list" ? C.steelDark : C.panel, color: viewMode === "list" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}`, minHeight: 36 }}>Lista</button>
          </div>
          <Button icon={PlusCircle} onClick={() => setShowNew(v => !v)}>{showNew ? "Cancelar" : "Nueva tarea"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Tareas totales" value={totalTareas}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><ClipboardCheck size={18} color={C.blue} /></div>} />
        <StatCard label="Tiempo prom. de cierre" value={tiempoCierrePromedio != null ? fmtHours(tiempoCierrePromedio) : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <StatCard label="Críticas vencidas (>24h)" value={criticasVencidas} valueColor={criticasVencidas ? C.red : C.ink}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: criticasVencidas ? C.redSoft : C.greenSoft }}><AlertTriangle size={18} color={criticasVencidas ? C.red : C.green} /></div>} />
        <StatCard label="Cumplimiento" value={`${cumplimientoPct}%`} valueColor={cumplimientoPct >= 80 ? C.green : C.amber}
          leading={<MiniGauge value={cumplimientoPct} max={100} size={40} stroke={5} color={cumplimientoPct >= 80 ? C.green : C.amber} />} />
      </div>

      {showNew && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="flex items-center gap-1 mb-2">
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="¿Qué hay que hacer?"
              className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <VoiceInputButton onResult={text => setForm(f => ({ ...f, titulo: (f.titulo ? f.titulo + " " : "") + text }))} />
          </div>
          <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Detalles (opcional)"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="rounded-md p-2 mb-2" style={{ background: C.bg }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="text-xs font-medium" style={{ color: C.inkSoft }}>¿A quién se la vas a asignar?</div>
              <div className="flex rounded-md border overflow-hidden text-xs" style={{ borderColor: C.line }}>
                <button type="button" onClick={() => setAssignMode("now")}
                  className="px-2.5 py-1 font-semibold"
                  style={{ background: assignMode === "now" ? C.amber : C.panel, color: assignMode === "now" ? "#fff" : C.inkSoft }}>
                  Quien está de turno ahora
                </button>
                <button type="button" onClick={() => setAssignMode("manual")}
                  className="px-2.5 py-1 font-semibold" style={{ background: assignMode === "manual" ? C.amber : C.panel, color: assignMode === "manual" ? "#fff" : C.inkSoft, borderLeft: `1px solid ${C.line}` }}>
                  Elegir otro día/turno
                </button>
              </div>
            </div>

            {assignMode === "now" ? (
              assignableUsernames.length === 0 ? (
                <div className="text-xs" style={{ color: "#a31245" }}>
                  Nadie aparece trabajando ahora mismo según el Horario Mensual (o nadie ha vinculado su cuenta con su nombre del horario en Mi Perfil).
                  Usa "Elegir otro día/turno" para asignarla igual.
                </div>
              ) : (
                <div className="text-xs" style={{ color: C.inkSoft }}>
                  Se preasignó a <b style={{ color: C.ink }}>{accounts[assignableUsernames[0]]?.display_name || assignableUsernames[0]}</b>, quien está de turno ahora mismo
                  {assignableUsernames.length > 1 ? ` (también disponible: ${assignableUsernames.slice(1).map(u => accounts[u]?.display_name || u).join(", ")})` : ""}.
                  Puedes cambiarlo abajo si hace falta.
                </div>
              )
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <select value={assignShift} onChange={e => setAssignShift(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <label className="text-xs flex items-center gap-1.5 cursor-pointer select-none" style={{ color: C.inkSoft }}>
                    <input type="checkbox" checked={showAllForAssign} onChange={e => setShowAllForAssign(e.target.checked)} />
                    Ver a todos (no solo los de turno)
                  </label>
                </div>
                {!showAllForAssign && assignableUsernames.length === 0 && (
                  <div className="text-xs mb-2" style={{ color: "#a31245" }}>
                    Nadie aparece de turno ese día/hora según el Horario Mensual (o nadie ha vinculado su cuenta con su nombre del horario en Mi Perfil). Marca "Ver a todos" si hace falta.
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>Prioridad {p.label}</option>)}
            </select>
            <select value={form.asignadoA} onChange={e => setForm(f => ({ ...f, asignadoA: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <option value="">Sin asignar</option>
              {assignableUsernames.map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
            </select>
            <select value={form.recurrencia} onChange={e => setForm(f => ({ ...f, recurrencia: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {TASK_RECURRENCES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <div className="mb-2">
            <div className="text-xs font-medium mb-1.5" style={{ color: C.inkSoft }}>
              Fotos de la novedad (opcional) — así la persona asignada ve exactamente qué pasó y dónde, antes de ir a revisar.
            </div>
            <PhotoPicker photos={form.fotosAntes} onChange={fotosAntes => setForm(f => ({ ...f, fotosAntes }))} max={4} />
          </div>
          {saveMsg && <div className="text-xs mb-2" style={{ color: saveMsg.ok ? C.green : C.red }}>{saveMsg.text}</div>}
          <Button size="sm" disabled={saving} onClick={doCreate}>{saving ? "Guardando…" : "Crear tarea"}</Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <button onClick={() => setFilterEstado("")} className="text-xs font-medium px-2.5 py-1.5 rounded-full"
          style={{ background: !filterEstado ? C.steelDark : C.panel, color: !filterEstado ? "#fff" : C.inkSoft }}>
          Todas ({tasks.length})
        </button>
        {TASK_STATES.map(s => (
          <button key={s.code} onClick={() => setFilterEstado(s.code)} className="text-xs font-medium px-2.5 py-1.5 rounded-full"
            style={{ background: filterEstado === s.code ? C.steelDark : C.panel, color: filterEstado === s.code ? "#fff" : C.inkSoft }}>
            {s.label} ({counts[s.code] || 0})
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
          <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Operario</div>
          <select value={filterOperario} onChange={e => setFilterOperario(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {Object.keys(accounts || {}).map(u => <option key={u} value={u}>{accounts[u]?.display_name || u}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Prioridad</div>
          <select value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todas</option>
            {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
        </div>
        {hasAdvancedFilters && (
          <button onClick={clearAdvancedFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => normalizeTaskState(t.estado) === col.code);
            return (
              <div key={col.code} className="rounded-xl border p-2.5" style={{ borderColor: C.line, background: C.bg, minHeight: 140 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const taskId = e.dataTransfer.getData("text/plain");
                  const task = tasks.find(t => t.id === taskId);
                  if (!task || normalizeTaskState(task.estado) === col.code) return;
                  if (!(isAdmin || task.asignadoA === currentUsername)) return;
                  if (col.code === "finalizada") setDrawerTaskId(task.id);
                  else transitionTask(task, col.code);
                }}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: C.inkSoft }}>{col.label}</div>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.panel, color: C.gray }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 ? (
                  <div className="text-[11px] text-center py-4" style={{ color: C.gray }}>Vacío</div>
                ) : colTasks.map(t => (
                  <TaskKanbanCard key={t.id} task={t} accounts={accounts} canAct={isAdmin || t.asignadoA === currentUsername}
                    onOpenDrawer={setDrawerTaskId}
                    onMove={(task, code) => code === "finalizada" ? setDrawerTaskId(task.id) : transitionTask(task, code)}
                    onZoom={setLightboxUrl} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && (filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Nada por aquí — todo al día.</p>
      ) : filtered.map((t, i) => {
        const estado = normalizeTaskState(t.estado);
        const stateColors = TASK_STATE_COLORS[estado];
        const canDelete = isAdmin || t.createdBy === currentUser;
        const canAct = isAdmin || t.asignadoA === currentUsername;
        const assigneeName = t.asignadoA ? (accounts[t.asignadoA]?.display_name || t.asignadoA) : null;
        return (
          <div key={t.id} className="pm-stagger-in rounded-lg border p-3 mb-2 cursor-pointer transition hover:shadow-sm"
            style={{ borderColor: C.line, background: C.panel, color: C.ink, animationDelay: `${Math.min(i, 12) * 35}ms` }}
            onClick={() => setDrawerTaskId(t.id)}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
                <Avatar name={assigneeName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold" style={{ color: TASK_PRIORITY_COLORS[t.prioridad] }}>● {TASK_PRIORITIES.find(p => p.code === t.prioridad)?.label}</span>
                    <div className="text-sm font-semibold" style={{ color: C.ink }}>{t.titulo}</div>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: stateColors.bg, color: stateColors.fg }}>{TASK_STATES.find(s => s.code === estado)?.label || estado}</span>
                    {estado === "pausada" && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: C.amberSoft, color: "#8a5a00" }}>
                        ⏳ En espera
                      </span>
                    )}
                  </div>
                  {t.descripcion && <div className="text-xs mt-0.5 truncate" style={{ color: C.inkSoft }}>{t.descripcion}</div>}
                  <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: C.gray }}>
                    <span>{assigneeName || "Sin asignar"} · {fmtDT(t.createdAt)}</span>
                    {t.recurrencia && <span>🔁 {t.recurrencia === "semanal" ? "Semanal" : "Mensual"}</span>}
                    <TaskTimer assignedAt={t.assignedAt} finishedAt={t.finishedAt} estado={estado} />
                  </div>
                  {t.fotosAntes && t.fotosAntes.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5" onClick={e => e.stopPropagation()}>
                      {t.fotosAntes.map((url, pi) => (
                        <button key={pi} onClick={() => setLightboxUrl(url)}>
                          <img src={url} alt="" className="w-10 h-10 object-cover rounded-md border" style={{ borderColor: C.line }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                {canAct && estado === "asignada" && (
                  <Button size="sm" onClick={() => transitionTask(t, "en-proceso")}>▶ Iniciar</Button>
                )}
                {canAct && estado === "en-proceso" && (
                  <Button size="sm" variant="ghost" onClick={() => transitionTask(t, "pausada")}>⏸ Pausar</Button>
                )}
                {canAct && estado === "pausada" && (
                  <Button size="sm" onClick={() => transitionTask(t, "en-proceso")}>▶ Reanudar</Button>
                )}
                {estado === "finalizada" && (
                  <Button size="sm" variant="ghost" icon={Download} disabled={downloadingReportId === t.id} onClick={() => doDownloadReport(t)}>
                    {downloadingReportId === t.id ? "Generando…" : "Reporte"}
                  </Button>
                )}
                {canDelete && (
                  <button onClick={() => onDeleteTask(t.id)} className="p-1"><Trash2 size={14} color={C.gray} /></button>
                )}
              </div>
            </div>
          </div>
        );
      }))}

      {drawerTask && (
        <TaskDrawer task={drawerTask} accounts={accounts} canAct={isAdmin || drawerTask.asignadoA === currentUsername}
          onClose={() => setDrawerTaskId(null)} onTransition={transitionTask} onCloseTask={doCloseTask}
          onDownloadReport={doDownloadReport} downloadingReport={downloadingReportId === drawerTask.id} onZoom={setLightboxUrl} />
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}

function InventoryMovementsView({ invMovements, invItems, bodegas, shelves, reportEmail, onLogSent, currentUser }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const rows = useMemo(() => {
    return invMovements.map(mv => {
      const item = invItems.find(it => it.id === mv.itemId);
      const shelf = item ? shelves.find(s => s.id === item.shelfId) : null;
      const bodega = item ? bodegas.find(b => b.id === item.bodegaId) : null;
      return {
        fecha: mv.at, tipo: mv.type === "retiro" ? "Retiro" : mv.type === "entrada" ? "Entrada" : mv.type,
        repuesto: item?.name || "(repuesto eliminado)", sku: item?.sku || "", bodega: bodega?.name || "—",
        estanteria: shelf?.code || "—", cantidad: mv.quantity, saldo: mv.balanceAfter, por: mv.by, nota: mv.note || "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invMovements, invItems, bodegas, shelves]);

  const filtered = search.trim()
    ? rows.filter(r => `${r.repuesto} ${r.sku} ${r.bodega} ${r.estanteria} ${r.por}`.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Fecha", "Tipo", "Repuesto", "SKU", "Bodega", "Estantería", "Cantidad", "Saldo después", "Por", "Nota"];
    const data = filtered.map(r => [fmtDT(r.fecha), r.tipo, r.repuesto, r.sku, r.bodega, r.estanteria, r.cantidad, r.saldo, r.por, r.nota]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 18 }, { wch: 9 }, { wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    return wb;
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `movimientos-inventario-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    try {
      const wb = buildWorkbook();
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = bufferToBase64(out);
      const resp = await fetch("/api/send-report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `Movimientos de Inventario (Excel) — ${todayStr()}`,
          text: `Historial de movimientos de inventario (${filtered.length} registros) en Excel.`,
          attachmentBase64: base64,
          filename: `movimientos-inventario-${todayStr().replace(/\//g, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Movimientos de inventario (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Movimientos de Inventario</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Cada retiro y entrada queda registrado aquí — quién lo hizo, cuánto, de dónde, y cuánto quedó después. En tiempo real, apenas alguien escanea una estantería y confirma.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar en Excel</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por repuesto, bodega, estantería o quién lo hizo…"
        className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2">Fecha</th>
              <th className="text-left px-2 py-2">Tipo</th>
              <th className="text-left px-2 py-2">Repuesto</th>
              <th className="text-left px-2 py-2">Bodega / Estantería</th>
              <th className="text-right px-2 py-2">Cantidad</th>
              <th className="text-right px-2 py-2">Saldo</th>
              <th className="text-left px-2 py-2">Por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{fmtDT(r.fecha)}</td>
                <td className="px-2 py-1.5" style={{ color: r.tipo === "Retiro" ? C.red : C.green, fontWeight: 600 }}>{r.tipo}</td>
                <td className="px-2 py-1.5" style={{ color: C.ink }}>{r.repuesto}</td>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{r.bodega} · {r.estanteria}</td>
                <td className="px-2 py-1.5 text-right" style={{ color: C.ink }}>{r.cantidad}</td>
                <td className="px-2 py-1.5 text-right font-semibold" style={{ color: C.ink }}>{r.saldo}</td>
                <td className="px-2 py-1.5" style={{ color: C.inkSoft }}>{r.por}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-xs" style={{ color: C.gray }}>Sin movimientos registrados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 300 && <div className="text-xs mt-2" style={{ color: C.gray }}>Mostrando los 300 más recientes — descarga el Excel para ver todos ({filtered.length}).</div>}
    </div>
  );
}

/* ============================================================
   MANTENIMIENTO — componentes de vista
   ============================================================ */
const MTTO_TIPOS = [
  { code: "preventivo", label: "Preventivo" },
  { code: "correctivo", label: "Correctivo (falla)" },
  { code: "inspeccion", label: "Inspección" },
];
const MTTO_ESTADOS = [
  { code: "funcionando", label: "Funcionando" },
  { code: "fuera-de-servicio", label: "Fuera de servicio" },
];

function SistemasListView({ equipos, mttoLog, canManage, onSelectSistema, onSelectEquipo, onCreateEquipo, onImportCatalog }) {
  const [sistema, setSistema] = useState("");
  const [nombre, setNombre] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const doCreate = async () => {
    if (!sistema.trim() || !nombre.trim()) return;
    setCreating(true);
    await onCreateEquipo(sistema.trim(), nombre.trim());
    setNombre("");
    setCreating(false);
  };

  const doImport = async () => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await onImportCatalog();
      setImportMsg({ ok: true, text: `Listo: ${res.newEquiposCount} equipo(s) nuevo(s), ${res.newCronoCount} registro(s) del cronograma anual, y ${res.newLogsCount} mantenimiento(s) ya ejecutados cargados al historial.` });
    } catch { setImportMsg({ ok: false, text: "No se pudo importar. Intenta de nuevo." }); }
    setImporting(false);
  };

  const doDownloadAllQr = async () => {
    setGeneratingQr(true);
    try {
      const doc = await generateAllEquiposQrPdf(equipos.filter(e => e.active !== false));
      doc.save("codigos-qr-equipos-mantenimiento.pdf");
    } catch { setImportMsg({ ok: false, text: "No se pudieron generar los códigos QR." }); }
    setGeneratingQr(false);
  };

  const sistemas = useMemo(() => {
    const map = {};
    equipos.filter(e => e.active !== false).forEach(e => {
      if (!map[e.sistema]) map[e.sistema] = [];
      map[e.sistema].push(e);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipos]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mantenimiento — Sistemas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige un sistema para ver sus equipos y registrar mantenimientos.</p>

      {canManage && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: "#7a5405" }}>
          <span>¿Primera vez usando esto? Importa de una vez el cronograma completo (925 equipos, el año completo programado, y los ~914 mantenimientos ya ejecutados con su fecha y técnico).</span>
          <Button size="sm" disabled={importing} onClick={doImport}>{importing ? "Importando…" : "Importar cronograma completo"}</Button>
        </div>
      )}
      {canManage && equipos.length > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.blueSoft, color: "#274c6e" }}>
          <span>Descarga en un solo PDF todos los códigos QR de todos los equipos, listos para imprimir y pegar.</span>
          <Button size="sm" variant="ghost" disabled={generatingQr} onClick={doDownloadAllQr}>{generatingQr ? "Generando…" : "Descargar todos los QR"}</Button>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {canManage && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar equipo nuevo</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={sistema} onChange={e => setSistema(e.target.value)} placeholder="Sistema (ej. HVAC)"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 160 }} />
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del equipo"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
            <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Agregar</Button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar un equipo en cualquier sistema…"
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {search.trim() ? (
        (() => {
          const q = search.trim().toLowerCase();
          const matches = equipos.filter(e => e.active !== false && e.nombre.toLowerCase().includes(q));
          if (matches.length === 0) return <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin resultados para "{search}".</p>;
          return (
            <div className="grid grid-cols-2 gap-3">
              {matches.map(eq => {
                const status = currentEquipoStatus(eq.id, mttoLog);
                return (
                  <button key={eq.id} onClick={() => onSelectEquipo(eq.id)}
                    className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: status.outOfService ? C.red : C.line, background: status.outOfService ? C.redSoft : C.panel }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold" style={{ color: C.ink }}>{eq.nombre}</div>
                      {status.outOfService && <Pill tone="red">Fuera de servicio</Pill>}
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.gray }}>{eq.sistema}</div>
                  </button>
                );
              })}
            </div>
          );
        })()
      ) : sistemas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no hay equipos registrados. {canManage ? "Importa el catálogo o agrega uno arriba." : "Pídele a un administrador que los cargue."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sistemas.map(([sistemaName, eqs]) => {
            const outCount = eqs.filter(e => currentEquipoStatus(e.id, mttoLog).outOfService).length;
            return (
              <button key={sistemaName} onClick={() => onSelectSistema(sistemaName)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{sistemaName}</div>
                  {outCount > 0 && <Pill tone="red">{outCount} fuera de servicio</Pill>}
                </div>
                <div className="text-xs mt-1" style={{ color: C.gray }}>{eqs.length} equipo{eqs.length !== 1 ? "s" : ""}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SistemaEquiposView({ sistema, equipos, mttoLog, canManage, onBack, onSelectEquipo, onDeleteEquipo }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const visEquipos = q ? equipos.filter(eq => eq.nombre.toLowerCase().includes(q)) : equipos;
  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a sistemas</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>{sistema}</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Elige un equipo para ver su historial o registrar un mantenimiento.</p>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar un equipo de ${sistema}…`}
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>

      {visEquipos.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>{q ? `Sin resultados para "${search}".` : "Sin equipos en este sistema."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visEquipos.map(eq => {
            const status = currentEquipoStatus(eq.id, mttoLog);
            const stats = computeEquipoStats(eq, mttoLog);
            return (
              <div key={eq.id} className="relative">
                <button onClick={() => onSelectEquipo(eq.id)}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition w-full" style={{ borderColor: status.outOfService ? C.red : C.line, background: status.outOfService ? C.redSoft : C.panel }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold pr-5" style={{ color: C.ink }}>{eq.nombre}</div>
                    {status.outOfService && <Pill tone="red">Fuera de servicio</Pill>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.gray }}>{stats.total} mantenimiento{stats.total !== 1 ? "s" : ""} registrado{stats.total !== 1 ? "s" : ""}</div>
                </button>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteEquipo(eq.id); }} className="absolute top-2 right-2 p-1">
                    <Trash2 size={13} color={C.gray} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhotoPicker({ photos, onChange, max = 2 }) {
  const inputRef = useRef(null);
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, max - photos.length);
    onChange([...photos, ...files]);
    e.target.value = "";
  };
  const removeAt = (i) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {photos.map((f, i) => (
          <div key={i} className="relative">
            <img src={typeof f === "string" ? f : URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <button type="button" onClick={() => removeAt(i)} className="absolute -top-1.5 -right-1.5 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              style={{ background: C.red, color: "#fff" }}>×</button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center text-xs" style={{ borderColor: C.line, background: C.panel, color: C.gray }}>
            + Foto
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
    </div>
  );
}

function EquipoDetailView({ equipo, records, onBack, onLogMaintenance }) {
  const [tipo, setTipo] = useState("preventivo");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("funcionando");
  const [costo, setCosto] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const status = currentEquipoStatus(equipo.id, records);
  const stats = useMemo(() => computeEquipoStats(equipo, records), [equipo, records]);
  const partsChanged = useMemo(() => detectPartsChanged(records), [records]);
  const fechaAlta = records.length ? records.reduce((a, b) => new Date(a.fecha) < new Date(b.fecha) ? a : b).fecha : equipo.createdAt;
  const [downloadingHV, setDownloadingHV] = useState(false);

  const doDownloadHojaVida = async () => {
    setDownloadingHV(true);
    try {
      const doc = await generateHojaVidaPdf(equipo, records, stats, partsChanged, fechaAlta);
      doc.save(`hoja-de-vida-${equipo.nombre.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch { /* no bloquea el resto de la pantalla si falla */ }
    setDownloadingHV(false);
  };

  const doDownloadQr = async () => {
    setDownloadingQr(true);
    try {
      const dataUrl = await QRCode.toDataURL(equipoUrl(equipo.id), { width: 320, margin: 1 });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `qr-equipo-${equipo.nombre.replace(/[^a-z0-9]+/gi, "-")}.png`; a.click();
    } catch { /* noop */ }
    setDownloadingQr(false);
  };

  const doSave = async () => {
    if (!descripcion.trim()) { setSaveMsg({ ok: false, text: "Escribe qué se hizo." }); return; }
    setSaving(true); setSaveMsg(null);
    try {
      const res = await saveRecordWithPhotos(
        "maintenance",
        { equipoId: equipo.id, tipo, descripcion: descripcion.trim(), estado, costo },
        photos,
        async (payload, urls) => { await onLogMaintenance(payload.equipoId, { ...payload, fotos: urls }); }
      );
      setDescripcion(""); setCosto(""); setPhotos([]); setTipo("preventivo"); setEstado("funcionando");
      setSaveMsg(res.queued
        ? { ok: true, text: "✓ Guardado en este celular — no había señal. Se sube solo apenas vuelva, sin que tengas que escribir nada de nuevo." }
        : { ok: true, text: "✓ Mantenimiento registrado." });
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message || "No se pudo guardar." });
    }
    setSaving(false);
  };

  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a {equipo.sistema}</Button>
      <div className="flex items-start justify-between flex-wrap gap-2 mt-2 mb-1">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>{equipo.nombre}</h2>
        {status.outOfService && <Pill tone="red">Fuera de servicio desde {fmtDT(status.since)}</Pill>}
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{equipo.sistema} · {records.length} mantenimiento{records.length !== 1 ? "s" : ""} registrado{records.length !== 1 ? "s" : ""}</p>

      <div className="flex items-start gap-3 flex-wrap mb-4">
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <Button size="sm" variant="ghost" icon={Download} disabled={downloadingQr} onClick={doDownloadQr}>{downloadingQr ? "Generando…" : "Descargar QR"}</Button>
        </div>

        <div className="flex-1 min-w-[260px] rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Registrar mantenimiento</div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {MTTO_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              {MTTO_ESTADOS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <input type="number" min="0" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Costo (opcional)"
              className="text-sm border rounded-md px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          </div>
          <div className="flex items-start gap-1.5 mb-2">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="¿Qué se hizo?"
              className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <VoiceInputButton onResult={text => setDescripcion(d => (d ? d + " " : "") + text)} />
          </div>
          <div className="text-xs mb-1" style={{ color: C.gray }}>Fotos (opcional, hasta 2)</div>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <div className="mt-2">
            <Button size="sm" disabled={saving} onClick={doSave}>{saving ? "Guardando…" : "Guardar registro"}</Button>
          </div>
          {saveMsg && <div className="text-xs mt-2" style={{ color: saveMsg.ok ? C.green : C.red }}>{saveMsg.text}</div>}
        </div>
      </div>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Hoja de vida</div>
          <Button size="sm" variant="ghost" icon={Download} disabled={downloadingHV} onClick={doDownloadHojaVida}>
            {downloadingHV ? "Generando…" : "Descargar hoja de vida (PDF)"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Primer registro</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{fechaAlta ? fmtDT(fechaAlta).split(",")[0] : "—"}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Mantenimientos totales</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{stats.total} ({stats.correctivos} correctivos)</div>
          </div>
          <div className="rounded-md p-2" style={{ background: C.bg }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Costo acumulado</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{stats.costoTotal ? `$${stats.costoTotal.toLocaleString("es-CO")}` : "—"}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: status.outOfService ? C.redSoft : C.greenSoft }}>
            <div className="text-[10px]" style={{ color: C.gray }}>Estado actual</div>
            <div className="text-sm font-semibold" style={{ color: status.outOfService ? C.red : C.green }}>{status.outOfService ? "Fuera de servicio" : "Funcionando"}</div>
          </div>
        </div>
        {partsChanged.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.inkSoft }}>Piezas cambiadas (detectado en las descripciones)</div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(partsChanged.map(p => p.parte))].map(parte => {
                const ultima = partsChanged.find(p => p.parte === parte);
                return (
                  <span key={parte} className="text-xs px-2 py-1 rounded-full" style={{ background: C.amberSoft, color: "#7a5405" }} title={ultima.descripcion}>
                    {parte} · {fmtDT(ultima.fecha).split(",")[0]}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Historial</div>
      {records.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin mantenimientos registrados todavía.</p>
      ) : records.map(r => (
        <div key={r.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: r.estado === "fuera-de-servicio" ? C.red : C.line, background: r.estado === "fuera-de-servicio" ? C.redSoft : C.panel }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-semibold" style={{ color: C.ink }}>
              {MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo} · {fmtDT(r.fecha)}
            </div>
            <Pill tone={r.estado === "fuera-de-servicio" ? "red" : "green"}>{MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado}</Pill>
          </div>
          <div className="text-sm mt-1" style={{ color: C.inkSoft }}>{r.descripcion}</div>
          <div className="text-xs mt-1" style={{ color: C.gray }}>Por {r.tecnico}{r.costo ? ` · Costo: ${r.costo.toLocaleString("es-CO")}` : ""}</div>
          {r.fotos && r.fotos.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {r.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MaintenanceView({ equipos, mttoLog, isAdmin, isAlmacenista, onCreateEquipo, onImportCatalog, onLogMaintenance, onDeleteEquipo, initialEquipoId, onConsumedInitialEquipo }) {
  const [selectedSistema, setSelectedSistema] = useState(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState(null);
  const canManage = isAdmin || isAlmacenista;

  useEffect(() => {
    if (initialEquipoId) {
      const eq = equipos.find(e => e.id === initialEquipoId);
      if (eq) { setSelectedSistema(eq.sistema); setSelectedEquipoId(eq.id); }
      onConsumedInitialEquipo?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEquipoId]);

  const equipo = selectedEquipoId ? equipos.find(e => e.id === selectedEquipoId) : null;
  if (equipo) {
    const records = mttoLog.filter(m => m.equipoId === equipo.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return <EquipoDetailView equipo={equipo} records={records} onBack={() => setSelectedEquipoId(null)} onLogMaintenance={onLogMaintenance} />;
  }

  if (selectedSistema) {
    const eqs = equipos.filter(e => e.sistema === selectedSistema && e.active !== false);
    return <SistemaEquiposView sistema={selectedSistema} equipos={eqs} mttoLog={mttoLog} canManage={canManage} onBack={() => setSelectedSistema(null)} onSelectEquipo={setSelectedEquipoId} onDeleteEquipo={onDeleteEquipo} />;
  }

  return (
    <SistemasListView equipos={equipos} mttoLog={mttoLog} canManage={canManage}
      onSelectSistema={setSelectedSistema} onSelectEquipo={setSelectedEquipoId} onCreateEquipo={onCreateEquipo} onImportCatalog={onImportCatalog} />
  );
}

function MaintenanceLogAuditView({ equipos, mttoLog, reportEmail, onLogSent, currentUser }) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const rows = useMemo(() => {
    return [...mttoLog].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(r => {
      const eq = equipos.find(e => e.id === r.equipoId);
      return { ...r, equipoNombre: eq?.nombre || "(equipo eliminado)", sistema: eq?.sistema || "—" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const filtered = rows.filter(r => {
    if (filterTipo && r.tipo !== filterTipo) return false;
    if (!search.trim()) return true;
    return `${r.equipoNombre} ${r.sistema} ${r.tecnico} ${r.descripcion}`.toLowerCase().includes(search.toLowerCase());
  });

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Fecha", "Sistema", "Equipo", "Tipo", "Estado", "Técnico", "Descripción", "Costo", "Fotos"];
    const data = filtered.map(r => [fmtDT(r.fecha), r.sistema, r.equipoNombre, MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo,
      MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado, r.tecnico, r.descripcion, r.costo || "", (r.fotos || []).join(" | ")]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
    return wb;
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `mantenimientos-realizados-${todayStr().replace(/\//g, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    try {
      const wb = buildWorkbook();
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = bufferToBase64(out);
      const resp = await fetch("/api/send-report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `Mantenimientos Realizados (Excel) — ${todayStr()}`,
          text: `Historial de mantenimientos realizados (${filtered.length} registros) en Excel.`,
          attachmentBase64: base64,
          filename: `mantenimientos-realizados-${todayStr().replace(/\//g, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Mantenimientos realizados (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mantenimientos Realizados</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Todo lo que los técnicos han registrado, en un solo lugar — para revisar y verificar la información y las fotos que suben.
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar en Excel</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por equipo, sistema, técnico o descripción…"
          className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 200 }} />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Todos los tipos</option>
          {MTTO_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin mantenimientos registrados todavía.</p>
      ) : filtered.slice(0, 200).map(r => (
        <div key={r.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: r.estado === "fuera-de-servicio" ? C.red : C.line, background: r.estado === "fuera-de-servicio" ? C.redSoft : C.panel }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-medium" style={{ color: C.ink }}>{r.equipoNombre} <span style={{ color: C.gray, fontWeight: 400 }}>· {r.sistema}</span></div>
            <Pill tone={r.estado === "fuera-de-servicio" ? "red" : "green"}>{MTTO_ESTADOS.find(s => s.code === r.estado)?.label || r.estado}</Pill>
          </div>
          <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>
            {MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo} · {fmtDT(r.fecha)} · Por {r.tecnico}{r.costo ? ` · $${Number(r.costo).toLocaleString("es-CO")}` : ""}
          </div>
          <div className="text-sm mt-1" style={{ color: C.ink }}>{r.descripcion}</div>
          {r.fotos && r.fotos.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {r.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      {filtered.length > 200 && <div className="text-xs mt-2" style={{ color: C.gray }}>Mostrando los 200 más recientes — descarga el Excel para ver todos ({filtered.length}).</div>}
    </div>
  );
}

/* ============================================================
   VISTA: PANEL EJECUTIVO
   ============================================================ */
/** Pequeña etiqueta "↑/↓ X% vs mes pasado" para el Panel Ejecutivo. */
/**
 * Tarjeta KPI: etiqueta pequeña arriba, número grande, y opcionalmente un desglose debajo de
 * una línea divisoria (ej: "Preventivo 12 / Correctivo 8") — el mismo patrón de las tarjetas
 * de reportes tipo BI (número protagonista + contexto secundario, sin saturar).
 */
function StatCard({ label, value, valueColor, leading, breakdown, trend }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>{label}</div>
      <div className="flex items-center gap-3 mt-2">
        {leading}
        <div className="text-3xl font-bold leading-none tabular-nums" style={{ color: valueColor || C.ink }}>{value}</div>
      </div>
      {trend}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
          {breakdown.map(b => (
            <div key={b.label} className="flex items-center justify-between text-xs">
              <span style={{ color: C.inkSoft }}>{b.label}</span>
              <span className="font-bold tabular-nums" style={{ color: b.color || C.ink }}>{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendBadge({ current, previous, unit = "%", goodDirection = "up" }) {
  if (previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 1) return <span className="text-xs block mt-1" style={{ color: C.gray }}>≈ igual que el mes pasado</span>;
  const up = diff > 0;
  const good = goodDirection === "up" ? up : !up;
  const text = unit === "%" ? `${Math.abs(Math.round(diff))}%` : `$${Math.abs(Math.round(diff)).toLocaleString("es-CO")}`;
  return <span className="text-xs font-medium block mt-1" style={{ color: good ? C.green : C.red }}>{up ? "↑" : "↓"} {text} vs. mes pasado</span>;
}

function ExecutivePanelView({ equipos, mttoLog, roundsIndex, coldRoundsIndex, meterRoundsIndex, currentUser, tasks, accounts }) {
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // ===== Filtros estandarizados (mismo patrón que Análisis de Mantenimiento) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const tecnicos = useMemo(() => [...new Set(mttoLog.map(r => r.tecnico).filter(Boolean))].sort(), [mttoLog]);
  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); };

  const filteredLog = useMemo(() => {
    return mttoLog.filter(r => {
      const d = new Date(r.fecha);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(r.fecha) !== filterTurno) return false;
      if (filterTecnico && r.tecnico !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, dateFrom, dateTo, filterTurno, filterTecnico]);

  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      if (!t.finishedAt) return false; // solo cerradas cuentan para "órdenes" y "horas hombre"
      const d = new Date(t.finishedAt);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(t.finishedAt) !== filterTurno) return false;
      if (filterTecnico && (accounts?.[t.asignadoA]?.display_name || t.asignadoA) !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dateFrom, dateTo, filterTurno, filterTecnico, accounts]);

  // ===== Datos base (disponibilidad es una foto del estado ACTUAL, no se filtra por fecha) =====
  const uptime = useMemo(() => computeUptimeBySystem(equipos, mttoLog), [equipos, mttoLog]);
  const compliance = useMemo(() => computeComplianceForMonth(now, roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const compliancePrev = useMemo(() => computeComplianceForMonth(lastMonthDate, roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  // Sin filtros activos: costo del mes actual (comparado con el mes pasado). Con filtros activos:
  // costo de exactamente el rango/turno/técnico elegido (ahí ya no aplica comparar "vs. mes pasado").
  const cost = useMemo(() => computeMaintenanceCost(equipos, filteredLog, hasActiveFilters ? null : now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipos, filteredLog, hasActiveFilters]);
  const costPrev = useMemo(() => computeMaintenanceCost(equipos, mttoLog, lastMonthDate), [equipos, mttoLog]); // eslint-disable-line react-hooks/exhaustive-deps
  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;

  // ===== KPIs ejecutivos nuevos: órdenes cerradas y horas hombre, del sistema de tareas =====
  const ordenesCerradas = filteredTasks.length;
  const horasHombre = useMemo(() => {
    let total = 0;
    filteredTasks.forEach(t => {
      if (t.timeLog && t.timeLog.length > 1) {
        const sorted = [...t.timeLog].sort((a, b) => new Date(a.at) - new Date(b.at));
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].estado === "en-proceso") total += hoursBetween(sorted[i].at, sorted[i + 1].at);
        }
      } else if (t.assignedAt && t.finishedAt) {
        total += hoursBetween(t.assignedAt, t.finishedAt);
      }
    });
    return total;
  }, [filteredTasks]);

  const DONUT_PALETTE = [C.blue, C.amber, C.green, C.red, C.gray, "#8b5cf6", "#0ea5e9"];
  const costBySistemaTotal = cost.bySistema.reduce((s, [, v]) => s + v, 0);

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateExecutivePdf(uptime, compliance, cost, currentUser, compliancePrev, costPrev);
      doc.save(`panel-ejecutivo-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setMsg("No se pudo generar el PDF."); }
    setDownloading(false);
  };

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Panel Ejecutivo</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>Resumen general, listo para mostrarle a la gerencia.</p>
        </div>
        <Button icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
      </div>
      {msg && <div className="text-xs mb-3" style={{ color: C.red }}>{msg}</div>}

      {/* Filtros globales */}
      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
          <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Técnico</div>
          <select value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* KPIs ejecutivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Costo global de operación" value={cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—"}
          trend={!hasActiveFilters ? <TrendBadge current={cost.total} previous={costPrev.total} unit="$" goodDirection="down" /> : null} />
        <StatCard label="Eficiencia global de planta" value={`${avgUptime}%`} valueColor={avgUptime >= 90 ? C.green : C.red}
          leading={<MiniGauge value={avgUptime} max={100} size={44} color={avgUptime >= 90 ? C.green : C.red} />} />
        <StatCard label="Órdenes cerradas" value={ordenesCerradas}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><ClipboardCheck size={18} color={C.blue} /></div>} />
        <StatCard label="Horas hombre invertidas" value={fmtHours(horasHombre)}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Cumplimiento de rondas" value={`${compliance.ronda.pct}%`} valueColor={compliance.ronda.pct >= 90 ? C.green : C.red}
          leading={<MiniGauge value={compliance.ronda.pct} max={100} size={40} stroke={5} color={compliance.ronda.pct >= 90 ? C.green : C.red} />}
          trend={<TrendBadge current={compliance.ronda.pct} previous={compliancePrev.ronda.pct} goodDirection="up" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Disponibilidad de equipos por sistema</div>
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <HorizontalBarChart data={uptime} labelKey="sistema" valueKey="pct" max={100}
              colorFor={u => u.pct >= 90 ? C.green : C.red} formatValue={v => `${v}%`} />
          </div>
        </div>

        {cost.bySistema.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Distribución presupuestal por sistema</div>
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-5">
                <MiniDonut segments={cost.bySistema.slice(0, 7).map(([sistema, valor], i) => ({ name: sistema, value: valor, color: DONUT_PALETTE[i % DONUT_PALETTE.length] }))} size={140} stroke={22} />
                <div className="space-y-2 flex-1 min-w-0">
                  {cost.bySistema.slice(0, 7).map(([sistema, valor], i) => (
                    <div key={sistema} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0" style={{ color: C.ink }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
                        <span className="truncate">{sistema}</span>
                      </span>
                      <span className="font-bold shrink-0" style={{ color: C.ink }}>{costBySistemaTotal ? ((valor / costBySistemaTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cumplimiento de rondas este mes (vs. mes pasado)</div>
      <div className="rounded-lg border mb-5 overflow-hidden" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        {[
          { label: "Ronda de revisión", c: compliance.ronda, p: compliancePrev.ronda },
          { label: "Cuartos Fríos", c: compliance.cuartosFrios, p: compliancePrev.cuartosFrios },
          { label: "Lecturas de Medidores", c: compliance.medidores, p: compliancePrev.medidores },
        ].map((row, i) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <span style={{ color: C.ink }}>{row.label}</span>
            <span className="flex items-center gap-2">
              <span style={{ color: C.gray }}>{row.c.actual}/{row.c.expected}</span>
              <span className="font-semibold" style={{ color: row.c.pct >= 90 ? C.green : C.red }}>({row.c.pct}%)</span>
              <span style={{ color: C.gray }}>· antes {row.p.pct}%</span>
            </span>
          </div>
        ))}
      </div>

      {cost.bySistema.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Costo de mantenimiento por sistema {hasActiveFilters ? "(filtro aplicado)" : "(este mes)"}</div>
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <HorizontalBarChart data={cost.bySistema.slice(0, 10).map(([sistema, valor]) => ({ sistema, valor }))}
              labelKey="sistema" valueKey="valor" colorFor={() => C.amber} gradient
              formatValue={v => `$${(v / 1000).toFixed(0)}k · ${costBySistemaTotal ? ((v / costBySistemaTotal) * 100).toFixed(1) : "0.0"}%`} />
          </div>
        </>
      )}
    </div>
  );
}

function MaintenanceAnalyticsView({ equipos, mttoLog, issueHistory, activeIssues, roundsIndex, coldRoundsIndex, meterRoundsIndex }) {
  const activeEquipos = equipos.filter(e => e.active !== false);

  // ===== Filtros globales de analítica ===================================
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");
  const [filterSistema, setFilterSistema] = useState("");
  const [tsGrouping, setTsGrouping] = useState("mes"); // "mes" | "semana" | "turno"

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };

  const tecnicos = useMemo(() => [...new Set(mttoLog.map(r => r.tecnico).filter(Boolean))].sort(), [mttoLog]);
  const sistemasDisponibles = useMemo(() => [...new Set(activeEquipos.map(e => e.sistema).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipos]);

  const filteredLog = useMemo(() => {
    return mttoLog.filter(r => {
      const d = new Date(r.fecha);
      if (dateFrom && d < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      if (filterTurno && turnoOf(r.fecha) !== filterTurno) return false;
      if (filterTecnico && r.tecnico !== filterTecnico) return false;
      if (filterSistema) {
        const eq = activeEquipos.find(e => e.id === r.equipoId);
        if (!eq || eq.sistema !== filterSistema) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, dateFrom, dateTo, filterTurno, filterTecnico, filterSistema, equipos]);

  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico || filterSistema;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); setFilterSistema(""); };

  // ===== Datos derivados (sobre filteredLog) ==============================
  const bySistema = useMemo(() => {
    const map = {};
    filteredLog.forEach(r => {
      const eq = activeEquipos.find(e => e.id === r.equipoId);
      if (!eq) return;
      map[eq.sistema] = (map[eq.sistema] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([sistema, mantenimientos]) => ({ sistema, mantenimientos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);
  const bySistemaTotal = bySistema.reduce((s, d) => s + d.mantenimientos, 0);

  const topCorrectivos = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, correctivos: filteredLog.filter(r => r.equipoId === eq.id && r.tipo === "correctivo").length }))
      .filter(x => x.correctivos > 0)
      .sort((a, b) => b.correctivos - a.correctivos)
      .slice(0, 10)
      .map(x => ({ label: x.eq.nombre, fallas: x.correctivos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);

  const criticalityData = useMemo(() => {
    return activeEquipos.map(eq => {
      const records = filteredLog.filter(r => r.equipoId === eq.id);
      const frecuencia = records.filter(r => r.tipo === "correctivo").length;
      const costo = records.reduce((s, r) => s + (Number(r.costo) || 0), 0);
      return { nombre: eq.nombre, sistema: eq.sistema, frecuencia, costo };
    }).filter(d => d.frecuencia > 0 || d.costo > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLog, equipos]);

  // Estado actual "fuera de servicio" y candidatos a reemplazo: se calculan sobre TODO el
  // historial (no solo lo filtrado), porque son sobre la situación real ahora mismo, no sobre
  // un período de análisis.
  const outOfService = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, status: currentEquipoStatus(eq.id, mttoLog) }))
      .filter(x => x.status.outOfService)
      .sort((a, b) => new Date(a.status.since) - new Date(b.status.since));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const replaceCandidates = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, stats: computeEquipoStats(eq, mttoLog) }))
      .filter(x => x.stats.correctivos >= 3)
      .sort((a, b) => b.stats.correctivos - a.stats.correctivos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const totalMantenimientos = filteredLog.length;
  const totalCosto = filteredLog.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const totalCorrectivos = filteredLog.filter(r => r.tipo === "correctivo").length;
  const totalPreventivos = totalMantenimientos - totalCorrectivos;
  const pctPreventivo = totalMantenimientos > 0 ? Math.round((totalPreventivos / totalMantenimientos) * 100) : 0;
  const tipoSplit = [
    { name: "Preventivo", value: totalPreventivos },
    { name: "Correctivo", value: totalCorrectivos },
  ].filter(d => d.value > 0);

  // ===== MTTR / MTBF — de la vida real de los equipos (cuánto duran fuera de servicio, y cada
  // cuánto vuelven a fallar), usando el mismo historial de fallas que Análisis de fallas =========
  const equipmentStats = useMemo(() => computeEquipmentStats(issueHistory || [], activeIssues || {}, null), [issueHistory, activeIssues]);
  const { mttr, mtbf } = useMemo(() => {
    const resolved = equipmentStats.flatMap(e => e.incidents).filter(i => !i.ongoing);
    const mttrVal = resolved.length ? resolved.reduce((s, i) => s + i.hours, 0) / resolved.length : null;
    const gaps = [];
    equipmentStats.forEach(e => {
      const sorted = [...e.incidents].sort((a, b) => new Date(a.from) - new Date(b.from));
      for (let i = 1; i < sorted.length; i++) gaps.push(hoursBetween(sorted[i - 1].from, sorted[i].from));
    });
    const mtbfVal = gaps.length ? gaps.reduce((s, v) => s + v, 0) / gaps.length : null;
    return { mttr: mttrVal, mtbf: mtbfVal };
  }, [equipmentStats]);

  // ===== Cumplimiento de rondas del mes actual, con decimales =====
  const roundsCompliance = useMemo(() => computeComplianceForMonth(new Date(), roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const roundsPctDecimal = roundsCompliance.ronda.expected > 0
    ? Math.min(100, (roundsCompliance.ronda.actual / roundsCompliance.ronda.expected) * 100)
    : 100;

  // ===== Serie de tiempo (Mes / Semana / Turno) con tendencia (promedio móvil de fallas) =====
  const timeSeries = useMemo(() => {
    const buckets = {};
    const keyFor = (fecha) => {
      const d = new Date(fecha);
      if (tsGrouping === "turno") return `${localDateIso(d)} ${turnoOf(fecha)}`;
      if (tsGrouping === "semana") {
        const monday = new Date(d);
        const day = (monday.getDay() + 6) % 7; // 0 = lunes
        monday.setDate(monday.getDate() - day);
        return localDateIso(monday);
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    filteredLog.forEach(r => {
      const k = keyFor(r.fecha);
      if (!buckets[k]) buckets[k] = { preventivo: 0, correctivo: 0 };
      buckets[k][r.tipo === "correctivo" ? "correctivo" : "preventivo"]++;
    });
    const keys = Object.keys(buckets).sort();
    const labelFor = (k) => {
      if (tsGrouping === "turno") return k.split(" ")[1]?.slice(0, 3) || k;
      if (tsGrouping === "semana") return k.slice(5); // MM-DD
      const [y, m] = k.split("-");
      return `${MESES_CORTOS[Number(m) - 1]} ${y.slice(2)}`;
    };
    const labels = keys.map(labelFor);
    const preventivoPts = keys.map(k => buckets[k].preventivo);
    const correctivoPts = keys.map(k => buckets[k].correctivo);
    const trend = correctivoPts.map((_, i) => {
      const win = correctivoPts.slice(Math.max(0, i - 2), i + 1);
      return Math.round((win.reduce((s, v) => s + v, 0) / win.length) * 10) / 10;
    });
    return { labels, preventivoPts, correctivoPts, trend };
  }, [filteredLog, tsGrouping]);

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Análisis de Mantenimiento</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Historial de mantenimientos y fallas por equipo, para decidir con datos si vale la pena seguir reparando algo o es mejor reemplazarlo.
      </p>

      {/* Filtros globales de analítica */}
      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
          <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Técnico</div>
          <select value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Sistema</div>
          <select value={filterSistema} onChange={e => setFilterSistema(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {sistemasDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* KPIs de eficiencia */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatCard label="Fuera de servicio" value={outOfService.length} valueColor={outOfService.length ? C.red : C.ink}
          leading={
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: outOfService.length ? C.redSoft : C.greenSoft }}>
              {outOfService.length ? <AlertTriangle size={18} color={C.red} /> : <CheckCircle2 size={18} color={C.green} />}
            </div>
          } />
        <StatCard label="Mantenimientos (filtro)" value={totalMantenimientos}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><Wrench size={18} color={C.blue} /></div>}
          breakdown={totalMantenimientos > 0 ? [
            { label: "Preventivo", value: totalPreventivos, color: C.green },
            { label: "Correctivo", value: totalCorrectivos, color: C.red },
          ] : null} />
        <StatCard label="MTTR (reparación)" value={mttr != null ? fmtHours(mttr) : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <StatCard label="MTBF (entre fallas)" value={mtbf != null ? fmtHours(mtbf) : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><TrendingUp size={18} color={C.blue} /></div>} />
        <StatCard label="Cumplimiento de rondas" value={`${roundsPctDecimal.toFixed(1)}%`} valueColor={roundsPctDecimal >= 90 ? C.green : C.red}
          leading={<MiniGauge value={roundsPctDecimal} max={100} size={40} stroke={5} color={roundsPctDecimal >= 90 ? C.green : C.red} />} />
        <StatCard label="Costo acumulado (filtro)" value={totalCosto ? `$${totalCosto.toLocaleString("es-CO")}` : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Gauge size={18} color={C.amber} /></div>} />
      </div>

      {totalMantenimientos === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          {hasActiveFilters ? "No hay mantenimientos que coincidan con estos filtros." : "Todavía no hay mantenimientos registrados desde la app."}
        </p>
      ) : (
        <>
          {/* Tendencia temporal */}
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Preventivo vs. correctivo en el tiempo</div>
              <div className="flex rounded-md border overflow-hidden text-xs">
                {[{ v: "mes", l: "Mes" }, { v: "semana", l: "Semana" }, { v: "turno", l: "Turno" }].map(o => (
                  <button key={o.v} onClick={() => setTsGrouping(o.v)}
                    className="px-2.5 py-1 font-semibold"
                    style={{ background: tsGrouping === o.v ? C.amber : C.panel, color: tsGrouping === o.v ? "#fff" : C.inkSoft, borderLeft: o.v !== "mes" ? `1px solid ${C.line}` : "none" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <TimeSeriesLineChart
              labels={timeSeries.labels}
              series={[
                { name: "Preventivo", color: C.green, points: timeSeries.preventivoPts },
                { name: "Correctivo", color: C.red, points: timeSeries.correctivoPts },
              ]}
              trend={timeSeries.trend}
            />
            <div className="text-xs mt-2" style={{ color: C.gray }}>
              La línea punteada es el promedio móvil de fallas correctivas — si sube de forma sostenida, es señal de que algún equipo se está acercando a su ciclo de falla.
            </div>
          </div>

          {/* Donut + barras por sistema */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {tipoSplit.length > 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.gray }}>Preventivo vs. correctivo</div>
                <div className="flex items-center gap-6">
                  <MiniDonut segments={tipoSplit.map(d => ({ name: d.name, value: d.value, color: d.name === "Preventivo" ? C.green : C.red }))} size={150} stroke={24} />
                  <div className="space-y-3 flex-1">
                    {tipoSplit.map(d => (
                      <div key={d.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.name === "Preventivo" ? C.green : C.red }} />
                          {d.name}
                        </span>
                        <span className="text-right">
                          <span className="font-bold tabular-nums" style={{ color: d.name === "Preventivo" ? C.green : C.red }}>{d.value}</span>
                          <span className="text-xs ml-1" style={{ color: C.gray }}>({Math.round((d.value / totalMantenimientos) * 100)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs mt-3" style={{ color: C.gray }}>Pasa el cursor sobre el anillo para ver el detalle de cada tipo.</div>
              </div>
            )}

            {bySistema.length > 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-4" style={{ color: C.gray }}>Carga operativa por sistema</div>
                <HorizontalBarChart data={bySistema} labelKey="sistema" valueKey="mantenimientos" colorFor={() => C.blue} gradient
                  formatValue={v => `${v} · ${bySistemaTotal ? ((v / bySistemaTotal) * 100).toFixed(1) : "0.0"}%`} />
              </div>
            )}
          </div>

          {/* Matriz de criticidad */}
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Matriz de criticidad — frecuencia de fallas vs. costo acumulado</div>
            <div className="text-xs mb-3" style={{ color: C.inkSoft }}>Cada punto es un equipo. Pasa el cursor sobre uno para ver el detalle. Los del cuadrante rojo son los que más vale la pena evaluar para reemplazo.</div>
            <CriticalityScatter data={criticalityData} />
          </div>

          {topCorrectivos.length > 0 && (
            <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Equipos con más fallas (correctivos)</div>
              <HorizontalBarChart data={topCorrectivos} labelKey="label" valueKey="fallas" colorFor={() => C.red} />
            </div>
          )}

          {replaceCandidates.length > 0 && (
            <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.amber, background: C.amberSoft }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#7a5405" }}>Candidatos a evaluar reemplazo</div>
              <div className="text-xs mb-2" style={{ color: "#7a5405" }}>
                3 o más reparaciones registradas — vale la pena revisar si sale más rentable cambiarlos que seguir reparándolos.
                Esto es solo una guía simple según la cantidad de fallas (y el costo, si lo registras); no es un análisis financiero completo.
              </div>
              {replaceCandidates.map(({ eq, stats }) => (
                <div key={eq.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.08)", color: "#7a5405" }}>
                  <b>{eq.nombre}</b> ({eq.sistema}) — {stats.correctivos} fallas{stats.costoTotal ? `, $${stats.costoTotal.toLocaleString("es-CO")} acumulado` : ""}
                </div>
              ))}
            </div>
          )}

          {outOfService.length > 0 && (
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Fuera de servicio ahora mismo</div>
              {outOfService.map(({ eq, status }) => (
                <div key={eq.id} className="text-xs py-1.5 border-b last:border-0 flex items-center justify-between" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <span style={{ color: C.ink }}>{eq.nombre} <span style={{ color: C.gray }}>({eq.sistema})</span></span>
                  <span style={{ color: C.red }}>Desde {fmtDT(status.since)} · {elapsed(status.since)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MTTO_ESTADO_COLORS = {
  ejecutado: { bg: C.greenSoft, fg: C.green, label: "Ejecutado" },
  atrasado: { bg: C.redSoft, fg: C.red, label: "Atrasado" },
  pendiente: { bg: C.amberSoft, fg: "#7a5405", label: "Pendiente" },
};

function CronogramaAnualView({ equipos, mttoCronograma, reportEmail, onLogSent, currentUser }) {
  const activeEquipos = equipos.filter(e => e.active !== false);
  const sistemas = useMemo(() => [...new Set(activeEquipos.map(e => e.sistema))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeEquipos]);
  const [sistemaFilter, setSistemaFilter] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { if (!sistemaFilter && sistemas.length) setSistemaFilter(sistemas[0]); }, [sistemas, sistemaFilter]);

  const eqInSistema = activeEquipos.filter(e => e.sistema === sistemaFilter);

  const cronoByEquipo = useMemo(() => {
    const map = {};
    eqInSistema.forEach(eq => {
      map[eq.id] = {};
      mttoCronograma.filter(c => c.equipoId === eq.id).forEach(c => { map[eq.id][c.mesNum] = c; });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eqInSistema, mttoCronograma]);

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const header = ["Equipo", ...MESES_LABELS];
    const data = eqInSistema.map(eq => {
      const row = [eq.nombre];
      for (let m = 1; m <= 12; m++) {
        const c = cronoByEquipo[eq.id]?.[m];
        row.push(c ? (MTTO_ESTADO_COLORS[c.estado]?.label || c.estado) : "");
      }
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = [{ wch: 40 }, ...MESES_LABELS.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, ws, (sistemaFilter || "Cronograma").slice(0, 31));
    return wb;
  };

  const doDownload = () => {
    setDownloading(true);
    try {
      const wb = buildWorkbook();
      XLSX.writeFile(wb, `cronograma-${sistemaFilter.replace(/[^a-z0-9]+/gi, "-")}.xlsx`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el Excel." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    try {
      const wb = buildWorkbook();
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = bufferToBase64(out);
      const resp = await fetch("/api/send-report", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: `Cronograma de Mantenimiento — ${sistemaFilter}`,
          text: `Cronograma anual de mantenimiento del sistema ${sistemaFilter}.`,
          attachmentBase64: base64,
          filename: `cronograma-${sistemaFilter.replace(/[^a-z0-9]+/gi, "-")}.xlsx`,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg({ ok: resp.ok, text: data?.message || (resp.ok ? "Enviado." : "El servidor rechazó el envío.") });
      onLogSent?.({ to: emailTo.trim(), method: "Cronograma de mantenimiento (correo con Excel)", ok: resp.ok, message: data?.message, sentBy: currentUser, sentAt: nowIso() });
    } catch {
      setMsg({ ok: false, text: "No se pudo enviar. Revisa la conexión." });
    }
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Cronograma Anual de Mantenimiento</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>El año completo, mes a mes, por sistema — para hacerle seguimiento a lo programado.</p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <select value={sistemaFilter} onChange={e => setSistemaFilter(e.target.value)}
          className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs" style={{ color: C.gray }}>
          <span style={{ color: C.green }}>■</span> Ejecutado &nbsp;
          <span style={{ color: C.red }}>■</span> Atrasado &nbsp;
          <span style={{ color: "#7a5405" }}>■</span> Pendiente
        </span>
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este sistema (Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 220 }}>Equipo</th>
              {MESES_LABELS.map(m => <th key={m} className="px-2 py-2 text-center" style={{ minWidth: 56 }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {eqInSistema.map((eq, i) => (
              <tr key={eq.id} style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                <td className="px-2 py-1.5" style={{ color: C.ink }}>{eq.nombre}</td>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map(m => {
                  const c = cronoByEquipo[eq.id]?.[m];
                  const colors = c ? MTTO_ESTADO_COLORS[c.estado] : null;
                  return (
                    <td key={m} className="px-1 py-1.5 text-center" style={{ background: colors?.bg || "transparent", color: colors?.fg || C.gray, fontWeight: colors ? 600 : 400 }}>
                      {colors ? colors.label.slice(0, 4) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {eqInSistema.length === 0 && (
              <tr><td colSpan={13} className="px-2 py-6 text-center text-xs" style={{ color: C.gray }}>Sin equipos en este sistema.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   HORARIOS — componentes de vista
   ============================================================ */
const CARGOS = ["Administrativo", "Turnista", "Apoyo", "Mecánico", "Practicante", "Pintor", "Carpintero", "Albañil", "Jardinero"];
// Un color por cargo, solo para que el PDF del horario sea más fácil de leer de un vistazo
// (el nombre de cada quien sale en el color de su cargo). No afecta nada más de la app.
const CARGO_PDF_COLORS = {
  "Administrativo": "#1e4fa3",
  "Turnista": "#a31245",
  "Apoyo": "#1c7a34",
  "Mecánico": "#8a5a00",
  "Practicante": "#6b21a8",
  "Pintor": "#0e7490",
  "Carpintero": "#9a3412",
  "Albañil": "#4d7c0f",
  "Jardinero": "#166534",
};

function EmployeeManagePanel({ employees, onCreateEmployee, onUpdateEmployee, onDeleteEmployee }) {
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [restDay, setRestDay] = useState("");
  const [creating, setCreating] = useState(false);

  const doCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreateEmployee(name.trim(), cargo, restDay);
    setName(""); setCargo(""); setRestDay("");
    setCreating(false);
  };

  const grouped = CARGOS.map(c => ({ cargo: c, list: employees.filter(e => e.cargo === c) }))
    .concat([{ cargo: "Sin cargo asignado", list: employees.filter(e => !e.cargo) }])
    .filter(g => g.list.length > 0);

  return (
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar empleado</div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo"
          className="text-sm border rounded-md px-2 py-1.5 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
        <select value={cargo} onChange={e => setCargo(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Cargo…</option>
          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={restDay} onChange={e => setRestDay(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Sin descanso fijo</option>
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>Descanso fijo: {d}</option>)}
        </select>
        <Button size="sm" icon={PlusCircle} disabled={creating} onClick={doCreate}>Agregar</Button>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Empleados ({employees.length})</div>
      {grouped.map(g => (
        <div key={g.cargo} className="mb-2">
          <div className="text-xs font-semibold mt-2 mb-1" style={{ color: C.blue }}>{g.cargo} ({g.list.length})</div>
          {g.list.map(emp => (
            <div key={emp.id} className="flex items-center justify-between py-1.5 border-b last:border-0 flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="text-sm" style={{ color: C.ink }}>
                {emp.name}
                {!emp.active && <span className="text-xs" style={{ color: C.gray }}> · Inactivo</span>}
              </div>
              <div className="flex items-center gap-2">
                <select value={emp.cargo || ""} onChange={e => onUpdateEmployee(emp.id, { cargo: e.target.value })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Cargo…</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={emp.fixedRestDay ?? ""} onChange={e => onUpdateEmployee(emp.id, { fixedRestDay: e.target.value === "" ? null : Number(e.target.value) })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                  <option value="">Sin descanso fijo</option>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input defaultValue={emp.badge || ""} onBlur={e => { if (e.target.value !== (emp.badge || "")) onUpdateEmployee(emp.id, { badge: e.target.value.trim() }); }}
                  placeholder="Etiqueta (ej: acum. reducción)" title="Aparece como una marca de color junto al nombre, en pantalla y en el PDF"
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 160 }} />
                <input type="number" min="0" step="0.5" defaultValue={emp.reductionHoursPerDay || ""} onBlur={e => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (emp.reductionHoursPerDay ?? null)) onUpdateEmployee(emp.id, { reductionHoursPerDay: v }); }}
                  placeholder="Hrs. reducción/día" title="Cuántas horas se le acumulan por cada día trabajado (ej. 1 si trabaja 8h en vez de las 7h reducidas). Vacío = no acumula."
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, width: 100 }} />
                <Button size="sm" variant="ghost" onClick={() => onUpdateEmployee(emp.id, { active: !emp.active })}>{emp.active ? "Desactivar" : "Activar"}</Button>
                <button onClick={() => onDeleteEmployee(emp.id)} className="p-1"><Trash2 size={14} color={C.gray} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SchedulesView({ employees, scheduleEntries, scheduleEditLog, isAdmin, currentUser, onCreateEmployee, onUpdateEmployee, onDeleteEmployee, onSetScheduleEntry, onImportJuly, onImportAugust, onImportExcel, onApplyAiDraft, reportEmail, onLogSent }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showManage, setShowManage] = useState(false);
  const [showEditLog, setShowEditLog] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [draftMode, setDraftMode] = useState("hours"); // "hours" | "special"
  const [draftEntrada, setDraftEntrada] = useState("");
  const [draftSalida, setDraftSalida] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [icsEmployeeId, setIcsEmployeeId] = useState("");

  // ---- Borrador de horario generado con IA (no se guarda hasta que el usuario lo confirma) ----
  const [showAiPanel, setShowAiPanel] = useState(false);
  // Reglas GENERALES del equipo: se guardan en la base de datos y se usan SIEMPRE, en todos los
  // meses, sin que haga falta volver a escribirlas cada vez (antes esto se perdía cada vez que se
  // generaba un mes nuevo, por eso reglas que ya se habían dado — como lo de Quintana los sábados,
  // o lo de Félix y Zarith los domingos — no se estaban aplicando si no se volvían a escribir).
  const [standingRules, setStandingRules] = useState("");
  const [standingRulesLoaded, setStandingRulesLoaded] = useState(false);
  const [standingRulesSaving, setStandingRulesSaving] = useState(false);
  const [standingRulesSaved, setStandingRulesSaved] = useState(false);
  const [aiRulesText, setAiRulesText] = useState(""); // solo algo puntual de ESTE mes, no se guarda
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiNotes, setAiNotes] = useState(null);
  const [draftActive, setDraftActive] = useState(false);
  const [draftOverrides, setDraftOverrides] = useState({}); // { [scheduleKey]: {entrada,salida} | {code} }
  const [applyingDraft, setApplyingDraft] = useState(false);

  useEffect(() => {
    (async () => {
      let saved = null;
      try { saved = await sGet("schedule-standing-rules", true); } catch { /* usa el texto por defecto */ }
      setStandingRules(saved || DEFAULT_STANDING_RULES);
      setStandingRulesLoaded(true);
    })();
  }, []);

  const saveStandingRules = async () => {
    setStandingRulesSaving(true);
    try {
      await sSet("schedule-standing-rules", standingRules, true);
      setStandingRulesSaved(true);
      setTimeout(() => setStandingRulesSaved(false), 2500);
    } catch { setAiError("No se pudieron guardar las reglas generales. Intenta de nuevo."); }
    setStandingRulesSaving(false);
  };

  // ---- Al entrar, si ya hay un mes con datos cargados (ej. agosto), arranca de una vez mostrando
  // el mes SIGUIENTE a ese (ej. septiembre) en vez del mes calendario actual — así el panel de IA
  // ya aparece listo para el mes que realmente falta por armar. Solo pasa una vez, al cargar; si
  // el usuario navega a otro mes después, eso ya no se toca. ----
  const autoAdjustedMonthRef = useRef(false);
  useEffect(() => {
    if (autoAdjustedMonthRef.current) return;
    const dates = Object.keys(scheduleEntries || {}).map(k => k.split("::")[1]).filter(Boolean);
    if (dates.length === 0) return;
    const maxDate = dates.reduce((a, b) => (b > a ? b : a));
    const [y, m] = maxDate.split("-").map(Number); // m es 1-indexado (ej. 8 = agosto)
    setMonthDate(new Date(y, m, 1)); // new Date(y, m, 1) con m tal cual = el mes SIGUIENTE (0-indexado)
    autoAdjustedMonthRef.current = true;
  }, [scheduleEntries]);

  // ---- Subir un Excel de horario (mismo formato de siempre) para el mes que está en pantalla ----
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelParsed, setExcelParsed] = useState(null); // { entries, names, warnings }
  const [excelParseError, setExcelParseError] = useState(null);
  const [excelApplying, setExcelApplying] = useState(false);
  const excelInputRef = useRef(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const daysIso = useMemo(() => daysInMonthIso(year, month), [year, month]);
  const weeks = useMemo(() => weeksInRange(daysIso), [daysIso]);
  const monthLabel = monthDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const activeEmployees = employees.filter(e => e.active !== false);

  const entriesByEmployee = useMemo(() => {
    const map = {};
    activeEmployees.forEach(emp => {
      map[emp.id] = {};
      daysIso.forEach(d => {
        const e = scheduleEntries[scheduleKey(emp.id, d)];
        if (e) map[emp.id][d] = e;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, scheduleEntries, daysIso]);

  /** Lo que se ve en pantalla: si hay un borrador de IA activo, se le suman/reemplazan sus celdas
   *  encima de lo real (sin tocar lo real todavía) — así se puede revisar y editar antes de guardar. */
  const viewEntriesByEmployee = useMemo(() => {
    if (!draftActive) return entriesByEmployee;
    const map = {};
    activeEmployees.forEach(emp => {
      map[emp.id] = { ...(entriesByEmployee[emp.id] || {}) };
      daysIso.forEach(d => {
        const ov = draftOverrides[scheduleKey(emp.id, d)];
        if (ov) map[emp.id][d] = ov;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesByEmployee, draftActive, draftOverrides, activeEmployees, daysIso]);

  const sortedEmployees = useMemo(() => {
    const order = [...CARGOS, ""];
    return [...activeEmployees].sort((a, b) => order.indexOf(a.cargo || "") - order.indexOf(b.cargo || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployees]);

  const openCell = (employeeId, dateIso) => {
    const entry = viewEntriesByEmployee[employeeId]?.[dateIso];
    setEditingCell({ employeeId, dateIso });
    setDraftMode(entry?.code ? "special" : "hours");
    setDraftEntrada(entry?.entrada != null ? String(entry.entrada) : "");
    setDraftSalida(entry?.salida != null ? String(entry.salida) : "");
    setDraftCode(entry?.code || "");
    setDraftNote(entry?.note || "");
  };
  const saveCell = () => {
    const patch = draftMode === "special"
      ? { code: draftCode, note: draftNote }
      : { entrada: draftEntrada === "" ? null : Number(draftEntrada), salida: draftSalida === "" ? null : Number(draftSalida), note: draftNote };
    if (draftActive) {
      const key = scheduleKey(editingCell.employeeId, editingCell.dateIso);
      setDraftOverrides(prev => ({ ...prev, [key]: patch }));
    } else {
      onSetScheduleEntry(editingCell.employeeId, editingCell.dateIso, patch);
    }
    setEditingCell(null);
  };

  // ---- Vista previa de impacto: recalcula la semana de la celda que se está editando, CON el cambio en borrador ----
  const impact = useMemo(() => {
    if (!editingCell) return null;
    const week = weeks.find(w => w.includes(editingCell.dateIso));
    if (!week) return null;
    const entries = viewEntriesByEmployee[editingCell.employeeId] || {};
    const draftEntry = draftMode === "special"
      ? { code: draftCode }
      : { entrada: draftEntrada === "" ? null : Number(draftEntrada), salida: draftSalida === "" ? null : Number(draftSalida) };
    const before = weekTotalHours(week, entries);
    const afterEntries = { ...entries, [editingCell.dateIso]: draftEntry };
    const after = weekTotalHours(week, afterEntries);
    const diff = after - WEEKLY_HOURS_TARGET;
    const emp = activeEmployees.find(e => e.id === editingCell.employeeId);
    const label = `${fmtDayShort(new Date(week[0] + "T00:00:00"))}–${fmtDayShort(new Date(week[week.length - 1] + "T00:00:00"))}`;
    const restDayHit = emp && emp.fixedRestDay !== null && emp.fixedRestDay !== undefined
      && new Date(editingCell.dateIso + "T00:00:00").getDay() === emp.fixedRestDay && draftMode !== "special";
    return { weekLabel: label, before, after, diff, restDayHit, isSundayHoliday: isSundayOrHoliday(editingCell.dateIso) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, draftMode, draftEntrada, draftSalida, draftCode, viewEntriesByEmployee]);

  const doImport = async (importFn, label) => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await importFn();
      setImportMsg({ ok: true, text: `Listo: ${res.newEmployeesCount} empleado(s) nuevo(s) creados, ${res.entriesCount} registros de horario cargados (${label}).` });
    } catch {
      setImportMsg({ ok: false, text: "No se pudo importar. Intenta de nuevo." });
    }
    setImporting(false);
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelParseError(null); setExcelParsed(null); setExcelParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = parseHorarioExcelWorkbook(wb, year, month + 1);
      if (parsed.entries.length === 0) {
        setExcelParseError("No se encontró ningún dato reconocible en el archivo — revisa que sea el mismo formato de siempre (filas \"Hora\" con los días por columna).");
      } else {
        setExcelParsed(parsed);
      }
    } catch {
      setExcelParseError("No se pudo leer el archivo. ¿Es un .xlsx válido?");
    }
    setExcelParsing(false);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const doApplyExcelImport = async () => {
    setExcelApplying(true);
    try {
      const res = await onImportExcel(excelParsed);
      setImportMsg({ ok: true, text: `Excel importado a ${monthLabel}: ${res.newEmployeesCount} empleado(s) nuevo(s), ${res.entriesCount} registros cargados.` });
      setExcelParsed(null); setExcelParseError(null);
    } catch {
      setExcelParseError("No se pudo guardar la importación. Intenta de nuevo.");
    }
    setExcelApplying(false);
  };

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateSchedulePdf(monthLabel, sortedEmployees, daysIso, entriesByEmployee, currentUser);
      doc.save(`horario-${monthLabel.replace(/\s+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };
  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendScheduleEmailAuto(emailTo.trim(), monthLabel, sortedEmployees, daysIso, entriesByEmployee, currentUser);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Horario mensual (correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const doGenerateAiDraft = async () => {
    setAiGenerating(true); setAiError(null); setAiNotes(null);
    try {
      // Ejemplo de cómo trabaja cada quien: TODO el mes calendario anterior completo (ej. si se
      // arma septiembre, se manda agosto entero), para que la IA vea la secuencia real de turnos
      // de cada persona (incluye rotaciones que cambian semana a semana) y la continúe con lógica.
      const prevMonthFirstDay = new Date(year, month - 1, 1);
      const prevDaysIso = daysInMonthIso(prevMonthFirstDay.getFullYear(), prevMonthFirstDay.getMonth());
      const referenceEntries = {};
      activeEmployees.forEach(emp => {
        const list = [];
        prevDaysIso.forEach(iso => {
          const e = scheduleEntries[scheduleKey(emp.id, iso)];
          if (isWorkedDay(e)) list.push({ date: iso, entrada: e.entrada, salida: e.salida });
        });
        if (list.length) referenceEntries[emp.id] = list;
      });

      const days = daysIso.map(d => ({ date: d, isSundayOrHoliday: isSundayOrHoliday(d) }));
      const employeesForApi = activeEmployees.map(e => ({
        id: e.id, name: e.name, cargo: e.cargo || "", fixedRestDay: e.fixedRestDay ?? null,
        compBalance: e.reductionHoursPerDay > 0 ? computeCompBalance(e, scheduleEntries) : null,
      }));

      // Cuántos domingos/festivos tiene YA trabajados cada persona este mismo mes (lo que ya
      // estaba guardado antes de generar). Esto se le manda a cada tanda y se va actualizando
      // según lo que la IA vaya generando, para que ninguna tanda le ponga a alguien más domingos
      // de los que le quedan — sin esto, cada tanda decide "a ciegas" y pueden pasarse entre todas.
      const sundaysWorked = {};
      activeEmployees.forEach(emp => {
        let count = 0;
        daysIso.forEach(d => { if (isSundayOrHoliday(d) && isWorkedDay(entriesByEmployee[emp.id]?.[d])) count++; });
        sundaysWorked[emp.id] = count;
      });

      // Pedir el mes completo de una sola vez puede tardar tanto que Vercel corte la función a la
      // mitad. En vez de eso, se pide en tandas de máximo 15 días. Van UNA POR UNA (no todas al
      // tiempo) para poder pasarle a cada tanda cuántos domingos ya usó cada persona en la tanda
      // anterior — así entre todas respetan el mismo límite mensual en vez de calcularlo cada una
      // por su cuenta. Si alguna tanda falla, las demás igual quedan aplicadas.
      const CHUNK_SIZE = 15;
      const dayChunks = [];
      for (let i = 0; i < days.length; i += CHUNK_SIZE) dayChunks.push(days.slice(i, i + CHUNK_SIZE));

      // Las reglas generales del equipo (guardadas, siempre aplican) van primero, y lo que se haya
      // escrito solo para este mes se agrega después — así nunca se pierden las reglas de siempre
      // por no volver a escribirlas.
      const combinedRules = [standingRules, aiRulesText].map(t => (t || "").trim()).filter(Boolean).join("\n\n");

      const results = [];
      for (const chunkDays of dayChunks) {
        const res = await requestAiScheduleDraft({
          monthLabel, days: chunkDays, employees: employeesForApi,
          existingEntries: entriesByEmployee, referenceEntries,
          rulesText: combinedRules, weeklyHoursTarget: WEEKLY_HOURS_TARGET,
          sundaysAlreadyWorked: sundaysWorked,
        }).catch(() => ({ ok: false, message: "No se pudo conectar con el servicio de IA para esta parte del mes." }));
        results.push(res);
        if (res && res.ok) {
          res.entries.forEach(e => {
            if (!e.code && isSundayOrHoliday(e.date)) sundaysWorked[e.employeeId] = (sundaysWorked[e.employeeId] || 0) + 1;
          });
        }
      }

      const okResults = results.filter(r => r && r.ok);
      const failedCount = results.length - okResults.length;

      const overrides = {};
      okResults.forEach(r => {
        r.entries.forEach(e => {
          const key = scheduleKey(e.employeeId, e.date);
          overrides[key] = e.code ? { code: e.code } : { entrada: e.entrada, salida: e.salida };
        });
      });

      if (Object.keys(overrides).length === 0) {
        const firstMsg = results.find(r => r && !r.ok)?.message;
        setAiError(firstMsg || "La IA no llenó ningún día — puede que ya esté todo lleno este mes, o que no haya podido cumplir las reglas.");
        setAiGenerating(false);
        return;
      }

      setDraftOverrides(overrides);
      bumpAiUsage("scheduleGenerations");
      setDraftActive(true);
      let notes = okResults.map(r => r.notes).filter(Boolean).join(" ");
      if (failedCount > 0) {
        notes = (notes ? notes + " " : "") + `Aviso: ${failedCount} de ${results.length} parte(s) del mes no se pudieron generar — vuelve a darle "Generar borrador" para completar los días que falten (los que ya se generaron no se pierden).`;
      }
      setAiNotes(notes || null);
    } catch {
      setAiError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setAiGenerating(false);
  };

  const doApplyAiDraft = async () => {
    setApplyingDraft(true);
    try {
      await onApplyAiDraft(draftOverrides);
      setDraftActive(false); setDraftOverrides({}); setAiNotes(null); setAiError(null); setShowAiPanel(false);
      setImportMsg({ ok: true, text: `Horario generado guardado: ${Object.keys(draftOverrides).length} celda(s) aplicadas.` });
    } catch {
      setAiError("No se pudo guardar el horario generado. Intenta de nuevo.");
    }
    setApplyingDraft(false);
  };

  const doDiscardAiDraft = () => {
    setDraftActive(false); setDraftOverrides({}); setAiNotes(null); setAiError(null);
  };

  const employeeWarnings = activeEmployees.map(emp => ({
    emp, ...computeScheduleWarnings(emp, daysIso, viewEntriesByEmployee[emp.id] || {}),
  })).filter(w => w.warnings.length > 0);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Horario Mensual</h2>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹ Mes anterior</Button>
          <span className="text-sm font-medium capitalize" style={{ color: C.ink }}>{monthLabel}</span>
          <Button size="sm" variant="ghost" onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Mes siguiente ›</Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setShowManage(v => !v)}>{showManage ? "Ocultar gestión" : "Gestionar empleados"}</Button>}
          {isAdmin && <Button size="sm" variant="ghost" icon={History} onClick={() => setShowEditLog(v => !v)}>{showEditLog ? "Ocultar historial" : "Historial de cambios"}</Button>}
        </div>
      </div>

      {isAdmin && showEditLog && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Historial de cambios del horario</div>
          {scheduleEditLog.length === 0 ? (
            <p className="text-xs" style={{ color: C.gray }}>Todavía no hay cambios registrados.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {scheduleEditLog.slice(0, 100).map(e => (
                <div key={e.id} className="text-xs rounded-md px-2 py-1.5" style={{ background: C.bg, color: C.ink }}>
                  <b>{e.by}</b> cambió el turno de <b>{e.employeeName}</b> del {new Date(e.date + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}:{" "}
                  <span style={{ color: C.gray }}>{e.before}</span> → <span style={{ color: C.amber, fontWeight: 600 }}>{e.after}</span>
                  {e.source === "ia" && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded" style={{ background: "#f0e6fb", color: "#6b21a8" }}>IA</span>}
                  <span className="ml-1.5" style={{ color: C.gray }}>· {fmtDT(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
          Solo puedes ver el horario. Si necesitas un cambio, pídeselo a un administrador.
        </div>
      )}

      {isAdmin && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.amberSoft, color: "#7a5405" }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span>¿Primera vez usando esto? Importa de una vez el horario real ya trabajado, para tener la base sobre la que la IA arma los siguientes meses.</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" disabled={importing} onClick={() => doImport(onImportJuly, "16 jul – 2 ago 2026")}>{importing ? "Importando…" : "Importar julio 2026"}</Button>
              <Button size="sm" disabled={importing} onClick={() => doImport(onImportAugust, "3 ago – 30 ago 2026")}>{importing ? "Importando…" : "Importar agosto 2026"}</Button>
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: `1px solid ${C.amber}` }}>
            <div className="mb-2">O sube tu propio Excel (el mismo formato de siempre — filas "Hora" con los días por columna) y se carga al mes que tienes seleccionado arriba: <b>{monthLabel}</b>.</div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFileChange} disabled={excelParsing}
                className="text-xs" style={{ color: "#7a5405" }} />
              {excelParsing && <span>Leyendo archivo…</span>}
            </div>
            {excelParseError && <div className="mt-2" style={{ color: C.red }}>{excelParseError}</div>}

            {excelParsed && (
              <div className="mt-2 rounded-md p-2" style={{ background: C.panel }}>
                <div className="mb-1" style={{ color: C.ink }}>
                  Se cargarán <b>{excelParsed.entries.length}</b> registros para <b>{excelParsed.names.length}</b> persona(s) en <b>{monthLabel}</b>.
                </div>
                {excelParsed.warnings.length > 0 && (
                  <div className="mb-1" style={{ color: "#a31245" }}>
                    {excelParsed.warnings.length} aviso(s) — estos días se dejaron vacíos, revísalos a mano después:
                    <ul className="list-disc pl-4 mt-1">
                      {excelParsed.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                      {excelParsed.warnings.length > 8 && <li>…y {excelParsed.warnings.length - 8} más.</li>}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Button size="sm" icon={Upload} disabled={excelApplying} onClick={doApplyExcelImport}>
                    {excelApplying ? "Guardando…" : `Confirmar e importar a ${monthLabel}`}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={excelApplying} onClick={() => { setExcelParsed(null); setExcelParseError(null); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {isAdmin && showManage && <EmployeeManagePanel employees={employees} onCreateEmployee={onCreateEmployee} onUpdateEmployee={onUpdateEmployee} onDeleteEmployee={onDeleteEmployee} />}

      {isAdmin && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.amber, background: C.panel }}>
          <button onClick={() => setShowAiPanel(v => !v)} className="flex items-center gap-2 w-full text-left">
            <Sparkles size={16} color={C.amber} />
            <span className="text-sm font-semibold flex-1" style={{ color: C.ink }}>Generar borrador de {monthLabel} con IA</span>
            {showAiPanel ? <ChevronDown size={16} color={C.gray} /> : <ChevronRight size={16} color={C.gray} />}
          </button>

          {showAiPanel && !draftActive && (
            <div className="mt-3">
              <div className="mb-3">
                <div className="text-xs font-semibold mb-1" style={{ color: C.ink }}>Reglas generales del equipo (se guardan y se usan SIEMPRE, en todos los meses)</div>
                <div className="text-xs mb-2" style={{ color: C.inkSoft }}>
                  Esto no hay que volver a escribirlo cada mes — se guarda una sola vez y la IA lo tiene en cuenta siempre que generes un horario, hasta que tú lo cambies aquí.
                </div>
                {standingRulesLoaded ? (
                  <>
                    <textarea value={standingRules} onChange={e => setStandingRules(e.target.value)} rows={5}
                      className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" disabled={standingRulesSaving} onClick={saveStandingRules}>
                        {standingRulesSaving ? "Guardando…" : "Guardar reglas generales"}
                      </Button>
                      {standingRulesSaved && <span className="text-xs" style={{ color: C.green }}>Guardado ✓</span>}
                    </div>
                  </>
                ) : <div className="text-xs" style={{ color: C.inkSoft }}>Cargando…</div>}
              </div>

              <div className="pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="text-xs font-semibold mb-1 mt-2" style={{ color: C.ink }}>¿Algo especial solo para {monthLabel}? (opcional, no se guarda)</div>
                <textarea value={aiRulesText} onChange={e => setAiRulesText(e.target.value)} rows={3}
                  placeholder="Ej: Barrios está de vacaciones del 10 al 15. Esta semana hace falta un refuerzo extra el jueves."
                  className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                <Button size="sm" icon={Sparkles} disabled={aiGenerating} onClick={doGenerateAiDraft}>
                  {aiGenerating ? "Generando borrador…" : "Generar borrador"}
                </Button>
                {aiError && <div className="text-xs mt-2" style={{ color: C.red }}>{aiError}</div>}
              </div>
            </div>
          )}

          {draftActive && (
            <div className="mt-3">
              <div className="rounded-md p-2 mb-2 text-xs" style={{ background: "#fdf0da", color: "#7a5405" }}>
                <b>Borrador sin guardar</b> — las celdas marcadas con <Sparkles size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> en
                la tabla de abajo son las que propuso la IA. Haz clic en cualquiera para editarla antes de guardar, igual que con una celda normal.
              </div>
              {aiNotes && <div className="text-xs mb-2" style={{ color: C.inkSoft }}><b>Notas de la IA:</b> {aiNotes}</div>}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" disabled={applyingDraft} onClick={doApplyAiDraft}>
                  {applyingDraft ? "Guardando…" : `Guardar este horario (${Object.keys(draftOverrides).length} celdas)`}
                </Button>
                <Button size="sm" variant="ghost" disabled={applyingDraft} onClick={doDiscardAiDraft}>Descartar borrador</Button>
              </div>
              {aiError && <div className="text-xs mt-2" style={{ color: C.red }}>{aiError}</div>}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <span className="text-xs" style={{ color: C.inkSoft }}>Descarga los turnos de este mes para agregarlos a tu calendario del celular:</span>
        <select value={icsEmployeeId} onChange={e => setIcsEmployeeId(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <option value="">Elige tu nombre…</option>
          {sortedEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <Button size="sm" variant="ghost" icon={Download} disabled={!icsEmployeeId}
          onClick={() => {
            const emp = employees.find(e => e.id === icsEmployeeId);
            if (!emp) return;
            const ics = buildIcsForEmployee(emp, daysIso, entriesByEmployee);
            const blob = new Blob([ics], { type: "text/calendar" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `turnos-${emp.name.replace(/\s+/g, "-")}-${monthDate.getFullYear()}-${monthDate.getMonth() + 1}.ics`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
          Agregar al calendario
        </Button>
      </div>

      {isAdmin && editingCell && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.amber, background: C.amberSoft }}>
          <div className="text-sm font-semibold mb-2" style={{ color: "#7a5405" }}>
            {activeEmployees.find(e => e.id === editingCell.employeeId)?.name} — {fmtDayFull(new Date(editingCell.dateIso + "T00:00:00"))}
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-2 text-sm">
            <label className="flex items-center gap-1" style={{ color: "#7a5405" }}>
              <input type="radio" checked={draftMode === "hours"} onChange={() => setDraftMode("hours")} /> Horas exactas
            </label>
            <label className="flex items-center gap-1" style={{ color: "#7a5405" }}>
              <input type="radio" checked={draftMode === "special"} onChange={() => setDraftMode("special")} /> Día especial
            </label>
          </div>

          {draftMode === "hours" ? (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <input type="number" step="0.5" value={draftEntrada} onChange={e => setDraftEntrada(e.target.value)} placeholder="Entrada (ej. 8.5)"
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <input type="number" step="0.5" value={draftSalida} onChange={e => setDraftSalida(e.target.value)} placeholder="Salida (ej. 16.5)"
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
              <span className="text-xs" style={{ color: C.gray }}>Formato decimal: 8.5 = 8:30, 16.5 = 4:30 p.m.</span>
            </div>
          ) : (
            <div className="mb-2">
              <select value={draftCode} onChange={e => setDraftCode(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <option value="">(elegir)</option>
                {SPECIAL_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
          )}

          <input value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="Nota (opcional)"
            className="text-sm border rounded-md px-2 py-1.5 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />

          {impact && (
            <div className="text-xs rounded-md p-2 mb-2" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
              <div style={{ color: C.ink }}>
                Semana {impact.weekLabel}: <b>{impact.before}h</b> antes → <b style={{ color: Math.abs(impact.diff) >= 4 ? C.red : C.ink }}>{impact.after}h</b> con este cambio
                (objetivo {WEEKLY_HOURS_TARGET}h, {impact.diff >= 0 ? "+" : ""}{Math.round(impact.diff * 10) / 10}h de diferencia).
              </div>
              {impact.isSundayHoliday && draftMode === "hours" && draftEntrada !== "" && (
                <div style={{ color: C.red }} className="mt-1">⚠ Este día es domingo o festivo.</div>
              )}
              {impact.restDayHit && (
                <div style={{ color: C.red }} className="mt-1">⚠ Este empleado tiene este día marcado como descanso fijo.</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveCell}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingCell(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este mes</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="text-xs mb-2" style={{ color: C.gray }}>
        Encabezado en rojo = domingo o festivo. Cada celda muestra hora de entrada-salida (ej. 8.5-16.5). Las alertas (⚠) son una ayuda
        visual según las reglas que nos diste — no reemplazan la revisión de las normas laborales vigentes.
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <table className="text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 150, position: "sticky", left: 0, zIndex: 2, background: C.steelDark, boxShadow: "2px 0 4px rgba(0,0,0,0.15)" }}>Empleado</th>
              {daysIso.map(d => {
                const dd = new Date(d + "T00:00:00");
                return (
                  <th key={d} className="px-1 py-2 text-center" style={{ minWidth: 46, background: isSundayOrHoliday(d) ? "#7a3535" : C.steelDark }}>
                    {dd.getDate()}
                  </th>
                );
              })}
              <th className="px-2 py-2 text-center" style={{ minWidth: 46 }}>Dom/Fest</th>
              <th className="px-2 py-2 text-center" style={{ minWidth: 50 }}>Total mes</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastCargo = null;
              return sortedEmployees.map((emp, i) => {
                const entries = viewEntriesByEmployee[emp.id] || {};
                const { sundaysHolidaysCount, warnings } = computeScheduleWarnings(emp, daysIso, entries);
                const monthTotal = weeks.reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
                const showGroupHeader = (emp.cargo || "") !== lastCargo;
                lastCargo = emp.cargo || "";
                return (
                  <React.Fragment key={emp.id}>
                    {showGroupHeader && (
                      <tr>
                        <td colSpan={daysIso.length + 3} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: C.bg, color: C.inkSoft }}>
                          {emp.cargo || "Sin cargo asignado"}
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: i % 2 ? C.cardAlt : C.panel, borderTop: `1px solid ${C.line}` }}>
                      <td className="px-2 py-1.5" style={{ color: C.ink, fontWeight: 500, position: "sticky", left: 0, zIndex: 1, background: i % 2 ? C.cardAlt : C.panel, boxShadow: "2px 0 4px rgba(0,0,0,0.08)" }}>
                        {emp.name}
                        {emp.badge && (
                          <span className="text-[10px] font-normal ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: "#f0e6fb", color: "#6b21a8" }}>
                            {emp.badge}
                          </span>
                        )}
                        {emp.reductionHoursPerDay > 0 && (() => {
                          const comp = computeCompBalance(emp, scheduleEntries);
                          return (
                            <span className="text-[10px] font-normal ml-1.5 px-1.5 py-0.5 rounded-full" title="Horas de reducción acumuladas (informativo — no se asigna sola, la das tú a mano poniendo el código COMP en el día que elijas)"
                              style={{ background: comp.fullDays >= 1 ? "#fde68a" : "#eef1f4", color: comp.fullDays >= 1 ? "#78350f" : "#5c6b7a" }}>
                              {comp.fullDays >= 1 ? `¡${comp.fullDays} día(s) ganado(s)!` : `${comp.hours}h acum.`}
                            </span>
                          );
                        })()}
                        {warnings.length > 0 && <AlertTriangle size={12} style={{ display: "inline", color: C.red, marginLeft: 4, verticalAlign: "-1px" }} />}
                      </td>
                      {daysIso.map(d => {
                        const entry = entries[d];
                        const isDraftCell = draftActive && !!draftOverrides[scheduleKey(emp.id, d)];
                        const colors = entry?.code ? SPECIAL_CODE_COLORS[entry.code] : null;
                        return (
                          <td key={d} className="px-0.5 py-1 text-center" style={{
                            background: isDraftCell ? "#fdf0da" : (colors?.bg || (isSundayOrHoliday(d) ? "#fdf2f2" : "transparent")),
                            boxShadow: isDraftCell ? `inset 0 0 0 1px ${C.amber}` : "none",
                          }}>
                            {isAdmin ? (
                              <button onClick={() => openCell(emp.id, d)} className="w-full text-xs py-1" style={{ color: colors?.fg || C.ink }}>
                                {fmtEntryShort(entry) || "·"}{isDraftCell && <Sparkles size={9} style={{ display: "inline", marginLeft: 2, verticalAlign: "1px", color: "#8a5a00" }} />}
                              </button>
                            ) : (
                              <span className="text-xs" style={{ color: colors?.fg || C.ink }}>{fmtEntryShort(entry)}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-semibold" style={{ color: sundaysHolidaysCount > 3 ? C.red : C.ink }}>{sundaysHolidaysCount}</td>
                      <td className="px-2 py-1.5 text-center font-semibold" style={{ color: C.ink }}>{monthTotal || ""}</td>
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
            {activeEmployees.length === 0 && (
              <tr><td className="px-2 py-6 text-center text-xs" colSpan={daysIso.length + 3} style={{ color: C.gray }}>
                Sin empleados registrados todavía.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {employeeWarnings.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Alertas de este mes</div>
          {employeeWarnings.map(({ emp, warnings }) => (
            <div key={emp.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="text-sm font-medium" style={{ color: C.ink }}>{emp.name}</div>
              {warnings.map((w, i) => <div key={i} className="text-xs" style={{ color: C.red }}>⚠ {w}</div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: EQUIPOS FUERA DE SERVICIO
   ============================================================ */
/* ============================================================
   VISTA: INICIO (pantalla de bienvenida según rol)
   ============================================================ */
/* ============================================================
   CAMPANA DE NOTIFICACIONES (admin) — turnos que no hicieron su recorrido
   ============================================================ */
/* ============================================================
   BÚSQUEDA GLOBAL — busca en TODOS los catálogos de equipos de la app
   ============================================================ */
function GlobalSearch({ currentView, mttoEquipos, invItems, employees, tasks, onNavigate, onOpenEquipo, onOpenShelf, onOpenFloor }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];

    // Si estás DENTRO de una pantalla con su propio catálogo de equipos, la búsqueda se limita
    // solo a esa pantalla — así no te saca de lo que estás llenando para llevarte a otro lado.
    const scoped = {
      ronda: () => FLOORS.flatMap(floor => floor.items
        .filter(item => item.n.toLowerCase().includes(query))
        .map(item => ({ tipo: "Ronda de revisión", label: item.n, sub: floor.name, action: () => onOpenFloor(floor.id) }))),
      coldrooms: () => ALL_COLD_ROOM_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Cuartos Fríos", label: i.n, sub: "", action: () => onNavigate("coldrooms") })),
      meters: () => ALL_METERS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Medidores", label: i.n, sub: "", action: () => onNavigate("meters") })),
      laundry: () => LAVANDERIA_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Lavandería", label: i.n, sub: "", action: () => onNavigate("laundry") })),
      gym: () => GYM_ALL_ITEMS.filter(i => i.n.toLowerCase().includes(query))
        .map(i => ({ tipo: "Gimnasio", label: i.n, sub: "", action: () => onNavigate("gym") })),
      maintenance: () => (mttoEquipos || []).filter(e => e.active !== false && (e.nombre.toLowerCase().includes(query) || e.sistema.toLowerCase().includes(query)))
        .map(e => ({ tipo: "Mantenimiento", label: e.nombre, sub: e.sistema, action: () => onOpenEquipo(e.id) })),
      inventory: () => (invItems || []).filter(it => it.name.toLowerCase().includes(query) || (it.sku || "").toLowerCase().includes(query))
        .map(it => ({ tipo: "Inventario", label: it.name, sub: it.sku || "", action: () => onOpenShelf(it.shelfId) })),
      schedules: () => (employees || []).filter(e => e.active !== false && e.name.toLowerCase().includes(query))
        .map(e => ({ tipo: "Empleado", label: e.name, sub: e.cargo || "", action: () => onNavigate("schedules") })),
      tasks: () => (tasks || []).filter(t => t.titulo.toLowerCase().includes(query))
        .map(t => ({ tipo: "Tarea", label: t.titulo, sub: TASK_STATES.find(s => s.code === t.estado)?.label || "", action: () => onNavigate("tasks") })),
    };

    if (scoped[currentView]) return scoped[currentView]().slice(0, 25);

    // Fuera de esas pantallas (Inicio, Admin, etc.) sí busca en todo, para poder llegar a donde sea.
    return Object.values(scoped).flatMap(fn => fn()).slice(0, 25);
  }, [q, currentView, mttoEquipos, invItems, employees, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopedLabels = {
    ronda: "Buscar en la Ronda de revisión…", coldrooms: "Buscar en Cuartos Fríos…", meters: "Buscar en Medidores…",
    laundry: "Buscar en Lavandería…", gym: "Buscar en Gimnasio…", maintenance: "Buscar en Mantenimiento…",
    inventory: "Buscar en Inventario…", schedules: "Buscar empleado…", tasks: "Buscar tarea…",
  };

  return (
    <div className="relative flex-1" style={{ maxWidth: 280 }}>
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" color={C.gray} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={scopedLabels[currentView] || "Buscar cualquier equipo, repuesto, empleado…"}
          className="text-sm border rounded-md pl-7 pr-2 py-1.5 outline-none w-full" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
      </div>
      {open && q.trim().length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pm-animate-in fixed left-2 right-2 top-16 sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-1 sm:w-96 rounded-lg border shadow-lg z-50 max-h-[65vh] overflow-y-auto"
            style={{ background: C.panel, borderColor: C.line }}>
            {results.length === 0 ? (
              <div className="p-3 text-xs" style={{ color: C.gray }}>Sin resultados para "{q}".</div>
            ) : results.map((r, i) => (
              <button key={i} onClick={() => { r.action(); setOpen(false); setQ(""); }}
                className="pm-stagger-in block w-full text-left px-3 py-2 border-b last:border-0" style={{ borderColor: C.line, animationDelay: `${Math.min(i, 10) * 25}ms` }}>
                <div className="text-xs font-semibold" style={{ color: C.amber }}>{r.tipo}</div>
                <div className="text-sm" style={{ color: C.ink }}>{r.label}</div>
                {r.sub && <div className="text-xs" style={{ color: C.gray }}>{r.sub}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Equipos que llevan reportados como dañados más de X días sin que nadie los marque como resueltos
 *  ni confirme "Sigue igual" — para que no se queden ahí "quietos" sin que nadie se dé cuenta. */
function computeStaleIssues(activeIssues, thresholdDays = 15) {
  const now = Date.now();
  return Object.values(activeIssues)
    .map(iss => {
      const checkins = iss.checkins || [];
      const lastTouch = checkins.length ? checkins[checkins.length - 1].at : iss.openedAt;
      const daysOpen = Math.floor((now - new Date(lastTouch).getTime()) / (1000 * 60 * 60 * 24));
      return { ...iss, daysOpen };
    })
    .filter(iss => iss.daysOpen >= thresholdDays)
    .sort((a, b) => b.daysOpen - a.daysOpen);
}

function NotificationBell({ alerts, maintenanceDue, staleIssues, criticalStock, fuelAlerts, onNavigate }) {
  const [open, setOpen] = useState(false);
  const shortcuts = {
    "Lecturas de Medidores": "meters", "Ronda de revisión": "ronda", "Cuartos Fríos": "coldrooms", "Equipos de Gimnasio": "gym",
    "Check List Caldera": "boiler", "Equipos de Lavandería": "laundry",
  };
  const totalCount = alerts.length + (maintenanceDue?.items?.length ? 1 : 0) + (staleIssues?.length || 0) + (criticalStock?.length || 0) + (fuelAlerts?.length || 0);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-1.5 rounded-md" style={{ background: C.bg }}>
        <Bell size={16} color={C.ink} />
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${(criticalStock?.length || fuelAlerts?.length) ? "animate-pulse" : ""}`} style={{ background: C.red, color: "#fff" }}>
            {totalCount}
          </span>
        )}
      </button>
      {open && (
        <>
          {/* fondo invisible: tocar en cualquier parte fuera del panel lo cierra */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pm-animate-in fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-lg border shadow-lg z-50 max-h-[70vh] overflow-y-auto"
            style={{ background: "#fff", borderColor: C.line }}>
            <div className="flex items-center justify-between p-3 border-b sticky top-0" style={{ borderColor: C.line, background: "#fff" }}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Notificaciones</div>
              <button onClick={() => setOpen(false)} className="p-0.5"><X size={14} color={C.gray} /></button>
            </div>

            {fuelAlerts && fuelAlerts.length > 0 && (
              <>
                <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.red }}>⚠ Combustible crítico — reabastecer ya</div>
                <div className="px-3 pb-3">
                  {fuelAlerts.map((t, i) => (
                    <button key={i} onClick={() => { onNavigate("fuel"); setOpen(false); }}
                      className="block text-xs text-left w-full py-1" style={{ color: C.red }}>
                      · {t.nombre} — {t.pct}% <span style={{ color: C.gray }}>(mínimo 20%)</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {criticalStock && criticalStock.length > 0 && (
              <>
                <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.red }}>⚠ Stock crítico — reabastecer ya</div>
                <div className="px-3 pb-3">
                  {criticalStock.map((it, i) => (
                    <button key={i} onClick={() => { onNavigate("inventory-alerts"); setOpen(false); }}
                      className="block text-xs text-left w-full py-1" style={{ color: C.red }}>
                      · {it.name} — quedan {it.quantity} <span style={{ color: C.gray }}>(mínimo {it.minThreshold})</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Recorridos pendientes de hoy</div>
            {alerts.length === 0 ? (
              <div className="px-3 pb-3 text-xs" style={{ color: C.gray }}>Todo al día — ningún turno tiene pendientes por ahora.</div>
            ) : alerts.map((a, i) => (
              <div key={i} className="p-3 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.red }}>{a.turno}</div>
                {a.missing.map((m, j) => (
                  <button key={j} onClick={() => { onNavigate(shortcuts[m] || "home"); setOpen(false); }}
                    className="block text-xs text-left w-full py-0.5" style={{ color: C.ink }}>
                    · {m} — sin registrar
                  </button>
                ))}
              </div>
            ))}

            {staleIssues && staleIssues.length > 0 && (
              <>
                <div className="p-3 pb-1 border-t text-xs font-semibold uppercase tracking-wide" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
                  Llevan mucho tiempo sin resolverse
                </div>
                <div className="px-3 pb-3">
                  {staleIssues.map((iss, i) => (
                    <button key={i} onClick={() => { onNavigate("issues"); setOpen(false); }}
                      className="block text-xs text-left w-full py-1" style={{ color: C.red }}>
                      · #{iss.code} {iss.name} <span style={{ color: C.gray }}>({iss.floorName})</span> — lleva {iss.daysOpen} días
                    </button>
                  ))}
                </div>
              </>
            )}

            {maintenanceDue && (
              <>
                <div className="p-3 pb-1 border-t text-xs font-semibold uppercase tracking-wide" style={{ borderColor: C.line, background: C.panel, color: C.inkSoft }}>
                  Mantenimiento por vencer este mes {maintenanceDue.daysLeft <= 10 ? `(quedan ${maintenanceDue.daysLeft} días)` : ""}
                </div>
                {maintenanceDue.items.length === 0 ? (
                  <div className="px-3 pb-3 text-xs" style={{ color: C.gray }}>Nada urgente por ahora.</div>
                ) : (
                  <div className="px-3 pb-3">
                    {maintenanceDue.items.map((it, i) => (
                      <button key={i} onClick={() => { onNavigate("maintenance-schedule"); setOpen(false); }}
                        className="block text-xs text-left w-full py-1" style={{ color: it.estado === "atrasado" ? C.red : C.ink }}>
                        · {it.equipo} <span style={{ color: C.gray }}>({it.sistema})</span> — {it.estado === "atrasado" ? "atrasado" : "pendiente"}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PushEnableButton({ onEnable }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  if (!supported) return null;

  const click = async () => {
    setBusy(true); setMsg(null);
    const res = await onEnable();
    setMsg(res);
    setBusy(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="relative">
      <button onClick={click} disabled={busy} title="Activar notificaciones en este dispositivo"
        className="p-1.5 rounded-md" style={{ background: C.bg }}>
        <Bell size={16} color={busy ? C.gray : C.amber} />
      </button>
      {msg && (
        <div className="pm-animate-in fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64 rounded-lg border shadow-lg z-50 p-3 text-xs"
          style={{ background: "#fff", borderColor: C.line, color: msg.ok ? C.green : C.red }}>
          {msg.message}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RECORRIDO GUIADO (primera vez que alguien entra)
   ============================================================ */
const ONBOARDING_STEPS = [
  { title: "¡Bienvenido a Pisos Mecánicos!", body: "Esta es la app para tus rondas, mantenimiento, inventario y más — reemplaza los formatos en papel. Te mostramos rápido cómo usarla, toma un minuto." },
  { title: "Todo empieza en Inicio", body: "Ahí tienes una tarjeta por cada sección de la app. Toca la que necesites. Si alguna se ve atenuada/gris, es porque tu cuenta no tiene ese permiso — pídeselo a un administrador si crees que deberías tenerlo." },
  { title: "Tu ronda diaria", body: "Entra a \"Ronda de revisión\", elige tu turno arriba a la derecha, y ve marcando cada equipo piso por piso. Guarda al terminar cada piso, y sigue al siguiente." },
  { title: "Si algo está dañado", body: "Marca \"Dañado / Fuera de servicio\" en ese equipo y escribe qué pasó — es obligatorio. Queda registrado y avisa a los administradores." },
  { title: "Busca lo que necesites", body: "Arriba hay un buscador — te ayuda a encontrar cualquier equipo rápido, sin tener que navegar por los menús. Busca justo donde estés trabajando." },
  { title: "¡Listo para empezar!", body: "Puedes volver a ver esta guía cuando quieras desde el botón de ayuda (?) arriba, junto al resto de íconos." },
];

/* ============================================================
   ESCÁNER DE QR (con la cámara, para saltar directo a un equipo/estantería)
   ============================================================ */
function QrScannerView({ onClose, onFoundEquipo, onFoundShelf }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let jsQR = null;
    (async () => {
      try {
        jsQR = (await import("jsqr")).default;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanLoop();
      } catch {
        setError("No se pudo acceder a la cámara — revisa que le hayas dado permiso a la app en la configuración del celular.");
      }
    })();

    const canvas = document.createElement("canvas");
    function scanLoop() {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scanLoop); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR ? jsQR(imgData.data, imgData.width, imgData.height) : null;
      if (code && code.data) {
        try {
          const url = new URL(code.data);
          const equipoId = url.searchParams.get("equipo");
          const shelfId = url.searchParams.get("shelf");
          if (equipoId || shelfId) {
            setFound(true);
            setTimeout(() => { equipoId ? onFoundEquipo(equipoId) : onFoundShelf(shelfId); }, 300);
            return; // deja de escanear, ya encontró algo
          }
        } catch { /* el QR no era una URL válida de esta app — sigue escaneando */ }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: "#000" }}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
        <X size={22} color="#fff" />
      </button>
      {error ? (
        <div className="text-center px-6">
          <AlertTriangle size={32} color={C.amber} className="mx-auto mb-3" />
          <p className="text-sm text-white mb-4">{error}</p>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-2xl" style={{
              width: 240, height: 240,
              border: `3px solid ${found ? C.green : "#fff"}`,
              boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)",
              transition: "border-color 0.2s ease",
            }} />
          </div>
          <div className="absolute bottom-8 left-0 right-0 text-center px-6">
            <p className="text-sm text-white font-medium">{found ? "✓ Código encontrado" : "Apunta la cámara al código QR del equipo o estantería"}</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Medidor circular pequeño — la idea visual de todo el rediseño de Inicio: en vez de tarjetas de
 * "dashboard bancario" genéricas, widgets que se sienten como los manómetros del piso mecánico
 * mismo (coherente con el ícono de la app y el nombre "Pisos Mecánicos").
 */
function MiniGauge({ value, max, size = 56, stroke = 6, color, trackColor }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor || C.line} strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }} />
    </svg>
  );
}

/**
 * Donut de varios segmentos, en SVG puro (sin recharts) — recibe [{ value, color }, ...].
 * Se usa en vez del PieChart de recharts para evitar un bug conocido de esa librería.
 */
function MiniDonut({ segments, size = 140, stroke = 22 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const [hover, setHover] = useState(null);
  let offsetSoFar = 0;
  return (
    <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} onMouseLeave={() => setHover(null)}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = circumference * frac;
          const gap = circumference - dash;
          const rotation = -90 + (offsetSoFar / total) * 360;
          offsetSoFar += seg.value;
          if (frac <= 0) return null;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`} strokeLinecap="butt" transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ cursor: seg.name ? "pointer" : "default", transition: "opacity 120ms" }}
              opacity={hover && hover !== seg ? 0.45 : 1}
              onMouseEnter={() => seg.name && setHover(seg)} />
          );
        })}
      </svg>
      {hover && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-1.5 text-xs pointer-events-none"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10 }}>
          <div className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full" style={{ background: hover.color }} />{hover.name}</div>
          <div style={{ color: C.gray }}>{hover.value} ({Math.round((hover.value / total) * 100)}%)</div>
        </div>
      )}
    </div>
  );
}

/**
 * Barras horizontales hechas con divs simples — reemplaza el layout="vertical" de BarChart de
 * recharts, que tiene un historial largo de bugs conocidos en esa librería. data: array de
 * objetos; labelKey/valueKey: qué campo usar de cada uno; colorFor(d): color de esa barra;
 * formatValue(v): cómo mostrar el número al lado.
 */
function HorizontalBarChart({ data, labelKey, valueKey, colorFor, formatValue, max, gradient = false }) {
  const maxVal = max ?? Math.max(1, ...data.map(d => Number(d[valueKey]) || 0));
  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.max(0, Math.min(100, (val / maxVal) * 100));
        const color = colorFor ? colorFor(d) : C.amber;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1.5 gap-3">
              <span style={{ color: C.ink }} className="truncate">{d[labelKey]}</span>
              <span className="font-bold shrink-0 tabular-nums" style={{ color, fontSize: 15 }}>{formatValue ? formatValue(val, d) : val}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: C.bg, height: 10 }}>
              <div className="h-full rounded-full" style={{
                width: `${pct}%`,
                background: gradient ? `linear-gradient(90deg, ${color}99, ${color})` : color,
                transition: "width 600ms var(--ease-out)",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Barras verticales simples, sin recharts — cada barra es un div con altura en %. */
function VerticalBarChart({ data, labelKey, valueKey, colorFor, formatValue, max = 100 }) {
  return (
    <div className="flex items-end gap-2" style={{ height: 180 }}>
      {data.map((d, i) => {
        const val = d[valueKey];
        const pct = val === null || val === undefined ? 0 : Math.max(2, Math.min(100, (Number(val) / max) * 100));
        const color = val === null || val === undefined ? C.gray : (colorFor ? colorFor(val) : C.amber);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[10px] font-semibold mb-1 truncate w-full text-center" style={{ color }}>
              {val === null || val === undefined ? "—" : (formatValue ? formatValue(val) : val)}
            </span>
            <div className="w-full rounded-t-md" style={{ height: `${pct}%`, minHeight: 4, background: color, transition: "height 500ms ease-out" }} />
            <span className="text-[9px] mt-1 truncate w-full text-center" style={{ color: C.gray }} title={d[labelKey]}>{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Línea de tendencia pequeña ("sparkline"), en SVG puro — sin recharts. */
function Sparkline({ points, width = 200, height = 50, color }) {
  if (!points || points.length < 2) return null;
  const values = points.map(p => p.v);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={coords} fill="none" stroke={color || C.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function median(nums) {
  const arr = (nums || []).filter(n => n != null).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

/**
 * Gráfico de líneas de tiempo (SVG propio, sin librerías) — una o más series (ej. Preventivo vs.
 * Correctivo) a lo largo de varios períodos, con línea de tendencia punteada opcional y un
 * tooltip flotante que sigue al cursor por columna.
 */
function TimeSeriesLineChart({ series, labels, trend, height = 240 }) {
  const width = 640;
  const padL = 34, padR = 12, padT = 14, padB = 26;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const n = labels.length;
  const [hoverIdx, setHoverIdx] = useState(null);

  if (n === 0) return <div className="text-sm text-center py-10" style={{ color: C.gray }}>Sin datos suficientes para este período.</div>;

  const allY = series.flatMap(s => s.points).concat(trend || []);
  const maxY = Math.max(2, ...allY);
  const xAt = (i) => n > 1 ? padL + (i / (n - 1)) * plotW : padL + plotW / 2;
  const yAt = (v) => padT + (1 - v / maxY) * plotH;
  const gridSteps = 4;
  const gridVals = Array.from({ length: gridSteps + 1 }, (_, i) => Math.round((maxY / gridSteps) * i));
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible", display: "block" }}
        onMouseLeave={() => setHoverIdx(null)}>
        {gridVals.map((g, gi) => (
          <g key={gi}>
            <line x1={padL} x2={width - padR} y1={yAt(g)} y2={yAt(g)} stroke={C.line} strokeWidth={1} />
            <text x={padL - 6} y={yAt(g) + 3} textAnchor="end" fontSize={9} fill={C.gray}>{g}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % labelEvery === 0 || i === n - 1) && (
          <text key={i} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize={9} fill={C.gray}>{lb}</text>
        ))}
        {trend && trend.length > 1 && (
          <polyline points={trend.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            fill="none" stroke={C.gray} strokeWidth={1.5} strokeDasharray="5 4" />
        )}
        {series.map(s => (
          <polyline key={s.name} points={s.points.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {labels.map((_, i) => (
          <rect key={i} x={xAt(i) - (plotW / n) / 2} y={padT} width={plotW / Math.max(1, n)} height={plotH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}
        {hoverIdx != null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padT} y2={height - padB} stroke={C.gray} strokeWidth={1} strokeDasharray="2 2" />
        )}
        {hoverIdx != null && series.map(s => (
          <circle key={s.name} cx={xAt(hoverIdx)} cy={yAt(s.points[hoverIdx])} r={4} fill={s.color} stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
      {hoverIdx != null && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-2 text-xs pointer-events-none"
          style={{
            left: `${Math.min(88, Math.max(12, (xAt(hoverIdx) / width) * 100))}%`, top: 4, transform: "translateX(-50%)",
            background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10,
          }}>
          <div className="font-semibold mb-1">{labels[hoverIdx]}</div>
          {series.map(s => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.name}: <b>{s.points[hoverIdx]}</b>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map(s => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}
          </span>
        ))}
        {trend && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
            <span className="w-3 h-0.5" style={{ background: C.gray }} />Tendencia (promedio móvil)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Matriz de criticidad: frecuencia de fallas (eje X) vs. costo acumulado (eje Y), un punto por
 * equipo. El cuadrante superior derecho (alta frecuencia + alto costo) es el que vale la pena
 * evaluar para reemplazo — se resalta con fondo rojo suave.
 */
function CriticalityScatter({ data }) {
  const width = 640, height = 320;
  const padL = 46, padR = 16, padT = 16, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const [hover, setHover] = useState(null);

  if (data.length === 0) return <div className="text-sm text-center py-10" style={{ color: C.gray }}>Sin fallas correctivas registradas todavía.</div>;

  const maxF = Math.max(1, ...data.map(d => d.frecuencia));
  const maxC = Math.max(1, ...data.map(d => d.costo));
  const medF = median(data.map(d => d.frecuencia));
  const medC = median(data.map(d => d.costo));
  const xAt = (f) => padL + (f / maxF) * plotW;
  const yAt = (c) => padT + (1 - c / maxC) * plotH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible", display: "block" }}>
        <rect x={xAt(medF)} y={padT} width={Math.max(0, width - padR - xAt(medF))} height={Math.max(0, yAt(medC) - padT)} fill={C.redSoft} opacity={0.6} />
        <text x={width - padR - 4} y={padT + 14} textAnchor="end" fontSize={9} fill={C.red} fontWeight="600">Evaluar reemplazo</text>
        <line x1={xAt(medF)} x2={xAt(medF)} y1={padT} y2={height - padB} stroke={C.line} strokeDasharray="3 3" />
        <line x1={padL} x2={width - padR} y1={yAt(medC)} y2={yAt(medC)} stroke={C.line} strokeDasharray="3 3" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={C.line} strokeWidth={1} />
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={C.line} strokeWidth={1} />
        <text x={(padL + width - padR) / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={C.gray}>Frecuencia de fallas (correctivos) →</text>
        <text x={12} y={(padT + height - padB) / 2} textAnchor="middle" fontSize={10} fill={C.gray} transform={`rotate(-90 12 ${(padT + height - padB) / 2})`}>Costo acumulado →</text>
        {data.map((d, i) => {
          const critical = d.frecuencia >= medF && d.costo >= medC && d.frecuencia > 0;
          return (
            <circle key={i} cx={xAt(d.frecuencia)} cy={yAt(d.costo)} r={hover === d ? 8 : 6}
              fill={critical ? C.red : C.blue} opacity={0.85} stroke="#fff" strokeWidth={1.5}
              style={{ cursor: "pointer", transition: "r 150ms" }}
              onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(h => h === d ? null : h)} />
          );
        })}
      </svg>
      {hover && (
        <div className="absolute rounded-lg border shadow-lg px-2.5 py-2 text-xs pointer-events-none"
          style={{
            left: `${Math.min(85, Math.max(15, (xAt(hover.frecuencia) / width) * 100))}%`,
            top: `${Math.max(4, (yAt(hover.costo) / height) * 100 - 14)}%`,
            transform: "translate(-50%, -100%)", background: C.panel, borderColor: C.line, color: C.ink, whiteSpace: "nowrap", zIndex: 10,
          }}>
          <div className="font-semibold">{hover.nombre}</div>
          <div style={{ color: C.gray }}>{hover.sistema}</div>
          <div>{hover.frecuencia} falla{hover.frecuencia === 1 ? "" : "s"} · ${hover.costo.toLocaleString("es-CO")}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Badge de alerta rediseñado (pilar 4 del rediseño): antes, cualquier número grande en rojo se
 * veía como una emergencia constante. Ahora: rojo se reserva de verdad para lo urgente (pocas
 * unidades, algo roto ahora mismo); los conteos grandes que son más "para tu información" que
 * "urgente" (como cuántos movimientos de inventario hay en el historial) usan un tono ámbar más
 * calmado, y cualquier número se recorta a "99+" para que nunca se sienta como una alarma sin fin.
 */
function NavBadge({ count, urgent = true, pulse = false }) {
  if (!count) return null;
  const label = typeof count === "string" ? count : count > 99 ? "99+" : String(count);
  const bg = urgent ? C.red : C.amber;
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${pulse ? "animate-pulse" : ""}`}
      style={{ background: bg, color: "#fff", minWidth: 18, textAlign: "center", display: "inline-block" }}>
      {label}
    </span>
  );
}

/**
 * Cronómetro en vivo de una tarea: cuánto tiempo lleva abierta desde que se asignó, o el tiempo
 * total que tomó si ya se cerró. Se refresca solo cada 30s mientras siga activa — de sobra de
 * precisión para un tablero operativo, sin recalcular en cada render de la lista.
 */
function TaskTimer({ assignedAt, finishedAt, estado }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (finishedAt) return; // ya cerró, no hace falta seguir refrescando
    const id = setInterval(() => forceTick(v => v + 1), 30000);
    return () => clearInterval(id);
  }, [finishedAt]);

  if (!assignedAt) return null;
  const end = finishedAt || nowIso();
  const hrs = hoursBetween(assignedAt, end);
  const label = finishedAt ? `Tomó ${fmtHours(hrs)}` : estado === "pausada" ? `${fmtHours(hrs)} abierta` : `${fmtHours(hrs)} abierta`;
  const { bg, fg } = finishedAt
    ? { bg: C.greenSoft, fg: C.green }
    : estado === "pausada" ? { bg: C.amberSoft, fg: "#8a5a00" }
      : hrs > 24 ? { bg: C.redSoft, fg: C.red } : { bg: C.bg, fg: C.inkSoft };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: bg, color: fg }}>
      <Clock size={11} /> {label}
    </span>
  );
}

/** Avatar redondo con las iniciales de la persona — color consistente según su nombre, para
 * reconocer de un vistazo quién tiene asignada cada tarjeta sin tener que leer el nombre completo. */
function Avatar({ name, size = 28 }) {
  const label = (name || "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const palette = [C.blue, C.amber, C.green, C.red, "#8b5cf6", "#0ea5e9", "#db2777"];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) % palette.length;
  const bg = palette[Math.abs(hash)];
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white" title={name || "Sin asignar"}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

/** Visor de foto a pantalla completa — se abre al tocar cualquier miniatura, se cierra tocando
 * afuera o la X. */
function Lightbox({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(10,14,20,0.85)", zIndex: 200 }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
        <X size={20} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full rounded-lg" style={{ objectFit: "contain" }} onClick={e => e.stopPropagation()} />
    </div>
  );
}


function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="pm-animate-in rounded-xl max-w-sm w-full p-5" style={{ background: C.panel }}>
        <div className="flex items-center gap-1 mb-4">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? C.amber : C.line }} />
          ))}
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: C.ink }}>{s.title}</h3>
        <p className="text-sm mb-6" style={{ color: C.inkSoft }}>{s.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs" style={{ color: C.gray }}>Saltar</button>
          <div className="flex items-center gap-2">
            {step > 0 && <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>}
            <Button size="sm" onClick={() => isLast ? onClose() : setStep(step + 1)}>{isLast ? "Entendido" : "Siguiente"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeSearchText(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const MAX_FAVORITES = 5;

function HomeView({ currentUser, isAdmin, isAlmacenista, isGerencia, onNavigate, hasSignature, onGoToProfile, counts, tourProgress, lowStockDetail, activeIssuesList, mttoWeekCount }) {
  const [dismissedSigReminder, setDismissedSigReminder] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pm-local:favorites:${currentUser}`) || "[]"); } catch { return []; }
  });
  const [favMsg, setFavMsg] = useState(null);
  const canManageInv = isAdmin || isAlmacenista;
  const gerenciaLocked = isGerencia && !isAdmin && !isAlmacenista;
  const modules = [
    { id: "ronda", label: "Ronda de revisión", icon: ClipboardList, desc: "Revisión diaria de los 12 pisos mecánicos", access: true },
    { id: "coldrooms", label: "Cuartos Fríos", icon: Snowflake, desc: "Cuartos fríos y máquinas de hielo", access: true, badge: counts.coldOutOfRange },
    { id: "coldrooms-history", label: "Historial de Cuartos Fríos", icon: CalendarDays, desc: "Semana a semana, con envío", access: true },
    { id: "meters", label: "Lecturas de Medidores", icon: Zap, desc: "Consumo de servicios públicos", access: true, badge: counts.meterAnomalies },
    { id: "meters-history", label: "Historial de Medidores", icon: CalendarDays, desc: "Semana a semana, con envío", access: true },
    { id: "inventory", label: "Inventario", icon: Package, desc: "Bodegas, estanterías y repuestos", access: true, badge: counts.lowStock, urgentBadge: false },
    { id: "inventory-alerts", label: "Alertas de Stock", icon: AlertTriangle, desc: "Lista de compras automática", access: canManageInv, badge: counts.lowStock, urgentBadge: false },
    { id: "inventory-movements", label: "Movimientos de Inventario", icon: History, desc: "Quién retiró qué, y cuándo", access: canManageInv },
    { id: "maintenance", label: "Mantenimiento", icon: Wrench, desc: "Registrar mantenimientos por QR", access: true },
    { id: "maintenance-analytics", label: "Análisis de Mantenimiento", icon: TrendingUp, desc: "Gráficas, fallas y reemplazos", access: isAdmin || isGerencia },
    { id: "executive", label: "Panel Ejecutivo", icon: Gauge, desc: "KPIs para la gerencia", access: isAdmin || isGerencia },
    { id: "maintenance-log", label: "Mantenimientos Realizados", icon: History, desc: "Auditoría de lo registrado", access: isAdmin },
    { id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays, desc: "Seguimiento del año completo", access: isAdmin },
    { id: "laundry", label: "Equipos de Lavandería", icon: ClipboardList, desc: "Revisión diaria, Piso 4", access: true },
    { id: "boiler", label: "Check List Caldera", icon: Gauge, desc: "Purgas y presión por turno", access: true },
    { id: "gym", label: "Equipos de Gimnasio", icon: ClipboardList, desc: "Revisión diaria, Piso 14", access: true },
    { id: "schedules", label: "Horario Mensual", icon: Users, desc: "Turnos del personal", access: true },
    { id: "tasks", label: "Tareas / Pendientes", icon: ClipboardCheck, desc: "El buzón de lo que va saliendo", access: true, badge: counts.openTasks, urgentBadge: false },
    { id: "profile", label: "Mi Perfil", icon: User, desc: "Tu firma para la entrega de turno", access: true },
    { id: "changelog", label: "Novedades", icon: Sparkles, desc: "Qué ha cambiado en la app", access: true },
    { id: "handoff", label: "Entrega de turno", icon: Send, desc: "Resumen del recorrido, por correo", access: true, badge: counts.justFinished ? "!" : 0, pulse: true },
    { id: "issues", label: "Fuera de servicio", icon: Wrench, desc: "Equipos dañados activos", access: true, badge: counts.activeIssues, pulse: true },
    { id: "reports", label: "Reportes", icon: History, desc: "Informe completo en PDF", access: true },
    { id: "tanks", label: "Tanques agua potable", icon: Droplets, desc: "Niveles, con edición manual", access: true },
    { id: "fuel", label: "Combustibles y gas", icon: Gauge, desc: "ACPM y gas, calderas y planta eléctrica", access: true },
    { id: "analytics", label: "Análisis de fallas", icon: TrendingUp, desc: "Historial de equipos dañados", access: isAdmin || isGerencia },
    { id: "admin", label: "Panel de administrador", icon: ShieldCheck, desc: "Usuarios, correo, permisos", access: isAdmin, badge: counts.pendingAccounts, pulse: true },
    { id: "trash", label: "Papelera", icon: Trash2, desc: "Restaurar lo que se borró por error", access: isAdmin },
    { id: "general-history", label: "Historial de cambios", icon: History, desc: "Auditoría: empleados, inventario y tareas", access: isAdmin },
    { id: "round-completion", label: "Recorridos completados", icon: ClipboardCheck, desc: "Quién completó su recorrido y quién no", access: isAdmin },
  ].map(m => gerenciaLocked ? { ...m, access: GERENCIA_ALLOWED_VIEWS.includes(m.id) } : m);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else {
        if (prev.length >= MAX_FAVORITES) {
          setFavMsg(`Ya tienes ${MAX_FAVORITES} favoritos — quita uno antes de agregar otro.`);
          setTimeout(() => setFavMsg(null), 2500);
          return prev;
        }
        next = [...prev, id];
      }
      try { localStorage.setItem(`pm-local:favorites:${currentUser}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const favModules = modules.filter(m => favorites.includes(m.id) && m.access);
  const searchNorm = normalizeSearchText(search.trim());
  const visibleModules = searchNorm ? modules.filter(m => normalizeSearchText(m.label).includes(searchNorm) || normalizeSearchText(m.desc).includes(searchNorm)) : modules;

  const oldestIssue = activeIssuesList.length
    ? activeIssuesList.reduce((a, b) => new Date(a.openedAt) < new Date(b.openedAt) ? a : b)
    : null;

  return (
    <div>
      <div className="rounded-xl p-3.5 mb-4" style={{ background: C.steelDark }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-white text-lg font-semibold">Hola, {currentUser}</div>
            <div className="text-sm" style={{ color: "#8fa3b8" }}>
              {isAdmin ? "Administrador" : isAlmacenista ? "Almacenista" : gerenciaLocked ? "Gerencia (solo consulta)" : "Operador"} · {todayStr()}
            </div>
          </div>
          <Gauge size={28} color={C.amber} />
        </div>
        {!gerenciaLocked && tourProgress.total > 0 && (
          <div className="mt-3" title={`${tourProgress.done} de ${tourProgress.total} pisos revisados en tu recorrido de hoy`}>
            <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: "#8fa3b8" }}>
              <span>Progreso del recorrido de hoy</span>
              <span className="font-semibold" style={{ color: tourProgress.done >= tourProgress.total ? C.green : "#cdd8e2" }}>
                {tourProgress.done}/{tourProgress.total}
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)", height: 6 }}>
              <div className="h-full rounded-full" style={{
                width: `${Math.min(100, (tourProgress.done / tourProgress.total) * 100)}%`,
                background: tourProgress.done >= tourProgress.total ? C.green : C.amber,
                transition: "width 500ms var(--ease-out)",
              }} />
            </div>
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.gray }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar una herramienta… (ej: cuartos fríos, tareas, reportes)"
          className="w-full text-sm border rounded-lg pl-9 pr-8 py-2.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5" style={{ color: C.gray }}>
            <X size={16} />
          </button>
        )}
      </div>

      {!hasSignature && !dismissedSigReminder && (
        <div className="rounded-lg p-3 mb-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <div className="text-sm" style={{ color: "#7a5405" }}>
            <b>✍️ Todavía no has guardado tu firma.</b> La necesitas para poder enviar tus recorridos y entregas de turno —
            se guarda una sola vez y de ahí en adelante se agrega sola.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onGoToProfile}>Configurarla ahora</Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissedSigReminder(true)}>Después</Button>
          </div>
        </div>
      )}

      {/* PILAR 1 — Widgets vivos: el tablero de instrumentos del día, no solo accesos directos */}
      {!gerenciaLocked && !searchNorm && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          <button onClick={() => onNavigate("ronda")} title="Pisos ya revisados en la ronda de hoy, sobre el total de pisos mecánicos" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: C.line, background: C.panel }}>
            <MiniGauge value={tourProgress.done} max={tourProgress.total} color={tourProgress.done >= tourProgress.total ? C.green : C.amber} />
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{tourProgress.done}<span className="text-xs font-normal" style={{ color: C.gray }}>/{tourProgress.total}</span></div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Pisos revisados hoy</div>
            </div>
          </button>

          <button onClick={() => onNavigate("maintenance-log")} title="Mantenimientos (preventivos y correctivos) registrados en los últimos 7 días" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: C.line, background: C.panel }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft || C.amberSoft }}>
              <Wrench size={22} color={C.blue} />
            </div>
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{mttoWeekCount}</div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Mantenimientos esta semana</div>
            </div>
          </button>

          <button onClick={() => onNavigate("issues")} title="Equipos marcados como dañados que siguen sin resolverse" className="text-left rounded-xl border p-3 flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: activeIssuesList.length ? C.red : C.line, background: activeIssuesList.length ? C.redSoft : C.panel }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: activeIssuesList.length ? "#fff" : C.greenSoft }}>
              {activeIssuesList.length ? <AlertTriangle size={22} color={C.red} /> : <CheckCircle2 size={22} color={C.green} />}
            </div>
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: C.ink }}>{activeIssuesList.length}</div>
              <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>
                {oldestIssue ? `Fuera de servicio · ${elapsed(oldestIssue.openedAt)} el más viejo` : "Fuera de servicio — ninguno"}
              </div>
            </div>
          </button>

          <button onClick={() => onNavigate(canManageInv ? "inventory-alerts" : "inventory")} title="Artículos de inventario en o por debajo de su cantidad mínima definida" className="text-left rounded-xl border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.inkSoft }}>Stock más crítico</div>
            {lowStockDetail.length === 0 ? (
              <div className="text-xs flex items-center gap-1" style={{ color: C.green }}><CheckCircle2 size={13} /> Todo por encima del mínimo</div>
            ) : (
              <div className="space-y-1">
                {lowStockDetail.slice(0, 3).map(it => (
                  <div key={it.id} className="text-xs flex items-center justify-between gap-1" style={{ color: C.ink }}>
                    <span className="truncate">{it.name}</span>
                    <span className="font-semibold shrink-0" style={{ color: C.amber }}>{it.quantity}/{it.minThreshold}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Favoritos — hasta 5 herramientas fijadas por el usuario con la estrella, para no buscarlas cada vez */}
      {!gerenciaLocked && !searchNorm && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Tus favoritos</div>
            {favMsg && <div className="text-xs" style={{ color: C.amber }}>{favMsg}</div>}
          </div>
          {favModules.length === 0 ? (
            <div className="text-xs rounded-lg border border-dashed p-3" style={{ borderColor: C.line, color: C.gray }}>
              Toca la ⭐ en cualquier tarjeta de abajo para fijar aquí las {MAX_FAVORITES} herramientas que más usas en tu turno.
            </div>
          ) : (
            <div className="flex items-stretch rounded-xl border overflow-hidden" style={{ borderColor: C.line, background: C.panel }}>
              {favModules.map((m, i) => (
                <button key={m.id} onClick={() => onNavigate(m.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 px-2 transition hover:bg-black/[0.03] active:bg-black/[0.06] relative"
                  style={{ borderLeft: i > 0 ? `1px solid ${C.line}` : "none", minHeight: 48 }}>
                  <m.icon size={18} color={C.amber} />
                  <span className="text-xs font-semibold text-center truncate w-full" style={{ color: C.ink }}>{m.label}</span>
                  <NavBadge count={m.badge} urgent={m.urgentBadge !== false} pulse={m.pulse} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PILAR 3 — Accesos rápidos: barra integrada de una sola pieza, en vez de bloques de color separados */}
      {!gerenciaLocked && !searchNorm && (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Accesos rápidos</div>
          <div className="flex items-stretch rounded-xl border overflow-hidden" style={{ borderColor: C.line, background: C.panel }}>
            {[
              { id: "ronda", label: "Nueva ronda", icon: ClipboardList, color: C.amber },
              { id: "issues", label: "Fuera de servicio", icon: Wrench, color: C.red },
              { id: "maintenance", label: "Mantenimiento", icon: PlusCircle, color: C.green },
              { id: "tasks", label: "Nueva tarea", icon: ClipboardCheck, color: C.blue },
            ].map((qa, i, arr) => (
              <button key={qa.id} onClick={() => onNavigate(qa.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 transition hover:bg-black/[0.03] active:bg-black/[0.06]"
                style={{ borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
                <qa.icon size={18} color={qa.color} />
                <span className="text-xs font-semibold text-center" style={{ color: C.ink }}>{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
        {searchNorm
          ? `${visibleModules.length} resultado${visibleModules.length === 1 ? "" : "s"} para "${search.trim()}"`
          : gerenciaLocked
            ? "Tu cuenta es de solo consulta — puedes ver los paneles de resultados, pero no registrar ni editar nada operativo."
            : "Esto es lo que puedes usar con tu cuenta. Lo que aparece atenuado necesita más permisos — pídeselo a un administrador si lo necesitas."}
      </p>

      {visibleModules.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: C.gray }}>
          No encontré nada para "{search.trim()}". Intenta con otra palabra.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {visibleModules.map(m => (
            <button key={m.id} disabled={!m.access} onClick={() => m.access && onNavigate(m.id)}
              className={`text-left rounded-lg border p-3 transition duration-150 ease-out relative ${m.access ? "hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--pm-amber)] active:translate-y-0 active:shadow-sm active:border-[var(--pm-amber)] active:scale-[0.98]" : ""}`}
              style={{
                borderColor: C.line, background: m.access ? C.panel : C.bg,
                opacity: m.access ? 1 : 0.55, cursor: m.access ? "pointer" : "not-allowed",
                minHeight: 48,
              }}>
              {m.access && !gerenciaLocked && (
                <span role="button" tabIndex={0} title={favorites.includes(m.id) ? "Quitar de favoritos" : "Fijar en favoritos"}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); toggleFavorite(m.id); } }}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: C.panel, border: `1px solid ${C.line}`, minWidth: 24, minHeight: 24 }}>
                  <Sparkles size={12} color={favorites.includes(m.id) ? C.amber : C.gray} fill={favorites.includes(m.id) ? C.amber : "none"} />
                </span>
              )}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <m.icon size={16} className="shrink-0" style={{ color: m.access ? C.amber : C.gray }} />
                  <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{m.label}</div>
                </div>
                <NavBadge count={m.badge} urgent={m.urgentBadge !== false} pulse={m.pulse} />
              </div>
              <div className="text-xs truncate" style={{ color: C.gray }}>
                {m.access ? m.desc : gerenciaLocked ? "No disponible para gerencia" : "Solo administradores" + (m.id.startsWith("inventory") ? " o almacenista" : "")}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: EQUIPOS FUERA DE SERVICIO
   ============================================================ */
function IssuesView({ activeIssues, onResolve, onCheckIn, onAttachPhoto }) {
  const list = Object.values(activeIssues).sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Equipos fuera de servicio</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{list.length} equipo(s) actualmente reportado(s). Se mantienen visibles en cada recorrido hasta marcarse como resueltos.</p>
      {list.length === 0 && (
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: C.line, background: C.greenSoft }}>
          <CheckCircle2 className="mx-auto mb-2" color={C.green} />
          <div className="text-sm font-medium" style={{ color: C.green }}>No hay equipos reportados como dañados. Todo en orden.</div>
        </div>
      )}
      {list.map(iss => <IssueResolveCard key={iss.equipmentId} iss={iss} onResolve={onResolve} onCheckIn={onCheckIn} onAttachPhoto={onAttachPhoto} />)}
    </div>
  );
}

function IssueResolveCard({ iss, onResolve, onCheckIn, onAttachPhoto }) {
  const [open, setOpen] = useState(false);
  const [solution, setSolution] = useState("");
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [resolving, setResolving] = useState(false);
  const checkins = iss.checkins || [];

  const doAttachBefore = async (file) => {
    if (!file) return;
    setUploadingBefore(true);
    try { await onAttachPhoto(iss.equipmentId, file); } catch { /* se puede intentar de nuevo */ }
    setUploadingBefore(false);
  };

  const doResolve = async () => {
    setResolving(true);
    let afterUrl = null;
    try {
      if (afterPhotoFile) afterUrl = await uploadPhoto(afterPhotoFile, `issue-${iss.equipmentId}`);
    } catch { /* si falla la foto, igual se guarda la resolución */ }
    await onResolve(iss, solution.trim(), afterUrl);
    setOpen(false); setSolution(""); setAfterPhotoFile(null); setAfterPhotoPreview(null); setResolving(false);
  };

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.red, background: C.redSoft }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Pill tone="red"><AlertTriangle size={12} /> Fuera de servicio</Pill>
            <Pill tone="gray"><Building2 size={11} /> {iss.floorName}</Pill>
          </div>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>#{iss.code} · {iss.name}</div>
          <div className="text-xs mt-1" style={{ color: "#7a3a26" }}>Reportado por <b>{iss.openedBy}</b> · {fmtDT(iss.openedAt)} · lleva <b>{elapsed(iss.openedAt)}</b></div>
          <div className="text-sm italic mt-1" style={{ color: C.ink }}>"{iss.observation}"</div>
          {checkins.length > 0 && (
            <div className="mt-2 pl-2" style={{ borderLeft: `2px solid ${C.red}` }}>
              {checkins.map((c, i) => (
                <div key={i} className="text-xs" style={{ color: "#7a3a26" }}>
                  ↳ Sigue igual — confirmado por <b>{c.by}</b> · {fmtDT(c.at)}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            {iss.beforePhotoUrl ? (
              <img src={iss.beforePhotoUrl} alt="Foto del daño" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />
            ) : (
              <label className="text-xs font-medium px-2 py-1 rounded-md cursor-pointer inline-flex items-center gap-1" style={{ background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
                <Camera size={12} /> {uploadingBefore ? "Subiendo…" : "Agregar foto del daño"}
                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploadingBefore}
                  onChange={e => doAttachBefore(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
        {!open && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onCheckIn(iss)}>Sigue igual</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Marcar resuelto</Button>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <input value={solution} onChange={e => setSolution(e.target.value)} placeholder="Solución aplicada…"
              className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <VoiceInputButton onResult={text => setSolution(s => (s ? s + " " : "") + text)} />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <label className="text-xs font-medium px-2 py-1 rounded-md cursor-pointer inline-flex items-center gap-1" style={{ background: C.panel, color: C.inkSoft, border: `1px solid ${C.line}` }}>
              <Camera size={12} /> {afterPhotoFile ? "Cambiar foto de la reparación" : "Foto de la reparación (opcional)"}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; setAfterPhotoFile(f || null); setAfterPhotoPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            {afterPhotoPreview && <img src={afterPhotoPreview} alt="Vista previa" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 80, maxHeight: 60 }} />}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" icon={CheckCircle2} disabled={!solution.trim() || resolving} onClick={doResolve}>
              {resolving ? "Guardando…" : "Confirmar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: HISTORIAL / REPORTES
   ============================================================ */
/**
 * Comparador de fotos antes/después con un deslizador — arrastras la barra para revelar más de
 * una foto u otra. Solo CSS, sin librerías externas: la foto "después" está encima con su ancho
 * recortado según la posición del deslizador, y debajo se ve la de "antes" completa.
 */
function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const [pos, setPos] = useState(50); // % de la izquierda que muestra la foto de "después"
  return (
    <div>
      <div className="relative rounded-md overflow-hidden select-none" style={{ maxWidth: 320, aspectRatio: "4/3", background: "#000" }}>
        <img src={beforeUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img src={afterUrl} alt="Después" className="h-full object-cover" style={{ width: "320px", maxWidth: "none" }} draggable={false} />
        </div>
        <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, width: 2, background: "#fff", transform: "translateX(-1px)" }} />
        <div className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Después</div>
        <div className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Antes</div>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))}
        className="w-full mt-1" style={{ maxWidth: 320 }} />
    </div>
  );
}

function ReportsView({ issueHistory, roundsIndex, activeIssues, latestValues, mttoLog, mttoEquipos, reportEmail, reportWhatsapp, onOpenPrint, sentReports, onLogSent, currentUser }) {
  const [tab, setTab] = useState("incidentes");
  const [q, setQ] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [waTo, setWaTo] = useState(reportWhatsapp || "");
  const [sendMsg, setSendMsg] = useState(null);
  const [downloadMsg, setDownloadMsg] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingAutoFull, setSendingAutoFull] = useState(false);

  // ---- Resumen semanal con IA ----
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklyError, setWeeklyError] = useState(null);
  const [weeklySending, setWeeklySending] = useState(false);
  const [weeklySendMsg, setWeeklySendMsg] = useState(null);

  // ---- Reporte personalizado ----
  const [customSections, setCustomSections] = useState(["activos", "resueltos"]);
  const [customBusy, setCustomBusy] = useState(false);
  const [customMsg, setCustomMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { setWaTo(reportWhatsapp || ""); }, [reportWhatsapp]);

  const filteredIssues = issueHistory
    .filter(h => !q || (h.name + h.floorName + h.observation + h.solution).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));

  const filteredRounds = roundsIndex
    .filter(r => !q || (r.floorName + r.user).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  const doDownloadPdf = async () => {
    setGeneratingPdf(true); setDownloadMsg(null);
    try {
      const doc = await generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, currentUser);
      const filename = `informe-equipos-${todayStr().replace(/\//g, "-")}.pdf`;
      doc.save(filename);
      setDownloadMsg("✓ PDF descargado con el detalle de los 12 pisos y todos los equipos (los que no tienen datos aparecen como 'Sin datos registrados').");
      onLogSent({ to: "(descarga local)", method: "PDF descargado", ok: true, message: filename, sentBy: currentUser, sentAt: nowIso() });
    } catch (e) {
      const ok = downloadReportFile(activeIssues, issueHistory, roundsIndex);
      setDownloadMsg(ok
        ? "No se pudo generar el PDF (revisa la conexión a internet del dispositivo, se necesita la primera vez). Se descargó en su lugar un archivo .html: ábrelo y usa Imprimir → Guardar como PDF."
        : "No se pudo generar la descarga. Usa 'Ver informe en pantalla' como alternativa.");
    }
    setGeneratingPdf(false);
  };

  const doOpenMailClient = () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    const text = buildReportText(activeIssues, issueHistory, roundsIndex);
    const subject = `Informe de equipos - Pisos Mecánicos (${todayStr()})`;
    const body = text.length > 1500 ? text.slice(0, 1500) + "\n\n(Resumen. Descarga el PDF completo con todos los pisos desde la app y adjúntalo aquí.)" : text;
    window.open(`mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    onLogSent({ to: emailTo.trim(), method: "mailto (borrador manual)", ok: true, message: "Borrador abierto en el cliente de correo del dispositivo.", sentBy: currentUser, sentAt: nowIso() });
    setSendMsg({ ok: true, text: "Se abrió un borrador con el resumen en tu correo. Adjunta el PDF descargado si necesitas el detalle completo, y da clic en Enviar allá." });
  };

  const doSendAutoFull = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSendingAutoFull(true); setSendMsg(null);
    const res = await sendFullReportEmailAuto(emailTo.trim(), latestValues, activeIssues, issueHistory, roundsIndex, currentUser);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Informe completo (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSendingAutoFull(false);
  };

  const doOpenWhatsapp = () => {
    if (!waTo.trim()) { setSendMsg({ ok: false, text: "Escribe un número de WhatsApp (con indicativo de país, ej. 57...)." }); return; }
    const text = buildReportText(activeIssues, issueHistory, roundsIndex);
    window.open(buildWhatsAppLink(waTo.trim(), text), "_blank");
    onLogSent({ to: waTo.trim(), method: "WhatsApp (wa.me)", ok: true, message: "Se abrió WhatsApp con el resumen listo para enviar.", sentBy: currentUser, sentAt: nowIso() });
    setSendMsg({ ok: true, text: "Se abrió WhatsApp con el resumen como mensaje de texto. Adjunta el PDF descargado a mano si necesitas el detalle completo, y da enviar allá." });
  };

  const weekLabel = (() => {
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7);
    const fmt = (d) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const doGenerateWeekly = async () => {
    setWeeklyGenerating(true); setWeeklyError(null); setWeeklySummary(null); setWeeklySendMsg(null);
    try {
      const { resolved, pending, correctivos } = buildWeeklySummaryInput(issueHistory, activeIssues, mttoLog, mttoEquipos, 7);
      const res = await requestWeeklySummary({ weekLabel, resolved, pending, correctivos });
      if (res.ok) { setWeeklySummary(res.summary); bumpAiUsage("weeklySummaries"); }
      else setWeeklyError(res.message || "No se pudo redactar el resumen.");
    } catch {
      setWeeklyError("No se pudo conectar con el servicio de IA. Intenta de nuevo.");
    }
    setWeeklyGenerating(false);
  };

  const doSendWeekly = async () => {
    if (!emailTo.trim()) { setWeeklySendMsg({ ok: false, text: "Escribe un correo destino arriba." }); return; }
    setWeeklySending(true); setWeeklySendMsg(null);
    const res = await sendWeeklySummaryEmailAuto(emailTo.trim(), weeklySummary, weekLabel, currentUser);
    setWeeklySendMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Resumen semanal (correo automático con IA)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setWeeklySending(false);
  };

  const toggleCustomSection = (id) => setCustomSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const customReportData = { activeIssues, issueHistory, roundsIndex, latestValues, mttoLog, mttoEquipos };
  const doDownloadCustom = async () => {
    if (customSections.length === 0) { setCustomMsg({ ok: false, text: "Elige al menos una sección." }); return; }
    setCustomBusy(true); setCustomMsg(null);
    try {
      const doc = await generateCustomReportPdf(customSections, customReportData, currentUser);
      doc.save(`reporte-personalizado-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setCustomMsg({ ok: false, text: "No se pudo generar el PDF." }); }
    setCustomBusy(false);
  };
  const doSendCustom = async () => {
    if (customSections.length === 0) { setCustomMsg({ ok: false, text: "Elige al menos una sección." }); return; }
    if (!emailTo.trim()) { setCustomMsg({ ok: false, text: "Escribe un correo destino arriba." }); return; }
    setCustomBusy(true); setCustomMsg(null);
    const res = await sendCustomReportEmailAuto(emailTo.trim(), customSections, customReportData, currentUser);
    setCustomMsg({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Reporte personalizado", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setCustomBusy(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Reportes</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Genera el informe completo en PDF, o comparte un resumen por correo/WhatsApp.</p>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF completo (los 12 pisos, todos los equipos)</div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Button variant="amber" icon={Download} disabled={generatingPdf} onClick={doDownloadPdf}>
            {generatingPdf ? "Generando PDF…" : "Descargar informe en PDF"}
          </Button>
          <Button variant="ghost" onClick={onOpenPrint}>Ver resumen en pantalla</Button>
        </div>
        {downloadMsg && <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{downloadMsg}</div>}

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAutoFull} onClick={doSendAutoFull}>{sendingAutoFull ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={doOpenMailClient}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp (envía un resumen en texto, no el PDF adjunto)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número con indicativo, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button variant="ghost" icon={MessageCircle} onClick={doOpenWhatsapp}>Enviar por WhatsApp</Button>
        </div>

        {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
        <div className="text-xs mt-2 rounded-md p-2" style={{ background: C.amberSoft, color: "#7a5405" }}>
          El correo ahora sí manda el PDF completo adjunto de forma automática (usa el servidor propio de la app).
          WhatsApp sigue sin poder llevar archivos adjuntos por enlace bajo ninguna circunstancia — eso lo decide la
          plataforma de WhatsApp, no esta app — así que ahí solo se manda el resumen en texto; el PDF hay que
          adjuntarlo a mano si lo necesitas por ese medio.
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.amber, background: C.panel, color: C.ink }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={15} color={C.amber} />
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Resumen semanal con IA ({weekLabel})</div>
        </div>
        <p className="text-xs mb-2" style={{ color: C.gray }}>
          Redacta en español natural qué se dañó, qué se resolvió y qué sigue pendiente en los últimos 7 días —
          lo revisas antes de mandarlo, no se envía nada solo.
        </p>
        {!weeklySummary && (
          <Button size="sm" icon={Sparkles} disabled={weeklyGenerating} onClick={doGenerateWeekly}>
            {weeklyGenerating ? "Redactando…" : "Generar resumen de esta semana"}
          </Button>
        )}
        {weeklyError && <div className="text-xs mt-2" style={{ color: C.red }}>{weeklyError}</div>}
        {weeklySummary && (
          <div className="mt-1">
            <textarea value={weeklySummary} onChange={e => setWeeklySummary(e.target.value)} rows={6}
              className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" icon={Mail} disabled={weeklySending} onClick={doSendWeekly}>
                {weeklySending ? "Enviando…" : "Enviar por correo (al de arriba)"}
              </Button>
              <Button size="sm" variant="ghost" disabled={weeklyGenerating} onClick={doGenerateWeekly}>Volver a generar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setWeeklySummary(null); setWeeklySendMsg(null); }}>Descartar</Button>
            </div>
            {weeklySendMsg && <div className="text-xs mt-2" style={{ color: weeklySendMsg.ok ? C.green : C.red }}>{weeklySendMsg.text}</div>}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Reporte personalizado</div>
        <p className="text-xs mb-2" style={{ color: C.gray }}>Elige qué secciones incluir, en vez de los formatos fijos de siempre.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CUSTOM_REPORT_SECTIONS.map(s => (
            <label key={s.id} className="text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer select-none flex items-center gap-1.5"
              style={{ background: customSections.includes(s.id) ? C.amberSoft : C.bg, color: customSections.includes(s.id) ? "#7a5405" : C.inkSoft, border: `1px solid ${customSections.includes(s.id) ? C.amber : C.line}` }}>
              <input type="checkbox" checked={customSections.includes(s.id)} onChange={() => toggleCustomSection(s.id)} className="accent-current" />
              {s.label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" icon={Download} disabled={customBusy} onClick={doDownloadCustom}>Descargar PDF</Button>
          <Button size="sm" icon={Mail} disabled={customBusy} onClick={doSendCustom}>{customBusy ? "…" : "Enviar por correo (al de arriba)"}</Button>
        </div>
        {customMsg && <div className="text-xs mt-2" style={{ color: customMsg.ok ? C.green : C.red }}>{customMsg.text}</div>}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap mt-3">
        <Button size="sm" variant={tab === "incidentes" ? "primary" : "ghost"} onClick={() => setTab("incidentes")}>Historial de incidentes</Button>
        <Button size="sm" variant={tab === "rondas" ? "primary" : "ghost"} onClick={() => setTab("rondas")}>Rondas registradas</Button>
        <Button size="sm" variant={tab === "enviados" ? "primary" : "ghost"} onClick={() => setTab("enviados")}>Informes enviados</Button>
        <div className="ml-auto flex items-center gap-1.5 border rounded-md px-2 py-1" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <Search size={13} color={C.gray} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="text-sm outline-none" />
        </div>
      </div>

      {tab === "incidentes" && (
        <div>
          {filteredIssues.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin incidentes resueltos registrados aún.</div>}
          {filteredIssues.map((h, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Pill tone="gray"><Building2 size={11} /> {h.floorName}</Pill>
                <Pill tone="green"><CheckCircle2 size={12} /> Resuelto</Pill>
                <span className="text-xs" style={{ color: C.gray }}>Duración fuera de servicio: <b>{h.duration}</b></span>
              </div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>#{h.code} · {h.name}</div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2 text-xs" style={{ color: C.inkSoft }}>
                <div><b>Reportado:</b> {fmtDT(h.openedAt)} por {h.openedBy}<br /><span className="italic">"{h.observation}"</span></div>
                <div><b>Resuelto:</b> {fmtDT(h.resolvedAt)} por {h.resolvedBy}<br /><span className="italic">"{h.solution}"</span></div>
              </div>
              {h.beforePhotoUrl && h.afterPhotoUrl && (
                <div className="mt-2">
                  <BeforeAfterSlider beforeUrl={h.beforePhotoUrl} afterUrl={h.afterPhotoUrl} />
                </div>
              )}
              {(h.beforePhotoUrl || h.afterPhotoUrl) && !(h.beforePhotoUrl && h.afterPhotoUrl) && (
                <div className="mt-2 flex gap-2">
                  {h.beforePhotoUrl && <img src={h.beforePhotoUrl} alt="Antes" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />}
                  {h.afterPhotoUrl && <img src={h.afterPhotoUrl} alt="Después" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 140 }} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "rondas" && (
        <div>
          {filteredRounds.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Aún no se han guardado rondas.</div>}
          {filteredRounds.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2 flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{r.floorName}</div>
                <div className="text-xs" style={{ color: C.inkSoft }}>{fmtDT(r.savedAt)} · Turno {r.shift} · {r.user}</div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="gray">{r.itemCount} registrados</Pill>
                {r.damagedCount > 0 && <Pill tone="red">{r.damagedCount} dañados</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "enviados" && (
        <div>
          <p className="text-xs mb-2" style={{ color: C.gray }}>
            Este registro queda guardado dentro de la aplicación aunque el correo real falle, para que siempre puedas ver qué se intentó enviar y cuándo.
          </p>
          {(!sentReports || sentReports.length === 0) && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Aún no se ha intentado enviar ningún informe.</div>}
          {(sentReports || []).map((s, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {s.ok ? <Pill tone="green"><CheckCircle2 size={12} /> {s.method}</Pill> : <Pill tone="red"><AlertTriangle size={12} /> Falló · {s.method}</Pill>}
                <span className="text-xs" style={{ color: C.gray }}>{fmtDT(s.sentAt)} · por {s.sentBy}</span>
              </div>
              <div className="text-sm" style={{ color: C.ink }}>Destino: <b>{s.to}</b></div>
              <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{s.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: TANQUES DE AGUA POTABLE
   ============================================================ */
function TanksView({ latestValues, tankHistory, onSaveTankReading, currentUser }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(null);

  const data = TANK_ITEMS.map(t => {
    const lv = latestValues[t.id];
    const val = lv && lv.value !== "" && lv.value !== undefined ? Number(lv.value) : null;
    return { id: t.id, item: t, name: `${t.n}`, floor: t.floorName, value: val, updatedAt: lv?.updatedAt, updatedBy: lv?.updatedBy };
  });

  const colorFor = (v) => v === null ? C.gray : v < 20 ? C.red : v < 50 ? C.amber : C.green;

  const startEdit = (d) => { setEditing(d.id); setDraft(d.value === null ? "" : String(d.value)); setSavedFlash(null); };
  const doSave = async (d) => {
    const num = Number(draft);
    if (draft === "" || isNaN(num) || num < 0 || num > 100) return;
    await onSaveTankReading(d.item, num);
    setEditing(null);
    setSavedFlash(d.id);
    setTimeout(() => setSavedFlash(null), 2500);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Niveles de tanques de agua potable</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Solo tanques de agua potable (no incluye contraincendio ni ACPM). Se alimenta de los valores capturados en cada
        ronda, pero también puedes actualizar cualquiera manualmente aquí mismo — útil en cortes de agua, cuando
        necesitas revisar y dejar registrado el porcentaje sin esperar a la próxima ronda completa del piso.
      </p>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <VerticalBarChart data={data} labelKey="name" valueKey="value" colorFor={colorFor} formatValue={v => `${v}%`} />
        <div className="flex items-center gap-4 justify-center mt-2 text-xs" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.green }} /> ≥ 50%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.amber }} /> 20–49%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.red }} /> &lt; 20%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.gray }} /> Sin datos</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {data.map(d => {
          const hist = (tankHistory[d.id] || []).slice(-12).map(h => ({ t: fmtDT(h.at).slice(0, 11), v: Number(h.value) }));
          return (
            <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{d.name}</div>
                  <div className="text-xs" style={{ color: C.gray }}>{d.floor}</div>
                </div>
                <div className="text-lg font-bold" style={{ color: colorFor(d.value) }}>{d.value === null ? "—" : `${d.value}%`}</div>
              </div>

              {editing === d.id ? (
                <div className="flex items-center gap-2 my-2">
                  <input type="number" min={0} max={100} autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") doSave(d); if (e.key === "Escape") setEditing(null); }}
                    placeholder="0-100" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
                  <span className="text-xs" style={{ color: C.gray }}>%</span>
                  <Button size="sm" onClick={() => doSave(d)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="my-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>Actualizar nivel manualmente</Button>
                  {savedFlash === d.id && <span className="text-xs ml-2" style={{ color: C.green }}>✓ Guardado</span>}
                </div>
              )}

              {hist.length > 1 ? (
                <div style={{ width: "100%", height: 70 }}>
                  <Sparkline points={hist} />
                </div>
              ) : <div className="text-xs py-4 text-center" style={{ color: C.gray }}>Sin histórico suficiente</div>}
              <div className="text-xs mt-1" style={{ color: C.gray }}>
                {d.updatedAt ? `Últ. registro: ${fmtDT(d.updatedAt)} · ${d.updatedBy}` : "Sin registros aún"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FUEL_TANK_TYPES = ["Diesel (ACPM)", "Gas propano", "Gasolina"];

/**
 * Combustibles y gas — tanques de ACPM/gas para calderas y plantas eléctricas (distinto de
 * "Tanques agua potable"). Cada tanque tiene un volumen inicial y una capacidad total; los
 * registros de consumo por turno bajan el nivel, los de reabastecimiento lo suben. La barra de
 * llenado y la alerta cambian solas de color cuando cae por debajo del % mínimo operativo.
 */
/**
 * Combustibles y gas — ACPM para plantas eléctricas y calderas. Se alimenta de las mismas
 * lecturas que ya se capturan en el recorrido diario (los ítems de "Nivel Tanque de ACPM" en
 * cada piso), igual que ya hace "Tanques agua potable" — no es un registro aparte. Mismo formato
 * de tarjetas, gráfica y detalle por equipo que Análisis de fallas.
 */
function FuelTanksView({ latestValues, fuelHistory, onNavigate }) {
  const [expanded, setExpanded] = useState(null);

  const pctTanks = FUEL_ITEMS.filter(it => it.u === "%").map(it => {
    const v = latestValues[it.id];
    return {
      id: it.id, label: `${it.n} (${it.floorName})`, pct: v && v.value !== undefined && v.value !== "" ? Number(v.value) : null,
      updatedAt: v?.updatedAt || null, updatedBy: v?.updatedBy || null,
    };
  });
  const meterTanks = FUEL_ITEMS.filter(it => it.u === "gln").map(it => {
    const v = latestValues[it.id];
    return {
      id: it.id, label: `${it.n} (${it.floorName})`, value: v && v.value !== undefined && v.value !== "" ? Number(v.value) : null,
      updatedAt: v?.updatedAt || null, updatedBy: v?.updatedBy || null,
    };
  });

  const readTanks = pctTanks.filter(t => t.pct != null);
  const criticalTanks = readTanks.filter(t => t.pct <= 20);
  const promedioPlanta = readTanks.length ? Math.round(readTanks.reduce((s, t) => s + t.pct, 0) / readTanks.length) : null;
  const lowest = readTanks.length ? [...readTanks].sort((a, b) => a.pct - b.pct)[0] : null;
  const totalLecturas = [...pctTanks, ...meterTanks].filter(t => (t.pct ?? t.value) != null).length;

  const barData = readTanks.sort((a, b) => a.pct - b.pct);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Combustibles y gas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Nivel de ACPM en plantas eléctricas y calderas — tomado directamente de las lecturas del recorrido diario de cada piso.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Tanques en nivel crítico" value={criticalTanks.length} valueColor={criticalTanks.length ? C.red : C.ink}
          leading={
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: criticalTanks.length ? C.redSoft : C.greenSoft }}>
              {criticalTanks.length ? <AlertTriangle size={18} color={C.red} /> : <CheckCircle2 size={18} color={C.green} />}
            </div>
          } />
        <StatCard label="Nivel promedio de planta" value={promedioPlanta != null ? `${promedioPlanta}%` : "—"} valueColor={promedioPlanta != null && promedioPlanta <= 20 ? C.red : C.ink}
          leading={promedioPlanta != null ? <MiniGauge value={promedioPlanta} max={100} size={40} stroke={5} color={promedioPlanta <= 20 ? C.red : promedioPlanta <= 35 ? C.amber : C.green} /> : null} />
        <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Tanque con menor nivel</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Gauge size={18} color={C.amber} /></div>
            <div className="text-sm font-bold leading-tight" style={{ color: C.ink }}>{lowest ? `${lowest.label} · ${lowest.pct}%` : "Sin lecturas"}</div>
          </div>
        </div>
        <StatCard label="Lecturas registradas" value={totalLecturas}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><ClipboardCheck size={18} color={C.blue} /></div>} />
      </div>

      {readTanks.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Todavía no hay lecturas de ACPM registradas. Se llenan solas cuando alguien marca esos ítems durante el recorrido de un piso.
        </p>
      ) : (
        <>
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Nivel actual por tanque</div>
            <HorizontalBarChart data={barData} labelKey="label" valueKey="pct" max={100}
              colorFor={t => t.pct <= 20 ? C.red : t.pct <= 35 ? C.amber : C.green} gradient formatValue={v => `${v}%`} />
          </div>

          {criticalTanks.length > 0 && (
            <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.red }}>⚠ Reabastecer pronto — por debajo del 20%</div>
              {criticalTanks.map(t => (
                <div key={t.id} className="text-xs py-1" style={{ color: "#7a1030" }}>
                  <b>{t.label}</b> — {t.pct}% · última lectura {t.updatedAt ? fmtDT(t.updatedAt) : "—"}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {meterTanks.some(t => t.value != null) && (
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Medidores de ACPM (galones)</div>
          <div className="text-xs mb-3" style={{ color: C.gray }}>Estos son lecturas de medidor acumuladas, no un % de llenado — la tendencia muestra cómo ha subido el consumo con el tiempo.</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {meterTanks.filter(t => t.value != null).map(t => {
              const hist = (fuelHistory[t.id] || []).slice(-12).map(h => ({ t: fmtDT(h.at).slice(0, 11), v: Number(h.value) }));
              return (
                <div key={t.id} className="rounded-lg border p-3" style={{ borderColor: C.line }}>
                  <div className="text-xs font-medium mb-0.5" style={{ color: C.ink }}>{t.label}</div>
                  <div className="text-lg font-bold" style={{ color: C.ink }}>{t.value.toLocaleString("es-CO")} <span className="text-xs font-normal" style={{ color: C.gray }}>gln</span></div>
                  {hist.length > 1 ? <Sparkline points={hist} height={40} color={C.blue} /> : <div className="text-xs py-2" style={{ color: C.gray }}>Sin histórico suficiente todavía</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Detalle e historial por tanque</div>
        {[...pctTanks, ...meterTanks].map(t => {
          const hist = [...(fuelHistory[t.id] || [])].reverse();
          return (
            <div key={t.id} className="border-b last:border-0 py-2" style={{ borderColor: C.line }}>
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="w-full flex items-center justify-between text-left">
                <div className="text-sm font-medium" style={{ color: C.ink }}>
                  {t.label} <span style={{ color: C.gray, fontWeight: 400 }}>· {(t.pct ?? t.value) != null ? `${t.pct ?? t.value}${t.pct != null ? "%" : " gln"}` : "sin lectura"}</span>
                </div>
                {expanded === t.id ? <ChevronDown size={16} style={{ color: C.gray }} /> : <ChevronRight size={16} style={{ color: C.gray }} />}
              </button>
              {expanded === t.id && (
                <div className="mt-2 pl-1">
                  {hist.length === 0 ? (
                    <div className="text-xs py-1" style={{ color: C.gray }}>Sin historial todavía.</div>
                  ) : hist.map((h, i) => (
                    <div key={i} className="text-xs py-1 border-b last:border-0" style={{ borderColor: C.line, color: C.ink }}>
                      {h.value}{t.pct != null ? "%" : " gln"} <span style={{ color: C.gray }}>· {h.by} · {h.shift ? `${h.shift} · ` : ""}{fmtDT(h.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   INFORME (texto) + IMPRESIÓN A PDF + ENVÍO POR CORREO
   Envío real de correo: usa el conector de Gmail conectado a esta cuenta
   de Claude (llamando a la API de Anthropic con la herramienta MCP de
   Gmail). Si el conector no está disponible, se informa con claridad
   y se puede igualmente descargar/imprimir el PDF para adjuntarlo a mano.
   ============================================================ */
function buildReportText(activeIssues, issueHistory, roundsIndex) {
  const L = [];
  L.push("INFORME DE EQUIPOS — PISOS MECÁNICOS");
  L.push(`Generado: ${fmtDT(nowIso())}`);
  L.push("");
  const active = Object.values(activeIssues);
  L.push(`EQUIPOS FUERA DE SERVICIO ACTUALMENTE (${active.length})`);
  if (active.length === 0) L.push("— Ninguno. Todo en orden.");
  active.forEach(iss => L.push(`- [${iss.floorName}] #${iss.code} ${iss.name} — reportado por ${iss.openedBy} el ${fmtDT(iss.openedAt)} (${elapsed(iss.openedAt)} fuera de servicio). Obs: ${iss.observation}`));
  L.push("");
  L.push("ÚLTIMOS INCIDENTES RESUELTOS");
  if (issueHistory.length === 0) L.push("— Sin registros.");
  issueHistory.slice(0, 20).forEach(h => L.push(`- [${h.floorName}] #${h.code} ${h.name} — dañado ${fmtDT(h.openedAt)}, resuelto ${fmtDT(h.resolvedAt)} por ${h.resolvedBy} (duración ${h.duration}). Solución: ${h.solution}`));
  L.push("");
  L.push("ÚLTIMAS RONDAS REGISTRADAS");
  if (roundsIndex.length === 0) L.push("— Sin registros.");
  roundsIndex.slice(0, 20).forEach(r => L.push(`- ${r.floorName} · ${fmtDT(r.savedAt)} · turno ${r.shift} · ${r.user} · ${r.itemCount} equipos${r.damagedCount ? `, ${r.damagedCount} dañados` : ""}`));
  return L.join("\n");
}

function escHtml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function buildReportHtml(activeIssues, issueHistory, roundsIndex) {
  const active = Object.values(activeIssues);
  const rowsActive = active.length
    ? active.map(iss => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;"><b>[${escHtml(iss.floorName)}] #${iss.code} ${escHtml(iss.name)}</b> — reportado por ${escHtml(iss.openedBy)} el ${fmtDT(iss.openedAt)} (${elapsed(iss.openedAt)} fuera de servicio)<br><i>Obs: ${escHtml(iss.observation)}</i></div>`).join("")
    : `<p style="font-size:12px;">Ninguno. Todo en orden.</p>`;
  const rowsHist = issueHistory.length
    ? issueHistory.slice(0, 30).map(h => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;"><b>[${escHtml(h.floorName)}] #${h.code} ${escHtml(h.name)}</b><br>Dañado: ${fmtDT(h.openedAt)} · Resuelto: ${fmtDT(h.resolvedAt)} por ${escHtml(h.resolvedBy)} · Duración: ${h.duration}<br><i>Solución: ${escHtml(h.solution)}</i></div>`).join("")
    : `<p style="font-size:12px;">Sin registros.</p>`;
  const rowsRounds = roundsIndex.length
    ? roundsIndex.slice(0, 30).map(r => `<div style="font-size:12px;border-bottom:1px solid #ddd;padding:6px 0;">${escHtml(r.floorName)} · ${fmtDT(r.savedAt)} · Turno ${escHtml(r.shift)} · ${escHtml(r.user)} · ${r.itemCount} equipos${r.damagedCount ? `, ${r.damagedCount} dañados` : ""}</div>`).join("")
    : `<p style="font-size:12px;">Sin registros.</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Informe de Equipos - Pisos Mecánicos</title></head>
<body style="font-family:Arial, Helvetica, sans-serif; padding:32px; color:#111; max-width:800px; margin:0 auto;">
<h1 style="font-size:20px;">Informe de Equipos — Pisos Mecánicos</h1>
<p style="font-size:12px;color:#555;">Generado: ${fmtDT(nowIso())}</p>
<h2 style="font-size:15px;margin-top:20px;">Equipos fuera de servicio actualmente (${active.length})</h2>
${rowsActive}
<h2 style="font-size:15px;margin-top:20px;">Últimos incidentes resueltos</h2>
${rowsHist}
<h2 style="font-size:15px;margin-top:20px;">Últimas rondas registradas</h2>
${rowsRounds}
<p style="font-size:11px;color:#999;margin-top:24px;">Abre este archivo en tu navegador y usa "Imprimir → Guardar como PDF" si necesitas la versión en PDF.</p>
</body></html>`;
}

/** Descarga real del informe como archivo .html (respaldo si el PDF no puede generarse, p.ej. sin internet). */
function downloadReportFile(activeIssues, issueHistory, roundsIndex) {
  try {
    const html = buildReportHtml(activeIssues, issueHistory, roundsIndex);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-equipos-${todayStr().replace(/\//g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}

/** Carga jsPDF desde CDN la primera vez que se necesita (requiere internet en el dispositivo del usuario). */
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
    const existing = document.getElementById("jspdf-cdn-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf.jsPDF));
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el generador de PDF.")));
      return;
    }
    const script = document.createElement("script");
    script.id = "jspdf-cdn-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("No se pudo cargar el generador de PDF."));
    document.body.appendChild(script);
  });
}

function loadAutoTable() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF?.API?.autoTable) { resolve(); return; }
    const existing = document.getElementById("jspdf-autotable-cdn-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el generador de tablas del PDF.")));
      return;
    }
    const script = document.createElement("script");
    script.id = "jspdf-autotable-cdn-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el generador de tablas del PDF."));
    document.body.appendChild(script);
  });
}

/** Carga jsPDF + autoTable juntos; usar esto en vez de loadJsPDF a solas para reportes con tablas. */
async function loadPdfLibs() {
  const jsPDFCtor = await loadJsPDF();
  await loadAutoTable();
  return jsPDFCtor;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Paleta del PDF, tomada de la misma paleta de colores que usa la app (C), en formato RGB para jsPDF. */
const PDF_C = {
  steelDark: hexToRgb(C.steelDark),
  amber: hexToRgb(C.amber),
  amberSoft: hexToRgb(C.amberSoft),
  ink: hexToRgb(C.ink),
  inkSoft: hexToRgb(C.inkSoft),
  gray: hexToRgb(C.gray),
  line: hexToRgb(C.line),
  red: hexToRgb(C.red),
  green: hexToRgb(C.green),
  white: [255, 255, 255],
  rowStripe: [246, 248, 250],
};

/** Encabezado con banda de color, título y datos del reporte. Se dibuja solo en la primera página. Devuelve la Y donde puede empezar el contenido. */
function pdfLetterhead(doc, title, metaLines) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_C.steelDark);
  doc.rect(0, 0, pageW, 27, "F");
  doc.setFillColor(...PDF_C.amber);
  doc.rect(0, 27, pageW, 1.6, "F");
  doc.setTextColor(...PDF_C.white);
  doc.setFont(undefined, "bold"); doc.setFontSize(16);
  doc.text(title, 14, 12.5);
  doc.setFont(undefined, "normal"); doc.setFontSize(8.5);
  doc.text("Pisos Mecánicos · Revisión Diaria de Equipos", 14, 18.5);
  doc.setFontSize(7.8);
  doc.text(metaLines.join("   ·   "), 14, 23.8);
  doc.setTextColor(...PDF_C.ink);
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  return 36;
}

/** Pie de página con línea divisoria, fecha de generación y "Página X de Y", aplicado a TODAS las páginas al final. */
/** Agrega la firma guardada de quien envía el reporte, si tiene una configurada en Mi Perfil. Devuelve la nueva posición Y. */
function pdfSignatureBlock(doc, y, pageH, signatureDataUrl, userLine) {
  if (!signatureDataUrl) return y;
  if (y > pageH - 55) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Firma");
  try {
    doc.addImage(signatureDataUrl, "PNG", 14, y, 70, 27);
    y += 30;
  } catch { /* si la imagen no carga, se omite sin romper el PDF */ }
  doc.setFontSize(8.5); doc.setTextColor(...PDF_C.inkSoft);
  doc.text(userLine, 14, y);
  doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
  return y + 6;
}

function pdfFooterAll(doc) {
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_C.line);
    doc.setLineWidth(0.2);
    doc.line(14, pageH - 13, pageW - 14, pageH - 13);
    doc.setFontSize(7.3);
    doc.setTextColor(...PDF_C.gray);
    doc.text(`Generado ${fmtDT(nowIso())} · Pisos Mecánicos`, 14, pageH - 8.5);
    doc.text(`Página ${i} de ${pages}`, pageW - 14, pageH - 8.5, { align: "right" });
    doc.setTextColor(...PDF_C.ink);
  }
}

/** Título de sección con una barrita de color a la izquierda, estilo "ficha". Devuelve la Y siguiente. */
function pdfSectionTitle(doc, y, text, opts = {}) {
  doc.setFillColor(...(opts.color || PDF_C.amber));
  doc.rect(14, y - 4.2, 2, 6, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(11.5);
  doc.setTextColor(...PDF_C.ink);
  doc.text(text, 18.5, y);
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  return y + 7;
}

/** Fila de tarjetas de resumen (estilo "stat cards"), 2 a 4 tarjetas en una fila. Devuelve la Y siguiente. */
function pdfStatBoxes(doc, y, boxes) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14, gap = 4, boxH = 17;
  const boxW = (pageW - marginX * 2 - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach((b, i) => {
    const x = marginX + i * (boxW + gap);
    doc.setFillColor(...PDF_C.rowStripe);
    doc.setDrawColor(...PDF_C.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxW, boxH, 1.6, 1.6, "FD");
    doc.setFont(undefined, "normal"); doc.setFontSize(6.8);
    doc.setTextColor(...PDF_C.gray);
    doc.text(String(b.label).toUpperCase(), x + 3, y + 5.5);
    doc.setFont(undefined, "bold"); doc.setFontSize(11);
    doc.setTextColor(...(b.color || PDF_C.ink));
    const valLines = doc.splitTextToSize(String(b.value), boxW - 6);
    doc.text(valLines[0], x + 3, y + 12.2);
    doc.setFont(undefined, "normal");
  });
  doc.setTextColor(...PDF_C.ink);
  return y + boxH + 9;
}

/** Tabla estándar del reporte (usa autoTable). Devuelve la Y donde terminó, lista para lo siguiente. */
function pdfTable(doc, y, head, body, opts = {}) {
  doc.autoTable({
    startY: y,
    head: [head],
    body,
    theme: "striped",
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2.4, valign: "top", textColor: PDF_C.ink, lineColor: PDF_C.line, lineWidth: 0.1 },
    headStyles: { fillColor: opts.headColor || PDF_C.steelDark, textColor: PDF_C.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: PDF_C.rowStripe },
    columnStyles: opts.columnStyles || {},
    didParseCell: opts.didParseCell,
  });
  return doc.lastAutoTable.finalY + 8;
}

/** Descarga una foto (URL pública de Supabase Storage) y la convierte a data URL, para poder
 * insertarla en el PDF con doc.addImage — que solo acepta data URLs, no URLs remotas directas. */
async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo descargar la foto");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Reporte automático de una tarea/novedad terminada: descripción, fotos de antes y después,
 * quién la resolvió, y el tiempo total que tomó resolverla (de la asignación al cierre).
 * Las fotos se intentan insertar de verdad en el PDF; si alguna falla al descargar, se omite
 * sin romper el resto del reporte.
 */
async function generateTaskReportPdf(task, assigneeName) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Reporte de Novedad", [task.titulo, `Generado ${fmtDT(nowIso())}`]);

  const totalHoras = task.assignedAt && task.finishedAt ? hoursBetween(task.assignedAt, task.finishedAt) : null;
  y = pdfStatBoxes(doc, y, [
    { label: "Asignado a", value: assigneeName || "—" },
    { label: "Tiempo total", value: totalHoras != null ? fmtHours(totalHoras) : "—" },
    { label: "Prioridad", value: TASK_PRIORITIES.find(p => p.code === task.prioridad)?.label || task.prioridad },
    { label: "Estado", value: TASK_STATES.find(s => s.code === normalizeTaskState(task.estado))?.label || task.estado },
  ]);

  y = pdfSectionTitle(doc, y, "Descripción de la novedad");
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  const descLines = doc.splitTextToSize(task.descripcion || "Sin descripción adicional.", 180);
  doc.text(descLines, 14, y);
  y += descLines.length * 4.5 + 6;

  y = pdfSectionTitle(doc, y, "Cronología");
  y = pdfTable(doc, y, ["Evento", "Fecha y hora"], [
    ["Asignada", task.assignedAt ? fmtDT(task.assignedAt) : "—"],
    ["Iniciada", task.startedAt ? fmtDT(task.startedAt) : "—"],
    ["Finalizada", task.finishedAt ? fmtDT(task.finishedAt) : "—"],
  ]);

  const addPhotoGrid = async (title, urls) => {
    if (!urls || urls.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, title);
    const cellW = 42, cellH = 42, gap = 4, marginX = 14, cols = 4;
    let col = 0;
    for (const url of urls) {
      if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
      const x = marginX + col * (cellW + gap);
      try {
        const dataUrl = await urlToDataUrl(url);
        doc.addImage(dataUrl, "JPEG", x, y, cellW, cellH);
      } catch { /* si una foto puntual falla al descargar, se omite sin romper el resto */ }
      col++;
      if (col >= cols) { col = 0; y += cellH + gap; }
    }
    if (col > 0) y += cellH + gap;
    y += 4;
  };
  await addPhotoGrid("Fotos — antes", task.fotosAntes);
  await addPhotoGrid("Fotos — después", task.fotosDespues);

  if (task.notaCierre) {
    if (y > pageH - 30) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, "Nota de cierre");
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    const noteLines = doc.splitTextToSize(task.notaCierre, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5;
  }

  pdfFooterAll(doc);
  return doc;
}

/**
 * Reporte "arma el tuyo": el usuario elige qué secciones incluir (en vez de los formatos fijos
 * de siempre) — útil para pedidos puntuales de gerencia que no necesitan todo el informe completo.
 */
const CUSTOM_REPORT_SECTIONS = [
  { id: "activos", label: "Equipos fuera de servicio ahora" },
  { id: "resueltos", label: "Incidentes resueltos recientes" },
  { id: "mantenimiento", label: "Mantenimientos recientes (correctivos)" },
  { id: "rondas", label: "Rondas registradas (resumen)" },
  { id: "detalle", label: "Detalle completo por piso y equipo" },
];

async function generateCustomReportPdf(selectedIds, { activeIssues, issueHistory, roundsIndex, latestValues, mttoLog, mttoEquipos }, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const sectionLabels = CUSTOM_REPORT_SECTIONS.filter(s => selectedIds.includes(s.id)).map(s => s.label);
  let y = pdfLetterhead(doc, "Reporte Personalizado", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`, `Incluye: ${sectionLabels.join(", ")}`]);

  const ensureSpace = (min) => { if (y > pageH - min) { doc.addPage(); y = 18; } };
  const equipoNombre = (id) => (mttoEquipos || []).find(e => e.id === id)?.nombre || "Equipo";

  if (selectedIds.includes("activos")) {
    const active = Object.values(activeIssues || {});
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, `Equipos fuera de servicio ahora (${active.length})`, { color: PDF_C.red });
    if (active.length === 0) { doc.setFontSize(9); doc.text("Ninguno. Todo en orden.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Piso", "#", "Equipo", "Reportado por", "Desde", "Observación"],
      active.map(iss => [iss.floorName, String(iss.code), iss.name, iss.openedBy, fmtDT(iss.openedAt), iss.observation || "—"]),
      { headColor: PDF_C.red, columnStyles: { 1: { cellWidth: 8 } } });
  }

  if (selectedIds.includes("resueltos")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Incidentes resueltos recientes");
    const list = (issueHistory || []).slice(0, 25);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Piso", "#", "Equipo", "Dañado", "Resuelto", "Duración", "Solución"],
      list.map(h => [h.floorName, String(h.code), h.name, fmtDT(h.openedAt), fmtDT(h.resolvedAt), h.duration, h.solution || "—"]),
      { columnStyles: { 1: { cellWidth: 8 } } });
  }

  if (selectedIds.includes("mantenimiento")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Mantenimientos recientes (correctivos)");
    const list = (mttoLog || []).filter(m => m.tipo === "correctivo").slice(0, 25);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Fecha", "Equipo", "Descripción", "Costo", "Por"],
      list.map(m => [fmtDT(m.fecha || m.createdAt), equipoNombre(m.equipoId), m.descripcion || "—", m.costo ? `$${m.costo}` : "—", m.createdBy || "—"]));
  }

  if (selectedIds.includes("rondas")) {
    ensureSpace(40);
    y = pdfSectionTitle(doc, y, "Rondas registradas (resumen)");
    const list = (roundsIndex || []).slice(0, 30);
    if (list.length === 0) { doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8; }
    else y = pdfTable(doc, y, ["Fecha", "Piso", "Turno", "Por", "Ítems", "Dañados"],
      list.map(r => [r.date, r.floorName, r.shift || "—", r.user, String(r.itemCount || 0), String(r.damagedCount || 0)]));
  }

  if (selectedIds.includes("detalle")) {
    doc.addPage(); y = 18;
    y = pdfSectionTitle(doc, y, "Detalle completo por piso y equipo");
    FLOORS.forEach(floor => {
      ensureSpace(45);
      y = pdfSectionTitle(doc, y, floor.name);
      const rows = floor.items.map(item => {
        const lv = latestValues[item.id];
        const dmg = activeIssues[item.id];
        let valueStr = "Sin datos registrados";
        if (lv) {
          const parts = [];
          if (lv.status) parts.push(lv.status);
          if (lv.value !== undefined && lv.value !== "") parts.push(`${lv.value}${item.u ? " " + item.u : ""}`);
          if (parts.length) valueStr = parts.join(" · ");
        }
        return [String(item.c), item.n, valueStr + (dmg ? "  [FUERA DE SERVICIO]" : ""), lv?.observation || dmg?.observation || "—"];
      });
      y = pdfTable(doc, y, ["#", "Equipo", "Última lectura", "Observación"], rows, { columnStyles: { 0: { cellWidth: 8 } } });
    });
  }

  pdfFooterAll(doc);
  return doc;
}

async function sendCustomReportEmailAuto(to, selectedIds, data, generatedBy) {
  try {
    const doc = await generateCustomReportPdf(selectedIds, data, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to, subject: `Reporte personalizado — Pisos Mecánicos (${todayStr()})`,
        text: "Se adjunta el reporte personalizado que armaste.", pdfBase64,
        filename: `reporte-personalizado-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const dataRes = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: dataRes?.message || "El servidor rechazó el envío." };
    return dataRes;
  } catch {
    return { ok: false, message: "No se pudo generar o enviar el reporte. Revisa la conexión e intenta de nuevo." };
  }
}

async function generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Informe de Equipos", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);

  const active = Object.values(activeIssues);
  y = pdfStatBoxes(doc, y, [
    { label: "Fuera de servicio", value: String(active.length), color: active.length ? PDF_C.red : PDF_C.green },
    { label: "Incidentes resueltos (historial)", value: String(issueHistory.length) },
    { label: "Rondas registradas", value: String(roundsIndex.length) },
  ]);

  y = pdfSectionTitle(doc, y, `Equipos fuera de servicio actualmente (${active.length})`, { color: PDF_C.red });
  if (active.length === 0) {
    doc.setFontSize(9); doc.text("Ninguno. Todo en orden.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y,
      ["Piso", "#", "Equipo", "Reportado por", "Desde", "Fuera de servicio", "Observación"],
      active.map(iss => [iss.floorName, String(iss.code), iss.name, iss.openedBy, fmtDT(iss.openedAt), elapsed(iss.openedAt), iss.observation || "—"]),
      { headColor: PDF_C.red, columnStyles: { 1: { cellWidth: 8 }, 4: { cellWidth: 24 }, 5: { cellWidth: 20 } } });
  }

  if (y > pageH - 40) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Últimos incidentes resueltos");
  if (issueHistory.length === 0) {
    doc.setFontSize(9); doc.text("Sin registros.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y,
      ["Piso", "#", "Equipo", "Dañado", "Resuelto", "Duración", "Por", "Solución"],
      issueHistory.slice(0, 25).map(h => [h.floorName, String(h.code), h.name, fmtDT(h.openedAt), fmtDT(h.resolvedAt), h.duration, h.resolvedBy, h.solution || "—"]),
      { columnStyles: { 1: { cellWidth: 8 }, 5: { cellWidth: 18 } } });
  }

  doc.addPage(); y = 18;
  y = pdfSectionTitle(doc, y, "Detalle completo por piso y equipo");
  doc.setFontSize(8); doc.setTextColor(...PDF_C.gray);
  doc.text("Muestra la última lectura registrada en cualquier ronda para cada equipo, aunque no se haya llenado en la más reciente.", 14, y);
  doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
  y += 7;

  FLOORS.forEach(floor => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, floor.name);
    const rows = floor.items.map(item => {
      const lv = latestValues[item.id];
      const dmg = activeIssues[item.id];
      let valueStr = "Sin datos registrados";
      if (lv) {
        const parts = [];
        if (lv.status) parts.push(lv.status);
        if (lv.value !== undefined && lv.value !== "") parts.push(`${lv.value}${item.u ? " " + item.u : ""}`);
        if (lv.ph) parts.push(`PH ${lv.ph}`);
        if (lv.cloro) parts.push(`Cloro ${lv.cloro}`);
        if (lv.operador) parts.push(`Operador ${lv.operador}`);
        if (parts.length) valueStr = parts.join(" · ");
      }
      const obs = lv?.observation || dmg?.observation || "—";
      const updated = lv?.updatedAt ? `${fmtDT(lv.updatedAt)} · ${lv.updatedBy}` : "—";
      return [String(item.c), item.n, valueStr + (dmg ? "  [FUERA DE SERVICIO]" : ""), obs, updated];
    });
    y = pdfTable(doc, y, ["#", "Equipo", "Última lectura", "Observación", "Actualizado"], rows,
      { columnStyles: { 0: { cellWidth: 8 } } });
  });

  pdfFooterAll(doc);
  return doc;
}


/**
 * Construye el texto de "Entrega de turno": el detalle de TODOS los pisos recorridos
 * en la ronda que se acaba de terminar, piso por piso y equipo por equipo, para que
 * el técnico del siguiente turno sepa exactamente cómo quedó todo.
 */
function buildTourText(tour) {
  if (!tour) return "";
  const L = [];
  L.push("ENTREGA DE TURNO — Pisos Mecánicos");
  L.push(`Turno ${tour.shift} · ${tour.date} · Recorrido realizado por ${tour.user}`);
  L.push(`Equipos revisados: ${tour.itemCount}${tour.damagedCount ? ` · Fuera de servicio: ${tour.damagedCount}` : " · Todo en orden"}`);
  L.push("");
  tour.floors.forEach(f => {
    L.push(`— ${f.floorName} —`);
    if (f.items.length === 0) L.push("(sin equipos registrados en este piso)");
    f.items.forEach(it => {
      L.push(`#${it.code} ${it.name}: ${it.valueStr}${it.damaged ? "  [FUERA DE SERVICIO]" : ""}`);
      if (it.observation) L.push(`   Obs: ${it.observation}`);
    });
    if (f.notes) L.push(`Notas del piso: ${f.notes}`);
    L.push("");
  });
  return L.join("\n");
}

/** Convierte el documento jsPDF en base64 puro (sin el prefijo data:), listo para mandar al backend. */
function pdfDocToBase64(doc) {
  return new Promise((resolve, reject) => {
    try {
      const blob = doc.output("blob");
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) { reject(e); }
  });
}

/** PDF de UNA entrega de turno (el recorrido que se acaba de completar), piso por piso. */
async function generateTourPdf(tour, signatureDataUrl, signerCargo) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Entrega de Turno", [`Turno ${tour.shift}`, tour.date, `Recorrido de ${tour.user}`]);

  y = pdfStatBoxes(doc, y, [
    { label: "Equipos revisados", value: String(tour.itemCount) },
    { label: "Fuera de servicio", value: String(tour.damagedCount), color: tour.damagedCount ? PDF_C.red : PDF_C.green },
  ]);

  tour.floors.forEach(f => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, f.floorName);
    if (f.items.length === 0) {
      doc.setFontSize(9); doc.text("Sin equipos registrados en este piso.", 14, y); y += 8;
    } else {
      y = pdfTable(doc, y, ["#", "Equipo", "Valor / Estado", "Observación"],
        f.items.map(it => [String(it.code), it.name, it.valueStr + (it.damaged ? "  [FUERA DE SERVICIO]" : ""), it.observation || "—"]),
        { columnStyles: { 0: { cellWidth: 8 } } });
    }
    if (f.notes) {
      doc.setFontSize(8.5); doc.setTextColor(...PDF_C.inkSoft);
      const wrapped = doc.splitTextToSize(`Notas del piso: ${f.notes}`, 182);
      wrapped.forEach(w => { doc.text(w, 14, y); y += 4.4; });
      doc.setTextColor(...PDF_C.ink); doc.setFontSize(9);
      y += 3;
    }
  });

  // El nombre + cargo (cuando se sabe cuál es) queda junto a la firma, para que el documento
  // deje más claro quién es la persona responsable, no solo su nombre suelto.
  const signerLine = `${tour.user}${signerCargo ? ` — ${signerCargo}` : ""} — ${fmtDT(nowIso())}`;
  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, signerLine);

  pdfFooterAll(doc);
  return doc;
}


/**
 * Envío REAL y automático del correo con el PDF adjunto: genera el PDF en el navegador,
 * lo manda como base64 al backend (/api/send-report), y el backend (con la clave secreta
 * de Resend, que nunca toca el navegador) dispara el correo. No requiere que nadie
 * confirme "Enviar" en ninguna app — sucede solo.
 */
async function sendTourEmailAuto(to, tour, signatureDataUrl, signerCargo) {
  try {
    const doc = await generateTourPdf(tour, signatureDataUrl, signerCargo);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Entrega de turno ${tour.shift} - ${tour.date}`,
        text: buildTourText(tour),
        pdfBase64,
        filename: `entrega-turno-${String(tour.date).replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente (revisa la conexión). Puedes intentarlo de nuevo o usar el envío manual." };
  }
}

/**
 * Igual que sendTourEmailAuto, pero para el informe completo de los 12 pisos
 * (Reportes → PDF completo), también con el PDF adjunto de verdad vía el backend.
 */
async function sendFullReportEmailAuto(to, latestValues, activeIssues, issueHistory, roundsIndex, generatedBy) {
  try {
    const doc = await generateFullReportPdf(latestValues, activeIssues, issueHistory, roundsIndex, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Informe de equipos - Pisos Mecánicos (${todayStr()})`,
        text: buildReportText(activeIssues, issueHistory, roundsIndex),
        pdfBase64,
        filename: `informe-equipos-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente (revisa la conexión). Puedes intentarlo de nuevo o usar el envío manual." };
  }
}

function buildWhatsAppLink(phone, text) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  const short = text.length > 1500 ? text.slice(0, 1500) + "\n\n(mensaje truncado, descarga el informe completo en PDF desde la app)" : text;
  return `https://wa.me/${digits}?text=${encodeURIComponent(short)}`;
}

/* ============================================================
   RESUMEN SEMANAL CON IA
   ============================================================ */
/** Junta lo que pasó en los últimos `days` días (por defecto 7): daños resueltos, daños que
 *  siguen pendientes, y mantenimientos correctivos — en un formato liviano, listo para mandarle
 *  a la IA a que lo redacte en español natural. */
function buildWeeklySummaryInput(issueHistory, activeIssues, mttoLog, mttoEquipos, days = 7) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const resolved = (issueHistory || [])
    .filter(h => new Date(h.resolvedAt) >= since)
    .map(h => ({ equipo: h.name, piso: h.floorName, observacion: h.observation, solucion: h.solution, diasAbierto: Math.round(elapsedHours(h.openedAt, h.resolvedAt) / 24) }));
  const pending = Object.values(activeIssues || {})
    .map(iss => ({ equipo: iss.name, piso: iss.floorName, observacion: iss.observation, diasAbierto: Math.round(elapsedHours(iss.openedAt, new Date().toISOString()) / 24) }));
  const equipoNombre = (id) => (mttoEquipos || []).find(e => e.id === id)?.nombre || "Equipo";
  const correctivos = (mttoLog || [])
    .filter(m => m.tipo === "correctivo" && new Date(m.fecha) >= since)
    .map(m => ({ equipo: equipoNombre(m.equipoId), descripcion: m.descripcion, costo: m.costo || 0 }));
  return { resolved, pending, correctivos };
}
function elapsedHours(fromIso, toIso) {
  return Math.max(0, (new Date(toIso) - new Date(fromIso)) / 36e5);
}

async function requestWeeklySummary({ weekLabel, resolved, pending, correctivos }) {
  const resp = await fetch("/api/generate-weekly-summary", {
    method: "POST",
    headers: aiRequestHeaders(),
    body: JSON.stringify({ weekLabel, resolved, pending, correctivos }),
  });
  return resp.json();
}

/** PDF de una sola página con el resumen semanal ya redactado — es lo que se adjunta al correo. */
async function generateWeeklySummaryPdf(summaryText, weekLabel, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = pdfLetterhead(doc, "Resumen Semanal", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  y += 4;
  doc.setFontSize(10.5); doc.setTextColor(...PDF_C.ink);
  const lines = doc.splitTextToSize(summaryText, 182);
  doc.text(lines, 14, y);
  pdfFooterAll(doc);
  return doc;
}

async function sendWeeklySummaryEmailAuto(to, summaryText, weekLabel, generatedBy) {
  try {
    const doc = await generateWeeklySummaryPdf(summaryText, weekLabel, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to, subject: `Resumen semanal — Pisos Mecánicos (${weekLabel})`,
        text: summaryText, pdfBase64, filename: `resumen-semanal-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch {
    return { ok: false, message: "No se pudo generar o enviar el resumen. Revisa la conexión e intenta de nuevo." };
  }
}


function PrintableReport({ activeIssues, issueHistory, roundsIndex, onClose }) {
  useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);
  const active = Object.values(activeIssues);
  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#111", padding: 32, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button icon={Save} onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
        <Button variant="ghost" icon={X} onClick={onClose}>Cerrar</Button>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Informe de Equipos — Pisos Mecánicos</h1>
      <p style={{ fontSize: 12, color: "#555" }}>Generado: {fmtDT(nowIso())}</p>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Equipos fuera de servicio actualmente ({active.length})</h2>
      {active.length === 0 && <p style={{ fontSize: 12 }}>Ninguno. Todo en orden.</p>}
      {active.map((iss, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          <b>[{iss.floorName}] #{iss.code} {iss.name}</b> — reportado por {iss.openedBy} el {fmtDT(iss.openedAt)} ({elapsed(iss.openedAt)} fuera de servicio)<br />
          <i>Obs: {iss.observation}</i>
        </div>
      ))}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Últimos incidentes resueltos</h2>
      {issueHistory.length === 0 && <p style={{ fontSize: 12 }}>Sin registros.</p>}
      {issueHistory.slice(0, 20).map((h, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          <b>[{h.floorName}] #{h.code} {h.name}</b><br />
          Dañado: {fmtDT(h.openedAt)} · Resuelto: {fmtDT(h.resolvedAt)} por {h.resolvedBy} · Duración: {h.duration}<br />
          <i>Solución: {h.solution}</i>
        </div>
      ))}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 20 }}>Últimas rondas registradas</h2>
      {roundsIndex.length === 0 && <p style={{ fontSize: 12 }}>Sin registros.</p>}
      {roundsIndex.slice(0, 20).map((r, i) => (
        <div key={i} style={{ fontSize: 12, borderBottom: "1px solid #ddd", padding: "6px 0" }}>
          {r.floorName} · {fmtDT(r.savedAt)} · Turno {r.shift} · {r.user} · {r.itemCount} equipos registrados{r.damagedCount ? `, ${r.damagedCount} dañados` : ""}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   VISTA: ENTREGA DE TURNO
   Se genera automáticamente cada vez que se completa un recorrido
   (todos los pisos, desde el primero hasta el último). Muestra piso
   por piso cómo quedó cada equipo y permite enviarlo de inmediato
   por correo o WhatsApp con un solo toque.
   ============================================================ */
/* ============================================================
   FIRMA DIGITAL (canvas) — para la Entrega de Turno
   ============================================================ */
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={340} height={130}
        className="rounded-md border w-full touch-none" style={{ borderColor: C.line, background: "#fff", maxWidth: 340 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button onClick={clear} className="text-xs mt-1" style={{ color: C.gray }}>Borrar firma</button>
    </div>
  );
}

/* ============================================================
   VISTA: MI PERFIL (firma guardada, se usa sola en cada entrega de turno)
   ============================================================ */
/**
 * Muestra las novedades de la app — para que el equipo sepa qué es nuevo sin que tengas que
 * avisarles uno por uno. Cualquiera puede verlas; solo el admin puede agregar una nueva.
 */
/** Historial de cambios de empleados e inventario — quién cambió qué, antes y después. */
/**
 * Compara los pisos que se fueron guardando (roundsIndex, uno por piso) contra los recorridos
 * que sí llegaron a completarse (tourHistory, uno por recorrido entero) — para que el admin vea
 * de un vistazo si algún turno se quedó a medias sin terminar el recorrido completo.
 */
function computeRoundCompletionSummary(roundsIndex, tourHistory, totalFloors) {
  const groups = {};
  (roundsIndex || []).forEach(r => {
    const key = `${r.date}::${r.shift}::${r.user}`;
    if (!groups[key]) groups[key] = { date: r.date, shift: r.shift, user: r.user, floorIds: new Set(), lastSavedAt: r.savedAt };
    groups[key].floorIds.add(r.floorId);
    if (r.savedAt > groups[key].lastSavedAt) groups[key].lastSavedAt = r.savedAt;
  });
  const completedKeys = new Set((tourHistory || []).map(t => `${t.date}::${t.shift}::${t.user}`));
  return Object.values(groups)
    .map(g => ({
      date: g.date, shift: g.shift, user: g.user, lastSavedAt: g.lastSavedAt,
      floorsDone: g.floorIds.size, totalFloors,
      completed: completedKeys.has(`${g.date}::${g.shift}::${g.user}`),
    }))
    .sort((a, b) => (b.date + b.lastSavedAt).localeCompare(a.date + a.lastSavedAt));
}

function RoundCompletionView({ roundsIndex, tourHistory }) {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const summary = useMemo(() => computeRoundCompletionSummary(roundsIndex, tourHistory, FLOORS.length), [roundsIndex, tourHistory]);
  const filtered = onlyIncomplete ? summary.filter(s => !s.completed) : summary;
  const incompleteCount = summary.filter(s => !s.completed).length;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Recorridos completados</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Compara los pisos que se fueron guardando contra los recorridos que sí se cerraron completos (los {FLOORS.length} pisos).
      </p>

      {incompleteCount > 0 && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.redSoft, color: "#a31245" }}>
          ⚠ Hay {incompleteCount} recorrido(s) que se empezaron pero no se terminaron completos.
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-medium mb-3 cursor-pointer select-none" style={{ color: C.inkSoft }}>
        <input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} />
        Mostrar solo los incompletos
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>
          {onlyIncomplete ? "No hay recorridos incompletos — todo bien." : "Todavía no hay recorridos registrados."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 flex-wrap"
              style={{ background: s.completed ? C.panel : C.redSoft, border: `1px solid ${s.completed ? C.line : "#e0a0b0"}` }}>
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>{s.user} · {s.date} · Turno {s.shift}</div>
                <div className="text-xs" style={{ color: C.gray }}>Último guardado: {fmtDT(s.lastSavedAt)}</div>
              </div>
              <div className="text-right">
                {s.completed ? (
                  <Pill tone="green"><CheckCircle2 size={12} /> Completo</Pill>
                ) : (
                  <Pill tone="red"><AlertTriangle size={12} /> {s.floorsDone} de {s.totalFloors} pisos</Pill>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AUDIT_ACTION_LABELS = { creacion: "Creación", edicion: "Edición", eliminacion: "Eliminación" };
const AUDIT_ACTION_COLORS = { creacion: { bg: "#dff5e3", fg: "#1c7a34" }, edicion: { bg: "#e3f0ff", fg: "#1a4f8a" }, eliminacion: { bg: "#ffe3ea", fg: "#a31245" } };
const AUDIT_KIND_LABELS = { empleado: "Empleado", inventario: "Inventario", tarea: "Tarea", combustible: "Combustible" };
const AUDIT_KIND_COLORS = { empleado: { bg: "#e0ecff", fg: "#1e4fa3" }, inventario: { bg: "#dff5e3", fg: "#1c7a34" }, tarea: { bg: "#fff3d6", fg: "#8a5a00" }, combustible: { bg: "#f3e0ff", fg: "#6b1ea3" } };

function GeneralHistoryView({ entries }) {
  const [filter, setFilter] = useState("all"); // all | empleado | inventario | tarea
  const filtered = filter === "all" ? entries : entries.filter(e => e.kind === filter);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Historial de cambios</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Registro de auditoría: quién hizo qué, desde qué dispositivo y cuándo — en empleados, inventario y tareas. Más reciente primero.
      </p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[["all", "Todo"], ["empleado", "Empleados"], ["inventario", "Inventario"], ["tarea", "Tareas"], ["combustible", "Combustible"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className="text-xs px-2.5 py-1 rounded-full border"
            style={{ borderColor: filter === id ? C.amber : C.line, background: filter === id ? C.amberSoft : C.panel, color: filter === id ? "#7a5405" : C.inkSoft }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: C.gray }}>No hay cambios registrados todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.slice(0, 300).map(e => {
            const action = e.action || "edicion";
            const actionColor = AUDIT_ACTION_COLORS[action];
            const kindColor = AUDIT_KIND_COLORS[e.kind];
            return (
              <div key={e.id} className="text-xs rounded-md px-2 py-1.5" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink }}>
                <span className="mr-1.5 text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: actionColor.bg, color: actionColor.fg }}>
                  {AUDIT_ACTION_LABELS[action]}
                </span>
                <span className="mr-1.5 text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: kindColor.bg, color: kindColor.fg }}>
                  {AUDIT_KIND_LABELS[e.kind] || e.kind}
                </span>
                <b>{e.by}</b>{" "}
                {action === "creacion" && <>creó <b>{e.entityLabel}</b></>}
                {action === "eliminacion" && <>eliminó <b>{e.entityLabel}</b></>}
                {action === "edicion" && (
                  <>cambió <span style={{ color: C.inkSoft }}>{e.field}</span> de <b>{e.entityLabel}</b>:{" "}
                    <span style={{ color: C.gray }}>{e.before}</span> → <span style={{ color: C.amber, fontWeight: 600 }}>{e.after}</span></>
                )}
                <div className="mt-0.5" style={{ color: C.gray }}>
                  {e.device || "Dispositivo desconocido"} · {fmtDT(e.at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChangelogView({ entries, isAdmin, currentUser, onAddEntry, onDeleteEntry }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const doAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onAddEntry({ title: title.trim(), description: description.trim() });
    setTitle(""); setDescription(""); setShowForm(false);
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Novedades</h2>
        {isAdmin && <Button size="sm" variant="ghost" icon={PlusCircle} onClick={() => setShowForm(v => !v)}>Agregar</Button>}
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Qué ha ido cambiando en la app, más reciente primero.</p>

      {showForm && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ej: Horario Mensual con IA)"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="¿Qué cambió, en pocas palabras?"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }} />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!title.trim() || saving} onClick={doAdd}>{saving ? "Guardando…" : "Publicar"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.map(e => (
          <div key={e.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{e.title}</div>
              {isAdmin && <button onClick={() => onDeleteEntry(e.id)} className="p-1"><X size={14} color={C.gray} /></button>}
            </div>
            {e.description && <p className="text-sm mt-1" style={{ color: C.inkSoft }}>{e.description}</p>}
            <div className="text-xs mt-2" style={{ color: C.gray }}>{fmtDT(e.at)} {e.by ? `· ${e.by}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ currentUser, mySignature, onSaveSignature, employees, linkedEmployeeId, onSetLinkedEmployee, onLogoutEverywhere }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [linkSaved, setLinkSaved] = useState(false);
  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false);

  const doSave = async () => {
    if (!draft) return;
    setSaveError(null);
    try {
      await onSaveSignature(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message || "No se pudo guardar la firma.");
    }
  };

  const doSetLink = async (employeeId) => {
    await onSetLinkedEmployee(employeeId || null);
    setLinkSaved(true);
    setTimeout(() => setLinkSaved(false), 2500);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi Perfil</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{currentUser}</p>

      {employees && employees.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>¿Cuál eres tú en el Horario Mensual?</div>
          <p className="text-xs mb-3" style={{ color: C.gray }}>
            Selecciónate una vez y desde entonces "Mi horario" te muestra solo tus turnos, sin tener que buscarte en la tabla completa.
          </p>
          <select value={linkedEmployeeId || ""} onChange={e => doSetLink(e.target.value)}
            className="text-sm border rounded-md px-2 py-2 outline-none w-full max-w-xs" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <option value="">No estoy en la lista / prefiero no elegir</option>
            {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {linkSaved && <div className="text-xs mt-2" style={{ color: C.green }}>✓ Guardado</div>}
        </div>
      )}

      <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Mi firma</div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          La guardas una sola vez aquí, y de ahí en adelante se agrega sola en cada Entrega de turno — no hace falta volver a firmar cada vez.
        </p>

        {mySignature && !draft && (
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: C.gray }}>Firma actual:</div>
            <img src={mySignature} alt="Tu firma" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 240, background: "#fff" }} />
          </div>
        )}

        <div className="text-xs mb-1" style={{ color: C.gray }}>{mySignature ? "Dibuja aquí para reemplazarla:" : "Dibuja tu firma aquí:"}</div>
        <SignaturePad onChange={setDraft} />

        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" disabled={!draft} onClick={doSave}>Guardar firma</Button>
          {saved && <span className="text-xs font-medium" style={{ color: C.green }}>✓ Firma guardada</span>}
          {saveError && <span className="text-xs font-medium" style={{ color: C.red }}>{saveError}</span>}
        </div>
      </div>

      <div className="rounded-lg border p-4 mt-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Seguridad</div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          Si perdiste un celular con la app abierta, o dejaste la sesión abierta en un equipo que ya no usas, esto la cierra
          en TODOS los dispositivos donde esté conectada — vas a tener que volver a entrar aquí también.
        </p>
        {!confirmingLogoutAll ? (
          <Button size="sm" variant="ghost" icon={LogOut} onClick={() => setConfirmingLogoutAll(true)}>Cerrar sesión en todos los dispositivos</Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: C.red }}>¿Seguro? Vas a salir de aquí también.</span>
            <Button size="sm" variant="red" onClick={onLogoutEverywhere}>Sí, cerrar en todos lados</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingLogoutAll(false)}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Vista simple, pensada para celular, de los turnos de UN SOLO empleado (el que se enlazó en
 * Mi Perfil) — en vez de tener que buscarse en la tabla grande de todo el equipo. Muestra el mes
 * en tarjetas, una por día trabajado, con navegación de mes.
 */
function MyScheduleView({ employee, scheduleEntries, onGoToProfile }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  if (!employee) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi horario</h2>
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Todavía no te has seleccionado en el Horario Mensual.{" "}
          <button onClick={onGoToProfile} className="underline font-medium" style={{ color: C.amber }}>Ve a Mi Perfil</button> y elige cuál eres tú en la lista.
        </p>
      </div>
    );
  }

  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const daysIso = daysInMonthIso(year, month);
  const monthLabel = monthDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const weeks = weeksInRange(daysIso);
  const entries = {};
  daysIso.forEach(d => { const e = scheduleEntries[scheduleKey(employee.id, d)]; if (e) entries[d] = e; });
  const monthTotal = weeks.reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
  const comp = employee.reductionHoursPerDay > 0 ? computeCompBalance(employee, scheduleEntries) : null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Mi horario — {employee.name}</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{employee.cargo || "—"}</p>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-md border" style={{ borderColor: C.line }}><ChevronLeft size={16} color={C.ink} /></button>
        <span className="text-sm font-semibold capitalize" style={{ color: C.ink }}>{monthLabel}</span>
        <button onClick={() => setMonthDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-md border" style={{ borderColor: C.line }}><ChevronRight size={16} color={C.ink} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs" style={{ color: C.gray }}>Horas del mes</div>
          <div className="text-lg font-semibold" style={{ color: C.ink }}>{monthTotal}h</div>
        </div>
        {comp && (
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: comp.fullDays >= 1 ? C.amber : C.line, background: comp.fullDays >= 1 ? "#fdf0da" : C.panel }}>
            <div className="text-xs" style={{ color: C.gray }}>Reducción acumulada</div>
            <div className="text-lg font-semibold" style={{ color: comp.fullDays >= 1 ? "#78350f" : C.ink }}>
              {comp.fullDays >= 1 ? `¡${comp.fullDays} día(s)!` : `${comp.hours}h`}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {daysIso.map(d => {
          const dd = new Date(d + "T00:00:00");
          const entry = entries[d];
          const colors = entry?.code ? SPECIAL_CODE_COLORS[entry.code] : null;
          const label = SPECIAL_CODES.find(s => s.code === entry?.code)?.label;
          return (
            <div key={d} className="rounded-lg border px-3 py-2 flex items-center justify-between"
              style={{ borderColor: C.line, background: colors?.bg || (isSundayOrHoliday(d) ? "#fdf2f2" : C.panel) }}>
              <div>
                <div className="text-sm font-medium capitalize" style={{ color: C.ink }}>
                  {dd.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                  {isSundayOrHoliday(d) && <span className="ml-1 text-xs" style={{ color: C.red }}>· dom/fest</span>}
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: colors?.fg || (entry ? C.ink : C.gray) }}>
                {entry ? (entry.code ? (label || entry.code) : fmtEntryShort(entry)) : "Libre"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HandoffView({ lastTour, tourHistory, reportEmail, reportWhatsapp, onLogSent, currentUser, justFinished, onAckFinished, autoSendResult, mySignature, signerCargo, onGoToProfile }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [waTo, setWaTo] = useState(reportWhatsapp || "");
  const [sentNow, setSentNow] = useState(null);
  const [sendingAuto, setSendingAuto] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);
  useEffect(() => { setWaTo(reportWhatsapp || ""); }, [reportWhatsapp]);

  if (!lastTour) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Entrega de turno</h2>
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no se ha completado un recorrido. Cuando termines de revisar todos los pisos, desde el primero hasta el
          último, aquí aparecerá automáticamente el resumen listo para enviar.
        </p>
      </div>
    );
  }

  const text = buildTourText(lastTour);

  const doDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const doc = await generateTourPdf(lastTour, mySignature, signerCargo);
      doc.save(`entrega-turno-${String(lastTour.date).replace(/\//g, "-")}.pdf`);
    } catch {
      setSentNow({ ok: false, text: "No se pudo generar el PDF (revisa la conexión a internet, se necesita la primera vez)." });
    }
    setDownloadingPdf(false);
  };

  const doSendAutoEmail = async () => {
    if (!emailTo.trim()) { setSentNow({ ok: false, text: "Escribe un correo destino." }); return; }
    setSendingAuto(true); setSentNow(null);
    const res = await sendTourEmailAuto(emailTo.trim(), lastTour, mySignature, signerCargo);
    setSentNow({ ok: res.ok, text: res.message });
    onLogSent({ to: emailTo.trim(), method: "Entrega de turno (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSendingAuto(false);
  };

  const sendMailManual = () => {
    if (!emailTo.trim()) { setSentNow({ ok: false, text: "Escribe un correo destino." }); return; }
    const subject = `Entrega de turno ${lastTour.shift} - ${lastTour.date}`;
    const body = text.length > 1800 ? text.slice(0, 1800) + "\n\n(resumen truncado, descarga el PDF desde el botón de arriba y adjúntalo aquí)" : text;
    window.open(`mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    onLogSent({ to: emailTo.trim(), method: "Entrega de turno (borrador manual)", ok: true, message: "Se abrió el borrador de correo, listo para adjuntar el PDF y enviar.", sentBy: currentUser, sentAt: nowIso() });
    setSentNow({ ok: true, text: "Se abrió tu correo con el resumen. Adjunta el PDF descargado arriba y dale Enviar allá." });
  };

  const sendWa = () => {
    if (!waTo.trim()) { setSentNow({ ok: false, text: "Escribe un número de WhatsApp (con indicativo, ej. 573001234567)." }); return; }
    window.open(buildWhatsAppLink(waTo.trim(), text), "_blank");
    onLogSent({ to: waTo.trim(), method: "Entrega de turno (WhatsApp, sin PDF)", ok: true, message: "Se abrió WhatsApp con el resumen en texto. WhatsApp no permite adjuntar el PDF por enlace: adjúntalo tú mismo desde tus descargas.", sentBy: currentUser, sentAt: nowIso() });
    setSentNow({ ok: true, text: "Se abrió WhatsApp con el resumen en texto. Descarga el PDF arriba y adjúntalo tú mismo dentro de WhatsApp — la plataforma no permite adjuntarlo por enlace." });
  };

  return (
    <div>
      {justFinished && (
        <div className="rounded-lg p-3 mb-4" style={{ background: C.greenSoft, border: `1px solid ${C.green}` }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm" style={{ color: "#1c5e2e" }}>
              <b>✓ Recorrido finalizado.</b> {reportEmail ? "Se intentó enviar automáticamente por correo con el PDF adjunto." : "Configura un correo en el Panel de Administrador para que esto se envíe solo la próxima vez."}
            </div>
            <Button size="sm" variant="ghost" onClick={onAckFinished}>Entendido</Button>
          </div>
        </div>
      )}
      {autoSendResult && (
        <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: autoSendResult.ok ? C.greenSoft : C.redSoft, border: `1px solid ${autoSendResult.ok ? C.green : C.red}`, color: autoSendResult.ok ? "#1c5e2e" : C.red }}>
          {autoSendResult.ok ? "✓ " : "✗ "}{autoSendResult.message}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Entrega de turno</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Turno <b>{lastTour.shift}</b> · {lastTour.date} · recorrido de <b>{lastTour.user}</b> ·{" "}
        {lastTour.itemCount} equipos revisados{lastTour.damagedCount ? `, ${lastTour.damagedCount} dañados` : ", todo en orden"}
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: mySignature ? C.line : C.red, background: mySignature ? C.panel : C.redSoft, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Firma de quien entrega el turno</div>
        {mySignature ? (
          <div>
            <img src={mySignature} alt="Tu firma" className="rounded-md border" style={{ borderColor: C.line, maxWidth: 200, background: "#fff" }} />
            <div className="text-xs mt-1" style={{ color: C.gray }}>
              Esta es la firma guardada en tu perfil — se incluye sola en el PDF. <button onClick={onGoToProfile} className="underline" style={{ color: C.blue }}>Cambiarla</button>
            </div>
          </div>
        ) : (
          <div className="text-xs" style={{ color: "#a31245" }}>
            <b>⚠ Todavía no has guardado tu firma — es obligatoria para poder enviar el recorrido.</b>{" "}
            <button onClick={onGoToProfile} className="underline font-semibold" style={{ color: C.blue }}>Configúrala en Mi Perfil</button> — la guardas una sola vez y de ahí en adelante se agrega sola en cada entrega de turno.
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF de este recorrido</div>
        <Button variant="ghost" icon={Download} disabled={downloadingPdf || !mySignature} onClick={doDownloadPdf}>
          {downloadingPdf ? "Generando…" : "Descargar PDF"}
        </Button>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAuto || !mySignature} onClick={doSendAutoEmail}>{sendingAuto ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" disabled={!mySignature} onClick={sendMailManual}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp — resumen en texto (el PDF se adjunta a mano)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número WhatsApp, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button variant="ghost" icon={MessageCircle} disabled={!mySignature} onClick={sendWa}>Enviar por WhatsApp</Button>
        </div>
        <div className="text-xs mt-1" style={{ color: C.gray }}>
          WhatsApp no permite adjuntar archivos por enlace bajo ninguna circunstancia (ni Meta lo permite a terceros
          sin su API de negocios aprobada). Descarga el PDF arriba y adjúntalo tú mismo dentro de la conversación.
        </div>

        {!mySignature && <div className="text-xs mt-2 font-medium" style={{ color: "#a31245" }}>Guarda tu firma en Mi Perfil para poder usar estos botones.</div>}
        {sentNow && <div className="text-xs mt-2" style={{ color: sentNow.ok ? C.green : C.red }}>{sentNow.text}</div>}
      </div>

      {lastTour.floors.map(f => (
        <div key={f.floorId} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{f.floorName}</div>
          {f.items.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Sin equipos registrados en este piso.</div>}
          {f.items.map((it, i) => (
            <div key={i} className="text-xs py-1 flex items-start justify-between gap-2 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
              <span style={{ color: C.inkSoft }}>
                #{it.code} {it.name}
                {it.observation && <span className="italic"> — {it.observation}</span>}
              </span>
              <span className="shrink-0 text-right" style={{ color: it.damaged ? C.red : C.ink, fontWeight: it.damaged ? 700 : 500 }}>
                {it.valueStr}{it.damaged ? " · DAÑADO" : ""}
              </span>
            </div>
          ))}
          {f.notes && <div className="text-xs italic mt-1.5" style={{ color: C.inkSoft }}>Notas del piso: {f.notes}</div>}
        </div>
      ))}

      {tourHistory.length > 1 && (
        <details className="mt-4">
          <summary className="text-xs cursor-pointer select-none" style={{ color: C.gray }}>
            Ver recorridos anteriores ({tourHistory.length - 1})
          </summary>
          <div className="mt-2">
            {tourHistory.slice(1, 20).map(t => (
              <div key={t.id} className="text-xs py-1.5 border-b flex items-center justify-between" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <span>{t.date} · Turno {t.shift} · {t.user}</span>
                <span style={{ color: C.gray }}>{t.itemCount} equipos{t.damagedCount ? `, ${t.damagedCount} dañados` : ""}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: ANÁLISIS DE FALLAS (solo administradores)
   Seguimiento de cuánto tiempo y con qué frecuencia cada equipo
   ha estado fuera de servicio, con gráficas por fecha.
   ============================================================ */
function hoursBetween(a, b) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3600000);
}
function fmtHours(h) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} días`;
}
function computeEquipmentStats(issueHistory, activeIssues, sinceDate) {
  const map = {};
  const ensure = (key, base) => {
    if (!map[key]) {
      map[key] = {
        equipmentId: key, code: base.code, name: base.name, floorName: base.floorName,
        incidents: [], totalHours: 0, currentlyDown: false, downSince: null,
      };
    }
  };
  issueHistory.forEach(h => {
    if (sinceDate && new Date(h.openedAt) < sinceDate) return;
    ensure(h.equipmentId, h);
    const hrs = hoursBetween(h.openedAt, h.resolvedAt);
    map[h.equipmentId].totalHours += hrs;
    map[h.equipmentId].incidents.push({ from: h.openedAt, to: h.resolvedAt, hours: hrs, solution: h.solution, resolvedBy: h.resolvedBy, ongoing: false });
  });
  Object.values(activeIssues).forEach(a => {
    if (sinceDate && new Date(a.openedAt) < sinceDate) return;
    ensure(a.equipmentId, a);
    const hrs = hoursBetween(a.openedAt, nowIso());
    map[a.equipmentId].totalHours += hrs;
    map[a.equipmentId].currentlyDown = true;
    map[a.equipmentId].downSince = a.openedAt;
    map[a.equipmentId].incidents.push({ from: a.openedAt, to: null, hours: hrs, solution: null, resolvedBy: null, ongoing: true });
  });
  Object.values(map).forEach(eq => eq.incidents.sort((a, b) => new Date(b.from) - new Date(a.from)));
  return Object.values(map).sort((a, b) => b.totalHours - a.totalHours);
}

/** PDF del reporte de Análisis de fallas: resumen + detalle de incidentes por equipo. */
async function generateAnalyticsPdf(stats, rangeLabel, summary, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Análisis de Fallas", [`Período: ${rangeLabel}`, `Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);

  const longest = stats.filter(e => e.currentlyDown).sort((a, b) => b.totalHours - a.totalHours)[0];
  y = pdfStatBoxes(doc, y, [
    { label: "Fuera de servicio ahora", value: String(summary.totalCurrentlyDown), color: summary.totalCurrentlyDown ? PDF_C.red : PDF_C.green },
    { label: "Incidentes en el período", value: String(summary.totalIncidents) },
    { label: "Falla activa más larga", value: longest ? `${longest.name} · ${fmtHours(longest.totalHours)}` : "Ninguna" },
  ]);

  if (stats.length === 0) {
    doc.setFontSize(9); doc.text("No hay incidentes registrados en este período.", 14, y);
    pdfFooterAll(doc);
    return doc;
  }

  y = pdfSectionTitle(doc, y, "Resumen por equipo (ordenado por tiempo fuera de servicio)");
  y = pdfTable(doc, y, ["Equipo", "Piso", "Incidentes", "Horas acumuladas", "Estado"],
    stats.map(eq => [eq.name, eq.floorName, String(eq.incidents.length), fmtHours(eq.totalHours), eq.currentlyDown ? "Fuera de servicio" : "Resuelto"]),
    { columnStyles: { 2: { cellWidth: 20 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } } });

  if (y > pageH - 40) { doc.addPage(); y = 18; }
  y = pdfSectionTitle(doc, y, "Detalle de incidentes por equipo");
  stats.forEach(eq => {
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    doc.setFont(undefined, "bold"); doc.setFontSize(9.5);
    doc.text(`${eq.name} (${eq.floorName})`, 14, y);
    doc.setFont(undefined, "normal"); doc.setFontSize(9);
    y += 5;
    y = pdfTable(doc, y, ["Desde", "Hasta", "Duración", "Solución", "Resuelto por"],
      eq.incidents.map(inc => [fmtDT(inc.from), inc.ongoing ? "Sigue fuera de servicio" : fmtDT(inc.to), fmtHours(inc.hours), inc.solution || "—", inc.resolvedBy || "—"]),
      { columnStyles: { 2: { cellWidth: 22 } } });
  });

  pdfFooterAll(doc);
  return doc;
}

async function sendAnalyticsEmailAuto(to, stats, rangeLabel, summary, generatedBy) {
  try {
    const doc = await generateAnalyticsPdf(stats, rangeLabel, summary, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const textLines = [
      "ANÁLISIS DE FALLAS — PISOS MECÁNICOS",
      `Período: ${rangeLabel}`,
      `Fuera de servicio ahora: ${summary.totalCurrentlyDown} · Incidentes en el período: ${summary.totalIncidents}`,
      "",
      "Ver el detalle completo por equipo en el PDF adjunto.",
    ];
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Análisis de fallas - Pisos Mecánicos (${todayStr()})`,
        text: textLines.join("\n"),
        pdfBase64,
        filename: `analisis-fallas-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   PDF Y CORREO: INVENTARIO (lista de compras)
   ============================================================ */
/** Arma un PDF con TODOS los códigos QR de todas las estanterías, en cuadrícula, listos para imprimir y recortar. */
async function generateAllShelvesQrPdf(bodegas, shelves) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Códigos QR — Estanterías de Inventario", [`${shelves.length} estanterías`, `Generado ${fmtDT(nowIso())}`]);

  const cols = 4, cellW = 46, cellH = 58, marginX = 14;
  const pageH = doc.internal.pageSize.getHeight();
  let col = 0;

  const bodegaName = (id) => bodegas.find(b => b.id === id)?.name || "—";

  for (const shelf of shelves) {
    if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
    const x = marginX + col * cellW;
    try {
      const dataUrl = await QRCode.toDataURL(shelfUrl(shelf.id), { width: 200, margin: 0 });
      doc.addImage(dataUrl, "PNG", x, y, 38, 38);
    } catch { /* si falla un QR puntual, sigue con los demás */ }
    doc.setFontSize(7.5); doc.setFont(undefined, "bold");
    const codeLines = doc.splitTextToSize(shelf.code, cellW - 2);
    doc.text(codeLines, x, y + 42);
    doc.setFont(undefined, "normal"); doc.setFontSize(6.5);
    const bLines = doc.splitTextToSize(bodegaName(shelf.bodegaId), cellW - 2);
    doc.text(bLines, x, y + 42 + codeLines.length * 3.2);

    col++;
    if (col >= cols) { col = 0; y += cellH; }
  }

  pdfFooterAll(doc);
  return doc;
}


/** Igual que generateAllShelvesQrPdf, pero para los equipos del módulo de Mantenimiento. */
async function generateAllEquiposQrPdf(equipos) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Códigos QR — Equipos de Mantenimiento", [`${equipos.length} equipos`, `Generado ${fmtDT(nowIso())}`]);

  const cols = 4, cellW = 46, cellH = 58, marginX = 14;
  const pageH = doc.internal.pageSize.getHeight();
  let col = 0;

  for (const eq of equipos) {
    if (y + cellH > pageH - 16) { doc.addPage(); y = 18; col = 0; }
    const x = marginX + col * cellW;
    try {
      const dataUrl = await QRCode.toDataURL(equipoUrl(eq.id), { width: 200, margin: 0 });
      doc.addImage(dataUrl, "PNG", x, y, 38, 38);
    } catch { /* si falla un QR puntual, sigue con los demás */ }
    doc.setFontSize(7); doc.setFont(undefined, "bold");
    const nameLines = doc.splitTextToSize(eq.nombre, cellW - 2).slice(0, 2);
    doc.text(nameLines, x, y + 42);
    doc.setFont(undefined, "normal"); doc.setFontSize(6.5);
    const sLines = doc.splitTextToSize(eq.sistema, cellW - 2);
    doc.text(sLines, x, y + 42 + nameLines.length * 3.1);

    col++;
    if (col >= cols) { col = 0; y += cellH; }
  }

  pdfFooterAll(doc);
  return doc;
}
/** PDF de una sola página con el resumen ejecutivo, listo para reuniones con la gerencia. */
/** Hoja de vida de un equipo, en PDF — el resumen estructurado + el historial completo, para
 *  tener siempre a mano una referencia del equipo aunque haya pasado mucho tiempo. */
async function generateHojaVidaPdf(equipo, records, stats, partsChanged, fechaAlta) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Hoja de Vida del Equipo", [equipo.nombre, equipo.sistema]);

  y = pdfStatBoxes(doc, y, [
    { label: "Primer registro", value: fechaAlta ? fmtDT(fechaAlta).split(",")[0] : "—" },
    { label: "Mantenimientos", value: `${stats.total} (${stats.correctivos} correctivos)` },
    { label: "Costo acumulado", value: stats.costoTotal ? `$${stats.costoTotal.toLocaleString("es-CO")}` : "—", color: PDF_C.ink },
    { label: "Estado actual", value: stats.outOfService ? "Fuera de servicio" : "Funcionando", color: stats.outOfService ? PDF_C.red : PDF_C.green },
  ]);

  if (partsChanged.length > 0) {
    y = pdfSectionTitle(doc, y, "Piezas cambiadas");
    const uniqueParts = [...new Set(partsChanged.map(p => p.parte))].map(parte => partsChanged.find(p => p.parte === parte));
    y = pdfTable(doc, y, ["Pieza", "Última vez", "Descripción"],
      uniqueParts.map(p => [p.parte, fmtDT(p.fecha).split(",")[0], p.descripcion || "—"]));
  }

  y = pdfSectionTitle(doc, y, "Historial completo de mantenimientos");
  if (records.length === 0) {
    doc.setFontSize(9); doc.text("Sin mantenimientos registrados.", 14, y); y += 8;
  } else {
    y = pdfTable(doc, y, ["Fecha", "Tipo", "Descripción", "Costo", "Técnico"],
      records.map(r => [
        fmtDT(r.fecha).split(",")[0],
        MTTO_TIPOS.find(t => t.code === r.tipo)?.label || r.tipo,
        r.descripcion || "—",
        r.costo ? `$${Number(r.costo).toLocaleString("es-CO")}` : "—",
        r.tecnico || "—",
      ]));
  }

  pdfFooterAll(doc);
  return doc;
}

async function generateExecutivePdf(uptime, compliance, cost, generatedBy, compliancePrev, costPrev) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Panel Ejecutivo — Resumen del Mes", [fmtDT(nowIso()), `Generado por ${generatedBy || "—"}`]);

  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;
  const costDelta = costPrev ? cost.total - costPrev.total : null;
  y = pdfStatBoxes(doc, y, [
    { label: "Disponibilidad promedio", value: `${avgUptime}%`, color: avgUptime >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Cumplimiento rondas", value: `${compliance.ronda.pct}%${compliancePrev ? ` (antes ${compliancePrev.ronda.pct}%)` : ""}`, color: compliance.ronda.pct >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Costo mantenimiento", value: cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—", color: PDF_C.steelDark },
  ]);
  if (costDelta != null) {
    doc.setFontSize(8.5);
    doc.setTextColor(...(costDelta > 0 ? PDF_C.red : PDF_C.green));
    doc.text(`${costDelta > 0 ? "▲" : "▼"} ${Math.abs(costDelta).toLocaleString("es-CO")} vs. el mes pasado ($${(costPrev.total || 0).toLocaleString("es-CO")})`, 15, y);
    y += 6;
  }

  y = pdfSectionTitle(doc, y, "Disponibilidad de equipos por sistema");
  y = pdfTable(doc, y, ["Sistema", "Equipos", "Fuera de servicio", "Disponibilidad"],
    uptime.slice(0, 12).map(u => [u.sistema, String(u.total), String(u.fuera), `${u.pct}%`]));

  y = pdfSectionTitle(doc, y, "Cumplimiento de rondas este mes (vs. mes pasado)");
  y = pdfTable(doc, y, ["Tipo de ronda", "Hechas", "Esperadas", "Cumplimiento", "Mes pasado"], [
    ["Ronda de revisión", String(compliance.ronda.actual), String(compliance.ronda.expected), `${compliance.ronda.pct}%`, compliancePrev ? `${compliancePrev.ronda.pct}%` : "—"],
    ["Cuartos Fríos", String(compliance.cuartosFrios.actual), String(compliance.cuartosFrios.expected), `${compliance.cuartosFrios.pct}%`, compliancePrev ? `${compliancePrev.cuartosFrios.pct}%` : "—"],
    ["Lecturas de Medidores", String(compliance.medidores.actual), String(compliance.medidores.expected), `${compliance.medidores.pct}%`, compliancePrev ? `${compliancePrev.medidores.pct}%` : "—"],
  ]);

  if (cost.bySistema.length > 0) {
    y = pdfSectionTitle(doc, y, "Costo de mantenimiento por sistema (este mes)");
    pdfTable(doc, y, ["Sistema", "Costo acumulado"], cost.bySistema.slice(0, 10).map(([s, c]) => [s, `$${c.toLocaleString("es-CO")}`]));
  }

  pdfFooterAll(doc);
  return doc;
}

async function generateStockAlertsPdf(low, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Lista de Compras — Inventario", [`Generado ${fmtDT(nowIso())}`, `Por ${generatedBy || "—"}`]);
  y = pdfStatBoxes(doc, y, [{ label: "Repuestos por reponer", value: String(low.length), color: low.length ? PDF_C.red : PDF_C.green }]);
  y = pdfSectionTitle(doc, y, "Repuestos en o por debajo de su cantidad mínima", { color: PDF_C.red });
  if (low.length === 0) {
    doc.setFontSize(9); doc.text("No hay repuestos bajo el mínimo por ahora.", 14, y);
  } else {
    pdfTable(doc, y, ["Repuesto", "Bodega", "Estantería", "Actual", "Mínimo", "Unidad"],
      low.map(it => [it.name + (it.sku ? ` (${it.sku})` : ""), it.bodegaName, it.shelfCode, String(it.quantity), String(it.minThreshold), it.unit]),
      { headColor: PDF_C.red });
  }
  pdfFooterAll(doc);
  return doc;
}

async function sendStockAlertsEmailAuto(to, low, generatedBy) {
  try {
    const doc = await generateStockAlertsPdf(low, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lista de compras - Inventario (${todayStr()})`,
        text: `Hay ${low.length} repuesto(s) en o por debajo de su cantidad mínima. Ver el detalle en el PDF adjunto.`,
        pdfBase64,
        filename: `lista-de-compras-${todayStr().replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/* ============================================================
   PDF Y CORREO: HORARIO MENSUAL
   ============================================================ */
function fmtEntryShort(entry) {
  if (!entry) return "";
  if (entry.code) return entry.code;
  if (entry.entrada == null) return "";
  return `${entry.entrada}${entry.salida != null ? `-${entry.salida}` : ""}`;
}

async function generateSchedulePdf(monthLabel, employees, daysIso, entriesByEmployee, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });

  // Un mes completo (28-31 columnas de día) no cabe en una sola página ancha — por eso antes se
  // veía "cortado" a partir del día 15 o 16 (esas columnas quedaban dibujadas fuera del borde de
  // la hoja). La solución: partir el mes en dos quincenas, cada una en su propia tabla/página,
  // igual que ya venías acostumbrado a verlo en Excel.
  const midPoint = Math.ceil(daysIso.length / 2);
  const halves = [daysIso.slice(0, midPoint), daysIso.slice(midPoint)].filter(h => h.length > 0);

  const dayHeadLabel = (d) => {
    const dd = new Date(d + "T00:00:00");
    return `${String(dd.getDate()).padStart(2, "0")}${isSundayOrHoliday(d) ? "*" : ""}`;
  };
  const cargoColor = (cargo) => CARGO_PDF_COLORS[cargo] || PDF_C.gray;

  let y = pdfLetterhead(doc, "Horario Mensual", [monthLabel, `Generado por ${generatedBy || "—"}`]);

  halves.forEach((half, hi) => {
    if (hi > 0) {
      doc.addPage();
      const d0 = new Date(half[0] + "T00:00:00"), d1 = new Date(half[half.length - 1] + "T00:00:00");
      y = pdfLetterhead(doc, "Horario Mensual (continuación)", [monthLabel, `Del ${d0.getDate()} al ${d1.getDate()}`]);
    } else {
      const d0 = new Date(half[0] + "T00:00:00"), d1 = new Date(half[half.length - 1] + "T00:00:00");
      doc.setFontSize(8.5); doc.setTextColor(...PDF_C.gray);
      doc.text(`Primera quincena: del ${d0.getDate()} al ${d1.getDate()}`, 14, y); y += 5;
      doc.setTextColor(...PDF_C.ink);
    }

    const weeks = weeksInRange(half);
    const head = ["Empleado", ...half.map(dayHeadLabel), ...weeks.map((w, i) => `Sem${i + 1}`), "Total quinc."];

    const body = employees.map(emp => {
      const entries = entriesByEmployee[emp.id] || {};
      const weekTotals = weeks.map(w => weekTotalHours(w, entries));
      const halfTotal = weekTotals.reduce((a, b) => a + b, 0);
      const nameCell = emp.badge ? `${emp.name} (${emp.badge})` : emp.name;
      return [nameCell, ...half.map(d => fmtEntryShort(entries[d])), ...weekTotals.map(t => t || ""), halfTotal || ""];
    });

    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 40 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 0) {
          const emp = employees[data.row.index];
          if (emp?.cargo) data.cell.styles.textColor = hexToRgb(cargoColor(emp.cargo));
          return;
        }
        const raw = String(data.cell.raw || "");
        const colors = SPECIAL_CODE_COLORS[raw];
        if (colors) data.cell.styles.fillColor = hexToRgb(colors.bg);
      },
    });
  });

  // Resumen final: el total del mes completo por persona, en un solo lugar fácil de mirar.
  if (doc.lastAutoTable.finalY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 18; }
  else y = doc.lastAutoTable.finalY + 8;
  y = pdfSectionTitle(doc, y, "Resumen — total de horas del mes completo");
  const summaryBody = employees.map(emp => {
    const entries = entriesByEmployee[emp.id] || {};
    const monthTotal = weeksInRange(daysIso).reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
    return [emp.name, emp.cargo || "—", emp.badge || "—", `${monthTotal}h`];
  });
  pdfTable(doc, y, ["Empleado", "Cargo", "Nota", "Total del mes"], summaryBody, {
    columnStyles: { 0: { cellWidth: 55 }, 3: { cellWidth: 30 } },
  });

  doc.setFontSize(7.5); doc.setTextColor(...PDF_C.gray);
  const finalY = doc.lastAutoTable.finalY + 6;
  doc.text(`* Domingo o festivo. Las celdas muestran hora de entrada-salida (ej. 8.5-16.5). Objetivo semanal: ${WEEKLY_HOURS_TARGET}h. VAC = vacaciones · LIBRE = descanso · INC = incapacidad · ALT = alterno/cambio · LIC_PAT = licencia de paternidad · COMP = compensatorio (día ganado por horas de reducción).`, 14, finalY);
  doc.setTextColor(...PDF_C.ink);

  pdfFooterAll(doc);
  return doc;
}

async function sendScheduleEmailAuto(to, monthLabel, employees, daysIso, entriesByEmployee, generatedBy) {
  try {
    const doc = await generateSchedulePdf(monthLabel, employees, daysIso, entriesByEmployee, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Horario Mensual — ${monthLabel}`,
        text: `Horario mensual del personal — ${monthLabel}. Ver el detalle en el PDF adjunto.`,
        pdfBase64,
        filename: `horario-${monthLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}


/* ============================================================
   PDF Y CORREO: CUARTOS FRÍOS
   ============================================================ */
async function generateColdRoomsPdf(record, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Cuartos Fríos y Máquinas de Hielo", [`Turno ${record.shift}`, record.date, `Realizado por ${record.user}`]);
  y = pdfStatBoxes(doc, y, [
    { label: "Puntos revisados", value: String(record.itemCount) },
    { label: "Fuera de rango / servicio", value: String(record.damagedCount), color: record.damagedCount ? PDF_C.red : PDF_C.green },
  ]);

  const sections = [
    { title: `Cuartos fríos (${COLD_ROOMS.length})`, items: record.items.filter(it => it.section === "cuartos") },
    { title: `Máquinas de hielo A&B (${ICE_MACHINES_AB.length})`, items: record.items.filter(it => it.section === "hielo-ab") },
    { title: `Máquinas de hielo — Linos/Habitaciones (${ICE_MACHINES_LINOS.length})`, items: record.items.filter(it => it.section === "hielo-linos") },
  ];
  sections.forEach(sec => {
    if (sec.items.length === 0) return;
    if (y > pageH - 45) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, sec.title);
    const head = sec.title.startsWith("Cuartos") ? ["#", "Equipo", "Rango objetivo", "Lectura", "Observación"] : ["#", "Equipo", "Estado", "Observación"];
    const rows = sec.items.map(it => sec.title.startsWith("Cuartos")
      ? [it.code, it.name, it.hint || "—", it.valueStr + (it.damaged ? "  [FUERA DE RANGO]" : ""), it.observation || "—"]
      : [it.code || "—", it.name, it.valueStr + (it.damaged ? "  [FUERA DE SERVICIO]" : ""), it.observation || "—"]);
    y = pdfTable(doc, y, head, rows, { columnStyles: { 0: { cellWidth: 12 } } });
  });

  if (record.notes) {
    if (y > pageH - 30) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, "Observaciones generales");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(record.notes, 182);
    wrapped.forEach(w => { doc.text(w, 14, y); y += 4.6; });
    y += 4;
  }
  if (record.supervisor || record.ingeniero) {
    doc.setFontSize(8.5); doc.setTextColor(...PDF_C.gray);
    doc.text(`Supervisor: ${record.supervisor || "—"}     Ingeniero: ${record.ingeniero || "—"}`, 14, y);
    doc.setTextColor(...PDF_C.ink);
    y += 6;
  }
  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${record.user} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

async function sendColdRoomsEmailAuto(to, record, signatureDataUrl) {
  try {
    const doc = await generateColdRoomsPdf(record, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Cuartos Fríos - ${record.date} (Turno ${record.shift})`,
        text: `Ronda de Cuartos Fríos y Máquinas de Hielo — ${record.date}, turno ${record.shift}, realizada por ${record.user}. ${record.itemCount} puntos revisados, ${record.damagedCount} fuera de rango/servicio. Ver el detalle completo en el PDF adjunto.`,
        pdfBase64,
        filename: `cuartos-frios-${record.date.replace(/\//g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/** true si la fecha indicada es domingo (el último día de la semana lunes-domingo que usa la app). */
function isSundayOf(dateIso) { return new Date(dateIso).getDay() === 0; }

/** Arma la cuadrícula semanal de Cuartos Fríos y Máquinas de Hielo, igual que la de medidores. */
function buildColdRoomsWeekGrid(coldHistory, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const sections = [
    { title: `Cuartos fríos (${COLD_ROOMS.length})`, items: COLD_ROOMS },
    { title: `Máquinas de hielo A&B (${ICE_MACHINES_AB.length})`, items: ICE_MACHINES_AB },
    { title: `Máquinas de hielo — Linos/Habitaciones (${ICE_MACHINES_LINOS.length})`, items: ICE_MACHINES_LINOS },
  ];
  const rows = [];
  sections.forEach(sec => {
    sec.items.forEach(item => {
      const hist = coldHistory[item.id] || [];
      const cellFor = (entry) => {
        if (!entry) return null;
        if (item.k === "status") return entry.status || null;
        if (entry.value === undefined || entry.value === "") return null;
        return entry.value;
      };
      const valueOnDay = (day) => {
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
        let found = null;
        hist.forEach(h => { const hd = new Date(h.at); if (hd >= dayStart && hd <= dayEnd) found = h; });
        return found ? cellFor(found) : null;
      };
      rows.push({ groupTitle: sec.title, item, label: `${item.n}${item.c ? ` (#${item.c})` : ""}`, days: days.map(d => valueOnDay(d)) });
    });
  });
  return { days, rows };
}

async function generateColdRoomsWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Cuartos Fríos y Máquinas de Hielo — Semana", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  const head = ["Equipo", ...grid.days.map(d => fmtDayShort(d))];

  let currentGroup = null;
  let groupRows = [];
  const flushGroup = () => {
    if (!currentGroup || groupRows.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, currentGroup);
    const body = groupRows.map(r => [r.label, ...r.days.map(v => v ?? "—")]);
    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 80 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = data.column.index;
        if (col < 1) return;
        const row = groupRows[data.row.index];
        const val = row?.days?.[col - 1];
        if (row?.item?.k !== "status" && isColdRoomOutOfRange(row.item, val)) {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        } else if (row?.item?.k === "status" && val === "Fuera de servicio") {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  };
  grid.rows.forEach(row => {
    if (row.groupTitle !== currentGroup) { flushGroup(); currentGroup = row.groupTitle; groupRows = []; }
    groupRows.push(row);
  });
  flushGroup();

  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${generatedBy || "—"} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

async function sendColdRoomsWeekEmailAuto(to, grid, weekLabel, generatedBy, signatureDataUrl) {
  try {
    const doc = await generateColdRoomsWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Cuartos Fríos — Semana ${weekLabel}`,
        text: `Reporte semanal de Cuartos Fríos y Máquinas de Hielo: ${weekLabel}. Ver el detalle día por día en el PDF adjunto.`,
        pdfBase64,
        filename: `cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}


/** Arma la cuadrícula semanal: para cada medidor (y cada sub-lectura si tiene varias),
 *  busca en el historial la última lectura de CADA día de la semana, más la última
 *  lectura anterior al inicio de la semana (para poder comparar y seguir la secuencia). */
function buildMeterWeekGrid(meterHistory, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const beforeCutoff = new Date(weekStart.getTime() - 1);

  const rows = [];
  METER_GROUPS.forEach(group => {
    group.meters.forEach(meter => {
      const subs = meter.subs || [null];
      const hist = meterHistory[meter.id] || [];
      subs.forEach(sub => {
        const valueOnOrBefore = (limit) => {
          let best = null;
          hist.forEach(h => {
            const hd = new Date(h.at);
            const v = sub ? h[sub] : h.value;
            if (hd <= limit && v !== undefined && v !== "" && (!best || hd > best.date)) best = { date: hd, value: v };
          });
          return best ? best.value : null;
        };
        const valueOnDay = (day) => {
          const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
          let found = null;
          hist.forEach(h => {
            const hd = new Date(h.at);
            const v = sub ? h[sub] : h.value;
            if (hd >= dayStart && hd <= dayEnd && v !== undefined && v !== "") found = v;
          });
          return found;
        };
        rows.push({
          groupTitle: group.title,
          label: sub ? `${meter.n} — ${sub}` : meter.n,
          unit: meter.u,
          before: valueOnOrBefore(beforeCutoff),
          days: days.map(d => valueOnDay(d)),
        });
      });
    });
  });
  // Calcula el consumo de cada día (valor de ese día menos el último valor disponible antes de ese día),
  // para poder resaltar en rojo los días donde el consumo salió negativo (probable error de lectura).
  rows.forEach(row => {
    const all = [row.before, ...row.days];
    row.daysConsumo = row.days.map((v, i) => {
      if (v === null || v === undefined) return null;
      const prevVal = all[i]; // el valor justo antes de este día en la secuencia (before o el día anterior)
      if (prevVal === null || prevVal === undefined) return null;
      return Number(v) - Number(prevVal);
    });
  });
  return { days, rows };
}

async function generateMetersWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageH = doc.internal.pageSize.getHeight();

  let y = pdfLetterhead(doc, "Lecturas de Medidores — Semana", [weekLabel, `Generado por ${generatedBy || "—"}`]);
  const head = ["Medidor", "Antes", ...grid.days.map(d => fmtDayShort(d))];

  let currentGroup = null;
  let groupRows = [];
  const flushGroup = () => {
    if (!currentGroup || groupRows.length === 0) return;
    if (y > pageH - 40) { doc.addPage(); y = 18; }
    y = pdfSectionTitle(doc, y, currentGroup);
    const body = groupRows.map(r => [r.label + (r.unit ? ` (${r.unit})` : ""), r.before ?? "—", ...r.days.map(v => v ?? "—")]);
    y = pdfTable(doc, y, head, body, {
      columnStyles: { 0: { cellWidth: 70 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = data.column.index;
        if (col < 2) return; // "Medidor" y "Antes" no se resaltan
        const row = groupRows[data.row.index];
        if (row?.daysConsumo?.[col - 2] < 0) {
          data.cell.styles.fillColor = PDF_C.red;
          data.cell.styles.textColor = PDF_C.white;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  };

  grid.rows.forEach(row => {
    if (row.groupTitle !== currentGroup) {
      flushGroup();
      currentGroup = row.groupTitle;
      groupRows = [];
    }
    groupRows.push(row);
  });
  flushGroup();

  y = pdfSignatureBlock(doc, y, pageH, signatureDataUrl, `${generatedBy || "—"} — ${fmtDT(nowIso())}`);

  pdfFooterAll(doc);
  return doc;
}

async function sendMetersWeekEmailAuto(to, grid, weekLabel, generatedBy, signatureDataUrl) {
  try {
    const doc = await generateMetersWeekPdf(grid, weekLabel, generatedBy, signatureDataUrl);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lecturas de Medidores — ${weekLabel}`,
        text: `Lecturas de medidores de la semana: ${weekLabel}. Ver el detalle completo (todos los medidores, día por día) en el PDF adjunto.`,
        pdfBase64,
        filename: `lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el PDF automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

/** Convierte un ArrayBuffer/Uint8Array en base64 puro, para mandarlo al backend de correo. */
function bufferToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Arma el archivo Excel del historial semanal de medidores (una hoja por grupo), listo para tomar datos. */
function buildMetersWeekWorkbook(grid, weekLabel) {
  const wb = XLSX.utils.book_new();
  const groups = [...new Set(grid.rows.map(r => r.groupTitle))];
  groups.forEach(groupTitle => {
    const rows = grid.rows.filter(r => r.groupTitle === groupTitle);
    const header = ["Medidor", "Unidad", "Antes", ...grid.days.map(d => fmtDayShort(d))];
    const data = rows.map(r => [r.label, r.unit || "", r.before ?? "", ...r.days.map(v => v ?? "")]);
    const ws = XLSX.utils.aoa_to_sheet([[weekLabel], header, ...data]);
    ws["!cols"] = [{ wch: 42 }, { wch: 8 }, { wch: 10 }, ...grid.days.map(() => ({ wch: 10 }))];
    const safeName = groupTitle.replace(/[\\/*?:\[\]]/g, "").slice(0, 31) || "Medidores";
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  return wb;
}

function generateMetersWeekExcelBase64(grid, weekLabel) {
  const wb = buildMetersWeekWorkbook(grid, weekLabel);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return bufferToBase64(out);
}

async function sendMetersWeekExcelEmailAuto(to, grid, weekLabel) {
  try {
    const base64 = generateMetersWeekExcelBase64(grid, weekLabel);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        to,
        subject: `Lecturas de Medidores (Excel) — ${weekLabel}`,
        text: `Lecturas de medidores de la semana: ${weekLabel}, en Excel para trabajar los datos directamente. Ver el archivo adjunto.`,
        attachmentBase64: base64,
        filename: `lecturas-medidores-${weekLabel.replace(/[\s\/]+/g, "-")}.xlsx`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, message: data?.message || "El servidor rechazó el envío." };
    return data;
  } catch (e) {
    return { ok: false, message: "No se pudo generar o enviar el Excel automáticamente. Revisa la conexión e intenta de nuevo." };
  }
}

function EquipmentAnalyticsView({ issueHistory, activeIssues, reportEmail, onLogSent, currentUser }) {
  const [expanded, setExpanded] = useState(null);
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  // ===== Filtros estandarizados (mismo patrón que Análisis de Mantenimiento / Panel Ejecutivo) =====
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [filterTecnico, setFilterTecnico] = useState("");

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const turnoOf = (fecha) => {
    const h = new Date(fecha).getHours();
    if (h >= 6 && h < 14) return "Mañana";
    if (h >= 14 && h < 22) return "Tarde";
    return "Noche";
  };
  const tecnicos = useMemo(() => [...new Set(issueHistory.map(h => h.resolvedBy).filter(Boolean))].sort(), [issueHistory]);
  const hasActiveFilters = dateFrom || dateTo || filterTurno || filterTecnico;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setFilterTurno(""); setFilterTecnico(""); };

  const setQuickRange = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setDateFrom(localDateIso(d));
    setDateTo("");
  };

  const sinceDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const untilDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

  const filteredIssueHistory = useMemo(() => {
    return issueHistory.filter(h => {
      const d = new Date(h.openedAt);
      if (sinceDate && d < sinceDate) return false;
      if (untilDate && d > untilDate) return false;
      if (filterTurno && turnoOf(h.openedAt) !== filterTurno) return false;
      if (filterTecnico && h.resolvedBy !== filterTecnico) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueHistory, dateFrom, dateTo, filterTurno, filterTecnico]);

  const filteredActiveIssues = useMemo(() => {
    const entries = Object.entries(activeIssues || {}).filter(([, a]) => {
      const d = new Date(a.openedAt);
      if (sinceDate && d < sinceDate) return false;
      if (untilDate && d > untilDate) return false;
      if (filterTurno && turnoOf(a.openedAt) !== filterTurno) return false;
      if (filterTecnico) return false; // aún no resuelta -> no tiene "resuelto por" con quien comparar
      return true;
    });
    return Object.fromEntries(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIssues, dateFrom, dateTo, filterTurno, filterTecnico]);

  const stats = useMemo(() => computeEquipmentStats(filteredIssueHistory, filteredActiveIssues, null), [filteredIssueHistory, filteredActiveIssues]);

  const byDowntime = stats.slice(0, 10).map(e => ({ label: `${e.name} (${e.floorName})`, hours: Math.round(e.totalHours * 10) / 10 }));
  const byFrequencySorted = [...stats].sort((a, b) => b.incidents.length - a.incidents.length).slice(0, 10);
  const byFrequencyTotalAll = stats.reduce((s, e) => s + e.incidents.length, 0);
  let cumIncidents = 0;
  const byFrequency = byFrequencySorted.map(e => {
    cumIncidents += e.incidents.length;
    return { label: `${e.name} (${e.floorName})`, incidentes: e.incidents.length, cumPct: byFrequencyTotalAll ? (cumIncidents / byFrequencyTotalAll) * 100 : 0 };
  });

  const totalCurrentlyDown = stats.filter(e => e.currentlyDown).length;
  const totalIncidents = stats.reduce((a, e) => a + e.incidents.length, 0);
  const longestActive = stats.filter(e => e.currentlyDown).sort((a, b) => b.totalHours - a.totalHours)[0];
  const topIncidencia = byFrequencySorted[0];

  // "Fallas críticas": incidentes (resueltos o activos) que duraron/llevan más de 24h fuera de servicio.
  const fallasCriticas = stats.reduce((s, e) => s + e.incidents.filter(inc => inc.hours > 24).length, 0);

  // "Tiempo promedio de diagnóstico" (MTTR): promedio de horas de los incidentes ya resueltos en el período.
  const resolvedIncidents = stats.flatMap(e => e.incidents).filter(inc => !inc.ongoing);
  const mttr = resolvedIncidents.length ? resolvedIncidents.reduce((s, inc) => s + inc.hours, 0) / resolvedIncidents.length : null;

  const rangeLabel = hasActiveFilters
    ? `${dateFrom || "inicio"} – ${dateTo || "hoy"}${filterTurno ? ` · ${filterTurno}` : ""}${filterTecnico ? ` · ${filterTecnico}` : ""}`
    : "Todo el historial";
  const summary = { totalCurrentlyDown, totalIncidents };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateAnalyticsPdf(stats, rangeLabel, summary, currentUser);
      doc.save(`analisis-fallas-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch {
      setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión a internet)." });
    }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendAnalyticsEmailAuto(emailTo.trim(), stats, rangeLabel, summary, currentUser);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Análisis de fallas (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
  };

  const filterSelectClass = "text-sm border rounded-md px-2 py-1.5 outline-none";
  const filterSelectStyle = { borderColor: C.line, background: C.panel, color: C.ink };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Análisis de fallas</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Cuánto tiempo y con qué frecuencia ha estado cada equipo fuera de servicio, para darle seguimiento a los que fallan seguido.
      </p>

      {/* Filtros globales */}
      <div className="rounded-xl border p-3 mb-4 flex items-end gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Desde</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Hasta</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterSelectClass} style={filterSelectStyle} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Turno</div>
          <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>Técnico</div>
          <select value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)} className={filterSelectClass} style={filterSelectStyle}>
            <option value="">Todos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          {[30, 90, 365].map(d => (
            <button key={d} onClick={() => setQuickRange(d)} className="text-xs font-medium px-2 py-1.5 rounded-md" style={{ background: C.bg, color: C.inkSoft }}>
              {d}d
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ color: C.red }}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Fallas críticas (>24h)" value={fallasCriticas} valueColor={fallasCriticas ? C.red : C.ink}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: fallasCriticas ? C.redSoft : C.greenSoft }}><AlertTriangle size={18} color={fallasCriticas ? C.red : C.green} /></div>} />
        <StatCard label="Tiempo prom. de diagnóstico" value={mttr != null ? fmtHours(mttr) : "—"}
          leading={<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.amberSoft }}><Clock size={18} color={C.amber} /></div>} />
        <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.gray }}>Mayor incidencia</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueSoft }}><TrendingUp size={18} color={C.blue} /></div>
            <div className="text-sm font-bold leading-tight" style={{ color: C.ink }}>
              {topIncidencia ? `${topIncidencia.name} · ${topIncidencia.incidents.length} fallas` : "Ninguna"}
            </div>
          </div>
        </div>
        <StatCard label="Estado actual de reparaciones" value={totalCurrentlyDown ? `${totalCurrentlyDown} activas` : "Al día"} valueColor={totalCurrentlyDown ? C.red : C.green}
          leading={
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: totalCurrentlyDown ? C.redSoft : C.greenSoft }}>
              {totalCurrentlyDown ? <AlertTriangle size={18} color={C.red} /> : <CheckCircle2 size={18} color={C.green} />}
            </div>
          } />
      </div>

      <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF de este reporte ({rangeLabel})</div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadPdf}>
            {downloading ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSendEmail}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
      </div>

      {stats.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          {hasActiveFilters ? "No hay incidentes que coincidan con estos filtros." : "No hay incidentes registrados en este período."}
        </p>
      ) : (
        <>
          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Tiempo total fuera de servicio (horas)</div>
            <HorizontalBarChart data={byDowntime} labelKey="label" valueKey="hours" colorFor={() => C.red} gradient formatValue={v => `${v} h`} />
          </div>

          <div className="rounded-xl border p-5 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Equipos que más veces han fallado — orden de Pareto</div>
            <div className="text-xs mb-3" style={{ color: C.gray }}>Ordenados de mayor a menor, con el % acumulado — para ver de un vistazo dónde enfocar el mantenimiento correctivo.</div>
            <HorizontalBarChart data={byFrequency} labelKey="label" valueKey="incidentes" colorFor={() => C.amber} gradient
              formatValue={(v, d) => `${v} · ${d.cumPct.toFixed(1)}% acum.`} />
          </div>

          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Detalle por equipo</div>
            {stats.map(eq => (
              <div key={eq.equipmentId} className="border-b last:border-0 py-2" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                <button onClick={() => setExpanded(expanded === eq.equipmentId ? null : eq.equipmentId)}
                  className="w-full flex items-center justify-between text-left">
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>
                      {eq.name} <span style={{ color: C.gray, fontWeight: 400 }}>· {eq.floorName}</span>
                      {eq.currentlyDown && <span className="ml-2 inline-block"><Pill tone="red">Fuera de servicio</Pill></span>}
                    </div>
                    <div className="text-xs" style={{ color: C.gray }}>
                      {eq.incidents.length} incidente{eq.incidents.length !== 1 ? "s" : ""} · {fmtHours(eq.totalHours)} acumuladas
                    </div>
                  </div>
                  {expanded === eq.equipmentId ? <ChevronDown size={16} style={{ color: C.gray }} /> : <ChevronRight size={16} style={{ color: C.gray }} />}
                </button>
                {expanded === eq.equipmentId && (
                  <div className="mt-2 pl-1">
                    {eq.incidents.map((inc, i) => (
                      <div key={i} className="text-xs py-1.5 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                        <div style={{ color: C.ink }}>
                          Desde {fmtDT(inc.from)} — {inc.ongoing ? <b style={{ color: C.red }}>sigue fuera de servicio</b> : `hasta ${fmtDT(inc.to)}`}
                          <span style={{ color: C.gray }}> · {fmtHours(inc.hours)}</span>
                        </div>
                        {inc.solution && <div style={{ color: C.gray }}>Solución: {inc.solution} (por {inc.resolvedBy})</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: PANEL DE ADMINISTRADOR
   ============================================================ */
/* ============================================================
   VISTA: PAPELERA
   ============================================================ */
const TRASH_TYPE_LABELS = { task: "Tarea", account: "Usuario", employee: "Empleado", mttoEquipo: "Equipo de mantenimiento", bodega: "Bodega", shelf: "Estantería" };
function TrashView({ trash, onRestore, onPurge }) {
  const sorted = [...trash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Papelera</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Lo que se ha borrado queda aquí, por si fue un error — puedes restaurarlo o eliminarlo para siempre.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>La papelera está vacía.</p>
      ) : sorted.map(t => (
        <div key={t.id} className="rounded-lg border p-3 mb-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
          <div>
            <div className="text-sm font-medium" style={{ color: C.ink }}>{t.label}</div>
            <div className="text-xs" style={{ color: C.gray }}>
              {TRASH_TYPE_LABELS[t.tipo] || t.tipo} · Borrado por {t.deletedBy} · {fmtDT(t.deletedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onRestore(t.id)}>Restaurar</Button>
            <Button size="sm" variant="red" onClick={() => onPurge(t.id)}>Eliminar definitivamente</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BackupButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const doExport = async () => {
    setBusy(true); setMsg(null);
    try {
      const rows = await exportFullBackup();
      const backup = { exportedAt: nowIso(), keyCount: rows.length, data: {} };
      rows.forEach(r => { backup.data[r.key] = r.value; });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-pisos-mecanicos-${todayStr().replace(/\//g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: `✓ Respaldo descargado (${rows.length} secciones de datos).` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || "No se pudo generar el respaldo." });
    }
    setBusy(false);
  };

  return (
    <div>
      <Button size="sm" icon={Download} disabled={busy} onClick={doExport}>{busy ? "Generando…" : "Descargar respaldo completo"}</Button>
      {msg && <div className="text-xs mt-2 font-medium" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
    </div>
  );
}

function AdminView({ accounts, reportEmail, reportWhatsapp, onSaveEmail, onSaveWhatsapp, onToggleAdmin, onToggleAlmacenista, onToggleGerencia, onDeleteAccount, onResetPassword, onApproveAccount, onRejectAccount, loginLog, currentUsername, aiUsageStats }) {
  const [email, setEmail] = useState(reportEmail || "");
  const [saved, setSaved] = useState(false);
  const [wa, setWa] = useState(reportWhatsapp || "");
  const [waSaved, setWaSaved] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const list = Object.entries(accounts).sort((a, b) => (a[1].created_at || "").localeCompare(b[1].created_at || ""));
  const adminCount = list.filter(([, a]) => a.is_admin).length;
  const pending = list.filter(([, a]) => a.approved === false);

  const doReset = async (uid) => {
    if (!newPw || newPw.length < 4) { setResetMsg("La contraseña debe tener al menos 4 caracteres."); return; }
    await onResetPassword(uid, newPw);
    setResetMsg(`✓ Contraseña de "${accounts[uid]?.display_name || accounts[uid]?.email || uid}" actualizada. Avísale la nueva contraseña.`);
    setNewPw("");
    setTimeout(() => { setResettingUser(null); setResetMsg(""); }, 2500);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Panel de administrador</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Configura el correo y WhatsApp para el envío de informes, y administra los usuarios del sistema.</p>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.amber, background: C.amberSoft }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#7a5405" }}>Respaldo completo</div>
        <p className="text-xs mb-2" style={{ color: "#7a5405" }}>
          Descarga TODA la información de la app (rondas, inventario, mantenimiento, horarios, todo) en un solo archivo,
          como copia de seguridad propia — aparte de lo que ya guarda Supabase.
        </p>
        <BackupButton />
      </div>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={15} color={C.amber} />
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Salud de la app — uso de IA</div>
        </div>
        <p className="text-xs mb-3" style={{ color: C.gray }}>
          Un conteo aproximado de este dispositivo/sesión hacia adelante — no es el número exacto de Google, pero te
          da una idea de cuánto se está usando. Para el número real y el límite de tu cuenta de Gemini, entra a{" "}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline" style={{ color: C.amber }}>aistudio.google.com</a> → tu cuenta → Usage & billing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Fotos de medidores leídas", value: aiUsageStats?.meterReadings || 0 },
            { label: "Horarios generados", value: aiUsageStats?.scheduleGenerations || 0 },
            { label: "Resúmenes semanales", value: aiUsageStats?.weeklySummaries || 0 },
            { label: "Notas de reorden", value: aiUsageStats?.reorderNotes || 0 },
          ].map(s => (
            <div key={s.label} className="rounded-md p-2 text-center" style={{ background: C.bg }}>
              <div className="text-lg font-semibold" style={{ color: C.ink }}>{s.value}</div>
              <div className="text-[10px]" style={{ color: C.gray }}>{s.label}</div>
            </div>
          ))}
        </div>
        {aiUsageStats?.lastUpdated && <div className="text-[10px] mt-2" style={{ color: C.gray }}>Última actividad: {fmtDT(aiUsageStats.lastUpdated)}</div>}
      </div>

      {pending.length > 0 && (
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.red, background: C.redSoft }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.red }}>
            {pending.length} cuenta{pending.length !== 1 ? "s" : ""} esperando aprobación
          </div>
          {pending.map(([uid, acc]) => (
            <div key={uid} className="flex items-center justify-between gap-2 py-1.5 flex-wrap">
              <div className="text-sm" style={{ color: C.ink }}>{acc.display_name || acc.email} <span style={{ color: C.gray }}>({acc.email})</span></div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => onApproveAccount(uid)}>Aprobar</Button>
                <Button size="sm" variant="red" onClick={() => onRejectAccount(uid)}>Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Correo para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => { setEmail(e.target.value); setSaved(false); }} placeholder="correo@hotel.com"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 220 }} />
          <Button onClick={() => { onSaveEmail(email.trim()); setSaved(true); }}>Guardar</Button>
        </div>
        {saved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Correo guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Este correo se usará por defecto al enviar informes desde la sección Reportes (cualquier usuario puede cambiarlo al momento de enviar).</div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Número de WhatsApp para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={wa} onChange={e => { setWa(e.target.value); setWaSaved(false); }} placeholder="573001234567 (con indicativo de país, sin + ni espacios)"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 220 }} />
          <Button onClick={() => { onSaveWhatsapp(wa.trim()); setWaSaved(true); }}>Guardar</Button>
        </div>
        {waSaved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Número guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Al enviar por WhatsApp se abre una conversación con el informe ya escrito; el usuario debe darle enviar manualmente (no hay envío automático real sin una integración de WhatsApp Business).</div>
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Usuarios ({list.length})</div>
        {list.map(([uid, acc]) => (
          <div key={uid} className="py-2 border-b last:border-0" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>
                  {acc.display_name || acc.email} {uid === currentUsername && <span className="text-xs" style={{ color: C.gray }}>(tú)</span>}
                </div>
                <div className="text-xs" style={{ color: C.gray }}>{acc.email}</div>
                <div className="text-xs" style={{ color: C.gray }}>Creado: {fmtDT(acc.created_at)}</div>
                <div className="text-xs" style={{ color: C.gray }}>
                  {(() => {
                    const entries = (loginLog || []).filter(l => l.userId === uid);
                    if (entries.length === 0) return "Nunca ha entrado";
                    return `Último ingreso: ${fmtDT(entries[0].at)} · ${entries.length} ingreso${entries.length !== 1 ? "s" : ""} en total`;
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {acc.is_admin ? <Pill tone="amber">Administrador</Pill> : <Pill tone="gray">Operador</Pill>}
                {acc.is_almacenista && <Pill tone="blue">Almacenista</Pill>}
                {acc.is_gerencia && <Pill tone="green">Gerencia</Pill>}
                <Button size="sm" variant="ghost" onClick={() => { setResettingUser(resettingUser === uid ? null : uid); setNewPw(""); setResetMsg(""); }}>
                  Restablecer contraseña
                </Button>
                <Button size="sm" variant="ghost" disabled={acc.is_admin && adminCount === 1} onClick={() => onToggleAdmin(uid)}>
                  {acc.is_admin ? "Quitar admin" : "Hacer admin"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onToggleAlmacenista(uid)}>
                  {acc.is_almacenista ? "Quitar almacenista" : "Hacer almacenista"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onToggleGerencia(uid)}>
                  {acc.is_gerencia ? "Quitar gerencia" : "Hacer gerencia (solo consulta)"}
                </Button>
                <Button size="sm" variant="red" disabled={uid === currentUsername} onClick={() => onDeleteAccount(uid)}>Eliminar</Button>
              </div>
            </div>
            {resettingUser === uid && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <input value={newPw} onChange={e => setNewPw(e.target.value)} type="text" placeholder="Nueva contraseña (mínimo 4 caracteres)"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink, minWidth: 220 }}
                  onKeyDown={e => { if (e.key === "Enter") doReset(uid); }} />
                <Button size="sm" onClick={() => doReset(uid)}>Guardar nueva contraseña</Button>
                {resetMsg && <span className="text-xs" style={{ color: resetMsg.startsWith("✓") ? C.green : C.red }}>{resetMsg}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [profiles, setProfiles] = useState({}); // { [id de Supabase Auth]: { display_name, is_admin, is_almacenista, is_gerencia, approved, created_at, email } }
  const [currentUser, setCurrentUser] = useState(null); // id de Supabase Auth (uuid), o null
  const [authReady, setAuthReady] = useState(false); // true una vez ya se revisó si había sesión guardada
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Qué categorías del menú lateral se dejaron abiertas a mano (ver NAV_GROUPS más abajo). Este
  // hook TIENE que estar aquí arriba, antes de cualquier "return" condicional del componente —
  // si un hook se ejecuta unas veces sí y otras no (según si ya cargó, si hay sesión, etc.),
  // React se confunde sobre cuántos hooks hay y la app se cae con un error críptico.
  const [manuallyToggled, setManuallyToggled] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pm-local:nav-groups-open") || "{}"); } catch { return {}; }
  });
  const [reportEmail, setReportEmail] = useState("");
  const [reportWhatsapp, setReportWhatsapp] = useState("");
  const [sentReports, setSentReports] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [shift, setShift] = useState(SHIFTS[0]);
  const [view, setViewRaw] = useState(() => localStorage.getItem("pm-local:last-view") || "ronda");
  const setView = useCallback((v) => {
    setViewRaw(v);
    try { localStorage.setItem("pm-local:last-view", v); } catch { /* noop */ }
  }, []);
  const [nowClock, setNowClock] = useState(() => new Date());
  // Detecta cuándo hay una versión nueva de la app lista para usar (así no hace falta borrar
  // e instalar de nuevo cada vez que se sube una actualización) — revisa cada 30 min mientras
  // está abierta, y también apenas se vuelve a abrir el celular con la app en la pantalla.
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(() => { registration.update().catch(() => {}); }, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    },
  });

  const [themeOverride, setThemeOverride] = useState(() => { try { return localStorage.getItem("pm-local:theme"); } catch { return null; } }); // "dark" | "light" | null = automático
  const [darkMode, setDarkMode] = useState(() => themeOverride === "dark" ? true : themeOverride === "light" ? false : isNightHour());
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("pm-local:onboarded"); } catch { return false; } });
  const [showQrScanner, setShowQrScanner] = useState(false);
  const closeOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("pm-local:onboarded", "1"); } catch { /* noop */ }
  };
  const toggleTheme = () => {
    const next = !darkMode;
    applyTheme(next); // muta el objeto C compartido ANTES de redibujar, para que no haya parpadeo
    setDarkMode(next);
    setThemeOverride(next ? "dark" : "light"); // a partir de aquí ya no sigue la hora sola — quedó fijo
    try { localStorage.setItem("pm-local:theme", next ? "dark" : "light"); } catch { /* noop */ }
  };
  // Mientras nadie haya fijado el modo a mano, revisa la hora cada vez que el reloj de la app se
  // refresca (cada 30s) y cambia solo de claro a oscuro al anochecer, y de vuelta al amanecer.
  useEffect(() => {
    if (themeOverride) return;
    const shouldBeDark = isNightHour(nowClock);
    if (shouldBeDark !== darkMode) { applyTheme(shouldBeDark); setDarkMode(shouldBeDark); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowClock, themeOverride]);
  useEffect(() => {
    const id = setInterval(() => setNowClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const [pendingSync, setPendingSync] = useState(() => getPendingCount());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  const [justSynced, setJustSynced] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const tryFlush = useCallback(async () => {
    const res = await flushOfflineQueue();
    const remaining = getPendingCount();
    setPendingSync(remaining);
    if (res.synced > 0 && remaining === 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
    return res;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await tryFlush(); };
    run(); // por si quedó algo pendiente de una sesión anterior sin señal
    window.addEventListener("online", run);
    const onQueueChanged = () => setPendingSync(getPendingCount());
    window.addEventListener("pm-queue-changed", onQueueChanged);
    const id = setInterval(run, 20000); // reintento silencioso, por si "online" no se dispara bien
    return () => { cancelled = true; window.removeEventListener("online", run); window.removeEventListener("pm-queue-changed", onQueueChanged); clearInterval(id); };
  }, [tryFlush]);

  // ---- Cola de registros con fotos pendientes (ej. mantenimientos guardados sin señal) ----
  const [pendingPhotoRecords, setPendingPhotoRecords] = useState(() => getPendingPhotoRecordsCount());
  const [justSyncedPhotos, setJustSyncedPhotos] = useState(false);
  const tryFlushPhotos = useCallback(async () => {
    const res = await flushPhotoRecordQueue({
      maintenance: async (payload, urls) => { await logMaintenance(payload.equipoId, { ...payload, fotos: urls }); },
    });
    const remaining = getPendingPhotoRecordsCount();
    setPendingPhotoRecords(remaining);
    if (res.synced > 0 && remaining === 0) {
      setJustSyncedPhotos(true);
      setTimeout(() => setJustSyncedPhotos(false), 4000);
    }
    return res;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await tryFlushPhotos(); };
    run(); // por si quedó algo pendiente de una sesión anterior sin señal
    window.addEventListener("online", run);
    const onPhotoQueueChanged = () => setPendingPhotoRecords(getPendingPhotoRecordsCount());
    window.addEventListener("pm-photo-queue-changed", onPhotoQueueChanged);
    const id = setInterval(run, 20000);
    return () => { cancelled = true; window.removeEventListener("online", run); window.removeEventListener("pm-photo-queue-changed", onPhotoQueueChanged); clearInterval(id); };
  }, [tryFlushPhotos]);
  const [floorId, setFloorIdRaw] = useState(() => {
    try {
      const saved = localStorage.getItem("pm-local:last-floor");
      return saved && FLOORS.some(f => f.id === saved) ? saved : FLOORS[0].id;
    } catch { return FLOORS[0].id; }
  });
  const setFloorId = useCallback((id) => {
    setFloorIdRaw(id);
    try { localStorage.setItem("pm-local:last-floor", id); } catch { /* noop */ }
  }, []);
  const [activeIssues, setActiveIssues] = useState({});
  const [issueHistory, setIssueHistory] = useState([]);
  const [roundsIndex, setRoundsIndex] = useState([]);
  const [latestValues, setLatestValues] = useState({});
  const [tankHistory, setTankHistory] = useState({});
  const [fuelHistory, setFuelHistory] = useState({});
  const [latestColdValues, setLatestColdValues] = useState({});
  const [coldRoundsIndex, setColdRoundsIndex] = useState([]);
  const [lastColdRound, setLastColdRound] = useState(null);
  const [coldHistory, setColdHistory] = useState({});
  const [latestMeterValues, setLatestMeterValues] = useState({});
  const [meterHistory, setMeterHistory] = useState({});
  const [meterRoundsIndex, setMeterRoundsIndex] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [invMovements, setInvMovements] = useState([]);
  const [pendingShelfId, setPendingShelfId] = useState(() => new URLSearchParams(window.location.search).get("shelf"));
  const [pendingEquipoId, setPendingEquipoId] = useState(() => new URLSearchParams(window.location.search).get("equipo"));
  const [mttoEquipos, setMttoEquipos] = useState([]);
  const [latestLavanderiaValues, setLatestLavanderiaValues] = useState({});
  const [lavanderiaRoundsIndex, setLavanderiaRoundsIndex] = useState([]);
  const [latestGymValues, setLatestGymValues] = useState({});
  const [gymRoundsIndex, setGymRoundsIndex] = useState([]);
  const [calderaRoundsIndex, setCalderaRoundsIndex] = useState([]);
  const [lastCalderaRound, setLastCalderaRound] = useState(null);
  const [pushSubscriptions, setPushSubscriptions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loginLog, setLoginLog] = useState([]);
  const [mttoLog, setMttoLog] = useState([]);
  const [mttoCronograma, setMttoCronograma] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState({});
  const [scheduleEditLog, setScheduleEditLog] = useState([]);
  const [generalEditLog, setGeneralEditLog] = useState([]);
  const [changelogEntries, setChangelogEntries] = useState([]);
  const [aiUsageStats, setAiUsageStats] = useState(null);
  // Se carga cada vez que se entra al Panel de administrador (no en el arranque general) porque
  // bumpAiUsage escribe directo a la base de datos por fuera del estado de React — así siempre se
  // ve el número más reciente al abrir el panel, sin tener que refrescar toda la app.
  useEffect(() => {
    if (view !== "admin") return;
    (async () => { try { setAiUsageStats((await sGet("ai-usage-stats", true)) || {}); } catch { /* noop */ } })();
  }, [view]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastTour, setLastTour] = useState(null);
  const [tourHistory, setTourHistory] = useState([]);
  const [justFinished, setJustFinished] = useState(false);
  const [roundSaveMsg, setRoundSaveMsg] = useState(null); // aviso si intentan "cerrar" el recorrido sin haber pasado por todos los pisos
  const [autoSendResult, setAutoSendResult] = useState(null);
  const tourBufferRef = useRef((() => {
    // Si el recorrido se interrumpió a mitad de camino (se cerró la sesión sola, se recargó la
    // página sin querer, etc.), esto lo recupera — así no toca empezar de cero ni se pierde la
    // entrega de turno por un corte que no tuvo nada que ver con lo que ya se había guardado.
    try {
      const saved = localStorage.getItem("pm-local:tour-buffer");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      return parsed.date === todayStr() && parsed.shift === shift ? parsed.buffer : {};
    } catch { return {}; }
  })()); // acumula lo guardado piso por piso durante el recorrido en curso
  // Van de la mano con tourBufferRef, pero SÍ disparan un re-render (un useRef solo no lo hace) —
  // para poder mostrar en pantalla "X de 11 pisos" y el aviso de "recorrido en curso, sigues donde ibas".
  const [tourProgressCount, setTourProgressCount] = useState(() => Object.keys(tourBufferRef.current).length);
  const [resumedTour, setResumedTour] = useState(() => Object.keys(tourBufferRef.current).length > 0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ai, ih, ri, lv, th, email, sr, wa, lt, thist, lcv, cri, lmv, mh, mri, lcr, ch, bod, shv, iit, imv, emp, sch, mte, mtl, mtc, llv, lri, lgv, gri, cari, lcar, psub, tsk, trs, llog, schLog, chgl, gel, fh] = await Promise.all([
        sGet("active-issues", true),
        sGet("issue-history", true), sGet("rounds-index", true), sGet("latest-values", true),
        sGet("tank-history", true), sGet("report-email", true), sGet("sent-reports", true),
        sGet("report-whatsapp", true), sGet("last-tour", true), sGet("tour-history", true),
        sGet("latest-cold-values", true), sGet("cold-rounds-index", true),
        sGet("latest-meter-values", true), sGet("meter-history", true), sGet("meter-rounds-index", true),
        sGet("last-cold-round", true), sGet("cold-history", true),
        sGet("inventory-bodegas", true), sGet("inventory-shelves", true),
        sGet("inventory-items", true), sGet("inventory-movements", true),
        sGet("employees", true), sGet("schedule-entries", true),
        sGet("mtto-equipos", true), sGet("mtto-log", true), sGet("mtto-cronograma", true),
        sGet("latest-lavanderia-values", true), sGet("lavanderia-rounds-index", true),
        sGet("latest-gym-values", true), sGet("gym-rounds-index", true),
        sGet("caldera-rounds-index", true), sGet("last-caldera-round", true),
        sGet("push-subscriptions", true),
        sGet("tasks", true),
        sGet("trash", true),
        sGet("login-log", true),
        sGet("schedule-edit-log", true),
        sGet("changelog", true),
        sGet("general-edit-log", true),
        sGet("fuel-history", true),
      ]);
      setActiveIssues(ai || {});
      setIssueHistory(ih || []);
      setRoundsIndex(ri || []);
      setLatestValues(lv || {});
      setTankHistory(th || {});
      setReportEmail(email?.value || "");
      setReportWhatsapp(wa?.value || "");
      setSentReports(sr || []);
      setLastTour(lt || null);
      setTourHistory(thist || []);
      setLatestColdValues(lcv || {});
      setLastColdRound(lcr || null);
      setColdHistory(ch || {});
      setColdRoundsIndex(cri || []);
      setLatestMeterValues(lmv || {});
      setMeterHistory(mh || {});
      setMeterRoundsIndex(mri || []);
      setBodegas(bod || []);
      setShelves(shv || []);
      setInvItems(iit || []);
      setInvMovements(imv || []);
      setEmployees(emp || []);
      setScheduleEntries(sch || {});
      setMttoEquipos(mte || []);
      setMttoLog(mtl || []);
      setMttoCronograma(mtc || []);
      setLatestLavanderiaValues(llv || {});
      setLavanderiaRoundsIndex(lri || []);
      setLatestGymValues(lgv || {});
      setGymRoundsIndex(gri || []);
      setCalderaRoundsIndex(cari || []);
      setLastCalderaRound(lcar || null);
      setPushSubscriptions(psub || []);
      setTasks(tsk || []);
      setTrash(trs || []);
      setLoginLog(llog || []);
      setScheduleEditLog(schLog || []);
      setChangelogEntries(chgl && chgl.length ? chgl : DEFAULT_CHANGELOG_SEED);
      setGeneralEditLog(gel || []);
      setFuelHistory(fh || {});
      setLoading(false);
    } catch (e) {
      console.error("Error cargando datos iniciales:", e);
      setLoadError("No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.");
      setLoading(false);
    }
  }, []);

  /** Trae los perfiles de TODOS los usuarios (para el Panel de administrador, listas, etc.) —
   *  cualquiera con sesión iniciada puede verlos (ver política "profiles_select_authenticated"),
   *  aunque su propia cuenta todavía no esté aprobada. */
  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    const map = {};
    (data || []).forEach(p => { map[p.id] = p; });
    setProfiles(map);
    return map;
  }, []);

  /** Se llama cada vez que cambia la sesión de Supabase Auth (al abrir la app, al iniciar
   *  sesión, al cerrarla, o si el token se refresca solo). Decide qué cargar según si hay
   *  sesión y si esa cuenta ya está aprobada — para no intentar leer datos que las reglas de
   *  Supabase van a rechazar de todas formas si la cuenta no está aprobada todavía. */
  const handleAuthChange = useCallback(async (session) => {
    if (!session?.user) {
      setCurrentUser(null);
      setProfiles({});
      setLoading(false);
      return;
    }
    setCurrentUser(session.user.id);
    let map = await loadAllProfiles();
    if (!map[session.user.id]) {
      // No tiene fila en "profiles" todavía — pasa si el correo se confirmó por fuera del flujo
      // normal de registro (a mano desde Supabase, por ejemplo), o si algo se cortó a mitad de
      // camino la primera vez. Se crea aquí mismo, para que nadie quede "colgado" sin rol.
      await requestCreateProfile(session.access_token);
      map = await loadAllProfiles();
    }
    const mine = map[session.user.id];
    if (mine?.approved) {
      await loadAll();
      // Copia de respaldo de la firma en este celular (además de la del servidor) — así, si
      // alguna vez la del servidor se pierde (como pasó una vez por una columna que faltaba),
      // se puede recuperar sola sin que la persona tenga que volver a dibujarla.
      try {
        const backupKey = `pm-local:signature-backup:${session.user.id}`;
        if (mine.signature) {
          localStorage.setItem(backupKey, mine.signature);
        } else {
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            const { error } = await supabase.from("profiles").update({ signature: backup }).eq("id", session.user.id);
            if (!error) setProfiles(m => ({ ...m, [session.user.id]: { ...m[session.user.id], signature: backup } }));
          }
        }
      } catch { /* la copia local es un extra de seguridad, nunca debe romper el login si falla */ }
    } else {
      setLoading(false); // cuenta todavía no aprobada: no se intenta cargar el resto de la app
    }
  }, [loadAllProfiles, loadAll]);

  // Se usa para saber, dentro del listener de abajo, quién es "quien ya estaba conectado" sin
  // depender de que el efecto se vuelva a ejecutar (el efecto corre una sola vez, con []).
  const currentUserRef = useRef(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    let subscription;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthChange(session);
      setAuthReady(true);
      const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
        // Supabase dispara este evento en varios momentos que NO son un login/logout de verdad
        // (ej. cada vez que la pestaña/app recupera el foco, o cuando el token se renueva solo
        // por detrás) — antes esto hacía que TODA la app se volviera a cargar (pantalla de
        // "Cargando…") cada vez que alguien volvía a la pestaña o cambiaba de pantalla. Ahora
        // solo se reacciona quando de verdad cambia la sesión: alguien entra, alguien sale, o
        // cambia la persona conectada — nunca por una simple renovación de token o de foco.
        if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "USER_UPDATED") return;
        if (event === "SIGNED_IN" && newSession?.user?.id === currentUserRef.current) return;
        handleAuthChange(newSession);
      });
      subscription = sub.subscription;
    })();
    return () => { if (subscription) subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Revisa cada 30 segundos si a la persona que tiene la app abierta le quitaron el acceso
   * (la rechazaron, la eliminaron, o le quitaron la aprobación) — y si es así, la saca de la
   * app de inmediato, sin esperar a que recargue la página. Sin esto, alguien que ya tenía la
   * app abierta seguiría viendo (y en teoría manipulando) todo lo que ya se había cargado en su
   * navegador, aunque su cuenta ya no exista del lado del servidor.
   */
  useEffect(() => {
    if (!currentUser) return;
    const check = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser).maybeSingle();
      if (error) return; // no se pudo revisar (sin señal, hotel wifi cortándose, etc.) — nunca se saca
                          // a nadie por un problema de conexión, solo cuando de verdad ya no está aprobado
      if (!data || !data.approved) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setProfiles({});
      } else {
        setProfiles(p => ({ ...p, [currentUser]: data }));
      }
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [currentUser]);

  const register = async (email, password, fullName) => {
    setAuthError(""); setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: fullName } },
      });
      if (error) {
        setAuthError(
          error.message?.includes("already registered") || error.message?.includes("already been registered")
            ? "Ese correo ya tiene una cuenta. Inicia sesión en vez de crear una nueva."
            : (error.message || "No se pudo crear la cuenta.")
        );
        setAuthBusy(false);
        return;
      }
      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        // Algunos proyectos de Supabase piden confirmar el correo antes de dar una sesión — en
        // ese caso no hay token todavía para crear el perfil de una vez.
        setAuthError("Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja antes de iniciar sesión.");
        setAuthBusy(false);
        return;
      }
      const profRes = await requestCreateProfile(accessToken);
      if (!profRes.ok) {
        setAuthError(profRes.message || "La cuenta se creó, pero no se pudo terminar de configurar. Intenta iniciar sesión.");
        setAuthBusy(false);
        return;
      }
      await handleAuthChange(data.session);
      setView("home");
      if (!profRes.isFirstEver && pushSubscriptions.length > 0) {
        sendPushToSubscriptions(pushSubscriptions, "👤 Cuenta nueva esperando aprobación", `"${fullName}" se registró y necesita que la aprueben.`, "/");
      }
    } catch (e) {
      console.error("Error creando cuenta:", e);
      setAuthError("No se pudo conectar con el servidor para crear la cuenta. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const login = async (email, password) => {
    setAuthError(""); setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message?.includes("Invalid login") ? "Correo o contraseña incorrectos." : (error.message || "No se pudo iniciar sesión."));
        setAuthBusy(false);
        // Se registra el intento fallido para poder avisar si se repite muchas veces seguidas —
        // no se espera (await) la respuesta, para no atrasar el mensaje de error al usuario.
        fetch("/api/log-failed-login", { method: "POST", headers: aiRequestHeaders(), body: JSON.stringify({ email }) }).catch(() => {});
        return;
      }
      await handleAuthChange(data.session);
      setView("home");
      // Registra el ingreso para poder ver, como admin, quién está usando la app y con qué frecuencia.
      const logEntry = { userId: data.session.user.id, at: nowIso() };
      const nextLog = [logEntry, ...loginLog].slice(0, 2000);
      setLoginLog(nextLog);
      sSet("login-log", nextLog, true); // no se espera (await) a propósito, para no atrasar el ingreso
    } catch (e) {
      console.error("Error iniciando sesión:", e);
      setAuthError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const updateMySignature = async (dataUrl) => {
    const { error } = await supabase.from("profiles").update({ signature: dataUrl }).eq("id", currentUser);
    if (error) {
      console.error("Error guardando la firma:", error);
      throw new Error("No se pudo guardar la firma. Avísale al admin — puede que falte una columna en la base de datos.");
    }
    setProfiles(p => ({ ...p, [currentUser]: { ...p[currentUser], signature: dataUrl } }));
  };

  /** Guarda cuál empleado del Horario Mensual es "yo", para que "Mi horario" sepa cuáles turnos mostrar. */
  const updateMyLinkedEmployee = async (employeeId) => {
    await supabase.from("profiles").update({ linked_employee_id: employeeId }).eq("id", currentUser);
    setProfiles(p => ({ ...p, [currentUser]: { ...p[currentUser], linked_employee_id: employeeId } }));
  };

  /** Estas cuatro pasan por el servidor (api/admin-actions.js) porque cambiar el rol o aprobar
   *  a OTRA persona no se puede hacer directo desde el navegador — a propósito, para que ni
   *  siquiera alguien con la clave pública pueda auto-asignarse un rol. El servidor comprueba
   *  ahí, de verdad, que quien llama ya es un administrador aprobado. */
  const callAdminAction = async (action, targetUserId, extra) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await requestAdminAction(session?.access_token, action, targetUserId, extra);
    if (res.ok) await loadAllProfiles();
    return res;
  };
  const approveAccount = (userId) => callAdminAction("approve", userId);
  const rejectAccount = (userId) => callAdminAction("reject", userId);
  const toggleAdmin = (userId) => callAdminAction("toggle-admin", userId);
  const toggleAlmacenista = (userId) => callAdminAction("toggle-almacenista", userId);
  const toggleGerencia = (userId) => callAdminAction("toggle-gerencia", userId);
  const resetPassword = (userId, newPassword) => callAdminAction("reset-password", userId, { newPassword });
  const deleteAccount = async (userId) => {
    const data = profiles[userId];
    if (data) await moveToTrash("account", { userId, ...data }, `${data.display_name || data.email || userId} (usuario)`);
    return callAdminAction("delete", userId);
  };

  const logout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setProfiles({}); };

  const addChangelogEntry = async ({ title, description }) => {
    const entry = { id: uid("cl"), title, description, at: nowIso(), by: displayName };
    const next = [entry, ...changelogEntries];
    setChangelogEntries(next);
    await sSet("changelog", next, true);
  };
  const deleteChangelogEntry = async (id) => {
    const next = changelogEntries.filter(e => e.id !== id);
    setChangelogEntries(next);
    await sSet("changelog", next, true);
  };
  /** Cierra la sesión en TODOS los dispositivos donde esa cuenta esté conectada (no solo este) —
   *  útil si se perdió un celular con la app abierta, o se dejó la sesión abierta en un equipo
   *  que ya no se usa. Supabase Auth ya trae esto incorporado (scope: "global"). */
  const logoutEverywhere = async () => { await supabase.auth.signOut({ scope: "global" }); setCurrentUser(null); setProfiles({}); };

  const saveReportEmail = async (email) => {
    setReportEmail(email);
    await sSet("report-email", { value: email }, true);
  };

  const saveReportWhatsapp = async (wa) => {
    setReportWhatsapp(wa);
    await sSet("report-whatsapp", { value: wa }, true);
  };

  const logSentReport = async (rec) => {
    const next = [rec, ...sentReports].slice(0, 200);
    setSentReports(next);
    await sSet("sent-reports", next, true);
  };

  /* ---- Papelera ---- */
  const moveToTrash = async (tipo, data, label) => {
    const entry = { id: uid("trash"), tipo, data, label: label || data.titulo || data.nombre || data.displayName || data.username || "—", deletedBy: displayName, deletedAt: nowIso() };
    const next = [entry, ...trash];
    setTrash(next);
    await sSet("trash", next, true);
  };

  const restoreFromTrash = async (trashId) => {
    const entry = trash.find(t => t.id === trashId);
    if (!entry) return;
    if (entry.tipo === "task") {
      const next = [entry.data, ...tasks]; setTasks(next); await sSet("tasks", next, true);
    } else if (entry.tipo === "account") {
      // Una cuenta eliminada no se puede "restaurar" sola — la persona tiene que volver a
      // registrarse con su correo (el inicio de sesión de Supabase Auth ya no existe una vez
      // se elimina). Esta entrada de la papelera queda solo como registro de quién era.
      return;
    } else if (entry.tipo === "employee") {
      const next = [entry.data, ...employees]; setEmployees(next); await sSet("employees", next, true);
    } else if (entry.tipo === "mttoEquipo") {
      const next = [entry.data, ...mttoEquipos]; setMttoEquipos(next); await sSet("mtto-equipos", next, true);
    } else if (entry.tipo === "bodega") {
      const next = [entry.data, ...bodegas]; setBodegas(next); await sSet("inventory-bodegas", next, true);
    } else if (entry.tipo === "shelf") {
      const next = [entry.data, ...shelves]; setShelves(next); await sSet("inventory-shelves", next, true);
    }
    const nextTrash = trash.filter(t => t.id !== trashId);
    setTrash(nextTrash);
    await sSet("trash", nextTrash, true);
  };

  const purgeFromTrash = async (trashId) => {
    const nextTrash = trash.filter(t => t.id !== trashId);
    setTrash(nextTrash);
    await sSet("trash", nextTrash, true);
  };

  const resolveIssue = async (iss, solution, afterPhotoUrl) => {
    const rec = {
      equipmentId: iss.equipmentId || iss.id, code: iss.code, name: iss.name, floorName: iss.floorName, floorId: iss.floorId,
      openedAt: iss.openedAt, openedBy: iss.openedBy, observation: iss.observation,
      resolvedAt: nowIso(), resolvedBy: displayName, solution,
      duration: elapsed(iss.openedAt),
      beforePhotoUrl: iss.beforePhotoUrl || null, afterPhotoUrl: afterPhotoUrl || null,
    };
    const newHistory = [rec, ...issueHistory].slice(0, 500);
    const newActive = { ...activeIssues };
    delete newActive[rec.equipmentId];
    setIssueHistory(newHistory); setActiveIssues(newActive);
    await sSet("issue-history", newHistory, true);
    await sSet("active-issues", newActive, true);
  };

  /** Guarda una foto de "cómo está ahora" mientras el daño sigue activo (el "antes" para el
   *  comparador antes/después que se muestra una vez resuelto). */
  const attachIssuePhoto = async (equipmentId, file) => {
    const url = await uploadPhoto(file, `issue-${equipmentId}`);
    const newActive = { ...activeIssues, [equipmentId]: { ...activeIssues[equipmentId], beforePhotoUrl: url } };
    setActiveIssues(newActive);
    await sSet("active-issues", newActive, true);
    return url;
  };

  /** "Sigue igual": deja constancia de que se revisó y el equipo sigue con la misma falla,
   *  sin obligar a escribir un comentario nuevo cada turno. Queda como una lista de confirmaciones. */
  const checkInIssue = async (iss) => {
    const id = iss.equipmentId || iss.id;
    const entry = { by: displayName, at: nowIso(), shift };
    const newActive = { ...activeIssues, [id]: { ...activeIssues[id], checkins: [...(activeIssues[id]?.checkins || []), entry] } };
    setActiveIssues(newActive);
    await sSet("active-issues", newActive, true);
  };

  /**
   * Actualiza el nivel de un tanque manualmente, SIN pasar por la ronda completa del piso.
   * Pensado para cortes de agua u otras emergencias donde hay que revisar/actualizar
   * rápido el porcentaje de los tanques. Usa el mismo almacenamiento que las rondas
   * normales (latestValues/tankHistory), así que queda 100% integrado: la próxima
   * ronda normal de ese piso ya va a mostrar este valor como "turno anterior".
   */
  const saveTankReading = async (item, value) => {
    const ts = nowIso();
    const newLatest = { ...latestValues, [item.id]: { value, updatedAt: ts, updatedBy: displayName, shift, code: item.c, name: item.n, manual: true } };
    const arr = (tankHistory[item.id] || []).concat([{ value, at: ts, by: displayName }]).slice(-20);
    const newTankHist = { ...tankHistory, [item.id]: arr };
    setLatestValues(newLatest); setTankHistory(newTankHist);
    await Promise.all([
      sSet("latest-values", newLatest, true),
      sSet("tank-history", newTankHist, true),
    ]);
  };

  /* ---- Inventario ---- */
  const logInvMovement = async (itemId, type, quantity, balanceAfter, note, movementsBase) => {
    const rec = { id: uid("mov"), itemId, type, quantity, balanceAfter, by: displayName, at: nowIso(), note: note || "" };
    const next = [rec, ...(movementsBase ?? invMovements)].slice(0, 3000);
    setInvMovements(next);
    await sSet("inventory-movements", next, true);
    return next;
  };

  const createBodega = async (name) => {
    const rec = { id: uid("bod"), name, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...bodegas];
    setBodegas(next);
    await sSet("inventory-bodegas", next, true);
    return rec;
  };

  const createShelf = async (bodegaId, code, name) => {
    const rec = { id: uid("shf"), bodegaId, code, name, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...shelves];
    setShelves(next);
    await sSet("inventory-shelves", next, true);
    return rec;
  };

  const deleteBodega = async (id) => {
    const item = bodegas.find(b => b.id === id);
    const myShelves = shelves.filter(s => s.bodegaId === id);
    const myItems = invItems.filter(i => i.bodegaId === id);
    if (myShelves.length > 0 || myItems.length > 0) {
      return { ok: false, message: `Esta bodega todavía tiene ${myShelves.length} estantería(s) y ${myItems.length} repuesto(s). Bórralos primero.` };
    }
    if (item) await moveToTrash("bodega", item, `${item.name} (bodega)`);
    const next = bodegas.filter(b => b.id !== id);
    setBodegas(next);
    await sSet("inventory-bodegas", next, true);
    return { ok: true };
  };

  const deleteShelf = async (id) => {
    const item = shelves.find(s => s.id === id);
    const myItems = invItems.filter(i => i.shelfId === id);
    if (myItems.length > 0) {
      return { ok: false, message: `Esta estantería todavía tiene ${myItems.length} repuesto(s). Bórralos primero.` };
    }
    if (item) await moveToTrash("shelf", item, `Estantería ${item.code} (${item.name || "sin nombre"})`);
    const next = shelves.filter(s => s.id !== id);
    setShelves(next);
    await sSet("inventory-shelves", next, true);
    return { ok: true };
  };

  const createInvItem = async (shelfId, bodegaId, form) => {
    const quantity = Number(form.quantity) || 0;
    const rec = {
      id: uid("itm"), shelfId, bodegaId, name: form.name.trim(), sku: (form.sku || "").trim(),
      unit: (form.unit || "unidad").trim() || "unidad", quantity, minThreshold: Number(form.minThreshold) || 0,
      createdBy: displayName, createdAt: nowIso(), updatedAt: nowIso(),
    };
    const next = [rec, ...invItems];
    setInvItems(next);
    await sSet("inventory-items", next, true);
    logGeneralEdit({ kind: "inventario", action: "creacion", entityLabel: rec.name });
    if (quantity > 0) await logInvMovement(rec.id, "entrada", quantity, quantity, "Alta inicial del repuesto");
    return rec;
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el inventario real
   * del Excel del hotel: crea las 29 bodegas y sus estanterías si no existen, y da de alta
   * los ~2897 repuestos con su cantidad y mínimo actuales. No duplica si ya existen (empareja
   * por nombre de bodega, código de estantería, y nombre+bodega+estantería del repuesto).
   */
  const importFullInventory = async () => {
    const { INV_IMPORT_BODEGAS, INV_IMPORT_SHELVES, INV_IMPORT_ITEMS } = await import("./data/inventoryImportData.js");
    const bodegaByName = {};
    bodegas.forEach(b => { bodegaByName[b.name.trim().toLowerCase()] = b; });
    const newBodegas = [];
    INV_IMPORT_BODEGAS.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!bodegaByName[key]) {
        const rec = { id: uid("bod"), name, createdBy: displayName, createdAt: nowIso() };
        newBodegas.push(rec);
        bodegaByName[key] = rec;
      }
    });
    const allBodegas = [...bodegas, ...newBodegas];
    if (newBodegas.length) { setBodegas(allBodegas); await sSet("inventory-bodegas", allBodegas, true); }

    const shelfByKey = {}; // `${bodegaId}::${code}` -> shelf
    shelves.forEach(s => { shelfByKey[`${s.bodegaId}::${s.code.trim().toLowerCase()}`] = s; });
    const newShelves = [];
    INV_IMPORT_SHELVES.forEach(([bIdx, code]) => {
      const bodega = bodegaByName[INV_IMPORT_BODEGAS[bIdx].trim().toLowerCase()];
      const key = `${bodega.id}::${code.trim().toLowerCase()}`;
      if (!shelfByKey[key]) {
        const rec = { id: uid("shf"), bodegaId: bodega.id, code, name: "", createdBy: displayName, createdAt: nowIso() };
        newShelves.push(rec);
        shelfByKey[key] = rec;
      }
    });
    const allShelves = [...shelves, ...newShelves];
    if (newShelves.length) { setShelves(allShelves); await sSet("inventory-shelves", allShelves, true); }

    const itemExists = {}; // `${shelfId}::${name}` -> true, para no duplicar si se corre dos veces
    invItems.forEach(it => { itemExists[`${it.shelfId}::${it.name.trim().toLowerCase()}`] = true; });
    const newItems = [];
    const ts = nowIso();
    INV_IMPORT_ITEMS.forEach(([bIdx, shelfCode, name, sku, unit, qty, min]) => {
      const bodega = bodegaByName[INV_IMPORT_BODEGAS[bIdx].trim().toLowerCase()];
      const shelf = shelfByKey[`${bodega.id}::${shelfCode.trim().toLowerCase()}`];
      const key = `${shelf.id}::${name.trim().toLowerCase()}`;
      if (itemExists[key]) return;
      itemExists[key] = true;
      newItems.push({
        id: uid("itm"), shelfId: shelf.id, bodegaId: bodega.id, name, sku, unit: unit || "unidad",
        quantity: qty, minThreshold: min, createdBy: displayName, createdAt: ts, updatedAt: ts,
      });
    });
    const allItems = [...invItems, ...newItems];
    if (newItems.length) { setInvItems(allItems); await sSet("inventory-items", allItems, true); }

    return { newBodegasCount: newBodegas.length, newShelvesCount: newShelves.length, newItemsCount: newItems.length };
  };

  /* ---- Mantenimiento ---- */
  const importMaintenanceFull = async () => {
    const { MTTO_IMPORT_SISTEMAS, MTTO_IMPORT_EQUIPOS, MTTO_CRONOGRAMA } = await import("./data/mttoImportData.js");
    const existing = {};
    mttoEquipos.forEach(e => { existing[`${e.sistema.trim().toLowerCase()}::${e.nombre.trim().toLowerCase()}`] = e; });
    const newEquipos = [];
    MTTO_IMPORT_EQUIPOS.forEach(([sIdx, nombre]) => {
      const sistema = MTTO_IMPORT_SISTEMAS[sIdx];
      const key = `${sistema.trim().toLowerCase()}::${nombre.trim().toLowerCase()}`;
      if (!existing[key]) {
        const rec = { id: uid("eq"), sistema, nombre, active: true, createdBy: displayName, createdAt: nowIso() };
        newEquipos.push(rec);
        existing[key] = rec;
      }
    });
    const allEquipos = [...mttoEquipos, ...newEquipos];
    if (newEquipos.length) { setMttoEquipos(allEquipos); await sSet("mtto-equipos", allEquipos, true); }

    // Reconstruye, en el mismo orden que se generó el catálogo, a qué equipo real corresponde cada posición
    const idxToEquipo = MTTO_IMPORT_EQUIPOS.map(([sIdx, nombre]) => {
      const sistema = MTTO_IMPORT_SISTEMAS[sIdx];
      const key = `${sistema.trim().toLowerCase()}::${nombre.trim().toLowerCase()}`;
      return existing[key];
    });

    const cronoExists = {};
    mttoCronograma.forEach(c => { cronoExists[`${c.equipoId}::${c.mesNum}::${c.tipo}::${c.fechaEjecucion}`] = true; });
    const newCrono = [];
    const ts = nowIso();
    MTTO_CRONOGRAMA.forEach(([eIdx, mesNum, programado, tipo, fecha, tecnico, estado]) => {
      const equipo = idxToEquipo[eIdx];
      if (!equipo) return;
      const tipoStr = tipo === 1 ? "externo" : "interno";
      const key = `${equipo.id}::${mesNum}::${tipoStr}::${fecha}`;
      if (cronoExists[key]) return;
      cronoExists[key] = true;
      newCrono.push({
        id: uid("cr"), equipoId: equipo.id, mesNum, programado: !!programado, tipo: tipoStr,
        fechaEjecucion: fecha || null, tecnico, estado: estado === 2 ? "ejecutado" : estado === 1 ? "atrasado" : "pendiente",
        createdAt: ts,
      });
    });
    const allCrono = [...mttoCronograma, ...newCrono];
    if (newCrono.length) { setMttoCronograma(allCrono); await sSet("mtto-cronograma", allCrono, true); }

    // Por cada registro del cronograma que YA se ejecutó, crea también su entrada en el
    // historial de mantenimiento del equipo (para que salga en su ficha y en Análisis).
    const logExists = {};
    mttoLog.forEach(m => { logExists[`${m.equipoId}::${m.fecha}::import`] = true; });
    const newLogs = [];
    newCrono.forEach(c => {
      if (c.estado !== "ejecutado" || !c.fechaEjecucion) return;
      const key = `${c.equipoId}::${c.fechaEjecucion}::import`;
      if (logExists[key]) return;
      logExists[key] = true;
      newLogs.push({
        id: uid("mtl"), equipoId: c.equipoId, tipo: "preventivo", fecha: c.fechaEjecucion,
        tecnico: c.tecnico || "(cronograma)", descripcion: `Mantenimiento ${c.tipo === "externo" ? "externo" : "interno"} programado, importado del cronograma.`,
        estado: "funcionando", costo: 0, fotos: [], createdBy: displayName, createdAt: ts, fromImport: true,
      });
    });
    const allLogs = [...mttoLog, ...newLogs];
    if (newLogs.length) { setMttoLog(allLogs); await sSet("mtto-log", allLogs, true); }

    return { newEquiposCount: newEquipos.length, newCronoCount: newCrono.length, newLogsCount: newLogs.length };
  };

  const createMttoEquipo = async (sistema, nombre) => {
    const rec = { id: uid("eq"), sistema: sistema.trim(), nombre: nombre.trim(), active: true, createdBy: displayName, createdAt: nowIso() };
    const next = [rec, ...mttoEquipos];
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
    return rec;
  };

  const deleteMttoEquipo = async (id) => {
    const item = mttoEquipos.find(e => e.id === id);
    if (item) await moveToTrash("mttoEquipo", item, `${item.nombre} (equipo de mantenimiento)`);
    const next = mttoEquipos.filter(e => e.id !== id);
    setMttoEquipos(next);
    await sSet("mtto-equipos", next, true);
  };

  const logMaintenance = async (equipoId, form) => {
    const rec = {
      id: uid("mtl"), equipoId, tipo: form.tipo || "preventivo", fecha: form.fecha || nowIso(),
      tecnico: displayName, descripcion: form.descripcion || "", estado: form.estado || "funcionando",
      costo: form.costo ? Number(form.costo) : 0, fotos: form.fotos || [],
      createdBy: displayName, createdAt: nowIso(),
    };
    const next = [rec, ...mttoLog].slice(0, 5000);
    setMttoLog(next);
    await sSet("mtto-log", next, true);
    return rec;
  };

  const adjustInvStock = async (item, delta, type, note) => {
    const newQty = Math.max(0, item.quantity + delta);
    const nextItems = invItems.map(it => it.id === item.id ? { ...it, quantity: newQty, updatedAt: nowIso() } : it);
    setInvItems(nextItems);
    await sSet("inventory-items", nextItems, true);
    await logInvMovement(item.id, type, delta, newQty, note);
  };

  const doInvRetiro = (item, qty, note) => adjustInvStock(item, -Math.abs(qty), "retiro", note);
  const doInvEntrada = (item, qty, note) => adjustInvStock(item, Math.abs(qty), "entrada", note);

  /** Edita el nombre/código/unidad/mínimo de un repuesto (no la cantidad — eso sigue siendo un
   *  movimiento de entrada/retiro aparte, con su propio historial). Cada campo que cambie queda
   *  en el historial general de cambios. */
  const editInvItem = async (id, patch) => {
    const before = invItems.find(it => it.id === id);
    if (!before) return;
    const next = invItems.map(it => it.id === id ? { ...it, ...patch, updatedAt: nowIso() } : it);
    setInvItems(next);
    await sSet("inventory-items", next, true);
    Object.keys(patch).forEach(field => {
      const b = before[field], a = patch[field];
      if (String(b ?? "") === String(a ?? "")) return;
      logGeneralEdit({
        kind: "inventario", entityLabel: before.name, field: FIELD_LABELS[field] || field,
        before: b === "" || b == null ? "(vacío)" : String(b), after: a === "" || a == null ? "(vacío)" : String(a),
      });
    });
  };

  /* ---- Horarios ---- */
  const createEmployee = async (name, cargo, fixedRestDay) => {
    const rec = { id: uid("emp"), name, cargo: cargo || "", fixedRestDay: fixedRestDay === "" ? null : Number(fixedRestDay), active: true, createdBy: displayName, createdAt: nowIso() };
    const next = [...employees, rec];
    setEmployees(next);
    await sSet("employees", next, true);
    logGeneralEdit({ kind: "empleado", action: "creacion", entityLabel: rec.name });
    return rec;
  };

  /** Historial de cambios "general" — empleados, inventario y tareas. Mismo patrón siempre: quién
   *  cambió qué, desde qué dispositivo, y antes/después (para ediciones). */
  const logGeneralEdit = async (entry) => {
    const next = [{ id: uid("gel"), at: nowIso(), by: displayName, device: getDeviceInfo(), action: entry.action || "edicion", ...entry }, ...generalEditLog].slice(0, 2000);
    setGeneralEditLog(next);
    await sSet("general-edit-log", next, true);
  };

  const FIELD_LABELS = {
    cargo: "Cargo", fixedRestDay: "Descanso fijo", badge: "Etiqueta", reductionHoursPerDay: "Hrs. reducción/día",
    name: "Nombre", sku: "Código", unit: "Unidad", minThreshold: "Mínimo",
  };
  const updateEmployee = async (id, patch) => {
    const before = employees.find(e => e.id === id);
    const next = employees.map(e => e.id === id ? { ...e, ...patch } : e);
    setEmployees(next);
    await sSet("employees", next, true);
    if (before) {
      Object.keys(patch).forEach(field => {
        const b = before[field], a = patch[field];
        if (String(b ?? "") === String(a ?? "")) return;
        logGeneralEdit({
          kind: "empleado", entityLabel: before.name, field: FIELD_LABELS[field] || field,
          before: b === "" || b == null ? "(vacío)" : String(b), after: a === "" || a == null ? "(vacío)" : String(a),
        });
      });
    }
  };

  const deleteEmployee = async (id) => {
    const item = employees.find(e => e.id === id);
    if (item) {
      await moveToTrash("employee", item, `${item.name} (empleado)`);
      logGeneralEdit({ kind: "empleado", action: "eliminacion", entityLabel: item.name });
    }
    const next = employees.filter(e => e.id !== id);
    setEmployees(next);
    await sSet("employees", next, true);
  };

  /** Si el cambio que se acaba de guardar hace que alguien complete un día nuevo de descanso por
   *  horas de reducción (ver computeCompBalance), avisa por push a los administradores suscritos.
   *  Compara el saldo ANTES y DESPUÉS del cambio, así solo avisa una vez por cada día ganado. */
  const notifyCompDaysEarned = (prevEntries, nextEntries, employeeIds) => {
    if (pushSubscriptions.length === 0) return;
    employeeIds.forEach(id => {
      const emp = employees.find(e => e.id === id);
      if (!emp || !(emp.reductionHoursPerDay > 0)) return;
      const before = computeCompBalance(emp, prevEntries).fullDays;
      const after = computeCompBalance(emp, nextEntries).fullDays;
      if (after > before) {
        sendPushToSubscriptions(pushSubscriptions, "🟣 Día de descanso acumulado",
          `${emp.name} ya completó ${after} día(s) de descanso por horas de reducción — pendiente de programar.`, "/");
      }
    });
  };

  /** Agrega entradas al historial de cambios del horario (quién cambió qué, cuándo, y qué había antes). */
  const logScheduleEdits = async (edits) => {
    if (!edits.length) return;
    const next = [...edits, ...scheduleEditLog].slice(0, 2000);
    setScheduleEditLog(next);
    await sSet("schedule-edit-log", next, true);
  };

  const setScheduleEntry = async (employeeId, dateIso, patch) => {
    const key = scheduleKey(employeeId, dateIso);
    const before = scheduleEntries[key] || null;
    const next = { ...scheduleEntries };
    const isEmpty = !patch || (!patch.code && patch.entrada == null && patch.salida == null);
    if (isEmpty) delete next[key];
    else next[key] = { entrada: patch.entrada ?? null, salida: patch.salida ?? null, code: patch.code || null, note: patch.note || "", updatedBy: displayName, updatedAt: nowIso() };
    notifyCompDaysEarned(scheduleEntries, next, [employeeId]);
    setScheduleEntries(next);
    await sSet("schedule-entries", next, true);
    const emp = employees.find(e => e.id === employeeId);
    logScheduleEdits([{
      id: uid("sel"), employeeId, employeeName: emp?.name || employeeId, date: dateIso,
      before: fmtEntryShort(before) || "(vacío)", after: fmtEntryShort(next[key]) || "(vacío)",
      by: displayName, at: nowIso(), source: "manual",
    }]);
  };

  /**
   * Guarda de una sola vez todas las celdas de un borrador de horario generado con IA (o ya
   * editado a mano por el usuario sobre ese borrador). "overrides" viene en el mismo formato que
   * scheduleEntries: { "empleadoId::AAAA-MM-DD": {entrada,salida} | {code} }. Es un solo guardado,
   * no uno por celda, para que sea rápido aunque sea un mes completo.
   */
  const applyAiScheduleDraft = async (overrides) => {
    const next = { ...scheduleEntries };
    const affectedIds = new Set();
    const edits = [];
    Object.entries(overrides || {}).forEach(([key, patch]) => {
      const [employeeId, dateIso] = key.split("::");
      const before = scheduleEntries[key] || null;
      const isEmpty = !patch || (!patch.code && patch.entrada == null && patch.salida == null);
      if (isEmpty) { delete next[key]; }
      else next[key] = { entrada: patch.entrada ?? null, salida: patch.salida ?? null, code: patch.code || null, note: patch.note || "Generado con IA", updatedBy: displayName, updatedAt: nowIso() };
      affectedIds.add(employeeId);
      const emp = employees.find(e => e.id === employeeId);
      edits.push({
        id: uid("sel"), employeeId, employeeName: emp?.name || employeeId, date: dateIso,
        before: fmtEntryShort(before) || "(vacío)", after: fmtEntryShort(next[key]) || "(vacío)",
        by: displayName, at: nowIso(), source: "ia",
      });
    });
    notifyCompDaysEarned(scheduleEntries, next, Array.from(affectedIds));
    setScheduleEntries(next);
    await sSet("schedule-entries", next, true);
    logScheduleEdits(edits);
  };

  /**
   * Guarda lo que se sacó de un Excel de horario que el usuario subió desde la pantalla (mismo
   * formato de siempre — ver parseHorarioExcelWorkbook). Crea los empleados que hagan falta
   * (sin cargo asignado si son nuevos del todo, para que el admin lo complete después en
   * "Gestionar empleados") y guarda todos los registros de una sola vez.
   */
  const importScheduleFromParsedExcel = async (parsed) => {
    const { entries, names } = parsed;
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    names.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = { id: uid("emp"), name, cargo: "", fixedRestDay: null, active: true, createdBy: displayName, createdAt: nowIso() };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    entries.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "Importado de Excel", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: entries.length };
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el horario real
   * que se sacó del Excel "11__Horario_Julio2_2026.xlsx": crea los empleados que falten
   * (ya con su cargo asignado) y carga las 396 lecturas de entrada/salida del 16/07 al 02/08/2026.
   */
  const importJulySchedule2026 = async () => {
    const { JULY2026_IMPORT_NAMES, JULY2026_IMPORT_ENTRIES, JULY2026_IMPORT_CARGOS } = await import("./data/julyScheduleImportData.js");
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    JULY2026_IMPORT_NAMES.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = {
          id: uid("emp"), name, cargo: JULY2026_IMPORT_CARGOS[name] || "",
          fixedRestDay: name === "Quintana Jesus Daniel" ? 6 : null,
          active: true, createdBy: displayName, createdAt: nowIso(),
        };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    JULY2026_IMPORT_ENTRIES.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: JULY2026_IMPORT_ENTRIES.length };
  };

  /**
   * Importa (una sola vez, o las veces que quieras — es seguro repetirlo) el horario real
   * que se sacó del Excel "12__Horario_Agosto_2026.xlsx": crea los empleados que falten
   * (ya con su cargo asignado) y carga las 601 lecturas de entrada/salida del 03/08 al 30/08/2026.
   * Esta es la base real sobre la que trabaja después el generador de horario con IA (usa estos
   * mismos días como ejemplo del patrón de turnos de cada persona).
   */
  const importAugustSchedule2026 = async () => {
    const { AUGUST2026_IMPORT_NAMES, AUGUST2026_IMPORT_ENTRIES, AUGUST2026_IMPORT_CARGOS } = await import("./data/augustScheduleImportData.js");
    const existingByName = {};
    employees.forEach(e => { existingByName[e.name.trim().toLowerCase()] = e; });

    const newEmployees = [];
    AUGUST2026_IMPORT_NAMES.forEach(name => {
      const key = name.trim().toLowerCase();
      if (!existingByName[key]) {
        const rec = {
          id: uid("emp"), name, cargo: AUGUST2026_IMPORT_CARGOS[name] || "",
          fixedRestDay: name === "Quintana Jesus Daniel" ? 6 : null,
          active: true, createdBy: displayName, createdAt: nowIso(),
        };
        newEmployees.push(rec);
        existingByName[key] = rec;
      }
    });
    const allEmployees = [...employees, ...newEmployees];
    if (newEmployees.length) { setEmployees(allEmployees); await sSet("employees", allEmployees, true); }

    const nextEntries = { ...scheduleEntries };
    AUGUST2026_IMPORT_ENTRIES.forEach(rec => {
      const emp = existingByName[rec.name.trim().toLowerCase()];
      if (!emp) return;
      const key = scheduleKey(emp.id, rec.date);
      nextEntries[key] = {
        entrada: rec.entrada ?? null, salida: rec.salida ?? null, code: rec.code || null,
        note: "", updatedBy: displayName, updatedAt: nowIso(),
      };
    });
    setScheduleEntries(nextEntries);
    await sSet("schedule-entries", nextEntries, true);

    return { newEmployeesCount: newEmployees.length, entriesCount: AUGUST2026_IMPORT_ENTRIES.length };
  };

  /** Manda push a los administradores suscritos cuando aparece un equipo dañado NUEVO (no repite si ya estaba). */
  const notifyNewDamagedEquipment = (prevActive, newActiveObj) => {
    if (pushSubscriptions.length === 0) return;
    Object.keys(newActiveObj).filter(k => !prevActive[k]).forEach(k => {
      const issue = newActiveObj[k];
      sendPushToSubscriptions(pushSubscriptions, "⚠ Equipo fuera de servicio", `${issue.name} — ${issue.floorName}`, "/");
    });
  };

  const enablePushNotifications = async () => {
    const sub = await subscribeToPush();
    if (!sub) return { ok: false, message: "No se pudo activar. ¿Le diste permiso a las notificaciones cuando te lo pidió el navegador?" };
    const next = [...pushSubscriptions.filter(s => s.endpoint !== sub.endpoint), sub];
    setPushSubscriptions(next);
    await sSet("push-subscriptions", next, true);
    return { ok: true, message: "✓ Notificaciones activadas en este dispositivo." };
  };

  /* ---- Tareas / Pendientes ---- */
  const createTask = async (form) => {
    const id = uid("task");
    const recurrence = form.recurrencia || "";
    const now = nowIso();
    const rec = {
      id, titulo: form.titulo.trim(), descripcion: (form.descripcion || "").trim(),
      estado: "asignada", prioridad: form.prioridad || "media", asignadoA: form.asignadoA || "",
      recurrencia: recurrence, recurrenceGroupId: recurrence ? id : null,
      recurrencePeriodKey: recurrence ? periodKeyFor(new Date(), recurrence) : null,
      fotosAntes: form.fotosAntes || [], fotosDespues: [], notaCierre: "",
      assignedAt: form.asignadoA ? now : null, startedAt: null, finishedAt: null,
      timeLog: [{ estado: "asignada", at: now }],
      createdBy: displayName, createdAt: now, updatedAt: now,
    };
    const next = [rec, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
    logGeneralEdit({ kind: "tarea", action: "creacion", entityLabel: rec.titulo });
    if (rec.prioridad === "alta" && pushSubscriptions.length > 0) {
      sendPushToSubscriptions(pushSubscriptions, "🔴 Tarea de prioridad alta", rec.titulo, "/");
    }
    return rec;
  };

  /** Revisa las tareas que se repiten: si ya empezó un nuevo periodo (semana/mes) y no hay una instancia de ese ciclo, crea una nueva copia en "asignada". */
  const checkRecurringTasks = async () => {
    const templates = tasks.filter(t => t.recurrencia && t.recurrenceGroupId);
    const groups = {};
    templates.forEach(t => { (groups[t.recurrenceGroupId] ||= []).push(t); });

    const now = new Date();
    const nowStr = nowIso();
    const newOnes = [];
    Object.values(groups).forEach(group => {
      const latest = group.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
      const currentKey = periodKeyFor(now, latest.recurrencia);
      if (latest.recurrencePeriodKey === currentKey) return; // ya hay una tarea de este ciclo
      newOnes.push({
        id: uid("task"), titulo: latest.titulo, descripcion: latest.descripcion,
        estado: "asignada", prioridad: latest.prioridad, asignadoA: latest.asignadoA,
        recurrencia: latest.recurrencia, recurrenceGroupId: latest.recurrenceGroupId, recurrencePeriodKey: currentKey,
        fotosAntes: [], fotosDespues: [], notaCierre: "",
        assignedAt: latest.asignadoA ? nowStr : null, startedAt: null, finishedAt: null,
        timeLog: [{ estado: "asignada", at: nowStr }],
        createdBy: latest.createdBy, createdAt: nowStr, updatedAt: nowStr,
      });
    });
    if (newOnes.length === 0) return;
    const next = [...newOnes, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
  };

  const updateTask = async (id, patch) => {
    const before = tasks.find(t => t.id === id);
    const next = tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t);
    setTasks(next);
    await sSet("tasks", next, true);
    if (before && patch.estado && patch.estado !== before.estado) {
      logGeneralEdit({
        kind: "tarea", entityLabel: before.titulo, field: "Estado",
        before: TASK_STATES.find(s => s.code === normalizeTaskState(before.estado))?.label || before.estado,
        after: TASK_STATES.find(s => s.code === normalizeTaskState(patch.estado))?.label || patch.estado,
      });
    }
  };

  const deleteTask = async (id) => {
    const item = tasks.find(t => t.id === id);
    if (item) {
      await moveToTrash("task", item);
      logGeneralEdit({ kind: "tarea", action: "eliminacion", entityLabel: item.titulo });
    }
    const next = tasks.filter(t => t.id !== id);
    setTasks(next);
    await sSet("tasks", next, true);
  };

  const saveRound = async (floor, entries, notes) => {
    const ts = nowIso();
    const id = `${floor.id}-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestValues };
    const newActive = { ...activeIssues };
    const newTankHist = { ...tankHistory };
    const newFuelHist = { ...fuelHistory };
    const autoResolved = []; // equipos que se destildaron "Dañado" en esta ronda — se resuelven solos

    for (const item of floor.items) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.ph || e.cloro || e.operador || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n, kind: item.k };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, floorName: floor.name, updatedAt: ts, updatedBy: displayName, shift };

      if (item.tank && e.value !== undefined && e.value !== "") {
        const arr = (newTankHist[item.id] || []).concat([{ value: e.value, at: ts, by: displayName }]).slice(-20);
        newTankHist[item.id] = arr;
      }
      if (item.fuel && e.value !== undefined && e.value !== "") {
        const arr = (newFuelHist[item.id] || []).concat([{ value: e.value, at: ts, by: displayName, shift }]).slice(-30);
        newFuelHist[item.id] = arr;
      }

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: floor.name, floorId: floor.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        // Estaba fuera de servicio y en esta ronda se destildó "Dañado" — se resuelve solo, sin
        // tener que ir aparte a "Fuera de servicio" a darle "Marcar resuelto". El comentario que
        // se haya escrito ahora queda como la solución, para que quede en el historial.
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, floorId: floor.id, floorName: floor.name, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIndex].slice(0, 1000);
    const newHistory = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;

    setRoundsIndex(newIndex); setLatestValues(newLatest); setActiveIssues(newActive); setTankHistory(newTankHist); setFuelHistory(newFuelHist);
    if (autoResolved.length) setIssueHistory(newHistory);
    notifyNewDamagedEquipment(activeIssues, newActive);
    await Promise.all([
      sSet(`round-${id}`, cleanEntries, true),
      sSet("rounds-index", newIndex, true),
      sSet("latest-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("tank-history", newTankHist, true),
      sSet("fuel-history", newFuelHist, true),
      ...(autoResolved.length ? [sSet("issue-history", newHistory, true)] : []),
    ]);

    // --- Entrega de turno: acumula cada piso guardado durante el recorrido actual ---
    const floorIdx = FLOORS.findIndex(f => f.id === floor.id);
    if (floorIdx === 0) tourBufferRef.current = {}; // se reinicia el buffer al empezar por el primer piso

    tourBufferRef.current[floor.id] = {
      floorId: floor.id,
      floorName: floor.name,
      notes,
      itemCount, damagedCount,
      items: floor.items.reduce((acc, item) => {
        const e = entries[item.id];
        if (!e || !(e.status || (e.value !== undefined && e.value !== "") || e.observation || e.ph || e.cloro || e.operador || e.damaged)) return acc;
        const parts = [];
        if (e.status) parts.push(e.status);
        if (e.value !== undefined && e.value !== "") parts.push(`${e.value}${item.u ? " " + item.u : ""}`);
        if (e.ph) parts.push(`PH ${e.ph}`);
        if (e.cloro) parts.push(`Cloro ${e.cloro}`);
        if (e.operador) parts.push(`Operador ${e.operador}`);
        acc.push({ code: item.c, name: item.n, valueStr: parts.join(" · ") || "(sin valor)", damaged: !!e.damaged, observation: e.observation || "" });
        return acc;
      }, []),
    };
    // Se guarda en este celular por si algo interrumpe la sesión antes de terminar el recorrido
    // completo (ver la restauración al inicio de tourBufferRef) — así no se pierde lo ya hecho.
    try { localStorage.setItem("pm-local:tour-buffer", JSON.stringify({ date: todayStr(), shift, buffer: tourBufferRef.current })); } catch { /* noop */ }
    setTourProgressCount(Object.keys(tourBufferRef.current).length);

    // Si se guardó el último piso, el recorrido quedó completo — PERO solo si de verdad se
    // pasó por TODOS los pisos en esta misma sesión (no solo por este). Si alguien entra
    // directo al último piso sin haber hecho los demás, no se deja "cerrar" el recorrido con
    // los datos de un solo piso — se avisa y se manda de vuelta al piso 0 a empezar bien.
    if (floorIdx === FLOORS.length - 1) {
      const floorsDone = FLOORS.map(f => tourBufferRef.current[f.id]).filter(Boolean);
      if (floorsDone.length < FLOORS.length) {
        const faltantes = FLOORS.filter(f => !tourBufferRef.current[f.id]).map(f => f.name).join(", ");
        setRoundSaveMsg({
          ok: false,
          text: `Este piso quedó guardado, pero todavía faltan pisos por revisar en este recorrido: ${faltantes}. Hay que pasar por todos, empezando por el primero, para poder cerrar y enviar la entrega de turno.`,
        });
        setFloorId(FLOORS[0].id);
        return;
      }
      const tourItemCount = floorsDone.reduce((a, f) => a + f.itemCount, 0);
      const tourDamagedCount = floorsDone.reduce((a, f) => a + f.damagedCount, 0);
      const tourRec = {
        id: `tour-${Date.now()}`, date: todayStr(), shift, user: displayName, finishedAt: nowIso(),
        floors: floorsDone, itemCount: tourItemCount, damagedCount: tourDamagedCount,
      };
      const newTourHistory = [tourRec, ...tourHistory].slice(0, 200);
      setLastTour(tourRec);
      setTourHistory(newTourHistory);
      setJustFinished(true);
      setAutoSendResult(null);
      await Promise.all([
        sSet("last-tour", tourRec, true),
        sSet("tour-history", newTourHistory, true),
      ]);
      tourBufferRef.current = {};
      try { localStorage.removeItem("pm-local:tour-buffer"); } catch { /* noop */ }
      setTourProgressCount(0);
      setResumedTour(false);
      // El recorrido quedó completo — se regresa al primer piso, en vez de dejarlo parado en el
      // último. Así, si alguien vuelve a entrar más tarde, tiene que pasar por todos los pisos de
      // nuevo (verificando de verdad, no solo el que estaba fuera de servicio) para poder armar
      // otra entrega de turno, en vez de quedarle fácil "reenviar" solo tocando el último piso.
      setFloorId(FLOORS[0].id);
      setView("handoff");

      // Envío automático real: si hay un correo configurado, se manda solo, con el PDF
      // adjunto, sin que nadie tenga que tocar nada. Si falla (sin internet, backend sin
      // configurar, etc.) queda registrado y el técnico puede reintentarlo desde la pantalla.
      if (reportEmail) {
        sendTourEmailAuto(reportEmail, tourRec, account.signature, mySignerCargo).then(async (res) => {
          setAutoSendResult(res);
          await logSentReport({ to: reportEmail, method: "Entrega de turno (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: displayName, sentAt: nowIso() });
        });
      }
    }
  };

  const saveColdRound = async (entries, notes, supervisor, ingeniero) => {
    const ts = nowIso();
    const id = `cf-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestColdValues };
    const newActive = { ...activeIssues };
    const autoResolved = [];

    for (const item of ALL_COLD_ROOM_ITEMS) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, updatedAt: ts, updatedBy: displayName, shift };

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: COLD_ROOMS_FLOOR.name, floorId: COLD_ROOMS_FLOOR.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes, supervisor, ingeniero };
    const newIndex = [idxRec, ...coldRoundsIndex].slice(0, 500);

    const sectionOf = (item) => COLD_ROOMS.includes(item) ? "cuartos" : ICE_MACHINES_AB.includes(item) ? "hielo-ab" : "hielo-linos";
    const record = {
      ...idxRec,
      items: ALL_COLD_ROOM_ITEMS.filter(item => cleanEntries[item.id]).map(item => {
        const e = cleanEntries[item.id];
        const parts = [];
        if (e.status) parts.push(e.status);
        if (e.value !== undefined && e.value !== "") parts.push(`${e.value}${item.u ? " " + item.u : ""}`);
        return {
          code: item.c, name: item.n, hint: item.setpoint, section: sectionOf(item),
          valueStr: parts.join(" · ") || "(sin valor)", damaged: !!e.damaged, observation: e.observation || "",
        };
      }),
    };

    const newColdHistory = { ...coldHistory };
    ALL_COLD_ROOM_ITEMS.filter(item => cleanEntries[item.id]).forEach(item => {
      const e = cleanEntries[item.id];
      const hist = (newColdHistory[item.id] || []).concat([{ status: e.status, value: e.value, damaged: !!e.damaged, at: ts, by: displayName }]).slice(-30);
      newColdHistory[item.id] = hist;
    });

    setLatestColdValues(newLatest); setActiveIssues(newActive); setColdRoundsIndex(newIndex);
    notifyNewDamagedEquipment(activeIssues, newActive);
    setLastColdRound(record); setColdHistory(newColdHistory);
    const newIssueHist = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;
    if (autoResolved.length) setIssueHistory(newIssueHist);
    await Promise.all([
      sSet(`cold-round-${id}`, cleanEntries, true),
      sSet("cold-rounds-index", newIndex, true),
      sSet("latest-cold-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("last-cold-round", record, true),
      sSet("cold-history", newColdHistory, true),
      ...(autoResolved.length ? [sSet("issue-history", newIssueHist, true)] : []),
    ]);
    return record;
  };

  /** Guarda una ronda de un "área" genérica (lavandería o gimnasio): mismo patrón que Cuartos Fríos. */
  const saveAreaRound = async (allItems, syntheticFloor, entries, notes, latestVals, setLatestVals, roundsIdx, setRoundsIdx, latestKey, indexKey) => {
    const ts = nowIso();
    const id = `${syntheticFloor.id}-${Date.now()}`;
    const cleanEntries = {};
    let itemCount = 0, damagedCount = 0;
    const newLatest = { ...latestVals };
    const newActive = { ...activeIssues };
    const autoResolved = [];

    for (const item of allItems) {
      const e = entries[item.id];
      const hasContent = e && (e.status || (e.value !== undefined && e.value !== "") || e.observation || e.damaged);
      if (!hasContent) continue;
      itemCount++;
      cleanEntries[item.id] = { ...e, code: item.c, name: item.n };
      newLatest[item.id] = { ...e, code: item.c, name: item.n, updatedAt: ts, updatedBy: displayName, shift };

      if (e.damaged) {
        damagedCount++;
        if (!newActive[item.id]) {
          newActive[item.id] = {
            equipmentId: item.id, code: item.c, name: item.n, floorName: syntheticFloor.name, floorId: syntheticFloor.id,
            openedAt: ts, openedBy: displayName, shift, observation: e.observation || "(sin observación)",
          };
        } else {
          newActive[item.id] = { ...newActive[item.id], observation: e.observation || newActive[item.id].observation };
        }
      } else if (newActive[item.id]) {
        const prev = newActive[item.id];
        autoResolved.push({
          equipmentId: item.id, code: prev.code, name: prev.name, floorName: prev.floorName, floorId: prev.floorId,
          openedAt: prev.openedAt, openedBy: prev.openedBy, observation: prev.observation,
          resolvedAt: ts, resolvedBy: displayName,
          solution: e.observation || "Resuelto durante la ronda (sin comentario adicional).",
          duration: elapsed(prev.openedAt),
          beforePhotoUrl: prev.beforePhotoUrl || null, afterPhotoUrl: null,
        });
        delete newActive[item.id];
      }
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIdx].slice(0, 500);
    const newIssueHist = autoResolved.length ? [...autoResolved, ...issueHistory].slice(0, 500) : issueHistory;

    setLatestVals(newLatest); setActiveIssues(newActive); setRoundsIdx(newIndex);
    notifyNewDamagedEquipment(activeIssues, newActive);
    if (autoResolved.length) setIssueHistory(newIssueHist);
    await Promise.all([
      sSet(`${syntheticFloor.id}-round-${id}`, cleanEntries, true),
      sSet(indexKey, newIndex, true),
      sSet(latestKey, newLatest, true),
      sSet("active-issues", newActive, true),
      ...(autoResolved.length ? [sSet("issue-history", newIssueHist, true)] : []),
    ]);
    return idxRec;
  };

  const saveLavanderiaRound = (entries, notes) =>
    saveAreaRound(LAVANDERIA_ITEMS, LAVANDERIA_FLOOR, entries, notes, latestLavanderiaValues, setLatestLavanderiaValues,
      lavanderiaRoundsIndex, setLavanderiaRoundsIndex, "latest-lavanderia-values", "lavanderia-rounds-index");

  const saveGymRound = (entries, notes) =>
    saveAreaRound(GYM_ALL_ITEMS, GYM_FLOOR, entries, notes, latestGymValues, setLatestGymValues,
      gymRoundsIndex, setGymRoundsIndex, "latest-gym-values", "gym-rounds-index");

  const saveCalderaRound = async (form) => {
    const ts = nowIso();
    const record = { id: `cald-${Date.now()}`, date: todayStr(), shift, user: displayName, savedAt: ts, ...form };
    const newIndex = [record, ...calderaRoundsIndex].slice(0, 500);
    setCalderaRoundsIndex(newIndex);
    setLastCalderaRound(record);
    await Promise.all([
      sSet("caldera-rounds-index", newIndex, true),
      sSet("last-caldera-round", record, true),
    ]);
    return record;
  };

  const saveMetersRound = async (entries, notes) => {
    const ts = nowIso();
    const id = `mt-${Date.now()}`;
    const cleanEntries = {};
    const newLatest = { ...latestMeterValues };
    const newHistory = { ...meterHistory };
    let itemCount = 0;

    for (const meter of ALL_METERS) {
      const e = entries[meter.id];
      const subs = meter.subs || ["value"];
      const hasContent = e && subs.some(s => e[s] !== undefined && e[s] !== "");
      if (!hasContent) continue;
      itemCount++;

      const prev = newLatest[meter.id] || {};
      const consumos = {};
      subs.forEach(s => {
        if (e[s] !== undefined && e[s] !== "" && prev[s] !== undefined && prev[s] !== "") {
          consumos[s] = Number(e[s]) - Number(prev[s]);
        }
      });

      cleanEntries[meter.id] = { ...e, consumos };
      newLatest[meter.id] = { ...prev, ...e, updatedAt: ts, updatedBy: displayName, shift };

      const hist = (newHistory[meter.id] || []).concat([{ ...e, consumos, at: ts, by: displayName }]).slice(-60);
      newHistory[meter.id] = hist;
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, notes };
    const newIndex = [idxRec, ...meterRoundsIndex].slice(0, 500);

    setLatestMeterValues(newLatest); setMeterHistory(newHistory); setMeterRoundsIndex(newIndex);
    await Promise.all([
      sSet(`meter-round-${id}`, cleanEntries, true),
      sSet("meter-rounds-index", newIndex, true),
      sSet("latest-meter-values", newLatest, true),
      sSet("meter-history", newHistory, true),
    ]);
  };


  const account = profiles[currentUser] || {};
  const displayName = account.display_name || account.email || "—";
  const isAdmin = !!account.is_admin;
  const isAlmacenista = !!account.is_almacenista;
  const isGerencia = !!account.is_gerencia;
  const gerenciaLocked = isGerencia && !isAdmin && !isAlmacenista; // gerencia "pura": solo consulta
  // Si esta cuenta está vinculada a un empleado del Horario Mensual (ver Mi Perfil), se usa su
  // cargo para que la firma en los PDF diga "Nombre — Cargo", no solo el nombre suelto.
  const mySignerCargo = employees.find(e => e.id === account.linked_employee_id)?.cargo || null;

  const coldOutOfRange = useMemo(() => computeColdOutOfRange(latestColdValues), [latestColdValues]);
  const meterAnomalies = useMemo(() => computeMeterAnomalies(meterHistory), [meterHistory]);
  const lowStockItems = useMemo(() => computeLowStock(invItems), [invItems]);
  const criticalStockItems = useMemo(() => computeCriticalStock(invItems), [invItems]);
  const criticalFuelTanks = useMemo(() => {
    return FUEL_ITEMS.filter(it => it.u === "%").map(it => {
      const v = latestValues[it.id];
      return v && v.value !== undefined && v.value !== "" ? { nombre: `${it.n} (${it.floorName})`, pct: Number(v.value) } : null;
    }).filter(t => t && t.pct <= 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestValues]);
  const pendingAccountsCount = useMemo(() => Object.values(profiles).filter(a => a.approved === false).length, [profiles]);
  const shiftAlerts = useMemo(
    () => computeShiftCompletionAlerts(nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex),
    [nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex, lavanderiaRoundsIndex, calderaRoundsIndex]
  );
  const maintenanceDue = useMemo(
    () => computeUpcomingMaintenance(nowClock, mttoEquipos, mttoCronograma),
    [nowClock, mttoEquipos, mttoCronograma]
  );
  const staleIssues = useMemo(() => computeStaleIssues(activeIssues, 15), [activeIssues, nowClock]);

  useEffect(() => {
    if (!isAdmin || pushSubscriptions.length === 0) return;
    const dedupKey = `pm-local:pushed-alerts-${todayStr()}`;
    let already = [];
    try { already = JSON.parse(localStorage.getItem(dedupKey) || "[]"); } catch { /* noop */ }
    const toSend = [];
    shiftAlerts.forEach(a => {
      const tag = `turno:${a.turno}`;
      if (!already.includes(tag)) toSend.push({ tag, title: "⏰ Recorrido pendiente", body: `${a.turno}: ${a.missing.join(", ")}` });
    });
    if (maintenanceDue.items.length > 0) {
      const tag = `mtto:${todayStr()}`;
      if (!already.includes(tag)) toSend.push({ tag, title: "🔧 Mantenimiento por vencer", body: `${maintenanceDue.items.length} equipo(s) del cronograma, quedan ${maintenanceDue.daysLeft} días del mes.` });
    }
    if (toSend.length === 0) return;
    toSend.forEach(t => sendPushToSubscriptions(pushSubscriptions, t.title, t.body, "/"));
    try { localStorage.setItem(dedupKey, JSON.stringify([...already, ...toSend.map(t => t.tag)])); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftAlerts, maintenanceDue, isAdmin, pushSubscriptions]);

  useEffect(() => {
    if (currentUser) checkRecurringTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (gerenciaLocked && !GERENCIA_ALLOWED_VIEWS.includes(view)) setView("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gerenciaLocked, view]);

  useEffect(() => {
    if (currentUser && pendingShelfId) setView("inventory");
  }, [currentUser, pendingShelfId]);

  useEffect(() => {
    if (currentUser && pendingEquipoId) setView("maintenance");
  }, [currentUser, pendingEquipoId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: C.bg, color: C.inkSoft }}>
      <div className="pm-pulse rounded-2xl p-4" style={{ background: C.amber }}>
        <Gauge size={32} color="#fff" />
      </div>
      <span className="text-sm">Cargando…</span>
    </div>
  );
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="max-w-sm text-center">
        <AlertTriangle size={32} style={{ color: C.red, margin: "0 auto 12px" }} />
        <p className="text-sm mb-4" style={{ color: C.ink }}>{loadError}</p>
        <Button onClick={loadAll}>Reintentar</Button>
      </div>
    </div>
  );
  if (!currentUser) return <AuthScreen onLogin={login} onRegister={register} error={authError} busy={authBusy} />;

  if (!account.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
        <div className="max-w-sm text-center rounded-xl border p-6" style={{ borderColor: C.line, background: C.panel }}>
          <Clock size={32} style={{ color: C.amber, margin: "0 auto 12px" }} />
          <h2 className="text-base font-semibold mb-2" style={{ color: C.ink }}>Cuenta pendiente de aprobación</h2>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            Ya creaste tu cuenta, pero un administrador todavía tiene que aprobarla antes de que puedas usar la app.
            Avísale — puede hacerlo desde el Panel de administrador.
          </p>
          <Button variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
        </div>
      </div>
    );
  }

  if (printMode) {
    return <PrintableReport activeIssues={activeIssues} issueHistory={issueHistory} roundsIndex={roundsIndex} onClose={() => setPrintMode(false)} />;
  }

  const floor = FLOORS.find(f => f.id === floorId);
  const activeCount = Object.keys(activeIssues).length;

  const NAV_GROUPS = [
    {
      id: "operacion", label: "Operación", items: [
        { id: "ronda", label: "Ronda de revisión", icon: ClipboardList },
        { id: "coldrooms", label: "Cuartos Fríos", icon: Snowflake, badge: coldOutOfRange.length },
        { id: "meters", label: "Lecturas de Medidores", icon: Zap, badge: meterAnomalies.length },
        { id: "laundry", label: "Equipos de Lavandería", icon: ClipboardList },
        { id: "boiler", label: "Check List Caldera", icon: Gauge },
        { id: "gym", label: "Equipos de Gimnasio", icon: ClipboardList },
        { id: "maintenance", label: "Mantenimiento", icon: Wrench },
        { id: "inventory", label: "Inventario", icon: Package, badge: lowStockItems.length, urgentBadge: false },
        { id: "tasks", label: "Tareas / Pendientes", icon: ClipboardCheck, badge: tasks.filter(t => t.estado !== "hecho").length, urgentBadge: false },
        { id: "issues", label: "Fuera de servicio", icon: Wrench, badge: activeCount },
        { id: "handoff", label: "Entrega de turno", icon: Send, badge: justFinished ? "!" : 0 },
      ],
    },
    {
      id: "historial", label: "Historial y reportes", items: [
        { id: "coldrooms-history", label: "Historial de Cuartos Fríos", icon: CalendarDays },
        { id: "meters-history", label: "Historial de Medidores", icon: CalendarDays },
        ...(isAdmin ? [{ id: "maintenance-log", label: "Mantenimientos Realizados", icon: History }] : []),
        ...(isAdmin ? [{ id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays }] : []),
        { id: "reports", label: "Reportes", icon: History },
        { id: "tanks", label: "Tanques agua potable", icon: Droplets },
        { id: "fuel", label: "Combustibles y gas", icon: Gauge },
        ...(isAdmin ? [{ id: "round-completion", label: "Recorridos completados", icon: ClipboardCheck }] : []),
      ],
    },
    {
      id: "analisis", label: "Análisis", items: [
        ...((isAdmin || isGerencia) ? [{ id: "maintenance-analytics", label: "Análisis de Mantenimiento", icon: TrendingUp }] : []),
        ...((isAdmin || isGerencia) ? [{ id: "executive", label: "Panel Ejecutivo", icon: Gauge }] : []),
        ...((isAdmin || isGerencia) ? [{ id: "analytics", label: "Análisis de fallas", icon: TrendingUp }] : []),
        ...((isAdmin || isAlmacenista) ? [{ id: "inventory-alerts", label: "Alertas de Stock", icon: AlertTriangle, badge: lowStockItems.length, urgentBadge: false }] : []),
        ...((isAdmin || isAlmacenista) ? [{ id: "inventory-movements", label: "Movimientos de Inventario", icon: History }] : []),
      ],
    },
    {
      id: "personal", label: "Personal", items: [
        { id: "schedules", label: "Horario Mensual", icon: Users },
        { id: "my-schedule", label: "Mi horario", icon: CalendarDays },
        { id: "profile", label: "Mi Perfil", icon: User },
        { id: "changelog", label: "Novedades", icon: Sparkles },
      ],
    },
    ...(isAdmin ? [{
      id: "administracion", label: "Administración", items: [
        { id: "admin", label: "Panel de administrador", icon: ShieldCheck, badge: pendingAccountsCount },
        { id: "trash", label: "Papelera", icon: Trash2, badge: trash.length, urgentBadge: false },
        { id: "general-history", label: "Historial de cambios", icon: History },
      ],
    }] : []),
  ].map(g => ({ ...g, items: g.items.filter(n => !gerenciaLocked || GERENCIA_ALLOWED_VIEWS.includes(n.id)) })).filter(g => g.items.length > 0);

  // Un grupo se abre solo si contiene la pantalla en la que estás — así nunca hay que buscar
  // "¿en qué categoría quedó esto?" a ciegas. Además recuerda qué grupos dejaste abiertos a mano.
  const groupContainingView = NAV_GROUPS.find(g => g.items.some(n => n.id === view))?.id;
  const toggleGroup = (gid) => {
    const next = { ...manuallyToggled, [gid]: !isGroupOpen(gid) };
    setManuallyToggled(next);
    try { localStorage.setItem("pm-local:nav-groups-open", JSON.stringify(next)); } catch { /* noop */ }
  };
  function isGroupOpen(gid) {
    if (gid in manuallyToggled) return manuallyToggled[gid];
    return gid === groupContainingView || gid === "operacion"; // "Operación" abierto por defecto
  }

  return (
    <div className="min-h-screen flex" style={{ background: C.bg, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {showOnboarding && <OnboardingTour onClose={closeOnboarding} />}
      {showQrScanner && (
        <QrScannerView
          onClose={() => setShowQrScanner(false)}
          onFoundEquipo={(id) => { setPendingEquipoId(id); setView("maintenance"); setShowQrScanner(false); }}
          onFoundShelf={(id) => { setPendingShelfId(id); setView("inventory"); setShowQrScanner(false); }}
        />
      )}
      {!isOnline && (
        <div className="pm-slide-up-in fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 px-4 py-2"
          style={{ background: "#7a5405" }}>
          <WifiOff size={14} color="#fff" />
          <span className="text-xs font-medium text-white">Sin conexión — lo que guardes (incluidas fotos) se sube solo apenas vuelva la señal.</span>
          {(pendingSync > 0 || pendingPhotoRecords > 0) && <span className="text-xs text-white opacity-90">({pendingSync + pendingPhotoRecords} sin subir)</span>}
        </div>
      )}
      {roundSaveMsg && !roundSaveMsg.ok && (
        <div className="pm-slide-up-in fixed bottom-0 left-0 right-0 z-[110] flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
          style={{ background: "#a31245" }}>
          <span className="text-sm text-white">⚠ {roundSaveMsg.text}</span>
          <Button size="sm" variant="ghost" onClick={() => setRoundSaveMsg(null)}>Entendido</Button>
        </div>
      )}
      {needRefresh && (
        <div className="pm-slide-up-in fixed bottom-0 left-0 right-0 z-[110] flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
          style={{ background: C.steelDark, borderTop: `2px solid ${C.amber}` }}>
          <span className="text-sm text-white">🔄 Hay una versión nueva de la app lista para usar.</span>
          <Button size="sm" onClick={() => {
            if (confirm("Esto va a recargar la app para tomar la versión nueva. Si tienes algo escrito sin guardar (una ronda, una lectura), guárdalo primero. ¿Continuar?")) updateServiceWorker(true);
          }}>Actualizar ahora</Button>
        </div>
      )}
      {/* SIDEBAR */}
      <aside className={`fixed lg:static z-20 top-0 left-0 w-64 shrink-0 transition-transform duration-200 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ transitionTimingFunction: "var(--ease-out)", background: C.steel, height: "100vh" }}>
        <style>{`
          .floor-scroll::-webkit-scrollbar { width: 8px; }
          .floor-scroll::-webkit-scrollbar-track { background: transparent; }
          .floor-scroll::-webkit-scrollbar-thumb { background: #3d5674; border-radius: 8px; }
          .floor-scroll::-webkit-scrollbar-thumb:hover { background: #4d6a8a; }
        `}</style>
        <div className="p-4 border-b shrink-0" style={{ borderColor: "#2a3f56" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: C.amber }}><Gauge size={18} color="#fff" /></div>
              <div>
                <div className="text-white text-sm font-semibold leading-tight">Pisos Mecánicos</div>
                <div className="text-xs" style={{ color: "#8fa3b8" }}>Revisión diaria</div>
              </div>
            </div>
            <button className="lg:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium"
              onClick={() => setSidebarOpen(false)} style={{ color: "#c3d0dd", background: "#2a3f56" }}>
              <ChevronRight size={14} /> Volver
            </button>
          </div>
        </div>
        <div className="floor-scroll p-3 space-y-1" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
          <button onClick={() => { setView("home"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-out active:scale-[0.98] mb-2 ${view === "home" ? "" : "hover:bg-white/5 active:bg-white/10"}`}
            style={{ background: view === "home" ? "#2a3f56" : undefined, color: view === "home" ? "#fff" : "#c3d0dd" }}>
            <Home size={16} />
            <span className="flex-1 text-left">Inicio</span>
          </button>

          {NAV_GROUPS.map(group => {
            const open = isGroupOpen(group.id);
            return (
              <div key={group.id} className="mb-0.5">
                <button onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition hover:bg-white/5"
                  style={{ color: "#7d92a8" }}>
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="flex-1 text-left">{group.label}</span>
                </button>
                {open && (
                  <div className="space-y-0.5 mt-0.5 mb-1">
                    {group.items.map(n => (
                      <button key={n.id} onClick={() => { setView(n.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-2 pl-6 pr-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-out active:scale-[0.98] ${view === n.id ? "" : "hover:bg-white/5 active:bg-white/10"}`}
                        style={{ background: view === n.id ? "#2a3f56" : undefined, color: view === n.id ? "#fff" : "#c3d0dd" }}>
                        <n.icon size={15} />
                        <span className="flex-1 text-left">{n.label}</span>
                        <NavBadge count={n.badge} urgent={n.urgentBadge !== false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {view === "ronda" && (
          <div className="p-3 pt-2 border-t flex flex-col shrink-0" style={{ borderColor: "#2a3f56", maxHeight: "40vh" }}>
            <div className="text-xs font-semibold uppercase tracking-wide px-2 mb-1 shrink-0" style={{ color: "#8fa3b8" }}>
              Pisos ({FLOORS.length}) — desliza para ver todos
            </div>
            <div className="floor-scroll space-y-0.5 pr-1" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
              {FLOORS.map(f => {
                const dmg = f.items.some(it => activeIssues[it.id]);
                return (
                  <button key={f.id} onClick={() => { setFloorId(f.id); setSidebarOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm shrink-0"
                    style={{ background: floorId === f.id ? "#2a3f56" : "transparent", color: floorId === f.id ? "#fff" : "#a9b8c6" }}>
                    <span>{f.name}</span>
                    {dmg && <AlertTriangle size={13} color={C.amber} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b gap-2 flex-wrap" style={{ background: C.panel, borderColor: C.line }}>
          <button className="lg:hidden" onClick={() => setSidebarOpen(v => !v)}>
            <ChevronDown size={20} color={C.ink} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none" }} />
          </button>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
            <Clock size={14} /> {todayStr()}
            {["ronda", "meters", "coldrooms", "laundry", "boiler", "gym"].includes(view) ? (
              <select value={shift} onChange={e => setShift(e.target.value)} className="ml-2 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line, background: C.panel, color: C.ink }}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="ml-2">{nowClock.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {isAdmin && (
            <>
              <GlobalSearch currentView={view} mttoEquipos={mttoEquipos} invItems={invItems} employees={employees} tasks={tasks}
                onNavigate={setView}
                onOpenEquipo={(id) => { setPendingEquipoId(id); setView("maintenance"); }}
                onOpenShelf={(id) => { setPendingShelfId(id); setView("inventory"); }}
                onOpenFloor={(id) => { setFloorId(id); setView("ronda"); }} />
              <button onClick={() => setShowQrScanner(true)} title="Escanear código QR" className="p-1.5 rounded-md shrink-0" style={{ background: C.bg }}>
                <QrCode size={16} color={C.ink} />
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            {pendingSync > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.amberSoft, color: "#7a5405" }}>
                <AlertTriangle size={12} /> {pendingSync} sin subir
                <button
                  onClick={async () => { setRetrying(true); await tryFlush(); setRetrying(false); }}
                  disabled={retrying}
                  className="underline font-semibold disabled:opacity-60"
                  style={{ color: "#7a5405" }}>
                  {retrying ? "Subiendo…" : "Reintentar ahora"}
                </button>
              </span>
            )}
            {pendingPhotoRecords > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.amberSoft, color: "#7a5405" }} title="Registros guardados en este celular con fotos que faltan por subir">
                <Camera size={12} /> {pendingPhotoRecords} foto(s) sin subir
                <button onClick={() => tryFlushPhotos()} className="underline font-semibold" style={{ color: "#7a5405" }}>Reintentar</button>
              </span>
            )}
            {justSynced && pendingSync === 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: "#dff5e3", color: C.green }}>
                <CheckCircle2 size={12} /> Sincronizado
              </span>
            )}
            {justSyncedPhotos && pendingPhotoRecords === 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: "#dff5e3", color: C.green }}>
                <CheckCircle2 size={12} /> Fotos sincronizadas
              </span>
            )}
            <button onClick={() => setShowOnboarding(true)} title="Ver guía de bienvenida" className="p-1.5 rounded-md" style={{ background: C.bg }}>
              <span className="text-xs font-bold w-4 h-4 flex items-center justify-center" style={{ color: C.ink }}>?</span>
            </button>
            <button onClick={toggleTheme} title={darkMode ? "Modo claro" : "Modo oscuro"} className="p-1.5 rounded-md" style={{ background: C.bg }}>
              {darkMode ? <Sun size={16} color={C.amber} /> : <Moon size={16} color={C.ink} />}
            </button>
            {isAdmin && <PushEnableButton onEnable={enablePushNotifications} />}
            {isAdmin && <NotificationBell alerts={shiftAlerts} maintenanceDue={maintenanceDue} staleIssues={staleIssues} criticalStock={criticalStockItems} fuelAlerts={criticalFuelTanks} onNavigate={setView} />}
            {isAdmin && <Pill tone="amber">Admin</Pill>}
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}><User size={14} /> {displayName}</span>
            <Button size="sm" variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-5xl w-full mx-auto">
          {view !== "home" && (
            <button onClick={() => setView("home")}
              className="flex items-center gap-1 text-sm mb-3 px-2 py-1 rounded-md lg:hidden"
              style={{ color: C.inkSoft, background: C.panel, border: `1px solid ${C.line}` }}>
              <ArrowLeft size={14} /> Volver a Inicio
            </button>
          )}
          {view === "home" && (
            <HomeView currentUser={displayName} isAdmin={isAdmin} isAlmacenista={isAlmacenista} isGerencia={isGerencia} onNavigate={setView}
              hasSignature={!!account.signature} onGoToProfile={() => setView("profile")}
              tourProgress={{ done: tourProgressCount, total: FLOORS.length }}
              lowStockDetail={lowStockItems}
              activeIssuesList={Object.values(activeIssues)}
              mttoWeekCount={mttoLog.filter(m => (new Date() - new Date(m.fecha || m.createdAt)) / 864e5 <= 7).length}
              counts={{ activeIssues: activeCount, lowStock: lowStockItems.length, coldOutOfRange: coldOutOfRange.length, meterAnomalies: meterAnomalies.length, justFinished, openTasks: tasks.filter(t => t.estado !== "hecho").length, pendingAccounts: pendingAccountsCount }} />
          )}
          {view === "ronda" && (
            <RoundView floor={floor} currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestValues={latestValues} floorIndex={FLOORS.findIndex(f => f.id === floorId)} floorCount={FLOORS.length}
              onGoFloor={(idx) => setFloorId(FLOORS[idx].id)}
              onResolveIssue={resolveIssue} onSaveRound={saveRound}
              tourProgressCount={tourProgressCount} resumedTour={resumedTour} onDismissResumed={() => setResumedTour(false)} />
          )}
          {view === "coldrooms" && (
            <ColdRoomsView currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestColdValues={latestColdValues} onResolveIssue={resolveIssue} onSaveColdRound={saveColdRound}
              reportEmail={reportEmail} onLogSent={logSentReport} lastColdRound={lastColdRound} coldHistory={coldHistory} mySignature={account.signature} />
          )}
          {view === "coldrooms-history" && (
            <ColdRoomsWeeklyView coldHistory={coldHistory} reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} mySignature={account.signature} />
          )}
          {view === "meters" && (
            <MetersView currentUser={displayName} shift={shift}
              latestMeterValues={latestMeterValues} onSaveMetersRound={saveMetersRound} meterHistory={meterHistory} />
          )}
          {view === "meters-history" && (
            <MetersWeeklyView meterHistory={meterHistory} reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} mySignature={account.signature} />
          )}
          {view === "profile" && (
            <ProfileView currentUser={displayName} mySignature={account.signature} onSaveSignature={updateMySignature}
              employees={employees} linkedEmployeeId={account.linked_employee_id} onSetLinkedEmployee={updateMyLinkedEmployee} onLogoutEverywhere={logoutEverywhere} />
          )}
          {view === "changelog" && (
            <ChangelogView entries={changelogEntries} isAdmin={isAdmin} currentUser={displayName}
              onAddEntry={addChangelogEntry} onDeleteEntry={deleteChangelogEntry} />
          )}
          {view === "my-schedule" && (
            <MyScheduleView employee={employees.find(e => e.id === account.linked_employee_id)} scheduleEntries={scheduleEntries} onGoToProfile={() => setView("profile")} />
          )}
          {view === "handoff" && (
            <HandoffView lastTour={lastTour} tourHistory={tourHistory} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onLogSent={logSentReport} currentUser={displayName} justFinished={justFinished}
              onAckFinished={() => setJustFinished(false)} autoSendResult={autoSendResult}
              mySignature={account.signature} signerCargo={mySignerCargo} onGoToProfile={() => setView("profile")} />
          )}
          {view === "issues" && <IssuesView activeIssues={activeIssues} onResolve={resolveIssue} onCheckIn={checkInIssue} onAttachPhoto={attachIssuePhoto} />}
          {view === "reports" && (
            <ReportsView issueHistory={issueHistory} roundsIndex={roundsIndex} activeIssues={activeIssues} latestValues={latestValues}
              mttoLog={mttoLog} mttoEquipos={mttoEquipos}
              reportEmail={reportEmail} reportWhatsapp={reportWhatsapp} onOpenPrint={() => setPrintMode(true)}
              sentReports={sentReports} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "tanks" && <TanksView latestValues={latestValues} tankHistory={tankHistory} onSaveTankReading={saveTankReading} currentUser={displayName} />}
          {view === "fuel" && <FuelTanksView latestValues={latestValues} fuelHistory={fuelHistory} onNavigate={setView} />}
          {view === "analytics" && (isAdmin || isGerencia) && (
            <EquipmentAnalyticsView issueHistory={issueHistory} activeIssues={activeIssues}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "inventory" && (
            <InventoryView bodegas={bodegas} shelves={shelves} invItems={invItems} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateBodega={createBodega} onCreateShelf={createShelf} onCreateItem={createInvItem}
              onRetiro={doInvRetiro} onEntrada={doInvEntrada} onEditItem={editInvItem} onImportInventory={importFullInventory}
              onDeleteBodega={deleteBodega} onDeleteShelf={deleteShelf}
              initialShelfId={pendingShelfId} onConsumedInitialShelf={() => setPendingShelfId(null)} />
          )}
          {view === "inventory-alerts" && (isAdmin || isAlmacenista) && (
            <StockAlertsView invItems={invItems} invMovements={invMovements} bodegas={bodegas} shelves={shelves}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "inventory-movements" && (isAdmin || isAlmacenista) && (
            <InventoryMovementsView invMovements={invMovements} invItems={invItems} bodegas={bodegas} shelves={shelves}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "maintenance" && (
            <MaintenanceView equipos={mttoEquipos} mttoLog={mttoLog} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateEquipo={createMttoEquipo} onImportCatalog={importMaintenanceFull} onLogMaintenance={logMaintenance} onDeleteEquipo={deleteMttoEquipo}
              initialEquipoId={pendingEquipoId} onConsumedInitialEquipo={() => setPendingEquipoId(null)} />
          )}
          {view === "maintenance-analytics" && (isAdmin || isGerencia) && (
            <MaintenanceAnalyticsView equipos={mttoEquipos} mttoLog={mttoLog} issueHistory={issueHistory} activeIssues={activeIssues}
              roundsIndex={roundsIndex} coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} />
          )}
          {view === "executive" && (isAdmin || isGerencia) && (
            <ExecutivePanelView equipos={mttoEquipos} mttoLog={mttoLog} roundsIndex={roundsIndex}
              coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} currentUser={displayName} tasks={tasks} accounts={profiles} />
          )}
          {view === "maintenance-log" && isAdmin && (
            <MaintenanceLogAuditView equipos={mttoEquipos} mttoLog={mttoLog}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "maintenance-schedule" && isAdmin && (
            <CronogramaAnualView equipos={mttoEquipos} mttoCronograma={mttoCronograma}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "laundry" && (
            <AreaChecklistView title="Equipos de Lavandería" subtitle="Piso 4"
              sections={[{ title: null, items: LAVANDERIA_ITEMS }]} statusOptions={LAVANDERIA_STATUS_OPTS}
              currentUser={displayName} shift={shift} activeIssues={activeIssues} latestValues={latestLavanderiaValues}
              onResolveIssue={resolveIssue} onSaveRound={saveLavanderiaRound} />
          )}
          {view === "boiler" && (
            <CalderaView currentUser={displayName} shift={shift} onSaveCaldera={saveCalderaRound} lastCalderaRound={lastCalderaRound} />
          )}
          {view === "gym" && (
            <AreaChecklistView title="Equipos de Gimnasio" subtitle="Piso 14"
              sections={[
                { title: "Equipos de Cardio", items: GYM_CARDIO_ITEMS },
                { title: "Máquinas de Fuerza", items: GYM_FUERZA_ITEMS },
                { title: "Equipo / Área", items: GYM_AREA_ITEMS },
              ]} statusOptions={GYM_STATUS_OPTS}
              currentUser={displayName} shift={shift} activeIssues={activeIssues} latestValues={latestGymValues}
              onResolveIssue={resolveIssue} onSaveRound={saveGymRound} />
          )}
          {view === "schedules" && (
            <SchedulesView employees={employees} scheduleEntries={scheduleEntries} scheduleEditLog={scheduleEditLog} isAdmin={isAdmin} currentUser={displayName}
              onCreateEmployee={createEmployee} onUpdateEmployee={updateEmployee} onDeleteEmployee={deleteEmployee} onSetScheduleEntry={setScheduleEntry}
              onImportJuly={importJulySchedule2026} onImportAugust={importAugustSchedule2026} onImportExcel={importScheduleFromParsedExcel} onApplyAiDraft={applyAiScheduleDraft} reportEmail={reportEmail} onLogSent={logSentReport} />
          )}
          {view === "tasks" && (
            <TasksView tasks={tasks} accounts={profiles} employees={employees} scheduleEntries={scheduleEntries} currentUser={displayName} currentUsername={currentUser} isAdmin={isAdmin}
              onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />
          )}
          {view === "admin" && isAdmin && (
            <AdminView accounts={profiles} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onSaveEmail={saveReportEmail} onSaveWhatsapp={saveReportWhatsapp}
              onToggleAdmin={toggleAdmin} onToggleAlmacenista={toggleAlmacenista} onToggleGerencia={toggleGerencia} onDeleteAccount={deleteAccount} onResetPassword={resetPassword}
              onApproveAccount={approveAccount} onRejectAccount={rejectAccount} loginLog={loginLog} currentUsername={currentUser} aiUsageStats={aiUsageStats} />
          )}
          {view === "trash" && isAdmin && (
            <TrashView trash={trash} onRestore={restoreFromTrash} onPurge={purgeFromTrash} />
          )}
          {view === "general-history" && isAdmin && (
            <GeneralHistoryView entries={generalEditLog} />
          )}
          {view === "round-completion" && isAdmin && (
            <RoundCompletionView roundsIndex={roundsIndex} tourHistory={tourHistory} />
          )}
        </main>
      </div>
    </div>
  );
}
