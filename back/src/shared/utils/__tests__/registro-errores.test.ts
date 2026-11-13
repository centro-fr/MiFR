import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarError } from "../registro-errores.js";

describe("registrarError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("deja en el log una línea JSON con el contexto y el error completo", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("se cayó la base");

    registrarError("AVISOS_DE_CUOTA", error);

    expect(log).toHaveBeenCalledTimes(1);
    const [linea, detalle] = log.mock.calls[0];
    expect(JSON.parse(linea as string)).toEqual({
      error: "AVISOS_DE_CUOTA",
      fecha: expect.any(String),
    });
    expect(detalle).toBe(error);
  });
});
