import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgeEstadoPlan, BadgeModalidad } from "@/features/planes/components/badges-plan";
import {
  ETIQUETA_TIPO_PLAN,
  estaVigente,
  textoDiasGracia,
  textoFrecuencia,
  textoProfesora,
} from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { formatearPrecio } from "@/utils/moneda";
import { cn } from "@/utils/cn";

const CLASE_EDITAR =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/15 dark:bg-transparent dark:text-slate-200";

function rutaEdicion(plan: Plan): string {
  return `/app/planes/${plan.id}/editar`;
}

function Precio({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-col">
      <span className="font-extrabold whitespace-nowrap text-slate-900 dark:text-white">
        {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
      </span>
      <span className="text-xs text-muted-foreground">{plan.tipo === "MENSUAL" ? "por mes" : "por clase"}</span>
      {plan.precioProgramado && (
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Desde el {new Date(plan.precioProgramado.desde).toLocaleDateString("es-AR", { timeZone: "UTC" })}: {formatearPrecio(plan.precioProgramado.precio)}
        </span>
      )}
    </div>
  );
}

function BotonEditar({ plan, completo = false }: { plan: Plan; completo?: boolean }) {
  return (
    <Link to={rutaEdicion(plan)} aria-label={`Editar ${plan.nombre}`} className={cn(CLASE_EDITAR, completo && "w-full")}>
      <Pencil aria-hidden="true" className="size-4" />
      {completo ? "Editar plan" : "Editar"}
    </Link>
  );
}

function FilaPlan({ plan }: { plan: Plan }) {
  const vigente = estaVigente(plan);
  return (
    <TableRow className={cn(!vigente && "opacity-70")}>
      <TableHead scope="row" className="max-w-[280px] py-3 font-normal">
        <span className="block font-bold text-slate-900 dark:text-white">{plan.nombre}</span>
        {plan.descripcion && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{plan.descripcion}</span>}
      </TableHead>
      <TableCell>
        <div className="flex flex-col items-start gap-1.5">
          {plan.actividad && <span className="text-sm">{plan.actividad.nombre}</span>}
          <BadgeModalidad modalidad={plan.actividad?.modalidad ?? null} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{ETIQUETA_TIPO_PLAN[plan.tipo]}</span>
          <span className="text-xs text-muted-foreground">{textoFrecuencia(plan.tipo, plan.clasesPorSemana)}</span>
          {plan.tipo === "MENSUAL" && <span className="text-xs text-muted-foreground">{textoDiasGracia(plan.diasGracia)}</span>}
        </div>
      </TableCell>
      <TableCell className="text-sm">{textoProfesora(plan.profesoraUnica)}</TableCell>
      <TableCell>
        <Precio plan={plan} />
      </TableCell>
      <TableCell>
        <BadgeEstadoPlan vigente={vigente} />
      </TableCell>
      <TableCell className="text-right">{vigente && <BotonEditar plan={plan} />}</TableCell>
    </TableRow>
  );
}

function TarjetaPlan({ plan }: { plan: Plan }) {
  const vigente = estaVigente(plan);
  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 dark:bg-surface-low", !vigente && "opacity-80")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-bold break-words text-slate-900 dark:text-white">{plan.nombre}</span>
          <span className="text-sm text-muted-foreground">{plan.actividad?.nombre ?? "Cualquier actividad"}</span>
        </div>
        <div className="shrink-0 text-right">
          <Precio plan={plan} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {plan.actividad && <BadgeModalidad modalidad={plan.actividad.modalidad} />}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
          {plan.tipo === "MENSUAL" ? textoFrecuencia(plan.tipo, plan.clasesPorSemana) : ETIQUETA_TIPO_PLAN[plan.tipo]}
        </span>
        <BadgeEstadoPlan vigente={vigente} />
      </div>
      {vigente && <BotonEditar plan={plan} completo />}
    </li>
  );
}

// Tabla en escritorio y tarjetas por debajo de xl: con el sidebar abierto, las siete columnas no
// entran antes sin scroll horizontal. Se oculta con CSS, así el lector de pantalla lee una sola.
export function ListaPlanes({ planes, total }: { planes: Plan[]; total: number }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm xl:block dark:bg-surface-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Plan</TableHead>
              <TableHead scope="col">Actividad y tipo</TableHead>
              <TableHead scope="col">Frecuencia</TableHead>
              <TableHead scope="col">Profesora</TableHead>
              <TableHead scope="col">Precio vigente</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planes.map((plan) => (
              <FilaPlan key={plan.id} plan={plan} />
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label="Planes" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {planes.map((plan) => (
          <TarjetaPlan key={plan.id} plan={plan} />
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Mostrando {planes.length} de {total} {total === 1 ? "plan" : "planes"}. Los planes de clases personalizadas están sujetos al cupo máximo de la actividad.
      </p>
    </>
  );
}
