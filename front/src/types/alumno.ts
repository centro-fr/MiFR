// Ficha del alumno como la usa la interfaz. Sale de FichaAlumnoApi (features/alumnos/schemas).
// Cada campo corresponde a una columna del DER: los que admiten NULL llegan como null.

export type EstadoAlumno = "ACTIVO" | "INACTIVO" | "BAJA";

export type MotivoBaja = "ABANDONO" | "MUDANZA" | "SALUD" | "ECONOMICO" | "OTRO";

export interface ResponsableAlumno {
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
}

export interface FichaAlumno {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  /** Fecha calendario "AAAA-MM-DD". */
  fechaNacimiento: string;
  direccion: string | null;
  estado: EstadoAlumno;
  /** Timestamp ISO del alta del alumno. */
  fechaAlta: string;
  /** Timestamp ISO de la baja; null si no está de baja. */
  fechaBaja: string | null;
  contactoEmergencia: { nombre: string | null; telefono: string | null };
  aptoMedico: boolean;
  /** Fecha calendario "AAAA-MM-DD". */
  fechaAptoMedico: string | null;
  observaciones: string | null;
  /** Tutor a cargo; solo los menores tienen uno. */
  responsable: ResponsableAlumno | null;
}
