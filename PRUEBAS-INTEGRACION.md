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

#### Convenciones

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

| Dato                             | Cómo se carga                                                                                                                                                                                                                                                                                                          |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles, permisos y matriz inicial | Los mismos del seed de producción (`cargarCatalogoSeguridad`), antes de cada test                                                                                                                                                                                                                                      |
| Usuarios                         | Fábrica `crearUsuario` (`back/src/__tests__/integracion/fabricas.ts`) con los roles y el estado que necesite cada test. Correos ficticios: `usuario1@example.com`…                                                                                                                                                     |
| Sesión                           | `entorno.iniciarSesion(correo)`, que pasa por el login real con Google simulado                                                                                                                                                                                                                                        |
| Planes                           | Fábrica `crearPlan` (`back/src/__tests__/integracion/fabricas.ts`): plan mensual de 2 clases por semana con un único precio abierto ($25.000 desde el 01/01/2026), o con el nombre, tipo, precio, fecha y actividad exclusiva que se pidan. La usan los casos de planes y la van a usar los de inscripciones           |
| Alumnos                          | Fábrica `crearAlumno` (`back/src/__tests__/integracion/fabricas.ts`): alumno con su usuario, pre-inscripto (`INACTIVO`, sin roles) y mayor de edad por defecto; se le puede pasar nombre, apellido, DNI, email (o `null` para un menor), fecha de nacimiento, estado y tutor. La van a usar los casos de inscripciones |
| Escenario de demostración        | Seed de desarrollo (`cargarDatosDemo`, `back/src/shared/db/datos-demo.ts`). `pnpm --filter back db:seed:demo` lo carga en la base local y los tests en la base de prueba, así el mismo escenario se recorre a mano (Swagger o front) y en los tests                                                                    |

Cuando las pruebas nuevas necesiten otro tipo de dato (por ejemplo inscripciones o pagos), se agrega en `fabricas.ts` una función que lo cree, igual que `crearUsuario`. Así cualquier test puede reutilizarla.

### 4.1 Escenario de demostración

Incluye planes y dos alumnos pre-inscriptos. Los casos que necesitan otros los crean con `crearUsuario`, `crearPlan` y `crearAlumno`, o por la API, y cuentan contra lo que ya había para no depender del escenario.

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

**Planes** (precios vigentes desde el 01/01/2026):

| Plan                 | Tipo         | Clases por semana | Exclusivo de                | Profesora única |  Precio |
| :------------------- | :----------- | :---------------: | :-------------------------- | :-------------: | ------: |
| Básico               | Mensual      |         2         | —                           |       No        | $25.000 |
| Intermedio           | Mensual      |         3         | —                           |       No        | $30.000 |
| Personalizado 2 días | Mensual      |         2         | Entrenamiento Personalizado |       Sí        | $45.000 |
| Clase suelta         | Clase suelta |         —         | —                           |       No        |  $6.000 |

**Alumnos** (pre-inscriptos: alumno y usuario `INACTIVO`, sin inscripción todavía):

| Alumno       | DNI      | Edad  | Email                      | Tutor                                                               |
| :----------- | :------- | :---- | :------------------------- | :------------------------------------------------------------------ |
| Sofía Medina | 38111222 | Mayor | `sofia.medina@example.com` | —                                                                   |
| Mateo Romero | 52111222 | Menor | —                          | Paula Romero (DNI 31222333, `paula.romero@example.com`, `INACTIVO`) |

Los horarios nuevos deben caer dentro del horario de atención, de lunes a sábado de 07:00 a 20:00 (US-04); fuera de esa franja la API responde 400 antes de evaluar otras reglas. El centro no abre los domingos: la base admite el día 7 (el DER no se cambia), pero la API lo rechaza.

## 5. Matriz de trazabilidad

Cada US del sprint en curso tiene que quedar cubierta por al menos dos casos de integración. Las US de sprints futuros figuran para que la matriz se complete a medida que avanza el proyecto.

