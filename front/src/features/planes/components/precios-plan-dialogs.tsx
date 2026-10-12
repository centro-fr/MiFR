import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { mensajeDeErrorApi } from "@/api/errores";
import { usePreciosPlan, useRegistrarPrecioPlan } from "@/features/planes/hooks/use-planes";
import { crearActualizacionPrecioSchema } from "@/features/planes/schemas/plan";
import type { Plan } from "@/types/plan";
import { formatearPrecio } from "@/utils/moneda";
import { toast } from "sonner";

function hoyEnArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function fechaLegible(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function precioInicial(plan: Plan): string {
  return plan.precioVigente?.toLocaleString("es-AR") ?? "";
}

interface PropsActualizarPrecio {
  plan: Plan | null;
  onClose: () => void;
}

export function ActualizarPrecioDialog({ plan, onClose }: PropsActualizarPrecio) {
  const hoy = hoyEnArgentina();
  const schema = crearActualizacionPrecioSchema({ hoy });
  const [precio, setPrecio] = useState(() => (plan ? precioInicial(plan) : ""));
  const [fecha, setFecha] = useState(hoyEnArgentina);
  const [errores, setErrores] = useState<{ precio?: string; fecha_vigencia_desde?: string }>({});
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const registrar = useRegistrarPrecioPlan();

  const validar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resultado = schema.safeParse({
      precio,
      fecha_vigencia_desde: fecha,
    });
    if (!resultado.success) {
      const { fieldErrors } = resultado.error.flatten();
      setErrores({
        precio: fieldErrors.precio?.[0],
        fecha_vigencia_desde: fieldErrors.fecha_vigencia_desde?.[0],
      });
      return;
    }

    setErrores({});
    setConfirmacionAbierta(true);
  };

  const confirmar = async () => {
    if (!plan) return;
    const resultado = schema.safeParse({
      precio,
      fecha_vigencia_desde: fecha,
    });
    if (!resultado.success) {
      setConfirmacionAbierta(false);
      setErrores({
        precio: resultado.error.flatten().fieldErrors.precio?.[0],
        fecha_vigencia_desde: resultado.error.flatten().fieldErrors.fecha_vigencia_desde?.[0],
      });
      return;
    }

    try {
      await registrar.mutateAsync({ id: plan.id, cuerpo: resultado.data });
      toast.success(
        `El nuevo precio de ${formatearPrecio(resultado.data.precio)} regirá desde el ${fechaLegible(fecha)}.`,
      );
      setConfirmacionAbierta(false);
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo actualizar el precio."));
    }
  };

  const precioValidado = schema.safeParse({
    precio,
    fecha_vigencia_desde: fecha,
  });

  return (
    <>
      <Dialog
        open={plan !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !registrar.isPending) onClose();
        }}
      >
        <DialogContent
          bottomSheetOnMobile
          className="gap-0 border-border bg-white p-0 dark:bg-surface-low sm:max-w-lg"
          aria-describedby="actualizar-precio-descripcion"
        >
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left sm:px-6">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">Vigencia de precio</p>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
              Actualizar precio
            </DialogTitle>
            <DialogDescription
              id="actualizar-precio-descripcion"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              Las cuotas ya cobradas o facturadas no se modifican.
            </DialogDescription>
          </DialogHeader>
          {plan && (
            <form onSubmit={validar} className="flex max-h-[calc(92dvh-82px)] flex-col overflow-y-auto">
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <section
                  aria-label="Precio actual"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 p-4 dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Plan seleccionado
                    </p>
                    <h3 className="mt-1 break-words font-extrabold text-slate-900 dark:text-white">
                      {plan.nombre}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {plan.precioVigenteDesde
                        ? `Vigente desde ${fechaLegible(plan.precioVigenteDesde)}`
                        : "El plan todavía no tiene un precio vigente."}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Actual
                    </p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
                    </p>
                  </div>
                </section>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="nuevo-precio"
                    className="text-sm font-bold text-slate-800 dark:text-slate-200"
                  >
                    Nuevo arancel (ARS) <span aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500"
                    >
                      $
                    </span>
                    <input
                      id="nuevo-precio"
                      name="precio"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={14}
                      required
                      value={precio}
                      onChange={(event) => {
                        setPrecio(event.target.value);
                        setErrores((actuales) => ({ ...actuales, precio: undefined }));
                      }}
                      aria-invalid={Boolean(errores.precio)}
                      aria-describedby={errores.precio ? "nuevo-precio-error" : undefined}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-base font-extrabold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                      placeholder="28.000"
                    />
                  </div>
                  {errores.precio ? (
                    <p
                      id="nuevo-precio-error"
                      role="alert"
                      className="text-sm font-semibold text-rose-700 dark:text-rose-300"
                    >
                      {errores.precio}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mayor a $0; podés usar punto para miles y coma para decimales.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="fecha-vigencia-precio"
                    className="text-sm font-bold text-slate-800 dark:text-slate-200"
                  >
                    Fecha de vigencia <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="fecha-vigencia-precio"
                    name="fecha_vigencia_desde"
                    type="date"
                    min={hoy}
                    required
                    value={fecha}
                    onChange={(event) => {
                      setFecha(event.target.value);
                      setErrores((actuales) => ({ ...actuales, fecha_vigencia_desde: undefined }));
                    }}
                    aria-invalid={Boolean(errores.fecha_vigencia_desde)}
                    aria-describedby={
                      errores.fecha_vigencia_desde ? "fecha-vigencia-error" : "fecha-vigencia-ayuda"
                    }
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                  {errores.fecha_vigencia_desde ? (
                    <p
                      id="fecha-vigencia-error"
                      role="alert"
                      className="text-sm font-semibold text-rose-700 dark:text-rose-300"
                    >
                      {errores.fecha_vigencia_desde}
                    </p>
                  ) : (
                    <p id="fecha-vigencia-ayuda" className="text-xs text-slate-500 dark:text-slate-400">
                      Aplica a partir de las 00:00. Podés elegir hoy o una fecha futura.
                    </p>
                  )}
                </div>

                {plan.precioProgramado && (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                    Ya hay un precio programado de {formatearPrecio(plan.precioProgramado.precio)} desde el{" "}
                    {fechaLegible(plan.precioProgramado.desde)}. La nueva fecha reemplazará las programaciones
                    desde ese día.
                  </p>
                )}
              </div>
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-white p-4 sm:flex-row sm:justify-end dark:bg-surface-low">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={registrar.isPending}
                  className="min-h-11 rounded-xl font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={registrar.isPending}
                  className="min-h-11 rounded-xl bg-primary px-5 font-extrabold text-white hover:bg-primary-dark"
                >
                  Revisar y confirmar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmacionAbierta}
        onOpenChange={(abierto) => !registrar.isPending && setConfirmacionAbierta(abierto)}
      >
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-border dark:bg-surface-low">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
              ¿Confirmar actualización?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              {precioValidado.success
                ? `El nuevo precio de ${formatearPrecio(precioValidado.data.precio)} aplicará desde el ${fechaLegible(fecha)}. Las cuotas ya cobradas no se modificarán.`
                : "Revisá el precio y la fecha de vigencia antes de guardar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {registrar.isError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {mensajeDeErrorApi(registrar.error, "No se pudo actualizar el precio.")}
            </p>
          )}
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={registrar.isPending}
                onClick={() => registrar.reset()}
                className="min-h-11 rounded-xl font-bold"
              >
                Volver
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => void confirmar()}
              disabled={registrar.isPending || !plan}
              className="min-h-11 rounded-xl bg-primary px-5 font-extrabold text-white hover:bg-primary-dark"
            >
              {registrar.isPending ? "Guardando..." : "Confirmar actualización"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface PropsHistorialPrecios {
  plan: Plan | null;
  onClose: () => void;
}

export function HistorialPreciosDialog({ plan, onClose }: PropsHistorialPrecios) {
  const consulta = usePreciosPlan(plan?.id ?? "", plan !== null);
  const hoy = hoyEnArgentina();

  return (
    <Dialog open={plan !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent
        bottomSheetOnMobile
        className="gap-0 border-border bg-white p-0 dark:bg-surface-low sm:max-w-lg"
      >
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
            Historial de precios
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {plan
              ? `Cambios de vigencia de ${plan.nombre}. Los importes históricos son de solo lectura.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70dvh] overflow-y-auto p-5 sm:p-6">
          {consulta.isPending ? (
            <div role="status" aria-label="Cargando historial" className="flex flex-col gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : consulta.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {mensajeDeErrorApi(consulta.error, "No se pudo cargar el historial de precios.")}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void consulta.refetch()}
                className="min-h-11 rounded-xl font-bold"
              >
                Reintentar
              </Button>
            </div>
          ) : consulta.data.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Este plan todavía no tiene cambios de precio registrados.
            </p>
          ) : (
            <ol
              aria-label={`Historial de precios de ${plan?.nombre ?? "plan"}`}
              className="flex flex-col gap-3"
            >
              {consulta.data.map((precio) => {
                const fechaDesde = precio.fecha_vigencia_desde.slice(0, 10);
                const vigente =
                  fechaDesde <= hoy &&
                  (!precio.fecha_vigencia_hasta || precio.fecha_vigencia_hasta.slice(0, 10) >= hoy);
                const programado = fechaDesde > hoy;
                return (
                  <li
                    key={precio.id_plan_precio}
                    className="rounded-xl border border-border bg-slate-50 p-4 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {formatearPrecio(precio.precio)}
                      </span>
                      <span
                        className={
                          vigente
                            ? "rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : programado
                              ? "rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                              : "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                        }
                      >
                        {vigente ? "Vigente" : programado ? "Programado" : "Histórico"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Desde el {fechaLegible(fechaDesde)}
                      {precio.fecha_vigencia_hasta &&
                        ` hasta el ${fechaLegible(precio.fecha_vigencia_hasta)}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <div className="flex justify-end border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-h-11 rounded-xl px-5 font-bold"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
