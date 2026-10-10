import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHorarios } from "../useHorarios";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import {
  crearHorario as crearHorarioApi,
  darDeBajaHorario,
  listarHorarios,
  listarProfesoras,
} from "@/features/horarios/api/horarios-api";

import { crearHorario } from "../../__tests__/horarios-de-prueba";

// --- MOCKS ---
vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarHorarios: vi.fn(),
  listarProfesoras: vi.fn(),
  crearHorario: vi.fn(),
  actualizarHorario: vi.fn(),
  darDeBajaHorario: vi.fn(),
}));

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: vi.fn(),
}));

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

describe("useHorarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup inicial por defecto para que el hook no devuelva listas vacías
    vi.mocked(useActividades).mockReturnValue({
      data: [{ id: "1", nombre: "Funcional Grupal", modalidad: "GRUPAL", cupoMaximo: 15 }],
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useActividades>);
    
    vi.mocked(listarProfesoras).mockResolvedValue([{ id: "1", nombre: "Lucía", apellido: "Gómez" }]);
    vi.mocked(listarHorarios).mockResolvedValue([crearHorario()]);
  });

  it("carga la lista inicial de horarios desde la API", async () => {
    const queryClient = crearQueryClient();
    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper(queryClient) });

    // Esperamos a que los datos se carguen (cargando pasa de true a false)
    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Verificamos que cargó el horario por defecto (id 1)
    expect(result.current.horarios).toHaveLength(1);
    expect(result.current.horarios[0].id).toBe("1");
    expect(result.current.hayCambiosPendientes).toBe(false);
  });

  it("agrega un horario al borrador localmente sin llamar a la API hasta que se guarda", async () => {
    const queryClient = crearQueryClient();
    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper(queryClient) });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Agregamos un horario nuevo
    act(() => {
      result.current.crearHorario({
        actividadId: "1",
        profesoraId: "1",
        diaSemana: "MARTES",
        horaInicio: "10:00",
        horaFin: "11:00",
        cupoPropio: null,
      });
    });

    // Ahora deberíamos tener 2 horarios (el que vino de la API y el nuevo en borrador)
    expect(result.current.horarios).toHaveLength(2);
    expect(result.current.hayCambiosPendientes).toBe(true);
    expect(result.current.cantidadCambiosPendientes).toBe(1);
    
    // Verificamos que no se llamó a la API (solo está en memoria)
    expect(crearHorarioApi).not.toHaveBeenCalled();

    // Ahora guardamos los cambios
    vi.mocked(crearHorarioApi).mockResolvedValue(crearHorario({ id_horario: 99 }));
    
    await act(async () => {
      const res = await result.current.guardarCambios();
      expect(res.ok).toBe(true);
    });

    // Ahora sí debió llamar a la API
    expect(crearHorarioApi).toHaveBeenCalledTimes(1);
    expect(result.current.hayCambiosPendientes).toBe(false);
  });

  it("eliminar un horario oficial llama a la API inmediatamente sin pasar por borrador", async () => {
    const queryClient = crearQueryClient();
    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper(queryClient) });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    vi.mocked(darDeBajaHorario).mockResolvedValue("Sin advertencias");

    // Borramos el horario oficial (ID 1)
    await act(async () => {
      const res = await result.current.eliminarHorario("1");
      expect(res.ok).toBe(true);
    });

    expect(darDeBajaHorario).toHaveBeenCalledWith("1");
  });

  it("descartar cambios limpia el borrador", async () => {
    const queryClient = crearQueryClient();
    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper(queryClient) });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.crearHorario({
        actividadId: "1",
        profesoraId: "1",
        diaSemana: "MARTES",
        horaInicio: "10:00",
        horaFin: "11:00",
        cupoPropio: null,
      });
    });

    expect(result.current.hayCambiosPendientes).toBe(true);

    act(() => {
      result.current.cancelarCambios();
    });

    expect(result.current.hayCambiosPendientes).toBe(false);
    expect(result.current.horarios).toHaveLength(1); // Volvió al estado original
  });

  it("mantiene en borrador los horarios que fallaron al intentar guardar (fallo de red)", async () => {
    const queryClient = crearQueryClient();
    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper(queryClient) });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Agregamos un horario
    act(() => {
      result.current.crearHorario({
        actividadId: "1",
        profesoraId: "1",
        diaSemana: "MARTES",
        horaInicio: "10:00",
        horaFin: "11:00",
        cupoPropio: null,
      });
    });

    // Simulamos que la API rechaza la conexión
    vi.mocked(crearHorarioApi).mockRejectedValue(new Error("Network Error"));

    await act(async () => {
      const res = await result.current.guardarCambios();
      expect(res.ok).toBe(false);
      if ("error" in res) {
        expect(res.error).toMatch(/No se pudieron guardar/i);
      }
    });

    // Como falló, el horario NO debe haberse borrado de la pantalla (sigue pendiente)
    expect(result.current.hayCambiosPendientes).toBe(true);
    expect(result.current.cantidadCambiosPendientes).toBe(1);
  });
});
