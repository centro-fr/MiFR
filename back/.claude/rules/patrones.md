# Patrones de diseño

Esta lista salió de analizar `der.puml`, `vista_arquitectonica.puml` y los documentos de `docs/`. Solo figuran los casos que tienen evidencia real en el dominio. Cada uno indica dónde está esa evidencia.

**Regla que gobierna todo lo demás:** no se introduce un patrón sin un caso concreto que lo justifique. Dos variantes de una fórmula de una línea no ameritan Strategy; un enum sin comportamiento asociado no amerita State. Un `if` claro le gana a una jerarquía de clases que nadie va a necesitar.

## Ya implementado

### Adapter — integración con Google

`sesion/google-autenticacion.ts`. `GoogleAutenticacion` envuelve `OAuth2Client` de `google-auth-library` y traduce su payload (`sub`, `given_name`, `family_name`) al tipo de dominio `DatosGoogle`. `SesionService` depende de `IAutenticacionGoogleAuth`, no de la librería.

Es el modelo a seguir para cualquier integración externa futura (pasarela de pagos, envío de notificaciones): la librería se envuelve, el dominio no se entera.

### Facade — la interfaz `ILogica*` de cada subsistema

`gestion-usuarios/gestion-usuarios.service.ts`. En `vista_arquitectonica.puml` la interfaz `ILogicaUsuarios` la provee el subsistema `GestionUsuarios`, no uno de sus componentes, y es lo único que usa la capa de presentación. `GestionUsuariosService` la implementa pasando cada operación al componente dueño (`Sesion`, `Usuario` o `Rol`), sin reglas propias.

Es el modelo para los otros subsistemas: cada `ILogica*` se realiza con un service en la raíz del subsistema, y cada controller depende de la parte de esa interfaz que le toca a su componente (ver `interfaces.md`).

**Única excepción a "sin reglas propias":** una regla que cruza dos componentes que el diagrama no conecta entre sí. Va en la fachada, porque el subsistema es el único que ve a los dos, y nunca en uno de los componentes, porque eso agregaría una dependencia que el diagrama no tiene. Los casos actuales:

- `GestionServicioEntrenamientoService.darDeBajaActividad` cuenta con `IInfoInscripciones` los alumnos de los horarios de la actividad: si alguno tiene inscriptos responde 409; si no, da de baja los horarios y después la actividad (US-03). `Actividad` no depende de `Horario`, y además `Horario` ya depende de `IInfoActividades`, así que la dependencia inversa armaría un ciclo.
- `GestionPersonasService.darDeBajaProfesora` consulta `IInfoHorarios`, que en el diagrama requiere el subsistema `GestionPersonas` y no el componente `Profesor`.
- `GestionServicioEntrenamientoService.darDeBajaHorario` consulta `IInfoInscripciones` y no da de baja un horario con alumnos inscriptos (US-04). `Horario` no conoce a `Inscripcion`, que además depende de `IInfoHorarios`.
- `GestionPersonasService` resuelve con `IInfoInscripciones` los filtros por plan, profesora y actividad, el plan de cada fila y qué alumnos tiene a cargo una profesora (US-09, US-10), y con `IInfoCuotas` la situación de cuota de cada inscripción (US-10, US-18). `Alumno` no conoce a `Inscripcion`, que depende de `IInfoAlumnos`, ni a `Cuota`. La fachada recibe quién hace el pedido (`Solicitante`) desde el controller.
- `GestionInscripcionesYClasesService.reactivarAlumno` consulta `IInfoCuotas.tuvoPagoConfirmado`: quien nunca pagó vuelve con la inscripción `PREINSCRIPTA` (US-07, US-08). `Inscripcion` no conoce los pagos, y `Cuota` ya depende de `IInfoInscripciones`.
- `GestionInscripcionesYClasesService` suma a la lista de asistencia la situación de cuota de cada inscripto (`IInfoCuotas`, US-20) y a las clases del día sus inscriptos (`IInfoInscripciones`). `Asistencia` y `Clase` no conocen a `Cuota`, y `Clase` no conoce a `Inscripcion`.

La regla se limita a coordinar: consulta un componente y, según el resultado, llama al otro o lanza el error. Si empieza a acumular lógica propia, es señal de que falta un componente en el diagrama.

## A aplicar cuando se implemente el módulo

### Strategy — vencimiento de cuota según tipo de plan

Dos algoritmos incompatibles conviven:

- Plan **MENSUAL**: vence a los treinta días de la fecha de pago, de fecha a fecha, con `dias_gracia` configurables.
- Plan **CLASE_SUELTA**: vence al terminar la clase del día contratado, sin días de gracia.

El diagrama ya le puso nombre a la interfaz: `ICalculoVencimiento`, implementada por `CalculadorVencimientoCuota` en la capa de cálculos. El discriminador es `planes.tipo` en el DER.

Es el caso mejor fundado del proyecto.

### Strategy — cálculo de honorarios por concepto

El monto a liquidar a una profesora se compone de conceptos con fórmulas distintas: `ALUMNO_A_CARGO` (por inscripto, asista o no), `CLASE_SUPLIDA` (se liquida a quien dictó) y `DESCUENTO_AUSENCIA` (se resta a la ausente). Está en el DER como `liquidacion_detalles.concepto`.

