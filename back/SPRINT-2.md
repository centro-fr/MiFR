# Sprint 2 – Backend

Sprint 2: **Gestión Comercial y Ciclo de Vida del Alumno** (según `docs/v.1.1 Sprint 0.pdf`).

| US | Historia | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-11 | Alta y edición de planes vigentes | Completa | Francisco |
| US-12 | Actualización de precios con fecha de vigencia | Completa (el precio aplicado al cobrar se prueba con el cobro del Sprint 3, PI-40) | Francisco |
| US-05 | Pre-inscripción de alumno nuevo | Completa | Francisco (alumno) + Nicolas (inscripción) |
| US-06 | Asociación de tutor a alumno menor | Completa | Francisco |
| US-07 | Alta definitiva al confirmarse el primer pago | Completa | Nicolas |
| US-08 | Baja lógica de alumno | Completa | Nicolas |
| US-09 | Modificación de datos de alumno | Completa | Francisco (datos y tutor) + Nicolas (plan y horarios) |
| US-10 | Consulta y búsqueda de alumnos | Completa (estado de cuota e historiales de pagos y asistencia: Sprint 3) | Francisco |

Fuentes: `docs/specs/03-*` y `docs/specs/04-*`, `docs/sdd/03-*/tasks.md` y `docs/sdd/04-*/tasks.md`, y el DER (`docs/diagrams/enterprise_architect/DER - Centro de Entrenamiento FR.sql`). Ante una diferencia entre las specs o el SDD y el DER, gana el DER (ver el final del archivo).

## Dónde va cada cosa

Según la vista arquitectónica:

| Componente | Subsistema | Tablas del DER | Provee |
| --- | --- | --- | --- |
| `Plan` | `gestion-servicio-entrenamiento/plan/` (ya existe el subsistema) | `planes`, `plan_precios` | `IInfoPlanes` |
| `Alumno` | `gestion-personas/alumno/` (ya existe el subsistema) | `alumnos` (+ filas en `usuarios` para el alumno y el tutor) | `IInfoAlumnos` |
| `Inscripcion` | `gestion-inscripciones-y-clases/inscripcion/` (**subsistema nuevo**, con `ILogicaInscripcionesYClases`) | `inscripciones`, `inscripcion_horarios` | `IInfoInscripciones` |

Dependencias entre componentes, sin ciclos:

```text
Inscripcion ──> IInfoAlumnos (Alumno)
            ──> IInfoPlanes (Plan)
            ──> IInfoHorarios (Horario)
            ──> IInfoProfesores (Profesor)

GestionPersonasService (fachada)             ──> IInfoInscripciones   (US-10: filtros por plan/profesora)
GestionServicioEntrenamientoService (fachada) ──> IInfoInscripciones  (aviso al dar de baja un horario)
```

`Horario` y `Alumno` no conocen a `Inscripcion`: lo que necesitan de ella lo pide la fachada del subsistema. Así el composition root arma primero los componentes, después `Inscripcion` y al final las fachadas, sin dependencias circulares.

## Reparto

| Integrante | Asignado | Carga |
| --- | --- | --- |
| **Francisco** | `Plan` completo (US-11, US-12) + `Alumno` completo (US-06, la parte de alumno de US-05, datos personales y tutor de US-09, US-10) + ajustes en `Usuario` y en el catálogo de permisos | Dos componentes en subsistemas existentes, tres tablas. Sigue tocando `gestion-usuarios`, que ya conoce |
| **Nicolas** | Subsistema nuevo `gestion-inscripciones-y-clases` con `Inscripcion` (la parte de inscripción de US-05, US-07, US-08, plan y horarios de US-09) + cálculo de cupo + pendientes del Sprint 1 que esperaban inscripciones | Un subsistema nuevo, dos tablas, las reglas de cupo y los cambios de estado. Ya conoce `Horario` y la lógica de cupos de US-03/US-04 |

Cómo trabajar en paralelo sin bloquearse:

