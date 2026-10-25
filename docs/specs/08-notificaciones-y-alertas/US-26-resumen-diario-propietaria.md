# US-26 – Resumen diario para la propietaria

## 1. Información general

- **Épica:** Notificaciones y Alertas
- **Prioridad:** Media
- **Actor principal:** Sistema (destinatario: Propietaria)
- **Sprint sugerido:** Sprint 4

## 2. Objetivo

Darle a la propietaria un resumen diario con las transferencias pendientes de verificación, el efectivo pendiente de rendición y las cuotas vencidas, para que tenga visibilidad de lo pendiente de un vistazo.

## 3. Descripción

Como sistema, quiero enviar a la propietaria un resumen diario con cobros pendientes de confirmar, efectivo pendiente de rendición y cuotas vencidas, para que tenga visibilidad sin entrar al sistema.

## 4. Estados de la pantalla / flujo

> Esta US es principalmente lógica de sistema. Se refleja en:

- [ ] Notificación diaria a la propietaria (campana y bandeja de notificaciones)
- [ ] "Resumen del día" en el Dashboard de la propietaria (vista consolidada, calculada al abrirla)
- [ ] "Todo al día" cuando no hay pendientes
- [ ] Resumen parcial: un bloque que no se pudo armar, con los otros actualizados
- [ ] Configuración de la hora del resumen

## 5. Datos que necesita

### Datos que se consolidan

**Bloque 1 – Transferencias pendientes de verificación:**

- Cantidad de transferencias pendientes
- Monto total
- Cuántas pasaron las 24 hs y cuántas llevan 12 hs o más
- Las 5 más antiguas: alumno, monto y hace cuánto se informaron

**Bloque 2 – Efectivo pendiente de rendición:**

- Cantidad de cobros sin rendir
- Monto total
- Detalle por profesora
- El cobro más antiguo (días sin rendir)

**Bloque 3 – Cuotas vencidas:**

- Cantidad de alumnos con cuota vencida
- Monto total estimado: el precio de hoy de cada plan, con su promoción
- Detalle por profesora y por plan
- Las 5 más atrasadas: alumno, plan y hace cuántos días venció

### Datos de configuración

- `HORA_RESUMEN_DIARIO`: hora a partir de la cual se genera la notificación del día (por defecto, 20:00; formato HH:MM, hora de Argentina). La configura la propietaria.
- Canal: solo notificación dentro del sistema (in-app).
- Se genera todos los días.

### Datos que se generan

- Notificación `RESUMEN_DIARIO` para cada propietaria, con el texto del resumen. Ej: "Resumen diario: 2 transferencias por confirmar ($60000), 3 cobros en efectivo sin rendir ($45000), 1 alumno con cuotas vencidas ($25000)." o "Todo al día".
- Historial de resúmenes: quedan en la bandeja de notificaciones

## 6. Acciones del sistema

- Consolidar los 3 bloques de datos
- Generar una vez por día, a partir de la hora configurada, la notificación del resumen para cada propietaria
- Registrar el envío
- Si no hay novedades, generar el resumen con el mensaje "Todo al día"
- Calcular la vista del Dashboard cada vez que se abre, con los datos del momento

## 7. Reglas de negocio

- El resumen debe **consolidar los 3 datos** (transferencias pendientes, efectivo pendiente, cuotas vencidas) en un solo aviso.
- Se genera **una vez al día** por propietaria, a partir de la hora configurada: correr el proceso dos veces no lo duplica.
- Si no hay movimientos pendientes, el resumen dice "Todo al día".
- El resumen es **visible únicamente por la propietaria**.
- El contenido debe ser **claro y accionable**: el Dashboard tiene enlaces directos a las secciones.
- Los montos deben reflejarse con formato de moneda consistente.
- El resumen no requiere acción obligatoria, es informativo.
- Si falla uno de los bloques, el resumen sale igual con los otros y avisa cuál no se pudo armar. El error queda en el log.
- En las cuotas vencidas cuentan los planes mensuales de alumnos activos, no bonificados, en estado `VENCIDA` (US-18): los que están en los días de gracia todavía no cuentan.
- El canal es solo dentro del sistema: email y WhatsApp quedaron fuera (decidido el 18/10/2026).
- El proceso corre con un intervalo dentro del servidor mientras está despierto y, además, al consultar el resumen.

## 8. Criterios de aceptación

- [ ] Generación del resumen en un día con movimientos pendientes → incluye los 3 bloques
- [ ] Generación del resumen en un día sin pendientes → "Todo al día"
- [ ] La notificación se genera a partir del horario configurado
- [ ] El resumen es visible solo por la propietaria
- [ ] Los montos totales se calculan correctamente
- [ ] Se puede configurar la hora del resumen
- [ ] Correr el proceso dos veces el mismo día → un solo resumen

## 9. Casos borde / Errores

- Error al recolectar uno de los bloques → resumen parcial con nota
- Día feriado o sin actividad → resumen "Todo al día" si no hay pendientes
- Muchos movimientos → mostrar solo los más relevantes (las 5 transferencias más antiguas y las 5 cuotas más atrasadas), con enlace al detalle completo en el sistema
- Servidor dormido a la hora configurada → la notificación se genera al despertar o al abrir el resumen
- Error en el proceso → se registra en el log y se reintenta en la próxima corrida

## 10. Dependencias

- US-15, US-16, US-17 (cobros en efectivo y transferencias)
- US-18 (estado de habilitación, para cuotas vencidas)
- US-19 (control de efectivo pendiente de rendición)
- US-01 (sesión y rol: solo la propietaria)
- Backend: `GET /api/v1/resumen-diario`, el proceso del resumen diario y las notificaciones (US-25). Parámetro `HORA_RESUMEN_DIARIO` (`GET /api/v1/parametros` y `PATCH /api/v1/parametros/:clave`).

## 11. Notas de implementación (Front)

- La consolidación vive en el **backend**.
- En el front:
  - En el Dashboard de la propietaria, la sección "Resumen del día", con la fecha, los 3 bloques y un botón para actualizar
  - Cada bloque muestra la cantidad y el monto. Las transferencias enlazan a "Verificar transferencias" y las cuotas a "Ver estado de cuotas"; el efectivo todavía no tiene enlace
  - Si no hay novedades, un mensaje positivo ("Todo al día") en lugar de un resumen vacío
  - Si un bloque no se pudo armar, se avisa: "Resumen parcial: no se pudo armar el bloque de …"
  - Acceso a "Configurar avisos" (`/app/notificaciones/configuracion`) para cambiar la hora del resumen, solo con `PARAMETROS_EDITAR`
  - La notificación diaria aparece en la campana y en la bandeja, con enlace al Dashboard
