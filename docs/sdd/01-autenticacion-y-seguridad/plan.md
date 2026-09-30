# Plan Técnico: Autenticación y Seguridad

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Pila Tecnológica
- **Backend**:
  - Runtime: Node.js 20+ con TypeScript (`back`).
  - Validación OAuth: `google-auth-library` para verificar de forma segura y server-side el Google ID Token (validación de firma criptográfica, emisor `iss`, audiencia `aud` con el `GOOGLE_CLIENT_ID` y timestamp `exp`).
  - Manejo de Sesión: Tokens JWT (`jsonwebtoken`) firmados con algoritmo `HS256` o `RS256` emitidos en el backend, o cookies `HttpOnly; SameSite=Lax; Secure` para máxima protección contra ataques XSS.
  - Middleware de Seguridad: Capa de middlewares en cascada:
    1. `authenticate`: Extrae el token, verifica la firma y carga el payload del usuario.
    2. `requireRoles(...roles)`: Valida pertenencia a al menos uno de los roles solicitados.
    3. `requirePermissions(...permissions)`: Valida que el conjunto de permisos consolidados del usuario contenga el permiso necesario.
- **Frontend**:
  - Framework: React 19 + TypeScript + Vite (`front`).
  - Cliente Google Auth: Google Identity Services (GIS) mediante la librería `@react-oauth/google` o integración directa con `window.google.accounts.id`.
  - Enrutamiento y Guardias: `react-router` configurado con componentes de orden superior:
    - `<ProtectedRoute>`: Verifica existencia de sesión activa; si no existe, redirige a `/login` preservando la ruta previa en el estado.
    - `<PermissionGuard permission="...">`: Verifica si el usuario cuenta con el permiso efectivo; si no lo tiene, muestra pantalla `403 No Autorizado` o redirige.
  - Gestión de Estado: `AuthContext` para almacenar el perfil de usuario, roles y conjunto memoizado (`Set<string>`) de permisos efectivos.
  - Utilidad UI: Componente `<Can permission="código">` y hook `usePermissions()` para renderizado condicional de botones, pestañas y elementos de menú.

---

## 2. Modelo de Datos

El modelo es **exactamente el del DER** (`docs/diagrams/puml/der.puml` y `docs/diagrams/enterprise_architect/DER - Centro de Entrenamiento FR.sql`), paquete *Identidad y Acceso*. **El DER no se modifica para este plan**: la matriz de roles y permisos (RBAC) se resuelve con sus tablas tal como están.

Decisiones que se desprenden del DER:

- **No hay tabla `modulos`.** El módulo de cada permiso es la columna `permisos.modulo` (`VARCHAR(30)`, ej. `SEGURIDAD`, `ALUMNOS`, `HORARIOS`, `PLANES`, `HONORARIOS`, `ASISTENCIAS`, `RUTINAS`). La matriz agrupa los permisos por ese campo.
- **Un permiso está otorgado a un rol si existe la fila en `rol_permisos`.** No hay columna `permitido`: otorgar es insertar la fila y quitar es borrarla.
- **Los permisos críticos de la Propietaria no son una columna.** El DER no tiene `es_critico_propietaria`; la lista de permisos críticos es una constante del backend (ver sección 5).
- **Roles e ids numéricos.** `roles` y `permisos` tienen PK `SERIAL` (`id_rol`, `id_permiso`) y un `codigo` único. Los códigos de rol son `PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`.
- **Estados de usuario:** solo `ACTIVO` e `INACTIVO`.
- **Códigos de permiso** en mayúsculas con guion bajo, como el ejemplo del DER (`PAGOS_CONFIRMAR`): `SEGURIDAD_MATRIZ_VER`, `SEGURIDAD_MATRIZ_EDITAR`, `HONORARIOS_VER_TODOS`, etc.

