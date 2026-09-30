# Plan Técnico: Asistencia

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Generación de instancias de `clases` basada en `horarios` semanales:
  - Generador bajo demanda o proceso cron semanal que instancia los registros de `clases` correspondientes a la semana en curso.
- Cierre de asistencia:
  - Transacción atómica que actualiza `clases.fecha_cierre_asist = NOW()` y ejecuta un `INSERT ... ON CONFLICT` para completar como `asistio = FALSE` a todos los inscriptos sin registro previo.
- Tarea programada (Cron Job diario / horario):
  - Detección de inactivos mediante consulta analítica con funciones de ventana (`ROW_NUMBER()` o subconsultas sobre las últimas $N$ clases de cada alumno inscripto).
- Control de permisos:
  - `asistencia.tomar`: Profesora (limitada a sus propias clases) y Propietaria (todas).
  - `asistencia.reabrir`: Exclusivo `PROPIETARIA`.

### 1.2. Frontend

- Vista Mobile First para profesoras (`/profesora/clases-hoy`):
  - Tarjetas de clases con indicador de progreso (ej: "8/12 presentes").
  - Botón "Comenzar clase / Tomar Asistencia".
  - Lista de alumnos con swiper o botones grandes de [Presente] / [Ausente].
  - Modal de confirmación al presionar "Cerrar Clase" indicando cantidad de ausentes automáticos.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Instancias de clases específicas por fecha
CREATE TABLE clases (
    id_clase SERIAL PRIMARY KEY,
    id_horario INT NOT NULL REFERENCES horarios(id_horario) ON DELETE RESTRICT,
    fecha_clase DATE NOT NULL,
    id_prof_dictante INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'DICTADA', 'CANCELADA')),
    fecha_cierre_asist TIMESTAMP NULL,
    observaciones TEXT NULL,
    UNIQUE(id_horario, fecha_clase)
);

-- Asistencia por alumno en cada clase
CREATE TABLE asistencias (
    id_clase INT NOT NULL REFERENCES clases(id_clase) ON DELETE CASCADE,
    id_alumno INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_inscripcion INT NOT NULL REFERENCES inscripciones(id_inscripcion) ON DELETE RESTRICT,
    asistio BOOLEAN NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_registra INT NOT NULL REFERENCES usuarios(id_usuario),
    observaciones TEXT NULL,
    PRIMARY KEY (id_clase, id_alumno)
);

CREATE INDEX idx_asistencias_alumno ON asistencias(id_alumno, fecha_registro);
CREATE INDEX idx_clases_fecha ON clases(fecha_clase, id_prof_dictante);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Clases (`/api/v1/clases`)

- `GET /api/v1/clases/hoy`: Devuelve las clases del día para la profesora autenticada (o todas si es Propietaria).
- `GET /api/v1/clases/:id/inscriptos`: Devuelve la lista de alumnos inscriptos en ese horario, su estado de asistencia actual y su estado de cuota (`AL_DIA`, `EN_GRACIA`, `VENCIDO`).
- `POST /api/v1/clases/:id/cerrar`: Cierra la clase y genera inasistencias automáticas.
- `POST /api/v1/clases/:id/reabrir`: Solo Propietaria.

### 3.2. Asistencias (`/api/v1/asistencias`)

- `POST /api/v1/asistencias`:
  - Body: `{ "id_clase": 15, "marcas": [ { "id_alumno": 1, "asistio": true }, { "id_alumno": 2, "asistio": false } ] }`

### 3.3. Detección de Inactivos (`/api/v1/asistencias/inactivos`)

- `GET /api/v1/asistencias/inactivos`: Devuelve lista de alumnos con $\ge 3$ faltas seguidas o sin asistencia en los últimos 14 días.

---

## 4. Consideraciones de Seguridad y Roles

- Una profesora solo puede registrar asistencia en clases donde ella sea la `id_prof_dictante` (o suplente asignada según US-24).
- Se prohíbe la alteración de registros de asistencia una vez cerrada la clase, evitando manipulaciones que impacten en la liquidación de honorarios.
