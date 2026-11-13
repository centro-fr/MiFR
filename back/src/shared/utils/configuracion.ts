import { leerOrigenesPermitidos } from "./origenes-permitidos.js";

export interface Configuracion {
  esProduccion: boolean;
  googleClientId: string | undefined;
  jwtSecret: string;
  jwtExpiresIn: string;
  origenesPermitidos: string[] | undefined;
  loginDesarrollo: boolean;
  proxiesDeConfianza: number;
  firmaProxyNetlify: string | undefined;
  push: ClavesPush | undefined;
  host: string;
  port: number;
}

export type ResultadoConfiguracion =
  { valida: true; configuracion: Configuracion } | { valida: false; errores: string[] };

// Con un secreto corto se pueden adivinar firmas por fuerza bruta y emitir sesiones a nombre de cualquiera.
const LARGO_MINIMO_JWT_SECRET = 32;

// Las claves VAPID con que la API firma los avisos push y el contacto que piden los servicios de push.
export interface ClavesPush {
  clavePublica: string;
  clavePrivada: string;
  contacto: string;
}

// Base64url de una clave pública P-256 sin comprimir (65 bytes) y de la privada (32 bytes), como las
// genera `web-push generate-vapid-keys`.
const CLAVE_VAPID_PUBLICA = /^[A-Za-z0-9_-]{87}$/;
const CLAVE_VAPID_PRIVADA = /^[A-Za-z0-9_-]{43}$/;
const CONTACTO_VAPID = /^(mailto:\S+@\S+|https:\/\/\S+)$/;

// Las tres van juntas: sin ellas no hay push (en desarrollo alcanza), y con una a medias la API no arranca.
function leerClavesPush(env: NodeJS.ProcessEnv, errores: string[]): ClavesPush | undefined {
  const clavePublica = env.VAPID_CLAVE_PUBLICA?.trim() ?? "";
  const clavePrivada = env.VAPID_CLAVE_PRIVADA?.trim() ?? "";
  const contacto = env.VAPID_CONTACTO?.trim() ?? "";
  if (!clavePublica && !clavePrivada && !contacto) return undefined;
  if (!CLAVE_VAPID_PUBLICA.test(clavePublica))
    errores.push("VAPID_CLAVE_PUBLICA no es una clave VAPID pública");
  if (!CLAVE_VAPID_PRIVADA.test(clavePrivada))
    errores.push("VAPID_CLAVE_PRIVADA no es una clave VAPID privada");
  if (!CONTACTO_VAPID.test(contacto))
    errores.push("VAPID_CONTACTO tiene que ser mailto:<email> o una URL https");
  return { clavePublica, clavePrivada, contacto };
}

// Netlify más el balanceador de Render son dos o tres saltos; más de cinco es un valor mal cargado.
const MAXIMO_PROXIES_DE_CONFIANZA = 5;

// Solo dígitos: Number() aceptaría "", " 1 " o "1e0", y un valor así no tiene que pasar sin aviso.
function leerProxiesDeConfianza(valor: string | undefined): number | undefined {
  if (valor === undefined) return 0;
  if (!/^\d$/.test(valor)) return undefined;
  const cantidad = Number(valor);
  return cantidad <= MAXIMO_PROXIES_DE_CONFIANZA ? cantidad : undefined;
}

// Lee y valida el entorno de una vez, al arrancar: una variable de seguridad que falta tiene que impedir
// que la API levante, no aparecer después como un login que falla o, peor, que acepta de más.
export function leerConfiguracion(env: NodeJS.ProcessEnv): ResultadoConfiguracion {
  const esProduccion = env.NODE_ENV === "production";
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim() || undefined;
  const jwtSecret = env.JWT_SECRET ?? "";
  const origenesPermitidos = leerOrigenesPermitidos(env.CORS_ORIGENES);
  const loginDesarrollo = env.LOGIN_DESARROLLO === "true";
  const port = Number(env.PORT ?? 3000);
  const proxiesDeConfianza = leerProxiesDeConfianza(env.PROXIES_DE_CONFIANZA);
  const firmaProxyNetlify = env.FIRMA_PROXY_NETLIFY?.trim() || undefined;
  const errores: string[] = [];
  const push = leerClavesPush(env, errores);

  if (!jwtSecret) errores.push("Falta JWT_SECRET: sin él no se pueden firmar las sesiones");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    errores.push("PORT tiene que ser un puerto válido");
  if (proxiesDeConfianza === undefined) {
    errores.push(`PROXIES_DE_CONFIANZA tiene que ser un número entre 0 y ${MAXIMO_PROXIES_DE_CONFIANZA}`);
  }

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
    // Sin la firma, cualquiera puede llamar directo a la URL de Render salteando Netlify y elegir su IP.
    if (!firmaProxyNetlify) {
      errores.push("Falta FIRMA_PROXY_NETLIFY: sin ella la API acepta pedidos que no pasaron por Netlify");
    } else if (firmaProxyNetlify.length < LARGO_MINIMO_JWT_SECRET) {
      errores.push(`FIRMA_PROXY_NETLIFY tiene que tener al menos ${LARGO_MINIMO_JWT_SECRET} caracteres`);
    }
    // Sin el valor, la API ve como IP de todos los visitantes la del proxy de Render, y el límite de
    // pedidos los cuenta como una sola persona: un visitante abusivo deja sin servicio a los demás.
    if (env.PROXIES_DE_CONFIANZA === undefined) {
      errores.push(
        "Falta PROXIES_DE_CONFIANZA: con NODE_ENV=production hay que indicar cuántos proxies hay delante de la API",
      );
    }
    // Sin las claves los avisos de cuota no llegarían al celular, y nadie se enteraría.
    if (!push) {
      errores.push(
        "Faltan VAPID_CLAVE_PUBLICA, VAPID_CLAVE_PRIVADA y VAPID_CONTACTO: sin ellas no se mandan avisos push",
      );
    }
  }

  if (proxiesDeConfianza === undefined || errores.length > 0) return { valida: false, errores };

  return {
    valida: true,
    configuracion: {
      esProduccion,
      googleClientId,
      jwtSecret,
      jwtExpiresIn: env.JWT_EXPIRES_IN ?? "8h",
      origenesPermitidos,
      loginDesarrollo,
      proxiesDeConfianza,
      firmaProxyNetlify,
      push,
      // Fuera de producción la API trae el login de desarrollo y CORS abierto: por defecto solo atiende a
      // la propia máquina, no a la red local. El contenedor fija HOST=0.0.0.0 porque escucha detrás de Docker.
      host: env.HOST ?? (esProduccion ? "0.0.0.0" : "127.0.0.1"),
      port,
    },
  };
}
