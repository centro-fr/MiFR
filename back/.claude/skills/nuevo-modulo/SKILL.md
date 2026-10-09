---
name: nuevo-modulo
description: Crea un componente completo del backend (interfaz, service, repositorio, controller, rutas, esquemas Zod, tipos y tests) siguiendo el patrón de gestion-usuarios, y lo cablea en composicion.ts y en el router de su subsistema. Usar al empezar cualquier módulo nuevo, como alumnos, planes, inscripciones, clases, cuotas, pagos, honorarios, rutinas o notificaciones.
---

# Crear un módulo nuevo

Genera un componente siguiendo exactamente la estructura de `modules/gestion-usuarios/usuario/`, que es la referencia del proyecto.

## Antes de escribir nada

1. **Buscar el nombre en el diagrama.** Abrir `docs/diagrams/vista_arquitectonica.puml` y encontrar el subsistema y el componente. De ahí salen el nombre de la carpeta y el de la interfaz. No inventar nombres: si el diagrama dice `GestionInscripcionesYClases` con componente `Inscripcion` e interfaz `ILogicaInscripcionesYClases`, eso es lo que se usa.

2. **Verificar que la entidad exista en el esquema.** Si el modelo de Prisma todavía no está, correr primero la skill `nueva-entidad`.

3. **Leer las reglas que aplican:** `.claude/rules/arquitectura.md` e `.claude/rules/interfaces.md`.

## Archivos a crear

En `src/modules/<subsistema>/<componente>/`:

| Archivo | Contenido |
| --- | --- |
| `interface/i-*.ts` | La interfaz que el diagrama le asigna al componente (por ejemplo `IInfoPlanes`), con un comentario arriba que la vincule y aclare qué queda afuera |
| `<x>.types.ts` | Re-exporta los tipos de Prisma con nombres de dominio |
| `<x>.schemas.ts` | Esquemas Zod de entrada, con los tipos inferidos exportados |
| `<x>.repository.ts` | Clase con métodos en español; recibe `PrismaClient` por constructor y es el único que lo usa |
| `<x>.service.ts` | Clase que implementa la interfaz; recibe repositorio y dependencias por constructor |
| `<x>.controller.ts` | `create<X>Controller(logica: ILogica<X>)` que devuelve el objeto de handlers; recibe solo la parte de la `ILogica*` de su componente |
| `<x>.routes.ts` | `create<X>Routes(logica: ILogica<X>, acceso: ControlDeAcceso)` que devuelve el `Router` |
| `<x>.openapi.ts` | `registrarDocumentacion<X>(registro)`, con las rutas, los permisos que exigen y los errores que devuelven |
| `__tests__/<x>.service.test.ts` | Tests del service con el repositorio mockeado: camino feliz y cada error |
| `__tests__/<x>.repository.test.ts` | Tests del repositorio con el cliente de Prisma mockeado |
| `__tests__/<x>.schemas.test.ts` | Lo que acepta y lo que rechaza cada schema (`-0`, negativos, textos sin letras, emails y fechas inválidos) |
| `__tests__/<x>.routes.test.ts` | Contrato HTTP, códigos y permisos con `supertest` sobre `createApp` |

En la raíz del subsistema, `src/modules/<subsistema>/`:

- `interface/i-logica-<subsistema>.ts`: agregar la parte del componente (`ILogica<X>`, con los métodos que usa su controller) y sumarla al `extends` de la `ILogica*` del subsistema. Las partes viven en ese archivo porque no son interfaces del diagrama: la que provee el subsistema es la unión.
- `<subsistema>.service.ts`: implementar los métodos nuevos delegando en el service del componente.
- `<subsistema>.routes.ts`: montar el router con `router.use("/<recurso>", create<X>Routes(logica, acceso))`.
- `<subsistema>.openapi.ts`: llamar a `registrarDocumentacion<X>(registro)`.
- `__tests__/<subsistema>.service.test.ts`: los métodos nuevos de la fachada.
- `src/__tests__/openapi.test.ts`: sumar las operaciones nuevas a la lista.

Después, el cableado:

- En `composicion.ts`: instanciar el repositorio con el `prisma` que recibe, después el service, y pasarlo a la fachada del subsistema.
- `app.ts` y `openapi.ts` solo se tocan si el subsistema es nuevo: se agrega su `ILogica*` a `AppDependencies`, una línea `api.use(create<Subsistema>Routes(deps.<subsistema>, acceso))` y una línea `registrarDocumentacion<Subsistema>(registro)`.

## Reglas a respetar

- Todo en español: nombres de métodos, mensajes de error, nombres de tests.
- El service implementa la interfaz explícitamente y recibe sus dependencias por constructor.
- El repositorio es el único que usa el cliente de Prisma, recibido por constructor. Devuelve `null`; no lanza errores de negocio.
- El service traduce el `null` en `NotFoundError` y valida las reglas del dominio con los errores de `shared/errors/app-error.ts`.
- Las rutas llevan `acceso.sesion`, el `acceso.rol(...)` y el `acceso.permiso("CODIGO")` que correspondan, y `validate({ ... })`. Los handlers van directo, sin envoltorio: Express 5 pasa los rechazos al `errorHandler`.
- Un middleware propio que envuelve un guardia lo espera (`await guardia(req, res, next)`): si no, el rechazo se pierde y el pedido queda colgado.
- El controller solo lee de `req`, llama al service y responde. Sin lógica.
- Imports con extensión `.js` (el proyecto es ESM).

## Al terminar

Correr la skill `tests-integracion` para el módulo nuevo: sus endpoints, permisos y reglas que dependen de la base. Después correr `pnpm test:coverage` (tiene que seguir en 100 %), `pnpm test:integration` y `pnpm build`, y resumir qué se creó y qué decisiones quedaron pendientes de confirmar, sin commitear.
