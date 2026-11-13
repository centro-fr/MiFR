export type TipoDescuento = "PORCENTAJE" | "MONTO_FIJO";
export type EstadoPromocion = "ACTIVA" | "PROGRAMADA" | "VENCIDA" | "DESACTIVADA";

export interface PlanDePromocion {
  id: string;
  nombre: string;
}

export interface Promocion {
  id: string;
  nombre: string;
  tipoDescuento: TipoDescuento;
  valor: number;
  fechaDesde: string;
  fechaHasta: string;
  activo: boolean;
  planes: PlanDePromocion[];
  estado: EstadoPromocion;
}
