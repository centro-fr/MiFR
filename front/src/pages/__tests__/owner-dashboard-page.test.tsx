import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { OwnerDashboardPage } from "../owner-dashboard-page";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: () => ({ user: { nombre: "Marina", apellido: "Sosa" } }) }));
vi.mock("@/utils/fecha", () => ({ fechaActualArgentina: () => "2026-10-18" }));

// La bandeja tiene sus propios tests: acá alcanza con saber que va en el dashboard, con su límite.
vi.mock("@/features/por-verificar/hooks/use-bandeja-por-verificar", () => ({
  useBandejaPorVerificar: () => ({ items: new Array(7).fill(null) }),
}));
vi.mock("@/features/por-verificar/components/bandeja-por-verificar", () => ({
  BandejaPorVerificar: ({ limite }: { limite?: number }) => <p>Bandeja con las primeras {limite}</p>,
}));

vi.mock("@/features/reportes/hooks/use-reportes", () => ({
  useEstadisticasInscripciones: () => ({
    data: { totalAltas: 96, meses: [{ mes: 10, cantidad: 7 }] },
  }),
  useEstadisticasPlanes: () => ({
    isPending: false,
    data: {
      alumnosActivos: 128,
      planes: [
        { id: 1, nombre: "Intermedio", alumnos: 42, porcentaje: 33, precioVigente: 30000 },
        { id: 2, nombre: "Básico", alumnos: 35, porcentaje: 27, precioVigente: 25000 },
      ],
    },
  }),
  useInformeOcupacion: () => ({
    isPending: false,
    data: {
      porNivel: { LIBRE: 15 },
      horarios: [
        {
          id: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "09:00", actividad: "Funcional", modalidad: "GRUPAL",
          profesora: "Lucía Gómez", cupo: 10, inscriptos: 4, porcentaje: 40, nivel: "LIBRE",
        },
      ],
    },
  }),
  useActividadesParaFiltro: () => ({ data: [{ id: "1", nombre: "Funcional" }] }),
  useProfesorasParaFiltro: () => ({ data: [{ id: "3", nombre: "Lucía", apellido: "Gómez" }] }),
}));

vi.mock("@/features/alumnos/hooks/use-alumnos", () => ({
  useListaCompletaAlumnos: () => ({
    isPending: false,
    data: [
      {
        id_alumno: 1, nombre_completo: "Rocío Paredes", dni: null, telefono: null, estado: "ACTIVO", plan: "Básico",
        profesora: "Carla Ruiz",
        situacion_cuota: { estado: "POR_VENCER", fecha_vencimiento: "2026-10-18", dias_restantes: 0, puede_asistir: true, tiene_pago_pendiente: false },
      },
    ],
  }),
}));

vi.mock("@/features/asistencia/hooks/use-asistencia", () => ({
  useClasesAsistencia: () => ({
    isPending: false,
    data: [
      {
        id_clase: 1, id_horario: 1, fecha_clase: "2026-10-18T00:00:00.000Z", id_prof_dictante: 3, estado: "CANCELADA",
        fecha_cierre_asist: null, observaciones: null, inscriptos: 3, cupo_disponible: 7,
        horario: {
          hora_inicio: "1970-01-01T21:00:00.000Z", hora_fin: "1970-01-01T22:00:00.000Z", cupo_maximo: null,
          actividad: { id_actividad: 8, nombre: "Combat", modalidad: "GRUPAL", cupo_maximo: 10 },
        },
      },
    ],
  }),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <OwnerDashboardPage />
    </MemoryRouter>,
  );
}

describe("OwnerDashboardPage", () => {
  it("saluda y muestra los indicadores del día", () => {
    renderizar();

    expect(screen.getByRole("heading", { level: 1, name: /^¡(Buen día|Buenas tardes|Buenas noches), Marina!$/ })).toBeInTheDocument();
    expect(screen.getByText("Resumen al 18 de octubre")).toBeInTheDocument();
    const indicadores = screen.getByLabelText("Indicadores");
    expect(indicadores).toHaveTextContent("Altas en octubre7");
    expect(indicadores).toHaveTextContent("Altas en 202696");
    expect(indicadores).toHaveTextContent("Alumnos activos128");
    expect(indicadores).not.toHaveTextContent("Franjas con baja demanda");
  });

  it("muestra las primeras de Por verificar, con cuántas quedan y el acceso a la bandeja", () => {
    renderizar();

    const bloque = screen.getByRole("region", { name: "Por verificar" });
    expect(within(bloque).getByText("Bandeja con las primeras 5")).toBeInTheDocument();
    expect(within(bloque).getByText("2 más")).toBeInTheDocument();
    expect(within(bloque).getByRole("link", { name: "Ver todo" })).toHaveAttribute("href", "/app/por-verificar");
  });

  it("lista las cuotas que vencen hoy, las clases del día y los planes más elegidos", () => {
    renderizar();

    const vence = within(screen.getByRole("region", { name: "Vencen hoy" })).getByRole("listitem");
    expect(vence).toHaveTextContent("Rocío ParedesBásico · Carla Ruiz");
    expect(vence).toHaveTextContent(/25\.000/);
    expect(within(screen.getByRole("region", { name: "Clases de hoy" })).getByRole("listitem")).toHaveTextContent(
      "21:00CombatLucía GómezCancelada",
    );
    const planes = within(screen.getByRole("region", { name: "Planes más elegidos" })).getAllByRole("listitem");
    expect(planes[0]).toHaveTextContent("Intermedio");
    expect(screen.getByRole("region", { name: "Planes más elegidos" })).toHaveTextContent("Total: 128 activos");
  });

  it("muestra la ocupación de la semana", () => {
    renderizar();

    expect(screen.getByRole("region", { name: "Ocupación de horarios" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Lunes 08:00: Libre/ }).length).toBeGreaterThan(0);
  });
});
