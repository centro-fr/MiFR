# AGENTS.md – MiFR Frontend

## 1. Contexto del proyecto

Estamos construyendo **MiFR**, un sistema de gestión para el **Centro de Entrenamiento FR**.
El sistema maneja alumnos, clases grupales y personalizadas, asistencia, pagos, honorarios, rutina y progreso físico, notificaciones y reportes.

### Roles del sistema

- **Propietaria**: acceso total, gestiona configuración, pagos, honorarios, reportes.
- **Profesora**: gestiona sus clases, toma asistencia, carga rutina y progreso.
- **Alumno / Tutor**: consulta su plan, asistencias, progreso; renueva su plan; informa transferencias.

Una misma persona puede tener más de un rol simultáneamente (ej: propietaria que también dicta clases).

### Tipo de actividad

Las actividades del centro se dividen en dos tipos:

- **Clase grupal**: cupo configurable u opcional.
- **Clase personalizada**: cupo máximo obligatorio, sin días de gracia.

### Terminología clave (obligatorio respetar)

- **NO usar "pago"** en la interfaz. El sistema no procesa pagos.
- Usar **"transferencia"** o **"aviso de transferencia"**.
- Usar **"pendiente de verificación"** (no "pendiente de confirmación").
- Usar **"Mis transferencias"** (no "Mis pagos").
- Usar **"Informar transferencia"** (no "Enviar pago").
- Usar **"Efectivo"** (no "Efectivo en sala").
- Usar **"Cobro"** para el efectivo registrado por la profesora.
- Usar **"Rendición"** para la entrega del efectivo a la propietaria.

Ver glosario completo en `docs/design/PROMPTS-STITCH.md`.

---

## 2. Stack tecnológico obligatorio

### Frontend

- **React + TypeScript** (modo estricto)
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Shadcn UI** para componentes base
- **React Router** para navegación
- **TanStack Query (React Query)** para data fetching y cache
- **Axios** para HTTP (con interceptores)
- **Zustand** para estado global liviano (solo cuando sea necesario)
- **React Hook Form** para manejo de formularios
- **Zod** para validación de esquemas (compartidos con backend)
- **MSW (Mock Service Worker)** para mocks durante el desarrollo

### Librerías complementarias

- **Sonner** (o similar) para toasts y notificaciones
- **Lucide React** para íconos
- **Recharts** o **Chart.js** para gráficos (dashboards y reportes)
- **Faker** para generar datos realistas en mocks
- **date-fns** o **dayjs** para manejo de fechas

### Herramientas de calidad

- ESLint + Prettier
- Husky (pre-commit hooks)
- TypeScript estricto (evitar `any`)

### Justificación por librería

| Librería | Por qué |
| ---------- | --------- |
| **React Query** | Cache inteligente, invalidación automática, optimistic updates |
| **Zustand** | Estado global simple sin boilerplate de Redux |
| **React Hook Form** | Formularios performantes y con buen manejo de validaciones |
| **Zod** | Validación tipada, reutilizable en front y back |
| **Shadcn UI** | Componentes accesibles y personalizables, sin dependencias pesadas |
| **Tailwind** | Estilos rápidos y consistentes |
| **MSW** | Mocks realistas sin modificar el código de los componentes |

---

## 3. Estructura de carpetas

```text
front/
├── public/
├── src/
│   ├── api/              → llamadas al backend (una por dominio)
│   ├── components/       → componentes reutilizables globales
│   ├── features/         → módulos por dominio (alumnos, asistencia, pagos...)
│   │   ├── alumnos/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── schemas/      → esquemas Zod
│   │   ├── asistencia/
│   │   ├── pagos/
│   │   └── ...
│   ├── hooks/            → hooks personalizados globales
│   ├── layouts/          → layouts por rol (alumno, profesora, propietaria, público)
│   ├── mocks/            → handlers de MSW
│   ├── pages/            → páginas de la aplicación
│   ├── stores/           → Zustand stores
│   ├── types/            → tipos TypeScript (compartidos con backend idealmente)
│   ├── utils/            → funciones auxiliares
│   └── App.tsx
├── docs/                 → NO va acá (va en la raíz del monorepo)
└── AGENTS.md             → este archivo
```

