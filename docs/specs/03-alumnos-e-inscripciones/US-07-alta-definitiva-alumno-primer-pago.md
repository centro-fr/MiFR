# US-07 – Alta definitiva de alumno al confirmarse el primer pago

## 1. Información general

- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o profesora a cargo (registran el primer pago); el sistema hace el alta de forma automática
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Convertir una pre-inscripción en un alumno activo cuando se confirma el primer pago (en efectivo o por transferencia), reutilizando todos los datos ya cargados sin tener que volver a ingresarlos.

## 3. Descripción

Como propietaria, quiero dar de alta el registro definitivo del alumno y activarlo en el plan y horario ya elegidos al confirmarse el primer pago de su pre-inscripción, para no volver a cargar sus datos.

## 4. Estados de la pantalla / flujo

- [ ] Pestaña "Pendientes de alta" del listado de alumnos (US-10): las pre-inscripciones sin primer pago, con la búsqueda y los filtros del listado
- [ ] Ficha del pre-inscripto: muestra hasta cuándo se le guarda el lugar, o que la reserva ya venció, y el botón "Registrar cobro"
- [ ] Registro del primer pago (modal): efectivo o transferencia
- [ ] Procesando
- [ ] Éxito: el alumno queda activo (o, si una profesora informó una transferencia, queda pendiente de verificación)
- [ ] Error (sin cupo, monto distinto, transferencia pendiente, etc.)
- [ ] Empty: "No hay pre-inscripciones pendientes"

## 5. Datos que necesita

### Datos que se reutilizan de la pre-inscripción

- Datos personales del alumno
- Datos del tutor (si es menor)
- Plan elegido, con el precio y la promoción vigentes al pre-inscribirse
- Horarios y profesora a cargo
- Fecha de inicio (de ella sale el plazo de la reserva de lugar)

### Datos que se generan al confirmar

- Inscripción: `PREINSCRIPTA` → `ACTIVA`
- Alumno y su usuario: `INACTIVO` → `ACTIVO`
- Rol `ALUMNO` para el alumno, o `TUTOR` para el responsable si el alumno es menor
- La primera cuota y su pago confirmado
- Estado de la cuota: `Al día` (US-18)

No se guarda una fecha de alta aparte: es la del primer pago confirmado.

## 6. Acciones del usuario

- Ver las pre-inscripciones pendientes de alta (pestaña "Pendientes de alta" del listado de alumnos)
- Cobrar en el momento: al terminar la pre-inscripción (US-05), "Confirmar y cobrar ahora" abre el registro del primer pago:
  - **En efectivo:** lo registra la propietaria o la profesora a cargo de la inscripción (US-15). El alta es inmediata.
  - **Transferencia ya recibida:** la propietaria carga una transferencia que ya vio en su cuenta y queda confirmada. El alta es inmediata. Es la forma de pagar la primera cuota por transferencia, porque el alumno todavía no puede entrar al sistema.
  - **Transferencia informada por la profesora:** queda pendiente de verificación y el alta llega cuando la propietaria la aprueba (US-17).
- Cobrar después: si se cerró sin cobrar, el alumno queda en "Pendientes de alta" y el primer pago se registra con "Registrar cobro" en su ficha:
  - **En efectivo:** el alta es inmediata.
  - **Transferencia:** queda informada y pendiente de verificación; el alta llega cuando la propietaria la aprueba en "Transferencias por verificar" (US-17).
- No hay alta manual sin un pago confirmado.

## 7. Reglas de negocio

- Mientras espera el primer pago, el alumno está `INACTIVO` y su inscripción `PREINSCRIPTA`: lo "pendiente" se lee de la inscripción.
- El alumno pasa a **activo** únicamente cuando el primer pago queda confirmado:
  - **Efectivo:** al registrarse el cobro (US-15).
  - **Transferencia recibida:** al cargarla la propietaria.
  - **Transferencia informada:** cuando la propietaria la **aprueba** (US-17).