| US    | Historia                                                  | Sprint | Casos                                                         | Automatización                                                                         |
| :---- | :-------------------------------------------------------- | :----: | :------------------------------------------------------------ | :------------------------------------------------------------------------------------- |
| US-01 | Inicio de sesión con Google Auth                          |   1    | PI-01, PI-02, PI-03, PI-07, PI-08, PI-10                      | Sí, salvo PI-10 (Manual)                                                               |
| US-02 | Definición de permisos por rol                            |   1    | PI-01, PI-02, PI-03, PI-05, PI-07, PI-08, PI-09, PI-10, PI-14 | Sí, salvo PI-10 (Manual)                                                               |
| US-03 | Alta y administración de actividades y cupos              |   1    | PI-03, PI-04, PI-06                                           | Sí                                                                                     |
| US-04 | Asignación de profesoras y horarios a actividades         |   1    | PI-03, PI-04, PI-05, PI-06                                    | Sí                                                                                     |
| US-05 | Pre-inscripción de alumno nuevo                           |   2    | PI-15, PI-16                                                  | Parcial: falta la inscripción al plan y los horarios (parte de Nicolas)                |
| US-06 | Asociación de tutor a alumno menor de edad                |   2    | PI-16, PI-17, PI-19                                           | Sí                                                                                     |
| US-07 | Alta definitiva al confirmarse el primer pago             |   2    | PI-19                                                         | Parcial: la activación por HTTP llega con la inscripción                               |
| US-08 | Baja lógica de alumno                                     |   2    | PI-18, PI-19                                                  | Parcial: la baja por HTTP llega con la inscripción                                     |
| US-09 | Modificación de datos de alumno                           |   2    | PI-17                                                         | Parcial: falta el cambio de plan y horarios (parte de Nicolas)                         |
| US-10 | Consulta y búsqueda de alumnos                            |   2    | PI-18                                                         | Parcial: faltan los filtros por plan y profesora, y que la profesora vea a sus alumnos |
| US-11 | Alta y edición de planes vigentes                         |   2    | PI-11, PI-12, PI-14                                           | Sí                                                                                     |
| US-12 | Actualización de precios con fecha de vigencia            |   2    | PI-11, PI-13                                                  | Parcial: el precio aplicado al cobrar se prueba con el cobro (Sprint 3)                |
| US-13 | Alta de descuentos y promociones temporales               |   4    |                                                               |                                                                                        |
| US-14 | Renovación o cambio de plan                               |   5    |                                                               |                                                                                        |
| US-15 | Registro de cobro en efectivo                             |   3    |                                                               |                                                                                        |
| US-16 | Registro de pago por transferencia con comprobante        |   3    |                                                               |                                                                                        |
| US-17 | Aprobación o rechazo de transferencias                    |   3    |                                                               |                                                                                        |
| US-18 | Cálculo del estado de habilitación del alumno             |   3    |                                                               |                                                                                        |
| US-19 | Control de efectivo pendiente de rendición                |   4    |                                                               |                                                                                        |
| US-20 | Registro de asistencia por clase                          |   3    |                                                               |                                                                                        |
| US-21 | Registro automático de inasistencias                      |   3    |                                                               |                                                                                        |
| US-22 | Detección de alumnos inactivos con cuota al día           |   4    |                                                               |                                                                                        |
| US-23 | Informe mensual automático de honorarios                  |   4    |                                                               |                                                                                        |
| US-24 | Registro de suplencias entre profesoras                   |   4    |                                                               |                                                                                        |
| US-25 | Aviso automático de vencimiento de cuota                  |   4    |                                                               |                                                                                        |
| US-26 | Resumen diario para la propietaria                        |   4    |                                                               |                                                                                        |
| US-27 | Carga de rutina y evolución física                        |   5    |                                                               |                                                                                        |
| US-28 | Consulta de rutina y progreso físico                      |   5    |                                                               |                                                                                        |
| US-29 | Consulta de estado de plan, asistencias y próximas clases |   5    |                                                               |                                                                                        |
| US-30 | Ranking de asistencia entre alumnos                       |   5    |                                                               |                                                                                        |
| US-31 | Insignias y racha de asistencia                           |   5    |                                                               |                                                                                        |
| US-32 | Panel público de disponibilidad                           |   5    |                                                               |                                                                                        |
| US-33 | Informe de asistencia                                     |   5    |                                                               |                                                                                        |
| US-34 | Informe de cuotas vencidas                                |   5    |                                                               |                                                                                        |
| US-35 | Reportes de inscriptos por mes                            |   5    |                                                               |                                                                                        |
| US-36 | Reportes de planes más elegidos                           |   5    |                                                               |                                                                                        |
| US-37 | Mapa de calor de ocupación de horarios                    |   5    |                                                               |                                                                                        |

## 6. Casos de prueba

Cada caso describe un recorrido por el sistema. Indica las US que involucra, la situación de partida, los pasos que se realizan y el resultado esperado. Primero hay un resumen de todos los casos y después el detalle de cada uno.

### 6.1 Resumen

