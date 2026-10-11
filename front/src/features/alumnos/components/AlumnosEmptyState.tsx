import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlumnosEmptyStateProps {
  onNuevoAlumno: () => void;
}

export function AlumnosEmptyState({ onNuevoAlumno }: AlumnosEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
      <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Users className="size-7" />
      </div>
      <h3 className="text-lg font-bold text-foreground">No hay alumnos registrados</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
        Todavía no se cargaron alumnos en el centro. Iniciá el registro para pre-inscribir a la primera persona.
      </p>
      <Button onClick={onNuevoAlumno} className="gap-2">
        <UserPlus className="size-4" />
        Nueva Pre-inscripción
      </Button>
    </div>
  );
};
