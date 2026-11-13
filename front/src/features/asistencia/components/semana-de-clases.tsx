import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { AvisoVacio, CAJA } from "@/components/movil/piezas";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { useClasesAsistencia } from "@/features/asistencia/hooks/use-asistencia";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { estadoVisible, puedeTomarAsistencia, sumarDias } from "@/features/asistencia/utils/formato-clase";
import {
  diaInicial,
  diasDeLaSemana,
  diaYMes,
  lunesDeLaSemana,
  tituloDeLaSemana,
  type DiaDeLaSemana,
} from "@/features/asistencia/utils/semana";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { saludoSegunHorario } from "@/utils/saludo";
import { useCronogramaProfesor } from "@/features/horarios/hooks/use-cronograma-profesor";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useMinutoActual } from "@/hooks/use-minuto-actual";
import type { Horario } from "@/types/horarios";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";

// US-20 y US-04: "Mis clases" de la profesora. Hoy muestra las clases reales del día (con su estado y la
// toma de asistencia); el resto de la semana, su cronograma de horarios.

type Pastilla = "AHORA" | "TERMINO" | "MAS_TARDE" | "CANCELADA";

interface ClaseEnLista {
  clave: string;
  inicio: string;
  fin: string;
  actividad: string;
  detalle: string;
  pastilla: Pastilla | null;
  /** Clase de hoy en la que se puede tomar asistencia ahora. */
  idClaseParaAsistencia: number | null;
}

