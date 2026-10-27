import type { ReactNode } from "react";
import { BadgeModalidad } from "@/features/planes/components/badges-plan";
import { aDatosEditables, precioDesdeTexto, type PlanFormValues } from "@/features/planes/schemas/plan";
import {
  ETIQUETA_TIPO_PLAN,
  textoDiasGracia,
  textoFrecuencia,
  type CambioDelPlan,
} from "@/features/planes/utils/planes";
import type { Actividad } from "@/types/actividad";
import { formatearPrecio } from "@/utils/moneda";

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-t border-slate-100 py-2 text-sm dark:border-white/10">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="text-right font-semibold text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function CambiosSinGuardar({ cambios }: { cambios: CambioDelPlan[] }) {
  if (cambios.length === 0) return <p className="mt-3 text-sm text-muted-foreground">Sin cambios todavía.</p>;
  return (
    <div className="mt-3 rounded-xl border border-pink-200 bg-pink-50 p-3 text-sm dark:border-pink-500/20 dark:bg-pink-500/10">
      <p className="mb-1 font-bold text-primary-dark dark:text-pink-300">
        {cambios.length === 1 ? "1 cambio sin guardar" : `${cambios.length} cambios sin guardar`}
      </p>
      <ul className="flex flex-col gap-0.5 text-slate-700 dark:text-slate-300">
        {cambios.map(({ campo, antes, despues }) => (
          <li key={campo}>
            {campo}: <s className="text-muted-foreground">{antes}</s> → {despues}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  valores: PlanFormValues;
  actividades: Actividad[];
  /** Solo en la edición: lo que cambió respecto del plan guardado. */
  cambios?: CambioDelPlan[];
}

// Vista previa de cómo queda el plan. aria-live: el lector de pantalla anuncia los cambios.
export function ResumenPlan({ valores, actividades, cambios }: Props) {
  const actividad = actividades.find(({ id }) => id === valores.idActividad);
  const datos = aDatosEditables(valores);
  const precio = precioDesdeTexto(valores.precio);
  const esMensual = valores.tipo === "MENSUAL";
  return (
    <aside aria-label="Vista previa del plan" aria-live="polite" className="rounded-2xl border border-border bg-white p-4 shadow-sm lg:sticky lg:top-20 dark:bg-surface-low">
      <h2 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Vista previa del plan</h2>
      <p className="mb-2 text-base font-extrabold break-words text-slate-900 dark:text-white">{datos.nombre || <span className="text-muted-foreground">Sin nombre</span>}</p>
      <BadgeModalidad modalidad={actividad?.modalidad ?? null} />
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
        {Number.isFinite(precio) && precio > 0 ? formatearPrecio(precio) : <span className="text-muted-foreground">$ —</span>}
      </p>
      <p className="mb-2 text-sm text-muted-foreground">{esMensual ? "por mes" : "por clase"}</p>
      <dl>
        <Dato etiqueta="Modalidad">{valores.tipo ? ETIQUETA_TIPO_PLAN[valores.tipo] : "—"}</Dato>
        <Dato etiqueta="Actividad">{actividad?.nombre ?? "Cualquiera"}</Dato>
        <Dato etiqueta="Frecuencia">{esMensual && !valores.frecuencia ? "—" : textoFrecuencia(valores.tipo, datos.clases_por_semana)}</Dato>
        {esMensual && <Dato etiqueta="Vencimiento">{/^\d+$/.test(valores.diasGracia) ? textoDiasGracia(datos.dias_gracia) : "—"}</Dato>}
      </dl>
      {cambios && <CambiosSinGuardar cambios={cambios} />}
    </aside>
  );
}
