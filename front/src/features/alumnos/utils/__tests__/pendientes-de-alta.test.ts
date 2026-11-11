
import { describe, expect, it } from "vitest";
import { crearPendiente } from "../../__tests__/pendiente-de-prueba";
import { textoHorarios } from "../pendientes-de-alta";

const SOFIA = crearPendiente();

describe("textoHorarios", () => {
  it("agrupa los días que comparten franja horaria", () => {
    expect(textoHorarios(SOFIA.horarios)).toBe("Lun y Mié 18:00 a 19:00");
  });

  it("separa las franjas distintas", () => {
    const horarios = [
      { dia: "LUNES" as const, horaInicio: "18:00", horaFin: "19:00", actividad: "A" },
      { dia: "MIERCOLES" as const, horaInicio: "18:00", horaFin: "19:00", actividad: "A" },
      { dia: "VIERNES" as const, horaInicio: "19:00", horaFin: "20:00", actividad: "A" },
    ];

    expect(textoHorarios(horarios)).toBe("Lun y Mié 18:00 a 19:00 · Vie 19:00 a 20:00");
  });
});
