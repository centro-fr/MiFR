# Tareas de Implementación: Pagos y Cuotas

Tareas técnicas, secuenciales y verificables para la épica **Pagos y Cuotas** (US-15 a US-19).

---

## Fase 1: Base de Datos y Almacenamiento

- [ ] **1.1. Tablas `cuotas` y `pagos`**
  - Crear script de migración SQL para tablas `cuotas` y `pagos`.
  - Crear índices en vencimientos y en flags de rendición de efectivo.
  - *Criterio de verificación*: Verificación de esquema en base de datos.

- [ ] **1.2. Servicio de almacenamiento seguro de comprobantes**
  - Configurar pipeline de subida (`multer`) con validación de extensiones permitidas (`.jpg`, `.png`, `.pdf`) y restricción de tamaño.
  - *Criterio de verificación*: Intentar subir archivo ejecutable y verificar que el middleware lo bloquee.

---

## Fase 2: Backend – Lógica de Cobranzas y Rendiciones

- [ ] **2.1. Registro de Cobro en Efectivo (US-15)**
  - Implementar `POST /pagos/efectivo` con actualización transaccional de cuota y generación de recibo.
  - Asignar flag `rendido = false` si quien cobra es una profesora.
  - *Criterio de verificación*: Al registrar cobro en efectivo, la cuota pasa a `PAGADA` y el pago queda en estado `CONFIRMADO`.

- [ ] **2.2. Flujo de Transferencias y Aprobación (US-16 y US-17)**
  - Implementar subida de comprobante y creación de pago en estado `PENDIENTE`.
  - Implementar endpoints de aprobación y rechazo protegidos exclusivamente para la Propietaria.
  - *Criterio de verificación*: Test unitario que impida a una profesora aprobar transferencias y valide que la aprobación active la cuota.

- [ ] **2.3. Motor de Habilitación y Días de Gracia (US-18)**
  - Desarrollar servicio `HabilitacionService` calculando `AL_DIA`, `EN_GRACIA` y `VENCIDO`.
  - *Criterio de verificación*: Test parametrizado con fechas simulando antes de vencimiento, durante días de gracia y posterior a gracia.

- [ ] **2.4. Módulo de Rendición de Efectivo (US-19)**
  - Implementar consulta agregada de efectivo no rendido agrupado por profesora.
  - Implementar endpoint para confirmar rendición marcando `rendido = true` y registrando usuario confirmador.
  - *Criterio de verificación*: Al confirmar la rendición de una profesora, su saldo pendiente se reduce a cero.

---

## Fase 3: Frontend – Pantallas de Pagos y Caja

- [ ] **3.1. Modal de Cobro Rápido en Efectivo (US-15)**
  - Formulario con monto por defecto de la cuota, selección de profesora receptora y botón de confirmación.
  - Generación de vista/impresión de recibo de cobro.
  - *Criterio de verificación*: Modal accesible desde la ficha del alumno que procesa el cobro y actualiza la vista.

- [ ] **3.2. Panel de Aprobación de Transferencias (US-16 y US-17)**
  - Vista en `/admin/transferencias` con lista de transferencias pendientes, visor de comprobante y botones "Aprobar" / "Rechazar".
  - *Criterio de verificación*: La Propietaria visualiza la imagen del comprobante y al presionar "Aprobar", la fila desaparece de pendientes.

- [ ] **3.3. Indicadores de Habilitación (Semáforo) (US-18)**
  - Componente badge `<BadgeHabilitacion estado="..." />` integrado en tablas y cabeceras de alumno.
  - *Criterio de verificación*: El badge muestra colores diferenciados (Verde, Amarillo, Rojo) con tooltip informativo.

- [ ] **3.4. Panel de Rendición de Efectivo (US-19)**
  - Vista `/admin/rendiciones` con tarjetas de resumen por profesora, tabla de pagos en efectivo no rendidos y botón "Confirmar Rendición".
  - *Criterio de verificación*: Selección de pagos de una profesora y confirmación con actualización del total.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01**: Registro de cobro en efectivo y cambio a estado `AL_DIA`.
- [ ] **4.2. Verificación CA-02 y CA-03**: Carga de transferencia pendiente, verificación de no habilitación y posterior aprobación con habilitación inmediata.
- [ ] **4.3. Verificación CA-04**: Validación del cálculo de días de gracia en diferentes fechas.
- [ ] **4.4. Verificación CA-05**: Simulación de cobro en efectivo por profesora y posterior rendición con la Propietaria.
