# Tests de integración del backend

Este documento explica cómo están armados los tests de integración de `back/`, cómo se corren, qué cubren y por qué se eligió cada pieza. El plan de pruebas (casos PI-xx, trazabilidad con las US y registro de ejecución) está en [`testing.md`](testing.md).

## Para qué están

Los tests unitarios mockean la persistencia: los de repositorio reciben un `prisma` falso, los de rutas reciben los services y la autorización mockeados. Son rápidos y cubren el 100% de la lógica, pero hay cosas que por diseño no pueden ver:

- **Los permisos reales.** En los tests de rutas, `tienePermiso` es un `vi.fn()`. Quién entra a cada pantalla lo decide en producción la matriz `roles` / `permisos` / `rol_permisos` de la base, y eso nunca se ejercitaba.
- **Las restricciones de Postgres.** Los `CHECK` de las migraciones (`hora_fin > hora_inicio`, cupo positivo, modalidad PERSONALIZADA con cupo) están escritos en SQL y Prisma no los conoce. Lo mismo pasa con los `UNIQUE` y las claves foráneas.
- **Las consultas y transacciones de verdad.** Que un `include` traiga lo que esperamos, o que un `$transaction` deshaga todo cuando algo falla.
- **El cableado.** Que el composition root conecte cada componente con el que corresponde.

Los tests de integración cubren eso: levantan la app real contra un Postgres real y le pegan por HTTP, igual que el front.

## Qué tipo de integración es

Las pruebas de integración se suelen dividir en tres tipos, según qué partes del sistema se prueban juntas:

| Tipo | Qué verifica | Ejemplo |
| :--- | :--- | :--- |
| Integración de componentes (frontend) | Que varios componentes visuales funcionen bien juntos | Al hacer clic en un botón de la lista de productos, el carrito se actualiza |
| Integración sistema-API (frontend + backend) | Que la interfaz se comunique bien con el servidor | El formulario de registro manda los datos en el formato que espera el backend y maneja bien la respuesta, sea de éxito o de error de validación |
| Integración de servicios (backend + base de datos / terceros) | Que la lógica del servidor guarde, lea y modifique datos reales en la base, o que se conecte bien con servicios externos | Una pasarela de pagos como Stripe o PayPal |

**Lo que hicimos es integración de servicios, del lado de la base de datos.** Los tests levantan el backend completo, con sus rutas, middlewares, services y repositorios reales, contra un PostgreSQL real. Después verifican dos cosas: que las respuestas HTTP sean las correctas y que los datos queden bien guardados en la base, o que no se guarde nada cuando el pedido se rechaza. Lo concreto:

- **Permisos que salen de la base.** Quién puede hacer qué lo decide la matriz `roles` / `permisos` / `rol_permisos`. Los tests la cargan igual que en producción y comprueban cada rol contra cada listado.
- **Cambios que se reflejan en la base al instante.** Si la propietaria quita un permiso o un rol, el cambio queda guardado y rige desde el pedido siguiente, aun con el mismo token.
- **Datos que no deben persistir.** Cuando un pedido se rechaza por falta de permisos, se verifica en la base que no se haya creado nada.
- **Esquema real.** Las migraciones se aplican igual que en producción, con los `CHECK`, los `UNIQUE` y las claves foráneas.
- **Carga del catálogo de seguridad.** Volver a correr el seed no pisa los cambios de la propietaria ni duplica filas.

Los tests le pegan a la API por HTTP, igual que lo haría el front, pero **no son de integración sistema-API**: en ese tipo participa la interfaz real, y acá no hay front. Lo que se prueba es el backend con su base.

**El tramo de terceros quedó afuera a propósito.** El único servicio externo que hoy usa el backend es Google, para el inicio de sesión, y en los tests se reemplaza por uno simulado. Probar contra Google de verdad exigiría cuentas y tokens reales, y el resultado dependería de la red y de un servicio que no controlamos. El código que habla con Google (`GoogleAutenticacion`) está aislado detrás de la interfaz `IAutenticacionGoogleAuth` y tiene sus propios tests unitarios. Cuando llegue la pasarela de pagos, conviene seguir el mismo criterio: probarla contra el entorno de pruebas (*sandbox*) del proveedor, en una suite aparte.

**Los otros dos tipos no son de este documento:**

