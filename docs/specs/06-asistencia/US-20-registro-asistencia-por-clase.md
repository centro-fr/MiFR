# US-20 – Registro de asistencia por clase

## 1. Información general

- **Épica:** Asistencia
- **Prioridad:** Alta
- **Actor principal:** Profesora
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Permitir a la profesora visualizar la lista de inscriptos y registrar la asistencia desde su celular en cada clase, para controlar el ingreso de manera ágil sin tarjetas de papel.

## 3. Descripción

Como profesora, quiero visualizar la lista de inscriptos y registrar la asistencia desde mi celular en cada clase para controlar el ingreso de manera ágil sin tarjetas de papel.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando lista de inscriptos)
- [ ] Lista de clases del día (home de la profesora)
- [ ] Lista de inscriptos de una clase
- [ ] Marcando asistencia
- [ ] Guardando cambios
- [ ] Éxito (asistencia guardada)
- [ ] Error
- [ ] Empty (no hay alumnos inscriptos)
- [ ] Ventana de asistencia cerrada (solo lectura)
- [ ] Confirmación al cerrar la ventana de asistencia

## 5. Datos que necesita

### Datos que muestra (lista de clases del día)

- Actividad (nombre y tipo: grupal / personalizada)
- Horario (inicio y fin)
- Cupo máximo y cantidad de inscriptos
- Estado de la ventana de asistencia (abierta / cerrada)

### Datos que muestra (lista de inscriptos)

- Nombre y apellido del alumno
- Estado de cuota (al día / por vencer / vencida)
- Estado de asistencia: `sin_marcar` | `presente` | `ausente`
- Observaciones (si las hubiera)
- Peso y talla (si corresponde)

### Datos que se cargan

- Estado de asistencia por alumno: `presente` o `ausente`

### Datos que se generan

- Registro de asistencia por alumno
- Fecha y hora del marcado
- Profesora que tomó asistencia
- Base para US-21 (inasistencias automáticas)

## 6. Acciones del usuario

- Ver las clases del día (home de la profesora)
- Seleccionar una clase
- Ver la lista de inscriptos
- Marcar presente a un alumno
- Marcar ausente a un alumno
- Marcar todos presentes
- Cerrar la ventana de asistencia (bloquear cambios)
- Consultar asistencias de clases anteriores (opcional)

## 7. Reglas de negocio

- Debe mostrar la **lista de inscriptos en el horario correspondiente**.
- Debe permitir **marcar presente sin que el alumno necesite celular propio**.
- Solo se puede tomar asistencia de **clases del día** (no de días futuros ni pasados, salvo corrección).
- Un alumno **no inscripto en ese horario no debe aparecer** en la lista.
- Un alumno con **cuota vencida** puede aparecer en la lista, pero con **advertencia visual** (política de habilitación configurable según US-18).
- Al **cerrar la ventana de asistencia**, no se puede modificar más (excepto corrección por la propietaria).
- La ventana de asistencia puede tener un tiempo límite configurable (por defecto, hasta el fin de la clase).
- El marcado se guarda en el momento (no requiere "guardar todo").
- Un alumno dado de baja **no aparece** en la lista.
- Un alumno con pago pendiente de confirmación **sí aparece** (puede asistir).

## 8. Criterios de aceptación

- [ ] Marcar presente a un alumno inscripto en el horario → se guarda correctamente
- [ ] Intentar marcar presente a un alumno no inscripto en ese horario → no aparece en la lista
- [ ] Un alumno con cuota vencida aparece con advertencia visual
- [ ] Al cerrar la ventana de asistencia, los cambios quedan bloqueados
- [ ] La lista muestra el estado de cuota de cada alumno
- [ ] El marcado es inmediato (sin necesidad de confirmación adicional)
- [ ] Un alumno dado de baja no aparece en la lista

## 9. Casos borde / Errores

- Profesora sin clases asignadas hoy → mostrar mensaje claro
- Clase sin inscriptos → mostrar estado vacío
- Error de red al marcar asistencia → permitir reintentar
- Marcado duplicado → el último vale (o bloquear según política)
- Cierre de ventana con alumnos sin marcar → se registran como ausentes automáticamente (US-21)
- Alumno que llega tarde (después del cierre) → permitir corrección por propietaria
- Clase personalizada con un solo alumno → mostrar la lista con ese alumno

## 10. Dependencias

- US-03, US-04 (actividades y horarios)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-18 (estado de habilitación, para mostrar advertencia de cuota)
- US-21 (registro automático de inasistencias al cerrar la ventana)
- US-23 (honorarios, que consideran los inscriptos, asistan o no)
- Backend: endpoint de listado de clases del día + endpoint de registro de asistencia

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Alta (es una de las pantallas más críticas operativamente)
- Recomendación de UI (mobile-first):
  - Home de la profesora: lista de clases del día con:
    - Nombre de la actividad (con badge grupal/personalizada)
    - Horario
    - Cantidad de inscriptos / cupo
    - Indicador de si ya se tomó asistencia
  - Vista de toma de asistencia:
    - Lista de alumnos con nombre grande y claro
    - Botón grande de "Presente" y "Ausente" (o toggle)
    - Estado de cuota con badge de color
    - Advertencia visual si el alumno tiene cuota vencida
    - Botón "Marcar todos presentes"
    - Botón "Cerrar asistencia" (con confirmación)
  - Después del cierre, la lista queda en modo lectura (con indicador)
  - La asistencia marcada debe ser visible de inmediato (feedback visual)
  - Optimizar para uso con una sola mano (botones grandes, sin scroll excesivo)
  - No depender de conexión perfecta (considerar cola de sincronización a futuro)
