# Tareas de Implementación: Honorarios

Tareas técnicas, secuenciales y verificables para la épica **Honorarios** (US-23 y US-24).

---

## Fase 1: Base de Datos y Estructura

- [ ] **1.1. Tablas `suplencias`, `liquidaciones` y `liquidacion_detalles`**
  - Crear script de migración SQL para el módulo de honorarios.
  - Configurar constraints de exclusión y claves foráneas a `clases`, `profesoras` e `inscripciones`.
  - *Criterio de verificación*: Ejecución limpia de migraciones e integridad de claves foráneas.

- [ ] **1.2. Datos semilla y configuración de tarifas**
  - Cargar parámetros de tarifa de honorarios por inscripto y valor por clase suplida.
  - *Criterio de verificación*: Verificación de parámetros en tabla o archivo de configuración.

---

## Fase 2: Backend – Motor de Liquidación y Suplencias

- [ ] **2.1. Registro y Validación de Suplencias (US-24)**
  - Implementar endpoint `POST /suplencias` verificando que la profesora titular y suplente sean distintas.
  - Asegurar que la clase pertenezca a un período no liquidado aún.
  - *Criterio de verificación*: Test unitario intentando asignar a la misma profesora como ausente y suplente, confirmando rechazo con HTTP 400.

- [ ] **2.2. Algoritmo de Cálculo Mensual de Honorarios (US-23)**
  - Implementar servicio que agrupe alumnos activos por profesora en el mes calendario.
  - Computar suplencias sumando a la suplente y descontando a la titular.
  - Persistir cabecera y detalles en tablas `liquidaciones` y `liquidacion_detalles`.
  - *Criterio de verificación*: Caso de prueba con 10 alumnos y 1 suplencia, validando los totales matemáticos exactos.

- [ ] **2.3. Control de Acceso y Exportación**
  - Proteger endpoint global exclusivamente para Propietaria.
  - Implementar endpoint de consulta propia para profesoras con filtro por su propio ID.
  - Desarrollar exportación a PDF y Excel del informe mensual.
  - *Criterio de verificación*: Profesora intenta consultar `/honorarios/informe` y recibe 403 Forbidden.

---

## Fase 3: Frontend – Panel de Liquidaciones y Suplencias

- [ ] **3.1. Panel de Honorarios de la Propietaria (US-23)**
  - Vista `/admin/honorarios` con selector de mes y tarjetas de métricas financieras.
  - Tabla tipo acordeón por cada profesora con lista de alumnos a cargo y desglose de suplencias.
  - Botones de exportación a PDF y Excel.
  - *Criterio de verificación*: Visualización clara de los honorarios discriminados por profesora con botón funcional de descarga.

- [ ] **3.2. Formulario de Registro de Suplencias (US-24)**
  - Modal para cargar suplencias con selector de clase, profesora ausente y suplente.
  - *Criterio de verificación*: Registro exitoso de suplencia y visualización inmediata en la grilla.

- [ ] **3.3. Vista de Honorarios Propios para Profesora**
  - Vista `/profesora/mis-honorarios` donde la profesora solo ve su propio resumen mensual.
  - *Criterio de verificación*: La profesora solo visualiza sus números y no los del resto del equipo.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01**: Comprobación de que el honorario se calcula por inscripto activo con independencia de asistencias.
- [ ] **4.2. Verificación CA-02**: Registro de suplencia y reflejo inmediato en el débito de la titular y crédito de la suplente.
- [ ] **4.3. Verificación CA-03**: Verificación de bloqueo de permisos para profesoras sobre el informe global.
- [ ] **4.4. Verificación CA-04**: Generación y descarga de archivo de exportación de honorarios.
