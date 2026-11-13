import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CircleAlert, Clock, Loader2, LockKeyhole, Users, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { cn } from "@/utils/cn";
import { BOTON_FILA, BOTON_FILA_PELIGRO } from "@/components/ui/estilos-lista";
import { BOTON_MODAL, CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import { Card, CardContent } from "@/components/ui/card";
import type {
  AsistenciaDeClaseApi,
  ClaseApi,
  InscriptoConAsistenciaApi,
} from "@/features/asistencia/schemas/asistencia";
import {
  fechaLarga,
  fechaYHoraCorta,
  rangoHorario,
  puedeTomarAsistencia,
  estadoMomentoClase,
} from "@/features/asistencia/utils/formato-clase";
import { fechaActualArgentina } from "@/utils/fecha";

interface Props {
  datos: AsistenciaDeClaseApi;
  volver: string;
  propietaria: boolean;
  guardando: boolean;
  error: string | null;
  alMarcar: (idAlumno: number, asistio: boolean) => Promise<void>;
  alMarcarTodos: () => Promise<void>;
  alCerrar: () => Promise<void>;
  reintentar: () => void;
}

function etiquetaEstadoClase(estado: ClaseApi["estado"]): string {
  if (estado === "DICTADA") return "Asistencia cerrada";
  if (estado === "CANCELADA") return "Clase cancelada";
  return "Asistencia abierta";
}

function EstadoCuota({ inscripto }: { inscripto: InscriptoConAsistenciaApi }) {
  const situacion = inscripto.situacion_cuota;
  if (!situacion) return <BadgeSituacionCuota situacion={null} />;
  const advertencia = !situacion.puede_asistir;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BadgeSituacionCuota situacion={situacion} />
      {situacion.tiene_pago_pendiente && (
        <span className="text-xs text-muted-foreground">Transferencia pendiente de verificación</span>
      )}
      {advertencia && (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          Revisar habilitación
        </span>
      )}
    </div>
  );
}

function BotonesAsistencia({
  inscripto,
  editable,
  guardando,
  alMarcar,
}: {
  inscripto: InscriptoConAsistenciaApi;
  editable: boolean;
  guardando: boolean;
  alMarcar: (asistio: boolean) => void;
}) {
  const presente = inscripto.asistencia === "presente";
  const ausente = inscripto.asistencia === "ausente";
  return (
    <div className="flex items-center gap-2 xl:justify-end" aria-label={`Asistencia de ${inscripto.nombre} ${inscripto.apellido}`}>
      <Button
        type="button"
        variant="outline"
        aria-pressed={presente}
        disabled={!editable || guardando}
        onClick={() => alMarcar(true)}
        className={cn(
          BOTON_FILA,
          "flex-1 xl:flex-initial [&_svg]:size-3.5",
          presente
            ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-600"
            : "hover:text-emerald-600 dark:hover:text-emerald-400",
        )}
      >
        <Check aria-hidden="true" />
        Presente
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-pressed={ausente}
        disabled={!editable || guardando}
        onClick={() => alMarcar(false)}
        className={cn(
          BOTON_FILA_PELIGRO,
          "flex-1 xl:flex-initial [&_svg]:size-3.5",
          ausente && "border-rose-600 bg-rose-600 text-white hover:bg-rose-700 hover:text-white dark:border-rose-600 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700",
        )}
      >
        <X aria-hidden="true" />
        Ausente
      </Button>
    </div>
  );
}

