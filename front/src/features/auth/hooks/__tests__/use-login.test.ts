import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { mapLoginError } from "@/features/auth/hooks/use-login";

function errorHttp(status: number, code?: string) {
  const e = new AxiosError("fallo");
  e.response = { status, data: code ? { error: { code } } : {} } as never;
  return e;
}

describe("mapLoginError", () => {
  it("sin respuesta del servidor: RED_ERROR", () => {
    expect(mapLoginError(new AxiosError("Network Error"))).toBe("RED_ERROR");
  });

  it("401 UNAUTHORIZED: INVALID_GOOGLE_TOKEN", () => {
    expect(mapLoginError(errorHttp(401, "UNAUTHORIZED"))).toBe("INVALID_GOOGLE_TOKEN");
  });

  it("403 USUARIO_NO_REGISTRADO: ACCESO_NO_HABILITADO", () => {
    expect(mapLoginError(errorHttp(403, "USUARIO_NO_REGISTRADO"))).toBe("ACCESO_NO_HABILITADO");
  });

  it("500: ERROR_SERVIDOR, no un error de conexión", () => {
    expect(mapLoginError(errorHttp(500))).toBe("ERROR_SERVIDOR");
  });

  it("respuesta con formato inesperado (error que no es de Axios): ERROR_SERVIDOR", () => {
    expect(mapLoginError(new Error("formato inválido"))).toBe("ERROR_SERVIDOR");
  });
});
