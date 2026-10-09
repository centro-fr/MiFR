import type { alumnos, estado_alumno, usuarios } from "@prisma/client";

export type EstadoAlumno = estado_alumno;

// Los datos personales viven en usuarios (DER: alumnos.id_usuario). Se traen con el alumno y
// con su tutor, sin google_id ni fechas de auditoría, que el cliente no necesita.
export type DatosPersonales = Pick<
  usuarios,
  | "id_usuario"
  | "nombre"
  | "apellido"
  | "dni"
  | "email"
  | "telefono"
  | "fecha_nacimiento"
  | "direccion"
  | "estado"
>;

export type Alumno = alumnos & {
  usuario: DatosPersonales;
  responsable: DatosPersonales | null;
};

export interface FiltroAlumno {
  busqueda?: string;
  dni?: string;
  estado?: EstadoAlumno;
  incluirBajas?: boolean;
  // Restringe el listado a esos alumnos: los que salen de los filtros por inscripción (US-10).
  ids?: number[];
  limit: number;
  offset: number;
}

export interface PaginaAlumnos {
  datos: Alumno[];
  total: number;
  limit: number;
  offset: number;
}

// Datos para dar de alta al tutor como usuario, o el usuario que ya existía y se reutiliza.
export type TutorResuelto = { id_usuario: number } | { nuevo: DatosTutorNuevo };

export interface DatosTutorNuevo {
  nombre: string;
  apellido: string;
  dni?: string;
  telefono: string;
  email: string;
  fecha_nacimiento: Date;
}
