import { describe, expect, it } from "vitest";
import {
  actualizarAlumnoSchema,
  crearAlumnoSchema,
  listarAlumnoQuerySchema,
  panelAlumnoQuerySchema,
} from "../alumno.schemas.js";

const mayor = {
  nombre: "Ana",
  apellido: "López",
  email: "ANA@example.com",
  fecha_nacimiento: "1995-04-20",
  dni: "40111222",
  cont_emerg_nombre: "Jorge López",
  cont_emerg_telefono: "3794 401122",
};
const tutor = {
  nombre: "Laura",
  apellido: "Pérez",
  dni: "30111222",
  telefono: "3794 112233",
  email: "laura@example.com",
  fecha_nacimiento: "1985-03-02",
};

describe("crearAlumnoSchema", () => {
  it("normaliza el email y completa apto_medico en false", () => {
    expect(crearAlumnoSchema.parse(mayor)).toMatchObject({ email: "ana@example.com", apto_medico: false });
  });

  it("guarda como null los textos opcionales vacíos", () => {
    expect(crearAlumnoSchema.parse({ ...mayor, telefono: "", direccion: "  " })).toMatchObject({
      telefono: null,
      direccion: null,
    });
  });

  it.each([
    ["sin DNI", { dni: undefined }],
    ["sin nombre del contacto de emergencia", { cont_emerg_nombre: undefined }],
    ["sin teléfono del contacto de emergencia", { cont_emerg_telefono: undefined }],
    ["con el contacto de emergencia vacío", { cont_emerg_nombre: "  " }],
    ["con el teléfono de emergencia vacío", { cont_emerg_telefono: "" }],
    ["con el contacto de emergencia en null", { cont_emerg_nombre: null }],
    ["con un contacto de emergencia de más de 80 caracteres", { cont_emerg_nombre: "a".repeat(81) }],
  ])("rechaza un alta %s", (_caso, cambios) => {
    expect(crearAlumnoSchema.safeParse({ ...mayor, ...cambios }).success).toBe(false);
  });

  it("acepta el tutor por id_usuario o con sus datos completos", () => {
    expect(crearAlumnoSchema.safeParse({ ...mayor, tutor: { id_usuario: 3 } }).success).toBe(true);
    expect(crearAlumnoSchema.safeParse({ ...mayor, tutor }).success).toBe(true);
  });

  it.each([
    ["sin email", { ...tutor, email: undefined }],
    ["sin DNI", { ...tutor, dni: undefined }],
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

  it("no deja vaciar el contacto de emergencia", () => {
    for (const cambio of [
      { cont_emerg_nombre: "" },
      { cont_emerg_nombre: null },
      { cont_emerg_telefono: "" },
      { cont_emerg_telefono: null },
    ]) {
      expect(actualizarAlumnoSchema.safeParse(cambio).success).toBe(false);
    }
    expect(actualizarAlumnoSchema.parse({ cont_emerg_telefono: "3794 409988" })).toEqual({
      cont_emerg_telefono: "3794 409988",
    });
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
    "AL_DIA",
    "POR_VENCER",
    "VENCIDA",
    "CLASE_SUELTA_VIGENTE",
    "CLASE_SUELTA_VENCIDA",
    "PENDIENTE_DE_PAGO",
  ])("acepta el estado de cuota %s", (estado_cuota) => {
    expect(listarAlumnoQuerySchema.parse({ estado_cuota })).toMatchObject({ estado_cuota });
  });

  it.each([
    { limit: "0" },
    { limit: "101" },
    { offset: "-1" },
    { estado: "PENDIENTE" },
    { dni: "12.345.678" },
    { estado_cuota: "al_dia" },
    { estado_cuota: "EN_GRACIA" },
    { estado_cuota: "" },
  ])("rechaza %j", (query) => {
    expect(listarAlumnoQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("panelAlumnoQuerySchema", () => {
  it("acepta el pedido sin alumno y convierte el id a número", () => {
    expect(panelAlumnoQuerySchema.parse({})).toEqual({});
    expect(panelAlumnoQuerySchema.parse({ id_alumno: "7" })).toEqual({ id_alumno: 7 });
  });

  it.each(["0", "-0", "01", "1e1", " 7 ", "", "abc"])("rechaza el id %j", (id_alumno) => {
    expect(panelAlumnoQuerySchema.safeParse({ id_alumno }).success).toBe(false);
  });
});
