# Despliegue

Plan para publicar MiFR gratis. **Todavía no está publicado**: este documento deja decidido cómo se va a hacer, y el código ya está preparado para eso. Mientras tanto se trabaja localmente con la misma imagen de Docker que se va a publicar.

Los límites de los planes gratuitos son los vigentes en octubre de 2026. Conviene revisarlos en la página de cada servicio antes de publicar, porque cambian seguido.

## Arquitectura

Sigue la vista de despliegue (`docs/diagrams/puml/vista_despliegue.puml`): el navegador solo habla con el Servidor Web, y el Servidor Web reenvía los pedidos de la API al Servidor de Aplicaciones.

```text
Navegador ──HTTPS──► Netlify ──HTTPS /api/*──► Render ──TCP 5432 + SSL──► Neon
(Cliente Web)        (Servidor Web:            (Servidor de              (Servidor de BD)
                      front + reenvío)          Aplicaciones: API)
```

Para el navegador todo es un mismo origen, el dominio de Netlify: baja el front y llama a `/api/v1/...` ahí mismo, y Netlify reenvía esos pedidos a Render. Es lo mismo que hace Vite en desarrollo, así que el front no cambia.

| Parte | Servicio | Plan gratuito | Por qué |
| --- | --- | --- | --- |
| Front | Netlify | Sitios estáticos | El front es una SPA de Vite: se publica el `dist/` y listo. |
| API | Render, servicio web con Docker | 512 MB de RAM, 0,1 CPU, 750 horas por mes | Usa el mismo `back/Dockerfile` que se corre localmente y no pide tarjeta. |
| Base | Neon | Postgres de 0,5 a 1 GB, 100 horas de cómputo por mes | No vence. La base gratuita de Render se borra a los 30 días. |

Limitaciones que hay que conocer:

- **La API se duerme** después de 15 minutos sin pedidos, y el primero que llega después tarda entre 30 y 60 segundos. Netlify corta a los 26 segundos los pedidos que reenvía, así que ese primer pedido fallaría con un 504. Se evita manteniendo la API despierta: ver el paso 6.
- **Neon también se apaga** a los 5 minutos sin uso y tarda alrededor de un segundo en volver.
- Render incluye 5 GB de tráfico por mes en el plan gratuito. Para el uso previsto sobra.

Alternativas descartadas: Koyeb no se duerme, pero desde febrero de 2026 pide tarjeta y retiene 29 dólares. Railway da un crédito que se termina en pocas semanas. Una VM gratuita de Oracle serviría con el `docker-compose.yml` tal cual, pero hay que administrar el servidor.

## Lo que ya está preparado en el código

- **`back/Dockerfile`**: imagen de producción con solo las dependencias de producción, corriendo como el usuario `node`.
- **Migraciones al arrancar**: el contenedor corre `prisma migrate deploy` y, si sale bien, levanta la API. Se hace así porque el comando previo al deploy de Render es solo para planes pagos. Con una sola instancia no hay problema de concurrencia, y si una migración falla la API no arranca.
- **`render.yaml`** en la raíz: el Blueprint de Render con la configuración del servicio. Render lo lee al crear el servicio.
- **`netlify.toml`** en la raíz: build del front, reenvío de `/api/*` a Render, fallback de la SPA y cabeceras de seguridad del sitio.
- **CORS por variable**: `CORS_ORIGENES` lista los orígenes que pueden llamar a la API. Con `NODE_ENV=production` es obligatoria: si falta, la API no arranca. Con el reenvío de Netlify el front no la necesita (todo es mismo origen), pero queda como red de seguridad con el dominio de Netlify.
- **Swagger**: no se publica con `NODE_ENV=production`.

## Trabajar localmente con Docker

`docker compose up -d --build` levanta la base y la API con la misma imagen que se va a publicar, y la API aplica las migraciones al arrancar, igual que en Render. Los detalles están en el `README.md` de la raíz.

