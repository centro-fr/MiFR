// Tipos de medida que acepta la carga de progreso (spec 09, RF-02). El código es el de tipos_medida; la
// unidad y el rango coherente salen de acá, no del pedido: así una medida no cambia de unidad entre
// registros. Peso y talla son las mismas que carga la pre-inscripción (US-05).
export const CODIGOS_MEDIDA = [
  "PESO",
  "TALLA",
  "PECHO",
  "CINTURA",
  "CADERA",
  "BRAZO",
  "PIERNA",
  "GRASA_CORPORAL",
] as const;

export type CodigoMedida = (typeof CODIGOS_MEDIDA)[number];

export interface DefinicionMedida {
  unidad: string;
  minimo: number;
  maximo: number;
}

export const MEDIDAS: Record<CodigoMedida, DefinicionMedida> = {
  PESO: { unidad: "kg", minimo: 2, maximo: 400 },
  TALLA: { unidad: "cm", minimo: 40, maximo: 250 },
  PECHO: { unidad: "cm", minimo: 20, maximo: 250 },
  CINTURA: { unidad: "cm", minimo: 20, maximo: 250 },
  CADERA: { unidad: "cm", minimo: 20, maximo: 250 },
  BRAZO: { unidad: "cm", minimo: 5, maximo: 100 },
  PIERNA: { unidad: "cm", minimo: 10, maximo: 150 },
  GRASA_CORPORAL: { unidad: "%", minimo: 1, maximo: 70 },
};
