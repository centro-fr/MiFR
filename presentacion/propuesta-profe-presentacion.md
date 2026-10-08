# MiFR — Presentación de avance
### Seminario Integrador · UTN FRC · 3K2 · Duración total: 14 minutos

> **Ejes evaluados:** 1) Problemática (Estudio Inicial) · 2) **Producto (eje central)** · 3) Organización del proyecto
> **Hilo conductor:** *"Un negocio que creció más rápido que su cuaderno."*
> **Distribución:** la problemática se cuenta rápido para justificar el producto, el producto ocupa más de la mitad del tiempo y la organización muestra evidencia concreta.

---

## Guion de tiempos

| Bloque | # | Diapositiva | Tiempo | Acumulado |
|---|---|---|---|---|
| Apertura | 1 | Portada + gancho | 0:30 | 0:30 |
| **1. Problemática** · 2:30 | 2 | La organización y cómo funciona hoy | 1:20 | 1:50 |
| | 3 | Problemas, oportunidades y por qué a medida | 1:10 | 3:00 |
| **2. Producto** · 7:30 | 4 | MiFR: objetivo y roles | 0:45 | 3:45 |
| | 5 | Alcance: 12 épicas, 37 US | 0:50 | 4:35 |
| | 6 | Trazabilidad: problema → US | 0:55 | 5:30 |
| | 7 | Las reglas del negocio dentro del sistema | 1:15 | 6:45 |
| | 8 | Un día con MiFR: recorrido por rol | 1:30 | 8:15 |
| | 9 | Modelo de datos y estados | 1:00 | 9:15 |
| | 10 | Ejemplo completo de una US | 0:35 | 9:50 |
| | 11 | Requerimientos no funcionales + arquitectura | 0:40 | 10:30 |
| **3. Organización** · 2:30 | 12 | Scrum adaptado al equipo | 1:15 | 11:45 |
| | 13 | Story Map + resultado del Sprint 1 | 1:15 | 13:00 |
| Cierre | 14 | Próximos pasos + preguntas | 1:00 | 14:00 |

**Oradores sugeridos:** 4 personas. Una cubre Problemática, dos se reparten Producto (diapositivas 4–7 y 8–11) y una cubre Organización y cierre.

---

# APERTURA

## Diapositiva 1 — Portada + gancho (0:30)

**En pantalla**
- Logo FR + **MiFR — Gestión del Centro de Entrenamiento FR**
- UTN FRC · Seminario Integrador · 3K2 · 2026 · Equipo (7 integrantes)

**Qué decir**
> "75 alumnas, 7 disciplinas y toda la administración en un cuaderno, una tarjeta de cartón y WhatsApp. Les vamos a mostrar el sistema que lo reemplaza."

---

# BLOQUE 1 — PROBLEMÁTICA (Estudio Inicial) · 2:30

## Diapositiva 2 — La organización y cómo funciona hoy (1:20)

**En pantalla** — izquierda, una ficha; derecha, un diagrama:

| | |
|---|---|
| 📍 | Perico, Jujuy · sede única · ~240 m² |
| 👥 | 50 → 75 alumnos en un año · 4 → 5 profesoras |
| 🏋️ | 7 disciplinas, grupales y personalizadas |
| 💳 | Planes por frecuencia semanal, **atados a una profesora** |

**Los 4 soportes desconectados:**
📓 Cuaderno de la dueña · 📒 Cuaderno de cada profe · 🎫 Tarjeta de cartón · 💬 WhatsApp

**Qué decir**, contado como una escena:
> "Hora pico: 15 personas en la puerta. Atiende la profe de turno: cobra, tacha círculos y a quien vino sin tarjeta lo controla de memoria. Las transferencias quedan en algún chat. A fin de mes, la dueña reconstruye todo a mano."

---

## Diapositiva 3 — Problemas, oportunidades y por qué a medida (1:10)

**En pantalla** — tres franjas:

**❌ Problemas:** vencimientos que no se detectan · asistencia sin historial · pagos que se pierden · honorarios calculados a mano

