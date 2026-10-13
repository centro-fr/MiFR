import type { Transferencia } from "@/types/transferencia";

// US-17: la propietaria tiene 24 horas desde la carga para revisar cada transferencia. Funciones
// puras: se testean sin render.

export const HORAS_PLAZO = 24;
// La spec pinta en amarillo desde la mitad del plazo.
const HORAS_ALERTA = 12;

/** Verde: menos de 12 h · Amarillo: entre 12 y 24 h · Rojo: 24 h o más ("vencida en verificación"). */
export type TramoPlazo = "a-tiempo" | "por-vencer" | "vencida";

export const TRAMOS: readonly TramoPlazo[] = ["a-tiempo", "por-vencer", "vencida"];

type ConPlazo = Pick<Transferencia, "horasDesdeLaCarga" | "superaPlazo">;

export function tramoDePlazo({ horasDesdeLaCarga, superaPlazo }: ConPlazo): TramoPlazo {
  if (superaPlazo || horasDesdeLaCarga >= HORAS_PLAZO) return "vencida";
  return horasDesdeLaCarga >= HORAS_ALERTA ? "por-vencer" : "a-tiempo";
}

/** Las horas enteras que da el back: 0 → "menos de 1 h", 26 → "26 h". */
export function textoHoras(horas: number): string {
  return horas < 1 ? "menos de 1 h" : `${horas} h`;
}

const ETIQUETA_TRAMO: Record<TramoPlazo, string> = {
  "a-tiempo": "A tiempo",
  "por-vencer": "Por vencer",
  vencida: "Vencida en verificación",
};

export function etiquetaTramo(tramo: TramoPlazo): string {
  return ETIQUETA_TRAMO[tramo];
}

/** Lo que queda del plazo, para el aviso del detalle: "Quedan 9 h para responder a tiempo". */
export function textoTiempoRestante(horasDesdeLaCarga: number): string {
  const restantes = Math.max(HORAS_PLAZO - horasDesdeLaCarga, 0);
  return restantes <= 1 ? "Queda menos de 1 h para responder a tiempo" : `Quedan ${restantes} h para responder a tiempo`;
}

export function contarPorTramo(pendientes: ConPlazo[]): Record<TramoPlazo, number> {
  const cuenta: Record<TramoPlazo, number> = { "a-tiempo": 0, "por-vencer": 0, vencida: 0 };
  for (const transferencia of pendientes) cuenta[tramoDePlazo(transferencia)] += 1;
  return cuenta;
}
