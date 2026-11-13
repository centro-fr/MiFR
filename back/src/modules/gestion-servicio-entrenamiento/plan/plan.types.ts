import type { actividades, planes, tipo_plan } from "@prisma/client";

export type TipoPlan = tipo_plan;

// El precio es NUMERIC(10,2) y Prisma lo entrega como Decimal, que en JSON viaja como texto.
// Diez dígitos con dos decimales entran sin pérdida en un number, así que el dominio usa number.
export interface PrecioPlan {
  id_plan_precio: number;
  id_plan: number;
  precio: number;
  fecha_vigencia_desde: Date;
  fecha_vigencia_hasta: Date | null;
}

// El plan se devuelve con el precio que rige hoy y, si lo hay, el aumento ya programado,
// que es lo que muestra el listado de US-11 y US-12.
export type Plan = planes & {
  actividad_exclusiva: Pick<actividades, "id_actividad" | "nombre" | "modalidad"> | null;
  precio_vigente: PrecioPlan | null;
  precio_programado: PrecioPlan | null;
};

// US-13: lo que se cobra de un plan un día: el precio de lista y, si la promoción de la inscripción
// sigue vigente, su descuento.
export interface PrecioACobrar {
  id_plan_precio: number;
  precio_lista: number;
  descuento: number;
  monto: number;
  promocion: { id_promocion: number; nombre: string } | null;
}

export interface FiltroPlan {
  busqueda?: string;
  tipo?: TipoPlan;
  id_actividad_exclusiva?: number;
  incluirBajas?: boolean;
}
