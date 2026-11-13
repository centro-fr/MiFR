import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { AvisoVacio, CAJA, EncabezadoPantalla, FILA } from "@/components/movil/piezas";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { useVistaAmplia } from "@/hooks/use-mobile";
import { cn } from "@/utils/cn";
import { usePlanElegido } from "../hooks/use-plan-elegido";
import type { PanelAlumno } from "../schemas/panel-alumno";
import { diaCorto, numeroDelDia } from "../utils/fechas-del-panel";

type ClaseProxima = PanelAlumno["proximas_clases"][number];

function fechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.slice(0, 10).split("-");
  return `${diaCorto(fecha)} ${dia}/${mes}`;
}

/** Pantallas anchas: las mismas clases en tabla. */
function TablaClases({ clases }: { clases: ClaseProxima[] }) {
  return (
    <div className={cn(CAJA, "overflow-x-auto")}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Próximas clases</caption>
        <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-5 py-3">Día</th>
            <th scope="col" className="px-5 py-3">Horario</th>
            <th scope="col" className="px-5 py-3">Actividad</th>
            <th scope="col" className="px-5 py-3">Profesor/a</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clases.map((clase) => (
            <tr key={`${clase.id_horario}-${clase.fecha}`}>
              <td className="px-5 py-3 font-semibold whitespace-nowrap">{fechaCorta(clase.fecha)}</td>
              <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                {clase.hora_inicio.slice(0, 5)} a {clase.hora_fin.slice(0, 5)}
              </td>
              <td className="px-5 py-3 font-bold">{clase.actividad}</td>
              <td className="px-5 py-3 text-muted-foreground">{clase.profesora}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// US-29: las próximas clases del alumno, según sus horarios.

function FilaClase({ clase }: { clase: ClaseProxima }) {
  return (
    <li className={cn(FILA, "grid min-h-15 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 px-3.5 py-2")}>
      <div
        aria-hidden="true"
        className="flex h-12 flex-col items-center justify-center rounded-[10px] bg-primary/10 text-primary-dark dark:text-pink-300"
      >
        <span className="text-[11px] leading-[14px] font-bold uppercase">{diaCorto(clase.fecha)}</span>
        <span className="text-lg leading-[22px] font-extrabold tabular-nums">{numeroDelDia(clase.fecha)}</span>
      </div>
      <div className="min-w-0">
        <div className="font-bold">{clase.actividad}</div>
        <div className="truncate text-xs text-muted-foreground">{clase.profesora}</div>
      </div>
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {clase.hora_inicio.slice(0, 5)} a {clase.hora_fin.slice(0, 5)}
      </span>
      <span className="sr-only">{clase.fecha.slice(0, 10)}</span>
    </li>
  );
}

function Contenido() {
  const { consulta, vista } = usePlanElegido();
  const vistaAmplia = useVistaAmplia();
  if (consulta.isPending) return <TablaSkeleton ariaLabel="Cargando tus clases" filas={5} />;
  if (consulta.isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar tus clases.")}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  const clases = vista?.proximas_clases ?? consulta.data.proximas_clases;
  if (clases.length === 0) return <AvisoVacio>No tenés clases agendadas.</AvisoVacio>;
  if (vistaAmplia) return <TablaClases clases={clases} />;
  return (
    <ul aria-label="Próximas clases" className={cn(CAJA, "overflow-hidden")}>
      {clases.map((clase) => (
        <FilaClase key={`${clase.id_horario}-${clase.fecha}`} clase={clase} />
      ))}
    </ul>
  );
}

export function ClasesAlumnoPage() {
  return (
    <OwnerLayout>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <EncabezadoPantalla titulo="Tus clases" detalle="Las próximas según tus horarios." />
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
