import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CircleCheck, CircleX, Clock, History, Landmark, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { useAlumno } from "@/features/alumnos/hooks/use-alumnos";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { formatearDiaDeTimestamp } from "@/features/alumnos/utils/formato-ficha";
import { detalleVencimiento } from "@/features/alumnos/utils/situacion-cuota";
import { EtiquetaEstado, EtiquetaPlazo } from "@/features/transferencias/components/etiquetas-transferencia";
import { AvatarAlumno } from "@/features/transferencias/components/lista-transferencias";
import { useTransferenciasDelAlumno } from "@/features/transferencias/hooks/use-transferencias";
import {
  etiquetaTipo,
  formatearFechaHora,
  tipoDeTransferencia,
} from "@/features/transferencias/utils/formato-transferencia";
import { textoHoras, textoTiempoRestante, tramoDePlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

type TonoAviso = "info" | "alerta" | "peligro" | "exito";

const CLASES_AVISO: Record<TonoAviso, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  alerta: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  peligro: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  exito: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
};

function Aviso({ tono, icono: Icono, titulo, children }: { tono: TonoAviso; icono: typeof Clock; titulo: string; children?: ReactNode }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border p-3 text-sm leading-relaxed", CLASES_AVISO[tono])}>
      <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-bold">{titulo}</p>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

// ---------- Avisos ----------

function AvisosDelPlazo({ transferencia }: { transferencia: Transferencia }) {
  const tramo = tramoDePlazo(transferencia);
  if (tramo === "vencida") {
    return (
      <Aviso tono="peligro" icono={AlertTriangle} titulo={`Vencida en verificación (${textoHoras(transferencia.horasDesdeLaCarga)} sin respuesta)`}>
        Superó las 24 h desde la carga. Sigue pendiente hasta que la apruebes o la rechaces.
      </Aviso>
    );
  }
  if (tramo === "por-vencer") {
    return (
      <Aviso tono="alerta" icono={Clock} titulo="Por superar las 24 h">
        {textoTiempoRestante(transferencia.horasDesdeLaCarga)}.
      </Aviso>
    );
  }
  return null;
}

// Regla de la spec: sin comprobante adjunto, la propietaria la busca en su extracto bancario.
function AvisoVerificarExtracto({ transferencia }: { transferencia: Transferencia }) {
  const cuando = transferencia.realizadaEl ? ` del ${formatearDiaDeTimestamp(transferencia.realizadaEl)}` : "";
  const desde = transferencia.titularCuenta ? `, desde la cuenta de ${transferencia.titularCuenta}` : "";
  return (
    <Aviso tono="info" icono={Landmark} titulo="Verificá el ingreso del dinero en tu extracto bancario antes de aprobar.">
      No hay comprobante adjunto: buscá en tu homebanking una transferencia de {formatearPrecio(transferencia.monto)}
      {cuando}
      {desde}.
    </Aviso>
  );
}

// El precio con el que se inscribió: el back compara contra el de la cuota y, si difiere, pide
// confirmarlo al aprobar (409 MONTO_DISTINTO). Acá solo se adelanta el aviso.
function AvisoMontoDistinto({ monto, precioPlan }: { monto: number; precioPlan: number }) {
  if (monto === precioPlan) return null;
  return (
    <Aviso tono="alerta" icono={AlertTriangle} titulo="El monto no coincide con el precio del plan">
      Informado {formatearPrecio(monto)} · precio del plan {formatearPrecio(precioPlan)} (diferencia{" "}
      {formatearPrecio(Math.abs(precioPlan - monto))}). Podés aprobarla igual confirmándolo, o rechazarla.
    </Aviso>
  );
}

function AvisosPendiente({ transferencia, ficha }: { transferencia: Transferencia; ficha: AlumnoDetalle | undefined }) {
  const inscripcion = ficha?.inscripcion;
  return (
    <>
      <AvisoVerificarExtracto transferencia={transferencia} />
      <AvisosDelPlazo transferencia={transferencia} />
      {inscripcion && <AvisoMontoDistinto monto={transferencia.monto} precioPlan={inscripcion.plan.precio} />}
      {inscripcion?.estado === "PREINSCRIPTA" && (
        <Aviso tono="info" icono={UserPlus} titulo="Es su primera cuota">
          Al aprobarla se confirma el alta definitiva de {transferencia.alumno.nombre}.
        </Aviso>
      )}
    </>
  );
}

function AvisoResolucion({ transferencia }: { transferencia: Transferencia }) {
  const cuando = transferencia.resueltaEl ? ` el ${formatearFechaHora(transferencia.resueltaEl)}` : "";
  if (transferencia.estado === "CONFIRMADO") return <Aviso tono="exito" icono={CircleCheck} titulo={`Aprobada${cuando}`} />;
  return (
    <Aviso tono="peligro" icono={CircleX} titulo={`Rechazada${cuando}`}>
      Motivo: {transferencia.motivoRechazo ?? "sin motivo registrado"}
    </Aviso>
  );
}

// ---------- Datos ----------

function Dato({ etiqueta, children, ancho = false }: { etiqueta: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-slate-50 px-3 py-2.5 dark:bg-white/5", ancho && "col-span-2")}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{etiqueta}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function Secundario({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-sm font-medium text-muted-foreground">{children}</span>;
}

/** Plan y cuota salen de la ficha del alumno: el listado del back no los trae. */
function DatosDeLaFicha({ ficha, cargando, error, esPendiente }: { ficha?: AlumnoDetalle; cargando: boolean; error: boolean; esPendiente: boolean }) {
  if (cargando) {
    return (
      <>
        <Skeleton className="h-[68px] rounded-xl" />
        <Skeleton className="h-[68px] rounded-xl" />
      </>
    );
  }
  if (error || !ficha) {
    return <Dato etiqueta="Plan y cuota" ancho>No se pudieron cargar los datos del alumno.</Dato>;
  }
  const { inscripcion } = ficha;
  if (!inscripcion) return <Dato etiqueta="Plan" ancho>Sin plan vigente</Dato>;
  const tipo = esPendiente ? tipoDeTransferencia(ficha) : null;
  const vencimiento = inscripcion.situacion_cuota && detalleVencimiento(inscripcion.situacion_cuota);
  return (
    <>
      <Dato etiqueta="Plan">
        {inscripcion.plan.nombre}
        <Secundario>Precio {formatearPrecio(inscripcion.plan.precio)}</Secundario>
      </Dato>
      <Dato etiqueta="Estado de cuota">
        <BadgeSituacionCuota situacion={inscripcion.situacion_cuota} />
        {vencimiento && <Secundario>{vencimiento}</Secundario>}
      </Dato>
      {tipo && (
        <Dato etiqueta="Tipo" ancho>
          {etiquetaTipo(tipo)}
          {tipo === "PRIMERA_CUOTA" && <Secundario>Al aprobarla, se da el alta definitiva</Secundario>}
        </Dato>
      )}
    </>
  );
}

function DatosTransferencia({ transferencia }: { transferencia: Transferencia }) {
  const esPendiente = transferencia.estado === "PENDIENTE";
  return (
    <>
      <Dato etiqueta="Monto informado" ancho>
        <span className="text-xl font-extrabold tabular-nums">{formatearPrecio(transferencia.monto)}</span>
      </Dato>
      <Dato etiqueta="Fecha de transferencia">
        {transferencia.realizadaEl ? formatearFechaHora(transferencia.realizadaEl) : "Sin informar"}
      </Dato>
      <Dato etiqueta="Carga del aviso">
        {formatearFechaHora(transferencia.cargadaEl)}
        {esPendiente && <Secundario>Hace {textoHoras(transferencia.horasDesdeLaCarga)}</Secundario>}
      </Dato>
      {transferencia.titularCuenta && (
        <Dato etiqueta="Titular de la cuenta de origen" ancho>
          {transferencia.titularCuenta}
        </Dato>
      )}
    </>
  );
}

function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: typeof Clock; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        <Icono aria-hidden="true" className="size-3.5" />
        {titulo}
      </h3>
      {children}
    </section>
  );
}

