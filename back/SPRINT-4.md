# Sprint 4 – Backend

Sprint 4: **Control Administrativo, Finanzas y Retención** (según `docs/v.1.1 Sprint 0.pdf`).

| US | Historia | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-13 | Alta de descuentos y promociones temporales | Pendiente | Francisco |
| US-19 | Control de efectivo pendiente de rendición | Pendiente | Francisco |
| US-26 | Resumen diario para la propietaria | Pendiente | Francisco |
| US-22 | Detección de alumnos inactivos con cuota al día | Pendiente | Nicolas |
| US-24 | Registro de suplencias entre profesoras | Pendiente | Nicolas |
| US-25 | Aviso automático de vencimiento de cuota | Pendiente | Nicolas |
| US-23 | Informe mensual automático de honorarios | Pendiente | Rosario |

Fuentes: `docs/specs/04-*/US-13`, `docs/specs/05-*/US-19`, `docs/specs/06-*/US-22`, `docs/specs/07-*` y `docs/specs/08-*`, `docs/sdd/04-*`, `docs/sdd/05-*` a `docs/sdd/08-*`, y el DER. Ante una diferencia entre las specs o el SDD y el DER, gana el DER (ver el final del archivo).

## Antes de arrancar: lo que queda del Sprint 3

Ninguno de estos pendientes bloquea el Sprint 4, salvo la API de parámetros: tres historias nuevas suman un parámetro que la propietaria tiene que poder editar.

| Pendiente | Responsable | Bloquea a |
| --- | --- | --- |
| API de `ParametrosSistema` (`GET /parametros`, `PATCH /parametros/:clave`, `GET /parametros/datos-bancarios`) y su validación de rango | Rosario | La configuración de US-22, US-25 y US-26 (los tres leen con los valores iniciales mientras tanto) |
| Reflejar en el `.eap` las dependencias nuevas de `Clase` y `CierreAsistencia` y regenerar el `.jpg` y el `.pdf` (US-20) | Nicolas | — |
| Puntos abiertos de la sección 9 de `PRUEBAS-INTEGRACION.md` (clases de días anteriores, pre-inscriptos en la lista, observaciones) | Nicolas | — |

**Prioridad 1 de Rosario:** el día 1 suma al catálogo de parámetros las claves nuevas del sprint (ver "Cómo trabajar en paralelo"), aunque la API de edición llegue después.

## Dónde va cada cosa

Según la vista arquitectónica:

| Componente | Subsistema | Tablas del DER | Provee |
| --- | --- | --- | --- |
| `Promocion` | `gestion-servicio-entrenamiento/promocion/` (ya existe el subsistema) | `promociones`, `promocion_planes` (+ FK de `inscripciones.id_promocion`) | — (la usa `Plan`, que la expone por `IInfoPlanes`) |
| `Pago` (rendición) | `gestion-cuotas-y-pagos/pago/` (ya existe) | `pagos.rendido`, `pagos.fecha_rendicion` | `IInfoPagos` |
| `Suplencia` | `gestion-inscripciones-y-clases/suplencia/` (ya existe el subsistema) | `suplencias` (+ `clases.id_prof_dictante`) | — (la expone `IInfoClases`) |
| `DetectorInactividad` | `reportes/detector-inactividad/` (**subsistema nuevo, no persistente**, con `ILogicaInformes`) | — (lee asistencias, cuotas e inscripciones) | — |
| `Notificacion` | `gestion-notificaciones/notificacion/` (**subsistema nuevo**, con `ILogicaNotificaciones`) | `notificaciones` | — (la usan los dos procesos del subsistema) |
| `PlanificadorNotificaciones` | `gestion-notificaciones/planificador-notificaciones/` (`<<process>>`) | — (usa `Notificacion`) | — |
| `ResumenDiarioPropietaria` | `gestion-notificaciones/resumen-diario-propietaria/` (`<<process>>`) | — (usa `Notificacion`) | — |
| `TarifaHonorario` | `gestion-honorarios/tarifa-honorario/` (**subsistema nuevo**, con `ILogicaHonorarios`) | `tarifas_honorario` | — |
| `Liquidacion` | `gestion-honorarios/liquidacion/` | `liquidaciones`, `liquidacion_detalles` | — |
| `CalculadorHonorarios` | `calculos-del-negocio/calculador-honorarios/` (capa no persistente, sin base) | — | `ICalculoHonorarios` |

Dependencias nuevas entre componentes:

