import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { mensajeDeErrorApi } from "@/api/errores";
import { usePreciosPlan, useRegistrarPrecioPlan } from "@/features/planes/hooks/use-planes";
import { crearActualizacionPrecioSchema } from "@/features/planes/schemas/plan";
import type { Plan } from "@/types/plan";
import { formatearPrecio } from "@/utils/moneda";
import { cn } from "@/utils/cn";
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

function fechaLegibleCorta(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatoRangoHistorial(desdeIso: string, hastaIso: string | null, hoyStr: string): string {
  const d = desdeIso.slice(0, 10);
  const h = hastaIso ? hastaIso.slice(0, 10) : null;
  const fechaD = fechaLegibleCorta(d);

  if (!h || h >= hoyStr) {
    return `${fechaD} - hoy`;
  }

  const [yD, mD, diaD] = d.split("-");
  const [yH, mH, diaH] = h.split("-");

  if (yD === yH) {
    return `${diaD}/${mD} - ${diaH}/${mH}/${yH}`;
  }
  return `${diaD}/${mD}/${yD} - ${diaH}/${mH}/${yH}`;
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
  const [nota, setNota] = useState("");
  const [errores, setErrores] = useState<{ precio?: string; fecha_vigencia_desde?: string }>({});
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const registrar = useRegistrarPrecioPlan();
  const consultaPrecios = usePreciosPlan(plan?.id ?? "", plan !== null);

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

  const precioLimpio = precio.trim().replace(/\./g, "").replace(",", ".");
  const nuevoPrecioNum = Number(precioLimpio);
  const precioActualNum = plan?.precioVigente ?? 0;
  const diff = nuevoPrecioNum - precioActualNum;
  const pct = precioActualNum > 0 ? Math.round((diff / precioActualNum) * 100) : 0;
  const pctTexto = pct > 0 ? ` (+${pct}%)` : pct < 0 ? ` (${pct}%)` : "";

  const historialPrecios = (consultaPrecios.data ?? [])
    .slice()
    .sort((a, b) => b.fecha_vigencia_desde.localeCompare(a.fecha_vigencia_desde));

  return (
    <>
      <Dialog
        open={plan !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !registrar.isPending) onClose();
        }}
      >
        <DialogContent
          hideClose
          className="w-[96vw] sm:w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
        >
          {plan && (
            <>
              {/* Encabezado */}
              <DialogHeader className="flex flex-row items-start justify-between pb-3 text-left">
                <div className="space-y-0.5 pr-4">
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Cambiar precio de {plan.nombre}
                  </DialogTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    Ingresá el nuevo importe y la fecha a partir de la cual empezará a regir.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Cerrar formulario"
                  className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </DialogHeader>

              {/* Formulario */}
              <form onSubmit={validar} className="space-y-4 pt-1">
                {/* Caja Precio actual */}
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold text-muted-foreground">Precio actual</p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.precioVigenteDesde
                      ? `Desde el ${fechaLegibleCorta(plan.precioVigenteDesde)}`
                      : "Sin fecha registrada"}
                  </p>
                </div>

                {/* Inputs en 2 columnas: Nuevo precio y Rige desde */}
                <div className="space-y-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nuevo-precio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        Nuevo precio <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="nuevo-precio"
                        name="precio"
                        aria-label="Nuevo arancel (ARS) *"
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
                        placeholder="33000"
                        className={cn(
                          "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                          errores.precio && "border-rose-500",
                        )}
                      />
                      {errores.precio && (
                        <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {errores.precio}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fecha-vigencia-precio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        Rige desde <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fecha-vigencia-precio"
                        name="fecha_vigencia_desde"
                        aria-label="Fecha de vigencia *"
                        type="date"
                        min={hoy}
                        required
                        value={fecha}
                        onChange={(event) => {
                          setFecha(event.target.value);
                          setErrores((actuales) => ({ ...actuales, fecha_vigencia_desde: undefined }));
                        }}
                        className={cn(
                          "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                          errores.fecha_vigencia_desde && "border-rose-500",
                        )}
                      />
                      {errores.fecha_vigencia_desde && (
                        <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {errores.fecha_vigencia_desde}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-0.5">Hoy o una fecha futura.</p>
                </div>

                {/* Nota opcional */}
                <div className="space-y-1.5">
                  <Label htmlFor="nota-precio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Nota <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="nota-precio"
                    name="nota"
                    type="text"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Ej: aumento de noviembre"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Callout informativo azul */}
                {!Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum > 0 && fecha && (
                  <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-snug font-medium">
                    Desde el <span className="font-bold">{fechaLegibleCorta(fecha)}</span> pasa de{" "}
                    <span className="font-bold">{formatearPrecio(precioActualNum)}</span> a{" "}
                    <span className="font-bold">{formatearPrecio(nuevoPrecioNum)}</span>
                    {pctTexto}. Las cuotas ya cobradas no cambian.
                  </div>
                )}

                {/* Precios anteriores */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Precios anteriores
                  </h4>
                  {consultaPrecios.isPending ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-6 w-full rounded-lg" />
                      <Skeleton className="h-6 w-full rounded-lg" />
                    </div>
                  ) : historialPrecios.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin cambios de precio registrados previamente.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs sm:text-sm">
                      {historialPrecios.map((item) => (
                        <div
                          key={item.id_plan_precio}
                          className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                        >
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {formatoRangoHistorial(item.fecha_vigencia_desde, item.fecha_vigencia_hasta, hoy)}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatearPrecio(item.precio)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer de botones */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={registrar.isPending}
                    className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={registrar.isPending}
                    aria-label="Revisar y confirmar"
                    className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
                  >
                    {registrar.isPending
                      ? "Guardando..."
                      : fecha > hoy
                        ? "Programar precio"
                        : "Actualizar precio"}
                  </Button>
                </div>
              </form>
            </>
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
