# US-39 – Consulta y edición de perfil de usuario

## 1. Información general

- **Épica:** Autenticación y Seguridad
- **Prioridad:** Media
- **Actor principal:** Usuario autenticado (Propietaria, Profesor/a, Alumno/a, Tutor/a)
- **Sprint sugerido:** Sprint 5 / Backlog

## 2. Objetivo

Permitir que cualquier persona usuaria del sistema autenticada consulte su información registrada y mantenga actualizados sus datos de contacto directo (teléfono y contacto de emergencia), visualizando sus roles activos y estado en el centro, sin comprometer datos sensibles ni alterar su identidad autenticada por Google OAuth.

## 3. Descripción

Como usuario/a del sistema (propietaria, profesora, alumno o tutor), quiero acceder a mi sección de **Perfil** para consultar mis datos de cuenta y actualizar mi teléfono de contacto y persona de emergencia, garantizando que el centro disponga de canales de comunicación vigentes ante cualquier eventualidad.

## 4. Estados de la pantalla / flujo

- [ ] **Loading**: cargando datos de la sesión y perfil (`GET /api/v1/auth/me`).
- [ ] **Vista principal de Perfil (lectura)**: organizada en tarjetas con estética estándar:
  - Tarjeta de Identidad y Cuenta (nombre, email, avatar/iniciales, roles con badges temáticos).
  - Tarjeta de Información de Contacto (teléfono personal, contacto de emergencia).
  - Tarjeta informativa según rol (para alumno: plan vigente y fecha de vencimiento; para profesora: especialidad docente).
- [ ] **Modal flotante centrado de edición ("Editar datos de contacto")**: formulario accesible para modificar teléfonos.
- [ ] **Guardando cambios**: estado pendiente con spinner y botones deshabilitados.
- [ ] **Éxito**: toast de confirmación y actualización reactiva de los datos en pantalla.
- [ ] **Error de validación**: indicación clara en campo si el teléfono no cumple formato numérico válido.
- [ ] **Error de red / servidor**: alerta con botón de reintento.

## 5. Datos que necesita

### Datos que muestra (modo lectura)

- **Nombre completo**: nombre y apellido registrados al momento del alta.
- **Email de cuenta**: correo electrónico verificado vinculado a Google Auth.
- **Roles activos**: etiquetas visuales (*badges*) de los roles asignados (`PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`).
- **Teléfono de contacto**: número principal del usuario.
- **Contacto de emergencia**: nombre del contacto y teléfono de urgencias.
- **Detalle contextual del rol** (informativo de solo lectura):
  - Alumnos: nombre del plan asignado, fecha de vencimiento de cuota y estado de habilitación.
  - Profesoras: especialidad y fecha de ingreso.

### Datos que SÍ se pueden editar (por el propio usuario)

- **Teléfono personal**: obligatorio, entre 8 y 20 caracteres (dígitos y símbolos telefónicos estándar `+`, `-`, espacios).
- **Nombre de contacto de emergencia**: opcional, hasta 60 caracteres.
- **Teléfono de contacto de emergencia**: opcional, entre 8 y 20 caracteres.

### Datos que NO se pueden editar directamente (Protegidos)

- **Email**: inmutable, provisto y certificado por Google OAuth (US-01).
- **Nombre y apellido**: gestionados administrativamente en altas y modificaciones oficiales (US-05, US-09, US-38) para preservar trazabilidad legal y financiera.
- **Roles y permisos**: asignados estrictamente por la administración (US-02).
- **Planes, precios, cuotas y asistencias**: gestionados por los módulos correspondientes.

## 6. Acciones del usuario

1. Acceder a la opción **"Perfil"** desde el menú lateral (desktop) o desde la barra inferior / drawer (mobile).
2. Revisar sus datos personales, roles activos y datos de contacto vigentes.
3. Presionar el botón de acción *"Editar contacto"*.
4. Modificar su teléfono personal o información de emergencia en el modal centrado.
5. Guardar los cambios o cancelar la operación.