function InscriptoCard({
  inscripto,
  editable,
  guardando,
  alMarcar,
}: {
  inscripto: InscriptoConAsistenciaApi;
  editable: boolean;
  guardando: boolean;
  alMarcar: (idAlumno: number, asistio: boolean) => void;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="break-words text-base font-extrabold text-foreground">
            {inscripto.nombre} {inscripto.apellido}
          </h3>
          <Badge variant="outline" className="mt-1">
            {inscripto.asistencia === "sin_marcar"
              ? "Sin marcar"
              : inscripto.asistencia === "presente"
                ? "Presente"
                : "Ausente"}
          </Badge>
          {inscripto.observaciones && (
            <p className="mt-1 break-words text-sm text-muted-foreground">{inscripto.observaciones}</p>
          )}
          <div className="mt-2"><EstadoCuota inscripto={inscripto} /></div>
        </div>
        <BotonesAsistencia
          inscripto={inscripto}
          editable={editable}
          guardando={guardando}
          alMarcar={(asistio) => alMarcar(inscripto.id_alumno, asistio)}
        />
      </CardContent>
    </Card>
  );
}

function ConfirmarCierre({
  abiertos,
  guardando,
  alConfirmar,
}: {
  abiertos: number;
  guardando: boolean;
  alConfirmar: () => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function confirmar() {
    setConfirmando(true);
    try {
      await alConfirmar();
      setAbierto(false);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={guardando || confirmando}
        onClick={() => setAbierto(true)}
        className="h-9 min-h-0 w-full rounded-lg px-3 text-xs font-semibold sm:w-auto [&_svg]:size-3.5"
      >
        {confirmando && <Loader2 aria-hidden="true" className="animate-spin" />}
        Cerrar asistencia
      </Button>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent className={cn(CONTENIDO_MODAL, "w-[calc(100%-2rem)] max-w-md sm:w-full")}>
          <AlertDialogHeader className={CABECERA_MODAL}>
            <AlertDialogTitle className={TITULO_MODAL}>¿Cerrar la asistencia de esta clase?</AlertDialogTitle>
            <AlertDialogDescription className={DESCRIPCION_MODAL}>
              {abiertos > 0
                ? `${abiertos} ${abiertos === 1 ? "inscripto sin marcar pasará" : "inscriptos sin marcar pasarán"} a ausente.`
                : "No hay inscriptos sin marcar."}{" "}
              Después del cierre, solo la propietaria podrá corregir las marcas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={PIE_MODAL}>
            <AlertDialogCancel disabled={confirmando} className={BOTON_MODAL}>
              Seguir tomando asistencia
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmando}
              onClick={(evento) => {
                evento.preventDefault();
                void confirmar().catch(() => undefined);
              }}
              className={cn(BOTON_MODAL, "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {confirmando ? "Cerrando…" : "Confirmar cierre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RegistroAsistencia({
  datos,
  volver,
  propietaria,
  guardando,
  error,
  alMarcar,
  alMarcarTodos,
  alCerrar,
  reintentar,
}: Props) {
  const { clase, inscriptos } = datos;
  const sinMarcar = inscriptos.filter((inscripto) => inscripto.asistencia === "sin_marcar").length;
  const fechaHoy = fechaActualArgentina();
  const esHoy = clase.fecha_clase.slice(0, 10) === fechaHoy;
  const momento = estadoMomentoClase(clase);
  const puedeEditar = puedeTomarAsistencia(clase, esHoy, propietaria);
  const cancelada = clase.estado === "CANCELADA";
  const hora = rangoHorario(clase);

  return (
    <div className="space-y-6 min-w-0">
      <Link
        to={volver}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a las clases
      </Link>

      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {clase.horario.actividad.nombre}
          </h1>
          <Badge variant="outline" className="rounded-full font-semibold">
            {clase.horario.actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada"}
          </Badge>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
              clase.estado === "PROGRAMADA"
                ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                : clase.estado === "CANCELADA"
                  ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                clase.estado === "PROGRAMADA"
                  ? "bg-emerald-500"
                  : clase.estado === "CANCELADA"
                    ? "bg-rose-500"
                    : "bg-slate-400",
              )}
            />
            {etiquetaEstadoClase(clase.estado)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="inline-block first-letter:uppercase">{fechaLarga(clase.fecha_clase)}</span> · {hora}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-4" />
            {inscriptos.length} {inscriptos.length === 1 ? "inscripto" : "inscriptos"}
          </span>
        </div>
      </header>

      {clase.estado === "DICTADA" && (
        <Alert className="rounded-xl">
          <LockKeyhole aria-hidden="true" />
          <AlertDescription>
            Asistencia cerrada{clase.fecha_cierre_asist ? ` el ${fechaYHoraCorta(clase.fecha_cierre_asist)}` : ""}. Los inscriptos que seguían sin marcar quedaron registrados como ausentes.
            {propietaria && " Podés corregir marcas individuales; cada cambio queda registrado por el sistema."}
          </AlertDescription>
        </Alert>
      )}

      {!puedeEditar && !propietaria && !cancelada && clase.estado === "PROGRAMADA" && (
        <Alert className="rounded-xl border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          <Clock aria-hidden="true" className="size-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            {momento === "ANTES"
              ? `La toma de asistencia se abrirá durante el horario de la clase (de ${hora}). La lista de inscriptos se encuentra en modo de solo lectura.`
              : `El horario de la clase ha finalizado (de ${hora}). La lista de inscriptos se encuentra en modo de solo lectura.`}
          </AlertDescription>
        </Alert>
      )}

      {cancelada && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>La clase fue cancelada y no genera registros de inasistencia.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={reintentar} className="min-h-11 shrink-0">
              Actualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Lista de inscriptos</h2>
          <p className="text-sm text-muted-foreground">
            {puedeEditar ? "Las marcas se guardan al instante." : "Esta lista está en modo de solo lectura."}
          </p>
          {puedeEditar && clase.estado === "PROGRAMADA" && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Si no se marca nada, se pondrán todos como presentes.
            </p>
          )}
        </div>
        {puedeEditar && clase.estado === "PROGRAMADA" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {inscriptos.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={guardando}
                onClick={() => void alMarcarTodos()}
                className={cn(BOTON_FILA, "h-9 w-full sm:w-auto [&_svg]:size-3.5")}
              >
                <Check aria-hidden="true" />
                Marcar todos presentes
              </Button>
            )}
            <ConfirmarCierre abiertos={sinMarcar} guardando={guardando} alConfirmar={alCerrar} />
          </div>
        )}
      </div>

      {inscriptos.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <h3 className="text-base font-bold text-foreground">No hay alumnos inscriptos</h3>
            <p className="text-sm text-muted-foreground">No se generarán inasistencias para esta clase.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 xl:hidden">
            {inscriptos.map((inscripto) => (
              <InscriptoCard
                key={inscripto.id_alumno}
                inscripto={inscripto}
                editable={puedeEditar && !cancelada}
                guardando={guardando}
                alMarcar={alMarcar}
              />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Asistencia de {clase.horario.actividad.nombre}</caption>
                <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Alumno</th>
                    <th scope="col" className="px-4 py-3.5">Estado de cuota</th>
                    <th scope="col" className="px-4 py-3.5">Registro</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Marcar asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {inscriptos.map((inscripto) => (
                    <tr key={inscripto.id_alumno} className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {inscripto.nombre} {inscripto.apellido}
                        {inscripto.observaciones && (
                          <p className="mt-1 break-words text-xs font-normal text-muted-foreground">
                            {inscripto.observaciones}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><EstadoCuota inscripto={inscripto} /></td>
                      <td className="px-4 py-3.5">
                        {inscripto.asistencia === "sin_marcar"
                          ? <span className="text-muted-foreground">Sin marcar</span>
                          : <Badge variant="outline">{inscripto.asistencia === "presente" ? "Presente" : "Ausente"}</Badge>}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <BotonesAsistencia
                          inscripto={inscripto}
                          editable={puedeEditar && !cancelada}
                          guardando={guardando}
                          alMarcar={(asistio) => void alMarcar(inscripto.id_alumno, asistio)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
