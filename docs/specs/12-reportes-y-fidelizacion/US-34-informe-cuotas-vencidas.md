# US-34 – Informe de cuotas vencidas

## 1. Información general
- **Épica:** Reportes y Fidelización
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 5

## 2. Objetivo
Permitir a la propietaria generar informes de cuotas vencidas filtrables por período, alumno o profesor/a, para tener visibilidad de la cobranza pendiente.

## 3. Descripción
Como propietaria, quiero generar informes de cuotas vencidas filtrables por período, alumno o profesor/a, para tener visibilidad de la cobranza pendiente.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando informe)
- [ ] Selección de filtros (período, alumno, profesor/a)
- [ ] Informe generado con resultados
- [ ] Detalle expandido por alumno
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin cuotas vencidas para los filtros seleccionados)

## 5. Datos que necesita
### Datos que muestra (informe):
- Período del informe
- Filtros aplicados
- Resumen general:
  - Total de alumnos con cuota vencida
  - Monto total adeudado
  - Promedio de deuda por alumno
- Detalle por alumno:
  - Nombre
  - Plan
  - Profesora a cargo
  - Fecha de vencimiento
  - Días vencidos
  - Monto adeudado
  - Teléfono / email de contacto
  - Estado de gestión (opcional)
- Detalle por profesor/a (agrupación):
  - Cantidad de alumnos con deuda
  - Monto total adeudado

### Datos de filtros:
- Período (rango de fechas o mes)
- Alumno específico (opcional)
- Profesor/a específico/a (opcional)
- Plan (opcional)
- Combinación de filtros (permitida)

### Datos que se generan:
- Informe consolidado
- Exportación a PDF / Excel
- Historial de informes (opcional)

## 6. Acciones del usuario
- Seleccionar filtros (período, alumno, profesor/a)
- Ver el informe generado
- Expandir el detalle por alumno
- Exportar el informe (PDF / Excel)
- Limpiar filtros
- Contactar directamente al alumno (teléfono / WhatsApp)
- Ver informes de períodos anteriores (opcional)

## 7. Reglas de negocio
- Debe listar **únicamente alumnos con cuota vencida al momento de la consulta**.
- Solo la **propietaria** puede acceder a este informe.
- El informe es **informativo**, no modifica datos.
- Se consideran las cuotas vencidas **fuera de los días de gracia** (US-18).
- Los alumnos con cuota `por_vencer` **no aparecen** en este informe (solo vencidas).
- Los alumnos dados de baja **no aparecen** por defecto (o aparecen con estado "baja" si se activa el filtro).
- El monto adeudado se calcula según el precio vigente del plan (US-12) y la promoción aplicable (US-13).
- El informe debe poder exportarse a **PDF y Excel**.
- Los filtros pueden combinarse (por ejemplo, un alumno específico en un período específico).
- El informe debe actualizarse con los datos más recientes al momento de generarlo.
- El detalle incluye información de contacto para facilitar la gestión de cobranza.

## 8. Criterios de aceptación
- [ ] Filtro por profesora con alumnos vencidos → lista correcta
- [ ] Filtro en un período sin vencidos → lista vacía
- [ ] El monto total adeudado se calcula correctamente
- [ ] El informe incluye información de contacto del alumno
- [ ] Se puede exportar el informe a PDF y Excel
- [ ] Solo la propietaria accede al informe
- [ ] Los alumnos con cuota `por_vencer` no aparecen
- [ ] Los alumnos dados de baja no aparecen por defecto

## 9. Casos borde / Errores
- Período sin cuotas vencidas → mostrar "sin datos"
- Alumno con deuda de varios períodos → mostrar el total adeudado
- Alumno con deuda en más de un plan → sumar los montos
- Filtros que no devuelven resultados → mensaje claro
- Error al exportar el informe → reintentar
- Error de red al cargar el informe
- Muchos datos → paginación o resumen por bloques

## 10. Dependencias
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para el filtro de estado)
- US-11, US-12, US-13 (planes, precios y promociones)
- US-18 (estado de habilitación, que determina cuándo una cuota está vencida)
- US-15, US-16, US-17 (pagos, que actualizan el estado)
- US-01, US-02 (permisos: solo la propietaria)
- Backend: endpoint de informe de vencidos con filtros + exportación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Informes" → "Cuotas vencidas")
  - Filtros en la parte superior:
    - Rango de fechas (date pickers)
    - Alumno (autocompletado, opcional)
    - Profesor/a (dropdown, opcional)
    - Plan (dropdown, opcional)
  - Botón "Generar informe" y "Limpiar filtros"
  - Vista del informe:
    - Resumen general en cards destacadas (cantidad, monto, promedio)
    - Tabla de detalle por alumno con:
      - Nombre
      - Profesora
      - Fecha de vencimiento
      - Días vencidos (destacado con color según antigüedad)
      - Monto adeudado
      - Botón de contacto (teléfono / WhatsApp)
  - Botón "Exportar" con opciones PDF / Excel
  - Mobile-first: tabla en cards en mobile
  - Formato consistente de moneda y fechas
  - Colores de la marca para destacados
  - Mostrar "sin datos" claramente cuando no haya resultados
  - Ordenar por defecto: mayor deuda primero (o más días vencidos)