## 7. Reglas de negocio

1. **Principio de Mínimo Privilegio y Seguridad (OWASP)**:
   - El endpoint de actualización no recibe `id_usuario` en la URL ni en el body: el backend obtiene la identidad exclusivamente a partir del token JWT validado (`req.usuario.id_usuario`). Ningún usuario puede alterar el perfil de otra persona a través de este endpoint.
2. **Inmutabilidad de Identidad Google**:
   - El correo electrónico no es editable. Si la persona cambia su cuenta de Google, dicho cambio debe gestionarse administrativamente.
3. **Consistencia de Roles Múltiples**:
   - Quien posea doble rol (por ejemplo, Propietaria y Profesora) comparte un único perfil de persona; actualizar el teléfono impacta en todo el sistema sin requerir duplicación de acciones.
4. **Validación y Sanitización**:
   - Toda entrada de teléfono se sanitiza y valida en backend mediante esquema Zod / validator, rechazando caracteres sospechosos o cadenas vacías en campos obligatorios.
5. **Auditoría**:
   - La modificación de datos de contacto propios se registra en el log estructurado de auditoría del backend.

## 8. Criterios de aceptación

- [ ] **CA-01 (Acceso y visualización)**: Cualquier usuario autenticado puede ingresar a `/app/perfil` desde el menú y visualizar sus datos reales provistos por el backend.
- [ ] **CA-02 (Edición exitosa de contacto)**: Modificar el teléfono con un formato válido y presionar "Guardar" → guarda en la base de datos, muestra notificación de éxito y refleja el cambio inmediatamente.
- [ ] **CA-03 (Bloqueo de campos críticos)**: Los campos de nombre, apellido, email y roles se muestran bloqueados o en formato de solo lectura, sin inputs editables.
- [ ] **CA-04 (Validación de teléfono)**: Ingresar un teléfono inválido (ej. letras o menos de 8 dígitos) → bloquea el envío y muestra mensaje de validación descriptivo.
- [ ] **CA-05 (Mobile-First y consistencia)**: La pantalla cumple con la estructura estándar (`OwnerLayout`, tipografía de títulos `tracking-tight`, modal flotante centrado de edición y touch targets $\ge 48$px).

## 9. Casos borde / Errores

- **Falla de conexión al actualizar**: Muestra mensaje de error sin cerrar el modal para que el usuario no pierda lo escrito.
- **Intento de inyección o campos adicionales**: El backend descarta cualquier campo no permitido en el esquema de actualización (`strip` o error 400).
- **Usuario dado de baja en segundo plano**: Si el usuario es dado de baja mientras está en la pantalla, la llamada al endpoint devuelve 403/401 y el sistema redirige automáticamente al login.

## 10. Dependencias

- **US-01**: Inicio de sesión con Google Auth y emisión de token JWT.
- **US-02**: Catálogo de roles y permisos.
- **MENUS.md**: Definición de la opción "Perfil" en la barra de navegación de todos los roles.

## 11. Notas de implementación técnica

### Backend sugerido
- **Ruta**: `PATCH /api/v1/auth/me/perfil` (o `PUT /api/v1/usuarios/mi-perfil`)
- **Autenticación**: Middleware `requiereAutenticacion` (cualquier rol autenticado activo).
- **Payload esperado**:
  ```json
  {
    "telefono": "+54 9 11 5555-1234",
    "contacto_emergencia_nombre": "María Gómez",
    "contacto_emergencia_telefono": "+54 9 11 5555-5678"
  }
  ```

### Frontend sugerido
- **Página**: `front/src/features/perfil/pages/perfil-page.tsx`
- **Componentes**: `CardDatosCuenta`, `CardContactoUsuario`, `ModalEditarContacto`
- **Ruta**: `/app/perfil` en `router.tsx` (reemplazando la entrada provisoria en `SECCIONES_EN_CONSTRUCCION`).
