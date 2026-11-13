# Tareas de Implementación: Notificaciones y Alertas

> **Cambios del 13/11/2026.** US-26 (resumen diario) y el aviso de clase cancelada se retiraron, y los avisos de cuota suman push al celular: ver `spec.md`. Lo que sigue sobre US-26 queda como registro.

Tareas técnicas, secuenciales y verificables para la épica **Notificaciones y Alertas** (US-25 y US-26).

---

## Fase 1: Base de Datos y Configuración

- [ ] **1.1. Tabla `notificaciones`**
  - Crear script de migración SQL para la tabla `notificaciones` e índices de consulta rápida.
  - *Criterio de verificación*: Esquema validado en base de datos.

- [ ] **1.2. Configuración de transporte de emails**
  - Configurar servicio SMTP en el backend y variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
  - *Criterio de verificación*: Script de prueba que despache un correo electrónico de prueba.

---

## Fase 2: Backend – Cron Jobs y Despacho de Mensajes

- [ ] **2.1. Cron Job de Vencimiento de Cuotas (US-25)**
  - Implementar consulta diaria para cuotas a 3 días de vencer, vencidas hoy o que superaron días de gracia.
  - Generar notificación In-App y enviar email al alumno o tutor.
  - Aplicar control de idempotencia para no duplicar avisos.
  - *Criterio de verificación*: Ejecutar el cron manualmente contra cuotas de prueba y verificar inserción en tabla `notificaciones`.

- [ ] **2.2. Cron Job y Servicio de Resumen Diario para la Propietaria (US-26)**
  - Implementar consulta consolidada de transferencias pendientes, efectivo sin rendir y deudores.
  - Formatear correo matutino y endpoint `GET /notificaciones/resumen-diario`.
  - *Criterio de verificación*: Disparar resumen y verificar que los montos coincidan exactamente con la base de datos.

- [ ] **2.3. Endpoints de Notificaciones In-App**
  - Implementar endpoints para listar no leídas y marcar lectura.
  - *Criterio de verificación*: Petición que marca una notificación como leída y actualiza el contador.

---

## Fase 3: Frontend – Componentes de Notificaciones y Digest

- [ ] **3.1. Campanita de Notificaciones en Navbar**
  - Componente dropdown con badge contador rojo de notificaciones sin leer.
  - Listado de mensajes con timestamp relativo ("hace 2 horas") y botón de marcar leída.
  - *Criterio de verificación*: Al hacer clic en una notificación, disminuye el contador en tiempo real.

- [ ] **3.2. Widget de Resumen Diario en Dashboard de la Propietaria (US-26)**
  - Tarjeta en la parte superior del dashboard con los 3 bloques principales y accesos directos (ej: "4 transferencias pendientes -> Ir a revisar").
  - *Criterio de verificación*: El widget renderiza los datos dinámicos al iniciar sesión la Propietaria.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01 y CA-02**: Generación del aviso preventivo de cuota y verificación de no envío si está al día.
- [ ] **4.2. Verificación CA-03**: Comprobación de recepción en la cuenta del tutor para menores de edad.
- [ ] **4.3. Verificación CA-04**: Generación del resumen matutino para la Propietaria con los 3 bloques informativos.
