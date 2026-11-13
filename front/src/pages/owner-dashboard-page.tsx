import { OwnerLayout } from "@/components/layout/owner-layout";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { saludoSegunHorario } from "@/utils/saludo";
import { ClasesDeHoy } from "@/features/dashboard/components/clases-de-hoy";
import { IndicadoresDashboard } from "@/features/dashboard/components/indicadores-dashboard";
import { OcupacionDashboard } from "@/features/dashboard/components/ocupacion-dashboard";
import { PlanesElegidos } from "@/features/dashboard/components/planes-elegidos";
import { TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { VencenHoy } from "@/features/dashboard/components/vencen-hoy";
import { BandejaPorVerificar } from "@/features/por-verificar/components/bandeja-por-verificar";
import { useBandejaPorVerificar } from "@/features/por-verificar/hooks/use-bandeja-por-verificar";
import { fechaActualArgentina } from "@/utils/fecha";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const EN_EL_DASHBOARD = 5;

/** "2026-10-18" → "18 de octubre". */
function diaDeHoy(): string {
  const hoy = fechaActualArgentina();
  return `${Number(hoy.slice(8, 10))} de ${MESES[Number(hoy.slice(5, 7)) - 1]}`;
}

function PorVerificar() {
  const bandeja = useBandejaPorVerificar();
  const restantes = bandeja.items.length - EN_EL_DASHBOARD;
  return (
    <TarjetaDashboard
      id="titulo-por-verificar"
      titulo="Por verificar"
      pie={{ texto: "Ver todo", to: "/app/por-verificar" }}
      resumen={restantes > 0 ? `${restantes} más` : undefined}
    >
      <BandejaPorVerificar bandeja={bandeja} limite={EN_EL_DASHBOARD} />
    </TarjetaDashboard>
  );
}

// US-26: lo que la propietaria resuelve en el día y cómo está el centro. En el celular el mapa de la
// semana pasa a verse un día a la vez.
export function OwnerDashboardPage() {
  const { user } = useAuth();

  return (
    <OwnerLayout>
      <div className="flex w-full min-w-0 flex-col gap-5">
        <header>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {saludoSegunHorario(user?.nombre)}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Resumen al {diaDeHoy()}</p>
        </header>

        <IndicadoresDashboard />

        {/* En móvil: 1) PorVerificar, 2) VencenHoy, 3) ClasesDeHoy, 4) PlanesElegidos.
            En desktop (xl): Columna izquierda: ClasesDeHoy (lista larga). Columna derecha: PorVerificar, VencenHoy, PlanesElegidos. */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-1">
            <PorVerificar />
            <VencenHoy />
          </div>
          <div className="min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-2">
            <ClasesDeHoy />
          </div>
          <div className="min-w-0 xl:col-start-2 xl:row-start-2">
            <PlanesElegidos />
          </div>
        </div>

        <OcupacionDashboard />
      </div>
    </OwnerLayout>
  );
}
