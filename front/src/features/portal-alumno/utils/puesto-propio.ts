import type { RankingAsistencia } from "../schemas/ranking-asistencia";

/**
 * El puesto del alumno que se está mirando. Al tutor el ranking le marca como propios a todos sus menores:
 * se toma el del elegido.
 */
export function puestoDe(ranking: RankingAsistencia | undefined, idAlumno: number | undefined) {
  if (!ranking) return undefined;
  return ranking.propias.find((fila) => fila.id_alumno === idAlumno) ?? (idAlumno === undefined ? ranking.propias[0] : undefined);
}
