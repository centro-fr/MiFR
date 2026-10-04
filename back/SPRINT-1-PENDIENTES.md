# Sprint 1 – Pendientes del backend

Sprint 1: **Autenticación, Accesos y Configuración Base** (según `docs/v.1.1 Sprint 0.pdf`).

| US | Historia | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-01 | Inicio de sesión con Google Auth | Completa | Francisco |
| US-02 | Definición de permisos por rol | Completa | Francisco |
| US-03 | Alta y administración de actividades y cupos | Completa | Nicolas |
| US-04 | Asignación de profesoras y horarios | Completa | Nicolas |

Fuentes: `docs/specs/01-*` y `docs/specs/02-*`, y `docs/sdd/01-*/tasks.md` y `docs/sdd/02-*/tasks.md` (en `main`).

## Reparto

Francisco ya hizo US-01 (login, esquema de identidad según el DER, tests), así que la mayor parte de lo que falta queda para el otro integrante.

| Integrante | Asignado | Carga |
| --- | --- | --- |
| **Francisco** | Lo que queda de US-01 (`/me`, `logout`) + US-02 completa (catálogo de permisos, `requierePermiso`, matriz) | Menor: sigue en el mismo módulo `gestion-usuarios` que ya conoce |
| **Integrante 2** | US-03 completa + tabla y módulo mínimo de `profesoras` + US-04 completa | Mayor: dos módulos nuevos, tres tablas y la validación de superposición |

Cómo trabajar en paralelo sin bloquearse:

1. **Francisco** arranca por `requierePermiso` y el catálogo de permisos, que es lo que necesita el otro integrante.
2. **Integrante 2** protege las rutas de US-03 y US-04 con `requierePermiso` (ya está listo; ver los códigos al final de US-02).
3. Los códigos de permiso de actividades y horarios los define Francisco en el catálogo; Integrante 2 le pasa qué acciones necesita.
4. Las **diferencias a decidir** (final del archivo) se resuelven entre los dos antes de mergear a `dev`.

---

## US-01 – Inicio de sesión con Google Auth

**Responsable:** Francisco

### Hecho (US-01)

- [x] Tablas `usuarios`, `roles` y `usuario_roles` según el DER.
- [x] `POST /api/v1/auth/google`: verifica el `id_token` con Google (`google-auth-library`) y emite un JWT propio con los roles.
- [x] Solo entra quien ya fue dado de alta (sin auto-registro); vinculación de `google_id` por email en el primer login.
- [x] Usuario `INACTIVO` → 403; token de Google inválido → 401; no registrado → 403 `USUARIO_NO_REGISTRADO`.
- [x] Middlewares `requiereSesion` y `requiereRol`.
- [x] Tests unitarios.

### Pendiente (US-01)

- [x] **`GET /api/v1/auth/me`**: devuelve el usuario, los roles y los permisos efectivos (RF-03 del SDD). Relee el usuario de la base: si lo dieron de baja después del login responde 403.
- [x] **`POST /api/v1/auth/logout`** (figura en el SDD). Con JWT sin estado solo confirma; el front descarta el token. Queda listo para cuando se pase a cookie `httpOnly`.
- [x] **Auditoría** (RNF-04): decidido, por ahora va a los logs y el DER no cambia. `shared/utils/auditoria.ts` escribe una línea JSON por evento: login de un correo no registrado o de un usuario inactivo, cambios de la matriz, asignación y baja de roles, y cambios de estado de un usuario.
- [x] **`GET` y `PATCH /api/v1/usuarios/:id`**: cada usuario ve y edita sus propios datos; para los de otro hace falta `USUARIOS_VER` o `USUARIOS_EDITAR`. Cambiar el `estado` siempre pide `USUARIOS_EDITAR`, aunque sea el propio.

---

## US-02 – Definición de permisos por rol

**Responsable:** Francisco

### Hecho (US-02)

- [x] Tablas `permisos` y `rol_permisos` según el DER.
- [x] `RolService.tienePermiso(idUsuario, codigo)`: unión de los permisos de todos los roles del usuario (multi-rol).

### Pendiente (US-02)

- [x] **Catálogo de permisos**: `rol/rol.catalogo.ts` define los códigos por módulo (`SEGURIDAD`, `USUARIOS`, `ACTIVIDADES`, `HORARIOS`, `ALUMNOS`, `PLANES`, `PAGOS`, `HONORARIOS`, `ASISTENCIAS`, `RUTINAS`, `REPORTES`), los críticos, los exclusivos de la propietaria y la matriz inicial. El seed lo carga en `permisos` y `rol_permisos`; volver a correrlo no pisa los cambios que haya hecho la propietaria.
- [x] **Middleware `requierePermiso(autorizacion, "CODIGO")`** en `shared/middlewares/auth.ts`. Decide con los roles de la base, no con los del JWT, así un cambio en la matriz rige desde la próxima petición. Las rutas de usuarios ya lo usan (`USUARIOS_VER`, `USUARIOS_EDITAR`).
- [x] **`GET /api/v1/seguridad/matriz`**: roles, permisos agrupados por `modulo` (con `critico`) y la matriz por rol. Rol `PROPIETARIA` + `SEGURIDAD_MATRIZ_VER`.
- [x] **`PUT /api/v1/seguridad/matriz`**: body `{ cambios: [{ rol, permiso, otorgado }] }`; inserta o borra filas de `rol_permisos` en una transacción. Rol `PROPIETARIA` + `SEGURIDAD_MATRIZ_EDITAR`.
- [x] **Regla**: a la propietaria no se le pueden quitar los permisos críticos → 400 `PERMISO_CRITICO_INMUTABLE`.
- [x] **Regla**: los permisos financieros y de seguridad no se le pueden otorgar a otro rol → 400 `PERMISO_EXCLUSIVO_PROPIETARIA`.
- [x] **Permisos efectivos en la respuesta del login y de `/me`** (`permisos: string[]`), para `usePermissions()` y `<Can>`.
- [x] Tests del middleware, del catálogo, del service de la matriz, de las rutas y de los permisos críticos.

