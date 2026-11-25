// US-06: la edad de corte. Pasa a parametros_sistema cuando exista ese componente.
const MAYORIA_DE_EDAD = 18;

// La lleva shared porque la usan Alumno (tutor y email) e Inscripcion (planes solo para menores).
export function esMenorDeEdad(fechaNacimiento: Date, hoy: Date): boolean {
  const cumpleMayoria = new Date(
    Date.UTC(
      fechaNacimiento.getUTCFullYear() + MAYORIA_DE_EDAD,
      fechaNacimiento.getUTCMonth(),
      fechaNacimiento.getUTCDate(),
    ),
  );
  return cumpleMayoria > hoy;
}
