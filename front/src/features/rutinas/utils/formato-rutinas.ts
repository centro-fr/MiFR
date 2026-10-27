import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { CODIGOS_MEDIDA, MEDIDAS, esCodigoMedida } from "@/features/rutinas/schemas/medidas";
import type { EjercicioDeRutina, Medicion, MedidaRegistrada, Rutina } from "@/types/rutinas";

const FORMATO_VALOR = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** "Del 01/10/2026 al 30/11/2026" o "Desde el 01/10/2026" si no tiene fin. */
export function periodoDeLaRutina({ desde, hasta }: Pick<Rutina, "desde" | "hasta">): string {
  return hasta ? `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}` : `Desde el ${formatearFecha(desde)}`;
}

/** "Del 01/10/2026 al 30/11/2026 · la armó Lucía Gómez". Sin el nombre si la profesora ya no está activa. */
export function lineaDeLaRutina(rutina: Rutina, nombresDeProfesoras: Map<number, string>): string {
  const profesora = nombresDeProfesoras.get(rutina.idProfesora);
  return profesora ? `${periodoDeLaRutina(rutina)} · la armó ${profesora}` : periodoDeLaRutina(rutina);
}

/** "4 × 12" o "3 × 30 s". */
export function seriesPorRepeticiones({ series, repeticiones }: EjercicioDeRutina): string {
  return `${series} × ${repeticiones}`;
}

/** "62,4 kg" o "22,5 %". */
export function formatearMedida(valor: number, unidad: string): string {
  return `${FORMATO_VALOR.format(valor)} ${unidad}`;
}

/** "Peso", o el código tal cual si el back trae una medida que el catálogo del front no conoce. */
export function etiquetaDeMedida(codigo: string): string {
  return esCodigoMedida(codigo) ? MEDIDAS[codigo].etiqueta : codigo;
}

// Las del catálogo en su orden y al final cualquier otra que traiga el back.
function ordenDeMedida(codigo: string): number {
  const indice = (CODIGOS_MEDIDA as readonly string[]).indexOf(codigo);
  return indice === -1 ? CODIGOS_MEDIDA.length : indice;
}

function enOrden<T extends { codigo: string }>(medidas: T[]): T[] {
  return [...medidas].sort((a, b) => ordenDeMedida(a.codigo) - ordenDeMedida(b.codigo));
}

/** "Peso 62,4 kg · Cintura 74 cm". */
export function resumenDeMedidas(medidas: MedidaRegistrada[]): string {
  return enOrden(medidas)
    .map(({ codigo, valor, unidad }) => `${etiquetaDeMedida(codigo)} ${formatearMedida(valor, unidad)}`)
    .join(" · ");
}

export interface EvolucionDeMedida {
  codigo: string;
  unidad: string;
  actual: number;
  /** Diferencia con la primera vez que se tomó; null si se tomó una sola vez. */
  diferencia: number | null;
  /** AAAA-MM-DD de la primera vez que se tomó. */
  desde: string;
}

/** Último valor de cada medida y cuánto cambió desde la primera. `mediciones` va de la más reciente a la más antigua. */
export function evolucionPorMedida(mediciones: Medicion[]): EvolucionDeMedida[] {
  const porCodigo = new Map<string, EvolucionDeMedida>();
  for (const { fecha, medidas } of mediciones) {
    for (const { codigo, unidad, valor } of medidas) {
      const conocida = porCodigo.get(codigo);
      if (!conocida) {
        porCodigo.set(codigo, { codigo, unidad, actual: valor, diferencia: null, desde: fecha });
        continue;
      }
      porCodigo.set(codigo, { ...conocida, diferencia: Math.round((conocida.actual - valor) * 100) / 100, desde: fecha });
    }
  }
  return enOrden([...porCodigo.values()]);
}

/** "−1,6 kg desde el 01/03/2026", "+2 cm desde…" o "Igual que el 01/03/2026". */
export function describirDiferencia({ diferencia, unidad, desde }: EvolucionDeMedida): string | null {
  if (diferencia === null) return null;
  if (diferencia === 0) return `Igual que el ${formatearFecha(desde)}`;
  const signo = diferencia > 0 ? "+" : "−";
  return `${signo}${formatearMedida(Math.abs(diferencia), unidad)} desde el ${formatearFecha(desde)}`;
}

export interface PuntoDeEvolucion {
  /** AAAA-MM-DD. */
  fecha: string;
  valor: number;
}

/** Los valores de una medida en el tiempo, del más antiguo al más reciente, para el gráfico. */
export function serieDeLaMedida(mediciones: Medicion[], codigo: string): PuntoDeEvolucion[] {
  return mediciones
    .flatMap(({ fecha, medidas }) => medidas.filter((medida) => medida.codigo === codigo).map(({ valor }) => ({ fecha, valor })))
    .reverse();
}
