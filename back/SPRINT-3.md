# Sprint 3 – Backend

Sprint 3: **Núcleo Transaccional y Operación Diaria** (según `docs/v.1.1 Sprint 0.pdf`).

| US | Historia | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-15 | Registro de cobro en efectivo | Pendiente | Francisco |
| US-16 | Registro de pago por transferencia | Pendiente | Francisco |
| US-17 | Aprobación o rechazo de transferencias | Pendiente | Francisco |
| US-18 | Cálculo del estado de habilitación del alumno | Pendiente | Rosario |
| US-20 | Registro de asistencia por clase | Pendiente | Nicolas |
| US-21 | Registro automático de inasistencias | Pendiente | Nicolas |

Fuentes: `docs/specs/05-*` y `docs/specs/06-*`, `docs/sdd/05-*` y `docs/sdd/06-*`, y el DER. Ante una diferencia entre las specs o el SDD y el DER, gana el DER (ver el final del archivo).

## Antes de arrancar: lo que queda del Sprint 2

El Sprint 3 se apoya en las inscripciones: un pago se registra sobre una cuota, la cuota es de una inscripción, y la lista de asistencia sale de los horarios de cada inscripción. Mientras no estén en `dev`, pagos y asistencia no pueden escribir sus migraciones.

| Pendiente | Responsable | Bloquea a |
| --- | --- | --- |
| Migración de `inscripciones` e `inscripcion_horarios` | Nicolas | Francisco (FK de `cuotas`) y Nicolas (FK de `asistencias`) |
| Componente `Inscripcion` (US-05, US-07, US-08, plan y horarios de US-09) e `IInfoInscripciones` | Nicolas | Francisco (alta definitiva al confirmar el pago) y Nicolas (lista de asistencia) |
| Lo que falta de US-10: la profesora ve a sus alumnos, filtros por plan, profesora y actividad, inscripción en la ficha | Francisco | — (usa `IInfoInscripciones`) |

**Prioridad 1 de Nicolas:** subir a `dev` la migración de inscripciones, aunque el componente no esté terminado.

## Dónde va cada cosa

Según la vista arquitectónica:

| Componente | Subsistema | Tablas del DER | Provee |
| --- | --- | --- | --- |
| `Cuota` | `gestion-cuotas-y-pagos/cuota/` (**subsistema nuevo**, con `ILogicaCuotasPagos`) | `cuotas` | `IInfoCuotas` |
| `Pago` | `gestion-cuotas-y-pagos/pago/` | `pagos` | `IInfoPagos` |
| `CalculadorVencimientoCuota` | `calculos-del-negocio/` (**capa no persistente**, sin base) | — | `ICalculoVencimiento` |
| `CalculadorHabilitacion` | `calculos-del-negocio/` | — | `ICalculoHabilitacion` |
| `ParametrosSistema` | `gestion-servicio-entrenamiento/parametros-sistema/` | `parametros_sistema` | `IInfoParametros` |
| `Clase` | `gestion-inscripciones-y-clases/clase/` | `clases` | `IInfoClases` |
| `Asistencia` | `gestion-inscripciones-y-clases/asistencia/` | `asistencias` | `IInfoAsistencia` |
| `CierreAsistencia` | `gestion-inscripciones-y-clases/cierre-asistencia/` (`<<process>>`) | — (usa `Asistencia`) | — |

Dependencias nuevas entre componentes:

