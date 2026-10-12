import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alumnoFormSchema } from "../alumno.schema";

describe("Esquema Zod alumnoFormSchema (US-05 y US-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite registrar un alumno mayor de edad con email y teléfono válidos sin requerir tutor", () => {
    const datosValidos = {
      nombre: "Martina",
      apellido: "López",
      dni: "38999888",
      email: "martina.lopez@example.com",
      fecha_nacimiento: "1998-05-20",
      telefono: "3514112233",
      apto_medico: true,
      fecha_apto_medico: "2026-01-10",
    };

    const resultado = alumnoFormSchema.safeParse(datosValidos);
    expect(resultado.success).toBe(true);
  });

  it("falla si un alumno mayor de edad no proporciona email", () => {
    const datosSinEmail = {
      nombre: "Martina",
      apellido: "López",
      dni: "38999888",
      email: "",
      fecha_nacimiento: "1998-05-20",
      telefono: "3514112233",
      apto_medico: false,
    };

    const resultado = alumnoFormSchema.safeParse(datosSinEmail);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const issue = resultado.error.issues.find((i) => i.path.includes("email"));
      expect(issue).toBeDefined();
    }
  });

  it("falla si un alumno mayor de edad no proporciona un teléfono de contacto obligatorio", () => {
    const datosSinTelefono = {
      nombre: "Martina",
      apellido: "López",
      dni: "38999888",
      email: "martina@example.com",
      fecha_nacimiento: "1998-05-20",
      telefono: "",
      apto_medico: false,
    };

    const resultado = alumnoFormSchema.safeParse(datosSinTelefono);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const issue = resultado.error.issues.find((i) => i.path.includes("telefono"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("El teléfono de contacto es obligatorio para alumnos mayores");
    }
  });

  it("permite registrar un alumno menor de edad sin teléfono propio si cuenta con tutor legal completo", () => {
    const menorSinTelefonoPropio = {
      nombre: "Lucas",
      apellido: "Pérez",
      dni: "55123456",
      email: "",
      telefono: "", // Opcional para menores (contacto obligatorio es el tutor)
      fecha_nacimiento: "2015-08-10",
      apto_medico: false,
      tutor: {
        nombre: "Mariana",
        apellido: "García",
        dni: "30123456",
        telefono: "3514998877",
        email: "mariana.tutor@example.com",
        fecha_nacimiento: "1982-03-15",
      },
    };

    const resultado = alumnoFormSchema.safeParse(menorSinTelefonoPropio);
    expect(resultado.success).toBe(true);
  });

  it("falla si un menor de edad no tiene cargados los datos del tutor legal (US-06)", () => {
    const menorSinTutor = {
      nombre: "Lucas",
      apellido: "Pérez",
      dni: "55123456",
      fecha_nacimiento: "2015-08-10", // 11 años
      telefono: "3514112233",
      apto_medico: false,
    };

    const resultado = alumnoFormSchema.safeParse(menorSinTutor);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const issue = resultado.error.issues.find((i) => i.path.includes("tutor"));
      expect(issue).toBeDefined();
    }
  });

  it("falla si el tutor indicado es también menor de edad", () => {
    const tutorMenor = {
      nombre: "Lucas",
      apellido: "Pérez",
      dni: "55123456",
      telefono: "3514112233",
      fecha_nacimiento: "2015-08-10",
      apto_medico: false,
      tutor: {
        nombre: "Hermano",
        apellido: "Pérez",
        dni: "52123456",
        telefono: "3514998877",
        email: "hermano@example.com",
        fecha_nacimiento: "2012-03-15", // 14 años -> no puede ser tutor legal
      },
    };

    const resultado = alumnoFormSchema.safeParse(tutorMenor);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const issue = resultado.error.issues.find((i) => i.message.includes("mayor de edad"));
      expect(issue).toBeDefined();
    }
  });

  it("permite registrar un alumno mayor de edad incluso si el estado contiene un objeto tutor con strings vacías", () => {
    const mayorConEstadoInicial = {
      nombre: "Carlos",
      apellido: "García",
      dni: "35111222",
      email: "carlos@example.com",
      fecha_nacimiento: "1990-01-01",
      telefono: "3514112233",
      tutor: {
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        email: "",
        fecha_nacimiento: "",
      },
    };

    const resultado = alumnoFormSchema.safeParse(mayorConEstadoInicial);
    expect(resultado.success).toBe(true);
  });
});
