# Arquitectura y diagramas

## Regla central

**El código sigue al diagrama, no al revés.** Si hace falta apartarse de lo diagramado, primero se actualiza el diagrama y se commitea con `docs(...)`; recién después se escribe el código. Un diagrama que no describe el sistema real no sirve para nada, y en este proyecto los diagramas son parte de la entrega.

## Los diagramas

Viven en `docs/diagrams/`.

### `vista_arquitectonica.puml`

Define las capas, los componentes y los nombres de las interfaces. Es la fuente de los nombres del código:

- Cada subsistema del diagrama es una carpeta en `src/modules/`: `GestionUsuarios` es `gestion-usuarios`.
- Cada componente es una subcarpeta: `Usuario` es `usuario/`, `Sesion` es `sesion/`, `Rol` es `rol/`. El nombre lo pone el diagrama, aunque el componente maneje también los permisos.
- Cada interfaz del diagrama tiene su archivo, en la carpeta de quien la provee:
  - Las que provee un componente van en el componente: `IAutorizacion` (provista por `Rol`) es `rol/interface/i-autorizacion.ts`.
  - Las `ILogica*` las provee el subsistema entero, no un componente: van en la raíz del subsistema. `ILogicaUsuarios` es `gestion-usuarios/interface/i-logica-usuarios.ts` y la realiza `gestion-usuarios/gestion-usuarios.service.ts`, que pasa cada operación al componente dueño. En ese mismo archivo se divide en una parte por componente (`ILogicaSesion`, `ILogicaCuentasDeUsuario`, `ILogicaMatrizPermisos`) y la `ILogica*` es su unión; ver `interfaces.md`.
- Cada subsistema tiene en su raíz un `<subsistema>.routes.ts` y un `<subsistema>.openapi.ts` que montan los de sus componentes. `app.ts` y `openapi.ts` tienen una línea por subsistema.

Antes de crear un módulo, buscar su nombre en el diagrama. No inventar nombres.

### `der.puml`

Define entidades, atributos, tipos y enumerados. `prisma/schema.prisma` tiene que reflejarlo: si el DER dice que `inscripciones.estado` es `PREINSCRIPTA|ACTIVA|BAJA`, el enum de Prisma es exactamente esos tres valores, con esos nombres.

Cuando el DER y el esquema difieren, gana el DER; si el DER está equivocado, se corrige el DER primero.

### Máquinas de estados

Todavía no existen. Cuando se implementen los ciclos de vida descritos en `patrones.md` (inscripción, pago, clase), se diagraman **antes** de codificarlos y se guardan en `docs/diagrams/`.

## Las cuatro capas

El diagrama organiza el sistema en cuatro capas. Sirve como mapa para ubicar código nuevo:

1. **Capa de presentación web.** El frontend (`front/`). Consume las interfaces `ILogica*` a través de la API, y solo esas: cada controller recibe la parte de la `ILogica*` de su componente, nunca `IAutenticacion` ni `IAutorizacion`. Esas dos las usan los guardias, que `app.ts` junta una sola vez en un `ControlDeAcceso`, y los otros subsistemas. No es parte de este paquete.

2. **Capa de lógica de negocio persistente.** Los subsistemas de `src/modules/`: gestión de usuarios, servicio de entrenamiento, personas, inscripciones y clases, honorarios, cuotas y pagos, rutinas y progreso, notificaciones e insignias. Cada uno expone sus interfaces `ILogica*` y consume `IAutenticacion` e `IAutorizacion`. Acá vive la lógica que necesita leer o escribir en la base.

3. **Capa de lógica de negocio no persistente.** Los cálculos puros: `ICalculoVencimiento`, `ICalculoHonorarios`. No tocan la base, reciben datos y devuelven resultados. Cuando se implementen, van en un módulo propio y se testean sin mocks de persistencia. El componente `Rol` también es no persistente en su decisión de permisos, aunque hoy lea roles.

4. **Capa de administración de datos.** `PrismaClient` (lo crea `index.ts` con las opciones de `shared/db/client.ts`) y PostgreSQL. Ver `persistencia.md`.

## Dónde va cada cosa

