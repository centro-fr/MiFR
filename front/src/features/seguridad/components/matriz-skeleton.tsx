import { MatrizToolbar } from "@/features/seguridad/components/matriz-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Loading (spec US-02): conserva el encabezado y pulsa el cuerpo.
export function MatrizSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando matriz de permisos">
      <MatrizToolbar />
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((modulo) => (
          <Card key={modulo} className="overflow-hidden rounded-2xl border-border bg-white p-4 dark:bg-surface-low">
            <CardContent className="p-0">
              <Skeleton className="h-5 w-40 rounded bg-slate-200 dark:bg-white/10" />
              <div className="mt-3 flex flex-col gap-2.5">
                {[0, 1, 2].map((fila) => (
                  <div key={fila} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 flex-1 rounded bg-slate-100 dark:bg-white/10" />
                    <Skeleton className="h-7 w-12 rounded-full bg-slate-200 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
