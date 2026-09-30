# Especificación Funcional: Configuración Base

## 1. Origen
Esta especificación consolida las User Stories de la épica **Configuración Base**:
- **US-03**: Alta y administración de actividades y cupos (`docs/specs/02-configuracion-base/US-03-alta-administracion-actividades-cupos.md`)
- **US-04**: Asignación de profesoras y horarios a actividades (`docs/specs/02-configuracion-base/US-04-asignacion-profesoras-horarios.md`)

---

## 2. Objetivo
Definir la oferta de actividades, disciplinas y cronograma semanal del centro de entrenamiento MiFR. Permite a la Propietaria parametrizar las actividades (distinguiendo entre clases grupales y personalizadas con control de cupos) y estructurar los horarios semanales asignando profesoras capacitadas, garantizando la prevención estricta de solapamientos horarios y la trazabilidad operativa.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Control total para crear, editar, inactivar actividades y definir el cronograma de horarios y asignación de profesoras. |
| **Profesora** | Consulta de sus propios horarios y actividades asignadas en el cronograma semanal. |
| **Alumno / Visitante** | Visualización de actividades y horarios disponibles (solo lectura pública o autenticada). |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Gestión de Catálogo de Actividades
- Registrar actividades con código único, nombre, descripción y estado (`activo: true/false`).
- Clasificar obligatoriamente la actividad en `tipo`: `GRUPAL` o `PERSONALIZADA`.
- En actividades de tipo `PERSONALIZADA`, el `cupo_maximo` es obligatorio y estrictamente mayor a 0.
- En actividades de tipo `GRUPAL`, el `cupo_maximo` es opcional (puede fijarse por restricción de espacio físico o dejarse abierto).
- Permitir edición de datos descriptivos y estado. La baja de una actividad es siempre **baja lógica** para preservar histórico.
- Impedir la inactivación o baja si existen inscripciones vigentes o clases futuras agendadas con alumnos inscriptos.

#### RF-02: Cronograma Semanal y Asignación de Horarios
- Asignar franjas horarias a cada actividad indicando: día de la semana (`LUNES` a `DOMINGO`), hora de inicio y hora de fin.
- Asignar una profesora a cada franja horaria. La persona seleccionada debe tener obligatoriamente el rol `PROFESORA` activo.
- El horario hereda por defecto el cupo máximo definido en la actividad, pero permite ser sobrescrito a nivel de franja horaria específica.
- Una misma actividad puede impartirse en múltiples días/horarios y por diferentes profesoras.

#### RF-03: Regla de No Superposición Horaria
- El sistema debe impedir terminantemente que una misma profesora tenga asignados dos o más horarios que se solapen en el mismo día de la semana.
- La validación considera intervalos semicerrados `[hora_inicio, hora_fin)`.

#### RF-04: Control de Integridad al Modificar/Eliminar Horarios
- No se permite eliminar físicamente un horario que posea historial de clases dictadas o inscripciones vinculadas; se aplicará fecha de baja (`fecha_baja`).
- Advertir explícitamente a la Propietaria si la modificación del cupo de un horario deja fuera a alumnos previamente inscriptos.

---

### 4.2. Requisitos No Funcionales (RNF)
- **RNF-01**: Tiempos de respuesta inferiores a 200ms en la consulta del cronograma completo semanal.
- **RNF-02**: Consistencia transaccional ACID en la validación de solapamiento horario (bloqueo optimista o transacciones con aislamiento para prevenir race conditions).
- **RNF-03**: Interfaz gráfica responsiva tipo grilla semanal en pantallas de escritorio y vista agrupada por día / tarjeta en dispositivos móviles.

---

## 5. Criterios de Aceptación

- **CA-01 (Alta de actividad grupal)**: Se registra exitosamente una actividad grupal sin especificar cupo máximo.
- **CA-02 (Alta de clase personalizada con cupo obligatorio)**: Si se intenta crear una actividad personalizada sin cupo o con cupo <= 0, el sistema rechaza la operación informando error de validación.
- **CA-03 (Baja lógica segura)**: Al inactivar una actividad sin horarios activos, pasa a estado inactivo sin borrar historial. Si tiene horarios con alumnos, se muestra advertencia de bloqueo.
- **CA-04 (Asignación horaria válida)**: Se asigna una profesora activa a un horario disponible; el cronograma se actualiza inmediatamente.
- **CA-05 (Rechazo de solapamiento de profesora)**: Si la profesora ya tiene asignado Lunes de 18:00 a 19:00, e intenta asignársele otro horario el Lunes de 18:30 a 19:30, el sistema rechaza la solicitud indicando el conflicto exacto.
- **CA-06 (Restricción por rol en asignación)**: No es posible asignar a un usuario que no cuente con el rol `PROFESORA`.
- **CA-07 (Sobrescritura de cupo)**: Un horario puede definir un cupo particular distinto al valor general de la actividad.

---

## 6. Casos Borde y Errores
- Hora de fin menor o igual a la hora de inicio (ej: inicio 19:00, fin 18:00) → Rechazo inmediato.
- Intento de registrar actividades con nombres duplicados o códigos preexistentes → Error 409 Conflict.
- Profesora dada de baja que tiene horarios asignados → Alerta en el panel de configuración para reasignar suplencias o titulares.

---

## 7. Fuera de Alcance
- Registro y liquidación de suplencias temporales (cubierto en la épica `07-honorarios`).
- Cobro o tarifario de actividades (cubierto en `04-planes-y-precios`).
- Generación dinámica de clases puntuales por fecha de calendario (cubierto en `06-asistencia`).
