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

Estas pruebas ejecutan el backend completo sobre una base de datos PostgreSQL real. En cada caso se verifica qué responde la API y qué queda guardado en la base. Corresponden a los casos PI-01 a PI-23.

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
| Parámetros del sistema | Los mismos del seed de producción (`cargarParametrosIniciales`), con su valor inicial, antes de cada test. Un test que necesita otro valor lo cambia en la base |
| Usuarios                         | Fábrica `crearUsuario` (`back/src/__tests__/integracion/fabricas.ts`) con los roles y el estado que necesite cada test. Correos ficticios: `usuario1@example.com`…                                                                                                                                                     |
| Sesión                           | `entorno.iniciarSesion(correo)`, que pasa por el login real con Google simulado                                                                                                                                                                                                                                        |
| Planes                           | Fábrica `crearPlan` (`back/src/__tests__/integracion/fabricas.ts`): plan mensual de 2 clases por semana con un único precio abierto ($25.000 desde el 01/01/2026), o con el nombre, tipo, precio, fecha y actividad exclusiva que se pidan. La usan los casos de planes y la van a usar los de inscripciones           |
| Alumnos                          | Fábrica `crearAlumno` (`back/src/__tests__/integracion/fabricas.ts`): alumno con su usuario, pre-inscripto (`INACTIVO`, sin roles) y mayor de edad por defecto; se le puede pasar nombre, apellido, DNI, email (o `null` para un menor), fecha de nacimiento, estado y tutor. La van a usar los casos de inscripciones |
| Horarios                         | Fábrica `crearHorarioDePrueba` (`back/src/__tests__/integracion/fabricas.ts`): horario directo para el test con actividad, profesora, día, horas y cupo propios configurables                                                                                                                                       |
| Cuotas y pagos                   | `armarCuotasYPagos` (`back/src/__tests__/integracion/cobro.ts`): arma el subsistema con los componentes y repositorios reales sobre la base de prueba. Repite el cableado de `composicion.ts`, con los calculadores reales, para poder pasarle otro `PagoRepository` y simular una falla al guardar el pago (PI-35). Los flujos por HTTP (PI-42, PI-43) usan la API montada |
| Escenario de demostración        | Seed de desarrollo (`cargarDatosDemo`, `back/src/shared/db/datos-demo.ts`). `pnpm --filter back db:seed:demo` lo carga en la base local y los tests en la base de prueba, así el mismo escenario se recorre a mano (Swagger o front) y en los tests                                                                    |

Cuando las pruebas necesiten otro tipo de dato, se agrega una fábrica reutilizable en `fabricas.ts`, igual que `crearUsuario`.

### 4.1 Escenario de demostración

Incluye planes, dos alumnos pre-inscriptos y uno activo, cada uno con su inscripción. Los casos que necesitan otros los crean con `crearUsuario`, `crearPlan` y `crearAlumno`, o por la API, y cuentan contra lo que ya había para no depender del escenario.

**Usuarios** (los tres tienen registro de profesora):

| Usuario     | Correo                    | Roles                   | Especialidad                |
| :---------- | :------------------------ | :---------------------- | :-------------------------- |
| Marina Sosa | `marina.sosa@example.com` | Propietaria + Profesora | Entrenamiento personalizado |
| Lucía Gómez | `lucia.gomez@example.com` | Profesora               | Entrenamiento funcional     |
| Carla Ruiz  | `carla.ruiz@example.com`  | Profesora               | Entrenamiento personalizado |

**Actividades** (las grupales con cupo 12):

| Actividad     | Código               | Modalidad     | Cupo | Profesora   | Pide peso y talla |
| :------------ | :------------------- | :------------ | :--- | :---------- | :---------------- |
| Funcional     | `FUNCIONAL`          | Grupal        | 12   | Lucía Gómez | No                |
| Funcional +45 | `FUNCIONAL_45`       | Grupal        | 12   | Lucía Gómez | No                |
| Training      | `TRAINING`           | Grupal        | 12   | Lucía Gómez | No                |
| Personalizado | `ENTRENAMIENTO_PERS` | Personalizada | 4    | Carla Ruiz  | Sí                |
| Kid Fit       | `KID_FIT`            | Grupal        | 12   | Carla Ruiz  | No                |
| GAP           | `GAP`                | Grupal        | 12   | Carla Ruiz  | No                |
| HIIT          | `HIIT`               | Grupal        | 12   | Marina Sosa | No                |
| Combat        | `COMBAT`             | Grupal        | 12   | Marina Sosa | No                |

**Horarios:** la grilla semanal del centro, 38 clases de una hora. Cada actividad la da siempre la misma profesora, así ninguna tiene dos clases a la misma hora. El sábado no hay clases.

| Hora  | Lunes, miércoles y viernes | Martes y jueves |
| :---- | :------------------------- | :-------------- |
| 08:00 | Funcional                  | —               |
| 09:00 | Funcional +45              | Kid Fit         |
| 15:00 | Personalizado              | Funcional       |
| 16:00 | HIIT                       | GAP             |
| 17:00 | —                          | Kid Fit         |
| 18:00 | —                          | Personalizado   |
| 19:00 | Training                   | HIIT            |
| 20:00 | HIIT                       | Combat          |
| 21:00 | Funcional                  | —               |
| 22:00 | Funcional                  | —               |

Ningún horario tiene cupo propio salvo el Training del viernes, con 15 (CA-07): los demás toman el de su actividad.

**Planes** (precios vigentes desde el 01/01/2026):

| Plan                 | Tipo         | Clases por semana | Exclusivo de                | Profesora única |  Precio |
| :------------------- | :----------- | :---------------: | :-------------------------- | :-------------: | ------: |
| Básico               | Mensual      |         2         | —                           |       No        | $25.000 |
| Intermedio           | Mensual      |         3         | —                           |       No        | $30.000 |
| Personalizado 2 días | Mensual      |         2         | Personalizado               |       Sí        | $45.000 |
| Clase suelta         | Clase suelta |         —         | —                           |       No        |  $6.000 |

**Alumnos** (los pre-inscriptos quedan `INACTIVO` hasta el primer pago; Valentina está activa como si ya hubiera pagado, con el rol `ALUMNO`):

| Alumno       | DNI      | Edad  | Email                      | Tutor                                                               |
| :----------- | :------- | :---- | :------------------------- | :------------------------------------------------------------------ |
| Sofía Medina | 38111222 | Mayor | `sofia.medina@example.com` | —                                                                   |
| Mateo Romero | 52111222 | Menor | —                          | Paula Romero (DNI 31222333, `paula.romero@example.com`, `INACTIVO`) |
| Valentina Herrera | 39222333 | Mayor | `valentina.herrera@example.com` | — (activa) |

**Inscripciones** (con el precio vigente del plan y desde el día en que se carga el escenario):

| Alumno            | Plan                 | Profesora a cargo | Estado         | Horarios                                           |
| :---------------- | :------------------- | :---------------- | :------------- | :------------------------------------------------- |
| Sofía Medina      | Básico               | Lucía Gómez       | `PREINSCRIPTA` | Funcional, lunes y miércoles 08:00                 |
| Mateo Romero      | Personalizado 2 días | Carla Ruiz        | `PREINSCRIPTA` | Personalizado, martes y jueves 18:00               |
| Valentina Herrera | Intermedio           | Carla Ruiz        | `ACTIVA`       | Personalizado, martes y jueves 18:00               |

Los horarios nuevos deben caer dentro del horario de atención, de lunes a sábado de 07:00 a 23:00 (US-04); fuera de esa franja la API responde 400 antes de evaluar otras reglas. El centro no abre los domingos: la base admite el día 7 (el DER no se cambia), pero la API lo rechaza.

## 5. Matriz de trazabilidad

Cada US del sprint en curso tiene que quedar cubierta por al menos dos casos de integración. Las US de sprints futuros figuran para que la matriz se complete a medida que avanza el proyecto.

| US    | Historia                                                  | Sprint | Casos                                                         | Automatización                                                                         |
| :---- | :-------------------------------------------------------- | :----: | :------------------------------------------------------------ | :------------------------------------------------------------------------------------- |
| US-01 | Inicio de sesión con Google Auth                          |   1    | PI-01, PI-02, PI-03, PI-07, PI-08, PI-10, PI-28, PI-29        | Sí, salvo PI-10 (Manual)                                                               |
| US-02 | Definición de permisos por rol                            |   1    | PI-01 a PI-03, PI-05, PI-07 a PI-10, PI-14, PI-28, PI-29      | Sí, salvo PI-10 (Manual)                                                               |
| US-03 | Alta y administración de actividades y cupos              |   1    | PI-03, PI-04, PI-06, PI-37                                    | Sí                                                                                     |
| US-04 | Asignación de profesoras y horarios a actividades         |   1    | PI-03, PI-04, PI-05, PI-06, PI-24, PI-27, PI-38, PI-46        | Sí                                                                                     |
| US-05 | Pre-inscripción de alumno nuevo                           |   2    | PI-15, PI-16, PI-20, PI-27, PI-30, PI-31, PI-37 a PI-39, PI-47 | Sí, alumno, inscripción, horarios, cupos, peso y talla y reserva que vence               |
| US-06 | Asociación de tutor a alumno menor de edad                |   2    | PI-16, PI-17, PI-19, PI-31                                    | Sí                                                                                     |
| US-07 | Alta definitiva al confirmarse el primer pago             |   2    | PI-19, PI-21, PI-34, PI-35, PI-38, PI-42 a PI-44             | Sí                                                                                     |
| US-08 | Baja lógica de alumno                                     |   2    | PI-18, PI-19, PI-22, PI-41, PI-44, PI-45                      | Sí                                                                                     |
| US-09 | Modificación de datos de alumno                           |   2    | PI-17, PI-23, PI-25                                           | Sí, cambio de plan y horarios (las cuotas corresponden al Sprint 3)                    |
| US-10 | Consulta y búsqueda de alumnos                            |   2    | PI-18, PI-20, PI-25, PI-26, PI-30, PI-32, PI-36, PI-45        | Sí (el filtro por estado de cuota y el historial en la ficha, pendientes)              |
| US-11 | Alta y edición de planes vigentes                         |   2    | PI-06, PI-11, PI-12, PI-14                                    | Sí                                                                                     |
| US-12 | Actualización de precios con fecha de vigencia            |   2    | PI-11, PI-13, PI-40                                           | Sí                                                                                     |
| US-13 | Alta de descuentos y promociones temporales               |   4    |                                                               |                                                                                        |
| US-14 | Renovación o cambio de plan                               |   5    |                                                               |                                                                                        |
| US-15 | Registro de cobro en efectivo                             |   3    | PI-33 a PI-36, PI-40, PI-42                                   | Sí                                                                                     |
| US-16 | Registro de pago por transferencia con comprobante        |   3    | PI-33, PI-39, PI-43, PI-47, PI-48                             | Sí                                                                                     |
| US-17 | Aprobación o rechazo de transferencias                    |   3    | PI-33, PI-43                                                  | Sí                                                                                     |
| US-18 | Cálculo del estado de habilitación del alumno             |   3    | PI-39, PI-45, PI-47                                           | Sí: el parámetro `VENCIDOS_PUEDEN_ASISTIR` y el estado en la ficha y el listado        |
| US-19 | Control de efectivo pendiente de rendición                |   4    |                                                               |                                                                                        |
| US-20 | Registro de asistencia por clase                          |   3    |                                                               |                                                                                        |
| US-21 | Registro automático de inasistencias                      |   3    | PI-39, PI-47                                                  | Parcial: el parámetro `MINUTOS_CIERRE_ASISTENCIA`; el cierre, cuando exista            |
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
| US-32 | Panel público de disponibilidad                           |   5    | PI-46                                                         | Parcial: las actividades y sus días; los horarios, los cupos y la próxima clase quedan con sesión (decidido el 12/10/2026); la promoción, pendiente |
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
| PI-06         | Modificación y baja de actividades con horarios y planes           | US-03, US-04, US-11 | Servicios          | Demostración                                               | Sí           |
| PI-07         | Acceso a los datos propios                                         | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-08         | Los cambios de permisos rigen desde el pedido siguiente            | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-09         | Carga del catálogo de seguridad                                    | US-02               | Servicios          | Comunes                                                    | Sí           |
| PI-10         | Sesión en la interfaz: menú por rol, login cancelado y redirección | US-01, US-02        | Sistema–API        | Demostración                                               | Manual       |
| PI-11         | Alta de plan con su precio inicial                                 | US-11, US-12        | Servicios          | Demostración                                               | Sí           |
| PI-12         | Modificación y baja de planes                                      | US-11               | Servicios          | Demostración                                               | Sí           |
| PI-13         | Actualización de precio con fecha de vigencia                      | US-12               | Servicios          | Demostración                                               | Sí           |
| PI-14         | Permisos sobre planes                                              | US-02, US-11        | Servicios          | Demostración                                               | Sí           |
| PI-15         | Pre-inscripción de un alumno mayor                                 | US-05               | Servicios          | Demostración                                               | Sí           |
| PI-16         | Alumno menor con tutor                                             | US-05, US-06        | Servicios          | Demostración                                               | Sí           |
| PI-17         | Modificación de datos del alumno                                   | US-06, US-09        | Servicios          | Demostración                                               | Sí           |
| PI-18         | Búsqueda y consulta de alumnos                                     | US-08, US-10        | Servicios          | Demostración                                               | Sí           |
| PI-19         | Cambios de estado del alumno contra la base                        | US-06, US-07, US-08 | Servicios          | Comunes                                                    | Parcial      |
| PI-20         | Preinscripción, reglas de plan y cupo                              | US-05               | Servicios          | Demostración                                               | Sí           |
| PI-21         | Alta definitiva idempotente y revalidación de cupo                  | US-07               | Servicios          | Demostración                                               | Sí           |
| PI-22         | Baja del alumno y reactivación con historial                        | US-08               | Servicios          | Demostración                                               | Sí           |
| PI-23         | Cambio de plan y horarios                                           | US-09               | Servicios          | Demostración                                               | Sí           |
| PI-24         | Baja de un horario con alumnos inscriptos                           | US-04, US-08        | Servicios          | Demostración                                               | Sí           |
| PI-25         | La profesora ve y edita solo a los alumnos a su cargo               | US-09, US-10        | Servicios          | Demostración                                               | Sí           |
| PI-26         | Filtros por inscripción y ficha completa                            | US-10               | Servicios          | Demostración                                               | Sí           |
| PI-27         | Ocupación de los horarios                                           | US-04, US-05        | Servicios          | Demostración                                               | Sí           |
| PI-28         | Administración de roles y cuentas reservada a la propietaria        | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-29         | Identidad de la cuenta: DNI y fecha de nacimiento                   | US-01, US-02        | Servicios          | Comunes                                                    | Sí           |
| PI-30         | La profesora pre-inscribe solo a su cargo                           | US-05, US-10        | Servicios          | Demostración                                               | Sí           |
| PI-31         | El tutor en el alta de un menor                                     | US-05, US-06        | Servicios          | Demostración                                               | Sí           |
| PI-32         | Paginación de inscripciones                                         | US-10               | Servicios          | Demostración                                               | Sí           |
| PI-33         | Restricciones de cuotas y pagos en la base                          | US-15, US-16, US-17 | Servicios          | Demostración                                               | Sí           |
| PI-34         | El pago del alumno activo de la demostración                        | US-07, US-15        | Servicios          | Demostración                                               | Sí           |
| PI-35         | El primer pago y el alta definitiva se guardan juntos               | US-07, US-15        | Servicios          | Demostración, `armarCuotasYPagos`                          | Sí           |
| PI-36         | El pago adelantado y el historial de cuotas de la ficha             | US-10, US-15        | Servicios          | Demostración, `armarCuotasYPagos`                          | Sí           |
| PI-37         | Peso y talla al pre-inscribir en una actividad que los pide         | US-03, US-05        | Servicios          | Demostración                                               | Sí           |
| PI-38         | La reserva de cupo de una pre-inscripción sin pagar vence           | US-04, US-05, US-07 | Servicios          | Demostración                                               | Sí           |
| PI-39         | Carga de los parámetros del sistema                                 | US-05, US-16, US-18, US-21 | Servicios   | Comunes                                                    | Sí           |
| PI-40         | El cobro aplica el precio vigente el día del cobro                  | US-12, US-15        | Servicios          | Demostración, `armarCuotasYPagos`                          | Sí           |
| PI-41         | El detalle de la baja con el motivo OTRO                            | US-08               | Servicios          | Demostración                                               | Sí           |
| PI-42         | El cobro en efectivo por la API                                     | US-07, US-15        | Servicios          | Demostración                                               | Sí           |
| PI-43         | La transferencia informada y su revisión por la API                 | US-07, US-16, US-17 | Servicios          | Demostración                                               | Sí           |
| PI-44         | Reactivar a quien nunca pagó                                        | US-07, US-08        | Servicios          | Demostración                                               | Sí           |
| PI-45         | La situación de cuota en la ficha y el listado de alumnos           | US-08, US-10, US-18 | Servicios          | Demostración                                               | Sí           |
| PI-46         | Las actividades públicas del centro                                 | US-32, US-04        | Servicios          | Demostración                                               | Sí           |
| PI-47         | Los parámetros del sistema los ve y edita solo la propietaria      | US-05, US-16, US-18, US-21 | Servicios   | Comunes                                                    | Sí           |
| PI-48         | Los datos bancarios para transferir los ven el alumno y su tutor   | US-16               | Servicios          | Comunes                                                    | Sí           |

