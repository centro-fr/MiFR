---
documento: presentacion-2
proyecto: MiFR
cliente: Centro de Entrenamiento FR (Florencia Romero, Perico, Jujuy)
materia: Seminario Integrador, UTN FRC, 2026
fecha_relevamiento: 2026-11-01
rama_relevada: nicolas
proposito: insumo para armar la segunda presentación (guion, filminas y demo) en otro chat
enfoque_pedido:
  - hacer hincapié en cómo funciona el sistema
  - mostrar el set de datos que usa el sistema
  - probar en vivo las fortalezas del sistema
  - limpiar la base de datos y cargar datos reales
estructura_pedida:
  - super síntesis de la presentación 1 (equipo, cliente y negocio)
  - explicación ampliada de todo el sistema con datos reales
---

# Presentación 2: MiFR funcionando con datos reales

## 0. Cómo usar este archivo

- Cada sección es autocontenida y tiene un ID (`S1`, `S2.3`, `F-04`, `D-02`) para referenciarla desde otro chat.
- Lo marcado **`[COMPLETAR]`** es un dato que no está en el repositorio y lo tiene que aportar el equipo o la clienta. No inventarlo.
- Lo marcado **`[ALERTA]`** es una diferencia entre lo dicho en la presentación 1 y lo que hoy hace el sistema, o un riesgo para la demo.
- Las cifras técnicas (endpoints, tests, permisos) se contaron sobre el código el 01/11/2026.
- Fuentes en el repo: `back/prisma/schema.prisma`, `back/src/shared/db/datos-demo.ts`, `back/src/modules/**`, `back/SPRINT-1.md` a `SPRINT-5.md`, `PRUEBAS-INTEGRACION.md`, `back/DESPLIEGUE.md`, `presentacion/guion-presentacion-mifr.md`.

### Pedido para el próximo chat (sugerido)

> Con este archivo, armá el guion de la presentación 2 (14 minutos, 7 oradores, 2 minutos cada uno) siguiendo la sección S7, y una checklist de demo en vivo a partir de S5. La síntesis de la presentación 1 no puede pasar de 2 minutos; el resto es el sistema funcionando con datos reales.

---

## S1. Síntesis de la presentación 1 (máximo 2 minutos en total)

### S1.1 El equipo

| Dato | Valor |
| :--- | :--- |
| Integrantes | 7 |
| Plazo | 3 meses, 5 sprints |
| Metodología | Scrum adaptado, desarrollo guiado por especificaciones (spec → diseño técnico → tareas → tests) |
| Backend | Francisco, Nicolas, Rosario |
| Resto del equipo | `[COMPLETAR]` nombres y rol de cada integrante (front, análisis, documentación, testing) |

Frase de apertura sugerida: *"Somos el equipo de MiFR. En la primera presentación les contamos el problema; hoy les mostramos el sistema funcionando con los datos reales del centro."*

### S1.2 La clienta y su negocio

- **Centro de Entrenamiento FR**, Perico (Jujuy). Sede única de unos 240 m².
- **Florencia Romero**: dueña y, a la vez, profesora. Por eso el sistema soporta que una persona tenga varios roles.
- Entre **50 y 75 alumnos** activos, **4 a 5 profesoras**, actividades grupales y entrenamiento personalizado.
- Las cuotas vencen **de fecha a fecha**, desde el día en que cada alumno empezó, no un día fijo del mes.
- Cada alumno queda **a cargo de una profesora**, y sus honorarios dependen de esos alumnos.

### S1.3 Problema → solución, en una línea cada uno

| Antes (papel) | Problema | MiFR |
| :--- | :--- | :--- |
| Cuaderno de la dueña | Honorarios y suplencias calculados a mano | Liquidación mensual calculada e informada |
| Cuaderno de cada profesora | Nadie ve quién vino ni quién dejó de venir | Asistencia en un toque, ausentes automáticos y alerta de inactividad |
| Tarjeta de cartón del alumno | Cuotas vencidas que nadie detecta | Estado de cuota calculado al momento: al día, por vencer, vencida |