---

## 4. Reglas de trabajo (muy importantes)

1. **Antes de implementar cualquier feature**, lee primero la Spec correspondiente en `/docs/specs/` (agrupadas por épica).
2. **Nunca inventes endpoints.** Si no existe el contrato con backend, avisa y usa mock.
3. **Siempre implementá primero con MSW.** Después se conecta al backend real.
4. **Usá TypeScript en modo estricto.** Evitá `any`. Si es necesario, usá `unknown` y validá con Zod.
5. **Preferí componentes pequeños, reutilizables y con responsabilidad única.**
6. **Todos los textos de la interfaz van en español.**
7. **El diseño debe ser mobile-first** (el 95% de los alumnos usan celular).
8. **Manejá siempre los estados**: loading, empty, error y success.
9. **No agregues librerías nuevas sin consultarlo.**
10. **Cada PR debe estar vinculado a una User Story** (US-XX).
11. **Respetá los menús por rol** definidos en `docs/design/MENUS.md`.
12. **Respetá la terminología** del glosario (no usar "pago" en la UI).
13. **Respetá las reglas de legibilidad** (texto mínimo 14px, sin scroll horizontal).

---

## 5. Convenciones de nombres

| Tipo | Convención | Ejemplo |
| ------ | ----------- | --------- |
| Archivos | kebab-case | `take-attendance.tsx` |
| Componentes | PascalCase | `TakeAttendance` |
| Hooks | camelCase con `use` | `useAttendance` |
| Types / Interfaces | PascalCase | `Student`, `AttendanceStatus` |
| Constantes | UPPER_SNAKE_CASE | `MAX_CUPO_PERSONALIZADA` |
| Variables | camelCase | `alumnoActivo` |
| Rutas | kebab-case | `/app/tomar-asistencia` |
| Schemas Zod | camelCase con `Schema` | `alumnoSchema` |

---

## 6. Colores de marca (obligatorios)

Usar **siempre** estos colores en la interfaz:

| Nombre | HEX | RGB | Uso |
| -------- | ----- | ----- | ----- |
| Rosa FR (primary) | `#E91E82` | `rgb(233, 30, 130)` | Botones principales, acentos, badges activos |
| Rosa oscuro (primary dark) | `#BC1266` | `rgb(188, 18, 102)` | Hover, estados activos, degradados |
| Negro azulado (dark) | `#181C26` | `rgb(24, 28, 38)` | Texto principal, fondos oscuros |

Configurar en `tailwind.config.js` como `primary`, `primary-dark`, `dark`.

**Estados de cuota (badges):**

