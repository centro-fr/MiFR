# Tests de integración: referencia técnica

## Qué tipo de integración son

Las pruebas de integración se suelen dividir en tres tipos: de componentes (frontend), sistema-API (frontend + backend) y de servicios (backend + base de datos / terceros). Estas son **de servicios, del lado de la base de datos**: el backend completo contra un PostgreSQL real, verificando la respuesta HTTP y lo que queda guardado.

- **Terceros:** se simulan. Hoy el único es Google, y el código que habla con él (`GoogleAutenticacion`) tiene sus tests unitarios. Una integración nueva con un tercero (por ejemplo, una pasarela de pagos) se prueba contra el *sandbox* del proveedor, en una suite aparte.
- **Componentes de front:** le corresponden al equipo de front.
- **Sistema-API:** sería punta a punta con el navegador (Playwright), en pocos flujos críticos y coordinado con el equipo de front. Mientras tanto, el contrato se cuida con la documentación OpenAPI, que sale de los mismos esquemas Zod que validan cada pedido, y con `src/__tests__/openapi.test.ts`.

## Cómo se corren

```bash
docker compose --profile test up -d db-test     # base de prueba (en memoria, puerto 55433)
pnpm test:integration                           # desde back/
docker compose --profile test stop db-test      # al terminar; se pierde todo, y eso se busca
```

La suite aplica sola las migraciones al arrancar. `pnpm test` corre solo los unitarios y no necesita Docker.

## Decisiones

| Decisión | Por qué |
| :--- | :--- |
| Vitest + Supertest, no Playwright | Supertest corre la app en el mismo proceso del test: más rápido, sin puertos, y permite reemplazar Google sin usar `LOGIN_DESARROLLO`. Mantiene la cobertura de Vitest y no agrega dependencias |
| Postgres real, no SQLite ni pglite | Lo que se prueba depende del motor: `CHECK`, enums, índices únicos. Misma imagen que desarrollo (`postgres:16-alpine`) |
| Servicio `db-test` en `docker-compose.yml`, no Testcontainers | Sin dependencias nuevas. `profiles: ["test"]` evita que arranque con un `docker compose up` normal; `tmpfs` la deja en memoria. En CI se reemplaza por `services: postgres` apuntando `DATABASE_URL_TEST` |
| `prisma migrate deploy`, no `db push` | Igual que producción. `db push` no ejecuta el SQL escrito a mano en las migraciones, y la base quedaría sin los `CHECK` |
| `construirDependencias` (`src/composicion.ts`) | Es el mismo cableado que usa `index.ts`: se prueba el grafo de objetos de producción. Los tests le pasan un `PrismaClient` de prueba, un `JwtService` real con secreto de test y Google simulado (el `id_token` es el email) |
| `cargarCatalogoSeguridad` y `cargarDatosDemo` en `src/shared/db/` | Los comparten los seeds y los tests: la base de prueba arranca con la misma seguridad que la publicada, y los datos de `db:seed:demo` son los mismos que verifican los tests |

## Protecciones

- **Solo bases `_test`.** Los tests vacían todas las tablas: si la URL no termina en `_test`, la suite falla antes de tocar nada.
- **Sin paralelismo entre archivos** (`fileParallelism: false`): comparten una base.
- **Base limpia en cada test.** `reiniciarBase` trunca todas las tablas del esquema (menos `_prisma_migrations`), leyendo la lista de Postgres, y vuelve a cargar el catálogo de seguridad.
- **Logs solo si algo falla** (`silent: "passed-only"`).

## Estructura

```text
docker-compose.yml                    servicio db-test (perfil "test", puerto 55433)
back/
  vitest.config.ts                    unitarios: excluye *.integration.test.ts
  vitest.integration.config.ts        integración: globalSetup, sin paralelismo, logs silenciados
  src/
    composicion.ts                    construirSistema() y construirDependencias(): el cableado compartido
    shared/db/catalogo-seguridad.ts   cargarCatalogoSeguridad(): roles, permisos y matriz inicial
    shared/db/parametros-iniciales.ts cargarParametrosIniciales(): parámetros del sistema con su valor inicial
    shared/db/datos-demo.ts           cargarDatosDemo(): profesoras, actividades, horarios, planes, alumnos e inscripciones
    __tests__/integracion/
      global-setup.ts                 verifica que la base sea _test y aplica las migraciones
      base-de-prueba.ts               URL, verificación _test, PrismaClient de prueba, reiniciarBase
      entorno.ts                      app real + Google simulado + iniciarSesion(email) + infoInscripciones (alta definitiva sin pasar por un cobro)
      fabricas.ts                     crearUsuario(prisma, { roles, estado }), crearPlan(...), crearAlumno(...), crearHorarioDePrueba(...)
```

## Datos disponibles

