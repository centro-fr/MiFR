# US-04 – Asignación de profesoras y horarios a actividades

## 1. Información general

- **Épica:** Configuración Base
- **Prioridad:** Alta
- **Actor principal:** Propietaria (gestión y administración) / Profesora (consulta de cronograma personal)
- **Sprint sugerido:** Sprint 1

## 2. Objetivo

Permitir a la Propietaria asignar profesoras y horarios a cada actividad para mantener organizado el cronograma del centro, y permitir a las Profesoras consultar su cronograma semanal personal ("Mis clases") con sus franjas horarias asignadas, cupos e inscriptos tanto en desktop como en mobile.

## 3. Descripción

- Como **propietaria**, quiero asignar profesoras y franjas horarias a cada actividad deportiva (grupal o personalizada) para organizar el cronograma semanal del gimnasio, evitando solapamientos horarios y respetando la franja operativa del centro.
- Como **profesora**, quiero consultar mi cronograma semanal asignado ("Mis clases") para conocer mis horarios de trabajo, actividades a cargo, vacantes y cupo de inscriptos en cada horario.

## 4. Estados de la pantalla / flujo

- [ ] **Loading**: Cargando cronograma semanal, catálogo de actividades y plantel de profesoras activas.
- [ ] **Vista Cronograma Propietaria (Desktop)**: Grilla semanal tipo calendario (`CronogramaGridDesktop`) con drag-and-drop y edición administrativa.
- [ ] **Vista Cronograma Propietaria (Mobile)**: Lista interactiva agrupada por día (`CronogramaListMobile`) con selector de pestañas y botones de gestión.
- [ ] **Vista Docente "Mis Clases" (`/app/mis-clases`)**: Cronograma semanal personal de la profesora logueada en modo lectura (grilla semanal en desktop y pestañas Lun-Sáb en mobile con detalle de cupo y vacantes).
- [ ] **Filtros rápidos**: Píldoras y selects para filtrar el cronograma por actividad o por profesora.
- [ ] **Modal de alta / edición**: Diálogo flotante centrado (`HorarioModalForm`) para cargar o modificar día, horas, actividad y docente.
- [ ] **Validación en tiempo real**: Alerta roja inmediata ante superposición de horarios de la docente o inconsistencias horarias antes del envío.
- [ ] **Confirmación de baja**: Diálogo de confirmación con advertencia de impacto sobre alumnos inscriptos.
- [ ] **Empty**: Estado visual cuando no hay horarios registrados o cuando no hay profesoras activas configuradas (con enlace directo a `/admin/profesoras`).
- [ ] **Error**: Manejo visual de errores con botón de reintentar.

## 5. Datos que necesita

### Datos que muestra

- **Actividad**: Nombre de la disciplina y modalidad (`Grupal` o `Personalizada`).
- **Profesora**: Nombre y apellido de la docente asignada.
- **Día de la semana**: Lunes a Domingo (mapeado de 1 a 7).
- **Horario**: Hora de inicio y hora de fin en formato `HH:mm`.
- **Cupo máximo**: Cupo asignado al horario o heredado de la actividad.
- **Cantidad de inscriptos**: Ocupación actual respecto al cupo.

### Datos que se cargan / editan

- **Actividad** (`actividadId`): Obligatorio. Identificador numérico de la actividad activa seleccionada.
- **Profesora** (`profesoraId`): Obligatorio. Identificador de la docente con rol `PROFESORA` activo.
- **Día de la semana** (`diaSemana`): Obligatorio. Entero del 1 (Lunes) al 7 (Domingo).
- **Hora de inicio** (`horaInicio`): Obligatorio. Formato `HH:mm`, entre las 07:00 y las 22:30 hs.
- **Hora de fin** (`horaFin`): Obligatorio. Formato `HH:mm`, posterior a la hora de inicio y hasta las 23:00 hs.
- **Cupo máximo** (`cupoMaximo`): Opcional. Si no se especifica, toma el cupo definido en la actividad.

## 6. Acciones del usuario

- Visualizar el cronograma semanal completo en grilla horaria (desktop) o listado por día (mobile).
- Filtrar la grilla por actividad o por profesora a cargo.
- Crear un nuevo horario mediante el botón "+ Nuevo horario".
- Editar un horario existente haciendo clic sobre la tarjeta de clase en el cronograma.
- Eliminar / dar de baja lógica un horario mediante el botón de baja en el modal de edición.
- Acceder al enlace rápido de gestión de profesoras si el plantel está vacío.

## 7. Reglas de negocio

