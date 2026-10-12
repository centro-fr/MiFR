import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActualizarAlumno } from "@/features/alumnos/hooks/use-alumnos";
import {
  aCuerpoEdicion,
  crearEdicionAlumnoSchema,
  esMenorDeEdad,
  obtenerLimitesFechaNacimiento,
  type AlumnoDetalle,
  type EdicionAlumnoValores,
} from "@/features/alumnos/schemas/alumno";
import { mensajeDeErrorApi } from "@/api/errores";

function obtenerPrimerErrorDeFormulario(errors: FieldErrors<EdicionAlumnoValores>): string | undefined {
  return (
    errors.usuario?.nombre?.message ??
    errors.usuario?.apellido?.message ??
    errors.usuario?.dni?.message ??
    errors.usuario?.fecha_nacimiento?.message ??
    errors.usuario?.telefono?.message ??
    errors.usuario?.email?.message ??
    errors.usuario?.direccion?.message ??
    errors.cont_emerg_nombre?.message ??
    errors.cont_emerg_telefono?.message ??
    errors.fecha_apto_medico?.message ??
    errors.observaciones?.message
  );
}

function valoresIniciales(alumno: AlumnoDetalle): EdicionAlumnoValores {
  const { usuario } = alumno;
  return {
    usuario: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni ?? "",
      fecha_nacimiento: usuario.fecha_nacimiento,
      telefono: usuario.telefono ?? "",
      email: usuario.email ?? "",
      direccion: usuario.direccion ?? "",
    },
    cont_emerg_nombre: alumno.cont_emerg_nombre ?? "",
    cont_emerg_telefono: alumno.cont_emerg_telefono ?? "",
    apto_medico: alumno.apto_medico,
    fecha_apto_medico: alumno.fecha_apto_medico,
    observaciones: alumno.observaciones ?? "",
  };
}

interface AlumnoEdicionFormProps {
  alumno: AlumnoDetalle;
  /** La propietaria edita todo; la profesora, solo contacto y observaciones (como el back). */
  esPropietaria: boolean;
  onCancelar: () => void;
  onGuardado: () => void;
}

