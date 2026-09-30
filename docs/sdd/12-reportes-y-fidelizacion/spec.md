# Especificación Funcional: Reportes y Fidelización

## 1. Origen

Esta especificación consolida las User Stories de la épica **Reportes y Fidelización**:

- **US-33**: Informe de asistencia (`docs/specs/12-reportes-y-fidelizacion/US-33-informe-asistencia.md`)
- **US-34**: Informe de cuotas vencidas (`docs/specs/12-reportes-y-fidelizacion/US-34-informe-cuotas-vencidas.md`)
- **US-35**: Estadísticas de inscriptos por mes (`docs/specs/12-reportes-y-fidelizacion/US-35-estadisticas-inscriptos-por-mes.md`)
- **US-36**: Estadísticas de planes más elegidos (`docs/specs/12-reportes-y-fidelizacion/US-36-estadisticas-planes-mas-elegidos.md`)
- **US-37**: Mapa de calor de ocupación de horarios (`docs/specs/12-reportes-y-fidelizacion/US-37-mapa-calor-ocupacion-horarios.md`)

---

## 2. Objetivo

Dotar a la Propietaria de un módulo de Business Intelligence (BI) y analítica avanzada para la toma de decisiones estratégicas, financieras y operativas en MiFR: generar reportes exhaustivos de asistencia y morosidad de cuotas, analizar la evolución histórica de inscripciones y popularidad de planes comerciales, y optimizar el cronograma mediante un mapa de calor que identifique franjas horarias saturadas y de baja demanda.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Acceso exclusivo a todos los reportes operativos, financieros y analíticos del centro, con facultades de filtrado multidimensional y exportación documental. |
| **Profesora** | (Restringido) Puede acceder a reportes básicos de asistencia exclusivamente correspondientes a sus propias clases dictadas. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Informe de Asistencia y Presentismo (US-33)

- Generar reporte con métricas consolidadas: total de clases dictadas, presentes, ausentes y tasa porcentual de asistencia general ($\frac{\text{Presentes}}{\text{TotalEsperados}} \times 100$).
- Filtros multidimensionales: rango de fechas (`desde`, `hasta`), alumno específico, profesora dictante y actividad.
- Desglose tabular por alumno y por profesora, con exportación a PDF y Excel.

#### RF-02: Informe de Cuotas Vencidas y Cobranza Pendiente (US-34)

- Identificar todas las cuotas en mora (cuyo vencimiento $+ \text{días de gracia} < \text{FechaActual}$ y no registren pago confirmado).
- Desglose por alumno, teléfono de contacto, plan, monto original adeudado y días de retraso.
- Sumatoria total de capital pendiente de cobro y exportación de nómina de mora a PDF/Excel para gestión de recupero.

#### RF-03: Analítica de Nuevas Inscripciones por Mes (US-35)

- Gráfico de barras temporales que ilustra la cantidad de altas y pre-inscripciones confirmadas mes a mes a lo largo del año.
- Comparativa intermensual para detectar estacionalidad (ej: alta demanda en primavera/verano, bajas en receso invernal).

#### RF-04: Distribución de Planes más Elegidos (US-36)

- Gráfico circular o de barras horizontales mostrando la cuota de mercado de cada plan sobre la masa activa de alumnos.
- Indicadores de ingresos generados por tipo de plan para evaluar rentabilidad de la oferta.

#### RF-05: Mapa de Calor de Ocupación Horaria (Heatmap) (US-37)

- Matriz interactiva de 7 columnas (Lunes a Domingo) por franjas horarias (de 07:00 a 22:00 hs).
- Gradiente de color proporcional a la tasa de ocupación:
  $$\text{Ocupación}(\%) = \frac{\text{AlumnosInscriptos}}{\text{CupoMáximo}} \times 100$$
  - Verde claro: 0% - 40% (Baja ocupación / Horario disponible).
  - Naranja: 41% - 85% (Ocupación media/óptima).
  - Rojo intenso: 86% - 100% (Horario pico saturado).
- Al hacer clic en una celda, se despliega el popover con actividad, profesora asignada y detalle de inscriptos.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Optimización de consultas analíticas pesadas (uso de agregaciones SQL eficientes, índices en fechas y precomputación si el volumen supera 100.000 asistencias).
- **RNF-02**: Visualizaciones gráficas interactivas, responsivas y accesibles en desktop y tablets.

---

## 5. Criterios de Aceptación

- **CA-01 (Informe de asistencia filtrado)**: La Propietaria filtra por el mes de septiembre y profesora "Camila"; se muestran únicamente las clases y asistencias de dicha profesora con el porcentaje exacto.
- **CA-02 (Informe de morosidad)**: Se listan con exactitud las cuotas vencidas y el importe total coincide con el balance real de deuda.
- **CA-03 (Gráficos estadísticos)**: Los gráficos de inscriptos y distribución de planes reflejan fielmente los registros de la base de datos.
- **CA-04 (Mapa de calor interactivo)**: La grilla colorea en rojo los horarios al 100% de ocupación y en verde las franjas con vacantes amplias.

---

## 6. Casos Borde y Errores

- Horarios de actividades grupales sin cupo máximo fijo: el mapa de calor calcula la ocupación en base a un aforo de referencia configurado en el centro.
- Período sin datos de asistencia: el reporte muestra "Sin registros en el rango seleccionado" en lugar de errores de división por cero.

---

## 7. Fuera de Alcance

- Proyecciones financieras con algoritmos predictivos de Machine Learning en esta versión.
