import type { ActividadApi } from "@/features/actividades/schemas/actividad";
import type { ProfesoraApi } from "@/features/horarios/schemas/horario";
import type { RoleCode } from "@/types/auth";
import { matrizInicial } from "@/mocks/data/catalogo-permisos";
import {
  ALUMNOS_SEMILLA,
  USUARIOS_PERSONAS_SEMILLA,
  type AlumnoMock,
  type UsuarioPersonaMock,
} from "@/mocks/data/alumnos";
import {
  PLAN_PRECIOS_SEMILLA,
  PLANES_SEMILLA,
  inscripcionesSemilla,
  pagosSemilla,
  type InscripcionMock,
  type PagoMock,
  type PlanMock,
  type PlanPrecioMock,
} from "@/mocks/data/inscripciones";
import {
  ACTIVIDADES_SEMILLA,
  HORARIOS_SEMILLA,
  ID_USUARIO_SESION_INICIAL,
  PROFESORAS_SEMILLA,
  USUARIOS_SEMILLA,
  type HorarioSemilla,
  type UsuarioSemilla,
} from "@/mocks/data/semilla";

// La base guarda la profesora sin el usuario: el nombre se arma al responder.
export type ProfesoraMock = Omit<ProfesoraApi, "usuario">;

export interface HorarioMock extends HorarioSemilla {
  fecha_alta: string;
  fecha_baja: string | null;
}

export interface ClaseAsistenciaMock {
  id_clase: number;
  id_horario: number;
  fecha_clase: string;
  estado: "PROGRAMADA" | "DICTADA" | "CANCELADA";
  fecha_cierre_asist: string | null;
  observaciones: string | null;
}

export interface RegistroAsistenciaMock {
  id_clase: number;
  id_alumno: number;
  id_inscripcion: number;
  asistio: boolean;
  observaciones: string | null;
  id_usuario_registra: number | null;
  fecha_registro: string;
}

// Estado en memoria que comparten todos los handlers, como la base del back:
// así un horario nuevo ve las actividades y profesoras que ya existen.
interface BaseMock {
  usuarios: UsuarioSemilla[];
  actividades: ActividadApi[];
  profesoras: ProfesoraMock[];
  horarios: HorarioMock[];
  // Usuarios de alumnos y tutores con todas las columnas del DER. Van aparte de `usuarios`
  // porque esos son los de la sesión del staff y solo guardan lo que pide el login.
  usuariosPersonas: UsuarioPersonaMock[];
  alumnos: AlumnoMock[];
  planes: PlanMock[];
  planPrecios: PlanPrecioMock[];
  inscripciones: InscripcionMock[];
  pagos: PagoMock[];
  clases: ClaseAsistenciaMock[];
  asistencias: RegistroAsistenciaMock[];
  matriz: Record<RoleCode, string[]>;
  idUsuarioSesion: number | null;
}

// La base vive en memoria y se reinicia al recargar, pero el token de sesión no: sin esto,
// recargar estando como alumno devolvería la sesión a la propietaria.
const CLAVE_USUARIO_MOCK = "mifr:mock-usuario-sesion";

export const db: BaseMock = {
  usuarios: structuredClone(USUARIOS_SEMILLA),
  actividades: structuredClone(ACTIVIDADES_SEMILLA),
  profesoras: structuredClone(PROFESORAS_SEMILLA),
  horarios: HORARIOS_SEMILLA.map((horario) => ({
    ...horario,
    fecha_alta: "2026-01-01T00:00:00.000Z",
    fecha_baja: null,
  })),
  usuariosPersonas: structuredClone(USUARIOS_PERSONAS_SEMILLA),
  alumnos: structuredClone(ALUMNOS_SEMILLA),
  planes: structuredClone(PLANES_SEMILLA),
  planPrecios: structuredClone(PLAN_PRECIOS_SEMILLA),
  inscripciones: inscripcionesSemilla(),
  pagos: pagosSemilla(),
  clases: [],
  asistencias: [],
  matriz: matrizInicial(),
  // Sesión iniciada por defecto: entrar directo a /app/* funciona sin pasar por el login.
  idUsuarioSesion: leerUsuarioGuardado() ?? ID_USUARIO_SESION_INICIAL,
};

function leerUsuarioGuardado(): number | null {
  try {
    const guardado = Number(window.sessionStorage.getItem(CLAVE_USUARIO_MOCK));
    return Number.isInteger(guardado) && guardado > 0 ? guardado : null;
  } catch {
    return null;
  }
}

export function abrirSesionMock(idUsuario: number): void {
  db.idUsuarioSesion = idUsuario;
  try {
    window.sessionStorage.setItem(CLAVE_USUARIO_MOCK, String(idUsuario));
  } catch {
    // Sin almacenamiento: la sesión mock vive solo hasta la próxima recarga.
  }
}

export function cerrarSesionMock(): void {
  db.idUsuarioSesion = null;
  try {
    window.sessionStorage.removeItem(CLAVE_USUARIO_MOCK);
  } catch {
    // Sin almacenamiento: nada que limpiar.
  }
}

export function siguienteId(ids: number[]): number {
  return Math.max(0, ...ids) + 1;
}