- **Integración de componentes (frontend):** corresponde al equipo de front y se prueba con las herramientas del front.
- **Integración sistema-API:** sería la prueba de punta a punta con el navegador (Playwright), en pocos flujos críticos como el login o el alta de una profesora. Queda pendiente y hay que coordinarla con el equipo de front. Mientras tanto, el contrato entre las dos partes se cuida desde el backend: la documentación OpenAPI se genera a partir de los mismos esquemas Zod que validan cada pedido, y `src/__tests__/openapi.test.ts` falla si una ruta no está documentada.

## Cómo se corren

Requisito: Docker Desktop abierto.

```bash
# 1. Levantar la base de prueba (una sola vez por sesión de trabajo)
docker compose --profile test up -d db-test

# 2. Correr los tests
pnpm --filter back test:integration
```

La suite aplica sola las migraciones pendientes al arrancar. Para apagar la base: `docker compose --profile test stop db-test`. Como vive en memoria, al apagarla se pierde todo, y eso es lo que se busca.

`pnpm --filter back test` sigue corriendo solo los unitarios, sin necesitar Docker.

## Decisiones y por qué

### Vitest + Supertest, no Playwright

Playwright sirve para tests de punta a punta con navegador: abre el front, hace clic y mira lo que ve la persona. Para probar el backend es la herramienta equivocada:

- Obliga a levantar la API como un proceso aparte. Supertest la corre dentro del mismo proceso del test, así que es más rápido y no hay puertos ni esperas.
- Con la API en otro proceso no se puede reemplazar Google, y para entrar habría que usar `LOGIN_DESARROLLO`, una puerta trasera, en lugar del login real.
- Se pierde la cobertura de Vitest sobre el código del backend.
- Serían dos herramientas y dos configuraciones para el mismo paquete, y Vitest y Supertest ya estaban instalados.

Playwright tiene sentido más adelante para E2E del sistema completo (front, back y base), en pocos flujos críticos y coordinado con el equipo de front.

### Postgres real en Docker, no SQLite ni pglite

Lo que se quiere probar es justamente lo que depende del motor: los `CHECK`, los enums, los índices únicos. Con otra base el test pasaría en verde y producción podría fallar igual. Se usa la misma imagen que en desarrollo (`postgres:16-alpine`).

### Un servicio en docker-compose, no Testcontainers

`db-test` es un servicio más de `docker-compose.yml`, con dos detalles:

- **`profiles: ["test"]`**: un `docker compose up` normal no lo levanta. Solo arranca si se pide explícitamente.
- **`tmpfs`**: los datos viven en memoria, así que es rápido y no deja nada en disco.

Testcontainers aísla más (crea un contenedor por corrida), pero agrega una dependencia y en Windows obliga a que el runner de tests hable con Docker. Con compose alcanza, y en CI se reemplaza por el `services: postgres` de GitHub Actions apuntando `DATABASE_URL_TEST` a esa base.

### `prisma migrate deploy`, no `db push`

El `globalSetup` aplica las migraciones con `migrate deploy`, igual que el contenedor de producción al arrancar. `db push` arma el esquema desde `schema.prisma` y no ejecuta el SQL escrito a mano en las migraciones, así que la base de prueba quedaría sin los `CHECK`: los tests pasarían con un esquema distinto al real.

### El mismo cableado que producción: `composicion.ts`

Antes, `index.ts` armaba todos los componentes y además leía el entorno, validaba la configuración y levantaba el servidor con `listen`. No se podía importar desde un test.

El armado de componentes pasó a `src/composicion.ts` (`construirDependencias`). `index.ts` crea las piezas de infraestructura (Prisma, Google, JWT), se las pasa y levanta el servidor. Los tests llaman a la misma función con:

- un `PrismaClient` apuntando a la base de prueba,
- un `JwtService` real con un secreto de test,
- **Google simulado**: es la única frontera externa que se reemplaza. El `id_token` que manda el test se toma como el email de la cuenta.

Así, lo que se prueba es exactamente el grafo de objetos de producción. La regla "solo el composition root instancia clases concretas" ahora abarca a los dos archivos (ver `back/CLAUDE.md`).

### La carga de roles y permisos es una sola

`seed.ts` y `seed-demo.ts` tenían cada uno su copia de la carga de roles, permisos y matriz inicial. Esa lógica pasó a `src/shared/db/catalogo-seguridad.ts` (`cargarCatalogoSeguridad`), y la usan los dos seeds y los tests. La base de prueba arranca con la misma seguridad que la publicada, y no hay una tercera copia que se desincronice.

