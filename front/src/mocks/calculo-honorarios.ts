import {
  CLASES_SUPLIDAS_HONORARIOS,
  COBROS_HONORARIOS,
  INSCRIPCIONES_HONORARIOS,
  type CobroHonorariosMock,
  type InscripcionHonorariosMock,
  type LiquidacionDetalleMock,
  type LiquidacionMock,
  type TarifaHonorarioMock,
} from "@/mocks/data/honorarios";
import { PLAN_PRECIOS_SEMILLA, type InscripcionMock, type PagoMock } from "@/mocks/data/inscripciones";

// Réplica del cálculo del back para el mock de US-23: CalculadorHonorarios (rama sprint4-honorarios),
// IInfoInscripciones.aCargoEnPeriodo e IInfoClases.listarSuplidasEnPeriodo. Es puro: recibe las
// tarifas y las colecciones de inscripciones y cobros (desde db o data/honorarios.ts).

export type LineaCalculada = Omit<LiquidacionDetalleMock, "id_liq_detalle" | "id_liquidacion"> & { id_profesora: number };

export interface AdvertenciaCalculada {
  id_profesora: number;
  concepto: TarifaHonorarioMock["concepto"];
  motivo: "SIN_TARIFA" | "TARIFA_NO_APLICABLE";
  id_inscripcion: number | null;
  id_clase: number | null;
}

const TRES_HORAS_MS = 3 * 3_600_000;

/** Día de Argentina (UTC-3, sin horario de verano) de un instante. */
function diaArgentina(instante: string): string {
  return new Date(new Date(instante).getTime() - TRES_HORAS_MS).toISOString().slice(0, 10);
}

function redondearAlCentavo(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function limitesDelPeriodo(periodo: string): { desde: string; hasta: string } {
  const [anio, mes] = periodo.split("-").map(Number);
  return { desde: `${periodo}-01`, hasta: new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10) };
}

// Las que estuvieron ACTIVA algún día del mes: empezaron hasta el fin y no se dieron de baja antes
// del inicio. Las PREINSCRIPTA y las sin cargo no generan honorarios.
function aCargoEnElPeriodo(
  inscripcion: InscripcionMock | InscripcionHonorariosMock,
  desde: string,
  hasta: string,
): boolean {
  if (inscripcion.estado === "PREINSCRIPTA" || inscripcion.sin_cargo) return false;
  const diaInicio = inscripcion.fecha_inicio.slice(0, 10);
  if (diaInicio > hasta) return false;
  return inscripcion.fecha_baja === null || diaArgentina(inscripcion.fecha_baja) >= desde;
}

function cobradoEnElPeriodo(
  pagos: (PagoMock | CobroHonorariosMock)[],
  desde: string,
  hasta: string,
  inscripciones?: (InscripcionMock | InscripcionHonorariosMock)[],
): Map<number, number> {
  const cobrado = new Map<number, number>();
  for (const cobro of pagos) {
    if ("estado" in cobro && cobro.estado !== "CONFIRMADO") continue;
    const dia = diaArgentina(cobro.fecha_pago);
    if (dia < desde || dia > hasta) continue;

    // Los descuentos y promociones no deben afectar los honorarios de los profesores:
    // se toma el precio de lista para el cálculo de honorarios por alumno a cargo.
    const inscripcion = inscripciones?.find((i) => i.id_inscripcion === cobro.id_inscripcion);
    const precioLista = inscripcion ? PLAN_PRECIOS_SEMILLA.find((p) => p.id_plan === inscripcion.id_plan)?.precio : undefined;
    const montoCalculo = precioLista !== undefined ? Math.max(cobro.monto, precioLista) : cobro.monto;

    cobrado.set(cobro.id_inscripcion, (cobrado.get(cobro.id_inscripcion) ?? 0) + montoCalculo);
  }
  return cobrado;
}

function estaVigente(tarifa: TarifaHonorarioMock, dia: string): boolean {
  return tarifa.fecha_vigencia_desde <= dia && (tarifa.fecha_vigencia_hasta === null || tarifa.fecha_vigencia_hasta >= dia);
}

// El porcentaje por alumno es general (sin profesora) y la hora de suplencia, de cada profesora.
function buscarTarifa(tarifas: TarifaHonorarioMock[], concepto: TarifaHonorarioMock["concepto"], idProfesora: number | null, dia: string) {
  return tarifas.find((t) => t.concepto === concepto && t.id_profesora === idProfesora && estaVigente(t, dia));
}

