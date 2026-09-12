# US-33 – Informe de asistencia

## 1. Información general
- **Épica:** Reportes y Fidelización
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 5

## 2. Objetivo
Permitir a la propietaria generar informes de asistencia filtrables por período, alumno o profesor/a, para tener visibilidad operativa periódica.

## 3. Descripción
Como propietaria, quiero generar informes de asistencia filtrables por período, alumno o profesor/a, para tener visibilidad operativa periódica.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando informe)
- [ ] Selección de filtros (período, alumno, profesor/a)
- [ ] Informe generado con resultados
- [ ] Detalle expandido por alumno o clase
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos para los filtros seleccionados)

## 5. Datos que necesita
### Datos que muestra (informe):
- Período del informe
- Filtros aplicados
- Resumen general:
  - Total de clases dictadas
  - Total de asistencias
  - Total de inasistencias
  - Porcentaje de asistencia general
- Detalle por alumno:
  - Nombre
  - Clases previstas
  - Asistencias
  - Inasistencias
  - Porcentaje de asistencia
- Detalle por profesor/a:
  - Nombre
  - Clases dictadas
  - Cantidad de alumnos
  - Asistencias totales
  - Porcentaje promedio

### Datos de filtros:
- Período (rango de fechas o mes)
- Alumno específico (opcional)
- Profesor/a específico/a (opcional)
- Actividad (opcional)
- Combinación de filtros (permitida)

### Datos que se generan:
- Informe consolidado
- Exportación a PDF / Excel
- Historial de informes (opcional)

## 6. Acciones del usuario
- Seleccionar filtros (período, alumno, profesor/a)
- Ver el informe generado
- Expandir el detalle por alumno o clase
- Exportar el informe (PDF / Excel)
- Limpiar filtros
- Ver informes de períodos anteriores (opcional)

## 7. Reglas de negocio
- Debe permitir filtrar por **período, alumno o profesor/a de forma independiente o combinada**.
- Solo la **propietaria** puede acceder a este informe.
- El informe es **informativo**, no modifica datos.
- Se consideran las clases efectivamente dictadas (no las canceladas).
- Las inasistencias automáticas (US-21) se incluyen en el cálculo.
- Un alumno dado de baja **no aparece** en el informe por defecto (o aparece con estado "baja" si se activa el filtro).
- El porcentaje de asistencia se calcula como: `(asistencias / clases previstas) * 100`.
- El informe debe poder exportarse a **PDF y Excel**.
- Los filtros pueden combinarse (por ejemplo, un alumno específico en un período específico).
- El informe debe actualizarse con los datos más recientes al momento de generarlo.

## 8. Criterios de aceptación
- [ ] Filtro por alumno específico → muestra solo su historial
- [ ] Filtro por período sin resultados → muestra "sin datos" sin error
- [ ] Filtro por profesor/a → muestra solo los alumnos y clases de esa profesora
- [ ] Combinación de filtros (período + alumno + profesor/a) → funciona correctamente
- [ ] El porcentaje de asistencia se calcula correctamente
- [ ] Se puede exportar el informe a PDF y Excel
- [ ] Solo la propietaria accede al informe

## 9. Casos borde / Errores
- Período sin clases → mostrar "sin datos"
- Alumno sin asistencias en el período → mostrar 0%
- Profesor/a sin clases en el período → no aparece o aparece con cero
- Filtros que no devuelven resultados → mensaje claro
- Error al exportar el informe → reintentar
- Error de red al cargar el informe
- Muchos datos → paginación o resumen por bloques

## 10. Dependencias
- US-03, US-04 (actividades y horarios)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para el filtro de estado)
- US-20, US-21 (asistencia e inasistencias)
- US-01, US-02 (permisos: solo la propietaria)
- Backend: endpoint de informe con filtros + exportación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media-Alta
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Informes")
  - Filtros en la parte superior:
    - Rango de fechas (date pickers)
    - Alumno (autocompletado, opcional)
    - Profesor/a (dropdown, opcional)
    - Actividad (dropdown, opcional)
  - Botón "Generar informe" y "Limpiar filtros"
  - Vista del informe:
    - Resumen general en cards destacadas
    - Tabla de detalle por alumno (o por clase, según preferencia)
    - Ordenamiento por columnas (opcional)
  - Botón "Exportar" con opciones PDF / Excel
  - Mobile-first: tabla en cards en mobile
  - Formato consistente de porcentajes y fechas
  - Colores de la marca para destacados
  - Mostrar "sin datos" claramente cuando no haya resultados
  - Los filtros deben poder combinarse sin problema