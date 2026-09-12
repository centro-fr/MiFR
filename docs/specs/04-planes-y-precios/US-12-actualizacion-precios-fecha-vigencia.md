# US-12 – Actualización de precios con fecha de vigencia

## 1. Información general
- **Épica:** Planes y Precios
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Permitir actualizar los precios de los planes con una fecha de vigencia, para aplicar incrementos sin alterar las cuotas ya cobradas.

## 3. Descripción
Como propietaria, quiero actualizar los precios de los planes con fecha de vigencia para aplicar incrementos sin alterar cuotas ya cobradas.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando planes y precios vigentes)
- [ ] Listado de planes con precio actual
- [ ] Formulario de actualización de precio
- [ ] Confirmación de cambio de precio
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red
- [ ] Historial de precios por plan (opcional)

## 5. Datos que necesita
### Datos que muestra:
- Nombre del plan
- Precio actual vigente
- Fecha de vigencia del precio actual
- Precio anterior (histórico, opcional)
- Fecha de la última actualización

### Datos que se cargan / editan:
- Nuevo precio (obligatorio)
- Fecha de vigencia (obligatoria) — a partir de cuándo aplica el nuevo precio
- Motivo o nota del cambio (opcional)

### Datos que NO se pueden editar:
- Precios históricos ya aplicados
- Cuotas ya cobradas

## 6. Acciones del usuario
- Ver el precio actual de cada plan
- Definir un nuevo precio con fecha de vigencia
- Consultar el historial de precios de un plan (opcional)
- Cancelar la actualización antes de guardar

## 7. Reglas de negocio
- El nuevo precio aplica **solo a partir de la fecha de vigencia** definida.
- Las **cuotas ya cobradas no deben modificarse retroactivamente**.
- Un cobro realizado **antes** de la fecha de vigencia aplica el precio anterior.
- Un cobro realizado **a partir** de la fecha de vigencia aplica el precio nuevo.
- La fecha de vigencia puede ser:
  - **Futura** (planificación de aumento)
  - **Hoy** (aplicación inmediata)
- **No se permite** una fecha de vigencia en el pasado (salvo corrección administrativa explícita).
- Se puede programar más de un cambio de precio a futuro (opcional, deseable a futuro).
- Cada cambio de precio queda registrado con fecha, valor anterior, valor nuevo y usuario que lo realizó (trazabilidad).
- Los descuentos o promociones vigentes (US-13) se calculan sobre el precio que corresponde según la fecha.

## 8. Criterios de aceptación
- [ ] Actualización de precio con vigencia a futuro → las cuotas ya cobradas quedan intactas
- [ ] Cobro de una cuota antes de la fecha de vigencia → se aplica el precio anterior
- [ ] Cobro de una cuota a partir de la fecha de vigencia → se aplica el precio nuevo
- [ ] El cambio de precio queda registrado en el historial del plan
- [ ] No se permite guardar un precio negativo o cero
- [ ] No se permite una fecha de vigencia anterior a hoy (sin confirmación especial)

## 9. Casos borde / Errores
- Intentar cobrar una cuota el mismo día de la vigencia → aplicar el precio nuevo
- Dos cambios de precio superpuestos → no permitir o resolver por el más reciente
- Cambio de precio sin fecha de vigencia → no permitir
- Precio con formato inválido → mostrar error de validación
- Plan desactivado → no permitir actualizar precio (o advertir)
- Error de red al guardar

## 10. Dependencias
- US-11 (los planes deben existir)
- US-13 (promociones, que se calculan sobre el precio vigente)
- US-15, US-16, US-17 (pagos, que aplican el precio vigente al momento del cobro)
- US-18 (estado de habilitación, que considera el precio y la fecha)
- Backend: endpoint de actualización de precio + validación de fecha + historial

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - En el listado de planes, mostrar el precio actual y la fecha desde cuándo rige
  - Botón "Actualizar precio" abre un modal o formulario con:
    - Precio actual (solo lectura)
    - Nuevo precio (editable)
    - Fecha de vigencia (date picker, por defecto hoy)
    - Campo de nota (opcional)
  - Al guardar, mostrar confirmación: *"El nuevo precio de $X aplicará desde el DD/MM/AAAA. Las cuotas ya cobradas no se modificarán."*
  - Si hay un precio programado a futuro, indicarlo visualmente (badge "Precio programado")
  - Mostrar historial de precios en una pestaña o sección colapsable (opcional para MVP)
  - Formato de moneda claro y consistente en toda la app