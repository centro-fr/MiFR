import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAlumno } from "../../hooks/use-alumnos";
import { AlumnoDetallePage } from "../alumno-detalle-page";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children, submiga }: { children: ReactNode; submiga?: string }) => (
    <div data-testid="owner-layout" data-submiga={submiga}>
      <main className="w-full min-w-0">{children}</main>
    </div>
  ),
}));

vi.mock("../../hooks/use-alumnos", () => ({
  useAlumno: vi.fn(() => ({})),
  useDarDeBajaAlumno: vi.fn(() => ({
    reset: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
  })),
  esAlumnoNoEncontrado: vi.fn(() => false),
}));

const mockHasPermission = vi.fn((_permiso?: string) => false);
const mockHasRole = vi.fn((_rol?: string) => false);

vi.mock("@/features/portal-alumno/hooks/use-insignias", () => ({
  useInsignias: vi.fn(() => ({
    data: {
      id_alumno: 1,
      racha: { actual: 5, mejor: 10, fecha_inicio: "2026-09-01", proximo_hito: null },
      clases_asistidas: 24,
      proximo_hito_clases: null,
      insignias: [
        { codigo: "MES_PERFECTO", nombre: "Mes perfecto", tipo: "MES_PERFECTO", valor_umbral: 1, obtenida: true, fecha_obtencion: "2026-10-01", periodos: [], progreso: null, descripcion: null },
      ],
    },
    isPending: false,
    isError: false,
    error: null,
  })),
}));