- **Catálogo de seguridad:** se carga solo en cada `reiniciarBase`.
- **`crearUsuario`:** usuarios con los roles y el estado que se pidan, con correos `usuarioN@example.com`.
- **`crearPlan`:** plan mensual de 2 clases por semana con un único precio abierto ($25.000 desde el 01/01/2026); se le puede pasar nombre, tipo, precio, fecha de vigencia y actividad exclusiva. Devuelve `id_plan` e `id_plan_precio`, que es lo que necesita una inscripción.
- **`crearAlumno`:** alumno con su usuario, pre-inscripto (`INACTIVO`, sin roles), mayor de edad y con email `alumnoN@example.com`; se le puede pasar nombre, apellido, DNI, email (`null` para un menor), fecha de nacimiento, estado y `id_usuario_responsable`. Devuelve `id_alumno` e `id_usuario`.
- **`cargarDatosDemo`:** Marina Sosa (`marina.sosa@example.com`, propietaria y profesora), Lucía Gómez y Carla Ruiz (profesoras); Funcional Grupal (`FUNCIONAL`, grupal, sin cupo) y Entrenamiento Personalizado (`ENTRENAMIENTO_PERS`, personalizada, cupo 4); horarios de Lucía lunes y miércoles 18–19, Carla martes y jueves 9–10, y Marina viernes 19–20 con cupo propio 12. Planes Básico, Intermedio, Personalizado 2 días (exclusivo de Entrenamiento Personalizado, profesora única) y Clase suelta, con precios desde el 01/01/2026; alumnos pre-inscriptos Sofía Medina (mayor) y Mateo Romero (menor, tutora Paula Romero). Devuelve los ids de profesoras por correo, de actividades por código, de planes por nombre y de alumnos por DNI. Como el escenario ya trae planes y alumnos, los tests cuentan contra lo que había o filtran por sus propios nombres.
- Los horarios tienen que caer de lunes a sábado, entre las 07:00 y las 23:00 (horario de atención): un domingo o una hora fuera de esa franja hacen que la API responda 400 antes de llegar a la regla que se quiere probar.

## Archivos y códigos asignados

Los códigos de los tests son de `PRUEBAS-INTEGRACION.md` (raíz del repo), para poder citarlos. Mantener esta tabla al día al sumar tests.

| Letra | Archivo | Tema | Último código |
| :--- | :--- | :--- | :--- |
| A | `src/__tests__/integracion/control-de-acceso.integration.test.ts` | Autenticación, permisos por rol, datos propios, relectura de permisos, administración de roles e identidad de la cuenta | A-48 |
| B | `src/__tests__/integracion/actividades-y-horarios.integration.test.ts` | Cupos, asignación de horarios, modificación y baja de actividades (también con planes exclusivos); las actividades públicas; el cierre de las 23:00 | B-21 |
| C | `src/shared/db/__tests__/catalogo-seguridad.integration.test.ts` | Carga del catálogo de seguridad | C-03 |
| D | `src/__tests__/integracion/planes.integration.test.ts` | Planes, baja lógica y precios con fecha de vigencia | D-14 |
| E | `src/__tests__/integracion/alumnos.integration.test.ts` | Alta de alumnos y tutores, modificación, búsqueda, lo que ve la profesora y el tutor en el alta de un menor | E-23 |
| F | `src/modules/gestion-personas/alumno/__tests__/alumno.integration.test.ts` | Activación, baja y reactivación del alumno sobre el componente (todavía sin endpoint) | F-03 |
| G | `src/__tests__/integracion/inscripciones.integration.test.ts` | Pre-inscripción (también la de una profesora, el peso y la talla y la reserva de cupo que vence), alta definitiva, baja, reactivación, cambios de plan y horarios, baja de horario con inscriptos, ocupación, paginación y el detalle de la baja con el motivo OTRO; la reactivación de quien nunca pagó | G-32 |
| H | `src/__tests__/integracion/cuotas-y-pagos.integration.test.ts` | Restricciones de cuotas y pagos, el pago del escenario de demostración el cobro en una sola transacción, el pago adelantado, el historial de cuotas y el precio que aplica el cobro según la vigencia (sobre los componentes, armados con `armarCuotasYPagos` de `cobro.ts`); el cobro en efectivo, la transferencia y su revisión por la API; la situación de cuota en la ficha y el listado de alumnos | H-16 |
| I | `src/shared/db/__tests__/parametros-iniciales.integration.test.ts` | Carga de los parámetros del sistema | I-04 |

El último caso PI se toma de la sección 6.1 de `PRUEBAS-INTEGRACION.md`.

## Problemas comunes

| Síntoma | Causa y solución |
| :--- | :--- |
| `No se pudieron aplicar las migraciones en la base de prueba` | `db-test` no está levantada |
| `error during connect ... dockerDesktopLinuxEngine` | Docker Desktop no está abierto |
| `solo corren contra una base cuyo nombre termine en _test` | `DATABASE_URL_TEST` apunta a otra base. Sin esa variable se usa `db-test` |
| `port is already allocated` en el `55433` | Otro proceso usa el puerto. Liberarlo o cambiarlo en `docker-compose.yml` y en `DATABASE_URL_TEST` |
| Un horario válido devuelve 400 | Cae fuera de 07:00–23:00 |

## Pendiente

- **CI:** workflow de GitHub Actions con `services: postgres:16` que corra `test`, `test:integration` y `build` en cada PR a `dev`.
- **Repositorios contra la base:** `UNIQUE` (email, dni, código) que terminan en 409 y no en 500, y rollback de los `$transaction`.