```text
Plan                     ──> Promocion                          descuento vigente a una fecha (mismo subsistema)
Inscripcion              ──> IInfoPlanes (Plan)                 guarda id_promocion al pre-inscribir (ya la requería)
Cuota                    ──> IInfoPlanes (Plan)                 monto esperado con el descuento (ya la requería)

Suplencia                ──> Clase                              materializa la clase y cambia la dictante (mismo subsistema)
                         ──> IInfoProfesores                    la suplente es una profesora activa  [falta en el diagrama]

DetectorInactividad      ──> IInfoAsistencia                    últimas asistencias de cada inscripción
                         ──> IInfoParametros                    INASISTENCIAS_CONSECUTIVAS_INACTIVO
                         ──> IInfoInscripciones                 inscripciones vigentes con plan y profesora  [falta en el diagrama]
                         ──> IInfoCuotas                        solo los que tienen la cuota al día  [falta en el diagrama]
                         ──> IInfoAlumnos                       datos de contacto y tutor  [falta en el diagrama]

PlanificadorNotificaciones ──> IInfoCuotas                      cuotas por vencer y vencidas  [falta en el diagrama]
                           ──> IInfoParametros                  DIAS_AVISO_VENCIMIENTO
Notificacion             ──> IInfoUsuarios                      destinatario (el tutor si es menor)
ResumenDiarioPropietaria ──> IInfoPagos                         transferencias pendientes y efectivo sin rendir
                         ──> IInfoCuotas                        cuotas vencidas
                         ──> IInfoParametros                    HORA_RESUMEN_DIARIO  [falta en el diagrama]

Liquidacion              ──> ICalculoHonorarios                 el cálculo puro
                         ──> IInfoInscripciones                 alumnos a cargo en el período
                         ──> IInfoClases                        clases suplidas en el período
                         ──> IInfoCuotas                        lo cobrado, para las tarifas por porcentaje
TarifaHonorario          ──> IInfoProfesores, IInfoPlanes
```

## Reparto

| Integrante | Asignado | Carga |
| --- | --- | --- |
| **Francisco** | `Promocion` (US-13) + rendición de efectivo (US-19) + `ResumenDiarioPropietaria` (US-26) | Tres historias sobre piezas que ya conoce: `Plan`, `Cuota` y `Pago`. El resumen diario consolida justamente lo que expone su subsistema (transferencias, efectivo y cuotas vencidas) |
| **Nicolas** | `Suplencia` (US-24) + subsistema nuevo `reportes` con `DetectorInactividad` (US-22) + subsistema nuevo `gestion-notificaciones` con `Notificacion` y `PlanificadorNotificaciones` (US-25) + pendientes del Sprint 3 | Las suplencias y la inactividad salen de clases y asistencias, que son suyas. Arma la base de notificaciones que después usa Francisco para el resumen |
| **Rosario** | Subsistema nuevo `gestion-honorarios` con `TarifaHonorario` y `Liquidacion` (US-23) + `CalculadorHonorarios` + API de `ParametrosSistema` | La historia más pesada del sprint: un subsistema, tres tablas y el cálculo. Sigue en su terreno: el calculador es puro, como los del Sprint 3, y los parámetros son suyos |

Cómo trabajar en paralelo sin bloquearse:

1. [ ] **Día 1:** subir a `dev` los contratos, solo los tipos, para que cada uno programe contra la interfaz de los otros y la reemplace por un fake en los tests unitarios:
   - `gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.catalogo.ts` (Rosario): `INASISTENCIAS_CONSECUTIVAS_INACTIVO` (`ENTERO`, 3), `DIAS_AVISO_VENCIMIENTO` (`ENTERO`, 3) y `HORA_RESUMEN_DIARIO` (`TEXTO` con formato `HH:MM`, `20:00`). Los usan Nicolas y Francisco.
   - `calculos-del-negocio/calculador-honorarios/interface/i-calculo-honorarios.ts` (Rosario implementa y usa).
   - `IInfoClases.suplenciasEnPeriodo(desde, hasta)` (Nicolas implementa, usa Rosario): cada clase suplida con fecha, horario, suplente (`id_prof_dictante`) y ausente (`id_prof_ausente`).
   - `IInfoInscripciones.aCargoEnPeriodo(desde, hasta)` (Nicolas implementa, usa Rosario): las inscripciones que estuvieron `ACTIVA` en algún día del período, con profesora, plan, `sin_cargo`, alta y baja.
   - `IInfoCuotas.cobradoEnPeriodo(idsInscripcion, desde, hasta)` y `IInfoCuotas.paraAvisoDeVencimiento(fecha, diasPrevios)` (Francisco implementa; usan Rosario y Nicolas).
   - `gestion-notificaciones/notificacion/`: tipos y firma de `registrar` (Nicolas implementa, usa Francisco para el resumen diario).
   - `IInfoPlanes.promocionVigente(idPlan, fecha)` (Francisco implementa y usa en `Inscripcion` y `Cuota`).
   Si al implementar hace falta cambiar un contrato, se acuerda entre quien lo provee y quien lo usa, y se sube a `dev` antes que el resto.