// La página del historial como la responde GET /alumnos/:id/asistencias: de a 10, con los conteos.
vi.mock("../../hooks/use-asistencias-alumno", () => ({
  useAsistenciasAlumno: vi.fn(() => ({
    data: {
      datos: [
        {
          id_clase: 101,
          fecha: "2026-11-09",
          hora_inicio: "16:00",
          hora_fin: "17:00",
          actividad: "HIIT",
          profesora: "Lucía Gómez",
          asistio: true,
          observaciones: null,
        },
        {
          id_clase: 102,
          fecha: "2026-11-04",
          hora_inicio: "20:00",
          hora_fin: "21:00",
          actividad: "HIIT",
          profesora: "Lucía Gómez",
          asistio: false,
          observaciones: "Aviso previo",
        },
      ],
      total: 2,
      presentes: 1,
      ausentes: 1,
      limit: 10,
      offset: 0,
    },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (permiso: string) => mockHasPermission(permiso),
    hasRole: (rol: string) => mockHasRole(rol),
  }),
}));

describe("AlumnoDetallePage", () => {
  it("mantiene la ficha centrada en el ancho disponible en mobile y usa bordes visibles en tema oscuro", () => {
    render(
      <MemoryRouter initialEntries={["/app/alumnos/no-valido"]}>
        <Routes>
          <Route path="/app/alumnos/:id" element={<AlumnoDetallePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("main")).toHaveClass("w-full");
    expect(screen.getByRole("main")).not.toHaveClass("max-w-[1240px]");
    expect(screen.getByText("No encontramos ese alumno").closest(".bg-card")).toHaveClass(
      "dark:border-slate-600",
    );
    expect(useAlumno).toHaveBeenCalledWith(0);
  });

  it("renderiza la ficha completa con avatar, badges, KPIs y pestañas con estilo de ficha.png", () => {
    mockHasPermission.mockReturnValue(true);
    mockHasRole.mockImplementation((r) => r === "PROPIETARIA");

    vi.mocked(useAlumno).mockReturnValue({
      data: {
        id_alumno: 1,
        estado: "ACTIVO",
        fecha_alta: "2026-03-03T00:00:00Z",
        apto_medico: true,
        fecha_apto_medico: "2026-03-12T00:00:00Z",
        observaciones: "Sin observaciones",
        cont_emerg_nombre: "Laura Medina",
        cont_emerg_telefono: "351 499-8877",
        usuario: {
          id_usuario: 10,
          nombre: "Sofía",
          apellido: "Medina",
          email: "sofia.medina@example.com",
          dni: "38111222",
          telefono: "351 411-2233",
          direccion: "Av. Colón 1234",
          fecha_nacimiento: "1996-08-14",
        },
        inscripcion: {
          id_inscripcion: 5,
          profesora: "Lucía Gómez",
          plan: { id_plan: 2, nombre: "Intermedio", tipo: "MENSUAL", precio: 30000 },
          horarios: [
            { dia_semana: 1, actividad: "HIIT" },
            { dia_semana: 3, actividad: "HIIT" },
            { dia_semana: 5, actividad: "HIIT" },
          ],
          situacion_cuota: {
            estado: "AL_DIA",
            fecha_vencimiento: "2026-11-10",
            dias_restantes: 5,
            monto: 30000,
          },
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={["/app/alumnos/1"]}>
        <Routes>
          <Route path="/app/alumnos/:id" element={<AlumnoDetallePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Sofía Medina" })).toBeInTheDocument();
    expect(screen.getByTestId("owner-layout")).toHaveAttribute("data-submiga", "Sofía Medina");
    expect(screen.getByText("SM")).toBeInTheDocument();
    // Bajo el nombre van solo las insignias obtenidas (en el mock, Mes perfecto).
    const insignias = screen.getByRole("list", { name: "Insignias" });
    expect(within(insignias).getAllByRole("listitem")).toHaveLength(1);
    expect(within(insignias).getByLabelText("Mes perfecto")).toBeInTheDocument();

    // KPIs
    expect(screen.getByText("Intermedio")).toBeInTheDocument();
    expect(screen.getByText("Lucía Gómez")).toBeInTheDocument();
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Vence el 10/11")).toBeInTheDocument();
    expect(screen.getByText("03/03/2026")).toBeInTheDocument();

    // Pestañas
    expect(screen.getByRole("tab", { name: "Datos" })).toHaveAttribute("aria-selected", "true");

    // Datos personales
    expect(screen.getByText("38.111.222")).toBeInTheDocument();
    expect(screen.getByText("14/08/1996")).toBeInTheDocument();
    expect(screen.getByText("Av. Colón 1234")).toBeInTheDocument();

    // Contacto (texto plano en la tabla y botones de acción arriba)
    expect(screen.getByText("351 411-2233")).toBeInTheDocument();
    expect(screen.getByText("351 411-2233").tagName).toBe("SPAN");
    expect(screen.getByText("sofia.medina@example.com")).toBeInTheDocument();
    expect(screen.getByText("sofia.medina@example.com").tagName).toBe("SPAN");
    expect(screen.getByText("Laura Medina")).toBeInTheDocument();
    expect(screen.getByText("351 499-8877")).toBeInTheDocument();
    expect(screen.getByText("351 499-8877").tagName).toBe("SPAN");

    // Botones de acción (WhatsApp, Llamar, Email, y Llamar a Emergencia en rojo)
    expect(screen.getByRole("link", { name: "Abrir WhatsApp a Sofía Medina" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Llamar a Sofía Medina" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar email a Sofía Medina" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Llamar a emergencia: Laura Medina" })).toHaveAttribute(
      "href",
      "tel:3514998877",
    );

    // Salud
    expect(screen.getByText("Presentado el 12/03/2026")).toBeInTheDocument();
    expect(screen.getByText("Sin observaciones")).toBeInTheDocument();

    // Cambiar a la pestaña "Plan" muestra las 2 tarjetas (Plan vigente y Horarios) según plan.png
    const pestaniaPlan = screen.getByRole("tab", { name: "Plan" });
    fireEvent.click(pestaniaPlan);

    expect(screen.getByRole("heading", { name: "Plan vigente" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cuota" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Horarios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar plan y horarios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver cobros" })).not.toBeInTheDocument();
    expect(screen.getByText("Días de gracia")).toBeInTheDocument();
    expect(screen.getByText("Vence")).toBeInTheDocument();
    expect(screen.getAllByText("Intermedio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Lucía Gómez").length).toBeGreaterThanOrEqual(1);

    // Cambiar a la pestaña "Asistencia" muestra la tabla de historial de asistencia estilo Alumno-Listado
    const pestaniaAsistencia = screen.getByRole("tab", { name: "Asistencia" });
    fireEvent.click(pestaniaAsistencia);

    expect(screen.getByRole("heading", { name: "Historial de asistencia" })).toBeInTheDocument();
    expect(screen.getByText("Todas")).toBeInTheDocument();
    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("Ausentes")).toBeInTheDocument();
  });

  it("despliega el menú de más opciones con Cambiar plan y Dar de baja según mas opciones en perfil.png", () => {
    mockHasPermission.mockReturnValue(true);
    mockHasRole.mockImplementation((r) => r === "PROPIETARIA");

    render(
      <MemoryRouter initialEntries={["/app/alumnos/1"]}>
        <Routes>
          <Route path="/app/alumnos/:id" element={<AlumnoDetallePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const botonMasOpciones = screen.getByRole("button", { name: "Más acciones" });
    expect(botonMasOpciones).toBeInTheDocument();

    fireEvent.click(botonMasOpciones);

    expect(screen.getAllByRole("button", { name: /Cambiar plan/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Dar de baja/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("cuando el alumno está de baja muestra Dar de alta en más opciones y dot de estado de baja", () => {
    mockHasPermission.mockReturnValue(true);
    mockHasRole.mockImplementation((r) => r === "PROPIETARIA");

    vi.mocked(useAlumno).mockReturnValue({
      data: {
        id_alumno: 1,
        estado: "BAJA",
        fecha_alta: "2026-03-03T00:00:00Z",
        usuario: { nombre: "Sofía", apellido: "Medina", fecha_nacimiento: "1996-08-14" },
        inscripcion: null,
        inscripciones: [],
        inscripciones_de_la_baja: [],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={["/app/alumnos/1"]}>
        <Routes>
          <Route path="/app/alumnos/:id" element={<AlumnoDetallePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const botonMasOpciones = screen.getByRole("button", { name: "Más acciones" });
    fireEvent.click(botonMasOpciones);

    expect(screen.getAllByRole("button", { name: /Dar de alta/i }).length).toBeGreaterThanOrEqual(1);
  });
});
