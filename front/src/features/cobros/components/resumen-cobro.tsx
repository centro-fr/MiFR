import { FilaDeDetalle, FilaDeTotal, ListaDeDetalle } from "@/components/detalle/lista-de-detalle";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { ModalSeccion } from "@/components/ui/estructura-modal";
import type { CotizacionCobro } from "@/features/cobros/api/cobros-api";
import type { Promocion } from "@/types/promocion";
import { SIN_PROMOCION } from "@/features/cobros/utils/promociones-cobro";
import { formatearPrecio } from "@/utils/moneda";

// Detalle y descuento del cobro: los comparten "Cobrar" del listado y el cobro de la pre-inscripción,
// así los dos muestran lo mismo.

interface ResumenCobroProps {
  nombreAlumno: string;
  nombrePlan: string;
  /** Estado de la cuota ya legible ("Vencida"); no aplica a la primera cuota. */
  estadoCuota?: string;
  cotizacion: CotizacionCobro;
}

export function ResumenCobro({ nombreAlumno, nombrePlan, estadoCuota, cotizacion }: ResumenCobroProps) {
  return (
    <ModalSeccion titulo="Detalle cobro">
      <ListaDeDetalle>
        <FilaDeDetalle etiqueta="Alumno">{nombreAlumno}</FilaDeDetalle>
        <FilaDeDetalle etiqueta="Plan">{nombrePlan}</FilaDeDetalle>
        {estadoCuota && <FilaDeDetalle etiqueta="Cuota">{estadoCuota}</FilaDeDetalle>}
        <FilaDeDetalle etiqueta="Precio de lista">{formatearPrecio(cotizacion.precio_lista)}</FilaDeDetalle>
        {cotizacion.descuento > 0 && (
          <FilaDeDetalle etiqueta="Descuento">
            {cotizacion.promocion?.nombre ?? "Descuento"} · −{formatearPrecio(cotizacion.descuento)}
          </FilaDeDetalle>
        )}
        <FilaDeTotal etiqueta="Total a cobrar">{formatearPrecio(cotizacion.monto)}</FilaDeTotal>
      </ListaDeDetalle>
    </ModalSeccion>
  );
}

interface SelectorPromocionProps {
  promociones: Promocion[];
  seleccionada: string;
  onChange: (id: string) => void;
}

export function SelectorPromocion({ promociones, seleccionada, onChange }: SelectorPromocionProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="promocion-cobro" className="text-sm font-bold text-slate-800 dark:text-slate-200">
        Descuento <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <SelectorDesplegable
        id="promocion-cobro"
        aria-label="Descuento"
        valor={seleccionada}
        opciones={[
          { valor: SIN_PROMOCION, texto: "Sin promoción" },
          ...promociones.map((promocion) => ({
            valor: promocion.id,
            texto: `${promocion.nombre} · ${promocion.tipoDescuento === "PORCENTAJE" ? `${promocion.valor}% OFF` : `${formatearPrecio(promocion.valor)} OFF`}`,
          })),
        ]}
        onChange={onChange}
        variante="formulario"
      />
    </div>
  );
}
