# US-29 – Consulta de estado de plan, asistencias y próximas clases

## 1. Información general
- **Épica:** Portal del Alumno
- **Prioridad:** Media
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 5

## 2. Objetivo
Permitir al alumno consultar desde su celular el estado de su plan, su historial de asistencias y sus próximas clases inscriptas, para llevar control de su actividad.

## 3. Descripción
Como alumno, quiero consultar desde mi celular el estado de mi plan, mi historial de asistencias y mis próximas clases inscriptas, para llevar control de mi actividad.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando datos del alumno)
- [ ] Panel principal con resumen
- [ ] Estado de cuota destacado
- [ ] Próximas clases
- [ ] Historial de asistencias
- [ ] Acceso a rutina y progreso (US-28)
- [ ] Acceso a ranking e insignias (US-30, US-31)
- [ ] Éxito
- [ ] Error de red
- [ ] Empty (alumno sin clases ni asistencias)

## 5. Datos que necesita
### Datos que muestra (resumen):
- Nombre del alumno
- Plan actual (nombre, tipo grupal/personalizada, frecuencia)
- Estado de cuota: `al_dia` / `por_vencer` / `vencida` (con badge de color)
- Fecha de vencimiento
- Días restantes o días vencidos
- Profesora a cargo

### Datos que muestra (próximas clases):
- Fecha y hora
- Actividad
- Profesora
- Cupo disponible (si aplica)

### Datos que muestra (historial de asistencias):
- Fecha de cada clase
- Actividad
- Estado: `presente` / `ausente`
- Profesora

### Datos que muestra (accesos rápidos):
- Botón "Renovar plan" (lleva a US-14)
- Botón "Informar pago por transferencia" (lleva a US-16)
- Botón "Mi progreso" (lleva a US-28)
- Botón "Mi racha" (lleva a US-31)
- Botón "Ranking" (lleva a US-30)

## 6. Acciones del usuario
- Ver el estado de su plan y cuota
- Ver sus próximas clases
- Ver su historial de asistencias
- Acceder a su rutina y progreso
- Acceder al ranking de asistencia
- Ver su racha e insignias
- Renovar o cambiar su plan (redirige a US-14)
- Informar un pago por transferencia (redirige a US-16)

## 7. Reglas de negocio
- Debe mostrar **estado de cuota, vencimiento, historial de asistencia y próximas clases en un solo panel**.
- El alumno **solo ve su propia información** (o la de su hijo/a si es tutor).
- Si el alumno es menor de edad, el **tutor** accede al panel.
- El estado de cuota se muestra con **badge de color** (verde/amarillo/rojo).
- Las próximas clases se muestran ordenadas por fecha ascendente.
- El historial de asistencias se muestra ordenado por fecha descendente (lo más reciente primero).
- Si no hay clases inscriptas, mostrar sección vacía sin error.
- Si no hay asistencias registradas, mostrar sección vacía sin error.
- El panel es **mobile-first** (uso principal desde el celular).
- Si hay una promoción vigente aplicable, mostrarla en el resumen del plan.

## 8. Criterios de aceptación
- [ ] Consulta del panel con cuota al día y próximas clases cargadas → muestra todo correctamente
- [ ] Consulta del panel de un alumno sin clases inscriptas → muestra sección vacía sin error
- [ ] El alumno ve solo su propia información (no la de otros)
- [ ] El tutor de un alumno menor accede a la información del menor
- [ ] El estado de cuota se muestra con badge de color claro
- [ ] Las próximas clases se muestran ordenadas por fecha ascendente
- [ ] El historial de asistencias se muestra ordenado por fecha descendente

## 9. Casos borde / Errores
- Alumno recién inscripto sin historial ni clases futuras → estados vacíos claros
- Alumno con cuota vencida → destacar con aviso y botón de renovación
- Alumno con pago pendiente de confirmación → mostrar estado "pendiente de confirmación"
- Error de red al cargar el panel → permitir reintentar
- Muchas asistencias en el historial → paginación o scroll infinito
- Alumno dado de baja → no accede al panel (o solo lectura del historial)

## 10. Dependencias
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica)
- US-14 (renovación o cambio de plan)
- US-16 (registro de pago por transferencia)
- US-18 (estado de habilitación de cuota)
- US-20, US-21 (asistencia e inasistencias)
- US-27, US-28 (rutina y progreso)
- US-30, US-31 (ranking e insignias)
- US-01, US-02 (permisos: el alumno solo ve lo suyo)
- Backend: endpoint del panel del alumno consolidado

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media-Alta (es la pantalla principal del alumno)
- Recomendación de UI (mobile-first):
  - Encabezado con nombre del alumno y foto (si está disponible)
  - Card destacada con el estado del plan:
    - Nombre del plan
    - Badge de estado de cuota (verde/amarillo/rojo)
    - Fecha de vencimiento
    - Botón "Renovar plan" o "Informar pago"
  - Sección "Próximas clases":
    - Lista de cards con fecha, hora, actividad y profesora
  - Sección "Mi progreso":
    - Acceso directo a rutina, mediciones y gráfico (US-28)
  - Sección "Mi historial":
    - Lista de asistencias (presente/ausente) con fecha
  - Sección "Mi comunidad":
    - Accesos a ranking (US-30) e insignias/racha (US-31)
  - Navegación inferior (bottom nav) en mobile:
    - Inicio / Plan / Progreso / Comunidad / Perfil
  - Colores de la marca (#E91E82, #BC1266, #181C26)
  - Estados vacíos bien diseñados con mensajes claros
  - Optimizado para scroll en mobile