import { useState, useEffect } from "react";
import {
  MessageCircle,
  Phone,
  Mail,
  RotateCcw,
  Clock,
  Ban,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AlumnoInactivo } from "@/features/inactivos/schemas/inactivos";
import { useQuitarSeguimiento, useRegistrarSeguimiento } from "@/features/inactivos/hooks/use-inactivos";
import {
  formatearUltimaAsistencia,
  generarEnlaceWhatsApp,
  generarMensajeReintegro,
  obtenerContactoPrioritario,
} from "@/features/inactivos/utils/formato-inactivos";
import { enlaceTelefono } from "@/features/alumnos/utils/formato-ficha";

interface Props {
  alumno: AlumnoInactivo | null;
  abierto: boolean;
  onClose: () => void;
}

const OPCIONES_ESTADO: Array<{
  valor: "CONTACTADO" | "IGNORADO";
  titulo: string;
  descripcion: string;
  icono: typeof Clock;
  colorActivo: string;
}> = [
    {
      valor: "CONTACTADO",
      titulo: "Contactado",
      descripcion: "Se envió mensaje o se llamó para conocer el motivo de la inasistencia e incentivar el regreso.",
      icono: Clock,
      colorActivo: "border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 text-slate-900 dark:text-white",
    },
    {
      valor: "IGNORADO",
      titulo: "Ignorar por ahora",
      descripcion: "Se decide no contactar en este momento. Se oculta del listado principal de alertas.",
      icono: Ban,
      colorActivo: "border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 text-slate-900 dark:text-white",
    },
  ];

export function ModalGestionInactividad({ alumno, abierto, onClose }: Props) {
  const registrar = useRegistrarSeguimiento();
  const quitar = useQuitarSeguimiento();

  const [estadoSeleccionado, setEstadoSeleccionado] = useState<"CONTACTADO" | "IGNORADO">("CONTACTADO");

  // Al abrir el modal con un alumno seleccionado, inicializar con su estado actual (o CONTACTADO)
  useEffect(() => {
    if (alumno) {
      if (alumno.gestion.estado === "IGNORADO") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEstadoSeleccionado("IGNORADO");
      } else {
        setEstadoSeleccionado("CONTACTADO");
      }
    }
  }, [alumno]);

  if (!alumno) return null;

  const contacto = obtenerContactoPrioritario(alumno);
  const mensajeWa = generarMensajeReintegro(alumno);
  const enlaceWa = generarEnlaceWhatsApp(contacto.telefono, mensajeWa);
  const enlaceTel = contacto.telefono ? enlaceTelefono(contacto.telefono) : null;

  const estadoActual = alumno.gestion.estado;
  const esPendiente = estadoActual === "PENDIENTE";
  const guardando = registrar.isPending || quitar.isPending;

  async function handleGuardar() {
    if (!alumno) return;
    await registrar.mutateAsync({
      idInscripcion: alumno.id_inscripcion,
      estado: estadoSeleccionado,
    });
    onClose();
  }

  async function handleRevertirAPendiente() {
    if (!alumno) return;
    await quitar.mutateAsync(alumno.id_inscripcion);
    onClose();
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && !guardando && onClose()}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-lg md:max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low"
      >
        {/* Encabezado con título */}
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Seguimiento de alumno
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Acción proactiva para incentivar el reintegro
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Tarjeta de resumen del alumno y plan */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                {alumno.alumno.nombre} {alumno.alumno.apellido}
              </p>
              {contacto.esTutor && (
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mt-0.5">
                  Tutor a cargo: {contacto.nombreCompleto} (menor de edad)
                </p>
              )}
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                {alumno.plan.nombre} • Prof. {alumno.profesora.nombre} {alumno.profesora.apellido}
              </p>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "font-bold text-xs shrink-0 rounded-full px-2.5 py-0.5",
                alumno.inasistencias_consecutivas >= 4
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
              )}
            >
              <AlertTriangle className="mr-1 size-3" />
              {alumno.inasistencias_consecutivas} faltas seguidas
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 text-slate-400" />
              Última asistencia:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatearUltimaAsistencia(alumno.fecha_ultima_asistencia)}
              </strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              Cuota:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {alumno.estado_cuota === "AL_DIA" ? "Al día" : "Por vencer"}
              </strong>
            </span>
          </div>

          {/* Botones de contacto directo */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            {enlaceWa ? (
              <a
                href={enlaceWa}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 active:scale-95"
              >
                <MessageCircle className="size-4" />
                Abrir WhatsApp con mensaje
              </a>
            ) : null}

            {enlaceTel && (
              <a
                href={enlaceTel}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Phone className="size-3.5 text-slate-400" />
                {contacto.telefono}
              </a>
            )}

            {contacto.email && (
              <a
                href={`mailto:${contacto.email}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Mail className="size-3.5 text-slate-400" />
                <span className="truncate max-w-[150px]">{contacto.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Opciones de seguimiento */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Actualizar estado de seguimiento
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {OPCIONES_ESTADO.map((opcion) => {
              const seleccionado = estadoSeleccionado === opcion.valor;
              const Icono = opcion.icono;

              return (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setEstadoSeleccionado(opcion.valor)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all",
                    seleccionado
                      ? opcion.colorActivo
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      seleccionado
                        ? "border-current bg-current text-white dark:text-slate-950"
                        : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {seleccionado && <span className="size-2 rounded-full bg-white dark:bg-slate-900" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icono className="size-4" />
                      <span className="text-sm font-bold">{opcion.titulo}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-90 leading-relaxed font-medium">
                      {opcion.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Acción para revertir a pendiente si ya tenía marca previa */}
        {!esPendiente && (
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={guardando}
              onClick={handleRevertirAPendiente}
              className="w-full rounded-xl border-amber-300 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold text-xs sm:text-sm h-10 px-4"
            >
              <RotateCcw className="mr-2 size-4" />
              Revertir a estado Pendiente
            </Button>
          </div>
        )}
      </div>

      {/* Footer con botones Cancelar y Guardar */}
      <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={guardando}
          className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
        >
          {guardando ? "Guardando..." : "Guardar seguimiento"}
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}
