# Despliegue de MiFR

Guía completa para publicar MiFR gratis: qué preparar, en qué orden y cómo comprobar que quedó bien. **Todavía no está publicado.** El código ya está listo para esto; lo que falta son las cuentas, los secretos y los pasos de esta guía.

Los límites de los planes gratuitos son los vigentes en noviembre de 2026. Conviene revisarlos en la página de cada servicio antes de publicar, porque cambian seguido.

## Resumen

| Paso | Qué | Dónde |
| :--: | :-- | :-- |
| 0 | Reunir cuentas, datos y herramientas | — |
| 1 | Probar el sistema completo en local | `docker compose --profile completo` |
| 2 | Dejar el código listo y llevarlo a `main` | Repositorio |
| 3 | Elegir las URL y generar el secreto compartido | Local |
| 4 | Client OAuth de Google | Google Cloud Console |
| 5 | Base de datos | Neon |
| 6 | API | Render |
| 7 | Front | Netlify |
| 8 | Primera propietaria | Local, contra Neon |
| 9 | Verificar el sitio publicado | Navegador y `curl` |
| 10 | Calibrar `PROXIES_DE_CONFIANZA` | Render |
| 11 | Mantener la API despierta | UptimeRobot |

---

## Arquitectura

Sigue la vista de despliegue (`docs/diagrams/puml/vista_despliegue.puml`): el navegador solo habla con el Servidor Web, y el Servidor Web reenvía los pedidos de la API al Servidor de Aplicaciones.

```text
Navegador ──HTTPS──► Netlify ──HTTPS /api/* (firmado)──► Render ──TCP 5432 + SSL──► Neon
(Cliente Web)        (Servidor Web:                       (Servidor de              (Servidor de BD)
                      front + reenvío)                     Aplicaciones: API)
```

Para el navegador todo es un mismo origen, el dominio de Netlify: baja el front y llama a `/api/v1/...` ahí mismo, y Netlify reenvía esos pedidos a Render, firmados con un secreto que la API verifica. Es lo mismo que hace Vite en desarrollo y nginx en el compose local, así que el front no cambia.

| Parte | Servicio | Plan gratuito | Por qué |
| :-- | :-- | :-- | :-- |
| Front | Netlify | Sitios estáticos | El front es una SPA de Vite: se publica el `dist/`. |
| API | Render, servicio web con Docker | 512 MB de RAM, 0,1 CPU, 750 horas por mes | Usa el mismo `back/Dockerfile` que el compose local y no pide tarjeta. |
| Base | Neon | Postgres de 0,5 a 1 GB, 100 horas de cómputo por mes | No vence. La base gratuita de Render se borra a los 30 días. |

Limitaciones que hay que conocer:

- **La API se duerme** después de 15 minutos sin pedidos, y el primero que llega después tarda entre 30 y 60 segundos. Netlify corta a los 26 segundos los pedidos que reenvía, así que ese primer pedido fallaría con un 504. Se evita con el monitor del paso 11.
- **Neon también se apaga** a los 5 minutos sin uso y tarda alrededor de un segundo en volver. La página pública no consulta la API, así que las visitas no lo despiertan.
- Render incluye 5 GB de tráfico por mes. Para el uso previsto sobra.

Alternativas descartadas: Koyeb no se duerme, pero desde febrero de 2026 pide tarjeta y retiene 29 dólares. Railway da un crédito que se termina en pocas semanas. Una VM gratuita de Oracle serviría con el `docker-compose.yml`, pero hay que administrar el servidor.

### Lo que ya está preparado en el código

- **`back/Dockerfile`**: imagen de producción con solo las dependencias de producción, corriendo como el usuario `node`. Al arrancar aplica las migraciones (`prisma migrate deploy`) y, si salen bien, levanta la API. Se hace así porque el comando previo al deploy de Render es solo para planes pagos; con una sola instancia no hay problema de concurrencia, y si una migración falla la API no arranca.
- **`render.yaml`**: el Blueprint de Render con la configuración del servicio.
- **`netlify.toml`**: build del front, reenvío firmado de `/api/*` a Render, fallback de la SPA y cabeceras de seguridad del sitio.
- **Validación al arrancar**: con `NODE_ENV=production` la API no arranca si falta una variable de seguridad o tiene un valor inválido, y el log del deploy dice cuál.
- **Swagger** no se publica con `NODE_ENV=production`, y el login de desarrollo no puede activarse.

