import type { SituacionCuotaApi } from "@/features/alumnos/schemas/alumno";
import { db } from "@/mocks/db";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import { hoyEnArgentina } from "@/mocks/precios";

// SituacionCuota del back (calculador-habilitacion.ts y cuota.service.ts). El mock no guarda cuotas:
// cada pago confirmado de la inscripción cubre un mes desde fecha_inicio.

// Parámetro VENCIDOS_PUEDEN_ASISTIR del back, con su valor inicial.
const VENCIDOS_PUEDEN_ASISTIR = true;
const UN_DIA_EN_MS = 86_400_000;

function pagosDe(idInscripcion: number, estado: "CONFIRMADO" | "PENDIENTE") {
  return db.pagos.filter((pago) => pago.id_inscripcion === idInscripcion && pago.estado === estado);
}

/** Si el alumno pagó alguna vez: decide si la reactivación lo deja activo o pre-inscripto (US-07). */
export function tuvoPagoConfirmado(idAlumno: number): boolean {
  return db.inscripciones.some(
    (inscripcion) => inscripcion.id_alumno === idAlumno && pagosDe(inscripcion.id_inscripcion, "CONFIRMADO").length > 0,
  );
}

function vencimientoDe(inscripcion: InscripcionMock, mesesPagos: number, esMensual: boolean): Date {
  const vencimiento = new Date(inscripcion.fecha_inicio);
  // La clase suelta vence el día de la clase; el mensual, de fecha a fecha.
  if (esMensual) vencimiento.setUTCMonth(vencimiento.getUTCMonth() + mesesPagos);
  return vencimiento;
}

// Una inscripción dada de baja se calcula al día de la baja: lo que debía al irse.
function diaDeCalculo(inscripcion: InscripcionMock): Date {
  const dia = inscripcion.fecha_baja?.slice(0, 10) ?? hoyEnArgentina();
  return new Date(`${dia}T00:00:00.000Z`);
}

type EstadoCuotaApi = SituacionCuotaApi["estado"];

function estadoMensual(diasRestantes: number, diasGracia: number): EstadoCuotaApi {
  if (diasRestantes >= 0) return "AL_DIA";
  return diasRestantes >= -diasGracia ? "POR_VENCER" : "VENCIDA";
}

function estadoClaseSuelta(diasRestantes: number): EstadoCuotaApi {
  return diasRestantes >= 0 ? "CLASE_SUELTA_VIGENTE" : "CLASE_SUELTA_VENCIDA";
}

export function situacionCuotaDe(inscripcion: InscripcionMock): SituacionCuotaApi {
  const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan)!;
  const tienePagoPendiente = pagosDe(inscripcion.id_inscripcion, "PENDIENTE").length > 0;
  const mesesPagos = pagosDe(inscripcion.id_inscripcion, "CONFIRMADO").length;
  if (mesesPagos === 0) {
    return {
      estado: "PENDIENTE_DE_PAGO",
      fecha_vencimiento: null,
      dias_restantes: null,
      puede_asistir: false,
      tiene_pago_pendiente: tienePagoPendiente,
    };
  }

  const esMensual = plan.tipo === "MENSUAL";
  const vencimiento = vencimientoDe(inscripcion, mesesPagos, esMensual);
  const diasRestantes = Math.round((vencimiento.getTime() - diaDeCalculo(inscripcion).getTime()) / UN_DIA_EN_MS);
  const estado = esMensual ? estadoMensual(diasRestantes, plan.dias_gracia) : estadoClaseSuelta(diasRestantes);
  const estaVencido = estado === "VENCIDA" || estado === "CLASE_SUELTA_VENCIDA";
  return {
    estado,
    fecha_vencimiento: vencimiento.toISOString(),
    dias_restantes: diasRestantes,
    puede_asistir: !estaVencido || tienePagoPendiente || VENCIDOS_PUEDEN_ASISTIR,
    tiene_pago_pendiente: tienePagoPendiente,
  };
}
