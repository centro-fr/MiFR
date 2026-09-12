# RESPONSIVE.md – Estrategia responsive de MiFR

## 1. Propósito

Este documento define **qué formato (mobile o desktop) es prioritario para cada pantalla** del sistema MiFR, y las reglas de diseño responsive que aplican a todo el producto.

El objetivo es evitar decisiones ad-hoc durante el desarrollo y garantizar consistencia visual y de experiencia entre todas las pantallas.

---

## 2. Principios generales

- **Mobile-first siempre**: se diseña e implementa primero para mobile, y luego se adapta a desktop.
- **El 95% de los alumnos usan celular.** El panel del alumno debe ser impecable en mobile.
- **Las profesoras usan celular** durante la clase (toma de asistencia, cobros, rutina).
- **La propietaria usa mayoritariamente desktop** (dashboards, tablas, reportes, informes, mapa de calor).
- **Los tres roles deben poder acceder desde cualquier dispositivo**, pero con prioridades distintas.

---

## 3. Breakpoints estándar (Tailwind)

| Breakpoint | Ancho | Uso |
|------------|-------|-----|
| `sm` | 640px | Mobile grande |
| `md` | 768px | Tablet vertical |
| `lg` | 1024px | Tablet horizontal / Desktop chico |
| `xl` | 1280px | Desktop estándar |
| `2xl` | 1536px | Desktop grande |

**Convención del equipo:** trabajar principalmente en dos anchos de referencia:
- **Mobile:** ~390px (iPhone 14)
- **Desktop:** ~1440px (MacBook estándar)

---

## 4. Patrones de adaptación

### 4.1 Navegación
| Mobile | Desktop |
|--------|---------|
| Bottom navigation (4-5 ítems) | Sidebar lateral fija |
| Menú hamburguesa para opciones secundarias | Sidebar expandida con todas las secciones |
| Header compacto con logo | Header con logo + nombre del usuario + notificaciones |

### 4.2 Listados
| Mobile | Desktop |
|--------|---------|
| Cards apiladas verticalmente | Tabla con columnas |
| Filtros en modal o acordeón | Filtros visibles en barra superior |
| Paginación por scroll infinito | Paginación con controles |

### 4.3 Formularios
| Mobile | Desktop |
|--------|---------|
| Una columna | Dos columnas cuando tenga sentido |
| Botón de guardar fijo al pie | Botón de guardar en el header o al pie del formulario |
| Inputs grandes (mínimo 44px de alto) | Inputs estándar |

### 4.4 Dashboards / Reportes
| Mobile | Desktop |
|--------|---------|
| Cards apiladas | Grid de múltiples columnas |
| Gráficos simplificados | Gráficos detallados |
| Detalle expandible | Vista completa con tablas |

### 4.5 Acciones críticas (asistencia, cobros)
| Mobile | Desktop |
|--------|---------|
| Botones grandes, táctiles (mínimo 44x44px) | Botones estándar |
| Optimizado para uso con una mano | Optimizado para mouse + teclado |

---

## 5. Prioridad por pantalla

### 🔵 Leyenda
- **M** = Mobile prioritario (se diseña primero y con más cuidado)
- **D** = Desktop prioritario
- **M+D** = Ambos con igual peso
- **Solo M** = Solo mobile (desktop no aplica o es muy raro)
- **Solo D** = Solo desktop (mobile no aplica)

---

### Bloque 1 – Autenticación y base

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 1 | Login con Google | **M+D** | Los tres roles entran desde cualquier dispositivo |
| 2 | Layouts por rol | **M+D** | Alumno y Profesora priorizan mobile; Propietaria prioriza desktop |

---

### Bloque 2 – Configuración base (Propietaria)

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 3 | Actividades (listado + alta) | **D** | Uso casi exclusivo de la propietaria en desktop |
| 4 | Horarios y profesoras | **D** | Cronograma complejo, mejor en desktop |
| 5 | Planes (listado + alta) | **D** | Uso de la propietaria |
| 6 | Promociones | **D** | Uso de la propietaria |

---

### Bloque 3 – Alumnos

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 7 | Listado de alumnos | **M+D** | Profesora busca en mobile; propietaria en desktop |
| 8 | Ficha del alumno | **M+D** | Acceso desde ambos |
| 9 | Pre-inscripción (con tutor) | **M+D** | Profesora desde mobile, propietaria desde desktop |
| 10 | Confirmación de alta definitiva | **D** | Se hace al confirmar pago (frecuentemente desktop) |
| 11 | Confirmación de baja lógica | **M+D** | Puede darse desde cualquier dispositivo |

---

### Bloque 4 – Pagos

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 12 | Cobro en efectivo | **M** | La profesora cobra en el aula, desde el celular |
| 13 | Carga de transferencia (alumno) | **M** | El alumno sube el comprobante desde el celular |
| 14 | Aprobación/rechazo de transferencias | **D** | La propietaria revisa en desktop |
| 15 | Control de efectivo pendiente de rendición | **D** | Vista tabular, mejor en desktop |