2. **Regla dura 2:** cada uno agrega al `.puml` y a EA las dependencias que le faltan al diagrama (las marcadas arriba) en el primer commit de su parte, antes de codificarla.
3. **Migraciones:** todas las tablas nuevas apuntan a tablas que ya están en `dev`, así que nadie espera a nadie. Para que no choquen en el orden: Nicolas (`suplencias`, `notificaciones`) → Francisco (`promociones`, `promocion_planes` y la FK de `inscripciones.id_promocion`) → Rosario (`tarifas_honorario`, `liquidaciones`, `liquidacion_detalles`). Antes de generar una, traer `dev` a la rama propia; si dos se generan en paralelo, la segunda en integrarse se vuelve a generar sobre la primera.
4. **Rosario** puede arrancar el calculador ya: no toca la base y prueba con datos armados a mano. `Liquidacion` se integra cuando estén `suplenciasEnPeriodo` y `aCargoEnPeriodo`.
5. **Francisco** arranca por US-19 y US-13; el resumen diario (US-26) va al final, cuando `Notificacion` esté en `dev`.
6. Cada uno suma sus datos al escenario de demostración (`src/shared/db/datos-demo.ts`) y sus casos a `PRUEBAS-INTEGRACION.md` (desde PI-53). El front trabaja con Swagger y el seed, así que cada ruta nueva se documenta en su `<x>.openapi.ts` y se suma a `src/__tests__/openapi.test.ts`.
7. Las **diferencias** con las specs y el SDD están al final del archivo: se cierran entre los tres antes de escribir las migraciones.

---

## US-13 – Descuentos y promociones temporales

**Responsable:** Francisco

La promoción queda en la inscripción (`inscripciones.id_promocion`) y se aplica al calcular el monto de cada cuota. Nunca cambia lo ya cobrado: `cuotas.monto` guarda el monto del día del cobro.

### Pendiente (US-13)

- [ ] Modelos `promociones` y `promocion_planes` en Prisma + migración, con los CHECK del SQL de EA (`ck_promociones_tipo_descuento`, `ck_promociones_x1`, `ck_promociones_x2`, `ck_promociones_x3`), el único de `codigo` y la FK `FK_inscripciones_promociones` sobre la columna que ya existe.
- [ ] Componente `gestion-servicio-entrenamiento/promocion/`; las operaciones para la API se suman a `ILogicaServicioEntrenamiento`.
- [ ] Endpoints: `GET /api/v1/promociones` (filtros por estado y plan), `GET /api/v1/promociones/:id`, `POST`, `PATCH /:id` y `POST /:id/desactivar` (baja lógica con `activo = false`). Protegidos con `PLANES_VER` / `PLANES_EDITAR`.
- [ ] El estado (`ACTIVA`, `PROGRAMADA`, `VENCIDA`, `DESACTIVADA`) se calcula con las fechas y `activo`; no se guarda.
- [ ] `IInfoPlanes.promocionVigente(idPlan, fecha)` y el monto con descuento.
- [ ] `Inscripcion` guarda `id_promocion` al pre-inscribir si hay una promoción vigente para el plan (revisa Nicolas, dueño del componente).
- [ ] `Cuota` calcula el monto esperado con el descuento (US-15, US-16, US-17) y el comprobante muestra el precio de lista y el descuento.
- [ ] **Reglas**:
  - [ ] `PORCENTAJE` entre 0 y 100 (sin incluir el 0); `MONTO_FIJO` mayor a 0 y no mayor al precio vigente de ninguno de sus planes a `fecha_desde` → 400.
  - [ ] `fecha_hasta >= fecha_desde`; las dos obligatorias. Vigencia inclusiva en los dos extremos (fechas de Argentina).
  - [ ] Al menos un plan, vigente.
  - [ ] Una promoción vencida no se edita (409). Una desactivada deja de aplicar en el momento.
  - [ ] Dos promociones activas que se superponen en fechas sobre un mismo plan → 409 (ver decisiones).
  - [ ] El monto de la cuota nunca queda negativo (`ck_cuotas_x2`).