PI-07 a PI-09 cubren riesgos de control de acceso que los tests unitarios no ven, porque con mocks los permisos nunca salen de la base. PI-10 reúne los pasos de PI-01 y PI-02 que ocurren en el navegador. PI-11 a PI-27 son del Sprint 2: planes y precios (PI-11 a PI-14), alumnos (PI-15 a PI-19 y PI-25, PI-26) e inscripciones (PI-20 a PI-24 y PI-27). PI-28 a PI-32 salen de la auditoría de seguridad del backend (10/10/2026): cada uno prueba contra la base uno de los arreglos que resume `back/.claude/rules/seguridad.md`. PI-33 en adelante son de cuotas y pagos (Sprint 3); mientras el subsistema no esté montado en la API, se prueban sobre los componentes reales y la base, sin HTTP.

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
4. Una profesora, un alumno y un tutor intentan modificar y dar de baja Funcional, y asignarle a Carla un horario.

**Resultado esperado:** las escrituras de profesora, alumno y tutor responden 403 y la base queda sin cambios: ninguna actividad creada, la descripción de Funcional intacta, la actividad sigue activa y no aparece ningún horario nuevo. La de la propietaria responde 201 y queda persistida. Actividades, horarios y profesoras responden 200 para todos los roles. Usuarios y matriz de permisos responden 200 solo para la propietaria y 403 para el resto.

**Automatizado:** Sí (A-07 a A-30, A-39 a A-41).

#### PI-04 — Actividad personalizada → horario con cupo heredado

**US:** US-03, US-04 · **Precondición:** escenario de demostración cargado; sesión de Marina.

1. Marina intenta crear la actividad "Posing" (código `POSING`), personalizada y sin cupo.
2. La crea con cupo 3.
3. Le asigna a Carla el horario de Posing del lunes de 09:00 a 10:00, sin cupo propio.
4. Se consultan los horarios de Personalizado.
5. Le asigna a Carla un horario de Personalizado el lunes de 11:00 a 12:00, con cupo propio 2.
6. Se consultan los horarios de Training.
7. Marina crea "Funcional Sábado", grupal y sin cupo, y se la asigna a Lucía el sábado de 10:00 a 11:00.

**Resultado esperado:** el paso 1 falla con 400 por cupo obligatorio y la actividad no se guarda. El horario del paso 3 informa cupo efectivo 3, y los cinco de Personalizado informan 4: si el horario no tiene cupo propio, toma el de la actividad. El horario del paso 5 informa 2, y en el paso 6 los de Training del lunes y el miércoles informan 12 y el del viernes 15, porque el cupo propio del horario manda sobre el de la actividad. La actividad grupal del paso 7 se crea y se asigna sin cupo.

**Automatizado:** Sí (B-01 a B-04).

#### PI-05 — Validaciones al asignar profesora y horario

**US:** US-02, US-04 · **Precondición:** escenario de demostración cargado; sesión de Marina. Lucía da Training los lunes de 19:00 a 20:00, y Marina HIIT los viernes de 20:00 a 21:00.

1. Marina intenta asignarle a Lucía Personalizado el lunes de 18:30 a 19:30.
2. Marina se asigna a sí misma Funcional el lunes de 18:00 a 19:00.
3. Marina intenta asignarse Funcional el viernes de 20:30 a 21:30.
4. Marina intenta crear un horario que termina antes de empezar (de 10:00 a 09:00).
5. Marina le quita a Carla el rol Profesora e intenta asignarle Personalizado el viernes de 09:00 a 10:00.
6. Marina intenta asignarle a Lucía Funcional el domingo de 10:00 a 11:00.
7. Marina intenta pasar al domingo el horario del lunes de Lucía.
8. Marina le asigna a Lucía Funcional el sábado de 22:00 a 23:00 e intenta asignarle a Carla otro de 22:30 a 23:30.

**Resultado esperado:** los pasos 1 y 3 se rechazan con 409 por superposición ("La profesora ya tiene un horario superpuesto ese día"). El paso 2 se acepta: dos profesoras distintas pueden dictar a la misma hora. El paso 4 se rechaza con 400. En el paso 5 el rol se quita (200) y la asignación se rechaza con 404 ("Profesora no encontrada, inactiva o sin el rol PROFESORA"). Los pasos 6 y 7 se rechazan con 400 `VALIDATION_ERROR` ("El centro no abre los domingos"): no queda ningún horario en domingo y el de Lucía sigue el lunes. En el paso 8 el primero se acepta (201): una clase puede terminar a las 23:00, el cierre del centro. El segundo se rechaza con 400 ("La hora debe estar entre las 07:00 y las 23:00"). Ninguno de los rechazos deja un horario guardado.

**Automatizado:** Sí (B-05 a B-09, B-14, B-15, B-21).

#### PI-06 — Modificación y baja de actividades con horarios y planes

**US:** US-03, US-04, US-11 · **Precondición:** escenario de demostración cargado; sesión de Marina. Funcional tiene once horarios activos, todos de Lucía, y Sofía está inscripta los lunes y miércoles a las 8.

1. Marina cambia la descripción de Funcional.
2. Marina intenta dar de baja Funcional.
3. Marina crea una actividad nueva, sin horarios, y la da de baja.
4. Marina crea Yoga, grupal y sin cupo, e intenta cambiarla a personalizada sin indicar cupo.
5. Marina crea la actividad Yoga con dos horarios sin alumnos y la da de baja.
6. Marina crea la actividad Yoga con un horario sin alumnos y el plan "Yoga 2 días", exclusivo de Yoga, e intenta dar de baja Yoga.
7. Marina da de baja el plan "Yoga 2 días" y después da de baja Yoga. En el escenario siguen vigentes los planes que sirven para cualquier actividad.

**Resultado esperado:** la descripción nueva se ve en los once horarios de Funcional. La baja del paso 2 se rechaza con 409 ("La actividad tiene 2 horario(s) con alumnos inscriptos: hay que reubicarlos antes de darla de baja"); la actividad y sus once horarios siguen activos. El paso 3 se acepta y la actividad queda inactiva. El paso 4 se rechaza con 400 por cupo obligatorio y la actividad sigue siendo grupal. En el paso 5 la baja responde 200: Yoga queda inactiva y sus dos horarios, dados de baja (no se borran). El paso 6 se rechaza con 409 ("La actividad tiene planes vigentes que son solo de ella (Yoga 2 días): dalos de baja o pasalos a otra actividad antes de darla de baja"); la actividad, su horario y el plan siguen activos. En el paso 7 la baja responde 200 y el horario queda dado de baja: un plan exclusivo dado de baja y los planes para cualquier actividad no la frenan.

**Automatizado:** Sí (B-10 a B-13 y B-16 a B-18).

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
2. Marina intenta crear un plan exclusivo de Funcional después de que esa actividad quedó dada de baja.
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

**Automatizado:** Sí (D-08 a D-12). El criterio de aceptación "un cobro anterior a la fecha de vigencia aplica el precio anterior y uno posterior aplica el nuevo" se prueba con el cobro en PI-40.

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

**US:** US-08, US-10 · **Precondición:** escenario de demostración cargado; sesión de Marina.

1. Con Juan Pérez, un menor a cargo de una tutora de apellido Giménez y otro alumno de apellido Gómez, Marina busca "PEREZ", "gimenez", el DNI exacto de Juan, un DNI incompleto y un texto sin coincidencias.
2. Con un alumno activo y uno dado de baja, Marina lista sin filtros y con `incluirBajas=true`.
3. Con cinco alumnos, Marina pide la segunda página de a dos.

**Resultado esperado:** en el paso 1 "PEREZ" encuentra a Pérez y "gimenez" al menor de Giménez: la búsqueda no distingue acentos ni mayúsculas e incluye el nombre del tutor. El DNI exacto encuentra a Juan; el incompleto y el texto sin coincidencias devuelven una página vacía con `total: 0`. En el paso 2 el dado de baja no aparece por defecto y sí al pedirlo. En el paso 3 la página trae Castro y Díaz (orden por apellido) con `total: 5`. Lo que ve y edita una profesora se prueba en PI-25.

