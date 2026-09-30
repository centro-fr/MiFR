# Sprint 1 – Pendientes del backend

Sprint 1: **Autenticación, Accesos y Configuración Base** (según `docs/v.1.1 Sprint 0.pdf`).

| US | Historia | Estado en el back | Responsable |
| --- | --- | --- | --- |
| US-01 | Inicio de sesión con Google Auth | Casi completa | Francisco |
| US-02 | Definición de permisos por rol | Solo el modelo de datos | Francisco |
| US-03 | Alta y administración de actividades y cupos | No empezada | Integrante 2 |
| US-04 | Asignación de profesoras y horarios | No empezada | Integrante 2 |

Fuentes: `docs/specs/01-*` y `docs/specs/02-*`, y `docs/sdd/01-*/tasks.md` y `docs/sdd/02-*/tasks.md` (en `main`).

## Reparto

Francisco ya hizo US-01 (login, esquema de identidad según el DER, tests), así que la mayor parte de lo que falta queda para el otro integrante.

| Integrante | Asignado | Carga |
| --- | --- | --- |
| **Francisco** | Lo que queda de US-01 (`/me`, `logout`) + US-02 completa (catálogo de permisos, `requierePermiso`, matriz) | Menor: sigue en el mismo módulo `gestion-usuarios` que ya conoce |
| **Integrante 2** | US-03 completa + tabla y módulo mínimo de `profesoras` + US-04 completa | Mayor: dos módulos nuevos, tres tablas y la validación de superposición |

Cómo trabajar en paralelo sin bloquearse:

1. **Francisco** arranca por `requierePermiso` y el catálogo de permisos, que es lo que necesita el otro integrante.
2. **Integrante 2** arranca por US-03 protegiendo las rutas con `requiereRol("PROPIETARIA")`, que ya existe. Cuando `requierePermiso` esté listo, se cambia por el permiso correspondiente (ej. `ACTIVIDADES_EDITAR`).
3. Los códigos de permiso de actividades y horarios los define Francisco en el catálogo; Integrante 2 le pasa qué acciones necesita.
4. Las **diferencias a decidir** (final del archivo) se resuelven entre los dos antes de mergear a `dev`.

---

## US-01 – Inicio de sesión con Google Auth

**Responsable:** Francisco

### Hecho

- [x] Tablas `usuarios`, `roles` y `usuario_roles` según el DER.
- [x] `POST /api/auth/google`: verifica el `id_token` con Google (`google-auth-library`) y emite un JWT propio con los roles.
- [x] Solo entra quien ya fue dado de alta (sin auto-registro); vinculación de `google_id` por email en el primer login.
- [x] Usuario `INACTIVO` → 403; token de Google inválido → 401; no registrado → 403 `USUARIO_NO_REGISTRADO`.
- [x] Middlewares `requiereSesion` y `requiereRol`.
- [x] Tests unitarios.

### Pendiente

- [ ] **`GET /api/auth/me`**: devuelve el perfil, los roles y los permisos efectivos del usuario de la sesión (RF-03 del SDD). El front lo necesita para recuperar la sesión al recargar.
- [ ] **`POST /api/auth/logout`** (figura en el SDD). Con JWT sin estado alcanza con que el front descarte el token; tiene sentido si se pasa a cookie `httpOnly`, que la spec menciona como preferible.
- [ ] **Auditoría de logins fallidos** (RNF-04): el DER no tiene tabla para esto. Decidir si se agrega al DER o, por ahora, alcanza con los logs.

---

## US-02 – Definición de permisos por rol

**Responsable:** Francisco

### Hecho

- [x] Tablas `permisos` y `rol_permisos` según el DER.
- [x] `PermisoService.tienePermiso(usuario, codigo)`: unión de los permisos de todos los roles del usuario (multi-rol).

### Pendiente

- [ ] **Catálogo de permisos en el seed**: definir los códigos por módulo (ej. `ACTIVIDADES_EDITAR`, `HONORARIOS_VER`, `SEGURIDAD_MATRIZ_EDITAR`) y la matriz inicial `rol_permisos` por rol. Hoy la tabla `permisos` está vacía.
- [ ] **Middleware `requierePermiso("CODIGO")`**: hoy las rutas solo controlan el rol (`requiereRol("PROPIETARIA")`); la spec pide validar el permiso en el back.
- [ ] **`GET /api/seguridad/matriz`**: roles, permisos agrupados por `modulo` y estado actual de la matriz. Solo propietaria.
- [ ] **`PUT /api/seguridad/matriz`**: actualiza `rol_permisos`. Solo propietaria.
- [ ] **Regla**: a la propietaria no se le pueden quitar los permisos críticos (administración de permisos, finanzas).
- [ ] **Regla**: los datos financieros (honorarios, rendición de efectivo, reportes de cobranza) solo los ve la propietaria.
- [ ] **Permisos efectivos en la respuesta del login y de `/me`**, para que el front arme `usePermissions()` y `<Can>`.
- [ ] Tests del middleware, de la matriz y de los permisos críticos.

