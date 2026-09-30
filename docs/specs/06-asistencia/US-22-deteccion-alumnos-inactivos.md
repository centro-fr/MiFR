# US-22 – Detección de alumnos inactivos con cuota al día

## 1. Información general

- **Épica:** Asistencia
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Detectar automáticamente a los alumnos inactivos que dejaron de asistir a pesar de tener la cuota al día, para coordinar acciones de retención temprana.

## 3. Descripción

Como propietaria, quiero detectar automáticamente alumnos inactivos que dejaron de asistir a pesar de tener la cuota al día para coordinar acciones de retención temprana.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando listado de inactivos)
- [ ] Listado de alumnos inactivos con cuota al día
- [ ] Detalle de un alumno inactivo
- [ ] Acciones sobre el alumno (contactar, marcar como gestionado, etc.)
- [ ] Guardando acción
- [ ] Éxito
- [ ] Error
- [ ] Empty (no hay alumnos inactivos detectados)
- [ ] Filtros por cantidad de inasistencias o período

## 5. Datos que necesita

### Datos que muestra (listado)

- Nombre y apellido del alumno
- Profesora a cargo
- Plan actual
- Estado de cuota (siempre `al_dia` en este listado)
- Cantidad de inasistencias consecutivas
- Fecha de la última asistencia
- Teléfono / email de contacto
- Tutor (si es menor de edad)
- Estado de gestión: `pendiente` | `contactado` | `gestionado` | `ignorado`

### Datos de configuración

- Cantidad de inasistencias consecutivas para considerar inactivo (parámetro configurable, por defecto 3)

### Datos que se generan

- Lista de alumnos detectados como inactivos
- Registro de acciones de retención (opcional para MVP)

## 6. Acciones del usuario

- Ver el listado de alumnos inactivos
- Filtrar por profesora, plan o cantidad de inasistencias
- Ver el detalle del alumno (ficha completa)
- Marcar al alumno como "contactado"
- Marcar al alumno como "gestionado"
- Ignorar al alumno (dejar de mostrarlo)
- Ver historial de gestión (opcional)

## 7. Reglas de negocio

- Se considera **inactivo** a un alumno con **X inasistencias consecutivas** (parámetro configurable, por defecto 3) **y cuota al día**.
- Los alumnos con **cuota vencida** no aparecen en este listado (son otro caso, se gestionan en cobranza).
- Solo se cuentan las inasistencias **consecutivas** (una asistencia corta la racha).
- El cálculo se hace sobre las clases efectivamente previstas para el alumno (según su plan y horarios).
- El listado debe actualizarse automáticamente (job diario o al consultar).
- La propietaria puede marcar a un alumno como `gestionado` para que no vuelva a aparecer (o aparezca con otro estado).
- El listado es visible solo para la propietaria.
- Los alumnos dados de baja no aparecen.

## 8. Criterios de aceptación

- [ ] Alumno con cuota al día y 3+ inasistencias consecutivas → aparece como inactivo
- [ ] Alumno con cuota vencida y varias inasistencias → no aparece en este listado
- [ ] Alumno con inasistencias no consecutivas → no aparece
- [ ] Alumno que asiste después de varias inasistencias → deja de aparecer
- [ ] El parámetro de inasistencias consecutivas es configurable
- [ ] La propietaria puede marcar a un alumno como gestionado
- [ ] El listado se actualiza automáticamente

## 9. Casos borde / Errores

- Alumno sin historial de asistencia → no aplicar (recién inscripto)
- Alumno con clase suelta → no aplica (no tiene racha semanal)
- Alumno con plan suspendido temporalmente → definir política
- Alumno con inasistencias justificadas (licencia, viaje) → permitir marcar como "justificado"
- Error de cálculo por datos incompletos → registrar log
- Error de red al cargar el listado

## 10. Dependencias

- US-10 (búsqueda y ficha del alumno)
- US-18 (estado de habilitación, que filtra cuota al día)
- US-20, US-21 (registro de asistencia e inasistencias)
- US-23 (honorarios, que se cobran por inscripto asista o no)
- US-26 (resumen diario para la propietaria, podría incluir inactivos)
- Backend: job de detección + endpoint de listado + configuración del parámetro

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media-Alta (por el cálculo de inasistencias consecutivas)
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Retención")
  - Listado en tabla (desktop) o cards (mobile)
  - Columnas principales:
    - Alumno (nombre + teléfono visible)
    - Profesora
    - Inasistencias consecutivas (con badge)
    - Última asistencia
    - Acciones (contactar, gestionar, ignorar)
  - Filtros por profesora, plan o cantidad de inasistencias
  - Botón de contacto rápido (abrir WhatsApp o llamar desde el celular)
  - Estado de gestión visible con badge de color:
    - Pendiente (amarillo)
    - Contactado (azul)
    - Gestionado (verde)
    - Ignorado (gris)
  - Configuración del parámetro de inasistencias consecutivas accesible desde la sección
  - Considerar también el email y el tutor como canales de contacto
