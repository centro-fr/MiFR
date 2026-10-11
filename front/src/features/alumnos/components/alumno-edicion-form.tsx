import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActualizarAlumno } from "@/features/alumnos/hooks/use-alumnos";
import {
  actualizarAlumnoSchema,
  esMenorDeEdad,
  obtenerLimitesFechaNacimiento,
  type ActualizarAlumnoInput,
  type AlumnoDetalle,
} from "@/features/alumnos/schemas/alumno";
import { mensajeDeErrorApi } from "@/api/errores";

function valorPersona(valor: string | null): string {
  return valor ?? "";
}

interface AlumnoEdicionFormProps {
  alumno: AlumnoDetalle;
  esPropietaria: boolean;
  onCancelar: () => void;
  onGuardado: () => void;
}

export function AlumnoEdicionForm({ alumno, esPropietaria, onCancelar, onGuardado }: AlumnoEdicionFormProps) {
  const actualizacion = useActualizarAlumno(alumno.id_alumno);
  const [confirmarCambioPlan, setConfirmarCambioPlan] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState<ActualizarAlumnoInput | null>(null);
  const planActual = alumno.inscripcion?.plan?.id_plan ?? null;
  const formulario = useForm<ActualizarAlumnoInput>({
    resolver: zodResolver(actualizarAlumnoSchema),
    mode: "onBlur",
    defaultValues: {
      usuario: {
        nombre: alumno.usuario.nombre,
        apellido: alumno.usuario.apellido,
        dni: valorPersona(alumno.usuario.dni),
        fecha_nacimiento: alumno.usuario.fecha_nacimiento,
        telefono: valorPersona(alumno.usuario.telefono),
        email: valorPersona(alumno.usuario.email),
      },
      tutor: esMenorDeEdad(alumno.usuario.fecha_nacimiento) && alumno.tutor
        ? {
            nombre: alumno.tutor.nombre,
            apellido: alumno.tutor.apellido,
            dni: valorPersona(alumno.tutor.dni),
            telefono: valorPersona(alumno.tutor.telefono),
            email: valorPersona(alumno.tutor.email),
          }
        : null,
      cont_emerg_nombre: valorPersona(alumno.cont_emerg_nombre),
      cont_emerg_telefono: valorPersona(alumno.cont_emerg_telefono),
      apto_medico: alumno.apto_medico,
      fecha_apto_medico: alumno.fecha_apto_medico,
      observaciones: valorPersona(alumno.observaciones),
      id_plan: planActual,
      id_horarios: alumno.inscripcion?.horarios.map((horario) => horario.id_horario) ?? [],
    },
  });
  const fechaNacimiento = useWatch({
    control: formulario.control,
    name: "usuario.fecha_nacimiento",
  });
  const aptoMedico = useWatch({ control: formulario.control, name: "apto_medico" });
  const horariosSeleccionados = useWatch({ control: formulario.control, name: "id_horarios" }) ?? [];
  const requiereTutor = esMenorDeEdad(fechaNacimiento ?? "");
  const limitesFechaNacimiento = obtenerLimitesFechaNacimiento();

  function guardar(cambios: ActualizarAlumnoInput) {
    if (esPropietaria && cambios.id_plan !== planActual) {
      setCambiosPendientes(cambios);
      setConfirmarCambioPlan(true);
      return;
    }
    enviar(cambios);
  }

  function enviar(cambios: ActualizarAlumnoInput) {
    actualizacion.mutate(cambios, {
      onSuccess: onGuardado,
    });
  }

  function cambiarFechaNacimiento(valor: string) {
    const tutorActual = formulario.getValues("tutor");
    const tutorSiguiente = esMenorDeEdad(valor)
      ? tutorActual ?? {
          nombre: "",
          apellido: "",
          dni: "",
          telefono: "",
          email: "",
        }
      : null;
    formulario.setValue("tutor", tutorSiguiente, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function alternarHorario(idHorario: number, marcado: boolean) {
    const siguientes = marcado
      ? [...horariosSeleccionados, idHorario]
      : horariosSeleccionados.filter((id) => id !== idHorario);
    formulario.setValue("id_horarios", siguientes, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const errorDeValidacion =
    formulario.formState.errors.tutor?.message ??
    formulario.formState.errors.tutor?.nombre?.message ??
    formulario.formState.errors.tutor?.apellido?.message ??
    formulario.formState.errors.usuario?.nombre?.message ??
    formulario.formState.errors.usuario?.apellido?.message ??
    formulario.formState.errors.usuario?.dni?.message ??
    formulario.formState.errors.usuario?.telefono?.message ??
    formulario.formState.errors.usuario?.email?.message ??
    formulario.formState.errors.usuario?.fecha_nacimiento?.message ??
    formulario.formState.errors.cont_emerg_nombre?.message ??
    formulario.formState.errors.cont_emerg_telefono?.message ??
    formulario.formState.errors.tutor?.dni?.message ??
    formulario.formState.errors.tutor?.telefono?.message ??
    formulario.formState.errors.tutor?.email?.message ??
    formulario.formState.errors.fecha_apto_medico?.message;

  return (
    <>
      <form onSubmit={formulario.handleSubmit(guardar)} noValidate className="space-y-5 pb-24 lg:pb-0">
        {esPropietaria && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Datos personales</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre *" error={formulario.formState.errors.usuario?.nombre?.message}>
                <Input
                  {...formulario.register("usuario.nombre")}
                  autoComplete="given-name"
                  maxLength={60}
                  aria-invalid={Boolean(formulario.formState.errors.usuario?.nombre)}
                />
              </Campo>
              <Campo etiqueta="Apellido *" error={formulario.formState.errors.usuario?.apellido?.message}>
                <Input
                  {...formulario.register("usuario.apellido")}
                  autoComplete="family-name"
                  maxLength={60}
                  aria-invalid={Boolean(formulario.formState.errors.usuario?.apellido)}
                />
              </Campo>
              <Campo etiqueta="DNI" error={formulario.formState.errors.usuario?.dni?.message}>
                <Input
                  {...formulario.register("usuario.dni")}
                  inputMode="numeric"
                  maxLength={10}
                  aria-invalid={Boolean(formulario.formState.errors.usuario?.dni)}
                />
              </Campo>
              <Campo
                etiqueta="Fecha de nacimiento *"
                error={formulario.formState.errors.usuario?.fecha_nacimiento?.message}
              >
                <Input
                  type="date"
                  min={limitesFechaNacimiento.min}
                  max={limitesFechaNacimiento.max}
                  {...formulario.register("usuario.fecha_nacimiento", {
                    onChange: (evento) => cambiarFechaNacimiento(evento.target.value),
                  })}
                />
              </Campo>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
          <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Contacto</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Teléfono" error={formulario.formState.errors.usuario?.telefono?.message}>
              <Input
                {...formulario.register("usuario.telefono")}
                autoComplete="tel"
                inputMode="tel"
                maxLength={20}
                aria-invalid={Boolean(formulario.formState.errors.usuario?.telefono)}
              />
            </Campo>
            <Campo etiqueta="Email" error={formulario.formState.errors.usuario?.email?.message}>
              <Input
                {...formulario.register("usuario.email")}
                autoComplete="email"
                inputMode="email"
                maxLength={120}
                aria-invalid={Boolean(formulario.formState.errors.usuario?.email)}
              />
            </Campo>
            <Campo
              etiqueta="Contacto de emergencia"
              error={formulario.formState.errors.cont_emerg_nombre?.message}
            >
              <Input
                {...formulario.register("cont_emerg_nombre")}
                aria-invalid={Boolean(formulario.formState.errors.cont_emerg_nombre)}
                autoComplete="off"
                maxLength={80}
              />
            </Campo>
            <Campo
              etiqueta="Teléfono de emergencia"
              error={formulario.formState.errors.cont_emerg_telefono?.message}
            >
              <Input
                {...formulario.register("cont_emerg_telefono")}
                inputMode="tel"
                autoComplete="off"
                maxLength={20}
                aria-invalid={Boolean(formulario.formState.errors.cont_emerg_telefono)}
              />
            </Campo>
          </div>
        </section>

        {esPropietaria && requiereTutor && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Tutor responsable</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Como el alumno es menor de 18 años, estos datos son obligatorios. El tutor debe estar registrado
              para poder asociarlo.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre *" error={formulario.formState.errors.tutor?.nombre?.message}>
                <Input
                  {...formulario.register("tutor.nombre")}
                  autoComplete="off"
                  aria-invalid={Boolean(formulario.formState.errors.tutor?.nombre)}
                />
              </Campo>
              <Campo etiqueta="Apellido *" error={formulario.formState.errors.tutor?.apellido?.message}>
                <Input
                  {...formulario.register("tutor.apellido")}
                  autoComplete="off"
                  aria-invalid={Boolean(formulario.formState.errors.tutor?.apellido)}
                />
              </Campo>
              <Campo etiqueta="DNI" error={formulario.formState.errors.tutor?.dni?.message}>
                <Input
                  {...formulario.register("tutor.dni")}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  aria-invalid={Boolean(formulario.formState.errors.tutor?.dni)}
                />
              </Campo>
              <Campo etiqueta="Teléfono" error={formulario.formState.errors.tutor?.telefono?.message}>
                <Input
                  {...formulario.register("tutor.telefono")}
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={20}
                  aria-invalid={Boolean(formulario.formState.errors.tutor?.telefono)}
                />
              </Campo>
              <Campo etiqueta="Email" error={formulario.formState.errors.tutor?.email?.message}>
                <Input
                  {...formulario.register("tutor.email")}
                  inputMode="email"
                  autoComplete="off"
                  maxLength={120}
                  aria-invalid={Boolean(formulario.formState.errors.tutor?.email)}
                />
              </Campo>
            </div>
          </section>
        )}

        {esPropietaria && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Plan y horarios</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              El cambio no modifica cobros anteriores y se aplica desde el próximo ciclo.
            </p>
            {alumno.historial_cobros.some((cobro) => cobro.estado === "PENDIENTE") && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200">
                Hay cobros pendientes de verificación. Revisalos antes de confirmar el cambio.
              </p>
            )}
            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Plan asignado
              <select
                {...formulario.register("id_plan", {
                  setValueAs: (valor: string) => (valor === "" ? null : Number(valor)),
                })}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] md:text-sm dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Sin plan</option>
                {alumno.planes_disponibles.map((plan) => (
                  <option key={plan.id_plan} value={plan.id_plan}>
                    {plan.nombre} · ${plan.precio.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Horarios asignados
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {alumno.horarios_disponibles.map((horario) => {
                  const marcado = horariosSeleccionados.includes(horario.id_horario);
                  return (
                    <label
                      key={horario.id_horario}
                      className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={(evento) => alternarHorario(horario.id_horario, evento.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#E91E82]"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">
                          {horario.actividad} · {diaSemana(horario.dia_semana)}
                        </span>
                        <span className="block text-slate-600 dark:text-slate-300">
                          {horario.hora_inicio}–{horario.hora_fin} · {horario.profesora}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>
        )}

        {esPropietaria && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">
              Información médica y observaciones
            </h2>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                {...formulario.register("apto_medico")}
                onChange={(evento) => {
                  const presentado = evento.target.checked;
                  formulario.setValue("apto_medico", presentado, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  if (!presentado) {
                    formulario.setValue("fecha_apto_medico", null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                className="h-4 w-4 accent-[#E91E82]"
              />
              Apto médico presentado
            </label>
            {aptoMedico && (
              <Campo
                etiqueta="Fecha del apto médico"
                error={formulario.formState.errors.fecha_apto_medico?.message}
              >
                <Input
                  type="date"
                  min={fechaNacimiento || undefined}
                  max={limitesFechaNacimiento.max}
                  {...formulario.register("fecha_apto_medico", {
                    setValueAs: (valor: string) => (valor === "" ? null : valor),
                  })}
                  aria-invalid={Boolean(formulario.formState.errors.fecha_apto_medico)}
                />
              </Campo>
            )}
            <Campo etiqueta="Observaciones">
              <textarea
                {...formulario.register("observaciones")}
                maxLength={500}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] md:text-sm dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
              />
            </Campo>
          </section>
        )}

        {!esPropietaria && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Observaciones</h2>
            <Campo etiqueta="Notas de contacto">
              <textarea
                {...formulario.register("observaciones")}
                maxLength={500}
                rows={4}
                className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] md:text-sm dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
              />
            </Campo>
          </section>
        )}

        {(errorDeValidacion || actualizacion.isError) && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
          >
            {errorDeValidacion ??
              mensajeDeErrorApi(actualizacion.error, "No se pudieron guardar los cambios.")}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-300 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-600 dark:bg-slate-900/95 lg:static lg:justify-end lg:rounded-xl lg:border lg:bg-transparent lg:p-4 lg:shadow-none lg:dark:bg-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            disabled={actualizacion.isPending}
            className="min-h-[48px] flex-1 lg:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={actualizacion.isPending}
            className="min-h-[48px] flex-1 bg-[#BC1266] text-white hover:bg-[#9D1055] lg:flex-none"
          >
            {actualizacion.isPending ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {actualizacion.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmarCambioPlan} onOpenChange={setConfirmarCambioPlan}>
        <AlertDialogContent className="inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none p-5 sm:left-[50%] sm:top-[50%] sm:h-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-amber-600" />
              Confirmar cambio de plan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-relaxed">
              Las cuotas ya cobradas no se modificarán. El nuevo plan se aplicará desde el próximo ciclo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-auto sm:mt-0">
            <AlertDialogCancel
              disabled={actualizacion.isPending}
              className="min-h-[44px]"
              onClick={() => setCambiosPendientes(null)}
            >
              Seguir editando
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actualizacion.isPending || cambiosPendientes === null}
              onClick={() => {
                if (cambiosPendientes) enviar(cambiosPendientes);
                setCambiosPendientes(null);
              }}
              className="min-h-[44px] bg-[#BC1266] text-white hover:bg-[#9D1055]"
            >
              Confirmar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
      {etiqueta}
      {children}
      {error ? <span className="font-normal text-rose-700 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function diaSemana(numero: number): string {
  return ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][numero] ?? "";
}
