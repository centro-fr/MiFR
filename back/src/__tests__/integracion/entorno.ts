import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../app.js";
import { construirDependencias } from "../../composicion.js";
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
  iniciarSesion(email: string): Promise<string>;
  cerrar(): Promise<void>;
}

export function crearEntornoDeIntegracion(): EntornoDeIntegracion {
  const prisma = crearPrismaDePrueba();
  const app = createApp(
    construirDependencias({
      prisma,
      googleAuth: googleSimulado,
      jwtService: new JwtService(SECRETO_JWT_DE_PRUEBA, "1h"),
    }),
  );

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

  return { app, prisma, iniciarSesion, cerrar: () => prisma.$disconnect() };
}
