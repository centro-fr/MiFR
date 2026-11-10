import { describe, expect, it } from "vitest";
import { extraerFotoDeGoogleToken } from "../google-token";

function crearMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payloadBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const signature = "mock-signature";
  return `${header}.${payloadBase64}.${signature}`;
}

describe("extraerFotoDeGoogleToken", () => {
  it("extrae la URL de la foto de perfil cuando el claim picture está presente", () => {
    const fotoUrl = "https://lh3.googleusercontent.com/a/ACg8ocKSrG-prueba=s96-c";
    const token = crearMockJwt({
      sub: "123456789",
      email: "francisca@example.com",
      picture: fotoUrl,
      name: "Francisca Rossi",
    });

    expect(extraerFotoDeGoogleToken(token)).toBe(fotoUrl);
  });

  it("devuelve null si el payload no contiene el claim picture", () => {
    const token = crearMockJwt({
      sub: "123456789",
      email: "francisca@example.com",
      name: "Francisca Rossi",
    });

    expect(extraerFotoDeGoogleToken(token)).toBeNull();
  });

  it("devuelve null si picture no es una URL http/https válida", () => {
    const token = crearMockJwt({
      sub: "123456789",
      picture: "javascript:alert(1)",
    });

    expect(extraerFotoDeGoogleToken(token)).toBeNull();
  });

  it("devuelve null si el string no tiene formato JWT", () => {
    expect(extraerFotoDeGoogleToken("no-es-un-jwt")).toBeNull();
    expect(extraerFotoDeGoogleToken("")).toBeNull();
    expect(extraerFotoDeGoogleToken("parte1.parte2invalida.parte3")).toBeNull();
  });
});
