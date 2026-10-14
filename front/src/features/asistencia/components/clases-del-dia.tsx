import { CalendarClock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilaClase } from "@/features/asistencia/components/fila-clase";
import { NavegadorFecha } from "@/features/asistencia/components/navegador-fecha";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { estadoVisible, fechaLarga, type EstadoVisibleClase } from "@/features/asistencia/utils/formato-clase";
import { fechaActualArgentina } from "@/utils/fecha";

interface Props {
  clases: ClaseDelDiaApi[];
  baseRuta: string;
  fecha: string;
  error: string | null;
  cargando: boolean;
  propietaria: boolean;
  /** Nombre de cada profesora por id: la propietaria ve quién dicta cada clase. */
  profesoras?: ReadonlyMap<number, string>;
  onFechaChange?: (fecha: string) => void;
  onReintentar: () => void;
}

function enlaceDeClase(baseRuta: string, fecha: string, propietaria: boolean, idClase: number): string {
  const query = propietaria ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return `${baseRuta}/${idClase}${query}`;
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

/** "8 clases · 1 abierta · 7 cerradas": el panorama del día antes de recorrer la lista. */
function Resumen({ estados }: { estados: EstadoVisibleClase[] }) {
  const abiertas = estados.filter((estado) => estado === "ABIERTA" || estado === "EN_CURSO").length;
  const cerradas = estados.filter((estado) => estado === "CERRADA").length;
  const canceladas = estados.filter((estado) => estado === "CANCELADA").length;
  const partes = [
    plural(estados.length, "clase", "clases"),
    abiertas > 0 && plural(abiertas, "abierta", "abiertas"),
    cerradas > 0 && plural(cerradas, "cerrada", "cerradas"),
    canceladas > 0 && plural(canceladas, "cancelada", "canceladas"),
  ].filter(Boolean);
  return <p className="text-sm font-medium text-muted-foreground">{partes.join(" · ")}</p>;
}

function Encabezado({ fecha, propietaria, onFechaChange }: Pick<Props, "fecha" | "propietaria" | "onFechaChange">) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Control de clases</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{propietaria ? "Asistencia" : "Clases de hoy"}</h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{fechaLarga(fecha)}</p>
      </div>
      {propietaria && onFechaChange && <NavegadorFecha fecha={fecha} hoy={fechaActualArgentina()} onChange={onFechaChange} />}
    </header>
  );
}

function ListaVacia({ propietaria }: { propietaria: boolean }) {
  return (
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
  );
}

function Cargando() {
  return (
    <div role="status" className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
          <div className="h-9 w-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
      <span className="sr-only">Cargando las clases…</span>
    </div>
  );
}

// Títulos de columna solo en pantallas anchas: en celular cada fila se lee sola.
function TitulosDeColumna({ propietaria }: { propietaria: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="hidden grid-cols-[5rem_minmax(0,1fr)_9rem_7rem_9rem] gap-x-5 border-b border-border bg-muted/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground md:grid"
    >
      <span>Horario</span>
      <span>{propietaria ? "Actividad y profesora" : "Actividad"}</span>
      <span>Inscriptos</span>
      <span>Estado</span>
      <span />
    </div>
  );
}

export function ClasesDelDia({ clases, baseRuta, fecha, error, cargando, propietaria, profesoras, onFechaChange, onReintentar }: Props) {
  const esHoy = fecha === fechaActualArgentina();
  const conEstado = clases.map((clase) => ({ clase, estado: estadoVisible(clase, esHoy) }));
  const esListaVacia = !cargando && !error && clases.length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <Encabezado fecha={fecha} propietaria={propietaria} onFechaChange={onFechaChange} />

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
        <Cargando />
      ) : esListaVacia ? (
        <ListaVacia propietaria={propietaria} />
      ) : (
        clases.length > 0 && (
          <div className="space-y-3">
            <Resumen estados={conEstado.map(({ estado }) => estado)} />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <TitulosDeColumna propietaria={propietaria} />
              <ul aria-label={`Clases del ${fechaLarga(fecha)}`} className="divide-y divide-border">
                {conEstado.map(({ clase, estado }) => (
                  <FilaClase
                    key={clase.id_clase}
                    clase={clase}
                    estado={estado}
                    to={enlaceDeClase(baseRuta, fecha, propietaria, clase.id_clase)}
                    profesora={propietaria ? profesoras?.get(clase.id_prof_dictante) : undefined}
                  />
                ))}
              </ul>
            </div>
          </div>
        )
      )}
    </section>
  );
}