**Automatizado:** Sí (E-12 a E-14).

#### PI-19 — Cambios de estado del alumno contra la base

**US:** US-06, US-07, US-08 · **Precondición:** catálogo de seguridad cargado. Estas operaciones las va a usar la inscripción (US-07 y US-08) y todavía no tienen endpoint, así que se prueba el componente `Alumno` sobre la base real.

1. Se activa dos veces a un alumno mayor, que después inicia sesión.
2. Se activa a un menor con tutora, y la tutora inicia sesión.
3. Se da de baja a un alumno activo, que intenta iniciar sesión, y después se lo reactiva.

**Resultado esperado:** en el paso 1 el alumno y su usuario quedan `ACTIVO`, con el rol `ALUMNO` una sola vez, y el login responde 200. En el paso 2 la tutora recibe el rol `TUTOR` y puede entrar; el menor no recibe roles. En el paso 3 el alumno queda `BAJA` con su fecha de baja y su login responde 403; al reactivarlo vuelve a `ACTIVO`, sin fecha de baja, y puede entrar de nuevo. El alumno nunca se borra.

**Automatizado:** Parcial (F-01 a F-03). La activación y la baja por HTTP se cubren además en PI-21 y PI-22 (G-04 a G-08).

#### PI-20 — Preinscripción, reglas de plan, filtros y cupo

**US:** US-05, US-10 · **Precondición:** escenario de demostración cargado; sesión de Marina; alumno inactivo y horarios activos.

1. Marina crea una inscripción para el plan Básico y dos horarios funcionales.
2. Consulta las inscripciones filtrando por alumno, plan, profesora, actividad y estado.
3. Intenta duplicar el plan para el mismo alumno y asignar un horario cuyo cupo está completo.
4. Intenta usar una actividad incompatible con un plan exclusivo, horarios de otra profesora para un plan `profesora_unica` y más clases semanales que las permitidas.

**Resultado esperado:** el paso 1 responde 201 y guarda una inscripción `PREINSCRIPTA`, sus asignaciones vigentes y el precio del plan que rige hoy. El paso 2 devuelve esa inscripción. Los duplicados y cupos agotados responden 409; las incompatibilidades de plan, profesora y frecuencia responden 400. Ninguna operación rechazada agrega una inscripción.

**Automatizado:** Sí (G-01 a G-03).

#### PI-21 — Alta definitiva idempotente y revalidación de cupo

**US:** US-07 · **Precondición:** escenario de demostración cargado; inscripción `PREINSCRIPTA`. El alta definitiva la va a disparar el cobro (Sprint 3) por `IInfoInscripciones.activar`; hasta entonces el test la llama por esa interfaz, armada con el mismo composition root.

1. Se activa la inscripción dos veces seguidas, como un pago confirmado dos veces.
2. El alumno inicia sesión con su correo.
3. Se preinscriben dos alumnos en el último cupo, se reduce el cupo y se intenta activar la segunda, primero por HTTP y después por la interfaz.

**Resultado esperado:** el alumno y su usuario quedan `ACTIVO`, con un solo rol `ALUMNO`, y el login responde 200. En el paso 3 `POST /inscripciones/:id/activar` responde 404 (US-07: sin pago no hay alta), la activación por la interfaz falla por falta de cupo y la inscripción sigue `PREINSCRIPTA`.

**Automatizado:** Sí (G-04 y G-05).

#### PI-22 — Baja del alumno y reactivación con historial

**US:** US-08 · **Precondición:** escenario de demostración cargado; sesión de Marina; inscripción vigente.

1. Marina da de baja al alumno indicando `MUDANZA`.
2. Otro alumno ocupa el cupo liberado.
3. Marina intenta dar de baja nuevamente al primero.
4. Reactiva a un alumno dado de baja que ya había pagado su primera cuota (`POST /pagos/efectivo`), con cupo disponible y, en otro escenario, cuando otro alumno ya ocupa el cupo.

**Resultado esperado:** la baja responde 200; la inscripción queda `BAJA` con motivo y fecha, sus horarios se cierran y el alumno queda dado de baja. El segundo alumno puede ocupar el cupo. Repetir la baja responde 409. La reactivación de quien ya pagó crea otra inscripción `ACTIVA` y conserva la anterior; sin cupo responde 409 y el historial no cambia. Quien nunca pagó vuelve como pre-inscripto (PI-44).

**Automatizado:** Sí (G-06 a G-08).

#### PI-23 — Cambio de plan y horarios

**US:** US-09 · **Precondición:** escenario de demostración cargado; sesión de Marina; inscripción vigente.

1. Marina cambia el plan de una inscripción activa a otro plan.
2. En otro escenario intenta cambiar a un plan que requiere un horario sin cupo.
3. Actualiza los horarios de la inscripción; prueba además un cambio sin cupo y un intento de edición de una profesora.

**Resultado esperado:** el paso 1 responde 200 y, en una transacción, conserva la inscripción anterior como `BAJA` con motivo `CAMBIO_PLAN` y crea otra con el precio vigente. El cambio sin cupo responde 409 y deja intacta la inscripción original. Al cambiar horarios se cierran los anteriores y se agregan los nuevos; si no hay cupo responde 409 sin aplicar cambios. La profesora recibe 403. Las cuotas no se modifican: todavía no forman parte del modelo del Sprint 2.

**Automatizado:** Sí (G-09 a G-11).

#### PI-24 — Baja de un horario con alumnos inscriptos

**US:** US-04, US-08 · **Precondición:** escenario de demostración cargado; sesión de Marina; horario con cupo 3.

1. Se inscribe un alumno en el horario y Marina intenta darlo de baja.
2. Marina da de baja al alumno y vuelve a intentar la baja del horario.

**Resultado esperado:** el paso 1 responde 409 y el horario sigue sin `fecha_baja`: primero hay que reubicar a los inscriptos (US-04). En el paso 2 la baja responde 200 y el horario queda con su fecha de baja.

**Automatizado:** Sí (G-12).

#### PI-25 — La profesora ve y edita solo a los alumnos a su cargo

**US:** US-09, US-10 · **Precondición:** escenario de demostración cargado (Sofía a cargo de Lucía, Mateo a cargo de Carla); sesión de Lucía.

1. Lucía lista los alumnos, abre la ficha de Sofía y la de Mateo, y filtra por Carla.
2. Lucía modifica el teléfono y las observaciones de Sofía; después intenta cambiarle el nombre y modificar el teléfono de Mateo.
3. Lucía lista las inscripciones y abre la de Mateo.

**Resultado esperado:** en el paso 1 el listado trae solo a Sofía, con su plan (Básico) y su profesora; la ficha de Sofía trae su inscripción con dos horarios; la de Mateo responde 403, y el filtro por Carla devuelve una página vacía. En el paso 2 el contacto se guarda (200), el nombre y el alumno ajeno responden 403, y en la base Sofía conserva su nombre y Mateo no cambia. En el paso 3 solo aparece la inscripción de Sofía y la de Mateo responde 403.

**Automatizado:** Sí (E-15 a E-17).

#### PI-26 — Filtros por inscripción y ficha completa

**US:** US-10 · **Precondición:** escenario de demostración cargado; sesión de Marina; un alumno pre-inscripto sin inscripción.

1. Marina filtra el listado por el plan Básico, por Carla y por la actividad Personalizado, y lista sin filtros.
2. Marina abre la ficha de Mateo.

3. Marina abre la ficha de Valentina, que inicia sesión con su correo.

**Resultado esperado:** cada filtro trae a los alumnos que corresponden, ordenados por apellido: Sofía por el plan Básico, y Valentina y Mateo por Carla y por entrenamiento personalizado. En el listado completo el alumno sin inscripción aparece con `inscripcion: null`. La ficha de Mateo trae una inscripción `PREINSCRIPTA` con el plan Personalizado 2 días, Carla como profesora y dos horarios. Valentina está `ACTIVO`, con su inscripción `ACTIVA`, y su login responde 200 con el rol `ALUMNO`.

**Automatizado:** Sí (E-18 a E-20).

#### PI-27 — Ocupación de los horarios

**US:** US-04, US-05 · **Precondición:** escenario de demostración cargado; sesiones de Marina y de Lucía; horario con cupo 3.

1. Se inscriben dos alumnos en el horario y se da de baja a uno.
2. Marina abre el horario y Lucía lista los horarios.

**Resultado esperado:** el horario informa `inscriptos: 1` y `cupo_disponible: 2` en el detalle y en el listado (el dado de baja no cuenta). Un horario sin cupo informa `cupo_disponible: null`.

**Automatizado:** Sí (G-13).

#### PI-28 — Administración de roles y cuentas reservada a la propietaria

**US:** US-01, US-02 · **Precondición:** una propietaria y una profesora con sesión; la propietaria le otorgó `USUARIOS_EDITAR` a PROFESORA desde la matriz.

1. La profesora intenta asignarse PROPIETARIA, quitarle PROPIETARIA a la dueña, dejarla inactiva y borrarla.
2. La dueña, única propietaria activa, intenta quitarse PROPIETARIA y dejarse inactiva.
3. Con otra propietaria activa, la dueña deja el rol.

**Resultado esperado:** los cuatro pedidos de la profesora responden 403 y en la base los roles y el estado no cambian: el permiso delegado no alcanza para administrar la seguridad. Los dos de la dueña responden 409 y sigue siendo propietaria activa. Con otra propietaria activa, quitarse el rol responde 200.

**Automatizado:** Sí (A-42 a A-44).

#### PI-29 — Identidad de la cuenta: DNI y fecha de nacimiento

**US:** US-01, US-02 · **Precondición:** un alumno con sesión y sin permisos; una propietaria con sesión; un usuario con DNI 30111222.

1. El alumno intenta cambiar su propio DNI y su propia fecha de nacimiento.
2. El alumno cambia su propio teléfono.
3. La propietaria da de alta un usuario con el DNI 30111222.

**Resultado esperado:** los cambios de DNI y fecha de nacimiento responden 403 y la base queda igual: con el DNI se reusa un tutor existente. El teléfono se guarda (200). El alta con un DNI repetido responde 409, no 500, y no se crea nadie.

**Automatizado:** Sí (A-45 a A-48).

#### PI-30 — La profesora pre-inscribe solo a su cargo

**US:** US-05, US-10 · **Precondición:** escenario de demostración cargado; sesiones de Lucía y de Marina; un alumno pre-inscripto sin inscripción; Mateo Romero tiene una inscripción vigente con Carla.

1. Lucía pre-inscribe al alumno nuevo a su nombre, en sus horarios.
2. Lucía intenta pre-inscribirlo a nombre de Carla, o sin cargo, e intenta pre-inscribir a Mateo.
3. Marina pre-inscribe a Mateo con Lucía.

**Resultado esperado:** el paso 1 responde 201, con Lucía a cargo y sin bonificar. Los tres pedidos del paso 2 responden 403 y no se crea ninguna inscripción: si no, con pre-inscribirse alcanzaba para ver la ficha de cualquier alumno. La propietaria no tiene esas restricciones (201).

**Automatizado:** Sí (G-14 a G-16).

#### PI-31 — El tutor en el alta de un menor

**US:** US-05, US-06 · **Precondición:** escenario de demostración cargado (Paula Romero, tutora de Mateo, con DNI 31222333); sesiones de Lucía y de Marina.

1. Lucía da de alta un menor indicando como tutora a Marina por su `id_usuario`.
2. Lucía da de alta un menor con los datos de Paula (su DNI y su email).
3. Marina da de alta un menor con el DNI de Paula y el email de Marina.

**Resultado esperado:** el paso 1 responde 403 y no se guarda nada: elegir una cuenta existente por su id es de la propietaria. El paso 2 responde 201, reusa la cuenta de Paula y la respuesta trae del tutor solo `id_usuario`, `nombre` y `apellido` (se crea solo el usuario del menor). El paso 3 responde 409 porque el DNI y el email son de cuentas distintas, y no se guarda nada.

**Automatizado:** Sí (E-21 a E-23).

#### PI-32 — Paginación de inscripciones

**US:** US-10 · **Precondición:** escenario de demostración cargado (tres inscripciones); sesión de Marina.

1. Marina lista las inscripciones sin paginar, con `limit=1&offset=1` y con `limit=101`.

**Resultado esperado:** la página trae solo la segunda inscripción del listado completo; `limit=101` responde 400, porque ningún listado devuelve más de 100 por pedido.

**Automatizado:** Sí (G-17).

#### PI-33 — Restricciones de cuotas y pagos en la base

**US:** US-15, US-16, US-17 · **Precondición:** escenario de demostración cargado.

1. Se insertan directamente en la base cuotas con número 0, monto negativo y un número repetido para la misma inscripción.
2. Se insertan pagos con monto 0, rechazados sin motivo y por transferencia con una profesora que cobra.

