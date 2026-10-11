import { Info, TriangleAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BadgeModalidad } from "@/features/planes/components/badges-plan";
import { CampoPlan, SeccionPlan } from "@/features/planes/components/campo-plan";
import { CLASE_CONTROL } from "@/features/planes/components/estilos";
import {
  LARGO_MAXIMO_DESCRIPCION,
  LARGO_MAXIMO_NOMBRE,
  MAXIMO_DIAS_GRACIA,
  type ErroresPlanForm,
  type FrecuenciaElegida,
  type PlanFormValues,
} from "@/features/planes/schemas/plan";
import { ETIQUETA_TIPO_PLAN } from "@/features/planes/utils/planes";
import type { Actividad } from "@/types/actividad";
import type { TipoPlan } from "@/types/plan";
import { cn } from "@/utils/cn";

export interface PropsSeccion {
  valores: PlanFormValues;
  errores: ErroresPlanForm;
  editando: boolean;
  onChange: (cambio: Partial<PlanFormValues>) => void;
}

const TIPOS: { valor: TipoPlan; detalle: string }[] = [
  { valor: "MENSUAL", detalle: "Cuota por mes, con frecuencia semanal" },
  { valor: "CLASE_SUELTA", detalle: "Se cobra cada clase por separado" },
];

const FRECUENCIAS: { valor: Exclude<FrecuenciaElegida, "">; texto: string }[] = [
  ...(["1", "2", "3", "4", "5", "6", "7"] as const).map((valor) => ({ valor, texto: valor === "1" ? "1 vez" : `${valor} veces` })),
  { valor: "LIBRE", texto: "Libre" },
];

// Opciones de radio con forma de botón: el input nativo da el teclado y el lector de pantalla.
const CLASE_OPCION =
  "flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 has-checked:border-primary has-checked:bg-pink-50 has-checked:text-primary-dark has-focus-visible:outline-2 has-focus-visible:outline-primary dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:has-checked:bg-primary/15 dark:has-checked:text-pink-300";

function ErrorDeGrupo({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {error}
    </p>
  );
}

function SelectorTipo({ valores, errores, editando, onChange }: PropsSeccion) {
  if (editando) {
    return (
      <CampoPlan id="plan-tipo" etiqueta="Tipo de plan" ayuda="El tipo no se cambia: define cómo vencen las cuotas de quienes ya lo usan.">
        {(props) => <input {...props} readOnly value={ETIQUETA_TIPO_PLAN[valores.tipo as TipoPlan]} className={CLASE_CONTROL} />}
      </CampoPlan>
    );
  }
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={errores.tipo ? "plan-tipo-error" : undefined}>
      <legend className="mb-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
        Tipo de plan <span className="text-rose-600" aria-hidden="true">*</span>
        <span className="sr-only">(obligatorio)</span>
      </legend>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        {TIPOS.map(({ valor, detalle }) => (
          <label key={valor} className={cn(CLASE_OPCION, "flex-col items-start justify-center gap-0.5 py-2 text-left")}>
            <input type="radio" id={`plan-tipo-${valor}`} name="plan-tipo" value={valor} checked={valores.tipo === valor} onChange={() => onChange({ tipo: valor })} className="sr-only" />
            {ETIQUETA_TIPO_PLAN[valor]}
            <span className="text-xs font-medium text-muted-foreground">{detalle}</span>
          </label>
        ))}
      </div>
      <ErrorDeGrupo id="plan-tipo-error" error={errores.tipo} />
    </fieldset>
  );
}

export function SeccionDatos(props: PropsSeccion) {
  const { valores, errores, editando, onChange } = props;
  return (
    <SeccionPlan titulo="1. Datos del plan" color="bg-primary">
      <CampoPlan id="plan-nombre" etiqueta="Nombre del plan" obligatorio error={errores.nombre}>
        {(control) => (
          <input
            {...control}
            value={valores.nombre}
            maxLength={LARGO_MAXIMO_NOMBRE}
            onChange={(evento) => onChange({ nombre: evento.target.value })}
            placeholder="Por ejemplo: Plan Básico"
            className={CLASE_CONTROL}
          />
        )}
      </CampoPlan>
      <CampoPlan id="plan-descripcion" etiqueta="Descripción / qué incluye" error={errores.descripcion} ayuda={`${valores.descripcion.length}/${LARGO_MAXIMO_DESCRIPCION}`}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={valores.descripcion}
            maxLength={LARGO_MAXIMO_DESCRIPCION}
            onChange={(evento) => onChange({ descripcion: evento.target.value })}
            placeholder="Por ejemplo: acceso a 2 clases semanales en disciplinas grupales."
            className="rounded-xl border-slate-200 text-sm dark:border-white/15"
          />
        )}
      </CampoPlan>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectorTipo {...props} />
        <CampoPlan
          id="plan-precio"
          etiqueta={valores.tipo === "CLASE_SUELTA" ? "Precio por clase (ARS)" : "Precio mensual (ARS)"}
          obligatorio={!editando}
          error={errores.precio}
          ayuda={editando ? "El precio se cambia con fecha de vigencia, desde “Actualizar precio”." : "Por ejemplo 28000 o 28.000,50."}
        >
          {(control) => (
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-slate-500">
                $
              </span>
              <input
                {...control}
                inputMode="decimal"
                value={valores.precio}
                readOnly={editando}
                onChange={(evento) => onChange({ precio: evento.target.value })}
                placeholder="28.000"
                className={cn(CLASE_CONTROL, "pl-7", editando && "bg-slate-50 text-slate-600 dark:bg-white/5")}
              />
            </div>
          )}
        </CampoPlan>
      </div>
    </SeccionPlan>
  );
}

