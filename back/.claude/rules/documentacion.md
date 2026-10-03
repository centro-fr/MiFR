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

- Validar toda entrada con Zod en la capa de rutas, con `validate({ body, params, query })`. El service confía en lo que le llega.
- Lanzar errores tipados de `AppError` (`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`), nunca `throw new Error`. Cada uno ya trae su código HTTP.
- Envolver los handlers asincrónicos con `asyncHandler` para que los rechazos lleguen al manejador de errores.
- Proteger las rutas con `requiereSesion(autenticacion)` y `requierePermiso(autorizacion, "CODIGO")` en la definición de la ruta, no adentro del controller. Los códigos salen de `rol/rol.catalogo.ts`; `requiereRol` queda para lo que la spec ata a un rol y no a un permiso.
- Instanciar solo en `index.ts`, también las clases de librerías: quien las usa las recibe por constructor.
- Usar los tipos de dominio de `<x>.types.ts`, no los de `@prisma/client` directamente.
- Mantener los controllers finos: leer de `req`, llamar al service, responder. Nada más.
- Documentar cada ruta nueva en el `<x>.openapi.ts` de su componente, reusando los esquemas de `<x>.schemas.ts`, con los permisos que exige y los errores que puede devolver.

## Malas prácticas

- `any`. Si el tipo no se sabe, `unknown` y estrechar.
- Usar el cliente de Prisma fuera de un repositorio.
- Hacer `new` de una clase concreta fuera de `index.ts`.
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
| `GOOGLE_CLIENT_ID` | Validación del token de Google |
| `JWT_SECRET` | Firma del token propio |
| `JWT_EXPIRES_IN` | Vigencia del token, por defecto `8h` |
| `PORT` | Puerto de la API, por defecto `3000` |
| `NODE_ENV` | Con `production` no se publica la documentación Swagger y `CORS_ORIGENES` pasa a ser obligatoria |
| `CORS_ORIGENES` | Orígenes que pueden llamar a la API, separados por comas. Sin valor, en desarrollo se acepta cualquiera |

`.env` nunca se commitea. Cuando aparece una variable nueva, se agrega a `.env.example` en el mismo commit.
