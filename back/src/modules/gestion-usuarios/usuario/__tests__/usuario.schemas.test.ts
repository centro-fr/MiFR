import { describe, expect, it } from "vitest";
import {
  actualizarUsuarioSchema,
  asignarRolSchema,
  crearUsuarioSchema,
  rolParamSchema,
  usuarioIdParamSchema,
} from "../usuario.schemas.js";

// Las reglas de validación reflejan la tabla "usuarios" y "roles" del DER.
const minimo = { nombre: "Ana", apellido: "Perez", fecha_nacimiento: "1990-01-01" };

describe("crearUsuarioSchema", () => {
  it("acepta los campos obligatorios del DER y convierte fecha_nacimiento a Date", () => {
    const resultado = crearUsuarioSchema.parse(minimo);

    expect(resultado.fecha_nacimiento).toBeInstanceOf(Date);
    expect(resultado.email).toBeUndefined();
  });

  it("acepta un usuario completo", () => {
    const completo = {
      ...minimo,
      google_id: "google-123",
      email: "ana@example.com",
      dni: "40123456",
      telefono: "3511234567",
      direccion: "Av. Siempre Viva 123",
    };

    expect(crearUsuarioSchema.safeParse(completo).success).toBe(true);
  });

  it("normaliza el email: recorta espacios y lo pasa a minúsculas", () => {
    const resultado = crearUsuarioSchema.parse({ ...minimo, email: "  Ana@Example.COM " });

    expect(resultado.email).toBe("ana@example.com");
  });

  it("recorta los espacios de nombre y apellido", () => {
    const resultado = crearUsuarioSchema.parse({ ...minimo, nombre: "  Ana ", apellido: " Perez  " });

    expect(resultado).toMatchObject({ nombre: "Ana", apellido: "Perez" });
  });

  it.each(["nombre", "apellido", "fecha_nacimiento"])(
    "rechaza si falta %s (obligatorio en el DER)",
    (campo) => {
      const datos: Record<string, unknown> = { ...minimo };
      delete datos[campo];

      expect(crearUsuarioSchema.safeParse(datos).success).toBe(false);
    },
  );

  it.each([
    ["nombre", "a".repeat(61)],
    ["apellido", "a".repeat(61)],
    ["email", `${"a".repeat(112)}@test.com`],
    ["google_id", "a".repeat(256)],
    ["telefono", "1".repeat(21)],
    ["direccion", "a".repeat(121)],
  ])("rechaza %s más largo que el VARCHAR del DER", (campo, valor) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, [campo]: valor }).success).toBe(false);
  });

  it.each([
    ["nombre", "a".repeat(60)],
    ["apellido", "a".repeat(60)],
    ["email", `${"a".repeat(111)}@test.com`],
    ["telefono", "1".repeat(20)],
    ["direccion", "a".repeat(120)],
  ])("acepta %s con el largo máximo del DER", (campo, valor) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, [campo]: valor }).success).toBe(true);
  });

  it.each(["", "   "])("rechaza nombre vacío (%j)", (nombre) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, nombre }).success).toBe(false);
  });

  it("rechaza un email con formato inválido", () => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, email: "no-es-email" }).success).toBe(false);
  });

  it.each(["40.123.456", "40123456a", "12345678901", ""])(
    "rechaza el dni %j (solo dígitos, máximo 10)",
    (dni) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, dni }).success).toBe(false);
    },
  );

  it.each(["1", "40123456", "1234567890"])("acepta el dni %j", (dni) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, dni }).success).toBe(true);
  });

  it("rechaza una fecha de nacimiento inválida", () => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "no-es-fecha" }).success).toBe(false);
  });

  // JSON no tiene fechas: un valor que no es texto no se convierte en 1970-01-01.
  it.each([null, 0, true, 631152000000])("rechaza la fecha de nacimiento %j porque no es texto", (fecha) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: fecha }).success).toBe(false);
  });

  it("rechaza una fecha de nacimiento que no existe en el calendario", () => {
    const resultado = crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "2026-02-30" });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("La fecha no existe");
  });

  it("acepta la fecha de nacimiento con fecha y hora ISO", () => {
    const resultado = crearUsuarioSchema.parse({ ...minimo, fecha_nacimiento: "1990-05-10T00:00:00.000Z" });

    expect(resultado.fecha_nacimiento).toEqual(new Date("1990-05-10T00:00:00.000Z"));
  });
});

describe("actualizarUsuarioSchema", () => {
  it("rechaza un body vacío", () => {
    expect(actualizarUsuarioSchema.safeParse({}).success).toBe(false);
  });

  it("acepta actualizar un solo campo", () => {
    expect(actualizarUsuarioSchema.safeParse({ telefono: "3511234567" }).success).toBe(true);
  });

  it.each(["ACTIVO", "INACTIVO"])("acepta el estado %s", (estado) => {
    expect(actualizarUsuarioSchema.safeParse({ estado }).success).toBe(true);
  });

  it("rechaza un estado fuera del enumerado del DER", () => {
    expect(actualizarUsuarioSchema.safeParse({ estado: "BLOQUEADO" }).success).toBe(false);
  });

  it("aplica las mismas reglas de dni que al crear", () => {
    expect(actualizarUsuarioSchema.safeParse({ dni: "abc" }).success).toBe(false);
  });

  it("convierte fecha_nacimiento a Date", () => {
    const resultado = actualizarUsuarioSchema.parse({ fecha_nacimiento: "2001-04-09" });

    expect(resultado.fecha_nacimiento).toEqual(new Date("2001-04-09"));
  });

  it("no permite cambiar el email ni el google_id (se descartan)", () => {
    const resultado = actualizarUsuarioSchema.parse({ nombre: "Ana", email: "x@y.com", google_id: "g" });

    expect(resultado).toEqual({ nombre: "Ana" });
  });
});

describe("usuarioIdParamSchema", () => {
  it("convierte el id de la URL a número (id_usuario es SERIAL)", () => {
    expect(usuarioIdParamSchema.parse({ id: "5" })).toEqual({ id: 5 });
  });

  it.each(["abc", "0", "-1", "1.5", ""])("rechaza el id %j", (id) => {
    expect(usuarioIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("asignarRolSchema y rolParamSchema", () => {
  it.each(["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"])("acepta el rol %s del DER", (rol) => {
    expect(asignarRolSchema.safeParse({ rol }).success).toBe(true);
    expect(rolParamSchema.safeParse({ id: "1", rol }).success).toBe(true);
  });

  it.each(["PROPIETARIO", "alumno", "ADMIN", ""])("rechaza el rol %j", (rol) => {
    expect(asignarRolSchema.safeParse({ rol }).success).toBe(false);
  });

  it("rolParamSchema también valida el id", () => {
    expect(rolParamSchema.safeParse({ id: "abc", rol: "ALUMNO" }).success).toBe(false);
    expect(rolParamSchema.parse({ id: "7", rol: "ALUMNO" })).toEqual({ id: 7, rol: "ALUMNO" });
  });
});
