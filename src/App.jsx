import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, User, LogOut, ChevronRight, ChevronDown,
  Droplets, ClipboardList, History, Gauge, Wrench, PlusCircle, X, Save, Search,
  Building2, ShieldCheck, MessageCircle, Download, Send, Mail, TrendingUp, Snowflake, Zap, CalendarDays,
  Package, Warehouse, QrCode, PackageMinus, PackagePlus, Trash2, ArrowLeft, Users, Home, Bell, ClipboardCheck
} from "lucide-react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { sGet, sSet, uploadPhoto, getPendingCount, flushOfflineQueue, exportFullBackup } from "./lib/storage";

/* ============================================================
   PALETA / TOKENS
   Panel de control industrial: azul acero oscuro + ámbar de alerta.
   ============================================================ */
const C = {
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
};

const STATUS_OPTS = ["Automático", "Manual", "Apagado"];

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
    { c: 24, n: "Nivel Tanque de ACPM", k: "numeric", u: "gln" },
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
    { c: 149, n: "Nivel Tanque de ACPM", k: "numeric", u: "gln" },
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
    { c: 228, n: "Nivel Tanque de ACPM Contra Incendio HYATT", k: "numeric", u: "%" },
    { c: 229, n: "Nivel Tanque de ACPM Contra Incendio RENTAL", k: "numeric", u: "%" },
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
    { c: 246, n: "Nivel Tanque de ACPM Generador #3", k: "numeric", u: "%" },
    { c: 247, n: "Nivel Tanque Agua Contraincendios", k: "numeric", u: "%" },
    { c: 248, n: "Generador de Energía #4 CUMMINS 375KVA", k: "status" },
    { c: 249, n: "Nivel Tanque de ACPM Generador #4", k: "numeric", u: "%" },
    { c: 250, n: "Generador de Energía #5 PERKINS 625KVA", k: "status" },
    { c: 251, n: "Nivel Tanque de ACPM Generador #5", k: "numeric", u: "%" },
    { c: 252, n: "Lectura Medidor de ACPM Residencias", k: "numeric", u: "gln" },
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
    { c: 300, n: "Muestra de Agua Linos Piso #", k: "sample" },
  ]},
];

// Aplanar con id único por equipo (piso+código) — resuelve códigos duplicados (ej. "24")
FLOORS.forEach(f => f.items.forEach(it => { it.id = `${f.id}-${it.c}`; it.floorId = f.id; it.floorName = f.name; }));
const ALL_ITEMS = FLOORS.flatMap(f => f.items);
const TANK_ITEMS = ALL_ITEMS.filter(it => it.tank);

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

/** Revisa una ronda antes de guardar: qué ítems faltan por llenar, y cuáles están dañados sin comentario. */
function validateRoundEntries(items, entries) {
  const missing = [];
  const missingComment = [];
  items.forEach(item => {
    const e = entries[item.id];
    const hasValue = e && (e.status || (e.value !== undefined && e.value !== "") || e.damaged);
    if (!hasValue) missing.push(item.n);
    if (e?.damaged && !(e.observation || "").trim()) missingComment.push(item.n);
  });
  return { missing, missingComment, ok: missing.length === 0 && missingComment.length === 0 };
}

/**
 * Revisa, para HOY, si cada turno ya cumplió con las rondas que le corresponden según lo estipulado:
 * Mañana (termina 14:00) = Lecturas + Ronda + Cuartos Fríos. Tarde (termina 22:00) = Ronda.
 * Noche (termina 6:00 del día siguiente) = Ronda + Gimnasio. Solo avisa después de que el turno ya terminó.
 */
