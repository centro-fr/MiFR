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
| Google Auth          | En un login real, Google entrega un comprobante (`id_token`) y el backend le consulta a Google si es válido. En las pruebas se reemplaza solo esa consulta: el comprobante es directamente el correo del usuario de prueba y, después de una barra vertical, la foto de perfil que manda Google, así no hace falta una cuenta real de Google |
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
| Inscripciones                    | Fábrica `crearInscripcionDePrueba` (`back/src/__tests__/integracion/fabricas.ts`): inscripción de un alumno en un horario, directo en la base, `ACTIVA` por defecto o con el estado que se pida (una `BAJA` sale con motivo y horario cerrado). La usan los casos de asistencia para armar la lista de una clase sin pasar por el cobro |
| Reloj fijo                       | Los casos de asistencia (PI-47 a PI-50) fijan solo `Date` con `vi.useFakeTimers({ toFake: ["Date"] })` en el lunes 12/10/2026 a las 15:00 de Argentina: las clases del día y su cierre dependen del día de la semana y de la hora. El cierre automático se corre con `entorno.cierreAsistencia.procesarCierresAutomaticos(hora)`. Lo que la base completa con su propio reloj (como `horarios.fecha_alta`) se fija a mano: el reloj simulado no llega a Postgres |
| Horarios                         | Fábrica `crearHorarioDePrueba` (`back/src/__tests__/integracion/fabricas.ts`): horario directo para el test con actividad, profesora, día, horas y cupo propios configurables                                                                                                                                       |
| Cuotas y pagos                   | `armarCuotasYPagos` (`back/src/__tests__/integracion/cobro.ts`): arma el subsistema con los componentes y repositorios reales sobre la base de prueba. Repite el cableado de `composicion.ts`, con los calculadores reales, para poder pasarle otro `PagoRepository` y simular una falla al guardar el pago (PI-35). Los flujos por HTTP (PI-42, PI-43) usan la API montada |
| Profesoras, actividades y roles  | Fábricas `crearProfesora` (usuario con el rol y su fila en `profesoras`), `crearActividad` (grupal o personalizada, con o sin cupo) y `darRol` (el rol que el alta definitiva le daría a un alumno o tutor), en `back/src/__tests__/integracion/fabricas.ts`. Las usan los casos de insignias, ranking e informes (PI-71 a PI-77) |
| Clases con su asistencia         | Fábrica `crearClase` (`back/src/__tests__/integracion/fabricas.ts`): una clase en el estado que se pida (`DICTADA` por defecto, `PROGRAMADA` o `CANCELADA`), con la profesora dictante y una marca por inscripto. Sin `id_usuario_registra`, la marca es como las que deja el cierre; con él, es una marca manual. Carga el historial de asistencia sin tomarla clase por clase |
| Catálogo de insignias            | El mismo del seed de producción (`cargarCatalogoInsignias`), antes de cada test. Los casos de racha bajan los umbrales en la base (Racha de 10 a 3 clases, Total de 50 a 4) para no cargar medio año de clases |
| Escenario de demostración        | Seed de desarrollo (`cargarDatosDemo`, `back/src/shared/db/datos-demo.ts`). `pnpm --filter back db:seed:demo` lo carga en la base local y los tests en la base de prueba, así el mismo escenario se recorre a mano (Swagger o front) y en los tests                                                                    |
| Procesos programados             | `entorno.aplicadorProgramados.aplicarDelDia()` corre el proceso `AplicadorProgramados` (los cambios de plan y las salidas de horario programados) con el reloj fijo. Corre a lo sumo una vez por día y por proceso, y el entorno es uno por archivo: cada caso lo corre en días distintos (PI-98, PI-99). La sesión se vuelve a abrir después de mover el reloj, porque el token vence a la hora |

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
| US-01 | Inicio de sesión con Google Auth                          |   1    | PI-01, PI-02, PI-03, PI-07, PI-08, PI-10, PI-28, PI-29, PI-90  | Sí, salvo PI-10 (Manual)                                                               |
| US-02 | Definición de permisos por rol                            |   1    | PI-01 a PI-03, PI-05, PI-07 a PI-10, PI-14, PI-28, PI-29      | Sí, salvo PI-10 (Manual)                                                               |
| US-03 | Alta y administración de actividades y cupos              |   1    | PI-03, PI-04, PI-06, PI-37                                    | Sí                                                                                     |
| US-04 | Asignación de profesoras y horarios a actividades         |   1    | PI-03, PI-04, PI-05, PI-06, PI-24, PI-27, PI-38, PI-46, PI-99 | Sí                                                                                     |
| US-05 | Pre-inscripción de alumno nuevo                           |   2    | PI-15, PI-16, PI-20, PI-27, PI-30, PI-31, PI-37 a PI-39, PI-53, PI-64 | Sí, alumno, inscripción, horarios, cupos, peso y talla, reserva que vence y el alta en un solo pedido |
| US-06 | Asociación de tutor a alumno menor de edad                |   2    | PI-16, PI-17, PI-19, PI-31                                    | Sí                                                                                     |
| US-07 | Alta definitiva al confirmarse el primer pago             |   2    | PI-19, PI-21, PI-34, PI-35, PI-38, PI-42 a PI-44             | Sí                                                                                     |
| US-08 | Baja lógica de alumno                                     |   2    | PI-18, PI-19, PI-22, PI-41, PI-44, PI-45, PI-99               | Sí                                                                                     |
| US-09 | Modificación de datos de alumno                           |   2    | PI-17, PI-23, PI-25, PI-97                                    | Sí, cambio de plan y horarios (las cuotas corresponden al Sprint 3)                    |
| US-10 | Consulta y búsqueda de alumnos                            |   2    | PI-18, PI-20, PI-25, PI-26, PI-30, PI-32, PI-36, PI-45, PI-51, PI-52, PI-94, PI-95 | Sí                                                                              |
| US-11 | Alta y edición de planes vigentes                         |   2    | PI-06, PI-11, PI-12, PI-14                                    | Sí                                                                                     |
| US-12 | Actualización de precios con fecha de vigencia            |   2    | PI-11, PI-13, PI-40                                           | Sí                                                                                     |
| US-13 | Alta de descuentos y promociones temporales               |   4    | PI-59                                                         | Sí                                                                                     |
| US-14 | Renovación o cambio de plan                               |   5    | PI-97, PI-98                                                  | Sí: el cambio programado al terminar la gracia, su cancelación y el proceso que lo aplica; el cambio de horarios dentro de la misma profesora y actividad |
| US-15 | Registro de cobro en efectivo                             |   3    | PI-33 a PI-36, PI-40, PI-42                                   | Sí                                                                                     |
| US-16 | Registro de pago por transferencia con comprobante        |   3    | PI-33, PI-39, PI-43, PI-53, PI-54, PI-96 | Sí                                                                                     |
| US-17 | Aprobación o rechazo de transferencias                    |   3    | PI-33, PI-43, PI-96 | Sí                                                                                     |
| US-18 | Cálculo del estado de habilitación del alumno             |   3    | PI-39, PI-45, PI-47, PI-51, PI-53                             | Sí: el parámetro `VENCIDOS_PUEDEN_ASISTIR` y el estado en la ficha, el listado y la lista de asistencia |
| US-19 | Control de efectivo pendiente de rendición                |   4    |                                                               |                                                                                        |
| US-20 | Registro de asistencia por clase                          |   3    | PI-47, PI-48, PI-49, PI-55, PI-56                             | Sí                                                                                     |
| US-21 | Registro automático de inasistencias                      |   3    | PI-39, PI-49, PI-50, PI-53, PI-56                             | Sí                                                                                     |
| US-22 | Detección de alumnos inactivos con cuota al día           |   4    | PI-69, PI-70                                                  | Sí                                                                                     |
| US-23 | Informe mensual automático de honorarios                  |   4    | PI-57 (lo cobrado en el período), PI-63 (las clases suplidas), PI-66 (las inscripciones a cargo), PI-78 a PI-82, PI-86, PI-91 | Sí: el 50 % de lo cobrado (a precio de lista si hubo promoción), el desglose, los estados, los períodos, los permisos y las tarifas; la exportación a PDF y Excel no está en el back |
| US-24 | Registro de suplencias entre profesoras                   |   4    | PI-60 a PI-63                                                 | Sí; no editar una suplencia de un período liquidado queda para US-23 (sección 9)       |
| US-25 | Aviso automático de vencimiento de cuota                  |   4    | PI-57 (las cuotas para avisar), PI-67, PI-68, PI-92                  | Sí: los avisos, su destinatario, que no se dupliquen y las notificaciones propias por la API |
| US-26 | Resumen diario para la propietaria                        |   4    |                                                               | No aplica: retirada del sistema el 13/11/2026 (PI-65 retirado) |
| US-27 | Carga de rutina y evolución física                        |   5    |                                                               |                                                                                        |
| US-28 | Consulta de rutina y progreso físico                      |   5    |                                                               |                                                                                        |
| US-29 | Consulta de estado de plan, asistencias y próximas clases |   5    | PI-93                                                         | Sí: el plan con la cuota de la ficha, las próximas clases, el historial, el panel del menor para su tutor y el alcance; la pantalla está en el front |
| US-30 | Ranking de asistencia entre alumnos                       |   5    | PI-72, PI-73 (el Podio del mes sale del ranking)              | Sí                                                                                     |
| US-31 | Insignias y racha de asistencia                           |   5    | PI-71, PI-73                                                  | Sí                                                                                     |
| US-32 | Panel público de disponibilidad                           |   5    |                                                               | No aplica: desde el 13/11/2026 la página pública usa datos fijos del front y no hay endpoint (PI-46 retirado) |
| US-33 | Informe de asistencia                                     |   5    | PI-74, PI-75                                                  | Parcial: el informe por la API; la exportación a PDF y Excel no está en el back        |
| US-34 | Informe de cuotas vencidas                                |   5    |                                                               |                                                                                        |
| US-35 | Reportes de inscriptos por mes                            |   5    | PI-87                                                         | Sí: altas, bajas y activos por mes, motivos de baja y permanencia; la comparación entre años la arma el front pidiendo un año por vez |
| US-36 | Reportes de planes más elegidos                           |   5    |                                                               |                                                                                        |
| US-37 | Mapa de calor de ocupación de horarios                    |   5    | PI-76, PI-77                                                  | Sí: los datos de cada celda y su nivel; los colores y la grilla son del front          |
| US-38 | Gestión del plantel de profesoras                         |  4/5   | PI-88, PI-89                                                  | Sí: edición, reincorporación y contacto solo para la propietaria                       |

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
| PI-46         | Las actividades públicas del centro                                 | US-32, US-04        | Servicios          | Demostración                                               | Retirado    |
| PI-47         | Las clases del día y su lista de asistencia                         | US-20, US-18        | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-48         | Marcar asistencia                                                   | US-20               | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-49         | Cerrar la asistencia con el botón                                   | US-21, US-20        | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-50         | Cierre automático al terminar la clase                              | US-21               | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-51         | El filtro del listado de alumnos por estado de cuota                | US-10, US-18        | Servicios          | Demostración                                               | Sí           |
| PI-52         | El historial de cuotas y pagos en la ficha                          | US-10, US-17        | Servicios          | Demostración                                               | Sí           |
| PI-53         | Los parámetros del sistema los ve y edita solo la propietaria      | US-05, US-16, US-18, US-21 | Servicios   | Comunes                                                    | Sí           |
| PI-54         | Los datos bancarios para transferir los ven el alumno y su tutor   | US-16               | Servicios          | Comunes                                                    | Sí           |
| PI-55         | La propietaria corrige las clases de un día anterior                | US-20               | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-56         | La propietaria cancela una clase                                    | US-21, US-20        | Servicios          | Demostración, `crearInscripcionDePrueba`, reloj fijo       | Sí           |
| PI-64         | El alumno y su pre-inscripción en un solo pedido                    | US-05, US-06        | Servicios          | Demostración, `crearAlumno`                                | Sí           |
| PI-65         | El resumen diario de la propietaria                                 | US-26               | Servicios          | Demostración                                               | Retirado    |
| PI-66         | Las inscripciones a cargo de cada profesora en un período           | US-23               | Servicios          | Demostración, `crearInscripcionDePrueba`                   | Sí           |
| PI-67         | Los avisos de vencimiento de cuota                                  | US-25               | Servicios          | Demostración                                               | Sí           |
| PI-68         | Las notificaciones propias por la API                               | US-25               | Servicios          | Demostración, reloj fijo                                   | Sí           |
| PI-69         | La detección de alumnos inactivos con la cuota al día               | US-22               | Servicios          | Demostración, clases cerradas cargadas en la base          | Sí           |
| PI-70         | La gestión de los alumnos inactivos                                 | US-22               | Servicios          | Demostración, clases cerradas cargadas en la base          | Sí           |
| PI-71         | La racha y las insignias del alumno                                 | US-31               | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-72         | El ranking de asistencia                                            | US-30               | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-73         | El cierre mensual de insignias                                      | US-30, US-31        | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-74         | El informe de asistencia                                            | US-33, US-21, US-24 | Servicios          | Fábricas, `crearClase`, cierre automático                  | Sí           |
| PI-75         | Los filtros y los permisos del informe de asistencia                | US-33               | Servicios          | Fábricas, `crearClase`, cierre automático                  | Sí           |
| PI-76         | La ocupación de los horarios                                        | US-37               | Servicios          | Fábricas                                                   | Sí           |
| PI-77         | Los filtros y los permisos de la ocupación                          | US-37               | Servicios          | Fábricas                                                   | Sí           |
| PI-78         | El cálculo de los honorarios del mes                                | US-23, US-24        | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-79         | Lo que no genera honorarios y lo que no se puede calcular           | US-23               | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-80         | Recalcular, cerrar y pagar una liquidación                          | US-23               | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-81         | Los períodos y los permisos de las liquidaciones                    | US-23, US-02        | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-82         | Las tarifas de honorarios                                           | US-23, US-02        | Servicios          | Fábricas, `crearClase`, reloj fijo                         | Sí           |
| PI-86         | El cierre mensual automático de los honorarios                      | US-23               | Servicios          | Fábricas, `crearClase`, reloj fijo, `DIA_CIERRE_HONORARIOS` | Sí           |
| PI-87         | El movimiento de alumnos del año en el reporte de Inscripciones     | US-35               | Servicios          | Fábricas, fechas de alta y baja fijadas en la base         | Sí           |
| PI-88         | Edición y reincorporación de profesoras                              | US-38, US-02        | Servicios          | Fábricas, sesiones, baja lógica                             | Sí           |
| PI-89         | Contacto y privacidad en el listado de profesoras                    | US-38, US-02        | Servicios          | Fábricas, datos de usuario                                  | Sí           |
| PI-90         | La foto de perfil de Google                                          | US-01               | Servicios          | Fábricas, sesiones, foto simulada                           | Sí           |
| PI-91         | Los descuentos de las promociones no reducen los honorarios         | US-23, US-13        | Servicios          | Fábricas, reloj fijo, promoción en la inscripción           | Sí           |
| PI-92         | Los avisos de cuota llegan al celular por push                      | US-25               | Servicios          | Demostración, servicio de push simulado                     | Sí           |
| PI-93         | El panel del alumno: plan, próximas clases y asistencias            | US-29               | Interfaces         | Demostración, `crearClase`, primer pago en efectivo         | Sí           |
| PI-94         | El historial de asistencia de la ficha                               | US-10               | Servicios          | Demostración, clases cargadas en la base                   | Sí           |
| PI-95         | El listado de alumnos con todas las inscripciones vigentes           | US-10               | Servicios          | Demostración, `crearInscripcionDePrueba`                   | Sí           |
| PI-96         | Las transferencias de dos planes del mismo alumno                    | US-16, US-17        | Servicios          | Demostración, `crearInscripcionDePrueba`                   | Sí           |
| PI-97         | El cambio de horarios: inscripción activa, misma profesora y actividad | US-09, US-14      | Servicios          | Demostración, `crearHorarioDePrueba`                       | Sí           |
| PI-98         | Con el plan vigente, el cambio de plan se aplica al terminar la gracia | US-14             | Servicios          | Demostración, reloj fijo, primer pago en efectivo, `AplicadorProgramados` | Sí  |
| PI-99         | La baja programada de un horario con alumnos                         | US-04, US-08        | Servicios          | Demostración, reloj fijo, primer pago en efectivo, `AplicadorProgramados` | Sí  |

PI-07 a PI-09 cubren riesgos de control de acceso que los tests unitarios no ven, porque con mocks los permisos nunca salen de la base. PI-10 reúne los pasos de PI-01 y PI-02 que ocurren en el navegador. PI-11 a PI-27 son del Sprint 2: planes y precios (PI-11 a PI-14), alumnos (PI-15 a PI-19 y PI-25, PI-26) e inscripciones (PI-20 a PI-24 y PI-27). PI-28 a PI-32 salen de la auditoría de seguridad del backend (10/10/2026): cada uno prueba contra la base uno de los arreglos que resume `back/.claude/rules/seguridad.md`. PI-33 en adelante son de cuotas y pagos (Sprint 3); mientras el subsistema no esté montado en la API, se prueban sobre los componentes reales y la base, sin HTTP. PI-47 a PI-50 son de clases y asistencia (Sprint 3). PI-51 y PI-52 completan US-10 con el estado de cuota y el historial de pagos. PI-53 y PI-54 son de los parámetros del sistema que edita la propietaria y de los datos bancarios para transferir. PI-55 y PI-56 cierran los puntos abiertos de asistencia (12/10/2026). PI-64 es la pre-inscripción en un solo pedido (18/10/2026); se numera después de PI-57 a PI-63, que ya usa la trazabilidad. PI-78 a PI-82 son de las liquidaciones y las tarifas de honorarios (24/10/2026). PI-86 es el cierre mensual automático de los honorarios (04/11/2026). PI-87 es el movimiento de alumnos del reporte de Inscripciones (05/11/2026). PI-88 y PI-89 cubren edición, reincorporación y privacidad de contactos del plantel (09/11/2026). PI-90 es la foto de perfil que Google manda en el login y el back guarda y devuelve (10/11/2026). PI-91 es la liquidación a precio de lista de lo cobrado con promoción (13/11/2026). PI-93 es el panel del portal del alumno (13/11/2026). PI-94 es el historial de asistencia de la ficha. PI-97 a PI-99 son el cambio de horarios dentro de lo contratado, el cambio de plan programado y la baja programada de un horario con alumnos (13/11/2026).

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
5. Marina intenta dar de alta a Ana sin DNI, sin el nombre o sin el teléfono del contacto de emergencia, y a un menor con un tutor nuevo sin DNI.
6. Se inserta en la base un alumno sin contacto de emergencia, sin pasar por la API.