Lema: **"Menos papeles, más entrenamiento."**

---

## S2. Cómo funciona el sistema (eje central)

### S2.1 Arquitectura en una imagen

```text
Navegador (celular o PC)
   │  React 19 + TypeScript + Vite + Tailwind + shadcn/ui
   ▼
Netlify (front)  ──/api/*──►  Render (API Node 22 + Express 5 + Zod + Prisma)  ──SSL──►  Neon (PostgreSQL 16)
```

- La API está organizada por **subsistemas de negocio** (usuarios, personas, servicio de entrenamiento, inscripciones y clases, cuotas y pagos, honorarios, notificaciones, insignias, rutinas y progreso, reportes, difusión pública).
- Los **cálculos de negocio son puros** (no tocan la base) y se prueban sin mocks: vencimiento de cuota, habilitación del alumno, honorarios, racha y ranking.
- **Lo que se calcula no se guarda**: el estado de la cuota se calcula cada vez que se consulta. Así no hay dos fuentes de verdad que se desincronicen.
- **108 operaciones** de API documentadas en Swagger (`/api/v1/docs`).

### S2.2 Roles: cada uno ve solo lo suyo

| Rol | Dispositivo típico | Qué hace |
| :--- | :--- | :--- |
| Propietaria | PC | Todo. Única con datos financieros, confirmación de pagos, honorarios, parámetros y matriz de permisos |
| Profesora | Celular | Toma asistencia, pre-inscribe y cobra en efectivo a sus alumnos, carga rutinas y progreso, ve sus honorarios |
| Alumno | Celular | Ve su cuota, informa transferencias, ve su rutina, racha, insignias y el ranking |
| Tutor | Celular | Lo mismo que el alumno, para el menor a su cargo |
| Visitante | Web pública | Actividades, horarios y cupos disponibles, sin iniciar sesión |

- Login con **Google**; no hay auto-registro: solo entra quien el centro dio de alta y pagó su primera cuota.
- **26 permisos** en 13 módulos, administrables por la propietaria desde una matriz. **8 son exclusivos** de la propietaria y no se pueden delegar (pagos, honorarios, cobranza, parámetros, seguridad).
- El sistema no permite quedarse **sin una propietaria activa**.

### S2.3 Ciclo de vida del alumno

```text
PRE-INSCRIPTA ──(primer pago confirmado)──► ACTIVA ──(baja lógica con motivo)──► BAJA
     │                                                            │
     └─ reserva el cupo DIAS_RESERVA_PREINSCRIPCION días           └─ se puede reactivar con su historial
```

1. **Pre-inscripción** (propietaria o profesora): datos del alumno, contacto de emergencia, plan, profesora y horarios. Si es **menor**, se asocia un **tutor**. Si la actividad lo pide (Personalizado), se cargan **peso y talla**.
2. El alumno queda `INACTIVO` y **sin acceso** hasta pagar. Su lugar se guarda 3 días desde la fecha de inicio (parámetro); después el cupo se libera.
3. **Primer pago confirmado** → en una sola transacción: la inscripción pasa a `ACTIVA`, el alumno y el tutor quedan `ACTIVO` y reciben su rol. O todo o nada.
4. **Baja lógica** con motivo: nada se borra, el historial se conserva. **Reactivar** a alguien que nunca pagó lo devuelve a pre-inscripto.

### S2.4 Cuotas y habilitación (de fecha a fecha)

- **Plan mensual**: vence el mismo día del mes siguiente. Si ese día no existe, el último del mes (31/01 → 28/02).
- **Clase suelta**: vence el mismo día de la clase, sin gracia.
- Estado calculado al consultar:

