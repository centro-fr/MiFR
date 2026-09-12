# US-13 – Alta de descuentos y promociones temporales

## 1. Información general
- **Épica:** Planes y Precios
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Permitir crear descuentos y promociones temporales sobre los planes vigentes, para incentivar inscripciones en períodos específicos.

## 3. Descripción
Como propietaria, quiero crear descuentos y promociones temporales sobre los planes vigentes, para incentivar inscripciones en períodos específicos.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando promociones y planes)
- [ ] Listado de promociones (activas, programadas, vencidas)
- [ ] Formulario de alta de promoción
- [ ] Formulario de edición de promoción
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red
- [ ] Confirmación de baja / desactivación de promoción
- [ ] Empty (no hay promociones cargadas)

## 5. Datos que necesita
### Datos que muestra (listado):
- Nombre de la promoción
- Plan(es) asociados
- Tipo de descuento (% o monto fijo)
- Valor del descuento
- Fecha de inicio
- Fecha de fin
- Estado (activa / programada / vencida / desactivada)

### Datos que se cargan / editan:
- Nombre de la promoción (obligatorio)
- Descripción (opcional)
- Plan(es) a los que aplica (obligatorio, puede ser uno o varios)
- Tipo de descuento: `porcentaje` | `monto_fijo` (obligatorio)
- Valor del descuento (obligatorio, debe ser positivo)
- Fecha de inicio (obligatoria)
- Fecha de fin (obligatoria)
- Condiciones adicionales (opcional, ej: solo para nuevos alumnos, primera cuota)

### Datos que NO se pueden editar:
- Cuotas ya cobradas con una promoción anterior
- Historial de promociones aplicadas

## 6. Acciones del usuario
- Ver el listado de promociones
- Crear una nueva promoción
- Editar una promoción existente (si no ha vencido)
- Desactivar una promoción (baja lógica)
- Filtrar promociones por estado o plan
- Duplicar una promoción existente (opcional)

## 7. Reglas de negocio
- La promoción debe tener un **rango de fechas de vigencia** (inicio y fin).
- **Fuera del rango de vigencia**, el precio vuelve al valor normal automáticamente.
- Solo se puede aplicar una promoción por inscripción (no se acumulan, salvo que se defina lo contrario).
- Una promoción **no modifica las cuotas ya cobradas**: solo aplica a nuevas inscripciones o renovaciones dentro del rango.
- El descuento se calcula sobre el **precio vigente del plan al momento de la inscripción** (US-12).
- El tipo de descuento puede ser:
  - **Porcentaje** (ej: 20% off)
  - **Monto fijo** (ej: $5000 de descuento)
- El valor del descuento debe ser positivo y razonable (no superar el precio del plan en el caso de monto fijo).
- No se puede editar una promoción ya vencida (solo consultarla).
- Si se desactiva una promoción antes de su fecha de fin, deja de aplicar de inmediato.
- Las promociones pueden aplicar a:
  - Un plan específico
  - Varios planes
  - Todos los planes (opcional)

## 8. Criterios de aceptación
- [ ] Inscripción durante el período de promoción vigente → aplica el descuento
- [ ] Inscripción una vez vencida la promoción → no aplica el descuento, usa precio normal
- [ ] Alta de promoción con porcentaje válido → se guarda correctamente
- [ ] Alta de promoción con monto fijo mayor al precio del plan → falla con mensaje claro
- [ ] Alta de promoción sin fecha de inicio o fin → falla (campos obligatorios)
- [ ] Fecha de fin anterior a fecha de inicio → falla
- [ ] Desactivar promoción → deja de aplicar inmediatamente
- [ ] Las cuotas ya cobradas no se modifican por una nueva promoción

## 9. Casos borde / Errores
- Dos promociones activas sobre el mismo plan → definir cuál aplica (la más reciente, o no permitir solapamiento)
- Promoción con descuento mayor al 100% → no permitir
- Promoción vencida que se intenta editar → solo lectura
- Promoción con monto fijo negativo → no permitir
- Inscripción justo en la fecha de inicio o fin de la promoción → aplicar criterio claro (inclusive en ambas)
- Error de red al guardar

## 10. Dependencias
- US-11 (los planes deben existir)
- US-12 (el descuento se calcula sobre el precio vigente)
- US-05 (pre-inscripción, donde se aplica la promoción)
- US-14 (renovación o cambio de plan, donde también puede aplicar)
- US-15, US-16, US-17 (pagos, que reflejan el monto con descuento)
- Backend: CRUD de promociones + validación de vigencia + cálculo del descuento

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Listado en tabla (desktop) o cards (mobile)
  - Badge de estado: Activa (verde), Programada (azul), Vencida (gris), Desactivada (rojo)
  - Formulario con:
    - Nombre de la promoción
    - Selector múltiple de planes
    - Tipo de descuento (RadioGroup: Porcentaje / Monto fijo)
    - Valor del descuento (con validación)
    - Fecha de inicio y fin (date pickers)
    - Condiciones adicionales (textarea opcional)
  - Mostrar en la pre-inscripción y en la ficha del alumno si tiene una promoción aplicada
  - Al mostrar el precio final, indicar visualmente el descuento aplicado (ej: ~~$10.000~~ **$8.000**)
  - No permitir editar promociones vencidas (solo ver detalle)
  - Confirmación al desactivar: *"La promoción dejará de aplicarse inmediatamente. ¿Confirmás?"*