**Resultado esperado:** el paso 1 responde 201; en la base el alumno y su usuario quedan `INACTIVO` y sin roles, y el login de Ana responde 403 hasta que se confirme su primer pago. El paso 2 responde 201: la matriz inicial le da a la profesora `ALUMNOS_EDITAR`. El paso 3 responde 409 con el código `ALUMNO_EXISTENTE` y el id del alumno que ya existe, para que el front ofrezca abrir su ficha. En el paso 4 el email repetido responde 409 y el mayor sin email 400. En el paso 5 cada alta incompleta responde 400 (desde el 18/10/2026 el DNI y el contacto de emergencia son obligatorios). En el paso 6 Postgres rechaza la fila con `not_null_violation` (23502). Ninguno de los rechazos deja usuarios ni alumnos nuevos.

**Automatizado:** Sí (E-01 a E-04, E-24 y E-25).

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
5. En el Básico (sin actividad exclusiva), intenta combinar un horario de Funcional y uno de HIIT de Lucía.

**Resultado esperado:** el paso 1 responde 201 y guarda una inscripción `PREINSCRIPTA`, sus asignaciones vigentes y el precio del plan que rige hoy. El paso 2 devuelve esa inscripción. Los duplicados y cupos agotados responden 409; las incompatibilidades de plan, profesora y frecuencia responden 400. En el paso 5 responde 400 "Todos los horarios deben pertenecer a una misma actividad": cada inscripción es de una sola actividad (US-11, desde el 18/10/2026). Ninguna operación rechazada agrega una inscripción.

**Automatizado:** Sí (G-01 a G-03 y G-38).

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
3. Con la inscripción activa, actualiza sus horarios a otro de la misma profesora; prueba además un cambio sin cupo y un intento de edición de una profesora (las reglas del cambio de horarios están en PI-97).

**Resultado esperado:** el paso 1 responde 200 y, en una transacción, conserva la inscripción anterior como `BAJA` con motivo `CAMBIO_PLAN` y crea otra con el precio vigente. El cambio sin cupo responde 409 y deja intacta la inscripción original. Al cambiar horarios se cierran los anteriores y se agregan los nuevos; si no hay cupo responde 409 sin aplicar cambios. La profesora recibe 403. Las cuotas no se modifican: todavía no forman parte del modelo del Sprint 2.

**Automatizado:** Sí (G-09 a G-11).

#### PI-24 — Baja de un horario con alumnos inscriptos

**US:** US-04, US-08 · **Precondición:** escenario de demostración cargado; sesión de Marina; horario con cupo 3.

1. Se inscribe un alumno en el horario y Marina lo da de baja.
2. Marina da de baja al alumno y vuelve a dar de baja el horario.

**Resultado esperado:** el paso 1 responde 200 pero no da de baja el horario: lo deja con `fecha_baja_programada` y sin `fecha_baja`, porque los alumnos conservan lo que pagaron (US-04; el resto del ciclo está en PI-99). En el paso 2 la baja responde 200 y el horario queda con su fecha de baja.

**Automatizado:** Sí (G-12).

#### PI-25 — La profesora ve y edita solo a los alumnos a su cargo

**US:** US-09, US-10 · **Precondición:** escenario de demostración cargado (Sofía a cargo de Lucía, Mateo a cargo de Carla); sesión de Lucía.

1. Lucía lista los alumnos, abre la ficha de Sofía, la de Mateo y la de un id que no existe, y filtra por Carla.
2. Lucía modifica el teléfono y las observaciones de Sofía; después intenta cambiarle el nombre y modificar el teléfono de Mateo.
3. Lucía lista las inscripciones y abre la de Mateo.

**Resultado esperado:** en el paso 1 el listado trae solo a Sofía, con su plan (Básico) y su profesora; la ficha de Sofía trae su inscripción con dos horarios; la de Mateo responde 403, la del id que no existe responde el mismo 403 (no le cuenta qué alumnos existen) y el filtro por Carla devuelve una página vacía. En el paso 2 el contacto se guarda (200), el nombre y el alumno ajeno responden 403, y en la base Sofía conserva su nombre y Mateo no cambia. En el paso 3 solo aparece la inscripción de Sofía y la de Mateo responde 403.

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

**Resultado esperado:** en el paso 1 el otro alumno recibe 409 por cupo; la inscripción trae `reserva: { vence: hoy, vencida: false }` y el horario, 1 inscripto y 0 lugares. En el paso 2 el horario figura con 0 inscriptos y 1 lugar, el listado trae la reserva vencida (`vence` ayer) y la pre-inscripción nueva responde 201 con su reserva hasta dentro de 3 días; la vencida sigue PREINSCRIPTA. En el paso 3 la del horario libre queda ACTIVA y la otra recibe "No hay cupo disponible" y sigue PREINSCRIPTA. En el paso 4 la misma pre-inscripción vuelve a ocupar el lugar (409) y vence dentro de 3 días. En el paso 5 la baja responde 200 y queda programada: el horario sigue activo, con `fecha_baja_programada`. En el paso 6 el cambio responde 200: la pre-inscripción nueva conserva la fecha de inicio de la anterior, su reserva sigue vencida con el mismo vencimiento y el horario figura con 0 inscriptos y 2 lugares.

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

1. Carla, la profesora a cargo de Valentina, informa una transferencia de $30.000 hecha hace una hora (`POST /pagos/transferencia`) y Valentina consulta las suyas (`GET /pagos/mis-transferencias`). Antes, Valentina y Lucía (que no está a cargo) intentan informarla.
2. Marina consulta las pendientes (`GET /pagos/transferencias?estado=PENDIENTE`); Lucía intenta lo mismo. Marina intenta cobrarle a Valentina en efectivo.
3. Con la base reiniciada y la transferencia informada, Marina la rechaza sin motivo y después con el motivo "No figura en el extracto"; intenta aprobarla. Carla la vuelve a informar.
4. Con la base reiniciada y la transferencia informada, Marina la aprueba. Después carga como recibida una transferencia de $25.000 de Sofía (`POST /pagos/transferencia-recibida`).
5. Con la base reiniciada, Carla informa una transferencia de Valentina y Marina carga la de Sofía. Marina lista las transferencias de las más nuevas a las más viejas (`orden=desc`), las de primera cuota (`tipo=PRIMERA_CUOTA`), las cargadas hoy (`desde` y `hasta`), las de enero de 2026 y con un tipo desconocido.
6. Con la base reiniciada y el vencimiento de la primera cuota de Valentina movido a ayer, Carla informa una transferencia y Marina lista las de cuota vencida y las de renovación.

**Resultado esperado:** en el paso 1 Valentina y Lucía reciben 403 sin guardar nada (desde el 18/10/2026 el alumno ya no informa transferencias). La de Carla queda `PENDIENTE` en una cuota 2 nueva, registrada por Carla y sin profesora que la rinda, Marina la ve en las pendientes y Valentina la ve en su listado. En el paso 2 Marina la ve, sin superar las 24 horas; Lucía recibe 403 y el cobro en efectivo, 409, sin guardar nada. En el paso 3 el rechazo sin motivo responde 400; con motivo, 200 y `RECHAZADO`; la aprobación de una rechazada, 409. La transferencia nueva se carga en la misma cuota 2, sin saltear números. En el paso 4 la aprobación responde 200, con el pago `CONFIRMADO` y Marina como quien la revisó; la transferencia recibida responde 201 `CONFIRMADO` y da el alta de Sofía (inscripción `ACTIVA` y alumna `ACTIVO`). En el paso 5 el listado responde `{ datos, total, limit, offset }` con total 2: primero la de Sofía (plan Básico, monto esperado $25.000, `PRIMERA_CUOTA`) y después la de Valentina (Intermedio, $30.000, `RENOVACION`). El filtro por tipo trae solo la de Sofía, con total 1; las de hoy son 2, las de enero ninguna, y el tipo desconocido responde 400. En el paso 6 la de Valentina es `CUOTA_VENCIDA` y no hay renovaciones.

**Automatizado:** Sí (H-12 a H-14 y H-20 a H-22).

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

> **Retirado el 13/11/2026.** La página pública pasó a mostrar datos fijos del front y `GET /publico/actividades` se borró junto con el subsistema DifusionPublica, para que un visitante no despierte la API ni la base. Se conserva el caso como historial.

**US:** US-32, US-04 · **Precondición:** escenario de demostración cargado (ocho actividades con horarios; Combat se da martes y jueves, y Training lunes, miércoles y viernes).

1. Un visitante, sin sesión, consulta `GET /publico/actividades`, `GET /publico/disponibilidad` y `GET /horarios`.
2. Marina da de baja los dos horarios de Combat y el Training del viernes, y el visitante vuelve a consultar las actividades.

**Resultado esperado:** en el paso 1 las actividades responden 200 con `Cache-Control: public, max-age=60` y las ocho actividades, cada una con su descripción, su modalidad, los días en que se da y las clases por semana (Funcional, de lunes a viernes, con 11). La respuesta no trae horas, profesoras, cupos ni datos de alumnos. `GET /publico/disponibilidad` ya no existe (404) y la grilla de horarios exige sesión (401). En el paso 2 Combat deja de ofrecerse y Training figura los lunes y los miércoles, con 2 clases.

**Automatizado:** Retirado (B-19 y B-20 se borraron).

#### PI-47 — Las clases del día y su lista de asistencia

**US:** US-20, US-18 · **Precondición:** escenario de demostración y reloj fijo el lunes 12/10/2026 a las 15:00. Lucía tiene un horario de Funcional los lunes de 20:00 a 21:00 (cupo 10) con cinco inscriptos activos: Acosta (al día), Benítez (vencida), Castro (vencida, con una transferencia sin revisar), Díaz y Escobar (activos, sin cuotas). Ibarra está pre-inscripto desde hoy, con la reserva vigente. Ferreyra se dio de baja hoy y Gómez está en el horario de Lucía de los miércoles.

1. Lucía pide `GET /clases/hoy` dos veces.
2. Con un horario de Carla del mismo lunes, Lucía vuelve a pedir sus clases y después las pide Carla.
3. Lucía abre `GET /clases/:id/asistencia` de su clase.
4. Valentina, alumna, pide `GET /clases/hoy`.

**Resultado esperado:** en el paso 1 las dos respuestas son iguales (200), con solo clases de Lucía; la de las 20:00 está `PROGRAMADA`, con 5 inscriptos y 4 lugares libres (Ibarra no está en la lista, pero su reserva ocupa un lugar), y en la base hay una sola fila de `clases` para ese horario y ninguna para el de los miércoles. En el paso 2 el pedido de Lucía no crea la clase del horario de Carla, y Carla no ve la clase de Lucía. En el paso 3 la lista trae a los cinco activos por apellido, sin marcar, sin Ibarra (pre-inscripto), Ferreyra ni Gómez, con la situación de cuota: `AL_DIA`, `VENCIDA` (con `puede_asistir: true`, por `VENCIDOS_PUEDEN_ASISTIR`), `VENCIDA` con `tiene_pago_pendiente: true` y dos `PENDIENTE_DE_PAGO`. En el paso 4, 403 y ninguna clase creada.

**Automatizado:** Sí (J-01 a J-03).

#### PI-48 — Marcar asistencia

**US:** US-20 · **Precondición:** la de PI-47.

1. Lucía marca presente a Acosta y después ausente.
2. Lucía intenta marcar a Gómez (otro horario), a Ferreyra (dado de baja) y a Ibarra (pre-inscripto); Carla intenta marcar a Acosta y abrir la lista de la clase de Lucía.
3. En una clase de Lucía del lunes anterior, ya `DICTADA`, marcan Lucía y después Marina.
4. Lucía marca ausente a Benítez y usa `POST /clases/:id/asistencia/todos-presentes`.
5. Lucía marca a Acosta con la observación "  Llegó tarde ", lo vuelve a marcar sin observaciones, después con un texto vacío y por último con 256 caracteres.

**Resultado esperado:** en el paso 1, 200 las dos veces y una sola fila de Acosta con `asistio = false`, su inscripción, el `id_usuario_registra` de Lucía y la hora del marcado. En el paso 2, 404 en los cinco pedidos y ninguna fila en `asistencias`. En el paso 3 Lucía recibe 404 (la clase no es de hoy) y Marina 200, con la corrección guardada. En el paso 4 los cinco activos quedan presentes, Benítez incluida. En el paso 5 la observación se guarda recortada y sale en la lista; la marca sin observaciones la conserva, el texto vacío la borra (NULL) y la de 256 caracteres responde 400.

**Automatizado:** Sí (J-04 a J-07 y J-13).

#### PI-49 — Cerrar la asistencia con el botón

**US:** US-21, US-20 · **Precondición:** la de PI-47; Lucía marcó presentes a Acosta, Benítez y Castro.

1. Lucía cierra la asistencia (`POST /clases/:id/cerrar`) y la vuelve a cerrar.
2. Con la clase cerrada, Lucía intenta marcar a Escobar y Marina lo marca presente.
3. Lucía intenta "todos presentes".

**Resultado esperado:** en el paso 1, 200 las dos veces; la clase queda `DICTADA` con `fecha_cierre_asist`, hay cinco filas y las dos nuevas son ausentes (Díaz y Escobar) con `id_usuario_registra` NULL; Ferreyra no tiene fila y el segundo cierre no agrega nada. En el paso 2 Lucía recibe 409 y Marina 200: Escobar queda presente, con quién lo corrigió. En el paso 3, 409.

**Automatizado:** Sí (J-08 y J-09).

#### PI-50 — Cierre automático al terminar la clase

**US:** US-21 · **Precondición:** la de PI-47 y dos clases de hoy de 20:00 a 21:00: en una Lucía marcó presente a Acosta, la otra no tiene marcas.

1. Se corre el cierre automático a las 20:59 y a las 21:00.
2. Con la base reiniciada y `MINUTOS_CIERRE_ASISTENCIA = 15`, se corre a las 21:14 y a las 21:15.
3. Con la base reiniciada y el reloj a las 21:00, Marina abre la lista de la clase con marcas, sin que haya corrido el cierre.

**Resultado esperado:** en el paso 1 a las 20:59 no cierra ninguna; a las 21:00 cierra las dos, con `fecha_cierre_asist` a las 21:00: la que tenía marcas suma cuatro ausentes y la otra queda `DICTADA` con su inscripto presente: desde el 12/11/2026, una clase que cierra sin ninguna marca se da por dictada con todos presentes. En el paso 2 no cierra a las 21:14 y cierra las dos a las 21:15. En el paso 3 la lista ya muestra la clase `DICTADA` con los cuatro ausentes.

**Automatizado:** Sí (J-10 a J-12).

#### PI-51 — El filtro del listado de alumnos por estado de cuota

**US:** US-10, US-18 · **Precondición:** escenario de demostración cargado (Sofía Medina pre-inscripta con Lucía y Mateo Romero pre-inscripto con Carla, los dos sin cuotas; Valentina Herrera al día con Carla). El vencimiento se corre en la base para simular el paso del tiempo.

1. Marina lista los alumnos con `estado_cuota=PENDIENTE_DE_PAGO`, después con `limit=1&offset=1` y después con `estado_cuota=AL_DIA`.
2. Carla lista los alumnos con `estado_cuota=PENDIENTE_DE_PAGO`.
3. Con la base reiniciada, la cuota de Valentina pasa a vencer hace 30 días y Marina lista con `VENCIDA` y con `AL_DIA`.
4. Marina lista con `estado_cuota=MOROSO`.

**Resultado esperado:** en el paso 1, Medina y Romero, por apellido, con `total: 2` y su `situacion_cuota` `PENDIENTE_DE_PAGO`; la segunda página trae solo a Romero con `total: 2`; con `AL_DIA`, solo Herrera. En el paso 2 Carla ve solo a Romero, con `total: 1`: Sofía no está a su cargo. En el paso 3 Herrera sale con `VENCIDA` y `AL_DIA` da una página vacía, sin que nada se haya guardado: el estado se calcula en cada consulta. En el paso 4, 400. Si los alumnos que cumplen los otros filtros son más de 500, el listado responde 400 para que se acote la búsqueda (probado en los unitarios de la fachada).

**Automatizado:** Sí (H-17 y H-18).

#### PI-52 — El historial de cuotas y pagos en la ficha

**US:** US-10, US-17 · **Precondición:** escenario de demostración cargado (Valentina Herrera con su primera cuota pagada en efectivo a Carla).

1. Valentina informa una transferencia y Marina la rechaza con el motivo "No llegó a la cuenta".
2. Marina abre la ficha de Valentina.
3. Carla, su profesora, abre la misma ficha.

**Resultado esperado:** en el paso 2 la ficha trae `historial_cuotas` de la cuota más nueva a la más vieja: la cuota 2 del Intermedio con el pago por transferencia `RECHAZADO` y su motivo, y la cuota 1 con el pago en efectivo `CONFIRMADO`. En el paso 3 Carla recibe 200 con la situación de cuota `AL_DIA` y `historial_cuotas: null`: los datos financieros son solo de la propietaria.

**Automatizado:** Sí (H-19).

#### PI-53 — Los parámetros del sistema los ve y edita solo la propietaria

**US:** US-05, US-16, US-18, US-21 · **Precondición:** base de prueba recién reiniciada, con los parámetros cargados; sesión de la propietaria.

1. La propietaria lista los parámetros (`GET /parametros`).
2. Cambia `DIAS_RESERVA_PREINSCRIPCION` a 7 y `VENCIDOS_PUEDEN_ASISTIR` a false (`PATCH /parametros/{clave}`).
3. Intenta cargar un negativo, 366 días, un texto en un parámetro entero, más de 1440 minutos, un texto en un booleano y una clave que no existe.
4. Se borra la fila de un parámetro; la propietaria lo lista y lo edita.
5. Sin sesión, y con la sesión de una profesora, un alumno y un tutor, se intenta listar y editar los parámetros; la profesora también pide los datos bancarios.

**Resultado esperado:** el paso 1 devuelve todos los parámetros del catálogo con su tipo y su valor inicial. En el paso 2 los dos pedidos responden 200 y los valores quedan guardados y se ven en el listado. En el paso 3 todos responden 400 y la base no cambia ni crea filas. En el paso 4 el listado muestra el valor inicial con `fecha_actualizacion` en null, y al editarlo se crea la fila. En el paso 5 responde 401 sin sesión y 403 para los demás roles (la profesora no ve los datos bancarios), y el valor no cambia.

**Automatizado:** Sí (K-01 a K-10 y K-14 a K-18).

#### PI-54 — Los datos bancarios para transferir los ven el alumno y su tutor

**US:** US-16 · **Precondición:** base de prueba recién reiniciada, con los parámetros cargados; sesiones de la propietaria, un alumno y un tutor.

1. El alumno y el tutor piden los datos bancarios (`GET /parametros/datos-bancarios`).
2. La propietaria carga el CBU, el alias y el titular, y el alumno y el tutor los piden de nuevo.
3. La propietaria también los pide.

**Resultado esperado:** el paso 1 responde 200 con el CBU, el alias y el titular vacíos. En el paso 2 las tres cargas responden 200 y el alumno y el tutor ven los datos cargados. El paso 3 responde 200.

**Automatizado:** Sí (K-11 a K-13).

#### PI-55 — La propietaria corrige las clases de un día anterior

