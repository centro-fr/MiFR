import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "../../../../shared/errors/app-error.js";

import type { OAuth2Client } from "google-auth-library";
import { GoogleAutenticacion } from "../google-autenticacion.js";

const verifyIdToken = vi.fn();

const googlePayload = {
  sub: "google-123",
  email: "test@example.com",
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
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "google-123", email: "test@example.com" }) });

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
});