| Caso          | Flujo                                                              | US                  | Tipo               | Datos                                                      | Automatizado |
| :------------ | :----------------------------------------------------------------- | :------------------ | :----------------- | :--------------------------------------------------------- | :----------- |
| PI-01         | Login con roles múltiples y permisos por rol                       | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-02         | Accesos rechazados                                                 | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-03         | Permisos sobre actividades y horarios                              | US-01 a US-04       | Servicios          | Comunes + demostración (paso 4)                            | Sí           |
| PI-04         | Actividad personalizada → horario con cupo heredado                | US-03, US-04        | Servicios          | Demostración                                               | Sí           |
| PI-05         | Validaciones al asignar profesora y horario                        | US-02, US-04        | Servicios          | Demostración                                               | Sí           |
| PI-06         | Modificación y baja de actividades con horarios                    | US-03, US-04        | Servicios          | Demostración                                               | Sí           |
| PI-07         | Acceso a los datos propios                                         | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-08         | Los cambios de permisos rigen desde el pedido siguiente            | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-09         | Carga del catálogo de seguridad                                    | US-02               | Servicios          | Comunes                                                    | Sí           |
| PI-10         | Sesión en la interfaz: menú por rol, login cancelado y redirección | US-01, US-02        | Sistema–API        | Demostración                                               | Manual       |
| PI-11         | Alta de plan con su precio inicial                                 | US-11, US-12        | Servicios          | Demostración                                               | Sí           |
| PI-12         | Modificación y baja de planes                                      | US-11               | Servicios          | Demostración                                               | Sí           |
| PI-13         | Actualización de precio con fecha de vigencia                      | US-12               | Servicios          | Demostración                                               | Parcial      |
| PI-14         | 08/10/2026                                                         | Francisco Andrade   | Aprobado           | Nueva corrida con la profesora viendo los planes           |
| PI-15 a PI-18 | 08/10/2026                                                         | Francisco Andrade   | Aprobado           | Todos sus tests pasan (ver sección 7)                      |
| PI-19         | 08/10/2026                                                         | Francisco Andrade   | Aprobado (parcial) | Pasan F-01 a F-03; falta la parte por HTTP (inscripciones) |
| PI-14         | Permisos sobre planes                                              | US-02, US-11        | Servicios          | Demostración                                               | Sí           |
| PI-15         | Pre-inscripción de un alumno mayor                                 | US-05               | Servicios          | Demostración                                               | Sí           |
| PI-16         | Alumno menor con tutor                                             | US-05, US-06        | Servicios          | Demostración                                               | Sí           |
| PI-17         | Modificación de datos del alumno                                   | US-06, US-09        | Servicios          | Demostración                                               | Sí           |
| PI-18         | Búsqueda y consulta de alumnos                                     | US-08, US-10        | Servicios          | Demostración                                               | Sí           |
| PI-19         | Cambios de estado del alumno contra la base                        | US-06, US-07, US-08 | Servicios          | Comunes                                                    | Parcial      |

PI-07 a PI-09 cubren riesgos de control de acceso que los tests unitarios no ven, porque con mocks los permisos nunca salen de la base. PI-10 reúne los pasos de PI-01 y PI-02 que ocurren en el navegador. PI-11 a PI-19 son del Sprint 2: planes y precios (PI-11 a PI-14) y alumnos (PI-15 a PI-19).

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

#### PI-11 — Alta de plan con su precio inicial

**US:** US-11, US-12 · **Precondición:** escenario de demostración cargado; sesión de Marina.

1. Marina crea el plan mensual "Básico 2 días" (2 clases por semana, 5 días de gracia) a $25.000.
2. Marina intenta crear un plan exclusivo de Funcional Grupal después de que esa actividad quedó dada de baja.
3. Marina intenta crear otro plan llamado "BÁSICO 2 DÍAS".
4. Se intenta guardar, directo en la base, una clase suelta con clases por semana y un precio de $0.

**Resultado esperado:** el paso 1 responde 201 y en la base quedan el plan y un único precio de $25.000, vigente desde hoy y sin fecha de cierre; la respuesta lo informa como precio vigente y sin precio programado. El paso 2 responde 400 y no queda ningún plan ni precio. El paso 3 responde 409 ("Ya existe un plan vigente con ese nombre"): el nombre se compara sin distinguir mayúsculas, y sigue habiendo un solo plan. En el paso 4 la base rechaza los dos registros por las restricciones del DER (`ck_planes_x3` y `ck_plan_precios_x1`), aunque no pasen por la API.

**Automatizado:** Sí (D-01 a D-04).

#### PI-12 — Modificación y baja de planes

**US:** US-11 · **Precondición:** escenario de demostración cargado; sesión de Marina; plan "Básico 2 días" creado.

1. Marina cambia la frecuencia del plan a 3 clases por semana.
2. Marina da de baja el plan y consulta el listado, primero sin filtros y después con `incluirBajas=true`.
3. Marina intenta darlo de baja otra vez y cambiarle la frecuencia.