| Si estás escribiendo | Va en |
| --- | --- |
| Reglas de negocio de un módulo | `modules/<subsistema>/<componente>/<x>.service.ts` |
| Consultas a la base | `modules/.../<x>.repository.ts` |
| Traducción HTTP (leer `req`, armar `res`) | `<x>.controller.ts` |
| Definición de rutas y middlewares | `<x>.routes.ts` |
| Montaje de los routers de un subsistema | `<subsistema>.routes.ts` |
| Validación de entrada | `<x>.schemas.ts` con Zod |
| Un cálculo puro, sin base | Módulo de cálculos (capa 3) |
| Algo que usan varios módulos | `shared/` |

Si algo no encaja en ninguna fila, es señal de que el diagrama no lo previó: revisarlo antes de escribir.

## Generación de notificaciones

Hay una distinción que conviene tener clara antes de tocar este subsistema, porque se confunden dos cosas bajo la misma palabra:

- **La habilitación del alumno** (si está al día, por vencer o vencida) es cálculo puro, se resuelve al consultarla con `ICalculoVencimiento`. No necesita fila en la base ni proceso programado. **No persistir este valor**: si se guarda en una columna quedan dos fuentes de verdad y la de la base siempre va a estar atrasada.
- **El aviso** es la fila en `notificaciones`, que la persona ve y se marca leída. Eso sí necesita alguien que lo dispare.

Para el aviso, `vista_arquitectonica.puml` define el componente **`PlanificadorNotificaciones`** dentro de `GestionNotificaciones`. No responde a una petición web: lo dispara una planificación temporal, consulta `IInfoCuotas` y genera los avisos `CUOTA_POR_VENCER` y `CUOTA_VENCIDA`, que guarda con `IRegistroNotificaciones` (provista por `Notificacion`). Está marcado con el estereotipo `<<process>>` y color propio, igual que `ResumenDiarioPropietaria` y `CierreAsistencia`, justamente para que no se lo confunda con un componente alcanzable desde la API.

Al implementarlo:

- **Los avisos son in-app.** No hay correo ni mensajería: se muestran cuando la persona entra a la aplicación. Por eso la notificación existe desde que se genera y no hay envío que pueda fallar: nace con `estado_envio = ENVIADA` y `fecha_envio = fecha_generacion`, y el único estado posterior es si fue leída (`leida`). El DER conserva `PENDIENTE` y `ERROR` para un canal externo futuro; no agregar lógica de reintento: hoy no hay a qué reintentarle.
- **La idempotencia se resuelve en la base, no en el código.** El DER define un único compuesto `(id_usuario, id_cuota, tipo)` en `notificaciones` (marcado `UK(1)`). Insertar ignorando el conflicto hace que volver a ejecutar el proceso sea inofensivo, y cubre también el caso de que algún día corran dos instancias. Es lo que evita toda la lógica defensiva de "¿ya avisé?". El resumen diario no tiene cuota (`id_cuota` NULL, y en Postgres dos NULL no chocan en un único), así que su "uno por día" se controla dentro del bloqueo en que se inserta (`seguridad.md`, regla 7).
- **Frecuencia diaria.** Los vencimientos tienen granularidad de día. No hace falta cola con broker: la infraestructura del proyecto es un solo Postgres y un solo proceso. Como en Render el proceso se duerme sin tráfico, se usa el mismo enfoque que el cierre de la asistencia (US-21): un intervalo mientras el proceso está despierto, y además el planificador corre al consultar las notificaciones propias. Corre a lo sumo una vez por día y por proceso; si hace falta puntualidad, un Cron Job de Render que llame a un endpoint interno protegido.
- **`BIENVENIDA` y `CLASE_CANCELADA` no pasan por el planificador.** Ahí sí hay un evento concreto, así que el service que da de alta al alumno o cancela la clase crea la fila directamente. Por eso `notificaciones.id_cuota` es opcional (`FK*` en el DER).

Si en el futuro se suma un canal externo (correo, mensajería), ahí sí vuelve a hacer falta separar generar de enviar, con estado y reintento. Es un cambio de diseño: se decide, se actualiza el DER y recién después se implementa.
