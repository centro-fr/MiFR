# Relevamiento de Código a Limpiar y Depurar – MiFR

Este documento consolida todas las funcionalidades, componentes, endpoints y campos que **no se utilizan o fueron dados de baja** en el alcance del sistema, para guiar una refactorización y limpieza técnica ordenada sin romper la estabilidad del repositorio.

---

## 1. Asistencia: Campo "Observaciones" (US-20)

### Motivo
La toma de asistencia se realiza mediante marcado rápido binario (**Presente / Ausente**). La interfaz de usuario no dispone de carga de texto y no se requiere asentar notas por alumno en la lista de clase.

### Archivos y líneas a depurar
* **Frontend:**
  * `front/src/features/asistencia/components/registro-asistencia.tsx`:
    * Quitar renderizado de `{inscripto.observaciones && <p ...>{inscripto.observaciones}</p>}` (líneas ~150-152 y ~412-414).
  * `front/src/features/asistencia/components/toma-de-asistencia.tsx`:
    * Quitar `inscripto.observaciones` del cálculo de `aviso` (línea 107).
  * `front/src/features/asistencia/schemas/asistencia.ts`:
    * Quitar `observaciones: z.string().nullable()` del esquema de lectura y mutación.
* **Backend:**
  * `back/src/modules/gestion-inscripciones-y-clases/asistencia/asistencia.schemas.ts`:
    * Quitar `observaciones: textoOpcionalSchema(255).optional()` en `marcarAsistenciaSchema`.
  * `back/src/modules/gestion-inscripciones-y-clases/asistencia/asistencia.repository.ts`:
    * Quitar la asignación y retorno de `observaciones` en el query de marcar y consultar asistencia.
  * `back/src/modules/gestion-inscripciones-y-clases/asistencia/asistencia.service.ts`:
    * Quitar mapeo de `observaciones`.
  * `back/src/modules/gestion-inscripciones-y-clases/asistencia/asistencia.types.ts`:
    * Remover el atributo `observaciones` de las interfaces `MarcaDeAsistencia`, `InscriptoConAsistencia`, etc.
* **Base de datos (Prisma):**
  * `back/prisma/schema.prisma`: Eventual migración para prescindir de la columna `observaciones VARCHAR(255)` en la tabla `asistencias`.

---

## 2. Inactivos: Estados de Gestión y Pantalla Huérfana (US-22)

### Motivo
La pantalla `/app/ausentes` no está integrada al menú de navegación (`owner-navigation.ts`), y el flujo de trabajo no requiere gestionar estados de seguimiento (`CONTACTADO`, `GESTIONADO`, `IGNORADO`). Si se mantiene la detección de ausentes con cuota al día, debe ser exclusivamente como consulta informativa/alerta con accesos de contacto (WhatsApp/teléfono), sin almacenamiento de estados de gestión.

### Archivos y componentes a depurar
* **Frontend:**
  * `front/src/features/inactivos/components/modal-gestion-inactividad.tsx`:
    * **Código muerto:** Este modal no se importa ni se utiliza en ninguna parte de la aplicación. Eliminar archivo.
  * `front/src/features/inactivos/pages/ausentes-page.tsx`:
    * Quitar botones de mutación rápida (`handleContactar`, `handleIgnorar`, `handleRevertir`), las pestañas de estados (`PENDIENTE`, `CONTACTADO`, `IGNORADO`) y badges de gestión.
    * Si la pantalla directamente no se utilizará en la versión final, desregistrar la ruta `/app/ausentes` y la redirección `/app/asistencia` en `front/src/app/router.tsx`.
  * `front/src/features/inactivos/api/inactivos-api.ts`:
    * Quitar las funciones `registrarSeguimiento` (PUT) y `quitarSeguimiento` (DELETE).
  * `front/src/mocks/handlers/inactivos.ts`:
    * Quitar handlers de mutación de seguimiento.
* **Backend:**
  * `back/src/modules/reportes/detector-inactividad/detector-inactividad.routes.ts`:
    * Quitar endpoints `PUT /informes/alumnos-inactivos/:idInscripcion/seguimiento` y `DELETE /informes/alumnos-inactivos/:idInscripcion/seguimiento`.
  * `back/src/modules/reportes/detector-inactividad/detector-inactividad.controller.ts`:
    * Quitar métodos controladores de seguimiento.
  * `back/src/modules/reportes/detector-inactividad/detector-inactividad.service.ts`:
    * Quitar métodos `registrarSeguimiento` y `quitarSeguimiento`.
  * `back/src/modules/gestion-inscripciones-y-clases/asistencia/asistencia.repository.ts`:
    * Quitar métodos de persistencia sobre `seguimientos_inactividad`.
