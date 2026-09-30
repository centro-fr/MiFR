# US-36 – Estadísticas de planes más elegidos

## 1. Información general

- **Épica:** Reportes y Fidelización
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir a la propietaria visualizar un reporte de los planes más elegidos por los alumnos, para entender qué oferta comercial funciona mejor y ajustar precios o promociones.

## 3. Descripción

Como propietaria, quiero visualizar un reporte de los planes más elegidos por los alumnos, para entender qué oferta comercial funciona mejor y ajustar precios o promociones.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando estadísticas)
- [ ] Selección de filtros (período, actividad, profesor/a)
- [ ] Gráfico de planes más elegidos
- [ ] Tabla con detalle numérico
- [ ] Detalle de un plan específico (opcional)
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos para el período seleccionado)

## 5. Datos que necesita

### Datos que muestra (gráfico)

- Cantidad de alumnos activos por plan (barras o torta)
- Ordenado de mayor a menor
- Porcentaje que representa cada plan sobre el total

### Datos que muestra (tabla)

- Nombre del plan
- Actividad asociada (con tipo: grupal / personalizada)
- Profesora asociada
- Cantidad de alumnos activos
- Porcentaje del total
- Precio vigente
- Ingreso estimado mensual (cantidad × precio)

### Datos de filtros

- Período (rango de fechas o mes)
- Actividad (opcional)
- Profesor/a (opcional)
- Tipo de plan (grupal / personalizada, opcional)

### Datos que se generan

- Gráfico de planes más elegidos
- Tabla de detalle
- Exportación a PDF / Excel
- Historial de consultas (opcional)

## 6. Acciones del usuario

- Seleccionar filtros (período, actividad, profesor/a)
- Ver el gráfico de planes más elegidos
- Ver la tabla con el detalle numérico
- Ordenar por diferentes columnas (cantidad, ingreso, etc.)
- Exportar el informe (PDF / Excel)
- Ver el detalle de un plan específico (opcional)

## 7. Reglas de negocio

- Debe contar **alumnos activos por plan**, ordenado de mayor a menor.
- Solo la **propietaria** puede acceder a estas estadísticas.
- Se consideran solo alumnos **activos** (no dados de baja ni pre-inscripciones).
- La fecha de referencia es la **fecha actual** (o el cierre del período seleccionado).
- Se cuenta un alumno por plan principal (si tiene varios planes, se cuenta en el principal o se cuenta en cada uno, según política).
- El ingreso estimado se calcula como: `cantidad de alumnos × precio vigente del plan`.
- Los planes sin alumnos aparecen con cero (para tener visibilidad completa).
- El gráfico debe ser claro y legible en desktop y mobile.
- Se puede comparar la distribución entre planes grupales y personalizadas (opcional).

## 8. Criterios de aceptación

- [ ] Reporte con varios planes activos → orden correcto (mayor a menor)
- [ ] Reporte con un plan sin alumnos → aparece con cero
- [ ] El gráfico se ve correctamente en desktop y mobile
- [ ] El filtro por actividad funciona correctamente
- [ ] El filtro por profesora funciona correctamente
- [ ] Se puede exportar el informe a PDF y Excel
- [ ] Solo la propietaria accede a las estadísticas
- [ ] Solo se cuentan alumnos activos (no pre-inscripciones ni bajas)

## 9. Casos borde / Errores

- Sin planes cargados → mostrar mensaje claro
- Todos los planes con cero alumnos → mostrar gráfico vacío
- Plan con muchos alumnos → ajustar escala
- Filtro sin resultados → mensaje claro
- Error al exportar → reintentar
- Error de red al cargar las estadísticas
- Alumno con múltiples planes → definir política de conteo

## 10. Dependencias

- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-11 (planes vigentes)
- US-12 (precio vigente, para el ingreso estimado)
- US-18 (estado de habilitación, para filtrar activos)
- US-01, US-02 (permisos: solo la propietaria)
- Backend: endpoint de estadísticas + agrupación por plan + exportación

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Estadísticas" → "Planes más elegidos")
  - Filtros en la parte superior:
    - Período (date pickers o selector de mes)
    - Actividad (dropdown, opcional)
    - Profesor/a (dropdown, opcional)
    - Tipo de plan (grupal / personalizada, opcional)
  - Gráfico principal:
    - Barras horizontales ordenadas de mayor a menor (más claro que torta)
    - Alternativa: gráfico de torta con porcentajes
    - Librería recomendada: Recharts o Chart.js
  - Tabla debajo del gráfico con:
    - Plan, actividad, profesora, cantidad, porcentaje, precio, ingreso estimado
  - Ordenamiento por columnas
  - Botón "Exportar" con opciones PDF / Excel
  - Mobile-first: gráfico responsive y tabla en cards
  - Colores de la marca para las barras (#E91E82 principal, #BC1266 secundario)
  - Mostrar "sin datos" claramente cuando no haya resultados
  - Total general de alumnos activos visible al pie
