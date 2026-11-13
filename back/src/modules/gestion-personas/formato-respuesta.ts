// Cómo salen en las respuestas de GestionPersonas los datos que llegan de la base.

export function nombreCompleto({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre} ${apellido}`;
}

// Las columnas DATE llegan a las 00:00 UTC y las TIME el 01/01/1970 en UTC: se leen tal cual.
export function diaComoTexto(dia: Date): string {
  return dia.toISOString().slice(0, 10);
}

export function horaComoTexto(hora: Date): string {
  return hora.toISOString().slice(11, 16);
}
