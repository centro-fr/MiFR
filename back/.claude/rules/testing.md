
# Testing

Vitest, configurado en `vitest.config.ts` con `environment: "node"` y `globals: false`.

`globals: false` significa que **hay que importar todo explícitamente**. No hay `describe` ni `expect` mágicos en el ámbito global:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
```

## Ubicación y nombres

- Los tests van en `__tests__/`, dentro de la carpeta del componente que prueban.
- El archivo se llama como lo que prueba, con sufijo `.test.ts`: `usuario.service.test.ts`, `sesion.routes.test.ts`.
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
- **Lo que solo se ve con la base real**, en los tests de integración (sección siguiente).

## Qué no se testea

- Prisma en sí. Es una dependencia, ya está probada. Lo que sí se prueba, en integración, es que nuestras consultas, restricciones y transacciones hagan lo que esperamos.
- Los controllers por separado: quedan cubiertos por los tests de rutas.
- Getters, mapeos triviales y código sin decisiones.

## Tests de integración

Corren la app real (`construirDependencias` de `composicion.ts`, el mismo cableado que usa `index.ts`) contra un Postgres real. Lo único simulado es Google.

**Toda funcionalidad nueva o modificada que cruce capas o dependa de la base (endpoint, permiso, regla de negocio, US) viene con sus tests de integración en el mismo trabajo.** El procedimiento está en la skill `tests-integracion`, que además completa el plan de pruebas en `PRUEBAS-INTEGRACION.md` (raíz del repo): casos, tests, trazabilidad, corridas y defectos. El detalle técnico (decisiones, estructura, datos disponibles y códigos asignados) está en `.claude/skills/tests-integracion/referencia.md`.

- Archivo con sufijo `.integration.test.ts`. `pnpm test` los excluye; corren con `pnpm test:integration`, que usa `vitest.integration.config.ts`.
- Los que recorren varios componentes por HTTP van en `src/__tests__/integracion/`. Los de un componente puntual van en el `__tests__/` del componente.
- Base: `docker compose --profile test up -d db-test` (puerto 55433, en memoria). Las migraciones se aplican solas al arrancar la suite.
- Cada test empieza con `reiniciarBase(prisma)`: vacía las tablas y vuelve a cargar roles, permisos y la matriz inicial.
- El escenario se arma con las fábricas de `src/__tests__/integracion/fabricas.ts` o con `cargarDatosDemo` (los datos de `db:seed:demo`); la sesión se abre con `entorno.iniciarSesion(email)`, que pasa por el login real.
- Solo corren contra una base cuyo nombre termine en `_test`: si no, fallan antes de tocar nada.
- Van pocos y apuntados: lo que un mock no puede mostrar (permisos que salen de la base, restricciones de Postgres, transacciones, cableado). No repetir lo que ya cubre un unitario.

## Cobertura mínima

Toda lógica nueva de un service viene con su test en el mismo commit. Como mínimo, por cada método con decisiones: el camino feliz y cada error que pueda lanzar.

Antes de integrar la rama de trabajo, `pnpm test` y `pnpm test:integration` tienen que pasar enteros.

`pnpm test:coverage` mide la cobertura de los unitarios. Hoy es del 100% en sentencias, ramas y funciones, sin contar las interfaces, los tipos, el composition root (`index.ts` y `composicion.ts`) ni `shared/db/catalogo-seguridad.ts` (que no tienen lógica o la cubren los tests de integración). Si un cambio deja líneas sin cubrir, el reporte las lista: o falta un test o sobra código.
