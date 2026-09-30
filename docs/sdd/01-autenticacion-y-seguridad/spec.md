# Especificación Funcional: Autenticación y Seguridad

## 1. Origen
Esta especificación agrupa y formaliza las siguientes User Stories del proyecto:
- **US-01**: Inicio de sesión con Google Auth (`docs/specs/01-autenticacion-y-seguridad/US-01-inicio-sesion-google-auth.md`)
- **US-02**: Definición de permisos por rol (`docs/specs/01-autenticacion-y-seguridad/US-02-definicion-permisos-por-rol.md`)

---

## 2. Objetivo
Proveer un mecanismo centralizado, moderno y seguro de identificación, autenticación y autorización para la plataforma **MiFR**. El acceso se realiza exclusivamente mediante cuentas de Google (eliminando la gestión y almacenamiento de contraseñas locales) y se gobierna mediante un sistema de Control de Acceso Basado en Roles (RBAC) con soporte para usuarios multi-rol y configuración dinámica de permisos administrada por la Propietaria.

---

## 3. Roles Involucrados

| Rol | Descripción en el Sistema | Acceso Inicial Típico |
| :--- | :--- | :--- |
| **Propietaria** | Administradora y dueña del centro de entrenamiento. Control total del negocio. | Acceso irrestricto a todos los módulos y configuración de seguridad. |
| **Profesora** | Instructora que dicta clases y gestiona asistencias/rutinas. | Acceso a sus horarios, asistencias, alumnos asignados y sus propios honorarios. |
| **Alumno / Tutor** | Persona que asiste al centro o tutor responsable de un menor. | Acceso a su perfil, rutinas, historial de asistencia, cuotas y pagos propios. |

> **Nota Multi-Rol**: Una misma persona física puede tener simultáneamente múltiples roles activos (por ejemplo, *Propietaria* y a la vez *Profesora* dictante de clases). El sistema debe consolidar sus permisos aplicando la unión (`OR`) de los mismos.

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Autenticación federada mediante Google Identity Services (GIS)
- El ingreso al sistema se realiza a través del botón oficial de Google ("Sign in with Google").
- No existirán formularios de registro público libre ni login con usuario/contraseña tradicional.
- El frontend obtendrá el ID Token / Credencial de Google y lo enviará al backend para verificación criptográfica con los servidores de Google.

#### RF-02: Pre-registro obligatorio y estado de cuenta (Whitelisting)
- El sistema no crea usuarios automáticamente tras un login exitoso de Google.
- Al validar el token de Google, el backend buscará el correo en la base de datos de usuarios (`usuarios.email`).
- Si el correo **no está registrado**, se denegará el acceso informando claramente al usuario que su cuenta no se encuentra habilitada en el centro.
- Si el usuario existe pero su estado es `INACTIVO` (el DER solo define `ACTIVO` e `INACTIVO`), se denegará el acceso informando que la cuenta está deshabilitada.
- En el primer login exitoso de un usuario pre-registrado, el sistema asociará de forma permanente su identificador único de Google (`google_id`) a su registro.

#### RF-03: Sesión segura y recuperación de contexto
- Una vez validado el usuario, el backend emitirá una sesión autenticada (token JWT firmado o cookie `HttpOnly`) que contendrá la identidad del usuario y sus roles asignados.
- Se debe proveer un endpoint para recuperar la sesión activa actual (`/auth/me`) que devuelva el perfil del usuario, roles asignados y el catálogo consolidado de permisos efectivos.

#### RF-04: Soporte multi-rol para usuarios
- Cada usuario puede tener uno o más roles asignados en la tabla `usuario_roles`.
- Los permisos de un usuario con múltiples roles corresponden a la unión estricta de todos los permisos otorgados a cada uno de sus roles.

#### RF-05: Administración de la matriz de permisos por rol
- Únicamente usuarios con el rol `Propietaria` pueden acceder a la pantalla y endpoints de gestión de la matriz de permisos.
- La matriz define por cada rol y funcionalidad/módulo el nivel de acceso (ej: `VER`, `MODIFICAR`, o `SIN_ACCESO`).
- Los permisos asignados al rol `Propietaria` para funciones críticas (como la propia administración de permisos y la visualización de finanzas globales) son inmutables y no pueden revocarse.

#### RF-06: Restricción estricta de datos financieros y confidenciales
- Información sensible como liquidaciones de honorarios generales, rendiciones de efectivo y balances solo son accesibles por la `Propietaria`.
- Una `Profesora` únicamente puede visualizar el detalle de sus propios honorarios liquidados, nunca los de colegas.

#### RF-07: Control de acceso en Frontend y Backend
- **Backend**: Todo endpoint protegido validará la presencia del token de sesión y verificará que el usuario posea el permiso requerido antes de ejecutar la lógica de negocio.
- **Frontend**: La interfaz ocultará o deshabilitará componentes visuales, menús de navegación, botones y rutas en base a los permisos del usuario activo.
- Si un usuario no autenticado intenta acceder a una ruta interna protegida, será redirigido inmediatamente a la vista de login.
- Si un usuario autenticado intenta ingresar a una ruta para la cual no tiene permisos, se le mostrará una pantalla de acceso denegado (HTTP 403 Forbidden).

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01 (Seguridad Criptográfica)**: El backend debe verificar la firma del ID Token de Google usando las claves públicas oficiales (`googleapis.com/oauth2/v3/certs`) y validar `iss`, `aud` (Client ID) y expiración (`exp`).
- **RNF-02 (Almacenamiento Seguro)**: Nunca se almacenarán credenciales o secretos de usuario en texto plano ni en `localStorage` desprotegido. Los tokens de sesión preferentemente se manejarán en cookies `HttpOnly; SameSite=Lax; Secure` o en memoria del cliente con refresh token seguro.
- **RNF-03 (Performance)**: La verificación de sesión en cada petición del backend no debe agregar una latencia superior a 10ms (validación stateless de JWT o caché en memoria).
- **RNF-04 (Auditoría)**: Se registrarán eventos críticos de seguridad: intentos de login fallidos (correos no registrados), bloqueos de cuenta, modificaciones de la matriz de permisos y cambios de roles.

