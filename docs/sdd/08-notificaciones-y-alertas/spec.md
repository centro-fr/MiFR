# Especificación Funcional: Notificaciones y Alertas

> **Cambios del 13/11/2026.** US-26 (resumen diario de la propietaria) se retiró del sistema, y el aviso de clase cancelada también. Los avisos de cuota de US-25 llegan además como push al celular (ver la spec de US-25). Lo que sigue sobre US-26 queda como registro.

## 1. Origen

Esta especificación consolida las User Stories de la épica **Notificaciones y Alertas**:

- **US-25**: Aviso automático de vencimiento de cuota (`docs/specs/08-notificaciones-y-alertas/US-25-aviso-automatico-vencimiento-cuota.md`)
- **US-26**: Resumen diario para la propietaria (`docs/specs/08-notificaciones-y-alertas/US-26-resumen-diario-propietaria.md`)

---

## 2. Objetivo

Establecer un motor centralizado de mensajería y alertas automatizadas para el centro MiFR: notificar proactivamente a los alumnos (o sus tutores en caso de menores) sobre el vencimiento próximo y exigibilidad de sus cuotas para favorecer la cobranza en término, y proveer a la Propietaria de un resumen matutino diario con los focos operativos clave (transferencias por aprobar, efectivo en poder de profesoras y cuotas en mora).

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Sistema (Batch/Cron)** | Ejecutor autónomo de las reglas de detección, generación y despacho de mensajes. |
| **Propietaria** | Destinataria del resumen diario consolidado y administradora de los parámetros de alerta (horarios de envío, días previos de aviso). |
| **Alumno / Tutor** | Receptores de avisos de cobranza in-app y por correo electrónico. Si el alumno es menor de edad, el mensaje se despacha al tutor legal. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Alerta Automática de Vencimiento de Cuota (US-25)

- Regla temporal: Evaluar diariamente las cuotas activas:
  - **Aviso preventivo**: Enviado $N$ días antes de la fecha de vencimiento (por defecto 3 días antes).
  - **Aviso de vencimiento / gracia**: Enviado al cumplirse la fecha de vencimiento, recordando los días de gracia restantes.
  - **Aviso de mora / inhabilitación**: Enviado al superarse los días de gracia informando la suspensión operativa del acceso.
- Destinatario inteligente: Si el alumno es menor de edad, el destinatario es el tutor responsable.
- Canales de notificación:
  - **In-App**: Notificación persistente en la bandeja de entrada del usuario en el portal.
  - **Email**: Envío mediante plantilla HTML institucional.
- Idempotencia: Evitar envíos duplicados garantizando máximo un mensaje por estado/cuota.

#### RF-02: Resumen Diario Operativo para la Propietaria (US-26)

- Despacho automático matutino (ej: 08:00 AM) a la Propietaria conteniendo 3 bloques de información:
  1. **Transferencias pendientes**: Cantidad y monto acumulado de pagos bancarios por verificar y aprobar.
  2. **Efectivo en mano de profesoras**: Saldo total recaudado pendiente de rendición, discriminado por profesora.
  3. **Cuotas vencidas**: Cantidad de alumnos en mora y monto total exigible.
- Canales: Correo electrónico directo y tarjeta resumen destacada ("Daily Digest") al ingresar al panel de administración.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Desacoplamiento de tareas en segundo plano (uso de worker / cola de mensajería para no bloquear el hilo de la API web).
- **RNF-02**: Plantillas de correo responsive y profesionales, con enlaces directos para subir comprobante o ingresar al sistema.

---

## 5. Criterios de Aceptación

- **CA-01 (Aviso preventivo de cuota)**: Cuota que vence el día 10 dispara notificación al alumno o tutor el día 7.
- **CA-02 (No redundancia)**: Alumno que pagó su cuota antes del vencimiento no recibe avisos de cobro.
- **CA-03 (Despacho a tutor en menores)**: Alumno menor con cuota por vencer; el correo y notificación in-app se asignan al `id_usuario` del tutor.
- **CA-04 (Resumen diario consolidado)**: El informe matutino de la Propietaria contiene los montos exactos y no se envía si no hay novedades salvo configuración explícita.

---

## 6. Casos Borde y Errores

- Alumno sin correo electrónico cargado: la notificación se genera exclusivamente in-app y se registra advertencia en el log.
- Falla en el servidor de correo SMTP: reintento exponencial con registro en tabla `notificaciones.estado_envio = 'ERROR'`.

---

## 7. Fuera de Alcance

- Integración oficial de WhatsApp Business API con costo por mensaje en esta primera etapa (se prioriza In-App y Email).