**Resultado esperado:** la base rechaza cada fila con su restricción del DER (`ck_cuotas_x1`, `ck_cuotas_x2`, el único `(id_inscripcion, numero_cuota)`, `ck_pagos_x1`, `ck_pagos_x2` y `ck_pagos_x3`) y solo guarda las válidas.

**Automatizado:** Sí (H-01, H-02).

#### PI-34 — El pago del alumno activo de la demostración

**US:** US-07, US-15 · **Precondición:** escenario de demostración cargado.

1. Se consultan las cuotas de la inscripción de Valentina Herrera.

**Resultado esperado:** una sola cuota, la número 1, con un pago en efectivo confirmado que cobró Carla y que está pendiente de rendición. Volver a cargar el escenario no la duplica.

**Automatizado:** Sí (H-03).

#### PI-35 — El primer pago y el alta definitiva se guardan juntos

**US:** US-07, US-15 · **Precondición:** escenario de demostración cargado; Sofía Medina pre-inscripta con Lucía, sin cuotas; cuotas y pagos armado con `armarCuotasYPagos`.

1. Lucía registra el cobro en efectivo de Sofía, y el guardado del pago falla después de que el alta ya escribió la inscripción, el alumno y su rol.
2. Lucía registra el mismo cobro sin fallas.

**Resultado esperado:** en el paso 1 el cobro falla y la base queda igual que antes: la inscripción sigue PREINSCRIPTA, Sofía y su usuario siguen como estaban, sin el rol ALUMNO, y no hay cuotas ni pagos. En el paso 2 quedan la inscripción ACTIVA, Sofía y su usuario ACTIVOS, el rol ALUMNO y la cuota 1 con su pago en efectivo confirmado.

**Automatizado:** Sí (H-04, H-05).

#### PI-36 — El pago adelantado y el historial de cuotas de la ficha

**US:** US-10, US-15 · **Precondición:** escenario de demostración cargado (Valentina Herrera al día, con su primera cuota pagada); cuotas y pagos armado con `armarCuotasYPagos`.

1. Marina registra un pago en efectivo de Valentina antes de que venza su cuota.
2. Se pide el historial de cuotas de Valentina.

**Resultado esperado:** se genera la cuota 2, que cubre desde el día siguiente al vencimiento de la cuota 1 y vence de fecha a fecha, el mismo día del mes siguiente. El historial trae las dos cuotas, de la más nueva a la más vieja, cada una con su plan y sus pagos.

**Automatizado:** Sí (H-06).

#### PI-37 — Peso y talla al pre-inscribir en una actividad que los pide

**US:** US-03, US-05 · **Precondición:** escenario de demostración cargado (Personalizado tiene `requiere_medidas`; Funcional no); sesión de Marina; alumnos nuevos sin inscripción.

1. Marina pre-inscribe un alumno en el plan Personalizado 2 días, con un horario de Carla, sin peso ni talla.
2. Repite el pedido con peso 62,5 kg y talla 168 cm.
3. Pre-inscribe otro alumno en Funcional sin medidas; después marca Funcional con `requiere_medidas` y vuelve a pre-inscribir sin medidas.
4. Con Funcional marcada y un horario con cupo 1, pre-inscribe dos alumnos con medidas.

**Resultado esperado:** el paso 1 responde 400 ("Personalizado pide el peso y la talla para pre-inscribir") y no se guarda ni la inscripción ni la medición. El paso 2 responde 201: la inscripción queda PREINSCRIPTA y hay un registro de progreso a nombre de Carla con PESO 62,5 kg y TALLA 168 cm. En el paso 3, la primera pre-inscripción responde 201 sin registro de progreso; con la actividad marcada, la segunda responde 400. En el paso 4, el segundo alumno recibe 409 por cupo y su medición tampoco queda.

**Automatizado:** Sí (G-18 a G-21).

#### PI-38 — La reserva de cupo de una pre-inscripción sin pagar vence

**US:** US-04, US-05, US-07 · **Precondición:** escenario de demostración cargado; sesión de Marina; un horario de Funcional con cupo 1; `DIAS_RESERVA_PREINSCRIPCION` en 3 (valor inicial). Como la API no acepta una fecha de inicio pasada, el paso del tiempo se simula corriendo `fecha_inicio` en la base.

1. Una pre-inscripción sin pagar empezó hace 3 días. Marina pre-inscribe a otro alumno en el mismo horario y consulta la inscripción y el horario.
2. Otra pre-inscripción empezó hace 4 días. Marina consulta el horario y el listado de pre-inscriptas, y pre-inscribe a otro alumno en el horario.
3. Con una reserva vencida en un horario libre y otra en un horario que ya ocupó otro alumno, se confirma el primer pago de las dos (`IInfoInscripciones.activar`).
4. Se cambia `DIAS_RESERVA_PREINSCRIPCION` a 7 y se repite el paso 2.
5. Marina intenta dar de baja un horario que solo tiene una pre-inscripción con la reserva vencida.
6. Marina le cambia el plan a una pre-inscripción con la reserva vencida, en un horario con cupo 2.

**Resultado esperado:** en el paso 1 el otro alumno recibe 409 por cupo; la inscripción trae `reserva: { vence: hoy, vencida: false }` y el horario, 1 inscripto y 0 lugares. En el paso 2 el horario figura con 0 inscriptos y 1 lugar, el listado trae la reserva vencida (`vence` ayer) y la pre-inscripción nueva responde 201 con su reserva hasta dentro de 3 días; la vencida sigue PREINSCRIPTA. En el paso 3 la del horario libre queda ACTIVA y la otra recibe "No hay cupo disponible" y sigue PREINSCRIPTA. En el paso 4 la misma pre-inscripción vuelve a ocupar el lugar (409) y vence dentro de 3 días. En el paso 5 la baja responde 409 y el horario sigue activo. En el paso 6 el cambio responde 200: la pre-inscripción nueva conserva la fecha de inicio de la anterior, su reserva sigue vencida con el mismo vencimiento y el horario figura con 0 inscriptos y 2 lugares.

**Automatizado:** Sí (G-22 a G-27).

#### PI-39 — Carga de los parámetros del sistema

**US:** US-05, US-16, US-18, US-21 · **Precondición:** base de prueba recién reiniciada.

1. Se leen los parámetros cargados.
2. La propietaria cambia `DIAS_RESERVA_PREINSCRIPCION` a 7 y se vuelve a correr la carga.
3. Se borra un parámetro y se vuelve a correr la carga.
4. Se intenta guardar un tipo de dato que no está en el DER.

**Resultado esperado:** están todos los parámetros del catálogo con su tipo y su valor inicial (datos bancarios vacíos, `VENCIDOS_PUEDEN_ASISTIR` en true, `MINUTOS_CIERRE_ASISTENCIA` en 0, `DIAS_RESERVA_PREINSCRIPCION` en 3) y su fecha de actualización. Volver a correr la carga no pisa el 7 y repone el que falta. La base rechaza el tipo desconocido.

**Automatizado:** Sí (I-01 a I-04).

#### PI-40 — El cobro aplica el precio vigente el día del cobro

**US:** US-12, US-15 · **Precondición:** escenario de demostración cargado (Sofía Medina pre-inscripta en el Básico, a $25.000 desde el 01/01/2026, sin cuotas; Valentina Herrera en el Intermedio, a $30.000, con su primera cuota pagada); sesión de Marina; cuotas y pagos armado con `armarCuotasYPagos`. Los precios se cargan por la API (`POST /planes/:id/precios`) y los cobros, sin confirmar un monto distinto, así que solo pasan si el monto es el precio que rige hoy.

1. Marina programa el Básico a $28.000 desde mañana y le cobra $25.000 a Sofía.
2. Con la base reiniciada, Marina carga el Básico a $28.000 desde hoy y le cobra $25.000 a Sofía; después, $28.000.
3. Con la base reiniciada, Marina carga el Intermedio a $35.000 desde hoy y le cobra $35.000 a Valentina.

**Resultado esperado:** en el paso 1 el cobro se acepta y la cuota 1 queda en $25.000, con un pago de $25.000: el aumento todavía no rige. En el paso 2 el primer cobro se rechaza con 409 `MONTO_DISTINTO` ("El monto no coincide con el esperado (28000)") y no queda ni la cuota, ni el pago, ni el alta; el segundo se acepta y la cuota 1 queda en $28.000: el día de la vigencia ya rige el precio nuevo. En el paso 3 la cuota 1 de Valentina y su pago quedan iguales que antes del aumento, y la cuota 2 queda en $35.000.

**Automatizado:** Sí (H-07 a H-09).

#### PI-41 — El detalle de la baja con el motivo OTRO

**US:** US-08 · **Precondición:** escenario de demostración cargado; sesión de Marina; alumnos nuevos pre-inscriptos en horarios de Funcional (uno de ellos en los planes Básico e Intermedio a la vez).

1. Marina da de baja al alumno con dos inscripciones, con el motivo `OTRO` y el detalle "Se pasó a un gimnasio más cerca de su casa", y consulta sus inscripciones dadas de baja (`GET /inscripciones?id_alumno=X&estado=BAJA`).
2. Marina da de baja a otro alumno con el motivo `OTRO` sin detalle, y a otro con el detalle en blanco.
3. Marina intenta dar de baja con el motivo `MUDANZA` y un detalle, y con el motivo `OTRO` y un detalle de 201 caracteres.
4. Se guarda directo en la base un detalle con el motivo `CAMBIO_PLAN`.

**Resultado esperado:** el paso 1 responde 200; las dos inscripciones quedan en BAJA con el motivo `OTRO` y el detalle, y el listado devuelve `detalle_baja` en las dos. En el paso 2 las dos bajas responden 200 y `detalle_baja` queda en null. En el paso 3 los dos pedidos responden 400 `VALIDATION_ERROR` y la base no cambia: las inscripciones siguen PREINSCRIPTAS y el alumno, INACTIVO. En el paso 4 la base lo rechaza (`ck_inscripciones_x2`).

**Automatizado:** Sí (G-28 a G-31).

#### PI-42 — El cobro en efectivo por la API

**US:** US-07, US-15 · **Precondición:** escenario de demostración cargado (Sofía Medina pre-inscripta con Lucía en el Básico, a $25.000, sin cuotas). El subsistema de cuotas y pagos está montado en la API con los calculadores reales.

1. Lucía, la profesora a cargo, registra en efectivo la primera cuota de Sofía (`POST /pagos/efectivo`, $25.000).
2. Sofía, ya activa, pide el comprobante (`GET /pagos/:id/comprobante`).
3. Con la base reiniciada, Valentina (alumna) y Carla (profesora que no está a cargo de Sofía) intentan registrar el mismo cobro.

**Resultado esperado:** el paso 1 responde 201 con el pago `CONFIRMADO`, a nombre de Lucía y pendiente de rendición; la inscripción queda `ACTIVA`, Sofía y su usuario `ACTIVO`, con el rol `ALUMNO`, y la cuota 1 con ese pago. El paso 2 responde 200 con el número del pago, el monto, el plan, la cuota y quién cobró. En el paso 3 los dos pedidos responden 403 y la base no cambia.

**Automatizado:** Sí (H-10 y H-11).

#### PI-43 — La transferencia informada y su revisión por la API

**US:** US-07, US-16, US-17 · **Precondición:** escenario de demostración cargado (Valentina Herrera al día en el Intermedio, a $30.000, con su primera cuota pagada; Sofía Medina pre-inscripta en el Básico, sin cuotas).

1. Valentina informa una transferencia de $30.000 hecha hace una hora (`POST /pagos/transferencia`) y consulta las suyas (`GET /pagos/mis-transferencias`).
2. Marina consulta las pendientes (`GET /pagos/transferencias?estado=PENDIENTE`); Lucía intenta lo mismo. Marina intenta cobrarle a Valentina en efectivo.
3. Con la base reiniciada y la transferencia informada, Marina la rechaza sin motivo y después con el motivo "No figura en el extracto"; intenta aprobarla. Valentina la vuelve a informar.
4. Con la base reiniciada y la transferencia informada, Marina la aprueba. Después carga como recibida una transferencia de $25.000 de Sofía (`POST /pagos/transferencia-recibida`).

**Resultado esperado:** en el paso 1 la transferencia queda `PENDIENTE` en una cuota 2 nueva y Valentina la ve en su listado. En el paso 2 Marina la ve, sin superar las 24 horas; Lucía recibe 403 y el cobro en efectivo, 409, sin guardar nada. En el paso 3 el rechazo sin motivo responde 400; con motivo, 200 y `RECHAZADO`; la aprobación de una rechazada, 409. La transferencia nueva se carga en la misma cuota 2, sin saltear números. En el paso 4 la aprobación responde 200, con el pago `CONFIRMADO` y Marina como quien la revisó; la transferencia recibida responde 201 `CONFIRMADO` y da el alta de Sofía (inscripción `ACTIVA` y alumna `ACTIVO`).