Lo mismo con los datos de prueba de desarrollo (Marina, Lucía y Carla, Funcional Grupal, Pilates Reformer y sus horarios): están en `src/shared/db/datos-demo.ts` (`cargarDatosDemo`), los carga `seed-demo.ts` en la base local y los tests de actividades y horarios en la base de prueba. El escenario que se recorre a mano en Swagger o en el front es el mismo que verifican los tests.

### Protecciones

- **Solo bases `_test`.** Los tests vacían todas las tablas. Si la URL apunta por error a la base de desarrollo o a la publicada, la suite falla antes de tocar nada.
- **Sin paralelismo entre archivos** (`fileParallelism: false`). Todos comparten una base: en paralelo, un archivo vaciaría las tablas en medio de un test de otro.
- **Base limpia en cada test.** `reiniciarBase` hace `TRUNCATE ... RESTART IDENTITY CASCADE` de todas las tablas del esquema (menos `_prisma_migrations`) y vuelve a cargar el catálogo de seguridad. Lee la lista de tablas de Postgres, así que una tabla nueva queda incluida sin tocar nada.
- **Logs solo si algo falla** (`silent: "passed-only"`). El logger de peticiones y la auditoría escriben una línea por pedido; se muestran únicamente en los tests que fallan, que es cuando sirven.

## Estructura

```text
docker-compose.yml                  servicio db-test (perfil "test", puerto 55433)
back/
  vitest.config.ts                  unitarios: excluye *.integration.test.ts
  vitest.integration.config.ts      integración: globalSetup, sin paralelismo, logs silenciados
  src/
    composicion.ts                  construirDependencias(): el cableado compartido
    shared/db/catalogo-seguridad.ts cargarCatalogoSeguridad(): roles, permisos y matriz inicial
    shared/db/datos-demo.ts         cargarDatosDemo(): profesoras, actividades y horarios de desarrollo
    shared/db/__tests__/
      catalogo-seguridad.integration.test.ts
    __tests__/integracion/
      global-setup.ts               verifica que la base sea _test y aplica las migraciones
      base-de-prueba.ts             URL, verificación _test, PrismaClient de prueba, reiniciarBase
      entorno.ts                    app real + Google simulado + iniciarSesion(email)
      fabricas.ts                   crearUsuario(prisma, { roles, estado })
      control-de-acceso.integration.test.ts
      actividades-y-horarios.integration.test.ts
```

Convención: los tests que recorren varios componentes por HTTP van en `src/__tests__/integracion/`. Los de un componente puntual (por ejemplo, un repositorio contra la base) van en el `__tests__/` del componente. En los dos casos el archivo termina en `.integration.test.ts`.

## Qué se prueba hoy

### Control de acceso (`control-de-acceso.integration.test.ts`)

Es lo que más duele si falla (OWASP A01, *Broken Access Control*), y era lo que los unitarios no podían ver.

| Grupo | Qué verifica |
| :--- | :--- |
| Autenticación | Sin token: 401. Token firmado con otro secreto: 401. Login de alguien no dado de alta: 403 `USUARIO_NO_REGISTRADO`, sin crear ninguna persona. El login vincula el `google_id` y `/auth/me` devuelve los permisos de la base. Usuario borrado: 401. Usuario dado de baja con token vigente: 403 |
| Lecturas según la matriz inicial | Para cada rol (PROPIETARIA, PROFESORA, ALUMNO, TUTOR) y cada listado (`/usuarios`, `/seguridad/matriz`, `/actividades`, `/horarios`, `/profesoras`), el código esperado: 200 o 403 |
| Escrituras de la propietaria | La propietaria crea una actividad (201). Los demás roles reciben 403 al crear, modificar o dar de baja actividades y al asignar horarios, **y la base queda igual**. Un usuario con varios roles suma los permisos de todos |
| Datos propios | Un alumno ve sus datos pero no los de otro. Tampoco puede cambiar su propio estado |
| Permisos releídos en cada pedido | Los roles del JWT no cuentan: un token con `roles: ["PROPIETARIA"]` de un alumno recibe 403. Un permiso quitado en la matriz o un rol quitado dejan de valer **con el mismo token**. La matriz no deja otorgar a otro rol un permiso exclusivo de la propietaria, y no lo persiste |

### Actividades y horarios (`actividades-y-horarios.integration.test.ts`)

Con los datos de desarrollo y la sesión de Marina:

