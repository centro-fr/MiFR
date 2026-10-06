# MiFR

Sistema de gestión para un gimnasio / centro de entrenamiento, desarrollado como proyecto de la materia Seminario Integrador.

El proyecto es un monorepo con dos paquetes: una API en Node + TypeScript (`back`) y una SPA en React + Vite (`front`).

## Estado

**Sprint 1 (Autenticación, Accesos y Configuración Base): backend completo.** El detalle está en [`back/SPRINT-1.md`](back/SPRINT-1.md).

| US | Historia | Back | Front |
| :--- | :--- | :--- | :--- |
| US-01 | Inicio de sesión con Google Auth | Completa | Conectada a la API |
| US-02 | Definición de permisos por rol | Completa | Conectada a la API |
| US-03 | Alta y administración de actividades y cupos | Completa | Conectada a la API |
| US-04 | Asignación de profesoras y horarios | Completa | Conectada a la API |

El back tiene cobertura de tests del 100%. Las pantallas del front de estas historias consumen la API real; las demás secciones del menú muestran "En construcción". Todavía no hay nada publicado.

## Requisitos

- Node.js 22, la misma versión que usa la imagen de Docker
- pnpm 10.33.2 (`corepack enable` lo instala según el campo `packageManager`)
- Docker, para la base de datos local

## Puesta en marcha

Desde la raíz del proyecto:

```bash
pnpm install
cp back/.env.example back/.env       # completar GOOGLE_CLIENT_ID y JWT_SECRET
cp front/.env.example front/.env     # completar VITE_GOOGLE_CLIENT_ID (o usar el login de desarrollo)
docker compose up -d db              # PostgreSQL en el puerto 55432
pnpm --filter back prisma:migrate    # aplica las migraciones
pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <AAAA-MM-DD>
```

El seed carga los roles, los permisos y la primera propietaria. No hay auto-registro: solo puede iniciar sesión quien ya fue dado de alta, así que para entrar con Google el correo tiene que ser una cuenta de Google real.

Para cargar datos de prueba (profesoras, actividades, horarios y un usuario con los roles PROPIETARIA y PROFESORA):

```bash
pnpm --filter back db:seed:demo -- [email-del-usuario-multirol]
```

Sin email, el usuario multirol es `marina.sosa@example.com`. Las profesoras de prueba son `lucia.gomez@example.com` y `carla.ruiz@example.com`. El seed de prueba solo corre contra una base local: si `DATABASE_URL` apunta a otro host, se niega.

## Cómo ejecutarlo

Cada comando en su propia terminal:

```bash
pnpm dev:back    # API en http://localhost:3000, con recarga automática (tsx)
pnpm dev:front   # front en http://localhost:5173 (Vite); pnpm dev hace lo mismo
```

El navegador solo habla con el front: Vite reenvía `/api` a la API (`API_URL` en `front/.env`), igual que Netlify en producción. Por eso no hace falta configurar CORS en desarrollo.

Con la API levantada fuera de producción, la documentación Swagger queda en `http://localhost:3000/api/v1/docs` y el documento OpenAPI en `http://localhost:3000/api/v1/docs/openapi.json`.

Para probar los endpoints sin pasar por Google, `pnpm --filter back token -- [email]` emite un JWT válido para ese usuario (por defecto, la primera propietaria). Lee `JWT_SECRET` de `back/.env`. Es solo para desarrollo: firma tokens de cualquier usuario sin login, así que nunca se corre contra la base de producción.

### Entrar al front sin Google

Para usar el front contra la API sin configurar Google, se activa el login de desarrollo en los dos paquetes:

```bash
# back/.env
LOGIN_DESARROLLO=true
# front/.env
VITE_LOGIN_DESARROLLO=true
```

La pantalla de login pide un email en lugar del botón de Google y entra con cualquier usuario dado de alta y activo, por ejemplo `marina.sosa@example.com` del seed de prueba. Cada ingreso queda en el log de auditoría (`LOGIN_DESARROLLO`). La API no arranca si `LOGIN_DESARROLLO=true` y `NODE_ENV=production`.

### Front con mocks

Con `VITE_USE_MOCKS=true` en `front/.env`, el front no llama a la API: responde MSW con los mismos datos y reglas del back (los de `seed-demo.ts`). Sirve para trabajar en pantallas sin levantar el back. El login muestra un botón simulado que entra como la propietaria de prueba. Sin la variable, o en `false`, el front usa la API real.

### Con Docker Compose

`docker-compose.yml` levanta dos servicios:

| Servicio | Qué hace |
| :--- | :--- |
| `db` | PostgreSQL 16, publicado en el puerto `55432` del host |
| `api` | El backend compilado, publicado en el puerto `3000` del host. Al arrancar aplica las migraciones pendientes de Prisma |

