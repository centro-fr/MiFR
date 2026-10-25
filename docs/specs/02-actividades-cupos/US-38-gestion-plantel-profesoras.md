# US-38 – Gestión del plantel de profesoras (ABMC)

## 1. Información general

- **Épica:** Configuración Base
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint:** Sprint 4

## 2. Objetivo

Permitir a la Propietaria administrar el plantel de profesoras del centro de entrenamiento (altas, especialidad, consultas y bajas lógicas), asegurando que solo usuarios activos y con rol `PROFESORA` puedan ser asignadas a horarios, clases y cálculo de honorarios.

## 3. Descripción

Como propietaria, quiero gestionar el catálogo de profesoras del gimnasio indicando sus datos de especialidad y vinculándolas a su cuenta de usuario con rol docente, para poder contar con el staff activo necesario para dictar disciplinas, cubrir suplencias y generar los informes de honorarios.

## 4. Estados de la pantalla / flujo

- [ ] **Loading**: Cargando listado de profesoras y usuarios habilitados.
- [ ] **Listado de profesoras**: Grilla de tarjetas o tabla con datos de perfil, especialidad y estado.
- [ ] **Modal de alta**: Formulario emergente para seleccionar un usuario con rol `PROFESORA` y cargar su especialidad.
- [ ] **Guardando**: Feedback de operación asíncrona en curso (spinner / botón deshabilitado).
- [ ] **Éxito**: Notificación flotante (toast) confirmando el alta o la baja.
- [ ] **Error**: Manejo de errores de validación, conflicto (ej. usuario ya registrado) o fallo de red.
- [ ] **Confirmación de baja**: Diálogo modal de confirmación advirtiendo el impacto sobre horarios asignados.
- [ ] **Empty**: Estado visual cuando aún no hay profesoras registradas o tras una búsqueda sin coincidencias.

## 5. Datos que necesita

### Datos que muestra

- Identificador único (`id_profesora`).
- Nombre y apellido de la profesora (obtenido de `usuarios`).
- Especialidad deportiva o disciplina principal (ej. *Pilates Reformer*, *Funcional*, *Musculación*).
- Fecha de incorporación / alta (`fecha_alta`).
- Estado operativo (`Activa` / `Dada de baja`).
- Cantidad de horarios semanales a cargo (opcional / métrica informativa).

### Datos que se cargan / editan

- **Usuario a vincular** (`id_usuario`): Obligatorio. Selector de usuarios registrados, activos y con rol `PROFESORA` que aún no tengan ficha docente creada.
- **Especialidad** (`especialidad`): Opcional. Texto libre de hasta 80 caracteres.

## 6. Acciones del usuario

- Visualizar el listado completo de profesoras activas e historial de bajas.
- Buscar o filtrar profesoras por nombre, apellido o especialidad.
- Dar de alta una nueva profesora vinculando una cuenta de usuario existente.
- Dar de baja lógica a una profesora que deja de prestar servicios en el centro.

## 7. Reglas de negocio

1. **Prerrequisito de Rol y Estado**: Solo se puede dar de alta como profesora a un usuario que exista en la plataforma, esté en estado `ACTIVO` y tenga asignado previamente el rol `PROFESORA` (según US-02).
2. **Unicidad de Perfil Docente**: Un usuario no puede tener más de un registro de profesora vinculado (`id_usuario` único).
3. **Baja Estrictamente Lógica**: La baja nunca elimina físicamente el registro (`fecha_baja = fechaActualArgentina()`). Esto garantiza la preservación histórica y la integridad referencial en:
   - Historial de clases dictadas y asistencias (US-20).
   - Suplencias registradas pasadas (US-24).
   - Informes y cálculos mensuales de honorarios ya generados (US-23).
   - Cobros en efectivo rendidos (US-15 y US-19).
4. **Integridad con Horarios y Cronograma**: Si una profesora dada de baja aún posee horarios semanales asignados en el cronograma vigente (US-04), el sistema debe advertir o bloquear la baja hasta que sus franjas horarias sean reasignadas a otra docente o dadas de baja.
5. **Permisos y Seguridad**:
   - Consulta (`GET /api/profesoras`): Requiere permiso `HORARIOS_VER`.
   - Modificación/Alta/Baja (`POST`, `DELETE /api/profesoras`): Requiere rol `PROPIETARIA` y permiso `HORARIOS_EDITAR`.

## 8. Criterios de aceptación

- [ ] **CA-01 (Alta exitosa)**: Al seleccionar un usuario activo con rol `PROFESORA` e ingresar especialidad válida, se crea el perfil docente y se actualiza el listado.
- [ ] **CA-02 (Rechazo por rol inválido o inactivo)**: Si el usuario seleccionado no tiene rol `PROFESORA` o está inactivo, el sistema rechaza la operación informando el error de validación (400 Bad Request).
- [ ] **CA-03 (Rechazo por perfil preexistente)**: Si el usuario ya cuenta con un perfil de profesora, la solicitud es rechazada por conflicto (409 Conflict).
- [ ] **CA-04 (Baja lógica con preservación)**: Al confirmar la baja, el registro recibe su `fecha_baja`, deja de figurar como disponible para nuevos horarios y mantiene todo su histórico contable/asistencias intacto.
- [ ] **CA-05 (Filtro y búsqueda)**: La usuaria puede buscar profesoras por nombre o especialidad en tiempo real en la vista.

## 9. Casos borde / Errores

- Usuario seleccionado dado de baja a nivel cuenta antes de asignarle el perfil docente.
- Intento de dar de baja a una profesora que ya se encuentra dada de baja (conflicto 409).
- Especialidad que excede el límite máximo de 80 caracteres.
- Profesora con clases activas en el día de la baja (alerta operativa de reasignación).

## 10. Dependencias y Trazabilidad

- **US-01 y US-02**: Autenticación y gestión de usuarios/roles.
- **US-04**: Asignación de profesoras a los horarios semanales.
- **US-23 y US-24**: Informe mensual de honorarios y suplencias del plantel.
- **Backend**: Módulo `gestion-personas/profesor` (`POST /api/profesoras`, `GET /api/profesoras`, `DELETE /api/profesoras/:id`).

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Sección de configuración o sub-pestaña dentro de *Actividades y Horarios* / *Equipo Docente* bajo `OwnerLayout`.
- **Componentes**:
  - Encabezado con breadcrumbs, título `tracking-tight` y badge de píldora de conteo del staff activo.
  - Modal centrado flotante para el alta rápida.
  - Select con búsqueda asíncrona de usuarios aptos para rol profesora.
