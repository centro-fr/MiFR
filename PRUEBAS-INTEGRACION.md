# MiFR – Documento de Prueba: Pruebas de Integración

**Universidad Tecnológica Nacional – Facultad Regional Córdoba**
Sistema de Gestión e Información para Centros Físicos · Proyecto Final · 2026

**Equipo:** Francisco Andrade · Leandro Andrade · Adriel Coria · Gastón Gil · Gastón Gutiérrez · Rosario Mendoza · Dante Vargas

> Este archivo se actualiza en el mismo trabajo que agrega o modifica tests de integración (skill `tests-integracion`): casos, tests, trazabilidad, corridas y defectos. El documento de Drive se copia desde acá.

## Índice

1. [Propósito del documento](#1-propósito-del-documento)
2. [Alcance de las pruebas de integración](#2-alcance-de-las-pruebas-de-integración)
3. [Estrategia para pruebas](#3-estrategia-para-pruebas)
4. [Datos de prueba comunes](#4-datos-de-prueba-comunes)
5. [Matriz de trazabilidad](#5-matriz-de-trazabilidad)
6. [Casos de prueba](#6-casos-de-prueba)
7. [Tests automatizados](#7-tests-automatizados)
8. [Registro de ejecución y defectos](#8-registro-de-ejecución-y-defectos)
9. [Puntos a confirmar](#9-puntos-a-confirmar)
10. [Cómo sumar casos](#10-cómo-sumar-casos)
11. [Historial de cambios](#11-historial-de-cambios)

---

## 1. Propósito del documento

Este documento reúne las pruebas de integración de MiFR. Su propósito es comprobar, y dejar registrado, que los módulos del sistema funcionan correctamente cuando trabajan juntos.

Complementa las pruebas de aceptación de cada historia de usuario (en la Definición del Producto) con casos que atraviesan varias US a la vez, donde aparecen errores que no se detectan probando cada una por separado.

## 2. Alcance de las pruebas de integración

Las pruebas de integración cubren las conexiones entre las partes: la interfaz, la API, la base de datos y los servicios externos. Se aplican a todas las historias de usuario del producto. Para cada una se prueban los flujos que cruzan más de un módulo.

### 2.1 Tipo de integración

| Tipo           | Contiene                                        | Verifica                                                                         |
| :------------- | :---------------------------------------------- | :------------------------------------------------------------------------------- |
| De componentes | Componentes del frontend entre sí               | Que los componentes de la interfaz funcionen juntos                              |
| Sistema–API    | Frontend + backend                              | Que las acciones en pantalla lleguen a la API y la interfaz refleje la respuesta |
| De servicios   | Backend + base de datos / servicios de terceros | Que la API responda lo correcto y los datos queden bien guardados en PostgreSQL  |

## 3. Estrategia para pruebas

Esta sección describe cómo se llevan a cabo las pruebas. Primero están las reglas comunes a todos los tipos de integración y después la forma de trabajo de cada tipo.

### 3.1 Estrategia general

Se aplica a los tres tipos de integración.

| Elemento            | Definición                                                                                                                                                                                                                       |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enfoque             | Incremental: los casos nuevos se agregan a los existentes y cada vez que se ejecutan las pruebas se corren todos, para confirmar que lo nuevo no rompió lo anterior (regresión)                                                  |
| Cuándo se ejecutan  | En dos momentos: cada vez que un integrante termina un cambio y lo va a sumar a la versión principal del código, para no incorporar errores, y al cierre de cada sprint, antes de la Review, para mostrar el sistema funcionando |
| Criterio de entrada | Las US involucradas cumplen sus pruebas de aceptación                                                                                                                                                                            |
| Criterio de salida  | Todos los casos pasan, o sus defectos quedan registrados en la sección 8 con responsable                                                                                                                                         |

**Convenciones**

- **Casos:** PI-xx, numeración correlativa.
- **Tests:** cada archivo tiene una letra (A, B, C…) y sus tests se numeran dentro de ella (A-01, A-02…). Los códigos son de este documento; en el código cada test se identifica por su nombre.
- **Automatización de un caso:** _Sí_, _Parcial_, _No_ o _Manual_ (se verifica a mano, por diseño).

### 3.2 Integración de servicios (en implementación)

Estas pruebas ejecutan el backend completo sobre una base de datos PostgreSQL real. En cada caso se verifica qué responde la API y qué queda guardado en la base. Corresponden a los casos PI-01 a PI-09.

| Elemento             | Definición                                                                                                                                                                                                                                                              |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enfoque              | Incremental: los casos nuevos se agregan a los existentes y cada vez que se ejecutan las pruebas se corren todos, para confirmar que lo nuevo no rompió lo anterior (regresión)                                                                                         |
| Herramientas         | Vitest + Supertest sobre la app Express real, inicializada con `construirDependencias`, la misma configuración de dependencias que usa producción. No suman dependencias a las de los tests unitarios                                                                   |
| Base de datos        | PostgreSQL 16 de prueba (`db-test` en `docker-compose.yml`, en memoria, puerto 55433). Las migraciones se aplican con `prisma migrate deploy` al arrancar; antes de cada test se vacían las tablas y se recarga el catálogo de seguridad                                |
| Protección           | Las pruebas solo corren contra una base cuyo nombre termine en `_test`. Si se las apunta por error a la base de desarrollo o a la de producción, se detienen antes de empezar y no modifican ningún dato                                                                |
| Google Auth          | En un login real, Google entrega un comprobante (`id_token`) y el backend le consulta a Google si es válido. En las pruebas se reemplaza solo esa consulta: el comprobante es directamente el correo del usuario de prueba, así no hace falta una cuenta real de Google |
| Validación           | Se verifican los códigos HTTP, los códigos de error de la API y el estado final en la base                                                                                                                                                                              |
| Ubicación del código | `back/src/__tests__/integracion/` (flujos entre componentes) y el `__tests__/` de cada componente. Archivos `*.integration.test.ts`, agrupados por tema                                                                                                                 |
| Cómo se corren       | `docker compose --profile test up -d db-test` y después `pnpm --filter back test:integration`. Se corre siempre la suite completa, así cada corrida es también la regresión de los sprints anteriores                                                                   |
| Cuándo se corren     | Antes de integrar cada rama de trabajo y al cierre de cada sprint, antes de la Review                                                                                                                                                                                   |

### 3.3 Integración sistema–API y de componentes (pendientes)

Su estrategia y ambiente se definen cuando se implementen. Mientras tanto, lo que depende de la interfaz se verifica a mano (PI-10).

## 4. Datos de prueba comunes

Antes de cada test la base de prueba se vacía y el test carga solo los datos que necesita. Así ningún test depende de lo que dejó otro, y el resultado es siempre el mismo sin importar el orden en que se ejecuten. Estos son los datos que se usan:

| Dato                             | Cómo se carga                                                                                                                                                                                                                                       |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles, permisos y matriz inicial | Los mismos del seed de producción (`cargarCatalogoSeguridad`), antes de cada test                                                                                                                                                                   |
| Usuarios                         | Fábrica `crearUsuario` (`back/src/__tests__/integracion/fabricas.ts`) con los roles y el estado que necesite cada test. Correos ficticios: `usuario1@example.com`…                                                                                  |
| Sesión                           | `entorno.iniciarSesion(correo)`, que pasa por el login real con Google simulado                                                                                                                                                                     |
| Escenario de demostración        | Seed de desarrollo (`cargarDatosDemo`, `back/src/shared/db/datos-demo.ts`). `pnpm --filter back db:seed:demo` lo carga en la base local y los tests en la base de prueba, así el mismo escenario se recorre a mano (Swagger o front) y en los tests |

Cuando las pruebas nuevas necesiten otro tipo de dato (por ejemplo alumnos, planes o pagos), se agrega en `fabricas.ts` una función que lo cree, igual que `crearUsuario`. Así cualquier test puede reutilizarla.

### 4.1 Escenario de demostración

No incluye alumnos ni tutores; los casos que los necesitan los crean con `crearUsuario`.

**Usuarios** (los tres tienen registro de profesora):

| Usuario     | Correo                    | Roles                   | Especialidad                |
| :---------- | :------------------------ | :---------------------- | :-------------------------- |
| Marina Sosa | `marina.sosa@example.com` | Propietaria + Profesora | Entrenamiento personalizado |
| Lucía Gómez | `lucia.gomez@example.com` | Profesora               | Entrenamiento funcional     |
| Carla Ruiz  | `carla.ruiz@example.com`  | Profesora               | Entrenamiento personalizado |

**Actividades:**

| Actividad                   | Código               | Modalidad     | Cupo     |
| :-------------------------- | :------------------- | :------------ | :------- |
| Funcional Grupal            | `FUNCIONAL`          | Grupal        | Sin cupo |
| Entrenamiento Personalizado | `ENTRENAMIENTO_PERS` | Personalizada | 4        |

**Horarios:**

| Día       | Hora          | Profesora   | Actividad                   | Cupo del horario         |
| :-------- | :------------ | :---------- | :-------------------------- | :----------------------- |
| Lunes     | 18:00 – 19:00 | Lucía Gómez | Funcional Grupal            | Sin cupo propio          |
| Martes    | 09:00 – 10:00 | Carla Ruiz  | Entrenamiento Personalizado | Sin cupo propio (toma 4) |
| Miércoles | 18:00 – 19:00 | Lucía Gómez | Funcional Grupal            | Sin cupo propio          |
| Jueves    | 09:00 – 10:00 | Carla Ruiz  | Entrenamiento Personalizado | Sin cupo propio (toma 4) |
| Viernes   | 19:00 – 20:00 | Marina Sosa | Funcional Grupal            | 12, propio (CA-07)       |

Los horarios nuevos deben caer dentro del horario de atención, de lunes a sábado de 07:00 a 20:00 (US-04); fuera de esa franja la API responde 400 antes de evaluar otras reglas. El centro no abre los domingos: la base admite el día 7 (el DER no se cambia), pero la API lo rechaza.

## 5. Matriz de trazabilidad

Cada US del sprint en curso tiene que quedar cubierta por al menos dos casos de integración. Las US de sprints futuros figuran para que la matriz se complete a medida que avanza el proyecto.

| US    | Historia                                                  | Sprint | Casos                                                  | Automatización           |
| :---- | :-------------------------------------------------------- | :----: | :----------------------------------------------------- | :----------------------- |
| US-01 | Inicio de sesión con Google Auth                          |   1    | PI-01, PI-02, PI-03, PI-07, PI-08, PI-10               | Sí, salvo PI-10 (Manual) |
| US-02 | Definición de permisos por rol                            |   1    | PI-01, PI-02, PI-03, PI-05, PI-07, PI-08, PI-09, PI-10 | Sí, salvo PI-10 (Manual) |
| US-03 | Alta y administración de actividades y cupos              |   1    | PI-03, PI-04, PI-06                                    | Sí                       |
| US-04 | Asignación de profesoras y horarios a actividades         |   1    | PI-03, PI-04, PI-05, PI-06                             | Sí                       |
| US-05 | Pre-inscripción de alumno nuevo                           |   2    |                                                        |                          |
| US-06 | Asociación de tutor a alumno menor de edad                |   2    |                                                        |                          |
| US-07 | Alta definitiva al confirmarse el primer pago             |   2    |                                                        |                          |
| US-08 | Baja lógica de alumno                                     |   2    |                                                        |                          |
| US-09 | Modificación de datos de alumno                           |   2    |                                                        |                          |
| US-10 | Consulta y búsqueda de alumnos                            |   2    |                                                        |                          |
| US-11 | Alta y edición de planes vigentes                         |   2    |                                                        |                          |
| US-12 | Actualización de precios con fecha de vigencia            |   2    |                                                        |                          |
| US-13 | Alta de descuentos y promociones temporales               |   4    |                                                        |                          |
| US-14 | Renovación o cambio de plan                               |   5    |                                                        |                          |
| US-15 | Registro de cobro en efectivo                             |   3    |                                                        |                          |
| US-16 | Registro de pago por transferencia con comprobante        |   3    |                                                        |                          |
| US-17 | Aprobación o rechazo de transferencias                    |   3    |                                                        |                          |
| US-18 | Cálculo del estado de habilitación del alumno             |   3    |                                                        |                          |
| US-19 | Control de efectivo pendiente de rendición                |   4    |                                                        |                          |
| US-20 | Registro de asistencia por clase                          |   3    |                                                        |                          |
| US-21 | Registro automático de inasistencias                      |   3    |                                                        |                          |
| US-22 | Detección de alumnos inactivos con cuota al día           |   4    |                                                        |                          |
| US-23 | Informe mensual automático de honorarios                  |   4    |                                                        |                          |
| US-24 | Registro de suplencias entre profesoras                   |   4    |                                                        |                          |
| US-25 | Aviso automático de vencimiento de cuota                  |   4    |                                                        |                          |
| US-26 | Resumen diario para la propietaria                        |   4    |                                                        |                          |
| US-27 | Carga de rutina y evolución física                        |   5    |                                                        |                          |
| US-28 | Consulta de rutina y progreso físico                      |   5    |                                                        |                          |
| US-29 | Consulta de estado de plan, asistencias y próximas clases |   5    |                                                        |                          |
| US-30 | Ranking de asistencia entre alumnos                       |   5    |                                                        |                          |
| US-31 | Insignias y racha de asistencia                           |   5    |                                                        |                          |
| US-32 | Panel público de disponibilidad                           |   5    |                                                        |                          |
| US-33 | Informe de asistencia                                     |   5    |                                                        |                          |
| US-34 | Informe de cuotas vencidas                                |   5    |                                                        |                          |
| US-35 | Reportes de inscriptos por mes                            |   5    |                                                        |                          |
| US-36 | Reportes de planes más elegidos                           |   5    |                                                        |                          |
| US-37 | Mapa de calor de ocupación de horarios                    |   5    |                                                        |                          |

## 6. Casos de prueba

Cada caso describe un recorrido por el sistema. Indica las US que involucra, la situación de partida, los pasos que se realizan y el resultado esperado. Primero hay un resumen de todos los casos y después el detalle de cada uno.

### 6.1 Resumen

| Caso  | Flujo                                                              | US            | Tipo        | Datos                           | Automatizado |
| :---- | :----------------------------------------------------------------- | :------------ | :---------- | :------------------------------ | :----------- |
| PI-01 | Login con roles múltiples y permisos por rol                       | US-01, US-02  | Servicios   | Comunes                         | Sí           |
| PI-02 | Accesos rechazados                                                 | US-01, US-02  | Servicios   | Comunes                         | Sí           |
| PI-03 | Permisos sobre actividades y horarios                              | US-01 a US-04 | Servicios   | Comunes + demostración (paso 4) | Sí           |
| PI-04 | Actividad personalizada → horario con cupo heredado                | US-03, US-04  | Servicios   | Demostración                    | Sí           |
| PI-05 | Validaciones al asignar profesora y horario                        | US-02, US-04  | Servicios   | Demostración                    | Sí           |
| PI-06 | Modificación y baja de actividades con horarios                    | US-03, US-04  | Servicios   | Demostración                    | Sí           |
| PI-07 | Acceso a los datos propios                                         | US-01, US-02  | Servicios   | Comunes                         | Sí           |
| PI-08 | Los cambios de permisos rigen desde el pedido siguiente            | US-01, US-02  | Servicios   | Comunes                         | Sí           |
| PI-09 | Carga del catálogo de seguridad                                    | US-02         | Servicios   | Comunes                         | Sí           |
| PI-10 | Sesión en la interfaz: menú por rol, login cancelado y redirección | US-01, US-02  | Sistema–API | Demostración                    | Manual       |

PI-07 a PI-09 cubren riesgos de control de acceso que los tests unitarios no ven, porque con mocks los permisos nunca salen de la base. PI-10 reúne los pasos de PI-01 y PI-02 que ocurren en el navegador.

### 6.2 Detalle

#### PI-01 — Login con roles múltiples y permisos por rol

**US:** US-01, US-02 · **Precondición:** catálogo de seguridad cargado.

1. Un usuario con rol Alumno inicia sesión con Google (token simulado).
2. Se consulta el perfil de la sesión (`GET /auth/me`).
3. Un usuario con roles Propietaria y Profesora inicia sesión y consulta el listado de usuarios.

**Resultado esperado:** el login vincula la cuenta de Google con el usuario. El perfil trae sus roles y los permisos que salen de la matriz de la base (el Alumno ve actividades y horarios, pero no usuarios). El usuario con dos roles suma los permisos de ambos. La base no guarda ninguna contraseña: el esquema no tiene columna para eso.

**Automatizado:** Sí (A-04, A-31). El menú que arma el front con esos permisos está en PI-10.

#### PI-02 — Accesos rechazados

**US:** US-01, US-02 · **Precondición:** el correo usado no existe en la base.

1. Se inicia sesión con un correo no registrado.
2. Sin sesión, se llama a `GET /actividades`.
3. Se llama con un token firmado con otro secreto.
4. Se llama con el token de un usuario que después fue borrado.
5. Se llama con el token de un usuario que después fue dado de baja.

**Resultado esperado:** el correo no registrado recibe 403 con el código `USUARIO_NO_REGISTRADO`, no se abre ninguna sesión y no se crea ninguna persona en la base. Las llamadas sin sesión o con un token ajeno responden 401. El usuario borrado recibe 401 y el dado de baja 403, aunque su token no haya vencido.

**Automatizado:** Sí (A-01, A-02, A-03, A-05, A-06). El login de Google cancelado y la redirección al login están en PI-10.

#### PI-03 — Permisos sobre actividades y horarios

**US:** US-01, US-02, US-03, US-04 · **Precondición:** catálogo de seguridad cargado; para el paso 4, también el escenario de demostración.

1. Una profesora, un alumno y un tutor intentan crear una actividad.
2. La propietaria crea la misma actividad.
3. Cada rol consulta los listados de usuarios, matriz de permisos, actividades, horarios y profesoras.
4. Una profesora, un alumno y un tutor intentan modificar y dar de baja Funcional Grupal, y asignarle a Carla un horario.

**Resultado esperado:** las escrituras de profesora, alumno y tutor responden 403 y la base queda sin cambios: ninguna actividad creada, la descripción de Funcional Grupal intacta, la actividad sigue activa y no aparece ningún horario nuevo. La de la propietaria responde 201 y queda persistida. Actividades, horarios y profesoras responden 200 para todos los roles. Usuarios y matriz de permisos responden 200 solo para la propietaria y 403 para el resto.

**Automatizado:** Sí (A-07 a A-30, A-39 a A-41).

#### PI-04 — Actividad personalizada → horario con cupo heredado

**US:** US-03, US-04 · **Precondición:** escenario de demostración cargado; sesión de Marina.

1. Marina intenta crear la actividad "Posing" (código `POSING`), personalizada y sin cupo.
2. La crea con cupo 3.
3. Le asigna a Carla el horario de Posing del lunes de 09:00 a 10:00, sin cupo propio.
4. Se consultan los horarios de Entrenamiento Personalizado.
5. Le asigna a Carla un horario de Entrenamiento Personalizado el lunes de 11:00 a 12:00, con cupo propio 2.
6. Se consultan los horarios de Marina.
7. Marina crea "Funcional Sábado", grupal y sin cupo, y se la asigna a Lucía el sábado de 10:00 a 11:00.

**Resultado esperado:** el paso 1 falla con 400 por cupo obligatorio y la actividad no se guarda. El horario del paso 3 informa cupo efectivo 3, y los de Entrenamiento Personalizado de martes y jueves informan 4: si el horario no tiene cupo propio, toma el de la actividad. El horario del paso 5 informa 2 y el de Funcional Grupal del viernes de Marina informa 12, porque el cupo propio del horario manda sobre el de la actividad. La actividad grupal del paso 7 se crea y se asigna sin cupo.

**Automatizado:** Sí (B-01 a B-04).

#### PI-05 — Validaciones al asignar profesora y horario

**US:** US-02, US-04 · **Precondición:** escenario de demostración cargado; sesión de Marina. Lucía dicta Funcional Grupal lunes y miércoles de 18:00 a 19:00, y Marina el viernes de 19:00 a 20:00.

1. Marina intenta asignarle a Lucía Entrenamiento Personalizado el lunes de 18:30 a 19:30.
2. Marina se asigna a sí misma Funcional Grupal el lunes de 18:00 a 19:00.
3. Marina intenta asignarse Funcional Grupal el viernes de 18:30 a 19:30.
4. Marina intenta crear un horario que termina antes de empezar (de 10:00 a 09:00).
5. Marina le quita a Carla el rol Profesora e intenta asignarle Entrenamiento Personalizado el viernes de 09:00 a 10:00.
6. Marina intenta asignarle a Lucía Funcional Grupal el domingo de 10:00 a 11:00.
7. Marina intenta pasar al domingo el horario del lunes de Lucía.

**Resultado esperado:** los pasos 1 y 3 se rechazan con 409 por superposición ("La profesora ya tiene un horario superpuesto ese día"). El paso 2 se acepta: dos profesoras distintas pueden dictar a la misma hora. El paso 4 se rechaza con 400. En el paso 5 el rol se quita (200) y la asignación se rechaza con 404 ("Profesora no encontrada, inactiva o sin el rol PROFESORA"). Los pasos 6 y 7 se rechazan con 400 `VALIDATION_ERROR` ("El centro no abre los domingos"): no queda ningún horario en domingo y el de Lucía sigue el lunes. Ninguno de los rechazos deja un horario guardado.

**Automatizado:** Sí (B-05 a B-09, B-14, B-15).

#### PI-06 — Modificación y baja de actividades con horarios

**US:** US-03, US-04 · **Precondición:** escenario de demostración cargado; sesión de Marina. Funcional Grupal tiene horarios activos (Lucía lunes y miércoles, Marina viernes).

1. Marina cambia la descripción de Funcional Grupal.
2. Marina intenta dar de baja Funcional Grupal.
3. Marina crea una actividad nueva, sin horarios, y la da de baja.
4. Marina intenta cambiar Funcional Grupal de grupal a personalizada sin indicar cupo.

**Resultado esperado:** la descripción nueva se ve en los tres horarios de Funcional Grupal. La baja del paso 2 se rechaza con 409 ("La actividad tiene horarios activos: hay que darlos de baja antes que la actividad") y la actividad sigue activa. El paso 3 se acepta y la actividad queda inactiva. El paso 4 se rechaza con 400 por cupo obligatorio y la actividad sigue siendo grupal.

**Automatizado:** Sí (B-10 a B-13).

#### PI-07 — Acceso a los datos propios

**US:** US-01, US-02 · **Precondición:** dos usuarios con rol Alumno.

1. Un alumno consulta sus propios datos.
2. Consulta los datos del otro alumno.
3. Intenta cambiar su propio estado a inactivo.

**Resultado esperado:** el paso 1 responde 200 con sus datos. El paso 2 responde 403. El paso 3 responde 403 y el estado en la base sigue en activo: cambiar el estado exige el permiso de editar usuarios, aunque sea el propio.

**Automatizado:** Sí (A-32 a A-34).

#### PI-08 — Los cambios de permisos rigen desde el pedido siguiente

**US:** US-01, US-02 · **Precondición:** sesiones abiertas de una propietaria, un alumno y una profesora.

1. Un alumno manda un token firmado con el secreto correcto, pero que dice tener el rol Propietaria.
2. La propietaria le quita a Alumno el permiso de ver actividades. El alumno, con el mismo token, consulta las actividades.
3. La propietaria le quita el rol Profesora a la profesora. Ella, con el mismo token, consulta las actividades.
4. La propietaria intenta otorgarle a Profesora el permiso de confirmar pagos.

**Resultado esperado:** el paso 1 responde 403, porque los roles se leen de la base y no del token. En los pasos 2 y 3 el cambio se guarda y el pedido siguiente responde 403, sin esperar a que venza el token. El paso 4 responde 400 con el código `PERMISO_EXCLUSIVO_PROPIETARIA` y el permiso no queda guardado.

**Automatizado:** Sí (A-35 a A-38).

#### PI-09 — Carga del catálogo de seguridad

**US:** US-02 · **Precondición:** catálogo de seguridad cargado.

1. Se le quita a Alumno el permiso de ver actividades y se vuelve a correr la carga del catálogo.
2. Se le quita a la propietaria el permiso de editar usuarios y se vuelve a correr la carga.
3. Se vuelve a correr la carga sin cambios.

**Resultado esperado:** la carga no repone el permiso quitado a Alumno, porque respeta lo que decidió la propietaria. Sí repone el de la propietaria, porque es un permiso crítico. Volver a correrla no duplica roles, permisos ni asignaciones.

**Automatizado:** Sí (C-01 a C-03).

#### PI-10 — Sesión en la interfaz: menú por rol, login cancelado y redirección

**US:** US-01, US-02 · **Precondición:** front y back levantados con el escenario de demostración. Los correos del seed no son cuentas reales de Google: para entrar como Marina con Google se carga el seed con un correo propio (`pnpm --filter back db:seed:demo -- <correo>`); para los pasos 1, 2 y 4 alcanza con el login de desarrollo (`LOGIN_DESARROLLO=true`).

1. Marina inicia sesión y se mira el menú.
2. Lucía inicia sesión y se mira el menú.
3. Se inicia el login con Google y se cierra la ventana de Google antes de elegir la cuenta.
4. Sin sesión, se entra directo a una pantalla interna (por ejemplo, la de actividades).

**Resultado esperado:** el menú de Marina combina las funciones de propietaria y de profesora. El de Lucía muestra solo funciones de profesora: ve sus propios honorarios, pero no la administración de usuarios, la matriz de permisos ni los datos financieros del centro. El login cancelado no deja ninguna sesión abierta. La pantalla interna redirige al login.

**Automatizado:** Manual. Depende del navegador y de la cuenta de Google; se automatiza con las pruebas de punta a punta, coordinadas con el equipo de front.

## 7. Tests automatizados

59 tests en tres archivos:

| Archivo | Ubicación                                                                   | Tests            | Casos                             |
| :-----: | :-------------------------------------------------------------------------- | :--------------- | :-------------------------------- |
|    A    | `back/src/__tests__/integracion/control-de-acceso.integration.test.ts`      | 41 (A-01 a A-41) | PI-01, PI-02, PI-03, PI-07, PI-08 |
|    B    | `back/src/__tests__/integracion/actividades-y-horarios.integration.test.ts` | 15 (B-01 a B-15) | PI-04, PI-05, PI-06               |
|    C    | `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts`       | 3 (C-01 a C-03)  | PI-09                             |

| Tests       | Qué verifican                                                                                                                                                           | Caso  |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---- |
| A-01, A-02  | 401 sin token o con un token firmado con otro secreto                                                                                                                   | PI-02 |
| A-03        | Un correo no dado de alta no inicia sesión ni crea ninguna persona                                                                                                      | PI-02 |
| A-04        | El login vincula la cuenta de Google y `/auth/me` devuelve los permisos de la base                                                                                      | PI-01 |
| A-05, A-06  | 401 si el usuario ya no existe; 403 si está dado de baja, aunque el token siga vigente                                                                                  | PI-02 |
| A-07 a A-26 | GET de usuarios, matriz, actividades, horarios y profesoras con cada rol (un test por ruta y rol): usuarios y matriz 200 solo para Propietaria; el resto 200 para todos | PI-03 |
| A-27 a A-30 | Solo la propietaria crea actividades; con los otros roles no queda nada guardado                                                                                        | PI-03 |
| A-31        | Un usuario con varios roles suma los permisos de todos                                                                                                                  | PI-01 |
| A-32 a A-34 | Un alumno ve sus datos, no los de otro, y no puede cambiar su propio estado                                                                                             | PI-07 |
| A-35 a A-38 | Los roles del token no cuentan; un permiso o rol quitado deja de valer con el mismo token; no se otorgan permisos exclusivos de la propietaria                          | PI-08 |
| A-39 a A-41 | Profesora, Alumno y Tutor no modifican ni dan de baja actividades ni asignan horarios, y la base queda igual                                                            | PI-03 |
| B-01 a B-04 | Cupo obligatorio en personalizadas; el horario sin cupo propio toma el de la actividad; el cupo propio manda; grupal sin cupo                                           | PI-04 |
| B-05 a B-09 | Superposición de horarios de una misma profesora (también la propietaria); dos profesoras a la misma hora; horario invertido; profesora sin el rol                      | PI-05 |
| B-10 a B-13 | Descripción visible en todos los horarios; baja bloqueada con horarios activos; baja sin horarios; no pasar a personalizada sin cupo                                    | PI-06 |
| B-14, B-15  | No se asigna un horario en domingo ni se mueve uno existente a ese día; la base queda igual                                                                             | PI-05 |
| C-01 a C-03 | Volver a correr la carga no pisa permisos quitados, repone los críticos de la propietaria y no duplica nada                                                             | PI-09 |

### 7.1 Verificación de que los tests detectan fallas

Se rompió a propósito cada regla, se comprobó que algún test fallara y se restauró el código:

| Regla rota                                                              | Tests que fallaron                                                                                         |
| :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `requierePermiso` deja pasar cualquier pedido                           | A-08 a A-10, A-33 a A-37. El resto siguió en verde por la segunda barrera `requiereRol("PROPIETARIA")`     |
| El cupo de la actividad manda sobre el cupo propio del horario          | B-03 (la primera versión no lo detectaba; se sumó un horario con cupo propio sobre una actividad con cupo) |
| No se verifica que la actividad tenga horarios activos antes de la baja | B-11                                                                                                       |
| El día de la semana vuelve a aceptar el domingo (`max(7)`)              | B-14, B-15                                                                                                 |

Además, apuntada a la base de desarrollo (`mifr`), las pruebas se negaron a correr y no tocaron datos.

## 8. Registro de ejecución y defectos

### 8.1 Ejecuciones completas

| Fecha      | Motivo                                                                | Tests | Resultado    | Duración | Observaciones                                                       |
| :--------- | :-------------------------------------------------------------------- | :---: | :----------- | :------: | :------------------------------------------------------------------ |
| 07/10/2026 | Primera corrida                                                       |  41   | 41 aprobados |  4,4 s   | Pasaron también los 669 tests unitarios                             |
| 07/10/2026 | PI-03 (paso 4) a PI-06 automatizados                                  |  57   | 57 aprobados |  7,0 s   | Fallas provocadas detectadas en cupo efectivo y baja de actividades |
| 07/10/2026 | Datos de prueba con las actividades del Estudio Inicial (sin Pilates) |  57   | 57 aprobados |  14,5 s  | Pasaron también los 669 tests unitarios                             |
| 07/10/2026 | El centro no abre los domingos (PI-05, pasos 6 y 7)                   |  59   | 59 aprobados |  13,1 s  | Pasaron también los 673 tests unitarios; falla provocada detectada  |

### 8.2 Resultado por caso

| Caso          | Fecha      | Ejecutó           | Resultado | Observaciones                         |
| :------------ | :--------- | :---------------- | :-------- | :------------------------------------ |
| PI-01 a PI-09 | 07/10/2026 | Francisco Andrade | Aprobado  | Todos sus tests pasan (ver sección 7) |
| PI-10         | —          | —                 | Pendiente | Verificación manual en el navegador   |

### 8.3 Defectos

| ID  | Caso | Descripción                               | Severidad | Responsable | Corregido en |
| :-- | :--- | :---------------------------------------- | :-------- | :---------- | :----------- |
| —   | —    | Sin defectos en la corrida del 07/10/2026 | —         | —           | —            |

Los defectos se numeran D-01, D-02…

## 9. Puntos a confirmar

| Caso  | Punto                                                                                                                                                                                                                                                                                                                                                 | Estado  |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| PI-06 | Baja de una actividad con horarios activos: el backend la rechaza con 409 y pide dar de baja los horarios primero (US-03 / CA-03). Falta confirmarlo con la propietaria; si prefiere darla de baja y desasignar los horarios, es un cambio de regla. Cuando existan inscripciones se revisa si el bloqueo se limita a horarios con alumnos inscriptos | Abierto |

## 10. Cómo sumar casos

1. Agregar el caso en la sección 6 (resumen y detalle), numerado desde el último PI usado, con la plantilla de abajo.
2. Actualizar la matriz de trazabilidad: cada US probada con al menos dos casos.
3. Si hacen falta entidades nuevas, sumar su fábrica a `fabricas.ts` y documentarla en la sección 4.
4. Escribir los tests en un `*.integration.test.ts` (archivo nuevo → siguiente letra libre) y listarlos en la sección 7.
5. Ejecutar todas las pruebas y registrar la corrida, el resultado del caso y los defectos en la sección 8.
6. Sumar una entrada al historial de cambios.

**Plantilla de caso:**

```markdown
#### PI-xx — Título del flujo

**US:** US-xx, US-yy · **Precondición:** …

1. Paso
2. Paso

**Resultado esperado:** códigos HTTP, mensajes y estado final en la base.

**Automatizado:** Sí / Parcial / No / Manual (tests X-01 a X-05).
```

## 11. Historial de cambios

| Versión | Fecha      | Observaciones                                                                   | Encargado         |
| :-----: | :--------- | :------------------------------------------------------------------------------ | :---------------- |
|   1.1   | 07/10/2026 | Casos PI-01 a PI-10 del Sprint 1 y tests A-01 a A-41, B-01 a B-13 y C-01 a C-03 | Francisco Andrade |
|   1.2   | 07/10/2026 | PI-05: pasos 6 y 7 (el centro no abre los domingos) y tests B-14 y B-15         | Francisco Andrade |
