import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function rutaEdicion(plan: Plan): string {
  return `/app/planes/${plan.id}/editar`;
}

function Precio({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-col">
      <span className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">
        {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
      </span>
      <span className="text-xs text-muted-foreground">
        {plan.tipo === "MENSUAL" ? "por mes" : "por clase"}
      </span>
      {plan.precioVigenteDesde && (
        <span className="text-xs text-muted-foreground">
          Vigente desde{" "}
          {new Date(`${plan.precioVigenteDesde.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("es-AR", {
            timeZone: "UTC",
          })}
        </span>
      )}
      {plan.precioProgramado && (
        <span className="mt-1 inline-flex w-fit flex-col rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <span>Precio programado</span>
          <span>
            Desde el{" "}
            {new Date(`${plan.precioProgramado.desde.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString(
              "es-AR",
              { timeZone: "UTC" },
            )}
            : {formatearPrecio(plan.precioProgramado.precio)}
          </span>
        </span>
      )}
    </div>
  );
}

function BotonEditar({ plan, completo = false }: { plan: Plan; completo?: boolean }) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "inline-flex h-auto min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary pointer-fine:min-h-0 md:px-2.5 dark:border-white/15 dark:bg-transparent dark:text-slate-200",
        completo && "min-h-[44px] w-full",
      )}
    >
      <Link to={rutaEdicion(plan)} aria-label={`Editar ${plan.nombre}`}>
        <Pencil aria-hidden="true" className="size-4" />
        {completo ? "Editar plan" : "Editar"}
      </Link>
    </Button>
  );
}

