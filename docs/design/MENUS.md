# MENUS.md – Menús y navegación por rol

## Propósito

Este documento define **qué ve cada rol en el menú de navegación** de MiFR, tanto en mobile como en desktop. Es la fuente de verdad para que todas las pantallas respeten la misma estructura de navegación.

**Regla de oro:** ninguna pantalla puede inventar su propio menú. Siempre se usa el menú del rol correspondiente definido acá.

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Alumno / Tutor** | Usuario final que asiste a clases |
| **Profesora** | Dicta clases y toma asistencia |
| **Propietaria** | Administra el centro (acceso total) |
| **Público** | Visitante sin login |

Una misma persona puede tener más de un rol (ej: propietaria que también dicta clases). En ese caso, **se unen los menús** de ambos roles.

---

## 🎓 Alumno / Tutor

### Mobile (bottom nav, 5 ítems)

| # | Ítem | Ícono | Pantalla que abre |
|---|------|-------|-------------------|
| 1 | **Inicio** | home | Panel principal (US-29) |
| 2 | **Mi plan** | tarjeta | Estado del plan y renovación (US-14, US-29) |
| 3 | **Progreso** | gráfico | Rutina y evolución física (US-27, US-28) |
| 4 | **Comunidad** | trofeo | Ranking e insignias (US-30, US-31) |
| 5 | **Perfil** | usuario | Datos personales y configuración |

### Desktop (sidebar, 5 ítems + secundarios)

| # | Ítem | Ícono | Pantalla que abre |
|---|------|-------|-------------------|
| 1 | Inicio | home | Panel principal |
| 2 | Mi plan | tarjeta | Estado del plan |
| 3 | Progreso | gráfico | Rutina y evolución |
| 4 | Comunidad | trofeo | Ranking e insignias |
| 5 | Perfil | usuario | Datos personales |
| — | Configuración | engranaje | (al pie del sidebar) |
| — | Cerrar sesión | salir | (al pie del sidebar) |

### Menú hamburguesa (mobile)

Acceso a opciones secundarias (esquina superior derecha):
- Configuración
- Ayuda
- Términos y privacidad
- Cerrar sesión

---

## 👩‍🏫 Profesora

### Mobile (bottom nav, 5 ítems)

| # | Ítem | Ícono | Pantalla que abre |
|---|------|-------|-------------------|
| 1 | **Hoy** | reloj/calendario | Clases del día (US-20) |
| 2 | **Mis clases** | libro/lista | Historial de clases y asistencias |
| 3 | **Alumnos** | usuarios | Alumnos a su cargo (US-10) |
| 4 | **Cobros** | dinero | Registro de cobro en efectivo (US-15) |
| 5 | **Perfil** | usuario | Datos personales |

### Desktop (sidebar, 5 ítems + secundarios)

| # | Ítem | Ícono | Pantalla que abre |
|---|------|-------|-------------------|
| 1 | Hoy | reloj | Clases del día |
| 2 | Mis clases | libro | Historial |
| 3 | Alumnos | usuarios | Alumnos a cargo |
| 4 | Cobros | dinero | Registro de cobros |
| 5 | Perfil | usuario | Datos personales |
| — | Configuración | engranaje | (al pie) |
| — | Cerrar sesión | salir | (al pie) |

### Menú hamburguesa (mobile)

- Configuración
- Ayuda
- Cerrar sesión

### ⚠️ Qué NO ve la profesora

- Honorarios
- Reportes
- Estadísticas
- Configuración de planes o actividades
- Datos financieros de otros

---

## 👑 Propietaria / Dueño

### Desktop (sidebar, 10 ítems)

| # | Ítem | Ícono | Pantalla que abre |
|---|------|-------|-------------------|
| 1 | **Dashboard** | home | Resumen general (KPIs, alertas) |
| 2 | **Alumnos** | usuarios | Listado, ficha, pre-inscripciones, bajas |
| 3 | **Actividades y Horarios** | calendario | Actividades + cronograma (US-03, US-04) |
| 4 | **Planes y Precios** | etiqueta | Planes, precios, promociones (US-11, US-12, US-13) |
| 5 | **Pagos y Cuotas** | dinero | Transferencias, cobros, cuotas vencidas (US-15 a US-19) |
| 6 | **Asistencia** | check | Asistencia, inactivos, historial (US-20 a US-22) |
| 7 | **Honorarios** | informe | Informe mensual, suplencias (US-23, US-24) |
| 8 | **Notificaciones** | campana | Configuración, resumen diario (US-25, US-26) |
| 9 | **Reportes** | gráfico | Informes y estadísticas (US-33 a US-37) |
| 10 | **Configuración** | engranaje | Permisos, roles, datos del centro (US-02) |

