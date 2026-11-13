import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ACTIVIDADES_DEL_CENTRO } from "@/features/publico/utils/actividades-del-centro";
import { Actividades } from "../actividades";

describe("Actividades", () => {
  it("muestra todas las actividades del centro sin consultar la API", () => {
    render(<Actividades />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(ACTIVIDADES_DEL_CENTRO.length);
    for (const [indice, actividad] of ACTIVIDADES_DEL_CENTRO.entries()) {
      expect(within(items[indice]).getByRole("heading", { name: actividad.nombre })).toBeInTheDocument();
    }
  });

  it("muestra los días de cada actividad, resumidos si son seguidos", () => {
    render(<Actividades />);

    const funcional = screen.getByRole("heading", { name: "Funcional" }).closest("li")!;
    const combat = screen.getByRole("heading", { name: "Combat" }).closest("li")!;
    expect(funcional).toHaveTextContent("Lun a Vie");
    expect(funcional).toHaveTextContent("Días: lunes, martes, miércoles, jueves y viernes");
    expect(combat).toHaveTextContent("Mar · Jue");
    expect(combat).toHaveTextContent("Días: martes y jueves");
  });

  it("con una sola actividad muestra solo esa, y un nombre muy largo puede cortarse en varias líneas", () => {
    const nombre = "Acondicionamientofisicointegralparaadultosmayores";
    render(<Actividades actividades={[{ ...ACTIVIDADES_DEL_CENTRO[0], nombre }]} />);

    const titulo = screen.getByRole("heading", { name: nombre });
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(1);
    expect(titulo.className).toContain("[overflow-wrap:anywhere]");
  });

  it("sin actividades no deja la lista vacía: invita a consultar", () => {
    render(<Actividades actividades={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/te contamos qué actividades hay/)).toBeInTheDocument();
  });
});
