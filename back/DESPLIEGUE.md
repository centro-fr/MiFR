# Despliegue

Plan para publicar MiFR gratis. **Todavía no está publicado**: este documento deja decidido cómo se va a hacer, y el código ya está preparado para eso. Mientras tanto se trabaja localmente con la misma imagen de Docker que se va a publicar.

Los límites de los planes gratuitos son los vigentes en octubre de 2026. Conviene revisarlos en la página de cada servicio antes de publicar, porque cambian seguido.

## Arquitectura

```text
Navegador ──► Netlify (front, sitio estático)
    │
    └──────► Render (API, contenedor Docker) ──► Neon (PostgreSQL)
```

| Parte | Servicio | Plan gratuito | Por qué |
| --- | --- | --- | --- |
| Front | Netlify | Sitios estáticos | El front es una SPA de Vite: se publica el `dist/` y listo. |
| API | Render, servicio web con Docker | 512 MB de RAM, 0,1 CPU, 750 horas por mes | Usa el mismo `back/Dockerfile` que se corre localmente y no pide tarjeta. |
| Base | Neon | Postgres de 0,5 a 1 GB, 100 horas de cómputo por mes | No vence. La base gratuita de Render se borra a los 30 días. |

Limitaciones que hay que conocer:

- **La API se duerme** después de 15 minutos sin pedidos, y el primero que llega después tarda entre 30 y 60 segundos. Antes de mostrarle el sistema a alguien, conviene abrirlo un minuto antes.
- **Neon también se apaga** a los 5 minutos sin uso y tarda alrededor de un segundo en volver.
- Render incluye 5 GB de tráfico por mes en el plan gratuito. Para el uso previsto sobra.

Alternativas descartadas: Koyeb no se duerme, pero desde febrero de 2026 pide tarjeta y retiene 29 dólares. Railway da un crédito que se termina en pocas semanas. Una VM gratuita de Oracle serviría con el `docker-compose.yml` tal cual, pero hay que administrar el servidor.

## Lo que ya está preparado en el código

- **`back/Dockerfile`**: imagen de producción con solo las dependencias de producción, corriendo como el usuario `node`.
- **Migraciones al arrancar**: el contenedor corre `prisma migrate deploy` y, si sale bien, levanta la API. Se hace así porque el comando previo al deploy de Render es solo para planes pagos. Con una sola instancia no hay problema de concurrencia, y si una migración falla la API no arranca.
- **`render.yaml`** en la raíz: el Blueprint de Render con la configuración del servicio. Render lo lee al crear el servicio.
- **CORS por variable**: `CORS_ORIGENES` lista los orígenes que pueden llamar a la API. Con `NODE_ENV=production` es obligatoria: si falta, la API no arranca.
- **Swagger**: no se publica con `NODE_ENV=production`.

## Trabajar localmente con Docker

`docker compose up -d --build` levanta la base y la API con la misma imagen que se va a publicar, y la API aplica las migraciones al arrancar, igual que en Render. Los detalles están en el `README.md` de la raíz.

Para probar la API como en producción pero con Swagger: `API_NODE_ENV=development docker compose up -d api`.

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

   `JWT_SECRET` lo genera Render solo, con un valor aleatorio. Ningún secreto se escribe en el repositorio.
3. En el primer deploy, el contenedor aplica todas las migraciones sobre la base vacía.
4. Probar `https://<servicio>.onrender.com/health`: tiene que responder `{"status":"ok"}`.

### 3. Primera propietaria

Con la base vacía nadie puede iniciar sesión, porque no hay auto-registro. Se carga una sola vez, desde una máquina local, apuntando a Neon:

```bash
DATABASE_URL="<cadena directa de Neon>" pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <AAAA-MM-DD>
```

El seed carga los roles y los permisos y deja como propietaria a esa persona.

### 4. Google

En Google Cloud Console, en el client OAuth que usa el sistema, agregar la URL de Netlify en **Orígenes autorizados de JavaScript**. Sin eso, el botón de Google falla en el sitio publicado.

### 5. Front en Netlify

Configuración del sitio:

| Opción | Valor |
| --- | --- |
| Base directory | `front` |
| Build command | `pnpm build` |
| Publish directory | `front/dist` |

Como es una SPA, Netlify tiene que devolver `index.html` para cualquier ruta. Se resuelve con un archivo `front/public/_redirects`:

```text
/*  /index.html  200
```

**Cómo llega el front a la API.** Hoy el front llama a rutas relativas (`/api/v1/...`) y en desarrollo Vite las redirige al backend. Publicado hay dos opciones:

- **Llamar directo a Render (recomendada).** El front toma la URL de la API de una variable de entorno de Vite, por ejemplo `VITE_API_URL=https://<servicio>.onrender.com`, y la API acepta ese origen con `CORS_ORIGENES`. El token viaja en el header `Authorization`, así que no hay problemas de cookies entre dominios.
- **Proxy de Netlify** (`/api/*  https://<servicio>.onrender.com/api/:splat  200` en `_redirects`). No hace falta CORS, pero Netlify corta los pedidos que pasan por el proxy a los 26 segundos, y el primer pedido después de que la API se durmió tarda más que eso: fallaría con un 504.

Este cambio en el front le corresponde al equipo de front.

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
- [ ] Front con `_redirects` para la SPA y la URL de la API configurada.