1. [x] `IInfoPlanes` e `IInfoAlumnos` publicadas; `IInfoInscripciones` la define Nicolas con lo que pide US-10 (abajo). **Día 1, los dos juntos:** acordar y commitear las interfaces `IInfoPlanes`, `IInfoAlumnos` e `IInfoInscripciones` (solo los tipos, sin implementación). Cada uno programa contra la interfaz del otro y la reemplaza por un fake en los tests unitarios.
2. [x] **Francisco** hace primero la migración de `planes`, `plan_precios` y `alumnos`, y la integra a `dev` cuanto antes: las FK de `inscripciones` apuntan a esas tablas.
3. **Nicolas** trae esa migración a su rama y recién ahí genera la de `inscripciones` e `inscripcion_horarios`. Dos migraciones generadas en paralelo sobre el mismo `schema.prisma` chocan en el orden.
4. Cada uno suma sus datos a `prisma/seed-demo` y sus casos a `PRUEBAS-INTEGRACION.md`. El front lo hace otro equipo y trabaja con el contrato de Swagger y el seed-demo, así que cada ruta nueva se documenta en su `<x>.openapi.ts`.
5. Las **diferencias a decidir** (final del archivo) se cierran entre los dos antes de escribir las migraciones.

---

## US-11 – Alta y edición de planes vigentes

**Responsable:** Francisco

### Hecho (US-11)

- [x] Modelos `planes` y `plan_precios` en Prisma + migración, con los CHECK del SQL de EA (`ck_planes_tipo`, `ck_planes_x1`, `ck_planes_x2`, `ck_planes_x3`, `ck_plan_precios_x1`, `ck_plan_precios_x2`) y la FK `FK_planes_actividad_exclusiva`.
- [x] Componente `gestion-servicio-entrenamiento/plan/` (repository, service, controller, routes, schemas, openapi) e interfaz `IInfoPlanes` (buscar por id, precio vigente a una fecha). Las operaciones para la API se suman a `ILogicaServicioEntrenamiento`.
- [x] Endpoints: listar (filtros por tipo, actividad exclusiva y vigencia), obtener, crear (con su precio inicial en la misma transacción), editar, baja lógica (`fecha_baja`).
- [x] **Reglas**:
  - [x] `tipo` `MENSUAL` o `CLASE_SUELTA`; en `CLASE_SUELTA` van `clases_por_semana = NULL` y `dias_gracia = 0`.
  - [x] `clases_por_semana` entre 1 y 7 en los mensuales.
  - [x] Precio inicial mayor a 0.
  - [x] Si tiene actividad exclusiva, la actividad tiene que existir y estar activa.
  - [x] Un plan nunca se borra: se le pone `fecha_baja`. Un plan dado de baja no admite inscripciones nuevas (lo controla `Inscripcion` con `IInfoPlanes`); las que ya tiene siguen.
  - [x] Nombre de plan duplicado entre los vigentes → 409.
- [x] Protegido con `PLANES_VER` / `PLANES_EDITAR`.
- [x] Tests del service y de las rutas; de integración PI-11, PI-12 y PI-14 (tests D-01 a D-07, D-13 y D-14).

## US-12 – Actualización de precios con fecha de vigencia

**Responsable:** Francisco

### Hecho (US-12)

- [x] `POST /api/v1/planes/:id/precios`: cierra el precio vigente (`fecha_vigencia_hasta = fecha_nueva - 1 día`) e inserta el nuevo, en una transacción.
- [x] `GET /api/v1/planes/:id/precios`: historial del plan.
- [x] `IInfoPlanes.precioVigente(idPlan, fecha)`: el precio cuya vigencia contiene la fecha. Lo usan `Inscripcion`, para guardar `id_plan_precio`, y el cobro del Sprint 3, para el monto de la cuota.
- [x] **Reglas**:
  - [x] Precio mayor a 0.
  - [x] Fecha de vigencia hoy o futura; en el pasado → 400.
  - [x] Si ya hay un precio programado a futuro, el nuevo lo reemplaza (se resuelve por el más reciente) en lugar de dejar dos vigencias superpuestas.
  - [x] Plan dado de baja → 409.
  - [x] Las inscripciones guardan `id_plan_precio`, así que un cambio de precio nunca altera lo ya cobrado.
  - [x] El cobro aplica el precio que rige el día del cobro: antes de la fecha de vigencia, el anterior; desde esa fecha (incluida), el nuevo. La cuota guarda ese monto.
- [x] Auditoría del cambio (evento `PRECIO_PLAN_REGISTRADO` con el precio nuevo, su fecha y el usuario) con `shared/utils/auditoria.ts`: el DER no tiene columna para el usuario que lo hizo. El valor anterior queda en el historial de `plan_precios`.
- [x] Tests del cálculo de vigencias (antes, el mismo día y después de la fecha) y de integración del cierre de vigencia: PI-13 (tests D-08 a D-12). El precio que aplica el cobro antes y después de la vigencia, y que la cuota ya cobrada no cambia: PI-40 (tests H-07 a H-09).