* **Base de datos (Prisma):**
  * `back/prisma/schema.prisma`:
    * Eliminar modelo `seguimientos_inactividad` y enum `estado_seguimiento_inactividad`.

---

## 3. Clases: Cancelación Manual de Clases (US-20 y US-21)

### Motivo
En las reglas de negocio actuales **no existe la cancelación de clases**. Si una clase no se dicta (feriado, fuerza mayor, ausencia docente), simplemente no se pasa asistencia y el cierre automático del sistema (US-21) marca a todos los alumnos como presentes para no penalizarlos ni generar inasistencias indebidas.

### Archivos y endpoints a depurar
* **Backend:**
  * `back/src/modules/gestion-inscripciones-y-clases/clase/clase.routes.ts`:
    * Eliminar endpoint `POST /clases/:id/cancelar`.
  * `back/src/modules/gestion-inscripciones-y-clases/clase/clase.controller.ts`:
    * Eliminar controlador de cancelación.
  * `back/src/modules/gestion-inscripciones-y-clases/clase/clase.service.ts`:
    * Quitar métodos `cancelarClase` y `bloquearParaCancelar`.
  * `back/src/modules/gestion-inscripciones-y-clases/clase/clase.repository.ts`:
    * Quitar método `cancelar`.
  * `back/src/modules/gestion-inscripciones-y-clases/clase/clase.openapi.ts`:
    * Quitar especificación OpenAPI de `POST /clases/{id}/cancelar`.
* **Frontend:**
  * `front/src/types/suplencia.ts`:
    * Limpiar `"CANCELADA"` de `EstadoClase = "PROGRAMADA" | "DICTADA" | "CANCELADA"`.

---

## 4. Reportes Obsoletos / Eliminados (US-26, US-33, US-34)

### Motivo
Fueron dados de baja del backlog por redundancia operativa o desuso en el negocio.

### Archivos a depurar
* **US-33 (Reporte mensual de asistencia):**
  * `front/src/features/reportes/pages/informe-asistencia-page.tsx`
  * `front/src/features/reportes/components/informe-asistencia-imprimible.tsx`
  * `front/src/features/reportes/hooks/use-exportar-asistencia.ts`
  * `front/src/features/reportes/utils/exportar-asistencia.ts`
  * `front/src/features/reportes/schemas/informe-asistencia.ts`
  * Endpoints o handlers de reporte de asistencia en `reportes-api.ts`.
* **US-26 (Alertas tempranas automáticas de inactividad por email/notificación):**
  * Limpiar cualquier cron job o servicio de envío automático de alertas por inactividad no solicitado.
* **US-34 (Reporte de retención y fidelización):**
  * Verificar que no queden referencias en los esquemas de reportes ni páginas huérfanas.

---

## 5. Roles y Usuarios: Asignación Manual (US-02)

### Motivo
Los roles en el sistema (`PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`) se asignan **automáticamente** al momento del registro vía Google Auth a partir de la pre-inscripción del alumno (US-07) o el alta de la profesora (US-38). No existe panel de administración para crear roles ni asignar perfiles manualmente.

### Puntos a verificar y depurar
* Quitar cualquier vista, modal o formulario que intente listar o asignar roles manualmente a los usuarios.
* Los endpoints de roles en backend solo deben mantenerse para consulta interna de RBAC (middleware de autorización).

---

## 6. Pagos: Comprobantes Adjuntos en Transferencias (US-16 / US-17)

### Motivo
Las transferencias bancarias no suben archivos físicos ni imágenes de comprobante; solo se informan los datos de la operación (monto, fecha/hora, titular de cuenta de origen y observaciones opcionales) para que la propietaria concilie con su extracto bancario.

### Puntos a verificar y depurar
* Quitar referencias a subida de archivos, campos `comprobante_url` o almacenamiento en buckets S3/local para transferencias que hayan quedado de versiones previas.

---

## 7. Profesoras: Campos innecesarios en Ficha (US-38)

### Motivo
En el alta y edición de profesoras solo se utilizan: nombre, apellido, email, teléfono, fecha de nacimiento ($\ge 18$ años) y especialidad.

### Puntos a verificar y depurar
* Asegurar que no queden campos como `dni`, `direccion` o estructuras complejas de horarios fijos en los formularios ni schemas de profesoras (`front/src/features/profesoras/schemas/profesora.ts`).