**Resultado esperado:** el paso 1 responde 200 y la base guarda la nueva frecuencia. En el paso 2 la baja es lógica: el plan queda con `fecha_baja` de hoy y conserva su precio; no aparece en el listado por defecto y sí con `incluirBajas=true`. En el paso 3 la segunda baja responde 409 y la edición 404, y la frecuencia guardada no cambia.

**Automatizado:** Sí (D-05 a D-07).

#### PI-13 — Actualización de precio con fecha de vigencia

**US:** US-12 · **Precondición:** escenario de demostración cargado; sesión de Marina; plan "Básico 2 días" a $25.000 desde hoy.

1. Marina carga un aumento a $28.000 que rige dentro de 30 días, y consulta el plan y su historial de precios.
2. Marina carga otro aumento, a $27.000, que rige dentro de 10 días.
3. Marina intenta cargar un precio con fecha de ayer.
4. Marina intenta cargar un precio que rige desde hoy, el mismo día en que empezó el actual.
5. Marina da de baja el plan e intenta cargarle un precio.

**Resultado esperado:** el paso 1 responde 201; en la base el precio de $25.000 queda cerrado el día anterior al aumento y el de $28.000 queda abierto. El plan informa $25.000 como precio vigente y $28.000 como programado, y el historial devuelve los dos, del más nuevo al más viejo. En el paso 2 el aumento de $28.000, que nunca rigió, se reemplaza: quedan el de $25.000, cerrado el día anterior al nuevo, y el de $27.000 abierto. El paso 3 responde 400, el paso 4 responde 409 ("El plan ya tiene un precio que empezó a regir hoy") y el paso 5 responde 409; en los tres la base no cambia.

**Automatizado:** Parcial (D-08 a D-12). El criterio de aceptación "un cobro anterior a la fecha de vigencia aplica el precio anterior y uno posterior aplica el nuevo" depende del cobro de cuotas (US-15 a US-17, Sprint 3). La consulta del precio que rige a una fecha (`IInfoPlanes.precioVigente`) ya está y tiene tests unitarios; el test de integración se suma con el cobro.

#### PI-14 — Permisos sobre planes

**US:** US-02, US-11 · **Precondición:** escenario de demostración cargado; plan "Básico 2 días" creado; sesión de Lucía (profesora).

1. Lucía consulta el listado de planes y el historial de precios del plan.
2. Lucía intenta crear un plan y cargarle un precio al existente.

**Resultado esperado:** el paso 1 responde 200 con el plan: la profesora carga pre-inscripciones (US-05) y la matriz inicial le da `PLANES_VER`. Los dos intentos del paso 2 responden 403, porque editar planes y precios exige el rol Propietaria y `PLANES_EDITAR`, y la base sigue con un plan y un precio.

**Automatizado:** Sí (D-13, D-14).

#### PI-15 — Pre-inscripción de un alumno mayor

**US:** US-05 · **Precondición:** escenario de demostración cargado; sesiones de Marina y de Lucía.

1. Marina da de alta a Ana López, mayor de edad, con su email, e Ana intenta iniciar sesión.
2. Lucía da de alta a otro alumno.
3. Marina intenta dar de alta un alumno con un DNI que ya es de otro alumno.
4. Marina intenta dar de alta un alumno con el email de otro usuario, y otro mayor de edad sin email.

**Resultado esperado:** el paso 1 responde 201; en la base el alumno y su usuario quedan `INACTIVO` y sin roles, y el login de Ana responde 403 hasta que se confirme su primer pago. El paso 2 responde 201: la matriz inicial le da a la profesora `ALUMNOS_EDITAR`. El paso 3 responde 409 con el código `ALUMNO_EXISTENTE` y el id del alumno que ya existe, para que el front ofrezca abrir su ficha. En el paso 4 el email repetido responde 409 y el mayor sin email 400. Ninguno de los rechazos deja usuarios ni alumnos nuevos.

**Automatizado:** Sí (E-01 a E-04).

#### PI-16 — Alumno menor con tutor

**US:** US-05, US-06 · **Precondición:** escenario de demostración cargado; sesión de Marina.

1. Marina intenta dar de alta a Tomás, menor de edad, sin tutor.
2. Marina da de alta a Tomás con su madre, Laura Pérez, como tutora nueva.
3. Marina da de alta a Sofía, hermana de Tomás, con los mismos datos de tutora.
4. Marina intenta dar de alta a un menor con email y a otro con un tutor menor de edad.

