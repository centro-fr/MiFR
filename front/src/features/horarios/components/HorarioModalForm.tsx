import React, { useRef, useState } from 'react';
import type { Actividad } from '../../../types/actividad';
import type { Profesora, DiaSemana, Horario, HorarioFormData } from '../../../types/horarios';
import { X, AlertCircle } from 'lucide-react';
import { textoCupo } from '../utils/cupo';
import { horarioFormSchema } from '../schemas/horario';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription as AlertDesc, AlertTitle as AlertTitulo } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const DIAS_SEMANA: { id: DiaSemana; label: string }[] = [
  { id: 'LUNES', label: 'Lunes' },
  { id: 'MARTES', label: 'Martes' },
  { id: 'MIERCOLES', label: 'Miércoles' },
  { id: 'JUEVES', label: 'Jueves' },
  { id: 'VIERNES', label: 'Viernes' },
  { id: 'SABADO', label: 'Sábado' },
];

function horaFinSugerida(horaInicioSugerida: string): string {
  const [h, m] = horaInicioSugerida.split(':').map(Number);
  const nextH = Math.min(h + 1, 23);
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const CLASES_CAMPO =
  'w-full min-h-[48px] rounded-xl border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-foreground focus:ring-primary';

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
  // El formulario se inicializa desde las props al montar. El padre lo
  // desmonta al cerrar (render condicional), así cada apertura parte de
  // valores frescos sin necesidad de useEffect.
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
    horarioEnEdicion?.horaInicio ?? horaSugerida ?? '08:00',
  );
  const [horaFin, setHoraFin] = useState<string>(() =>
    horarioEnEdicion ? horarioEnEdicion.horaFin : horaFinSugerida(horaSugerida ?? '08:00'),
  );
  // Vacío = el horario usa el cupo de la actividad (cupo_maximo null en el back).
  const [cupoPropio, setCupoPropio] = useState<number | null>(horarioEnEdicion?.cupoPropio ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Foco inicial en el primer campo (reemplaza el autoFocus del select nativo).
  const primerCampoRef = useRef<HTMLButtonElement>(null);

  const selectedActividad = actividades.find((a) => a.id === actividadId);

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

    // 1. Verificación PREVENTIVA obligatoria de superposición horaria y salón
    // Se ejecuta SIEMPRE antes de cualquier reestructuración para asegurar que el cambio sea factible.
    if (onValidate) {
      const validacion = onValidate(formData, horarioEnEdicion?.id);
      if (!validacion.ok) {
        setErrorMessage(validacion.error || 'Conflicto de superposición detectado.');
        return; // SE FRENA AQUÍ: no abre el modal de reestructuración si hay superposición
      }
    }

    // 2. Guardar horario
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        hideClose
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          primerCampoRef.current?.focus();
        }}
        className="max-h-[90dvh] w-full max-w-[600px] gap-0 overflow-y-auto [&>*]:min-w-0 rounded-3xl border-border bg-card p-0 shadow-2xl sm:rounded-3xl"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between gap-4 border-b border-border bg-slate-50 dark:bg-white/5 px-6 py-5 md:px-8 md:py-6">
          <div>
            <Badge variant="outline" className="rounded-md border-0 bg-pink-100 dark:bg-primary/25 px-2.5 py-1 text-sm font-bold uppercase tracking-wider text-primary-dark dark:text-pink-300">
              Cronograma
            </Badge>
            <DialogTitle className="mt-2 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              {horarioEnEdicion ? 'Editar Horario Semanal' : 'Asignar Nuevo Horario'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulario de horario semanal del cronograma.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="h-11 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-white/15 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 [&_svg]:size-5"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Alerta de Conflicto de Superposición / Validación */}
        {errorMessage && (
          <Alert className="flex items-start gap-3 rounded-none border-0 border-b border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-6 py-5 animate-shake md:px-8 [&>svg]:static [&>svg]:h-10 [&>svg]:w-10 [&>svg]:shrink-0 [&>svg]:rounded-xl [&>svg]:bg-red-100 [&>svg]:p-2 [&>svg]:text-red-600 [&>svg~*]:pl-0">
            <AlertCircle aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <AlertTitulo className="text-sm font-black uppercase text-red-800 dark:text-red-200">
                Validación de Horario
              </AlertTitulo>
              <AlertDesc className="mt-1 text-sm leading-relaxed text-red-700 dark:text-red-300">
                {errorMessage}
              </AlertDesc>
            </div>
          </Alert>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5 md:space-y-5 md:p-7">
          {/* Actividad */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="horario-actividad" className="text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Actividad / Disciplina
              </Label>
            </div>
            <Select value={actividadId} onValueChange={setActividadId}>
              <SelectTrigger
                id="horario-actividad"
                ref={primerCampoRef}
                className={CLASES_CAMPO}
              >
                <SelectValue placeholder="Seleccionar actividad" />
              </SelectTrigger>
              <SelectContent>
                {actividades.map((act) => (
                  <SelectItem key={act.id} value={act.id}>
                    {act.nombre} ({act.modalidad === 'PERSONALIZADA' ? 'Personalizada' : 'Grupal'} - Cupo: {textoCupo(act.cupoMaximo)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profesora */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="horario-profesora" className="text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Profesora responsable
              </Label>
            </div>
            <Select value={profesoraId} onValueChange={setProfesoraId}>
              <SelectTrigger id="horario-profesora" className={CLASES_CAMPO}>
                <SelectValue placeholder="Seleccionar profesora" />
              </SelectTrigger>
              <SelectContent>
                {profesoras.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nombre} {prof.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Día y Cupo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
            <div>
              <Label htmlFor="horario-dia" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Día
              </Label>
              <Select value={diaSemana} onValueChange={(valor) => setDiaSemana(valor as DiaSemana)}>
                <SelectTrigger id="horario-dia" className={CLASES_CAMPO}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((dia) => (
                    <SelectItem key={dia.id} value={dia.id}>
                      {dia.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="horario-cupo" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Cupo propio <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Input
                id="horario-cupo" autoComplete="off"
                type="number"
                min="1"
                max="32767"
                value={cupoPropio ?? ''}
                // Solo dígitos: ni "-", ni "-0", ni "e" llegan al estado (Zod valida al guardar).
                onChange={(e) => {
                  const digitos = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                  setCupoPropio(digitos ? parseInt(digitos, 10) : null);
                }}
                className={CLASES_CAMPO}
                placeholder={`De la actividad: ${textoCupo(selectedActividad?.cupoMaximo ?? null)}`}
              />
            </div>
          </div>

          {/* Horas Inicio y Fin */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
            <div>
              <Label htmlFor="horario-inicio" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Hora Inicio <span className="font-normal text-slate-400">(07:00 a 22:00)</span>
              </Label>
              <Input
                id="horario-inicio" autoComplete="off"
                type="time"
                min="07:00"
                max="22:00"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={CLASES_CAMPO}
                required
              />
            </div>
            <div>
              <Label htmlFor="horario-fin" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200 md:text-base">
                Hora Fin <span className="font-normal text-slate-400">(máx 23:00)</span>
              </Label>
              <Input
                id="horario-fin" autoComplete="off"
                type="time"
                min="08:00"
                max="23:00"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className={CLASES_CAMPO}
                required
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between md:pt-5">
            {horarioEnEdicion && onDelete ? (
              <Button
                type="button"
                variant="link"
                className="min-h-[44px] justify-start px-2 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:no-underline md:text-base"
                onClick={onDelete}
              >
                Eliminar horario
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                className="min-h-[48px] px-5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 md:text-base"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="min-h-[48px] bg-primary px-7 text-sm font-bold text-white shadow-md hover:bg-primary-dark md:text-base"
              >
                Aceptar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
