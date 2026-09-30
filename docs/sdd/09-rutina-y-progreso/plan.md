# Plan Técnico: Rutina y Progreso

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Módulos `rutinas` y `progreso`:
  - Almacenamiento estructurado del contenido de la rutina: formato JSONB o texto enriquecido estructurado (`{ dias: [ { dia: "Día 1 - Tren Superior", ejercicios: [ { nombre: "Press Banca", series: 4, repeticiones: "10-12", carga: "20kg", descanso: "90s" } ] } ] }`).
- Normalización de medidas antropométricas:
  - Catálogo `tipos_medida` para dinamismo (permite agregar nuevas medidas sin alterar la estructura de tablas).
  - Tabla relacional `medidas_corporales` vinculada a cada cabecera de `registros_progreso`.
- Control de Autorización:
  - `rutinas.gestionar`: Profesora (sobre sus alumnos a cargo) y Propietaria.
  - `rutinas.ver_propias`: Alumno y Tutor responsable.

### 1.2. Frontend

- Editor de Rutinas para Profesoras:
  - Constructor dinámico de bloques de entrenamiento por día y ejercicio.
- Portal del Alumno / Vista de Progreso:
  - Tarjeta de "Mi Rutina de Hoy" con checkboxes de ejercicios completados para gamificación personal.
  - Gráficos interactivos de líneas (Chart.js / Recharts) para representar evolución de peso y medidas a lo largo de las fechas.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Rutinas de entrenamiento
CREATE TABLE rutinas (
    id_rutina SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_profesora INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE NULL,
    contenido JSONB NOT NULL, -- Bloques de entrenamiento, series, repeticiones
    observaciones TEXT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cabecera de sesión de medición y evolución
CREATE TABLE registros_progreso (
    id_registro SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_profesora INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT NULL
);

-- Catálogo de medidas corporales
CREATE TABLE tipos_medida (
    id_tipo_medida SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL, -- 'PESO', 'ALTURA', 'CINTURA', 'CADERA', etc.
    nombre VARCHAR(50) NOT NULL,
    unidad VARCHAR(10) NOT NULL -- 'kg', 'cm', '%'
);

-- Valores individuales de medidas por sesión
CREATE TABLE medidas_corporales (
    id_registro INT NOT NULL REFERENCES registros_progreso(id_registro) ON DELETE CASCADE,
    id_tipo_medida INT NOT NULL REFERENCES tipos_medida(id_tipo_medida) ON DELETE RESTRICT,
    valor NUMERIC(6,2) NOT NULL CHECK (valor > 0),
    PRIMARY KEY (id_registro, id_tipo_medida)
);

CREATE INDEX idx_rutinas_alumno ON rutinas(id_alumno, activa);
CREATE INDEX idx_progreso_alumno ON registros_progreso(id_alumno, fecha);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Rutinas (`/api/v1/rutinas`)

- `GET /api/v1/rutinas/alumno/:idAlumno`: Lista las rutinas de un alumno (la activa primero).
- `POST /api/v1/rutinas`:
  - Body:

    ```json
    {
      "id_alumno": 4,
      "nombre": "Fuerza e Hipertrofia",
      "fecha_desde": "2026-10-01",
      "contenido": { "bloques": [...] },
      "observaciones": "Priorizar técnica en sentadillas"
    }
    ```

- `PUT /api/v1/rutinas/:id`: Modifica la rutina activa.

### 3.2. Progreso y Mediciones (`/api/v1/progreso`)

- `GET /api/v1/progreso/alumno/:idAlumno`: Devuelve historial de registros con valores de medidas corporales asociados.
- `POST /api/v1/progreso`:
  - Body:

    ```json
    {
      "id_alumno": 4,
      "fecha": "2026-10-05",
      "observaciones": "Buen progreso en control lumbar",
      "medidas": [
        { "codigo_medida": "PESO", "valor": 68.5 },
        { "codigo_medida": "CINTURA", "valor": 74.0 }
      ]
    }
    ```

---

## 4. Consideraciones de Seguridad y Roles

- Inyección contextual de ID: cuando un alumno consulta `/api/v1/rutinas/mi-rutina`, el backend extrae el `id_alumno` del token de sesión garantizando que jamás pueda consultar rutinas ajenas.
- Los tutores tienen acceso autorizado sobre los registros de sus alumnos asociados mediante validación de `id_usuario_responsable`.
