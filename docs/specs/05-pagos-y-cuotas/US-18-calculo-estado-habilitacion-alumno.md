# US-18 – Cálculo del estado de habilitación del alumno

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Sistema
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Calcular automáticamente el estado de habilitación de cada alumno según el tipo de plan, para determinar si puede asistir a clase, y validar el cupo de los horarios al inscribir.

## 3. Descripción

Como sistema, quiero calcular el estado de habilitación de cada alumno según el tipo de plan y el tipo de actividad:

- Planes mensuales (grupales o personalizados): de fecha a fecha, con los días de gracia del plan después del vencimiento (al día, por vencer o vencida).
- Planes de clase suelta / particular: la habilitación vale únicamente para el día de la clase contratada y vence al día siguiente (sin días de gracia).

Además, el sistema debe verificar que haya cupo disponible en los horarios (obligatorio en las clases personalizadas) al momento de la inscripción y en los demás momentos en que el alumno toma un lugar.

## 4. Estados de la pantalla / flujo

> Esta US no tiene pantalla propia, es una lógica de sistema. Se refleja en otras pantallas:

- [ ] Listado y ficha del alumno (US-10) → muestran el estado de cuota e historial
- [ ] Cobros y Cuotas, pestaña Cuotas (US-15) → filtra por estado y muestra primero las vencidas
- [ ] Registro de asistencia (US-20) → advierte si el alumno tiene cuota vencida
- [ ] Pre-inscripción (US-05), alta (US-07), reactivación (US-08) y cambio de plan u horarios (US-09, US-14) → validan el cupo
- [ ] Notificaciones (US-25) y resumen diario (US-26) → usan el estado para avisar
- [ ] Alumnos ausentes (US-22) → consideran "al día" a los que están al día o por vencer

## 5. Datos que necesita

### Datos de entrada

- Tipo de plan del alumno (`MENSUAL` / `CLASE_SUELTA`)
- Días de gracia del plan (US-11)
- Vencimiento de la última cuota paga de la inscripción
- Si hay una transferencia pendiente de verificación (US-16)
- Política del centro para los vencidos: parámetro `VENCIDOS_PUEDEN_ASISTIR`
- La fecha del día (Argentina)

### Datos que genera

- Estado de habilitación: `AL_DIA` | `POR_VENCER` | `VENCIDA` | `CLASE_SUELTA_VIGENTE` | `CLASE_SUELTA_VENCIDA` | `PENDIENTE_DE_PAGO`
- Fecha de vencimiento
- Días restantes hasta el vencimiento (0 el mismo día; negativo si ya venció; nulo sin cuota paga)
- Indicador de si puede asistir a clase
- Indicador de transferencia pendiente
- Validación de cupo (al inscribir, dar de alta, reactivar o cambiar de plan u horarios)

## 6. Acciones del sistema

- Calcular el estado de habilitación de cada alumno **cada vez que se consulta** (no se guarda), así que se actualiza solo al:
  - Confirmarse un pago (US-15 o US-17)
  - Pasar el día de vencimiento o terminar los días de gracia
  - Pasar el día de una clase suelta
  - Cambiar de plan (US-14)
- Validar el cupo disponible al inscribir, dar de alta, reactivar o cambiar de plan u horarios
- Servir de base para los avisos de vencimiento (US-25)

## 7. Reglas de negocio

### Cuotas

- La cuota se genera al registrar el pago, con el precio vigente ese día (US-12) y la promoción si corresponde (US-13). No se generan cuotas por adelantado, así que no hay deuda acumulada por meses no pagados: quien vuelve después de meses paga desde ese día.
- **Pago adelantado:** si el alumno paga estando al día, la cuota nueva empieza el día después del vencimiento de la vigente, para que ningún día quede cubierto por dos cuotas.

### Planes mensuales (grupales o personalizados)

- La cuota cubre de fecha a fecha: vence el mismo día del mes siguiente (si ese mes no tiene ese día, el último día del mes; ej: 31/01 → 28 o 29/02).
- Estado `AL_DIA`: hasta el día del vencimiento inclusive.
- Estado `POR_VENCER`: durante los días de gracia que siguen al vencimiento. Todavía puede asistir.
- Estado `VENCIDA`: superó los días de gracia sin pagar.
- Los días de gracia son **del plan** y los configura la propietaria al crearlo o editarlo (US-11). Con 0 días no hay `POR_VENCER`: pasa de `AL_DIA` a `VENCIDA`.

### Clases sueltas / particulares

- La habilitación es válida **únicamente para el día de la clase contratada** (`CLASE_SUELTA_VIGENTE`).
- **No tiene días de gracia**.
- Desde el día siguiente, el estado es `CLASE_SUELTA_VENCIDA`.

### Sin cuota paga

