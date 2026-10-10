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
  matriz: Record<RoleCode, string[]>;
  idUsuarioSesion: number | null;
}

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
  matriz: matrizInicial(),
  // Sesión iniciada por defecto: entrar directo a /app/* funciona sin pasar por el login.
  idUsuarioSesion: ID_USUARIO_SESION_INICIAL,
};

export function siguienteId(ids: number[]): number {
  return Math.max(0, ...ids) + 1;
}
