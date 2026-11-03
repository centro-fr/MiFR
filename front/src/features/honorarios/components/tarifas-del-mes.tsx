import { useId, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoTarifa } from "@/features/honorarios/components/dialogo-tarifa";
import { useTarifas } from "@/features/honorarios/hooks/use-honorarios";
import {
  describirTarifa,
  fechaCorta,
  nombreCompleto,
  tarifaVigente,
  tarifasDelAlcance,
} from "@/features/honorarios/utils/formato-honorarios";
import { ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import type { AlcanceTarifa, ProfesoraDeLiquidacion, TarifaHonorario } from "@/types/honorarios";

// US-23: el porcentaje por alumno es uno solo para todo el estudio y la hora de suplencia, una por
// profesor/a (lo decidió la propietaria). Se muestran y se cambian acá, aunque el mes todavía no se
// haya calculado: se ve lo que rige el último día del mes, que es lo que usa el cálculo.

const SUBTITULO = "text-sm font-extrabold text-slate-800 dark:text-slate-200";

interface PropsFila {
  nombre: ReactNode;
  alcance: AlcanceTarifa;
  /** Todas las tarifas: la fila toma las de su alcance. */
  tarifas: TarifaHonorario[];
  dia: string;
  onCambiar: (alcance: AlcanceTarifa) => void;
}

function FilaDeTarifa({ nombre, alcance, tarifas, dia, onCambiar }: PropsFila) {
  const tarifa = tarifaVigente(tarifasDelAlcance(tarifas, alcance), dia);
  const accion = tarifa ? "Cambiar" : "Cargar";
  // El nombre accesible dice cuál: en la lista hay un "Cambiar" por profesor/a.
  const cual = alcance.concepto === "ALUMNO_A_CARGO" ? "el porcentaje por alumno" : `la hora de suplencia de ${nombreCompleto(alcance.profesora)}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 py-1.5">
      <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">{nombre}</span>
      <span className="flex items-center gap-1 text-sm">
        {tarifa ? (
          <span className="font-bold text-slate-900 dark:text-white">{describirTarifa(tarifa, alcance.concepto)}</span>
        ) : (
          <span className="font-bold text-amber-800 dark:text-amber-200">Sin cargar</span>
        )}
        <Can permission="HONORARIOS_LIQUIDAR">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onCambiar(alcance)}
            aria-label={`${accion} ${cual}`}
            className="min-h-11 rounded-xl px-3 font-bold text-primary hover:bg-pink-50 pointer-fine:min-h-9 dark:hover:bg-primary/15"
          >
            {accion}
          </Button>
        </Can>
      </span>
    </li>
  );
}

function Reintentar({ error, mensaje, reintentando, onReintentar }: { error: unknown; mensaje: string; reintentando: boolean; onReintentar: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
        {mensajeDeErrorApi(error, mensaje)}
      </p>
      <Button type="button" variant="link" disabled={reintentando} onClick={onReintentar} className="h-auto min-h-11 p-0 font-bold">
        Reintentar
      </Button>
    </div>
  );
}

type PropsGrupo = Omit<PropsFila, "nombre" | "alcance">;

function HorasDeSuplencia({ tarifas, dia, onCambiar }: PropsGrupo) {
  const consulta = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  const profesoras = useMemo<ProfesoraDeLiquidacion[]>(
    () =>
      (consulta.data ?? [])
        .map(({ id, nombre, apellido }) => ({ id: Number(id), nombre, apellido }))
        .sort((a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es")),
    [consulta.data],
  );

  if (consulta.isPending) return <Skeleton aria-label="Cargando los profesores" className="h-20 w-full rounded-xl" />;
  if (consulta.isError) {
    return (
      <Reintentar
        error={consulta.error}
        mensaje="No se pudo cargar la lista de profesores."
        reintentando={consulta.isFetching}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {profesoras.map((profesora) => (
        <FilaDeTarifa
          key={profesora.id}
          nombre={nombreCompleto(profesora)}
          alcance={{ concepto: "HORA_SUPLENCIA", profesora }}
          tarifas={tarifas}
          dia={dia}
          onCambiar={onCambiar}
        />
      ))}
    </ul>
  );
}

function GruposDeTarifas(props: PropsGrupo) {
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      <section aria-labelledby="tarifa-por-alumno">
        <h3 id="tarifa-por-alumno" className={SUBTITULO}>
          Por alumno a cargo
        </h3>
        <p className="text-sm text-muted-foreground">Uno solo para todo el estudio.</p>
        <ul>
          <FilaDeTarifa nombre="Todos" alcance={{ concepto: "ALUMNO_A_CARGO" }} {...props} />
        </ul>
      </section>
      <section aria-labelledby="tarifa-por-hora">
        <h3 id="tarifa-por-hora" className={SUBTITULO}>
          Por hora de suplencia
        </h3>
        <p className="text-sm text-muted-foreground">Cada profesor/a tiene la suya.</p>
        <HorasDeSuplencia {...props} />
      </section>
    </div>
  );
}

export function TarifasDelMes({ periodo }: { periodo: string }) {
  const { data: tarifas, isPending, isError, error, refetch, isFetching } = useTarifas();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  // No se limpia al cerrar: así el título del diálogo no cambia mientras se va.
  const [alcance, setAlcance] = useState<AlcanceTarifa | null>(null);
  const idTitulo = useId();
  const dia = ultimoDiaDe(periodo);

  function cambiar(elegido: AlcanceTarifa) {
    setAlcance(elegido);
    setDialogoAbierto(true);
  }

  function contenido() {
    if (isPending) return <Skeleton aria-label="Cargando las tarifas" className="h-24 w-full rounded-xl" />;
    if (isError) {
      return <Reintentar error={error} mensaje="No se pudieron cargar las tarifas." reintentando={isFetching} onReintentar={() => void refetch()} />;
    }
    return <GruposDeTarifas tarifas={tarifas} dia={dia} onCambiar={cambiar} />;
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5 dark:bg-surface-low">
      <div>
        <h2 id={idTitulo} className="text-base font-extrabold text-dark dark:text-white">
          Tarifas del mes
        </h2>
        <p className="text-sm text-muted-foreground">Las que rigen el {fechaCorta(dia)}: son las que usa el cálculo.</p>
      </div>
      {contenido()}
      <Can permission="HONORARIOS_LIQUIDAR">
        <DialogoTarifa abierto={dialogoAbierto} periodo={periodo} alcance={alcance} onClose={() => setDialogoAbierto(false)} />
      </Can>
    </section>
  );
}
