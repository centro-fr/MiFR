# Plan Técnico: Configuración Base

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Módulo `actividades` y `horarios` estructurado con arquitectura en capas (Controlador -> Servicio -> Repositorio).
- **Validación de Solapamiento Horario**: Algoritmo ejecutado en el `HorarioService` antes de cualquier inserción o actualización:
  $$\text{Existe solapamiento si: } \text{dia\_semana} = D \land \text{id\_profesora} = P \land (\text{nueva\_inicio} < \text{existente\_fin}) \land (\text{nueva\_fin} > \text{existente\_inicio}) \land \text{id\_horario} \neq \text{actual}$$
- **Soft Deletes**: Inclusión de flags `activo` y marcas temporales `fecha_baja` para actividades y horarios.
- **Protección de Rutas**: Endpoints protegidos con `requirePermission('configuracion.actividades.gestionar')` y `requirePermission('configuracion.horarios.gestionar')`.

### 1.2. Frontend

- Interfaz gráfica en React con selector de vista:
  - **Grilla Semanal (Desktop)**: Calendario de columnas (Lunes a Domingo) con bloques horarios posicionados por hora, código de colores por disciplina y avatar de la profesora.
  - **Lista Agrupada (Mobile)**: Acordeón o pestañas por día de la semana.
- Formulario de alta/edición con lógica reactiva: al seleccionar `tipo = 'PERSONALIZADA'`, el input `cupo_maximo` pasa automáticamente a requerido con validación zod/yup.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Catálogo de Actividades
CREATE TABLE actividades (
    id_actividad SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'GRUPAL' CHECK (tipo IN ('GRUPAL', 'PERSONALIZADA')),
    cupo_maximo INT NULL, -- Obligatorio en lógica si tipo = 'PERSONALIZADA'
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP NULL
);

-- Cronograma de Horarios Semanales
CREATE TABLE horarios (
    id_horario SERIAL PRIMARY KEY,
    id_actividad INT NOT NULL REFERENCES actividades(id_actividad) ON DELETE RESTRICT,
    id_profesora INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    dia_semana VARCHAR(15) NOT NULL CHECK (dia_semana IN ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_maximo INT NULL, -- Si es null, hereda de actividades.cupo_maximo
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP NULL,
    CONSTRAINT check_horario_valido CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_horarios_profesora_dia ON horarios(id_profesora, dia_semana) WHERE fecha_baja IS NULL;
CREATE INDEX idx_horarios_actividad ON horarios(id_actividad) WHERE fecha_baja IS NULL;
```

---

## 3. Endpoints y Contratos de API

### 3.1. Actividades (`/api/v1/actividades`)

- `GET /api/v1/actividades`: Retorna lista de actividades (permite query params `?soloActivas=true&tipo=GRUPAL`).
- `POST /api/v1/actividades`: Crea una actividad.
  - Body: `{ "codigo": "PILATES", "nombre": "Pilates Reformer", "tipo": "PERSONALIZADA", "cupo_maximo": 4, "descripcion": "..." }`
- `PUT /api/v1/actividades/:id`: Actualiza una actividad.
- `DELETE /api/v1/actividades/:id`: Baja lógica (`activo = false, fecha_baja = NOW()`). Valida que no tenga horarios vigentes con inscriptos.

### 3.2. Horarios y Cronograma (`/api/v1/horarios`)

- `GET /api/v1/horarios`: Retorna grilla horaria con detalle poblado de actividad y profesora (`?id_actividad=&id_profesora=&dia=`).
- `POST /api/v1/horarios`: Registra un nuevo bloque horario.
  - Body: `{ "id_actividad": 1, "id_profesora": 3, "dia_semana": "LUNES", "hora_inicio": "18:00", "hora_fin": "19:00", "cupo_maximo": null }`
  - Validaciones: `400 Bad Request` si se solapa con otro horario de la profesora o si hora_fin <= hora_inicio.
- `PUT /api/v1/horarios/:id`: Modifica un horario existente.
- `DELETE /api/v1/horarios/:id`: Desactiva un horario marcando `fecha_baja`.

---

## 4. Flujos Principales

### 4.1. Creación de Horario con Detección de Solapamiento

```text
[Propietaria]               [Frontend]                     [Backend API]                    [Base de Datos]
     |                          |                                |                                 |
     |--- 1. Define horario --->|                                |                                 |
     |    (Día, Horas, Prof)    |--- 2. POST /api/v1/horarios -->|                                 |
     |                          |                                |-- 3. Verifica rol 'PROFESORA'   |
     |                          |                                |-- 4. Query solapamientos ------>|
     |                          |                                |<-- 5. Horarios existentes ------|
     |                          |                                |-- 6. ¿Hay colisión temporal?   |
     |                          |                                |    [SÍ] -> 409 Conflict         |
     |                          |                                |    [NO] -> INSERT horario ----->|
     |                          |<-- 7. 201 Created -------------|                                 |
     |<-- 8. Actualiza grilla --|                                |                                 |
```

---

## 5. Consideraciones de Seguridad y Roles

- Las operaciones de escritura (`POST`, `PUT`, `DELETE`) sobre actividades y horarios están reservadas a la `PROPIETARIA`.
- Las `PROFESORAS` solo disponen de permisos de lectura para consultar su agenda personal.
- La validación de que `id_profesora` pertenezca a un registro activo en la tabla `profesoras` es obligatoria a nivel de base de datos y regla de servicio.
