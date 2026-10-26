# US-16 – Registro de pago por transferencia (Portal "Mi Plan")

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Alumno o Tutor
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Permitir a los alumnos y tutores consultar el estado de su plan y sus cuotas, obtener los datos bancarios del centro (CBU/Alias) con copiado rápido, informar avisos de transferencias bancarias y seguir el estado de verificación de sus pagos.

## 3. Descripción

Como alumno o tutor, quiero acceder a un portal de autogestión ("Mi plan y transferencias") donde pueda consultar mi situación de cuota, copiar con un clic los datos bancarios del centro para realizar transferencias fuera del sistema, y hacer el seguimiento de mis avisos de pago hasta su aprobación definitiva.

## 4. Estados de la pantalla / flujo

- [ ] **Loading**: Cargando los datos de la inscripción, situación de cuota y el historial de pagos del alumno.
- [ ] **Portal "Mi Plan y Transferencias" (`MiPlanPage`)**:
  - **Encabezado**: Título `tracking-tight` y badge de píldora con el conteo total de pagos registrados.
  - **Tarjeta de Resumen de Plan y Cuota (`ResumenPlanCuota`)**: Detalle de la actividad, plan actual, importe, fecha de vencimiento y badge de situación (`Al día`, `Período de gracia` o `Cuota vencida`).
  - **Alerta de Transferencia en Verificación**: Banner destacado en ámbar cuando existe un aviso de transferencia pendiente de revisión por la administración.
  - **Tarjeta de Datos Bancarios (`DatosBancariosCard`)**: Visualización de CBU, Alias, Titular, CUIT y Banco, con botones de copiado rápido al portapapeles ("Copiar CBU", "Copiar Alias") y feedback visual inmediato ("Copiado").
  - **Historial de Pagos (`ListaMisTransferencias`)**: Tarjetas de pagos realizados (transferencias y efectivo) con fecha, importe, método y badge de estado (`Cobrado`, `En verificación`, `Aprobado` o `Rechazado`).
- [ ] **Empty**: Estado visual cuando el alumno no posee pagos registrados aún.
- [ ] **Error**: Mensaje amigable con botón "Reintentar" si falla la consulta de datos.

## 5. Datos que necesita

### Datos que muestra (Mi Plan)

- **Plan actual**: Nombre del plan y disciplina.
- **Situación de cuota**: Estado (`AL_DIA`, `EN_GRACIA`, `VENCIDA`), monto esperado y fecha límite de pago.
- **Datos bancarios del centro**:
  - CBU (22 dígitos).
  - Alias bancario.
  - Titular de la cuenta y CUIT.
  - Entidad bancaria.
- **Transferencias informadas**:
  - Fecha informada del pago.
  - Importe abonado.
  - Estado del aviso (`PENDIENTE`, `APROBADA`, `RECHAZADA`).
  - Motivo de rechazo (si fue desestimada por la propietaria en US-17).

### Datos del aviso de transferencia

- **Monto de la transferencia**: Importe efectivamente transferido.
- **Fecha de la operación**: Día en que se realizó la transferencia.
- **Observaciones**: Nota opcional enviada por el alumno o tutor.

## 6. Acciones del usuario

- Acceder a `/mi-plan` desde la barra de navegación del alumno/tutor.
- Copiar el CBU o Alias bancario mediante el botón de un solo toque para operar en su app bancaria o billetera virtual.
- Revisar si posee una transferencia pendiente de verificación.
- Consultar el historial cronológico de cuotas abonadas y comprobantes.

## 7. Reglas de negocio

1. **Sin Carga Forzada de Archivos**: Siguiendo el requerimiento del negocio, el sistema no exige adjuntar obligatoriamente fotos o PDFs pesados de comprobantes; la propietaria verifica los ingresos directamente en su extracto bancario oficial (US-17).
2. **Habilitación Durante la Verificación**: En alumnos activos que renuevan su plan, la existencia de un aviso de transferencia en estado `PENDIENTE` **mantiene al alumno habilitado para asistir a clase** mientras la administración corrobora la acreditación.
3. **Plazo de Verificación**: El sistema informa que las transferencias bancarias pueden demorar hasta 48 horas hábiles en verificarse e imputarse definitivamente.
4. **Alta Definitiva en Alumnos Nuevos**: Para pre-inscriptos nuevos (US-05), la aprobación de la transferencia por la propietaria es la que dispara el alta definitiva del alumno (US-07).
5. **Aprobación Transaccional**: El aviso no cancela la deuda de la cuota hasta que la propietaria confirme la acreditación en la pantalla de revisión de transferencias (US-17).
6. **Visibilidad Multirrol**: Esta pantalla está diseñada y autorizada tanto para alumnos mayores como para tutores de menores de edad.

## 8. Criterios de aceptación

- [ ] **CA-01 (Carga del portal Mi Plan)**: El alumno autenticado ingresa a `/mi-plan` y visualiza su plan actual, su situación de cuota y los datos bancarios del centro.
- [ ] **CA-02 (Copiado rápido de CBU/Alias)**: Al hacer clic en "Copiar CBU" o "Copiar Alias", el texto se envía al portapapeles y el botón cambia temporalmente a "Copiado".
- [ ] **CA-03 (Alerta de pago en revisión)**: Si el alumno informó una transferencia y está pendiente, se muestra el aviso destacado en ámbar indicando que puede asistir a clase.
- [ ] **CA-04 (Historial de pagos)**: El listado presenta los cobros en efectivo y transferencias anteriores con sus respectivos badges de estado.
- [ ] **CA-05 (Reintento ante fallos)**: Si la conexión falla, se ofrece el botón "Reintentar" para recargar la información sin salir de la vista.

## 9. Casos borde / Errores

- Transferencia rechazada por la propietaria → el alumno ve el badge rojo de "Rechazada", el motivo de la desestimación y se le solicita regularizar su situación.
- Copiado en navegadores sin soporte de `navigator.clipboard` → fallback seguro de selección de texto.

## 10. Dependencias y Trazabilidad

- **US-01**: Autenticación del alumno o tutor.
- **US-11 y US-12**: Planes vigentes y precios del centro.
- **US-17**: Pantalla de la propietaria para auditar y aprobar/rechazar las transferencias.
- **US-18**: Estado de habilitación del alumno derivado de la situación de su cuota.
- **Backend**:
  - `GET /api/v1/alumnos/mi-plan`: consulta del plan y cuota del usuario en sesión.
  - `GET /api/v1/alumnos/mis-transferencias`: historial de transferencias.
  - `GET /api/v1/parametros/datos-bancarios`: datos de la cuenta del centro.

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Ruta `/mi-plan` accesible desde el menú para roles `ALUMNO` y `TUTOR`.
- **Componentes clave**:
  - `MiPlanPage`: Vista contenedora con layout estándar y badges de estado.
  - `DatosBancariosCard`: Tarjeta de datos bancarios con copiado asistido.
  - `ResumenPlanCuota`: Ficha de situación de cuota con alertas condicionales.
  - `ListaMisTransferencias`: Listado de pagos con badges semánticos (`Badge`).
  - `plazo-verificacion.ts`: Lógica de cómputo de plazos hábiles.
- **Tests**: `mi-plan-page.test.tsx`, `plazo-verificacion.test.ts`.
