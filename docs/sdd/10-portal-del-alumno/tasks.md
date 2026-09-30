# Tareas de Implementación: Portal del Alumno

Tareas técnicas, secuenciales y verificables para la épica **Portal del Alumno** (US-29 a US-31).

---

## Fase 1: Base de Datos y Catálogo de Gamificación

- [ ] **1.1. Tablas `insignias` y `alumno_insignias`**
  - Crear script de migración SQL para el subsistema de insignias.
  - *Criterio de verificación*: Validación de esquema y claves foráneas.

- [ ] **1.2. Semillas de Insignias Base**
  - Poblar catálogo inicial: "Primer Entrenamiento", "Racha 5 Clases", "Racha 10 Clases", "Mes Impecable".
  - *Criterio de verificación*: Consulta SQL que retorne el catálogo base de insignias.

---

## Fase 2: Backend – Endpoints del Portal y Gamificación

- [ ] **2.1. Endpoint de Resumen del Alumno (US-29)**
  - Implementar `/portal/resumen` unificando plan, estado de cuota, próxima clase y racha de asistencia.
  - Soporte de conmutación para tutores (`?id_alumno=X`).
  - *Criterio de verificación*: Consulta desde sesión de alumno que retorne su información consolidada.

- [ ] **2.2. Motor de Ranking de Asistencia (US-30)**
  - Implementar consulta agregada de asistencias por mes con ordenamiento descendente.
  - Anonimizar apellidos en la respuesta para privacidad.
  - *Criterio de verificación*: Test unitario verificando que el alumno con más presentes ocupe el puesto 1.

- [ ] **2.3. Evaluador de Rachas e Insignias (US-31)**
  - Desarrollar método en `GamificacionService` que compute rachas consecutivas al cerrarse una clase.
  - Asignar insignia en `alumno_insignias` si se cumple el criterio y generar notificación in-app.
  - *Criterio de verificación*: Simular 10 asistencias y comprobar desbloqueo automático de la insignia correspondiente.

---

## Fase 3: Frontend – Experiencia Móvil del Alumno

- [ ] **3.1. Dashboard Principal del Alumno (US-29)**
  - Vista `/portal` con tarjetas de estado de plan, semáforo de cuota y próximas clases.
  - *Criterio de verificación*: Visualización adaptada a pantallas pequeñas de smartphones.

- [ ] **3.2. Pantalla de Ranking de Asistencia (US-30)**
  - Vista `/portal/ranking` con podio ilustrado para los primeros 3 puestos y tabla general filtrable por mes.
  - *Criterio de verificación*: Renderizado del podio con badges de medallas.

- [ ] **3.3. Galería de Insignias y Racha (US-31)**
  - Vista `/portal/insignias` con visualización de medallas obtenidas y medallas por desbloquear.
  - Indicador de racha activa en la cabecera del perfil.
  - *Criterio de verificación*: Las insignias desbloqueadas muestran fecha de obtención y las bloqueadas aparecen en escala de grises.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01**: Consulta de resumen y verificación de próximas clases por el alumno.
- [ ] **4.2. Verificación CA-02**: Consulta y orden del ranking mensual de asistencia.
- [ ] **4.3. Verificación CA-03**: Desbloqueo automático de insignia al cumplir la racha.
- [ ] **4.4. Verificación CA-04**: Conmutación de perfiles de menores desde la cuenta del tutor.
