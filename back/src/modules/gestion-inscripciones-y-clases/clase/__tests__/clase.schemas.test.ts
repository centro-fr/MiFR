import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claseIdParamSchema, listarClasesQuerySchema } from "../clase.schemas.js";

describe("clase.schemas", () => {
  it("acepta ids decimales positivos", () => {
    expect(claseIdParamSchema.parse({ id: "20" })).toEqual({ id: 20 });
  });

  it.each(["0", "01", "-1", "1e1", " 2 "])("rechaza id inválido %s", (id) => {
    expect(claseIdParamSchema.safeParse({ id }).success).toBe(false);
  });

  describe("listarClasesQuerySchema", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 22:00 del 12 en Argentina: en UTC ya es el 13, pero hoy sigue siendo el 12.
      vi.setSystemTime(new Date("2026-10-13T01:00:00Z"));
    });

    afterEach(() => vi.useRealTimers());

    it("convierte la fecha a las 00:00 UTC y acepta hoy y días pasados", () => {
      expect(listarClasesQuerySchema.parse({ fecha: "2026-10-12" })).toEqual({
        fecha: new Date("2026-10-12T00:00:00Z"),
      });
      expect(listarClasesQuerySchema.safeParse({ fecha: "2026-09-01" }).success).toBe(true);
    });

    it.each([
      ["un día futuro", "2026-10-13"],
      ["una fecha que no existe", "2026-02-30"],
      ["otro formato", "12/10/2026"],
      ["vacía", ""],
      ["sin fecha", undefined],
    ])("rechaza %s", (_caso, fecha) => {
      expect(listarClasesQuerySchema.safeParse({ fecha }).success).toBe(false);
    });

    it.each([
      ["sin fecha", undefined, "Indique la fecha"],
      ["una fecha que no es texto", 20261012, "La fecha debe tener formato AAAA-MM-DD"],
    ])("%s responde con su mensaje", (_caso, fecha, mensaje) => {
      expect(listarClasesQuerySchema.safeParse({ fecha }).error?.issues[0]?.message).toBe(mensaje);
    });
  });
});
