import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarClock, Loader2, Sunset, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActualizarParametro, useRefrescarParametros } from "@/features/notificaciones/hooks/use-notificaciones";
import {
  CLAVES_AVISOS,
  MAXIMO_DIAS_AVISO,
  configuracionAvisosSchema,
  valorParaElBack,
  type CampoAvisos,
  type ConfiguracionAvisos,
  type Parametro,
} from "@/features/notificaciones/schemas/parametros";

const CONTROL =
  "min-h-12 w-28 rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const NOMBRE_CAMPO: Record<CampoAvisos, string> = {
  diasAviso: "los días de aviso",
  horaResumen: "la hora del resumen",
};

function fechaCorta(instante: string): string {
  return new Date(instante).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

function ultimoCambio(parametro: Parametro | undefined): string {
  if (!parametro?.fecha_actualizacion) return "Valor inicial del sistema.";
  return `Modificado el ${fechaCorta(parametro.fecha_actualizacion)}.`;
}

interface PropsSeccion {
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  children: ReactNode;
}

function Seccion({ titulo, descripcion, icono: Icono, children }: PropsSeccion) {
  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-border bg-white p-5 shadow-sm sm:p-6 dark:bg-surface-low">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300">
          <Icono className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function MensajeCampo({ id, error, ayuda }: { id: string; error?: string; ayuda: string }) {
  return error ? (
    <p id={id} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {error}
    </p>
  ) : (
    <p id={id} className="text-sm text-muted-foreground">
      {ayuda}
    </p>
  );
}

function valoresIniciales(parametros: Parametro[]): ConfiguracionAvisos {
  const valor = (clave: string) => String(parametros.find((parametro) => parametro.clave === clave)?.valor ?? "");
  return { diasAviso: valor(CLAVES_AVISOS.diasAviso), horaResumen: valor(CLAVES_AVISOS.horaResumen) };
}

/** US-25 y US-26: lo que la propietaria ajusta de los avisos que genera el back. */
export function FormularioAvisos({ parametros }: { parametros: Parametro[] }) {
  const actualizar = useActualizarParametro();
  const refrescar = useRefrescarParametros();
  const formulario = useForm<ConfiguracionAvisos>({
    resolver: zodResolver(configuracionAvisosSchema),
    defaultValues: valoresIniciales(parametros),
  });
  const { errors: errores, dirtyFields, isDirty, isSubmitting } = formulario.formState;
  const parametroDe = (campo: CampoAvisos) => parametros.find((parametro) => parametro.clave === CLAVES_AVISOS[campo]);

  // Un PATCH por parámetro y solo de lo que cambió. Si uno falla, lo anterior ya quedó guardado:
  // se recarga para que la pantalla muestre lo que hay en el servidor.
  const guardar = formulario.handleSubmit(async (valores) => {
    const cambiados = (Object.keys(CLAVES_AVISOS) as CampoAvisos[]).filter((campo) => dirtyFields[campo]);
    for (const campo of cambiados) {
      try {
        await actualizar.mutateAsync({ clave: CLAVES_AVISOS[campo], valor: valorParaElBack(campo, valores) });
      } catch (error) {
        toast.error(mensajeDeErrorApi(error, `No se pudo guardar ${NOMBRE_CAMPO[campo]}.`));
        void refrescar();
        return;
      }
    }
    formulario.reset(valores);
    void refrescar();
    toast.success("Configuración de avisos guardada.");
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-4">
      <Seccion
        titulo="Aviso de vencimiento de cuota"
        icono={CalendarClock}
        descripcion="Al alumno, o a su tutor si es menor, le llega un aviso antes de que venza la cuota y otro si se vence. Uno por cuota, sin repetir."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dias-aviso" className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Avisar con anticipación <span aria-hidden="true" className="text-rose-600">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="dias-aviso"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              aria-invalid={Boolean(errores.diasAviso)}
              aria-describedby="dias-aviso-ayuda"
              {...formulario.register("diasAviso")}
              className={CONTROL}
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">días antes del vencimiento</span>
          </div>
          <MensajeCampo
            id="dias-aviso-ayuda"
            error={errores.diasAviso?.message}
            ayuda={`De 0 a ${MAXIMO_DIAS_AVISO}. Con 0, avisa recién el día que vence. ${ultimoCambio(parametroDe("diasAviso"))}`}
          />
        </div>
      </Seccion>

      <Seccion
        titulo="Resumen diario"
        icono={Sunset}
        descripcion="Una vez por día te llega una notificación con las transferencias pendientes de verificación, el efectivo pendiente de rendición y las cuotas vencidas."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hora-resumen" className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Generarlo a partir de las <span aria-hidden="true" className="text-rose-600">*</span>
          </label>
          <input
            id="hora-resumen"
            type="time"
            aria-invalid={Boolean(errores.horaResumen)}
            aria-describedby="hora-resumen-ayuda"
            {...formulario.register("horaResumen")}
            className={CONTROL}
          />
          <MensajeCampo
            id="hora-resumen-ayuda"
            error={errores.horaResumen?.message}
            ayuda={`Hora de Argentina. ${ultimoCambio(parametroDe("horaResumen"))}`}
          />
        </div>
        <Link to="/app/dashboard" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-primary-dark hover:text-primary dark:text-pink-300">
          Ver el resumen de hoy en el Dashboard
        </Link>
      </Seccion>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSubmitting}
          onClick={() => formulario.reset()}
          className="min-h-11 rounded-xl font-bold"
        >
          Descartar cambios
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="min-h-11 rounded-xl bg-primary px-5 font-extrabold text-white hover:bg-primary-dark"
        >
          {isSubmitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
