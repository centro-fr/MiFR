# Checklist de honorarios

## Regla acordada

Cada profesora recibe el 50% de los ingresos por cuotas atribuibles a sus alumnos inscriptos. No hay un mínimo de alumnos; los 10 alumnos fueron solo un ejemplo.

Ejemplo: si los ingresos por cuotas atribuibles a una profesora suman $200.000, sus honorarios son $200.000 × 50% = $100.000.

Esta regla reemplaza la tarifa fija por alumno que aparecía en US-23 y en la especificación funcional, que ya fueron actualizadas. Las definiciones de abajo marcadas como "propuesta" se tomaron como base de trabajo del Sprint 5 y deben confirmarse con el equipo antes de cerrar la implementación.

## Definiciones pendientes

- [x] Actualizar US-23 y la especificación funcional para reflejar el 50% de los ingresos por cuotas, sin mínimo de alumnos. US-23 actualizada; revisar `docs/sdd/07-honorarios/spec.md` y `plan.md`.
- [x] Definir el período de atribución y qué inscripciones generan honorarios. Propuesta (a confirmar con el equipo): cuentan las inscripciones activas, o dadas de baja que hayan cobrado; se excluyen preinscripciones e inscripciones sin cargo.
- [x] Definir si el porcentaje se calcula sobre cuotas cobradas o cuotas emitidas, y cómo se asigna el período cuando el pago se realiza tarde. Propuesta (a confirmar con el equipo): se calcula sobre pagos CONFIRMADOS dentro del mes calendario; un pago tardío cuenta en el mes en que se confirma.
- [x] Acordar el tratamiento de pagos parciales, descuentos, devoluciones y pagos que cubren más de una cuota. Propuesta (a confirmar con el equipo): cuenta el monto efectivamente confirmado en el mes del pago. Las devoluciones siguen sin definirse.
- [x] Definir cómo se atribuyen las cuotas cuando una inscripción involucra a más de una profesora. Propuesta (a confirmar con el equipo): se atribuyen a la profesora de la inscripción.
- [x] Definir cómo se combinan los honorarios por cuotas y los ajustes por suplencias de US-24. Propuesta (a confirmar con el equipo): los ajustes por hora de suplencia se aplican sobre el honorario calculado por cuotas (crédito a la suplente, débito a la titular).
- [ ] Actualizar las tareas técnicas y agregar pruebas para el 50% y los casos borde acordados. Tareas actualizadas en `docs/sdd/07-honorarios/tasks.md`; faltan implementar el cálculo y las pruebas.