import { tarifaVigente } from "@/features/honorarios/utils/formato-honorarios";
import type { TarifaHonorario } from "@/types/honorarios";
import type { Suplencia } from "@/types/suplencia";

function minutos(hora: string): number {
  const [horas = 0, minutosDeLaHora = 0] = hora.split(":").map(Number);
  return horas * 60 + minutosDeLaHora;
}

/** Cuántas horas dura la clase (09:00 a 10:30 son 1,5). */
export function horasDeLaClase({ horaInicio, horaFin }: Pick<Suplencia, "horaInicio" | "horaFin">): number {
  return Math.max(0, minutos(horaFin) - minutos(horaInicio)) / 60;
}

/**
 * Lo que se le paga a quien cubrió: su valor por hora de suplencia vigente el día de la clase, por la
 * duración. Es lo mismo que suma el back al liquidar. null si no tiene valor por hora cargado; 0 si la
 * clase se canceló, porque no se dictó.
 */
export function montoDeLaSuplencia(suplencia: Suplencia, tarifas: TarifaHonorario[]): number | null {
  if (suplencia.estadoClase === "CANCELADA") return 0;
  const delSuplente = tarifas.filter(
    (tarifa) => tarifa.concepto === "HORA_SUPLENCIA" && String(tarifa.idProfesora) === suplencia.suplente.id,
  );
  const tarifa = tarifaVigente(delSuplente, suplencia.fechaClase.slice(0, 10));
  if (!tarifa) return null;
  return Math.round(tarifa.valor * horasDeLaClase(suplencia) * 100) / 100;
}
