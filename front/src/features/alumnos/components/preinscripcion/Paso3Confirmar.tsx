import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import { diaDesdeNumero, horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { AlumnoFormData } from "../../schemas/alumno.schema";
import type { PlanApiRespuesta } from "@/types/plan";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import { CAMPO_MODAL, FILA_DE_CAMPOS_MODAL } from "@/components/ui/estilos-modal";

export interface DatosCobroPreinscripcion {
  yaAbono: boolean;
  formaPago: "EFECTIVO" | "TRANSFERENCIA";
  monto: number;
  fechaHoraTransferencia: string;
  titularCuenta: string;
}

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
}: Paso3ConfirmarProps) {
  const precioPlan = plan?.precio_vigente?.precio ?? 0;

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
                monto: datosCobro.monto || precioPlan,
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

      {/* 3. PANEL DE PAGO (SI YA ABONÓ) */}
      {datosCobro.yaAbono && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          <div className="space-y-2.5">
            <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              ¿Cómo abonó?
            </Label>

            <div className={FILA_DE_CAMPOS_MODAL}>
              {/* Radio: Efectivo */}
              <button
                type="button"
                onClick={() =>
                  onChangeDatosCobro({
                    ...datosCobro,
                    formaPago: "EFECTIVO",
                  })
                }
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                  datosCobro.formaPago === "EFECTIVO"
                    ? "border-slate-900 bg-slate-50 text-slate-900 dark:border-white dark:bg-white/10 dark:text-white shadow-xs font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0",
                    datosCobro.formaPago === "EFECTIVO"
                      ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white text-white"
                      : "border-slate-300 dark:border-slate-600",
                  )}
                >
                  {datosCobro.formaPago === "EFECTIVO" && <div className="size-1.5 rounded-full bg-white dark:bg-slate-900" />}
                </div>
                <span className="text-xs sm:text-sm">Efectivo</span>
              </button>

              {/* Radio: Transferencia */}
              <button
                type="button"
                onClick={() =>
                  onChangeDatosCobro({
                    ...datosCobro,
                    formaPago: "TRANSFERENCIA",
                  })
                }
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                  datosCobro.formaPago === "TRANSFERENCIA"
                    ? "border-slate-900 bg-slate-50 text-slate-900 dark:border-white dark:bg-white/10 dark:text-white shadow-xs font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0",
                    datosCobro.formaPago === "TRANSFERENCIA"
                      ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white text-white"
                      : "border-slate-300 dark:border-slate-600",
                  )}
                >
                  {datosCobro.formaPago === "TRANSFERENCIA" && <div className="size-1.5 rounded-full bg-white dark:bg-slate-900" />}
                </div>
                <span className="text-xs sm:text-sm">Transferencia</span>
              </button>
            </div>
          </div>

          {/* Si eligió Efectivo */}
          {datosCobro.formaPago === "EFECTIVO" && (
            <div className={cn(CAMPO_MODAL, "max-w-sm")}>
              <Label htmlFor="monto-efectivo" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Monto cobrado <span className="text-destructive">*</span>
              </Label>
              <Input
                id="monto-efectivo"
                type="number"
                min={0}
                value={datosCobro.monto || ""}
                onChange={(e) =>
                  onChangeDatosCobro({
                    ...datosCobro,
                    monto: Number(e.target.value),
                  })
                }
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Precio del plan: ${precioPlan.toLocaleString("es-AR")}
              </p>
            </div>
          )}

          {/* Si eligió Transferencia */}
          {datosCobro.formaPago === "TRANSFERENCIA" && (
            <div className="space-y-4">
              <div className={FILA_DE_CAMPOS_MODAL}>
                <div className={CAMPO_MODAL}>
                  <Label htmlFor="monto-transf" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Monto cobrado <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="monto-transf"
                    type="number"
                    min={0}
                    value={datosCobro.monto || ""}
                    onChange={(e) =>
                      onChangeDatosCobro({
                        ...datosCobro,
                        monto: Number(e.target.value),
                      })
                    }
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio del plan: ${precioPlan.toLocaleString("es-AR")}
                  </p>
                </div>

                <div className={CAMPO_MODAL}>
                  <Label htmlFor="fecha-hora-transf" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Fecha y hora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fecha-hora-transf"
                    type="datetime-local"
                    value={datosCobro.fechaHoraTransferencia}
                    onChange={(e) =>
                      onChangeDatosCobro({
                        ...datosCobro,
                        fechaHoraTransferencia: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className={CAMPO_MODAL}>
                <Label htmlFor="titular-transf" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Titular de la cuenta <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="titular-transf"
                  placeholder="Quien hizo la transferencia, si no es el alumno"
                  value={datosCobro.titularCuenta}
                  onChange={(e) =>
                    onChangeDatosCobro({
                      ...datosCobro,
                      titularCuenta: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
