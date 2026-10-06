import { describe, expect, it } from "vitest";
import { textoBusquedaSchema, textoOpcionalSchema, textoSchema } from "../esquemas-texto.js";

describe("textoSchema", () => {
  const schema = textoSchema(10);

  it("recorta los espacios de los extremos", () => {
    expect(schema.parse("  Pilates ")).toBe("Pilates");
  });

  it.each(["", "   ", "-0", "0", "123", "!!!", "---"])("rechaza %j porque no tiene letras", (valor) => {
    expect(schema.safeParse(valor).success).toBe(false);
  });

  // Postgres rechaza el 0x00 en columnas de texto y el error llegaba como 500.
  it.each(["a\u0000b", "a\u0007", "a​b", "a‮b", "a\nb", "a\tb"])(
    "rechaza %j porque tiene caracteres de control o invisibles",
    (valor) => {
      expect(schema.safeParse(valor).success).toBe(false);
    },
  );

  it("rechaza un texto más largo que el máximo", () => {
    expect(schema.safeParse("a".repeat(11)).success).toBe(false);
    expect(schema.safeParse("a".repeat(10)).success).toBe(true);
  });

  it.each(["Funcional 2", "Zumba®", "Yoga & Pilates", "Ñandú"])("acepta %j", (valor) => {
    expect(textoSchema(60).safeParse(valor).success).toBe(true);
  });

  it("con multilinea acepta saltos de línea pero no otros caracteres de control", () => {
    const multilinea = textoSchema(20, { multilinea: true });

    expect(multilinea.safeParse("Línea 1\r\nLínea 2").success).toBe(true);
    expect(multilinea.safeParse("Línea\u0000 1").success).toBe(false);
  });
});

describe("textoOpcionalSchema", () => {
  const schema = textoOpcionalSchema(10);

  it.each(["", "   ", null])("convierte %j en null", (valor) => {
    expect(schema.parse(valor)).toBeNull();
  });

  it("aplica las reglas de textoSchema a un texto con contenido", () => {
    expect(schema.parse(" Pilates ")).toBe("Pilates");
    expect(schema.safeParse("-0").success).toBe(false);
    expect(schema.safeParse("a\u0000").success).toBe(false);
  });

  it("rechaza lo que no es texto", () => {
    expect(schema.safeParse(0).success).toBe(false);
  });
});

describe("textoBusquedaSchema", () => {
  const schema = textoBusquedaSchema(10);

  it("acepta un texto vacío o sin letras", () => {
    expect(schema.parse("  ")).toBe("");
    expect(schema.parse("123")).toBe("123");
  });

  it("rechaza caracteres de control y textos más largos que el máximo", () => {
    expect(schema.safeParse("a\u0000").success).toBe(false);
    expect(schema.safeParse("a".repeat(11)).success).toBe(false);
  });
});