---

## US-05 y US-06 – Pre-inscripción y tutor (parte de alumno)

**Responsable:** Francisco

### Hecho (US-05 y US-06, alumno)

- [x] Modelo `alumnos` en Prisma + migración (`ck_alumnos_estado`, UK `id_usuario`, FK al tutor `FK_alumnos_usuario_responsable`).
- [x] Componente `gestion-personas/alumno/` con `IInfoAlumnos`; las operaciones para la API se suman a `ILogicaPersonas`.
- [x] `POST /api/v1/alumnos`: crea el `usuario` del alumno en estado `INACTIVO` y sin roles (no puede entrar todavía) y la fila de `alumnos` en estado `INACTIVO`.
- [x] `Usuario`: búsqueda por DNI expuesta en `IInfoUsuarios`. El usuario del alumno y el del tutor nuevo se crean en la misma transacción que el alumno (repositorio de `Alumno`): separados, un fallo dejaba un usuario huérfano con el email o el DNI tomados.
- [x] **Reglas**:
  - [x] Menor de 18 años → el tutor es obligatorio (400 si falta). Mayor → no se acepta tutor.
  - [x] El tutor es un `usuario`: si ya existe (por DNI o email) se reutiliza, si no se crea. Un tutor puede tener varios alumnos.
  - [x] Un menor no lleva `email` ni `google_id` (comentario del DER); el acceso al sistema es del tutor.
  - [x] DNI ya registrado → 409 `ALUMNO_EXISTENTE` con el id del alumno existente, para que el front muestre la advertencia.
  - [x] Mayor de edad → email obligatorio (decidido); el tutor también lo lleva, porque es quien entra.
- [x] `IInfoAlumnos.activar(id)`: pasa alumno y usuario a `ACTIVO` y asigna el rol `ALUMNO`, o `TUTOR` al responsable si es menor. Tiene que ser idempotente: la va a llamar `Inscripcion` y un pago confirmado dos veces no puede duplicar nada.
- [x] `IInfoAlumnos.darDeBaja(id)` e `IInfoAlumnos.reactivar(id)` para US-08 (la baja deja al usuario `INACTIVO`; el tutor no se toca porque puede tener otros alumnos).
- [x] Catálogo: la profesora tiene `ALUMNOS_EDITAR` y `PLANES_VER` en `MATRIZ_INICIAL`. En una base ya cargada la carga del catálogo no los agrega, porque ya existían: mientras estemos en desarrollo, se regenera la base (ver `DESPLIEGUE.md`).
- [x] Tests del service (menor sin tutor, reutilización del tutor, activación idempotente) y de integración: PI-15, PI-16 y PI-19 (tests E-01 a E-08 y F-01 a F-03).

## US-05, US-07 y US-08 – Inscripción, alta definitiva y baja

**Responsable:** Nicolas

### Hecho (inscripción)

- [x] Diagramar la máquina de estados `PREINSCRIPTA → ACTIVA → BAJA` en [estados_inscripcion.puml](../docs/diagrams/puml/estados_inscripcion.puml) antes de implementarla. El flujo no requiere una jerarquía State: las transiciones y sus reglas quedan en el service.
- [x] Modelos `inscripciones` e `inscripcion_horarios` en Prisma + migraciones y restricciones (`ck_inscripciones_estado`, `ck_inscripciones_motivo_baja`, `ck_inscripciones_x1`, `ck_inscripciones_x2`, PK compuesta de `inscripcion_horarios`).
- [x] Subsistema `gestion-inscripciones-y-clases/` con `ILogicaInscripcionesYClases`, su fachada y `IInfoInscripciones`; rutas montadas en `app.ts` y composición en `composicion.ts`.
- [x] `POST /api/v1/inscripciones` crea una inscripción `PREINSCRIPTA` con horarios, profesora a cargo y el `id_plan_precio` vigente hoy.
- [x] `GET /api/v1/inscripciones` (filtros por alumno, plan, profesora, actividad y estado) y `GET /api/v1/inscripciones/:id`.
- [x] **Reglas de US-05**:
  - [x] Plan obligatorio y vigente; los planes con actividad exclusiva solo aceptan horarios de esa actividad.
  - [x] Si `planes.profesora_unica`, todos los horarios deben pertenecer a la profesora a cargo.
  - [x] En planes mensuales, la cantidad de horarios no supera `clases_por_semana`.
  - [x] El cupo efectivo del horario (propio o heredado de la actividad) cuenta inscripciones `PREINSCRIPTA` o `ACTIVA` con horario vigente (`fecha_hasta` nula). Sin cupo → 409; las operaciones que compiten por el cupo se serializan en transacción.
  - [x] Un alumno no puede tener dos inscripciones activas o pre-inscriptas al mismo plan.