**US:** US-20 · **Precondición:** la de PI-47. El horario de Lucía de los lunes se dio de baja el 08/10/2026, después del lunes 05/10/2026.

1. Marina pide `GET /clases?fecha=2026-10-05` dos veces.
2. Marina marca ausente a Acosta en la clase de ese día.
3. Lucía pide `GET /clases?fecha=2026-10-05` y Marina pide `GET /clases?fecha=2026-10-13` (mañana).

**Resultado esperado:** en el paso 1 las dos respuestas traen las mismas clases (200): la del horario de Lucía aparece, aunque hoy esté dado de baja, porque ese día regía; está `DICTADA` (ya terminó y nadie la marcó: se da por dictada con todos presentes), con 5 inscriptos y 5 presentes en `asistencias`. En el paso 2, 200 y la corrección queda guardada: Acosta ausente y los otros cuatro presentes. En el paso 3 Lucía recibe 403 y la fecha futura 400, sin crear ninguna clase.

**Automatizado:** Sí (J-14 y J-15).

#### PI-56 — La propietaria cancela una clase

**US:** US-21, US-20 · **Precondición:** la de PI-47.

1. Marina cancela la clase de hoy de Lucía (`POST /clases/:id/cancelar`) dos veces.
2. Lucía y Marina intentan marcar a Acosta, Lucía intenta cerrar la asistencia y corre el cierre automático al terminar la clase.
3. Con la base reiniciada, Lucía intenta cancelar la clase; marca a Acosta y Marina intenta cancelarla; Lucía la cierra y Marina vuelve a intentar.

**Resultado esperado:** en el paso 1, 200 las dos veces y la clase queda `CANCELADA`. En el paso 2 las marcas y el cierre responden 409 y el cierre automático no la toca: sigue `CANCELADA`, sin `fecha_cierre_asist` y sin filas en `asistencias`. En el paso 3 Lucía recibe 403, la clase con una marca responde 409 y la dictada también 409; termina `DICTADA`. Cancelar una clase no genera ningún aviso: el de clase cancelada se retiró el 13/11/2026.

**Automatizado:** Sí (J-16 y J-17).

#### PI-64 — El alumno y su pre-inscripción en un solo pedido

**US:** US-05, US-06 · **Precondición:** escenario de demostración cargado; sesión de Marina (propietaria) y de Lucía (profesora). Un horario de Funcional con cupo 1 ya ocupado por otro alumno.

1. Marina da de alta y pre-inscribe en el Básico con Lucía a un adulto nuevo (`POST /preinscripciones`).
2. Marina intenta lo mismo con una menor y su tutora nueva en el horario lleno; después reintenta en un horario con lugar.
3. Marina pre-inscribe a un adulto en el Personalizado 2 días con Carla sin peso ni talla, y después con ellos.
4. Marina pre-inscribe a un adulto con un DNI que ya tiene otro alumno.
5. Lucía pre-inscribe a un adulto a nombre de Carla, a una menor eligiendo como tutora una cuenta existente por su id, y después a un adulto a su propio nombre.

**Resultado esperado:** en el paso 1 responde 201 con `id_alumno` e `id_inscripcion`; el alumno y su usuario quedan `INACTIVO` y la inscripción `PREINSCRIPTA` en el horario elegido. En el paso 2 el horario lleno responde 409 "No hay cupo disponible" y la base queda igual: ni la menor ni la tutora existen. El reintento responde 201 y la menor queda con la tutora como responsable. En el paso 3, sin medidas responde 400 sin guardar nada; con medidas, 201 y una medición inicial del alumno nuevo. En el paso 4 responde 409 `ALUMNO_EXISTENTE` con el id del alumno existente, sin guardar nada. En el paso 5, a nombre de otra profesora y con la tutora existente responde 403 sin guardar nada; a su nombre, 201.

**Automatizado:** Sí (G-33 a G-37).

#### PI-65 — El resumen diario de la propietaria

> **Retirado el 13/11/2026.** El resumen diario de la propietaria (US-26) se eliminó del sistema: `GET /resumen-diario`, la notificación diaria y `HORA_RESUMEN_DIARIO` ya no existen, y con ellos el archivo M de tests. Se conserva el caso como historial.

**US:** US-26 · **Precondición:** escenario de demostración cargado (Valentina Herrera en el Intermedio, a $30.000 y con 5 días de gracia, con su primera cuota cobrada en efectivo por Carla y sin rendir).

1. Con la primera cuota de Valentina vencida hace 10 días, Carla informa una transferencia de $30.000, que se carga hace 25 horas. Marina pide el resumen (`GET /resumen-diario`).
2. Con la base reiniciada, Marina rinde el efectivo de Carla, la cuota de Valentina pasa a vencida hace 2 días (dentro de la gracia) y pide el resumen.
3. Lucía pide el resumen; después, un pedido sin sesión.

**Resultado esperado:** en el paso 1 responde 200 con la fecha de hoy en Argentina, sin bloques con error y con novedades: una transferencia pendiente de $30.000 que pasó las 24 horas, con su plan; un cobro en efectivo de Carla por $30.000; y una cuota vencida, de una alumna, con 10 días de atraso y $30.000 estimados al precio de hoy, en el detalle de Carla y del Intermedio. En el paso 2 los tres bloques están en cero y el resumen sale "sin novedades": la cuota en los días de gracia no cuenta. En el paso 3, Lucía recibe 403 y sin sesión, 401.

**Automatizado:** Sí (M-01 a M-03).

#### PI-66 — Las inscripciones a cargo de cada profesora en un período

**US:** US-23 · **Precondición:** escenario de demostración cargado; un plan de prueba con cinco inscripciones de Lucía en la base: una activa desde el 15/09, una pre-inscripta del 05/10, una activa desde el 01/11 y dos dadas de baja, una a las 00:30 del 01/10 y otra a las 23:30 del 30/09 (hora argentina; las dos son del 01/10 en UTC).

1. Se piden las inscripciones a cargo de octubre (`IInfoInscripciones.aCargoEnPeriodo`, del 01/10 al 31/10). Es el contrato que usa la liquidación de honorarios; todavía no tiene endpoint.

**Resultado esperado:** vienen la activa desde septiembre y la baja de las 00:30 del 01/10, con su profesora, su plan, `sin_cargo` y su estado. No vienen la pre-inscripta, la que empieza en noviembre ni la baja de las 23:30 del 30/09: el borde del período es el día argentino, no el UTC.

**Automatizado:** Sí (G-39).

#### PI-67 — Los avisos de vencimiento de cuota

**US:** US-25 · **Precondición:** escenario de demostración cargado (Valentina Herrera en el Intermedio, con 5 días de gracia y su primera cuota cobrada; Mateo Romero, menor a cargo de Paula Romero, pre-inscripto en el Personalizado 2 días, también con 5 días de gracia). El planificador se corre con el día de hoy (`PlanificadorNotificaciones.generarAvisos`), como lo hacen el intervalo y la consulta de las notificaciones.

1. La cuota de Valentina venció ayer (entra en la gracia): se corre el planificador dos veces. Después vence hace 6 días (pasada la gracia) y se vuelve a correr.
2. Con la base reiniciada, la cuota vence en 10 días; después, hoy; después, venció ayer pero con una transferencia informada por Carla sin revisar; por último, con esa transferencia aprobada (renovó). Se corre el planificador en cada paso.
3. Con la base reiniciada, Marina cobra en efectivo la primera cuota de Mateo, que venció ayer. Se corre el planificador.
4. Se inserta dos veces, directo en la base, el mismo aviso (usuario, cuota y tipo).

**Resultado esperado:** en el paso 1 la primera corrida guarda un `CUOTA_POR_VENCER` para Valentina, con su cuota, `ENVIADA` y sin leer; la segunda no guarda nada; con la cuota vencida se suma un `CUOTA_VENCIDA`. En el paso 2 no se guarda ningún aviso: al día, el día del vencimiento (todavía al día), con la transferencia pendiente ni después de renovar. En el paso 3 hay un `CUOTA_POR_VENCER` para Paula y no para Mateo, con el texto completo: "La cuota de Mateo Romero del plan Personalizado 2 días venció el …: hay tiempo de renovarla hasta el …". En el paso 4 la base rechaza el segundo (`P2002`) y queda uno solo.

**Automatizado:** Sí (N-01 a N-04).

#### PI-68 — Las notificaciones propias por la API

**US:** US-25 · **Precondición:** escenario de demostración cargado; reloj fijo en un día propio del caso (el planificador genera a lo sumo una vez por día y por proceso).

1. La cuota de Valentina venció ayer. Valentina pide sus notificaciones (`GET /notificaciones/mias`).
2. Lucía pide las suyas y trata de marcar como leída la de Valentina; Valentina marca una que no existe.
3. Valentina marca la suya (`POST /notificaciones/{id}/leida`) y después todas (`POST /notificaciones/leidas`).
4. Con la base reiniciada, Valentina tiene dos notificaciones sin leer y Lucía una; Valentina marca todas. Después, un pedido sin sesión.

**Resultado esperado:** en el paso 1 responde 200 con el aviso del día recién generado (`CUOTA_POR_VENCER`, sin leer, "Tu cuota del plan Intermedio venció el 09/03/2031: hay tiempo de renovarla hasta el 14/03/2031."), `total` y `no_leidas` en 1. En el paso 2 Lucía no ve ninguna y recibe 404, igual que Valentina con la inexistente; el aviso sigue sin leer. En el paso 3 responde 200 con el aviso leído y después `{ marcadas: 0 }`. En el paso 4 se marcan 2 y la de Lucía sigue sin leer; sin sesión, 401.

**Automatizado:** Sí (N-05 y N-06).

#### PI-92 — Los avisos de cuota llegan al celular por push

**US:** US-25 · **Precondición:** escenario de demostración cargado. El servicio de push (FCM, APNs) es la frontera externa y se simula: se ve qué le llega y se le hace responder que un dispositivo ya no existe.

1. Valentina pide la clave pública, suscribe su celular y su cuota venció ayer. Se corre el planificador dos veces.
2. Con la base reiniciada, Valentina suscribe su celular, el servicio de push responde que ya no existe, y se corre el planificador.
3. Con la base reiniciada, Valentina suscribe su celular y después Lucía suscribe el mismo. Valentina lo da de baja; después lo da de baja Lucía.
4. Valentina intenta suscribir `https://db:5432/` como endpoint; alguien sin sesión intenta suscribir uno válido.

**Resultado esperado:** en el paso 1 la clave es la configurada, la suscripción responde 204 y al servicio de push le llega un solo aviso, al endpoint y con las claves del celular, con título "Cuota por vencer", el mismo texto que el aviso de la campana, la URL `/app/inicio` y la etiqueta de la cuota: la segunda corrida no lo repite. En el paso 2 la suscripción se borra y el aviso queda igual en la campana. En el paso 3 el celular pasa a Lucía; la baja de Valentina responde 204 pero no lo toca, y la de Lucía lo borra. En el paso 4, 400 (no es un servicio de push: la API no le pega a direcciones internas) y 401, sin guardar nada.

**Automatizado:** Sí (N-07 a N-10).

#### PI-93 — El panel del alumno: plan, próximas clases y asistencias

**US:** US-29 · **Precondición:** escenario de demostración cargado. Valentina Herrera tiene el Intermedio con Carla; se carga una clase de su horario del 07/09/2026, dictada por Carla, con Valentina ausente.

1. Valentina pide su panel (`GET /alumnos/mi-panel`) y Marina pide su ficha.
2. Marina registra en efectivo el primer pago de Mateo (menor, a cargo de Paula). Paula pide el panel sin `id_alumno` y con el de Mateo.
3. Valentina pide el panel con el `id_alumno` de Mateo. Lucía pide un panel.

**Resultado esperado:** en el paso 1 el panel trae el nombre de Valentina, el Intermedio con Carla a cargo y el mismo estado de cuota que la ficha; entre una y cinco próximas clases ordenadas por fecha y hora; y en el historial la clase del 07/09 como `AUSENTE`, con Carla, que fue quien la dictó. En el paso 2 Paula ve el panel de Mateo con su plan Personalizado 2 días y la cuota `AL_DIA`, igual con el `id_alumno`. En el paso 3, 404 para Valentina (un alumno ajeno responde igual que uno que no existe) y 403 para Lucía, que no es alumna ni tutora.

**Automatizado:** Sí (E-26 y E-27).

#### PI-94 — El historial de asistencia de la ficha

**US:** US-10 · **Precondición:** escenario de demostración cargado. Valentina Herrera (Intermedio, a cargo de Carla) tiene cuatro clases de su horario cargadas en la base: el 07/09 y el 21/09 presente, el 14/09 ausente con la observación "Avisó" (la dictó Lucía como suplente) y el 28/09 todavía abierta (`PROGRAMADA`).

1. Marina pide `GET /alumnos/:id/asistencias?limit=2`, después con `offset=2` y con `asistio=false`.
2. Carla pide el historial de Valentina; Lucía pide el de Valentina y el de un alumno que no existe; Marina, el de un alumno que no existe; Valentina, el suyo.

**Resultado esperado:** en el paso 1 responde 200 con `total` 3, `presentes` 2 y `ausentes` 1 (la clase abierta no cuenta), de la más nueva a la más vieja: el 21/09 y el 14/09 en la primera página (con Carla Ruiz, la hora en `HH:mm` y sin observaciones) y el 07/09 en la segunda. Con `asistio=false` trae solo la del 14/09, con Lucía Gómez y "Avisó", y los contadores sin filtrar. En el paso 2 Carla recibe 200 con las tres; Lucía, 403 tanto para Valentina como para el que no existe (no se revela si existe); Marina, 404, y Valentina, 403.

**Automatizado:** Sí (E-28 y E-29).

#### PI-69 — La detección de alumnos inactivos con la cuota al día

**US:** US-22 · **Precondición:** escenario de demostración cargado; la cuota de Valentina Herrera (Intermedio, 5 días de gracia) vence en 10 días; `INASISTENCIAS_CONSECUTIVAS_INACTIVO` en 3 (valor inicial). Las clases del horario de Valentina se cargan en la base, cerradas (`DICTADA`) salvo que se diga otra cosa, con su asistencia.

1. Valentina asiste a una clase y falta a las tres siguientes; falta también a una clase todavía abierta. Marina pide el listado (`GET /informes/alumnos-inactivos`).
2. Con la base reiniciada, falta a dos clases; después asiste a una y falta a dos más.
3. Con la base reiniciada, falta a tres clases y su cuota venció hace 10 días; después, hace 3 (en la gracia).
4. Con la base reiniciada, falta a tres clases: se pide con `minimo_inasistencias=4`; se cambia el parámetro a 4 y se pide con `minimo_inasistencias=2`; falta a una más y se filtra por su plan y por otro.

**Resultado esperado:** en el paso 1 aparece una fila con 3 inasistencias (la clase abierta no cuenta), la fecha de la clase a la que asistió, su contacto, Carla y el Intermedio, la cuota `AL_DIA` y la gestión `PENDIENTE`; el `umbral` es 3. En el paso 2 no aparece nunca. En el paso 3 no aparece con la cuota vencida y sí en la gracia, como `POR_VENCER` y sin fecha de última asistencia. En el paso 4 no aparece con el mínimo en 4, ni con el parámetro en 4 aunque el filtro pida 2 (`umbral` 4); con la cuarta falta aparece filtrando por el Intermedio y no por el Básico.

**Automatizado:** Sí (O-01 a O-04).

#### PI-70 — La gestión de los alumnos inactivos

**US:** US-22 · **Precondición:** la de PI-69, con Valentina inactiva (tres faltas en clases cerradas).

1. Marina la marca `CONTACTADO` (`PUT /informes/alumnos-inactivos/{idInscripcion}/seguimiento`) y pide el listado; después la marca `IGNORADO` y pide el listado sin filtro y con `estado_gestion=IGNORADO`.
2. Valentina asiste a una clase, con la presencia registrada después de la marca, y falta a tres más. Se pide el listado.
3. Con la base reiniciada, Marina la marca `GESTIONADO` y quita la marca dos veces (`DELETE`).
4. Marina trata de marcar la inscripción pre-inscripta de Sofía Medina. Lucía pide el listado y trata de marcar a Valentina; después, un pedido sin sesión.

**Resultado esperado:** en el paso 1 la fila muestra `CONTACTADO`; ignorada no aparece sin filtro y sí con el filtro, y queda una sola marca en la base. En el paso 2 aparece de nuevo como `PENDIENTE`: la marca venció. En el paso 3 la primera baja responde 204 y borra la marca; la segunda, 404. En el paso 4 la pre-inscripción responde 404, Lucía recibe 403 en las dos, sin sesión 401, y no queda ninguna marca.

**Automatizado:** Sí (O-05 a O-07).

#### PI-71 — La racha y las insignias del alumno

**US:** US-31 · **Precondición:** Ana, Beto y Caro (menor, con su tutor) activos en un horario de una profesora; Dani dado de baja. En septiembre: el 1 y el 4 dictadas por la titular, el 2 por una suplente, el 3 cancelada (sin marcas), el 5 y el 6 dictadas y el 7 todavía abierta. Ana: presente, presente, presente, ausente, presente, y ausente en la abierta. Umbrales bajados: Racha de 10 a 3 clases y Total de 50 a 4. Reloj fijo el 30/09/2026.

1. Ana pide su ficha (`GET /alumnos/{id}/insignias`) dos veces.
2. El tutor pide la de Caro; la propietaria, la de Beto. Ana pide la de Beto; el tutor, la de Ana; la profesora, la de Ana; Ana y la propietaria, la de un id que no existe.
3. Se vuelve a cargar el catálogo después de cambiar un umbral; se intenta guardar un umbral en 0.
4. Se guarda el Mes perfecto de Beto en agosto y en septiembre, y otra vez en septiembre.

**Resultado esperado:** en el paso 1, racha actual 1 desde el 6/9, mejor 3, 4 clases asistidas y próximo hito a 2 clases: la cancelada y la suplencia no cortan la racha, la falta sí y la abierta no cuenta. Las seis insignias del catálogo, con Racha (desde el 4/9, la clase que completó el umbral) y Total (desde el 6/9) obtenidas; en la base quedan esas dos filas una sola vez. En el paso 2, el tutor ve la de su menor (racha 3) y la propietaria cualquiera; los demás reciben 403, también el id inexistente para Ana, y la propietaria 404; no se guarda nada de Beto. En el paso 3 la recarga repone el umbral y el `CHECK` rechaza el 0. En el paso 4 la repetición en el mismo mes se rechaza y quedan dos filas.

**Automatizado:** Sí (P-01 a P-05).

#### PI-72 — El ranking de asistencia

**US:** US-30 · **Precondición:** la de PI-71.

1. Ana pide el ranking de septiembre (`GET /reportes/ranking-asistencia?desde=2026-09-01&hasta=2026-09-30`).
2. Con `RANKING_MINIMO_CLASES` en 3, el tutor pide el ranking sin período.
3. La profesora lo pide filtrando por otra actividad; Ana pide la segunda página de a uno; se le quita `REPORTES_RANKING_VER` al rol Alumno y Ana lo pide de nuevo.