// US-09: el plan y los horarios se cambian desde la pestaña "Plan y horarios" de la ficha.
export function AlumnoEdicionForm({ alumno, esPropietaria, onCancelar, onGuardado }: AlumnoEdicionFormProps) {
  const actualizacion = useActualizarAlumno(alumno.id_alumno);
  const formulario = useForm<EdicionAlumnoValores>({
    resolver: zodResolver(crearEdicionAlumnoSchema({ tieneTutor: alumno.tutor !== null })),
    mode: "onBlur",
    defaultValues: valoresIniciales(alumno),
  });
  const fechaNacimiento = useWatch({ control: formulario.control, name: "usuario.fecha_nacimiento" });
  const aptoMedico = useWatch({ control: formulario.control, name: "apto_medico" });
  const esMenor = esMenorDeEdad(fechaNacimiento ?? "");
  const limitesFechaNacimiento = obtenerLimitesFechaNacimiento();
  const errores = formulario.formState.errors;

  function guardar(valores: EdicionAlumnoValores) {
    const cambios = aCuerpoEdicion(alumno, valores, { soloContacto: !esPropietaria });
    if (Object.keys(cambios).length === 0) {
      toast.info("No hay cambios para guardar.");
      onCancelar();
      return;
    }
    actualizacion.mutate(cambios, { onSuccess: onGuardado });
  }

  const errorDeValidacion = obtenerPrimerErrorDeFormulario(errores);

  return (
    <form onSubmit={formulario.handleSubmit(guardar)} noValidate className="space-y-5 pb-24 lg:pb-0">
      {esPropietaria && alumno.tutor && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
          <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Tutor responsable</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {alumno.tutor.nombre} {alumno.tutor.apellido}
            {alumno.tutor.telefono && ` · ${alumno.tutor.telefono}`}
            {alumno.tutor.email && ` · ${alumno.tutor.email}`}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Los datos del tutor son los de su propia cuenta: no se editan desde la ficha del alumno.
          </p>
        </section>
      )}

      {esPropietaria && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
          <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Datos personales</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre *" error={errores.usuario?.nombre?.message}>
              <Input
                {...formulario.register("usuario.nombre")}
                autoComplete="given-name"
                maxLength={60}
                aria-invalid={Boolean(errores.usuario?.nombre)}
              />
            </Campo>
            <Campo etiqueta="Apellido *" error={errores.usuario?.apellido?.message}>
              <Input
                {...formulario.register("usuario.apellido")}
                autoComplete="family-name"
                maxLength={60}
                aria-invalid={Boolean(errores.usuario?.apellido)}
              />
            </Campo>
            <Campo etiqueta="DNI" error={errores.usuario?.dni?.message}>
              <Input
                {...formulario.register("usuario.dni")}
                inputMode="numeric"
                maxLength={8}
                aria-invalid={Boolean(errores.usuario?.dni)}
              />
            </Campo>
            <Campo etiqueta="Fecha de nacimiento *" error={errores.usuario?.fecha_nacimiento?.message}>
              <Input
                type="date"
                min={limitesFechaNacimiento.min}
                max={limitesFechaNacimiento.max}
                {...formulario.register("usuario.fecha_nacimiento")}
                aria-invalid={Boolean(errores.usuario?.fecha_nacimiento)}
              />
            </Campo>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">Contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Teléfono" error={errores.usuario?.telefono?.message}>
            <Input
              {...formulario.register("usuario.telefono")}
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
              aria-invalid={Boolean(errores.usuario?.telefono)}
            />
          </Campo>
          {esPropietaria &&
            (esMenor ? (
              <p className="self-end text-sm text-slate-600 dark:text-slate-400">
                Los menores no llevan email: entra al sistema su tutor.
              </p>
            ) : (
              <Campo etiqueta="Email *" error={errores.usuario?.email?.message}>
                <Input
                  {...formulario.register("usuario.email")}
                  autoComplete="email"
                  inputMode="email"
                  maxLength={120}
                  aria-invalid={Boolean(errores.usuario?.email)}
                />
              </Campo>
            ))}
          <Campo etiqueta="Dirección" error={errores.usuario?.direccion?.message}>
            <Input
              {...formulario.register("usuario.direccion")}
              autoComplete="street-address"
              maxLength={120}
              aria-invalid={Boolean(errores.usuario?.direccion)}
            />
          </Campo>
          <Campo etiqueta="Contacto de emergencia" error={errores.cont_emerg_nombre?.message}>
            <Input
              {...formulario.register("cont_emerg_nombre")}
              aria-invalid={Boolean(errores.cont_emerg_nombre)}
              autoComplete="off"
              maxLength={80}
            />
          </Campo>
          <Campo etiqueta="Teléfono de emergencia" error={errores.cont_emerg_telefono?.message}>
            <Input
              {...formulario.register("cont_emerg_telefono")}
              inputMode="tel"
              autoComplete="off"
              maxLength={20}
              aria-invalid={Boolean(errores.cont_emerg_telefono)}
            />
          </Campo>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-base font-extrabold text-[#181C26] dark:text-white">
          {esPropietaria ? "Información médica y observaciones" : "Observaciones"}
        </h2>
        <div className="mt-4 grid gap-4">
          {esPropietaria && (
            <>
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  {...formulario.register("apto_medico")}
                  onChange={(evento) => {
                    const presentado = evento.target.checked;
                    formulario.setValue("apto_medico", presentado, { shouldDirty: true, shouldValidate: true });
                    if (!presentado) {
                      formulario.setValue("fecha_apto_medico", null, { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  className="h-4 w-4 accent-[#E91E82]"
                />
                Apto médico presentado
              </label>
              {aptoMedico && (
                <Campo etiqueta="Fecha del apto médico" error={errores.fecha_apto_medico?.message}>
                  <Input
                    type="date"
                    min={fechaNacimiento || undefined}
                    max={limitesFechaNacimiento.max}
                    {...formulario.register("fecha_apto_medico", {
                      setValueAs: (valor: string) => (valor === "" ? null : valor),
                    })}
                    aria-invalid={Boolean(errores.fecha_apto_medico)}
                  />
                </Campo>
              )}
            </>
          )}
          <Campo etiqueta="Observaciones" error={errores.observaciones?.message}>
            <textarea
              {...formulario.register("observaciones")}
              maxLength={500}
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] md:text-sm dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
            />
          </Campo>
        </div>
      </section>

      {(errorDeValidacion || actualizacion.isError) && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
        >
          {errorDeValidacion ?? mensajeDeErrorApi(actualizacion.error, "No se pudieron guardar los cambios.")}
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
          {actualizacion.isPending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
          {actualizacion.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
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
