# US-17 – Aprobación o rechazo de transferencias

## 1. Información general
- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 3

## 2. Objetivo
Permitir a la propietaria aprobar o rechazar las transferencias bancarias en un plazo de 24 horas, para validar los ingresos de dinero y actualizar el estado de los alumnos.

## 3. Descripción
Como propietaria, quiero aprobar o rechazar las transferencias bancarias en un plazo de 24 horas para validar los ingresos de dinero.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando transferencias pendientes)
- [ ] Listado de transferencias pendientes de confirmación
- [ ] Detalle de una transferencia (con comprobante visible)
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
- Monto transferido
- Fecha de la transferencia
- Fecha de carga del comprobante
- Tiempo transcurrido desde la carga (para controlar las 24hs)
- Estado: `pendiente` / `aprobada` / `rechazada`

### Datos del detalle:
- Todos los datos del listado
- Comprobante adjunto (imagen o PDF)
- Observaciones del alumno
- Historial del alumno (pagos previos, estado de cuota)
- Promoción aplicada (si corresponde)

### Datos que se cargan al rechazar:
- Motivo del rechazo (obligatorio, texto)

## 6. Acciones del usuario
- Ver el listado de transferencias pendientes
- Abrir el detalle de una transferencia
- Ver el comprobante adjunto
- Aprobar la transferencia
- Rechazar la transferencia (con motivo)
- Filtrar por estado, alumno o fecha
- Ordenar por antigüedad (para priorizar las que están por vencer las 24hs)

## 7. Reglas de negocio
- La propietaria debe aprobar o rechazar cada transferencia **dentro de las 24 horas** desde la carga.
- Al **aprobarse**, el estado de cuota del alumno se actualiza automáticamente (pasa a "al día").
- Al **rechazarse**, el alumno vuelve al estado anterior ("vencida" o "pendiente de pago") y se le notifica el motivo.
- El monto aprobado debe coincidir con el precio vigente del plan (con promoción aplicada si corresponde).
- Si el monto no coincide, la propietaria puede aprobar igual (con confirmación) o rechazar.
- El alumno puede seguir asistiendo a clase **mientras el pago está pendiente** (según US-16), pero si es rechazado y su cuota estaba vencida, se le aplica la restricción correspondiente.
- Las transferencias aprobadas quedan registradas en el historial del alumno.
- El sistema debe **alertar visualmente** las transferencias que están por superar las 24hs sin respuesta.
- Si pasan más de 24hs sin acción, la transferencia queda marcada como "vencida en revisión" (pero sigue pendiente hasta que se resuelva).

## 8. Criterios de aceptación
- [ ] Aprobación de una transferencia pendiente → el alumno pasa a "al día"
- [ ] Rechazo de una transferencia → el alumno vuelve a estado "vencida" o "pendiente de pago"
- [ ] El listado muestra claramente las transferencias con más tiempo pendiente
- [ ] El comprobante se visualiza correctamente antes de aprobar o rechazar
- [ ] Al rechazar, se exige un motivo
- [ ] El historial del alumno refleja tanto las aprobaciones como los rechazos
- [ ] El sistema alerta visualmente las transferencias próximas a superar las 24hs

## 9. Casos borde / Errores
- Transferencia sin comprobante visible → no permitir aprobar
- Monto distinto al esperado → advertir y requerir confirmación
- Transferencia duplicada (mismo comprobante, mismo monto) → advertir
- Error al actualizar el estado del alumno → no confirmar la aprobación hasta que se complete
- Transferencia aprobada que luego se descubre como fraudulenta → permitir revertir (a futuro, fuera del MVP)
- Error de red al aprobar o rechazar
- Transferencia cargada por un alumno dado de baja → rechazar automáticamente

## 10. Dependencias
- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-16 (carga de la transferencia por parte del alumno)
- US-18 (estado de habilitación, que se actualiza al aprobar)
- US-26 (resumen diario para la propietaria, que incluye transferencias pendientes)
- Backend: endpoint de aprobación/rechazo + actualización de estado + notificación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde:
    - Panel de la propietaria (sección "Transferencias pendientes")
    - Resumen diario (US-26)
  - Listado con badges de estado y tiempo transcurrido:
    - Verde: menos de 12hs
    - Amarillo: entre 12 y 24hs
    - Rojo: más de 24hs
  - Detalle con:
    - Datos del alumno y plan
    - Comprobante visible (imagen embebida o link a PDF)
    - Monto y fecha
    - Botones "Aprobar" y "Rechazar"
  - Al aprobar, mostrar confirmación: *"Se actualizará el estado del alumno a 'al día'. ¿Confirmás?"*
  - Al rechazar, abrir modal con campo de motivo obligatorio
  - Después de aprobar o rechazar, actualizar el listado automáticamente
  - Ordenamiento por defecto: más antiguas primero (para respetar las 24hs)
  - Contador de pendientes visible en el menú