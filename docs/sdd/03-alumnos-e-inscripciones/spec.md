# Especificación Funcional: Alumnos e Inscripciones

## 1. Origen

Esta especificación consolida las User Stories de la épica **Alumnos e Inscripciones**:

- **US-05**: Pre-inscripción de alumno nuevo (`docs/specs/03-alumnos-e-inscripciones/US-05-pre-inscripcion-alumno-nuevo.md`)
- **US-06**: Asociación de tutor a alumno menor de edad (`docs/specs/03-alumnos-e-inscripciones/US-06-asociacion-tutor-alumno-menor.md`)
- **US-07**: Alta definitiva de alumno al confirmarse el primer pago (`docs/specs/03-alumnos-e-inscripciones/US-07-alta-definitiva-alumno-primer-pago.md`)
- **US-08**: Baja lógica de alumno (`docs/specs/03-alumnos-e-inscripciones/US-08-baja-logica-alumno.md`)
- **US-09**: Modificación de datos de alumno (`docs/specs/03-alumnos-e-inscripciones/US-09-modificacion-datos-alumno.md`)
- **US-10**: Consulta y búsqueda de alumnos (`docs/specs/03-alumnos-e-inscripciones/US-10-consulta-busqueda-alumnos.md`)

---

## 2. Objetivo

Gestionar el ciclo de vida integral de los alumnos del centro MiFR: desde la pre-inscripción inicial en estado pendiente, la vinculación obligatoria de tutores legales para alumnos menores de edad, el alta definitiva automática al confirmarse el primer pago (efectivo o transferencia), hasta la consulta avanzada, edición y baja lógica con preservación total del historial financiero y de asistencias.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Acceso total: pre-inscribir, confirmar pagos, modificar datos, procesar bajas lógicas y reactivaciones, consultar listados. |
| **Profesora** | Pre-inscribir alumnos, consultar fichas y datos de contacto de sus alumnos a cargo, modificar datos de contacto/observaciones. No procesa bajas definitivas. |
| **Alumno / Tutor** | Sujeto del registro. Si es mayor de edad, se le habilita usuario propio al pagar; si es menor, el usuario del sistema y comunicaciones quedan a cargo del tutor. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Pre-inscripción en Estado Pendiente (US-05)

- Registrar un nuevo alumno capturando nombre, apellido, DNI, fecha de nacimiento, teléfonos (contacto y emergencia), email y observaciones.
- Seleccionar plan vigente, horarios disponibles y profesora.
- Capturar peso y talla solo cuando la actividad lo requiera (ej: personalizadas).
- La pre-inscripción genera un registro en tabla `alumnos` con estado inicial `PENDIENTE` (o en `inscripciones` como `PREINCRIPTA`).
- En esta etapa, el alumno **no ocupa cupo definitivo garantizado** y **no tiene usuario habilitado para login**.

#### RF-02: Gestión de Alumnos Menores y Tutores (US-06)

- El sistema calcula automáticamente la minoría de edad (< 18 años) en base a la `fecha_nacimiento`.
- Si el alumno es menor de edad, es obligatorio vincular un tutor responsable: nombre completo, parentesco, teléfono, email y DNI.
- Si el tutor ya existe en el sistema (por ejemplo, tutor de otro hermano), se reutiliza su `id_usuario_responsable` en lugar de duplicar personas.
- La cuenta de acceso al portal y las notificaciones se asociarán a la cuenta del tutor.

#### RF-03: Alta Definitiva Disparada por Primer Pago (US-07)

- El paso de `PENDIENTE` a `ACTIVO` es automático y transaccional, desencadenado cuando:
  1. Se registra un cobro en efectivo exitoso (US-15).
  2. La Propietaria aprueba una transferencia bancaria (US-17).
- Se reutilizan todos los datos precargados. Se genera la primera cuota en estado cancelado y se habilita el acceso en `usuarios`.

#### RF-04: Baja Lógica y Reactivación (US-08)

- La baja de un alumno nunca es eliminación física (`DELETE`), sino actualización a estado `BAJA`, registrando fecha y motivo de baja.
- Un alumno en baja no figura en listas de asistencia ni consume cupos de horarios.
- Se conserva intacto el historial de pagos pasados y deudas previas.
- El alumno puede reactivarse: el sistema verifica la disponibilidad de cupo en los horarios deseados antes de confirmar la reactivación.

#### RF-05: Modificación de Datos del Alumno (US-09)

- Permitir actualización de datos personales, médicos y de contacto.
- La edición de planes u horarios respeta las reglas de vigencia y no altera cuotas ya cobradas.

#### RF-06: Consulta, Filtros y Búsqueda Avanzada (US-10)

- Buscador reactivo por texto (nombre, apellido, DNI, email, teléfono).
- Filtros por estado (`TODOS`, `ACTIVO`, `PENDIENTE`, `BAJA`), plan, actividad y profesora.
- Paginación del lado del servidor y ordenamiento por nombre o fecha de alta.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Búsqueda rápida con índices B-Tree y trigram (`pg_trgm` o `ILIKE`) respondiendo en < 150ms sobre 5.000 alumnos.
- **RNF-02**: Transaccionalidad estricta al confirmar primer pago y cambiar estados.
- **RNF-03**: Auditoría de cambios de datos sensibles y motivos de baja.

---

## 5. Criterios de Aceptación

- **CA-01 (Pre-inscripción correcta)**: Creación de alumno con estado `PENDIENTE` sin credencial de acceso.
- **CA-02 (Validación de tutor en menor)**: Intentar pre-inscribir a un menor de 16 años sin tutor arroja error bloqueante.
- **CA-03 (Activación tras pago en efectivo)**: Cobro de primera cuota cambia automáticamente el estado a `ACTIVO`.
- **CA-04 (Activación tras aprobación de transferencia)**: Aprobación de comprobante pasa la pre-inscripción a activa.
- **CA-05 (Baja lógica segura)**: El alumno dado de baja desaparece de la toma de asistencias pero sus pagos históricos siguen inalterados.
- **CA-06 (Reactivación con validación de cupo)**: Si no hay cupo al reactivar, el sistema avisa a la Propietaria para reubicarlo.
- **CA-07 (Búsqueda por DNI o Nombre)**: El buscador devuelve coincidencias parciales instantáneas.

---

## 6. Casos Borde y Errores

- Alumno que cumple 18 años durante su membresía activa.
- Intentar reactivar un alumno con deuda previa: la deuda debe mostrarse de inmediato.
- Menor con dos hermanos inscriptos: un único tutor con acceso unificado a los perfiles de sus hijos.

---

## 7. Fuera de Alcance

- Generación de rutinas o mediciones antropométricas (cubierto en `09-rutina-y-progreso`).
- Pasarela de pago web automatizada (MercadoPago/Stripe) en esta fase (solo efectivo y transferencia).
