# US-19 – Control de efectivo pendiente de rendición

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Permitir a la Propietaria controlar, verificar y asentar la entrega física de los cobros en efectivo recaudados por las profesoras, soportando rendiciones totales o parciales y manteniendo un historial auditable para el cierre de caja.

## 3. Descripción

Como propietaria, quiero consultar el efectivo recaudado por cada profesora que aún no ha sido entregado en administración, ver el desglose de los cobros individuales y registrar las rendiciones (totales o parciales con selección múltiple), para mantener la caja física del centro cuadrada y con trazabilidad completa.

## 4. Estados de la pantalla / flujo

- [ ] **Acceso en Cobros (`CobrosPage`)**: Subpestaña "Efectivo a rendir" en `/admin/cobros`.
- [ ] **Panel de Efectivo a Rendir (`PanelEfectivoARendir`)**:
  - **Tarjeta de Resumen Global**: Muestra el monto total de efectivo pendiente en manos del plantel docente y la cantidad de profesoras con cobros a rendir.
  - **Subpestaña "Pendientes de rendición"**: Acordeón por docente (`AcordeonProfesoraRendicion`).
  - **Subpestaña "Historial de rendiciones"**: Tabla de rendiciones históricas completadas (`TablaHistorialRendiciones`).
- [ ] **Acordeón por Profesora**: Cada tarjeta docente muestra su nombre, avatar, total acumulado y cantidad de pagos; al expandirse, despliega la tabla de cobros con checkboxes para selección individual o total.
- [ ] **Modal de Confirmación de Rendición (`ModalConfirmarRendicion`)**: Diálogo emergente que detalla el monto exacto a asentar, los cobros seleccionados (rendición parcial o total), campo de observaciones y botón de confirmación.
- [ ] **Éxito**: Los cobros rendidos desaparecen de la vista de pendientes, descuentan del saldo de la profesora y se incorporan al historial de rendiciones.
- [ ] **Empty**: Estado visual cuando no hay cobros en efectivo pendientes de rendición en el centro.

## 5. Datos que necesita

### Datos que muestra (Listado de pendientes)

- **Total general pendiente**: Sumatoria del efectivo en poder de todas las docentes.
- **Por profesora**:
  - Nombre y apellido de la docente.
  - Total a rendir acumulado.
  - Cantidad de cobros pendientes.
  - Desglose de cobros:
    - Alumno que abonó.
    - Plan / concepto cubierto.
    - Fecha y hora del cobro.
    - Monto cobrado.
    - Checkbox de selección para la rendición.

### Datos del registro de rendición (`ModalConfirmarRendicion`)

- **Profesora**: Docente que rinde el dinero.
- **Monto total a asentar**: Suma de los cobros seleccionados.
- **Cobros incluidos**: Lista de identificadores de pago (`pagosIds`).
- **Observaciones**: Nota opcional de cierre de entrega.

### Datos del historial de rendiciones

- **Fecha y hora de la rendición**.
- **Profesora que entregó el dinero**.
- **Monto rendido**.
- **Cantidad de cobros incluidos**.
- **Usuario receptor** (la Propietaria autenticada).
- **Observaciones registradas**.

## 6. Acciones del usuario

- Ver el resumen general de dinero en poder de las profesoras.
- Expandir el acordeón de una profesora para auditar sus cobros en efectivo.
- Seleccionar todos los cobros de una profesora para una rendición total.
- Marcar cobros específicos mediante checkboxes para realizar una **rendición parcial**.
- Abrir el modal de confirmación, revisar el importe y asentar la rendición.
- Consultar la pestaña "Historial de rendiciones" con buscador por profesora o fecha.

## 7. Reglas de negocio

1. **Origen Automático**: Cada cobro en efectivo registrado por una docente en US-15 genera de forma automática un registro en estado `pendiente_rendicion = true`.
2. **Exclusión de Cobros de Propietaria**: El dinero cobrado directamente por la propietaria no genera pendiente de rendición, ya que se encuentra en la caja central desde su origen.
3. **Soporte de Rendición Parcial y Total**: La propietaria puede confirmar la entrega de todos los cobros de una docente de una sola vez o seleccionar únicamente los pagos efectivamente entregados en mano.
4. **Inmutabilidad y Preservación**: Una vez asentada la rendición, los cobros involucrados quedan sellados con `rendido = true`, fecha de rendición y usuario que la recibió; no pueden rendirse nuevamente.
5. **Historial Permanente**: Las rendiciones pasadas quedan archivadas en el historial de rendiciones para auditorías contables del centro.

## 8. Criterios de aceptación

- [ ] **CA-01 (Visualización de efectivo a rendir)**: La propietaria visualiza el total acumulado y el listado de docentes con efectivo pendiente.
- [ ] **CA-02 (Rendición total)**: Seleccionar todos los cobros de una docente y confirmar → el saldo de la docente pasa a $0 y los ítems pasan al historial.
- [ ] **CA-03 (Rendición parcial)**: Seleccionar 2 de 4 cobros pendientes y confirmar → solo los 2 seleccionados se asientan; el saldo restante sigue visible como pendiente.
- [ ] **CA-04 (Trazabilidad en historial)**: La rendición asentada se visualiza inmediatamente en `TablaHistorialRendiciones` con fecha, monto y usuario receptor.
- [ ] **CA-05 (Empty State)**: Cuando todas las docentes tienen sus cajas rendidas, el panel muestra un mensaje visual de caja al día.

## 9. Casos borde / Errores

- Docente que rinde importe en una fecha posterior a la baja lógica → el sistema permite listar y asentar el cobro pendiente normalmente.
- Intento de enviar una rendición sin seleccionar ningún cobro → el botón "Confirmar rendición" permanece deshabilitado hasta seleccionar al menos un ítem.

## 10. Dependencias y Trazabilidad

- **US-15**: Registro de cobros en efectivo por parte de las docentes que alimenta este módulo.
- **US-23**: Liquidación de honorarios (el efectivo cobrado se concilia con las liquidaciones docentes).
- **Backend**:
  - `GET /api/v1/pagos/pendientes-rendicion`: listado agrupado por profesora.
  - `POST /api/v1/pagos/rendiciones`: registro de la entrega con lista de pagos e importe.
  - `GET /api/v1/pagos/rendiciones/historial`: consulta para la tabla histórica.

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Ruta `/admin/cobros` (pestaña "Efectivo a rendir").
- **Componentes clave**:
  - `PanelEfectivoARendir`: Contenedor principal del módulo.
  - `AcordeonProfesoraRendicion`: Acordeón interactivo con checkboxes de selección y cálculo reactivo de subtotales.
  - `ModalConfirmarRendicion`: Diálogo flotante centrado de confirmación y observaciones.
  - `TablaHistorialRendiciones`: Tabla auditable de rendiciones efectuadas.
  - `useRendiciones`: Hook TanStack Query para sincronización de saldos en tiempo real.
- **Tests**: `efectivo-a-rendir.test.tsx` (12 tests) y `pagos-rendicion.test.ts`.
