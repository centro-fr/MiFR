import { cn } from "@/utils/cn";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, PenSquare, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import {
  AvatarFicha,
  BotonesDeContacto,
  FilaDato,
  PestanasFicha,
  TarjetaDeDatos,
  TarjetaResumen,
} from "@/components/ficha/piezas-ficha";
import { formatearDni } from "@/features/alumnos/utils/formato-ficha";
import { Dialog } from "@/components/ui/dialog";
import {
  BotonModalPrincipal,
  BotonModalSecundario,
  ModalCabecera,
  ModalContenido,
  ModalCuerpo,
  ModalFormulario,
  ModalPie,
} from "@/components/ui/estructura-modal";
import { Input } from "@/components/ui/input";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { Label } from "@/components/ui/label";
import { diaSemana } from "@/features/alumnos/utils/fecha";
import { calcularEdad } from "@/features/alumnos/schemas/alumno";
import { ModalBajaProfesora } from "@/features/profesoras/components/modal-baja-profesora";
import {
  useActualizarDatosProfesora,
  useDarDeBajaProfesora,
  useHorariosActivos,
  useProfesoras,
  useReactivarProfesora,
  useUsuarioProfesora,
} from "@/features/profesoras/hooks/use-profesoras";
import {
  actualizarDatosProfesoraSchema,
  parsearEspecialidades,
  type ActualizarDatosProfesoraInput,
} from "@/features/profesoras/schemas/profesora";
import { CAMPO_MODAL, FILA_DE_CAMPOS_MODAL } from "@/components/ui/estilos-modal";

// Fechas DATE: viajan como medianoche UTC. Se toma el día tal cual; pasarlas a hora local las corre
// al día anterior en Argentina.
function formatearFecha(iso: string | null | undefined): string {
  const partes = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : "Sin registrar";
}

