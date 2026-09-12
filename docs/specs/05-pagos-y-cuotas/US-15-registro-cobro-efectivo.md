# US-15 – Registro de cobro en efectivo

## 1. Información general
- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Profesora o Propietaria
- **Sprint sugerido:** Sprint 3

## 2. Objetivo
Permitir registrar el cobro de una cuota en efectivo, actualizando automáticamente el estado del alumno y generando el comprobante correspondiente.

## 3. Descripción
Como profesora o propietaria, quiero registrar el cobro de una cuota en efectivo para actualizar el estado del alumno y generar el comprobante correspondiente.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando datos del alumno y cuota)
- [ ] Formulario de registro de cobro
- [ ] Confirmación del cobro
- [ ] Procesando
- [ ] Éxito (cobro registrado + comprobante generado)
- [ ] Error de validación
- [ ] Error de red
- [ ] Comprobante generado (vista / descarga)

## 5. Datos que necesita
### Datos que muestra:
- Nombre del alumno
- Plan actual
- Estado de cuota actual (al día / por vencer / vencida)
- Monto de la cuota a cobrar
- Período que cubre el pago
- Profesora a cargo (si aplica)
- Promoción aplicada (si corresponde)

### Datos que se cargan:
- Monto cobrado (obligatorio, por defecto el de la cuota)
- Fecha del cobro (por defecto hoy)
- Período cubierto (mes, clase suelta, etc.)
- Observaciones (opcional)

### Datos que se generan:
- Nuevo estado de cuota: `al día`
- Fecha de vencimiento actualizada
- Comprobante de pago (número, fecha, monto, alumno, plan)
- Registro del cobro en el historial del alumno
- Registro de efectivo pendiente de rendición (US-19)

## 6. Acciones del usuario
- Buscar al alumno por nombre, DNI o desde el listado
- Ver el estado actual de su cuota
- Registrar el cobro en efectivo
- Confirmar el cobro
- Ver / descargar el comprobante generado
- Cancelar la operación

## 7. Reglas de negocio
- El pago en efectivo lo registra **la profesora a cargo o la propietaria**.
- Al confirmarse el cobro, se debe **actualizar automáticamente el estado de cuota** del alumno (de vencida o por vencer → al día).
- Se debe **generar un comprobante** con: número, fecha, monto, alumno, plan, período, quién cobró.
- El cobro en efectivo queda registrado como **pendiente de rendición** por parte de la profesora (US-19).
- El monto cobrado debe coincidir con el precio vigente del plan (US-12) menos la promoción aplicable (US-13), salvo que se autorice un ajuste manual.
- Si hay una promoción vigente, se debe aplicar automáticamente al calcular el monto.
- El comprobante debe poder imprimirse o descargarse (PDF).
- El cobro no puede registrarse si el alumno está dado de baja (a menos que se reactive primero).
- El cobro queda asociado al período correspondiente.

## 8. Criterios de aceptación
- [ ] Registro de cobro en efectivo de una cuota vencida → el alumno pasa a "al día"
- [ ] Registro de cobro sin monto ingresado → falla (campo obligatorio)
- [ ] El comprobante se genera correctamente con todos los datos
- [ ] El monto cobrado refleja la promoción vigente si corresponde
- [ ] El cobro queda registrado como pendiente de rendición (US-19)
- [ ] El historial del alumno refleja el nuevo cobro

## 9. Casos borde / Errores
- Monto cobrado distinto al de la cuota → advertir y requerir confirmación
- Alumno con deuda de varios períodos → permitir seleccionar qué período se está pagando
- Alumno dado de baja → no permitir cobro (o advertir)
- Alumno con cuota al día que paga adelantado → permitir y registrar
- Error al generar el comprobante → no confirmar el cobro hasta que se genere correctamente
- Error de red al guardar

## 10. Dependencias
- US-09, US-10 (búsqueda y ficha del alumno)
- US-11, US-12, US-13 (plan, precio vigente y promoción)
- US-18 (estado de habilitación que se actualiza)
- US-19 (control de efectivo pendiente de rendición)
- US-23 (honorarios, que consideran los cobros)
- Backend: endpoint de registro de cobro + generación de comprobante

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde:
    - Ficha del alumno (botón "Registrar cobro")
    - Listado de cuotas vencidas
    - Acceso rápido desde el panel de la profesora
  - Formulario con:
    - Alumno (solo lectura, ya seleccionado)
    - Plan actual (solo lectura)
    - Monto a cobrar (editable, con validación)
    - Período cubierto (selector)
    - Fecha del cobro (por defecto hoy)
    - Observaciones (opcional)
  - Confirmación con resumen claro antes de guardar
  - Al confirmar, mostrar el comprobante generado en un modal con opciones de imprimir/descargar
  - Indicar visualmente que el cobro queda "pendiente de rendición"
  - Formato de moneda consistente