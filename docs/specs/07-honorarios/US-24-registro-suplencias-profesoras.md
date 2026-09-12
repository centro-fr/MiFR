# US-24 – Registro de suplencias entre profesoras

## 1. Información general
- **Épica:** Honorarios
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Permitir registrar suplencias entre profesoras para liquidar por separado las clases cubiertas y descontarlas de la profesora ausente.

## 3. Descripción
Como propietaria, quiero registrar suplencias entre profesoras para liquidar por separado las clases cubiertas y descontarlas de la ausente.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando clases y profesoras)
- [ ] Listado de suplencias registradas
- [ ] Formulario de alta de suplencia
- [ ] Confirmación
- [ ] Guardando
- [ ] Éxito (suplencia registrada)
- [ ] Error de validación
- [ ] Error de red
- [ ] Confirmación de eliminación de suplencia
- [ ] Empty (no hay suplencias registradas)

## 5. Datos que necesita
### Datos que muestra (listado):
- Fecha de la clase
- Actividad / horario
- Profesora titular
- Profesora suplente
- Estado: `activa` / `cancelada`
- Observaciones

### Datos que se cargan / editan:
- Fecha de la clase (obligatoria)
- Horario / actividad (obligatorio)
- Profesora titular (obligatoria)
- Profesora suplente (obligatoria, distinta de la titular)
- Motivo (opcional)
- Observaciones (opcional)

### Datos que se generan:
- Registro de suplencia
- Ajuste en el cálculo de honorarios (US-23):
  - Se descuenta de la titular
  - Se suma a la suplente
- Trazabilidad de la suplencia

## 6. Acciones del usuario
- Ver el listado de suplencias registradas
- Registrar una nueva suplencia
- Editar una suplencia existente (si no está liquidada)
- Eliminar una suplencia (baja lógica)
- Filtrar por fecha, profesora o actividad
- Ver impacto en honorarios (opcional)

## 7. Reglas de negocio
- Las clases cubiertas por suplencia **se liquidan a la profesora suplente**, no a la titular.
- **No se puede** registrar una suplencia con la misma profesora como titular y suplente.
- La profesora suplente debe tener el rol "Profesora" (US-01/US-02).
- La suplencia se registra para una **clase específica** (fecha + horario), no para todo un período.
- Si la clase no se dictó (cancelada), no se debe registrar como suplencia (o se marca como cancelada).
- Una vez liquidado el período (US-23), la suplencia **no se puede modificar** (salvo corrección con permisos especiales).
- El registro es visible solo para la propietaria.
- Las suplencias afectan el cálculo de honorarios del mes correspondiente.
- Si hay múltiples suplencias en el mismo horario, definir prioridad (la más reciente aplica).

## 8. Criterios de aceptación
- [ ] Registro de una suplencia de una clase → se descuenta de la titular y se suma a la suplente
- [ ] Intento de registrar una suplencia con la misma profesora como titular y suplente → falla
- [ ] Intento de registrar una suplencia con una profesora sin rol → falla
- [ ] La suplencia se refleja correctamente en el informe de honorarios (US-23)
- [ ] No se puede editar una suplencia ya liquidada
- [ ] El listado permite filtrar por fecha, profesora o actividad

## 9. Casos borde / Errores
- Suplencia registrada en una fecha futura → permitir, pero advertir
- Suplencia registrada en una fecha muy antigua (ya liquidada) → advertir
- Profesora titular dada de baja → permitir registrar suplencia retroactiva
- Suplencia duplicada (misma clase, misma fecha) → advertir
- Error de red al guardar
- Eliminar una suplencia ya reflejada en un informe cerrado → bloquear o requerir confirmación especial

## 10. Dependencias
- US-01, US-02 (permisos: solo propietaria)
- US-03, US-04 (actividades y horarios)
- US-23 (informe mensual de honorarios, que consume las suplencias)
- Backend: CRUD de suplencias + integración con cálculo de honorarios

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde:
    - Panel de la propietaria (sección "Honorarios" → "Suplencias")
    - Desde una clase específica (botón "Registrar suplencia")
  - Formulario con:
    - Fecha (date picker, por defecto hoy)
    - Selector de actividad / horario
    - Selector de profesora titular (con autocompletado)
    - Selector de profesora suplente (solo usuarias con rol Profesora)
    - Motivo (opcional)
    - Observaciones (opcional)
  - Listado en tabla (desktop) o cards (mobile)
  - Indicar visualmente el impacto en honorarios (opcional para MVP)
  - No permitir editar suplencias ya liquidadas (mostrar en modo lectura)
  - Modal de confirmación al eliminar: *"La suplencia se eliminará y ya no afectará los honorarios. ¿Confirmás?"*