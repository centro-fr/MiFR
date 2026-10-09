# MiFR — Backend

API del sistema de gestión de MiFR, un centro de entrenamiento. Administra usuarios y roles, alumnos, planes, inscripciones, clases, cuotas, pagos, honorarios, rutinas y notificaciones.

**Stack:** Node + TypeScript (ESM), Express 5, Prisma sobre PostgreSQL, Zod para validación, Vitest para tests. Monorepo pnpm; este paquete vive en `back/`.

**Estado actual:** están implementados cuatro de los nueve subsistemas del diagrama de arquitectura: `gestion-usuarios` (usuario, sesión, rol), `gestion-personas` (profesor, alumno), `gestion-servicio-entrenamiento` (actividad, horario, plan) y `gestion-inscripciones-y-clases` (inscripción). Los otros cinco todavía no tienen carpeta.

## Comandos

```bash
pnpm dev              # tsx watch src/index.ts
pnpm build            # tsc -p tsconfig.build.json (sin __tests__)
pnpm test             # vitest run
pnpm test:coverage    # vitest run --coverage (reporte en consola)
pnpm test:integration # tests contra Postgres real; antes: docker compose --profile test up -d db-test
pnpm format           # prettier --write .
pnpm format:check     # prettier --check .
pnpm prisma:generate  # regenerar el cliente tras tocar el schema
pnpm prisma:migrate   # crear y aplicar migracion
pnpm prisma:studio    # explorar la base
pnpm db:seed          # roles, permisos y la primera propietaria (también en producción)
pnpm db:seed:demo     # datos de prueba, solo contra una base local
pnpm token            # JWT de desarrollo para un usuario, para probar en Swagger
```

Para entrar al front sin Google en desarrollo está `LOGIN_DESARROLLO=true`, que habilita `POST /auth/desarrollo` (ver el README de la raíz). Con `NODE_ENV=production` la API no arranca si está activa.

La imagen de Docker está en `Dockerfile` y se construye desde la raíz del monorepo (`docker compose up -d --build`). La etapa `produccion` lleva solo las dependencias de producción, corre como el usuario `node` y al arrancar aplica las migraciones (`prisma migrate deploy`) antes de levantar la API. Por eso `prisma` es dependencia de producción. El plan de publicación (Netlify, Render y Neon) está en `DESPLIEGUE.md`, y la configuración de Render en `render.yaml` de la raíz.

No hay linter todavía: typescript-eslint no soporta TypeScript 7, que es la versión del proyecto. Por ahora la red de seguridad son `tsc` con `strict` y los tests. Ver `.claude/rules/documentacion.md`.

## Estructura

```text
src/
  index.ts    composition root: lee el entorno, crea las piezas de infraestructura y levanta el servidor
  composicion.ts  construirDependencias(): arma los componentes; lo usan index.ts y los tests de integración
  app.ts      createApp(deps): arma Express, crea el ControlDeAcceso y monta un router por subsistema
  modules/<subsistema>/
      interface/       i-logica-*.ts  (la interfaz del subsistema, la única que ve la presentación,
                                       dividida en una parte por componente)
      <subsistema>.service.ts         (la realiza pasando cada operación a su componente)
      <subsistema>.routes.ts          (monta los routers de sus componentes)
      <subsistema>.openapi.ts         (registra la documentación de sus componentes)
  modules/<subsistema>/<componente>/
      interface/       i-*.ts
      __tests__/       *.test.ts (unitarios)   *.integration.test.ts (contra Postgres)
      <x>.routes.ts    <x>.controller.ts   <x>.service.ts
      <x>.repository.ts   <x>.schemas.ts   <x>.types.ts
      <x>.openapi.ts                  (documentación Swagger de sus rutas)
  openapi.ts  registra en un OpenAPIRegistry los <subsistema>.openapi.ts
  shared/     transversal: db/  errors/  middlewares/  openapi/  utils/
prisma/       schema.prisma, migrations/, seed.ts
```

`modules/` se organiza por subsistema de negocio y sus nombres salen del diagrama de arquitectura. `shared/` se organiza por tipo técnico.

Recorrido de una petición:

