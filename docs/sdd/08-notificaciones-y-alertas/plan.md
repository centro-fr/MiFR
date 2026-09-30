# Plan Técnico: Notificaciones y Alertas

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend y Tareas Programadas

- **Motor de Jobs**: Tareas programadas ejecutadas con `node-cron` o servicio de cron ligero integrado:
  - Job 1: `notificaciones-cuotas-vencimiento`: Se ejecuta diariamente a las 09:00 AM.
  - Job 2: `resumen-diario-propietaria`: Se ejecuta diariamente a las 08:00 AM.
- **Canal de Correo Electrónico**:
  - Servicio `MailService` utilizando `nodemailer` con templates compilados (ej. Handlebars o templates de strings limpios).
- **Canal In-App**:
  - Registros en la tabla `notificaciones` consultables vía API REST.
- **Idempotencia y Anti-Spam**:
  - Constraint o clave compuesta `(id_usuario, tipo, id_cuota, DATE(fecha_generacion))` para evitar envíos duplicados en un mismo día.

### 1.2. Frontend

- Campanita de notificaciones en el Navbar para todos los usuarios logueados:
  - Contador de no leídas (`unreadCount`).
  - Dropdown desplegable con lista de notificaciones recientes y botón "Marcar como leída".
- Widget de "Resumen Diario" en el Dashboard de la Propietaria.

---

## 2. Modelo de Datos (DER MiFR)

```sql
CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('CUOTA_POR_VENCER', 'CUOTA_VENCIDA', 'TRANSFERENCIA_RECHAZADA', 'RESUMEN_DIARIO', 'BIENVENIDA')),
    id_cuota INT NULL REFERENCES cuotas(id_cuota) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'IN_APP' CHECK (canal IN ('IN_APP', 'EMAIL', 'WHATSAPP')),
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP NULL,
    estado_envio VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_envio IN ('PENDIENTE', 'ENVIADA', 'ERROR')),
    leida BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(id_usuario, leida);
CREATE INDEX idx_notificaciones_pendientes ON notificaciones(estado_envio) WHERE estado_envio = 'PENDIENTE';
```

---

## 3. Endpoints y Contratos de API

### 3.1. Notificaciones de Usuario (`/api/v1/notificaciones`)

- `GET /api/v1/notificaciones`: Lista las notificaciones del usuario logueado (`?soloNoLeidas=true`).
- `PUT /api/v1/notificaciones/:id/leida`: Marca una notificación como leída.
- `PUT /api/v1/notificaciones/marcar-todas-leidas`: Marca todas como leídas.

### 3.2. Resumen Diario de la Propietaria (`/api/v1/notificaciones/resumen-diario`)

- `GET /api/v1/notificaciones/resumen-diario`: Devuelve las métricas en tiempo real del día:

  ```json
  {
    "transferencias_pendientes": { "cantidad": 4, "total_monto": 95000 },
    "efectivo_sin_rendir": { "total_monto": 42000, "profesoras_con_saldo": 2 },
    "cuotas_vencidas": { "cantidad_alumnos": 7, "total_deuda": 160000 }
  }
  ```

---

## 4. Consideraciones de Seguridad y Roles

- Las notificaciones son privadas e intransferibles: cada usuario solo puede ver las que tienen asignado su `id_usuario`.
- El endpoint del resumen diario requiere permiso `seguridad.resumen_diario.ver`, restringido a la `PROPIETARIA`.