La interfaz también está nombrada en el diagrama: `ICalculoHonorarios`, implementada por `CalculadorHonorarios`.

### State — ciclo de vida de la inscripción

`PREINSCRIPTA → ACTIVA → BAJA`, en `inscripciones.estado`.

Es el único ciclo del dominio que reúne las tres condiciones que justifican State:

1. Estados con nombre propio.
2. Transición disparada por un evento con guarda: la inscripción pasa a ACTIVA cuando se confirma el primer pago.
3. Comportamiento que cambia según el estado: una inscripción PREINSCRIPTA no habilita a asistir, no genera cuotas ni cuenta para honorarios.

La baja es lógica y conserva el historial, con `motivo_baja` clasificando la salida.

### State, casos menores

`pagos.estado` (`PENDIENTE → CONFIRMADO | RECHAZADO`, con ventana de 24 horas y solo la propietaria confirma) y `clases.estado` (`PROGRAMADA → DICTADA | CANCELADA`).

Son ciclos chicos: tres estados y dos transiciones cada uno. Vale evaluarlos cuando se implementen, pero si el comportamiento asociado es poco, un `switch` bien ubicado en el service es preferible a una jerarquía de clases de estado.

## La cuota no tiene estado

Vale la aclaración porque induce a error: la entidad `cuotas` del DER **no tiene campo `estado`**. Solo guarda `fecha_generacion`, `fecha_vencimiento` y `monto`.

Lo que parece un ciclo `PENDIENTE → VENCIDA → PAGADA` es en realidad un valor **derivado por cálculo** en el momento de consultarlo, y el cálculo depende del tipo de plan. O sea: ese caso es Strategy, no State. No agregar un campo `estado` a `cuotas` para "arreglarlo".

## Qué no usar

No hay caso identificado para Template Method, Decorator, Composite, Builder, Command, Chain of Responsibility, Visitor, Observer, Proxy ni Bridge. No introducirlos sin uno.

Sobre Observer en particular, que es el que más se tienta al ver "notificaciones": **no aplica**, y conviene entender por qué antes de proponerlo.

Observer necesita un sujeto que avise en el momento en que su estado cambia. Dos de los cuatro tipos de notificación no tienen ese momento: `CUOTA_POR_VENCER` y `CUOTA_VENCIDA` no ocurren porque alguien haga algo, ocurren porque pasa el tiempo. No existe la línea de código donde emitir el evento. Se refuerza con lo que ya dice la sección anterior: la cuota no tiene estado persistido, se deriva por cálculo, así que tampoco hay transición que observar. La única implementación posible para esos dos casos es una consulta periódica, que es lo que el diagrama modela: `GestionNotificacionesEInsignias` requiere `IInfoCuotas` e `IInfoAsistencia`, provistas por `Cuota` y `Asistencia`.

Hay un segundo motivo, más importante todavía. El Observer del catálogo GoF es en memoria, síncrono y dentro del mismo proceso: el aviso llega a quien esté escuchando en ese instante y después no queda nada. Las `notificaciones_internas` del DER son entidades persistidas, con `leida` y `fecha_lectura`, que la persona ve cuando entra a la aplicación, no cuando el hecho ocurre. Implementar eso como Observer da un sistema donde el aviso se pierde si nadie estaba escuchando, y desaparece con cada reinicio del servidor.

`BIENVENIDA` y `CLASE_CANCELADA` sí son eventos genuinos. Pero para dos casos alcanza con que el service correspondiente llame al de notificaciones después de completar su operación. No hace falta un patrón ni una infraestructura de eventos para eso.

El esquema del diagrama tiene además la ventaja de dejar la dependencia en la dirección correcta: `GestionCuotasYPagos` no necesita enterarse de que las notificaciones existen. El módulo accesorio depende del central, no al revés.

Lo que sí queda por resolver, y es más importante que la discusión del patrón, es **quién ejecuta esa consulta periódica y cada cuánto**. Está anotado como decisión pendiente en `arquitectura.md`.

## Cosas que están en el código y no son patrones GoF

Conviene nombrarlas bien, sobre todo al documentar o defender el trabajo:

- **Repository** (`usuario.repository.ts`) es un patrón de Fowler, del catálogo de arquitectura de aplicaciones empresariales. No está en el catálogo GoF.
- **La inyección de dependencias por constructor** es la aplicación del principio de inversión de dependencias, no un patrón de diseño.
- **`createApp`, `createGestionUsuariosRoutes`, `createUsuarioRoutes`, `createUsuarioController`, `crearControlDeAcceso`** son *factory functions* en el sentido idiomático de JavaScript. No son Factory Method: no hay jerarquía de productos ni subclases que decidan qué instanciar.
- **`AppError` y sus subclases** son herencia simple para tipar errores HTTP.
- **La instancia única de `PrismaClient`** no es el patrón Singleton: nada impide crear otra. Es una sola porque la crea una sola vez el composition root (`index.ts`) y la reparte por constructor.