- [ ] Auditoría del alta, la edición y la desactivación (`shared/utils/auditoria.ts`): el DER no guarda quién lo hizo.
- [ ] Tests del service (bordes de fechas, porcentaje y monto fijo, superposición) y de integración: cobro dentro y fuera de la promoción, cuota ya cobrada que no cambia.

## US-19 – Control de efectivo pendiente de rendición

**Responsable:** Francisco

El cobro en efectivo ya nace con `rendido = false` si cobró una profesora, y `true` si cobró la propietaria (US-15). Falta listar y rendir.

### Pendiente (US-19)

- [ ] `GET /api/v1/pagos/efectivo-pendiente`: cobros `EFECTIVO`, `CONFIRMADO` y `rendido = false`, agrupados por profesora, con cantidad, total por profesora y total general. Cada cobro con alumno, monto, fecha, plan, período de la cuota y los días que lleva sin rendir. Filtros por profesora y rango de fechas. Incluye a las profesoras dadas de baja.
- [ ] `POST /api/v1/pagos/:id/rendir` y `POST /api/v1/pagos/rendir` (lote: los de una profesora, o una lista de ids): `rendido = true` y `fecha_rendicion`, en una transacción.
- [ ] `GET /api/v1/pagos/rendiciones`: historial de lo rendido, paginado, con los mismos filtros.
- [ ] Solo la propietaria: rol `PROPIETARIA` + `PAGOS_RENDICION_VER` (ya existe y es exclusivo).
- [ ] **Reglas**:
  - [ ] Un cobro ya rendido no se rinde de nuevo: 409, y en el lote se informan cuáles se saltearon.
  - [ ] Solo se rinden cobros en efectivo confirmados de una profesora.
  - [ ] Quién rindió y las observaciones van a la auditoría: el DER no tiene columnas para eso.
- [ ] `IInfoPagos.efectivoPendiente()` y `IInfoPagos.transferenciasPendientes()` para el resumen diario (US-26).
- [ ] Tests del service y de integración (total por profesora, rendir dos veces, cobro de la propietaria que no aparece).

## US-26 – Resumen diario para la propietaria

**Responsable:** Francisco

### Pendiente (US-26)

- [ ] Agregar al `.puml` y a EA que `ResumenDiarioPropietaria` requiere `IInfoParametros` (regla dura 2).
- [ ] Componente `gestion-notificaciones/resumen-diario-propietaria/` (`<<process>>`).
- [ ] `GET /api/v1/resumen-diario`: la vista consolidada del día, calculada al pedirla. Solo la propietaria.
  - [ ] Bloque 1, transferencias pendientes: cantidad, monto total y las que pasaron o están por pasar las 24 horas (`IInfoPagos`).
  - [ ] Bloque 2, efectivo sin rendir: cantidad, monto total, detalle por profesora y el más antiguo (`IInfoPagos`).
  - [ ] Bloque 3, cuotas vencidas: cantidad de alumnos, monto estimado (precio vigente de cada plan) y detalle por profesora y plan (`IInfoCuotas`, en una consulta por lote, sin N+1).
- [ ] Una vez al día, a partir de `HORA_RESUMEN_DIARIO`, el proceso registra una notificación `RESUMEN_DIARIO` para cada propietaria con el texto del resumen, o "Todo al día" si no hay pendientes.
- [ ] **Reglas**:
  - [ ] Un solo resumen por propietaria y por día: correr dos veces no lo duplica.
  - [ ] Si falla un bloque, el resumen sale igual con los otros y una nota; el error queda en el log.
  - [ ] Mismo enfoque de ejecución que el cierre de la asistencia (ver decisiones).
- [ ] Tests del service (los tres bloques, sin novedades, bloque que falla) y de integración.

## Lo que quedaba de US-10 (del Sprint 3)

**Responsable:** Francisco

- [x] Historial de cuotas y pagos en la ficha, solo para la propietaria, y filtro del listado por estado de cuota: integrados a `dev` (PI-51 y PI-52). El filtro calcula el estado para los alumnos que cumplen los otros filtros (hasta 500) y pagina en memoria (ver `patrones.md`).

---

## US-24 – Registro de suplencias entre profesoras

**Responsable:** Nicolas

El DER ya resuelve quién dicta: la suplente pasa a ser `clases.id_prof_dictante` y `suplencias` guarda a la titular ausente (`id_prof_ausente`). Así la suplente toma asistencia sin cambios en US-20, que ya habilita a la profesora dictante.

### Pendiente (US-24)

