# US-37 – Mapa de calor de ocupación de horarios

## 1. Información general

- **Épica:** Reportes y Fidelización
- **Prioridad:** Baja
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir a la propietaria visualizar la ocupación de horarios mediante un mapa de calor, para detectar franjas con baja o alta demanda y optimizar la grilla de actividades.

## 3. Descripción

Como propietaria, quiero visualizar un mapa de calor, para detectar franjas con baja demanda y optimizar la grilla de actividades.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando datos de ocupación)
- [ ] Selección de filtros (período, actividad, profesor/a)
- [ ] Mapa de calor con celdas coloreadas
- [ ] Detalle de una celda (horario + actividad + ocupación)
- [ ] Leyenda de colores
- [ ] Exportar vista (PDF / imagen, opcional)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos para el período seleccionado)

## 5. Datos que necesita

### Datos que muestra (mapa de calor)

- Eje X: días de la semana (Lunes a Domingo)
- Eje Y: franjas horarias (por ejemplo, cada hora o cada bloque de clase)
- Cada celda representa la ocupación de un horario:
  - Cupo máximo
  - Inscriptos actuales
  - Porcentaje de ocupación
  - Actividad (si aplica)

### Datos de configuración

- Escala de colores:
  - Verde: menos del 60% ocupado (libre)
  - Amarillo: entre 60% y 84% ocupado (moderado)
  - Naranja: entre 85% y 99% ocupado (casi lleno)
  - Rojo: 100% ocupado (completo)
  - Gris: sin actividad programada
- Granularidad horaria (por hora o por bloque)

### Datos de filtros

- Período (semana actual, mes, rango personalizado)
- Actividad específica (opcional)
- Profesor/a específico/a (opcional)
- Tipo de actividad (grupal / personalizada, opcional)

### Datos que se generan

- Mapa de calor consolidado
- Detalle al hacer hover / tap en una celda
- Exportación (opcional)

## 6. Acciones del usuario

- Ver el mapa de calor de ocupación
- Filtrar por período, actividad o profesor/a
- Ver el detalle de una celda específica
- Cambiar la granularidad (hora o bloque)
- Exportar el mapa de calor (opcional)
- Ver estadísticas por franja horaria (opcional)

## 7. Reglas de negocio

- El color de cada celda se calcula sobre **cupo máximo vs. inscriptos**.
- Escala de colores:
  - **Libre**: menos del 60% ocupado
  - **Moderado**: entre 60% y 84%
  - **Casi lleno**: entre 85% y 99%
  - **Completo**: 100%
  - **Sin actividad**: sin horario asignado
- Solo se consideran **alumnos activos** en el cálculo de ocupación.
- Los alumnos dados de baja **no cuentan** para el cálculo.
- Las franjas sin actividad programada se muestran en gris.
- Solo la **propietaria** puede acceder a este mapa.
- El mapa debe actualizarse con los datos más recientes al momento de generarlo.
- Se puede filtrar por una actividad específica (por ejemplo, solo ver ocupación de Yoga).
- Las clases personalizadas también se incluyen (con su cupo específico).

## 8. Criterios de aceptación

- [ ] Horario con ocupación menor al 60% → color "libre" (verde)
- [ ] Horario con ocupación 100% → color "completo" (rojo)
- [ ] Horario sin actividad → color "sin actividad" (gris)
- [ ] El detalle al hacer hover / tap muestra la información correcta
- [ ] El filtro por actividad funciona correctamente
- [ ] El filtro por profesor/a funciona correctamente
- [ ] Solo se cuentan alumnos activos
- [ ] Solo la propietaria accede al mapa de calor

## 9. Casos borde / Errores

- Sin horarios cargados → mapa vacío con mensaje
- Sin inscriptos en el período → todas las celdas en verde o gris
- Actividad con cupo 0 → no debería existir (validado en US-03)
- Filtro sin resultados → mapa vacío con mensaje
- Error de red al cargar los datos
- Muchos horarios → ajustar la granularidad (por hora o por bloque)
- Hover / tap no disponible en mobile → adaptar a tap con modal de detalle

## 10. Dependencias

- US-03 (actividades y cupos)
- US-04 (horarios y profesoras)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-18 (estado de habilitación, para filtrar activos)
- US-01, US-02 (permisos: solo la propietaria)
- Backend: endpoint de mapa de calor + cálculo de ocupación por celda

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Alta
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Estadísticas" → "Mapa de calor")
  - Filtros en la parte superior:
    - Período (date pickers o selector de semana / mes)
    - Actividad (dropdown, opcional)
    - Profesor/a (dropdown, opcional)
    - Tipo (grupal / personalizada, opcional)
  - Mapa de calor:
    - Grid con días en el eje X y franjas horarias en el eje Y
    - Cada celda coloreada según la escala definida
    - Leyenda clara con los colores y rangos
    - Hover en desktop → tooltip con detalle
    - Tap en mobile → modal con detalle
  - Detalle de una celda:
    - Actividad
    - Profesora
    - Cupo máximo
    - Inscriptos
    - Porcentaje de ocupación
    - Lista de alumnos (opcional)
  - Exportar como imagen o PDF (opcional para MVP)
  - Mobile-first: adaptar el grid a scroll horizontal si es necesario
  - Colores de la marca para destacados (#E91E82, #BC1266, #181C26)
  - Mostrar "sin datos" claramente cuando no haya resultados
  - Considerar filtros rápidos como "ver solo franjas con baja demanda"
