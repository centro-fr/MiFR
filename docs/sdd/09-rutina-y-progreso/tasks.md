# Tareas de Implementación: Rutina y Progreso

Tareas técnicas, secuenciales y verificables para la épica **Rutina y Progreso** (US-27 y US-28).

---

## Fase 1: Base de Datos y Catálogo Antropométrico

- [ ] **1.1. Tablas `rutinas`, `registros_progreso`, `tipos_medida` y `medidas_corporales`**
  - Crear script de migración SQL para el módulo de rutinas y medidas.
  - Asegurar constraints de valores positivos y claves foráneas.
  - *Criterio de verificación*: Verificación del esquema en base de datos.

- [ ] **1.2. Datos semilla de medidas corporales**
  - Insertar catálogo de medidas base: `PESO (kg)`, `ALTURA (cm)`, `CINTURA (cm)`, `CADERA (cm)`, `PECHO (cm)`, `BRAZO (cm)`.
  - *Criterio de verificación*: Consulta `SELECT * FROM tipos_medida` devuelve los tipos estándar.

---

## Fase 2: Backend – Lógica de Carga y Visualización

- [ ] **2.1. CRUD de Rutinas (US-27)**
  - Implementar creación de rutina estructurada en JSONB.
  - Al crear una nueva rutina activa, marcar anteriores como inactivas (`activa = false`).
  - *Criterio de verificación*: Test unitario de creación de rutina y desactivación de la anterior.

- [ ] **2.2. Registro de Sesiones Antropométricas (US-27)**
  - Implementar endpoint `POST /progreso` insertando cabecera y lista de medidas corporales de forma transaccional.
  - Validar valores mayores a cero.
  - *Criterio de verificación*: Intentar registrar peso negativo y verificar rechazo con HTTP 400.

- [ ] **2.3. Endpoints de Consulta Segura para Alumno y Tutor (US-28)**
  - Implementar endpoint `/rutinas/mi-rutina` y `/progreso/mi-progreso` resolviendo automáticamente el `id_alumno` del usuario o del menor a su cargo.
  - *Criterio de verificación*: Alumno consulta su rutina y obtiene exclusivamente sus datos.

---

## Fase 3: Frontend – Constructor de Rutinas y Gráficos

- [ ] **3.1. Editor de Rutinas para Profesoras (US-27)**
  - Constructor dinámico de bloques de entrenamiento (Día -> Ejercicios -> Series/Reps/Cargas).
  - Formulario modal para cargar nueva medición física.
  - *Criterio de verificación*: La profesora guarda la rutina y se visualiza en la ficha del alumno.

- [ ] **3.2. Pantalla de Rutina y Evolución del Alumno (US-28)**
  - Tarjeta de rutina con vista limpia y amigable para celular.
  - Gráfico interactivo de evolución de peso y medidas a lo largo del tiempo.
  - Manejo de estados vacíos si aún no hay mediciones.
  - *Criterio de verificación*: El gráfico se renderiza correctamente con los puntos de medición cargados.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01**: Carga de rutina por profesora y visualización inmediata por el alumno.
- [ ] **4.2. Verificación CA-02**: Validación de medidas numéricas válidas.
- [ ] **4.3. Verificación CA-03**: Aislamiento estricto de información deportiva entre alumnos.
- [ ] **4.4. Verificación CA-04**: Generación y visualización del gráfico de progreso físico.
