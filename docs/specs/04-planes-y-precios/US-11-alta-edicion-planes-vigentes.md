# US-11 – Alta y edición de planes vigentes

## 1. Información general

- **Épica:** Planes y Precios
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Permitir crear y editar los planes vigentes del centro, definiendo su tipo, su frecuencia semanal, su precio y, cuando corresponda, la actividad exclusiva a la que se limitan, para establecer la oferta comercial.

## 3. Descripción

Como propietaria, quiero crear y editar los planes vigentes definiendo su tipo, frecuencia semanal y precio, y opcionalmente limitarlos a una actividad (grupal o personalizada), para establecer la oferta comercial. En el caso de las clases personalizadas, la inscripción deberá respetar el cupo máximo definido en la actividad.

> **Plan, horario e inscripción.** El plan define **qué se vende y cuánto cuesta**; no guarda profesora. La clase concreta (día, hora, actividad, profesora y cupo) es el **horario** (US-04). La **inscripción** (US-05) une ambas cosas para un alumno: plan + profesora a cargo + horarios, y ahí se validan las reglas del plan. Así, un mismo plan sirve para todas las profesoras y un cambio de precio (US-12) se carga una sola vez. Es el modelo del DER (`planes` no tiene `id_profesora`; `inscripciones` sí).

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando planes y datos auxiliares)
- [ ] Listado de planes vigentes
- [ ] Formulario de alta de plan
- [ ] Formulario de edición de plan
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red
- [ ] Confirmación de cambio de frecuencia
- [ ] Confirmación de baja / desactivación de plan
- [ ] Empty (no hay planes cargados)

## 5. Datos que necesita

### Datos que muestra (listado)

- Nombre del plan (Particular, Básico, Intermedio, 5 días, Premium, Kids)
- Actividad exclusiva con su tipo (grupal / personalizada), o "Cualquier actividad" si no tiene
- Frecuencia semanal (1 a 7 veces, libre o clase suelta)
- Regla de profesora ("La profesora a cargo" / "Puede ser otra profesora")
- Precio vigente (y el próximo, si hay uno programado por US-12)
- Estado (vigente / dado de baja)

### Datos que se cargan / editan

- Nombre del plan (obligatorio, hasta 40 caracteres, único entre los planes vigentes)
- Tipo: `MENSUAL` o `CLASE_SUELTA` (obligatorio; no se puede cambiar después de creado)
- Frecuencia semanal (obligatoria en `MENSUAL`: de 1 a 7 clases o libre, sin tope; `CLASE_SUELTA` no lleva)
- Días de gracia para el vencimiento de la cuota (en `MENSUAL`, de 0 a 365, por defecto 0; `CLASE_SUELTA` lleva 0)
- Precio (obligatorio solo al crear el plan; después se cambia con fecha de vigencia, ver US-12)
- Actividad exclusiva (opcional) — si se elige, hereda el tipo (grupal / personalizada)
- Solo con la profesora a cargo (sí / no, por defecto no)
- Descripción (opcional, hasta 255 caracteres)

### Datos que NO se pueden editar directamente

- Tipo del plan (define cómo vencen las cuotas de las inscripciones que ya tiene)
- Precio vigente e histórico (se gestionan por vigencias, ver US-12)
- Cuotas ya cobradas
- Planes dados de baja

## 6. Acciones del usuario

- Ver el listado de planes
- Filtrar planes por texto, actividad, tipo de actividad (grupal / personalizada) y estado
- Crear un nuevo plan
- Editar un plan vigente
- Asociar, cambiar o quitar la actividad exclusiva del plan
- Desactivar un plan (baja lógica, no se elimina)

## 7. Reglas de negocio

- El plan **no se asocia a una profesora**: la profesora a cargo se elige al inscribir al alumno (US-05).
- La **actividad exclusiva es opcional**:
  - Sin actividad, el alumno puede elegir horarios de cualquier actividad (ej: un pase libre).
  - Con actividad, al inscribir solo se aceptan horarios de esa actividad (ej: Kids, Particular).
  - Solo se puede elegir una actividad activa.
