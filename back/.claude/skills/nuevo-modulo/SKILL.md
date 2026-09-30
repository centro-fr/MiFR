---
name: nuevo-modulo
description: Crea un componente completo del backend (interfaz, service, repositorio, controller, rutas, esquemas Zod, tipos y tests) siguiendo el patrón de gestion-usuarios, y lo cablea en app.ts e index.ts. Usar al empezar cualquier módulo nuevo, como alumnos, planes, inscripciones, clases, cuotas, pagos, honorarios, rutinas o notificaciones.
---

# Crear un módulo nuevo

Genera un componente siguiendo exactamente la estructura de `modules/gestion-usuarios/usuario/`, que es la referencia del proyecto.

## Antes de escribir nada

1. **Buscar el nombre en el diagrama.** Abrir `docs/diagrams/vista_arquitectonica.puml` y encontrar el subsistema y el componente. De ahí salen el nombre de la carpeta y el de la interfaz. No inventar nombres: si el diagrama dice `GestionInscripcionesYClases` con componente `Inscripcion` e interfaz `ILogicaInscripciones`, eso es lo que se usa.

2. **Verificar que la entidad exista en el esquema.** Si el modelo de Prisma todavía no está, correr primero la skill `nueva-entidad`.

3. **Leer las reglas que aplican:** `.claude/rules/arquitectura.md` e `.claude/rules/interfaces.md`.

## Archivos a crear

En `src/modules/<subsistema>/<componente>/`:

| Archivo | Contenido |
| --- | --- |
| `interface/i-*.ts` | La interfaz que el diagrama le asigna al componente, con un comentario arriba que la vincule y aclare qué queda afuera. Las `ILogica*` son del subsistema: van en `<subsistema>/interface/` y las realiza `<subsistema>/<subsistema>.service.ts` |
| `<x>.types.ts` | Re-exporta los tipos de Prisma con nombres de dominio |
| `<x>.schemas.ts` | Esquemas Zod de entrada, con los tipos inferidos exportados |
| `<x>.repository.ts` | Clase con métodos en español; único lugar que importa `prisma` |
| `<x>.service.ts` | Clase que implementa la interfaz; recibe repositorio y dependencias por constructor |
| `<x>.controller.ts` | `create<X>Controller(service)` que devuelve el objeto de handlers |
| `<x>.routes.ts` | `create<X>Routes(service, autenticacion)` que devuelve el `Router` |
| `__tests__/<x>.service.test.ts` | Tests del service con el repositorio mockeado |

Después, el cableado:

- En `app.ts`: agregar la dependencia a `AppDependencies` tipada contra la interfaz, y montar el router en el router versionado con `api.use("/<recurso>", create<X>Routes(...))`, que queda bajo `/api/v1`.
- En `index.ts`: instanciar el repositorio y el service, y pasarlos a `createApp`.

## Reglas a respetar

- Todo en español: nombres de métodos, mensajes de error, nombres de tests.
- El service implementa la interfaz explícitamente y recibe sus dependencias por constructor.
- El repositorio es el único que importa `prisma`. Devuelve `null`; no lanza errores de negocio.
- El service traduce el `null` en `NotFoundError` y valida las reglas del dominio con los errores de `shared/errors/app-error.ts`.
- Las rutas llevan `requiereSesion`, el `requiereRol` que corresponda, `validate({ ... })` y `asyncHandler`.
- El controller solo lee de `req`, llama al service y responde. Sin lógica.
- Imports con extensión `.js` (el proyecto es ESM).

## Al terminar

Correr `pnpm test` y `pnpm build`. Después, resumir qué se creó y qué decisiones quedaron pendientes de confirmar, sin commitear.