**Automatizado:** Sí (H-12 a H-14).

#### PI-44 — Reactivar a quien nunca pagó

**US:** US-07, US-08 · **Precondición:** escenario de demostración cargado; sesión de Marina; un alumno nuevo pre-inscripto en el Básico con Lucía, sin ningún pago.

1. Marina da de baja al alumno y lo reactiva en el Básico, con Lucía y el mismo horario.
2. El alumno intenta iniciar sesión.
3. Marina le cobra en efectivo la primera cuota (`POST /pagos/efectivo`, $25.000) y el alumno vuelve a iniciar sesión.

**Resultado esperado:** la reactivación responde 201 con una inscripción nueva `PREINSCRIPTA`, con su reserva de cupo vigente; la anterior sigue en `BAJA`. El alumno y su usuario quedan `INACTIVO`, sin roles, y el login responde 403. Después del cobro, la inscripción queda `ACTIVA`, el alumno y su usuario `ACTIVO`, con el rol `ALUMNO`, y el login responde 200.

**Automatizado:** Sí (G-32).

#### PI-45 — La situación de cuota en la ficha y el listado de alumnos

**US:** US-08, US-10, US-18 · **Precondición:** escenario de demostración cargado (Valentina Herrera al día en el Intermedio, con su primera cuota pagada y 5 días de gracia; Sofía Medina pre-inscripta, sin cuotas). Los vencimientos y la fecha de la baja se corren en la base para simular el paso del tiempo.

1. Marina abre la ficha de Valentina y el listado de alumnos.
2. Valentina informa una transferencia y Carla, su profesora, abre su ficha.
3. Con la base reiniciada, la cuota de Valentina pasa a vencer hace 12 días y Marina abre su ficha.
4. Marina da de baja a Valentina con el motivo `ECONOMICO`; la baja se corre a hace 4 días y Marina vuelve a abrir la ficha.

**Resultado esperado:** en el paso 1 la ficha trae la inscripción de Valentina con `situacion_cuota` `AL_DIA`, su vencimiento, los días que faltan, `puede_asistir: true` y sin pago pendiente, e `inscripciones_de_la_baja` vacío; en el listado Valentina figura `AL_DIA` y Sofía `PENDIENTE_DE_PAGO`, sin vencimiento. En el paso 2 Carla ve la ficha con `tiene_pago_pendiente: true`, todavía `AL_DIA`. En el paso 3 la situación es `VENCIDA` con `dias_restantes: -12`. En el paso 4 la ficha ya no tiene inscripciones vigentes e `inscripciones_de_la_baja` trae la inscripción dada de baja, `VENCIDA` con `dias_restantes: -8`: lo que debía el día de la baja, no lo que debería hoy.

**Automatizado:** Sí (H-15 y H-16).

#### PI-46 — Las actividades públicas del centro

**US:** US-32, US-04 · **Precondición:** escenario de demostración cargado (ocho actividades con horarios; Combat se da martes y jueves, y Training lunes, miércoles y viernes).

1. Un visitante, sin sesión, consulta `GET /publico/actividades`, `GET /publico/disponibilidad` y `GET /horarios`.
2. Marina da de baja los dos horarios de Combat y el Training del viernes, y el visitante vuelve a consultar las actividades.

**Resultado esperado:** en el paso 1 las actividades responden 200 con `Cache-Control: public, max-age=60` y las ocho actividades, cada una con su descripción, su modalidad, los días en que se da y las clases por semana (Funcional, de lunes a viernes, con 11). La respuesta no trae horas, profesoras, cupos ni datos de alumnos. `GET /publico/disponibilidad` ya no existe (404) y la grilla de horarios exige sesión (401). En el paso 2 Combat deja de ofrecerse y Training figura los lunes y los miércoles, con 2 clases.

**Automatizado:** Sí (B-19 y B-20).

#### PI-47 — Los parámetros del sistema los ve y edita solo la propietaria

**US:** US-05, US-16, US-18, US-21 · **Precondición:** base de prueba recién reiniciada, con los parámetros cargados; sesión de la propietaria.

1. La propietaria lista los parámetros (`GET /parametros`).
2. Cambia `DIAS_RESERVA_PREINSCRIPCION` a 7 y `VENCIDOS_PUEDEN_ASISTIR` a false (`PATCH /parametros/{clave}`).
3. Intenta cargar un negativo, 366 días, un texto en un parámetro entero, más de 1440 minutos, un texto en un booleano y una clave que no existe.
4. Se borra la fila de un parámetro; la propietaria lo lista y lo edita.
5. Sin sesión, y con la sesión de una profesora, un alumno y un tutor, se intenta listar y editar los parámetros; la profesora también pide los datos bancarios.

**Resultado esperado:** el paso 1 devuelve todos los parámetros del catálogo con su tipo y su valor inicial. En el paso 2 los dos pedidos responden 200 y los valores quedan guardados y se ven en el listado. En el paso 3 todos responden 400 y la base no cambia ni crea filas. En el paso 4 el listado muestra el valor inicial con `fecha_actualizacion` en null, y al editarlo se crea la fila. En el paso 5 responde 401 sin sesión y 403 para los demás roles (la profesora no ve los datos bancarios), y el valor no cambia.

**Automatizado:** Sí (J-01 a J-10 y J-14 a J-18).

#### PI-48 — Los datos bancarios para transferir los ven el alumno y su tutor

**US:** US-16 · **Precondición:** base de prueba recién reiniciada, con los parámetros cargados; sesiones de la propietaria, un alumno y un tutor.

1. El alumno y el tutor piden los datos bancarios (`GET /parametros/datos-bancarios`).
2. La propietaria carga el CBU, el alias y el titular, y el alumno y el tutor los piden de nuevo.
3. La propietaria también los pide.

**Resultado esperado:** el paso 1 responde 200 con el CBU, el alias y el titular vacíos. En el paso 2 las tres cargas responden 200 y el alumno y el tutor ven los datos cargados. El paso 3 responde 200.

**Automatizado:** Sí (J-11 a J-13).

## 7. Tests automatizados

182 tests en diez archivos:

