import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ACTIVIDADES_DEL_CENTRO } from "@/features/publico/utils/actividades-del-centro";
import { DisponibilidadPage } from "../disponibilidad-page";

function renderPage() {
  return render(
    <MemoryRouter>
      <DisponibilidadPage />
    </MemoryRouter>,
  );
}

describe("DisponibilidadPage", () => {
  it("muestra una tarjeta por actividad del centro, sin sesión ni consulta a la API", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Disponibilidad y horarios" })).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(ACTIVIDADES_DEL_CENTRO.length);
  });

  it("muestra la modalidad, la descripción, los días y los horarios por semana de cada actividad", () => {
    renderPage();

    const training = screen.getByRole("heading", { name: "Training" }).closest("li")!;
    expect(training).toHaveTextContent("Grupal");
    expect(training).toHaveTextContent("Circuito de fuerza, acondicionamiento y potencia física");
    expect(training).toHaveTextContent("Lun · Mié · Vie");
    expect(training).toHaveTextContent("3 horarios disponibles por semana");

    const personalizado = screen.getByRole("heading", { name: "Personalizado" }).closest("li")!;
    expect(personalizado).toHaveTextContent("Personalizada");
  });
});
