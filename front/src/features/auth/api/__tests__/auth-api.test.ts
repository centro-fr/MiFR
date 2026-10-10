import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/client";
import { postGoogleLogin } from "@/features/auth/api/auth-api";
import { clearSessionToken, getSessionToken } from "@/features/auth/api/session-token";

vi.mock("@/api/client", () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }));

function respuestaDelBack(roles: string[]) {
  return {
    data: {
      token: "jwt-de-prueba",
      usuario: { id_usuario: 7, email: "marina@example.com", nombre: "Marina", apellido: "Gómez" },
      roles,
      permisos: ["ACTIVIDADES_VER"],
    },
  };
}

// US-01: datos que envía al backend (ID token de Google), roles asignados y manejo seguro del token.
describe("postGoogleLogin", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    clearSessionToken();
    window.localStorage.clear();
  });

  it("envía al backend el ID token de Google a /auth/google", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(respuestaDelBack(["PROFESORA"]));
    await postGoogleLogin("id-token-de-google");
    expect(apiClient.post).toHaveBeenCalledWith("/auth/google", { id_token: "id-token-de-google" });
  });

  it("devuelve el usuario con todos los roles asignados (una persona puede tener más de uno)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(respuestaDelBack(["PROPIETARIA", "PROFESORA"]));
    const sesion = await postGoogleLogin("id-token-de-google");
    expect(sesion.usuario.roles).toEqual(["PROPIETARIA", "PROFESORA"]);
    expect(sesion.usuario.email).toBe("marina@example.com");
  });

  it("guarda el token de sesión sin usar localStorage", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(respuestaDelBack(["ALUMNO"]));
    await postGoogleLogin("id-token-de-google");
    expect(getSessionToken()).toBe("jwt-de-prueba");
    expect(window.localStorage.length).toBe(0);
  });

  it("si el backend rechaza el login, no queda ninguna sesión guardada", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("403"));
    await expect(postGoogleLogin("id-token-de-google")).rejects.toThrow();
    expect(getSessionToken()).toBeNull();
  });
});