const MAXIMO_HISTORIAL = 5;

/** Las otras transferencias del alumno, de la más nueva a la más vieja. */
function Historial({ transferencia }: { transferencia: Transferencia }) {
  const { data, isPending, isError } = useTransferenciasDelAlumno(transferencia.alumno.id);
  if (isPending) return <Skeleton className="h-16 rounded-lg" />;
  if (isError) return <p className="text-sm text-muted-foreground">No se pudo cargar el historial.</p>;
  const anteriores = data
    .filter((otra) => otra.id !== transferencia.id)
    .sort((a, b) => b.cargadaEl.localeCompare(a.cargadaEl))
    .slice(0, MAXIMO_HISTORIAL);
  if (anteriores.length === 0) return <p className="text-sm text-muted-foreground">Es su primera transferencia informada.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {anteriores.map((otra) => (
        <li key={otra.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="flex flex-col">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatearDiaDeTimestamp(otra.cargadaEl)} · {formatearPrecio(otra.monto)}
            </span>
            {otra.motivoRechazo && <span className="text-muted-foreground">{otra.motivoRechazo}</span>}
          </span>
          <EtiquetaEstado estado={otra.estado} />
        </li>
      ))}
    </ul>
  );
}

// ---------- Panel ----------

interface Props {
  transferencia: Transferencia;
  onAprobar: () => void;
  onRechazar: () => void;
}

