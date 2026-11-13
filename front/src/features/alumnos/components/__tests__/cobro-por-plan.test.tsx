import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlumnoDetalle, InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { datosDeCobro } from "@/features/alumnos/utils/cobro-de-inscripcion";
import { ModalElegirPlanACobrar } from "../cobro-por-plan";

function inscripcion(cambios: Partial<InscripcionDeAlumno> = {}): InscripcionDeAlumno {
  return {
    id_inscripcion: 3,
    estado: "ACTIVA",
    plan: { id_plan: 2, nombre: "Plan Intermedio", tipo: "MENSUAL", precio: 30000 },
    id_profesora: 1,
    profesora: "Lucía Gómez",
    horarios: [],
    fecha_inicio: "2026-10-01",
    reserva: null,
    situacion_cuota: null,
    ...cambios,
  };
}

const BASICO = inscripcion({ id_inscripcion: 34, plan: { id_plan: 1, nombre: "Plan Básico", tipo: "MENSUAL", precio: 25000 }, profesora: "Carla Ruiz" });

describe("ModalElegirPlanACobrar", () => {
  it("pide elegir el plan y ofrece cada uno con su profesora", () => {
    const onElegir = vi.fn();
    render(<ModalElegirPlanACobrar inscripciones={[inscripcion(), BASICO]} onElegir={onElegir} onCancelar={vi.fn()} />);

    expect(screen.getByText("Elegí el plan al cual querés registrar el cobro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan Intermedio.*Lucía Gómez/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Plan Básico.*Carla Ruiz/ }));

    expect(onElegir).toHaveBeenCalledWith(BASICO);
  });

  it("cancela sin elegir", () => {
    const onCancelar = vi.fn();
    render(<ModalElegirPlanACobrar inscripciones={[inscripcion(), BASICO]} onElegir={vi.fn()} onCancelar={onCancelar} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancelar).toHaveBeenCalled();
  });
});

describe("datosDeCobro", () => {
  it("cobra la inscripción elegida, con su plan y su precio", () => {
    const alumno = { id_alumno: 3, usuario: { nombre: "Valentina", apellido: "Herrera", dni: "39222333" } } as AlumnoDetalle;

    expect(datosDeCobro(alumno, BASICO)).toEqual({
      alumno: { id_alumno: 3, nombre: "Valentina", apellido: "Herrera", dni: "39222333" },
      inscripcion: { id_inscripcion: 34, id_plan: 1, nombre_plan: "Plan Básico", precio_vigente: 25000, situacion_cuota: null },
      plan: { id: "1", nombre: "Plan Básico" },
    });
  });
});