- Al día → verde (#10B981)
- Por vencer → amarillo (#F59E0B)
- Vencida → rojo (#EF4444)

**Estados de actividad (badges):**

- Grupal → azul (#3B82F6)
- Personalizada → violeta (#8B5CF6)

**Estados de transferencia:**

- Sin informar → gris (#6B7280)
- Pendiente de verificación → amarillo (#F59E0B)
- Verificada/Aprobada → verde (#10B981)
- Rechazada → rojo (#EF4444)

**Estados de rendición de efectivo:**

- Al día → verde (#10B981)
- Atención (>15 días) → amarillo (#F59E0B)
- Urgente (>30 días) → rojo (#EF4444)

---

## 7. Flujo de trabajo recomendado por feature

1. **Leer la Spec** en `/docs/specs/<épica>/US-XX-*.md`.
2. **Definir/actualizar los types** en `src/types/`.
3. **Definir el esquema Zod** en `src/features/<dominio>/schemas/`.
4. **Crear el handler de MSW** en `src/mocks/handlers/`.
5. **Crear el hook** (con React Query) en `src/features/<dominio>/hooks/`.
6. **Crear los componentes** en `src/features/<dominio>/components/`.
7. **Crear la page** en `src/features/<dominio>/pages/` o `src/pages/`.
8. **Conectar con el layout y las rutas** según el rol.
9. **Probar con mocks** (loading, empty, error, success).
10. **Cuando el backend esté listo**: reemplazar el mock por la llamada real.

---

## 8. Manejo de estados (obligatorio en cada pantalla)

Toda pantalla que consuma datos debe manejar:

- **Loading**: skeleton o spinner, nunca pantalla en blanco.
- **Empty**: mensaje claro + ícono + acción sugerida si aplica.
- **Error**: mensaje entendible + botón de reintentar.
- **Success**: contenido normal.
- **Sin permisos** (si aplica): mensaje claro de acceso restringido.

**Estados adicionales para pantallas específicas:**

- **Guardando**: botón con spinner + "Guardando..."
- **Confirmación**: modal antes de acciones destructivas
- **Éxito**: toast de confirmación

---

## 9. Autenticación y permisos

- **Google Identity Services (Google Auth)** como único método de login.
- **No almacenar contraseñas locales.**
- Guardar el token de forma segura (memoria + httpOnly cookie si es posible).
- **Rutas protegidas por rol**:
  - `/app/*` requiere autenticación.
  - Cada sección valida el rol del usuario.
- **Hook centralizado de permisos**: `usePermissions()`.
- **Componente de guardia**: `<Can permission="...">`.
- Los menús laterales se ocultan según los permisos del usuario.
- Una persona con múltiples roles ve la **unión** de sus permisos.

Ver `docs/design/MENUS.md` para los menús exactos por rol.

---

## 10. Comunicación con el backend

- **Base URL configurable** por variable de entorno (`VITE_API_URL`).
- **Axios con interceptores**:
  - Agregar token de autenticación automáticamente.
  - Manejo centralizado de errores (401 → logout, 403 → acceso denegado).
- **React Query**:
  - Cache inteligente (staleTime configurado por dominio).
  - Invalidación automática al mutar datos.
  - Optimistic updates donde tenga sentido (ej: marcar asistencia).
- **Contratos de API**: documentados en `/docs/api/` (OpenAPI o por módulo).
- **Nunca inventar endpoints.** Si no existe, avisar y usar MSW.

---

## 11. Mocks con MSW

- **Todos los handlers** en `src/mocks/handlers/` (uno por dominio).
- **Datos realistas** con Faker cuando sea necesario.
- **Activar/desactivar** según variable de entorno (`VITE_USE_MOCKS`).
- **Siempre manejar** respuestas exitosas y de error en los mocks.
- Los mocks deben ser **fáciles de eliminar** cuando el backend esté listo.

---

## 12. Formularios y validación

### React Hook Form

- Usar `useForm` para el manejo del estado del formulario.
- Evitar re-renders innecesarios con `Controller` cuando sea necesario.
- Definir `defaultValues` y `mode: 'onBlur'` o `mode: 'onChange'` según el caso.

### Zod

- Definir esquemas en `src/features/<dominio>/schemas/`.
- Compartir esquemas con backend cuando sea posible.
- Usar `zodResolver` de `@hookform/resolvers` para integrar con React Hook Form.

### Buenas prácticas

- **Mensajes de error en español**, claros y accionables.
- **Validación en tiempo real** donde tenga sentido.
- **Feedback inmediato** al usuario (toasts, mensajes inline).
- **Campos obligatorios** marcados con asterisco rojo.
- **Validación condicional** (ej: si es menor de edad, exigir tutor).

---

## 13. UI / UX

- **Mobile-first**: diseñar primero para celular, luego adaptar a desktop.
- **Componentes de Shadcn UI** como base (no reinventar).
- **Espaciado consistente** (Tailwind: `space-y-4`, `gap-2`, etc.).
- **Tipografía clara** y legible (mínimo 14px en mobile, 16px en desktop).
- **Botones grandes** en mobile (mínimo 44x44px).
- **Feedback visual** en cada acción (loading, success, error).
- **Confirmaciones** para acciones destructivas (eliminar, dar de baja).
- **Accesibilidad**: contraste adecuado, foco visible, ARIA cuando aplique.
- **Toasts** para notificaciones breves (usar Sonner o similar).

### Reglas de legibilidad (obligatorias)

- **Desktop (1440px)**: ancho máximo 1200-1280px, centrado.
- **Mobile (390px)**: padding lateral 16-20px.
- **Nunca scroll horizontal.**
- **Texto nunca cortado.**
- **Títulos claramente más grandes que el cuerpo.**

---

## 14. Testing (mínimo viable)

- **Tests de componentes críticos** (asistencia, panel del alumno, pagos).
- **Tests de flujos principales** (login → asistencia → pago).
- **MSW reutilizado** en los tests.
- **Vitest** como framework (recomendado con Vite).
- **Testing Library** para tests de componentes.

---

## 15. Deploy

- **Vercel / Netlify / Cloudflare Pages** (elegir uno).
- **Variables de entorno** configuradas en el panel del deploy.
- **Build optimizado**: lazy loading de rutas, code splitting.
- **SEO** solo en la landing pública (considerar SSR o pre-render).
- **La app autenticada** no necesita SEO.

---

## 16. Cuando el backend esté listo

Para cada feature:

1. **Reemplazar el baseURL** en Axios.
2. **Eliminar o desactivar** el handler de MSW correspondiente.
3. **Verificar que los types** sigan coincidiendo con el contrato real.
4. **Verificar que los esquemas Zod** coincidan con los del backend.
5. **Probar el flujo completo** contra el backend real.
6. **Actualizar la Spec** si hubo cambios en el contrato.

---

## 17. Recursos y referencias

- **Documentación de las Specs**: `/docs/specs/`
- **Contratos de API**: `/docs/api/`
- **Menús por rol**: `docs/design/MENUS.md`
- **Plan de prompts**: `docs/design/PROMPTS-STITCH.md`
- **Estrategia responsive**: `docs/RESPONSIVE.md`
- **Product Backlog y Story Map**: en el Sprint 0 (raíz del repo)
- **Referencias visuales**: Trainingym, Virtuagym, Glofox, Harbiz (para inspiración)

---

## 18. Principios generales

1. **Claridad antes que cleverness.**
2. **Consistencia por encima de preferencias personales.**
3. **Mobile-first siempre.**
4. **No reinventar la rueda** (usar Shadcn, React Query, Zod, React Hook Form).
5. **Documentar decisiones importantes** (comentarios, READMEs, ADRs si aplica).
6. **Cada PR debe ser revisable en menos de 30 minutos** (PRs pequeños).
7. **Pensar en el usuario final**: propietaria, profesora, alumno/tutor.
8. **No bloquearse esperando al backend**: usar MSW y avanzar.
9. **Respetar la terminología** del glosario.
10. **Respetar los menús por rol** definidos en `MENUS.md`.

---

## 19. Responsive

Antes de implementar cualquier pantalla, consultá `docs/RESPONSIVE.md` para saber:

- Qué formato es prioritario (mobile, desktop o ambos)
- Qué patrones de adaptación aplicar
- Qué casos de testing responsive ejecutar

---

## 20. Librerías específicas (detalle)

### Zustand

- Usar para **estado global liviano** (ej: usuario logueado, filtros persistentes).
- Evitar sobreuso: si el estado se puede manejar con React Query o useState local, preferirlo.
- Stores en `src/stores/` (uno por dominio).

### React Hook Form

- Usar `useForm` con `zodResolver` para integración con Zod.
- Definir `defaultValues` siempre.
- Usar `mode: 'onBlur'` para formularios grandes y `mode: 'onChange'` para validaciones en tiempo real.

### Zod

- Definir esquemas en `src/features/<dominio>/schemas/`.
- Nombrar esquemas como `alumnoSchema`, `pagoSchema`, etc.
- Compartir esquemas con el backend cuando sea posible (idealmente en un paquete compartido).
- Inferir tipos con `z.infer<typeof schema>`.

### React Query

- Definir hooks por dominio: `useAlumnos`, `useAsistencia`, etc.
- Configurar `staleTime` según la frecuencia de actualización:
  - Datos estáticos (planes, actividades): 5-10 minutos.
  - Datos dinámicos (asistencia, cuotas): 30 segundos - 1 minuto.
- Invalidar queries al mutar datos: `queryClient.invalidateQueries({ queryKey: ['alumnos'] })`.
- Usar `useMutation` para acciones (crear, editar, eliminar).

---

Última actualización: 19/9/2026
