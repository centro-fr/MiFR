# MiFR

Sistema de gestión para un gimnasio / centro de entrenamiento, desarrollado como proyecto de la materia Seminario Integrador.

Monorepo con dos paquetes: una API en Node + TypeScript, Express y Prisma (`back`) y una SPA en React 19 + Vite (`front`). La base es PostgreSQL 16.

## Estado

**Sprint 1 (Autenticación, Accesos y Configuración Base): backend completo**, con 100% de cobertura de tests. Detalle en [`back/SPRINT-1.md`](back/SPRINT-1.md).

| US    | Historia                                     | Back     | Front              |
| :---- | :------------------------------------------- | :------- | :----------------- |
| US-01 | Inicio de sesión con Google Auth             | Completa | Conectada a la API |
| US-02 | Definición de permisos por rol               | Completa | Conectada a la API |
| US-03 | Alta y administración de actividades y cupos | Completa | Conectada a la API |
| US-04 | Asignación de profesoras y horarios          | Completa | Conectada a la API |

Las demás secciones del menú muestran "En construcción". Todavía no hay nada publicado.

---

## Desarrollo local

### Requisitos

- **Node.js 22**, la misma versión que usa la imagen de Docker.
- **pnpm 10.33.2**: `corepack enable` lo instala según el campo `packageManager`.
- **Docker Desktop abierto**: la base, y opcionalmente la API, corren en contenedores.
- **Windows**: si `git clone` falla con `Filename too long`, correr `git config --global core.longpaths true` y clonar en una ruta corta (por ejemplo `C:\dev\MiFR`).

### 1. Instalar y configurar

Desde la raíz del proyecto:

```bash
pnpm install
cp back/.env.example back/.env
cp front/.env.example front/.env
```

Para entrar al sistema sin configurar Google, activar el login de desarrollo en los dos archivos:

```bash
# back/.env
LOGIN_DESARROLLO=true

# front/.env
VITE_LOGIN_DESARROLLO=true
```

