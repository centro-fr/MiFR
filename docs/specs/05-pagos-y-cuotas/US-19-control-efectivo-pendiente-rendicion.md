# US-19 – Control de efectivo pendiente de rendición

## 1. Información general
- **Épica:** Pagos y Cuotas
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Permitir a la propietaria controlar los cobros en efectivo pendientes de rendición por parte de cada profesora, para cerrar la caja de manera consistente.

## 3. Descripción
Como propietaria, quiero controlar los cobros en efectivo pendientes de rendición por parte de cada profesora para cerrar la caja de manera consistente.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando cobros pendientes)
- [ ] Listado de cobros pendientes agrupados por profesora
- [ ] Detalle de un cobro
- [ ] Marcar cobro como rendido
- [ ] Confirmación
- [ ] Éxito (cobro marcado como rendido)
- [ ] Error
- [ ] Empty (no hay cobros pendientes de rendición)
- [ ] Historial de rendiciones (opcional)

## 5. Datos que necesita
### Datos que muestra (listado):
- Profesora (agrupador)
- Total pendiente por profesora
- Cantidad de cobros pendientes por profesora
- Detalle de cada cobro:
  - Alumno
  - Monto
  - Fecha del cobro
  - Plan / período cubierto
  - Comprobante asociado (si aplica)

### Datos que se generan al marcar como rendido:
- Estado: `rendido`
- Fecha de rendición
- Usuario que registró la rendición (la propietaria)
- Observaciones (opcional)

## 6. Acciones del usuario
- Ver el listado de cobros pendientes agrupados por profesora
- Expandir para ver el detalle por profesora
- Ver el detalle de un cobro individual
- Marcar un cobro como rendido
- Marcar todos los cobros de una profesora como rendidos (opcional)
- Filtrar por profesora o por rango de fechas
- Ver historial de rendiciones anteriores

## 7. Reglas de negocio
- Se deben listar los **cobros en efectivo no rendidos**, agrupados por profesora.
- Cada cobro queda en estado `pendiente de rendición` al registrarse (US-15).
- La propietaria puede marcar un cobro como `rendido` cuando la profesora le entrega el efectivo.
- Un cobro marcado como rendido **deja de aparecer** en el listado de pendientes.
- El historial de rendiciones se conserva para trazabilidad.
- Se debe mostrar el **total por profesora** para facilitar el cierre de caja.
- Los cobros registrados por la propietaria misma (no por una profesora) **no requieren rendición** (o se marcan automáticamente como rendidos).
- Un cobro no puede rendirse dos veces.
- La rendición queda registrada con fecha y usuario.

## 8. Criterios de aceptación
- [ ] Listado de efectivo pendiente por profesora → muestra el detalle correcto
- [ ] Marcado de un cobro como rendido → deja de aparecer como pendiente
- [ ] El total por profesora se calcula correctamente
- [ ] Los cobros registrados por la propietaria no aparecen en el listado de rendiciones
- [ ] El historial de rendiciones conserva los cobros ya rendidos
- [ ] Un cobro no puede marcarse como rendido dos veces

## 9. Casos borde / Errores
- Cobro sin profesora asociada (registrado directamente por la propietaria) → no listar en pendientes
- Profesora dada de baja con cobros pendientes → mostrar en el listado (para poder rendir igual)
- Cobro pendiente muy antiguo → destacar visualmente
- Marcar un cobro como rendido por error → permitir revertir (con permisos especiales, opcional para MVP)
- Error de red al marcar como rendido

## 10. Dependencias
- US-15 (registro de cobros en efectivo que genera los pendientes)
- US-23 (honorarios, que consideran los cobros rendidos)
- US-26 (resumen diario para la propietaria, que incluye efectivo pendiente)
- US-01, US-02 (permisos: solo la propietaria accede)
- Backend: endpoint de listado de pendientes + endpoint de marcado como rendido

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Vista de acordeón: una fila por profesora, expandible para ver el detalle
  - Cada profesora muestra: nombre, total pendiente, cantidad de cobros
  - Al expandir, tabla con: alumno, monto, fecha, período, acción (marcar como rendido)
  - Botón "Marcar todos como rendidos" por profesora (con confirmación)
  - Contador de pendientes visible en el menú
  - Historial de rendiciones en pestaña separada
  - Total general visible al pie (suma de todos los pendientes)
  - Formato de moneda consistente
  - Destacar cobros con más de X días pendientes (por ejemplo, 15 días)