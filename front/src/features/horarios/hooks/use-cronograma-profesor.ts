import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHorariosDeProfesora } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import { diaDesdeNumero, horaDesdeApi, timeToMinutes } from "@/features/horarios/utils/cronograma";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { DiaSemana, Horario } from "@/types/horarios";

export const DIAS_SEMANA_CRONOGRAMA: { id: DiaSemana; label: string; shortLabel: string }[] = [
  { id: "LUNES", label: "Lunes", shortLabel: "Lun" },
  { id: "MARTES", label: "Martes", shortLabel: "Mar" },
  { id: "MIERCOLES", label: "Miércoles", shortLabel: "Mié" },
  { id: "JUEVES", label: "Jueves", shortLabel: "Jue" },
  { id: "VIERNES", label: "Viernes", shortLabel: "Vie" },
];

function aHorarioDocente(api: HorarioApi): Horario {
  return {
    id: String(api.id_horario),
    actividadId: String(api.id_actividad),
    actividadNombre: api.actividad.nombre,
    actividadTipo: api.actividad.modalidad,
    profesoraId: String(api.id_profesora),
    profesoraNombre: `${api.profesora.usuario.nombre} ${api.profesora.usuario.apellido}`,
    tema: temaDeModalidad(api.actividad.modalidad),
    diaSemana: diaDesdeNumero(api.dia_semana),
    horaInicio: horaDesdeApi(api.hora_inicio),
    horaFin: horaDesdeApi(api.hora_fin),
    cupoPropio: api.cupo_maximo,
    cupoMaximo: api.cupo_maximo_efectivo,
    inscriptos: api.inscriptos,
  };
}

export function useCronogramaProfesor(idProfesora: string | null) {
  const query = useQuery({
    queryKey: ["horarios", "profesora", idProfesora],
    queryFn: () => (idProfesora ? listarHorariosDeProfesora(idProfesora) : Promise.resolve([])),
    enabled: idProfesora != null,
    staleTime: 5 * 60_000,
  });

  const horarios = useMemo(() => {
    if (!query.data) return [];
    return query.data
      .map(aHorarioDocente)
      .sort((a, b) => {
        const diaComp = a.diaSemana.localeCompare(b.diaSemana);
        if (diaComp !== 0) return diaComp;
        return a.horaInicio.localeCompare(b.horaInicio);
      });
  }, [query.data]);

  const horariosPorDia = useMemo(() => {
    const mapa: Record<DiaSemana, Horario[]> = {
      LUNES: [],
      MARTES: [],
      MIERCOLES: [],
      JUEVES: [],
      VIERNES: [],
      SABADO: [],
      DOMINGO: [],
    };

    for (const h of horarios) {
      mapa[h.diaSemana].push(h);
    }

    for (const dia of Object.keys(mapa) as DiaSemana[]) {
      mapa[dia].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    }

    return mapa;
  }, [horarios]);

  const metricas = useMemo(() => {
    const totalClases = horarios.length;
    let totalMinutos = 0;
    const actividadesUnicas = new Set<string>();
    let totalCupoMaximo = 0;

    for (const h of horarios) {
      const mins = Math.max(0, timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio));
      totalMinutos += mins;
      actividadesUnicas.add(h.actividadNombre);
      if (h.cupoMaximo) {
        totalCupoMaximo += h.cupoMaximo;
      }
    }

    const totalHoras = Math.round((totalMinutos / 60) * 10) / 10;

    return {
      totalClases,
      totalHoras,
      actividadesDistintas: actividadesUnicas.size,
      nombresActividades: Array.from(actividadesUnicas),
      totalCupoMaximo,
    };
  }, [horarios]);

  return {
    horarios,
    horariosPorDia,
    metricas,
    cargando: query.isPending,
    error: query.error,
    reintentar: query.refetch,
  };
}
