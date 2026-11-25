// La misma edad de corte que el back (shared/utils/edad.ts): la usan el alta del alumno y los planes
// solo para menores.
export const MAYORIA_DE_EDAD = 18;

export function edad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  const cumplioEsteAnio =
    hoy.getUTCMonth() > nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() >= nacimiento.getUTCDate());
  return hoy.getUTCFullYear() - nacimiento.getUTCFullYear() - (cumplioEsteAnio ? 0 : 1);
}
