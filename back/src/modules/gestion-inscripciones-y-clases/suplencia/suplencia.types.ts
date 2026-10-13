import type { Prisma, suplencias } from "@prisma/client";

export type Suplencia = suplencias;

const CON_NOMBRE = { include: { usuario: { select: { nombre: true, apellido: true } } } } as const;

// La suplente es la dictante de la clase; la titular, la profesora ausente de la suplencia.
export const INCLUIR_DATOS_SUPLENCIA = {
  clase: { include: { horario: { include: { actividad: true } }, profesora: CON_NOMBRE } },
  profesora_ausente: CON_NOMBRE,
} satisfies Prisma.suplenciasInclude;

export type SuplenciaConDatos = Prisma.suplenciasGetPayload<{ include: typeof INCLUIR_DATOS_SUPLENCIA }>;

export interface FiltroSuplencias {
  desde?: Date;
  hasta?: Date;
  // Titular o suplente: la propietaria busca todo lo que movió los honorarios de una profesora.
  id_profesora?: number;
  id_actividad?: number;
  limit: number;
  offset: number;
}

export interface DatosSuplencia {
  id_clase: number;
  id_prof_ausente: number;
  motivo: string | null;
  id_usuario_registra: number;
}

export interface CambiosSuplencia {
  motivo?: string | null;
  id_usuario_registra: number;
  fecha_registro: Date;
}

// Registrar una suplencia a futuro se permite (US-24), pero se avisa: si la titular termina
// viniendo, hay que borrarla.
export interface SuplenciaRegistrada {
  suplencia: SuplenciaConDatos;
  advertencia: string | null;
}
