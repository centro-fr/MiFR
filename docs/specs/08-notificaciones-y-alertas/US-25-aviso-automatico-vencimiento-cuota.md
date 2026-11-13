# US-25 – Aviso automático de vencimiento de cuota

## 1. Información general

- **Épica:** Notificaciones y Alertas
- **Prioridad:** Media
- **Actor principal:** Sistema (destinatario: Alumno, o su tutor si es menor)
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Enviar un aviso automático al alumno cuando su cuota pase a estar por vencer o vencida, según los días de gracia de su plan, para facilitar la renovación a tiempo.

## 3. Descripción

Como sistema, quiero enviar un aviso automático al alumno cuando su cuota cambie de estado a por vencer o a vencida.

## 4. Estados de la pantalla / flujo

> Esta US es principalmente lógica de sistema. Se refleja en:

- [ ] Inicio del alumno o del tutor → aviso destacado de la cuota (el más reciente sin leer)
- [ ] Campana de notificaciones (con la cantidad sin leer) y bandeja de notificaciones (`/app/notificaciones`)

## 5. Datos que necesita

### Datos de entrada

- Alumno, su plan (mensual) y su tutor si es menor
- Fecha de vencimiento de la cuota vigente
- Días de gracia del plan (US-11)
- Estado de cuota actual (US-18)
- Si tiene una transferencia pendiente o una cuota posterior ya paga

### Datos de configuración

- Días de gracia: los de cada plan. No hay otra configuración: el aviso sale cuando cambia el estado de la cuota (decidido el 13/11/2026; antes había un parámetro de días previos al vencimiento).
- Canal: notificación dentro del sistema y, en los dispositivos que lo activaron, push al celular.

### Datos que se generan

- Notificación de tipo `CUOTA_POR_VENCER` o `CUOTA_VENCIDA`, con la cuota a la que se refiere, la fecha y hora en que se generó y si ya se leyó
- Mensaje, por ejemplo: "Tu cuota del plan Funcional venció el 28/10/2026: tenés tiempo de renovarla hasta el 02/11/2026." o "La cuota de Lucía Benítez del plan Kids está vencida desde el 25/10/2026."
- Historial de avisos por usuario (la bandeja)

## 6. Acciones del sistema

- Detectar las cuotas que pasaron a estar por vencer (en los días de gracia)
- Detectar las cuotas que pasaron a estar vencidas (superados los días de gracia)
- Generar los avisos dentro del sistema
- Registrar cada aviso
- Reintentar en la próxima corrida si falla
- Avisar al tutor si el alumno es menor de edad

## 7. Reglas de negocio

- Los avisos se ven **dentro del sistema** (campana, bandeja e inicio del alumno) y, desde el 13/11/2026, también como push en el celular (ver al final de esta sección). Email y WhatsApp quedaron fuera (decidido el 18/10/2026): sumarlos es un cambio de diseño y del DER.
- **El aviso sale cuando cambia el estado de la cuota (US-18)**, sin configuración (decidido el 13/11/2026):
  - **Por vencer:** el día siguiente al vencimiento, cuando la cuota entra en los días de gracia del plan. El texto dice hasta qué día hay tiempo de renovar.
  - **Vencida:** cuando se terminan los días de gracia. Con 0 días de gracia la cuota pasa de al día a vencida y solo hay este aviso.
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

- **Push al celular (decidido el 13/11/2026).** Además de la campana, los avisos de cuota por vencer y vencida llegan al celular como notificación push (Web Push), a quien activó los avisos en ese dispositivo desde su perfil. Es una copia del aviso del sistema: si el push no llega, el aviso sigue en la campana. El texto lleva el dato completo (de quién es la cuota, el plan y la fecha) para entenderse desde la pantalla de bloqueo; al tocarlo abre el sistema. En iPhone requiere iOS 16.4 o posterior y tener MiFR agregado a la pantalla de inicio. Email y WhatsApp siguen afuera.

## 8. Criterios de aceptación

- [ ] Cuota que pasa a estar por vencer o vencida → se genera el aviso de ese estado
- [ ] Alumno al día (sin vencimiento cercano) → no recibe aviso
- [ ] Alumno que renueva antes del vencimiento → no recibe más avisos
- [ ] Aviso al alumno menor de edad → va al tutor
- [ ] El aviso se registra en el historial
- [ ] Correr el proceso dos veces el mismo día → no duplica avisos

## 9. Casos borde / Errores

- Alumno con varias inscripciones → un aviso por cada cuota
- Alumno dado de baja → no se envían avisos
- Alumno con pago pendiente de confirmación → no se envía aviso de vencimiento (ya está en proceso)
- Días de gracia = 0 → no hay aviso de por vencer: el de vencida sale el día siguiente al vencimiento
- El proceso no corrió el día del cambio (servidor dormido) → el aviso sale en la próxima corrida, mientras la cuota siga en ese estado
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
- Backend: planificador de notificaciones y `GET /api/v1/notificaciones/mias` (paginado, sin leer primero), `POST /api/v1/notificaciones/:id/leida` y `POST /api/v1/notificaciones/leidas`.

## 11. Notas de implementación (Front)

- Esta lógica vive en el **backend**: cuándo avisar lo decide el back; el front solo muestra.
- En el front:
  - En el inicio del alumno o del tutor, un aviso destacado con el aviso de cuota sin leer más reciente: ámbar si está por vencer, rojo si venció
  - El aviso tiene un botón "Ver mi plan" para renovar y "Entendido", que lo marca como leído
  - Campana en el encabezado con la cantidad sin leer, y bandeja de notificaciones para todos los roles, con "marcar todas como leídas"
  - El mensaje del aviso ya trae las fechas ("venció el…: tenés tiempo hasta el…", "está vencida desde el…")
