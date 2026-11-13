# Tareas de Implementación: Reportes y Fidelización

Tareas técnicas, secuenciales y verificables para la épica **Reportes y Fidelización** (US-33 a US-37).

---

## Fase 1: Backend – Consultas Analíticas y Exportadores

- [x] **1.1. Servicio de Reportes de Asistencia y Cobranzas (US-33 y US-34)**
  - Implementar consultas SQL parametrizadas para asistencia general filtrable.
  - Implementar consulta de cuotas vencidas computando días de mora reales.
  - *Criterio de verificación*: Test unitario que valide que cuotas dentro de los días de gracia no aparezcan en mora.

- [x] **1.2. Servicio de Estadísticas y Heatmap de Horarios (US-35, US-36 y US-37)**
  - Implementar agregaciones por mes de nuevas inscripciones.
  - Implementar distribución de planes activos.
  - Implementar cálculo de tasa de ocupación por bloque horario.
  - *Criterio de verificación*: Test que compruebe que el porcentaje de ocupación se calcula con precisión.

- [ ] **1.3. Módulo de Exportación a PDF y Excel**
  - Configurar generador de planillas `.xlsx` con encabezados estilizados y totales.
  - Configurar generador de reportes `.pdf`.
  - *Criterio de verificación*: Petición que descargue un archivo Excel válido con la información filtrada.

---

## Fase 2: Frontend – Dashboard de Reportes y Visualización de Datos

- [ ] **2.1. Pestañas de Asistencia y Cuotas Vencidas (US-33 y US-34)**
  - Vista `/admin/reportes` con panel de filtros (fechas, profesoras, alumnos).
  - Tabla de resultados con totales destacados y botones de exportación a PDF y Excel.
  - *Criterio de verificación*: Al aplicar un filtro de fecha, la tabla se actualiza inmediatamente.

- [ ] **2.2. Gráficos Estadísticos de Planes e Inscripciones (US-35 y US-36)**
  - Componente de gráfico de barras con inscriptos mensuales.
  - Componente de gráfico de torta con la cuota de mercado de cada plan.
  - *Criterio de verificación*: Los gráficos renderizan valores dinámicos y leyendas legibles.

- [ ] **2.3. Componente de Mapa de Calor de Horarios (US-37)**
  - Grilla interactiva de 7 columnas por franjas horarias con escala cromática continua de verde a rojo.
  - Tooltip/popover al posar el cursor o hacer clic con detalle de actividad, profesora y cupo.
  - *Criterio de verificación*: Los horarios llenos destacan en color rojo intenso.

---

## Fase 3: Validación End-to-End y Criterios de Aceptación

- [ ] **3.1. Verificación CA-01**: Generación de informe de asistencia filtrado por período y profesora.
- [ ] **3.2. Verificación CA-02**: Identificación y listado de cuotas en mora con total de deuda exigible.
- [ ] **3.3. Verificación CA-03**: Validación de gráficos estadísticos comparados contra la base de datos.
- [ ] **3.4. Verificación CA-04**: Interacción y fidelidad visual del mapa de calor de ocupación horaria.
