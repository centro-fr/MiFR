import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMatriz, mapMatrizError, putMatriz } from "@/features/seguridad/api/seguridad-api";
import {
  aplicarCambiosLocal,
  MATRIZ_QUERY_KEY,
  useActualizarMatriz,
  useMatriz,
} from "@/features/seguridad/hooks/use-matriz";
import { crearMatriz, crearMatrizSinRol } from "@/features/seguridad/__tests__/matriz-de-prueba";
import type { CambioPermiso, MatrizPermisos } from "@/types/permissions";

vi.mock("@/features/seguridad/api/seguridad-api", () => ({
  getMatriz: vi.fn(),
  putMatriz: vi.fn(),
  mapMatrizError: vi.fn(),
}));

const otorgarPlanesVer: CambioPermiso[] = [{ rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true }];

function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function crearWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.mocked(getMatriz).mockReset();
  vi.mocked(putMatriz).mockReset();
  vi.mocked(mapMatrizError).mockReset();
});

describe("aplicarCambiosLocal", () => {
  // Base de la actualización optimista: aplica otorgamientos y revocaciones.
  it("agrega los permisos otorgados y quita los revocados", () => {
    const { matriz } = crearMatriz({ PROFESORA: ["ASISTENCIAS_MARCAR"] });

    const resultado = aplicarCambiosLocal(matriz, [
      { rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true },
      { rol: "PROFESORA", permiso: "ASISTENCIAS_MARCAR", otorgado: false },
    ]);

    expect(resultado.PROFESORA).toEqual(["PLANES_VER"]);
  });

  // La lista de permisos se comporta como conjunto.
  it("no duplica un permiso que ya estaba otorgado", () => {
    const { matriz } = crearMatriz({ PROFESORA: ["PLANES_VER"] });

    expect(aplicarCambiosLocal(matriz, otorgarPlanesVer).PROFESORA).toEqual(["PLANES_VER"]);
  });

  // Revocar algo ausente es inofensivo: no debe cortar el lote.
  it("no falla al revocar un permiso que el rol no tenía", () => {
    const { matriz } = crearMatriz();

    const resultado = aplicarCambiosLocal(matriz, [
      { rol: "ALUMNO", permiso: "PLANES_VER", otorgado: false },
    ]);

    expect(resultado.ALUMNO).toEqual([]);
  });

  // Un guardado puede incluir cambios de varios roles a la vez.
  it("aplica en un mismo lote cambios de varios roles", () => {
    const { matriz } = crearMatriz();

    const resultado = aplicarCambiosLocal(matriz, [
      { rol: "ALUMNO", permiso: "PLANES_VER", otorgado: true },
      { rol: "TUTOR", permiso: "ASISTENCIAS_MARCAR", otorgado: true },
    ]);

    expect(resultado.ALUMNO).toEqual(["PLANES_VER"]);
    expect(resultado.TUTOR).toEqual(["ASISTENCIAS_MARCAR"]);
  });

  // Si se mutara la original, el rollback restauraría valores ya modificados.
  it("no modifica la matriz original, porque el rollback la reutiliza", () => {
    const { matriz } = crearMatriz();
    const copiaPrevia = structuredClone(matriz);

    aplicarCambiosLocal(matriz, otorgarPlanesVer);

    expect(matriz).toEqual(copiaPrevia);
  });

  // Comportamiento actual, reportado al equipo: el schema del GET permite que falte un rol
  // y esta función asume los cuatro, así que la actualización optimista se rompe.
  it("hoy lanza TypeError si a la matriz le falta un rol", () => {
    const { matriz } = crearMatrizSinRol("TUTOR");

    expect(() => aplicarCambiosLocal(matriz, [])).toThrow(TypeError);
  });
});

