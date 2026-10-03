export interface IInfoHorarios {
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
}
