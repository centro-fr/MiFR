import type { promociones, tipo_descuento } from "@prisma/client";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";

export type TipoDescuento = tipo_descuento;

// US-13: no se guarda; sale de las fechas de vigencia y de activo (una desactivada lo es siempre).
export type EstadoPromocion = "ACTIVA" | "PROGRAMADA" | "VENCIDA" | "DESACTIVADA";

// El valor es NUMERIC(10,2) y Prisma lo entrega como Decimal; el dominio usa number, como los precios.
export type PromocionGuardada = Omit<promociones, "valor"> & {
  valor: number;
  planes: { id_plan: number; nombre: string }[];
};

export type Promocion = PromocionGuardada & { estado: EstadoPromocion };

export interface FiltroPromociones extends Partial<Paginacion> {
  estado?: EstadoPromocion;
  id_plan?: number;
}

export interface DatosPromocion {
  nombre: string;
  tipo_descuento: TipoDescuento;
  valor: number;
  fecha_desde: Date;
  fecha_hasta: Date;
  ids_planes: number[];
}

export type ResultadoGuardado =
  { resultado: "ok"; promocion: PromocionGuardada } | { resultado: "superpuesta"; id_plan: number };

// Lo que necesita quien aplica una promoción: Plan, al calcular lo que se cobra, e Inscripcion, al
// guardar la promoción vigente cuando se pre-inscribe.
export interface PromocionAplicable {
  id_promocion: number;
  nombre: string;
  tipo_descuento: TipoDescuento;
  valor: number;
}

export type DescuentoAplicado = PromocionAplicable & { descuento: number };
