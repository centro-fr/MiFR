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
- [ ] Pantalla de login (sin sesión)
- [ ] Loading (autenticando con Google)
- [ ] Éxito → redirección según rol
- [ ] Error (cuenta de Google cancelada / falló la autenticación)
- [ ] Usuario no registrado en el sistema (correo no asociado a ninguna Persona)

## 5. Datos que necesita
### Datos que muestra:
- Logo de MiFR
- Botón "Iniciar sesión con Google"
- Mensajes de error claros

### Datos que obtiene de Google:
- email
- nombre
- apellido
- foto de perfil (opcional)

### Datos que envía al backend:
- Token de Google / ID token

## 6. Acciones del usuario
- Hacer clic en “Iniciar sesión con Google”
- Cancelar el popup de Google
- Reintentar si falla

## 7. Reglas de negocio
- El sistema **no almacena contraseñas**.
- Al iniciar sesión por primera vez, el backend debe verificar si el correo ya está asociado a una Persona existente.
- Si el correo no está registrado → mostrar mensaje de “Acceso no habilitado” (no se crea cuenta automáticamente).
- Una vez autenticado, el usuario queda con el/los roles que tenga asignados.
- Una misma persona puede tener más de un rol (ej: propietaria + profesora).

## 8. Criterios de aceptación
- [ ] Login con cuenta de Google válida y ya registrada → ingresa correctamente
- [ ] Login con cuenta de Google válida no registrada → muestra mensaje de acceso no habilitado
- [ ] Login cancelado a mitad del proceso → no genera sesión
- [ ] Intentar acceder a una ruta protegida sin sesión → redirige al login

## 9. Casos borde / Errores
- Popup de Google bloqueado por el navegador
- Token de Google inválido o expirado
- Error de red al validar el token con el backend
- Usuario con sesión ya activa intenta volver al login → redirigir al dashboard correspondiente

## 10. Dependencias
- Backend: endpoint de validación de token de Google + devolución de roles
- Google Identity Services configurado (Client ID)

## 11. Notas de implementación (Front)
- Se puede (y debe) hacerse primero con mock del backend
- Complejidad: Media
- Usar Google Identity Services (GIS)
- Guardar el token de forma segura (memoria + httpOnly cookie si es posible, o localStorage con cuidado)