import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InformeImprimible } from "../informe-imprimible";
import type { InformeHonorarios, LiquidacionDetalle } from "@/types/honorarios";

const informeMock: InformeHonorarios = {
  periodo: "2026-11",
  desde: "2026-11-01",
  hasta: "2026-11-30",
  totalGeneral: 67500,
  liquidaciones: [
    {
      id: 1,
      estado: "BORRADOR",
      calculadaEl: "2026-11-11T00:00:00.000Z",
      montoTotal: 42500,
      profesora: { id: 1, nombre: "Lucía", apellido: "Gómez" },
      desglose: { cantidadAlumnos: 3, subtotalAlumnos: 42500, subtotalSuplencias: 0 },
    },
  ],
};

const detallesMock: LiquidacionDetalle[] = [
  {
    id: 1,
    estado: "BORRADOR",
    montoTotal: 42500,
    profesora: { id: 1, nombre: "Lucía", apellido: "Gómez" },
    alumnos: [
      {
        id: 101,
        monto: 15000,
        tarifa: { tipoValor: "PORCENTAJE", valor: 50 },
        alumno: { nombre: "Lucas", apellido: "Benítez" },
        actividad: "Funcional",
        inscripcion: { plan: "Plan Intermedio", estado: "ACTIVA", fechaBaja: null, actividad: "Funcional" },
      },
      {
        id: 102,
        monto: 15000,
        tarifa: { tipoValor: "PORCENTAJE", valor: 50 },
        alumno: { nombre: "Valentina", apellido: "Herrera" },
        actividad: "Acondicionamiento físico",
        inscripcion: { plan: "Plan Intermedio", estado: "ACTIVA", fechaBaja: null, actividad: "Acondicionamiento físico" },
      },
    ],
    suplencias: [],
  },
];

describe("InformeImprimible", () => {
  it("muestra el encabezado sin '· MiFR' y quita el pie de informe informativo", () => {
    render(<InformeImprimible informe={informeMock} detalles={detallesMock} generadoEl="2026-11-11T00:00:00.000Z" />);

    expect(screen.getByText("Centro de Entrenamiento FR")).toBeInTheDocument();
    expect(screen.queryByText(/· MiFR/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Informe solo informativo/i)).not.toBeInTheDocument();
  });

  it("muestra la tabla de precios de planes y la aclaración de tarifa del 50%", () => {
    const planes = [
      { nombre: "Plan Básico", precio: 25000 },
      { nombre: "Plan Intermedio", precio: 30000 },
    ];
    render(
      <InformeImprimible
        informe={informeMock}
        detalles={detallesMock}
        generadoEl="2026-11-11T00:00:00.000Z"
        planes={planes}
      />,
    );

    expect(screen.getByText("Precios de planes")).toBeInTheDocument();
    expect(screen.getByText("Tarifa por alumno: 50% de lo cobrado")).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(screen.getAllByText("Plan Intermedio").length).toBeGreaterThanOrEqual(1);
  });

  it("muestra las columnas Alumno, Actividad, Plan y Honorario, sin Situación ni Tarifa", () => {
    render(<InformeImprimible informe={informeMock} detalles={detallesMock} generadoEl="2026-11-11T00:00:00.000Z" />);

    expect(screen.getByRole("columnheader", { name: "Alumno" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actividad" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Plan" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("columnheader", { name: "Honorario" })).toBeInTheDocument();

    expect(screen.queryByRole("columnheader", { name: "Situación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tarifa" })).not.toBeInTheDocument();
  });

  it("ordena las filas de alumnos por actividad", () => {
    render(<InformeImprimible informe={informeMock} detalles={detallesMock} generadoEl="2026-11-11T00:00:00.000Z" />);

    // Seleccionamos las tablas; la segunda tabla es la de la profesora
    const tablas = screen.getAllByRole("table");
    const tablaAlumnos = tablas[tablas.length - 1];
    const filasAlumnos = tablaAlumnos.querySelectorAll("tbody tr");

    expect(filasAlumnos[0].textContent).toContain("Herrera, Valentina");
    expect(filasAlumnos[0].textContent).toContain("Acondicionamiento físico");
    expect(filasAlumnos[1].textContent).toContain("Benítez, Lucas");
    expect(filasAlumnos[1].textContent).toContain("Funcional");
  });
});
