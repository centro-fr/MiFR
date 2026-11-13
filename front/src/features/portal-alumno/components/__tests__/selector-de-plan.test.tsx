import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanDelAlumno } from "../../schemas/panel-alumno";
import { SelectorDePlan } from "../selector-de-plan";

const mockUsePlanElegido = vi.fn();

vi.mock("../../hooks/use-plan-elegido", () => ({
  usePlanElegido: () => mockUsePlanElegido(),
}));

const PLAN_1: PlanDelAlumno = {
  id_inscripcion: 1,
  nombre: "Plan Básico",
  tipo: "MENSUAL",
  clases_por_semana: 2,
  profesora: "Marina Sosa",
  actividades: ["Funcional"],
  estado_cuota: "AL_DIA",
  fecha_vencimiento: "2026-11-20",
  dias_restantes: 8,
};

const PLAN_2: PlanDelAlumno = {
  id_inscripcion: 2,
  nombre: "Plan Intermedio",
  tipo: "MENSUAL",
  clases_por_semana: 3,
  profesora: "Lucía Gómez",
  actividades: ["Pilates"],
  estado_cuota: "VENCIDA",
  fecha_vencimiento: "2026-11-05",
  dias_restantes: -7,
};

describe("SelectorDePlan", () => {
  it("no se renderiza con 0 o 1 plan", () => {
    mockUsePlanElegido.mockReturnValue({ planes: [PLAN_1], elegido: PLAN_1, elegirPlan: vi.fn() });
    const { container } = render(<SelectorDePlan />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el botón con la actividad elegida y aviso rojo si otro plan está vencido", () => {
    mockUsePlanElegido.mockReturnValue({ planes: [PLAN_1, PLAN_2], elegido: PLAN_1, elegirPlan: vi.fn() });
    const { container } = render(<SelectorDePlan />);
    expect(screen.getByRole("button", { name: /Viendo el plan Funcional/i })).toBeInTheDocument();
    expect(screen.getByText(/otro plan con cuota pendiente/i)).toBeInTheDocument();
    expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
  });

  it("muestra aviso amarillo si el otro plan está en gracia", () => {
    const planEnGracia: PlanDelAlumno = { ...PLAN_2, estado_cuota: "EN_GRACIA" };
    mockUsePlanElegido.mockReturnValue({ planes: [PLAN_1, planEnGracia], elegido: PLAN_1, elegirPlan: vi.fn() });
    const { container } = render(<SelectorDePlan />);
    expect(container.querySelector(".bg-amber-400")).toBeInTheDocument();
  });

  it("no muestra punto si el otro plan está al día", () => {
    const planAlDia: PlanDelAlumno = { ...PLAN_2, estado_cuota: "AL_DIA" };
    mockUsePlanElegido.mockReturnValue({ planes: [PLAN_1, planAlDia], elegido: PLAN_1, elegirPlan: vi.fn() });
    const { container } = render(<SelectorDePlan />);
    expect(container.querySelector(".bg-red-500, .bg-amber-400")).toBeNull();
  });
});