- [ ] Agregar al `.puml` y a EA que `Suplencia` requiere `IInfoProfesores` (regla dura 2).
- [ ] Modelo `suplencias` en Prisma + migración (PK `(id_clase, id_prof_ausente)`, FK a `clases`, `profesoras` y `usuarios`).
- [ ] Componente `gestion-inscripciones-y-clases/suplencia/`; las operaciones para la API se suman a `ILogicaInscripcionesYClases`.
- [ ] `POST /api/v1/suplencias` (`id_horario`, `fecha_clase`, `id_profesora_suplente`, `motivo` opcional): materializa la clase si todavía no existe (el único `(id_horario, fecha_clase)` evita duplicarla), registra a la titular como ausente y pone a la suplente como dictante, en una transacción.
- [ ] `GET /api/v1/suplencias`: filtros por rango de fechas, profesora (titular o suplente) y actividad.
- [ ] `PATCH /api/v1/suplencias/:idClase` (cambiar la suplente: la última vale) y `DELETE /api/v1/suplencias/:idClase` (devuelve la clase a la titular).
- [ ] Solo la propietaria (rol `PROPIETARIA` + `HONORARIOS_LIQUIDAR`, porque mueve plata entre profesoras).
- [ ] `IInfoClases.suplenciasEnPeriodo(desde, hasta)` para la liquidación (US-23).
- [ ] **Reglas**:
  - [ ] Titular y suplente distintas → si no, 400.
  - [ ] La suplente es una profesora activa (`IInfoProfesores`) → si no, 409. La titular puede estar dada de baja (suplencia retroactiva).
  - [ ] La fecha corresponde al día de la semana del horario → si no, 400.
  - [ ] Clase `CANCELADA` → 409. Clase ya suplida → 409 con la suplencia existente (se cambia con `PATCH`).
  - [ ] Fecha futura: se permite, con una advertencia en la respuesta.
  - [ ] No se modifica ni se borra una suplencia de un período con liquidación `CERRADA` o `PAGADA` (ver decisiones).
- [ ] Tests del service y de integración (registro, suplente que toma asistencia, borrar y volver a la titular).

## US-22 – Detección de alumnos inactivos con cuota al día

**Responsable:** Nicolas

Es el primer componente de `Reportes`, la capa no persistente: no tiene tablas, calcula al consultar.

### Pendiente (US-22)

- [ ] Agregar al `.puml` y a EA que `DetectorInactividad` requiere `IInfoInscripciones`, `IInfoCuotas` e `IInfoAlumnos` (regla dura 2).
- [ ] Subsistema `src/modules/reportes/` con `ILogicaInformes`, su fachada y el componente `detector-inactividad/`. Montarlo en `app.ts`, `openapi.ts` y `composicion.ts`.
- [ ] `GET /api/v1/informes/alumnos-inactivos`: alumno, teléfono y email (o los del tutor si es menor), profesora, plan, inasistencias consecutivas y fecha de la última asistencia. Filtros por profesora, plan y mínimo de inasistencias. Solo la propietaria (`REPORTES_COBRANZA_VER`, ver decisiones).
- [ ] `IInfoAsistencia.ultimasDeInscripciones(idsInscripcion, cantidad)`: las últimas N asistencias registradas de cada inscripción en una sola consulta (sin N+1).
- [ ] **Reglas**:
  - [ ] Inactivo = las últimas `INASISTENCIAS_CONSECUTIVAS_INACTIVO` asistencias registradas son ausentes. Una asistencia corta la racha.
  - [ ] Solo inscripciones `ACTIVA` con cuota al día (`IInfoCuotas`, en lote): los vencidos y los `PENDIENTE_DE_PAGO` no aparecen.
  - [ ] Clase suelta y alumnos sin historial suficiente → no aplica. Dados de baja → no aparecen.
  - [ ] Se cuentan solo clases cerradas: una clase abierta todavía puede cambiar.
  - [ ] Cada fila trae su estado de gestión (`PENDIENTE` si no tiene una marca vigente). Los `IGNORADO` no aparecen, salvo con un filtro explícito.
- [ ] Seguimiento de la gestión (ver decisiones): agregar `seguimientos_inactividad` a `der.puml`, al `.sql` y a EA (regla dura 2); modelo en Prisma + migración; `IInfoAsistencia` lee y guarda la marca.
- [ ] `PUT /api/v1/informes/alumnos-inactivos/:idInscripcion/seguimiento` (`estado`) y `DELETE` para quitar la marca. Solo la propietaria, con el mismo permiso del listado.
- [ ] Tests parametrizados de la racha (consecutivas, cortadas por una asistencia, menos clases que el umbral), de la marca que vence al volver a asistir y de integración.

## US-25 – Aviso automático de vencimiento de cuota

**Responsable:** Nicolas

### Pendiente (US-25)