const PASTILLAS: Record<Pastilla, { texto: string; clases: string }> = {
  AHORA: { texto: "Ahora", clases: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  TERMINO: { texto: "Terminó", clases: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300" },
  MAS_TARDE: { texto: "Más tarde", clases: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300" },
  CANCELADA: { texto: "Cancelada", clases: "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
};

const PASTILLA_DE_ESTADO = {
  EN_CURSO: "AHORA",
  ABIERTA: "AHORA",
  CERRADA: "TERMINO",
  PROGRAMADA: "MAS_TARDE",
  CANCELADA: "CANCELADA",
} as const satisfies Record<ReturnType<typeof estadoVisible>, Pastilla>;

function ocupacion(inscriptos: number, cupo: number | null): string {
  if (cupo === null) return `${inscriptos} ${inscriptos === 1 ? "inscripto" : "inscriptos"}`;
  return `${inscriptos} de ${cupo} inscriptos`;
}

function desdeClaseDeHoy(clase: ClaseDelDiaApi, propietaria: boolean, ahora: Date): ClaseEnLista {
  const cupo = clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
  return {
    clave: `clase-${clase.id_clase}`,
    inicio: horaDesdeApi(clase.horario.hora_inicio),
    fin: horaDesdeApi(clase.horario.hora_fin),
    actividad: clase.horario.actividad.nombre,
    detalle: ocupacion(clase.inscriptos, cupo),
    pastilla: PASTILLA_DE_ESTADO[estadoVisible(clase, true, ahora)],
    idClaseParaAsistencia: puedeTomarAsistencia(clase, true, propietaria, ahora) ? clase.id_clase : null,
  };
}

function desdeHorario(horario: Horario): ClaseEnLista {
  return {
    clave: `horario-${horario.id}`,
    inicio: horario.horaInicio,
    fin: horario.horaFin,
    actividad: horario.actividadNombre,
    detalle: horario.cupoMaximo ? `Cupo de ${horario.cupoMaximo}` : horario.actividadTipo === "GRUPAL" ? "Grupal" : "Personalizada",
    pastilla: null,
    idClaseParaAsistencia: null,
  };
}

function TarjetaClase({ clase }: { clase: ClaseEnLista }) {
  const pastilla = clase.pastilla && PASTILLAS[clase.pastilla];
  return (
    <article
      aria-label={`${clase.actividad} de ${clase.inicio} a ${clase.fin}`}
      className={cn(
        CAJA,
        "flex flex-col gap-3 px-4 py-3.5",
        clase.pastilla === "AHORA" && "border-emerald-300 dark:border-emerald-500/50",
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-13 shrink-0 tabular-nums">
          <div className="text-base leading-[22px] font-extrabold">{clase.inicio}</div>
          <div className="text-xs text-muted-foreground">a {clase.fin}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{clase.actividad}</div>
          <div className="text-xs text-muted-foreground">{clase.detalle}</div>
        </div>
        {pastilla && (
          <span className={cn("rounded-full px-2.5 text-xs leading-5 font-bold whitespace-nowrap", pastilla.clases)}>
            {pastilla.texto}
          </span>
        )}
      </div>
      {clase.idClaseParaAsistencia !== null && (
        <Link
          to={`/app/hoy/${clase.idClaseParaAsistencia}`}
          className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-dark"
        >
          Tomar asistencia
        </Link>
      )}
    </article>
  );
}

interface PropsSelector {
  dias: DiaDeLaSemana[];
  elegida: string;
  hoy: string;
  conClases: (dia: DiaDeLaSemana) => boolean;
  onElegir: (fecha: string) => void;
}

function SelectorDeDia({ dias, elegida, hoy, conClases, onElegir }: PropsSelector) {
  return (
    <div role="tablist" aria-label="Días de la semana" className="grid grid-cols-6 gap-1.5">
      {dias.map((dia) => {
        const seleccionado = dia.fecha === elegida;
        const esHoy = dia.fecha === hoy;
        const tiene = conClases(dia);
        return (
          <button
            key={dia.fecha}
            type="button"
            role="tab"
            aria-selected={seleccionado}
            aria-label={`${esHoy ? "Hoy, " : ""}${dia.largo} ${dia.numero}${tiene ? "" : ", sin clases"}`}
            onClick={() => onElegir(dia.fecha)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-0.5 rounded-[10px] border",
              seleccionado
                ? "border-dark bg-dark text-white dark:border-white dark:bg-white dark:text-dark"
                : esHoy
                  ? "border-primary bg-card text-primary-dark dark:text-pink-300"
                  : "border-border bg-card text-slate-700 dark:text-slate-300",
            )}
          >
            <span className="text-[11px] leading-[14px] font-bold uppercase">{dia.corto}</span>
            <span className="text-lg leading-[22px] font-extrabold tabular-nums">{dia.numero}</span>
            <span
              aria-hidden="true"
              className={cn(
                "size-[5px] rounded-full",
                !tiene ? "bg-transparent" : seleccionado ? "bg-white dark:bg-dark" : "bg-primary",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function BotonSemana({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="flex h-9 w-11 items-center justify-center rounded-lg border border-slate-300 bg-card text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function nombreDelDia(fecha: string): string {
  const nombre = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${fecha}T12:00:00Z`));
  return nombre.charAt(0).toLocaleUpperCase("es") + nombre.slice(1);
}

function cantidadDeClases(cantidad: number): string {
  return cantidad === 1 ? "1 clase" : `${cantidad} clases`;
}

export function SemanaDeClases({ idProfesora }: { idProfesora: string }) {
  const { user } = useAuth();
  const { hasRole } = usePermissions();
  const ahora = useMinutoActual();
  const hoy = fechaActualArgentina();
  const [elegida, setElegida] = useState(() => diaInicial(hoy));
  const lunes = lunesDeLaSemana(elegida);
  const dias = diasDeLaSemana(lunes);

  const cronograma = useCronogramaProfesor(idProfesora);
  const consultaHoy = useClasesAsistencia();
  const propietaria = hasRole("PROPIETARIA");

  // A la propietaria que también dicta, /clases/hoy le trae las de todo el centro: se queda con las suyas.
  const clasesDeHoy = useMemo(
    () =>
      (consultaHoy.data ?? [])
        .filter((clase) => clase.id_prof_dictante === Number(idProfesora))
        .sort((a, b) => a.horario.hora_inicio.localeCompare(b.horario.hora_inicio)),
    [consultaHoy.data, idProfesora],
  );

  const diaElegido = dias.find((dia) => dia.fecha === elegida) ?? dias[0];
  const esHoy = elegida === hoy;
  const lista: ClaseEnLista[] = esHoy
    ? clasesDeHoy.map((clase) => desdeClaseDeHoy(clase, propietaria, ahora))
    : cronograma.horariosPorDia[diaElegido.dia].map(desdeHorario);
  const cargando = esHoy ? consultaHoy.isPending : cronograma.cargando;
  const error = esHoy ? consultaHoy.error : cronograma.error;

  function moverSemana(semanas: number) {
    setElegida((fecha) => sumarDias(fecha, semanas * 7));
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{saludoSegunHorario(user?.nombre)}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {nombreDelDia(hoy)} {diaYMes(hoy)}
          {!consultaHoy.isPending &&
            !consultaHoy.isError &&
            (clasesDeHoy.length > 0 ? ` · hoy tenés ${cantidadDeClases(clasesDeHoy.length)}` : " · hoy no tenés clases")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">{tituloDeLaSemana(dias)}</h2>
        <div className="flex gap-1">
          <BotonSemana etiqueta="Semana anterior" onClick={() => moverSemana(-1)}>
            <ChevronLeft aria-hidden="true" className="size-4.5" />
          </BotonSemana>
          <BotonSemana etiqueta="Semana siguiente" onClick={() => moverSemana(1)}>
            <ChevronRight aria-hidden="true" className="size-4.5" />
          </BotonSemana>
        </div>
      </div>

      <SelectorDeDia
        dias={dias}
        elegida={elegida}
        hoy={hoy}
        conClases={(dia) => cronograma.horariosPorDia[dia.dia].length > 0}
        onElegir={setElegida}
      />

      <h2 aria-live="polite" className="mt-1 text-base font-bold">
        {esHoy ? "Hoy" : `${diaElegido.largo} ${diaElegido.numero}`}
        {!cargando && !error && ` · ${cantidadDeClases(lista.length)}`}
      </h2>

      {cargando ? (
        <TablaSkeleton ariaLabel="Cargando tus clases" filas={3} />
      ) : error ? (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(error, "No se pudieron cargar tus clases.")}
          onReintentar={() => void (esHoy ? consultaHoy.refetch() : cronograma.reintentar())}
        />
      ) : lista.length === 0 ? (
        <AvisoVacio>No tenés clases este día.</AvisoVacio>
      ) : (
        lista.map((clase) => <TarjetaClase key={clase.clave} clase={clase} />)
      )}
    </>
  );
}