---

## US-03 – Alta y administración de actividades y cupos

**Responsable:** Nicolas

La tabla `actividades` ya está en el DER (`codigo`, `nombre`, `descripcion`, `modalidad GRUPAL|PERSONALIZADA`, `cupo_maximo`, `activo`), pero no en `schema.prisma`.

### Pendiente

- [ ] Modelo `actividades` en Prisma + migración (con los CHECK del SQL de EA: `ck_actividades_modalidad`, `ck_actividades_x1`, `ck_actividades_x2`).
- [ ] Módulo `modules/gestion-servicio-entrenamiento/actividad/` (repository, service, controller, routes, schemas) con su interfaz según la vista arquitectónica (`ILogicaServicioEntrenamiento`).
- [ ] Endpoints: listar (con filtro / búsqueda), obtener, crear, editar, baja lógica (`activo = false`).
- [ ] **Reglas**:
  - [ ] La modalidad es obligatoria.
  - [ ] En `PERSONALIZADA` el cupo máximo es obligatorio; en `GRUPAL` es opcional.
  - [ ] Cupo máximo mayor a 0.
  - [ ] Sin `codigo` duplicado (UK del DER).
  - [ ] Se puede cambiar la modalidad de una actividad existente.
  - [ ] La baja no borra el historial de clases dictadas.
  - [ ] Al dar de baja una actividad con horarios activos, advertir. La parte de "alumnos inscriptos" depende de inscripciones (Sprint 2).
- [ ] Protegido con permiso (US-02); solo propietaria.
- [ ] Tests del service y de las rutas.

---

## US-04 – Asignación de profesoras y horarios a actividades

**Responsable:** Nicolas

`horarios.id_profesora` referencia a la tabla `profesoras`, no a `usuarios`. En la vista arquitectónica, `Horario` requiere `IInfoProfesores` de `GestionPersonas`.

### Pendiente

- [ ] Modelos `profesoras` y `horarios` en Prisma + migración, según el DER.
- [ ] Módulo mínimo `modules/gestion-personas/profesor/` que provea `IInfoProfesores` (alta de profesora vinculada a un usuario con rol `PROFESORA`, listado).
- [ ] Módulo `modules/gestion-servicio-entrenamiento/horario/` con CRUD y filtros por actividad y por profesora.
- [ ] **Reglas**:
  - [ ] Solo se asignan usuarios con rol `PROFESORA`.
  - [ ] La misma profesora no puede tener dos horarios superpuestos el mismo día.
  - [ ] `hora_fin` posterior a `hora_inicio`.
  - [ ] El cupo se hereda de la actividad y se puede sobrescribir en el horario.
  - [ ] Una misma actividad puede tener varios horarios con distintas profesoras.
  - [ ] Baja de horario (`fecha_baja`); advertir si tiene alumnos inscriptos (depende de Sprint 2).
  - [ ] Qué pasa con los horarios de una profesora dada de baja.
- [ ] Protegido con permiso (US-02); solo propietaria.
- [ ] Tests del service (especialmente la superposición) y de las rutas.

---

## Diferencias a decidir antes de seguir

**Responsables:** los dos

- [ ] **Prefijo de la API**: el SDD usa `/api/v1/...` y el código usa `/api/...`.
- [x] **Tabla `modulos`**: decidido, **no se crea**. El DER se mantiene como está: el módulo de cada permiso es la columna `permisos.modulo`. La matriz de US-02 agrupa los permisos por ese campo.
- [ ] **Nombre del componente**: en la vista arquitectónica es `Rol` y en el código la carpeta es `permiso/`.
- [ ] **Presentación → `IAutenticacion`**: el login usa `IAutenticacion`, pero en la vista arquitectónica de EA ningún componente de presentación la requiere. Agregar en EA que `UsuarioPresWeb` requiere `IAutenticacion`.
