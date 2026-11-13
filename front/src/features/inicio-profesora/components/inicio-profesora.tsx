import { useMemo } from "react";
import { Link } from "react-router-dom";
import { mensajeDeErrorApi } from "@/api/errores";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { debeLaCuota } from "@/features/alumnos/utils/situacion-cuota";
import { useClasesAsistencia } from "@/features/asistencia/hooks/use-asistencia";
import { puedeTomarAsistencia } from "@/features/asistencia/utils/formato-clase";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { BadgeEstadoClase } from "@/features/dashboard/components/clases-de-hoy";
import { ERROR_EN_TARJETA, TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { TarjetaVencenHoy } from "@/features/dashboard/components/vencen-hoy";
import { cuotasQueVencenHoy, estadoDeClase, horaActualArgentina } from "@/features/dashboard/utils/dashboard";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useMinutoActual } from "@/hooks/use-minuto-actual";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";

// Inicio de la profesora, como el dashboard de la propietaria pero de lo suyo: sus clases de hoy (con la
// toma de asistencia) y las cuotas de sus alumnos que vencen hoy. En el celular las tarjetas se apilan.

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function diaDeHoy(hoy: string): string {
  return `${Number(hoy.slice(8, 10))} de ${MESES[Number(hoy.slice(5, 7)) - 1]}`;
}

function useAlumnosACargo(idProfesora: string) {
  // El back ya le devuelve a la profesora solo los suyos; a la propietaria que dicta, se filtran.
  return useAlumnos({
    busqueda: "",
    estado: "TODOS",
    id_plan: "",
    id_profesora: idProfesora,
    id_actividad: "",
    incluir_bajas: false,
    limit: Number.MAX_SAFE_INTEGER,
    offset: 0,
  });
}

/** `valor` null: no se pudo calcular (el error, con su reintentar, se ve en la tarjeta de abajo). */
function Indicador({ titulo, valor }: { titulo: string; valor: number | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{titulo}</dt>
      <dd className="text-2xl leading-9 font-bold tabular-nums text-slate-900 dark:text-white">
        {valor ?? <span aria-label={valor === null ? "Sin datos" : "Cargando"}>—</span>}
      </dd>
    </div>
  );
}

function MisClasesDeHoy({ idProfesora }: { idProfesora: string }) {
  const consulta = useClasesAsistencia();
  const { hasRole } = usePermissions();
  const ahora = useMinutoActual();
  const propietaria = hasRole("PROPIETARIA");
  const clases = useMemo(
    () =>
      (consulta.data ?? [])
        .filter((clase) => clase.id_prof_dictante === Number(idProfesora))
        .sort((a, b) => a.horario.hora_inicio.localeCompare(b.horario.hora_inicio)),
    [consulta.data, idProfesora],
  );

  return (
    <TarjetaDashboard id="titulo-mis-clases-hoy" titulo="Tus clases de hoy" pie={{ texto: "Ver la semana", to: "/app/hoy" }}>
      {consulta.isPending ? (
        <div aria-busy="true" aria-label="Cargando tus clases de hoy" className="space-y-3 py-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : consulta.isError ? (
        <EstadoErrorCarga
          className={ERROR_EN_TARJETA}
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar tus clases de hoy.")}
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      ) : clases.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Hoy no tenés clases.</p>
      ) : (
        <ol aria-label="Tus clases de hoy">
          {clases.map((clase) => {
            const estado = estadoDeClase(clase, horaActualArgentina(ahora));
            const cupo = clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
            return (
              <li
                key={clase.id_clase}
                className={cn(
                  "flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800",
                  estado === "Terminada" && "opacity-70",
                )}
              >
                <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {horaDesdeApi(clase.horario.hora_inicio)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{clase.horario.actividad.nombre}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {cupo === null ? `${clase.inscriptos} inscriptos` : `${clase.inscriptos} de ${cupo} inscriptos`}
                  </p>
                </div>
                {puedeTomarAsistencia(clase, true, propietaria, ahora) ? (
                  <Link
                    to={`/app/hoy/${clase.id_clase}`}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark"
                  >
                    Tomar asistencia
                  </Link>
                ) : (
                  <BadgeEstadoClase estado={estado} />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </TarjetaDashboard>
  );
}

function VencenHoyDeMisAlumnos({ idProfesora }: { idProfesora: string }) {
  const alumnos = useAlumnosACargo(idProfesora);
  const planes = usePlanes();
  const hoy = fechaActualArgentina();
  const cuotas = useMemo(() => {
    const precios = new Map((planes.data ?? []).flatMap((plan) => (plan.precioVigente === null ? [] : [[plan.nombre, plan.precioVigente] as const])));
    return cuotasQueVencenHoy(alumnos.data?.items ?? [], hoy, precios);
  }, [alumnos.data, planes.data, hoy]);
  return (
    <TarjetaVencenHoy
      cuotas={cuotas}
      cargando={alumnos.isPending}
      error={alumnos.error}
      reintentando={alumnos.isFetching}
      onReintentar={() => void alumnos.refetch()}
    />
  );
}

function Indicadores({ idProfesora }: { idProfesora: string }) {
  const alumnos = useAlumnosACargo(idProfesora);
  const clases = useClasesAsistencia();
  const items = alumnos.isError ? null : alumnos.data?.items;
  const clasesDeHoy = clases.isError ? null : clases.data?.filter((clase) => clase.id_prof_dictante === Number(idProfesora)).length;
  return (
    <dl aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
      <Indicador titulo="Clases hoy" valor={clasesDeHoy} />
      <Indicador titulo="Alumnos a cargo" valor={items === null ? null : items?.filter((alumno) => alumno.estado === "ACTIVO").length} />
      <Indicador
        titulo="Deben la cuota"
        valor={items === null ? null : items?.filter((alumno) => alumno.estado === "ACTIVO" && debeLaCuota(alumno)).length}
      />
    </dl>
  );
}

export function InicioProfesora({ idProfesora }: { idProfesora: string }) {
  const { user } = useAuth();
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          Hola{user ? `, ${user.nombre}` : ""}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Resumen al {diaDeHoy(fechaActualArgentina())}</p>
      </header>
      <Indicadores idProfesora={idProfesora} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <MisClasesDeHoy idProfesora={idProfesora} />
        <VencenHoyDeMisAlumnos idProfesora={idProfesora} />
      </div>
    </div>
  );
}
