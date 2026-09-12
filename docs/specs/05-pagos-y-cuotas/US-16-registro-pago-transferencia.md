# US-16 – Registro de pago por transferencia con comprobante

## 1. Información general
- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 3

## 2. Objetivo
Permitir al alumno registrar un pago mediante transferencia bancaria adjuntando el comprobante, para informar su renovación de plan y que quede pendiente de confirmación por la propietaria.

## 3. Descripción
Como alumno, quiero registrar un pago mediante transferencia adjuntando el comprobante para informar mi renovación de plan.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando datos del plan y cuota)
- [ ] Formulario de carga de transferencia
- [ ] Selección / carga de comprobante
- [ ] Confirmación de envío
- [ ] Procesando
- [ ] Éxito (pago registrado como pendiente de confirmación)
- [ ] Error de validación
- [ ] Error de red
- [ ] Listado de mis pagos pendientes de confirmación

## 5. Datos que necesita
### Datos que muestra:
- Plan actual del alumno
- Monto a transferir (con precio vigente y promoción si aplica)
- Datos bancarios del centro (CBU / alias / titular)
- Estado de cuota actual
- Fecha de vencimiento

### Datos que se cargan:
- Monto transferido (obligatorio)
- Fecha de la transferencia (obligatoria)
- Comprobante (obligatorio — imagen o PDF)
- Observaciones (opcional)

### Datos que se generan:
- Estado del pago: `pendiente de confirmación`
- Fecha de carga del comprobante
- Registro en el historial del alumno
- Notificación a la propietaria (para revisión en US-17)

## 6. Acciones del usuario
- Ver los datos bancarios del centro
- Cargar el comprobante de transferencia
- Completar los datos del pago
- Enviar el pago para revisión
- Ver el estado de sus pagos pendientes
- Cancelar la operación

## 7. Reglas de negocio
- El pago por transferencia queda en estado **"pendiente de confirmación"** hasta la revisión de la propietaria (US-17).
- El **alumno puede asistir a clase mientras el pago está pendiente de confirmación** (no se bloquea su habilitación por este estado).
- El comprobante es **obligatorio**: sin él, no se puede registrar el pago.
- El monto ingresado debe coincidir con el precio vigente del plan (con promoción aplicada si corresponde).
- El alumno puede tener **más de un pago pendiente** si renueva varias veces (aunque en la práctica no debería).
- Si la propietaria **rechaza** el pago (US-17), el alumno vuelve al estado anterior (vencida o pendiente de pago).
- Los pagos pendientes de confirmación **no actualizan el estado de cuota** hasta que sean aprobados.
- El comprobante debe almacenarse y quedar asociado al alumno y al período.

## 8. Criterios de aceptación
- [ ] Carga de transferencia con comprobante adjunto → queda pendiente de confirmación
- [ ] Carga de transferencia sin comprobante → falla (campo obligatorio)
- [ ] El alumno puede ver sus pagos pendientes de confirmación
- [ ] El alumno puede asistir a clase aunque tenga un pago pendiente
- [ ] El monto a transferir refleja el precio vigente (con promoción si aplica)
- [ ] Los datos bancarios del centro se muestran correctamente

## 9. Casos borde / Errores
- Comprobante con formato no soportado → mostrar mensaje claro
- Comprobante demasiado grande → comprimir o rechazar con indicación
- Monto ingresado distinto al de la cuota → advertir pero permitir (o requerir nota)
- Error al subir el comprobante → reintentar sin perder los datos
- Alumno sin plan activo → no permitir cargar transferencia
- Alumno dado de baja → no permitir carga de pago
- Error de red al enviar

## 10. Dependencias
- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-14 (renovación o cambio de plan, que puede disparar la transferencia)
- US-17 (aprobación o rechazo de transferencias por parte de la propietaria)
- US-18 (estado de habilitación, que se mantiene mientras el pago está pendiente)
- US-29 (panel del alumno, donde se accede)
- Backend: endpoint de carga de pago + almacenamiento de comprobante + notificación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media-Alta (por el manejo de archivos)
- Recomendación de UI:
  - Acceso desde el panel del alumno (botón "Informar pago por transferencia")
  - Formulario con:
    - Datos bancarios del centro (solo lectura, con botón de copiar CBU/alias)
    - Monto a transferir (con precio vigente precargado)
    - Fecha de la transferencia
    - Upload de comprobante (drag & drop + selector)
    - Observaciones (opcional)
  - Confirmación con resumen antes de enviar
  - Después de enviar, mostrar: *"Tu pago quedó pendiente de confirmación. Podés asistir a clase mientras tanto."*
  - Vista "Mis pagos" con estado: pendiente / aprobado / rechazado
  - Si es rechazado, mostrar el motivo (si lo hubiera) y permitir reintentar
  - Preview del comprobante antes de enviar
  - Validar tipo de archivo (jpg, png, pdf) y tamaño máximo