**Resultado esperado:** en el paso 1, Beto primero (5 de 5, racha 5) y Ana segunda (80 %, racha 1, `es_propia`, con sus dos insignias), también en `propias`; Caro no llega a 4 clases y Dani está de baja, así que no figuran; ningún email, teléfono ni id de usuario. En el paso 2 el período es el mes en curso, Caro entra y queda segunda por clases asistidas (empata en 100 % con Beto, que tiene más), marcada como propia para el tutor. En el paso 3 la otra actividad da un ranking vacío, la página trae a Ana con el total 2, y sin el permiso responde 403.

**Automatizado:** Sí (P-06 a P-08).

#### PI-73 — El cierre mensual de insignias

**US:** US-30, US-31 · **Precondición:** la de PI-71, con el reloj en octubre.

1. Beto pide su ficha el 05/10/2026.
2. Con la base reiniciada, un proceso nuevo cierra septiembre; se baja `RANKING_MINIMO_CLASES` a 3 y otro proceso nuevo (un reinicio) vuelve a cerrar septiembre.

**Resultado esperado:** en el paso 1 la consulta cierra septiembre: Beto obtiene Mes perfecto y Podio del mes con período `2026-09`, y Ana el Podio; Caro no, por el mínimo. En el paso 2 el primer cierre informa 1 Mes perfecto y 2 podios; el segundo no agrega podios aunque Caro ahora entraría, y Beto sigue con un solo Mes perfecto.

**Automatizado:** Sí (P-09, P-10).

#### PI-74 — El informe de asistencia

**US:** US-33, US-21, US-24 · **Precondición:** Ana, Beto y Caro activos y Dani dado de baja, inscriptos en Funcional (cupo 4); Eva pre-inscripta. En septiembre: el 1 lo dicta la titular, el 2 la suplente, el 3 se cancela; el 7 la titular marca solo a Ana y el cierre automático de las 20:30 registra ausentes a Beto y Caro; el 10 sigue abierta con marcas.

1. La propietaria pide el informe de septiembre (`GET /reportes/asistencia?desde=2026-09-01&hasta=2026-09-30`).

**Resultado esperado:** 3 clases dictadas, 5 asistencias y 4 inasistencias (55,56 %), con las dos del cierre automático y sin la cancelada ni la abierta. Ana 3 de 3, Beto y Caro 1 de 3; la titular con 2 clases y 50 %, la suplente con 1 y 66,67 %. Dani no figura.

**Automatizado:** Sí (Q-01).

#### PI-75 — Los filtros y los permisos del informe de asistencia

**US:** US-33 · **Precondición:** la de PI-74.

1. La propietaria filtra por Ana, la suplente y Funcional a la vez; pide la segunda página de a uno; pide con `incluir_bajas=true`; filtra por otra actividad.
2. La profesora y un alumno piden el informe.

**Resultado esperado:** en el paso 1, la combinación trae solo la clase del 2/9 de Ana; la página, a Beto con el total 3; con las bajas aparece Dani (`BAJA`, 1 clase) y suben las asistencias; otra actividad responde todo en cero, sin error. En el paso 2, 403.

**Automatizado:** Sí (Q-02, Q-03).

#### PI-76 — La ocupación de los horarios

**US:** US-37 · **Precondición:** la de PI-74. Funcional con cupo propio 4: Ana, Beto y Caro activos, Dani dado de baja con la inscripción activa y Eva pre-inscripta. Personalizado sin cupo propio, en una actividad con cupo 2: Ana y Beto. Un horario sin cupo ni inscriptos, de la suplente, y otro dado de baja.

1. La propietaria pide la ocupación (`GET /reportes/ocupacion`).

**Resultado esperado:** Funcional 3 de 4 (75 %, `MODERADO`), Personalizado 2 de 2 heredado de la actividad (100 %, `COMPLETO`) y el horario sin cupo `SIN_CUPO`; el dado de baja no figura. El resumen da 3 horarios, ocupación total 83,33 % y un horario por nivel.

**Automatizado:** Sí (Q-04).

#### PI-77 — Los filtros y los permisos de la ocupación

**US:** US-37 · **Precondición:** la de PI-76.

1. La propietaria filtra por modalidad personalizada, por la actividad de Funcional y por la suplente.
2. La profesora pide la ocupación.

**Resultado esperado:** cada filtro trae solo su horario. La profesora recibe 403.

**Automatizado:** Sí (Q-05, Q-06).

## 7. Tests automatizados

351 tests en veinte archivos, según la corrida del 13/11/2026 (algunos archivos numeran sus códigos por regla y no por test, así que la tabla no suma lo mismo):

| Archivo | Ubicación                                                                       | Tests            | Casos                             |
| :-----: | :------------------------------------------------------------------------------ | :--------------- | :-------------------------------- |
|    A    | `back/src/__tests__/integracion/control-de-acceso.integration.test.ts`          | 50 (A-01 a A-50) | PI-01 a PI-03, PI-07, PI-08, PI-28, PI-29, PI-90 |
|    B    | `back/src/__tests__/integracion/actividades-y-horarios.integration.test.ts`     | 21 (B-01 a B-21) | PI-04, PI-05, PI-06, PI-46        |
|    C    | `back/src/shared/db/__tests__/catalogo-seguridad.integration.test.ts`           | 3 (C-01 a C-03)  | PI-09                             |
|    D    | `back/src/__tests__/integracion/planes.integration.test.ts`                     | 14 (D-01 a D-14) | PI-11, PI-12, PI-13, PI-14        |
|    E    | `back/src/__tests__/integracion/alumnos.integration.test.ts`                    | 29 (E-01 a E-29) | PI-15 a PI-18, PI-25, PI-26, PI-31, PI-93, PI-94 |
|    F    | `back/src/modules/gestion-personas/alumno/__tests__/alumno.integration.test.ts` | 3 (F-01 a F-03)  | PI-19                             |
|    G    | `back/src/__tests__/integracion/inscripciones.integration.test.ts`              | 44 (G-01 a G-44) | PI-20 a PI-24, PI-27, PI-30, PI-32, PI-37, PI-38, PI-41, PI-44, PI-64, PI-66, PI-97 a PI-99 |
|    H    | `back/src/__tests__/integracion/cuotas-y-pagos.integration.test.ts`             | 25 (H-01 a H-25) | PI-33 a PI-36, PI-40, PI-42, PI-43, PI-45, PI-51, PI-52, PI-95, PI-96 |
|    I    | `back/src/shared/db/__tests__/parametros-iniciales.integration.test.ts`         | 4 (I-01 a I-04)  | PI-39                             |
|    J    | `back/src/__tests__/integracion/clases-y-asistencia.integration.test.ts`        | 17 (J-01 a J-17) | PI-47 a PI-50, PI-55, PI-56       |
|    K    | `back/src/__tests__/integracion/parametros.integration.test.ts`                 | 18 (K-01 a K-18) | PI-53, PI-54                      |
|    L    | `back/src/__tests__/integracion/suplencias.integration.test.ts`                 | 15 (L-01 a L-15) | PI-60 a PI-63                     |
|    M    | `back/src/__tests__/integracion/resumen-diario.integration.test.ts`             | Retirado         | PI-65                             |
|    N    | `back/src/__tests__/integracion/notificaciones.integration.test.ts`             | 10 (N-01 a N-10) | PI-67, PI-68, PI-92                      |
|    O    | `back/src/__tests__/integracion/alumnos-inactivos.integration.test.ts`          | 7 (O-01 a O-07)  | PI-69, PI-70                      |
|    P    | `back/src/__tests__/integracion/insignias-y-ranking.integration.test.ts`        | 10 (P-01 a P-10) | PI-71 a PI-73                     |
|    Q    | `back/src/__tests__/integracion/reportes-asistencia-y-ocupacion.integration.test.ts` | 6 (Q-01 a Q-06) | PI-74 a PI-77                |
|    R    | `back/src/__tests__/integracion/honorarios.integration.test.ts`                 | 21 (R-01 a R-21) | PI-78 a PI-82, PI-86, PI-91       |
|    S    | `back/src/__tests__/integracion/reportes-inscripciones.integration.test.ts`     | 3 (S-01 a S-03)  | PI-87                             |
|    T    | `back/src/modules/gestion-personas/profesor/__tests__/profesor.integration.test.ts` | 5 (T-01 a T-05) | PI-88, PI-89                   |
|    U    | `back/src/__tests__/integracion/rutinas-y-progreso.integration.test.ts`          | 48 (U-01 a U-48) | PI-83 a PI-85                     |

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
| A-49        | El login guarda la foto de perfil de Google en el usuario y `/auth/me` la devuelve                                                                                              | PI-90 |
| A-50        | El login refresca la foto cuando Google manda otra y conserva la última si no manda ninguna                                                                                      | PI-90 |
| B-01 a B-04 | Cupo obligatorio en personalizadas; el horario sin cupo propio toma el de la actividad; el cupo propio manda; grupal sin cupo                                                   | PI-04 |
| B-05 a B-09 | Superposición de horarios de una misma profesora (también la propietaria); dos profesoras a la misma hora; horario invertido; profesora sin el rol                              | PI-05 |
| B-10 a B-13 | Descripción visible en todos los horarios; baja bloqueada con alumnos inscriptos; baja sin horarios; no pasar a personalizada sin cupo                                          | PI-06 |
| B-14, B-15  | No se asigna un horario en domingo ni se mueve uno existente a ese día; la base queda igual                                                                                     | PI-05 |
| B-16        | La baja de una actividad sin alumnos da de baja también sus horarios, que no se borran                                                                                        | PI-06 |
| B-17        | Una actividad con un plan vigente exclusivo no se da de baja (409 con el nombre del plan); la actividad, su horario y el plan quedan igual                                   | PI-06 |
| B-18        | Con su plan exclusivo dado de baja, la actividad se da de baja aunque haya planes vigentes para cualquier actividad                                                         | PI-06 |
| B-19        | Retirado el 13/11/2026. Un visitante sin sesión ve las actividades con sus días y sus clases por semana, sin horas, profesoras, cupos ni datos de alumnos; la grilla de horarios exige sesión      | PI-46 |
| B-20        | Retirado el 13/11/2026. Una actividad sin horarios vigentes deja de ofrecerse y la baja de un horario se refleja en sus días y sus clases                                                          | PI-46 |
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
| E-15 a E-17 | La profesora lista, abre y edita solo a sus alumnos, solo contacto y observaciones, y ve solo sus inscripciones; un alumno que no existe le responde igual que uno ajeno; la base no cambia con los rechazos | PI-25 |
| E-18 a E-20 | Filtros por plan, profesora y actividad; alumno sin inscripción con `inscripcion: null`; ficha con la inscripción vigente, su plan, profesora y horarios; el alumno activo de la demostración inicia sesión | PI-26 |
| E-21 a E-23 | La profesora no elige un tutor por id (403); un tutor con DNI y email de la misma cuenta se reusa y la profesora ve solo su nombre; DNI de una cuenta y email de otra (409) | PI-31 |
| E-24        | El alta sin DNI, sin contacto de emergencia o con un tutor nuevo sin DNI responde 400 sin guardar nada | PI-15 |
| E-25        | La base rechaza un alumno sin contacto de emergencia aunque no pase por la API (23502) | PI-15 |
| E-26        | La alumna ve su plan con la cuota de su ficha, sus próximas clases en orden y su historial, con quien dictó cada clase | PI-93 |
| E-27        | La tutora ve el panel de su menor una vez que pagó; la alumna no ve el de otro (404) y la profesora no tiene panel (403) | PI-93 |
| E-28        | La propietaria pagina el historial de las clases dictadas de la ficha, de la más nueva, y filtra presentes o ausentes con los contadores sin filtrar | PI-94 |
| E-29        | La profesora a cargo ve el historial; la que no lo tiene a cargo recibe 403, exista o no el alumno, y la alumna no tiene acceso | PI-94 |
| F-01 a F-03 | Activación de un mayor (rol `ALUMNO`, idempotente) y de un menor (rol `TUTOR` a su tutora); baja que corta el acceso y reactivación que lo devuelve                             | PI-19 |
| G-01 a G-03 | Inscripción preinscripta, precio vigente, filtros, validación de reglas, duplicados y cupo                                                                                   | PI-20 |
| G-04, G-05  | Alta definitiva idempotente, rol `ALUMNO`, login, revalidación de cupo y activación ausente de la API (404)                                                                   | PI-21 |
| G-06 a G-08 | Baja que libera cupo; reactivación de quien ya pagó con nuevo historial y rechazo cuando no hay cupo                                                                                        | PI-22 |
| G-09 a G-11 | Cambio transaccional de plan, cambio de horarios, rechazos por cupo y control de acceso                                                                                      | PI-23 |
| G-12        | Con inscriptos la baja del horario se programa (200, sin `fecha_baja`); sin ellos, se da de baja | PI-24 |
| G-13        | Inscriptos y lugares que quedan en el detalle y el listado de horarios; los dados de baja no cuentan; sin cupo, `cupo_disponible: null`                                     | PI-27 |
| G-14 a G-16 | La profesora pre-inscribe a su nombre a un alumno libre; no a nombre de otra, sin cargo ni a un alumno de otra profesora (403, sin inscripciones nuevas); la propietaria sí      | PI-30 |
| G-17        | `limit` y `offset` devuelven la página pedida; `limit=101` responde 400                                                                                                       | PI-32 |
| G-18 a G-21 | Sin peso ni talla en una actividad que los pide, 400 sin guardar nada; con ellos, medición inicial a nombre de la profesora; marcar la actividad los vuelve obligatorios; sin cupo, la medición no queda | PI-37 |
| G-22, G-23  | Una pre-inscripción sin pagar ocupa el lugar hasta 3 días después de su inicio, ese día incluido; después lo libera (para el alta y para la ocupación) y figura con la reserva vencida, sin dejar de estar PREINSCRIPTA | PI-38 |
| G-24        | El pago tardío activa si el lugar sigue libre y responde sin cupo si otro lo ocupó                                                                                            | PI-38 |
| G-25        | Con `DIAS_RESERVA_PREINSCRIPCION` en 7, la misma pre-inscripción vuelve a ocupar el lugar                                                                                    | PI-38 |
| G-26        | Una pre-inscripción con la reserva vencida sigue en el horario: su baja queda programada | PI-38 |
| G-27        | Cambiar de plan conserva la fecha de inicio de la pre-inscripción: la reserva no se renueva y sigue sin ocupar lugar                                                         | PI-38 |
| G-28        | La baja con el motivo `OTRO` guarda el detalle en todas las inscripciones vigentes y el listado de bajas lo devuelve                                                          | PI-41 |
| G-29        | El motivo `OTRO` sin detalle, o con el detalle en blanco, deja `detalle_baja` en null                                                                                        | PI-41 |
| G-30        | El detalle con otro motivo o de más de 200 caracteres responde 400 `VALIDATION_ERROR` y no da de baja nada                                                                   | PI-41 |
| G-31        | La base rechaza un detalle sin el motivo `OTRO` aunque se saltee la API (`ck_inscripciones_x2`)                                                                              | PI-41 |
| G-32        | Quien nunca pagó vuelve de la baja pre-inscripto, inactivo y sin rol; el primer pago le da el alta, el rol y el acceso                                                    | PI-44 |
| G-33        | La pre-inscripción en un solo pedido crea el alumno inactivo y su inscripción PREINSCRIPTA                                                                                | PI-64 |
| G-34        | Sin cupo responde 409 sin guardar el alumno ni el tutor; el reintento en otro horario funciona                                                                            | PI-64 |
| G-35        | Sin las medidas que pide la actividad no guarda nada; con ellas guarda la medición inicial del alumno nuevo                                                               | PI-64 |
| G-36        | Un DNI ya registrado responde 409 `ALUMNO_EXISTENTE` sin crear la inscripción                                                                                            | PI-64 |
| G-37        | Una profesora pre-inscribe a su nombre; a nombre de otra o eligiendo un tutor existente responde 403 sin guardar nada                                                    | PI-64 |
| G-38        | Un plan sin actividad exclusiva no acepta horarios de dos actividades de la misma profesora: 400 sin guardar la inscripción                                             | PI-20 |
| G-39        | Las inscripciones a cargo de un mes son las activas y las bajas que se cruzan con él, sin las pre-inscriptas, con el borde de la baja en hora argentina                 | PI-66 |
| G-40        | Los horarios no se cambian en una pre-inscripción (409) ni pasan a otra profesora u otra actividad (400) sin tocar la inscripción; dentro de lo contratado, sí | PI-97 |
| G-41        | Con el plan vigente el cambio de plan responde 202 con la fecha del día siguiente al último de gracia, la ficha lo muestra, se cancela y el proceso lo aplica ese día y no antes | PI-98 |
| G-42        | Con la gracia terminada el cambio de plan se aplica en el momento (200) | PI-98 |
| G-43        | Un horario con la baja programada no admite alumnos nuevos ni cambia su día (409), sí su cupo; la baja se cancela y cancelarla de nuevo responde 409 | PI-99 |
| G-44        | El proceso saca a la pre-inscripta enseguida y a los activos al terminar la gracia; quien se queda sin horarios pasa a baja con el alumno, y el horario cae con el último | PI-99 |
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
| H-17        | El filtro por estado de cuota trae solo los que coinciden, pagina sobre ellos con su total y a la profesora le deja solo los suyos                                | PI-51 |
| H-18        | El filtro sigue al vencimiento sin que nada se guarde y rechaza un estado que no existe                                                                         | PI-51 |
| H-19        | La propietaria ve el historial de cuotas con todos sus pagos, también el rechazado; la profesora a cargo recibe la ficha sin el historial                        | PI-52 |
| H-20        | El listado de transferencias trae el plan, el monto esperado y el tipo (primera cuota y renovación), con el filtro por tipo y por días de carga, el orden y el total | PI-43 |
| H-21        | La transferencia cargada después del vencimiento de la cuota anterior es de una cuota vencida                                                                    | PI-43 |
| H-22        | La transferencia la informa la profesora a cargo y queda pendiente para la propietaria; el alumno y otra profesora reciben 403 sin guardar nada                      | PI-43 |
| H-23        | El alumno con dos planes trae los dos en `inscripciones`, cada uno con su situación de cuota, y lo representa el más reciente                                     | PI-95 |
| H-24        | El alumno con un plan trae una inscripción y el dado de baja ninguna                                                                                             | PI-95 |
| H-25        | Cada plan informa su transferencia, el listado las distingue por `id_inscripcion` y aprobar una deja pendiente la otra                                            | PI-96 |
| I-01        | La carga deja cada parámetro del catálogo con su tipo, su valor inicial y su fecha de actualización                                                                         | PI-39 |
| I-02, I-03  | Volver a correr la carga no pisa un valor cambiado y repone uno que falta                                                                                                    | PI-39 |
| I-04        | La base rechaza un tipo de dato fuera del DER                                                                                                                                | PI-39 |
| J-01        | La profesora ve solo sus clases de hoy; pedirlas dos veces no las duplica y no se crean clases de otros días ni de horarios de otra profesora | PI-47 |
| J-02        | La lista trae a los inscriptos activos del horario, por apellido, con su situación de cuota (al día, vencida, transferencia sin revisar, pendiente de pago), sin el pre-inscripto, el dado de baja ni el de otro horario; la clase cuenta 5 inscriptos y 4 lugares libres | PI-47 |
| J-03        | Un alumno no accede a las clases (403) y no se crea ninguna                                                                                                     | PI-47 |
| J-04        | La marca se guarda al momento con quién y cuándo, y la última vale                                                                                                | PI-48 |
| J-05        | No se marca a un alumno de otro horario, a uno dado de baja ni a un pre-inscripto, ni en la clase de otra profesora (404); la base queda igual                  | PI-48 |
| J-06        | La profesora no toma asistencia de una clase de otro día; la propietaria la corrige                                                                             | PI-48 |
| J-07        | "Todos presentes" marca a los inscriptos vigentes y pisa una marca anterior                                                                                      | PI-48 |
| J-08        | Con 5 inscriptos y 3 presentes, el cierre registra 2 ausentes sin usuario, no toca al dado de baja y cerrar otra vez no duplica nada                              | PI-49 |
| J-09        | Después del cierre la profesora no marca más (409) y la propietaria corrige                                                                                      | PI-49 |
| J-10        | El cierre automático cierra al terminar la clase, ni un minuto antes; genera ausentes donde se marcó a alguien y da presentes a todos donde no se marcó a nadie    | PI-50 |
| J-11        | El cierre automático espera además los `MINUTOS_CIERRE_ASISTENCIA`                                                                                               | PI-50 |
| J-12        | Leer una clase vencida la cierra aunque el intervalo no haya corrido                                                                                            | PI-50 |
| J-13        | Las observaciones se guardan con la marca y salen en la lista; una marca sin observaciones las conserva y un texto vacío las borra; más de 255 caracteres, 400 | PI-48 |
| J-14        | La propietaria pide un día anterior: se crean sus clases con los horarios que regían, salen cerradas con todos presentes, no se duplican y las corrige          | PI-55 |
| J-15        | Otro día lo pide solo la propietaria (403 para la profesora) y una fecha futura responde 400, sin crear clases                                                    | PI-55 |
| J-16        | Una clase cancelada no admite marcas ni cierre, y el cierre automático no la toca ni le genera ausentes; cancelar dos veces no cambia nada                       | PI-56 |
| J-17        | No se cancela una clase con asistencias marcadas ni una dictada (409), y la profesora no cancela (403)                                                           | PI-56 |
| K-01        | Lista todos los parámetros del catálogo, con su tipo y su valor inicial                                                                                                       | PI-53 |
| K-02, K-03  | La propietaria cambia un parámetro entero y uno booleano, y el valor queda en la base y en el listado                                                                         | PI-53 |
| K-04 a K-08 | Rechaza con 400 un negativo, 366 días, un texto en un entero, más de 1440 minutos y un texto en un booleano, sin tocar la base                                                | PI-53 |
| K-09        | Una clave que no existe responde 400 y no crea ninguna fila                                                                                                                   | PI-53 |
| K-10        | Un parámetro sin fila rige con su valor inicial y al editarlo se crea                                                                                                         | PI-53 |
| K-11        | Sin cargar, el alumno y el tutor reciben los datos bancarios vacíos                                                                                                           | PI-54 |
| K-12, K-13  | La propietaria carga los datos bancarios y el alumno, el tutor y ella misma los ven                                                                                           | PI-54 |
| K-14        | Sin sesión, las tres rutas responden 401                                                                                                                                      | PI-53 |
| K-15 a K-17 | La profesora, el alumno y el tutor no listan ni editan los parámetros, y el valor no cambia                                                                                   | PI-53 |
| K-18        | La profesora no ve los datos bancarios                                                                                                                                        | PI-53 |
| M-01        | Retirado el 13/11/2026. El resumen junta la transferencia pendiente que pasó las 24 horas, el efectivo sin rendir y la cuota vencida, con el monto estimado al precio de hoy | PI-65 |
| M-02        | Retirado el 13/11/2026. Con todo resuelto el resumen sale sin novedades; una cuota en los días de gracia no cuenta como vencida | PI-65 |
| M-03        | Retirado el 13/11/2026. Solo la propietaria ve el resumen: una profesora recibe 403 y sin sesión 401 | PI-65 |
| N-01        | El planificador avisa por vencer al entrar en la gracia y vencida al terminarla, una sola vez por cuota y tipo | PI-67 |
| N-02        | Sin aviso al día ni el día del vencimiento, con una transferencia pendiente ni después de renovar | PI-67 |
| N-03        | El aviso de un menor le llega a su tutora, con el texto completo de la cuota | PI-67 |
| N-04        | La base rechaza un segundo aviso del mismo tipo para la misma cuota y usuario | PI-67 |
| N-05        | La alumna ve su aviso al consultar y lo marca leído; otra persona no lo ve ni lo marca (404) | PI-68 |
| N-06        | Marcar todas deja leídas solo las de quien pide; sin sesión, 401 | PI-68 |
| N-07        | La alumna suscribe su celular y le llega el aviso de cuota con el texto completo, una sola vez | PI-92 |
| N-08        | El celular que el servicio de push da por vencido se borra; el aviso queda en la campana | PI-92 |
| N-09        | Un celular que suscribe otra cuenta pasa a esa cuenta, y nadie da de baja el de otro | PI-92 |
| N-10        | Un endpoint que no es de un servicio de push responde 400 y sin sesión 401, sin guardar nada | PI-92 |
| O-01        | Con 3 ausencias seguidas en clases cerradas aparece con su racha, su última asistencia y su contacto; la clase abierta no cuenta | PI-69 |
| O-02        | No aparece con ausencias cortadas por una asistencia ni con menos clases que el umbral | PI-69 |
| O-03        | Con la cuota vencida no aparece; en los días de gracia aparece por vencer | PI-69 |
| O-04        | El umbral sale de `INASISTENCIAS_CONSECUTIVAS_INACTIVO`, el filtro de mínimo solo lo sube, y el filtro por plan | PI-69 |
| O-05        | La marca se muestra, los ignorados se ocultan salvo con el filtro, y la marca vence si vuelve a asistir | PI-70 |
| O-06        | Quitar la marca la borra; una segunda vez responde 404 | PI-70 |
| O-07        | No se marca una pre-inscripción (404); una profesora recibe 403 y sin sesión 401, sin cambios en la base | PI-70 |
| P-01        | La racha cuenta clases dictadas: la cancelada y la suplencia no la cortan, la falta sí y la abierta no cuenta; la ficha trae el catálogo con lo obtenido y el progreso | PI-71 |
| P-02        | Las insignias alcanzadas se guardan una sola vez, con la fecha de la clase que completó el umbral | PI-71 |
| P-03        | El tutor ve la ficha de su menor y la propietaria la de cualquiera; otro alumno, el tutor de otro, la profesora o un id inexistente reciben 403, y la propietaria 404 | PI-71 |
| P-04        | El catálogo inicial tiene seis insignias, recargarlo repone su definición y el `CHECK` rechaza un umbral en 0 | PI-71 |
| P-05        | Una insignia mensual se repite en otro mes pero no dos veces en el mismo (clave primaria con el período) | PI-71 |
| P-06        | El ranking ordena a los activos con el mínimo de clases, marca la fila propia y no muestra datos de contacto | PI-72 |
| P-07        | El período por defecto es el mes en curso, el mínimo sale de `RANKING_MINIMO_CLASES` y el empate se desempata por clases asistidas | PI-72 |
| P-08        | Filtro por actividad, paginación, la profesora lo ve y sin `REPORTES_RANKING_VER` responde 403 | PI-72 |
| P-09        | La primera consulta de octubre cierra septiembre: Mes perfecto y Podio del mes con su período | PI-73 |
| P-10        | Volver a cerrar el mes tras un reinicio no duplica ni agranda el podio | PI-73 |
| Q-01        | El informe cuenta solo clases dictadas, con los ausentes del cierre automático y la suplente como dictante | PI-74 |
| Q-02        | Filtros combinados, paginación, `incluir_bajas` y un período sin datos en cero | PI-75 |
| Q-03        | La profesora y el alumno reciben 403 | PI-75 |
| Q-04        | Inscriptos activos contra el cupo del horario o de la actividad, sin pre-inscriptos, bajas ni horarios dados de baja, con su nivel | PI-76 |
| Q-05        | Filtros por modalidad, actividad y profesora | PI-77 |
| Q-06        | La profesora recibe 403 | PI-77 |
| T-01        | La propietaria da de baja y reincorpora el perfil existente, actualizando especialidad sin duplicar usuario ni profesora | PI-88 |
| T-02        | Reincorporar una profesora activa responde 409 y no cambia la base | PI-88 |
| T-03, T-04  | La profesora con `HORARIOS_EDITAR` delegado y la propietaria sin ese permiso reciben 403; la base no cambia | PI-88 |
| T-05        | La propietaria ve email, teléfono y fecha de nacimiento; otros roles no reciben esos datos y el filtro de bajas se respeta | PI-89 |

