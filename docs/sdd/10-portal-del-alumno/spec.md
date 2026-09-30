# Especificación Funcional: Portal del Alumno

## 1. Origen

Esta especificación consolida las User Stories de la épica **Portal del Alumno**:

- **US-29**: Consulta de estado de plan, asistencias y próximas clases (`docs/specs/10-portal-del-alumno/US-29-consulta-estado-plan-asistencias.md`)
- **US-30**: Ranking general de asistencia (`docs/specs/10-portal-del-alumno/US-30-ranking-asistencia-alumnos.md`)
- **US-31**: Insignias y racha de asistencia (`docs/specs/10-portal-del-alumno/US-31-insignias-racha-asistencia.md`)

---

## 2. Objetivo

Empoderar y fidelizar al alumno de MiFR a través de una experiencia digital atractiva, gamificada y centralizada accesible desde su smartphone: brindarle visibilidad total sobre su estado de membresía, cuotas vigentes, próximas clases agendadas e historial de presencias, fomentando la constancia mediante un ranking mensual de concurrencia y un sistema motivacional de rachas e insignias de entrenamiento.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Alumno** | Usuario principal del portal: visualiza su membresía, próximas clases, ranking general, medallas e insignias desbloqueadas. |
| **Tutor** | Accede al portal en representación de un alumno menor de edad a su cargo, visualizando el estado de la membresía y progreso de sus hijos. |
| **Profesora / Propietaria** | Visualización del ranking de asistencia para dinámicas de fidelización y premiación en el centro. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Dashboard Integral del Alumno (US-29)

- Resumen en tiempo real al ingresar al portal:
  - **Estado de Plan y Membresía**: Plan contratado, actividad, profesora asignada y badge de estado de cuota (`Al Día`, `Vencimiento Próximo`, `Vencido`).
  - **Próximas Clases**: Tarjeta con los horarios y días de las próximas clases asignadas.
  - **Historial Reciente**: Últimas asistencias registradas con fecha y profesora dictante.
- Acceso directo a botón "Informar Pago por Transferencia" si la cuota está por vencer o vencida.

#### RF-02: Ranking General de Asistencia (US-30)

- Tabla de clasificación mensual que ordena a los alumnos activos según la cantidad de clases a las que asistieron efectivamente en el período seleccionado.
- Filtros por mes/año y opción de ver ranking general o por actividad.
- Protección de privacidad: Muestra nombre de pila y primera letra del apellido (ej: "Laura G.") o alias deportivo para evitar exposición indebida de datos personales.

#### RF-03: Sistema de Rachas e Insignias de Gamificación (US-31)

- **Cálculo de Racha**: Conteo automático de semanas o clases consecutivas asistidas sin inasistencias injustificadas.
- **Catálogo de Insignias**: Logros desbloqueables con icono, título y descripción (ej: *"Primer Paso"* por primera asistencia, *"Constancia de Hierro"* por 10 clases consecutivas, *"Asistencia Perfecta"* por 100% de presencia en el mes).
- Al cerrarse una clase donde el alumno cumple el criterio de un logro, el sistema registra automáticamente la obtención de la insignia en `alumno_insignias` y genera una notificación de felicitación.
- Galería visual en el perfil del alumno con insignias obtenidas e insignias pendientes por desbloquear.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Experiencia Mobile First con estética premium, animaciones sutiles y micro-interacciones de gamificación.
- **RNF-02**: Cálculo eficiente del ranking (consultas indexadas o vista materializada refrescada al cierre de clases).

---

## 5. Criterios de Aceptación

- **CA-01 (Visualización de estado)**: El alumno ingresa al portal y ve su plan, próxima clase y estado de cuota claramente diferenciados.
- **CA-02 (Cálculo del ranking mensual)**: El alumno con mayor cantidad de asistencias en el mes lidera el puesto 1 del ranking.
- **CA-03 (Desbloqueo de insignia)**: Alumno que asiste a su décima clase consecutiva recibe la insignia "Constancia de Hierro".
- **CA-04 (Acceso de tutor)**: Un tutor con dos hijos menores puede conmutar entre los perfiles de ambos desde una misma sesión.

---

## 6. Casos Borde y Errores

- Alumno sin clases asistidas en el mes: figura al final del ranking con contador en 0.
- Empate en cantidad de asistencias: ordenamiento secundario por fecha más temprana de la última clase asistida.

---

## 7. Fuera de Alcance

- Red social interna con publicaciones o chat entre alumnos (comunidad se mantiene en el espacio físico y canales de difusión).
