import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsigniaMedalla, ListaInsignias } from "../insignia-medalla";
import { unaPorTipo } from "../insignias";

describe("ListaInsignias", () => {
  it("nombra cada insignia solo con su nombre y se puede recorrer con el teclado", () => {
    render(
      <ListaInsignias
        insignias={[
          { codigo: "MES_PERFECTO", nombre: "Mes perfecto", descripcion: "Un mes sin faltar", tipo: "MES_PERFECTO", valor_umbral: 100 },
          { codigo: "RACHA_10", nombre: "Racha de 10", descripcion: null, tipo: "RACHA", valor_umbral: 10 },
        ]}
      />,
    );

    const lista = screen.getByRole("list", { name: "Insignias" });
    const mesPerfecto = within(lista).getByLabelText("Mes perfecto");
    expect(mesPerfecto).toHaveAttribute("tabindex", "0");
    expect(within(lista).getByLabelText("Racha de 10")).toBeInTheDocument();
  });

  it("no muestra nada si no obtuvo ninguna", () => {
    const { container } = render(<ListaInsignias insignias={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("InsigniaMedalla", () => {
  it("en Racha y Clases muestra el número del umbral en lugar del ícono", () => {
    const { container } = render(<InsigniaMedalla tipo="TOTAL_CLASES" umbral={100} />);

    expect(container.querySelector("text")).toHaveTextContent("100");
  });

  it("en Mes perfecto y Podio deja el ícono aunque tenga umbral", () => {
    const { container } = render(<InsigniaMedalla tipo="PODIO_MES" umbral={3} />);

    expect(container.querySelector("text")).toBeNull();
  });

  it("bloqueada usa la misma forma en gris", () => {
    const { container } = render(<InsigniaMedalla tipo="PODIO_MES" bloqueada />);

    expect(container.querySelector("g")).toHaveAttribute("fill", "#e3e7ec");
  });
});

describe("unaPorTipo", () => {
  it("deja la de umbral más alto de cada tipo, en orden fijo", () => {
    const resultado = unaPorTipo([
      { codigo: "TOTAL_100", nombre: "100 clases", descripcion: null, tipo: "TOTAL_CLASES", valor_umbral: 100 },
      { codigo: "RACHA_25", nombre: "Racha de 25", descripcion: null, tipo: "RACHA", valor_umbral: 25 },
      { codigo: "RACHA_10", nombre: "Racha de 10", descripcion: null, tipo: "RACHA", valor_umbral: 10 },
      { codigo: "TOTAL_50", nombre: "50 clases", descripcion: null, tipo: "TOTAL_CLASES", valor_umbral: 50 },
      { codigo: "MES_PERFECTO", nombre: "Mes perfecto", descripcion: null, tipo: "MES_PERFECTO", valor_umbral: 100 },
    ]);

    expect(resultado.map(({ codigo }) => codigo)).toEqual(["MES_PERFECTO", "RACHA_25", "TOTAL_100"]);
  });

});
