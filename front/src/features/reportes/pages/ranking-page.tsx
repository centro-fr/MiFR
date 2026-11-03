import { RankingAsistencia } from "@/features/portal-alumno/components/ranking-asistencia";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";

// US-30: pestaña "Ranking" de Reportes. Es el mismo ranking que ven la profesora, el alumno y el tutor
// en su sección Ranking.
export function RankingPage() {
  return (
    <PaginaReportes>
      <RankingAsistencia />
    </PaginaReportes>
  );
}
