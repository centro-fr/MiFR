import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../app.js";
import { construirSistema, type PiezasDeInfraestructura } from "../../composicion.js";
import type { CierreMensualHonorariosService } from "../../modules/gestion-honorarios/cierre-mensual-honorarios/cierre-mensual-honorarios.service.js";
import type { CierreMensualInsigniasService } from "../../modules/gestion-insignias/cierre-mensual-insignias/cierre-mensual-insignias.service.js";
import type { AplicadorProgramadosService } from "../../modules/gestion-inscripciones-y-clases/aplicador-programados/aplicador-programados.service.js";
import type { CierreAsistenciaService } from "../../modules/gestion-inscripciones-y-clases/cierre-asistencia/cierre-asistencia.service.js";
import type { IInfoInscripciones } from "../../modules/gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoClases } from "../../modules/gestion-inscripciones-y-clases/clase/interface/i-info-clases.js";
import type { PlanificadorNotificacionesService } from "../../modules/gestion-notificaciones/planificador-notificaciones/planificador-notificaciones.service.js";
import type { IAutenticacionGoogleAuth } from "../../modules/gestion-usuarios/sesion/interface/i-autenticacion-google-auth.js";
import { JwtService } from "../../modules/gestion-usuarios/sesion/jwt.service.js";
import { crearPrismaDePrueba } from "./base-de-prueba.js";

export const SECRETO_JWT_DE_PRUEBA = "secreto-de-los-tests-de-integracion";

// Google es la única frontera externa que se reemplaza: el id_token que manda el test es el
// email de la cuenta. Después de un "|" puede traer la foto de perfil, como la manda Google.
// Todo lo demás (servicios, repositorios, base, JWT) es lo de producción.
const googleSimulado: IAutenticacionGoogleAuth = {
  verificarToken: async (idToken: string) => {
    const [email, fotoUrl] = idToken.split("|");
    return { googleId: `google-${email}`, email, fotoUrl };
  },
};

export interface EntornoDeIntegracion {
  app: Express;
  prisma: PrismaClient;
  // El alta definitiva sin pasar por un cobro, para los tests que solo necesitan una inscripción activa.
  infoInscripciones: IInfoInscripciones;
  infoClases: IInfoClases;
  // El cierre automático de la asistencia (US-21), para correrlo con la hora que pide cada caso.
  cierreAsistencia: CierreAsistenciaService;
  // Los avisos de cuota (US-25), para generarlos con el día que pide cada caso.
  planificadorNotificaciones: PlanificadorNotificacionesService;
  // El cierre mensual de insignias (US-31), para correrlo con el día que pide cada caso.
  cierreMensualInsignias: CierreMensualInsigniasService;
  // El cierre mensual de honorarios (US-23), para correrlo con el día que pide cada caso.
  cierreMensualHonorarios: CierreMensualHonorariosService;
  // Los cambios de plan y las salidas de horario programados (US-14, US-04), con el día que pide cada caso.
  aplicadorProgramados: AplicadorProgramadosService;
  iniciarSesion(email: string): Promise<string>;
  cerrar(): Promise<void>;
}

// push: el servicio de push simulado de los casos que lo prueban; los demás corren sin push, como en desarrollo.
export function crearEntornoDeIntegracion(push?: PiezasDeInfraestructura["push"]): EntornoDeIntegracion {
  const prisma = crearPrismaDePrueba();
  const {
    dependencias,
    infoInscripciones,
    infoClases,
    cierreAsistencia,
    planificadorNotificaciones,
    cierreMensualInsignias,
    cierreMensualHonorarios,
    aplicadorProgramados,
  } = construirSistema({
    prisma,
    googleAuth: googleSimulado,
    jwtService: new JwtService(SECRETO_JWT_DE_PRUEBA, "1h"),
    push,
  });
  const app = createApp(dependencias);

  // La sesión se abre por el endpoint real de login, así el token es el mismo que recibe el front.
  async function iniciarSesion(email: string): Promise<string> {
    const respuesta = await request(app).post("/api/v1/auth/google").send({ id_token: email });
    if (respuesta.status !== 200) {
      throw new Error(
        `No se pudo iniciar sesión con ${email}: ${respuesta.status} ${JSON.stringify(respuesta.body)}`,
      );
    }
    return respuesta.body.token as string;
  }

  return {
    app,
    prisma,
    infoInscripciones,
    infoClases,
    cierreAsistencia,
    planificadorNotificaciones,
    cierreMensualInsignias,
    cierreMensualHonorarios,
    aplicadorProgramados,
    iniciarSesion,
    cerrar: () => prisma.$disconnect(),
  };
}
