# US-25 – Aviso automático de vencimiento de cuota

## 1. Información general
- **Épica:** Notificaciones y Alertas
- **Prioridad:** Media
- **Actor principal:** Sistema (destinatario: Alumno)
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Enviar un aviso automático al alumno cuando su cuota esté próxima a vencer o ya haya vencido, según los días de gracia configurados, para facilitar la renovación a tiempo.

## 3. Descripción
Como sistema, quiero enviar un aviso automático al alumno cuando su cuota esté próxima a vencer o ya haya vencido, según los días de gracia configurados.

## 4. Estados de la pantalla / flujo
> Esta US es principalmente lógica de sistema. Se refleja en:
- [ ] Panel del alumno (US-29) → muestra aviso de vencimiento
- [ ] Historial de notificaciones (opcional)
- [ ] Configuración de días de gracia (por parte de la propietaria)
- [ ] Registro de avisos enviados

## 5. Datos que necesita
### Datos de entrada:
- Alumno y su plan actual
- Fecha de vencimiento de la cuota
- Días de gracia configurados
- Estado de cuota actual (`al_dia`, `por_vencer`, `vencida`)
- Canal de contacto (email, WhatsApp, notificación in-app)

### Datos de configuración:
- Días previos al vencimiento para enviar el primer aviso (por defecto: 3 días antes)
- Días de gracia configurados
- Canales habilitados (email, WhatsApp, push)
- Frecuencia de reintentos (opcional)

### Datos que se generan:
- Notificación enviada (con fecha y hora)
- Estado del aviso: `enviado` / `fallido` / `leído` (si aplica)
- Historial de avisos por alumno

## 6. Acciones del sistema
- Detectar cuotas próximas a vencer (dentro del rango configurado)
- Detectar cuotas vencidas
- Enviar avisos automáticos según los canales configurados
- Registrar cada aviso enviado
- Reintentar en caso de fallo (opcional)
- Notificar al tutor si el alumno es menor de edad

## 7. Reglas de negocio
- El aviso se genera según los **días de gracia configurados**.
- Se envía **antes del vencimiento** (en el rango de días previos configurado).
- Se envía **también al vencerse** la cuota (o al superar los días de gracia).
- Un alumno **al día** (sin vencimiento cercano) **no recibe aviso**.
- Si el alumno es menor de edad, el aviso va al **tutor** (quien es el usuario del sistema).
- El aviso se envía **una sola vez por período** (no spamear).
- El alumno puede ver el estado de su cuota en el panel (US-29) sin necesidad del aviso.
- Los canales de envío dependen de la configuración del centro:
  - Email (por defecto, si hay email cargado)
  - WhatsApp (si hay teléfono y la integración está activa)
  - Notificación in-app (siempre, si el alumno ingresa)
- Si el alumno renueva antes del vencimiento, no se envían más avisos.
- Los avisos quedan registrados para trazabilidad.
- Las notificaciones deben ser configurables (la propietaria puede ajustar los días previos).

## 8. Criterios de aceptación
- [ ] Aviso al entrar en el rango de días previos al vencimiento → se envía correctamente
- [ ] Alumno al día (sin vencimiento cercano) → no recibe aviso
- [ ] Alumno que renueva antes del vencimiento → no recibe más avisos
- [ ] Aviso al alumno menor de edad → va al tutor
- [ ] El aviso se registra en el historial
- [ ] Los días previos al vencimiento son configurables

## 9. Casos borde / Errores
- Alumno sin email ni teléfono → no se envía aviso, pero se registra
- Error de envío por canal → reintentar, y si falla, registrar como `fallido`
- Alumno con múltiples planes → enviar aviso por cada plan (o consolidado)
- Alumno dado de baja → no enviar avisos
- Alumno con pago pendiente de confirmación → no enviar aviso de vencimiento (ya está en proceso)
- Días de gracia = 0 → aviso solo al vencimiento exacto
- Error en el job de detección → registrar log y reintentar

## 10. Dependencias
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir)
- US-11, US-12 (planes y precios)
- US-18 (cálculo del estado de habilitación, que determina cuándo avisar)
- US-29 (panel del alumno, donde puede verse el aviso)
- Backend: job de detección + servicio de notificaciones (email / WhatsApp / push)

## 11. Notas de implementación (Front)
- Esta lógica vive mayormente en el **backend**.
- En el front:
  - En el panel del alumno (US-29), mostrar un banner visible si la cuota está `por_vencer` o `vencida`
  - El banner debe tener un botón claro para renovar
  - Mostrar "vence en X días" o "vencida hace X días"
  - Configuración de días previos y canales en el panel de la propietaria
  - Historial de avisos enviados (opcional para MVP, recomendable a futuro)
  - Si se envía por WhatsApp, usar un template configurado con variables: nombre, plan, fecha de vencimiento
  - Si se envía por email, usar un diseño consistente con la marca (colores #E91E82, #BC1266, #181C26)