```
+-------------------------+          +---------------------+
|        usuarios         |          |        roles        |
+-------------------------+          +---------------------+
| PK id_usuario (SERIAL)  |          | PK id_rol (SERIAL)  |
|    google_id (UK, NULL) |          |    codigo (UK)      |
|    email (UK, NULL)     |          |    nombre           |
|    nombre, apellido     |          |    descripcion      |
|    dni (UK), telefono   |          +----+-----------+----+
|    fecha_nacimiento     |               | 1         | 1
|    direccion, estado    |               |           |
|    fecha_alta           |               | N         | N
|    fecha_actualizacion  |   +-----------+---+   +---+-------------------+
+-----------+-------------+   | usuario_roles |   |     rol_permisos      |
            | 1               +---------------+   +-----------------------+
            +---------------->| PK,FK id_usuario  | PK,FK id_rol          |
                         N    | PK,FK id_rol  |   | PK,FK id_permiso      |
                              | fecha_asignacion  | fecha_asignacion      |
                              +---------------+   +-----------+-----------+
                                                              | N
                                                              |
                                                              | 1
                                                  +-----------+-----------+
                                                  |       permisos        |
                                                  +-----------------------+
                                                  | PK id_permiso (SERIAL)|
                                                  |    codigo (UK)        |
                                                  |    modulo             |
                                                  |    descripcion        |
                                                  +-----------------------+
```

### 2.1. Definición de Tablas (según el DER)

Tipos, largos y nombres de constraints tomados del SQL que exporta EA. Los `UNIQUE` son los marcados como UK en `der.puml`. En el backend se implementa con Prisma (`back/prisma/schema.prisma`).

```sql
CREATE TABLE usuarios (
    id_usuario          SERIAL NOT NULL,
    google_id           VARCHAR(255) NULL,   -- NULL hasta el 1er login; NULL en menores
    email               VARCHAR(120) NULL,   -- NULL en menores a cargo de tutor
    nombre              VARCHAR(60)  NOT NULL,
    apellido            VARCHAR(60)  NOT NULL,
    dni                 VARCHAR(10)  NULL,   -- solo digitos
    telefono            VARCHAR(20)  NULL,
    fecha_nacimiento    DATE         NOT NULL,
    direccion           VARCHAR(120) NULL,
    estado              VARCHAR(8)   NOT NULL, -- ACTIVO / INACTIVO
    fecha_alta          TIMESTAMP    NOT NULL,
    fecha_actualizacion TIMESTAMP    NOT NULL,
    CONSTRAINT "PK_usuarios" PRIMARY KEY (id_usuario),
    CONSTRAINT ck_usuarios_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    UNIQUE (google_id), UNIQUE (email), UNIQUE (dni)
);

CREATE TABLE roles (
    id_rol      SERIAL NOT NULL,
    codigo      VARCHAR(11)  NOT NULL, -- PROPIETARIA / PROFESORA / ALUMNO / TUTOR
    nombre      VARCHAR(40)  NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT "PK_roles" PRIMARY KEY (id_rol),
    CONSTRAINT ck_roles_codigo CHECK (codigo IN ('PROPIETARIA', 'PROFESORA', 'ALUMNO', 'TUTOR')),
    UNIQUE (codigo)
);

CREATE TABLE usuario_roles (
    id_usuario       INTEGER   NOT NULL,
    id_rol           INTEGER   NOT NULL,
    fecha_asignacion TIMESTAMP NOT NULL,
    CONSTRAINT "PK_usuario_roles" PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT "FK_usuario_roles_usuarios" FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT "FK_usuario_roles_roles" FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
);

CREATE TABLE permisos (
    id_permiso  SERIAL NOT NULL,
    codigo      VARCHAR(50)  NOT NULL, -- ej. PAGOS_CONFIRMAR
    modulo      VARCHAR(30)  NOT NULL, -- agrupa los permisos en la matriz (no hay tabla modulos)
    descripcion VARCHAR(150) NULL,
    CONSTRAINT "PK_permisos" PRIMARY KEY (id_permiso),
    UNIQUE (codigo)
);

CREATE TABLE rol_permisos (
    id_rol           INTEGER   NOT NULL,
    id_permiso       INTEGER   NOT NULL,
    fecha_asignacion TIMESTAMP NOT NULL,
    CONSTRAINT "PK_rol_permisos" PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT "FK_rol_permisos_roles" FOREIGN KEY (id_rol) REFERENCES roles (id_rol),
    CONSTRAINT "FK_rol_permisos_permisos" FOREIGN KEY (id_permiso) REFERENCES permisos (id_permiso)
);
```

