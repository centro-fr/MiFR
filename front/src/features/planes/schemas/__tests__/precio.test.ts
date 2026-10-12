import { describe, expect, it } from "vitest";
import { crearActualizacionPrecioSchema } from "@/features/planes/schemas/plan";

const HOY = "2026-10-01";
const esquema = crearActualizacionPrecioSchema({ hoy: HOY });

describe("crearActualizacionPrecioSchema", () => {
  it("convierte un precio válido y acepta vigencia desde hoy", () => {
    expect(esquema.parse({ precio: "28.000,50", fecha_vigencia_desde: HOY })).toEqual({
      precio: 28000.5,
      fecha_vigencia_desde: HOY,
    });
  });

  it("acepta una fecha de vigencia futura", () => {
    expect(esquema.safeParse({ precio: "32000", fecha_vigencia_desde: "2026-11-01" }).success).toBe(true);
  });

  it.each(["", "0", "-1", "28.000.5", "28.000,123", "100000000"])("rechaza el precio %j", (precio) => {
    expect(esquema.safeParse({ precio, fecha_vigencia_desde: HOY }).success).toBe(false);
  });

  it.each(["", "2026-02-30", "01/11/2026", "2026-09-30"])(
    "rechaza la fecha de vigencia %j",
    (fecha_vigencia_desde) => {
      expect(esquema.safeParse({ precio: "28000", fecha_vigencia_desde }).success).toBe(false);
    },
  );
});