- El alta definitiva es **automática** y se guarda en la misma transacción que el pago: inscripción, alumno, usuario, rol, cuota y pago. Si falla un paso, no queda ninguno.
- Se reutilizan todos los datos de la pre-inscripción (no se duplica información) y el alumno queda inscripto en el plan, los horarios y con la profesora que se habían elegido.
- **Reserva de lugar:** una pre-inscripción sin pagar guarda su lugar hasta `DIAS_RESERVA_PREINSCRIPCION` días después de su fecha de inicio (parámetro, 3 por defecto; con 0 vence el mismo día). Pasado ese plazo sigue pre-inscripta, pero deja de ocupar cupo.
- Antes de guardar el pago se vuelve a validar el cupo de los horarios: si ya no hay lugar, el cobro se rechaza y no queda ningún pago registrado.
- El monto esperado es el precio vigente del plan, con la promoción si corresponde (US-12, US-13). Un monto distinto solo se acepta con confirmación.
- Mientras haya una transferencia pendiente, la inscripción no admite otro pago.
- El alta es idempotente: una segunda confirmación no duplica nada y el alta solo ocurre con el primer pago; los siguientes son renovaciones.
- Si el alumno es menor de edad, se activa también la cuenta del **tutor**, que es quien entra al sistema (US-06). Un alumno mayor tiene email obligatorio, para poder entrar con Google.
- A un alumno dado de baja no se le puede registrar un pago.

## 8. Criterios de aceptación

- [ ] Cobro en efectivo de una pre-inscripción → el alumno pasa a estado "activo"
- [ ] Transferencia recibida cargada por la propietaria → el alumno pasa a estado "activo"
- [ ] Aprobación de la transferencia informada de una pre-inscripción → el alumno pasa a estado "activo"
- [ ] Una pre-inscripción sin pago confirmado no queda activa (tampoco con una transferencia pendiente)
- [ ] Los datos de la pre-inscripción se mantienen y no se piden de nuevo
- [ ] El alumno queda correctamente asociado al plan, los horarios y la profesora elegidos
- [ ] Si es menor de edad, el tutor queda como usuario del sistema
- [ ] Sin cupo al confirmar → se rechaza el pago y el alumno sigue pre-inscripto

## 9. Casos borde / Errores

- Reserva vencida y el horario se llenó → se rechaza el pago; hay que cambiarle el horario antes de cobrar
- Pre-inscripción dada de baja → no se puede activar
- Doble confirmación de pago → no duplica el alta
- Transferencia aprobada para un alumno que ya está activo → es una renovación, no un alta
- Monto distinto del esperado → advertir y pedir confirmación
- Transferencia pendiente de la misma inscripción → no se puede registrar otro pago hasta resolverla
- Falla en cualquier paso del alta → no queda nada registrado

## 10. Dependencias

- US-05 (pre-inscripción)
- US-06 (asociación de tutor)
- US-15 (registro de cobro en efectivo)
- US-16 (registro de pago por transferencia)
- US-17 (aprobación de transferencias)
- US-18 (cálculo del estado de habilitación)
- Backend: `POST /api/v1/pagos/efectivo`, `POST /api/v1/pagos/transferencia-recibida`, `POST /api/v1/pagos/transferencia` y `POST /api/v1/pagos/:id/aprobar`. El alta la hace `IInfoInscripciones.activar`, que no está expuesta en la API.
- Parámetro `DIAS_RESERVA_PREINSCRIPCION`

## 11. Notas de implementación (Front)

- El alta es una consecuencia del pago confirmado: el front no la pide por separado.
- Complejidad: Media
- En el frontend:
  - "Pendientes de alta" es una pestaña del listado de alumnos (los pre-inscriptos, con la cuota "Sin cuota paga").
  - Al terminar la pre-inscripción, "Confirmar y cobrar ahora" abre el registro del primer pago. Las formas que ofrece dependen de los permisos: efectivo con `PAGOS_REGISTRAR`; transferencia recibida, solo la propietaria con `PAGOS_CONFIRMAR`; la profesora, transferencia informada. Si la reserva venció, avisa antes de cobrar que el back vuelve a pedir cupo.
  - En la ficha, "Registrar cobro" (propietaria o `PAGOS_REGISTRAR`) usa el registro de cobro general: efectivo o transferencia informada.
  - La ficha del pre-inscripto muestra la reserva: "Lugar guardado hasta…" o "La reserva venció…".
  - Indicador claro de que el alumno pasó a activo.
- La confirmación del pago puede venir de:
  - **US-15:** cobro en efectivo
  - **US-17:** aprobación de transferencia
