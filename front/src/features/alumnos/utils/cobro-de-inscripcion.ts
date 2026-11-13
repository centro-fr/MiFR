import type { AlumnoDetalle, InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import type { DatosAlumnoCobro, DatosInscripcionCobro } from "@/features/cobros/components/modal-registrar-cobro";

// Un alumno con varios planes vigentes paga cada uno por separado: el cobro va siempre contra una
// inscripción puntual.

/** Lo que necesita el modal de cobro para cobrar una inscripción del alumno. */
export function datosDeCobro(alumno: AlumnoDetalle, inscripcion: InscripcionDeAlumno) {
  const datosAlumno: DatosAlumnoCobro = {
    id_alumno: alumno.id_alumno,
    nombre: alumno.usuario.nombre,
    apellido: alumno.usuario.apellido,
    dni: alumno.usuario.dni,
  };
  const datosInscripcion: DatosInscripcionCobro = {
    id_inscripcion: inscripcion.id_inscripcion,
    id_plan: inscripcion.plan.id_plan,
    nombre_plan: inscripcion.plan.nombre,
    precio_vigente: inscripcion.plan.precio,
    situacion_cuota: inscripcion.situacion_cuota,
  };
  return {
    alumno: datosAlumno,
    inscripcion: datosInscripcion,
    plan: { id: String(inscripcion.plan.id_plan), nombre: inscripcion.plan.nombre },
  };
}
