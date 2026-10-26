import type { PreInscripcionPendiente } from "@/types/alta-definitiva";

// Pre-inscripción de una alumna mayor de edad; cada test pisa solo lo que le importa.
export function crearPendiente(cambios: Partial<PreInscripcionPendiente> = {}): PreInscripcionPendiente {
  return {
    idInscripcion: "1",
    idAlumno: "1",
    nombre: "Sofía",
    apellido: "Medina",
    dni: "38111222",
    email: "sofia.medina@example.com",
    telefono: "+54 351 555-0101",
    fechaNacimiento: "1996-08-14",
    tutor: null,
    idPlan: "1",
    idPromocion: null,
    nombrePlan: "Básico",
    precio: 25000,
    profesora: "Lucía Gómez",
    horarios: [
      { dia: "LUNES", horaInicio: "18:00", horaFin: "19:00", actividad: "Funcional Grupal" },
      { dia: "MIERCOLES", horaInicio: "18:00", horaFin: "19:00", actividad: "Funcional Grupal" },
    ],
    fechaPreInscripcion: "2026-10-08T15:00:00.000Z",
    reserva: null,
    ...cambios,
  };
}
