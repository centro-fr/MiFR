export type EstadoClase = "PROGRAMADA" | "DICTADA" | "CANCELADA";

export interface ProfesoraSuplencia {
  id: string;
  nombre: string;
  apellido: string;
}

export interface Suplencia {
  idClase: string;
  idHorario: string;
  fechaClase: string;
  estadoClase: EstadoClase;
  actividad: { id: string; nombre: string };
  horaInicio: string;
  horaFin: string;
  titular: ProfesoraSuplencia;
  suplente: ProfesoraSuplencia;
  motivo: string | null;
}

export interface SuplenciaRegistrada {
  suplencia: Suplencia;
  advertencia: string | null;
}
