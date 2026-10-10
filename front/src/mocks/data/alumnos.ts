// Copia de ALUMNOS_DEMO (back/src/shared/db/datos-demo.ts), para que la ficha muestre lo mismo
// con mocks que contra un back sembrado. Cada interfaz copia una tabla del DER; lo que la semilla
// no carga (teléfonos, apto médico, contacto de emergencia) queda en NULL o false, como en la base.
// Los ids dependen del orden de carga en la base real: acá son de ejemplo.

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
  {
    id_usuario: 101,
    nombre: "Sofía",
    apellido: "Medina",
    dni: "38111222",
    email: "sofia.medina@example.com",
    telefono: null,
    fecha_nacimiento: "1996-08-14T00:00:00.000Z",
    direccion: null,
    estado: "INACTIVO",
  },
  // Menor a cargo de su tutora: sin email, como pide el back para los menores.
  {
    id_usuario: 102,
    nombre: "Mateo",
    apellido: "Romero",
    dni: "52111222",
    email: null,
    telefono: null,
    fecha_nacimiento: "2015-11-03T00:00:00.000Z",
    direccion: null,
    estado: "INACTIVO",
  },
  {
    id_usuario: 103,
    nombre: "Paula",
    apellido: "Romero",
    dni: "31222333",
    email: "paula.romero@example.com",
    telefono: null,
    fecha_nacimiento: "1984-06-21T00:00:00.000Z",
    direccion: null,
    estado: "INACTIVO",
  },
  {
    id_usuario: 104,
    nombre: "Valentina",
    apellido: "Herrera",
    dni: "39222333",
    email: "valentina.herrera@example.com",
    telefono: null,
    fecha_nacimiento: "1994-02-11T00:00:00.000Z",
    direccion: null,
    estado: "ACTIVO",
  },
];

function alumnoDemo(id_alumno: number, id_usuario: number, activo: boolean, id_usuario_responsable: number | null = null): AlumnoMock {
  return {
    id_alumno,
    id_usuario,
    id_usuario_responsable,
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    apto_medico: false,
    fecha_apto_medico: null,
    observaciones: null,
    // Un pre-inscripto queda INACTIVO hasta el primer pago (US-05, US-07).
    estado: activo ? "ACTIVO" : "INACTIVO",
    fecha_alta: FECHA_ALTA,
    fecha_baja: null,
  };
}

export const ALUMNOS_SEMILLA: AlumnoMock[] = [
  alumnoDemo(1, 101, false),
  alumnoDemo(2, 102, false, 103),
  alumnoDemo(3, 104, true),
];
