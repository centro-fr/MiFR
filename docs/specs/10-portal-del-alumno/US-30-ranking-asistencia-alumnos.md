# US-30 – Ranking de asistencia entre alumnos

## 1. Información general

- **Épica:** Portal del Alumno
- **Prioridad:** Baja
- **Actor principal:** Usuario registrado (Alumno, Profesora o Propietaria)
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir a los usuarios registrados visualizar el ranking general de asistencia entre alumnos, para conocer el nivel de compromiso del grupo.

## 3. Descripción

Como usuario registrado (alumno, profesor/a o propietaria), quiero visualizar el ranking general de asistencia entre alumnos, para conocer el nivel de compromiso del grupo.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando ranking)
- [ ] Ranking general de asistencia
- [ ] Filtros por período (opcional)
- [ ] Detalle de un alumno (desde el ranking)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos suficientes para el ranking)

## 5. Datos que necesita

### Datos que muestra

- Posición en el ranking
- Nombre del alumno (puede ser parcial o completo, según política)
- Porcentaje de asistencia
- Cantidad de clases previstas vs. asistencias
- Racha actual (opcional, vinculado a US-31)
- Badge o insignia destacada (opcional)

### Datos de configuración

- Período del ranking (mes actual, últimos 30 días, etc.)
- Visibilidad del nombre completo o parcial

### Datos que NO se muestran

- Datos personales sensibles (teléfono, email)
- Estado de cuota
- Datos financieros

## 6. Acciones del usuario

- Ver el ranking general
- Filtrar por período (opcional)
- Ver el detalle de un alumno (si tiene permisos)
- Compartir su posición (opcional)

## 7. Reglas de negocio

- El ranking se ordena por **porcentaje de asistencia sobre las clases previstas del plan de cada alumno**.
- En caso de empate en el porcentaje, se desempata por **clases asistidas descendente** y luego por **nombre y apellido alfabéticamente ascendente**.
- Es la **misma vista para los tres roles** (no hay versión recortada por rol).
- Se consideran solo los alumnos **activos** (no los dados de baja).
- El cálculo se hace sobre un período definido (por defecto, el mes actual).
- Se deben considerar solo las clases efectivamente previstas (según plan y horarios): las clases dictadas del período en las que el alumno tiene una marca de asistencia, presente o ausente (el cierre registra como ausente a cada inscripto sin marcar, US-21). Las canceladas y las que siguen abiertas no cuentan.
- El ranking es **visible para todos los usuarios registrados**: el permiso `REPORTES_RANKING_VER` está en la matriz inicial de propietaria, profesoras, alumnos y tutores (decidido el 20/10/2026). El tutor ve destacada la fila de su menor a cargo.
- No se muestran datos sensibles (teléfono, email, estado de cuota).
- El porcentaje se redondea a dos decimales.
- El alumno puede ver su propia posición destacada en el ranking.
- Los alumnos con menos de X clases previstas en el período (`RANKING_MINIMO_CLASES = 4` de `parametros_sistema`) no aparecen (para evitar distorsiones).

## 8. Criterios de aceptación

- [ ] Acceso al ranking desde el panel de un alumno → se muestra correctamente
- [ ] Acceso al ranking desde el panel de la propietaria → mismo contenido
- [ ] El ranking se ordena por porcentaje de asistencia descendente
- [ ] En caso de empate en el porcentaje, primero quien asistió a más clases y después orden alfabético por apellido y nombre
- [ ] El alumno ve su propia posición destacada
- [ ] Solo se consideran alumnos activos
- [ ] Solo se consideran alumnos con mínimo de clases previstas
- [ ] El ranking no muestra datos sensibles

## 9. Casos borde / Errores

- Alumno sin clases previstas en el período → no aparece en el ranking
- Alumno con 100% de asistencia → aparece primero
- Alumno con 0% de asistencia → aparece último (si cumple el mínimo)
- Sin datos suficientes → mostrar mensaje claro
- Empate en el primer puesto → más clases asistidas y después orden alfabético
- Error de red al cargar el ranking
- Período sin clases → ranking vacío con mensaje

## 10. Dependencias

- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-18 (estado de habilitación, para filtrar activos)
- US-20, US-21 (asistencia e inasistencias)
- US-29 (panel del alumno, donde se accede)
- US-31 (insignias y racha, que pueden mostrarse en el ranking)
- Backend: endpoint de ranking + cálculo de porcentajes + filtros

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Acceso desde el panel del alumno (US-29) sección "Mi comunidad"
  - Lista ordenada con posiciones (1, 2, 3, ...)
  - Destacar los primeros 3 puestos (oro, plata, bronce)
  - Destacar la posición del alumno logueado (color de marca)
  - Cada fila muestra:
    - Posición
    - Nombre del alumno (completo o parcial según política)
    - Porcentaje de asistencia (barra de progreso visual)
    - Racha actual (opcional)
  - Filtro por período (mes actual por defecto, con opción de cambiar)
  - Mobile-first: cards o lista compacta
  - Sin datos sensibles visibles
  - Animación sutil al cargar el ranking (opcional)
  - Indicador de "mi posición" siempre visible (aunque esté fuera del top)
