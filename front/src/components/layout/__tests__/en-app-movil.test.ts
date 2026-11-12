import { House, Trophy } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ordenEnLaBarra } from "../en-app-movil";
import type { ItemConEstado } from "../use-owner-navigation";

const item = (etiqueta: string, destacado = false): ItemConEstado => ({ etiqueta, icono: destacado ? House : Trophy, to: `/app/${etiqueta}`, esActivo: false, destacado });

describe("ordenEnLaBarra", () => {
  it("pone el ítem destacado en el medio de la barra inferior", () => {
    const orden = ordenEnLaBarra([item("inicio", true), item("clases"), item("rutina"), item("ranking"), item("perfil")]);
    expect(orden.map((i) => i.etiqueta)).toEqual(["clases", "rutina", "inicio", "ranking", "perfil"]);
  });

  it("sin destacado deja el orden del menú", () => {
    const items = [item("hoy"), item("alumnos")];
    expect(ordenEnLaBarra(items)).toEqual(items);
  });
});

describe("menú de la profesora", () => {
  it("tiene cinco secciones y en la barra del celular el Inicio va al medio", async () => {
    const { ITEMS_PROFESORA } = await import("../owner-navigation");
    expect(ITEMS_PROFESORA.map((i) => i.etiqueta)).toEqual(["Inicio", "Mis clases", "Alumnos", "Ranking", "Perfil"]);
    const enLaBarra = ordenEnLaBarra(ITEMS_PROFESORA.map((i) => ({ ...i, hijos: undefined, contador: undefined, esActivo: false })));
    expect(enLaBarra.map((i) => i.etiqueta)).toEqual(["Mis clases", "Alumnos", "Inicio", "Ranking", "Perfil"]);
  });
});
