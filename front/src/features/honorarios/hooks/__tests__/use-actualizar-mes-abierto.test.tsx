import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActualizarMesAbierto } from "../use-actualizar-mes-abierto";
import type { InformeHonorarios, LiquidacionResumen } from "@/types/honorarios";

const mockCalcular = vi.fn();
let mockAbierto = true;

vi.mock("@/features/honorarios/hooks/use-honorarios", () => ({
  useCalcularLiquidaciones: () => ({ isPending: false, mutateAsync: mockCalcular }),
}));

vi.mock("@/features/honorarios/utils/periodo", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/features/honorarios/utils/periodo")>();
  return { ...real, mesSigueAbierto: () => mockAbierto };
});

function fila(id: number, estado: LiquidacionResumen["estado"]): LiquidacionResumen {
  return { id, estado, calculadaEl: "2026-10-31T12:00:00.000Z", montoTotal: 1000, profesora: { id, nombre: "Ana", apellido: `P${id}` }, desglose: null };
}

function informe(periodo: string, liquidaciones: LiquidacionResumen[]): InformeHonorarios {
  return { periodo, desde: `${periodo}-01`, hasta: `${periodo}-28`, totalGeneral: 0, liquidaciones };
}

async function esperarUnMomento() {
  await new Promise((listo) => setTimeout(listo, 20));
}

describe("useActualizarMesAbierto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAbierto = true;
  });

  it("con el mes abierto recalcula al entrar y muestra las advertencias", async () => {
    const actual = informe("2026-11", [fila(1, "BORRADOR")]);
    const advertencia = { idProfesora: 1, concepto: "ALUMNO_A_CARGO" as const, motivo: "SIN_TARIFA" as const, idInscripcion: 7, idClase: null };
    mockCalcular.mockResolvedValue({ informe: actual, advertencias: [advertencia] });

    const { result } = renderHook(() => useActualizarMesAbierto("2026-11", actual, true));

    await waitFor(() => expect(result.current.advertencias).toEqual([advertencia]));
    expect(mockCalcular).toHaveBeenCalledTimes(1);
  });

  it("recalcula una sola vez por mes aunque el informe cambie", async () => {
    const actual = informe("2026-11", [fila(1, "BORRADOR")]);
    mockCalcular.mockResolvedValue({ informe: actual, advertencias: [] });
    const { rerender } = renderHook(({ datos }) => useActualizarMesAbierto("2026-11", datos, true), {
      initialProps: { datos: actual },
    });
    await waitFor(() => expect(mockCalcular).toHaveBeenCalledTimes(1));

    rerender({ datos: informe("2026-11", [fila(1, "BORRADOR"), fila(2, "BORRADOR")]) });
    await esperarUnMomento();

    expect(mockCalcular).toHaveBeenCalledTimes(1);
  });

  it("pasado el día de cierre no calcula ni cierra: eso lo hace el back", async () => {
    mockAbierto = false;
    renderHook(() => useActualizarMesAbierto("2026-10", informe("2026-10", [fila(1, "BORRADOR")]), true));
    await esperarUnMomento();
    expect(mockCalcular).not.toHaveBeenCalled();
  });

  it("si el cálculo falla, avisa con un mensaje", async () => {
    mockCalcular.mockRejectedValue(new Error("sin conexión"));
    const { result } = renderHook(() => useActualizarMesAbierto("2026-11", informe("2026-11", []), true));
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it("sin permiso para liquidar solo muestra lo que hay", async () => {
    renderHook(() => useActualizarMesAbierto("2026-11", informe("2026-11", [fila(1, "BORRADOR")]), false));
    await esperarUnMomento();
    expect(mockCalcular).not.toHaveBeenCalled();
  });
});
