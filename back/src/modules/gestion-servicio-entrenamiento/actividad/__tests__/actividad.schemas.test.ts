import { describe, expect, it } from "vitest";
import {
  actividadIdParamSchema,
  actualizarActividadSchema,
  crearActividadSchema,
  listarActividadQuerySchema,
} from "../actividad.schemas.js";

const minimo = { codigo: "FUNCIONAL", nombre: "Funcional Grupal", modalidad: "GRUPAL" };

describe("crearActividadSchema", () => {
  it("normaliza el código a mayúsculas", () => {
    expect(crearActividadSchema.parse({ ...minimo, codigo: " entrenamiento_pers " }).codigo).toBe(
      "ENTRENAMIENTO_PERS",
    );
  });

  it.each(["-0", "0", "123", "A B", "ÑANDU", "<SCRIPT>", "A\u0000", "", "A".repeat(21)])(
    "rechaza el código %j",
    (codigo) => {
      expect(crearActividadSchema.safeParse({ ...minimo, codigo }).success).toBe(false);
    },
  );

  it.each(["ENTRENAMIENTO_PERS", "HIIT-2", "A".repeat(20)])("acepta el código %j", (codigo) => {
    expect(crearActividadSchema.safeParse({ ...minimo, codigo }).success).toBe(true);
  });

  it.each(["-0", "123", "!!!", "", "   ", "GAP\u0000", "a".repeat(61)])("rechaza el nombre %j", (nombre) => {
    expect(crearActividadSchema.safeParse({ ...minimo, nombre }).success).toBe(false);
  });

  it("guarda una descripción vacía como null", () => {
    expect(crearActividadSchema.parse({ ...minimo, descripcion: "  " }).descripcion).toBeNull();
  });

  it("acepta saltos de línea en la descripción", () => {
    const descripcion = "Clase grupal.\nTraer colchoneta.";

    expect(crearActividadSchema.parse({ ...minimo, descripcion }).descripcion).toBe(descripcion);
  });

  it.each(["-0", "Texto\u0000", "a".repeat(256)])("rechaza la descripción %j", (descripcion) => {
    expect(crearActividadSchema.safeParse({ ...minimo, descripcion }).success).toBe(false);
  });

  // Prisma guarda cupo_maximo en un SMALLINT.
  it.each([-0, 0, -1, 1.5, 32768, "10", Number.NaN, Number.POSITIVE_INFINITY])(
    "rechaza el cupo máximo %j",
    (cupo_maximo) => {
      expect(crearActividadSchema.safeParse({ ...minimo, cupo_maximo }).success).toBe(false);
    },
  );

  it.each([1, 32767, null])("acepta el cupo máximo %j", (cupo_maximo) => {
    expect(crearActividadSchema.safeParse({ ...minimo, cupo_maximo }).success).toBe(true);
  });

  it("exige cupo máximo en la modalidad PERSONALIZADA", () => {
    expect(crearActividadSchema.safeParse({ ...minimo, modalidad: "PERSONALIZADA" }).success).toBe(false);
    expect(
      crearActividadSchema.safeParse({ ...minimo, modalidad: "PERSONALIZADA", cupo_maximo: 1 }).success,
    ).toBe(true);
  });
});

describe("requiere_medidas", () => {
  it("es opcional y solo acepta booleanos", () => {
    expect(crearActividadSchema.parse(minimo)).not.toHaveProperty("requiere_medidas");
    expect(crearActividadSchema.parse({ ...minimo, requiere_medidas: true })).toMatchObject({
      requiere_medidas: true,
    });
    expect(crearActividadSchema.safeParse({ ...minimo, requiere_medidas: "true" }).success).toBe(false);
    expect(actualizarActividadSchema.parse({ requiere_medidas: false })).toEqual({ requiere_medidas: false });
    expect(actualizarActividadSchema.safeParse({ requiere_medidas: 1 }).success).toBe(false);
  });
});

describe("actualizarActividadSchema", () => {
  it("permite borrar la descripción mandando un texto vacío", () => {
    expect(actualizarActividadSchema.parse({ descripcion: "" })).toEqual({ descripcion: null });
  });

  it("aplica las mismas reglas de nombre y cupo que al crear", () => {
    expect(actualizarActividadSchema.safeParse({ nombre: "-0" }).success).toBe(false);
    expect(actualizarActividadSchema.safeParse({ cupo_maximo: -0 }).success).toBe(false);
  });

  it("descarta el código: no se puede cambiar", () => {
    expect(actualizarActividadSchema.parse({ nombre: "GAP", codigo: "OTRO" })).toEqual({ nombre: "GAP" });
  });
});

describe("listarActividadQuerySchema", () => {
  it("convierte incluirBajas de texto a booleano y rechaza otro valor", () => {
    expect(listarActividadQuerySchema.parse({ incluirBajas: "true" })).toEqual({ incluirBajas: true });
    expect(listarActividadQuerySchema.parse({ incluirBajas: "false" })).toEqual({ incluirBajas: false });
    expect(listarActividadQuerySchema.safeParse({ incluirBajas: "1" }).success).toBe(false);
  });

  it("rechaza una búsqueda con caracteres de control o más larga de 60", () => {
    expect(listarActividadQuerySchema.safeParse({ busqueda: "yo\u0000ga" }).success).toBe(false);
    expect(listarActividadQuerySchema.safeParse({ busqueda: "a".repeat(61) }).success).toBe(false);
  });
});

describe("actividadIdParamSchema", () => {
  it.each(["-0", "0", "0x10", "1e1"])("rechaza el id %j", (id) => {
    expect(actividadIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});
