import { describe, expect, it } from "vitest";
import {
  buscarEjerciciosDelCatalogo,
  transformarEjerciciosDataset,
  type EjercicioDataset,
} from "@/features/rutinas/data/catalogo-ejercicios";

const ejercicio: EjercicioDataset = {
  id: "0001",
  nombre: "3/4 sit-up",
  categoria: "waist",
  equipamiento: "body weight",
  instrucciones: [
    "Túmbate boca arriba y activa el abdomen.",
    "Repite el movimiento.",
  ],
};

describe("catálogo de ejercicios", () => {
  it("transformarEjerciciosDataset traduce los datos descriptivos y conserva pasos en español", () => {
    expect(transformarEjerciciosDataset([ejercicio])).toEqual([
      {
        id: "dataset-0001",
        nombre: "3/4 sit-up",
        grupo_muscular: "Abdomen",
        equipamiento: "Peso corporal",
        instrucciones: ejercicio.instrucciones,
      },
    ]);
  });

  it("buscarEjerciciosDelCatalogo encuentra ejercicios por instrucciones en español sin acentos", () => {
    const catalogo = transformarEjerciciosDataset([ejercicio]);

    expect(buscarEjerciciosDelCatalogo("activa el abdomen", catalogo)).toEqual(
      catalogo,
    );
  });

  it("transformarEjerciciosDataset rechaza ejercicios sin instrucciones en español", () => {
    expect(() =>
      transformarEjerciciosDataset([{ ...ejercicio, instrucciones: [] }]),
    ).toThrow();
  });
});