### Mobile (drawer lateral desde la izquierda)

Mismos 10 ítems que desktop, pero en un drawer que se abre con el botón hamburguesa (esquina superior izquierda).

### Orden de prioridad visual (más usados arriba)

1. Dashboard
2. Alumnos
3. Pagos y Cuotas
4. Actividades y Horarios
5. Planes y Precios
6. Asistencia
7. Reportes
8. Honorarios
9. Notificaciones
10. Configuración

---

## 🌐 Público (sin login)

### Header (mobile y desktop)

| # | Ítem | Qué muestra |
|---|------|-------------|
| 1 | **Inicio** | Landing con info del centro |
| 2 | **Disponibilidad** | Panel público con cupos disponibles (US-32) |
| 3 | **Precios** | Planes disponibles (sin login) |
| 4 | **Contacto** | Datos de contacto, WhatsApp, ubicación |
| — | **Iniciar sesión** | Botón destacado (rosa) a la derecha |

### Mobile

- Botón hamburguesa (esquina superior derecha) con los primeros 4 ítems.
- El botón "Iniciar sesión" siempre visible en el header.

### Desktop

- Menú horizontal completo en el header.
- Botón "Iniciar sesión" a la derecha.
- Sin hamburguesa.

---

## 📊 Resumen visual de menús

| Rol | Mobile | Desktop | Ítems principales |
|-----|--------|---------|-------------------|
| **Alumno** | Bottom nav (5) + hamburguesa | Sidebar (5 + secundarios) | Inicio, Mi plan, Progreso, Comunidad, Perfil |
| **Profesora** | Bottom nav (5) + hamburguesa | Sidebar (5 + secundarios) | Hoy, Mis clases, Alumnos, Cobros, Perfil |
| **Propietaria** | Drawer lateral (10) | Sidebar (10) | Dashboard, Alumnos, Actividades, Planes, Pagos, Asistencia, Honorarios, Notificaciones, Reportes, Configuración |
| **Público** | Header + hamburguesa | Header | Inicio, Disponibilidad, Precios, Contacto, Iniciar sesión |

---

## 🎨 Convención del botón hamburguesa

| Rol | Botón | Drawer |
|-----|-------|--------|
| Alumno (mobile) | Derecha | Derecha |
| Profesora (mobile) | Derecha | Derecha |
| Propietaria (mobile) | Izquierda | Izquierda |
| Público (mobile) | Derecha | Derecha o dropdown |

**Regla:** el botón siempre va del mismo lado que el drawer que abre. Cuando el drawer está abierto, el botón original queda oculto (el drawer tiene su propio ícono X).

---

## 🎯 Roles múltiples

Si una persona tiene **más de un rol** (ej: propietaria + profesora):

- Se **unen los ítems** de ambos menús.
- El menú muestra todos los ítems de propietaria + todos los de profesora.
- El usuario puede cambiar entre "vistas" si se define un selector de rol.

---

## 📌 Reglas de legibilidad (para todas las pantallas)

### Desktop (1440px)
- Ancho máximo del contenido: **1200-1280px**, centrado
- Sidebar fija a la izquierda (**250-280px**)
- Padding del contenido: **32-48px**
- **NO** estirar tablas ni cards al 100% del ancho
- Tipografía: mínimo 14px secundario, 16px normal, 18-24px títulos

### Mobile (390px)
- Padding lateral: **16-20px**
- Bottom nav fija al pie (no scrollable)
- Botones mínimo **44x44px**
- No generar scroll horizontal
- Tablas → cards apiladas

### Universales
- Nunca scroll horizontal
- Texto nunca cortado
- No usar texto menor a 14px
- Los títulos deben ser claramente más grandes que el cuerpo

---

## Referencias

- **Plan de prompts:** `docs/design/PROMPTS-STITCH.md`
- **Estrategia responsive:** `docs/design/RESPONSIVE.md`
- **Specs de las US:** `docs/specs/`
- **Instrucciones para la IA:** `front/AGENTS.md`

---

Última actualización: 19/9/2026