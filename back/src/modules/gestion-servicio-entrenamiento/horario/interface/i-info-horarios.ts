import type { HorarioRespuesta } from "../horario.types.js";

export interface IInfoHorarios {
  buscarPorIds(ids: number[]): Promise<HorarioRespuesta[]>;
  tieneActivosDeActividad(idActividad: number): Promise<boolean>;
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
}