**Resultado esperado:** el paso 1 responde 400 y no se guarda nadie. En el paso 2 Laura queda como usuario `INACTIVO` (entra al sistema cuando se confirme el pago), Tomás queda sin email y vinculado a ella. En el paso 3 Laura se reutiliza: sigue habiendo un solo usuario con su DNI, a cargo de dos alumnos. Los dos intentos del paso 4 responden 400 y la base no cambia.

**Automatizado:** Sí (E-05 a E-08).

#### PI-17 — Modificación de datos del alumno

**US:** US-06, US-09 · **Precondición:** escenario de demostración cargado; sesión de Marina; Ana y Tomás dados de alta como en PI-15 y PI-16.

1. Marina cambia el teléfono de Ana.
2. Marina corrige la fecha de nacimiento de Tomás a una de mayor de edad, primero sin email y después con email.
3. Marina intenta cambiarle a Ana el DNI por el de otro alumno.

**Resultado esperado:** el paso 1 responde 200 y el teléfono queda guardado en su usuario. En el paso 2 el cambio sin email responde 400 y Tomás conserva a su tutora; con email responde 200 y la tutora se quita, porque un mayor de edad entra al sistema con su propia cuenta. El paso 3 responde 409 y el DNI de Ana no cambia. Cada cambio aceptado queda registrado en el log con quién lo hizo (evento `ALUMNO_MODIFICADO`).

**Automatizado:** Sí (E-09 a E-11).

#### PI-18 — Búsqueda y consulta de alumnos

**US:** US-08, US-10 · **Precondición:** escenario de demostración cargado; sesiones de Marina y de Lucía.

1. Con Juan Pérez, un menor a cargo de una tutora de apellido Giménez y otro alumno de apellido Gómez, Marina busca "PEREZ", "gimenez", el DNI exacto de Juan, un DNI incompleto y un texto sin coincidencias.
2. Con un alumno activo y uno dado de baja, Marina lista sin filtros y con `incluirBajas=true`.
3. Con cinco alumnos, Marina pide la segunda página de a dos.
4. Lucía intenta listar, abrir la ficha y modificar a un alumno.

**Resultado esperado:** en el paso 1 "PEREZ" encuentra a Pérez y "gimenez" al menor de Giménez: la búsqueda no distingue acentos ni mayúsculas e incluye el nombre del tutor. El DNI exacto encuentra a Juan; el incompleto y el texto sin coincidencias devuelven una página vacía con `total: 0`. En el paso 2 el dado de baja no aparece por defecto y sí al pedirlo. En el paso 3 la página trae Castro y Díaz (orden por apellido) con `total: 5`. En el paso 4 los tres pedidos responden 403 y el alumno no cambia: hasta que existan las inscripciones, que dicen qué alumnos tiene a cargo cada profesora, la consulta y la edición son solo de la propietaria.

**Automatizado:** Sí (E-12 a E-15).

#### PI-19 — Cambios de estado del alumno contra la base

**US:** US-06, US-07, US-08 · **Precondición:** catálogo de seguridad cargado. Estas operaciones las va a usar la inscripción (US-07 y US-08) y todavía no tienen endpoint, así que se prueba el componente `Alumno` sobre la base real.

1. Se activa dos veces a un alumno mayor, que después inicia sesión.
2. Se activa a un menor con tutora, y la tutora inicia sesión.
3. Se da de baja a un alumno activo, que intenta iniciar sesión, y después se lo reactiva.

**Resultado esperado:** en el paso 1 el alumno y su usuario quedan `ACTIVO`, con el rol `ALUMNO` una sola vez, y el login responde 200. En el paso 2 la tutora recibe el rol `TUTOR` y puede entrar; el menor no recibe roles. En el paso 3 el alumno queda `BAJA` con su fecha de baja y su login responde 403; al reactivarlo vuelve a `ACTIVO`, sin fecha de baja, y puede entrar de nuevo. El alumno nunca se borra.

**Automatizado:** Parcial (F-01 a F-03). La activación y la baja por HTTP se prueban cuando existan los endpoints de inscripción.

## 7. Tests automatizados

91 tests en seis archivos:

| Archivo | Ubicación                                                                       | Tests            | Casos                             |
| :-----: | :------------------------------------------------------------------------------ | :--------------- | :-------------------------------- |
|    A    | `back/src/__tests__/integracion/control-de-acceso.integration.test.ts`          | 41 (A-01 a A-41) | PI-01, PI-02, PI-03, PI-07, PI-08 |
|    B    | `back/src/__tests__/integracion/actividades-y-horarios.integration.test.ts`     | 15 (B-01 a B-15) | PI-04, PI-05, PI-06               |
|    C    | `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts`           | 3 (C-01 a C-03)  | PI-09                             |
|    D    | `back/src/__tests__/integracion/planes.integration.test.ts`                     | 14 (D-01 a D-14) | PI-11, PI-12, PI-13, PI-14        |
|    E    | `back/src/__tests__/integracion/alumnos.integration.test.ts`                    | 15 (E-01 a E-15) | PI-15, PI-16, PI-17, PI-18        |
|    F    | `back/src/modules/gestion-personas/alumno/__tests__/alumno.integration.test.ts` | 3 (F-01 a F-03)  | PI-19                             |

| Tests       | Qué verifican                                                                                                                                                                   | Caso  |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---- |
| A-01, A-02  | 401 sin token o con un token firmado con otro secreto                                                                                                                           | PI-02 |
| A-03        | Un correo no dado de alta no inicia sesión ni crea ninguna persona                                                                                                              | PI-02 |
| A-04        | El login vincula la cuenta de Google y `/auth/me` devuelve los permisos de la base                                                                                              | PI-01 |
| A-05, A-06  | 401 si el usuario ya no existe; 403 si está dado de baja, aunque el token siga vigente                                                                                          | PI-02 |
| A-07 a A-26 | GET de usuarios, matriz, actividades, horarios y profesoras con cada rol (un test por ruta y rol): usuarios y matriz 200 solo para Propietaria; el resto 200 para todos         | PI-03 |
| A-27 a A-30 | Solo la propietaria crea actividades; con los otros roles no queda nada guardado                                                                                                | PI-03 |
| A-31        | Un usuario con varios roles suma los permisos de todos                                                                                                                          | PI-01 |
| A-32 a A-34 | Un alumno ve sus datos, no los de otro, y no puede cambiar su propio estado                                                                                                     | PI-07 |
| A-35 a A-38 | Los roles del token no cuentan; un permiso o rol quitado deja de valer con el mismo token; no se otorgan permisos exclusivos de la propietaria                                  | PI-08 |
| A-39 a A-41 | Profesora, Alumno y Tutor no modifican ni dan de baja actividades ni asignan horarios, y la base queda igual                                                                    | PI-03 |
| B-01 a B-04 | Cupo obligatorio en personalizadas; el horario sin cupo propio toma el de la actividad; el cupo propio manda; grupal sin cupo                                                   | PI-04 |
| B-05 a B-09 | Superposición de horarios de una misma profesora (también la propietaria); dos profesoras a la misma hora; horario invertido; profesora sin el rol                              | PI-05 |
| B-10 a B-13 | Descripción visible en todos los horarios; baja bloqueada con horarios activos; baja sin horarios; no pasar a personalizada sin cupo                                            | PI-06 |
| B-14, B-15  | No se asigna un horario en domingo ni se mueve uno existente a ese día; la base queda igual                                                                                     | PI-05 |
| C-01 a C-03 | Volver a correr la carga no pisa permisos quitados, repone los críticos de la propietaria y no duplica nada                                                                     | PI-09 |
| D-01 a D-04 | Alta de plan con un único precio vigente desde hoy; actividad exclusiva dada de baja; nombre repetido sin distinguir mayúsculas; restricciones del DER en la base               | PI-11 |
| D-05 a D-07 | Cambio de frecuencia; baja lógica que saca el plan del listado; no hay segunda baja ni edición de un plan dado de baja                                                          | PI-12 |
| D-08 a D-12 | Aumento futuro que cierra el precio actual el día anterior; reemplazo de un aumento programado; fecha pasada; precio que empieza el mismo día que el vigente; plan dado de baja | PI-13 |
| D-13, D-14  | La profesora ve los planes y su historial de precios, pero no crea planes ni carga precios; la base queda igual                                                                 | PI-14 |
| E-01 a E-04 | Alta de un mayor inactivo, sin roles ni acceso; alta por la profesora; DNI de otro alumno (`ALUMNO_EXISTENTE`); email repetido y mayor sin email                                | PI-15 |
| E-05 a E-08 | Menor sin tutor; menor con tutora nueva inactiva; hermanos con la misma tutora; menor con email y tutor menor de edad                                                           | PI-16 |
| E-09 a E-11 | Cambio de teléfono; menor que pasa a mayor (sin email se rechaza, con email pierde el tutor); DNI de otro usuario                                                               | PI-17 |
| E-12 a E-15 | Búsqueda sin acentos, por tutor y por DNI exacto; dados de baja fuera del listado; paginación por apellido con total; la profesora todavía no consulta ni edita                 | PI-18 |
| F-01 a F-03 | Activación de un mayor (rol `ALUMNO`, idempotente) y de un menor (rol `TUTOR` a su tutora); baja que corta el acceso y reactivación que lo devuelve                             | PI-19 |

