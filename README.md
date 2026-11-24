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

## Probar la presentación

El sistema entero en Docker (base, API y front servido como en Netlify) con un centro de entrenamiento cargado: unos 50 alumnos con meses de cuotas, pagos, clases y asistencias. Se entra sin Google, eligiendo una cuenta de prueba. Solo hace falta **Docker Desktop abierto**; Node y pnpm no son necesarios para esto.

1. Clonar el repositorio (o actualizarlo con `git pull`) y, desde la raíz, crear la configuración de la API si todavía no existe. La de ejemplo ya trae el login sin Google (`LOGIN_DESARROLLO=true`) y `NODE_ENV="development"`:

   ```bash
   cp back/.env.example back/.env
   ```

2. Levantar todo. La primera vez construye las imágenes y tarda unos minutos:

   ```bash
   docker compose --profile completo up -d --build
   ```

3. Esperar la carga de los datos. El contenedor `mifr-datos-presentacion` corre una vez y termina; cuando muestra `Presentación cargada:` está listo:

   ```bash
   docker logs -f mifr-datos-presentacion
   ```

4. Abrir <http://localhost:8080>, tocar **Ir a MiFR** (o ir directo a <http://localhost:8080/login>) y después **Continuar con Google**: en lugar de Google se abre un selector con las cuentas de prueba. **Usar otra cuenta** permite escribir el email de cualquier usuario de la base. Qué conviene mirar con cada cuenta está en [Datos de la presentación](#datos-de-la-presentación).

Para empezar de cero, con las fechas corridas al día de hoy (los datos son relativos al día en que se cargan), o si la carga avisa que la base ya tiene otros datos:

```bash
docker compose --profile completo down -v    # borra la base local de Docker
docker compose --profile completo up -d --build
```

> `down -v` borra el volumen de la base: se pierde todo lo que se haya cargado a mano en ese Docker.

Para comprobar que front, API y base se hablan bien (necesita Node y pnpm): `pnpm install` y `pnpm probar:compose`.

Ojo con el día: las clases del día solo existen de lunes a viernes, así que un sábado o domingo la profesora no ve clases para tomar asistencia. Todo lo demás (cuotas, pagos, reportes, ranking, honorarios) se ve igual cualquier día.

Para apagarlo sin perder los datos: `docker compose --profile completo stop`.

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
pnpm --filter back db:seed:presentacion   # el centro de la presentación (o db:seed:demo, mínimo)
pnpm dev:front                            # front en http://localhost:5173
```

**Opción B: API con recarga automática.** Para trabajar en el back.

```bash
docker compose up -d db                   # solo la base
pnpm --filter back prisma:migrate         # aplica las migraciones y genera el cliente de Prisma
pnpm --filter back db:seed:presentacion   # el centro de la presentación (o db:seed:demo, mínimo)
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
| `VAPID_CLAVE_PUBLICA`, `VAPID_CLAVE_PRIVADA`, `VAPID_CONTACTO` | Opcionales | Avisos push al celular. Sin ellas no se manda ningún push; se generan con `pnpm --filter back exec web-push generate-vapid-keys` |

**`front/.env`**

| Variable                | Valor en desarrollo               | Para qué                                                                                         |
| :---------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------- |
| `VITE_LOGIN_DESARROLLO` | `true`                            | El login pide un email en lugar del botón de Google. Necesita `LOGIN_DESARROLLO=true` en el back |
| `VITE_USE_MOCKS`        | `false`                           | Con `true`, el front no llama a la API: responde MSW con los datos de `seed-demo.ts`             |
| `VITE_GOOGLE_CLIENT_ID` | Solo para probar Google           | Botón de inicio de sesión con Google                                                             |
| `API_URL`               | Opcional, `http://localhost:3000` | Adónde reenvía `/api` el servidor de Vite                                                        |

Con la Opción A, después de cambiar `back/.env` hay que recrear el contenedor: `docker compose up -d api`. Los cambios en `front/.env` necesitan reiniciar `pnpm dev:front`.

### Datos de la presentación

`db:seed:presentacion` carga un centro completo y consistente para mostrar el sistema: las actividades y la grilla de la página pública (48 clases por semana, de lunes a viernes), 4 profesoras, unos 80 alumnos con meses de historia (cuotas, pagos en efectivo y por transferencia, rendiciones, clases dictadas, suplencias y cancelaciones), rutinas y mediciones de progreso. Además, unos 150 alumnos históricos que llegaron en los dos años anteriores y en los primeros meses del actual: la mayoría ya se fue, así el reporte de inscripciones compara año contra año, y los que siguen llenan las franjas de la tarde, que en el mapa de ocupación aparecen moderadas, casi llenas y completas. Las liquidaciones de honorarios de los meses cerrados, las insignias del mes y los avisos de cuota no se escriben a mano: los generan los procesos de la API con la fecha que corresponde. Las fechas son relativas al día de la carga, así que siempre se ve "actual": hay cuotas al día, por vencer y vencidas, transferencias pendientes (una con más de 24 horas), efectivo a rendir, alumnos que dejaron de venir, pre-inscripciones con la reserva vigente, un cambio de plan programado y un aumento de precio para el mes que viene.

Parte de una base vacía. Si ya está cargada no hace nada, y si la base tiene otros datos se niega y explica cómo vaciarla. Con el perfil `completo` de Docker se carga sola. Solo corre contra una base local.

