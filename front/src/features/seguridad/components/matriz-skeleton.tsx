import { MatrizToolbar } from "@/features/seguridad/components/matriz-toolbar";

// Loading (spec US-02): conserva el encabezado y pulsa el cuerpo.
export function MatrizSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando matriz de permisos">
      <MatrizToolbar cambiosPendientes={0} isSaving={false} onGuardar={() => undefined} onDescartar={() => undefined} />
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((modulo) => (
          <div key={modulo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 flex flex-col gap-2.5">
              {[0, 1, 2].map((fila) => (
                <div key={fila} className="flex items-center justify-between gap-3">
                  <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
                  <div className="h-7 w-12 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
