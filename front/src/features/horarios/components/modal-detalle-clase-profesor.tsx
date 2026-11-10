import { X, Clock, Calendar, Users, Dumbbell, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Horario } from "@/types/horarios";

interface Props {
  horario: Horario | null;
  abierto: boolean;
  onClose: () => void;
}

const NOMBRES_DIAS: Record<string, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export function ModalDetalleClaseProfesor({ horario, abierto, onClose }: Props) {
  if (!horario) return null;

  const esPersonalizada = horario.actividadTipo === "PERSONALIZADA";

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent
        hideClose
        className="w-[96vw] sm:w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <DialogTitle className="sr-only">Detalle de clase semanal</DialogTitle>
        <DialogDescription className="sr-only">
          Información detallada de la clase, actividad, horario y cupo asignado.
        </DialogDescription>

        {/* Encabezado con título y botón de cierre */}
        <DialogHeader className="flex flex-row items-start justify-between pb-2 text-left">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  esPersonalizada
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                }
              >
                {esPersonalizada ? "Personalizada" : "Grupal"}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {horario.actividadNombre}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {/* Datos clave de la clase */}
        <div className="space-y-3 py-2">
          {/* Tarjeta de Día y Horario */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                <Calendar className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Día</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {NOMBRES_DIAS[horario.diaSemana] || horario.diaSemana}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="size-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <Clock className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horario</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {horario.horaInicio} a {horario.horaFin} hs
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Cupo */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Users className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capacidad máxima</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {horario.cupoMaximo ? `${horario.cupoMaximo} personas` : "Sin cupo límite configurado"}
                </p>
                {horario.cupoPropio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    (Cupo específico del horario: {horario.cupoPropio})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Información del Docente */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Dumbbell className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profesor/a a cargo</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {horario.profesoraNombre}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie con acciones */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-slate-300 dark:border-slate-700 font-semibold"
          >
            Cerrar
          </Button>

          <Button
            asChild
            className="w-full sm:w-auto rounded-xl bg-primary px-4 text-sm font-extrabold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
          >
            <Link to="/app/hoy">
              Ir a clases de hoy
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
