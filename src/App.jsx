import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, User, LogOut, ChevronRight, ChevronDown,
  Droplets, ClipboardList, History, Gauge, Wrench, PlusCircle, X, Save, Search,
  Building2, ShieldCheck, MessageCircle, Download, Send, Mail, TrendingUp, Snowflake, Zap, CalendarDays,
  Package, Warehouse, QrCode, PackageMinus, PackagePlus, Trash2, ArrowLeft, Users, Home
} from "lucide-react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { sGet, sSet, uploadPhoto } from "./lib/storage";

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
   INVENTARIO — datos importados del Excel real del hotel
   ============================================================ */
// Datos importados desde INVENTARIO_ACTUALIZADO_FEB__1_.xlsx (29 bodegas, 316 estanterías, 2897 repuestos)
const INV_IMPORT_BODEGAS = [
"REFRIGERACION",
"INGRESOS ADIC",
"INVENTARIO GENERAL",
"EPP",
"TRANE",
"SCHINLDLER",
"ELECTRICIDAD",
"INVENTARIO DE OBRA INTERVENTORI",
"INVENTARIO DE AC",
"CAJA DE HERRAMIENTA",
"GRIFERIA, PLOMERIA",
"EQUIPO DE LA VANDERIA",
"COCINA Y REPUESTOS VARIOS",
"RODAMIENTOS",
"PINTURAS1",
"CORREAS.",
"CARPINTERIA",
"BODEGAS 1 Y 2",
"CARPINTERIA1",
"ELECTRICOS",
"GRIFERIA",
"PINTURA2",
"RODAMIETO",
"CORREAS",
"ILUMINACION",
"FERETERIA",
"PLOMERIA",
"INOX",
"REFRIGERACION 2",
];
const INV_IMPORT_SHELVES = [
[0,"General"],
[0,"ALMACEN"],
[0,"ZONA"],
[1,"General"],
[2,"ESTANE2"],
[2,"ESTANE3"],
[2,"ESTANE4"],
[2,"ESTANE5"],
[2,"ESTANTE E4"],
[2,"ESTANTE E2"],
[2,"ESTANE1"],
[2,"RSTANE1"],
[2,"ESTAN E2"],
[2,"ESTAND2"],
[2,"ESTANTEE3"],
[2,"ESTAN B1"],
[2,"ESTAN B2"],
[2,"ESTANTE B2"],
[2,"ESTAN B3"],
[2,"ESTANTB4"],
[2,"ESTANB5"],
[2,"ESTANB4"],
[2,"ESTAN B4"],
[2,"ESTANB2"],
[2,"ESTANb4"],
[2,"ESTANC3"],
[2,"ESTAND3"],
[2,"ESTAD3"],
[2,"ESTAND4"],
[2,"ESTANTE L2"],
[2,"ESTANTE L"],
[2,"ESTANL2"],
[2,"ESTANTED2"],
[2,"ESTANTED3"],
[2,"ESTANC1"],
[2,"ESTANTC1"],
[2,"ESTANTD3"],
[2,"ESTANTB1"],
[2,"ESTAND1"],
[2,"General"],
[2,"ESTANTE D2"],
[2,"ESTANTE C3"],
[2,"ESTANTE C4"],
[2,"ESTANTE C2"],
[2,"ESTANTEC2"],
[2,"ESTANTEC3"],
[2,"ESTANTE D1"],
[2,"ESTANTED1"],
[2,"ESTANTEC4"],
[2,"ESTANTEC1"],
[2,"ESTANTE C1"],
[2,"ESTANTE A1"],
[2,"ESTANTEA1"],
[2,"ESTANTEB1"],
[2,"ESTANTE F4"],
[2,"ESTANTE F2"],
[2,"ESTANTE f4"],
[2,"ESTANTE F1"],
[2,"ESTANTE G2"],
[2,"ESTANTE J2"],
[2,"ESTANTE H3"],
[2,"ESTANTEG2"],
[2,"BLOQUE AMARILLO"],
[2,"BODEGA 2"],
[2,"ESTANATE H3"],
[2,"ESTANF4"],
[2,"ESTANF3"],
[2,"ESTANTF4"],
[2,"ESTANTE F3"],
[2,"ESTANF2"],
[2,"ESTANTE P2"],
[2,"ESTANTE P3"],
[2,"ESTANTE P4"],
[2,"ESTANTE P5"],
[2,"ESTANTE Q3"],
[2,"ESTANTEQ3"],
[2,"ESTANTE R4"],
[2,"ESTANTE Q4"],
[2,"ESTANTEH2"],
[2,"ESTANTE T3"],
[2,"ESTANTEV2"],
[2,"ESTAN S1"],
[2,"ESTAN S4"],
[2,"ESTAN S2"],
[2,"ESTAN S3"],
[2,"ESTAN R3"],
[2,"ESTANTE T5"],
[2,"ESTANTE T4"],
[2,"ESTANTE A4"],
[2,"ESTANTE A3"],
[2,"ESTANTE V5"],
[2,"PARTE SUPERIOR DE ESTANTERIAS"],
[2,"RETIRADO"],
[2,"ESTANTE H2"],
[2,"ESTANTE I1"],
[2,"ESTANTE I3"],
[2,"VERIFICAR"],
[2,"ESTANTE I2"],
[2,"ESTANTE E1"],
[2,"PISO 16"],
[3,"General"],
[4,"ESTANZ1"],
[4,"ESTANZ2"],
[4,"ESTAN Z3"],
[5,"ESTANTE Z1"],
[5,"ESTANTE Z2"],
[5,"ESTANTE i3"],
[5,"STANTE I3"],
[5,"General"],
[6,"ESTANTE C2"],
[6,"ESTANTE C3"],
[6,"ESTANTE C4"],
[6,"General"],
[6,"100A"],
[6,"63A"],
[6,"40A"],
[6,"25A"],
[6,"630A"],
[6,"320A"],
[6,"300A"],
[6,"50A"],
[6,"4X4"],
[6,"5 SAL 1/2"],
[6,"2X4"],
[6,"10X10X6.8CM"],
[6,"4X4X6.8CM"],
[6,"C-015"],
[6,"C-014"],
[6,"L5-30"],
[6,"C-007"],
[6,"L-15 30AMP"],
[6,"L-6 20P"],
[6,"L-5 20P"],
[6,"L6-20"],
[6,"L5 30R"],
[6,"L5 30P"],
[6,"L1 20AMP"],
[6,"L15 20P"],
[6,"L14 20AMP"],
[6,"L6 20P"],
[6,"L21 30"],
[6,"C20 1POLO"],
[6,"C20 2POLO"],
[6,"C50 2POLO"],
[6,"C40 2POLO"],
[6,"C30 1 POLO"],
[6,"C40 3POLO"],
[6,"C20 3POLO"],
[6,"2X4 Y 4X4"],
[6,"3 POLOS"],
[6,"CABLE 20A 2P PQ DE CABLES 4MM"],
[6,"32 AMP 3POLS - BOBINA 220 VOL MARCA SCHINEIDER"],
[6,"24V"],
[6,"25A AC-3, BOBINA 24VAC"],
[6,"32 AMP 3POLS - BOBINA 110 VOL MARCA SCHINEIDER"],
[6,"220 VOLT A 24 VOLT"],
[6,"3 X 70"],
[6,"120V"],
[6,"220V 10A/250"],
[6,"51210 EBCHQ"],
[6,"NEGRO"],
[6,"BLANCO"],
[6,"NARANJA HALUX Y DUPLE"],
[6,"NARANJA"],
[6,"BLANCA[SYS]"],
[6,"BLANCA -88001"],
[6,"COLOR/ALMENDRA-2111050"],
[6,"REFERENCIA"],
[6,"#12 \"NEGRO\""],
[6,"#12 \"VERDE\""],
[6,"#12 \"BLANCO\""],
[6,"3X14 AWG"],
[6,"L15-20P"],
[6,"L21-30"],
[6,"BLANCO HALUX"],
[6,"1\""],
[6,"3/4\""],
[6,"1/2\""],
[6,"110V"],
[6,"CAT. 6 X305 MTS"],
[6,"3X12AWG 50"],
[6,"15A"],
[6,"20A - 125V"],
[6,"15AMP - 125V"],
[6,"110V ROJO"],
[6,"3 X 10 AWG (METRO)"],
[6,"L5-20"],
[6,"#10 AWG \"BLANCO\" (METRO)"],
[6,"100X45MM"],
[6,"20X20"],
[6,"15X15"],
[6,"2X14"],
[6,"30X30"],
[7,"General"],
[8,"General"],
[9,"General"],
[10,"BODEGA #1"],
[10,"BODEGA #2"],
[10,"BODEGA #3"],
[10,"BODEGA #4"],
[10,"BODEGA #5"],
[10,"BODEGA #6"],
[10,"BODEGA #7"],
[10,"BODEGA #8"],
[10,"BODEGA #9"],
[10,"BODEGA #11"],
[10,"BODEGA #12"],
[10,"BODEGA #13"],
[10,"BODEGA #14"],
[10,"BODEGA #15"],
[10,"BODEGA #16"],
[10,"ALMACEN"],
[10,"General"],
[10,"UBICACION"],
[11,"General"],
[12,"General"],
[12,"UBICACION"],
[12,"ALMACEN"],
[13,"ESTAN K2"],
[13,"ESTAN K3"],
[13,"General"],
[13,"UBICACION"],
[14,"ESTANTE E"],
[14,"General"],
[14,"BODEGA 3"],
[14,"BODEGA 2"],
[14,"BODEGA2"],
[14,"ESTANTE F"],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS"],
[16,"General"],
[16,"ESTAN D3"],
[16,"ESTAN C2"],
[17,"General"],
[17,"BODEGA 3"],
[18,"ESTANF4"],
[18,"ESTANF3"],
[18,"ESTANTF4"],
[19,"ESTAN B1"],
[19,"ESTAN B2"],
[19,"ESTANTE B2"],
[19,"ESTANB2"],
[19,"ESTAN B3"],
[19,"ESTANTB4"],
[19,"ESTANB5"],
[19,"ESTANB4"],
[19,"ESTAN B4"],
[19,"ESTANb4"],
[19,"ESTANC1"],
[19,"ESTANTC1"],
[19,"ESTANC3"],
[19,"ESTAND3"],
[19,"ESTANTD3"],
[19,"ESTAD3"],
[19,"ESTAND2"],
[19,"ESTAND4"],
[19,"ESTANTB1"],
[19,"ESTANF1"],
[19,"ESTANTED2"],
[19,"ESTANTED3"],
[20,"ESTANTE P2"],
[20,"ESTANTE P3"],
[20,"ESTANTE P4"],
[20,"ESTANTE P5"],
[20,"ESTANTE Q3"],
[20,"ESTANTEQ3"],
[20,"ESTANTE R4"],
[20,"ESTANTE Q4"],
[20,"ESTANTEH2"],
[21,"BLOQUE AMARILLO"],
[21,"ESTANTE G2"],
[21,"BODEGA 2"],
[21,"BODEGA 3"],
[21,"ESTANTE F4"],
[21,"ESTANTE F2"],
[21,"ESTANTE f4"],
[21,"ESTANTE F1"],
[21,"ESTANATE H3"],
[21,"ESTANTE J2"],
[21,"ESTANTE H3"],
[22,"ESTANTEV2"],
[22,"General"],
[23,"PARTE SUPERIOR DE ESTANTERIAS"],
[24,"ESTANTE C3"],
[24,"ESTANTE C2"],
[24,"ESTANTEC2"],
[24,"ESTANTEC3"],
[24,"ESTANTE C4"],
[24,"ESTANTE D1"],
[24,"ESTANTED1"],
[24,"ESTANTEC4"],
[24,"ESTANTEC1"],
[24,"ESTANTE C1"],
[24,"ESTANTEA1"],
[24,"ESTANTE A1"],
[24,"ESTANTEB1"],
[25,"General"],
[26,"ESTAN S4"],
[26,"ESTAN S1"],
[26,"ESTAN S2"],
[26,"ZONZ"],
[26,"ESTAN R3"],
[26,"ESTAN S3"],
[27,"ESTANTE T5"],
[27,"ESTANTE T4"],
[27,"ESTANTE A4"],
[27,"ESTANTE A3"],
[27,"ESTANTE V5"],
[28,"ESTANE2"],
[28,"ESTANE1"],
[28,"RSTANE1"],
[28,"ESTAN E2"],
[28,"ESTANE3"],
[28,"ESTANE4"],
[28,"ESTANTE E4"],
[28,"ESTANTEE3"],
[28,"ESTANTE E2"],
];
const INV_IMPORT_ITEMS = [
[0,"General","REFRIGERANTE  R 410","","UNIDAD",1,1],
[0,"General","REFRIGERANTE  R 22","","UNIDAD",1,1],
[0,"General","REFRIGERANTE  R 134","","UNIDAD",0,1],
[0,"General","REFRIGERANTE  R 507","","UNIDAD",1,1],
[0,"General","REFRIGERANTE  R 404","","UNIDAD",1,1],
[0,"General","REFRIGERANTE  R 134A","","UNIDAD",1,1],
[0,"General","FILTROS 5/8","","UNIDAD",3,1],
[0,"General","FILTRO 7/8","","UNIDAD",5,2],
[0,"General","FILTRO 1 1/8","","UNIDAD",2,1],
[0,"General","FILTRO 1/2","","UNIDAD",3,1],
[0,"General","FILTRO 3/8","","UNIDAD",5,1],
[0,"General","FILTRO 1/4","","UNIDAD",2,1],
[0,"General","FILTRO SECADOR 1/4","","UNIDAD",7,2],
[0,"General","FILTRO SECADOR -DCL -307-7/8","","UNIDAD",3,1],
[0,"General","FILTRO SECADOR DML-165s 5/8 SOLDAR","","UNIDAD",3,0],
[0,"General","FILTRO SECADOR 3/8 ODF-DML 083s","","UNIDAD",3,0],
[0,"General","FILTRO SECADOR DML-164 1/2 SOLDAR","","UNIDAD",3,0],
[0,"General","FILTRO SELLO SOLDABLE 3/8","","UNIDAD",11,2],
[0,"General","FILTRO SELLO SOLDABLE 1/2","","UNIDAD",3,2],
[0,"General","CERRADURA CUARTO FRIO","","UNIDAD",10,1],
[0,"General","PRESOSTATO DE BAJA","","UNIDAD",4,2],
[0,"General","VALVULA EXPANCIVA 410A","","UNIDAD",2,1],
[0,"General","SEPARADOR DE ACEITE 5/8","","UNIDAD",3,1],
[0,"General","SEPARADOR DE ACEITE 1/2","","UNIDAD",7,1],
[0,"General","RECIBIDOR DE LIQUIDO 5/8","","UNIDAD",3,1],
[0,"General","RECIBIDOR DE LIQUIDO 1/2","","UNIDAD",3,1],
[0,"General","ACUMULADOR SUBCION 7/8","","UNIDAD",5,1],
[0,"General","ACUMULADOR SUBCION 5/8","","UNIDAD",6,1],
[0,"General","TRANSFORMADOR 120V-208V-240V","","UNIDAD",4,1],
[0,"General","SENSOR DE TEMPERATURA","","UNIDAD",3,1],
[0,"General","MONITOR DE TEMPERATURA","","UNIDAD",3,1],
[0,"General","TABLERO DE CONTROL","","UNIDAD",1,1],
[0,"General","CONTROLADOR DE TEMPERATURA","","UNIDAD",1,1],
[0,"General","BOMBA PEDROLO DE 2 CABALLO PARA AGUA CALIENTE","","UNIDAD",0,0],
[0,"General","CONTACTOR 40AMP","","UNIDAD",1,1],
[0,"General","RELAY","","UNIDAD",3,1],
[0,"General","VALVULA VISORA DE REFRIGERANTE","","UNIDAD",1,1],
[0,"General","TEMPORIZADOR","","UNIDAD",3,1],
[0,"General","CONTACTOR AC 2P-40A-240V","","UNIDAD",1,1],
[0,"General","TRANSFORMADOR 120V-208V/240 AC","","UNIDAD",1,1],
[0,"General","SENSOR HUMEDAD","","UNIDAD",2,1],
[0,"General","SENSOR NIVEL DE AGUA","","UNIDAD",1,1],
[0,"General","SONDA ESPESOR DE HIELO","","UNIDAD",1,1],
[0,"General","PRESOSTATO","","UNIDAD",1,1],
[0,"General","REGULADOR OXIGENO/ACETILENO","","UNIDAD",1,1],
[0,"General","PRESOSTATO RANGO BAJA PRESION","","UNIDAD",2,1],
[0,"General","VALVULA GUSANILLO","","UNIDAD",18,1],
[0,"General","VALVULA+ADTUADOR","","UNIDAD",2,1],
[0,"General","FILTRO SECADOR SOLDABLE","","UNIDAD",3,1],
[0,"General","REGULADOR D EOXIGENO","","UNIDAD",1,1],
[0,"General","SENSOR TEMPERATURA MAQUINA DE HIELO","","UNIDAD",3,1],
[0,"General","PANEL DE CONTROL","","UNIDAD",2,1],
[0,"General","TRANSFORMADOR","","UNIDAD",1,1],
[0,"General","VENTILADOR NEVERA 230V 50/60HZ","","UNIDAD",3,1],
[0,"General","VENTILADOR NEVERA 18W  230V 0,48A 60HZ","","UNIDAD",1,1],
[0,"General","CILINDRO RECUPERADOR REFRIGERANTE 50 LBS","","UNIDAD",1,2],
[0,"General","TEMPORIZADOR DIGITAL INDUSTRIAL","","UNIDAD",1,1],
[0,"General","JUEGO DE MANOMETROS 3-1/8R-410/R22/R404/R134","","UNIDAD",2,2],
[0,"General","RUBATEX CINTA ROLLO 1/8\" X 2\" ESP. X 9.15","","UNIDAD",3,3],
[0,"General","CONTROL DE TEMPERATURA CONSERVACION MT512 E","","UNIDAD",3,3],
[0,"General","TERMOSTATO 077B7100 RANGO +8.5 C A 3 C NEVERA","","UNIDAD",4,3],
[0,"General","TERMOSTATO 077B7102 RANGO -9.5 C A - 15 C CONGELADOR","","UNIDAD",-2,3],
[0,"General","TERMOSTATO 077B7100 RANGO +8.5 C A -3 C","","UNIDAD",5,3],
[0,"General","TERMOSTATO 077B7102 RANGO -9.5 C A - 15 C","","UNIDAD",6,3],
[0,"General","CONTACTOR REFRIGERACION 2X32 110V CHINT","","UNIDAD",2,3],
[0,"General","CONTROL DE TEMPERATURA ANALOGO","","UNIDAD",3,3],
[0,"General","CAPACITOR MARCHA 45 MF 440VAC","","UNUDAD",5,0],
[0,"General","CAPACITOR DE  MARCHA 35UF.370 VAC","","UNIDAD",4,0],
[0,"General","CAPACITOR DE MARCHA DE 55UF.370/440VAC","","UNIDAD",5,0],
[0,"General","LANZA DE HD 585","","UNIDAD",1,0],
[0,"General","LANZA 360 VARIO POWER","","UNIDAD",1,0],
[0,"General","DILSOVENTE PRO FLUSH","","UNIDAD",1,3],
[0,"General","MANGUERA PUNTO-PUNTO","","UNIDAD",1,0],
[0,"General","MANGUERA PARA LIMPIEZA DE TUBERIAS","","UNIDAD",0,1],
[0,"General","PORTABOQUILLA PARA 585","","UNIDAD",1,0],
[0,"General","ACOPLAMIENTO DE BOQULLA CORTA","","UNIDAD",1,0],
[0,"General","FILTRO EXTERNO","","UNIDAD",0,1],
[0,"General","VARIO POWER JET SHORT 360","","UNIDAD",0,1],
[0,"General","JUEGO PARA LIMPIEZA DE TUBERIAS","","UNIDAD",0,1],
[0,"General","BOQUILLA ARTICULABLE PROFESIONAL","","UNIDAD",0,1],
[0,"General","ACOPLE RAPIDO CON STOP","","UNIDAD",5,5],
[0,"General","RACOR","","UNIDAD",7,5],
[0,"General","RACOR VALVULA DE ACCESO 1/4","","UNIDAD",10,0],
[0,"General","COMPRESOR SCROLL COPELAD DE 3 TR/3PH/220V","","UNIDAD",1,0],
[0,"General","TERMOSTATO DIGITAL NO PROGRAMABLE DE 1 1 ETAPAHONEYWELL 24V","","UNIDAD",4,0],
[0,"General","TERMOSTATO DIGITAL NO PROGRAMABLE 1 ETAPA FOCUSPRO HONEYWELL","","UNIDAD",1,0],
[0,"General","EXT-CF230-D202-AF | TERMOSTATO ON-OFF 110-230V 1 ETAPA | BELIMO","","UNIDAD",2,3],
[0,"General","PUNTA SOPLETE","","UNIDAD",1,0],
[0,"General","SOLDADURA DE COBRE","","UNIDAD",15,0],
[0,"General","ANTORCHA PARA GAS","","UNIDAD",1,0],
[0,"General","BLOOWER","","UNIDAD",1,0],
[0,"General","PANEL TACTIL CON CARCASA","","UNIDAD",0,1],
[0,"General","GAS PARA SOLDAR MAPP/PRO","","UNIDAD",5,0],
[0,"General","CONTROL DE PRESION BAJA KP1 060-110566","","UNIDAD",3,0],
[0,"General","DISCO DE CORTE 4 1/2''","","UNIDAD",10,0],
[0,"General","DISCO DE PULIR 4 1/2''","","UNIDAD",10,0],
[0,"General","DISCO DE  CARBON FLASH GRANO 80","","UNIDAD",5,0],
[0,"General","MOTOR DE 110V/127V","","UNIDAD",6,0],
[0,"ALMACEN","DYNAVIEW POWER SUPPLY BOARD (FUS01513) CH530 27 VAC INPUT, 24 VDC OUTPUT","","UNIDAD",1,0],
[0,"ALMACEN","BOARD;DUAL BINARY INPUT, PROGRAMMING REQUIRED","","UNIDAD",1,0],
[0,"ALMACEN","BOARD; DUAL ANALOG I/O, WITH PLUGGABLE CONNECTORS, PROGRAMMING REQUIRED","","UNIDAD",1,0],
[0,"ALMACEN","BOARD; DUAL HIGH VOLTAGE BINARY INPUT, PROGRAMMING REQUIRED","","UNIDAD",1,0],
[0,"ALMACEN","BOARD ; DUAL TRIAC OUTPUT, PROGRAMMING REQUIRED","","UNIDAD",1,0],
[0,"ALMACEN","BOARD; QUAD RELAY OUTPUT, PROGRAMMING REQUIRED","","UNIDAD",1,0],
[0,"ALMACEN","MODULE ; FLOW SENSOR CONTROL","","UNIDAD",1,0],
[0,"ALMACEN","RELAY; MOTOR RELAY, SPST,NO,10 A, 120 VAC, 24.6 AMP PULL IN, 20.3 AMP DROP OUT RELAY","","UNIDAD",1,0],
[0,"ALMACEN","CABLE; MICRO DC, 10M LENGTH, PUR JACKET","","UNIDAD",1,0],
[0,"ALMACEN","SENSOR; FLOW PROBE","","UNIDAD",1,0],
[0,"ALMACEN","ADAPTOR; CLAMP, 1/2\" NTP, STAINLESS STEEL, NEOPRENE SEALING RING FOR FLOW PROBE","","UNIDAD",1,0],
[0,"ALMACEN","SENSOR, TEMPERATURE SENSOR, OVERMOLDED, PROGRAMMING REQUIRED","","UNIDAD",4,0],
[0,"ALMACEN","MODULE; HI POWER RELAY OUTPUT","","UNIDAD",1,0],
[0,"ALMACEN","FAN; 115V, LIQUIFLO 2","","UNIDAD",1,0],
[0,"ALMACEN","FAN, 115V, 230 CFM, 3100 RPM, LIQUIFLO 2","","UNIDAD",2,0],
[0,"ALMACEN","TRANSDUCER; 70 PSI, 0.25 - 18 NPTF, M-PACK","","UNIDAD",0,0],
[0,"ALMACEN","DRIER; LIQUID LINE FILTER, 38 SAE","","UNIDAD",1,0],
[0,"ALMACEN","FILTER; OIL, SPIN-ON, 8.0\" LENGTH< 3 MICRON","","UNIDAD",0,0],
[0,"ALMACEN","BOARD; RECTIFIER POWER ASSY","","UNIDAD",1,0],
[0,"ALMACEN","MODULE; 608 AMP, INVERTER POWER INTERFACE ASSEMBLY","","UNIDAD",1,0],
[0,"ALMACEN","BOARD; LINE SYNC PC","","UNIDAD",1,0],
[0,"ALMACEN","DRIER; SERVICEFIRST OEM PURGE FILTER DRIER FOR CENTRIFUGAL UNITS","","UNIDAD",2,0],
[0,"ALMACEN","TARJETA DE SEGUNDA ASENSOR#19 IONIC","","UNIDAD",1,0],
[0,"ZONA","NOMBRE O REFERENCIA","","UNIDAD DE MEDIDA",0,0],
[1,"General","sopladora inalambrica S/N 236357K","makita","unidad",1,0],
[1,"General","aspiradora back pack pro team tipo mochila","","unidad",1,0],
[1,"General","hidrilavadora inalambrica S/N 000196868","makita","unidad",1,0],
[1,"General","filtros internos","","unidad",10,0],
[1,"General","filtros externos","","unidad",10,0],
[1,"General","taladros inalambricos","DEWALT","unidad",3,0],
[1,"General","bomba de vacio","","unidad",3,0],
[1,"General","pulidora makita 115mm (4-1/2)","","unidad",1,0],
[1,"General","taladro percutor","","unidad",1,0],
[1,"General","pulidora inlambrica","","unidad",1,0],
[1,"General","taladro destornilldor","DEWALT","unidad",1,0],
[1,"General","pistola de calor + kit 5 boquillas + 2 bateria","","unidad",1,0],
[1,"General","sopladora inalambrica + bateria 12v-4ah","","unidad",1,0],
[1,"General","taladro percutor","","unidad",2,0],
[1,"General","pistola calafateo","","unidad",4,0],
[1,"General","martillo de caucho 16 oz","","unidad",2,0],
[1,"General","mona de acero de 2 libras","","unidad",3,0],
[1,"General","Martillo de uña colima #29mm","","unidad",3,0],
[1,"General","recuperadora de refrigerante","","unidad",1,0],
[1,"General","CARCAZA PORTACARTUCHO","BIG BLUE DE 20\" CON CONEXCION DE ENTRADA Y SALIDA DE 1 1/2\"","unidad",2,0],
[1,"General","CARTUCHO FILTRANTE EN POLIPROPILENO TERMOAGLOMERADO","MB-1-20 BB","unidad",6,0],
[1,"General","CARTUCHO FILTRANTE EN POLIPROPILENO TERMOAGLOMERADO","MB-5-20 BB","unidad",6,0],
[1,"General","ACOPLE DE MAGUERA DE MEDIA","CONECTOR MAGUERA RAPIDO","unidad",4,0],
[1,"General","GRASA SILICONE AEROSOL","CRC FOOD","unidad",9,0],
[2,"ESTANE2","FILTRO SECADOR DE LIQUIDO SOLDABLE 1/2","023Z5061","UNIDAD",3,1],
[2,"ESTANE2","FILTRO SECADOR HERMATICO","023Z5067","UNIDAD",1,1],
[2,"ESTANE2","FILTRO SECADOR HERMATICO","023Z5068","UNIDAD",2,1],
[2,"ESTANE2","FILTRO SECADOR HERMATICO","023Z0071","UNIDAD",3,1],
[2,"ESTANE2","FILTRO SECADOR HERMETICO","023Z0071","UNIDAD",3,1],
[2,"ESTANE2","FILTRO SECADOR HERMETICO","023Z5058","UNIDAD",10,2],
[2,"ESTANE2","FILTROS 5/8","5/8''","UNIDAD",4,1],
[2,"ESTANE2","FILTRO  DE SUCCION","7/8''","UNIDAD",5,2],
[2,"ESTANE2","FILTRO  CAPACIDAD DE FLUJO DE SUCCION","1-1/8''","UNIDAD",2,1],
[2,"ESTANE2","FILTRO SECADOR","1/2''","UNIDAD",3,1],
[2,"ESTANE2","FILTRO SECADOR   DE LINEA LIQUIDA DE BAJA TEMPERATURA","3/8 EK-083","UNIDAD",1,1],
[2,"ESTANE2","FILTRO SECADOR HERMETICO","3/8EK-30-3R","UNIDAD",2,1],
[2,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7100","UNIDAD",8,4],
[2,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7101","UNIDAD",5,1],
[2,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7102","UNIDAD",11,5],
[2,"ESTANE2","TERMOSTATO TEMPERATURA DE TRABAJO","FOCUS PRO N100","UNIDAD",7,1],
[2,"ESTANE2","PRESOSTATO DE ALTA  PRESION REFRIGERANTE","60110566","UNIDAD",7,1],
[2,"ESTANE2","CAPACITOR  MARCHA O ARRANQUE","RW-44R450-440VAC","UNIDAD",4,2],
[2,"ESTANE2","CAPACITOR MARCHA DE 35UF","35UF-450VAC","UNIDAD",4,2],
[2,"ESTANE2","CAPACITOR","80UF-450VAC","UNIDAD",2,2],
[2,"ESTANE2","CAPACITOR DE MARCHA DE 55UF.370/440VAC","55UF-370V-440V","UNIDAD",4,1],
[2,"ESTANE2","CAPACITOR","RW-37R075-7.5 UF-370VAC","UNIDAD",5,2],
[2,"ESTANE2","CAPACITOR DE ARRANQUE DE 108- 130UF","108-130UF-250VAC","UNIDAD",2,1],
[2,"ESTANE2","CAPACITOR","10UF-440VAC","UNIDAD",1,1],
[2,"ESTANE2","VALVULA DE EXPASION TERMOSTATICA","NBE 5ZAAODF","UNIDAD",3,1],
[2,"ESTANE2","CONTACTOR","30A-FLA 40 AMP-24VAC","UNIDAD",4,1],
[2,"ESTANE2","CONTACTOR","NCK 3-32/2-110V","UNIDAD",2,1],
[2,"ESTANE3","CONTROL O MONITOR DE TEMPERATURA","TMD-4T","UNIDAD",3,1],
[2,"ESTANE4","SENSOR DE TEMPERATURA","SEN02133","UNIDAD",4,1],
[2,"ESTANE5","RESISTENCIA DE CARGA","","UNIDAD",2,1],
[2,"ESTANE2","RELAY","SRSP-12-110V/60HZ","UNIDAD",2,1],
[2,"ESTANE3","TERMOSTATO","110/230V","UNIDAD",1,1],
[2,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","FD1550A2HB-220/240V","UNIDAD",0,1],
[2,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","FM17250A2HBL-220/240NAC","UNIDAD",2,1],
[2,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","120X120X30MM-AC 110","UNIDAD",5,1],
[2,"ESTANE3","RELE DE POTENCIA","IDECRJ25/CL-D24","UNIDAD",1,1],
[2,"ESTANE3","RE DE CONMUTACION DE PROPOSITO GENERAL","RW-90340-208/240V","UNIDAD",0,1],
[2,"ESTANE3","FUSIBLE CILINDRICO CERAMICO","RT18-32/RT14-20-500V,16A","UNIDAD",0,1],
[2,"ESTANE3","BOBINA PARA VALVULA SOLENOIDE","200-220/208-240V","UNIDAD",1,1],
[2,"ESTANE4","MOTOR","18W - 220V","UNIDAD",3,1],
[2,"ESTANE3","MOTOR","10/127V","UNIDAD",10,1],
[2,"ESTANE3","VALVULA DE GUSANILLO","","UNIDAD",-2,1],
[2,"ESTANE3","CEPILLO LIMPIADOR DE TUBOS DE NAILO AZUL","","UNIDAD",37,1],
[2,"ESTANE3","SOLENOIDE","220-240V","UNIDAD",2,4],
[2,"ESTANE3","REFRIGERANTE R 507","R-507","TANQUE 11.3K",2,1],
[2,"ESTANE4","REFRIGERANTE R- 22","R-22","TANQUE 13.6K",1,1],
[2,"ESTANTE E4","REFRIGERANTE R-290","R-290","TANQUE 5K",2,1],
[2,"ESTANE4","REFRIGERANTE R 410A","R-410A","UNIDAD",2,1],
[2,"ESTANE4","BUTANO","","UNIDAD",1,1],
[2,"ESTANTE E2","CUERPO VAVULA SOLENOIDE 3/8","SOLDAR","UNIDAD",0,1],
[2,"ESTANE2","FILTRO SECADOR","023Z2028","UNIDAD",8,1],
[2,"ESTANE1","FILTRO SEPARADOR","5/8''","UNIDAD",2,2],
[2,"ESTANE1","FILTRO ACUMULADOR DE SUCCION O LIQUIDO","7/8''","UNIDAD",4,2],
[2,"ESTANE1","FILTRO SEPARADOR DE ACEITE?","1/2''","UNIDAD",4,2],
[2,"RSTANE1","FILTRO DE SUCCION","5/8''","UNIDAD",4,2],
[2,"ESTANE1","VERTICAL LIQUID RECEIVER","1/2''","UNIDAD",3,1],
[2,"ESTANE1","VERTICAL LIQUID  RECERVADOR","6/8''","UNIDAD",1,1],
[2,"ESTAN E2","FILTRO DE LIQUIDO 1/4 SOLDABLE","","UNIDAD",2,0],
[2,"ESTANE2","FILTRO SECADOR","1/4''","UNIDAD",7,2],
[2,"ESTANE2","BOBINA DE ENCENDIDO","250VAC","UNIDAD",3,1],
[2,"ESTANE2","TRANFORMADOR DE CONTROL","ENTRADA 480V(1-2)SALIDA 24V(4-5)","UNIDAD",1,1],
[2,"ESTANE2","CONTROLADOR -MT-512E-2HP","115 OR-230VAC","UNIDAD",3,1],
[2,"ESTANE2","TRANFORMADOR","POWER 40VA-RW 40310F","UNIDAD",1,1],
[2,"ESTANE3","TEMPORIZADOR DE RETARDO","","UNIDAD",3,1],
[2,"ESTAND2","SOLENOIDE","110-220V","UNIDAD",27,4],
[2,"ESTANE4","REFRIGERANTE R 134A","R-134A","UNIDAD",0,1],
[2,"ESTANE4","REFRIGERANTE R 404A","R-404A","TANQUE 13K",0,1],
[2,"ESTANTEE3","BARILLA","DE SOLDAR","UNIDAD",193,15],
[2,"ESTANTEE3","ASPA METALICA","8''","UNIDAD",1,2],
[2,"ESTAN B1","FUSIBLE ALTA TENCION","25AMP-10/24KV","UNIDAD",3,1],
[2,"ESTAN B1","FUSIBLE ALTA TENCION","63AMP-10/24KV","UNIDAD",11,1],
[2,"ESTAN B1","FUSIBLE ALTA TENCION","100AMP-10/24KV","UNIDAD",3,1],
[2,"ESTAN B1","FUSIBLE ALTA TENCION","40AMP-24KV","UNIDAD",0,1],
[2,"ESTAN B1","FUSIBLE DE EXPULSION","24KV","UNIDAD",1,1],
[2,"ESTAN B1","TOTALIZADOR","630AMP","UNIDAD",1,1],
[2,"ESTAN B1","TOTALIZADOR","320AMP","UNIDAD",2,1],
[2,"ESTAN B1","SOCKET OJO DE WUEY","","UNIDAD",227,20],
[2,"ESTAN B2","INTERUPTOR  DE COMBINACION DOBLE","15A-120/227V","UNIDAD",14,3],
[2,"ESTAN B2","INTERUPTOR DE TRES","15A-120/227V","UNIDAD",10,10],
[2,"ESTANTE B2","INTERRUPTOR CONMUTABLE SENCILLO","120/277V BLANCO","IUNIDAD",15,5],
[2,"ESTAN B2","INTERUPTOR DE.UNO","15A-120V/227AC","UNIDAD",10,5],
[2,"ESTAN B2","INTERUPTOR DE LUZ DE DOBLE PALANCA","COLOR BLNCO","UNIDAD",8,5],
[2,"ESTAN B2","INTERUPTOR","SENSOR DE OCUPACION","UNIDAD",1,6],
[2,"ESTAN B2","INTERUPTOR BARRA DE LUZ TOQUE","LED","UNIDAD",1,3],
[2,"ESTAN B2","TOMA CORIENTE DUPLEX","COMPUERTO-USB","UNIDAD",4,3],
[2,"ESTAN B2","PULSADOR SENSILLO","ETI92-10A-T227/250V","UNIDAD",0,3],
[2,"ESTAN B2","PORTA FUSIBLE","","UNIDAD",0,2],
[2,"ESTAN B3","CAJA FUNDIDA DE 5 HUECOS","","UNIDAD",16,2],
[2,"ESTAN B3","CAJA FUNDIDA DE 3 HUECOS","","UNIDAD",11,2],
[2,"ESTAN B3","CAJA OCTAGONAL REDONDA DE 5 HUECOS","","UNIDAD",8,2],
[2,"ESTAN B3","CAJA ELECTRICA OCTAGONAL REDONDA","","UNIDAD",10,1],
[2,"ESTAN B3","CAJA ELECTRICA CUADRADA","","UNIDAD",3,1],
[2,"ESTANTB4","CAJA ELECRTICA","DEXSON","UNIDAD",8,15],
[2,"ESTAN B3","CAJA ELECTRICA","","UNIDAD",7,1],
[2,"ESTANB5","CAJA HERMETICA","HALUX","UNIDAD",8,5],
[2,"ESTANB5","CAJA ELECTRICA","HALUX","UNIDAD",1,5],
[2,"ESTANB5","CAJA DE PASO","HALUX","UNIDAD",2,5],
[2,"ESTANB5","CAJA ELECTRICA","HALUX","UNIDAD",2,3],
[2,"ESTAN B3","TOMA CORIENTE DE SEGURIDAD","LEVINTON","UNIDAD",11,1],
[2,"ESTAN B3","TOMA CORIENTE[RECEPTACULO]","LEVINTON","UNIDAD",4,1],
[2,"ESTAN B3","TOMA ELECTRICO[RECEPTACULO]","LEVINTON","UNIDAD",5,1],
[2,"ESTAN B3","CLAVIJA MACHO","LEVINTON","UNIDAD",3,10],
[2,"ESTAN B3","CLAVIJA TRIFASICA CAUCHO","LEVINTON","UNIDAD",2,10],
[2,"ESTANB4","TOMA CORIENTE DOBLE","LEVINTON","UNIDAD",8,10],
[2,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",14,10],
[2,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",1,10],
[2,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",6,10],
[2,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",4,10],
[2,"ESTANB4","CLAVIJA","LEVINTON","UNIDAD",4,10],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",10,2],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",0,10],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",1,10],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",4,2],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",4,2],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",0,2],
[2,"ESTANB4","CLAVIJA","LEVINTON","UNIDAD",2,10],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",3,12],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",3,12],
[2,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",0,6],
[2,"ESTANB2","CLAVIJA  DE CAUCHO","","UNIDAD",14,10],
[2,"ESTAN B4","CONECTORES","LEVINTON","UNIDAD",1,10],
[2,"ESTAN B4","CONECTORES","LEVINTON","UNIDAD",1,10],
[2,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",2,10],
[2,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",0,15],
[2,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",-1,10],
[2,"ESTANB4","TAPA ELECTRICA DE TOMA CORIENTE","LEVINTON","UNIDAD",62,15],
[2,"ESTANB4","TAPA CIEGA","LEVINTON","UNIDAD",70,15],
[2,"ESTANB4","TAPACIEGA","LEVINTON","UNIDAD",0,6],
[2,"ESTANB4","TAPA CIEGA","LEVINTON","UNIDAD",0,10],
[2,"ESTANB4","TAPA ELECTRICA","LEVINTON","UNIDAD",10,10],
[2,"ESTANB4","ADAPTADOR DE ENCHUFE","LEVINTON","UNIDAD",13,15],
[2,"ESTANb4","PLACA DE PARED","LUTRON","UNIDAD",20,5],
[2,"ESTANB4","PLACA DE PARED","LUTRON","UNIDAD",53,15],
[2,"ESTANB4","PLACA DE PARED","LUTRON","UNIDAD",27,10],
[2,"ESTANB4","TAPAS LEVINTON DE HABITACIONES NUEVA","LEVINTON","UNIDAD",26,5],
[2,"ESTANB4","TAPA DE 1 HUECO HABITACION NUEVA","LEVINTON","UNIDAD",38,15],
[2,"ESTANB4","PATA DUPLEX ESTANDAR LEVINTON 80703-ORG","LEVINTON","UNIDAD",11,10],
[2,"ESTANB4","TAPA CIEGA PARA CONEXIONES ELECTRICAS","LEVINTON","UNIDAD",2,5],
[2,"ESTANB4","TAPA DE INTERUPTOR DE LUZ LEVINTON","LEVINTON","UNIDAD",8,10],
[2,"ESTANB4","TAPA[ O PLACA]PARA CONECTIVIDAD CON 2 PUERTO PARA MODULO TIPO KEYSTONE","LEVINTON","UNIDAD",3,10],
[2,"ESTANC3","TRANSFORMADOR","","UNIDAD",5,4],
[2,"ESTAND3","BREKER MONO FASICO","HYUNDAI","UNIDAD",9,15],
[2,"ESTAND3","BREKER MONO FASICO","HYUNDAI","UNIDAD",0,10],
[2,"ESTAND3","BREKER MONO FASICO","SQUARE","UNIDAD",15,10],
[2,"ESTAND3","BREKER MONO FASICO","LUMEK","UNIDAD",7,5],
[2,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",20,10],
[2,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",1,10],
[2,"ESTAND3","BREKER TRIFASICO","LEGRAND","UNIDAD",1,10],
[2,"ESTAD3","BREKER TRIFASICO","","UNIDAD",13,10],
[2,"ESTAND2","SOCKET","","UNIDAD",230,80],
[2,"ESTAND2","WAGO","","UNIDAD",42,80],
[2,"ESTAND2","BOTON INDICADOR","","UNIDAD",20,15],
[2,"ESTAND2","BOTON INDICADOR","","UNIDAD",10,15],
[2,"ESTAND2","BOTON INDICADOR","","UNIDAD",10,15],
[2,"ESTAND2","BOTON INDICADOR","","UNIDAD",5,15],
[2,"ESTAND4","CONTACTOR DE3 POLOS","CHINT","UNIDAD",2,5],
[2,"ESTAND4","CONTACTOR","PACKARD","UNIDAD",1,1],
[2,"ESTAND4","CONTACTOR","CHINT","UNIDAD",24,10],
[2,"ESTAND2","BATERIA","UNIVERSAL","UNIDAD",52,30],
[2,"ESTANTE L2","CABLE ENCAUCHETADO","3*12 AWG","METROS",90,20],
[2,"ESTANTE L","ROLLO DE CALBE 7 HILOS","N,12 BLANCO * 100 MTS","UNIDAD",1,1],
[2,"ESTANTE L2","ROLLO DE CALBE 7 HILOS","N,12 NEGRO * 100 MTS","UNIDAD",1,1],
[2,"ESTANL2","CABLE","VCP CONNECT +","METROS",200,20],
[2,"ESTANTED2","MINICONTACTOR","OPELCOM","UNIDAD",5,1],
[2,"ESTANTED3","MINICONTACTOR","OPELCOM","UNIDAD",4,1],
[2,"ESTANTED2","MINICONTACTOR","OPELCOM","UNIDAD",4,1],
[2,"ESTAN B1","TOTALIZADOR","","UNIDAD",1,1],
[2,"ESTAN B1","TOTALIZADOR","","UNIDAD",1,1],
[2,"ESTANB2","ADAPTADOR DE CORIENTE ALTERNA","","UNIDAD",3,3],
[2,"ESTAN B3","CAJA ELECTRICA  CUADRADA","","UNIDAD",22,1],
[2,"ESTAN B3","CAJA ELECTRICA  CUADRADA","","UNIDAD",4,1],
[2,"ESTANB5","CAJA DE TOMA USUARIO","HALUX","UNIDAD",1,5],
[2,"ESTANB4","TOMA CORIENTE SENSILLO","LEVINTON","UNIDAD",8,10],
[2,"ESTANB4","TOMA CORIENTE","LEGRAND","UNIDAD",12,10],
[2,"ESTANB4","FUSILES MODULAR","","UNIDAD",1,10],
[2,"ESTANB4","AUXILIARES SIEMEN","","UNIDAD",3,15],
[2,"ESTANB4","CONTROL REMOTO","LUTRON","UNIDAD",19,10],
[2,"ESTANB4","MODULO DE RELES","LUTRON","UNIDAD",9,5],
[2,"ESTANB4","REVELO 8 OINES","","UNIDAD",4,10],
[2,"ESTANB4","TAPA PARA TOMA CORIENTE DUPLEX[DOBLE]","LEVINTON","UNIDAD",8,10],
[2,"ESTANB4","TAPAS SYS[SOCKETS-Y-SUICHES]","LEVINTON","UNIDAD",30,10],
[2,"ESTANB4","TAPAS TRADEMASTER","LEVINTON","UNIDAD",1,10],
[2,"ESTANB4","TAPAS PARA CORIENTE DOBLE CON POLO ATIERRA AISLADO","LEVINTON","UNIDAD",10,5],
[2,"ESTANB4","TAPAFRONTAL DE UNA SOLA BANDA CO 2 PUERTO","LEVINTON","UNIDAD",2,15],
[2,"ESTANB4","BORNA SCRW50U CONNECTECH","LEVINTON","UNIDAD",6,10],
[2,"ESTANB4","CONTACT CLEANER ELECTRICO QD 16 OZ NACIONAL","LEVINTON","UNIDAD",5,6],
[2,"ESTANC1","SENSOR","","UNIDAD",1,5],
[2,"ESTANTC1","SENSO R","","UNIDAD",2,5],
[2,"ESTANC1","RADIO","","UNIDAD",2,4],
[2,"ESTANC1","PEGA TRAP","","UNIDAD",13,5],
[2,"ESTANC1","FUENTES","","UNIDAD",79,12],
[2,"ESTANB2","PORTA LAMPARA","","UNIDAD",4,10],
[2,"ESTANB2","PORTA LAMPARA","","UNIDAD",10,15],
[2,"ESTANB5","REGULADOR ELECTRICO","","UNIDAD",4,10],
[2,"ESTANB5","TECLADO","LUTRON","UNIDAD",5,5],
[2,"ESTANB5","SENSOR","","UNIDAD",4,5],
[2,"ESTANB5","SENSOR","LUTRON","UNIDAD",2,5],
[2,"ESTANB5","MODULO","LUTRON","UNIDAD",2,5],
[2,"ESTANB5","RADIO","","UNIDAD",9,5],
[2,"ESTANB5","REGULADOR","","UNIDAD",1,4],
[2,"ESTANB5","TRANSFORMADOR","","UNIDAD",36,10],
[2,"ESTAND3","BREKERBIFASICO","HYUNDAI","UNIDAD",20,15],
[2,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",2,15],
[2,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",3,15],
[2,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",2,15],
[2,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",9,15],
[2,"ESTAND3","BREKER  TRIFASICO","HYUNDAI","UNIDAD",1,10],
[2,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",9,15],
[2,"ESTANTD3","BREKER MONO FASICO","VECAS","UNIDAD",1,10],
[2,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",2,5],
[2,"ESTAND3","BREKER MONO FASICO","LEGRAND","UNIDAD",3,5],
[2,"ESTAND3","BREKER MONO FASICO","LEGRAND","UNIDAD",1,10],
[2,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",3,5],
[2,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",2,15],
[2,"ESTAND3","BREKER TRIFASICO","LUMEK","UNIDAD",0,1],
[2,"ESTAND3","BREKER TRIFASICO","LUMEK","UNIDAD",2,1],
[2,"ESTAND3","INTERUPTOR TERMO MAGNECTICO","","UNIDAD",10,15],
[2,"ESTAND3","INTERUPTOR MAGNECTICO","","UNIDAD",11,15],
[2,"ESTAND2","MANOMETRO","","UNIDAD",4,5],
[2,"ESTAND2","MANOMETRO","","UNIDAD",1,5],
[2,"ESTAND2","MANOMETRO","","UNIDAD",1,4],
[2,"ESTAND2","CONTROLADOR","","UNIDAD",1,3],
[2,"ESTAND2","LED DRIVER","","UNIDAD",1,3],
[2,"ESTAND2","FUENTE DE ALIMENTACION","SEKUR","UNIDAD",1,4],
[2,"ESTAND2","FUENTE DE ODER METALICA","","UNIDAD",2,5],
[2,"ESTAND2","WAGO","","UNIDAD",75,80],
[2,"ESTAND2","CONECTOR","","UNIDAD",30,80],
[2,"ESTAND4","TOTALIZADOR TERMOMAGNECTICO","EASYPACT-EZC100B","UNIDAD",4,10],
[2,"ESTAND4","TOTALIZADPOR DE CAJA DE 3 PLOS","ABB","UNIDAD",2,5],
[2,"ESTAND4","TOTALIZADOR AUTMATICO","HYUNDAI","UNIDAD",1,4],
[2,"ESTAND4","TOTALIZADOR AUTOMATICO","HYUNDAI","UNIDAD",3,4],
[2,"ESTAND4","TOTALIZADOR 3 POLOS","SCHENEIDER","UNIDAD",1,4],
[2,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,4],
[2,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,4],
[2,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",9,10],
[2,"ESTAND4","TOTALIZADOR","ABB","UNIDAD",2,10],
[2,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,10],
[2,"ESTAND4","TOTALIZADOR","HOME","UNIDAD",2,10],
[2,"ESTAND4","CONTACTOR","SIEMENS","UNIDAD",0,5],
[2,"ESTAND4","INTERUPTOR HORARIO DIGITAL","RELETEK","UNIDAD",2,4],
[2,"ESTAND4","PROGRAMADOR SEMANAL","","UNIDAD",1,4],
[2,"ESTAND4","CONTACTOR","SHENEIDER","UNIDAD",1,2],
[2,"ESTAND4","CONTACTOR","SHENEIDER","UNIDAD",1,2],
[2,"ESTANTB1","LAMPARA","","UNIDAD",28,15],
[2,"ESTAND2","BATERIA DE BOTON DE LITIO","CR2430","UNIDAD",20,15],
[2,"ESTAND2","BATERIA DE BOTON DE LITIO","CR2032","UNIDAD",10,5],
[2,"ESTAND2","TERMOMETRO DIGITAL","PARTS","UNIDAD",1,15],
[2,"ESTAND2","BATERIA-AA","X PAR","UNIDAD",47,20],
[2,"ESTAND1","BATERIA-AAA","X PAR","UNIDAD",50,20],
[2,"General","SOPORTE DE LAMAPARA DE POSTE","","UNIDAD",62,1],
[2,"General","RELE ESTADO SOLIDO","25A","UNIDAD",0,1],
[2,"ESTANTE D2","FUENTE DE PODER PARA PISCINAS","110V-TKH100","UNIDAD",2,1],
[2,"ESTANTE C3","LED","7W","UNIDAD",52,15],
[2,"ESTANTE C3","LED","7W","UNIDAD",2,1],
[2,"ESTANTE C4","LED COB","5W","UNIDAD",8,1],
[2,"ESTANTE C3","LED","75W","UNIDAD",2,15],
[2,"ESTANTE C2","LED","5W","UNIDAD",12,15],
[2,"ESTANTE C2","BOMBILLO","G25/5W/120V/60HZ/500ML/2700K/E26","UNIDAD",24,1],
[2,"ESTANTE C2","BOMBILLO","15W","UNIDAD",51,15],
[2,"ESTANTEC2","BOMBILLO","15W","UNIDAD",0,15],
[2,"ESTANTEC3","LED REFLECTOR","6W","UNIDAD",10,20],
[2,"ESTANTE C2","BONBILLO","5W","UNIDAD",27,15],
[2,"ESTANTE C2","BONBILLO","5W","UNIDAD",1,15],
[2,"ESTANTE C2","BONBILLO","5W","UNIDAD",54,15],
[2,"ESTANTE C2","BOMBILLO LED","4W","UNIDAD",1,4],
[2,"ESTANTE C2","BONBILLO LED","9W","UNIDAD",8,15],
[2,"ESTANTE C2","BONBILLO","12W","UNIDAD",0,15],
[2,"ESTANTEC2","BONBILLO","5W","UNIDAD",3,10],
[2,"ESTANTEC2","BONBILLO LED","20W","UNIDAD",8,5],
[2,"ESTANTE C3","LED","2W","UNIDAD",6,5],
[2,"ESTANTEC3","LED","12W","UNIDAD",10,10],
[2,"ESTANTE C3","CINTA LED","24W","UNIDAD",1,4],
[2,"ESTANTE C3","LED  * 4","6W","UNIDAD",10,20],
[2,"ESTANTE C4","BONBILLO","250W","UNIDAD",19,4],
[2,"ESTANTE C2","BONBILLO","5W","UNIDAD",11,7],
[2,"ESTANTE C3","LED","7W","UNIDAD",12,6],
[2,"ESTANTE C2","BOMBILLO","3W","UNIDAD",19,5],
[2,"ESTANTE C2","BOMBILLO","7W","UNIDAD",0,15],
[2,"ESTANTEC3","BOMBILLO","VOLTAJE 110-130V 4W","UNIDAD",14,2],
[2,"ESTANTEC3","LED","30W","UNIDAD",0,8],
[2,"ESTANTEC3","LED REFLECTOR","21W","UNIDAD",0,10],
[2,"ESTANTE D1","LED","18W","UNIDAD",0,5],
[2,"ESTANTED1","LED REFLECTOR","150W","UNIDAD",1,10],
[2,"ESTANTE D1","LED REFLECTOR","50W","UNIDAD",5,3],
[2,"ESTANTE D1","LED REFLECTOR","200W","UNIDAD",2,1],
[2,"ESTANTED1","LED REFLECTOR","100W","UNIDAD",0,10],
[2,"ESTANTE D1","LED PANEL","24W","UNIDAD",15,6],
[2,"ESTANTE D1","LED PANEL","18W","UNIDAD",20,6],
[2,"ESTANTE C4","BOMBILLO CAMPANA","100W","UNIDAD",0,10],
[2,"ESTANTE C4","LED","3W-120/227V","UNIDAD",40,10],
[2,"ESTANTEC4","LED","120V","UNIDAD",0,8],
[2,"ESTANTEC1","LED","4W","UNIDAD",42,40],
[2,"ESTANTE C1","LAMPARA","25W","UNIDAD",2,10],
[2,"ESTANTE D1","LED PANEL","24W","UNIDAD",0,50],
[2,"ESTANTE A1","TUBOS LED","21W","UNIDAD",10,1],
[2,"ESTANTEA1","TUBOS LED","18W","UNIDAD",98,40],
[2,"ESTANTE C3","BALA LED","3W","UNIDAD",15,25],
[2,"ESTANTE A1","LAMPARA","21W","UNIDAD",0,50],
[2,"ESTANTE C2","FOTOCELDA","110V","UNIDAD",3,10],
[2,"ESTANTEB1","LAMPARA","","UNIDAD",16,40],
[2,"ESTANTEC1","LED","10W - 120V, 50/60HZ","UNIDAD",1,3],
[2,"ESTANTEC4","LED EMERGENCIA","120V 50/60HZ <1.2W","UNIDAD",18,20],
[2,"ESTANTE C3","ESTACAS LED","5W 350 LUMENS","UNIDAD",10,2],
[2,"ESTANTEC1","LED","28W","UNIDAD",5,5],
[2,"ESTANTE C3","CINTA LED","5W","UNIDAD",1,2],
[2,"ESTANTE F4","RASPA JUNTA","","UNIDAD",5,3],
[2,"ESTANTE F2","RODILLO","3\"","UNIDAD",12,30],
[2,"ESTANTE F2","RODILLO","4\"","UNIDAD",28,30],
[2,"ESTANTE F2","RODILLO","5''","UNIDAD",6,10],
[2,"ESTANTE F2","RODILLO","9\"","UNIDAD",39,30],
[2,"ESTANTE F4","ESATULA METALICA","6\"","UNIDAD",3,1],
[2,"ESTANTE F2","ESPATULA METALICA","2\"","UNIDAD",1,3],
[2,"ESTANTE F2","ESPATULA  METALICA","4\"","UNIDAD",3,10],
[2,"ESTANTE F4","ESPATULA PLASTICA","4\"","UNIDAD",0,10],
[2,"ESTANTE F4","ESPATULA METALICA","8''","UNIDAD",2,2],
[2,"ESTANTE F4","ESPATULA METALICA","10''","UNIDAD",0,3],
[2,"ESTANTE F2","BROCHA","2\"","UNIDAD",27,10],
[2,"ESTANTE F2","BROCHA","3\"","UNIDAD",18,10],
[2,"ESTANTE F2","BROCHA","4\"","UNIDAD",11,10],
[2,"ESTANTE F2","SERRUCHO DRYWALL","6\"","UNIDAD",1,1],
[2,"ESTANTE F4","LIJA","240","UNIDAD",19,10],
[2,"ESTANTE f4","LIJA","80","UNIDAD",30,10],
[2,"ESTANTE f4","LIJA","60","UNIDAD",7,10],
[2,"ESTANTE f4","LIJA","320","UNIDAD",15,10],
[2,"ESTANTE f4","LIJA","180","UNIDAD",42,10],
[2,"ESTANTE f4","LIJA","220","UNIDAD",60,10],
[2,"ESTANTE f4","LIJA","120","UNIDAD",98,10],
[2,"ESTANTE f4","LIJA","150","UNIDAD",52,10],
[2,"ESTANTE f4","LIJA","360","UNIDAD",38,10],
[2,"ESTANTE f4","LIJA","600","UNIDAD",42,10],
[2,"ESTANTE f4","LIJA","1200","UNIDAD",15,10],
[2,"ESTANTE F1","CINTA INDUSTRIAL","GRIS","UNIDAD",5,1],
[2,"ESTANTE F1","CINTA ENMASCARAR","1\"","UNIDAD",15,10],
[2,"ESTANTE F2","CINTA ENMASCARAR","1 1/2\"","UNIDAD",0,5],
[2,"ESTANTE F1","CINTA ENMASCARAR","2\"","UNIDAD",16,5],
[2,"ESTANTE F1","CINTA DE MALLA","","UNIDAD",18,20],
[2,"ESTANTE F1","CINTA ANTIDESLIZANTE","AMARILLO Y NEGRO","UNIDAD",5,20],
[2,"ESTANTE F1","CINTA ANTIDESLIZANTE","NEGRO","UNIDAD",2,10],
[2,"ESTANTE F1","CINTA MULTIUSOS","NEGRO","UNIDAD",2,9],
[2,"ESTANTE F1","CINTA DE MARCASION DE VINILO","NEGRO Y AMARILLO","UNIDAD",3,8],
[2,"ESTANTE F1","CINTA RUBATEX FOAM","BLANCO","UNIDAD",1,20],
[2,"ESTANTE F2","ROLLO CINTA TEFLON INDUSTRIAL","","UNIDAD",13,5],
[2,"ESTANTE F1","CINTA FOIL DE ALUMINIO","GRIS","UNIDAD",11,4],
[2,"ESTANTE F1","CINTA DOBLE FAZ","AMARILLA","UNIDAD",0,5],
[2,"ESTANTE F1","CINTA METALICA PARA ESQUINAS","","UNIDAD",3,3],
[2,"General","PEGADIT 1/4","","UNIDAD",3,1],
[2,"ESTANTE G2","PEGADIT-SILICONA","TRANSPARENTE","UNIDAD",3,10],
[2,"ESTANTE G2","AFIX","BEIGE","UNIDAD",6,5],
[2,"ESTANTE G2","TEK-BOND ACRILICO","BLANCO","UNIDAD",6,5],
[2,"ESTANTE G2","SIKASIL-SILICONA","BLANCO","UNIDAD",5,5],
[2,"ESTANTE G2","SIKAFLEX -SELLADO PARAT JUNTAS","BEIGE","UNIDAD",17,10],
[2,"ESTANTE G2","SIKAFLEX -SELLADO PARAT JUNTAS","GRIS CLARO","UNIDAD",1,2],
[2,"ESTANTE G2","SIKAFLEX -SELLADO PARA JUNTAS CON MOVIMIENTO Y CONEXION","BLANCO","UNIDAD",2,4],
[2,"ESTANTE J2","THINNER CORRIENTE","","LITROS",5,1],
[2,"ESTANTE H3","WD 40","","UNIDAD",6,2],
[2,"ESTANTE F1","CINTA IMPERMEABLE","10CM X 10MTS","UNIDAD",3,1],
[2,"ESTANTE H3","FILTRO DE SOLIDO DE SISTEMA SUAVISADOR","","UNIDAD",0,1],
[2,"ESTANTE G2","AEROSOL","BLANCO MATTE 300ML","UNIDAD",3,4],
[2,"ESTANTE G2","AEROSOL","TRANSPARENTE BRILLANTE","UNIDAD",1,1],
[2,"ESTANTE G2","AEROSOL","TRANSPARENTE MATE","UNIDAD",7,4],
[2,"ESTANTE G2","AEROSOL","ALUMINIO BRILLANTE","UNIDAD",4,5],
[2,"ESTANTE G2","AEROSOL","BLANCO BRILLANTE 300ML","UNIDAD",13,10],
[2,"ESTANTE G2","AEROSOL","NEGRO MATE","UNIDAD",4,1],
[2,"ESTANTE G2","AEROSOL","NEGRO BRILLANTE 300ML","UNIDAD",4,10],
[2,"ESTANTE G2","AEROSOL","METAL PLATA BRILLANTE","UNIDAD",8,5],
[2,"ESTANTE G2","AEROSOL","METAL ORO-18KL BRILLANTE","UNIDAD",2,4],
[2,"ESTANTEG2","SPRAY ABRO DORADO 18K PREMIUN","DORADO 18K PREMIUN","UNIDAD",7,1],
[2,"BLOQUE AMARILLO","TINTE","WENGUE","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","TINTE","MIEL","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","TINTILLA","CARAMELO","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","TINTE","VERDE","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","TINTILLA","PARDO","UNIDAD",0,1],
[2,"ESTANTE G2","AEROSOL ANTICORROSIVO","GRIS MATE","UNIDAD",8,5],
[2,"ESTANTE G2","AEROSOL","SPRAY-GLU SPRUHK","UNIDAD",29,5],
[2,"ESTANTE G2","AEROSOL","SPRAY ADHESIVE","UNIDAD",10,5],
[2,"BLOQUE AMARILLO","EPOXI-POLIAMIDA PEQUENO","","UNIDAD",37,4],
[2,"BLOQUE AMARILLO","CATALIZADOR PINTURA","INCOLORO","UNIDAD",9,5],
[2,"BLOQUE AMARILLO","CATALIZADOR","","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","CATALIZADOR SUPER LACA","","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","EPOXI-POLIAMIDA GRANDE","","UNIDAD",31,2],
[2,"BLOQUE AMARILLO","ESMALTE","AMARILLO","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","ESMALTE POLIURETANO","BLANCO","UNIDAD",3,4],
[2,"BLOQUE AMARILLO","POLIURETANO","NEGRO","UNIDAD",2,0],
[2,"BLOQUE AMARILLO","PINTULACA","TRANSPARENTE MATE","UNIDAD",2,1],
[2,"BLOQUE AMARILLO","PINTULACA","TRANPARENTE BRILLANTE","UNIDAD",0,6],
[2,"BLOQUE AMARILLO","PINTULACA","BLANCO","UNIDAD",5,2],
[2,"BLOQUE AMARILLO","PINTULACA","NEGRO MEDIANOCHE","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","PINTULACA","NEGRO","UNIDAD",9,2],
[2,"BLOQUE AMARILLO","PINTURA","HIELO ARTICO","UNIDAD",1,4],
[2,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","GRIS","UNIDAD",5,3],
[2,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","AZUL","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","ESMALTE","086 AZUL TECNO","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","NEGRO","UNIDAD",3,3],
[2,"BLOQUE AMARILLO","CORROTEC","GRIS","UNIDAD",1,3],
[2,"BLOQUE AMARILLO","CATALIZADOR AL ACIDO","","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","ACROLATEX","TRANSPARENTE","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","CORROTEC DE ALTA TEMPERATURA","NEGRO","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","PINTUTRAFICO","BLANCO","UNIDAD",1,3],
[2,"BLOQUE AMARILLO","PINTULUX","BLANCO","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","PINTUTRAFICO","AMARILLO","UNIDAD",2,2],
[2,"BLOQUE AMARILLO","PINTUTRAFICO","MOD NEGRO","UNIDAD",4,2],
[2,"BLOQUE AMARILLO","PINTURA","BARNIZ CRYS CLEAR","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","LACAS AUTOMOTIVAS","BLANCO CONCENTRACION","UNIDAD",1,2],
[2,"BLOQUE AMARILLO","SUPERLACA","BASE BLANCA","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","OVERLAC SELLADOR","","UNIDAD",0,2],
[2,"BLOQUE AMARILLO","BASE TINT","LISTON DE ORO","UNIDAD",2,2],
[2,"BLOQUE AMARILLO","MONTONATURE","ORO METALIZADO","UNIDAD",4,6],
[2,"BLOQUE AMARILLO","ANTICORROSIVO VERDE","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","SOLDADURA EPOXICA","","UNIDAD",5,1],
[2,"BLOQUE AMARILLO","PETALO DE ALMENDRA","MUESTRA","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","ENCAJE DELICADO","MUESTRA","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","ESTRELLA FUGAZ","MUESTRA","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","PORCELANA CHINA","MUESTRA","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","POLYURETHANE ENAMEL","","UNIDAD",4,1],
[2,"BLOQUE AMARILLO","PINTURA MP CREMA","MUESTRA","UNIDAD",3,1],
[2,"BLOQUE AMARILLO","ESMALTE POLIURETANO","GRIS","UNIDAD",2,1],
[2,"BLOQUE AMARILLO","PINTUCOAT OCRE","","UNIDAD",2,1],
[2,"BLOQUE AMARILLO","PINTULUX MP BERMELLON","MUESTRA","UNIDAD",3,1],
[2,"BLOQUE AMARILLO","VINILTREX NEGRO","","UNIDAD",7,1],
[2,"BLOQUE AMARILLO","SELLADO INCLORO","","UNIDAD",3,1],
[2,"BLOQUE AMARILLO","PINTULUX NEGRO","MUESTRA","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","MASILLA AUTOMOTRIZ","","UNIDAD",3,1],
[2,"BLOQUE AMARILLO","PINTUCOAT GRIS","","UNIDAD",6,1],
[2,"BLOQUE AMARILLO","REMOVEDOR DE PINTURA","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","ESMALTE AZUL OSCURO","","UNIDAD",2,1],
[2,"BLOQUE AMARILLO","ESMALTE POLIURETANO","NEGRO","UNIDAD",3,1],
[2,"BLOQUE AMARILLO","MADETEC SELLADOR NITRO","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","MADETEC BARNIZ","","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","CENIZA VINILTEX","MUESTRA","UNIDAD",0,1],
[2,"BLOQUE AMARILLO","CAROTEC ALUMINIO ECP100","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","PINTURA EPOXICA NARANJA","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","CORROTECGRIS","","UNIDAD",1,1],
[2,"BLOQUE AMARILLO","PINTULUX AMARILLO","","UNIDAD",1,1],
[2,"BODEGA 2","PINTURA","CENIZA H NUEVAS","UNIDAD",3,1],
[2,"BODEGA 2","PINTURA","VALLE VIOLETA","UNIDAD",2,1],
[2,"BODEGA 2","PINTURA","LOCURA DE AMOR","UNIDAD",1,1],
[2,"BODEGA 2","PINTURA","HIERBAS VIVAS","UNIDAD",1,1],
[2,"BODEGA 2","PINTURA","B. DURAZNO","UNIDAD",1,2],
[2,"BODEGA 2","PINTURA","GREYSTORE","UNIDAD",2,1],
[2,"BODEGA 2","PINTURA","SEPIA","UNIDAD",1,1],
[2,"BODEGA 2","PINTURA","TAMARINDO","UNIDAD",1,1],
[2,"BODEGA 2","PINTURA","TERRACOTA","UNIDAD",2,1],
[2,"BODEGA 2","PINTURA","ESPONJADO TORONJA","UNIDAD",2,1],
[2,"BODEGA 2","PINTURA","GRIS BASALTO","UNIDAD",0,1],
[2,"BODEGA 2","PINTURA","PORCELANA ALMENDRA","UNIDAD",0,0],
[2,"BODEGA 2","PINTURA","ESTRELLA FUGAZ","UNIDAD",2,2],
[2,"BODEGA 2","PINTURA","ENCAJE DELICADO","UNIDAD",0,1],
[2,"BODEGA 2","PINTURA","MP BERMELLON","UNIDAD",0,1],
[2,"BODEGA 2","PINTURA","NEGRO","UNIDAD",0,5],
[2,"BODEGA 2","PINTURA","CHOCOLATE AZTECA","UNIDAD",1,3],
[2,"BODEGA 2","PINTURA","POSTRE NATA","UNIDAD",1,2],
[2,"BODEGA 2","PINTURA","CHAMPANA","UNIDAD",2,3],
[2,"BODEGA 2","PINTURA","BLANCO LUMINOSO","UNIDAD",4,5],
[2,"BODEGA 2","PINTURA","KORAZA-BLANCO","UNIDAD",1,4],
[2,"BODEGA 2","PEGACOR","25KG","UNIDAD",5,1],
[2,"BODEGA 2","CEMENTO GRIS","50KG","UNIDAD",2,1],
[2,"ESTANATE H3","FILTRO DE SOLIDO DE SISTEMA SUAVISADOR","","UNIDAD",0,1],
[2,"General","TORNILLO EN ACER INOX DE","1/4X2","UNIDAD",194,100],
[2,"General","TORNILLOS TIPO ALEN","10MMX1","UNIDAD",200,100],
[2,"General","TORNILLO DRIWALL","6X2","UNIDAD",425,100],
[2,"General","TORNILLO HEX UNC EN ACERO INOX","1/4X2","UNIDAD",92,100],
[2,"General","TORNILLO DE HEXAGONAL GALVANIZADO","1/4X1","UNIDAD",15,100],
[2,"General","TORNILLO DRIWALL","2 1/2''","UNIDAD",200,100],
[2,"General","CHAZOZ DE PARED","3/8X2''","UNIDAD",90,100],
[2,"General","CHAZOS METALICO MARIPOSA","3/8''","UNIDAD",79,100],
[2,"General","TORNILLO DE CHAZOS DE MARIPOSA","3/8''","UNIDAD",100,100],
[2,"General","CHAZOS METALICO","3/16''","UNIDAD",88,100],
[2,"General","TORNILLO PARA CHAZO","3/16''","UNIDAD",100,100],
[2,"General","PERNOS PARA VARILLA","1/2''","UNIDAD",20,100],
[2,"General","TUERCA","1/2''","UNIDAD",15,100],
[2,"General","CHAZOS PUNTILLA","1/4X1=5/8","UNIDAD",100,100],
[2,"General","TORNILLO HEXAGONAL","3/8X1''","UNIDAD",50,100],
[2,"General","TORNILLO HEXAGONAL","5/16X1''","UNIDAD",50,100],
[2,"General","TUERCA HEXAGONAL DE SEGURIDAD","3/8''","UNIDAD",50,100],
[2,"General","TUERCA HEXAGONAL DE SEGURIDAD","5/16''","UNIDAD",50,100],
[2,"General","ARANDELA INOX","7/16''","UNIDAD",100,100],
[2,"General","ARANDELAS INOX","5/16''","UNIDAD",100,100],
[2,"General","TORNILLO AUTO PERFORANTE","2''","UNIDAD",160,100],
[2,"General","TORNILLO EXTRAPLANO PUNTA BROCA","8X1\"","UNIDAD",500,100],
[2,"General","TORNILLO DRYWALL PASO FINO","6X1","UNIDAD",500,100],
[2,"General","TORNILLO DRYWALL","6X1 1/2","UNIDAD",430,100],
[2,"General","HOJA DE SEGUETA","","UNIDAD",11,5],
[2,"General","CHAZOS PLASTICOS","1/4 S.M","UNIDAD",129,100],
[2,"General","BROCA PARA VIDRIO/CERAMICA","1/4","UNIDAD",10,1],
[2,"General","BROCA PARA VIDRIO/CERAMICA","3/8","UNIDAD",10,1],
[2,"General","BROCA PARA VIDRIO/CERAMICA","1/2","UNIDAD",10,1],
[2,"General","BROCA PARA METAL","1/8","UNIDAD",10,1],
[2,"General","BROCA PARA METAL","5/16","UNIDAD",10,1],
[2,"General","BROCA PARA METAL","3/32","UNIDAD",7,1],
[2,"General","BROCA PARA METAL","1/2","UNIDAD",10,1],
[2,"General","MATILLO PIQUETA SOLDAR","PARA REMOCION DE ESCORIA SOLDADURA","UNIDAD",2,1],
[2,"General","JUEGO DE BROCAS ESCALONADAS","* 3 PIEZAS","UNIDAD",1,1],
[2,"General","SACOS PARA ESCOMBROS","","UNIDAD",70,1],
[2,"General","LLANA DENTADA","PARA PEGAR CERAMICA","UNIDAD",3,1],
[2,"ESTANF4","BISAGRA","DE PRSION","UNIDAD",25,15],
[2,"ESTANF4","BISAGRA NORMAL","DE PRSION 4''","UNIDAD",4,15],
[2,"ESTANF4","BISAGRA","DE PRESION 4''","UNIDAD",3,15],
[2,"ESTANF4","BISAGRA","OMEGA ZINCADA-3''","UNIDAD",5,15],
[2,"ESTANF4","BISAGRA DE PUERTA","TIPO OMEGA ZINCADA","UNIDAD",2,15],
[2,"ESTANF4","BISAGRA","MINI OMEGA2''","UNIDAD",6,15],
[2,"ESTANF4","BISAGRA DE BRAZO NEUMATICO","247MM","UNIDAD",2,10],
[2,"ESTANF4","BISAGRA","CIERRE LENTO","UNIDAD",20,15],
[2,"ESTANF3","BISAGRA DE CAZDETA","CIERRE SUAVE","UNIDAD",4,10],
[2,"ESTANF4","BISAGRA OMEGA EN ACERO INOX","QBAOMEG","UNIDAD",7,15],
[2,"ESTANF3","BISAGRA DOBLE ACCION","3''","UNIDAD",2,10],
[2,"ESTANTF4","BISAGRA","4X3","UNIDAD",14,5],
[2,"ESTANF4","TOPES DE RESORTE PARA PUERTA","","UNIDAD",0,10],
[2,"ESTANF4","TOPES DE ANTICHOQUES PRA PUERTAS X2","COLOR BLANCO","UNIDAD",3,10],
[2,"ESTANF4","KIT DE PIELTROS ADHESIVOS PARA SALA Y COMEDOR X34","FIXSER","UNIDAD",0,2],
[2,"ESTANF4","ADHESIVO ANTIDESLIZANTE","1.8CMX 20 UNIDADES","UNIDAD",4,6],
[2,"ESTANF4","ADHESIVO TOPE PROTECTOR TRANSPARENTE","9MM","UNIDAD",6,5],
[2,"ESTANF4","ADHESIVO TOPE PROTECTOR","12MM","UNIDAD",0,5],
[2,"ESTANF4","ADHESIVO TOPE PROTECTOR","1.6CM","UNIDAD",4,5],
[2,"ESTANF4","PASADOR UYUSTOOLS 2\"","DORADA 2\"","UNIDAD",15,5],
[2,"ESTANF4","CIERRE DE RRODILLOS CON TORNILLOS","MARRON","UNIDAD",7,5],
[2,"ESTANF4","RASPADOR DE JUNTA CON DOS CUCHILLA","","UNIDAD",5,5],
[2,"ESTANF4","LLAVES CILINDRICA","","UNIDAD",2,3],
[2,"ESTANF3","LLAVES CILINDRICA DE ALTA SEGURIDAD","EKL-C1100","UNIDAD",1,5],
[2,"ESTANF4","MINI MANIJA DE PUERTA EN ACERO INOX","","UNIDAD",6,5],
[2,"ESTANF4","MANIJA EN ACERO INOX","4\"","UNIDAD",20,50],
[2,"ESTANF4","MANIJA EN ACERO INOX","GRANDE","UNIDAD",9,5],
[2,"ESTANF4","MANIJAS PARA PUETTAS CORREDISA","","UNIDAD",18,10],
[2,"ESTANF3","MANIJA AUSTIN","","UNIDAD",2,5],
[2,"ESTANF3","MANIJA DE PUERTAS EXTERIOR","GRIS","UNIDAD",1,5],
[2,"ESTANF4","GANCHOS PARA CORTINAS","","UNIDAD",63,40],
[2,"ESTANF4","RODACHINAS","BLANCOS","UNIDAD",95,50],
[2,"ESTANF4","RIEL DE CORTINAS","","UNIDAD",85,50],
[2,"ESTANF4","GANCHOS PLASTICOS AJUSTABLE PARA CORTINA","","UNIDAD",29,15],
[2,"ESTANF4","SOPORTE DE MONTAJE PARA RIEL DE CORTINA","","UNIDAD",40,20],
[2,"ESTANF4","RUEDAS GARILES UNIFORME","","UNIDAD",9,5],
[2,"ESTANF4","CERRADURA DE RESIDENCIA","","UNIDAD",1,5],
[2,"ESTANF3","CIERRAPUERTAS AEREO","1002","UNIDAD",2,4],
[2,"ESTANF3","CIERRAPUERTA AREO","2234","UNIDAD",0,5],
[2,"ESTANF3","CERRADURA DE ALTA SEGURIDAD","","UNIDAD",1,5],
[2,"ESTANF3","CERRADURA UNIVERSAL","TK-901","UNIDAD",3,5],
[2,"ESTANF3","CERRADURA DE GAVETAS","","UNIDAD",2,5],
[2,"ESTANF3","CERRADURA DE EMBUTIR CILINDRICA","854","UNIDAD",1,5],
[2,"ESTANF3","CERRADURA  DE INCRUSTAR","TIPO PICO LORO","UNIDAD",1,5],
[2,"ESTANF3","CERRADURA DE INCRUSTAR CON CILINDRO DE ALTA SEGURIDAD","CO 4 BULONES Y LLAVE Y BOCA LLAVES","UNIDAD",2,5],
[2,"ESTANF3","CERRADURA","F60700LOCK","UNIDAD",3,5],
[2,"ESTANF3","LLAVE DE BAJO","","UNIDAD",6,6],
[2,"ESTANF3","OJO MAGICO PARA PUERTAS","","UNIDAD",2,5],
[2,"ESTANF3","PASADOR UYUSTOOLS 4\"","FR-PIP104-DORADO 4''","UNIDAD",15,5],
[2,"ESTANF3","PASADOR","2''","UNIDAD",1,5],
[2,"ESTANF3","MINI PESTILLO PARA ARMARIO O GABINETE","","UNIDAD",18,10],
[2,"ESTANF3","TOPE DE PURTAS MAGNETICO EN ACERO INOX","","UNIDAD",3,5],
[2,"ESTANF3","TAPA PARA BISAGRA","","UNIDAD",5,4],
[2,"ESTANTE F3","CANDADO EXTERIOR 50MM","50MM","UNIDAD",1,1],
[2,"ESTANF4","CANDADO","110-30 TIPO ITALIANO 1101","UNIDAD",5,1],
[2,"ESTANF3","TOPES MEDIA LUNA EN ACERO INOX","","UNIDAD",73,50],
[2,"ESTANF2","SUPER BONDER","5 GRAMOS","UNIDAD",5,1],
[2,"ESTANTE F3","CERRADURA BARI MANIJA DE BAÑO","","UNIDAD",2,1],
[2,"ESTANTE F3","PICAPORTE","","UNIDAD",16,1],
[2,"ESTANF3","PICA PUERTAS PARA PUERTAS","","UNIDAD",23,20],
[2,"ESTANTE P2","MONOMANDO DUCHA ALMURO","","UNIDAD",1,1],
[2,"ESTANTE P2","VALVULA PARA DUCHA SENSILLA","","UNIDAD",3,1],
[2,"ESTANTE P2","MANGUERA ROCEADORA DE GRIFO","ACERO INOX 44\" ROSCA INTERNA DE 7/8","UNIDAD",4,1],
[2,"ESTANTE P2","PORTARROLLO VERTICAL ADDSTORIS","","UNIDAD",1,2],
[2,"ESTANTE P2","PORTARROLLO CON TAPA ADDSTORIS","","UNIDAD",0,2],
[2,"ESTANTE P2","BRAZO REGADERA","","UNIDAD",1,2],
[2,"ESTANTE P2","LLAVE PUSH","","UNIDAD",4,2],
[2,"ESTANTE P2","GRIFERIA PLUMA(LAVAMANOS CONTROL)","","UNIDAD",1,2],
[2,"ESTANTE P2","TELEDUCHA AGATA-ACABADO CROMADO(TIPO CHORRO LUVIA)","8X4 CM","UNIDAD",1,2],
[2,"ESTANTE P3","CABEZAL DE HAVITACION NUEVA","","UNIDAD",0,3],
[2,"ESTANTE P3","DUCHA TEL CROMETTA ECOSMT","","UNIDAD",5,3],
[2,"ESTANTE P3","MEZCLADOR DE AGUA","","UNIDAD",4,3],
[2,"ESTANTE P3","REGADERA REDONDA","22CM","UNIDAD",0,3],
[2,"ESTANTE P3","DESAGUE PUSH METAL","","UNIDAD",9,4],
[2,"ESTANTE P4","VALVULA DE LLENADO UNIVERSAL PLUS","","UNIDAD",1,3],
[2,"ESTANTE P4","VALVULA DOBLE DE DESCARGA","","UNIDAD",6,4],
[2,"ESTANTE P4","GRIFERIA DE TANQUE ALTA PLUS","26CM","UNIDAD",2,3],
[2,"ESTANTE P4","REGULACION METALICA-MACHP-HEMBRA","","UNIDAD",1,3],
[2,"ESTANTE P4","SOPORTE(PORTARROLLO DE PAPEL)","","UNIDAD",0,10],
[2,"ESTANTE P4","DISPENSADOR DE JAVON","","UNIDAD",2,3],
[2,"ESTANTE P4","GANCHO DOBLE","","UNIDAD",80,30],
[2,"ESTANTE P5","ASIENTO SANITARIO (TAPA DE SANITARIO)","609461001","UNIDAD",14,8],
[2,"ESTANTE P5","ASIENTO SANITARIO","ACTIVE  ALONGADO BLANCO","UNIDAD",7,1],
[2,"ESTANTE Q3","REGILLA PARA LAVA PLATOS","ACERO INOX","UNIDAD",10,4],
[2,"ESTANTE P2","DESAGUE PARA TINA TAPOM DRENAJE","1-1/2\" ROSCA GRUESA","UNIDAD",8,4],
[2,"ESTANTE P2","CANASTILLA METALICA","4\"","UNIDAD",5,3],
[2,"ESTANTE Q3","REJILLA DE DESAGUE","","UNIDAD",0,15],
[2,"ESTANTEQ3","BRIDA ACOPLE SANITA","4\"","UNIDAD",0,4],
[2,"ESTANTE Q3","SIFON BOTELLA GRIS","","UNIDAD",10,4],
[2,"ESTANTE Q3","DESAGUE AUTON","","UNIDAD",0,5],
[2,"ESTANTE R4","LAVAMANOS/LAVAPLATOS INOX","60CM-ROSCA 1/2\"X1/2\"","UNIDAD",0,4],
[2,"ESTANTE Q4","BOTON DUAL REDONDO","","UNIDAD",36,10],
[2,"ESTANTE Q4","VALVULA DE CONTROL PARA DUCHA","","UNIDAD",0,5],
[2,"ESTANTE Q4","MANGUERA TELEDUCHA FLEXIBLE","LONG-1.6M","UNIDAD",10,10],
[2,"ESTANTE R4","MANGUERS DE SAGUE COLOR BLANCO","PLATICO","UNIDAD",13,5],
[2,"ESTANTE R4","MANGUERA UNIVERSAL PARA LAVADORA DIGITAL","MANGUERA-ENTRADA","UNIDAD",12,10],
[2,"ESTANTEH2","MANGUERA TIPO RESORTE PARA COMPRESOR","5MTS","UNIDAD",1,2],
[2,"ESTANTE T3","ACOPLE PLASTICO PARA MAGUERA","","UNIDAD",8,1],
[2,"General","MANIJA ALETA REDONDA","","UNIDAD",4,1],
[2,"General","DESINH + ENGINECRING","","UNIDAD",1,1],
[2,"General","TOMA DE AGUA MURAL","","UNIDAD",4,1],
[2,"General","GRIFERIA LAVAMANOS","","UNIDAD",3,1],
[2,"General","GRIFERIA LUM 8 \"","","UNIDAD",2,1],
[2,"General","PORTARROLLO","PURIST","UNIDAD",2,1],
[2,"General","BOCALLAVE REDONDO","","UNIDAD",600,1],
[2,"General","KIT DUCTO","080","UNIDAD",2,1],
[2,"General","PORTA ROLLO EN CROMO","","UNIDAD",19,1],
[2,"General","TOALLERO BARRA","50CM","UNIDAD",10,1],
[2,"General","LAMPARA PISCINAS","","UNIDAD",3,1],
[2,"ESTANTEV2","KDWY-6201-1/2-2RS","KDWY-6201-1/2-2RS","UNIDAD",0,15],
[2,"ESTANTEV2","6003.2RSR","6003.2RSR","UNIDAD",31,15],
[2,"ESTANTEV2","16005-A","16005-A","UNIDAD",3,10],
[2,"ESTANTEV2","6003.2ZR.C3","6003.2ZR.C4","UNIDAD",2,15],
[2,"ESTANTEV2","6201","6202","UNIDAD",1,15],
[2,"ESTANTEV2","6201-2RSC3","6201-2RSC4","UNIDAD",5,15],
[2,"ESTANTEV2","6202-2RS","6202-2RS","UNIDAD",12,10],
[2,"ESTANTEV2","6904-2RS","6904-2RS","UNIDAD",0,10],
[2,"ESTANTEV2","6203-2RC3-65R","6203-2RC3-65R","UNIDAD",0,20],
[2,"ESTANTEV2","620022C3/2AS","620022C3/2AS","UNIDAD",5,20],
[2,"ESTANTEV2","620022C3/L627","620022C3/L628","UNIDAD",2,15],
[2,"ESTANTEV2","6205-2RS1R","6205-2RS1R","UNIDAD",3,10],
[2,"ESTANTEV2","6202LLUC3/2AS","6202LLUC3/2AS","UNIDAD",0,20],
[2,"ESTANTEV2","BB1-4830A","BB1-4830A","UNIDAD",1,20],
[2,"ESTANTEV2","6204-2RSH","6204-2RSH","UNIDAD",0,20],
[2,"ESTANTEV2","6204-2RSH/C3GJN","6204-2RSH/C3GJN","UNIDAD",0,20],
[2,"ESTANTEV2","3204B-2RSRING","3204B-2RSRING","UNIDAD",5,20],
[2,"ESTANTEV2","203RR2","203RR3","UNIDAD",1,20],
[2,"ESTANTEV2","6000-2RHS","6000-2RHS","UNIDAD",10,20],
[2,"ESTANTEV2","6203-22/C3GJN","6203-22/C3GJN","UNIDAD",0,20],
[2,"ESTANTEV2","6904-2RSC3","6904-2RSC4","UNIDAD",5,20],
[2,"ESTANTEV2","60042RS/C3","60042RS/C4","UNIDAD",1,20],
[2,"ESTANTEV2","6206-22/C3GJN","6206-22/C3GJN","UNIDAD",2,20],
[2,"ESTANTEV2","6205-22/C3GJN","6205-22/C3GJN","UNIDAD",4,20],
[2,"ESTANTEV2","UK209.40","UK209.41","UNIDAD",0,20],
[2,"ESTANTEV2","22214E/C3","22214E/C4","UNIDAD",0,20],
[2,"ESTANTEV2","22211E/C3","22211E/C4","UNIDAD",1,20],
[2,"ESTANTEV2","7309BEP","7309BEP","UNIDAD",2,20],
[2,"ESTANTEV2","6309-22/C3GN","6309-22/C3GN","UNIDAD",1,20],
[2,"ESTANTEV2","6308-22/C3GJN","6308-22/C3GJN","UNIDAD",1,20],
[2,"ESTANTEV2","6208-22/C3","6208-22/C4","UNIDAD",2,20],
[2,"ESTANTEV2","6306-22/C3GJN","6306-22/C3GJN","UNIDAD",1,20],
[2,"ESTANTEV2","6307-2RS1/C3","6307-2RS1/C4","UNIDAD",2,20],
[2,"ESTANTEV2","6312-22/C3","6312-22/C4","UNIDAD",0,20],
[2,"ESTANTEV2","6212-22/C3","6212-22/C4","UNIDAD",0,20],
[2,"ESTANTEV2","BB1-4834A-6200.2RS/C3","BB1-4834A-6200.2RS/C4","UNIDAD",1,20],
[2,"ESTANTEV2","620722/L627","620722/L628","UNIDAD",1,20],
[2,"ESTANTEV2","UK211D1","UK211D2","UNIDAD",0,20],
[2,"ESTANTEV2","60802RS/C3","60802RS/C4","UNIDAD",0,3],
[2,"ESTANTEV2","6204-2Z/C3GJN","6204-2Z/C3GJN","UNIDAD",2,5],
[2,"ESTANTEV2","UC205-25MM","UC205-25MM","UNIDAD",4,1],
[2,"ESTANTEV2","UK211/D1","UK211/D2","UNIDAD",2,10],
[2,"ESTANTEV2","UCFI205-16","UCFI205-17","UNIDAD",10,1],
[2,"ESTANTEV2","UCP205-16","UCP205-17","UNIDAD",1,1],
[2,"ESTANTEV2","UCFI206","UCFI207","UNIDAD",7,1],
[2,"ESTANTEV2","UCFC-206-19","UCFC-206-19","UNIDAD",1,1],
[2,"ESTANTEV2","UCFC-206-","UCFC-206-","UNIDAD",4,1],
[2,"ESTANTEV2","UK208","UK209","UNIDAD",0,1],
[2,"ESTANTEV2","NU218-E-XL-TVP2","NU218-E-XL-TVP3","UNIDAD",1,1],
[2,"ESTANTEV2","UK210+","UK210+","UNIDAD",4,1],
[2,"ESTAN S1","TEE 4\"","","unidad",6,5],
[2,"ESTAN S4","CODO 1\"","","unidad",8,4],
[2,"ESTAN S4","CODO 3/4\"","","unidad",40,30],
[2,"ESTAN S4","CODO 45 GRADOS 1/2\"","","unidad",37,15],
[2,"ESTAN S4","CODO 45 GRADOS 3/4\"","","unidad",2,1],
[2,"ESTAN S2","CODO 2\"","","unidad",10,4],
[2,"ESTAN S2","CODO 1 1/2\"","","unidad",11,4],
[2,"ESTAN S2","CODO 45 GRADOS 2\"","","unidad",5,3],
[2,"ESTAN S2","CODO 45 GRADOS","","unidad",3,3],
[2,"ESTAN S1","CODO 4\"","","unidad",2,3],
[2,"ESTAN S1","CODO 2.1/2","","unidad",12,3],
[2,"ESTAN S1","CODO 45 GRADOS","","unidad",3,3],
[2,"ESTAN S4","REDUCCION 2 A 1 1/2\"","","unidad",15,3],
[2,"ESTAN S4","REDUCCION 2 A 1 1/4\"","","unidad",15,3],
[2,"ESTAN S4","REDUCCION 1X3/4\"","","unidad",9,3],
[2,"ESTAN S4","REDUCCION 1X1/2\"","","unidad",47,3],
[2,"ESTAN S1","REDUCCION 6X4\"","","unidad",3,3],
[2,"ESTAN S4","ADAPTADOR MACHO 1/2\"","","unidad",111,30],
[2,"ESTAN S4","ADAPTADOR MACHO 3/4\"","","unidad",42,20],
[2,"ESTAN S4","ADAPTADOR MACHO 1\"","","unidad",10,20],
[2,"ESTAN S1","ADAPTADOR MACHO 2./2\"","","unidad",27,15],
[2,"ESTAN S1","ADAPTADOR  MACHO 2\"","","unidad",19,15],
[2,"ESTAN S4","ADAPTADOR HEMBRA 1/2\"","","unidad",54,30],
[2,"ESTAN S4","ADAPTADOR HEMBRA 3/4\"","","unidad",20,30],
[2,"ESTAN S4","ADAPTADOR HEMBRA 1\"","","unidad",21,30],
[2,"ESTAN S4","UNION LISA 3/4\"","","unidad",27,10],
[2,"ESTAN S4","UNION LISA 1/2\"","","unidad",18,10],
[2,"ESTAN S4","UNION LISA 1\"","","unidad",11,10],
[2,"ESTAN S2","UNION LISA 2\"","","unidad",23,10],
[2,"ESTAN S1","UNION LISA 4\"","","unidad",34,10],
[2,"ESTAN S1","UNION  UNIVERSAL 2\"","","unidad",2,10],
[2,"ESTAN S4","UNION UNIVERSAL 1/2","","unidad",10,10],
[2,"ESTAN S4","TAPON 1\"","","unidad",34,10],
[2,"ESTAN S4","TAPON 3/4\"","","unidad",2,10],
[2,"ESTAN S4","TAPON 1/2\"","","unidad",21,10],
[2,"ESTAN S1","TAPON 2 1/2\"","","unidad",11,4],
[2,"ESTAN S4","NIPLE ROSCADO 3/4\"","","unidad",5,4],
[2,"ESTAN S4","TEE 1/2\"","","unidad",31,15],
[2,"ESTAN S4","TEE 3/4\"","","unidad",17,15],
[2,"ESTAN S4","TEE 1\"","","unidad",0,15],
[2,"ESTAN S3","TEE 1-1/2\"","","unidad",8,15],
[2,"ESTAN S3","TEE 1-1/4\"","","unidad",3,10],
[2,"ESTAN S3","TEE 2\"","","unidad",2,5],
[2,"ESTAN S4","CODO 45 GRADOS 1/2\"","","unidad",37,10],
[2,"ESTAN S4","CODO 45 GRADOS 1\"","","unidad",26,10],
[2,"ESTAN S4","CODO 45 GRADOS 3/4\"","","unidad",19,10],
[2,"ESTAN S4","CODO 1\"","","unidad",39,10],
[2,"ESTAN S4","CODO 3/4","","unidad",9,10],
[2,"ESTAN S4","CODO 1/2\"","","unidad",12,10],
[2,"ESTAN S3","CIDO 1-1/4\"","","unidad",2,4],
[2,"ESTAN S3","CODO 2\"","","unidad",2,3],
[2,"ESTAN S4","REDUCCION 1-1/2X3/4\"","","unidad",11,4],
[2,"ESTAN S4","REDUCCION 1 1/4X3/4\"","","unidad",21,8],
[2,"ESTAN S4","REDUCCION 1X1/2\"","","unidad",8,8],
[2,"ESTAN S4","REDUCCION 3/4X1/2\"","","unidad",5,8],
[2,"ESTAN S3","REDUCCION 2\"X3/4\"","","unidad",10,5],
[2,"ESTAN S3","REDUCCION 2\"X1-1/2\"","","unidad",1,5],
[2,"ESTAN S4","ADAPTADOR HEMBRA 1/2\"","","unidad",18,10],
[2,"ESTAN S4","ADATADOR MACHO 1-1/4\"","","unidad",15,10],
[2,"ESTAN S4","ADAPTADOR MACHO 1/2\"","","unidad",23,10],
[2,"ESTAN S4","ADAPTADOR MACHO 3/4\"","","unidad",26,10],
[2,"ESTAN S4","ADAPTADOR MACHO 1\"","","unidad",12,10],
[2,"ESTAN S4","ADAPTADOR HEMBRA 1\"","","unidad",19,10],
[2,"ESTAN S3","ADAPTADOR MACHO 2\"","","unidad",19,10],
[2,"ESTAN S3","ADAPTADOR MACHO 1 1/2\"","","unidad",14,10],
[2,"ESTAN S3","ADAPTADOR HENBRA 1 1/2\"","","unidad",2,10],
[2,"ESTAN S4","UNION LISA 1/2\"","","unidad",47,15],
[2,"ESTAN S4","UNION LISA 1\"","","unidad",37,15],
[2,"ESTAN S4","UNION LISA 2\"","","unidad",16,15],
[2,"ESTAN S4","UNION LISA 3/4\"","","unidad",54,20],
[2,"ESTAN S3","UNION LISA 2 1/2\"","","unidad",9,5],
[2,"ESTAN S3","UNION LISA 3\"","","unidad",4,5],
[2,"ESTAN S3","UNION LISA 4\"","","unidad",10,5],
[2,"ESTAN S3","UNION LISA 1 1/2\"","","unidad",1,5],
[2,"ESTAN S4","UNION UNIVERSAL 3/4\"","","unidad",10,5],
[2,"ESTAN S4","UNION UNIVERSAL 1/2\"","","unidad",7,10],
[2,"ESTAN S3","UNION UNIVERSAL 1\"","","unidad",3,4],
[2,"ESTAN S4","UNION HENBRA 1\"","","unidad",2,4],
[2,"ESTAN S4","UNION MACHO 2\"","","unidad",9,5],
[2,"ESTAN S3","UNION  MACHO 1 1/2\"","","unidad",7,5],
[2,"ESTAN S4","TAPON 3/4\"","","unidad",19,10],
[2,"ESTAN S4","TAPON 1/2\"","","unidad",20,10],
[2,"ESTAN S4","TAPON 1\"","","unidad",20,10],
[2,"ESTAN R3","CODO 90 GRADOS 1 1/2\"","","unidad",15,3],
[2,"ESTAN R3","CODO 45 GRADOS 1 1/2\"","","unidad",9,3],
[2,"ESTAN R3","CODO 90 GRADOS 2\"","","unidad",6,3],
[2,"ESTAN R3","CODO 45 GRADOS 2\"","","unidad",15,3],
[2,"ESTAN R3","CODO 45 GRADO 3\"","","unidad",3,3],
[2,"ESTAN R3","UNION LISA 1 1/2\"","","unidad",8,3],
[2,"ESTAN R3","UNION LISA 3\"","","unidad",7,3],
[2,"ESTAN R3","REDUCCION 3\"X2\"","","unidad",9,3],
[2,"ESTAN R3","REDUCCION 3X1 1/2\"","","unidad",5,3],
[2,"ESTAN R3","REDUCCION 4X3\"","","unidad",6,3],
[2,"ESTAN R3","REDUCCION 4X2\"","","unidad",10,3],
[2,"ESTAN R3","YEE 2\"","","unidad",11,3],
[2,"ESTAN R3","YEE 3\"","","unidad",17,3],
[2,"ESTAN R3","TAPA 1 1/2\"","","unidad",6,3],
[2,"ESTAN R3","TAPA 2\"","","unidad",3,3],
[2,"BODEGA 2","UNION EN HPVC","UNION EN HPVC 2,90MTS BLANCO","UNIDAD",20,5],
[2,"ESTANTE T5","VALVULA DE BOLA","1\"","unidad",6,3],
[2,"ESTANTE T5","VALVULA DE BOLA","1.25","unidad",5,3],
[2,"ESTANTE T5","VALVULA DE BOLA","0.5","unidad",3,3],
[2,"ESTANTE T5","VALVULA DE BOLA","0.75","unidad",1,3],
[2,"ESTANTE T5","VALVULA DE BOLA","0.375","unidad",1,3],
[2,"ESTANTE T5","VALVULA COMPUERTA","RED WHITE-3/4","unidad",4,3],
[2,"ESTANTE T5","VALVULA DE COMPUERTA","GRIVAL-3/4","unidad",6,3],
[2,"ESTANTE T5","VALVULA DE COMPUERTA","LATON-1/2","unidad",2,3],
[2,"ESTANTE T5","VALVULA DE","RED WHITE-TOYO-1/2","unidad",1,3],
[2,"ESTANTE T5","VALVULA DE","RED WHITE -1 1/2","unidad",2,3],
[2,"ESTANTE T5","VALVULA DE","RED WHITE -2\"","unidad",1,3],
[2,"ESTANTE T5","REDUCCION DE COBRE","1-1/8\" X 7/8\" OD (CXC)","unidad",4,5],
[2,"ESTANTE T5","UNION DE COBRE","1 1/8\"","unidad",2,5],
[2,"ESTANTE T5","UNION DE COBRE","7/8\"","unidad",1,5],
[2,"ESTANTE T5","CODO DE COBRE CUELLO CORTO","3/8 ODF 90o","unidad",10,5],
[2,"ESTANTE T5","CODOS DE COBRE CUELLO CORTO","5/8 ODF 90o","unidad",10,5],
[2,"ESTANTE T5","CODO DE COBRE (CUELLO CORTO)","1-1/8\" ODF 90o","unidad",3,6],
[2,"ESTANTE T5","CODO DE COBRE (CUEL)","7/8\" ODF 90o","unidad",3,6],
[2,"ESTANTE T5","TUBERIA COBRE - TIPO L RIG","7/8\"X0.045\" OD","unidad",1,2],
[2,"ESTANTE T5","ALICATE DIABLO GALIVAN","#10","unidad",1,1],
[2,"ESTANTE T5","TUBOS DE EMT","1/2\"","unidad",7,10],
[2,"ESTANTE T4","CURVAS","1/2\"","unidad",8,10],
[2,"ESTANTE T4","UNION","1/2\"","unidad",28,50],
[2,"ESTANTE A4","UNION EMT","3/4\"","unidad",17,10],
[2,"ESTANTE A4","CONECTOR EMT","3/4\"","unidad",20,10],
[2,"ESTANTE A4","ADAPTADOR MACHO NPT","1/2\" X 1/2\"","unidad",4,10],
[2,"ESTANTE A4","ADAPTADOR TEE H","1/2\" FP","unidad",5,10],
[2,"ESTANTE A4","ADAPTADOR BUSHING NPT","3/4\" X 1/2\"","unidad",3,10],
[2,"ESTANTE A4","ADAPTADOR MACHO NPT","3/4\" X 3/4\"","unidad",5,10],
[2,"ESTANTE A4","ADAPTADOR HEMBRA NPT","3/4\" X 3/4\" A 90","unidad",2,10],
[2,"ESTANTE T4","CURVAS EMT","1/2IN","unidad",10,20],
[2,"ESTANTE T4","GRAPAS AJUSTABLE","3/4´´","unidad",25,20],
[2,"ESTANTE T4","GRAPAS AJUSTABLE","1´´","unidad",25,20],
[2,"ESTANTE T4","GRAPAS AJUSTABLE","2026-01-02 00:00:00","unidad",25,20],
[2,"ESTANTE T4","UNION IMC","3/4IN","unidad",12,20],
[2,"ESTANTE T4","BALA DE PISO CON TORNILLOS DE ESTRIS INOXIDABLE","","unidad",12,20],
[2,"ESTANTE T4","BUSHING INOX 304","1/2\" X 3/8\" X 150L","unidad",10,10],
[2,"ESTANTE T4","BUSHING INOX 304","3/4 X 1/2 X150L","unidad",5,10],
[2,"ESTANTE T4","BUSHING INOX 304","1X3/4X150L","unidad",10,3],
[2,"ESTANTE T4","BUSHING INOX 304","3/8X1/4X150L","unidad",10,5],
[2,"ESTANTE T4","CODO INOX 304","3/8 NPT X 150L","unidad",4,10],
[2,"ESTANTE T4","COPA INOX 304","1 X 3/4\" X 150L","unidad",0,10],
[2,"ESTANTE T4","NIPLE INOX 304","S40 3/8 X 2","unidad",3,10],
[2,"ESTANTE T4","NIPLE 304 DE LARGO","1'' X 2''","unidad",9,5],
[2,"ESTANTE T4","REDUCCION INOX 304 COPA ROSCADA DIAM","1 X 1/2\" X 150","unidad",2,5],
[2,"General","TUBERIA","SCH40 ¾","unidad",20,2],
[2,"General","ANGULO DE ACERO NEGRO","1 ½ * 3/16 * 6 MTS","unidad",8,1],
[2,"General","TUBO CUADRADO ACERO NEGRO","1 ½ * 3/16 * 6 MTS","unidad",10,1],
[2,"ESTANTE T4","CONECTOR SCH 3/4 SCH40","","unidad",37,20],
[2,"ESTANTE T4","CONECTOR DE ACERO PARA TUBO EMT","1/2\"","unidad",5,5],
[2,"ESTANTE T4","CONECTOR RECTO PARA CORAZA","3/4\"","unidad",12,10],
[2,"ESTANTE A3","PEROS GALVANIZADOS","3/`16","unidad",100,20],
[2,"ESTANTE A3","PEROS GALVANIZADOS","1/8'","unidad",100,20],
[2,"ESTANTE A3","PERROS INOXIDABLES","1/4'","unidad",50,20],
[2,"ESTANTE A3","PRROS INOXIDABLE","3/16'","unidad",50,20],
[2,"ESTANTE A3","NIPLES ENRROSCADO","1 LONGITUD 8CM","unidad",3,20],
[2,"ESTANTE A3","NIPLES ENRROSCADO","1LONGITUD 17CM","unidad",3,5],
[2,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/2 GALVANIZADO","unidad",3,5],
[2,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/4 GALVANIZADO","unidad",8,5],
[2,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/2MMX1MTS","unidad",6,5],
[2,"ESTANTE A3","BARILLA LISA EN INOX","1/4M","unidad",11,5],
[2,"ESTANTE A3","DISCO DE PULIR DEWALT","7''X1/8X7/8","unidad",5,3],
[2,"ESTANTE A3","VALVULAS REDUCTORAS DE PRESION","","unidad",0,4],
[2,"ESTANTE V5","GANCHOS TENSORES INOX","20MM","unidad",6,5],
[2,"ESTANTE V5","GANCHOS TENSORES INOX","16MM","unidad",2,5],
[2,"ESTANTE V5","GANCHOS TENSORES INOX","12MM","unidad",3,5],
[2,"ESTANTE V5","GANCHOS TENSORES INOX","10MM","unidad",2,5],
[2,"ESTANTE V5","GANCHOS TENSORES INOX","8MM","unidad",1,5],
[2,"ESTANTE V5","TENSORES DE MORDAZA Y ORQUILLA INOX","10MM","unidad",5,5],
[2,"ESTANTE V5","GRILLETES EN INOX","","unidad",6,5],
[2,"ESTANTE V5","ABRAZADERAS(PERRO) EN INOX","","unidad",6,5],
[2,"ESTANTE V5","GRATAS EN ACERO CIRCULAR","3 \"","unidad",5,2],
[2,"ESTANTE V5","COLLARIN DE PVC","4X2","unidad",5,5],
[2,"General","DISCO METAL 4 ½","4 ½","unidad",10,1],
[2,"ESTANTE V5","DISCO DIAMANTADO","4=1/2","unidad",3,2],
[2,"ESTANTE V5","DISCOS PARA METAL DEWALT","4.5","unidad",7,5],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-001","SPZ-1024","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-002","SPA-1357","UNIDAD",14,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-101","SPZ-1727","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-003","SPZ-787","UNIDAD",15,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-201","SPZ-1337","UNIDAD",12,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-301","SPZ-1337","UNIDAD",12,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-301A","SPZ-1047","UNIDAD",7,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-801","SPZ-987","UNIDAD",6,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-401","SPA-2360","UNIDAD",4,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-901","SPZ-1140","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1001","SPA-1932","UNIDAD",4,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1002","SPA-1932","UNIDAD",3,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1003","SPA-1837","UNIDAD",3,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1004","SP-1932","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1005","SPZ-787","UNIDAD",14,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1006","SPA-1932","UNIDAD",2,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1101","SPA-1732","UNIDAD",8,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1102","SPZ-2332","UNIDAD",2,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1103","SPZ-2087","UNIDAD",3,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1201","SPZ-1957","UNIDAD",3,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1401","SPZ-1737","UNIDAD",5,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1402","SPZ-1080","UNIDAD",9,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","UMA/AC-1501","SPZ-1787","UNIDAD",2,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1502","SPZ-1140","UNIDAD",4,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1601","SPZ-1120","UNIDAD",7,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1602","SPZ-1732","UNIDAD",4,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-3301","SPZ-1140","UNIDAD",1,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-3302","SPZ-1137","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1601","SPZ-1737","UNIDAD",13,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1004","SPA-1932","UNIDAD",4,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1103","SPA-2087","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1201","SPA-1957","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-3302","SPZ-1737","UNIDAD",0,5],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-004","SPZ-1787","UNIDAD",0,5],
[2,"PARTE SUPERIOR DE ESTANTERIAS","AC-1001,1004","SPA-1932","UNIDAD",0,6],
[2,"PARTE SUPERIOR DE ESTANTERIAS","A55","A55","UNIDAD",9,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-56","B-56","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-66","B-66","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-96","B-96","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-98","B-98","UNIDAD",9,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-100","B-100","UNIDAD",27,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-105","B-105","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-115","B-115","UNIDAD",10,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-135","B-135","UNIDAD",18,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","BX-59","BX-59","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","BX-85","BX-85","UNIDAD",13,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","BX-77","BX-77","UNIDAD",2,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ1080","SPZ1080","UNIDAD",3,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ1047","SPZ1047","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ787-BC","SPZ787-BC","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1787","SPZ-1787","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPA-2360","SPA-2360","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-2087","SPZ-2087","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPB2990","SPB2990","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","XPA1932","XPA1932","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","XPA1030","XPA1030","UNIDAD",1,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","XPZ1340","XPZ1340","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","PJ1663","PJ1663","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","PJ2489","PJ2489","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","3VX-750","3VX-750","UNIDAD",6,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","3V-530","3V-530","UNIDAD",3,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","3V-560","3V-560","UNIDAD",3,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","M-41","M-41","UNIDAD",3,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","655-J","655-J","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","980J","980J","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","1915","1915","UNIDAD",1,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","908J","908J","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","A31","A31","UNIDAD",11,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPB-2840","SPB-2840","UNIDAD",1,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-812","SPZ-812","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","B-116","B-116","UNIDAD",9,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","BX-66","BX-66","UNIDAD",4,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1837","SPZ-1837","UNIDAD",0,4],
[2,"PARTE SUPERIOR DE ESTANTERIAS","BX-70","BX-70","UNIDAD",2,4],
[2,"General","SIKA UNIVERSAL","1*4KG","KG",20,10],
[2,"General","MASTIQUE PANEL TEC X CUÑETE","MASILLA","UNIDAD",4,1],
[2,"General","EMPAQUE PARA MAGUERA","","UNIDAD",25,5],
[2,"General","GRATA","3\" 5/8-11","UNIDAD",7,5],
[2,"General","AMARRES PLASTICOS (SUNCHOS)","T8 DNX3008NSCHNEIDER","UNIDAD",100,1],
[2,"General","AMARRES PLASTICOS (SUNCHOS)","T12 DXN3012NSCHNEIDER","UNIDAD",100,1],
[2,"General","AMARRES PLASTICOS (SUNCHOS)","T14 DXN3014NSCHNEIDER","UNIDAD",100,1],
[2,"General","AMARRES PLASTICOS (SUNCHOS)","4.6*350MM","UNIDAD",200,10],
[2,"General","AMARRES PLASTICOS (SUNCHOS)","7*400MM","UNIDAD",200,10],
[2,"General","ALCOHOL ETILICO ETANOL","96% GALON","UNIDAD",3,1],
[2,"General","BOLSAS DE BASURA","GRANDES * 10 UND","UNIDAD",5,1],
[2,"General","PUNTA ESTRIA","50MM/2\"","UNIDAD",1,2],
[2,"RETIRADO","BANDA PLANCHADO","T/1500/NX 194MM","UNIDAD",0,1],
[2,"RETIRADO","PASTA LIMPIADORA","CLEAN PASTE X 8KG","UNIDAD",2,1],
[2,"RETIRADO","MULETON T/950/NX POLIMIX","AHCHO-3.60-LARGO-2.27","UNIDAD",0,1],
[2,"RETIRADO","BANDA PLEGADOR ALGODÓN CON DOS RAYAS","50MM - ANCHO 5CM - LARGO 1.43M","UNIDAD",0,1],
[2,"RETIRADO","BANDA PLEGADOR ALGODÓN CON DOS RAYAS","50MM - ANCHO 5CM - LARGO 0.96cm","UNIDAD",0,1],
[2,"RETIRADO","BANDA PLEGADOR ALGODÓN CON DOS RAYAS","50MM - ANCHO 5CM - LARGO 2.13m","UNIDAD",0,1],
[2,"ESTANTE H2","AHORRADORES EN BRONCE","","UNIDAD",10,1],
[2,"ESTANTE I1","AMORTIGUADOR 250 N","SUSPA","UNIDAD",4,1],
[2,"ESTANTE I3","AMORTIGUADOR HIDRAULICO","","UNIDAD",36,1],
[2,"VERIFICAR","TORNILLO HEXAGONAL","M10X110","UNIDAD",18,1],
[2,"VERIFICAR","CASQUILLO AMORTIGUADORES","","UNIDAD",36,1],
[2,"ESTANTE I1","ELECTROIMAN PUERTA","","UNIDAD",3,1],
[2,"ESTANTE I1","CONDUCTO SALIDA VAHOS","","UNIDAD",3,1],
[2,"ESTANTE I1","FINAL DE CARRERA VARILLA","","UNIDAD",2,1],
[2,"ESTANTE I1","TARJETA PRINCIPAL","","UNIDAD",1,1],
[2,"ESTANTE I1","SONDA DE TEMPERATURA MICROPORCESADOR","","UNIDAD",0,1],
[2,"ESTANTE I1","SUICHE DIFERENCIAL DE PRESION","","UNIDAD",2,1],
[2,"ESTANTE I1","ELECTRODO DE DETECCION","","UNIDAD",2,1],
[2,"VERIFICAR","VENTILADOR CENTRIFUGO","","UNIDAD",1,1],
[2,"ESTANTE I2","PEDAL PARA BAJAR CABEZOTE","","UNIDAD",2,1],
[2,"ESTANTE I1","PLANCHA DE MANO A VAPOR","","UNIDAD",2,1],
[2,"ESTANTE I2","TRAMPA DE VAPOR","VALVULA DE VAPOR AVERIADA","UNIDAD",2,1],
[2,"General","UPS GALLEON ONE TIPO TORRE","3000 VA/3000W TRUE ONE LINE ENTRADA 120V - SALIDA 120V","UNIDAD",0,1],
[2,"General","INTERRUPTOR DE TARJETA","","UNIDAD",1,1],
[2,"ESTANTE E1","LUCES EXTERIOES","","UNIDAD",3,2],
[2,"ESTANTE H2","VALVULA DE PEDAL","","UNIDAD",2,3],
[2,"General","COMPRENSOR ZP31K5E-TF5-522 3/220","","UNIDAD",1,4],
[2,"General","CUCHILLA PARA LUCIADORA INDUSTRIAL","TIPO AVAMIX","UNIDAD",0,1],
[2,"General","BOBINA 220V","","UNIDAD",1,1],
[2,"General","CAJA REDUCTORA DE VALVULA DESAGUE","","UNIDAD",1,1],
[2,"General","POSA PIE","","UNIDAD",11,1],
[2,"General","QUIMICO NAGCIDE-381","GALON * 20 KG","UNIDAD",1,1],
[2,"General","QUIMICO NAGCLEAN - 220","GALON * 20 KG","UNIDAD",1,1],
[2,"PISO 16","CANECA * 63 KG","3DT465","KG",0,1],
[2,"General","INTERCAMBIADOR DE CALOR","TUBO * 3 MTS","UNIDAD",1,1],
[3,"General","GUANTE NITRILO (AZUL OSCURO)","","unidad",3,6],
[3,"General","GUANTES CARNASA (AZUL)","","unidad",2,6],
[3,"General","GAFA LENTE  TRANSPARENTE","","unidad",13,10],
[3,"General","GAFA LENTE NEGRAS","","unidad",14,0],
[3,"General","GUANTES CARNASA (AMARILLO) TIPO INGENIERO","","unidad",11,6],
[3,"General","GUANTES DE SEGURIDAD","","unidad",0,15],
[3,"General","TAPABOCAS N.95","","unidad",68,10],
[3,"General","SIPRA BRAZO","","unidad",1,1],
[3,"General","SIPRA PIERNA","","unidad",1,1],
[3,"General","CAPELLADA EVA","","unidad",1,1],
[3,"General","GUANTEX LATEX (AZUL)","","unidad",0,20],
[3,"General","FILTROS (REPUESTO)","","unidad",3,2],
[3,"General","CINTA PELIGRO NO PASE","","unidad",3,1],
[3,"General","FILTRO","","unidad",8,2],
[3,"General","CARETAS PARA ESMERILAR","","unidad",1,1],
[3,"General","PROTECTOR AUDITIVO CON CORDON TEKK","","unidad",137,10],
[3,"General","PROTECTOR AUDITIVO TIPO TORNILLO","","unidad",50,15],
[3,"General","GUANTES DE SEGURIDAD NEGRO","","unidad",20,20],
[4,"ESTANZ1","MODULE, POWER SUPPLY","BRD02102","UNIDAD",1,0],
[4,"ESTANZ1","MODULE HIPWR RELAY","MODO1401","UNIDAD",1,0],
[4,"ESTANZ1","MODULE,QUAD RELAY OUTPUT","BRD04879","UNIDAD",1,0],
[4,"ESTANZ1","MODULE,608AMP INVERTE POWER","MODO1687","UNIDAD",1,0],
[4,"ESTANZ2","MODULO DE EXPANSION","","UNIDAD",1,0],
[4,"ESTANZ2","MODULO","UC 400","UNIDAD",1,0],
[4,"ESTANZ2","MODULO EMISOR","21T-RES-47","UNIDAD",1,0],
[4,"ESTANZ1","DUAL BINARY INPUT W PLUG","BRD04873","UNIDAD",1,0],
[4,"ESTANZ1","DUAL TRIAC OUTPUT WPLUG","BRD04876","UNIDAD",1,0],
[4,"ESTANZ1","DUAL HIGH VOLTAGE W PLUG","BRD04874","UNIDAD",1,0],
[4,"ESTANZ1","DUAL ANALOG I/O W PLUG","BRD04875","UNIDAD",1,0],
[4,"ESTANZ1","SENSOR DE CAUDAL","SF6200","UNIDAD",1,0],
[4,"ESTANZ2","SENSOR DE TEMPERATURA","SEN02133","UNIDAD",15,0],
[4,"ESTANZ2","SENSOR","PARA.MANEJADORA","UNIDAD",2,0],
[4,"ESTANZ2","SENSOR","SEN1960","UNIDAD",1,0],
[4,"ESTANZ2","SENSORES DE TEMPERATURA","","UNIDAD",4,0],
[4,"ESTANZ2","SENSORES DE FLUJO DE AGUA","KIT.18043","UNIDAD",1,0],
[4,"ESTANZ2","SENSOR DE TEMPERATURA","100791-87","UNIDAD",4,0],
[4,"ESTANZ1","LUBE OIL FITER DE ACEITE","FLR01592","UNIDAD",8,0],
[4,"ESTANZ1","FILTRO DRIER DE ACEITE 3/8","032Z4864","UNIDAD",5,0],
[4,"ESTANZ1","VENTILADOR AXIAL-SP100A","1123XBR-GN115VCA","UNIDAD",2,0],
[4,"ESTANZ1","MOTOR STANTING RELAY","4CR-2-769","UNIDAD",1,0],
[4,"ESTANZ1","CABLE DE CONEXION INDUTRIAL DE 10M","EVC075","UNIDAD",2,0],
[4,"ESTANZ1","TRANSMISOR DE PRESION","24V-AKS1008","UNIDAD",2,0],
[4,"ESTANZ2","KIT DE MODULO DE CONTROL","KIT18458","UNIDAD",1,0],
[4,"ESTANZ2","REFRIGERACION DE VARIADOR DEL CHILLER","","UNIDAD",1,0],
[4,"ESTANZ2","SUCHE DE FLUJO DUCTOS-MANEJADORA","ADPS-04-2-N-C","UNIDAD",5,0],
[4,"ESTANZ2","REFRIGERACION DE VARIADOR DEL CHILLER","22230029","UNIDAD",1,0],
[4,"ESTANZ2","VARIADOR DE VELOCIDAD","","UNIDAD",1,0],
[4,"ESTANZ2","VARIADOR DE FRECUENCIA","","UNIDAD",1,0],
[4,"ESTANZ2","FILTRO SECADOR DE PURGA","BC1921E","UNIDAD",1,0],
[4,"ESTANZ2","CONTROLADOR","KIT18461","UNIDAD",1,0],
[4,"ESTANZ2","CONTROLADOR PROGRAMABLE","UC600","UNIDAD",1,0],
[4,"ESTANZ2","SOPORTE DE FILTRO","","UNIDAD",1,0],
[4,"ESTAN Z3","TARJETA  VARIADOR DEL CHILER","","UNIDAD",2,0],
[4,"ESTANZ2","FAN 03322","","UNIDAD",1,0],
[4,"ESTANZ2","FAN 03323","","UNIDAD",1,0],
[4,"ESTANZ2","FAN 03322","","UNIDAD",1,0],
[5,"ESTANTE Z1","MONITOR DE CONTROL IFM","SN0150","unidad",1,0],
[5,"ESTANTE Z2","TARJETA DE ACENSORES","SEGUNDA MANO#19","unidad",0,0],
[5,"ESTANTE Z2","VARIADOR DE PUERTA","ACENSOR#26","unidad",0,0],
[5,"ESTANTE Z2","TARJETA PARA TECHO DE CABINA","ACENSOR#26","unidad",1,0],
[5,"ESTANTE i3","TERMINAL POR 1.1 COLOR NEGRO","D38B01-ASCENSOR#18","unidad",2,0],
[5,"ESTANTE i3","RUEDAS SUSPENCION VAR 30","D12A-ASCENSOR#29","unidad",8,0],
[5,"ESTANTE i3","PCBA BPCDG 1.Q","B01F-ASCENSOR#26","unidad",2,0],
[5,"ESTANTE i3","CIRCUITO IMPRESO ASIXIA 34.Q","B06D-ASCENSOR#17","unidad",0,0],
[5,"ESTANTE i3","BANDA MAGNETICA DE GUIA","D04H03-ASCENSOR#17","unidad",2,0],
[5,"ESTANTE i3","KIT CUERDA CONTRAPESO BT700-1400 L=800","D09E02-ASCENSOR#26","unidad",5,0],
[5,"ESTANTE i3","CABLE SICRONIZACION C2 BT800 L=2680","D45D-ASCENSOR#26","unidad",1,0],
[5,"ESTANTE i3","ROZADERA DE PUERTA ( FOR SHEET 1.5MM)","D04H12-ASCENSOR#33","unidad",8,0],
[5,"ESTANTE i3","ENGRASADOR AUTOMATICO ART 535610 01.00","D25C-ASCENSOR#33","unidad",1,0],
[5,"ESTANTE i3","BATERIA 12V 7A CB1270 RECARGABLE","D12A-ASCENSOR#33","unidad",1,0],
[5,"ESTANTE i3","RESORTE TENSION 10.5X70X1.219(GALV)","D08L02-ASCENSOR#33","unidad",2,0],
[5,"ESTANTE i3","CIRCUITO IMPRESO","B06AC-ASCENSOR#26","unidad",1,0],
[5,"ESTANTE i3","ROZADOR DE PUERTA(FOR SHEET 1.5MM)","D04H12-ASCENSOR#24","unidad",4,0],
[5,"ESTANTE i3","ADJUSTABLE CARRIAGE RUBBER BUFFER","D05P01-ASCENSOR#24","unidad",11,0],
[5,"ESTANTE i3","PCBA BCMM 1.Q","B09B-ASCENSOR#18","unidad",0,0],
[5,"ESTANTE i3","UNIFIED LD LOCK ROLLER D44 MM SEMATIC","D48B-ASCENSOR#17","unidad",14,0],
[5,"ESTANTE i3","RELE CONTROL FASES 3PH 400VAC 2 CTO","D04A09-ASCENSOR#19","unidad",1,0],
[5,"ESTANTE i3","CIRCUITO SPDE 88.Q","B07D-ASCENSOR#19","unidad",1,0],
[5,"ESTANTE i3","VENTI TANG FB-9B FAN D0200024 220V MIF-2","D28B-ASCENSOR#19","unidad",0,0],
[5,"STANTE I3","KIT DE CITOFONIA","ASCENSOR#20","unidad",1,0],
[5,"General","ROLLER DE CONTRAPESO","","unidad",4,0],
[5,"General","ROLLER DE CABINA","","unidad",4,0],
[6,"ESTANTE C2","1","GU10 LED","unidad",84,15],
[6,"ESTANTE C2","2","OSRAM","unidad",44,15],
[6,"ESTANTE C2","3","SILVANIA","unidad",44,15],
[6,"ESTANTE C2","4","PHILIPS","unidad",2,15],
[6,"ESTANTE C2","5","WELLMAX","unidad",2,15],
[6,"ESTANTE C2","6","ECO LITE","unidad",65,15],
[6,"ESTANTE C2","7","DAIRU","unidad",15,4],
[6,"ESTANTE C3","8","SILVANIA","unidad",41,15],
[6,"ESTANTE C2","9","TECNOLITE","unidad",9,5],
[6,"ESTANTE C2","10","DAIRU","unidad",2,4],
[6,"ESTANTE C4","11","LUMEK","unidad",0,4],
[6,"ESTANTE C2","12","NIPPON INFRAROJO 110V","unidad",7,4],
[6,"ESTANTE C2","13","ENERLUX","unidad",14,7],
[6,"ESTANTE C2","14","ROBLAN","unidad",12,6],
[6,"ESTANTE C2","15","DAIRU PACK*3","unidad",5,4],
[6,"ESTANTE C2","16","VELITAS","unidad",9,5],
[6,"ESTANTE C2","17","PANEL LED","unidad",10,5],
[6,"ESTANTE C2","18","OSRAM","unidad",56,15],
[6,"ESTANTE C2","19","CINTA LED","unidad",50,15],
[6,"ESTANTE C3","20","LED ECO SPOT","unidad",8,5],
[6,"ESTANTE C3","21","ROBLAN LED ECO SKY","unidad",7,6],
[6,"General","22","LUMUK","unidad",4,3],
[6,"ESTANTE C3","23","LUZ LED T8","unidad",28,15],
[6,"ESTANTE C3","24","PANEL LED","unidad",24,6],
[6,"ESTANTE C3","25","PANEL LED","unidad",20,6],
[6,"ESTANTE C3","26","LUCES DE EMERGENCIA","unidad",5,10],
[6,"ESTANTE C3","27","LUMINARIA DE EMERGENCIA HABI","unidad",16,10],
[6,"ESTANTE C3","28","LAMPARA HERMETICA LED","unidad",4,10],
[6,"ESTANTE C3","29","LAMPARA INCRUSTAR SILVANIA","unidad",8,10],
[6,"ESTANTE C3","30","LAMPARA INCRUSTAR SILVANIA","unidad",7,20],
[6,"ESTANTE C3","31","LAMPARA LED REDONDA DE INCRUSTAR (MERCURY)","unidad",33,50],
[6,"General","32","TUBOS LED T8 LUZ DIA","unidad",34,0],
[6,"ESTANTE C3","33","LAMPARA LED REDONDA INCRUSTAR","unidad",0,50],
[6,"ESTANTE C2","34","PANEL LED REDONDA INCRUSTAR","unidad",33,50],
[6,"ESTANTE C2","35","ROBLAN LED DOWNLIGHT","unidad",12,20],
[6,"ESTANTE C3","36","LAMPARAS","unidad",4,40],
[6,"ESTANTE C3","37","MODULOS LED","unidad",100,100],
[6,"General","38","SOCKET T8","unidad",100,100],
[6,"ESTANTE C3","39","PANEL LED RD INC 1260LM 65K","unidad",10,20],
[6,"ESTANTE C3","40","TUBO LED T8 VID","unidad",13,70],
[6,"ESTANTE C2","41","BALA DE PISO LED","unidad",18,25],
[6,"General","42","LAMPARAS LED EMPOTRAR","unidad",5,0],
[6,"ESTANTE C3","43","LAMPARAS T5","unidad",7,50],
[6,"ESTANTE C3","44","TUBO LAMPARA FT50 ATRAPA INSECTOS","unidad",8,0],
[6,"General","45","PAQUETE DE LAMINAS","unidad",24,0],
[6,"General","INVENTARIO  ELECTRICO","","unidad",0,0],
[6,"100A","1","FUSIBLE ALTA TENCION","unidad",2,1],
[6,"63A","2","FUSIBLE ALTA TENCION","unidad",7,1],
[6,"40A","3","FUSIBLE ALTA TENCION","unidad",1,1],
[6,"25A","4","FUSIBLE ALTA TENCION","unidad",2,1],
[6,"630A","5","TOTATLIZADOR","unidad",1,1],
[6,"320A","6","TOTATLIZADOR","unidad",1,1],
[6,"300A","7","TOTATLIZADOR","unidad",1,1],
[6,"50A","8","TOTATLIZADOR","unidad",1,1],
[6,"40A","9","TOTATLIZADOR","unidad",5,1],
[6,"4X4","10","CAJA  ALUMINIO TRAWELT","unidad",10,3],
[6,"5 SAL 1/2","11","CAJA RAWEL OCTAG","unidad",5,0],
[6,"4X4","12","CAJA PLASTICA","unidad",14,5],
[6,"2X4","13","CAJA PLASTICA","unidad",28,5],
[6,"10X10X6.8CM","14","CAJA PLATICA","unidad",2,2],
[6,"4X4","15","CAJA METALICA","unidad",5,3],
[6,"4X4X6.8CM","16","CAJA METALICA","unidad",6,3],
[6,"C-015","17","CONECTOR","unidad",8,3],
[6,"C-014","18","CONECTOR","unidad",8,3],
[6,"L5-30","19","CONECTOR","unidad",10,2],
[6,"C-007","20","CONECTOR","unidad",2,2],
[6,"L-15 30AMP","21","CONECTOR","unidad",11,2],
[6,"L-6 20P","22","CONECTOR","unidad",8,2],
[6,"L-5 20P","23","CONECTOR","unidad",1,1],
[6,"L6-20","24","CONECTOR","unidad",8,1],
[6,"L5 30R","25","CONECTOR","unidad",1,1],
[6,"L5 30P","26","CONECTOR","unidad",1,1],
[6,"L1 20AMP","27","CONECTOR","unidad",1,1],
[6,"L5 30P","28","CONECTOR","unidad",3,1],
[6,"L15 20P","29","CONECTOR","unidad",4,1],
[6,"L14 20AMP","30","CONECTOR","unidad",5,1],
[6,"L6 20P","31","CONECTOR","unidad",1,1],
[6,"L21 30","32","CONECTOR","unidad",1,1],
[6,"General","33","CLAVIJA INDUSTRIAL","unidad",5,2],
[6,"General","34","CLAVIJA","unidad",10,2],
[6,"C20 1POLO","35","BREIKER","unidad",11,2],
[6,"C20 2POLO","36","BREIKER","unidad",20,2],
[6,"C50 2POLO","37","BREIKER","unidad",6,2],
[6,"C40 2POLO","38","BREIKER","unidad",4,2],
[6,"C30 1 POLO","39","BREIKER","unidad",4,0],
[6,"C40 3POLO","40","BREIKER","unidad",5,2],
[6,"C20 3POLO","41","BREIKER","unidad",18,2],
[6,"General","42","TRANSFORMADOR 220V/110V  50/60HZ  500W MAX","unidad",1,1],
[6,"General","43","FUSIBLE DE EXPULSION","unidad",1,1],
[6,"General","44","TOMAS GFCI","unidad",12,2],
[6,"2X4 Y 4X4","45","TAPAS COEGAS","unidad",20,0],
[6,"3 POLOS","46","CONECTORES WAUGO TRIPLE","unidad",39,0],
[6,"CABLE 20A 2P PQ DE CABLES 4MM","47","CONECTORES WAUGO DOBLE","unidad",36,0],
[6,"32 AMP 3POLS - BOBINA 220 VOL MARCA SCHINEIDER","48","CONTACTOR (TIPO RIEL)","unidad",1,0],
[6,"24V","49","CHINT ELECTRIC","unidad",2,0],
[6,"25A AC-3, BOBINA 24VAC","50","CONTACTOR CHINT","unidad",2,0],
[6,"32 AMP 3POLS - BOBINA 110 VOL MARCA SCHINEIDER","51","CONTACTOR (TIPO RIEL)","unidad",1,0],
[6,"220 VOLT A 24 VOLT","52","TRANSFORMADORES","unidad",2,0],
[6,"General","53","BOBINA DE 220V - VALVULA DE DESAGUE LAVADORA","unidad",1,0],
[6,"3 X 70","54","CUñA ENCHUFABLE LUMINEX","unidad",2,0],
[6,"General","55","BATERIAS 9V","unidad",5,0],
[6,"General","56","BATERIAS AA","unidad",13,0],
[6,"General","57","BATERIAS AAA","unidad",23,0],
[6,"General","58","FUENTE DE PODER 12V PARA CINTA LED 10 AMP Y 15 AMP","unidad",3,0],
[6,"General","59","FUENTE DE PODER 12V Y 15AMP METALICA PARA CINTA LED","unidad",5,0],
[6,"120V","60","INTERUPTOR SWITCH LEVINTON 15A","unidad",26,0],
[6,"General","61","BREKER BIFASICO ENCHUFABLE 2X30 AMP","unidad",10,0],
[6,"General","62","BOTONERA AWG N06 CAPACIDAD 150 AMP -600 VOL CON CUADRANTE (L","unidad",5,0],
[6,"220V 10A/250","63","REVELO 8 OINES","unidad",4,0],
[6,"51210 EBCHQ","64","BASE 8 PINES","unidad",0,0],
[6,"NEGRO","65","TAPAS LEVINTON DE HABITACIONES NUEVA","unidad",17,0],
[6,"BLANCO","66","TAPA PARA TOMA CORIENTE DUPLEX[DOBLE]","unidad",22,0],
[6,"BLANCO","67","TAPAS SYS[SOCKETS-Y-SUICHES]","unidad",30,0],
[6,"BLANCO","68","TAPAS TRADEMASTER","unidad",1,0],
[6,"NARANJA HALUX Y DUPLE","69","TAPAS PARA CORIENTE DOBLE CON POLO ATIERRA AISLADO","unidad",10,0],
[6,"NARANJA","70","PATA DUPLEX ESTANDAR LEVINTON 80703-ORG","unidad",5,0],
[6,"BLANCA[SYS]","71","TAPA CIEGA PARA CONEXIONES ELECTRICAS","unidad",20,0],
[6,"BLANCA -88001","72","TAPA DE INTERUPTOR DE LUZ LEVINTON","unidad",10,0],
[6,"COLOR/ALMENDRA-2111050","73","TAPAFRONTAL DE UNA SOLA BANDA CO 2 PUERTO","unidad",2,0],
[6,"BLANCO","74","TAPA[ O PLACA]PARA CONECTIVIDAD CON 2 PUERTO PARA MODULO TIP","unidad",1,0],
[6,"General","75","BORNA SCRW50U CONNECTECH","unidad",6,0],
[6,"General","76","CONTACT CLEANER ELECTRICO QD 16 OZ NACIONAL","unidad",5,0],
[6,"General","INVENTARIO DE CABLES","","unidad",0,0],
[6,"REFERENCIA","CODIGO","NOMBRE","unidad",0,0],
[6,"#12 \"NEGRO\"","1","ROLLO DE CABLE","unidad",2,2],
[6,"#12 \"VERDE\"","2","ROLLO DE CABLE","unidad",1,2],
[6,"#12 \"BLANCO\"","3","ROLLO DE CABLE","unidad",1,2],
[6,"3X14 AWG","4","CABLE ENCAUCHETADO","unidad",5,2],
[6,"L15-20P","5","TOMA DE SEGURIDAD LEVINTON","unidad",8,5],
[6,"L15-20P","6","TOMA DE SEGURIDAD LEVINTON (CLAVIJA)","unidad",4,3],
[6,"L21-30","7","TOMA HEMBRA DE SEGURIDAD LEVINTON","unidad",2,3],
[6,"BLANCO HALUX","8","TOMA DOBLE P/T GFCI E 15 AMP","unidad",10,5],
[6,"L21-30","9","CLAVIJA DE SEGURIDAD LEVINTON","unidad",2,3],
[6,"1\"","10","PRENSA ESTOPA","unidad",15,10],
[6,"3/4\"","11","PRENSA ESTOPA","unidad",10,10],
[6,"1/2\"","12","PRENSA ESTOPA PLASTICA","unidad",25,15],
[6,"110V","13","CLAVIJA LEVITON","unidad",10,10],
[6,"CAT. 6 X305 MTS","14","CABLE UTP","unidad",1,1],
[6,"3X12AWG 50","15","CABLE CU ENCUCHETADO","unidad",0,1],
[6,"15A","16","INTERRUPTOR LEVITON SENCILLO","unidad",6,10],
[6,"General","17","INTERRUPTOR LEVITON DOBLE CONMUTABLE","unidad",15,10],
[6,"General","18","TOMA DOBLE ARQUEA","unidad",8,5],
[6,"20A - 125V","19","CLAVIJA LEVITON","unidad",10,5],
[6,"15AMP - 125V","20","CLAVIJA CAUCHO P.T CODELCA","unidad",16,10],
[6,"110V ROJO","21","PILOTO 22MM 52MM","unidad",10,10],
[6,"3 X 10 AWG (METRO)","22","CABLE ENCAUCHETADO","unidad",20,20],
[6,"L5-20","23","CLAVIJA DE SEGURIDAD  LEVITON","unidad",8,5],
[6,"#10 AWG \"BLANCO\" (METRO)","24","ROLLO DE CABLE","unidad",150,100],
[6,"General","25","TOMA GALICA  DOBLE CON POLO A TIERRA BLANCA","unidad",19,10],
[6,"100X45MM","26","TAPA TUNEL CANALETA","unidad",10,8],
[6,"100X45MM","27","","unidad",4,5],
[6,"General","28","INTERRUPTOR CONMUTABLE 5603-02W SENCILLO DECORA LEVITON (NEG","unidad",16,10],
[6,"General","29","INTERRUPTOR CONMUTABLE 5603-02W SENCILLO DECORA LEVITON (BLA","unidad",20,10],
[6,"General","30","CLAVIJA 220V AZUL 3P + 32 AMP CLA32/024 TIERRA 9 H IP44 (220","unidad",1,2],
[6,"General","31","TOMA SOBRE PONER 220VOL 32 AMP","unidad",1,1],
[6,"20X20","32","TAPA DE REGISTRO","unidad",5,5],
[6,"15X15","33","TAPA DE REGISTRO","unidad",6,5],
[6,"2X14","34","CABLE TERMOFLEX CENTELSA","unidad",0,0],
[6,"30X30","35","TAPA DE REGISTRO","unidad",9,5],
[7,"General","grifo cuello de ganso para montaje sobre meson","B-1120-135X-WH4","unidad",1,0],
[7,"General","ACOPLE  RIGIDO RANURADO","2 PULGADA","unidad",7,0],
[7,"General","ACCESORIO SANITARIA AGUA GRASA","3PULGADA","unidad",2,0],
[7,"General","SIFON","3 PULGADA","unidad",3,0],
[7,"General","VALVULAS DE CORTE 3/4","","unidad",5,0],
[7,"General","VALBULAS MAXIVENT","2 PULGADA","unidad",2,0],
[7,"General","DETECTOR HUMO MULTIPROPODITO BASE SIMPLE+DETECTOR OPTICO TERMICO","","unidad",0,0],
[7,"General","DETECTOR HUMO MULTIPROPODITO BASE AISLADORA+DETECTOR OPTICO TERMICO","","unidad",0,0],
[7,"General","DETECTOR HUMO MULTIPROPOSITO CON BASE SONORA+DETECTOR OPTICO TERMICO","","unidad",0,0],
[7,"General","APPLC LUZ ESTROBOSCOPICA DE MONTANJE EN TECHO","49VO","unidad",0,0],
[7,"General","MODULO DE CONTROL","4090-9002","unidad",0,0],
[7,"General","SUPERNOVA(DRIVER INCLUIDO)","","unidad",2,0],
[7,"General","PS.ELDOLED","CC150MA","unidad",1,0],
[7,"General","FITER-RECLEAN.POLYFLO(POLYFLO MEDIA BLUE)","","unidad",1,0],
[7,"General","GRIFERIA IVM","8 PULGADA PURIST","unidad",1,0],
[7,"General","TARJETA MAIN","","unidad",1,0],
[7,"General","VALVULAS SELENOIDE PARA ENFRIADOR","","unidad",5,0],
[7,"General","ASSYPCB MAIN","","unidad",1,0],
[7,"General","PCB DISPLAY BOARD","","unidad",1,0],
[7,"General","PCB CONTROL BOARD","","unidad",1,0],
[7,"General","DOOR SWITCH","","unidad",1,0],
[7,"General","CONTROLADOR LED (DRIVE)POWER SUPPLY","1-10V","unidad",5,0],
[7,"General","CONTROLADOR LED (DRIVE)POWER SUPPLY","110-240V","unidad",26,0],
[7,"General","CONTROLADOR LED (DRIVE)POWER SUPPLY MINI","20W","unidad",30,0],
[7,"General","CONTROLADOR LED(DRIVER_POWER SUPPLY COLOR GRIS DE VOLTAJE CONSTANTE","60-24V-DC","unidad",13,0],
[7,"General","CONTROLADOR LED (DRIVE) POWER SUPPLY COLOR GRIS DE VOLTAJE","90W-24V-DC","unidad",4,0],
[7,"General","CONEXION DE TRIMLESS O.F.A","","unidad",2,0],
[7,"General","FOCO MINILED EMPOTRABLE","DORADO","unidad",2,0],
[7,"General","TUBOS CILINDRICO MILESS","NEGRO","unidad",2,0],
[7,"General","FOCOS LED EMPOTRABLE","BLANCO","unidad",3,0],
[7,"General","FOCO LED PARA TECHO O PARED","BLANCO","unidad",5,0],
[7,"General","FOCO LED  EMPOTRABLE PARA TECHO O PARED","NEGRO","unidad",1,0],
[7,"General","TUBOS ESPIAS 52 FBR","DORADO","unidad",2,0],
[7,"General","FOCO LED  EMPOTRABLE  DE ALTA ILUMINARIA","BLANCO","unidad",1,0],
[7,"General","FOCO LED EMPOTRABLE","DORADO","unidad",1,0],
[7,"General","FOCO LED EMPOTRABLE","220-240V-BLANCO","unidad",1,0],
[7,"General","BASE METALICAPARA PARA LAMPARA COLGANTES","NEGRO","unidad",3,0],
[7,"General","MODULO DE PUERTAS  AC-VVVF SEMATIC HV -MV","","unidad",1,0],
[7,"General","FOCOS LED EMPOTRABLE PARA TECHO","25W-700MA-60V","unidad",9,0],
[7,"General","FOCOS LED EMPOTRABLE PARA TECHO","25W-700MA-60V COLOR NEGRO","unidad",2,0],
[7,"General","MINI FOCO LED EMPOTRABLE (OJO DE BUEY)","8,2W-1050MA-60V","unidad",1,0],
[7,"General","CLIP ESPIA","3,1W-1050MA-60V COLOR DORADO FLAMENCO-NEGRO","unidad",3,0],
[7,"General","CLIP ESPIA 52 LED EMPOTRABLE  DE TECHO","12,4W-60V COLOR DORADO FLAMENCO","unidad",2,0],
[7,"General","LUMINARIAS LE  CON 4 FOCOS INTEGRADO CON LENTES OPTICOS","12,4W-1050MA-60V","unidad",2,0],
[7,"General","FOCO LED EMPOTRABLE EN DIFERENTES ANGULOS Y TEMPERATURA","8,6W-500MA-60V COLOR BLANCO","unidad",1,0],
[7,"General","FOCOS LED EMPOTRABLE EN DIFERENTES ANGULO Y TEMPERATURA","12,4W-700MA-60V","unidad",2,0],
[7,"General","CAMPANA METALICA","COLOR BLANCO","unidad",1,0],
[7,"General","CAMPANA METALICA PARA FOCOS LED","COLOR BLANCO","unidad",2,0],
[7,"General","FOCOS LED EMPOTRABLE","8,6W-500MA-60V COLOR BLANCO","unidad",3,0],
[7,"General","FOCO LED  EXTEROR  CON CABLE","2,3W-700MA-60V COLOR NRGRO","unidad",1,0],
[7,"General","FOCO LED EMPOTRABLE REDONDO MODELO LEDVANCE","18W-1050MA-60V","unidad",1,0],
[7,"General","CINTA LED","10W/24V-DC","unidad",20,0],
[7,"General","CINTA LED","17W/24V-DC","unidad",1,0],
[7,"General","CONECTORES PROTECTORES ENTRE CABLES","","unidad",9,0],
[7,"General","MODULOS DE CONTROL DE ILUMINACION LED","120W-24V-DC","unidad",4,0],
[7,"General","SPY 52 TUBOBLANCO-NEGRO","","unidad",2,0],
[7,"General","SPY39 TUBO BLANCO,NEGRO Y DORADO","","unidad",4,0],
[7,"General","REJILLA DE CUBIERTA DE LUZ","","unidad",2,0],
[7,"General","DISCO DE LAMPARAS","","unidad",1,0],
[7,"General","SOPORTE DE LAMPARA DE VIDRIO","","unidad",2,0],
[8,"General","SUMINISTRO DE ESPACIADOR AUTO NIVELANTE 3MM X 100 PAQUETE","","unidad",36,0],
[8,"General","SUMINISTRO DE CUNA NIVELADORAS X 100 PAQUETE","","unidad",24,0],
[8,"General","SUMINISTRO DE YUMBOLO-COLA DE RATA-1/4 PARA JUNTAS DE DILATACION","","unidad",4,0],
[8,"General","SUMINISTRO DE SIKA AT CONECTION","COLOR BEIGE","unidad",27,0],
[8,"General","BOQULLA   x 5kl","COLOR BEIGE","unidad",20,0],
[8,"General","COLA DE RATA","","unidad",3,0],
[8,"General","SIKA FLEX","COLOR BEIGE","unidad",7,0],
[9,"General","LLAVE DE BOCA 1-1/2 STANLEY","89-718","unidad",1,0],
[9,"General","LLAVE DE BOCA 1-1/4 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 1-1/8 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 1-1/16 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 1 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 15/16 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA7/8 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA13/16 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA3/4 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA11/16 SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 16 MM DROP FORGET","","unidad",1,0],
[9,"General","LLAVE DE BOCA 17MM DROP FORGET","","unidad",1,0],
[9,"General","LLAVE DE ALLEN 8'' SATA","83314","unidad",1,0],
[9,"General","LLAVE DE BOCA 19MM SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 21MM SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 22MM SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 24MM SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA27MM SATA","","unidad",1,0],
[9,"General","LLAVE DE BOCA 30MM SATA","","unidad",1,0],
[9,"General","LLAVE DE VBOCA32MM SATA","","unidad",1,0],
[9,"General","LLAVE DE TUBO 10'' PRETUL","","unidad",1,0],
[9,"General","LLAVE DE TUBO 12'' PRETUL","","unidad",1,0],
[9,"General","LLAVE TUBO14'' RIDGID","","unidad",1,0],
[9,"General","LLAVE DE TUBO14''","","unidad",1,0],
[9,"General","LLAVE DE TUBO 18'' DROP FORGET","","unidad",1,0],
[9,"General","LLAVE DE TUBO 18'' DROP FORGET","","unidad",1,0],
[9,"General","LLAVE DE TUBO 24'' PRETUL","","unidad",1,0],
[9,"General","LLAVE DE EXPANSION 15'' STANLEY","","unidad",1,0],
[9,"General","LLAVE UNIOVERSAL 10MM MEGABITE WRENCH","","unidad",1,0],
[9,"General","LLAVE DE EXPANSION 12''STANLEY","","unidad",1,0],
[9,"General","REMACHADORA STANLEY","STHT69646","unidad",1,0],
[9,"General","NIVEL TORPEDO KARSON","","unidad",1,0],
[9,"General","ESCUADRA 8'' STANLEY","","unidad",1,0],
[9,"General","LINTERNA LED 11O LUMENES VARTA","","unidad",1,0],
[9,"General","SISAYA 24''MM","","unidad",1,0],
[9,"General","PATACABRA","","unidad",1,0],
[9,"General","ARCA DE SIERRA 12'' STANLEY","","unidad",1,0],
[10,"BODEGA #1","GRIFO DE COCINA O LAVAPLATOS","","unidad",20,2],
[10,"BODEGA #2","GRIFO INDUSTRIAL ALTO TRAFICO CON MANGUERA 6\"","","unidad",18,2],
[10,"BODEGA #3","VALVULA A PEDAL","","unidad",3,1],
[10,"BODEGA #4","GRIFO LAVAOLLA CON MANGUERA","","unidad",1,2],
[10,"BODEGA #5","VALVULA FLUXOMETRO","","unidad",4,1],
[10,"BODEGA #6","CUELLO VERTICAL GIRATORIO PARA  MESA","","unidad",2,1],
[10,"BODEGA #7","MEZCLADOR LAVAPLATOS","","unidad",2,1],
[10,"BODEGA #8","CAÑO GIRATORIO SOBRE REPISA","","unidad",0,1],
[10,"BODEGA #9","CUELLO GANSO 1/2\" RACOR","","unidad",0,1],
[10,"BODEGA #11","MEZCLADOR LAVA OLLA","","unidad",3,1],
[10,"BODEGA #12","CUELLO GANSO LAVA OLLA","","unidad",1,1],
[10,"BODEGA #13","MEZCLADOR LAVA OLLA RESIDENCIA","","unidad",1,1],
[10,"BODEGA #14","MEZCLADOR LAVAPLATOS 8\"","","unidad",0,1],
[10,"BODEGA #15","PEDAL SENCILLO","","unidad",5,2],
[10,"BODEGA #16","VALVULA SPRAY","","unidad",13,4],
[10,"ALMACEN","LLAVES DE CHORRO","","unidad",3,0],
[10,"General","VALVULAS REDUCTORAS DE PRESION CALEFFI DE 1/2 CUERPO EN LATON","","unidad",9,10],
[10,"General","VALVULAS DE ELECTRO DE 110V","","unidad",5,3],
[10,"General","VALVULA DE ELECTRO DE 220V","","unidad",5,4],
[10,"General","ACOPLE BUSHING DE 1/4\" - 1/2\" INOX","","unidad",4,25],
[10,"General","VALVULA REGULADORA METALICAS CRUCETA DE 1/2","","unidad",0,8],
[10,"General","VALVULAS REDWAY DE 1/2","","unidad",3,0],
[10,"General","VALVULAS DE 3/4 REDWAY","","unidad",4,0],
[10,"General","VALVULAS DE ALIVIO DE 1/2\" ROSCADAS EN  BRONCE","","unidad",0,5],
[10,"General","MANOMETROS DE 0-30 PSI CARATULA 2.5\" CONEXION VERTICAL  1/4\" NPT SECO","","unidad",5,5],
[10,"General","MANOMETROS WINTERS GLICERINA STABILIZ DE ACERO INOX. 0-200 PSI CARATULA 2.5\" CONEXION VERTICAL 1/4\" NPT.","","unidad",5,5],
[10,"General","MANOMETROS CARATULA DE 2.5\" CONEXION VERTICAL 1/4\" 0-300 PSI/BAR CON GLICERINA.","","unidad",4,5],
[10,"General","MANOMETROS DE 0-100 PSI CARATULA 2.5\" CONEXION VERTICAL 1/4\" GLICERINA.","","unidad",2,5],
[10,"General","MANOMETROS DIAF A/BR CARATULA VERTICAL DE 2.5\" CONEXION 1/4\" VERTICAL 0/35 IN H2O Y 0-84 MBAR.","","unidad",7,10],
[10,"General","VALVULA REGULADORA DE 1/2 JAGUAR","","unidad",3,20],
[10,"General","TEFLON INDUSTRIAL TRUPER","","unidad",0,10],
[10,"General","TEFLON","","unidad",10,5],
[10,"General","TEFLON DE AGUA","","unidad",10,4],
[10,"General","CANASTILLA DE LAVAPLATOS  4 METALICAS CON SOSCO","","unidad",4,5],
[10,"General","CANASTILLA PROTECTORA ROCIADOR","","unidad",0,0],
[10,"General","TAPA SANITARIO CORONA (OVALADA)","","unidad",7,10],
[10,"General","ASIENTO SANITARIO INSTITUCIONAL FORTE CORONA","","unidad",4,5],
[10,"General","ADAPTADOR MACHO 3/4","","unidad",4,0],
[10,"General","ADAPTADOR MACHO1/2","","unidad",30,0],
[10,"General","ADAPTADOR MACHO CPVC 1/2\" TRANSICION CPVC","","unidad",9,10],
[10,"General","ADAPTADOR HEMBRA 1/2\"","","unidad",8,10],
[10,"General","CODO CPVC 1/2\" X 90","","unidad",29,20],
[10,"General","CODO CPVC 3/4 X 90","","unidad",20,20],
[10,"General","CODO CPVC 3/4 X 45","","unidad",20,20],
[10,"General","CODO CPVC 1/2\" X 45","","unidad",30,20],
[10,"General","CODOS CPVC DE 1''","","unidad",16,0],
[10,"General","UNION CPVC DE 1''","","unidad",19,0],
[10,"General","TEE CPVC 3/4","","unidad",10,20],
[10,"General","TEE CPVC 1/2\"","","unidad",20,20],
[10,"General","TEE CPVC DE 1","","unidad",5,0],
[10,"General","T EN ACERO INOX 1/2","","unidad",3,0],
[10,"General","BUJES SOLDADO CPVC 1 1/4 A 3/4","","unidad",21,0],
[10,"General","PEGACOR BLANCO X 25K","","unidad",15,15],
[10,"General","SIKAFILL 12 POWER 5 GL","","unidad",1,1],
[10,"General","RASCADOR DE JUNTAS","","unidad",2,5],
[10,"General","REMOVEDOR GALON","","unidad",2,3],
[10,"General","SENSOR DE SANITARIO","","unidad",0,5],
[10,"General","SENSOR DE ORINAL","","unidad",0,5],
[10,"General","UNIVERSAL INOXIDABLE 304 CNX 1/2X150L","","unidad",5,0],
[10,"General","GRATAS COPA ENTORCHADA 3'' X5 BARRACUDA INCOLMA","","unidad",1,2],
[10,"General","GRATAS COPA ACERO TRENZADO","","unidad",1,5],
[10,"General","BOTON DUAL REDONDO","","unidad",18,20],
[10,"General","BOTON DE DESCARGA DE SANITARIO","","unidad",20,0],
[10,"General","CARTUCHO PUSH ORINAL","","unidad",5,5],
[10,"General","EMPAQUE PARED SISTEMA CONEXION","","unidad",10,10],
[10,"General","ACOPLE MPK 4 PULGADAS","","unidad",1,5],
[10,"General","SIFON FLEXIBLE X1","","unidad",1,0],
[10,"General","VALBULA DE BOLA BR1/2","","unidad",4,0],
[10,"General","VALVULA DE BOLA BR1","","unidad",3,0],
[10,"General","VALVULA GUSANILLO","","unidad",6,10],
[10,"General","VALVULA DE CORTINA 1/2","","unidad",6,0],
[10,"General","SIFON BOTELLA FLEXIBLE METALIZADO","","unidad",1,0],
[10,"General","DIAFRAGMA RED CAUDAL V. ELECT ORINAL","","unidad",1,2],
[10,"General","SIFON EN P GRIS","","unidad",3,0],
[10,"General","SIFON BOTELLA GRIS M20 CP3","","unidad",9,0],
[10,"General","PQTE SIFON BOTELLA X1","","unidad",3,0],
[10,"General","SIFON BOTELLA","","unidad",1,0],
[10,"General","DESAGUE SENC SIN REBOSE","","unidad",14,0],
[10,"General","DESAGUE AUTOMATICO EA M10 CP2","","unidad",5,0],
[10,"General","DESAGUE SENC SIN REBOSE M7 CP5","","unidad",1,0],
[10,"General","BUJE 2X1 1/4\"  SIFON INTEGRAL EN P","","unidad",1,0],
[10,"General","CUERDA ACCIONADORA CAUCHO M10 CP6","","unidad",1,0],
[10,"General","BUJE LAVAMANOS 1\" 1/2\"","","unidad",4,0],
[10,"General","SOPORTE DE DUCHA","","unidad",4,0],
[10,"General","TORNILLO DE FIJACION TANQUE SANITARIO (PAR)","","unidad",9,0],
[10,"General","UNION CPVC 1/2","","unidad",5,0],
[10,"General","UNIONPVC DE 3/4","","unidad",28,0],
[10,"General","BUJE SOLDADO CPVC 3/4 X 1/2","","unidad",29,0],
[10,"General","UNION CPVC 3/4","","unidad",11,0],
[10,"General","REDUCCION BUSHING EN ACERO INOXIDABLE 1X1/2","","unidad",5,0],
[10,"General","EMPAQUE PARA MANGUERA","","unidad",20,0],
[10,"General","LLAVE DE CHORRO JARDIN","","unidad",3,0],
[10,"General","UNION UNIVERSAL CPVC 3/4","","unidad",6,0],
[10,"General","UNION UNIVERSAL CPVC 1/2","","unidad",10,0],
[10,"General","ADAPTADOR HEMBRA 1","","unidad",4,0],
[10,"General","TRANSICION CPVC ADAPTADOR HEMBRA 1/3","","unidad",10,0],
[10,"General","TRANSICION CPVC ADAPTADOR HEMBRA 3/4","","unidad",10,0],
[10,"General","ADAPTADOR MACHO CPVC 1/2\"","","unidad",43,0],
[10,"General","ADAPTADOR MACHO CPVC 3/4\"","","unidad",18,0],
[10,"General","ADAPTADORES MACHOS PVC 3/4","","unidad",30,0],
[10,"General","TELEDUCHA X 1.50MT","","unidad",6,0],
[10,"General","VALVULA DE LLENADO UNIVERSAL PLUS","","unidad",1,0],
[10,"General","TUBOS PVC 3/4","","unidad",20,0],
[10,"General","TUBO PRESION DE 3/4 X METRO","","unidad",15,0],
[10,"General","TUBO CPVC 11/2 X METRO","","unidad",9,5],
[10,"General","TUBOS CPVC DE 1/2","","unidad",20,0],
[10,"General","UNION CPVC1/2","","unidad",26,0],
[10,"General","UNION CPVC 11/2","","unidad",10,0],
[10,"General","SOLDADURA CPVC X 1/4\"","","unidad",6,0],
[10,"General","SOLDADURA PVC X 1/4\"","","unidad",2,0],
[10,"General","VALVULA ENTRADA SANITARIO UNIVERSAL","22850001","unidad",11,5],
[10,"General","MEZCLADOR DUCHA ECO","","unidad",5,0],
[10,"General","SUSY ALEGNA","","unidad",0,0],
[10,"General","ACOPLE METALICO LAVAMANOS AGUA CALIENTE LONGITUD 60CM MARCA GRIVAL","","unidad",20,0],
[10,"General","MANGUERA DE PLASTICO LAVAMANOS GRIVAL","","unidad",6,0],
[10,"General","MANGUERA DE ACOPLE PARA SANITARIO","","unidad",10,0],
[10,"General","MANGUERA DE ENTRADA P/LAVADORA","","unidad",5,0],
[10,"General","MANGUERA DE SALIDA P/LAVADORA","","unidad",5,0],
[10,"General","MANGUERA DE TELEDUCHAS X 1.50 MT","","unidad",23,0],
[10,"General","REJILLA DE DRENAJE 2\"","","unidad",-1,0],
[10,"General","DESAGUE/ CENTRAL PUSH METAL SIN REBOSE","935385551","unidad",14,0],
[10,"General","VALVULA BOLA MANIJA MARIPOSA 1/2","","unidad",6,5],
[10,"General","UNION PVC 1/2","","unidad",8,10],
[10,"General","RACORES MACHO CPVC 1/2","","unidad",8,10],
[10,"General","RACORES MACHOPVC 3/4","","unidad",15,0],
[10,"General","RACORES HEMBRA PVC 3/4","","unidad",15,0],
[10,"General","CODOS CPVC 1/2","","unidad",31,10],
[10,"General","CODOS INOX1/4","","unidad",4,0],
[10,"General","POSAPIE EN MARMOL","","unidad",12,10],
[10,"General","CHEQUE HORIZONTAL O CORTINA 3/4'","","unidad",4,5],
[10,"General","CHEQUE HORIZONTAL O CORTINA 1/2'","","unidad",4,5],
[10,"General","VALVULA CIERRE RAPIDO 3/4'","","unidad",4,5],
[10,"General","CHEQUE HIDRO HELBERT DE 3'","","unidad",2,0],
[10,"General","KIT FLOW SWITCH KI FOR HVAC WITH RUBBER GASKET","","unidad",1,0],
[10,"General","BUSCHING INOX DE 1/2","","unidad",6,0],
[10,"General","TAPON MACHO SS 304 NPT150 1/2","","unidad",30,0],
[10,"General","TAPON MACHO SS 304 NPT 1503/4","","unidad",30,0],
[10,"General","TRAMPA DE VAPOR /FILTRO 150 DE 1''","","unidad",1,0],
[10,"General","VALVULA FLOTADOR","INOX CNX 1/2 NPT","unidad",1,0],
[10,"General","GASTOP TUERZA MEDIA","X36ML","unidad",9,0],
[10,"General","CODOS CPVC3/4","","unidad",45,0],
[10,"General","UNION CPVC 3/4","","unidad",42,0],
[10,"General","UNION PVC 2 PAVCO","","unidad",15,0],
[10,"General","TUBERIA COBRE - TIPO L RIG","","unidad",0,2],
[10,"General","REDUCCION DE COBRE","","unidad",1,5],
[10,"General","UNION DE COBRE","","unidad",0,5],
[10,"General","UNION DE COBRE","","unidad",0,5],
[10,"General","CODO DE COBRE CUELLO CORTO","","unidad",0,0],
[10,"General","CODOS DE COBRE CUELLO CORTO","","unidad",0,0],
[10,"General","CODO DE COBRE (CUELLO CORTO)","","unidad",1,6],
[10,"General","CODO DE COBRE (CUEL)","","unidad",1,6],
[10,"General","TUBERIA COBRE - TIPO L RIG","","unidad",0,2],
[10,"General","CORTA TUBO FORTE","","unidad",1,2],
[10,"General","ALICATE DIABLO GALIVAN","","unidad",0,1],
[10,"General","TUBOS DE EMT","","unidad",3,10],
[10,"General","CURVAS","","unidad",2,10],
[10,"General","GRAPA CHANNEL","","unidad",5,20],
[10,"General","GRAPAS","","unidad",20,40],
[10,"General","UNION PRESION 2","","unidad",2,5],
[10,"General","UNION","","unidad",22,50],
[10,"General","CORAZA  LIQUID TIHG","","unidad",1,20],
[10,"General","CAJAS EMT","","unidad",1,10],
[10,"General","GRAPAS DOBLE ALA EMT","","unidad",10,20],
[10,"General","CAJA OCTAGONAL PVC","","unidad",2,10],
[10,"General","ADAPTADOR MACHO NPT","","unidad",4,10],
[10,"General","ADAPTADOR TEE H","","unidad",3,10],
[10,"General","ADAPTADOR BUSHING NPT","","unidad",5,10],
[10,"General","ADAPTADOR MACHO NPT","","unidad",3,10],
[10,"General","ADAPTADOR HEMBRA NPT","","unidad",3,10],
[10,"General","CURVAS EMT","","unidad",10,20],
[10,"General","GRAPA ZINC","","unidad",10,20],
[10,"General","UNION IMC","","unidad",8,20],
[10,"General","BALA DE PISO CON TORNILLOS DE ESTRIS INOXIDABLE","","unidad",8,20],
[10,"General","GRAPAS CHANNEL","","unidad",40,30],
[10,"General","BUSHING INOX 304","","unidad",1,10],
[10,"General","BUSHING INOX 304","","unidad",0,0],
[10,"General","BUSHING INOX 304","","unidad",0,0],
[10,"General","BUSHING INOX 304","","unidad",0,0],
[10,"General","CODO INOX 304","","unidad",2,10],
[10,"General","COPA INOX 304","","unidad",2,10],
[10,"General","NIPLE INOX 304","","unidad",3,10],
[10,"General","NIPLE 304 DE LARGO","","unidad",1,0],
[10,"General","REDUCCION INOX 304 COPA ROSCADA DIAM","","unidad",1,5],
[10,"General","CAJAS DE PASO","","unidad",1,5],
[10,"General","CONECTOR SCH 3/4 SCH40","","unidad",5,20],
[10,"General","TUBERIA CORAZA GALVANIZADA","","unidad",20,20],
[10,"General","RACORES MACHO CPVC","","unidad",2,10],
[10,"General","CAJA 5800 2X4 CAL20 GALVANIZADA","","unidad",1,5],
[10,"General","CONECTOR DE ACERO PARA TUBO EMT","","unidad",5,5],
[10,"General","CONECTOR RECTO PARA CORAZA","","unidad",8,10],
[10,"General","BREKERT FIJO 125","","unidad",0,0],
[10,"General","PEROS GALVANIZADOS","","unidad",0,0],
[10,"General","PEROS GALVANIZADOS","","unidad",0,0],
[10,"General","PERROS INOXIDABLES","","unidad",0,0],
[10,"General","PRROS INOXIDABLE","","unidad",0,0],
[10,"General","NIPLES ENRROSCADO","","unidad",0,4],
[10,"General","NIPLES ENRROSCADO","","unidad",0,4],
[10,"General","BARILLA ENROSCADA EN INOX","","unidad",0,0],
[10,"General","BARILLA ENROSCADA EN INOX","","unidad",0,0],
[10,"General","BARILLA ENROSCADA EN INOX","","unidad",8,0],
[10,"General","BARILLA LISA EN INOX","","unidad",0,0],
[10,"General","DISCO DE PULIR DEWALT","","unidad",0,0],
[10,"General","VALVULAS REDUCTORAS DE PRESION","","unidad",11,0],
[10,"General","GANCHOS TENSORES INOX","","unidad",0,0],
[10,"General","GANCHOS TENSORES INOX","","unidad",0,0],
[10,"General","GANCHOS TENSORES INOX","","unidad",0,0],
[10,"General","GANCHOS TENSORES INOX","","unidad",0,0],
[10,"General","GANCHOS TENSORES INOX","","unidad",0,0],
[10,"General","TENSORES DE MORDAZA Y ORQUILLA INOX","","unidad",0,0],
[10,"General","GRILLETES EN INOX","","unidad",0,0],
[10,"General","ABRAZADERAS(PERRO) EN INOX","","unidad",0,0],
[10,"General","GRATAS EN ACERO CIRCULAR","","unidad",0,0],
[10,"General","COLLARIN DE PVC","","unidad",0,0],
[10,"General","DISCO DIAMANTADO","","unidad",0,0],
[10,"General","INVENTARIO DE PISINA","","unidad",0,0],
[10,"UBICACION","NOMBRE O DESCRIPCION","REF.","unidad",0,0],
[10,"General","REACTIVO CLORO LIBRE POLVO (OPERATING SUPPLIES) 1PACK DE 100","50271510-OS (2701-F&B)","unidad",1,3],
[10,"General","CUBETA DE VIDRIO PARA COLORIMETROS CHECKER","","unidad",3,3],
[10,"General","SISTEMA DE LIBERACION","","unidad",0,0],
[10,"General","300HIPOCLORITO DE SODIO 14%XKIKLO","","unidad",0,0],
[10,"General","ALGICIDA60%","","unidad",0,0],
[10,"General","BRIQUETAS PULSAR X22.7","","unidad",0,0],
[10,"General","CLARIFICADOR ECO CLEAR BLUE X LITRO","","unidad",0,0],
[10,"General","50 KL DE CLORO AL 90%","","unidad",0,0],
[10,"General","HTH CLORO 70% XL","","unidad",0,0],
[11,"General","CABLEADO PTC+ PUENTE RECTIF+RUT","","UNIDAD",2,0],
[11,"General","CONDUCTO DE SALIDA DE VAPOR","","UNIDAD",3,0],
[11,"General","CONSUCCTO DOSIF CUBA 40-60","","UNIDAD",3,0],
[11,"General","CORREA 40 SPB 2840","","UNIDAD",2,0],
[11,"General","CORREA SPB 3000","","UNIDAD",2,0],
[11,"General","E.V. TRIPLE COD 255.641","","UNIDAD",3,0],
[11,"General","ELECTRO VALVULA DOBLE","","UNIDAD",3,0],
[11,"General","MOTOR LA60 11KW","","UNIDAD",1,0],
[11,"General","MANIQUI DE PLANCHADO:PISTON PUÑOS","","UNIDAD",2,0],
[11,"General","MANIQUI DE PLANCHADO: PISTON TRASERO","","UNIDAD",2,0],
[11,"General","MANIQUI  PLANCHADO:VALVULA 5:2 24AC","","UNIDAD",4,0],
[11,"General","MANIQUI PLANCHADO: VALVULA VAPOR PLATO INFEROR","","UNIDAD",2,0],
[11,"General","REPUESTO MESA DETERMINADO:PLANCHA DE MANO A VAPOR","","UNIDAD",2,0],
[11,"General","REPUESTO PRENSA DE  PLANCHADO: PEDALES DE ACTIVACION","","UNIDAD",4,0],
[11,"General","REPUESTO PRENSA DE PLANCHADO:VALVULA VAPOR SUPEROIR","","UNIDAD",2,0],
[11,"General","REPUETO RODILLO DE PLANCHADO:DESPRENDEDORES DE RROPA CON TEFLON","","UNIDAD",8,0],
[11,"General","REPUESTO RODILLO DE PLANCHADO:TENSOR CADENA","","UNIDAD",2,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:CORREA POY-V12PK","","UNIDAD",2,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:ELECTROVALVULA GAS","","UNIDAD",2,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:MICRO SEGURIDAD","","UNIDAD",4,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:MICRO PROCESADOR PSM","","UNIDAD",1,0],
[11,"General","REPUESTO SECADORA INDUTRIAL:RUEDA DIAMETRO 125MM","","UNIDAD",4,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:SENSOR DE HUMEDAD","","UNIDAD",3,0],
[11,"General","REPUESTRO SECADORA INDUSTRIAL:SONDA TEMPERATURA MICROPROCESADOR","","UNIDAD",4,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:TERMOSTATO DE SEGURIDAD 180 GRADOS","","UNIDAD",3,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL:TERMOSTATO DE SEGURIDAD 180 GRADOS (GAS-VAPOR)","","UNIDAD",3,0],
[11,"General","REPUESTO SECADORA INDUSTRIAL: PARO DE EMERGENCIA","","UNIDAD",1,0],
[11,"General","VALVULA DESAGUE CON DESFOGUE","","UNIDAD",1,0],
[11,"General","AMORTIGUADOR","","UNIDAD",6,0],
[12,"General","TERMOSTATO CAREL","","unidad",1,0],
[12,"General","SONDA NTS SILICONA","","unidad",3,0],
[12,"General","RESISTENCIA SILICONA 500W","","unidad",1,0],
[12,"General","RESISTENCIA SILICONA 1000W","","unidad",2,0],
[12,"General","KITTARJETAPRINCIPAL DBCTFDUAL/SINGLE","","unidad",0,0],
[12,"General","VALVE , INLET120VACBRKT 90","","unidad",0,0],
[12,"General","MEMBRANA TECLADO DUAL TF","","unidad",0,0],
[12,"General","MANIJA PARA PORTA FILTROS GOURMET FUNNEL","","unidad",0,0],
[12,"General","SCREW, RDHSLTDBLK .25-20X1.50","","unidad",0,0],
[12,"General","VALVULA DE GAS","","unidad",0,0],
[12,"General","TERMOSTATO LIMITE ALTO (Hi-Limit Switch)","","unidad",0,0],
[12,"General","PERILLAS DE CONTROL (KNOBS)","","unidad",0,0],
[12,"General","LISNHLIN 1177","","unidad",0,0],
[12,"General","TERMOSTATO DE CONTROL PRINCIPAL (RX THERMOSTAT)","","unidad",0,0],
[12,"UBICACION","NOMBRE O REFERENCIA","","unidad",0,0],
[12,"ALMACEN","SENSOR DE NIVEL MAS CONECTOR DE SENSOR","","unidad",0,1],
[12,"ALMACEN","MICROINTERRUPTOR","","unidad",5,5],
[13,"ESTAN K2","RODAMIENTO","22211E/C3","UNIDAD",2,4],
[13,"ESTAN K2","RODAMIENTO","7309BEP","UNIDAD",1,4],
[13,"ESTAN K2","RODAMIENTO","6309-2Z/C3GJN","UNIDAD",1,4],
[13,"ESTAN K2","RODAMIENTO","6308-2Z/C3GJN","UNIDAD",1,4],
[13,"ESTAN K3","RODAMIENTO","6200 ZZ/C3 SKF","UNIDAD",15,0],
[13,"ESTAN K2","RODAMIENTO","6208-2Z/C3","UNIDAD",1,4],
[13,"ESTAN K2","RODAMIENTO","T12208","UNIDAD",4,4],
[13,"ESTAN K2","RODAMIENTO","6306-2Z/C3GJN","UNIDAD",2,4],
[13,"ESTAN K2","RODAMIENTO","6205-2Z/C3GJN","UNIDAD",4,4],
[13,"ESTAN K2","RODAMIENTO","YET207","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","H2308","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","511","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","103","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","6205-2RS1R","UNIDAD",3,2],
[13,"ESTAN K2","RODAMIENTO","6204-2RSH","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","6209-2Z/C3GJN","UNIDAD",3,2],
[13,"ESTAN K2","RODAMIENTO","6202-2RS","UNIDAD",20,4],
[13,"ESTAN K2","RODAMIENTO","6000-2RSH","UNIDAD",10,4],
[13,"ESTAN K2","RODAMIENTO","6003-2RSR","UNIDAD",30,4],
[13,"ESTAN K2","RODAMIENTO","6201-2RS/C3","UNIDAD",5,4],
[13,"ESTAN K2","RODAMIENTO","6003-2ZR/C3GJN","UNIDAD",2,2],
[13,"ESTAN K2","RODAMIENTO","16005-A","UNIDAD",3,2],
[13,"ESTAN K2","RODAMIENTO","6201-2Z/C3","UNIDAD",0,4],
[13,"ESTAN K2","RODAMIENTO","BB1-4830A","UNIDAD",1,1],
[13,"ESTAN K2","RODAMIENTO","6203LLUC3/2AS","UNIDAD",0,1],
[13,"ESTAN K2","RODAMIENTO","6004-2RS/C3","UNIDAD",1,1],
[13,"ESTAN K2","RODAMIENTO","6202LLUC3/2AS","UNIDAD",1,3],
[13,"ESTAN K2","RODAMIENTO","6904-2RSC3","UNIDAD",10,2],
[13,"ESTAN K2","RODAMIENTO","6312-2Z/C3","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","6212-2Z/C3","UNIDAD",1,2],
[13,"ESTAN K2","RODAMIENTO","NU218-E-XL-TUP2","UNIDAD",1,1],
[13,"ESTAN K2","RODAMIENTO","NU218-E-XL-TUP2-C3","UNIDAD",1,1],
[13,"ESTAN K2","RODAMIENTO","SKF YER207","UNIDAD",4,1],
[13,"ESTAN K2","RODAMIENTO","FAG NU218ETVP","UNIDAD",1,1],
[13,"General","RODAMIENTO","UK-210 VON BUJE-EJE 45MM","UNIDAD",7,1],
[13,"ESTAN K3","VALVULA 3VIAS LAVALOSA PISO 30","","UNIDAD",1,1],
[13,"ESTAN K3","VALVULA SOL/DIRECTA 220VAC","","UNIDAD",2,1],
[13,"ESTAN K3","BRAZO LAVADORA ACLARADO CAPOTA","","UNIDAD",1,1],
[13,"ESTAN K3","PATINES","","UNIDAD",1,1],
[13,"ESTAN K3","EMPAQUE LAVADORA HYATT","","UNIDAD",1,1],
[13,"ESTAN K3","TARJETA LAVADORA #4 FAGOR","","UNIDAD",1,1],
[13,"ESTAN K3","ELECTRO VALVULA AC 230V","","UNIDAD",3,1],
[13,"ESTAN K3","REGULADOR DE GAS","","UNIDAD",0,1],
[13,"ESTAN K3","TERMOSTATO DE SEGURIDAD","","UNIDAD",1,1],
[13,"ESTAN K2","CHUMASERA","UC205-16","UNIDAD",3,1],
[13,"ESTAN K2","CHUMASERA","UC205-16","UNIDAD",3,1],
[13,"ESTAN K2","CHUMASERA","UC205","UNIDAD",3,1],
[13,"ESTAN K2","CHUMASERA","UC206-19","UNIDAD",1,1],
[13,"ESTAN K2","CHUMASERA","UC208-24","UNIDAD",3,1],
[13,"ESTAN K2","CHUMASERA","UC206","UNIDAD",6,1],
[13,"ESTAN K2","CHUMASERA","UC208-2Y-J7","UNIDAD",4,1],
[13,"ESTAN K2","CHUMASERA","UCFC206","UNIDAD",3,1],
[13,"ESTAN K2","SELLO 700AR","2 1/8\"","UNIDAD",3,1],
[13,"ESTAN K2","SELLO21","2 1/8\"","UNIDAD",2,1],
[13,"ESTAN K2","SELLO GRUNFOS","16MM","UNIDAD",3,1],
[13,"ESTAN K2","SELLO GRUNFOS","22MM","UNIDAD",3,1],
[13,"ESTAN K2","SELLO MECANICO","27MM","UNIDAD",1,1],
[13,"ESTAN K2","SELLO MECANICO","17MM","UNIDAD",1,1],
[13,"ESTAN K2","SELLO MECANICO","1 1/4\"","UNIDAD",2,1],
[13,"ESTAN K3","VALVULA DE SEGURIDAD DE TEMPERATURA Y PRESION","3/4\"","UNIDAD",1,1],
[13,"ESTAN K3","VALVULA REGULADORA SALIDA","1/2\"","UNIDAD",2,1],
[13,"ESTAN K3","COLLAR CLIP","","UNIDAD",2,1],
[13,"ESTAN K3","ELECTRO VALVULA 3-230PSIG -24V DC","1/2\"","UNIDAD",1,1],
[13,"ESTAN K3","PERILLAS DE GAS","","UNIDAD",6,2],
[13,"ESTAN K3","ELECTRO VALVULA 150PSI/10.5BAR","","UNIDAD",5,1],
[13,"ESTAN K3","SOLENOIDE 2/2 VAL 220VAC","","UNIDAD",4,1],
[13,"ESTAN K3","BRAZADERAS","BRARIAS","UNIDAD",50,10],
[13,"General","RODAMIENTO","6206 ZZ/C3","unidad",4,0],
[13,"General","RODAMIENTO","6200 NTN","UNIDAD",10,10],
[13,"UBICACION","NOMBRE O DESCRIPCION DEL PRODUCTO","REF.","UNIDAD DE MEDIDA",0,0],
[13,"General","ELECTRODO 6011 3/32","","KILO",3,3],
[13,"General","ELECTRODO INOXIDABLE 3/32","","KILO",3,3],
[13,"General","DISCO SEGMENTADO 4 1/2","","UNIDAD DE MEDIDA",10,5],
[13,"General","SOLDADURA 6013-332","","KILO",1,1],
[13,"General","BARILLAS PARA SOLDADURA DE COBRE","","unidad",0,0],
[14,"ESTANTE E","TINTE","MADETEC","unidad",2,1],
[14,"ESTANTE E","TINTE","MADETEC","unidad",0,1],
[14,"ESTANTE E","TINTE","KOLOR","unidad",1,1],
[14,"ESTANTE E","TINTILLA","KOLOR","unidad",2,1],
[14,"ESTANTE E","TINTE","KOLOR","unidad",1,1],
[14,"ESTANTE E","TINTILLA","RENANIA","unidad",1,1],
[14,"ESTANTE E","TINTILLA","RENANIA","unidad",0,1],
[14,"ESTANTE E","LACAS Y SELLADORES","CATALIZADOR","unidad",1,2],
[14,"ESTANTE E","INCOLOR INMUNIZANTE PARA MADERA","","unidad",1,2],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",5,4],
[14,"ESTANTE E","AEROSOL ANTICORROSIVO","PINTUCO","unidad",7,5],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",4,0],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",2,2],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",8,10],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",2,10],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",10,2],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",8,4],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",0,0],
[14,"ESTANTE E","AEROSOL","PINTUCO","unidad",6,4],
[14,"ESTANTE E","EPOXI-POLIAMIDA PEQUENO","PINTUCO","unidad",10,4],
[14,"ESTANTE E","CATALIZADOR PINTURA","PINTUCO","unidad",12,5],
[14,"ESTANTE E","CATALIZADOR","LINEA 35","unidad",0,2],
[14,"ESTANTE E","CATALIZADOR SUPER LACA","","unidad",1,2],
[14,"ESTANTE E","EPOXI-POLIAMIDA GRANDE","PINTUCO","unidad",3,2],
[14,"ESTANTE E","ESMALTE","PINTULUX","unidad",3,2],
[14,"ESTANTE E","ESMALTE POLIURETANO","","unidad",0,4],
[14,"General","POLIURETANO","","unidad",0,0],
[14,"ESTANTE E","ESMALTE","PINTUCO","unidad",1,1],
[14,"ESTANTE E","SELLADORES","MADETEC","unidad",6,6],
[14,"ESTANTE E","PINTULACA","PINTUCO","unidad",4,2],
[14,"ESTANTE E","PINTULACA","PINTUCO","unidad",1,2],
[14,"ESTANTE E","PINTULACA","PINTUCO","unidad",5,2],
[14,"ESTANTE E","PINTURA","VINILTEX","unidad",2,4],
[14,"ESTANTE E","DISOLVENTE (TINNER)","","unidad",4,3],
[14,"ESTANTE E","EPOXI-POLIAMIDA","PINTUCO","unidad",2,3],
[14,"ESTANTE E","EPOXI-POLIAMIDA","PINTUCO","unidad",1,1],
[14,"General","ESMALTE","PINTUCO","unidad",0,0],
[14,"ESTANTE E","EPOXI-POLIAMIDA","PINTUCO","unidad",1,3],
[14,"ESTANTE E","CORROTEC","PINTUCO","unidad",1,3],
[14,"ESTANTE E","PINTURA","PINTUCO","unidad",1,3],
[14,"ESTANTE E","PINTURA","PINTULUX","unidad",5,5],
[14,"ESTANTE E","PINTURA","VINILTEX","unidad",1,3],
[14,"ESTANTE E","CATALIZADOR AL ACIDO","PINTUCO","unidad",1,2],
[14,"ESTANTE E","ACROLATEX","PINTUCO","unidad",1,2],
[14,"ESTANTE E","CORROTEC DE ALTA TEMPERATURA","","unidad",1,2],
[14,"ESTANTE E","PINTUTRAFICO","PINTUCO","unidad",1,3],
[14,"ESTANTE E","PINTULUX","PINTUCO","unidad",1,2],
[14,"ESTANTE E","PINTUTRAFICO","PINTUCO","unidad",4,2],
[14,"ESTANTE E","PINTUTRAFICO","PINTUCO","unidad",1,2],
[14,"ESTANTE E","PINTURA","PINTUCO","unidad",1,2],
[14,"ESTANTE E","LACAS AUTOMOTIVAS","","unidad",1,2],
[14,"ESTANTE E","SUPERLACA","PRIME","unidad",0,2],
[14,"ESTANTE E","OVERLAC SELLADOR","PRIME OVERLAC","unidad",0,2],
[14,"ESTANTE E","MONTONATURE","","unidad",4,6],
[14,"BODEGA 3","KORAZA BLANCO","","unidad",4,0],
[14,"BODEGA 2","KORAZA BLANCO","PINTUCO","unidad",2,3],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",7,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",7,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",3,3],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",2,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",3,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",3,4],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",3,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[14,"BODEGA2","PINTURA","PINTU COAT","unidad",2,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[14,"BODEGA 2","PINTURA","PINTULUX","unidad",3,1],
[14,"BODEGA 2","PINTURA B89","PINTULUX","unidad",1,2],
[14,"BODEGA 3","PINTURA","PINTULUX","unidad",2,2],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",5,5],
[14,"BODEGA 3","PINTURA","VINILTEX","unidad",0,0],
[14,"BODEGA 2","PINTURA","VINILTEX","unidad",11,5],
[14,"General","PINTURA","VINILTEX","unidad",5,5],
[14,"General","KORAZA BLANCO","VINILTEX","unidad",3,0],
[14,"BODEGA 3","CUNETE MASTIQUE","","unidad",3,0],
[14,"ESTANTE F","CATALIZADOR PARA POLIURETANO","","unidad",13,16],
[14,"General","CATALIZADOR 13227 EPOXICO","","unidad",0,0],
[14,"ESTANTE F","TINER AUTOMOTRIZ","","unidad",7,10],
[14,"ESTANTE F","VARSOL","","unidad",5,7],
[14,"ESTANTE E","CUBRERASGUNOS","","unidad",2,5],
[14,"ESTANTE E","ALCOHOL ETILICO","","unidad",0,3],
[14,"ESTANTE E","HTH","SUPER ALGAGUARD 101","unidad",1,2],
[14,"ESTANTE E","LIMPIADOR PARA FACHADA","","unidad",1,2],
[14,"ESTANTE E","ANTIMICROBIANO HOSPITALARIO","","unidad",1,2],
[14,"General","RSPA JUNTA","","unidad",3,0],
[14,"ESTANTE E","CLARIFICADOR DE AGUA","CLORIDEX","unidad",1,2],
[14,"ESTANTE E","RODILLO","","unidad",31,30],
[14,"ESTANTE E","RODILLO","","unidad",11,30],
[14,"General","RODILLO","","unidad",0,0],
[14,"General","RODILLO","","unidad",15,0],
[14,"ESTANTE E","RODILLO","TERMO 40 \"TRICOLOR\"","unidad",14,30],
[14,"General","RODILLO","PINTUCO","unidad",12,5],
[14,"ESTANTE E","RODILLO","GOYA","unidad",0,10],
[14,"ESTANTE E","ESPATULA METALICA","GOYA","unidad",1,3],
[14,"ESTANTE E","ESPATULA","GOYA","unidad",7,10],
[14,"ESTANTE E","ESPATULA","GOYA","unidad",8,5],
[14,"ESTANTE E","ESPATULA PARA ENMASILLAR","","unidad",2,1],
[14,"ESTANTE E","ESPATULA PARA ENMASILLAR","","unidad",0,1],
[14,"ESTANTE E","ESPATULA METALICA","","unidad",5,5],
[14,"ESTANTE E","ESPATULA PLASTICA","PACK POR 5","unidad",8,5],
[14,"General","ESPATULA PLASTICA","","unidad",0,0],
[14,"ESTANTE E","BROCHA","BRUSH","unidad",20,10],
[14,"ESTANTE E","BROCHA","GOYA","unidad",12,10],
[14,"ESTANTE E","BROCHA","GOYA","unidad",0,0],
[14,"ESTANTE E","BROCHA","GOYA","unidad",15,10],
[14,"ESTANTE E","SERRUCHO DRYWALL","","unidad",4,1],
[14,"ESTANTE E","BANDEJA PARA PINTURA","PINTUCO","unidad",0,1],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",15,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",30,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",41,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",24,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",39,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",116,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",15,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",25,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",56,10],
[14,"ESTANTE E","LIJA","ABRACOL","unidad",25,10],
[14,"General","MASILLA","POLIESTER","unidad",0,0],
[14,"ESTANTE E","SUPERMASTCK MASILLA","SIKA","unidad",5,2],
[14,"ESTANTE E","BOQUILLA LATEX","CON COLOR","unidad",5,2],
[14,"ESTANTE E","PU MONTAJE","AFIX","unidad",10,5],
[14,"ESTANTE E","SILICONA ACETICO","AFIX","unidad",7,5],
[14,"ESTANTE E","ESPUMA ESPANSIVA","SIKA","unidad",7,5],
[14,"ESTANTE E","SILICONA","CORNETA","unidad",0,0],
[14,"ESTANTE E","SILICONA ACETICO","AFIX","unidad",7,5],
[14,"ESTANTE E","UNION H PVC","","unidad",17,0],
[14,"ESTANTE E","VIGUETA","MT CAL 26","unidad",15,15],
[14,"ESTANTE E","CANAL BASE 6","MT CAL 26","unidad",15,15],
[14,"ESTANTE E","PARAL BASE 6","MT CAL 26","unidad",15,15],
[14,"ESTANTE E","CINTA ENMASCARAR","CELLUX","unidad",16,5],
[14,"ESTANTE E","CINTA ENMASCARAR","CELLUX","unidad",19,15],
[14,"General","CINTA ENMASCARAR","","unidad",25,20],
[14,"General","CINTA DE MALLA","","unidad",0,0],
[14,"General","CINTA RUBATEX FOAM","","unidad",0,0],
[14,"General","CINTA DOBLE FAZ ESPUMAMULTIPACK","","unidad",0,5],
[14,"ESTANTE E","LAMINAS","SUPERBOARD","unidad",5,10],
[14,"ESTANTE E","PROTECTOR DE SILICONA PARA ESPEJO BUMPON ADHESIVOMULTIUSOS 16","FIXSER","unidad",55,100],
[14,"ESTANTE E","PROTECTOR DE SILICONA PARA ESPEJO BUMPON ADHESIVOMULTIUSOS 1","FIXSER","unidad",45,100],
[14,"ESTANTE E","PROTECTOR DE SILICONA PARA ESPEJO BUMPON ADHESIVOMULTIUSOS 9MM (PKT X 48 UNIT)","FIXSER","unidad",66,100],
[14,"ESTANTE E","ADHESIVO 2KL","SIKADUR 31","unidad",1,1],
[14,"ESTANTE E","TINER (DISOLVENTE)","(X GALON)","unidad",3,5],
[14,"ESTANTE E","SIKAFLEX 1A PLUS X 300 CC","SIKAFLEX","unidad",1,0],
[14,"ESTANTE E","SIKAFLEX 1A PLUS X 300 CC","SIKAFLEX","unidad",0,0],
[14,"ESTANTE E","SIKAFLEX 1A PLUS X 300 CC","SIKAFLEX","unidad",5,0],
[14,"ESTANTE E","SILICONA","SIKASIL","unidad",7,0],
[14,"General","CINTA RUBATEX FOAM","","unidad",0,0],
[14,"General","CINTA FOIL ALUMINIO 25MX50MM","","unidad",5,0],
[14,"ESTANTE E","CINTA MULTIUSOS","","unidad",3,0],
[14,"ESTANTE E","CINTA 33 3M","SCOTCH","unidad",8,0],
[14,"ESTANTE E","CINTA 23 3M","SCOTCH","unidad",10,0],
[14,"General","CINTA ADHESIVA DE MARCACION AMARILLO Y NEGRO","X33 MTS","unidad",3,0],
[14,"ESTANTE E","CEPILLO DE ACERO M/P","TRUPERTOOLCRAFT","unidad",1,0],
[14,"ESTANTE E","VINILTEX PREP(B.PASTEL) NE206-P CAMPANILLA CAMPANILLA","","unidad",2,0],
[14,"ESTANTE E","SUMINISTRO PIVOTE DE PISO","","unidad",3,0],
[14,"ESTANTE E","RESINA POLIESTER PREACELERADA X 1KILO PARA FIBRA DE VIDRIO","","unidad",1,0],
[14,"ESTANTE E","BARNIZ CRYSTAL CELAR 9400","PINTUCO","unidad",1,1],
[14,"General","BALDE GRANDE DE CONSTRUCCION","","unidad",2,2],
[14,"General","CANALETA 40X40MM C/AD S/DIV 2M","","unidad",0,0],
[14,"General","CANALETA PLASTICA 20X12MM SIN ADHESIVO SIN DIVISION","","unidad",0,0],
[14,"General","CANALETA PARA PISO GRIS 60X13MM CON ADHESIVO","","unidad",0,0],
[14,"General","CANALETA 20X20MM C/AD S/DIV","","unidad",0,0],
[14,"General","LAMINAS","SUPERBOARD","unidad",12,0],
[14,"General","PARAL BASE 6 PULGADAS","","unidad",10,0],
[14,"General","CANALES PARA DRYWALL","","unidad",10,0],
[14,"General","PEGANTE PL285","AFIX","unidad",1,1],
[14,"General","SELLANTE ACRILICO","AFIX","unidad",10,5],
[14,"General","MASILL POLESTER","","unidad",0,0],
[14,"General","AFIX PU","AFIX","unidad",10,10],
[14,"General","AFIX PEGADIT","AFIX","unidad",5,0],
[14,"General","SILICONA","SIKA FLEX","unidad",18,10],
[14,"General","SUMA GRILL(DIVERSEY)","","unidad",0,0],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","1","SPZ-1727","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","2","SPZ-787","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","3","SPZ-1337 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","4","SPZ-1047 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","5","SPZ-987 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","6","SPA-2360 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","7","SPZ-1140 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","8","SPA-1932 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","9","SPA-1837 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","10","SPA-1732 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","11","SPZ-2332 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","12","AC-1103 SPZ-2087","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","13","SPZ-1957 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","14","SPZ-1737 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","15","SPZ-1080 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","16","SPZ-1120 LW","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","17","SPZ-1137","unidad",0,6],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","18","A55","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","19","B-56","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","20","B-66","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","21","B-96","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","22","B-98","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","23","B-100","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","24","B-105","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","25","B-115","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","26","B-135","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","27","BX-59","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","28","BX-75","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","29","BX-85","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","30","BX-77","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","31","SPZ- 1047 LW","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","32","SPB2990","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","33","XPA1932","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","34","XPA1030","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","35","XPZ1340","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","36","PJ1663","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","37","PJ2489","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","38","3VX-750","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","39","3V-530","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","40","3V-560","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","41","M-41","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","42","655-J","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","43","980J","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","44","1915","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","45","908J","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","46","A31","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","47","SPB-2840","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","48","SPZ-812","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","49","B-16","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","50","BX-66","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","51","SPZ-1837","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","52","SPZ-1024 LW","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","53","SPA-1357 LW","unidad",0,4],
[15,"PARTE SUPERIOR DE LAS ESTANTERIAS","54","SPZ 1787 LW","unidad",0,4],
[16,"General","CILINDRO DE ALTA SEGURIDAD","","UNIDAD",2,1],
[16,"General","BISAGRA DE PRESION 4''","","UNIDAD",7,4],
[16,"General","BISAGRA PARCHE SEMIPLANA 95^","","UNIDAD",14,4],
[16,"General","BISAGRA 3X3 3\"","","UNIDAD",19,4],
[16,"General","BISAGRA 2\"","","UNIDAD",2,2],
[16,"ESTAN D3","BISAGRA CIERRRE LENTO (MADERA)","","UNIDAD",23,10],
[16,"General","PASADORES 2\"","","UNIDAD",3,1],
[16,"General","CERRADURA PARA BUZON","","UNIDAD",6,4],
[16,"General","MANIJAS 6\"","","UNIDAD",3,2],
[16,"General","MANIJAS 4\"","","UNIDAD",3,2],
[16,"General","BISAGRA OMEGAS O NIQUELADAS 3X3","","UNIDAD",4,2],
[16,"ESTAN C2","CERRADURA DE EMBUTIR","","unidad",2,2],
[16,"General","MANIJA ALETA REDONDA (GRIFERIA)","","UNIDAD",3,2],
[16,"General","MANIJAS PARA PUERTAS","","UNIDAD",5,2],
[16,"ESTAN C2","PICAPORTE (PASAPORTE)","","UNIDAD",9,4],
[16,"General","CERRADURA CON LLAVE CILINDRICA Y MANIGUETA (FIXER MANIJA ALCOBA)","","UNIDAD",2,6],
[16,"General","CERRADURA CON LLAVE CILINDRICA Y MANIGUETA (YALE MANIJAENTRADA)","","UNIDAD",2,5],
[16,"General","CERRADURA PARA GAVETAS","","UNIDAD",5,0],
[16,"ESTAN C2","TOPE MEDIA LUNA","","UNIDAD",58,10],
[16,"General","BOXER","","UNIDAD",0,1],
[16,"General","CERRADURA PARA MUEBLES (CROMADA) REF.1550","","UNIDAD",3,9],
[16,"General","MANIJA AUSTIN CON MANUBRIO","","UNIDAD",7,7],
[16,"General","GATO HIDRAULICO","","UNIDAD",5,5],
[16,"General","CERRADURA CILINDRICA CON LLAVE","","UNIDAD",4,7],
[16,"General","SEGUETA NICHOLSON","","UNIDAD",5,10],
[16,"General","CUCHILLA PARA EXACTO FORTE - TRUPER","","(1 PACQ)",1,10],
[16,"General","BROCA LAMINA 3/16","","UNIDAD",5,3],
[16,"General","REMACHE 6-6 ( 3/16X 1/2)","","UNIDAD",35,25],
[16,"General","LLANA DE ACERO INOX (120X270)","","UNIDAD",5,6],
[16,"General","TORNILLO DRYWALL 1\" (LAMINA)","","UNIDAD",50,50],
[16,"General","TORNILLO DRYWALL 3\"","","UNIDAD",45,50],
[16,"General","PUNTA DESTORNILLADOR 2\"","","UNIDAD",0,5],
[16,"General","LLAVE PARA CARRITO","","UNIDAD",1,1],
[16,"General","CIELO RAZO CORNIZA DE PVC 2.90 MT COLOR BLANCO","","UNIDAD",15,6],
[16,"General","CIELO RAZO TIVOLI PVC 3.48 M2 290X30CM 7MM BLANCO","","UNIDAD",0,2],
[16,"General","PERFILUNION ANGULAR PVC 10MM X5MTS","","UNIDAD",7,3],
[16,"General","CIELO RASO TEE BLANCA 3M 18 MM X 23MM ALUMINIO","","UNIDAD",2,5],
[16,"General","BISAGRAS DE PUERTA SATEN DE 4,5\"","","UNIDAD",5,6],
[16,"General","BISAGRA DE CIERRE AUTOMATICO DE 3,5","","UNIDAD",5,6],
[16,"General","GANCHO PARA CORTINA (X 30)","","UNIDAD",60,20],
[16,"General","CERRADURA CON CIERRE 801","","UNIDAD",4,5],
[16,"General","CERRADURA DE ALTA SEGURIDAD","","UNIDAD",-2,1],
[16,"General","CERRADURA MANIJA ALCOBA","","UNIDAD",-1,1],
[16,"General","CERRADURA MUEBLE SERIE 2044","","UNIDAD",0,6],
[16,"General","SQUARE RUBBER CHAIRLEG CAPS","","UNIDAD",12,6],
[16,"General","MANIJA BARI ENTP US15 B  LEVERSET","","UNIDAD",1,1],
[16,"General","JUEGO DE LLAVES TORX DE SEGURIDAD TIPO NAVAJA","","UNIDAD",0,0],
[16,"General","PEGANTE BOXER GL 400","","UNIDAD",0,0],
[16,"General","PASADOR DORADO DE 4","","UNIDAD",13,13],
[16,"General","CERRADURA DE SEGURIDAD DE 2-3/4''{70MM}","","UNIDAD",0,0],
[17,"General","VENTILADORES (USADOS PARA REPUESTO)","","unidad",14,0],
[17,"General","EVAPORADOR DE TRANE (NUEVO)","","unidad",1,0],
[17,"General","VALVULAS DE MANEJADORAS (AC/DC 24V 50/60 HZ) + ACCESORIOS","BELIMO AFRX24-MFT","unidad",13,20],
[17,"General","ANGULOS DE 1.1/2*1.1/2*6MTS DE LARGO","","unidad",8,8],
[17,"General","TUBOS 1.1/2*1.1/2 MTS DE LARGO","","unidad",6,6],
[17,"General","ANGULOS EN T","","unidad",7,7],
[17,"General","ANGULOS ESQUINEROS","","unidad",73,40],
[17,"General","TUBOS  EN ACERO INOX","","unidad",8,0],
[17,"BODEGA 3","TUBOS CPVC1/2","","unidad",18,10],
[17,"BODEGA 3","TUBOS CPVC X 3","","unidad",6,2],
[17,"BODEGA 3","TUBOS CPVC X METRO DE 3/4","","unidad",10,0],
[17,"BODEGA 3","TUBERIA DE COBRE RIGIDA 3/8 TIPO L X3 MTS","","unidad",7,0],
[17,"BODEGA 3","TUBERIA DE COBRE RIGIDA 5/8 TIPO L X3 MTS","","unidad",7,0],
[17,"BODEGA 3","TUBOS DE CPVC DE 1''","","unidad",5,0],
[17,"BODEGA 3","CEMENTO BLACNCO 25K","","unidad",2,2],
[17,"BODEGA 3","ARENA","","unidad",5,5],
[18,"ESTANF4","BISAGRA","DE PRSION","unidad",25,15],
[18,"ESTANF4","BISAGRA NORMAL","DE PRSION 4''","unidad",4,15],
[18,"ESTANF4","BISAGRA","DE PRESION 4''","unidad",3,15],
[18,"ESTANF4","BISAGRA","OMEGA ZINCADA-3''","unidad",5,15],
[18,"ESTANF4","BISAGRA DE PUERTA","TIPO OMEGA ZINCADA","unidad",2,15],
[18,"ESTANF4","BISAGRA","MINI OMEGA2''","unidad",6,15],
[18,"ESTANF4","BISAGRA DE BRAZO NEUMATICO","247MM","unidad",2,10],
[18,"ESTANF4","BISAGRA","CIERRE LENTO","unidad",6,15],
[18,"ESTANF3","BISAGRA DE CAZDETA","CIERRE SUAVE","unidad",4,10],
[18,"ESTANF4","BISAGRA OMEGA EN ACERO INOX","QBAOMEG","unidad",7,15],
[18,"ESTANF3","BISAGRA DOBLE ACCION","3''","unidad",2,10],
[18,"ESTANTF4","BISAGRA","4X3","unidad",4,5],
[18,"ESTANF4","TOPES DE RESORTE PARA PUERTA","","unidad",0,10],
[18,"ESTANF4","TOPES DE ANTICHOQUES PRA PUERTAS X2","COLOR BLANCO","unidad",3,10],
[18,"ESTANF4","KIT DE PIELTROS ADHESIVOS PARA SALA Y COMEDOR X34","FIXSER","unidad",2,2],
[18,"ESTANF4","ADHESIVO ANTIDESLIZANTE","1.8CMX 20 UNIDADES","unidad",4,6],
[18,"ESTANF4","ADHESIVO TOPE PROTECTOR TRANSPARENTE","9MM","unidad",6,5],
[18,"ESTANF4","ADHESIVO TOPE PROTECTOR","12MM","unidad",0,5],
[18,"ESTANF4","ADHESIVO TOPE PROTECTOR","1.6CM","unidad",4,5],
[18,"ESTANF4","PASADOR UYUSTOOLS 2\"","DORADA 2\"","unidad",15,5],
[18,"ESTANF4","CIERRE DE RRODILLOS CON TORNILLOS","MARRON","unidad",7,5],
[18,"ESTANF4","RASPADOR DE JUNTA CON DOS CUCHILLA","","unidad",7,5],
[18,"ESTANF4","LLAVES CILINDRICA","","unidad",2,3],
[18,"ESTANF3","LLAVES CILINDRICA DE ALTA SEGURIDAD","EKL-C1100","unidad",1,5],
[18,"ESTANF4","MINI MANIJA DE PUERTA EN ACERO INOX","","unidad",6,5],
[18,"ESTANF4","MANIJA EN ACERO INOX","MEDIANA","unidad",5,50],
[18,"ESTANF4","MANIJA EN ACERO INOX","GRANDE","unidad",9,5],
[18,"ESTANF4","MANIJAS PARA PUETTAS CORREDISA","","unidad",18,10],
[18,"ESTANF3","MANIJA AUSTIN","","unidad",3,5],
[18,"ESTANF3","MANIJA DE PUERTAS EXTERIOR","GRIS","unidad",1,5],
[18,"ESTANF4","GANCHOS PARA CORTINAS","","unidad",63,40],
[18,"ESTANF4","RODACHINAS","BLANCOS","unidad",95,50],
[18,"ESTANF4","RIEL DE CORTINAS","","unidad",85,50],
[18,"ESTANF4","GANCHOS PLASTICOS AJUSTABLE PARA CORTINA","","unidad",29,15],
[18,"ESTANF4","SOPORTE DE MONTAJE PARA RIEL DE CORTINA","","unidad",40,20],
[18,"ESTANF4","RUEDAS GARILES UNIFORME","","unidad",9,5],
[18,"ESTANF4","CERRADURA DE RESIDENCIA","","unidad",1,5],
[18,"ESTANF3","CIERRAPUERTAS AEREO","1002","unidad",2,4],
[18,"ESTANF3","CIERRAPUERTA AREO","2234","unidad",0,5],
[18,"ESTANF3","CERRADURA DE ALTA SEGURIDAD","","unidad",1,5],
[18,"ESTANF3","CERRADURA UNIVERSAL","TK-901","unidad",3,5],
[18,"ESTANF3","CERRADURA DE GAVETAS","","unidad",2,5],
[18,"ESTANF3","CERRADURA DE EMBUTIR CILINDRICA","854","unidad",1,5],
[18,"ESTANF3","CERRADURA  DE INCRUSTAR","TIPO PICO LORO","unidad",1,5],
[18,"ESTANF3","CERRADURA DE INCRUSTAR CON CILINDRO DE ALTA SEGURIDAD","CO 4 BULONES Y LLAVE Y BOCA LLAVES","unidad",2,5],
[18,"ESTANF3","CERRADURA","F60700LOCK","unidad",3,5],
[18,"ESTANF3","LLAVE DE BAJO","","unidad",6,6],
[18,"ESTANF3","OJO MAGICO PARA PUERTAS","","unidad",2,5],
[18,"ESTANF3","PASADOR UYUSTOOLS 4\"","FR-PIP104-DORADO 4''","unidad",15,5],
[18,"ESTANF3","PASADOR","2''","unidad",1,5],
[18,"ESTANF3","MINI PESTILLO PARA ARMARIO O GABINETE","","unidad",18,10],
[18,"ESTANF3","TOPE DE PURTAS MAGNETICO EN ACERO INOX","","unidad",3,5],
[18,"ESTANF3","TAPA PARA BISAGRA","","unidad",5,4],
[18,"ESTANF3","TOPES MEDIA LUNA EN ACERO INOX","","unidad",74,50],
[18,"ESTANF3","PICA PUERTAS PARA PUERTAS","","unidad",23,20],
[19,"ESTAN B1","FUSIBLE ALTA TENCION","SIBA","UNIDAD",3,1],
[19,"ESTAN B1","FUSIBLE ALTA TENCION","SIBA","UNIDAD",11,1],
[19,"ESTAN B1","FUSIBLE ALTA TENCION","SIBA","UNIDAD",3,1],
[19,"ESTAN B1","FUSIBLE ALTA TENCION","SIBA","UNIDAD",0,1],
[19,"ESTAN B1","FUSIBLE DE EXPULSION","SIBA","UNIDAD",1,1],
[19,"ESTAN B1","TOTALIZADOR","","UNIDAD",1,1],
[19,"ESTAN B1","TOTALIZADOR","","UNIDAD",2,1],
[19,"ESTAN B1","TOTALIZADOR","","UNIDAD",1,1],
[19,"ESTAN B1","TOTALIZADOR","","UNIDAD",1,1],
[19,"ESTAN B2","INTERUPTOR  DE COMBINACION DOBLE","LEVINTON","UNIDAD",14,3],
[19,"ESTAN B2","INTERUPTOR DE TRES","LEVINTON","UNIDAD",10,10],
[19,"ESTANTE B2","INTERRUPTOR CONMUTABLE SENCILLO","LEVINTON","IUNIDAD",15,5],
[19,"ESTAN B2","INTERUPTOR DE.UNO","LEVENTON","UNIDAD",10,5],
[19,"ESTAN B2","INTERUPTOR DE LUZ DE DOBLE PALANCA","LEVINTON","UNIDAD",8,5],
[19,"ESTAN B2","INTERUPTOR","LUTRON","UNIDAD",1,6],
[19,"ESTAN B2","INTERUPTOR BARRA DE LUZ TOQUE","LUTRON","UNIDAD",1,3],
[19,"ESTAN B2","TOMA CORIENTE DUPLEX","LUTRON","UNIDAD",4,3],
[19,"ESTANB2","ADAPTADOR DE CORIENTE ALTERNA","","UNIDAD",3,3],
[19,"ESTAN B2","PULSADOR SENSILLO","MERCURY","UNIDAD",0,3],
[19,"ESTAN B2","PORTA FUSIBLE","","UNIDAD",0,2],
[19,"ESTAN B3","CAJA FUNDIDA DE 5 HUECOS","","UNIDAD",16,2],
[19,"ESTAN B3","CAJA FUNDIDA DE 3 HUECOS","","UNIDAD",11,2],
[19,"ESTAN B3","CAJA OCTAGONAL REDONDA DE 5 HUECOS","","UNIDAD",8,2],
[19,"ESTAN B3","CAJA ELECTRICA  CUADRADA","","UNIDAD",22,1],
[19,"ESTAN B3","CAJA ELECTRICA  CUADRADA","","UNIDAD",4,1],
[19,"ESTAN B3","CAJA ELECTRICA OCTAGONAL REDONDA","","UNIDAD",10,1],
[19,"ESTAN B3","CAJA ELECTRICA CUADRADA","","UNIDAD",3,1],
[19,"ESTANTB4","CAJA ELECRTICA","DEXSON","UNIDAD",8,15],
[19,"ESTAN B3","CAJA ELECTRICA","","UNIDAD",8,1],
[19,"ESTANB5","CAJA HERMETICA","HALUX","UNIDAD",8,5],
[19,"ESTANB5","CAJA ELECTRICA","HALUX","UNIDAD",2,5],
[19,"ESTANB5","CAJA DE PASO","HALUX","UNIDAD",2,5],
[19,"ESTANB5","CAJA DE TOMA USUARIO","HALUX","UNIDAD",1,5],
[19,"ESTANB5","CAJA ELECTRICA","HALUX","UNIDAD",2,3],
[19,"ESTAN B3","TOMA CORIENTE DE SEGURIDAD","LEVINTON","UNIDAD",2,1],
[19,"ESTAN B3","TOMA CORIENTE[RECEPTACULO]","LEVINTON","UNIDAD",4,1],
[19,"ESTAN B3","TOMA ELECTRICO[RECEPTACULO]","LEVINTON","UNIDAD",5,1],
[19,"ESTAN B3","CLAVIJA MACHO","LEVINTON","UNIDAD",3,10],
[19,"ESTAN B3","CLAVIJA TRIFASICA CAUCHO","LEVINTON","UNIDAD",2,10],
[19,"ESTANB4","TOMA CORIENTE SENSILLO","LEVINTON","UNIDAD",8,10],
[19,"ESTANB4","TOMA CORIENTE DOBLE","LEVINTON","UNIDAD",8,10],
[19,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",14,10],
[19,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",2,10],
[19,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",6,10],
[19,"ESTANB4","TOMA CORIENTE","LEVINTON","UNIDAD",4,10],
[19,"ESTANB4","TOMA CORIENTE","LEGRAND","UNIDAD",12,10],
[19,"ESTANB4","CLAVIJA","LEVINTON","UNIDAD",4,10],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",12,2],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",1,10],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",1,10],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",4,2],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",4,2],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",0,2],
[19,"ESTANB4","CLAVIJA","LEVINTON","UNIDAD",2,10],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",3,12],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",3,12],
[19,"ESTAN B4","CLAVIJA","LEVINTON","UNIDAD",0,6],
[19,"ESTANB2","CLAVIJA  DE CAUCHO","","UNIDAD",17,10],
[19,"ESTAN B4","CONECTORES","LEVINTON","UNIDAD",2,10],
[19,"ESTAN B4","CONECTORES","LEVINTON","UNIDAD",2,10],
[19,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",3,10],
[19,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",0,15],
[19,"ESTANB4","CONECTORES","LEVINTON","UNIDAD",-1,10],
[19,"ESTANB4","TAPA ELECTRICA DE TOMA CORIENTE","LEVINTON","UNIDAD",62,15],
[19,"ESTANB4","TAPA CIEGA","LEVINTON","UNIDAD",72,15],
[19,"ESTANB4","TAPACIEGA","LEVINTON","UNIDAD",43,6],
[19,"ESTANB4","TAPA CIEGA","LEVINTON","UNIDAD",7,10],
[19,"ESTANB4","TAPA ELECTRICA","LEVINTON","UNIDAD",10,10],
[19,"ESTANB4","ADAPTADOR DE ENCHUFE","LEVINTON","UNIDAD",13,15],
[19,"ESTANB4","FUSILES MODULAR","","UNIDAD",1,10],
[19,"ESTANB4","AUXILIARES SIEMEN","","UNIDAD",3,15],
[19,"ESTANB4","CONTROL REMOTO","LUTRON","UNIDAD",19,10],
[19,"ESTANB4","MODULO DE RELES","LUTRON","UNIDAD",9,5],
[19,"ESTANb4","PLACA DE PARED","LUTRON","UNIDAD",20,5],
[19,"ESTANB4","PLACA DE PARED","LUTRON","UNIDAD",53,15],
[19,"ESTANB4","PLACA DE PARED","LUTRON","UNIDAD",27,10],
[19,"ESTANB4","REVELO 8 OINES","","UNIDAD",4,10],
[19,"ESTANB4","TAPAS LEVINTON DE HABITACIONES NUEVA","LEVINTON","UNIDAD",26,5],
[19,"ESTANB4","TAPA DE 1 HUECO HABITACION NUEVA","LEVINTON","UNIDAD",39,15],
[19,"ESTANB4","TAPA PARA TOMA CORIENTE DUPLEX[DOBLE]","LEVINTON","UNIDAD",8,10],
[19,"ESTANB4","TAPAS SYS[SOCKETS-Y-SUICHES]","LEVINTON","UNIDAD",30,10],
[19,"ESTANB4","TAPAS TRADEMASTER","LEVINTON","UNIDAD",1,10],
[19,"ESTANB4","TAPAS PARA CORIENTE DOBLE CON POLO ATIERRA AISLADO","LEVINTON","UNIDAD",10,5],
[19,"ESTANB4","PATA DUPLEX ESTANDAR LEVINTON 80703-ORG","LEVINTON","UNIDAD",11,10],
[19,"ESTANB4","TAPA CIEGA PARA CONEXIONES ELECTRICAS","LEVINTON","UNIDAD",2,5],
[19,"ESTANB4","TAPA DE INTERUPTOR DE LUZ LEVINTON","LEVINTON","UNIDAD",8,10],
[19,"ESTANB4","TAPAFRONTAL DE UNA SOLA BANDA CO 2 PUERTO","LEVINTON","UNIDAD",2,15],
[19,"ESTANB4","TAPA[ O PLACA]PARA CONECTIVIDAD CON 2 PUERTO PARA MODULO TIPO KEYSTONE","LEVINTON","INIDAD",3,10],
[19,"ESTANB4","BORNA SCRW50U CONNECTECH","LEVINTON","UNIDAD",6,10],
[19,"ESTANB4","CONTACT CLEANER ELECTRICO QD 16 OZ NACIONAL","LEVINTON","UNIDAD",5,6],
[19,"ESTANC1","SENSOR","","UNIDAD",1,5],
[19,"ESTANTC1","SENSO R","","UNIDAD",2,5],
[19,"ESTANC1","RADIO","","UNIDAD",2,4],
[19,"ESTANC1","PEGA TRAP","","UNIDAD",13,5],
[19,"ESTANC1","FUENTES","","UNIDAD",79,12],
[19,"ESTANB2","PORTA LAMPARA","","UNIDAD",4,10],
[19,"ESTANB2","PORTA LAMPARA","","UNIDAD",10,15],
[19,"ESTANB5","REGULADOR ELECTRICO","","UNIDAD",4,10],
[19,"ESTANB5","TECLADO","LUTRON","UNIDAD",5,5],
[19,"ESTANB5","SENSOR","","UNIDAD",4,5],
[19,"ESTANB5","SENSOR","LUTRON","UNIDAD",2,5],
[19,"ESTANB5","MODULO","LUTRON","UNIDAD",2,5],
[19,"ESTANB5","RADIO","","UNIDAD",9,5],
[19,"ESTANB5","REGULADOR","","UNIDAD",1,4],
[19,"ESTANC3","TRANSFORMADOR","","UNIDAD",5,4],
[19,"ESTANB5","TRANSFORMADOR","","UNIDAD",36,10],
[19,"ESTAND3","BREKERBIFASICO","HYUNDAI","UNIDAD",20,15],
[19,"ESTAND3","BREKER MONO FASICO","HYUNDAI","UNIDAD",9,15],
[19,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",2,15],
[19,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",3,15],
[19,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",2,15],
[19,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",9,15],
[19,"ESTAND3","BREKER  TRIFASICO","HYUNDAI","UNIDAD",1,10],
[19,"ESTAND3","BREKER BIFASICO","HYUNDAI","UNIDAD",9,15],
[19,"ESTAND3","BREKER MONO FASICO","HYUNDAI","UNIDAD",0,10],
[19,"ESTAND3","BREKER MONO FASICO","SQUARE","UNIDAD",15,10],
[19,"ESTANTD3","BREKER MONO FASICO","VECAS","UNIDAD",1,10],
[19,"ESTAND3","BREKER MONO FASICO","LUMEK","UNIDAD",7,5],
[19,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",2,5],
[19,"ESTAND3","BREKER MONO FASICO","LEGRAND","UNIDAD",3,5],
[19,"ESTAND3","BREKER MONO FASICO","LEGRAND","UNIDAD",1,10],
[19,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",3,5],
[19,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",20,10],
[19,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",1,10],
[19,"ESTAND3","BREKER BIFASICO","LEGRAND","UNIDAD",2,15],
[19,"ESTAND3","BREKER TRIFASICO","LEGRAND","UNIDAD",1,10],
[19,"ESTAD3","BREKER TRIFASICO","","UNIDAD",13,10],
[19,"ESTAND3","BREKER TRIFASICO","LUMEK","UNIDAD",0,1],
[19,"ESTAND3","BREKER TRIFASICO","LUMEK","UNIDAD",2,1],
[19,"ESTAND3","INTERUPTOR TERMO MAGNECTICO","","UNIDAD",10,15],
[19,"ESTAND3","INTERUPTOR MAGNECTICO","","UNIDAD",11,15],
[19,"ESTAND2","MANOMETRO","","UNIDAD",4,5],
[19,"ESTAND2","MANOMETRO","","UNIDAD",1,5],
[19,"ESTAND2","MANOMETRO","","UNIDAD",1,4],
[19,"ESTAND2","CONTROLADOR","","UNIDAD",1,3],
[19,"ESTAND2","LED DRIVER","","UNIDAD",1,3],
[19,"ESTAND2","FUENTE DE ALIMENTACION","SEKUR","UNIDAD",4,4],
[19,"ESTAND2","FUENTE DE ODER METALICA","","UNIDAD",5,5],
[19,"ESTAND2","SOCKET","","UNIDAD",97,80],
[19,"ESTAND2","GUAGO","","UNIDAD",23,80],
[19,"ESTAND2","GUAGO","","UNIDAD",43,80],
[19,"ESTAND2","CONECTOR","","UNIDAD",30,80],
[19,"ESTAND2","BOTON INDICADOR","","UNIDAD",20,15],
[19,"ESTAND2","BOTON INDICADOR","","UNIDAD",10,15],
[19,"ESTAND2","BOTON INDICADOR","","UNIDAD",10,15],
[19,"ESTAND2","BOTON INDICADOR","","UNIDAD",5,15],
[19,"ESTAND4","TOTALIZADOR TERMOMAGNECTICO","EASYPACT-EZC100B","UNIDAD",4,10],
[19,"ESTAND4","TOTALIZADPOR DE CAJA DE 3 PLOS","ABB","UNIDAD",2,5],
[19,"ESTAND4","TOTALIZADOR AUTMATICO","HYUNDAI","UNIDAD",1,4],
[19,"ESTAND4","TOTALIZADOR AUTOMATICO","HYUNDAI","UNIDAD",3,4],
[19,"ESTAND4","TOTALIZADOR 3 POLOS","SCHENEIDER","UNIDAD",1,4],
[19,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,4],
[19,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,4],
[19,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",9,10],
[19,"ESTAND4","TOTALIZADOR","ABB","UNIDAD",2,10],
[19,"ESTAND4","TOTALIZADOR","HYUNDAI","UNIDAD",1,10],
[19,"ESTAND4","TOTALIZADOR","HOME","UNIDAD",2,10],
[19,"ESTAND4","CONTACTOR","SIEMENS","UNIDAD",0,5],
[19,"ESTAND4","CONTACTOR DE3 POLOS","CHINT","UNIDAD",2,5],
[19,"ESTAND4","INTERUPTOR HORARIO DIGITAL","RELETEK","UNIDAD",2,4],
[19,"ESTAND4","PROGRAMADOR SEMANAL","","UNIDAD",1,4],
[19,"ESTAND4","CONTACTOR","SHENEIDER","UNIDAD",1,2],
[19,"ESTAND4","CONTACTOR","SHENEIDER","UNIDAD",1,2],
[19,"ESTAND4","CONTACTOR","PACKARD","UNIDAD",1,1],
[19,"ESTAND4","CONTACTOR","CHINT","UNIDAD",24,10],
[19,"ESTANTB1","LAMPARA","","UNIDAD",28,15],
[19,"ESTAND2","BATERIA","UNIVERSAL","UNIDAD",53,30],
[19,"ESTAND2","BATERIA DE BOTON DE LITIO","CR2430","UNIDAD",20,15],
[19,"ESTAND2","BATERIA DE BOTON DE LITIO","CR2032","UNIDAD",10,5],
[19,"ESTAND2","TERMOMETRO DIGITAL","PARTS","UNIDAD",1,15],
[19,"ESTAND2","BATERIA-AA","","UNIDAD",38,20],
[19,"ESTAND2","BATERIA-AAA","","UNIDAD",40,20],
[19,"ESTANF1","CABLE","VCP CONNECT +","METROS",200,20],
[19,"ESTANTED2","MINICONTACTOR","OPELCOM","UNIDAD",5,1],
[19,"ESTANTED3","MINICONTACTOR","OPELCOM","UNIDAD",4,1],
[19,"ESTANTED2","MINICONTACTOR","OPELCOM","UNIDAD",4,1],
[20,"ESTANTE P2","MONOMANDO DUCHA ALMURO","","unidad",1,2],
[20,"ESTANTE P2","VALVULA PARA DUCHA SENSILLA","","unidad",4,1],
[20,"ESTANTE P2","PORTARROLLO VERTICAL ADDSTORIS","","unidad",1,2],
[20,"ESTANTE P2","PORTARROLLO CON TAPA ADDSTORIS","","unidad",2,2],
[20,"ESTANTE P2","BRAZO REGADERA","","unidad",1,2],
[20,"ESTANTE P2","LLAVE PUSH","","unidad",4,2],
[20,"ESTANTE P2","GRIFERIA PLUMA(LAVAMANOS CONTROL)","","unidad",1,2],
[20,"ESTANTE P2","TELEDUCHA AGATA-ACABADO CROMADO(TIPO CHORRO LUVIA)","8X4 CM","unidad",2,2],
[20,"ESTANTE P3","CABEZAL DE HAVITACION NUEVA","","unidad",5,3],
[20,"ESTANTE P3","DUCHA TEL CROMETTA ECOSMT","","unidad",1,3],
[20,"ESTANTE P3","MEZCLADOR DE AGUA","","unidad",5,3],
[20,"ESTANTE P3","REGADERA REDONDA","22CM","unidad",2,3],
[20,"ESTANTE P3","DESAGUE PUSH METAL","","unidad",8,4],
[20,"ESTANTE P4","VALVULA DE LLENADO UNIVERSAL PLUS","","unidad",1,3],
[20,"ESTANTE P4","VALVULA DOBLE DE DESCARGA","","unidad",7,4],
[20,"ESTANTE P4","GRIFERIA DE TANQUE ALTA PLUS","26CM","unidad",2,3],
[20,"ESTANTE P4","REGULACION METALICA-MACHP-HEMBRA","","unidad",8,3],
[20,"ESTANTE P4","SOPORTE(PORTARROLLO DE PAPEL)","","unidad",18,10],
[20,"ESTANTE P4","DISPENSADOR DE JAVON","","unidad",2,3],
[20,"ESTANTE P4","GANCHO DOBLE","","unidad",87,30],
[20,"ESTANTE P5","ASIENTO SANITARIO (TAPA DE SANITARIO)","609461001","unidad",16,8],
[20,"ESTANTE Q3","REGILLA PARA LAVA PLATOS","ACERO INOX","unidad",10,4],
[20,"ESTANTE P2","DESAGUE PARA TINA TAPOM DRENAJE","1-1/2\" ROSCA GRUESA","unidad",9,4],
[20,"ESTANTE P2","CANASTILLA METALICA","4\"","unidad",5,3],
[20,"ESTANTE Q3","REJILLA DE DESAGUE","","unidad",45,15],
[20,"ESTANTEQ3","BRIDA ACOPLE SANITA","4\"","unidad",5,4],
[20,"ESTANTE Q3","SIFON BOTELLA GRIS","","unidad",10,4],
[20,"ESTANTE Q3","DESAGUE AUTON","","unidad",15,5],
[20,"ESTANTE R4","LAVAMANOS/LAVAPLATOS INOX","60CM-ROSCA 1/2\"X1/2\"","unidad",7,4],
[20,"ESTANTE Q4","BOTON DUAL REDONDO","","unidad",36,10],
[20,"ESTANTE Q4","VALVULA DE CONTROL PARA DUCHA","","unidad",12,5],
[20,"ESTANTE Q4","MANGUERA TELEDUCHA FLEXIBLE","LONG-1.6M","unidad",10,10],
[20,"ESTANTE R4","MANGUERS DE SAGUE COLOR BLANCO","PLATICO","unidad",13,5],
[20,"ESTANTE R4","MANGUERA UNIVERSAL PARA LAVADORA DIGITAL","MANGUERA-ENTRADA","unidad",12,10],
[20,"ESTANTEH2","MANGUERA TIPO RESORTE PARA COMPRESOR","5MTS","unidad",2,2],
[21,"BLOQUE AMARILLO","TINTE","MADETEC","unidad",0,1],
[21,"BLOQUE AMARILLO","TINTE","MADETEC","unidad",-1,1],
[21,"BLOQUE AMARILLO","TINTILLA","KOLOR","unidad",-1,1],
[21,"BLOQUE AMARILLO","TINTE","KOLOR","unidad",0,1],
[21,"BLOQUE AMARILLO","TINTILLA","RENANIA","unidad",0,1],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",3,4],
[21,"ESTANTE G2","AEROSOL ANTICORROSIVO","PINTUCO","unidad",0,5],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",8,5],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",2,2],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",3,10],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",5,10],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",5,2],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",3,4],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",2,5],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",7,4],
[21,"ESTANTE G2","AEROSOL","PINTUCO","unidad",5,5],
[21,"ESTANTE G2","AEROSOL","TESA","unidad",29,5],
[21,"ESTANTE G2","AEROSOL","3M","unidad",10,5],
[21,"BLOQUE AMARILLO","EPOXI-POLIAMIDA PEQUENO","PINTUCO","unidad",10,4],
[21,"BLOQUE AMARILLO","CATALIZADOR PINTURA","PINTUCO","unidad",12,5],
[21,"BLOQUE AMARILLO","CATALIZADOR","LINEA 35","unidad",0,2],
[21,"BLOQUE AMARILLO","CATALIZADOR SUPER LACA","","unidad",1,2],
[21,"BLOQUE AMARILLO","EPOXI-POLIAMIDA GRANDE","PINTUCO","unidad",3,2],
[21,"BLOQUE AMARILLO","ESMALTE","PINTULUX","unidad",3,2],
[21,"BLOQUE AMARILLO","ESMALTE POLIURETANO","","unidad",0,4],
[21,"BLOQUE AMARILLO","POLIURETANO","","unidad",2,0],
[21,"BLOQUE AMARILLO","PINTULACA","PINTUCO","unidad",1,1],
[21,"BLOQUE AMARILLO","PINTULACA","PINTUCO","unidad",2,6],
[21,"BLOQUE AMARILLO","PINTULACA","PINTUCO","unidad",4,2],
[21,"BLOQUE AMARILLO","PINTULACA","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","PINTULACA","PINTUCO","unidad",5,2],
[21,"BLOQUE AMARILLO","PINTURA","VINILTEX","unidad",2,4],
[21,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","PINTUCO","unidad",4,3],
[21,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","PINTUCO","unidad",2,1],
[21,"BLOQUE AMARILLO","ESMALTE","PINTUCO","unidad",2,0],
[21,"BLOQUE AMARILLO","EPOXI-POLIAMIDA","PINTUCO","unidad",1,3],
[21,"BLOQUE AMARILLO","CORROTEC","PINTUCO","unidad",1,3],
[21,"BLOQUE AMARILLO","CATALIZADOR AL ACIDO","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","ACROLATEX","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","CORROTEC DE ALTA TEMPERATURA","","unidad",1,2],
[21,"BLOQUE AMARILLO","PINTUTRAFICO","PINTUCO","unidad",1,3],
[21,"BLOQUE AMARILLO","PINTULUX","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","PINTUTRAFICO","PINTUCO","unidad",4,2],
[21,"BLOQUE AMARILLO","PINTUTRAFICO","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","PINTURA","PINTUCO","unidad",1,2],
[21,"BLOQUE AMARILLO","LACAS AUTOMOTIVAS","","unidad",1,2],
[21,"BLOQUE AMARILLO","SUPERLACA","PRIME","unidad",0,2],
[21,"BLOQUE AMARILLO","OVERLAC SELLADOR","PRIME OVERLAC","unidad",0,2],
[21,"BLOQUE AMARILLO","BASE TINT","VINILTEX","unidad",2,2],
[21,"BLOQUE AMARILLO","MONTONATURE","","unidad",4,6],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,0],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,3],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,0],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",2,2],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[21,"BODEGA 2","PINTURA","PINTULUX","unidad",0,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,5],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",0,1],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",1,1],
[21,"BODEGA 3","PINTURA","VINILTEX","unidad",5,3],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",7,5],
[21,"BODEGA 2","PINTURA","VINILTEX","unidad",5,4],
[21,"ESTANTE F4","RASPA JUNTA","GOYA","unidad",5,3],
[21,"ESTANTE F2","RODILLO","GOYA","unidad",12,30],
[21,"ESTANTE F2","RODILLO","GOYA","unidad",6,30],
[21,"ESTANTE F2","RODILLO","GOYA","unidad",7,10],
[21,"ESTANTE F2","RODILLO","PINTUCO","unidad",34,30],
[21,"ESTANTE F4","ESATULA METALICA","GOYA","unidad",3,1],
[21,"ESTANTE F2","ESPATULA METALICA","GOYA","unidad",3,3],
[21,"ESTANTE F2","ESPATULA  METALICA","GOYA","unidad",3,10],
[21,"ESTANTE F4","ESPATULA PLASTICA","","unidad",-8,10],
[21,"ESTANTE F4","ESPATULA METALICA","","unidad",2,2],
[21,"ESTANTE F4","ESPATULA METALICA","","unidad",0,3],
[21,"ESTANTE F2","BROCHA","BRUSH","unidad",16,10],
[21,"ESTANTE F2","BROCHA","BRUSH","unidad",20,10],
[21,"ESTANTE F2","BROCHA","GOYA","unidad",2,10],
[21,"ESTANTE F2","SERRUCHO DRYWALL","","unidad",1,1],
[21,"ESTANTE F4","LIJA","ABRACOL","unidad",20,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",0,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",9,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",17,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",44,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",63,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",98,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",61,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",50,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",42,10],
[21,"ESTANTE f4","LIJA","ABRACOL","unidad",15,10],
[21,"ESTANTE F1","CINTA ENMASCARAR","CELLUX","unidad",16,5],
[21,"ESTANTE F2","CINTA ENMASCARAR","CELLUX","unidad",0,5],
[21,"ESTANTE F1","CINTA ENMASCARAR","CELLUX","unidad",15,20],
[21,"ESTANTE F1","CINTA DE MALLA","","unidad",18,20],
[21,"ESTANTE F1","CINTA ANTIDESLIZANTE","","unidad",5,5],
[21,"ESTANTE F1","CINTA ANTIDESLIZANTE","CELLUX","unidad",2,5],
[21,"ESTANTE F1","CINTA MULTIUSOS","CELLUX","unidad",2,3],
[21,"ESTANTE F1","CINTA DE MARCASION DE VINILO","CELLUX","unidad",3,3],
[21,"ESTANTE F1","CINTA RUBATEX FOAM","","unidad",1,5],
[21,"ESTANTE F1","CINTA FOIL DE ALUMINIO","","unidad",1,4],
[21,"ESTANTE F1","CINTA DOBLE FAZ","","unidad",1,5],
[21,"ESTANTE F1","CINTA METALICA PARA ESQUINAS","","unidad",3,3],
[21,"ESTANTE G2","PEGADIT-SILICONA","AFIX","unidad",3,10],
[21,"ESTANTE G2","AFIX","PU","unidad",3,5],
[21,"ESTANTE G2","TEK-BOND ACRILICO","TEK","unidad",6,5],
[21,"ESTANTE G2","SIKASIL-SILICONA","SIKAFLEX","unidad",6,5],
[21,"ESTANTE G2","SIKAFLEX -SELLADO PARAT JUNTAS","SIKAFLEX","unidad",17,10],
[21,"ESTANTE G2","SIKAFLEX -SELLADO PARAT JUNTAS","1A PLUS","unidad",1,2],
[21,"ESTANTE G2","SIKAFLEX -SELLADO PARA JUNTAS CON MOVIMIENTO Y CONEXION","SIKAFLEX","unidad",3,4],
[21,"ESTANATE H3","FILTRO DE SOLIDO DE SISTEMA SUAVISADOR","","unidad",1,1],
[21,"ESTANTE J2","THINNER CORRIENTE","TYT","unidad",5,1],
[21,"ESTANTE H3","WD 40","MULTIUSOS","unidad",2,2],
[21,"ESTANTE F1","CINTA IMPERMEABLE","TEXSA TAPE","unidad",0,1],
[22,"ESTANTEV2","RODAMIENTOS","UCP208-24-J7","UNIDAD",9,8],
[22,"ESTANTEV2","RODAMIENTOS","NU218-E-XL-TVP2","UNIDAD",1,10],
[22,"ESTANTEV2","RODAMIENTOS","UK210TH2310SING","UNIDAD",3,10],
[22,"ESTANTEV2","RODAMIENTOS","16005-A","UNIDAD",1,10],
[22,"ESTANTEV2","RODAMIENTOS","6003-2RSR-L038","UNIDAD",11,15],
[22,"ESTANTEV2","RODAMIENTOS","KDWY-6201-1/2-2RS","UNIDAD",4,15],
[22,"ESTANTEV2","RODAMIENTOS","6003.2RSR","UNIDAD",13,15],
[22,"ESTANTEV2","RODAMIENTOS","16005-A","UNIDAD",3,10],
[22,"ESTANTEV2","RODAMIENTOS","6003.2ZR.C3","UNIDAD",1,15],
[22,"ESTANTEV2","RODAMIENTOS","6201","UNIDAD",10,15],
[22,"ESTANTEV2","RODAMIENTOS","6201-2RSC3","UNIDAD",19,15],
[22,"ESTANTEV2","RODAMIENTOS","6202-2RS","UNIDAD",17,10],
[22,"ESTANTEV2","RODAMIENTOS","6904-2RS","UNIDAD",4,10],
[22,"ESTANTEV2","RODAMIENTOS","6203-2RC3-65R","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","620022C3/2AS","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","620022C3/L627","UNIDAD",4,15],
[22,"ESTANTEV2","RODAMIENTOS","6205-2RS1R","UNIDAD",3,10],
[22,"ESTANTEV2","RODAMIENTOS","6202LLUC3/2AS","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","BB1-4830A","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6204-2RSH","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6204-2RSH/C3GJN","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","3204B-2RSRING","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","203RR2","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6000-2RHS","UNIDAD",10,20],
[22,"ESTANTEV2","RODAMIENTOS","6203-22/C3GJN","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6904-2RSC3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","60042RS/C3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6206-22/C3GJN","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","6205-22/C3GJN","UNIDAD",4,20],
[22,"ESTANTEV2","RODAMIENTOS","UK209.40","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","22214E/C3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","22211E/C3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","7309BEP","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6309-22/C3GN","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6308-22/C3GJN","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6208-22/C3","UNIDAD",7,20],
[22,"ESTANTEV2","RODAMIENTOS","6306-22/C3GJN","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","6307-2RS1/C3","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","6312-22/C3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","6212-22/C3","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","BB1-4834A-6200.2RS/C3","UNIDAD",11,20],
[22,"ESTANTEV2","RODAMIENTOS","620722/L627","UNIDAD",1,20],
[22,"ESTANTEV2","RODAMIENTOS","UK211D1","UNIDAD",2,20],
[22,"ESTANTEV2","RODAMIENTOS","60802RS/C3","UNIDAD",6,3],
[22,"General","RODAMIENTOS","","unidad",0,0],
[22,"General","RODAMIENTOS","","unidad",0,0],
[22,"General","RODAMIENTOS","","unidad",0,0],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1024","A55","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1357","B-56","unidad",17,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1727","B-66","unidad",0,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-787","B-96","unidad",7,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1337","B-98","unidad",13,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1337","B-100","unidad",4,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1047","B-105","unidad",5,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-987","B-115","unidad",6,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-2360","B-135","unidad",3,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1140","BX-59","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1932","BX-85","unidad",1,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1932","BX-77","unidad",3,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1837","SPZ1080","unidad",6,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SP-1932","SPZ1047","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-787","SPZ787-BC","unidad",20,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1932","SPZ-1787","unidad",2,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1732","SPA-2360","unidad",4,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-2332","SPZ-2087","unidad",2,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-2087","SPB2990","unidad",3,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1957","XPA1932","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1737","XPA1030","unidad",6,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1080","XPZ1340","unidad",9,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1787","PJ1663","unidad",4,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1140","PJ2489","unidad",5,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1120","3VX-750","unidad",7,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1732","3V-530","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1140","3V-560","unidad",0,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1137","M-41","unidad",12,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1737","655-J","unidad",7,4],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1932","980J","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-2087","1915","unidad",0,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1957","908J","unidad",3,6],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1737","A31","unidad",0,5],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPZ-1787","SPB-2840","unidad",0,5],
[23,"PARTE SUPERIOR DE ESTANTERIAS","SPA-1932","SPZ-812","unidad",0,6],
[24,"ESTANTE C3","LED","GU10","unidad",54,15],
[24,"ESTANTE C3","LED","OSRAM","unidad",2,15],
[24,"ESTANTE C2","LED","RCA GU","unidad",12,15],
[24,"ESTANTE C2","BOMBILLO","SILVANIA","unidad",4,15],
[24,"ESTANTEC2","BOMBILLO","SYLVANIA","unidad",-10,15],
[24,"ESTANTEC3","LED REFLECTOR","SYLVANIA","unidad",10,20],
[24,"ESTANTE C2","BONBILLO","PHILIPS","unidad",8,15],
[24,"ESTANTE C2","BONBILLO","WELLMAX","unidad",1,15],
[24,"ESTANTE C2","BONBILLO","ECO LITE","unidad",55,15],
[24,"ESTANTE C2","BOMBILLO LED","DAIRU","unidad",5,4],
[24,"ESTANTE C2","BONBILLO LED","MERCURY","unidad",12,15],
[24,"ESTANTE C2","BONBILLO","SILVANIA","unidad",0,15],
[24,"ESTANTEC2","BONBILLO","LEXMANA","unidad",3,10],
[24,"ESTANTEC2","BONBILLO LED","SYLVANIA","unidad",8,5],
[24,"ESTANTE C3","LED","TECNOLITE","unidad",6,5],
[24,"ESTANTEC3","LED","REDONDO TECNOLITE","unidad",10,10],
[24,"ESTANTE C3","CINTA LED","DAIRU","unidad",1,4],
[24,"ESTANTE C3","LED","DAIRU GU10","unidad",44,20],
[24,"ESTANTE C4","BONBILLO","NIPPON INFRAROJO 110V","unidad",20,4],
[24,"ESTANTE C2","BONBILLO","ENERLUX","unidad",11,7],
[24,"ESTANTE C3","LED","ROBLAN","unidad",12,6],
[24,"ESTANTE C2","BOMBILLO","EXCELL","unidad",19,5],
[24,"ESTANTE C2","BOMBILLO","OSRAM","unidad",0,15],
[24,"ESTANTEC3","LED REFLECTOR","BAYTER","unidad",1,8],
[24,"ESTANTEC3","LED REFLECTOR","MAAAX","unidad",0,10],
[24,"ESTANTE D1","LED","ECO ENCRUSTAR","unidad",0,5],
[24,"ESTANTED1","LED REFLECTOR","SYLVANIA","unidad",0,10],
[24,"ESTANTED1","LED REFLECTOR","SYLVANIA","unidad",3,3],
[24,"ESTANTED1","LED REFLECTOR","SYLVANIA","unidad",0,10],
[24,"ESTANTE D1","LED PANEL","REDONODO SYLVANIA","unidad",24,6],
[24,"ESTANTE D1","LED PANEL","REDONDO PANEL LED","unidad",21,6],
[24,"ESTANTE C4","BOMBILLO CAMPANA","LUCES DE EMERGENCIA","unidad",0,10],
[24,"ESTANTE C4","LED","LUCES DE EMERGENCIA EMPER","unidad",40,10],
[24,"ESTANTEC4","LED","LUCES DE EMERGENCIA EMPER","unidad",0,8],
[24,"ESTANTEC1","LED","LUCES DE EMERGENCIA","unidad",42,40],
[24,"ESTANTE C1","LAMPARA","TUBO SPEK LIGHTING","unidad",3,10],
[24,"ESTANTE D1","LED PANEL","REDONDA DE INCRUSTAR (MERCURY)","unidad",0,50],
[24,"ESTANTEA1","TUBOS LED","T8","unidad",75,40],
[24,"ESTANTE C3","BALA LED","MERCURY","unidad",0,25],
[24,"ESTANTE A1","LAMPARA","T5","unidad",0,50],
[24,"ESTANTE C2","FOTOCELDA","MERCURY","unidad",3,10],
[24,"ESTANTEB1","LAMPARA","DE LECTURA","unidad",16,40],
[24,"ESTANTEC1","LED","WALL PACK","unidad",1,3],
[24,"ESTANTEC4","LED EMERGENCIA","ZEMPER","unidad",18,20],
[24,"ESTANTEC1","LED","CONSTRULTA","unidad",5,5],
[24,"ESTANTE C3","CINTA LED","VTA","unidad",1,2],
[25,"General","TORNILLO EN ACER INOX DE","1/4X2","UNIDAD",194,0],
[25,"General","TORNILLOS TIPO ALEN","10MMX1","UNIDAD",200,0],
[25,"General","TORNILLO DRIWALL","6X2","UNIDAD",425,0],
[25,"General","TORNILLO HEX UNC EN ACERO INOX","1/4X2","UNIDAD",92,0],
[25,"General","TORNILLO DE HEXAGONAL GALVANIZADO","1/4X1","UNIDAD",15,0],
[25,"General","TORNILLO DRIWALL","2 1/2''","UNIDAD",200,0],
[25,"General","CHAZOZ DE PARED","3/8X2''","UNIDAD",90,0],
[25,"General","CHAZOS METALICO MARIPOSA","3/8''","UNIDAD",85,0],
[25,"General","TORNILLO DE CHAZOS DE MARIPOSA","3/8''","UNIDAD",100,0],
[25,"General","CHAZOS METALICO","3/16''","UNIDAD",88,0],
[25,"General","TORNILLO PARA CHAZO","3/16''","UNIDAD",100,0],
[25,"General","PERNOS PARA VARILLA","1/2''","UNIDAD",20,0],
[25,"General","TUERCA","1/2''","UNIDAD",15,0],
[25,"General","CHAZOS PUNTILLA","1/4X1=5/8","UNIDAD",100,0],
[25,"General","TORNILLO HEXAGONAL","3/8X1''","UNIDAD",50,0],
[25,"General","TORNILLO HEXAGONAL","5/16X1''","UNIDAD",50,0],
[25,"General","TUERCA HEXAGONAL DE SEGURIDAD","3/8''","UNIDAD",50,0],
[25,"General","TUERCA HEXAGONAL DE SEGURIDAD","5/16''","UNIDAD",50,0],
[25,"General","ARANDELA INOX","7/16''","UNIDAD",100,0],
[25,"General","ARANDELAS INOX","5/16''","UNIDAD",100,0],
[25,"General","TORNILLO AUTO PERFORANTE","2''","UNIDAD",160,0],
[25,"General","TORNILLO EXTRAPLANO PUNTA BROCA","8X1\"","UNIDAD",500,0],
[25,"General","TORNILLO DRYWALL PASO FINO","6X1","UNIDAD",500,0],
[25,"General","TORNILLO DRYWALL","6X1 1/2","UNIDAD",500,0],
[25,"General","HOJA DE SEGUETA","","UNIDAD",15,0],
[25,"General","CHAZOS PLASTICOS","1/4 S.M","UNIDAD",94,0],
[26,"ESTAN S4","TEE 3/4\"","","unidad",74,15],
[26,"ESTAN S4","TEE 1/2\"","","unidad",34,15],
[26,"ESTAN S1","TEE 2\"","","unidad",16,5],
[26,"ESTAN S1","TEE 4\"","","unidad",6,5],
[26,"ESTAN S4","CODO 1\"","","unidad",8,4],
[26,"ESTAN S4","CODO 3/4\"","","unidad",40,30],
[26,"ESTAN S4","CODO 45 GRADOS 1/2\"","","unidad",37,15],
[26,"ESTAN S4","CODO 45 GRADOS 3/4\"","","unidad",2,1],
[26,"ESTAN S2","CODO 2\"","","unidad",10,4],
[26,"ESTAN S2","CODO 1 1/2\"","","unidad",11,4],
[26,"ESTAN S2","CODO 45 GRADOS 2\"","","unidad",5,3],
[26,"ESTAN S2","CODO 45 GRADOS","","unidad",3,3],
[26,"ESTAN S1","CODO 4\"","","unidad",2,3],
[26,"ESTAN S1","CODO 2.1/2","","unidad",12,3],
[26,"ESTAN S1","CODO 45 GRADOS","","unidad",3,3],
[26,"ESTAN S4","REDUCCION 2 A 1 1/2\"","","unidad",15,3],
[26,"ESTAN S4","REDUCCION 2 A 1 1/4\"","","unidad",15,3],
[26,"ESTAN S4","REDUCCION 1X3/4\"","","unidad",9,3],
[26,"ESTAN S4","REDUCCION 1X1/2\"","","unidad",47,3],
[26,"ESTAN S1","REDUCCION 6X4\"","","unidad",3,3],
[26,"ESTAN S4","ADAPTADOR MACHO 1/2\"","","unidad",111,30],
[26,"ESTAN S4","ADAPTADOR MACHO 3/4\"","","unidad",42,20],
[26,"ESTAN S4","ADAPTADOR MACHO 1\"","","unidad",10,20],
[26,"ESTAN S1","ADAPTADOR MACHO 2./2\"","","unidad",27,15],
[26,"ESTAN S1","ADAPTADOR  MACHO 2\"","","unidad",19,15],
[26,"ESTAN S4","ADAPTADOR HEMBRA 1/2\"","","unidad",54,30],
[26,"ESTAN S4","ADAPTADOR HEMBRA 3/4\"","","unidad",20,30],
[26,"ESTAN S4","ADAPTADOR HEMBRA 1\"","","unidad",21,30],
[26,"ESTAN S4","UNION LISA 3/4\"","","unidad",27,10],
[26,"ESTAN S4","UNION LISA 1/2\"","","unidad",18,10],
[26,"ESTAN S4","UNION LISA 1\"","","unidad",11,10],
[26,"ESTAN S2","UNION LISA 2\"","","unidad",23,10],
[26,"ESTAN S1","UNION LISA 4\"","","unidad",34,10],
[26,"ESTAN S1","UNION  UNIVERSAL 2\"","","unidad",2,10],
[26,"ESTAN S4","UNION UNIVERSAL 1/2","","unidad",11,10],
[26,"ESTAN S4","TAPON 1\"","","unidad",34,10],
[26,"ESTAN S4","TAPON 3/4\"","","unidad",2,10],
[26,"ESTAN S4","TAPON 1/2\"","","unidad",21,10],
[26,"ESTAN S1","TAPON 2 1/2\"","","unidad",11,4],
[26,"ESTAN S4","NIPLE ROSCADO 3/4\"","","unidad",5,4],
[26,"ZONZ","Column2","","unidad",0,0],
[26,"ESTAN R3","CODO 90 GRADOS 1 1/2\"","","unidad",15,3],
[26,"ESTAN R3","CODO 45 GRADOS 1 1/2\"","","unidad",9,3],
[26,"ESTAN R3","CODO 90 GRADOS 2\"","","unidad",6,3],
[26,"ESTAN R3","CODO 45 GRADOS 2\"","","unidad",15,3],
[26,"ESTAN R3","CODO 45 GRADO 3\"","","unidad",3,3],
[26,"ESTAN R3","UNION LISA 1 1/2\"","","unidad",8,3],
[26,"ESTAN R3","UNION LISA 3\"","","unidad",7,3],
[26,"ESTAN R3","REDUCCION 3\"X2\"","","unidad",9,3],
[26,"ESTAN R3","REDUCCION 3X1 1/2\"","","unidad",5,3],
[26,"ESTAN R3","REDUCCION 4X3\"","","unidad",6,3],
[26,"ESTAN R3","REDUCCION 4X2\"","","unidad",10,3],
[26,"ESTAN R3","YEE 2\"","","unidad",11,3],
[26,"ESTAN R3","YEE 3\"","","unidad",17,3],
[26,"ESTAN R3","TAPA 1 1/2\"","","unidad",6,3],
[26,"ESTAN R3","TAPA 2\"","","unidad",3,3],
[26,"ESTAN S4","TEE 1/2\"","","unidad",31,15],
[26,"ESTAN S4","TEE 3/4\"","","unidad",17,15],
[26,"ESTAN S4","TEE 1\"","","unidad",0,15],
[26,"ESTAN S3","TEE 1-1/2\"","","unidad",8,15],
[26,"ESTAN S3","TEE 1-1/4\"","","unidad",3,10],
[26,"ESTAN S3","TEE 2\"","","unidad",2,5],
[26,"ESTAN S4","CODO 45 GRADOS 1/2\"","","unidad",37,10],
[26,"ESTAN S4","CODO 45 GRADOS 1\"","","unidad",26,10],
[26,"ESTAN S4","CODO 45 GRADOS 3/4\"","","unidad",19,10],
[26,"ESTAN S4","CODO 1\"","","unidad",39,10],
[26,"ESTAN S4","CODO 3/4","","unidad",65,10],
[26,"ESTAN S4","CODO 1/2\"","","unidad",12,10],
[26,"ESTAN S3","CIDO 1-1/4\"","","unidad",2,4],
[26,"ESTAN S3","CODO 2\"","","unidad",2,3],
[26,"ESTAN S4","REDUCCION 1-1/2X3/4\"","","unidad",11,4],
[26,"ESTAN S4","REDUCCION 1 1/4X3/4\"","","unidad",21,8],
[26,"ESTAN S4","REDUCCION 1X1/2\"","","unidad",8,8],
[26,"ESTAN S4","REDUCCION 3/4X1/2\"","","unidad",5,8],
[26,"ESTAN S3","REDUCCION 2\"X3/4\"","","unidad",10,5],
[26,"ESTAN S3","REDUCCION 2\"X1-1/2\"","","unidad",1,5],
[26,"ESTAN S4","ADAPTADOR HEMBRA 1/2\"","","unidad",18,10],
[26,"ESTAN S4","ADATADOR MACHO 1-1/4\"","","unidad",15,10],
[26,"ESTAN S4","ADAPTADOR MACHO 1/2\"","","unidad",23,10],
[26,"ESTAN S4","ADAPTADOR MACHO 3/4\"","","unidad",26,10],
[26,"ESTAN S4","ADAPTADOR MACHO 1\"","","unidad",12,10],
[26,"ESTAN S4","ADAPTADOR HEMBRA 1\"","","unidad",19,10],
[26,"ESTAN S3","ADAPTADOR MACHO 2\"","","unidad",19,10],
[26,"ESTAN S3","ADAPTADOR MACHO 1 1/2\"","","unidad",14,10],
[26,"ESTAN S3","ADAPTADOR HENBRA 1 1/2\"","","unidad",2,10],
[26,"ESTAN S4","UNION LISA 1/2\"","","unidad",47,15],
[26,"ESTAN S4","UNION LISA 1\"","","unidad",37,15],
[26,"ESTAN S4","UNION LISA 2\"","","unidad",16,15],
[26,"ESTAN S4","UNION LISA 3/4\"","","unidad",54,20],
[26,"ESTAN S3","UNION LISA 2 1/2\"","","unidad",9,5],
[26,"ESTAN S3","UNION LISA 3\"","","unidad",4,5],
[26,"ESTAN S3","UNION LISA 4\"","","unidad",10,5],
[26,"ESTAN S3","UNION LISA 1 1/2\"","","unidad",1,5],
[26,"ESTAN S4","UNION UNIVERSAL 3/4\"","","unidad",15,5],
[26,"ESTAN S4","UNION UNIVERSAL 1/2\"","","unidad",7,10],
[26,"ESTAN S3","UNION UNIVERSAL 1\"","","unidad",3,4],
[26,"ESTAN S4","UNION HENBRA 1\"","","unidad",2,4],
[26,"ESTAN S4","UNION MACHO 2\"","","unidad",9,5],
[26,"ESTAN S3","UNION  MACHO 1 1/2\"","","unidad",7,5],
[26,"ESTAN S4","TAPON 3/4\"","","unidad",19,10],
[26,"ESTAN S4","TAPON 1/2\"","","unidad",20,10],
[26,"ESTAN S4","TAPON 1\"","","unidad",20,10],
[27,"ESTANTE T5","VALVULA DE BOLA","1\"","UNIDAD",6,3],
[27,"ESTANTE T5","VALVULA DE BOLA","1.25","UNIDAD",5,3],
[27,"ESTANTE T5","VALVULA DE BOLA","0.5","UNIDAD",3,3],
[27,"ESTANTE T5","VALVULA DE BOLA","0.75","UNIDAD",1,3],
[27,"ESTANTE T5","VALVULA DE BOLA","0.375","UNIDAD",1,3],
[27,"ESTANTE T5","VALVULA COMPUERTA","RED WHITE-3/4","UNIDAD",4,3],
[27,"ESTANTE T5","VALVULA DE COMPUERTA","GRIVAL-3/4","UNIDAD",6,3],
[27,"ESTANTE T5","VALVULA DE COMPUERTA","LATON-1/2","UNIDAD",2,3],
[27,"ESTANTE T5","VALVULA DE","RED WHITE-TOYO-1/2","UNIDAD",1,3],
[27,"ESTANTE T5","VALVULA DE","RED WHITE -1 1/2","UNIDAD",2,3],
[27,"ESTANTE T5","VALVULA DE","RED WHITE -2\"","UNIDAD",1,3],
[27,"ESTANTE T5","REDUCCION DE COBRE","1-1/8\" X 7/8\" OD (CXC)","UNIDAD",4,5],
[27,"ESTANTE T5","UNION DE COBRE","1 1/8\"","UNIDAD",2,5],
[27,"ESTANTE T5","UNION DE COBRE","7/8\"","UNIDAD",1,5],
[27,"ESTANTE T5","CODO DE COBRE CUELLO CORTO","3/8 ODF 90o","UNIDAD",10,5],
[27,"ESTANTE T5","CODOS DE COBRE CUELLO CORTO","5/8 ODF 90o","UNIDAD",10,5],
[27,"ESTANTE T5","CODO DE COBRE (CUELLO CORTO)","1-1/8\" ODF 90o","UNIDAD",3,6],
[27,"ESTANTE T5","CODO DE COBRE (CUEL)","7/8\" ODF 90o","UNIDAD",3,6],
[27,"ESTANTE T5","TUBERIA COBRE - TIPO L RIG","7/8\"X0.045\" OD","UNIDAD",1,2],
[27,"ESTANTE T5","ALICATE DIABLO GALIVAN","#10","UNIDAD",1,1],
[27,"ESTANTE T5","TUBOS DE EMT","1/2\"","UNIDAD",7,10],
[27,"ESTANTE T4","CURVAS","1/2\"","UNIDAD",8,10],
[27,"ESTANTE T4","UNION","1/2\"","UNIDAD",28,50],
[27,"ESTANTE A4","UNION EMT","3/4\"","UNIDAD",17,10],
[27,"ESTANTE A4","CONECTOR EMT","3/4\"","UNIDAD",20,10],
[27,"ESTANTE A4","ADAPTADOR MACHO NPT","1/2\" X 1/2\"","UNIDAD",4,10],
[27,"ESTANTE A4","ADAPTADOR TEE H","1/2\" FP","UNIDAD",5,10],
[27,"ESTANTE A4","ADAPTADOR BUSHING NPT","3/4\" X 1/2\"","UNIDAD",3,10],
[27,"ESTANTE A4","ADAPTADOR MACHO NPT","3/4\" X 3/4\"","UNIDAD",5,10],
[27,"ESTANTE A4","ADAPTADOR HEMBRA NPT","3/4\" X 3/4\" A 90","UNIDAD",2,10],
[27,"ESTANTE T4","CURVAS EMT","1/2IN","UNIDAD",10,20],
[27,"ESTANTE T4","GRAPAS AJUSTABLE","3/4´´","UNIDAD",25,20],
[27,"ESTANTE T4","GRAPAS AJUSTABLE","1´´","UNIDAD",25,20],
[27,"ESTANTE T4","GRAPAS AJUSTABLE","2026-01-02 00:00:00","UNIDAD",25,20],
[27,"ESTANTE T4","UNION IMC","3/4IN","UNIDAD",12,20],
[27,"ESTANTE T4","BALA DE PISO CON TORNILLOS DE ESTRIS INOXIDABLE","","UNIDAD",12,20],
[27,"ESTANTE T4","BUSHING INOX 304","1/2\" X 3/8\" X 150L","UNIDAD",10,10],
[27,"ESTANTE T4","BUSHING INOX 304","3/4 X 1/2 X150L","UNIDAD",5,10],
[27,"ESTANTE T4","BUSHING INOX 304","1X3/4X150L","UNIDAD",10,3],
[27,"ESTANTE T4","BUSHING INOX 304","3/8X1/4X150L","UNIDAD",10,5],
[27,"ESTANTE T4","CODO INOX 304","3/8 NPT X 150L","UNIDAD",4,10],
[27,"ESTANTE T4","COPA INOX 304","1 X 3/4\" X 150L","UNIDAD",0,10],
[27,"ESTANTE T4","NIPLE INOX 304","S40 3/8 X 2","UNIDAD",3,10],
[27,"ESTANTE T4","NIPLE 304 DE LARGO","1'' X 2''","UNIDAD",9,5],
[27,"ESTANTE T4","REDUCCION INOX 304 COPA ROSCADA DIAM","1 X 1/2\" X 150","UNIDAD",2,5],
[27,"ESTANTE T4","CONECTOR SCH 3/4 SCH40","","UNIDAD",37,20],
[27,"ESTANTE T4","CONECTOR DE ACERO PARA TUBO EMT","1/2\"","UNIDAD",5,5],
[27,"ESTANTE T4","CONECTOR RECTO PARA CORAZA","3/4\"","UNIDAD",12,10],
[27,"ESTANTE A3","PEROS GALVANIZADOS","3/`16","UNIDAD",100,20],
[27,"ESTANTE A3","PEROS GALVANIZADOS","1/8'","UNIDAD",100,20],
[27,"ESTANTE A3","PERROS INOXIDABLES","1/4'","UNIDAD",50,20],
[27,"ESTANTE A3","PRROS INOXIDABLE","3/16'","UNIDAD",50,20],
[27,"ESTANTE A3","NIPLES ENRROSCADO","1 LONGITUD 8CM","UNIDAD",3,20],
[27,"ESTANTE A3","NIPLES ENRROSCADO","1LONGITUD 17CM","UNIDAD",3,5],
[27,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/2 GALVANIZADO","UNIDAD",3,5],
[27,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/4 GALVANIZADO","UNIDAD",8,5],
[27,"ESTANTE A3","BARILLA ENROSCADA EN INOX","1/2MMX1MTS","UNIDAD",6,5],
[27,"ESTANTE A3","BARILLA LISA EN INOX","1/4M","UNIDAD",11,5],
[27,"ESTANTE A3","DISCO DE PULIR DEWALT","7''X1/8X7/8","UNIDAD",5,3],
[27,"ESTANTE A3","VALVULAS REDUCTORAS DE PRESION","","UNIDAD",0,4],
[27,"ESTANTE V5","GANCHOS TENSORES INOX","20MM","UNIDAD",6,0],
[27,"ESTANTE V5","GANCHOS TENSORES INOX","16MM","UNIDAD",2,0],
[27,"ESTANTE V5","GANCHOS TENSORES INOX","12MM","UNIDAD",3,0],
[27,"ESTANTE V5","GANCHOS TENSORES INOX","10MM","UNIDAD",2,0],
[27,"ESTANTE V5","GANCHOS TENSORES INOX","8MM","UNIDAD",1,0],
[27,"ESTANTE V5","TENSORES DE MORDAZA Y ORQUILLA INOX","10MM","UNIDAD",5,0],
[27,"ESTANTE V5","GRILLETES EN INOX","","UNIDAD",6,0],
[27,"ESTANTE V5","ABRAZADERAS(PERRO) EN INOX","","UNIDAD",6,0],
[27,"ESTANTE V5","GRATAS EN ACERO CIRCULAR","3 \"","UNIDAD",10,0],
[27,"ESTANTE V5","COLLARIN DE PVC","4X2","UNIDAD",5,0],
[27,"ESTANTE V5","DISCO DIAMANTADO","4=1/2","UNIDAD",3,0],
[28,"ESTANE2","FILTRO SECADOR","023Z2028","unidad",8,1],
[28,"ESTANE2","FILTRO SECADOR DE LIQUIDO SOLDABLE 1/2","023Z5061","unidad",3,1],
[28,"ESTANE2","FILTRO SECADOR HERMATICO","023Z5067","unidad",1,1],
[28,"ESTANE2","FILTRO SECADOR HERMATICO","023Z5068","unidad",2,1],
[28,"ESTANE2","FILTRO SECADOR HERMATICO","023Z0071","unidad",3,1],
[28,"ESTANE2","FILTRO SECADOR HERMETICO","023Z0071","unidad",3,1],
[28,"ESTANE2","FILTRO SECADOR HERMETICO","023Z5058","unidad",10,2],
[28,"ESTANE1","FILTRO SEPARADOR","5/8''","unidad",2,2],
[28,"ESTANE1","FILTRO ACUMULADOR DE SUCCION O LIQUIDO","7/8''","unidad",4,2],
[28,"ESTANE1","FILTRO SEPARADOR DE ACEITE?","1/2''","unidad",4,2],
[28,"RSTANE1","FILTRO DE SUCCION","5/8''","unidad",4,2],
[28,"ESTANE1","VERTICAL LIQUID RECEIVER","1/2''","unidad",3,1],
[28,"ESTANE1","VERTICAL LIQUID  RECERVADOR","6/8''","unidad",1,1],
[28,"ESTANE2","FILTROS 5/8","5/8''","unidad",4,1],
[28,"ESTANE2","FILTRO  DE SUCCION","7/8''","unidad",5,2],
[28,"ESTANE2","FILTRO  CAPACIDAD DE FLUJO DE SUCCION","1-1/8''","unidad",2,1],
[28,"ESTANE2","FILTRO SECADOR","1/2''","unidad",3,1],
[28,"ESTANE2","FILTRO SECADOR   DE LINEA LIQUIDA DE BAJA TEMPERATURA","3/8 EK-083","unidad",1,1],
[28,"ESTANE2","FILTRO SECADOR HERMETICO","3/8EK-30-3R","unidad",2,1],
[28,"ESTAN E2","FILTRO DE LIQUIDO 1/4 SOLDABLE","","unidad",2,0],
[28,"ESTANE2","FILTRO SECADOR","1/4''","unidad",7,2],
[28,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7100","unidad",8,4],
[28,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7101","unidad",5,1],
[28,"ESTANE2","TERMOSTATO DE REFRIGERACION O CONGELADOR","077B7102","unidad",11,5],
[28,"ESTANE2","TERMOSTATO TEMPERATURA DE TRABAJO","FOCUS PRO N100","unidad",7,1],
[28,"ESTANE2","PRESOSTATO DE ALTA  PRESION REFRIGERANTE","60110566","unidad",7,1],
[28,"ESTANE2","CAPACITOR  MARCHA O ARRANQUE","RW-44R450-440VAC","unidad",4,2],
[28,"ESTANE2","CAPACITOR MARCHA DE 35UF","35UF-450VAC","unidad",4,2],
[28,"ESTANE2","CAPACITOR","80UF-450VAC","unidad",2,2],
[28,"ESTANE2","CAPACITOR DE MARCHA DE 55UF.370/440VAC","55UF-370V-440V","unidad",4,1],
[28,"ESTANE2","CAPACITOR","RW-37R075-7.5 UF-370VAC","unidad",5,2],
[28,"ESTANE2","CAPACITOR DE ARRANQUE DE 108- 130UF","108-130UF-250VAC","unidad",2,1],
[28,"ESTANE2","CAPACITOR","10UF-440VAC","unidad",1,1],
[28,"ESTANE2","VALVULA DE EXPASION TERMOSTATICA","NBE 5ZAAODF","unidad",3,1],
[28,"ESTANE2","CONTACTOR","30A-FLA 40 AMP-24VAC","unidad",4,1],
[28,"ESTANE2","CONTACTOR","NCK 3-32/2-110V","unidad",2,1],
[28,"ESTANE2","BOBINA DE ENCENDIDO","250VAC","unidad",3,1],
[28,"ESTANE2","CONTROL O MONITOR DE TEMPERATURA","TMD-4T","unidad",3,1],
[28,"ESTANE2","SENSOR DE TEMPERATURA","SEN02133","unidad",4,1],
[28,"ESTANE2","RESISTENCIA DE CARGA","","unidad",2,1],
[28,"ESTANE2","TRANFORMADOR DE CONTROL","ENTRADA 480V(1-2)SALIDA 24V(4-5)","unidad",1,1],
[28,"ESTANE2","CONTROLADOR -MT-512E-2HP","115 OR-230VAC","unidad",3,1],
[28,"ESTANE2","RELAY","SRSP-12-110V/60HZ","unidad",2,1],
[28,"ESTANE2","TRANFORMADOR","POWER 40VA-RW 40310F","unidad",1,1],
[28,"ESTANE3","TERMOSTATO","110/230V","unidad",1,1],
[28,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","FD1550A2HB-220/240V","unidad",0,1],
[28,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","FM17250A2HBL-220/240NAC","unidad",2,1],
[28,"ESTANE3","VENTILADOR EXTRACTOR AXIAL","120X120X30MM-AC 110","unidad",5,1],
[28,"ESTANE3","RELE DE POTENCIA","IDECRJ25/CL-D24","unidad",1,1],
[28,"ESTANE3","RE DE CONMUTACION DE PROPOSITO GENERAL","RW-90340-208/240V","unidad",0,1],
[28,"ESTANE3","FUSIBLE CILINDRICO CERAMICO","RT18-32/RT14-20-500V,16A","unidad",0,1],
[28,"ESTANE3","BOBINA PARA VALVULA SOLENOIDE","200-220/208-240V","unidad",1,1],
[28,"ESTANE3","MOTOR","10/127V","unidad",10,1],
[28,"ESTANE3","VALVULA DE GUSANILLO","","unidad",-2,1],
[28,"ESTANE3","CEPILLO LIMPIADOR DE TUBOS DE NAILO AZUL","","unidad",37,1],
[28,"ESTANE3","TEMPORIZADOR DE RETARDO","","unidad",3,1],
[28,"ESTANE3","SOLENOIDE","120V","unidad",3,4],
[28,"ESTANE3","SOLENOIDE","220-240V","unidad",-3,4],
[28,"ESTANE3","REFRIGERANTE R 507","R-507","unidad",2,1],
[28,"ESTANE4","REFRIGERANTE R 134A","R-134A","unidad",5,1],
[28,"ESTANE4","REFRIGERANTE R- 22","R-22","unidad",1,1],
[28,"ESTANTE E4","REFRIGERANTE R-290","R-290","unidad",2,1],
[28,"ESTANE4","REFRIGERANTE R 404A","R-404A","unidad",1,1],
[28,"ESTANE4","REFRIGERANTE R 410A","R-410A","unidad",3,1],
[28,"ESTANE4","BUTANO","","unidad",2,1],
[28,"ESTANTEE3","BARILLA","DE SOLDAR","unidad",35,15],
[28,"ESTANTE E2","CUERPO VAVULA SOLENOIDE 3/8","SOLDAR","unidad",0,1],
[28,"ESTANTEE3","ASPA METALICA","8''","unidad",1,2],
];

/* ============================================================
   MANTENIMIENTO — catálogo de equipos importado del cronograma
   ============================================================ */
// Catálogo importado desde CRONOGRAMA_HYATT_REGENCY_CARTAGENA_2026_SEGUIMIENTO.xlsb (925 equipos, 29 sistemas)
const MTTO_IMPORT_SISTEMAS = [
"ASCENSORES",
"ASPIRADORAS",
"CALIBRACIÓN Y CERTIFICAIÓN DE QUIPOS DE MEDIDA MASA Y TEMPERATURA",
"CCTV",
"DETECCIÓN",
"DIVISIONES ACÚSTICAS",
"DUCTOS Y CAMPANA COCINA",
"EQUIPOS DE PISCINA",
"EQUIPOS GIMNASIO",
"Equipos Hidraulicos",
"Equipos de Cocina",
"Equipos de lavanderia",
"FACHADAS",
"FILTROS DE  AGUA",
"HIDROLAVADORAS",
"HVAC",
"ILUMINACIÓN",
"INSTALACIONES SANITARIAS / RESIDUALES",
"JARDINES",
"PLANTA TELEFÓNICA ( IT)",
"PLATAFORMA  EXTENSIBLE",
"PRESURIZACION Y Extraccion",
"PUERTA PPAL.",
"REDES DE GAS",
"RESIDUOS INDUSTRIALES",
"SISTEMA CALENTAMIENTO DE AGUA",
"SISTEMA ELÉCTRICO",
"SISTEMA TV",
"SISTEMAS EXTINCIÓN",
];
const MTTO_IMPORT_EQUIPOS = [
[4,"SENSORES DE HUMO"],
[4,"SENSORES TÉRMICOS"],
[4,"SENSORES DE GAS"],
[4,"SENSORES DE MONÓXIDO"],
[4,"SUPERVISÓN PUERTAS"],
[4,"TELÉFONOS EMERGENCIA"],
[4,"ESTACIONES MANULAES"],
[4,"PANEL  PPAL Y AUXILIAR ( BATERÍAS)"],
[0,"ASCENSOR 17"],
[0,"ASCENSOR 18"],
[0,"ASCENSOR 19"],
[0,"ASCENSOR 20"],
[0,"ASCENSOR 21"],
[0,"ASCENSOR 22"],
[0,"ASCENSOR 23"],
[0,"ASCENSOR 24"],
[0,"ASCENSOR 25"],
[0,"ASCENSOR 26"],
[0,"ASCENSOR 27"],
[0,"ASCENSOR 28"],
[0,"ASCENSOR 29"],
[0,"ASCENSOR 30"],
[0,"ASCENSOR 31"],
[0,"ASCENSOR 32"],
[0,"ASCENSOR 33"],
[25,"CALDERA PISO 4 LAVANDERIA"],
[25,"CALDERIN PISO 8 #1"],
[25,"CALDERIN PISO 8 #2"],
[25,"CALDERIN PISO 8 #3"],
[25,"TURCO DE VAPOR MASCULINO PISO 14"],
[25,"TURCO DE VAPOR FEMENINO PISO 14"],
[25,"CALDERIN PISO 33 #1"],
[25,"CALDERIN PISO 33 #2"],
[25,"CALDERIN PISO 33 #3"],
[25,"CALDERIN PISO 33 #4"],
[25,"CALDERIN PISO 33 #5"],
[25,"CALDERIN PISO 33 #6"],
[25,"CALDERIN PISO 33 #7"],
[25,"CALDERIN PISO 33 #8"],
[25,"CALDERIN PISO 33  HABITACIONES NUEVAS #1"],
[25,"CALDERIN PISO 33  HABITACIONES NUEVAS #2"],
[25,"CALDERIN PISO 33  HABITACIONES NUEVAS #3"],
[25,"CALDERIN RESIDENCIAS PISO 43 #1"],
[25,"CALDERIN RESIDENCIAS PISO 43 #2"],
[25,"CALDERIN RESIDENCIAS PISO 43 #3"],
[25,"CALDERIN RESIDENCIAS PISO 43 #4"],
[25,"TANQUE AGUA CALIENTE PISO 8"],
[25,"TANQUE AGUA CALIENTE PISO 33 #1"],
[25,"TANQUE AGUA CALIENTE PISO 33 #2"],
[21,"UNIDAD DE EXTRACCION-101  CUARTO DE PINTURA PISO 1"],
[21,"UNIDAD DE EXTRACCION-201 BAÑOS PISO 2"],
[21,"UNIDAD DE EXTRACCION-001  CUARTO MAQUINAS PISO 2"],
[21,"UNIDAD VENTILACION UV-301 PISO 3"],
[21,"UNIDAD EXTRACCION UE-301 PISO 3"],
[21,"UNIDAD DE EXTRACCION-401 PISO 4"],
[21,"PRESURIZACION ESCALERA- PISO 8"],
[21,"UNIDAD DE EXTRACCION-901 PISO 8"],
[21,"PRESURIZACION ESCALERA-PISO 10"],
[21,"UNIDAD DE EXTRACCION-1002 PISO 10"],
[21,"UNIDAD DE VENTILACION-1101A PISO 11"],
[21,"UNIDA DE EXTRACCION-1101A PISO 11"],
[21,"PRESURIZACION ESCALERA-PISO 15 #1"],
[21,"PRESURIZACION ESCALERA- PISO 15 #2"],
[21,"UNIDAD DE EXTRACCION-1201 PISO 15"],
[21,"UNIDAD DE EXTRACCION-1401 PISO 15"],
[21,"PRESURIZACION ESCALERA- PISO 16 #1"],
[21,"PRESURIZACION ESCALERA-PISO 16 #2"],
[21,"PRESURIZACION ESCALERA - PISO 43 #1"],
[15,"MANEJADORA AC 001 PISO 2"],
[15,"MANEJADORA AC 002 PISO 2"],
[15,"MANEJADORA AC 003 PISO 2"],
[15,"MANEJADORA AC 101 PISO 3"],
[15,"MANEJADORA AC 201 PISO 2"],
[15,"MANEJADORA AC 301 PISO 3"],
[15,"MANEJADORA AC 301A PISO 3"],
[15,"MANEJAORA AC 401 PISO 3"],
[15,"MANEJADORA AC 801 PISO 8"],
[15,"MANEJADORA AC 901 PISO 8"],
[15,"MANEJADORA AC 1001 PISO 10A"],
[15,"MANEJADORA AC 1002 PISO 10A"],
[15,"MANEJADORA AC 1003 PISO 10A"],
[15,"MANEJADORA AC 1004 PISO 10A"],
[15,"MANEJADORA AC 1005 PISO 8"],
[15,"MANEJADORA AC 1006 PISO 8"],
[15,"MANEJADORA AC NAVIO PISO 10"],
[15,"MANEJADORA AC GALEON PISO 10 #1"],
[15,"MANEJADORA AC GALEON PISO 10 #2"],
[15,"MANEJADORA AC BALLROOM PISO 10"],
[15,"MANEJADORA AC FRAGATA PISO 10 #1"],
[15,"MANEJADORA AC FRAGATA PISO 10 #2"],
[15,"MANEJADORA AC 1101 PISO 16"],
[15,"MANEJADORA AC 1102 PISO 16"],
[15,"MANEJADORA AC 1103 PISO 16"],
[15,"MANEJADORA AC 1201 PISO 15"],
[15,"MANEJADORA AC 1401 PISO 15"],
[15,"MANEJADORA AC 1402 PISO 15"],
[15,"MANEJADORA AC 1501 PISO 15"],
[15,"MANEJADORA AC 1501 PISO 16"],
[15,"MANEJADORA AC 1502 PISO 16"],
[15,"MANEJADORA AC 1502 PISO 15"],
[15,"RECUPERADORA 1601 PISO 16"],
[15,"MANEJADORA AC 1601 PISO 16"],
[15,"MANEJADORA AC 1602 PISO 16"],
[15,"RECUPERADORA 3301 PISO 33"],
[15,"MANEJADORA AC 3301 PISO 33"],
[15,"MANEJADORA AC 3302 PISO 33"],
[15,"RECUPERADORA PASILLO HABITACIONES NUEVAS  PISO 33"],
[15,"MANEJADORA HABITACIONES NUEVAS PISO 33"],
[15,"MINI SPLIT  TIME KEAPER PISO 0"],
[15,"MINI SPLIT OFICINA DE COMPRAS PISO 0 #1"],
[15,"MINI SPLIT OFICINA DE COMPRAS PISO 0 #2"],
[15,"MINI SPLIT  CUARTO COMUNICACIONES (IDF) PISO 2"],
[15,"MINI SPLIT  SALA DE MONITOREO PISO 2"],
[15,"MINI SPLIT  CUARTO RACK SEGURIDAD Y CONTROL PISO 2"],
[15,"MINI SPLIT  CUARTO ELECTRICO PISO 8"],
[15,"MINI SPLIT  CUARTO ELECTRICO Y UPS PISO 9"],
[15,"MINI SPLIT DATA CENTER PISO 9 #1"],
[15,"MINI SPLIT DATA CENTER PISO 9 #2"],
[15,"MINI SPLIT COCINA FRIA BANQUETES PISO 10"],
[15,"MINI SPLIT BODEGA #1 BANQUETES PISO 10"],
[15,"MINI SPLIT BODEGA #2 BANQUETES PARQUEADERO PISO 10"],
[15,"MINI SPLIT LABORATORIO PISO 12 #1"],
[15,"MINI SPLIT LABORATORIO PISO 12 #2"],
[15,"MINI SPLIT IDF PISO 17"],
[15,"MINI SPLIT IDF PISO 20"],
[15,"MINI SPLIT IDF PISO 23"],
[15,"MINI SPLIT IDF PISO 26"],
[15,"MINI SPLIT IDF PISO 29"],
[15,"MINI SPLIT IDF PISO 32"],
[15,"MINI SPLIT CUARTO DE ASCENSORES PISO 33 #1"],
[15,"MINI SPLIT CUARTO DE ASCENSORES PISO 33 #2"],
[15,"MINI SPLIT CUARTO DE ASCENSORES PISO 43 #1"],
[15,"MINI SPLIT CUARTO DE ASCENSORES PISO 43 #2"],
[15,"CASSETTE  BAR SIGNATURE PISO 12 #1"],
[15,"CASSETTE  BAR SIGNATURE PISO 12 #2"],
[15,"CASSETTE  BAR SIGNATURE PISO 12 #3"],
[15,"CASSETTE COCINA AMACAGUA PISO 12 #1"],
[15,"CASSETTE COCINA AMACAGUA PISO 12 #2"],
[15,"CASSETTE COCINA AMACAGUA PISO 12 #3"],
[15,"CASSETTE GELATERIA PISO 12"],
[15,"VRF KOKAU PISO 11 #1"],
[15,"VRF KOKAU PISO 11 #2"],
[15,"VRF KOKAU PISO 11 #3"],
[15,"AIRE DE PRECISION  DATA CENTER PISO 9 #1"],
[15,"AIRE DE PRECISION  DATA CENTER PISO 9 #2"],
[15,"AIRE DE PRECISION SUB ESTACION PISO 16"],
[15,"AIRE CENTRAL SUB ESTACION PISO 33"],
[15,"AIRE PORTATIL #1 PISO 10"],
[15,"AIRE PORTATIL #2  PISO 10"],
[15,"AIRE PAQUETE SALA 3901"],
[15,"AIRE PAQUETE HABITACION 1 3901"],
[15,"AIRE PAQUETE HABITACION 2 3901"],
[15,"AIRE PAQUETE SALA  3902"],
[15,"AIRE PAQUETE HABITACION 1  3902"],
[15,"AIRE PAQUETE SALA  3903"],
[15,"AIRE PAQUETE HABITACION 1 3903"],
[15,"AIRE PAQUETE HABITACION 2 3903"],
[15,"AIRE PAQUETE SALA 3904"],
[15,"AIRE PAQUETE HABITACION 1 3904"],
[15,"AIRE PAQUETE HABITACION 2 3904"],
[15,"AIRE PAQUETE SALA 3905"],
[15,"AIRE PAQUETE HABITACION 1 3905"],
[15,"AIRE PAQUETE HABITACION 2 3905"],
[15,"AIRE PAQUETE HBAITACION 3 3905"],
[15,"AIRE PAQUETE SALA 3906"],
[15,"AIRE PAQUETE HABITACION 1 3906"],
[15,"AIRE PAQUETE HABITACION 2 3906"],
[15,"AIRE PAQUETE SALA 3907"],
[15,"AIRE PAQUETE HABITACION 1 3907"],
[15,"AIRE PAQUETE SALA 3908"],
[15,"AIRE PAQUETE HABITACION 1 3908"],
[15,"AIRE PAQUETE SALA 4001"],
[15,"AIRE PAQUETE HABITACION 1 4001"],
[15,"AIRE PAQUETE HABITACION 2 4001"],
[15,"AIRE PAQUETE SALA 4002"],
[15,"AIRE PAQUETE HABITACION 1 4002"],
[15,"AIRE PAQUETE SALA 4003"],
[15,"AIRE PAQUETE HABITACION 1 4003"],
[15,"AIRE PAQUETE HABITACION 2 4003"],
[15,"AIRE PAQUETE SALA 4004"],
[15,"AIRE PAQUETE HABITACION 1 4004"],
[15,"AIRE PAQUETE HABITACION 2 4004"],
[15,"AIRE PAQUETE SALA 4005"],
[15,"AIRE PAQUETE HABITACION 1 4005"],
[15,"AIRE PAQUETE HABITACION 2 4005"],
[15,"AIRE PAQUETE HABITACION 3 4005"],
[15,"AIRE PAQUETE SALA 4006"],
[15,"AIRE PAQUETE HABITACION 1 4006"],
[15,"AIRE PAQUETE SALA 4007"],
[15,"AIRE PAQUETE HABITACION 1 4007"],
[15,"AIRE PAQUETE SALA 4008"],
[15,"AIRE PAQUETE HABITACION 1 4008"],
[15,"AIRE PAQUETE SALA 4101"],
[15,"AIRE PAQUETE HABITACION 1 4101"],
[15,"AIRE PAQUETE HABITACION 2 4101"],
[15,"AIRE PAQUETE SALA 4102"],
[15,"AIRE PAQUETE HABITACION 1 4102"],
[15,"AIRE PAQUETE SALA 4103"],
[15,"AIRE PAQUETE HABITACION 1 4103"],
[15,"AIRE PAQUETE HABITACION 2 4103"],
[15,"AIRE PAQUETE SALA 4104"],
[15,"AIRE PAQUETE HABITACION 1 4104"],
[15,"AIRE PAQUETE HABITACION 2 4104"],
[15,"AIRE PAQUETE SALA 4105"],
[15,"AIRE PAQUETE HABITACION 1 4105"],
[15,"AIRE PAQUETE SALA 4106"],
[15,"AIRE PAQUETE HABITACION 1 4106"],
[15,"AIRE PAQUETE HABITACION 2 4106"],
[15,"AIRE PAQUETE SALA 4107"],
[15,"AIRE PAQUETE HABITACION 1 4107"],
[15,"AIRE PAQUETE SALA  4108"],
[15,"AIRE PAQUETE HABITACION 1 4108"],
[15,"AIRE PAQUETE SALA 4109"],
[15,"AIRE PAQUETE HABITACION 1 4109"],
[15,"AIRE PAQUETE SALA 4201"],
[15,"AIRE PAQUETE HABITACION 1 4201"],
[15,"AIRE PAQUETE HABITACION 2 4201"],
[15,"AIRE PAQUETE SALA 4202"],
[15,"AIRE PAQUETE HABITACION 1 4202"],
[15,"AIRE PAQUETE SALA 4203"],
[15,"AIRE PAQUETE HABITACION 1 4203"],
[15,"AIRE PAQUETE HABITACION 2 4203"],
[15,"AIRE PAQUETE SALA 4204"],
[15,"AIRE PAQUETE HABITACION 1 4204"],
[15,"AIRE PAQUETE HABITACION 2 4204"],
[15,"AIRE PAQUETE SALA 4205"],
[15,"AIRE PAQUETE HABITACION 1 4205"],
[15,"AIRE PAQUETE SALA 4206"],
[15,"AIRE PAQUETE HABITACION 1 4206"],
[15,"AIRE PAQUETE HABITACION 2 4206"],
[15,"AIRE PAQUETE SALA 4207"],
[15,"AIRE PAQUETE HABITACION 1 4207"],
[15,"AIRE PAQUETE SALA 4208"],
[15,"AIRE PAQUETE HABITACION 1 4208"],
[15,"AIRE PAQUETE SALA 4209"],
[15,"AIRE PAQUETE HABITACION 1 4209"],
[15,"AIRE PAQUETE PASILLOS HABITACIONES"],
[15,"CORTINA DE AIRE LOBBY PISO 0 #1"],
[15,"CORTINA DE AIRE LOBBY PISO 0 #2"],
[15,"CORTINA DE AIRE LOBBY PISO 0 #3"],
[15,"CORTINA DE AIRE LOBBY PISO 0 #4"],
[15,"CORTINA DE AIRE PISO 10 #1"],
[15,"CORTINA DE AIRE PISO 10 #2"],
[15,"CORTINA DE AIRE BALCON PISO 12 #1"],
[15,"CORTINA DE AIRE BALCON PISO 12 #2"],
[15,"CORTINA DE AIRE BALCON PISO 12 #3"],
[15,"CORTINA DE AIRE BALCON PISO 12 #4"],
[15,"CORTINA DE AIRE RITUAL 12"],
[15,"CORTINA DE AIRE GELATERIA #1"],
[15,"CORTINA DE AIRE GELATERIA #2"],
[15,"CORTINA DE AIRE GELATERIA #3"],
[15,"CORTINA DE AIRE GELATERIA #4"],
[15,"CHILLER # 1 PISO 16"],
[15,"CHILLER # 2 PISO 16"],
[15,"CHILLER PISO 33 MODULAR #1"],
[15,"CHILLER PISO 33 MODULAR #2"],
[15,"CHILLER PISO 33 MODULAR #3"],
[15,"CHILLER PISO 33 MODULAR #4"],
[15,"CHILLER PISO 33 MODULAR #5"],
[15,"CHILLER PISO 33 MODULAR #6"],
[15,"CHILLER PISO 33 MODULAR #7"],
[15,"TORRE ENFRIAMIENTO PISO 33 #1"],
[15,"TORRE ENFRIAMIENTO PISO 33 #2"],
[15,"TORRE ENFRIAMIENTO RESIDENCIAS  PISO 43 #1"],
[15,"TORRE ENFRIAMIENTO RESIDENCIAS  PISO 43 #2"],
[15,"TORRE ENFRIAMIENTO HABITACIONES NUEVAS  PISO 43 #1"],
[15,"TORRE ENFRIAMIENTO HABITACIONES NUEVAS  PISO 43 #2"],
[15,"CUARTO FRIO MT FLORES PISO 0"],
[15,"CUARTO FRIO MT BASURA PISO 0"],
[15,"CUARTO FRIO MT REFRIGERADA PISO 3"],
[15,"CUARTO FRIO BT PESCADOS PISO 3A"],
[15,"CUARTO FRIO MT FRUTAS PISO 3A"],
[15,"CUARTO FRIO MT VERDURAS 3A"],
[15,"CUARTO FRIO BT CARNES 3A"],
[15,"CUARTO FRIO MT CARNES 3A"],
[15,"CUARTO FRIO BT AVES 3A"],
[15,"CUARTO FRIO MT AVES 3A"],
[15,"CUARTO FRIO MT REFRIGERADA 3A"],
[15,"CUARTO FRIO MT HUEVO 3A"],
[15,"CUARTO FRIO MT PASTELES 3A"],
[15,"CUARTO FRIO BT PASTELES 3A"],
[15,"CUARTO FRIO BT GENERAL 3A"],
[15,"CUARTO FRIO MT BEBIDAS 3A"],
[15,"CUARTO FRIO MT BANQUETES P10"],
[15,"CUARTO FRIO MT PREPARACION P10"],
[15,"CUARTO FRIO MT GENERAL P10"],
[15,"CUARTO FRIO MT BEBIDAS P10"],
[15,"CUARTO FRIO MT REFRIGERADA P11"],
[15,"CUARTO FRIO MT REFRIGERADA P12"],
[15,"MAQUINA DE HIELO PISO 3A FRAPE"],
[15,"MAQUINA DE HIELO PISO 3A CUBOS"],
[15,"MAQUINA DE HIELO PISO 10"],
[15,"MAQUINA DE HIELO PISO 11 FRAPEE"],
[15,"MAQUINA DE HIELO PISO 11 CUBOS"],
[15,"MAQUINA DE HIELO SIGNATURE PISO 11 CUBOS"],
[15,"MAQUINA DE HIELO COCINA AMACAGUA  PISO 12"],
[15,"MAQUINA DE HIELO RITUAL 12 PISO 12"],
[15,"MAQUINA DE HIELO POOL BAR PISO 12"],
[15,"MAQUINA DE HIELO CHIRINGUITO PISO 14"],
[15,"MAQUINA DE HIELO PISO 17"],
[15,"MAQUINA DE HIELO PISO 18"],
[15,"MAQUINA DE HIELO PISO 20"],
[15,"MAQUINA DE HIELO PISO 22"],
[15,"MAQUINA DE HIELO PISO 24"],
[15,"MAQUINA DE HIELO PISO 26"],
[15,"MAQUINA DE HIELO PISO 28"],
[15,"MAQUINA DE HIELO PISO 29"],
[15,"MAQUINA DE HIELO PISO 30"],
[15,"MAQUINA DE HIELO PISO 31"],
[15,"MAQUINA DE HIELO PISO 34"],
[15,"MAQUINA DE HIELO PISO 36"],
[15,"MAQUINA DE HIELO PISO 38"],
[15,"NEVERA VERTICAL PISO 3"],
[15,"NEVERA DE CONSERVACION PISO 3"],
[15,"NEVERA DE CONGELACION PISO 3"],
[15,"NEVERA DE ENSALADA  PISO 3"],
[15,"NEVERA DE JUGOS PISO 3"],
[15,"NEVERA DE CONSERVACION PISO 3A"],
[15,"NEVERA DE CONSERVACION CARNES PISO 3A"],
[15,"NEVERA DE CONGELACION PISO 3A"],
[15,"ULTRACONGELADOR PISO 3A"],
[15,"NEVERA DE CONGELACION PESCADO PISO 3A"],
[15,"NEVERA DE CONSERVACION FRUTAS Y VERDURAS PISO 3A"],
[15,"NEVERA DE CONSERVACION POLLOS PISO 3A"],
[15,"NEVERA DE CONGELACION 2 PUERTAS TRUE PISO 10"],
[15,"NEVERA CONSERVACION COCINA CALIENTE  PISO 10 #1"],
[15,"NEVERA CONSERVACION COCINA CALIENTE  PISO 10 #2"],
[15,"NEVERA DE CONSERVACION  PROTEINA PISO 10"],
[15,"NEVERA DE REFRIGERACION COCINA FRIA PISO 10"],
[15,"NEVERA DE CONSERVACION COCINA BANQUETES PISO 10"],
[15,"NEVERA DE CONSERVACION TRUE BANQUETES PISO 10"],
[15,"NEVERA DE CONSERVACION PISO 11 #1"],
[15,"piso 12"],
[15,"NEVERA DE CONSERVACION PEQUEÑA PISO 11 #2"],
[15,"NEVERA DE CONGELACION PEQUEÑA PISO 11 #3"],
[15,"NEVERA HORIZONTAL CONSERVACION PROTEINAS  PISO 11 #4"],
[15,"NEVERA HORIZONTAL  CONSERVACION GUARNICIONES PISO 11#5"],
[15,"NEVERA VERTICAL DE JUGOS  PISO 11 #6"],
[15,"NEVERA VERTICAL 2 PUERTAS DE REFRIGERACION PISO 11 #7"],
[15,"NEVERA PEQUEÑA DE REFRIGERACION HORIZONTAL PISO 11 #8"],
[15,"NEVERA CONSERVACION HORIZONTAL COCINA FRIA PISO 11 #9"],
[15,"NEVERA CONGELACION HORIZONTAL COCINA FRIA PISO 11 #10"],
[15,"NEVERA VERTICAL TRUE PISO 11 #11"],
[15,"NEVERA VERTICAL LICORES ROOMSERVICE PISO 11 #12"],
[15,"NEVERA VERTICAL GASEOSAS ROOM SERVICE PISO 11 #13"],
[15,"NEVERA CONSERVACION HORIZONTA ROOM SERVICE PISO 11 #14"],
[15,"NEVERA CONSERVACION HORIZONTAL ROOM SERVICE PISO 11 #15"],
[15,"NEVERA DE CONGELACION PEQUEÑA ROOM SERVICE PISO 11 #16"],
[15,"NEVERA DE CONSERVACION SHOW CHIQUEN  PISO 11 #17"],
[15,"NEVERA DE CONSERVACION SHOW CHIQUEN  PISO 11 #18"],
[15,"NEVERA DE CONSERVACION SHOW CHIQUEN  PISO 11 #19"],
[15,"NEVERA DE CONSERVACION SHOW CHIQUEN  PISO 11 #20"],
[15,"NEVERA DE REFRIGERACION BAR SIGNATURE PISO 11#21"],
[15,"NEVERA DE EXHIBICON PISO 12"],
[15,"NEVERA DE VINOS #1 PISO 12"],
[15,"NEVERA DE VINOS #2 PISO 12"],
[15,"NEVERA DE CONGELACION HORIZONTAL  AMACAGUA PISO 12"],
[15,"NEVERA DE CONSERVACION HORIZONTAL AMACAGUA  PISO 12"],
[15,"NEVERA VERTICAL DE CONGELACION AMACAGUA  PISO 12"],
[15,"NEVERA DE PROTEINA HORIZONTAL AMACAGUA  PISO 12"],
[15,"NEVERA HORIZONTAL AMACAGUA  PISO 12"],
[15,"NEVERA EXHIBICION DE POSTRES COFFE PISO 12"],
[15,"NEVERA DE GASEOSAS COFFE PISO 12"],
[15,"NEVERA DE CONSERVACION COFFE PISO 12"],
[15,"NEVERA DE VINO PERLIK COFFE PISO 12"],
[15,"NEVERA DE VINO PERLIK #2 COFFE PISO 12"],
[15,"NEVERA CONGELACION POOL BAR PISO 12"],
[15,"ULTRACONGELADOR INFINITY GELATERIA  PISO 12"],
[15,"NEVERA CONGELACION TRUE GELATERIA  PISO 12"],
[15,"EXHIBIDOR DE HELADOS GELATERIA PISO 12 #1"],
[15,"EXHIBIDOR DE HELADOS GELATERIA PISO 12 #2"],
[15,"NEVERA ELECTROLUX GELATERIA PISO 12"],
[15,"NEVERA IMBERA REFRIGERACION VR20 LABORATORIO PISO 12 #1"],
[15,"NEVERA IMBERA REFRIGERACION VR20 LABORATORIO PISO 12 #2"],
[15,"NEVERA IMBERA CONGELACION CV18 LABORATORIO PISO 12"],
[15,"NEVERA KELVINATOR HORIZONTAL REFRIGERACION LABORATORIO PISO 12"],
[15,"NEVERA CONSERVACION CHIRINGUITO PISO 14 #1"],
[15,"NEVERA CONSERVACION CHIRINGUITO PISO 14 #2"],
[15,"NEVERA CONSERVACION CHIRINGUITO PISO 14 #3"],
[15,"NEVERA VERTICAL PISO 30 #1"],
[15,"NEVERA VERTICAL PISO 30 #2"],
[15,"NEVERA HORIZONTAL  PISO 30 #3"],
[15,"NEVERA HORIZONTAL  PISO 30 #4"],
[15,"NEVERA HORIZONTAL  PISO 30 #5"],
[15,"NEVERA HORIZONTAL  PISO 30 #6"],
[15,"NEVERA DISPENSADORA DE AGUA OFICINA DE COMPRAS PISO 0"],
[15,"NEVERA DISPENSADORA DE AGUA PISO 1"],
[15,"NEVERA DISPENSADORA DE AGUA PISO 2"],
[15,"NEVERA DISPENSADORA DE AGUA PISO 3"],
[15,"NEVERA DISPENSADORA DE AGUA ESTIGUAR PISO 3A"],
[15,"NEVERA DISPENSADORA DE AGUA PANADERIA PISO 3A"],
[15,"NEVERA DISPENSADORA DE AGUA PISO 4"],
[15,"NEVERA DISPENSADORA DE AGUA CONTABILIDAD PISO 9"],
[15,"NEVERA DISPENSADORA DE AGUA VENTAS PISO 9"],
[15,"NEVERA DISPENSADORA DE AGUA COCINA PISO 10"],
[15,"NEVERA DISPENSADORA DE AGUA VENTAS PISO 10"],
[15,"NEVERA DISPENSADORA DE AGUA COCINA PISO 11"],
[15,"NEVERA DISPENSADORA DE AGUA COCINA PISO 12"],
[15,"NEVERA DISPENSADORA DE AGUA RECEPCION PISO 12"],
[15,"NEVERA DISPENSADORA DE AGUA GIMNASIO PISO 14"],
[26,"TABLERO ELECTRICO BOMBA DE AGUA POTABLE 440V PISO 0"],
[26,"TABLERO ELECTRICO BOMBA DE AGUA CONTRAINCENDIO 440V PISO 0"],
[26,"TABLERO ELECTRICO CONDENSADORAS CUARTOS FRIOS 220V PISO 0"],
[26,"TABLERO ELECTRICO OFICINA DE COMPRAS  220 V PISO 0"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 0"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 0"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 0"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 1"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 1"],
[26,"TABLERO ELECTRICO TALLERES PISO 1"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 2"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 2"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 2"],
[26,"TABLERO ELECTRICO CONDENSADORAS CUARTOS FRIOS 220V PISO 2"],
[26,"TABLERO ELECTRICO CUARTO DE UNIFORMES 220V PISO 2"],
[26,"TABLERO ELECTRICO MANEJADORAS 440V PISO 2"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 3"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 3"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 3"],
[26,"TABLERO ELECTRICO COCINAS HAMACAS 220V PISO 3 #1"],
[26,"TABLERO ELECTRICO COCINAS HAMACAS 220V PISO 3 #2"],
[26,"TABLERO ELECTRICO MANEJADORAS 440V PISO 3"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 3A"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 3A"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 3A"],
[26,"TABLERO ELECTRICO PANADERIA 220V PISO 3A #1"],
[26,"TABLERO ELECTRICO PANADERIA 220V PISO 3A #2"],
[26,"TABLERO ELECTRICO PANADERIA 220V PISO 3A #3"],
[26,"TABLERO ELECTRICO PANADERIA 220V PISO 3A #4"],
[26,"TABLERO ELECTRICO PANADERIA 220V PISO 3A #5"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 4"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 4"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 4"],
[26,"TABLERO ELECTRICO LAVANDERIA 220V PISO 4 #1"],
[26,"TABLERO ELECTRICO LAVANDERIA 440V PISO 4 #2"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 8"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 8"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 8"],
[26,"TABLERO ELECTRICO BOMBA DE AGUA POTABLE 220V PISO 8"],
[26,"TABLERO ELECTRICO MANEJADORAS 440V PISO 8"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 9"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 9"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 10"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 10"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 10"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 10 #1"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 10 #2"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 10 #3"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 10 #4"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 10 #5"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 11"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 11"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 11"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 11 #1"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 11 #2"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 11 #3"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 11 #4"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 11 #5"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 11"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 12"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 12"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 12"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 12 #1"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 12 #2"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 12 #3"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 12 #4"],
[26,"TABLERO ELECTRICO COCINAS 220V PISO 12 #5"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 12 #1"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 12 #2"],
[26,"TABLERO ELECTRICO EVENTOS 220V PISO 12 #3"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 14"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 14"],
[26,"TABLERO ELECTRICO TURCO MASCULINO 220V PISO 14"],
[26,"TABLERO ELECTRICO TURCO FEMENINO 220V PISO 14"],
[26,"TABLERO ELECTRICO GENERAL REGULADO PISO 15"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 15"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 16"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 16"],
[26,"TABLERO ELECTRICO MANEJADORAS 440V PISO 16 #1"],
[26,"TABLERO ELECTRICO PRINCIPAL CHILLER 440V PISO 16 #2"],
[26,"TABLERO ELECTRICO CHILLER 1  440V PISO 16 #3"],
[26,"TABLERO ELECTRICO CHILLER 2 440V PISO 16 #4"],
[26,"TABLERO ELECTRICO BOMBAS 440V PISO 16 #5"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA 220V PISO 16 #1"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA 220V PISO 16 #2"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA 440V PISO 16 #1"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA 440V PISO 16 #2"],
[26,"TABLERO ELECTRICO BANCO DE CONDENSADORES 220V PISO 16"],
[26,"TABLERO ELECTRICO BANCO DE CONDENSADORES 440V PISO 16"],
[26,"TABLERO ELECTRICO CUARTO DE ASCENSORES 440V PISO 16"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 17"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 17"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 17"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 18"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 18"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 19"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 19"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 20"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 20"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 20"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 21"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 21"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 22"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 22"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 23"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 23"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 23"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 24"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 24"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 25"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 25"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 26"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 26"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 26"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 27"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 27"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 28"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 28"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 29"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 29"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 29"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 30"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 30"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 31"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 31"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 32"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 32"],
[26,"TABLERO ELECTRICO REGULADO 220V PISO 32"],
[26,"TABLERO DE CONTROL PLANTA DE TRATAMIENTO DE AGUA PISO 32"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 33"],
[26,"TABLERO ELECTRICO GENERAL 440V PISO 33"],
[26,"TABLERO ELECTRICO TORRES ENFRIAMIENTO 440V PISO 33 #1"],
[26,"TABLERO ELECTRICO PRINCIPAL MULTICHILLER 220V PISO 33 #2"],
[26,"TABLERO ELECTRICO BOMBAS DE AGUA FRIA 220V PISO 33 #3"],
[26,"TABLERO ELECTRICO MENJADORA Y RECUPERADORA HABITACIONES NUEVAS  220V PISO 33 #4"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA 220V PISO 33 #1"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA RESIDENCIAS 220V PISO 33 #2"],
[26,"TABLERO ELECTRICO SUB ESTACION ELECTRICA ZONAS COMUNES 220V PISO 33 #3"],
[26,"TABLERO ELECTRICO BANCO DE CONDENSADORES 220V PISO 33"],
[26,"TABLERO ELECTRICO CUARTO DE ASCENSORES 440V PISO 33"],
[26,"TABLERO ELECTRICO DE BOMBAS AGUA POTABLE 440V PISO 33"],
[26,"TABLERO ELECTRICO DE BOMBA CONTRAINCENDIO HYATT  PISO 33"],
[26,"TABLERO ELECTRICO DE BOMBA CONTRAINCENDIO RENTAL  PISO 33"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 34"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 34"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 35"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 35"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 36"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 36"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 37"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 37"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 38"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 38"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 39"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 39"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 40"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 40"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 41"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 41"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 42"],
[26,"TABLERO ELECTRICO HABITACIONES 220V PISO 42"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 43 #1"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 43 #2"],
[26,"TABLERO ELECTRICO GENERAL 220V PISO 43 #3"],
[26,"TABLERO ELECTRICO TORRES ENFRIAMIENTO HABITACIONES NUEVAS 220V PISO 43 #1"],
[26,"TABLERO ELECTRICO TORRES ENFRIAMIENTO RESIDENCIAS 220V PISO 43 #2"],
[26,"TABLERO ELECTRICO BOMBAS DE AGUA 220V PISO 43 #3"],
[26,"TABLERO ELECTRICO LUCES AVISO PLAYA  220V PISO 43 #4"],
[26,"TABLERO ELECTRICO LUCES AVISOS BAHIA 220V PISO 43 #5"],
[26,"UPS TOTEM PISO 0"],
[26,"UPS PISO 2"],
[26,"UPS PISO 9 #1"],
[26,"UPS PISO 9 #2"],
[26,"UPS TOTEM PISO 10"],
[26,"UPS TOTEM PISO 11"],
[26,"UPS TOTEM PISO 12"],
[26,"UPS CUARTO DE ASCENSORES PISO 33"],
[26,"UPS CUARTO ELECTRICO PISO 36"],
[26,"UPS CUARTO ELECTRICO PISO41"],
[26,"UPS CUARTO DE ASCENSORES PISO 43"],
[26,"GENARADOR ELECTRICO CUMMINS PISO 16 #1"],
[26,"GENARADOR ELECTRICO CUMMINS PISO 16 #2"],
[26,"GENARADOR ELECTRICO PERKINS PISO 33 #3"],
[26,"GENARADOR ELECTRICO ZONAS COMUNES PISO 33 #4"],
[26,"GENARADOR ELECTRICO RECIDENCIAS PISO 33 #5"],
[26,"CAMBIO DE INSUMOS GENERADOR ELECTRICO ( REFRIGERANTE, ACEITE, FILTROS DE AIRE ACEITE, CORREAS) PISO 33 #3"],
[26,"CAMBIO DE INSUMOS GENERADOR ELECTRICO ( REFRIGERANTE, ACEITE, FILTROS DE AIRE ACEITE, CORREAS) PISO 33 #4"],
[26,"TRANSFORMADOR PISO 16 #1"],
[26,"TRANSFORMADOR PISO 16 #2"],
[26,"TRANSFORMADOR PISO 16 #3"],
[26,"TRANSFORMADOR PISO 16 #4"],
[26,"TRANSFORMADOR PISO 16 #5"],
[26,"TRANSFORMADOR  PISO 33 #1"],
[26,"TRANSFORMADOR  PISO 33 #2"],
[26,"TRANSFORMADOR  PISO 33 #3"],
[26,"TRANSFORMADR SECO PISO 33"],
[26,"TRANSFORMADOR SECO PISO 43"],
[26,"SISTEMA RED PARARRAYOS"],
[8,"CAMINADORA 1"],
[8,"CAMINADORA 2"],
[8,"CAMINADORA 3"],
[8,"CAMINADORA 4"],
[8,"CAMINADORA 5"],
[8,"ELÍPTICA 1"],
[8,"ELÍPTICA 2"],
[8,"BICICLETA 1"],
[8,"BICICLETA 2"],
[8,"BICILETA CONSOLA"],
[8,"MULTIFUERZA 1"],
[8,"MULTIFUERZA 2 VERTIICAL"],
[11,"MAQUINA DE COSER PLANA SINGER PISO 2 #1"],
[11,"MAQUINA DE COSER PLANA SINGER PISO 2 #2"],
[11,"MAQUINA DE COSER PLANA SINGER PISO 2 #3"],
[11,"MAQUINA DE COSER PLANA SINGER PISO 4 #4"],
[11,"MAQUINA FILETEADORA SINGER PISO 2"],
[11,"MAQUINA FILETEADORA SEWKING PISO 2"],
[11,"MAQUINA CORTADORA PISO 2"],
[11,"LAVADORA FAGOR 60K PISO 4 #1"],
[11,"LAVADORA FAGOR 60K PISO 4 #2"],
[11,"LAVADORA FAGOR 40K PISO 4 #3"],
[11,"LAVADORA MILLNOR PISO 4 #4"],
[11,"LAVADORA MILLNOR PISO 4 #5"],
[11,"LAVASECO PISO 4 #6"],
[11,"LAVADORA FAGOR 18K PISO 4 #7"],
[11,"SECADORA MILLNOR PISO 4 #1"],
[11,"SECADORA FAGOR 60K PISO 4 #2"],
[11,"SECADORA FAGOR 35K PISO 4 #3"],
[11,"SECADORA FAGOR 45K PISO 4 #4"],
[11,"SECADORA FAGOR 18K PISO 4 #5"],
[11,"SECADORA MILLNOR PISO 4 #6"],
[11,"CALANDRA-RODILLO PISO 4"],
[11,"PRENSA DE PLANCHADO PISO 4 #1"],
[11,"PRENSA DE PLANCHADO PISO 4 #2"],
[11,"PRENSA DE PLANCHADO PISO 4 #3"],
[11,"MANIQUI DE CAMISAS PISO 4"],
[11,"MESA DE REPASO PISO 4 #1"],
[11,"MESA DE REPASO PISO 4 #2"],
[11,"COLUMNA DE LAVADO PISO 4"],
[11,"PLANCHA DE CUELLO PISO 4"],
[11,"COMPRESOR PISO 4"],
[13,"FILTRO DE AGUA DISPENSADORA DE AGUA PISO 1"],
[13,"FILTRO DE AGUA DISPENSADORA DE AGUA PISO 2"],
[13,"FILTRO DE AGUA GRECA PISO 3"],
[13,"FILTRO DE AGUA DISPENSADORA DE AGUA PISO 3A"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO FRAPE PISO 3A"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO CUBOS PISO 3A"],
[13,"FILTRO DE AGUA DISPENSADORA DE AGUA PISO 9 #1"],
[13,"FILTRO DE AGUA DISPENSADORA DE AGUA PISO 9 #2"],
[13,"FILTRO DE AGUA HORNO RACIONAL  PISO 10 #1"],
[13,"FILTRO DE AGUA HORNO RACIONAL  PISO 10 #2"],
[13,"FILTRO DE AGUA GRECA BANQUETES PISO 10 #3"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 10 #4"],
[13,"FILTRO DE AGUA GRECA ROOM SERVICE PISO 11 #1"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO FRAPE PISO 11 #2"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO CUBOS  PISO 11 #3"],
[13,"FILTRO DE AGUA CAFETERA KOKAU PISO 11 #4"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO SIGNATURE  PISO 11 #5"],
[13,"FILTRO DE AGUA GRECA RITUAL 12 PISO 12 #1"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO CUBOS AMACAGUA  PISO 12 #2"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO RITUAL 12  PISO 12 #3"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO POOL BAR  PISO 12 #4"],
[13,"FILTRO DE AGUA DISPENSADOR DE AGUA GIMNASIO  PISO 14 #1"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO CHIRINGUITO  PISO 14 #2"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 16 #1"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 16 #2"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 16 #3"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 17"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 18"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 20"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 22"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 24"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 26"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 28"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 29"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 30"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 31"],
[13,"CARTUCHO DE CARBÓN ACTIVADO GRANULAR 20” PISO 32"],
[13,"CARTUCHO DE CARBÓN ACTIVADO EN BLOQUE 20” PISO 32"],
[13,"CARTUCHO DE POLIPROPILENO X 1 MICRA 20 PISO 32"],
[13,"RO-3 MEMBRANA DE ÓSMOSIS INVERSA HIFLX 600 GPD X 4 UNDS PISO 32"],
[13,"CARTUCHO CARBÓN ACTIVADO EN BLOQUE PISO 32"],
[13,"CARTUCHO SEDIMENTOS X 1 MICRA PISO 32"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 34"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 36"],
[13,"FILTRO DE AGUA MAQUINA DE HIELO PISO 38"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 43 #1"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 43 #2"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 43 #3"],
[13,"FILTRO DE AGUA SISTEMA DE ENFRIMIENTO SELLO MECANICO BOMBA DE CONDENSADO PISO 43 #4"],
[16,"ILUMINACION AVISOS LADO PLAYA PISO 43"],
[16,"ILUMINACION AVISOS LADO BAHIA PISO 43"],
[16,"ILUMINACION REFLECTORES PISCINAS PISO 16"],
[16,"CONTROL Y PROGRAMACÓN REFLECTORES DE PISCINA PISO 16"],
[16,"CONTROL Y PROGRAMACÓN REFLECTORES DE PISCINA PISO 11"],
[16,"ILUMINACIÓN INTERNA"],
[5,"DIVISIONES ACUSTICAS SALON REGENCY #1"],
[5,"DIVISIONES ACUSTICAS SALON REGENCY #2"],
[5,"DIVISIONES ACUSTICAS SALON FRAGATA #1"],
[5,"DIVISIONES ACUSTICAS SALON FRAGATA #2"],
[5,"SELLOS EMPAQUES Y CIERRES"],
[10,"ESTUFAS 6 PUESTOS PISO 3"],
[10,"ESTUFA TIPO PLANCHA PISO 3"],
[10,"SARTEN BASCULANTE PISO 3"],
[10,"HORNO COMBI FAGOR PISO 3"],
[10,"REBANADORA PISO 3"],
[10,"HORNOS COMBI PISO 3"],
[10,"FREIDORA PISO 3"],
[10,"CARRITO CALIENTE MANTENEDOR PISO 3"],
[10,"LICUADORA PISO 3"],
[10,"CUBA BAÑO DE MARIA PISO 3"],
[10,"CAFETERA PISO 3"],
[10,"CALENTADOR DE COMIDA PISO 3"],
[10,"MIXER PISO 3"],
[10,"CALENTADOR DE PLATOS PISO 3"],
[10,"LAVAVAJILLAS PISO 3"],
[10,"HORNO DE CARRO ROTATORIO PISO 3A"],
[10,"AMAZADORA DE BRAZO PISO 3A"],
[10,"AMAZADORA DE BRAZO PEQUEÑA PISO 3A"],
[10,"AMAZADORA DE BRAZO GRANDE PISO 3A"],
[10,"CAMARA DE FERMENTACION DIRECTA PISO 3A"],
[10,"PARRILLA DE CILINDRO DE CARBON PISO 3A"],
[10,"EMPACADORA DE VACIO PISO 3A"],
[10,"ESTUFAS 2 PUESTOS PISO 3A"],
[10,"LAMINADORA PISO 3A"],
[10,"HORNO ELECTRICO SALVA PISO 3A"],
[10,"CUBA BAÑO MARIA CON AGUA - PANADERIA PISO 3A"],
[10,"HORNOS RACIONAL PISO 10 #1"],
[10,"HORNOS RACIONAL PISO 10 #2"],
[10,"ESTUFAS 6 PUESTOS PISO 10 #1"],
[10,"ESTUFAS 6 PUESTOS PISO 10 #2"],
[10,"ESTUFA TIPO PLANCHA PISO 10"],
[10,"ESTUFA FREIDORA PISO 10 #1"],
[10,"ESTUFA FREIDORA PISO 10 #2"],
[10,"SARTEN BASCULANTE PISO 10"],
[10,"MARMITA BASCULANTE PISO 10"],
[10,"PARRILLA PISO 10"],
[10,"ESTUFA BARBACOA PISO 10"],
[10,"HORNO DE ESTUFA PISO 10"],
[10,"REBANADORA PISO 10"],
[10,"LICUADORA PISO 10"],
[10,"LAVAVAJILLAS PISO 10"],
[10,"CARRITO CALIENTE MANTENEDOR PISO 10"],
[10,"MIXER PISO 10"],
[10,"EMPACADORA DE VACIO PISO 10"],
[10,"ESTUFAS 6 PUESTOS PISO 11"],
[10,"ESTUFA TIPO PLANCHA PISO 11"],
[10,"PARRILLA PISO COCINA CALIENTE 11"],
[10,"HORNOS COMBI PISO 11"],
[10,"ESTUFA BARBACOA PISO 11"],
[10,"ESTUFA SHOW KITCHEN PISO 11"],
[10,"GRATINADOR PISO 11"],
[10,"FREIDORA PISO 11 #1"],
[10,"FREIDORA PISO 11 #2"],
[10,"FREIDORA SHOW KITCHEN PISO 11 #3"],
[10,"FREIDORA SHOW KITCHEN PISO 11 #4"],
[10,"LICUADORA PISO 11"],
[10,"REBANADORA PISO 11"],
[10,"LAVAVAJILLAS PISO 11"],
[10,"CALENTADOR DE PLATO PISO 11"],
[10,"CAFETERA PISO 11"],
[10,"GRECA DE AGUA  PISO 11"],
[10,"EMPACADORA DE VACIO PISO 11"],
[10,"CARRITO CALIENTE MANTENEDOR PISO 11"],
[10,"MIXER PISO 11"],
[10,"HORNO MICROHONDAS PISO 11"],
[10,"WAFLERA PISO 11 #1"],
[10,"WAFLERA PISO 11 #2"],
[10,"TOSTADORA SHOW KITCHEN PISO 11"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 1"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 2"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 3"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 4"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 5"],
[10,"ANAFE DE INDUCCION SHOW KITCHEN PISO 11 # 6"],
[10,"DESHIDRATADOR ROOM SERVICE PISO 11 #1"],
[10,"DESHIDRATADOR SIGNATURE PISO 11 #2"],
[10,"ESTUFA TIPO PLANCHA PISO 12"],
[10,"PARRILLA PISO 12"],
[10,"ESTUFA FREIDORA PISO 12 #1"],
[10,"ESTUFA FREIDORA PISO 12 #2"],
[10,"ESTUFA DE 4 PUESTOS PISO 12"],
[10,"GRATINADOR PISO 12"],
[10,"LICUADORA PISO 12"],
[10,"EMPACADORA DE VACIO PISO 12"],
[10,"LAVAVAJILLAS PISO 12"],
[10,"DESHIDRATADOR LABORATORIO PISO 12 #1"],
[10,"DESHIDRATADOR LABORATORIO PISO 12 #2"],
[10,"LICUADORA VIMAMIX INDUSTRIAL LABORATORIO PISO 12 #1"],
[10,"LICUADORA VIMAMIX INDUSTRIAL LABORATORIO PISO 12 #2"],
[10,"LICUADORA VIMAMIX INDUSTRIAL LABORATORIO PISO 12 #3"],
[10,"COMPACTADORA HELADO GELATERIA PISO 12"],
[10,"MALTEADORA GELATERIA PISO 12"],
[10,"BAÑO MARIA GELATERIA PISO 12"],
[10,"MAQUINA DE CAFÉ GELATERIA PISO 12"],
[10,"HORNO MICROHONDAS GELATERIA PISO 12"],
[10,"ANAFE DE INDUCCION PISO 30 # 1"],
[10,"ANAFE DE INDUCCION PISO 30 # 2"],
[10,"ANAFE DE INDUCCION PISO 30 # 3"],
[10,"ANAFE DE INDUCCION PISO 30 # 4"],
[10,"LAVAVAJILLAS PISO 30"],
[10,"TOSTADORA DE PAN PISO 30"],
[10,"PARILLA TORTADORA DE PAN PISO 30"],
[2,"GRAMERA COCINA"],
[2,"BALANZA COCINA"],
[2,"BÁSCULA GYM"],
[2,"BÁSCULA RECIBO MERCADERÍA"],
[2,"CALIBRACIÓN TERMÓMETROS COCINA"],
[6,"CAMPANA INYECCION PISO 3"],
[6,"CAMPANA EXTRACCION PISO 3"],
[6,"LIMPIEZA DUCTOS  PISO 3"],
[6,"CAMPANA INYECCION PISO 3A"],
[6,"CAMPANA DE EXTRACCION PISO 3A"],
[6,"LIMPIEZA DUCTOS  PISO 3A"],
[6,"CAMPANA DE EXTRACCION BANQUETES PISO 10"],
[6,"CAMPANA INYECCION BANQUETES PISO 10"],
[6,"LIMPIEZA DUCTOS  PISO 10"],
[6,"CAMPANA EXTRACCION COCINA SHOWS PISO 11"],
[6,"CAMPANA INYECCION COCINA SHOWS PISO 11"],
[6,"CAMPANA EXTRACCION COCINA CALIENTE PISO 11"],
[6,"CAMPANA INYECCION COCINA CALIENTE PISO 11"],
[6,"LIMPIEZA DUCTOS  PISO 11"],
[6,"LIMPIEZA DUCTOS COCINA SHOWS PISO 11"],
[6,"CAMPANA INYECCION PISO 12"],
[6,"CAMPANA DE EXTRACCION PISO 12"],
[6,"LIMPIEZA DUCTOS  PISO 12"],
[23,"MTTO  VÁLVULAS,  MEDIDORES, TUBOS."],
[9,"TANQUE DE AGUA CONTRAINCENDIO PISO 0"],
[9,"TANQUE DE AGUA PISO 8"],
[9,"TANQUE DE AGUA PISCINA RECREACIONAL PISO 11A"],
[9,"TANQUE DE AGUA PISCINA EJERCICIO PISO 11A"],
[9,"TANQUE DE AGUA CRUDA PLANTA EMBOTELLADORA PISO 32"],
[9,"TANQUE DE AGUA TRATADA PLANTA EMBOTELLADORA PISO 32"],
[9,"TANQUE DE SALMUERA PLANTA EMBOTELLADORA PISO 33"],
[9,"TANQUE DE AGUA PISO 33"],
[9,"TANQUE DE AGUA PISO 42"],
[9,"BOMBA DE AGUA POTABLE PISO 0 #1"],
[9,"BOMBA DE AGUA POTABLE PISO 0 #2"],
[9,"BOMBA DE AGUA CONTRAINCENDIO PISO 0 #1"],
[9,"BOMBA DE AGUA CONTRAINCENDIO PISO 0 #2"],
[9,"BOMBA CALDERA PISO 4"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 8 #1"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 8 #2"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 8 #3"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE PISO 8 #1"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE PISO 8 #2"],
[9,"BOMBA TANQUE AGUA CALIENTE PISO 8 #1"],
[9,"BOMBA DE CONDENSACION PISO 16 #1"],
[9,"BOMBA DE CONDENSACION PISO 16 #2"],
[9,"BOMBA DE CONDENSACION PISO 16 #3"],
[9,"BOMBA DE AGUA FRIA PISO 16 #1"],
[9,"BOMBA DE AGUA FRIA PISO 16 #2"],
[9,"BOMBA DE AGUA FRIA PISO 16 #3"],
[9,"BOMBA DE AGUA FRIA PISO 16 #4"],
[9,"BOMBA DE AGUA FRIA PISO 16 #5"],
[9,"BOMBA DE AGUA PLANTA DE AGUA PISO 32 #1"],
[9,"BOMBA DE AGUA PLANTA DE AGUA PISO 32 #2"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 33 #1"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 33 #2"],
[9,"BOMBA DE AGUA TANQUE POTABLE PISO 33 #3"],
[9,"BOMBA TANQUE AGUA CALIENTE PISO 33 #1"],
[9,"BOMBA TANQUE AGUA CALIENTE PISO 33 #2"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE PISO 33 #1"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE PISO 33 #2"],
[9,"BOMBA TANQUE AGUA CALIENTE HABITACIONES NUEVAS PISO 33 #1"],
[9,"BOMBA TANQUE AGUA CALIENTE HABITACIONES NUEVAS PISO 33 #2"],
[9,"BOMBA RECIRCULACION AGUA CALIENTE HABITACIONES NUEVAS PISO 33 #1"],
[9,"BOMBA RECIRCULACION AGUA CALIENTE HABITACIONES NUEVAS PISO 33 #2"],
[9,"BOMBA DE AGUA FRIA PISO 33 #1"],
[9,"BOMBA DE AGUA FRIA PISO 33 #2"],
[9,"BOMBA DE AGUA FRIA PISO 33 #3"],
[9,"BOMBA DE AGUA FRIA PISO 33 #4"],
[9,"BOMBA DE AGUA FRIA PISO 33 #5"],
[9,"BOMBA DE AGUA FRIA PISO 33 #6"],
[9,"BOMBA CONTRAINCENDIO HYATT PISO 33"],
[9,"BOMBA CONTRAINCENDIO RENTAL PISO 33"],
[9,"BOMBA JOCKEY HYATT PISO 33"],
[9,"BOMBA JOCKEY RENTAL PISO 33"],
[9,"BOMBA DE AGUA TANQUE POTABLE RESIDENCIAS PISO 43 #1"],
[9,"BOMBA DE AGUA TANQUE POTABLE RESIDENCIAS PISO 43 #2"],
[9,"BOMBA DE AGUA TANQUE POTABLE RESIDENCIAS PISO 43 #3"],
[9,"BOMBA DE AGUA TANQUE POTABLE HABITACIONES NUEVAS PISO 43 #1"],
[9,"BOMBA DE AGUA TANQUE POTABLE HABITACIONES NUEVAS PISO 43 #2"],
[9,"BOMBA DE CONDENSACION HABITACIONES NUEVAS PISO 43 #1"],
[9,"BOMBA DE CONDENSACION HABITACIONES NUEVAS PISO 43 #2"],
[9,"BOMBA DE CONDENSACION RESIDENCIAS PISO 43 #1"],
[9,"BOMBA DE CONDENSACION RESIDENCIAS PISO 43 #2"],
[9,"BOMBA TANQUE AGUA CALIENTE RESIDENCIAS PISO 43"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE RESIDENCIAS PISO 43 #1"],
[9,"BOMBA RECIRCULACIÓN AGUA CALIENTE RESIDENCIAS PISO 43 #2"],
[28,"PRUEBA PITOMÉTRICA ANNUAL"],
[28,"ESTANQUEIDAD MANGUERAS"],
[28,"RECARGA EXTINTORES"],
[28,"SISTEMA EXTINCIÓN COCINA"],
[28,"CERTIFICACIÓN BOMBEROS"],
[28,"BOMBA DE AGUA CONTRAINCENDIO 1 PISO 0"],
[28,"BOMBA DE AGUA CONTRAINCENDIO 2 PISO 0"],
[24,"SERVICO DE RECOLECCIÓN"],
[18,"PLANTAS DEL HOTEL"],
[22,"MTTO. PUERTA ACCEESO PRINCIPAL PISO UNO"],
[1,"MTTO  GRUPO ASPIRADORAS HOTEL"],
[14,"MTTO HIDROLAVADORAS HOTEL"],
[27,"DESDE LA CABECAERA"],
[19,"EQUIPOS ASOCIADOS"],
[3,"CÁMARAS"],
[3,"SERVIDROR / DVR"],
[17,"LIMPIEZA POZOS EYECTORES"],
[17,"LIMPIEZA TRAMPAS DE GRASA"],
[17,"LIMPIEZA TUBERÍAS COCINA"],
[17,"ANÁLISIS DE AGUA DE VERTIMENTOS"],
[12,"LAVADO FACHADAS"],
[12,"REVISIÓN AVISOS EXTERNOS"],
[20,"MANLIFE"],
[7,"BOMBA DE CALOR PISCINA DE NIÑOS"],
[7,"BOMBA DE CALOR PISCINA DE EJERCICIO #1"],
[7,"BOMBA DE CALOR PISCINA RECREACIONAL #1"],
[7,"BOMBA DE CALOR PISCINA RECREACIONAL #2"],
[7,"BOMBA DE CALOR PISCINA DE EJERCICIO #2"],
[7,"BOMBA DE CALOR PISCINA DE ASOLEADORA"],
[7,"EXTRACTOR DE CUARTO DE PISCINA"],
[7,"INYECTOR DE AIRE RENOVADO CUARTO DE PISCINA"],
[15,"VRF SALON FRAGATA 1"],
[15,"VRF SALON FRAGATA 2"],
[15,"VRF SALON GALEON 1"],
[15,"VRF SALON GALEON 2"],
[15,"VRF SALON NAVIO"],
];

// Cronograma completo importado (todo el año: ejecutado + programado pendiente)
const MTTO_CRONOGRAMA = [
[0,2,1,1,"","",1],
[0,5,1,1,"","",1],
[0,8,1,1,"","",0],
[0,11,1,1,"","",0],
[1,2,1,1,"","",1],
[1,5,1,1,"","",1],
[1,8,1,1,"","",0],
[1,11,1,1,"","",0],
[2,2,1,1,"","",1],
[2,5,1,1,"","",1],
[2,8,1,1,"","",0],
[2,11,1,1,"","",0],
[3,2,1,1,"","",1],
[3,5,1,1,"","",1],
[3,8,1,1,"","",0],
[3,11,1,1,"","",0],
[4,2,1,1,"","",1],
[4,5,1,1,"","",1],
[4,8,1,1,"","",0],
[4,11,1,1,"","",0],
[5,2,1,1,"","",1],
[5,5,1,1,"","",1],
[5,8,1,1,"","",0],
[5,11,1,1,"","",0],
[6,2,1,1,"","",1],
[6,5,1,1,"","",1],
[6,8,1,1,"","",0],
[6,11,1,1,"","",0],
[7,2,1,1,"","",1],
[7,5,1,1,"","",1],
[7,8,1,1,"","",0],
[7,11,1,1,"","",0],
[8,1,1,1,"2026-01-20","Schindler",2],
[8,2,1,1,"","",1],
[8,3,1,1,"","",1],
[8,4,1,1,"","",1],
[8,5,1,1,"2026-05-28","",2],
[8,6,1,1,"","",1],
[8,8,1,1,"","",0],
[8,9,1,1,"","",0],
[8,10,1,1,"","",0],
[8,11,1,1,"","",0],
[8,12,1,1,"","",0],
[9,1,1,1,"2026-01-21","Schindler",2],
[9,2,1,1,"","",1],
[9,3,1,1,"","",1],
[9,4,1,1,"","",1],
[9,5,1,1,"2026-05-28","",2],
[9,6,1,1,"","",1],
[9,8,1,1,"","",0],
[9,9,1,1,"","",0],
[9,10,1,1,"","",0],
[9,11,1,1,"","",0],
[9,12,1,1,"","",0],
[10,1,1,1,"2026-01-20","Schindler",2],
[10,2,1,1,"","",1],
[10,3,1,1,"","",1],
[10,4,1,1,"","",1],
[10,5,1,1,"2026-05-29","",2],
[10,6,1,1,"","",1],
[10,8,1,1,"","",0],
[10,9,1,1,"","",0],
[10,10,1,1,"","",0],
[10,11,1,1,"","",0],
[10,12,1,1,"","",0],
[11,1,1,1,"2026-01-22","Schindler",2],
[11,2,1,1,"","",1],
[11,3,1,1,"","",1],
[11,4,1,1,"","",1],
[11,5,1,1,"2026-05-29","",2],
[11,6,1,1,"","",1],
[11,8,1,1,"","",0],
[11,9,1,1,"","",0],
[11,10,1,1,"","",0],
[11,11,1,1,"","",0],
[11,12,1,1,"","",0],
[12,1,1,1,"","",1],
[12,2,1,1,"","",1],
[12,3,1,1,"","",1],
[12,4,1,1,"","",1],
[12,5,1,1,"","",1],
[12,6,1,1,"","",1],
[12,8,1,1,"","",0],
[12,9,1,1,"","",0],
[12,10,1,1,"","",0],
[12,11,1,1,"","",0],
[12,12,1,1,"","",0],
[13,1,1,1,"2026-01-28","Schindler",2],
[13,2,1,1,"","",1],
[13,3,1,1,"","",1],
[13,4,1,1,"","",1],
[13,5,1,1,"2026-05-25","",2],
[13,6,1,1,"","",1],
[13,8,1,1,"","",0],
[13,9,1,1,"","",0],
[13,10,1,1,"","",0],
[13,11,1,1,"","",0],
[13,12,1,1,"","",0],
[14,1,1,1,"2026-01-29","Schindler",2],
[14,2,1,1,"","",1],
[14,3,1,1,"","",1],
[14,4,1,1,"","",1],
[14,5,1,1,"2026-05-25","",2],
[14,6,1,1,"","",1],
[14,8,1,1,"","",0],
[14,9,1,1,"","",0],
[14,10,1,1,"","",0],
[14,11,1,1,"","",0],
[14,12,1,1,"","",0],
[15,1,1,1,"2026-01-22","Schindler",2],
[15,2,1,1,"","",1],
[15,3,1,1,"","",1],
[15,4,1,1,"","",1],
[15,5,1,1,"2026-05-22","",2],
[15,6,1,1,"","",1],
[15,8,1,1,"","",0],
[15,9,1,1,"","",0],
[15,10,1,1,"","",0],
[15,11,1,1,"","",0],
[15,12,1,1,"","",0],
[16,1,1,1,"2026-01-22","Schindler",2],
[16,2,1,1,"","",1],
[16,3,1,1,"","",1],
[16,4,1,1,"","",1],
[16,5,1,1,"2026-05-26","",2],
[16,6,1,1,"","",1],
[16,8,1,1,"","",0],
[16,9,1,1,"","",0],
[16,10,1,1,"","",0],
[16,11,1,1,"","",0],
[16,12,1,1,"","",0],
[17,1,1,1,"2026-01-22","Schindler",2],
[17,2,1,1,"","",1],
[17,3,1,1,"2026-03-12","Schindler",2],
[17,4,1,1,"","",1],
[17,5,1,1,"2026-05-22","",2],
[17,6,1,1,"","",1],
[17,8,1,1,"","",0],
[17,9,1,1,"","",0],
[17,10,1,1,"","",0],
[17,11,1,1,"","",0],
[17,12,1,1,"","",0],
[18,1,1,1,"2026-01-23","Schindler",2],
[18,2,1,1,"","",1],
[18,3,1,1,"","",1],
[18,4,1,1,"","",1],
[18,5,1,1,"2026-05-26","",2],
[18,6,1,1,"","",1],
[18,8,1,1,"","",0],
[18,9,1,1,"","",0],
[18,10,1,1,"","",0],
[18,11,1,1,"","",0],
[18,12,1,1,"","",0],
[19,1,1,1,"2026-01-23","Schindler",2],
[19,2,1,1,"","",1],
[19,3,1,1,"","",1],
[19,4,1,1,"","",1],
[19,5,1,1,"2026-05-26","",2],
[19,6,1,1,"","",1],
[19,8,1,1,"","",0],
[19,9,1,1,"","",0],
[19,10,1,1,"","",0],
[19,11,1,1,"","",0],
[19,12,1,1,"","",0],
[20,1,1,1,"2026-01-23","Schindler",2],
[20,2,1,1,"","",1],
[20,3,1,1,"","",1],
[20,4,1,1,"","",1],
[20,5,1,1,"2026-05-26","",2],
[20,6,1,1,"","",1],
[20,8,1,1,"","",0],
[20,9,1,1,"","",0],
[20,10,1,1,"","",0],
[20,11,1,1,"","",0],
[20,12,1,1,"","",0],
[21,1,1,1,"2026-01-26","Schindler",2],
[21,2,1,1,"","",1],
[21,3,1,1,"","",1],
[21,4,1,1,"","",1],
[21,5,1,1,"2026-05-27","",2],
[21,6,1,1,"","",1],
[21,8,1,1,"","",0],
[21,9,1,1,"","",0],
[21,10,1,1,"","",0],
[21,11,1,1,"","",0],
[21,12,1,1,"","",0],
[22,1,1,1,"2026-01-20","Schindler",2],
[22,2,1,1,"","",1],
[22,3,1,1,"","",1],
[22,4,1,1,"","",1],
[22,5,1,1,"2026-05-27","",2],
[22,6,1,1,"","",1],
[22,8,1,1,"","",0],
[22,9,1,1,"","",0],
[22,10,1,1,"","",0],
[22,11,1,1,"","",0],
[22,12,1,1,"","",0],
[23,1,1,1,"2026-01-26","Schindler",2],
[23,2,1,1,"","",1],
[23,3,1,1,"","",1],
[23,4,1,1,"","",1],
[23,5,1,1,"2026-05-29","",2],
[23,6,1,1,"","",1],
[23,8,1,1,"","",0],
[23,9,1,1,"","",0],
[23,10,1,1,"","",0],
[23,11,1,1,"","",0],
[23,12,1,1,"","",0],
[24,1,1,1,"2026-01-29","Schindler",2],
[24,2,1,1,"","",1],
[24,3,1,1,"","",1],
[24,4,1,1,"","",1],
[24,5,1,1,"2026-05-26","",2],
[24,6,1,1,"","",1],
[24,8,1,1,"","",0],
[24,9,1,1,"","",0],
[24,10,1,1,"","",0],
[24,11,1,1,"","",0],
[24,12,1,1,"","",0],
[25,1,1,1,"","",1],
[25,5,1,1,"","",1],
[25,6,1,0,"","",1],
[25,10,1,0,"","",0],
[25,11,1,1,"","",0],
[26,1,1,1,"","",1],
[26,3,1,1,"2026-03-26","Idecom",2],
[26,5,1,1,"2026-05-09","Idecom",2],
[26,9,1,1,"","",0],
[26,11,1,1,"","",0],
[27,1,1,1,"","",1],
[27,3,1,1,"2026-03-26","Idecom",2],
[27,5,1,1,"2026-05-09","Idecom",2],
[27,9,1,1,"","",0],
[27,11,1,1,"","",0],
[28,1,1,1,"","",1],
[28,3,1,1,"2026-03-26","Idecom",2],
[28,5,1,1,"2026-05-09","Idecom",2],
[28,9,1,1,"","",0],
[28,11,1,1,"","",0],
[29,1,1,0,"","",1],
[29,3,1,0,"2026-03-25","Nilson Javier Fontalvo Avilez",2],
[29,5,1,0,"2026-05-11","Edinson Jose Carmona Figueroa",2],
[29,9,1,0,"","",0],
[29,11,1,0,"","",0],
[30,1,1,0,"","",1],
[30,3,1,0,"2026-03-25","Nilson Javier Fontalvo Avilez",2],
[30,5,1,0,"2026-05-11","Edinson Jose Carmona Figueroa",2],
[30,9,1,0,"","",0],
[30,11,1,0,"","",0],
[31,1,1,1,"","",1],
[31,3,1,1,"2026-03-26","Idecom",2],
[31,5,1,1,"2026-05-09","Idecom",2],
[31,9,1,1,"","",0],
[31,11,1,1,"","",0],
[32,1,1,1,"","",1],
[32,3,1,1,"2026-03-26","Idecom",2],
[32,5,1,1,"2026-05-09","Idecom",2],
[32,9,1,1,"","",0],
[32,11,1,1,"","",0],
[33,1,1,1,"","",1],
[33,3,1,1,"2026-03-26","Idecom",2],
[33,5,1,1,"2026-05-09","Idecom",2],
[33,9,1,1,"","",0],
[33,11,1,1,"","",0],
[34,1,1,1,"","",1],
[34,3,1,1,"2026-03-26","Idecom",2],
[34,5,1,1,"2026-05-09","Idecom",2],
[34,9,1,1,"","",0],
[34,11,1,1,"","",0],
[35,1,1,1,"","",1],
[35,3,1,1,"2026-03-26","Idecom",2],
[35,5,1,1,"2026-05-09","Idecom",2],
[35,9,1,1,"","",0],
[35,11,1,1,"","",0],
[36,1,1,1,"","",1],
[36,3,1,1,"2026-03-26","Idecom",2],
[36,5,1,1,"2026-05-09","Idecom",2],
[36,9,1,1,"","",0],
[36,11,1,1,"","",0],
[37,1,1,1,"","",1],
[37,3,1,1,"2026-03-26","Idecom",2],
[37,5,1,1,"2026-05-09","Idecom",2],
[37,9,1,1,"","",0],
[37,11,1,1,"","",0],
[38,1,1,1,"","",1],
[38,3,1,1,"2026-03-26","Idecom",2],
[38,5,1,1,"2026-05-09","Idecom",2],
[38,9,1,1,"","",0],
[38,11,1,1,"","",0],
[39,2,1,1,"","",1],
[39,4,1,1,"","",1],
[39,6,1,1,"","",1],
[39,8,1,1,"","",0],
[39,10,1,1,"","",0],
[39,12,1,1,"","",0],
[40,2,1,1,"","",1],
[40,4,1,1,"","",1],
[40,6,1,1,"","",1],
[40,8,1,1,"","",0],
[40,10,1,1,"","",0],
[40,12,1,1,"","",0],
[41,2,1,1,"","",1],
[41,4,1,1,"","",1],
[41,6,1,1,"","",1],
[41,8,1,1,"","",0],
[41,10,1,1,"","",0],
[41,12,1,1,"","",0],
[42,1,1,1,"","",1],
[42,3,1,1,"2026-03-26","Idecom",2],
[42,5,1,1,"","",1],
[42,9,1,1,"","",0],
[42,11,1,1,"","",0],
[43,1,1,1,"","",1],
[43,3,1,1,"2026-03-26","Idecom",2],
[43,5,1,1,"","",1],
[43,9,1,1,"","",0],
[43,11,1,1,"","",0],
[44,1,1,1,"","",1],
[44,3,1,1,"2026-03-26","Idecom",2],
[44,5,1,1,"","",1],
[44,9,1,1,"","",0],
[44,11,1,1,"","",0],
[45,1,1,1,"","",1],
[45,3,1,1,"2026-03-26","Idecom",2],
[45,5,1,1,"","",1],
[45,9,1,1,"","",0],
[45,11,1,1,"","",0],
[46,3,1,0,"","",1],
[46,10,1,0,"","",0],
[47,3,1,0,"","",1],
[47,10,1,0,"","",0],
[48,3,1,0,"","",1],
[48,10,1,0,"","",0],
[49,2,1,0,"","",1],
[49,9,1,0,"","",0],
[50,2,1,0,"","",1],
[50,6,1,0,"","",1],
[50,10,1,0,"","",0],
[51,2,1,0,"","",1],
[51,6,1,0,"","",1],
[51,10,1,0,"","",0],
[52,2,1,0,"","",1],
[52,6,1,0,"","",1],
[52,10,1,0,"","",0],
[53,2,1,0,"","",1],
[53,6,1,0,"","",1],
[53,10,1,0,"","",0],
[54,2,1,0,"","",1],
[54,6,1,0,"","",1],
[54,10,1,0,"","",0],
[55,2,1,0,"","",1],
[55,6,1,0,"2026-06-13","Edinson Jose Carmona Figueroa",2],
[55,10,1,0,"","",0],
[56,2,1,0,"","",1],
[56,6,1,0,"2026-06-13","Edinson Jose Carmona Figueroa",2],
[56,10,1,0,"","",0],
[57,2,1,0,"","",1],
[57,6,1,0,"2026-06-13","Edinson Jose Carmona Figueroa",2],
[57,10,1,0,"","",0],
[58,2,1,0,"","",1],
[58,6,1,0,"2026-06-13","Edinson Jose Carmona Figueroa",2],
[58,10,1,0,"","",0],
[59,2,1,0,"","",1],
[59,6,1,0,"","",1],
[59,10,1,0,"","",0],
[60,2,1,0,"","",1],
[60,6,1,0,"","",1],
[60,10,1,0,"","",0],
[61,2,1,0,"","",1],
[61,6,1,0,"","",1],
[61,10,1,0,"","",0],
[62,2,1,0,"","",1],
[62,6,1,0,"","",1],
[62,10,1,0,"","",0],
[63,2,1,0,"","",1],
[63,6,1,0,"","",1],
[63,10,1,0,"","",0],
[64,1,1,1,"","",1],
[64,4,1,1,"","",1],
[64,8,1,1,"","",0],
[64,12,1,1,"","",0],
[65,3,1,0,"2026-03-28","Oscar Alfonso Carcamo Angulo",2],
[65,11,1,0,"","",0],
[66,3,1,0,"2026-03-28","Oscar Alfonso Carcamo Angulo",2],
[66,11,1,0,"","",0],
[67,3,1,0,"","",1],
[67,11,1,0,"","",0],
[68,1,1,0,"2026-01-07","EDISON CARMONA",2],
[68,2,1,0,"2026-02-02","PEDRO GOMEZ",2],
[68,3,1,0,"2026-05-03","Jesus Daniel  Jimenez Beltran",2],
[68,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[68,5,1,0,"2026-05-10","Nilson Javier Fontalvo Avilez",2],
[68,6,1,0,"2026-06-02","Juan Andres Chiquillo Torres",2],
[68,7,1,0,"2026-07-03","Carlos Eduardo Toro Julio",2],
[68,8,1,0,"","",0],
[68,9,1,0,"","",0],
[68,10,1,0,"","",0],
[68,11,1,0,"","",0],
[68,12,1,0,"","",0],
[69,1,1,0,"2026-01-07","EDISON CARMONA",2],
[69,2,1,0,"2026-02-02","PEDRO GOMEZ",2],
[69,3,1,0,"2026-05-03","Jesus Daniel  Jimenez Beltran",2],
[69,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[69,5,1,0,"2026-05-10","Nilson Javier Fontalvo Avilez",2],
[69,6,1,0,"2026-06-02","Juan Andres Chiquillo Torres",2],
[69,7,1,0,"2026-07-03","Carlos Eduardo Toro Julio",2],
[69,8,1,0,"","",0],
[69,9,1,0,"","",0],
[69,10,1,0,"","",0],
[69,11,1,0,"","",0],
[69,12,1,0,"","",0],
[70,1,1,0,"2026-01-07","EDISON CARMONA",2],
[70,2,1,0,"2026-02-02","PEDRO GOMEZ",2],
[70,3,1,0,"2026-05-03","Jesus Daniel  Jimenez Beltran",2],
[70,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[70,5,1,0,"2026-05-10","Nilson Javier Fontalvo Avilez",2],
[70,6,1,0,"2026-06-02","Juan Andres Chiquillo Torres",2],
[70,7,1,0,"2026-07-03","Carlos Eduardo Toro Julio",2],
[70,8,1,0,"","",0],
[70,9,1,0,"","",0],
[70,10,1,0,"","",0],
[70,11,1,0,"","",0],
[70,12,1,0,"","",0],
[71,1,1,0,"2026-01-09","EDISON CARMONA",2],
[71,2,1,0,"2026-02-03","CARLOS TORO",2],
[71,3,1,0,"2026-06-03","Jesus Daniel  Jimenez Beltran",2],
[71,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[71,5,1,0,"","",1],
[71,6,1,0,"2026-06-04","Tairo Teran Batista",2],
[71,7,1,0,"2026-07-03","Carlos Eduardo Toro Julio",2],
[71,8,1,0,"","",0],
[71,9,1,0,"","",0],
[71,10,1,0,"","",0],
[71,11,1,0,"","",0],
[71,12,1,0,"","",0],
[72,1,1,0,"2026-01-07","EDISON CARMONA",2],
[72,2,1,0,"2026-02-02","PEDRO GOMEZ",2],
[72,3,1,0,"2026-05-03","Jesus Daniel  Jimenez Beltran",2],
[72,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[72,5,1,0,"2026-05-10","Nilson Javier Fontalvo Avilez",2],
[72,6,1,0,"2026-06-02","Juan Andres Chiquillo Torres",2],
[72,7,1,0,"2026-07-03","Carlos Eduardo Toro Julio",2],
[72,8,1,0,"","",0],
[72,9,1,0,"","",0],
[72,10,1,0,"","",0],
[72,11,1,0,"","",0],
[72,12,1,0,"","",0],
[73,1,1,0,"2026-01-09","EDISON CARMONA",2],
[73,2,1,0,"2026-02-03","CARLOS TORO",2],
[73,3,1,0,"2026-06-03","Jesus Daniel  Jimenez Beltran",2],
[73,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[73,5,1,0,"","",1],
[73,6,1,0,"2026-06-04","Tairo Teran Batista",2],
[73,7,1,0,"2026-07-04","Carlos Eduardo Toro Julio",2],
[73,8,1,0,"","",0],
[73,9,1,0,"","",0],
[73,10,1,0,"","",0],
[73,11,1,0,"","",0],
[73,12,1,0,"","",0],
[74,1,1,0,"2026-01-09","EDISON CARMONA",2],
[74,2,1,0,"2026-02-03","CARLOS TORO",2],
[74,3,1,0,"2026-06-03","Jesus Daniel  Jimenez Beltran",2],
[74,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[74,5,1,0,"","",1],
[74,6,1,0,"2026-06-04","Tairo Teran Batista",2],
[74,7,1,0,"2026-07-04","Carlos Eduardo Toro Julio",2],
[74,8,1,0,"","",0],
[74,9,1,0,"","",0],
[74,10,1,0,"","",0],
[74,11,1,0,"","",0],
[74,12,1,0,"","",0],
[75,1,1,0,"2026-01-09","EDISON CARMONA",2],
[75,2,1,0,"2026-02-03","CARLOS TORO",2],
[75,3,1,0,"2026-06-03","Jesus Daniel  Jimenez Beltran",2],
[75,4,1,0,"2026-04-05","Tairo Teran Batista",2],
[75,5,1,0,"","",1],
[75,6,1,0,"2026-06-04","Tairo Teran Batista",2],
[75,7,1,0,"2026-07-04","Carlos Eduardo Toro Julio",2],
[75,8,1,0,"","",0],
[75,9,1,0,"","",0],
[75,10,1,0,"","",0],
[75,11,1,0,"","",0],
[75,12,1,0,"","",0],
[76,1,1,0,"2026-01-15","CARLOS TORO",2],
[76,2,1,0,"2026-02-04","CARLOS TORO",2],
[76,3,1,0,"2026-07-03","Jesus Daniel  Jimenez Beltran",2],
[76,4,1,0,"2026-04-07","Carlos Eduardo Toro Julio",2],
[76,5,1,0,"2026-05-14","Edinson Jose Carmona Figueroa",2],
[76,6,1,0,"2026-06-05","Tairo Teran Batista",2],
[76,7,1,0,"2026-07-05","Carlos Eduardo Toro Julio",2],
[76,8,1,0,"","",0],
[76,9,1,0,"","",0],
[76,10,1,0,"","",0],
[76,11,1,0,"","",0],
[76,12,1,0,"","",0],
[77,1,1,0,"2026-01-15","CARLOS TORO",2],
[77,2,1,0,"2026-02-04","CARLOS TORO",2],
[77,3,1,0,"2026-07-03","Jesus Daniel  Jimenez Beltran",2],
[77,4,1,0,"2026-04-07","Carlos Eduardo Toro Julio",2],
[77,5,1,0,"2026-05-14","Edinson Jose Carmona Figueroa",2],
[77,6,1,0,"2026-06-05","Tairo Teran Batista",2],
[77,7,1,0,"2026-07-05","Carlos Eduardo Toro Julio",2],
[77,8,1,0,"","",0],
[77,9,1,0,"","",0],
[77,10,1,0,"","",0],
[77,11,1,0,"","",0],
[77,12,1,0,"","",0],
[78,1,1,0,"2026-01-14","CARLOS TORO",2],
[78,2,1,0,"2025-02-09","JESUS JIMENEZ BELTRAN",2],
[78,3,1,0,"2026-03-20","Carlos Eduardo Toro Julio",2],
[78,4,1,0,"2026-04-17","Jesus Daniel  Jimenez Beltran",2],
[78,5,1,0,"2026-05-24","Carlos Eduardo Toro Julio",2],
[78,6,1,0,"2026-06-10","Edinson Jose Carmona Figueroa",2],
[78,7,1,0,"2026-07-07","Jesus Daniel  Jimenez Beltran",2],
[78,8,1,0,"","",0],
[78,9,1,0,"","",0],
[78,10,1,0,"","",0],
[78,11,1,0,"","",0],
[78,12,1,0,"","",0],
[79,1,1,0,"2026-01-14","CARLOS TORO",2],
[79,2,1,0,"2025-02-09","JESUS JIMENEZ BELTRAN",2],
[79,3,1,0,"2026-03-20","Carlos Eduardo Toro Julio",2],
[79,4,1,0,"2026-04-17","Jesus Daniel  Jimenez Beltran",2],
[79,5,1,0,"2026-05-24","Carlos Eduardo Toro Julio",2],
[79,6,1,0,"2026-06-10","Edinson Jose Carmona Figueroa",2],
[79,7,1,0,"2026-07-07","Jesus Daniel  Jimenez Beltran",2],
[79,8,1,0,"","",0],
[79,9,1,0,"","",0],
[79,10,1,0,"","",0],
[79,11,1,0,"","",0],
[79,12,1,0,"","",0],
[80,1,1,0,"2026-01-14","CARLOS TORO",2],
[80,2,1,0,"2025-02-09","JESUS JIMENEZ BELTRAN",2],
[80,3,1,0,"2026-03-20","Carlos Eduardo Toro Julio",2],
[80,4,1,0,"2026-04-17","Jesus Daniel  Jimenez Beltran",2],
[80,5,1,0,"2026-05-24","Carlos Eduardo Toro Julio",2],
[80,6,1,0,"2026-06-10","Edinson Jose Carmona Figueroa",2],
[80,7,1,0,"2026-07-07","Jesus Daniel  Jimenez Beltran",2],
[80,8,1,0,"","",0],
[80,9,1,0,"","",0],
[80,10,1,0,"","",0],
[80,11,1,0,"","",0],
[80,12,1,0,"","",0],
[81,1,1,0,"2026-01-14","CARLOS TORO",2],
[81,2,1,0,"2025-02-09","JESUS JIMENEZ BELTRAN",2],
[81,3,1,0,"2026-03-20","Carlos Eduardo Toro Julio",2],
[81,4,1,0,"2026-04-17","Jesus Daniel  Jimenez Beltran",2],
[81,5,1,0,"2026-05-24","Carlos Eduardo Toro Julio",2],
[81,6,1,0,"2026-06-10","Edinson Jose Carmona Figueroa",2],
[81,7,1,0,"2026-07-07","Jesus Daniel  Jimenez Beltran",2],
[81,8,1,0,"","",0],
[81,9,1,0,"","",0],
[81,10,1,0,"","",0],
[81,11,1,0,"","",0],
[81,12,1,0,"","",0],
[82,1,1,0,"2026-01-15","CARLOS TORO",2],
[82,2,1,0,"2026-02-04","CARLOS TORO",2],
[82,3,1,0,"2026-07-03","Jesus Daniel  Jimenez Beltran",2],
[82,4,1,0,"2026-04-07","Carlos Eduardo Toro Julio",2],
[82,5,1,0,"2026-05-14","Edinson Jose Carmona Figueroa",2],
[82,6,1,0,"2026-06-05","Tairo Teran Batista",2],
[82,7,1,0,"2026-07-05","Carlos Eduardo Toro Julio",2],
[82,8,1,0,"","",0],
[82,9,1,0,"","",0],
[82,10,1,0,"","",0],
[82,11,1,0,"","",0],
[82,12,1,0,"","",0],
[83,1,1,0,"2026-01-15","CARLOS TORO",2],
[83,2,1,0,"2026-02-04","CARLOS TORO",2],
[83,3,1,0,"2026-07-03","Jesus Daniel  Jimenez Beltran",2],
[83,4,1,0,"2026-04-07","Carlos Eduardo Toro Julio",2],
[83,5,1,0,"2026-05-14","Edinson Jose Carmona Figueroa",2],
[83,6,1,0,"2026-06-05","Tairo Teran Batista",2],
[83,7,1,0,"2026-07-05","Carlos Eduardo Toro Julio",2],
[83,8,1,0,"","",0],
[83,9,1,0,"","",0],
[83,10,1,0,"","",0],
[83,11,1,0,"","",0],
[83,12,1,0,"","",0],
[84,1,1,0,"2026-01-19","JESUS JIMENEZ BELTRAN",2],
[84,2,1,0,"","",1],
[84,3,1,0,"","",1],
[84,4,1,0,"","",1],
[84,5,1,0,"","",1],
[84,6,1,0,"","",1],
[84,7,1,0,"","",0],
[84,8,1,0,"","",0],
[84,9,1,0,"","",0],
[84,10,1,0,"","",0],
[84,11,1,0,"","",0],
[84,12,1,0,"","",0],
[85,1,1,0,"2026-01-19","JESUS JIMENEZ BELTRAN",2],
[85,2,1,0,"","",1],
[85,3,1,0,"","",1],
[85,4,1,0,"","",1],
[85,5,1,0,"","",1],
[85,6,1,0,"","",1],
[85,7,1,0,"","",0],
[85,8,1,0,"","",0],
[85,9,1,0,"","",0],
[85,10,1,0,"","",0],
[85,11,1,0,"","",0],
[85,12,1,0,"","",0],
[86,1,1,0,"2026-01-19","JESUS JIMENEZ BELTRAN",2],
[86,2,1,0,"","",1],
[86,3,1,0,"","",1],
[86,4,1,0,"","",1],
[86,5,1,0,"","",1],
[86,6,1,0,"","",1],
[86,7,1,0,"","",0],
[86,8,1,0,"","",0],
[86,9,1,0,"","",0],
[86,10,1,0,"","",0],
[86,11,1,0,"","",0],
[86,12,1,0,"","",0],
[87,1,1,0,"","",1],
[87,2,1,0,"","",1],
[87,3,1,0,"","",1],
[87,4,1,0,"","",1],
[87,5,1,0,"","",1],
[87,6,1,0,"","",1],
[87,7,1,0,"","",0],
[87,8,1,0,"","",0],
[87,9,1,0,"","",0],
[87,10,1,0,"","",0],
[87,11,1,0,"","",0],
[87,12,1,0,"","",0],
[88,1,1,0,"2026-01-20","JESUS JIMENEZ BELTRAN",2],
[88,2,1,0,"","",1],
[88,3,1,0,"","",1],
[88,4,1,0,"","",1],
[88,5,1,0,"","",1],
[88,6,1,0,"","",1],
[88,7,1,0,"","",0],
[88,8,1,0,"","",0],
[88,9,1,0,"","",0],
[88,10,1,0,"","",0],
[88,11,1,0,"","",0],
[88,12,1,0,"","",0],
[89,1,1,0,"2026-01-20","JESUS JIMENEZ BELTRAN",2],
[89,2,1,0,"","",1],
[89,3,1,0,"","",1],
[89,4,1,0,"","",1],
[89,5,1,0,"","",1],
[89,6,1,0,"","",1],
[89,7,1,0,"","",0],
[89,8,1,0,"","",0],
[89,9,1,0,"","",0],
[89,10,1,0,"","",0],
[89,11,1,0,"","",0],
[89,12,1,0,"","",0],
[90,1,1,0,"2026-01-16","CARLOS TORO",2],
[90,2,1,0,"2026-02-06","CARLOS TORO",2],
[90,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[90,4,1,0,"2026-04-14","Jesus Daniel  Jimenez Beltran",2],
[90,5,1,0,"2026-05-21","Jesus Daniel Quintana Santander",2],
[90,6,1,0,"2026-06-11","Carlos Eduardo Toro Julio",2],
[90,7,1,0,"2026-07-08","Jesus Daniel  Jimenez Beltran",2],
[90,8,1,0,"","",0],
[90,9,1,0,"","",0],
[90,10,1,0,"","",0],
[90,11,1,0,"","",0],
[90,12,1,0,"","",0],
[91,1,1,0,"2026-01-16","CARLOS TORO",2],
[91,2,1,0,"2026-02-06","CARLOS TORO",2],
[91,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[91,4,1,0,"2026-04-14","Jesus Daniel  Jimenez Beltran",2],
[91,5,1,0,"2026-05-21","Jesus Daniel Quintana Santander",2],
[91,6,1,0,"2026-06-11","Carlos Eduardo Toro Julio",2],
[91,7,1,0,"2026-07-08","Jesus Daniel  Jimenez Beltran",2],
[91,8,1,0,"","",0],
[91,9,1,0,"","",0],
[91,10,1,0,"","",0],
[91,11,1,0,"","",0],
[91,12,1,0,"","",0],
[92,1,1,0,"2026-01-16","CARLOS TORO",2],
[92,2,1,0,"2026-02-06","CARLOS TORO",2],
[92,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[92,4,1,0,"2026-04-14","Jesus Daniel  Jimenez Beltran",2],
[92,5,1,0,"2026-05-21","Jesus Daniel Quintana Santander",2],
[92,6,1,0,"2026-06-11","Carlos Eduardo Toro Julio",2],
[92,7,1,0,"2026-07-08","Jesus Daniel  Jimenez Beltran",2],
[92,8,1,0,"","",0],
[92,9,1,0,"","",0],
[92,10,1,0,"","",0],
[92,11,1,0,"","",0],
[92,12,1,0,"","",0],
[93,1,1,0,"2026-01-17","CARLOS TORO",2],
[93,2,1,0,"2026-02-05","CARLOS TORO",2],
[93,3,1,0,"2026-03-09","Jesus Daniel  Jimenez Beltran",2],
[93,4,1,0,"2026-04-09","Carlos Eduardo Toro Julio",2],
[93,5,1,0,"2026-05-19","Jesus Daniel Quintana Santander",2],
[93,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[93,7,1,0,"2026-07-09","Jesus Daniel  Jimenez Beltran",2],
[93,8,1,0,"","",0],
[93,9,1,0,"","",0],
[93,10,1,0,"","",0],
[93,11,1,0,"","",0],
[93,12,1,0,"","",0],
[94,1,1,0,"2026-01-17","CARLOS TORO",2],
[94,2,1,0,"2026-02-05","CARLOS TORO",2],
[94,3,1,0,"2026-03-09","Jesus Daniel  Jimenez Beltran",2],
[94,4,1,0,"2026-04-09","Carlos Eduardo Toro Julio",2],
[94,5,1,0,"2026-05-19","Jesus Daniel Quintana Santander",2],
[94,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[94,7,1,0,"2026-07-09","Jesus Daniel  Jimenez Beltran",2],
[94,8,1,0,"","",0],
[94,9,1,0,"","",0],
[94,10,1,0,"","",0],
[94,11,1,0,"","",0],
[94,12,1,0,"","",0],
[95,1,1,0,"2026-01-17","CARLOS TORO",2],
[95,2,1,0,"2026-02-05","CARLOS TORO",2],
[95,3,1,0,"2026-03-09","Jesus Daniel  Jimenez Beltran",2],
[95,4,1,0,"2026-04-09","Carlos Eduardo Toro Julio",2],
[95,5,1,0,"2026-05-19","Jesus Daniel Quintana Santander",2],
[95,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[95,7,1,0,"2026-07-09","Jesus Daniel  Jimenez Beltran",2],
[95,8,1,0,"","",0],
[95,9,1,0,"","",0],
[95,10,1,0,"","",0],
[95,11,1,0,"","",0],
[95,12,1,0,"","",0],
[96,1,1,0,"2026-01-17","CARLOS TORO",2],
[96,2,1,0,"2026-02-12","JESUS JIMENEZ BELTRAN",2],
[96,3,1,0,"2026-03-09","Jesus Daniel  Jimenez Beltran",2],
[97,4,1,0,"2026-04-15","Jesus Daniel  Jimenez Beltran",2],
[97,5,1,0,"2026-05-21","Jesus Daniel Quintana Santander",2],
[96,6,1,0,"","",1],
[96,7,1,0,"2026-07-09","Jesus Daniel  Jimenez Beltran",2],
[96,8,1,0,"","",0],
[96,9,1,0,"","",0],
[96,10,1,0,"","",0],
[96,11,1,0,"","",0],
[96,12,1,0,"","",0],
[98,1,1,0,"","",1],
[98,2,1,0,"2026-02-05","CARLOS TORO",2],
[98,3,1,0,"2026-03-09","Jesus Daniel  Jimenez Beltran",2],
[99,4,1,0,"2026-04-09","Carlos Eduardo Toro Julio",2],
[99,5,1,0,"2026-05-19","Jesus Daniel Quintana Santander",2],
[98,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[98,7,1,0,"2026-07-12","Jesus Daniel  Jimenez Beltran",2],
[98,8,1,0,"","",0],
[98,9,1,0,"","",0],
[98,10,1,0,"","",0],
[98,11,1,0,"","",0],
[98,12,1,0,"","",0],
[100,1,1,0,"","",1],
[100,2,1,0,"2026-02-06","CARLOS TORO",2],
[100,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[100,4,1,0,"2026-04-15","Jesus Daniel  Jimenez Beltran",2],
[100,5,1,0,"2026-05-20","Jesus Daniel Quintana Santander",2],
[100,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[100,7,1,0,"2026-07-08","Jesus Daniel  Jimenez Beltran",2],
[100,8,1,0,"","",0],
[100,9,1,0,"","",0],
[100,10,1,0,"","",0],
[100,11,1,0,"","",0],
[100,12,1,0,"","",0],
[101,1,1,0,"","",1],
[101,2,1,0,"","",1],
[101,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[101,4,1,0,"","",1],
[101,5,1,0,"2026-05-20","Jesus Daniel Quintana Santander",2],
[101,6,1,0,"2026-06-07","Tairo Teran Batista",2],
[101,7,1,0,"2026-07-12","Jesus Daniel  Jimenez Beltran",2],
[101,8,1,0,"","",0],
[101,9,1,0,"","",0],
[101,10,1,0,"","",0],
[101,11,1,0,"","",0],
[101,12,1,0,"","",0],
[102,1,1,0,"2026-01-16","CARLOS TORO",2],
[102,2,1,0,"2026-02-06","CARLOS TORO",2],
[102,3,1,0,"2026-03-21","Carlos Eduardo Toro Julio",2],
[102,4,1,0,"2026-04-15","Jesus Daniel  Jimenez Beltran",2],
[102,5,1,0,"2026-05-20","Jesus Daniel Quintana Santander",2],
[102,6,1,0,"2026-06-11","Carlos Eduardo Toro Julio",2],
[102,7,1,0,"2026-07-12","Jesus Daniel  Jimenez Beltran",2],
[102,8,1,0,"","",0],
[102,9,1,0,"","",0],
[102,10,1,0,"","",0],
[102,11,1,0,"","",0],
[102,12,1,0,"","",0],
[103,1,1,0,"2026-01-18","RONALD TERAN",2],
[103,2,1,0,"2026-02-10","JESUS JIMENEZ BELTRAN",2],
[103,3,1,0,"2026-03-22","Carlos Eduardo Toro Julio",2],
[103,4,1,0,"2026-04-18","Jesus Daniel  Jimenez Beltran",2],
[103,5,1,0,"2026-05-22","Carlos Eduardo Toro Julio",2],
[103,6,1,0,"2026-06-13","Carlos Eduardo Toro Julio",2],
[103,7,1,0,"2026-07-10","Jesus Daniel  Jimenez Beltran",2],
[103,8,1,0,"","",0],
[103,9,1,0,"","",0],
[103,10,1,0,"","",0],
[103,11,1,0,"","",0],
[103,12,1,0,"","",0],
[104,1,1,0,"2026-01-18","RONALD TERAN",2],
[104,2,1,0,"2026-02-10","JESUS JIMENEZ BELTRAN",2],
[104,3,1,0,"2026-03-22","Carlos Eduardo Toro Julio",2],
[104,4,1,0,"2026-04-18","Jesus Daniel  Jimenez Beltran",2],
[104,5,1,0,"2026-05-22","Carlos Eduardo Toro Julio",2],
[104,6,1,0,"2026-06-13","Carlos Eduardo Toro Julio",2],
[104,7,1,0,"2026-07-10","Jesus Daniel  Jimenez Beltran",2],
[104,8,1,0,"","",0],
[104,9,1,0,"","",0],
[104,10,1,0,"","",0],
[104,11,1,0,"","",0],
[104,12,1,0,"","",0],
[105,1,1,0,"2026-01-18","RONALD TERAN",2],
[105,2,1,0,"2026-02-10","JESUS JIMENEZ BELTRAN",2],
[105,3,1,0,"2026-03-22","Carlos Eduardo Toro Julio",2],
[105,4,1,0,"2026-04-18","Jesus Daniel  Jimenez Beltran",2],
[105,5,1,0,"2026-05-22","Carlos Eduardo Toro Julio",2],
[105,6,1,0,"2026-06-13","Carlos Eduardo Toro Julio",2],
[105,7,1,0,"2026-07-10","Jesus Daniel  Jimenez Beltran",2],
[105,8,1,0,"","",0],
[105,9,1,0,"","",0],
[105,10,1,0,"","",0],
[105,11,1,0,"","",0],
[105,12,1,0,"","",0],
[106,1,1,0,"","",1],
[106,2,1,0,"","",1],
[106,3,1,0,"","",1],
[106,4,1,0,"2026-04-18","Jesus Daniel  Jimenez Beltran",2],
[106,5,1,0,"2026-05-22","Carlos Eduardo Toro Julio",2],
[106,6,1,0,"","",1],
[106,7,1,0,"2026-07-12","Jesus Daniel  Jimenez Beltran",2],
[106,8,1,0,"","",0],
[106,9,1,0,"","",0],
[106,10,1,0,"","",0],
[106,11,1,0,"","",0],
[106,12,1,0,"","",0],
[107,1,1,0,"","",1],
[108,2,1,0,"2026-02-20","TAIRO TERAN",2],
[109,2,1,0,"","",1],
[110,2,1,0,"","",1],
[111,1,1,0,"2025-01-13","CARLOS TORO",2],
[111,3,1,0,"","",1],
[111,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[111,7,1,0,"2026-06-18","Tairo Teran Batista",2],
[111,9,1,0,"","",0],
[111,11,1,0,"","",0],
[112,1,1,0,"","",1],
[112,3,1,0,"","",1],
[112,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[112,7,1,0,"2026-06-18","Tairo Teran Batista",2],
[112,9,1,0,"","",0],
[112,11,1,0,"","",0],
[113,1,1,0,"2025-01-13","CARLOS TORO",2],
[113,3,1,0,"","",1],
[113,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[113,7,1,0,"2026-06-18","Tairo Teran Batista",2],
[113,9,1,0,"","",0],
[113,11,1,0,"","",0],
[114,1,1,0,"","",1],
[114,3,1,0,"2026-03-29","Jesus Daniel  Jimenez Beltran",2],
[114,5,1,0,"2026-05-14","Tairo Teran Batista",2],
[114,7,1,0,"","",0],
[114,9,1,0,"","",0],
[114,11,1,0,"","",0],
[115,1,1,0,"","",1],
[115,3,1,0,"2026-03-29","Jesus Daniel  Jimenez Beltran",2],
[115,5,1,0,"2026-05-14","Tairo Teran Batista",2],
[115,7,1,0,"","",0],
[115,9,1,0,"","",0],
[115,11,1,0,"","",0],
[116,2,1,0,"","",1],
[116,4,1,0,"","",1],
[116,6,1,0,"","",1],
[116,8,1,0,"","",0],
[116,10,1,0,"","",0],
[116,12,1,0,"","",0],
[117,2,1,0,"","",1],
[117,4,1,0,"","",1],
[117,6,1,0,"","",1],
[117,8,1,0,"","",0],
[117,10,1,0,"","",0],
[117,12,1,0,"","",0],
[118,2,1,0,"","",1],
[118,4,1,0,"2026-04-22","Tairo Teran Batista",2],
[118,6,1,0,"","",1],
[118,8,1,0,"","",0],
[118,10,1,0,"","",0],
[118,12,1,0,"","",0],
[119,2,1,0,"","",1],
[119,4,1,0,"2026-04-22","Tairo Teran Batista",2],
[119,6,1,0,"","",1],
[119,8,1,0,"","",0],
[119,10,1,0,"","",0],
[119,12,1,0,"","",0],
[120,2,1,0,"","",1],
[120,4,1,0,"2026-04-22","Tairo Teran Batista",2],
[120,6,1,0,"","",1],
[120,8,1,0,"","",0],
[120,10,1,0,"","",0],
[120,12,1,0,"","",0],
[121,2,1,0,"","",1],
[121,4,1,0,"2026-04-27","Carlos Eduardo Toro Julio",2],
[121,6,1,0,"","",1],
[121,8,1,0,"","",0],
[121,10,1,0,"","",0],
[121,12,1,0,"","",0],
[122,2,1,0,"","",1],
[122,4,1,0,"2026-04-27","Carlos Eduardo Toro Julio",2],
[122,6,1,0,"","",1],
[122,8,1,0,"","",0],
[122,10,1,0,"","",0],
[122,12,1,0,"","",0],
[123,2,1,0,"","",1],
[123,4,1,0,"2026-04-11","Pedro Claver Gomez Acevedo",2],
[123,6,1,0,"2026-06-22","Tairo Teran Batista",2],
[123,8,1,0,"","",0],
[123,10,1,0,"","",0],
[123,12,1,0,"","",0],
[124,2,1,0,"","",1],
[124,4,1,0,"2026-04-11","Pedro Claver Gomez Acevedo",2],
[124,6,1,0,"2026-06-22","Tairo Teran Batista",2],
[124,8,1,0,"","",0],
[124,10,1,0,"","",0],
[124,12,1,0,"","",0],
[125,2,1,0,"","",1],
[125,4,1,0,"2026-04-11","Pedro Claver Gomez Acevedo",2],
[125,6,1,0,"","",1],
[125,8,1,0,"","",0],
[125,10,1,0,"","",0],
[125,12,1,0,"","",0],
[126,2,1,0,"","",1],
[126,4,1,0,"2026-04-12","Pedro Claver Gomez Acevedo",2],
[126,6,1,0,"","",1],
[126,8,1,0,"","",0],
[126,10,1,0,"","",0],
[126,12,1,0,"","",0],
[127,2,1,0,"","",1],
[127,4,1,0,"2026-04-12","Pedro Claver Gomez Acevedo",2],
[127,6,1,0,"","",1],
[127,8,1,0,"","",0],
[127,10,1,0,"","",0],
[127,12,1,0,"","",0],
[128,2,1,0,"","",1],
[128,4,1,0,"2026-04-12","Pedro Claver Gomez Acevedo",2],
[128,6,1,0,"","",1],
[128,8,1,0,"","",0],
[128,10,1,0,"","",0],
[128,12,1,0,"","",0],
[129,1,1,0,"2026-01-23","JESUS JIMENEZ BELTRAN",2],
[129,3,1,0,"2026-03-29","Jesus Daniel  Jimenez Beltran",2],
[129,5,1,0,"2026-05-15","Tairo Teran Batista",2],
[129,7,1,0,"2026-07-17","Tairo Teran Batista",2],
[129,9,1,0,"","",0],
[129,11,1,0,"","",0],
[130,1,1,0,"2026-01-23","JESUS JIMENEZ BELTRAN",2],
[130,3,1,0,"2026-03-29","Jesus Daniel  Jimenez Beltran",2],
[130,5,1,0,"2026-05-15","Tairo Teran Batista",2],
[130,7,1,0,"2026-07-17","Tairo Teran Batista",2],
[130,9,1,0,"","",0],
[130,11,1,0,"","",0],
[131,2,1,0,"2026-02-26","CARLOS TORO",2],
[131,4,1,0,"2026-04-20","Tairo Teran Batista",2],
[131,6,1,0,"2026-06-24","Tairo Teran Batista",2],
[131,8,1,0,"","",0],
[131,10,1,0,"","",0],
[131,12,1,0,"","",0],
[132,2,1,0,"2026-02-26","CARLOS TORO",2],
[132,4,1,0,"2026-04-20","Tairo Teran Batista",2],
[132,6,1,0,"2026-06-24","Tairo Teran Batista",2],
[132,8,1,0,"","",0],
[132,10,1,0,"","",0],
[132,12,1,0,"","",0],
[133,2,1,0,"","",1],
[133,4,1,0,"","",1],
[133,6,1,0,"","",1],
[133,8,1,0,"","",0],
[133,10,1,0,"","",0],
[133,12,1,0,"","",0],
[134,2,1,0,"","",1],
[134,4,1,0,"","",1],
[134,6,1,0,"","",1],
[134,8,1,0,"","",0],
[134,10,1,0,"","",0],
[134,12,1,0,"","",0],
[135,1,1,0,"","",1],
[135,2,1,0,"","",1],
[135,3,1,0,"","",1],
[135,4,1,0,"","",1],
[135,5,1,0,"","",1],
[135,6,1,0,"","",1],
[135,7,1,0,"","",0],
[135,8,1,0,"","",0],
[135,9,1,0,"","",0],
[135,10,1,0,"","",0],
[135,11,1,0,"","",0],
[135,12,1,0,"","",0],
[136,1,1,0,"2026-01-29","CARLOS BENITEZ",2],
[136,3,1,0,"2026-03-31","Tairo Teran Batista",2],
[136,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[136,7,1,0,"2026-07-15","Tairo Teran Batista",2],
[136,9,1,0,"","",0],
[136,11,1,0,"","",0],
[137,1,1,0,"2026-01-29","CARLOS BENITEZ",2],
[137,3,1,0,"2026-03-31","Tairo Teran Batista",2],
[137,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[137,7,1,0,"2026-07-15","Tairo Teran Batista",2],
[137,9,1,0,"","",0],
[137,11,1,0,"","",0],
[138,1,1,0,"2026-01-29","CARLOS BENITEZ",2],
[138,3,1,0,"2026-03-31","Tairo Teran Batista",2],
[138,5,1,0,"2026-05-12","Tairo Teran Batista",2],
[138,7,1,0,"2026-07-15","Tairo Teran Batista",2],
[138,9,1,0,"","",0],
[138,11,1,0,"","",0],
[139,1,1,0,"","",1],
[139,3,1,0,"","",1],
[139,5,1,0,"","",1],
[139,7,1,0,"","",0],
[139,9,1,0,"","",0],
[139,11,1,0,"","",0],
[140,2,1,0,"1899-12-30","JESUS JIMENEZ BELTRAN",2],
[140,4,1,0,"2026-04-10","Carlos Eduardo Toro Julio",2],
[140,6,1,0,"2026-06-19","Jesus Daniel  Jimenez Beltran",2],
[140,8,1,0,"","",0],
[140,10,1,0,"","",0],
[140,12,1,0,"","",0],
[141,2,1,0,"1899-12-30","JESUS JIMENEZ BELTRAN",2],
[141,4,1,0,"2026-04-10","Carlos Eduardo Toro Julio",2],
[141,6,1,0,"2026-06-19","Jesus Daniel  Jimenez Beltran",2],
[141,8,1,0,"","",0],
[141,10,1,0,"","",0],
[141,12,1,0,"","",0],
[142,2,1,0,"1899-12-30","JESUS JIMENEZ BELTRAN",2],
[142,4,1,0,"2026-04-10","Carlos Eduardo Toro Julio",2],
[142,6,1,0,"2026-06-19","Jesus Daniel  Jimenez Beltran",2],
[142,8,1,0,"","",0],
[142,10,1,0,"","",0],
[142,12,1,0,"","",0],
[143,2,1,0,"","",1],
[143,4,1,0,"","",1],
[143,6,1,0,"","",1],
[143,8,1,0,"","",0],
[143,10,1,0,"","",0],
[143,12,1,0,"","",0],
[144,2,1,0,"","",1],
[144,4,1,0,"","",1],
[144,6,1,0,"","",1],
[144,8,1,0,"","",0],
[144,10,1,0,"","",0],
[144,12,1,0,"","",0],
[145,2,1,0,"2026-02-11","JESUS JIMENEZ BELTRAN",2],
[145,4,1,0,"2026-04-04","Tairo Teran Batista",2],
[145,6,1,0,"2026-06-10","Carlos Eduardo Toro Julio",2],
[145,8,1,0,"","",0],
[145,10,1,0,"","",0],
[145,12,1,0,"","",0],
[146,2,1,0,"","",1],
[146,4,1,0,"2026-04-27","Carlos Eduardo Toro Julio",2],
[146,6,1,0,"2026-06-22","Tairo Teran Batista",2],
[146,8,1,0,"","",0],
[146,10,1,0,"","",0],
[146,12,1,0,"","",0],
[147,2,1,0,"","",1],
[147,4,1,0,"","",1],
[147,6,1,0,"","",1],
[147,8,1,0,"","",0],
[147,10,1,0,"","",0],
[147,12,1,0,"","",0],
[148,2,1,0,"","",1],
[148,4,1,0,"","",1],
[148,6,1,0,"","",1],
[148,8,1,0,"","",0],
[148,10,1,0,"","",0],
[148,12,1,0,"","",0],
[149,1,1,0,"","",1],
[150,1,1,0,"","",1],
[151,1,1,0,"","",1],
[152,1,1,0,"","",1],
[153,1,1,0,"","",1],
[154,1,1,0,"","",1],
[155,1,1,0,"","",1],
[156,1,1,0,"","",1],
[157,1,1,0,"","",1],
[158,1,1,0,"","",1],
[159,1,1,0,"","",1],
[160,1,1,0,"","",1],
[161,1,1,0,"","",1],
[162,1,1,0,"","",1],
[163,1,1,0,"","",1],
[164,2,1,0,"","",1],
[164,8,1,0,"","",0],
[165,2,1,0,"","",1],
[165,8,1,0,"","",0],
[166,2,1,0,"","",1],
[166,8,1,0,"","",0],
[167,2,1,0,"","",1],
[167,8,1,0,"","",0],
[168,2,1,0,"","",1],
[168,8,1,0,"","",0],
[169,2,1,0,"","",1],
[169,8,1,0,"","",0],
[170,2,1,0,"","",1],
[170,8,1,0,"","",0],
[171,2,1,0,"","",1],
[171,8,1,0,"","",0],
[172,2,1,0,"","",1],
[172,8,1,0,"","",0],
[173,2,1,0,"","",1],
[173,8,1,0,"","",0],
[174,2,1,0,"","",1],
[174,8,1,0,"","",0],
[175,2,1,0,"","",1],
[175,8,1,0,"","",0],
[176,2,1,0,"","",1],
[176,8,1,0,"","",0],
[177,2,1,0,"","",1],
[177,8,1,0,"","",0],
[178,2,1,0,"","",1],
[178,8,1,0,"","",0],
[179,3,1,0,"","",1],
[179,9,1,0,"","",0],
[180,3,1,0,"","",1],
[180,9,1,0,"","",0],
[181,3,1,0,"","",1],
[181,9,1,0,"","",0],
[182,3,1,0,"","",1],
[182,9,1,0,"","",0],
[183,3,1,0,"","",1],
[183,9,1,0,"","",0],
[184,3,1,0,"","",1],
[184,9,1,0,"","",0],
[185,3,1,0,"","",1],
[185,9,1,0,"","",0],
[186,3,1,0,"","",1],
[186,9,1,0,"","",0],
[187,3,1,0,"","",1],
[187,9,1,0,"","",0],
[188,3,1,0,"","",1],
[188,9,1,0,"","",0],
[189,3,1,0,"","",1],
[189,9,1,0,"","",0],
[190,3,1,0,"","",1],
[190,9,1,0,"","",0],
[191,3,1,0,"","",1],
[191,9,1,0,"","",0],
[192,3,1,0,"","",1],
[192,9,1,0,"","",0],
[193,3,1,0,"","",1],
[193,9,1,0,"","",0],
[194,4,1,0,"","",1],
[194,10,1,0,"","",0],
[195,4,1,0,"","",1],
[195,10,1,0,"","",0],
[196,4,1,0,"","",1],
[196,10,1,0,"","",0],
[197,4,1,0,"","",1],
[197,10,1,0,"","",0],
[198,4,1,0,"","",1],
[198,10,1,0,"","",0],
[199,4,1,0,"","",1],
[199,10,1,0,"","",0],
[200,4,1,0,"","",1],
[200,10,1,0,"","",0],
[201,4,1,0,"","",1],
[201,10,1,0,"","",0],
[202,4,1,0,"","",1],
[202,10,1,0,"","",0],
[203,4,1,0,"","",1],
[203,10,1,0,"","",0],
[204,4,1,0,"","",1],
[204,10,1,0,"","",0],
[205,4,1,0,"","",1],
[205,10,1,0,"","",0],
[206,4,1,0,"","",1],
[206,10,1,0,"","",0],
[207,4,1,0,"","",1],
[207,10,1,0,"","",0],
[208,4,1,0,"","",1],
[208,10,1,0,"","",0],
[209,5,1,0,"","",1],
[209,11,1,0,"","",0],
[210,5,1,0,"","",1],
[210,11,1,0,"","",0],
[211,5,1,0,"","",1],
[211,11,1,0,"","",0],
[212,5,1,0,"","",1],
[212,11,1,0,"","",0],
[213,5,1,0,"","",1],
[213,11,1,0,"","",0],
[214,5,1,0,"","",1],
[214,11,1,0,"","",0],
[215,5,1,0,"","",1],
[215,11,1,0,"","",0],
[216,5,1,0,"","",1],
[216,11,1,0,"","",0],
[217,5,1,0,"","",1],
[217,11,1,0,"","",0],
[218,5,1,0,"","",1],
[218,11,1,0,"","",0],
[219,5,1,0,"","",1],
[219,11,1,0,"","",0],
[220,5,1,0,"","",1],
[220,11,1,0,"","",0],
[221,5,1,0,"","",1],
[221,11,1,0,"","",0],
[222,5,1,0,"","",1],
[222,11,1,0,"","",0],
[223,5,1,0,"","",1],
[223,11,1,0,"","",0],
[224,6,1,0,"","",1],
[224,12,1,0,"","",0],
[225,6,1,0,"","",1],
[225,12,1,0,"","",0],
[226,6,1,0,"","",1],
[226,12,1,0,"","",0],
[227,6,1,0,"","",1],
[227,12,1,0,"","",0],
[228,6,1,0,"","",1],
[228,12,1,0,"","",0],
[229,6,1,0,"","",1],
[229,12,1,0,"","",0],
[230,6,1,0,"","",1],
[230,12,1,0,"","",0],
[231,6,1,0,"","",1],
[231,12,1,0,"","",0],
[232,6,1,0,"","",1],
[232,12,1,0,"","",0],
[233,6,1,0,"","",1],
[233,12,1,0,"","",0],
[234,6,1,0,"","",1],
[234,12,1,0,"","",0],
[235,6,1,0,"","",1],
[235,12,1,0,"","",0],
[236,2,1,0,"","",1],
[236,4,1,0,"2026-04-17","Nilson Javier Fontalvo Avilez",2],
[236,6,1,0,"","",1],
[236,8,1,0,"","",0],
[236,10,1,0,"","",0],
[236,12,1,0,"","",0],
[237,2,1,0,"","",1],
[237,4,1,0,"2026-04-17","Nilson Javier Fontalvo Avilez",2],
[237,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[237,8,1,0,"","",0],
[237,10,1,0,"","",0],
[237,12,1,0,"","",0],
[238,2,1,0,"","",1],
[238,4,1,0,"2026-04-17","Nilson Javier Fontalvo Avilez",2],
[238,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[238,8,1,0,"","",0],
[238,10,1,0,"","",0],
[238,12,1,0,"","",0],
[239,2,1,0,"","",1],
[239,4,1,0,"2026-04-17","Nilson Javier Fontalvo Avilez",2],
[239,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[239,8,1,0,"","",0],
[239,10,1,0,"","",0],
[239,12,1,0,"","",0],
[240,2,1,0,"","",1],
[240,4,1,0,"2026-04-17","Nilson Javier Fontalvo Avilez",2],
[240,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[240,8,1,0,"","",0],
[240,10,1,0,"","",0],
[240,12,1,0,"","",0],
[241,2,1,0,"2026-02-09","JESUS QUINTANA",2],
[241,4,1,0,"2026-04-04","Edinson Jose Carmona Figueroa",2],
[241,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[241,8,1,0,"","",0],
[241,10,1,0,"","",0],
[241,12,1,0,"","",0],
[242,2,1,0,"2026-02-09","JESUS QUINTANA",2],
[242,4,1,0,"2026-04-04","Edinson Jose Carmona Figueroa",2],
[242,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[242,8,1,0,"","",0],
[242,10,1,0,"","",0],
[242,12,1,0,"","",0],
[243,2,1,0,"","",1],
[243,4,1,0,"2026-04-23","Edinson Jose Carmona Figueroa",2],
[243,6,1,0,"2026-06-21","Jesus Daniel  Jimenez Beltran",2],
[243,8,1,0,"","",0],
[243,10,1,0,"","",0],
[243,12,1,0,"","",0],
[244,2,1,0,"","",1],
[244,4,1,0,"2026-04-23","Edinson Jose Carmona Figueroa",2],
[244,6,1,0,"2026-06-21","Jesus Daniel  Jimenez Beltran",2],
[244,8,1,0,"","",0],
[244,10,1,0,"","",0],
[244,12,1,0,"","",0],
[245,2,1,0,"","",1],
[245,4,1,0,"2026-04-23","Edinson Jose Carmona Figueroa",2],
[245,6,1,0,"2026-06-21","Jesus Daniel  Jimenez Beltran",2],
[245,8,1,0,"","",0],
[245,10,1,0,"","",0],
[245,12,1,0,"","",0],
[246,2,1,0,"","",1],
[246,4,1,0,"2026-04-23","Edinson Jose Carmona Figueroa",2],
[246,6,1,0,"2026-06-21","Jesus Daniel  Jimenez Beltran",2],
[246,8,1,0,"","",0],
[246,10,1,0,"","",0],
[246,12,1,0,"","",0],
[247,2,1,0,"","",1],
[247,4,1,0,"","",1],
[247,6,1,0,"2026-06-21","Jesus Daniel  Jimenez Beltran",2],
[247,8,1,0,"","",0],
[247,10,1,0,"","",0],
[247,12,1,0,"","",0],
[248,2,1,0,"","",1],
[248,4,1,0,"2026-04-26","Jesus Daniel Quintana Santander",2],
[248,6,1,0,"2026-06-21","Nilson Javier Fontalvo Avilez",2],
[248,8,1,0,"","",0],
[248,10,1,0,"","",0],
[248,12,1,0,"","",0],
[249,2,1,0,"","",1],
[249,4,1,0,"2026-04-26","Jesus Daniel Quintana Santander",2],
[249,6,1,0,"2026-06-21","Nilson Javier Fontalvo Avilez",2],
[249,8,1,0,"","",0],
[249,10,1,0,"","",0],
[249,12,1,0,"","",0],
[250,2,1,0,"","",1],
[250,4,1,0,"2026-04-26","Jesus Daniel Quintana Santander",2],
[250,6,1,0,"2026-06-21","Nilson Javier Fontalvo Avilez",2],
[250,8,1,0,"","",0],
[250,10,1,0,"","",0],
[250,12,1,0,"","",0],
[251,2,1,0,"","",1],
[251,4,1,0,"2026-04-26","Jesus Daniel Quintana Santander",2],
[251,6,1,0,"2026-06-21","Nilson Javier Fontalvo Avilez",2],
[251,8,1,0,"","",0],
[251,10,1,0,"","",0],
[251,12,1,0,"","",0],
[252,1,1,1,"","",1],
[252,2,1,1,"","",1],
[252,3,1,1,"2026-03-18","Trane",2],
[252,4,1,1,"","",1],
[252,5,1,1,"","",1],
[252,6,1,1,"2026-06-11","Trane",2],
[252,8,1,1,"","",0],
[252,9,1,1,"","",0],
[252,10,1,1,"","",0],
[252,11,1,1,"","",0],
[252,12,1,1,"","",0],
[253,1,1,1,"","",1],
[253,2,1,1,"","",1],
[253,3,1,1,"2026-03-17","Trane",2],
[253,4,1,1,"","",1],
[253,5,1,1,"","",1],
[253,6,1,1,"2026-06-11","Trane",2],
[253,8,1,1,"","",0],
[253,9,1,1,"","",0],
[253,10,1,1,"","",0],
[253,11,1,1,"","",0],
[253,12,1,1,"","",0],
[254,1,1,1,"","",1],
[254,2,1,1,"","",1],
[254,3,1,1,"","",1],
[254,4,1,1,"","",1],
[254,5,1,1,"","",1],
[254,6,1,1,"","",1],
[254,8,1,1,"","",0],
[254,9,1,1,"","",0],
[254,10,1,1,"","",0],
[254,11,1,1,"","",0],
[254,12,1,1,"","",0],
[255,1,1,1,"","",1],
[255,2,1,1,"","",1],
[255,3,1,1,"","",1],
[255,4,1,1,"","",1],
[255,5,1,1,"","",1],
[255,6,1,1,"","",1],
[255,8,1,1,"","",0],
[255,9,1,1,"","",0],
[255,10,1,1,"","",0],
[255,11,1,1,"","",0],
[255,12,1,1,"","",0],
[256,1,1,1,"","",1],
[256,2,1,1,"","",1],
[256,3,1,1,"","",1],
[256,4,1,1,"","",1],
[256,5,1,1,"","",1],
[256,6,1,1,"","",1],
[256,8,1,1,"","",0],
[256,9,1,1,"","",0],
[256,10,1,1,"","",0],
[256,11,1,1,"","",0],
[256,12,1,1,"","",0],
[257,1,1,1,"","",1],
[257,2,1,1,"","",1],
[257,3,1,1,"","",1],
[257,4,1,1,"","",1],
[257,5,1,1,"","",1],
[257,6,1,1,"","",1],
[257,8,1,1,"","",0],
[257,9,1,1,"","",0],
[257,10,1,1,"","",0],
[257,11,1,1,"","",0],
[257,12,1,1,"","",0],
[258,1,1,1,"","",1],
[258,2,1,1,"","",1],
[258,3,1,1,"","",1],
[258,4,1,1,"","",1],
[258,5,1,1,"","",1],
[258,6,1,1,"","",1],
[258,8,1,1,"","",0],
[258,9,1,1,"","",0],
[258,10,1,1,"","",0],
[258,11,1,1,"","",0],
[258,12,1,1,"","",0],
[259,1,1,1,"","",1],
[259,2,1,1,"","",1],
[259,3,1,1,"","",1],
[259,4,1,1,"","",1],
[259,5,1,1,"","",1],
[259,6,1,1,"","",1],
[259,8,1,1,"","",0],
[259,9,1,1,"","",0],
[259,10,1,1,"","",0],
[259,11,1,1,"","",0],
[259,12,1,1,"","",0],
[260,1,1,1,"","",1],
[260,2,1,1,"","",1],
[260,3,1,1,"","",1],
[260,4,1,1,"","",1],
[260,5,1,1,"","",1],
[260,6,1,1,"","",1],
[260,8,1,1,"","",0],
[260,9,1,1,"","",0],
[260,10,1,1,"","",0],
[260,11,1,1,"","",0],
[260,12,1,1,"","",0],
[261,2,1,0,"","",1],
[261,5,1,0,"","",1],
[261,8,1,0,"","",0],
[261,11,1,0,"","",0],
[262,2,1,0,"","",1],
[262,5,1,0,"","",1],
[262,8,1,0,"","",0],
[262,11,1,0,"","",0],
[263,2,1,0,"","",1],
[263,5,1,0,"2026-05-11","Pedro Claver Gomez Acevedo",2],
[263,8,1,0,"","",0],
[263,11,1,0,"","",0],
[264,2,1,0,"","",1],
[264,5,1,0,"2026-05-11","Pedro Claver Gomez Acevedo",2],
[264,8,1,0,"","",0],
[264,11,1,0,"","",0],
[265,1,1,1,"","",1],
[265,2,1,1,"","",1],
[265,3,1,1,"","",1],
[265,4,1,1,"","",1],
[265,5,1,1,"2026-05-25","Thermoandina",2],
[265,6,1,1,"","",1],
[265,8,1,1,"","",0],
[265,9,1,1,"","",0],
[265,10,1,1,"","",0],
[265,11,1,1,"","",0],
[265,12,1,1,"","",0],
[266,1,1,1,"","",1],
[266,2,1,1,"","",1],
[266,3,1,1,"","",1],
[266,4,1,1,"","",1],
[266,5,1,1,"","Thermoandina",1],
[266,6,1,1,"","",1],
[266,8,1,1,"","",0],
[266,9,1,1,"","",0],
[266,10,1,1,"","",0],
[266,11,1,1,"","",0],
[266,12,1,1,"","",0],
[267,1,1,0,"","",1],
[267,3,1,0,"","",1],
[267,5,1,0,"","",1],
[267,7,1,0,"","",0],
[267,9,1,0,"","",0],
[267,11,1,0,"","",0],
[268,1,1,0,"","",1],
[268,3,1,0,"","",1],
[268,5,1,0,"","",1],
[268,7,1,0,"","",0],
[268,9,1,0,"","",0],
[268,11,1,0,"","",0],
[269,1,1,0,"","",1],
[269,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[269,5,1,0,"","",1],
[269,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[269,9,1,0,"","",0],
[269,11,1,0,"","",0],
[270,1,1,0,"","",1],
[270,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[270,5,1,0,"","",1],
[270,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[270,9,1,0,"","",0],
[270,11,1,0,"","",0],
[271,1,1,0,"","",1],
[271,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[271,5,1,0,"","",1],
[271,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[271,9,1,0,"","",0],
[271,11,1,0,"","",0],
[272,1,1,0,"","",1],
[272,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[272,5,1,0,"","",1],
[272,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[272,9,1,0,"","",0],
[272,11,1,0,"","",0],
[273,1,1,0,"","",1],
[273,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[273,5,1,0,"","",1],
[273,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[273,9,1,0,"","",0],
[273,11,1,0,"","",0],
[274,1,1,0,"","",1],
[274,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[274,5,1,0,"","",1],
[274,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[274,9,1,0,"","",0],
[274,11,1,0,"","",0],
[275,1,1,0,"","",1],
[275,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[275,5,1,0,"","",1],
[275,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[275,9,1,0,"","",0],
[275,11,1,0,"","",0],
[276,1,1,0,"","",1],
[276,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[276,5,1,0,"","",1],
[276,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[276,9,1,0,"","",0],
[276,11,1,0,"","",0],
[277,1,1,0,"","",1],
[277,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[277,5,1,0,"","",1],
[277,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[277,9,1,0,"","",0],
[277,11,1,0,"","",0],
[278,1,1,0,"","",1],
[278,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[278,5,1,0,"","",1],
[278,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[278,9,1,0,"","",0],
[278,11,1,0,"","",0],
[279,1,1,0,"","",1],
[279,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[279,5,1,0,"","",1],
[279,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[279,9,1,0,"","",0],
[279,11,1,0,"","",0],
[280,1,1,0,"","",1],
[280,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[280,5,1,0,"","",1],
[280,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[280,9,1,0,"","",0],
[280,11,1,0,"","",0],
[281,1,1,0,"","",1],
[281,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[281,5,1,0,"","",1],
[281,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[281,9,1,0,"","",0],
[281,11,1,0,"","",0],
[282,1,1,0,"","",1],
[282,3,1,0,"2026-03-18","Astrid Karolina Perez Barrios",2],
[282,5,1,0,"","",1],
[282,7,1,0,"2026-07-19","Pedro Claver Gomez Acevedo",2],
[282,9,1,0,"","",0],
[282,11,1,0,"","",0],
[283,1,1,0,"2026-01-28","CARLOS BENITEZ",2],
[283,3,1,0,"","",1],
[283,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[283,7,1,0,"","",0],
[283,9,1,0,"","",0],
[283,11,1,0,"","",0],
[284,1,1,0,"2026-01-28","CARLOS BENITEZ",2],
[284,3,1,0,"2026-03-31","Tairo Teran Batista",2],
[284,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[284,7,1,0,"","",0],
[284,9,1,0,"","",0],
[284,11,1,0,"","",0],
[285,1,1,0,"2026-01-28","CARLOS BENITEZ",2],
[285,3,1,0,"","",1],
[285,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[285,7,1,0,"","",0],
[285,9,1,0,"","",0],
[285,11,1,0,"","",0],
[286,1,1,0,"2026-01-28","CARLOS BENITEZ",2],
[286,3,1,0,"","",1],
[286,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[286,7,1,0,"","",0],
[286,9,1,0,"","",0],
[286,11,1,0,"","",0],
[287,1,1,0,"","",1],
[287,3,1,0,"","",1],
[287,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[287,7,1,0,"","",0],
[287,9,1,0,"","",0],
[287,11,1,0,"","",0],
[288,1,1,0,"","",1],
[288,3,1,0,"","",1],
[288,5,1,0,"2026-05-13","Tairo Teran Batista",2],
[288,7,1,0,"","",0],
[288,9,1,0,"","",0],
[288,11,1,0,"","",0],
[289,2,1,0,"","",1],
[289,4,1,0,"","",1],
[289,6,1,0,"","",1],
[289,8,1,0,"","",0],
[289,10,1,0,"","",0],
[289,12,1,0,"","",0],
[290,2,1,0,"","",1],
[290,4,1,0,"","",1],
[290,6,1,0,"","",1],
[290,8,1,0,"","",0],
[290,10,1,0,"","",0],
[290,12,1,0,"","",0],
[291,2,1,0,"","",1],
[291,4,1,0,"","",1],
[291,6,1,0,"","",1],
[291,8,1,0,"","",0],
[291,10,1,0,"","",0],
[291,12,1,0,"","",0],
[292,2,1,0,"","",1],
[292,4,1,0,"","",1],
[292,6,1,0,"","",1],
[292,8,1,0,"","",0],
[292,10,1,0,"","",0],
[292,12,1,0,"","",0],
[293,2,1,0,"","",1],
[293,4,1,0,"","",1],
[293,6,1,0,"","",1],
[293,8,1,0,"","",0],
[293,10,1,0,"","",0],
[293,12,1,0,"","",0],
[294,2,1,0,"","",1],
[294,4,1,0,"","",1],
[294,6,1,0,"","",1],
[294,8,1,0,"","",0],
[294,10,1,0,"","",0],
[294,12,1,0,"","",0],
[295,2,1,0,"","",1],
[295,4,1,0,"","",1],
[295,6,1,0,"","",1],
[295,8,1,0,"","",0],
[295,10,1,0,"","",0],
[295,12,1,0,"","",0],
[296,2,1,0,"","",1],
[296,4,1,0,"","",1],
[296,6,1,0,"","",1],
[296,8,1,0,"","",0],
[296,10,1,0,"","",0],
[296,12,1,0,"","",0],
[297,2,1,0,"","",1],
[297,4,1,0,"","",1],
[297,6,1,0,"","",1],
[297,8,1,0,"","",0],
[297,10,1,0,"","",0],
[297,12,1,0,"","",0],
[298,2,1,0,"","",1],
[298,4,1,0,"","",1],
[298,6,1,0,"","",1],
[298,8,1,0,"","",0],
[298,10,1,0,"","",0],
[298,12,1,0,"","",0],
[299,2,1,0,"","",1],
[299,4,1,0,"","",1],
[299,6,1,0,"","",1],
[299,8,1,0,"","",0],
[299,10,1,0,"","",0],
[299,12,1,0,"","",0],
[300,2,1,0,"","",1],
[300,4,1,0,"","",1],
[300,6,1,0,"","",1],
[300,8,1,0,"","",0],
[300,10,1,0,"","",0],
[300,12,1,0,"","",0],
[301,2,1,0,"","",1],
[301,4,1,0,"","",1],
[301,6,1,0,"","",1],
[301,8,1,0,"","",0],
[301,10,1,0,"","",0],
[301,12,1,0,"","",0],
[302,2,1,0,"","",1],
[302,4,1,0,"","",1],
[302,6,1,0,"","",1],
[302,8,1,0,"","",0],
[302,10,1,0,"","",0],
[302,12,1,0,"","",0],
[303,2,1,0,"","",1],
[303,4,1,0,"","",1],
[303,6,1,0,"","",1],
[303,8,1,0,"","",0],
[303,10,1,0,"","",0],
[303,12,1,0,"","",0],
[304,2,1,0,"","",1],
[304,4,1,0,"","",1],
[304,6,1,0,"","",1],
[304,8,1,0,"","",0],
[304,10,1,0,"","",0],
[304,12,1,0,"","",0],
[305,2,1,0,"","",1],
[305,4,1,0,"","",1],
[305,6,1,0,"","",1],
[305,8,1,0,"","",0],
[305,10,1,0,"","",0],
[305,12,1,0,"","",0],
[306,2,1,0,"","",1],
[306,4,1,0,"","",1],
[306,6,1,0,"","",1],
[306,8,1,0,"","",0],
[306,10,1,0,"","",0],
[306,12,1,0,"","",0],
[307,2,1,0,"","",1],
[307,4,1,0,"","",1],
[307,6,1,0,"","",1],
[307,8,1,0,"","",0],
[307,10,1,0,"","",0],
[307,12,1,0,"","",0],
[308,2,1,0,"","",1],
[308,4,1,0,"","",1],
[308,6,1,0,"","",1],
[308,8,1,0,"","",0],
[308,10,1,0,"","",0],
[308,12,1,0,"","",0],
[309,2,1,0,"","",1],
[309,4,1,0,"","",1],
[309,6,1,0,"","",1],
[309,8,1,0,"","",0],
[309,10,1,0,"","",0],
[309,12,1,0,"","",0],
[310,2,1,0,"","",1],
[310,4,1,0,"","",1],
[310,6,1,0,"","",1],
[310,8,1,0,"","",0],
[310,10,1,0,"","",0],
[310,12,1,0,"","",0],
[311,2,1,0,"","",1],
[311,4,1,0,"","",1],
[311,6,1,0,"","",1],
[311,8,1,0,"","",0],
[311,10,1,0,"","",0],
[311,12,1,0,"","",0],
[312,2,1,0,"","",1],
[312,4,1,0,"","",1],
[312,6,1,0,"2026-06-26","Jesus Daniel Quintana Santander",2],
[312,8,1,0,"","",0],
[312,10,1,0,"","",0],
[312,12,1,0,"","",0],
[313,2,1,0,"","",1],
[313,4,1,0,"","",1],
[313,6,1,0,"2026-06-26","Jesus Daniel Quintana Santander",2],
[313,8,1,0,"","",0],
[313,10,1,0,"","",0],
[313,12,1,0,"","",0],
[314,2,1,0,"","",1],
[314,4,1,0,"","",1],
[314,6,1,0,"2026-06-26","Jesus Daniel Quintana Santander",2],
[314,8,1,0,"","",0],
[314,10,1,0,"","",0],
[314,12,1,0,"","",0],
[315,2,1,0,"","",1],
[315,4,1,0,"","",1],
[315,6,1,0,"2026-06-26","Jesus Daniel Quintana Santander",2],
[315,8,1,0,"","",0],
[315,10,1,0,"","",0],
[315,12,1,0,"","",0],
[316,2,1,0,"","",1],
[316,4,1,0,"","",1],
[316,6,1,0,"2026-06-26","Jesus Daniel Quintana Santander",2],
[316,8,1,0,"","",0],
[316,10,1,0,"","",0],
[316,12,1,0,"","",0],
[317,2,1,0,"","",1],
[317,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[317,6,1,0,"","",1],
[317,8,1,0,"","",0],
[317,10,1,0,"","",0],
[317,12,1,0,"","",0],
[318,2,1,0,"","",1],
[318,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[318,6,1,0,"","",1],
[318,8,1,0,"","",0],
[318,10,1,0,"","",0],
[318,12,1,0,"","",0],
[319,2,1,0,"","",1],
[319,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[319,6,1,0,"","",1],
[319,8,1,0,"","",0],
[319,10,1,0,"","",0],
[319,12,1,0,"","",0],
[320,2,1,0,"","",1],
[320,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[320,6,1,0,"","",1],
[320,8,1,0,"","",0],
[320,10,1,0,"","",0],
[320,12,1,0,"","",0],
[321,2,1,0,"","",1],
[321,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[321,6,1,0,"","",1],
[321,8,1,0,"","",0],
[321,10,1,0,"","",0],
[321,12,1,0,"","",0],
[322,2,1,0,"","",1],
[322,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[322,6,1,0,"","",1],
[322,8,1,0,"","",0],
[322,10,1,0,"","",0],
[322,12,1,0,"","",0],
[323,2,1,0,"","",1],
[323,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[323,6,1,0,"","",1],
[323,8,1,0,"","",0],
[323,10,1,0,"","",0],
[323,12,1,0,"","",0],
[324,1,1,0,"","",1],
[324,3,1,0,"","",1],
[324,5,1,0,"2026-05-26","Jesus Daniel  Jimenez Beltran",2],
[324,7,1,0,"","",0],
[324,9,1,0,"","",0],
[324,11,1,0,"","",0],
[324,1,1,0,"","",1],
[324,3,1,0,"","",1],
[324,5,1,0,"","",1],
[324,7,1,0,"","",0],
[324,9,1,0,"","",0],
[324,11,1,0,"","",0],
[325,1,1,0,"","",1],
[325,3,1,0,"","",1],
[325,5,1,0,"","",1],
[325,7,1,0,"","",0],
[325,9,1,0,"","",0],
[325,11,1,0,"","",0],
[326,1,1,0,"","",1],
[326,3,1,0,"","",1],
[326,5,1,0,"","",1],
[326,7,1,0,"","",0],
[326,9,1,0,"","",0],
[326,11,1,0,"","",0],
[327,1,1,0,"2026-01-29","EDISON CARMONA",2],
[327,3,1,0,"","",1],
[327,5,1,0,"","",1],
[327,7,1,0,"","",0],
[327,9,1,0,"","",0],
[327,11,1,0,"","",0],
[328,1,1,0,"2026-01-29","EDISON CARMONA",2],
[328,3,1,0,"","",1],
[328,5,1,0,"","",1],
[328,7,1,0,"","",0],
[328,9,1,0,"","",0],
[328,11,1,0,"","",0],
[329,1,1,0,"2026-01-29","EDISON CARMONA",2],
[329,3,1,0,"","",1],
[329,5,1,0,"","",1],
[329,7,1,0,"","",0],
[329,9,1,0,"","",0],
[329,11,1,0,"","",0],
[330,1,1,0,"2026-01-29","EDISON CARMONA",2],
[330,3,1,0,"","",1],
[330,5,1,0,"","",1],
[330,7,1,0,"","",0],
[330,9,1,0,"","",0],
[330,11,1,0,"","",0],
[331,1,1,0,"","",1],
[332,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[331,5,1,0,"","",1],
[331,7,1,0,"","",0],
[331,9,1,0,"","",0],
[331,11,1,0,"","",0],
[333,1,1,0,"","",1],
[333,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[333,5,1,0,"","",1],
[333,7,1,0,"","",0],
[333,9,1,0,"","",0],
[333,11,1,0,"","",0],
[334,1,1,0,"","",1],
[334,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[334,5,1,0,"","",1],
[334,7,1,0,"","",0],
[334,9,1,0,"","",0],
[334,11,1,0,"","",0],
[335,1,1,0,"","",1],
[335,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[335,5,1,0,"","",1],
[335,7,1,0,"","",0],
[335,9,1,0,"","",0],
[335,11,1,0,"","",0],
[336,1,1,0,"","",1],
[336,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[336,5,1,0,"","",1],
[336,7,1,0,"","",0],
[336,9,1,0,"","",0],
[336,11,1,0,"","",0],
[337,1,1,0,"","",1],
[337,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[337,5,1,0,"","",1],
[337,7,1,0,"","",0],
[337,9,1,0,"","",0],
[337,11,1,0,"","",0],
[338,1,1,0,"","",1],
[338,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[338,5,1,0,"","",1],
[338,7,1,0,"","",0],
[338,9,1,0,"","",0],
[338,11,1,0,"","",0],
[339,1,1,0,"","",1],
[339,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[339,5,1,0,"","",1],
[339,7,1,0,"","",0],
[339,9,1,0,"","",0],
[339,11,1,0,"","",0],
[340,1,1,0,"","",1],
[340,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[340,5,1,0,"","",1],
[340,7,1,0,"","",0],
[340,9,1,0,"","",0],
[340,11,1,0,"","",0],
[341,1,1,0,"","",1],
[341,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[341,5,1,0,"","",1],
[341,7,1,0,"","",0],
[341,9,1,0,"","",0],
[341,11,1,0,"","",0],
[342,1,1,0,"","",1],
[342,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[342,5,1,0,"","",1],
[342,7,1,0,"","",0],
[342,9,1,0,"","",0],
[342,11,1,0,"","",0],
[343,1,1,0,"","",1],
[343,3,1,0,"2026-03-28","Jesus Daniel  Jimenez Beltran",2],
[343,5,1,0,"","",1],
[343,7,1,0,"","",0],
[343,9,1,0,"","",0],
[343,11,1,0,"","",0],
[344,1,1,0,"","",1],
[344,3,1,0,"2026-03-28","Jesus Daniel  Jimenez Beltran",2],
[344,5,1,0,"","",1],
[344,7,1,0,"","",0],
[344,9,1,0,"","",0],
[344,11,1,0,"","",0],
[345,1,1,0,"","",1],
[345,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[345,5,1,0,"","",1],
[345,7,1,0,"","",0],
[345,9,1,0,"","",0],
[345,11,1,0,"","",0],
[346,1,1,0,"","",1],
[346,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[346,5,1,0,"","",1],
[346,7,1,0,"","",0],
[346,9,1,0,"","",0],
[346,11,1,0,"","",0],
[347,1,1,0,"","",1],
[347,3,1,0,"2026-03-26","Jesus Daniel  Jimenez Beltran",2],
[347,5,1,0,"","",1],
[347,7,1,0,"","",0],
[347,9,1,0,"","",0],
[347,11,1,0,"","",0],
[348,1,1,0,"","",1],
[348,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[348,5,1,0,"","",1],
[348,7,1,0,"","",0],
[348,9,1,0,"","",0],
[348,11,1,0,"","",0],
[349,1,1,0,"","",1],
[349,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[349,5,1,0,"","",1],
[349,7,1,0,"","",0],
[349,9,1,0,"","",0],
[349,11,1,0,"","",0],
[350,1,1,0,"","",1],
[350,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[350,5,1,0,"","",1],
[350,7,1,0,"","",0],
[350,9,1,0,"","",0],
[350,11,1,0,"","",0],
[351,1,1,0,"","",1],
[351,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[351,5,1,0,"","",1],
[351,7,1,0,"","",0],
[351,9,1,0,"","",0],
[351,11,1,0,"","",0],
[352,1,1,0,"","",1],
[352,3,1,0,"2026-03-27","Jesus Daniel  Jimenez Beltran",2],
[352,5,1,0,"","",1],
[352,7,1,0,"","",0],
[352,9,1,0,"","",0],
[352,11,1,0,"","",0],
[353,1,1,0,"","",1],
[353,3,1,0,"","",1],
[353,5,1,0,"","",1],
[353,7,1,0,"","",0],
[353,9,1,0,"","",0],
[353,11,1,0,"","",0],
[354,1,1,0,"","",1],
[354,3,1,0,"","",1],
[354,5,1,0,"","",1],
[354,7,1,0,"","",0],
[354,9,1,0,"","",0],
[354,11,1,0,"","",0],
[355,1,1,0,"","",1],
[355,3,1,0,"","",1],
[355,5,1,0,"","",1],
[355,7,1,0,"","",0],
[355,9,1,0,"","",0],
[355,11,1,0,"","",0],
[356,1,1,0,"","",1],
[356,3,1,0,"","",1],
[356,5,1,0,"","",1],
[356,7,1,0,"","",0],
[356,9,1,0,"","",0],
[356,11,1,0,"","",0],
[357,1,1,0,"","",1],
[357,3,1,0,"","",1],
[357,5,1,0,"","",1],
[357,7,1,0,"","",0],
[357,9,1,0,"","",0],
[357,11,1,0,"","",0],
[358,2,1,0,"2026-02-22","EDISON CARMONA",2],
[358,4,1,0,"2026-04-11","Carlos Eduardo Toro Julio",2],
[358,6,1,0,"2026-06-30","Carlos Eduardo Toro Julio",2],
[358,8,1,0,"","",0],
[358,10,1,0,"","",0],
[358,12,1,0,"","",0],
[359,2,1,0,"2026-02-22","EDISON CARMONA",2],
[359,4,1,0,"2026-04-11","Carlos Eduardo Toro Julio",2],
[359,6,1,0,"2026-06-30","Carlos Eduardo Toro Julio",2],
[359,8,1,0,"","",0],
[359,10,1,0,"","",0],
[359,12,1,0,"","",0],
[360,2,1,0,"2026-02-22","EDISON CARMONA",2],
[360,4,1,0,"2026-04-11","Carlos Eduardo Toro Julio",2],
[360,6,1,0,"2026-06-30","Carlos Eduardo Toro Julio",2],
[360,8,1,0,"","",0],
[360,10,1,0,"","",0],
[360,12,1,0,"","",0],
[361,2,1,0,"2026-02-22","EDISON CARMONA",2],
[361,4,1,0,"2026-04-11","Carlos Eduardo Toro Julio",2],
[361,6,1,0,"2026-06-30","Carlos Eduardo Toro Julio",2],
[361,8,1,0,"","",0],
[361,10,1,0,"","",0],
[361,12,1,0,"","",0],
[362,2,1,0,"2026-02-22","EDISON CARMONA",2],
[362,4,1,0,"","",1],
[362,6,1,0,"","",1],
[362,8,1,0,"","",0],
[362,10,1,0,"","",0],
[362,12,1,0,"","",0],
[363,2,1,0,"2026-02-22","EDISON CARMONA",2],
[363,4,1,0,"","",1],
[363,6,1,0,"","",1],
[363,8,1,0,"","",0],
[363,10,1,0,"","",0],
[363,12,1,0,"","",0],
[364,2,1,0,"2026-02-22","EDISON CARMONA",2],
[364,4,1,0,"","",1],
[364,6,1,0,"","",1],
[364,8,1,0,"","",0],
[364,10,1,0,"","",0],
[364,12,1,0,"","",0],
[365,2,1,0,"2026-02-22","EDISON CARMONA",2],
[365,4,1,0,"","",1],
[365,6,1,0,"","",1],
[365,8,1,0,"","",0],
[365,10,1,0,"","",0],
[365,12,1,0,"","",0],
[366,2,1,0,"2026-02-22","EDISON CARMONA",2],
[366,4,1,0,"","",1],
[366,6,1,0,"","",1],
[366,8,1,0,"","",0],
[366,10,1,0,"","",0],
[366,12,1,0,"","",0],
[367,2,1,0,"","",1],
[367,4,1,0,"2026-04-30","Carlos Eduardo Toro Julio",2],
[367,6,1,0,"","",1],
[367,8,1,0,"","",0],
[367,10,1,0,"","",0],
[367,12,1,0,"","",0],
[368,2,1,0,"","",1],
[368,4,1,0,"2026-04-30","Carlos Eduardo Toro Julio",2],
[368,6,1,0,"","",1],
[368,8,1,0,"","",0],
[368,10,1,0,"","",0],
[368,12,1,0,"","",0],
[369,2,1,0,"","",1],
[369,4,1,0,"2026-04-30","Carlos Eduardo Toro Julio",2],
[369,6,1,0,"","",1],
[369,8,1,0,"","",0],
[369,10,1,0,"","",0],
[369,12,1,0,"","",0],
[370,2,1,0,"","",1],
[370,4,1,0,"2026-04-30","Carlos Eduardo Toro Julio",2],
[370,6,1,0,"","",1],
[370,8,1,0,"","",0],
[370,10,1,0,"","",0],
[370,12,1,0,"","",0],
[371,2,1,0,"","",1],
[371,4,1,0,"2026-04-30","Carlos Eduardo Toro Julio",2],
[371,6,1,0,"","",1],
[371,8,1,0,"","",0],
[371,10,1,0,"","",0],
[371,12,1,0,"","",0],
[372,2,1,0,"","",1],
[372,4,1,0,"2026-04-30","Jesus Daniel Quintana Santander",2],
[372,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[372,8,1,0,"","",0],
[372,10,1,0,"","",0],
[372,12,1,0,"","",0],
[373,2,1,0,"","",1],
[373,4,1,0,"2026-04-30","Jesus Daniel Quintana Santander",2],
[373,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[373,8,1,0,"","",0],
[373,10,1,0,"","",0],
[373,12,1,0,"","",0],
[374,2,1,0,"","",1],
[374,4,1,0,"2026-04-30","Jesus Daniel Quintana Santander",2],
[374,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[374,8,1,0,"","",0],
[374,10,1,0,"","",0],
[374,12,1,0,"","",0],
[375,2,1,0,"","",1],
[375,4,1,0,"2026-04-30","Jesus Daniel Quintana Santander",2],
[375,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[375,8,1,0,"","",0],
[375,10,1,0,"","",0],
[375,12,1,0,"","",0],
[376,2,1,0,"2026-02-12","JESUS JIMENEZ BELTRAN",2],
[376,4,1,0,"","",1],
[376,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[376,8,1,0,"","",0],
[376,10,1,0,"","",0],
[376,12,1,0,"","",0],
[377,2,1,0,"2026-02-12","JESUS JIMENEZ BELTRAN",2],
[377,4,1,0,"","",1],
[377,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[377,8,1,0,"","",0],
[377,10,1,0,"","",0],
[377,12,1,0,"","",0],
[378,2,1,0,"2026-02-12","JESUS JIMENEZ BELTRAN",2],
[378,4,1,0,"","",1],
[378,6,1,0,"2026-06-27","Tairo Teran Batista",2],
[378,8,1,0,"","",0],
[378,10,1,0,"","",0],
[378,12,1,0,"","",0],
[379,2,1,0,"","",1],
[379,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[379,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[379,8,1,0,"","",0],
[379,10,1,0,"","",0],
[379,12,1,0,"","",0],
[380,2,1,0,"","",1],
[380,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[380,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[380,8,1,0,"","",0],
[380,10,1,0,"","",0],
[380,12,1,0,"","",0],
[381,2,1,0,"","",1],
[381,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[381,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[381,8,1,0,"","",0],
[381,10,1,0,"","",0],
[381,12,1,0,"","",0],
[382,2,1,0,"","",1],
[382,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[382,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[382,8,1,0,"","",0],
[382,10,1,0,"","",0],
[382,12,1,0,"","",0],
[383,2,1,0,"","",1],
[383,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[383,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[383,8,1,0,"","",0],
[383,10,1,0,"","",0],
[383,12,1,0,"","",0],
[384,2,1,0,"","",1],
[384,4,1,0,"2026-04-29","Jesus Daniel Quintana Santander",2],
[384,6,1,0,"2026-06-23","Jesus Daniel Quintana Santander",2],
[384,8,1,0,"","",0],
[384,10,1,0,"","",0],
[384,12,1,0,"","",0],
[385,2,1,0,"","",1],
[385,4,1,0,"","",1],
[385,6,1,0,"","",1],
[385,8,1,0,"","",0],
[385,10,1,0,"","",0],
[385,12,1,0,"","",0],
[386,2,1,0,"2026-02-11","JESUS JIMENEZ BELTRAN",2],
[386,4,1,0,"","",1],
[386,6,1,0,"","",1],
[386,8,1,0,"","",0],
[386,10,1,0,"","",0],
[386,12,1,0,"","",0],
[387,2,1,0,"","",1],
[387,4,1,0,"","",1],
[387,6,1,0,"","",1],
[387,8,1,0,"","",0],
[387,10,1,0,"","",0],
[387,12,1,0,"","",0],
[388,2,1,0,"2026-02-11","JESUS JIMENEZ BELTRAN",2],
[388,4,1,0,"","",1],
[388,6,1,0,"","",1],
[388,8,1,0,"","",0],
[388,10,1,0,"","",0],
[388,12,1,0,"","",0],
[389,2,1,0,"","",1],
[389,4,1,0,"","",1],
[389,6,1,0,"","",1],
[389,8,1,0,"","",0],
[389,10,1,0,"","",0],
[389,12,1,0,"","",0],
[390,2,1,0,"","",1],
[390,4,1,0,"","",1],
[390,6,1,0,"","",1],
[390,8,1,0,"","",0],
[390,10,1,0,"","",0],
[390,12,1,0,"","",0],
[391,2,1,0,"","",1],
[391,4,1,0,"","",1],
[391,6,1,0,"","",1],
[391,8,1,0,"","",0],
[391,10,1,0,"","",0],
[391,12,1,0,"","",0],
[392,2,1,0,"2026-02-11","JESUS JIMENEZ BELTRAN",2],
[392,4,1,0,"","",1],
[392,6,1,0,"","",1],
[392,8,1,0,"","",0],
[392,10,1,0,"","",0],
[392,12,1,0,"","",0],
[393,2,1,0,"","",1],
[393,4,1,0,"","",1],
[393,6,1,0,"","",1],
[393,8,1,0,"","",0],
[393,10,1,0,"","",0],
[393,12,1,0,"","",0],
[394,2,1,0,"","",1],
[394,4,1,0,"","",1],
[394,6,1,0,"","",1],
[394,8,1,0,"","",0],
[394,10,1,0,"","",0],
[394,12,1,0,"","",0],
[395,2,1,0,"","",1],
[395,4,1,0,"","",1],
[395,6,1,0,"","",1],
[395,8,1,0,"","",0],
[395,10,1,0,"","",0],
[395,12,1,0,"","",0],
[396,2,1,0,"","",1],
[396,4,1,0,"","",1],
[396,6,1,0,"","",1],
[396,8,1,0,"","",0],
[396,10,1,0,"","",0],
[396,12,1,0,"","",0],
[397,2,1,0,"","",1],
[397,4,1,0,"","",1],
[397,6,1,0,"","",1],
[397,8,1,0,"","",0],
[397,10,1,0,"","",0],
[397,12,1,0,"","",0],
[398,2,1,0,"","",1],
[398,4,1,0,"","",1],
[398,6,1,0,"","",1],
[398,8,1,0,"","",0],
[398,10,1,0,"","",0],
[398,12,1,0,"","",0],
[399,2,1,0,"","",1],
[399,4,1,0,"","",1],
[399,6,1,0,"","",1],
[399,8,1,0,"","",0],
[399,10,1,0,"","",0],
[399,12,1,0,"","",0],
[400,2,1,0,"","",1],
[400,6,1,0,"2026-06-17","Nilson Javier Fontalvo Avilez",2],
[400,11,1,0,"","",0],
[401,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[401,6,1,0,"2026-06-17","Nilson Javier Fontalvo Avilez",2],
[401,11,1,0,"","",0],
[402,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[402,6,1,0,"","",1],
[402,11,1,0,"","",0],
[403,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[403,6,1,0,"","",1],
[403,11,1,0,"","",0],
[404,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[404,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[404,11,1,0,"","",0],
[405,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[405,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[405,11,1,0,"","",0],
[406,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[406,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[406,11,1,0,"","",0],
[407,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[407,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[407,11,1,0,"","",0],
[408,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[408,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[408,11,1,0,"","",0],
[409,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[409,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[409,11,1,0,"","",0],
[410,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[410,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[410,11,1,0,"","",0],
[411,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[411,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[411,11,1,0,"","",0],
[412,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[412,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[412,11,1,0,"","",0],
[413,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[413,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[413,11,1,0,"","",0],
[414,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[414,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[414,11,1,0,"","",0],
[415,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[415,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[415,11,1,0,"","",0],
[416,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[416,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[416,11,1,0,"","",0],
[417,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[417,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[417,11,1,0,"","",0],
[418,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[418,6,1,0,"2026-06-18","Nilson Javier Fontalvo Avilez",2],
[418,11,1,0,"","",0],
[419,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[419,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[419,11,1,0,"","",0],
[420,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[420,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[420,11,1,0,"","",0],
[421,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[421,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[421,11,1,0,"","",0],
[422,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[422,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[422,11,1,0,"","",0],
[423,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[423,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[423,11,1,0,"","",0],
[424,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[424,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[424,11,1,0,"","",0],
[425,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[425,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[425,11,1,0,"","",0],
[426,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[426,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[426,11,1,0,"","",0],
[427,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[427,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[427,11,1,0,"","",0],
[428,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[428,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[428,11,1,0,"","",0],
[429,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[429,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[429,11,1,0,"","",0],
[430,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[430,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[430,11,1,0,"","",0],
[431,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[431,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[431,11,1,0,"","",0],
[432,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[432,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[432,11,1,0,"","",0],
[433,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[433,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[433,11,1,0,"","",0],
[434,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[434,6,1,0,"2026-06-22","Jesus Daniel Quintana Santander",2],
[434,11,1,0,"","",0],
[435,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[435,6,1,0,"","",1],
[435,11,1,0,"","",0],
[436,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[436,6,1,0,"","",1],
[436,11,1,0,"","",0],
[437,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[437,6,1,0,"","",1],
[437,11,1,0,"","",0],
[438,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[438,6,1,0,"","",1],
[438,11,1,0,"","",0],
[439,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[439,6,1,0,"","",1],
[439,11,1,0,"","",0],
[440,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[440,6,1,0,"","",1],
[440,11,1,0,"","",0],
[441,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[441,6,1,0,"","",1],
[441,11,1,0,"","",0],
[442,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[442,6,1,0,"","",1],
[442,11,1,0,"","",0],
[443,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[443,6,1,0,"","",1],
[443,11,1,0,"","",0],
[444,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[444,6,1,0,"","",1],
[444,11,1,0,"","",0],
[445,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[445,6,1,0,"","",1],
[445,11,1,0,"","",0],
[446,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[446,6,1,0,"","",1],
[446,11,1,0,"","",0],
[447,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[447,6,1,0,"","",1],
[447,11,1,0,"","",0],
[448,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[448,6,1,0,"","",1],
[448,11,1,0,"","",0],
[449,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[449,6,1,0,"","",1],
[449,11,1,0,"","",0],
[450,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[450,6,1,0,"","",1],
[450,11,1,0,"","",0],
[451,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[451,6,1,0,"","",1],
[451,11,1,0,"","",0],
[452,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[452,6,1,0,"","",1],
[452,11,1,0,"","",0],
[453,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[453,6,1,0,"","",1],
[453,11,1,0,"","",0],
[454,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[454,6,1,0,"","",1],
[454,11,1,0,"","",0],
[455,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[455,6,1,0,"","",1],
[455,11,1,0,"","",0],
[456,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[456,6,1,0,"","",1],
[456,11,1,0,"","",0],
[457,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[457,6,1,0,"","",1],
[457,11,1,0,"","",0],
[458,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[458,6,1,0,"","",1],
[458,11,1,0,"","",0],
[459,2,1,0,"2026-02-27","JESUS QUINTANA",2],
[459,6,1,0,"","",1],
[459,11,1,0,"","",0],
[460,3,1,0,"","",1],
[460,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[460,11,1,0,"","",0],
[461,3,1,0,"","",1],
[461,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[461,12,1,0,"","",0],
[462,3,1,0,"","",1],
[462,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[462,12,1,0,"","",0],
[463,3,1,0,"","",1],
[463,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[463,12,1,0,"","",0],
[464,3,1,0,"","",1],
[464,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[464,12,1,0,"","",0],
[465,3,1,0,"","",1],
[465,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[465,12,1,0,"","",0],
[466,3,1,0,"","",1],
[466,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[466,12,1,0,"","",0],
[467,3,1,0,"","",1],
[467,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[467,12,1,0,"","",0],
[468,3,1,0,"","",1],
[468,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[468,12,1,0,"","",0],
[469,3,1,0,"","",1],
[469,7,1,0,"2026-07-15","Jesus Daniel Quintana Santander",2],
[469,12,1,0,"","",0],
[470,3,1,0,"","",1],
[470,7,1,0,"2026-07-16","Jesus Daniel Quintana Santander",2],
[470,12,1,0,"","",0],
[471,3,1,0,"","",1],
[471,7,1,0,"2026-07-16","Jesus Daniel Quintana Santander",2],
[471,12,1,0,"","",0],
[472,3,1,0,"","",1],
[472,7,1,0,"2026-07-16","Jesus Daniel Quintana Santander",2],
[472,12,1,0,"","",0],
[473,3,1,0,"","",1],
[473,7,1,0,"2026-07-16","Jesus Daniel Quintana Santander",0],
[473,12,1,0,"","",0],
[474,3,1,0,"","",1],
[474,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[474,12,1,0,"","",0],
[475,3,1,0,"","",1],
[475,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[475,12,1,0,"","",0],
[476,3,1,0,"","",1],
[476,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[476,12,1,0,"","",0],
[477,3,1,0,"","",1],
[477,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[477,12,1,0,"","",0],
[478,3,1,0,"","",1],
[478,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[478,12,1,0,"","",0],
[479,3,1,0,"","",1],
[479,7,1,0,"2026-07-17","Jesus Daniel Quintana Santander",2],
[479,12,1,0,"","",0],
[480,3,1,0,"","",1],
[480,7,1,0,"","",0],
[480,12,1,0,"","",0],
[481,3,1,0,"","",1],
[481,7,1,0,"","",0],
[481,12,1,0,"","",0],
[482,3,1,0,"","",1],
[482,7,1,0,"","",0],
[482,12,1,0,"","",0],
[483,3,1,0,"","",1],
[483,7,1,0,"","",0],
[483,12,1,0,"","",0],
[484,3,1,0,"","",1],
[484,7,1,0,"","",0],
[484,12,1,0,"","",0],
[485,3,1,0,"","",1],
[485,7,1,0,"","",0],
[485,12,1,0,"","",0],
[486,3,1,0,"","",1],
[486,7,1,0,"","",0],
[486,12,1,0,"","",0],
[487,3,1,0,"","",1],
[487,7,1,0,"","",0],
[487,12,1,0,"","",0],
[488,3,1,0,"","",1],
[488,7,1,0,"","",0],
[488,12,1,0,"","",0],
[489,3,1,0,"","",1],
[489,7,1,0,"","",0],
[489,12,1,0,"","",0],
[490,3,1,0,"","",1],
[490,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[490,12,1,0,"","",0],
[491,3,1,0,"","",1],
[491,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[491,12,1,0,"","",0],
[492,3,1,0,"","",1],
[492,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[492,12,1,0,"","",0],
[493,3,1,0,"","",1],
[493,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[493,12,1,0,"","",0],
[494,3,1,0,"","",1],
[494,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[494,12,1,0,"","",0],
[495,3,1,0,"","",1],
[495,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[495,12,1,0,"","",0],
[496,3,1,0,"","",1],
[496,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[496,12,1,0,"","",0],
[497,3,1,0,"","",1],
[497,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[497,12,1,0,"","",0],
[498,3,1,0,"","",1],
[498,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[498,12,1,0,"","",0],
[499,3,1,0,"","",1],
[499,7,1,0,"2026-07-05","Nilson Javier Fontalvo Avilez",2],
[499,12,1,0,"","",0],
[500,3,1,0,"","",1],
[500,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[500,12,1,0,"","",0],
[501,3,1,0,"","",1],
[501,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[501,12,1,0,"","",0],
[500,3,1,0,"","",1],
[500,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[500,12,1,0,"","",0],
[501,3,1,0,"","",1],
[501,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[501,12,1,0,"","",0],
[500,3,1,0,"","",1],
[500,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[500,12,1,0,"","",0],
[501,3,1,0,"","",1],
[501,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[501,12,1,0,"","",0],
[502,3,1,0,"","",1],
[502,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[502,12,1,0,"","",0],
[503,3,1,0,"","",1],
[503,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[503,12,1,0,"","",0],
[504,3,1,0,"","",1],
[504,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[504,12,1,0,"","",0],
[505,3,1,0,"","",1],
[505,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[505,12,1,0,"","",0],
[506,3,1,0,"","",1],
[506,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[506,12,1,0,"","",0],
[507,3,1,0,"","",1],
[507,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[507,12,1,0,"","",0],
[508,3,1,0,"","",1],
[508,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[508,12,1,0,"","",0],
[509,3,1,0,"","",1],
[509,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[509,12,1,0,"","",0],
[510,3,1,0,"","",1],
[510,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[510,12,1,0,"","",0],
[511,3,1,0,"","",1],
[511,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[511,12,1,0,"","",0],
[512,3,1,0,"","",1],
[512,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[512,12,1,0,"","",0],
[513,3,1,0,"","",1],
[513,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[513,12,1,0,"","",0],
[514,3,1,0,"","",1],
[514,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[514,12,1,0,"","",0],
[515,3,1,0,"","",1],
[515,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[515,12,1,0,"","",0],
[516,3,1,0,"","",1],
[516,7,1,0,"2026-07-10","Nilson Javier Fontalvo Avilez",2],
[516,12,1,0,"","",0],
[517,4,1,0,"","",1],
[517,8,1,0,"","",0],
[517,12,1,0,"","",0],
[518,4,1,0,"","",1],
[518,8,1,0,"","",0],
[518,12,1,0,"","",0],
[519,4,1,0,"","",1],
[519,8,1,0,"","",0],
[519,12,1,0,"","",0],
[520,4,1,0,"","",1],
[520,8,1,0,"","",0],
[520,12,1,0,"","",0],
[521,4,1,0,"","",1],
[521,8,1,0,"","",0],
[521,12,1,0,"","",0],
[522,4,1,0,"","",1],
[522,8,1,0,"","",0],
[522,12,1,0,"","",0],
[523,4,1,0,"","",1],
[523,8,1,0,"","",0],
[523,12,1,0,"","",0],
[524,4,1,0,"","",1],
[524,8,1,0,"","",0],
[524,12,1,0,"","",0],
[525,4,1,0,"","",1],
[525,8,1,0,"","",0],
[525,12,1,0,"","",0],
[526,4,1,0,"","",1],
[526,8,1,0,"","",0],
[526,12,1,0,"","",0],
[527,4,1,0,"","",1],
[527,8,1,0,"","",0],
[527,12,1,0,"","",0],
[528,4,1,0,"","",1],
[528,8,1,0,"","",0],
[528,12,1,0,"","",0],
[529,4,1,0,"2026-04-20","Edinson Jose Carmona Figueroa",2],
[529,8,1,0,"","",0],
[529,12,1,0,"","",0],
[530,4,1,0,"2026-04-20","Edinson Jose Carmona Figueroa",2],
[530,8,1,0,"","",0],
[530,12,1,0,"","",0],
[531,4,1,0,"2026-04-20","Edinson Jose Carmona Figueroa",2],
[531,8,1,0,"","",0],
[531,12,1,0,"","",0],
[532,4,1,0,"2026-04-20","Edinson Jose Carmona Figueroa",2],
[532,8,1,0,"","",0],
[532,12,1,0,"","",0],
[533,4,1,0,"2026-04-20","Edinson Jose Carmona Figueroa",2],
[533,8,1,0,"","",0],
[533,12,1,0,"","",0],
[534,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[534,8,1,0,"","",0],
[534,12,1,0,"","",0],
[482,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[482,8,1,0,"","",0],
[482,12,1,0,"","",0],
[535,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[535,8,1,0,"","",0],
[535,12,1,0,"","",0],
[536,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[536,8,1,0,"","",0],
[536,12,1,0,"","",0],
[537,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[537,8,1,0,"","",0],
[537,12,1,0,"","",0],
[538,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[538,8,1,0,"","",0],
[538,12,1,0,"","",0],
[539,4,1,0,"2026-04-21","Edinson Jose Carmona Figueroa",2],
[539,8,1,0,"","",0],
[539,12,1,0,"","",0],
[540,4,1,0,"2026-06-04","Jhon Fredis Arias Romero",2],
[540,8,1,0,"","",0],
[540,12,1,0,"","",0],
[541,4,1,0,"2026-06-04","Jhon Fredis Arias Romero",2],
[541,8,1,0,"","",0],
[541,12,1,0,"","",0],
[542,4,1,0,"2026-06-04","Jhon Fredis Arias Romero",2],
[542,8,1,0,"","",0],
[542,12,1,0,"","",0],
[543,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[543,8,1,0,"","",0],
[543,12,1,0,"","",0],
[544,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[544,8,1,0,"","",0],
[544,12,1,0,"","",0],
[545,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[545,8,1,0,"","",0],
[545,12,1,0,"","",0],
[546,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[546,8,1,0,"","",0],
[546,12,1,0,"","",0],
[547,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[547,8,1,0,"","",0],
[547,12,1,0,"","",0],
[548,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[548,8,1,0,"","",0],
[548,12,1,0,"","",0],
[549,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[549,8,1,0,"","",0],
[549,12,1,0,"","",0],
[550,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[550,8,1,0,"","",0],
[550,12,1,0,"","",0],
[551,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[551,8,1,0,"","",0],
[551,12,1,0,"","",0],
[552,4,1,0,"2026-06-04","Jesus Daniel Quintana Santander",2],
[552,8,1,0,"","",0],
[552,12,1,0,"","",0],
[553,4,1,0,"2026-07-04","Jesus Daniel Quintana Santander",2],
[553,8,1,0,"","",0],
[553,12,1,0,"","",0],
[554,4,1,0,"","",1],
[554,8,1,0,"","",0],
[554,12,1,0,"","",0],
[555,4,1,0,"2026-07-04","Jesus Daniel Quintana Santander",2],
[555,8,1,0,"","",0],
[555,12,1,0,"","",0],
[556,4,1,0,"","",1],
[556,8,1,0,"","",0],
[556,12,1,0,"","",0],
[557,4,1,0,"2026-07-04","Jesus Daniel Quintana Santander",2],
[557,8,1,0,"","",0],
[557,12,1,0,"","",0],
[558,4,1,0,"","",1],
[558,8,1,0,"","",0],
[558,12,1,0,"","",0],
[559,4,1,0,"2026-07-04","Jesus Daniel Quintana Santander",2],
[559,8,1,0,"","",0],
[559,12,1,0,"","",0],
[560,4,1,0,"","",1],
[560,8,1,0,"","",0],
[560,12,1,0,"","",0],
[561,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[561,8,1,0,"","",0],
[561,12,1,0,"","",0],
[562,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[562,8,1,0,"","",0],
[562,12,1,0,"","",0],
[563,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[563,8,1,0,"","",0],
[563,12,1,0,"","",0],
[564,4,1,0,"","",1],
[564,8,1,0,"","",0],
[564,12,1,0,"","",0],
[565,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[565,8,1,0,"","",0],
[565,12,1,0,"","",0],
[566,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[566,8,1,0,"","",0],
[566,12,1,0,"","",0],
[567,4,1,0,"","",1],
[567,8,1,0,"","",0],
[567,12,1,0,"","",0],
[568,4,1,0,"2026-04-05","Edinson Jose Carmona Figueroa",2],
[568,8,1,0,"","",0],
[568,12,1,0,"","",0],
[569,1,1,0,"","",1],
[569,5,1,0,"","",1],
[569,9,1,0,"","",0],
[570,1,1,0,"","",1],
[570,5,1,0,"","",1],
[570,9,1,0,"","",0],
[571,1,1,0,"","",1],
[571,5,1,0,"","",1],
[571,9,1,0,"","",0],
[572,1,1,0,"","",1],
[572,5,1,0,"","",1],
[572,9,1,0,"","",0],
[573,1,1,0,"","",1],
[573,5,1,0,"","",1],
[573,9,1,0,"","",0],
[574,1,1,0,"","",1],
[574,5,1,0,"","",1],
[574,9,1,0,"","",0],
[575,1,1,0,"","",1],
[575,5,1,0,"","",1],
[575,9,1,0,"","",0],
[576,1,1,0,"","",1],
[576,5,1,0,"","",1],
[576,9,1,0,"","",0],
[577,1,1,0,"","",1],
[577,5,1,0,"","",1],
[577,9,1,0,"","",0],
[578,1,1,0,"","",1],
[578,5,1,0,"","",1],
[578,9,1,0,"","",0],
[579,1,1,0,"","",1],
[579,5,1,0,"","",1],
[579,9,1,0,"","",0],
[580,1,1,1,"","",1],
[580,5,1,1,"","",1],
[580,9,1,1,"","",0],
[581,1,1,1,"","",1],
[581,5,1,1,"","",1],
[581,9,1,1,"","",0],
[582,1,1,1,"","",1],
[582,5,1,1,"","",1],
[582,9,1,1,"","",0],
[583,1,1,1,"","",1],
[583,5,1,1,"","",1],
[583,9,1,1,"","",0],
[584,1,1,1,"","",1],
[584,5,1,1,"","",1],
[584,9,1,1,"","",0],
[585,1,1,1,"","",1],
[586,3,1,1,"","",1],
[586,11,1,1,"","",0],
[587,8,1,1,"","",0],
[588,1,1,1,"","",1],
[588,8,1,1,"","",0],
[589,1,1,1,"","",1],
[589,8,1,1,"","",0],
[590,1,1,1,"","",1],
[590,8,1,1,"","",0],
[591,8,1,1,"","",0],
[592,3,1,1,"","",1],
[592,8,1,1,"","",0],
[592,11,1,1,"","",0],
[593,8,1,1,"","",0],
[594,8,1,1,"","",0],
[595,8,1,1,"","",0],
[596,8,1,1,"","",0],
[597,1,1,1,"","",1],
[597,8,1,1,"","",0],
[598,2,1,1,"2026-02-11","",2],
[598,5,1,1,"2026-05-09","Gym shop",2],
[598,8,1,1,"","",0],
[598,11,1,1,"","",0],
[599,2,1,1,"2026-02-11","",2],
[599,5,1,1,"2026-05-09","Gym shop",2],
[599,8,1,1,"","",0],
[599,11,1,1,"","",0],
[600,2,1,1,"2026-02-11","",2],
[600,5,1,1,"2026-05-09","Gym shop",2],
[600,8,1,1,"","",0],
[600,11,1,1,"","",0],
[601,2,1,1,"2026-02-11","",2],
[601,5,1,1,"2026-05-09","Gym shop",2],
[601,8,1,1,"","",0],
[601,11,1,1,"","",0],
[602,2,1,1,"2026-02-11","",2],
[602,5,1,1,"2026-05-09","Gym shop",2],
[602,8,1,1,"","",0],
[602,11,1,1,"","",0],
[603,2,1,1,"2026-02-11","",2],
[603,5,1,1,"2026-05-09","Gym shop",2],
[603,8,1,1,"","",0],
[603,11,1,1,"","",0],
[604,2,1,1,"2026-02-11","",2],
[604,5,1,1,"2026-05-09","Gym shop",2],
[604,8,1,1,"","",0],
[604,11,1,1,"","",0],
[605,2,1,1,"2026-02-11","",2],
[605,5,1,1,"2026-05-09","Gym shop",2],
[605,8,1,1,"","",0],
[605,11,1,1,"","",0],
[606,2,1,1,"2026-02-11","",2],
[606,5,1,1,"2026-05-09","Gym shop",2],
[606,8,1,1,"","",0],
[606,11,1,1,"","",0],
[607,2,1,1,"2026-02-11","",2],
[607,5,1,1,"2026-05-09","Gym shop",2],
[607,8,1,1,"","",0],
[607,11,1,1,"","",0],
[608,2,1,1,"2026-02-11","",2],
[608,5,1,1,"2026-05-09","Gym shop",2],
[608,8,1,1,"","",0],
[608,11,1,1,"","",0],
[609,2,1,1,"2026-02-11","",2],
[609,5,1,1,"2026-05-09","Gym shop",2],
[609,8,1,1,"","",0],
[609,11,1,1,"","",0],
[610,3,1,1,"2026-03-11","Mejor puntada",2],
[610,9,1,1,"","",0],
[611,3,1,1,"2026-03-11","Mejor puntada",2],
[611,9,1,1,"","",0],
[612,3,1,1,"2026-03-11","Mejor puntada",2],
[612,9,1,1,"","",0],
[613,3,1,1,"2026-03-11","Mejor puntada",2],
[613,9,1,1,"","",0],
[614,3,1,1,"2026-03-11","Mejor puntada",2],
[614,9,1,1,"","",0],
[615,3,1,1,"2026-03-11","Mejor puntada",2],
[615,9,1,1,"","",0],
[616,3,1,1,"2026-03-11","Mejor puntada",2],
[616,9,1,1,"","",0],
[617,1,1,0,"","",1],
[617,3,1,1,"2026-03-02","Servitelas",2],
[617,5,1,0,"2026-05-09","Servitelas",2],
[617,7,1,0,"","",0],
[617,9,1,0,"","",0],
[617,11,1,1,"","",0],
[618,1,1,0,"","",1],
[618,3,1,1,"2026-03-02","Servitelas",2],
[618,5,1,0,"2026-05-09","Servitelas",2],
[618,7,1,0,"","",0],
[618,9,1,0,"","",0],
[618,11,1,1,"","",0],
[619,1,1,0,"","",1],
[619,3,1,1,"2026-03-02","Servitelas",2],
[619,5,1,0,"2026-05-09","Servitelas",2],
[619,7,1,0,"","",0],
[619,9,1,0,"","",0],
[619,11,1,1,"","",0],
[620,1,1,0,"","",1],
[620,3,1,1,"2026-03-02","Servitelas",2],
[620,5,1,0,"2026-05-09","Servitelas",2],
[620,7,1,0,"","",0],
[620,9,1,0,"","",0],
[620,11,1,1,"","",0],
[621,1,1,0,"","",1],
[621,3,1,1,"2026-03-02","Servitelas",2],
[621,5,1,0,"2026-05-09","Servitelas",2],
[621,7,1,0,"","",0],
[621,9,1,0,"","",0],
[621,11,1,1,"","",0],
[622,1,1,0,"","",1],
[622,3,1,1,"2026-03-02","Servitelas",2],
[622,5,1,0,"2026-05-09","Servitelas",2],
[622,7,1,0,"","",0],
[622,9,1,0,"","",0],
[622,11,1,1,"","",0],
[623,1,1,0,"","",1],
[623,3,1,1,"2026-03-02","Servitelas",2],
[623,5,1,0,"2026-05-09","Servitelas",2],
[623,7,1,0,"","",0],
[623,9,1,0,"","",0],
[623,11,1,1,"","",0],
[624,1,1,0,"","",1],
[624,3,1,1,"2026-03-02","Servitelas",2],
[624,5,1,0,"2026-05-09","Servitelas",2],
[624,7,1,0,"","",0],
[624,9,1,0,"","",0],
[624,11,1,1,"","",0],
[625,1,1,0,"","",1],
[625,3,1,1,"2026-03-02","Servitelas",2],
[625,5,1,0,"2026-05-09","Servitelas",2],
[625,7,1,0,"","",0],
[625,9,1,0,"","",0],
[625,11,1,1,"","",0],
[626,1,1,0,"","",1],
[626,3,1,1,"2026-03-02","Servitelas",2],
[626,5,1,0,"2026-05-09","Servitelas",2],
[626,7,1,0,"","",0],
[626,9,1,0,"","",0],
[626,11,1,1,"","",0],
[627,1,1,0,"","",1],
[627,3,1,1,"2026-03-02","Servitelas",2],
[627,5,1,0,"2026-05-09","Servitelas",2],
[627,7,1,0,"","",0],
[627,9,1,0,"","",0],
[627,11,1,1,"","",0],
[628,1,1,0,"","",1],
[628,3,1,1,"2026-03-02","Servitelas",2],
[628,5,1,0,"2026-05-09","Servitelas",2],
[628,7,1,0,"","",0],
[628,9,1,0,"","",0],
[628,11,1,1,"","",0],
[629,1,1,0,"","",1],
[629,3,1,1,"2026-03-02","Servitelas",2],
[629,5,1,0,"2026-05-09","Servitelas",2],
[629,7,1,0,"","",0],
[629,9,1,0,"","",0],
[629,11,1,1,"","",0],
[630,1,1,0,"","",1],
[630,3,1,1,"2026-03-02","Servitelas",2],
[630,5,1,0,"2026-05-09","Servitelas",2],
[630,7,1,0,"","",0],
[630,9,1,0,"","",0],
[630,11,1,1,"","",0],
[631,1,1,0,"","",1],
[631,3,1,1,"2026-03-02","Servitelas",2],
[631,5,1,0,"2026-05-09","Servitelas",2],
[631,7,1,0,"","",0],
[631,9,1,0,"","",0],
[631,11,1,1,"","",0],
[632,1,1,0,"","",1],
[632,3,1,1,"2026-03-02","Servitelas",2],
[632,5,1,0,"2026-05-09","Servitelas",2],
[632,7,1,0,"","",0],
[632,9,1,0,"","",0],
[632,11,1,1,"","",0],
[633,1,1,0,"","",1],
[633,3,1,1,"2026-03-02","Servitelas",2],
[633,5,1,0,"2026-05-09","Servitelas",2],
[633,7,1,0,"","",0],
[633,9,1,0,"","",0],
[633,11,1,1,"","",0],
[634,1,1,0,"","",1],
[634,3,1,1,"2026-03-02","Servitelas",2],
[634,5,1,0,"2026-05-09","Servitelas",2],
[634,7,1,0,"","",0],
[634,9,1,0,"","",0],
[634,11,1,1,"","",0],
[635,1,1,0,"","",1],
[635,3,1,1,"2026-03-02","Servitelas",2],
[635,5,1,0,"2026-05-09","Servitelas",2],
[635,7,1,0,"","",0],
[635,9,1,0,"","",0],
[635,11,1,1,"","",0],
[636,1,1,0,"","",1],
[636,3,1,1,"2026-03-02","Servitelas",2],
[636,5,1,0,"2026-05-09","Servitelas",2],
[636,7,1,0,"","",0],
[636,9,1,0,"","",0],
[636,11,1,1,"","",0],
[637,1,1,0,"","",1],
[637,3,1,1,"2026-03-02","Servitelas",2],
[637,5,1,0,"2026-05-09","Servitelas",2],
[637,7,1,0,"","",0],
[637,9,1,0,"","",0],
[637,11,1,1,"","",0],
[638,1,1,0,"","",1],
[638,3,1,1,"2026-03-02","Servitelas",2],
[638,5,1,0,"2026-05-09","Servitelas",2],
[638,7,1,0,"","",0],
[638,9,1,0,"","",0],
[638,11,1,1,"","",0],
[639,1,1,1,"","",1],
[639,3,1,0,"","",1],
[639,5,1,1,"2026-05-09","Servitelas",2],
[639,7,1,0,"","",0],
[639,9,1,1,"","",0],
[639,11,1,0,"","",0],
[640,1,1,1,"","",1],
[640,3,1,1,"2026-03-13","Luis Salgado",2],
[640,5,1,1,"","",1],
[640,9,1,1,"","",0],
[640,11,1,1,"","",0],
[641,1,1,1,"","",1],
[641,3,1,1,"2026-03-13","Luis Salgado",2],
[641,5,1,1,"","",1],
[641,9,1,1,"","",0],
[641,11,1,1,"","",0],
[642,1,1,1,"","",1],
[642,3,1,1,"2026-03-13","Luis Salgado",2],
[642,5,1,1,"","",1],
[642,9,1,1,"","",0],
[642,11,1,1,"","",0],
[643,1,1,1,"","",1],
[643,3,1,1,"2026-03-13","Luis Salgado",2],
[643,5,1,1,"","",1],
[643,9,1,1,"","",0],
[643,11,1,1,"","",0],
[644,1,1,1,"","",1],
[644,3,1,1,"2026-03-13","Luis Salgado",2],
[644,5,1,1,"","",1],
[644,9,1,1,"","",0],
[644,11,1,1,"","",0],
[645,1,1,1,"","",1],
[645,3,1,1,"2026-03-13","Luis Salgado",2],
[645,5,1,1,"","",1],
[645,9,1,1,"","",0],
[645,11,1,1,"","",0],
[646,1,1,1,"","",1],
[646,3,1,1,"2026-03-13","Luis Salgado",2],
[646,5,1,1,"","",1],
[646,9,1,1,"","",0],
[646,11,1,1,"","",0],
[647,1,1,1,"","",1],
[647,3,1,1,"2026-03-13","Luis Salgado",2],
[647,5,1,1,"","",1],
[647,9,1,1,"","",0],
[647,11,1,1,"","",0],
[648,1,1,1,"","",1],
[648,3,1,1,"2026-03-13","Luis Salgado",2],
[648,5,1,1,"","",1],
[648,9,1,1,"","",0],
[648,11,1,1,"","",0],
[649,1,1,1,"","",1],
[649,3,1,1,"2026-03-13","Luis Salgado",2],
[649,5,1,1,"","",1],
[649,9,1,1,"","",0],
[649,11,1,1,"","",0],
[650,1,1,1,"","",1],
[650,3,1,1,"2026-03-13","Luis Salgado",2],
[650,5,1,1,"","",1],
[650,9,1,1,"","",0],
[650,11,1,1,"","",0],
[651,1,1,1,"","",1],
[651,3,1,1,"2026-03-13","Luis Salgado",2],
[651,5,1,1,"","",1],
[651,9,1,1,"","",0],
[651,11,1,1,"","",0],
[652,1,1,1,"","",1],
[652,3,1,1,"2026-03-13","Luis Salgado",2],
[652,5,1,1,"","",1],
[652,9,1,1,"","",0],
[652,11,1,1,"","",0],
[653,1,1,1,"","",1],
[653,3,1,1,"2026-03-13","Luis Salgado",2],
[653,5,1,1,"","",1],
[653,9,1,1,"","",0],
[653,11,1,1,"","",0],
[654,1,1,1,"","",1],
[654,3,1,1,"2026-03-13","Luis Salgado",2],
[654,5,1,1,"","",1],
[654,9,1,1,"","",0],
[654,11,1,1,"","",0],
[655,1,1,1,"","",1],
[655,3,1,1,"2026-03-13","Luis Salgado",2],
[655,5,1,1,"","",1],
[655,9,1,1,"","",0],
[655,11,1,1,"","",0],
[656,1,1,1,"","",1],
[656,3,1,1,"2026-03-13","Luis Salgado",2],
[656,5,1,1,"","",1],
[656,9,1,1,"","",0],
[656,11,1,1,"","",0],
[657,1,1,1,"","",1],
[657,3,1,1,"2026-03-13","Luis Salgado",2],
[657,5,1,1,"","",1],
[657,9,1,1,"","",0],
[657,11,1,1,"","",0],
[658,1,1,1,"","",1],
[658,3,1,1,"2026-03-13","Luis Salgado",2],
[658,5,1,1,"","",1],
[658,9,1,1,"","",0],
[658,11,1,1,"","",0],
[659,1,1,1,"","",1],
[659,3,1,1,"2026-03-13","Luis Salgado",2],
[659,5,1,1,"","",1],
[659,9,1,1,"","",0],
[659,11,1,1,"","",0],
[660,1,1,1,"","",1],
[660,3,1,1,"2026-03-13","Luis Salgado",2],
[660,5,1,1,"","",1],
[660,9,1,1,"","",0],
[660,11,1,1,"","",0],
[661,1,1,1,"","",1],
[661,3,1,1,"2026-03-13","Luis Salgado",2],
[661,5,1,1,"","",1],
[661,9,1,1,"","",0],
[661,11,1,1,"","",0],
[662,1,1,1,"","",1],
[662,3,1,1,"2026-03-13","Luis Salgado",2],
[662,5,1,1,"","",1],
[662,9,1,1,"","",0],
[662,11,1,1,"","",0],
[663,1,1,1,"","",1],
[663,3,1,0,"","Oscar Alfonso Carcamo Angulo",1],
[663,5,1,1,"","",1],
[663,9,1,1,"","",0],
[663,11,1,1,"","",0],
[664,1,1,1,"","",1],
[664,3,1,0,"","",1],
[664,5,1,1,"","",1],
[664,9,1,1,"","",0],
[664,11,1,1,"","",0],
[665,1,1,1,"","",1],
[665,3,1,0,"","",1],
[665,5,1,1,"","",1],
[665,9,1,1,"","",0],
[665,11,1,1,"","",0],
[666,1,1,1,"","",1],
[666,3,1,1,"2026-03-13","Luis Salgado",2],
[666,5,1,1,"","",1],
[666,9,1,1,"","",0],
[666,11,1,1,"","",0],
[667,1,1,1,"","",1],
[667,3,1,1,"2026-03-13","Luis Salgado",2],
[667,5,1,1,"","",1],
[667,9,1,1,"","",0],
[667,11,1,1,"","",0],
[668,1,1,1,"","",1],
[668,3,1,1,"2026-03-13","Luis Salgado",2],
[668,5,1,1,"","",1],
[668,9,1,1,"","",0],
[668,11,1,1,"","",0],
[669,1,1,1,"","",1],
[669,3,1,1,"2026-03-13","Luis Salgado",2],
[669,5,1,1,"","",1],
[669,9,1,1,"","",0],
[669,11,1,1,"","",0],
[670,1,1,1,"","",1],
[670,3,1,1,"2026-03-13","Luis Salgado",2],
[670,5,1,1,"","",1],
[670,9,1,1,"","",0],
[670,11,1,1,"","",0],
[671,1,1,1,"","",1],
[671,3,1,1,"2026-03-13","Luis Salgado",2],
[671,5,1,1,"","",1],
[671,9,1,1,"","",0],
[671,11,1,1,"","",0],
[672,1,1,1,"","",1],
[672,3,1,1,"2026-03-13","Luis Salgado",2],
[672,5,1,1,"","",1],
[672,9,1,1,"","",0],
[672,11,1,1,"","",0],
[673,1,1,1,"","",1],
[673,3,1,1,"2026-03-13","Luis Salgado",2],
[673,5,1,1,"","",1],
[673,9,1,1,"","",0],
[673,11,1,1,"","",0],
[674,1,1,1,"","",1],
[674,3,1,1,"2026-03-13","Luis Salgado",2],
[674,5,1,1,"","",1],
[674,9,1,1,"","",0],
[674,11,1,1,"","",0],
[675,1,1,1,"","",1],
[675,3,1,1,"2026-03-13","Luis Salgado",2],
[675,5,1,1,"","",1],
[675,9,1,1,"","",0],
[675,11,1,1,"","",0],
[676,1,1,1,"","",1],
[676,3,1,1,"2026-04-21","Natural Core",2],
[676,5,1,1,"","",1],
[676,9,1,1,"","",0],
[676,11,1,1,"","",0],
[677,1,1,1,"","",1],
[677,3,1,1,"2026-04-21","Natural Core",2],
[677,5,1,1,"","",1],
[677,9,1,1,"","",0],
[677,11,1,1,"","",0],
[678,1,1,1,"","",1],
[678,3,1,1,"2026-04-21","Natural Core",2],
[678,5,1,1,"","",1],
[678,9,1,1,"","",0],
[678,11,1,1,"","",0],
[679,1,1,1,"","",1],
[679,3,1,1,"2026-04-21","Natural Core",2],
[679,5,1,1,"","",1],
[679,9,1,1,"","",0],
[679,11,1,1,"","",0],
[680,1,1,1,"","",1],
[680,3,1,1,"2026-04-21","Natural Core",2],
[680,5,1,1,"","",1],
[680,9,1,1,"","",0],
[680,11,1,1,"","",0],
[681,1,1,1,"","",1],
[681,3,1,1,"2026-04-21","Natural Core",2],
[681,5,1,1,"","",1],
[681,9,1,1,"","",0],
[681,11,1,1,"","",0],
[682,1,1,1,"","",1],
[682,3,1,1,"2026-03-13","Luis Salgado",2],
[682,5,1,1,"","",1],
[682,9,1,1,"","",0],
[682,11,1,1,"","",0],
[683,1,1,1,"","",1],
[683,3,1,1,"2026-03-13","Luis Salgado",2],
[683,5,1,1,"","",1],
[683,9,1,1,"","",0],
[683,11,1,1,"","",0],
[684,1,1,1,"","",1],
[684,3,1,1,"2026-03-13","Luis Salgado",2],
[684,5,1,1,"","",1],
[684,9,1,1,"","",0],
[684,11,1,1,"","",0],
[685,1,1,1,"","",1],
[685,3,1,0,"","",1],
[685,5,1,1,"","",1],
[685,9,1,1,"","",0],
[685,11,1,1,"","",0],
[686,1,1,1,"","",1],
[686,3,1,0,"","",1],
[686,5,1,1,"","",1],
[686,9,1,1,"","",0],
[686,11,1,1,"","",0],
[687,1,1,1,"","",1],
[687,3,1,0,"","",1],
[687,5,1,1,"","",1],
[687,9,1,1,"","",0],
[687,11,1,1,"","",0],
[688,1,1,1,"","",1],
[688,3,1,0,"","",1],
[688,5,1,1,"","",1],
[688,9,1,1,"","",0],
[688,11,1,1,"","",0],
[689,1,1,0,"","",1],
[689,2,1,0,"","",1],
[689,3,1,0,"","",1],
[689,4,1,0,"","",1],
[689,5,1,0,"","",1],
[689,6,1,0,"","",1],
[689,7,1,0,"","",0],
[689,8,1,0,"","",0],
[689,9,1,0,"","",0],
[689,10,1,0,"","",0],
[689,11,1,0,"","",0],
[689,12,1,0,"","",0],
[690,1,1,0,"","",1],
[690,2,1,0,"","",1],
[690,3,1,0,"","",1],
[690,4,1,0,"","",1],
[690,5,1,0,"","",1],
[690,6,1,0,"","",1],
[690,7,1,0,"","",0],
[690,8,1,0,"","",0],
[690,9,1,0,"","",0],
[690,10,1,0,"","",0],
[690,11,1,0,"","",0],
[690,12,1,0,"","",0],
[691,1,1,0,"","",1],
[691,2,1,0,"","",1],
[691,3,1,0,"","",1],
[691,4,1,0,"","",1],
[691,5,1,0,"","",1],
[691,6,1,0,"","",1],
[691,7,1,0,"","",0],
[691,8,1,0,"","",0],
[691,9,1,0,"","",0],
[691,10,1,0,"","",0],
[691,11,1,0,"","",0],
[691,12,1,0,"","",0],
[692,1,1,0,"","",1],
[692,2,1,0,"","",1],
[693,3,1,0,"","",1],
[692,4,1,0,"","",1],
[692,5,1,0,"","",1],
[692,6,1,0,"","",1],
[692,7,1,0,"","",0],
[692,8,1,0,"","",0],
[692,9,1,0,"","",0],
[692,10,1,0,"","",0],
[692,11,1,0,"","",0],
[692,12,1,0,"","",0],
[694,1,1,0,"","",1],
[694,2,1,0,"","",1],
[694,3,1,0,"","",1],
[694,4,1,0,"","",1],
[694,5,1,0,"","",1],
[694,6,1,0,"","",1],
[694,7,1,0,"","",0],
[694,8,1,0,"","",0],
[694,9,1,0,"","",0],
[694,10,1,0,"","",0],
[694,11,1,0,"","",0],
[694,12,1,0,"","",0],
[695,1,1,1,"","",1],
[695,4,1,1,"","",1],
[696,4,1,1,"","",1],
[697,4,1,1,"","",1],
[698,4,1,1,"","",1],
[699,4,1,1,"","",1],
[700,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[700,3,1,0,"","Roiner Rodriguez Tovar",1],
[700,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[700,7,1,0,"","",0],
[700,9,1,0,"","",0],
[700,11,1,0,"","",0],
[701,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[701,3,1,0,"","Roiner Rodriguez Tovar",1],
[701,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[701,7,1,0,"","",0],
[701,9,1,0,"","",0],
[701,11,1,0,"","",0],
[702,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[702,3,1,0,"","Roiner Rodriguez Tovar",1],
[702,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[702,7,1,0,"","",0],
[702,9,1,0,"","",0],
[702,11,1,0,"","",0],
[703,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[703,3,1,0,"","Roiner Rodriguez Tovar",1],
[703,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[703,7,1,0,"","",0],
[703,9,1,0,"","",0],
[703,11,1,0,"","",0],
[704,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[704,3,1,0,"","Roiner Rodriguez Tovar",1],
[704,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[704,7,1,0,"","",0],
[704,9,1,0,"","",0],
[704,11,1,0,"","",0],
[705,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[705,3,1,0,"","Roiner Rodriguez Tovar",1],
[705,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[705,7,1,0,"","",0],
[705,9,1,0,"","",0],
[705,11,1,0,"","",0],
[706,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[706,3,1,0,"","Roiner Rodriguez Tovar",1],
[706,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[706,7,1,0,"","",0],
[706,9,1,0,"","",0],
[706,11,1,0,"","",0],
[707,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[707,3,1,0,"","Roiner Rodriguez Tovar",1],
[707,5,1,0,"2026-05-16","Roiner Rodriguez Tovar",2],
[707,7,1,0,"","",0],
[707,9,1,0,"","",0],
[707,11,1,0,"","",0],
[708,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[708,3,1,0,"","Roiner Rodriguez Tovar",1],
[708,5,1,0,"","",1],
[708,7,1,0,"","",0],
[708,9,1,0,"","",0],
[708,11,1,0,"","",0],
[709,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[709,3,1,0,"","Roiner Rodriguez Tovar",1],
[709,5,1,0,"","",1],
[709,7,1,0,"","",0],
[709,9,1,0,"","",0],
[709,11,1,0,"","",0],
[710,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[710,3,1,0,"","Roiner Rodriguez Tovar",1],
[710,5,1,0,"","",1],
[710,7,1,0,"","",0],
[710,9,1,0,"","",0],
[710,11,1,0,"","",0],
[711,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[711,3,1,0,"","Roiner Rodriguez Tovar",1],
[711,5,1,0,"","",1],
[711,7,1,0,"","",0],
[711,9,1,0,"","",0],
[711,11,1,0,"","",0],
[712,1,1,0,"","",1],
[712,3,1,0,"","Roiner Rodriguez Tovar",1],
[712,5,1,0,"","",1],
[712,7,1,0,"","",0],
[712,9,1,0,"","",0],
[712,11,1,0,"","",0],
[713,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[713,3,1,0,"","Roiner Rodriguez Tovar",1],
[713,5,1,0,"","",1],
[713,7,1,0,"","",0],
[713,9,1,0,"","",0],
[713,11,1,0,"","",0],
[714,1,1,0,"2026-01-08","ROINER RODRIGUEZ",2],
[714,3,1,0,"","Roiner Rodriguez Tovar",1],
[714,5,1,0,"","",1],
[714,7,1,0,"","",0],
[714,9,1,0,"","",0],
[714,11,1,0,"","",0],
[715,2,1,0,"","",1],
[715,4,1,0,"","Roiner Rodriguez Tovar",1],
[715,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[715,8,1,0,"","",0],
[715,10,1,0,"","",0],
[715,12,1,0,"","",0],
[716,2,1,0,"","",1],
[716,4,1,0,"","Roiner Rodriguez Tovar",1],
[716,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[716,8,1,0,"","",0],
[716,10,1,0,"","",0],
[716,12,1,0,"","",0],
[717,2,1,0,"","",1],
[717,4,1,0,"","Roiner Rodriguez Tovar",1],
[717,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[717,8,1,0,"","",0],
[717,10,1,0,"","",0],
[717,12,1,0,"","",0],
[718,2,1,0,"","",1],
[718,4,1,0,"","Roiner Rodriguez Tovar",1],
[718,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[718,8,1,0,"","",0],
[718,10,1,0,"","",0],
[718,12,1,0,"","",0],
[719,2,1,0,"","",1],
[719,4,1,0,"","Roiner Rodriguez Tovar",1],
[719,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[719,8,1,0,"","",0],
[719,10,1,0,"","",0],
[719,12,1,0,"","",0],
[720,2,1,0,"","",1],
[720,4,1,0,"","Roiner Rodriguez Tovar",1],
[720,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[720,8,1,0,"","",0],
[720,10,1,0,"","",0],
[720,12,1,0,"","",0],
[721,2,1,0,"","",1],
[721,4,1,0,"","Roiner Rodriguez Tovar",1],
[721,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[721,8,1,0,"","",0],
[721,10,1,0,"","",0],
[721,12,1,0,"","",0],
[722,2,1,0,"","",1],
[722,4,1,0,"","Roiner Rodriguez Tovar",1],
[722,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[722,8,1,0,"","",0],
[722,10,1,0,"","",0],
[722,12,1,0,"","",0],
[723,2,1,0,"","",1],
[723,4,1,0,"","Roiner Rodriguez Tovar",1],
[723,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[723,8,1,0,"","",0],
[723,10,1,0,"","",0],
[723,12,1,0,"","",0],
[724,2,1,0,"","",1],
[724,4,1,0,"","Roiner Rodriguez Tovar",1],
[724,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[724,8,1,0,"","",0],
[724,10,1,0,"","",0],
[724,12,1,0,"","",0],
[725,2,1,0,"","",1],
[725,4,1,0,"","Roiner Rodriguez Tovar",1],
[725,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[725,8,1,0,"","",0],
[725,10,1,0,"","",0],
[725,12,1,0,"","",0],
[725,2,1,0,"","",1],
[725,4,1,0,"","Roiner Rodriguez Tovar",1],
[725,6,1,0,"2026-06-15","Oscar Alfonso Carcamo Angulo",2],
[725,8,1,0,"","",0],
[725,10,1,0,"","",0],
[725,12,1,0,"","",0],
[726,2,1,0,"","",1],
[726,4,1,0,"2026-04-26","Oscar Alfonso Carcamo Angulo",2],
[726,6,1,0,"2026-06-18","Oscar Alfonso Carcamo Angulo",2],
[726,8,1,0,"","",0],
[726,10,1,0,"","",0],
[726,12,1,0,"","",0],
[727,2,1,0,"","",1],
[727,4,1,0,"2026-04-26","Oscar Alfonso Carcamo Angulo",2],
[727,6,1,0,"2026-06-18","Oscar Alfonso Carcamo Angulo",2],
[727,8,1,0,"","",0],
[727,10,1,0,"","",0],
[727,12,1,0,"","",0],
[728,2,1,0,"","",1],
[728,4,1,0,"","",1],
[728,6,1,0,"2026-06-18","Oscar Alfonso Carcamo Angulo",2],
[728,8,1,0,"","",0],
[728,10,1,0,"","",0],
[728,12,1,0,"","",0],
[729,1,1,0,"","",1],
[729,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[729,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[729,7,1,0,"","",0],
[729,9,1,0,"","",0],
[729,11,1,0,"","",0],
[730,1,1,0,"","",1],
[730,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[730,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[730,7,1,0,"","",0],
[730,9,1,0,"","",0],
[730,11,1,0,"","",0],
[731,1,1,0,"","",1],
[731,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[731,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[731,7,1,0,"","",0],
[731,9,1,0,"","",0],
[731,11,1,0,"","",0],
[732,1,1,0,"","",1],
[732,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[732,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[732,7,1,0,"","",0],
[732,9,1,0,"","",0],
[732,11,1,0,"","",0],
[733,1,1,0,"","",1],
[733,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[733,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[733,7,1,0,"","",0],
[733,9,1,0,"","",0],
[733,11,1,0,"","",0],
[734,1,1,0,"","",1],
[734,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[734,5,1,0,"2026-05-19","Roiner Rodriguez Tovar",2],
[734,7,1,0,"","",0],
[734,9,1,0,"","",0],
[734,11,1,0,"","",0],
[735,1,1,0,"","",1],
[735,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[735,5,1,0,"2026-05-20","Roiner Rodriguez Tovar",2],
[735,7,1,0,"","",0],
[735,9,1,0,"","",0],
[735,11,1,0,"","",0],
[736,1,1,0,"","",1],
[736,3,1,0,"2026-03-21","Oscar Alfonso Carcamo Angulo",2],
[736,5,1,0,"2026-05-20","Roiner Rodriguez Tovar",2],
[736,7,1,0,"","",0],
[736,9,1,0,"","",0],
[736,11,1,0,"","",0],
[737,1,1,0,"","",1],
[737,3,1,0,"2026-03-21","Roiner Rodriguez Tovar",2],
[737,5,1,0,"2026-05-20","Roiner Rodriguez Tovar",2],
[737,7,1,0,"","",0],
[737,9,1,0,"","",0],
[737,11,1,0,"","",0],
[738,1,1,0,"","",1],
[738,3,1,0,"","",1],
[738,5,1,0,"2026-05-20","Roiner Rodriguez Tovar",2],
[738,7,1,0,"","",0],
[738,9,1,0,"","",0],
[738,11,1,0,"","",0],
[739,1,1,0,"","",1],
[739,3,1,0,"","",1],
[739,5,1,0,"","",1],
[739,7,1,0,"","",0],
[739,9,1,0,"","",0],
[739,11,1,0,"","",0],
[740,1,1,0,"","",1],
[740,3,1,0,"","",1],
[740,5,1,0,"","",1],
[740,7,1,0,"","",0],
[740,9,1,0,"","",0],
[740,11,1,0,"","",0],
[741,1,1,0,"","",1],
[741,3,1,0,"","",1],
[741,5,1,0,"","",1],
[741,7,1,0,"","",0],
[741,9,1,0,"","",0],
[741,11,1,0,"","",0],
[742,1,1,0,"","",1],
[742,3,1,0,"","",1],
[742,5,1,0,"","",1],
[742,7,1,0,"","",0],
[742,9,1,0,"","",0],
[742,11,1,0,"","",0],
[743,1,1,0,"","",1],
[743,3,1,0,"","",1],
[743,5,1,0,"","",1],
[743,7,1,0,"","",0],
[743,9,1,0,"","",0],
[743,11,1,0,"","",0],
[744,2,1,0,"","",1],
[744,4,1,0,"","",1],
[744,6,1,0,"2026-06-18","Oscar Alfonso Carcamo Angulo",2],
[744,8,1,0,"","",0],
[744,10,1,0,"","",0],
[744,12,1,0,"","",0],
[745,2,1,0,"","",1],
[745,4,1,0,"","",1],
[745,6,1,0,"2026-06-18","Oscar Alfonso Carcamo Angulo",2],
[745,8,1,0,"","",0],
[745,10,1,0,"","",0],
[745,12,1,0,"","",0],
[746,2,1,0,"","",1],
[746,4,1,0,"","",1],
[746,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[746,8,1,0,"","",0],
[746,10,1,0,"","",0],
[746,12,1,0,"","",0],
[747,2,1,0,"","",1],
[747,4,1,0,"","",1],
[747,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[747,8,1,0,"","",0],
[747,10,1,0,"","",0],
[747,12,1,0,"","",0],
[748,2,1,0,"","",1],
[748,4,1,0,"","",1],
[748,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[748,8,1,0,"","",0],
[748,10,1,0,"","",0],
[748,12,1,0,"","",0],
[749,2,1,0,"","",1],
[749,4,1,0,"","",1],
[749,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[749,8,1,0,"","",0],
[749,10,1,0,"","",0],
[749,12,1,0,"","",0],
[750,2,1,0,"","",1],
[750,4,1,0,"","",1],
[750,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[750,8,1,0,"","",0],
[750,10,1,0,"","",0],
[750,12,1,0,"","",0],
[751,2,1,0,"","",1],
[751,4,1,0,"","",1],
[751,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[751,8,1,0,"","",0],
[751,10,1,0,"","",0],
[751,12,1,0,"","",0],
[752,2,1,0,"","",1],
[752,4,1,0,"","",1],
[752,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[752,8,1,0,"","",0],
[752,10,1,0,"","",0],
[752,12,1,0,"","",0],
[753,2,1,0,"","",1],
[753,4,1,0,"","",1],
[753,6,1,0,"2026-06-27","Oscar Alfonso Carcamo Angulo",2],
[753,8,1,0,"","",0],
[753,10,1,0,"","",0],
[753,12,1,0,"","",0],
[754,2,1,0,"","",1],
[754,4,1,0,"","",1],
[754,6,1,0,"","",1],
[754,8,1,0,"","",0],
[754,10,1,0,"","",0],
[754,12,1,0,"","",0],
[755,2,1,0,"","",1],
[755,6,1,0,"","",1],
[755,9,1,0,"","",0],
[755,12,1,0,"","",0],
[756,2,1,0,"","",1],
[756,6,1,0,"","",1],
[756,9,1,0,"","",0],
[756,12,1,0,"","",0],
[757,2,1,0,"","",1],
[757,6,1,0,"","",1],
[757,9,1,0,"","",0],
[757,12,1,0,"","",0],
[758,2,1,0,"","",1],
[758,6,1,0,"","",1],
[758,9,1,0,"","",0],
[758,12,1,0,"","",0],
[759,9,1,0,"","",0],
[760,1,1,0,"","",1],
[760,4,1,0,"","",1],
[760,7,1,0,"","",0],
[760,10,1,0,"","",0],
[760,11,1,0,"","",0],
[760,12,1,0,"","",0],
[761,1,1,0,"","",1],
[761,4,1,0,"","",1],
[761,7,1,0,"","",0],
[761,10,1,0,"","",0],
[761,11,1,0,"","",0],
[762,1,1,0,"","",1],
[762,4,1,0,"","",1],
[762,7,1,0,"","",0],
[762,10,1,0,"","",0],
[762,11,1,0,"","",0],
[755,1,1,0,"","",1],
[755,4,1,0,"","",1],
[755,7,1,0,"","",0],
[755,10,1,0,"","",0],
[755,11,1,0,"","",0],
[763,1,1,0,"","",1],
[763,4,1,0,"","",1],
[763,7,1,0,"","",0],
[763,10,1,0,"","",0],
[763,11,1,0,"","",0],
[764,1,1,0,"","",1],
[764,4,1,0,"","",1],
[764,7,1,0,"","",0],
[764,10,1,0,"","",0],
[764,11,1,0,"","",0],
[765,1,1,0,"","",1],
[765,4,1,0,"","",1],
[765,7,1,0,"","",0],
[765,10,1,0,"","",0],
[765,11,1,0,"","",0],
[766,1,1,0,"","",1],
[766,4,1,0,"","",1],
[766,7,1,0,"","",0],
[766,10,1,0,"","",0],
[766,11,1,0,"","",0],
[767,1,1,0,"","",1],
[767,4,1,0,"","",1],
[767,7,1,0,"","",0],
[767,10,1,0,"","",0],
[767,11,1,0,"","",0],
[768,1,1,0,"","",1],
[768,4,1,0,"","",1],
[768,7,1,0,"","",0],
[768,10,1,0,"","",0],
[768,11,1,0,"","",0],
[769,1,1,0,"","",1],
[769,4,1,0,"","",1],
[769,7,1,0,"","",0],
[769,10,1,0,"","",0],
[769,11,1,0,"","",0],
[770,1,1,0,"","",1],
[770,4,1,0,"","",1],
[770,7,1,0,"","",0],
[770,10,1,0,"","",0],
[770,11,1,0,"","",0],
[771,1,1,0,"","",1],
[771,4,1,0,"","",1],
[771,7,1,0,"","",0],
[771,10,1,0,"","",0],
[771,11,1,0,"","",0],
[772,1,1,0,"","",1],
[772,4,1,0,"","",1],
[772,7,1,0,"","",0],
[772,10,1,0,"","",0],
[772,11,1,0,"","",0],
[773,1,1,0,"","",1],
[773,4,1,0,"","",1],
[773,7,1,0,"","",0],
[773,10,1,0,"","",0],
[773,11,1,0,"","",0],
[774,1,1,0,"","",1],
[774,4,1,0,"","",1],
[774,7,1,0,"","",0],
[774,10,1,0,"","",0],
[775,1,1,0,"","",1],
[775,4,1,0,"","",1],
[775,7,1,0,"","",0],
[775,10,1,0,"","",0],
[776,1,1,0,"","",1],
[776,4,1,0,"","",1],
[776,7,1,0,"2026-06-18","Roiner Rodriguez Tovar",2],
[776,10,1,0,"","",0],
[777,1,1,0,"","",1],
[777,4,1,0,"","",1],
[777,7,1,0,"2026-06-18","Roiner Rodriguez Tovar",2],
[777,10,1,0,"","",0],
[778,1,1,0,"","",1],
[778,4,1,0,"","",1],
[778,7,1,0,"2026-06-18","Roiner Rodriguez Tovar",2],
[778,10,1,0,"","",0],
[779,1,1,0,"","",1],
[779,4,1,0,"","",1],
[779,7,1,0,"2026-06-18","Roiner Rodriguez Tovar",2],
[779,10,1,0,"","",0],
[780,1,1,0,"","",1],
[780,4,1,0,"","",1],
[780,7,1,0,"2026-06-18","Roiner Rodriguez Tovar",2],
[780,10,1,0,"","",0],
[781,1,1,0,"","",1],
[781,4,1,0,"","",1],
[781,7,1,0,"","",0],
[781,10,1,0,"","",0],
[782,1,1,0,"","",1],
[782,4,1,0,"","",1],
[782,7,1,0,"","",0],
[782,10,1,0,"","",0],
[783,1,1,0,"","",1],
[783,4,1,0,"","",1],
[783,7,1,0,"","",0],
[783,10,1,0,"","",0],
[784,1,1,0,"","",1],
[784,4,1,0,"","",1],
[784,7,1,0,"","",0],
[784,10,1,0,"","",0],
[785,1,1,0,"","",1],
[785,4,1,0,"","",1],
[785,7,1,0,"","",0],
[785,10,1,0,"","",0],
[786,1,1,0,"","",1],
[786,4,1,0,"","",1],
[786,7,1,0,"","",0],
[786,10,1,0,"","",0],
[787,1,1,0,"","",1],
[787,4,1,0,"","",1],
[787,7,1,0,"","",0],
[787,10,1,0,"","",0],
[788,1,1,0,"","",1],
[788,4,1,0,"","",1],
[788,7,1,0,"","",0],
[788,10,1,0,"","",0],
[789,1,1,0,"","",1],
[789,4,1,0,"","",1],
[789,7,1,0,"","",0],
[789,10,1,0,"","",0],
[790,1,1,0,"","",1],
[790,4,1,0,"","",1],
[790,7,1,0,"","",0],
[790,10,1,0,"","",0],
[791,1,1,0,"","",1],
[791,4,1,0,"","",1],
[791,7,1,0,"","",0],
[791,10,1,0,"","",0],
[792,1,1,0,"","",1],
[792,4,1,0,"","",1],
[792,7,1,0,"","",0],
[792,10,1,0,"","",0],
[793,1,1,0,"","",1],
[793,4,1,0,"","",1],
[793,7,1,0,"","",0],
[793,10,1,0,"","",0],
[794,1,1,0,"","",1],
[794,4,1,0,"","",1],
[794,7,1,0,"","",0],
[794,10,1,0,"","",0],
[795,1,1,0,"","",1],
[795,4,1,0,"","",1],
[795,7,1,0,"","",0],
[795,10,1,0,"","",0],
[796,1,1,0,"","",1],
[796,4,1,0,"","",1],
[796,7,1,0,"","",0],
[796,10,1,0,"","",0],
[797,1,1,0,"","",1],
[797,4,1,0,"","",1],
[797,7,1,0,"","",0],
[797,10,1,0,"","",0],
[798,1,1,0,"","",1],
[798,4,1,0,"","",1],
[798,7,1,0,"","",0],
[798,10,1,0,"","",0],
[799,1,1,0,"","",1],
[799,4,1,0,"","",1],
[799,7,1,0,"","",0],
[799,10,1,0,"","",0],
[800,1,1,0,"","",1],
[800,4,1,0,"","",1],
[800,7,1,0,"","",0],
[800,10,1,0,"","",0],
[801,1,1,0,"","",1],
[801,4,1,0,"","",1],
[801,7,1,0,"","",0],
[801,10,1,0,"","",0],
[802,8,1,1,"","",0],
[803,8,1,1,"","",0],
[804,8,1,1,"","",0],
[805,8,1,1,"","",0],
[806,8,1,1,"","",0],
[807,1,1,1,"","",1],
[807,4,1,1,"","",1],
[807,10,1,1,"","",0],
[808,1,1,1,"","",1],
[808,4,1,1,"","",1],
[808,10,1,1,"","",0],
[809,1,1,1,"","",1],
[809,4,1,1,"","",1],
[809,10,1,1,"","",0],
[810,1,1,1,"","",1],
[810,4,1,1,"","",1],
[810,10,1,1,"","",0],
[811,1,1,1,"","",1],
[811,4,1,1,"","",1],
[811,10,1,1,"","",0],
[812,1,1,1,"","",1],
[812,4,1,1,"","",1],
[812,10,1,1,"","",0],
[813,1,1,1,"","",1],
[813,4,1,1,"","",1],
[813,10,1,1,"","",0],
[814,1,1,1,"","",1],
[814,4,1,1,"","",1],
[814,10,1,1,"","",0],
[815,1,1,1,"","",1],
[815,4,1,1,"","",1],
[815,10,1,1,"","",0],
[816,1,1,1,"","",1],
[816,4,1,1,"","",1],
[816,10,1,1,"","",0],
[817,1,1,1,"","",1],
[817,4,1,1,"","",1],
[817,10,1,1,"","",0],
[818,1,1,1,"","",1],
[818,4,1,1,"","",1],
[818,8,1,1,"","",0],
[818,10,1,1,"","",0],
[818,12,1,1,"","",0],
[819,1,1,1,"","",1],
[819,4,1,1,"","",1],
[819,8,1,1,"","",0],
[819,10,1,1,"","",0],
[819,12,1,1,"","",0],
[820,1,1,1,"","",1],
[820,4,1,1,"","",1],
[820,8,1,1,"","",0],
[820,10,1,1,"","",0],
[820,12,1,1,"","",0],
[821,1,1,1,"","",1],
[821,4,1,1,"","",1],
[821,8,1,1,"","",0],
[821,10,1,1,"","",0],
[821,12,1,1,"","",0],
[822,1,1,1,"","",1],
[822,4,1,1,"","",1],
[822,8,1,1,"","",0],
[822,10,1,1,"","",0],
[822,12,1,1,"","",0],
[823,1,1,1,"","",1],
[823,4,1,1,"","",1],
[823,8,1,1,"","",0],
[823,10,1,1,"","",0],
[823,12,1,1,"","",0],
[824,1,1,1,"","",1],
[824,4,1,1,"","",1],
[824,8,1,1,"","",0],
[824,10,1,1,"","",0],
[824,12,1,1,"","",0],
[825,1,1,1,"","",1],
[825,4,1,1,"","",1],
[825,8,1,1,"","",0],
[825,10,1,1,"","",0],
[825,12,1,1,"","",0],
[826,3,1,1,"","",1],
[826,8,1,1,"","",0],
[826,9,1,1,"","",0],
[827,3,1,1,"","",1],
[827,9,1,1,"","",0],
[827,3,1,1,"","",1],
[827,9,1,1,"","",0],
[828,3,1,1,"","",1],
[828,9,1,1,"","",0],
[829,3,1,1,"","",1],
[829,9,1,1,"","",0],
[830,3,1,1,"2026-04-21","Natural Core",2],
[830,9,1,1,"","",0],
[831,3,1,1,"2026-04-21","Natural Core",2],
[831,9,1,1,"","",0],
[832,3,1,1,"2026-04-21","Natural Core",2],
[832,9,1,1,"","",0],
[833,3,1,1,"","",1],
[833,9,1,1,"","",0],
[833,3,1,1,"","",1],
[833,9,1,1,"","",0],
[834,3,1,1,"","",1],
[834,9,1,1,"","",0],
[834,3,1,1,"","",1],
[834,9,1,1,"","",0],
[834,3,1,1,"","",1],
[834,9,1,1,"","",0],
[835,1,1,0,"2026-01-13","JESUS QUINTANA",2],
[836,1,1,0,"2026-01-13","JESUS QUINTANA",2],
[837,1,1,0,"2026-01-13","JESUS QUINTANA",2],
[838,1,1,0,"2026-01-13","JESUS QUINTANA",2],
[839,1,1,0,"","",1],
[840,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[841,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[842,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[843,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[844,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[845,1,1,0,"2026-01-14","JESUS QUINTANA",2],
[846,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[847,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[848,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[849,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[850,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[851,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[852,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[853,1,1,0,"2026-01-12","JESUS QUINTANA",2],
[854,1,1,0,"","",1],
[855,1,1,0,"","",1],
[856,1,1,0,"2026-01-16","JESUS QUINTANA",2],
[857,1,1,0,"2026-01-16","JESUS QUINTANA",2],
[858,1,1,0,"2026-01-16","JESUS QUINTANA",2],
[859,1,1,0,"2026-06-26","EDISON CARMONA",2],
[860,1,1,0,"2026-06-26","EDISON CARMONA",2],
[861,1,1,0,"2026-06-26","EDISON CARMONA",2],
[862,1,1,0,"2026-06-26","EDISON CARMONA",2],
[863,1,1,0,"","",1],
[864,1,1,0,"","",1],
[865,1,1,0,"","",1],
[866,1,1,0,"","",1],
[867,1,1,0,"","",1],
[868,1,1,0,"","",1],
[869,1,1,0,"","",1],
[870,1,1,0,"","",1],
[871,1,1,0,"","",1],
[872,1,1,0,"","",1],
[873,2,1,1,"","",1],
[873,6,1,1,"","",1],
[873,10,1,1,"","",0],
[874,2,1,1,"","",1],
[874,6,1,1,"","",1],
[874,10,1,1,"","",0],
[875,2,1,1,"","",1],
[875,6,1,1,"","",1],
[875,10,1,1,"","",0],
[876,2,1,1,"","",1],
[876,6,1,1,"","",1],
[876,10,1,1,"","",0],
[877,2,1,1,"","",1],
[877,6,1,1,"","",1],
[877,10,1,1,"","",0],
[878,2,1,1,"","",1],
[878,6,1,1,"","",1],
[878,10,1,1,"","",0],
[879,2,1,1,"","",1],
[879,6,1,1,"","",1],
[879,10,1,1,"","",0],
[880,2,1,1,"","",1],
[880,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[880,10,1,1,"","",0],
[881,2,1,1,"","",1],
[881,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[881,10,1,1,"","",0],
[882,2,1,1,"","",1],
[882,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[882,10,1,1,"","",0],
[883,2,1,1,"","",1],
[883,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[883,10,1,1,"","",0],
[884,2,1,1,"2026-02-12","NILSON FONTALVO",2],
[884,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[884,10,1,1,"","",0],
[885,2,1,1,"2026-02-12","NILSON FONTALVO",2],
[885,6,1,1,"2026-06-15","Jhon Fredis Arias Romero",2],
[885,10,1,1,"","",0],
[886,2,1,1,"","",1],
[886,6,1,1,"","",1],
[886,10,1,1,"","",0],
[887,2,1,1,"","",1],
[887,6,1,1,"","",1],
[887,10,1,1,"","",0],
[888,2,1,1,"","",1],
[888,6,1,1,"","",1],
[888,10,1,1,"","",0],
[889,1,1,1,"","",1],
[889,6,1,1,"","",1],
[890,1,1,1,"","",1],
[891,1,1,1,"","",1],
[892,1,1,1,"","",1],
[893,1,1,1,"","",1],
[894,2,1,0,"","",1],
[894,11,1,0,"","",0],
[895,2,1,0,"","",1],
[895,11,1,0,"","",0],
[896,1,1,1,"","",1],
[897,2,1,0,"","",1],
[897,11,1,0,"","",0],
[898,2,1,0,"","",1],
[898,11,1,0,"","",0],
[899,1,1,1,"","",1],
[900,1,1,1,"","",1],
[901,1,1,1,"","",1],
[902,1,1,1,"","",1],
[903,1,1,1,"","",1],
[904,1,1,1,"","",1],
[905,1,1,1,"","",1],
[906,1,1,1,"","",1],
[907,2,1,1,"","",1],
[907,9,1,1,"","",0],
[908,1,1,1,"","",1],
[908,2,1,1,"","",1],
[908,9,1,1,"","",0],
[909,1,1,1,"","",1],
[909,2,1,1,"","",1],
[909,3,1,1,"","",1],
[909,4,1,1,"","",1],
[909,5,1,1,"","",1],
[909,6,1,1,"","",1],
[909,8,1,1,"","",0],
[909,9,1,1,"","",0],
[909,10,1,1,"","",0],
[909,11,1,1,"","",0],
[909,12,1,1,"","",0],
[910,3,1,1,"","",1],
[911,1,1,1,"","",1],
[911,6,1,1,"","",1],
[912,4,1,0,"","",1],
[912,6,1,0,"","",1],
[912,8,1,0,"","",0],
[912,10,1,0,"","",0],
[912,12,1,0,"","",0],
[912,2,1,0,"","",1],
[913,4,0,0,"","",1],
[913,6,0,0,"","",1],
[913,8,0,0,"","",0],
[913,10,0,0,"","",0],
[913,12,0,0,"","",0],
[913,2,0,0,"","",1],
[914,4,0,0,"","",1],
[914,6,0,0,"","",1],
[914,8,0,0,"","",0],
[914,10,0,0,"","",0],
[914,12,0,0,"","",0],
[914,2,0,0,"","",1],
[915,4,0,0,"","",1],
[915,6,0,0,"","",1],
[915,8,0,0,"","",0],
[915,10,0,0,"","",0],
[915,12,0,0,"","",0],
[915,2,0,0,"","",1],
[916,4,0,0,"","",1],
[916,6,0,0,"","",1],
[916,8,0,0,"","",0],
[916,10,0,0,"","",0],
[916,12,0,0,"","",0],
[916,2,0,0,"","",1],
[917,4,0,0,"","",1],
[917,6,0,0,"","",1],
[917,8,0,0,"","",0],
[917,10,0,0,"","",0],
[917,12,0,0,"","",0],
[917,2,0,0,"","",1],
[918,4,0,0,"","",1],
[918,6,0,0,"","",1],
[918,8,0,0,"","",0],
[918,10,0,0,"","",0],
[918,12,0,0,"","",0],
[918,2,0,0,"","",1],
[919,4,0,0,"","",1],
[919,6,0,0,"","",1],
[919,8,0,0,"","",0],
[919,10,0,0,"","",0],
[919,12,0,0,"","",0],
[919,2,0,0,"","",1],
];
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
   HORARIOS — datos importados del Excel de julio 2026
   ============================================================ */
// Datos importados desde 11__Horario_Julio2_2026.xlsx (28 empleados, 16/07 - 02/08/2026)
const JULY2026_IMPORT_NAMES = [
  "Arias Jhon Fredis",
  "Barrios Astrid",
  "Bonfante Ilsa Corina",
  "Calderon Edison Andres",
  "Carcamo Oscar Alfonso",
  "Carmona Edinson Jose",
  "Cervantes Yair Jose",
  "Chiquillo Juan",
  "De la rosa Lenin Jose",
  "Durant Zarith Elias",
  "Esalas Felix Jose",
  "Fontalvo Nilson Javier",
  "Gomez Pedro Claver",
  "Hurtado Jaime",
  "Jimenez Jesus Daniel",
  "Jimenez Jesus Maria",
  "Martelo Diego Alfonso",
  "Montalvo Gabriel",
  "Quintana Jesus Daniel",
  "Rodriguez Roiner",
  "Salcedo Adel",
  "Serpa Veronica Maria",
  "Serrano Perez Pedro",
  "Simancas Felipe",
  "Taborda Roymar",
  "Tapias Mauricio",
  "Teran Tairo",
  "Toro Carlos Eduardo",
];
const JULY2026_IMPORT_ENTRIES = [
  {name:"Bonfante Ilsa Corina", date:"2026-07-16", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-17", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-21", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-22", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-23", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-24", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-25", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-27", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-28", code:"VAC"},
  {name:"Bonfante Ilsa Corina", date:"2026-07-29", entrada:8.0, salida:17.0},
  {name:"Bonfante Ilsa Corina", date:"2026-07-30", entrada:8.0, salida:17.5},
  {name:"Bonfante Ilsa Corina", date:"2026-07-31", entrada:8.0, salida:17.5},
  {name:"Serpa Veronica Maria", date:"2026-07-16", entrada:8.5, salida:16.5},
  {name:"Serpa Veronica Maria", date:"2026-07-17", entrada:8.5, salida:17.0},
  {name:"Serpa Veronica Maria", date:"2026-07-18", entrada:9.0, salida:13.0},
  {name:"Serpa Veronica Maria", date:"2026-07-21", entrada:8.5, salida:17.5},
  {name:"Serpa Veronica Maria", date:"2026-07-22", entrada:8.5, salida:17.0},
  {name:"Serpa Veronica Maria", date:"2026-07-23", entrada:8.5, salida:17.5},
  {name:"Serpa Veronica Maria", date:"2026-07-24", entrada:8.5, salida:17.5},
  {name:"Serpa Veronica Maria", date:"2026-07-27", entrada:8.5, salida:16.5},
  {name:"Serpa Veronica Maria", date:"2026-07-28", entrada:8.5, salida:16.5},
  {name:"Serpa Veronica Maria", date:"2026-07-29", entrada:8.5, salida:16.5},
  {name:"Serpa Veronica Maria", date:"2026-07-30", entrada:8.5, salida:16.5},
  {name:"Serpa Veronica Maria", date:"2026-07-31", entrada:8.5, salida:17.0},
  {name:"Serpa Veronica Maria", date:"2026-08-01", entrada:9.0, salida:13.5},
  {name:"Tapias Mauricio", date:"2026-07-16", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-17", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-20", entrada:9.0, salida:17.5},
  {name:"Tapias Mauricio", date:"2026-07-21", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-22", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-23", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-24", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-27", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-28", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-29", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-30", entrada:7.0, salida:17.0},
  {name:"Tapias Mauricio", date:"2026-07-31", entrada:7.0, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-16", entrada:8.5, salida:16.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-17", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-18", entrada:9.0, salida:13.5},
  {name:"Martelo Diego Alfonso", date:"2026-07-21", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-22", entrada:8.5, salida:16.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-23", entrada:8.5, salida:16.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-24", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-25", entrada:9.0, salida:13.5},
  {name:"Martelo Diego Alfonso", date:"2026-07-27", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-28", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-29", entrada:8.5, salida:16.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-30", entrada:8.5, salida:16.0},
  {name:"Martelo Diego Alfonso", date:"2026-07-31", entrada:8.5, salida:17.0},
  {name:"Martelo Diego Alfonso", date:"2026-08-01", entrada:9.0, salida:13.5},
  {name:"Esalas Felix Jose", date:"2026-07-16", entrada:13.5, salida:21.0},
  {name:"Esalas Felix Jose", date:"2026-07-17", entrada:13.5, salida:21.0},
  {name:"Esalas Felix Jose", date:"2026-07-18", entrada:13.5, salida:17.5},
  {name:"Esalas Felix Jose", date:"2026-07-19", entrada:9.0, salida:17.5},
  {name:"Esalas Felix Jose", date:"2026-07-21", entrada:8.0, salida:15.5},
  {name:"Esalas Felix Jose", date:"2026-07-22", entrada:8.0, salida:15.5},
  {name:"Esalas Felix Jose", date:"2026-07-23", entrada:8.0, salida:14.5},
  {name:"Esalas Felix Jose", date:"2026-07-24", entrada:8.0, salida:16.5},
  {name:"Esalas Felix Jose", date:"2026-07-27", entrada:13.5, salida:22.0},
  {name:"Esalas Felix Jose", date:"2026-07-28", entrada:13.5, salida:22.0},
  {name:"Esalas Felix Jose", date:"2026-07-29", entrada:13.5, salida:21.0},
  {name:"Esalas Felix Jose", date:"2026-07-30", entrada:13.5, salida:21.0},
  {name:"Esalas Felix Jose", date:"2026-07-31", entrada:13.5, salida:21.0},
  {name:"Esalas Felix Jose", date:"2026-08-01", entrada:13.0, salida:17.5},
  {name:"Esalas Felix Jose", date:"2026-08-02", entrada:9.0, salida:17.5},
  {name:"Durant Zarith Elias", date:"2026-07-16", entrada:8.0, salida:14.5},
  {name:"Durant Zarith Elias", date:"2026-07-17", entrada:8.0, salida:15.5},
  {name:"Durant Zarith Elias", date:"2026-07-21", entrada:13.5, salida:22.0},
  {name:"Durant Zarith Elias", date:"2026-07-22", entrada:13.5, salida:22.0},
  {name:"Durant Zarith Elias", date:"2026-07-23", entrada:13.5, salida:21.0},
  {name:"Durant Zarith Elias", date:"2026-07-24", entrada:13.5, salida:21.0},
  {name:"Durant Zarith Elias", date:"2026-07-25", entrada:13.0, salida:17.5},
  {name:"Durant Zarith Elias", date:"2026-07-26", entrada:9.0, salida:17.5},
  {name:"Durant Zarith Elias", date:"2026-07-27", entrada:8.0, salida:15.5},
  {name:"Durant Zarith Elias", date:"2026-07-28", entrada:8.0, salida:15.5},
  {name:"Durant Zarith Elias", date:"2026-07-29", entrada:8.0, salida:15.5},
  {name:"Durant Zarith Elias", date:"2026-07-30", entrada:8.0, salida:14.5},
  {name:"Durant Zarith Elias", date:"2026-07-31", entrada:8.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-17", entrada:9.0, salida:15.5},
  {name:"Serrano Perez Pedro", date:"2026-07-18", entrada:9.0, salida:15.5},
  {name:"Serrano Perez Pedro", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-23", entrada:9.0, salida:17.5},
  {name:"Serrano Perez Pedro", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-25", entrada:9.0, salida:15.5},
  {name:"Serrano Perez Pedro", date:"2026-07-27", entrada:9.0, salida:17.5},
  {name:"Serrano Perez Pedro", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Serrano Perez Pedro", date:"2026-08-01", entrada:9.0, salida:15.5},
  {name:"Teran Tairo", date:"2026-07-16", entrada:22.0, salida:5.5},
  {name:"Teran Tairo", date:"2026-07-17", entrada:22.0, salida:5.5},
  {name:"Teran Tairo", date:"2026-07-18", entrada:22.0, salida:5.5},
  {name:"Teran Tairo", date:"2026-07-21", entrada:13.5, salida:21.0},
  {name:"Teran Tairo", date:"2026-07-22", entrada:14.5, salida:22.0},
  {name:"Teran Tairo", date:"2026-07-23", entrada:13.5, salida:21.0},
  {name:"Teran Tairo", date:"2026-07-24", entrada:14.5, salida:22.0},
  {name:"Teran Tairo", date:"2026-07-25", entrada:13.5, salida:21.0},
  {name:"Teran Tairo", date:"2026-07-27", entrada:6.0, salida:13.5},
  {name:"Teran Tairo", date:"2026-07-28", code:"VAC"},
  {name:"Teran Tairo", date:"2026-07-29", code:"VAC"},
  {name:"Teran Tairo", date:"2026-07-30", code:"VAC"},
  {name:"Teran Tairo", date:"2026-07-31", code:"VAC"},
  {name:"Teran Tairo", date:"2026-08-01", code:"VAC"},
  {name:"Quintana Jesus Daniel", date:"2026-07-16", entrada:22.0, salida:6.6},
  {name:"Quintana Jesus Daniel", date:"2026-07-17", entrada:22.0, salida:6.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-21", entrada:14.5, salida:22.0},
  {name:"Quintana Jesus Daniel", date:"2026-07-22", entrada:13.5, salida:22.0},
  {name:"Quintana Jesus Daniel", date:"2026-07-23", entrada:14.5, salida:22.0},
  {name:"Quintana Jesus Daniel", date:"2026-07-24", entrada:13.5, salida:21.0},
  {name:"Quintana Jesus Daniel", date:"2026-07-26", entrada:6.0, salida:14.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-27", entrada:6.0, salida:14.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-28", entrada:6.0, salida:14.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-29", entrada:6.0, salida:14.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-30", entrada:6.0, salida:14.5},
  {name:"Quintana Jesus Daniel", date:"2026-07-31", entrada:6.0, salida:14.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-16", entrada:13.5, salida:20.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-17", entrada:14.5, salida:22.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-18", entrada:13.5, salida:21.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-19", entrada:13.5, salida:22.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-20", entrada:14.5, salida:22.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-22", entrada:6.0, salida:13.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-23", entrada:7.0, salida:14.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-24", entrada:6.0, salida:13.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-25", entrada:7.0, salida:14.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-27", entrada:22.5, salida:6.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-28", entrada:22.0, salida:5.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-29", entrada:22.5, salida:6.0},
  {name:"Fontalvo Nilson Javier", date:"2026-07-30", entrada:22.0, salida:5.5},
  {name:"Fontalvo Nilson Javier", date:"2026-07-31", entrada:22.5, salida:6.0},
  {name:"Fontalvo Nilson Javier", date:"2026-08-01", entrada:22.0, salida:5.5},
  {name:"Fontalvo Nilson Javier", date:"2026-08-02", entrada:22.5, salida:6.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-16", entrada:14.5, salida:22.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-17", entrada:13.5, salida:20.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-18", entrada:14.5, salida:22.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-21", entrada:6.0, salida:13.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-22", entrada:7.0, salida:14.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-23", entrada:6.0, salida:13.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-24", entrada:7.0, salida:14.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-25", entrada:6.0, salida:13.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-26", entrada:7.0, salida:14.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-28", entrada:22.5, salida:6.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-29", entrada:22.0, salida:5.5},
  {name:"Jimenez Jesus Daniel", date:"2026-07-30", entrada:22.5, salida:6.0},
  {name:"Jimenez Jesus Daniel", date:"2026-07-31", entrada:22.0, salida:5.5},
  {name:"Jimenez Jesus Daniel", date:"2026-08-01", entrada:22.5, salida:6.0},
  {name:"Carmona Edinson Jose", date:"2026-07-16", entrada:6.0, salida:14.5},
  {name:"Carmona Edinson Jose", date:"2026-07-17", entrada:6.0, salida:13.5},
  {name:"Carmona Edinson Jose", date:"2026-07-18", entrada:7.0, salida:14.5},
  {name:"Carmona Edinson Jose", date:"2026-07-21", entrada:22.5, salida:6.0},
  {name:"Carmona Edinson Jose", date:"2026-07-22", entrada:22.0, salida:5.5},
  {name:"Carmona Edinson Jose", date:"2026-07-23", entrada:22.5, salida:6.0},
  {name:"Carmona Edinson Jose", date:"2026-07-24", entrada:22.0, salida:5.5},
  {name:"Carmona Edinson Jose", date:"2026-07-25", entrada:22.5, salida:6.0},
  {name:"Carmona Edinson Jose", date:"2026-07-26", entrada:22.5, salida:6.0},
  {name:"Carmona Edinson Jose", date:"2026-07-28", entrada:14.5, salida:22.0},
  {name:"Carmona Edinson Jose", date:"2026-07-29", entrada:13.5, salida:21.0},
  {name:"Carmona Edinson Jose", date:"2026-07-30", entrada:14.5, salida:22.0},
  {name:"Carmona Edinson Jose", date:"2026-07-31", entrada:13.5, salida:21.0},
  {name:"Carmona Edinson Jose", date:"2026-08-01", entrada:14.5, salida:22.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-16", entrada:7.0, salida:13.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-17", entrada:6.0, salida:13.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-18", entrada:6.0, salida:13.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-21", entrada:22.0, salida:5.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-22", entrada:22.5, salida:6.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-23", entrada:22.0, salida:5.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-24", entrada:22.5, salida:6.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-25", entrada:22.0, salida:5.5},
  {name:"Toro Carlos Eduardo", date:"2026-07-27", entrada:14.5, salida:22.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-28", entrada:13.5, salida:21.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-29", entrada:14.5, salida:22.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-30", entrada:13.5, salida:21.0},
  {name:"Toro Carlos Eduardo", date:"2026-07-31", entrada:14.5, salida:22.0},
  {name:"Toro Carlos Eduardo", date:"2026-08-01", entrada:13.5, salida:21.0},
  {name:"Toro Carlos Eduardo", date:"2026-08-02", entrada:14.5, salida:22.0},
  {name:"Gomez Pedro Claver", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-17", entrada:13.5, salida:21.0},
  {name:"Gomez Pedro Claver", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-19", entrada:22.0, salida:0.5},
  {name:"Gomez Pedro Claver", date:"2026-07-20", entrada:22.0, salida:5.5},
  {name:"Gomez Pedro Claver", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-25", entrada:13.5, salida:21.0},
  {name:"Gomez Pedro Claver", date:"2026-07-27", entrada:13.5, salida:21.0},
  {name:"Gomez Pedro Claver", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Gomez Pedro Claver", date:"2026-08-01", entrada:6.0, salida:13.5},
  {name:"Gomez Pedro Claver", date:"2026-08-02", entrada:6.0, salida:13.5},
  {name:"Chiquillo Juan", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-21", entrada:6.0, salida:13.5},
  {name:"Chiquillo Juan", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-25", entrada:9.0, salida:16.5},
  {name:"Chiquillo Juan", date:"2026-07-26", entrada:13.5, salida:21.0},
  {name:"Chiquillo Juan", date:"2026-07-28", entrada:7.0, salida:14.5},
  {name:"Chiquillo Juan", date:"2026-07-29", entrada:6.0, salida:13.5},
  {name:"Chiquillo Juan", date:"2026-07-30", entrada:7.0, salida:14.5},
  {name:"Chiquillo Juan", date:"2026-07-31", entrada:6.0, salida:13.5},
  {name:"Chiquillo Juan", date:"2026-08-01", entrada:7.0, salida:14.5},
  {name:"Chiquillo Juan", date:"2026-08-02", entrada:6.0, salida:13.5},
  {name:"Arias Jhon Fredis", date:"2026-07-16", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-07-17", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-07-18", entrada:6.0, salida:11.5},
  {name:"Arias Jhon Fredis", date:"2026-07-19", entrada:6.0, salida:13.5},
  {name:"Arias Jhon Fredis", date:"2026-07-20", entrada:6.0, salida:13.5},
  {name:"Arias Jhon Fredis", date:"2026-07-21", entrada:8.0, salida:16.5},
  {name:"Arias Jhon Fredis", date:"2026-07-23", entrada:8.0, salida:16.5},
  {name:"Arias Jhon Fredis", date:"2026-07-24", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-07-25", entrada:6.0, salida:11.5},
  {name:"Arias Jhon Fredis", date:"2026-07-27", entrada:8.0, salida:16.5},
  {name:"Arias Jhon Fredis", date:"2026-07-28", entrada:8.0, salida:16.5},
  {name:"Arias Jhon Fredis", date:"2026-07-29", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-07-30", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-07-31", entrada:8.0, salida:15.5},
  {name:"Arias Jhon Fredis", date:"2026-08-01", entrada:6.0, salida:11.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-22", entrada:13.5, salida:21.0},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-23", entrada:13.5, salida:21.0},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-24", entrada:13.5, salida:21.0},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-25", entrada:22.0, salida:5.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-26", entrada:22.0, salida:5.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-27", entrada:22.0, salida:5.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Carcamo Oscar Alfonso", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-16", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-07-17", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-07-18", entrada:22.0, salida:5.5},
  {name:"Rodriguez Roiner", date:"2026-07-19", entrada:22.0, salida:5.5},
  {name:"Rodriguez Roiner", date:"2026-07-20", entrada:22.0, salida:5.5},
  {name:"Rodriguez Roiner", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-25", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Rodriguez Roiner", date:"2026-07-29", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-07-30", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-07-31", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-08-01", entrada:13.5, salida:21.0},
  {name:"Rodriguez Roiner", date:"2026-08-02", entrada:22.0, salida:5.5},
  {name:"Barrios Astrid", date:"2026-07-16", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-17", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-18", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-21", entrada:7.0, salida:15.5},
  {name:"Barrios Astrid", date:"2026-07-22", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-23", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-24", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-25", entrada:7.0, salida:13.5},
  {name:"Barrios Astrid", date:"2026-07-27", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-28", entrada:7.0, salida:15.5},
  {name:"Barrios Astrid", date:"2026-07-29", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-30", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-07-31", entrada:7.0, salida:14.5},
  {name:"Barrios Astrid", date:"2026-08-01", entrada:7.0, salida:13.5},
  {name:"Taborda Roymar", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-25", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Taborda Roymar", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-25", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Cervantes Yair Jose", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"Hurtado Jaime", date:"2026-07-16", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-17", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-18", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-20", entrada:6.0, salida:13.5},
  {name:"Hurtado Jaime", date:"2026-07-21", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-22", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-23", code:"ALT"},
  {name:"Hurtado Jaime", date:"2026-07-24", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-25", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-27", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-28", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-29", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-30", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-07-31", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-08-01", entrada:7.0, salida:14.5},
  {name:"Hurtado Jaime", date:"2026-08-02", entrada:13.5, salida:21.0},
  {name:"Salcedo Adel", date:"2026-07-16", entrada:11.5, salida:19.0},
  {name:"Salcedo Adel", date:"2026-07-17", entrada:11.5, salida:19.0},
  {name:"Salcedo Adel", date:"2026-07-18", entrada:11.5, salida:19.0},
  {name:"Salcedo Adel", date:"2026-07-19", entrada:6.0, salida:13.5},
  {name:"Salcedo Adel", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Salcedo Adel", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Salcedo Adel", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Salcedo Adel", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Salcedo Adel", date:"2026-07-27", entrada:7.0, salida:14.5},
  {name:"Salcedo Adel", date:"2026-07-28", entrada:7.0, salida:14.5},
  {name:"Salcedo Adel", date:"2026-07-29", entrada:7.0, salida:14.5},
  {name:"Salcedo Adel", date:"2026-07-30", entrada:7.0, salida:14.5},
  {name:"Salcedo Adel", date:"2026-07-31", entrada:7.0, salida:14.5},
  {name:"Salcedo Adel", date:"2026-08-01", entrada:7.0, salida:14.5},
  {name:"Calderon Edison Andres", date:"2026-07-16", entrada:7.0, salida:14.5},
  {name:"Calderon Edison Andres", date:"2026-07-17", entrada:7.0, salida:14.5},
  {name:"Calderon Edison Andres", date:"2026-07-21", entrada:11.5, salida:19.0},
  {name:"Calderon Edison Andres", date:"2026-07-22", entrada:11.5, salida:19.0},
  {name:"Calderon Edison Andres", date:"2026-07-23", entrada:11.5, salida:19.0},
  {name:"Calderon Edison Andres", date:"2026-07-24", entrada:11.5, salida:19.0},
  {name:"Calderon Edison Andres", date:"2026-07-25", entrada:11.5, salida:19.0},
  {name:"Calderon Edison Andres", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"Calderon Edison Andres", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Calderon Edison Andres", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Calderon Edison Andres", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Calderon Edison Andres", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Calderon Edison Andres", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"Montalvo Gabriel", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Montalvo Gabriel", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"Montalvo Gabriel", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Montalvo Gabriel", date:"2026-07-20", entrada:7.0, salida:14.5},
  {name:"Montalvo Gabriel", date:"2026-07-22", entrada:7.0, salida:14.5},
  {name:"Montalvo Gabriel", date:"2026-07-23", entrada:7.0, salida:14.5},
  {name:"Montalvo Gabriel", date:"2026-07-24", entrada:7.0, salida:14.5},
  {name:"Montalvo Gabriel", date:"2026-07-25", entrada:7.0, salida:14.5},
  {name:"Montalvo Gabriel", date:"2026-07-26", entrada:13.5, salida:21.0},
  {name:"Montalvo Gabriel", date:"2026-07-27", entrada:11.5, salida:19.0},
  {name:"Montalvo Gabriel", date:"2026-07-28", entrada:11.5, salida:19.0},
  {name:"Montalvo Gabriel", date:"2026-07-29", entrada:11.5, salida:19.0},
  {name:"Montalvo Gabriel", date:"2026-07-30", entrada:11.5, salida:19.0},
  {name:"Montalvo Gabriel", date:"2026-07-31", entrada:11.5, salida:19.0},
  {name:"Jimenez Jesus Maria", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-17", entrada:6.0, salida:13.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-25", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"Jimenez Jesus Maria", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-16", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-17", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-18", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-19", entrada:13.5, salida:21.0},
  {name:"De la rosa Lenin Jose", date:"2026-07-20", entrada:13.5, salida:21.0},
  {name:"De la rosa Lenin Jose", date:"2026-07-21", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-22", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-23", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-24", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-27", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-28", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-29", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-30", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-07-31", entrada:9.0, salida:16.5},
  {name:"De la rosa Lenin Jose", date:"2026-08-01", entrada:9.0, salida:16.5},
  {name:"Simancas Felipe", date:"2026-07-16", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-17", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-18", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-21", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-22", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-23", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-24", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-25", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-27", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-28", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-29", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-30", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-07-31", entrada:7.0, salida:10.5},
  {name:"Simancas Felipe", date:"2026-08-01", entrada:7.0, salida:10.5},
];const JULY2026_IMPORT_CARGOS = {
  "Bonfante Ilsa Corina": "Administrativo",
  "Serpa Veronica Maria": "Administrativo",
  "Tapias Mauricio": "Administrativo",
  "Martelo Diego Alfonso": "Administrativo",
  "Esalas Felix Jose": "Administrativo",
  "Durant Zarith Elias": "Administrativo",
  "Serrano Perez Pedro": "Administrativo",
  "Teran Tairo": "Turnista",
  "Quintana Jesus Daniel": "Turnista",
  "Fontalvo Nilson Javier": "Turnista",
  "Jimenez Jesus Daniel": "Turnista",
  "Carmona Edinson Jose": "Turnista",
  "Toro Carlos Eduardo": "Turnista",
  "Gomez Pedro Claver": "Apoyo",
  "Chiquillo Juan": "Apoyo",
  "Arias Jhon Fredis": "Apoyo",
  "Carcamo Oscar Alfonso": "Mecánico",
  "Rodriguez Roiner": "Mecánico",
  "Barrios Astrid": "Practicante",
  "Taborda Roymar": "Practicante",
  "Cervantes Yair Jose": "Practicante",
  "Hurtado Jaime": "Pintor",
  "Salcedo Adel": "Pintor",
  "Calderon Edison Andres": "Pintor",
  "Montalvo Gabriel": "Pintor",
  "Jimenez Jesus Maria": "Carpintero",
  "De la rosa Lenin Jose": "Albañil",
  "Simancas Felipe": "Jardinero",
};
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
    { id: "maintenance-log", label: "Mantenimientos Realizados", icon: History, desc: "Auditoría de lo registrado", access: isAdmin },
    { id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays, desc: "Seguimiento del año completo", access: isAdmin },
    { id: "schedules", label: "Horario Mensual", icon: Users, desc: "Turnos del personal", access: true },
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
      const [acc, sess, ai, ih, ri, lv, th, email, sr, wa, lt, thist, lcv, cri, lmv, mh, mri, lcr, ch, bod, shv, iit, imv, emp, sch, mte, mtl, mtc] = await Promise.all([
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

    const newColdHistory = { ...coldHistory };
    ALL_COLD_ROOM_ITEMS.filter(item => cleanEntries[item.id]).forEach(item => {
      const e = cleanEntries[item.id];
      const hist = (newColdHistory[item.id] || []).concat([{ status: e.status, value: e.value, damaged: !!e.damaged, at: ts, by: displayName }]).slice(-30);
      newColdHistory[item.id] = hist;
    });

    setLatestColdValues(newLatest); setActiveIssues(newActive); setColdRoundsIndex(newIndex);
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


  const coldOutOfRange = useMemo(() => computeColdOutOfRange(latestColdValues), [latestColdValues]);
  const meterAnomalies = useMemo(() => computeMeterAnomalies(meterHistory), [meterHistory]);
  const lowStockItems = useMemo(() => computeLowStock(invItems), [invItems]);

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

  const account = accounts[currentUser] || {};
  const displayName = account.displayName || currentUser;
  const isAdmin = !!account.isAdmin;
  const isAlmacenista = !!account.isAlmacenista;

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
    ...(isAdmin ? [{ id: "maintenance-log", label: "Mantenimientos Realizados", icon: History }] : []),
    ...(isAdmin ? [{ id: "maintenance-schedule", label: "Cronograma Anual", icon: CalendarDays }] : []),
    { id: "schedules", label: "Horario Mensual", icon: Users },
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
            {(view === "ronda" || view === "meters" || view === "coldrooms") ? (
              <select value={shift} onChange={e => setShift(e.target.value)} className="ml-2 text-sm border rounded-md px-2 py-1 outline-none" style={{ borderColor: C.line }}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="ml-2">{nowClock.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <Pill tone="amber">Admin</Pill>}
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}><User size={14} /> {displayName}</span>
            <Button size="sm" variant="ghost" icon={LogOut} onClick={logout}>Salir</Button>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-5xl w-full mx-auto">
          {view === "home" && (
            <HomeView currentUser={displayName} isAdmin={isAdmin} isAlmacenista={isAlmacenista} onNavigate={setView}
              counts={{ activeIssues: activeCount, lowStock: lowStockItems.length, coldOutOfRange: coldOutOfRange.length, meterAnomalies: meterAnomalies.length, justFinished }} />
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
          {view === "maintenance-log" && isAdmin && (
            <MaintenanceLogAuditView equipos={mttoEquipos} mttoLog={mttoLog}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "maintenance-schedule" && isAdmin && (
            <CronogramaAnualView equipos={mttoEquipos} mttoCronograma={mttoCronograma}
              reportEmail={reportEmail} onLogSent={logSentReport} currentUser={displayName} />
          )}
          {view === "schedules" && (
            <SchedulesView employees={employees} scheduleEntries={scheduleEntries} isAdmin={isAdmin} currentUser={displayName}
              onCreateEmployee={createEmployee} onUpdateEmployee={updateEmployee} onSetScheduleEntry={setScheduleEntry}
              onImportJuly={importJulySchedule2026} reportEmail={reportEmail} onLogSent={logSentReport} />
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
