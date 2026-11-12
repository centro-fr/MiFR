import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { InicioProfesora } from "@/features/inicio-profesora/components/inicio-profesora";
import { PanelAlumnoPage } from "@/features/portal-alumno/pages/panel-alumno-page";

/** /app/inicio: el de la profesora (sus clases y las cuotas que vencen hoy) o el del alumno y el tutor (US-29). */
export function InicioPage() {
  const { panelActivo } = usePanelActivo();
  if (panelActivo !== "PROFESORA") return <PanelAlumnoPage />;
  return (
    <OwnerLayout>
      <ConMiIdDeProfesora>{(idProfesora) => <InicioProfesora idProfesora={idProfesora} />}</ConMiIdDeProfesora>
    </OwnerLayout>
  );
}
