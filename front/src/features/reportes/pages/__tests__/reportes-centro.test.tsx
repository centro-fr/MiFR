import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CobranzaReportePage } from "../cobranza-page";
import { CuotasVencidasReportePage } from "../cuotas-vencidas-page";
import { OcupacionReportePage } from "../ocupacion-page";
import { PlanesReportePage } from "../planes-page";
import { RankingReportePage } from "../ranking-reporte-page";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const listo = { isPending: false, isFetching: false, isPlaceholderData: false, isError: false, error: null, refetch: vi.fn() };
const mockPlanes = vi.fn();

vi.mock("@/features/reportes/hooks/use-reportes", () => ({
  useProfesorasParaFiltro: () => ({ data: [{ id: "1", nombre: "Lucía", apellido: "Gómez" }] }),
  useActividadesParaFiltro: () => ({ data: [{ id: "3", nombre: "HIIT" }] }),
  usePlanesParaFiltro: () => ({ data: [{ id: "2", nombre: "Intermedio" }] }),
  useEstadisticasPlanes: (filtros: unknown) => {
    mockPlanes(filtros);
    return {
      ...listo,
      data: {
        alumnosActivos: 77,
        ingresoEstimado: 2135000,
        totalPlanes: 2,
        planes: [
          { id: 2, nombre: "Intermedio", tipo: "MENSUAL", actividad: null, alumnos: 42, porcentaje: 54.5, precioVigente: 30000, ingresoEstimado: 1260000 },
          { id: 1, nombre: "Básico", tipo: "MENSUAL", actividad: null, alumnos: 35, porcentaje: 45.5, precioVigente: 25000, ingresoEstimado: 875000 },
        ],
      },
    };
  },
  useInformeOcupacion: () => ({
    ...listo,
    data: {
      totalHorarios: 2,
      ocupacionTotal: 75,
      porNivel: { LIBRE: 1, MODERADO: 0, CASI_LLENO: 0, COMPLETO: 1, SIN_CUPO: 0 },
      horarios: [
        { id: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "09:00", actividad: "Funcional", modalidad: "GRUPAL", profesora: "Lucía Gómez", cupo: 20, inscriptos: 10, porcentaje: 50, nivel: "LIBRE" },
        { id: 2, diaSemana: 3, horaInicio: "18:00", horaFin: "19:00", actividad: "HIIT", modalidad: "GRUPAL", profesora: "Lucía Gómez", cupo: 12, inscriptos: 12, porcentaje: 100, nivel: "COMPLETO" },
      ],
    },
  }),
  useInformeCobranza: () => ({
    ...listo,
    data: {
      desde: "2026-10-01",
      hasta: "2026-10-31",
      totalCobrado: 55000,
      totalEfectivo: 30000,
      totalTransferencia: 25000,
      cantidadPagos: 2,
      pagos: [
        { id: 1, fecha: "2026-10-10", monto: 30000, formaPago: "EFECTIVO", alumno: "Sofía Medina", plan: "Intermedio", cobro: "Lucía Gómez" },
        { id: 2, fecha: "2026-10-12", monto: 25000, formaPago: "TRANSFERENCIA", alumno: "Camila Pérez", plan: "Básico", cobro: null },
      ],
      total: 2,
      offset: 0,
    },
  }),
  useCuotasVencidas: () => ({
    ...listo,
    data: {
      alumnosConDeuda: 1,
      totalAdeudado: 30000,
      promedioPorAlumno: 30000,
      porProfesora: [{ id: 1, nombre: "Lucía Gómez", alumnos: 1, monto: 30000 }],
      cuotas: [
        { idInscripcion: 9, alumno: "Emiliano Sosa", telefono: "11 4455-1205", email: null, plan: "Intermedio", profesora: "Lucía Gómez", vencio: "2026-10-05", diasVencida: 13, monto: 30000 },
      ],
      total: 1,
      offset: 0,
    },
  }),
}));

vi.mock("@/features/portal-alumno/hooks/use-ranking-asistencia", () => ({
  useRankingAsistencia: () => ({
    ...listo,
    data: {
      periodo: { desde: "2026-10-01", hasta: "2026-10-31" },
      actividad: null,
      minimo_clases: 4,
      total: 2,
      limit: 50,
      offset: 0,
      propias: [],
      datos: [
        { posicion: 1, id_alumno: 1, nombre: "Valentina", apellido: "Herrera", porcentaje_asistencia: 100, clases_previstas: 11, clases_asistidas: 11, racha_actual: 23, insignias: [], es_propia: false },
        { posicion: 2, id_alumno: 2, nombre: "Sofía", apellido: "Medina", porcentaje_asistencia: 85.71, clases_previstas: 7, clases_asistidas: 6, racha_actual: 3, insignias: [], es_propia: false },
      ],
    },
  }),
}));

vi.mock("@/features/reportes/hooks/use-exportar-tabla", () => ({
  useExportarTabla: () => ({ exportar: vi.fn(), preparando: null, impresion: null }),
}));

function renderizar(elemento: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Reportes del centro", () => {
  beforeEach(() => vi.clearAllMocks());

  it("planes: una fila por plan con alumnos, precio e ingreso esperado, y filtra al elegir", () => {
    renderizar(<PlanesReportePage />);
    const fila = within(screen.getByRole("region", { name: /Alumnos por plan/ })).getByRole("row", { name: /Intermedio/ });
    expect(within(fila).getByText("42")).toBeInTheDocument();
    expect(within(fila).getByText("$ 1.260.000")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Profesor/a"), { target: { value: "1" } });
    expect(mockPlanes).toHaveBeenLastCalledWith({ idActividad: null, idProfesora: 1 });
  });

  it("ocupación: ordena de más lleno a más vacío y muestra el nivel", () => {
    renderizar(<OcupacionReportePage />);
    const filas = within(screen.getByRole("region", { name: /Horarios/ })).getAllByRole("row");
    expect(within(filas[1]).getByText("HIIT")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Completo")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Libre")).toBeInTheDocument();
  });

  it("cobranza: totales por forma de pago y el detalle de cada pago", () => {
    renderizar(<CobranzaReportePage />);
    expect(screen.getByText("$ 55.000")).toBeInTheDocument();
    const tabla = screen.getByRole("region", { name: /Pagos/ });
    expect(within(tabla).getByRole("row", { name: /Sofía Medina/ })).toHaveTextContent("Efectivo");
  });

  it("cuotas vencidas: quién debe, desde cuándo y su teléfono para avisarle", () => {
    renderizar(<CuotasVencidasReportePage />);
    const fila = within(screen.getByRole("region", { name: /Por alumno/ })).getByRole("row", { name: /Emiliano Sosa/ });
    expect(within(fila).getByText("13 días")).toBeInTheDocument();
    expect(within(fila).getByRole("link", { name: "11 4455-1205" })).toHaveAttribute("href", "tel:114455-1205");
  });

  it("ranking: tabla con el mismo contenido y medalla para el podio", () => {
    renderizar(<RankingReportePage />);
    const tabla = screen.getByRole("region", { name: /Comunidad MiFR/ });
    const primera = within(tabla).getByRole("row", { name: /Valentina Herrera/ });
    expect(within(primera).getByLabelText("Puesto 1")).toBeInTheDocument();
    expect(within(primera).getByText("11 de 11")).toBeInTheDocument();
    expect(within(primera).getByText("23 clases")).toBeInTheDocument();
  });
});
