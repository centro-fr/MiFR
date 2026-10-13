# US-04 – Asignación de profesoras y horarios a actividades

## 1. Información general

- **Épica:** Configuración Base
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 1

## 2. Objetivo

Permitir a la propietaria asignar profesoras y horarios a cada actividad (grupal o personalizada) para mantener organizado el cronograma semanal del centro.

## 3. Descripción

Como propietaria, quiero asignar profesoras y horarios a cada actividad (grupal o personalizada) para mantener organizado el cronograma semanal, permitiendo que una misma disciplina se dicte en distintos horarios y con distintas profesoras.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando actividades, profesoras y horarios)
- [ ] Vista de cronograma / listado de horarios
- [ ] Formulario de alta / edición de horario
- [ ] Guardando
- [ ] Éxito
- [ ] Error
- [ ] Confirmación de eliminación de horario
- [ ] Empty (no hay horarios cargados)

## 5. Datos que necesita

### Datos que muestra

- Actividad (nombre + tipo: grupal/personalizada)
- Profesora asignada
- Día de la semana
- Horario de inicio y fin
- Cupo máximo (heredado de la actividad o sobrescrito)
- Cantidad de inscriptos actuales (opcional)

### Datos que se cargan / editan

- Actividad (obligatorio)
- Profesora (obligatorio – debe tener rol “profesora”)
- Día de la semana (obligatorio)
- Hora de inicio (obligatorio)
- Hora de fin (obligatorio)
- Cupo máximo (opcional – si no se carga, usa el de la actividad)

## 6. Acciones del usuario

- Ver el cronograma semanal de horarios
- Crear nuevo horario
- Editar un horario existente
- Eliminar un horario
- Filtrar por actividad o por profesora

## 7. Reglas de negocio

- La asignación de profesora se hace solo sobre usuarios que ya tengan el rol “Profesora”.
- Un profesor/a puede dictar varias actividades en distintos horarios.
- **No se permite** asignar dos actividades a la misma profesora en el mismo día y horario (evitar superposición).
- Los horarios tienen que estar dentro del horario de atención del centro: de 07:00 a 23:00. Ninguna clase empieza antes de las 07:00 ni termina después de las 23:00.
- Una misma actividad puede tener varios horarios y distintas profesoras.
- El cupo máximo se hereda de la actividad (US-03), pero puede sobrescribirse en el horario si es necesario.
- No se debe poder eliminar un horario que ya tenga alumnos inscriptos a futuro (o se debe advertir claramente).

## 8. Criterios de aceptación

- [ ] Asignar una profesora existente a un horario libre → se permite
- [ ] Intentar asignar una profesora a dos horarios que se superponen → falla
- [ ] Crear o editar un horario que empieza antes de las 07:00 o termina después de las 23:00 → falla
- [ ] Intentar asignar un usuario sin rol “profesora” → falla
- [ ] Crear varios horarios para la misma actividad con distintas profesoras → se permite
- [ ] El sistema muestra claramente el tipo de actividad (grupal/personalizada) en el horario

## 9. Casos borde / Errores

- Superposición de horarios de la misma profesora
- Hora de fin anterior a la hora de inicio
- Horario fuera del horario de atención del centro (07:00 a 23:00)
- Intentar eliminar un horario con alumnos inscriptos
- Profesora dada de baja que todavía tiene horarios asignados
- Error de red al guardar

## 10. Dependencias

- US-01 y US-02 (autenticación y permisos)
- US-03 (deben existir actividades cargadas)
- Backend: endpoints de horarios + validación de superposición
- Listado de usuarios con rol Profesora

## 11. Notas de implementación (Front)

- Se puede hacer primero con mocks
- Complejidad: Media-Alta (por la validación de superposición y la vista de cronograma)
- Recomendación de UI:
  - Vista semanal tipo calendario (desktop)
  - Lista agrupada por día (mobile)
- Validar en frontend la superposición, pero siempre revalidar en backend
