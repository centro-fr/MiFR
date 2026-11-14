import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { CotizacionCobro } from "@/features/cobros/api/cobros-api";
import {
  CampoTitularCuenta,
  SelectorFormaDeCobro,
  type EtiquetasFormaDeCobro,
  type FormaDeCobro,
} from "@/features/cobros/components/campos-cobro";
import { ResumenCobro, SelectorPromocion } from "@/features/cobros/components/resumen-cobro";
import type { Promocion } from "@/types/promocion";
import { cn } from "@/utils/cn";
import { diaDesdeNumero, horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { AlumnoFormData } from "../../schemas/alumno.schema";
import type { PlanApiRespuesta } from "@/types/plan";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import { FILA_DE_CAMPOS_MODAL } from "@/components/ui/estilos-modal";

export interface DatosCobroPreinscripcion {
  yaAbono: boolean;
  formaPago: FormaDeCobro;
  /** Id de la promoción elegida, o SIN_PROMOCION. */
  idPromocion: string;
  titularCuenta: string;
}

const FORMAS: FormaDeCobro[] = ["EFECTIVO", "TRANSFERENCIA"];

const ETIQUETAS: EtiquetasFormaDeCobro = {
  EFECTIVO: { titulo: "Efectivo" },
  TRANSFERENCIA: { titulo: "Transferencia" },
};

interface Paso3ConfirmarProps {
  datosAlumno: AlumnoFormData;
  edadCalculada: number | null;
  plan: PlanApiRespuesta | null;
  profesora: ProfesoraDatos | null;
  horariosSeleccionados: HorarioApi[];
  onEditarAlumno: () => void;
  onEditarPlanYHorarios: () => void;
  datosCobro: DatosCobroPreinscripcion;
  onChangeDatosCobro: (nuevosDatos: DatosCobroPreinscripcion) => void;
  cotizacion: CotizacionCobro;
  promociones: Promocion[];
  onSeleccionarPromocion: (idPromocion: string) => void;
  esPropietaria: boolean;
}

export function Paso3Confirmar({
  datosAlumno,
  edadCalculada,
  plan,
  profesora,
  horariosSeleccionados,
  onEditarAlumno,
  onEditarPlanYHorarios,
  datosCobro,
  onChangeDatosCobro,
  cotizacion,
  promociones,
  onSeleccionarPromocion,
  esPropietaria,
}: Paso3ConfirmarProps) {

  // Actividad de los horarios
  const nombreActividad = horariosSeleccionados[0]?.actividad.nombre ?? "";
  const nombreProfesora = profesora
    ? `${profesora.nombre} ${profesora.apellido}`.trim()
    : "";

  // Ordenar horarios cronológicamente
  const horariosOrdenados = useMemo(() => {
    return [...horariosSeleccionados].sort((a, b) => {
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  }, [horariosSeleccionados]);

  return (
    <div className="space-y-6">
      {/* 1. TARJETA DE RESUMEN */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3.5">
        {/* Fila Alumno */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-4 sm:gap-6">
            <span className="text-xs font-semibold text-slate-500 w-16 sm:w-20 shrink-0">
              Alumno
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {datosAlumno.nombre} {datosAlumno.apellido}
              {edadCalculada !== null && ` · ${edadCalculada} años`}
            </span>
          </div>
          <button
            type="button"
            onClick={onEditarAlumno}
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Editar
          </button>
        </div>

        {/* Fila Plan */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-4 sm:gap-6">
            <span className="text-xs font-semibold text-slate-500 w-16 sm:w-20 shrink-0">
              Plan
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {plan?.nombre}
              {nombreActividad && ` · ${nombreActividad}`}
              {nombreProfesora && ` con ${nombreProfesora}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onEditarPlanYHorarios}
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Editar
          </button>
        </div>

        {/* Fila Horarios */}
        <div className="flex items-start gap-4 sm:gap-6">
          <span className="text-xs font-semibold text-slate-500 w-16 sm:w-20 shrink-0 pt-1">
            Horarios
          </span>
          <div className="flex flex-wrap gap-2">
            {horariosOrdenados.map((h) => {
              const diaNombre = diaDesdeNumero(h.dia_semana).slice(0, 3);
              const hora = horaDesdeApi(h.hora_inicio);
              return (
                <span
                  key={h.id_horario}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  {diaNombre} {hora}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. ¿YA ABONÓ LA PRIMERA CUOTA? */}
      <div className="space-y-3">
        <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          ¿Ya abonó la primera cuota?
        </Label>

        <div className={FILA_DE_CAMPOS_MODAL}>
          {/* Opción: Todavía no */}
          <button
            type="button"
            onClick={() =>
              onChangeDatosCobro({
                ...datosCobro,
                yaAbono: false,
              })
            }
            className={cn(
              "flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all text-left",
              !datosCobro.yaAbono
                ? "border-primary ring-1 ring-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full border flex items-center justify-center shrink-0",
                !datosCobro.yaAbono
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 dark:border-slate-600",
              )}
            >
              {!datosCobro.yaAbono && <div className="size-2 rounded-full bg-white" />}
            </div>
            <span className="text-xs sm:text-sm font-bold">Todavía no</span>
          </button>

          {/* Opción: Sí, ya abonó */}
          <button
            type="button"
            onClick={() =>
              onChangeDatosCobro({
                ...datosCobro,
                yaAbono: true,
              })
            }
            className={cn(
              "flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all text-left",
              datosCobro.yaAbono
                ? "border-primary ring-1 ring-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full border flex items-center justify-center shrink-0",
                datosCobro.yaAbono
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 dark:border-slate-600",
              )}
            >
              {datosCobro.yaAbono && <div className="size-2 rounded-full bg-white" />}
            </div>
            <span className="text-xs sm:text-sm font-bold">Sí, ya abonó</span>
          </button>
        </div>
      </div>

      {/* 3. PANEL DE COBRO (SI YA ABONÓ): lo mismo que "Cobrar" del listado */}
      {datosCobro.yaAbono && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 sm:p-5 space-y-5 animate-in fade-in duration-200">
          <ResumenCobro
            nombreAlumno={`${datosAlumno.nombre} ${datosAlumno.apellido}`.trim()}
            nombrePlan={plan?.nombre ?? ""}
            cotizacion={cotizacion}
          />
          <SelectorPromocion promociones={promociones} seleccionada={datosCobro.idPromocion} onChange={onSeleccionarPromocion} />
          <SelectorFormaDeCobro
            formas={FORMAS}
            valor={datosCobro.formaPago}
            onChange={(formaPago) => onChangeDatosCobro({ ...datosCobro, formaPago })}
            leyenda="Forma de cobro"
            etiquetas={ETIQUETAS}
          />

          {datosCobro.formaPago === "TRANSFERENCIA" && (
            <>
              <CampoTitularCuenta
                valor={datosCobro.titularCuenta}
                etiqueta="Titular cuenta"
                onChange={(titularCuenta) => onChangeDatosCobro({ ...datosCobro, titularCuenta })}
              />
              {!esPropietaria && (
                <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
                  <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Queda <strong>pendiente de verificación</strong> hasta que la propietaria la controle en el extracto.
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
