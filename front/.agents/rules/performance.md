# Rendimiento antes que lo visual

Regla obligatoria para **toda User Story del front** desde octubre de 2026. Ante un conflicto entre un efecto visual y el rendimiento, **gana el rendimiento**: el efecto se simplifica o se saca. Un diseño de Stitch o Claude Design es una referencia, no una obligación: si una animación o un efecto lo traba, se adapta.

Se suma a la jerarquía del repo:

$$\text{Seguridad} > \text{Mantenibilidad} > \text{Rendimiento} > \text{Visual (efectos, animaciones, decoración)}$$

El 95 % de los alumnos usa el celular: todo se piensa y se mide para un **celular de gama media**, no para la notebook de desarrollo.

---

## 1. Presupuestos

| Qué | Límite |
| --- | --- |
| Respuesta a un toque o click (INP) | ≤ 200 ms; que algo visible cambie en ≤ 100 ms |
| Animación de entrada | ≤ 250 ms, `ease-out` |
| Animación de salida | ≤ 200 ms, `ease-in` |
| Cascada de ítems (stagger) | ≤ 15 ms entre ítems y hasta 6 ítems |
| Cuadro más lento durante una animación | ≤ 50 ms (a 60 FPS cada cuadro dura 16,7 ms) |
| Tarea larga al navegar o abrir algo (CPU 4x) | < 100 ms |
| JS + CSS inicial (gzip) | Hoy ~225 kB; techo 250 kB. Nada nuevo al bundle inicial sin justificarlo |
| Carga (Core Web Vitals) | LCP ≤ 2,5 s, CLS ≤ 0,1 |

---

## 2. Animaciones y efectos

1. **Animar solo `transform` y `opacity`.** Nunca `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` ni `filter`: obligan a recalcular el layout o a repintar en cada cuadro. El ancho del sidebar de shadcn es la única excepción heredada; no se suman otras.
2. **Prohibido `transition-all`.** Anima todo lo que cambie, incluido el layout. Indicá la propiedad: `transition-colors`, `transition-opacity`, `transition-transform`.
3. **Nada de efectos caros en elementos grandes o repetidos**: `backdrop-blur`, `filter`, `clip-path` o gradientes animados, sombras grandes que cambian. En listas y tablas, ningún efecto por fila.
4. **Cambios globales sin transiciones en cascada.** Si algo cambia en toda la pantalla a la vez (como el tema), las transiciones se pausan mientras dura: ver `pausarTransiciones` en `src/stores/theme-store.ts`.
5. **Movimiento reducido.** La regla global de `src/index.css` apaga toda animación y transición CSS con `prefers-reduced-motion`. Una animación hecha con JS (`element.animate`, View Transitions) tiene que chequearlo por su cuenta.
6. **Las duraciones viven en un solo lugar**: las del menú mobile en `components/ui/sheet.tsx` y las propias en `src/index.css`. No se pisan desde otro componente.

> **Código heredado.** Hoy quedan unos 12 `transition-all` y algunos `backdrop-blur` de antes de esta regla. No hace falta un PR aparte: se corrigen cuando se toca esa pantalla. Lo nuevo ya no los usa.

---

## 3. React y datos

1. **Nada de pedidos por fila (N+1).** Una lista se arma con una o dos consultas en paralelo (`Promise.all`, `useQueries`).
2. **Listas paginadas desde el back** (`limit` y `offset`). Si una lista puede pasar las ~100 filas, se pagina o se virtualiza; nunca se trae todo para filtrar en el navegador.
3. **React Query**:
   - `staleTime` por dominio: catálogos (planes, actividades) 5 min; datos que cambian (alumnos, cuotas) 30 s a 1 min. Nunca 0 por defecto en un catálogo.
   - **Una clave de caché por forma de dato.** Dos consultas que guardan formas distintas no pueden compartir la clave exacta: se pisan.
   - Invalidar el prefijo justo (`["alumnos"]`), no toda la caché.
   - `placeholderData: keepPreviousData` en filtros y paginación, para que la pantalla no se vacíe entre página y página.
4. **Búsquedas con debounce** (300 ms).
5. **Sin `setState` dentro de `useEffect`** para sincronizar estado: se deriva en el render (lo marca la regla de lint `react-hooks/set-state-in-effect`).
6. **Estado que cambia seguido, cerca de quien lo usa.** No va en un contexto ni en un store global que re-renderiza media app. En Zustand, siempre con selector: `useStore((s) => s.campo)`.
7. **Memorizar con evidencia.** `useMemo` y `useCallback` para filtrar u ordenar listas grandes o cálculos caros; no en cada función.

---

## 4. Carga y bundle

1. **Toda página nueva es perezosa**: se registra en `app/router.tsx` con `paginaPerezosa`.
2. **Lo pesado que no se ve al entrar, también**: gráficos, modales grandes y formularios de edición se cargan con `lazy` + `Suspense` o con `import()` dinámico.
3. **Dependencias nuevas**: además de consultarlo (regla 9 de `front/AGENTS.md`), revisá su peso y preferí APIs nativas (`Intl` para formatear fechas y monedas).
4. **Íconos de a uno**: `import { Search } from "lucide-react"`, nunca `import *`.
5. **Imágenes** en WebP o AVIF, con `loading="lazy"` y `width`/`height` declarados para que el layout no salte.

---

## 5. Cómo medir

1. **Sobre un build de producción**: `npm run build && npm run preview`, con el back corriendo. En `npm run dev` la app es varias veces más lenta (React de desarrollo, `StrictMode` que renderiza dos veces, módulos que se cargan a demanda): colapsar el sidebar traba 153 ms en dev y 0 ms en producción. Si solo hay mocks, medí en dev y tomá el número como el peor caso.
2. **Chrome DevTools → Performance**, con **CPU 4x slowdown** (celular de gama media). Grabá la interacción y revisá las tareas largas (marcadas en rojo, más de 50 ms) y los cuadros perdidos.
3. **Lighthouse en modo mobile** para la carga de las pantallas de entrada (login, inicio de cada rol).
4. **A 360 px**, igual que el chequeo responsive (`docs/RESPONSIVE.md`).

---

## 6. Checklist de cada US

- [ ] Las animaciones solo usan `transform`/`opacity`, respetan las duraciones de la tabla y se apagan con movimiento reducido.
- [ ] Medí las interacciones de la US con CPU 4x: ninguna tarea larga pasa los 100 ms.
- [ ] Las listas están paginadas, no hay pedidos por fila y cada consulta tiene `staleTime` y una clave propia.
- [ ] La página nueva es perezosa y no agrega peso al bundle inicial.
- [ ] El PR dice qué se midió y con qué resultado; si se simplificó un efecto visual por rendimiento, también.

---

## 7. Por qué existe esta regla

En octubre de 2026 el equipo de back reportó micro-cortes al cambiar el tema, al navegar y al abrir el menú mobile. La medición confirmó parte del problema y se ajustó:

- **Tema**: de 450 a 250 ms, y se pausan las 58 transiciones de color que se disparaban juntas.
- **Menú mobile**: de 300/200 ms a 250/180 ms; la cascada de ítems bajó de ~520 a ~290 ms.
- **Entrada de página**: de 280 a 200 ms.
- **Movimiento reducido**: ahora lo respeta toda la app, no solo una lista de clases.

Queda pendiente: cada página monta su propio `OwnerLayout`, así que el menú se vuelve a montar en cada navegación. Convertirlo en una ruta de layout de `app/router.tsx` baja ese trabajo.
