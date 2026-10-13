import { Dumbbell, Flame, HeartPulse, Swords } from "lucide-react";
import { describe, expect, it } from "vitest";
import { diasAbreviados, iconoDeActividad } from "../actividades";

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
});
