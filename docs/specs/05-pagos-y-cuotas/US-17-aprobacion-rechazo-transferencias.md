# US-17 – Aprobación o rechazo de transferencias

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Permitir a la propietaria verificar y aprobar o rechazar las transferencias informadas en el sistema, en un plazo de 24 horas, para validar los ingresos y actualizar el estado de los alumnos.

## 3. Descripción

Como propietaria, quiero verificar y aprobar o rechazar las transferencias bancarias informadas de los alumnos, en un plazo de 24 horas, para validar los ingresos de dinero y actualizar el estado de los alumnos.

Desde el 18/10/2026 las transferencias pendientes las informa la profesora a cargo de la inscripción (US-16): el alumno y el tutor ya no las informan, pero ven las suyas en "Mis transferencias".

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando transferencias pendientes)
- [ ] Listado "Transferencias por verificar" (pestaña de Cobros y Cuotas)
- [ ] Detalle de una transferencia
- [ ] Aprobar transferencia
- [ ] Rechazar transferencia (con motivo)
- [ ] Procesando
- [ ] Éxito (estado actualizado)
- [ ] Error
- [ ] Empty (no hay transferencias pendientes)

## 5. Datos que necesita

### Datos que muestra (listado)

- Alumno (nombre y apellido)
- Fecha y hora de la transferencia (las informadas)
- Titular de la cuenta de origen (si se cargó)
- Monto transferido
- Tiempo transcurrido desde que se informó (para controlar las 24 hs), con su color

### Datos del detalle

- Todos los datos del listado
- Plan asociado
- Monto esperado: el precio de la cuota del plan, con la promoción si corresponde
- Tipo de pago: primera cuota / renovación / cuota vencida
- Advertencia si el monto transferido no coincide con el esperado

### Datos que se cargan al rechazar

- Motivo del rechazo (obligatorio, texto)

### Datos que NO se muestran

- Comprobante adjunto (no aplica)

## 6. Acciones del usuario

- Ver el listado de transferencias pendientes
- Filtrar las pendientes por alumno y por fecha de la transferencia, y ordenarlas (más antiguas, más recientes o mayor monto)
- Abrir el detalle de una transferencia
- Verificar el ingreso del dinero en su extracto bancario (fuera del sistema)
- Aprobar la transferencia
- Rechazar la transferencia (con motivo)

## 7. Reglas de negocio

- Solo la propietaria aprueba o rechaza (rol Propietaria y permiso `PAGOS_CONFIRMAR`).
- La propietaria debe verificar y aprobar o rechazar cada transferencia **dentro de las 24 horas** desde que se informó.
- La propietaria **verifica el ingreso del dinero en su cuenta bancaria** (extracto, homebanking) antes de aprobar.
- Solo se aprueba o rechaza una transferencia **pendiente**; aprobarla dos veces no duplica nada.
- Al **aprobarse**:
  - queda registrado quién la aprobó y cuándo;
  - la cuota queda paga y el estado de cuota del alumno se actualiza (pasa a "al día", US-18);
  - si es la **primera cuota** (alumno pre-inscripto), se hace el **alta definitiva** del alumno (US-07), en la misma transacción.
- Al **rechazarse**:
  - el motivo es obligatorio;
  - la cuota queda sin pago confirmado y el próximo pago la reutiliza (no se saltean números de cuota);
  - el alumno queda en el estado que tenía sin esa transferencia ("vencida" o "sin cuota paga");
  - el alumno o su tutor ven el rechazo y su motivo en "Mis transferencias". No se envía una notificación (las de transferencias no están en el DER).
- El monto esperado es el de la cuota (precio vigente del plan, con promoción si corresponde). Si no coincide, la propietaria puede aprobar igual (con confirmación) o rechazar.
- Mientras la transferencia está pendiente, el alumno mantiene su estado y no se le bloquea la asistencia (US-16), pero su inscripción no admite otro pago hasta que se resuelva.
- Las transferencias aprobadas y rechazadas quedan en el historial de cuotas y pagos del alumno.
- El sistema **alerta visualmente** las transferencias según el tiempo que llevan:
  - verde: menos de 12 hs
  - amarillo: entre 12 y 24 hs
  - rojo: 24 hs o más, "vencida en verificación" (sigue pendiente hasta que se resuelva)
