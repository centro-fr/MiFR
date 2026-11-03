import { useState, type KeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Loader2,
  Mail,
  MoreHorizontal,
  PenSquare,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
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
import {
  enlaceTelefono,
  formatearDni,
  formatearFecha,
  tiempoDesdeFecha,
} from "@/features/alumnos/utils/formato-ficha";
import { HistorialCobrosAlumno } from "@/features/cobros/components/historial-cobros-alumno";
import { ModalRegistrarCobro } from "@/features/cobros/components/modal-registrar-cobro";
import { RutinaYProgreso } from "@/features/rutinas/components/rutina-y-progreso";

type SeccionFicha = "datos" | "plan" | "progreso" | "cobros" | "asistencia";

function textoEstado(estado: string): string {
  if (estado === "ACTIVO" || estado === "ACTIVA") return "Activo";
  if (estado === "PREINSCRIPTA" || estado === "INACTIVO") return "Pendiente de alta";
  return "Baja";
}

function fechaLegible(fecha: string | null): string {
  if (!fecha) return "Sin información";
  const valor = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(valor);
}

function formatearFechaCorta(fechaIso: string | null): string {
  if (!fechaIso) return "-";
  return formatearFecha(fechaIso);
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
  const puedeEditarTodosLosDatos = esPropietaria && hasPermission("ALUMNOS_EDITAR");
  const puedeEditar = hasPermission("ALUMNOS_EDITAR");

  const [cambiandoPlan, setCambiandoPlan] = useState(false);
  const [editando, setEditando] = useState(false);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const [seccion, setSeccion] = useState<SeccionFicha>("datos");

  const alumno = consulta.data;
  const nombreCompleto = alumno ? `${alumno.usuario.nombre} ${alumno.usuario.apellido}` : "Ficha del alumno";
  const esMenor = alumno
    ? (calcularEdad(alumno.usuario.fecha_nacimiento) ?? Infinity) < 18
    : false;

  const secciones: { id: SeccionFicha; etiqueta: string }[] = [
    { id: "datos", etiqueta: "Datos" },
    { id: "plan", etiqueta: "Plan" },
    { id: "progreso", etiqueta: "Rutina y progreso" },
    ...(puedeVerCobros ? [{ id: "cobros" as const, etiqueta: "Cobros y cuotas" }] : []),
    { id: "asistencia", etiqueta: "Asistencia" },
  ];

  function terminarEdicion() {
    setEditando(false);
    toast.success("Los datos del alumno se actualizaron.");
    void consulta.refetch();
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

  // Información calculada para los 4 KPIs superiores
  const planNombre = alumno?.inscripcion?.plan.nombre ?? "Sin plan";
  const planSubtitulo = alumno?.inscripcion?.plan.tipo === "CLASE_SUELTA" ? "Clase suelta" : "3 clases por semana";

  const profesoraNombre = alumno?.inscripcion?.profesora ?? "Sin asignar";
  const primeraActividad = alumno?.inscripcion?.horarios[0]?.actividad ?? "Entrenamiento";
  const diasHorarios = alumno?.inscripcion?.horarios.length
    ? alumno.inscripcion.horarios.map((h) => diaSemana(h.dia_semana).slice(0, 3)).join(", ")
    : "A coordinar";
  const profesoraSubtitulo = `${primeraActividad} · ${diasHorarios}`;

  const cuotaSituacion = alumno?.inscripcion?.situacion_cuota ?? null;
  const cuotaSubtitulo = cuotaSituacion
    ? (cuotaSituacion.fecha_vencimiento
        ? `Vence el ${formatearFechaCorta(cuotaSituacion.fecha_vencimiento)}`
        : detalleVencimiento(cuotaSituacion) ?? "Sin vencimiento")
    : "Sin plan activo";

  const altaFecha = alumno?.fecha_alta ? formatearFechaCorta(alumno.fecha_alta) : "-";
  const altaAntiguedad = alumno?.fecha_alta ? tiempoDesdeFecha(alumno.fecha_alta) : "";

  return (
    <OwnerLayout>
      <main className="mx-auto w-full max-w-[1240px] space-y-6 py-4 pb-10">

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
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
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
            <div className="mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditando(false)}
                className="h-9 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Volver
              </Button>
            </div>
            <header className="mb-5">
              <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-900 dark:text-white">
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
          <div className="space-y-6">
            {/* Botón volver hacia atrás arriba a la izquierda */}
            <div>
              <Button
                asChild
                variant="outline"
                className="h-9 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Link to="/app/alumnos/listado" aria-label="Volver al listado de alumnos">
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Volver al listado
                </Link>
              </Button>
            </div>

            {/* Header del Alumno: Avatar + Nombre + Botones (Sin insignias ni rachas) */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-pink-100 text-2xl font-black text-primary shadow-2xs dark:bg-pink-950/60 dark:text-pink-300">
                  {iniciales(alumno.usuario.nombre, alumno.usuario.apellido)}
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {nombreCompleto}
                  </h1>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div className="flex items-center gap-2 shrink-0">
                {puedeEditar && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditando(true)}
                    className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <PenSquare aria-hidden="true" className="mr-1.5 size-4 text-slate-600 dark:text-slate-300" />
                    Editar datos
                  </Button>
                )}

                {puedeVerCobros && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!alumno.inscripcion) {
                        toast.error("El alumno no tiene una inscripción para cobrar.");
                        return;
                      }
                      setModalCobroAbierto(true);
                    }}
                    className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-dark transition-all"
                  >
                    <CreditCard aria-hidden="true" className="mr-1.5 size-4" />
                    Registrar cobro
                  </Button>
                )}

                {/* Dropdown / Botón de más acciones */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMenuAccionesAbierto(!menuAccionesAbierto)}
                    className="size-10 rounded-xl border-slate-200 bg-white p-0 text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Más acciones"
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </Button>

                  {menuAccionesAbierto && (
                    <div
                      className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                      onClick={() => setMenuAccionesAbierto(false)}
                    >
                      {puedeEditarTodosLosDatos && alumno.inscripcion && (
                        <button
                          type="button"
                          onClick={() => setCambiandoPlan(true)}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          Cambiar plan u horarios
                        </button>
                      )}
                      {puedeEditarTodosLosDatos && (
                        <div className="pt-1">
                          <AccionesEstadoAlumno alumno={alumno} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* 4 Tarjetas de Resumen / KPIs */}
            <section aria-label="Resumen del alumno" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPI 1: Plan */}
              <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plan</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white truncate">
                  {planNombre}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {planSubtitulo}
                </p>
              </Card>

              {/* KPI 2: Profesor/a */}
              <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Profesor/a</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white truncate">
                  {profesoraNombre}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate">
                  {profesoraSubtitulo}
                </p>
              </Card>

              {/* KPI 3: Cuota */}
              <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cuota</span>
                <div className="mt-1">
                  <BadgeSituacionCuota situacion={cuotaSituacion} />
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {cuotaSubtitulo}
                </p>
              </Card>

              {/* KPI 4: Alta */}
              <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alta</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {altaFecha}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {altaAntiguedad}
                </p>
              </Card>
            </section>

            {/* Pestañas horizontales con subrayado fucsia activo */}
            <div
              className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none"
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
                    "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors focus-visible:outline-none",
                    seccion === item.id
                      ? "border-primary text-slate-900 dark:text-white"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  <span>{item.etiqueta}</span>
                </button>
              ))}
            </div>

            {/* Panel de Contenido de la Ficha */}
            <section
              id="panel-ficha-alumno"
              role="tabpanel"
              aria-labelledby={`tab-${seccion}`}
              tabIndex={0}
              aria-label={secciones.find((item) => item.id === seccion)?.etiqueta}
              className="space-y-4"
            >
              {seccion === "datos" && (
                <div className="space-y-4">
                  {/* Tutor si es menor de edad */}
                  {esMenor && alumno.tutor && (
                    <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Tutor responsable
                      </h2>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DatoFicha etiqueta="Nombre" valor={`${alumno.tutor.nombre} ${alumno.tutor.apellido}`} />
                        <DatoFicha etiqueta="DNI" valor={formatearDni(alumno.tutor.dni)} />
                        <DatoFicha etiqueta="Teléfono" valor={alumno.tutor.telefono} />
                        <DatoFicha etiqueta="Email" valor={alumno.tutor.email} />
                      </div>
                    </Card>
                  )}

                  {/* Fila superior: Datos personales & Contacto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Datos personales */}
                    <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Datos personales
                      </h2>
                      <div className="mt-4 space-y-3.5">
                        <FilaDato etiqueta="DNI" valor={formatearDni(alumno.usuario.dni)} />
                        <FilaDato etiqueta="Nacimiento" valor={formatearFechaCorta(alumno.usuario.fecha_nacimiento)} />
                        <FilaDato
                          etiqueta="Edad"
                          valor={alumno.usuario.fecha_nacimiento ? `${calcularEdad(alumno.usuario.fecha_nacimiento)} años` : "-"}
                        />
                        <FilaDato etiqueta="Dirección" valor={alumno.usuario.direccion || "Sin dirección"} />
                      </div>
                    </Card>

                    {/* Contacto */}
                    <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Contacto
                      </h2>
                      <div className="mt-4 space-y-3.5">
                        <FilaDato
                          etiqueta="Teléfono"
                          valor={alumno.usuario.telefono || "Sin teléfono"}
                          destacado
                          href={alumno.usuario.telefono ? enlaceTelefono(alumno.usuario.telefono) : undefined}
                        />
                        <FilaDato
                          etiqueta="Email"
                          valor={alumno.usuario.email || "Sin email"}
                          destacado
                          href={alumno.usuario.email ? `mailto:${alumno.usuario.email}` : undefined}
                        />
                        <FilaDato etiqueta="Emergencia" valor={alumno.cont_emerg_nombre || "Sin contacto"} />
                        <FilaDato
                          etiqueta="Tel. emergencia"
                          valor={alumno.cont_emerg_telefono || "Sin teléfono"}
                          destacado
                          href={alumno.cont_emerg_telefono ? enlaceTelefono(alumno.cont_emerg_telefono) : undefined}
                        />
                      </div>
                    </Card>
                  </div>

                  {/* Fila inferior: Salud */}
                  <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Salud
                    </h2>
                    <div className="mt-4 space-y-3.5">
                      <FilaDato
                        etiqueta="Apto médico"
                        valor={
                          alumno.apto_medico
                            ? `Presentado el ${formatearFechaCorta(alumno.fecha_apto_medico)}`
                            : "Sin presentar"
                        }
                      />
                      <FilaDato
                        etiqueta="Observaciones"
                        valor={alumno.observaciones || "Sin observaciones"}
                      />
                    </div>
                  </Card>
                </div>
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
                <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Historial de asistencia
                  </h2>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    El historial de asistencia todavía no está disponible.
                  </p>
                </Card>
              )}

              {seccion === "progreso" && (
                <RutinaYProgreso idAlumno={alumno.id_alumno} nombreAlumno={nombreCompleto} admiteCargas={alumno.estado !== "BAJA"} />
              )}
            </section>

            {/* Modal de Cambio de Plan */}
            {cambiandoPlan && alumno.inscripcion && (
              <ModalCambiarPlan
                nombre={nombreCompleto}
                inscripcion={alumno.inscripcion}
                onClose={() => setCambiandoPlan(false)}
              />
            )}

            {/* Modal de Cobro */}
            {modalCobroAbierto && alumno.inscripcion && (
              <ModalRegistrarCobro
                abierto={modalCobroAbierto}
                onClose={() => setModalCobroAbierto(false)}
                alumno={{
                  id_alumno: alumno.id_alumno,
                  nombre: alumno.usuario.nombre,
                  apellido: alumno.usuario.apellido,
                  dni: alumno.usuario.dni,
                }}
                inscripcion={{
                  id_inscripcion: alumno.inscripcion.id_inscripcion,
                  id_plan: alumno.inscripcion.plan.id_plan,
                  nombre_plan: alumno.inscripcion.plan.nombre,
                  precio_vigente: alumno.inscripcion.plan.precio,
                  situacion_cuota: alumno.inscripcion.situacion_cuota,
                }}
                plan={{
                  id: String(alumno.inscripcion.plan.id_plan),
                  nombre: alumno.inscripcion.plan.nombre,
                }}
                onExito={() => {
                  setModalCobroAbierto(false);
                  void consulta.refetch();
                }}
                onTransferenciaInformada={() => {
                  setModalCobroAbierto(false);
                  toast.info("Transferencia informada.");
                  void consulta.refetch();
                }}
              />
            )}
          </div>
        )}
      </main>
    </OwnerLayout>
  );
}

