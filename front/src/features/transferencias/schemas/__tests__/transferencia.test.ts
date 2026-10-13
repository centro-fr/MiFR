import { describe, expect, it } from "vitest";
import { informarTransferenciaFormSchema } from "../transferencia";

describe("informarTransferenciaFormSchema (US-16)", () => {
  const baseValida = {
    id_inscripcion: 1,
    monto: 30000,
    fecha_hora_transferencia: "2026-10-12T10:00",
    titular_cuenta_origen: "Juan Pérez",
    observaciones: "Transferencia desde Santander",
  };

  it("acepta datos válidos de transferencia", () => {
    const resultado = informarTransferenciaFormSchema.safeParse(baseValida);
    expect(resultado.success).toBe(true);
  });

  it("rechaza monto menor o igual a 0", () => {
    const resultado = informarTransferenciaFormSchema.safeParse({
      ...baseValida,
      monto: 0,
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toMatch(/mayor a 0/);
    }
  });

  it("rechaza fecha futura", () => {
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    const resultado = informarTransferenciaFormSchema.safeParse({
      ...baseValida,
      fecha_hora_transferencia: manana,
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toMatch(/futura/);
    }
  });

  it("acepta titular y observaciones opcionales o vacíos", () => {
    const resultado = informarTransferenciaFormSchema.safeParse({
      id_inscripcion: 2,
      monto: 25000,
      fecha_hora_transferencia: "2026-10-10T12:00",
      titular_cuenta_origen: "",
      observaciones: "",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza titular demasiado largo (> 80 caracteres)", () => {
    const resultado = informarTransferenciaFormSchema.safeParse({
      ...baseValida,
      titular_cuenta_origen: "A".repeat(81),
    });
    expect(resultado.success).toBe(false);
  });
});
