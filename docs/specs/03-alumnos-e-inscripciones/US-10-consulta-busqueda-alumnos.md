# US-10 – Consulta y búsqueda de alumnos

## 1. Información general

- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Permitir buscar y consultar la ficha de cualquier alumno registrado (datos, plan, estado de cuota e historial) para resolver consultas operativas del día a día de forma rápida.

## 3. Descripción

Como propietaria o profesora, quiero buscar y consultar la ficha de cualquier alumno registrado (datos, plan, estado de cuota e historial), para resolver consultas operativas del día a día.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando listado de alumnos)
- [ ] Listado completo de alumnos
- [ ] Búsqueda activa con resultados
- [ ] Sin resultados (búsqueda sin coincidencias)
- [ ] Ficha del alumno seleccionado
- [ ] Error de red
- [ ] Empty (no hay alumnos cargados en el sistema)

## 5. Datos que necesita

### Datos del listado

- Nombre y apellido
- DNI o identificador
- Estado (activo / pendiente / baja)
- Plan asignado
- Estado de cuota (al día / por vencer / vencida)
- Teléfono de contacto
- Profesora a cargo (opcional)

### Datos de la ficha del alumno

- Nombre completo
- Fecha de nacimiento / edad
- Teléfonos (contacto, emergencia y de tutor en caso de menor)
- Email
- Tutor (si es menor de edad)
- Plan asignado (nombre, frecuencia, precio)
- Horarios y profesora
- Estado de cuota
- Fecha de vencimiento de la cuota
- Historial de pagos
- Historial de asistencia
- Peso y talla (si corresponde)
- Observaciones

### Filtros disponibles

- Por estado (activo / pendiente / baja)
- Por plan
- Por profesora
- Por estado de cuota (al día / vencida)
- Por actividad

## 6. Acciones del usuario

- Ver listado completo de alumnos
- Buscar por nombre, DNI o identificador
- Filtrar por estado, plan, profesora o estado de cuota
- Abrir la ficha de un alumno
- Navegar entre secciones de la ficha (datos, pagos, asistencia)
- (Opcional) Exportar el listado filtrado

## 7. Reglas de negocio

- La búsqueda debe permitir coincidencias parciales por nombre (búsqueda incremental).
- Debe permitir buscar por DNI o identificador exacto.
- La ficha debe mostrar **datos, plan, estado de cuota e historial de asistencia en una sola vista** (o en pestañas accesibles sin recargar).
- Los alumnos dados de baja **no aparecen por defecto** en el listado (se muestran solo si se activa el filtro "incluir dados de baja").
- Una profesora solo puede ver los datos de los alumnos a su cargo (restringido por permisos).
- La propietaria puede ver todos los alumnos.
- Los datos financieros (historial de pagos) son visibles solo para la propietaria.

## 8. Criterios de aceptación

- [ ] Búsqueda por nombre parcial → muestra coincidencias correctamente
- [ ] Búsqueda de un alumno inexistente → sin resultados con mensaje claro
- [ ] Búsqueda por DNI exacto → muestra el alumno correspondiente
- [ ] La ficha muestra datos, plan, estado de cuota e historial en una sola vista
- [ ] Los alumnos dados de baja no aparecen por defecto
- [ ] Una profesora solo ve los alumnos a su cargo
- [ ] La propietaria ve todos los alumnos y su historial completo de pagos

## 9. Casos borde / Errores

- Búsqueda con caracteres especiales o acentos → debe funcionar correctamente
- Muchos resultados → paginación o scroll infinito
- Alumno sin plan asignado (pre-inscripción) → mostrar claramente su estado
- Alumno sin historial de asistencia → mostrar sección vacía sin error
- Error de red al cargar el listado o la ficha
- Búsqueda muy amplia (ej: "a") que devuelve demasiados resultados

### Historial de asistencia: contrato con el back (13/11/2026)

`GET /api/v1/alumnos/{id}/asistencias`, con el mismo acceso que la ficha: `ALUMNOS_VER`, y a una profesora solo los alumnos que tiene a cargo (uno ajeno o que no existe responde 403). Lo arma la fachada de GestionPersonas con IInfoAsistencia:

- **Qué marcas:** las de clases dictadas (cerradas), de la más nueva a la más vieja, con el horario, la actividad, quién dictó la clase (con una suplencia, la suplente), si asistió y la observación de la marca.
- **Paginado:** `limit` (por defecto 10, hasta 100) y `offset`, como todo listado: el historial crece con cada clase. `asistio=true|false` filtra presentes o ausentes en el back.
- **Totales:** `total` es el de lo filtrado; `presentes` y `ausentes`, los de todo el historial, para las pestañas de la ficha.

## 10. Dependencias

- US-05, US-06, US-07 (los alumnos deben existir)
- US-08 (baja lógica, para el filtro de estado)
- US-09 (modificación de datos, desde la ficha)
- US-15, US-16, US-17 (pagos, para el historial)
- US-20, US-21 (asistencia, para el historial)
- US-18 (estado de habilitación de cuota)
- Backend: endpoints de listado, búsqueda, filtros y ficha detallada

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI:
  - Barra de búsqueda prominente arriba del listado
  - Filtros como chips o dropdowns colapsables
  - Listado en tabla (desktop) o cards (mobile)
  - La ficha del alumno con pestañas o secciones: "Datos", "Plan", "Pagos", "Asistencia"
  - Badge de estado de cuota con colores: verde (al día), amarillo (por vencer), rojo (vencida)
  - Botón "Editar" desde la ficha (lleva a US-09)
  - Botón "Dar de baja" desde la ficha (lleva a US-08)
  - Búsqueda con debounce para no saturar el backend
  - La búsqueda debe funcionar también sin acentos (normalizar texto)
