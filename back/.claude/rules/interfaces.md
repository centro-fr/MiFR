# Interfaces

## Convención

- Van en `interface/`, dentro de la carpeta del componente.
- El archivo se llama `i-nombre-en-kebab.ts`; el tipo exportado es `IPascalCase`.
- Lleva arriba un comentario corto que la vincula al componente del diagrama de arquitectura y aclara qué queda afuera.

```ts
// Componente "Usuario": CRUD + asignación de roles. La decisión de permisos
// (componente "Permiso") es una dependencia externa, no vive acá.
export interface ILogicaUsuarios {
  crear(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  listar(): Promise<UsuarioConRoles[]>;
  // ...
}
```

Las que existen hoy: `ILogicaUsuarios`, `IAutenticacion`, `IAutenticacionGoogleAuth`, `IAutorizacion`.

## Cómo se usan

El service la implementa explícitamente:

```ts
export class UsuarioService implements ILogicaUsuarios { ... }
```

Y quien lo consume depende de la interfaz, no de la clase:

```ts
export interface AppDependencies {
  usuarioService: ILogicaUsuarios;
  autenticacion: IAutenticacion;
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
