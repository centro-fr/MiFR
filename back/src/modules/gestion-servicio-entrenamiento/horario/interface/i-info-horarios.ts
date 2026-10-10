import type { HorarioRespuesta } from "../horario.types.js";

export interface IInfoHorarios {
  buscarPorIds(ids: number[]): Promise<HorarioRespuesta[]>;
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
}
