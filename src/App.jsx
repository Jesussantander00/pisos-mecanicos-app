import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, User, LogOut, ChevronRight, ChevronDown,
  Droplets, ClipboardList, History, Gauge, Wrench, PlusCircle, X, Save, Search,
  Building2, ShieldCheck, MessageCircle, Download, Send, Mail, TrendingUp, Snowflake, Zap, CalendarDays
} from "lucide-react";
import { sGet, sSet } from "./lib/storage";

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
    { c: 6, n: "Nivel de Cloro Tanque Agua Potable", k: "numeric", u: "%" },
    { c: 7, n: "Bomba Dosificadora de Cloro Tanque Agua Potable", k: "status" },
    { c: 8, n: "Sistema automático dosificación de cloro Tanque Agua Potable", k: "status" },
    { c: 9, n: "Tablero sistema automático de llenado tanques", k: "status" },
    { c: 12, n: "Nivel tanque de agua contraincendio", k: "numeric", u: "%" },
    { c: 13, n: "Bomba # 1 Suministro de Agua Contraincendios", k: "status" },
    { c: 14, n: "Bomba # 2 Suministro de Agua Contraincendios", k: "status" },
    { c: 15, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 16, n: "Rejillas Desagüe Cuarto Bomba Agua Contraincendio", k: "status" },
    { c: 17, n: "Nivel Tanque de Cloro agua contraincendio", k: "numeric", u: "%" },
    { c: 18, n: "Bomba Dosificadora de Cloro Agua Contraincendio", k: "status" },
    { c: 19, n: "Sistema automático dosificación de cloro Tanque Contraincendio", k: "status" },
    { c: 20, n: "Tablero sistema automático de llenado tanques", k: "status" },
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
    { c: 75, n: "Nivel Tanque de Cloro", k: "numeric", u: "%" },
    { c: 76, n: "Bomba Dosificadora de Cloro (# pimpinas)", k: "numeric", u: "#" },
    { c: 78, n: "Bomba Suministro de Agua Potable #1", k: "status" },
    { c: 79, n: "Bomba Suministro de Agua Potable #2", k: "status" },
    { c: 80, n: "Bomba Suministro de Agua Potable #3", k: "status" },
    { c: 81, n: "Presión Bomba Encendida", k: "numeric", u: "psi" },
    { c: 84, n: "Sistema de llenado automático", k: "status" },
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
    { c: 221, n: "Nivel Tanque de Cloro", k: "numeric", u: "%" },
    { c: 222, n: "Bomba Dosificadora de Cloro (# pimpinas)", k: "numeric", u: "#" },
    { c: 223, n: "Tablero de control bombas de Agua Potable", k: "status" },
    { c: 224, n: "Bomba Suministro de Agua Potable #1", k: "status" },
    { c: 225, n: "Bomba Suministro de Agua Potable #2", k: "status" },
    { c: 226, n: "Bomba Suministro de Agua Potable #3", k: "status" },
    { c: 227, n: "Sistema automático de llenado tanques", k: "status" },
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
function EquipmentRow({ item, entry, onChange, activeIssue, onResolve, previous, statusOptions, hint }) {
  const [resolving, setResolving] = useState(false);
  const [solution, setSolution] = useState("");
  const damaged = !!entry?.damaged;
  const opts = statusOptions || STATUS_OPTS;

  const update = (patch) => onChange(item.id, { ...entry, ...patch });

  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: damaged ? C.red : C.line, background: damaged ? C.redSoft : C.panel }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2" style={{ minWidth: 200 }}>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ background: C.bg, color: C.inkSoft }}>#{item.c}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: C.ink }}>{item.n}</div>
            {item.tank && <Pill tone="blue">Tanque agua potable</Pill>}
            {hint && <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>Rango objetivo: <b>{hint}</b></div>}
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

  const handleSave = () => {
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

      <div className="flex items-center justify-between mt-4 sticky bottom-0 py-2">
        <div className="text-xs" style={{ color: C.gray }}>{currentUser} · Vo.Bo. pendiente de supervisor</div>
        <Button icon={Save} variant="amber" onClick={handleSave}>
          {isLast ? "Guardar y finalizar recorrido" : "Guardar y pasar al siguiente piso"}
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
function ColdRoomsView({ currentUser, shift, activeIssues, latestColdValues, onResolveIssue, onSaveColdRound, reportEmail, onLogSent, lastColdRound }) {
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

  const handleSave = () => {
    onSaveColdRound(entries, notes, supervisor, ingeniero);
    setSaved(true);
    setSendMsg(null);
  };

  const doDownloadPdf = async () => {
    if (!lastColdRound) return;
    setDownloading(true);
    try {
      const doc = await generateColdRoomsPdf(lastColdRound);
      doc.save(`cuartos-frios-${lastColdRound.date.replace(/\//g, "-")}.pdf`);
    } catch { setSendMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSendEmail = async () => {
    if (!lastColdRound) return;
    if (!emailTo.trim()) { setSendMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setSendMsg(null);
    const res = await sendColdRoomsEmailAuto(emailTo.trim(), lastColdRound);
    setSendMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Cuartos Fríos (correo automático con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
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

      <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: C.inkSoft }}>Cuartos fríos ({COLD_ROOMS.length})</div>
      {COLD_ROOMS.map(item => (
        <EquipmentRow key={item.id} item={item} entry={entries[item.id]} onChange={onChange}
          activeIssue={activeIssues[item.id]} previous={latestColdValues[item.id]} hint={item.setpoint}
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

      {lastColdRound && (
        <div className="rounded-lg border p-3 mt-2" style={{ borderColor: C.line, background: C.panel }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>
            PDF de la última ronda guardada ({lastColdRound.date}, turno {lastColdRound.shift})
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

function MetersView({ currentUser, shift, latestMeterValues, onSaveMetersRound }) {
  const [entries, setEntries] = useState({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const onChange = useCallback((id, val) => { setEntries(prev => ({ ...prev, [id]: val })); setSaved(false); }, []);

  const filledCount = ALL_METERS.filter(m => {
    const e = entries[m.id]; if (!e) return false;
    const subs = m.subs || ["value"];
    return subs.some(s => e[s] !== undefined && e[s] !== "");
  }).length;

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
   VISTA: HISTORIAL SEMANAL DE MEDIDORES
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

  const doDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generateMetersWeekPdf(grid, weekLabel, currentUser);
      doc.save(`lecturas-medidores-${weekLabel.replace(/[\s/]+/g, "-")}.pdf`);
    } catch { setMsg({ ok: false, text: "No se pudo generar el PDF (revisa la conexión)." }); }
    setDownloading(false);
  };

  const doSend = async () => {
    if (!emailTo.trim()) { setMsg({ ok: false, text: "Escribe un correo destino." }); return; }
    setSending(true); setMsg(null);
    const res = await sendMetersWeekEmailAuto(emailTo.trim(), grid, weekLabel, currentUser);
    setMsg({ ok: res.ok, text: res.message });
    onLogSent?.({ to: emailTo.trim(), method: "Lecturas de medidores (semana, correo con PDF)", ok: res.ok, message: res.message, sentBy: currentUser, sentAt: nowIso() });
    setSending(false);
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
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.inkSoft }}>Descargar / enviar esta semana</div>
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
                    {row.days.map((v, di) => (
                      <td key={di} className="px-2 py-1.5 text-right" style={{ color: v != null ? C.ink : C.gray }}>{v ?? "—"}</td>
                    ))}
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

/* ============================================================
   VISTA SEMANAL DE MEDIDORES
   ============================================================ */
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
    y = pdfTable(doc, y, head, body, { columnStyles: { 0: { cellWidth: 70 } } });
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
function AdminView({ accounts, reportEmail, reportWhatsapp, onSaveEmail, onSaveWhatsapp, onToggleAdmin, onDeleteAccount, onResetPassword, currentUsername }) {
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
                <Button size="sm" variant="ghost" onClick={() => { setResettingUser(resettingUser === uname ? null : uname); setNewPw(""); setResetMsg(""); }}>
                  Restablecer contraseña
                </Button>
                <Button size="sm" variant="ghost" disabled={acc.isAdmin && adminCount === 1} onClick={() => onToggleAdmin(uname)}>
                  {acc.isAdmin ? "Quitar admin" : "Hacer admin"}
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
  const [view, setView] = useState("ronda");
  const [floorId, setFloorId] = useState(FLOORS[0].id);
  const [activeIssues, setActiveIssues] = useState({});
  const [issueHistory, setIssueHistory] = useState([]);
  const [roundsIndex, setRoundsIndex] = useState([]);
  const [latestValues, setLatestValues] = useState({});
  const [tankHistory, setTankHistory] = useState({});
  const [latestColdValues, setLatestColdValues] = useState({});
  const [coldRoundsIndex, setColdRoundsIndex] = useState([]);
  const [lastColdRound, setLastColdRound] = useState(null);
  const [latestMeterValues, setLatestMeterValues] = useState({});
  const [meterHistory, setMeterHistory] = useState({});
  const [meterRoundsIndex, setMeterRoundsIndex] = useState([]);
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
      const [acc, sess, ai, ih, ri, lv, th, email, sr, wa, lt, thist, lcv, cri, lmv, mh, mri, lcr] = await Promise.all([
        sGet("accounts", true), sGet("session", false), sGet("active-issues", true),
        sGet("issue-history", true), sGet("rounds-index", true), sGet("latest-values", true),
        sGet("tank-history", true), sGet("report-email", true), sGet("sent-reports", true),
        sGet("report-whatsapp", true), sGet("last-tour", true), sGet("tour-history", true),
        sGet("latest-cold-values", true), sGet("cold-rounds-index", true),
        sGet("latest-meter-values", true), sGet("meter-history", true), sGet("meter-rounds-index", true),
        sGet("last-cold-round", true),
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
      setColdRoundsIndex(cri || []);
      setLatestMeterValues(lmv || {});
      setMeterHistory(mh || {});
      setMeterRoundsIndex(mri || []);
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

    setLatestColdValues(newLatest); setActiveIssues(newActive); setColdRoundsIndex(newIndex);
    setLastColdRound(record);
    await Promise.all([
      sSet(`cold-round-${id}`, cleanEntries, true),
      sSet("cold-rounds-index", newIndex, true),
      sSet("latest-cold-values", newLatest, true),
      sSet("active-issues", newActive, true),
      sSet("last-cold-round", record, true),
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

  const account = accounts[currentUser] || {};
  const displayName = account.displayName || currentUser;
  const isAdmin = !!account.isAdmin;

  if (printMode) {
    return <PrintableReport activeIssues={activeIssues} issueHistory={issueHistory} roundsIndex={roundsIndex} onClose={() => setPrintMode(false)} />;
  }

  const floor = FLOORS.find(f => f.id === floorId);
  const activeCount = Object.keys(activeIssues).length;

  const NAV = [
    { id: "ronda", label: "Ronda de revisión", icon: ClipboardList },
    { id: "coldrooms", label: "Cuartos Fríos", icon: Snowflake },
    { id: "meters", label: "Lecturas de Medidores", icon: Zap },
    { id: "meters-history", label: "Historial de Medidores", icon: CalendarDays },
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
            <select value={shift} onChange={e => setShift(e.target.value)} className="ml-2 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line }}>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <Pill tone="amber">Admin</Pill>}
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}><User size={14} /> {displayName}</span>
            <Button size="sm" variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-5xl w-full mx-auto">
          {view === "ronda" && (
            <RoundView floor={floor} currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestValues={latestValues} floorIndex={FLOORS.findIndex(f => f.id === floorId)} floorCount={FLOORS.length}
              onGoFloor={(idx) => setFloorId(FLOORS[idx].id)}
              onResolveIssue={resolveIssue} onSaveRound={saveRound} />
          )}
          {view === "coldrooms" && (
            <ColdRoomsView currentUser={displayName} shift={shift} activeIssues={activeIssues}
              latestColdValues={latestColdValues} onResolveIssue={resolveIssue} onSaveColdRound={saveColdRound}
              reportEmail={reportEmail} onLogSent={logSentReport} lastColdRound={lastColdRound} />
          )}
          {view === "meters" && (
            <MetersView currentUser={displayName} shift={shift}
              latestMeterValues={latestMeterValues} onSaveMetersRound={saveMetersRound} />
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
          {view === "admin" && isAdmin && (
            <AdminView accounts={accounts} reportEmail={reportEmail} reportWhatsapp={reportWhatsapp}
              onSaveEmail={saveReportEmail} onSaveWhatsapp={saveReportWhatsapp}
              onToggleAdmin={toggleAdmin} onDeleteAccount={deleteAccount} onResetPassword={resetPassword} currentUsername={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