function computeShiftCompletionAlerts(now, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex) {
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
    if (missing.length) alerts.push({ turno: "Turno mañana (6:00-14:00) de hoy", missing });
  }
  if (hour >= 22) {
    const missing = [];
    if (!hasRound(roundsIndex, todayD, "14:00 – 22:00")) missing.push("Ronda de revisión");
    if (missing.length) alerts.push({ turno: "Turno tarde (14:00-22:00) de hoy", missing });
  }
  if (hour >= 6) {
    const missing = [];
    const nightDone = (idx) => hasRound(idx, todayD, "22:00 – 06:00") || hasRound(idx, yesterdayD, "22:00 – 06:00");
    if (!nightDone(roundsIndex)) missing.push("Ronda de revisión");
    if (!nightDone(gymRoundsIndex)) missing.push("Equipos de Gimnasio");
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
function computeComplianceThisMonth(now, roundsIndex, coldRoundsIndex, meterRoundsIndex) {
  const daysElapsed = now.getDate();
  const month = now.getMonth() + 1, year = now.getFullYear();
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

/** Costo acumulado de mantenimiento, total y por sistema, a partir de lo registrado en la app. */
function computeMaintenanceCost(equipos, mttoLog) {
  const activeEquipos = (equipos || []).filter(e => e.active !== false);
  const bySistema = {};
  let total = 0;
  (mttoLog || []).forEach(r => {
    const costo = Number(r.costo) || 0;
    if (!costo) return;
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
      headers: { "Content-Type": "application/json" },
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
  { code: "pendiente", label: "Pendiente" },
  { code: "en-progreso", label: "En progreso" },
  { code: "espera-repuesto", label: "En espera de repuesto" },
  { code: "hecho", label: "Hecho" },
];
const TASK_STATE_COLORS = {
  "pendiente": { bg: "#eef1f4", fg: "#5c6b7a" },
  "en-progreso": { bg: "#e3f0ff", fg: "#1a4f8a" },
  "espera-repuesto": { bg: "#fff3d6", fg: "#8a5a00" },
  "hecho": { bg: "#dff5e3", fg: "#1c7a34" },
};
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
];
const SPECIAL_CODE_COLORS = {
  VAC: { bg: "#dff5e3", fg: "#1c7a34" },
  LIBRE: { bg: "#eef1f4", fg: "#5c6b7a" },
  INC: { bg: "#ffe3ea", fg: "#a31245" },
  ALT: { bg: "#fff3d6", fg: "#8a5a00" },
};
const WEEKLY_HOURS_TARGET = 42; // igual al que ya usa tu Excel en las columnas "Diferencia semana"

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
async function hashPassword(pw) {
  try {
    const enc = new TextEncoder().encode("pisos-mecanicos-hyatt::" + pw);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback muy básico si el navegador no soporta Web Crypto (poco probable)
    let h = 0; for (let i = 0; i < pw.length; i++) { h = (h * 31 + pw.charCodeAt(i)) | 0; }
    return "fallback-" + h;
  }
}
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
    gray: { bg: "#eef1f4", fg: C.inkSoft },
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
  const base = "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  const styles = {
    primary: { background: C.steel, color: "#fff" },
    amber: { background: C.amber, color: "#fff" },
    red: { background: C.red, color: "#fff" },
    ghost: { background: "transparent", color: C.steel, border: `1px solid ${C.line}` },
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
function AuthScreen({ accounts, onLogin, onRegister, error, busy }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const hasAccounts = Object.keys(accounts).length > 0;

  const submit = () => {
    if (!username.trim() || !password) return;
    if (mode === "register") {
      if (password !== password2) return;
      onRegister(username.trim(), password);
    } else {
      onLogin(username.trim(), password);
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
          <p className="text-sm" style={{ color: "#8fa3b8" }}>Pisos Mecánicos · {mode === "login" ? "Inicia sesión para comenzar el recorrido" : "Crea tu usuario de operador"}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: C.panel }}>
          <div className="flex rounded-md overflow-hidden mb-4 border" style={{ borderColor: C.line }}>
            <button onClick={() => setMode("login")} className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === "login" ? C.steel : C.bg, color: mode === "login" ? "#fff" : C.inkSoft }}>Iniciar sesión</button>
            <button onClick={() => setMode("register")} className="flex-1 py-2 text-sm font-medium"
              style={{ background: mode === "register" ? C.steel : C.bg, color: mode === "register" ? "#fff" : C.inkSoft }}>Crear cuenta</button>
          </div>

          <div className="space-y-2.5">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuario"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
              className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: C.line }} />
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Contraseña"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-3 py-2 pr-16 rounded-md text-sm border outline-none" style={{ borderColor: C.line }}
                onKeyDown={e => { if (e.key === "Enter" && mode === "login") submit(); }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-1" style={{ color: C.gray }}>
                {showPw ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "register" && (
              <input value={password2} onChange={e => setPassword2(e.target.value)} type={showPw ? "text" : "password"} placeholder="Confirmar contraseña"
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md text-sm border outline-none" style={{ borderColor: C.line }}
                onKeyDown={e => { if (e.key === "Enter") submit(); }} />
            )}
            {mode === "register" && password2 && password !== password2 && (
              <div className="text-xs" style={{ color: C.red }}>Las contraseñas no coinciden.</div>
            )}
            {error && <div className="text-xs" style={{ color: C.red }}>{error}</div>}
            {mode === "register" && !hasAccounts && (
              <div className="text-xs rounded-md p-2" style={{ background: C.amberSoft, color: "#7a5405" }}>
                Esta será la primera cuenta del sistema y quedará como <b>administrador</b>.
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
          Acceso básico por usuario y contraseña para identificar cada recorrido. No sustituye un sistema de seguridad corporativo.
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
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: alert ? C.red : C.line, background: alert ? C.redSoft : C.panel }}>
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
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, color: C.ink }}>
              <option value="">Estado…</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {(item.k === "numeric" || item.k === "statusNumeric") && (
            <div className="flex items-center gap-1">
              <input type="number" step="any" value={entry?.value ?? ""} onChange={e => update({ value: e.target.value })}
                placeholder="valor" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
              {item.u && <span className="text-xs" style={{ color: C.gray }}>{item.u}</span>}
            </div>
          )}
          {item.k === "sample" && (
            <div className="flex items-center gap-1.5">
              <input value={entry?.ph ?? ""} onChange={e => update({ ph: e.target.value })} placeholder="PH" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
              <input value={entry?.cloro ?? ""} onChange={e => update({ cloro: e.target.value })} placeholder="Cloro" className="w-16 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
              <input value={entry?.operador ?? ""} onChange={e => update({ operador: e.target.value })} placeholder="Operador" className="w-28 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md cursor-pointer select-none"
            style={{ background: damaged ? C.red : C.bg, color: damaged ? "#fff" : C.inkSoft }}>
            <input type="checkbox" checked={damaged} onChange={e => update({ damaged: e.target.checked })} className="accent-current" />
            Dañado / Fuera de servicio
          </label>
        </div>
      </div>

      <textarea value={entry?.observation ?? ""} onChange={e => update({ observation: e.target.value })}
        placeholder="Observaciones…" rows={1}
        className="w-full mt-2 text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line }} />

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
            className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
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
function RoundView({ floor, currentUser, shift, activeIssues, latestValues, onResolveIssue, onSaveRound, floorIndex, floorCount, onGoFloor }) {
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
          observation: lv.observation, damaged: !!activeIssues[item.id],
        };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true, observation: activeIssues[item.id].observation };
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

  const handleSave = () => {
    const { missing, missingComment } = validateRoundEntries(floor.items, entries);
    if (missingComment.length > 0) {
      setValidationMsg(`Falta el comentario de qué pasó en: ${missingComment.join(", ")}. Los equipos marcados como dañados necesitan una observación antes de guardar.`);
      return;
    }
    if (missing.length > 0) {
      setValidationMsg(`Todavía faltan estos equipos por registrar: ${missing.join(", ")}.`);
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
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={floorIndex === 0} onClick={() => onGoFloor(floorIndex - 1)}>‹ Piso anterior</Button>
        <span className="text-xs font-medium" style={{ color: C.gray }}>Piso {floorIndex + 1} de {floorCount}</span>
        <Button size="sm" variant="ghost" disabled={isLast} onClick={() => onGoFloor(floorIndex + 1)}>Siguiente piso ›</Button>
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

      {floor.items.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestValues[item.id]}
          onResolve={(it, solution) => onResolveIssue(it, solution)} />
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes del recorrido</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales del piso, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line }} />
      </div>

      {validationMsg && (
        <div className="rounded-md p-2 mt-2 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {validationMsg}</div>
      )}

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
function ColdRoomsView({ currentUser, shift, activeIssues, latestColdValues, onResolveIssue, onSaveColdRound, reportEmail, onLogSent, lastColdRound, coldHistory }) {
  const [entries, setEntries] = useState({});
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
        seeded[item.id] = { status: lv.status, value: lv.value, observation: lv.observation, damaged: !!activeIssues[item.id] };
      } else if (activeIssues[item.id]) {
        seeded[item.id] = { damaged: true, observation: activeIssues[item.id].observation };
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
      setSendMsg({ ok: false, text: `Falta el comentario de qué pasó en: ${missingComment.join(", ")}. Los equipos marcados como dañados necesitan una observación antes de guardar.` });
      return;
    }
    if (missing.length > 0) {
      setSendMsg({ ok: false, text: `Todavía faltan estos por registrar: ${missing.join(", ")}.` });
      return;
    }
    onSaveColdRound(entries, notes, supervisor, ingeniero);
    setSaved(true);
    setSendMsg(null);
  };

  const doDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generateColdRoomsWeekPdf(weekGrid, weekLabel, currentUser);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), weekGrid, weekLabel, currentUser);
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

      <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>Cuartos fríos ({COLD_ROOMS.length})</div>
      {COLD_ROOMS.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} hint={item.setpoint}
          outOfRange={isColdRoomOutOfRange(item, entries[item.id]?.value)}
          onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
      ))}

      <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo A&B ({ICE_MACHINES_AB.length})</div>
      {ICE_MACHINES_AB.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
          onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
      ))}

      <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-5" style={{ color: C.inkSoft }}>Máquinas de hielo — Linos / Habitaciones ({ICE_MACHINES_LINOS.length})</div>
      {ICE_MACHINES_LINOS.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} statusOptions={ICE_STATUS_OPTS}
          onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales de la ronda…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-3" style={{ borderColor: C.line }} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Supervisor (opcional)</div>
            <input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Nombre del supervisor"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: C.gray }}>Ingeniero (opcional)</div>
            <input value={ingeniero} onChange={e => setIngeniero(e.target.value)} placeholder="Nombre del ingeniero"
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Operario</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>Guardar ronda</Button>
      </div>
      {saved && <div className="text-right text-sm mt-1 mb-3" style={{ color: C.green }}>✓ Ronda guardada correctamente</div>}
      {sendMsg && !sendMsg.ok && <div className="rounded-md p-2 mt-1 mb-3 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {sendMsg.text}</div>}

      {lastColdRound && !todayIsSunday && (
        <div className="rounded-md p-2 text-xs" style={{ background: "#eef1f4", color: C.inkSoft }}>
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
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
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

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-sm font-medium mb-2" style={{ color: C.ink }}>{meter.n}</div>
      <div className="flex flex-wrap gap-4">
        {subs.map(sub => {
          const val = entry?.[sub];
          const prevVal = previous?.[sub];
          const hasBoth = val !== undefined && val !== "" && prevVal !== undefined && prevVal !== "" && !isNaN(Number(val)) && !isNaN(Number(prevVal));
          const consumo = hasBoth ? Number(val) - Number(prevVal) : null;
          return (
            <div key={sub} className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: C.gray }}>
                {meter.subs ? sub : "Lectura"}{meter.u ? ` (${meter.u})` : ""}
              </label>
              <input type="number" step="any" value={val ?? ""} onChange={e => update(sub, e.target.value)}
                placeholder="valor" className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
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
    </div>
  );
}

function MetersView({ currentUser, shift, latestMeterValues, onSaveMetersRound, meterHistory }) {
  const [entries, setEntries] = useState({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

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

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones generales</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones sobre las lecturas de hoy…"
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line }} />
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
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);

  useEffect(() => {
    const seeded = {};
    allItems.forEach(item => {
      const lv = latestValues[item.id];
      if (lv) seeded[item.id] = { status: lv.status, value: lv.value, observation: lv.observation, damaged: !!activeIssues[item.id] };
      else if (activeIssues[item.id]) seeded[item.id] = { damaged: true, observation: activeIssues[item.id].observation };
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
      setValidationMsg(`Falta el comentario de qué pasó en: ${missingComment.join(", ")}. Los equipos marcados como dañados necesitan una observación antes de guardar.`);
      return;
    }
    if (missing.length > 0) {
      setValidationMsg(`Todavía faltan estos equipos por registrar: ${missing.join(", ")}.`);
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

      {sections.map(sec => (
        <div key={sec.title || "unica"}>
          {sec.title && <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>{sec.title} ({sec.items.length})</div>}
          {sec.items.map(item => (
            <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
              activeIssue={activeIssues[item.id]} previous={latestValues[item.id]} statusOptions={statusOptions}
              onResolve={(iss, solution) => onResolveIssue(iss, solution)} />
          ))}
        </div>
      ))}

      <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Notas importantes</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Observaciones generales, pendientes para el próximo turno, etc."
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line }} />
      </div>

      {validationMsg && (
        <div className="rounded-md p-2 mt-2 text-xs font-medium" style={{ background: C.redSoft, color: C.red }}>⚠ {validationMsg}</div>
      )}

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

      <div className="rounded-lg border p-4 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Purgas (hora)</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Manómetro</label>
            <input type="time" value={form.horaManometro} onChange={e => set("horaManometro", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Mc Donell</label>
            <input type="time" value={form.horaMcDonell} onChange={e => set("horaMcDonell", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Fondo</label>
            <input type="time" value={form.horaFondo} onChange={e => set("horaFondo", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
          <div>
            <label className="text-xs" style={{ color: C.gray }}>Tanque de distribución</label>
            <input type="time" value={form.horaTqDistribucion} onChange={e => set("horaTqDistribucion", e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          </div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Presión</div>
        <div className="mb-1">
          <label className="text-xs" style={{ color: C.gray }}>Vapor (PSI)</label>
          <input type="number" value={form.presionVaporPsi} onChange={e => set("presionVaporPsi", e.target.value)}
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
        </div>
      </div>

      <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.inkSoft }}>Observaciones (opcional)</div>
        <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={2}
          className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y" style={{ borderColor: C.line }} />
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
        <div className="rounded-lg border p-3 mt-4" style={{ borderColor: C.line, background: C.panel }}>
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
function MetersWeeklyView({ meterHistory, reportEmail, onLogSent, currentUser }) {
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
      const doc = await generateMetersWeekPdf(grid, weekLabel, currentUser);
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

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar esta semana (en Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
          <Button size="sm" variant="ghost" onClick={doDownloadPdf}>o descargar en PDF</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
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
                      <td colSpan={grid.days.length + 2} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "#eef1f4", color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: `1px solid ${C.line}` }}>
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
function ColdRoomsWeeklyView({ coldHistory, reportEmail, onLogSent, currentUser }) {
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
      const doc = await generateColdRoomsWeekPdf(grid, weekLabel, currentUser);
      doc.save(`cuartos-frios-semana-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendColdRoomsWeekEmailAuto(emailTo.trim(), grid, weekLabel, currentUser);
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

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
          Descargar / enviar esta semana {weekComplete ? "" : "(semana en curso, aún no termina)"}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
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
                      <td colSpan={grid.days.length + 1} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "#eef1f4", color: C.inkSoft }}>
                        {row.groupTitle}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: `1px solid ${C.line}` }}>
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
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel }}>
      {dataUrl
        ? <img src={dataUrl} alt="Código QR" width={140} height={140} />
        : <div className="w-[140px] h-[140px] flex items-center justify-center text-xs" style={{ color: C.gray }}>Generando…</div>}
      {label && <div className="text-xs text-center" style={{ color: C.inkSoft }}>{label}</div>}
      <Button size="sm" variant="ghost" icon={Download} disabled={!dataUrl} onClick={doDownload}>Descargar QR</Button>
    </div>
  );
}

function BodegasListView({ bodegas, shelves, invItems, canManage, onSelectBodega, onCreateBodega, onImportInventory }) {
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
        <div className="rounded-lg border p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: C.line, background: C.panel }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la bodega nueva"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 200 }} />
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
              <button key={b.id} onClick={() => onSelectBodega(b.id)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: C.line, background: C.panel }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{b.name}</div>
                  {low > 0 && <Pill tone="red">{low} bajo stock</Pill>}
                </div>
                <div className="text-xs mt-1" style={{ color: C.gray }}>
                  {myShelves.length} estantería{myShelves.length !== 1 ? "s" : ""} · {myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BodegaShelvesView({ bodega, shelves, invItems, canManage, onBack, onSelectShelf, onCreateShelf }) {
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
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Crear estantería nueva</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código, ej. A-01"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, width: 140 }} />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Descripción (opcional)"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 160 }} />
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
              <button key={s.id} onClick={() => onSelectShelf(s.id)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: C.line, background: C.panel }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>Estantería {s.code}</div>
                  {low > 0 && <Pill tone="red">{low} bajo stock</Pill>}
                </div>
                {s.name && <div className="text-xs" style={{ color: C.inkSoft }}>{s.name}</div>}
                <div className="text-xs mt-1" style={{ color: C.gray }}>{myItems.length} repuesto{myItems.length !== 1 ? "s" : ""}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShelfDetailView({ bodega, shelf, items, canManage, onBack, onCreateItem, onRetiro, onEntrada }) {
  const [showNewItem, setShowNewItem] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
  const [busyId, setBusyId] = useState(null);
  const [qtyDraft, setQtyDraft] = useState({});

  const doCreateItem = async () => {
    if (!form.name.trim()) return;
    await onCreateItem(shelf.id, bodega.id, form);
    setForm({ name: "", sku: "", unit: "unidad", quantity: "", minThreshold: "" });
    setShowNewItem(false);
  };

  const openMove = (itemId, mode) => setQtyDraft(prev => ({ ...prev, [itemId]: { mode, qty: "", note: "" } }));
  const closeMove = (itemId) => setQtyDraft(prev => { const n = { ...prev }; delete n[itemId]; return n; });

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
              <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del repuesto"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none col-span-2" style={{ borderColor: C.line }} />
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código / SKU (opcional)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unidad (ej. unidad, caja)"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                  <input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Cantidad inicial"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                  <input type="number" min={0} value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Mínimo para alertar"
                    className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
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
        const draft = qtyDraft[item.id];
        return (
          <div key={item.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: low ? C.red : C.line, background: low ? C.redSoft : C.panel }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>
                  {item.name}{item.sku ? <span style={{ color: C.gray }}> · {item.sku}</span> : ""}
                </div>
                <div className="text-xs" style={{ color: C.gray }}>Mínimo: {item.minThreshold} {item.unit}</div>
                {low && <div className="text-xs font-semibold mt-0.5" style={{ color: C.red }}>⚠ Stock bajo — hay que reponer</div>}
              </div>
              <div className="text-xl font-bold" style={{ color: low ? C.red : C.ink }}>
                {item.quantity} <span className="text-xs font-normal" style={{ color: C.gray }}>{item.unit}</span>
              </div>
            </div>

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
                  className="w-20 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line }} />
                <input value={draft.note} onChange={e => setQtyDraft(prev => ({ ...prev, [item.id]: { ...draft, note: e.target.value } }))} placeholder="Motivo (opcional)"
                  className="text-sm border rounded-md px-2 py-1 outline-none flex-1" style={{ borderColor: C.line, minWidth: 140 }} />
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

function InventoryView({ bodegas, shelves, invItems, isAdmin, isAlmacenista, onCreateBodega, onCreateShelf, onCreateItem, onRetiro, onEntrada, onImportInventory, initialShelfId, onConsumedInitialShelf }) {
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
        onCreateItem={onCreateItem} onRetiro={onRetiro} onEntrada={onEntrada} />
    );
  }

  const bodega = selectedBodegaId ? bodegas.find(b => b.id === selectedBodegaId) : null;
  if (bodega) {
    return (
      <BodegaShelvesView bodega={bodega} shelves={shelves.filter(s => s.bodegaId === bodega.id)} invItems={invItems}
        canManage={canManage} onBack={() => setSelectedBodegaId(null)} onSelectShelf={setSelectedShelfId} onCreateShelf={onCreateShelf} />
    );
  }

  return (
    <BodegasListView bodegas={bodegas} shelves={shelves} invItems={invItems} canManage={canManage}
      onSelectBodega={setSelectedBodegaId} onCreateBodega={onCreateBodega} onImportInventory={onImportInventory} />
  );
}

function StockAlertsView({ invItems, bodegas, shelves, reportEmail, onLogSent, currentUser }) {
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const low = useMemo(() => computeLowStock(invItems).map(it => ({
    ...it,
    bodegaName: bodegas.find(b => b.id === it.bodegaId)?.name || "—",
    shelfCode: shelves.find(s => s.id === it.shelfId)?.code || "—",
  })), [invItems, bodegas, shelves]);

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
          <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Lista de compras</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadExcel}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
              <Button size="sm" variant="ghost" onClick={doDownload}>o descargar en PDF</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
                className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
              <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
            </div>
            {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
          </div>

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
function TasksView({ tasks, accounts, currentUser, currentUsername, isAdmin, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [filterEstado, setFilterEstado] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "" });
  const [saving, setSaving] = useState(false);

  const usernames = Object.keys(accounts || {});

  const doCreate = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    await onCreateTask(form);
    setForm({ titulo: "", descripcion: "", prioridad: "media", asignadoA: "", recurrencia: "" });
    setShowNew(false);
    setSaving(false);
  };

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const filtered = tasks
    .filter(t => !filterEstado || t.estado === filterEstado)
    .sort((a, b) => (priorityOrder[a.prioridad] - priorityOrder[b.prioridad]) || (new Date(b.createdAt) - new Date(a.createdAt)));

  const counts = TASK_STATES.reduce((acc, s) => { acc[s.code] = tasks.filter(t => t.estado === s.code).length; return acc; }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Tareas / Pendientes</h2>
          <p className="text-sm" style={{ color: C.inkSoft }}>El buzón de lo que va saliendo en el día a día — cualquiera puede agregar, y se le da prioridad y seguimiento.</p>
        </div>
        <Button icon={PlusCircle} onClick={() => setShowNew(v => !v)}>{showNew ? "Cancelar" : "Nueva tarea"}</Button>
      </div>

      {showNew && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="¿Qué hay que hacer?"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none mb-2" style={{ borderColor: C.line }} />
          <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Detalles (opcional)"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: C.line }} />
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
              {TASK_PRIORITIES.map(p => <option key={p.code} value={p.code}>Prioridad {p.label}</option>)}
            </select>
            <select value={form.asignadoA} onChange={e => setForm(f => ({ ...f, asignadoA: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
              <option value="">Sin asignar</option>
              {usernames.map(u => <option key={u} value={u}>{accounts[u]?.displayName || u}</option>)}
            </select>
            <select value={form.recurrencia} onChange={e => setForm(f => ({ ...f, recurrencia: e.target.value }))}
              className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
              {TASK_RECURRENCES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <Button size="sm" disabled={saving} onClick={doCreate}>{saving ? "Guardando…" : "Crear tarea"}</Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-4">
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

      {filtered.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Nada por aquí — todo al día.</p>
      ) : filtered.map(t => {
        const stateColors = TASK_STATE_COLORS[t.estado];
        const canDelete = isAdmin || t.createdBy === currentUser;
        return (
          <div key={t.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-bold" style={{ color: TASK_PRIORITY_COLORS[t.prioridad] }}>● {TASK_PRIORITIES.find(p => p.code === t.prioridad)?.label}</span>
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{t.titulo}</div>
                </div>
                {t.descripcion && <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{t.descripcion}</div>}
                <div className="text-xs mt-1" style={{ color: C.gray }}>
                  Por {t.createdBy} · {fmtDT(t.createdAt)}{t.asignadoA ? ` · Asignado a ${accounts[t.asignadoA]?.displayName || t.asignadoA}` : ""}
                  {t.recurrencia && ` · 🔁 Se repite ${t.recurrencia === "semanal" ? "cada semana" : "cada mes"}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={t.estado} onChange={e => onUpdateTask(t.id, { estado: e.target.value })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line, background: stateColors.bg, color: stateColors.fg }}>
                  {TASK_STATES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
                {canDelete && (
                  <button onClick={() => onDeleteTask(t.id)} className="p-1"><Trash2 size={14} color={C.gray} /></button>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
        headers: { "Content-Type": "application/json" },
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

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar en Excel</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por repuesto, bodega, estantería o quién lo hizo…"
        className="text-sm border rounded-md px-2 py-2 outline-none w-full mb-3" style={{ borderColor: C.line }} />

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
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
              <tr key={i} style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: `1px solid ${C.line}` }}>
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

function SistemasListView({ equipos, mttoLog, canManage, onSelectSistema, onCreateEquipo, onImportCatalog }) {
  const [sistema, setSistema] = useState("");
  const [nombre, setNombre] = useState("");
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
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar equipo nuevo</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={sistema} onChange={e => setSistema(e.target.value)} placeholder="Sistema (ej. HVAC)"
              className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line, minWidth: 160 }} />
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del equipo"
              className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 200 }} />
            <Button icon={PlusCircle} disabled={creating} onClick={doCreate}>Agregar</Button>
          </div>
        </div>
      )}

      {sistemas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>
          Aún no hay equipos registrados. {canManage ? "Importa el catálogo o agrega uno arriba." : "Pídele a un administrador que los cargue."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sistemas.map(([sistemaName, eqs]) => {
            const outCount = eqs.filter(e => currentEquipoStatus(e.id, mttoLog).outOfService).length;
            return (
              <button key={sistemaName} onClick={() => onSelectSistema(sistemaName)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: C.line, background: C.panel }}>
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

function SistemaEquiposView({ sistema, equipos, mttoLog, onBack, onSelectEquipo }) {
  return (
    <div>
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>Volver a sistemas</Button>
      <h2 className="text-lg font-semibold mt-2 mb-1" style={{ color: C.ink }}>{sistema}</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Elige un equipo para ver su historial o registrar un mantenimiento.</p>

      {equipos.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Sin equipos en este sistema.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {equipos.map(eq => {
            const status = currentEquipoStatus(eq.id, mttoLog);
            const stats = computeEquipoStats(eq, mttoLog);
            return (
              <button key={eq.id} onClick={() => onSelectEquipo(eq.id)}
                className="text-left rounded-lg border p-3 hover:shadow-sm transition" style={{ borderColor: status.outOfService ? C.red : C.line, background: status.outOfService ? C.redSoft : C.panel }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{eq.nombre}</div>
                  {status.outOfService && <Pill tone="red">Fuera de servicio</Pill>}
                </div>
                <div className="text-xs mt-1" style={{ color: C.gray }}>{stats.total} mantenimiento{stats.total !== 1 ? "s" : ""} registrado{stats.total !== 1 ? "s" : ""}</div>
              </button>
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
            <img src={typeof f === "string" ? f : URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line }} />
            <button type="button" onClick={() => removeAt(i)} className="absolute -top-1.5 -right-1.5 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              style={{ background: C.red, color: "#fff" }}>×</button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center text-xs" style={{ borderColor: C.line, color: C.gray }}>
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
      const uploadedUrls = [];
      for (const p of photos) {
        if (typeof p === "string") { uploadedUrls.push(p); continue; }
        const url = await uploadPhoto(p, `equipo-${equipo.id}`);
        uploadedUrls.push(url);
      }
      await onLogMaintenance(equipo.id, { tipo, descripcion: descripcion.trim(), estado, costo, fotos: uploadedUrls });
      setDescripcion(""); setCosto(""); setPhotos([]); setTipo("preventivo"); setEstado("funcionando");
      setSaveMsg({ ok: true, text: "✓ Mantenimiento registrado." });
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message || "No se pudo guardar. Revisa la conexión." });
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
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg border shrink-0" style={{ borderColor: C.line, background: C.panel }}>
          <Button size="sm" variant="ghost" icon={Download} disabled={downloadingQr} onClick={doDownloadQr}>{downloadingQr ? "Generando…" : "Descargar QR"}</Button>
        </div>

        <div className="flex-1 min-w-[260px] rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Registrar mantenimiento</div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
              {MTTO_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
              {MTTO_ESTADOS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <input type="number" min="0" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Costo (opcional)"
              className="text-sm border rounded-md px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line }} />
          </div>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="¿Qué se hizo?"
            className="w-full text-sm border rounded-md px-2 py-1.5 outline-none resize-y mb-2" style={{ borderColor: C.line }} />
          <div className="text-xs mb-1" style={{ color: C.gray }}>Fotos (opcional, hasta 2)</div>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <div className="mt-2">
            <Button size="sm" disabled={saving} onClick={doSave}>{saving ? "Guardando…" : "Guardar registro"}</Button>
          </div>
          {saveMsg && <div className="text-xs mt-2" style={{ color: saveMsg.ok ? C.green : C.red }}>{saveMsg.text}</div>}
        </div>
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
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line }} />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MaintenanceView({ equipos, mttoLog, isAdmin, isAlmacenista, onCreateEquipo, onImportCatalog, onLogMaintenance, initialEquipoId, onConsumedInitialEquipo }) {
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
    return <SistemaEquiposView sistema={selectedSistema} equipos={eqs} mttoLog={mttoLog} onBack={() => setSelectedSistema(null)} onSelectEquipo={setSelectedEquipoId} />;
  }

  return (
    <SistemasListView equipos={equipos} mttoLog={mttoLog} canManage={canManage}
      onSelectSistema={setSelectedSistema} onCreateEquipo={onCreateEquipo} onImportCatalog={onImportCatalog} />
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
        headers: { "Content-Type": "application/json" },
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

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar en Excel</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por equipo, sistema, técnico o descripción…"
          className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 200 }} />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line }}>
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
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border" style={{ borderColor: C.line }} />
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
function ExecutivePanelView({ equipos, mttoLog, roundsIndex, coldRoundsIndex, meterRoundsIndex, currentUser }) {
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);
  const now = new Date();

  const uptime = useMemo(() => computeUptimeBySystem(equipos, mttoLog), [equipos, mttoLog]);
  const compliance = useMemo(() => computeComplianceThisMonth(now, roundsIndex, coldRoundsIndex, meterRoundsIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsIndex, coldRoundsIndex, meterRoundsIndex]);
  const cost = useMemo(() => computeMaintenanceCost(equipos, mttoLog), [equipos, mttoLog]);
  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateExecutivePdf(uptime, compliance, cost, currentUser);
      doc.save(`panel-ejecutivo-${todayStr().replace(/\//g, "-")}.pdf`);
    } catch { setMsg("No se pudo generar el PDF."); }
    setDownloading(false);
  };

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

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Disponibilidad promedio</div>
          <div className="text-3xl font-bold mt-1" style={{ color: avgUptime >= 90 ? C.green : C.red }}>{avgUptime}%</div>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Cumplimiento de rondas</div>
          <div className="text-3xl font-bold mt-1" style={{ color: compliance.ronda.pct >= 90 ? C.green : C.red }}>{compliance.ronda.pct}%</div>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Costo de mantenimiento (mes)</div>
          <div className="text-2xl font-bold mt-1" style={{ color: C.ink }}>{cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—"}</div>
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Disponibilidad de equipos por sistema</div>
      <div className="rounded-lg border mb-5 overflow-hidden" style={{ borderColor: C.line }}>
        {uptime.map((u, i) => (
          <div key={u.sistema} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <span style={{ color: C.ink }}>{u.sistema}</span>
            <span className="flex items-center gap-2">
              {u.fuera > 0 && <span style={{ color: C.red }}>{u.fuera} fuera de servicio</span>}
              <span className="font-semibold" style={{ color: u.pct >= 90 ? C.green : C.red }}>{u.pct}%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Cumplimiento de rondas este mes</div>
      <div className="rounded-lg border mb-5 overflow-hidden" style={{ borderColor: C.line }}>
        {[
          { label: "Ronda de revisión", c: compliance.ronda },
          { label: "Cuartos Fríos", c: compliance.cuartosFrios },
          { label: "Lecturas de Medidores", c: compliance.medidores },
        ].map((row, i) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <span style={{ color: C.ink }}>{row.label}</span>
            <span>
              <span style={{ color: C.gray }}>{row.c.actual}/{row.c.expected}</span>{" "}
              <span className="font-semibold" style={{ color: row.c.pct >= 90 ? C.green : C.red }}>({row.c.pct}%)</span>
            </span>
          </div>
        ))}
      </div>

      {cost.bySistema.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Costo de mantenimiento por sistema</div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.line }}>
            {cost.bySistema.slice(0, 10).map(([sistema, c], i) => (
              <div key={sistema} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: i ? `1px solid ${C.line}` : "none" }}>
                <span style={{ color: C.ink }}>{sistema}</span>
                <span className="font-semibold" style={{ color: C.ink }}>${c.toLocaleString("es-CO")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MaintenanceAnalyticsView({ equipos, mttoLog }) {
  const activeEquipos = equipos.filter(e => e.active !== false);

  const bySistema = useMemo(() => {
    const map = {};
    mttoLog.forEach(r => {
      const eq = activeEquipos.find(e => e.id === r.equipoId);
      if (!eq) return;
      map[eq.sistema] = (map[eq.sistema] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([sistema, mantenimientos]) => ({ sistema, mantenimientos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const topCorrectivos = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, stats: computeEquipoStats(eq, mttoLog) }))
      .filter(x => x.stats.correctivos > 0)
      .sort((a, b) => b.stats.correctivos - a.stats.correctivos)
      .slice(0, 10)
      .map(x => ({ label: x.eq.nombre, fallas: x.stats.correctivos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mttoLog, equipos]);

  const outOfService = useMemo(() => {
    return activeEquipos
      .map(eq => ({ eq, status: currentEquipoStatus(eq.id, mttoLog), stats: computeEquipoStats(eq, mttoLog) }))
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

  const totalMantenimientos = mttoLog.length;
  const totalCosto = mttoLog.reduce((s, r) => s + (Number(r.costo) || 0), 0);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Análisis de Mantenimiento</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Historial de mantenimientos y fallas por equipo, para decidir con datos si vale la pena seguir reparando algo o es mejor reemplazarlo.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Fuera de servicio ahora</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: outOfService.length ? C.red : C.ink }}>{outOfService.length}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Mantenimientos registrados</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: C.ink }}>{totalMantenimientos}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Costo acumulado registrado</div>
          <div className="text-lg font-semibold mt-1" style={{ color: C.ink }}>{totalCosto ? `$${totalCosto.toLocaleString("es-CO")}` : "—"}</div>
        </div>
      </div>

      {totalMantenimientos === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>Todavía no hay mantenimientos registrados desde la app.</p>
      ) : (
        <>
          {bySistema.length > 0 && (
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Mantenimientos por sistema</div>
              <ResponsiveContainer width="100%" height={Math.max(180, bySistema.length * 30)}>
                <BarChart data={bySistema} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="sistema" width={160} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="mantenimientos" fill={C.blue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {topCorrectivos.length > 0 && (
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Equipos con más fallas (correctivos)</div>
              <ResponsiveContainer width="100%" height={Math.max(180, topCorrectivos.length * 30)}>
                <BarChart data={topCorrectivos} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="fallas" fill={C.red} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {replaceCandidates.length > 0 && (
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.amber, background: C.amberSoft }}>
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
            <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Fuera de servicio ahora mismo</div>
              {outOfService.map(({ eq, status }) => (
                <div key={eq.id} className="text-xs py-1.5 border-b last:border-0 flex items-center justify-between" style={{ borderColor: C.line }}>
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
        headers: { "Content-Type": "application/json" },
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
          className="text-sm border rounded-md px-2 py-2 outline-none" style={{ borderColor: C.line }}>
          {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs" style={{ color: C.gray }}>
          <span style={{ color: C.green }}>■</span> Ejecutado &nbsp;
          <span style={{ color: C.red }}>■</span> Atrasado &nbsp;
          <span style={{ color: "#7a5405" }}>■</span> Pendiente
        </span>
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este sistema (Excel)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar Excel"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con Excel adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
        <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 220 }}>Equipo</th>
              {MESES_LABELS.map(m => <th key={m} className="px-2 py-2 text-center" style={{ minWidth: 56 }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {eqInSistema.map((eq, i) => (
              <tr key={eq.id} style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: `1px solid ${C.line}` }}>
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

function EmployeeManagePanel({ employees, onCreateEmployee, onUpdateEmployee }) {
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
    <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Agregar empleado</div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo"
          className="text-sm border rounded-md px-2 py-1.5 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
        <select value={cargo} onChange={e => setCargo(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
          <option value="">Cargo…</option>
          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={restDay} onChange={e => setRestDay(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
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
            <div key={emp.id} className="flex items-center justify-between py-1.5 border-b last:border-0 flex-wrap gap-2" style={{ borderColor: C.line }}>
              <div className="text-sm" style={{ color: C.ink }}>
                {emp.name}
                {!emp.active && <span className="text-xs" style={{ color: C.gray }}> · Inactivo</span>}
              </div>
              <div className="flex items-center gap-2">
                <select value={emp.cargo || ""} onChange={e => onUpdateEmployee(emp.id, { cargo: e.target.value })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line }}>
                  <option value="">Cargo…</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={emp.fixedRestDay ?? ""} onChange={e => onUpdateEmployee(emp.id, { fixedRestDay: e.target.value === "" ? null : Number(e.target.value) })}
                  className="text-xs border rounded-md px-1.5 py-1 outline-none" style={{ borderColor: C.line }}>
                  <option value="">Sin descanso fijo</option>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <Button size="sm" variant="ghost" onClick={() => onUpdateEmployee(emp.id, { active: !emp.active })}>{emp.active ? "Desactivar" : "Activar"}</Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SchedulesView({ employees, scheduleEntries, isAdmin, currentUser, onCreateEmployee, onUpdateEmployee, onSetScheduleEntry, onImportJuly, reportEmail, onLogSent }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showManage, setShowManage] = useState(false);
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

  const sortedEmployees = useMemo(() => {
    const order = [...CARGOS, ""];
    return [...activeEmployees].sort((a, b) => order.indexOf(a.cargo || "") - order.indexOf(b.cargo || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployees]);

  const openCell = (employeeId, dateIso) => {
    const entry = entriesByEmployee[employeeId]?.[dateIso];
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
    onSetScheduleEntry(editingCell.employeeId, editingCell.dateIso, patch);
    setEditingCell(null);
  };

  // ---- Vista previa de impacto: recalcula la semana de la celda que se está editando, CON el cambio en borrador ----
  const impact = useMemo(() => {
    if (!editingCell) return null;
    const week = weeks.find(w => w.includes(editingCell.dateIso));
    if (!week) return null;
    const entries = entriesByEmployee[editingCell.employeeId] || {};
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
  }, [editingCell, draftMode, draftEntrada, draftSalida, draftCode, entriesByEmployee]);

  const doImport = async () => {
    setImporting(true); setImportMsg(null);
    try {
      const res = await onImportJuly();
      setImportMsg({ ok: true, text: `Listo: ${res.newEmployeesCount} empleado(s) nuevo(s) creados, ${res.entriesCount} registros de horario cargados (16 jul – 2 ago 2026).` });
    } catch {
      setImportMsg({ ok: false, text: "No se pudo importar. Intenta de nuevo." });
    }
    setImporting(false);
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

  const employeeWarnings = activeEmployees.map(emp => ({
    emp, ...computeScheduleWarnings(emp, daysIso, entriesByEmployee[emp.id] || {}),
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
        {isAdmin && <Button size="sm" variant="ghost" onClick={() => setShowManage(v => !v)}>{showManage ? "Ocultar gestión" : "Gestionar empleados"}</Button>}
      </div>

      {!isAdmin && (
        <div className="rounded-md p-2 mb-3 text-xs" style={{ background: C.blueSoft, color: "#274c6e" }}>
          Solo puedes ver el horario. Si necesitas un cambio, pídeselo a un administrador.
        </div>
      )}

      {isAdmin && (
        <div className="rounded-md p-2 mb-3 text-xs flex items-center justify-between gap-2 flex-wrap" style={{ background: C.amberSoft, color: "#7a5405" }}>
          <span>¿Primera vez usando esto? Importa de una vez el horario real de julio (16 jul – 2 ago 2026) desde el Excel que ya me diste.</span>
          <Button size="sm" disabled={importing} onClick={doImport}>{importing ? "Importando…" : "Importar horario de julio 2026"}</Button>
        </div>
      )}
      {importMsg && <div className="text-xs mb-3" style={{ color: importMsg.ok ? C.green : C.red }}>{importMsg.text}</div>}

      {isAdmin && showManage && <EmployeeManagePanel employees={employees} onCreateEmployee={onCreateEmployee} onUpdateEmployee={onUpdateEmployee} />}

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
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
              <input type="number" step="0.5" value={draftSalida} onChange={e => setDraftSalida(e.target.value)} placeholder="Salida (ej. 16.5)"
                className="w-32 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
              <span className="text-xs" style={{ color: C.gray }}>Formato decimal: 8.5 = 8:30, 16.5 = 4:30 p.m.</span>
            </div>
          ) : (
            <div className="mb-2">
              <select value={draftCode} onChange={e => setDraftCode(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
                <option value="">(elegir)</option>
                {SPECIAL_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
          )}

          <input value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="Nota (opcional)"
            className="text-sm border rounded-md px-2 py-1.5 outline-none w-full mb-2" style={{ borderColor: C.line }} />

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

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar este mes</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownload}>{downloading ? "Generando…" : "Descargar PDF"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSend}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {msg && <div className="text-xs mt-2" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>

      <div className="text-xs mb-2" style={{ color: C.gray }}>
        Encabezado en rojo = domingo o festivo. Cada celda muestra hora de entrada-salida (ej. 8.5-16.5). Las alertas (⚠) son una ayuda
        visual según las reglas que nos diste — no reemplazan la revisión de las normas laborales vigentes.
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
        <table className="text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.steelDark, color: "#fff" }}>
              <th className="text-left px-2 py-2" style={{ minWidth: 150 }}>Empleado</th>
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
                const entries = entriesByEmployee[emp.id] || {};
                const { sundaysHolidaysCount, warnings } = computeScheduleWarnings(emp, daysIso, entries);
                const monthTotal = weeks.reduce((sum, w) => sum + weekTotalHours(w, entries), 0);
                const showGroupHeader = (emp.cargo || "") !== lastCargo;
                lastCargo = emp.cargo || "";
                return (
                  <React.Fragment key={emp.id}>
                    {showGroupHeader && (
                      <tr>
                        <td colSpan={daysIso.length + 3} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "#eef1f4", color: C.inkSoft }}>
                          {emp.cargo || "Sin cargo asignado"}
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: i % 2 ? "#fafbfc" : "#fff", borderTop: `1px solid ${C.line}` }}>
                      <td className="px-2 py-1.5" style={{ color: C.ink, fontWeight: 500 }}>
                        {emp.name}
                        {warnings.length > 0 && <AlertTriangle size={12} style={{ display: "inline", color: C.red, marginLeft: 4, verticalAlign: "-1px" }} />}
                      </td>
                      {daysIso.map(d => {
                        const entry = entries[d];
                        const colors = entry?.code ? SPECIAL_CODE_COLORS[entry.code] : null;
                        return (
                          <td key={d} className="px-0.5 py-1 text-center" style={{ background: colors?.bg || (isSundayOrHoliday(d) ? "#fdf2f2" : "transparent") }}>
                            {isAdmin ? (
                              <button onClick={() => openCell(emp.id, d)} className="w-full text-xs py-1" style={{ color: colors?.fg || C.ink }}>
                                {fmtEntryShort(entry) || "·"}
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
function NotificationBell({ alerts, maintenanceDue, onNavigate }) {
  const [open, setOpen] = useState(false);
  const shortcuts = {
    "Lecturas de Medidores": "meters", "Ronda de revisión": "ronda", "Cuartos Fríos": "coldrooms", "Equipos de Gimnasio": "gym",
  };
  const totalCount = alerts.length + (maintenanceDue?.items?.length ? 1 : 0);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-1.5 rounded-md" style={{ background: C.bg }}>
        <Bell size={16} color={C.ink} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: C.red, color: "#fff" }}>
            {totalCount}
          </span>
        )}
      </button>
      {open && (
        <>
          {/* fondo invisible: tocar en cualquier parte fuera del panel lo cierra */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-lg border shadow-lg z-50 max-h-[70vh] overflow-y-auto"
            style={{ background: "#fff", borderColor: C.line }}>
            <div className="flex items-center justify-between p-3 border-b sticky top-0" style={{ borderColor: C.line, background: "#fff" }}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Notificaciones</div>
              <button onClick={() => setOpen(false)} className="p-0.5"><X size={14} color={C.gray} /></button>
            </div>

            <div className="p-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Recorridos pendientes de hoy</div>
            {alerts.length === 0 ? (
              <div className="px-3 pb-3 text-xs" style={{ color: C.gray }}>Todo al día — ningún turno tiene pendientes por ahora.</div>
            ) : alerts.map((a, i) => (
              <div key={i} className="p-3 border-b last:border-0" style={{ borderColor: C.line }}>
                <div className="text-xs font-semibold mb-1" style={{ color: C.red }}>{a.turno}</div>
                {a.missing.map((m, j) => (
                  <button key={j} onClick={() => { onNavigate(shortcuts[m] || "home"); setOpen(false); }}
                    className="block text-xs text-left w-full py-0.5" style={{ color: C.ink }}>
                    · {m} — sin registrar
                  </button>
                ))}
              </div>
            ))}

            {maintenanceDue && (
              <>
                <div className="p-3 pb-1 border-t text-xs font-semibold uppercase tracking-wide" style={{ borderColor: C.line, color: C.inkSoft }}>
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
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64 rounded-lg border shadow-lg z-50 p-3 text-xs"
          style={{ background: "#fff", borderColor: C.line, color: msg.ok ? C.green : C.red }}>
          {msg.message}
        </div>
      )}
    </div>
  );
}

function HomeView({ currentUser, isAdmin, isAlmacenista, onNavigate, counts }) {
  const canManageInv = isAdmin || isAlmacenista;
  const modules = [
    { id: "ronda", label: "Ronda de revisión", icon: ClipboardList, desc: "Revisión diaria de los 12 pisos mecánicos", access: true },
    { id: "coldrooms", label: "Cuartos Fríos", icon: Snowflake, desc: "Cuartos fríos y máquinas de hielo", access: true, badge: counts.coldOutOfRange },
    { id: "coldrooms-history", label: "Historial de Cuartos Fríos", icon: CalendarDays, desc: "Semana a semana, con envío", access: true },
    { id: "meters", label: "Lecturas de Medidores", icon: Zap, desc: "Consumo de servicios públicos", access: true, badge: counts.meterAnomalies },
    { id: "meters-history", label: "Historial de Medidores", icon: CalendarDays, desc: "Semana a semana, con envío", access: true },
    { id: "inventory", label: "Inventario", icon: Package, desc: "Bodegas, estanterías y repuestos", access: true, badge: counts.lowStock },
    { id: "inventory-alerts", label: "Alertas de Stock", icon: AlertTriangle, desc: "Lista de compras automática", access: canManageInv, badge: counts.lowStock },
    { id: "inventory-movements", label: "Movimientos de Inventario", icon: History, desc: "Quién retiró qué, y cuándo", access: canManageInv },
    { id: "maintenance", label: "Mantenimiento", icon: Wrench, desc: "Registrar mantenimientos por QR", access: true },
    { id: "maintenance-analytics", label: "Análisis de Mantenimiento", icon: TrendingUp, desc: "Gráficas, fallas y reemplazos", access: isAdmin },
    { id: "executive", label: "Panel Ejecutivo", icon: Gauge, desc: "KPIs para la gerencia", access: isAdmin },
    { id: "maintenance-log", label: "Mantenimientos Realizados", icon: History, desc: "Auditoría de lo registrado", access: isAdmin },
    { id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays, desc: "Seguimiento del año completo", access: isAdmin },
    { id: "laundry", label: "Equipos de Lavandería", icon: ClipboardList, desc: "Revisión diaria, Piso 4", access: true },
    { id: "boiler", label: "Check List Caldera", icon: Gauge, desc: "Purgas y presión por turno", access: true },
    { id: "gym", label: "Equipos de Gimnasio", icon: ClipboardList, desc: "Revisión diaria, Piso 14", access: true },
    { id: "schedules", label: "Horario Mensual", icon: Users, desc: "Turnos del personal", access: true },
    { id: "tasks", label: "Tareas / Pendientes", icon: ClipboardCheck, desc: "El buzón de lo que va saliendo", access: true, badge: counts.openTasks },
    { id: "handoff", label: "Entrega de turno", icon: Send, desc: "Resumen del recorrido, por correo", access: true, badge: counts.justFinished ? "!" : 0 },
    { id: "issues", label: "Fuera de servicio", icon: Wrench, desc: "Equipos dañados activos", access: true, badge: counts.activeIssues },
    { id: "reports", label: "Reportes", icon: History, desc: "Informe completo en PDF", access: true },
    { id: "tanks", label: "Tanques agua potable", icon: Droplets, desc: "Niveles, con edición manual", access: true },
    { id: "analytics", label: "Análisis de fallas", icon: TrendingUp, desc: "Historial de equipos dañados", access: isAdmin },
    { id: "admin", label: "Panel de administrador", icon: ShieldCheck, desc: "Usuarios, correo, permisos", access: isAdmin },
  ];

  return (
    <div>
      <div className="rounded-xl p-4 mb-5" style={{ background: C.steelDark }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-white text-lg font-semibold">Hola, {currentUser}</div>
            <div className="text-sm" style={{ color: "#8fa3b8" }}>
              {isAdmin ? "Administrador" : isAlmacenista ? "Almacenista" : "Operador"} · {todayStr()}
            </div>
          </div>
          <Gauge size={28} color={C.amber} />
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
        Esto es lo que puedes usar con tu cuenta. Lo que aparece atenuado necesita más permisos — pídeselo a un administrador si lo necesitas.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {modules.map(m => (
          <button key={m.id} disabled={!m.access} onClick={() => m.access && onNavigate(m.id)}
            className="text-left rounded-lg border p-3 transition"
            style={{
              borderColor: C.line, background: m.access ? C.panel : "#f3f4f6",
              opacity: m.access ? 1 : 0.55, cursor: m.access ? "pointer" : "not-allowed",
            }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <m.icon size={16} style={{ color: m.access ? C.amber : C.gray }} />
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{m.label}</div>
              </div>
              {!!m.badge && <span className="text-xs font-bold px-1.5 rounded-full" style={{ background: C.red, color: "#fff" }}>{m.badge}</span>}
            </div>
            <div className="text-xs" style={{ color: C.gray }}>{m.access ? m.desc : "Solo administradores" + (m.id.startsWith("inventory") ? " o almacenista" : "")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   VISTA: EQUIPOS FUERA DE SERVICIO
   ============================================================ */
function IssuesView({ activeIssues, onResolve }) {
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
      {list.map(iss => <IssueResolveCard key={iss.equipmentId} iss={iss} onResolve={onResolve} />)}
    </div>
  );
}

function IssueResolveCard({ iss, onResolve }) {
  const [open, setOpen] = useState(false);
  const [solution, setSolution] = useState("");
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
        </div>
        {!open ? <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Marcar resuelto</Button> : null}
      </div>
      {open && (
        <div className="flex items-center gap-2 mt-2">
          <input value={solution} onChange={e => setSolution(e.target.value)} placeholder="Solución aplicada…"
            className="flex-1 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
          <Button size="sm" icon={CheckCircle2} disabled={!solution.trim()}
            onClick={() => { onResolve(iss, solution.trim()); setOpen(false); setSolution(""); }}>Confirmar</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISTA: HISTORIAL / REPORTES
   ============================================================ */
function ReportsView({ issueHistory, roundsIndex, activeIssues, latestValues, reportEmail, reportWhatsapp, onOpenPrint, sentReports, onLogSent, currentUser }) {
  const [tab, setTab] = useState("incidentes");
  const [q, setQ] = useState("");
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [waTo, setWaTo] = useState(reportWhatsapp || "");
  const [sendMsg, setSendMsg] = useState(null);
  const [downloadMsg, setDownloadMsg] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingAutoFull, setSendingAutoFull] = useState(false);

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

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Reportes</h2>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Genera el informe completo en PDF, o comparte un resumen por correo/WhatsApp.</p>

      <div className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
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
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAutoFull} onClick={doSendAutoFull}>{sendingAutoFull ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={doOpenMailClient}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp (envía un resumen en texto, no el PDF adjunto)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número con indicativo, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
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

      <div className="flex items-center gap-2 mb-3 flex-wrap mt-3">
        <Button size="sm" variant={tab === "incidentes" ? "primary" : "ghost"} onClick={() => setTab("incidentes")}>Historial de incidentes</Button>
        <Button size="sm" variant={tab === "rondas" ? "primary" : "ghost"} onClick={() => setTab("rondas")}>Rondas registradas</Button>
        <Button size="sm" variant={tab === "enviados" ? "primary" : "ghost"} onClick={() => setTab("enviados")}>Informes enviados</Button>
        <div className="ml-auto flex items-center gap-1.5 border rounded-md px-2 py-1" style={{ borderColor: C.line }}>
          <Search size={13} color={C.gray} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="text-sm outline-none" />
        </div>
      </div>

      {tab === "incidentes" && (
        <div>
          {filteredIssues.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Sin incidentes resueltos registrados aún.</div>}
          {filteredIssues.map((h, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
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
            </div>
          ))}
        </div>
      )}

      {tab === "rondas" && (
        <div>
          {filteredRounds.length === 0 && <div className="text-sm py-6 text-center" style={{ color: C.gray }}>Aún no se han guardado rondas.</div>}
          {filteredRounds.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 mb-2 flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line, background: C.panel }}>
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
            <div key={i} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
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

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={90} tick={{ fontSize: 10, fill: C.inkSoft }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.inkSoft }} unit="%" />
            <Tooltip formatter={(v) => v === null ? "Sin datos" : `${v}%`} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={colorFor(d.value)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
            <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
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
                    placeholder="0-100" className="w-24 text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
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
                <ResponsiveContainer width="100%" height={70}>
                  <LineChart data={hist}>
                    <Line type="monotone" dataKey="v" stroke={C.blue} strokeWidth={2} dot={false} />
                    <YAxis domain={[0, 100]} hide />
                  </LineChart>
                </ResponsiveContainer>
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
async function generateTourPdf(tour) {
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

  pdfFooterAll(doc);
  return doc;
}


/**
 * Envío REAL y automático del correo con el PDF adjunto: genera el PDF en el navegador,
 * lo manda como base64 al backend (/api/send-report), y el backend (con la clave secreta
 * de Resend, que nunca toca el navegador) dispara el correo. No requiere que nadie
 * confirme "Enviar" en ninguna app — sucede solo.
 */
async function sendTourEmailAuto(to, tour) {
  try {
    const doc = await generateTourPdf(tour);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
function HandoffView({ lastTour, tourHistory, reportEmail, reportWhatsapp, onLogSent, currentUser, justFinished, onAckFinished, autoSendResult }) {
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
      const doc = await generateTourPdf(lastTour);
      doc.save(`entrega-turno-${String(lastTour.date).replace(/\//g, "-")}.pdf`);
    } catch {
      setSentNow({ ok: false, text: "No se pudo generar el PDF (revisa la conexión a internet, se necesita la primera vez)." });
    }
    setDownloadingPdf(false);
  };

  const doSendAutoEmail = async () => {
    if (!emailTo.trim()) { setSentNow({ ok: false, text: "Escribe un correo destino." }); return; }
    setSendingAuto(true); setSentNow(null);
    const res = await sendTourEmailAuto(emailTo.trim(), lastTour);
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
          {autoSendResult && (
            <div className="text-xs mt-2" style={{ color: autoSendResult.ok ? "#1c5e2e" : C.red }}>
              {autoSendResult.ok ? "✓ " : "✗ "}{autoSendResult.message}
            </div>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>Entrega de turno</h2>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Turno <b>{lastTour.shift}</b> · {lastTour.date} · recorrido de <b>{lastTour.user}</b> ·{" "}
        {lastTour.itemCount} equipos revisados{lastTour.damagedCount ? `, ${lastTour.damagedCount} dañados` : ", todo en orden"}
      </p>

      <div className="rounded-lg border p-3 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF de este recorrido</div>
        <Button variant="ghost" icon={Download} disabled={downloadingPdf} onClick={doDownloadPdf}>
          {downloadingPdf ? "Generando…" : "Descargar PDF"}
        </Button>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sendingAuto} onClick={doSendAutoEmail}>{sendingAuto ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={sendMailManual}>o abrir borrador manual (sin PDF adjunto)</Button>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>WhatsApp — resumen en texto (el PDF se adjunta a mano)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={waTo} onChange={e => setWaTo(e.target.value)} placeholder="Número WhatsApp, ej. 573001234567"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button variant="ghost" icon={MessageCircle} onClick={sendWa}>Enviar por WhatsApp</Button>
        </div>
        <div className="text-xs mt-1" style={{ color: C.gray }}>
          WhatsApp no permite adjuntar archivos por enlace bajo ninguna circunstancia (ni Meta lo permite a terceros
          sin su API de negocios aprobada). Descarga el PDF arriba y adjúntalo tú mismo dentro de la conversación.
        </div>

        {sentNow && <div className="text-xs mt-2" style={{ color: sentNow.ok ? C.green : C.red }}>{sentNow.text}</div>}
      </div>

      {lastTour.floors.map(f => (
        <div key={f.floorId} className="rounded-lg border p-3 mb-2" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-sm font-semibold mb-1.5" style={{ color: C.ink }}>{f.floorName}</div>
          {f.items.length === 0 && <div className="text-xs" style={{ color: C.gray }}>Sin equipos registrados en este piso.</div>}
          {f.items.map((it, i) => (
            <div key={i} className="text-xs py-1 flex items-start justify-between gap-2 border-b last:border-0" style={{ borderColor: C.line }}>
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
              <div key={t.id} className="text-xs py-1.5 border-b flex items-center justify-between" style={{ borderColor: C.line }}>
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
      headers: { "Content-Type": "application/json" },
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
async function generateExecutivePdf(uptime, compliance, cost, generatedBy) {
  const jsPDFCtor = await loadPdfLibs();
  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  let y = pdfLetterhead(doc, "Panel Ejecutivo — Resumen del Mes", [fmtDT(nowIso()), `Generado por ${generatedBy || "—"}`]);

  const avgUptime = uptime.length ? Math.round(uptime.reduce((s, u) => s + u.pct, 0) / uptime.length) : 100;
  y = pdfStatBoxes(doc, y, [
    { label: "Disponibilidad promedio", value: `${avgUptime}%`, color: avgUptime >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Cumplimiento rondas", value: `${compliance.ronda.pct}%`, color: compliance.ronda.pct >= 90 ? PDF_C.green : PDF_C.red },
    { label: "Costo mantenimiento", value: cost.total ? `$${cost.total.toLocaleString("es-CO")}` : "—", color: PDF_C.steelDark },
  ]);

  y = pdfSectionTitle(doc, y, "Disponibilidad de equipos por sistema");
  y = pdfTable(doc, y, ["Sistema", "Equipos", "Fuera de servicio", "Disponibilidad"],
    uptime.slice(0, 12).map(u => [u.sistema, String(u.total), String(u.fuera), `${u.pct}%`]));

  y = pdfSectionTitle(doc, y, "Cumplimiento de rondas este mes");
  y = pdfTable(doc, y, ["Tipo de ronda", "Hechas", "Esperadas", "Cumplimiento"], [
    ["Ronda de revisión", String(compliance.ronda.actual), String(compliance.ronda.expected), `${compliance.ronda.pct}%`],
    ["Cuartos Fríos", String(compliance.cuartosFrios.actual), String(compliance.cuartosFrios.expected), `${compliance.cuartosFrios.pct}%`],
    ["Lecturas de Medidores", String(compliance.medidores.actual), String(compliance.medidores.expected), `${compliance.medidores.pct}%`],
  ]);

  if (cost.bySistema.length > 0) {
    y = pdfSectionTitle(doc, y, "Costo de mantenimiento por sistema");
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
      headers: { "Content-Type": "application/json" },
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
  let y = pdfLetterhead(doc, "Horario Mensual", [monthLabel, `Generado por ${generatedBy || "—"}`]);

  const weeks = weeksInRange(daysIso);
  const head = ["Empleado", ...daysIso.map(d => {
    const dd = new Date(d + "T00:00:00");
    return `${String(dd.getDate()).padStart(2, "0")}${isSundayOrHoliday(d) ? "*" : ""}`;
  }), ...weeks.map((w, i) => `Sem${i + 1}`), "Total"];

  const body = employees.map(emp => {
    const entries = entriesByEmployee[emp.id] || {};
    const weekTotals = weeks.map(w => weekTotalHours(w, entries));
    const monthTotal = weekTotals.reduce((a, b) => a + b, 0);
    return [emp.name, ...daysIso.map(d => fmtEntryShort(entries[d])), ...weekTotals.map(t => t || ""), monthTotal || ""];
  });

  pdfTable(doc, y, head, body, {
    columnStyles: { 0: { cellWidth: 38 } },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const raw = String(data.cell.raw || "");
      const colors = SPECIAL_CODE_COLORS[raw];
      if (colors) data.cell.styles.fillColor = hexToRgb(colors.bg);
    },
  });

  doc.setFontSize(7.5);
  const finalY = doc.lastAutoTable.finalY + 6;
  doc.text(`* Domingo o festivo. Las celdas muestran hora de entrada-salida (ej. 8.5-16.5). Objetivo semanal: ${WEEKLY_HOURS_TARGET}h. VAC = vacaciones · LIBRE = descanso · INC = incapacidad · ALT = alterno/cambio.`, 14, finalY);

  pdfFooterAll(doc);
  return doc;
}

async function sendScheduleEmailAuto(to, monthLabel, employees, daysIso, entriesByEmployee, generatedBy) {
  try {
    const doc = await generateSchedulePdf(monthLabel, employees, daysIso, entriesByEmployee, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
async function generateColdRoomsPdf(record) {
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
  }

  pdfFooterAll(doc);
  return doc;
}

async function sendColdRoomsEmailAuto(to, record) {
  try {
    const doc = await generateColdRoomsPdf(record);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

async function generateColdRoomsWeekPdf(grid, weekLabel, generatedBy) {
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

  pdfFooterAll(doc);
  return doc;
}

async function sendColdRoomsWeekEmailAuto(to, grid, weekLabel, generatedBy) {
  try {
    const doc = await generateColdRoomsWeekPdf(grid, weekLabel, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

async function generateMetersWeekPdf(grid, weekLabel, generatedBy) {
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

  pdfFooterAll(doc);
  return doc;
}

async function sendMetersWeekEmailAuto(to, grid, weekLabel, generatedBy) {
  try {
    const doc = await generateMetersWeekPdf(grid, weekLabel, generatedBy);
    const pdfBase64 = await pdfDocToBase64(doc);
    const resp = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
  const [range, setRange] = useState("all"); // 30 | 90 | 365 | all
  const [expanded, setExpanded] = useState(null);
  const [emailTo, setEmailTo] = useState(reportEmail || "");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  useEffect(() => { setEmailTo(reportEmail || ""); }, [reportEmail]);

  const sinceDate = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d;
  }, [range]);

  const stats = useMemo(() => computeEquipmentStats(issueHistory, activeIssues, sinceDate), [issueHistory, activeIssues, sinceDate]);

  const byDowntime = stats.slice(0, 10).map(e => ({ label: `${e.name} (${e.floorName})`, hours: Math.round(e.totalHours * 10) / 10 }));
  const byFrequency = [...stats].sort((a, b) => b.incidents.length - a.incidents.length).slice(0, 10)
    .map(e => ({ label: `${e.name} (${e.floorName})`, incidentes: e.incidents.length }));

  const totalCurrentlyDown = stats.filter(e => e.currentlyDown).length;
  const totalIncidents = stats.reduce((a, e) => a + e.incidents.length, 0);
  const longestActive = stats.filter(e => e.currentlyDown).sort((a, b) => b.totalHours - a.totalHours)[0];

  const rangeLabel = { "30": "Últimos 30 días", "90": "Últimos 90 días", "365": "Último año", all: "Todo el historial" }[range];
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

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-lg font-semibold" style={{ color: C.ink }}>Análisis de fallas</h2>
        <select value={range} onChange={e => setRange(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
          <option value="all">Todo el historial</option>
        </select>
      </div>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        Cuánto tiempo y con qué frecuencia ha estado cada equipo fuera de servicio, para darle seguimiento a los que fallan seguido.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Fuera de servicio ahora</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: totalCurrentlyDown ? C.red : C.ink }}>{totalCurrentlyDown}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Incidentes en el período</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: C.ink }}>{totalIncidents}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: C.gray }}>Falla activa más larga</div>
          <div className="text-sm font-semibold mt-1" style={{ color: C.ink }}>
            {longestActive ? `${longestActive.name} · ${fmtHours(longestActive.totalHours)}` : "Ninguna"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>PDF de este reporte ({rangeLabel})</div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Button variant="ghost" icon={Download} disabled={downloading} onClick={doDownloadPdf}>
            {downloading ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Correo — envío automático con el PDF adjunto</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="correo@hotel.com"
            className="text-sm border rounded-md px-2 py-2 outline-none flex-1" style={{ borderColor: C.line, minWidth: 180 }} />
          <Button icon={Mail} disabled={sending} onClick={doSendEmail}>{sending ? "Enviando…" : "Enviar con PDF adjunto"}</Button>
        </div>
        {sendMsg && <div className="text-xs mt-2" style={{ color: sendMsg.ok ? C.green : C.red }}>{sendMsg.text}</div>}
      </div>

      {stats.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.gray }}>No hay incidentes registrados en este período.</p>
      ) : (
        <>
          <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Tiempo total fuera de servicio (horas)</div>
            <ResponsiveContainer width="100%" height={Math.max(180, byDowntime.length * 34)}>
              <BarChart data={byDowntime} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} h`, "Tiempo fuera de servicio"]} />
                <Bar dataKey="hours" fill={C.red} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Equipos que más veces han fallado</div>
            <ResponsiveContainer width="100%" height={Math.max(180, byFrequency.length * 34)}>
              <BarChart data={byFrequency} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, "Incidentes"]} />
                <Bar dataKey="incidentes" fill={C.amber} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>Detalle por equipo</div>
            {stats.map(eq => (
              <div key={eq.equipmentId} className="border-b last:border-0 py-2" style={{ borderColor: C.line }}>
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
                      <div key={i} className="text-xs py-1.5 border-b last:border-0" style={{ borderColor: C.line }}>
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

function AdminView({ accounts, reportEmail, reportWhatsapp, onSaveEmail, onSaveWhatsapp, onToggleAdmin, onToggleAlmacenista, onDeleteAccount, onResetPassword, currentUsername }) {
  const [email, setEmail] = useState(reportEmail || "");
  const [saved, setSaved] = useState(false);
  const [wa, setWa] = useState(reportWhatsapp || "");
  const [waSaved, setWaSaved] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const list = Object.entries(accounts).sort((a, b) => (a[1].createdAt || "").localeCompare(b[1].createdAt || ""));
  const adminCount = list.filter(([, a]) => a.isAdmin).length;

  const doReset = async (uname) => {
    if (!newPw || newPw.length < 4) { setResetMsg("La contraseña debe tener al menos 4 caracteres."); return; }
    await onResetPassword(uname, newPw);
    setResetMsg(`✓ Contraseña de "${uname}" actualizada. Avísale la nueva contraseña.`);
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
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Correo para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => { setEmail(e.target.value); setSaved(false); }} placeholder="correo@hotel.com"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, minWidth: 220 }} />
          <Button onClick={() => { onSaveEmail(email.trim()); setSaved(true); }}>Guardar</Button>
        </div>
        {saved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Correo guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Este correo se usará por defecto al enviar informes desde la sección Reportes (cualquier usuario puede cambiarlo al momento de enviar).</div>

        <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: C.inkSoft }}>Número de WhatsApp para envío de informes</div>
        <div className="flex gap-2 flex-wrap">
          <input value={wa} onChange={e => { setWa(e.target.value); setWaSaved(false); }} placeholder="573001234567 (con indicativo de país, sin + ni espacios)"
            className="flex-1 text-sm border rounded-md px-3 py-2 outline-none" style={{ borderColor: C.line, minWidth: 220 }} />
          <Button onClick={() => { onSaveWhatsapp(wa.trim()); setWaSaved(true); }}>Guardar</Button>
        </div>
        {waSaved && <div className="text-xs mt-1" style={{ color: C.green }}>✓ Número guardado</div>}
        <div className="text-xs mt-1" style={{ color: C.gray }}>Al enviar por WhatsApp se abre una conversación con el informe ya escrito; el usuario debe darle enviar manualmente (no hay envío automático real sin una integración de WhatsApp Business).</div>
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.panel }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Usuarios ({list.length})</div>
        {list.map(([uname, acc]) => (
          <div key={uname} className="py-2 border-b last:border-0" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>{uname} {uname === currentUsername && <span className="text-xs" style={{ color: C.gray }}>(tú)</span>}</div>
                <div className="text-xs" style={{ color: C.gray }}>Creado: {fmtDT(acc.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2">
                {acc.isAdmin ? <Pill tone="amber">Administrador</Pill> : <Pill tone="gray">Operador</Pill>}
                {acc.isAlmacenista && <Pill tone="blue">Almacenista</Pill>}
                <Button size="sm" variant="ghost" onClick={() => { setResettingUser(resettingUser === uname ? null : uname); setNewPw(""); setResetMsg(""); }}>
                  Restablecer contraseña
                </Button>
                <Button size="sm" variant="ghost" disabled={acc.isAdmin && adminCount === 1} onClick={() => onToggleAdmin(uname)}>
                  {acc.isAdmin ? "Quitar admin" : "Hacer admin"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onToggleAlmacenista(uname)}>
                  {acc.isAlmacenista ? "Quitar almacenista" : "Hacer almacenista"}
                </Button>
                <Button size="sm" variant="red" disabled={uname === currentUsername} onClick={() => onDeleteAccount(uname)}>Eliminar</Button>
              </div>
            </div>
            {resettingUser === uname && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <input value={newPw} onChange={e => setNewPw(e.target.value)} type="text" placeholder="Nueva contraseña (mínimo 4 caracteres)"
                  className="text-sm border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: C.line, minWidth: 220 }}
                  onKeyDown={e => { if (e.key === "Enter") doReset(uname); }} />
                <Button size="sm" onClick={() => doReset(uname)}>Guardar nueva contraseña</Button>
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
  const [accounts, setAccounts] = useState({}); // { username: { passwordHash, isAdmin, createdAt } }
  const [currentUser, setCurrentUser] = useState(null); // username string
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
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
  useEffect(() => {
    const id = setInterval(() => setNowClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const [pendingSync, setPendingSync] = useState(() => getPendingCount());
  const [justSynced, setJustSynced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const tryFlush = async () => {
      const res = await flushOfflineQueue();
      if (cancelled) return;
      const remaining = getPendingCount();
      setPendingSync(remaining);
      if (res.synced > 0 && remaining === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      }
    };
    tryFlush(); // por si quedó algo pendiente de una sesión anterior sin señal
    window.addEventListener("online", tryFlush);
    const onQueueChanged = () => setPendingSync(getPendingCount());
    window.addEventListener("pm-queue-changed", onQueueChanged);
    const id = setInterval(tryFlush, 20000); // reintento silencioso, por si "online" no se dispara bien
    return () => { cancelled = true; window.removeEventListener("online", tryFlush); window.removeEventListener("pm-queue-changed", onQueueChanged); clearInterval(id); };
  }, []);
  const [floorId, setFloorId] = useState(FLOORS[0].id);
  const [activeIssues, setActiveIssues] = useState({});
  const [issueHistory, setIssueHistory] = useState([]);
  const [roundsIndex, setRoundsIndex] = useState([]);
  const [latestValues, setLatestValues] = useState({});
  const [tankHistory, setTankHistory] = useState({});
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
  const [mttoLog, setMttoLog] = useState([]);
  const [mttoCronograma, setMttoCronograma] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastTour, setLastTour] = useState(null);
  const [tourHistory, setTourHistory] = useState([]);
  const [justFinished, setJustFinished] = useState(false);
  const [autoSendResult, setAutoSendResult] = useState(null);
  const tourBufferRef = useRef({}); // acumula lo guardado piso por piso durante el recorrido en curso

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [acc, sess, ai, ih, ri, lv, th, email, sr, wa, lt, thist, lcv, cri, lmv, mh, mri, lcr, ch, bod, shv, iit, imv, emp, sch, mte, mtl, mtc, llv, lri, lgv, gri, cari, lcar, psub, tsk] = await Promise.all([
        sGet("accounts", true), sGet("session", false), sGet("active-issues", true),
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
      ]);
      setAccounts(acc || {});
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
      if (sess?.username && acc && acc[sess.username]) setCurrentUser(sess.username);
      setLoading(false);
    } catch (e) {
      console.error("Error cargando datos iniciales:", e);
      setLoadError("No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.");
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const register = async (username, password) => {
    setAuthError(""); setAuthBusy(true);
    const key = username.toLowerCase();
    if (accounts[key]) { setAuthError("Ese usuario ya existe. Elige otro o inicia sesión."); setAuthBusy(false); return; }
    try {
      const passwordHash = await hashPassword(password);
      const isAdmin = Object.keys(accounts).length === 0; // el primer usuario creado es admin
      const next = { ...accounts, [key]: { displayName: username, passwordHash, isAdmin, createdAt: nowIso() } };
      await sSet("accounts", next, true);
      await sSet("session", { username: key }, false);
      setAccounts(next);
      setCurrentUser(key);
      setView("home");
    } catch (e) {
      console.error("Error creando cuenta:", e);
      setAuthError("No se pudo conectar con el servidor para crear la cuenta. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const login = async (username, password) => {
    setAuthError(""); setAuthBusy(true);
    const key = username.toLowerCase();
    try {
      // Se vuelve a pedir la lista de cuentas fresca antes de decidir "usuario no encontrado",
      // por si el estado en memoria quedó desactualizado (otro dispositivo creó la cuenta después
      // de que esta pestaña cargó, o esta pestaña lleva mucho tiempo abierta).
      const freshAccounts = (await sGet("accounts", true)) || {};
      if (Object.keys(freshAccounts).length !== Object.keys(accounts).length) setAccounts(freshAccounts);
      const acc = freshAccounts[key];
      if (!acc) { setAuthError("Usuario no encontrado. ¿Necesitas crear una cuenta?"); setAuthBusy(false); return; }
      const passwordHash = await hashPassword(password);
      if (passwordHash !== acc.passwordHash) { setAuthError("Contraseña incorrecta."); setAuthBusy(false); return; }
      await sSet("session", { username: key }, false);
      setCurrentUser(key);
      setView("home");
    } catch (e) {
      console.error("Error iniciando sesión:", e);
      setAuthError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    }
    setAuthBusy(false);
  };

  const logout = async () => { setCurrentUser(null); await sSet("session", null, false); };

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

  const toggleAdmin = async (username) => {
    const next = { ...accounts, [username]: { ...accounts[username], isAdmin: !accounts[username].isAdmin } };
    setAccounts(next);
    await sSet("accounts", next, true);
  };

  const toggleAlmacenista = async (username) => {
    const next = { ...accounts, [username]: { ...accounts[username], isAlmacenista: !accounts[username].isAlmacenista } };
    setAccounts(next);
    await sSet("accounts", next, true);
  };

  const resetPassword = async (username, newPassword) => {
    const passwordHash = await hashPassword(newPassword);
    const next = { ...accounts, [username]: { ...accounts[username], passwordHash } };
    setAccounts(next);
    await sSet("accounts", next, true);
  };
  const deleteAccount = async (username) => {
    const next = { ...accounts };
    delete next[username];
    setAccounts(next);
    await sSet("accounts", next, true);
  };

  const resolveIssue = async (iss, solution) => {
    const rec = {
      equipmentId: iss.equipmentId || iss.id, code: iss.code, name: iss.name, floorName: iss.floorName, floorId: iss.floorId,
      openedAt: iss.openedAt, openedBy: iss.openedBy, observation: iss.observation,
      resolvedAt: nowIso(), resolvedBy: displayName, solution,
      duration: elapsed(iss.openedAt),
    };
    const newHistory = [rec, ...issueHistory].slice(0, 500);
    const newActive = { ...activeIssues };
    delete newActive[rec.equipmentId];
    setIssueHistory(newHistory); setActiveIssues(newActive);
    await sSet("issue-history", newHistory, true);
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

  /* ---- Horarios ---- */
  const createEmployee = async (name, cargo, fixedRestDay) => {
    const rec = { id: uid("emp"), name, cargo: cargo || "", fixedRestDay: fixedRestDay === "" ? null : Number(fixedRestDay), active: true, createdBy: displayName, createdAt: nowIso() };
    const next = [...employees, rec];
    setEmployees(next);
    await sSet("employees", next, true);
    return rec;
  };

  const updateEmployee = async (id, patch) => {
    const next = employees.map(e => e.id === id ? { ...e, ...patch } : e);
    setEmployees(next);
    await sSet("employees", next, true);
  };

  const setScheduleEntry = async (employeeId, dateIso, patch) => {
    const key = scheduleKey(employeeId, dateIso);
    const next = { ...scheduleEntries };
    const isEmpty = !patch || (!patch.code && patch.entrada == null && patch.salida == null);
    if (isEmpty) delete next[key];
    else next[key] = { entrada: patch.entrada ?? null, salida: patch.salida ?? null, code: patch.code || null, note: patch.note || "", updatedBy: displayName, updatedAt: nowIso() };
    setScheduleEntries(next);
    await sSet("schedule-entries", next, true);
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
    const rec = {
      id, titulo: form.titulo.trim(), descripcion: (form.descripcion || "").trim(),
      estado: "pendiente", prioridad: form.prioridad || "media", asignadoA: form.asignadoA || "",
      recurrencia: recurrence, recurrenceGroupId: recurrence ? id : null,
      recurrencePeriodKey: recurrence ? periodKeyFor(new Date(), recurrence) : null,
      createdBy: displayName, createdAt: nowIso(), updatedAt: nowIso(),
    };
    const next = [rec, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
    if (rec.prioridad === "alta" && pushSubscriptions.length > 0) {
      sendPushToSubscriptions(pushSubscriptions, "🔴 Tarea de prioridad alta", rec.titulo, "/");
    }
    return rec;
  };

  /** Revisa las tareas que se repiten: si ya empezó un nuevo periodo (semana/mes) y no hay una instancia de ese ciclo, crea una nueva copia en "pendiente". */
  const checkRecurringTasks = async () => {
    const templates = tasks.filter(t => t.recurrencia && t.recurrenceGroupId);
    const groups = {};
    templates.forEach(t => { (groups[t.recurrenceGroupId] ||= []).push(t); });

    const now = new Date();
    const newOnes = [];
    Object.values(groups).forEach(group => {
      const latest = group.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
      const currentKey = periodKeyFor(now, latest.recurrencia);
      if (latest.recurrencePeriodKey === currentKey) return; // ya hay una tarea de este ciclo
      newOnes.push({
        id: uid("task"), titulo: latest.titulo, descripcion: latest.descripcion,
        estado: "pendiente", prioridad: latest.prioridad, asignadoA: latest.asignadoA,
        recurrencia: latest.recurrencia, recurrenceGroupId: latest.recurrenceGroupId, recurrencePeriodKey: currentKey,
        createdBy: latest.createdBy, createdAt: nowIso(), updatedAt: nowIso(),
      });
    });
    if (newOnes.length === 0) return;
    const next = [...newOnes, ...tasks];
    setTasks(next);
    await sSet("tasks", next, true);
  };

  const updateTask = async (id, patch) => {
    const next = tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t);
    setTasks(next);
    await sSet("tasks", next, true);
  };

  const deleteTask = async (id) => {
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
      }
    }

    const idxRec = { id, floorId: floor.id, floorName: floor.name, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIndex].slice(0, 1000);

    setRoundsIndex(newIndex); setLatestValues(newLatest); setActiveIssues(newActive); setTankHistory(newTankHist);
    notifyNewDamagedEquipment(activeIssues, newActive);
    await Promise.all([
      sSet(`round-${id}`, cleanEntries, true),
      sSet("rounds-index", newIndex, true),
      sSet("latest-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("tank-history", newTankHist, true),
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

    // Si se guardó el último piso, el recorrido quedó completo: se arma y guarda la entrega de turno.
    if (floorIdx === FLOORS.length - 1) {
      const floorsDone = FLOORS.map(f => tourBufferRef.current[f.id]).filter(Boolean);
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
      setView("handoff");

      // Envío automático real: si hay un correo configurado, se manda solo, con el PDF
      // adjunto, sin que nadie tenga que tocar nada. Si falla (sin internet, backend sin
      // configurar, etc.) queda registrado y el técnico puede reintentarlo desde la pantalla.
      if (reportEmail) {
        sendTourEmailAuto(reportEmail, tourRec).then(async (res) => {
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
    await Promise.all([
      sSet(`cold-round-${id}`, cleanEntries, true),
      sSet("cold-rounds-index", newIndex, true),
      sSet("latest-cold-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("last-cold-round", record, true),
      sSet("cold-history", newColdHistory, true),
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
      }
    }

    const idxRec = { id, date: todayStr(), shift, user: displayName, savedAt: ts, itemCount, damagedCount, notes };
    const newIndex = [idxRec, ...roundsIdx].slice(0, 500);

    setLatestVals(newLatest); setActiveIssues(newActive); setRoundsIdx(newIndex);
    notifyNewDamagedEquipment(activeIssues, newActive);
    await Promise.all([
      sSet(`${syntheticFloor.id}-round-${id}`, cleanEntries, true),
      sSet(indexKey, newIndex, true),
      sSet(latestKey, newLatest, true),
      sSet("active-issues", newActive, true),
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


  const account = accounts[currentUser] || {};
  const displayName = account.displayName || currentUser;
  const isAdmin = !!account.isAdmin;
  const isAlmacenista = !!account.isAlmacenista;

  const coldOutOfRange = useMemo(() => computeColdOutOfRange(latestColdValues), [latestColdValues]);
  const meterAnomalies = useMemo(() => computeMeterAnomalies(meterHistory), [meterHistory]);
  const lowStockItems = useMemo(() => computeLowStock(invItems), [invItems]);
  const shiftAlerts = useMemo(
    () => computeShiftCompletionAlerts(nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex),
    [nowClock, roundsIndex, meterRoundsIndex, coldRoundsIndex, gymRoundsIndex]
  );
  const maintenanceDue = useMemo(
    () => computeUpcomingMaintenance(nowClock, mttoEquipos, mttoCronograma),
    [nowClock, mttoEquipos, mttoCronograma]
  );

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
    if (currentUser && pendingShelfId) setView("inventory");
  }, [currentUser, pendingShelfId]);

  useEffect(() => {
    if (currentUser && pendingEquipoId) setView("maintenance");
  }, [currentUser, pendingEquipoId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg, color: C.inkSoft }}>Cargando…</div>;
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="max-w-sm text-center">
        <AlertTriangle size={32} style={{ color: C.red, margin: "0 auto 12px" }} />
        <p className="text-sm mb-4" style={{ color: C.ink }}>{loadError}</p>
        <Button onClick={loadAll}>Reintentar</Button>
      </div>
    </div>
  );
  if (!currentUser) return <AuthScreen accounts={accounts} onLogin={login} onRegister={register} error={authError} busy={authBusy} />;

  if (printMode) {
    return <PrintableReport activeIssues={activeIssues} issueHistory={issueHistory} roundsIndex={roundsIndex} onClose={() => setPrintMode(false)} />;
  }

  const floor = FLOORS.find(f => f.id === floorId);
  const activeCount = Object.keys(activeIssues).length;

  const NAV = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "ronda", label: "Ronda de revisión", icon: ClipboardList },
    { id: "coldrooms", label: "Cuartos Fríos", icon: Snowflake, badge: coldOutOfRange.length },
    { id: "coldrooms-history", label: "Historial de Cuartos Fríos", icon: CalendarDays },
    { id: "meters", label: "Lecturas de Medidores", icon: Zap, badge: meterAnomalies.length },
    { id: "meters-history", label: "Historial de Medidores", icon: CalendarDays },
    { id: "inventory", label: "Inventario", icon: Package, badge: lowStockItems.length },
    ...((isAdmin || isAlmacenista) ? [{ id: "inventory-alerts", label: "Alertas de Stock", icon: AlertTriangle, badge: lowStockItems.length }] : []),
    ...((isAdmin || isAlmacenista) ? [{ id: "inventory-movements", label: "Movimientos de Inventario", icon: History }] : []),
    { id: "maintenance", label: "Mantenimiento", icon: Wrench },
    ...(isAdmin ? [{ id: "maintenance-analytics", label: "Análisis de Mantenimiento", icon: TrendingUp }] : []),
    ...(isAdmin ? [{ id: "executive", label: "Panel Ejecutivo", icon: Gauge }] : []),
    ...(isAdmin ? [{ id: "maintenance-log", label: "Mantenimientos Realizados", icon: History }] : []),
    ...(isAdmin ? [{ id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays }] : []),
    { id: "laundry", label: "Equipos de Lavandería", icon: ClipboardList },
    { id: "boiler", label: "Check List Caldera", icon: Gauge },
    { id: "gym", label: "Equipos de Gimnasio", icon: ClipboardList },
    { id: "schedules", label: "Horario Mensual", icon: Users },
    { id: "tasks", label: "Tareas / Pendientes", icon: ClipboardCheck, badge: tasks.filter(t => t.estado !== "hecho").length },
    { id: "handoff", label: "Entrega de turno", icon: Send, badge: justFinished ? "!" : 0 },
    { id: "issues", label: "Fuera de servicio", icon: Wrench, badge: activeCount },
    { id: "reports", label: "Reportes", icon: History },
    { id: "tanks", label: "Tanques agua potable", icon: Droplets },
    ...(isAdmin ? [{ id: "analytics", label: "Análisis de fallas", icon: TrendingUp }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Panel de administrador", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen flex" style={{ background: C.bg, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {/* SIDEBAR */}
      <aside className={`fixed lg:static z-20 top-0 left-0 w-64 shrink-0 transition-transform flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: C.steel, height: "100vh" }}>
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
        <div className="p-3 space-y-1 shrink-0">
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium"
              style={{ background: view === n.id ? "#2a3f56" : "transparent", color: view === n.id ? "#fff" : "#c3d0dd" }}>
              <n.icon size={16} />
              <span className="flex-1 text-left">{n.label}</span>
              {!!n.badge && <span className="text-xs font-bold px-1.5 rounded-full" style={{ background: C.red, color: "#fff" }}>{n.badge}</span>}
            </button>
          ))}
        </div>
        {view === "ronda" && (
          <div className="p-3 pt-2 border-t flex flex-col min-h-0 flex-1" style={{ borderColor: "#2a3f56" }}>
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
              <select value={shift} onChange={e => setShift(e.target.value)} className="ml-2 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line }}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="ml-2">{nowClock.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingSync > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: C.amberSoft, color: "#7a5405" }}>
                <AlertTriangle size={12} /> {pendingSync} sin subir
              </span>
            )}
            {justSynced && pendingSync === 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ background: "#dff5e3", color: C.green }}>
                <CheckCircle2 size={12} /> Sincronizado
              </span>
            )}
            {isAdmin && <PushEnableButton onEnable={enablePushNotifications} />}
            {isAdmin && <NotificationBell alerts={shiftAlerts} maintenanceDue={maintenanceDue} onNavigate={setView} />}
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
            <HomeView currentUser={displayName} isAdmin={isAdmin} isAlmacenista={isAlmacenista} onNavigate={setView}
              counts={{ activeIssues: activeCount, lowStock: lowStockItems.length, coldOutOfRange: coldOutOfRange.length, meterAnomalies: meterAnomalies.length, justFinished, openTasks: tasks.filter(t => t.estado !== "hecho").length }} />
          )}
          {view === "ronda" && (
            <RoundView floor={floor} currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestValues={latestValues} floorIndex={FLOORS.findIndex(f => f.id === floorId)} floorCount={FLOORS.length}
              onGoFloor={(idx) => setFloorId(FLOORS[idx].id)}
              onResolveIssue={resolveIssue} onSaveRound={saveRound} />
          )}
          {view === "coldrooms" && (
            <ColdRoomsView currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestColdValues={latestColdValues} onResolveIssue={resolveIssue} onSaveColdRound={saveColdRound}
              reportEmail={reportEmail} onLogSent={logSentReport} lastColdRound={lastColdRound} coldHistory={coldHistory} />
          )}
          {view === "coldrooms-history" && (
            <ColdRoomsWeeklyView coldHistory={coldHistory} reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "meters" && (
            <MetersView currentUser={displayName} shift={shift}
              latestMeterValues={latestMeterValues} onSaveMetersRound={saveMetersRound} meterHistory={meterHistory} />
          )}
          {view === "meters-history" && (
            <MetersWeeklyView meterHistory={meterHistory} reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "handoff" && (
            <HandoffView lastTour={lastTour} tourHistory={tourHistory} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onLogSent={logSentReport} currentUser={displayName} justFinished={justFinished}
              onAckFinished={() => setJustFinished(false)} autoSendResult={autoSendResult} />
          )}
          {view === "issues" && <IssuesView activeIssues={activeIssues} onResolve={resolveIssue} />}
          {view === "reports" && (
            <ReportsView issueHistory={issueHistory} roundsIndex={roundsIndex} activeIssues={activeIssues} latestValues={latestValues}
              reportEmail={reportEmail} reportWhatsapp={reportWhatsapp} onOpenPrint={() => setPrintMode(true)}
              sentReports={sentReports} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "tanks" && <TanksView latestValues={latestValues} tankHistory={tankHistory} onSaveTankReading={saveTankReading} currentUser={displayName} />}
          {view === "analytics" && isAdmin && (
            <EquipmentAnalyticsView issueHistory={issueHistory} activeIssues={activeIssues}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "inventory" && (
            <InventoryView bodegas={bodegas} shelves={shelves} invItems={invItems} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateBodega={createBodega} onCreateShelf={createShelf} onCreateItem={createInvItem}
              onRetiro={doInvRetiro} onEntrada={doInvEntrada} onImportInventory={importFullInventory}
              initialShelfId={pendingShelfId} onConsumedInitialShelf={() => setPendingShelfId(null)} />
          )}
          {view === "inventory-alerts" && (isAdmin || isAlmacenista) && (
            <StockAlertsView invItems={invItems} bodegas={bodegas} shelves={shelves}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "inventory-movements" && (isAdmin || isAlmacenista) && (
            <InventoryMovementsView invMovements={invMovements} invItems={invItems} bodegas={bodegas} shelves={shelves}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "maintenance" && (
            <MaintenanceView equipos={mttoEquipos} mttoLog={mttoLog} isAdmin={isAdmin} isAlmacenista={isAlmacenista}
              onCreateEquipo={createMttoEquipo} onImportCatalog={importMaintenanceFull} onLogMaintenance={logMaintenance}
              initialEquipoId={pendingEquipoId} onConsumedInitialEquipo={() => setPendingEquipoId(null)} />
          )}
          {view === "maintenance-analytics" && isAdmin && (
            <MaintenanceAnalyticsView equipos={mttoEquipos} mttoLog={mttoLog} />
          )}
          {view === "executive" && isAdmin && (
            <ExecutivePanelView equipos={mttoEquipos} mttoLog={mttoLog} roundsIndex={roundsIndex}
              coldRoundsIndex={coldRoundsIndex} meterRoundsIndex={meterRoundsIndex} currentUser={displayName} />
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
            <SchedulesView employees={employees} scheduleEntries={scheduleEntries} isAdmin={isAdmin} currentUser={displayName}
              onCreateEmployee={createEmployee} onUpdateEmployee={updateEmployee} onSetScheduleEntry={setScheduleEntry}
              onImportJuly={importJulySchedule2026} reportEmail={reportEmail} onLogSent={logSentReport} />
          )}
          {view === "tasks" && (
            <TasksView tasks={tasks} accounts={accounts} currentUser={displayName} currentUsername={currentUser} isAdmin={isAdmin}
              onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />
          )}
          {view === "admin" && isAdmin && (
            <AdminView accounts={accounts} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onSaveEmail={saveReportEmail} onSaveWhatsapp={saveReportWhatsapp}
              onToggleAdmin={toggleAdmin} onToggleAlmacenista={toggleAlmacenista} onDeleteAccount={deleteAccount} onResetPassword={resetPassword} currentUsername={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