#### PI-78 — El cálculo de los honorarios del mes

**US:** US-23, US-24 · **Precondición:** una propietaria y tres profesoras (Lucía, Carla y Rita), con el reloj fijo el lunes 12/10/2026 y septiembre como mes a liquidar. Tarifas desde el 01/01/2026: Lucía 50 % para todos los planes y 40 % para el Intermedio, y Carla 50 % y $2.500 por hora de suplencia. Cobros confirmados: Acosta (Inicial) $20.000 el 03/09, Benítez (Intermedio) $20.000 el 10/09, Farías (baja el 20/09) $10.000 el 05/09 y Gómez, de Carla, $30.000. La clase del lunes 07/09 de Lucía la dictó Carla, una hora.

1. La propietaria genera las liquidaciones de septiembre (`POST /liquidaciones`, período `2026-09`).
2. Abre la liquidación de Lucía y la de Carla (`GET /liquidaciones/:id`).
3. Pide el listado de septiembre y el de agosto (`GET /liquidaciones?periodo=`), un id que no existe y uno que no es un número.

**Resultado esperado:** el paso 1 responde 200 con un total general de $38.000, sin advertencias ni liquidaciones sin recalcular, y tres liquidaciones en BORRADOR: Lucía $20.500, Carla $17.500 y Rita $0, que no tuvo movimientos. En la base el período va del 01/09 al 30/09 y hay seis líneas de detalle. En el paso 2, la liquidación de Lucía tiene cuatro líneas: Acosta $10.000, Benítez $8.000 (la tarifa del plan gana a la general), Farías $5.000 y un DESCUENTO_AUSENCIA de −$2.500 por la clase del 07/09, a la tarifa de Carla. La de Carla tiene a Gómez ($15.000) y una CLASE_SUPLIDA de $2.500. En el paso 3 el listado de septiembre trae el total general y una fila por profesora con su nombre, el de agosto sale vacío, y el id inexistente responde 404 y el que no es número, 400.

**Automatizado:** Sí (R-01 a R-03).

#### PI-79 — Lo que no genera honorarios y lo que no se puede calcular

**US:** US-23 · **Precondición:** la de PI-78, más tres inscripciones de Lucía: Cruz (sin cargo, que pagó $20.000), Díaz (pre-inscripta) y Espinoza (baja sin ningún pago).

1. La propietaria genera septiembre y se miran las líneas guardadas.
2. Con la base reiniciada, Rita tiene una tarifa del 50 % y una alumna, Sosa, con pagos de $20.000 el 02/09, $5.001 el 30/09 y $30.000 el 01/10; se genera septiembre.
3. Con la base reiniciada, Rita no tiene tarifas, tiene una alumna sin tarifa y dicta una clase suplida el 14/09; se genera septiembre.

**Resultado esperado:** en el paso 1 hay solo cuatro líneas de alumno (Acosta, Benítez, Farías y Gómez): Cruz, Díaz y Espinoza no liquidan, y Farías, que pagó antes de irse, sí. Lucía queda en $20.500. En el paso 2 el honorario de Rita es de $12.500,50: cuentan los pagos confirmados dentro del mes, el último día incluido, y no el de octubre. En el paso 3 la respuesta es 200 con dos advertencias `SIN_TARIFA` de Rita, una por el alumno (con su inscripción) y otra por la hora de suplencia (con su clase); Rita queda en $0, Lucía en $20.500 y el total general en $38.000.

**Automatizado:** Sí (R-04 a R-06).

#### PI-80 — Recalcular, cerrar y pagar una liquidación

**US:** US-23 · **Precondición:** la de PI-78, con las liquidaciones de septiembre generadas.

1. Se sube la tarifa general de Lucía al 60 % y la propietaria vuelve a generar septiembre.
2. Con la base reiniciada, la propietaria cierra la liquidación de Lucía y después la paga.
3. Con la base reiniciada, la propietaria cierra la de Lucía, se suben las tarifas generales de Lucía (60 %) y de Carla (80 %) y se vuelve a generar septiembre.
4. Con la base reiniciada, la propietaria intenta pagar la de Carla en borrador, cierra la de Lucía dos veces, la paga dos veces, intenta cerrarla ya pagada y cierra un id que no existe.

**Resultado esperado:** en el paso 1 se recalcula sin duplicar nada: tres liquidaciones y seis líneas; Lucía queda en $23.500 y el total general en $41.000. En el paso 2, cerrar responde 200 con estado CERRADA y $20.500, pagar responde 200 con estado PAGADA y sus cuatro líneas, y el estado queda guardado en la base. En el paso 3 la liquidación cerrada es una foto: se informa en `sin_recalcular`, sigue en $20.500 con sus cuatro líneas, y la de Carla, que sigue en borrador, se recalcula a $26.500. En el paso 4 responde 409 al pagar un borrador, al cerrar una cerrada, al pagar una pagada y al cerrar una pagada; 404 con el id inexistente; Lucía termina PAGADA y Carla sigue en BORRADOR.

**Automatizado:** Sí (R-07 a R-10).

#### PI-81 — Los períodos y los permisos de las liquidaciones

**US:** US-23, US-02 · **Precondición:** la de PI-78; sesiones de la propietaria y de Lucía, y un usuario con rol Alumno.

1. La propietaria intenta generar con los períodos `septiembre`, `2026-13`, `2026-9` y `2026-11` (el mes que viene), y sin período; después genera el mes en curso (`2026-10`).
2. Lucía y el usuario Alumno intentan listar, abrir, generar y cerrar liquidaciones; también se hace un pedido sin sesión.

**Resultado esperado:** en el paso 1 los cinco intentos responden 400 y no se guarda ninguna liquidación; el mes en curso responde 200 y deja tres liquidaciones con el período hasta el 31/10. En el paso 2 los cuatro pedidos de cada uno responden 403 y el pedido sin sesión, 401; la base no cambia: no hay liquidaciones nuevas y la existente sigue en BORRADOR.

**Automatizado:** Sí (R-11 y R-12).

#### PI-82 — Las tarifas de honorarios

**US:** US-23, US-02 · **Precondición:** la de PI-78; sesiones de la propietaria y de Lucía. Lucía tiene una tarifa de alumno a cargo del 50 %, vigente desde el 01/01/2026.

1. La propietaria registra para Lucía una tarifa de alumno a cargo del 60 % desde el 01/11/2026, lista las tarifas vigentes de Lucía y vuelve a generar septiembre.
2. La propietaria intenta registrar tarifas con una vigencia pasada, con valor 0, con tres decimales, con un porcentaje de 150 %, con un monto fijo para alumno a cargo, con un porcentaje para hora de suplencia, con una hora de suplencia atada a un plan, con una profesora que no existe y con un plan que no existe; después registra una hora de suplencia de $3.000.
3. La propietaria intenta cerrar la tarifa en el pasado, la cierra el 31/12/2026 e intenta cerrar una que no existe.
4. Lucía intenta listar, registrar y cerrar tarifas; también se hace un pedido sin sesión.

**Resultado esperado:** el paso 1 responde 201; la tarifa anterior queda cerrada el 31/10/2026 y la nueva abierta, el listado trae las dos (50 % y 60 %) y septiembre no cambia (Lucía sigue en $20.500). En el paso 2 los nueve rechazos responden 400 y no se guarda ninguna tarifa; la hora de suplencia en monto fijo responde 201. En el paso 3 el cierre en el pasado responde 400, el cierre válido responde 200 con la vigencia hasta el 31/12/2026 y el id inexistente responde 404. En el paso 4 los tres pedidos de Lucía responden 403 y el pedido sin sesión, 401; la tarifa sigue abierta.

**Automatizado:** Sí (R-13 a R-16).

#### PI-86 — El cierre mensual automático de los honorarios

**US:** US-23 · **Precondición:** la de PI-78; sesión de la propietaria. El reloj está en el 12/10/2026.

1. Con `DIA_CIERRE_HONORARIOS` en 5, la propietaria genera septiembre, cierra y paga la liquidación de Lucía; después corre el proceso de cierre mensual dos veces.
2. Con `DIA_CIERRE_HONORARIOS` en 15 corre el proceso de cierre mensual sin haber generado septiembre.
3. Con `DIA_CIERRE_HONORARIOS` en 12, la propietaria lista septiembre.

**Resultado esperado:** en el paso 1 la primera corrida cierra septiembre con 2 liquidaciones cerradas (Carla, con $17.500, y Rita), la de Lucía sigue PAGADA y la segunda corrida no hace nada. En el paso 2 no se calcula ninguna liquidación, porque todavía no llegó el día de cierre. En el paso 3 el listado responde 200 con las 3 liquidaciones CERRADA y un total general de $38.000: listar cierra el mes si el proceso no llegó a hacerlo.

**Automatizado:** Sí (R-17 y R-18).

#### PI-87 — El movimiento de alumnos del año en el reporte de Inscripciones

**US:** US-35 · **Precondición:** sesión de la propietaria; dos profesoras, un plan y un horario de la primera. Ana (alta el 10/06/2024) sigue activa; Beto (alta el 01/03/2024) se da de baja el 15/04/2025 por mudanza; Caro entra el 10/02/2025; Dani entra el 05/03/2025 y se va el 20/04/2025 por abandono; Eva está pre-inscripta desde el 01/03/2025. Todas las inscripciones son con la primera profesora.

1. La propietaria pide el reporte de 2025.
2. Pide 2025 filtrando por la otra profesora y después pide 2024.

**Resultado esperado:** en el paso 1 hay 2 altas y 2 bajas, 2 activos al empezar el año y los activos al cierre de enero a mayo son 2, 3, 4, 2 y 2 (diciembre también 2). Los motivos son una mudanza y un abandono, y la permanencia es de 2 bajas con 7,5 meses en promedio y 1 en los primeros tres meses. Eva no cuenta en nada. En el paso 2, con la otra profesora todo da 0 y la permanencia no tiene promedio; en 2024 hay 2 altas (Ana y Beto), ninguna baja y 2 activos al cierre de diciembre.

