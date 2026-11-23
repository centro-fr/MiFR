// Catálogo de medidas del back (gestion-rutinas-y-progreso/progreso/medida.catalogo.ts): mismos
// códigos, unidades y rangos, para que un valor fuera de rango se vea en el formulario y no como un
// rechazo del servidor.

export const CODIGOS_MEDIDA = ["PESO", "TALLA", "PECHO", "CINTURA", "CADERA", "BRAZO", "PIERNA", "GRASA_CORPORAL"] as const;

export type CodigoMedida = (typeof CODIGOS_MEDIDA)[number];

interface DefinicionMedida {
  etiqueta: string;
  unidad: string;
  minimo: number;
  maximo: number;
}

export const MEDIDAS: Record<CodigoMedida, DefinicionMedida> = {
  PESO: { etiqueta: "Peso", unidad: "kg", minimo: 2, maximo: 400 },
  TALLA: { etiqueta: "Altura", unidad: "cm", minimo: 40, maximo: 250 },
  PECHO: { etiqueta: "Pecho", unidad: "cm", minimo: 20, maximo: 250 },
  CINTURA: { etiqueta: "Cintura", unidad: "cm", minimo: 20, maximo: 250 },
  CADERA: { etiqueta: "Cadera", unidad: "cm", minimo: 20, maximo: 250 },
  BRAZO: { etiqueta: "Brazo", unidad: "cm", minimo: 5, maximo: 100 },
  PIERNA: { etiqueta: "Pierna", unidad: "cm", minimo: 10, maximo: 150 },
  GRASA_CORPORAL: { etiqueta: "Grasa corporal", unidad: "%", minimo: 1, maximo: 70 },
};

export function esCodigoMedida(codigo: string): codigo is CodigoMedida {
  return (CODIGOS_MEDIDA as readonly string[]).includes(codigo);
}
