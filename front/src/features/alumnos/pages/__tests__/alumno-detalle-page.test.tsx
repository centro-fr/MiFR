import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAlumno } from "../../hooks/use-alumnos";
import { AlumnoDetallePage } from "../alumno-detalle-page";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/use-alumnos", () => ({
  useAlumno: vi.fn(() => ({})),
}));

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: () => false,
    hasRole: () => false,
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

    expect(screen.getByRole("main")).toHaveClass("mx-auto", "w-full", "max-w-[1240px]");
    expect(screen.getByText("No encontramos ese alumno").closest(".bg-card")).toHaveClass(
      "dark:border-slate-600",
    );
    expect(useAlumno).toHaveBeenCalledWith(0);
  });
});
