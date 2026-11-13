import { Link } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { ListaInsignias } from "@/components/insignias/insignia-medalla";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { AvisoVacio, CAJA } from "@/components/movil/piezas";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { nombreDelMes } from "@/features/asistencia/utils/semana";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { saludoSegunHorario } from "@/utils/saludo";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";
import { useInsignias } from "../hooks/use-insignias";
import { usePlanElegido } from "../hooks/use-plan-elegido";
import { useRankingAsistencia } from "../hooks/use-ranking-asistencia";
import { useAlumnoElegido } from "../hooks/use-alumno-elegido";
import type { PanelAlumno, PlanDelAlumno } from "../schemas/panel-alumno";
import { puestoDe } from "../utils/puesto-propio";
import { diaCorto, numeroDelDia, cuandoEsLaClase } from "../utils/fechas-del-panel";

// US-29: inicio del alumno. Su cuota, la próxima clase, cómo viene con la asistencia y
// un acceso al ranking; las insignias ganadas van bajo el saludo (US-31).

const SIN_FILTROS = {};

const ESTADO_CUOTA: Record<PlanDelAlumno["estado_cuota"], { texto: string; clases: string }> = {
  AL_DIA: { texto: "Al día", clases: "text-foreground" },
  EN_GRACIA: { texto: "Por vencer", clases: "text-amber-800 dark:text-amber-300" },
  VENCIDA: { texto: "Vencida", clases: "text-red-700 dark:text-red-400" },
};

function diaYMesCorto(fecha: string): string {
  const [, mes, dia] = fecha.slice(0, 10).split("-");
  return dia && mes ? `${dia}/${mes}` : "—";
}

