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

El diseño se basa en la especificación del DER (`docs/diagrams/der.puml`), extendiendo el subsistema de Identidad y Acceso para soportar la matriz dinámica de roles y permisos (RBAC).

```
                      +-------------------+
                      |     usuarios      |
                      +-------------------+
                      | PK id_usuario     |
                      |    google_id (UK) |
                      |    email (UK)     |
                      |    nombre         |
                      |    apellido       |
                      |    estado         |
                      +---------+---------+
                                | 1
                                |
                                | N
                      +---------+---------+
                      |   usuario_roles   |
                      +-------------------+
                      | PK,FK id_usuario  |
                      | PK,FK codigo_rol  |
                      |       fecha_asig  |
                      +---------+---------+
                                | N
                                |
                                | 1
                      +---------+---------+
                      |       roles       |
                      +-------------------+
                      | PK codigo_rol     |
                      |    nombre         |
                      |    descripcion    |
                      +---------+---------+
                                | 1
                                |
                                | N
                      +---------+---------+        +----------------------+
                      |   rol_permisos    |        |       modulos        |
                      +-------------------+        +----------------------+
                      | PK,FK codigo_rol  |        | PK codigo_modulo     |
                      | PK,FK cod_permiso |        |    nombre            |
                      |       permitido   |        +----------+-----------+
                      +---------+---------+                   | 1
                                | N                           |
                                +--------------+              | N
                                               | 1            |
                                      +--------+--------------+--------+
                                      |            permisos            |
                                      +--------------------------------+
                                      | PK codigo_permiso              |
                                      | FK codigo_modulo               |
                                      |    nombre                      |
                                      |    descripcion                 |
                                      |    es_critico_propietaria (BOL)|
                                      +--------------------------------+
```

### 2.1. Definición de Tablas (DDL Sugerido)

```sql
-- 1. Tabla de Usuarios (Sincronizada con el DER de MiFR)
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    google_id VARCHAR(100) UNIQUE NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE NULL,
    telefono VARCHAR(30) NULL,
    fecha_nacimiento DATE NULL,
    direccion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BAJA')),
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo de Roles
CREATE TABLE roles (
    codigo_rol VARCHAR(30) PRIMARY KEY, -- 'PROPIETARIA', 'PROFESORA', 'ALUMNO', 'TUTOR'
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT NULL
);

-- 3. Asignación N:M de Usuarios a Roles (Soporte Multi-Rol)
CREATE TABLE usuario_roles (
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    codigo_rol VARCHAR(30) NOT NULL REFERENCES roles(codigo_rol) ON DELETE RESTRICT,
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, codigo_rol)
);

-- 4. Catálogo de Módulos del Sistema
CREATE TABLE modulos (
    codigo_modulo VARCHAR(30) PRIMARY KEY, -- 'SEGURIDAD', 'ALUMNOS', 'HORARIOS', 'PLANES', 'HONORARIOS', etc.
    nombre VARCHAR(50) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

-- 5. Catálogo de Permisos Granulares
CREATE TABLE permisos (
    codigo_permiso VARCHAR(60) PRIMARY KEY, -- 'seguridad.matriz.ver', 'seguridad.matriz.editar', 'honorarios.ver_todos', etc.
    codigo_modulo VARCHAR(30) NOT NULL REFERENCES modulos(codigo_modulo),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    es_critico_propietaria BOOLEAN NOT NULL DEFAULT FALSE -- Si es TRUE, el rol PROPIETARIA no puede perderlo
);

-- 6. Asignación de Permisos por Rol (Matriz Dinámica)
CREATE TABLE rol_permisos (
    codigo_rol VARCHAR(30) NOT NULL REFERENCES roles(codigo_rol) ON DELETE CASCADE,
    codigo_permiso VARCHAR(60) NOT NULL REFERENCES permisos(codigo_permiso) ON DELETE CASCADE,
    permitido BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (codigo_rol, codigo_permiso)
);
```

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
          "seguridad.matriz.ver",
          "seguridad.matriz.editar",
          "honorarios.ver_todos",
          "clases.asistencia.marcar"
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
*Protegido: Requiere rol `PROPIETARIA` y permiso `seguridad.matriz.editar` / `seguridad.matriz.ver`.*

