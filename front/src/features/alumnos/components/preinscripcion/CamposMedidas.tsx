import { Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import type { MedidasCorporalesForm } from "../../schemas/medidas-corporales";

interface CamposMedidasProps {
  /** Actividad elegida que pide las medidas, para explicar por qué aparecen. */
  actividad: string;
  medidas: MedidasCorporalesForm;
  onChange: (medidas: MedidasCorporalesForm) => void;
  errores: Partial<Record<keyof MedidasCorporalesForm, string>>;
}

const CAMPOS = [
  { campo: "peso_kg", id: "medida-peso", etiqueta: "Peso (kg)", ejemplo: "Ej: 65,5" },
  { campo: "talla_cm", id: "medida-talla", etiqueta: "Talla (cm)", ejemplo: "Ej: 168" },
] as const;

/** US-05: peso y talla, solo cuando alguna actividad de los horarios elegidos los requiere. */
export function CamposMedidas({ actividad, medidas, onChange, errores }: CamposMedidasProps) {
  return (
    <section aria-labelledby="titulo-medidas" className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/20">
      <div className="flex items-start gap-2.5">
        <Ruler aria-hidden="true" className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 id="titulo-medidas" className="text-sm font-semibold text-foreground">
            Peso y talla
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">{actividad} los pide para la pre-inscripción.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CAMPOS.map(({ campo, id, etiqueta, ejemplo }) => (
          <div key={campo} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-medium">
              {etiqueta} <span className="text-destructive">*</span>
            </Label>
            <Input
              id={id}
              inputMode="decimal"
              placeholder={ejemplo}
              value={medidas[campo]}
              onChange={(e) => onChange({ ...medidas, [campo]: e.target.value })}
              aria-invalid={errores[campo] ? true : undefined}
              aria-describedby={errores[campo] ? `${id}-error` : undefined}
              className={cn(errores[campo] && "border-destructive focus-visible:ring-destructive")}
            />
            {errores[campo] && (
              <p id={`${id}-error`} className="text-xs text-destructive">
                {errores[campo]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
