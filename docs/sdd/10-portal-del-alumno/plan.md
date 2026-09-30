# Plan Técnico: Portal del Alumno

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Agregación y Métricas de Gamificación:
  - Servicio `GamificacionService`: Tras el evento `ClaseCerradaEvent`, evalúa si los alumnos presentes cumplen condiciones de insignias configuradas en `insignias.criterio`.
  - Motor de consulta de ranking con agregación SQL (`COUNT(a.asistio) WHERE a.asistio = TRUE GROUP BY a.id_alumno`).
- Selector de Contexto para Tutores:
  - Si un usuario tiene rol `TUTOR`, el endpoint `/portal/resumen` admite query parameter opcional `?id_alumno=X`, validando previamente que el tutor sea `id_usuario_responsable` del alumno solicitado.

### 1.2. Frontend

- Single Page Application responsive optimizada para móviles (PWA ready):
  - Dashboard del Alumno:
    - Tarjeta de Membresía con indicador de semáforo de cuota.
    - Próxima clase con contador regresivo ("Hoy a las 18:00hs").
    - Widget de Racha de entrenamiento actual (🔥 *Racha activa: 4 clases*).
  - Pestaña de Ranking:
    - Podio visual (Top 1, 2 y 3 con coronas/medallas) y lista scrolleable del resto del centro.
  - Galería de Insignias:
    - Cuadrícula de insignias con medallas doradas desbloqueadas y siluetas en gris para las pendientes con barra de progreso.

---

## 2. Modelo de Datos (DER MiFR)

```sql
-- Catálogo de Insignias de Gamificación
CREATE TABLE insignias (
    id_insignia SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL, -- 'PRIMER_PASO', 'RACHA_5', 'RACHA_10', 'MES_PERFECTO'
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    icono_url VARCHAR(255) NULL,
    criterio VARCHAR(50) NOT NULL -- 'ASISTENCIA_1', 'RACHA_CONSECUTIVA_10', etc.
);

-- Insignias obtenidas por alumno
CREATE TABLE alumno_insignias (
    id_alumno INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_insignia INT NOT NULL REFERENCES insignias(id_insignia) ON DELETE CASCADE,
    fecha_obtencion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_alumno, id_insignia)
);

CREATE INDEX idx_alumno_insignias ON alumno_insignias(id_alumno);
```

---

## 3. Endpoints y Contratos de API

### 3.1. Portal del Alumno (`/api/v1/portal`)

- `GET /api/v1/portal/resumen`: Devuelve datos consolidados del alumno autenticado (plan, cuota actual, próximas clases de la semana, racha actual e insignias recientes).
- `GET /api/v1/portal/asistencias`: Historial de clases asistidas y faltas justificadas/injustificadas.
- `GET /api/v1/portal/ranking?mes=2026-09`: Tabla de posiciones de asistencia con nombres anonimizados (`"Laura G."`).
- `GET /api/v1/portal/insignias`: Galería completa de insignias indicando cuáles fueron obtenidas y la fecha de desbloqueo.

---

## 4. Consideraciones de Seguridad y Roles

- Solo usuarios con rol `ALUMNO` o `TUTOR` (y Propietaria en modo supervisión) pueden acceder a los endpoints del portal.
- Privacidad en el Ranking: En cumplimiento de protección de datos personales, no se exponen correos, teléfonos ni apellidos completos en la tabla pública de posiciones.
