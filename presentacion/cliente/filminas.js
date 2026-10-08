// Orden de la presentación: agregar, quitar o reordenar filminas se hace solo acá.
// Es un script clásico (no un módulo ES) para que todo funcione abriendo los HTML
// con doble clic: los navegadores bloquean los módulos ES cargados desde file://.
// `segundos` es el tiempo que el guion le asigna a cada filmina (propuesta-presentacion.md);
// si se omite, rige --tiempo-por-filmina de tema.css.
window.FILMINAS = [
  { archivo: '01-portada.html', titulo: 'Menos cuaderno, más entrenamiento', segundos: 45 },
  { archivo: '02-un-dia-en-fr.html', titulo: 'Un día en FR hoy', segundos: 90 },
  { archivo: '03-costo-sin-sistema.html', titulo: 'Lo que cuesta no tener sistema', segundos: 75 },
  { archivo: '04-lo-que-nos-pediste.html', titulo: 'Lo que nos pediste', segundos: 45 },
  { archivo: '05-presentamos-mifr.html', titulo: 'Presentamos MiFR', segundos: 45 },
  { archivo: '06-cuotas-al-dia.html', titulo: 'Pilar 1 · Cuotas al día', segundos: 90 },
  { archivo: '07-asistencia-sin-carton.html', titulo: 'Pilar 2 · Asistencia sin cartón', segundos: 90 },
  { archivo: '08-honorarios-en-un-clic.html', titulo: 'Pilar 3 · Honorarios en un clic', segundos: 75 },
  { archivo: '09-app-de-la-alumna.html', titulo: 'El diferencial: la app de la alumna', segundos: 90 },
  { archivo: '10-antes-y-despues.html', titulo: 'Antes y después', segundos: 45 },
  { archivo: '11-como-lo-implementamos.html', titulo: 'Cómo lo implementamos', segundos: 60 },
  { archivo: '12-cierre.html', titulo: 'Cierre y preguntas', segundos: 90 },
];
