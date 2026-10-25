import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModalCambioFrecuencia } from "@/features/planes/components/modales-plan";
import { ResumenPlan } from "@/features/planes/components/resumen-plan";
import { SeccionActividad, SeccionDatos, SeccionFrecuencia } from "@/features/planes/components/secciones-plan";
import {
  crearPlanFormSchema,
  erroresDe,
  valoresDelPlan,
  VALORES_PLAN_NUEVO,
  type ErroresPlanForm,
  type PlanFormValues,
} from "@/features/planes/schemas/plan";
import { cambiosDelPlan, nombreRepetido } from "@/features/planes/utils/planes";
import type { Actividad } from "@/types/actividad";
import type { Plan } from "@/types/plan";

interface Props {
  /** Sin plan es un alta; con plan, la edición de ese plan. */
  plan?: Plan;
  actividades: Actividad[];
  /** Todos los planes, para avisar antes de guardar un nombre repetido. */
  planes: Plan[];
  guardando: boolean;
  errorGuardado: string | null;
  onGuardar: (valores: PlanFormValues) => void;
}

// El control al que va el foco cuando su campo tiene error, en el orden del formulario.
const ID_DEL_CAMPO: Partial<Record<keyof PlanFormValues, string>> = {
  nombre: "plan-nombre",
  descripcion: "plan-descripcion",
  tipo: "plan-tipo-MENSUAL",
  precio: "plan-precio",
  idActividad: "plan-actividad",
  frecuencia: "plan-frecuencia-1",
  diasGracia: "plan-gracia",
};

function enfocarPrimerError(errores: ErroresPlanForm) {
  const campo = (Object.keys(ID_DEL_CAMPO) as (keyof PlanFormValues)[]).find((clave) => errores[clave]);
  const id = campo ? ID_DEL_CAMPO[campo] : undefined;
  if (id) document.getElementById(id)?.focus();
}

export function FormularioPlan({ plan, actividades, planes, guardando, errorGuardado, onGuardar }: Props) {
  const editando = plan !== undefined;
  const [valores, setValores] = useState<PlanFormValues>(() => (plan ? valoresDelPlan(plan) : VALORES_PLAN_NUEVO));
  const [errores, setErrores] = useState<ErroresPlanForm>({});
  const [confirmarFrecuencia, setConfirmarFrecuencia] = useState(false);

  const cambios = plan ? cambiosDelPlan(plan, valores, actividades) : undefined;
  const cambioDeFrecuencia = cambios?.find(({ campo }) => campo === "Frecuencia");

  const cambiar = (cambio: Partial<PlanFormValues>) => {
    setValores((actuales) => ({ ...actuales, ...cambio }));
    setErrores((actuales) => ({ ...actuales, ...Object.fromEntries(Object.keys(cambio).map((campo) => [campo, undefined])) }));
  };

  const validar = (): boolean => {
    const resultado = crearPlanFormSchema({ editando }).safeParse(valores);
    const nuevos = resultado.success ? {} : erroresDe(resultado.error);
    if (!nuevos.nombre && nombreRepetido(planes, valores.nombre, plan?.id)) nuevos.nombre = "Ya existe un plan vigente con ese nombre.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      enfocarPrimerError(nuevos);
      return false;
    }
    return true;
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!validar()) return;
    if (cambioDeFrecuencia) setConfirmarFrecuencia(true);
    else onGuardar(valores);
  };

  const sinCambios = editando && cambios?.length === 0;

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SeccionDatos valores={valores} errores={errores} editando={editando} onChange={cambiar} />
          <SeccionActividad valores={valores} errores={errores} editando={editando} onChange={cambiar} actividades={actividades} />
          <SeccionFrecuencia valores={valores} errores={errores} editando={editando} onChange={cambiar} />
        </div>
        <ResumenPlan valores={valores} actividades={actividades} cambios={cambios} />
      </div>

      {errorGuardado && (
        <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorGuardado}</AlertDescription>
        </Alert>
      )}

      {/* En mobile la barra queda pegada abajo, siempre a mano; desde md vuelve al flujo. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-border bg-bg-light px-4 py-3 sm:-mx-6 sm:px-6 md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0 dark:bg-canvas md:dark:bg-transparent">
        <Link
          to="/app/planes"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary md:flex-none dark:border-white/15 dark:bg-transparent dark:text-slate-200"
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={guardando || sinCambios} className="min-h-[44px] flex-1 rounded-xl bg-primary px-5 font-extrabold text-white shadow-md hover:bg-primary-dark md:flex-none">
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear plan"}
        </Button>
      </div>

      {confirmarFrecuencia && cambioDeFrecuencia && (
        <ModalCambioFrecuencia
          antes={cambioDeFrecuencia.antes}
          despues={cambioDeFrecuencia.despues}
          guardando={guardando}
          onClose={() => setConfirmarFrecuencia(false)}
          onConfirm={() => {
            setConfirmarFrecuencia(false);
            onGuardar(valores);
          }}
        />
      )}
    </form>
  );
}