### 7.1 Verificación de que los tests detectan fallas

Se rompió a propósito cada regla, se comprobó que algún test fallara y se restauró el código:

| Regla rota                                                                            | Tests que fallaron                                                                                         |
| :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| `requierePermiso` deja pasar cualquier pedido                                         | A-08 a A-10, A-33 a A-37. El resto siguió en verde por la segunda barrera `requiereRol("PROPIETARIA")`     |
| El cupo de la actividad manda sobre el cupo propio del horario                        | B-03 (la primera versión no lo detectaba; se sumó un horario con cupo propio sobre una actividad con cupo) |
| No se verifica que la actividad tenga horarios activos antes de la baja               | B-11                                                                                                       |
| El día de la semana vuelve a aceptar el domingo (`max(7)`)                            | B-14, B-15                                                                                                 |
| El precio anterior se cierra el mismo día que empieza el nuevo, en vez del día previo | D-08, D-09                                                                                                 |
| El aumento programado no se borra al cargar uno con fecha anterior                    | D-09                                                                                                       |
| No se detecta un precio que empezó el mismo día que el nuevo                          | D-11                                                                                                       |
| Se acepta una fecha de vigencia pasada                                                | D-10                                                                                                       |
| Se acepta un precio para un plan dado de baja                                         | D-12                                                                                                       |
| No se valida el nombre repetido                                                       | D-03                                                                                                       |
| Se acepta como exclusiva una actividad dada de baja                                   | D-02                                                                                                       |
| El listado incluye los planes dados de baja                                           | D-06                                                                                                       |
| Se permite dar de baja dos veces o editar un plan dado de baja (una regla por vez)    | D-07                                                                                                       |
| La matriz inicial no le da `PLANES_VER` a la profesora                                | D-13                                                                                                       |
| Crear planes y cargar precios ya no exige rol Propietaria ni `PLANES_EDITAR`          | D-14                                                                                                       |
| Se acepta un menor sin tutor                                                          | E-05                                                                                                       |
| Se acepta un menor con email                                                          | E-08                                                                                                       |
| Se acepta un mayor sin email, al darlo de alta o al modificarlo                       | E-04, E-10                                                                                                 |
| El tutor existente no se reutiliza                                                    | E-07                                                                                                       |
| El DNI de otro alumno responde con el 409 genérico en lugar de `ALUMNO_EXISTENTE`     | E-03                                                                                                       |
| No se valida el email de otro usuario                                                 | E-04                                                                                                       |
| Se acepta un tutor menor de edad                                                      | E-08                                                                                                       |
| El tutor no se quita cuando el alumno pasa a ser mayor                                | E-10                                                                                                       |
| La búsqueda distingue acentos, o no incluye el nombre del tutor                       | E-12 (una vez por cada regla)                                                                              |
| El listado incluye a los dados de baja                                                | E-13                                                                                                       |
| El listado deja de ordenar por apellido                                               | E-13, E-14                                                                                                 |
| La profesora puede consultar y editar alumnos                                         | E-15                                                                                                       |
| El alta deja al usuario del alumno `ACTIVO`                                           | E-01                                                                                                       |
| La profesora pierde `ALUMNOS_EDITAR` en la matriz inicial                             | E-02                                                                                                       |
| La activación vuelve a asignar un rol que ya tiene                                    | F-01                                                                                                       |
| La activación de un menor da el rol `ALUMNO` en lugar de `TUTOR` a su tutora          | F-02                                                                                                       |
| La baja no inactiva el usuario del alumno                                             | F-03                                                                                                       |

Además, apuntada a la base de desarrollo (`mifr`), las pruebas se negaron a correr y no tocaron datos.

## 8. Registro de ejecución y defectos

### 8.1 Ejecuciones completas

