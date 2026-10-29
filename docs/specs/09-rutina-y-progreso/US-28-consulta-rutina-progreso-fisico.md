# US-28 – Consulta de rutina y progreso físico

## 1. Información general

- **Épica:** Rutina y Progreso
- **Prioridad:** Baja
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir al alumno consultar su rutina y sus registros de progreso físico desde su celular, para ver su evolución a lo largo del tiempo.

## 3. Descripción

Como alumno, quiero consultar mi rutina y mis registros de progreso físico desde mi celular para ver mi evolución a lo largo del tiempo.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando rutina y mediciones)
- [ ] Vista de rutina actual
- [ ] Historial de mediciones
- [ ] Gráfico de evolución (opcional para MVP)
- [ ] Éxito
- [ ] Error de red
- [ ] Empty (sin rutina asignada o sin mediciones)

## 5. Datos que necesita

### Datos que muestra

- Rutina actual:
  - Nombre
  - Ejercicios / actividades
  - Fecha de inicio
  - Profesora que la cargó
- Historial de mediciones:
  - Fecha
  - Peso
  - Medidas (cintura, cadera, pecho, brazos, piernas)
- Gráfico de evolución:
  - Peso a lo largo del tiempo
  - Otras medidas (opcional)

### Datos que NO se muestran

- Rutinas o mediciones de otros alumnos
- Datos internos de la profesora
- Observaciones de la profesora, de la rutina y de las mediciones: son privadas y solo las ven la profesora a cargo y la propietaria. Las notas de cada ejercicio sí forman parte de la rutina que ve el alumno.

## 6. Acciones del usuario

- Ver su rutina actual
- Ver el historial de mediciones
- Ver el gráfico de evolución (opcional)
- Filtrar mediciones por rango de fechas (opcional)
- Ver el detalle de una medición específica
- (No puede editar ni eliminar: solo consultar)

## 7. Reglas de negocio

- El alumno **solo debe ver su propia** rutina y mediciones, **no las de otros**.
- Si el alumno es menor de edad, el **tutor** es quien accede (mismo criterio que el resto del sistema).
- El alumno **no puede editar** la rutina ni las mediciones (solo la profesora o la propietaria).
- Las mediciones se muestran ordenadas por fecha descendente (la más reciente primero).
- El gráfico de evolución muestra los datos en orden cronológico.
- Si no hay rutina asignada, mostrar mensaje claro: *"Tu profesora todavía no cargó una rutina."*
- Si no hay mediciones, mostrar mensaje: *"Todavía no hay registros de progreso."*
- La información debe ser **mobile-first**, con lectura cómoda desde el celular.

## 8. Criterios de aceptación

- [ ] Consulta de rutina propia → se muestra correctamente
- [ ] Intento de consulta de la rutina de otro alumno → falla (acceso restringido)
- [ ] Historial de mediciones ordenado por fecha descendente
- [ ] Gráfico de evolución muestra los datos correctamente (si aplica)
- [ ] Alumno sin rutina → mensaje claro sin error
- [ ] Alumno sin mediciones → mensaje claro sin error
- [ ] El tutor de un alumno menor accede a la información del menor

## 9. Casos borde / Errores

- Alumno recién inscripto sin rutina ni mediciones → estados vacíos claros
- Muchas mediciones → paginación o scroll infinito
- Medición con datos incompletos (por ejemplo, sin peso) → mostrar lo que haya
- Error de red al cargar los datos → permitir reintentar
- Acceso desde un dispositivo sin conexión → mensaje claro

## 10. Dependencias

- US-27 (carga de rutina y mediciones por parte de la profesora)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica: un alumno dado de baja no accede)
- US-10 (ficha del alumno, referencia)
- US-29 (panel del alumno, donde puede integrarse el acceso)
- US-01, US-02 (permisos: el alumno solo ve lo suyo)
- Backend: endpoint de consulta de rutina y mediciones del alumno logueado

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Baja
- Recomendación de UI (mobile-first):
  - Acceso desde el panel del alumno (US-29), sección "Mi progreso"
  - Vista en dos pestañas o secciones:
    1. "Mi rutina": rutina actual con detalle expandible
    2. "Mi progreso": historial de mediciones + gráfico
  - El gráfico puede hacerse con una librería liviana (por ejemplo, Recharts o Chart.js)
  - Mostrar el peso con unidad (kg) y medidas con unidad (cm)
  - Usar cards para las mediciones en mobile
  - Mostrar "última actualización" con fecha clara
  - Resaltar el cambio desde la última medición (por ejemplo, "-2 kg")
  - Si el alumno es menor, mostrar el nombre del alumno y el tutor como usuario
  - No permitir edición desde esta vista (solo lectura)
  - Estados vacíos bien diseñados (con íconos y mensajes claros)
  - Optimizar imágenes del gráfico para mobile