- [x] `IInfoInscripciones.activar(id)` es idempotente desde `ACTIVA`, rechaza `BAJA` con 409, revalida cupo y activa al alumno. No está en la API: US-07 dice que el alta definitiva la dispara el pago confirmado, así que la va a llamar el cobro del Sprint 3.
- [x] `POST /api/v1/alumnos/:id/baja` cierra inscripciones y horarios vigentes, guarda el motivo y la fecha de baja, y luego da de baja al alumno; repetirla responde 409. Con el motivo `OTRO` acepta `detalle_baja` (opcional, hasta 200 caracteres), que se guarda en cada inscripción dada de baja; con otro motivo el detalle responde 400. La columna se sumó al DER el 11/10/2026 (PI-41).
- [x] `POST /api/v1/alumnos/:id/reactivar` crea una inscripción nueva, conserva la anterior como historial, valida cupos y reactiva al alumno. Sin cupo responde 409 sin cambiar su estado.
- [x] Baja, reactivación, cambio de plan y cambio de horarios requieren rol `PROPIETARIA` y permiso `ALUMNOS_EDITAR`. Una profesora solo ve las inscripciones que tiene a cargo.
- [x] `IInfoInscripciones` expone ids de alumnos por plan/profesora/actividad y el resumen vigente por lote (sin N+1), además del conteo de cupo para horarios.
- [x] Tests unitarios del ciclo de vida y de integración PI-20 a PI-23.

### Pendientes del Sprint 1 que se destraban

- [x] Un horario con alumnos inscriptos no se da de baja (409): primero hay que reubicarlos (US-04). Lo resuelve la fachada `GestionServicioEntrenamientoService` con `IInfoInscripciones`; `Horario` no la conoce.
- [x] La baja de una actividad se bloquea solo si algún horario tiene alumnos inscriptos (US-03); si no, da de baja también sus horarios en el mismo paso. Decidido con Francisco: antes había que dar de baja cada horario a mano.

---

## US-09 – Modificación de datos de alumno

### Francisco: datos personales y tutor

- [x] `PATCH /api/v1/alumnos/:id`: datos personales, contacto de emergencia, observaciones, apto médico y tutor.
- [x] La profesora solo edita contacto (`telefono`, `direccion`, `cont_emerg_nombre`, `cont_emerg_telefono`) y observaciones de los alumnos a su cargo; otro campo o un alumno ajeno responde 403. Tests de integración PI-25.
- [x] Si un cambio de fecha de nacimiento lo vuelve menor, exige tutor; si lo vuelve mayor, se quita el tutor (y pasa a necesitar email).
- [x] Auditoría del cambio (usuario y fecha): evento `ALUMNO_MODIFICADO` con los campos tocados. Tests de integración PI-17 (E-09 a E-11).

### Nicolas: plan y horarios

- [x] `POST /api/v1/inscripciones/:id/cambio-plan`: da de baja la inscripción actual con `motivo_baja = CAMBIO_PLAN` y crea la nueva con el precio vigente, en una transacción. Las cuotas aún no existen en el modelo; cuando se incorporen, deben seguir ligadas a la inscripción anterior.
- [x] `PATCH /api/v1/inscripciones/:id/horarios`: cierra los horarios que salen (`fecha_hasta`) y agrega los nuevos con validación transaccional de cupo.
- [x] Plan no vigente o sin cupo → 409. Solo la propietaria.

## US-10 – Consulta y búsqueda de alumnos

**Responsable:** Francisco

### US-10 (lo que falta usa `IInfoInscripciones`, de Nicolas)

