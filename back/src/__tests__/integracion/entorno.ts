import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../app.js";
import { construirSistema } from "../../composicion.js";
import type { CierreAsistenciaService } from "../../modules/gestion-inscripciones-y-clases/cierre-asistencia/cierre-asistencia.service.js";
import type { IInfoInscripciones } from "../../modules/gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoClases } from "../../modules/gestion-inscripciones-y-clases/clase/interface/i-info-clases.js";
import type { IAutenticacionGoogleAuth } from "../../modules/gestion-usuarios/sesion/interface/i-autenticacion-google-auth.js";
import { JwtService } from "../../modules/gestion-usuarios/sesion/jwt.service.js";
import { crearPrismaDePrueba } from "./base-de-prueba.js";

export const SECRETO_JWT_DE_PRUEBA = "secreto-de-los-tests-de-integracion";

// Google es la única frontera externa que se reemplaza: el id_token que manda el test es el
// email de la cuenta. Todo lo demás (servicios, repositorios, base, JWT) es lo de producción.
const googleSimulado: IAutenticacionGoogleAuth = {
  verificarToken: async (idToken: string) => ({ googleId: `google-${idToken}`, email: idToken }),
};

export interface EntornoDeIntegracion {
  app: Express;
  prisma: PrismaClient;
  // El alta definitiva sin pasar por un cobro, para los tests que solo necesitan una inscripción activa.
  infoInscripciones: IInfoInscripciones;
  infoClases: IInfoClases;
  // El cierre automático de la asistencia (US-21), para correrlo con la hora que pide cada caso.
  cierreAsistencia: CierreAsistenciaService;
  iniciarSesion(email: string): Promise<string>;
  cerrar(): Promise<void>;
}

export function crearEntornoDeIntegracion(): EntornoDeIntegracion {
  const prisma = crearPrismaDePrueba();
  const { dependencias, infoInscripciones, infoClases, cierreAsistencia } = construirSistema({
    prisma,
    googleAuth: googleSimulado,
    jwtService: new JwtService(SECRETO_JWT_DE_PRUEBA, "1h"),
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
    iniciarSesion,
    cerrar: () => prisma.$disconnect(),
  };
}