**Automatizado:** Sí (S-01 a S-03).

#### PI-88 — Edición y reincorporación de profesoras

**US:** US-38, US-02 · **Precondición:** sesión de la propietaria con `HORARIOS_EDITAR`; una profesora activa y otra dada de baja lógica, cada una con su usuario y su perfil docente.

1. La propietaria da de baja a la profesora activa.
2. Envía `PATCH /profesoras/:id` con `{ "especialidad": "Posing", "reactivar": true }`.
3. Repite el PATCH sobre una profesora activa con `{ "reactivar": true }`.
4. Una profesora con `HORARIOS_EDITAR` delegado intenta el PATCH; después la propietaria sin ese permiso.

**Resultado esperado:** en el paso 2 responde 200 con la misma `id_profesora` e `id_usuario`, `especialidad` "Posing" y `fecha_baja` null; no se duplica el usuario ni el perfil. En el paso 3 responde 409 y la base no cambia. En el paso 4 ambos reciben 403 y la base no cambia.

**Automatizado:** Sí (T-01 a T-04).

#### PI-89 — Contacto y privacidad en el listado de profesoras

**US:** US-38, US-02 · **Precondición:** una profesora activa y otra dada de baja, ambas con email, teléfono y fecha de nacimiento cargados en su usuario.

1. La propietaria pide `GET /profesoras`.
2. Pide `GET /profesoras?incluirBajas=true`.
3. Una profesora pide `GET /profesoras?incluirBajas=true`.

**Resultado esperado:** en el paso 1 recibe solo la activa y, dentro de `usuario`, el email, el teléfono y la fecha de nacimiento. En el paso 2 recibe las dos, con los mismos datos. En el paso 3 recibe las dos pero sin email, teléfono ni fecha de nacimiento.

**Automatizado:** Sí (T-05).

#### PI-90 — La foto de perfil de Google

**US:** US-01 · **Precondición:** un usuario activo dado de alta; Google simulado devuelve `picture` junto con el email.

1. El usuario inicia sesión con una foto de perfil.
2. Pide `GET /auth/me` con el token recibido.
3. Vuelve a iniciar sesión con otra foto.
4. Inicia sesión otra vez sin que Google mande foto.

**Resultado esperado:** en el paso 1 la respuesta y `usuarios.foto_url` traen la foto. En el paso 2 `/auth/me` la devuelve. En el paso 3 la base queda con la foto nueva. En el paso 4 se conserva la última guardada, también en `/auth/me`. Un usuario inactivo no se actualiza, y la base rechaza una URL que no sea `https`, tenga espacios o supere los 500 caracteres.

**Automatizado:** Sí (A-49, A-50).

#### PI-91 — Los descuentos de las promociones no reducen los honorarios

**US:** US-23, US-13 · **Precondición:** la de PI-78. Sosa, alumna de Rita con el plan Inicial ($25.000 de lista), tiene la promoción VERANO20 (20 %): su cuota es de $20.000. Rita tiene una tarifa del 50 % general.

1. Sosa paga la cuota completa el 02/09 y la propietaria genera septiembre.
2. Con la base reiniciada, Sosa paga la cuota en dos partes de $10.000, el 02/09 y el 02/10, y la propietaria genera septiembre y octubre.
3. Con la base reiniciada, el plan cuesta $25.000 hasta el 14/09 y $30.000 desde el 15/09; la cuota de Sosa se generó el 15/09 a las 02:00 UTC (todavía 14/09 en Argentina) y la paga el 20/09.

**Resultado esperado:** en el paso 1 Rita cobra $12.500, el 50 % de los $25.000 de lista y no de los $20.000 pagados; Lucía sigue en $20.500, porque sin promoción se liquida lo cobrado aunque sea menos que la lista. En el paso 2 cada mes liquida $6.250: cada pago se lleva a lista en la proporción del descuento, sin contar la lista dos veces. En el paso 3 Rita cobra $12.500: rige el precio de lista del día de la cuota en Argentina, como en el comprobante.

**Automatizado:** Sí (R-19 a R-21).
#### PI-95 — El listado de alumnos con todas las inscripciones vigentes

**US:** US-10 · **Precondición:** escenario de demostración; Valentina Herrera suma al Intermedio (con su primera cuota paga) una inscripción activa en el Básico con Carla, los sábados de 10 a 11, sin cuotas.

1. La propietaria pide `GET /alumnos`.
2. Da de baja a Sofía Medina y pide `GET /alumnos?incluirBajas=true`.

**Resultado esperado:** en el paso 1 responde 200 y la fila de Valentina conserva en `inscripcion` y `situacion_cuota` la inscripción más reciente (el Intermedio, al día), y en `inscripciones` trae las dos, de la más reciente a la más vieja, cada una con su situación: el Intermedio al día y el Básico, de Carla Ruiz, pendiente de pago. En el paso 2 la baja responde 200, Valentina sin el Básico trae una sola inscripción y Sofía, dada de baja, ninguna.

**Automatizado:** Sí (H-23, H-24).

#### PI-96 — Las transferencias de dos planes del mismo alumno

**US:** US-16, US-17 · **Precondición:** la de PI-95: Valentina con el Intermedio y el Básico, los dos a cargo de Carla.

1. Carla informa una transferencia de $30.000 por el Intermedio y otra de $25.000 por el Básico.
2. La propietaria pide `GET /pagos/transferencias?estado=PENDIENTE`.
3. La propietaria aprueba la del Básico.

**Resultado esperado:** en el paso 1 las dos responden 201: la transferencia pendiente de un plan no frena la del otro. En el paso 2 el total es 2 y cada una trae su `id_inscripcion` y su plan. En el paso 3 responde 200 y en la base la del Básico queda CONFIRMADA y la del Intermedio sigue PENDIENTE.

**Automatizado:** Sí (H-25).

#### PI-97 — El cambio de horarios: inscripción activa, misma profesora y actividad

**US:** US-09, US-14 · **Precondición:** escenario de demostración cargado; sesión de Marina; un alumno pre-inscripto en el Básico con Lucía, en el lunes de Funcional; un horario de Funcional de Carla (sábado de 13 a 14) y uno de Entrenamiento Personalizado de Lucía (sábado de 9 a 10).

1. Marina pasa la pre-inscripción al miércoles de Lucía (`PATCH /inscripciones/:id/horarios`).
2. Con la inscripción activa, intenta pasarla al horario de Carla y al de Entrenamiento Personalizado.
3. La pasa al miércoles de Lucía.

**Resultado esperado:** el paso 1 responde 409: los horarios se cambian con la inscripción activa. En el paso 2 los dos responden 400 (cambiar de profesora o de actividad es un cambio de plan) y la inscripción sigue solo con el lunes. El paso 3 responde 200 y la inscripción queda solo con el miércoles.

**Automatizado:** Sí (G-40).

#### PI-98 — Con el plan vigente, el cambio de plan se aplica al terminar la gracia

**US:** US-14 · **Precondición:** escenario de demostración cargado; reloj fijo el 05/10/2026 a las 12 de Argentina; un alumno activo en el Básico (5 días de gracia) con Lucía, los lunes, con la primera cuota pagada en efectivo ese día.

1. Marina le cambia el plan al Intermedio, lunes y miércoles (`POST /inscripciones/:id/cambio-plan`), y pide la ficha.
2. Cancela el cambio (`DELETE /inscripciones/:id/cambio-plan`), lo vuelve a cancelar y lo vuelve a pedir.
3. Corre el proceso `AplicadorProgramados` el día anterior al de la aplicación y el día de la aplicación.
4. Con otro alumno en la misma situación, el reloj pasa al sexto día después del vencimiento (la gracia ya terminó) y Marina le cambia el plan.

**Resultado esperado:** el paso 1 responde 202 con el cambio (plan, profesora, horarios y `fecha_aplicacion` el sexto día después del vencimiento de la cuota, el siguiente al último de gracia); la inscripción sigue ACTIVA en el Básico, el alumno no tiene otra, y la ficha trae el cambio en `cambio_programado`. En el paso 2 responde 204, 404 y 202. En el paso 3 el día anterior no aplica nada; el día de la aplicación la inscripción queda BAJA con `CAMBIO_PLAN`, hay otra ACTIVA en el Intermedio con los dos horarios y no queda ningún cambio programado. El paso 4 responde 200: sin plan vigente que esperar, el cambio va en el momento.

**Automatizado:** Sí (G-41 y G-42).

#### PI-99 — La baja programada de un horario con alumnos

**US:** US-04, US-08 · **Precondición:** escenario de demostración cargado; reloj fijo el 05/10/2026 a las 12 de Argentina; un horario de Funcional de Lucía los sábados de 11 a 12 con cupo 3.

1. Con un alumno activo en el horario (cuota paga ese día), Marina da de baja el horario, pre-inscribe a otro alumno en él, le cambia el día y después el cupo, cancela la baja programada (`DELETE /horarios/:id/baja-programada`) y la vuelve a cancelar.
2. Con la base reiniciada, en el horario hay una pre-inscripta, un alumno activo solo en ese horario y otro activo en ese horario y en el lunes de Lucía, los dos con la cuota paga el 05/10. Marina da de baja el horario.
3. Corre el proceso `AplicadorProgramados` el día siguiente, el tercer día después del vencimiento (en la gracia) y el séptimo.

**Resultado esperado:** en el paso 1 la baja responde 200 con la advertencia "Tiene 1 alumno inscripto: no admite alumnos nuevos…" y el horario sigue activo con `fecha_baja_programada`; la pre-inscripción responde 409 sin guardar nada; el cambio de día, 409, y el de cupo, 200; la cancelación responde 200 con `fecha_baja_programada: null` y la segunda, 409. En el paso 3, el día siguiente sale solo la pre-inscripta: su inscripción queda BAJA con el motivo OTRO y el detalle "Se dio de baja su horario y no le quedó ninguno", y la alumna, BAJA. En la gracia no sale nadie. El séptimo día salen los dos activos: el que estaba solo en ese horario queda con la inscripción y el alumno en BAJA; el otro sigue ACTIVO con el lunes, y el horario queda dado de baja.