**✅ Oportunidades:** progreso visible para la alumna, que funciona como marketing · detección de quienes dejan de venir

**🔍 ¿Por qué no Mindbody, Glofox, Trainingym o GymMaster?** Ninguno modela la regla central: **plan = profesora + frecuencia**, con honorarios por alumno a cargo.

**Remate** (cita de la dueña):
> *"Control de vencimiento, control de asistencia y planillas de pago."*

**Transición:** "Con esas tres prioridades diseñamos MiFR."

---

# BLOQUE 2 — PRODUCTO · 7:30

## Diapositiva 4 — MiFR: objetivo y roles (0:45)

**En pantalla**
> **Objetivo:** un sistema web que centraliza alumnos, planes, pagos, asistencia y honorarios en **un único registro compartido**, donde cada rol ve solo lo que le corresponde.

| Rol | Dispositivo | Qué hace |
|---|---|---|
| 👑 Responsable del centro | PC de recepción / casa | Todo; es el único rol con datos financieros |
| 🧑‍🏫 Profesora | Celular | Asistencia, cobros en efectivo, rutinas |
| 📱 Alumno / Tutor | Celular | Cuota, clases, transferencias, progreso |
| 🌐 Visitante | Cualquiera | Panel público de cupos y promociones |

**Remarcar:** una persona puede tener **varios roles**. La dueña, por ejemplo, también dicta clases.

---

## Diapositiva 5 — Alcance: 12 épicas, 37 US (0:50)

**En pantalla** — pirámide de tres niveles:

**🔴 Núcleo:** las 3 prioridades del cliente
- Pagos y Cuotas (US-15 a 19)
- Asistencia (US-20 a 22)
- Honorarios (US-23, 24)

**🟡 Base operativa**
- Autenticación y Seguridad · Actividades y Cupos · Alumnos e Inscripciones · Planes y Precios · Notificaciones

**🟢 Valor agregado**
- Rutina y Progreso · Portal del Alumno (racha, insignias, ranking) · Panel público · Reportes y mapa de calor

**Fuera de alcance, por decisión explícita:** facturación con ARCA, pasarela de pagos y registro de egresos.

---

## Diapositiva 6 — Trazabilidad: problema → US (0:55)

**En pantalla:**

| Problema del Estudio Inicial | Respuesta del producto | US |
|---|---|---|
| Vencimientos no detectados | Estado de cuota automático y avisos | US-18, 25, 34 |
| Pagos perdidos | Transferencia informada y aprobada; efectivo pendiente de rendición | US-15, 16, 17, 19 |
| Asistencia en cartón | Lista por clase en el celular de la profe | US-20, 21 |
| Fuga de alumnos | Alerta de inactivos con cuota al día | US-22 |
| Honorarios a mano | Informe mensual automático con suplencias | US-23, 24 |
| Progreso invisible (oportunidad) | Portal del alumno con rutina, peso y racha | US-27 a 31 |

**Qué decir:** "Cada problema relevado tiene al menos una historia de usuario que lo resuelve."

---

## Diapositiva 7 — Las reglas del negocio dentro del sistema (1:15)

> Esta es la diapositiva que demuestra que el producto **es a medida**: cada regla sale de la entrevista.

**En pantalla** — 5 reglas, cada una con un ejemplo concreto:

1. **Plan = profesora + frecuencia.** Si un alumno entrena con dos profes, contrata dos planes. Así no hay que repartir honorarios.
2. **Vencimiento de fecha a fecha.** Si paga el 20, vence el 20 del mes siguiente. Si paga el 31 y el mes siguiente no tiene 31, vence el último día.
3. **Días de gracia configurables**, con tres estados: al día, por vencer y vencida. La clase suelta no tiene gracia y vence al terminar la clase.
4. **Honorarios por alumno inscripto, asista o no.** La suplencia suma a quien cubrió y descuenta a quien faltó.
5. **Cupo obligatorio solo en clases personalizadas.** En las grupales es opcional, como en HIIT.