El modo sale de `NODE_ENV` en `back/.env`: con `development` se publica Swagger, y sin la variable el contenedor corre en `production`, exactamente como en Render. Los datos de prueba de `db:seed:demo` son solo para la base local: en Neon se corre únicamente `db:seed`.

## Pasos para publicar

### 1. Base de datos en Neon

1. Crear un proyecto en Neon con **Postgres 16** en la región **AWS us-east-1**, la misma que la API en Render.
2. Copiar la cadena de conexión **directa**: la que **no** tiene `-pooler` en el host. Las migraciones de Prisma no funcionan bien a través del pooler, y con el tráfico de este sistema no hace falta.
3. Verificar que termine en `?sslmode=require`: Neon exige SSL.

### 2. API en Render

1. En Render, **New → Blueprint** y elegir el repositorio. Render lee el `render.yaml`. Si se publica desde una rama que no es la principal, elegirla ahí.
2. Render pide los valores marcados con `sync: false`:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | La cadena directa de Neon del paso 1 |
   | `GOOGLE_CLIENT_ID` | El mismo client ID que usa el front |
   | `CORS_ORIGENES` | La URL de Netlify, por ejemplo `https://mifr.netlify.app` |

   `JWT_SECRET` lo genera Render solo, con un valor aleatorio. Ningún secreto se escribe en el repositorio. Con `NODE_ENV=production` la API no arranca si falta `GOOGLE_CLIENT_ID` o `CORS_ORIGENES`, o si `JWT_SECRET` tiene menos de 32 caracteres: el log del deploy dice cuál.
3. En el primer deploy, el contenedor aplica todas las migraciones sobre la base vacía.
4. Probar `https://<servicio>.onrender.com/health`: tiene que responder `{"status":"ok"}`.
5. Anotar la URL que asignó Render. Si no es `https://mifr-api.onrender.com`, corregirla en la regla de `/api/*` de `netlify.toml`. Los subdominios de `onrender.com` son de quien los registra primero: comprobar en el dashboard de Render que el servicio con esa URL es el del proyecto, porque Netlify le reenvía los tokens de sesión y de Google. Si después se renombra o se borra el servicio, `netlify.toml` se corrige en el mismo cambio. Lo más firme es un dominio propio (por ejemplo `api.<dominio>` con un CNAME a Render).

### 3. Primera propietaria

Con la base vacía nadie puede iniciar sesión, porque no hay auto-registro. Se carga una sola vez, desde una máquina local, apuntando a Neon:

```bash
DATABASE_URL="<cadena directa de Neon>" pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <AAAA-MM-DD>
```

El seed carga los roles y los permisos y deja como propietaria a esa persona.

Volver a correr el seed no pisa la matriz de permisos: la matriz inicial (`MATRIZ_INICIAL` en `rol.catalogo.ts`) se aplica solo a los permisos que se crean en esa corrida, para respetar lo que la propietaria cambió. Por eso, si un cambio le da a un rol un permiso que ya existía, ese permiso no le llega a una base ya cargada. Mientras el proyecto está en desarrollo y ninguna base tiene datos reales, eso se resuelve regenerando la base:

```bash
pnpm --filter back exec prisma migrate reset --force --skip-seed
pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <AAAA-MM-DD>
pnpm --filter back db:seed:demo   # solo en una base local
```

Cuando Neon tenga datos reales ya no se puede borrar: desde ahí, un cambio así va con una migración de datos que agregue las filas que faltan en `rol_permisos` (ver `back/.claude/rules/seguridad.md`).

### 4. Google

En Google Cloud Console, en el client OAuth que usa el sistema, agregar la URL de Netlify en **Orígenes autorizados de JavaScript**. Sin eso, el botón de Google falla en el sitio publicado.

### 5. Front en Netlify

En Netlify, **Add new site → Import an existing project** y elegir el repositorio. Netlify lee el `netlify.toml` de la raíz:

| Opción | Valor |
| --- | --- |
| Base directory | `front` |
| Build command | `pnpm build` |
| Publish directory | `front/dist` |
| `/api/*` | Se reenvía a Render (`status = 200`: el navegador no ve la URL de Render) |
| Cualquier otra ruta | Devuelve `index.html`, porque la SPA resuelve sus rutas en el navegador |

