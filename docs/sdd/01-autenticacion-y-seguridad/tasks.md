# Tareas de Implementación: Autenticación y Seguridad

Tareas técnicas, secuenciales y verificables para implementar la especificación de **Autenticación y Seguridad** (US-01 y US-02).

---

## Fase 1: Base de Datos y Modelado RBAC

- [ ] **1.1. Script de migración / DDL de tablas de seguridad e identidad**
  - Crear o actualizar las tablas **según el DER** (que no se modifica): `usuarios`, `roles`, `usuario_roles`, `permisos`, `rol_permisos`. No hay tabla `modulos`: el módulo es la columna `permisos.modulo`.
  - Claves primarias compuestas en `usuario_roles` y `rol_permisos`; únicos en `usuarios.email`, `usuarios.google_id`, `usuarios.dni`, `roles.codigo` y `permisos.codigo`; FK `ON DELETE NO ACTION` con los nombres del SQL de EA.
  - *Criterio de verificación*: Ejecutar la migración en la base de datos y verificar con `\d` o inspección de esquema que todas las tablas y relaciones existan correctamente.

- [ ] **1.2. Carga inicial de datos (Seeds / Semillas)**
  - Insertar los roles base: `PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`.
  - Insertar los permisos del sistema con su `modulo` (`SEGURIDAD`, `ALUMNOS`, `HORARIOS`, `PLANES`, `HONORARIOS`, `ASISTENCIAS`, `RUTINAS`).
  - Definir en el backend la constante de permisos críticos de la Propietaria (`SEGURIDAD_MATRIZ_VER`, `SEGURIDAD_MATRIZ_EDITAR`, `HONORARIOS_VER_TODOS`) y otorgárselos en el seed.
  - Poblar las asignaciones por defecto en `rol_permisos`.
  - Crear un usuario de prueba con rol `PROPIETARIA` y un usuario con roles combinados `PROPIETARIA` + `PROFESORA`.
  - *Criterio de verificación*: Consultar la tabla `rol_permisos` y verificar que la matriz inicial esté cargada de forma coherente.

---

## Fase 2: Backend – Servicio de Autenticación y Sesión (US-01)

