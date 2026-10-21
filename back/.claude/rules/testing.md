
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
- **El repositorio**, con el cliente de Prisma mockeado: que arme las consultas con los filtros, las transacciones y los bloqueos esperados, y que traduzca bien los resultados.
- **Los schemas**, con entradas válidas y con las que no deberían pasar: `-0` y negativos donde no corresponden, decimales en enteros, números en texto, textos sin letras o con caracteres de control, emails y fechas mal formados, listas vacías, repetidas o sin tope.
- **Las rutas**, con `supertest` sobre `createApp(deps)` con dependencias mockeadas: verifica el contrato HTTP, los códigos de estado y que los middlewares de autorización estén puestos.
- **La fachada del subsistema**: que cada operación llegue al componente dueño y las reglas que cruzan componentes (por ejemplo, la baja bloqueada o lo que ve una profesora).
- **Las utilidades de `shared/`** (esquemas, middlewares, fechas).
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
- Cada test empieza con `reiniciarBase(prisma)`: vacía las tablas y vuelve a cargar roles, permisos, la matriz inicial, los parámetros del sistema con su valor inicial y el catálogo de insignias.
- El escenario se arma con las fábricas de `src/__tests__/integracion/fabricas.ts` o con `cargarDatosDemo` (los datos de `db:seed:demo`); la sesión se abre con `entorno.iniciarSesion(email)`, que pasa por el login real.
- Solo corren contra una base cuyo nombre termine en `_test`: si no, fallan antes de tocar nada.
- Van pocos y apuntados: lo que un mock no puede mostrar (permisos que salen de la base, restricciones de Postgres, transacciones, cableado). No repetir lo que ya cubre un unitario.

## Todo agregado viene con tests

**Nada se agrega ni se cambia en el back sin sus tests, en el mismo trabajo.** No hay "los tests después": si una pieza nueva no tiene test, no está terminada.

| Si se agrega o cambia | Viene con |
| --- | --- |
| Un método de service | Camino feliz y cada error que pueda lanzar, en `<x>.service.test.ts` |
| Un método de repositorio | Su consulta, filtros y transacción, en `<x>.repository.test.ts` |
| Un schema o un campo | Lo que acepta y lo que rechaza, en `<x>.schemas.test.ts` |
| Una ruta | Contrato HTTP, códigos y permisos, en `<x>.routes.test.ts`, y su operación en `src/__tests__/openapi.test.ts` |
| Una operación de la fachada | Delegación o regla cruzada, en `<subsistema>.service.test.ts` |
| Algo de `shared/` | Su test en el `__tests__/` de esa carpeta |
| Un endpoint, permiso o regla que depende de la base | Tests de integración y su caso en `PRUEBAS-INTEGRACION.md` (skill `tests-integracion`) |
| Un defecto corregido | Un test que fallaba antes del arreglo |

Por cada regla nueva, además, se rompe a propósito el código que la implementa y se comprueba que algún test falla (sección 7.1 de `PRUEBAS-INTEGRACION.md`). Antes de romperlo se copia el archivo y se restaura desde esa copia: `git checkout -- <archivo>` también borra lo que todavía no se commiteó.

## Cobertura mínima

Como mínimo, por cada método con decisiones: el camino feliz y cada error que pueda lanzar.

Antes de integrar la rama de trabajo, `pnpm test` y `pnpm test:integration` tienen que pasar enteros.

`pnpm test:coverage` mide la cobertura de los unitarios. **Se mantiene en 100 %** en sentencias, ramas y funciones, sin contar las interfaces, los tipos (`*.types.ts`), el composition root (`index.ts` y `composicion.ts`) ni las cargas de `shared/db/` (que no tienen lógica o las cubren los tests de integración). Una rama que la baja no se integra. Si un cambio deja líneas sin cubrir, el reporte las lista: o falta un test o sobra código.
