import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AlumnoResumen } from "@/features/alumnos/schemas/alumno";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { InicioProfesora } from "../inicio-profesora";

// Martes 14/10/2026, 10:30 en Argentina: la clase de 10:00 está en curso.
const AHORA = "2026-10-14T13:30:00.000Z";

function clase(id: number, idProfesora: number, inicio: string, fin: string, nombre: string): ClaseDelDiaApi {
  return {
    id_clase: id,
    id_horario: id,
    fecha_clase: "2026-10-14T00:00:00.000Z",
    id_prof_dictante: idProfesora,
    estado: "PROGRAMADA",
    fecha_cierre_asist: null,
    observaciones: null,
    inscriptos: 6,
    cupo_disponible: 2,
    horario: {
      hora_inicio: `1970-01-01T${inicio}:00.000Z`,
      hora_fin: `1970-01-01T${fin}:00.000Z`,
      cupo_maximo: 8,
      actividad: { id_actividad: id, nombre, modalidad: "GRUPAL", cupo_maximo: 8 },
    },
  };
}

function alumno(id: number, nombre: string, estado: "AL_DIA" | "VENCIDA", vence: string): AlumnoResumen {
  return {
    id_alumno: id,
    nombre_completo: nombre,
    dni: null,
    telefono: null,
    email: null,
    estado: "ACTIVO",
    plan: "Básico",
    profesora: "Carla Ruiz",
    situacion_cuota: { estado, fecha_vencimiento: vence, dias_restantes: 0, puede_asistir: true, tiene_pago_pendiente: false },
  };
}

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: () => ({ user: { nombre: "Carla" } }) }));
vi.mock("@/features/seguridad/hooks/use-permissions", () => ({ usePermissions: () => ({ hasRole: () => false }) }));
vi.mock("@/features/planes/hooks/use-planes", () => ({ usePlanes: () => ({ data: [{ nombre: "Básico", precioVigente: 25000 }] }) }));
vi.mock("@/features/asistencia/hooks/use-asistencia", () => ({
  useClasesAsistencia: () => ({
    isPending: false,
    data: [clase(1, 7, "10:00", "11:00", "Kid Fit"), clase(2, 7, "18:00", "19:00", "Combat"), clase(3, 99, "09:00", "10:00", "Power")],
  }),
}));
vi.mock("@/features/alumnos/hooks/use-alumnos", () => ({
  useAlumnos: () => ({
    isPending: false,
    data: { items: [alumno(1, "Thiago Ríos", "AL_DIA", "2026-10-14"), alumno(2, "Emma López", "VENCIDA", "2026-10-01")] },
  }),
}));

describe("InicioProfesora", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AHORA));
  });
  afterEach(() => vi.useRealTimers());

  it("muestra solo sus clases de hoy y ofrece tomar asistencia en la que está en curso", () => {
    render(
      <MemoryRouter>
        <InicioProfesora idProfesora="7" />
      </MemoryRouter>,
    );

    const clases = screen.getByRole("list", { name: "Tus clases de hoy" });
    expect(within(clases).getByText("Kid Fit")).toBeInTheDocument();
    expect(within(clases).getByText("Combat")).toBeInTheDocument();
    expect(within(clases).queryByText("Power")).not.toBeInTheDocument();
    expect(within(clases).getByRole("link", { name: "Tomar asistencia" })).toHaveAttribute("href", "/app/hoy/1");
  });

  it("lista las cuotas de sus alumnos que vencen hoy con el precio del plan", () => {
    render(
      <MemoryRouter>
        <InicioProfesora idProfesora="7" />
      </MemoryRouter>,
    );

    const cuotas = screen.getByRole("list", { name: "Cuotas que vencen hoy" });
    expect(within(cuotas).getByRole("link", { name: "Thiago Ríos" })).toHaveAttribute("href", "/app/alumnos/1");
    expect(within(cuotas).queryByText("Emma López")).not.toBeInTheDocument();
    expect(within(cuotas).getByText(/25\.000/)).toBeInTheDocument();
  });
});