- Una inscripción sin ninguna cuota paga está en `PENDIENTE_DE_PAGO` ("Sin cuota paga") y no habilita a asistir, aunque tenga una transferencia pendiente.

### Cupo

- Se valida el cupo efectivo de cada horario: el propio o el heredado de la actividad (US-03, US-04). En las clases personalizadas el cupo es obligatorio.
- Ocupan lugar las inscripciones activas y las pre-inscripciones con la reserva vigente (US-07).
- Se valida al pre-inscribir (US-05), al dar el alta con el primer pago (US-07), al reactivar (US-08) y al cambiar de plan u horarios (US-09, US-14). Renovar la cuota no pide cupo: el alumno ya tiene su lugar.
- Si no hay cupo, se bloquea la operación con un mensaje claro. Las operaciones que compiten por el mismo lugar se resuelven en una transacción.

### Reglas generales

- El estado de habilitación **se calcula en cada consulta**, nunca se guarda.
- Con una transferencia **pendiente de verificación**, el alumno mantiene el estado que tenía y no se le bloquea la asistencia (US-16).
- Un alumno con cuota `VENCIDA` sigue apareciendo en las listas, con advertencia.
- Si un alumno vencido puede asistir lo decide el parámetro `VENCIDOS_PUEDEN_ASISTIR` (por defecto, sí).
- El cambio de plan crea una inscripción nueva (US-14): la habilitación se calcula con las cuotas de esa inscripción y las reglas del plan nuevo.
- Los avisos automáticos de vencimiento salen según este estado (US-25).

## 8. Criterios de aceptación

- [ ] Plan mensual dentro de los días de gracia → estado `POR_VENCER`
- [ ] Plan mensual fuera de los días de gracia → estado `VENCIDA`
- [ ] Clase suelta al día siguiente de la clase contratada → estado `CLASE_SUELTA_VENCIDA` (sin gracia)
- [ ] Inscripción sin cuota paga → estado `PENDIENTE_DE_PAGO`, no puede asistir
- [ ] Intento de inscripción en clase personalizada sin cupo → falla
- [ ] Intento de inscripción en clase personalizada con cupo → se permite
- [ ] Al confirmarse un pago (US-15 o US-17), el estado se actualiza a `AL_DIA` inmediatamente
- [ ] Los días de gracia del plan afectan el cálculo del estado

## 9. Casos borde / Errores

- Cambio de plan en medio del período → se calcula con las reglas del nuevo plan
- Alumno con clase suelta que paga el mismo día de la clase → queda vigente todo ese día
- Alumno con pago pendiente de confirmación (transferencia) → mantener el estado anterior hasta que se resuelva (no bloquear por pendiente)
- Alumno con cuota vencida que intenta inscribirse en una personalizada con cupo → se permite; la habilitación depende de sus cuotas
- Días de gracia = 0 → sin período de gracia
- Pago el mismo día del vencimiento → la cuota nueva empieza al día siguiente
- Vencimiento el 31 en un mes de 30 días o en febrero → vence el último día del mes

## 10. Dependencias

- US-03 (actividades: tipo grupal/personalizada y cupo)
- US-04 (horarios: cupo heredado)
- US-11 (planes: tipo mensual o clase suelta y días de gracia)
- US-12, US-13 (precio vigente y promoción de la cuota)
- US-15, US-16, US-17 (pagos que disparan la actualización)
- US-14 (cambio de plan, que recalcula habilitación)
- US-20 (asistencia, que consulta el estado)
- US-25 (notificaciones de vencimiento)
- US-29 (panel del alumno, que muestra el estado)
- Backend: `CalculadorVencimientoCuota` y `CalculadorHabilitacion` (cálculos puros, sin base de datos) y el componente `Cuota`, que los usa. Parámetro `VENCIDOS_PUEDEN_ASISTIR`.

## 11. Notas de implementación (Front)

- Este cálculo vive en el **backend**; el front solo muestra el resultado.
- En el front:
  - El estado llega dentro de cada respuesta que lo necesita (`situacion_cuota` en alumnos, inscripciones y listas de asistencia): no hay un pedido aparte por alumno.
  - Mostrar el estado con **badges de color**:
    - Verde: `AL_DIA` / `CLASE_SUELTA_VIGENTE`
    - Amarillo: `POR_VENCER`
    - Rojo: `VENCIDA` / `CLASE_SUELTA_VENCIDA`
    - Gris: `PENDIENTE_DE_PAGO` ("Sin cuota paga")
  - En el registro de asistencia (US-20), mostrar advertencia si el alumno tiene cuota vencida.
  - En la inscripción, el alta y los cambios de horario, mostrar claramente el error si no hay cupo.
  - Nunca calcular el estado en el front (evitar inconsistencias).
  - Mostrar "días restantes" o "vencida hace X días" para dar contexto.
