import { describe, expect, it } from "vitest";
import { errorDeActividadesParaLaEdad, errorDeEdadParaElPlan } from "@/mocks/handlers/reglas-inscripcion";

// En la semilla, el plan 5 (Plan Kids) es solo para menores; el alumno 2 es Mateo Romero (2015) y el 1,
// Sofía Medina (1996).
describe("errorDeEdadParaElPlan (mock)", () => {
  it("admite a un menor en un plan solo para menores", () => {
    expect(errorDeEdadParaElPlan(5, 2)).toBeNull();
  });

  it("rechaza con 400 a un mayor de edad, como el back", async () => {
    const respuesta = errorDeEdadParaElPlan(5, 1);

    expect(respuesta?.status).toBe(400);
    expect(await respuesta?.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "El plan Plan Kids es solo para menores de 18 años" },
    });
  });

  it("no pide edad en un plan común", () => {
    expect(errorDeEdadParaElPlan(1, 1)).toBeNull();
  });
});

// Los horarios 26 y 27 son de Kid Fit (actividad para menores); el 1, de una actividad de adultos.
describe("errorDeActividadesParaLaEdad (mock)", () => {
  it("un menor toma Kid Fit con el plan solo para menores", () => {
    expect(errorDeActividadesParaLaEdad(5, [26, 27], 2)).toBeNull();
  });

  it("el plan solo para menores no admite una actividad de adultos", () => {
    expect(errorDeActividadesParaLaEdad(5, [1], 2)?.status).toBe(400);
  });

  it("Kid Fit no admite a un mayor aunque el plan sea común", async () => {
    const respuesta = errorDeActividadesParaLaEdad(1, [26], 1);

    expect(respuesta?.status).toBe(400);
    expect(await respuesta?.json()).toMatchObject({ error: { message: "Kid Fit es solo para menores de 18 años" } });
  });
});
