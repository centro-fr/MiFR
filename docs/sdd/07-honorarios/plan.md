# Plan Técnico: Honorarios

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Servicio de Liquidaciones (`LiquidacionService`):
  - Ejecuta el cálculo por profesora sobre el rango de fechas `[periodo_desde, periodo_hasta]`: suma los **pagos confirmados** dentro del período de las inscripciones a su cargo (activas, o dadas de baja que hayan cobrado; se excluyen preinscripciones e inscripciones sin cargo) y aplica el **50 %**. No hay mínimo de alumnos.
  - Fórmula: `HonorarioBase(P) = PORCENTAJE_HONORARIOS × Σ pagos confirmados en el mes de las inscripciones de P`. Ejemplo: ingresos por $200.000 → honorario base de $100.000.
  - Cada inscripción genera una línea `ALUMNO_A_CARGO` con el monto cobrado de ese alumno en el mes y su 50 %, de modo que el detalle sea auditable.
  - El porcentaje se guarda como parámetro del sistema (`PORCENTAJE_HONORARIOS`, 50 por defecto), configurable por la Propietaria.
  - Cruza con la tabla `suplencias` para generar ítems de crédito y débito, que se aplican sobre el honorario base.
  - Guarda el resultado en `liquidaciones` y `liquidacion_detalles` en estado `BORRADOR` permitiendo ajustes manuales antes de pasar a `CERRADA`.
- Generación de Reportes:
  - Generación de PDF en backend utilizando librerías como `pdfkit` o exportación estructurada a formato `xlsx`.
- Restricción de Roles:
  - Endpoint de consulta global protegido con `requirePermission('honorarios.ver_todos')`.
  - Endpoint de consulta personal `/profesora/mis-honorarios` protegido con `requirePermission('honorarios.ver_propios')`, inyectando automáticamente el `id_profesora` del token de sesión.

### 1.2. Frontend

- Pantalla para la Propietaria (`/admin/honorarios`):
  - Selector de mes/año (date picker mensual).
  - Tarjetas de resumen (Total liquidado, Cantidad de profesoras, Total suplencias).
  - Tabla expandible (acordeón) por profesora con desglose de alumnos a cargo (con el monto cobrado de cada uno), clases suplidas y descuentos.
  - Botón de exportar a PDF y Excel.
- Formulario de Registro de Suplencias:
  - Selección de clase del calendario, selección de profesora ausente y selección de reemplazante de la nómina de profesoras activas.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Suplencias entre profesoras
CREATE TABLE suplencias (
    id_clase INT PRIMARY KEY REFERENCES clases(id_clase) ON DELETE RESTRICT,
    id_prof_ausente INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    motivo TEXT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_registra INT NOT NULL REFERENCES usuarios(id_usuario),
    CONSTRAINT check_profesoras_distintas CHECK (id_prof_ausente <> (SELECT id_prof_dictante FROM clases WHERE id_clase = suplencias.id_clase))
);

-- Cabecera de Liquidación Mensual
CREATE TABLE liquidaciones (
    id_liquidacion SERIAL PRIMARY KEY,
    id_profesora INT NOT NULL REFERENCES profesoras(id_profesora) ON DELETE RESTRICT,
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    fecha_liquidacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'CERRADA', 'PAGADA')),
    UNIQUE(id_profesora, periodo_desde, periodo_hasta)
);

-- Detalle de conceptos de la liquidación
CREATE TABLE liquidacion_detalles (
    id_liq_detalle SERIAL PRIMARY KEY,
    id_liquidacion INT NOT NULL REFERENCES liquidaciones(id_liquidacion) ON DELETE CASCADE,
    concepto VARCHAR(30) NOT NULL CHECK (concepto IN ('ALUMNO_A_CARGO', 'CLASE_SUPLIDA', 'DESCUENTO_AUSENCIA', 'AJUSTE_MANUAL')),
    id_inscripcion INT NULL REFERENCES inscripciones(id_inscripcion),
    id_clase INT NULL REFERENCES clases(id_clase),
    monto NUMERIC(10,2) NOT NULL
);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Liquidaciones (`/api/v1/honorarios`)

- `GET /api/v1/honorarios/informe?mes=2026-09`: Devuelve la liquidación consolidada para la Propietaria.
- `GET /api/v1/honorarios/mis-liquidaciones`: Devuelve únicamente las liquidaciones de la profesora autenticada.
- `POST /api/v1/honorarios/liquidar`: Dispara el cálculo automático para el mes indicado.
- `POST /api/v1/honorarios/:id/cerrar`: Pasa la liquidación a estado `CERRADA`.
- `GET /api/v1/honorarios/exportar?mes=2026-09&formato=pdf|xlsx`: Descarga el archivo de liquidación.

### 3.2. Suplencias (`/api/v1/suplencias`)

- `GET /api/v1/suplencias`: Lista suplencias por rango de fecha.
- `POST /api/v1/suplencias`: Registra una suplencia vinculada a una clase.
  - Body: `{ "id_clase": 20, "id_prof_ausente": 3, "motivo": "Certificado médico" }`

---

## 4. Consideraciones de Seguridad y Roles

- Solo usuarios con rol `PROPIETARIA` pueden acceder al informe global.
- El endpoint individual de la profesora valida a nivel de SQL `WHERE id_profesora = req.user.id_profesora`, impidiendo parameter tampering.