import { useMemo } from "react";
import { Clock, Check, Users, AlertCircle, Dumbbell, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/badge";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

interface Paso3SeleccionHorariosProps {
  horarios: HorarioApi[];
  idsSeleccionados: number[];
  onToggleHorario: (idHorario: number) => void;
  clasesRequeridas: number;
}

const DIAS_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatoHora(horaIso: string): string {
  if (horaIso.includes("T")) {
    const parte = horaIso.split("T")[1];
    return parte.slice(0, 5);
  }
  return horaIso.slice(0, 5);
}

interface GrupoActividad {
  id_actividad: number;
  nombre: string;
  modalidad?: string;
  horarios: HorarioApi[];
}

export function Paso3SeleccionHorarios({
  horarios,
  idsSeleccionados,
  onToggleHorario,
  clasesRequeridas,
}: Paso3SeleccionHorariosProps) {
  // Determinar si ya hay una actividad seleccionada en base al primer horario elegido
  const horarioSeleccionadoReferencia = useMemo(
    () => horarios.find((h) => idsSeleccionados.includes(h.id_horario)) ?? null,
    [horarios, idsSeleccionados],
  );
  const idActividadSeleccionada = horarioSeleccionadoReferencia?.id_actividad ?? null;
  const nombreActividadSeleccionada = horarioSeleccionadoReferencia?.actividad.nombre ?? null;

  // Agrupar horarios por actividad
  const gruposActividades = useMemo(() => {
    const mapa = new Map<number, GrupoActividad>();

    for (const h of horarios) {
      let grupo = mapa.get(h.id_actividad);
      if (!grupo) {
        grupo = {
          id_actividad: h.id_actividad,
          nombre: h.actividad.nombre,
          modalidad: h.actividad.modalidad,
          horarios: [],
        };
        mapa.set(h.id_actividad, grupo);
      }
      grupo.horarios.push(h);
    }

    // Ordenar cada grupo por día y hora
    for (const grupo of mapa.values()) {
      grupo.horarios.sort((a, b) => {
        if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [horarios]);

  const faltan = clasesRequeridas - idsSeleccionados.length;

  return (
    <div className="space-y-5">
      {/* Barra de estado y progreso de selección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Horarios Semanales Fijos
            </h4>
            {nombreActividadSeleccionada && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="size-3" />
                {nombreActividadSeleccionada}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {idActividadSeleccionada === null
              ? `Elegí los ${clasesRequeridas} días semanales en una sola disciplina.`
              : `Completá los ${clasesRequeridas} días semanales para ${nombreActividadSeleccionada}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={idsSeleccionados.length === clasesRequeridas ? "default" : "secondary"}
            className="text-xs px-2.5 py-1 font-semibold"
          >
            {idsSeleccionados.length} / {clasesRequeridas} seleccionados
          </Badge>
          {faltan > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (Falta{faltan > 1 ? "n" : ""} {faltan})
            </span>
          )}
        </div>
      </div>

      {gruposActividades.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No hay horarios disponibles</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              No se encontraron clases vigentes de la profesora para el plan elegido.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {gruposActividades.map((grupo) => {
            const esActividadActiva = idActividadSeleccionada === grupo.id_actividad;
            const estaBloqueadaPorOtra = idActividadSeleccionada !== null && !esActividadActiva;
            const tieneClasesSuficientes = grupo.horarios.length >= clasesRequeridas;

            return (
              <div
                key={grupo.id_actividad}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 space-y-3",
                  esActividadActiva
                    ? "border-primary/50 bg-primary/[0.02] ring-1 ring-primary/20 dark:bg-primary/[0.04]"
                    : estaBloqueadaPorOtra
                      ? "opacity-45 bg-muted/20 border-dashed border-border"
                      : "border-border/70 bg-card/60",
                )}
              >
                {/* Cabecera del bloque de actividad */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "size-7 rounded-lg flex items-center justify-center shrink-0",
                      esActividadActiva ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Dumbbell className="size-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {grupo.nombre}
                        {grupo.modalidad && (
                          <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5 uppercase">
                            {grupo.modalidad}
                          </Badge>
                        )}
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {estaBloqueadaPorOtra && (
                      <Badge variant="outline" className="text-[11px] text-muted-foreground border-border flex items-center gap-1">
                        <Lock className="size-3" />
                        Bloqueada por otra actividad
                      </Badge>
                    )}
                    {!tieneClasesSuficientes && !estaBloqueadaPorOtra && (
                      <Badge variant="outline" className="text-[11px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                        {grupo.horarios.length} de {clasesRequeridas} requeridas
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {grupo.horarios.length} horario{grupo.horarios.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Grilla de horarios de esta actividad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {grupo.horarios.map((h) => {
                    const isSelected = idsSeleccionados.includes(h.id_horario);
                    const diaNombre = DIAS_NOMBRES[h.dia_semana - 1] || `Día ${h.dia_semana}`;
                    const horaIni = formatoHora(h.hora_inicio);
                    const horaFin = formatoHora(h.hora_fin);
                    const cupo = h.cupo_maximo_efectivo ?? h.cupo_maximo;
                    const deshabilitado = estaBloqueadaPorOtra || (!tieneClasesSuficientes && !isSelected);

                    return (
                      <button
                        type="button"
                        key={h.id_horario}
                        disabled={deshabilitado}
                        onClick={() => onToggleHorario(h.id_horario)}
                        className={cn(
                          "p-3 rounded-xl transition-all duration-200 border text-left flex flex-col justify-between gap-2",
                          deshabilitado
                            ? "cursor-not-allowed bg-muted/20 border-border/50 text-muted-foreground"
                            : isSelected
                              ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 dark:bg-primary/20 cursor-pointer"
                              : "bg-card hover:bg-muted/40 border-border/70 hover:border-border cursor-pointer",
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {diaNombre}
                            </span>
                            {isSelected ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                                <Check className="size-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="size-5 rounded-full border border-border/80 shrink-0" />
                            )}
                          </div>

                          <div className="mt-1 flex items-baseline gap-1.5 font-semibold text-foreground text-sm">
                            <Clock className="size-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {horaIni} – {horaFin}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="size-3 shrink-0" />
                            {cupo ? `Cupo: ${cupo}` : "Sin cupo"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {faltan > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Seleccioná {faltan} horario{faltan > 1 ? "s" : ""} más en la actividad elegida para completar los requerimientos del plan.
          </span>
        </div>
      )}
    </div>
  );
}
