// Alumnos y tutores del mock. Cada interfaz copia una tabla del DER (usuarios, alumnos): los
// handlers arman con ellas las mismas respuestas que el back. Los ids son de ejemplo.

export interface UsuarioPersonaMock {
  id_usuario: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  direccion: string | null;
  estado: "ACTIVO" | "INACTIVO";
}

export interface AlumnoMock {
  id_alumno: number;
  id_usuario: number;
  id_usuario_responsable: number | null;
  cont_emerg_nombre: string | null;
  cont_emerg_telefono: string | null;
  apto_medico: boolean;
  fecha_apto_medico: string | null;
  observaciones: string | null;
  estado: "ACTIVO" | "INACTIVO" | "BAJA";
  fecha_alta: string;
  fecha_baja: string | null;
}

const FECHA_ALTA = "2026-01-01T00:00:00.000Z";

// Ids desde 101 para no chocar con los usuarios de semilla.ts (staff con sesión).
export const USUARIOS_PERSONAS_SEMILLA: UsuarioPersonaMock[] = [
  persona(101, "Sofía", "Medina", { dni: "38111222", email: "sofia.medina@example.com", telefono: "351 411-2233", fecha_nacimiento: "1996-08-14", direccion: "Av. Colón 1234" }),
  // Menor a cargo de su tutora: sin email, como pide el back para los menores.
  persona(102, "Mateo", "Romero", { dni: "52111222", fecha_nacimiento: "2015-11-03", direccion: "Bv. San Juan 543" }),
  persona(103, "Paula", "Romero", { dni: "31222333", email: "paula.romero@example.com", telefono: "351 555-6677", fecha_nacimiento: "1984-06-21" }),
  persona(104, "Valentina", "Herrera", { dni: "39222333", email: "valentina.herrera@example.com", telefono: "351 666-7788", fecha_nacimiento: "1998-03-25", direccion: "Ituzaingó 789" }, "ACTIVO"),
  persona(105, "Camila", "Pérez", { dni: "35123456", email: "camila.perez@example.com", telefono: "11 5555-0101", fecha_nacimiento: "1992-04-18", direccion: "Av. San Martín 123" }, "ACTIVO"),
  persona(106, "Micaela", "García", { dni: "32987654", email: "micaela.garcia@example.com", telefono: "11 5555-0401", fecha_nacimiento: "1990-01-15" }),

  // 5 Alumnos con Cuota Vencida
  persona(111, "Franco", "Navarro", { dni: "39456123", email: "franco.navarro@example.com", telefono: "11 4455-1201", fecha_nacimiento: "1998-05-15", direccion: "Belgrano 101" }, "ACTIVO"),
  persona(112, "Lucía", "Benítez", { dni: "41234567", email: "lucia.benitez@example.com", telefono: "11 4455-1202", fecha_nacimiento: "1999-07-20", direccion: "Mitre 202" }, "ACTIVO"),
  persona(113, "Martín", "Morales", { dni: "38789012", email: "martin.morales@example.com", telefono: "11 4455-1203", fecha_nacimiento: "1996-03-12", direccion: "Rivadavia 303" }, "ACTIVO"),
  persona(114, "Rocío", "Castro", { dni: "40567890", email: "rocio.castro@example.com", telefono: "11 4455-1204", fecha_nacimiento: "1997-11-05", direccion: "Sarmiento 404" }, "ACTIVO"),
  persona(115, "Emiliano", "Sosa", { dni: "42345678", email: "emiliano.sosa@example.com", telefono: "11 4455-1205", fecha_nacimiento: "2000-09-18", direccion: "Urquiza 505" }, "ACTIVO"),

  // 5 Alumnos con Cuota Por Vencer
  persona(116, "Tomás", "Herrera", { dni: "37890123", email: "tomas.herrera@example.com", telefono: "11 4455-1206", fecha_nacimiento: "1995-02-28", direccion: "Lavalle 606" }, "ACTIVO"),
  persona(117, "Julieta", "Domínguez", { dni: "43123456", email: "julieta.dominguez@example.com", telefono: "11 4455-1207", fecha_nacimiento: "2001-04-14", direccion: "Moreno 707" }, "ACTIVO"),
  persona(118, "Agustín", "Giménez", { dni: "39901234", email: "agustin.gimenez@example.com", telefono: "11 4455-1208", fecha_nacimiento: "1998-10-30", direccion: "Alberdi 808" }, "ACTIVO"),
  persona(119, "Florencia", "Ortiz", { dni: "41678901", email: "florencia.ortiz@example.com", telefono: "11 4455-1209", fecha_nacimiento: "1999-12-08", direccion: "Castelli 909" }, "ACTIVO"),
  persona(120, "Lucas", "Romero", { dni: "40234567", email: "lucas.romero@example.com", telefono: "11 4455-1210", fecha_nacimiento: "1997-06-22", direccion: "Paso 1010" }, "ACTIVO"),

  // 5 Alumnos con Cuota Al Día
  persona(121, "Santiago", "Medina", { dni: "38456789", email: "santiago.medina@example.com", telefono: "11 4455-1211", fecha_nacimiento: "1996-01-19", direccion: "Güemes 1111" }, "ACTIVO"),
  persona(122, "Micaela", "Ríos", { dni: "42789012", email: "micaela.rios@example.com", telefono: "11 4455-1212", fecha_nacimiento: "2000-08-03", direccion: "Laprida 1212" }, "ACTIVO"),
  persona(123, "Nicolás", "Vega", { dni: "40123789", email: "nicolas.vega@example.com", telefono: "11 4455-1213", fecha_nacimiento: "1997-05-25", direccion: "Gorriti 1313" }, "ACTIVO"),
  persona(124, "Daiana", "Silva", { dni: "39345678", email: "daiana.silva@example.com", telefono: "11 4455-1214", fecha_nacimiento: "1998-09-11", direccion: "Arenales 1414" }, "ACTIVO"),
  persona(125, "Gonzalo", "Fernández", { dni: "41890123", email: "gonzalo.fernandez@example.com", telefono: "11 4455-1215", fecha_nacimiento: "1999-03-07", direccion: "Juncal 1515" }, "ACTIVO"),
];