```text
Cuota    ──> IInfoInscripciones (Inscripcion)   la inscripción a cobrar y su alta definitiva
         ──> ICalculoVencimiento                 hasta cuándo cubre la cuota
         ──> ICalculoHabilitacion                el estado del alumno
         ──> IInfoPlanes (Plan)                  precio vigente a la fecha del cobro  [falta en el diagrama]
Pago     ──> IInfoProfesores (Profesor)          quién cobró en efectivo
CierreAsistencia ──> IInfoParametros             hasta cuándo queda abierta la asistencia
Inscripcion      ──> IInfoParametros             DIAS_RESERVA_PREINSCRIPCION: hasta cuándo una pre-inscripción sin pagar guarda su lugar

GestionInscripcionesYClases (fachada) ──> IInfoCuotas   estado de cuota en la lista de asistencia  [falta en el diagrama]
GestionPersonas (fachada)             ──> IInfoCuotas   estado de cuota en el listado y la ficha (US-10)  [falta en el diagrama]
```

## Reparto

| Integrante | Asignado | Carga |
| --- | --- | --- |
| **Francisco** | Subsistema nuevo `gestion-cuotas-y-pagos`: `Cuota` y `Pago` (US-15, US-16, US-17) + lo que falta de US-10 + lo que necesita el front para el Sprint 2 | El más pesado: un subsistema, dos tablas, el ciclo del pago y el alta definitiva. Ya conoce `IInfoPlanes` e `IInfoAlumnos`, que son las piezas que usa |
| **Nicolas** | Lo que queda del Sprint 2 (inscripciones) + `Clase`, `Asistencia` y `CierreAsistencia` (US-20, US-21) | Termina su subsistema: las clases y la asistencia viven en `gestion-inscripciones-y-clases`, junto a `Inscripcion` |
| **Rosario** | Capa no persistente `calculos-del-negocio` (US-18) + componente `ParametrosSistema` | Cálculos puros, sin base y sin mocks de persistencia: se testean con fechas. No depende de nadie para arrancar, y los otros dos la consumen |

Cómo trabajar en paralelo sin bloquearse:

1. [x] **Día 1:** los contratos están en `dev`, solo los tipos, para que cada uno programe contra la interfaz de los otros y la reemplace por un fake en los tests unitarios:
   - `calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.ts` (Rosario implementa, usa Francisco).
   - `calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.ts` (Rosario implementa, usa Francisco). Suma el estado `PENDIENTE_DE_PAGO` para quien no pagó ninguna cuota, que US-18 no contemplaba.
   - `gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.ts` (Rosario implementa, usa Nicolas).
   - `gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.ts` (Francisco implementa, usan Nicolas y Francisco).
   - `IInfoInscripciones.activar` ya existía. `IInfoClases` la define Nicolas con su componente: hoy nadie de afuera la usa.
   Si al implementar hace falta cambiar un contrato, se acuerda entre quien lo provee y quien lo usa, y se sube a `dev` antes que el resto.
2. **Rosario** arranca ya: los calculadores no tocan la base. `ParametrosSistema` tiene su propia tabla, sin FK a nadie.
3. **Nicolas** sube primero la migración de inscripciones; después la de `clases` y `asistencias`.
4. **Francisco** genera la migración de `cuotas` y `pagos` recién cuando la de inscripciones está en `dev`.
5. **Migraciones:** antes de generar una, traer `dev` a la rama propia. Si dos se generan en paralelo, la segunda en integrarse se vuelve a generar sobre la primera.
6. Cada uno suma sus datos al escenario de demostración (`src/shared/db/datos-demo.ts`, que usan el seed y los tests) y sus casos a `PRUEBAS-INTEGRACION.md`. El front lo hace otro equipo y trabaja con Swagger y el seed, así que cada ruta nueva se documenta en su `<x>.openapi.ts`.
7. Las **diferencias** con las specs y el SDD ya están decididas (final del archivo).

---

## US-18 – Cálculo del estado de habilitación

**Responsable:** Rosario

Es el Strategy que anticipa `.claude/rules/patrones.md`: dos algoritmos de vencimiento según `planes.tipo`. La habilitación **no se persiste** (`arquitectura.md`): se calcula cada vez que se consulta.

### Pendiente (US-18)