Las FK son `ON DELETE NO ACTION`: para borrar un usuario primero se borran sus filas de `usuario_roles`.

---

## 3. Endpoints y Contratos de API

### 3.1. Autenticación (`/api/v1/auth`)

#### `POST /api/v1/auth/google`
Inicia sesión validando el token emitido por Google Identity Services.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
- **Respuestas**:
  - `200 OK`:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "usuario": {
        "id_usuario": 1,
        "email": "laura.propietaria@gmail.com",
        "nombre": "Laura",
        "apellido": "Gómez",
        "roles": ["PROPIETARIA", "PROFESORA"],
        "permisos": [
          "SEGURIDAD_MATRIZ_VER",
          "SEGURIDAD_MATRIZ_EDITAR",
          "HONORARIOS_VER_TODOS",
          "CLASES_ASISTENCIA_MARCAR"
        ]
      }
    }
    ```
  - `401 Unauthorized` / `403 Forbidden` (Usuario no pre-registrado):
    ```json
    {
      "codigo": "ACCESO_NO_HABILITADO",
      "mensaje": "El correo ingresado no se encuentra habilitado en el sistema. Contacte a la administración."
    }
    ```
  - `403 Forbidden` (Usuario inactivo):
    ```json
    {
      "codigo": "USUARIO_INACTIVO",
      "mensaje": "Su cuenta se encuentra inactiva o dada de baja."
    }
    ```

#### `GET /api/v1/auth/me`
Obtiene los datos del usuario autenticado actual y refresca sus permisos.
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta 200 OK**: Mismo objeto de usuario que el endpoint de login.
- **Respuesta 401 Unauthorized**: Token inválido o expirado.

#### `POST /api/v1/auth/logout`
Cierra la sesión y limpia cookies de sesión si aplica.
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta 200 OK**: `{ "mensaje": "Sesión cerrada correctamente" }`

---

### 3.2. Gestión de Matriz de Permisos (`/api/v1/seguridad`)
*Protegido: Requiere rol `PROPIETARIA` y permiso `SEGURIDAD_MATRIZ_EDITAR` / `SEGURIDAD_MATRIZ_VER`.*

#### `GET /api/v1/seguridad/matriz`
Devuelve los roles, los permisos agrupados por `permisos.modulo` y el estado actual de la matriz (filas de `rol_permisos`).
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta 200 OK**:
  ```json
  {
    "roles": [
      { "id_rol": 1, "codigo": "PROPIETARIA", "nombre": "Propietaria" },
      { "id_rol": 2, "codigo": "PROFESORA", "nombre": "Profesora" },
      { "id_rol": 3, "codigo": "ALUMNO", "nombre": "Alumno" },
      { "id_rol": 4, "codigo": "TUTOR", "nombre": "Tutor" }
    ],
    "modulos": [
      {
        "modulo": "HONORARIOS",
        "permisos": [
          {
            "id_permiso": 10,
            "codigo": "HONORARIOS_VER_TODOS",
            "descripcion": "Ver liquidaciones generales",
            "critico": true
          },
          {
            "id_permiso": 11,
            "codigo": "HONORARIOS_VER_PROPIOS",
            "descripcion": "Ver únicamente honorarios propios",
            "critico": false
          }
        ]
      }
    ],
    "matriz": {
      "PROPIETARIA": ["HONORARIOS_VER_TODOS", "HONORARIOS_VER_PROPIOS"],
      "PROFESORA": ["HONORARIOS_VER_PROPIOS"],
      "ALUMNO": [],
      "TUTOR": []
    }
  }
  ```
  - `modulos` no es una tabla: es el agrupamiento de `permisos` por su columna `modulo`.
  - `matriz` lista, por código de rol, los permisos que tienen fila en `rol_permisos`.
  - `critico` no se guarda en la base: se calcula con la lista de permisos críticos del backend (sección 5).

#### `PUT /api/v1/seguridad/matriz`
Actualiza la configuración de permisos para uno o más roles.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "cambios": [
      {
        "rol": "PROFESORA",
        "permiso": "ALUMNOS_RUTINAS_CREAR",
        "otorgado": true
      }
    ]
  }
  ```