El front no necesita cambios: ya llama a `/api/v1/...` con rutas relativas. El nombre del sitio en Netlify define la URL (por ejemplo `https://mifr.netlify.app`), que va en `CORS_ORIGENES` de Render y en Google Cloud Console.

### 6. Mantener la API despierta

Con un monitor gratuito, por ejemplo UptimeRobot, crear un chequeo HTTP a `https://<servicio>.onrender.com/health` cada 10 minutos (Render la duerme a los 15).

- **Horas:** un servicio prendido todo el mes usa como mucho 744 horas, y el plan gratuito de Render da 750.
- **Base:** `/health` no consulta la base, así que Neon igual se apaga cuando nadie usa el sistema y no gasta sus horas de cómputo.
- **Directo a Render**, no a través de Netlify, para no gastar tráfico del sitio.
- De paso, el monitor avisa por email si la API se cae.

## Seguridad

- **La protección está en la API, no en el camino.** Aunque el front pase por Netlify, la URL de Render sigue siendo pública. Lo que protege es que la API valida todo por su cuenta: verifica el JWT en cada pedido, relee en la base el estado y los roles del usuario, controla los permisos por ruta, valida cada entrada con Zod y manda cabeceras de seguridad con `helmet`.
- **CORS no es control de acceso.** Solo decide qué sitios pueden leer las respuestas desde un navegador; con `curl` se puede llamar a la API igual.
- **Sin CSRF hoy.** El token viaja en el header `Authorization`, que el navegador no manda solo. Si más adelante el token pasa a una cookie `httpOnly` (lo que pide AGENTS.md), tener todo en el mismo origen permite usar `SameSite=Lax` sin cookies entre dominios.
- **Dónde guarda el token el front.** Si lo guarda en `localStorage`, un XSS en el front podría robarlo. Se mitiga con una Content-Security-Policy en `netlify.toml`, que permita Google Identity Services (`accounts.google.com`), y más adelante con la cookie `httpOnly`. Le corresponde al equipo de front; `netlify.toml` ya trae las cabeceras básicas.
- **Límite de pedidos.** Si se agrega limitación por IP, hay que configurar `trust proxy` en Express: la IP que ve la API es la del proxy de Render o de Netlify, y la del cliente llega en `X-Forwarded-For`.

## Migraciones en producción

- Solo `prisma migrate deploy`, que ya corre el contenedor. Nunca `migrate dev`, `migrate reset` ni `db push` contra Neon: los dos últimos pueden borrar datos.
- No se cambia nada a mano en la base. Si la base se aparta de las migraciones, las siguientes fallan.
- Mientras se migra puede seguir atendiendo la versión anterior de la API. Por eso un cambio que rompe compatibilidad (borrar o renombrar una columna) se hace en dos deploys: primero se agrega lo nuevo y después se saca lo viejo.
- Si una migración falla a mitad de camino, Prisma bloquea las siguientes hasta corregirla y marcarla con `prisma migrate resolve`. Antes de una migración riesgosa, hacer un respaldo con `pg_dump` usando la cadena de Neon.

## Checklist antes de publicar

- [ ] Proyecto de Neon creado en us-east-1, con la cadena directa y `sslmode=require`.
- [ ] Blueprint de Render creado con `DATABASE_URL`, `GOOGLE_CLIENT_ID` y `CORS_ORIGENES`.
- [ ] `/health` responde en Render.
- [ ] Primera propietaria cargada con el seed.
- [ ] URL de Netlify agregada en Google Cloud Console.
- [ ] URL de Render verificada en la regla de `/api/*` de `netlify.toml`, y comprobado en el dashboard que ese servicio es del proyecto.
- [ ] Sitio de Netlify creado; `https://<sitio>/api/v1/auth/me` sin token responde 401 (llega a la API).
- [ ] Monitor de `/health` cada 10 minutos.