function FilaDato({
  etiqueta,
  valor,
  destacado = false,
  href,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
        {etiqueta}
      </span>
      {href ? (
        <a
          href={href}
          className={cn(
            "font-semibold truncate hover:underline text-right",
            destacado ? "text-primary dark:text-pink-300" : "text-slate-800 dark:text-slate-200"
          )}
        >
          {valor}
        </a>
      ) : (
        <span
          className={cn(
            "font-semibold text-right truncate",
            destacado ? "text-primary dark:text-pink-300" : "text-slate-800 dark:text-slate-200"
          )}
        >
          {valor}
        </span>
      )}
    </div>
  );
}

function DatoFicha({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {valor || "Sin información"}
      </dd>
    </div>
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
    <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <CalendarDays aria-hidden="true" className="size-5 text-primary" />
          Plan y horarios
        </h2>
        {puedeCambiar && inscripcion && (
          <Button type="button" variant="outline" onClick={onCambiar} className="min-h-[40px] rounded-xl font-bold sm:w-auto">
            <CalendarClock aria-hidden="true" className="mr-2 size-4" />
            Cambiar plan u horarios
          </Button>
        )}
      </div>
      {inscripcion ? (
        <DetalleInscripcion inscripcion={inscripcion} />
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
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
        <DatoFicha etiqueta="Plan asignado" valor={inscripcion.plan.nombre} />
        <DatoFicha etiqueta="Precio al inscribirse" valor={formatearPrecio(inscripcion.plan.precio)} />
        <DatoFicha etiqueta="Profesor/a a cargo" valor={inscripcion.profesora} />
        <DatoFicha etiqueta="Estado de inscripción" valor={textoEstado(inscripcion.estado)} />
        <DatoFicha etiqueta="Inicio" valor={fechaLegible(inscripcion.fecha_inicio)} />
      </div>
      {inscripcion.situacion_cuota && <CuotaDeInscripcion situacion={inscripcion.situacion_cuota} />}
      {inscripcion.reserva && <AvisoReserva reserva={inscripcion.reserva} />}
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Horarios</h3>
        {inscripcion.horarios.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {inscripcion.horarios.map((horario) => (
              <li key={horario.id_horario} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {horario.actividad} · {diaSemana(horario.dia_semana)}
                </p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {horario.hora_inicio}–{horario.hora_fin} · {horario.profesora}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No tiene horarios asignados.</p>
        )}
      </div>
    </>
  );
}

function CuotaDeInscripcion({ situacion }: { situacion: NonNullable<InscripcionDeAlumno["situacion_cuota"]> }) {
  const detalles = [
    detalleVencimiento(situacion),
    situacion.puede_asistir ? null : "No puede asistir a clases hasta que pague.",
    situacion.tiene_pago_pendiente ? "Tiene una transferencia informada sin revisar." : null,
  ].filter((detalle): detalle is string => detalle !== null);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cuota</h3>
        <BadgeSituacionCuota situacion={situacion} />
      </div>
      {detalles.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          {detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AvisoReserva({ reserva }: { reserva: NonNullable<InscripcionDeAlumno["reserva"]> }) {
  const { hasRole } = usePermissions();
  return (
    <p
      className={cn(
        "mt-4 rounded-xl border p-3 text-xs font-medium",
        reserva.vencida
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      {reserva.vencida
        ? `La reserva venció el ${fechaLegible(reserva.vence)}: el lugar ya no está guardado.`
        : `Lugar guardado hasta el ${fechaLegible(reserva.vence)}.`}{" "}
      {hasRole("PROPIETARIA") ? (
        <>
          El alta se confirma al registrar el primer pago, desde{" "}
          <Link to="/app/pagos" className="font-bold underline underline-offset-2">
            Cobros y Cuotas
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
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600 bg-card">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl",
          error
            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        {error ? (
          <Mail aria-hidden="true" className="size-6" />
        ) : (
          <UserRound aria-hidden="true" className="size-6" />
        )}
      </span>
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{titulo}</h1>
      <p
        role={error ? "alert" : undefined}
        className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400"
      >
        {descripcion}
      </p>
      {onReintentar && (
        <Button type="button" onClick={onReintentar} className="min-h-[40px] rounded-xl">
          Reintentar
        </Button>
      )}
      <Button asChild variant="outline" className="min-h-[40px] rounded-xl">
        <Link to="/app/alumnos/listado">Volver al listado</Link>
      </Button>
    </Card>
  );
}
