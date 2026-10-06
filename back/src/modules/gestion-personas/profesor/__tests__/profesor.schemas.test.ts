import { describe, expect, it } from "vitest";
import { crearProfesoraSchema } from "../profesor.schemas.js";

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

  it.each(["-0", "123", "Pilates\u0000", "a".repeat(81)])("rechaza la especialidad %j", (especialidad) => {
    expect(crearProfesoraSchema.safeParse({ id_usuario: 1, especialidad }).success).toBe(false);
  });

  it("acepta una especialidad con letras", () => {
    expect(crearProfesoraSchema.parse({ id_usuario: 1, especialidad: " Pilates " }).especialidad).toBe(
      "Pilates",
    );
  });
});