- Por defecto el listado muestra primero las más recientes; el color de cada una marca cuánto le queda del plazo de 24 hs. Se puede ordenar por más antiguas o por mayor monto.
- **No se registra ni se muestra comprobante.** La verificación del ingreso es responsabilidad de la propietaria contra su extracto bancario.

## 8. Criterios de aceptación

- [ ] Aprobación de una transferencia pendiente → el alumno pasa a "al día"
- [ ] Aprobación de una transferencia de primera cuota → se hace el alta definitiva del alumno
- [ ] Rechazo de una transferencia → el alumno vuelve a estado "vencida" o "sin cuota paga"
- [ ] El listado muestra claramente las transferencias con más tiempo pendiente
- [ ] Al rechazar, se exige un motivo
- [ ] El historial del alumno refleja tanto las aprobaciones como los rechazos
- [ ] El sistema alerta visualmente las transferencias próximas a superar las 24 hs
- [ ] La propietaria puede verificar el ingreso sin necesidad de un comprobante adjunto

## 9. Casos borde / Errores

- Monto distinto al esperado → advertir y requerir confirmación
- Transferencia duplicada (mismo alumno, mismo monto, mismo día) → no se puede informar (US-16)
- Error al actualizar el estado del alumno → no se confirma la aprobación (todo se guarda en una transacción)
- Primera cuota aprobada cuando el horario ya no tiene cupo → no se aprueba (US-07)
- Transferencia aprobada que luego se descubre como fraudulenta → permitir revertir (a futuro, fuera del MVP)
- Error de red al aprobar o rechazar
- Alumno dado de baja → no se le puede informar una transferencia
- Transferencia que no se encuentra en el extracto bancario → rechazar con motivo "No se encontró la transferencia en el extracto"

## 10. Dependencias

- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-16 (informe de la transferencia)
- US-07 (alta definitiva, si es un alumno nuevo)
- US-14 (renovación o cambio de plan)
- US-18 (estado de habilitación, que se actualiza al aprobar)
- US-26 (resumen diario para la propietaria, que incluye transferencias pendientes)
- Backend: `GET /api/v1/pagos/transferencias` (filtros por estado, alumno, tipo y días de carga; orden por antigüedad; con las horas desde la carga y la marca de las que pasaron las 24 hs), `POST /api/v1/pagos/:id/aprobar` y `POST /api/v1/pagos/:id/rechazar`

## 11. Notas de implementación (Front)

- Se implementó primero con mocks y después contra el back.
- Complejidad: Media
- UI:
  - Acceso desde:
    - Cobros y Cuotas, pestaña "Transferencias por verificar" (el menú muestra un contador de pendientes)
    - Resumen del día en el Dashboard (US-26)
  - Aviso arriba del listado: revisar en la cuenta que la plata haya entrado antes de aprobar, con 24 hs de plazo desde que se informó
  - Barra de filtros arriba del listado: buscar alumno, fecha de la transferencia y orden, con "Limpiar filtros" y el estado "Sin resultados"
  - Listado con el tiempo transcurrido y su color (verde, amarillo, rojo)
  - Detalle con:
    - Datos del alumno y plan
    - Monto transferido y precio del plan
    - Fecha de la transferencia y cuándo se informó
    - Tipo de pago (primera cuota / renovación / cuota vencida)
    - Advertencia si el monto difiere
    - Botones "Aprobar transferencia" y "Rechazar"
  - Si es la primera cuota, se avisa que al aprobarla se confirma el alta definitiva
  - Al rechazar, campo de motivo obligatorio (ej: "El dinero no ingresó a la cuenta bancaria", "El monto no coincide")
  - Después de aprobar o rechazar, el listado se actualiza automáticamente
  - **No hay visor de comprobante** (no aplica)
  - **Nunca usar la palabra "pago"** en la interfaz
