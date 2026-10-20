import { useMemo, useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { Label } from "@/components/ui/label";
import { obtenerLimitesFechaNacimiento } from "../../utils/edad";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

interface Paso2PlanYHorariosProps {
  planes: PlanApiRespuesta[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioApi[];
  idPlanSeleccionado: number | null;
  onSeleccionarPlan: (idPlan: number) => void;
  idProfesoraSeleccionada: number | null;
  onSeleccionarProfesora: (idProfesora: number) => void;
  esSoloProfesora: boolean;
  idsHorarios: number[];
  onToggleHorario: (idHorario: number) => void;
  clasesRequeridas: number;
  fechaInicio: string;
  onChangeFechaInicio: (fecha: string) => void;
}

const DIAS_COLUMNAS = [
  { numero: 1, label: "Lun" },
  { numero: 2, label: "Mar" },
  { numero: 3, label: "Mié" },
  { numero: 4, label: "Jue" },
  { numero: 5, label: "Vie" },
];

function extraerHora(horaStr: string): string {
  if (horaStr.includes("T")) {
    return horaStr.split("T")[1].slice(0, 5);
  }
  return horaStr.slice(0, 5);
}

export function Paso2PlanYHorarios({
  planes,
  profesoras,
  horarios,
  idPlanSeleccionado,
  onSeleccionarPlan,
  idProfesoraSeleccionada,
  onSeleccionarProfesora,
  esSoloProfesora,
  idsHorarios,
  onToggleHorario,
  clasesRequeridas,
  fechaInicio,
  onChangeFechaInicio,
}: Paso2PlanYHorariosProps) {
  const limitesFecha = obtenerLimitesFechaNacimiento();

  // 1. Obtener todas las actividades disponibles en los horarios
  const actividadesDisponibles = useMemo(() => {
    const mapa = new Map<number, { id: number; nombre: string }>();
    for (const h of horarios) {
      if (!mapa.has(h.id_actividad)) {
        mapa.set(h.id_actividad, {
          id: h.id_actividad,
          nombre: h.actividad.nombre,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [horarios]);

  // Actividad seleccionada explícitamente (o fallback derivado)
  const [actividadElegida, setActividadElegida] = useState<number | null>(() => {
    if (idsHorarios.length > 0) {
      const hSel = horarios.find((h) => idsHorarios.includes(h.id_horario));
      if (hSel) return hSel.id_actividad;
    }
    return null;
  });

  const idActividadSeleccionada = useMemo(() => {
    if (actividadElegida !== null && actividadesDisponibles.some((a) => a.id === actividadElegida)) {
      return actividadElegida;
    }
    if (idsHorarios.length > 0) {
      const hSel = horarios.find((h) => idsHorarios.includes(h.id_horario));
      if (hSel && actividadesDisponibles.some((a) => a.id === hSel.id_actividad)) {
        return hSel.id_actividad;
      }
    }
    return actividadesDisponibles[0]?.id ?? null;
  }, [actividadElegida, actividadesDisponibles, idsHorarios, horarios]);

  const setIdActividadSeleccionada = setActividadElegida;

  // 2. Profesoras compatibles que dictan la actividad seleccionada
  const profesorasDeActividad = useMemo(() => {
    if (!idActividadSeleccionada) return profesoras;
    const idsProfDeAct = new Set(
      horarios
        .filter((h) => h.id_actividad === idActividadSeleccionada)
        .map((h) => h.id_profesora),
    );
    const lista = profesoras.filter((p) => idsProfDeAct.has(Number(p.id)));
    return lista.length > 0 ? lista : profesoras;
  }, [profesoras, horarios, idActividadSeleccionada]);

  // Si no hay profesora seleccionada o la actual no dicta esta actividad, auto-seleccionar la primera disponible
  useEffect(() => {
    if (profesorasDeActividad.length > 0) {
      const actualValida = profesorasDeActividad.some((p) => Number(p.id) === idProfesoraSeleccionada);
      if (!actualValida && !esSoloProfesora) {
        onSeleccionarProfesora(Number(profesorasDeActividad[0].id));
      }
    }
  }, [profesorasDeActividad, idProfesoraSeleccionada, esSoloProfesora, onSeleccionarProfesora]);

  // 3. Horarios filtrados por la actividad y profesora
  const horariosFiltrados = useMemo(() => {
    return horarios.filter((h) => {
      const matchAct = idActividadSeleccionada ? h.id_actividad === idActividadSeleccionada : true;
      const matchProf = idProfesoraSeleccionada ? h.id_profesora === idProfesoraSeleccionada : true;
      return matchAct && matchProf;
    });
  }, [horarios, idActividadSeleccionada, idProfesoraSeleccionada]);

  // Franjas horarias únicas ordenadas
  const franjasHorarias = useMemo(() => {
    const horas = new Set<string>();
    for (const h of horariosFiltrados) {
      horas.add(extraerHora(h.hora_inicio));
    }
    return Array.from(horas).sort();
  }, [horariosFiltrados]);

  const nombreActividadActual =
    actividadesDisponibles.find((a) => a.id === idActividadSeleccionada)?.nombre ?? "disciplina";

  return (
    <div className="space-y-6">
      {/* 1. SELECCIÓN DE PLAN */}
      <div className="space-y-2.5">
        <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          Plan <span className="text-destructive">*</span>
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {planes.map((p) => {
            const isSelected = idPlanSeleccionado === p.id_plan;
            const precio = p.precio_vigente?.precio;
            const esClaseParticular = p.tipo === "CLASE_SUELTA" || p.clases_por_semana === 1;

            return (
              <button
                type="button"
                key={p.id_plan}
                onClick={() => onSeleccionarPlan(p.id_plan)}
                className={cn(
                  "relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[76px]",
                  isSelected
                    ? "border-primary ring-1 ring-primary bg-pink-50/20 dark:bg-primary/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900",
                )}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {p.nombre}
                  </span>
                  {isSelected && (
                    <div className="size-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs mt-2 w-full text-slate-600 dark:text-slate-400">
                  <span>
                    {esClaseParticular
                      ? "Una clase"
                      : p.clases_por_semana === 5
                      ? "5 por semana"
                      : `${p.clases_por_semana} por semana`}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    ${precio != null ? precio.toLocaleString("es-AR") : "—"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ACTIVIDAD (CHIPS TIPO PÍLDORA) */}
      <div className="space-y-2.5">
        <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          Actividad <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {actividadesDisponibles.map((act) => {
            const isSelected = idActividadSeleccionada === act.id;
            return (
              <button
                type="button"
                key={act.id}
                onClick={() => setIdActividadSeleccionada(act.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                  isSelected
                    ? "border border-primary text-primary bg-primary/5 dark:bg-primary/10 font-bold shadow-xs"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 bg-white dark:bg-slate-900",
                )}
              >
                {isSelected && <Check className="size-3.5 stroke-[3] text-primary" />}
                {act.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PROFESORA (CHIPS TIPO PÍLDORA) */}
      <div className="space-y-2.5">
        <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          Profesora <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {profesorasDeActividad.map((prof) => {
            const idNum = Number(prof.id);
            const isSelected = idProfesoraSeleccionada === idNum;
            const nombreCompleto = `${prof.nombre} ${prof.apellido}`.trim();

            return (
              <button
                type="button"
                key={prof.id}
                onClick={() => onSeleccionarProfesora(idNum)}
                disabled={esSoloProfesora}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                  isSelected
                    ? "border border-primary text-primary bg-primary/5 dark:bg-primary/10 font-bold shadow-xs"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 bg-white dark:bg-slate-900",
                  esSoloProfesora && !isSelected && "opacity-50 cursor-not-allowed",
                )}
              >
                {isSelected && <Check className="size-3.5 stroke-[3] text-primary" />}
                {nombreCompleto}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. GRILLA SEMANAL DE HORARIOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Horarios de {nombreActividadActual} <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {idsHorarios.length} de {clasesRequeridas} elegidos
          </span>
        </div>

        {/* Tabla / Grid Semanal */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 p-2 sm:p-3">
          {/* Encabezado de Días */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pb-2 text-center border-b border-slate-100 dark:border-slate-800">
            {DIAS_COLUMNAS.map((dia) => (
              <span key={dia.numero} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {dia.label}
              </span>
            ))}
          </div>

          {/* Filas de Horarios */}
          <div className="pt-2.5 space-y-2">
            {franjasHorarias.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No hay horarios disponibles para esta actividad y profesora.
              </div>
            ) : (
              franjasHorarias.map((hora) => (
                <div key={hora} className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {DIAS_COLUMNAS.map((dia) => {
                    const horarioSlot = horariosFiltrados.find(
                      (h) => h.dia_semana === dia.numero && extraerHora(h.hora_inicio) === hora,
                    );

                    if (!horarioSlot) {
                      return (
                        <div
                          key={dia.numero}
                          className="flex items-center justify-center min-h-[58px] text-xs text-slate-300 dark:text-slate-700 font-semibold"
                        >
                          —
                        </div>
                      );
                    }

                    const cupoTotal = horarioSlot.cupo_maximo_efectivo ?? horarioSlot.cupo_maximo;
                    const cuposLibres = cupoTotal != null ? cupoTotal : 1;
                    const estaCompleto = cupoTotal != null && cupoTotal <= 0;
                    const estaSeleccionado = idsHorarios.includes(horarioSlot.id_horario);

                    if (estaCompleto) {
                      return (
                        <div
                          key={dia.numero}
                          className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 cursor-not-allowed min-h-[58px]"
                        >
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{hora}</span>
                          <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">Completo</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={dia.numero}
                        onClick={() => onToggleHorario(horarioSlot.id_horario)}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center min-h-[58px]",
                          estaSeleccionado
                            ? "border-primary ring-1 ring-primary bg-pink-50/30 dark:bg-primary/10 text-primary shadow-xs"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200",
                        )}
                      >
                        {estaSeleccionado && (
                          <div className="absolute top-1 right-1 size-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                        <span className="text-xs font-bold leading-tight">{hora}</span>
                        <span
                          className={cn(
                            "text-[10px] font-medium mt-0.5",
                            estaSeleccionado ? "text-primary font-semibold" : "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          Queda {cuposLibres}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. FECHA DE INICIO: "Empieza el" */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="fecha-inicio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          Empieza el
        </Label>
        <CampoFecha
          id="fecha-inicio"
          etiquetaCalendario="Abrir calendario para elegir cuándo empieza"
          min={new Date().toISOString().slice(0, 10)}
          max={limitesFecha.max}
          value={fechaInicio}
          onChange={onChangeFechaInicio}
          className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
        />
      </div>
    </div>
  );
}
