# US-25 – Aviso automático de vencimiento de cuota

## 1. Información general

- **Épica:** Notificaciones y Alertas
- **Prioridad:** Media
- **Actor principal:** Sistema (destinatario: Alumno, o su tutor si es menor)
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Enviar un aviso automático al alumno cuando su cuota esté próxima a vencer o ya haya vencido, según los días configurados y los días de gracia de su plan, para facilitar la renovación a tiempo.

## 3. Descripción

Como sistema, quiero enviar un aviso automático al alumno cuando su cuota esté próxima a vencer o ya haya vencido, según los días de gracia configurados.

## 4. Estados de la pantalla / flujo

> Esta US es principalmente lógica de sistema. Se refleja en:

- [ ] Inicio del alumno o del tutor → aviso destacado de la cuota (el más reciente sin leer)
- [ ] Campana de notificaciones (con la cantidad sin leer) y bandeja de notificaciones (`/app/notificaciones`)
- [ ] Configuración de los avisos (solo la propietaria): días previos al vencimiento para el primer aviso

## 5. Datos que necesita

### Datos de entrada

- Alumno, su plan (mensual) y su tutor si es menor
- Fecha de vencimiento de la cuota vigente
- Días de gracia del plan (US-11)
- Estado de cuota actual (US-18)
- Si tiene una transferencia pendiente o una cuota posterior ya paga

### Datos de configuración

- `DIAS_AVISO_VENCIMIENTO`: días previos al vencimiento para enviar el primer aviso (por defecto: 3; de 0 a 30). Lo configura la propietaria.
- Días de gracia: los de cada plan.
- Canal: solo notificación dentro del sistema (in-app).

### Datos que se generan

- Notificación de tipo `CUOTA_POR_VENCER` o `CUOTA_VENCIDA`, con la cuota a la que se refiere, la fecha y hora en que se generó y si ya se leyó
- Mensaje, por ejemplo: "Tu cuota del plan Funcional vence el 28/10/2026." o "La cuota de Lucía Benítez del plan Kids venció el 20/10/2026."
- Historial de avisos por usuario (la bandeja)

## 6. Acciones del sistema

- Detectar cuotas próximas a vencer (dentro de los días previos configurados)
- Detectar cuotas vencidas (superados los días de gracia)
- Generar los avisos dentro del sistema
- Registrar cada aviso
- Reintentar en la próxima corrida si falla
- Avisar al tutor si el alumno es menor de edad

## 7. Reglas de negocio

- Los avisos son **solo dentro del sistema** (campana, bandeja e inicio del alumno). Email y WhatsApp quedaron fuera (decidido el 18/10/2026): sumarlos es un cambio de diseño y del DER.
- **Aviso de cuota por vencer:** sale al entrar en los `DIAS_AVISO_VENCIMIENTO` días previos al vencimiento, mientras la cuota está al día.
- **Aviso de cuota vencida:** sale al superar los días de gracia del plan. Durante los días de gracia no se avisa. Con 0 días de gracia sale el mismo día del vencimiento.
- Un alumno **al día** (sin vencimiento cercano) **no recibe aviso**.
- Si el alumno es menor de edad, el aviso va al **tutor** (quien es el usuario del sistema).
- **Un aviso de cada tipo por cuota**: correr el proceso dos veces no lo duplica (lo garantiza la base).
- Si el alumno renueva (tiene una cuota posterior paga), no se avisa más por la anterior.
- Con una transferencia pendiente de verificación no se avisa: el pago ya está en proceso.
- Solo los planes **mensuales** generan avisos. La clase suelta no.
- Los alumnos dados de baja no reciben avisos.
- El alumno puede ver el estado de su cuota sin necesidad del aviso.
- Los avisos quedan registrados para trazabilidad.
- El proceso corre una vez por día: con un intervalo dentro del servidor mientras está despierto y, además, cuando el usuario consulta sus notificaciones.

## 8. Criterios de aceptación

- [ ] Aviso al entrar en el rango de días previos al vencimiento → se genera correctamente
- [ ] Alumno al día (sin vencimiento cercano) → no recibe aviso
- [ ] Alumno que renueva antes del vencimiento → no recibe más avisos
- [ ] Aviso al alumno menor de edad → va al tutor
- [ ] El aviso se registra en el historial
- [ ] Los días previos al vencimiento son configurables
- [ ] Correr el proceso dos veces el mismo día → no duplica avisos

## 9. Casos borde / Errores

- Alumno con varias inscripciones → un aviso por cada cuota
- Alumno dado de baja → no se envían avisos
- Alumno con pago pendiente de confirmación → no se envía aviso de vencimiento (ya está en proceso)
- Días de gracia = 0 → el aviso de vencida sale el mismo día del vencimiento
- `DIAS_AVISO_VENCIMIENTO` = 0 → el aviso de por vencer sale recién el día que vence
- Alumno que cumple 18 años → el aviso sigue yendo al tutor hasta que se edita su ficha
- Error en el proceso de detección → se registra y se reintenta en la próxima corrida

## 10. Dependencias

- US-05, US-07 (alumnos e inscripciones)
- US-06 (tutor del alumno menor)
- US-08 (baja lógica, para excluir)
- US-11, US-12 (planes, días de gracia y precios)
- US-16 (transferencia pendiente)
- US-18 (cálculo del estado de habilitación, que determina cuándo avisar)
- US-29 (panel del alumno, donde puede verse el aviso)
- Backend: planificador de notificaciones y `GET /api/v1/notificaciones/mias` (paginado, sin leer primero), `POST /api/v1/notificaciones/:id/leida` y `POST /api/v1/notificaciones/leidas`. Parámetro `DIAS_AVISO_VENCIMIENTO` (`GET /api/v1/parametros` y `PATCH /api/v1/parametros/:clave`).

## 11. Notas de implementación (Front)

- Esta lógica vive en el **backend**: cuándo avisar lo decide el back; el front solo muestra.
- En el front:
  - En el inicio del alumno o del tutor, un aviso destacado con el aviso de cuota sin leer más reciente: ámbar si está por vencer, rojo si venció
  - El aviso tiene un botón "Ver mi plan" para renovar y "Entendido", que lo marca como leído
  - Campana en el encabezado con la cantidad sin leer, y bandeja de notificaciones para todos los roles, con "marcar todas como leídas"
  - Configuración de los días previos en "Configurar avisos" (`/app/notificaciones/configuracion`), solo para la propietaria (`PARAMETROS_EDITAR`)
  - El mensaje del aviso ya trae la fecha de vencimiento ("vence el…", "vence hoy", "venció el…")