function AccionesPlan({
  plan,
  vigente,
  onActualizarPrecio,
  onVerHistorial,
  compacto = false,
}: {
  plan: Plan;
  vigente: boolean;
  onActualizarPrecio: (plan: Plan) => void;
  onVerHistorial: (plan: Plan) => void;
  compacto?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", compacto && "grid grid-cols-1 sm:grid-cols-2")}>
      {vigente && (
        <>
          <Can permission="PLANES_EDITAR">
            <Button
              type="button"
              variant="outline"
              onClick={() => onActualizarPrecio(plan)}
              className={cn(
                "min-h-11 rounded-xl border-emerald-300 px-3 font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-300",
                compacto && "w-full",
              )}
            >
              Actualizar precio
            </Button>
          </Can>
          <BotonEditar plan={plan} completo={compacto} />
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onVerHistorial(plan)}
        className={cn(
          "min-h-11 rounded-xl px-3 font-semibold text-slate-600 dark:text-slate-300",
          compacto && "w-full",
        )}
      >
        {compacto ? "Historial de precios" : "Historial"}
      </Button>
    </div>
  );
}

function FilaPlan({
  plan,
  onActualizarPrecio,
  onVerHistorial,
}: {
  plan: Plan;
  onActualizarPrecio: (plan: Plan) => void;
  onVerHistorial: (plan: Plan) => void;
}) {
  const vigente = estaVigente(plan);

  return (
    <TableRow className={cn("hover:bg-slate-50 dark:hover:bg-white/5", !vigente && "opacity-70")}>
      <TableHead scope="row" className="max-w-[280px] px-6 py-4 font-normal">
        <span className="block font-bold text-slate-900 dark:text-white">{plan.nombre}</span>
        {plan.descripcion && (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{plan.descripcion}</span>
        )}
      </TableHead>
      <TableCell className="px-4 py-4">
        <div className="flex flex-col items-start gap-1.5">
          {plan.actividad && <span className="text-sm font-medium">{plan.actividad.nombre}</span>}
          <BadgeModalidad modalidad={plan.actividad?.modalidad ?? null} />
        </div>
      </TableCell>
      <TableCell className="px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{ETIQUETA_TIPO_PLAN[plan.tipo]}</span>
          <span className="text-xs text-muted-foreground">
            {textoFrecuencia(plan.tipo, plan.clasesPorSemana)}
          </span>
          {plan.tipo === "MENSUAL" && (
            <span className="text-xs text-muted-foreground">{textoDiasGracia(plan.diasGracia)}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-4 text-sm text-slate-800 dark:text-slate-200">
        {textoProfesora(plan.profesoraUnica)}
      </TableCell>
      <TableCell className="px-4 py-4">
        <Precio plan={plan} />
      </TableCell>
      <TableCell className="px-4 py-4">
        <BadgeEstadoPlan vigente={vigente} />
      </TableCell>
      <TableCell className="px-4 py-4 text-right">
        <AccionesPlan
          plan={plan}
          vigente={vigente}
          onActualizarPrecio={onActualizarPrecio}
          onVerHistorial={onVerHistorial}
        />
      </TableCell>
    </TableRow>
  );
}

function TarjetaPlan({
  plan,
  onActualizarPrecio,
  onVerHistorial,
}: {
  plan: Plan;
  onActualizarPrecio: (plan: Plan) => void;
  onVerHistorial: (plan: Plan) => void;
}) {
  const vigente = estaVigente(plan);

  return (
    <li>
      <Card
        className={cn(
          "flex flex-col gap-3 rounded-xl border-border bg-white p-4 shadow-sm transition hover:border-pink-300 dark:border-slate-600 dark:bg-surface-low dark:hover:border-pink-500",
          !vigente && "opacity-80",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="break-words text-base font-extrabold text-[#181C26] dark:text-white">
              {plan.nombre}
            </span>
            <span className="text-sm text-muted-foreground">
              {plan.actividad?.nombre ?? "Cualquier actividad"}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <Precio plan={plan} />
          </div>
        </div>
        {plan.descripcion && <p className="text-sm text-muted-foreground">{plan.descripcion}</p>}
        <div className="flex flex-wrap gap-1.5">
          {plan.actividad && <BadgeModalidad modalidad={plan.actividad.modalidad} />}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            {plan.tipo === "MENSUAL"
              ? textoFrecuencia(plan.tipo, plan.clasesPorSemana)
              : ETIQUETA_TIPO_PLAN[plan.tipo]}
          </span>
          <BadgeEstadoPlan vigente={vigente} />
        </div>
        <AccionesPlan
          plan={plan}
          vigente={vigente}
          onActualizarPrecio={onActualizarPrecio}
          onVerHistorial={onVerHistorial}
          compacto
        />
      </Card>
    </li>
  );
}

// Tabla en escritorio y tarjetas por debajo de xl: con el sidebar abierto, las siete columnas no
// entran antes sin scroll horizontal. Se oculta con CSS, así el lector de pantalla lee una sola.
export function ListaPlanes({
  planes,
  total,
  onActualizarPrecio,
  onVerHistorial,
}: {
  planes: Plan[];
  total: number;
  onActualizarPrecio: (plan: Plan) => void;
  onVerHistorial: (plan: Plan) => void;
}) {
  return (
    <>
      <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">
                <TableHead scope="col" className="px-6 py-4">
                  Plan
                </TableHead>
                <TableHead scope="col" className="px-4 py-4">
                  Actividad y tipo
                </TableHead>
                <TableHead scope="col" className="px-4 py-4">
                  Frecuencia
                </TableHead>
                <TableHead scope="col" className="px-4 py-4">
                  Profesora
                </TableHead>
                <TableHead scope="col" className="px-4 py-4">
                  Precio vigente
                </TableHead>
                <TableHead scope="col" className="px-4 py-4">
                  Estado
                </TableHead>
                <TableHead scope="col" className="px-6 py-4 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
              {planes.map((plan) => (
                <FilaPlan
                  key={plan.id}
                  plan={plan}
                  onActualizarPrecio={onActualizarPrecio}
                  onVerHistorial={onVerHistorial}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <ul aria-label="Planes" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {planes.map((plan) => (
          <TarjetaPlan
            key={plan.id}
            plan={plan}
            onActualizarPrecio={onActualizarPrecio}
            onVerHistorial={onVerHistorial}
          />
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Mostrando {planes.length} de {total} {total === 1 ? "plan" : "planes"}. Los planes de clases
        personalizadas están sujetos al cupo máximo de la actividad.
      </p>
    </>
  );
}
