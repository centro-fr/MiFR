import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { Horario } from "@/types/horarios";
import { TableroMisClases } from "../tablero-mis-clases";

const HORARIO: Horario = {
  id: "2",
  actividadId: "1",
  actividadNombre: "Personalizado",
  actividadTipo: "PERSONALIZADA",
  profesoraId: "7",
  profesoraNombre: "Marina Sosa",
  tema: temaDeModalidad("PERSONALIZADA"),
  diaSemana: "MARTES",
  horaInicio: "18:00",
  horaFin: "19:00",
  cupoPropio: null,
  cupoMaximo: 4,
  inscriptos: 2,
};

let clasesDeHoy: unknown[] = [];

vi.mock("@/features/horarios/hooks/use-cronograma-profesor", () => ({
  useCronogramaProfesor: () => ({ horarios: [HORARIO], cargando: false, error: null, reintentar: vi.fn() }),
}));
vi.mock("@/features/asistencia/hooks/use-asistencia", () => ({
  useClasesAsistencia: () => ({ data: clasesDeHoy, isPending: false }),
}));

function renderTablero() {
  render(
    <MemoryRouter>
      <TableroMisClases idProfesora="7" />
    </MemoryRouter>,
  );
}

describe("TableroMisClases", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Martes 20/10/2026, 18:30 en Argentina.
    vi.setSystemTime(new Date("2026-10-20T21:30:00.000Z"));
    clasesDeHoy = [];
  });
  afterEach(() => vi.useRealTimers());

  it("muestra la semana y las clases del cronograma con su ocupación", () => {
    renderTablero();
    expect(screen.getByRole("heading", { name: "Mis clases", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("19 al 23 de octubre")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Personalizado, Martes 20 de 18:00 a 19:00, 2 inscriptos/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tomar asistencia" })).toBeDisabled();
  });

  it("con la clase de hoy en curso lleva a tomar asistencia", () => {
    clasesDeHoy = [
      {
        id_clase: 90,
        id_horario: 2,
        fecha_clase: "2026-10-20T00:00:00.000Z",
        id_prof_dictante: 7,
        estado: "PROGRAMADA",
        fecha_cierre_asist: null,
        observaciones: null,
        inscriptos: 3,
        cupo_disponible: 1,
        horario: {
          hora_inicio: "1970-01-01T18:00:00.000Z",
          hora_fin: "1970-01-01T19:00:00.000Z",
          cupo_maximo: 4,
          actividad: { id_actividad: 1, nombre: "Personalizado", modalidad: "PERSONALIZADA", cupo_maximo: 4 },
        },
      },
    ];
    renderTablero();
    expect(screen.getByText("Ahora")).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tomar asistencia" })).toHaveAttribute("href", "/app/hoy/90");
  });
});
