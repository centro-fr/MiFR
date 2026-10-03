export interface IInfoHorarios {
  tieneActivosDeActividad(idActividad: number): Promise<boolean>;
  tieneActivosDeProfesora(idProfesora: number): Promise<boolean>;
}