describe("useMatriz", () => {
  // Estado Vista de matriz: el hook entrega los datos del GET.
  it("devuelve la matriz obtenida del back", async () => {
    const matriz = crearMatriz();
    vi.mocked(getMatriz).mockResolvedValue(matriz);

    const { result } = renderHook(() => useMatriz(), { wrapper: crearWrapper(crearQueryClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(matriz);
  });

  // La página decide el mensaje según el código, sin conocer detalles de Axios.
  it("expone el error ya traducido a un código de la UI", async () => {
    const errorOriginal = new Error("403");
    vi.mocked(getMatriz).mockRejectedValue(errorOriginal);
    vi.mocked(mapMatrizError).mockReturnValue("SIN_PERMISO");

    const { result } = renderHook(() => useMatriz(), { wrapper: crearWrapper(crearQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mapMatrizError).toHaveBeenCalledWith(errorOriginal);
    expect(result.current.error).toBe("SIN_PERMISO");
  });
});

describe("useActualizarMatriz", () => {
  function renderizarConMatrizEnCache(matriz: MatrizPermisos | null = crearMatriz()) {
    const queryClient = crearQueryClient();
    if (matriz) queryClient.setQueryData(MATRIZ_QUERY_KEY, matriz);
    const invalidar = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useActualizarMatriz(), { wrapper: crearWrapper(queryClient) });
    const matrizEnCache = () => queryClient.getQueryData<MatrizPermisos>(MATRIZ_QUERY_KEY);
    return { result, invalidar, matrizEnCache };
  }

  // Acción Guardar: los cambios llegan al PUT.
  it("envía los cambios al back", async () => {
    vi.mocked(putMatriz).mockResolvedValue(undefined);
    const { result } = renderizarConMatrizEnCache();

    await act(() => result.current.mutateAsync(otorgarPlanesVer));

    expect(putMatriz).toHaveBeenCalledWith(otorgarPlanesVer);
  });

  // Actualización optimista: la grilla refleja el cambio sin esperar al back.
  it("muestra el cambio en la caché antes de que responda el back", async () => {
    vi.mocked(putMatriz).mockReturnValue(new Promise(() => {}));
    const { result, matrizEnCache } = renderizarConMatrizEnCache();

    act(() => result.current.mutate(otorgarPlanesVer));

    await waitFor(() => expect(matrizEnCache()?.matriz.PROFESORA).toEqual(["PLANES_VER"]));
  });

  // Caso borde de la spec: ante error al guardar se conservan los valores anteriores.
  it("restaura los valores anteriores si falla el guardado", async () => {
    const original = crearMatriz();
    vi.mocked(putMatriz).mockRejectedValue("RED_ERROR");
    const { result, matrizEnCache } = renderizarConMatrizEnCache(original);

    act(() => result.current.mutate(otorgarPlanesVer));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(matrizEnCache()).toEqual(original);
  });

  // CA: los cambios se reflejan inmediatamente (incluso en los permisos propios).
  it("refresca la sesión al guardar, para que los cambios rijan de inmediato", async () => {
    vi.mocked(putMatriz).mockResolvedValue(undefined);
    const { result, invalidar } = renderizarConMatrizEnCache();

    await act(() => result.current.mutateAsync(otorgarPlanesVer));

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: MATRIZ_QUERY_KEY });
  });

  // Tras un error se resincroniza con el servidor; la sesión no cambió.
  it("vuelve a pedir la matriz aunque el guardado falle, sin refrescar la sesión", async () => {
    vi.mocked(putMatriz).mockRejectedValue("RED_ERROR");
    const { result, invalidar } = renderizarConMatrizEnCache();

    act(() => result.current.mutate(otorgarPlanesVer));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: MATRIZ_QUERY_KEY });
    expect(invalidar).not.toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
  });

  // Guardar antes de que cargue la matriz no debe romper el optimista.
  it("guarda sin fallar aunque la matriz todavía no esté en caché", async () => {
    vi.mocked(putMatriz).mockResolvedValue(undefined);
    const { result, matrizEnCache } = renderizarConMatrizEnCache(null);

    act(() => result.current.mutate(otorgarPlanesVer));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(matrizEnCache()).toBeUndefined();
  });
});
