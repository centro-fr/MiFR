import { useState } from "react";
import { Check, Clock, LockKeyhole, X } from "lucide-react";
import { AvatarIniciales, AvisoVacio, CAJA, EnlaceVolver, FILA } from "@/components/movil/piezas";
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
import { BOTON_MODAL, CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import type { AsistenciaDeClaseApi, InscriptoConAsistenciaApi } from "@/features/asistencia/schemas/asistencia";
import {
  estadoMomentoClase,
  fechaYHoraCorta,
  puedeTomarAsistencia,
  rangoHorario,
} from "@/features/asistencia/utils/formato-clase";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";

// US-20: toma de asistencia de una clase, con el diseño mobile de la profesora. Cada marca se guarda al
// tocarla; cerrar la asistencia pasa a ausente a los que quedaron sin marcar.

interface Props {
  datos: AsistenciaDeClaseApi;
  volver: string;
  /** La propietaria puede corregir marcas en cualquier momento. */
  propietaria: boolean;
  guardando: boolean;
  error: string | null;
  alMarcar: (idAlumno: number, asistio: boolean) => Promise<void>;
  alMarcarTodos: () => Promise<void>;
  alCerrar: () => Promise<void>;
  reintentar: () => void;
}

const BOTON_SECUNDARIO =
  "flex items-center justify-center rounded-lg border border-slate-400 bg-card text-sm font-semibold text-foreground hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-white/5";

function avisoDeCuota(inscripto: InscriptoConAsistenciaApi): string | null {
  const situacion = inscripto.situacion_cuota;
  if (!situacion) return null;
  if (!situacion.puede_asistir) return "Revisar habilitación";
  if (situacion.estado === "VENCIDA" || situacion.estado === "CLASE_SUELTA_VENCIDA") return "Cuota vencida";
  if (situacion.tiene_pago_pendiente) return "Transferencia por verificar";
  return null;
}

function resumen(inscriptos: InscriptoConAsistenciaApi[]): string {
  const presentes = inscriptos.filter((i) => i.asistencia === "presente").length;
  const ausentes = inscriptos.filter((i) => i.asistencia === "ausente").length;
  const sinMarcar = inscriptos.length - presentes - ausentes;
  const partes = [
    `${presentes} ${presentes === 1 ? "presente" : "presentes"}`,
    `${ausentes} ${ausentes === 1 ? "ausente" : "ausentes"}`,
  ];
  if (sinMarcar > 0) partes.push(`${sinMarcar} sin marcar`);
  return partes.join(" · ");
}

interface PropsMarca {
  etiqueta: "Presente" | "Ausente";
  marcado: boolean;
  deshabilitado: boolean;
  onMarcar: () => void;
}

function BotonMarca({ etiqueta, marcado, deshabilitado, onMarcar }: PropsMarca) {
  const Icono = etiqueta === "Presente" ? Check : X;
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-pressed={marcado}
      disabled={deshabilitado}
      onClick={onMarcar}
      className={cn(
        "flex h-10 w-11 items-center justify-center rounded-lg border disabled:cursor-not-allowed",
        !marcado && "border-slate-300 bg-card text-slate-500 dark:border-slate-600 dark:text-slate-400",
        marcado && etiqueta === "Presente" && "border-emerald-500 bg-emerald-500 text-white",
        marcado && etiqueta === "Ausente" && "border-red-700 bg-red-700 text-white",
        deshabilitado && !marcado && "opacity-50",
      )}
    >
      <Icono aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
    </button>
  );
}

function FilaInscripto({
  inscripto,
  editable,
  guardando,
  alMarcar,
}: {
  inscripto: InscriptoConAsistenciaApi;
  editable: boolean;
  guardando: boolean;
  alMarcar: (idAlumno: number, asistio: boolean) => Promise<void>;
}) {
  const nombre = `${inscripto.nombre} ${inscripto.apellido}`;
  const aviso = [avisoDeCuota(inscripto), inscripto.observaciones].filter(Boolean).join(" · ");
  const deshabilitado = !editable || guardando;
  return (
    <li className={cn(FILA, "flex items-center gap-3 py-2.5 pr-3 pl-3.5")}>
      <AvatarIniciales nombre={nombre} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{nombre}</div>
        {aviso && <div className="text-xs text-muted-foreground">{aviso}</div>}
      </div>
      <div role="group" aria-label={`Asistencia de ${nombre}`} className="flex gap-1">
        <BotonMarca
          etiqueta="Presente"
          marcado={inscripto.asistencia === "presente"}
          deshabilitado={deshabilitado}
          onMarcar={() => void alMarcar(inscripto.id_alumno, true)}
        />
        <BotonMarca
          etiqueta="Ausente"
          marcado={inscripto.asistencia === "ausente"}
          deshabilitado={deshabilitado}
          onMarcar={() => void alMarcar(inscripto.id_alumno, false)}
        />
      </div>
    </li>
  );
}

