# Interfaces

## Convención

- Van en `interface/`, dentro de la carpeta de quien la provee según el diagrama: el componente (`rol/interface/i-autorizacion.ts`) o, para las `ILogica*`, el subsistema (`gestion-usuarios/interface/i-logica-usuarios.ts`).
- El archivo se llama `i-nombre-en-kebab.ts`; el tipo exportado es `IPascalCase`.
- Lleva arriba un comentario corto que la vincula al componente del diagrama de arquitectura y aclara qué queda afuera.

## Las `ILogica*` se dividen por componente

La `ILogica*` del subsistema es la unión de una parte por componente, todas en el mismo archivo:

```ts
export interface ILogicaSesion {
  iniciarSesion(idToken: string): Promise<SesionIniciada>;
  // ...
}

export interface ILogicaCuentasDeUsuario {
  crearUsuario(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  // ...
}

// Interfaz del subsistema GestionUsuarios en la vista arquitectónica: es lo único que ve la
// capa de presentación (UsuarioPresWeb). IAutenticacion e IAutorizacion quedan para los otros
// subsistemas.
export interface ILogicaUsuarios extends ILogicaSesion, ILogicaCuentasDeUsuario, ILogicaMatrizPermisos {}
```

- El controller y el router de cada componente dependen de su parte (`createPlanController(logica: ILogicaPlanes)`), no de la `ILogica*` entera: así declaran solo lo que usan.
- Las partes no son interfaces nuevas del diagrama, que nombra una sola por subsistema. Por eso viven en el archivo de la `ILogica*` y no en `interface/` del componente.
- Los métodos llevan el nombre del recurso (`crearUsuario`, `listarPlanes`), porque la fachada reúne varios componentes y `crear` a secas no dice sobre qué opera. El service del componente sí usa `crear`, `listar`: adentro no hay ambigüedad.

Las que existen hoy: `ILogicaUsuarios`, `ILogicaPersonas`, `ILogicaServicioEntrenamiento`, `ILogicaInscripcionesYClases`, `IAutenticacion`, `IAutenticacionGoogleAuth`, `IAutorizacion`, `IInfoUsuarios`, `IInfoProfesores`, `IInfoAlumnos`, `IInfoActividades`, `IInfoHorarios`, `IInfoPlanes` e `IInfoInscripciones`. Del Sprint 3: `ICalculoVencimiento` e `ICalculoHabilitacion`, que realizan los calculadores de `calculos-del-negocio`, e `IInfoCuotas`. `IInfoParametros` ya está implementada (`ParametrosSistemaService`) y la usa la pre-inscripción para el plazo de la reserva de cupo. Del subsistema de cuotas y pagos también: `ILogicaCuotasPagos` e `IInfoPagos`. De rutinas y progreso, por ahora solo `IInfoProgreso`, que usa la pre-inscripción para guardar el peso y la talla. De clases y asistencia (US-20, US-21): `IInfoClases` e `IInfoAsistencia`, que usan `Asistencia` y `CierreAsistencia` dentro del subsistema y GestionPersonas para el panel del alumno (US-29) y el historial de asistencia de la ficha (US-10); las operaciones de `/clases` son la parte `ILogicaClasesYAsistencia` de `ILogicaInscripcionesYClases`. De notificaciones (US-25): `ILogicaNotificaciones` e `IRegistroNotificaciones`, que provee `Notificacion` para que los procesos del subsistema guarden sus avisos; `IEnvioPush`, que provee `SuscripcionPush` para que `Notificacion` mande los avisos de cuota al celular, e `IServicioWebPush`, que realiza el adaptador de `web-push`. De reportes (US-22, US-33 a US-37): `ILogicaInformes`; `DetectorInactividad` usa además `IInfoAsistencia` para las rachas y la marca de gestión, y `GeneradorInformes` para el informe de asistencia. Del Sprint 5: `ICalculoRachaRanking`, que realiza `CalculadorRachaRanking`; `ILogicaInsignias`, la ficha de insignias y el ranking (US-30, US-31), e `IOtorgamientoInsignias`, que provee `Insignia` para el proceso `CierreMensualInsignias`. De honorarios (US-23): `ICierreLiquidaciones`, que provee `Liquidacion` para el proceso `CierreMensualHonorarios`.

## Cómo se usan

El service la implementa explícitamente:

```ts
export class GestionUsuariosService implements ILogicaUsuarios { ... }
export class RolService implements IAutorizacion { ... }
```

Y quien lo consume depende de la interfaz, no de la clase:

```ts
export interface AppDependencies {
  gestionUsuarios: ILogicaUsuarios;
  autenticacion: IAutenticacion;
  autorizacion: IAutorizacion;
}
```

Esto es lo que permite que `createApp` reciba mocks en los tests de rutas sin levantar la base.

## Cuándo se crea una interfaz

Se crea cuando pasa alguna de estas dos cosas:

1. **El diagrama de arquitectura la nombra.** Si `vista_arquitectonica.puml` dice `ILogicaInscripciones`, ese archivo tiene que existir.
2. **Hay más de una implementación posible**, incluido un mock de test o una integración externa que se quiere poder cambiar.

No se crea "por si acaso". Una interfaz con una sola implementación que nadie mockea es código muerto que hay que mantener sincronizado.

## Excepciones vigentes

Hoy no todo se tipa contra interfaz, y está bien:

- Los repositorios se tipan concretos (`private readonly repositorio: UsuarioRepository`). El diagrama no los modela como interfaz y los tests los mockean con un cast. Si un repositorio llega a necesitar dos implementaciones, ahí se le crea la interfaz.
- `JwtService` también se inyecta concreto en `SesionService`.
- La fachada del subsistema recibe concretos los services de sus propios componentes (`GestionServicioEntrenamientoService` recibe `PlanService`), porque solo delega en ellos. Lo que llega de otro subsistema, en cambio, viene por interfaz (`GestionPersonasService` recibe `IInfoHorarios`).

Lo que no tiene excepción es la dirección de la dependencia: un componente nunca importa la clase concreta de **otro** componente para llamarle lógica de negocio. Para eso está la interfaz.