function AvisoModalidad({ actividad }: { actividad: Actividad | undefined }) {
  if (actividad?.modalidad === "PERSONALIZADA") {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Los planes de clases personalizadas estarán sujetos al cupo máximo de la actividad
        {actividad.cupoMaximo === null ? "." : ` (${actividad.cupoMaximo} alumnos).`} Al inscribir se valida que haya lugar.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {actividad ? `Plan grupal: el cupo se controla en cada horario de ${actividad.nombre}.` : "Sin actividad exclusiva, el alumno elige horarios de cualquier actividad."}
    </p>
  );
}

export function SeccionActividad({ valores, errores, onChange, actividades }: PropsSeccion & { actividades: Actividad[] }) {
  const actividad = actividades.find(({ id }) => id === valores.idActividad);
  const grupo = (modalidad: Actividad["modalidad"]) => actividades.filter((a) => a.modalidad === modalidad);
  return (
    <SeccionPlan titulo="2. Actividad y profesora" color="bg-blue-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoPlan id="plan-actividad" etiqueta="Actividad" error={errores.idActividad} ayuda="Elegí una si el plan es solo para esa actividad.">
          {(control) => (
            <select {...control} value={valores.idActividad} onChange={(evento) => onChange({ idActividad: evento.target.value })} className={CLASE_CONTROL}>
              <option value="">Cualquier actividad</option>
              {(["GRUPAL", "PERSONALIZADA"] as const).map((modalidad) => (
                <optgroup key={modalidad} label={modalidad === "GRUPAL" ? "Grupales" : "Personalizadas"}>
                  {grupo(modalidad).map(({ id, nombre }) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </CampoPlan>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Tipo de actividad</span>
          <div className="flex min-h-[44px] items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 dark:border-white/15 dark:bg-white/5">
            <BadgeModalidad modalidad={actividad?.modalidad ?? null} />
          </div>
        </div>
      </div>
      <AvisoModalidad actividad={actividad} />
      <label htmlFor="plan-profesora-unica" className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/15">
        <span className="flex flex-col">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Solo con la profesora a cargo</span>
          <span className="text-sm text-muted-foreground">
            Activado, todos sus horarios son de la profesora a cargo de su inscripción. Desactivado, pueden ser de otra, pero siempre de
            una sola.
          </span>
        </span>
        <Switch id="plan-profesora-unica" checked={valores.profesoraUnica} onCheckedChange={(profesoraUnica) => onChange({ profesoraUnica })} />
      </label>
    </SeccionPlan>
  );
}

export function SeccionFrecuencia({ valores, errores, onChange }: PropsSeccion) {
  if (valores.tipo === "CLASE_SUELTA") {
    return (
      <SeccionPlan titulo="3. Frecuencia" color="bg-emerald-500">
        <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          La clase suelta cubre un solo día: no lleva frecuencia semanal ni días de gracia.
        </p>
      </SeccionPlan>
    );
  }
  return (
    <SeccionPlan titulo="3. Frecuencia y vencimiento" color="bg-emerald-500">
      <fieldset className="flex flex-col gap-1.5" aria-describedby={["plan-frecuencia-ayuda", errores.frecuencia ? "plan-frecuencia-error" : ""].join(" ").trim()}>
        <legend className="mb-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
          Frecuencia semanal <span className="text-rose-600" aria-hidden="true">*</span>
          <span className="sr-only">(obligatorio)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
          {FRECUENCIAS.map(({ valor, texto }) => (
            <label key={valor} className={CLASE_OPCION}>
              <input type="radio" id={`plan-frecuencia-${valor}`} name="plan-frecuencia" value={valor} checked={valores.frecuencia === valor} onChange={() => onChange({ frecuencia: valor })} className="sr-only" />
              {texto}
            </label>
          ))}
        </div>
        <p id="plan-frecuencia-ayuda" className="text-sm text-muted-foreground">
          Las veces por semana que el alumno puede asistir. “Libre” no tiene tope.
        </p>
        <ErrorDeGrupo id="plan-frecuencia-error" error={errores.frecuencia} />
      </fieldset>
      <div className="max-w-xs">
        <CampoPlan id="plan-gracia" etiqueta="Días de gracia" obligatorio error={errores.diasGracia} ayuda="Días después del vencimiento en que todavía puede asistir.">
          {(control) => (
            <input
              {...control}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAXIMO_DIAS_GRACIA}
              value={valores.diasGracia}
              onChange={(evento) => onChange({ diasGracia: evento.target.value })}
              className={CLASE_CONTROL}
            />
          )}
        </CampoPlan>
      </div>
    </SeccionPlan>
  );
}
