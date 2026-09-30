# US-16 – Registro de pago por transferencia

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Permitir al alumno informar que hizo una transferencia bancaria (fuera del sistema) en cualquier momento del ciclo (primera cuota, renovación o cuota vencida), sin necesidad de adjuntar comprobante, para que la propietaria la verifique y confirme.

## 3. Descripción

Como alumno, quiero informar una transferencia bancaria que hice para abonar mi cuota (primera cuota, renovación o cuota vencida), sin necesidad de adjuntar comprobante.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando datos del plan y cuota)
- [ ] Formulario de aviso de transferencia
- [ ] Confirmación de envío
- [ ] Procesando
- [ ] Éxito (transferencia informada como pendiente de verificación)
- [ ] Error de validación
- [ ] Error de red
- [ ] Listado de mis transferencias

## 5. Datos que necesita

### Datos que muestra

- Plan actual del alumno
- Monto esperado (con precio vigente y promoción si aplica)
- Datos bancarios del centro (CBU / alias / titular)
- Estado de cuota actual
- Fecha de vencimiento

### Datos que se cargan

- Monto de la transferencia (obligatorio)
- Fecha de la transferencia (obligatoria)
- Observaciones (opcional)

### Datos que NO se cargan

- Comprobante (no se adjunta archivo)

### Datos que se generan

- Estado del aviso: `pendiente de verificación`
- Fecha de carga del aviso
- Registro en el historial del alumno
- Notificación a la propietaria (para revisión en US-17)

## 6. Acciones del usuario

- Ver los datos bancarios del centro
- Ver el monto esperado
- Completar los datos del aviso (monto + fecha)
- Enviar el aviso para verificación
- Ver el estado de sus transferencias
- Cancelar la operación

## 7. Reglas de negocio

- El alumno puede informar una transferencia en cualquier momento del ciclo:
  - **Primera cuota** (alumno nuevo, pre-inscripto).
  - **Renovación** (alumno activo que renueva su plan).
  - **Cuota vencida** (alumno con deuda).
- El aviso queda en estado **"pendiente de verificación"** hasta la revisión de la propietaria (US-17).
- El **alumno puede asistir a clase mientras la transferencia está pendiente de verificación** (en el caso de renovación).
- Si es un **alumno nuevo**, el alta definitiva ocurre cuando la propietaria **aprueba** la transferencia (US-07 + US-17).
- El monto informado debe coincidir con el precio vigente del plan (con promoción aplicada si corresponde).
- **No se adjunta comprobante.** La propietaria verifica el ingreso en su extracto bancario.
- Los avisos pendientes de verificación **no actualizan el estado de cuota** hasta que sean aprobados.
- La transferencia queda asociada al alumno y al período.

## 8. Criterios de aceptación

- [ ] El alumno puede informar una transferencia en cualquier momento del ciclo (primera cuota, renovación, cuota vencida).
- [ ] El alumno informa la transferencia indicando **monto** y **fecha** (sin adjuntar archivo).
- [ ] La transferencia queda en estado **"pendiente de verificación"** hasta la revisión de la propietaria.
- [ ] El alumno puede **asistir a clase** mientras la transferencia está pendiente de verificación (en el caso de renovación).
- [ ] Si es un **alumno nuevo**, el alta definitiva ocurre cuando la propietaria aprueba la transferencia.
- [ ] El monto debe coincidir con el precio vigente del plan (con promoción aplicada si corresponde).
- [ ] Los datos bancarios del centro (CBU/alias/titular) se muestran para que el alumno haga la transferencia.

## 9. Casos borde / Errores

- Monto ingresado distinto al esperado → advertir pero permitir (o requerir nota).
- Alumno sin plan activo → no permitir informar transferencia.
- Alumno dado de baja → no permitir informar transferencia.
- Error de red al enviar.
- Alumno que informa una transferencia que no hizo (la propietaria puede rechazarla en US-17).

## 10. Dependencias

- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-14 (renovación o cambio de plan, que puede disparar la transferencia)
- US-17 (aprobación o rechazo de transferencias por parte de la propietaria)
- US-18 (estado de habilitación, que se mantiene mientras la transferencia está pendiente)
- US-07 (alta definitiva, si es un alumno nuevo)
- US-29 (panel del alumno, donde se accede)
- Backend: endpoint de registro de aviso de transferencia + notificación

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media (sin manejo de archivos)
- Recomendación de UI:
  - Acceso desde el panel del alumno (botón "Informar transferencia")
  - Formulario con:
    - Datos bancarios del centro (solo lectura, con botón de copiar CBU/alias)
    - Monto de la transferencia (con precio vigente precargado)
    - Fecha de la transferencia
    - Observaciones (opcional)
  - Confirmación con resumen antes de enviar
  - Después de enviar, mostrar: *"Tu transferencia quedó pendiente de verificación. Podés asistir a clase mientras tanto."*
  - Vista "Mis transferencias" con estado: pendiente / aprobada / rechazada
  - Si es rechazada, mostrar el motivo (si lo hubiera) y permitir reintentar
  - Validar que el monto sea positivo
  - **Nunca usar la palabra "pago"** en la interfaz
