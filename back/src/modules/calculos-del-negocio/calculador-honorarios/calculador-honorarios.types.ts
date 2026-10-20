import type { ClaseSuplida } from "../../gestion-inscripciones-y-clases/clase/clase.types.js";
import type { InscripcionACargo } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";

export type ConceptoTarifa = "ALUMNO_A_CARGO" | "HORA_SUPLENCIA";
export type TipoValorTarifa = "MONTO_FIJO" | "PORCENTAJE";
export type ConceptoDetalle = "ALUMNO_A_CARGO" | "CLASE_SUPLIDA" | "DESCUENTO_AUSENCIA";

// Las columnas de tarifas_honorario que el cálculo necesita. Las fechas son DATE a las 00:00 UTC.
export interface TarifaDeHonorario {
  id_tarifa: number;
  id_profesora: number;
  concepto: ConceptoTarifa;
  // null: aplica a todos los planes. HORA_SUPLENCIA nunca lleva plan.
  id_plan: number | null;
  tipo_valor: TipoValorTarifa;
  valor: number;
  fecha_vigencia_desde: Date;
  // null: sigue vigente.
  fecha_vigencia_hasta: Date | null;
}

export interface DatosHonorarios {
  // Último día del período, incluido (DATE a las 00:00 UTC).
  finDelPeriodo: Date;
  inscripciones: InscripcionACargo[];
  // Lo cobrado por inscripción dentro del período: la base de las tarifas PORCENTAJE.
  cobradoEnElPeriodo: ReadonlyMap<number, number>;
  suplencias: ClaseSuplida[];
  tarifas: TarifaDeHonorario[];
}

// Una fila de liquidacion_detalles, más la profesora a la que se le liquida.
export interface DetalleHonorario {
  id_profesora: number;
  concepto: ConceptoDetalle;
  id_tarifa: number;
  id_inscripcion: number | null;
  id_clase: number | null;
  // Negativo en DESCUENTO_AUSENCIA.
  monto: number;
}

export type MotivoAdvertencia = "SIN_TARIFA" | "TARIFA_NO_APLICABLE";

// Una línea que no se pudo generar. En una suplencia se informa una sola vez, a nombre de la suplente,
// porque sin su tarifa no hay ni suma ni descuento.
export interface AdvertenciaHonorario {
  id_profesora: number;
  concepto: ConceptoTarifa;
  motivo: MotivoAdvertencia;
  id_inscripcion: number | null;
  id_clase: number | null;
  // El día con el que se buscó la tarifa vigente.
  fecha: Date;
}

export interface ResultadoHonorarios {
  detalles: DetalleHonorario[];
  advertencias: AdvertenciaHonorario[];
  // Suma de los detalles de cada profesora que tiene alguno. Quien no figura cobra 0.
  totalesPorProfesora: ReadonlyMap<number, number>;
}
