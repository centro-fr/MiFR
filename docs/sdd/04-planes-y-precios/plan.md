# Plan Técnico: Planes y Precios

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Modelado de precios mediante patrón **Temporal Table / SCD Tipo 2 (Slowly Changing Dimensions)**:
  - La tabla `planes` guarda datos estructurales inmutables.
  - La tabla `plan_precios` almacena tuplas `(id_plan, precio, fecha_vigencia_desde, fecha_vigencia_hasta)`.
  - La función `obtenerPrecioVigente(id_plan, fecha)` busca el registro donde `fecha_vigencia_desde <= fecha AND (fecha_vigencia_hasta IS NULL OR fecha_vigencia_hasta >= fecha)`.
- Algoritmo de cálculo de precio final:
  $$\text{PrecioFinal} = \max(0, \text{PrecioBase} - \text{Descuento}(\text{Promocion}))$$
- Transacciones para cambios de plan (cierre de inscripción previa, apertura de nueva inscripción, enlace de nuevos horarios).

### 1.2. Frontend

- Interfaz de catálogo en tarjetas comparativas tipo tabla de tarifas:
  - Frecuencia semanal, valor por mes, días de gracia, botón de "Actualizar Precio".
- Modal de actualización de precio: selector de fecha desde cuándo aplica el nuevo monto.
- Modal de gestión de promociones con simulador de cálculo para previsualizar el valor resultante.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Catálogo de Planes
CREATE TABLE planes (
    id_plan SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL DEFAULT 'MENSUAL' CHECK (tipo IN ('MENSUAL', 'CLASE_SUELTA')),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    clases_por_semana INT NULL, -- NULL indica pase libre
    dias_gracia INT NOT NULL DEFAULT 10,
    profesora_unica BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP NULL
);

-- Precios historizados con vigencia
CREATE TABLE plan_precios (
    id_plan_precio SERIAL PRIMARY KEY,
    id_plan INT NOT NULL REFERENCES planes(id_plan) ON DELETE CASCADE,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    fecha_vigencia_desde DATE NOT NULL,
    fecha_vigencia_hasta DATE NULL
);

-- Promociones y Descuentos
CREATE TABLE promociones (
    id_promocion SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('PORCENTAJE', 'MONTO_FIJO')),
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT check_fechas_promo CHECK (fecha_hasta >= fecha_desde)
);

-- Relación N:M Promoción con Planes aplicables
CREATE TABLE promocion_planes (
    id_promocion INT NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
    id_plan INT NOT NULL REFERENCES planes(id_plan) ON DELETE CASCADE,
    PRIMARY KEY (id_promocion, id_plan)
);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Planes (`/api/v1/planes`)

- `GET /api/v1/planes`: Devuelve planes activos con su precio actualmente vigente.
- `POST /api/v1/planes`: Crea un nuevo plan e inserta el precio inicial en `plan_precios`.
- `PUT /api/v1/planes/:id`: Actualiza descripción, nombre, días de gracia o condiciones.
- `POST /api/v1/planes/:id/precios`: Registra un nuevo precio a partir de una fecha de vigencia.
- `DELETE /api/v1/planes/:id`: Desactiva lógicamente el plan.

### 3.2. Promociones (`/api/v1/promociones`)

- `GET /api/v1/promociones`: Lista de promociones con filtro `?soloVigentes=true`.
- `POST /api/v1/promociones`: Alta de promoción asociando array de `planes_ids`.
- `PUT /api/v1/promociones/:id`: Edición o inactivación anticipada.

### 3.3. Cambios de Plan (`/api/v1/inscripciones/:id/cambio-plan`)

- `POST /api/v1/inscripciones/:id/cambio-plan`:
  - Body: `{ "nuevo_id_plan": 3, "nuevos_horarios_ids": [4, 8], "fecha_inicio": "2026-10-01" }`

---

## 4. Consideraciones de Seguridad y Roles

- Las operaciones de creación y cambio de precios requieren permiso `planes.precios.gestionar` (restringido a `PROPIETARIA`).
- El cálculo de cuotas toma siempre el `id_plan_precio` histórico guardado en la inscripción o cuota, imposibilitando discrepancias retroactivas en auditorías contables.
