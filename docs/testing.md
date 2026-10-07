# MiFR – Pruebas de Integración

7 oct 2026 · @Francisco

UNIVERSIDAD TECNOLÓGICA NACIONAL · Facultad Regional Córdoba

MiFR — Gestión del centro de entrenamiento FR

Pruebas de Integración · Proyecto Final · Seminario Integrador 3K2

Equipo: Francisco Andrade · Leandro Andrade · Adriel Coria · Gastón Gil · Gastón Gutiérrez · Rosario Mendoza · Dante Vargas

## Índice

1. Propósito del documento
2. Alcance general
3. Estrategia y ambiente de prueba
4. Datos de prueba comunes
5. Matriz de trazabilidad
6. Pruebas por sprint
   - 6.1 Sprint 1 — Autenticación, Accesos y Configuración Base
   - 6.2 Sprint 2 — Gestión Comercial y Ciclo de Vida del Alumno
   - 6.3 Sprint 3 — Núcleo Transaccional y Operación Diaria
   - 6.4 Sprint 4 — Control Administrativo, Finanzas y Retención
   - 6.5 Sprint 5 — Autogestión, Portal, Analítica y Fidelización
7. Registro de corridas y defectos
8. Puntos a confirmar
9. Cómo sumar un sprint
10. Historial de cambios

## 1. Propósito del documento

Este documento define y registra las pruebas de integración de MiFR: verifica que los módulos ya construidos funcionen juntos, de punta a punta, a través de la API y la base de datos.

Las pruebas de aceptación de cada US siguen en sus fichas de la Definición del Producto. Acá se prueban los flujos que cruzan varias US, donde una falla no aparece mirando cada una por separado.

El documento crece por sprint. Las secciones 1 a 5 y 7 a 10 son comunes a todo el proyecto; cada sprint suma su propia sección dentro de la 6, con sus casos, sus datos, sus tests y su registro de ejecución. Los sprints siguen el Story Map del documento Sprint 0.

El detalle técnico (cómo está armado el código de prueba, cómo se corre y por qué se eligió cada herramienta) está en [`test-integracion.md`](test-integracion.md).

## 2. Alcance general

### Sprints

Cada sprint dura dos semanas. Las fechas de los Sprints 2 a 5 son estimadas a partir del cierre del Sprint 1 y se ajustan en cada Sprint Planning.

| Sprint | Nombre | Fechas | US | Estado de las pruebas |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Autenticación, Accesos y Configuración Base | 22/09/2026 – 06/10/2026 | US-01 a US-04 | En ejecución: 6 de 9 casos automatizados, total o parcialmente |
| 2 | Gestión Comercial y Ciclo de Vida del Alumno | 07/10/2026 – 20/10/2026 (estimadas) | US-05 a US-12 | Sin casos definidos |
| 3 | Núcleo Transaccional y Operación Diaria | 21/10/2026 – 03/11/2026 (estimadas) | US-15 a US-18, US-20, US-21 | Sin casos definidos |
| 4 | Control Administrativo, Finanzas y Retención | 04/11/2026 – 17/11/2026 (estimadas) | US-13, US-19, US-22 a US-26 | Sin casos definidos |
| 5 | Autogestión, Portal, Analítica y Fidelización | 18/11/2026 – 01/12/2026 (estimadas) | US-14, US-27 a US-37 | Sin casos definidos |

### Tipo de integración

