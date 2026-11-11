import { Dumbbell, Flame, HeartPulse, Swords } from "lucide-react";
import { describe, expect, it } from "vitest";
import { diasAbreviados, diasEnPalabras, iconoDeActividad, semanaDeLaActividad } from "../actividades";

describe("actividades", () => {
  it("diasAbreviados nombra los días con su abreviatura", () => {
    expect(diasAbreviados([1, 3, 5])).toBe("Lun · Mié · Vie");
    expect(diasAbreviados([2, 4, 6])).toBe("Mar · Jue · Sáb");
  });

  it("iconoDeActividad elige el ícono por el nombre y usa la pesa si no reconoce ninguno", () => {
    expect(iconoDeActividad("HIIT")).toBe(Flame);
    expect(iconoDeActividad("Combat")).toBe(Swords);
    expect(iconoDeActividad("Funcional +45")).toBe(HeartPulse);
    expect(iconoDeActividad("Funcional")).toBe(Dumbbell);
    expect(iconoDeActividad("Yoga")).toBe(Dumbbell);
  });

  it("semanaDeLaActividad marca de lunes a sábado los días con clase", () => {
    expect(semanaDeLaActividad([1, 3])).toEqual([
      { dia: 1, inicial: "L", conClase: true },
      { dia: 2, inicial: "M", conClase: false },
      { dia: 3, inicial: "M", conClase: true },
      { dia: 4, inicial: "J", conClase: false },
      { dia: 5, inicial: "V", conClase: false },
      { dia: 6, inicial: "S", conClase: false },
    ]);
  });

  it("diasEnPalabras nombra los días completos, unidos con comas y una y final", () => {
    expect(diasEnPalabras([1, 3, 5])).toBe("lunes, miércoles y viernes");
    expect(diasEnPalabras([2, 4])).toBe("martes y jueves");
    expect(diasEnPalabras([6])).toBe("sábado");
    expect(diasEnPalabras([])).toBe("");
  });
});
