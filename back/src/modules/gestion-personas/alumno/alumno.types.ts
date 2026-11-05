import type { alumnos, estado_alumno, usuarios } from "@prisma/client";

export type EstadoAlumno = estado_alumno;
// El estado con el que vuelve un alumno dado de baja: ACTIVO si ya pagó alguna vez, INACTIVO si no.
export type EstadoAlReactivar = Exclude<EstadoAlumno, "BAJA">;

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

// US-28: un alumno que puede consultar quien inició sesión. propio dice si es el suyo o el de un menor a cargo.
export interface AlumnoConsultable {
  id_alumno: number;
  nombre: string;
  apellido: string;
  estado: EstadoAlumno;
  propio: boolean;
}

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

export interface FiltroAltasPorMes {
  inicio: Date;
  fin: Date;
  id_plan?: number;
  id_profesora?: number;
}

export interface ConteoAltasMes {
  anio: number;
  mes: number;
  total: number;
}

// US-35: los alumnos activos en un instante, con los mismos filtros que las altas.
export interface FiltroActivosAl {
  instante: Date;
  id_plan?: number;
  id_profesora?: number;
}

// US-35: cuánto llevaban en el centro los alumnos que se dieron de baja en un período.
export interface PermanenciaDeBajas {
  cantidad: number;
  promedio_dias: number | null;
  hasta_90_dias: number;
}
