import { describe, expect, it } from "vitest";
import { ACTIVIDADES_DEL_CENTRO } from "../actividades-del-centro";

// Los datos se editan a mano al cambiar las actividades del centro: esto evita publicar uno mal cargado.
describe("ACTIVIDADES_DEL_CENTRO", () => {
  it("no repite nombres, que son la clave de cada actividad en la página", () => {
    const nombres = ACTIVIDADES_DEL_CENTRO.map((actividad) => actividad.nombre);

    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it.each(ACTIVIDADES_DEL_CENTRO.map((actividad) => [actividad.nombre, actividad] as const))(
    "%s tiene días de lunes a sábado, en orden y sin repetir, y al menos un horario por día",
    (_nombre, { dias, horariosPorSemana }) => {
      expect(dias.length).toBeGreaterThan(0);
      expect(dias.every((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 6)).toBe(true);
      expect(dias).toEqual([...new Set(dias)].sort((a, b) => a - b));
      expect(horariosPorSemana).toBeGreaterThanOrEqual(dias.length);
    },
  );
});