#### `GET /api/v1/seguridad/matriz`
Devuelve la lista completa de roles, módulos, permisos y el estado actual de la matriz.
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta 200 OK**:
  ```json
  {
    "roles": [
      { "codigo_rol": "PROPIETARIA", "nombre": "Propietaria" },
      { "codigo_rol": "PROFESORA", "nombre": "Profesora" },
      { "codigo_rol": "ALUMNO", "nombre": "Alumno" }
    ],
    "modulos": [
      {
        "codigo_modulo": "HONORARIOS",
        "nombre": "Honorarios y Liquidaciones",
        "permisos": [
          {
            "codigo_permiso": "honorarios.ver_todos",
            "nombre": "Ver liquidaciones generales",
            "es_critico_propietaria": true
          },
          {
            "codigo_permiso": "honorarios.ver_propios",
            "nombre": "Ver únicamente honorarios propios",
            "es_critico_propietaria": false
          }
        ]
      }
    ],
    "matriz": {
      "PROPIETARIA": {
        "honorarios.ver_todos": true,
        "honorarios.ver_propios": true
      },
      "PROFESORA": {
        "honorarios.ver_todos": false,
        "honorarios.ver_propios": true
      },
      "ALUMNO": {
        "honorarios.ver_todos": false,
        "honorarios.ver_propios": false
      }
    }
  }
  ```

#### `PUT /api/v1/seguridad/matriz`
Actualiza la configuración de permisos para uno o más roles.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "cambios": [
      {
        "codigo_rol": "PROFESORA",
        "codigo_permiso": "alumnos.rutinas.crear",
        "permitido": true
      }
    ]
  }
  ```
- **Validaciones**:
  - Si un cambio intenta setear `permitido = false` para un permiso con `es_critico_propietaria = true` en el rol `PROPIETARIA`, el backend rechaza la petición con HTTP 400 (`PERMISO_CRITICO_INMUTABLE`).
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
1. Por cada rol $r_i$, se recuperan los permisos asignados donde `permitido = true`.
2. El conjunto final de permisos efectivos del usuario es:
   $$P_{\text{efectivos}} = \bigcup_{i=1}^n P(r_i)$$
3. Se trata de una unión no conflictiva: si cualquiera de sus roles tiene permitido el acceso a una acción, el usuario la tiene concedida.

---

## 5. Consideraciones de Seguridad y Roles

1. **Defensa en Profundidad (Dual Enforcement)**:
   - **Frontend**: Oculta enlaces del menú lateral y deshabilita botones que el usuario no puede utilizar para evitar frustración visual.
   - **Backend**: **Nunca** confiar en el cliente. Cada endpoint valida de forma atómica y estricta el token y los permisos requeridos.
2. **Inmutabilidad de Permisos Críticos**:
   - Para prevenir situaciones de auto-bloqueo o pérdida accidental de acceso al sistema, la Propietaria no puede auto-despojarse ni despojar a su rol de permisos de administración del sistema (`seguridad.*`) ni de visualización de finanzas.
3. **Aislamiento de Información Financiera**:
   - `honorarios.ver_todos`: Reservado exclusivamente para la Propietaria.
   - `honorarios.ver_propios`: Permite a una profesora ver solo registros donde `id_profesora = usuario.id_profesora`.
4. **Validación Criptográfica de Tokens**:
   - Se valida el campo `aud` del ID token de Google para asegurar que fue emitido específicamente para la aplicación MiFR (evitando que tokens válidos de otras apps sean utilizados).
5. **Mitigación de Ataques Comunes**:
   - Rate limiting en `/auth/google` para prevenir ataques de fuerza bruta o abuso de cuota.
   - CORS restringido a los dominios autorizados de desarrollo y producción del front.