Permisos disponibles para US-03 y US-04: `ACTIVIDADES_VER`, `ACTIVIDADES_EDITAR`, `HORARIOS_VER`, `HORARIOS_EDITAR`. Uso:

```ts
router.post("/", requierePermiso(autorizacion, "ACTIVIDADES_EDITAR"), validate({ body: ... }), asyncHandler(...));
```

---

## US-03 – Alta y administración de actividades y cupos

**Responsable:** Nicolas

La tabla `actividades` ya está en el DER (`codigo`, `nombre`, `descripcion`, `modalidad GRUPAL|PERSONALIZADA`, `cupo_maximo`, `activo`), pero no en `schema.prisma`.

### Pendiente (US-03)

- [x] Modelo `actividades` en Prisma + migración (con los CHECK del SQL de EA: `ck_actividades_modalidad`, `ck_actividades_x1`, `ck_actividades_x2`).
- [x] Módulo `modules/gestion-servicio-entrenamiento/actividad/` (repository, service, controller, routes, schemas) con su interfaz según la vista arquitectónica. `ILogicaServicioEntrenamiento` es del subsistema: va en `gestion-servicio-entrenamiento/interface/` y la realiza `gestion-servicio-entrenamiento.service.ts`, como `GestionUsuariosService` (ver `.claude/rules/patrones.md`, Facade).
- [x] Endpoints: listar (con filtro / búsqueda), obtener, crear, editar, baja lógica (`activo = false`).
- [x] **Reglas**:
  - [x] La modalidad es obligatoria.
  - [x] En `PERSONALIZADA` el cupo máximo es obligatorio; en `GRUPAL` es opcional.
  - [x] Cupo máximo mayor a 0.
  - [x] Sin `codigo` duplicado (UK del DER).
  - [x] Se puede cambiar la modalidad de una actividad existente.
  - [x] La baja no borra el historial de clases dictadas.
  - [x] Una actividad con horarios activos no se puede dar de baja (409): primero se dan de baja sus horarios (CA-03). Cuando existan inscripciones (Sprint 2) se revisa si el bloqueo se limita a horarios con alumnos inscriptos.
- [x] Protegido con permiso (US-02); solo propietaria.
- [x] Tests del service y de las rutas.

---

## US-04 – Asignación de profesoras y horarios a actividades

**Responsable:** Nicolas

`horarios.id_profesora` referencia a la tabla `profesoras`, no a `usuarios`. En la vista arquitectónica, `Horario` requiere `IInfoProfesores` de `GestionPersonas`.

### Pendiente (US-04)

- [x] Modelos `profesoras` y `horarios` en Prisma + migración, según el DER.
- [x] Módulo mínimo `modules/gestion-personas/profesor/` que provea `IInfoProfesores` (alta de profesora vinculada a un usuario con rol `PROFESORA`, listado).
- [x] Módulo `modules/gestion-servicio-entrenamiento/horario/` con CRUD y filtros por actividad y por profesora.
- [x] **Reglas**:
  - [x] Solo se asignan usuarios con rol `PROFESORA`.
  - [x] La misma profesora no puede tener dos horarios superpuestos el mismo día.
  - [x] `hora_fin` posterior a `hora_inicio`.
  - [x] El cupo se hereda de la actividad y se puede sobrescribir en el horario.
  - [x] Una misma actividad puede tener varios horarios con distintas profesoras.
  - [x] Baja de horario (`fecha_baja`); advertir si tiene alumnos inscriptos (depende de Sprint 2).
  - [x] Una profesora no puede darse de baja mientras tenga horarios activos; primero se dan de baja los horarios y se conserva el historial.
- [x] Protegido con permiso (US-02); solo propietaria.
- [x] Tests del service (especialmente la superposición) y de las rutas.

---

## Diferencias a decidir antes de seguir

**Responsables:** los dos

- [x] **Prefijo de la API**: decidido, **`/api/v1`** como en el SDD. `app.ts` monta todas las rutas bajo ese prefijo; los módulos nuevos se agregan al router `api` de `app.ts`.
- [x] **Tabla `modulos`**: decidido, **no se crea**. El DER se mantiene como está: el módulo de cada permiso es la columna `permisos.modulo`. La matriz de US-02 agrupa los permisos por ese campo.
- [x] **Nombre del componente**: decidido, **manda el diagrama**. La carpeta es `rol/` y las clases `RolService` y `RolRepository`.
- [x] **Presentación → `IAutenticacion` / `IAutorizacion`**: decidido, **EA no cambia**. La presentación solo usa `ILogicaUsuarios`, que en el diagrama provee el subsistema. `gestion-usuarios/gestion-usuarios.service.ts` la realiza y reparte a `Sesion`, `Usuario` y `Rol`: login, `/me`, usuarios y matriz pasan por ahí. `IAutenticacion` e `IAutorizacion` quedan para los middlewares y los otros subsistemas.
