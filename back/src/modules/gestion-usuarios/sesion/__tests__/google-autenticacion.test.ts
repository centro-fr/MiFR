import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "../../../../shared/errors/app-error.js";

import type { OAuth2Client } from "google-auth-library";
import { GoogleAutenticacion } from "../google-autenticacion.js";

const verifyIdToken = vi.fn();

const googlePayload = {
  sub: "google-123",
  email: "test@example.com",
  email_verified: true,
  given_name: "Ana",
  family_name: "Perez",
};

describe("GoogleAutenticacion", () => {
  let autenticacion: GoogleAutenticacion;

  beforeEach(() => {
    vi.clearAllMocks();
    autenticacion = new GoogleAutenticacion({ verifyIdToken } as unknown as OAuth2Client, "test-client-id");
  });

  it("verificarToken devuelve los datos del payload de Google", async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });

    const datos = await autenticacion.verificarToken("id-token-valido");

    expect(datos).toEqual({
      googleId: "google-123",
      email: "test@example.com",
      nombre: "Ana",
      apellido: "Perez",
    });
  });

  it("verificarToken toma la foto de perfil cuando Google la manda por https", async () => {
    const foto = "https://lh3.googleusercontent.com/a/foto=s96-c";
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...googlePayload, picture: foto }) });

    await expect(autenticacion.verificarToken("id-token-valido")).resolves.toMatchObject({ fotoUrl: foto });
  });

  const fotosInvalidas: [string, unknown][] = [
    ["no es un texto", 123],
    ["no es https", "http://lh3.googleusercontent.com/a/foto"],
    ["tiene espacios", "https://lh3.googleusercontent.com/a foto"],
    ["supera los 500 caracteres", `https://lh3.googleusercontent.com/${"a".repeat(480)}`],
  ];

  it.each(fotosInvalidas)("verificarToken ignora la foto si %s", async (_caso, picture) => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...googlePayload, picture }) });

    const datos = await autenticacion.verificarToken("id-token-valido");

    expect(datos.fotoUrl).toBeUndefined();
  });

  it("lanza UnauthorizedError si el token de Google es inválido", async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => null });

    await expect(autenticacion.verificarToken("token-invalido")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("lanza UnauthorizedError si Google rechaza la firma del token", async () => {
    verifyIdToken.mockRejectedValue(new Error("Wrong number of segments in token"));

    await expect(autenticacion.verificarToken("token-malformado")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("verifica el token contra el Client ID propio como audience", async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });

    await autenticacion.verificarToken("id-token-valido");

    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "id-token-valido", audience: "test-client-id" });
  });

  it("lanza UnauthorizedError si el payload no trae email", async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...googlePayload, email: undefined }) });

    await expect(autenticacion.verificarToken("id-token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("lanza UnauthorizedError si el payload no trae sub (google_id)", async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...googlePayload, sub: undefined }) });

    await expect(autenticacion.verificarToken("id-token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("devuelve nombre y apellido vacíos si la cuenta de Google no los tiene", async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: "google-123", email: "test@example.com", email_verified: true }),
    });

    await expect(autenticacion.verificarToken("id-token")).resolves.toEqual({
      googleId: "google-123",
      email: "test@example.com",
      nombre: undefined,
      apellido: undefined,
    });
  });

  it("el mensaje de error no expone el detalle interno de Google", async () => {
    verifyIdToken.mockRejectedValue(new Error("Token used too late, 1700000000 > 1690000000"));

    await expect(autenticacion.verificarToken("token-vencido")).rejects.toThrow("Token de Google inválido");
  });

  it.each([false, undefined])(
    "lanza UnauthorizedError si Google no verificó el email (email_verified %s)",
    async (emailVerificado) => {
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email_verified: emailVerificado }),
      });

      await expect(autenticacion.verificarToken("id-token")).rejects.toThrow(
        "El email de la cuenta de Google no está verificado",
      );
    },
  );

  it.each(["", undefined])(
    "rechaza el login sin consultar a Google si no hay Client ID configurado (%j)",
    async (clientId) => {
      const sinClientId = new GoogleAutenticacion(
        { verifyIdToken } as unknown as OAuth2Client,
        clientId as unknown as string,
      );

      await expect(sinClientId.verificarToken("id-token")).rejects.toBeInstanceOf(UnauthorizedError);
      expect(verifyIdToken).not.toHaveBeenCalled();
    },
  );
});
