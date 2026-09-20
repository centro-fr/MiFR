# Tareas de Implementación: Alumnos e Inscripciones

Tareas técnicas, secuenciales y verificables para la épica **Alumnos e Inscripciones** (US-05 a US-10).

---

## Fase 1: Esquema de Base de Datos y Relaciones

- [ ] **1.1. Tablas `alumnos`, `inscripciones` e `inscripcion_horarios`**
  - Crear script de migración SQL para tablas `alumnos`, `inscripciones` e `inscripcion_horarios`.
  - Configurar claves foráneas hacia `usuarios` (para alumno y tutor responsable), `planes` y `horarios`.
  - Agregar índices en `estado`, DNI y fecha de inscripción.
  - *Criterio de verificación*: Migración ejecutada correctamente y verificación de integridad referencial.

- [ ] **1.2. Datos semilla de prueba**
  - Insertar alumnos de prueba (uno mayor de edad activo, uno menor de edad con tutor asociado y uno pre-inscripto pendiente).
  - *Criterio de verificación*: Consultas SQL que verifiquen relaciones directas entre alumno y tutor responsable.

---

## Fase 2: Backend – Lógica de Negocio y Endpoints

- [ ] **2.1. Lógica de Pre-inscripción y Menores de Edad (US-05 y US-06)**
  - Implementar validación de fecha de nacimiento: si edad < 18 años, exigir obligatoriamente objeto `tutor`.
  - Reutilización de tutor: buscar tutor por DNI/email; si ya existe, enlazar su `id_usuario`, sino crearlo.
  - Insertar alumno e inscripción en estado `PENDIENTE` y `PREINSCRIPTA`.
  - *Criterio de verificación*: Test unitario intentando pre-inscribir a un menor sin tutor que retorne HTTP 400.

- [ ] **2.2. Evento y Handler de Activación por Pago (US-07)**
  - Implementar handler `ActivarInscripcionHandler` invocado tras confirmación de primer pago.
  - Actualizar estados de `alumnos` e `inscripciones` a `ACTIVO` / `ACTIVA`.
  - Asignar rol `ALUMNO` (o `TUTOR` si es menor) en `usuario_roles`.
  - *Criterio de verificación*: Simular evento de pago confirmado y verificar que el alumno cambie de estado automáticamente.

- [ ] **2.3. Bajas Lógicas y Reactivaciones (US-08)**
  - Implementar endpoint `POST /alumnos/:id/baja` que marque estado `BAJA`, registre fecha y motivo sin borrar historial.
  - Implementar endpoint `POST /alumnos/:id/reactivar` verificando cupo en el horario seleccionado.
  - *Criterio de verificación*: Al dar de baja, el alumno mantiene sus pagos y cuotas históricas pero desaparece de las consultas de alumnos activos.

- [ ] **2.4. Búsqueda y Modificación (US-09 y US-10)**
  - Implementar `GET /alumnos` con filtros dinámicos (texto `q`, `estado`, `id_plan`, `id_profesora`) y paginación (`limit`, `offset`).
  - Implementar `PUT /alumnos/:id` para actualizar datos personales y de contacto.
  - *Criterio de verificación*: Búsqueda con parámetro `q=Pérez` devuelve solo los alumnos que coincidan en nombre, apellido o tutor.

---

## Fase 3: Frontend – Formularios y Vistas de Alumnos

- [ ] **3.1. Asistente Wizard de Pre-inscripción (US-05 y US-06)**
  - Construir formulario en `/alumnos/nuevo` con selector reactivo de fecha de nacimiento.
  - Desplegar automáticamente los campos del tutor si la edad calculada es menor a 18 años.
  - Selector de plan y checkboxes/radios de horarios disponibles filtrados por la profesora elegida.
  - *Criterio de verificación*: Al ingresar fecha de nacimiento de menor de edad, el formulario muestra y valida obligatoriamente los datos del tutor.

- [ ] **3.2. Ficha del Alumno y Edición (US-08 y US-09)**
  - Construir vista `/alumnos/:id` con pestañas: Información General, Contacto, Plan y Horarios, Historial de Pagos, Historial de Asistencias.
  - Botón de edición para modificar datos de contacto y observaciones.
  - Botón "Dar de Baja" (solo visible para Propietaria) que abre modal con selección de motivo.
  - Opción de "Reactivar Alumno" en fichas con estado `BAJA`.
  - *Criterio de verificación*: La ficha del alumno renderiza todos los bloques de información y restringe botones según rol.

- [ ] **3.3. Listado y Búsqueda Avanzada (US-10)**
  - Vista `/alumnos` con barra de búsqueda con debounce y selector de filtros (estado, plan, profesora).
  - Paginación y badges de estado con colores (Verde: Activo, Amarillo: Pendiente, Gris: Baja).
  - *Criterio de verificación*: Filtrar por estado "Pendiente" y comprobar que solo se listen las pre-inscripciones.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01 y CA-02**: Crear pre-inscripción de mayor y de menor validando exigencia de tutor.
- [ ] **4.2. Verificación CA-03 y CA-04**: Disparar confirmación de pago y verificar alta definitiva automática.
- [ ] **4.3. Verificación CA-05 y CA-06**: Realizar baja lógica y posterior reactivación validando cupos.
- [ ] **4.4. Verificación CA-07**: Ejecutar búsquedas combinadas y verificar performance de respuesta.
