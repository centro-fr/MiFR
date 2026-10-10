import { describe, expect, it } from "vitest";
import { leerConfiguracion } from "../configuracion.js";

const SECRETO_LARGO = "x".repeat(32);

const produccion = {
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: "123.apps.googleusercontent.com",
  JWT_SECRET: SECRETO_LARGO,
  CORS_ORIGENES: "https://mifr.netlify.app",
};

function errores(env: NodeJS.ProcessEnv): string[] {
  const resultado = leerConfiguracion(env);
  return resultado.valida ? [] : resultado.errores;
}

describe("leerConfiguracion", () => {
  it("lee una configuración de producción completa con sus valores por defecto", () => {
    const resultado = leerConfiguracion(produccion);

    expect(resultado).toEqual({
      valida: true,
      configuracion: {
        esProduccion: true,
        googleClientId: "123.apps.googleusercontent.com",
        jwtSecret: SECRETO_LARGO,
        jwtExpiresIn: "8h",
        origenesPermitidos: ["https://mifr.netlify.app"],
        loginDesarrollo: false,
        host: "0.0.0.0",
        port: 3000,
      },
    });
  });

  it("en desarrollo acepta un secreto corto, sin Google ni CORS, y escucha solo en la propia máquina", () => {
    const resultado = leerConfiguracion({
      NODE_ENV: "development",
      JWT_SECRET: "corto",
      LOGIN_DESARROLLO: "true",
    });

    expect(resultado).toMatchObject({
      valida: true,
      configuracion: {
        esProduccion: false,
        googleClientId: undefined,
        loginDesarrollo: true,
        host: "127.0.0.1",
      },
    });
  });

  it("respeta HOST, PORT y JWT_EXPIRES_IN si vienen", () => {
    const resultado = leerConfiguracion({
      JWT_SECRET: "s",
      HOST: "0.0.0.0",
      PORT: "4000",
      JWT_EXPIRES_IN: "1h",
    });

    expect(resultado).toMatchObject({
      valida: true,
      configuracion: { host: "0.0.0.0", port: 4000, jwtExpiresIn: "1h" },
    });
  });

  it("toma un GOOGLE_CLIENT_ID vacío o con espacios como ausente", () => {
    expect(errores({ ...produccion, GOOGLE_CLIENT_ID: "  " })).toEqual([
      expect.stringContaining("Falta GOOGLE_CLIENT_ID"),
    ]);
  });

  it.each([
    ["sin JWT_SECRET", { ...produccion, JWT_SECRET: undefined }, "Falta JWT_SECRET"],
    ["con un JWT_SECRET corto", { ...produccion, JWT_SECRET: "corto" }, "al menos 32 caracteres"],
    ["sin GOOGLE_CLIENT_ID", { ...produccion, GOOGLE_CLIENT_ID: undefined }, "Falta GOOGLE_CLIENT_ID"],
    ["sin CORS_ORIGENES", { ...produccion, CORS_ORIGENES: "" }, "Falta CORS_ORIGENES"],
    [
      "con LOGIN_DESARROLLO",
      { ...produccion, LOGIN_DESARROLLO: "true" },
      "LOGIN_DESARROLLO=true no está permitido",
    ],
    ["con un PORT inválido", { ...produccion, PORT: "puerto" }, "PORT tiene que ser un puerto válido"],
  ])("en producción no arranca %s", (_caso, env, mensaje) => {
    expect(errores(env)).toEqual([expect.stringContaining(mensaje)]);
  });

  it("fuera de producción también exige JWT_SECRET", () => {
    expect(errores({ NODE_ENV: "development" })).toEqual([expect.stringContaining("Falta JWT_SECRET")]);
  });

  it("junta todos los errores en lugar de cortar en el primero", () => {
    expect(errores({ NODE_ENV: "production", LOGIN_DESARROLLO: "true" })).toHaveLength(4);
  });
});