| Fecha      | Motivo                                                                | Tests | Resultado    | Duración | Observaciones                                                                                                 |
| :--------- | :-------------------------------------------------------------------- | :---: | :----------- | :------: | :------------------------------------------------------------------------------------------------------------ |
| 07/10/2026 | Primera corrida                                                       |  41   | 41 aprobados |  4,4 s   | Pasaron también los 669 tests unitarios                                                                       |
| 07/10/2026 | PI-03 (paso 4) a PI-06 automatizados                                  |  57   | 57 aprobados |  7,0 s   | Fallas provocadas detectadas en cupo efectivo y baja de actividades                                           |
| 07/10/2026 | Datos de prueba con las actividades del Estudio Inicial (sin Pilates) |  57   | 57 aprobados |  14,5 s  | Pasaron también los 669 tests unitarios                                                                       |
| 07/10/2026 | El centro no abre los domingos (PI-05, pasos 6 y 7)                   |  59   | 59 aprobados |  13,1 s  | Pasaron también los 673 tests unitarios; falla provocada detectada                                            |
| 08/10/2026 | Planes y precios con vigencia (PI-11 a PI-14)                         |  73   | 73 aprobados |  27,0 s  | Pasaron también los 763 tests unitarios; las 12 fallas provocadas fueron detectadas                           |
| 08/10/2026 | Alumnos y tutores (PI-15 a PI-19); la profesora ve los planes (PI-14) |  91   | 91 aprobados |  28,3 s  | Pasaron también los 854 tests unitarios; las 19 fallas provocadas fueron detectadas                           |
| 08/10/2026 | Planes y alumnos en el escenario de demostración                      |  91   | 91 aprobados |  33,3 s  | Los tests de planes y alumnos pasan a contar contra lo que había; las fallas provocadas se vuelven a detectar |

### 8.2 Resultado por caso

| Caso          | Fecha      | Ejecutó           | Resultado          | Observaciones                                                    |
| :------------ | :--------- | :---------------- | :----------------- | :--------------------------------------------------------------- |
| PI-01 a PI-09 | 07/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                            |
| PI-10         | —          | —                 | Pendiente          | Verificación manual en el navegador                              |
| PI-11, PI-12  | 08/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                            |
| PI-13         | 08/10/2026 | Francisco Andrade | Aprobado (parcial) | Pasan D-08 a D-12; falta el precio aplicado al cobrar (Sprint 3) |

### 8.3 Defectos

| ID  | Caso | Descripción                                                 | Severidad | Responsable | Corregido en |
| :-- | :--- | :---------------------------------------------------------- | :-------- | :---------- | :----------- |
| —   | —    | Sin defectos en las corridas del 07/10/2026 y el 08/10/2026 | —         | —           | —            |

Los defectos se numeran D-01, D-02…

## 9. Puntos a confirmar

| Caso  | Punto                                                                                                                                                                                                                                                                                                                                                 | Estado  |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| PI-06 | Baja de una actividad con horarios activos: el backend la rechaza con 409 y pide dar de baja los horarios primero (US-03 / CA-03). Falta confirmarlo con la propietaria; si prefiere darla de baja y desasignar los horarios, es un cambio de regla. Cuando existan inscripciones se revisa si el bloqueo se limita a horarios con alumnos inscriptos | Abierto |
| PI-14 | La profesora carga pre-inscripciones (US-05) y necesita ver los planes. Resuelto: la matriz inicial le da `PLANES_VER` y `ALUMNOS_EDITAR`. En una base ya cargada (producción) la carga del catálogo no agrega permisos a permisos que ya existían: la propietaria se los otorga desde la matriz                                                      | Cerrado |
| PI-18 | La profesora todavía no consulta ni edita alumnos: US-10 le permite ver solo a los que tiene a cargo, y eso sale de las inscripciones. Cuando existan, PI-18 pasa a verificar que ve a sus alumnos y no a los demás                                                                                                                                   | Abierto |
| PI-19 | La activación, la baja y la reactivación se prueban sobre el componente porque todavía no tienen endpoint. Cuando la inscripción las use, se suman los casos por HTTP                                                                                                                                                                                 | Abierto |

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

| Versión | Fecha      | Observaciones                                                                                                                                                | Encargado         |
| :-----: | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------- |
|   1.1   | 07/10/2026 | Casos PI-01 a PI-10 del Sprint 1 y tests A-01 a A-41, B-01 a B-13 y C-01 a C-03                                                                              | Francisco Andrade |
|   1.2   | 07/10/2026 | PI-05: pasos 6 y 7 (el centro no abre los domingos) y tests B-14 y B-15                                                                                      | Francisco Andrade |
|   1.3   | 08/10/2026 | Casos PI-11 a PI-14 (planes y precios, Sprint 2), fábrica `crearPlan` y tests D-01 a D-14                                                                    | Francisco Andrade |
|   1.4   | 08/10/2026 | Casos PI-15 a PI-19 (alumnos y tutores), PI-14 actualizado (la profesora ve los planes), fábrica `crearAlumno` y tests E-01 a E-15 y F-01 a F-03             | Francisco Andrade |
|   1.5   | 08/10/2026 | Planes y alumnos en el escenario de demostración (sección 4.1); D-02, D-03, D-06, D-13, D-14, E-02, E-13 y E-14 cuentan o filtran sin depender del escenario | Francisco Andrade |