| Estado | Cuándo | ¿Puede asistir? |
| :--- | :--- | :--- |
| `AL_DIA` | Hasta el vencimiento, inclusive | Sí |
| `POR_VENCER` | Durante los días de gracia del plan (5 en los planes demo) | Sí |
| `VENCIDA` | Pasada la gracia | Según el parámetro `VENCIDOS_PUEDEN_ASISTIR` (por defecto sí, con advertencia). Si informó una transferencia pendiente, siempre puede |
| `PENDIENTE_DE_PAGO` | Nunca pagó | No |

- El precio que se cobra es **el vigente el día del cobro**: los precios se versionan con fecha de vigencia y nunca se pisan.
- Promociones temporales (porcentaje o monto fijo) asociables a uno o varios planes.

### S2.5 Pagos: dos canales

| Canal | Quién lo carga | Estado inicial | Qué pasa después |
| :--- | :--- | :--- | :--- |
| Efectivo | Profesora o propietaria | `CONFIRMADO` | Si cobró una profesora queda **pendiente de rendición** hasta que se lo entrega a la dueña |
| Transferencia informada | Alumno o tutor desde el celular | `PENDIENTE` | La propietaria la aprueba o rechaza (con motivo). Se marcan las que pasaron 24 horas |
| Transferencia recibida | Propietaria | `CONFIRMADO` | Para la primera cuota de un alumno nuevo, que todavía no puede entrar al sistema |

- **Rendición de efectivo**: listado por profesora con días sin rendir, rendición individual o en lote. Un cobro no se rinde dos veces.
- Comprobante de pago descargable.

### S2.6 Asistencia

1. La profesora abre **"clases de hoy"** en el celular. Cada inscripto aparece con el **estado de su cuota**.
2. Marca presente o ausente en **un toque**, o **"todos presentes"**.
3. Al cerrar la clase (botón o automático al terminar + `MINUTOS_CIERRE_ASISTENCIA`), los no marcados quedan **ausentes**.
   - El cierre automático solo genera ausentes si se marcó a alguien a mano: si nadie tomó asistencia, no inventa faltas.
4. La propietaria puede **cancelar** una clase sin marcas.
5. **Detección de inactivos**: alumnos con cuota al día y `INASISTENCIAS_CONSECUTIVAS_INACTIVO` faltas seguidas (3 por defecto). La propietaria registra el seguimiento (contactado, etc.), que deja de valer cuando el alumno vuelve.

### S2.7 Suplencias y honorarios

- **Suplencia**: se registra qué profesora cubrió la clase de otra. La suplente pasa a ser la dictante.
- **Liquidación mensual** por profesora, con estados `BORRADOR → CERRADA → PAGADA`. Una liquidación cerrada es una foto: no se recalcula.
- Conceptos del detalle:

| Concepto | Fórmula vigente |
| :--- | :--- |
| `ALUMNO_A_CARGO` | **Porcentaje (50 %) de lo cobrado en el mes** por cada inscripción a cargo de la profesora. Sin mínimo de alumnos |
| `CLASE_SUPLIDA` | Monto fijo por hora × horas de la clase, a favor de la suplente |
| `DESCUENTO_AUSENCIA` | El mismo monto, en negativo, a la titular que faltó |

- Las tarifas se versionan con vigencia; una tarifa por plan le gana a la general.
- El sistema **calcula e informa**; no paga. El total de cada liquidación se valida contra la suma de sus líneas.

> **[ALERTA] A-01.** En la presentación 1 se dijo *"un monto por cada alumno inscripto activo, asista o no"*. La regla implementada en el Sprint 5 es **el 50 % de lo efectivamente cobrado** de esos alumnos. Hay que contarlo así y, si corresponde, aclarar que la regla se ajustó con la clienta.

### S2.8 Notificaciones (in-app)

- **Cuota por vencer** (`DIAS_AVISO_VENCIMIENTO` días antes, 3 por defecto) y **cuota vencida**, al alumno o al tutor.
- **Bienvenida** y **clase cancelada**.
- **Resumen diario de la propietaria** (desde `HORA_RESUMEN_DIARIO`, 20:00 por defecto): transferencias pendientes (y las que pasaron 24 h), efectivo sin rendir por profesora y cuotas vencidas.
- No se duplican: la base impide generar dos veces el mismo aviso para la misma cuota.

