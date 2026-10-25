# US-02 – Definición de permisos por rol

## Estado de la historia

- **Estado:** Descartada
- **Fecha y sprint:** Sprint 4 – 25/10/2026
- **Motivo:** El equipo vio que no hacía falta un panel de permisos, ya que la propietaria (dueña del centro) no lo quiere.
- **Decidido por:** Equipo FR
- **Reemplazo:** Ninguna

El resto del documento queda como registro de lo que se había planificado.

## 1. Información general

- **Épica:** Autenticación y Seguridad
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 1

## 2. Objetivo

Definir y controlar qué funciones y datos puede ver o modificar cada rol (Propietaria, Profesora, Alumno/Tutor) para proteger la información sensible del centro.

## 3. Descripción

Como propietaria, quiero definir qué funciones y datos puede ver o modificar cada rol (propietaria, profesora, alumno/tutor) para proteger la información sensible según el sistema de permisos.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando roles y permisos)
- [ ] Vista de matriz de permisos (rol × funcionalidad)
- [ ] Guardando cambios
- [ ] Éxito (permisos actualizados)
- [ ] Error al guardar
- [ ] Sin permisos (solo la propietaria puede acceder a esta pantalla)

## 5. Datos que necesita

### Datos que muestra

- Lista de roles: Propietaria, Profesora, Alumno/Tutor
- Lista de funcionalidades / módulos del sistema
- Estado actual de cada permiso (puede ver / puede modificar / no tiene acceso)

### Datos que envía

- Cambios en la matriz de permisos

## 6. Acciones del usuario

- Ver la matriz de permisos actual
- Activar / desactivar permisos por rol
- Guardar cambios
- Cancelar cambios

## 7. Reglas de negocio

- Solo el rol **Propietaria** puede acceder a esta funcionalidad.
- Los datos financieros (honorarios, rendición de efectivo, reportes de cobranza) son visibles **únicamente** para la propietaria.
- Una misma persona puede tener más de un rol activo al mismo tiempo (ej: propietaria que también dicta clases).
- Los permisos se aplican en el frontend (ocultar menús/botones) y se validan también en el backend.
- El rol Propietaria siempre tiene acceso total (no se le pueden quitar permisos críticos).

## 8. Criterios de aceptación

- [ ] Una profesora no puede acceder a la sección de honorarios de otras profesoras
- [ ] Un alumno no puede acceder a la administración de planes ni de alumnos
- [ ] Una persona con rol Propietaria + Profesora ve ambos conjuntos de funciones
- [ ] Los cambios de permisos se reflejan inmediatamente después de guardar (o al volver a iniciar sesión)

## 9. Casos borde / Errores

- Intentar quitarle a la propietaria permisos críticos → no debe permitirse
- Usuario con dos roles: se deben unir los permisos de ambos roles
- Error de red al guardar → mantener los valores anteriores y mostrar mensaje

## 10. Dependencias

- Backend: endpoints para obtener y actualizar la matriz de permisos
- US-01 (el usuario debe estar autenticado y tener rol)

## 11. Notas de implementación (Front)

- Se puede implementar primero con una matriz mockeada
- Complejidad: Media-Alta
- Recomendación: crear un sistema centralizado de permisos (ej: `usePermissions()` + componente `<Can permission="...">`)
- Los menús laterales y botones deben ocultarse según los permisos del usuario logueado
