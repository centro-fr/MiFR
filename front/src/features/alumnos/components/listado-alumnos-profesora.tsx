import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { AvatarIniciales, AvisoVacio, CAJA, ControlSegmentado, EncabezadoPantalla, FILA } from "@/components/movil/piezas";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { ModalPreinscripcion } from "@/features/alumnos/components/preinscripcion/ModalPreinscripcion";
import { useAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { useFormasDePrimerPago } from "@/features/alumnos/hooks/use-formas-de-primer-pago";
import type { ResultadoPreinscripcion } from "@/features/alumnos/hooks/use-preinscripcion";
import type { AlumnoResumen } from "@/features/alumnos/schemas/alumno";
import { debeLaCuota, etiquetaCuota } from "@/features/alumnos/utils/situacion-cuota";
import { CobroDeCuota } from "@/features/cobros/components/cobro-de-cuota";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { normalizarParaBuscar } from "@/utils/texto";
import { cn } from "@/utils/cn";

// Alumnos a cargo de la profesora (US-10), con el diseño mobile: búsqueda, "Todos / Deben" y el cobro de
// la cuota desde la misma fila.

type Filtro = "todos" | "deben";

const CobroInmediato = lazy(() =>
  import("@/features/alumnos/components/alta-definitiva/cobro-inmediato").then((m) => ({ default: m.CobroInmediato })),
);

function diaYMesCorto(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

function detalleDeLaFila(alumno: AlumnoResumen): string {
  const situacion = alumno.situacion_cuota;
  const partes = [alumno.plan ?? "Sin plan"];
  if (alumno.estado === "PENDIENTE") partes.push("Pendiente de alta");
  else if (situacion) {
    partes.push(etiquetaCuota(situacion.estado));
    if (debeLaCuota(alumno) && situacion.fecha_vencimiento) partes.push(diaYMesCorto(situacion.fecha_vencimiento));
  }
  return partes.join(" · ");
}

function coincide(alumno: AlumnoResumen, termino: string): boolean {
  if (!termino) return true;
  const dni = (alumno.dni ?? "").replace(/\./g, "");
  return normalizarParaBuscar(alumno.nombre_completo).includes(termino) || dni.includes(termino.replace(/\./g, ""));
}

function FilaAlumno({ alumno, puedeCobrar, onCobrar }: { alumno: AlumnoResumen; puedeCobrar: boolean; onCobrar: () => void }) {
  const conBoton = puedeCobrar && alumno.estado === "ACTIVO" && debeLaCuota(alumno);
  return (
    <li className={cn(FILA, "flex items-center gap-2 pr-3")}>
      <Link
        to={`/app/alumnos/${alumno.id_alumno}`}
        aria-label={`Ver ficha de ${alumno.nombre_completo}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-0.5 pl-3.5"
      >
        <AvatarIniciales nombre={alumno.nombre_completo} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{alumno.nombre_completo}</span>
          <span className="block text-xs text-muted-foreground">{detalleDeLaFila(alumno)}</span>
        </span>
        {!conBoton && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />}
      </Link>
      {conBoton && (
        <button
          type="button"
          aria-label={`Cobrar a ${alumno.nombre_completo}`}
          onClick={onCobrar}
          className="h-9 shrink-0 rounded-lg border border-slate-400 bg-card px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5"
        >
          Cobrar
        </button>
      )}
    </li>
  );
}

interface Props {
  /** La propietaria en su panel de Profesora ve solo los suyos: el back a ella le trae todos. */
  idProfesora?: string;
}

export function ListadoAlumnosProfesora({ idProfesora = "" }: Props) {
  const { hasPermission } = usePermissions();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [idAlumnoACobrar, setIdAlumnoACobrar] = useState<number | null>(null);
  const [preinscribiendo, setPreinscribiendo] = useState(false);
  const [idInscripcionACobrar, setIdInscripcionACobrar] = useState<number | null>(null);
  const terminarCobroInmediato = useCallback(() => setIdInscripcionACobrar(null), []);
  const puedeCobrarPrimerPago = useFormasDePrimerPago().length > 0;

  // El back ya le devuelve a la profesora solo sus alumnos; la búsqueda se hace acá sobre esa lista.
  const consulta = useAlumnos({
    busqueda: "",
    estado: "TODOS",
    id_plan: "",
    id_profesora: idProfesora,
    id_actividad: "",
    incluir_bajas: false,
    limit: Number.MAX_SAFE_INTEGER,
    offset: 0,
  });
  const todos = useMemo(() => consulta.data?.items ?? [], [consulta.data]);
  const activos = todos.filter((alumno) => alumno.estado === "ACTIVO").length;
  const visibles = useMemo(() => {
    const termino = normalizarParaBuscar(busqueda);
    return todos.filter((alumno) => coincide(alumno, termino) && (filtro === "todos" || debeLaCuota(alumno)));
  }, [todos, busqueda, filtro]);

  function alPreinscribir({ idInscripcion, cobrarAhora }: ResultadoPreinscripcion) {
    void consulta.refetch();
    if (cobrarAhora) setIdInscripcionACobrar(idInscripcion);
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Tus alumnos"
        detalle={consulta.data ? `${activos} ${activos === 1 ? "activo" : "activos"}` : undefined}
        accion={
          hasPermission("ALUMNOS_EDITAR") && (
            <button
              type="button"
              onClick={() => setPreinscribiendo(true)}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-bold text-white hover:bg-primary-dark"
            >
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Pre-inscribir
            </button>
          )
        }
      />

      <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground">
        <Search aria-hidden="true" className="size-4.5" />
        <span className="sr-only">Buscar alumno</span>
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre o DNI"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        />
      </label>

      <ControlSegmentado
        etiqueta="Filtrar alumnos"
        valor={filtro}
        onCambiar={setFiltro}
        opciones={[
          { id: "todos", etiqueta: "Todos" },
          { id: "deben", etiqueta: "Deben" },
        ]}
      />

      {consulta.isPending ? (
        <TablaSkeleton ariaLabel="Cargando tus alumnos" filas={6} />
      ) : consulta.isError ? (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar tus alumnos.")}
          onReintentar={() => void consulta.refetch()}
        />
      ) : visibles.length === 0 ? (
        <AvisoVacio>
          {todos.length === 0
            ? "Todavía no tenés alumnos a cargo."
            : filtro === "deben" && !busqueda
              ? "Nadie debe la cuota."
              : "No hay alumnos que coincidan con la búsqueda."}
        </AvisoVacio>
      ) : (
        <ul aria-label="Alumnos" className={cn(CAJA, "overflow-hidden")}>
          {visibles.map((alumno) => (
            <FilaAlumno
              key={alumno.id_alumno}
              alumno={alumno}
              puedeCobrar={hasPermission("PAGOS_REGISTRAR")}
              onCobrar={() => setIdAlumnoACobrar(alumno.id_alumno)}
            />
          ))}
        </ul>
      )}

      <CobroDeCuota idAlumno={idAlumnoACobrar} onCerrar={() => setIdAlumnoACobrar(null)} />
      {preinscribiendo && (
        <ModalPreinscripcion
          open={preinscribiendo}
          onOpenChange={setPreinscribiendo}
          onExito={alPreinscribir}
          puedeCobrarAhora={puedeCobrarPrimerPago}
        />
      )}
      {idInscripcionACobrar !== null && (
        <Suspense fallback={null}>
          <CobroInmediato idInscripcion={idInscripcionACobrar} onTerminar={terminarCobroInmediato} />
        </Suspense>
      )}
    </>
  );
}
