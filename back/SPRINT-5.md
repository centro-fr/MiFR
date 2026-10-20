# Sprint 5 – Backend

Sprint 5: **Cierre de funcionalidades pendientes**. Este documento reúne el alcance backend que quedó pendiente del Sprint 4 y las historias marcadas para el Sprint 5, dividido en tres partes equilibradas para trabajar en paralelo sin dependencias cruzadas:

| US | Historia / alcance | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-23 | Informe y liquidación mensual de honorarios | Pendiente; regla de cálculo por actualizar | Rosario |
| US-27 | Carga de rutinas y evolución física | Pendiente | Rosario |
| US-28 | Consulta de rutina y progreso por alumno/tutor | Pendiente | Rosario |
| US-30 | Ranking de asistencia | Pendiente | Nicolas |
| US-31 | Insignias y racha de asistencia | Pendiente | Nicolas |
| US-33 | Informe de asistencia | Pendiente | Nicolas |
| US-37 | Ocupación de horarios | Pendiente | Nicolas |
| US-34 | Informe de cuotas vencidas | Hecho | Francisco |
| — | Informe de cobranza por período | Hecho | Francisco |
| US-36 | Estadísticas de planes | Hecho | Francisco |
| US-35 | Estadísticas de inscriptos por mes | Hecho | Francisco |

Fuentes: `SPRINT-4.md`, `agregado-insignias.md`, `honorarios-pendientes.md`, `docs/sdd/07-honorarios/tasks.md`, `docs/sdd/09-rutina-y-progreso/tasks.md`, `docs/sdd/10-portal-del-alumno/tasks.md`, `docs/sdd/12-reportes-y-fidelizacion/tasks.md` y las historias US-23, US-27, US-28, US-30, US-31 y US-33 a US-37. Si una tarea del SDD contradice una regla confirmada en este sprint o el DER, resolver la diferencia antes de migrar.

## Cierre del Sprint 4

Verificar cuáles pendientes siguen abiertos al iniciar el sprint; cerrar solo los que todavía falten.

- [ ] Completar US-23 según la regla y las decisiones de [honorarios-pendientes.md](honorarios-pendientes.md) (Rosario).
- [x] Validar `HORA_RESUMEN_DIARIO` con formato `HH:MM` y los parámetros enteros con valores no negativos (Francisco).
- [x] Completar la notificación diaria del resumen de la propietaria (US-26); el endpoint `GET /resumen-diario` ya está implementado (Francisco).
- [ ] Reflejar en Enterprise Architect y regenerar los entregables de las dependencias pendientes de US-13, US-20, US-22, US-24, US-25 y US-26.
- [ ] Resolver la regla de suplencias en períodos liquidados de US-24 antes de cerrar esa historia (Nicolas).
- [ ] Cerrar los casos de integración y demostración pendientes que se arrastren de SPRINT-3.md y SPRINT-4.md.

## Honorarios (US-23)

- [ ] Actualizar US-23 y el SDD con el 50% de los ingresos por cuotas atribuibles a cada profesora; no aplicar mínimo de alumnos.
- [ ] Resolver las definiciones abiertas del checklist independiente antes de implementar el cálculo.
- [ ] Completar modelos Prisma, migración, tarifas, liquidaciones y detalle según las decisiones confirmadas.
- [ ] Implementar y probar el calculador mensual, los créditos y débitos por suplencias y la inmutabilidad de liquidaciones cerradas.
- [ ] Implementar los endpoints de tarifas y liquidaciones descritos en SPRINT-4.md, con roles, permisos y OpenAPI.
- [ ] Validar que el total de cada liquidación coincida con la suma de sus detalles y que el total general coincida con las liquidaciones individuales.

## Rutinas y progreso (US-27 y US-28)