**Qué decir:** "Un sistema genérico no puede hacer esto sin adaptaciones. Para MiFR, estas reglas son el centro del diseño."

---

## Diapositiva 8 — Un día con MiFR: recorrido por rol (1:30)

> La misma escena de la diapositiva 2, ahora con el sistema. **Ideal: mostrar las pantallas del punto 5.2 o una demo.**

**En pantalla** — tres capturas o mockups, una por rol:

**📱 18:55 — La alumna** (Panel del alumno, US-29/31)
Ve que su cuota vence en 3 días, su próxima clase y su racha de asistencia. Informa una transferencia con monto y fecha (US-16).

**📱 19:00 — La profesora** (Panel de asistencia, US-20/21/15)
Abre la lista de su clase y marca presentes. A la alumna mayor que vino sin celular la marca ella. Registra un cobro en efectivo. Al cerrar la clase, quienes no se marcaron quedan como ausentes.

**💻 21:00 — La dueña** (Panel de administración, US-17/19/26)
Aprueba la transferencia y el alumno pasa a "al día". Ve cuánto efectivo debe rendir cada profe. Recibe el resumen diario con pendientes y vencidos.

**Qué decir:** "Las mismas tres personas y la misma hora pico, pero ahora sin cuaderno ni WhatsApp."

---

## Diapositiva 9 — Modelo de datos y estados (1:00)

**En pantalla** — izquierda, un extracto simplificado del diagrama de clases; derecha, dos diagramas de estado.

**Entidades principales:**
```
Persona ──< Rol
   │
Alumno ──< Inscripción >── Plan ── Actividad ── Profesora
   │            │                      │
 Tutor        Cuota ──< Pago         Horario ──< Asistencia
```

**Estados del alumno**
```
Pendiente ──(1er pago confirmado, US-07)──► Activo ──(baja lógica, US-08)──► Baja
                                              ▲                                │
                                              └────────(reactivación)──────────┘
```

**Estados del pago por transferencia**
```
Pendiente de confirmación ──(US-17)──► Aprobado
                          └──(US-17)──► Rechazado
```

**Estados de la cuota (US-18):** Al día → Por vencer → Vencida

**Qué decir:** "La baja es lógica: el historial nunca se pierde. Y cada cambio de estado está asociado a la US que lo provoca."

---

## Diapositiva 10 — Ejemplo completo de una US (0:35)

**En pantalla** — la ficha de **US-18, Cálculo del estado de habilitación**, como muestra del nivel de especificación:

| Criterio de aceptación | Prueba | Resultado esperado |
|---|---|---|
| Plan mensual con días de gracia | Plan dentro del período de gracia | "Por vencer" ✅ |
| Clase suelta sin gracia | Al día siguiente de la clase | "Vencida" ✅ |
| Cupo en clases personalizadas | Inscripción sin cupo disponible | Bloqueada ✅ |

**Qué decir:** "Las 37 US tienen descripción, criterios de aceptación y casos de prueba que pasan y que fallan."

---

## Diapositiva 11 — Requerimientos no funcionales + arquitectura (0:40)

**En pantalla:**

| RNF | De dónde sale |
|---|---|
| 📱 Responsive, mobile-first | El 95% de los usuarios usa celular |
| ⚡ 15 usuarios concurrentes | Es la cantidad de personas en la hora pico |
| 🔐 Google Auth y permisos por rol | Solo la dueña ve las finanzas |
| 🧓 Asistencia sin celular del alumno | Hay adultos mayores que no lo usan |

```
React + TS · Tailwind · Shadcn  ──HTTPS──►  Node + Express · Zod · Prisma  ──►  PostgreSQL
     (celulares y PC)                         (API REST en la nube)
```

**Transición:** "Para construir todo esto, nos organizamos así."

---

# BLOQUE 3 — ORGANIZACIÓN DEL PROYECTO · 2:30

## Diapositiva 12 — Scrum adaptado al equipo (1:15)

