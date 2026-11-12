import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  MoreHorizontal,
  PenSquare,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { AppleMailIcon } from "@/components/icons/apple-mail-icon";
import { ApplePhoneIcon } from "@/components/icons/apple-phone-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { AvatarFicha, FilaDato, PestanasFicha, TarjetaResumen } from "@/components/ficha/piezas-ficha";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { AlumnoEdicionForm } from "@/features/alumnos/components/alumno-edicion-form";
import { ModalBajaAlumno } from "@/features/alumnos/components/modal-baja-alumno";
import { ModalCambiarPlan } from "@/features/alumnos/components/modal-cambiar-plan";
import { ModalReactivarAlumno } from "@/features/alumnos/components/modal-reactivar-alumno";
import { esAlumnoNoEncontrado, useAlumno, useDarDeBajaAlumno } from "@/features/alumnos/hooks/use-alumnos";
import { useInsignias } from "@/features/portal-alumno/hooks/use-insignias";
import { ListaInsignias } from "@/components/insignias/insignia-medalla";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { generarEnlaceWhatsApp } from "@/features/inactivos/utils/formato-inactivos";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { calcularEdad, type AlumnoDetalle, type InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { diaSemana } from "@/features/alumnos/utils/fecha";
import { detalleVencimiento, deudaAlIrse } from "@/features/alumnos/utils/situacion-cuota";
import {
  enlaceTelefono,
  formatearDni,
  formatearFecha,
  tiempoDesdeFecha,
} from "@/features/alumnos/utils/formato-ficha";
import { HistorialCobrosAlumno } from "@/features/cobros/components/historial-cobros-alumno";
import { HistorialAsistenciaAlumno } from "@/features/alumnos/components/historial-asistencia-alumno";
import { HistorialPlanesAlumno } from "@/features/alumnos/components/historial-planes-alumno";
import { ModalRegistrarCobro } from "@/features/cobros/components/modal-registrar-cobro";
import { RutinaYProgreso } from "@/features/rutinas/components/rutina-y-progreso";

type SeccionFicha = "datos" | "plan" | "progreso" | "cobros" | "asistencia";

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

/** Ficha del alumno: la misma para la propietaria y la profesora; los permisos deciden qué puede editar cada una. */
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

  const [modalPlanHorariosAbierto, setModalPlanHorariosAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const [modalBajaAbierto, setModalBajaAbierto] = useState(false);
  const [modalReactivarAbierto, setModalReactivarAbierto] = useState(false);
  const [seccion, setSeccion] = useState<SeccionFicha>("datos");

  const darDeBaja = useDarDeBajaAlumno(idValido ? idAlumno : 0);

  const alumno = consulta.data;
  const nombreCompleto = alumno ? `${alumno.usuario.nombre} ${alumno.usuario.apellido}` : "Ficha del alumno";
  const esMenor = alumno?.usuario?.fecha_nacimiento
    ? (calcularEdad(alumno.usuario.fecha_nacimiento) ?? Infinity) < 18
    : false;

  const secciones: { id: SeccionFicha; etiqueta: string }[] = [
    { id: "datos", etiqueta: "Datos" },
    { id: "plan", etiqueta: "Plan" },
    { id: "progreso", etiqueta: "Rutina y progreso" },
    ...(puedeVerCobros ? [{ id: "cobros" as const, etiqueta: "Cobros" }] : []),
    { id: "asistencia", etiqueta: "Asistencia" },
  ];

  function terminarEdicion() {
    setEditando(false);
    toast.success("Los datos del alumno se actualizaron.");
    void consulta.refetch();
  }

  // Información calculada para los 4 KPIs superiores
  const planNombre = alumno?.inscripcion?.plan.nombre ?? "Sin plan";
  const cantClases = alumno?.inscripcion?.horarios?.length ?? alumno?.inscripcion?.plan.clases_por_semana ?? null;
  const planSubtitulo =
    alumno?.inscripcion?.plan.tipo === "CLASE_SUELTA"
      ? "Clase suelta"
      : cantClases !== null
        ? `${cantClases} ${cantClases === 1 ? "clase" : "clases"} por semana`
        : "Sin horario asignado";

  const profesoraNombre = alumno?.inscripcion?.profesora ?? "Sin asignar";
  const primeraActividad = alumno?.inscripcion?.horarios[0]?.actividad ?? "Entrenamiento";
  const diasHorarios = alumno?.inscripcion?.horarios.length
    ? alumno.inscripcion.horarios.map((h) => diaSemana(h.dia_semana).slice(0, 3)).join(", ")
    : "A coordinar";
  const profesoraSubtitulo = `${primeraActividad} · ${diasHorarios}`;

  const cuotaSituacion = alumno?.inscripcion?.situacion_cuota ?? null;
  const fechaVencCorta = cuotaSituacion?.fecha_vencimiento
    ? (() => {
        const solo = cuotaSituacion.fecha_vencimiento.slice(0, 10);
        const partes = solo.split("-");
        const dia = partes[2];
        const mes = partes[1];
        return dia && mes ? `${dia}/${mes}` : null;
      })()
    : null;
  const cuotaSubtitulo = cuotaSituacion
    ? (fechaVencCorta
        ? (cuotaSituacion.estado === "VENCIDA" ? `Venció el ${fechaVencCorta}` : `Vence el ${fechaVencCorta}`)
        : detalleVencimiento(cuotaSituacion) ?? "Sin vencimiento")
    : "Sin plan activo";

  const estadoCuota = cuotaSituacion?.estado;
  const configCuota: Record<string, { texto: string; colorTexto: string; dot: string }> = {
    AL_DIA: { texto: "Al día", colorTexto: "text-emerald-800 dark:text-emerald-400", dot: "bg-emerald-500" },
    POR_VENCER: { texto: "Por vencer", colorTexto: "text-amber-800 dark:text-amber-400", dot: "bg-amber-500" },
    VENCIDA: { texto: "Vencida", colorTexto: "text-rose-800 dark:text-rose-400", dot: "bg-rose-500" },
    CLASE_SUELTA_VIGENTE: { texto: "Vigente", colorTexto: "text-emerald-800 dark:text-emerald-400", dot: "bg-emerald-500" },
    CLASE_SUELTA_VENCIDA: { texto: "Vencida", colorTexto: "text-rose-800 dark:text-rose-400", dot: "bg-rose-500" },
    PENDIENTE_DE_PAGO: { texto: "Sin cuota", colorTexto: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
  };
  const cuotaVisual = estadoCuota && configCuota[estadoCuota] ? configCuota[estadoCuota] : configCuota.PENDIENTE_DE_PAGO;

  const altaFecha = alumno?.fecha_alta ? formatearFechaCorta(alumno.fecha_alta) : "-";
  const altaAntiguedad = alumno?.fecha_alta ? tiempoDesdeFecha(alumno.fecha_alta) : "";

  const enlaceWa = alumno?.usuario.telefono ? generarEnlaceWhatsApp(alumno.usuario.telefono) : null;
  const enlaceWaTutor = alumno?.tutor?.telefono ? generarEnlaceWhatsApp(alumno.tutor.telefono) : null;

  const consultaInsignias = useInsignias(idValido ? idAlumno : undefined);
  // Como en el diseño: bajo el nombre van solo las insignias que ya obtuvo.
  const insigniasObtenidas = consultaInsignias.data?.insignias.filter((insignia) => insignia.obtenida) ?? [];
  const esBaja = alumno?.estado === "BAJA";

  return (
    <OwnerLayout submiga={alumno ? nombreCompleto : undefined} tituloMovil="Ficha del alumno" volverA="/app/alumnos/listado">
      <div className="w-full min-w-0 space-y-6 pb-10">

        {!idValido ? (
          <EstadoFicha
            titulo="No encontramos ese alumno"
            descripcion="Revisá el enlace o volvé al listado para elegir una ficha."
            error={false}
          />
        ) : consulta.isPending ? (
          <div aria-busy="true" aria-label="Cargando ficha" className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
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
          <div className="@container space-y-6">
            {/* @container: se adapta al ancho del contenido y no al de la pantalla, que con el sidebar abierto es bastante menos. */}
            {/* Header del Alumno: Avatar con dot + Nombre + Mini badges + Botones */}
            <header className="flex flex-col @4xl:flex-row @4xl:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <AvatarFicha iniciales={iniciales(alumno.usuario.nombre, alumno.usuario.apellido)} activo={!esBaja} />
                <div className="min-w-0 space-y-1.5">
                  <h1 className="text-2xl @xl:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {nombreCompleto}
                  </h1>
                  <ListaInsignias insignias={insigniasObtenidas} />
                </div>
              </div>

              {/* Botones de acción principales */}
              {/* En una sola fila: en celular los dos botones se reparten el ancho y "…" queda a la derecha. */}
              <div className="flex items-center gap-2 @3xl:gap-2.5">
                {puedeEditar && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditando(true)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs @xl:px-4 @xl:text-sm @3xl:flex-none font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <PenSquare aria-hidden="true" className="mr-2 hidden size-4 text-slate-600 @xs:block dark:text-slate-300" />
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
                    className="h-10 min-w-0 flex-1 rounded-xl bg-primary px-3 text-xs @xl:px-4 @xl:text-sm @3xl:flex-none font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-dark transition-all"
                  >
                    <CreditCard aria-hidden="true" className="mr-2 hidden size-4 @xs:block" />
                    Registrar cobro
                  </Button>
                )}

                {/* Acciones visibles directamente en desktop */}
                {puedeEditarTodosLosDatos && alumno.inscripcion && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalPlanHorariosAbierto(true)}
                    className="hidden @3xl:inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs @xl:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ArrowLeftRight aria-hidden="true" className="size-4 text-slate-600 dark:text-slate-300" />
                    <span>Cambiar plan y horarios</span>
                  </Button>
                )}

                {puedeEditarTodosLosDatos && (
                  esBaja ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalReactivarAbierto(true)}
                      className="hidden @3xl:inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-xs @xl:text-sm font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400"
                    >
                      <UserPlus aria-hidden="true" className="size-4" />
                      <span>Dar de alta</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        darDeBaja.reset();
                        setModalBajaAbierto(true);
                      }}
                      className="hidden @3xl:inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-xs @xl:text-sm font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <UserMinus aria-hidden="true" className="size-4" />
                      <span>Dar de baja</span>
                    </Button>
                  )
                )}

                {/* Dropdown / Botón de más acciones solo para responsive mobile (si hay acciones para mostrar) */}
                {puedeEditarTodosLosDatos && (
                <div className="relative shrink-0 @3xl:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMenuAccionesAbierto(!menuAccionesAbierto)}
                    className="size-10 rounded-xl border border-slate-200 bg-white p-0 text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Más acciones"
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </Button>

                  {menuAccionesAbierto && (
                    <div
                      className="absolute right-0 z-20 mt-1.5 w-max min-w-48 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800"
                      onClick={() => setMenuAccionesAbierto(false)}
                    >
                      {puedeEditarTodosLosDatos && alumno.inscripcion && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuAccionesAbierto(false);
                            setModalPlanHorariosAbierto(true);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <ArrowLeftRight aria-hidden="true" className="size-4 text-slate-700 dark:text-slate-300" />
                          <span>Cambiar plan y horarios</span>
                        </button>
                      )}

                      {puedeEditarTodosLosDatos && (
                        <>
                          {alumno.inscripcion && <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />}
                          {esBaja ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAccionesAbierto(false);
                                setModalReactivarAbierto(true);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
                            >
                              <UserPlus aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Dar de alta</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAccionesAbierto(false);
                                darDeBaja.reset();
                                setModalBajaAbierto(true);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <UserMinus aria-hidden="true" className="size-4 text-rose-600 dark:text-rose-400" />
                              <span>Dar de baja</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            </header>

            {/* 4 Tarjetas de Resumen / KPIs */}
            <section aria-label="Resumen del alumno" className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4">
              <TarjetaResumen etiqueta="Plan" valor={planNombre} detalle={planSubtitulo} />
              <TarjetaResumen etiqueta="Profesora" valor={profesoraNombre} detalle={profesoraSubtitulo} />
              <TarjetaResumen
                etiqueta="Cuota"
                valor={
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", cuotaVisual.dot)} />
                    <span className={cuotaVisual.colorTexto}>{cuotaVisual.texto}</span>
                  </span>
                }
                detalle={cuotaSubtitulo}
              />
              <TarjetaResumen etiqueta="Alta" valor={altaFecha} detalle={altaAntiguedad} />
            </section>

            <PestanasFicha secciones={secciones} actual={seccion} onCambiar={setSeccion} idPanel="panel-ficha-alumno" />

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
                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Tutor responsable
                        </h2>
                        <div className="flex items-center gap-1.5">
                          {alumno.tutor.telefono && enlaceWaTutor && (
                            <a
                              href={enlaceWaTutor}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Abrir WhatsApp al tutor"
                              title="Abrir WhatsApp"
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <WhatsAppIcon className="size-5 shrink-0" />
                            </a>
                          )}
                          {alumno.tutor.telefono && (
                            <a
                              href={enlaceTelefono(alumno.tutor.telefono)}
                              aria-label="Llamar al tutor"
                              title={`Llamar a ${alumno.tutor.telefono}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <ApplePhoneIcon className="size-5 shrink-0" />
                            </a>
                          )}
                          {alumno.tutor.email && (
                            <a
                              href={`mailto:${alumno.tutor.email}`}
                              aria-label="Enviar email al tutor"
                              title={`Enviar correo a ${alumno.tutor.email}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <AppleMailIcon className="size-5 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        <FilaDato etiqueta="Nombre" valor={`${alumno.tutor.nombre} ${alumno.tutor.apellido}`} />
                        <FilaDato etiqueta="DNI" valor={formatearDni(alumno.tutor.dni)} />
                        <FilaDato etiqueta="Teléfono" valor={alumno.tutor.telefono || "Sin teléfono"} />
                        <FilaDato etiqueta="Email" valor={alumno.tutor.email || "Sin email"} />
                      </div>
                    </Card>
                  )}

                  {/* Grid de 3 columnas en pantallas grandes (separacion-datos.png) */}
                  <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-4">
                    {/* Datos personales */}
                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                        Datos personales
                      </h2>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Contacto
                        </h2>
                        <div className="flex items-center gap-1.5">
                          {alumno.usuario.telefono && enlaceWa && (
                            <a
                              href={enlaceWa}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir WhatsApp a ${nombreCompleto}`}
                              title="Abrir WhatsApp"
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <WhatsAppIcon className="size-5 shrink-0" />
                            </a>
                          )}
                          {alumno.usuario.telefono && (
                            <a
                              href={enlaceTelefono(alumno.usuario.telefono)}
                              aria-label={`Llamar a ${nombreCompleto}`}
                              title={`Llamar a ${alumno.usuario.telefono}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <ApplePhoneIcon className="size-5 shrink-0" />
                            </a>
                          )}
                          {alumno.usuario.email && (
                            <a
                              href={`mailto:${alumno.usuario.email}`}
                              aria-label={`Enviar email a ${nombreCompleto}`}
                              title={`Enviar correo a ${alumno.usuario.email}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <AppleMailIcon className="size-5 shrink-0" />
                            </a>
                          )}
                          {alumno.cont_emerg_telefono && (
                            <a
                              href={enlaceTelefono(alumno.cont_emerg_telefono)}
                              aria-label={`Llamar a emergencia: ${alumno.cont_emerg_nombre || "Contacto de emergencia"}`}
                              title={`Llamar a emergencia (${alumno.cont_emerg_nombre || "Contacto"}): ${alumno.cont_emerg_telefono}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <ApplePhoneIcon rojo className="size-5 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        <FilaDato etiqueta="Teléfono" valor={alumno.usuario.telefono || "Sin teléfono"} />
                        <FilaDato etiqueta="Email" valor={alumno.usuario.email || "Sin email"} />
                        <FilaDato etiqueta="Emergencia" valor={alumno.cont_emerg_nombre || "Sin contacto"} />
                        <FilaDato etiqueta="Tel. emergencia" valor={alumno.cont_emerg_telefono || "Sin teléfono"} />
                      </div>
                    </Card>

                    {/* Salud */}
                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                        Salud
                      </h2>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                </div>
              )}

              {seccion === "plan" && (
                <PlanYHorarios
                  alumno={alumno}
                  cuotaVisual={cuotaVisual}
                  planNombre={planNombre}
                  planSubtitulo={planSubtitulo}
                  profesoraNombre={profesoraNombre}
                />
              )}

              {seccion === "cobros" && puedeVerCobros && (
                <HistorialCobrosAlumno alumno={alumno} />
              )}

              {seccion === "asistencia" && (
                <HistorialAsistenciaAlumno idAlumno={alumno.id_alumno} />
              )}

              {seccion === "progreso" && (
                <RutinaYProgreso idAlumno={alumno.id_alumno} nombreAlumno={nombreCompleto} admiteCargas={alumno.estado !== "BAJA"} />
              )}
            </section>

            {/* Modal de Cambio de Plan y Horarios */}
            {modalPlanHorariosAbierto && alumno.inscripcion && (
              <ModalCambiarPlan
                nombre={nombreCompleto}
                inscripcion={alumno.inscripcion}
                tienePlanVigente={Boolean(alumno.estado === "ACTIVO" && alumno.inscripcion && alumno.inscripcion.estado !== "BAJA")}
                onClose={() => setModalPlanHorariosAbierto(false)}
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
            {/* Modal Baja Alumno */}
            {modalBajaAbierto && (
              <ModalBajaAlumno
                nombre={nombreCompleto}
                dandoDeBaja={darDeBaja.isPending}
                errorBaja={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja al alumno.") : null}
                onClose={() => setModalBajaAbierto(false)}
                onConfirm={(motivo, detalle) => {
                  darDeBaja
                    .mutateAsync({ motivo, detalle })
                    .then(() => {
                      setModalBajaAbierto(false);
                      toast.info(`${nombreCompleto} quedó dado de baja`);
                      void consulta.refetch();
                    })
                    .catch(() => {});
                }}
              />
            )}

            {/* Modal Reactivar Alumno */}
            {modalReactivarAbierto && (
              <ModalReactivarAlumno
                idAlumno={alumno.id_alumno}
                nombre={nombreCompleto}
                deuda={deudaAlIrse(alumno.inscripciones_de_la_baja)}
                onClose={() => {
                  setModalReactivarAbierto(false);
                  void consulta.refetch();
                }}
              />
            )}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}

function PlanYHorarios({
  alumno,
  cuotaVisual,
  planNombre,
  planSubtitulo,
  profesoraNombre,
}: {
  alumno: AlumnoDetalle;
  cuotaVisual: { dot: string; colorTexto: string; texto: string };
  planNombre: string;
  planSubtitulo: string;
  profesoraNombre: string;
}) {
  const { inscripcion } = alumno;

  if (!inscripcion) {
    return (
      <Card className="rounded-2xl border-slate-200/80 bg-white p-8 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Sin plan vigente</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {alumno.estado === "BAJA"
            ? "Está dado de baja: no tiene un plan vigente. Al reactivarlo se elige el plan y los horarios."
            : "No tiene una inscripción vigente."}
        </p>
      </Card>
    );
  }

  const tiempoPlan = tiempoDesdeFecha(inscripcion.fecha_inicio);
  const fechaDesdeTexto = formatearFechaCorta(inscripcion.fecha_inicio);
  const desdePlan = tiempoPlan ? `${fechaDesdeTexto} · ${tiempoPlan}` : fechaDesdeTexto;

  const cuotaSituacion = inscripcion.situacion_cuota ?? null;
  const venceTexto = cuotaSituacion?.fecha_vencimiento
    ? cuotaSituacion.dias_restantes !== null && cuotaSituacion.dias_restantes !== undefined
      ? `${formatearFechaCorta(cuotaSituacion.fecha_vencimiento)} (${
          cuotaSituacion.dias_restantes > 0
            ? `en ${cuotaSituacion.dias_restantes} días`
            : cuotaSituacion.dias_restantes === 0
              ? "hoy"
              : `hace ${-cuotaSituacion.dias_restantes} días`
        })`
      : formatearFechaCorta(cuotaSituacion.fecha_vencimiento)
    : "Sin vencimiento";

  return (
    <div className="space-y-6">
      {inscripcion.reserva && <AvisoReserva reserva={inscripcion.reserva} />}

      <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-4">
        {/* Tarjeta 1: Plan vigente */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Plan vigente</h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <div className="flex items-center py-3.5 first:pt-1">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Plan
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {planNombre}
                </span>
              </div>
              <div className="flex items-center py-3.5">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Modalidad
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {planSubtitulo}
                </span>
              </div>
              <div className="flex items-center py-3.5">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Precio
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {formatearPrecio(inscripcion.plan?.precio ?? 0)} por mes
                </span>
              </div>
              <div className="flex items-center py-3.5">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Profesora
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {profesoraNombre}
                </span>
              </div>
              <div className="flex items-center py-3.5 last:pb-1">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  En este plan desde
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {desdePlan}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tarjeta 2: Cuota */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Cuota</h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <div className="flex items-center py-3.5 first:pt-1">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Estado
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2 rounded-full shrink-0", cuotaVisual.dot)} />
                  <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                    {cuotaVisual.texto}
                  </span>
                </div>
              </div>
              <div className="flex items-center py-3.5">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Vence
                </span>
                <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                  {venceTexto}
                </span>
              </div>
              <div className="flex items-center py-3.5 last:pb-1">
                <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                  Días de gracia
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  5 días
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tarjeta 3: Horarios */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Horarios</h2>
            </div>

            {inscripcion.horarios?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {inscripcion.horarios.map((horario, idx) => (
                  <div key={horario.id_horario ?? idx} className="flex items-center py-3.5 first:pt-1 last:pb-1">
                    <span className="w-32 shrink-0 @xl:w-36 text-slate-500 dark:text-slate-400 font-normal">
                      {diaSemana(horario.dia_semana)}
                    </span>
                    <span className="min-w-0 font-semibold text-slate-900 dark:text-white wrap-anywhere">
                      {horario.hora_inicio} a {horario.hora_fin} · {horario.actividad} ({horario.profesora})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No tiene horarios asignados.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Historial de planes como tabla idéntica a Alumno-Listado */}
      <HistorialPlanesAlumno alumno={alumno} />
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
          <Link to="/app/cobros/cuotas" className="font-bold underline underline-offset-2">
            Cobros
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
  if (error) {
    return (
      <EstadoErrorCarga
        titulo={titulo}
        mensaje={descripcion}
        onReintentar={onReintentar}
        accionSecundaria={
          <Button asChild variant="outline" className="min-h-[40px] rounded-lg">
            <Link to="/app/alumnos/listado">Volver al listado</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600 bg-card rounded-lg shadow-2xs">
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{titulo}</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {descripcion}
      </p>
      <Button asChild variant="outline" className="min-h-[40px] rounded-lg">
        <Link to="/app/alumnos/listado">Volver al listado</Link>
      </Button>
    </Card>
  );
}
