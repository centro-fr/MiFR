# Plan Técnico: Alumnos e Inscripciones

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Arquitectura orientada a eventos internos (EventEmitter de Node.js o dispatchers de dominio):
  - Evento `PagoConfirmadoEvent` -> desencadena el handler `ActivarInscripcionHandler` que transiciona `alumnos.estado` de `PENDIENTE` a `ACTIVO` y crea la asociación `usuario_roles` correspondiente.
- Transacciones ACID (`db.transaction`) al crear pre-inscripciones (insert en `usuarios`, `alumnos`, `inscripciones`, `inscripcion_horarios`).
- Middleware de permisos:
  - `alumnos.ver`: Propietaria y Profesoras (con filtro por profesoras a cargo en consultas de detalle).
  - `alumnos.crear`: Propietaria y Profesoras.
  - `alumnos.editar`: Propietaria y Profesoras.
  - `alumnos.baja`: Solo Propietaria.

### 1.2. Frontend

- Formulario wizard de alta / pre-inscripción en 3 pasos:
  1. Datos del Alumno (cálculo reactivo de edad mediante `date-fns` o helper; renderizado condicional del bloque "Datos del Tutor").
  2. Selección de Plan, Actividad, Horarios y Profesora.
  3. Resumen y Confirmación.
- Listado con Data Table reactiva (filtros por debounce de 300ms en búsqueda por texto, dropdown de estados y ordenación por columnas).

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Entidad Alumnos
CREATE TABLE alumnos (
    id_alumno SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE NULL REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    id_usuario_responsable INT NULL REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    cont_emerg_nombre VARCHAR(100) NULL,
    cont_emerg_telefono VARCHAR(30) NULL,
    observaciones TEXT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'INACTIVO', 'BAJA')),
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP NULL
);

-- Inscripciones a Planes
CREATE TABLE inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_plan INT NOT NULL REFERENCES planes(id_plan) ON DELETE RESTRICT,
    id_plan_precio INT NOT NULL REFERENCES plan_precios(id_plan_precio) ON DELETE RESTRICT,
    id_promocion INT NULL REFERENCES promociones(id_promocion) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin_estimado DATE NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PREINSCRIPTA' CHECK (estado IN ('PREINSCRIPTA', 'ACTIVA', 'BAJA')),
    motivo_baja VARCHAR(30) NULL CHECK (motivo_baja IN ('ABANDONO', 'MUDANZA', 'SALUD', 'ECONOMICO', 'CAMBIO_PLAN', 'OTRO')),
    observaciones TEXT NULL,
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP NULL
);

-- Horarios asignados por Inscripción
CREATE TABLE inscripcion_horarios (
    id_inscripcion INT NOT NULL REFERENCES inscripciones(id_inscripcion) ON DELETE CASCADE,
    id_horario INT NOT NULL REFERENCES horarios(id_horario) ON DELETE RESTRICT,
    fecha_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_hasta DATE NULL,
    PRIMARY KEY (id_inscripcion, id_horario)
);

CREATE INDEX idx_alumnos_estado ON alumnos(estado);
CREATE INDEX idx_inscripciones_alumno ON inscripciones(id_alumno, estado);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Alumnos (`/api/v1/alumnos`)

- `GET /api/v1/alumnos`: Búsqueda con paginación (`?q=&estado=&id_plan=&id_profesora=&page=1&limit=20`).
- `GET /api/v1/alumnos/:id`: Ficha consolidada (datos personales, tutor, inscripción actual, historial de cuotas y asistencias).
- `POST /api/v1/alumnos/pre-inscripcion`:
  - Body:

    ```json
    {
      "alumno": { "nombre": "Tomás", "apellido": "Pérez", "dni": "45123999", "fecha_nacimiento": "2010-05-12", "telefono": "351...", "cont_emerg_nombre": "Carlos", "cont_emerg_telefono": "351..." },
      "tutor": { "nombre": "Carlos", "apellido": "Pérez", "email": "carlos@gmail.com", "telefono": "351...", "dni": "28111222" },
      "id_plan": 2,
      "id_plan_precio": 5,
      "horarios_ids": [3, 7]
    }
    ```

- `PUT /api/v1/alumnos/:id`: Actualización de datos del alumno y tutor.
- `POST /api/v1/alumnos/:id/baja`: Baja lógica (`{ "motivo": "ECONOMICO", "observaciones": "..." }`).
- `POST /api/v1/alumnos/:id/reactivar`: Reactivación con re-asignación de plan/horarios.

---

## 4. Flujo de Alta Definitiva por Primer Pago

```text
[Propietaria/Profesora]       [Módulo Pagos]               [Módulo Alumnos]               [Base de Datos]
         |                          |                             |                              |
         |--- 1. Registra pago ---->|                             |                              |
         |    (Efectivo/Transfer)   |--- 2. Transacción Pago ---->|                              |
         |                          |       PagoConfirmado        |                              |
         |                          |                             |--- 3. Update estado Alumno ->|
         |                          |                             |       'PENDIENTE' -> 'ACTIVO'|
         |                          |                             |--- 4. Update Inscripción --->|
         |                          |                             |       'PREINSCRIPTA'->'ACTIVA|
         |                          |                             |--- 5. Asigna Rol Alumno/Tutor|
         |<-- 6. Éxito confirmado---|                             |<-- 7. Confirmación OK -------|
```

---

## 5. Consideraciones de Seguridad y Roles

- Solo la `PROPIETARIA` tiene potestad para ejecutar la baja lógica de un alumno.
- Las `PROFESORAS` solo pueden consultar datos de alumnos asignados a sus horarios cuando se filtre por su alcance, preservando privacidad de datos de otros cursos.
- Protección estricta de datos de menores: las comunicaciones por correo y teléfono se dirigen al tutor asociado.
