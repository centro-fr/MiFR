/**
 * Calcula la edad en años a partir de una fecha de nacimiento (formato ISO o YYYY-MM-DD).
 * Si la fecha es inválida o vacía, retorna null.
 */
export function calcularEdad(fechaNacimiento: string | Date | null | undefined): number | null {
  if (!fechaNacimiento) return null;

  const fecha = typeof fechaNacimiento === "string" ? new Date(`${fechaNacimiento}T00:00:00`) : fechaNacimiento;
  if (isNaN(fecha.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const mesActual = hoy.getMonth();
  const mesNac = fecha.getMonth();

  if (mesActual < mesNac || (mesActual === mesNac && hoy.getDate() < fecha.getDate())) {
    edad--;
  }

  return edad >= 0 ? edad : null;
}

/**
 * Determina si una persona es menor de 18 años a partir de su fecha de nacimiento.
 */
export function esMenorDeEdad(fechaNacimiento: string | Date | null | undefined): boolean {
  const edad = calcularEdad(fechaNacimiento);
  if (edad === null) return false;
  return edad < 18;
}