**Automatizado:** Sí (G-43 y G-44).

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
| El cierre automático genera ausentes aunque nadie haya marcado                          | J-10                                                                                                       |
| El cierre automático no espera los `MINUTOS_CIERRE_ASISTENCIA`                          | J-11                                                                                                       |
| El cierre con el botón no registra los ausentes                                         | J-08                                                                                                       |
| El cierre pisa a los ya marcados (sin `skipDuplicates`)                                 | J-08, J-10 a J-12                                                                                          |
| La profesora marca en una clase `DICTADA`                                               | J-09                                                                                                       |
| La profesora accede a clases de otro día                                                | J-06                                                                                                       |
| Marcar no verifica que el alumno esté en el horario                                     | J-05                                                                                                       |
| La profesora materializa las clases de horarios ajenos                                  | J-01. Al principio ningún test falló: el listado filtra igual por profesora. Se sumó al escenario un horario de Carla del mismo día |
| La lista incluye inscripciones y alumnos dados de baja                                  | J-01, J-02, J-05, J-07, J-08, J-10, J-12. Al principio ningún test falló: el dado de baja tenía el horario cerrado antes de hoy y lo sacaba la fecha. Se lo pasó a dado de baja hoy, cuando solo lo saca el estado |
| La lista vuelve a incluir a los pre-inscriptos                                          | J-01, J-02, J-05, J-08 a J-10, J-12 y J-14                                                                 |
| Un día anterior solo toma los horarios que siguen vigentes hoy                          | J-14                                                                                                       |
| La cancelación no revisa si la clase ya tiene marcas                                    | J-17 y un unitario de la fachada                                                                           |
| Una marca sin observaciones las borra                                                   | J-13 y un unitario del repositorio                                                                         |
| Otro día sin `acceso.rol("PROPIETARIA")`                                                | J-15 y un unitario de las rutas                                                                            |
| El filtro por estado de cuota deja los que no coinciden                                 | H-17, H-18 y cuatro unitarios de la fachada                                                                |
| El filtro pagina sin el `offset`                                                        | H-17                                                                                                       |
| El historial llega también a la profesora                                               | H-19 y un unitario de la fachada                                                                           |
| El tope corta en 500 alumnos en lugar de pasarlo                                        | Unitario de la fachada (con exactamente 500 candidatos)                                                    |
| Los candidatos se piden sin el uno de más que delata el tope                            | Dos unitarios de la fachada                                                                                |
| La ficha busca al alumno antes de comprobar si la profesora lo tiene a cargo            | E-15 y un unitario de la fachada                                                                           |
| La transferencia cargada el mismo día del vencimiento anterior cuenta como cuota vencida | Un unitario del service (el borde de las 23:00 de Argentina)                                               |
| La pre-inscripción en un solo pedido crea el alumno fuera de la unidad de trabajo        | G-34                                                                                                       |
| La pre-inscripción en un solo pedido no verifica a nombre de quién pre-inscribe la profesora | G-37 y dos unitarios del service                                                                        |
| La pre-inscripción en un solo pedido no exige las medidas que pide la actividad         | G-35 y un unitario del service                                                                             |
| Una profesora elige un tutor existente al pre-inscribir en un solo pedido               | G-37 y un unitario de Alumno                                                                               |
| Informar una transferencia sin comprobar que la profesora está a cargo                 | H-22 y un unitario de la fachada                                                                           |
| `POST /pagos/transferencia` sin `acceso.permiso("PAGOS_REGISTRAR")`                     | Cuatro unitarios de las rutas. Ningún test de integración, porque el service igual rechaza a quien no es profesora a cargo ni propietaria |
| Los horarios de distintas actividades pasan si son de la misma profesora                | G-38 y dos unitarios del service                                                                           |
| Toda inscripción traída cuenta como vencida, también en los días de gracia             | M-02 (después de sumarle una cuota en la gracia; la primera versión no lo detectaba) y dos unitarios de Cuota |
| Las transferencias por superar las 24 horas incluyen las que ya las pasaron             | M-01 y un unitario de Pago                                                                                 |
| `GET /resumen-diario` sin `acceso.rol("PROPIETARIA")`                                   | M-03 y un unitario de las rutas                                                                            |
| El alta acepta un alumno sin DNI                                                         | E-24 y un unitario de los schemas                                                                          |
| El alta acepta un alumno sin contacto de emergencia                                      | E-24 y dos unitarios de los schemas                                                                        |
| El tutor nuevo se acepta sin DNI                                                          | E-24 y un unitario de los schemas                                                                          |
| La primera cuota no se reconoce como tal                                                | H-20 y dos unitarios del service                                                                           |
| El filtro por tipo deja las que no coinciden                                            | H-20, H-21 y un unitario del service                                                                       |
| Las inscripciones a cargo comparan la baja con el día UTC y no con el argentino         | G-39 y un unitario del repositorio                                                                         |
| Los avisos se guardan sin ignorar los repetidos                                         | N-01 (la segunda corrida termina en P2002) y un unitario del repositorio                                   |
| El aviso de un menor le llega al alumno y no a su tutor                                 | N-03 y un unitario del planificador                                                                        |
| Marcar leída no filtra por el destinatario                                              | N-05 y un unitario del repositorio                                                                         |
| Marcar todas leídas no filtra por el destinatario                                       | N-06 y un unitario del repositorio                                                                         |
| `GET /notificaciones/mias` no genera los avisos del día                                 | N-05 y un unitario de la fachada                                                                           |
| La racha cuenta también las clases abiertas                                             | O-01                                                                                                       |
| Una asistencia no corta la racha                                                        | O-02                                                                                                       |
| Los vencidos aparecen como inactivos                                                    | O-03 y un unitario del detector                                                                            |
| La marca de gestión no vence al volver a asistir                                        | O-05 y un unitario de Asistencia                                                                           |
| Los ignorados aparecen sin el filtro                                                    | O-05 y un unitario del detector                                                                            |
| Se marca una inscripción que no es activa de plan mensual                               | O-07 y un unitario del detector                                                                            |
| `/informes/alumnos-inactivos` sin `acceso.rol("PROPIETARIA")`                           | Solo los unitarios de las rutas: `REPORTES_COBRANZA_VER` es exclusivo de la propietaria y ningún otro rol lo tiene en la base |
| El ranking no exige `RANKING_MINIMO_CLASES`                                             | P-06, P-08, P-09, P-10                                                                                     |
| La ficha no comprueba que el alumno sea propio o del menor a cargo                      | P-03                                                                                                       |
| El podio se vuelve a dar en un mes que ya lo tiene                                      | P-10                                                                                                       |
| El historial de la racha incluye las clases abiertas                                    | P-01, P-06                                                                                                 |
| Los resúmenes de asistencia cuentan clases que no están dictadas                        | Q-01, Q-02 (la primera versión no lo detectaba: todas las clases con marcas terminaban cerradas; se sumó una abierta con marcas) |
| Los resúmenes de asistencia incluyen a los dados de baja sin pedirlo                    | Q-01, Q-02                                                                                                 |
| La ocupación cuenta los lugares ocupados (con reservas y bajas) en lugar de los inscriptos activos | Q-04                                                                                            |
| Una falta no corta la racha al buscar cuándo se alcanzó un umbral                       | Solo los unitarios del calculador: en P-01 la racha de 3 se completa antes de la falta                     |
| El PATCH de profesoras no exige `HORARIOS_EDITAR`                                       | T-04                                                                                                       |
| Reincorporar una profesora activa no responde 409                                       | T-02 y un unitario del service                                                                             |
| El listado de profesoras incluye el contacto para cualquier rol                         | T-05 y un unitario de las rutas                                                                            |
| El PATCH reincorpora sin limpiar `fecha_baja`                                           | T-01 y dos unitarios del service                                                                           |
| La foto de Google se acepta por `http` en lugar de `https`                              | Un unitario de `GoogleAutenticacion`                                                                        |
| El login escribe la foto sobre un usuario inactivo                                      | Un unitario de `SesionService` (el login igual lo rechaza con 403)                                          |
| El login reescribe la foto aunque sea la misma                                          | Un unitario de `SesionService`                                                                              |
| El login pisa la foto guardada cuando Google no manda una                               | Un unitario de `SesionService`                                                                              |
| La base sin el check `ck_usuarios_foto_url`                                             | Ninguno: se comprobó con un `INSERT` de `http://` en la base de prueba, que Postgres rechazó                |
| La liquidación usa lo cobrado aunque la inscripción tenga promoción                    | R-19 a R-21 |
| El precio de lista se busca con la fecha UTC de la cuota y no con la de Argentina     | R-21 |
| El push sale de todos los avisos y no solo de los recién insertados                   | N-07 |
| El endpoint de la suscripción acepta cualquier host                                   | Unitarios de `suscripcion-push.schemas` (N-10 sigue en verde: el puerto 5432 también se rechaza) |
| `resumirInscripcionesVigentes` vuelve a quedarse con una sola inscripción por alumno      | H-23 y un unitario del repositorio                                                                         |
| El listado de transferencias deja de mandar `id_inscripcion`                              | H-25 y un unitario del repositorio                                                                         |
| Los horarios se cambian en una pre-inscripción                                        | G-40 |
| Los horarios pasan a otra profesora, o a otra actividad (dos fallas provocadas)       | G-40 en las dos |
| Un horario con la baja programada admite alumnos nuevos                               | G-43 |
| El cambio de plan siempre es inmediato                                                | G-41 |
| El cambio de plan se programa aunque la gracia haya terminado                         | G-42 |
| La baja de un horario con alumnos vuelve a ser inmediata                              | G-12, G-26, G-43 y G-44 |
| Un horario con alumnos cambia de día                                                  | G-43 |
| El proceso saca de un horario a quien está en sus días de gracia                      | G-44 (la primera versión no lo detectaba; se sumó una corrida en la gracia) |
| El proceso no saca a las pre-inscriptas                                               | G-44 (no sacar a ninguna inscripción ACTIVA era una mutación equivalente: una pre-inscripta nunca tiene la cuota corriendo) |
| El horario no se da de baja cuando sale el último alumno                              | G-44 |

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
| 12/10/2026 | Clases, asistencia y cierre (PI-47 a PI-50)                           | 176 | 176 aprobados | 34,2 s | Pasaron también los 1400 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. Las 9 fallas provocadas fueron detectadas (dos, después de reforzar los datos). La primera corrida falló en 10 tests de inscripciones y cuotas porque el cliente de Prisma estaba generado con un esquema viejo; se regeneró (`pnpm prisma:generate`) |
| 12/10/2026 | Corrección de los tests de asistencia que fallaron en CI (D-21)       | 176 | 176 aprobados | 37,7 s | En GitHub Actions fallaron 7 tests de J, reproducidos localmente con `TZ=UTC` después de las 21:00 de Argentina. Corregidos, pasan con `TZ=UTC` y con la hora local. Pasaron también los 1400 tests unitarios; la falla provocada de los horarios ajenos se sigue detectando |
| 12/10/2026 | Filtro por estado de cuota e historial en la ficha (PI-51, PI-52)     | 179 | 179 aprobados | 143,8 s | Pasaron también los 1418 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. Las 5 fallas provocadas fueron detectadas |
| 12/10/2026 | Correcciones de la auditoría de la ficha (PI-25, D-22)                 | 179 | 179 aprobados | 141,4 s | Pasaron también los 1422 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. La falla provocada fue detectada |
| 12/10/2026 | Actualización de Vitest de 3.2.7 a 5.0.4                              | 179 | 179 aprobados | 142,3 s | Sin cambios en los tests ni en la configuración. Pasaron también los 1422 tests unitarios, con cobertura del 100 % (el umbral sigue frenando el comando si baja); build y formato correctos |
| 12/10/2026 | Parámetros del sistema por la API (PI-53, PI-54)                      | 182 | 182 aprobados | 166,2 s | Corrida completa con el archivo de parámetros. Pasaron también los 1386 tests unitarios; build correcto. Sin fallas provocadas. |
| 12/10/2026 | Parámetros del sistema integrados con dev (PI-53, PI-54)               | 197 | 197 aprobados | 151,0 s | Primera corrida de los parámetros junto con clases y asistencia, el filtro por estado de cuota y Vitest 5. Pasaron también los 1501 tests unitarios, con cobertura del 100 %; build, chequeo de tipos y formato correctos. De 3 fallas provocadas, 2 las detectan K-18 y K-04 a K-08; la tercera (las rutas de edición sin `acceso.rol("PROPIETARIA")`) solo la detectan los unitarios de las rutas, porque `PARAMETROS_EDITAR` es exclusivo de la propietaria y ningún otro rol lo tiene en la base |
| 12/10/2026 | Puntos abiertos de asistencia: pre-inscriptos, días anteriores, observaciones y clase cancelada (PI-47, PI-48, PI-55, PI-56) | 202 | 202 aprobados | 149,6 s | J-01, J-02, J-05 y J-08 se adaptaron: el pre-inscripto ya no está en la clase. Pasaron también los 1534 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. Las 5 fallas provocadas fueron detectadas. La primera corrida falló en J-16: la clase cancelada se releía dentro de la transacción y salía sin cancelar; se relee al confirmar |
| 18/10/2026 | Listado de transferencias con plan, monto esperado y tipo (PI-43)     | 219 | 219 aprobados | 230,6 s | `GET /pagos/transferencias` responde `{ datos, total, limit, offset }` y suma los filtros `tipo`, `desde`, `hasta` y `orden`; H-12 se adaptó a la respuesta nueva. Pasaron también los 1791 tests unitarios; los archivos de pagos quedan con cobertura del 100 %. Chequeo de tipos y build correctos. Las 3 fallas provocadas fueron detectadas |
| 18/10/2026 | Alumno y pre-inscripción en un solo pedido (PI-64)                    | 224 | 224 aprobados | 216,6 s | Pasaron también los 1816 tests unitarios; los archivos del cambio quedan con cobertura del 100 %. Chequeo de tipos y build correctos. Las 4 fallas provocadas fueron detectadas |
| 18/10/2026 | La profesora a cargo informa las transferencias (PI-43)              | 225 | 225 aprobados | 216,3 s | Los tests de PI-43, PI-45 y PI-52 que informaban con Valentina pasan a informar con Carla. Pasaron también los 1815 tests unitarios; los archivos del cambio quedan con cobertura del 100 %. Chequeo de tipos, formato y build correctos. De las 2 fallas provocadas, una la detecta H-22 y la otra solo los unitarios de las rutas |
| 18/10/2026 | Una sola actividad por inscripción (PI-20)                            | 226 | 226 aprobados | 213,6 s | Pasaron también los 1818 tests unitarios; el archivo del cambio queda con cobertura del 100 %. Chequeo de tipos, formato y build correctos. La falla provocada fue detectada |
| 18/10/2026 | Resumen diario de la propietaria (PI-65)                              | 229 | 229 aprobados | 231,6 s | Pasaron también los 1842 tests unitarios, con cobertura del 100 %; chequeo de tipos, formato y build correctos. Las 3 fallas provocadas fueron detectadas, una después de sumarle a M-02 una cuota en los días de gracia |
| 18/10/2026 | Inscripciones a cargo en un período, para los honorarios (PI-66)      | 230 | 230 aprobados | 42,5 s | Pasaron también los 1843 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. La falla provocada fue detectada |
| 18/10/2026 | Avisos de vencimiento de cuota y notificaciones propias (PI-67, PI-68) | 236 | 236 aprobados | 44,2 s | Pasaron también los 1896 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. Las 5 fallas provocadas fueron detectadas. K e I pasan con el parámetro nuevo `DIAS_AVISO_VENCIMIENTO` |
| 18/10/2026 | Detección y gestión de alumnos inactivos (PI-69, PI-70)               | 243 | 243 aprobados | 46,3 s | Pasaron también los 1964 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. De las 7 fallas provocadas, 6 las detectan O-01 a O-07; la séptima (las rutas sin `acceso.rol("PROPIETARIA")`) solo los unitarios de las rutas |
| 18/10/2026 | DNI y contacto de emergencia obligatorios en el alta (PI-15)          | 245 | 245 aprobados | 295,7 s | Corrida sobre `dev` con notificaciones e inactividad ya integradas. La migración `contacto_emergencia_obligatorio` se aplicó sobre la base de prueba después de las de notificaciones. 17 tests de PI-15 a PI-17, PI-31 y PI-64 se adaptaron: mandaban altas sin DNI o sin contacto. Pasaron también los 1973 tests unitarios, con cobertura del 100 %; chequeo de tipos, formato y build correctos. Las 3 fallas provocadas fueron detectadas |
| 20/10/2026 | Ranking, insignias y los informes de asistencia y ocupación (PI-71 a PI-77) | 261 | 261 aprobados | 51,8 s | Pasaron también los 2179 tests unitarios, con cobertura del 100 %; chequeo de tipos y formato correctos. Las migraciones `agregar_insignias` y `agregar_checks_insignias` se aplicaron sobre la base nueva. De las 9 fallas provocadas, 7 las detectaron los de integración en la primera versión; los resúmenes que contaban clases abiertas, después de sumar una clase abierta con marcas, y la falta en el logro de racha, los unitarios del calculador |
| 09/11/2026 | Edición, reincorporación y contacto del plantel de profesoras (PI-88, PI-89) | 335 | 335 aprobados | 145,7 s | Pasaron también los 2651 tests unitarios; chequeo de tipos, formato y build correctos. Las 4 fallas provocadas fueron detectadas |
| 10/11/2026 | La foto de perfil de Google en el login y en `/auth/me` (PI-90)       | 337 | 337 aprobados | 181,2 s | Pasaron también los 2662 tests unitarios, con cobertura del 100 %; chequeo de tipos, formato y build correctos. Las migraciones `agregar_foto_usuario` y `agregar_checks_foto_usuario` se aplicaron sobre la base de prueba. Las 3 fallas provocadas fueron detectadas; el check de la base se comprobó con un `INSERT` inválido |
| 13/11/2026 | El listado de alumnos con todas sus inscripciones y las transferencias por inscripción (PI-95, PI-96) | 340 | 327 aprobados, 13 fallidos | 140,6 s | Pasan los 3 tests nuevos y los 2679 unitarios; los archivos del cambio quedan con cobertura del 100 %. Fallan 2 de J y 11 de R, que fallan igual con el código anterior al cambio (ver sección 9). Las 2 fallas provocadas fueron detectadas |
| 13/11/2026 | Integración de `dev` en la rama de PI-95 y PI-96, con la migración `quitar_codigo_promociones` | 338 | 338 aprobados | 127,1 s | Pasaron también los 2653 tests unitarios. El test de PI-91 deja de cargar el código de la promoción, que ya no existe. Las fallas de J y R de la corrida anterior quedaron corregidas en `dev` |
| 13/11/2026 | Cambio de plan programado y baja programada de un horario con alumnos (PI-97 a PI-99); el historial de la ficha (PI-94) | 351 | 351 aprobados | 136,3 s | Antes de los casos nuevos fallaron G-11, G-12 y G-26, que esperaban las reglas anteriores, y se adaptaron. La migración `programar_cambio_plan_y_baja_horario` se aplicó sobre la base de prueba. Pasaron también los 2794 tests unitarios; chequeo de tipos, formato y build correctos. Las 11 fallas provocadas fueron detectadas, dos después de reforzar G-44 |

### 8.2 Resultado por caso

| Caso          | Fecha      | Ejecutó           | Resultado          | Observaciones                                                                    |
| :------------ | :--------- | :---------------- | :----------------- | :------------------------------------------------------------------------------- |
| PI-01 a PI-09 | 07/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                                            |
| PI-10         | —          | —                 | Pendiente          | Verificación manual en el navegador                                              |
| PI-11 a PI-12 | 08/10/2026 | Francisco Andrade | Aprobado           | Todos sus tests pasan (ver sección 7)                                            |
| PI-13         | 08/10/2026 | Francisco Andrade | Aprobado           | Pasan D-08 a D-12; el precio aplicado al cobrar se prueba en PI-40               |
| PI-14 a PI-19 | 08/10/2026 | Francisco Andrade | Aprobado           | PI-19 se complementa con las operaciones HTTP cubiertas en PI-21 y PI-22         |
| PI-20 a PI-23 | 09/10/2026 | Nicolas           | Aprobado           | Pasan G-01 a G-11; la reactivación crea una nueva inscripción y valida el cupo   |
| PI-20         | 18/10/2026 | Francisco Andrade | Aprobado           | Pasa G-38: no se combinan actividades en una inscripción; sin defectos           |
| PI-21, PI-24 a PI-27 | 09/10/2026 | Francisco Andrade | Aprobado     | PI-21 pasa a activar por `IInfoInscripciones` (D-02); pasan G-12, G-13 y E-15 a E-20 |
| PI-28 a PI-32 | 10/10/2026 | Francisco Andrade | Aprobado           | Pasan A-42 a A-48, E-21 a E-23 y G-14 a G-17 (defectos D-07 a D-14)              |
| PI-33 a PI-36 | 10/10/2026 | Francisco Andrade | Aprobado (parcial) | Pasan H-01 a H-06 sobre los componentes; falta recorrerlos por HTTP cuando se monte el subsistema |
| PI-37         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-18 a G-21 (defecto D-16)                                                  |
| PI-38, PI-39  | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-22 a G-27 e I-01 a I-04 (defectos D-17 y D-18)                                   |
| PI-40         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan H-07 a H-09 sobre los componentes; sin defectos                            |
| PI-41         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan G-28 a G-31 (punto a confirmar de PI-41 cerrado)                           |
| PI-06         | 11/10/2026 | Francisco Andrade | Aprobado           | Pasan B-10 a B-13 y B-16 a B-18 (defecto D-19)                                   |
| PI-42         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-10 y H-11 por la API; sin defectos                                       |
| PI-43         | 18/10/2026 | Francisco Andrade | Aprobado           | Pasan H-12 a H-14 y H-20 a H-22 por la API; sin defectos                         |
| PI-22         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan G-06 a G-08; G-07 paga la primera cuota antes de la baja (defecto D-20)     |
| PI-44         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasa G-32 (defecto D-20)                                                         |
| PI-45         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-15 y H-16; sin defectos                                                  |
| PI-46         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan B-19 y B-20 con las actividades públicas; sin defectos                     |
| PI-05         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan B-05 a B-09, B-14, B-15 y B-21 con la grilla nueva; sin defectos            |
| PI-47         | 12/10/2026 | Nicolas           | Aprobado           | Pasan J-01 a J-03; sin defectos                                                  |
| PI-48         | 12/10/2026 | Nicolas           | Aprobado           | Pasan J-04 a J-07; sin defectos                                                  |
| PI-49         | 12/10/2026 | Nicolas           | Aprobado           | Pasan J-08 y J-09; sin defectos                                                  |
| PI-50         | 12/10/2026 | Nicolas           | Aprobado           | Pasan J-10 a J-12; sin defectos                                                  |
| PI-51         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan H-17 y H-18; sin defectos                                                  |
| PI-52         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasa H-19; sin defectos                                                          |
| PI-25         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan E-15 a E-17 con la ficha de un alumno inexistente (defecto D-22)           |
| PI-53, PI-54  | 12/10/2026 | Rosario Mendoza   | Aprobado           | Pasan K-01 a K-18 por la API; sin defectos                                       |
| PI-47, PI-48  | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan J-01 a J-07 y J-13 sin el pre-inscripto en la clase y con las observaciones |
| PI-55         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan J-14 y J-15; sin defectos                                                  |
| PI-56         | 12/10/2026 | Francisco Andrade | Aprobado           | Pasan J-16 y J-17; sin defectos                                                  |
| PI-64         | 18/10/2026 | Francisco Andrade | Aprobado           | Pasan G-33 a G-37; sin defectos                                                  |
| PI-65         | 18/10/2026 | Francisco Andrade | Aprobado           | Pasan M-01 a M-03; sin defectos                                                  |
| PI-66         | 18/10/2026 | Nicolas           | Aprobado           | Pasa G-39; sin defectos                                                          |
| PI-67         | 18/10/2026 | Nicolas           | Aprobado           | Pasan N-01 a N-04; sin defectos                                                  |
| PI-68         | 18/10/2026 | Nicolas           | Aprobado           | Pasan N-05 y N-06; sin defectos                                                  |
| PI-69         | 18/10/2026 | Nicolas           | Aprobado           | Pasan O-01 a O-04; sin defectos                                                  |
| PI-70         | 18/10/2026 | Nicolas           | Aprobado           | Pasan O-05 a O-07; sin defectos                                                  |
| PI-15         | 18/10/2026 | Francisco Andrade | Aprobado           | Pasan E-01 a E-04, E-24 y E-25; sin defectos                                     |
| PI-71         | 20/10/2026 | Nicolas           | Aprobado           | Pasan P-01 a P-05; sin defectos                                                  |
| PI-72         | 20/10/2026 | Nicolas           | Aprobado           | Pasan P-06 a P-08; sin defectos                                                  |
| PI-73         | 20/10/2026 | Nicolas           | Aprobado           | Pasan P-09 y P-10; sin defectos                                                  |
| PI-74         | 20/10/2026 | Nicolas           | Aprobado           | Pasa Q-01; sin defectos                                                          |
| PI-75         | 20/10/2026 | Nicolas           | Aprobado           | Pasan Q-02 y Q-03; sin defectos                                                  |
| PI-76         | 20/10/2026 | Nicolas           | Aprobado           | Pasa Q-04; sin defectos                                                          |
| PI-77         | 20/10/2026 | Nicolas           | Aprobado           | Pasan Q-05 y Q-06; sin defectos                                                  |
| PI-78         | 24/10/2026 | Rosario Mendoza   | Aprobado           | Pasan R-01 a R-03; sin defectos                                                  |
| PI-79         | 24/10/2026 | Rosario Mendoza   | Aprobado           | Pasan R-04 a R-06; sin defectos                                                  |
| PI-80         | 24/10/2026 | Rosario Mendoza   | Aprobado           | Pasan R-07 a R-10; sin defectos                                                  |
| PI-81         | 24/10/2026 | Rosario Mendoza   | Aprobado           | Pasan R-11 y R-12; sin defectos                                                  |
| PI-82         | 24/10/2026 | Rosario Mendoza   | Aprobado           | Pasan R-13 a R-16; sin defectos                                                  |
| PI-88         | 09/11/2026 | Francisco Andrade | Aprobado           | Pasan T-01 a T-04; sin defectos                                                  |
| PI-89         | 09/11/2026 | Francisco Andrade | Aprobado           | Pasa T-05; sin defectos                                                          |
| PI-90         | 10/11/2026 | Francisco Andrade | Aprobado           | Pasan A-49 y A-50; sin defectos                                                  |
| PI-50         | 13/11/2026 | Nicolas           | Aprobado           | Pasa J-10 con la regla de la clase sin marcas (todos presentes)                  |
| PI-55         | 13/11/2026 | Nicolas           | Aprobado           | Pasa J-14 con la regla de la clase sin marcas (todos presentes)                  |
| PI-91         | 13/11/2026 | Nicolas           | Aprobado           | Pasan R-19 a R-21; también R-01 a R-18, que fallaban desde el merge 6fcb658       |
| PI-67         | 13/11/2026 | Nicolas           | Aprobado           | Pasan N-01 a N-04 con el aviso por cambio de estado, sin DIAS_AVISO_VENCIMIENTO   |
| PI-68         | 13/11/2026 | Nicolas           | Aprobado           | Pasan N-05 y N-06 con el texto nuevo del aviso                                   |
| PI-92         | 13/11/2026 | Nicolas           | Aprobado           | Pasan N-07 a N-10 con el servicio de push simulado                               |
| PI-93         | 13/11/2026 | Nicolas           | Aprobado           | Pasan E-26 y E-27; aceptar un alumno ajeno hace fallar E-27                      |
| PI-95         | 13/11/2026 | Francisco Andrade | Aprobado           | Pasan H-23 y H-24; sin defectos                                                  |
| PI-96         | 13/11/2026 | Francisco Andrade | Aprobado           | Pasa H-25; sin defectos                                                          |
| PI-94         | 13/11/2026 | Francisco Andrade | Aprobado           | Pasan E-28 y E-29; sin defectos                                                  |
| PI-23, PI-24, PI-38 | 13/11/2026 | Francisco Andrade | Aprobado     | G-11, G-12 y G-26 adaptados a las reglas nuevas: horarios con la inscripción activa y baja programada |
| PI-97 a PI-99 | 13/11/2026 | Francisco Andrade | Aprobado           | Pasan G-40 a G-44; sin defectos                                                  |

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
| D-21 | PI-47 a PI-49 | Los tests J-01, J-02, J-04, J-05, J-07, J-08 y J-09 simulaban el lunes 12/10/2026, pero los horarios del escenario tomaban `fecha_alta` del reloj real de Postgres. Desde las 21:00 de Argentina (00:00 UTC del 13/10), y desde ese día en adelante siempre, el horario nacía después del lunes simulado y su clase no se materializaba. Era un defecto de los tests, no del código. Corregido: los horarios del escenario se crean con `fecha_alta` el 01/01/2026 (`crearHorarioDePrueba` acepta la fecha) | Alta | Nicolas | `clases-y-asistencia.integration.test.ts`, `fabricas.ts` |
| D-22 | PI-25 | La ficha buscaba al alumno antes de comprobar si la profesora lo tenía a cargo: un id que no existía respondía 404 y uno ajeno 403, así que una profesora podía averiguar qué alumnos existen (`seguridad.md`, regla 3). Lo encontró la auditoría de la rama del filtro por estado de cuota. Corregido: primero se comprueba quién pide, y a la profesora los dos casos le responden el mismo 403 | Media | Francisco Andrade | `GestionPersonasService` |

