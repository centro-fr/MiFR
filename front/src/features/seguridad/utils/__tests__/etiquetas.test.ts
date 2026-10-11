import { describe, expect, it } from "vitest";
import { descripcionModulo, etiquetaModulo } from "@/features/seguridad/utils/etiquetas";

describe("etiquetaModulo", () => {
  // Regla del glosario MiFR para textos visibles.
  it("muestra PAGOS como Transferencias, porque el glosario prohíbe 'pago' en la interfaz", () => {
    expect(etiquetaModulo("PAGOS")).toBe("Transferencias");
  });

  // Un módulo nuevo del back se ve aunque el front aún no tenga su etiqueta.
  it("muestra el código tal cual si el módulo no tiene etiqueta", () => {
    expect(etiquetaModulo("NUEVO_MODULO")).toBe("NUEVO_MODULO");
  });
});

describe("descripcionModulo", () => {
  // Sin descripción la tarjeta del módulo queda limpia, sin 'undefined'.
  it("devuelve un texto vacío si el módulo no tiene descripción", () => {
    expect(descripcionModulo("NUEVO_MODULO")).toBe("");
  });
});
