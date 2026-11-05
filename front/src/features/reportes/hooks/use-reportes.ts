import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarActividades } from "@/features/actividades/api/actividades-api";
import { ACTIVIDADES_QUERY_KEY } from "@/features/actividades/hooks/use-actividades";
import { listarAlumnos } from "@/features/alumnos/api/alumnos-api";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-alumnos";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { listarPlanes } from "@/features/planes/api/planes-api";
import { PLANES_QUERY_KEY } from "@/features/planes/hooks/use-planes";
import {
  obtenerCuotasVencidas,
  obtenerEstadisticasInscripciones,
  obtenerEstadisticasPlanes,
  obtenerInformeAsistencia,
  obtenerInformeCobranza,
  obtenerInformeOcupacion,
} from "@/features/reportes/api/reportes-api";
import type {
  FiltrosCobranza,
  FiltrosCuotasVencidas,
  FiltrosInformeAsistencia,
  FiltrosInscripciones,
  FiltrosOcupacion,
  FiltrosPlanesReporte,
} from "@/types/reportes";

const REPORTES_QUERY_KEY = ["reportes"] as const;
const informeKey = (filtros: FiltrosInformeAsistencia, offset: number) => [...REPORTES_QUERY_KEY, "asistencia", filtros, offset] as const;

// Cambia cada vez que se cierra una clase: dato dinámico. Profesoras y actividades cambian poco.
const TREINTA_SEGUNDOS = 30_000;
const CINCO_MINUTOS = 5 * 60_000;
const ESPERA_AL_ESCRIBIR_MS = 300;
const SUGERENCIAS_DE_ALUMNOS = 8;

/**
 * Al pasar de página se sigue viendo la anterior mientras carga. Con otros filtros no: mostrar los
 * números de otro período bajo los filtros nuevos sería engañoso.
 */
export function useInformeAsistencia(filtros: FiltrosInformeAsistencia, offset: number) {
  return useQuery({
    queryKey: informeKey(filtros, offset),
    queryFn: () => obtenerInformeAsistencia(filtros, offset),
    staleTime: TREINTA_SEGUNDOS,
    placeholderData: (anterior, consultaAnterior) =>
      consultaAnterior && JSON.stringify(consultaAnterior.queryKey[2]) === JSON.stringify(filtros) ? anterior : undefined,
  });
}

/**
 * US-35. Sin placeholderData al cambiar de año o de filtro, por lo mismo que el de asistencia. Para
 * comparar años se usa uno por año; `habilitado` evita pedir los años que no se están mirando.
 */
export function useEstadisticasInscripciones(filtros: FiltrosInscripciones, habilitado = true) {
  return useQuery({
    queryKey: [...REPORTES_QUERY_KEY, "inscripciones", filtros],
    queryFn: () => obtenerEstadisticasInscripciones(filtros),
    staleTime: CINCO_MINUTOS,
    enabled: habilitado,
  });
}

/** Con los dados de baja: un plan que ya no se ofrece pudo tener altas en el año consultado. */
export function usePlanesParaFiltro() {
  return useQuery({ queryKey: [...PLANES_QUERY_KEY, "con-bajas"], queryFn: listarPlanes, staleTime: CINCO_MINUTOS });
}

export function useProfesorasParaFiltro() {
  return useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: CINCO_MINUTOS });
}

export function useActividadesParaFiltro() {
  return useQuery({ queryKey: ACTIVIDADES_QUERY_KEY, queryFn: listarActividades, staleTime: CINCO_MINUTOS });
}

function useTextoConEspera(texto: string): string {
  const [conEspera, setConEspera] = useState(texto);
  useEffect(() => {
    const espera = setTimeout(() => setConEspera(texto), ESPERA_AL_ESCRIBIR_MS);
    return () => clearTimeout(espera);
  }, [texto]);
  return conEspera;
}

/** Sugerencias del buscador de alumno: se pide recién con 2 letras y después de dejar de escribir. */
export function useSugerenciasDeAlumnos(texto: string) {
  const busqueda = useTextoConEspera(texto.trim());
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, "sugerencias-informe", busqueda],
    queryFn: () =>
      listarAlumnos({
        busqueda,
        estado: "TODOS",
        id_plan: "",
        id_profesora: "",
        id_actividad: "",
        incluir_bajas: true,
        limit: SUGERENCIAS_DE_ALUMNOS,
        offset: 0,
      }),
    enabled: busqueda.length >= 2,
    staleTime: TREINTA_SEGUNDOS,
  });
}

/** US-36: alumnos activos por plan. */
export function useEstadisticasPlanes(filtros: FiltrosPlanesReporte) {
  return useQuery({ queryKey: [...REPORTES_QUERY_KEY, "planes", filtros], queryFn: () => obtenerEstadisticasPlanes(filtros), staleTime: CINCO_MINUTOS });
}

/** US-37: inscriptos sobre cupo de cada horario. */
export function useInformeOcupacion(filtros: FiltrosOcupacion) {
  return useQuery({ queryKey: [...REPORTES_QUERY_KEY, "ocupacion", filtros], queryFn: () => obtenerInformeOcupacion(filtros), staleTime: CINCO_MINUTOS });
}

// Al pasar de página se sigue viendo la anterior mientras carga, como en asistencia; con otros filtros, no.
export function useInformeCobranza(filtros: FiltrosCobranza, offset: number) {
  return useQuery({
    queryKey: [...REPORTES_QUERY_KEY, "cobranza", filtros, offset],
    queryFn: () => obtenerInformeCobranza(filtros, offset),
    staleTime: TREINTA_SEGUNDOS,
    placeholderData: (anterior, consultaAnterior) =>
      consultaAnterior && JSON.stringify(consultaAnterior.queryKey[2]) === JSON.stringify(filtros) ? anterior : undefined,
  });
}

/** US-34: alumnos con la cuota vencida hoy. */
export function useCuotasVencidas(filtros: FiltrosCuotasVencidas, offset: number) {
  return useQuery({
    queryKey: [...REPORTES_QUERY_KEY, "cuotas-vencidas", filtros, offset],
    queryFn: () => obtenerCuotasVencidas(filtros, offset),
    staleTime: TREINTA_SEGUNDOS,
    placeholderData: (anterior, consultaAnterior) =>
      consultaAnterior && JSON.stringify(consultaAnterior.queryKey[2]) === JSON.stringify(filtros) ? anterior : undefined,
  });
}
