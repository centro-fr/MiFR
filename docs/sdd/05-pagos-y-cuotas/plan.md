# Plan Técnico: Pagos y Cuotas

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Módulo `pagos` y `cuotas` con transacciones de base de datos aisladas.
- **Motor de Estados**:
  - Función de servicio pura `calcularEstadoHabilitacion(alumno, fecha)` que evalúa la última cuota generada, su fecha de vencimiento y los días de gracia del plan.
- **Manejo de Archivos Adjuntos**:
  - Subida de comprobantes con `multer`, validación de magic bytes (MIME type real) y guardado en directorio protegido con serving autenticado o URL firmada.
- **Middlewares de Permisos**:
  - `pagos.cobrar_efectivo`: Propietaria y Profesora.
  - `pagos.transferencia.subir`: Propietaria, Profesora y Alumno.
  - `pagos.transferencia.aprobar`: Exclusivo `PROPIETARIA`.
  - `pagos.rendiciones.gestionar`: Exclusivo `PROPIETARIA`.

### 1.2. Frontend

- Modal de Cobro Rápido accesible desde la ficha del alumno o la lista de asistencia.
- Panel de Aprobación de Transferencias con visualizador de comprobantes (zoom, rotación y previsualización de PDF/imagen en lightbox).
- Pantalla de Rendición de Efectivo agrupada por profesora con totales acumulados y checkboxes de selección múltiple.
- Indicador visual tipo semáforo de estado de cuenta en tarjetas y tablas de alumnos:
  - 🟢 Verde: `Al Día`
  - 🟡 Amarillo: `En Período de Gracia`
  - 🔴 Rojo: `Vencido / Inhabilitado`

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Cuotas generadas por inscripción
CREATE TABLE cuotas (
    id_cuota SERIAL PRIMARY KEY,
    id_inscripcion INT NOT NULL REFERENCES inscripciones(id_inscripcion) ON DELETE RESTRICT,
    numero_cuota INT NOT NULL, -- Cuota 1, 2, 3... o YYYYMM
    fecha_generacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    estado_cuota VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_cuota IN ('PENDIENTE', 'PAGADA', 'ANULADA')),
    UNIQUE(id_inscripcion, numero_cuota)
);

-- Pagos asociados a cuotas
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_cuota INT NOT NULL REFERENCES cuotas(id_cuota) ON DELETE RESTRICT,
    forma_pago VARCHAR(20) NOT NULL CHECK (forma_pago IN ('EFECTIVO', 'TRANSFERENCIA')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO')),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    comprobante_url VARCHAR(255) NULL,
    id_usuario_registra INT NOT NULL REFERENCES usuarios(id_usuario),
    id_profesora_cobra INT NULL REFERENCES profesoras(id_profesora),
    rendido BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_rendicion TIMESTAMP NULL,
    id_usuario_confirma INT NULL REFERENCES usuarios(id_usuario),
    fecha_confirmacion TIMESTAMP NULL,
    motivo_rechazo TEXT NULL,
    observaciones TEXT NULL
);

CREATE INDEX idx_cuotas_vencimiento ON cuotas(fecha_vencimiento, estado_cuota);
CREATE INDEX idx_pagos_rendicion ON pagos(id_profesora_cobra, rendido) WHERE forma_pago = 'EFECTIVO';
```

---

## 3. Endpoints y Contratos de API

### 3.1. Cuotas (`/api/v1/cuotas`)

- `GET /api/v1/cuotas`: Consulta de cuotas por alumno o por rango de vencimiento.
- `GET /api/v1/alumnos/:id/estado-habilitacion`: Devuelve `{ "estado": "EN_GRACIA", "dias_restantes": 3, "fecha_vencimiento": "2026-09-15" }`.

### 3.2. Pagos (`/api/v1/pagos`)

- `POST /api/v1/pagos/efectivo`:
  - Body: `{ "id_cuota": 10, "monto": 25000, "id_profesora_cobra": 2, "observaciones": "Cobro clase 18hs" }`
- `POST /api/v1/pagos/transferencia`: Multipart form-data con `id_cuota`, `monto`, `fecha_transferencia` y archivo `comprobante`.
- `GET /api/v1/pagos/transferencias/pendientes`: Lista transferencias para revisión de la Propietaria.
- `POST /api/v1/pagos/:id/aprobar`: Aprueba la transferencia y marca cuota como `PAGADA`.
- `POST /api/v1/pagos/:id/rechazar`: `{ "motivo": "Comprobante ilegible / importe no acreditado" }`.

### 3.3. Rendiciones (`/api/v1/rendiciones`)

- `GET /api/v1/rendiciones/pendientes`: Agrupado por profesora con suma de efectivo no rendido.
- `POST /api/v1/rendiciones/confirmar`:
  - Body: `{ "id_profesora": 2, "pagos_ids": [12, 13, 14] }`

---

## 4. Consideraciones de Seguridad y Roles

- Las transferencias bancarias **solo** pueden ser aprobadas por usuarios con rol `PROPIETARIA`.
- Las profesoras no pueden ver la recaudación total del centro ni liquidaciones ajenas; solo acceden a sus cobros propios y su efectivo pendiente de rendir.
- Los comprobantes subidos se sirven bajo validación de sesión (no accesibles como archivos estáticos públicos sin token).
