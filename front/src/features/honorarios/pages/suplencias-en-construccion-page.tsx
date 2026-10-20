import { Construction } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card } from "@/components/ui/card";
import { EncabezadoHonorarios, PestanasHonorarios } from "@/features/honorarios/components/encabezado-honorarios";

// Lugar reservado para la pestaña "Suplencias" (US-24), que hace otro integrante del front. Al tener
// su pantalla, se reemplaza esta página en la ruta /app/honorarios/suplencias de app/router.tsx y se borra.
export function SuplenciasEnConstruccionPage() {
  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <EncabezadoHonorarios />
        <PestanasHonorarios />
        <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
            <Construction aria-hidden="true" className="size-7" />
          </span>
          <h2 className="text-lg font-extrabold text-dark dark:text-white">Suplencias, en construcción</h2>
          <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
            Pronto vas a poder registrar acá las clases que una profesora cubre por otra.
          </p>
        </Card>
      </div>
    </OwnerLayout>
  );
}