| Archivo | Ubicación                                                                       | Tests            | Casos                             |
| :-----: | :------------------------------------------------------------------------------ | :--------------- | :-------------------------------- |
|    A    | `back/src/__tests__/integracion/control-de-acceso.integration.test.ts`          | 48 (A-01 a A-48) | PI-01 a PI-03, PI-07, PI-08, PI-28, PI-29 |
|    B    | `back/src/__tests__/integracion/actividades-y-horarios.integration.test.ts`     | 21 (B-01 a B-21) | PI-04, PI-05, PI-06, PI-46        |
|    C    | `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts`           | 3 (C-01 a C-03)  | PI-09                             |
|    D    | `back/src/__tests__/integracion/planes.integration.test.ts`                     | 14 (D-01 a D-14) | PI-11, PI-12, PI-13, PI-14        |
|    E    | `back/src/__tests__/integracion/alumnos.integration.test.ts`                    | 23 (E-01 a E-23) | PI-15 a PI-18, PI-25, PI-26, PI-31 |
|    F    | `back/src/modules/gestion-personas/alumno/__tests__/alumno.integration.test.ts` | 3 (F-01 a F-03)  | PI-19                             |
|    G    | `back/src/__tests__/integracion/inscripciones.integration.test.ts`              | 32 (G-01 a G-32) | PI-20 a PI-24, PI-27, PI-30, PI-32, PI-37, PI-38, PI-41, PI-44 |
|    H    | `back/src/__tests__/integracion/cuotas-y-pagos.integration.test.ts`             | 16 (H-01 a H-16) | PI-33 a PI-36, PI-40, PI-42, PI-43, PI-45 |
|    I    | `back/src/shared/db/__tests__/parametros-iniciales.integration.test.ts`         | 4 (I-01 a I-04)  | PI-39                             |
|    J    | `back/src/__tests__/integracion/parametros.integration.test.ts`                 | 18 (J-01 a J-18) | PI-47, PI-48                      |

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
| A-42        | Con `USUARIOS_EDITAR` delegado, una profesora no se hace propietaria ni le quita el rol, desactiva o borra a la dueña; roles y estado no cambian                                  | PI-28 |
| A-43, A-44  | La única propietaria activa no se quita el rol ni se desactiva (409); con otra propietaria activa, sí deja el rol                                                                | PI-28 |
| A-45 a A-47 | Sin permisos, un usuario no cambia su propio DNI ni su fecha de nacimiento (403, la base queda igual), pero sí su teléfono                                                      | PI-29 |
| A-48        | Dar de alta un usuario con un DNI repetido responde 409, no 500, y no crea a nadie                                                                                              | PI-29 |
| B-01 a B-04 | Cupo obligatorio en personalizadas; el horario sin cupo propio toma el de la actividad; el cupo propio manda; grupal sin cupo                                                   | PI-04 |
| B-05 a B-09 | Superposición de horarios de una misma profesora (también la propietaria); dos profesoras a la misma hora; horario invertido; profesora sin el rol                              | PI-05 |
| B-10 a B-13 | Descripción visible en todos los horarios; baja bloqueada con alumnos inscriptos; baja sin horarios; no pasar a personalizada sin cupo                                          | PI-06 |
| B-14, B-15  | No se asigna un horario en domingo ni se mueve uno existente a ese día; la base queda igual                                                                                     | PI-05 |
| B-16        | La baja de una actividad sin alumnos da de baja también sus horarios, que no se borran                                                                                        | PI-06 |
| B-17        | Una actividad con un plan vigente exclusivo no se da de baja (409 con el nombre del plan); la actividad, su horario y el plan quedan igual                                   | PI-06 |
| B-18        | Con su plan exclusivo dado de baja, la actividad se da de baja aunque haya planes vigentes para cualquier actividad                                                         | PI-06 |
| B-19        | Un visitante sin sesión ve las actividades con sus días y sus clases por semana, sin horas, profesoras, cupos ni datos de alumnos; la grilla de horarios exige sesión      | PI-46 |
| B-20        | Una actividad sin horarios vigentes deja de ofrecerse y la baja de un horario se refleja en sus días y sus clases                                                          | PI-46 |
| B-21        | Una clase puede terminar a las 23:00, el cierre del centro, y no después                                                                                                    | PI-05 |
| C-01 a C-03 | Volver a correr la carga no pisa permisos quitados, repone los críticos de la propietaria y no duplica nada                                                                     | PI-09 |
| D-01 a D-04 | Alta de plan con un único precio vigente desde hoy; actividad exclusiva dada de baja; nombre repetido sin distinguir mayúsculas; restricciones del DER en la base               | PI-11 |
| D-05 a D-07 | Cambio de frecuencia; baja lógica que saca el plan del listado; no hay segunda baja ni edición de un plan dado de baja                                                          | PI-12 |
| D-08 a D-12 | Aumento futuro que cierra el precio actual el día anterior; reemplazo de un aumento programado; fecha pasada; precio que empieza el mismo día que el vigente; plan dado de baja | PI-13 |
| D-13, D-14  | La profesora ve los planes y su historial de precios, pero no crea planes ni carga precios; la base queda igual                                                                 | PI-14 |
| E-01 a E-04 | Alta de un mayor inactivo, sin roles ni acceso; alta por la profesora; DNI de otro alumno (`ALUMNO_EXISTENTE`); email repetido y mayor sin email                                | PI-15 |
| E-05 a E-08 | Menor sin tutor; menor con tutora nueva inactiva; hermanos con la misma tutora; menor con email y tutor menor de edad                                                           | PI-16 |
| E-09 a E-11 | Cambio de teléfono; menor que pasa a mayor (sin email se rechaza, con email pierde el tutor); DNI de otro usuario                                                               | PI-17 |
| E-12 a E-14 | Búsqueda sin acentos, por tutor y por DNI exacto; dados de baja fuera del listado; paginación por apellido con total                                                           | PI-18 |
| E-15 a E-17 | La profesora lista, abre y edita solo a sus alumnos, solo contacto y observaciones, y ve solo sus inscripciones; la base no cambia con los rechazos                          | PI-25 |
| E-18 a E-20 | Filtros por plan, profesora y actividad; alumno sin inscripción con `inscripcion: null`; ficha con la inscripción vigente, su plan, profesora y horarios; el alumno activo de la demostración inicia sesión | PI-26 |
| E-21 a E-23 | La profesora no elige un tutor por id (403); un tutor con DNI y email de la misma cuenta se reusa y la profesora ve solo su nombre; DNI de una cuenta y email de otra (409) | PI-31 |
| F-01 a F-03 | Activación de un mayor (rol `ALUMNO`, idempotente) y de un menor (rol `TUTOR` a su tutora); baja que corta el acceso y reactivación que lo devuelve                             | PI-19 |
| G-01 a G-03 | Inscripción preinscripta, precio vigente, filtros, validación de reglas, duplicados y cupo                                                                                   | PI-20 |
| G-04, G-05  | Alta definitiva idempotente, rol `ALUMNO`, login, revalidación de cupo y activación ausente de la API (404)                                                                   | PI-21 |
| G-06 a G-08 | Baja que libera cupo; reactivación de quien ya pagó con nuevo historial y rechazo cuando no hay cupo                                                                                        | PI-22 |
| G-09 a G-11 | Cambio transaccional de plan, cambio de horarios, rechazos por cupo y control de acceso                                                                                      | PI-23 |
| G-12        | No se da de baja un horario con inscriptos (409, la base no cambia); sí cuando el alumno se fue                                                                               | PI-24 |
| G-13        | Inscriptos y lugares que quedan en el detalle y el listado de horarios; los dados de baja no cuentan; sin cupo, `cupo_disponible: null`                                     | PI-27 |
| G-14 a G-16 | La profesora pre-inscribe a su nombre a un alumno libre; no a nombre de otra, sin cargo ni a un alumno de otra profesora (403, sin inscripciones nuevas); la propietaria sí      | PI-30 |
| G-17        | `limit` y `offset` devuelven la página pedida; `limit=101` responde 400                                                                                                       | PI-32 |
| G-18 a G-21 | Sin peso ni talla en una actividad que los pide, 400 sin guardar nada; con ellos, medición inicial a nombre de la profesora; marcar la actividad los vuelve obligatorios; sin cupo, la medición no queda | PI-37 |
| G-22, G-23  | Una pre-inscripción sin pagar ocupa el lugar hasta 3 días después de su inicio, ese día incluido; después lo libera (para el alta y para la ocupación) y figura con la reserva vencida, sin dejar de estar PREINSCRIPTA | PI-38 |
| G-24        | El pago tardío activa si el lugar sigue libre y responde sin cupo si otro lo ocupó                                                                                            | PI-38 |
| G-25        | Con `DIAS_RESERVA_PREINSCRIPCION` en 7, la misma pre-inscripción vuelve a ocupar el lugar                                                                                    | PI-38 |
| G-26        | Una pre-inscripción con la reserva vencida sigue en el horario y no deja darlo de baja                                                                                       | PI-38 |
| G-27        | Cambiar de plan conserva la fecha de inicio de la pre-inscripción: la reserva no se renueva y sigue sin ocupar lugar                                                         | PI-38 |
| G-28        | La baja con el motivo `OTRO` guarda el detalle en todas las inscripciones vigentes y el listado de bajas lo devuelve                                                          | PI-41 |
| G-29        | El motivo `OTRO` sin detalle, o con el detalle en blanco, deja `detalle_baja` en null                                                                                        | PI-41 |
| G-30        | El detalle con otro motivo o de más de 200 caracteres responde 400 `VALIDATION_ERROR` y no da de baja nada                                                                   | PI-41 |
| G-31        | La base rechaza un detalle sin el motivo `OTRO` aunque se saltee la API (`ck_inscripciones_x2`)                                                                              | PI-41 |
| G-32        | Quien nunca pagó vuelve de la baja pre-inscripto, inactivo y sin rol; el primer pago le da el alta, el rol y el acceso                                                    | PI-44 |
| H-01, H-02  | La base aplica a cuotas y pagos las restricciones del DER aunque se saltee la API, y guarda las filas válidas                                                                 | PI-33 |
| H-03        | Valentina tiene su primera cuota pagada en efectivo a Carla, pendiente de rendición                                                                                           | PI-34 |
| H-04, H-05  | Si el pago no se puede guardar, no queda nada del alta (inscripción, alumno, usuario, rol, cuota); sin falla, quedan todos                                                     | PI-35 |
| H-06        | El pago adelantado cubre desde el día siguiente al vencimiento vigente; el historial trae las cuotas con su plan y sus pagos, de la más nueva a la más vieja        | PI-36 |
| H-07        | Con un aumento programado para mañana, el cobro de hoy aplica el precio anterior                                                                                  | PI-40 |
| H-08        | Con un aumento que rige desde hoy, el cobro aplica el precio nuevo; el precio anterior responde `MONTO_DISTINTO` y no guarda cuota, pago ni alta                  | PI-40 |
| H-09        | Un aumento no modifica la cuota ya cobrada ni su pago, y la cuota siguiente se cobra al precio nuevo                                                              | PI-40 |
| H-10        | La profesora a cargo cobra la primera cuota por la API: alta definitiva con rol y comprobante que ve el alumno                                                    | PI-42 |
| H-11        | Un alumno y una profesora que no está a cargo no registran un cobro (403) y la base no cambia                                                                      | PI-42 |
| H-12        | La transferencia informada queda pendiente, la ven el alumno y la propietaria (no la profesora) y frena otro cobro                                                 | PI-43 |
| H-13        | El rechazo exige motivo, una rechazada no se aprueba y la transferencia siguiente reusa la cuota                                                                   | PI-43 |
| H-14        | La aprobación confirma el pago con quién lo revisó; la transferencia que carga la propietaria da el alta                                                           | PI-43 |
| H-15        | La ficha y el listado traen la situación de cuota (al día, pendiente de pago) y la profesora ve la transferencia sin revisar                                      | PI-45 |
| H-16        | La cuota vencida muestra los días de atraso; la ficha del alumno de baja trae las inscripciones de su última baja, calculadas al día de la baja                  | PI-45 |
| I-01        | La carga deja cada parámetro del catálogo con su tipo, su valor inicial y su fecha de actualización                                                                         | PI-39 |
| I-02, I-03  | Volver a correr la carga no pisa un valor cambiado y repone uno que falta                                                                                                    | PI-39 |
| I-04        | La base rechaza un tipo de dato fuera del DER                                                                                                                                | PI-39 |
| J-01        | Lista todos los parámetros del catálogo, con su tipo y su valor inicial                                                                                                       | PI-47 |
| J-02, J-03  | La propietaria cambia un parámetro entero y uno booleano, y el valor queda en la base y en el listado                                                                         | PI-47 |
| J-04 a J-08 | Rechaza con 400 un negativo, 366 días, un texto en un entero, más de 1440 minutos y un texto en un booleano, sin tocar la base                                                | PI-47 |
| J-09        | Una clave que no existe responde 400 y no crea ninguna fila                                                                                                                   | PI-47 |
| J-10        | Un parámetro sin fila rige con su valor inicial y al editarlo se crea                                                                                                         | PI-47 |
| J-11        | Sin cargar, el alumno y el tutor reciben los datos bancarios vacíos                                                                                                           | PI-48 |
| J-12, J-13  | La propietaria carga los datos bancarios y el alumno, el tutor y ella misma los ven                                                                                           | PI-48 |
| J-14        | Sin sesión, las tres rutas responden 401                                                                                                                                      | PI-47 |
| J-15 a J-17 | La profesora, el alumno y el tutor no listan ni editan los parámetros, y el valor no cambia                                                                                   | PI-47 |
| J-18        | La profesora no ve los datos bancarios                                                                                                                                        | PI-47 |

### 7.1 Verificación de que los tests detectan fallas

Se rompió a propósito cada regla, se comprobó que algún test fallara y se restauró el código:

| Regla rota                                                                            | Tests que fallaron                                                                                         |
| :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| `requierePermiso` deja pasar cualquier pedido                                         | A-08 a A-10, A-33 a A-37. El resto siguió en verde por la segunda barrera `requiereRol("PROPIETARIA")`     |
| El cupo de la actividad manda sobre el cupo propio del horario                        | B-03 (la primera versión no lo detectaba; se sumó un horario con cupo propio sobre una actividad con cupo) |
| No se verifica que los horarios de la actividad tengan alumnos antes de la baja       | B-11                                                                                                       |
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
| La profesora ve y edita a todos los alumnos, no solo a los que tiene a cargo           | E-15 a E-17                                                                                                |
| La baja de horario no cuenta los inscriptos antes de dar de baja                      | G-12                                                                                                       |
| La ocupación de un horario no suma sus inscriptos                                     | G-13                                                                                                       |
| El alta deja al usuario del alumno `ACTIVO`                                           | E-01                                                                                                       |
| La profesora pierde `ALUMNOS_EDITAR` en la matriz inicial                             | E-02                                                                                                       |
| La activación vuelve a asignar un rol que ya tiene                                    | F-01                                                                                                       |
| La activación de un menor da el rol `ALUMNO` en lugar de `TUTOR` a su tutora          | F-02                                                                                                       |
| La baja no inactiva el usuario del alumno                                             | F-03                                                                                                       |
| Asignar roles deja de exigir el rol Propietaria                                       | A-42                                                                                                       |
| Se permite dejar sin rol o inactiva a la única propietaria activa                     | A-43                                                                                                       |
| El DNI y la fecha de nacimiento vuelven a ser autoeditables                           | A-45, A-46                                                                                                 |
| El alta de usuario no controla el DNI repetido                                        | Ninguno: el `errorHandler` traduce el P2002 a 409. Rotas las dos defensas juntas, falla A-48              |
| La pre-inscripción de una profesora no se acota a su cargo                            | G-15                                                                                                       |
| El listado de inscripciones no tiene tope                                             | G-17                                                                                                       |
| La profesora puede indicar el tutor por `id_usuario`                                  | E-21                                                                                                       |
| La profesora recibe todos los datos personales del tutor                              | E-22                                                                                                       |
| Se reusa un tutor aunque el DNI y el email sean de cuentas distintas                  | E-23                                                                                                       |
| El cobro da el alta y guarda el pago fuera de una misma transacción                   | H-04                                                                                                       |
| Cada repositorio abre su propia transacción aunque haya una en curso                  | H-04                                                                                                       |
| El rol del alumno se asigna fuera de la transacción del cobro                         | H-04                                                                                                       |
| El pago adelantado vuelve a empezar el mismo día en que vence la cuota vigente        | H-06                                                                                                       |
| La pre-inscripción no verifica si la actividad pide peso y talla                      | G-18, G-20                                                                                                 |
| La medición inicial se guarda aunque la pre-inscripción falle                         | G-21                                                                                                       |
| Modificar una actividad no acepta `requiere_medidas`                                  | G-20                                                                                                       |
| Las pre-inscripciones ocupan lugar aunque la reserva venció                           | G-23, G-24                                                                                                 |
| El plazo de la reserva queda fijo en 3 días y no sale del parámetro                    | G-25                                                                                                       |
| La reserva figura vencida el último día en que todavía guarda el lugar                | G-22                                                                                                       |
| La ocupación de los horarios cuenta las reservas vencidas                             | G-23                                                                                                       |
| Volver a correr la carga de parámetros pisa los valores configurados                  | I-02                                                                                                       |
| Cambiar de plan hace empezar hoy a la pre-inscripción y le renueva la reserva           | G-27                                                                                                       |
| El precio vigente ignora la fecha y toma el último precio cargado del plan             | H-07                                                                                                       |
| El precio vigente no tiene en cuenta el cierre de la vigencia (`fecha_vigencia_hasta`)  | H-08, H-09                                                                                                 |
| La baja no guarda el detalle del motivo `OTRO`                                         | G-28                                                                                                       |
| El schema acepta el detalle con cualquier motivo                                       | G-30 (el pedido llega a la base, que lo rechaza con el check, y no responde 400)                          |
| La base de prueba sin el check `ck_inscripciones_x2`                                   | G-31                                                                                                       |
| La baja de una actividad no revisa sus planes exclusivos vigentes                      | B-17                                                                                                       |
| Los planes dados de baja también frenan la baja de la actividad                        | B-18                                                                                                       |
| El subsistema de cuotas y pagos sin montar en la API                                   | H-10 a H-14                                                                                                |
| El listado de transferencias en revisión solo con sesión, sin el rol ni el permiso     | H-12                                                                                                       |
| La reactivación crea siempre la inscripción `ACTIVA`, sin mirar los pagos              | G-32                                                                                                       |
| La reactivación deja siempre al alumno `ACTIVO`                                        | G-32                                                                                                       |
| La situación de una inscripción dada de baja se calcula a hoy                          | H-16                                                                                                       |
| Cuota no informa la transferencia sin revisar                                          | H-15                                                                                                       |
| La ficha del alumno de baja no trae las inscripciones de su última baja               | H-16                                                                                                       |
| Las actividades públicas traen la profesora de cada horario                             | B-19                                                                                                       |
| El centro vuelve a cerrar a las 20:00                                                  | B-07 (responde 400 en lugar de 409: el horario de 20:30 a 21:30 queda fuera) y B-21                       |

Además, apuntada a la base de desarrollo (`mifr`), las pruebas se negaron a correr y no tocaron datos.

## 8. Registro de ejecución y defectos

### 8.1 Ejecuciones completas

