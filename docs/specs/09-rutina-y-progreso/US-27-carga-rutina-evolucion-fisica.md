# US-27 – Carga de rutina y evolución física

## 1. Información general

- **Épica:** Rutina y Progreso
- **Prioridad:** Baja
- **Actor principal:** Profesora
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir a la profesora cargar la rutina y el registro de evolución física (peso y medidas) de un alumno, para hacer el seguimiento de sus metas.

## 3. Descripción

Como profesora, quiero cargar la rutina y el registro de evolución física (peso y medidas) de un alumno para hacer el seguimiento de sus metas.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando datos del alumno)
- [ ] Selección de alumno
- [ ] Vista de rutina actual y evolución
- [ ] Formulario de carga de rutina
- [ ] Formulario de carga de medición
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red
- [ ] Empty (alumno sin rutina ni mediciones)

## 5. Datos que necesita

### Datos que muestra

- Nombre del alumno
- Rutina actual (si existe)
- Historial de mediciones (peso, medidas por fecha)
- Gráfico de evolución (opcional para MVP)

### Datos que se cargan (rutina)

- Alumno (obligatorio)
- Nombre de la rutina (opcional)
- Ejercicios / actividades (texto libre o estructurado)
- Fecha de inicio (obligatoria)
- Duración o período (opcional)
- Observaciones (opcional; privadas: solo las ven la profesora a cargo y la propietaria, no el alumno ni el tutor)

### Datos que se cargan (medición)

- Alumno (obligatorio)
- Fecha (obligatoria, por defecto hoy)
- Peso (obligatorio)
- Medidas: cintura, cadera, pecho, brazos, piernas (opcionales según disciplina)
- Observaciones (opcional; privadas: solo las ven la profesora a cargo y la propietaria, no el alumno ni el tutor)

### Datos que se generan

- Registro de rutina
- Registro de medición
- Historial de evolución del alumno
- Base para gráficos de progreso (US-28)

## 6. Acciones del usuario

- Buscar y seleccionar un alumno
- Ver la rutina actual
- Cargar una nueva rutina
- Editar una rutina existente
- Cargar una nueva medición
- Editar o eliminar una medición (con permisos)
- Ver el historial de mediciones
- Ver el gráfico de evolución (opcional)

## 7. Reglas de negocio

- La rutina y las mediciones se asocian al **alumno** y a la **profesora** que las cargó.
- Las mediciones se registran **por fecha**, permitiendo múltiples entradas a lo largo del tiempo.
- Una profesora solo puede cargar rutina y mediciones de los alumnos **a su cargo** (restringido por permisos).
- La propietaria puede ver todas las rutinas y mediciones.
- El alumno puede ver **solo su propia** rutina y mediciones (US-28).
- Las mediciones no se pueden eliminar sin dejar trazabilidad (baja lógica o historial).
- Peso y medidas deben ser valores positivos y razonables (validación).
- Las rutinas pueden tener múltiples versiones (historial, opcional para MVP).
- Las mediciones deben estar en unidades consistentes (kg, cm).

## 8. Criterios de aceptación

- [ ] Carga de una nueva medición de peso → se agrega al historial
- [ ] Carga de rutina sin seleccionar alumno → falla
- [ ] Carga de medición con peso negativo o cero → falla
- [ ] La profesora solo ve los alumnos a su cargo
- [ ] El alumno solo ve su propia rutina y mediciones
- [ ] El historial de mediciones se ordena por fecha descendente
- [ ] Se puede editar una medición existente (con trazabilidad)

## 9. Casos borde / Errores

- Alumno sin rutina previa → mostrar estado vacío con botón para cargar
- Alumno con muchas mediciones → paginación o scroll
- Medición duplicada (misma fecha, mismo alumno) → advertir y permitir sobrescribir o crear nueva
- Profesora cargando rutina para alumno no asignado → bloquear
- Error de red al guardar
- Valores de medidas fuera de rango razonable → advertir

## 10. Dependencias

- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-10 (búsqueda y ficha del alumno)
- US-28 (consulta de rutina y progreso por parte del alumno)
- US-01, US-02 (permisos: profesora solo sus alumnos, propietaria todos)
- Backend: CRUD de rutinas + CRUD de mediciones + historial

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde:
    - Ficha del alumno (US-10) → pestaña "Rutina y Progreso"
    - Home de la profesora → botón "Cargar rutina / medición"
  - Vista con dos secciones:
    1. Rutina actual (con opción de editar / cargar nueva)
    2. Historial de mediciones (tabla + gráfico opcional)
  - Formulario de medición con:
    - Fecha (por defecto hoy)
    - Peso (kg)
    - Medidas (cm) — campos opcionales según disciplina
    - Observaciones
  - Formulario de rutina con:
    - Nombre de la rutina
    - Ejercicios (textarea o estructura de lista)
    - Fecha de inicio y duración
    - Observaciones
  - Gráfico de evolución de peso (línea) — opcional para MVP, recomendable a futuro
  - Formato consistente de unidades (kg, cm)
  - Validaciones claras con mensajes en español
  - La eliminación de mediciones requiere confirmación y deja trazabilidad
