import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistroProgresoRepository } from "../registro-progreso.repository.js";
import { RegistroProgresoService } from "../registro-progreso.service.js";

// 01:00 UTC del 11 de octubre: en Argentina todavía es el 10.
const AHORA = new Date("2026-10-11T01:00:00Z");

describe("RegistroProgresoService", () => {
  let repositorio: { registrar: ReturnType<typeof vi.fn> };
  let servicio: RegistroProgresoService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    repositorio = { registrar: vi.fn().mockResolvedValue(undefined) };
    servicio = new RegistroProgresoService(repositorio as unknown as RegistroProgresoRepository);
  });

  afterEach(() => vi.useRealTimers());

  it("registrarMedicionInicial guarda el peso en kg y la talla en cm con el día de Argentina", async () => {
    await servicio.registrarMedicionInicial({ idAlumno: 5, idProfesora: 2, pesoKg: 62.5, tallaCm: 168 });

    expect(repositorio.registrar).toHaveBeenCalledWith({
      idAlumno: 5,
      idProfesora: 2,
      fecha: new Date("2026-10-10T00:00:00Z"),
      medidas: [
        { codigo: "PESO", unidad: "kg", valor: 62.5 },
        { codigo: "TALLA", unidad: "cm", valor: 168 },
      ],
    });
  });
});
