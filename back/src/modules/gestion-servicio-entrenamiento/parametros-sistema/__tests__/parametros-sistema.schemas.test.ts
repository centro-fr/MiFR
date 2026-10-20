import { describe, expect, it } from "vitest";
import { CATALOGO_PARAMETROS } from "../parametros-sistema.catalogo.js";
import {
  actualizarParametroSchema,
  claveParametroParamSchema,
  valorDelParametro,
} from "../parametros-sistema.schemas.js";
import type { ClaveParametro } from "../parametros-sistema.types.js";

const CLAVES = Object.keys(CATALOGO_PARAMETROS) as ClaveParametro[];

describe("claveParametroParamSchema", () => {
  it.each(CLAVES)("acepta la clave %s del catálogo", (clave) => {
    expect(claveParametroParamSchema.parse({ clave })).toEqual({ clave });
  });

  it.each(["", "NO_EXISTE", "vencidos_pueden_asistir"])("rechaza la clave %j", (clave) => {
    expect(claveParametroParamSchema.safeParse({ clave }).success).toBe(false);
  });
});

describe("actualizarParametroSchema", () => {
  it.each(["texto", 5, true, false, ""])("acepta el valor %j", (valor) => {
    expect(actualizarParametroSchema.parse({ valor })).toEqual({ valor });
  });

  it.each([{}, { valor: null }, { valor: [1] }, { valor: { a: 1 } }])("rechaza el body %j", (body) => {
    expect(actualizarParametroSchema.safeParse(body).success).toBe(false);
  });
});

describe("valorDelParametro", () => {
  it.each(CLAVES)("%s acepta su propio valor inicial, del tipo que le corresponde", (clave) => {
    const { tipo_dato, valor_inicial } = CATALOGO_PARAMETROS[clave];
    const valor =
      tipo_dato === "TEXTO"
        ? valor_inicial
        : tipo_dato === "BOOLEANO"
          ? valor_inicial === "true"
          : Number(valor_inicial);

    expect(valorDelParametro(clave, valor)).toBe(valor_inicial);
  });

  it("devuelve el booleano como texto para guardarlo", () => {
    expect(valorDelParametro("VENCIDOS_PUEDEN_ASISTIR", false)).toBe("false");
  });

  it("recorta los espacios de un texto y acepta dejarlo vacío", () => {
    expect(valorDelParametro("DATOS_BANCARIOS_ALIAS", "  mi.alias  ")).toBe("mi.alias");
    expect(valorDelParametro("DATOS_BANCARIOS_ALIAS", "")).toBe("");
  });

  it("rechaza un texto de más de 100 caracteres, que no entra en la columna", () => {
    expect(() => valorDelParametro("DATOS_BANCARIOS_TITULAR", "a".repeat(101))).toThrow();
    expect(valorDelParametro("DATOS_BANCARIOS_TITULAR", "a".repeat(100))).toHaveLength(100);
  });

  it("rechaza un texto con caracteres de control", () => {
    expect(() => valorDelParametro("DATOS_BANCARIOS_CBU", "123\u0000456")).toThrow();
  });

  it.each(["true", "false", 1, 0, null])(
    "VENCIDOS_PUEDEN_ASISTIR rechaza %j: tiene que ser boolean",
    (valor) => {
      expect(() => valorDelParametro("VENCIDOS_PUEDEN_ASISTIR", valor)).toThrow();
    },
  );

  it.each([
    "MINUTOS_CIERRE_ASISTENCIA",
    "DIAS_RESERVA_PREINSCRIPCION",
    "DIAS_AVISO_VENCIMIENTO",
    "INASISTENCIAS_CONSECUTIVAS_INACTIVO",
  ] as const)("%s rechaza negativos, -0, decimales y textos", (clave) => {
    for (const valor of [-1, -0, 1.5, "3", true, null]) {
      expect(() => valorDelParametro(clave, valor)).toThrow();
    }
  });

  it.each([
    ["MINUTOS_CIERRE_ASISTENCIA", 0, "0"],
    ["MINUTOS_CIERRE_ASISTENCIA", 1440, "1440"],
    ["DIAS_RESERVA_PREINSCRIPCION", 0, "0"],
    ["DIAS_RESERVA_PREINSCRIPCION", 365, "365"],
    ["DIAS_AVISO_VENCIMIENTO", 0, "0"],
    ["DIAS_AVISO_VENCIMIENTO", 30, "30"],
    ["INASISTENCIAS_CONSECUTIVAS_INACTIVO", 1, "1"],
    ["INASISTENCIAS_CONSECUTIVAS_INACTIVO", 30, "30"],
  ] as const)("%s acepta %j y lo guarda como %j", (clave, valor, guardado) => {
    expect(valorDelParametro(clave, valor)).toBe(guardado);
  });

  it.each([
    ["MINUTOS_CIERRE_ASISTENCIA", 1441],
    ["DIAS_RESERVA_PREINSCRIPCION", 366],
    ["DIAS_AVISO_VENCIMIENTO", 31],
    ["INASISTENCIAS_CONSECUTIVAS_INACTIVO", 31],
  ] as const)("%s rechaza %j, por encima del tope", (clave, valor) => {
    expect(() => valorDelParametro(clave, valor)).toThrow();
  });

  it("INASISTENCIAS_CONSECUTIVAS_INACTIVO rechaza 0: todos los alumnos serían inactivos", () => {
    expect(() => valorDelParametro("INASISTENCIAS_CONSECUTIVAS_INACTIVO", 0)).toThrow();
  });

  it.each(["20:00", "00:00", "23:59", " 08:30 "])(
    "HORA_RESUMEN_DIARIO acepta formato HH:MM válido: %j",
    (valor) => {
      expect(valorDelParametro("HORA_RESUMEN_DIARIO", valor)).toBe(valor.trim());
    },
  );

  it.each(["24:00", "20:60", "9:00", "20:0", "-1", "hola", 123, null])(
    "HORA_RESUMEN_DIARIO rechaza formato inválido: %j",
    (valor) => {
      expect(() => valorDelParametro("HORA_RESUMEN_DIARIO", valor)).toThrow();
    },
  );
});
