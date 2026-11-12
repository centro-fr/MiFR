import { FilaDeDetalle, ListaDeDetalle } from "@/components/detalle/lista-de-detalle";
import type { ComprobantePago } from "@/features/cobros/schemas/cobro-efectivo.schema";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";
import { formatearPrecio } from "@/utils/moneda";

// Lo comparten el modal y la versión impresa del comprobante, así nunca muestran datos distintos.
// Arriba lo que se busca de un vistazo (cuánto, cuándo y cómo) y abajo el detalle.

const FORMA_DE_COBRO: Record<ComprobantePago["forma_pago"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export function MontoComprobante({ comprobante }: { comprobante: ComprobantePago }) {
  return (
    <div className="flex flex-col items-center gap-1 border-b border-dashed border-slate-200 pb-5 text-center dark:border-slate-700">
      <span className="text-sm text-slate-500 dark:text-slate-400">Monto cobrado</span>
      <span className="text-3xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
        {formatearPrecio(comprobante.monto)}
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {formatearFechaCobro(comprobante.fecha)} · {FORMA_DE_COBRO[comprobante.forma_pago]}
      </span>
    </div>
  );
}

function QuienCobro({ comprobante }: { comprobante: ComprobantePago }) {
  const { profesora_cobra, registrado_por } = comprobante;
  const persona = profesora_cobra ?? registrado_por;
  return (
    <>
      {persona.nombre} {persona.apellido}
      <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
        {profesora_cobra ? "Profesora" : "Administración"}
      </span>
    </>
  );
}

function textoDescuento(comprobante: ComprobantePago): string | null {
  const promo = comprobante.promocion;
  if (promo?.tipo_descuento === "PORCENTAJE" && promo.valor != null) {
    return `-${promo.valor}%`;
  }
  if (promo?.tipo_descuento === "MONTO_FIJO" && promo.valor != null) {
    return `-${formatearPrecio(promo.valor)}`;
  }
  if (comprobante.descuento != null && comprobante.descuento > 0) {
    return `-${formatearPrecio(comprobante.descuento)}`;
  }
  return null;
}

export function FilasComprobante({ comprobante }: { comprobante: ComprobantePago }) {
  const { alumno } = comprobante;
  const descuentoAplicado = textoDescuento(comprobante);

  return (
    <ListaDeDetalle>
      <FilaDeDetalle etiqueta="Alumno">
        {alumno.nombre} {alumno.apellido}
        {alumno.dni && <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">DNI {alumno.dni}</span>}
      </FilaDeDetalle>
      <FilaDeDetalle etiqueta="Plan">{comprobante.plan}</FilaDeDetalle>
      {comprobante.promocion && (
        <FilaDeDetalle etiqueta="Promoción">
          {comprobante.promocion.nombre}
          {descuentoAplicado && (
            <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {descuentoAplicado}
            </span>
          )}
        </FilaDeDetalle>
      )}
      <FilaDeDetalle etiqueta="Cuota">N° {comprobante.cuota.numero}</FilaDeDetalle>
      <FilaDeDetalle etiqueta="Cobró">
        <QuienCobro comprobante={comprobante} />
      </FilaDeDetalle>
    </ListaDeDetalle>
  );
}
