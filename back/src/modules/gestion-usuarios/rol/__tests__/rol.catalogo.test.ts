import { describe, expect, it } from "vitest";
import {
  CATALOGO_PERMISOS,
  MATRIZ_INICIAL,
  PERMISOS_CRITICOS,
  PERMISOS_EXCLUSIVOS_PROPIETARIA,
} from "../rol.catalogo.js";

const codigos = CATALOGO_PERMISOS.map((permiso) => permiso.codigo);

describe("catálogo de permisos", () => {
  it("no repite códigos", () => {
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("respeta los largos del DER (codigo 50, modulo 30, descripcion 150)", () => {
    for (const { codigo, modulo, descripcion } of CATALOGO_PERMISOS) {
      expect(codigo.length).toBeLessThanOrEqual(50);
      expect(modulo.length).toBeLessThanOrEqual(30);
      expect(descripcion.length).toBeLessThanOrEqual(150);
    }
  });

  it("todo código empieza con el nombre de su módulo", () => {
    for (const { codigo, modulo } of CATALOGO_PERMISOS) expect(codigo.startsWith(`${modulo}_`)).toBe(true);
  });

  it("la propietaria arranca con todos los permisos, incluidos los críticos", () => {
    expect([...MATRIZ_INICIAL.PROPIETARIA].sort()).toEqual([...codigos].sort());
    for (const critico of PERMISOS_CRITICOS) expect(MATRIZ_INICIAL.PROPIETARIA).toContain(critico);
  });

  it("ningún otro rol arranca con un permiso exclusivo de la propietaria", () => {
    for (const rol of ["PROFESORA", "ALUMNO", "TUTOR"] as const) {
      for (const exclusivo of PERMISOS_EXCLUSIVOS_PROPIETARIA) {
        expect(MATRIZ_INICIAL[rol]).not.toContain(exclusivo);
      }
    }
  });

  it("los exclusivos de la propietaria también son críticos", () => {
    for (const exclusivo of PERMISOS_EXCLUSIVOS_PROPIETARIA) expect(PERMISOS_CRITICOS).toContain(exclusivo);
  });
});
