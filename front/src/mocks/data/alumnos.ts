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
];
