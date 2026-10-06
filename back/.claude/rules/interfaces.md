# Interfaces

## Convención

- Van en `interface/`, dentro de la carpeta de quien la provee según el diagrama: el componente (`rol/interface/i-autorizacion.ts`) o, para las `ILogica*`, el subsistema (`gestion-usuarios/interface/i-logica-usuarios.ts`).
- El archivo se llama `i-nombre-en-kebab.ts`; el tipo exportado es `IPascalCase`.
- Lleva arriba un comentario corto que la vincula al componente del diagrama de arquitectura y aclara qué queda afuera.

```ts
// Interfaz del subsistema GestionUsuarios en la vista arquitectónica: es lo único que ve la
// capa de presentación (UsuarioPresWeb). Reúne lo que ofrecen sus componentes Sesion,
// Usuario y Rol; IAutenticacion e IAutorizacion quedan para los otros subsistemas.
export interface ILogicaUsuarios {
  iniciarSesion(idToken: string): Promise<SesionIniciada>;
  crear(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  obtenerMatriz(): Promise<MatrizPermisos>;
  // ...
}
```

Las que existen hoy: `ILogicaUsuarios`, `ILogicaPersonas`, `ILogicaServicioEntrenamiento`, `IAutenticacion`, `IAutenticacionGoogleAuth`, `IAutorizacion`, `IInfoUsuarios`, `IInfoProfesores`, `IInfoActividades` e `IInfoHorarios`.

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

Lo que no tiene excepción es la dirección de la dependencia: un componente nunca importa la clase concreta de **otro** componente para llamarle lógica de negocio. Para eso está la interfaz.
