# US-08 – Baja lógica de alumno

## 1. Información general
- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Dar de baja lógicamente a un alumno conservando todo su historial de pagos y asistencia, para poder reactivarlo si vuelve más adelante sin perder información.

## 3. Descripción
Como propietaria, quiero dar de baja lógicamente a un alumno conservando su historial de pagos y asistencia, para poder reactivarlo si vuelve más adelante.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando ficha del alumno)
- [ ] Ficha del alumno con datos e historial
- [ ] Confirmación de baja (modal / diálogo)
- [ ] Procesando baja
- [ ] Éxito (alumno dado de baja)
- [ ] Error
- [ ] Ficha de alumno dado de baja (con opción de reactivar)

## 5. Datos que necesita
### Datos que muestra:
- Nombre completo del alumno
- Estado actual: `activo` / `pendiente` / `baja`
- Plan y horarios asignados
- Historial de pagos
- Historial de asistencia
- Fecha de alta
- Fecha de baja (si corresponde)

### Datos que se generan al dar de baja:
- Estado: `baja`
- Fecha de baja
- Motivo de baja (opcional, texto libre)

### Datos que se generan al reactivar:
- Estado: `activo`
- Fecha de reactivación
- Se reasigna al plan/horario actual si hay cupo (o queda pendiente de asignación)

## 6. Acciones del usuario
- Ver ficha de un alumno activo
- Iniciar baja lógica del alumno
- Confirmar la baja
- Ver ficha de un alumno dado de baja
- Reactivar un alumno dado de baja

## 7. Reglas de negocio
- La baja **no debe eliminar** el registro del alumno ni su historial de pagos/asistencia.
- Un alumno dado de baja **no debe contar** como inscripto activo en ningún horario (no aparece en listas de asistencia, ni ocupa cupo).
- Un alumno dado de baja **puede reactivarse** en cualquier momento.
- Al reactivarse, si el horario ya no tiene cupo, debe advertirse (especialmente en clases personalizadas).
- Los pagos ya cobrados y las cuotas anteriores se conservan intactos.
- Las deudas pendientes al momento de la baja quedan registradas (no se borran).
- La baja es **lógica**, nunca física (no se hace DELETE en base de datos).

## 8. Criterios de aceptación
- [ ] Baja de un alumno con historial de asistencia → el historial se conserva
- [ ] Reactivación de un alumno dado de baja → vuelve a estado activo
- [ ] Un alumno de baja no aparece en la lista de inscriptos para tomar asistencia
- [ ] Un alumno de baja no ocupa cupo en el horario (el cupo se libera)
- [ ] El historial de pagos se mantiene visible después de la baja

## 9. Casos borde / Errores
- Intentar dar de baja un alumno ya dado de baja → no permitir (o mostrar aviso)
- Reactivar un alumno cuyo horario ya está completo (especialmente personalizadas)
- Reactivar un alumno con deuda pendiente → advertir
- Alumno con cuotas pendientes de rendición al momento de la baja
- Alumno menor de edad cuya baja la solicita el tutor
- Error de red al dar de baja

## 10. Dependencias
- US-05, US-06, US-07 (el alumno debe existir previamente)
- US-09 (modificación de datos, relacionada)
- US-10 (consulta y búsqueda, donde se verá el estado)
- US-18 (cálculo del estado de habilitación)
- US-20 (asistencia: no debe aparecer en las listas)
- Backend: endpoint de baja lógica + endpoint de reactivación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Botón "Dar de baja" visible solo para propietaria
  - Modal de confirmación con texto claro: *"El alumno quedará inactivo pero se conservará todo su historial. ¿Confirmás la baja?"*
  - En la ficha, mostrar claramente el estado (badge: Activo / Pendiente / Baja)
  - Filtro rápido en la lista de alumnos: "Mostrar dados de baja"
  - Botón "Reactivar" visible solo cuando el alumno está en estado baja
- Advertir si el alumno tiene deuda o cuotas pendientes al dar de baja