| Fecha      | Motivo                                                                | Tests | Resultado     | Duración | Observaciones                                                                                                      |
| :--------- | :-------------------------------------------------------------------- | :---: | :------------ | :------: | :----------------------------------------------------------------------------------------------------------------- |
| 07/10/2026 | Primera corrida                                                       |  41   | 41 aprobados  |  4,4 s   | Pasaron también los 669 tests unitarios                                                                            |
| 07/10/2026 | PI-03 (paso 4) a PI-06 automatizados                                  |  57   | 57 aprobados  |  7,0 s   | Fallas provocadas detectadas en cupo efectivo y baja de actividades                                                |
| 07/10/2026 | Datos de prueba con las actividades del Estudio Inicial (sin Pilates) |  57   | 57 aprobados  |  14,5 s  | Pasaron también los 669 tests unitarios                                                                            |
| 07/10/2026 | El centro no abre los domingos (PI-05, pasos 6 y 7)                   |  59   | 59 aprobados  |  13,1 s  | Pasaron también los 673 tests unitarios; falla provocada detectada                                                 |
| 08/10/2026 | Planes y precios con vigencia (PI-11 a PI-14)                         |  73   | 73 aprobados  |  27,0 s  | Pasaron también los 763 tests unitarios; las 12 fallas provocadas fueron detectadas                                |
| 08/10/2026 | Alumnos y tutores (PI-15 a PI-19); la profesora ve los planes (PI-14) |  91   | 91 aprobados  |  28,3 s  | Pasaron también los 854 tests unitarios; las 19 fallas provocadas fueron detectadas                                |
| 08/10/2026 | Planes y alumnos en el escenario de demostración                      |  91   | 91 aprobados  |  33,3 s  | Los tests de planes y alumnos pasan a contar contra lo que había; las fallas provocadas se vuelven a detectar      |
| 09/10/2026 | Inscripciones y ciclo de vida (PI-20 a PI-23)                         | 102   | 102 aprobados | 21,9 s   | Pasaron también los 859 tests unitarios; build correcto. Se corrigió y volvió a probar la reactivación de alumnos |
| 08/10/2026 | Migración a Express 5 y rutas agrupadas por subsistema                | 102   | 102 aprobados | 44,4 s   | Sin cambios en los tests de integración: confirman que el contrato HTTP y los permisos no cambiaron. Pasaron también los 862 tests unitarios; build correcto |
| 09/10/2026 | Revisión de inscripciones; US-10 y US-09 de la profesora (PI-21, PI-24 a PI-26) | 107 | 107 aprobados | 53,2 s | Pasaron también los 973 tests unitarios, con cobertura del 100 %; build correcto. Las fallas provocadas fueron detectadas |
| 09/10/2026 | Ocupación de horarios (PI-27), alumno activo en la demostración y validaciones | 109 | 109 aprobados | 61,2 s | Pasaron también los 990 tests unitarios; falla provocada detectada |
| 09/10/2026 | La baja de actividad arrastra sus horarios sin alumnos (PI-06)        | 110 | 110 aprobados | 60,0 s | Pasaron también los 991 tests unitarios; falla provocada detectada (B-11) |
| 10/10/2026 | Correcciones de la auditoría de seguridad (PI-28 a PI-32)             | 127 | 127 aprobados | 103,6 s | Antes de sumar los casos nuevos pasaron los 113 existentes. Pasaron también los 1182 tests unitarios, con cobertura del 100 %; build correcto. Las 10 fallas provocadas fueron detectadas (una, con las dos defensas rotas) |
| 10/10/2026 | El primer pago y el alta en una sola transacción (PI-33 a PI-35)      | 129 | 129 aprobados | 218,1 s | Pasaron también los 1188 tests unitarios, con cobertura del 100 %; build correcto. Las 3 fallas provocadas fueron detectadas |
| 10/10/2026 | Pago adelantado desde el día siguiente e historial de cuotas (PI-36) | 130 | 130 aprobados | 201,8 s | Pasaron también los 1191 tests unitarios, con cobertura del 100 %; build correcto. La falla provocada fue detectada |
| 11/10/2026 | Peso y talla al pre-inscribir (PI-37)                                 | 134 | 134 aprobados | 128,0 s | Pasaron también los 1212 tests unitarios, con cobertura del 100 %; build correcto. Las 3 fallas provocadas fueron detectadas |
| 11/10/2026 | Reserva de la pre-inscripción que vence y parámetros del sistema (PI-38, PI-39) | 143 | 143 aprobados | 94,9 s | Antes de sumar los casos nuevos pasaron los 134 existentes. Pasaron también los 1233 tests unitarios, con cobertura del 100 %; build correcto. Las 5 fallas provocadas fueron detectadas |
| 11/10/2026 | Cambiar de plan no renueva la reserva de la pre-inscripción (PI-38)   | 144 | 144 aprobados | 92,3 s | Pasaron también los 1234 tests unitarios, con cobertura del 100 %; build correcto. La falla provocada fue detectada |
| 11/10/2026 | El cobro aplica el precio vigente el día del cobro (PI-40)            | 147 | 147 aprobados | 115,5 s | Solo se sumaron tests. Pasaron también los 1234 tests unitarios y el chequeo de tipos. Las 2 fallas provocadas fueron detectadas; antes de PI-40, ningún test de integración las detectaba |
| 11/10/2026 | El detalle de la baja con el motivo OTRO (PI-41)                      | 151 | 151 aprobados | 130,1 s | Con la base de prueba recreada desde cero, así que la migración nueva se aplicó completa. Pasaron también los 1241 tests unitarios, con cobertura del 100 %; build correcto. Las 3 fallas provocadas fueron detectadas |
| 11/10/2026 | Los planes exclusivos vigentes frenan la baja de la actividad (PI-06) | 153 | 153 aprobados | 133,5 s | Pasaron también los 1242 tests unitarios, con cobertura del 100 %; build correcto. Las 2 fallas provocadas fueron detectadas |
| 12/10/2026 | Cuotas y pagos montado en la API (PI-42, PI-43)                       | 158 | 158 aprobados | 115,9 s | PI-35, PI-36 y PI-40 pasan ahora con los calculadores reales. Pasaron también los 1291 tests unitarios, con cobertura del 100 %; build correcto. Las 2 fallas provocadas fueron detectadas |
| 12/10/2026 | Reactivar a quien nunca pagó (PI-44, PI-22)                          | 159 | 159 aprobados | 111,4 s | Pasaron también los 1295 tests unitarios, con cobertura del 100 %; build y chequeo de tipos (con los tests) correctos. Las 2 fallas provocadas fueron detectadas |
| 12/10/2026 | Situación de cuota en la ficha y el listado (PI-45)                   | 161 | 161 aprobados | 105,7 s | Pasaron también los 1300 tests unitarios, con cobertura del 100 %; build y chequeo de tipos correctos. Las 3 fallas provocadas fueron detectadas |
| 12/10/2026 | Panel público de disponibilidad (PI-46)                               | 163 | 163 aprobados | 110,9 s | Pasaron también los 1311 tests unitarios, con cobertura del 100 %; chequeo de tipos correcto. Las 3 fallas provocadas fueron detectadas |
| 12/10/2026 | Grilla real del centro en el escenario y cierre a las 23:00 (PI-05)     | 164 | 164 aprobados | 119,9 s | 16 tests se adaptaron al escenario nuevo. Pasaron también los 1311 tests unitarios, con cobertura del 100 %; build y chequeo de tipos correctos. La falla provocada fue detectada |
| 12/10/2026 | Las actividades públicas reemplazan al panel de disponibilidad (PI-46) | 164 | 164 aprobados | 117,9 s | Pasaron también los 1307 tests unitarios, con cobertura del 100 %; build y formato correctos. La falla provocada fue detectada |
| 12/10/2026 | Parámetros del sistema por la API (PI-47, PI-48)                      | 182 | 182 aprobados | 166,2 s | Corrida completa con el archivo J. Pasaron también los 1386 tests unitarios; build correcto. Sin fallas provocadas. |

### 8.2 Resultado por caso

| Caso          | Fecha      | Ejecutó           | Resultado          | Observaciones                                                                    |
| :------------ | :--------- | :---------------- | :----------------- | :------------------------------------------------------------------------------- |
| PI-01 a PI-09 | 07/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                                            |
| PI-10         | —          | —                 | Pendiente          | Verificación manual en el navegador                                              |
| PI-11 a PI-12 | 08/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                                            |
| PI-13         | 08/10/2026 | Francisco Andrade | Aprobado           | Pasan D-08 a D-12; el precio aplicado al cobrar se prueba en PI-40               |
| PI-14 a PI-19 | 08/10/2026 | Francisco Andrade | Aprobado           | PI-19 se complementa con las operaciones HTTP cubiertas en PI-21 y PI-22         |
| PI-20 a PI-23 | 09/10/2026 | Nicolas           | Aprobado           | Pasan G-01 a G-11; la reactivación crea una nueva inscripción y valida el cupo   |
| PI-21, PI-24 a PI-27 | 09/10/2026 | Francisco Andrade | Aprobado     | PI-21 pasa a activar por `IInfoInscripciones` (D-02); pasan G-12, G-13 y E-15 a E-20 |
| PI-28 a PI-32 | 10/10/2026 | Francisco Andrade | Aprobado           | Pasan A-42 a A-48, E-21 a E-23 y G-14 a G-17 (defectos D-07 a D-14)              |
| PI-33 a PI-36 | 10/10/2026 | Francisco Andrade | Aprobado (parcial) | Pasan H-01 a H-06 sobre los componentes; falta recorrerlos por HTTP cuando se monte el subsistema |
| PI-37         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-18 a G-21 (defecto D-16)                                                  |
| PI-38, PI-39  | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-22 a G-27 e I-01 a I-04 (defectos D-17 y D-18)                                   |
| PI-40         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan H-07 a H-09 sobre los componentes; sin defectos                            |
| PI-41         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-28 a G-31 (punto a confirmar de PI-41 cerrado)                           |
| PI-06         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan B-10 a B-13 y B-16 a B-18 (defecto D-19)                                   |
| PI-42         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-10 y H-11 por la API; sin defectos                                       |
| PI-43         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-12 a H-14 por la API; sin defectos                                       |
| PI-22         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan G-06 a G-08; G-07 paga la primera cuota antes de la baja (defecto D-20)     |
| PI-44         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasa G-32 (defecto D-20)                                                         |
| PI-45         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-15 y H-16; sin defectos                                                  |
| PI-46         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan B-19 y B-20 con las actividades públicas; sin defectos                     |
| PI-05         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan B-05 a B-09, B-14, B-15 y B-21 con la grilla nueva; sin defectos            |
| PI-47, PI-48  | 12/10/2026 | Rosario Mendoza   | Aprobado           | Pasan J-01 a J-18 por la API; sin defectos                                       |

### 8.3 Defectos

