# US-11 – Alta y edición de planes vigentes

## 1. Información general

- **Épica:** Planes y Precios
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Permitir crear y editar los planes vigentes del centro, vinculándolos a una actividad (grupal o personalizada), a una profesora y, cuando corresponda, a una frecuencia semanal, para establecer la oferta comercial.

## 3. Descripción

Como propietaria, quiero crear y editar los planes vigentes vinculándolos a una actividad (grupal o personalizada), a una profesora y, cuando corresponda, a una frecuencia semanal, para establecer la oferta comercial. En el caso de las clases personalizadas el plan deberá respetar el cupo máximo definido en la actividad.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando planes y datos auxiliares)
- [ ] Listado de planes vigentes
- [ ] Formulario de alta de plan
- [ ] Formulario de edición de plan
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red
- [ ] Confirmación de baja / desactivación de plan
- [ ] Empty (no hay planes cargados)

## 5. Datos que necesita

### Datos que muestra (listado)

- Nombre del plan (Particular, Básico, Intermedio, 5 días, Premium, Kids)
- Actividad asociada (con su tipo: grupal / personalizada)
- Profesora asociada
- Frecuencia semanal
- Precio vigente
- Estado (vigente / no vigente)
- Cantidad de alumnos activos en el plan (opcional)

### Datos que se cargan / editan

- Nombre del plan (obligatorio)
- Actividad asociada (obligatorio) — hereda el tipo (grupal / personalizada)
- Profesora asociada (obligatorio)
- Frecuencia semanal (obligatorio cuando corresponde; ej: 1, 2, 3, 5 días)
- Precio vigente (obligatorio)
- Fecha de vigencia del precio (opcional, se gestiona en US-12)
- Descripción (opcional)
- Estado (vigente / no vigente)

### Datos que NO se pueden editar directamente

- Precio histórico (se gestiona por vigencias, ver US-12)
- Cuotas ya cobradas

## 6. Acciones del usuario

- Ver el listado de planes vigentes
- Crear un nuevo plan
- Editar un plan existente
- Desactivar un plan (baja lógica, no se elimina)
- Filtrar planes por actividad, profesora o tipo
- Asociar o cambiar la actividad del plan
- Asociar o cambiar la profesora del plan

## 7. Reglas de negocio

- El plan debe estar asociado a **una actividad** (que ya tiene definido su tipo: grupal o personalizada).
- El plan debe estar asociado a **una profesora**.
- En los planes con frecuencia semanal, la frecuencia debe ser un número entero positivo (1 a 7 días).
- En los planes asociados a **clases personalizadas**, el sistema debe **validar que exista cupo disponible** al momento de la inscripción (esto se aplica también en la renovación, ver US-18).
- En los planes asociados a **clases grupales**, el cupo es configurable/opcional según el espacio.
- **No se debe eliminar** un plan con alumnos activos: solo se puede desactivar.
- Los precios de planes ya cobrados **no se modifican retroactivamente** (los cambios de precio se gestionan en US-12).
- El plan puede tener promociones o descuentos vigentes (gestionados en US-13).
- Los planes estándar esperados: Particular, Básico, Intermedio, 5 días, Premium, Kids.

## 8. Criterios de aceptación

- [ ] Alta de un plan nuevo con actividad (con su tipo) y profesora asociadas → se guarda correctamente
- [ ] Edición de un plan existente cambiando su frecuencia semanal → se guarda correctamente
- [ ] Intento de crear un plan sin actividad o sin profesora → falla (campos obligatorios)
- [ ] Intento de desactivar un plan con alumnos activos → se permite desactivar, pero no eliminar
- [ ] Un plan de clase personalizada valida el cupo al momento de inscribir
- [ ] El tipo de actividad (grupal/personalizada) se muestra claramente en el listado

## 9. Casos borde / Errores

- Plan sin actividad asociada → no permitir guardar
- Profesora dada de baja con planes asociados → advertir y requerir reasignación
- Actividad dada de baja con planes asociados → no permitir o advertir
- Frecuencia semanal inválida (0, negativa o mayor a 7) → no permitir
- Precio negativo o cero → no permitir
- Nombre de plan duplicado → advertir
- Error de red al guardar

## 10. Dependencias

- US-01, US-02 (solo propietaria puede acceder)
- US-03 (actividades, que definen el tipo grupal/personalizada)
- US-04 (profesoras y horarios asignados)
- US-12 (actualización de precios con fecha de vigencia)
- US-13 (descuentos y promociones)
- US-14 (renovación o cambio de plan)
- US-18 (cálculo de habilitación, que valida cupo en personalizadas)
- Backend: CRUD de planes + validaciones de cupo y vigencia

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Alta
- Recomendación de UI:
  - Listado en tabla (desktop) o cards (mobile)
  - Badge para el tipo de actividad (Grupal / Personalizada)
  - Al crear o editar un plan, mostrar claramente:
    - Selector de actividad (con el tipo ya definido)
    - Selector de profesora (solo usuarios con rol Profesora)
    - Campo de frecuencia semanal (con validación 1-7)
    - Campo de precio con formato de moneda
  - Mostrar advertencia si la actividad es personalizada: *"Los planes de clases personalizadas estarán sujetos al cupo máximo de la actividad."*
  - No permitir eliminar, solo desactivar (con modal de confirmación)
  - Indicar visualmente el estado del plan (vigente / no vigente)