- [ ] **2.1. Configuración de dependencias y variables de entorno**
  - Instalar `google-auth-library` y `jsonwebtoken` (con sus respectivos `@types`) en `back/`.
  - Definir variables en `.env.example` del backend: `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
  - *Criterio de verificación*: `pnpm build` compila sin errores de tipos y el servicio lee las variables de entorno.

- [ ] **2.2. Implementar servicio de validación de Google ID Token**
  - Crear `GoogleAuthService` utilizando `OAuth2Client` de Google.
  - Validar criptográficamente el token recibido, asegurando coincidencia de audiencia (`aud == GOOGLE_CLIENT_ID`) y extrayendo `{ email, name, picture, sub: google_id }`.
  - *Criterio de verificación*: Test unitario con token mockeado o válido que verifique la extracción de claims o rechazo en caso de token expirado/inválido.

- [ ] **2.3. Lógica de verificación de usuario registrado (Whitelisting) y vinculación**
  - Implementar consulta en base de datos para buscar usuario por `email`.
  - Si no existe: rechazar con HTTP 403 y código `ACCESO_NO_HABILITADO`.
  - Si el usuario existe pero tiene `estado != 'ACTIVO'`: rechazar con HTTP 403 (`USUARIO_INACTIVO`).
  - Si el usuario existe y su `google_id` está vacío: asociar el `google_id` al registro del usuario.
  - *Criterio de verificación*: Probar peticiones con emails no cargados en la BD y verificar que retorne error sin insertar registros en `usuarios`.

- [ ] **2.4. Emisión y verificación de JWT con permisos consolidados**
  - Crear función generadora de JWT y resolución de permisos: obtener todos los roles del usuario, consultar sus permisos y hacer la unión (`UNION`) sin duplicados.
  - Crear middleware `authenticateToken` que extraiga el bearer token, valide la firma del JWT y adjunte `req.user` a la request.
  - Implementar endpoints:
    - `POST /api/v1/auth/google` (login y emisión de token)
    - `GET /api/v1/auth/me` (perfil activo y permisos actuales)
    - `POST /api/v1/auth/logout`
  - *Criterio de verificación*: Petición exitosa a `POST /auth/google` devuelve el token y el array de roles y permisos efectivos; petición a `/auth/me` con ese token devuelve el mismo usuario.

---

## Fase 3: Backend – Middlewares RBAC y Matriz de Permisos (US-02)

- [ ] **3.1. Implementar middlewares de autorización granular**
  - Crear middleware `requireRole(...roles)` para validar membresía de rol.
  - Crear middleware `requirePermission(...permissions)` para verificar que el usuario tenga el permiso requerido en su lista consolidada.
  - *Criterio de verificación*: Probar endpoints protegidos con un usuario que tiene el permiso (retorna 200) y uno que no lo tiene (retorna HTTP 403 Forbidden).

- [ ] **3.2. Implementar endpoints de administración de matriz de permisos**
  - Implementar `GET /api/v1/seguridad/matriz`: protegido con `requirePermission('SEGURIDAD_MATRIZ_VER')`, devuelve roles, permisos agrupados por `permisos.modulo` y el estado actual de la matriz.
  - Implementar `PUT /api/v1/seguridad/matriz`: protegido con `requirePermission('SEGURIDAD_MATRIZ_EDITAR')`, inserta o borra filas de `rol_permisos`.
  - Validar inmutabilidad de permisos críticos: si el payload intenta quitarle al rol `PROPIETARIA` un permiso de la lista de críticos, abortar con error HTTP 400.
  - *Criterio de verificación*: Test que intente remover un permiso crítico de la propietaria y verifique que sea rechazado con HTTP 400.

---

## Fase 4: Frontend – Autenticación y Flujo Google GIS (US-01)

- [ ] **4.1. Configuración de Google Identity Services en el Front**
  - Configurar el proveedor de Google OAuth en `front/` (usando el Client ID de las variables de entorno de Vite `VITE_GOOGLE_CLIENT_ID`).
  - Agregar botón oficial de "Iniciar sesión con Google".
  - *Criterio de verificación*: El botón renderiza correctamente en la pantalla de login `/login`.

- [ ] **4.2. Estado global de autenticación (`AuthContext` y `useAuth`)**
  - Implementar `AuthContext` para guardar `{ user, token, isAuthenticated, isLoading }`.
  - Implementar persistencia segura de la sesión (guardado de token y recuperación en recarga de página mediante llamada a `/auth/me`).
  - *Criterio de verificación*: Al recargar la página con sesión iniciada, el usuario permanece logueado sin necesidad de volver a interactuar con Google.

- [ ] **4.3. Manejo de estados de la pantalla de Login y mensajes de error**
  - Implementar estados en la vista de login:
    - Estado normal con logo y botón de Google.
    - Estado de carga/spinner mientras el backend valida el token.
    - Estado de error claro si el usuario no está registrado ("Acceso no habilitado. Contacte a la administración del centro").
    - Manejo de cancelación del popup de Google sin bloqueos de interfaz.
  - *Criterio de verificación*: Simular respuesta de "correo no registrado" y verificar que la UI muestre el mensaje de aviso en lugar de un error genérico o pantalla en blanco.

- [ ] **4.4. Protección de Rutas (`<ProtectedRoute>`)**
  - Implementar componente wrapper para rutas protegidas en `react-router`.
  - Si no hay usuario autenticado, redirigir a `/login` guardando la URL a la que intentaba acceder.
  - Si un usuario ya autenticado visita `/login`, redirigir automáticamente a su pantalla principal.
  - *Criterio de verificación*: Intentar ingresar a `/dashboard` sin login y comprobar la redirección a `/login`.

---

## Fase 5: Frontend – Control de Acceso por Permisos y Multi-Rol (US-02)

- [ ] **5.1. Hook `usePermissions()` y componente `<Can>`**
  - Crear hook `usePermissions()` que exponga métodos utilitarios:
    - `hasPermission(permissionCode: string): boolean`
    - `hasAnyRole(roles: string[]): boolean`
  - Crear componente `<Can permission="código">` para envolver elementos de la interfaz. Si el usuario no tiene el permiso, el contenido no se renderiza.
  - *Criterio de verificación*: Renderizar un botón envuelto en `<Can permission="honorarios.ver_todos">` y verificar que solo aparece para usuarios que posean dicho permiso.

- [ ] **5.2. Componente `<PermissionGuard>` para rutas protegidas por permiso**
  - Crear guardia para rutas específicas que requieran permisos puntuales.
  - En caso de no tener el permiso, mostrar pantalla o componente de error "403 - No tienes permisos para ver esta sección" con botón de regreso.
  - *Criterio de verificación*: Un usuario con rol `Profesora` que navegue a `/seguridad/matriz` ve la pantalla de 403.

- [ ] **5.3. Navegación y menús adaptables**
  - Configurar la barra lateral o barra de navegación para filtrar automáticamente las opciones de menú en función de los permisos efectivos del usuario logueado.
  - Si una persona tiene rol `PROPIETARIA` + `PROFESORA`, mostrar tanto los accesos de administración como los accesos de profesora.
  - *Criterio de verificación*: Iniciar sesión con un usuario multi-rol y verificar que la barra de navegación contiene todas las secciones correspondientes a ambos roles.

---

## Fase 6: Frontend – Pantalla de Administración de Matriz de Permisos (US-02)

- [ ] **6.1. Maquetado de la Matriz de Permisos**
  - Crear la vista `/seguridad/permisos` (accesible solo para `PROPIETARIA`).
  - Mostrar una tabla/matriz interactiva organizada por Módulo, Permiso y columnas por cada Rol (`Propietaria`, `Profesora`, `Alumno`).
  - Renderizar switches o checkboxes para cada intersección.
  - Deshabilitar visualmente y bloquear los checkboxes correspondientes a permisos críticos de la Propietaria con un icono de candado o tooltip explicativo.
  - *Criterio de verificación*: La tabla se visualiza ordenada por módulo y los permisos críticos de la Propietaria aparecen bloqueados (deshabilitados para edición).

- [ ] **6.2. Lógica de guardado y feedback al usuario**
  - Implementar botón "Guardar Cambios" y "Restablecer".
  - Manejar estado de guardado con spinner/loading.
  - Mostrar notificación tipo Toast de éxito al guardar.
  - Manejar errores de red manteniendo los cambios en pantalla para reintento y mostrando alerta explicativa.
  - *Criterio de verificación*: Modificar un permiso no crítico de Profesora, guardar, recargar y confirmar que el nuevo valor persiste.

---

## Fase 7: Validación de Criterios de Aceptación (Testing End-to-End)

- [ ] **7.1. Prueba de verificación CA-01**: Login exitoso con cuenta habilitada y redirección correcta.
- [ ] **7.2. Prueba de verificación CA-02**: Intento de login con cuenta de Google no registrada (muestra mensaje amigable de no habilitado y no crea registros).
- [ ] **7.3. Prueba de verificación CA-03**: Cancelación de popup de Google sin rotura de la aplicación.
- [ ] **7.4. Prueba de verificación CA-04**: Redirección al login al tipear URL protegida sin estar autenticado.
- [ ] **7.5. Prueba de verificación CA-05**: Bloqueo de acceso a la matriz de permisos para roles no propietarios.
- [ ] **7.6. Prueba de verificación CA-06**: Verificación de unión de permisos para usuario multi-rol (Propietaria + Profesora).
- [ ] **7.7. Prueba de verificación CA-07**: Verificación de bloqueo de auto-despojo de permisos críticos de la Propietaria.
- [ ] **7.8. Prueba de verificación CA-08**: Verificación de persistencia y aplicación de cambios en la matriz de permisos.