| ID   | Caso  | Descripción                                                                                                                    | Severidad | Responsable | Corregido en        |
| :--- | :---- | :----------------------------------------------------------------------------------------------------------------------------- | :-------- | :---------- | :------------------ |
| D-01 | PI-22 | La preparación compartida de inscripción rechazaba alumnos en `BAJA`, impidiendo completar la reactivación por HTTP. Corregido: solo la reactivación puede preparar para un alumno dado de baja. | Media     | Nicolas     | `InscripcionService` |
| D-02 | PI-21 | `POST /inscripciones/:id/activar` permitía el alta definitiva sin pago, contra US-07. Corregido: la activación sale de la API y queda en `IInfoInscripciones.activar` para el cobro | Alta | Francisco Andrade | `inscripcion.routes.ts`, `IInfoInscripciones` |
| D-03 | PI-24 | La baja de un horario se hacía aunque tuviera inscriptos y después avisaba que había que reubicarlos. Corregido: responde 409 antes de darlo de baja | Alta | Francisco Andrade | `GestionServicioEntrenamientoService` |
| D-04 | PI-22 | La baja del alumno guardaba `inscripcion_horarios.fecha_hasta` (DATE) con `new Date()`: desde las 21:00 de Argentina quedaba el día siguiente. Corregido con `fechaActualArgentina()` | Media | Francisco Andrade | `InscripcionService` |
| D-05 | PI-22 | La baja de un alumno aceptaba `CAMBIO_PLAN` como motivo. Corregido: responde 400 | Baja | Francisco Andrade | `inscripcion.schemas.ts` |
| D-06 | PI-20 | A un plan mensual sin `clases_por_semana` (pase libre) no se le podía asignar ningún horario. Corregido; lo detectó un unitario | Media | Francisco Andrade | `InscripcionService` |
| D-07 | PI-28 | Con `USUARIOS_EDITAR` delegado, cualquier rol podía asignarse PROPIETARIA o quitarle el rol, desactivar o borrar a la dueña. Corregido: esas rutas exigen además el rol Propietaria | Alta | Francisco Andrade | `usuario.routes.ts` |
| D-08 | PI-28 | Se podía dejar el sistema sin ninguna propietaria activa. Corregido: responde 409 | Media | Francisco Andrade | `UsuarioService` |
| D-09 | PI-29 | Cualquier usuario podía cambiarse el DNI, la clave con la que se reusa un tutor existente, y quedar como tutor del hijo de otra persona. Corregido: exige `USUARIOS_EDITAR` | Alta | Francisco Andrade | `usuario.routes.ts` |
| D-10 | PI-29 | El alta de un usuario con un DNI repetido respondía 500. Corregido: 409, también si dos altas compiten (P2002) | Baja | Francisco Andrade | `UsuarioService`, `error-handler.ts` |
| D-11 | PI-30 | Una profesora podía pre-inscribir a cualquier alumno, a nombre de cualquier profesora y sin cargo, y así ver y editar sus datos y los del tutor. Corregido: solo a su nombre, sin bonificar y alumnos libres | Alta | Francisco Andrade | `InscripcionService` |
| D-12 | PI-31 | Una profesora podía indicar como tutor a cualquier usuario y la respuesta del alta le devolvía su DNI, dirección y demás datos. Corregido: no elige por id y recibe solo id, nombre y apellido | Alta | Francisco Andrade | `GestionPersonasService` |
| D-13 | PI-31 | Un tutor se reusaba por DNI aunque el email cargado fuera de otra cuenta. Corregido: responde 409 | Alta | Francisco Andrade | `AlumnoService` |
| D-14 | PI-32 | Los listados de inscripciones y transferencias devolvían la tabla entera. Corregido: `limit` y `offset`, hasta 100 por pedido | Baja | Francisco Andrade | `inscripcion.repository.ts`, `pago.repository.ts` |
| D-15 | PI-35 | El alta definitiva, la activación del alumno, su rol y el pago se guardaban en transacciones separadas: si fallaba un paso, el alumno podía quedar con la inscripción activa sin pago, o pre-inscripto con la inscripción activa y sin forma de destrabarlo. Corregido: van en una sola transacción (`IUnidadDeTrabajo`) | Alta | Francisco Andrade | `GestionCuotasYPagosService`, `shared/db/transaccion.ts` |
| D-16 | PI-37 | La pre-inscripción no recibía peso ni talla y ninguna actividad podía marcarse como que los pide, así que el criterio de US-05 "en clase que requiere peso/talla sin cargarlos, falla" no se cumplía. Corregido: `actividades.requiere_medidas` y `medidas` en `POST /inscripciones`, guardadas en `registros_progreso` | Media | Francisco Andrade | `InscripcionService`, `RegistroProgresoService` |
| D-17 | PI-38 | Una pre-inscripción que nunca se pagaba ocupaba el cupo para siempre; en las clases personalizadas, con 4 lugares, trababa el horario. Corregido: deja de ocupar lugar `DIAS_RESERVA_PREINSCRIPCION` días después de su inicio (parámetro, 3 por defecto) y las respuestas marcan la reserva vencida | Media | Francisco Andrade | `InscripcionService`, `inscripcion.repository.ts`, `ParametrosSistemaService` |
| D-18 | PI-38 | Cambiar de plan creaba la pre-inscripción nueva con inicio hoy, así que le renovaba la reserva de cupo: cambiando de plan se podía guardar el lugar sin pagar indefinidamente. Corregido: una pre-inscripción conserva su fecha de inicio al cambiar de plan | Media | Francisco Andrade | `inscripcion.repository.ts` |
| D-19 | PI-06 | La baja de una actividad no revisaba sus planes exclusivos: la actividad quedaba dada de baja y esos planes seguían vigentes y ofrecidos, pero inscribir en ellos fallaba porque ya no tenían horarios. Corregido: la baja responde 409 y nombra los planes vigentes exclusivos, que hay que dar de baja o pasar a otra actividad | Media | Francisco Andrade | `GestionServicioEntrenamientoService` |
| D-20 | PI-22, PI-44 | Reactivar a un pre-inscripto dado de baja que nunca pagó creaba la inscripción `ACTIVA` y dejaba activos al alumno y a su usuario, sin rol. El primer pago después ya no daba el alta, así que el alumno nunca recibía su rol. G-07 daba por bueno ese comportamiento. Corregido: si el alumno nunca tuvo un pago confirmado, la reactivación crea la inscripción `PREINSCRIPTA` y lo deja `INACTIVO`, y el primer pago le da el alta | Alta | Francisco Andrade | `GestionInscripcionesYClasesService`, `InscripcionService`, `AlumnoService` |

Los defectos se numeran D-01, D-02…

## 9. Puntos a confirmar

| Caso  | Punto                                                                                                                                                                                                                                                                                                                                                 | Estado  |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| PI-06 | Baja de una actividad con horarios activos. Resuelto: se bloquea solo si algún horario tiene alumnos inscriptos (US-03); si no, la baja de la actividad da de baja también sus horarios en el mismo paso. También se bloquea si tiene planes vigentes exclusivos (US-11, decidido el 11/10/2026) | Cerrado |
| PI-14 | La profesora carga pre-inscripciones (US-05) y necesita ver los planes. Resuelto: la matriz inicial le da `PLANES_VER` y `ALUMNOS_EDITAR`. En una base ya cargada la carga del catálogo no se los agrega, porque los permisos ya existían: mientras estemos en desarrollo se regenera la base (`DESPLIEGUE.md`), y cuando Neon tenga datos reales irá una migración de datos (`seguridad.md`, regla 10)                                                      | Cerrado |
| PI-18 | La profesora todavía no consulta ni edita alumnos: US-10 le permite ver solo a los que tiene a cargo, y eso sale de las inscripciones. Resuelto en PI-25: ve y edita solo a los alumnos con una inscripción vigente a su cargo                                                                                                                         | Cerrado |
| PI-19 | La activación, la baja y la reactivación se probaron sobre el componente; PI-21 y PI-22 ahora las cubren también por HTTP                                                                                                                                                                                                                           | Cerrado |
| PI-30 | ¿Una profesora pre-inscribe a un alumno que ya está a cargo de otra, o a nombre de otra? Resuelto: no; solo a su nombre, sin cargo no, y alumnos sin una inscripción vigente con otra profesora. Lo demás lo hace la propietaria | Cerrado |
| PI-31 | ¿Cuánto ve una profesora de un tutor que ya existía? Resuelto: id, nombre y apellido; reusar una cuenta exige que el DNI y el email sean de esa cuenta, y elegirla por id es de la propietaria | Cerrado |
| PI-29 | ¿El DNI se autoedita? Resuelto: no; el DNI y la fecha de nacimiento los cambia quien tiene `USUARIOS_EDITAR` | Cerrado |
| PI-37 | ¿Dónde se guardan el peso y la talla de la pre-inscripción y cómo se sabe qué actividad los pide? Resuelto: en un `registros_progreso` inicial a nombre de la profesora a cargo, y con la columna nueva `actividades.requiere_medidas` (cambio del DER decidido el 11/10/2026) | Cerrado |
| PI-38 | ¿La reserva de cupo de una pre-inscripción vence (el diseño del front decía 72 hs y lista de espera)? Resuelto: vence sola, contada desde el inicio de clases y no desde el alta, con un plazo en días que configura la propietaria (`DIAS_RESERVA_PREINSCRIPCION`, 3 por defecto). Se calcula al consultar, sin proceso programado. Sin lista de espera: el lugar vuelve a figurar disponible | Cerrado |
| PI-46 | Las actividades públicas no tienen límite de pedidos por IP: hoy ningún endpoint lo tiene (tampoco el login). Detrás del proxy de Render hace falta `trust proxy` para que el límite no caiga sobre la IP del proxy. Mientras tanto, la respuesta se puede reusar un minuto (`Cache-Control`). Falta decidir si se agrega `express-rate-limit` para toda la API | Abierto |
| PI-41 | ¿Dónde se guarda el texto libre de una baja con el motivo "Otro" (US-08)? `observaciones` es de la inscripción y se pisaría. Resuelto: columna nueva `inscripciones.detalle_baja` (VARCHAR(200), opcional), solo con el motivo `OTRO` (`ck_inscripciones_x2`); cambio del DER decidido el 11/10/2026 | Cerrado |

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
|   1.6   | 09/10/2026 | Casos PI-20 a PI-23, fábrica de horarios y tests G-01 a G-11; activación, baja, reactivación y cambios de inscripción                          | Nicolas           |
|   1.7   | 09/10/2026 | PI-21 activa por `IInfoInscripciones` (la ruta HTTP ya no existe); casos PI-24 a PI-27, PI-06 actualizado (la baja de actividad arrastra sus horarios sin alumnos) y tests B-16, G-12, G-13 y E-15 a E-20 (E-15 deja de ser "la profesora no consulta"); inscripciones y un alumno activo en el escenario de demostración; defectos D-02 a D-06 | Francisco Andrade |
|   1.8   | 10/10/2026 | Casos PI-28 a PI-32 (correcciones de la auditoría de seguridad) y tests A-42 a A-48, E-21 a E-23 y G-14 a G-17; defectos D-07 a D-14; puntos a confirmar de PI-29 a PI-31 cerrados | Francisco Andrade |
|   1.9   | 10/10/2026 | Casos PI-33 a PI-35 (cuotas y pagos) y archivo H con los tests H-01 a H-05; los tests de cuotas y pagos pasan de PI-28 a PI-33 y PI-34; fábrica `armarCuotasYPagos`; defecto D-15 | Francisco Andrade |
|   2.0   | 10/10/2026 | Caso PI-36 y test H-06: el pago adelantado empieza el día después del vencimiento vigente e historial de cuotas y pagos para la ficha | Francisco Andrade |
|   2.1   | 11/10/2026 | Caso PI-37 y tests G-18 a G-21: peso y talla al pre-inscribir en una actividad con `requiere_medidas`; defecto D-16 y punto a confirmar de PI-37 cerrado | Francisco Andrade |
|   2.2   | 11/10/2026 | Casos PI-38 (la reserva de cupo de una pre-inscripción vence) y PI-39 (carga de los parámetros del sistema), tests G-22 a G-26 y archivo I con I-01 a I-04; parámetros del sistema en los datos comunes; defecto D-17 y punto a confirmar de PI-38 cerrado | Francisco Andrade |
|   2.3   | 11/10/2026 | PI-38: paso 6 (cambiar de plan no renueva la reserva) y test G-27; defecto D-18 | Francisco Andrade |
|   2.4   | 11/10/2026 | Caso PI-40 y tests H-07 a H-09: el cobro aplica el precio vigente el día del cobro. PI-13 y la US-12 pasan a automatizadas por completo | Francisco Andrade |
|   2.5   | 11/10/2026 | Caso PI-41 y tests G-28 a G-31: el detalle de la baja con el motivo OTRO; punto a confirmar de PI-41 cerrado | Francisco Andrade |
|   2.6   | 11/10/2026 | PI-06: pasos 6 y 7 (los planes exclusivos vigentes frenan la baja de la actividad) y tests B-17 y B-18; PI-06 pasa a cubrir US-11; defecto D-19 | Francisco Andrade |
|   2.7   | 12/10/2026 | Cuotas y pagos montado en la API: casos PI-42 y PI-43 y tests H-10 a H-14; US-15, US-16 y US-17 pasan a automatizadas; `armarCuotasYPagos` usa los calculadores reales y PI-36 vence de fecha a fecha | Francisco Andrade |
|   2.8   | 12/10/2026 | Caso PI-44 y test G-32 (reactivar a quien nunca pagó); PI-22 y G-07 reactivan a un alumno que ya pagó; defecto D-20 | Francisco Andrade |
|   2.9   | 12/10/2026 | Caso PI-45 y tests H-15 y H-16 (situación de cuota en la ficha y el listado); US-18 pasa a automatizada | Francisco Andrade |
|   2.10  | 12/10/2026 | Caso PI-46 y tests B-19 y B-20 (panel público de disponibilidad); US-32 pasa a parcialmente automatizada; punto abierto sobre el límite de pedidos | Francisco Andrade |
|   2.11  | 12/10/2026 | El escenario de demostración pasa a la grilla real del centro (ocho actividades y 38 horarios); el centro cierra a las 23:00 (PI-05, test B-21); PI-04, PI-05, PI-06 y PI-46 se ajustan a los datos nuevos | Francisco Andrade |
|   2.12  | 12/10/2026 | PI-46 pasa a las actividades públicas (`GET /publico/actividades`): los horarios y los cupos dejan de ser públicos; B-19 y B-20 se reescriben | Francisco Andrade |
|  2.13   | 12/10/2026 | Casos PI-47 (los parámetros del sistema los edita solo la propietaria) y PI-48 (los datos bancarios para transferir) y archivo J con J-01 a J-18; US-05, US-16, US-18 y US-21 suman los casos nuevos | Rosario Mendoza |