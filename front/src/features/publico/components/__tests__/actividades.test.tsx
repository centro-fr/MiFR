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
});
