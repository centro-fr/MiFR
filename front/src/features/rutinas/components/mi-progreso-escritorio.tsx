import { useMemo, useState } from "react";
import { Dumbbell, Info, Ruler } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { Evolucion } from "@/features/rutinas/components/detalle-evolucion";
import { RutinaVigente } from "@/features/rutinas/components/detalle-rutina";
import { CargandoTarjeta, ErrorDeCarga, SinDatos, Tarjeta } from "@/features/rutinas/components/tarjeta";
import {
  useMedicionesDeAlumno,
  useMisAlumnos,
  useNombresDeProfesoras,
  useRutinasDeAlumno,
} from "@/features/rutinas/hooks/use-rutinas";
import type { AlumnoConsultable } from "@/types/rutinas";
import { cn } from "@/utils/cn";
import { InsigniasContenido } from "@/features/portal-alumno/components/insignias-contenido";

// US-28: el alumno consulta su rutina y su evolución física; el tutor, las de sus menores. Solo lectura:
// lo carga la profesora desde la ficha (US-27).

function Aviso({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-border bg-white p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      {children}
    </p>
  );
}

function MiRutina({ alumno }: { alumno: AlumnoConsultable }) {
  const consulta = useRutinasDeAlumno(alumno.id, true);
  const nombres = useNombresDeProfesoras();
  const vigente = consulta.data?.find((rutina) => rutina.vigente) ?? null;

  function contenido() {
    if (consulta.isPending) return <CargandoTarjeta etiqueta="Cargando la rutina" />;
    if (consulta.isError) {
      return (
        <ErrorDeCarga
          error={consulta.error}
          mensaje="No se pudo cargar la rutina."
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      );
    }
    if (!vigente) {
      const texto = alumno.propio ? "Tu profesora todavía no cargó una rutina." : `Su profesora todavía no le cargó una rutina a ${alumno.nombre}.`;
      return <SinDatos texto={texto} accion={null} />;
    }
    return <RutinaVigente rutina={vigente} nombresDeProfesoras={nombres} />;
  }

  return (
    <Tarjeta id="titulo-mi-rutina" titulo={alumno.propio ? "Tu rutina" : `Rutina de ${alumno.nombre}`} icono={Dumbbell} accion={null}>
      {contenido()}
    </Tarjeta>
  );
}

function MiProgreso({ alumno }: { alumno: AlumnoConsultable }) {
  const consulta = useMedicionesDeAlumno(alumno.id, true);
  const nombres = useNombresDeProfesoras();
  const mediciones = useMemo(() => consulta.data ?? [], [consulta.data]);

  function contenido() {
    if (consulta.isPending) return <CargandoTarjeta etiqueta="Cargando el progreso" />;
    if (consulta.isError) {
      return (
        <ErrorDeCarga
          error={consulta.error}
          mensaje="No se pudo cargar el progreso."
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      );
    }
    if (mediciones.length === 0) return <SinDatos texto="Todavía no hay registros de progreso." accion={null} />;
    return (
      <>
        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">Última medición: {formatearFecha(mediciones[0].fecha)}</p>
        <Evolucion mediciones={mediciones} nombresDeProfesoras={nombres} />
      </>
    );
  }

  return (
    <Tarjeta id="titulo-mi-progreso" titulo={alumno.propio ? "Tu progreso" : `Progreso de ${alumno.nombre}`} icono={Ruler} accion={null}>
      {contenido()}
    </Tarjeta>
  );
}

/** El tutor con más de un menor elige de quién ver la rutina. */
function SelectorDeAlumno({ alumnos, elegido, onElegir }: { alumnos: AlumnoConsultable[]; elegido: number; onElegir: (id: number) => void }) {
  return (
    <div role="group" aria-label="Ver la rutina de" className="flex flex-wrap gap-2">
      {alumnos.map((alumno) => (
        <button
          key={alumno.id}
          type="button"
          aria-pressed={alumno.id === elegido}
          onClick={() => onElegir(alumno.id)}
          className={cn(
            "min-h-11 rounded-xl border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            alumno.id === elegido
              ? "border-primary bg-pink-50 text-primary dark:bg-primary/15"
              : "border-border bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200",
          )}
        >
          {alumno.nombre} {alumno.apellido}
        </button>
      ))}
    </div>
  );
}

function ContenidoDeLaPagina() {
  const consulta = useMisAlumnos();
  const [idElegido, setIdElegido] = useState<number | null>(null);

  if (consulta.isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando" className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <ErrorDeCarga
        error={consulta.error}
        mensaje="No se pudieron cargar tus datos."
        reintentando={consulta.isFetching}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }

  const alumnos = consulta.data;
  const elegido = alumnos.find((alumno) => alumno.id === idElegido) ?? alumnos[0];
  if (!elegido) return <Aviso>No encontramos una ficha de alumno vinculada a tu cuenta. Consultá en el centro.</Aviso>;

  return (
    <>
      {alumnos.length > 1 && <SelectorDeAlumno alumnos={alumnos} elegido={elegido.id} onElegir={setIdElegido} />}
      {elegido.dadoDeBaja ? (
        <Aviso>
          {elegido.propio
            ? "Tu inscripción está dada de baja: ya no podés consultar tu rutina ni tu progreso."
            : `La inscripción de ${elegido.nombre} está dada de baja: ya no se puede consultar su rutina ni su progreso.`}
        </Aviso>
      ) : (
        // La key reinicia las consultas y el estado de las tarjetas al cambiar de menor.
        <div key={elegido.id} className="flex flex-col gap-4">
          <MiRutina alumno={elegido} />
          <MiProgreso alumno={elegido} />
          <InsigniasContenido />
        </div>
      )}
    </>
  );
}

/** Rutina y progreso del alumno en escritorio (la vista anterior al diseño mobile). */
export function MiProgresoEscritorio() {
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Rutina y progreso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lo que armó la profesora para cada día y cómo vienen las mediciones.</p>
        </header>
        <ContenidoDeLaPagina />
      </div>
    </OwnerLayout>
  );
}
