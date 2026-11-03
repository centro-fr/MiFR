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
import { tarifasSemilla, type LiquidacionDetalleMock, type LiquidacionMock, type TarifaHonorarioMock } from "@/mocks/data/honorarios";
import { liquidarPeriodo } from "@/mocks/calculo-honorarios";
import type { NotificacionMock } from "@/mocks/data/notificaciones";
import { parametrosSemilla, type ParametroMock } from "@/mocks/data/parametros";
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
  // US-23: tarifas, liquidaciones y sus detalles (tablas tarifas_honorario, liquidaciones y
  // liquidacion_detalles del DER). Se calculan sobre los datos fijos de data/honorarios.ts.
  tarifasHonorario: TarifaHonorarioMock[];
  liquidaciones: LiquidacionMock[];
  liquidacionDetalles: LiquidacionDetalleMock[];
  // parametros_sistema: lo que lee y modifica la configuración (US-25, US-26).
  parametros: ParametroMock[];
  // Avisos iniciales para poder probar la campana y la bandeja sin depender del reloj del mock.
  notificaciones: NotificacionMock[];
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
  tarifasHonorario: tarifasSemilla(),
  liquidaciones: [],
  liquidacionDetalles: [],
  parametros: parametrosSemilla(),
  notificaciones: [
    {
      id_notificacion: 1,
      id_usuario: 3,
      tipo: "RESUMEN_DIARIO",
      id_cuota: null,
      mensaje: "Resumen diario: 2 transferencias por confirmar ($55000).",
      fecha_generacion: new Date().toISOString(),
      leida: false,
    },
    {
      id_notificacion: 2,
      id_usuario: 3,
      tipo: "CUOTA_VENCIDA",
      id_cuota: 901,
      mensaje: "La cuota de Camila venció y requiere seguimiento.",
      fecha_generacion: new Date(Date.now() - 60_000).toISOString(),
      leida: false,
    },
    {
      id_notificacion: 3,
      id_usuario: 1,
      tipo: "CLASE_CANCELADA",
      id_cuota: null,
      mensaje: "La clase de prueba fue modificada. Revisá tu cronograma.",
      fecha_generacion: new Date().toISOString(),
      leida: false,
    },
    {
      id_notificacion: 4,
      id_usuario: 4,
      tipo: "CUOTA_POR_VENCER",
      id_cuota: 902,
      mensaje: "Tu cuota vence próximamente.",
      fecha_generacion: new Date().toISOString(),
      leida: false,
    },
    {
      id_notificacion: 5,
      id_usuario: 8,
      tipo: "CUOTA_POR_VENCER",
      id_cuota: 903,
      mensaje: "La cuota de Camila vence próximamente.",
      fecha_generacion: new Date().toISOString(),
      leida: false,
    },
  ],
  matriz: matrizInicial(),
  // Sesión iniciada por defecto: entrar directo a /app/* funciona sin pasar por el login.
  idUsuarioSesion: leerUsuarioGuardado() ?? ID_USUARIO_SESION_INICIAL,
};

// Octubre de 2026 (el mes de los datos copiados de la base) arranca calculado y en revisión; los
// otros meses se ven sin calcular, como en el back hasta que se pide POST /liquidaciones.
liquidarPeriodo(db, "2026-10", PROFESORAS_SEMILLA.map((profesora) => profesora.id_profesora));

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
