/**
 * Devuelve el nombre del día de la semana correspondiente a un índice (1 = Lunes, ..., 7 = Domingo).
 */
export function diaSemana(numero: number): string {
  return ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][numero] ?? "";
}