- [ ] Subsistema `src/modules/calculos-del-negocio/` (el nombre sale del diagrama: "Calculos del negocio"), sin repositorio ni Prisma. Los calculadores reciben datos y devuelven resultados.
- [ ] `CalculadorVencimientoCuota` implementa `ICalculoVencimiento`: dada la fecha de pago y el plan, devuelve hasta cuándo cubre la cuota.
  - [ ] `MENSUAL`: de fecha a fecha, un mes después del pago (31/01 → 28 o 29/02, como hace `esMenorDeEdad` con el 29 de febrero).
  - [ ] `CLASE_SUELTA`: vence al terminar la clase contratada, sin días de gracia.
- [ ] `CalculadorHabilitacion` implementa `ICalculoHabilitacion`: dados el vencimiento vigente, los días de gracia del plan, si hay un pago pendiente de confirmación y la fecha, devuelve el estado (`AL_DIA`, `POR_VENCER`, `VENCIDA`, `CLASE_SUELTA_VIGENTE`, `CLASE_SUELTA_VENCIDA`), los días restantes y si puede asistir.
  - [ ] Días de gracia 0 → sin período de gracia.
  - [ ] Con una transferencia pendiente se mantiene el estado anterior y no se bloquea la asistencia (US-16).
  - [ ] Si un alumno vencido puede asistir lo decide `IInfoParametros` (ver decisiones).
- [ ] Tests parametrizados con fechas: antes del vencimiento, el mismo día, dentro y fuera de la gracia, fin de mes, año bisiesto, clase suelta el día de la clase y el siguiente.

## ParametrosSistema

**Responsable:** Rosario

Valores que configura la propietaria. Lo piden US-16 (datos bancarios para transferir), US-18 (política de vencidos), US-21 (cierre de la asistencia) y US-05 (plazo de la reserva de cupo de la pre-inscripción).

### Hecho (ParametrosSistema)

La lectura la adelantó Francisco (11/10/2026) porque la necesitaba la reserva de la pre-inscripción. Rosario sigue con la edición desde la API.

- [x] Modelo `parametros_sistema` en Prisma + migración (`ck_parametros_sistema_tipo_dato`).
- [x] Componente `gestion-servicio-entrenamiento/parametros-sistema/` con `IInfoParametros` (`ParametrosSistemaService`: lee un valor ya convertido a su tipo; si la clave todavía no tiene fila, rige su valor inicial del catálogo). Montado en `composicion.ts`.
- [x] Catálogo con el tipo y el valor inicial de cada parámetro (`parametros-sistema.catalogo.ts`) y carga en los seeds (`cargarParametrosIniciales`), sin pisar los que la propietaria ya cambió. Test de integración PI-39.

### Pendiente (ParametrosSistema)

- [ ] Las operaciones para la API se suman a `ILogicaServicioEntrenamiento`.
- [ ] `GET /api/v1/parametros` y `PATCH /api/v1/parametros/:clave`: rol `PROPIETARIA` + `PARAMETROS_EDITAR` (permiso nuevo, exclusivo de la propietaria). El valor se valida según `tipo_dato`.
- [x] Los parámetros iniciales se cargan en el seed de producción (`prisma/seed.ts`), sin pisar los que la propietaria ya cambió (como el catálogo de seguridad):
  - [x] `DATOS_BANCARIOS_CBU`, `DATOS_BANCARIOS_ALIAS`, `DATOS_BANCARIOS_TITULAR` (`TEXTO`, vacíos hasta que la propietaria los cargue).
  - [x] `VENCIDOS_PUEDEN_ASISTIR` (`BOOLEANO`, por defecto `true`: aparecen en la lista con advertencia, US-20).
  - [x] `MINUTOS_CIERRE_ASISTENCIA` (`ENTERO`, por defecto `0`: la asistencia se cierra al terminar la clase).
  - [x] `DIAS_RESERVA_PREINSCRIPCION` (`ENTERO`, por defecto `3`).
