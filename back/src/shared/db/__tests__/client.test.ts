import { describe, expect, it } from "vitest";
import { opcionesDelClientePrisma } from "../client.js";

describe("opcionesDelClientePrisma", () => {
  it("en desarrollo registra advertencias y errores de Prisma", () => {
    expect(opcionesDelClientePrisma("development")).toEqual({ log: ["warn", "error"] });
  });

  it.each(["production", undefined])("con NODE_ENV=%s registra solo errores", (entorno) => {
    expect(opcionesDelClientePrisma(entorno)).toEqual({ log: ["error"] });
  });
});
