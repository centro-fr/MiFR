export interface Profesora {
  id_profesora: number;
  id_usuario: number;
  especialidad: string | null;
  fecha_alta: string;
  fecha_baja: string | null;
}

export interface CrearProfesoraInput {
  id_usuario: number;
  especialidad?: string;
}