Con eso alcanza: el resto de los valores de los `.env.example` ya sirven para trabajar en local. El detalle de cada variable está en [Variables de entorno de desarrollo](#variables-de-entorno-de-desarrollo).

### 2. Levantar el proyecto

Hay dos formas. Las dos dejan la base en el puerto `55432` con migraciones y datos de prueba.

**Opción A: API en Docker.** Para trabajar en el front. La API corre con la misma imagen que se publica, pero sin recarga automática.

```bash
docker compose up -d --build              # base + API; la API aplica las migraciones al arrancar
pnpm --filter back prisma:generate        # genera el cliente de Prisma que usa el seed
pnpm --filter back db:seed:demo           # roles, permisos y datos de prueba
pnpm dev:front                            # front en http://localhost:5173
```

**Opción B: API con recarga automática.** Para trabajar en el back.

```bash
docker compose up -d db                   # solo la base
pnpm --filter back prisma:migrate         # aplica las migraciones y genera el cliente de Prisma
pnpm --filter back db:seed:demo           # roles, permisos y datos de prueba
pnpm dev:back                             # terminal 1: API en http://localhost:3000
pnpm dev:front                            # terminal 2: front en http://localhost:5173
```

**Opción C: sistema completo en contenedores.** Para probar front, API y base juntos, como se publican, antes de desplegar. El front se compila y lo sirve nginx con las mismas cabeceras de seguridad que Netlify, reenviando `/api` a la API; los datos de prueba se cargan solos.

```bash
docker compose --profile completo up -d --build   # base + API + datos de prueba + front
pnpm probar:compose                               # prueba de humo: front, /api, login y datos de la base
```

Abrir <http://localhost:8080> y entrar con el login de desarrollo como `marina.sosa@example.com` (propietaria y profesora). Necesita `NODE_ENV="development"` y `LOGIN_DESARROLLO=true` en `back/.env`. Para apagarlo: `docker compose --profile completo down` (sin el perfil, `down` no apaga el front).

### 3. Entrar

Abrir <http://localhost:5173> y entrar con `marina.sosa@example.com` (propietaria y profesora).

| Qué     | Dónde                                                          |
| :------ | :------------------------------------------------------------- |
| Front   | <http://localhost:5173>                                        |
| API     | <http://localhost:3000> (`/health` responde `{"status":"ok"}`) |
| Swagger | <http://localhost:3000/api/v1/docs>                            |
| OpenAPI | <http://localhost:3000/api/v1/docs/openapi.json>               |

El navegador solo habla con el front: Vite reenvía `/api` a la API, igual que Netlify en producción. Por eso no hace falta configurar CORS en desarrollo.

### Variables de entorno de desarrollo

Los `.env` están ignorados por Git; cada paquete versiona un `.env.example` con las claves y valores que sirven en local.

**`back/.env`**

| Variable           | Valor en desarrollo                | Para qué                                                                                                                                    |
| :----------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`     | El del ejemplo (`localhost:55432`) | Conexión a la base del compose. Con la Opción A, el contenedor de la API la reemplaza por la suya                                           |
| `JWT_SECRET`       | El del ejemplo sirve               | Firma del token propio. Nunca reutilizarlo en producción                                                                                    |
| `NODE_ENV`         | `development`                      | Publica Swagger. Con `production`, la API exige `CORS_ORIGENES`                                                                             |
| `LOGIN_DESARROLLO` | `true`                             | Habilita `POST /api/v1/auth/desarrollo` para entrar con un email, sin Google. La API no arranca si está en `true` con `NODE_ENV=production` |
| `GOOGLE_CLIENT_ID` | Solo para probar Google            | Ver [Login con Google en local](#login-con-google-en-local)                                                                                 |
| `JWT_EXPIRES_IN`   | Opcional, `8h`                     | Vigencia del token                                                                                                                          |
| `PORT`             | Opcional, `3000`                   | Puerto de la API                                                                                                                            |
| `CORS_ORIGENES`    | Opcional                           | Orígenes permitidos, separados por comas                                                                                                    |
| `PROXIES_DE_CONFIANZA` | Opcional, `0`                  | Proxies delante de la API: de ahí sale la IP del visitante que cuenta el límite de pedidos                                                  |
| `FIRMA_PROXY_NETLIFY` | Sin definir                     | Con valor, la API exige la firma de Netlify. En local no se define: el proxy de Vite no firma los pedidos                                   |

**`front/.env`**

| Variable                | Valor en desarrollo               | Para qué                                                                                         |
| :---------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------- |
| `VITE_LOGIN_DESARROLLO` | `true`                            | El login pide un email en lugar del botón de Google. Necesita `LOGIN_DESARROLLO=true` en el back |
| `VITE_USE_MOCKS`        | `false`                           | Con `true`, el front no llama a la API: responde MSW con los datos de `seed-demo.ts`             |
| `VITE_GOOGLE_CLIENT_ID` | Solo para probar Google           | Botón de inicio de sesión con Google                                                             |
| `API_URL`               | Opcional, `http://localhost:3000` | Adónde reenvía `/api` el servidor de Vite                                                        |

Con la Opción A, después de cambiar `back/.env` hay que recrear el contenedor: `docker compose up -d api`. Los cambios en `front/.env` necesitan reiniciar `pnpm dev:front`.

### Datos de prueba

`db:seed:demo` es autosuficiente e idempotente: crea roles, permisos y la matriz de accesos si no existen, y carga profesoras, actividades y horarios. Solo corre contra una base local; si `DATABASE_URL` apunta a otro host, se niega.

| Email                     | Roles                   |
| :------------------------ | :---------------------- |
| `lucia.gomez@example.com` | PROFESORA               |
| `carla.ruiz@example.com`  | PROFESORA               |
| `marina.sosa@example.com` | PROPIETARIA + PROFESORA |

Para usar un email de Google real en lugar de `marina.sosa@example.com`:

```bash
pnpm --filter back db:seed:demo -- tu-cuenta@gmail.com
```

### Login con Google en local

1. En Google Cloud Console, crear o reutilizar un client OAuth de tipo aplicación web y agregar `http://localhost:5173` en **Orígenes autorizados de JavaScript**.
2. Poner el mismo client ID en `GOOGLE_CLIENT_ID` (`back/.env`) y en `VITE_GOOGLE_CLIENT_ID` (`front/.env`).
3. Dejar `LOGIN_DESARROLLO` y `VITE_LOGIN_DESARROLLO` en `false`.
4. Cargar los datos de prueba con tu email: no hay auto-registro, así que solo entran usuarios dados de alta.

### Trabajo diario

| Situación                              | Qué hacer                                                                                                                          |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Después de un `git pull`               | `pnpm install` y `pnpm --filter back prisma:migrate` (Opción B) o `docker compose up -d --build api` (Opción A)                    |
| Cambié `schema.prisma`                 | `pnpm --filter back prisma:migrate` crea la migración, la aplica y regenera el cliente                                             |
| Cambié código del back con la Opción A | `docker compose up -d --build api`                                                                                                 |
| Pasar de la Opción A a la B            | `docker compose stop api`: la API del contenedor y `pnpm dev:back` usan el mismo puerto `3000`                                     |
| Empezar con la base vacía              | `docker compose down -v` borra la base local; después, repetir el paso 2                                                           |
| Probar endpoints sin el front          | `pnpm --filter back token -- [email]` emite un JWT para ese usuario (por defecto, la primera propietaria). Solo para la base local |
| Trabajar en el front sin el back       | `VITE_USE_MOCKS=true` en `front/.env`. El login muestra un botón que entra como la propietaria de prueba                           |
| Ver los logs de la API en Docker       | `docker compose logs -f api`                                                                                                       |

Antes de subir cambios: `pnpm --filter back test`, `pnpm --filter back test:integration` (ver la skill [`tests-integracion`](back/.claude/skills/tests-integracion/SKILL.md) y el plan en [`PRUEBAS-INTEGRACION.md`](PRUEBAS-INTEGRACION.md)) y `pnpm --filter back format:check` en el back; `pnpm --filter front lint` y `pnpm --filter front build` en el front.

### Problemas comunes

| Síntoma                                                      | Causa y solución                                                                                                                    |
| :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `error during connect ... dockerDesktopLinuxEngine`          | Docker Desktop no está abierto. Abrirlo y esperar a que termine de arrancar                                                         |
| `db:seed:demo` falla al importar `@prisma/client`            | Falta generar el cliente: `pnpm --filter back prisma:generate`                                                                      |
| `EADDRINUSE` o `ports are not available` en el puerto `3000` | El contenedor `api` y `pnpm dev:back` usan el mismo puerto. Parar uno: `docker compose stop api` o cortar `pnpm dev:back`           |
| La API no arranca: `Falta FIRMA_PROXY_NETLIFY`               | `back/.env` no tiene `NODE_ENV` y el contenedor corre en `production`, que exige la firma de Netlify. Agregar `NODE_ENV="development"` |
| `container name "/mifr-db" is already in use`                | Hay contenedores de otra copia del repositorio. `docker rm mifr-db mifr-api` los saca; los datos de cada copia quedan en su volumen |
| La pantalla de login pide definir `VITE_GOOGLE_CLIENT_ID`    | No está activo el login de desarrollo ni configurado Google. Ver el paso 1                                                          |
| El login de desarrollo responde 404                          | Falta `LOGIN_DESARROLLO=true` en `back/.env`, o con la Opción A no se recreó el contenedor                                          |

### Convenciones

**Fechas y zona horaria.** El servidor y la base corren en UTC, y el centro opera en Argentina (UTC-3). Los `TIMESTAMP` se guardan en UTC. Para el día de una columna `DATE` (altas, bajas y, más adelante, vencimientos), el back usa `fechaActualArgentina()` de `back/src/shared/utils/fecha-argentina.ts`; con `new Date()`, desde las 21:00 quedaría registrado el día siguiente. En el front, una columna `DATE` se formatea con `timeZone: "UTC"`, para que no aparezca un día antes.

Arquitectura, convenciones y reglas del backend: [`back/CLAUDE.md`](back/CLAUDE.md) y `back/.claude/rules/`. Estándares de código y seguridad del proyecto: [`AGENTS.md`](AGENTS.md).

---

## Producción

Todavía no está publicado. El plan y el paso a paso completo están en [`back/DESPLIEGUE.md`](back/DESPLIEGUE.md); esto es el resumen.

```text
Navegador ──► Netlify (front + reenvío de /api) ──► Render (API en Docker) ──► Neon (PostgreSQL)
```

La API usa la misma imagen que el compose local (`back/Dockerfile`) y aplica las migraciones con `prisma migrate deploy` al arrancar. La configuración está versionada en `render.yaml` y `netlify.toml`.

### Variables de entorno de producción

**API (Render)**, cargadas en el panel de Render. Ningún valor se escribe en el repositorio.

| Variable           | Valor                                                                               |
| :----------------- | :---------------------------------------------------------------------------------- |
| `NODE_ENV`         | `production` (lo fija `render.yaml`): sin Swagger y con `CORS_ORIGENES` obligatoria |
| `DATABASE_URL`     | Cadena **directa** de Neon (sin `-pooler`), con `?sslmode=require`                  |
| `GOOGLE_CLIENT_ID` | Client ID de Google de producción                                                   |
| `JWT_SECRET`       | Lo genera Render con un valor aleatorio                                             |
| `JWT_EXPIRES_IN`   | `8h` (lo fija `render.yaml`)                                                        |
| `CORS_ORIGENES`    | URL del sitio de Netlify, por ejemplo `https://mifr.netlify.app`                    |
| `PROXIES_DE_CONFIANZA` | Empezar con `2` y calibrarlo después del primer deploy (ver `DESPLIEGUE.md`)    |
| `FIRMA_PROXY_NETLIFY` | Secreto aleatorio de 32 caracteres o más, el mismo que la variable homónima de Netlify |

`LOGIN_DESARROLLO` no se define: con `true` la API no arranca en producción.

**Front (Netlify)**, cargadas en la configuración del sitio. Vite las incrusta al compilar, así que cambiarlas requiere un nuevo deploy.

| Variable                | Valor                         |
| :---------------------- | :---------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | El mismo client ID que la API |

`VITE_LOGIN_DESARROLLO` y `VITE_USE_MOCKS` no se definen. `API_URL` tampoco: en producción el reenvío de `/api` lo hace `netlify.toml`.

### Reglas para producción

- La primera propietaria se carga una sola vez con `db:seed`, apuntando a Neon desde una máquina local (ver `DESPLIEGUE.md`, paso 3).
- Nunca correr contra Neon `db:seed:demo`, `token`, `prisma migrate dev`, `migrate reset` ni `db push`. Las migraciones las aplica solo el contenedor.
- La URL de Netlify va en `CORS_ORIGENES` y en los orígenes autorizados del client OAuth de Google.

---

## Referencia

### Estructura

```text
MiFR/
├── back/              API en Node + TypeScript, Express y Prisma
│   ├── src/modules/   un subsistema de la vista arquitectónica por carpeta
│   ├── src/shared/    errores, middlewares, OpenAPI y utilidades transversales
│   └── prisma/        esquema, migraciones y seeds
├── front/             SPA en React 19 + Vite
│   └── src/           features, componentes, clientes de la API y tipos
├── docs/              requisitos, specs, diagramas y diseño
├── docker-compose.yml base local (db) y API en contenedor (api)
├── render.yaml        Blueprint de Render para la API
├── netlify.toml       publicación del front y reenvío de /api
└── package.json       scripts del monorepo
```

### Scripts

Desde la raíz, `pnpm dev:back` y `pnpm dev:front` (o `pnpm dev`) levantan cada paquete. El resto se corre con `pnpm --filter <paquete> <script>`.

| Paquete | Script                    | Descripción                                                                          |
| :------ | :------------------------ | :----------------------------------------------------------------------------------- |
| back    | `dev`                     | API con recarga automática (tsx)                                                     |
|         | `build` / `start`         | Compila a `dist/` sin los tests / ejecuta lo compilado                               |
|         | `test` / `test:coverage`  | Tests unitarios con Vitest / con cobertura                                           |
|         | `test:integration`        | Tests de integración contra Postgres (`docker compose --profile test up -d db-test`) |
|         | `format` / `format:check` | Aplica o verifica el formato con Prettier                                            |
|         | `prisma:migrate`          | Crea y aplica migraciones en la base local y regenera el cliente                     |
|         | `prisma:generate`         | Regenera el cliente de Prisma                                                        |
|         | `prisma:studio`           | Abre Prisma Studio para explorar la base                                             |
|         | `db:seed:demo`            | Setup completo de desarrollo con datos de prueba                                     |
|         | `db:seed`                 | Roles, permisos y la primera propietaria (producción)                                |
|         | `token`                   | Emite un JWT de desarrollo para un usuario                                           |
| front   | `dev`                     | Servidor de desarrollo en el puerto 5173                                             |
|         | `build` / `preview`       | Bundle de producción / lo sirve localmente                                           |
|         | `lint`                    | ESLint                                                                               |

### Documentación

- `docs/` — Estudio Inicial, Plan de Proyecto, Sprint 0 y Definición del Producto (PDF)
- `docs/specs/` — historias de usuario con sus criterios de aceptación
- `docs/sdd/` — spec, plan y tareas por módulo
- `docs/diagrams/puml/` — DER, vista arquitectónica y vista de despliegue en PlantUML (extensión PlantUML de VS Code o <https://plantuml.com/>)
- `docs/diagrams/enterprise_architect/` — el modelo de Enterprise Architect y sus exportaciones
- `docs/design/` — menús, criterios responsive y prompts de diseño
- `back/DESPLIEGUE.md` — plan de publicación
- `back/CLAUDE.md` y `back/.claude/rules/` — arquitectura, convenciones y reglas del backend
- `AGENTS.md` — estándares de código y seguridad del proyecto
