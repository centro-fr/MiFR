import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { RankingSeccion } from "../components/ranking-seccion";
import { useAlumnoElegido } from "../hooks/use-alumno-elegido";

function RankingDelAlumno() {
  const { elegido } = useAlumnoElegido();
  return (
    <RankingSeccion alumno={elegido ? { id: elegido.id, nombre: elegido.nombre, propio: elegido.propio } : undefined} />
  );
}

// US-30: sección Ranking de la profesora, el alumno y el tutor (con el menor que eligió). La propietaria lo
// ve en Reportes.
export function RankingAsistenciaPage() {
  const { panelActivo } = usePanelActivo();
  return <OwnerLayout>{panelActivo === "PROFESORA" ? <RankingSeccion /> : <RankingDelAlumno />}</OwnerLayout>;
}
