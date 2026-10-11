import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/client";
import { getMatriz, mapMatrizError, putMatriz } from "@/features/seguridad/api/seguridad-api";
import { crearMatriz } from "@/features/seguridad/__tests__/matriz-de-prueba";

vi.mock("@/api/client", () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

function errorHttp(status: number, code?: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse = {
    status,
    statusText: "",
    headers: {},
    config,
    data: code ? { error: { code, message: "" } } : undefined,
  };
  return new AxiosError("Request failed", undefined, config, undefined, response);
}

function errorDeRed(): AxiosError {
  return new AxiosError("Network Error", AxiosError.ERR_NETWORK);
}

describe("mapMatrizError", () => {
  // Sin respuesta del servidor (caída, sin conexión): la UI debe ofrecer reintentar.
  it("devuelve RED_ERROR si la petición no obtuvo respuesta", () => {
    expect(mapMatrizError(errorDeRed())).toBe("RED_ERROR");
  });

  // Cualquier excepción inesperada cae en el mensaje genérico, nunca rompe la pantalla.
  it("devuelve RED_ERROR si el error no es de Axios", () => {
    expect(mapMatrizError(new Error("inesperado"))).toBe("RED_ERROR");
  });

  // Sesión vencida o rol sin acceso: la página muestra el estado 'Sin permisos'.
  it.each([401, 403])("devuelve SIN_PERMISO ante un %i", (status) => {
    expect(mapMatrizError(errorHttp(status))).toBe("SIN_PERMISO");
  });

  // El status manda sobre el código: sin permiso no tiene sentido explicar el bloqueo.
  it("prioriza SIN_PERMISO aunque el 403 traiga un código de dominio", () => {
    expect(mapMatrizError(errorHttp(403, "PERMISO_CRITICO_INMUTABLE"))).toBe("SIN_PERMISO");
  });

  // El back rechazó tocar un permiso protegido (CA-07): se informa como celda bloqueada.
  it.each(["PERMISO_CRITICO_INMUTABLE", "PERMISO_EXCLUSIVO_PROPIETARIA"])(
    "devuelve PERMISO_BLOQUEADO ante %s",
    (code) => {
      expect(mapMatrizError(errorHttp(400, code))).toBe("PERMISO_BLOQUEADO");
    },
  );

  // Cuerpo inválido para el back: se distingue de un error de red para no sugerir reintentar.
  it("devuelve VALIDACION_ERROR ante VALIDATION_ERROR", () => {
    expect(mapMatrizError(errorHttp(400, "VALIDATION_ERROR"))).toBe("VALIDACION_ERROR");
  });

  // Comportamiento actual, reportado al equipo: un error del servidor se muestra como error de red.
  it("hoy devuelve RED_ERROR ante un 500", () => {
    expect(mapMatrizError(errorHttp(500, "INTERNAL_ERROR"))).toBe("RED_ERROR");
  });
});

describe("getMatriz", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  // Contrato del GET: endpoint correcto y respuesta validada antes de llegar a la UI.
  it("pide la matriz y devuelve la respuesta validada", async () => {
    const matriz = crearMatriz();
    vi.mocked(apiClient.get).mockResolvedValue({ data: matriz });

    await expect(getMatriz()).resolves.toEqual(matriz);
    expect(apiClient.get).toHaveBeenCalledWith("/seguridad/matriz");
  });

  // Si el back cambia el formato, falla acá y no con datos corruptos en la matriz.
  it("rechaza una respuesta que no respeta el contrato", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { roles: "no es un array" } });

    await expect(getMatriz()).rejects.toThrow();
  });
});

describe("putMatriz", () => {
  // Contrato del PUT: el back espera los cambios envueltos en { cambios }.
  it("envía los cambios por PUT dentro de { cambios }", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: undefined });
    const cambios = [{ rol: "PROFESORA" as const, permiso: "PLANES_VER", otorgado: true }];

    await putMatriz(cambios);

    expect(apiClient.put).toHaveBeenCalledWith("/seguridad/matriz", { cambios });
  });
});
