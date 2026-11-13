# US-01 – Inicio de sesión con Google Auth

## 1. Información general

- **Épica:** Autenticación y Seguridad
- **Prioridad:** Alta
- **Actor principal:** Propietaria / Profesora / Alumno-Tutor
- **Sprint sugerido:** Sprint 1

## 2. Objetivo

Permitir que cualquier usuario del sistema inicie sesión de forma segura usando su cuenta de Google, sin necesidad de gestionar contraseñas locales.

## 3. Descripción

Como usuario del sistema (propietaria, profesora, alumno/tutor), quiero iniciar sesión mediante Google Auth para acceder de forma segura sin gestionar contraseñas locales.

## 4. Estados de la pantalla / flujo

- [ ] Pantalla de login (sin sesión), con versión para celular y para escritorio y el enlace "Volver al inicio" a la página pública (US-32)
- [ ] Loading (autenticando con Google)
- [ ] Éxito → redirección según rol: propietaria → Dashboard (`/app/dashboard`); profesora → Hoy (`/app/hoy`); alumno o tutor → Inicio (`/app/inicio`)
- [ ] Inicio cancelado (se cerró la ventana de Google antes de terminar), con "Reintentar ahora"
- [ ] Error: ventana de Google bloqueada, cuenta de Google que no se pudo validar, falla del servidor o de la red
- [ ] Acceso no habilitado: el correo no está dado de alta en el sistema o el usuario está inactivo

## 5. Datos que necesita

### Datos que muestra

- Logo de MiFR
- Botón "Iniciar sesión con Google" (el botón oficial de Google Identity Services)
- Mensajes de error claros

### Datos que obtiene de Google

- El `id_token` de la cuenta. El back lo verifica con Google y usa:
  - el identificador de la cuenta (`sub`, que se guarda como `google_id`)
  - el email, que tiene que estar verificado por Google
  - la foto de perfil (`picture`), que se guarda en `usuarios.foto_url` y se refresca en cada login. Si Google no la manda, se conserva la última que se guardó.
- El nombre y el apellido **no se toman de Google**: son los que cargó el centro al darlo de alta (US-05).

### Datos que envía al backend

- `POST /api/v1/auth/google` con el `id_token`

### Datos que recibe del backend

- Token de sesión propio (JWT), el usuario (con su `foto_url` si tiene), sus roles y sus permisos efectivos (la unión de los permisos de todos sus roles)

## 6. Acciones del usuario

- Hacer clic en "Iniciar sesión con Google"
- Cancelar la ventana de Google
- Reintentar si falla
- Volver a la página pública
- Cerrar sesión desde el menú

## 7. Reglas de negocio

- El sistema **no almacena contraseñas**.
- **No hay auto-registro**: solo entra quien ya fue dado de alta como usuario.
  - Un alumno nuevo queda con su usuario `INACTIVO` desde la pre-inscripción (US-05) y puede entrar recién cuando se confirma su primer pago (US-07).
  - Un alumno menor no tiene cuenta propia: entra su tutor (US-06).
- La cuenta se identifica por su `google_id`. En el primer ingreso se busca el usuario por email y se le vincula el `google_id`; si ese email ya está vinculado a otra cuenta de Google, no entra.
- Si el email de la cuenta de Google no está verificado, no entra.
- Si el correo no está registrado → mensaje "Acceso no habilitado" (no se crea cuenta automáticamente).
- Si el usuario está `INACTIVO` (por ejemplo, un alumno dado de baja, US-08) → el mismo mensaje "Acceso no habilitado".
- Una vez autenticado, el usuario queda con los roles que tenga asignados. Una misma persona puede tener más de un rol (ej: propietaria + profesora) y sus permisos son la unión de los de cada rol. Quien es propietaria y profesora alterna entre los dos paneles con el selector del menú.
- La sesión dura **8 horas** (`JWT_EXPIRES_IN` del back). Al vencer, o ante cualquier respuesta 401, el front borra la sesión y vuelve al login.
- El token solo prueba quién es el usuario: los roles y el estado se releen de la base en cada pedido. Si a un usuario le quitan un rol o lo dan de baja, rige desde su pedido siguiente.
- Los intentos de un correo no registrado o de un usuario inactivo quedan en la auditoría (log del back).
- En desarrollo existe un login por email (`LOGIN_DESARROLLO=true`), con las mismas reglas y auditado. No se habilita en producción.

## 8. Criterios de aceptación

- [ ] Login con cuenta de Google válida y ya registrada → ingresa correctamente y va al inicio de su rol
- [ ] Login con cuenta de Google válida no registrada → muestra mensaje de acceso no habilitado
- [ ] Login de un usuario inactivo → muestra mensaje de acceso no habilitado
- [ ] Login cancelado a mitad del proceso → no genera sesión
- [ ] Intentar acceder a una ruta protegida sin sesión → redirige al login
- [ ] Sesión vencida → vuelve al login

## 9. Casos borde / Errores

- Ventana de Google bloqueada por el navegador → mensaje para habilitar las ventanas emergentes
- Token de Google inválido o expirado, o email no verificado → "No pudimos validar tu cuenta de Google"
- Email ya vinculado a otra cuenta de Google → no entra
- Error de red al validar el token con el backend
- Usuario con sesión ya activa intenta volver al login → redirigir al inicio de su rol
- Navegador sin almacenamiento (modo privado) → la sesión vive solo en memoria y se pierde al recargar

## 10. Dependencias

- Backend: `POST /api/v1/auth/google`, `GET /api/v1/auth/me` (usuario, roles y permisos) y `POST /api/v1/auth/logout`
- Google Identity Services configurado (Client ID en el front y en el back)
- US-05 y US-07 (alta del usuario del alumno y su activación con el primer pago)

## 11. Notas de implementación (Front)

- Se hizo primero con mocks (MSW), con un selector de usuarios de prueba.
- Complejidad: Media
- Usa Google Identity Services con el botón oficial (`@react-oauth/google`) montado sobre el botón con el diseño de MiFR.
- El token vive en memoria y en `sessionStorage` (se borra al cerrar el navegador; nunca en `localStorage`) y viaja como `Bearer`. Pendiente del back: pasar a cookie `httpOnly` con refresh.
- Los permisos efectivos que devuelve el login alimentan `usePermissions()` y `<Can permission="...">`, que ocultan menús y botones. El back valida igual cada pedido.
