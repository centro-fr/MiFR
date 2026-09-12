# PROMPTS-STITCH.md – Plan de prompts para Stitch

## Propósito

Este documento define el plan ordenado de prompts para generar todas las pantallas de MiFR usando Google Stitch. Cada prompt corresponde a una pantalla (o layout) que agrupa una o más User Stories.

**Objetivo:** cubrir las 37 User Stories del sistema con 29 pantallas, evitando duplicación y garantizando consistencia visual.

---

## Reglas generales para todos los prompts

Cada prompt debe incluir siempre:

1. **Rol del diseñador:** "Sos un diseñador de producto senior..."
2. **Colores de marca (obligatorios):**
   - Rosa principal: `#E91E82` (RGB 233, 30, 130)
   - Rosa oscuro: `#BC1266` (RGB 188, 18, 102)
   - Negro azulado: `#181C26` (RGB 24, 28, 38)
3. **Estilo general:** moderno, limpio, mobile-first, componentes redondeados.
4. **Rol del usuario** que usa la pantalla.
5. **Descripción funcional** (resumen corto, no la Spec completa).
6. **Elementos que debe mostrar.**
7. **Estados a generar:** principal, vacío, loading, error (según aplique).
8. **Formatos requeridos:** mobile, desktop o ambos (según prioridad).
9. **Referencia al layout base** ya generado (Alumno, Profesora, Propietaria o Público).

---

## Formatos y breakpoints

| Formato | Ancho de referencia | Uso principal |
|---------|---------------------|---------------|
| Mobile | 390px | Alumno, Profesora |
| Desktop | 1440px | Propietaria |

**Leyenda de prioridad:**
- **M** = Mobile prioritario
- **D** = Desktop prioritario
- **M+D** = Ambos con igual peso
- **Solo M** = Solo mobile
- **Solo D** = Solo desktop

---

## Listado completo de prompts

### 🟢 Bloque 1 – Autenticación y base

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 1 | Login con Google | US-01 | M+D | ✅ Hecho |
| 2 | Layouts por rol (Alumno, Profesora, Propietaria, Público) | US-02 | M+D | ✅ Hecho |

---

### 🟢 Bloque 2 – Configuración base (Propietaria)

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 3 | Actividades – listado + alta/edición | US-03 | D | ⏳ Pendiente |
| 4 | Horarios y profesoras (cronograma) | US-04 | D | ⏳ Pendiente |
| 5 | Planes – listado + alta/edición | US-11, US-12 | D | ⏳ Pendiente |
| 6 | Promociones y descuentos | US-13 | D | ⏳ Pendiente |

---

### 🟢 Bloque 3 – Alumnos

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 7 | Listado y búsqueda de alumnos | US-10 | M+D | ⏳ Pendiente |
| 8 | Ficha del alumno (con pestañas) | US-09, US-10 | M+D | ⏳ Pendiente |
| 9 | Formulario de pre-inscripción (con wizard y tutor) | US-05, US-06 | M+D | ⏳ Pendiente |
| 10 | Confirmación de alta definitiva (al confirmar pago) | US-07 | D | ⏳ Pendiente |
| 11 | Confirmación de baja lógica | US-08 | M+D | ⏳ Pendiente |

---

### 🟢 Bloque 4 – Pagos y cuotas

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 12 | Registro de cobro en efectivo + comprobante | US-15 | M | ⏳ Pendiente |
| 13 | Carga de transferencia (alumno) | US-16 | M | ⏳ Pendiente |
| 14 | Aprobación/rechazo de transferencias (propietaria) | US-17 | D | ⏳ Pendiente |
| 15 | Control de efectivo pendiente de rendición | US-19 | D | ⏳ Pendiente |

---

### 🟢 Bloque 5 – Asistencia

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 16 | Home de la profesora (clases del día) | US-20 | M | ⏳ Pendiente |
| 17 | Toma de asistencia (lista de inscriptos + marcar) | US-20, US-21 | Solo M | ⏳ Pendiente |
| 18 | Detección de alumnos inactivos (retención) | US-22 | D | ⏳ Pendiente |

