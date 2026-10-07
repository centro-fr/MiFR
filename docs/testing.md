# MiFR – Pruebas de Integración

7 oct 2026 · @Francisco

**UNIVERSIDAD TECNOLÓGICA NACIONAL · Facultad Regional Córdoba**

MiFR — Gestión del centro de entrenamiento FR

Pruebas de Integración · Proyecto Final · Seminario Integrador 3K2

Equipo: Francisco Andrade · Leandro Andrade · Adriel Coria · Gastón Gil · Gastón Gutiérrez · Rosario Mendoza · Dante Vargas

## Índice

1. Propósito del documento
2. Alcance
3. Estrategia y ambiente de prueba
4. Datos de prueba
5. Matriz de trazabilidad
6. Casos de prueba de integración — Sprint 1
7. Tests automatizados
8. Registro de ejecución y defectos
9. Puntos a confirmar
10. Historial de cambios

## 1. Propósito del documento

Este documento define y registra las pruebas de integración de MiFR: verifica que los módulos ya construidos funcionen juntos, de punta a punta, a través de la API y la base de datos.

Las pruebas de aceptación de cada US siguen en sus fichas de la Definición del Producto. Acá se prueban los flujos que cruzan varias US, donde una falla no aparece mirando cada una por separado.

El documento crece por sprint. Esta versión cubre el Sprint 1 (22/09/2026 – 06/10/2026).

El detalle técnico (cómo está armado el código de prueba, cómo se corre y por qué se eligió cada herramienta) está en [`test-integracion.md`](test-integracion.md).

## 2. Alcance

Se integran las cuatro US del Sprint 1: autenticación, permisos, actividades y horarios.

| US | Historia | Qué aporta a la integración |
| :--- | :--- | :--- |
| US-01 | Inicio de sesión con Google Auth | Identidad del usuario y sus roles en la sesión |
| US-02 | Definición de permisos por rol | Qué endpoints y pantallas habilita cada rol |
| US-03 | Alta y administración de actividades y cupos | Actividades grupales y personalizadas con su cupo |
| US-04 | Asignación de profesoras y horarios | Cronograma semanal, sin superposiciones |

**Puntos de integración probados:** sesión de Google → roles en base de datos → middleware de permisos → endpoints de actividades y horarios → restricciones en PostgreSQL.

