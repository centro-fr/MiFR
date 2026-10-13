# MENUS.md – Menús y navegación por rol

## Propósito

Este documento define **qué ve cada rol en el menú de navegación** de MiFR, tanto en mobile como en desktop. Es la fuente de verdad para que todas las pantallas respeten la misma estructura de navegación.

**Regla de oro:** ninguna pantalla puede inventar su propio menú. Siempre se usa el menú del rol correspondiente definido acá.

---

## Roles del sistema

| Rol | Descripción |
| ----- | ------------- |
| **Alumno / Tutor** | Usuario final que asiste a clases |
| **Profesora** | Dicta clases y toma asistencia |
| **Propietaria** | Administra el centro (acceso total) |
| **Público** | Visitante sin login |

Una misma persona puede tener más de un rol (ej: propietaria que también dicta clases). Ver [Roles múltiples](#-roles-múltiples).

---

## 🎓 Alumno / Tutor

### Mobile (bottom nav, 5 ítems)

| # | Ítem | Ícono | Pantalla que abre |
| --- | ------ | ------- | ------------------- |
| 1 | **Inicio** | home | Panel principal (US-29) |
| 2 | **Mi plan** | tarjeta | Estado del plan y renovación (US-14, US-29) |
| 3 | **Progreso** | gráfico | Rutina y evolución física (US-27, US-28) |
| 4 | **Comunidad** | trofeo | Ranking e insignias (US-30, US-31) |
| 5 | **Perfil** | usuario | Datos personales y configuración |

### Desktop (sidebar, 5 ítems + secundarios)

| # | Ítem | Ícono | Pantalla que abre |
| --- | ------ | ------- | ------------------- |
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
| --- | ------ | ------- | ------------------- |
| 1 | **Hoy** | reloj/calendario | Clases del día (US-20) |
| 2 | **Mis clases** | libro/lista | Historial de clases y asistencias |
| 3 | **Alumnos** | usuarios | Alumnos a su cargo (US-10) |
| 4 | **Cobros** | dinero | Registro de cobro en efectivo (US-15) |
| 5 | **Perfil** | usuario | Datos personales |

### Desktop (sidebar, 5 ítems + secundarios)

| # | Ítem | Ícono | Pantalla que abre |
| --- | ------ | ------- | ------------------- |
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

### Desktop (sidebar, 11 ítems)

| # | Ítem | Ícono | Pantalla que abre |
| --- | ------ | ------- | ------------------- |
| 1 | **Dashboard** | home | Resumen general (KPIs, alertas) |
| 2 | **Alumnos** | usuarios | Listado, ficha, pre-inscripciones, bajas |
| 3 | **Actividades** | mancuerna | Disciplinas y cupos (US-03) → `/app/actividades` |
| 4 | **Horarios** | calendario | Cronograma semanal con profesoras (US-04) → `/app/horarios` |
| 5 | **Planes y Precios** | etiqueta | Planes, precios, promociones (US-11, US-12, US-13) |
| 6 | **Cobros y Cuotas** | dinero | Transferencias, cobros, cuotas vencidas (US-15 a US-19) |
| 7 | **Asistencia** | check | Asistencia, inactivos, historial (US-20 a US-22) |
| 8 | **Honorarios** | informe | Informe mensual, suplencias (US-23, US-24) |
| 9 | **Notificaciones** | campana | Configuración, resumen diario (US-25, US-26) |
| 10 | **Reportes** | gráfico | Informes y estadísticas (US-33 a US-37) |
| 11 | **Configuración** | engranaje | Permisos, roles, datos del centro (US-02) |

### Grupos con pantalla propia

Cada grupo desplegable tiene además su **pantalla de grupo**: muestra sus sub-opciones como tarjetas (ícono, nombre, descripción y contador), como otra forma de llegar a ellas además del menú.

- Tocar el **nombre del grupo** en el menú abre su pantalla (y lo despliega); la **flecha** solo despliega o pliega, sin navegar.
- En la miga de pan, el grupo es un enlace a su pantalla: "Inicio / Alumnos / Listado".
- Con el menú contraído, el menú flotante del grupo empieza con un acceso a su pantalla.
- La pantalla sale del mismo menú (`owner-navigation.ts`): una sub-opción nueva aparece sola en las dos.

| Grupo | Pantalla | Sub-opciones |
| ------ | ------ | ------------------- |
| **Alumnos** | `/app/alumnos` | Listado (`/app/alumnos/listado`; la ficha `/app/alumnos/:id` lo mantiene marcado) · Pendientes de alta (US-07, con contador) |
| **Cobros y Cuotas** | `/app/pagos` | Transferencias pendientes (US-17, con contador) → `/app/pagos/transferencias` |
| **Profesora** (rol extra) | `/app/profesora` | Hoy · Mis clases |

Las demás pantallas de Cobros y Cuotas (cobros en efectivo, rendiciones, cuotas vencidas) se suman como sub-opciones cuando se implementen.

> La profesora no tiene el grupo Alumnos: su ítem "Alumnos" va directo al listado, y si entra a `/app/alumnos` se la redirige ahí. Igual con `/app/profesora`, que la lleva a "Hoy".

### Actividades y Horarios (ítems independientes)

"Actividades" y "Horarios" se presentan como dos accesos directos independientes en el menú (no forman un grupo desplegable):

| Ítem | Ícono | Pantalla que abre |
| ------ | ------- | ------------------- |
| **Actividades** | mancuerna | Disciplinas y cupos (US-03) → `/app/actividades` |
| **Horarios** | calendario | Cronograma semanal con profesoras (US-04) → `/app/horarios` |

Reglas:

- Cada ítem navega de forma directa a su pantalla correspondiente.
- El ítem activo se resalta según la ruta actual (`/app/actividades` o `/app/horarios`).
- En sidebar colapsado (desktop), cada ítem muestra su propio ícono individual con tooltip.
- En mobile (drawer), ambos figuran como ítems independientes de primer nivel.

> Antes "Actividades" y "Horarios" eran sub-ítems de un grupo desplegable "Actividades y Horarios".
> Se separaron en dos ítems de primer nivel para llegar a cada pantalla con un solo toque.

### Mobile (drawer lateral desde la izquierda)

Mismos 11 ítems que desktop (con "Actividades" y "Horarios" como accesos directos independientes), en un drawer que se abre con el botón hamburguesa (esquina superior izquierda).

### Orden de prioridad visual (más usados arriba)

1. Dashboard
2. Alumnos
3. Cobros y Cuotas
4. Actividades
5. Horarios
6. Planes y Precios
7. Asistencia
8. Reportes
9. Honorarios
10. Notificaciones
11. Configuración

---

## 🌐 Público (sin login)

### Header (mobile y desktop)

| # | Ítem | Qué muestra |
| --- | ------ | ------------- |
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
| ----- | -------- | --------- | ------------------- |
| **Alumno** | Bottom nav (5) + hamburguesa | Sidebar (5 + secundarios) | Inicio, Mi plan, Progreso, Comunidad, Perfil |
| **Profesora** | Bottom nav (5) + hamburguesa | Sidebar (5 + secundarios) | Hoy, Mis clases, Alumnos, Cobros, Perfil |
| **Propietaria** | Drawer lateral (11) | Sidebar (11) | Dashboard, Alumnos, Actividades, Horarios, Planes, Cobros, Asistencia, Honorarios, Notificaciones, Reportes, Configuración |
| **Público** | Header + hamburguesa | Header | Inicio, Disponibilidad, Precios, Contacto, Iniciar sesión |

---

## 🎨 Convención del botón hamburguesa

| Rol | Botón | Drawer |
| ----- | ------- | -------- |
| Alumno (mobile) | Derecha | Derecha |
| Profesora (mobile) | Derecha | Derecha |
| Propietaria (mobile) | Izquierda | Izquierda |
| Público (mobile) | Derecha | Derecha o dropdown |

**Regla:** el botón siempre va del mismo lado que el drawer que abre. Cuando el drawer está abierto, el botón original queda oculto (el drawer tiene su propio ícono X).

---

## 🎯 Roles múltiples

Si una persona tiene **más de un rol** (ej: propietaria + profesora):

- **El menú del rol de más alcance va completo** (Propietaria > Profesora > Alumno/Tutor).
- **Cada rol extra se suma como un ítem desplegable con su nombre**, solo con las pantallas propias de ese rol. Lo que el menú principal ya cubre no se repite, y Perfil tampoco entra, porque es de la persona y no de un rol.

| Rol extra | Sub-opciones del desplegable |
| ----- | ------------- |
| **Profesora** | Hoy, Mis clases (alumnos y cobros ya están en el menú de la propietaria) |
| **Alumno / Tutor** | Inicio, Mi plan, Progreso, Comunidad |

Ejemplo: la propietaria que dicta clases ve sus 11 ítems y, al final, **Profesora** con Hoy y Mis clases.

Cada rol entra solo a las pantallas de su menú: abrir por URL la de otro rol muestra "Sin acceso".

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

Última actualización: 9/10/2026