### S2.9 Fidelización

- **Racha**: clases seguidas sin faltar (no se reinicia con el mes).
- **Insignias**: Racha de 10, Racha de 25, 50 clases, 100 clases, Mes perfecto, Podio del mes.
- **Ranking de asistencia** por porcentaje, con un mínimo de clases (`RANKING_MINIMO_CLASES`, 4).

### S2.10 Rutinas y progreso

- La profesora carga la **rutina** del alumno (una vigente por alumno) y **mediciones** (peso, cintura, etc.).
- El alumno o su tutor la consultan desde el celular. Las mediciones se corrigen con trazabilidad y se dan de baja de forma lógica.

### S2.11 Reportes

Asistencia, cuotas vencidas, cobranza por período, ocupación de horarios (mapa de calor), estadísticas de planes, inscriptos por mes y ranking.

### S2.12 Parámetros que configura la dueña

| Clave | Valor inicial | Para qué |
| :--- | :--- | :--- |
| `DATOS_BANCARIOS_CBU` / `_ALIAS` / `_TITULAR` | vacío | Datos que ve el alumno para transferir |
| `VENCIDOS_PUEDEN_ASISTIR` | `true` | Política con cuotas vencidas |
| `MINUTOS_CIERRE_ASISTENCIA` | `0` | Tolerancia para marcar después de la clase |
| `DIAS_RESERVA_PREINSCRIPCION` | `3` | Cuánto guarda el cupo una pre-inscripción sin pagar |
| `DIAS_AVISO_VENCIMIENTO` | `3` | Anticipación del aviso de cuota |
| `INASISTENCIAS_CONSECUTIVAS_INACTIVO` | `3` | Faltas seguidas para considerar inactivo |
| `HORA_RESUMEN_DIARIO` | `20:00` | Hora del resumen de la propietaria |
| `RANKING_MINIMO_CLASES` | `4` | Clases mínimas para entrar al ranking |

---

## S3. El set de datos que usa el sistema

### S3.1 Modelo de datos (PostgreSQL, 34 migraciones)

| Grupo | Tablas | Nota |
| :--- | :--- | :--- |
| Identidad y acceso | `usuarios`, `roles`, `usuario_roles`, `permisos`, `rol_permisos` | Un usuario puede tener varios roles. Menores sin email |
| Servicio de entrenamiento | `actividades`, `profesoras`, `horarios`, `planes`, `plan_precios`, `promociones`, `promocion_planes`, `parametros_sistema` | Precios versionados; bajas lógicas |
| Personas del negocio | `alumnos`, `inscripciones`, `inscripcion_horarios` | Tutor obligatorio si es menor |
| Clases y asistencia | `clases`, `suplencias`, `asistencias`, `seguimientos_inactividad` | |
| Cuotas y pagos | `cuotas`, `pagos` | La cuota **no tiene columna de estado**: se calcula |
| Rutinas y progreso | `rutinas`, `registros_progreso`, `tipos_medida`, `medidas_corporales` | |
| Notificaciones e insignias | `notificaciones`, `insignias`, `alumno_insignias` | |
| Honorarios | `tarifas_honorario`, `liquidaciones`, `liquidacion_detalles` | |

Principios para contar: **bajas lógicas** (nada se borra), **historial versionado** (precios y tarifas con vigencia), **restricciones en la base** (checks y únicos como última defensa), **datos derivados que no se guardan** (habilitación, racha, reserva de cupo).

### S3.2 Datos de catálogo (los carga siempre el seed, también en producción)

- 4 roles: `PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`.
- 26 permisos y la matriz inicial por rol.
- 10 parámetros con su valor inicial (S2.12).
- 6 insignias (S2.9).

### S3.3 Datos de demostración actuales (ficticios, solo base local)

Los carga `pnpm --filter back db:seed:demo`. Son los mismos que usan los tests de integración.