type DatosPersona = Partial<Omit<UsuarioPersonaMock, "id_usuario" | "nombre" | "apellido" | "estado">> & { fecha_nacimiento: string };

// Un pre-inscripto o un alumno de baja quedan INACTIVO: no entran al sistema.
function persona(id_usuario: number, nombre: string, apellido: string, datos: DatosPersona, estado: UsuarioPersonaMock["estado"] = "INACTIVO"): UsuarioPersonaMock {
  return {
    id_usuario,
    nombre,
    apellido,
    dni: null,
    email: null,
    telefono: null,
    direccion: null,
    ...datos,
    // DATE viaja como medianoche UTC, como lo serializa el back.
    fecha_nacimiento: `${datos.fecha_nacimiento}T00:00:00.000Z`,
    estado,
  };
}

type DatosAlumno = Partial<Omit<AlumnoMock, "id_alumno" | "id_usuario">>;

function alumno(id_alumno: number, id_usuario: number, datos: DatosAlumno = {}): AlumnoMock {
  return {
    id_alumno,
    id_usuario,
    id_usuario_responsable: null,
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    apto_medico: false,
    fecha_apto_medico: null,
    observaciones: null,
    // Un pre-inscripto queda INACTIVO hasta el primer pago (US-05, US-07).
    estado: "INACTIVO",
    fecha_alta: FECHA_ALTA,
    fecha_baja: null,
    ...datos,
  };
}

export const ALUMNOS_SEMILLA: AlumnoMock[] = [
  alumno(1, 101, {
    apto_medico: true,
    fecha_apto_medico: "2026-01-10T00:00:00.000Z",
    cont_emerg_nombre: "Laura Medina",
    cont_emerg_telefono: "351 499-8877",
  }),
  alumno(2, 102, {
    id_usuario_responsable: 103,
    apto_medico: true,
    fecha_apto_medico: "2026-02-01T00:00:00.000Z",
    cont_emerg_nombre: "Paula Romero",
    cont_emerg_telefono: "351 555-6677",
    observaciones: "Asiste por la tarde.",
  }),
  alumno(3, 104, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-05T00:00:00.000Z" }),
  alumno(4, 105, {
    estado: "ACTIVO",
    apto_medico: true,
    fecha_apto_medico: "2026-05-12T00:00:00.000Z",
    cont_emerg_nombre: "Sofía Pérez",
    cont_emerg_telefono: "11 5555-0102",
    observaciones: "Prefiere clases por la tarde.",
    fecha_alta: "2025-02-10T12:00:00.000Z",
  }),
  alumno(5, 106, {
    estado: "BAJA",
    apto_medico: true,
    fecha_apto_medico: "2025-07-10T00:00:00.000Z",
    cont_emerg_nombre: "Paula García",
    cont_emerg_telefono: "11 5555-0402",
    fecha_alta: "2024-06-01T12:00:00.000Z",
    fecha_baja: "2026-09-01T12:00:00.000Z",
  }),

  // 5 Alumnos con Cuota Vencida
  alumno(11, 111, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(12, 112, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(13, 113, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(14, 114, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(15, 115, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),

  // 5 Alumnos con Cuota Por Vencer
  alumno(16, 116, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(17, 117, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(18, 118, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(19, 119, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(20, 120, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),

  // 5 Alumnos con Cuota Al Día
  alumno(21, 121, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(22, 122, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(23, 123, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(24, 124, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
  alumno(25, 125, { estado: "ACTIVO", apto_medico: true, fecha_apto_medico: "2026-01-01T00:00:00.000Z" }),
];
