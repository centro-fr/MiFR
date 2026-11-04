import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAsegurarMes } from "../use-asegurar-mes";
import type { InformeHonorarios, LiquidacionResumen } from "@/types/honorarios";

const mockCalcular = vi.fn();
const mockCerrarMes = vi.fn();
let mockAbierto = true;
let mockActual = "2026-11";

vi.mock("@/features/honorarios/hooks/use-honorarios", () => ({
  useCalcularLiquidaciones: () => ({ isPending: false, mutateAsync: mockCalcular }),
  useCerrarMes: () => ({ isPending: false, mutateAsync: mockCerrarMes }),
}));

vi.mock("@/features/honorarios/utils/periodo", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/features/honorarios/utils/periodo")>();
  return { ...real, mesSigueAbierto: () => mockAbierto, periodoActual: () => mockActual };
});

function fila(id: number, estado: LiquidacionResumen["estado"]): LiquidacionResumen {
  return { id, estado, calculadaEl: "2026-10-31T12:00:00.000Z", montoTotal: 1000, profesora: { id, nombre: "Ana", apellido: `P${id}` }, desglose: null };
}

function informe(periodo: string, liquidaciones: LiquidacionResumen[]): InformeHonorarios {
  return { periodo, desde: `${periodo}-01`, hasta: `${periodo}-28`, totalGeneral: 0, liquidaciones };
}

describe("useAsegurarMes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAbierto = true;
    mockActual = "2026-11";
  });

  it("con el mes abierto recalcula al entrar y no cierra nada", async () => {
    const actual = informe("2026-11", [fila(1, "BORRADOR")]);
    mockCalcular.mockResolvedValue({ informe: actual, advertencias: [] });
    renderHook(() => useAsegurarMes("2026-11", actual, true));
    await waitFor(() => expect(mockCalcular).toHaveBeenCalledTimes(1));
    expect(mockCerrarMes).not.toHaveBeenCalled();
  });

  it("pasado el día de cierre recalcula por última vez y cierra todos los borradores juntos", async () => {
    mockAbierto = false;
    const anterior = informe("2026-10", [fila(1, "BORRADOR"), fila(2, "PAGADA"), fila(3, "BORRADOR")]);
    mockCalcular.mockResolvedValue({ informe: anterior, advertencias: [] });
    mockCerrarMes.mockResolvedValue([]);
    renderHook(() => useAsegurarMes("2026-10", anterior, true));
    await waitFor(() => expect(mockCerrarMes).toHaveBeenCalledWith([1, 3]));
    expect(mockCalcular).toHaveBeenCalledTimes(1);
  });

  it("un mes cerrado no se vuelve a calcular", async () => {
    mockAbierto = false;
    renderHook(() => useAsegurarMes("2026-09", informe("2026-09", [fila(1, "CERRADA")]), true));
    await new Promise((listo) => setTimeout(listo, 20));
    expect(mockCalcular).not.toHaveBeenCalled();
  });

  it("un mes viejo sin calcular se deja como está", async () => {
    mockAbierto = false;
    renderHook(() => useAsegurarMes("2026-06", informe("2026-06", []), true));
    await new Promise((listo) => setTimeout(listo, 20));
    expect(mockCalcular).not.toHaveBeenCalled();
  });

  it("sin permiso para liquidar solo muestra lo que hay", async () => {
    renderHook(() => useAsegurarMes("2026-11", informe("2026-11", [fila(1, "BORRADOR")]), false));
    await new Promise((listo) => setTimeout(listo, 20));
    expect(mockCalcular).not.toHaveBeenCalled();
  });
});
