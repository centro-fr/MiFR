import { describe, expect, it } from "vitest";
import { actualizarProfesoraSchema, crearProfesoraSchema } from "../profesor.schemas.js";

describe("crearProfesoraSchema", () => {
  it.each([-0, 0, 1.5, "1"])("rechaza el id_usuario %j", (id_usuario) => {
    expect(crearProfesoraSchema.safeParse({ id_usuario }).success).toBe(false);
  });

  it("guarda una especialidad vacía como null", () => {
    expect(crearProfesoraSchema.parse({ id_usuario: 1, especialidad: "  " })).toEqual({
      id_usuario: 1,
      especialidad: null,
    });
  });

  it.each(["-0", "123", "Posing\u0000", "a".repeat(81)])("rechaza la especialidad %j", (especialidad) => {
    expect(crearProfesoraSchema.safeParse({ id_usuario: 1, especialidad }).success).toBe(false);
  });

  it("acepta una especialidad con letras", () => {
    expect(crearProfesoraSchema.parse({ id_usuario: 1, especialidad: " Posing " }).especialidad).toBe(
      "Posing",
    );
  });
});

describe("actualizarProfesoraSchema", () => {
  it("acepta una especialidad y la reincorporación", () => {
    expect(actualizarProfesoraSchema.parse({ especialidad: " Posing ", reactivar: true })).toEqual({
      especialidad: "Posing",
      reactivar: true,
    });
  });

  it("acepta actualizar solo la especialidad o solo reincorporar", () => {
    expect(actualizarProfesoraSchema.parse({ especialidad: "Funcional" })).toEqual({
      especialidad: "Funcional",
    });
    expect(actualizarProfesoraSchema.parse({ reactivar: true })).toEqual({ reactivar: true });
  });

  it.each([{}, { reactivar: false }, { reactivar: "true" }, { especialidad: "a".repeat(81) }])(
    "rechaza una actualización inválida %j",
    (input) => {
      expect(actualizarProfesoraSchema.safeParse(input).success).toBe(false);
    },
  );
});