---

### 🟢 Bloque 6 – Honorarios y notificaciones

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 19 | Informe mensual de honorarios | US-23 | D | ⏳ Pendiente |
| 20 | Registro de suplencias | US-24 | D | ⏳ Pendiente |
| 21 | Configuración de notificaciones + vista de resumen diario | US-25, US-26 | D | ⏳ Pendiente |

---

### 🟢 Bloque 7 – Portal del alumno

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 22 | Panel principal del alumno | US-29, US-14 | M | ⏳ Pendiente |
| 23 | Rutina y progreso físico (carga y consulta) | US-27, US-28 | M | ⏳ Pendiente |
| 24 | Ranking de asistencia | US-30 | M | ⏳ Pendiente |
| 25 | Insignias y racha | US-31 | M | ⏳ Pendiente |

---

### 🟢 Bloque 8 – Público y reportes

| # | Prompt | US que cubre | Formato | Estado |
|---|--------|--------------|---------|--------|
| 26 | Panel público de disponibilidad | US-32 | M+D | ⏳ Pendiente |
| 27 | Informe de asistencia | US-33 | D | ⏳ Pendiente |
| 28 | Informe de cuotas vencidas | US-34 | D | ⏳ Pendiente |
| 29 | Estadísticas (inscriptos + planes + mapa de calor) | US-35, US-36, US-37 | D | ⏳ Pendiente |

---

## Resumen general

| Métrica | Valor |
|---------|-------|
| Total de prompts | 29 |
| Hechos | 2 |
| Pendientes | 27 |
| US cubiertas | 37 |

### Resumen por formato prioritario

| Formato | Cantidad |
|---------|----------|
| Mobile prioritario | 9 |
| Desktop prioritario | 13 |
| Ambos (M+D) | 7 |

### Resumen por bloque

| Bloque | Prompts |
|--------|---------|
| 1 – Autenticación y base | 2 |
| 2 – Configuración base | 4 |
| 3 – Alumnos | 5 |
| 4 – Pagos | 4 |
| 5 – Asistencia | 3 |
| 6 – Honorarios y notificaciones | 3 |
| 7 – Portal del alumno | 4 |
| 8 – Público y reportes | 4 |

---

## Plan de trabajo sugerido

| Semana | Bloques | Prompts |
|--------|---------|---------|
| Semana 1 | 1, 2 y 3 | 1 → 11 |
| Semana 2 | 4, 5 y 6 | 12 → 21 |
| Semana 3 | 7 y 8 | 22 → 29 |

---

## Observaciones importantes

- **US-14 (renovación o cambio de plan)** se resuelve dentro del **prompt #22** (panel del alumno), porque es una acción que el alumno realiza desde su panel.
- **US-18 (estado de habilitación)** no tiene pantalla propia: es lógica que se refleja en varias pantallas (badges de cuota, advertencias en asistencia, etc.).
- **US-21 (inasistencias automáticas)** se resuelve visualmente en el **prompt #17** (toma de asistencia) al cerrar la ventana.
- **US-32 (panel público)** podría fusionarse con la landing pública si después la hacen, pero por ahora va como prompt independiente.

---

## Cómo usar este documento

1. Antes de generar una pantalla en Stitch, **consultar la tabla del bloque correspondiente**.
2. Verificar el **formato prioritario** (M, D o M+D).
3. Revisar la **Spec de las US asociadas** en `docs/specs/` para extraer el contenido funcional.
4. Armar el prompt siguiendo las **reglas generales** de este documento.
5. Generar la pantalla en Stitch.
6. Revisar el resultado y ajustar si es necesario.
7. **Actualizar el estado** en este documento (`✅ Hecho` / `⏳ Pendiente`).

---

## Referencias

- **Specs de las US:** `docs/specs/`
- **Estrategia responsive:** `docs/design/RESPONSIVE.md`
- **Instrucciones para la IA:** `front/AGENTS.md`
- **Sprint 0 (Product Backlog + Story Map):** raíz del repo

---

Última actualización: 12/9/2026