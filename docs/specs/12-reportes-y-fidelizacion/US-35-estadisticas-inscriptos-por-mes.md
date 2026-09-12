# US-35 – Estadísticas de inscriptos por mes

## 1. Información general
- **Épica:** Reportes y Fidelización
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 5

## 2. Objetivo
Permitir a la propietaria visualizar estadísticas de nuevas inscripciones agrupadas por mes, para identificar los períodos de mayor y menor demanda.

## 3. Descripción
Como propietaria, quiero visualizar estadísticas de nuevas inscripciones agrupadas por mes, para identificar los períodos de mayor y menor demanda.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando estadísticas)
- [ ] Selección de rango de meses / año
- [ ] Gráfico de barras con inscriptos por mes
- [ ] Tabla con detalle numérico
- [ ] Detalle de un mes específico (opcional)
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos para el período seleccionado)

## 5. Datos que necesita
### Datos que muestra (gráfico):
- Cantidad de inscriptos por mes (barras)
- Comparativa con meses anteriores
- Tendencia (opcional)

### Datos que muestra (tabla):
- Mes (nombre y año)
- Cantidad de nuevas inscripciones
- Comparación con el mes anterior (% o número)
- Total acumulado del año (opcional)

### Datos de filtros:
- Año (dropdown, por defecto el actual)
- Rango de meses (opcional)
- Plan específico (opcional)
- Profesor/a específico/a (opcional)

### Datos que se generan:
- Gráfico de estadísticas
- Tabla de detalle
- Exportación a PDF / Excel
- Historial de consultas (opcional)

## 6. Acciones del usuario
- Seleccionar el año o rango de meses
- Ver el gráfico de inscriptos por mes
- Ver la tabla con el detalle numérico
- Filtrar por plan o profesora (opcional)
- Exportar el informe (PDF / Excel)
- Ver el detalle de un mes específico (opcional)

## 7. Reglas de negocio
- Debe agrupar **altas definitivas de alumnos** (no pre-inscripciones) por mes calendario.
- La fecha de referencia es la **fecha de alta definitiva** (US-07), no la fecha de pre-inscripción.
- Solo la **propietaria** puede acceder a estas estadísticas.
- Los alumnos dados de baja **no se descuentan** del mes en que se dieron de alta (cuentan como altas del mes).
- Los alumnos reactivados **no cuentan** como nuevo inscripto (ya existían).
- Se cuentan todos los planes por defecto, salvo que se aplique un filtro específico.
- El gráfico debe ser claro y legible en desktop y mobile.
- Se puede comparar con el mismo mes del año anterior (opcional).
- El período mínimo visible es el año calendario actual.

## 8. Criterios de aceptación
- [ ] Visualización con datos de varios meses → agrupa correctamente
- [ ] Mes sin inscripciones → muestra cero sin error
- [ ] El gráfico se ve correctamente en desktop y mobile
- [ ] El filtro por plan funciona correctamente
- [ ] El filtro por profesora funciona correctamente
- [ ] Se puede exportar el informe a PDF y Excel
- [ ] Solo la propietaria accede a las estadísticas
- [ ] Solo se cuentan altas definitivas (no pre-inscripciones)

## 9. Casos borde / Errores
- Año sin datos → mostrar gráfico vacío o mensaje
- Mes con datos muy altos → ajustar escala del gráfico
- Filtro por plan sin resultados → mensaje claro
- Error al exportar → reintentar
- Error de red al cargar las estadísticas
- Año muy antiguo sin datos → mostrar "sin datos"

## 10. Dependencias
- US-05, US-07 (alumnos e inscripciones, especialmente la fecha de alta definitiva)
- US-08 (baja lógica, para no contar reactivaciones como altas)
- US-11 (planes, para los filtros)
- US-01, US-02 (permisos: solo la propietaria)
- Backend: endpoint de estadísticas + agrupación mensual + exportación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Estadísticas" → "Inscriptos por mes")
  - Filtros en la parte superior:
    - Año (dropdown, por defecto el actual)
    - Plan (dropdown, opcional)
    - Profesor/a (dropdown, opcional)
  - Gráfico de barras con:
    - Eje X: meses
    - Eje Y: cantidad de inscriptos
    - Librería recomendada: Recharts o Chart.js
  - Tabla debajo del gráfico con el detalle numérico
  - Comparación con el mes anterior (indicador de subida/bajada)
  - Botón "Exportar" con opciones PDF / Excel
  - Mobile-first: gráfico responsive y tabla en cards
  - Colores de la marca para las barras (#E91E82 principal)
  - Mostrar "sin datos" claramente cuando no haya resultados
  - Total anual visible al pie