- [ ] Agregar al `.puml` y a EA que `PlanificadorNotificaciones` requiere `IInfoCuotas`, y al DER el único `(id_usuario, id_cuota, tipo)` (regla dura 2). Corregir la sección de notificaciones de `.claude/rules/arquitectura.md` (ver decisiones).
- [ ] Modelo `notificaciones` en Prisma + migración (`ck_notificaciones_tipo`, `ck_notificaciones_estado_envio` y el único nuevo).
- [ ] Subsistema `src/modules/gestion-notificaciones/` con `ILogicaNotificaciones`, su fachada y los componentes `notificacion/` y `planificador-notificaciones/`. Montarlo en `app.ts`, `openapi.ts` y `composicion.ts`.
- [ ] `Notificacion.registrar(...)`: la usan el planificador y el resumen diario (Francisco). Subirla a `dev` antes que el planificador.
- [ ] `GET /api/v1/notificaciones/mias` (paginado, no leídas primero), `POST /api/v1/notificaciones/:id/leida` y `POST /api/v1/notificaciones/leidas` (todas). Cada uno ve solo las suyas (404 si no es el destinatario).
- [ ] El planificador genera `CUOTA_POR_VENCER` al entrar en los `DIAS_AVISO_VENCIMIENTO` previos y `CUOTA_VENCIDA` al vencer, con el `id_cuota`.
- [ ] **Reglas**:
  - [ ] Un aviso de cada tipo por cuota: correr dos veces no lo duplica (lo garantiza el único de la base, no el código).
  - [ ] Al día sin vencimiento cercano, dado de baja, o con una transferencia pendiente → sin aviso.
  - [ ] Si renovó (hay una cuota posterior paga), no se avisa más por la anterior.
  - [ ] Menor de edad → el aviso va al tutor (`IInfoUsuarios`).
  - [ ] Días de gracia 0 → el aviso de vencida sale el mismo día del vencimiento.
- [ ] Mismo enfoque de ejecución que el cierre de la asistencia (ver decisiones).
- [ ] Tests del service (rango de días, menor, pendiente, renovación, idempotencia) y de integración.

## Pendientes del Sprint 3

**Responsable:** Nicolas

- [ ] Reflejar en el `.eap` las dependencias de `Clase` y `CierreAsistencia` y regenerar el `.jpg` y el `.pdf`.
- [ ] Cerrar los puntos abiertos de la sección 9 de `PRUEBAS-INTEGRACION.md`.
- [ ] Verificar que el bloqueo de la baja de actividad se limite a horarios con inscriptos (US-03) y tildarlo en `SPRINT-3.md`: según `SPRINT-2.md` ya quedó así.

---

## US-23 – Informe mensual de honorarios

**Responsable:** Rosario

`CalculadorHonorarios` es puro, como los del Sprint 3: recibe inscripciones, tarifas y suplencias, y devuelve los detalles. `Liquidacion` junta los datos, llama al calculador y guarda el resultado. Una liquidación `CERRADA` es una foto: `liquidacion_detalles` no se recalcula.

### Pendiente (US-23)

- [ ] Modelos `tarifas_honorario`, `liquidaciones` y `liquidacion_detalles` en Prisma + migración, con los CHECK del SQL de EA (`ck_tarifas_honorario_*`, `ck_liquidaciones_estado`, `ck_liquidaciones_x1`, `ck_liquidacion_detalles_*`).
- [ ] Subsistema `src/modules/gestion-honorarios/` con `ILogicaHonorarios`, su fachada y los componentes `tarifa-honorario/` y `liquidacion/`. Montarlo en `app.ts`, `openapi.ts` y `composicion.ts`.
- [ ] `CalculadorHonorarios` implementa `ICalculoHonorarios` en `calculos-del-negocio/calculador-honorarios/`.
- [ ] **Tarifas** (`TarifaHonorario`):
  - [ ] `GET /api/v1/tarifas-honorario` (filtro por profesora), `POST` y `POST /:id/cerrar` (cierra la vigencia, como `plan_precios`).
  - [ ] Conceptos `ALUMNO_A_CARGO` (por plan o para todos) y `HORA_SUPLENCIA` (sin plan); `MONTO_FIJO` o `PORCENTAJE` (de lo cobrado de la cuota).
  - [ ] Una tarifa nueva cierra la vigente del mismo concepto, profesora y plan; sin superposiciones.
