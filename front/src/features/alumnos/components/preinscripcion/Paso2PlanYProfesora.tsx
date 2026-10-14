import { Check, Dumbbell, User, Calendar } from "lucide-react";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";

interface Paso2PlanYProfesoraProps {
  planes: PlanApiRespuesta[];
  profesoras: ProfesoraDatos[];
  /** Las que tienen horarios suficientes para el plan elegido: son las únicas que se ofrecen. */
  profesorasCompatibles: ProfesoraDatos[];
  idPlanSeleccionado: number | null;
  onSeleccionarPlan: (idPlan: number) => void;
  idProfesoraSeleccionada: number | null;
  onSeleccionarProfesora: (idProfesora: number) => void;
  esSoloProfesora: boolean;
  fechaInicio: string;
  onChangeFechaInicio: (fecha: string) => void;
}

export function Paso2PlanYProfesora({
  planes,
  profesoras,
  profesorasCompatibles,
  idPlanSeleccionado,
  onSeleccionarPlan,
  idProfesoraSeleccionada,
  onSeleccionarProfesora,
  esSoloProfesora,
  fechaInicio,
  onChangeFechaInicio,
}: Paso2PlanYProfesoraProps) {
  const sinPlan = idPlanSeleccionado === null;
  const sinProfesorasParaElPlan = !sinPlan && profesorasCompatibles.length === 0;
  const profesoraLogueadaSinHorarios =
    esSoloProfesora && !sinPlan && !profesorasCompatibles.some((p) => Number(p.id) === idProfesoraSeleccionada);

  return (
    <div className="space-y-6">
      {/* 1. Selección de Plan */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Elegí un Plan de Entrenamiento <span className="text-destructive">*</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {planes.map((p) => {
            const isSelected = idPlanSeleccionado === p.id_plan;
            const esClaseSuelta = p.tipo === "CLASE_SUELTA";
            const precio = p.precio_vigente?.precio;

            return (
              <div
                key={p.id_plan}
                onClick={() => onSeleccionarPlan(p.id_plan)}
                className={cn(
                  "relative p-4 rounded-xl cursor-pointer transition-all duration-200 border text-left",
                  isSelected
                    ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/40 dark:bg-primary/10"
                    : "bg-card hover:bg-muted/40 border-border/70 hover:border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {p.nombre}
                      {isSelected && <Check className="size-4 text-primary stroke-[3]" />}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {p.descripcion || (esClaseSuelta ? "Pase individual" : `${p.clases_por_semana} veces por semana`)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-foreground">
                      ${precio != null ? precio.toLocaleString("es-AR") : "—"}
                    </span>
                    <span className="block text-[10px] text-muted-foreground uppercase font-medium">
                      {esClaseSuelta ? "por clase" : "por mes"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-border/40">
                  <Badge variant="secondary" className="text-[11px] font-normal">
                    {esClaseSuelta ? "1 clase" : `${p.clases_por_semana} clases/sem`}
                  </Badge>

                  {p.actividad_exclusiva ? (
                    <Badge variant="outline" className="text-[11px] font-normal border-violet-500/40 text-violet-700 dark:text-violet-300">
                      {p.actividad_exclusiva.nombre}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] font-normal">
                      Multi-actividad
                    </Badge>
                  )}

                  {p.profesora_unica && (
                    <Badge variant="outline" className="text-[11px] font-normal border-amber-500/40 text-amber-700 dark:text-amber-300">
                      Profe exclusiva
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Asignación de Profesora y Actividad */}
      <div className="pt-2 border-t border-border/40 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Profesora <span className="text-destructive">*</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="selector-profesora" className="text-xs font-medium">
              Profesora Asignada <span className="text-destructive">*</span>
            </Label>
            {esSoloProfesora ? (
              <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border/80 bg-muted/40 min-h-[42px]">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  <User className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profesoras.find((p) => Number(p.id) === idProfesoraSeleccionada)
                      ? `${profesoras.find((p) => Number(p.id) === idProfesoraSeleccionada)!.nombre} ${profesoras.find((p) => Number(p.id) === idProfesoraSeleccionada)!.apellido}`
                      : "Profesora asignada"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0">
                  Tu perfil
                </Badge>
              </div>
            ) : (
              <Select
                value={idProfesoraSeleccionada ? String(idProfesoraSeleccionada) : ""}
                onValueChange={(val) => onSeleccionarProfesora(Number(val))}
                disabled={sinPlan || sinProfesorasParaElPlan}
              >
                <SelectTrigger id="selector-profesora" className="w-full" aria-describedby="ayuda-profesora">
                  <SelectValue
                    placeholder={
                      sinPlan
                        ? "Primero elegí un plan"
                        : sinProfesorasParaElPlan
                          ? "Ninguna profesora da este plan"
                          : "Seleccioná una profesora"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {profesorasCompatibles.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nombre} {prof.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <AyudaProfesora
              esSoloProfesora={esSoloProfesora}
              sinProfesorasParaElPlan={sinProfesorasParaElPlan}
              profesoraLogueadaSinHorarios={profesoraLogueadaSinHorarios}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha-inicio" className="text-xs font-medium flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              Fecha de Inicio Estimada
            </Label>
            <CampoFecha
              id="fecha-inicio"
              etiquetaCalendario="Abrir calendario para la fecha de inicio"
              // El back no acepta un inicio anterior a hoy.
              min={fechaActualArgentina()}
              value={fechaInicio}
              onChange={onChangeFechaInicio}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Explica por qué la lista de profesoras es la que es: sin esto, que falte una parece un error.
function AyudaProfesora({
  esSoloProfesora,
  sinProfesorasParaElPlan,
  profesoraLogueadaSinHorarios,
}: {
  esSoloProfesora: boolean;
  sinProfesorasParaElPlan: boolean;
  profesoraLogueadaSinHorarios: boolean;
}) {
  const aviso = profesoraLogueadaSinHorarios
    ? "No tenés horarios suficientes para este plan. Elegí otro plan o pedile a la propietaria que lo cargue."
    : sinProfesorasParaElPlan
      ? "Ninguna profesora tiene horarios suficientes para este plan. Elegí otro plan."
      : null;
  if (aviso) {
    return (
      <p id="ayuda-profesora" className="text-[11px] text-amber-600 dark:text-amber-400">
        {aviso}
      </p>
    );
  }
  return (
    <p id="ayuda-profesora" className="text-[11px] text-muted-foreground">
      {esSoloProfesora ? "Asignada automáticamente a tu perfil." : "Solo aparecen las profesoras con horarios para el plan elegido."}
    </p>
  );
}
