import type { HorarioRespuesta } from "../horario.types.js";

export interface IInfoHorarios {
  buscarPorIds(ids: number[]): Promise<HorarioRespuesta[]>;
  // Los que no están dados de baja, ordenados por día y hora: el cronograma del panel público (US-32).
  listarVigentes(): Promise<HorarioRespuesta[]>;
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
}
