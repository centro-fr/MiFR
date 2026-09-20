# Persistencia

## Prisma es la interfaz de persistencia

Decisión tomada: **no se crean `IMaterializar` ni `IDesmaterializar` como archivos TypeScript.** Son conceptos del diagrama de arquitectura, y Prisma Client ya los realiza: `create` / `update` / `delete` materializan; `findUnique` / `findFirst` / `findMany` desmaterializan.

Está documentado en el comentario de `shared/db/client.ts` y en la nota de la capa de administración de datos en `vista_arquitectonica.puml`. No agregar una capa de interfaces propias encima de Prisma: no aporta nada y hay que mantenerla.

## El cliente

`shared/db/client.ts` exporta un singleton de `PrismaClient`, creado de forma perezosa y guardado en `globalThis` fuera de producción para que el recargado en caliente de `tsx watch` no abra una conexión nueva en cada cambio.

Es el único punto de acceso a la base.

## Repositorios

**`prisma` se importa únicamente dentro de un repositorio.** Un service nunca lo toca; pide los datos al repositorio que le inyectaron.

El repositorio es la traducción entre Prisma y el dominio. Sus métodos van en español y describen la intención, no la consulta:

```ts
export class UsuarioRepository {
  buscarPorId(id: string): Promise<UsuarioConRoles | null> { ... }
  buscarPorGoogleId(googleId: string): Promise<UsuarioConRoles | null> { ... }
  listar(): Promise<UsuarioConRoles[]> { ... }
  crear(data: CrearUsuarioInput): Promise<UsuarioConRoles> { ... }
  actualizar(id: string, data: Record<string, unknown>): Promise<UsuarioConRoles> { ... }
  eliminar(id: string): Promise<UsuarioConRoles> { ... }
}
```

Los fragmentos de consulta que se repiten se extraen a una constante del módulo, como `CON_ROLES` en `user.repository.ts`.

Un repositorio no lanza errores de negocio ni valida: devuelve lo que hay, o `null`. Decidir que un `null` es un `NotFoundError` es trabajo del service.

**Deuda conocida:** `permiso.service.ts` hoy llama a `prisma.usuario_roles` directamente, sin repositorio. Es una excepción a corregir, no el patrón a copiar. Cuando se toque ese módulo, extraer un `PermisoRepository`.

## Esquema y migraciones

- El esquema vive en `prisma/schema.prisma` y tiene que reflejar `docs/diagrams/der.puml`: mismos atributos, mismos tipos, mismos valores de enumerado. Ver `arquitectura.md`.
- Tablas y columnas en `snake_case`, en plural para las tablas: `usuarios`, `usuario_roles`, `id_usuario`, `fecha_alta`.
- Todo cambio de esquema pasa por `pnpm prisma:migrate` con un nombre descriptivo. Nunca SQL manual contra la base.
- La migración generada se commitea junto al cambio de esquema, en el mismo commit.
- Después de tocar el esquema hay que correr `pnpm prisma:generate` para que los tipos se actualicen.

## Tipos

Los tipos que genera Prisma se re-exportan con nombres de dominio en el `<x>.types.ts` del módulo, para que el resto del código no hable en `snake_case` de tabla:

```ts
export type Usuario = usuarios;
export type Rol = rol;
export type UsuarioConRoles = usuarios & { roles: usuario_roles[] };
```

El resto del código importa desde ahí, no desde `@prisma/client`.
