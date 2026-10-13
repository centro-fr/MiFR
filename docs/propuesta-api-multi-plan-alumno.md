# Especificación Técnica: Soporte de Múltiples Planes por Alumno (API Backend)

- **Destinatario:** Equipo Backend / Desarrolladores de API
- **Módulo:** Gestión de Pagos, Cuotas y Portal del Alumno (US-16 / US-29)
- **Fecha:** Octubre 2026
- **Estado:** Propuesta de contrato / Especificación de integración

---

## 1. Contexto y Justificación

En MiFR, un alumno puede inscribirse en más de una actividad o plan simultáneamente (por ejemplo, **Yoga – 2 clases semanales** con una profesora, y **Pilates – 1 clase semanal** con otra).

Cada inscripción representa:
1. Una actividad y plan con su precio vigente.
2. Una situación de cuota y vencimiento independiente.
3. Horarios y profesora asignada.
4. Historial de cobros y transferencias asociados a esa inscripción puntual (`id_inscripcion`).

En la base de datos relacional (DER), la relación entre `alumnos` e `inscripciones` ya es **1 a N** (`alumnos.id_alumno -> inscripciones.id_alumno`), por lo que **NO se requieren cambios en la base de datos**.

---

## 2. Situación Actual vs. Propuesta

### 2.1. Estado actual del endpoint
Actualmente el endpoint `GET /api/v1/alumnos/mi-plan` retorna un único plan en singular (`const [vigente] = vigentesDe(...)`):

```json
{
  "alumno": { "id_alumno": 1, "nombre": "Camila", "apellido": "Pérez", "dni": "35123456" },
  "inscripcion": {
    "id_inscripcion": 10,
    "id_plan": 1,
    "nombre_plan": "Plan Básico",
    "estado": "ACTIVA",
    "precio": 25000,
    "clases_por_semana": 2,
    "nombre_profesora": "Lucía Gómez"
  },
  "situacion_cuota": {
    "estado": "AL_DIA",
    "fecha_vencimiento": "2026-10-25",
    "dias_restantes": 12,
    "puede_asistir": true,
    "monto": 25000,
    "tiene_transferencia_pendiente": false,
    "transferencia_pendiente": null
  },
  "datos_bancarios": { ... }
}
```

> **Limitación:** Si el alumno tiene una segunda actividad activa, la segunda queda oculta y no puede ver su cuota ni informar la transferencia correspondiente a esa segunda actividad.

---

### 2.2. Propuesta de contrato ajustado

Se propone que el endpoint devuelva la colección de inscripciones activas del alumno (`inscripciones: [...]`), agrupando en cada una su información de plan y su situación de cuota respectiva:

#### `GET /api/v1/alumnos/mi-plan`

**Respuesta exitosa (`200 OK`):**

```json
{
  "alumno": {
    "id_alumno": 1,
    "nombre": "Camila",
    "apellido": "Pérez",
    "dni": "35123456"
  },
  "inscripciones": [
    {
      "id_inscripcion": 10,
      "id_plan": 1,
      "nombre_plan": "Yoga - 2 veces por semana",
      "estado": "ACTIVA",
      "precio": 25000,
      "clases_por_semana": 2,
      "nombre_profesora": "Lucía Gómez",
      "situacion_cuota": {
        "estado": "AL_DIA",
        "fecha_vencimiento": "2026-10-25",
        "dias_restantes": 12,
        "puede_asistir": true,
        "monto": 25000,
        "tiene_transferencia_pendiente": false,
        "transferencia_pendiente": null
      }
    },
    {
      "id_inscripcion": 14,
      "id_plan": 3,
      "nombre_plan": "Pilates - 1 vez por semana",
      "estado": "ACTIVA",
      "precio": 18000,
      "clases_por_semana": 1,
      "nombre_profesora": "Sofía Martínez",
      "situacion_cuota": {
        "estado": "EN_GRACIA",
        "fecha_vencimiento": "2026-10-14",
        "dias_restantes": 1,
        "puede_asistir": true,
        "monto": 18000,
        "tiene_transferencia_pendiente": true,
        "transferencia_pendiente": {
          "id_pago": 105,
          "monto": 18000,
          "fecha_hora_transferencia": "2026-10-13T10:30:00-03:00",
          "fecha_pago": "2026-10-13T10:35:00Z"
        }
      }
    }
  ],
  "datos_bancarios": {
    "banco": "Banco Santander Río",
    "cbu": "0720123488000012345678",
    "alias": "MIFR.CENTRO.FIT",
    "titular": "MiFR Entrenamiento Integral S.R.L.",
    "cuit": "30-71234567-9"
  }
}
```

> **Nota de compatibilidad:** Si se desea preservar compatibilidad transitoria con versiones anteriores que lean el campo raíz singular, el backend puede opcionalmente incluir `inscripcion: inscripciones[0]` y `situacion_cuota: inscripciones[0].situacion_cuota` junto con el nuevo array `inscripciones`.

---

## 3. Impacto en Endpoints de Pago y Transferencias

### 3.1. `POST /api/v1/pagos/transferencia` (US-16)
**NO requiere cambios.** El contrato ya exige el campo `id_inscripcion`:

```json
{
  "id_inscripcion": 14,
  "monto": 18000,
  "fecha_hora_transferencia": "2026-10-13T10:30:00-03:00",
  "titular_cuenta_origen": "Camila Pérez",
  "observaciones": "Transferencia cuota Pilates octubre"
}
```

El backend asocia directamente el registro en la tabla `pagos` a la inscripción indicada (`id_inscripcion`).

---

### 3.2. `GET /api/v1/pagos/mis-transferencias`
Opcionalmente puede admitir un query param `?id_inscripcion=14` para filtrar transferencias de una actividad en particular, o devolver todas las transferencias del alumno ordenadas cronológicamente con el campo `nombre_plan` o `id_inscripcion` en cada registro (lo cual ya viene soportado).

---

## 4. Qué resuelve en el Frontend

1. **Selector de actividad / plan (Mobile First):** El alumno puede alternar fácilmente entre sus actividades mediante un selector superior de píldoras/tabs (`[ Yoga ]` / `[ Pilates ]`).
2. **Claridad en montos y vencimientos:** Evita que el alumno pague el monto equivocado o desconozca qué cuota está venciendo.
3. **Flujo de pago inequívoco:** Al presionar "+ Informar transferencia", el modal abre preseleccionando la actividad activa en pantalla con su importe sugerido exacto.

---

## 5. Resumen de Tareas para Backend

1. En la consulta del alumno autenticado, obtener todas las inscripciones en estado `ACTIVA` (y/o `PREINSCRIPTA`).
2. Mapear cada inscripción calculando su `situacion_cuota` y verificando si posee transferencias en estado `PENDIENTE`.
3. Responder con la propiedad `inscripciones: [...]`.