**En pantalla** — tres columnas:

**🔄 Método**
- Scrum, porque el alcance surgió de un relevamiento progresivo
- Sprints de 2 semanas: Planning (2 h), Review (1 h) y Retro (1 h)
- Reuniones por Discord dos veces por semana

**👥 Equipo**
- PO: Francisco Andrade
- SM: Adriel Coria (rol rotativo)
- 7 developers organizados en duplas con un referente
- **76 h por semana** de capacidad

**🧰 Acuerdos y herramientas**
- Trello · GitHub (ramas y revisión de la dupla) · Drive · WhatsApp
- Regla de las 2 horas: si alguien se traba, pide ayuda
- Uso de IA (Copilot, Claude, Gemini, Stitch), siempre con revisión humana

---

## Diapositiva 13 — Story Map + resultado del Sprint 1 (1:15)

**En pantalla** — línea de tiempo:

| Sprint | Foco | US |
|---|---|---|
| **1** ✅ | Autenticación, permisos, actividades y horarios | 01–04 |
| **2** | Planes y ciclo de vida del alumno | 05–12 |
| **3** | Pagos y asistencia (el núcleo) | 15–18, 20, 21 |
| **4** | Honorarios, rendición y alertas | 13, 19, 22–26 |
| **5** | Portal, reportes y fidelización | 14, 27–37 |

**Sprint 1 (22/09 – 06/10): 4 de 4 US completadas.** Si se puede, hacer una demo de 30 segundos: login, crear una actividad y asignarla a una profe.

**Qué decir:** "El orden sigue las dependencias: sin profesoras y horarios no hay planes, sin planes no hay alumnos y sin alumnos no hay cobros."

---

# CIERRE

## Diapositiva 14 — Próximos pasos + preguntas (1:00)

**En pantalla:**
> **Problema:** un negocio que creció más rápido que su cuaderno.
> **Producto:** un solo sistema, con las reglas reales del negocio, para dueña, profes y alumnos.
> **Proyecto:** 5 sprints, 1 ya entregado.

**Qué decir:** "La dueña definió el éxito: que en seis meses no haya cuotas atrasadas ni fuga de alumnos. MiFR está diseñado para medir exactamente eso. ¿Preguntas?"

---

## Preguntas probables del jurado (enfocadas en producto)

| Pregunta | Respuesta preparada |
|---|---|
| ¿Qué pasa si un alumno paga por transferencia y la dueña no la aprueba? | Queda "pendiente de confirmación". En una renovación puede seguir asistiendo; si es un alumno nuevo, no se activa hasta la aprobación. |
| ¿Cómo distinguen al alumno del tutor? | El usuario del sistema es el tutor (US-06) y el menor queda asociado a él. |
| ¿Por qué Google Auth? | Evita gestionar contraseñas. Quien no usa celular no necesita cuenta, porque la profe lo marca. |
| ¿Cómo calculan la racha y el ranking? | La racha cuenta clases seguidas sin faltar. El ranking ordena por el porcentaje de asistencia sobre las clases previstas en el plan. |
| ¿Cómo manejan los cambios de precio? | Con fecha de vigencia: las cuotas ya cobradas no se modifican (US-12). |
| ¿Por qué web y no una app nativa? | Es un solo desarrollo para celular y PC, sin publicar en tiendas. |
| ¿Qué quedó afuera? | ARCA (el cliente no lo necesita), la pasarela de pagos y los egresos. |

---

## Consejos

- **La diapositiva 7 (reglas) y la 8 (recorrido) son el corazón:** no las apuren.
- **La 8 es mejor con pantallas reales.** Si no tienen demo, usen las capturas del punto 5.2 de la Definición del Producto.
- **La 9 tiene que verse limpia:** muestren un extracto del diagrama de clases, no el diagrama completo. Si preguntan, tengan el DER a mano.
- **Si se pasan de tiempo**, acorten la 3 y la 12.
- **Estilo visual:** negro y blanco con rosa FR como acento, y una idea por diapositiva.