- [ ] **Liquidaciones** (`Liquidacion`):
  - [ ] `POST /api/v1/liquidaciones` (`periodo` `AAAA-MM`): genera o recalcula el `BORRADOR` de cada profesora para el mes.
  - [ ] `GET /api/v1/liquidaciones?periodo=` (total general y una fila por profesora) y `GET /api/v1/liquidaciones/:id` (detalle por alumno y por clase suplida).
  - [ ] `POST /api/v1/liquidaciones/:id/cerrar` (`BORRADOR → CERRADA`) y `POST /api/v1/liquidaciones/:id/pagar` (`CERRADA → PAGADA`). Una cerrada no se recalcula.
  - [ ] Rol `PROPIETARIA` + `HONORARIOS_VER_TODOS` para ver, `HONORARIOS_LIQUIDAR` para generar, cerrar y pagar.
- [ ] **Reglas del cálculo**:
  - [ ] Se cobra por inscripto, asista o no: una línea `ALUMNO_A_CARGO` por inscripción que estuvo `ACTIVA` algún día del mes (incluye a los dados de baja en el mes y a los de clase suelta).
  - [ ] Las inscripciones `sin_cargo` y las `PREINSCRIPTA` no generan honorarios.
  - [ ] Cada clase suplida suma `CLASE_SUPLIDA` a la suplente y resta `DESCUENTO_AUSENCIA` (monto negativo) a la titular, por la tarifa `HORA_SUPLENCIA` de la suplente.
  - [ ] La tarifa que aplica es la vigente a la fecha de cada línea; sin tarifa → la línea no se genera y la respuesta la informa como advertencia.
  - [ ] Profesora sin alumnos ni suplencias → honorario 0. `monto_total` es la suma de sus detalles.
- [ ] `ParametrosSistema` (pendiente del Sprint 3): `GET /api/v1/parametros`, `PATCH /api/v1/parametros/:clave` (rol `PROPIETARIA` + `PARAMETROS_EDITAR`, permiso nuevo exclusivo), validación por `tipo_dato` y por rango (no negativos; `HORA_RESUMEN_DIARIO` con formato `HH:MM`) y `GET /api/v1/parametros/datos-bancarios` para alumnos y tutores.
- [ ] Tests parametrizados del calculador (alta y baja en el medio del mes, porcentaje, suplencias, sin tarifa), del service (estados de la liquidación) y de integración.

---

## Diferencias con las specs y el SDD

**Responsables:** los tres. Las decididas están tildadas; las demás llevan una propuesta para discutir antes de escribir las migraciones. Criterio usado: el DER se cambia solo cuando la spec lo exige en sus criterios de aceptación.

