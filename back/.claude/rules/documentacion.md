# Comentarios, documentación y buenas prácticas

## Comentarios

**No se comentan los cambios.** Nada de `// se agregó esto`, `// modificado por`, `// antes era así`, `// TODO: sacar después`, ni bloques de código viejo comentado. Todo eso es trabajo del historial de git, y en el código solo genera ruido que envejece mal.

**Sí se comenta el porqué**, cuando no es evidente: una restricción del negocio, una decisión que sorprendería a quien lea, el vínculo con un componente del diagrama. Los dos ejemplos buenos que ya están en el repositorio:

```ts
// PrismaClient es la realización del componente "Persistencia" de la vista arquitectónica
// (CapaAdministracionDatos): ya expone IMaterializar (create/update/delete) e IDesmaterializar
// (findUnique/findFirst/findMany) sobre BaseDeDatos (Postgres)...
```

```ts
// No hay auto-registro: solo puede loguearse quien ya fue dado de alta
// (pre-inscripción de quien administra el centro/profesora + primer pago confirmado).
if (!usuario) throw new UsuarioNoRegistradoError();
```

Los dos explican una decisión, no una línea de código.

**No se documenta lo que el nombre ya dice.** Si un identificador necesita un comentario para entenderse, el problema es el nombre: cambiarlo y borrar el comentario.

Los comentarios van en español, una o dos líneas. Las interfaces y los services llevan uno arriba que los vincula al componente del diagrama.

## Documentación del proyecto

Vive en `docs/`, no en el código: diagramas en `docs/diagrams/`, documentos de requisitos y planificación en `docs/`. Los cambios ahí se commitean con `docs(...)`.

Cuando el código se aparta de un diagrama, se actualiza el diagrama primero. Ver `arquitectura.md`.

## Buenas prácticas

- Validar toda entrada con Zod en la capa de rutas, con `validate({ body, params, query })`. El service confía en lo que le llega. Las reglas de cada tipo de campo (números, `-0`, largos, textos, emails, fechas) están en `validaciones.md`.
- Los errores que causa el pedido o una regla de negocio se lanzan como `AppError` (`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`): cada uno trae su código HTTP y su mensaje le llega al cliente.
- Lo que no es culpa del pedido (un dato mal configurado en la base, un estado que el sistema no debería poder tener) se lanza como `Error` común, con un mensaje que sirva para diagnosticarlo. El `errorHandler` responde 500 genérico, sin mostrar el detalle, y lo registra en el log con la ruta y quién pidió. Nunca un `AppError` con 500: su mensaje le llega al cliente y no queda en el log. Ejemplo: un parámetro del sistema guardado con un valor que no respeta su tipo (`ParametrosSistemaService`).
- Pasar los handlers asincrónicos directo a la ruta: Express 5 manda sus rechazos al manejador de errores, así que no hace falta envolverlos.
- Proteger las rutas con los guardias del `ControlDeAcceso` que recibe el router (`acceso.sesion`, `acceso.permiso("CODIGO")`, `acceso.propioOPermiso("CODIGO")`), en la definición de la ruta y no adentro del controller. Los códigos salen de `rol/rol.catalogo.ts`; `acceso.rol(...)` queda para lo que la spec ata a un rol y no a un permiso.
- Si un middleware propio envuelve un guardia, lo espera (`await guardia(req, res, next)`). Los guardias son async: sin el `await` el rechazo se pierde y el pedido queda colgado.
- Instanciar solo en el composition root (`index.ts` y `composicion.ts`), también las clases de librerías: quien las usa las recibe por constructor.
- Usar los tipos de dominio de `<x>.types.ts`, no los de `@prisma/client` directamente.
- Mantener los controllers finos: leer de `req`, llamar al service, responder. Nada más.
- Para el "hoy" de una columna `DATE` (altas, bajas, vencimientos) usar `fechaActualArgentina()` de `shared/utils/fecha-argentina.ts`, nunca `new Date()`: el servidor y la base corren en UTC, y Prisma guarda el día UTC, que desde las 21:00 de Argentina ya es el siguiente. Los `TIMESTAMP` siguen en UTC.
- Documentar cada ruta nueva en el `<x>.openapi.ts` de su componente, reusando los esquemas de `<x>.schemas.ts`, con los permisos que exige y los errores que puede devolver.