---

## 5. Criterios de Aceptación

### CA-01: Login exitoso con cuenta habilitada (US-01)
- **Dado** que un usuario tiene su correo `maria@gmail.com` registrado y activo en el sistema con rol `Profesora`.
- **Cuando** hace clic en "Iniciar sesión con Google" y completa satisfactoriamente el popup de Google.
- **Entonces** el sistema valida el token, asocia su `google_id` (si no lo tenía), genera la sesión y lo redirige a la vista inicial de profesoras.

### CA-02: Intento de login con correo no registrado (US-01)
- **Dado** que una persona inicia sesión con `desconocido@gmail.com` (correo no cargado en la base de datos).
- **Cuando** el backend recibe el token de Google.
- **Entonces** rechaza la solicitud con código `403/401` y mensaje "Acceso no habilitado. Contacte a la administración del centro", sin crear ningún registro en la base de datos ni emitir token de sesión.

### CA-03: Cancelación o cierre de popup de Google (US-01)
- **Dado** que el usuario hace clic en el botón de Google.
- **Cuando** cierra el popup antes de autorizar o cancela el flujo de Google.
- **Entonces** no se genera ninguna sesión, el frontend permanece en la pantalla de login y no se produce un bloqueo o pantalla en blanco.

### CA-04: Protección de rutas no autenticadas (US-01)
- **Dado** un visitante sin sesión activa.
- **Cuando** intenta navegar directamente a una URL interna protegida (ej: `/alumnos` o `/configuracion`).
- **Entonces** es redirigido inmediatamente a la pantalla `/login`.

### CA-05: Acceso exclusivo a la Matriz de Permisos (US-02)
- **Dado** un usuario autenticado únicamente con el rol `Profesora`.
- **Cuando** intenta acceder a la ruta `/seguridad/permisos` o envía un request a la API de permisos.
- **Entonces** el sistema bloquea la navegación mostrando "Acceso Denegado (403)" y el backend rechaza la petición.

### CA-06: Asignación Multi-Rol consolidada (US-01 y US-02)
- **Dado** una usuaria que posee asignados los roles `Propietaria` y `Profesora`.
- **Cuando** inicia sesión y se computan sus permisos.
- **Entonces** tiene acceso tanto al módulo administrativo/financiero como a la carga de asistencias y horarios de sus clases.

### CA-07: Inmutabilidad de permisos críticos de Propietaria (US-02)
- **Dado** que la Propietaria edita la matriz de permisos.
- **Cuando** intenta desmarcar permisos críticos (como gestión de permisos, usuarios o finanzas para el rol Propietaria).
- **Entonces** la UI mantiene bloqueadas esas opciones y el backend rechaza cualquier payload que intente despojar dichos permisos con un error descriptivo.

### CA-08: Actualización inmediata de matriz de permisos (US-02)
- **Dado** que la Propietaria modifica los permisos de visualización del rol `Profesora` y guarda los cambios.
- **Cuando** se confirma la operación con éxito.
- **Entonces** los cambios quedan persistidos y se aplican a las profesoras en sus próximas peticiones/navegaciones.

---

## 6. Casos Borde y Manejo de Errores

| Caso Borde / Escenario de Error | Comportamiento Esperado |
| :--- | :--- |
| **Popup bloqueado por el navegador** | La interfaz debe detectar el bloqueo y mostrar un aviso al usuario indicando habilitar popups o usar redirección estándar. |
| **Token de Google expirado o corrupto** | El backend responde HTTP 401 con código `INVALID_GOOGLE_TOKEN`. El cliente descarta cualquier estado previo y solicita reautenticar. |
| **Usuario con estado `INACTIVO`** | El backend rechaza la autenticación informando que el usuario ha sido suspendido o dado de baja. |
| **Falla de conectividad con servidores de Google** | El backend maneja el timeout/error y responde HTTP 503 con mensaje de reintento temporal amigable. |
| **Error de red al guardar la matriz de permisos** | La UI conserva el estado editado previamente, muestra un toast de error con opción "Reintentar" y no pierde los cambios sin advertir. |
| **Usuario con sesión activa navegando a `/login`** | Se detecta la sesión activa y se redirige automáticamente al dashboard principal correspondiente a su rol. |

---

## 7. Fuera de Alcance (Out of Scope)
- Registro público y auto-servicio de registro (los usuarios siempre son dados de alta por la administración/propietaria).
- Autenticación con usuario y contraseña local (no se contemplan contraseñas ni reseteo de claves por email).
- Autenticación con otros proveedores OAuth (Facebook, Apple, Microsoft) en esta fase inicial.
- Doble factor de autenticación (2FA) local independiente (se delega enteramente a las políticas de seguridad de la cuenta de Google del usuario).
