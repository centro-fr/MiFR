// Actividad como la usa la interfaz. Sale de ActividadApi (features/actividades/schemas).

export type ModalidadActividad = "GRUPAL" | "PERSONALIZADA";

export interface Actividad {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modalidad: ModalidadActividad;
  /** null = sin límite de cupo (solo en GRUPAL). */
  cupoMaximo: number | null;
  activo?: boolean;
  requiereMedidas?: boolean;
}