**Profesoras:** Marina Sosa (propietaria + profesora, `marina.sosa@example.com`), Lucía Gómez, Carla Ruiz.

**Actividades (8):** Funcional, Funcional +45, Kid Fit, Personalizado (cupo 4, pide peso y talla), HIIT, GAP, Training, Combat. Las grupales con cupo 12.

**Grilla:** 38 clases semanales de una hora. Lunes, miércoles y viernes: 08, 09, 15, 16, 19, 20, 21 y 22 h. Martes y jueves: 09, 15, 16, 17, 18, 19 y 20 h. Sábado sin clases. El Training del viernes tiene cupo propio de 15.

**Planes (precios desde 01/01/2026):** Básico 2×sem $25.000 · Intermedio 3×sem $30.000 · Personalizado 2 días $45.000 (exclusivo de Personalizado, profesora única) · Clase suelta $6.000.

**Alumnos:** Sofía Medina (pre-inscripta, Básico) · Mateo Romero (menor, tutora Paula Romero, pre-inscripto, Personalizado) · Valentina Herrera (activa, Intermedio, primera cuota pagada en efectivo sin rendir).

> **[ALERTA] A-02.** Los datos demo **no son del centro**: nombres inventados, teléfonos con característica 3794 (Corrientes, no Jujuy) y actividades que no coinciden del todo con las que se nombraron en la presentación 1 (Cross y Ritmos no están). Para esta presentación no deben usarse.

> **[ALERTA] A-03.** El seed demo carga la tarifa `ALUMNO_A_CARGO` como **monto fijo de $3.000**, pero la regla vigente solo acepta **porcentaje**. Con esos datos la liquidación sale con advertencias `TARIFA_NO_APLICABLE` y en $0 para alumnos a cargo. `SPRINT-5.md` lo registra como pendiente ("falta actualizar los datos de demo"). Con datos reales hay que cargar la tarifa del 50 % por profesora (S4.3, paso 6).

### S3.4 Datos reales que hay que pedirle a Florencia

| # | Dato | Para qué | Formato |
| :- | :--- | :--- | :--- |
| D-01 | Email de Google de Florencia, nombre, apellido y fecha de nacimiento | Primera propietaria (seed) | `email@gmail.com`, `AAAA-MM-DD` |
| D-02 | Profesoras: nombre, apellido, DNI, email de Google, teléfono, especialidad | Alta de profesoras | Una fila por persona |
| D-03 | Actividades: nombre, modalidad (grupal / personalizada), cupo, si pide peso y talla | Catálogo de actividades | `[COMPLETAR]` lista real |
| D-04 | Grilla semanal: día, hora inicio y fin, actividad, profesora | Horarios | Lunes a sábado, 07:00 a 23:00 |
| D-05 | Planes: nombre, mensual o clase suelta, clases por semana, días de gracia, precio vigente y desde cuándo | Planes y precios | `[COMPLETAR]` precios 2026 |
| D-06 | Alumnos: nombre, apellido, DNI, fecha de nacimiento, email (si es mayor), contacto de emergencia, plan, profesora, horarios, fecha de inicio | Pre-inscripción | Una fila por alumno |
| D-07 | Tutores de los menores: nombre, apellido, DNI, email, teléfono | Asociación tutor-alumno | |
| D-08 | Último pago de cada alumno: fecha, monto, efectivo o transferencia | Alta definitiva y estado de cuota | |
| D-09 | Datos bancarios (CBU, alias, titular) | Parámetros | |
| D-10 | Tarifas: porcentaje por alumno a cargo (50 %) y monto por hora de suplencia, por profesora | Honorarios | |
| D-11 | Opcional: asistencias y suplencias de un mes cerrado | Mostrar liquidación, racha e inactivos | Cuaderno de la profesora |