**Tipo de integración.** Las pruebas de integración se suelen dividir en tres tipos: de componentes (frontend), sistema-API (frontend + backend) y de servicios (backend + base de datos / terceros). Las de este documento son **de servicios, del lado de la base de datos**: el backend completo contra un PostgreSQL real, verificando tanto la respuesta HTTP como lo que queda guardado. Google, el único servicio externo, se simula. Las de componentes le corresponden al equipo de front, y las de sistema-API (punta a punta con el navegador) quedan pendientes. El detalle está en [`test-integracion.md`](test-integracion.md#qué-tipo-de-integración-es).

**Queda afuera en esta versión:**

- Alumnos, planes, pagos, asistencia y honorarios (Sprints 2 a 5).
- Pruebas unitarias. Tienen su propia suite: 669 tests con el 100% de cobertura de sentencias, ramas y funciones.
- Lo que solo pasa en la interfaz: el menú que arma el front, la redirección al login y el login de Google cancelado a mitad del proceso. Se cubrirán en las pruebas de punta a punta con el navegador.
- Pruebas de rendimiento con 15 usuarios concurrentes. Se planifican cuando exista el registro de asistencia.

## 3. Estrategia y ambiente de prueba

Las pruebas se automatizan contra la API REST real y una base PostgreSQL de prueba. Solo se simula Google, que es externo al sistema.

| Elemento | Definición |
| :--- | :--- |
| Enfoque | Incremental por sprint: cada sprint suma sus casos y vuelve a correr los anteriores (regresión) |
| Herramientas | Vitest + Supertest sobre la app Express (Node.js + TypeScript). Son las mismas que usan los tests unitarios, así que no se agregaron dependencias |
| Aplicación bajo prueba | La app real, armada con `construirDependencias` (`back/src/composicion.ts`), que es el mismo cableado que usa producción |
| Base de datos | PostgreSQL 16 de prueba, separada de desarrollo: servicio `db-test` de `docker-compose.yml`, en memoria y en el puerto 55433. Las migraciones se aplican con `prisma migrate deploy` al arrancar la suite. Antes de **cada test** se vacían todas las tablas y se vuelven a cargar los roles, los permisos y la matriz inicial |
| Protección | La suite solo corre contra una base cuyo nombre termine en `_test`. Si apunta a desarrollo o a la base publicada, falla antes de tocar nada |
| Google Auth | Se simula la verificación del token de Google Identity Services: el `id_token` que manda la prueba se toma como el correo del usuario. El resto del login (búsqueda del usuario, vínculo con Google, emisión del JWT) es el real |
| Validación | Se verifican los códigos HTTP, los códigos de error de la API y el estado final en la base |
| Ubicación del código | `back/src/__tests__/integracion/` para los flujos que cruzan componentes, y el `__tests__/` de cada componente para los que prueban uno solo. Los archivos terminan en `.integration.test.ts` y se agrupan por tema, no por caso |
| Cómo se corren | `docker compose --profile test up -d db-test` y después `pnpm --filter back test:integration` |
| Cuándo se corren | Antes de integrar cada rama de trabajo y al cierre de cada sprint, antes de la Review |

**Criterio de entrada:** las US del sprint cumplen sus pruebas de aceptación individuales.

**Criterio de salida:** todos los casos del sprint y de los sprints anteriores pasan, o sus defectos quedan registrados en la sección 8 con responsable.

## 4. Datos de prueba

### Datos que usan las pruebas automatizadas

Cada test arma su propio escenario sobre la base recién limpiada, así ningún test depende de lo que dejó otro.

| Dato | Cómo se carga |
| :--- | :--- |
| Roles, permisos y matriz inicial | Los mismos del seed de producción (`cargarCatalogoSeguridad`), antes de cada test |
| Usuarios | Los crea cada test con la fábrica `crearUsuario`, con los roles que necesita (Propietaria, Profesora, Alumno, Tutor, o varios a la vez) y el estado (activo o inactivo). Los correos son ficticios: `usuario1@example.com`, `usuario2@example.com`, … |
| Usuario sin registrar | `desconocido@example.com`, que no existe en la base |
| Actividad | "Funcional", código `FUNC`, grupal, cupo 10 (la usan los casos de alta) |

### Datos previstos para PI-04 a PI-06 (todavía no cargados)

Para los casos de actividades y horarios se propone reproducir el plantel y una parte de la grilla real del centro, para que los casos usen situaciones que la propietaria reconozca. Los correos son ficticios. **Estos datos no existen todavía en el código**: se cargarán como fábricas de prueba cuando se automaticen esos casos.

**Usuarios**

| Usuario | Correo de prueba | Roles |
| :--- | :--- | :--- |
| Flor | flor.test@mifr.dev | Propietaria + Profesora |
| Celeste | celeste.test@mifr.dev | Profesora |
| Palo | palo.test@mifr.dev | Profesora |
| Sabrina | sabrina.test@mifr.dev | Profesora |
| Alumna Test | alumna.test@mifr.dev | Alumno/Tutor |
| Sin registrar | nuevo.test@mifr.dev | Ninguno (no existe en la base) |

**Actividades**

| Actividad | Tipo | Cupo |
| :--- | :--- | :--- |
| Funcional | Grupal | Sin cupo |
| HIIT | Grupal | 15 (limitado por espacio) |
| Reto 3M | Grupal | Sin cupo |
| GAP | Grupal | Sin cupo |
| Funcional Kids | Grupal | Sin cupo |
| Posing | Grupal | Sin cupo |
| Personalizado | Personalizada | Obligatorio (valor a confirmar, ver sección 9) |

**Horarios precargados**

| Días | Hora | Profesora | Actividad |
| :--- | :--- | :--- | :--- |
| Lun a Vie | 08:00 | Celeste | Funcional |
| Lun, Mié, Vie | 14:00 | Flor | Personalizado |
| Lun, Mié, Vie | 16:00 | Flor | HIIT |
| Mar y Jue | 17:00 | Sabrina | Funcional Kids |
| Mar y Jue | 20:00 | Palo | Personalizado |
| Lun, Mié, Vie | 22:00 | Palo | Funcional |

## 5. Matriz de trazabilidad

Las cuatro US del Sprint 1 quedan cubiertas por al menos dos casos de integración cada una. La última columna indica si el caso ya está automatizado.

| Caso | Flujo | US-01 | US-02 | US-03 | US-04 | Automatizado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| PI-01 | Login con roles múltiples y permisos por rol | X | X | | | Parcial |
| PI-02 | Accesos rechazados | X | X | | | Parcial |
| PI-03 | Permisos sobre actividades y horarios | X | X | X | X | Parcial |
| PI-04 | Actividad personalizada → horario con cupo heredado | | | X | X | No |
| PI-05 | Validaciones al asignar profesora y horario | | X | | X | No |
| PI-06 | Modificación y baja de actividades con horarios | | | X | X | No |
| PI-07 | Acceso a los datos propios | X | X | | | Sí |
| PI-08 | Los cambios de permisos rigen desde el pedido siguiente | X | X | | | Sí |
| PI-09 | Carga del catálogo de seguridad | | X | | | Sí |

PI-07, PI-08 y PI-09 no estaban en la primera versión del plan. Se sumaron al automatizar, porque cubren riesgos de control de acceso que los tests unitarios no pueden ver: con mocks, los permisos nunca salen de la base.

## 6. Casos de prueba de integración — Sprint 1

Cada caso indica sus US, precondiciones, pasos y resultado esperado. Debajo de cada uno figura qué parte está automatizada y en qué test (sección 7). El resultado obtenido se registra en la sección 8.

### PI-01 — Login con roles múltiples y permisos por rol

**US:** US-01, US-02 · **Precondición:** catálogo de seguridad cargado.

1. Un usuario con rol Alumno inicia sesión con Google (token simulado).
2. Se consulta el perfil de la sesión (`GET /auth/me`).
3. Un usuario con roles Propietaria y Profesora inicia sesión y consulta el listado de usuarios.

**Resultado esperado:** el login vincula la cuenta de Google con el usuario. El perfil trae sus roles y los permisos que salen de la matriz de la base (el Alumno ve actividades y horarios, pero no usuarios). El usuario con dos roles suma los permisos de ambos. La base no guarda ninguna contraseña: el esquema no tiene columna para eso.

**Automatizado:** pasos 1 a 3 (tests A-04 y A-31). El menú lo arma el front a partir de los permisos que devuelve `/auth/me`, así que su verificación queda para las pruebas de punta a punta.

### PI-02 — Accesos rechazados

**US:** US-01, US-02 · **Precondición:** el correo usado no existe en la base.

1. Se inicia sesión con un correo no registrado.
2. Sin sesión, se llama a `GET /actividades`.
3. Se llama con un token firmado con otro secreto.
4. Se llama con el token de un usuario que después fue borrado.
5. Se llama con el token de un usuario que después fue dado de baja.

**Resultado esperado:** el correo no registrado recibe 403 con el código `USUARIO_NO_REGISTRADO` y no se abre ninguna sesión. Las llamadas sin sesión o con un token ajeno responden 401. El usuario borrado recibe 401 y el dado de baja 403, aunque su token no haya vencido.

**Automatizado:** pasos 1 a 5 (tests A-01, A-02, A-03, A-05 y A-06). Queda pendiente verificar en la base que el intento del paso 1 no crea ninguna persona. El login de Google cancelado y la redirección al login ocurren en la interfaz, y se prueban con el navegador.

### PI-03 — Permisos sobre actividades y horarios

**US:** US-01, US-02, US-03, US-04 · **Precondición:** catálogo de seguridad cargado.

1. Una profesora, un alumno y un tutor intentan crear una actividad.
2. La propietaria crea la misma actividad.
3. Cada rol consulta los listados de usuarios, matriz de permisos, actividades, horarios y profesoras.
4. Una profesora intenta modificar y dar de baja una actividad, y asignar un horario a otra profesora.

**Resultado esperado:** las escrituras de profesora, alumno y tutor responden 403 y la base queda sin cambios. La de la propietaria responde 201 y queda persistida. Actividades, horarios y profesoras responden 200 para todos los roles. Usuarios y matriz de permisos responden 200 solo para la propietaria y 403 para el resto.

**Automatizado:** pasos 1 a 3 (tests A-07 a A-30). El paso 4 queda pendiente.

### PI-04 — Actividad personalizada → horario con cupo heredado

**US:** US-03, US-04 · **Precondición:** sesión de Flor.

1. Flor intenta crear la actividad "Personalizado Tarde" de tipo personalizada sin cupo.
2. La crea con cupo 4.
3. Le asigna a Palo el horario martes y jueves a las 18:00.
4. Se consulta el horario creado.
5. Flor crea "Funcional Sábado", grupal y sin cupo, y se la asigna a Celeste el sábado a las 10:00.

**Resultado esperado:** el paso 1 falla con 400 por cupo obligatorio. El horario del paso 3 informa cupo efectivo 4: si el horario no tiene cupo propio, toma el de la actividad. La actividad grupal se crea y se asigna sin cupo.

**Automatizado:** no.

### PI-05 — Validaciones al asignar profesora y horario

**US:** US-02, US-04 · **Precondición:** Flor dicta Personalizado lunes, miércoles y viernes a las 14:00.

1. Flor intenta asignarse HIIT el lunes a las 14:00.
2. Flor intenta asignarle a Alumna Test (sin rol profesora) el horario del lunes a las 12:00.
3. Flor le asigna a Celeste el lunes a las 14:00.
4. Flor intenta asignarle a Palo una clase el martes a las 20:30, mientras dicta Personalizado de 20:00 a 21:00.

**Resultado esperado:** los pasos 1 y 4 se rechazan con 409 por superposición ("La profesora ya tiene un horario superpuesto ese día"). El paso 2 se rechaza con 404 ("Profesora no encontrada, inactiva o sin el rol PROFESORA"). El paso 3 se acepta: dos profesoras distintas pueden dictar a la misma hora.

**Automatizado:** no.

### PI-06 — Modificación y baja de actividades con horarios

**US:** US-03, US-04 · **Precondición:** HIIT tiene horarios asignados a Flor.

1. Flor cambia la descripción de HIIT.
2. Flor intenta dar de baja HIIT.
3. Flor da de baja una actividad sin horarios asociados.
4. Flor intenta cambiar HIIT de grupal a personalizada sin indicar cupo.

**Resultado esperado:** la descripción nueva se ve en todos los horarios de HIIT. La baja del paso 2 se rechaza con 409 ("La actividad tiene horarios activos: hay que darlos de baja antes que la actividad"). El paso 3 se acepta. El paso 4 se rechaza con 400 por cupo obligatorio.

**Automatizado:** no.

### PI-07 — Acceso a los datos propios

**US:** US-01, US-02 · **Precondición:** dos usuarios con rol Alumno.

1. Un alumno consulta sus propios datos.
2. Consulta los datos del otro alumno.
3. Intenta cambiar su propio estado a inactivo.

**Resultado esperado:** el paso 1 responde 200 con sus datos. El paso 2 responde 403. El paso 3 responde 403 y el estado en la base sigue en activo: cambiar el estado exige el permiso de editar usuarios, aunque sea el propio.

**Automatizado:** sí (tests A-32 a A-34).

### PI-08 — Los cambios de permisos rigen desde el pedido siguiente

**US:** US-01, US-02 · **Precondición:** sesiones abiertas de una propietaria, un alumno y una profesora.

1. Un alumno manda un token firmado con el secreto correcto, pero que dice tener el rol Propietaria.
2. La propietaria le quita a Alumno el permiso de ver actividades. El alumno, con el mismo token, consulta las actividades.
3. La propietaria le quita el rol Profesora a la profesora. Ella, con el mismo token, consulta las actividades.
4. La propietaria intenta otorgarle a Profesora el permiso de confirmar pagos.

**Resultado esperado:** el paso 1 responde 403, porque los roles se leen de la base y no del token. En los pasos 2 y 3 el cambio se guarda y el pedido siguiente responde 403, sin esperar a que venza el token. El paso 4 responde 400 con el código `PERMISO_EXCLUSIVO_PROPIETARIA` y el permiso no queda guardado.

**Automatizado:** sí (tests A-35 a A-38).

### PI-09 — Carga del catálogo de seguridad

**US:** US-02 · **Precondición:** catálogo de seguridad cargado.

1. Se le quita a Alumno el permiso de ver actividades y se vuelve a correr la carga del catálogo.
2. Se le quita a la propietaria el permiso de editar usuarios y se vuelve a correr la carga.
3. Se vuelve a correr la carga sin cambios.

**Resultado esperado:** la carga no repone el permiso quitado a Alumno, porque respeta lo que decidió la propietaria. Sí repone el de la propietaria, porque es un permiso crítico. Volver a correrla no duplica roles, permisos ni asignaciones.

**Automatizado:** sí (tests C-01 a C-03).

## 7. Tests automatizados

41 tests en dos archivos. Los códigos (A-xx, C-xx) son de este documento, para poder citarlos. En el código, cada test se identifica por su nombre.

### `back/src/__tests__/integracion/control-de-acceso.integration.test.ts` (38 tests)

**Autenticación**

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-01 | rechaza con 401 un pedido sin token | PI-02 |
| A-02 | rechaza con 401 un token firmado con otro secreto | PI-02 |
| A-03 | no deja iniciar sesión a quien no fue dado de alta | PI-02 |
| A-04 | el login vincula la cuenta de Google y /auth/me devuelve los permisos de la base | PI-01 |
| A-05 | rechaza con 401 el token de un usuario que ya no existe | PI-02 |
| A-06 | rechaza con 403 a un usuario dado de baja aunque su token siga vigente | PI-02 |

**Permisos de lectura según la matriz inicial** (un test por cada combinación de ruta y rol)

| Código | Ruta | Propietaria | Profesora | Alumno | Tutor | Caso |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| A-07 a A-10 | `GET /api/v1/usuarios` | 200 | 403 | 403 | 403 | PI-03 |
| A-11 a A-14 | `GET /api/v1/seguridad/matriz` | 200 | 403 | 403 | 403 | PI-03 |
| A-15 a A-18 | `GET /api/v1/actividades` | 200 | 200 | 200 | 200 | PI-03 |
| A-19 a A-22 | `GET /api/v1/horarios` | 200 | 200 | 200 | 200 | PI-03 |
| A-23 a A-26 | `GET /api/v1/profesoras` | 200 | 200 | 200 | 200 | PI-03 |

Cada test se llama "GET *ruta* con el rol *rol* responde *código*".

**Escrituras reservadas a la propietaria**

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-27 | la propietaria crea una actividad | PI-03 |
| A-28 | PROFESORA no puede crear actividades y no queda nada guardado | PI-03 |
| A-29 | ALUMNO no puede crear actividades y no queda nada guardado | PI-03 |
| A-30 | TUTOR no puede crear actividades y no queda nada guardado | PI-03 |
| A-31 | un usuario con varios roles suma los permisos de todos | PI-01 |

**Datos propios**

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-32 | un alumno ve sus propios datos | PI-07 |
| A-33 | un alumno no ve los datos de otro usuario | PI-07 |
| A-34 | un alumno no puede reactivarse ni darse de baja a sí mismo | PI-07 |

**Los permisos se releen de la base en cada pedido**

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-35 | los roles que dice el token no cuentan: decide la base | PI-08 |
| A-36 | un permiso quitado en la matriz deja de valer con el mismo token | PI-08 |
| A-37 | un rol quitado deja de valer con el mismo token | PI-08 |
| A-38 | la matriz no deja otorgar a otro rol un permiso exclusivo de la propietaria | PI-08 |

### `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts` (3 tests)

| Código | Test | Caso |
| :--- | :--- | :--- |
| C-01 | volver a correrlo no pisa un permiso que la propietaria quitó de la matriz | PI-09 |
| C-02 | volver a correrlo repone los permisos críticos de la propietaria | PI-09 |
| C-03 | volver a correrlo no duplica roles ni permisos | PI-09 |

### Cómo se comprobó que las pruebas detectan fallas

Se rompió a propósito el middleware `requierePermiso` para que dejara pasar cualquier pedido: fallaron 8 tests (A-08 a A-10, A-33 a A-37). Los demás siguieron en verde porque esas rutas tienen una segunda barrera, `requiereRol("PROPIETARIA")`. Después se restauró el middleware.

También se apuntó la suite a la base de desarrollo (`mifr`): se negó a correr, sin tocar ningún dato.

## 8. Registro de ejecución y defectos

| Caso | Fecha de ejecución | Ejecutó | Resultado | Resultado obtenido / observaciones |
| :--- | :--- | :--- | :--- | :--- |
| PI-01 | 07/10/2026 | Francisco Andrade | Aprobado (parcial) | A-04 y A-31 pasan. Falta el menú, que se verifica con el navegador |
| PI-02 | 07/10/2026 | Francisco Andrade | Aprobado (parcial) | A-01, A-02, A-03, A-05 y A-06 pasan. Falta verificar que no se cree ninguna persona y el login cancelado |
| PI-03 | 07/10/2026 | Francisco Andrade | Aprobado (parcial) | A-07 a A-30 pasan. Falta el paso 4 (modificar, dar de baja, asignar horario) |
| PI-04 | | | Pendiente | Sin automatizar |
| PI-05 | | | Pendiente | Sin automatizar |
| PI-06 | | | Pendiente | Sin automatizar |
| PI-07 | 07/10/2026 | Francisco Andrade | Aprobado | A-32 a A-34 pasan |
| PI-08 | 07/10/2026 | Francisco Andrade | Aprobado | A-35 a A-38 pasan |
| PI-09 | 07/10/2026 | Francisco Andrade | Aprobado | C-01 a C-03 pasan |

Corrida del 07/10/2026: 41 tests de integración aprobados de 41, en unos 4,4 segundos de ejecución. En la misma corrida pasaron los 669 tests unitarios.

### Defectos detectados

| ID | Caso | Descripción | Severidad | Responsable | Corregido en |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | — | Sin defectos en la corrida del 07/10/2026 | — | — | — |

## 9. Puntos a confirmar

- **Baja de una actividad con horarios activos (PI-06):** ya no es un supuesto. El backend implementa el rechazo (US-03 / CA-03): responde 409 y pide dar de baja los horarios primero. Falta confirmarlo con la propietaria; si prefiere la alternativa (dar de baja la actividad y desasignar sus horarios), es un cambio de regla.
- **Cupo de las clases personalizadas (datos de prueba):** la encuesta dice que están llenas, pero no da el número por profesora.
- **Cupo de HIIT:** se cargó 15, el pico de alumnos del horario más cargado. Hay que confirmar si es el cupo real del espacio.

## 10. Historial de cambios

| Versión | Fecha | Autor | Cambios |
| :--- | :--- | :--- | :--- |
| 1.0 | 07/10/2026 | Francisco Andrade | Plan de pruebas de integración del Sprint 1: casos PI-01 a PI-06 |
| 1.1 | 07/10/2026 | Francisco Andrade | Estrategia ajustada a lo implementado (Vitest, base `db-test`, migraciones con `migrate deploy`). Casos PI-07 a PI-09. Listado de tests automatizados y primera corrida registrada |