---

## 0. Antes de empezar

**Cuentas:**

- [ ] Acceso al repositorio de GitHub con permiso para conectarlo a Render y Netlify.
- [ ] Cuenta en [Neon](https://neon.tech), [Render](https://render.com) y [Netlify](https://www.netlify.com), las tres gratuitas. Conviene crearlas con un email del proyecto y no uno personal, para no perder el acceso cuando cambie el equipo.
- [ ] Proyecto en [Google Cloud Console](https://console.cloud.google.com) para el client OAuth.
- [ ] Cuenta en [UptimeRobot](https://uptimerobot.com) o en otro monitor gratuito.

**Datos del centro:**

- [ ] Email de Google, nombre, apellido y fecha de nacimiento de la propietaria. Es la única cuenta que se carga a mano; el resto lo da de alta ella desde el sistema.
- [ ] Las actividades reales, con descripción, modalidad, días y horarios por semana, para la página pública (paso 2).
- [ ] Usuario de Instagram y número de WhatsApp del centro.

**Herramientas en la máquina desde la que se publica:** Git, Node 22, pnpm 10 (`corepack enable`), Docker y `openssl`.

## 1. Probar el sistema completo en local

Antes de publicar, levantar front, API y base juntos, como van a quedar publicados. El front lo sirve nginx con las mismas cabeceras de seguridad que Netlify (un test falla si se desalinean), y la API es la misma imagen que va a Render.

```bash
docker compose --profile completo up -d --build
pnpm probar:compose
```

`probar:compose` tiene que terminar con "Todo funciona: front, API y base.". Después, abrir <http://localhost:8080>, entrar con el login de desarrollo como `marina.sosa@example.com` y recorrer las pantallas con la consola del navegador abierta: no tiene que haber errores ni avisos de `Content Security Policy`. Necesita `NODE_ENV="development"` y `LOGIN_DESARROLLO=true` en `back/.env`.

También tienen que pasar los tests:

```bash
pnpm --filter back test
pnpm --filter back test:integration   # antes: docker compose --profile test up -d db-test
pnpm --filter front test
pnpm --filter front build
```

Al terminar: `docker compose --profile completo down`.

## 2. Dejar el código listo

1. **Actividades de la página pública.** Están fijas en `front/src/features/publico/utils/actividades-del-centro.ts` y **hoy son provisorias** (las del mock). Reemplazarlas por las reales. Un test controla que los días sean válidos y que no se repitan nombres.
2. **Integrar en `main`.** Se publica desde `main`, que es la rama de entregas estables (`back/.claude/rules/git.md`): `dev` → `main` con los tests en verde. Render y Netlify vuelven a publicar solos cada vez que cambia esa rama.

## 3. Elegir las URL y generar el secreto compartido

Hay datos que se usan en varios servicios a la vez, así que conviene decidirlos antes de crear nada:

| Dato | Ejemplo | Se usa en |
| :-- | :-- | :-- |
| Nombre del sitio de Netlify | `mifr` → `https://mifr.netlify.app` | Render (`CORS_ORIGENES`), Netlify (`VITE_SITIO_URL`), Google |
| Nombre del servicio de Render | `mifr-api` → `https://mifr-api.onrender.com` | `netlify.toml` (regla de `/api/*`) |
| `FIRMA_PROXY_NETLIFY` | salida de `openssl rand -hex 32` | Render y Netlify, **el mismo valor** |

Generar el secreto y guardarlo en un gestor de contraseñas, nunca en el repositorio ni en un chat:

```bash
openssl rand -hex 32
```

Generar también las claves VAPID de los avisos push (una pública y una privada que van juntas) y guardarlas igual. La pública la pide el navegador para suscribirse; la privada firma cada aviso y no sale de Render:

```bash
pnpm --filter back exec web-push generate-vapid-keys
```

No se vuelven a generar: con claves nuevas, todos los celulares suscriptos dejan de recibir avisos hasta que cada persona los vuelva a activar.

Si la URL de Render no va a ser `https://mifr-api.onrender.com`, corregir la regla de `/api/*` en `netlify.toml` en un commit a `main` antes del paso 7. Los subdominios de `onrender.com` son de quien los registra primero: comprobar en el dashboard de Render que el servicio con esa URL es el del proyecto, porque Netlify le reenvía los tokens de sesión y de Google. Lo más firme es un dominio propio (por ejemplo `api.<dominio>` con un CNAME a Render).

## 4. Client OAuth de Google

En Google Cloud Console → **APIs & Services → Credentials**:

1. Si no existe, crear un **OAuth client ID** de tipo **Web application**. Si se usa el de desarrollo, revisar que la pantalla de consentimiento esté publicada (en modo de prueba solo entran los usuarios de prueba cargados).
2. En **Authorized JavaScript origins**, agregar la URL de Netlify (`https://mifr.netlify.app`). Sin eso, el botón de Google falla en el sitio publicado con `origin_mismatch`. Para seguir probando en local, dejar también `http://localhost:5173` y `http://localhost:8080`.
3. Copiar el **Client ID**: va en Render (`GOOGLE_CLIENT_ID`) y en Netlify (`VITE_GOOGLE_CLIENT_ID`), con el mismo valor.

## 5. Base de datos en Neon

1. Crear un proyecto con **Postgres 16** en la región **AWS us-east-1**, la misma que la API en Render, para que cada consulta no cruce el continente.
2. Copiar la cadena de conexión **directa**: la que **no** tiene `-pooler` en el host. Las migraciones de Prisma no funcionan bien a través del pooler, y con el tráfico de este sistema no hace falta.
3. Verificar que termine en `?sslmode=require`: Neon exige SSL.

La base queda vacía: las tablas las crea la API en su primer arranque (paso 6) y la primera propietaria se carga en el paso 8.

## 6. API en Render

1. **New → Blueprint** y elegir el repositorio y la rama `main`. Render lee el `render.yaml` y crea el servicio `mifr-api`.
2. Render pide los valores marcados con `sync: false`:

   | Variable | Valor |
   | :-- | :-- |
   | `DATABASE_URL` | La cadena directa de Neon del paso 5 |
   | `GOOGLE_CLIENT_ID` | El Client ID del paso 4 |
   | `CORS_ORIGENES` | La URL de Netlify, por ejemplo `https://mifr.netlify.app` |
   | `PROXIES_DE_CONFIANZA` | `2` para empezar; se calibra en el paso 10 |
   | `FIRMA_PROXY_NETLIFY` | El secreto del paso 3 |
   | `VAPID_CLAVE_PUBLICA` y `VAPID_CLAVE_PRIVADA` | Las claves VAPID del paso 3 |
   | `VAPID_CONTACTO` | `mailto:` con el email del centro, por ejemplo `mailto:centro@example.com` |

   Las demás las fija `render.yaml`: `NODE_ENV=production`, `JWT_EXPIRES_IN=8h` y `JWT_SECRET`, que Render genera solo con un valor aleatorio. `LOGIN_DESARROLLO` no se define: con `true` la API no arranca en producción.
3. En el primer deploy el contenedor aplica todas las migraciones sobre la base vacía. El log tiene que mostrar las migraciones aplicadas y después `API escuchando en http://0.0.0.0:...`. Si falta una variable o tiene un valor inválido, la API no arranca y el log dice cuál.
4. Probar `https://mifr-api.onrender.com/health`: tiene que responder `{"status":"ok"}`.
5. Probar `https://mifr-api.onrender.com/api/v1/auth/me`: tiene que responder **403** `ORIGEN_NO_PERMITIDO`. Directo a Render no se entra: la API solo acepta lo que reenvía Netlify.

## 7. Front en Netlify

1. **Add new site → Import an existing project**, elegir el repositorio y la rama `main`, y como nombre del sitio el del paso 3. Netlify lee el `netlify.toml` de la raíz:

   | Opción | Valor |
   | :-- | :-- |
   | Base directory | `front` |
   | Build command | `pnpm build` (chequea los tipos y compila) |
   | Publish directory | `front/dist` |
   | `/api/*` | Se reenvía a Render, firmado (`signed = "FIRMA_PROXY_NETLIFY"`); el navegador no ve la URL de Render |
   | Cualquier otra ruta | Devuelve `index.html`, porque la SPA resuelve sus rutas en el navegador |

2. En **Site configuration → Environment variables**, cargar:

   | Variable | Valor | Alcance |
   | :-- | :-- | :-- |
   | `FIRMA_PROXY_NETLIFY` | El secreto del paso 3, igual al de Render | Tiene que incluir **Runtime** |
   | `VITE_GOOGLE_CLIENT_ID` | El Client ID del paso 4 | Builds |
   | `VITE_SITIO_URL` | La URL del sitio, sin barra final: `https://mifr.netlify.app` | Builds |
   | `VITE_INSTAGRAM_USUARIO` | Usuario de Instagram del centro, con o sin `@` | Builds |
   | `VITE_WHATSAPP_NUMERO` | WhatsApp en formato internacional: `+54 9 388 5744444` | Builds |
   | `NODE_VERSION` | `22` | Builds |
   | `PNPM_VERSION` | `10.33.2` | Builds |

   No se definen `VITE_LOGIN_DESARROLLO`, `VITE_USE_MOCKS` ni `API_URL`: en producción el reenvío de `/api` lo hace `netlify.toml`. Vite incrusta las `VITE_*` al compilar, así que cambiar una requiere un nuevo deploy (**Deploys → Trigger deploy**).
3. Lanzar el deploy y revisar el log del build: tiene que instalar las dependencias con pnpm y terminar en `✓ built`. Es un monorepo con pnpm workspaces y `base = "front"`: si el build no encuentra las dependencias, revisar en la documentación de Netlify cómo detecta los workspaces de pnpm.

## 8. Primera propietaria

Con la base vacía nadie puede iniciar sesión, porque no hay auto-registro. Se carga una sola vez, desde una máquina local, apuntando a Neon:

```bash
DATABASE_URL="<cadena directa de Neon>" pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <AAAA-MM-DD>
```

El seed carga los roles, los permisos, las insignias y los parámetros del sistema, y deja como propietaria a esa persona. El email tiene que ser exactamente el de su cuenta de Google.

**Nunca** correr contra Neon `db:seed:demo` (se niega: solo carga en una base local), `pnpm token`, `prisma migrate dev`, `migrate reset` ni `db push`.

Volver a correr `db:seed` no pisa la matriz de permisos: la matriz inicial (`MATRIZ_INICIAL` en `rol.catalogo.ts`) se aplica solo a los permisos nuevos, para respetar lo que la propietaria cambió. Por eso, si un cambio le da a un rol un permiso que ya existía, a una base con datos reales le llega con una migración de datos que agregue las filas que faltan en `rol_permisos` (ver `back/.claude/rules/seguridad.md`).

## 9. Verificar el sitio publicado

Con `SITIO=https://mifr.netlify.app` y `API=https://mifr-api.onrender.com`:

| Comprobación | Cómo | Resultado esperado |
| :-- | :-- | :-- |
| La API está viva | `curl $API/health` | `{"status":"ok"}` |
| Directo a Render no se entra | `curl -i $API/api/v1/auth/me` | 403 `ORIGEN_NO_PERMITIDO` |
| Netlify llega a la API, con la firma | `curl -i $SITIO/api/v1/auth/me` | 401 `UNAUTHORIZED` (si da 403, la firma no coincide) |
| Swagger no está publicado | `curl -i $SITIO/api/v1/docs` | 404 |
| Cabeceras de seguridad | `curl -I $SITIO/` | `content-security-policy`, `strict-transport-security`, `x-frame-options: DENY` |
| Página pública | Abrir `$SITIO` | Carga con las actividades reales, el mapa y los botones de contacto, sin pedidos a `/api` |
| Login con Google | Entrar con la cuenta de la propietaria | Llega al dashboard; al recargar sigue con la sesión |
| Sin errores en el navegador | Consola abierta en la página pública, el login y varias pantallas | Sin errores ni avisos de `Content Security Policy` |
| Vista previa del enlace | Pegar `$SITIO` en un chat de WhatsApp | Muestra la imagen y el título (Open Graph, sale de `VITE_SITIO_URL`) |
| La app se instala | En Chrome de Android, menú → **Instalar app**; en iPhone, Safari → Compartir → **Agregar a inicio** | Queda el ícono de MiFR y abre a pantalla completa |
| Avisos en el celular | Con un alumno de prueba: Perfil → **Activar avisos**, aceptar el permiso, y generar un aviso de cuota | Llega la notificación con el texto completo; al tocarla abre su inicio. En iPhone, solo con la app agregada a inicio |

## 10. Calibrar PROXIES_DE_CONFIANZA

La API limita los pedidos por IP (`back/src/shared/middlewares/limite-pedidos.ts`). Detrás de Netlify y de Render, la IP que ve Express es la del último proxy, y la del visitante llega en `X-Forwarded-For`. `PROXIES_DE_CONFIANZA` le dice a Express cuántos de esos saltos son de confianza:

- **Muy bajo:** todos los visitantes aparecen con la IP de un proxy y comparten un mismo tope. Una persona que abusa deja sin servicio a las demás.
- **Muy alto:** Express toma una IP que escribió el propio visitante en `X-Forwarded-For`, y cambiándola en cada pedido esquiva el límite.

Cada línea del log de la API termina con la IP que usó Express. Para calibrar:

1. Averiguar la IP pública propia, por ejemplo en <https://ifconfig.me>.
2. Correr `curl $SITIO/api/v1/auth/me` y buscar en el log de Render la línea de `GET /api/v1/auth/me`.
3. Si la IP del final no es la propia, cambiar `PROXIES_DE_CONFIANZA` en Render (**Environment**, guardar y esperar el redeploy) y repetir: con un valor bajo aparece la IP de un proxy; con uno alto, la que se mande en `X-Forwarded-For`.
4. Con el valor correcto, `curl -H "X-Forwarded-For: 1.2.3.4" $SITIO/api/v1/auth/me` tiene que seguir mostrando la IP propia en el log, no `1.2.3.4`.

Llamar directo a la URL de Render, con un proxy menos en el camino, no sirve para esquivar el límite: la API rechaza con 403 cualquier pedido a `/api` que no traiga la firma de Netlify, antes de contarlo.

## 11. Mantener la API despierta

En UptimeRobot, crear un monitor HTTP a `https://mifr-api.onrender.com/health` cada 10 minutos (Render la duerme a los 15).

- **Horas:** un servicio prendido todo el mes usa como mucho 744 horas, y el plan gratuito de Render da 750.
- **Base:** `/health` no consulta la base, así que Neon se apaga igual cuando nadie usa el sistema y no gasta sus horas de cómputo.
- **Directo a Render**, no a través de Netlify, para no gastar tráfico del sitio. `/health` no exige la firma ni tiene límite de pedidos.
- De paso, el monitor avisa por email si la API se cae.

---

## Después de publicar

### Publicar cambios

Cada push a `main` vuelve a publicar los dos servicios: Render reconstruye la imagen y aplica las migraciones nuevas al arrancar, y Netlify vuelve a compilar el front. Antes de llevar `dev` a `main`, repetir el paso 1.

**Volver atrás:** en Render, **Events → Rollback** a un deploy anterior; en Netlify, **Deploys**, elegir uno anterior y **Publish deploy**. Ojo: volver atrás la API no deshace una migración ya aplicada.

### Migraciones en producción

- Solo `prisma migrate deploy`, que ya corre el contenedor. Nunca `migrate dev`, `migrate reset` ni `db push` contra Neon: los dos últimos pueden borrar datos.
- No se cambia nada a mano en la base. Si la base se aparta de las migraciones, las siguientes fallan.
- Mientras se migra puede seguir atendiendo la versión anterior de la API. Por eso un cambio que rompe compatibilidad (borrar o renombrar una columna) se hace en dos deploys: primero se agrega lo nuevo y después se saca lo viejo.
- Si una migración falla a mitad de camino, Prisma bloquea las siguientes hasta corregirla y marcarla con `prisma migrate resolve`.

### Respaldos

Neon guarda un historial corto que permite restaurar la base a un momento anterior (el plazo del plan gratuito es limitado). Antes de una migración riesgosa, y periódicamente, hacer además un respaldo propio:

```bash
pg_dump "<cadena directa de Neon>" --format=custom --file=mifr-$(date +%F).dump
```

Guardarlo fuera del repositorio: tiene datos personales de alumnos.

### La app instalada (PWA)

- **Instalable, sin modo offline.** El service worker (`front/public/sw.js`) solo recibe los avisos push y abre el sistema al tocarlos: no guarda pantallas ni datos, así que la app instalada necesita conexión, como la web.
- **La sesión vive mientras la app está abierta.** El token se guarda en `sessionStorage`: al cerrar la app hay que volver a entrar con Google. Es a propósito (`front/src/features/auth/api/session-token.ts`); la cookie `httpOnly` lo resolvería.
- **Los avisos por dispositivo.** Cada persona los activa desde su perfil en cada celular, y al cerrar sesión ese celular deja de recibirlos.
- **Íconos.** Salen de `logo-fr.webp` (`front/public/iconos/`); el maskable tiene el logo al 80 % sobre fondo rosa para que Android lo pueda recortar.

### Cambiar las actividades de la página pública

No se cargan desde el sistema: se editan en `front/src/features/publico/utils/actividades-del-centro.ts` y se publica el front. Es a propósito, para que las visitas a la página pública no despierten la API ni la base.

### Rotar secretos

- **`FIRMA_PROXY_NETLIFY`:** generar uno nuevo, cargarlo en Netlify y volver a publicar el front, y enseguida cargarlo en Render. Entre un paso y otro `/api` responde 403, así que conviene hacerlo en un horario sin uso.
- **`JWT_SECRET`:** en Render, **Environment → Generate** un valor nuevo. Todas las sesiones abiertas se cierran y cada persona vuelve a entrar con Google.
- **Credenciales de Neon:** rotar la contraseña en Neon y actualizar `DATABASE_URL` en Render.

### Problemas frecuentes

| Síntoma | Causa y solución |
| :-- | :-- |
| Todo `/api` responde 403 `ORIGEN_NO_PERMITIDO` desde el sitio | `FIRMA_PROXY_NETLIFY` distinta en Netlify y en Render, o en Netlify sin el alcance Runtime. Corregir y volver a publicar el front |
| La API no arranca en Render | El log del deploy dice qué variable falta o es inválida (por ejemplo `Falta PROXIES_DE_CONFIANZA` o `JWT_SECRET tiene que tener al menos 32 caracteres`) |
| 504 en el primer pedido después de un rato | La API estaba dormida y tardó más de 26 segundos en despertar. Revisar el monitor del paso 11 |
| El botón de Google da `origin_mismatch` | Falta la URL del sitio en los orígenes autorizados del client OAuth (paso 4) |
| La propietaria entra con Google pero recibe "No estás registrado" | El email cargado en el seed no es el de su cuenta de Google. Revisarlo en la tabla `usuarios` |
| Muchas personas reciben 429 a la vez | `PROXIES_DE_CONFIANZA` demasiado bajo: todos cuentan como la IP del proxy. Calibrar (paso 10) |
| Algo no carga y la consola dice `violates the following Content Security Policy directive` | Se sumó un servicio externo que la CSP no permite. Agregar su origen en `netlify.toml` y en `front/docker/nginx.conf` (un test exige que sean iguales) |
| La vista previa del enlace sale sin imagen | Falta `VITE_SITIO_URL` en Netlify o se cargó después del último build. Cargarla y volver a publicar |
| La API no arranca con `Faltan VAPID_CLAVE_PUBLICA…` | Faltan las claves VAPID en Render (paso 6). Se generan una sola vez (paso 3) |
| Un celular activó los avisos pero no le llegan | En iPhone, MiFR tiene que estar agregado a la pantalla de inicio y el iOS ser 16.4 o posterior. En Android, revisar que el navegador tenga permitidas las notificaciones del sitio. El aviso igual está en la campana |

---

## Seguridad

- **Solo se entra por Netlify.** La URL de Render es pública, pero `/api` exige la firma `x-nf-sign` que agrega Netlify al reenviar (`FIRMA_PROXY_NETLIFY`); sin ella responde 403. `/health` queda abierta para el chequeo de Render y el monitor.
- **La protección está en la API, no en el camino.** La firma solo asegura por dónde llegó el pedido, no quién lo manda. Lo que protege los datos es que la API valida todo por su cuenta: verifica el JWT en cada pedido, relee en la base el estado y los roles del usuario, controla los permisos por ruta, valida cada entrada con Zod y manda cabeceras de seguridad con `helmet`.
- **Límite de pedidos.** La API corta con 429 a la IP que pasa de 600 pedidos por minuto o de 50 inicios de sesión cada 15 minutos. Los topes viven en memoria del proceso, así que valen con una sola instancia, que es lo que da el plan gratuito. `/health` no tiene tope. La IP sale de `PROXIES_DE_CONFIANZA` (paso 10).
- **CORS no es control de acceso.** Solo decide qué sitios pueden leer las respuestas desde un navegador; con `curl` se puede llamar a la API igual.
- **Sin CSRF hoy.** El token viaja en el header `Authorization`, que el navegador no manda solo. Si más adelante el token pasa a una cookie `httpOnly` (lo que pide AGENTS.md), tener todo en el mismo origen permite usar `SameSite=Lax` sin cookies entre dominios.
- **Dónde guarda el token el front.** Vive en memoria y en `sessionStorage`, así que un XSS en el front podría leerlo. Lo mitiga la Content-Security-Policy de `netlify.toml`: el sitio solo ejecuta sus propios scripts y el de Google Identity Services, y solo se conecta con su mismo origen y con Google, así que un código inyectado no corre ni puede mandar el token afuera. Lo definitivo es la cookie `httpOnly`.
- **Cabeceras del sitio.** `netlify.toml` manda además HSTS, `Permissions-Policy` (sin cámara, micrófono, ubicación ni pagos) y `Cross-Origin-Opener-Policy: same-origin-allow-popups`, que necesita el popup de Google.
- **La página pública no consulta la API.** Las actividades son datos fijos del front y, sin sesión guardada, el front tampoco pide `/auth/me`: una visita, o un bot, no llega ni a Render ni a Neon.

## Checklist final

- [ ] Paso 1: `pnpm probar:compose` en verde y todos los tests pasan.
- [ ] Actividades reales cargadas en `actividades-del-centro.ts`, y `dev` integrada en `main`.
- [ ] `FIRMA_PROXY_NETLIFY` y las claves VAPID generadas y guardadas en un gestor de contraseñas.
- [ ] Client OAuth con la URL de Netlify en los orígenes autorizados.
- [ ] Proyecto de Neon en us-east-1, con la cadena directa y `sslmode=require`.
- [ ] Blueprint de Render con `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `CORS_ORIGENES`, `PROXIES_DE_CONFIANZA` y `FIRMA_PROXY_NETLIFY`.
- [ ] URL de Render verificada en la regla de `/api/*` de `netlify.toml`, y comprobado en el dashboard que ese servicio es del proyecto.
- [ ] Sitio de Netlify con sus variables, y `FIRMA_PROXY_NETLIFY` con alcance Runtime y el mismo valor que en Render.
- [ ] Primera propietaria cargada con `db:seed`.
- [ ] Paso 9 completo: `/health` responde, directo a Render da 403, por Netlify da 401, la propietaria entra con Google y la consola no muestra errores.
- [ ] `PROXIES_DE_CONFIANZA` calibrada: el log de Render muestra la IP propia en un pedido hecho a través de Netlify.
- [ ] Monitor de `/health` cada 10 minutos.
