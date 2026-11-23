import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RutinaYProgreso } from "../rutina-y-progreso";
import type { Medicion } from "@/types/rutinas";

let medicionesMock: Medicion[] = [];

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    roles: ["PROPIETARIA"],
    hasPermission: () => true,
    hasRole: () => true,
  }),
}));

vi.mock("@/features/rutinas/hooks/use-rutinas", () => ({
  useRutinasDeAlumno: () => ({ data: [], refetch: vi.fn() }),
  useEliminarRutina: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMedicionesDeAlumno: () => ({ data: medicionesMock, refetch: vi.fn() }),
}));

describe("RutinaYProgreso: referencia de altura en Peso", () => {
  beforeEach(() => {
    medicionesMock = [];
  });

  it("muestra la última altura registrada dentro de la sección de Peso y la oculta en otras métricas", () => {
    medicionesMock = [
      {
        id: 1,
        fecha: "2026-09-24",
        idProfesora: 1,
        observaciones: null,
        corregidaEl: null,
        medidas: [
          { codigo: "PESO", valor: 74, unidad: "kg" },
          { codigo: "TALLA", valor: 165, unidad: "cm" },
        ],
      },
      {
        id: 2,
        fecha: "2026-10-24",
        idProfesora: 1,
        observaciones: null,
        corregidaEl: null,
        medidas: [
          { codigo: "PESO", valor: 73.1, unidad: "kg" },
          { codigo: "TALLA", valor: 168, unidad: "cm" },
        ],
      },
    ];

    render(<RutinaYProgreso idAlumno={10} nombreAlumno="Valentina Herrera" admiteCargas />);

    expect(screen.getByText("Altura:")).toBeInTheDocument();
    expect(screen.getByText("168 cm")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cintura" }));
    expect(screen.queryByText("Altura:")).not.toBeInTheDocument();
  });

  it("muestra 'Sin registrar' cuando hay mediciones de peso pero ninguna de altura", () => {
    medicionesMock = [
      {
        id: 1,
        fecha: "2026-09-24",
        idProfesora: 1,
        observaciones: null,
        corregidaEl: null,
        medidas: [{ codigo: "PESO", valor: 74, unidad: "kg" }],
      },
    ];

    render(<RutinaYProgreso idAlumno={10} nombreAlumno="Valentina Herrera" admiteCargas />);

    expect(screen.getByText("Altura:")).toBeInTheDocument();
    expect(screen.getByText("Sin registrar")).toBeInTheDocument();
  });
});