Las cuentas son las mismas que ofrece el selector del login de prueba (con mocks o con `LOGIN_DESARROLLO=true`):

| Email                           | Roles                    | Para ver                                     |
| :------------------------------ | :----------------------- | :------------------------------------------- |
| `marina.sosa@example.com`       | PROPIETARIA + PROFESORA  | Dashboard, cobros, honorarios, reportes      |
| `lucia.gomez@example.com`       | PROFESORA                | Clases del día y asistencia                  |
| `camila.perez@example.com`      | ALUMNO                   | Panel del alumno, rutina, ranking            |
| `valentina.herrera@example.com` | ALUMNO (2 planes)        | Dos planes vigentes a la vez                 |
| `paula.romero@example.com`      | ALUMNO + TUTOR (2 hijos) | Selector de menores, una pre-inscripción     |
| `carlos.fernandez@example.com`  | ALUMNO + TUTOR (1 hijo)  | Selector de menores                          |
| `mariana.lopez@example.com`     | TUTOR (2 menores)        | Seguimiento de menores sin plan propio       |

Los datos están en `back/src/shared/db/presentacion/` y el test `presentacion.integration.test.ts` los recorre por la API real.

### Datos de prueba mínimos

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
| `db:seed:presentacion` dice que la base ya tiene otros datos | La carga parte de una base vacía. Con Docker: `docker compose --profile completo down -v` (borra la base local) y volver a levantar |
| El front se reinicia: `host not found in upstream "api"`     | El contenedor `front` quedó de una corrida anterior, en otra red. `docker compose --profile completo up -d` lo vuelve a crear       |
| La cuenta elegida no entra                                   | La base se cargó con `db:seed:demo`, que no tiene todas las cuentas del selector. Cargar la presentación (`db:seed:presentacion`)   |

### Convenciones

**Fechas y zona horaria.** El servidor y la base corren en UTC, y el centro opera en Argentina (UTC-3). Los `TIMESTAMP` se guardan en UTC. Para el día de una columna `DATE` (altas, bajas y, más adelante, vencimientos), el back usa `fechaActualArgentina()` de `back/src/shared/utils/fecha-argentina.ts`; con `new Date()`, desde las 21:00 quedaría registrado el día siguiente. En el front, una columna `DATE` se formatea con `timeZone: "UTC"`, para que no aparezca un día antes.

Arquitectura, convenciones y reglas del backend: [`back/CLAUDE.md`](back/CLAUDE.md) y `back/.claude/rules/`. Estándares de código y seguridad del proyecto: [`AGENTS.md`](AGENTS.md).

---

## Producción

Todavía no está publicado. El paso a paso completo, con las verificaciones y los problemas frecuentes, está en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md); esto es el resumen.

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
| `PROXIES_DE_CONFIANZA` | Empezar con `2` y calibrarlo después del primer deploy (ver `docs/DESPLIEGUE.md`)|
| `FIRMA_PROXY_NETLIFY` | Secreto aleatorio de 32 caracteres o más, el mismo que la variable homónima de Netlify |
| `VAPID_CLAVE_PUBLICA`, `VAPID_CLAVE_PRIVADA` | Las claves VAPID generadas con `web-push generate-vapid-keys` (ver `docs/DESPLIEGUE.md`) |
| `VAPID_CONTACTO` | `mailto:` con el email del centro |

`LOGIN_DESARROLLO` no se define: con `true` la API no arranca en producción.

**Front (Netlify)**, cargadas en la configuración del sitio. Vite las incrusta al compilar, así que cambiarlas requiere un nuevo deploy.

| Variable                 | Valor                                                                 |
| :----------------------- | :-------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`  | El mismo client ID que la API                                         |
| `VITE_SITIO_URL`         | URL del sitio sin barra final, para Open Graph y la URL canónica      |
| `VITE_INSTAGRAM_USUARIO` | Usuario de Instagram del centro                                       |
| `VITE_WHATSAPP_NUMERO`   | WhatsApp del centro en formato internacional                          |
| `FIRMA_PROXY_NETLIFY`    | El mismo secreto que en Render, con alcance Runtime: firma el `/api/*` |
| `NODE_VERSION`, `PNPM_VERSION` | `22` y `10.33.2`                                                 |

`VITE_LOGIN_DESARROLLO` y `VITE_USE_MOCKS` no se definen. `API_URL` tampoco: en producción el reenvío de `/api` lo hace `netlify.toml`.

### Reglas para producción

- La primera propietaria se carga una sola vez con `db:seed`, apuntando a Neon desde una máquina local (ver `docs/DESPLIEGUE.md`, paso 8).
- Nunca correr contra Neon `db:seed:demo`, `db:seed:presentacion`, `token`, `prisma migrate dev`, `migrate reset` ni `db push`. Las migraciones las aplica solo el contenedor.
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
|         | `db:seed:presentacion`    | El centro completo de la presentación, con meses de historia                         |
|         | `db:seed:demo`            | Setup mínimo de desarrollo con datos de prueba                                       |
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
- `docs/DESPLIEGUE.md` — guía de despliegue: pasos, verificaciones y problemas frecuentes
- `back/CLAUDE.md` y `back/.claude/rules/` — arquitectura, convenciones y reglas del backend
- `AGENTS.md` — estándares de código y seguridad del proyecto
