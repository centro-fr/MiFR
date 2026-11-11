export type TipoInsignia = "MES_PERFECTO" | "RACHA" | "TOTAL_CLASES" | "PODIO_MES";

export interface InsigniaObtenida {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoInsignia;
  /** Clases para RACHA y TOTAL_CLASES: es el número que va dentro de la medalla. */
  valor_umbral: number;
}

const ORDEN_DE_TIPOS: TipoInsignia[] = ["MES_PERFECTO", "RACHA", "TOTAL_CLASES", "PODIO_MES"];

/** Una sola por tipo, la de umbral más alto: con la Racha de 25 la de 10 sobra. */
export function unaPorTipo(insignias: InsigniaObtenida[]): InsigniaObtenida[] {
  const mejores = new Map<TipoInsignia, InsigniaObtenida>();
  for (const insignia of insignias) {
    const actual = mejores.get(insignia.tipo);
    if (!actual || insignia.valor_umbral > actual.valor_umbral) mejores.set(insignia.tipo, insignia);
  }
  return ORDEN_DE_TIPOS.flatMap((tipo) => mejores.get(tipo) ?? []);
}

/** Racha y Clases tienen varios niveles: el número los distingue (10, 25, 50, 100). */
export function llevaNumero(tipo: TipoInsignia): boolean {
  return tipo === "RACHA" || tipo === "TOTAL_CLASES";
}