function ConfirmarCierre({ sinMarcar, guardando, alConfirmar }: { sinMarcar: number; guardando: boolean; alConfirmar: () => Promise<void> }) {
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
      <button
        type="button"
        disabled={guardando || confirmando}
        onClick={() => setAbierto(true)}
        className={cn(BOTON_SECUNDARIO, "h-11 rounded-xl")}
      >
        Cerrar asistencia
      </button>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent className={cn(CONTENIDO_MODAL, "w-[calc(100%-2rem)] max-w-md sm:w-full")}>
          <AlertDialogHeader className={CABECERA_MODAL}>
            <AlertDialogTitle className={TITULO_MODAL}>¿Cerrar la asistencia de esta clase?</AlertDialogTitle>
            <AlertDialogDescription className={DESCRIPCION_MODAL}>
              {sinMarcar > 0
                ? `${sinMarcar} ${sinMarcar === 1 ? "inscripto sin marcar pasará" : "inscriptos sin marcar pasarán"} a ausente.`
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

function AvisoDeEstado({ datos, puedeEditar, propietaria }: Pick<Props, "datos" | "propietaria"> & { puedeEditar: boolean }) {
  const { clase } = datos;
  if (clase.estado === "CANCELADA") {
    return (
      <Alert variant="destructive" className="rounded-xl">
        <AlertDescription>La clase fue cancelada y no genera registros de inasistencia.</AlertDescription>
      </Alert>
    );
  }
  if (clase.estado === "DICTADA") {
    return (
      <Alert className="rounded-xl">
        <LockKeyhole aria-hidden="true" />
        <AlertDescription>
          Asistencia cerrada{clase.fecha_cierre_asist ? ` el ${fechaYHoraCorta(clase.fecha_cierre_asist)}` : ""}.
          {propietaria && " Podés corregir marcas individuales; cada cambio queda registrado."}
        </AlertDescription>
      </Alert>
    );
  }
  if (puedeEditar) return null;
  return (
    <Alert className="rounded-xl">
      <Clock aria-hidden="true" />
      <AlertDescription>
        {estadoMomentoClase(clase) === "ANTES"
          ? `La asistencia se abre en el horario de la clase (de ${rangoHorario(clase)}).`
          : `La clase ya terminó (de ${rangoHorario(clase)}).`}
      </AlertDescription>
    </Alert>
  );
}

export function TomaDeAsistencia({ datos, volver, propietaria, guardando, error, alMarcar, alMarcarTodos, alCerrar, reintentar }: Props) {
  const { clase, inscriptos } = datos;
  const esHoy = clase.fecha_clase.slice(0, 10) === fechaActualArgentina();
  const puedeEditar = puedeTomarAsistencia(clase, esHoy, propietaria);
  const abierta = puedeEditar && clase.estado === "PROGRAMADA";
  const sinMarcar = inscriptos.filter((inscripto) => inscripto.asistencia === "sin_marcar").length;

  return (
    <>
      <EnlaceVolver to={volver}>Volver a mis clases</EnlaceVolver>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{clase.horario.actividad.nombre}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {esHoy ? "Hoy" : "El día de la clase"} de {rangoHorario(clase)}
          </p>
        </div>
        {abierta && inscriptos.length > 0 && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => void alMarcarTodos()}
            className={cn(BOTON_SECUNDARIO, "h-9 shrink-0 px-3")}
          >
            Todos presentes
          </button>
        )}
      </div>

      <AvisoDeEstado datos={datos} puedeEditar={puedeEditar} propietaria={propietaria} />

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={reintentar} className={cn(BOTON_SECUNDARIO, "h-9 shrink-0 px-3")}>
              Actualizar
            </button>
          </AlertDescription>
        </Alert>
      )}

      {inscriptos.length === 0 ? (
        <AvisoVacio>No hay alumnos inscriptos en esta clase.</AvisoVacio>
      ) : (
        <>
          <p aria-live="polite" className="font-semibold tabular-nums">
            {resumen(inscriptos)}
          </p>
          <ul aria-label="Alumnos inscriptos" className={cn(CAJA, "overflow-hidden")}>
            {inscriptos.map((inscripto) => (
              <FilaInscripto
                key={inscripto.id_alumno}
                inscripto={inscripto}
                editable={puedeEditar && clase.estado !== "CANCELADA"}
                guardando={guardando}
                alMarcar={alMarcar}
              />
            ))}
          </ul>
        </>
      )}

      {abierta && (
        <>
          <p className="text-xs text-muted-foreground">
            Se guarda al tocar. Si no se marca nada, se pondrán todos como presentes. Si no la cerrás, se cierra sola un rato después de terminar la clase.
          </p>
          <ConfirmarCierre sinMarcar={sinMarcar} guardando={guardando} alConfirmar={alCerrar} />
        </>
      )}
    </>
  );
}
