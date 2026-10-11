import { Check, Dumbbell, Sparkles, User, Calendar } from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";

interface Paso2PlanYProfesoraProps {
  planes: Plan[];
  profesoras: ProfesoraDatos[];
  idPlanSeleccionado: number | null;
  onSeleccionarPlan: (idPlan: number) => void;
  idProfesoraSeleccionada: number | null;
  onSeleccionarProfesora: (idProfesora: number) => void;
  esSoloProfesora: boolean;
  sinCargo: boolean;
  onToggleSinCargo: (sinCargo: boolean) => void;
  fechaInicio: string;
  onChangeFechaInicio: (fecha: string) => void;
}

export function Paso2PlanYProfesora({
  planes,
  profesoras,
  idPlanSeleccionado,
  onSeleccionarPlan,
  idProfesoraSeleccionada,
  onSeleccionarProfesora,
  esSoloProfesora,
  sinCargo,
  onToggleSinCargo,
  fechaInicio,
  onChangeFechaInicio,
}: Paso2PlanYProfesoraProps) {
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

      {/* 2. Asignación de Profesora */}
      <div className="pt-2 border-t border-border/40 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Profesora a Cargo <span className="text-destructive">*</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="selector-profesora" className="text-xs font-medium">
              Profesora Asignada
            </Label>
            <Select
              value={idProfesoraSeleccionada ? String(idProfesoraSeleccionada) : ""}
              onValueChange={(val) => onSeleccionarProfesora(Number(val))}
              disabled={esSoloProfesora}
            >
              <SelectTrigger id="selector-profesora" className="w-full">
                <SelectValue placeholder="Seleccioná una profesora" />
              </SelectTrigger>
              <SelectContent>
                {profesoras.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nombre} {prof.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {esSoloProfesora && (
              <p className="text-[11px] text-muted-foreground">
                Asignada automáticamente a tu perfil.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha-inicio" className="text-xs font-medium flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              Fecha de Inicio Estimada
            </Label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => onChangeFechaInicio(e.target.value)}
            />
          </div>
        </div>

        {/* Sin cargo toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
          <div className="space-y-0.5">
            <Label htmlFor="sin-cargo-toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              Inscripción sin cargo / Becada
            </Label>
            <p className="text-xs text-muted-foreground">
              Exime la generación de cuota para el primer período.
            </p>
          </div>
          <Switch
            id="sin-cargo-toggle"
            checked={sinCargo}
            onCheckedChange={onToggleSinCargo}
          />
        </div>
      </div>
    </div>
  );
};
