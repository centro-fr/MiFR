# US-14 – Renovación o cambio de plan

## 1. Información general

- **Épica:** Planes y Precios
- **Prioridad:** Media
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir al alumno renovar su clase suelta al finalizar o cambiar a un plan mensual, y pagar la renovación por efectivo o transferencia, para adaptar su frecuencia de asistencia según su conveniencia.

## 3. Descripción

Como alumno, quiero poder renovar mi clase suelta al finalizar o cambiar a un plan mensual, y pagar la renovación por efectivo o transferencia, para adaptar mi frecuencia de asistencia según mi conveniencia.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando plan actual y opciones disponibles)
- [ ] Panel del alumno con plan actual
- [ ] Opciones de renovación o cambio de plan
- [ ] Confirmación del cambio / renovación
- [ ] Selección del medio de pago (efectivo / transferencia)
- [ ] Procesando
- [ ] Éxito (plan actualizado)
- [ ] Error de validación
- [ ] Error de red
- [ ] Empty (sin planes disponibles para el cambio)

## 5. Datos que necesita

### Datos que muestra

- Plan actual del alumno (nombre, tipo, frecuencia, precio)
- Estado de cuota actual (al día / por vencer / vencida)
- Fecha de vencimiento
- Planes disponibles para cambio (con sus características y precios)
- Condiciones del cambio (fecha de inicio, si aplica promoción, etc.)
- Medios de pago disponibles (efectivo / transferencia)

### Datos que se cargan / seleccionan

- Plan nuevo (obligatorio, si es cambio)
- Confirmación de renovación (si es renovación)
- Fecha de inicio deseada (si aplica)
- **Medio de pago:**
  - **Efectivo** (se registra presencialmente, US-15)
  - **Transferencia** (se informa desde el panel, US-16)

### Datos que se generan

- Nuevo estado de cuota
- Fecha de vencimiento del nuevo plan
- Registro de la renovación o cambio
- Movimiento en el historial del alumno
- Si es transferencia: pago pendiente de confirmación

## 6. Acciones del usuario

- Ver su plan actual
- Ver los planes disponibles para cambio
- Renovar el plan actual (ej: clase suelta → nueva clase suelta)
- Cambiar a un plan mensual
- Seleccionar el medio de pago (efectivo / transferencia)
- Confirmar la renovación o el cambio
- Cancelar la operación

## 7. Reglas de negocio

- Se puede **renovar una clase suelta** al finalizar (nueva clase suelta).
- Se puede **migrar de clase suelta a plan mensual**.
- Se puede **cambiar entre planes mensuales** (si el sistema lo permite según configuración).
- El cambio de plan **no debe afectar el historial de asistencia previo**.
- El cambio de plan **no debe modificar las cuotas ya cobradas**.
- El nuevo plan aplica a partir de la fecha de inicio (o del próximo ciclo).
- Si el nuevo plan es de **clase personalizada**, se debe validar **cupo disponible** al momento del cambio (ver US-18).
- Si hay una **promoción vigente** (US-13) aplicable al nuevo plan, se debe reflejar en el precio.
- **El pago de la renovación puede ser por:**
  - **Efectivo:** se registra presencialmente (US-15).
  - **Transferencia:** el alumno informa el pago desde su panel (US-16) y queda pendiente hasta que la propietaria lo apruebe (US-17).
- Una vez confirmado el pago, se actualiza el estado del alumno y su habilitación.
- **Mientras el pago por transferencia está pendiente, el alumno puede seguir asistiendo a clase.**
- Si el pago es rechazado, el alumno vuelve al estado anterior.

## 8. Criterios de aceptación

- [ ] Renovación de clase suelta ya vencida → se permite, genera nueva habilitación
- [ ] Cambio de clase suelta a plan mensual → se permite, conserva historial
- [ ] Cambio de plan con promoción vigente → aplica el descuento correspondiente
- [ ] Cambio a plan personalizado sin cupo disponible → falla con mensaje claro
- [ ] El historial de asistencia previo se conserva intacto
- [ ] Las cuotas ya cobradas no se modifican
- [ ] El panel del alumno refleja el nuevo plan después del cambio
- [ ] El alumno puede elegir pagar la renovación por efectivo o transferencia
- [ ] Si paga por transferencia, queda pendiente de confirmación
- [ ] El alumno puede asistir a clase mientras el pago está pendiente (si es renovación)

## 9. Casos borde / Errores

- Alumno sin plan activo (pre-inscripción) → no puede renovar ni cambiar
- Cambio de plan a uno que no está vigente → no permitir
- Alumno con deuda pendiente que intenta cambiar de plan → advertir o bloquear (según política)
- Cambio de plan el mismo día del vencimiento → definir criterio claro
- Plan personalizado sin cupo disponible → bloquear con mensaje
- Error de red al confirmar el cambio
- Transferencia rechazada → el alumno vuelve al estado anterior

## 10. Dependencias

- US-11 (planes vigentes, para el cambio)
- US-12 (precios vigentes, para calcular el nuevo precio)
- US-13 (promociones, si aplica al nuevo plan)
- US-15 (registro de cobro en efectivo, si elige efectivo)
- US-16 (informe de pago por transferencia, si elige transferencia)
- US-17 (aprobación de transferencias)
- US-18 (estado de habilitación y validación de cupo en personalizadas)
- US-29 (panel del alumno, donde se realiza la acción)
- Backend: endpoint de cambio de plan + validaciones de cupo y vigencia + creación de pago pendiente

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Alta
- Recomendación de UI:
  - Desde el panel del alumno (US-29), botón "Renovar plan" o "Cambiar plan"
  - Mostrar el plan actual con su estado y fecha de vencimiento
  - Listado de planes disponibles con:
    - Nombre, tipo (grupal/personalizada), frecuencia, precio
    - Badge si tiene promoción vigente
    - Disponibilidad de cupo (para personalizadas)
  - Al seleccionar un plan, mostrar resumen del cambio:
    - Plan anterior → Plan nuevo
    - Precio nuevo (con descuento si aplica)
    - Fecha de inicio
  - **Selección del medio de pago:**
    - Efectivo (con indicación de que se registra presencialmente)
    - Transferencia (redirige al formulario de US-16)
  - Confirmación clara: *"Vas a cambiar del plan X al plan Y. Las cuotas ya pagadas no se modifican. ¿Confirmás?"*
  - Si elige transferencia, redirigir al flujo de US-16
  - Si elige efectivo, mostrar instrucciones para acercarse al centro
  - Mostrar estado del cambio (pendiente de pago / confirmado)