/** US-17: lo que la propietaria necesita para decidir, sin comprobante (se verifica en el extracto). */
export function DetalleTransferencia({ transferencia, onAprobar, onRechazar }: Props) {
  const { alumno } = transferencia;
  const nombre = `${alumno.nombre} ${alumno.apellido}`;
  const esPendiente = transferencia.estado === "PENDIENTE";
  const ficha = useAlumno(alumno.id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start gap-3 border-b border-border p-4 pr-12">
        <AvatarAlumno nombre={alumno.nombre} apellido={alumno.apellido} className="size-11" />
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-dark dark:text-white">{nombre}</h2>
          <p className="text-sm text-muted-foreground">Transferencia N.º {transferencia.id}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <EtiquetaEstado estado={transferencia.estado} />
            {esPendiente && <EtiquetaPlazo transferencia={transferencia} larga />}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {esPendiente ? <AvisosPendiente transferencia={transferencia} ficha={ficha.data} /> : <AvisoResolucion transferencia={transferencia} />}
        <dl className="grid grid-cols-2 gap-2">
          <DatosTransferencia transferencia={transferencia} />
          <DatosDeLaFicha ficha={ficha.data} cargando={ficha.isPending} error={ficha.isError} esPendiente={esPendiente} />
        </dl>
        <Seccion titulo="Observaciones del alumno" icono={MessageSquare}>
          <p className={cn("text-sm leading-relaxed", transferencia.observaciones ? "italic text-slate-800 dark:text-slate-100" : "text-muted-foreground")}>
            {transferencia.observaciones ? `“${transferencia.observaciones}”` : "Sin observaciones."}
          </p>
        </Seccion>
        <Seccion titulo="Transferencias anteriores" icono={History}>
          <Historial transferencia={transferencia} />
        </Seccion>
        <Link
          to={`/app/alumnos/${alumno.id}`}
          className="self-start rounded-md text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Ver ficha de {alumno.nombre}
        </Link>
      </div>

      {esPendiente && (
        <footer className="grid grid-cols-[1fr_1.4fr] gap-2 border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onRechazar}
            className="min-h-[44px] rounded-xl border-rose-200 font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-500/40 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <CircleX aria-hidden="true" className="size-4" />
            Rechazar
          </Button>
          <Button type="button" onClick={onAprobar} className="min-h-[44px] rounded-xl bg-primary font-extrabold text-white shadow-md hover:bg-primary-dark">
            <CircleCheck aria-hidden="true" className="size-4" />
            Aprobar transferencia
          </Button>
        </footer>
      )}
    </div>
  );
}
