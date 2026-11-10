import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Actividad } from '../../../types/actividad';
import type { Profesora, DiaSemana, Horario, HorarioFormData } from '../../../types/horarios';
import { AlertCircle } from 'lucide-react';
import { textoCupo } from '../utils/cupo';
import { horarioFormSchema } from '../schemas/horario';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

interface HorarioModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HorarioFormData) => { ok: true } | { ok: false; error: string };
  onValidate?: (data: HorarioFormData, ignoreId?: string) => { ok: true } | { ok: false; error: string };
  onDelete?: () => void;
  actividades: Actividad[];
  profesoras: Profesora[];
  horarioEnEdicion?: Horario | null;
  diaSugerido?: DiaSemana;
  horaSugerida?: string;
}

const DIAS_BOTONES: { id: DiaSemana; label: string }[] = [
  { id: 'LUNES', label: 'Lun' },
  { id: 'MARTES', label: 'Mar' },
  { id: 'MIERCOLES', label: 'Mié' },
  { id: 'JUEVES', label: 'Jue' },
  { id: 'VIERNES', label: 'Vie' },
];

function horaFinSugerida(horaInicioSugerida: string): string {
  const [h, m] = horaInicioSugerida.split(':').map(Number);
  const nextH = Math.min(h + 1, 23);
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const HorarioModalForm: React.FC<HorarioModalFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onValidate,
  onDelete,
  actividades,
  profesoras,
  horarioEnEdicion,
  diaSugerido,
  horaSugerida,
}) => {
  const [actividadId, setActividadId] = useState<string>(
    horarioEnEdicion?.actividadId ?? actividades[0]?.id ?? '',
  );
  const [profesoraId, setProfesoraId] = useState<string>(
    horarioEnEdicion?.profesoraId ?? profesoras[0]?.id ?? '',
  );
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(
    horarioEnEdicion?.diaSemana ?? diaSugerido ?? 'LUNES',
  );
  const [horaInicio, setHoraInicio] = useState<string>(
    horarioEnEdicion?.horaInicio ?? horaSugerida ?? '16:00',
  );
  const [horaFin, setHoraFin] = useState<string>(() =>
    horarioEnEdicion ? horarioEnEdicion.horaFin : horaFinSugerida(horaSugerida ?? '16:00'),
  );
  const [cupoPropio, setCupoPropio] = useState<number | null>(horarioEnEdicion?.cupoPropio ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const primerCampoRef = useRef<HTMLButtonElement>(null);

  const selectedActividad = actividades.find((a) => a.id === actividadId);
  const cupoActividadTexto = textoCupo(selectedActividad?.cupoMaximo ?? null);

  const getFormData = (): HorarioFormData => ({
    actividadId,
    profesoraId,
    diaSemana,
    horaInicio,
    horaFin,
    cupoPropio,
  });

  const validarCamposBasicos = (): boolean => {
    const resultado = horarioFormSchema.safeParse(getFormData());
    if (!resultado.success) {
      setErrorMessage(resultado.error.issues[0].message);
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validarCamposBasicos()) return;

    const formData = getFormData();

    if (onValidate) {
      const validacion = onValidate(formData, horarioEnEdicion?.id);
      if (!validacion.ok) {
        setErrorMessage(validacion.error || 'Conflicto de superposición detectado.');
        return;
      }
    }

    ejecutarGuardado();
  };

  const ejecutarGuardado = () => {
    const result = onSave(getFormData());

    if (!result.ok) {
      setErrorMessage(result.error);
    } else {
      onClose();
    }
  };

  const hayErrorHorario = Boolean(errorMessage);

  const alumnosInscriptos = (horarioEnEdicion as unknown as { inscriptos_count?: number; inscriptosCount?: number })?.inscriptos_count ??
    (horarioEnEdicion as unknown as { inscriptos_count?: number; inscriptosCount?: number })?.inscriptosCount ?? 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] w-[96vw] sm:w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Cabecera del modal del mismo color que el body */}
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {horarioEnEdicion ? 'Editar horario' : 'Nuevo horario'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Configurá la actividad, profesor/a, día y franja horaria de la clase.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Alerta de Conflicto de Superposición / Validación de Horario */}
            {errorMessage && (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 flex items-start gap-3 animate-in fade-in duration-200 mb-2">
                <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="sr-only">Validación de Horario</span>
                  <p className="text-xs sm:text-sm font-medium text-rose-900 dark:text-rose-200 leading-snug">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}
          {/* Fila 1: Actividad y Profesora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="horario-actividad" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Actividad <span className="text-destructive">*</span>
              </Label>
              <Select value={actividadId} onValueChange={setActividadId}>
                <SelectTrigger
                  id="horario-actividad"
                  ref={primerCampoRef}
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <SelectValue placeholder={actividades.length === 0 ? "Sin actividades activas" : "Seleccionar actividad"} />
                </SelectTrigger>
                <SelectContent>
                  {actividades.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No hay actividades activas.
                    </div>
                  ) : (
                    actividades.map((act) => (
                      <SelectItem key={act.id} value={act.id}>
                        {act.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {actividades.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  No hay actividades.{" "}
                  <Link to="/app/actividades" className="font-bold underline hover:text-amber-700">
                    Crear actividad
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horario-profesora" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Profesor/a <span className="text-destructive">*</span>
              </Label>
              <Select value={profesoraId} onValueChange={setProfesoraId}>
                <SelectTrigger
                  id="horario-profesora"
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <SelectValue placeholder={profesoras.length === 0 ? "Sin profesores activos" : "Seleccionar profesor/a"} />
                </SelectTrigger>
                <SelectContent>
                  {profesoras.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No hay profesores activos.
                    </div>
                  ) : (
                    profesoras.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.nombre} {prof.apellido}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {profesoras.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  No hay profesores.{" "}
                  <Link to="/app/profesoras" className="font-bold underline hover:text-amber-700">
                    Crear profesor/a
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Fila 2: Día (botones horizontales) */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Día <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {DIAS_BOTONES.map((dia) => {
                const isSelected = diaSemana === dia.id;
                return (
                  <button
                    type="button"
                    key={dia.id}
                    onClick={() => setDiaSemana(dia.id)}
                    className={cn(
                      "h-10 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Empieza y Termina */}
          <div className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="horario-inicio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Empieza <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="horario-inicio"
                  aria-label="Hora Inicio"
                  type="time"
                  min="07:00"
                  max="22:00"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className={cn(
                    "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                    hayErrorHorario && "border-rose-500 focus-visible:ring-rose-500/20",
                  )}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="horario-fin" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Termina <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="horario-fin"
                  aria-label="Hora Fin"
                  type="time"
                  min="08:00"
                  max="23:00"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className={cn(
                    "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                    hayErrorHorario && "border-rose-500 focus-visible:ring-rose-500/20",
                  )}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              El centro abre de 07:00 a 23:00.
            </p>
          </div>

          {/* Fila 4: Cupo (opcional) */}
          <div className="space-y-1">
            <Label htmlFor="horario-cupo" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Cupo <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="horario-cupo"
              type="number"
              min="1"
              max="32767"
              value={cupoPropio ?? ''}
              onChange={(e) => {
                const digitos = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                setCupoPropio(digitos ? parseInt(digitos, 10) : null);
              }}
              className="w-32 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              placeholder={cupoActividadTexto}
            />
            <p className="text-xs text-muted-foreground pt-1">
              Si lo dejás vacío usa el de la actividad ({cupoActividadTexto}).
            </p>
          </div>

          {/* Fila 5: Caja en edición con conteo de alumnos y botón eliminar */}
          {horarioEnEdicion && (
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {alumnosInscriptos} alumnos <span className="font-normal text-muted-foreground">en esta clase</span>
              </span>
              {onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDelete}
                  className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 font-bold text-xs hover:bg-rose-50"
                >
                  Eliminar horario
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer del mismo color que el body */}
        <div className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            aria-label="Aceptar"
            className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
          >
            {horarioEnEdicion ? 'Guardar cambios' : 'Crear horario'}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
  );
};
