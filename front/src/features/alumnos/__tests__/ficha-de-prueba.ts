import type { FichaAlumno } from "@/types/alumno";

// Ficha completa de una alumna mayor de edad; cada test pisa solo lo que le importa.
export function crearFicha(cambios: Partial<FichaAlumno> = {}): FichaAlumno {
  return {
    id: "1",
    nombre: "Martina",
    apellido: "Bianchi",
    dni: "38412985",
    email: "martina.bianchi@example.com",
    telefono: "+54 351 445-8910",
    fechaNacimiento: "1996-04-24",
    direccion: "Av. Colón 4200, Córdoba",
    estado: "ACTIVO",
    fechaAlta: "2026-03-15T13:00:00.000Z",
    fechaBaja: null,
    contactoEmergencia: { nombre: "Carla Bianchi", telefono: "+54 351 987-6543" },
    aptoMedico: true,
    fechaAptoMedico: "2026-03-10",
    observaciones: "Esguince de tobillo en 2022.",
    responsable: null,
    ...cambios,
  };
}
