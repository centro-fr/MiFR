// Orden de la presentación a la cátedra: agregar, quitar o reordenar filminas se hace solo acá.
// Es un script clásico (no un módulo ES) para que todo funcione abriendo los HTML
// con doble clic: los navegadores bloquean los módulos ES cargados desde file://.
// `segundos` es el tiempo que el guion le asigna a cada filmina (propuesta-profe-presentacion.md);
// si se omite, rige --tiempo-por-filmina de tema.css.
window.FILMINAS = [
  { archivo: '01-portada.html', titulo: 'Portada', segundos: 30 },
  { archivo: '02-la-organizacion-hoy.html', titulo: 'La organización hoy', segundos: 40 },
  { archivo: '02b-como-funciona-hoy.html', titulo: 'Cómo funciona hoy', segundos: 40 },
  { archivo: '03-problemas-y-oportunidades.html', titulo: 'Por qué un sistema a medida', segundos: 70 },
  { archivo: '04-objetivo-y-roles.html', titulo: 'MiFR', segundos: 45 },
  { archivo: '05-cuotas-al-dia.html', titulo: 'Cuotas al día', segundos: 75 },
  { archivo: '06-asistencia.html', titulo: 'Asistencia sin cartón', segundos: 75 },
  { archivo: '07-honorarios.html', titulo: 'Honorarios en un clic', segundos: 60 },
  { archivo: '08-app-alumna.html', titulo: 'La app de la alumna', segundos: 75 },
  { archivo: '09-demo.html', titulo: 'Demo en vivo', segundos: 135 },
  { archivo: '10-arquitectura-y-stack.html', titulo: 'Arquitectura y Stack Tecnológico', segundos: 75 },
  { archivo: '11-gestion-del-proyecto.html', titulo: 'Gestión del Proyecto', segundos: 60 },
  { archivo: '12-proximos-pasos.html', titulo: 'Próximos pasos y cierre', segundos: 60 },
];
