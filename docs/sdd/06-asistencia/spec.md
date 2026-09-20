# Especificación Funcional: Asistencia

## 1. Origen
Esta especificación consolida las User Stories de la épica **Asistencia**:
- **US-20**: Registro de asistencia por clase (`docs/specs/06-asistencia/US-20-registro-asistencia-por-clase.md`)
- **US-21**: Registro automático de inasistencias (`docs/specs/06-asistencia/US-21-registro-automatico-inasistencias.md`)
- **US-22**: Detección de alumnos inactivos (`docs/specs/06-asistencia/US-22-deteccion-alumnos-inactivos.md`)

---

## 2. Objetivo
Digitalizar y agilizar el control de presencia y concurrencia a clases del centro MiFR: permitir a las profesoras tomar asistencia en tiempo real desde dispositivos móviles verificando el estado de cuota del alumno, automatizar el cierre de clase y computo de inasistencias para alumnos no presentes, y disparar alertas tempranas de deserción detectando alumnos con ausencias consecutivas o inactividad prolongada.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Profesora** | Consulta de su agenda de clases del día, pase de lista de inscriptos, marcado de presentes/ausentes y cierre formal de la clase. |
| **Propietaria** | Visibilidad total de asistencias de todas las clases y profesoras, reapertura excepcional de clases cerradas y acceso al reporte de alumnos inactivos. |
| **Alumno / Tutor** | Consulta de su propio historial de asistencias e inasistencias desde el portal personal. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Registro de Asistencia Ágil por Clase (US-20)
- La profesora visualiza en su pantalla principal las clases programadas para el día de la fecha.
- Al ingresar a una clase, se despliega la nómina de alumnos inscriptos con: nombre, badge de estado de habilitación de cuota (`AL_DIA`, `EN_GRACIA`, `VENCIDO`) y estado de asistencia (`SIN_MARCAR`, `PRESENTE`, `AUSENTE`).
- Marcación con un solo toque (toggle Presente/Ausente) o acción masiva "Marcar todos presentes".
- Si un alumno se encuentra en estado de cuota `VENCIDO`, el sistema muestra una advertencia visual destacada impidiendo u objetando el registro de presencia salvo autorización expresa de la Propietaria.

#### RF-02: Cierre de Clase e Inasistencias Automáticas (US-21)
- La profesora puede presionar "Cerrar Asistencia" al finalizar la sesión.
- Adicionalmente, un proceso programado de fondo (cronjob) evalúa las clases que hayan finalizado su horario hace más de 2 horas sin cierre manual y ejecuta el cierre automático.
- Regla de cierre: Todo alumno que permanezca en estado `SIN_MARCAR` se consolida automáticamente como `asistio = FALSE` (`AUSENTE`).
- Una vez cerrada la clase (`fecha_cierre_asist IS NOT NULL`), los registros quedan en modo solo lectura; únicamente la Propietaria puede reabrirla.

#### RF-03: Detección de Alumnos Inactivos y Riesgo de Deserción (US-22)
- Monitoreo sistemático de patrones de concurrencia:
  - Alumnos con $\ge 3$ inasistencias consecutivas.
  - Alumnos activos que no registran asistencia en los últimos 14 días corridos.
- Generación de un listado de alerta para la Propietaria y la profesora a cargo para acciones de retención/contacto telefónico.

---

### 4.2. Requisitos No Funcionales (RNF)
- **RNF-01**: Interfaz optimizada para uso ágil en dispositivos móviles (botones táctiles de área generosa $\ge 48\text{px}$, feedback sonoro o háptico opcional, diseño adaptado para una mano).
- **RNF-02**: Funcionamiento resiliente ante caídas intermitentes de conexión en el gimnasio (guardado local temporal en memoria / cola de sincronización).

---

## 5. Criterios de Aceptación
- **CA-01 (Toma de asistencia)**: La profesora marca presentes en su clase de las 18hs y los registros quedan guardados de inmediato.
- **CA-02 (Cierre de clase con ausentes automáticos)**: En una clase de 10 alumnos, la profesora marca 7 presentes y cierra la clase; los 3 restantes quedan guardados como ausentes (`asistio = FALSE`).
- **CA-03 (Bloqueo de edición posterior)**: Tras el cierre, la profesora no puede modificar los estados de asistencia de esa clase.
- **CA-04 (Alerta de alumno inactivo)**: Un alumno acumula 3 faltas consecutivas; aparece automáticamente en la sección "Alumnos en riesgo / Inactivos" con su teléfono de contacto.

---

## 6. Casos Borde y Errores
- Alumno que asiste a una clase pero no estaba previamente inscripto en ese horario (asistencia de prueba o recuperación) → Permitir "Agregar alumno eventual a la clase".
- Clase cancelada por feriado o fuerza mayor → Permite marcar la clase en estado `CANCELADA` sin generar ausencias a los inscriptos.

---

## 7. Fuera de Alcance
- Molinetes de acceso biométrico o lector RFID en esta fase.
