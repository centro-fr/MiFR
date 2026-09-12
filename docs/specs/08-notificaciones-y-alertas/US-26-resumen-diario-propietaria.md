# US-26 – Resumen diario para la propietaria

## 1. Información general
- **Épica:** Notificaciones y Alertas
- **Prioridad:** Media
- **Actor principal:** Sistema (destinatario: Propietaria)
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Enviar a la propietaria un resumen diario con cobros pendientes de confirmar, efectivo pendiente de rendición y cuotas vencidas, para que tenga visibilidad sin entrar al sistema.

## 3. Descripción
Como sistema, quiero enviar a la propietaria un resumen diario con cobros pendientes de confirmar, efectivo pendiente de rendición y cuotas vencidas, para que tenga visibilidad sin entrar al sistema.

## 4. Estados de la pantalla / flujo
> Esta US es principalmente lógica de sistema. Se refleja en:
- [ ] Email o notificación diaria a la propietaria
- [ ] Panel de la propietaria (vista consolidada dentro del sistema)
- [ ] Configuración del horario y canal del resumen

## 5. Datos que necesita
### Datos que se consolidan:
**Bloque 1 – Cobros pendientes de confirmar (transferencias):**
- Cantidad de transferencias pendientes
- Monto total
- Detalle: alumno, monto, fecha de carga
- Alerta de las que están por superar las 24hs

**Bloque 2 – Efectivo pendiente de rendición:**
- Cantidad de cobros pendientes
- Monto total
- Detalle por profesora
- Alerta de los más antiguos

**Bloque 3 – Cuotas vencidas:**
- Cantidad de alumnos con cuota vencida
- Monto total estimado
- Detalle por profesora o plan
- Alerta de los casos más críticos

### Datos de configuración:
- Hora del envío diario (por defecto, 20:00)
- Canal de envío (email / WhatsApp / notificación in-app)
- Días de la semana en los que se envía (por defecto, todos)

### Datos que se generan:
- Resumen consolidado
- Registro del envío
- Historial de resúmenes (opcional)

## 6. Acciones del sistema
- Consolidar los 3 bloques de datos
- Enviar el resumen diario a la propietaria
- Registrar el envío
- Si no hay novedades, enviar un resumen vacío o "sin novedades"
- Permitir a la propietaria configurar la hora y el canal

## 7. Reglas de negocio
- El resumen debe **consolidar los 3 datos** (transferencias pendientes, efectivo pendiente, cuotas vencidas) en un solo envío.
- Se envía **una vez al día**, en el horario configurado.
- Si no hay movimientos pendientes, se envía un resumen vacío o con mensaje "sin novedades" (configurable).
- El resumen es **visible únicamente por la propietaria**.
- El contenido debe ser **claro y accionable** (con enlaces directos al sistema cuando sea posible).
- Los montos deben reflejarse con formato de moneda consistente.
- El resumen no requiere acción obligatoria, es informativo.
- Si hay errores al recolectar datos, se registra el fallo y se envía un resumen parcial con nota.
- Se debe poder desactivar el resumen desde la configuración (opcional).

## 8. Criterios de aceptación
- [ ] Generación del resumen en un día con movimientos pendientes → incluye los 3 bloques
- [ ] Generación del resumen en un día sin pendientes → resumen vacío o "sin novedades"
- [ ] El resumen se envía en el horario configurado
- [ ] El resumen es visible solo por la propietaria
- [ ] Los montos totales se calculan correctamente
- [ ] Se pueden configurar la hora y el canal del envío

## 9. Casos borde / Errores
- Error al recolectar uno de los bloques → enviar resumen parcial con nota
- Sin conexión al canal de envío → reintentar o registrar fallo
- Propietaria sin email ni teléfono configurado → no se puede enviar (advertir en configuración)
- Día feriado o sin actividad → enviar resumen vacío
- Muchos movimientos → resumir y mostrar solo los más relevantes (con opción de ver el detalle completo en el sistema)
- Error en el job de envío → registrar log y reintentar en el próximo ciclo

## 10. Dependencias
- US-15, US-16, US-17 (pagos, para transferencias y efectivo)
- US-18 (estado de habilitación, para cuotas vencidas)
- US-19 (control de efectivo pendiente de rendición)
- US-01, US-02 (permisos: solo propietaria)
- Backend: job diario + servicio de notificaciones + endpoint de configuración

## 11. Notas de implementación (Front)
- Esta lógica vive mayormente en el **backend**.
- En el front:
  - En el panel de la propietaria, mostrar una vista consolidada equivalente al resumen diario (sección "Resumen del día")
  - Permitir configurar:
    - Hora del envío
    - Canal (email / WhatsApp / in-app)
    - Días de envío
  - Historial de resúmenes enviados (opcional para MVP)
  - El diseño del email debe respetar los colores de la marca (#E91E82, #BC1266, #181C26)
  - Estructura del email sugerida:
    - Encabezado con logo MiFR
    - Bloque 1: Transferencias pendientes (cantidad + monto)
    - Bloque 2: Efectivo pendiente de rendición (cantidad + monto)
    - Bloque 3: Cuotas vencidas (cantidad + monto)
    - Enlace "Ver detalle en el sistema"
  - Si no hay novedades, mostrar un mensaje positivo ("Todo al día") en lugar de un resumen vacío