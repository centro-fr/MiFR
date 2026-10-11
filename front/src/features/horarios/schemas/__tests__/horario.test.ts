import { describe, expect, it } from "vitest";
import { horarioFormSchema } from "@/features/horarios/schemas/horario";

describe("horarioFormSchema", () => {
  const datosValidos = {
    actividadId: "1",
    profesoraId: "2",
    diaSemana: "LUNES" as const,
    horaInicio: "10:00",
    horaFin: "11:00",
    cupoPropio: null,
  };

  it("acepta un horario válido", () => {
    const resultado = horarioFormSchema.safeParse(datosValidos);
    expect(resultado.success).toBe(true);
  });

  describe("Actividad y Profesora", () => {
    it("rechaza si falta la actividad", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, actividadId: "" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("Elegí una actividad.");
      }
    });

    it("rechaza si falta la profesora", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, profesoraId: "abc" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("Elegí una profesora.");
      }
    });
  });

  describe("Horarios de apertura y formato", () => {
    it("rechaza una hora anterior a la apertura (07:00)", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, horaInicio: "06:59" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toMatch(/Los horarios tienen que estar entre las/);
      }
    });

    it("rechaza una hora de inicio posterior a las 19:00", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, horaInicio: "19:01" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toMatch(/Los horarios tienen que estar entre las 07:00 y las 19:00 hs/);
      }
    });

    it("rechaza una hora posterior al cierre (20:00)", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, horaFin: "20:01" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toMatch(/Los horarios tienen que estar entre las/);
      }
    });

    it("rechaza si la hora de fin es anterior a la de inicio", () => {
      const resultado = horarioFormSchema.safeParse({
        ...datosValidos,
        horaInicio: "12:00",
        horaFin: "10:00",
      });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].path).toContain("horaFin");
        expect(resultado.error.issues[0].message).toBe("La hora de fin debe ser posterior a la hora de inicio.");
      }
    });
    
    it("rechaza si la hora de fin es igual a la de inicio", () => {
      const resultado = horarioFormSchema.safeParse({
        ...datosValidos,
        horaInicio: "15:00",
        horaFin: "15:00",
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("Cupo Propio", () => {
    it("acepta cupo propio válido", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: 15 });
      expect(resultado.success).toBe(true);
    });

    it("rechaza un cupo igual a cero o negativo", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: 0 });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("El cupo tiene que ser mayor a cero.");
      }
    });

    it("rechaza un cupo con decimales", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: 10.5 });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("El cupo tiene que ser un número entero.");
      }
    });

    it("acepta un cupo en null (sin cupo propio, hereda de la actividad)", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: null });
      expect(resultado.success).toBe(true);
    });

    it("rechaza un cupo mayor a 32767", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: 32768 });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("El cupo es demasiado grande.");
      }
    });

    it("rechaza un cupo con tipo inválido (texto en vez de número)", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, cupoPropio: "10" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("El cupo tiene que ser un número.");
      }
    });
  });

  describe("Formato de Horas (Regex)", () => {
    it.each(["10:0", "abc", "25:00", "09-30"])("rechaza el formato inválido '%s'", (horaInvalida) => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, horaInicio: horaInvalida });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("La hora debe tener formato HH:mm");
      }
    });
  });

  describe("Día de la semana", () => {
    it("rechaza un día que no pertenece a la enumeración válida", () => {
      const resultado = horarioFormSchema.safeParse({ ...datosValidos, diaSemana: "FERIADO" });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toMatch(/Invalid enum value/);
      }
    });
  });
});
