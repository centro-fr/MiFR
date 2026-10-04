import { describe, expect, it } from "vitest";
import { leerOrigenesPermitidos } from "../origenes-permitidos.js";

describe("leerOrigenesPermitidos", () => {
  it("separa la lista por comas y recorta los espacios", () => {
    expect(leerOrigenesPermitidos(" https://mifr.netlify.app , http://localhost:5173 ")).toEqual([
      "https://mifr.netlify.app",
      "http://localhost:5173",
    ]);
  });

  it("ignora los elementos vacíos", () => {
    expect(leerOrigenesPermitidos("https://mifr.netlify.app,,")).toEqual(["https://mifr.netlify.app"]);
  });

  it("devuelve undefined si la variable no está o está vacía", () => {
    expect(leerOrigenesPermitidos(undefined)).toBeUndefined();
    expect(leerOrigenesPermitidos(" , ")).toBeUndefined();
  });
});