La API arranca cuando la base está sana. Es la misma imagen que se va a publicar en Render (ver `back/DESPLIEGUE.md`). Toma las variables de `back/.env` (`GOOGLE_CLIENT_ID`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV` y `LOGIN_DESARROLLO`), así que ese archivo tiene que existir. `DATABASE_URL` la define el compose para apuntar al servicio `db`.

```bash
docker compose up -d --build        # construye y levanta todo
docker compose logs -f api          # ver los logs de la API
docker compose up -d db             # solo la base, para trabajar con pnpm dev:back
```

El modo de la API sale de `NODE_ENV` en `back/.env`. El `.env.example` trae `development`, que publica Swagger en `http://localhost:3000/api/v1/docs`. Si se borra la variable, el contenedor corre en `production`, sin Swagger, igual que en Render. Por defecto acepta pedidos desde `http://localhost:5173` y `http://localhost:3001`; para otro origen: `CORS_ORIGENES=<url> docker compose up -d api`.

Después de cambiar `back/.env` hay que recrear el contenedor: `docker compose up -d api`.

No se puede tener `pnpm dev:back` y el servicio `api` corriendo a la vez: los dos usan el puerto `3000`.

### Publicación

Todavía no está publicado. El plan (front en Netlify, API en Render en la región Virginia, base en Neon en AWS us-east-1, todos gratuitos) y los pasos están en [`back/DESPLIEGUE.md`](back/DESPLIEGUE.md). La configuración está en `render.yaml` y `netlify.toml`.

### Fechas y zona horaria

El servidor y la base corren en UTC, y el centro opera en Argentina (UTC-3). Los `TIMESTAMP` se guardan en UTC. Para el día de una columna `DATE` (altas, bajas y, más adelante, vencimientos), el back usa `fechaActualArgentina()` de `back/src/shared/utils/fecha-argentina.ts`; con `new Date()`, desde las 21:00 quedaría registrado el día siguiente. Al mostrar una columna `DATE` en el front hay que formatearla con `timeZone: "UTC"`, para que no aparezca un día antes.

## Estructura

```text
MiFR/
├── back/              API en Node + TypeScript, Express y Prisma
│   ├── src/modules/   un subsistema de la vista arquitectónica por carpeta
│   ├── src/shared/    errores, middlewares, OpenAPI y utilidades transversales
│   └── prisma/        esquema, migraciones y seeds
├── front/             SPA en React 19 + Vite
│   └── src/           features, componentes, clientes de la API y tipos
├── docs/              requisitos, specs, diagramas y diseño
├── docker-compose.yml base local y API en contenedor
├── render.yaml        Blueprint de Render para la API
├── netlify.toml       publicación del front y reenvío de /api
└── package.json       scripts del monorepo
```

## Scripts disponibles

### Raíz

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` / `pnpm dev:front` | Levanta el front con Vite |
| `pnpm dev:back` | Levanta la API con recarga automática |

### back

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Ejecuta `src/index.ts` con recarga automática |
| `pnpm build` | Compila TypeScript a `dist/`, sin los tests |
| `pnpm start` | Ejecuta la versión compilada |
| `pnpm test` | Corre los tests con Vitest |
| `pnpm test:coverage` | Corre los tests y mide la cobertura |
| `pnpm format` / `pnpm format:check` | Aplica o verifica el formato con Prettier |
| `pnpm prisma:migrate` | Crea y aplica migraciones en la base local |
| `pnpm prisma:generate` | Regenera el cliente de Prisma tras tocar el esquema |
| `pnpm prisma:studio` | Abre Prisma Studio para explorar la base |
| `pnpm db:seed` | Carga roles, permisos y la primera propietaria |
| `pnpm db:seed:demo` | Carga datos de prueba en la base local |
| `pnpm token` | Emite un JWT de desarrollo para un usuario |

### front

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Servidor de desarrollo en el puerto 5173 |
| `pnpm build` | Compila y genera el bundle de producción |
| `pnpm preview` | Sirve el bundle ya compilado |
| `pnpm lint` | Corre ESLint |

## Variables de entorno

Los archivos `.env` están ignorados por Git. Cada paquete versiona un `.env.example` con las claves esperadas, sin valores reales.

| Archivo | Variable | Para qué |
| :--- | :--- | :--- |
| `back/.env` | `DATABASE_URL` | Conexión a PostgreSQL |
| | `GOOGLE_CLIENT_ID` | Validación del token de Google |
| | `JWT_SECRET` | Firma del token propio |
| | `JWT_EXPIRES_IN` | Vigencia del token, por defecto `8h` |
| | `PORT` | Puerto de la API, por defecto `3000` |
| | `NODE_ENV` | Con `production` no se publica Swagger y `CORS_ORIGENES` pasa a ser obligatoria |
| | `CORS_ORIGENES` | Orígenes que pueden llamar a la API, separados por comas |
| | `LOGIN_DESARROLLO` | Solo desarrollo: con `true` habilita `POST /api/v1/auth/desarrollo` para entrar con el email de un usuario dado de alta, sin Google. Con `NODE_ENV=production` la API no arranca |
| `front/.env` | `VITE_GOOGLE_CLIENT_ID` | Botón de inicio de sesión con Google |
| | `VITE_LOGIN_DESARROLLO` | Con `true`, el login pide un email en lugar de Google. Necesita `LOGIN_DESARROLLO=true` en el back |
| | `VITE_USE_MOCKS` | Con `true`, el front usa los mocks de MSW en lugar de la API real. Sin valor o en `false`, usa la API |
| | `API_URL` | Adónde reenvía `/api` el servidor de Vite, por defecto `http://localhost:3000` |

## Documentación

- `docs/` — Estudio Inicial, Plan de Proyecto, Sprint 0 y Definición del Producto (PDF)
- `docs/specs/` — historias de usuario con sus criterios de aceptación
- `docs/sdd/` — spec, plan y tareas por módulo
- `docs/diagrams/puml/` — DER, vista arquitectónica y vista de despliegue en PlantUML
- `docs/diagrams/enterprise_architect/` — el modelo de Enterprise Architect y sus exportaciones
- `docs/design/` — menús, criterios responsive y prompts de diseño
- `back/CLAUDE.md` y `back/.claude/rules/` — arquitectura, convenciones y reglas del backend
- `back/DESPLIEGUE.md` — plan de publicación
- `AGENTS.md` — estándares de código y seguridad del proyecto

Los diagramas `.puml` se pueden ver con la extensión PlantUML de VS Code o en <https://plantuml.com/>
