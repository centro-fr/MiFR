import type { Alumno, EstadoAlReactivar } from "../alumno.types.js";

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
  // ACTIVO si ya había pagado alguna vez; si no, INACTIVO, como un pre-inscripto que espera su
  // primer pago. El alumno y su usuario quedan en el mismo estado.
  reactivar(id: number, estado: EstadoAlReactivar): Promise<Alumno>;
}
