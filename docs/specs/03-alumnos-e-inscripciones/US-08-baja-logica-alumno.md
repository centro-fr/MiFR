# US-08 – Baja lógica de alumno

## 1. Información general

- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Dar de baja lógicamente a un alumno conservando todo su historial de pagos y asistencia, para poder reactivarlo si vuelve más adelante sin perder información.

## 3. Descripción

Como propietaria, quiero dar de baja lógicamente a un alumno conservando su historial de pagos y asistencia, para poder reactivarlo si vuelve más adelante.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando ficha del alumno)
- [ ] Ficha del alumno con datos e historial
- [ ] Confirmación de baja (diálogo con el motivo)
- [ ] Procesando baja
- [ ] Éxito (alumno dado de baja)
- [ ] Error
- [ ] Ficha de alumno dado de baja (con opción de reactivar)
- [ ] Reactivación: elegir plan y horarios (se proponen los que tenía antes de la baja)

## 5. Datos que necesita

### Datos que muestra

- Nombre completo del alumno
- Estado actual: `Activo` / `Pendiente de alta` / `Baja`
- Plan, horarios y profesora a cargo (o, si está de baja, los que tenía al irse)
- Historial de cuotas y pagos
- Historial de asistencia (pendiente en la ficha: todavía no está disponible)

### Datos que se cargan al dar de baja

- Motivo de baja (obligatorio): dejó de asistir (`ABANDONO`), mudanza (`MUDANZA`), salud (`SALUD`), motivos económicos (`ECONOMICO`) u otro motivo (`OTRO`)
- Detalle (opcional, hasta 200 caracteres), solo con "Otro motivo"

### Datos que se generan al dar de baja

- Estado del alumno: `BAJA`; su usuario queda `INACTIVO` (ya no puede entrar al sistema)
- En cada inscripción vigente: estado `BAJA`, fecha de baja, motivo y detalle
- Los horarios vigentes de esas inscripciones se cierran, y el cupo se libera

### Datos que se generan al reactivar

- Una inscripción nueva con el plan y los horarios elegidos y el precio vigente ese día. La anterior queda como historial.
- Si el alumno ya había pagado alguna cuota: inscripción `ACTIVA` y alumno `ACTIVO`.
- Si nunca pagó una cuota: inscripción `PREINSCRIPTA` y alumno `INACTIVO`, hasta su primer pago (US-07).

## 6. Acciones del usuario

- Ver ficha de un alumno activo
- Iniciar baja lógica del alumno
- Elegir el motivo y confirmar la baja
- Ver ficha de un alumno dado de baja
- Reactivar un alumno dado de baja, eligiendo plan y horarios

## 7. Reglas de negocio

- Solo la **propietaria** da de baja y reactiva (rol Propietaria y permiso `ALUMNOS_EDITAR`). La profesora no.
- La baja **no elimina** el registro del alumno ni su historial de pagos y asistencia: es **lógica**, nunca física (no se hace DELETE en base de datos).
- Un alumno dado de baja **no cuenta** como inscripto activo en ningún horario: no aparece en las listas de asistencia ni ocupa cupo.
- A un alumno dado de baja no se le registran pagos, no recibe avisos de vencimiento (US-25) y no cuenta en las cuotas vencidas del resumen diario (US-26).
- Si el alumno es menor, la baja no toca la cuenta del tutor, que puede tener otros alumnos a cargo.
- Un alumno dado de baja **puede reactivarse** en cualquier momento. La reactivación valida el cupo de los horarios elegidos: si alguno no tiene lugar, no se reactiva y se puede elegir otro.
- Quien se reactiva sin haber pagado nunca una cuota vuelve como pre-inscripto, y el primer pago le da el alta como a cualquier alumno nuevo.
- Los pagos ya cobrados y las cuotas anteriores se conservan intactos.
- Las deudas al momento de la baja quedan registradas (no se borran). Al reactivar se advierte si debía una cuota al irse.

## 8. Criterios de aceptación

- [ ] Baja de un alumno con historial de asistencia → el historial se conserva
- [ ] Baja sin motivo → no se permite
- [ ] Reactivación de un alumno dado de baja que ya había pagado → vuelve a estado activo
- [ ] Reactivación de un alumno que nunca pagó → queda pre-inscripto hasta su primer pago
- [ ] Un alumno de baja no aparece en la lista de inscriptos para tomar asistencia
- [ ] Un alumno de baja no ocupa cupo en el horario (el cupo se libera)
- [ ] El historial de pagos se mantiene visible después de la baja

## 9. Casos borde / Errores

- Intentar dar de baja un alumno ya dado de baja → no se permite
- Reactivar un alumno cuyo horario ya está completo → no se reactiva; elegir otro horario
- Reactivar un alumno que debía una cuota al irse → advertir
- Alumno con efectivo pendiente de rendición al momento de la baja → la rendición sigue su curso (US-19)
- Alumno menor cuya baja la pide el tutor → la registra la propietaria
- "Otro motivo" con detalle de más de 200 caracteres → no se permite
- Error de red al dar de baja

## 10. Dependencias

- US-05, US-06, US-07 (el alumno debe existir previamente)
- US-09 (modificación de datos, relacionada)
- US-10 (consulta y búsqueda, donde se verá el estado)
- US-18 (cálculo del estado de habilitación)
- US-20 (asistencia: no debe aparecer en las listas)
- Backend: `POST /api/v1/alumnos/:id/baja` y `POST /api/v1/alumnos/:id/reactivar`

## 11. Notas de implementación (Front)

- Se implementó primero con mocks y después contra el back.
- Complejidad: Media
- UI:
  - Botón "Dar de baja" visible solo para la propietaria
  - Diálogo de confirmación: *"El alumno quedará inactivo pero se conservará todo su historial de cuotas y asistencias. Va a poder reactivarse más adelante."*, con el motivo obligatorio y el detalle al elegir "Otro motivo"
  - En la ficha, el estado con un badge: Activo / Pendiente de alta / Baja
  - En la lista de alumnos, la pestaña "Dados de baja" (los dados de baja no salen en las demás)
  - Botón "Reactivar" visible solo cuando el alumno está de baja; propone el plan y los horarios que tenía
  - Al reactivar, aviso si debía una cuota cuando se fue
