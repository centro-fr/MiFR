# US-23 – Informe mensual automático de honorarios

## 1. Información general

- **Épica:** Honorarios
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4 (regla de cálculo actualizada en el Sprint 5)

## 2. Objetivo

Generar automáticamente un informe mensual con los honorarios de cada profesora según sus alumnos a cargo (calculados sobre el 50 % de los ingresos por cuotas) y sus suplencias, para agilizar la liquidación sin cálculos manuales.

## 3. Descripción

Como propietaria, quiero generar un informe mensual automático con los honorarios de cada profesora, calculados como el 50 % de los ingresos por cuotas de sus alumnos, para agilizar la liquidación sin cálculos manuales.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando informe)
- [ ] Selección de mes (el mes en curso y los 11 anteriores)
- [ ] Mes sin calcular: "Todavía no se calcularon los honorarios de …", con el botón "Calcular honorarios"
- [ ] Informe calculado: total del mes, estado de los honorarios y una tarjeta por profesora
- [ ] Detalle expandido de una profesora (alumnos a cargo y suplencias)
- [ ] Avisos del cálculo: lo que no se pudo calcular (por ejemplo, una profesora sin tarifa)
- [ ] Cambio de tarifa de una profesora (diálogo)
- [ ] Confirmación al cerrar los honorarios o marcarlos como abonados
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error, con reintentar

## 5. Datos que necesita

### Datos que muestra (informe)

- Período del informe (mes)
- Total general de honorarios (la suma de las profesoras)
- Estado de los honorarios del mes (en revisión, cerrados o abonados) y cuándo se calcularon por última vez
- Por profesora:
  - Nombre
  - Estado: en revisión / cerrada / abonada
  - Total a liquidar
  - Tarifa vigente
  - Cantidad de alumnos a cargo y subtotales de alumnos y de suplencias (cuando el back los mande en el listado)
  - Detalle de alumnos a cargo: nombre, monto y cómo se calculó (ej: "$ 30.000 × 50%"). El plan y la situación de la inscripción se muestran cuando el back los mande.
  - Suplencias del mes (US-24): si cubrió una clase o se la cubrieron, actividad, fecha, horario y monto (suma o resta)

### Datos de configuración (tarifas)

Cada profesora tiene sus tarifas (porcentaje de honorarios sobre ingresos por cuotas —50 % por defecto— o monto fijo), con fecha de vigencia:

- **Por alumno a cargo**, de una de dos formas:
  - porcentaje de lo cobrado de la cuota del alumno en el mes (50 %, configurable por la propietaria)
  - monto fijo por alumno, asista o no
- **Por hora de suplencia:** monto fijo por hora.
- "Rige desde": no puede ser una fecha pasada. Una tarifa nueva cierra la vigente del mismo concepto.
- El back también admite una tarifa para un plan puntual, que gana a la general; la pantalla la muestra como "Según el plan", pero desde ahí solo se cargan las generales.

### Datos que se generan

- Los honorarios de cada profesora en el mes, con una línea por alumno a cargo y por clase suplida
- Exportación a PDF (imprimir o guardar) y a Excel (planilla CSV)
- Historial: los meses anteriores quedan guardados y se consultan con el selector de mes

## 6. Acciones del usuario

- Seleccionar el mes del informe
- Calcular o recalcular el mes
- Ver el informe consolidado
- Expandir el detalle por profesora ("Ver detalle")
- Cambiar la tarifa de una profesora
- Cerrar los honorarios de una profesora
- Marcarlos como abonados (solo deja registro: el sistema no mueve dinero)
- Exportar el informe (PDF / Excel)
- Ver informes de meses anteriores

## 7. Reglas de negocio

- El informe es **solo informativo** y **visible únicamente por la propietaria**. Verlo pide `HONORARIOS_VER_TODOS`; calcular, cambiar tarifas, cerrar y marcar como abonados piden además `HONORARIOS_LIQUIDAR`.
- Se calcula por **mes calendario**. El mes en curso se puede calcular y recalcular; los meses futuros, no.
- **Regla acordada** (`back/honorarios-pendientes.md`): cada profesora recibe el **50 % de lo cobrado** de las cuotas de sus alumnos, sin mínimo de alumnos. Se carga como tarifa "porcentaje de lo cobrado" de 50 %. El sistema también admite un monto fijo por alumno.
  - Ejemplo: si los ingresos por cuotas atribuibles a una profesora suman $200.000, sus honorarios son $200.000 × 50 % = $100.000.
  - El porcentaje de honorarios es configurable por la propietaria.
- **Se cuenta cada inscripto, asista o no**: una línea por cada inscripción que estuvo a cargo de la profesora algún día del mes.
  - No generan honorarios las pre-inscripciones, las inscripciones sin cargo (bonificadas) ni las bajas que nunca pagaron una cuota.
  - Los alumnos dados de baja durante el mes se cuentan si cobraron.
  - Los alumnos con clase suelta también se cuentan.