- [ ] Al editar, validar además el rango de cada número: `DIAS_RESERVA_PREINSCRIPCION` y `MINUTOS_CIERRE_ASISTENCIA` no pueden ser negativos.
- [ ] `GET /api/v1/parametros/datos-bancarios`: lo pueden leer alumnos y tutores para transferir (US-16).
- [ ] Tests del service, de las rutas y de integración.

---

## US-15 – Registro de cobro en efectivo

**Responsable:** Francisco

### Hecho (US-15)

- [x] Agregar al `.puml` y a EA que `Cuota` requiere `IInfoPlanes` y que `GestionPersonas` requiere `IInfoCuotas` (regla dura 2).
- [x] Modelos `cuotas` y `pagos` en Prisma + migración, con los CHECK del SQL de EA (`ck_cuotas_x1`, `ck_cuotas_x2`, `ck_pagos_forma_pago`, `ck_pagos_estado`, `ck_pagos_x1`, `ck_pagos_x2`, `ck_pagos_x3`) y el único `(id_inscripcion, numero_cuota)`. Test de integración PI-33.
- [x] Subsistema `gestion-cuotas-y-pagos/` con `ILogicaCuotasPagos`, su fachada y los componentes `cuota/` (`IInfoCuotas`) y `pago/`.
- [x] `POST /api/v1/pagos/efectivo`: genera la cuota del período y el pago `CONFIRMADO` en una transacción, con un bloqueo por inscripción. `rendido = false` y `id_profesora_cobra` si cobró una profesora; si cobró la propietaria, no hay nada que rendir.
- [x] **Reglas**:
  - [x] Lo registra la profesora a cargo de la inscripción o la propietaria (`PAGOS_REGISTRAR`).
  - [x] El monto esperado es el precio vigente del plan a la fecha del cobro (`IInfoPlanes.precioVigente`, US-12). Las promociones son de US-13 (Sprint 4).
  - [x] Monto distinto del esperado → 409 `MONTO_DISTINTO`, salvo que venga `confirmar_monto_distinto: true`.
  - [x] Alumno dado de baja → 409.
  - [x] El pago confirmado dispara el alta definitiva (`IInfoInscripciones.activar`, US-07), **antes** de guardar el pago: sin cupo, el cobro se rechaza sin dejar un pago registrado.
  - [x] Pago adelantado de un alumno al día → la cuota nueva empieza el día después del vencimiento de la vigente, también si paga el mismo día en que vence (ver decisiones). Test PI-36.
- [x] `GET /api/v1/pagos/:id/comprobante`: número, fecha, monto, alumno, plan, cuota y quién cobró. Lo ven la propietaria, quien registró el pago y el alumno o su tutor.
- [x] Permiso nuevo `PAGOS_REGISTRAR` (propietaria y profesora) en el catálogo.
- [x] `IInfoCuotas`: habilitación de varias inscripciones en una consulta, con `ICalculoHabilitacion` y `VENCIDOS_PUEDEN_ASISTIR`. Por eso `Cuota` también requiere `IInfoParametros` (ya en el `.puml`).
- [x] Tests unitarios del service, el repositorio, los schemas, las rutas y la fachada, con fakes de las interfaces de Rosario.
- [x] El alta definitiva, la activación del alumno, su rol y el pago se guardan en una sola transacción (`IUnidadDeTrabajo`, ver `persistencia.md`): si falla un paso no queda ninguno. Vale para el efectivo, la transferencia que carga la propietaria y la aprobación. Test de integración PI-35, sobre los componentes.
- [x] Integrado a `dev` el 10/10/2026, junto con las correcciones de la auditoría (quién paga se verifica antes del estado de la inscripción, el alta solo en el primer pago, comprobante con 404 para quien no corresponde, transferencias paginadas e `IInfoPagos`).

### Espera a los calculadores de Rosario

