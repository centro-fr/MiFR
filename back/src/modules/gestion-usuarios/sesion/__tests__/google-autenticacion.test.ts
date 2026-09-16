import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "../../../../shared/errors/app-error.js";

const verifyIdToken = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken })),
}));

const { GoogleAutenticacion } = await import("../google-autenticacion.js");

const googlePayload = {
  sub: "google-123",
  email: "test@example.com",
  given_name: "Ana",
  family_name: "Perez",
};

describe("GoogleAutenticacion", () => {
  let autenticacion: InstanceType<typeof GoogleAutenticacion>;

  beforeEach(() => {
    vi.clearAllMocks();
    autenticacion = new GoogleAutenticacion("test-client-id");
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
});
