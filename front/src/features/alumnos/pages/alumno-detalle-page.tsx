import { useState, type KeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  Loader2,
  Mail,
  Phone,
  Ruler,
  Scale,
  UserRound,
  UserRoundPen,
} from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccionesEstadoAlumno } from "@/features/alumnos/components/acciones-estado-alumno";
import { AlumnoEdicionForm } from "@/features/alumnos/components/alumno-edicion-form";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { ModalCambiarPlan } from "@/features/alumnos/components/modal-cambiar-plan";
import { esAlumnoNoEncontrado, useAlumno } from "@/features/alumnos/hooks/use-alumnos";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { calcularEdad, type AlumnoDetalle, type InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { diaSemana } from "@/features/alumnos/utils/fecha";
import { detalleVencimiento } from "@/features/alumnos/utils/situacion-cuota";
import { HistorialCobrosAlumno } from "@/features/cobros/components/historial-cobros-alumno";

type SeccionFicha = "datos" | "plan" | "cobros" | "asistencia" | "progreso";

// INACTIVO es el pre-inscripto que espera su primer pago (US-07).
function textoEstado(estado: string): string {
  if (estado === "ACTIVO" || estado === "ACTIVA") return "Activo";
  if (estado === "PREINSCRIPTA" || estado === "INACTIVO") return "Pendiente de alta";
  return "Baja";
}

function clasesEstado(estado: string): string {
  if (estado === "ACTIVO" || estado === "ACTIVA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200";
  }
  if (estado === "PREINSCRIPTA" || estado === "INACTIVO") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
}

function fechaLegible(fecha: string | null): string {
  if (!fecha) return "Sin información";
  const valor = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(valor);
}


function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-slate-600 dark:text-slate-300">{etiqueta}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {valor || "Sin información"}
      </dd>
    </div>
  );
}

function DatoEnlace({
  etiqueta,
  valor,
  href,
}: {
  etiqueta: string;
  valor: string | null;
  href: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-slate-600 dark:text-slate-300">{etiqueta}</dt>
      <dd className="mt-1 break-all text-sm font-semibold text-slate-800 dark:text-slate-100">
        {href ? (
          <a className="rounded-sm hover:text-[#BC1266] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] dark:hover:text-pink-200" href={href}>
            {valor}
          </a>
        ) : (
          valor || "Sin información"
        )}
      </dd>
    </div>
  );
}

function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toLocaleUpperCase("es");
}

