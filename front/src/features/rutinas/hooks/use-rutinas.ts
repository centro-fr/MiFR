import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import {
  actualizarRutina,
  corregirMedicion,
  crearRutina,
  darDeBajaMedicion,
  eliminarRutina,
  listarMedicionesDeAlumno,
  listarMisAlumnos,
  listarRutinasDeAlumno,
  registrarMedicion,
  type ActualizarRutinaBody,
} from "@/features/rutinas/api/rutinas-api";
import type { CorregirMedicionBody, CrearRutinaBody, RegistrarMedicionBody } from "@/features/rutinas/schemas/rutinas";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

const RUTINAS_QUERY_KEY = ["rutinas"] as const;
const rutinasKey = (idAlumno: number) => [...RUTINAS_QUERY_KEY, "alumno", idAlumno, "rutinas"] as const;
const medicionesKey = (idAlumno: number) => [...RUTINAS_QUERY_KEY, "alumno", idAlumno, "mediciones"] as const;

// Solo cambian cuando alguien carga una rutina o carga, corrige o da de baja una medición, y eso invalida
// la consulta.
const UN_MINUTO = 60_000;

/** US-28: el alumno de la sesión o los menores del tutor. Cambia solo si cambia quién está a cargo. */
export function useMisAlumnos() {
  return useQuery({ queryKey: [...RUTINAS_QUERY_KEY, "mis-alumnos"], queryFn: listarMisAlumnos, staleTime: 5 * UN_MINUTO });
}

export function useRutinasDeAlumno(idAlumno: number, enabled: boolean) {
  return useQuery({
    queryKey: rutinasKey(idAlumno),
    queryFn: () => listarRutinasDeAlumno(idAlumno),
    staleTime: UN_MINUTO,
    enabled,
  });
}

export function useMedicionesDeAlumno(idAlumno: number, enabled: boolean) {
  return useQuery({
    queryKey: medicionesKey(idAlumno),
    queryFn: () => listarMedicionesDeAlumno(idAlumno),
    staleTime: UN_MINUTO,
    enabled,
  });
}

export function useCrearRutina(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuerpo: CrearRutinaBody) => crearRutina(cuerpo),
    // La anterior también cambia (pasa al historial con fecha de fin): se vuelve a pedir el listado.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rutinasKey(idAlumno) }),
  });
}

export function useActualizarRutina(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idRutina, cuerpo }: { idRutina: number; cuerpo: ActualizarRutinaBody }) =>
      actualizarRutina(idRutina, cuerpo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rutinasKey(idAlumno) }),
  });
}

export function useEliminarRutina(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idRutina: number) => eliminarRutina(idRutina),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rutinasKey(idAlumno) }),
  });
}

export function useRegistrarMedicion(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuerpo: RegistrarMedicionBody) => registrarMedicion(cuerpo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: medicionesKey(idAlumno) }),
  });
}

// Corregir y dar de baja refrescan el historial aunque fallen: si otra persona ya dio de baja la medición,
// el back responde 403 o 404 y así deja de verse.

export function useCorregirMedicion(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idRegistro, cuerpo }: { idRegistro: number; cuerpo: CorregirMedicionBody }) => corregirMedicion(idRegistro, cuerpo),
    onSettled: () => queryClient.invalidateQueries({ queryKey: medicionesKey(idAlumno) }),
  });
}

export function useDarDeBajaMedicion(idAlumno: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idRegistro: number) => darDeBajaMedicion(idRegistro),
    onSettled: () => queryClient.invalidateQueries({ queryKey: medicionesKey(idAlumno) }),
  });
}

/**
 * Nombre de cada profesora por id, para decir quién armó la rutina. El back manda solo el id; el
 * listado de profesoras ya suele estar en caché. Si no se puede pedir, la pantalla se arma sin nombres.
 */
export function useNombresDeProfesoras(): Map<number, string> {
  const { hasPermission } = usePermissions();
  const { data } = useQuery({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
    staleTime: 5 * UN_MINUTO,
    enabled: hasPermission("HORARIOS_VER"),
  });
  return useMemo(
    () => new Map((data ?? []).map((profesora) => [Number(profesora.id), `${profesora.nombre} ${profesora.apellido}`])),
    [data],
  );
}
