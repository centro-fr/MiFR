# US-21 – Registro automático de inasistencias

## 1. Información general
- **Épica:** Asistencia
- **Prioridad:** Alta
- **Actor principal:** Sistema
- **Sprint sugerido:** Sprint 3

## 2. Objetivo
Registrar automáticamente como "ausente" a todo alumno inscripto que no marcó presente al cerrarse la ventana de asistencia de la clase, para tener un registro completo (presentes y ausentes).

## 3. Descripción
Como sistema, quiero registrar automáticamente como "ausente" a todo alumno inscripto que no marcó presente al cerrarse la ventana de asistencia de la clase, para tener un registro completo (presentes y ausentes).

## 4. Estados de la pantalla / flujo
> Esta US no tiene pantalla propia, es una lógica de sistema. Se refleja en otras pantallas:
- [ ] Registro de asistencia (US-20) → al cerrar la ventana
- [ ] Ficha del alumno (US-10) → en el historial de asistencia
- [ ] Panel del alumno (US-29) → en el historial de asistencia
- [ ] Detección de alumnos inactivos (US-22) → usa las inasistencias registradas
- [ ] Ranking de asistencia (US-30) → usa las inasistencias para el cálculo
- [ ] Informe de asistencia (US-33) → incluye las inasistencias

## 5. Datos que necesita
### Datos de entrada:
- Lista de alumnos inscriptos en la clase (horario)
- Estado de asistencia de cada alumno (`presente` / `sin_marcar`)
- Momento del cierre de la ventana de asistencia

### Datos que genera:
- Estado de asistencia: `ausente` para los alumnos sin marcar
- Fecha y hora del registro automático
- Base para cálculos de inasistencias consecutivas (US-22)
- Base para ranking de asistencia (US-30)

## 6. Acciones del sistema
- Al cerrarse la ventana de asistencia de una clase:
  - Recorrer todos los alumnos inscriptos
  - Para cada alumno con estado `sin_marcar`, cambiar a `ausente`
  - Registrar la fecha y hora del cambio automático
  - No modificar los alumnos ya marcados como `presente` o `ausente`
- Notificar cambios relevantes (opcional)

## 7. Reglas de negocio
- Al cerrarse la ventana de la clase, **todo inscripto sin presente registrado pasa a "ausente"**.
- La ventana se cierra automáticamente:
  - Al finalizar la clase (según horario de fin), o
  - Cuando la profesora presiona "Cerrar asistencia" (US-20)
- Si la profesora ya marcó a un alumno como `presente` o `ausente`, ese estado **no se modifica**.
- El registro automático **no se puede deshacer** sin intervención de la propietaria (corrección manual).
- Un alumno dado de baja **no cuenta** para el cálculo de inasistencias automáticas.
- El registro debe quedar asociado a la clase, al alumno y a la fecha.
- Si la clase no tuvo asistencia tomada (la profesora no abrió la ventana), **no se generan inasistencias automáticas** (para evitar falsos positivos por error operativo).
- Las inasistencias alimentan el historial del alumno y los informes.

## 8. Criterios de aceptación
- [ ] Cierre de ventana con un alumno sin marcar → pasa a "ausente"
- [ ] Cierre de ventana con todos los alumnos marcados presentes → no genera ausentes
- [ ] Los alumnos ya marcados como presentes no se modifican
- [ ] Los alumnos ya marcados como ausentes manualmente no se duplican
- [ ] El registro queda visible en el historial del alumno
- [ ] Un alumno dado de baja no genera inasistencia automática
- [ ] Si no se abrió la ventana de asistencia, no se generan inasistencias

## 9. Casos borde / Errores
- Clase sin inscriptos → no genera inasistencias
- Error de red al momento del cierre automático → reintentar
- Profesora que cierra la ventana antes de tiempo → los no marcados pasan a ausentes igual
- Clase cancelada → no debe generar inasistencias (requiere lógica especial, fuera del MVP)
- Alumno que se inscribe después del cierre → no aplica retroactivamente
- Corrección manual posterior por la propietaria → permitir, dejando trazabilidad

## 10. Dependencias
- US-20 (registro de asistencia y cierre de ventana)
- US-18 (estado de habilitación, que puede afectar si el alumno se cuenta o no)
- US-22 (detección de inactivos, que usa las inasistencias)
- US-30 (ranking de asistencia, que usa las inasistencias)
- US-33 (informe de asistencia)
- Backend: job de cierre automático + actualización en lote + registro de inasistencias

## 11. Notas de implementación (Front)
- Esta lógica vive en el **backend** (job programado o evento al cerrar la ventana).
- En el front:
  - Mostrar en el historial del alumno las inasistencias con una marca clara (por ejemplo, badge rojo)
  - En la vista de asistencia (US-20), una vez cerrada la ventana, mostrar los ausentes automáticos
  - No permitir modificar la asistencia después del cierre (excepto propietaria con permisos)
  - En el panel del alumno (US-29), incluir las inasistencias en el historial
  - Permitir a la propietaria corregir manualmente una inasistencia (dejando trazabilidad)