`composicion.ts` necesita las implementaciones de `ICalculoVencimiento`, `ICalculoHabilitacion` e `IInfoParametros` para armar `CuotaService`. El código ya está en `dev`, pero hasta entonces el subsistema no está montado en la API. Al montarlo, `composicion.ts` crea también `UnidadDeTrabajoPrisma`.

- [ ] Montar el subsistema en `app.ts`, `openapi.ts` y `composicion.ts`, y sumar las operaciones a `src/__tests__/openapi.test.ts`.
- [ ] Tests de integración del cobro, la transferencia y su revisión por HTTP (alta definitiva, pendiente que no habilita, rechazo sin motivo) y su registro en `PRUEBAS-INTEGRACION.md`. La transacción del cobro ya está probada sobre los componentes (PI-35, con `armarCuotasYPagos`).
- [x] Agregar en EA que `Cuota` requiere `IInfoParametros` y regenerar el `.jpg` y el `.pdf`.

## US-16 y US-17 – Transferencias

**Responsable:** Francisco

### Hecho (US-16 y US-17)

- [x] `POST /api/v1/pagos/transferencia`: el alumno o su tutor informa monto, fecha y hora de la transferencia y, opcional, el titular de la cuenta. Queda `PENDIENTE`. **Sin comprobante adjunto**.
- [x] `POST /api/v1/pagos/transferencia-recibida`: la propietaria carga una transferencia que ya vio en su cuenta y queda `CONFIRMADA`. **Decidido con Francisco:** es como paga la primera cuota por transferencia un alumno nuevo, que todavía no puede entrar al sistema (su usuario queda `INACTIVO` hasta el primer pago, US-05).
- [x] `GET /api/v1/pagos/mis-transferencias`: las del alumno o de los menores a cargo del tutor.
- [x] `GET /api/v1/pagos/transferencias`: solo la propietaria. Filtros por estado y alumno; ordenadas por antigüedad, con las horas desde la carga y la marca de las que pasaron las 24 horas. El filtro por fecha queda para cuando el front lo pida.
- [x] `POST /api/v1/pagos/:id/aprobar` y `POST /api/v1/pagos/:id/rechazar` (con motivo obligatorio): rol `PROPIETARIA` + `PAGOS_CONFIRMAR`.
- [x] **Reglas**:
  - [x] Solo se informa sobre una inscripción propia o de un menor a cargo (si no, 403); alumno dado de baja → 409.
  - [x] Pendiente: no da el alta ni cambia la habilitación. Mientras haya una pendiente, la inscripción no admite otro pago (409).
  - [x] Aprobada: registra quién y cuándo (`id_usuario_confirma`, `fecha_confirmacion`) y dispara el alta definitiva.
  - [x] Rechazada: `motivo_rechazo` obligatorio (`ck_pagos_x2`); la cuota queda sin pago confirmado y el próximo pago la reusa, sin saltear números.
  - [x] Solo se aprueba o rechaza una `PENDIENTE`; dos aprobaciones seguidas no duplican nada.
  - [x] Monto distinto del esperado → se aprueba solo con confirmación.
  - [x] Misma transferencia informada dos veces (alumno, monto y día de Argentina) → 409.
- [ ] El aviso a la propietaria y al alumno es de notificaciones (US-25, Sprint 4): por ahora alcanza con el listado.
- [ ] Tests de integración: ver "Espera a los calculadores de Rosario" en US-15.

## Lo que queda de US-10 (del Sprint 2)

**Responsable:** Francisco