---

### Bloque 5 – Asistencia

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 16 | Home de la profesora (clases del día) | **M** | Uso en el celular durante el día |
| 17 | Toma de asistencia | **Solo M** | Se toma desde el celular en el aula |
| 18 | Alumnos inactivos (retención) | **D** | Análisis y contacto, mejor en desktop |

---

### Bloque 6 – Honorarios y notificaciones

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 19 | Informe mensual de honorarios | **D** | Cálculo y liquidación, en desktop |
| 20 | Registro de suplencias | **D** | Uso administrativo |
| 21 | Configuración de notificaciones + resumen diario | **D** | Configuración, mejor en desktop |

---

### Bloque 7 – Portal del alumno

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 22 | Panel principal del alumno | **M** | El alumno consulta desde el celular |
| 23 | Rutina y progreso físico | **M** | El alumno consulta desde el celular |
| 24 | Ranking de asistencia | **M** | Gamificación, más usada en mobile |
| 25 | Insignias y racha | **M** | Gamificación, más usada en mobile |

---

### Bloque 8 – Público y reportes

| # | Pantalla | Prioridad | Notas |
|---|----------|-----------|-------|
| 26 | Panel público de disponibilidad | **M+D** | Visitantes desde cualquier dispositivo |
| 27 | Informe de asistencia | **D** | Análisis, en desktop |
| 28 | Informe de cuotas vencidas | **D** | Cobranza, en desktop |
| 29 | Estadísticas (inscriptos + planes + mapa de calor) | **D** | Análisis, en desktop |

---

## 6. Reglas específicas por componente

### Navegación inferior (bottom nav) – solo mobile
Aplica a los roles Alumno y Profesora. Máximo 5 ítems.

Ejemplo (Alumno):
- Inicio
- Mi plan
- Progreso
- Comunidad
- Perfil

Ejemplo (Profesora):
- Hoy
- Mis clases
- Alumnos
- Cobros
- Perfil

### Sidebar lateral – solo desktop
Aplica a los tres roles, con ítems según permisos. Colapsable.

### Tablas
- Mobile: se convierten en **cards apiladas** o **listas con filas expandibles**.
- Desktop: tabla con columnas, ordenamiento y filtros visibles.

### Formularios
- Mobile: una columna, inputs grandes, botón de guardar fijo al pie.
- Desktop: hasta dos columnas, botón de guardar visible al pie o en el header.

### Modales
- Mobile: pantalla completa (full screen sheet).
- Desktop: modal centrado con ancho máximo.

### Toasts / notificaciones
- Mobile: parte inferior, sobre el bottom nav.
- Desktop: esquina superior derecha.

### Gráficos
- Mobile: simplificados, scroll horizontal si es necesario.
- Desktop: completos, con leyendas y ejes detallados.

---

## 7. Testing responsive

Antes de dar por cerrada cualquier pantalla, verificar en:

- [ ] Mobile real (iOS o Android) — mínimo un dispositivo
- [ ] Navegador en modo mobile (DevTools)
- [ ] Tablet (si es posible)
- [ ] Desktop estándar (1440px)
- [ ] Desktop grande (1920px)

**Casos a probar siempre:**
- Textos largos (nombres de alumnos, actividades)
- Listas con muchos ítems (paginación / scroll)
- Estados vacíos
- Estados de error
- Formularios con muchos campos
- Tablas con muchas columnas (mobile)

---

## 8. Prioridad de trabajo en Stitch

Al generar pantallas en Stitch, seguir este orden de prioridad según el formato:

1. **Generar primero el formato prioritario** según la tabla de la sección 5.
2. **Después generar el formato secundario**, pidiéndole a Stitch que mantenga el estilo.
3. **Revisar consistencia** entre ambos formatos (mismos colores, tipografía, componentes).

Ejemplo:
- Para el **Panel del alumno**: primero mobile, después desktop.
- Para el **Informe de honorarios**: primero desktop, después mobile (si aplica).

---

## 9. Referencia rápida

| Formato | Ancho de referencia | Uso principal |
|---------|---------------------|---------------|
| Mobile | 390px | Alumno, Profesora (en clase) |
| Desktop | 1440px | Propietaria (administración, reportes) |

**Regla de oro:** _si dudás, mobile primero._

---

**Regla general:** cuando el drawer está abierto, el botón hamburguesa original del header queda oculto. El drawer tiene su propio ícono de cierre (X) en la parte superior.

| Estado | Header | Drawer |
|--------|--------|--------|
| Cerrado | Con botón hamburguesa | No visible |
| Abierto | Oculto | Visible con ícono X |

## 10. Mantenimiento

Este documento se actualiza cuando:
- Se agrega una nueva pantalla al sistema.
- Cambia la prioridad de una pantalla existente.
- Se detecta una regla responsive nueva que aplica a varias pantallas.

Última actualización: [fecha]