- Con tarifa por porcentaje, la base es lo cobrado (**pagos confirmados**) de las cuotas de esa inscripción con fecha de pago dentro del mes. Los pagos pendientes o rechazados no cuentan. Un alumno que no pagó en el mes figura en $ 0. Con monto fijo, suma igual aunque no haya pagado.
- Los pagos parciales cuentan por el monto efectivamente confirmado en el mes.
- La tarifa que se aplica es la vigente el **último día del mes**, o el día de la baja si el alumno se dio de baja antes. Un cambio de tarifa a mitad de mes se aplica a todo el mes al recalcular.
- Una profesora sin tarifa: sus líneas no se generan (no suman) y el cálculo lo avisa.
- Las **suplencias** (US-24): la suplente suma las horas de la clase por su tarifa por hora, y a la titular se le resta lo mismo.
- Si un alumno cambia de profesora en el mes, cada inscripción se liquida a su profesora. Si las dos estuvieron activas en el mes, el alumno cuenta para las dos.
- Estados de los honorarios de cada profesora:
  - **En revisión** (`BORRADOR`): se recalculan cada vez que se calcula el mes.
  - **Cerrada** (`CERRADA`): queda como foto; ya no se recalcula aunque cambien las tarifas, los alumnos o las suplencias.
  - **Abonada** (`PAGADA`): además, se registró que se le abonó por fuera del sistema.
  - Solo se avanza en ese orden: en revisión → cerrada → abonada.
- El total de cada profesora es la suma de sus líneas, y el total general la suma de las profesoras. Los montos se redondean al centavo.
- El informe **no genera pagos automáticos**, solo muestra el cálculo.
- No hay ajuste manual del honorario (fuera del MVP): mientras está en revisión, se corrige la tarifa o la suplencia y se recalcula.
- Cada cálculo, cierre y marca de abonado queda en la auditoría.
- En la interfaz se habla de "honorarios", no de "liquidación".

## 8. Criterios de aceptación

- [ ] Profesora con ingresos por cuotas de $200.000 en el mes → honorarios de $100.000 (50 %), sin importar la cantidad de alumnos
- [ ] Acceso de una profesora al informe de honorarios → falla (acceso restringido)
- [ ] El informe muestra el detalle por profesora y por alumno
- [ ] Se puede exportar el informe a PDF / Excel
- [ ] Las suplencias suman a la suplente y se descuentan a la titular
- [ ] El total general coincide con la suma de los honorarios individuales
- [ ] El informe refleja solo el período seleccionado
- [ ] Los pagos pendientes o rechazados no suman a los ingresos
- [ ] Recalcular el mes no cambia los honorarios ya cerrados
- [ ] Profesora sin tarifa → el cálculo lo avisa y sus alumnos no suman

## 9. Casos borde / Errores

- Profesora sin alumnos ni suplencias en el período → honorario cero
- Alumno que cambió de profesora en el medio del mes → cada inscripción se liquida a su profesora
- Alumno que se dio de baja durante el mes → se cuenta, con la tarifa vigente el día de la baja (cuenta si cobró)
- Pre-inscripto que todavía no pagó → no se cuenta
- Pago que cubre más de una cuota → cuenta por el monto confirmado en el mes del pago
- Suplencia no registrada → el informe no la refleja (requiere que US-24 esté registrada)
- Suplencia cargada o editada después de cerrar los honorarios → no cambia lo cerrado
- Cambio de tarifa a mitad de mes → se aplica a todo el mes; para que no afecte al mes en curso, tiene que regir desde el 1 del mes siguiente
- Mes futuro → no se puede calcular
- Error al exportar el informe → reintentar
- Error de red al cargar el informe → reintentar

## 10. Dependencias

- US-03, US-04 (actividades y horarios)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica)
- US-15, US-17 (cobros confirmados: base de la tarifa por porcentaje)
- US-24 (suplencias, que ajustan el cálculo)
- US-01 (sesión y permisos: solo la propietaria accede)
- Backend:
  - `GET` y `POST /api/v1/tarifas-honorario` y `POST /api/v1/tarifas-honorario/:id/cerrar`
  - `POST /api/v1/liquidaciones` (calcula o recalcula el mes y devuelve los avisos)
  - `GET /api/v1/liquidaciones?periodo=AAAA-MM` y `GET /api/v1/liquidaciones/:id`
  - `POST /api/v1/liquidaciones/:id/cerrar` y `POST /api/v1/liquidaciones/:id/pagar`

## 11. Notas de implementación (Front)

- Se implementó primero con mocks y después contra el back.
- Complejidad: Media-Alta (por el cálculo y las reglas de negocio)
- UI:
  - Acceso desde el menú de la propietaria (sección "Centro" → "Honorarios"), con dos pestañas: "Honorarios del mes" y "Suplencias" (US-24)
  - Selector de mes; el mes queda en la URL (`?mes=AAAA-MM`) para volver a un informe anterior o compartirlo
  - Una tarjeta por profesora con el total, el estado, la tarifa y el botón "Cambiar"; "Ver detalle" pide el detalle recién al abrirla
  - Total del mes y estado de los honorarios arriba de las tarjetas, con "Recalcular" mientras haya alguno en revisión
  - Botón "Exportar" con opciones PDF / Excel. El back devuelve los datos y el front arma el PDF (impresión) y el CSV.
  - Los honorarios se muestran con formato de moneda consistente
  - Restricción de acceso: solo propietaria (reforzado por permisos)
  - Manejar el caso de "sin calcular" para el período seleccionado
- Pendiente del back: mandar en el listado la cantidad de alumnos y los subtotales, en cada alumno su plan y la situación de la inscripción, y en cada suplencia quién faltó y quién la cubrió. El front ya los muestra cuando llegan.
- Pendiente de definir con el equipo: si la profesora ve sus propios honorarios cerrados o abonados (el catálogo tiene `HONORARIOS_VER_PROPIOS`, pero hoy solo accede la propietaria).
