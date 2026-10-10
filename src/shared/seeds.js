


/* ============================================================
   DATOS: PISOS Y EQUIPOS (según formato original, verificado
   página por página para respetar la agrupación real por piso)
   kind: 'status' | 'numeric' | 'statusNumeric' | 'sample' | 'note'
   ============================================================ */
export const FLOORS = [
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

/** Se precarga la primera vez que alguien abre "Novedades", con un resumen de lo construido
 *  hasta ahora — de ahí en adelante, el admin agrega las suyas desde la misma pantalla. */
export const DEFAULT_SYSTEM_PROCEDURES_SEED = [
  {
    "id": "proc-cond-1",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC1 / Torre 1",
    "color": "#2563eb",
    "componentePrincipal": "BAC1",
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-4",
        "estado": "no-afecta",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-5",
        "estado": "no-afecta",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-6",
        "estado": "no-afecta",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-8",
        "estado": "no-afecta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-11",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-13",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-14",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-16",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-2a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC2 / Torre 1 — Opción 1",
    "color": "#2563eb",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-4",
        "estado": "no-afecta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-5",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-6",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-8",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-14",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-2b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC2 / Torre 1 — Opción 2",
    "color": "#2563eb",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-4",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-5",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-6",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-8",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-3a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC3 / Torre 1 — Opción 1",
    "color": "#2563eb",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-8",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-18",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-4",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-5",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-6",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-3b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC3 / Torre 1 — Opción 2",
    "color": "#2563eb",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-8",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-18",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-4",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-5",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-6",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-4a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC1 / Torre 2 — Opción 1",
    "color": "#16a34a",
    "componentePrincipal": "BAC1",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-1",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-2",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-3",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-7",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-20",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-13",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-16",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-4b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC1 / Torre 2 — Opción 2",
    "color": "#16a34a",
    "componentePrincipal": "BAC1",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-1",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-2",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-3",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-7",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-20",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-16",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-5a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC2 / Torre 2 — Opción 1",
    "color": "#16a34a",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-1",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-2",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-3",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-20",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-7",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-18",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-5b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC2 / Torre 2 — Opción 2 (cierra V-7 también en Piso 33)",
    "color": "#16a34a",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-1",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-2",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-3",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-7",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-18",
        "estado": "cerrada",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-20",
        "estado": "cerrada",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-6",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 1 / BAC3 / Torre 2",
    "color": "#16a34a",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-1",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-2",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-3",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-18",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-20",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-7",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-10",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-7",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC3 / Torre 2 (variante A)",
    "color": "#b45309",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-1",
        "estado": "no-afecta",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-2",
        "estado": "no-afecta",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-3",
        "estado": "no-afecta",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-7",
        "estado": "no-afecta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-10",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-12",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-13",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-15",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-19",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-8a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC2 / Torre 2 — Opción 1",
    "color": "#b45309",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-1",
        "estado": "no-afecta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-2",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-3",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-7",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-12",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-19",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-8b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC2 / Torre 2 — Opción 2",
    "color": "#b45309",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-1",
        "estado": "no-afecta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-2",
        "estado": "no-afecta",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-3",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-7",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-19",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-9a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC3 / Torre 2 (variante B) — Opción 1",
    "color": "#b45309",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-7",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-17",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-1",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-2",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-3",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-19",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-9b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC3 / Torre 2 (variante B) — Opción 2",
    "color": "#b45309",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-7",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-17",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-1",
        "estado": "no-afecta",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-2",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-3",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-19",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-10a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC3 / Torre 1 — Opción 1",
    "color": "#dc2626",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-4",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-5",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-6",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-8",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-19",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-13",
        "estado": "no-afecta",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-15",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-10b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC3 / Torre 1 — Opción 2",
    "color": "#dc2626",
    "componentePrincipal": "BAC3",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-4",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-5",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-6",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-8",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-19",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-15",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-11a",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC2 / Torre 1 — Opción 1",
    "color": "#dc2626",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-4",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-5",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-6",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-19",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-8",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-11b",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC2 / Torre 1 — Opción 2 (cierra V-8 también en Piso 33)",
    "color": "#dc2626",
    "componentePrincipal": "BAC2",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-9",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-4",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-5",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-6",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-8",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-19",
        "estado": "cerrada",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-17",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-12",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Chiller 2 / BAC1 / Torre 1",
    "color": "#dc2626",
    "componentePrincipal": "BAC1",
    "pasos": [
      {
        "codigo": "V-0",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-4",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-5",
        "estado": "cerrada",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-6",
        "estado": "cerrada",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-17",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-19",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-8",
        "estado": "no-afecta",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-11",
        "estado": "no-afecta",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-13",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Ambos chillers: (Chiller 1/BAC1/Torre1) + (Chiller 2/BAC3/Torre2)",
    "color": "#8b5cf6",
    "componentePrincipal": null,
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-13",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-14",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Ambos chillers: (Chiller 1/BAC1/Torre1) + (Chiller 2/BAC2/Torre2)",
    "color": "#8b5cf6",
    "componentePrincipal": null,
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-11",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-12",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-16",
        "estado": "abierta",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-10",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-14",
        "estado": "cerrada",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-15",
        "estado": "cerrada",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-cond-15",
    "diagramId": "diag-seed-condensacion",
    "nombre": "Ambos chillers: (Chiller 1/BAC2/Torre1) + (Chiller 2/BAC3/Torre2)",
    "color": "#8b5cf6",
    "componentePrincipal": null,
    "pasos": [
      {
        "codigo": "V-1",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-2",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-3",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-4",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-5",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-6",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-7",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-8",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-10",
        "estado": "abierta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-13",
        "estado": "abierta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-14",
        "estado": "abierta",
        "nota": "",
        "orden": 11
      },
      {
        "codigo": "V-15",
        "estado": "abierta",
        "nota": "",
        "orden": 12
      },
      {
        "codigo": "V-17",
        "estado": "abierta",
        "nota": "",
        "orden": 13
      },
      {
        "codigo": "V-18",
        "estado": "abierta",
        "nota": "",
        "orden": 14
      },
      {
        "codigo": "V-19",
        "estado": "abierta",
        "nota": "",
        "orden": 15
      },
      {
        "codigo": "V-20",
        "estado": "abierta",
        "nota": "",
        "orden": 16
      },
      {
        "codigo": "V-0",
        "estado": "cerrada",
        "nota": "",
        "orden": 17
      },
      {
        "codigo": "V-9",
        "estado": "cerrada",
        "nota": "",
        "orden": 18
      },
      {
        "codigo": "V-11",
        "estado": "cerrada",
        "nota": "",
        "orden": 19
      },
      {
        "codigo": "V-12",
        "estado": "cerrada",
        "nota": "",
        "orden": 20
      },
      {
        "codigo": "V-16",
        "estado": "cerrada",
        "nota": "",
        "orden": 21
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-1",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 1",
    "color": "#2563eb",
    "componentePrincipal": "BAF1",
    "pasos": [
      {
        "codigo": "V-23",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-24",
        "estado": "cerrada",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-26",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-31",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-21",
        "estado": "no-afecta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-22",
        "estado": "no-afecta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-27",
        "estado": "no-afecta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-29",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-2a",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 2 — Opción 1",
    "color": "#2563eb",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-21",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-31",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-29",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-2b",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 2 — Opción 2",
    "color": "#2563eb",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-22",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-31",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-29",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-2c",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 2 — Opción 3",
    "color": "#2563eb",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-21",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-22",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-31",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-29",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-3a",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 3 — Opción 1",
    "color": "#2563eb",
    "componentePrincipal": "BAF3",
    "pasos": [
      {
        "codigo": "V-25",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-24",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-29",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-31",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-3b",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 1 / Bomba 3 — Opción 2",
    "color": "#2563eb",
    "componentePrincipal": "BAF3",
    "pasos": [
      {
        "codigo": "V-25",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-24",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-29",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-21",
        "estado": "no-afecta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-22",
        "estado": "no-afecta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-31",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-4a",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 1 — Opción 1",
    "color": "#b45309",
    "componentePrincipal": "BAF1",
    "pasos": [
      {
        "codigo": "V-23",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-24",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-28",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-30",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-4b",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 1 — Opción 2",
    "color": "#b45309",
    "componentePrincipal": "BAF1",
    "pasos": [
      {
        "codigo": "V-23",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-24",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-28",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-21",
        "estado": "no-afecta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-22",
        "estado": "no-afecta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-30",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-5a",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 2 — Opción 1",
    "color": "#b45309",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-21",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-26",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-30",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-28",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-5b",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 2 — Opción 2",
    "color": "#b45309",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-22",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-26",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-30",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-28",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-5c",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 2 — Opción 3",
    "color": "#b45309",
    "componentePrincipal": "BAF2",
    "pasos": [
      {
        "codigo": "V-21",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-22",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-26",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-30",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-28",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-6a",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 3 — Opción 1",
    "color": "#b45309",
    "componentePrincipal": "BAF3",
    "pasos": [
      {
        "codigo": "V-25",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-30",
        "estado": "cerrada",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-24",
        "estado": "no-afecta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-26",
        "estado": "no-afecta",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-28",
        "estado": "no-afecta",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-6b",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Chiller 2 / Bomba 3 — Opción 2 (⚠ revisar V-24, ver nota)",
    "color": "#b45309",
    "componentePrincipal": "BAF3",
    "pasos": [
      {
        "codigo": "V-25",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-30",
        "estado": "cerrada",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-21",
        "estado": "no-afecta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-22",
        "estado": "no-afecta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-26",
        "estado": "no-afecta",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-28",
        "estado": "no-afecta",
        "nota": "",
        "orden": 10
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-7",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Ambos chillers: (Chiller1/Bomba1) + (Chiller2/Bomba2)",
    "color": "#8b5cf6",
    "componentePrincipal": null,
    "pasos": [
      {
        "codigo": "V-22",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-23",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-27",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-21",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-25",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-26",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "proc-evap-8",
    "diagramId": "diag-seed-evaporacion",
    "nombre": "Ambos chillers: (Chiller1/Bomba2) + (Chiller2/Bomba3)",
    "color": "#8b5cf6",
    "componentePrincipal": null,
    "pasos": [
      {
        "codigo": "V-21",
        "estado": "abierta",
        "nota": "",
        "orden": 1
      },
      {
        "codigo": "V-24",
        "estado": "abierta",
        "nota": "",
        "orden": 2
      },
      {
        "codigo": "V-25",
        "estado": "abierta",
        "nota": "",
        "orden": 3
      },
      {
        "codigo": "V-26",
        "estado": "abierta",
        "nota": "",
        "orden": 4
      },
      {
        "codigo": "V-28",
        "estado": "abierta",
        "nota": "",
        "orden": 5
      },
      {
        "codigo": "V-29",
        "estado": "abierta",
        "nota": "",
        "orden": 6
      },
      {
        "codigo": "V-30",
        "estado": "abierta",
        "nota": "",
        "orden": 7
      },
      {
        "codigo": "V-31",
        "estado": "abierta",
        "nota": "",
        "orden": 8
      },
      {
        "codigo": "V-22",
        "estado": "cerrada",
        "nota": "",
        "orden": 9
      },
      {
        "codigo": "V-23",
        "estado": "cerrada",
        "nota": "",
        "orden": 10
      },
      {
        "codigo": "V-27",
        "estado": "cerrada",
        "nota": "",
        "orden": 11
      }
    ],
    "createdBy": "Sistema (documento oficial)",
    "createdAt": "2026-09-04T00:00:00.000Z"
  }
];

export const DEFAULT_SYSTEM_DIAGRAMS_SEED = [
  {
    "id": "diag-seed-condensacion",
    "nombre": "Condensación — Piso 33 / Piso 16",
    "imagenUrl": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwMCA4MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj48cmVjdCB3aWR0aD0iMTAwMCIgaGVpZ2h0PSI4MDAiIGZpbGw9IiNmZmZmZmYiLz48dGV4dCB4PSIyMCIgeT0iMjgiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMxZTI5M2IiPkNPTkRFTlNBQ0nDk04g4oCUIFBJU08gMzM8L3RleHQ+PGxpbmUgeDE9IjAiIHkxPSIzMDAiIHgyPSIxMDAwIiB5Mj0iMzAwIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMTAsNiIvPjx0ZXh0IHg9IjIwIiB5PSIzMjUiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMxZTI5M2IiPlBJU08gMTY8L3RleHQ+PHRleHQgeD0iODQwIiB5PSI3ODAiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiMyNTYzZWIiPuKAlCBTdW1pbmlzdHJvIChmcsOtbyk8L3RleHQ+PHRleHQgeD0iODQwIiB5PSI3OTYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkYzI2MjYiPuKAlCBSZXRvcm5vIChjYWxpZW50ZSk8L3RleHQ+PGxpbmUgeDE9IjI1MCIgeTE9IjEwIiB4Mj0iMjUwIiB5Mj0iNTUiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iNzAwIiB5MT0iMTAiIHgyPSI3MDAiIHkyPSI1NSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxwb2x5Z29uIHBvaW50cz0iMjUwLjAsNDcuMCAyNDUuNSwzNi4wIDI1NC41LDM2LjAiIGZpbGw9IiNkYzI2MjYiLz48cG9seWdvbiBwb2ludHM9IjcwMC4wLDQ3LjAgNjk1LjUsMzYuMCA3MDQuNSwzNi4wIiBmaWxsPSIjZGMyNjI2Ii8+PGxpbmUgeDE9IjEwMCIgeTE9IjU1IiB4Mj0iOTAwIiB5Mj0iNTUiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNDg0IiB5PSIzMSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNDkwIiBjeT0iMjciIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI0ODMiIHkxPSIyNyIgeDI9IjQ5NyIgeTI9IjI3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI0OTAiIHkxPSIyMCIgeDI9IjQ5MCIgeTI9IjM0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjQ3NyIgeT0iNDYuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSI0NzAiIHk9IjQ5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI1MDMiIHk9IjQ5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI0OTAiIHk9IjE1IiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMDwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMTUwIiB5MT0iNTUiIHgyPSIxNTAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iMTQ0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iMTUwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIxNDMiIHkxPSI2MiIgeDI9IjE1NyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSIxNTAiIHkxPSI1NSIgeDI9IjE1MCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjEzNyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSIxMzAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSIxNjMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSIxNTAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMjIwIiB5MT0iNTUiIHgyPSIyMjAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iMjE0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iMjIwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIyMTMiIHkxPSI2MiIgeDI9IjIyNyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSIyMjAiIHkxPSI1NSIgeDI9IjIyMCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjIwNyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSIyMDAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSIyMzMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSIyMjAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMjkwIiB5MT0iNTUiIHgyPSIyOTAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iMjg0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iMjkwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIyODMiIHkxPSI2MiIgeDI9IjI5NyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSIyOTAiIHkxPSI1NSIgeDI9IjI5MCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjI3NyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSIyNzAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSIzMDMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSIyOTAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMzwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNzEwIiB5MT0iNTUiIHgyPSI3MTAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNzA0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNzEwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI3MDMiIHkxPSI2MiIgeDI9IjcxNyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI3MTAiIHkxPSI1NSIgeDI9IjcxMCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjY5NyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSI2OTAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI3MjMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI3MTAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtNDwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNzgwIiB5MT0iNTUiIHgyPSI3ODAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNzc0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNzgwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI3NzMiIHkxPSI2MiIgeDI9Ijc4NyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI3ODAiIHkxPSI1NSIgeDI9Ijc4MCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9Ijc2NyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSI3NjAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI3OTMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI3ODAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtNTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iODUwIiB5MT0iNTUiIHgyPSI4NTAiIHkyPSIxMDAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iODQ0IiB5PSI2NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iODUwIiBjeT0iNjIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI4NDMiIHkxPSI2MiIgeDI9Ijg1NyIgeTI9IjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI4NTAiIHkxPSI1NSIgeDI9Ijg1MCIgeTI9IjY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjgzNyIgeT0iODEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSI4MzAiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI4NjMiIHk9Ijg0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI4NTAiIHk9IjUwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtNjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHBvbHlnb24gcG9pbnRzPSIxMzUuMCwxMjMuMCAxNTkuMCwxMDUuMCAzMzUuMCwxMDUuMCAzMTEuMCwxMjMuMCIgZmlsbD0iI2UyZThmMCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxjaXJjbGUgY3g9IjE5Ni4wMDgiIGN5PSIxMTEuMCIgcj0iMjIuNTYiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSIxOTYuMDA4IiBjeT0iMTExLjAiIHI9IjEzLjk4NzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iMTk2LjAwOCIgeTE9IjExMS4wIiB4Mj0iMjE2Ljc2MzIiIHkyPSIxMTEuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIyMTMuOTgyNTMwNDYwNjI2NzgiIHkyPSIxMjEuMzc3NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIyMDYuMzg1NiIgeTI9IjEyOC45NzQ1MzA0NjA2MjY3NyIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIxOTYuMDA4IiB5Mj0iMTMxLjc1NTIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMTk2LjAwOCIgeTE9IjExMS4wIiB4Mj0iMTg1LjYzMDQiIHkyPSIxMjguOTc0NTMwNDYwNjI2OCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIxNzguMDMzNDY5NTM5MzczMjQiIHkyPSIxMjEuMzc3NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIxNzUuMjUyOCIgeTI9IjExMS4wIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjE5Ni4wMDgiIHkxPSIxMTEuMCIgeDI9IjE3OC4wMzM0Njk1MzkzNzMyMSIgeTI9IjEwMC42MjI0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjE5Ni4wMDgiIHkxPSIxMTEuMCIgeDI9IjE4NS42MzA0IiB5Mj0iOTMuMDI1NDY5NTM5MzczMjMiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMTk2LjAwOCIgeTE9IjExMS4wIiB4Mj0iMTk2LjAwOCIgeTI9IjkwLjI0NDgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMTk2LjAwOCIgeTE9IjExMS4wIiB4Mj0iMjA2LjM4NTYiIHkyPSI5My4wMjU0Njk1MzkzNzMyMiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIxOTYuMDA4IiB5MT0iMTExLjAiIHgyPSIyMTMuOTgyNTMwNDYwNjI2NzgiIHkyPSIxMDAuNjIyNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPgogICAgPGNpcmNsZSBjeD0iMTk2LjAwOCIgY3k9IjExMS4wIiByPSIyLjcwNzIiIGZpbGw9IiMwZjE3MmEiLz4KICAgIDxjaXJjbGUgY3g9IjI4My41OTIiIGN5PSIxMTEuMCIgcj0iMjIuNTYiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSIyODMuNTkyIiBjeT0iMTExLjAiIHI9IjEzLjk4NzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iMjgzLjU5MiIgeTE9IjExMS4wIiB4Mj0iMzA0LjM0NzIiIHkyPSIxMTEuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODMuNTkyIiB5MT0iMTExLjAiIHgyPSIzMDEuNTY2NTMwNDYwNjI2OCIgeTI9IjEyMS4zNzc2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI5My45Njk2IiB5Mj0iMTI4Ljk3NDUzMDQ2MDYyNjc3IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI4My41OTIiIHkyPSIxMzEuNzU1MiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODMuNTkyIiB5MT0iMTExLjAiIHgyPSIyNzMuMjE0NCIgeTI9IjEyOC45NzQ1MzA0NjA2MjY4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI2NS42MTc0Njk1MzkzNzMyIiB5Mj0iMTIxLjM3NzYiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjgzLjU5MiIgeTE9IjExMS4wIiB4Mj0iMjYyLjgzNjgiIHkyPSIxMTEuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODMuNTkyIiB5MT0iMTExLjAiIHgyPSIyNjUuNjE3NDY5NTM5MzczMiIgeTI9IjEwMC42MjI0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI3My4yMTQzOTk5OTk5OTk5NiIgeTI9IjkzLjAyNTQ2OTUzOTM3MzIzIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI4My41OTIiIHkyPSI5MC4yNDQ4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4My41OTIiIHkxPSIxMTEuMCIgeDI9IjI5My45Njk2IiB5Mj0iOTMuMDI1NDY5NTM5MzczMjIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjgzLjU5MiIgeTE9IjExMS4wIiB4Mj0iMzAxLjU2NjUzMDQ2MDYyNjgiIHkyPSIxMDAuNjIyNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPgogICAgPGNpcmNsZSBjeD0iMjgzLjU5MiIgY3k9IjExMS4wIiByPSIyLjcwNzIiIGZpbGw9IiMwZjE3MmEiLz4KICAgIDxjaXJjbGUgY3g9IjIwNi41MiIgY3k9IjExNC4wIiByPSIyNC4wIiBmaWxsPSIjZjFmNWY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGNpcmNsZSBjeD0iMjA2LjUyIiBjeT0iMTE0LjAiIHI9IjE0Ljg3OTk5OTk5OTk5OTk5OSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjIyOC42MDAwMDAwMDAwMDAwMiIgeTI9IjExNC4wIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjIwNi41MiIgeTE9IjExNC4wIiB4Mj0iMjI1LjY0MTg0MDkxNTU2MDQiIHkyPSIxMjUuMDM5OTk5OTk5OTk5OTkiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjA2LjUyIiB5MT0iMTE0LjAiIHgyPSIyMTcuNTYiIHkyPSIxMzMuMTIxODQwOTE1NTYwNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjIwNi41MiIgeTI9IjEzNi4wOCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjE5NS40ODAwMDAwMDAwMDAwMiIgeTI9IjEzMy4xMjE4NDA5MTU1NjA0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjIwNi41MiIgeTE9IjExNC4wIiB4Mj0iMTg3LjM5ODE1OTA4NDQzOTYiIHkyPSIxMjUuMDM5OTk5OTk5OTk5OTkiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjA2LjUyIiB5MT0iMTE0LjAiIHgyPSIxODQuNDQiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjE4Ny4zOTgxNTkwODQ0Mzk2IiB5Mj0iMTAyLjk2MDAwMDAwMDAwMDAxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjIwNi41MiIgeTE9IjExNC4wIiB4Mj0iMTk1LjQ4IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjIwNi41MiIgeTI9IjkxLjkyIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjIwNi41MiIgeTE9IjExNC4wIiB4Mj0iMjE3LjU2IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyMDYuNTIiIHkxPSIxMTQuMCIgeDI9IjIyNS42NDE4NDA5MTU1NjA0IiB5Mj0iMTAyLjk2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+CiAgICA8Y2lyY2xlIGN4PSIyMDYuNTIiIGN5PSIxMTQuMCIgcj0iMi44OCIgZmlsbD0iIzBmMTcyYSIvPgogICAgPGNpcmNsZSBjeD0iMjg3LjQ4IiBjeT0iMTE0LjAiIHI9IjI0LjAiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSIyODcuNDgiIGN5PSIxMTQuMCIgcj0iMTQuODc5OTk5OTk5OTk5OTk5IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjI4Ny40OCIgeTE9IjExNC4wIiB4Mj0iMzA5LjU2IiB5Mj0iMTE0LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjg3LjQ4IiB5MT0iMTE0LjAiIHgyPSIzMDYuNjAxODQwOTE1NTYwNDQiIHkyPSIxMjUuMDM5OTk5OTk5OTk5OTkiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjg3LjQ4IiB5MT0iMTE0LjAiIHgyPSIyOTguNTIwMDAwMDAwMDAwMDQiIHkyPSIxMzMuMTIxODQwOTE1NTYwNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODcuNDgiIHkxPSIxMTQuMCIgeDI9IjI4Ny40OCIgeTI9IjEzNi4wOCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODcuNDgiIHkxPSIxMTQuMCIgeDI9IjI3Ni40NCIgeTI9IjEzMy4xMjE4NDA5MTU1NjA0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4Ny40OCIgeTE9IjExNC4wIiB4Mj0iMjY4LjM1ODE1OTA4NDQzOTYiIHkyPSIxMjUuMDM5OTk5OTk5OTk5OTkiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iMjg3LjQ4IiB5MT0iMTE0LjAiIHgyPSIyNjUuNDAwMDAwMDAwMDAwMDMiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODcuNDgiIHkxPSIxMTQuMCIgeDI9IjI2OC4zNTgxNTkwODQ0Mzk2IiB5Mj0iMTAyLjk2MDAwMDAwMDAwMDAxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4Ny40OCIgeTE9IjExNC4wIiB4Mj0iMjc2LjQ0IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODcuNDgiIHkxPSIxMTQuMCIgeDI9IjI4Ny40OCIgeTI9IjkxLjkyIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjI4Ny40OCIgeTE9IjExNC4wIiB4Mj0iMjk4LjUyMDAwMDAwMDAwMDA0IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSIyODcuNDgiIHkxPSIxMTQuMCIgeDI9IjMwNi42MDE4NDA5MTU1NjA0NCIgeTI9IjEwMi45NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPgogICAgPGNpcmNsZSBjeD0iMjg3LjQ4IiBjeT0iMTE0LjAiIHI9IjIuODgiIGZpbGw9IiMwZjE3MmEiLz4KICAgICAgCiAgICA8cG9seWdvbiBwb2ludHM9IjEzNS4wLDEyMy4wIDI5MS4wLDEyMy4wIDI5MS4wLDE5NS4wIDEzNS4wLDE5NS4wIiBmaWxsPSIjZjhmYWZjIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMi4yIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjI5MS4wLDEyMy4wIDMzNS4wLDEyMy4wIDMzNS4wLDE4MS4wIDI5MS4wLDE5NS4wIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMi4yIi8+CiAgICA8bGluZSB4MT0iMTQzLjAiIHkxPSIxMzMuMCIgeDI9IjI4My4wIiB5Mj0iMTMzLjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjE0My4wIiB5MT0iMTQ0LjAiIHgyPSIyODMuMCIgeTI9IjE0NC4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSIxNDMuMCIgeTE9IjE1NS4wIiB4Mj0iMjgzLjAiIHkyPSIxNTUuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTQzLjAiIHkxPSIxNjYuMCIgeDI9IjI4My4wIiB5Mj0iMTY2LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjE0My4wIiB5MT0iMTc3LjAiIHgyPSIyODMuMCIgeTI9IjE3Ny4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSIxNDMuMCIgeTE9IjE4OC4wIiB4Mj0iMjgzLjAiIHkyPSIxODguMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMTQzLjAiIHkxPSIxMjkuMCIgeDI9IjE0My4wIiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjE2Ni4zMzMzMzMzMzMzMzMzNCIgeTE9IjEyOS4wIiB4Mj0iMTY2LjMzMzMzMzMzMzMzMzM0IiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjE4OS42NjY2NjY2NjY2NjY2NiIgeTE9IjEyOS4wIiB4Mj0iMTg5LjY2NjY2NjY2NjY2NjY2IiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjIxMy4wIiB5MT0iMTI5LjAiIHgyPSIyMTMuMCIgeTI9IjE4OS4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSIyMzYuMzMzMzMzMzMzMzMzMzEiIHkxPSIxMjkuMCIgeDI9IjIzNi4zMzMzMzMzMzMzMzMzMSIgeTI9IjE4OS4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSIyNTkuNjY2NjY2NjY2NjY2NyIgeTE9IjEyOS4wIiB4Mj0iMjU5LjY2NjY2NjY2NjY2NjciIHkyPSIxODkuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iMjgzLjAiIHkxPSIxMjkuMCIgeDI9IjI4My4wIiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PHJlY3QgeD0iMTM3LjAiIHk9IjE3OS4wIiB3aWR0aD0iMTUyLjAiIGhlaWdodD0iMTQiIGZpbGw9IiM3ZGQzZmMiIG9wYWNpdHk9IjAuNzUiLz48bGluZSB4MT0iMTQxLjAiIHkxPSIxOTUuMCIgeDI9IjE0MS4wIiB5Mj0iMjExLjAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIzIi8+PGxpbmUgeDE9IjI4NS4wIiB5MT0iMTk1LjAiIHgyPSIyODUuMCIgeTI9IjIxMS4wIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICA8dGV4dCB4PSIyMzUiIHk9IjIxMS4wIiBmb250LXNpemU9IjE1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPlRPUlJFIDE8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxwb2x5Z29uIHBvaW50cz0iNjY1LjAsMTIzLjAgNjg5LjAsMTA1LjAgODY1LjAsMTA1LjAgODQxLjAsMTIzLjAiIGZpbGw9IiNlMmU4ZjAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSI3MjYuMDA4IiBjeT0iMTExLjAiIHI9IjIyLjU2IiBmaWxsPSIjZjFmNWY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGNpcmNsZSBjeD0iNzI2LjAwOCIgY3k9IjExMS4wIiByPSIxMy45ODcyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjcyNi4wMDgiIHkxPSIxMTEuMCIgeDI9Ijc0Ni43NjMyIiB5Mj0iMTExLjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzI2LjAwOCIgeTE9IjExMS4wIiB4Mj0iNzQzLjk4MjUzMDQ2MDYyNjgiIHkyPSIxMjEuMzc3NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MjYuMDA4IiB5MT0iMTExLjAiIHgyPSI3MzYuMzg1NjAwMDAwMDAwMSIgeTI9IjEyOC45NzQ1MzA0NjA2MjY3NyIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MjYuMDA4IiB5MT0iMTExLjAiIHgyPSI3MjYuMDA4IiB5Mj0iMTMxLjc1NTIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzI2LjAwOCIgeTE9IjExMS4wIiB4Mj0iNzE1LjYzMDQiIHkyPSIxMjguOTc0NTMwNDYwNjI2OCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MjYuMDA4IiB5MT0iMTExLjAiIHgyPSI3MDguMDMzNDY5NTM5MzczMyIgeTI9IjEyMS4zNzc2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjcyNi4wMDgiIHkxPSIxMTEuMCIgeDI9IjcwNS4yNTI4MDAwMDAwMDAxIiB5Mj0iMTExLjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzI2LjAwOCIgeTE9IjExMS4wIiB4Mj0iNzA4LjAzMzQ2OTUzOTM3MzMiIHkyPSIxMDAuNjIyNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MjYuMDA4IiB5MT0iMTExLjAiIHgyPSI3MTUuNjMwNCIgeTI9IjkzLjAyNTQ2OTUzOTM3MzIzIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjcyNi4wMDgiIHkxPSIxMTEuMCIgeDI9IjcyNi4wMDgiIHkyPSI5MC4yNDQ4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjcyNi4wMDgiIHkxPSIxMTEuMCIgeDI9IjczNi4zODU2MDAwMDAwMDAxIiB5Mj0iOTMuMDI1NDY5NTM5MzczMjIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzI2LjAwOCIgeTE9IjExMS4wIiB4Mj0iNzQzLjk4MjUzMDQ2MDYyNjgiIHkyPSIxMDAuNjIyNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPgogICAgPGNpcmNsZSBjeD0iNzI2LjAwOCIgY3k9IjExMS4wIiByPSIyLjcwNzIiIGZpbGw9IiMwZjE3MmEiLz4KICAgIDxjaXJjbGUgY3g9IjgxMy41OTIiIGN5PSIxMTEuMCIgcj0iMjIuNTYiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSI4MTMuNTkyIiBjeT0iMTExLjAiIHI9IjEzLjk4NzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iODEzLjU5MiIgeTE9IjExMS4wIiB4Mj0iODM0LjM0NzE5OTk5OTk5OTkiIHkyPSIxMTEuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTMuNTkyIiB5MT0iMTExLjAiIHgyPSI4MzEuNTY2NTMwNDYwNjI2NyIgeTI9IjEyMS4zNzc2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxMy41OTIiIHkxPSIxMTEuMCIgeDI9IjgyMy45Njk2IiB5Mj0iMTI4Ljk3NDUzMDQ2MDYyNjc3IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxMy41OTIiIHkxPSIxMTEuMCIgeDI9IjgxMy41OTIiIHkyPSIxMzEuNzU1MiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTMuNTkyIiB5MT0iMTExLjAiIHgyPSI4MDMuMjE0NCIgeTI9IjEyOC45NzQ1MzA0NjA2MjY4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxMy41OTIiIHkxPSIxMTEuMCIgeDI9Ijc5NS42MTc0Njk1MzkzNzMyIiB5Mj0iMTIxLjM3NzYiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iODEzLjU5MiIgeTE9IjExMS4wIiB4Mj0iNzkyLjgzNjgiIHkyPSIxMTEuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTMuNTkyIiB5MT0iMTExLjAiIHgyPSI3OTUuNjE3NDY5NTM5MzczMiIgeTI9IjEwMC42MjI0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxMy41OTIiIHkxPSIxMTEuMCIgeDI9IjgwMy4yMTQ0IiB5Mj0iOTMuMDI1NDY5NTM5MzczMjMiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iODEzLjU5MiIgeTE9IjExMS4wIiB4Mj0iODEzLjU5MiIgeTI9IjkwLjI0NDgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iODEzLjU5MiIgeTE9IjExMS4wIiB4Mj0iODIzLjk2OTYiIHkyPSI5My4wMjU0Njk1MzkzNzMyMiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTMuNTkyIiB5MT0iMTExLjAiIHgyPSI4MzEuNTY2NTMwNDYwNjI2NyIgeTI9IjEwMC42MjI0IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+CiAgICA8Y2lyY2xlIGN4PSI4MTMuNTkyIiBjeT0iMTExLjAiIHI9IjIuNzA3MiIgZmlsbD0iIzBmMTcyYSIvPgogICAgPGNpcmNsZSBjeD0iNzM2LjUyIiBjeT0iMTE0LjAiIHI9IjI0LjAiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSI3MzYuNTIiIGN5PSIxMTQuMCIgcj0iMTQuODc5OTk5OTk5OTk5OTk5IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjczNi41MiIgeTE9IjExNC4wIiB4Mj0iNzU4LjYiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MzYuNTIiIHkxPSIxMTQuMCIgeDI9Ijc1NS42NDE4NDA5MTU1NjA0IiB5Mj0iMTI1LjAzOTk5OTk5OTk5OTk5IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjczNi41MiIgeTE9IjExNC4wIiB4Mj0iNzQ3LjU2IiB5Mj0iMTMzLjEyMTg0MDkxNTU2MDQiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzM2LjUyIiB5MT0iMTE0LjAiIHgyPSI3MzYuNTIiIHkyPSIxMzYuMDgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iNzM2LjUyIiB5MT0iMTE0LjAiIHgyPSI3MjUuNDgiIHkyPSIxMzMuMTIxODQwOTE1NTYwNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MzYuNTIiIHkxPSIxMTQuMCIgeDI9IjcxNy4zOTgxNTkwODQ0Mzk2IiB5Mj0iMTI1LjAzOTk5OTk5OTk5OTk5IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjczNi41MiIgeTE9IjExNC4wIiB4Mj0iNzE0LjQzOTk5OTk5OTk5OTkiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MzYuNTIiIHkxPSIxMTQuMCIgeDI9IjcxNy4zOTgxNTkwODQ0Mzk2IiB5Mj0iMTAyLjk2MDAwMDAwMDAwMDAxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjczNi41MiIgeTE9IjExNC4wIiB4Mj0iNzI1LjQ4IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MzYuNTIiIHkxPSIxMTQuMCIgeDI9IjczNi41MiIgeTI9IjkxLjkyIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjczNi41MiIgeTE9IjExNC4wIiB4Mj0iNzQ3LjU2IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI3MzYuNTIiIHkxPSIxMTQuMCIgeDI9Ijc1NS42NDE4NDA5MTU1NjA0IiB5Mj0iMTAyLjk2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+CiAgICA8Y2lyY2xlIGN4PSI3MzYuNTIiIGN5PSIxMTQuMCIgcj0iMi44OCIgZmlsbD0iIzBmMTcyYSIvPgogICAgPGNpcmNsZSBjeD0iODE3LjQ4IiBjeT0iMTE0LjAiIHI9IjI0LjAiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIGN4PSI4MTcuNDgiIGN5PSIxMTQuMCIgcj0iMTQuODc5OTk5OTk5OTk5OTk5IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjgxNy40OCIgeTE9IjExNC4wIiB4Mj0iODM5LjU2MDAwMDAwMDAwMDEiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTcuNDgiIHkxPSIxMTQuMCIgeDI9IjgzNi42MDE4NDA5MTU1NjA0IiB5Mj0iMTI1LjAzOTk5OTk5OTk5OTk5IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxNy40OCIgeTE9IjExNC4wIiB4Mj0iODI4LjUyIiB5Mj0iMTMzLjEyMTg0MDkxNTU2MDQiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iODE3LjQ4IiB5MT0iMTE0LjAiIHgyPSI4MTcuNDgiIHkyPSIxMzYuMDgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz48bGluZSB4MT0iODE3LjQ4IiB5MT0iMTE0LjAiIHgyPSI4MDYuNDQiIHkyPSIxMzMuMTIxODQwOTE1NTYwNCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTcuNDgiIHkxPSIxMTQuMCIgeDI9Ijc5OC4zNTgxNTkwODQ0Mzk2IiB5Mj0iMTI1LjAzOTk5OTk5OTk5OTk5IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxNy40OCIgeTE9IjExNC4wIiB4Mj0iNzk1LjQiIHkyPSIxMTQuMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTcuNDgiIHkxPSIxMTQuMCIgeDI9Ijc5OC4zNTgxNTkwODQ0Mzk2IiB5Mj0iMTAyLjk2MDAwMDAwMDAwMDAxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxNy40OCIgeTE9IjExNC4wIiB4Mj0iODA2LjQ0IiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTcuNDgiIHkxPSIxMTQuMCIgeDI9IjgxNy40OCIgeTI9IjkxLjkyIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+PGxpbmUgeDE9IjgxNy40OCIgeTE9IjExNC4wIiB4Mj0iODI4LjUyIiB5Mj0iOTQuODc4MTU5MDg0NDM5NiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMSIvPjxsaW5lIHgxPSI4MTcuNDgiIHkxPSIxMTQuMCIgeDI9IjgzNi42MDE4NDA5MTU1NjA0IiB5Mj0iMTAyLjk2IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS4xIi8+CiAgICA8Y2lyY2xlIGN4PSI4MTcuNDgiIGN5PSIxMTQuMCIgcj0iMi44OCIgZmlsbD0iIzBmMTcyYSIvPgogICAgICAKICAgIDxwb2x5Z29uIHBvaW50cz0iNjY1LjAsMTIzLjAgODIxLjAsMTIzLjAgODIxLjAsMTk1LjAgNjY1LjAsMTk1LjAiIGZpbGw9IiNmOGZhZmMiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjIiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iODIxLjAsMTIzLjAgODY1LjAsMTIzLjAgODY1LjAsMTgxLjAgODIxLjAsMTk1LjAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjIiLz4KICAgIDxsaW5lIHgxPSI2NzMuMCIgeTE9IjEzMy4wIiB4Mj0iODEzLjAiIHkyPSIxMzMuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNjczLjAiIHkxPSIxNDQuMCIgeDI9IjgxMy4wIiB5Mj0iMTQ0LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjY3My4wIiB5MT0iMTU1LjAiIHgyPSI4MTMuMCIgeTI9IjE1NS4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI2NzMuMCIgeTE9IjE2Ni4wIiB4Mj0iODEzLjAiIHkyPSIxNjYuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNjczLjAiIHkxPSIxNzcuMCIgeDI9IjgxMy4wIiB5Mj0iMTc3LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjY3My4wIiB5MT0iMTg4LjAiIHgyPSI4MTMuMCIgeTI9IjE4OC4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI2NzMuMCIgeTE9IjEyOS4wIiB4Mj0iNjczLjAiIHkyPSIxODkuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNjk2LjMzMzMzMzMzMzMzMzQiIHkxPSIxMjkuMCIgeDI9IjY5Ni4zMzMzMzMzMzMzMzM0IiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjcxOS42NjY2NjY2NjY2NjY2IiB5MT0iMTI5LjAiIHgyPSI3MTkuNjY2NjY2NjY2NjY2NiIgeTI9IjE4OS4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI3NDMuMCIgeTE9IjEyOS4wIiB4Mj0iNzQzLjAiIHkyPSIxODkuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNzY2LjMzMzMzMzMzMzMzMzQiIHkxPSIxMjkuMCIgeDI9Ijc2Ni4zMzMzMzMzMzMzMzM0IiB5Mj0iMTg5LjAiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9Ijc4OS42NjY2NjY2NjY2NjY2IiB5MT0iMTI5LjAiIHgyPSI3ODkuNjY2NjY2NjY2NjY2NiIgeTI9IjE4OS4wIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI4MTMuMCIgeTE9IjEyOS4wIiB4Mj0iODEzLjAiIHkyPSIxODkuMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEiLz48cmVjdCB4PSI2NjcuMCIgeT0iMTc5LjAiIHdpZHRoPSIxNTIuMCIgaGVpZ2h0PSIxNCIgZmlsbD0iIzdkZDNmYyIgb3BhY2l0eT0iMC43NSIvPjxsaW5lIHgxPSI2NzEuMCIgeTE9IjE5NS4wIiB4Mj0iNjcxLjAiIHkyPSIyMTEuMCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjMiLz48bGluZSB4MT0iODE1LjAiIHkxPSIxOTUuMCIgeDI9IjgxNS4wIiB5Mj0iMjExLjAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICAgIDx0ZXh0IHg9Ijc2NSIgeT0iMjExLjAiIGZvbnQtc2l6ZT0iMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+VE9SUkUgMjwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMjM1IiB5MT0iMTk3IiB4Mj0iMjM1IiB5Mj0iMjcwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjIyOSIgeT0iMjQ0IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSIyMzUiIGN5PSIyNDAiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIyMjgiIHkxPSIyNDAiIHgyPSIyNDIiIHkyPSIyNDAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjIzNSIgeTE9IjIzMyIgeDI9IjIzNSIgeTI9IjI0NyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSIyMjIiIHk9IjI1OS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjIxNSIgeT0iMjYyIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSIyNDgiIHk9IjI2MiIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iMjM1IiB5PSIyMjgiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi03PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSI3NjUiIHkxPSIxOTciIHgyPSI3NjUiIHkyPSIyNzAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNzU5IiB5PSIyNDQiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9Ijc2NSIgY3k9IjI0MCIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9Ijc1OCIgeTE9IjI0MCIgeDI9Ijc3MiIgeTI9IjI0MCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iNzY1IiB5MT0iMjMzIiB4Mj0iNzY1IiB5Mj0iMjQ3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9Ijc1MiIgeT0iMjU5LjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iNzQ1IiB5PSIyNjIiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9Ijc3OCIgeT0iMjYyIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI3NjUiIHk9IjIyOCIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTg8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjIzNSIgeTE9IjI3OCIgeDI9IjIzNSIgeTI9IjM2MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxsaW5lIHgxPSI3NjUiIHkxPSIyNzgiIHgyPSI3NjUiIHkyPSIzNjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMjM1IiB5MT0iMzYwIiB4Mj0iOTAwIiB5Mj0iMzYwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjM5NCIgeT0iMzM2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMzIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIzOTMiIHkxPSIzMzIiIHgyPSI0MDciIHkyPSIzMzIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjQwMCIgeTE9IjMyNSIgeDI9IjQwMCIgeTI9IjMzOSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSIzODciIHk9IjM1MS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjM4MCIgeT0iMzU0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI0MTMiIHk9IjM1NCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iNDAwIiB5PSIzMjAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi05PC90ZXh0PgogICAgPC9nPjxnPgogICAgICA8cmVjdCB4PSI1OTQiIHk9IjMzNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjkiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNjAwIiBjeT0iMzMyIiByPSI3IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8bGluZSB4MT0iNTkzIiB5MT0iMzMyIiB4Mj0iNjA3IiB5Mj0iMzMyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI2MDAiIHkxPSIzMjUiIHgyPSI2MDAiIHkyPSIzMzkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPHJlY3QgeD0iNTg3IiB5PSIzNTEuNTUiIHdpZHRoPSIyNiIgaGVpZ2h0PSIxNi45MDAwMDAwMDAwMDAwMDIiIHJ4PSI0IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICA8cmVjdCB4PSI1ODAiIHk9IjM1NCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHJlY3QgeD0iNjEzIiB5PSIzNTQiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDx0ZXh0IHg9IjYwMCIgeT0iMzIwIiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMTA8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxyZWN0IHg9Ijc5NCIgeT0iMzM2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI4MDAiIGN5PSIzMzIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI3OTMiIHkxPSIzMzIiIHgyPSI4MDciIHkyPSIzMzIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjgwMCIgeTE9IjMyNSIgeDI9IjgwMCIgeTI9IjMzOSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI3ODciIHk9IjM1MS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9Ijc4MCIgeT0iMzU0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI4MTMiIHk9IjM1NCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iODAwIiB5PSIzMjAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0xMTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMzUwIiB5MT0iMzYwIiB4Mj0iMzUwIiB5Mj0iNDI1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjM0NCIgeT0iMzk2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSIzNTAiIGN5PSIzOTIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSIzNDMiIHkxPSIzOTIiIHgyPSIzNTciIHkyPSIzOTIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjM1MCIgeTE9IjM4NSIgeDI9IjM1MCIgeTI9IjM5OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSIzMzciIHk9IjQxMS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjMzMCIgeT0iNDE0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSIzNjMiIHk9IjQxNCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iMzUwIiB5PSIzODAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0xMjwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNTI1IiB5MT0iMzYwIiB4Mj0iNTI1IiB5Mj0iNDI1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjUxOSIgeT0iMzk2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI1MjUiIGN5PSIzOTIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI1MTgiIHkxPSIzOTIiIHgyPSI1MzIiIHkyPSIzOTIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjUyNSIgeTE9IjM4NSIgeDI9IjUyNSIgeTI9IjM5OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI1MTIiIHk9IjQxMS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjUwNSIgeT0iNDE0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI1MzgiIHk9IjQxNCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iNTI1IiB5PSIzODAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0xMzwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNzAwIiB5MT0iMzYwIiB4Mj0iNzAwIiB5Mj0iNDI1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjY5NCIgeT0iMzk2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI3MDAiIGN5PSIzOTIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI2OTMiIHkxPSIzOTIiIHgyPSI3MDciIHkyPSIzOTIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjcwMCIgeTE9IjM4NSIgeDI9IjcwMCIgeTI9IjM5OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI2ODciIHk9IjQxMS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjY4MCIgeT0iNDE0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI3MTMiIHk9IjQxNCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iNzAwIiB5PSIzODAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0xNDwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMzUwIiB5MT0iNDMwIiB4Mj0iMzUwIiB5Mj0iNDY1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjM0MCIgeT0iNDUxIiB3aWR0aD0iMjAiIGhlaWdodD0iMTYiIHJ4PSIzIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSIzNTAiIHkxPSI0NjciIHgyPSIzNTAiIHkyPSI0NzMiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICAgIDxjaXJjbGUgY3g9IjM1MCIgY3k9IjQ5NSIgcj0iMjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iMzUwIiBjeT0iNDk1IiByPSI3LjY4IiBmaWxsPSIjN2YxZDFkIi8+CiAgICAgIDxyZWN0IHg9IjMxNyIgeT0iNDg5IiB3aWR0aD0iOSIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSIzNzQiIHk9IjQ4OSIgd2lkdGg9IjkiIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPHRleHQgeD0iMzUwIiB5PSI1MzUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+QkFDMTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNTI1IiB5MT0iNDMwIiB4Mj0iNTI1IiB5Mj0iNDY1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjUxNSIgeT0iNDUxIiB3aWR0aD0iMjAiIGhlaWdodD0iMTYiIHJ4PSIzIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI1MjUiIHkxPSI0NjciIHgyPSI1MjUiIHkyPSI0NzMiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICAgIDxjaXJjbGUgY3g9IjUyNSIgY3k9IjQ5NSIgcj0iMjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNTI1IiBjeT0iNDk1IiByPSI3LjY4IiBmaWxsPSIjN2YxZDFkIi8+CiAgICAgIDxyZWN0IHg9IjQ5MiIgeT0iNDg5IiB3aWR0aD0iOSIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI1NDkiIHk9IjQ4OSIgd2lkdGg9IjkiIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPHRleHQgeD0iNTI1IiB5PSI1MzUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+QkFDMjwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNzAwIiB5MT0iNDMwIiB4Mj0iNzAwIiB5Mj0iNDY1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjY5MCIgeT0iNDUxIiB3aWR0aD0iMjAiIGhlaWdodD0iMTYiIHJ4PSIzIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxsaW5lIHgxPSI3MDAiIHkxPSI0NjciIHgyPSI3MDAiIHkyPSI0NzMiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICAgIDxjaXJjbGUgY3g9IjcwMCIgY3k9IjQ5NSIgcj0iMjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNzAwIiBjeT0iNDk1IiByPSI3LjY4IiBmaWxsPSIjN2YxZDFkIi8+CiAgICAgIDxyZWN0IHg9IjY2NyIgeT0iNDg5IiB3aWR0aD0iOSIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI3MjQiIHk9IjQ4OSIgd2lkdGg9IjkiIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPHRleHQgeD0iNzAwIiB5PSI1MzUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+QkFDMzwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMzUwIiB5MT0iNTIxIiB4Mj0iMzUwIiB5Mj0iNTYwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjUyNSIgeTE9IjUyMSIgeDI9IjUyNSIgeTI9IjU2MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxsaW5lIHgxPSI3MDAiIHkxPSI1MjEiIHgyPSI3MDAiIHkyPSI1NjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMzUwIiB5MT0iNTYwIiB4Mj0iNzAwIiB5Mj0iNTYwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjQ0NCIgeT0iNTM2IiB3aWR0aD0iMTIiIGhlaWdodD0iOSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSI1MzIiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxsaW5lIHgxPSI0NDMiIHkxPSI1MzIiIHgyPSI0NTciIHkyPSI1MzIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjYiLz4KICAgICAgPGxpbmUgeDE9IjQ1MCIgeTE9IjUyNSIgeDI9IjQ1MCIgeTI9IjUzOSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI0MzciIHk9IjU1MS41NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjE2LjkwMDAwMDAwMDAwMDAwMiIgcng9IjQiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgIDxyZWN0IHg9IjQzMCIgeT0iNTU0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8cmVjdCB4PSI0NjMiIHk9IjU1NCIgd2lkdGg9IjciIGhlaWdodD0iMTIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjMiLz4KICAgICAgPHRleHQgeD0iNDUwIiB5PSI1MjAiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0xNTwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iNTk0IiB5PSI1MzYiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjYwMCIgY3k9IjUzMiIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9IjU5MyIgeTE9IjUzMiIgeDI9IjYwNyIgeTI9IjUzMiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iNjAwIiB5MT0iNTI1IiB4Mj0iNjAwIiB5Mj0iNTM5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjU4NyIgeT0iNTUxLjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iNTgwIiB5PSI1NTQiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9IjYxMyIgeT0iNTU0IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI2MDAiIHk9IjUyMCIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTE2PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSIzNTAiIHkxPSI1NjAiIHgyPSIzNTAiIHkyPSI2MTAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iMzQ0IiB5PSI1OTEiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjM1MCIgY3k9IjU4NyIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9IjM0MyIgeTE9IjU4NyIgeDI9IjM1NyIgeTI9IjU4NyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iMzUwIiB5MT0iNTgwIiB4Mj0iMzUwIiB5Mj0iNTk0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjMzNyIgeT0iNjA2LjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iMzMwIiB5PSI2MDkiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9IjM2MyIgeT0iNjA5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSIzNTAiIHk9IjU3NSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTE3PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSI3MDAiIHkxPSI1NjAiIHgyPSI3MDAiIHkyPSI2MTAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNjk0IiB5PSI1OTEiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjcwMCIgY3k9IjU4NyIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9IjY5MyIgeTE9IjU4NyIgeDI9IjcwNyIgeTI9IjU4NyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iNzAwIiB5MT0iNTgwIiB4Mj0iNzAwIiB5Mj0iNTk0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjY4NyIgeT0iNjA2LjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iNjgwIiB5PSI2MDkiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9IjcxMyIgeT0iNjA5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI3MDAiIHk9IjU3NSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTE4PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSIxNTAiIHkxPSI2MjAiIHgyPSIxNTAiIHkyPSI2NjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iMTQ0IiB5PSI2MzEiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjYyNyIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9IjE0MyIgeTE9IjYyNyIgeDI9IjE1NyIgeTI9IjYyNyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iMTUwIiB5MT0iNjIwIiB4Mj0iMTUwIiB5Mj0iNjM0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjEzNyIgeT0iNjQ2LjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iMTMwIiB5PSI2NDkiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9IjE2MyIgeT0iNjQ5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSIxNTAiIHk9IjYxNSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTE5PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSI4NTAiIHkxPSI2MjAiIHgyPSI4NTAiIHkyPSI2NjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iODQ0IiB5PSI2MzEiIHdpZHRoPSIxMiIgaGVpZ2h0PSI5IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9Ijg1MCIgY3k9IjYyNyIgcj0iNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPGxpbmUgeDE9Ijg0MyIgeTE9IjYyNyIgeDI9Ijg1NyIgeTI9IjYyNyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8bGluZSB4MT0iODUwIiB5MT0iNjIwIiB4Mj0iODUwIiB5Mj0iNjM0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjgzNyIgeT0iNjQ2LjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgICAgPHJlY3QgeD0iODMwIiB5PSI2NDkiIHdpZHRoPSI3IiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4zIi8+CiAgICAgIDxyZWN0IHg9Ijg2MyIgeT0iNjQ5IiB3aWR0aD0iNyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMyIvPgogICAgICA8dGV4dCB4PSI4NTAiIHk9IjYxNSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTIwPC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSIxNTAiIHkxPSI2MjUiIHgyPSIzNTAiIHkyPSI2MjUiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iNzAwIiB5MT0iNjI1IiB4Mj0iODUwIiB5Mj0iNjI1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PHBvbHlnb24gcG9pbnRzPSIyNTcuMCw2MjUuMCAyNDYuMCw2MjkuNSAyNDYuMCw2MjAuNSIgZmlsbD0iIzFkNGVkOCIvPjxwb2x5Z29uIHBvaW50cz0iNzg3LjAsNjI1LjAgNzc2LjAsNjI5LjUgNzc2LjAsNjIwLjUiIGZpbGw9IiMxZDRlZDgiLz48Zz4KICAgICAgCiAgICA8cmVjdCB4PSIxMDcuOCIgeT0iNzQzLjgiIHdpZHRoPSIxMS40IiBoZWlnaHQ9IjE0LjQiIGZpbGw9IiM2NDc0OGIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgIDxyZWN0IHg9IjI0MC43OTk5OTk5OTk5OTk5OCIgeT0iNzQzLjgiIHdpZHRoPSIxMS40IiBoZWlnaHQ9IjE0LjQiIGZpbGw9IiM2NDc0OGIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgIDxyZWN0IHg9IjEwMC4yIiB5PSI3MDcuOCIgd2lkdGg9IjE1OS42IiBoZWlnaHQ9IjM2LjAiIHJ4PSIxOC4wIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGVsbGlwc2UgY3g9IjEwMC4yIiBjeT0iNzI1LjgiIHJ4PSI3LjkyIiByeT0iMTguMCIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgPGVsbGlwc2UgY3g9IjI1OS44IiBjeT0iNzI1LjgiIHJ4PSI3LjkyIiByeT0iMTguMCIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgPGxpbmUgeDE9IjExMy41IiB5MT0iNzE3Ljg4IiB4Mj0iMjQ2LjUiIHkyPSI3MTcuODgiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8cmVjdCB4PSI5Ni40IiB5PSI2NzAuMCIgd2lkdGg9IjY0LjYwMDAwMDAwMDAwMDAxIiBoZWlnaHQ9IjM2LjAiIHJ4PSIzIiBmaWxsPSIjZTBmMmZlIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICA8bGluZSB4MT0iOTkuNCIgeTE9IjY3NC4wIiB4Mj0iMTU4LjAiIHkyPSI2NzQuMCIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjY3OC41IiB4Mj0iMTU4LjAiIHkyPSI2NzguNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjY4My4wIiB4Mj0iMTU4LjAiIHkyPSI2ODMuMCIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjY4Ny41IiB4Mj0iMTU4LjAiIHkyPSI2ODcuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjY5Mi4wIiB4Mj0iMTU4LjAiIHkyPSI2OTIuMCIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjY5Ni41IiB4Mj0iMTU4LjAiIHkyPSI2OTYuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjcwMS4wIiB4Mj0iMTU4LjAiIHkyPSI3MDEuMCIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iOTkuNCIgeTE9IjcwNS41IiB4Mj0iMTU4LjAiIHkyPSI3MDUuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxyZWN0IHg9IjE5NS4yIiB5PSI2NzAuMCIgd2lkdGg9IjY4LjM5OTk5OTk5OTk5OTk5IiBoZWlnaHQ9IjM3LjgiIHJ4PSI0IiBmaWxsPSIjMzM0MTU1IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICA8cmVjdCB4PSIyMDQuNzc1OTk5OTk5OTk5OTgiIHk9IjY3Ni4wNDgiIHdpZHRoPSI0OS4yNDc5OTk5OTk5OTk5OSIgaGVpZ2h0PSIxNS44NzU5OTk5OTk5OTk5OTgiIHJ4PSIyIiBmaWxsPSIjMzhiZGY4Ii8+CiAgICA8Y2lyY2xlIGN4PSIyMTQuMzUxOTk5OTk5OTk5OTgiIGN5PSI2OTguMzUiIHI9IjQuMTU3OTk5OTk5OTk5OTk5NSIgZmlsbD0iIzIyYzU1ZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxjaXJjbGUgY3g9IjIzNC44NzE5OTk5OTk5OTk5OSIgY3k9IjY5OC4zNSIgcj0iNC4xNTc5OTk5OTk5OTk5OTk1IiBmaWxsPSIjZWY0NDQ0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgICA8dGV4dCB4PSIxODAiIHk9Ijc3Ni4wIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjMGYxNzJhIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPkNISUxMRVIgMTwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgCiAgICA8cmVjdCB4PSI3NDcuOCIgeT0iNzQzLjgiIHdpZHRoPSIxMS40IiBoZWlnaHQ9IjE0LjQiIGZpbGw9IiM2NDc0OGIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgIDxyZWN0IHg9Ijg4MC44IiB5PSI3NDMuOCIgd2lkdGg9IjExLjQiIGhlaWdodD0iMTQuNCIgZmlsbD0iIzY0NzQ4YiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgPHJlY3QgeD0iNzQwLjIiIHk9IjcwNy44IiB3aWR0aD0iMTU5LjYiIGhlaWdodD0iMzYuMCIgcng9IjE4LjAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8ZWxsaXBzZSBjeD0iNzQwLjIiIGN5PSI3MjUuOCIgcng9IjcuOTIiIHJ5PSIxOC4wIiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICA8ZWxsaXBzZSBjeD0iODk5LjgiIGN5PSI3MjUuOCIgcng9IjcuOTIiIHJ5PSIxOC4wIiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICA8bGluZSB4MT0iNzUzLjUiIHkxPSI3MTcuODgiIHgyPSI4ODYuNSIgeTI9IjcxNy44OCIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxyZWN0IHg9IjczNi40IiB5PSI2NzAuMCIgd2lkdGg9IjY0LjYwMDAwMDAwMDAwMDAxIiBoZWlnaHQ9IjM2LjAiIHJ4PSIzIiBmaWxsPSIjZTBmMmZlIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICA8bGluZSB4MT0iNzM5LjQiIHkxPSI2NzQuMCIgeDI9Ijc5OC4wIiB5Mj0iNjc0LjAiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjczOS40IiB5MT0iNjc4LjUiIHgyPSI3OTguMCIgeTI9IjY3OC41IiBzdHJva2U9IiMwMzY5YTEiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI3MzkuNCIgeTE9IjY4My4wIiB4Mj0iNzk4LjAiIHkyPSI2ODMuMCIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNzM5LjQiIHkxPSI2ODcuNSIgeDI9Ijc5OC4wIiB5Mj0iNjg3LjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjczOS40IiB5MT0iNjkyLjAiIHgyPSI3OTguMCIgeTI9IjY5Mi4wIiBzdHJva2U9IiMwMzY5YTEiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI3MzkuNCIgeTE9IjY5Ni41IiB4Mj0iNzk4LjAiIHkyPSI2OTYuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNzM5LjQiIHkxPSI3MDEuMCIgeDI9Ijc5OC4wIiB5Mj0iNzAxLjAiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjczOS40IiB5MT0iNzA1LjUiIHgyPSI3OTguMCIgeTI9IjcwNS41IiBzdHJva2U9IiMwMzY5YTEiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPHJlY3QgeD0iODM1LjIiIHk9IjY3MC4wIiB3aWR0aD0iNjguMzk5OTk5OTk5OTk5OTkiIGhlaWdodD0iMzcuOCIgcng9IjQiIGZpbGw9IiMzMzQxNTUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgIDxyZWN0IHg9Ijg0NC43NzYwMDAwMDAwMDAxIiB5PSI2NzYuMDQ4IiB3aWR0aD0iNDkuMjQ3OTk5OTk5OTk5OTkiIGhlaWdodD0iMTUuODc1OTk5OTk5OTk5OTk4IiByeD0iMiIgZmlsbD0iIzM4YmRmOCIvPgogICAgPGNpcmNsZSBjeD0iODU0LjM1MjAwMDAwMDAwMDEiIGN5PSI2OTguMzUiIHI9IjQuMTU3OTk5OTk5OTk5OTk5NSIgZmlsbD0iIzIyYzU1ZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxjaXJjbGUgY3g9Ijg3NC44NzIwMDAwMDAwMDAxIiBjeT0iNjk4LjM1IiByPSI0LjE1Nzk5OTk5OTk5OTk5OTUiIGZpbGw9IiNlZjQ0NDQiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICAgIDx0ZXh0IHg9IjgyMCIgeT0iNzc2LjAiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMwZjE3MmEiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+Q0hJTExFUiAyPC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSIxNTAiIHkxPSI2NzAiIHgyPSIxNTAiIHkyPSI3MDAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iODUwIiB5MT0iNjcwIiB4Mj0iODUwIiB5Mj0iNzAwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PC9zdmc+",
    "componentes": [
      {
        "codigo": "V-0",
        "nombre": "Válvula del ByPass piso 33",
        "tipo": "Válvula",
        "x": 49.0,
        "y": 6.9
      },
      {
        "codigo": "V-1",
        "nombre": "Válvula entrada a la torre #1",
        "tipo": "Válvula",
        "x": 15.0,
        "y": 11.3
      },
      {
        "codigo": "V-2",
        "nombre": "Válvula entrada a la torre #1",
        "tipo": "Válvula",
        "x": 22.0,
        "y": 11.3
      },
      {
        "codigo": "V-3",
        "nombre": "Válvula entrada a la torre #1",
        "tipo": "Válvula",
        "x": 29.0,
        "y": 11.3
      },
      {
        "codigo": "V-4",
        "nombre": "Válvula entrada a la torre #2",
        "tipo": "Válvula",
        "x": 71.0,
        "y": 11.3
      },
      {
        "codigo": "V-5",
        "nombre": "Válvula entrada a la torre #2",
        "tipo": "Válvula",
        "x": 78.0,
        "y": 11.3
      },
      {
        "codigo": "V-6",
        "nombre": "Válvula entrada a la torre #2",
        "tipo": "Válvula",
        "x": 85.0,
        "y": 11.3
      },
      {
        "codigo": "TORRE 1",
        "nombre": "Torre de enfriamiento #1",
        "tipo": "Torre",
        "x": 23.5,
        "y": 18.8
      },
      {
        "codigo": "TORRE 2",
        "nombre": "Torre de enfriamiento #2",
        "tipo": "Torre",
        "x": 76.5,
        "y": 18.8
      },
      {
        "codigo": "V-7",
        "nombre": "Válvula salida de la torre #1",
        "tipo": "Válvula",
        "x": 23.5,
        "y": 33.1
      },
      {
        "codigo": "V-8",
        "nombre": "Válvula salida de la torre #2",
        "tipo": "Válvula",
        "x": 76.5,
        "y": 33.1
      },
      {
        "codigo": "V-9",
        "nombre": "Válvula del ByPass piso 16",
        "tipo": "Válvula",
        "x": 40.0,
        "y": 45.0
      },
      {
        "codigo": "V-10",
        "nombre": "Válvula del ByPass piso 16",
        "tipo": "Válvula",
        "x": 60.0,
        "y": 45.0
      },
      {
        "codigo": "V-11",
        "nombre": "Válvula del ByPass piso 16",
        "tipo": "Válvula",
        "x": 80.0,
        "y": 45.0
      },
      {
        "codigo": "V-12",
        "nombre": "Válvula de succión bomba #1 Piso 16",
        "tipo": "Válvula",
        "x": 35.0,
        "y": 52.5
      },
      {
        "codigo": "V-13",
        "nombre": "Válvula de succión bomba #2 Piso 16",
        "tipo": "Válvula",
        "x": 52.5,
        "y": 52.5
      },
      {
        "codigo": "V-14",
        "nombre": "Válvula de succión bomba #3 Piso 16",
        "tipo": "Válvula",
        "x": 70.0,
        "y": 52.5
      },
      {
        "codigo": "BAC1",
        "nombre": "Bomba de condensación #1",
        "tipo": "Bomba",
        "x": 35.0,
        "y": 61.9
      },
      {
        "codigo": "BAC2",
        "nombre": "Bomba de condensación #2",
        "tipo": "Bomba",
        "x": 52.5,
        "y": 61.9
      },
      {
        "codigo": "BAC3",
        "nombre": "Bomba de condensación #3",
        "tipo": "Bomba",
        "x": 70.0,
        "y": 61.9
      },
      {
        "codigo": "V-15",
        "nombre": "Válvula del ByPass piso 16",
        "tipo": "Válvula",
        "x": 45.0,
        "y": 70.0
      },
      {
        "codigo": "V-16",
        "nombre": "Válvula del ByPass piso 16",
        "tipo": "Válvula",
        "x": 60.0,
        "y": 70.0
      },
      {
        "codigo": "V-17",
        "nombre": "Válvula Entrada Chiller #1",
        "tipo": "Válvula",
        "x": 35.0,
        "y": 76.9
      },
      {
        "codigo": "V-18",
        "nombre": "Válvula Entrada Chiller #2",
        "tipo": "Válvula",
        "x": 70.0,
        "y": 76.9
      },
      {
        "codigo": "V-19",
        "nombre": "Salida de Chiller #1",
        "tipo": "Válvula",
        "x": 15.0,
        "y": 81.9
      },
      {
        "codigo": "V-20",
        "nombre": "Salida de Chiller #2",
        "tipo": "Válvula",
        "x": 85.0,
        "y": 81.9
      },
      {
        "codigo": "CHILLER 1",
        "nombre": "Chiller #1 (condensación)",
        "tipo": "Chiller",
        "x": 18.0,
        "y": 89.4
      },
      {
        "codigo": "CHILLER 2",
        "nombre": "Chiller #2 (condensación)",
        "tipo": "Chiller",
        "x": 82.0,
        "y": 89.4
      }
    ],
    "createdBy": "Sistema",
    "createdAt": "2026-09-04T00:00:00.000Z"
  },
  {
    "id": "diag-seed-evaporacion",
    "nombre": "Evaporación — Piso 16",
    "imagenUrl": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwMCA4NTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj48cmVjdCB3aWR0aD0iMTAwMCIgaGVpZ2h0PSI4NTAiIGZpbGw9IiNmZmZmZmYiLz48dGV4dCB4PSIyMCIgeT0iMjgiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMxZTI5M2IiPkVWQVBPUkFDScOTTiDigJQgUElTTyAxNjwvdGV4dD48dGV4dCB4PSI4NDAiIHk9IjcxMCIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzI1NjNlYiI+4oCUIFN1bWluaXN0cm8gKGZyw61vKTwvdGV4dD48dGV4dCB4PSI4NDAiIHk9IjcyNiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2RjMjYyNiI+4oCUIFJldG9ybm8gKGNhbGllbnRlKTwvdGV4dD48dGV4dCB4PSIyMCIgeT0iNzAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM0NzU1NjkiPlJldG9ybm8gVU1BUyDihpI8L3RleHQ+PGxpbmUgeDE9IjE4MCIgeTE9IjY1IiB4Mj0iOTAwIiB5Mj0iNjUiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxnPgogICAgICA8cmVjdCB4PSIzODQiIHk9IjQ5IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjZTBmMmZlIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iMS42Ii8+CiAgICAgIDxyZWN0IHg9IjM4NCIgeT0iNjciIHdpZHRoPSIzMiIgaGVpZ2h0PSIxNCIgZmlsbD0iIzdkZDNmYyIgb3BhY2l0eT0iMC43Ii8+CiAgICAgIDx0ZXh0IHg9IjQwMCIgeT0iNDMiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM0NzU1NjkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+UmVwb3NpY2nDs24gMC0xNjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iMzU1IiB5PSI0NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjciIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPGNpcmNsZSBjeD0iMzYwIiBjeT0iNDEiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjM1NCIgeTE9IjQxIiB4Mj0iMzY2IiB5Mj0iNDEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGxpbmUgeDE9IjM2MCIgeTE9IjM1IiB4Mj0iMzYwIiB5Mj0iNDciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iMzQ5IiB5PSI1Ny44NSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjE0LjMiIHJ4PSIzLjUiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPHJlY3QgeD0iMzQzIiB5PSI2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iMzcxIiB5PSI2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iMzYwIiB5PSIzMCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTQwPC90ZXh0PgogICAgPC9nPjxnPgogICAgICA8cmVjdCB4PSI0NjUiIHk9IjQ1IiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI0NzAiIGN5PSI0MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iNDY0IiB5MT0iNDEiIHgyPSI0NzYiIHkyPSI0MSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNDcwIiB5MT0iMzUiIHgyPSI0NzAiIHkyPSI0NyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8cmVjdCB4PSI0NTkiIHk9IjU3Ljg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI0NTMiIHk9IjYwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI0ODEiIHk9IjYwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8dGV4dCB4PSI0NzAiIHk9IjMwIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtNDE8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjkwMCIgeTE9IjY1IiB4Mj0iOTAwIiB5Mj0iOTAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxwb2x5Z29uIHBvaW50cz0iOTAwLjAsODUuMCA4OTUuNSw3NC4wIDkwNC41LDc0LjAiIGZpbGw9IiNkYzI2MjYiLz48Zz4KICAgICAgPHJlY3QgeD0iOTEiIHk9IjE0MiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iI2UwZjJmZSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjEuNiIvPgogICAgICA8cmVjdCB4PSI5MSIgeT0iMTYwIiB3aWR0aD0iMzIiIGhlaWdodD0iMTQiIGZpbGw9IiM3ZGQzZmMiIG9wYWNpdHk9IjAuNyIvPgogICAgICA8dGV4dCB4PSIxMDciIHk9IjEzNiIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzQ3NTU2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5SZXBvc2ljacOzbiAxNi0zMjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iMTQ1IiB5PSIxNDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjEzNiIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iMTQ0IiB5MT0iMTM2IiB4Mj0iMTU2IiB5Mj0iMTM2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSIxNTAiIHkxPSIxMzAiIHgyPSIxNTAiIHkyPSIxNDIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iMTM5IiB5PSIxNTIuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjEzMyIgeT0iMTU1IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSIxNjEiIHk9IjE1NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iMTUwIiB5PSIxMjUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zODwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iMTk1IiB5PSIxNDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjEzNiIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iMTk0IiB5MT0iMTM2IiB4Mj0iMjA2IiB5Mj0iMTM2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSIyMDAiIHkxPSIxMzAiIHgyPSIyMDAiIHkyPSIxNDIiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iMTg5IiB5PSIxNTIuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjE4MyIgeT0iMTU1IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSIyMTEiIHk9IjE1NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iMjAwIiB5PSIxMjUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zOTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMTIzIiB5MT0iMTU4IiB4Mj0iMjY1IiB5Mj0iMTU4IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMjY1IiB5MT0iMTU4IiB4Mj0iMjY1IiB5Mj0iMjIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMjMwIiB5MT0iMjIwIiB4Mj0iMzAwIiB5Mj0iMjIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48dGV4dCB4PSIyMCIgeT0iMjA1IiBmb250LXNpemU9IjExIiBmaWxsPSIjNDc1NTY5Ij5SZXRvcm5vIGRlIEhhYml0YWNpb25lcyDihpI8L3RleHQ+PGc+CiAgICAgIDxyZWN0IHg9IjIyNSIgeT0iMjAwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSIyMzAiIGN5PSIxOTYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjIyNCIgeTE9IjE5NiIgeDI9IjIzNiIgeTI9IjE5NiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iMjMwIiB5MT0iMTkwIiB4Mj0iMjMwIiB5Mj0iMjAyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjIxOSIgeT0iMjEyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSIyMTMiIHk9IjIxNSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iMjQxIiB5PSIyMTUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjIzMCIgeT0iMTg1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMzQ8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxyZWN0IHg9IjI5NSIgeT0iMjAwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSIzMDAiIGN5PSIxOTYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjI5NCIgeTE9IjE5NiIgeDI9IjMwNiIgeTI9IjE5NiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iMzAwIiB5MT0iMTkwIiB4Mj0iMzAwIiB5Mj0iMjAyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjI4OSIgeT0iMjEyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSIyODMiIHk9IjIxNSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iMzExIiB5PSIyMTUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjMwMCIgeT0iMTg1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMzU8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjIzMCIgeTE9IjIyMCIgeDI9IjIzMCIgeTI9IjI2NSIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjMwMCIgeTE9IjIyMCIgeDI9IjMwMCIgeTI9IjI2NSIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjIyMiIgeT0iMjUwIiB3aWR0aD0iMTYiIGhlaWdodD0iMTMiIHJ4PSIyIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSIyMzAiIHkxPSIyNjMiIHgyPSIyMzAiIHkyPSIyNjciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iMjMwIiBjeT0iMjg1IiByPSIxOSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIuMiIvPgogICAgICA8Y2lyY2xlIGN4PSIyMzAiIGN5PSIyODUiIHI9IjYuMDgiIGZpbGw9IiM3ZjFkMWQiLz4KICAgICAgPHJlY3QgeD0iMjA0IiB5PSIyODAiIHdpZHRoPSI3IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjI0OSIgeT0iMjgwIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8dGV4dCB4PSIyMzAiIHk9IjMxOSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5CQUY0PC90ZXh0PgogICAgPC9nPjxnPgogICAgICA8cmVjdCB4PSIyOTIiIHk9IjI1MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEzIiByeD0iMiIgZmlsbD0iIzQ3NTU2OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iMzAwIiB5MT0iMjYzIiB4Mj0iMzAwIiB5Mj0iMjY3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMi40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjMwMCIgY3k9IjI4NSIgcj0iMTkiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjIiLz4KICAgICAgPGNpcmNsZSBjeD0iMzAwIiBjeT0iMjg1IiByPSI2LjA4IiBmaWxsPSIjN2YxZDFkIi8+CiAgICAgIDxyZWN0IHg9IjI3NCIgeT0iMjgwIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8cmVjdCB4PSIzMTkiIHk9IjI4MCIgd2lkdGg9IjciIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHRleHQgeD0iMzAwIiB5PSIzMTkiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+QkFGNTwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iMjMwIiB5MT0iMzA0IiB4Mj0iMjMwIiB5Mj0iMzIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMzAwIiB5MT0iMzA0IiB4Mj0iMzAwIiB5Mj0iMzIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMjMwIiB5MT0iMzIwIiB4Mj0iMzQwIiB5Mj0iMzIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMzQwIiB5MT0iMTY1IiB4Mj0iMzQwIiB5Mj0iMzIwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iMzQwIiB5MT0iMTY1IiB4Mj0iNDAwIiB5Mj0iMTY1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48cG9seWdvbiBwb2ludHM9IjM3Ny4wLDE2NS4wIDM2Ni4wLDE2OS41IDM2Ni4wLDE2MC41IiBmaWxsPSIjMjU2M2ViIi8+PGc+CiAgICAgIDxkZWZzPgogICAgICAgIDxjbGlwUGF0aCBpZD0iZXhjaENsaXA0NTBfMzAwIj4KICAgICAgICAgIDxyZWN0IHg9IjM4NS4wIiB5PSIxNzUuMCIgd2lkdGg9IjEzMCIgaGVpZ2h0PSIyNTAiIHJ4PSI0NS41Ii8+CiAgICAgICAgPC9jbGlwUGF0aD4KICAgICAgPC9kZWZzPgogICAgICA8cmVjdCB4PSIzODUuMCIgeT0iMTc1LjAiIHdpZHRoPSIxMzAiIGhlaWdodD0iMjUwIiByeD0iNDUuNSIgZmlsbD0iI2JmZGJmZSIvPgogICAgICA8ZyBjbGlwLXBhdGg9InVybCgjZXhjaENsaXA0NTBfMzAwKSI+CiAgICAgICAgPHJlY3QgeD0iMzg1LjAiIHk9IjM1MC4wIiB3aWR0aD0iMTMwIiBoZWlnaHQ9Ijc1LjAiIGZpbGw9IiM3ZGQzZmMiLz4KICAgICAgPC9nPgogICAgICA8cmVjdCB4PSIzODUuMCIgeT0iMTc1LjAiIHdpZHRoPSIxMzAiIGhlaWdodD0iMjUwIiByeD0iNDUuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjIuMiIvPgogICAgICA8bGluZSB4MT0iMzkzLjAiIHkxPSIxODUuMCIgeDI9IjM5My4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNDEyLjAiIHkxPSIxODUuMCIgeDI9IjQxMi4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNDMxLjAiIHkxPSIxODUuMCIgeDI9IjQzMS4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNDUwLjAiIHkxPSIxODUuMCIgeDI9IjQ1MC4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNDY5LjAiIHkxPSIxODUuMCIgeDI9IjQ2OS4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNDg4LjAiIHkxPSIxODUuMCIgeDI9IjQ4OC4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz48bGluZSB4MT0iNTA3LjAiIHkxPSIxODUuMCIgeDI9IjUwNy4wIiB5Mj0iNDE1LjAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNTUiLz4KICAgICAgPHRleHQgeD0iNDUwIiB5PSIxNjMuMCIgZm9udC1zaXplPSIxMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5JTlRFUkNBTUJJQURPUjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iMzk1IiB5PSIxNDUiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjQwMCIgY3k9IjE0MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iMzk0IiB5MT0iMTQxIiB4Mj0iNDA2IiB5Mj0iMTQxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI0MDAiIHkxPSIxMzUiIHgyPSI0MDAiIHkyPSIxNDciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iMzg5IiB5PSIxNTcuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjM4MyIgeT0iMTYwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI0MTEiIHk9IjE2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNDAwIiB5PSIxMzAiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zMzwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iNDk1IiB5PSIxNDUiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjUwMCIgY3k9IjE0MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iNDk0IiB5MT0iMTQxIiB4Mj0iNTA2IiB5Mj0iMTQxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI1MDAiIHkxPSIxMzUiIHgyPSI1MDAiIHkyPSIxNDciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iNDg5IiB5PSIxNTcuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjQ4MyIgeT0iMTYwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI1MTEiIHk9IjE2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNTAwIiB5PSIxMzAiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zNjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iMzk1IiB5PSIzOTUiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjQwMCIgY3k9IjM5MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iMzk0IiB5MT0iMzkxIiB4Mj0iNDA2IiB5Mj0iMzkxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI0MDAiIHkxPSIzODUiIHgyPSI0MDAiIHkyPSIzOTciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iMzg5IiB5PSI0MDcuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjM4MyIgeT0iNDEwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI0MTEiIHk9IjQxMCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNDAwIiB5PSI0NDYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zMjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iNDk1IiB5PSIzOTUiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjUwMCIgY3k9IjM5MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iNDk0IiB5MT0iMzkxIiB4Mj0iNTA2IiB5Mj0iMzkxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI1MDAiIHkxPSIzODUiIHgyPSI1MDAiIHkyPSIzOTciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iNDg5IiB5PSI0MDcuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjQ4MyIgeT0iNDEwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI1MTEiIHk9IjQxMCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNTAwIiB5PSI0NDYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zNzwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNDAwIiB5MT0iMTc2IiB4Mj0iNDAwIiB5Mj0iMTkwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iNTAwIiB5MT0iMTc2IiB4Mj0iNTAwIiB5Mj0iMTkwIiBzdHJva2U9IiNkYzI2MjYiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48bGluZSB4MT0iNDAwIiB5MT0iNDA0IiB4Mj0iNDAwIiB5Mj0iNDI1IiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48dGV4dCB4PSIyMCIgeT0iNDkzLjAiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiM0NzU1NjkiPlN1bWluaXN0cm8gZGUgSGFiaXRhY2lvbmVzIOKGkDwvdGV4dD48bGluZSB4MT0iMjAiIHkxPSI0NjAiIHgyPSI0MDAiIHkyPSI0NjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxsaW5lIHgxPSI0MDAiIHkxPSI0MjUiIHgyPSI0MDAiIHkyPSI0NjAiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxsaW5lIHgxPSI1NjAiIHkxPSI2NSIgeDI9IjU2MCIgeTI9IjIxNSIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjU1NSIgeT0iMTk4IiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI1NjAiIGN5PSIxOTQiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjU1NCIgeTE9IjE5NCIgeDI9IjU2NiIgeTI9IjE5NCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNTYwIiB5MT0iMTg4IiB4Mj0iNTYwIiB5Mj0iMjAwIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjU0NyIgeT0iMjExLjU1IiB3aWR0aD0iMjYiIGhlaWdodD0iMTYuOTAwMDAwMDAwMDAwMDAyIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjU0MSIgeT0iMjE1IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI1NzMiIHk9IjIxNSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNTYwIiB5PSIxODMiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi00MjwvdGV4dD4KICAgIDwvZz48dGV4dCB4PSI2MDUiIHk9IjI1NSIgZm9udC1zaXplPSI5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNDc1NTY5Ij5FbGVjdHJvdsOhbHZ1bGE8L3RleHQ+PGxpbmUgeDE9IjU2MCIgeTE9IjIzMyIgeDI9IjU2MCIgeTI9IjcwMCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjIwIiB5MT0iNzAwIiB4Mj0iNTYwIiB5Mj0iNzAwIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48dGV4dCB4PSIyMCIgeT0iNzI1IiBmb250LXNpemU9IjEyIiBmaWxsPSIjNDc1NTY5Ij7ihpIgU3VtaW5pc3RybyBhIFVNQVM8L3RleHQ+PGxpbmUgeDE9IjUwMCIgeTE9IjE1NCIgeDI9IjUwMCIgeTI9IjEwMCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjUwMCIgeTE9IjEwMCIgeDI9IjY1MCIgeTI9IjEwMCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjY1MCIgeTE9IjEwMCIgeDI9IjY1MCIgeTI9IjEwOCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjQzMCIgeTE9IjY1IiB4Mj0iNDMwIiB5Mj0iMTAxIiBzdHJva2U9IiNkYzI2MjYiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iNDI0IiB5PSI4NiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEwIiByeD0iMiIgZmlsbD0iIzQ3NTU2OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI0MzAiIGN5PSI5MSIgcj0iNiIgZmlsbD0iI2UyZThmMCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8dGV4dCB4PSI0MzAiIHk9Ijk0IiBmb250LXNpemU9IjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMwZjE3MmEiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TTwvdGV4dD4KICAgICAgPHJlY3QgeD0iNDE5IiB5PSIxMDQuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjQxMyIgeT0iMTA3IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI0NDEiIHk9IjEwNyIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iNDMwIiB5PSIxMzkiIGZvbnQtc2l6ZT0iOSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTQ0PC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSI0NDEiIHkxPSIxMTIiIHgyPSI0NTkiIHkyPSIxMTIiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxnPgogICAgICA8cmVjdCB4PSI0NjQiIHk9Ijg2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjQ3MCIgY3k9IjkxIiByPSI2IiBmaWxsPSIjZTJlOGYwIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDx0ZXh0IHg9IjQ3MCIgeT0iOTQiIGZvbnQtc2l6ZT0iOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzBmMTcyYSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5NPC90ZXh0PgogICAgICA8cmVjdCB4PSI0NTkiIHk9IjEwNC44NSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjE0LjMiIHJ4PSIzLjUiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPHJlY3QgeD0iNDUzIiB5PSIxMDciIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxyZWN0IHg9IjQ4MSIgeT0iMTA3IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8dGV4dCB4PSI0NzAiIHk9IjEzOSIgZm9udC1zaXplPSI5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtNDM8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjQ3MCIgeTE9IjEyMyIgeDI9IjQ3MCIgeTI9IjEzOCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjQ3MCIgeTE9IjEzOCIgeDI9IjUwMCIgeTI9IjEzOCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PHRleHQgeD0iNDUwIiB5PSI5NSIgZm9udC1zaXplPSI5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNDc1NTY5Ij5CeXBhc3M8L3RleHQ+PGxpbmUgeDE9IjUwMCIgeTE9IjQyNiIgeDI9IjUwMCIgeTI9IjQ4MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjUwMCIgeTE9IjQ4MCIgeDI9IjY1MCIgeTI9IjQ4MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjY1MCIgeTE9IjQ4MCIgeDI9IjY1MCIgeTI9IjU2NSIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjY1MCIgeTE9IjkwIiB4Mj0iOTIwIiB5Mj0iOTAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxnPgogICAgICA8cmVjdCB4PSI3MTUiIHk9IjcwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI3MjAiIGN5PSI2NiIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iNzE0IiB5MT0iNjYiIHgyPSI3MjYiIHkyPSI2NiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNzIwIiB5MT0iNjAiIHgyPSI3MjAiIHkyPSI3MiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8cmVjdCB4PSI3MDkiIHk9IjgyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI3MDMiIHk9Ijg1IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI3MzEiIHk9Ijg1IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8dGV4dCB4PSI3MjAiIHk9IjU1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjE8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxyZWN0IHg9Ijg0NSIgeT0iNzAiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9Ijg1MCIgY3k9IjY2IiByPSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxsaW5lIHgxPSI4NDQiIHkxPSI2NiIgeDI9Ijg1NiIgeTI9IjY2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI4NTAiIHkxPSI2MCIgeDI9Ijg1MCIgeTI9IjcyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjgzOSIgeT0iODIuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjgzMyIgeT0iODUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxyZWN0IHg9Ijg2MSIgeT0iODUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9Ijg1MCIgeT0iNTUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0yMjwvdGV4dD4KICAgIDwvZz48bGluZSB4MT0iNjUwIiB5MT0iOTgiIHgyPSI2NTAiIHkyPSIxNjAiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxsaW5lIHgxPSI5MTAiIHkxPSI5OCIgeDI9IjkxMCIgeTI9IjE2MCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjY1MCIgeTE9IjE2MCIgeDI9IjkyMCIgeTI9IjE2MCIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjY0NSIgeT0iMTQwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI2NTAiIGN5PSIxMzYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjY0NCIgeTE9IjEzNiIgeDI9IjY1NiIgeTI9IjEzNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNjUwIiB5MT0iMTMwIiB4Mj0iNjUwIiB5Mj0iMTQyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjYzOSIgeT0iMTUyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI2MzMiIHk9IjE1NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iNjYxIiB5PSIxNTUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjY1MCIgeT0iMTI1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjM8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjY1MCIgeTE9IjE2OCIgeDI9IjY1MCIgeTI9IjIwNSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9Ijc3NSIgeT0iMTQwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI3ODAiIGN5PSIxMzYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9Ijc3NCIgeTE9IjEzNiIgeDI9Ijc4NiIgeTI9IjEzNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNzgwIiB5MT0iMTMwIiB4Mj0iNzgwIiB5Mj0iMTQyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9Ijc2OSIgeT0iMTUyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI3NjMiIHk9IjE1NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iNzkxIiB5PSIxNTUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9Ijc4MCIgeT0iMTI1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjQ8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9Ijc4MCIgeTE9IjE2OCIgeDI9Ijc4MCIgeTI9IjIwNSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjkwNSIgeT0iMTQwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI5MTAiIGN5PSIxMzYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjkwNCIgeTE9IjEzNiIgeDI9IjkxNiIgeTI9IjEzNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iOTEwIiB5MT0iMTMwIiB4Mj0iOTEwIiB5Mj0iMTQyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9Ijg5OSIgeT0iMTUyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI4OTMiIHk9IjE1NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iOTIxIiB5PSIxNTUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjkxMCIgeT0iMTI1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjU8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjkxMCIgeTE9IjE2OCIgeDI9IjkxMCIgeTI9IjIwNSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjY0MiIgeT0iMTkwIiB3aWR0aD0iMTYiIGhlaWdodD0iMTMiIHJ4PSIyIiBmaWxsPSIjNDc1NTY5IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI2NTAiIHkxPSIyMDMiIHgyPSI2NTAiIHkyPSIyMDciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KICAgICAgPGNpcmNsZSBjeD0iNjUwIiBjeT0iMjI1IiByPSIxOSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI2NTAiIGN5PSIyMjUiIHI9IjYuMDgiIGZpbGw9IiM3ZjFkMWQiLz4KICAgICAgPHJlY3QgeD0iNjI0IiB5PSIyMjAiIHdpZHRoPSI3IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjY2OSIgeT0iMjIwIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8dGV4dCB4PSI2NTAiIHk9IjI1OSIgZm9udC1zaXplPSIxMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5CQUYxPC90ZXh0PgogICAgPC9nPjxnPgogICAgICA8cmVjdCB4PSI3NzIiIHk9IjE5MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEzIiByeD0iMiIgZmlsbD0iIzQ3NTU2OSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNzgwIiB5MT0iMjAzIiB4Mj0iNzgwIiB5Mj0iMjA3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMi40Ii8+CiAgICAgIDxjaXJjbGUgY3g9Ijc4MCIgY3k9IjIyNSIgcj0iMTkiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyLjIiLz4KICAgICAgPGNpcmNsZSBjeD0iNzgwIiBjeT0iMjI1IiByPSI2LjA4IiBmaWxsPSIjN2YxZDFkIi8+CiAgICAgIDxyZWN0IHg9Ijc1NCIgeT0iMjIwIiB3aWR0aD0iNyIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8cmVjdCB4PSI3OTkiIHk9IjIyMCIgd2lkdGg9IjciIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHRleHQgeD0iNzgwIiB5PSIyNTkiIGZvbnQtc2l6ZT0iMTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+QkFGMjwvdGV4dD4KICAgIDwvZz48Zz4KICAgICAgPHJlY3QgeD0iOTAyIiB5PSIxOTAiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMyIgcng9IjIiIGZpbGw9IiM0NzU1NjkiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGxpbmUgeDE9IjkxMCIgeTE9IjIwMyIgeDI9IjkxMCIgeTI9IjIwNyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIuNCIvPgogICAgICA8Y2lyY2xlIGN4PSI5MTAiIGN5PSIyMjUiIHI9IjE5IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMi4yIi8+CiAgICAgIDxjaXJjbGUgY3g9IjkxMCIgY3k9IjIyNSIgcj0iNi4wOCIgZmlsbD0iIzdmMWQxZCIvPgogICAgICA8cmVjdCB4PSI4ODQiIHk9IjIyMCIgd2lkdGg9IjciIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iOTI5IiB5PSIyMjAiIHdpZHRoPSI3IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDx0ZXh0IHg9IjkxMCIgeT0iMjU5IiBmb250LXNpemU9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPkJBRjM8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjY1MCIgeTE9IjI0NCIgeDI9IjY1MCIgeTI9IjI4MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjkxMCIgeTE9IjI0NCIgeDI9IjkxMCIgeTI9IjI4MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjY1MCIgeTE9IjI4MCIgeDI9IjkxMCIgeTI9IjI4MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjcxNSIgeT0iMjYwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI3MjAiIGN5PSIyNTYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjcxNCIgeTE9IjI1NiIgeDI9IjcyNiIgeTI9IjI1NiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNzIwIiB5MT0iMjUwIiB4Mj0iNzIwIiB5Mj0iMjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjcwOSIgeT0iMjcyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI3MDMiIHk9IjI3NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iNzMxIiB5PSIyNzUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjcyMCIgeT0iMjQ1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjY8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxyZWN0IHg9Ijg0NSIgeT0iMjYwIiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI4NTAiIGN5PSIyNTYiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9Ijg0NCIgeTE9IjI1NiIgeDI9Ijg1NiIgeTI9IjI1NiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iODUwIiB5MT0iMjUwIiB4Mj0iODUwIiB5Mj0iMjYyIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjgzOSIgeT0iMjcyLjg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI4MzMiIHk9IjI3NSIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iODYxIiB5PSIyNzUiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9Ijg1MCIgeT0iMjQ1IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjc8L3RleHQ+CiAgICA8L2c+PGxpbmUgeDE9IjY1MCIgeTE9IjI4MCIgeDI9IjY1MCIgeTI9IjU2MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjkxMCIgeTE9IjI4MCIgeDI9IjkxMCIgeTI9IjU2MCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGc+CiAgICAgIDxyZWN0IHg9IjY0NSIgeT0iNTQ1IiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI2NTAiIGN5PSI1NDEiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjY0NCIgeTE9IjU0MSIgeDI9IjY1NiIgeTI9IjU0MSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iNjUwIiB5MT0iNTM1IiB4Mj0iNjUwIiB5Mj0iNTQ3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9IjYzOSIgeT0iNTU3Ljg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI2MzMiIHk9IjU2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iNjYxIiB5PSI1NjAiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjY1MCIgeT0iNTMwIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjg8L3RleHQ+CiAgICA8L2c+PGc+CiAgICAgIDxyZWN0IHg9IjkwNSIgeT0iNTQ1IiB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8Y2lyY2xlIGN4PSI5MTAiIGN5PSI1NDEiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPGxpbmUgeDE9IjkwNCIgeTE9IjU0MSIgeDI9IjkxNiIgeTI9IjU0MSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8bGluZSB4MT0iOTEwIiB5MT0iNTM1IiB4Mj0iOTEwIiB5Mj0iNTQ3IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxyZWN0IHg9Ijg5OSIgeT0iNTU3Ljg1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQuMyIgcng9IjMuNSIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8cmVjdCB4PSI4OTMiIHk9IjU2MCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHJlY3QgeD0iOTIxIiB5PSI1NjAiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDx0ZXh0IHg9IjkxMCIgeT0iNTMwIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWUyOTNiIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiPlYtMjk8L3RleHQ+CiAgICA8L2c+PGc+PHJlY3QgeD0iNjE1LjYiIHk9IjY1MS4wIiB3aWR0aD0iNy44IiBoZWlnaHQ9IjEyLjAiIGZpbGw9IiM2NDc0OGIiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8cmVjdCB4PSI3MDYuNiIgeT0iNjUxLjAiIHdpZHRoPSI3LjgiIGhlaWdodD0iMTIuMCIgZmlsbD0iIzY0NzQ4YiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEiLz48cmVjdCB4PSI2MTAuNCIgeT0iNjIxLjAiIHdpZHRoPSIxMDkuMiIgaGVpZ2h0PSIzMC4wIiByeD0iMTUuMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgPGVsbGlwc2UgY3g9IjYxMC40IiBjeT0iNjM2LjAiIHJ4PSI2LjYiIHJ5PSIxNS4wIiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICA8ZWxsaXBzZSBjeD0iNzE5LjYiIGN5PSI2MzYuMCIgcng9IjYuNiIgcnk9IjE1LjAiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgIDxsaW5lIHgxPSI2MTkuNSIgeTE9IjYyOS40IiB4Mj0iNzEwLjUiIHkyPSI2MjkuNCIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEuNiIvPjxyZWN0IHg9IjYwNy44IiB5PSI1ODkuNSIgd2lkdGg9IjQ0LjIiIGhlaWdodD0iMzAuMCIgcng9IjMiIGZpbGw9IiNlMGYyZmUiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjQiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI1OTIuNSIgeDI9IjY0OS4wIiB5Mj0iNTkyLjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI1OTYuNSIgeDI9IjY0OS4wIiB5Mj0iNTk2LjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI2MDAuNSIgeDI9IjY0OS4wIiB5Mj0iNjAwLjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI2MDQuNSIgeDI9IjY0OS4wIiB5Mj0iNjA0LjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI2MDguNSIgeDI9IjY0OS4wIiB5Mj0iNjA4LjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI2MTIuNSIgeDI9IjY0OS4wIiB5Mj0iNjEyLjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48bGluZSB4MT0iNjEwLjgiIHkxPSI2MTYuNSIgeDI9IjY0OS4wIiB5Mj0iNjE2LjUiIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIwLjkiLz48cmVjdCB4PSI2NzUuNCIgeT0iNTg5LjUiIHdpZHRoPSI0Ni44IiBoZWlnaHQ9IjMxLjUiIHJ4PSIzIiBmaWxsPSIjMzM0MTU1IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgICA8cmVjdCB4PSI2ODEuOTUyIiB5PSI1OTQuNTQiIHdpZHRoPSIzMy42OTYiIGhlaWdodD0iMTMuMjI5OTk5OTk5OTk5OTk5IiByeD0iMiIgZmlsbD0iIzM4YmRmOCIvPgogICAgPGNpcmNsZSBjeD0iNjg4LjUwNCIgY3k9IjYxMy4xMjUiIHI9IjMuMTUwMDAwMDAwMDAwMDAwNCIgZmlsbD0iIzIyYzU1ZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjAuOCIvPgogICAgPGNpcmNsZSBjeD0iNzAyLjU0NCIgY3k9IjYxMy4xMjUiIHI9IjMuMTUwMDAwMDAwMDAwMDAwNCIgZmlsbD0iI2VmNDQ0NCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjAuOCIvPgogICAgICA8dGV4dCB4PSI2NjUiIHk9IjY3OS41IiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjMGYxNzJhIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPkNISUxMRVIgMTwvdGV4dD4KICAgIDwvZz48Zz48cmVjdCB4PSI4NjUuNiIgeT0iNjUxLjAiIHdpZHRoPSI3LjgiIGhlaWdodD0iMTIuMCIgZmlsbD0iIzY0NzQ4YiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxyZWN0IHg9Ijk1Ni42IiB5PSI2NTEuMCIgd2lkdGg9IjcuOCIgaGVpZ2h0PSIxMi4wIiBmaWxsPSIjNjQ3NDhiIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMSIvPjxyZWN0IHg9Ijg2MC40IiB5PSI2MjEuMCIgd2lkdGg9IjEwOS4yIiBoZWlnaHQ9IjMwLjAiIHJ4PSIxNS4wIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICA8ZWxsaXBzZSBjeD0iODYwLjQiIGN5PSI2MzYuMCIgcng9IjYuNiIgcnk9IjE1LjAiIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgIDxlbGxpcHNlIGN4PSI5NjkuNiIgY3k9IjYzNi4wIiByeD0iNi42IiByeT0iMTUuMCIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgPGxpbmUgeDE9Ijg2OS41IiB5MT0iNjI5LjQiIHgyPSI5NjAuNSIgeTI9IjYyOS40IiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS13aWR0aD0iMS42Ii8+PHJlY3QgeD0iODU3LjgiIHk9IjU4OS41IiB3aWR0aD0iNDQuMiIgaGVpZ2h0PSIzMC4wIiByeD0iMyIgZmlsbD0iI2UwZjJmZSIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuNCIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjU5Mi41IiB4Mj0iODk5LjAiIHkyPSI1OTIuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjU5Ni41IiB4Mj0iODk5LjAiIHkyPSI1OTYuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjYwMC41IiB4Mj0iODk5LjAiIHkyPSI2MDAuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjYwNC41IiB4Mj0iODk5LjAiIHkyPSI2MDQuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjYwOC41IiB4Mj0iODk5LjAiIHkyPSI2MDguNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjYxMi41IiB4Mj0iODk5LjAiIHkyPSI2MTIuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxsaW5lIHgxPSI4NjAuOCIgeTE9IjYxNi41IiB4Mj0iODk5LjAiIHkyPSI2MTYuNSIgc3Ryb2tlPSIjMDM2OWExIiBzdHJva2Utd2lkdGg9IjAuOSIvPjxyZWN0IHg9IjkyNS40IiB5PSI1ODkuNSIgd2lkdGg9IjQ2LjgiIGhlaWdodD0iMzEuNSIgcng9IjMiIGZpbGw9IiMzMzQxNTUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICAgIDxyZWN0IHg9IjkzMS45NTIiIHk9IjU5NC41NCIgd2lkdGg9IjMzLjY5NiIgaGVpZ2h0PSIxMy4yMjk5OTk5OTk5OTk5OTkiIHJ4PSIyIiBmaWxsPSIjMzhiZGY4Ii8+CiAgICA8Y2lyY2xlIGN4PSI5MzguNTA0IiBjeT0iNjEzLjEyNSIgcj0iMy4xNTAwMDAwMDAwMDAwMDA0IiBmaWxsPSIjMjJjNTVlIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMC44Ii8+CiAgICA8Y2lyY2xlIGN4PSI5NTIuNTQ0IiBjeT0iNjEzLjEyNSIgcj0iMy4xNTAwMDAwMDAwMDAwMDA0IiBmaWxsPSIjZWY0NDQ0IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMC44Ii8+CiAgICAgIDx0ZXh0IHg9IjkxNSIgeT0iNjc5LjUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMwZjE3MmEiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+Q0hJTExFUiAyPC90ZXh0PgogICAgPC9nPjxsaW5lIHgxPSI2MDAiIHkxPSI2MDUiIHgyPSI1NzMiIHkyPSI2MDUiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIzLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44NSIvPjxnPgogICAgICA8cmVjdCB4PSI1NjUiIHk9IjU4NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjciIGZpbGw9IiM5NGEzYjgiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPGNpcmNsZSBjeD0iNTcwIiBjeT0iNTgxIiByPSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxsaW5lIHgxPSI1NjQiIHkxPSI1ODEiIHgyPSI1NzYiIHkyPSI1ODEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPGxpbmUgeDE9IjU3MCIgeTE9IjU3NSIgeDI9IjU3MCIgeTI9IjU4NyIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPgogICAgICA8cmVjdCB4PSI1NTkiIHk9IjU5Ny44NSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjE0LjMiIHJ4PSIzLjUiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz4KICAgICAgPHJlY3QgeD0iNTUzIiB5PSI2MDAiIHdpZHRoPSI2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjY2JkNWUxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxyZWN0IHg9IjU4MSIgeT0iNjAwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8dGV4dCB4PSI1NzAiIHk9IjU3MCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMjkzYiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIj5WLTMwPC90ZXh0PgogICAgPC9nPjxwb2x5Z29uIHBvaW50cz0iNTc4LjAsNjA1LjAgNTg5LjAsNjAwLjUgNTg5LjAsNjA5LjUiIGZpbGw9IiNkYzI2MjYiLz48bGluZSB4MT0iOTgwIiB5MT0iNjA1IiB4Mj0iOTUzIiB5Mj0iNjA1IiBzdHJva2U9IiNkYzI2MjYiIHN0cm9rZS13aWR0aD0iMy42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuODUiLz48Zz4KICAgICAgPHJlY3QgeD0iOTQ1IiB5PSI1ODUiIHdpZHRoPSIxMCIgaGVpZ2h0PSI3IiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICAgIDxjaXJjbGUgY3g9Ijk1MCIgY3k9IjU4MSIgcj0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuOCIvPgogICAgICA8bGluZSB4MT0iOTQ0IiB5MT0iNTgxIiB4Mj0iOTU2IiB5Mj0iNTgxIiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS40Ii8+CiAgICAgIDxsaW5lIHgxPSI5NTAiIHkxPSI1NzUiIHgyPSI5NTAiIHkyPSI1ODciIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgPHJlY3QgeD0iOTM5IiB5PSI1OTcuODUiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNC4zIiByeD0iMy41IiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwZjE3MmEiIHN0cm9rZS13aWR0aD0iMS44Ii8+CiAgICAgIDxyZWN0IHg9IjkzMyIgeT0iNjAwIiB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogICAgICA8cmVjdCB4PSI5NjEiIHk9IjYwMCIgd2lkdGg9IjYiIGhlaWdodD0iMTAiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgICAgPHRleHQgeD0iOTUwIiB5PSI1NzAiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxZTI5M2IiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCI+Vi0zMTwvdGV4dD4KICAgIDwvZz48cG9seWdvbiBwb2ludHM9Ijk1OC4wLDYwNS4wIDk2OS4wLDYwMC41IDk2OS4wLDYwOS41IiBmaWxsPSIjZGMyNjI2Ii8+PGxpbmUgeDE9Ijk1MCIgeTE9IjU5NiIgeDI9Ijk1MCIgeTI9IjcwMCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PGxpbmUgeDE9IjU2MCIgeTE9IjcwMCIgeDI9Ijk1MCIgeTI9IjcwMCIgc3Ryb2tlPSIjMjU2M2ViIiBzdHJva2Utd2lkdGg9IjMuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjg1Ii8+PHBvbHlnb24gcG9pbnRzPSI3NDMuMCw3MDAuMCA3NTQuMCw2OTUuNSA3NTQuMCw3MDQuNSIgZmlsbD0iIzI1NjNlYiIvPjxsaW5lIHgxPSIwIiB5MT0iNzUwIiB4Mj0iMTAwMCIgeTI9Ijc1MCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWRhc2hhcnJheT0iNCw0Ii8+PC9zdmc+",
    "componentes": [
      {
        "codigo": "V-40",
        "nombre": "Válvula reposición 0-16",
        "tipo": "Válvula",
        "x": 36.0,
        "y": 7.6
      },
      {
        "codigo": "V-41",
        "nombre": "Válvula reposición 0-16",
        "tipo": "Válvula",
        "x": 47.0,
        "y": 7.6
      },
      {
        "codigo": "V-38",
        "nombre": "Entrada del tanque Reposición",
        "tipo": "Válvula",
        "x": 15.0,
        "y": 18.8
      },
      {
        "codigo": "V-39",
        "nombre": "Salida del tanque Reposición",
        "tipo": "Válvula",
        "x": 20.0,
        "y": 18.8
      },
      {
        "codigo": "V-34",
        "nombre": "Válvula succión bomba #4",
        "tipo": "Válvula",
        "x": 23.0,
        "y": 25.9
      },
      {
        "codigo": "V-35",
        "nombre": "Válvula succión bomba #5",
        "tipo": "Válvula",
        "x": 30.0,
        "y": 25.9
      },
      {
        "codigo": "BAF4",
        "nombre": "Bomba de evaporación #4",
        "tipo": "Bomba",
        "x": 23.0,
        "y": 33.5
      },
      {
        "codigo": "BAF5",
        "nombre": "Bomba de evaporación #5",
        "tipo": "Bomba",
        "x": 30.0,
        "y": 33.5
      },
      {
        "codigo": "V-33",
        "nombre": "Válvula de Retorno al intercambiador Habitaciones",
        "tipo": "Válvula",
        "x": 40.0,
        "y": 19.4
      },
      {
        "codigo": "V-36",
        "nombre": "Válvula Salida intercambiador al chiller Primario",
        "tipo": "Válvula",
        "x": 50.0,
        "y": 19.4
      },
      {
        "codigo": "V-32",
        "nombre": "Válvula suministro intercambiador a las habitaciones",
        "tipo": "Válvula",
        "x": 40.0,
        "y": 48.8
      },
      {
        "codigo": "V-37",
        "nombre": "Válvula Entrada intercambiador Primario",
        "tipo": "Válvula",
        "x": 50.0,
        "y": 48.8
      },
      {
        "codigo": "INTERCAMBIADOR",
        "nombre": "Intercambiador de calor primario",
        "tipo": "Intercambiador",
        "x": 45.0,
        "y": 35.3
      },
      {
        "codigo": "V-42",
        "nombre": "Electroválvula",
        "tipo": "Válvula",
        "x": 56.0,
        "y": 25.9
      },
      {
        "codigo": "V-21",
        "nombre": "Válvula BYPASS",
        "tipo": "Válvula",
        "x": 72.0,
        "y": 10.6
      },
      {
        "codigo": "V-22",
        "nombre": "Válvula BYPASS",
        "tipo": "Válvula",
        "x": 85.0,
        "y": 10.6
      },
      {
        "codigo": "V-23",
        "nombre": "Válvula Succión Bomba #1",
        "tipo": "Válvula",
        "x": 65.0,
        "y": 18.8
      },
      {
        "codigo": "V-24",
        "nombre": "Válvula Succión Bomba #2",
        "tipo": "Válvula",
        "x": 78.0,
        "y": 18.8
      },
      {
        "codigo": "V-25",
        "nombre": "Válvula Succión Bomba #3",
        "tipo": "Válvula",
        "x": 91.0,
        "y": 18.8
      },
      {
        "codigo": "BAF1",
        "nombre": "Bomba de evaporación #1",
        "tipo": "Bomba",
        "x": 65.0,
        "y": 26.5
      },
      {
        "codigo": "BAF2",
        "nombre": "Bomba de evaporación #2",
        "tipo": "Bomba",
        "x": 78.0,
        "y": 26.5
      },
      {
        "codigo": "BAF3",
        "nombre": "Bomba de evaporación #3",
        "tipo": "Bomba",
        "x": 91.0,
        "y": 26.5
      },
      {
        "codigo": "V-26",
        "nombre": "Válvula BYPASS",
        "tipo": "Válvula",
        "x": 72.0,
        "y": 32.9
      },
      {
        "codigo": "V-27",
        "nombre": "Válvula BYPASS",
        "tipo": "Válvula",
        "x": 85.0,
        "y": 32.9
      },
      {
        "codigo": "V-28",
        "nombre": "Válvula de Entrada a Chiller #1",
        "tipo": "Válvula",
        "x": 65.0,
        "y": 66.5
      },
      {
        "codigo": "V-29",
        "nombre": "Válvula de Entrada a Chiller #2",
        "tipo": "Válvula",
        "x": 91.0,
        "y": 66.5
      },
      {
        "codigo": "V-30",
        "nombre": "Válvula de Salida a Chiller #1",
        "tipo": "Válvula",
        "x": 57.0,
        "y": 71.2
      },
      {
        "codigo": "V-31",
        "nombre": "Válvula de Salida a Chiller #2",
        "tipo": "Válvula",
        "x": 95.0,
        "y": 71.2
      },
      {
        "codigo": "CHILLER 1",
        "nombre": "Chiller #1 (evaporación)",
        "tipo": "Chiller",
        "x": 66.5,
        "y": 73.8
      },
      {
        "codigo": "CHILLER 2",
        "nombre": "Chiller #2 (evaporación)",
        "tipo": "Chiller",
        "x": 91.5,
        "y": 73.8
      }
    ],
    "createdBy": "Sistema",
    "createdAt": "2026-09-04T00:00:00.000Z"
  }
];