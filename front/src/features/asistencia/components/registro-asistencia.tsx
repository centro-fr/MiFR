import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CircleAlert, Clock, Loader2, LockKeyhole, Users } from "lucide-react";
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

const ESTADO_CUOTA: Record<NonNullable<InscriptoConAsistenciaApi["situacion_cuota"]>["estado"], string> = {
  AL_DIA: "Al día",
  POR_VENCER: "Por vencer",
  VENCIDA: "Vencida",
  CLASE_SUELTA_VIGENTE: "Clase vigente",
  CLASE_SUELTA_VENCIDA: "Clase vencida",
  PENDIENTE_DE_PAGO: "Sin transferencia confirmada",
};

function etiquetaEstadoClase(estado: ClaseApi["estado"]): string {
  if (estado === "DICTADA") return "Asistencia cerrada";
  if (estado === "CANCELADA") return "Clase cancelada";
  return "Asistencia abierta";
}

function EstadoCuota({ inscripto }: { inscripto: InscriptoConAsistenciaApi }) {
  const situacion = inscripto.situacion_cuota;
  if (!situacion) return <Badge variant="outline">Sin datos de cuota</Badge>;
  const advertencia = !situacion.puede_asistir;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={
          advertencia
            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            : situacion.estado === "VENCIDA" || situacion.estado === "CLASE_SUELTA_VENCIDA"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        }
      >
        {ESTADO_CUOTA[situacion.estado]}
      </Badge>
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
    <div className="grid grid-cols-2 gap-2" aria-label={`Asistencia de ${inscripto.nombre} ${inscripto.apellido}`}>
      <Button
        type="button"
        variant={presente ? "default" : "outline"}
        aria-pressed={presente}
        disabled={!editable || guardando}
        onClick={() => alMarcar(true)}
        className="min-h-11 rounded-xl"
      >
        <Check aria-hidden="true" />
        Presente
      </Button>
      <Button
        type="button"
        variant={ausente ? "destructive" : "outline"}
        aria-pressed={ausente}
        disabled={!editable || guardando}
        onClick={() => alMarcar(false)}
        className="min-h-11 rounded-xl"
      >
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
        className="min-h-11 w-full rounded-xl sm:w-auto"
      >
        {confirmando && <Loader2 aria-hidden="true" className="animate-spin" />}
        Cerrar asistencia
      </Button>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la asistencia de esta clase?</AlertDialogTitle>
            <AlertDialogDescription>
              {abiertos > 0
                ? `${abiertos} ${abiertos === 1 ? "inscripto sin marcar pasará" : "inscriptos sin marcar pasarán"} a ausente.`
                : "No hay inscriptos sin marcar."}{" "}
              Después del cierre, solo la propietaria podrá corregir las marcas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Seguir tomando asistencia</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmando}
              onClick={(evento) => {
                evento.preventDefault();
                void confirmar().catch(() => undefined);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a las clases
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
              {clase.horario.actividad.nombre}
            </h1>
            <Badge variant="outline">{clase.horario.actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada"}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="inline-block first-letter:uppercase">{fechaLarga(clase.fecha_clase)}</span> · {hora}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users aria-hidden="true" className="size-4" />
            {inscriptos.length} {inscriptos.length === 1 ? "inscripto" : "inscriptos"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            clase.estado === "PROGRAMADA"
              ? "w-fit border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : clase.estado === "CANCELADA"
                ? "w-fit border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                : "w-fit border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
          }
        >
          {etiquetaEstadoClase(clase.estado)}
        </Badge>
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
        </div>
        {puedeEditar && clase.estado === "PROGRAMADA" && inscriptos.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={guardando}
            onClick={() => void alMarcarTodos()}
            className="min-h-11 w-full rounded-xl sm:w-auto"
          >
            <Check aria-hidden="true" />
            Marcar todos presentes
          </Button>
        )}
      </div>

      {inscriptos.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Users aria-hidden="true" className="size-9 text-muted-foreground" />
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
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Asistencia de {clase.horario.actividad.nombre}</caption>
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[24%] px-5 py-4">Alumno</th>
                  <th className="w-[30%] px-5 py-4">Estado de cuota</th>
                  <th className="w-[20%] px-5 py-4">Registro</th>
                  <th className="w-[26%] px-5 py-4">Marcar asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inscriptos.map((inscripto) => (
                  <tr key={inscripto.id_alumno}>
                    <td className="px-5 py-4 font-bold">
                      {inscripto.nombre} {inscripto.apellido}
                      {inscripto.observaciones && (
                        <p className="mt-1 break-words text-xs font-normal text-muted-foreground">
                          {inscripto.observaciones}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4"><EstadoCuota inscripto={inscripto} /></td>
                    <td className="px-5 py-4">
                      {inscripto.asistencia === "sin_marcar"
                        ? <span className="text-muted-foreground">Sin marcar</span>
                        : <Badge variant="outline">{inscripto.asistencia === "presente" ? "Presente" : "Ausente"}</Badge>}
                    </td>
                    <td className="px-5 py-4">
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
        </>
      )}

      {puedeEditar && clase.estado === "PROGRAMADA" && (
        <footer className="sticky bottom-3 z-10 -mx-2 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <ConfirmarCierre abiertos={sinMarcar} guardando={guardando} alConfirmar={alCerrar} />
        </footer>
      )}
    </div>
  );
}
