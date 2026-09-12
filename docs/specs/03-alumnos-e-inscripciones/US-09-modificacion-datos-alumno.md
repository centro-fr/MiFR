# US-09 – Modificación de datos de alumno

## 1. Información general
- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Permitir modificar los datos personales, de contacto o de plan de un alumno ya registrado, para mantener su información actualizada sin afectar cuotas ya cobradas.

## 3. Descripción
Como propietaria o profesora, quiero modificar los datos personales, de contacto o de plan de un alumno ya registrado, para mantener su información actualizada.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando ficha del alumno)
- [ ] Ficha del alumno en modo lectura
- [ ] Formulario de edición (campos habilitados)
- [ ] Guardando cambios
- [ ] Éxito (datos actualizados)
- [ ] Error de validación
- [ ] Error de red
- [ ] Confirmación al cambiar de plan (advertencia sobre cuotas ya cobradas)

## 5. Datos que necesita
### Datos que muestra (ficha del alumno):
- Nombre completo
- Fecha de nacimiento / edad
- Teléfono de contacto
- Teléfono de emergencia
- Email
- Tutor asociado (si es menor de edad)
- Plan asignado
- Horarios y profesora
- Estado (activo / pendiente / baja)
- Peso y talla (si corresponde)

### Datos que se pueden editar:
- Datos personales: nombre, fecha de nacimiento, teléfonos, email
- Datos de contacto de emergencia
- Datos del tutor (si es menor)
- Plan asignado (con validaciones)
- Horarios asignados (si el plan lo permite)
- Peso y talla
- Observaciones

### Datos que NO se pueden editar:
- Cuotas ya cobradas (historial de pagos)
- Historial de asistencia
- Fecha de alta original

## 6. Acciones del usuario
- Ver la ficha del alumno en modo lectura
- Entrar en modo edición
- Modificar datos personales
- Modificar datos de contacto
- Cambiar el plan asignado
- Modificar horarios (si el plan lo permite)
- Guardar cambios
- Cancelar edición

## 7. Reglas de negocio
- Se deben poder editar los datos personales, de contacto y el plan asignado.
- **No se debe permitir modificar cuotas ya cobradas** al cambiar de plan: las cuotas anteriores quedan intactas.
- El cambio de plan aplica solo hacia adelante (a partir de la fecha de cambio o del próximo ciclo).
- Al cambiar de plan, si el nuevo plan tiene cupo limitado (personalizadas), se debe validar disponibilidad.
- Los cambios de datos del tutor solo aplican si el alumno sigue siendo menor de edad.
- Una profesora puede modificar datos de contacto y observaciones, pero no datos sensibles como el plan (solo la propietaria puede cambiar el plan).
- Todo cambio debe quedar registrado (fecha + usuario que lo modificó) para trazabilidad.

## 8. Criterios de aceptación
- [ ] Modificación del teléfono de un alumno existente → se guarda correctamente
- [ ] Cambio de plan de un alumno con cuotas ya pagas → las cuotas anteriores no se alteran
- [ ] Cambio de plan cuando el nuevo plan no tiene cupo (personalizada) → falla con mensaje claro
- [ ] Edición de datos del tutor de un alumno menor → se guarda correctamente
- [ ] Un alumno mayor de edad no muestra campos de tutor editables
- [ ] Historial de pagos y asistencia permanecen inmutables tras la edición

## 9. Casos borde / Errores
- Cambio de plan a uno que ya no está vigente → no permitir
- Cambio de plan con cuotas pendientes de pago → advertir
- Editar fecha de nacimiento que cambie la condición de menor/mayor de edad → revisar si requiere tutor
- Intentar modificar cuotas ya cobradas → bloquear campo
- Error de red al guardar
- Dos usuarios editando simultáneamente → mostrar conflicto (opcional para MVP)

## 10. Dependencias
- US-05, US-06, US-07 (el alumno debe existir)
- US-08 (baja lógica, para el manejo de estados)
- US-10 (consulta y búsqueda, desde donde se accede a la ficha)
- US-11 (planes vigentes, para el cambio de plan)
- US-18 (estado de habilitación, que puede cambiar al cambiar de plan)
- Backend: endpoint de actualización de alumno + validación de reglas de negocio

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Ficha en modo lectura con botón "Editar"
  - Al entrar en edición, mostrar los campos editables (los no editables quedan deshabilitados con tooltip explicando por qué)
  - Sección separada para "Datos personales", "Contacto", "Tutor" (si aplica), "Plan y horarios"
  - Al cambiar el plan, mostrar modal de advertencia: *"Las cuotas ya cobradas no se modificarán. El nuevo plan aplicará desde el próximo ciclo."*
  - Indicar visualmente el estado del alumno (badge Activo / Pendiente / Baja)
  - Mostrar historial de cambios (opcional para MVP, recomendable a futuro)