## Malas prácticas

- `any`. Si el tipo no se sabe, `unknown` y estrechar.
- Usar el cliente de Prisma fuera de un repositorio (la única excepción es `UnidadDeTrabajoPrisma`, ver `persistencia.md`).
- Hacer `new` de una clase concreta fuera del composition root (`index.ts` y `composicion.ts`).
- Poner lógica de negocio en un controller, en una ruta o en un middleware.
- Devolver la entidad cruda cuando tiene campos que el cliente no debería ver.
- `console.log` de depuración. Para trazas hay `shared/middlewares/logger.ts`.
- Secretos escritos en el código. Van en variables de entorno.
- Agregar una dependencia sin una necesidad clara.

## Formato y linter

El formato lo maneja Prettier, configurado en `.prettierrc`: ancho de 110, comillas dobles, punto y coma, coma final. Se aplica con `pnpm format` y se verifica con `pnpm format:check`. Los archivos Markdown están excluidos en `.prettierignore` para no reformatear la documentación.

Antes de integrar una rama, `pnpm format:check` tiene que pasar. Si hay diferencias de formato, van en un commit propio con `style(...)`, separado de los cambios de comportamiento.

**Pendiente: no hay linter.** El proyecto usa TypeScript 7 y typescript-eslint todavía no lo soporta (el seguimiento está en el issue 10940 de typescript-eslint); TypeScript 6 solo existe como beta. Mientras tanto, la red de seguridad son `tsc` con `strict` y los tests, y las reglas de este archivo se cumplen a mano y en la revisión.

Cuando salga el soporte, se configura ESLint 9 con `typescript-eslint` y `eslint-config-prettier`, con estas reglas como error: `no-explicit-any`, `no-floating-promises`, `consistent-type-imports`, `no-unused-vars` con prefijo `_` permitido, y `no-console` salvo en `index.ts`, `logger.ts` y `prisma/seed.ts`. La alternativa, si la espera se estira, es Biome, que no depende de la API de TypeScript.

## Variables de entorno

Se leen con `dotenv` y se documentan en `.env.example` con valores de ejemplo.

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `GOOGLE_CLIENT_ID` | Validación del token de Google. Obligatoria con `NODE_ENV=production`; sin ella el login con Google se rechaza |
| `JWT_SECRET` | Firma del token propio. Obligatoria; en producción, de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | Vigencia del token, por defecto `8h` |
| `PORT` | Puerto de la API, por defecto `3000` |
| `NODE_ENV` | Con `production` no se publica la documentación Swagger y `CORS_ORIGENES` pasa a ser obligatoria |
| `CORS_ORIGENES` | Orígenes que pueden llamar a la API, separados por comas. Sin valor, en desarrollo se acepta cualquiera |
| `HOST` | Interfaz en la que escucha la API. Por defecto `127.0.0.1` fuera de producción y `0.0.0.0` en producción; el Dockerfile la fija en `0.0.0.0` |
| `PROXIES_DE_CONFIANZA` | Cuántos proxies hay delante de la API (0 a 5, por defecto 0): de ahí sale `req.ip`, que cuenta el límite de pedidos. Obligatoria con `NODE_ENV=production` |
| `FIRMA_PROXY_NETLIFY` | Secreto que comparte con Netlify: con valor, la API rechaza con 403 lo que no traiga la firma `x-nf-sign` del reenvío. Obligatoria con `NODE_ENV=production`, de al menos 32 caracteres |
| `VAPID_CLAVE_PUBLICA`, `VAPID_CLAVE_PRIVADA`, `VAPID_CONTACTO` | Claves VAPID de los avisos push y contacto (`mailto:` o `https:`). Van las tres juntas; obligatorias con `NODE_ENV=production`. Sin ellas no se manda ningún push |
| `LOGIN_DESARROLLO` | Con `true` habilita `POST /auth/desarrollo` (login por email, sin Google). Prohibida con `NODE_ENV=production`: la API no arranca |

`.env` nunca se commitea. Cuando aparece una variable nueva, se agrega a `.env.example` en el mismo commit.