> **Consentimiento y privacidad.** Son datos personales (DNI, fechas de nacimiento, datos de menores). Pedir autorización escrita a Florencia para usarlos en la demo, y proyectar en pantalla con **DNI y teléfonos enmascarados**, o con un subconjunto anonimizado (nombres de pila e inicial). Marco: Ley 25.326 de Protección de Datos Personales.

---

## S4. Limpiar la base y cargar los datos reales

### S4.1 Qué base usar

| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **Base local (Docker)** — recomendada para la demo | Se puede resetear sin riesgo; no depende de la red | Hay que llevar la notebook preparada |
| Neon (producción) | Es el sistema "de verdad"; accesible por QR | `migrate reset` está **prohibido** ahí; Neon y Render se duermen sin uso (primer pedido lento) |

Recomendación: ensayar y presentar sobre la **base local** cargada con los datos reales. Si se quiere mostrar producción, despertarla unos minutos antes (`/health`).

### S4.2 Limpiar (base local)

```bash
docker compose up -d db
pnpm --filter back exec prisma migrate reset --force --skip-seed   # borra todo y vuelve a aplicar las 34 migraciones
pnpm --filter back db:seed -- <email-google-florencia> Florencia Romero <AAAA-MM-DD>   # roles, permisos, parámetros, insignias y la propietaria
```

- **No correr `db:seed:demo`**: volvería a cargar los datos ficticios.
- El seed demo se niega a correr contra una base que no sea local; el seed principal no.
- Para entrar sin Google en local: `LOGIN_DESARROLLO=true` en `back/.env` y `VITE_LOGIN_DESARROLLO=true` en `front/.env`. Para mostrar el login real con Google, configurar `GOOGLE_CLIENT_ID` (ver README).

### S4.3 Orden de carga (por la aplicación, no por SQL)

Cargar por la interfaz o la API hace que cada dato pase por las mismas validaciones que en el uso diario, y eso ya es una prueba de fortaleza.

1. **Parámetros**: datos bancarios y políticas (D-09).
2. **Profesoras** (D-02). Florencia también como profesora: un solo usuario con dos roles.
3. **Actividades** (D-03).
4. **Horarios** (D-04): el sistema rechaza superposiciones de una profesora y horarios fuera de 07:00–23:00.
5. **Planes y precios** (D-05), con fecha de vigencia.
6. **Tarifas de honorarios** (D-10): `ALUMNO_A_CARGO` porcentaje 50 y `HORA_SUPLENCIA` monto fijo, por profesora.
7. **Pre-inscripciones** (D-06, D-07), con tutor para los menores.
8. **Primer pago** de cada alumno (D-08): efectivo, o "transferencia recibida". Esto activa al alumno.
9. Opcional: **asistencias y suplencias** del mes (D-11), para mostrar liquidación, racha e inactivos.

> **[ALERTA] A-04.** No existe una importación masiva (CSV/Excel). Con 50–75 alumnos, cargar todo a mano lleva tiempo. Opciones: (a) cargar un **subconjunto representativo** (todas las actividades, profesoras y planes reales, y 10–15 alumnos); (b) escribir un script de carga que llame a la API con los datos de una planilla, para que respete las validaciones. Decidir antes de ensayar `[COMPLETAR]`.

> **[ALERTA] A-05.** Las cuotas se generan con el pago. Si se carga hoy el último pago de cada alumno con su fecha real, el estado de cuota (al día / por vencer / vencida) va a reflejar la realidad del centro; conviene verificar que el endpoint acepte la fecha de pago pasada `[COMPLETAR: verificar]`.

---

## S5. Fortalezas del sistema y cómo probarlas en vivo

Cada fortaleza tiene un ID, la acción en la demo y el resultado que tiene que ver el jurado.