- **Validaciones**:
  - `otorgado: true` inserta la fila en `rol_permisos` (con `fecha_asignacion`); `otorgado: false` la borra.
  - Si un cambio intenta quitarle al rol `PROPIETARIA` un permiso de la lista de críticos, el backend rechaza la petición con HTTP 400 (`PERMISO_CRITICO_INMUTABLE`).
- **Respuesta 200 OK**:
  ```json
  {
    "mensaje": "Matriz de permisos actualizada exitosamente"
  }
  ```

---

## 4. Flujos Principales

### 4.1. Flujo de Autenticación con Google GIS
```
[Usuario]                 [Frontend React]              [Backend Node API]          [Google GIS Auth]
   |                             |                              |                          |
   |--- 1. Clic en Google Login -|                              |                          |
   |                             |--- 2. Invoca Google Popup ---+------------------------->|
   |<----------------------------+--- 3. Usuario elige cuenta --+--------------------------|
   |                             |<-- 4. Retorna idToken -------+--------------------------|
   |                             |                              |                          |
   |                             |--- 5. POST /auth/google ---->|                          |
   |                             |       { idToken }            |--- 6. Valida firma ----->|
   |                             |                              |<-- 7. Google User Payload|
   |                             |                              |                          |
   |                             |                              |-- 8. Busca email en BD   |
   |                             |                              |   ¿Existe y ACTIVO?      |
   |                             |                              |   [NO] -> 401/403 Error  |
   |                             |                              |   [SÍ] -> Asocia google_id
   |                             |                              |        -> Obtiene roles  |
   |                             |                              |        -> Consolida perm.|
   |                             |                              |        -> Emite JWT      |
   |                             |<-- 9. 200 OK { token, user } |                          |
   |                             |                              |                          |
   |<-- 10. Redirige a Dashboard-+                              |                          |
```

### 4.2. Flujo de Consolidación de Permisos Multi-Rol
Dado un usuario con roles $R = \{r_1, r_2, \dots, r_n\}$:
1. Por cada rol $r_i$, se recuperan los permisos que tienen fila en `rol_permisos` (`usuario_roles` → `roles` → `rol_permisos` → `permisos`).
2. El conjunto final de permisos efectivos del usuario es:
   $$P_{\text{efectivos}} = \bigcup_{i=1}^n P(r_i)$$
3. Se trata de una unión no conflictiva: si cualquiera de sus roles tiene permitido el acceso a una acción, el usuario la tiene concedida.

---

## 5. Consideraciones de Seguridad y Roles

1. **Defensa en Profundidad (Dual Enforcement)**:
   - **Frontend**: Oculta enlaces del menú lateral y deshabilita botones que el usuario no puede utilizar para evitar frustración visual.
   - **Backend**: **Nunca** confiar en el cliente. Cada endpoint valida de forma atómica y estricta el token y los permisos requeridos.
2. **Inmutabilidad de Permisos Críticos**:
   - Para prevenir situaciones de auto-bloqueo o pérdida accidental de acceso al sistema, la Propietaria no puede auto-despojarse ni despojar a su rol de permisos de administración del sistema (`SEGURIDAD_*`) ni de visualización de finanzas.
   - Como el DER no tiene una columna para marcarlos, la lista de permisos críticos es una **constante del backend** (ej. `SEGURIDAD_MATRIZ_VER`, `SEGURIDAD_MATRIZ_EDITAR`, `HONORARIOS_VER_TODOS`). El seed se los otorga a `PROPIETARIA` y el `PUT` de la matriz no permite quitarlos.
3. **Aislamiento de Información Financiera**:
   - `HONORARIOS_VER_TODOS`: Reservado exclusivamente para la Propietaria.
   - `HONORARIOS_VER_PROPIOS`: Permite a una profesora ver solo registros donde `id_profesora = usuario.id_profesora`.
4. **Validación Criptográfica de Tokens**:
   - Se valida el campo `aud` del ID token de Google para asegurar que fue emitido específicamente para la aplicación MiFR (evitando que tokens válidos de otras apps sean utilizados).
5. **Mitigación de Ataques Comunes**:
   - Rate limiting en `/auth/google` para prevenir ataques de fuerza bruta o abuso de cuota.
   - CORS restringido a los dominios autorizados de desarrollo y producción del front.
