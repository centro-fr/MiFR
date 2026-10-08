import type { Alumno } from "../alumno.types.js";

// Interfaz provista por Alumno (vista arquitectónica) para Inscripcion: consultar alumnos y
// acompañar los cambios de estado de su inscripción (US-07 y US-08). Las tres operaciones de
// estado son idempotentes o fallan sin cambios, para que Inscripcion pueda reintentarlas.
export interface IInfoAlumnos {
  buscarPorId(id: number): Promise<Alumno | null>;
  buscarPorIds(ids: number[]): Promise<Alumno[]>;
  // Al confirmarse el primer pago: alumno y usuario pasan a ACTIVO y quien entra al sistema
  // recibe su rol (ALUMNO, o TUTOR si el alumno tiene responsable). Repetirla no cambia nada.
  activar(id: number): Promise<Alumno>;
  darDeBaja(id: number): Promise<Alumno>;
  reactivar(id: number): Promise<Alumno>;
}
