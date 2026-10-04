export type GrupoActividad = 'HIBRIDA' | 'GRUPAL' | 'INDIVIDUAL';
export type ModalidadAlta = 'grupal' | 'personalizada';

export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  tipoBadge: string;
  cupo: string;
  grupo: GrupoActividad;
  activa: boolean;
  turnosPendientes?: number; // Para el modal de baja lógica
  alumnosInscriptos?: number;
}