1. **Horario Comercial Estricto**: Ninguna clase puede comenzar antes de las 07:00 hs (`HORA_APERTURA`) ni finalizar después de las 23:00 hs (`HORA_CIERRE`). La hora máxima permitida de inicio es 22:30 hs.
2. **Coherencia Temporal**: La hora de fin debe ser estrictamente posterior a la hora de inicio (`hora_fin > hora_inicio`).
3. **No Superposición de la Profesora**: Una misma profesora no puede tener dos horarios asignados que colisionen o se superpongan en el mismo día. La validación se evalúa localmente en el frontend antes de enviar y se valida de forma transaccional en el backend.
4. **Plantel Docente Habilitado**: Solo pueden asignarse usuarios activos con rol `PROFESORA` y perfil vigente (sin `fecha_baja`).
5. **Protección de Alumnos Inscriptos**: No se permite la baja de un horario que posea alumnos con inscripciones activas a futuro; el sistema debe advertir e impedir la operación hasta reasignar las inscripciones.
6. **Cupo Máximo Efectivo**: En clases personalizadas, el cupo respeta el límite de la actividad (máximo 40 alumnos) o el valor específico asignado al horario.

## 8. Criterios de aceptación

- [ ] **CA-01 (Alta válida)**: Crear un horario dentro del rango operativo (07:00 a 23:00) con docente disponible → se guarda y se dibuja inmediatamente en el cronograma.
- [ ] **CA-02 (Rechazo por superposición)**: Intentar asignar una profesora a un horario que colisiona con otra clase del mismo día → muestra alerta roja explicativa e impide guardar.
- [ ] **CA-03 (Horas inválidas)**: Ingresar hora fin menor o igual a hora inicio → muestra error de validación en el formulario.
- [ ] **CA-04 (Fuera de horario de atención)**: Ingresar clase antes de las 07:00 o después de las 23:00 → validación Zod bloquea la acción.
- [ ] **CA-05 (Responsive)**: En desktop se presenta la grilla horaria completa; en resoluciones menores se activa automáticamente la vista agrupada por día con selector de pestañas.
- [ ] **CA-06 (Consulta docente - Mis Clases)**: Una profesora autenticada (o propietaria en rol docente) accede a `/app/mis-clases` y visualiza únicamente sus horarios semanales asignados con sus actividades, cupos y cantidad de inscriptos, en modo lectura.

## 9. Casos borde / Errores

- Clases contiguas que comparten la misma franja (ej. 10:00 a 11:30 y 11:30 a 13:00) → se acomodan al 50% de ancho sin solapamiento visual en la grilla desktop.
- Intento de baja de horario con alumnos activos → el backend responde error 400/409 y el modal muestra el mensaje de impedimento.
- Plantel sin profesoras registradas → la vista muestra estado vacío informativo y botón para dar de alta profesoras (US-38).
- Profesora sin horarios asignados → `/app/mis-clases` muestra tarjeta de estado vacío informando que aún no posee clases semanales asignadas.
- Fallo de red al guardar o eliminar → notificación toast de error y persistencia del estado en el formulario para no perder datos.

## 10. Dependencias y Trazabilidad

- **US-01 y US-02**: Autenticación y permisos (`HORARIOS_VER`, `HORARIOS_EDITAR`).
- **US-03**: Actividades y cupos base creados previamente.
- **US-38**: Plantel de profesoras activas para alimentar el selector de docentes.
- **US-05**: Las inscripciones de alumnos seleccionan horarios generados en esta historia.
- **Backend**:
  - `GET /api/v1/horarios`: listado de horarios con filtros por actividad y profesora.
  - `POST /api/v1/horarios`: creación de horario con validación de superposición.
  - `PUT /api/v1/horarios/:id`: edición de franja o docente.
  - `DELETE /api/v1/horarios/:id`: baja lógica del horario.

## 11. Notas de implementación (Frontend)

- **Layout**: Implementado bajo `OwnerLayout` siguiendo la guía de diseño del proyecto (título con `tracking-tight`, badge de conteo de clases y sin breadcrumbs duplicados locales).
- **Componentes clave**:
  - `HorariosPage` (`/app/horarios`): Vista administrativa de la propietaria con barra de acciones, filtros y control responsive.
  - `CronogramaGridDesktop`: Grilla de 7 columnas horarias con posicionamiento absoluto por cálculo de minutos transcurridos desde las 07:00.
  - `CronogramaListMobile`: Vista móvil optimizada para interacción táctil con pestañas por día.
  - `HorarioModalForm`: Modal flotante centrado con esquema `horarioFormSchema` (Zod) y `useForm`.
  - `MisClasesPage` (`/app/mis-clases`): Vista de consulta docente con el cronograma semanal personal filtrado por `useMiIdDeProfesora`.
- **Tests**: `HorarioModalForm.test.tsx`, `CronogramaGridDesktop.test.tsx`, `CronogramaListMobile.test.tsx`, `mis-clases-page.test.tsx` y `horario.test.ts`.