- [ ] **Cuándo aplica la promoción (US-13).** La spec dice que aplica a "nuevas inscripciones" y que fuera de su vigencia "el precio vuelve al valor normal". El DER la guarda en la inscripción. **Propuesta:** la inscripción guarda la promoción vigente al pre-inscribirse, y cada cuota aplica el descuento si la fecha del cobro cae dentro de la vigencia y la promoción sigue activa. Cumple las dos frases de la spec.
- [ ] **Promociones superpuestas (US-13).** La spec deja elegir entre "la más reciente" y no permitirlas. **Propuesta:** no permitirlas (409): es explícito y no deja a la propietaria adivinando qué descuento se aplicó.
- [ ] **Descripción y condiciones de la promoción (US-13).** La spec las pide; el DER no tiene columnas, pero sí exige un `codigo` único que la spec no menciona. **Propuesta:** manda el DER; el `codigo` lo carga la propietaria y las condiciones quedan fuera del MVP.
- [ ] **Quién rindió y observaciones (US-19).** El DER solo tiene `rendido` y `fecha_rendicion`. **Propuesta:** van a la auditoría, como el cambio de precio de US-12.
- [x] **Estado de gestión de los inactivos (US-22).** La spec pide marcar `contactado`, `gestionado` o `ignorado` y lo exige en un criterio de aceptación; el DER no tiene dónde guardarlo. **Decidido** (12/10/2026): se agrega al DER la tabla `seguimientos_inactividad` (`id_inscripcion` PK y FK, `estado` `CONTACTADO|GESTIONADO|IGNORADO`, `fecha_registro`, `id_usuario_registra`), una marca por inscripción que se pisa al volver a marcar. La marca vence sola: si el alumno asiste después de `fecha_registro`, deja de valer y una racha nueva aparece como pendiente. La tabla es del componente `Asistencia` y la expone `IInfoAsistencia`, que `DetectorInactividad` ya requiere: `Reportes` es no persistente y no puede tener tablas, y así la vista arquitectónica no cambia, solo el DER.
- [ ] **Permiso del listado de inactivos (US-22).** **Propuesta:** `REPORTES_COBRANZA_VER`, que ya es exclusivo de la propietaria, en lugar de sumar un permiso nuevo.
- [ ] **"Cuota al día" (US-22).** **Propuesta:** `AL_DIA` y `POR_VENCER` (en la gracia todavía puede asistir); `VENCIDA` y `PENDIENTE_DE_PAGO` no.
- [ ] **Canales de los avisos (US-25, US-26).** El SDD propone email con `nodemailer` y WhatsApp; el DER no tiene columna de canal y `.claude/rules/arquitectura.md` ya fija que los avisos son in-app, sin envío ni reintentos. **Propuesta:** respetar la regla. La notificación se crea con `estado_envio = ENVIADA` y `fecha_envio = fecha_generacion`, porque no hay envío que pueda fallar. Sumar email o WhatsApp es un cambio de diseño: se decide, se actualiza el DER y recién después se implementa.
- [ ] **Un aviso por cuota (US-25).** `arquitectura.md` pide resolver la idempotencia con un único `(id_usuario, id_cuota, tipo)` en la base, pero el DER actual no lo tiene. **Propuesta:** agregarlo al DER y a EA antes de la migración e insertar ignorando el conflicto. El resumen diario no tiene `id_cuota`, así que su "uno por día" se controla dentro del mismo bloqueo en que se inserta (`seguridad.md`, regla 7).
- [ ] **`arquitectura.md` desactualizada.** La sección "Generación de notificaciones" habla de `notificaciones_internas`, `fecha_lectura` y `GestionNotificacionesEInsignias`; el DER y la vista dicen `notificaciones` (sin `fecha_lectura`, con `estado_envio`) y `GestionNotificaciones`. **Propuesta:** Nicolas la corrige en el primer commit de US-25.
- [ ] **Ejecución de los procesos (US-25, US-26).** El SDD propone `node-cron`. En Render el servidor se duerme sin tráfico, igual que con el cierre de la asistencia. **Propuesta:** el mismo enfoque de US-21: un intervalo dentro del proceso mientras está despierto, y además se generan al consultar (`/notificaciones/mias`, `/resumen-diario`). Si hace falta puntualidad, un Cron Job de Render que llame a un endpoint interno protegido.
- [ ] **Exportar el informe de honorarios (US-23).** El SDD propone `pdfkit` y `xlsx`. **Propuesta:** como el comprobante de US-15, el back devuelve los datos y el front arma el PDF o el CSV. Evita dos librerías en el back.
- [ ] **Profesora que ve sus honorarios (US-23).** La spec dice que la profesora no accede al informe, pero el catálogo ya le da `HONORARIOS_VER_PROPIOS`. **Propuesta:** el informe consolidado es solo de la propietaria; la profesora ve únicamente sus liquidaciones `CERRADA` o `PAGADA`, sin el detalle de las otras.
- [x] **Ajuste manual del honorario (US-23).** El DER no tiene un concepto para eso (`ALUMNO_A_CARGO`, `CLASE_SUPLIDA`, `DESCUENTO_AUSENCIA`) y no está en los criterios de aceptación. **Decidido** (12/10/2026): fuera del MVP, sin cambiar el DER. Sumarlo pedía un concepto nuevo, cambiar `ck_liquidacion_detalles_x2` y una columna para el motivo. Mientras la liquidación está en `BORRADOR` se corrige la tarifa o la suplencia y se recalcula.
- [ ] **Alumno que cambia de profesora en el mes (US-23).** **Propuesta:** como cambiar de plan o de profesora genera otra inscripción, cada inscripción se liquida a su profesora; si las dos estuvieron activas en el mes, el alumno cuenta para las dos. Más simple que "donde estuvo más tiempo" y queda trazado en el detalle.
- [ ] **Suplencia en un período liquidado (US-24).** `Suplencia` no puede consultar a `Liquidacion` sin un ciclo entre subsistemas (`GestionHonorarios` ya requiere `IInfoClases`). **Propuesta:** como la liquidación cerrada es una foto, editar una suplencia después no la cambia; la regla se controla en la fachada de `GestionHonorarios`, o se agrega al diagrama una interfaz `IInfoLiquidaciones` que requiera `Suplencia`. Hay que elegir una antes de codificar.
- [x] **Baja de una suplencia (US-24).** La spec habla de estado `activa` / `cancelada`; el DER no tiene la columna y no está en los criterios de aceptación. **Decidido** (12/10/2026): sin cambiar el DER. Borrado físico de la fila con auditoría, y la clase vuelve a la titular. Una suplencia cancelada no la usa nadie: los honorarios solo miran las vigentes.
