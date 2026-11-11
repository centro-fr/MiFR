import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SelectorMes } from "../controles-informe";

describe("SelectorMes (Mes genérico y selector de año)", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("renderiza ambos selectores: mes genérico y año", () => {
    render(<SelectorMes periodo="2026-11" onChange={vi.fn()} />);

    const comboboxMes = screen.getByRole("combobox", { name: "Mes del informe" });
    const comboboxAnio = screen.getByRole("combobox", { name: "Año del informe" });

    expect(comboboxMes).toBeInTheDocument();
    expect(comboboxMes).toHaveTextContent("Noviembre");

    expect(comboboxAnio).toBeInTheDocument();
    expect(comboboxAnio).toHaveTextContent("2026");
  });

  it("permite abrir el selector de mes y seleccionar otro mes", async () => {
    const onChange = vi.fn();
    render(<SelectorMes periodo="2026-11" onChange={onChange} />);

    const comboboxMes = screen.getByRole("combobox", { name: "Mes del informe" });
    fireEvent.click(comboboxMes);

    const opcionOctubre = await screen.findByRole("option", { name: "Octubre" });
    fireEvent.click(opcionOctubre);

    expect(onChange).toHaveBeenCalledWith("2026-10");
  });

  it("permite abrir el selector de año y seleccionar otro año", async () => {
    const onChange = vi.fn();
    render(<SelectorMes periodo="2026-10" onChange={onChange} />);

    const comboboxAnio = screen.getByRole("combobox", { name: "Año del informe" });
    fireEvent.click(comboboxAnio);

    const opcion2025 = await screen.findByRole("option", { name: "2025" });
    fireEvent.click(opcion2025);

    expect(onChange).toHaveBeenCalledWith("2025-10");
  });
});