```text
routes (guardias de acceso) → validate(schemas) → controller → fachada ILogica* → service → repository → prisma
```

## Documentación de la API (Swagger)

Fuera de producción, la API publica Swagger UI en `/api/v1/docs` y el documento en `/api/v1/docs/openapi.json`. Con `NODE_ENV=production` no se publica.

El documento se genera con `@asteasolutions/zod-to-openapi` a partir de los mismos esquemas Zod de `<x>.schemas.ts`, así que el contrato de entrada no se escribe dos veces. Cada componente tiene su `<x>.openapi.ts`, que registra sus rutas y define los esquemas de respuesta; el `<subsistema>.openapi.ts` junta los de sus componentes, `src/openapi.ts` los de cada subsistema, e `index.ts` crea el registro y genera el documento. Al agregar una ruta hay que documentarla ahí y sumarla a la lista de `src/__tests__/openapi.test.ts`, que falla si una operación falta o sobra.

Los errores se lanzan como subclases de `AppError` y los captura `shared/middlewares/error-handler.ts`. Nadie devuelve errores a mano.

## Reglas duras

Estas no se discuten. El detalle y el porqué están en `.claude/rules/`.

1. Todo se escribe en español: identificadores, comentarios, mensajes de error, tests y commits.
2. El código sigue a los diagramas de `docs/diagrams/`. Para apartarse, primero se actualiza el diagrama.
3. Solo el composition root (`index.ts` y `composicion.ts`) instancia clases concretas, incluidas las de librerías (`PrismaClient`, `OAuth2Client`, el generador de OpenAPI). Donde hay interfaz, se depende de la interfaz. Las únicas otras excepciones son los seeds de `prisma/`, que son programas aparte con su propio punto de entrada, y los tests.
4. El cliente de Prisma lo recibe por constructor solo un repositorio. Un service nunca lo toca.
5. Nunca se commitea directo sobre `main` ni sobre `dev`.
6. Los commits no mencionan herramientas de IA: sin coautores, sin enlaces de sesión, sin etiquetas de generación automática.
7. Los comentarios explican el porqué, nunca el cambio. Nada de `// se agregó`, `// antes era así` ni código comentado.
8. Nada de `any`, secretos escritos en el código ni `console.log` de depuración.
9. No se introduce un patrón de diseño sin un caso concreto que lo justifique.
10. Toda ruta valida su entrada con Zod, con los esquemas compartidos de `shared/utils/` (ver `.claude/rules/validaciones.md`). Todo lo que se agrega o se cambia en el back viene con sus tests en el mismo trabajo: unitarios de cada pieza (service, repositorio, schemas, rutas, fachada y utilidades de `shared/`) y, si cruza capas o depende de la base, de integración (skill `tests-integracion`). La cobertura de los unitarios se mantiene en 100 %. El detalle está en `.claude/rules/testing.md`.

## Reglas detalladas

Están en `.claude/rules/`. No hace falta leerlas todas: se consulta la que corresponda a la tarea.

| Archivo | Cuándo leerlo |
| --- | --- |
| `git.md` | Antes de crear una rama, commitear o integrar |
| `arquitectura.md` | Al crear un módulo, o al dudar dónde va algo |
| `patrones.md` | Antes de implementar cálculos, estados o ciclos de vida |
| `interfaces.md` | Al definir o consumir una interfaz |
| `persistencia.md` | Al tocar Prisma, el esquema o un repositorio |
| `testing.md` | Al escribir tests |
| `documentacion.md` | Al comentar código o dudar de una buena práctica |
| `validaciones.md` | Al escribir o cambiar un schema de Zod |
| `mcp.md` | Al explorar el código con herramientas |

## Skills

En `.claude/skills/`: `nuevo-modulo`, `nueva-entidad`, `tests-integracion`, `validar-arquitectura` y `revisar-antes-de-integrar`.

> Claude Code busca las skills y la configuración en la carpeta donde se abre la sesión. Para que estas aparezcan hay que abrir la sesión parada en `back/`. Si se abre en la raíz del repositorio, el `CLAUDE.md` igual se carga, pero las skills no.
