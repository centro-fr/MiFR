import { describe, expect, it } from "vitest";
import { homePathForRoles } from "@/types/auth";

// US-01, "Éxito → redirección según rol" y "una misma persona puede tener más de un rol".
describe("homePathForRoles", () => {
  it.each([
    [["PROPIETARIA"], "/app/dashboard"],
    [["PROFESORA"], "/app/hoy"],
    [["ALUMNO"], "/app/inicio"],
    [["TUTOR"], "/app/inicio"],
  ] as const)("%j lleva a %s", (roles, ruta) => {
    expect(homePathForRoles([...roles])).toBe(ruta);
  });

  it("propietaria + profesora: entra por la pantalla de propietaria", () => {
    expect(homePathForRoles(["PROFESORA", "PROPIETARIA"])).toBe("/app/dashboard");
  });
});
