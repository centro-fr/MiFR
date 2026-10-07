// Orden de la presentación a la cátedra: agregar, quitar o reordenar filminas se hace solo acá.
// Es un script clásico (no un módulo ES) para que todo funcione abriendo los HTML
// con doble clic: los navegadores bloquean los módulos ES cargados desde file://.
// `segundos` es el tiempo que el guion le asigna a cada filmina (propuesta-profe-presentacion.md);
// si se omite, rige --tiempo-por-filmina de tema.css.
window.FILMINAS = [
  { archivo: '01-portada.html', titulo: 'Portada', segundos: 30 },
  { archivo: '02-la-organizacion-hoy.html', titulo: 'La organización y cómo funciona hoy', segundos: 80 },
  { archivo: '03-problemas-y-oportunidades.html', titulo: 'Problemas, oportunidades y por qué a medida', segundos: 70 },
  { archivo: '04-objetivo-y-roles.html', titulo: 'MiFR: objetivo y roles', segundos: 45 },
  { archivo: '05-alcance.html', titulo: 'Alcance: 12 épicas, 37 US', segundos: 50 },
  { archivo: '06-trazabilidad.html', titulo: 'Trazabilidad: problema → US', segundos: 55 },
  { archivo: '07-reglas-del-negocio.html', titulo: 'Las reglas del negocio dentro del sistema', segundos: 75 },
  { archivo: '08-un-dia-con-mifr.html', titulo: 'Un día con MiFR: recorrido por rol', segundos: 90 },
  { archivo: '09-modelo-y-estados.html', titulo: 'Modelo de datos y estados', segundos: 60 },
  { archivo: '10-ejemplo-de-us.html', titulo: 'Ejemplo completo de una US', segundos: 35 },
  { archivo: '11-rnf-y-arquitectura.html', titulo: 'Requerimientos no funcionales y arquitectura', segundos: 40 },
  { archivo: '12-scrum-adaptado.html', titulo: 'Scrum adaptado al equipo', segundos: 75 },
  { archivo: '13-story-map-y-sprint-1.html', titulo: 'Story Map y resultado del Sprint 1', segundos: 75 },
  { archivo: '14-proximos-pasos.html', titulo: 'Próximos pasos y preguntas', segundos: 60 },
];
