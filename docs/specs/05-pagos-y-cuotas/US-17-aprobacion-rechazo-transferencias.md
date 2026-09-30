# US-17 – Aprobación o rechazo de transferencias

## 1. Información general
- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 3

## 2. Objetivo
Permitir a la propietaria verificar y aprobar o rechazar las transferencias informadas por los alumnos, en un plazo de 24 horas, para validar los ingresos y actualizar el estado de los alumnos.

## 3. Descripción
Como propietaria, quiero verificar y aprobar o rechazar las transferencias bancarias informadas por los alumnos, en un plazo de 24 horas, para validar los ingresos de dinero y actualizar el estado de los alumnos.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando transferencias pendientes)
- [ ] Listado de transferencias pendientes de verificación
- [ ] Detalle de una transferencia
- [ ] Aprobar transferencia
- [ ] Rechazar transferencia (con motivo)
- [ ] Procesando
- [ ] Éxito (estado actualizado)
- [ ] Error
- [ ] Empty (no hay transferencias pendientes)

## 5. Datos que necesita
### Datos que muestra (listado):
- Alumno (nombre y apellido)
- Plan asociado
- Monto de la transferencia
- Fecha de la transferencia (informada por el alumno)
- Fecha de carga del aviso en el sistema
- Tiempo transcurrido desde la carga (para controlar las 24hs)
- Tipo de pago: primera cuota / renovación / cuota vencida
- Estado: `pendiente` / `aprobada` / `rechazada`

### Datos del detalle:
- Todos los datos del listado
- Observaciones del alumno (si las hubiera)
- Historial del alumno (pagos previos, estado de cuota)
- Promoción aplicada (si corresponde)

### Datos que se cargan al rechazar:
- Motivo del rechazo (obligatorio, texto)

### Datos que NO se muestran:
- Comprobante adjunto (no aplica)

## 6. Acciones del usuario
- Ver el listado de transferencias pendientes
- Abrir el detalle de una transferencia
- Verificar el ingreso del dinero en su extracto bancario (fuera del sistema)
- Aprobar la transferencia
- Rechazar la transferencia (con motivo)
- Filtrar por estado, alumno, tipo de pago o fecha
- Ordenar por antigüedad (para priorizar las que están por vencer las 24hs)

## 7. Reglas de negocio
- La propietaria debe verificar y aprobar o rechazar cada transferencia **dentro de las 24 horas** desde la carga.
- La propietaria **verifica el ingreso del dinero en su cuenta bancaria** (extracto, homebanking) antes de aprobar.
- Al **aprobarse**, el estado de cuota del alumno se actualiza automáticamente (pasa a "al día").
- Al **aprobarse** una transferencia de **primera cuota** (alumno nuevo), se dispara el **alta definitiva** del alumno (US-07).
- Al **rechazarse**, el alumno vuelve al estado anterior ("vencida" o "pendiente de pago") y se le notifica el motivo.
- El monto aprobado debe coincidir con el precio vigente del plan (con promoción aplicada si corresponde).
- Si el monto no coincide, la propietaria puede aprobar igual (con confirmación) o rechazar.
- El alumno puede seguir asistiendo a clase **mientras la transferencia está pendiente** (según US-16), pero si es rechazada y su cuota estaba vencida, se le aplica la restricción correspondiente.
- Las transferencias aprobadas quedan registradas en el historial del alumno.
- El sistema debe **alertar visualmente** las transferencias que están por superar las 24hs sin respuesta.
- Si pasan más de 24hs sin acción, la transferencia queda marcada como "vencida en verificación" (pero sigue pendiente hasta que se resuelva).
- **No se registra ni se muestra comprobante.** La verificación del ingreso es responsabilidad de la propietaria contra su extracto bancario.

## 8. Criterios de aceptación
- [ ] Aprobación de una transferencia pendiente → el alumno pasa a "al día"
- [ ] Aprobación de una transferencia de primera cuota → se dispara el alta definitiva del alumno
- [ ] Rechazo de una transferencia → el alumno vuelve a estado "vencida" o "pendiente de pago"
- [ ] El listado muestra claramente las transferencias con más tiempo pendiente
- [ ] Al rechazar, se exige un motivo
- [ ] El historial del alumno refleja tanto las aprobaciones como los rechazos
- [ ] El sistema alerta visualmente las transferencias próximas a superar las 24hs
- [ ] La propietaria puede verificar el ingreso sin necesidad de un comprobante adjunto

## 9. Casos borde / Errores
- Monto distinto al esperado → advertir y requerir confirmación
- Transferencia duplicada (mismo alumno, mismo monto, misma fecha) → advertir
- Error al actualizar el estado del alumno → no confirmar la aprobación hasta que se complete
- Transferencia aprobada que luego se descubre como fraudulenta → permitir revertir (a futuro, fuera del MVP)
- Error de red al aprobar o rechazar
- Transferencia informada por un alumno dado de baja → rechazar automáticamente
- Transferencia que no se encuentra en el extracto bancario → rechazar con motivo "No se encontró la transferencia en el extracto"

## 10. Dependencias
- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-16 (informe de la transferencia por parte del alumno)
- US-07 (alta definitiva, si es un alumno nuevo)
- US-14 (renovación o cambio de plan)
- US-18 (estado de habilitación, que se actualiza al aprobar)
- US-26 (resumen diario para la propietaria, que incluye transferencias pendientes)
- Backend: endpoint de aprobación/rechazo + actualización de estado + notificación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde:
    - Panel de la propietaria (sección "Transferencias pendientes de verificación")
    - Resumen diario (US-26)
  - Listado con badges de estado y tiempo transcurrido:
    - Verde: menos de 12hs
    - Amarillo: entre 12 y 24hs
    - Rojo: más de 24hs
  - Detalle con:
    - Datos del alumno y plan
    - Monto y fecha de la transferencia
    - Tipo de pago (primera cuota / renovación / cuota vencida)
    - Observaciones del alumno
    - Historial del alumno (mini resumen)
    - Recordatorio: "Verificá el ingreso del dinero en tu extracto bancario antes de aprobar."
    - Botones "Aprobar" y "Rechazar"
  - Al aprobar, mostrar confirmación: *"Se actualizará el estado del alumno a 'Al día'. ¿Confirmás?"*
  - Al rechazar, abrir modal con campo de motivo obligatorio:
    - Ejemplos: "No se encontró la transferencia en el extracto", "El monto no coincide", "La transferencia no se realizó"
  - Después de aprobar o rechazar, actualizar el listado automáticamente
  - Ordenamiento por defecto: más antiguas primero (para respetar las 24hs)
  - Contador de pendientes visible en el menú
  - **No hay visor de comprobante** (no aplica)
  - **Nunca usar la palabra "pago"** en la interfaz