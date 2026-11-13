import { leerOrigenesPermitidos } from "./origenes-permitidos.js";

export interface Configuracion {
  esProduccion: boolean;
  googleClientId: string | undefined;
  jwtSecret: string;
  jwtExpiresIn: string;
  origenesPermitidos: string[] | undefined;
  loginDesarrollo: boolean;
  host: string;
  port: number;
}

export type ResultadoConfiguracion =
  { valida: true; configuracion: Configuracion } | { valida: false; errores: string[] };

// Con un secreto corto se pueden adivinar firmas por fuerza bruta y emitir sesiones a nombre de cualquiera.
const LARGO_MINIMO_JWT_SECRET = 32;

// Lee y valida el entorno de una vez, al arrancar: una variable de seguridad que falta tiene que impedir
// que la API levante, no aparecer después como un login que falla o, peor, que acepta de más.
export function leerConfiguracion(env: NodeJS.ProcessEnv): ResultadoConfiguracion {
  const esProduccion = env.NODE_ENV === "production";
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim() || undefined;
  const jwtSecret = env.JWT_SECRET ?? "";
  const origenesPermitidos = leerOrigenesPermitidos(env.CORS_ORIGENES);
  const loginDesarrollo = env.LOGIN_DESARROLLO === "true";
  const port = Number(env.PORT ?? 3000);
  const errores: string[] = [];

  if (!jwtSecret) errores.push("Falta JWT_SECRET: sin él no se pueden firmar las sesiones");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    errores.push("PORT tiene que ser un puerto válido");

  if (esProduccion) {
    if (!googleClientId) {
      errores.push(
        "Falta GOOGLE_CLIENT_ID: sin él no se puede validar a quién está dirigido el token de Google",
      );
    }
    if (jwtSecret && jwtSecret.length < LARGO_MINIMO_JWT_SECRET) {
      errores.push(`JWT_SECRET tiene que tener al menos ${LARGO_MINIMO_JWT_SECRET} caracteres en producción`);
    }
    // En producción no se arranca con CORS abierto: mejor fallar al inicio que publicar la API a cualquier origen.
    if (!origenesPermitidos) {
      errores.push("Falta CORS_ORIGENES: con NODE_ENV=production hay que indicar los orígenes permitidos");
    }
    // El login de desarrollo entra sin verificar la identidad con Google: en producción sería una puerta abierta.
    if (loginDesarrollo) errores.push("LOGIN_DESARROLLO=true no está permitido con NODE_ENV=production");
  }

  if (errores.length > 0) return { valida: false, errores };

  return {
    valida: true,
    configuracion: {
      esProduccion,
      googleClientId,
      jwtSecret,
      jwtExpiresIn: env.JWT_EXPIRES_IN ?? "8h",
      origenesPermitidos,
      loginDesarrollo,
      // Fuera de producción la API trae el login de desarrollo y CORS abierto: por defecto solo atiende a
      // la propia máquina, no a la red local. El contenedor fija HOST=0.0.0.0 porque escucha detrás de Docker.
      host: env.HOST ?? (esProduccion ? "0.0.0.0" : "127.0.0.1"),
      port,
    },
  };
}
