import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    ["telefono", "+54 9 (351) 123-4567"],
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

  it.each(["40.123.456", "40123456a", "12345678901", "", "0", "-0", "00000000", "01234567", "12345"])(
    "rechaza el dni %j (entre 6 y 10 dígitos, sin ceros adelante)",
    (dni) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, dni }).success).toBe(false);
    },
  );

  it.each(["123456", "40123456", "1234567890"])("acepta el dni %j", (dni) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, dni }).success).toBe(true);
  });

  it.each(["-0", "123", "!!!", "<b>Ana</b>", "Ana\u0000", "Ana​", "-Ana", "Ana2"])(
    "rechaza el nombre %j: solo letras y separadores",
    (nombre) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, nombre }).success).toBe(false);
      expect(crearUsuarioSchema.safeParse({ ...minimo, apellido: nombre }).success).toBe(false);
    },
  );

  it.each(["María José", "O'Neill", "D’Angelo", "Pérez-Rua", "Ma. Inés", "Zoë", "Ñuñez"])(
    "acepta el nombre %j",
    (nombre) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, nombre }).success).toBe(true);
    },
  );

  it.each(["-0", "0", "abc", "------", "123456", "1234567890123456", "11 1234 56a", "54+1112345678"])(
    "rechaza el teléfono %j",
    (telefono) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, telefono }).success).toBe(false);
    },
  );

  it.each(["3511234567", "+54 9 351 123-4567", "(0351) 423-4567", "4234567"])(
    "acepta el teléfono %j",
    (telefono) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, telefono }).success).toBe(true);
    },
  );

  it.each(["-0", "123", "   ", "Calle\u0000 1"])("rechaza la dirección %j", (direccion) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, direccion }).success).toBe(false);
  });

  it.each(["google 123", "id/123", "id\u0000"])("rechaza el google_id %j", (google_id) => {
    expect(crearUsuarioSchema.safeParse({ ...minimo, google_id }).success).toBe(false);
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

  describe("rango de la fecha de nacimiento", () => {
    // 2026-10-06 a las 22:00 de Argentina, que en UTC ya es el 7.
    const AHORA = new Date("2026-10-07T01:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(AHORA);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("acepta el día de hoy en Argentina", () => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "2026-10-06" }).success).toBe(true);
    });

    it("rechaza el día siguiente aunque en UTC ya sea hoy", () => {
      const resultado = crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "2026-10-07" });

      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0]?.message).toBe("La fecha de nacimiento no puede ser futura");
    });

    it.each(["2999-01-01", "2027-01-01T00:00:00Z"])("rechaza la fecha futura %j", (fecha_nacimiento) => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento }).success).toBe(false);
    });

    it("acepta el 1900-01-01 y rechaza el día anterior", () => {
      expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "1900-01-01" }).success).toBe(true);
      expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "1899-12-31" }).success).toBe(false);
      expect(crearUsuarioSchema.safeParse({ ...minimo, fecha_nacimiento: "0001-01-01" }).success).toBe(false);
    });

    it("actualizarUsuarioSchema aplica el mismo rango", () => {
      expect(actualizarUsuarioSchema.safeParse({ fecha_nacimiento: "2999-01-01" }).success).toBe(false);
    });
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
