# US-22 – Detección de alumnos inactivos con cuota al día (Panel de Ausentes)

## 1. Información general

- **Épica:** Asistencia
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Identificar automáticamente a los alumnos que presentan inasistencias consecutivas a pesar de encontrarse con la cuota al día, brindando a la Propietaria herramientas de contacto directo (WhatsApp y llamadas) y registro de gestión para coordinar acciones de retención temprana.

## 3. Descripción

Como propietaria, quiero contar con un panel dedicado de ausencias (`/ausentes`) que detecte a los alumnos que dejaron de asistir teniendo su cuota al día, clasificándolos visualmente según la gravedad de sus inasistencias consecutivas y permitiéndome contactarlos por WhatsApp con un solo clic o registrar notas de seguimiento, para evitar la deserción de alumnos.

## 4. Estados de la pantalla / flujo

- [ ] **Acceso en Menú**: Opción "Ausentes" en la sección "Centro" del menú de la Propietaria (`OwnerLayout`).
- [ ] **Panel de Ausentes (`AusentesPage`)**:
  - **Encabezado**: Título `tracking-tight` y badge de píldora con el conteo de alumnos ausentes detectados.
  - **Barra de Filtros en Píldoras**: Filtros rápidos por nivel de inasistencias:
    - *Todas*
    - *2 a 3 ausencias* (alerta inicial - amarillo)
    - *4 a 5 ausencias* (alerta media - naranja)
    - *6 o más ausencias* (alerta crítica - rojo)
    - Filtro por estado de gestión (`Pendiente`, `Contactado`, `Gestionado`, `Ignorado`).
  - **Grilla de Tarjetas / Tabla**: Despliegue de cada alumno con su plan, profesora a cargo, chip de ausencias consecutivas, fecha de la última clase asistida y contacto del tutor si es menor.
- [ ] **Modal de Gestión de Inactividad (`ModalGestionInactividad`)**:
  - **Contacto Rápido por WhatsApp**: Botón que abre WhatsApp Web o la app móvil con un mensaje precargado personalizado para el alumno o tutor.
  - **Llamada Directa**: Enlace `tel:` para marcar al teléfono del alumno o tutor desde dispositivos móviles.
  - **Selector de Estado de Gestión**: Opciones de radio: `Pendiente`, `Contactado`, `Gestionado`, `Ignorado`.
  - **Campo de Observaciones**: Área de texto para asentar notas del contacto (ej. *motivos de salud, viaje temporal, reanuda la próxima semana*).
- [ ] **Guardando**: Feedback visual de actualización del estado de gestión.
- [ ] **Empty**: Estado visual cuando ningún alumno con cuota al día presenta ausencias consecutivas reiteradas.

## 5. Datos que necesita

### Datos que muestra (Panel de ausentes)

- **Nombre y apellido del alumno**.
- **Plan actual y disciplina**.
- **Profesora a cargo**.
- **Inasistencias consecutivas**: Número de clases seguidas a las que no asistió.
- **Fecha de última asistencia**: Última clase en que dio el presente.
- **Teléfono de contacto**: Teléfono directo o del tutor responsable si es menor de 18 años.
- **Datos del tutor**: Nombre y teléfono del adulto responsable cuando el alumno es menor (US-06).
- **Estado de gestión**: `PENDIENTE`, `CONTACTADO`, `GESTIONADO`, `IGNORADO`.
- **Última observación registrada**.

### Datos que se cargan en la gestión

- **Nuevo estado de gestión**: Selección del estado operativo.
- **Observación / Nota interna**: Texto descriptivo de la acción tomada.

## 6. Acciones del usuario

- Filtrar el listado por chips de gravedad de ausencias consecutivas o por estado de gestión.
- Buscar alumnos por nombre o teléfono mediante la barra de búsqueda en píldora.
- Abrir el modal de gestión para un alumno ausente.
- Iniciar conversación de WhatsApp con texto predefinido haciendo un solo clic en "Abrir WhatsApp".
- Cambiar el estado de gestión y guardar notas de seguimiento para el equipo.

## 7. Reglas de negocio

1. **Condición de Inactividad**: Solo califican en este panel los alumnos con **cuota al día** (`AL_DIA`) que hayan acumulado 2 o más inasistencias consecutivas en sus horarios habituales. Los alumnos con cuotas vencidas se canalizan en el módulo de cobranzas (US-15).
2. **Corte de Racha**: Si un alumno asiste a una clase dictada, su racha de inasistencias se reinicia inmediatamente a 0 y desaparece del panel de ausentes.
3. **Clases Dictadas Exclusivamente**: Solo suman ausencias las clases que fueron efectivamente dictadas y cerradas en el sistema (US-20 y US-21); clases canceladas o días feriados no incrementan la racha.
4. **Prioridad de Contacto en Menores**: Para alumnos menores de 18 años, el botón de WhatsApp y los enlaces de llamada dirigen al teléfono del tutor registrado (US-06).
5. **Persistencia de Gestión**: Marcar a un alumno como `GESTIONADO` o `IGNORADO` permite conservarlo categorizado sin generar falsas alarmas en el conteo de ausencias críticas.

## 8. Criterios de aceptación

- [ ] **CA-01 (Listado de ausentes correcto)**: Alumno con cuota al día y 3 ausencias consecutivas → aparece en el panel con chip de 3 inasistencias.
- [ ] **CA-02 (Exclusión por cuota vencida)**: Alumno con 4 ausencias pero con cuota vencida → no aparece en este panel (se gestiona en cuotas).
- [ ] **CA-03 (Acceso rápido a WhatsApp)**: Al hacer clic en "Abrir WhatsApp", se abre el enlace `https://wa.me/...` con el mensaje personalizado y el número correspondiente.
- [ ] **CA-04 (Cambio de estado de gestión)**: Cambiar el estado a "Contactado" con una nota y guardar → la tarjeta del alumno actualiza su badge y muestra la observación registrada.
- [ ] **CA-05 (Filtro por píldoras)**: Seleccionar el chip "4 a 5 ausencias" filtra instantáneamente la grilla mostrando solo los alumnos en ese rango de severidad.

## 9. Casos borde / Errores

- Alumno sin número de teléfono registrado → el modal avisa que no posee teléfono para WhatsApp y permite registrar notas de contacto presencial.
- Alumno recién inscripto que aún no tuvo clases dictadas → no contabiliza ausencias.

## 10. Dependencias y Trazabilidad

- **US-06**: Datos de contacto del tutor de alumnos menores.
- **US-18**: Cálculo del estado de cuota al día.
- **US-20 y US-21**: Asistencia y cierre automático de clases con ausentes.
- **Backend**:
  - `GET /api/v1/reportes/alumnos-inactivos`: consulta de ausentes con cuota al día.
  - `POST /api/v1/reportes/alumnos-inactivos/:id/gestionar`: actualización del estado de retención y observaciones.

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Ruta `/ausentes` bajo `OwnerLayout` (sección "Centro" → "Ausentes").
- **Componentes clave**:
  - `AusentesPage`: Vista contenedora con filtros en píldoras, buscador y tarjetas de alumnos ausentes.
  - `ModalGestionInactividad`: Diálogo modal con integración de WhatsApp y notas.
  - `formato-inactivos.ts`: Formateo de fechas, textos para WhatsApp y colores semánticos de chips.
  - `useInactivos`: Hook TanStack Query con mutación optimista del estado de gestión.
- **Tests**: `ausentes-page.test.tsx` (filtros, apertura de modal, envío de gestión) y `formato-inactivos.test.ts`.