Las pruebas de integración se suelen dividir en tres tipos: de componentes (frontend), sistema-API (frontend + backend) y de servicios (backend + base de datos / terceros). Las de este documento son **de servicios, del lado de la base de datos**: el backend completo contra un PostgreSQL real, verificando tanto la respuesta HTTP como lo que queda guardado. Los servicios externos se simulan; hoy el único es Google. Las de componentes le corresponden al equipo de front, y las de sistema-API (punta a punta con el navegador) quedan pendientes. El detalle está en [`test-integracion.md`](test-integracion.md#qué-tipo-de-integración-es).

### Fuera de alcance en todos los sprints

- **Pruebas unitarias.** Tienen su propia suite, con el 100% de cobertura de sentencias, ramas y funciones.
- **Lo que solo pasa en la interfaz:** menús, redirecciones y diálogos de Google. Se cubren en las pruebas de punta a punta con el navegador.
- **Servicios externos reales.** Se prueban contra simulaciones. Si un sprint suma una integración con un tercero (por ejemplo, una pasarela de pagos), se prueba contra el entorno de pruebas (*sandbox*) del proveedor, en una suite aparte.
- **Pruebas de rendimiento** con 15 usuarios concurrentes. Se planifican cuando exista el registro de asistencia (Sprint 3).

## 3. Estrategia y ambiente de prueba

Las pruebas se automatizan contra la API REST real y una base PostgreSQL de prueba. Solo se simulan los servicios externos al sistema.

| Elemento | Definición |
| :--- | :--- |
| Enfoque | Incremental por sprint: cada sprint suma sus casos y vuelve a correr los de todos los sprints anteriores (regresión) |
| Herramientas | Vitest + Supertest sobre la app Express (Node.js + TypeScript). Son las mismas que usan los tests unitarios, así que no se agregaron dependencias |
| Aplicación bajo prueba | La app real, armada con `construirDependencias` (`back/src/composicion.ts`), que es el mismo cableado que usa producción |
| Base de datos | PostgreSQL 16 de prueba, separada de desarrollo: servicio `db-test` de `docker-compose.yml`, en memoria y en el puerto 55433. Las migraciones se aplican con `prisma migrate deploy` al arrancar la suite. Antes de **cada test** se vacían todas las tablas y se vuelven a cargar los roles, los permisos y la matriz inicial |
| Protección | La suite solo corre contra una base cuyo nombre termine en `_test`. Si apunta a desarrollo o a la base publicada, falla antes de tocar nada |
| Google Auth | Se simula la verificación del token de Google Identity Services: el `id_token` que manda la prueba se toma como el correo del usuario. El resto del login (búsqueda del usuario, vínculo con Google, emisión del JWT) es el real |
| Validación | Se verifican los códigos HTTP, los códigos de error de la API y el estado final en la base |
| Ubicación del código | `back/src/__tests__/integracion/` para los flujos que cruzan componentes, y el `__tests__/` de cada componente para los que prueban uno solo. Los archivos terminan en `.integration.test.ts` y se agrupan por tema, no por caso |
| Cómo se corren | `docker compose --profile test up -d db-test` y después `pnpm --filter back test:integration`. Se corre siempre la suite completa, así cada corrida es también la regresión de los sprints anteriores |
| Cuándo se corren | Antes de integrar cada rama de trabajo y al cierre de cada sprint, antes de la Review |

**Criterio de entrada:** las US del sprint cumplen sus pruebas de aceptación individuales.

**Criterio de salida:** todos los casos del sprint y de los sprints anteriores pasan, o sus defectos quedan registrados en la sección 7 con responsable.

### Convenciones

- **Casos:** `PI-xx`, con numeración correlativa en todo el proyecto. Un sprint nuevo sigue desde el último número usado, así un caso conserva su código aunque se mueva de sprint.
- **Tests automatizados:** cada archivo de tests tiene un prefijo de una letra (A, C, …) y sus tests se numeran dentro de ese prefijo (A-01, A-02, …). Los códigos son de este documento, para poder citarlos; en el código cada test se identifica por su nombre.
- **Estado de automatización** de un caso: *Sí* (todos sus pasos tienen test), *Parcial* (algunos), *No* (ninguno) o *Manual* (se verifica a mano o con el navegador, por diseño).

## 4. Datos de prueba comunes

Cada test arma su propio escenario sobre la base recién limpiada, así ningún test depende de lo que dejó otro. Estas piezas las usan todos los sprints; los datos propios de cada sprint van en su sección.

| Dato | Cómo se carga |
| :--- | :--- |
| Roles, permisos y matriz inicial | Los mismos del seed de producción (`cargarCatalogoSeguridad`), antes de cada test |
| Usuarios | Fábrica `crearUsuario` (`back/src/__tests__/integracion/fabricas.ts`), con los roles que necesita cada test (Propietaria, Profesora, Alumno, Tutor, o varios a la vez) y el estado (activo o inactivo). Los correos son ficticios: `usuario1@example.com`, `usuario2@example.com`, … |
| Sesión | `entorno.iniciarSesion(correo)`, que pasa por el login real con Google simulado |

Cuando un sprint necesita entidades nuevas (alumnos, planes, pagos), suma su fábrica al mismo archivo, para que los sprints siguientes la reutilicen.

## 5. Matriz de trazabilidad

Cada US del sprint en curso tiene que quedar cubierta por al menos dos casos de integración. Las US de sprints futuros figuran para que la matriz se complete a medida que avanza el proyecto.

| US | Historia | Sprint | Casos | Automatización |
| :--- | :--- | :---: | :--- | :--- |
| US-01 | Inicio de sesión con Google Auth | 1 | PI-01, PI-02, PI-03, PI-07, PI-08 | Parcial |
| US-02 | Definición de permisos por rol | 1 | PI-01, PI-02, PI-03, PI-05, PI-07, PI-08, PI-09 | Parcial |
| US-03 | Alta y administración de actividades y cupos | 1 | PI-03, PI-04, PI-06 | Parcial |
| US-04 | Asignación de profesoras y horarios a actividades | 1 | PI-03, PI-04, PI-05, PI-06 | Parcial |
| US-05 | Pre-inscripción de alumno nuevo | 2 | | |
| US-06 | Asociación de tutor a alumno menor de edad | 2 | | |
| US-07 | Alta definitiva al confirmarse el primer pago | 2 | | |
| US-08 | Baja lógica de alumno | 2 | | |
| US-09 | Modificación de datos de alumno | 2 | | |
| US-10 | Consulta y búsqueda de alumnos | 2 | | |
| US-11 | Alta y edición de planes vigentes | 2 | | |
| US-12 | Actualización de precios con fecha de vigencia | 2 | | |
| US-13 | Alta de descuentos y promociones temporales | 4 | | |
| US-14 | Renovación o cambio de plan | 5 | | |
| US-15 | Registro de cobro en efectivo | 3 | | |
| US-16 | Registro de pago por transferencia con comprobante | 3 | | |
| US-17 | Aprobación o rechazo de transferencias | 3 | | |
| US-18 | Cálculo del estado de habilitación del alumno | 3 | | |
| US-19 | Control de efectivo pendiente de rendición | 4 | | |
| US-20 | Registro de asistencia por clase | 3 | | |
| US-21 | Registro automático de inasistencias | 3 | | |
| US-22 | Detección de alumnos inactivos con cuota al día | 4 | | |
| US-23 | Informe mensual automático de honorarios | 4 | | |
| US-24 | Registro de suplencias entre profesoras | 4 | | |
| US-25 | Aviso automático de vencimiento de cuota | 4 | | |
| US-26 | Resumen diario para la propietaria | 4 | | |
| US-27 | Carga de rutina y evolución física | 5 | | |
| US-28 | Consulta de rutina y progreso físico | 5 | | |
| US-29 | Consulta de estado de plan, asistencias y próximas clases | 5 | | |
| US-30 | Ranking de asistencia entre alumnos | 5 | | |
| US-31 | Insignias y racha de asistencia | 5 | | |
| US-32 | Panel público de disponibilidad | 5 | | |
| US-33 | Informe de asistencia | 5 | | |
| US-34 | Informe de cuotas vencidas | 5 | | |
| US-35 | Reportes de inscriptos por mes | 5 | | |
| US-36 | Reportes de planes más elegidos | 5 | | |
| US-37 | Mapa de calor de ocupación de horarios | 5 | | |

## 6. Pruebas por sprint

### 6.1 Sprint 1 — Autenticación, Accesos y Configuración Base

22/09/2026 – 06/10/2026 · US-01, US-02, US-03, US-04

#### Alcance

| US | Historia | Qué aporta a la integración |
| :--- | :--- | :--- |
| US-01 | Inicio de sesión con Google Auth | Identidad del usuario y sus roles en la sesión |
| US-02 | Definición de permisos por rol | Qué endpoints y pantallas habilita cada rol |
| US-03 | Alta y administración de actividades y cupos | Actividades grupales y personalizadas con su cupo |
| US-04 | Asignación de profesoras y horarios | Cronograma semanal, sin superposiciones |

#### Puntos de integración

Sesión de Google → roles en base de datos → middleware de permisos → endpoints de actividades y horarios → restricciones en PostgreSQL.

#### Casos del sprint

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

#### Datos de prueba del sprint

Los casos ya automatizados (PI-01 a PI-03 y PI-07 a PI-09) usan los datos comunes de la sección 4, más una actividad "Funcional" (código `FUNC`, grupal, cupo 10) para los casos de alta.

PI-04 a PI-06 usan los datos que ya están cargados en el seed de desarrollo (`back/prisma/seed-demo.ts`, que se corre con `pnpm --filter back db:seed:demo`). Así, el mismo escenario se puede recorrer a mano en Swagger o en el front y verificar en los tests automatizados. Para automatizarlos, la carga de esos datos se extraerá a una función reutilizable, como se hizo con el catálogo de seguridad, y cada test la correrá sobre la base de prueba. Los correos son ficticios.

Usuarios (los tres tienen además su registro de profesora):

| Usuario | Correo | Roles | Especialidad |
| :--- | :--- | :--- | :--- |
| Marina Sosa | `marina.sosa@example.com` | Propietaria + Profesora | Entrenamiento personalizado |
| Lucía Gómez | `lucia.gomez@example.com` | Profesora | Entrenamiento funcional |
| Carla Ruiz | `carla.ruiz@example.com` | Profesora | Pilates |

El seed no carga alumnos ni tutores: los casos que los necesiten los crean con la fábrica `crearUsuario` de la sección 4.

Actividades:

| Actividad | Código | Modalidad | Cupo |
| :--- | :--- | :--- | :--- |
| Funcional Grupal | `FUNCIONAL` | Grupal | Sin cupo |
| Pilates Reformer | `PILATES_REF` | Personalizada | 4 |

Horarios:

| Día | Hora | Profesora | Actividad | Cupo del horario |
| :--- | :--- | :--- | :--- | :--- |
| Lunes | 18:00 – 19:00 | Lucía Gómez | Funcional Grupal | Sin cupo propio |
| Martes | 09:00 – 10:00 | Carla Ruiz | Pilates Reformer | Sin cupo propio (toma 4 de la actividad) |
| Miércoles | 18:00 – 19:00 | Lucía Gómez | Funcional Grupal | Sin cupo propio |
| Jueves | 09:00 – 10:00 | Carla Ruiz | Pilates Reformer | Sin cupo propio (toma 4 de la actividad) |
| Viernes | 19:00 – 20:00 | Marina Sosa | Funcional Grupal | 12, propio del horario (CA-07) |

#### PI-01 — Login con roles múltiples y permisos por rol

**US:** US-01, US-02 · **Precondición:** catálogo de seguridad cargado.

1. Un usuario con rol Alumno inicia sesión con Google (token simulado).
2. Se consulta el perfil de la sesión (`GET /auth/me`).
3. Un usuario con roles Propietaria y Profesora inicia sesión y consulta el listado de usuarios.

**Resultado esperado:** el login vincula la cuenta de Google con el usuario. El perfil trae sus roles y los permisos que salen de la matriz de la base (el Alumno ve actividades y horarios, pero no usuarios). El usuario con dos roles suma los permisos de ambos. La base no guarda ninguna contraseña: el esquema no tiene columna para eso.

**Automatizado:** Parcial. Pasos 1 a 3 (tests A-04 y A-31). El menú lo arma el front a partir de los permisos que devuelve `/auth/me`, así que su verificación es Manual y queda para las pruebas de punta a punta.

#### PI-02 — Accesos rechazados

**US:** US-01, US-02 · **Precondición:** el correo usado no existe en la base.

1. Se inicia sesión con un correo no registrado.
2. Sin sesión, se llama a `GET /actividades`.
3. Se llama con un token firmado con otro secreto.
4. Se llama con el token de un usuario que después fue borrado.
5. Se llama con el token de un usuario que después fue dado de baja.

**Resultado esperado:** el correo no registrado recibe 403 con el código `USUARIO_NO_REGISTRADO` y no se abre ninguna sesión. Las llamadas sin sesión o con un token ajeno responden 401. El usuario borrado recibe 401 y el dado de baja 403, aunque su token no haya vencido.

**Automatizado:** Parcial. Pasos 1 a 5 (tests A-01, A-02, A-03, A-05 y A-06). Falta verificar en la base que el intento del paso 1 no crea ninguna persona. El login de Google cancelado y la redirección al login ocurren en la interfaz (Manual).

#### PI-03 — Permisos sobre actividades y horarios

**US:** US-01, US-02, US-03, US-04 · **Precondición:** catálogo de seguridad cargado.

1. Una profesora, un alumno y un tutor intentan crear una actividad.
2. La propietaria crea la misma actividad.
3. Cada rol consulta los listados de usuarios, matriz de permisos, actividades, horarios y profesoras.
4. Una profesora intenta modificar y dar de baja una actividad, y asignar un horario a otra profesora.

**Resultado esperado:** las escrituras de profesora, alumno y tutor responden 403 y la base queda sin cambios. La de la propietaria responde 201 y queda persistida. Actividades, horarios y profesoras responden 200 para todos los roles. Usuarios y matriz de permisos responden 200 solo para la propietaria y 403 para el resto.

**Automatizado:** Parcial. Pasos 1 a 3 (tests A-07 a A-30). Falta el paso 4.

#### PI-04 — Actividad personalizada → horario con cupo heredado

**US:** US-03, US-04 · **Precondición:** seed de desarrollo cargado; sesión de Marina.

1. Marina intenta crear la actividad "Pilates Mat" (código `PILATES_MAT`), personalizada y sin cupo.
2. La crea con cupo 3.
3. Le asigna a Carla el horario de Pilates Mat del lunes de 09:00 a 10:00, sin cupo propio.
4. Se consultan los horarios.
5. Marina crea "Funcional Sábado", grupal y sin cupo, y se la asigna a Lucía el sábado de 10:00 a 11:00.

**Resultado esperado:** el paso 1 falla con 400 por cupo obligatorio. En el paso 4, el horario nuevo de Carla informa cupo efectivo 3 y los de Pilates Reformer de martes y jueves informan 4: si el horario no tiene cupo propio, toma el de la actividad. El de Funcional Grupal del viernes de Marina informa 12, porque su cupo propio manda sobre el de la actividad. La actividad grupal del paso 5 se crea y se asigna sin cupo.

**Automatizado:** No.

#### PI-05 — Validaciones al asignar profesora y horario

**US:** US-02, US-04 · **Precondición:** seed de desarrollo cargado; sesión de Marina. Lucía dicta Funcional Grupal lunes y miércoles de 18:00 a 19:00, y Marina el viernes de 19:00 a 20:00.

1. Marina intenta asignarle a Lucía Pilates Reformer el lunes de 18:30 a 19:30.
2. Marina se asigna a sí misma Funcional Grupal el lunes de 18:00 a 19:00.
3. Marina intenta asignarse una clase el viernes de 19:30 a 20:30.
4. Marina intenta crear un horario que termina antes de empezar (de 10:00 a 09:00).
5. Marina le quita a Carla el rol Profesora e intenta asignarle Pilates Reformer el viernes de 09:00 a 10:00.

**Resultado esperado:** los pasos 1 y 3 se rechazan con 409 por superposición ("La profesora ya tiene un horario superpuesto ese día"). El paso 2 se acepta: dos profesoras distintas pueden dictar a la misma hora. El paso 4 se rechaza con 400. El paso 5 se rechaza con 404 ("Profesora no encontrada, inactiva o sin el rol PROFESORA"). Ninguno de los rechazos deja un horario guardado.

**Automatizado:** No.

#### PI-06 — Modificación y baja de actividades con horarios

**US:** US-03, US-04 · **Precondición:** seed de desarrollo cargado; sesión de Marina. Funcional Grupal tiene horarios activos (Lucía lunes y miércoles, Marina viernes).

1. Marina cambia la descripción de Funcional Grupal.
2. Marina intenta dar de baja Funcional Grupal.
3. Marina crea una actividad nueva, sin horarios, y la da de baja.
4. Marina intenta cambiar Funcional Grupal de grupal a personalizada sin indicar cupo.

**Resultado esperado:** la descripción nueva se ve en los tres horarios de Funcional Grupal. La baja del paso 2 se rechaza con 409 ("La actividad tiene horarios activos: hay que darlos de baja antes que la actividad") y la actividad sigue activa. El paso 3 se acepta. El paso 4 se rechaza con 400 por cupo obligatorio.

**Automatizado:** No.

#### PI-07 — Acceso a los datos propios

**US:** US-01, US-02 · **Precondición:** dos usuarios con rol Alumno.

1. Un alumno consulta sus propios datos.
2. Consulta los datos del otro alumno.
3. Intenta cambiar su propio estado a inactivo.

**Resultado esperado:** el paso 1 responde 200 con sus datos. El paso 2 responde 403. El paso 3 responde 403 y el estado en la base sigue en activo: cambiar el estado exige el permiso de editar usuarios, aunque sea el propio.

**Automatizado:** Sí (tests A-32 a A-34).

#### PI-08 — Los cambios de permisos rigen desde el pedido siguiente

**US:** US-01, US-02 · **Precondición:** sesiones abiertas de una propietaria, un alumno y una profesora.

1. Un alumno manda un token firmado con el secreto correcto, pero que dice tener el rol Propietaria.
2. La propietaria le quita a Alumno el permiso de ver actividades. El alumno, con el mismo token, consulta las actividades.
3. La propietaria le quita el rol Profesora a la profesora. Ella, con el mismo token, consulta las actividades.
4. La propietaria intenta otorgarle a Profesora el permiso de confirmar pagos.

**Resultado esperado:** el paso 1 responde 403, porque los roles se leen de la base y no del token. En los pasos 2 y 3 el cambio se guarda y el pedido siguiente responde 403, sin esperar a que venza el token. El paso 4 responde 400 con el código `PERMISO_EXCLUSIVO_PROPIETARIA` y el permiso no queda guardado.

**Automatizado:** Sí (tests A-35 a A-38).

#### PI-09 — Carga del catálogo de seguridad

**US:** US-02 · **Precondición:** catálogo de seguridad cargado.

1. Se le quita a Alumno el permiso de ver actividades y se vuelve a correr la carga del catálogo.
2. Se le quita a la propietaria el permiso de editar usuarios y se vuelve a correr la carga.
3. Se vuelve a correr la carga sin cambios.

**Resultado esperado:** la carga no repone el permiso quitado a Alumno, porque respeta lo que decidió la propietaria. Sí repone el de la propietaria, porque es un permiso crítico. Volver a correrla no duplica roles, permisos ni asignaciones.

**Automatizado:** Sí (tests C-01 a C-03).

#### Tests automatizados del sprint

41 tests en dos archivos.

##### Archivo A: `back/src/__tests__/integracion/control-de-acceso.integration.test.ts` (38 tests)

Autenticación:

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-01 | rechaza con 401 un pedido sin token | PI-02 |
| A-02 | rechaza con 401 un token firmado con otro secreto | PI-02 |
| A-03 | no deja iniciar sesión a quien no fue dado de alta | PI-02 |
| A-04 | el login vincula la cuenta de Google y /auth/me devuelve los permisos de la base | PI-01 |
| A-05 | rechaza con 401 el token de un usuario que ya no existe | PI-02 |
| A-06 | rechaza con 403 a un usuario dado de baja aunque su token siga vigente | PI-02 |

Permisos de lectura según la matriz inicial. Hay un test por cada combinación de ruta y rol, y cada uno se llama "GET *ruta* con el rol *rol* responde *código*":

| Código | Ruta | Propietaria | Profesora | Alumno | Tutor | Caso |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| A-07 a A-10 | `GET /api/v1/usuarios` | 200 | 403 | 403 | 403 | PI-03 |
| A-11 a A-14 | `GET /api/v1/seguridad/matriz` | 200 | 403 | 403 | 403 | PI-03 |
| A-15 a A-18 | `GET /api/v1/actividades` | 200 | 200 | 200 | 200 | PI-03 |
| A-19 a A-22 | `GET /api/v1/horarios` | 200 | 200 | 200 | 200 | PI-03 |
| A-23 a A-26 | `GET /api/v1/profesoras` | 200 | 200 | 200 | 200 | PI-03 |

Escrituras reservadas a la propietaria:

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-27 | la propietaria crea una actividad | PI-03 |
| A-28 | PROFESORA no puede crear actividades y no queda nada guardado | PI-03 |
| A-29 | ALUMNO no puede crear actividades y no queda nada guardado | PI-03 |
| A-30 | TUTOR no puede crear actividades y no queda nada guardado | PI-03 |
| A-31 | un usuario con varios roles suma los permisos de todos | PI-01 |

Datos propios:

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-32 | un alumno ve sus propios datos | PI-07 |
| A-33 | un alumno no ve los datos de otro usuario | PI-07 |
| A-34 | un alumno no puede reactivarse ni darse de baja a sí mismo | PI-07 |

Los permisos se releen de la base en cada pedido:

| Código | Test | Caso |
| :--- | :--- | :--- |
| A-35 | los roles que dice el token no cuentan: decide la base | PI-08 |
| A-36 | un permiso quitado en la matriz deja de valer con el mismo token | PI-08 |
| A-37 | un rol quitado deja de valer con el mismo token | PI-08 |
| A-38 | la matriz no deja otorgar a otro rol un permiso exclusivo de la propietaria | PI-08 |

##### Archivo C: `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts` (3 tests)

| Código | Test | Caso |
| :--- | :--- | :--- |
| C-01 | volver a correrlo no pisa un permiso que la propietaria quitó de la matriz | PI-09 |
| C-02 | volver a correrlo repone los permisos críticos de la propietaria | PI-09 |
| C-03 | volver a correrlo no duplica roles ni permisos | PI-09 |

##### Cómo se comprobó que las pruebas detectan fallas

Se rompió a propósito el middleware `requierePermiso` para que dejara pasar cualquier pedido: fallaron 8 tests (A-08 a A-10, A-33 a A-37). Los demás siguieron en verde porque esas rutas tienen una segunda barrera, `requiereRol("PROPIETARIA")`. Después se restauró el middleware.

También se apuntó la suite a la base de desarrollo (`mifr`): se negó a correr, sin tocar ningún dato.

#### Registro de ejecución del sprint

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

#### Pendientes del sprint

- Automatizar PI-04, PI-05 y PI-06, cargando en la base de prueba los datos del seed de desarrollo.
- Completar PI-02 (que el login rechazado no cree ninguna persona) y PI-03 (paso 4).

### 6.2 Sprint 2 — Gestión Comercial y Ciclo de Vida del Alumno

07/10/2026 – 20/10/2026 (estimadas) · US-05 a US-12

#### Alcance

| US | Historia |
| :--- | :--- |
| US-05 | Pre-inscripción de alumno nuevo |
| US-06 | Asociación de tutor a alumno menor de edad |
| US-07 | Alta definitiva al confirmarse el primer pago |
| US-08 | Baja lógica de alumno |
| US-09 | Modificación de datos de alumno |
| US-10 | Consulta y búsqueda de alumnos |
| US-11 | Alta y edición de planes vigentes |
| US-12 | Actualización de precios con fecha de vigencia |

#### Puntos de integración a cubrir

Borrador, a refinar en el Sprint Planning:

- Planes con actividades, profesoras y horarios del Sprint 1: un plan personalizado respeta el cupo máximo de su actividad.
- Pre-inscripción → usuario con rol Alumno → login del Sprint 1 (no hay auto-registro).
- Tutor y alumno menor: el tutor ve lo del menor y nada más.
- Alta definitiva atada al primer pago, que llega en el Sprint 3: hasta entonces la inscripción queda como preinscripta.
- Baja lógica del alumno y su efecto en la baja de horarios y actividades (punto pendiente del Sprint 1, ver sección 8).
- Regresión: los casos PI-01 a PI-09.

#### Casos del sprint

Sin definir. Se numeran desde PI-10.

#### Datos de prueba del sprint

Sin definir.

#### Tests automatizados del sprint

Sin tests.

#### Registro de ejecución del sprint

Sin corridas.

### 6.3 Sprint 3 — Núcleo Transaccional y Operación Diaria

21/10/2026 – 03/11/2026 (estimadas) · US-15, US-16, US-17, US-18, US-20, US-21

#### Alcance

| US | Historia |
| :--- | :--- |
| US-15 | Registro de cobro en efectivo |
| US-16 | Registro de pago por transferencia con comprobante |
| US-17 | Aprobación o rechazo de transferencias |
| US-18 | Cálculo del estado de habilitación del alumno |
| US-20 | Registro de asistencia por clase |
| US-21 | Registro automático de inasistencias |

#### Puntos de integración a cubrir

Borrador, a refinar en el Sprint Planning:

- Primer pago confirmado → alta definitiva de la inscripción (US-07 del Sprint 2).
- Solo la propietaria confirma o rechaza transferencias (permisos del Sprint 1).
- Estado de habilitación del alumno según el tipo de plan (Sprint 2) y sus pagos.
- Asistencia sobre las clases que salen de los horarios del Sprint 1, y solo de alumnos inscriptos.
- Primera planificación de las pruebas de rendimiento con 15 usuarios concurrentes.
- Regresión: los casos de los Sprints 1 y 2.

#### Casos del sprint

Sin definir.

#### Datos de prueba del sprint

Sin definir.

#### Tests automatizados del sprint

Sin tests.

#### Registro de ejecución del sprint

Sin corridas.

### 6.4 Sprint 4 — Control Administrativo, Finanzas y Retención

04/11/2026 – 17/11/2026 (estimadas) · US-13, US-19, US-22, US-23, US-24, US-25, US-26

#### Alcance

| US | Historia |
| :--- | :--- |
| US-13 | Alta de descuentos y promociones temporales |
| US-19 | Control de efectivo pendiente de rendición |
| US-22 | Detección de alumnos inactivos con cuota al día |
| US-23 | Informe mensual automático de honorarios |
| US-24 | Registro de suplencias entre profesoras |
| US-25 | Aviso automático de vencimiento de cuota |
| US-26 | Resumen diario para la propietaria |

#### Puntos de integración a cubrir

Borrador, a refinar en el Sprint Planning:

- Honorarios a partir de la asistencia y las suplencias: la clase suplida se liquida a quien la dictó.
- Avisos de vencimiento generados a partir de las cuotas, sin duplicarse si el proceso corre dos veces.
- Descuentos aplicados sobre los precios vigentes del Sprint 2.
- Datos financieros visibles solo para la propietaria (permisos exclusivos del Sprint 1).
- Regresión: los casos de los Sprints 1 a 3.

#### Casos del sprint

Sin definir.

#### Datos de prueba del sprint

Sin definir.

#### Tests automatizados del sprint

Sin tests.

#### Registro de ejecución del sprint

Sin corridas.

### 6.5 Sprint 5 — Autogestión, Portal, Analítica y Fidelización

18/11/2026 – 01/12/2026 (estimadas) · US-14, US-27 a US-37

#### Alcance

| US | Historia |
| :--- | :--- |
| US-14 | Renovación o cambio de plan |
| US-27 | Carga de rutina y evolución física |
| US-28 | Consulta de rutina y progreso físico |
| US-29 | Consulta de estado de plan, asistencias y próximas clases |
| US-30 | Ranking de asistencia entre alumnos |
| US-31 | Insignias y racha de asistencia |
| US-32 | Panel público de disponibilidad |
| US-33 | Informe de asistencia |
| US-34 | Informe de cuotas vencidas |
| US-35 | Reportes de inscriptos por mes |
| US-36 | Reportes de planes más elegidos |
| US-37 | Mapa de calor de ocupación de horarios |

#### Puntos de integración a cubrir

Borrador, a refinar en el Sprint Planning:

- Portal del alumno: cada alumno ve solo sus datos, y el tutor los de su menor.
- Panel público de disponibilidad sin sesión, sin exponer datos personales.
- Informes y reportes consistentes con los pagos, la asistencia y las inscripciones de los sprints anteriores.
- Renovación o cambio de plan sobre inscripciones y cuotas existentes.
- Regresión: los casos de los Sprints 1 a 4.

#### Casos del sprint

Sin definir.

#### Datos de prueba del sprint

Sin definir.

#### Tests automatizados del sprint

Sin tests.

#### Registro de ejecución del sprint

Sin corridas.

## 7. Registro de corridas y defectos

### Corridas de la suite completa

Cada corrida ejecuta todos los tests de integración, así que también es la regresión de los sprints anteriores.

| Fecha | Sprint | Motivo | Tests | Resultado | Duración | Observaciones |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 07/10/2026 | 1 | Primera corrida | 41 | 41 aprobados | 4,4 s | En la misma corrida pasaron los 669 tests unitarios |

### Defectos detectados

| ID | Sprint | Caso | Descripción | Severidad | Responsable | Corregido en |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| — | 1 | — | Sin defectos en la corrida del 07/10/2026 | — | — | — |

Los defectos se numeran D-01, D-02, … en todo el proyecto.

## 8. Puntos a confirmar

| Sprint | Caso | Punto | Estado |
| :---: | :--- | :--- | :--- |
| 1 | PI-06 | **Baja de una actividad con horarios activos.** El backend la rechaza con 409 y pide dar de baja los horarios primero (US-03 / CA-03). Falta confirmarlo con la propietaria; si prefiere darla de baja y desasignar sus horarios, es un cambio de regla. Cuando existan inscripciones (Sprint 2) se revisa si el bloqueo se limita a horarios con alumnos inscriptos | Abierto |

## 9. Cómo sumar un sprint

Al empezar cada sprint:

1. Completar su sección dentro de la 6: alcance, puntos de integración y casos. Los casos se numeran desde el último PI usado.
2. Cargar sus casos en la matriz de trazabilidad (sección 5). Cada US del sprint tiene que quedar con al menos dos casos.
3. Definir los datos de prueba del sprint y, si hacen falta entidades nuevas, sumar sus fábricas a `back/src/__tests__/integracion/fabricas.ts`.

Al automatizar:

1. Escribir los tests en un archivo `.integration.test.ts` (ver [`test-integracion.md`](test-integracion.md#cómo-escribir-uno-nuevo)). Si el archivo es nuevo, asignarle la siguiente letra libre.
2. Listar sus tests en "Tests automatizados del sprint", con su código y el caso que cubren.
3. Actualizar la columna "Automatizado" de cada caso.

Al cerrar el sprint, antes de la Review:

1. Correr la suite completa y registrar la corrida en la sección 7.
2. Completar el registro de ejecución del sprint y cargar los defectos con responsable.
3. Actualizar el estado del sprint en la sección 2 y sumar una entrada al historial de cambios.

Plantilla de caso:

```markdown
#### PI-xx — Título del flujo

**US:** US-xx, US-yy · **Precondición:** …

1. Paso
2. Paso

**Resultado esperado:** códigos HTTP, mensajes y estado final en la base.

**Automatizado:** Sí / Parcial / No / Manual (tests X-01 a X-05).
```

## 10. Historial de cambios

| Versión | Fecha | Autor | Cambios |
| :--- | :--- | :--- | :--- |
| 1.0 | 07/10/2026 | Francisco Andrade | Plan de pruebas de integración del Sprint 1: casos PI-01 a PI-06 |
| 1.1 | 07/10/2026 | Francisco Andrade | Estrategia ajustada a lo implementado (Vitest, base `db-test`, migraciones con `migrate deploy`). Casos PI-07 a PI-09. Listado de tests automatizados y primera corrida registrada |
| 1.2 | 07/10/2026 | Francisco Andrade | Estructura por sprint: secciones de los Sprints 2 a 5 con su alcance y puntos de integración, matriz de trazabilidad por US, registro de corridas y guía para sumar un sprint. PI-04 a PI-06 pasan a usar los datos cargados en el seed de desarrollo |
