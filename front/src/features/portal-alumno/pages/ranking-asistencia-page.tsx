import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { RankingSeccion } from "../components/ranking-seccion";

// US-30: sección Ranking de la profesora, el alumno y el tutor. La propietaria lo ve en Reportes.
export function RankingAsistenciaPage() {
  const { panelActivo } = usePanelActivo();
  return (
    <OwnerLayout>
      <RankingSeccion esProfesora={panelActivo === "PROFESORA"} />
    </OwnerLayout>
  );
}
