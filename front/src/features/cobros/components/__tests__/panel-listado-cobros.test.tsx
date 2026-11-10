import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PanelListadoCobros } from "../panel-listado-cobros";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === "/reportes/cobranza") {
        return Promise.resolve({
          data: {
            periodo: { desde: "2025-01-01", hasta: "2026-11-10" },
            resumen: {
              total_cobrado: 15000,
              total_efectivo: 15000,
              total_transferencia: 0,
              cantidad_pagos: 2,
            },
            por_forma_pago: [],
            datos: [
              {
                id_pago: 101,
                id_cuota: 1,
                monto: 8000,
                forma_pago: "EFECTIVO",
                fecha_pago: "2026-11-09T14:00:00Z",
                alumno: { id_alumno: 1, nombre: "Camila", apellido: "Pérez" },
                plan: { id_plan: 1, nombre: "Plan Danza" },
                profesora_cobra: null, // Cobrado por la Propietaria
              },
              {
                id_pago: 102,
                id_cuota: 2,
                monto: 7000,
                forma_pago: "EFECTIVO",
                fecha_pago: "2026-11-08T10:00:00Z",
                alumno: { id_alumno: 2, nombre: "Lucas", apellido: "Gómez" },
                plan: { id_plan: 2, nombre: "Plan Básico" },
                profesora_cobra: { id_profesora: 5, nombre: "Lucía", apellido: "Méndez" },
              },
            ],
            total: 2,
            limit: 100,
            offset: 0,
          },
        });
      }
      return Promise.reject(new Error("URL no mockeada"));
    }),
  },
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id_usuario: 3,
      nombre: "Marina",
      apellido: "Sosa",
      roles: ["PROPIETARIA", "PROFESORA"],
    },
  }),
}));

function renderComponente() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PanelListadoCobros onVerComprobante={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PanelListadoCobros - Propietaria en columna y filtro", () => {
  it("muestra el nombre de la propietaria en la columna Cobró cuando no fue cobrado por una profesora", async () => {
    renderComponente();

    await waitFor(() => {
      expect(screen.getAllByText("Camila Pérez").length).toBeGreaterThanOrEqual(1);
    });

    // En vez de decir "Propietaria", debe salir "Marina Sosa"
    const filasMarina = screen.getAllByText("Marina Sosa");
    expect(filasMarina.length).toBeGreaterThanOrEqual(1);

    // Y también debe estar la profesora Lucía Méndez
    expect(screen.getAllByText("Lucía Méndez").length).toBeGreaterThanOrEqual(1);
  });

  it("incluye a la Propietaria en el selector de filtros de Cobró y permite filtrar por ella", async () => {
    renderComponente();

    await waitFor(() => {
      expect(screen.getAllByText("Camila Pérez").length).toBeGreaterThanOrEqual(1);
    });

    const selectCobro = screen.getByRole("combobox", { name: "Cobró" });
    expect(selectCobro).toBeInTheDocument();

    // Ver opciones disponibles
    expect(screen.getByRole("option", { name: "Marina Sosa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lucía Méndez" })).toBeInTheDocument();

    // Seleccionar Marina Sosa
    fireEvent.change(selectCobro, { target: { value: "Marina Sosa" } });

    // Camila Pérez (cobrado por Marina) debe seguir en la tabla
    expect(screen.getAllByText("Camila Pérez").length).toBeGreaterThanOrEqual(1);

    // Lucas Gómez (cobrado por Lucía) no debe mostrarse
    expect(screen.queryByText("Lucas Gómez")).not.toBeInTheDocument();
  });
});
