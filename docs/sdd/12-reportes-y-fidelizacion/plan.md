# Plan Técnico: Reportes y Fidelización

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend
- Servicio Analítico (`ReportesService`):
  - Consultas SQL analíticas optimizadas utilizando funciones de agregación (`COUNT`, `SUM`, `AVG`, `FILTER (WHERE ...)`).
  - Exportador Documental unificado (`ExportService`): Generación de planillas Excel (`exceljs`) y documentos PDF (`pdfmake` o `puppeteer-core`/`pdfkit`) con cabecera y membrete de MiFR.
- Seguridad y Roles:
  - Endpoints analíticos protegidos con `requirePermission('reportes.ver_todos')` (reservado a `PROPIETARIA`).

### 1.2. Frontend
- Módulo de Reportes `/admin/reportes` organizado por pestañas:
  1. **Asistencia**: Filtros de fecha, alumno, profesora; tabla con porcentajes y exportación.
  2. **Cobranzas y Morosidad**: Listado de cuotas impagas con semáforo de antigüedad y total adeudado.
  3. **Estadísticas de Planes e Inscripciones**: Gráficos de barras temporales y pastel (Chart.js / Recharts).
  4. **Mapa de Calor de Horarios (Heatmap)**: Componente SVG o grilla CSS interactiva con escala de gradiente continuo (`interpolateHsl` o clases Tailwind/CSS personalizadas).

---

## 2. Consultas Analíticas Principales (SQL)

```sql
-- 1. Agregación de Asistencia
SELECT 
    COUNT(a.asistio) AS total_registros,
    COUNT(a.asistio) FILTER (WHERE a.asistio = TRUE) AS total_presentes,
    COUNT(a.asistio) FILTER (WHERE a.asistio = FALSE) AS total_ausentes,
    ROUND((COUNT(a.asistio) FILTER (WHERE a.asistio = TRUE)::NUMERIC / NULLIF(COUNT(a.asistio), 0)) * 100, 2) AS porcentaje_asistencia
FROM asistencias a
JOIN clases c ON a.id_clase = c.id_clase
WHERE c.fecha_clase BETWEEN :fechaDesde AND :fechaHasta;

-- 2. Reporte de Cuotas Vencidas
SELECT 
    c.id_cuota,
    u.nombre,
    u.apellido,
    u.telefono,
    p.nombre AS plan_nombre,
    c.fecha_vencimiento,
    c.monto,
    CURRENT_DATE - c.fecha_vencimiento AS dias_mora
FROM cuotas c
JOIN inscripciones i ON c.id_inscripcion = i.id_inscripcion
JOIN alumnos al ON i.id_alumno = al.id_alumno
JOIN usuarios u ON al.id_usuario = u.id_usuario
JOIN planes p ON i.id_plan = p.id_plan
WHERE c.estado_cuota = 'PENDIENTE' 
  AND c.fecha_vencimiento + INTERVAL '1 day' * p.dias_gracia < CURRENT_DATE
ORDER BY c.fecha_vencimiento ASC;

-- 3. Mapa de Calor (Ocupación Horaria)
SELECT 
    h.id_horario,
    h.dia_semana,
    h.hora_inicio,
    h.hora_fin,
    act.nombre AS actividad,
    COALESCE(h.cupo_maximo, act.cupo_maximo, 15) AS cupo_referencia,
    COUNT(ih.id_inscripcion) AS total_inscriptos,
    ROUND((COUNT(ih.id_inscripcion)::NUMERIC / COALESCE(h.cupo_maximo, act.cupo_maximo, 15)) * 100, 1) AS porcentaje_ocupacion
FROM horarios h
JOIN actividades act ON h.id_actividad = act.id_actividad
LEFT JOIN inscripcion_horarios ih ON h.id_horario = ih.id_horario
LEFT JOIN inscripciones i ON ih.id_inscripcion = i.id_inscripcion AND i.estado = 'ACTIVA'
WHERE h.fecha_baja IS NULL
GROUP BY h.id_horario, act.id_actividad;
```

---

## 3. Endpoints y Contratos de API

### 3.1. Reportes Operativos (`/api/v1/reportes`)
- `GET /api/v1/reportes/asistencia?desde=&hasta=&id_profesora=&id_alumno=`: Datos para tabla y métricas consolidadas.
- `GET /api/v1/reportes/cuotas-vencidas`: Nómina de morosos y total de deuda exigible.
- `GET /api/v1/reportes/inscriptos-por-mes?anio=2026`: Altas mensuales agrupadas.
- `GET /api/v1/reportes/planes-populares`: Ranking y porcentaje de elección de planes.
- `GET /api/v1/reportes/mapa-calor`: Matriz horaria con porcentaje de ocupación y cupos.
- `GET /api/v1/reportes/exportar?tipo=asistencia|cuotas-vencidas&formato=pdf|xlsx`: Descarga directa de archivos.

---

## 4. Consideraciones de Seguridad y Roles
- Todos los endpoints de analítica y reportes exigen el rol `PROPIETARIA`.
- Las exportaciones a PDF y Excel aplican los mismos filtros de seguridad para evitar fuga de información sensible.