// Se liquida al día en que terminó su período: el fin del mes, o el de la baja si fue antes.
function diaDeLaLinea(inscripcion: InscripcionMock | InscripcionHonorariosMock, hasta: string): string {
  if (inscripcion.fecha_baja === null) return hasta;
  const diaDeBaja = diaArgentina(inscripcion.fecha_baja);
  return diaDeBaja < hasta ? diaDeBaja : hasta;
}

function horasEntre(inicio: string, fin: string): number {
  const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
  return (minutos(fin) - minutos(inicio)) / 60;
}

function lineasDeAlumnos(
  tarifas: TarifaHonorarioMock[],
  inscripciones: (InscripcionMock | InscripcionHonorariosMock)[],
  pagos: (PagoMock | CobroHonorariosMock)[],
  desde: string,
  hasta: string,
) {
  const lineas: LineaCalculada[] = [];
  const advertencias: AdvertenciaCalculada[] = [];
  const cobrado = cobradoEnElPeriodo(pagos, desde, hasta, inscripciones);
  for (const inscripcion of inscripciones.filter((i) => aCargoEnElPeriodo(i, desde, hasta))) {
    const { id_profesora, id_inscripcion } = inscripcion;
    const tarifa = buscarTarifa(tarifas, "ALUMNO_A_CARGO", null, diaDeLaLinea(inscripcion, hasta));
    // Regla del Sprint 5: por alumno solo se paga un porcentaje de lo cobrado.
    if (!tarifa || tarifa.tipo_valor === "MONTO_FIJO") {
      const motivo = tarifa ? "TARIFA_NO_APLICABLE" : "SIN_TARIFA";
      advertencias.push({ id_profesora, concepto: "ALUMNO_A_CARGO", motivo, id_inscripcion, id_clase: null });
      continue;
    }
    const monto = redondearAlCentavo(((cobrado.get(id_inscripcion) ?? 0) * tarifa.valor) / 100);
    // Como el back: una inscripción que no cobró nada en el período no deja una línea de $ 0.
    if (monto === 0) continue;
    lineas.push({ id_profesora, concepto: "ALUMNO_A_CARGO", id_tarifa: tarifa.id_tarifa, id_inscripcion, id_clase: null, monto });
  }
  return { lineas, advertencias };
}

// Cada clase suplida suma a la suplente y resta a la ausente lo mismo, a la tarifa por hora de la suplente.
function lineasDeSuplencias(tarifas: TarifaHonorarioMock[], desde: string, hasta: string) {
  const lineas: LineaCalculada[] = [];
  const advertencias: AdvertenciaCalculada[] = [];
  for (const clase of CLASES_SUPLIDAS_HONORARIOS.filter((c) => c.fecha_clase >= desde && c.fecha_clase <= hasta)) {
    const { id_clase, id_prof_suplente, id_prof_ausente } = clase;
    const tarifa = buscarTarifa(tarifas, "HORA_SUPLENCIA", id_prof_suplente, clase.fecha_clase);
    if (!tarifa || tarifa.tipo_valor === "PORCENTAJE") {
      const motivo = tarifa ? "TARIFA_NO_APLICABLE" : "SIN_TARIFA";
      advertencias.push({ id_profesora: id_prof_suplente, concepto: "HORA_SUPLENCIA", motivo, id_inscripcion: null, id_clase });
      continue;
    }
    const monto = redondearAlCentavo(tarifa.valor * horasEntre(clase.hora_inicio, clase.hora_fin));
    const comun = { id_tarifa: tarifa.id_tarifa, id_inscripcion: null, id_clase };
    lineas.push(
      { ...comun, id_profesora: id_prof_suplente, concepto: "CLASE_SUPLIDA", monto },
      { ...comun, id_profesora: id_prof_ausente, concepto: "DESCUENTO_AUSENCIA", monto: -monto },
    );
  }
  return { lineas, advertencias };
}