- [x] La profesora ve y edita solo a sus alumnos (`IInfoInscripciones`); se quita la restricción temporal a la propietaria.
- [x] Filtros por plan, profesora y actividad; cada fila con su plan y profesora.
- [x] Ficha con la inscripción vigente y sus horarios.
- [ ] Estado de cuota en el listado y la ficha (`IInfoCuotas`), y filtro por estado de cuota. Espera a los calculadores: sin ellos `composicion.ts` no puede darle `IInfoCuotas` a `GestionPersonasService`.
- [x] Historial de cuotas y pagos para la ficha: `IInfoCuotas.historialDeAlumno`, sin cambiar el diagrama (`GestionPersonas` ya requiere `IInfoCuotas`). Cada cuota trae el plan y todos sus pagos, también los rechazados; de la más nueva a la más vieja, con tope de 100. Test PI-36.
- [ ] Mostrar el historial en la ficha, solo a la propietaria: `GestionPersonasService` recibe `IInfoCuotas` cuando se monte el subsistema (espera a los calculadores).

## Lo que necesita el front para el Sprint 2

**Responsable:** Francisco

El front todavía no hizo el Sprint 2 (planes, alumnos e inscripciones). Antes de que arranque:

- [x] `GET /horarios` y `GET /horarios/:id` informan `inscriptos` y `cupo_disponible`, para elegir el horario al pre-inscribir (US-04, US-05). Los cuenta la fachada `GestionServicioEntrenamientoService` con `IInfoInscripciones.contarInscriptosVigentes`, en una consulta. Test PI-27.
- [x] Un alumno activo en el escenario de demostración (Valentina Herrera, plan Intermedio con Carla), para maquetar el estado activo y probar la sesión de un alumno mientras no exista el cobro. Test E-20.
- [x] Validaciones: `-0` en enteros no negativos (`enteroNoNegativoSchema`), teléfonos con guion adelante y tope de 7 horarios por inscripción.
- [x] Revisión de inscripciones: activación fuera de la API (va por `IInfoInscripciones.activar`), baja de horario bloqueada con inscriptos, fechas DATE con el día de Argentina, pase libre sin tope de horarios y tests al 100 %.
- [x] Vista arquitectónica sin `CalculadorCupo` ni `ICalculoCupo`: el cupo lo resuelven `IInfoHorarios` e `IInfoInscripciones`.
- [x] Reflejar en el `.eap` de Enterprise Architect la quita de `ICalculoCupo` y regenerar el `.jpg` y el `.pdf` (regla dura 2).
- [x] Integrar a `dev` (solo `back/`).

---

## US-20 – Registro de asistencia por clase

**Responsable:** Nicolas

`clases.estado` (`PROGRAMADA → DICTADA | CANCELADA`) es un ciclo chico: `patrones.md` recomienda un `switch` en el service antes que State.

### Pendiente (US-20)

- [x] Agregar al `.puml` y a EA que `GestionInscripcionesYClases` requiere `IInfoCuotas` (regla dura 2).
- [ ] Modelos `clases` y `asistencias` en Prisma + migración (`ck_clases_estado`, único `(id_horario, fecha_clase)`, PK compuesta de `asistencias`).
- [ ] Componentes `clase/` (`IInfoClases`) y `asistencia/` (`IInfoAsistencia`) en `gestion-inscripciones-y-clases`.
- [ ] `GET /api/v1/clases/hoy`: las clases del día de la profesora con sesión iniciada (o de todas, para la propietaria). Las clases se crean al pedirlas, a partir de los horarios del día; el único `(id_horario, fecha_clase)` evita duplicarlas (ver decisiones).
- [ ] `GET /api/v1/clases/:id/asistencia`: inscriptos del horario con su estado de cuota (`IInfoCuotas`) y su asistencia (`presente`, `ausente` o sin marcar).
- [ ] `PUT /api/v1/clases/:id/asistencia/:idAlumno`: marca presente o ausente; se guarda al momento y el último marcado vale. `POST /api/v1/clases/:id/asistencia/todos-presentes`.
- [ ] **Reglas**:
  - [ ] Solo clases del día; las de otros días, solo la propietaria (corrección).
  - [ ] Solo aparecen los inscriptos en ese horario con la inscripción vigente; un dado de baja no aparece.
  - [ ] Un vencido aparece con advertencia; si puede asistir lo decide `VENCIDOS_PUEDEN_ASISTIR`. Uno con transferencia pendiente aparece sin restricción.
  - [ ] Con la asistencia cerrada no se marca más, salvo la propietaria. Cada marcado guarda quién y cuándo (`id_usuario_registra`, `fecha_registro`).
  - [ ] Toma asistencia la profesora dictante o la propietaria (`ASISTENCIAS_MARCAR`).
