# Especificación Funcional: Planes y Precios

## 1. Origen

Esta especificación consolida las User Stories de la épica **Planes y Precios**:

- **US-11**: Alta y edición de planes vigentes (`docs/specs/04-planes-y-precios/US-11-alta-edicion-planes-vigentes.md`)
- **US-12**: Actualización de precios con fecha de vigencia (`docs/specs/04-planes-y-precios/US-12-actualizacion-precios-fecha-vigencia.md`)
- **US-13**: Alta de descuentos y promociones (`docs/specs/04-planes-y-precios/US-13-alta-descuentos-promociones.md`)
- **US-14**: Renovación y cambio de plan (`docs/specs/04-planes-y-precios/US-14-renovacion-cambio-plan.md`)

---

## 2. Objetivo

Gestionar la oferta comercial del centro MiFR: estructuración de planes de entrenamiento (frecuencia semanal, modalidad grupal o personalizada, días de gracia para vencimiento), esquema de precios versionados con vigencia temporal (preservando el valor de cuotas emitidas con tarifas anteriores), promociones/descuentos comerciales aplicables, y el mecanismo de renovación periódica o cambio de plan para los alumnos.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Control exclusivo para crear/editar planes, fijar nuevos precios con vigencia, crear promociones y autorizar cambios de plan. |
| **Profesora** | Consulta de planes y precios vigentes para informar a interesados en pre-inscripción. |
| **Alumno / Tutor** | Visualización de su plan contratado y solicitud/consulta de opciones de renovación o cambio de plan. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Catálogo de Planes y Condiciones Comerciales (US-11)

- Definir planes con: nombre (ej: Básico, Intermedio, Libre, Particular, Kids), tipo (`MENSUAL` o `CLASE_SUELTA`), frecuencia semanal (`clases_por_semana`: 1, 2, 3, 5, libre), y `dias_gracia` para vencimiento de cuota (por defecto 10 días).
- Indicar si el plan exige `profesora_unica` (obligatorio que todas las clases sean con la misma instructora, como en clases personalizadas).
- La desactivación de un plan es lógica (`fecha_baja`), manteniendo vigentes las inscripciones activas de alumnos preexistentes.

#### RF-02: Versionado Temporal de Precios (US-12)

- Cada plan tiene asociado un historial de precios en `plan_precios` con `precio`, `fecha_vigencia_desde` y `fecha_vigencia_hasta`.
- Un aumento de precio se programa con fecha futura o actual.
- **Inmutabilidad histórica**: La actualización de precios aplica exclusivamente a las nuevas cuotas generadas a partir de la vigencia; **nunca** altera cuotas devengadas o cobradas con anterioridad.

#### RF-03: Descuentos y Promociones (US-13)

- Registrar promociones con código promocional, nombre, tipo de descuento (`PORCENTAJE` o `MONTO_FIJO`), valor numérico, fecha de inicio y fin, y estado activo.
- Vincular promociones a uno, varios o todos los planes disponibles (`promocion_planes`).
- Al inscribir a un alumno o generar cuota, si la promoción está vigente, se aplica el descuento deduciendo del precio base del plan.

#### RF-04: Renovación y Cambio de Plan de Alumnos (US-14)

- Permitir al alumno renovar su suscripción mensual de forma continua manteniendo sus condiciones o cambiando de plan.
- Si cambia de plan (ej: de 2 días a 3 días, o de grupal a personalizado):
  - Se da de baja la inscripción anterior marcando motivo `CAMBIO_PLAN`.
  - Se genera una nueva inscripción vinculando los nuevos horarios y el precio vigente del nuevo plan.
  - Si existen cuotas emitidas impagas del plan anterior, se recalculan o anulan según política del centro.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Precisión monetaria de punto fijo (`NUMERIC(10,2)` o enteros en centavos) para evitar errores de redondeo en descuentos porcentuales.
- **RNF-02**: Trazabilidad completa de auditoría sobre quién y cuándo modificó los precios o creó descuentos.

---

## 5. Criterios de Aceptación

- **CA-01 (Alta de plan)**: Se crea un plan con frecuencia semanal y días de gracia; queda disponible para inscripciones.
- **CA-02 (Actualización de precio sin efecto retroactivo)**: Se modifica el precio del Plan Básico a partir del 1 de octubre. Las cuotas de septiembre ya cobradas o emitidas no sufren cambios; las cuotas de octubre se emiten con el nuevo valor.
- **CA-03 (Aplicación de promoción fija y porcentual)**: En un plan de $20.000 con 10% de descuento se calcula cuota de $18.000. Con monto fijo de $3.000 se calcula en $17.000.
- **CA-04 (Cambio de plan con validación de cupo)**: Al cambiar a un plan personalizado, si el nuevo horario no tiene cupo, el sistema impide completar el cambio.

---

## 6. Casos Borde y Errores

- Descuento porcentual mayor a 100% o menor a 0% → Validación rechaza la creación.
- Superposición de rangos de vigencia de precio para el mismo plan → Debe cerrarse la vigencia previa (`fecha_vigencia_hasta`) antes de abrir la nueva.

---

## 7. Fuera de Alcance

- Facturación electrónica con AFIP/ARCA en esta fase.
- Cobros automáticos recurrentes con débito en tarjeta de crédito.
