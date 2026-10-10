# Persistencia

## Prisma es la interfaz de persistencia

Decisión tomada: **no se crean `IMaterializar` ni `IDesmaterializar` como archivos TypeScript.** Son conceptos del diagrama de arquitectura, y Prisma Client ya los realiza: `create` / `update` / `delete` materializan; `findUnique` / `findFirst` / `findMany` desmaterializan.

Está documentado en el comentario de `shared/db/client.ts` y en la nota de la capa de administración de datos en `vista_arquitectonica.puml`. No agregar una capa de interfaces propias encima de Prisma: no aporta nada y hay que mantenerla.

## El cliente

`index.ts` crea **una sola instancia** de `PrismaClient`, con las opciones que arma `opcionesDelClientePrisma` de `shared/db/client.ts`, y se la pasa por constructor a cada repositorio. Una sola instancia es un solo pool de conexiones para todo el proceso.

No hace falta guardarla en `globalThis` para el modo desarrollo: `tsx watch` reinicia el proceso entero en cada cambio, así que no se acumulan clientes.

Es el único punto de acceso a la base.

## Repositorios

**El cliente de Prisma solo lo recibe un repositorio, por constructor.** Un service nunca lo toca; pide los datos al repositorio que le inyectaron. En los tests del repositorio se le pasa un objeto con los métodos de Prisma mockeados, sin `vi.mock` de módulos.

El repositorio es la traducción entre Prisma y el dominio. Sus métodos van en español y describen la intención, no la consulta:

```ts
export class UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorId(id: string): Promise<UsuarioConRoles | null> { ... }
  buscarPorGoogleId(googleId: string): Promise<UsuarioConRoles | null> { ... }
  listar(): Promise<UsuarioConRoles[]> { ... }
  crear(data: CrearUsuarioInput): Promise<UsuarioConRoles> { ... }
  actualizar(id: string, data: Record<string, unknown>): Promise<UsuarioConRoles> { ... }
  eliminar(id: string): Promise<UsuarioConRoles> { ... }
}
```

Los fragmentos de consulta que se repiten se extraen a una constante del módulo, como `CON_ROLES` en `usuario.repository.ts`.

Un repositorio no lanza errores de negocio ni valida: devuelve lo que hay, o `null`. Decidir que un `null` es un `NotFoundError` es trabajo del service.

## Transacciones

Las transacciones interactivas se abren con `enTransaccion(this.prisma, async (transaccion) => ...)` de `shared/db/transaccion.ts`, nunca con `this.prisma.$transaction(async ...)` directo. Si ya hay una transacción abierta en esa operación, `enTransaccion` se suma a ella en lugar de abrir otra. Las escrituras de una sola sentencia que pueden formar parte de una operación más grande (como dar un rol en el alta del primer pago) usan `clienteEnCurso(this.prisma)`.

Cuando varias escrituras de distintos componentes tienen que confirmarse juntas, la fachada que las coordina recibe `IUnidadDeTrabajo` y las envuelve en `unidadDeTrabajo.ejecutar(...)`. Es el caso del cobro: el alta definitiva de la inscripción, la activación del alumno, su rol y el pago quedan todos o ninguno. La transacción viaja con `AsyncLocalStorage`, así que no pasa por los services ni por las interfaces entre componentes, y Prisma sigue sin salir de los repositorios. `UnidadDeTrabajoPrisma` es la única pieza fuera de un repositorio que recibe el cliente, y la instancia el composition root.

Dentro de una unidad, los bloqueos se toman siempre en el mismo orden (primero los de la inscripción, después el del cobro) para que dos operaciones no se esperen entre sí.

## Esquema y migraciones

- El esquema vive en `prisma/schema.prisma` y tiene que reflejar `docs/diagrams/puml/der.puml`: mismos atributos, mismos tipos, mismos valores de enumerado. Ver `arquitectura.md`.
- Tablas y columnas en `snake_case`, en plural para las tablas: `usuarios`, `usuario_roles`, `id_usuario`, `fecha_alta`.
- Todo cambio de esquema pasa por `pnpm prisma:migrate` con un nombre descriptivo. Nunca SQL manual contra la base.
- La migración generada se commitea junto al cambio de esquema, en el mismo commit.
- Después de tocar el esquema hay que correr `pnpm prisma:generate` para que los tipos se actualicen.

## Tipos

Los tipos que genera Prisma se re-exportan con nombres de dominio en el `<x>.types.ts` del módulo, para que el resto del código no hable en `snake_case` de tabla:

```ts
export type Usuario = usuarios;
export type Rol = roles;
export type CodigoRol = codigo_rol;
export type UsuarioRol = usuario_roles & { rol: Rol };
export type UsuarioConRoles = Usuario & { roles: UsuarioRol[] };
```

El resto del código importa desde ahí, no desde `@prisma/client`.
