import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ubicacion } from "../ubicacion";

// Leaflet necesita un navegador real para dibujar el mapa: acá alcanza con saber que se monta.
vi.mock("../mapa-ubicacion", () => ({
  default: ({ nombre }: { nombre: string }) => <div role="region" aria-label={`Mapa: ${nombre}`} />,
}));

describe("Ubicacion", () => {
  it("muestra la dirección, el mapa y cómo llegar en Google Maps, en otra pestaña", async () => {
    render(<Ubicacion />);

    expect(screen.getByRole("heading", { name: "Dónde estamos" })).toBeInTheDocument();
    expect(screen.getByText("Sánchez de Bustamante 425")).toBeInTheDocument();
    expect(screen.getByText("Perico, Jujuy")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Mapa: Sánchez de Bustamante 425, Perico, Jujuy" })).toBeInTheDocument();

    const comoLlegar = screen.getByRole("link", { name: "Cómo llegar" });
    expect(comoLlegar).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=S%C3%A1nchez%20de%20Bustamante%20425%2C%20Y4610%20Perico%2C%20Jujuy",
    );
    expect(comoLlegar).toHaveAttribute("target", "_blank");
    expect(comoLlegar).toHaveAttribute("rel", "noopener noreferrer");
  });
});
