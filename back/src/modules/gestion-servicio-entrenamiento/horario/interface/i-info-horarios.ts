import type { HorarioRespuesta } from "../horario.types.js";

export interface IInfoHorarios {
  buscarPorIds(ids: number[]): Promise<HorarioRespuesta[]>;
  // Los que no están dados de baja, ordenados por día y hora: el cronograma del panel público (US-32).
  listarVigentes(): Promise<HorarioRespuesta[]>;
  listarActivosDelDia(fecha: Date): Promise<HorarioRespuesta[]>;
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
  // US-04: lo usa el proceso AplicadorProgramados. Los horarios con la baja programada y la baja
  // definitiva cuando ya no les queda ningún inscripto (false si todavía queda alguno).
  listarConBajaProgramada(): Promise<HorarioRespuesta[]>;
  completarBajaProgramada(id: number): Promise<boolean>;
}