- Al inscribir, todos los horarios del alumno deben ser de **una misma profesora**. Si el plan es "solo con la profesora a cargo", además esa profesora tiene que ser la que está a cargo de la inscripción.
- En los planes `MENSUAL` la frecuencia es un entero de 1 a 7 o libre; al inscribir no se pueden elegir más horarios que esa frecuencia (libre no tiene tope).
- Un plan `CLASE_SUELTA` no lleva frecuencia semanal y sus días de gracia son 0.
- Al inscribir se valida que haya **cupo disponible** en cada horario elegido (el cupo del horario o, si no tiene, el de la actividad). En las **clases personalizadas** esto es lo que hace respetar el cupo máximo (también en la renovación, ver US-18).
- En las **clases grupales** el cupo es configurable/opcional según el espacio.
- No puede haber dos planes vigentes con el mismo nombre.
- **No se elimina** un plan: solo se desactiva, aunque tenga alumnos activos. Las inscripciones que ya lo usan lo conservan; deja de ofrecerse para inscripciones nuevas y ya no se puede editar.
- Una actividad con planes vigentes exclusivos no se puede dar de baja: antes hay que dar de baja esos planes o pasarlos a otra actividad (US-03).
- Los precios de planes ya cobrados **no se modifican retroactivamente** (los cambios de precio se gestionan en US-12).
- El plan puede tener promociones o descuentos vigentes (gestionados en US-13).
- Los planes estándar esperados: Particular, Básico, Intermedio, 5 días, Premium, Kids.

## 8. Criterios de aceptación

- [ ] Alta de un plan nuevo con tipo, frecuencia y precio, con o sin actividad exclusiva → se guarda correctamente
- [ ] Edición de un plan existente cambiando su frecuencia semanal → pide confirmación y se guarda correctamente
- [ ] Intento de crear un plan sin nombre, sin tipo, sin frecuencia (en `MENSUAL`) o sin precio → falla (campos obligatorios)
- [ ] Un plan con actividad exclusiva solo acepta horarios de esa actividad al inscribir
- [ ] Un plan "solo con la profesora a cargo" rechaza al inscribir horarios de otra profesora
- [ ] Intento de desactivar un plan con alumnos activos → se permite desactivar, pero no eliminar
- [ ] Un plan de clase personalizada valida el cupo al momento de inscribir
- [ ] El tipo de actividad (grupal/personalizada) se muestra claramente en el listado; un plan sin actividad figura como "Cualquier actividad"

## 9. Casos borde / Errores

- Plan sin actividad exclusiva → se guarda: sirve para cualquier actividad
- Actividad exclusiva dada de baja → no se puede elegir
- Actividad dada de baja con planes vigentes exclusivos → no se permite la baja de la actividad (ver US-03)
- Profesora dada de baja → no afecta al plan (no la guarda); afecta a sus horarios e inscripciones (ver US-04)
- Frecuencia semanal inválida (0, negativa o mayor a 7) → no permitir
- `CLASE_SUELTA` con frecuencia o días de gracia → no permitir
- Precio negativo o cero → no permitir
- Nombre de plan duplicado entre los vigentes → no permitir (se avisa antes de guardar)
- Editar un plan dado de baja → no permitir
- Error de red al guardar

## 10. Dependencias

- US-01, US-02 (solo propietaria puede crear y editar)
- US-03 (actividades, que definen el tipo grupal/personalizada)
- US-04 (profesoras y horarios asignados)
- US-05 (pre-inscripción, donde se eligen la profesora y los horarios del plan)
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
    - Selector de tipo de plan (`MENSUAL` / `CLASE_SUELTA`), bloqueado en la edición
    - Selector de actividad exclusiva (con el tipo ya definido), con la opción "Cualquier actividad"
    - Interruptor "Solo con la profesora a cargo"
    - Campo de frecuencia semanal (1 a 7 o libre)
    - Campo de precio con formato de moneda (solo en el alta)
  - Mostrar advertencia si la actividad es personalizada: *"Los planes de clases personalizadas estarán sujetos al cupo máximo de la actividad."*
  - Pedir confirmación al cambiar la frecuencia de un plan existente
  - No permitir eliminar, solo desactivar (con modal de confirmación)
  - Indicar visualmente el estado del plan (vigente / dado de baja)