export function calcularHonorarios(
  periodo: string,
  tarifas: TarifaHonorarioMock[],
  inscripciones: (InscripcionMock | InscripcionHonorariosMock)[] = INSCRIPCIONES_HONORARIOS,
  pagos: (PagoMock | CobroHonorariosMock)[] = COBROS_HONORARIOS,
) {
  const { desde, hasta } = limitesDelPeriodo(periodo);
  const alumnos = lineasDeAlumnos(tarifas, inscripciones, pagos, desde, hasta);
  const suplencias = lineasDeSuplencias(tarifas, desde, hasta);
  return {
    lineas: [...alumnos.lineas, ...suplencias.lineas],
    advertencias: [...alumnos.advertencias, ...suplencias.advertencias],
  };
}

/** Suma en centavos, como el back: 0,10 + 0,20 da 0,30. */
export function sumarMontos(montos: number[]): number {
  return montos.reduce((total, monto) => total + Math.round(monto * 100), 0) / 100;
}

/** La parte de la base del mock que toca una liquidación (mocks/db.ts). */
export interface BaseHonorariosMock {
  tarifasHonorario: TarifaHonorarioMock[];
  liquidaciones: LiquidacionMock[];
  liquidacionDetalles: LiquidacionDetalleMock[];
  inscripciones?: InscripcionMock[];
  pagos?: PagoMock[];
}

function siguiente(ids: number[]): number {
  return Math.max(0, ...ids) + 1;
}

function guardarBorrador(base: BaseHonorariosMock, idProfesora: number, periodo: string, lineas: LineaCalculada[], ahora: string) {
  const { desde, hasta } = limitesDelPeriodo(periodo);
  let liquidacion = base.liquidaciones.find((l) => l.id_profesora === idProfesora && l.periodo_desde === desde);
  if (!liquidacion) {
    liquidacion = {
      id_liquidacion: siguiente(base.liquidaciones.map((l) => l.id_liquidacion)),
      id_profesora: idProfesora,
      periodo_desde: desde,
      periodo_hasta: hasta,
      fecha_liquidacion: ahora,
      monto_total: 0,
      estado: "BORRADOR",
    };
    base.liquidaciones.push(liquidacion);
  }
  const { id_liquidacion } = liquidacion;
  liquidacion.fecha_liquidacion = ahora;
  liquidacion.monto_total = sumarMontos(lineas.map((linea) => linea.monto));
  const otras = base.liquidacionDetalles.filter((detalle) => detalle.id_liquidacion !== id_liquidacion);
  let proximoId = siguiente(base.liquidacionDetalles.map((detalle) => detalle.id_liq_detalle));
  // La profesora ya está en la liquidación: el detalle guarda solo lo que pide liquidacion_detalles.
  const nuevos: LiquidacionDetalleMock[] = lineas.map((linea) => ({
    id_liq_detalle: proximoId++,
    id_liquidacion,
    id_tarifa: linea.id_tarifa,
    concepto: linea.concepto,
    id_inscripcion: linea.id_inscripcion,
    id_clase: linea.id_clase,
    monto: linea.monto,
  }));
  base.liquidacionDetalles = [...otras, ...nuevos];
}

/**
 * POST /liquidaciones: genera o recalcula el BORRADOR de cada profesora del mes; una CERRADA o
 * PAGADA es una foto y no se toca. Devuelve lo que no se pudo calcular de lo que se recalculó.
 */
export function liquidarPeriodo(base: BaseHonorariosMock, periodo: string, idsProfesoras: number[]): AdvertenciaCalculada[] {
  const { desde } = limitesDelPeriodo(periodo);
  const inscripciones = base.inscripciones ?? INSCRIPCIONES_HONORARIOS;
  const pagos = base.pagos ?? COBROS_HONORARIOS;
  const { lineas, advertencias } = calcularHonorarios(periodo, base.tarifasHonorario, inscripciones, pagos);
  const ahora = new Date().toISOString();
  const cerradas = new Set(
    base.liquidaciones.filter((l) => l.periodo_desde === desde && l.estado !== "BORRADOR").map((l) => l.id_profesora),
  );
  // Una profesora sin alumnos ni suplencias también tiene su liquidación, en $ 0.
  const profesoras = [...new Set([...idsProfesoras, ...lineas.map((linea) => linea.id_profesora)])].filter((id) => !cerradas.has(id));
  for (const idProfesora of profesoras) {
    guardarBorrador(base, idProfesora, periodo, lineas.filter((linea) => linea.id_profesora === idProfesora), ahora);
  }
  return advertencias.filter((advertencia) => !cerradas.has(advertencia.id_profesora));
}
