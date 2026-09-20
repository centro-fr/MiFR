# Testing

Vitest, configurado en `vitest.config.ts` con `environment: "node"` y `globals: false`.

`globals: false` significa que **hay que importar todo explícitamente**. No hay `describe` ni `expect` mágicos en el ámbito global:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
```

## Ubicación y nombres

- Los tests van en `__tests__/`, dentro de la carpeta del componente que prueban.
- El archivo se llama como lo que prueba, con sufijo `.test.ts`: `user.service.test.ts`, `sesion.routes.test.ts`.
- Los nombres de los tests van en español y describen el comportamiento, empezando por el método:

```ts
it("crear crea un usuario nuevo", ...)
it("crear lanza ConflictError si el email o google_id ya existen", ...)
it("obtenerPorId lanza NotFoundError si no existe", ...)
```

## Mocks

Manuales, con `vi.fn()`, mediante funciones que arman el objeto completo. Sin librerías de mocking adicionales:

```ts
function crearRepositorioMock() {
  return {
    buscarPorId: vi.fn(),
    buscarPorEmail: vi.fn(),
    crear: vi.fn(),
    // ... todos los metodos que el service pueda llamar
  };
}
```

Se instancian de nuevo en cada `beforeEach`, para que un test no arrastre las llamadas del anterior.

Al inyectarlos, el cast va contra el tipo real: `repositorio as unknown as UsuarioRepository`.

## Qué se testea

- **El service**, que es donde está la lógica. Con el repositorio y las dependencias mockeadas. Es el test que más rinde.
- **Las rutas**, con `supertest` sobre `createApp(deps)` con dependencias mockeadas: verifica el contrato HTTP, los códigos de estado y que los middlewares de autorización estén puestos.
- **Los cálculos puros** cuando existan (vencimiento, honorarios): son los más fáciles de testear, sin mocks de ningún tipo.

## Qué no se testea

- Prisma. Es una dependencia, ya está probada.
- Los controllers por separado: quedan cubiertos por los tests de rutas.
- Getters, mapeos triviales y código sin decisiones.

## Cobertura mínima

Toda lógica nueva de un service viene con su test en el mismo commit. Como mínimo, por cada método con decisiones: el camino feliz y cada error que pueda lanzar.

Antes de integrar la rama de trabajo, `pnpm test` tiene que pasar entero.