- [ ] Verificar el esquema existente y completar los modelos/migraciones faltantes de rutinas, registros de progreso, tipos de medida y medidas corporales.
- [ ] Implementar la carga y consulta de rutinas, con historial y asociación al alumno y a la profesora que la registró.
- [ ] Implementar el registro transaccional de mediciones; rechazar valores no positivos y mantener unidades consistentes.
- [ ] Implementar endpoints de consulta para alumno y tutor, limitados al alumno propio o al menor a cargo.
- [ ] Aplicar permisos: profesoras solo para alumnos a su cargo; propietaria para todos; alumno/tutor en modo lectura.
- [ ] Agregar pruebas de autorización, historial, validación de medidas y casos sin rutina ni mediciones.

## Ranking e insignias (US-30 y US-31)

- [ ] Agregar `tipo_insignia`, los modelos `insignias` y `alumno_insignias`, sus relaciones y migración. `periodo` debe ser obligatorio al integrar la clave primaria compuesta; guardar `""` para insignias sin período y `AAAA-MM` para las mensuales.
- [ ] Cargar el catálogo inicial: rachas de 10 y 25 clases, totales de 50 y 100 clases, Mes perfecto y Podio del mes. Los íconos y colores se resuelven en el front, no en la base.
- [ ] Al registrar asistencia, actualizar racha y total de clases y otorgar las insignias correspondientes sin duplicados.
- [ ] Aplicar la regla de racha: una falta la corta; una clase cancelada o una suplencia no la corta.
- [ ] Implementar el cierre mensual: Mes perfecto cuenta clases dictadas y excluye canceladas; Podio del mes reconoce los tres primeros del ranking.
- [ ] Agregar `RANKING_MINIMO_CLASES = 4` a `parametros_sistema` y excluir del ranking a quienes no alcancen el mínimo.
- [ ] Implementar `GET /reportes/ranking-asistencia?desde&hasta&actividad` con nombre, previstas, asistidas, porcentaje, racha e insignias.
- [ ] Ordenar por porcentaje descendente, clases asistidas descendente y nombre ascendente; actualizar US-30 para reflejar este desempate y el mínimo de clases.
- [ ] Implementar `GET /alumnos/:id/insignias`, devolviendo el catálogo, si cada insignia fue obtenida y el progreso hacia su umbral.
- [ ] Agregar `REPORTES_RANKING_VER` para propietaria y profesoras y `INSIGNIAS_VER_PROPIAS` para el portal; probar que un alumno no consulte datos ajenos.

## Reportes (US-33 a US-37 y requisitos agregados)

- [ ] Implementar el informe de asistencia de US-33 con período y filtros combinables por alumno, profesora y actividad; excluir clases canceladas e incluir inasistencias automáticas.
- [x] Implementar el informe de cuotas vencidas de US-34; excluir cuotas dentro del período de gracia y devolver deuda exigible y días de mora.
- [x] Implementar `GET /reportes/inscripciones?desde&hasta`, usando `alumnos.fecha_alta` y `fecha_baja`; contar altas definitivas y no reactivaciones.
- [x] Implementar `GET /reportes/planes`, con inscripciones activas por plan y `plan_precios` vigente.
- [ ] Implementar `GET /reportes/ocupacion`, con inscriptos activos por horario, cupo del horario o de la actividad y porcentaje de ocupación.
- [x] Implementar `GET /reportes/cobranza?desde&hasta`, mostrando cuotas del período y pagos `CONFIRMADOS` agrupados por forma de pago.
- [x] Proteger los reportes administrativos con permisos exclusivos de propietaria y probar denegaciones para otros roles.
- [x] Documentar filtros, respuestas y permisos en OpenAPI; agregar pruebas de consultas, límites de fechas, datos vacíos y agregaciones.

## Criterios de cierre

- [ ] Todas las migraciones se aplican sobre una base actualizada y preservan los datos existentes.
- [ ] Las reglas de negocio y decisiones pendientes quedan reflejadas en las US/SDD correspondientes.
- [ ] Cada endpoint tiene validación de entrada, autorización, documentación OpenAPI y pruebas de integración.
- [ ] Ejecutar pruebas backend relevantes y registrar los casos de integración completados.