function TarjetaCuota({ plan }: { plan: PlanDelAlumno | undefined }) {
  if (!plan) return <AvisoVacio>No tenés un plan vigente. Consultá en el centro.</AvisoVacio>;
  const estado = ESTADO_CUOTA[plan.estado_cuota];
  const frecuencia =
    plan.tipo === "CLASE_SUELTA"
      ? "Clase suelta"
      : plan.clases_por_semana
        ? `${plan.clases_por_semana} ${plan.clases_por_semana === 1 ? "clase" : "clases"} por semana`
        : null;
  return (
    <section aria-labelledby="titulo-cuota" className={cn(CAJA, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="titulo-cuota" className="text-sm font-semibold text-muted-foreground">
            Tu cuota
          </h2>
          <div className={cn("text-[22px] leading-[30px] font-extrabold", estado.clases)}>{estado.texto}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{plan.estado_cuota === "VENCIDA" ? "Venció el" : "Vence el"}</div>
          <div className="font-bold tabular-nums">{diaYMesCorto(plan.fecha_vencimiento)}</div>
        </div>
      </div>
      <div className="border-t border-border pt-3 text-sm text-slate-700 dark:text-slate-300">
        {[plan.nombre, frecuencia].filter(Boolean).join(" · ")}
      </div>
    </section>
  );
}

function ProximaClase({ clase }: { clase: PanelAlumno["proximas_clases"][number] | undefined }) {
  return (
    <section aria-labelledby="titulo-proxima" className={cn(CAJA, "p-4")}>
      <h2 id="titulo-proxima" className="mb-3 border-b border-border pb-2 text-sm font-semibold text-muted-foreground">
        Tu próxima clase
      </h2>
      {clase ? (
        <div className="flex items-center gap-3.5">
          <div
            aria-hidden="true"
            className="flex h-14 w-13 shrink-0 flex-col items-center justify-center rounded-[10px] bg-primary/10 text-primary-dark dark:text-pink-300"
          >
            <span className="text-xs font-bold uppercase">{diaCorto(clase.fecha)}</span>
            <span className="text-xl leading-6 font-extrabold tabular-nums">{numeroDelDia(clase.fecha)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base leading-[22px] font-bold">{clase.actividad}</div>
            <div className="text-sm text-slate-700 tabular-nums dark:text-slate-300">
              {cuandoEsLaClase(clase.fecha, fechaActualArgentina())} de {clase.hora_inicio.slice(0, 5)} a {clase.hora_fin.slice(0, 5)}
            </div>
            <div className="text-xs text-muted-foreground">Con {clase.profesora}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tenés clases agendadas.</p>
      )}
    </section>
  );
}

function Indicadores({ panel }: { panel: PanelAlumno }) {
  const insignias = useInsignias(panel.id_alumno);
  // Las clases del mes salen del ranking del mes, así coinciden con lo que se ve en Ranking.
  const ranking = useRankingAsistencia(SIN_FILTROS);
  const hoy = fechaActualArgentina();
  const propia = puestoDe(ranking.data, panel.id_alumno);
  const delMes = panel.historial_asistencias.filter((registro) => registro.fecha.slice(0, 7) === hoy.slice(0, 7));
  const asistidas = propia?.clases_asistidas ?? delMes.filter((registro) => registro.estado === "PRESENTE").length;
  const previstas = propia?.clases_previstas ?? delMes.length;
  const racha = insignias.data?.racha.actual;
  return (
    <dl className="grid grid-cols-2 gap-3">
      <div className={cn(CAJA, "px-4 py-3.5")}>
        <dt className="text-sm font-semibold text-muted-foreground">Racha de asistencia</dt>
        <dd className="mt-0.5 text-xl leading-7 font-extrabold">
          {insignias.isError ? (
            <span aria-label="Sin datos">—</span>
          ) : racha === undefined ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            `${racha} ${racha === 1 ? "clase" : "clases"}`
          )}
        </dd>
      </div>
      <div className={cn(CAJA, "px-4 py-3.5")}>
        <dt className="text-sm font-semibold text-muted-foreground first-letter:uppercase">En {nombreDelMes(hoy)}</dt>
        <dd className="mt-0.5 text-xl leading-7 font-extrabold tabular-nums">
          {ranking.isPending ? <Skeleton className="h-7 w-20" /> : `${asistidas} de ${previstas}`}
        </dd>
      </div>
    </dl>
  );
}

function AccesoAlRanking({ panel }: { panel: PanelAlumno }) {
  const consulta = useRankingAsistencia(SIN_FILTROS);
  const { elegido } = useAlumnoElegido();
  const propia = puestoDe(consulta.data, panel.id_alumno);
  const quien = elegido && !elegido.propio ? `${panel.alumno.nombre} va` : "Vas";
  return (
    <Link to="/app/ranking" className={cn(CAJA, "flex h-full items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5")}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        <Trophy className="size-4.5" />
      </span>
      <span className="flex-1 font-bold">{propia ? `${quien} ${propia.posicion}.º en el ranking` : "Mirá el ranking del mes"}</span>
      <ChevronRight aria-hidden="true" className="size-4.5 text-muted-foreground" />
    </Link>
  );
}

/** Saluda a quien inició sesión; al alumno le muestra sus insignias (el tutor elige el menor arriba). */
function Saludo({ panel }: { panel: PanelAlumno }) {
  const { user } = useAuth();
  const { elegido } = useAlumnoElegido();
  const propio = elegido?.propio ?? true;
  const insignias = useInsignias(panel.id_alumno);
  const ganadas = insignias.data?.insignias.filter((insignia) => insignia.obtenida) ?? [];
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
        {saludoSegunHorario(user?.nombre ?? panel.alumno.nombre)}
      </h1>
      {propio && ganadas.length > 0 && <ListaInsignias insignias={ganadas} className="mt-2" />}
    </div>
  );
}

function Contenido() {
  const { consulta, elegido, vista } = usePlanElegido();
  if (consulta.isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando tu inicio" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar tu inicio.")}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  const panel = consulta.data;
  const proximaClase = vista?.proximas_clases[0] ?? panel.proximas_clases[0];
  // En el celular, una columna; con lugar, la cuota y la próxima clase lado a lado, y abajo los números.
  return (
    <>
      <Saludo panel={panel} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <TarjetaCuota plan={elegido} />
        <ProximaClase clase={proximaClase} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Indicadores panel={panel} />
        <AccesoAlRanking panel={panel} />
      </div>
    </>
  );
}

export function PanelAlumnoPage() {
  return (
    <OwnerLayout>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
