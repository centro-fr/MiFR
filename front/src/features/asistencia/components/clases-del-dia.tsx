import { Link } from "react-router-dom";
import { CalendarClock, ClipboardCheck, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fechaActualArgentina } from "@/features/asistencia/hooks/use-asistencia";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";

interface Props {
  clases: ClaseDelDiaApi[];
  baseRuta: string;
  fecha: string;
  error: string | null;
  cargando: boolean;
  propietaria: boolean;
  onFechaChange?: (fecha: string) => void;
  onReintentar: () => void;
}

function cupoMaximoDe(clase: ClaseDelDiaApi): number | null {
  return clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
}

function horaVisible(hora: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(hora));
}

function fechaVisible(fecha: string): string {
  const mediodiaUtc = new Date(`${fecha}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(mediodiaUtc);
}

function etiquetaEstado(estado: ClaseDelDiaApi["estado"]): string {
  if (estado === "DICTADA") return "Asistencia cerrada";
  if (estado === "CANCELADA") return "Clase cancelada";
  return "Asistencia abierta";
}

function estiloEstado(estado: ClaseDelDiaApi["estado"]): string {
  if (estado === "DICTADA") return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";
  if (estado === "CANCELADA") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function enlaceDeClase(baseRuta: string, fecha: string, propietaria: boolean, idClase: number): string {
  const query = propietaria ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return `${baseRuta}/${idClase}${query}`;
}

function AccionClase({ to }: { to: string }) {
  return (
    <Button asChild className="min-h-11 rounded-xl px-4">
      <Link to={to}>
        <ClipboardCheck aria-hidden="true" />
        Ver asistencia
      </Link>
    </Button>
  );
}

function ClaseCard({
  clase,
  baseRuta,
  fecha,
  propietaria,
}: {
  clase: ClaseDelDiaApi;
  baseRuta: string;
  fecha: string;
  propietaria: boolean;
}) {
  const to = enlaceDeClase(baseRuta, fecha, propietaria, clase.id_clase);
  const cupoMaximo = cupoMaximoDe(clase);
  return (
    <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className="rounded-lg bg-muted px-2.5 py-1 text-sm font-bold">
            <CalendarClock aria-hidden="true" className="mr-1.5 size-4" />
            {horaVisible(clase.horario.hora_inicio)}–{horaVisible(clase.horario.hora_fin)}
          </Badge>
          <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-sm ${estiloEstado(clase.estado)}`}>
            {etiquetaEstado(clase.estado)}
          </Badge>
        </div>
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-foreground">{clase.horario.actividad.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clase {clase.horario.actividad.modalidad === "GRUPAL" ? "grupal" : "personalizada"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users aria-hidden="true" className="size-4 shrink-0" />
          <span>
            {clase.inscriptos} {clase.inscriptos === 1 ? "inscripto" : "inscriptos"}
            {cupoMaximo !== null && ` · cupo ${cupoMaximo}`}
          </span>
        </div>
        <AccionClase to={to} />
      </CardContent>
    </Card>
  );
}

export function ClasesDelDia({
  clases,
  baseRuta,
  fecha,
  error,
  cargando,
  propietaria,
  onFechaChange,
  onReintentar,
}: Props) {
  const esListaVacia = !cargando && !error && clases.length === 0;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Control de clases</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {propietaria ? "Asistencia" : "Clases de hoy"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fechaVisible(fecha)}</p>
        </div>
        {propietaria && onFechaChange && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:max-w-xs">
            Consultar otra fecha
            <input
              type="date"
              value={fecha}
              max={fechaActualArgentina()}
              onChange={(event) => onFechaChange(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>
        )}
      </header>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={onReintentar} className="min-h-11 shrink-0">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {cargando ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, indice) => (
            <div key={indice} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
          <span className="sr-only">Cargando las clases…</span>
        </div>
      ) : esListaVacia ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <CalendarClock aria-hidden="true" className="size-9 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">No hay clases para esta fecha</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {propietaria
                ? "No se encontraron clases programadas en la fecha seleccionada."
                : "Cuando tengas una clase asignada para hoy, va a aparecer acá."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 xl:hidden">
            {clases.map((clase) => (
              <ClaseCard
                key={clase.id_clase}
                clase={clase}
                baseRuta={baseRuta}
                fecha={fecha}
                propietaria={propietaria}
              />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Clases del {fechaVisible(fecha)}</caption>
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[18%] px-5 py-4">Horario</th>
                  <th className="w-[32%] px-5 py-4">Actividad</th>
                  <th className="w-[22%] px-5 py-4">Inscriptos</th>
                  <th className="w-[18%] px-5 py-4">Estado</th>
                  <th className="w-[10%] px-5 py-4"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clases.map((clase) => {
                  const cupoMaximo = cupoMaximoDe(clase);
                  return (
                  <tr key={clase.id_clase} className="align-middle">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {horaVisible(clase.horario.hora_inicio)}–{horaVisible(clase.horario.hora_fin)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground">{clase.horario.actividad.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {clase.horario.actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {clase.inscriptos}
                      {cupoMaximo !== null && ` / ${cupoMaximo}`}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={`rounded-full ${estiloEstado(clase.estado)}`}>
                        {etiquetaEstado(clase.estado)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        asChild
                        variant="outline"
                        aria-label={`Ver asistencia de ${clase.horario.actividad.nombre}`}
                        className="min-h-11 min-w-11 rounded-xl"
                      >
                        <Link to={enlaceDeClase(baseRuta, fecha, propietaria, clase.id_clase)}>
                          <ClipboardCheck aria-hidden="true" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
