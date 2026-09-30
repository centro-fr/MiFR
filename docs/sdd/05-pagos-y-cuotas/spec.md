# Especificación Funcional: Pagos y Cuotas

## 1. Origen

Esta especificación consolida las User Stories de la épica **Pagos y Cuotas**:

- **US-15**: Registro de cobro en efectivo (`docs/specs/05-pagos-y-cuotas/US-15-registro-cobro-efectivo.md`)
- **US-16**: Registro de pago por transferencia (`docs/specs/05-pagos-y-cuotas/US-16-registro-pago-transferencia.md`)
- **US-17**: Aprobación o rechazo de transferencias (`docs/specs/05-pagos-y-cuotas/US-17-aprobacion-rechazo-transferencias.md`)
- **US-18**: Cálculo del estado de habilitación del alumno (`docs/specs/05-pagos-y-cuotas/US-18-calculo-estado-habilitacion-alumno.md`)
- **US-19**: Control de efectivo pendiente de rendición (`docs/specs/05-pagos-y-cuotas/US-19-control-efectivo-pendiente-rendicion.md`)

---

## 2. Objetivo

Gestionar el flujo integral de cobranzas, administración de cuotas periódicas, conciliación de pagos en efectivo y transferencias bancarias, y determinación automática en tiempo real del estado de habilitación operativa del alumno (`AL_DIA`, `EN_GRACIA`, `VENCIDO`), garantizando la transparencia de fondos recaudados por las profesoras y su posterior rendición formal a la Propietaria.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Cobro en efectivo, aprobación/rechazo de transferencias bancarias, recepción y confirmación de rendiciones de efectivo de profesoras, acceso a reportes financieros. |
| **Profesora** | Cobro en efectivo a sus alumnos en mano (generando deuda de rendición con el centro), carga de comprobantes de transferencia a pedido del alumno, consulta de su propio efectivo pendiente de rendir. No puede ver balances ajenos ni aprobar transferencias. |
| **Alumno / Tutor** | Carga de comprobantes de transferencia desde su portal, visualización de cuotas y descarga de recibos digitales. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Cobro en Efectivo y Emisión de Recibo Digital (US-15)

- Registro inmediato del pago en efectivo indicando cuota asociada, monto cobrado, fecha y usuario receptor (`id_profesora_cobra`).
- Al confirmarse, el pago pasa a estado `CONFIRMADO` y la cuota a pagada.
- Emisión de un comprobante/recibo digital numerado con los datos de la transacción.
- Si el cobro es realizado por una Profesora, el registro queda marcado con `rendido = FALSE`.

#### RF-02: Pagos por Transferencia Bancaria (US-16)

- Registro de un pago informando: cuota, número de comprobante/operación, fecha de transferencia, monto y adjunto del comprobante (imagen o PDF).
- El pago se crea en estado inicial `PENDIENTE` de verificación.

#### RF-03: Aprobación / Rechazo de Transferencias (US-17)

- Panel exclusivo para la Propietaria con el listado de transferencias en estado `PENDIENTE`.
- Permite previsualizar el comprobante bancario adjunto.
- Acciones:
  - **Aprobar**: El pago pasa a `CONFIRMADO`, la cuota queda saldada y se actualiza el estado de habilitación del alumno.
  - **Rechazar**: El pago pasa a `RECHAZADO`, exigiendo registrar un motivo de rechazo; la cuota permanece impaga y se genera una notificación al alumno.

#### RF-04: Motor de Estado de Habilitación del Alumno (US-18)

- Cálculo determinístico en tiempo real del estado del alumno frente al acceso:
  - **`AL_DIA`**: La cuota del período actual está pagada o la fecha de vencimiento aún no ha llegado ($Fecha \le FechaVencimiento$).
  - **`EN_GRACIA`**: La cuota está impaga pero dentro del período de tolerancia del plan ($FechaVencimiento < Fecha \le FechaVencimiento + DiasGracia$). El alumno puede ingresar con advertencia visual amigable en recepción.
  - **`VENCIDO`**: Se superaron los días de gracia ($Fecha > FechaVencimiento + DiasGracia$) sin registrar pago confirmado. El alumno queda inhabilitado operativamente para tomar clases.

#### RF-05: Control de Rendición de Efectivo por Profesora (US-19)

- Balance acumulado de efectivo retenido en mano por cada profesora:
  $$\text{EfectivoPendiente}(P) = \sum \text{Monto}(\text{Pagos}_{\text{EFECTIVO}} \mid \text{id\_profesora\_cobra} = P \land \text{rendido} = \text{FALSE})$$
- Panel para la Propietaria con el detalle discriminado por profesora y botón "Confirmar Rendición".
- Al confirmar la entrega física del dinero, los pagos asociados pasan a `rendido = TRUE` con `fecha_rendicion = NOW()` y `id_usuario_confirma = Propietaria`.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Almacenamiento seguro de archivos de comprobantes (validación MIME: `image/jpeg`, `image/png`, `application/pdf`, límite 5MB, almacenamiento en bucket S3 o carpeta con acceso autenticado).
- **RNF-02**: Atomicidad en las transacciones de cobro y rendición (evitar discrepancias de caja).

---

## 5. Criterios de Aceptación

- **CA-01 (Cobro efectivo)**: Al registrar el cobro en efectivo, la cuota pasa a saldada y el estado del alumno a `AL_DIA`.
- **CA-02 (Transferencia pendiente no habilita)**: Una transferencia cargada en estado `PENDIENTE` no cancela la cuota ni computa como saldada hasta que la Propietaria la apruebe.
- **CA-03 (Aprobación de transferencia)**: La Propietaria aprueba la transferencia; el pago pasa a `CONFIRMADO` y el alumno se habilita.
- **CA-04 (Cálculo de días de gracia)**: Alumno con vencimiento el día 10 y plan con 5 días de gracia: el día 12 figura `EN_GRACIA`, el día 16 figura `VENCIDO`.
- **CA-05 (Rendición de efectivo)**: Profesora cobra 3 cuotas en efectivo ($30.000). Su saldo a rendir muestra $30.000. La Propietaria confirma rendición y el saldo a rendir pasa a $0.

---

## 6. Casos Borde y Errores

- Pago duplicado informado para la misma cuota.
- Carga de archivo no válido o superior al límite en comprobantes.
- Intento de rendición parcial de un cobro (las rendiciones se liquidan por transacción completa).

---

## 7. Fuera de Alcance

- Integración automática con webhooks de APIs bancarias o pasarelas automáticas (Open Banking).
