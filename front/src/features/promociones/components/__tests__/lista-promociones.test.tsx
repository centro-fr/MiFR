import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListaPromociones } from "../lista-promociones";
import type { Promocion } from "@/types/promocion";

const promocionTodos: Promocion = {
  id: "1",
  codigo: "VERANO26",
  nombre: "Verano 2026",
  tipoDescuento: "PORCENTAJE",
  valor: 20,
  fechaDesde: "2026-10-01",
  fechaHasta: "2027-03-31",
  activo: true,
  estado: "ACTIVA",
  planes: [
    { id: "1", nombre: "Plan Básico" },
    { id: "2", nombre: "Plan Intermedio" },
    { id: "3", nombre: "Plan 5 días" },
  ],
};

const promocionAlgunos: Promocion = {
  id: "2",
  codigo: "KIDS10",
  nombre: "Solo Kids",
  tipoDescuento: "PORCENTAJE",
  valor: 10,
  fechaDesde: "2026-10-01",
  fechaHasta: "2027-03-31",
  activo: true,
  estado: "ACTIVA",
  planes: [{ id: "1", nombre: "Plan Básico" }],
};

describe("ListaPromociones - Visualización de planes", () => {
  it("muestra 'Todos' cuando la promoción incluye todos los planes del centro", () => {
    render(
      <ListaPromociones
        promociones={[promocionTodos]}
        totalPlanes={3}
        onEditar={vi.fn()}
        onDesactivar={vi.fn()}
      />
    );

    expect(screen.getAllByText("Todos").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Plan Básico, Plan Intermedio, Plan 5 días")).not.toBeInTheDocument();
  });

  it("muestra los nombres individuales de los planes cuando la promoción aplica solo a algunos", () => {
    render(
      <ListaPromociones
        promociones={[promocionAlgunos]}
        totalPlanes={3}
        onEditar={vi.fn()}
        onDesactivar={vi.fn()}
      />
    );

    expect(screen.queryByText("Todos")).not.toBeInTheDocument();
    expect(screen.getAllByText("Plan Básico").length).toBeGreaterThanOrEqual(1);
  });
});