- [ ] Tests del service y de integración.

## US-21 – Inasistencias automáticas

**Responsable:** Nicolas

### Pendiente (US-21)

- [ ] `POST /api/v1/clases/:id/cerrar`: la profesora cierra la asistencia; guarda `fecha_cierre_asist` y la clase pasa a `DICTADA`.
- [ ] `CierreAsistencia`: los inscriptos sin marcar quedan `asistio = false` con `id_usuario_registra = NULL` (lo registró el cierre). No toca a los ya marcados.
- [ ] Cierre automático de las clases que terminaron (más `MINUTOS_CIERRE_ASISTENCIA`) y siguen abiertas (ver decisiones).
- [ ] **Reglas**:
  - [ ] El cierre automático genera ausentes solo si la clase tiene al menos una asistencia marcada a mano: si no se tomó asistencia, no inventa faltas. El cierre con el botón siempre los genera (ver decisiones).
  - [ ] Los dados de baja no generan inasistencias.
  - [ ] Cerrar dos veces no duplica nada.
- [ ] Tests del service y de integración (5 inscriptos, 3 presentes, cierre → 2 ausentes).

### Pendientes del Sprint 1 que siguen esperando

- [x] Un horario con alumnos inscriptos no se da de baja (409; fachada `GestionServicioEntrenamientoService` + `IInfoInscripciones`).
- [ ] Revisar si el bloqueo de baja de actividad (US-03) se limita a horarios con alumnos inscriptos.

---

## Diferencias con las specs y el SDD

**Responsables:** los tres. Todas quedaron decididas.