Los defectos se numeran D-01, D-02…

## 9. Puntos a confirmar

| Caso  | Punto                                                                                                                                                                                                                                                                                                                                                 | Estado  |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| PI-06 | Baja de una actividad con horarios activos. Resuelto: se bloquea solo si algún horario tiene alumnos inscriptos (US-03); si no, la baja de la actividad da de baja también sus horarios en el mismo paso. También se bloquea si tiene planes vigentes exclusivos (US-11, decidido el 11/10/2026) | Cerrado |
| PI-14 | La profesora carga pre-inscripciones (US-05) y necesita ver los planes. Resuelto: la matriz inicial le da `PLANES_VER` y `ALUMNOS_EDITAR`. En una base ya cargada la carga del catálogo no se los agrega, porque los permisos ya existían: mientras estemos en desarrollo se regenera la base (`docs/DESPLIEGUE.md`), y cuando Neon tenga datos reales irá una migración de datos (`seguridad.md`, regla 10)                                                      | Cerrado |
| PI-18 | La profesora todavía no consulta ni edita alumnos: US-10 le permite ver solo a los que tiene a cargo, y eso sale de las inscripciones. Resuelto en PI-25: ve y edita solo a los alumnos con una inscripción vigente a su cargo                                                                                                                         | Cerrado |
| PI-19 | La activación, la baja y la reactivación se probaron sobre el componente; PI-21 y PI-22 ahora las cubren también por HTTP                                                                                                                                                                                                                           | Cerrado |
| PI-30 | ¿Una profesora pre-inscribe a un alumno que ya está a cargo de otra, o a nombre de otra? Resuelto: no; solo a su nombre, sin cargo no, y alumnos sin una inscripción vigente con otra profesora. Lo demás lo hace la propietaria | Cerrado |
| PI-31 | ¿Cuánto ve una profesora de un tutor que ya existía? Resuelto: id, nombre y apellido; reusar una cuenta exige que el DNI y el email sean de esa cuenta, y elegirla por id es de la propietaria | Cerrado |
| PI-29 | ¿El DNI se autoedita? Resuelto: no; el DNI y la fecha de nacimiento los cambia quien tiene `USUARIOS_EDITAR` | Cerrado |
| PI-37 | ¿Dónde se guardan el peso y la talla de la pre-inscripción y cómo se sabe qué actividad los pide? Resuelto: en un `registros_progreso` inicial a nombre de la profesora a cargo, y con la columna nueva `actividades.requiere_medidas` (cambio del DER decidido el 11/10/2026) | Cerrado |
| PI-38 | ¿La reserva de cupo de una pre-inscripción vence (el diseño del front decía 72 hs y lista de espera)? Resuelto: vence sola, contada desde el inicio de clases y no desde el alta, con un plazo en días que configura la propietaria (`DIAS_RESERVA_PREINSCRIPCION`, 3 por defecto). Se calcula al consultar, sin proceso programado. Sin lista de espera: el lugar vuelve a figurar disponible | Cerrado |
| PI-46 | Las actividades públicas no tienen límite de pedidos por IP: hoy ningún endpoint lo tiene (tampoco el login). Detrás del proxy de Render hace falta `trust proxy` para que el límite no caiga sobre la IP del proxy. Mientras tanto, la respuesta se puede reusar un minuto (`Cache-Control`). Falta decidir si se agrega `express-rate-limit` para toda la API. Resuelto el 13/11/2026: toda `/api` tiene límite por IP con `express-rate-limit` (`limite-pedidos.ts`), `trust proxy` sale de `PROXIES_DE_CONFIANZA`, y la API solo acepta pedidos firmados por Netlify. El endpoint público se retiró | Cerrado |
| PI-41 | ¿Dónde se guarda el texto libre de una baja con el motivo "Otro" (US-08)? `observaciones` es de la inscripción y se pisaría. Resuelto: columna nueva `inscripciones.detalle_baja` (VARCHAR(200), opcional), solo con el motivo `OTRO` (`ck_inscripciones_x2`); cambio del DER decidido el 11/10/2026 | Cerrado |
| PI-48 | La propietaria corrige solo las clases que ya existen. Resuelto: `GET /clases?fecha=` (solo la propietaria, hasta hoy) crea las clases de ese día con los horarios que regían; ver PI-55 | Cerrado |
| PI-47 | ¿Los pre-inscriptos aparecen en la lista de asistencia? Resuelto (12/10/2026): no; todavía no pagaron y no habilitan a asistir (US-07), así que no se los marca ni se les registra una falta. Su reserva sigue ocupando cupo | Cerrado |
| PI-50 | ¿Cómo se cancela una clase? Resuelto: `POST /clases/:id/cancelar`, solo la propietaria y solo una clase PROGRAMADA sin marcas; no genera inasistencias. El aviso de clase cancelada se retiró el 13/11/2026 | Cerrado |
| PI-48 | ¿Cómo se cargan las `observaciones` de una asistencia? Resuelto: con la marca (`PUT /clases/:id/asistencia/:idAlumno`, campo opcional): sin el campo se conservan y `""` las borra; ver J-13 | Cerrado |
| PI-72 | ¿Quién ve el ranking de asistencia (US-30)? SPRINT-5.md lo daba a la propietaria y las profesoras; US-30 dice que es la misma vista para los tres roles y que el alumno ve su posición. Resuelto (20/10/2026): `REPORTES_RANKING_VER` en la matriz inicial de propietaria, profesora, alumno y tutor, con la fila propia marcada (`es_propia`) | Cerrado |
| PI-71 | ¿Cuándo se otorgan la racha y el total de clases? Una clase cuenta recién al cerrarse la asistencia, y que `Asistencia` llamara a `Insignia` armaba un ciclo con el diagrama. Resuelto (20/10/2026): se derivan del historial de clases dictadas y se guardan al consultar la ficha o el ranking, con la fecha de la clase en que se alcanzó el umbral | Cerrado |
| PI-73 | ¿El Mes perfecto exige el mínimo de clases del ranking? Resuelto (20/10/2026): sí, `RANKING_MINIMO_CLASES`; con menos clases no hay Mes perfecto ni Podio | Cerrado |
| PI-73 | El cierre de un mes corre una vez por proceso desde el día 1. Una clase del último día que se cierre después de esa corrida no se vuelve a evaluar hasta un reinicio; si cambia el ranking, el podio no se recalcula (se otorga una sola vez por mes) | Abierto |
| PI-74 | El cierre automático sin ninguna marca manual no registra ausentes (US-21): esa clase no figura como dictada en el informe de asistencia ni cuenta para la racha | Abierto |
| PI-78 | La regla del 50 % de lo cobrado (US-23) se implementó con una propuesta que falta confirmar con el equipo: la base son los pagos confirmados dentro del mes; las inscripciones que cuentan son las activas y las dadas de baja que cobraron; la atribución es a la profesora de la inscripción; las suplencias se aplican sobre el honorario por cuotas. Las devoluciones no están definidas: hoy no restan | Abierto |
| PI-79 | Los datos de demostración (`cargarDatosDemo`) cargan tarifas de monto fijo para alumnos, que la regla nueva ya no usa: la demostración mostraría advertencias de tarifa no aplicable. Hay que pasarlas a porcentaje | Abierto |
| PI-99 | Un alumno de un horario con la baja programada que paga la cuota siguiente vuelve a tener la cuota corriendo y no sale: el horario no cae mientras siga pagando. Falta decidir si el cobro se frena o si sale al terminar la gracia de la cuota que corría cuando se programó la baja | Abierto |
| PI-98 | Si el alumno paga la cuota siguiente del plan viejo antes de la fecha del cambio programado, el cambio se aplica igual ese día, con la cuota del plan viejo todavía corriendo. Falta decidir si se corre la fecha o se frena el cobro | Abierto |
| PI-98 | `AplicadorProgramados` corre solo con el intervalo de `index.ts`: en Render, si el proceso se duerme antes de la hora, no corre. Falta decidir si corre también al consultar (como el planificador de avisos) o con un Cron Job | Abierto |

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
|   2.13  | 12/10/2026 | Casos PI-47 a PI-50 (clases del día, toma de asistencia y cierre con ausentes, US-20 y US-21) y archivo J con los tests J-01 a J-12; fábrica `crearInscripcionDePrueba` y reloj fijo en los datos comunes; US-20 y US-21 pasan a automatizadas; cuatro puntos a confirmar abiertos | Nicolas |
|   2.14  | 12/10/2026 | Defecto D-21: los tests de asistencia dependían de la fecha real; los horarios del escenario se crean con `fecha_alta` fija y `crearHorarioDePrueba` acepta la fecha | Nicolas |
|   2.15  | 12/10/2026 | Casos PI-51 (filtro del listado de alumnos por estado de cuota, con tope de 500) y PI-52 (historial de cuotas y pagos en la ficha, solo para la propietaria) y tests H-17 a H-19; US-10 pasa a automatizada | Francisco Andrade |
|   2.16  | 12/10/2026 | PI-25 suma la ficha de un alumno que no existe, que a la profesora le responde 403 como uno ajeno (defecto D-22); E-15 lo verifica | Francisco Andrade |
|   2.17  | 12/10/2026 | Corrida completa con Vitest 5.0.4, que reemplaza a la 3.2.7 por las vulnerabilidades de `tinypool` y `brace-expansion` | Francisco Andrade |
|   2.18  | 12/10/2026 | Casos PI-53 (los parámetros del sistema los edita solo la propietaria) y PI-54 (los datos bancarios para transferir) y archivo K con K-01 a K-18; US-05, US-16, US-18 y US-21 suman los casos nuevos | Rosario Mendoza |
|   2.19  | 12/10/2026 | Corrida de los parámetros integrados con dev y verificación de que sus tests detectan fallas | Francisco Andrade |
|   2.20  | 12/10/2026 | Casos PI-55 (corrección de días anteriores) y PI-56 (clase cancelada) y tests J-13 a J-17; PI-47 y PI-48 sin el pre-inscripto en la clase y con las observaciones; se cierran los cuatro puntos de asistencia de la sección 9; US-20 y US-21 quedan automatizadas sin pendientes | Francisco Andrade |
|   2.21  | 18/10/2026 | PI-43 suma el plan, el monto esperado y el tipo de cada transferencia, con los filtros por tipo y por días de carga y el orden (pasos 5 y 6); tests H-20 y H-21, y H-12 adaptado a la respuesta paginada | Francisco Andrade |
|   2.22  | 18/10/2026 | Caso PI-64 (el alumno y su pre-inscripción en un solo pedido, `POST /preinscripciones`) y tests G-33 a G-37; US-05 suma el caso | Francisco Andrade |
|   2.23  | 18/10/2026 | PI-43: la transferencia la informa la profesora a cargo o la propietaria, y el alumno recibe 403; test H-22 y los tests que informaban con Valentina pasan a Carla | Francisco Andrade |
|   2.24  | 18/10/2026 | PI-20 suma el paso 5 (una inscripción no combina actividades, US-11) y el test G-38 | Francisco Andrade |
|   2.25  | 18/10/2026 | Caso PI-65 (el resumen diario de la propietaria, `GET /resumen-diario`) y archivo M con M-01 a M-03; US-26 queda parcial hasta la notificación diaria. La letra L queda para los tests de suplencias (PI-60 a PI-63), que todavía no están en la tabla | Francisco Andrade |
|   2.26  | 18/10/2026 | Caso PI-66 (las inscripciones a cargo de cada profesora en un período, `IInfoInscripciones.aCargoEnPeriodo`, para US-23) y test G-39 | Nicolas |
|   2.27  | 18/10/2026 | Casos PI-67 (los avisos de vencimiento de cuota) y PI-68 (las notificaciones propias por la API) y archivo N con N-01 a N-06; US-25 pasa a automatizada | Nicolas |
|   2.28  | 18/10/2026 | Casos PI-69 (la detección de alumnos inactivos con la cuota al día) y PI-70 (su gestión) y archivo O con O-01 a O-07; US-22 pasa a automatizada | Nicolas |
|   2.29  | 18/10/2026 | PI-15 suma los pasos 5 y 6 (DNI y contacto de emergencia obligatorios en el alta) y los tests E-24 y E-25; PI-16, PI-17, PI-31 y PI-64 mandan ahora altas completas | Francisco Andrade |
|   2.30  | 20/10/2026 | Casos PI-71 a PI-73 (racha e insignias, ranking de asistencia y cierre mensual) y archivo P con P-01 a P-10; casos PI-74 a PI-77 (informe de asistencia y ocupación de horarios) y archivo Q con Q-01 a Q-06. US-30, US-31 y US-37 pasan a automatizadas y US-33 a parcial (sin la exportación). Fábricas `darRol`, `crearProfesora`, `crearActividad` y `crearClase` | Nicolas |
|   2.31  | 24/10/2026 | Casos PI-78 a PI-82 (las liquidaciones y las tarifas de honorarios, US-23) y archivo R con R-01 a R-16; el honorario pasa a ser el 50 % de lo cobrado en el mes, las tarifas de alumno a cargo son un porcentaje y las de hora de suplencia, un monto fijo; US-23 pasa a automatizada | Rosario Mendoza |
|   2.32  | 04/11/2026 | Caso PI-86 (el cierre mensual automático de los honorarios desde `DIA_CIERRE_HONORARIOS`) y tests R-17 y R-18; el resto del archivo R corre con el día de cierre en 28 para que listar no cierre septiembre solo | Francisco Andrade |
|   2.33  | 05/11/2026 | Caso PI-87 (altas, bajas, activos, motivos y permanencia del reporte de Inscripciones, US-35) y archivo S con S-01 a S-03; US-35 pasa a automatizada | Francisco Andrade |
|   2.34  | 09/11/2026 | Casos PI-88 (edición y reincorporación de profesoras) y PI-89 (contacto y privacidad del listado), con T-01 a T-05; US-38 pasa a automatizada. Se completa la tabla de tests con los archivos L, R, S y U | Francisco Andrade |
|   2.35  | 10/11/2026 | Caso PI-90 (la foto de perfil de Google en el login y en `/auth/me`) y tests A-49 y A-50; US-01 la suma. El fake de Google recibe la foto como `email` + barra vertical + `foto` y las migraciones agregan `usuarios.foto_url` con su check | Francisco Andrade |
|   2.36  | 13/11/2026 | Se retiran PI-46 y los tests B-19 y B-20: la página pública usa datos fijos del front y se borra `GET /publico/actividades` con el subsistema DifusionPublica. US-32 pasa a no aplicar. Se cierra el punto abierto sobre el límite de pedidos | Nicolas |
|   2.37  | 13/11/2026 | PI-50 y PI-55 (J-10 y J-14) pasan a la regla del 12/11/2026: una clase que cierra sin ninguna marca se da por dictada con todos presentes. Fallaban desde ese cambio | Nicolas |
|   2.38  | 13/11/2026 | Caso PI-91 y tests R-19 a R-21: con promoción, lo cobrado se liquida a precio de lista del día de la cuota, en proporción al descuento. Corrige la regla que entró en el merge 6fcb658, que llevaba a lista cualquier pago menor (con promoción o sin ella), por pago y con el precio de la inscripción, y hacía fallar R-01 a R-18 | Nicolas |
|   2.39  | 13/11/2026 | Se retiran PI-65 y el archivo M (M-01 a M-03): el resumen diario de la propietaria (US-26) se eliminó del sistema, junto con el aviso de clase cancelada. US-26 pasa a no aplicar | Nicolas |
|   2.40  | 13/11/2026 | PI-67 y PI-68 (N-01 a N-03, N-05) pasan a la regla nueva de US-25: el aviso sale cuando la cuota cambia a por vencer (al entrar en la gracia) o a vencida (al terminarla), con las fechas en el texto. Se retira `DIAS_AVISO_VENCIMIENTO` | Nicolas |
|   2.41  | 13/11/2026 | Caso PI-92 (los avisos de cuota llegan al celular por push) y tests N-07 a N-10. El entorno de integración acepta un servicio de push simulado | Nicolas |
|   2.42  | 13/11/2026 | Caso PI-93 (el panel del alumno, `GET /alumnos/mi-panel`) y tests E-26 y E-27. US-29 pasa a tener cobertura | Nicolas |
|   2.43  | 13/11/2026 | Casos PI-95 (el listado de alumnos trae en `inscripciones` todas las vigentes, cada una con su situación de cuota) y PI-96 (una transferencia por plan, con su `id_inscripcion`), con H-23 a H-25; US-10, US-16 y US-17 los suman | Francisco Andrade |
|   2.44  | 13/11/2026 | Caso PI-94 (el historial de asistencia de la ficha, `GET /alumnos/:id/asistencias`) y tests E-28 y E-29; US-10 lo suma. Se corrige PI-93: la profesora de Valentina es Carla | Francisco Andrade |
|   2.45  | 13/11/2026 | Casos PI-97 (el cambio de horarios con la inscripción activa y dentro de la misma profesora y actividad), PI-98 (el cambio de plan programado) y PI-99 (la baja programada de un horario con alumnos), con G-40 a G-44; US-14 pasa a automatizada. PI-23, PI-24 y PI-38 (G-11, G-12 y G-26) pasan a las reglas nuevas. El entorno expone `aplicadorProgramados`. Tres puntos abiertos en la sección 9 | Francisco Andrade |