// Columnas TIME: llegan como "1970-01-01T08:00:00.000Z" (hora de reloj) o, en los mocks, como "08:00".
function formatearHora(valor: string): string {
  return valor.includes("T") ? valor.slice(11, 16) : valor.slice(0, 5);
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
  const reactivarMutation = useReactivarProfesora();

  const [editando, setEditando] = useState(false);
  const [seccion, setSeccion] = useState<"datos" | "clases">("datos");
  const [modalBajaAbierto, setModalBajaAbierto] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  // Horarios de esta profesora
  const horarios = useMemo(
    () => todosHorarios.filter((h) => h.id_profesora === idProfesora),
    [todosHorarios, idProfesora],
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

  const telefono = datosUsuario.telefono !== "Sin teléfono" ? datosUsuario.telefono : null;
  const email = datosUsuario.email !== "Sin email" ? datosUsuario.email : null;
  const BOTON_ACCION =
    "h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-xs font-semibold shadow-2xs @xl:px-4 @xl:text-sm @3xl:flex-none dark:bg-slate-800";

  return (
    <OwnerLayout submiga={nombreCompleto}>
      <div className="@container min-w-0 space-y-6">
        {/* Mismo encabezado que la ficha del alumno: avatar con el punto de estado, nombre y acciones. */}
        <header className="flex flex-col justify-between gap-4 @4xl:flex-row @4xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <AvatarFicha iniciales={iniciales(datosUsuario.nombre, datosUsuario.apellido)} activo={profesora.activa} />
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{nombreCompleto}</h1>
          </div>

          <div className="flex items-center gap-2 @3xl:gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditando(true)}
              className={cn(BOTON_ACCION, "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white")}
            >
              <PenSquare aria-hidden="true" className="mr-2 hidden size-4 @xs:block" />
              Editar datos
            </Button>
            {profesora.activa ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setErrorBaja(null);
                  setModalBajaAbierto(true);
                }}
                className={cn(BOTON_ACCION, "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800/80 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:border-rose-700 dark:hover:text-rose-300")}
              >
                <UserMinus aria-hidden="true" className="mr-2 hidden size-4 @xs:block" />
                Dar de baja
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={reactivarMutation.isPending}
                onClick={() => {
                  reactivarMutation.mutate(profesora.id, {
                    onSuccess: () => toast.success(`Profesor/a "${nombreCompleto}" reincorporado/a como vigente`),
                    onError: (err) => toast.error(mensajeDeErrorApi(err, "No se pudo reincorporar al/a la profesor/a.")),
                  });
                }}
                className={cn(BOTON_ACCION, "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/80 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-700 dark:hover:text-emerald-300")}
              >
                <UserPlus aria-hidden="true" className="mr-2 hidden size-4 @xs:block" />
                Reincorporar
              </Button>
            )}
          </div>
        </header>

        <section aria-label="Resumen del profesor/a" className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
          <TarjetaResumen
            etiqueta="Especialidad"
            valor={especialidades.length > 0 ? especialidades.join(", ") : "Sin especialidad"}
            detalle={especialidades.length > 0 ? `${especialidades.length} ${especialidades.length === 1 ? "disciplina" : "disciplinas"}` : "Asignada en el alta"}
          />
          <TarjetaResumen
            etiqueta="Clases semanales"
            valor={`${horarios.length} ${horarios.length === 1 ? "clase" : "clases"}`}
            detalle="En el cronograma activo"
          />
          <TarjetaResumen
            etiqueta="Estado"
            valor={
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", profesora.activa ? "bg-emerald-500" : "bg-rose-500")} />
                {profesora.activa ? "Activa" : "Dada de baja"}
              </span>
            }
            detalle={profesora.activa ? "Disponible para dictar" : "Fuera del cronograma"}
          />
          <TarjetaResumen etiqueta="Incorporación" valor={formatearFecha(profesora.fechaAlta)} detalle="Alta en el centro" />
        </section>

        <PestanasFicha
          secciones={[
            { id: "datos", etiqueta: "Datos" },
            { id: "clases", etiqueta: "Clases" },
          ]}
          actual={seccion}
          onCambiar={setSeccion}
          idPanel="panel-ficha-profesora"
        />

        <section id="panel-ficha-profesora" role="tabpanel" aria-labelledby={`tab-${seccion}`} tabIndex={0}>
          {seccion === "datos" ? (
            <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
              <TarjetaDeDatos titulo="Datos personales">
                <FilaDato etiqueta="DNI" valor={datosUsuario.dni ? formatearDni(datosUsuario.dni) : "Sin DNI"} />
                <FilaDato etiqueta="Nacimiento" valor={formatearFecha(datosUsuario.fechaNacimiento)} />
                <FilaDato etiqueta="Edad" valor={edadCalculada !== null ? `${edadCalculada} años` : "Sin registrar"} />
                <FilaDato etiqueta="Dirección" valor={datosUsuario.direccion || "Sin dirección"} />
              </TarjetaDeDatos>
              <TarjetaDeDatos titulo="Contacto" acciones={<BotonesDeContacto nombre={nombreCompleto} telefono={telefono} email={email} />}>
                <FilaDato etiqueta="Teléfono" valor={telefono ?? "Sin teléfono"} />
                <FilaDato etiqueta="Email" valor={email ?? "Sin email"} />
              </TarjetaDeDatos>
              <TarjetaDeDatos titulo="En el centro">
                <FilaDato etiqueta="Especialidades" valor={especialidades.length > 0 ? especialidades.join(", ") : "Sin especialidad"} />
                <FilaDato etiqueta="Rol" valor="Profesora" />
                <FilaDato etiqueta="Incorporación" valor={formatearFecha(profesora.fechaAlta)} />
              </TarjetaDeDatos>
            </div>
          ) : (
            <ClasesSemanales horariosPorDia={horariosPorDia} />
          )}
        </section>

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
      <ModalContenido ancho="xl" className="w-[96vw] sm:w-full">
        <ModalCabecera
          titulo={`Editar datos de ${datosActuales.nombre} ${datosActuales.apellido}`}
          descripcion="Modificá los datos personales y de contacto del profesor/a"
          etiquetaCerrar="Cerrar formulario"
        />
        <ModalFormulario onSubmit={handleSubmit}>
          <ModalCuerpo className="gap-4">
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

          <div className={FILA_DE_CAMPOS_MODAL}>
            <div className={CAMPO_MODAL}>
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
            <div className={CAMPO_MODAL}>
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
            <div className={CAMPO_MODAL}>
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
            <div className={CAMPO_MODAL}>
              <Label htmlFor="edit-fecha-nac" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Fecha de nacimiento <span className="text-destructive">*</span>
              </Label>
              <CampoFecha
                id="edit-fecha-nac"
                value={fechaNacimiento}
                onChange={setFechaNacimiento}
                max={fechaMaximaMayorEdad}
                min="1920-01-01"
                disabled={guardando}
                className="h-10 rounded-xl"
              />
            </div>
            <div className={cn(CAMPO_MODAL, "sm:col-span-2")}>
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
            <div className={cn(CAMPO_MODAL, "sm:col-span-2")}>
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
            <div className={cn(CAMPO_MODAL, "sm:col-span-2")}>
              <Label className="text-xs font-bold text-slate-500">
                Correo electrónico (Google)
              </Label>
              <Input
                value={datosActuales.email}
                disabled
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 opacity-70 cursor-not-allowed"
              />
            </div>
          </div>

          </ModalCuerpo>
          <ModalPie>
            <BotonModalSecundario onClick={onClose} disabled={guardando}>
              Cancelar
            </BotonModalSecundario>
            <BotonModalPrincipal type="submit" disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                "Guardar cambios"
              )}
            </BotonModalPrincipal>
          </ModalPie>
        </ModalFormulario>
      </ModalContenido>
    </Dialog>
  );
}

interface PropsClasesSemanales {
  horariosPorDia: {
    dia: number;
    nombreDia: string;
    clases: { id_horario: number; hora_inicio: string; hora_fin: string; cupo_maximo: number | null; actividad: { nombre: string } }[];
  }[];
}

/** Las clases de la semana a su cargo, día por día, como filas de datos. */
function ClasesSemanales({ horariosPorDia }: PropsClasesSemanales) {
  if (horariosPorDia.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-500 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No tiene clases asignadas. Se le asignan desde Horarios.
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {horariosPorDia.map(({ dia, nombreDia, clases }) => (
        <TarjetaDeDatos key={dia} titulo={`${nombreDia} · ${clases.length} ${clases.length === 1 ? "clase" : "clases"}`}>
          {clases.map((clase) => (
            <div key={clase.id_horario} className="flex items-center gap-3 py-3 text-sm first:pt-1 last:pb-1">
              <span className="w-24 shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                {formatearHora(clase.hora_inicio)} a {formatearHora(clase.hora_fin)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white">{clase.actividad.nombre}</span>
              {clase.cupo_maximo !== null && (
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Cupo {clase.cupo_maximo}</span>
              )}
            </div>
          ))}
        </TarjetaDeDatos>
      ))}
    </div>
  );
}
