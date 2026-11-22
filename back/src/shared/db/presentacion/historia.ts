import { instanteArgentino } from "../../utils/fecha-argentina.js";
import type { PerfilDePago } from "./elenco.js";

// Cálculos puros con los que se arma la historia de la presentación: las fechas, el azar con
// semilla (la misma base sale igual cada vez que se carga) y las cuotas de cada inscripción, con las
// mismas reglas que aplica la API al cobrar (CuotaService y CalculadorVencimientoCuota).

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function sumarDias(dia: Date, dias: number): Date {
  return new Date(dia.getTime() + dias * MS_POR_DIA);
}

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA);
}

// De 1 (lunes) a 7 (domingo).
export function diaDeLaSemana(dia: Date): number {
  return dia.getUTCDay() === 0 ? 7 : dia.getUTCDay();
}

export function primerDiaDelMes(dia: Date, mesesDeDiferencia = 0): Date {
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + mesesDeDiferencia, 1));
}

// La columna TIME: Prisma la entrega el 1970-01-01 en UTC.
export function hora(texto: string): Date {
  const [horas, minutos] = texto.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

export function unaHoraDespues(texto: string): string {
  return `${String(Number(texto.slice(0, 2)) + 1).padStart(2, "0")}:00`;
}

// El instante real de un día del centro a una hora argentina, más unos minutos.
export function instante(dia: Date, texto: string, minutosExtra = 0): Date {
  return new Date(instanteArgentino(dia, hora(texto)).getTime() + minutosExtra * 60_000);
}

// Mismo cálculo que vencimientoMensual del CalculadorVencimientoCuota: de fecha a fecha, y el último
// día del mes siguiente si ese mes no tiene el día.
export function vencimientoMensual(desde: Date): Date {
  const anio = desde.getUTCFullYear();
  const mes = desde.getUTCMonth();
  const ultimoDiaDelMesSiguiente = new Date(Date.UTC(anio, mes + 2, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes + 1, Math.min(desde.getUTCDate(), ultimoDiaDelMesSiguiente)));
}

export type Azar = () => number;

// mulberry32: chico, rápido y con semilla. No es para nada criptográfico, solo para que la carga sea
// reproducible.
export function crearAzar(semilla: string): Azar {
  let estado = [...semilla].reduce(
    (acumulado, letra) => Math.imul(acumulado ^ letra.charCodeAt(0), 2654435761),
    7,
  );
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function enteroAlAzar(azar: Azar, minimo: number, maximo: number): number {
  return minimo + Math.floor(azar() * (maximo - minimo + 1));
}

export type TipoDePagoPlaneado = "confirmado" | "pendiente" | "rechazado_y_efectivo";

export interface PagoPlaneado {
  // El día en que paga. En "rechazado_y_efectivo", el de la transferencia rechazada; el efectivo
  // llega al día siguiente.
  dia: Date;
  vencimiento: Date;
  tipo: TipoDePagoPlaneado;
}

export interface HistoriaDePagos {
  inicio: Date;
  pagos: PagoPlaneado[];
}

const DIAS_DE_GRACIA = 5;

interface Simulacion {
  inicio: Date;
  hoy: Date;
  perfil: PerfilDePago;
  azar: Azar;
  // La baja: no paga desde ese día.
  limite: Date | null;
}

// Si hoy queda en el estado que pide el perfil, deja de pagar ahí.
function alcanzoElEstado(perfil: PerfilDePago, vencimiento: Date, hoy: Date): boolean {
  const diasVencida = diasEntre(vencimiento, hoy);
  if (perfil === "por_vencer") return diasVencida >= 1 && diasVencida <= DIAS_DE_GRACIA - 1;
  if (perfil === "vencida") return diasVencida >= DIAS_DE_GRACIA + 3 && diasVencida <= 35;
  return false;
}

function diaDelProximoPago(perfil: PerfilDePago, vencimiento: Date, azar: Azar): Date {
  if (perfil === "tarde") return sumarDias(vencimiento, enteroAlAzar(azar, 1, DIAS_DE_GRACIA - 1));
  return sumarDias(vencimiento, -enteroAlAzar(azar, 0, 3));
}

// El día en que el perfil "transferencia_*" informa la última transferencia, que queda pendiente.
function diaDeLaPendiente(perfil: PerfilDePago, hoy: Date): Date | null {
  if (perfil === "transferencia_pendiente") return hoy;
  if (perfil === "transferencia_demorada") return sumarDias(hoy, -2);
  return null;
}

// Pago adelantado (US-15): al día, la cuota nueva sigue el día después del vencimiento vigente; si
// ya venció, cubre desde el pago (CuotaService.desdeCuandoCubre).
function vencimientoDelPago(dia: Date, vigente: Date): Date {
  return vencimientoMensual(dia <= vigente ? sumarDias(vigente, 1) : dia);
}

function simular({ inicio, hoy, perfil, azar, limite }: Simulacion): PagoPlaneado[] | null {
  let vigente = vencimientoMensual(inicio);
  const pagos: PagoPlaneado[] = [{ dia: inicio, vencimiento: vigente, tipo: "confirmado" }];
  const pendiente = diaDeLaPendiente(perfil, hoy);

  for (;;) {
    if (alcanzoElEstado(perfil, vigente, hoy)) return pagos;
    const dia = diaDelProximoPago(perfil, vigente, azar);
    if (limite && dia >= limite) return pagos;
    if (pendiente && dia > pendiente) return null;
    if (dia > hoy) return perfil === "por_vencer" || perfil === "vencida" ? null : pagos;
    if (pendiente && dia.getTime() === pendiente.getTime()) {
      pagos.push({ dia, vencimiento: vencimientoDelPago(dia, vigente), tipo: "pendiente" });
      return pagos;
    }

    const rechazo = perfil === "transferencia_rechazada" && pagos.length === 1;
    // El efectivo que reemplaza a la transferencia rechazada llega al día siguiente.
    const diaEfectivo = rechazo ? sumarDias(dia, 1) : dia;
    if (diaEfectivo > hoy) return null;
    vigente = vencimientoDelPago(diaEfectivo, vigente);
    pagos.push({ dia, vencimiento: vigente, tipo: rechazo ? "rechazado_y_efectivo" : "confirmado" });
  }
}

// Corre el día de inicio de a uno (hacia atrás y hacia adelante) hasta que la historia termina hoy en
// el estado que pide el perfil: así el escenario se cumple cualquiera sea el día en que se carga.
export function planearPagos(
  inicioPedido: Date,
  hoy: Date,
  perfil: PerfilDePago,
  azar: () => number,
  limite: Date | null = null,
): HistoriaDePagos {
  for (let corrimiento = 0; corrimiento <= 60; corrimiento++) {
    const desplazamiento = corrimiento % 2 === 0 ? corrimiento / 2 : -(corrimiento + 1) / 2;
    const inicio = sumarDias(inicioPedido, -desplazamiento);
    if (inicio >= hoy || (limite && inicio >= limite)) continue;
    const pagos = simular({ inicio, hoy, perfil, azar, limite });
    if (pagos) return { inicio, pagos };
  }
  throw new Error(
    `No se pudo armar una historia "${perfil}" que empiece cerca del ${inicioPedido.toISOString()}`,
  );
}