| ID | Fortaleza | Acción en vivo | Resultado esperado |
| :- | :--- | :--- | :--- |
| F-01 | Multi-rol real | Entrar como Florencia | Ve el menú de propietaria y además "mis clases" como profesora, sin cambiar de cuenta |
| F-02 | Cada rol ve solo lo suyo | Entrar como una profesora e intentar ver honorarios de otra o pagos | No aparece en el menú; por API responde 403 |
| F-03 | Sin auto-registro | Intentar entrar con un email no dado de alta | Rechazado |
| F-04 | Cuota de fecha a fecha | Mostrar un alumno que pagó el 31 | Vence el último día del mes siguiente |
| F-05 | Estado calculado al momento | Lista de alumnos filtrada por estado de cuota | Al día, por vencer y vencidos según la fecha de hoy |
| F-06 | Primer pago atómico | Cobrar en efectivo a un pre-inscripto | Pasa a activo, recibe su rol y puede entrar, todo en un paso |
| F-07 | Transferencia con control | Alumno informa una transferencia desde el celular → propietaria la aprueba | Aparece en pendientes, luego confirmada |
| F-08 | Rendición de efectivo | Ver efectivo pendiente por profesora → rendir | Totales por profesora; no se puede rendir dos veces |
| F-09 | Asistencia en un toque | Profesora abre la clase de hoy y marca | Cada alumno con su estado de cuota al lado; al cerrar, los no marcados quedan ausentes |
| F-10 | Cupo protegido | Pre-inscribir en un horario lleno | 409: el sistema no sobrevende cupos, ni con dos pedidos simultáneos |
| F-11 | Detección de inactivos | Informe de alumnos inactivos | Alumnos al día que faltaron 3 veces seguidas |
| F-12 | Honorarios automáticos | Generar la liquidación del mes de una profesora | Detalle por alumno (50 % de lo cobrado), suplencias a favor y descuentos, total validado |
| F-13 | Historial que no se pierde | Cambiar el precio de un plan con fecha futura | El precio viejo sigue para cobros previos; el nuevo rige desde su fecha |
| F-14 | Resumen diario | Abrir el resumen de la propietaria | Transferencias pendientes, efectivo sin rendir y vencidas en una pantalla |
| F-15 | Portal del alumno | Entrar como alumno o tutor | Cuota, rutina, racha, insignias y ranking |
| F-16 | Web pública | Abrir la página sin sesión (o por QR) | Actividades, días y cupos disponibles |
| F-17 | Validación estricta | Cargar un DNI con puntos, una fecha inexistente o un monto negativo | 400 con mensaje claro, nunca un error 500 |

Fortalezas de ingeniería para mencionar (no se demuestran en vivo):

- **Calidad**: 135 archivos de tests unitarios con **100 % de cobertura** en el back, 19 archivos de tests de integración contra PostgreSQL real y **75 casos de integración** documentados (PI-01 a PI-82) en `PRUEBAS-INTEGRACION.md`.
- **Seguridad**: login con Google con email verificado, JWT propio, permisos verificados en el servidor, 8 permisos no delegables, bloqueos de base para cupos y cobros concurrentes, headers de seguridad (Helmet), CORS restringido en producción, validación con Zod en cada ruta.
- **Contrato explícito**: 108 operaciones documentadas en OpenAPI/Swagger, con un test que falla si una ruta no está documentada.
- **Diseño**: arquitectura por capas que sigue el diagrama de componentes; cálculos de negocio puros y testeables; patrón Strategy para el vencimiento según el tipo de plan.

---

## S6. Guion de la demo (recorrido sugerido, unos 6 minutos)

Preparar antes: base local limpia con datos reales (S4), tres pestañas abiertas (Florencia en PC, una profesora y un alumno en vista celular), y la fecha del sistema conocida.

1. **Web pública** (F-16): "esto ve alguien que todavía no es alumno".
2. **Login de Florencia** (F-01, F-03): menú completo y sus clases.
3. **Datos reales del centro**: actividades, grilla semanal y planes con sus precios (S3.4).
4. **Alumnos**: listado filtrado por estado de cuota (F-05). Abrir una ficha con historial de pagos.
5. **Pre-inscripción en vivo** de un alumno nuevo (consentido) → **cobro en efectivo** → queda activo (F-06).
6. **Profesora en el celular**: clase de hoy, marcar asistencia, cerrar (F-09).
7. **Alumno en el celular**: su cuota, informar transferencia (F-07), racha e insignias (F-15).
8. **Florencia**: aprobar la transferencia, ver efectivo pendiente y rendir (F-08), resumen diario (F-14).
9. **Honorarios**: liquidación del mes con el detalle (F-12).
10. **Cierre de la demo**: un error de validación a propósito (F-17) para mostrar robustez.

