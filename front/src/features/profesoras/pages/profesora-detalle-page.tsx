import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Loader2,
  Mail,
  PenSquare,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { diaSemana } from "@/features/alumnos/utils/fecha";
import { calcularEdad } from "@/features/alumnos/schemas/alumno";
import { ModalBajaProfesora } from "@/features/profesoras/components/modal-baja-profesora";
import {
  useActualizarDatosProfesora,
  useDarDeBajaProfesora,
  useHorariosActivos,
  useProfesoras,
  useUsuarioProfesora,
} from "@/features/profesoras/hooks/use-profesoras";
import {
  actualizarDatosProfesoraSchema,
  parsearEspecialidades,
  type ActualizarDatosProfesoraInput,
} from "@/features/profesoras/schemas/profesora";

function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatearHora(hhmm: string): string {
  return hhmm.slice(0, 5);
}

function iniciales(nombre: string, apellido: string): string {
  const n = nombre.trim().charAt(0).toUpperCase();
  const a = apellido.trim().charAt(0).toUpperCase();
  return `${n}${a}` || "PR";
}

export function ProfesoraDetallePage() {
  const { id } = useParams<{ id: string }>();
  const idProfesora = Number(id);
  const idValido = !isNaN(idProfesora) && idProfesora > 0;

  const { data: profesoras = [], isPending: cargandoProfesoras, isError, error } = useProfesoras();
  const profesora = profesoras.find((p) => p.id === idProfesora);

  const { data: usuarioDetalle, isPending: cargandoUsuario } = useUsuarioProfesora(
    profesora ? profesora.idUsuario : null,
  );

  const { data: todosHorarios = [] } = useHorariosActivos();

  const actualizarMutation = useActualizarDatosProfesora(idProfesora);
  const darDeBajaMutation = useDarDeBajaProfesora();

  const [editando, setEditando] = useState(false);
  const [modalBajaAbierto, setModalBajaAbierto] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  // Horarios de esta profesora
  const horarios = useMemo(
    () => todosHorarios.filter((h) => h.id_profesora === idProfesora),
    [todosHorarios, idProfesora],
  );
  const nombresActividades = useMemo(
    () => Array.from(new Set(horarios.map((h) => h.actividad.nombre))),
    [horarios],
  );
  const especialidades = parsearEspecialidades(profesora?.especialidad);

  // Clases agrupadas y ordenadas por día de la semana (1 = Lunes .. 7 = Domingo) y hora
  const horariosPorDia = useMemo(() => {
    const mapa = new Map<number, typeof horarios>();
    for (const h of horarios) {
      const lista = mapa.get(h.dia_semana) ?? [];
      lista.push(h);
      mapa.set(h.dia_semana, lista);
    }

    const diasOrdenados = Array.from(mapa.keys()).sort((a, b) => a - b);
    return diasOrdenados.map((dia) => {
      const lista = mapa.get(dia) ?? [];
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      return {
        dia,
        nombreDia: diaSemana(dia),
        clases: lista,
      };
    });
  }, [horarios]);

  const handleConfirmarBaja = () => {
    if (!profesora) return;
    setErrorBaja(null);
    darDeBajaMutation.mutate(profesora.id, {
      onSuccess: () => {
        setModalBajaAbierto(false);
        toast.info(`Profesor/a "${profesora.nombreCompleto}" dado/a de baja`);
      },
      onError: (err) => {
        setErrorBaja(mensajeDeErrorApi(err, "No se pudo dar de baja al/a la profesor/a."));
      },
    });
  };

  if (!idValido) {
    return (
      <OwnerLayout>
        <div className="py-8">
          <EstadoErrorCarga
            titulo="Identificador inválido"
            mensaje="El identificador de profesor/a no es válido."
            accionSecundaria={
              <Button asChild variant="outline" className="min-h-[40px] rounded-lg">
                <Link to="/app/profesoras">Volver al plantel</Link>
              </Button>
            }
          />
        </div>
      </OwnerLayout>
    );
  }

  if (cargandoProfesoras || (profesora && cargandoUsuario)) {
    return (
      <OwnerLayout>
        <div aria-busy="true" aria-label="Cargando ficha del profesor/a" className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </OwnerLayout>
    );
  }

  if (isError || !profesora) {
    return (
      <OwnerLayout>
        <div className="py-8">
          <EstadoErrorCarga
            titulo={profesora ? "Error al cargar datos" : "Profesor/a no encontrado/a"}
            mensaje={error ? mensajeDeErrorApi(error, "No se pudo obtener la información.") : "El/la profesor/a no existe o fue eliminado/a."}
            onReintentar={() => window.location.reload()}
            accionSecundaria={
              <Button asChild variant="outline" className="min-h-[40px] rounded-lg">
                <Link to="/app/profesoras">Volver al plantel</Link>
              </Button>
            }
          />
        </div>
      </OwnerLayout>
    );
  }

  const datosUsuario = {
    nombre: usuarioDetalle?.nombre ?? profesora.nombre,
    apellido: usuarioDetalle?.apellido ?? profesora.apellido,
    email: usuarioDetalle?.email ?? profesora.email ?? "Sin email",
    telefono: usuarioDetalle?.telefono ?? profesora.telefono ?? "Sin teléfono",
    dni: usuarioDetalle?.dni ?? null,
    fechaNacimiento: usuarioDetalle?.fecha_nacimiento ?? profesora.fechaNacimiento ?? null,
    direccion: usuarioDetalle?.direccion ?? null,
  };

  const nombreCompleto = `${datosUsuario.nombre} ${datosUsuario.apellido}`.trim();
  const edadCalculada = datosUsuario.fechaNacimiento ? calcularEdad(datosUsuario.fechaNacimiento) : null;

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* BOTÓN VOLVER */}
        <div>
          <Button
            asChild
            variant="outline"
            className="h-9 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Link to="/app/profesoras" aria-label="Volver al plantel de profesores">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver al plantel
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          {/* ENCABEZADO PRINCIPAL */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-2xl font-black text-primary shadow-2xs dark:bg-pink-950/60 dark:text-pink-300">
                {iniciales(datosUsuario.nombre, datosUsuario.apellido)}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                  {nombreCompleto}
                </h1>
              </div>
            </div>

            {/* ACCIONES */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditando(true)}
                className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <PenSquare aria-hidden="true" className="mr-1.5 size-4 text-slate-600 dark:text-slate-300" />
                Editar datos
              </Button>

              {profesora.activa && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setErrorBaja(null);
                    setModalBajaAbierto(true);
                  }}
                  className="h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 font-bold text-xs"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Dar de baja
                </Button>
              )}
            </div>
          </header>

          {/* 4 TARJETAS DE RESUMEN / KPIS */}
          <section aria-label="Resumen del profesor" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Especialidad */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Especialidad</span>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                {especialidades.length > 0 ? especialidades.join(", ") : "Sin especialidad"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {especialidades.length > 0
                  ? `${especialidades.length} ${especialidades.length === 1 ? "disciplina" : "disciplinas"}`
                  : "Asignada en el alta"}
              </p>
            </Card>

            {/* KPI 2: Clases semanales */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Clases semanales</span>
              <div className="mt-1 flex items-center gap-1.5 text-base sm:text-lg font-black text-primary">
                <Clock className="size-4" />
                <span>{horarios.length} {horarios.length === 1 ? "clase" : "clases"}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                En el cronograma activo
              </p>
            </Card>

            {/* KPI 3: Estado */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Estado</span>
              <p className="mt-1 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {profesora.activa ? "Activa" : "Dada de baja"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {profesora.activa ? "Disponible para dictar" : "Fuera de cronograma"}
              </p>
            </Card>

            {/* KPI 4: Incorporación */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Incorporación</span>
              <p className="mt-1 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {formatearFecha(profesora.fechaAlta)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Alta en el centro
              </p>
            </Card>
          </section>

          {/* CUADRÍCULA DE DATOS PERSONALES Y CONTACTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DATOS PERSONALES */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <User className="size-4 text-primary" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Datos personales
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">DNI</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {datosUsuario.dni || <span className="text-slate-400 italic font-normal">Sin registrar</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nacimiento</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatearFecha(datosUsuario.fechaNacimiento)}
                  </span>
                </div>
                {edadCalculada !== null && (
                  <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Edad</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {edadCalculada} años
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Dirección</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right truncate max-w-[200px]">
                    {datosUsuario.direccion || <span className="text-slate-400 italic font-normal">Sin registrar</span>}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Especialidades asignadas
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {especialidades.length > 0 ? (
                      especialidades.map((esp) => (
                        <span
                          key={esp}
                          className="inline-flex items-center gap-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 text-xs font-bold text-primary dark:text-pink-300 border border-pink-100 dark:border-pink-900/50"
                        >
                          <Dumbbell className="size-3" />
                          {esp}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin especialidad</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* CONTACTO Y ACCESO */}
            <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Phone className="size-4 text-primary" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Contacto y acceso
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Teléfono</span>
                  {datosUsuario.telefono && datosUsuario.telefono !== "Sin teléfono" ? (
                    <a
                      href={`tel:${datosUsuario.telefono.replace(/[^\d+]/g, "")}`}
                      className="font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="size-3.5" />
                      {datosUsuario.telefono}
                    </a>
                  ) : (
                    <span className="font-bold text-slate-400 italic">Sin teléfono</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Correo Google</span>
                  {datosUsuario.email && datosUsuario.email !== "Sin email" ? (
                    <a
                      href={`mailto:${datosUsuario.email}`}
                      className="font-bold text-primary hover:underline flex items-center gap-1 truncate max-w-[220px]"
                    >
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{datosUsuario.email}</span>
                    </a>
                  ) : (
                    <span className="font-bold text-slate-400 italic">Sin email</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rol asignado</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    <User className="size-3" />
                    PROFESORA
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* CLASES Y HORARIOS ASIGNADOS */}
          <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Clases semanales a su cargo
                </h2>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                <Link to="/app/horarios">Ver en Cronograma</Link>
              </Button>
            </div>

            {horarios.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No tiene clases asignadas en este momento
                </p>
                <p className="text-xs text-slate-400">
                  Podés asignarle clases desde la sección de Horarios y Cronograma.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                {horariosPorDia.map(({ dia, nombreDia, clases }) => (
                  <div key={dia} className="space-y-3">
                    <div className="flex items-center gap-2.5 pb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {nombreDia}
                      </span>
                      <span className="rounded-full bg-pink-50 dark:bg-pink-950/50 px-2 py-0.5 text-[11px] font-bold text-primary dark:text-pink-300 border border-pink-100 dark:border-pink-900/40">
                        {clases.length} {clases.length === 1 ? "clase" : "clases"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {clases.map((h) => (
                        <div
                          key={h.id_horario}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 space-y-2 hover:border-pink-200 dark:hover:border-pink-900/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {h.actividad.nombre}
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                              <Clock className="size-3 text-slate-400" />
                              {formatearHora(h.hora_inicio)} - {formatearHora(h.hora_fin)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {h.cupo_maximo ? `Cupo: ${h.cupo_maximo} alumnos` : "Cupo estándar"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* MODAL FLOTANTE CENTRADO DE EDICIÓN ("AL MEDIO") */}
        {editando && (
          <ModalEdicionProfesora
            open={editando}
            datosActuales={datosUsuario}
            guardando={actualizarMutation.isPending}
            error={actualizarMutation.isError ? mensajeDeErrorApi(actualizarMutation.error, "Error al guardar") : null}
            onClose={() => setEditando(false)}
            onGuardar={(datos) => {
              actualizarMutation.mutate(datos, {
                onSuccess: () => {
                  setEditando(false);
                  toast.success("Los datos del profesor/a fueron actualizados.");
                },
                onError: (err) => {
                  toast.error(mensajeDeErrorApi(err, "No se pudieron actualizar los datos."));
                },
              });
            }}
          />
        )}

        {/* MODAL DE CONFIRMACIÓN DE BAJA */}
        {modalBajaAbierto && (
          <ModalBajaProfesora
            profesora={profesora}
            cantidadHorarios={horarios.length}
            actividadesNombres={nombresActividades}
            dandoDeBaja={darDeBajaMutation.isPending}
            errorBaja={errorBaja}
            onClose={() => setModalBajaAbierto(false)}
            onConfirm={handleConfirmarBaja}
          />
        )}
      </div>
    </OwnerLayout>
  );
}

interface ModalEdicionProps {
  open: boolean;
  datosActuales: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    dni: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
  };
  guardando: boolean;
  error: string | null;
  onClose: () => void;
  onGuardar: (datos: ActualizarDatosProfesoraInput) => void;
}

function ModalEdicionProfesora({
  open,
  datosActuales,
  guardando,
  error,
  onClose,
  onGuardar,
}: ModalEdicionProps) {
  const [nombre, setNombre] = useState(datosActuales.nombre);
  const [apellido, setApellido] = useState(datosActuales.apellido);
  const [dni, setDni] = useState(datosActuales.dni ?? "");
  const [telefono, setTelefono] = useState(datosActuales.telefono === "Sin teléfono" ? "" : datosActuales.telefono);
  const [fechaNacimiento, setFechaNacimiento] = useState(
    datosActuales.fechaNacimiento ? datosActuales.fechaNacimiento.slice(0, 10) : "",
  );
  const [direccion, setDireccion] = useState(datosActuales.direccion ?? "");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const hoy = new Date();
  const fechaMaximaMayorEdad = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate())
    .toISOString()
    .split("T")[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const res = actualizarDatosProfesoraSchema.safeParse({
      nombre,
      apellido,
      dni: dni.trim() || undefined,
      telefono,
      fecha_nacimiento: fechaNacimiento,
      direccion: direccion.trim() || undefined,
    });

    if (!res.success) {
      setErrorValidacion(res.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    onGuardar(res.data);
  };

  return (
    <Dialog open={open} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent
        hideClose
        className="w-[96vw] sm:w-full max-w-lg md:max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-3 text-left">
          <div className="space-y-1">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Editar datos de {datosActuales.nombre} {datosActuales.apellido}
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Modificá los datos personales y de contacto del profesor/a
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          {error && (
            <Alert className="rounded-xl border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          {errorValidacion && (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertDescription className="text-xs font-semibold">{errorValidacion}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nombre" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-apellido" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dni" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                DNI
              </Label>
              <Input
                id="edit-dni"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej: 35123456"
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fecha-nac" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Fecha de nacimiento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-fecha-nac"
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                max={fechaMaximaMayorEdad}
                min="1920-01-01"
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-telefono" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Teléfono de contacto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 11 4455-6677"
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-direccion" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Dirección
              </Label>
              <Input
                id="edit-direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234"
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-500">
                Correo electrónico (Google)
              </Label>
              <Input
                value={datosActuales.email}
                disabled
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 opacity-70 cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">
                El correo electrónico no se puede editar desde acá porque es la cuenta vinculada para el inicio de sesión.
              </p>
            </div>
          </div>

          {/* Footer con botones Cancelar y Guardar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={guardando}
              className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Guardando cambios...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
