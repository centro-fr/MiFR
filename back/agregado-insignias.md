# Checklist de cierre del último sprint: insignias y ranking

> Usar al terminar el último sprint. Marcar una casilla solo cuando el cambio esté implementado y verificado. Los pendientes de otros módulos se siguen por separado.

## Insignias

- [x] Confirmar que `alumnos.fecha_alta` ya existe en `schema.prisma`; no requiere migración. El tiempo transcurrido (por ejemplo, “Hace 7 meses”) se calcula en el front.
- [x] Agregar el enum `tipo_insignia` con `MES_PERFECTO`, `RACHA`, `TOTAL_CLASES` y `PODIO_MES`.
- [x] Agregar los modelos `insignias` y `alumno_insignias`, sus relaciones con `alumnos` y la clave única del catálogo por `codigo`.
- [x] Mantener `periodo` como campo obligatorio en la clave primaria compuesta; usar `""` para insignias sin período y `AAAA-MM` para las mensuales. Así una insignia mensual puede otorgarse de nuevo en otro mes.
- [x] Crear y aplicar la migración de base de datos correspondiente.
- [x] Cargar el catálogo inicial: Racha de 10 y 25 clases, Total de 50 y 100 clases, Mes perfecto y Podio del mes.
- [x] No guardar ícono ni color en la base de datos; el front los determina según el tipo de insignia.

## Otorgamiento y ranking

- [x] Al registrar una asistencia, recalcular la racha actual y el total de clases del alumno. Se derivan del historial de clases dictadas al consultar la ficha o el ranking (ver SPRINT-5.md).
- [x] Otorgar las insignias de racha y total de clases al alcanzar sus umbrales, sin duplicar otorgamientos.
- [x] Definir y probar la regla de racha: una falta (`asistio = false`) la corta; una clase cancelada o una suplencia no la corta.
- [x] Implementar un cierre mensual, ejecutado el día 1, para procesar el mes anterior.
- [x] Otorgar Mes perfecto si el alumno asistió a todas sus clases dictadas del mes; excluir las clases canceladas.
- [x] Otorgar Podio del mes a los tres primeros del ranking de asistencia de ese mes.
- [x] Agregar `RANKING_MINIMO_CLASES = 4` a `parametros_sistema` y usarlo para excluir del ranking a quienes no alcancen el mínimo.
- [x] Implementar `GET /reportes/ranking-asistencia?desde&hasta&actividad`.
- [x] Devolver por alumno: nombre, clases previstas, clases asistidas, porcentaje, racha actual e insignias (`codigo`, `nombre`, `descripcion`, `tipo`).
- [x] Ordenar el ranking por porcentaje descendente, clases asistidas descendente y nombre ascendente.
- [x] Actualizar US-30 para documentar el desempate por clases asistidas y luego por nombre, reemplazando la regla actual de orden alfabético directo en caso de empate.

## Ficha y permisos

- [x] Implementar `GET /alumnos/:id/insignias` para devolver todas las insignias del catálogo con su estado `obtenida` y progreso hacia el umbral (por ejemplo, `74/100`).
- [x] Incluir insignias inactivas solo si corresponde mostrarlas en la ficha; definir explícitamente su representación antes de cerrar el endpoint. El DER no tiene insignias inactivas: la ficha muestra el catálogo completo, cada una con `obtenida`, y las no obtenidas son las bloqueadas de US-31.
- [x] Agregar `REPORTES_RANKING_VER` al catálogo de permisos y asignarlo a propietaria y profesoras.
- [x] Agregar `INSIGNIAS_VER_PROPIAS` para que el alumno consulte sus insignias desde el portal.
- [x] Aplicar y probar los permisos en los endpoints; el alumno no debe poder consultar la ficha de otro alumno.

## Verificación de cierre

- [x] Agregar pruebas para umbrales, rachas, cancelaciones, suplencias, mes perfecto, podio y progreso de insignias.
- [x] Agregar pruebas de integración para ambos endpoints, filtros, orden del ranking y permisos.
- [x] Actualizar la documentación/OpenAPI con los endpoints, parámetros, respuestas y permisos.
- [x] Ejecutar las pruebas relevantes y confirmar que la migración se aplica correctamente.

## Otros pendientes informados

Estos temas no forman parte de la entrega de insignias y ranking; mantenerlos visibles para el cierre general del proyecto.

- [ ] Resolver los pendientes de rutinas.
- [ ] Completar los endpoints de progreso.
- [x] Implementar `GET /reportes/inscripciones?desde&hasta`, usando `alumnos.fecha_alta` y `alumnos.fecha_baja` para el período.
- [x] Implementar `GET /reportes/planes`, mostrando inscripciones activas por plan y el `plan_precios` vigente.
- [x] Implementar `GET /reportes/ocupacion`, mostrando inscriptos por horario contra el cupo definido para el horario o, si corresponde, para la actividad.
- [x] Implementar `GET /reportes/cobranza?desde&hasta`, mostrando las cuotas del mes y los pagos `CONFIRMADOS`, separados por forma de pago.
- [ ] Completar los demás reportes que sigan pendientes.
- [ ] Seguir honorarios en el checklist independiente [honorarios-pendientes.md](honorarios-pendientes.md).
