# Tareas de Implementación: Asistencia

Tareas técnicas, secuenciales y verificables para la épica **Asistencia** (US-20 a US-22).

---

## Fase 1: Base de Datos y Modelado

- [ ] **1.1. Tablas `clases` y `asistencias`**
  - Crear script de migración SQL para `clases` y `asistencias` con sus constraints y claves foráneas.
  - Asegurar clave primaria compuesta en `asistencias (id_clase, id_alumno)`.
  - *Criterio de verificación*: Ejecución limpia de la migración y verificación de constraints.

- [ ] **1.2. Generador de instancias de clases**
  - Desarrollar servicio para instanciar las clases a partir del cronograma de `horarios`.
  - *Criterio de verificación*: Al invocar el generador para una fecha dada, se crean las clases correspondientes a los horarios de ese día de la semana.

---

## Fase 2: Backend – Asistencias y Automatización

- [ ] **2.1. Toma de Asistencia y Verificación de Habilitación (US-20)**
  - Implementar endpoint `GET /clases/:id/inscriptos` que devuelva los alumnos con su estado de cuota actual.
  - Implementar `POST /asistencias` para guardar presentes/ausentes de forma masiva o individual.
  - *Criterio de verificación*: Comprobar guardado y actualización inmediata de registros de asistencia.

- [ ] **2.2. Proceso de Cierre de Clase y Ausencias Automáticas (US-21)**
  - Desarrollar `POST /clases/:id/cerrar`: marca `fecha_cierre_asist` y completa automáticamente como ausentes a los alumnos sin marcar.
  - Implementar tarea programada (cron) que cierre clases pasadas no cerradas manualmente.
  - *Criterio de verificación*: Registrar 5 alumnos en una clase, marcar solo 3 como presentes, cerrar la clase y verificar que los otros 2 figuren como ausentes.

- [ ] **2.3. Algoritmo de Detección de Alumnos Inactivos (US-22)**
  - Implementar consulta SQL para detectar alumnos con $\ge 3$ inasistencias consecutivas o 14 días sin asistencia.
  - Exponer endpoint `GET /asistencias/inactivos`.
  - *Criterio de verificación*: Test con datos mockeados de asistencia que identifique con exactitud a los alumnos inactivos.

---

## Fase 3: Frontend – Interfaz Mobile First de Toma de Asistencia

- [ ] **3.1. Panel de Clases del Día para Profesoras (US-20)**
  - Crear vista `/profesora/clases` que muestre las clases de la jornada con estado (Abierta / Cerrada).
  - *Criterio de verificación*: La profesora solo ve las clases que le corresponden en el día actual.

- [ ] **3.2. Pantalla de Marcación de Asistencia (US-20 y US-21)**
  - Lista de alumnos con botones táctiles grandes de Presente / Ausente.
  - Indicador visual de alerta si el alumno tiene cuota vencida.
  - Botón "Cerrar Clase" con diálogo de confirmación que resume el conteo final.
  - *Criterio de verificación*: Bloqueo interactivo de la pantalla una vez cerrada la clase.

- [ ] **3.3. Vista de Alertas de Deserción e Inactivos (US-22)**
  - Componente en el panel de Propietaria y Profesora con la lista de alumnos en riesgo de abandono y acceso directo a WhatsApp/llamada.
  - *Criterio de verificación*: La tarjeta muestra los días desde la última asistencia y el botón de contacto.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01**: Registro de presente por profesora desde dispositivo móvil.
- [ ] **4.2. Verificación CA-02 y CA-03**: Cierre de clase, verificación de ausentes generados automáticamente e inmutabilidad posterior.
- [ ] **4.3. Verificación CA-04**: Generación de alertas para alumnos inactivos y verificación de su estado.
