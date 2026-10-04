export type ModalidadActividad = "GRUPAL" | "PERSONALIZADA";

export interface Actividad {
  id_actividad: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modalidad: ModalidadActividad;
  cupo_maximo: number | null;
  activo: boolean;
}

export interface CrearActividadInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  modalidad: ModalidadActividad;
  cupo_maximo?: number | null;
}

export interface ActualizarActividadInput {
  nombre?: string;
  descripcion?: string;
  modalidad?: ModalidadActividad;
  cupo_maximo?: number | null;
}
