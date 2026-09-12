# US-05 – Pre-inscripción de alumno nuevo

## 1. Información general
- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Registrar los datos de un alumno nuevo y el plan que eligió, dejándolo en estado “pendiente” hasta que se confirme su primer pago.

## 3. Descripción
Como propietaria o profesora, quiero registrar los datos y el plan elegido por un alumno nuevo como pre-inscripción, para que quede pendiente de confirmación hasta que se registre su primer pago.

## 4. Estados de la pantalla / flujo
- [ ] Formulario de pre-inscripción vacío
- [ ] Cargando datos auxiliares (planes, horarios, profesoras)
- [ ] Guardando pre-inscripción
- [ ] Éxito (pre-inscripción creada)
- [ ] Error de validación
- [ ] Error de red

## 5. Datos que necesita
### Datos personales del alumno:
- Nombre completo (obligatorio)
- Fecha de nacimiento o edad (obligatorio)
- Teléfono de contacto
- Teléfono de emergencia
- Email (opcional)
- Observaciones

### Datos de inscripción:
- Plan elegido (obligatorio)
- Profesora / Actividad / Horario(s) elegidos (obligatorio)
- Peso y talla (solo si la actividad/clase lo requiere)

### Datos que se generan:
- Estado inicial: `pendiente`
- Fecha de pre-inscripción

## 6. Acciones del usuario
- Completar datos del alumno
- Seleccionar plan
- Seleccionar uno o más horarios de una misma profesora (según el plan)
- Guardar pre-inscripción
- Cancelar

## 7. Reglas de negocio
- El alumno queda en estado **“pendiente”** hasta que se confirme el primer pago (US-07).
- Se debe permitir elegir un plan y uno o más horarios de **una misma profesora**, según lo que permita el plan.
- Si el alumno es menor de edad, se debe asociar un tutor (esto se resuelve en US-06, pero el formulario puede anticiparlo).
- Peso y talla solo se piden cuando la actividad lo requiere (ej: clases personalizadas o ciertas disciplinas).
- No se debe crear todavía el usuario de acceso al sistema (eso ocurre al confirmar el pago).

## 8. Criterios de aceptación
- [ ] Pre-inscripción con todos los datos obligatorios completos → se crea correctamente en estado “pendiente”
- [ ] Pre-inscripción sin seleccionar plan → falla
- [ ] Pre-inscripción en clase que requiere peso/talla sin cargarlos → falla
- [ ] Se puede seleccionar más de un horario de la misma profesora si el plan lo permite

## 9. Casos borde / Errores
- Alumno ya existente (mismo teléfono o documento) → mostrar advertencia
- Plan sin horarios disponibles
- Cupo completo en el horario elegido (especialmente en clases personalizadas)
- Error de red al guardar

## 10. Dependencias
- US-03 y US-04 (deben existir actividades, planes y horarios)
- US-11 (planes cargados)
- US-06 (asociación de tutor – se puede hacer en el mismo flujo o después)
- Backend: endpoint de creación de pre-inscripción

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media-Alta
- Recomendación de UI:
  - Formulario por pasos (Wizard) o secciones claras:
    1. Datos personales
    2. Plan y horarios
    3. Datos adicionales (peso/talla si corresponde)
  - Mostrar en tiempo real si el horario tiene cupo disponible