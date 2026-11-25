import { esMesEnCurso, esMesFuturo } from "@/features/reportes/utils/formato-inscripciones";
import type { AltasDelMes, BajasDelAnio, EstadisticasInscripciones, MotivoBaja } from "@/types/reportes";

// US-35: lo que arma el gráfico "Comparación entre años" y la línea "Para tener en cuenta". Todo se
// calcula con los años que trae el back, uno por pedido. Funciones puras.

export type Metrica = "altas" | "bajas" | "activos";

export const METRICAS: Record<Metrica, { nombre: string; detalle: string }> = {
  altas: { nombre: "Altas", detalle: "Alumnos que se dieron de alta cada mes" },
  bajas: { nombre: "Bajas", detalle: "Alumnos que se dieron de baja cada mes" },
  activos: { nombre: "Alumnos activos", detalle: "Alumnos activos al cierre de cada mes" },
};

const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** El valor del mes para la métrica; null si el mes todavía no empezó. */
export function valorDelMes(mes: AltasDelMes, metrica: Metrica, hoy: string): number | null {
  if (esMesFuturo(mes, hoy)) return null;
  if (metrica === "altas") return mes.cantidad;
  if (metrica === "bajas") return mes.bajas;
  return mes.activosAlCierre;
}

/** Los meses que ya terminaron: el mes en curso todavía va por la mitad y torcería la comparación. */
function mesesCerrados(meses: AltasDelMes[], hoy: string): AltasDelMes[] {
  return meses.filter((mes) => !esMesFuturo(mes, hoy) && !esMesEnCurso(mes, hoy));
}

function listaDeAnios(anios: number[]): string {
  if (anios.length === 3) return "los tres años";
  return anios.join(" y ");
}

function lecturaDeAltas(anios: EstadisticasInscripciones[], hoy: string): string | null {
  const mejores = anios.map((anio) => {
    const meses = mesesCerrados(anio.meses, hoy);
    return [...meses]
      .sort((a, b) => b.cantidad - a.cantidad || a.mes - b.mes)
      .slice(0, 2)
      .filter((mes) => mes.cantidad > 0)
      .map((mes) => mes.mes)
      .sort((a, b) => a - b);
  });
  const [primero] = mejores;
  if (!primero || primero.length < 2) return null;
  const repiten = mejores.every((meses) => meses.length === 2 && meses[0] === primero[0] && meses[1] === primero[1]);
  if (!repiten) return null;
  const [a, b] = primero.map((mes) => MES_LARGO[mes - 1]);
  return `${a} y ${b} son los meses con más altas en ${listaDeAnios(anios.map(({ anio }) => anio))}. Conviene llegar a esos meses con cupo libre en los horarios y con las promociones listas.`;
}

function lecturaDeBajas(anios: EstadisticasInscripciones[], hoy: string): string | null {
  // El mes con más bajas de cada año (todos si empatan). Si alguno se repite en todos los años, es un patrón.
  const picos = anios.map((anio) => {
    const meses = mesesCerrados(anio.meses, hoy);
    const maximo = Math.max(0, ...meses.map((mes) => mes.bajas));
    return new Set(maximo === 0 ? [] : meses.filter((mes) => mes.bajas === maximo).map((mes) => mes.mes));
  });
  const enTodos = [...(picos[0] ?? [])].filter((mes) => picos.every((meses) => meses.has(mes))).sort((a, b) => a - b);
  if (enTodos.length === 0) return null;
  const mes = MES_LARGO[enTodos[0] - 1];
  return `${mes} es el mes con más bajas en ${listaDeAnios(anios.map(({ anio }) => anio))}. Conviene revisar qué pasa en esa época y anticiparse.`;
}

function lecturaDeActivos(anios: EstadisticasInscripciones[], hoy: string): string | null {
  const actual = anios[anios.length - 1];
  const anterior = anios[anios.length - 2];
  const cierre = actual && mesesCerrados(actual.meses, hoy).at(-1);
  if (!actual || !anterior || !cierre || cierre.activosAlCierre === null) return null;
  const mismoMes = anterior.meses.find((mes) => mes.mes === cierre.mes)?.activosAlCierre;
  if (mismoMes === null || mismoMes === undefined) return null;
  const diferencia = cierre.activosAlCierre - mismoMes;
  const comparado =
    diferencia === 0
      ? `los mismos que en ${MES_LARGO[cierre.mes - 1]} de ${anterior.anio}`
      : `${Math.abs(diferencia)} ${diferencia > 0 ? "más" : "menos"} que en ${MES_LARGO[cierre.mes - 1]} de ${anterior.anio}`;
  return `el centro terminó ${MES_LARGO[cierre.mes - 1]} con ${cierre.activosAlCierre} alumnos activos, ${comparado}.`;
}

/**
 * La línea "Para tener en cuenta": una regla por métrica sobre los años elegidos (del más viejo al más
 * nuevo). null si hay un solo año o si los números no muestran un patrón claro: mejor no decir nada que
 * forzar una conclusión.
 */
export function lecturaDelGrafico(anios: EstadisticasInscripciones[], metrica: Metrica, hoy: string): string | null {
  if (anios.length < 2) return null;
  if (metrica === "altas") return lecturaDeAltas(anios, hoy);
  if (metrica === "bajas") return lecturaDeBajas(anios, hoy);
  return lecturaDeActivos(anios, hoy);
}

export const NOMBRE_MOTIVO: Record<MotivoBaja, string> = {
  ABANDONO: "Abandono",
  ECONOMICO: "Económico",
  MUDANZA: "Mudanza",
  SALUD: "Salud",
  CAMBIO_PLAN: "Cambio de plan",
  OTRO: "Otro",
};

export interface MotivoResumido {
  nombre: string;
  cantidad: number;
  /** "Otros" y "Cambio de plan" van en gris: no son alumnos que se perdieron por un motivo concreto. */
  secundario: boolean;
}

/**
 * Los tres motivos concretos con más bajas y el resto junto en "Otros", que también suma el motivo "Otro"
 * y las bajas sin motivo: así no aparecen "Otro" y "Otros" por separado.
 */
export function motivosPrincipales(motivos: BajasDelAnio["motivos"]): MotivoResumido[] {
  const concretos = motivos.filter((m): m is { motivo: Exclude<MotivoBaja, "OTRO">; cantidad: number } => m.motivo !== null && m.motivo !== "OTRO");
  const principales = concretos.slice(0, 3).map(({ motivo, cantidad }) => ({
    nombre: NOMBRE_MOTIVO[motivo],
    cantidad,
    secundario: motivo === "CAMBIO_PLAN",
  }));
  const enPrincipales = principales.reduce((total, { cantidad }) => total + cantidad, 0);
  const resto = motivos.reduce((total, { cantidad }) => total + cantidad, 0) - enPrincipales;
  return resto > 0 ? [...principales, { nombre: "Otros", cantidad: resto, secundario: true }] : principales;
}

/** "+3", "−2" o "=". */
export function conSigno(valor: number): string {
  if (valor === 0) return "=";
  return `${valor > 0 ? "+" : "−"}${Math.abs(valor)}`;
}
