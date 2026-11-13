# Seguridad

Reglas que salieron de la auditoría del backend (octubre de 2026). Cada una responde a un error que ya apareció en este código, así que vale la pena leerlas antes de escribir una ruta, un permiso o un flujo que cruce componentes. La skill `auditar-cambios` las revisa en cada agregado.

## 1. Un permiso que se puede delegar no alcanza para administrar la seguridad

La propietaria puede dar cualquier permiso no exclusivo a otro rol desde la matriz. Por eso, lo que cambia quién puede qué (asignar o quitar roles, borrar cuentas, cambiar el `estado` de una cuenta, editar la matriz) exige `acceso.rol("PROPIETARIA")` **además** del permiso. Con solo `USUARIOS_EDITAR`, una profesora con el permiso delegado podía hacerse propietaria o dejar afuera a la dueña.

Tampoco se puede dejar el sistema sin una propietaria activa: quitarle el rol, desactivarla o borrarla responde 409 si es la última.

## 2. Toda escritura que pueda hacer alguien que no es la propietaria se acota a quien pide

Las lecturas ya se acotan con el `solicitante`. Las escrituras también, porque una escritura puede abrir una lectura. Una inscripción vigente deja a un alumno "a cargo" de una profesora y le abre su ficha; si cualquier profesora puede crear esa inscripción para cualquier alumno, el alcance de las lecturas no sirve.

Cuando una profesora (o un alumno, o un tutor) llega a una operación:

- El controller pasa `solicitanteDe(req)` y la fachada o el service lo usan.
- Los datos que deciden a quién afecta la operación (`id_profesora`, `id_alumno`, `id_usuario` de un tutor, `sin_cargo`, `estado`) no se toman del cuerpo sin comprobar que quien pide puede usarlos.
- Lo que devuelve la respuesta tampoco puede traer datos de terceros que esa persona no podría leer por su ruta de lectura. Por ejemplo, una profesora que da de alta un alumno ve del tutor solo id, nombre y apellido.

## 3. La autorización va antes que cualquier error que dependa del estado

Si una operación primero valida el estado del recurso (no existe, está de baja, tiene algo pendiente, no tiene precio) y después comprueba quién pide, cada uno de esos errores le cuenta a un extraño algo de un recurso ajeno. El orden correcto es: resolver el recurso, comprobar que el solicitante tiene derecho sobre él, y recién después validar su estado. A quien no tiene derecho, un recurso inexistente se le responde igual que uno ajeno, con el mismo 403 o el mismo 404 (ver el comprobante de pago y los cobros).

## 4. La identidad no se toma de datos que el usuario puede cambiar o que nadie verificó

- **Google:** se exige `email_verified === true`. Una cuenta que ya tiene `google_id` no se vuelve a vincular a otra cuenta de Google con el mismo email.
- **DNI y fecha de nacimiento:** identifican a la persona; con el DNI se reusa un tutor existente. No se autoeditan: cambiarlos exige `USUARIOS_EDITAR`.
- **Reusar una cuenta existente:** se reusa solo si todos los identificadores que se cargaron (DNI y email) son de esa misma cuenta. Si no coinciden, 409.

## 5. La configuración de seguridad se valida al arrancar

Toda variable de entorno de la que depende una verificación se lee en `shared/utils/configuracion.ts` y, si falta en producción, la API no arranca. El caso que lo motivó: sin `GOOGLE_CLIENT_ID`, google-auth-library no compara la audience y acepta tokens emitidos para cualquier otra aplicación. Una variable nueva de este tipo se agrega ahí, con su test, y en `.env.example`.

Fuera de producción la API escucha en `127.0.0.1` (o en `HOST`) y `docker-compose.yml` publica los puertos solo en `127.0.0.1`: el login de desarrollo y las credenciales de la base de desarrollo no pueden quedar expuestos a la red local.

## 6. Un efecto secundario de un flujo no reabre lo que otro cerró

Activar un alumno en su primer pago pone ACTIVO a su usuario y al del tutor y les da el rol. Si eso se repite en cada pago, revierte la desactivación que hizo la propietaria. Los efectos que dan acceso (estado ACTIVO, roles) se aplican solo en la transición que les corresponde (PREINSCRIPTA → ACTIVA) y nunca de nuevo sobre algo que ya estaba activo.

## 7. Verificar y escribir pasa dentro del mismo bloqueo

Si una regla se verifica antes de una transacción y la escritura se hace en otra, entre las dos puede entrar otro pedido. Lo que tiene que valer al escribir (cupo, inscriptos de un horario, duplicados) se vuelve a comprobar dentro de la transacción que toma el `pg_advisory_xact_lock`. El conteo previo de la fachada sirve para dar un mensaje claro, no como garantía.

Las restricciones únicas de la base son la última defensa: el `errorHandler` traduce P2002 a 409 y P2025 a 404 para que una carrera no termine en un 500.

## 8. Ningún listado devuelve la tabla entera

Todo listado tiene `take` y acepta `limit` y `offset` con `paginacionSchema` de `shared/utils/esquemas-paginacion.ts` (máximo 100 por pedido). Un listado que crece con el historial (inscripciones, pagos) no puede llegar entero a una respuesta.

## 9. Un include compartido no se amplía para un solo consumidor

`INCLUIR_DATOS_INSCRIPCION` sale en todas las respuestas de inscripciones. Si otro componente necesita un dato más (por ejemplo, el `id_usuario` del alumno para el cobro), se agrega una consulta propia en la interfaz (`buscarParaCobro`), no un campo en el include compartido, que lo mandaría a todas las respuestas.

## 10. Un cambio en la matriz inicial no llega solo a una base ya cargada

La carga del catálogo aplica `MATRIZ_INICIAL` solo a los permisos nuevos, para no pisar lo que la propietaria cambió en la matriz. Si un cambio le da a un rol un permiso que ya existía (como `PLANES_VER` y `ALUMNOS_EDITAR` a la profesora), las bases ya cargadas no lo reciben y el rol sigue respondiendo 403.

- **Mientras estemos en desarrollo** (ninguna base tiene datos reales): se avisa al equipo y cada uno regenera su base con `prisma migrate reset` y los seeds (ver `DESPLIEGUE.md`). No hace falta migración.
- **Cuando Neon tenga datos reales:** el cambio va con una migración de datos que inserte en `rol_permisos` solo las filas que faltan (`ON CONFLICT DO NOTHING`), en el mismo trabajo.

Un permiso nuevo no tiene este problema: al crearlo, la carga le aplica la matriz inicial.

## Antes de dar por terminado un cambio

Para cada ruta nueva o modificada, contestar:

1. ¿Quién puede llegar? ¿El permiso se puede delegar? Si administra seguridad, ¿exige también ser propietaria?
2. Si llega alguien que no es la propietaria, ¿la operación se acota a lo suyo, tanto lo que escribe como lo que devuelve?
3. ¿Hay algún error que se resuelva antes de comprobar quién pide?
4. ¿Toma la identidad o el alcance de un dato que el usuario controla?
5. ¿Lo que verifica y lo que escribe están dentro del mismo bloqueo?
6. ¿El listado tiene tope?

Cada respuesta que encuentre un problema lleva su test de regresión en el mismo trabajo, como pide `testing.md`.
