import type { concepto_tarifa_honorario, tipo_valor_honorario } from "@prisma/client";

export type ConceptoTarifa = concepto_tarifa_honorario;
export type TipoValorTarifa = tipo_valor_honorario;

// El valor es NUMERIC(10,2) y Prisma lo entrega como Decimal: el dominio usa number (diez dígitos con
// dos decimales entran sin pérdida). Las fechas son DATE a las 00:00 UTC. Tiene la misma forma que
// TarifaDeHonorario del calculador, así que se le pasa tal cual.
export interface TarifaHonorario {
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

export interface FiltroTarifa {
  id_profesora?: number | undefined;
  // Las que rigen hoy o empiezan más adelante; sin esto también trae el historial.
  soloVigentes?: boolean | undefined;
}