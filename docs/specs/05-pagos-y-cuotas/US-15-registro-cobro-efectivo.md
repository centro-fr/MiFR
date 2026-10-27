# US-15 – Registro de cobro en efectivo

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Profesora o Propietaria
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Permitir a las profesoras y a la propietaria registrar cobros de cuotas en efectivo de manera ágil, calculando el vuelto en tiempo real, actualizando la habilitación del alumno al instante, generando un comprobante digital auditable y registrando el efectivo a rendir.

## 3. Descripción

Como profesora o propietaria, quiero registrar el cobro en efectivo de una o más cuotas de un alumno, contando con una calculadora de vuelto en el diálogo y visualizando de inmediato el comprobante digital tipo recibo, para entregar una constancia al alumno y mantener la caja y el efectivo pendiente de rendición perfectamente conciliados.

## 4. Estados de la pantalla / flujo

- [ ] **Pantalla de Cobros (`CobrosPage`)**: Vista principal con navegación por pestañas:
  - **Pestaña "Cuotas"**: Listado de alumnos con plan, fecha de vencimiento y badge de situación de cuota (Al día, En gracia, Vencida, Cobro adelantado).
  - **Pestaña "Efectivo a rendir"**: Panel de rendiciones para la propietaria (US-19).
- [ ] **Modal de Cobro en Efectivo**: Diálogo emergente centrado que muestra los datos de la cuota a cancelar, el importe sugerido y el campo para ingresar con cuánto abona el alumno, calculando el vuelto en vivo.
- [ ] **Procesando cobro**: Deshabilitación del botón y feedback de guardado asíncrono.
- [ ] **Modal de Comprobante Digital (`ModalComprobante`)**: Diálogo emergente tipo recibo con diseño profesional, datos fiscales/operativos del centro, número de comprobante, badge `PAGADO` y botón para imprimir o guardar en PDF.
- [ ] **Actualización inmediata**: El alumno pasa instantáneamente a estado `AL_DIA` y el monto ingresa en la lista de efectivo pendiente de rendición de la docente.
- [ ] **Error**: Manejo visual de rechazos (ej. cuota ya pagada o importe inválido).

## 5. Datos que necesita

### Datos que muestra

- **Alumno**: Nombre y apellido.
- **Plan actual**: Nombre del plan y modalidad de cobro.
- **Cuota a pagar**: Período mensual cubierto (`AAAA-MM` o concepto de clase).
- **Situación actual**: Estado de vencimiento e importe adeudado.

### Datos que se cargan en el formulario

- **Monto cobrado** (`monto`): Obligatorio. Importe numérico positivo que cancela la cuota.
- **Paga con** (`pagaCon`): Opcional/Auxiliar en UI. Importe entregado por el cliente para calcular el vuelto.
- **Observaciones**: Opcional. Nota interna sobre el pago.

### Datos del comprobante digital generado

- **Número de comprobante**: Identificador alfanumérico único (ej. `REC-2026-0042`).
- **Fecha y hora**: Marca de tiempo del registro.
- **Alumno y Plan**: Datos del titular e inscripción.
- **Concepto**: Período mensual y detalle del plan.
- **Monto total**: Importe formateado en moneda argentina.
- **Forma de pago**: `EFECTIVO`.
- **Cobrado por**: Nombre y apellido del usuario autenticado que recibió el dinero.

## 6. Acciones del usuario

- Buscar alumnos por nombre o DNI en la tabla de cuotas.
- Filtrar la lista de cuotas por estado (Vencidas, En gracia, Al día).
- Presionar el botón "Cobrar" sobre la fila o tarjeta del alumno.
- Ingresar el monto a cobrar y el dinero recibido para comprobar el vuelto en tiempo real.
- Confirmar el cobro.
- Visualizar e imprimir el comprobante digital desde el modal emergente.
- Consultar los cobros realizados en el historial del alumno o en el panel de rendiciones.

## 7. Reglas de negocio

1. **Impacto Inmediato en Habilitación**: Al confirmarse el cobro en efectivo, la cuota pasa a estado `PAGADA` y el alumno queda inmediatamente habilitado (`AL_DIA`) para ingresar a clase (US-18).
2. **Generación Obligatoria de Comprobante**: Cada cobro en efectivo genera un comprobante digital inmutable disponible para impresión o descarga digital.
3. **Control de Efectivo a Rendir**: Si el cobro es registrado por una **Profesora**, el importe cobrado incrementa automáticamente su saldo pendiente de rendición hacia la propietaria (US-19).
4. **Cobro por la Propietaria**: Los cobros cobrados directamente por la usuaria con rol `PROPIETARIA` se consideran automáticamente ingresados a caja central (no generan deuda de rendición).
5. **Cálculo Preciso de Vuelto**: La interfaz no permite ingresar un valor en "Paga con" inferior al monto cobrado para evitar inconsistencias numéricas.
6. **Monto Acorde a la Tarifa Vigente**: El monto por defecto corresponde al precio vigente del plan (US-12), con promociones aplicadas si existieran (US-13).

## 8. Criterios de aceptación

- [ ] **CA-01 (Cobro exitoso de cuota vencida)**: Registrar el cobro en efectivo de una cuota en mora → el alumno pasa a "Cuota al día" y se abre el comprobante.
- [ ] **CA-02 (Cálculo de vuelto interactivo)**: Ingresar monto a cobrar $30.000 y abono con $40.000 → el diálogo muestra en tiempo real "Vuelto: $10.000".
- [ ] **CA-03 (Comprobante digital fiel)**: El `ModalComprobante` presenta todos los datos requeridos (número, fecha, alumno, plan, monto y badge de pagado).
- [ ] **CA-04 (Imputación a rendiciones)**: El cobro realizado por la profesora se refleja inmediatamente en su acordeón de efectivo a rendir (US-19).
- [ ] **CA-05 (Validación Zod)**: Un importe menor o igual a cero o con formato no numérico es rechazado por el formulario.

## 9. Casos borde / Errores

- Alumno que paga dos cuotas juntas → se registra el cobro de la primera y se habilita la cancelación de la siguiente.
- Alumno con pago adelantado → se genera la cuota del período venidero y se marca como cobrada anticipadamente.
- Cierre accidental del modal de comprobante → el comprobante permanece accesible desde el historial del alumno.

## 10. Dependencias y Trazabilidad

- **US-10**: Consulta y listado de alumnos para ubicar a quien abona.
- **US-11 y US-12**: Planes vigentes y precios aplicados al cobro.
- **US-18**: Cálculo del estado de habilitación del alumno.
- **US-19**: Módulo de rendición de efectivo donde se rinde el dinero recaudado.
- **Backend**:
  - `POST /api/v1/cuotas/:id/cobros`: registro del cobro en efectivo.
  - `GET /api/v1/pagos/:id/comprobante`: obtención de datos para el recibo digital.

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Ruta `/admin/cobros` (pestaña "Estado de cuotas").
- **Componentes clave**:
  - `CobrosPage`: Contenedor principal con filtros de búsqueda y pestañas.
  - `ModalCobroEfectivo`: Diálogo modal con esquema `cobroEfectivoSchema` y calculadora de vuelto.
  - `ModalComprobante`: Recibo visual estilizado con estilos de impresión CSS (`@media print`).
- **Tests**: `modal-comprobante.test.tsx`, `cobro-efectivo.schema.test.ts`.
