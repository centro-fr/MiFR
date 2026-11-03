import { OwnerLayout } from "@/components/layout/owner-layout";
import { RankingAsistencia } from "../components/ranking-asistencia";

// US-30: sección Ranking de la profesora, el alumno y el tutor. La propietaria lo ve en Reportes.
export function RankingAsistenciaPage() {
  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Ranking de asistencia</h1>
          <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
            Conocé el compromiso del grupo durante el período seleccionado.
          </p>
        </div>
        <RankingAsistencia />
      </div>
    </OwnerLayout>
  );
}
