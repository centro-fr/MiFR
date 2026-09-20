# PROMPTS-STITCH.md – Plan de prompts para Stitch

## Propósito

Este documento define el plan ordenado de prompts para generar todas las pantallas de MiFR usando Google Stitch. Cada prompt corresponde a una pantalla (o layout) que agrupa una o más User Stories.

**Objetivo:** cubrir las 37 User Stories del sistema con 30 pantallas, evitando duplicación y garantizando consistencia visual.

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

## Glosario de términos (obligatorio respetar)

| ❌ No usar | ✅ Usar |
|-----------|---------|
| "Pago" | "Transferencia" o "Aviso de transferencia" |
| "Registrar pago" | "Informar transferencia" |
| "Pendiente de confirmación" | "Pendiente de verificación" |
| "Confirmar pago" | "Verificar transferencia" |
| "Mis pagos" | "Mis transferencias" |
| "Enviar pago" | "Informar transferencia" |
| "Monto pagado" | "Monto de la transferencia" |

**Motivo:** el sistema NO procesa pagos. El alumno hace la transferencia fuera del sistema y solo informa que la hizo.

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

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 1 | Login con Google | US-01 | M+D |
| 2 | Layouts por rol | *(transversal)* | M+D |
| 2b | Definición de permisos por rol | US-02 | D |

---

### 🟢 Bloque 2 – Configuración base (Propietaria)

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 3 | Actividades – listado + alta/edición | US-03 | D |
| 4 | Horarios y profesoras (cronograma) | US-04 | D |
| 5 | Planes – listado + alta/edición | US-11, US-12 | D |
| 6 | Promociones y descuentos | US-13 | D |

---

### 🟢 Bloque 3 – Alumnos

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 7 | Listado y búsqueda de alumnos | US-10 | M+D |
| 8 | Ficha del alumno (con pestañas) | US-09, US-10 | M+D |
| 9 | Formulario de pre-inscripción (con wizard y tutor) | US-05, US-06 | M+D |
| 10 | Confirmación de alta definitiva | US-07 | D |
| 11 | Confirmación de baja lógica | US-08 | M+D |

---

### 🟢 Bloque 4 – Pagos y cuotas

| # | Prompt | US que cubre | Formato | Notas |
|---|--------|--------------|---------|-------|
| 12 | Registro de cobro en efectivo + comprobante | US-15 | M | Solo efectivo |
| 13 | **Informar transferencia (alumno)** | US-16 | M | **Sin comprobante. Solo monto + fecha.** |
| 14 | **Transferencias pendientes de verificación** | US-17 | D | **Sin visor de comprobante. Verificación en extracto.** |
| 15 | Control de efectivo pendiente de rendición | US-19 | D | — |

**Cambios clave en los prompts #13 y #14:**
- Se elimina la sección de adjuntar comprobante.
- Se reemplaza "pago" por "transferencia".
- Se reemplaza "confirmación" por "verificación".
- La propietaria verifica el ingreso en su extracto bancario.

---

### 🟢 Bloque 5 – Asistencia

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 16 | Home de la profesora (clases del día) | US-20 | M |
| 17 | Toma de asistencia | US-20, US-21 | Solo M |
| 18 | Detección de alumnos inactivos | US-22 | D |

---

### 🟢 Bloque 6 – Honorarios y notificaciones

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 19 | Informe mensual de honorarios | US-23 | D |
| 20 | Registro de suplencias | US-24 | D |
| 21 | Configuración de notificaciones + resumen diario | US-25, US-26 | D |

---

### 🟢 Bloque 7 – Portal del alumno

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 22 | Panel principal del alumno | US-29, US-14 | M |
| 23 | Rutina y progreso físico | US-27, US-28 | M |
| 24 | Ranking de asistencia | US-30 | M |
| 25 | Insignias y racha | US-31 | M |

---

### 🟢 Bloque 8 – Público y reportes

| # | Prompt | US que cubre | Formato |
|---|--------|--------------|---------|
| 26 | Panel público de disponibilidad | US-32 | M+D |
| 27 | Informe de asistencia | US-33 | D |
| 28 | Informe de cuotas vencidas | US-34 | D |
| 29 | Estadísticas (inscriptos + planes + mapa de calor) | US-35, US-36, US-37 | D |

---

## Resumen general

| Métrica | Valor |
|---------|-------|
| Total de prompts | 30 |
| US cubiertas | 37 |

### Resumen por formato prioritario

| Formato | Cantidad |
|---------|----------|
| Mobile prioritario | 9 |
| Desktop prioritario | 14 |
| Ambos (M+D) | 7 |

---

## Observaciones importantes

- **US-02** tiene su propia pantalla (#2b), no es un layout.
- **US-14** (renovación) se resuelve en el panel del alumno (#22).
- **US-16** (informar transferencia) está actualizada sin comprobante.
- **US-17** (verificación de transferencias) está actualizada sin comprobante.
- **US-18** (estado de habilitación) es lógica, no pantalla propia.
- **US-21** (inasistencias automáticas) se refleja en el prompt #17.
- **US-32** (panel público) podría fusionarse con la landing pública.

---

## Glosario de términos (recordatorio)

| ❌ No usar | ✅ Usar |
|-----------|---------|
| "Pago" | "Transferencia" |
| "Pendiente de confirmación" | "Pendiente de verificación" |
| "Mis pagos" | "Mis transferencias" |
| "Confirmar pago" | "Verificar transferencia" |
| "Enviar pago" | "Informar transferencia" |

---

## Referencias

- **Specs de las US:** `docs/specs/`
- **Estrategia responsive:** `docs/design/RESPONSIVE.md`
- **Instrucciones para la IA:** `front/AGENTS.md`
- **Sprint 0 (Product Backlog + Story Map):** raíz del repo

---

Última actualización: 19/9/2026