export function AlumnoDetallePage() {
  const { id: idRuta } = useParams();
  const idAlumno = Number(idRuta);
  const idValido = Number.isInteger(idAlumno) && idAlumno > 0;
  const consulta = useAlumno(idValido ? idAlumno : 0);
  const { hasPermission, hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const puedeVerCobros = esPropietaria || hasPermission("PAGOS_REGISTRAR");
  // Como en el back (PATCH /alumnos/:id): con ALUMNOS_EDITAR la propietaria edita todo; la
  // profesora, solo contacto y observaciones. Baja, reactivación y cambio de plan, solo la propietaria.
  const puedeEditarTodosLosDatos = esPropietaria && hasPermission("ALUMNOS_EDITAR");
  const puedeEditar = hasPermission("ALUMNOS_EDITAR");
  const [cambiandoPlan, setCambiandoPlan] = useState(false);
  const [editando, setEditando] = useState(false);
  const [seccion, setSeccion] = useState<SeccionFicha>("datos");
  const alumno = consulta.data;
  const nombreCompleto = alumno ? `${alumno.usuario.nombre} ${alumno.usuario.apellido}` : "Ficha del alumno";
  const esMenor = alumno
    ? (calcularEdad(alumno.usuario.fecha_nacimiento) ?? Infinity) < 18
    : false;
  const secciones: { id: SeccionFicha; etiqueta: string }[] = [
    { id: "datos", etiqueta: "Datos personales" },
    { id: "plan", etiqueta: "Plan y horarios" },
    ...(puedeVerCobros ? [{ id: "cobros" as const, etiqueta: "Cobros" }] : []),
    { id: "asistencia", etiqueta: "Asistencia" },
    { id: "progreso", etiqueta: "Progreso y rutina" },
  ];

  function terminarEdicion() {
    setEditando(false);
    toast.success("Los datos del alumno se actualizaron.");
  }

  function navegarPestanas(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const indiceSiguiente =
      evento.key === "ArrowRight"
        ? (indice + 1) % secciones.length
        : evento.key === "ArrowLeft"
          ? (indice - 1 + secciones.length) % secciones.length
          : evento.key === "Home"
            ? 0
            : evento.key === "End"
              ? secciones.length - 1
              : -1;
    if (indiceSiguiente < 0) return;
    evento.preventDefault();
    const siguiente = secciones[indiceSiguiente];
    if (!siguiente) return;
    setSeccion(siguiente.id);
    document.getElementById(`tab-${siguiente.id}`)?.focus();
  }

  return (
    <OwnerLayout>
      <main className="mx-auto w-full max-w-[1240px] py-5 pb-8 md:py-8">
        <Link
          to="/app/alumnos/listado"
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#BC1266] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] dark:text-slate-300"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver al listado
        </Link>

        {!idValido ? (
          <EstadoFicha
            titulo="No encontramos ese alumno"
            descripcion="Revisá el enlace o volvé al listado para elegir una ficha."
            error={false}
          />
        ) : consulta.isPending ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[#E91E82]" />
            Cargando ficha…
          </div>
        ) : consulta.isError && esAlumnoNoEncontrado(consulta.error) ? (
          <EstadoFicha
            titulo="No encontramos ese alumno"
            descripcion="No existe un alumno con ese identificador. Buscalo desde el listado."
            error={false}
          />
        ) : consulta.isError || !alumno ? (
          <EstadoFicha
            titulo="No se pudo cargar la ficha"
            descripcion={mensajeDeErrorApi(
              consulta.error,
              "El alumno no está disponible o no tenés permiso para verlo.",
            )}
            error
            onReintentar={() => void consulta.refetch()}
          />
        ) : editando ? (
          <>
            <header className="mb-5">
              <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-[#181C26] dark:text-white">
                Editar ficha de {nombreCompleto}
              </h1>
            </header>
            <AlumnoEdicionForm
              key={alumno.id_alumno}
              alumno={alumno}
              esPropietaria={puedeEditarTodosLosDatos}
              onCancelar={() => setEditando(false)}
              onGuardado={terminarEdicion}
            />
          </>
        ) : (
          <>
            <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#E91E82] text-lg font-black text-white sm:size-16">
                    {iniciales(alumno.usuario.nombre, alumno.usuario.apellido)}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white dark:border-surface-low",
                        alumno.estado === "ACTIVO"
                          ? "bg-emerald-500"
                          : alumno.estado === "INACTIVO"
                            ? "bg-amber-500"
                            : "bg-slate-400",
                      )}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#BC1266] dark:text-pink-200">Ficha del alumno</p>
                    <h1 className="mt-0.5 break-words text-xl font-black tracking-tight text-[#181C26] sm:text-2xl dark:text-white">
                      {nombreCompleto}
                    </h1>
                    <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                      DNI: {alumno.usuario.dni ?? "Sin DNI"} <span aria-hidden="true">·</span>{" "}
                      {calcularEdad(alumno.usuario.fecha_nacimiento)} años <span aria-hidden="true">·</span> ID:
                      {" "}ALU-{String(alumno.id_alumno).padStart(3, "0")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Alta: {fechaLegible(alumno.fecha_alta)}
                      {alumno.fecha_baja && <> · Baja: {fechaLegible(alumno.fecha_baja)}</>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "min-h-7 border px-2 text-sm",
                          clasesEstado(alumno.estado),
                        )}
                      >
                        {textoEstado(alumno.estado)}
                      </Badge>
                      {alumno.inscripcion?.situacion_cuota && (
                        <BadgeSituacionCuota situacion={alumno.inscripcion.situacion_cuota} />
                      )}
                      {esMenor && (
                        <Badge
                          variant="outline"
                          className="min-h-7 border-indigo-200 bg-indigo-50 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200"
                        >
                          Menor de edad
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                  {puedeEditar && (
                    <Button
                      type="button"
                      onClick={() => setEditando(true)}
                      className="min-h-[48px] w-full shrink-0 rounded-xl bg-[#BC1266] font-bold text-white hover:bg-[#9D1055] sm:w-auto dark:bg-pink-700 dark:hover:bg-pink-600"
                    >
                      <UserRoundPen aria-hidden="true" className="mr-2 h-4 w-4" />
                      {puedeEditarTodosLosDatos ? "Editar ficha" : "Editar contacto"}
                    </Button>
                  )}
                  {puedeEditarTodosLosDatos && <AccionesEstadoAlumno alumno={alumno} />}
                </div>
              </div>
            </header>

            <div
              className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:overflow-visible"
              role="tablist"
              aria-orientation="horizontal"
              aria-label="Secciones de la ficha"
            >
              {secciones.map((item, indice) => (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={seccion === item.id}
                  aria-controls="panel-ficha-alumno"
                  tabIndex={seccion === item.id ? 0 : -1}
                  onClick={() => setSeccion(item.id)}
                  onKeyDown={(evento) => navegarPestanas(evento, indice)}
                  className={cn(
                    "min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82]",
                    seccion === item.id
                      ? "border-[#E91E82] text-[#BC1266] dark:text-pink-200"
                      : "border-transparent text-slate-700 hover:border-pink-200 dark:text-slate-300 dark:hover:border-pink-600",
                  )}
                >
                  {item.etiqueta}
                </button>
              ))}
            </div>

            <section
              id="panel-ficha-alumno"
              role="tabpanel"
              aria-labelledby={`tab-${seccion}`}
              tabIndex={0}
              aria-label={secciones.find((item) => item.id === seccion)?.etiqueta}
              className="space-y-4"
            >
              {seccion === "datos" && (
                <>
                  {esMenor && alumno.tutor && (
                    <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                      <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                        <UserRound aria-hidden="true" className="h-5 w-5 text-[#E91E82]" />
                        Tutor responsable
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Datos de contacto de la persona responsable del alumno menor de edad.
                      </p>
                      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Dato etiqueta="Nombre" valor={`${alumno.tutor.nombre} ${alumno.tutor.apellido}`} />
                        <Dato etiqueta="DNI" valor={alumno.tutor.dni} />
                        <Dato etiqueta="Teléfono" valor={alumno.tutor.telefono} />
                        <Dato etiqueta="Email" valor={alumno.tutor.email} />
                      </dl>
                    </Card>
                  )}
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <UserRound aria-hidden="true" className="h-5 w-5 text-[#E91E82]" />
                      Datos personales
                    </h2>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Dato etiqueta="Nombre y apellido" valor={nombreCompleto} />
                      <Dato etiqueta="DNI" valor={alumno.usuario.dni} />
                      <Dato
                        etiqueta="Fecha de nacimiento"
                        valor={`${fechaLegible(alumno.usuario.fecha_nacimiento)} · ${calcularEdad(alumno.usuario.fecha_nacimiento)} años`}
                      />
                      <Dato etiqueta="Dirección" valor={alumno.usuario.direccion} />
                      <Dato
                        etiqueta="Apto médico"
                        valor={
                          alumno.apto_medico
                            ? `Presentado · ${fechaLegible(alumno.fecha_apto_medico)}`
                            : "No presentado"
                        }
                      />
                    </dl>
                  </Card>
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <Phone aria-hidden="true" className="h-5 w-5 text-[#E91E82]" />
                      Contacto
                    </h2>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <DatoEnlace
                        etiqueta="Teléfono"
                        valor={alumno.usuario.telefono}
                        href={alumno.usuario.telefono ? `tel:${alumno.usuario.telefono.replace(/[^\d+]/gu, "")}` : null}
                      />
                      <DatoEnlace
                        etiqueta="Email"
                        valor={alumno.usuario.email}
                        href={alumno.usuario.email ? `mailto:${alumno.usuario.email}` : null}
                      />
                      <Dato etiqueta="Contacto de emergencia" valor={alumno.cont_emerg_nombre} />
                      <Dato etiqueta="Teléfono de emergencia" valor={alumno.cont_emerg_telefono} />
                    </dl>
                  </Card>
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <Activity aria-hidden="true" className="size-5 text-[#E91E82]" />
                      Información médica y observaciones
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {alumno.observaciones || "No hay observaciones registradas."}
                    </p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Apto médico: {alumno.apto_medico ? `Presentado · ${fechaLegible(alumno.fecha_apto_medico)}` : "No presentado"}
                    </p>
                  </Card>
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <Scale aria-hidden="true" className="size-5 text-emerald-600" />
                      Mediciones básicas
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Dato etiqueta="Peso actual" valor={null} />
                      <Dato etiqueta="Talla / estatura" valor={null} />
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Todavía no hay mediciones registradas.
                    </p>
                  </Card>
                </>
              )}

              {seccion === "plan" && (
                <PlanYHorarios
                  alumno={alumno}
                  puedeCambiar={puedeEditarTodosLosDatos}
                  onCambiar={() => setCambiandoPlan(true)}
                />
              )}

              {seccion === "cobros" && puedeVerCobros && (
                <HistorialCobrosAlumno alumno={alumno} />
              )}

              {seccion === "asistencia" && (
                <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                  <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">
                    Historial de asistencia
                  </h2>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    El historial de asistencia todavía no está disponible.
                  </p>
                </Card>
              )}

              {seccion === "progreso" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <Dumbbell aria-hidden="true" className="size-5 text-[#E91E82]" />
                      Rutina
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Todavía no hay una rutina registrada para este alumno.
                    </p>
                  </Card>
                  <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
                      <Ruler aria-hidden="true" className="size-5 text-[#E91E82]" />
                      Evolución y mediciones
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      El historial de peso y talla aparecerá acá cuando se registren mediciones.
                    </p>
                  </Card>
                </div>
              )}
            </section>
            {cambiandoPlan && alumno.inscripcion && (
              <ModalCambiarPlan
                nombre={nombreCompleto}
                inscripcion={alumno.inscripcion}
                onClose={() => setCambiandoPlan(false)}
              />
            )}
          </>
        )}
      </main>
    </OwnerLayout>
  );
}

function PlanYHorarios({
  alumno,
  puedeCambiar,
  onCambiar,
}: {
  alumno: AlumnoDetalle;
  puedeCambiar: boolean;
  onCambiar: () => void;
}) {
  const { inscripcion } = alumno;
  return (
    <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-[#E91E82]" />
          Plan y horarios
        </h2>
        {puedeCambiar && inscripcion && (
          <Button type="button" variant="outline" onClick={onCambiar} className="min-h-[44px] w-full rounded-xl font-bold sm:w-auto">
            <CalendarClock aria-hidden="true" className="mr-2 h-4 w-4" />
            Cambiar plan u horarios
          </Button>
        )}
      </div>
      {inscripcion ? (
        <DetalleInscripcion inscripcion={inscripcion} />
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {alumno.estado === "BAJA"
            ? "Está dado de baja: no tiene un plan vigente. Al reactivarlo se elige el plan y los horarios."
            : "No tiene una inscripción vigente."}
        </p>
      )}
    </Card>
  );
}

function DetalleInscripcion({ inscripcion }: { inscripcion: InscripcionDeAlumno }) {
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Plan asignado" valor={inscripcion.plan.nombre} />
        <Dato etiqueta="Precio al inscribirse" valor={formatearPrecio(inscripcion.plan.precio)} />
        <Dato etiqueta="Profesora a cargo" valor={inscripcion.profesora} />
        <Dato etiqueta="Estado de inscripción" valor={textoEstado(inscripcion.estado)} />
        <Dato etiqueta="Inicio" valor={fechaLegible(inscripcion.fecha_inicio)} />
      </div>
      {inscripcion.situacion_cuota && <CuotaDeInscripcion situacion={inscripcion.situacion_cuota} />}
      {inscripcion.reserva && <AvisoReserva reserva={inscripcion.reserva} />}
      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-600">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Horarios</h3>
        {inscripcion.horarios.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {inscripcion.horarios.map((horario) => (
              <li key={horario.id_horario} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-600">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {horario.actividad} · {diaSemana(horario.dia_semana)}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {horario.hora_inicio}–{horario.hora_fin} · {horario.profesora}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No tiene horarios asignados.</p>
        )}
      </div>
    </>
  );
}

// US-18: el estado de la cuota con su vencimiento, si puede asistir y si hay una transferencia por revisar.
function CuotaDeInscripcion({ situacion }: { situacion: NonNullable<InscripcionDeAlumno["situacion_cuota"]> }) {
  const detalles = [
    detalleVencimiento(situacion),
    situacion.puede_asistir ? null : "No puede asistir a clases hasta que pague.",
    situacion.tiene_pago_pendiente ? "Tiene una transferencia informada sin revisar." : null,
  ].filter((detalle): detalle is string => detalle !== null);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cuota</h3>
        <BadgeSituacionCuota situacion={situacion} />
      </div>
      {detalles.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// US-07: la pre-inscripción guarda el lugar unos días sin el primer pago; el alta se confirma en
// "Pendientes de alta". Esa pantalla es solo de la propietaria: al resto no se le ofrece el enlace.
function AvisoReserva({ reserva }: { reserva: NonNullable<InscripcionDeAlumno["reserva"]> }) {
  const { hasRole } = usePermissions();
  return (
    <p
      className={cn(
        "mt-4 rounded-lg border p-3 text-sm font-medium",
        reserva.vencida
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200",
      )}
    >
      {reserva.vencida
        ? `La reserva venció el ${fechaLegible(reserva.vence)}: el lugar ya no está guardado.`
        : `Lugar guardado hasta el ${fechaLegible(reserva.vence)}.`}{" "}
      {hasRole("PROPIETARIA") ? (
        <>
          El alta se confirma al registrar el primer pago, desde{" "}
          <Link to="/app/alumnos/pendientes" className="font-bold underline underline-offset-2">
            Pendientes de alta
          </Link>
          .
        </>
      ) : (
        "La propietaria confirma el alta al registrar el primer pago."
      )}
    </p>
  );
}

function EstadoFicha({
  titulo,
  descripcion,
  error,
  onReintentar,
}: {
  titulo: string;
  descripcion: string;
  error: boolean;
  onReintentar?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          error
            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        {error ? (
          <Mail aria-hidden="true" className="h-6 w-6" />
        ) : (
          <UserRound aria-hidden="true" className="h-6 w-6" />
        )}
      </span>
      <h1 className="text-xl font-extrabold text-[#181C26] dark:text-white">{titulo}</h1>
      <p
        role={error ? "alert" : undefined}
        className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300"
      >
        {descripcion}
      </p>
      {onReintentar && (
        <Button type="button" onClick={onReintentar} className="min-h-[44px]">
          Reintentar
        </Button>
      )}
      <Button asChild variant="outline" className="min-h-[44px]">
        <Link to="/app/alumnos/listado">Volver al listado</Link>
      </Button>
    </Card>
  );
}
