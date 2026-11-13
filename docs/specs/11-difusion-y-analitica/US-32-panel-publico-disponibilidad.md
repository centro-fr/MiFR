# US-32 – Panel público de disponibilidad

> **Decisión vigente (13/11/2026): la página pública muestra datos fijos.** Las actividades del centro, con su descripción, su modalidad y sus días, viven en el código del front y se publican con él: la página no llama a la API. Así un visitante, o un bot que la visite seguido, no despierta la API de Render ni la base de Neon, cuyas horas gratuitas son limitadas, y la página carga al instante aunque la API esté dormida. A cambio, un cambio de actividades requiere editar el front y volver a publicarlo, y deja de cumplirse que el panel se actualice solo (sección 7 y criterios de aceptación). Los cupos, los horarios, la próxima clase y la promoción vigente no se publican. `GET /publico/actividades` y el subsistema DifusionPublica del back se retiraron.

## 1. Información general

- **Épica:** Difusión y Analítica de Negocio
- **Prioridad:** Media
- **Actor principal:** Visitante (sin login)
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir a cualquier visitante consultar los cupos disponibles, la próxima clase a comenzar y la promoción vigente, para decidir si sumarse al centro.

## 3. Descripción

Como visitante (sin necesidad de login), quiero consultar los cupos disponibles, la próxima clase a comenzar y la promoción vigente, para decidir si sumarme al centro.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando datos públicos)
- [ ] Panel público con la información destacada
- [ ] Vista de cupos disponibles por actividad
- [ ] Vista de próxima clase a comenzar
- [ ] Vista de promoción vigente
- [ ] Éxito
- [ ] Error de red
- [ ] Empty (sin información disponible)

## 5. Datos que necesita

### Datos que muestra

- **Cupos disponibles:**
  - Actividad (nombre y tipo grupal/personalizada)
  - Horario
  - Profesora
  - Cupos libres / cupo total
  - Indicador visual de disponibilidad (libre, casi lleno, completo)
- **Próxima clase a comenzar:**
  - Actividad
  - Fecha y hora
  - Profesora
  - Cupos disponibles
- **Promoción vigente:**
  - Nombre de la promoción
  - Descripción
  - Descuento aplicado (porcentaje o monto)
  - Fecha de vigencia

### Datos que NO se muestran

- Nombres de alumnos inscriptos
- Datos personales
- Datos financieros internos
- Información de cupos exactos si la política lo restringe

## 6. Acciones del usuario

- Ver el panel público sin autenticación
- Ver cupos disponibles por actividad
- Ver la próxima clase a comenzar
- Ver la promoción vigente
- Acceder al formulario de contacto / pre-inscripción (opcional)
- (No puede reservar ni inscribirse directamente sin login)

## 7. Reglas de negocio

- Debe ser **accesible desde internet sin autenticación**.
- Debe **actualizarse en tiempo real** sin intervención manual de la propietaria.
- Los datos mostrados son **públicos pero anónimos** (no se muestran nombres de alumnos).
- Los cupos se calculan como: `cupo máximo - inscriptos activos`.
- El indicador visual usa la escala:
  - **Libre**: menos del 60% ocupado
  - **Casi lleno**: entre 60% y 99% ocupado
  - **Completo**: 100% ocupado
- La promoción vigente se muestra **solo si está activa** en la fecha actual (US-13).
- La próxima clase se muestra según el horario actual y los horarios disponibles.
- Los alumnos dados de baja **no cuentan** para el cálculo de cupos.
- La página debe ser **mobile-first** (accesible desde cualquier dispositivo).
- Debe ser **rápida** y **SEO-friendly** (idealmente con SSR o SSG en la landing pública).
- La información se refresca periódicamente (por ejemplo, cada 5 minutos) o en tiempo real vía WebSocket (opcional).

## 8. Criterios de aceptación

- [ ] Acceso al panel sin haber iniciado sesión → se muestra correctamente
- [ ] Cambio de cupo se refleja sin recarga manual del contenido → se actualiza
- [ ] La promoción vigente se muestra solo si está activa
- [ ] Los cupos se calculan correctamente (cupo máximo - inscriptos)
- [ ] No se muestran datos personales de alumnos
- [ ] La próxima clase se muestra correctamente según el horario actual
- [ ] El indicador visual de cupos (libre / casi lleno / completo) refleja la ocupación real

## 9. Casos borde / Errores

- Sin actividades cargadas → mostrar mensaje claro
- Sin próxima clase próxima → mostrar mensaje "sin clases programadas"
- Sin promoción vigente → no mostrar la sección de promoción
- Error de red al cargar los datos → permitir reintentar
- Actividad con cupo completo → mostrar como "completo" sin permitir reserva
- Actualización en tiempo real fallida → fallback a actualización periódica
- Visitante desde un dispositivo muy antiguo → diseño responsive básico

## 10. Dependencias

- US-03 (actividades y cupos)
- US-04 (horarios y profesoras)
- US-05, US-07 (alumnos e inscripciones, para calcular cupos)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-13 (promociones vigentes)
- Backend: endpoint público de disponibilidad + actualización en tiempo real (WebSocket o polling)

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Página pública con las siguientes secciones:
    1. **Hero / Encabezado** con logo MiFR y colores de marca
    2. **Próxima clase a comenzar** (destacada)
    3. **Cupos disponibles** (lista o grid con indicador visual)
    4. **Promoción vigente** (si aplica)
    5. **Llamada a la acción**: "Consultá por WhatsApp" o "Pre-inscripción"
  - Indicador visual de cupos:
    - Verde: Libre
    - Amarillo: Casi lleno
    - Rojo: Completo
  - Mobile-first, con diseño limpio y profesional
  - Optimizar para SEO (aunque sea SPA, considerar SSR o pre-render)
  - Actualización automática cada X segundos (por ejemplo, 5 minutos) o vía WebSocket
  - Colores de la marca: #E91E82, #BC1266, #181C26
  - No mostrar nombres de alumnos inscriptos
  - No permitir reservas desde esta página (solo consulta)
  - Botón de contacto directo (WhatsApp, teléfono o formulario)
  - URL amigable: `https://mifr.app/disponibilidad` o similar
