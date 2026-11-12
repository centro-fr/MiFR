import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FiltrosDelMes } from "../controles-informe";

vi.mock("@/features/honorarios/utils/periodo", async (original) => ({
  ...(await original<typeof import("@/features/honorarios/utils/periodo")>()),
  periodoActual: () => "2026-11",
  ultimoMesCerrado: () => "2026-10",
}));

describe("FiltrosDelMes (mes y año, como los filtros de Reportes)", () => {
  it("muestra el mes y el año del informe", () => {
    render(<FiltrosDelMes periodo="2026-10" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Mes")).toHaveValue("10");
    expect(screen.getByLabelText("Año")).toHaveValue("2026");
  });

  it("cambia el mes o el año al elegirlos", () => {
    const onChange = vi.fn();
    render(<FiltrosDelMes periodo="2026-10" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "09" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-09");

    fireEvent.change(screen.getByLabelText("Año"), { target: { value: "2025" } });
    expect(onChange).toHaveBeenLastCalledWith("2025-10");
  });

  it("Limpiar filtros vuelve al último mes que cerró y no hace falta si ya está en él", () => {
    const onChange = vi.fn();
    const { rerender } = render(<FiltrosDelMes periodo="2026-10" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeDisabled();

    rerender(<FiltrosDelMes periodo="2025-03" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10");
  });
});