Plan B: si falla la red o Google, usar el login de desarrollo en local; si falla todo, capturas en `presentacion/recursos/capturas/` (en la rama `nuevo/presentacion-filmina-mifr`).

---

## S7. Estructura propuesta de la presentación 2 (14 minutos, 7 oradores)

| Bloque | Tiempo | Contenido | Secciones de este archivo |
| :- | :- | :--- | :--- |
| 1 | 0:00–2:00 | Equipo, clienta y negocio, problema → solución (síntesis) | S1 |
| 2 | 2:00–4:00 | Cómo funciona: arquitectura, roles y ciclo de vida del alumno | S2.1–S2.3 |
| 3 | 4:00–6:00 | El set de datos: modelo, catálogos, por qué los demo no sirven, datos reales cargados | S3, S4 |
| 4 | 6:00–8:00 | Demo parte 1: pública, login, datos reales, alumnos, pre-inscripción y cobro | S6 pasos 1–5 |
| 5 | 8:00–10:00 | Demo parte 2: asistencia, portal del alumno, transferencias, rendición | S6 pasos 6–8 |
| 6 | 10:00–12:00 | Demo parte 3: honorarios y reportes + fortalezas de ingeniería | S6 pasos 9–10, S5 |
| 7 | 12:00–14:00 | Estado final, pendientes, impacto para el centro y preguntas | S8 |

---

## S8. Estado del desarrollo al 01/11/2026

| Sprint | Tema | Estado back |
| :- | :--- | :--- |
| 1 | Autenticación, permisos, actividades y horarios (US-01 a US-04) | Completo |
| 2 | Planes, precios, alumnos e inscripciones (US-05 a US-12) | Completo |
| 3 | Pagos, habilitación, asistencia e inasistencias (US-15 a US-18, US-20, US-21) | Completo |
| 4 | Promociones, rendición, resumen diario, inactivos, suplencias, avisos, honorarios (US-13, US-19, US-22 a US-26) | Completo |
| 5 | Honorarios 50 %, rutinas y progreso, ranking, insignias, reportes (US-23, US-27, US-28, US-30, US-31, US-33 a US-37) | Completo |

Pendientes conocidos:

- Datos demo de honorarios desactualizados (A-03).
- Exportación de informes a PDF/Excel: no está en el back.
- Devoluciones y reversos de pagos: decididos (`back/honorarios-pendientes.md`), no implementados.
- Actualizar diagramas de Enterprise Architect de US-13, US-20, US-22, US-24, US-25 y US-26.
- Integración del front con todos los módulos: `[COMPLETAR: verificar qué pantallas están conectadas a la API]`.
- Despliegue en Netlify, Render y Neon: `[COMPLETAR: confirmar si ya está publicado]`.
- Fuera de alcance por decisión: facturación con ARCA, pasarela de pagos, registro de egresos.

---

## S9. Glosario rápido

| Término | Significado en MiFR |
| :--- | :--- |
| Pre-inscripción | Alta inicial del alumno; reserva cupo pero no da acceso |
| Alta definitiva | Paso a `ACTIVA` al confirmarse el primer pago |
| Habilitación | Estado de cuota calculado al momento (no se guarda) |
| Rendición | Entrega a la dueña del efectivo que cobró una profesora |
| Liquidación | Informe mensual de honorarios por profesora |
| Suplencia | Clase dictada por una profesora distinta de la titular |
| Racha | Clases seguidas sin faltar |
| Baja lógica | El registro se marca de baja pero no se borra |
