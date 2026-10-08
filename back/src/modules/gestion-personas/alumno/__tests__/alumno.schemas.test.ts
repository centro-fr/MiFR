import { describe, expect, it } from "vitest";
import { actualizarAlumnoSchema, crearAlumnoSchema, listarAlumnoQuerySchema } from "../alumno.schemas.js";

const mayor = { nombre: "Ana", apellido: "López", email: "ANA@example.com", fecha_nacimiento: "1995-04-20" };
const tutor = {
  nombre: "Laura",
  apellido: "Pérez",
  telefono: "3794 112233",
  email: "laura@example.com",
  fecha_nacimiento: "1985-03-02",
};

describe("crearAlumnoSchema", () => {
  it("normaliza el email y completa apto_medico en false", () => {
    expect(crearAlumnoSchema.parse(mayor)).toMatchObject({ email: "ana@example.com", apto_medico: false });
  });

  it("guarda como null los textos opcionales vacíos", () => {
    expect(crearAlumnoSchema.parse({ ...mayor, telefono: "", cont_emerg_nombre: "  " })).toMatchObject({
      telefono: null,
      cont_emerg_nombre: null,
    });
  });

  it("acepta el tutor por id_usuario o con sus datos completos", () => {
    expect(crearAlumnoSchema.safeParse({ ...mayor, tutor: { id_usuario: 3 } }).success).toBe(true);
    expect(crearAlumnoSchema.safeParse({ ...mayor, tutor }).success).toBe(true);
  });

  it.each([
    ["sin email", { ...tutor, email: undefined }],
    ["con un campo que no existe", { ...tutor, parentesco: "madre" }],
    ["con id y datos a la vez", { id_usuario: 3, nombre: "Laura" }],
    ["sin fecha de nacimiento", { ...tutor, fecha_nacimiento: undefined }],
  ])("rechaza un tutor %s", (_caso, tutorInvalido) => {
    expect(crearAlumnoSchema.safeParse({ ...mayor, tutor: tutorInvalido }).success).toBe(false);
  });

  it.each([
    ["una fecha de apto médico futura", { fecha_apto_medico: "2999-01-01" }],
    ["observaciones de más de 500 caracteres", { observaciones: "a".repeat(501) }],
    ["un teléfono de emergencia inválido", { cont_emerg_telefono: "abc" }],
  ])("rechaza %s", (_caso, extra) => {
    expect(crearAlumnoSchema.safeParse({ ...mayor, ...extra }).success).toBe(false);
  });

  it("acepta una fecha de apto médico pasada y la lleva a las 00:00 UTC", () => {
    expect(crearAlumnoSchema.parse({ ...mayor, fecha_apto_medico: "2026-03-01" }).fecha_apto_medico).toEqual(
      new Date("2026-03-01T00:00:00Z"),
    );
  });
});

describe("actualizarAlumnoSchema", () => {
  it("rechaza un cuerpo vacío", () => {
    expect(actualizarAlumnoSchema.safeParse({}).success).toBe(false);
  });

  it("deja afuera lo que no es del alumno, como el estado", () => {
    expect(actualizarAlumnoSchema.parse({ telefono: "3794 445566", estado: "ACTIVO" })).toEqual({
      telefono: "3794 445566",
    });
  });
});

describe("listarAlumnoQuerySchema", () => {
  it("usa 20 y 0 como límite y desplazamiento por defecto", () => {
    expect(listarAlumnoQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("convierte los valores que llegan como texto", () => {
    expect(listarAlumnoQuerySchema.parse({ limit: "50", offset: "100", incluirBajas: "true" })).toEqual({
      limit: 50,
      offset: 100,
      incluirBajas: true,
    });
  });

  it.each([
    { limit: "0" },
    { limit: "101" },
    { offset: "-1" },
    { estado: "PENDIENTE" },
    { dni: "12.345.678" },
  ])("rechaza %j", (query) => {
    expect(listarAlumnoQuerySchema.safeParse(query).success).toBe(false);
  });
});
