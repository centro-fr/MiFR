# US-18 – Cálculo del estado de habilitación del alumno

## 1. Información general

- **Épica:** Pagos y Cuotas
- **Prioridad:** Alta
- **Actor principal:** Sistema
- **Sprint sugerido:** Sprint 3

## 2. Objetivo

Calcular automáticamente el estado de habilitación de cada alumno según el tipo de plan y el tipo de actividad, para determinar si puede asistir a clase y validar cupo en clases personalizadas.

## 3. Descripción

Como sistema, quiero calcular el estado de habilitación de cada alumno según el tipo de plan y el tipo de actividad:

- Planes mensuales (grupales o personalizados): de fecha a fecha con días de gracia configurables (al día, por vencer o vencida).
- Planes de clase suelta / particular: la habilitación es válida únicamente para la clase del día contratado y vence automáticamente al finalizar esa clase (sin días de gracia).

Además, en las clases personalizadas el sistema debe verificar que exista cupo disponible al momento de la inscripción o renovación.

## 4. Estados de la pantalla / flujo
>
> Esta US no tiene pantalla propia, es una lógica de sistema. Se refleja en otras pantallas:

- [ ] Panel del alumno (US-29) → muestra estado de cuota
- [ ] Ficha del alumno (US-10) → muestra estado de cuota e historial
- [ ] Registro de asistencia (US-20) → advierte si el alumno tiene cuota vencida
- [ ] Pre-inscripción (US-05) / renovación (US-14) → valida cupo en personalizadas
- [ ] Notificaciones (US-25) → dispara avisos según el estado

## 5. Datos que necesita

### Datos de entrada

- Plan del alumno (mensual / clase suelta)
- Tipo de actividad asociada (grupal / personalizada)
- Fecha de inicio del período o de la clase contratada
- Fecha de vencimiento (calculada según el plan)
- Días de gracia configurados (para planes mensuales)
- Historial de pagos del alumno
- Estado de la cuota (pagada / pendiente / vencida)

### Datos que genera

- Estado de habilitación: `al_dia` | `por_vencer` | `vencida` | `clase_suelta_vigente` | `clase_suelta_vencida`
- Fecha de vencimiento
- Días restantes hasta el vencimiento
- Indicador de si puede asistir a clase
- Validación de cupo (solo en personalizadas)

## 6. Acciones del sistema

- Calcular el estado de habilitación de cada alumno
- Actualizar el estado automáticamente al:
  - Confirmarse un pago (US-15 o US-17)
  - Pasar el día de vencimiento
  - Vencer una clase suelta
  - Cambiar de plan (US-14)
- Validar cupo disponible al inscribir o renovar en clases personalizadas
- Notificar cambios de estado (US-25)

## 7. Reglas de negocio

### Planes mensuales (grupales o personalizados)

- Estado `al_dia`: el alumno está dentro del período pagado.
- Estado `por_vencer`: el alumno está dentro de los días de gracia configurados antes del vencimiento.
- Estado `vencida`: el alumno superó los días de gracia sin pagar.
- Los días de gracia son configurables por la propietaria (por defecto, por ejemplo, 5 días).
- El estado se recalcula automáticamente cada día (o en cada consulta).

### Clases sueltas / particulares

- La habilitación es válida **únicamente para la clase del día contratado**.
- **No tiene días de gracia**.
- Al finalizar la clase, la habilitación vence automáticamente.
- Al día siguiente, el estado es `clase_suelta_vencida`.

### Clases personalizadas

- Al momento de la inscripción o renovación, el sistema debe **verificar que exista cupo disponible**.
- Si no hay cupo, se bloquea la operación con un mensaje claro.
- El cupo es el definido en la actividad (US-03), heredado en el horario (US-04).

### Reglas generales

- El estado de habilitación se calcula en tiempo real (o se cachea con invalidación automática).
- Un alumno con cuota `vencida` puede seguir apareciendo en listas, pero debe mostrarse con advertencia.
- Un alumno con cuota `vencida` puede o no poder asistir, según la política del centro (configurable).
- Los cambios de estado disparan notificaciones automáticas (US-25).

## 8. Criterios de aceptación

- [ ] Plan mensual dentro de los días de gracia → estado `por_vencer`
- [ ] Plan mensual fuera de los días de gracia → estado `vencida`
- [ ] Clase suelta al día siguiente de la clase contratada → estado `vencida` (sin gracia)
- [ ] Intento de inscripción en clase personalizada sin cupo → falla
- [ ] Intento de inscripción en clase personalizada con cupo → se permite
- [ ] Al aprobarse un pago (US-15 o US-17), el estado se actualiza a `al_dia` inmediatamente
- [ ] Los días de gracia son configurables y afectan el cálculo del estado

## 9. Casos borde / Errores

- Cambio de plan en medio del período → recalcular con las reglas del nuevo plan
- Alumno con clase suelta que paga el mismo día de la clase → debe quedar vigente hasta el fin de la clase
- Alumno con pago pendiente de confirmación (transferencia) → mantener el estado anterior hasta que se resuelva (no bloquear por pendiente)
- Alumno con cuota vencida que intenta inscribirse en personalizada con cupo → decidir política (permitir o no)
- Días de gracia = 0 → sin período de gracia
- Error de cálculo por datos incompletos → registrar log y usar valor por defecto

## 10. Dependencias

- US-03 (actividades: tipo grupal/personalizada y cupo)
- US-04 (horarios: cupo heredado)
- US-11 (planes: tipo mensual o clase suelta)
- US-12 (precio vigente)
- US-15, US-16, US-17 (pagos que disparan la actualización)
- US-14 (cambio de plan, que recalcula habilitación)
- US-20 (asistencia, que consulta el estado)
- US-25 (notificaciones de vencimiento)
- US-29 (panel del alumno, que muestra el estado)
- Backend: servicio de cálculo de estado + job de recálculo diario + validación de cupo

## 11. Notas de implementación (Front)

- Este cálculo vive en el **backend**; el front solo muestra el resultado.
- En el front:
  - Usar un **hook centralizado** (`useHabilitacion(alumnoId)`) que consulte el estado al backend.
  - Mostrar el estado con **badges de color**:
    - Verde: `al_dia` / `clase_suelta_vigente`
    - Amarillo: `por_vencer`
    - Rojo: `vencida` / `clase_suelta_vencida`
  - En el registro de asistencia (US-20), mostrar advertencia si el alumno tiene cuota vencida.
  - En la inscripción/renovación de personalizadas, bloquear si no hay cupo con mensaje claro.
  - Nunca calcular el estado en el front (evitar inconsistencias).
  - Mostrar "días restantes" o "vencida hace X días" para dar contexto.
