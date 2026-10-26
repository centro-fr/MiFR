# Tareas de Implementación: Configuración Base

Tareas técnicas, secuenciales y verificables para implementar la épica **Configuración Base** (US-03, US-04 y US-38).

---

## Fase 1: Persistencia y Migraciones

- [ ] **1.1. Tablas `actividades`, `horarios` y `profesoras`**
  - Crear script de migración SQL para `actividades` (soporte de enum o check para `tipo: GRUPAL / PERSONALIZADA`, cupo_maximo, activo, fecha_alta, fecha_baja).
  - Crear script de migración para `profesoras` con FK hacia `usuarios`, campos `especialidad`, `fecha_alta`, `fecha_baja`.
  - Crear script de migración para `horarios` con FKs hacia `actividades` y `profesoras`, constraint `hora_fin > hora_inicio` e índices optimizados.
  - *Criterio de verificación*: Migración aplicada con éxito y verificación de constraints contra inserciones inválidas directas en SQL.

- [ ] **1.2. Datos semilla de prueba**
  - Insertar actividades de prueba: una grupal (ej: "Funcional Grupal") y una personalizada (ej: "Pilates Reformer" con cupo 4).
  - Insertar registros de profesoras de prueba para pruebas de asignación.
  - *Criterio de verificación*: `SELECT * FROM actividades` retorna los registros iniciales con sus tipos respectivos.

---

## Fase 2: Backend – Servicios y Endpoints

- [ ] **2.1. Módulo y CRUD de Actividades (US-03)**
  - Implementar `ActividadController`, `ActividadService`, `ActividadRepository`.
  - Validar regla de negocio: si `tipo == 'PERSONALIZADA'`, `cupo_maximo` debe ser > 0.
  - Implementar borrado lógico en `DELETE /actividades/:id` con verificación previa de dependencias en horarios.
  - *Criterio de verificación*: Pruebas automatizadas de creación grupal sin cupo y rechazo en personalizada sin cupo.

- [ ] **2.2. Algoritmo de detección de solapamiento y CRUD de Horarios (US-04)**
  - Implementar método en `HorarioService` para verificar colisión temporal de una profesora en el mismo día.
  - Validar que el usuario asignado tenga rol `PROFESORA` activo.
  - Implementar endpoints `GET /horarios` (con filtros) y `POST /horarios`.
  - Implementar `DELETE /horarios/:id` (baja lógica).
  - *Criterio de verificación*: Test unitario que simula dos horarios superpuestos para la misma profesora y verifica que devuelva error 409.

- [x] **2.3. Módulo y CRUD de Profesoras (US-38) [Sprint 4]**
  - Implementar `ProfesorController`, `ProfesorService`, `ProfesorRepository`.
  - Validar regla de negocio: usuario activo, existencia de rol `PROFESORA` y unicidad de perfil.
  - Implementar endpoints `GET /api/profesoras`, `POST /api/profesoras` y `DELETE /api/profesoras/:id` (baja lógica).
  - *Criterio de verificación*: Pruebas unitarias completas en `gestion-personas/profesor/__tests__/`.

---

## Fase 3: Frontend – Interfaces y Vistas

- [ ] **3.1. Pantalla de Gestión de Actividades (US-03)**
  - Crear vista `/admin/actividades` con listado de tarjetas/tabla y badge de estado (Activa / Inactiva).
  - Crear modal o formulario de alta/edición de actividad con selector de tipo (Grupal / Personalizada).
  - Manejar reactivamente la obligatoriedad del campo "Cupo máximo" al cambiar de tipo.
  - *Criterio de verificación*: En el formulario, al seleccionar "Personalizada" el input de cupo se marca como obligatorio y valida número mayor a cero.

- [ ] **3.2. Grilla Semanal de Horarios y Cronograma (US-04)**
  - Crear componente de cronograma semanal `/admin/horarios` con vista desktop (columnas Lunes a Domingo) y mobile (acordeón/lista).
  - Mostrar tarjetas de clase con nombre de actividad, color identificador, horario, cupo y profesora asignada.
  - Implementar modal de asignación de horario con select de actividades y select de profesoras activas.
  - Mostrar feedback visual inmediato en caso de error de superposición retornado por el backend.
  - *Criterio de verificación*: La grilla dibuja las clases en su día y franja horaria correspondiente sin descuadres visuales.

- [x] **3.3. Pantalla / Gestión del Plantel de Profesoras (US-38)**
  - Crear componente de administración de profesoras con listado/tabla de staff y especialidad.
  - Implementar modal flotante centrado de alta rápida con campos directos (nombre, apellido, email Google y especialidad opcional).
  - Implementar diálogo de confirmación para baja lógica.
  - *Criterio de verificación*: Alta de profesora visible de inmediato en el listado y disponible en el selector de horarios.

- [ ] **3.4. Vista de Cronograma Semanal para Profesoras ("Mis clases") (US-04)**
  - Crear pantalla `/app/mis-clases` en modo consulta para el rol Profesor/a.
  - En desktop: grilla semanal limpia sin controles de edición ni drag-and-drop.
  - En mobile: selector de días (Lunes a Sábado) con pestañas y tarjetas táctiles con actividad, horario y cupo.
  - Filtro automático por la docente autenticada (`useMiIdDeProfesora`).
  - *Criterio de verificación*: La profesora solo visualiza sus horarios semanales asignados; la pantalla responde rápido y maneja estado vacío si no tiene clases.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01 y CA-02**: Crear actividad grupal sin cupo y personalizada con cupo validado.
- [ ] **4.2. Verificación CA-03**: Probar inactivación de actividad sin dependencias y con dependencias activas.
- [ ] **4.3. Verificación CA-04 y CA-05**: Asignar profesora a horario y verificar rechazo al intentar solapar con otro bloque.
- [ ] **4.4. Verificación CA-06 y CA-07**: Validar que solo usuarios con rol profesora puedan seleccionarse y comprobar sobrescritura de cupo en el horario.
- [ ] **4.5. Verificación US-38 (CA-01 a CA-04)**: Validar alta de profesora con usuario apto, rechazo por falta de rol o perfil duplicado, y baja lógica segura.