- [x] **Comprobante de transferencia.** El SDD propone subir el comprobante (`multer`, archivos en S3). La US-16 dice que no se adjunta y el DER no tiene dónde guardarlo. **Decidido: manda el DER y la spec.** Sin archivos: menos superficie de ataque y sin almacenamiento que mantener.
- [x] **Comprobante del cobro (US-15).** La spec pide imprimirlo o descargarlo en PDF. **Decidido:** el back devuelve los datos (`GET /pagos/:id/comprobante`; el número es el `id_pago`) y el front lo arma para imprimir o guardar como PDF. Evita sumar una librería de PDF al back.
- [x] **Cuándo se genera la cuota.** `pagos.id_cuota` es obligatorio, así que la cuota existe antes que el pago. **Decidido:** la cuota del período se genera al registrar el pago, en la misma transacción, con el monto del precio vigente ese día. La cuota cubre desde el pago hasta el vencimiento que calcula `ICalculoVencimiento`. Lo que se pierde: no hay deuda acumulada por períodos no pagados (quien vuelve después de meses paga desde ese día). La alternativa es generar las cuotas por adelantado con un proceso programado.
- [x] **Días de gracia.** La US-18 los describe "antes del vencimiento" y el SDD "después" (`EN_GRACIA`). **Decidido:** después del vencimiento, como el SDD y como funciona una cuota vencida con tolerancia. El estado en la gracia se llama `POR_VENCER`, como en la spec y en el badge amarillo de US-10.
- [x] **Vencidos en la clase.** La US-18 lo deja configurable. **Decidido:** parámetro `VENCIDOS_PUEDEN_ASISTIR`, por defecto `true` (aparecen con advertencia, como pide US-20).
- [x] **Instancias de clase.** El SDD propone un generador. **Decidido:** se crean al pedir las clases del día, sin proceso programado; el único `(id_horario, fecha_clase)` del DER hace que pedirlas dos veces no las duplique.
- [x] **Cierre automático (US-21).** Hace falta algo que corra al terminar cada clase. En Render el servidor se duerme sin tráfico, así que un `cron` dentro del proceso no es confiable. **Decidido:** las clases vencidas se cierran al leerlas (clases del día, historial, informes) y además con un intervalo dentro del proceso mientras está despierto. Si hace falta exactitud, se suma un Cron Job de Render que llame a un endpoint interno.
- [x] **"Se abrió la ventana" (US-21).** No hay columna para eso. **Decidido:** el cierre automático genera ausentes solo si la clase tiene al menos una asistencia marcada a mano; sin ninguna, se entiende que no se tomó asistencia y no inventa faltas. El cierre con el botón de la profesora siempre genera los ausentes, aunque no haya marcado a nadie (por ejemplo, porque no vino ningún alumno).
- [x] **Pago adelantado.** La cuota nueva empieza el día después del vencimiento de la vigente, para que ningún día quede cubierto por dos cuotas; el día del vencimiento cuenta como cubierto, así que quien paga ese mismo día también sigue desde el siguiente. **Decidido con Francisco** (10/10/2026). Como `ICalculoVencimiento` calcula de fecha a fecha desde ese primer día, las cuotas adelantadas se corren un día por mes (vence el 10/11, la siguiente vence el 11/12).
- [x] **Reserva de cupo de la pre-inscripción (US-05, US-07).** El diseño del front decía que el cupo se liberaba a las 72 hs para una lista de espera, y no estaba en ninguna spec. **Decidido con Francisco** (11/10/2026): una pre-inscripción sin pagar guarda su lugar hasta `DIAS_RESERVA_PREINSCRIPCION` días después de su fecha de inicio (parámetro, 3 por defecto; con 0 vence el mismo día). Se cuenta desde el inicio y no desde el alta, para que quien se anota con anticipación no pierda el lugar antes de empezar. Pasado el plazo sigue PREINSCRIPTA, pero deja de ocupar cupo para el alta y para la ocupación de los horarios; si después paga, el alta vuelve a pedir cupo (409 si otro ocupó el lugar). Sigue contando para la baja del horario, porque todavía está en él. Cambiar de plan conserva la fecha de inicio de la pre-inscripción, así que no renueva la reserva. Se calcula al consultar, sin proceso programado, y las respuestas traen `reserva: { vence, vencida }`. Sin lista de espera: no está en el backlog y pediría tablas nuevas. Falta anotarlo en la spec de US-05.
- [x] **Historial de pagos en la ficha (US-10).** **Decidido:** llega por `IInfoCuotas`, como ya está en el diagrama: la ficha muestra las cuotas con sus pagos, y el componente `Cuota` ya lee los pagos para calcular la habilitación.
- [x] **Alta definitiva desde el cobro.** `ILogica*` es solo para la presentación. **Decidido:** `IInfoInscripciones.activar(idInscripcion)`, como `IInfoAlumnos.activar`, idempotente.
- [x] **Diagrama.** Agregar a la vista arquitectónica que `Cuota` requiere `IInfoPlanes`, y que `GestionInscripcionesYClases` y `GestionPersonas` requieren `IInfoCuotas`. **Decidido:** cada responsable las agrega al `.puml` y a EA en el primer commit de su parte, antes de codificarla (regla dura 2): Francisco las de `Cuota` y `GestionPersonas`, Nicolas la de `GestionInscripcionesYClases`.
- [x] **Permisos nuevos.** **Decidido:** `PAGOS_REGISTRAR` (propietaria y profesora; lo agrega Francisco) y `PARAMETROS_EDITAR` (exclusivo de la propietaria: la matriz no deja otorgárselo a otro rol; lo agrega Rosario). En una base ya cargada, la propietaria se los otorga a la profesora desde la matriz.