| Grupo | Qué verifica |
| :--- | :--- |
| Cupo | Una actividad personalizada sin cupo se rechaza (400) y no se guarda. Un horario sin cupo propio toma el de su actividad; si tiene cupo propio, manda el del horario. Una actividad grupal puede no tener cupo |
| Asignación de horarios | Una profesora no puede tener dos horarios superpuestos el mismo día (409), pero dos profesoras distintas sí pueden dictar a la misma hora. Un horario que termina antes de empezar da 400. A quien se le quitó el rol de profesora no se le pueden asignar horarios (404). Ningún rechazo deja un horario guardado |
| Modificación y baja | La descripción nueva de una actividad se ve en todos sus horarios. Una actividad con horarios activos no se puede dar de baja (409) y sigue activa; una sin horarios sí. Una actividad no puede pasar a personalizada sin cupo (400) |

### Catálogo de seguridad (`catalogo-seguridad.integration.test.ts`)

Volver a correr el seed no pisa lo que la propietaria cambió en la matriz, repone los permisos críticos de la propietaria y no duplica filas.

### Cómo se comprobó que los tests detectan fallas

Para cada regla importante se rompió a propósito el código que la implementa y se verificó que algún test fallara:

- `requierePermiso` dejando pasar todo: fallaron 8 tests. Los que siguieron en verde son los de rutas que además exigen `requiereRol("PROPIETARIA")`, que es la segunda barrera que tienen.
- El cupo de la actividad mandando sobre el cupo propio del horario: falló el test del cupo propio. La primera versión de ese test no lo detectaba, porque ningún dato tenía cupo en los dos lados; se corrigió.
- La baja de una actividad sin verificar sus horarios activos: falló el test de la baja bloqueada.

También se apuntó la suite a la base de desarrollo (`mifr`), y se negó a correr.

## Cómo escribir uno nuevo

```ts
import request from "supertest";
import { afterAll, beforeEach, expect, it } from "vitest";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearUsuario } from "./fabricas.js";

const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

beforeEach(() => reiniciarBase(prisma));
afterAll(() => entorno.cerrar());

it("la propietaria no puede crear un horario que termina antes de empezar", async () => {
  const propietaria = await crearUsuario(prisma, { roles: ["PROPIETARIA"] });
  const token = await entorno.iniciarSesion(propietaria.email);

  const respuesta = await request(app)
    .post("/api/v1/horarios")
    .set("Authorization", `Bearer ${token}`)
    .send({ /* ... */ });

  expect(respuesta.status).toBe(400);
});
```

Pautas:

- **Arrange con la base, act con HTTP, assert con los dos.** El escenario se prepara con las fábricas o con `prisma`, la acción va siempre por la API, y se verifica tanto la respuesta como lo que quedó guardado.
- **No repetir los unitarios.** Si algo se puede probar con un mock, va en un unitario. Acá van los casos que dependen de la base o del cableado.
- **Pocos y apuntados.** Cada test de integración tarda alrededor de 100 ms (login incluido), contra uno o dos de un unitario.

## Problemas comunes

| Síntoma | Causa y solución |
| :--- | :--- |
| `No se pudieron aplicar las migraciones en la base de prueba` | `db-test` no está levantada: `docker compose --profile test up -d db-test` |
| `error during connect ... dockerDesktopLinuxEngine` | Docker Desktop no está abierto |
| `solo corren contra una base cuyo nombre termine en _test` | `DATABASE_URL_TEST` apunta a otra base. Sin esa variable se usa `db-test` |
| `port is already allocated` en el `55433` | Hay otro proceso en ese puerto. Liberarlo o cambiar el puerto en `docker-compose.yml` y en `DATABASE_URL_TEST` |

## Próximos pasos

1. **Repositorios contra la base:** `CHECK` de horarios y actividades, `UNIQUE` (email, dni, código) que terminan en 409 y no en 500, y rollback de los `$transaction` de usuario, rol y horario.
2. **Flujos de negocio:** dar de alta a una profesora por la API y asignarle horarios (hoy las profesoras salen de los datos de desarrollo), y dar de baja horarios. Los casos de cada sprint están en [`testing.md`](testing.md).
3. **Mapeo de errores:** 400 (Zod), 404 y 409, y nunca 500 ante una entrada inválida.
4. **CI:** un workflow de GitHub Actions con `services: postgres:16` que corra `test`, `test:integration` y `build` en cada PR a `dev`.