- [x] `GET /api/v1/alumnos`: búsqueda parcial por nombre y apellido sin distinguir acentos ni mayúsculas, DNI exacto, filtro por estado, paginación (`limit`, `offset`). Los dados de baja no salen salvo con `incluirBajas=true`.
- [x] Filtros por plan, profesora y actividad: la fachada `GestionPersonasService` le pide a `IInfoInscripciones` los ids y después lista los alumnos con esos ids.
- [x] Cada fila trae su plan y profesora vigentes (`inscripcion`), pedidos a `IInfoInscripciones` para toda la página de una vez.
- [x] `GET /api/v1/alumnos/:id`: ficha con datos y tutor.
- [x] La ficha trae las inscripciones vigentes con plan, precio, profesora y horarios (`inscripciones`), desde `IInfoInscripciones`.
- [x] Una profesora solo ve los alumnos de los que está a cargo (`inscripciones.id_profesora`), y con los demás recibe 403; la propietaria ve todos.
- [x] Búsqueda sin acentos con la extensión `unaccent` (migración `habilitar_unaccent`); incluye el nombre del tutor. **Decidido: sin índice por ahora.** Un centro tiene cientos de alumnos y el recorrido completo es instantáneo; `unaccent` no es `IMMUTABLE` y un índice pide una función envoltorio. Se revisa si el volumen crece.
- [x] Tests del service y de integración de la búsqueda con acentos, las bajas y la paginación: PI-18 (E-12 a E-15).
- [x] Tests de integración de los filtros y de lo que ve la profesora: PI-25 y PI-26 (E-15 a E-19).

Fuera de este sprint: estado de cuota, historial de pagos e historial de asistencia de la ficha. Dependen de `cuotas`, `pagos` y `asistencias` (Sprint 3); hasta entonces la ficha no los devuelve.

---

## Diferencias a decidir antes de seguir

**Responsables:** los dos. Todas se decidieron como estaba propuesto.

- [x] **Plan ↔ actividad y profesora.** US-11 pide que el plan tenga actividad y profesora obligatorias. En el DER `planes` solo tiene `id_actividad_exclusiva` (opcional) y `profesora_unica`; la profesora a cargo está en `inscripciones.id_profesora`. **Decidido: manda el DER.** La profesora se elige al inscribir y `profesora_unica` obliga a que todos los horarios sean de ella. Avisar al equipo del front.
- [x] **Estado del alumno pre-inscripto.** US-05 habla de alumno "pendiente", pero `alumnos.estado` solo admite `ACTIVO`, `INACTIVO` y `BAJA`. **Decidido:** alumno `INACTIVO` + inscripción `PREINSCRIPTA`. Lo "pendiente" se lee de la inscripción.
- [x] **Pre-inscripción en uno o dos pasos.** El alumno es de `GestionPersonas` y la inscripción de `GestionInscripcionesYClases`. **Decidido:** dos llamadas (`POST /alumnos` y después `POST /inscripciones`). Respeta los subsistemas y no hace falta una transacción entre los dos. Lo que se pierde: si falla la segunda queda un alumno `INACTIVO` sin inscripción, que es inofensivo y se reutiliza al reintentar.
- [x] **Peso y talla.** US-05 los pide "si la actividad lo requiere", pero `actividades` no tiene ese dato y las medidas viven en `registros_progreso` / `medidas_corporales` (Sprint 5). **Decidido:** fuera del Sprint 2; el criterio "clase que requiere peso/talla sin cargarlos → falla" no se puede cumplir sin cambiar el DER.
- [x] **Parentesco del tutor.** US-06 lo pide y el DER no lo tiene. **Decidido:** no se guarda (si hace falta, va en `observaciones`).
- [x] **Email del alumno mayor.** US-05 lo da como opcional, pero sin email no puede entrar con Google. **Decidido:** obligatorio para mayores, para que al activarse pueda iniciar sesión.
- [x] **Edad de corte configurable.** **Decidido:** constante de 18 años por ahora (YAGNI); pasa a `parametros_sistema` cuando exista ese componente.
- [x] **Diagrama.** Actualizado en `vista_arquitectonica.puml` y en el `.eap` de Enterprise Architect, con el `.jpg` y el `.pdf` regenerados. La vista arquitectónica no muestra que `Inscripcion` requiera `IInfoPlanes`, ni que `GestionPersonas` y `GestionServicioEntrenamiento` requieran `IInfoInscripciones`. Actualizar `docs/diagrams/` antes de implementarlo (regla dura 2).
