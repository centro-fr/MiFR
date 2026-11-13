import { useState } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { ERROR_EN_TARJETA, TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { GrillaDeOcupacion, LeyendaOcupacion, OcupacionPorDia } from "@/features/reportes/components/mapa-ocupacion";
import { useActividadesParaFiltro, useInformeOcupacion } from "@/features/reportes/hooks/use-reportes";
import { cn } from "@/utils/cn";

const CONTROL =
  "h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

/** Ocupación de horarios (US-37): la semana como mapa de calor; en el celular, un día a la vez. */
export function OcupacionDashboard() {
  const [idActividad, setIdActividad] = useState<number | null>(null);
  const [soloBajaDemanda, setSoloBajaDemanda] = useState(false);
  const consulta = useInformeOcupacion({ idActividad, idProfesora: null, modalidad: null });
  const actividades = useActividadesParaFiltro();
  const horarios = consulta.data?.horarios ?? [];

  return (
    <TarjetaDashboard
      id="titulo-ocupacion"
      titulo="Ocupación de horarios"
      subtitulo="Inscriptos activos sobre cupo máximo · semana actual"
      pie={{ texto: "Ver reporte", to: "/app/reportes/ocupacion" }}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Actividad
            <select
              value={idActividad ?? ""}
              onChange={(evento) => setIdActividad(evento.target.value ? Number(evento.target.value) : null)}
              className={CONTROL}
            >
              <option value="">Todas</option>
              {actividades.data?.map((actividad) => (
                <option key={actividad.id} value={actividad.id}>
                  {actividad.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-pressed={soloBajaDemanda}
            onClick={() => setSoloBajaDemanda((actual) => !actual)}
            className={cn(
              CONTROL,
              "hidden md:block",
              soloBajaDemanda && "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900",
            )}
          >
            Solo baja demanda
          </button>
        </div>
      }
    >
      <div className="py-4">
        {consulta.isPending ? (
          <Skeleton aria-label="Cargando la ocupación" className="h-56 w-full rounded-lg" />
        ) : consulta.isError ? (
          <EstadoErrorCarga
            className={ERROR_EN_TARJETA}
            mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar la ocupación.")}
            reintentando={consulta.isFetching}
            onReintentar={() => void consulta.refetch()}
          />
        ) : horarios.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay horarios con alumnos.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <GrillaDeOcupacion horarios={horarios} soloBajaDemanda={soloBajaDemanda} />
            </div>
            <div className="md:hidden">
              <OcupacionPorDia horarios={horarios} />
            </div>
            <LeyendaOcupacion />
          </>
        )}
      </div>
    </TarjetaDashboard>
  );
}
