# US-38 – Gestión del plantel de profesoras (ABMC)

## 1. Información general

- **Épica:** Configuración Base
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint:** Sprint 4 / Sprint 5

## 2. Objetivo

Permitir a la Propietaria administrar el plantel de profesoras del centro de entrenamiento (altas directas, especialidades, consultas operativas y bajas lógicas protegidas), asegurando que solo docentes activas puedan recibir horarios, clases, suplencias y liquidación de honorarios.

## 3. Descripción

Como propietaria, quiero registrar y gestionar a las profesoras del gimnasio cargando sus datos personales y especialidad en un único flujo de alta directa, para disponer del equipo docente necesario para dictar disciplinas y supervisar las clases semanales a su cargo, impidiendo la baja accidental de docentes con horarios asignados.

## 4. Estados de la pantalla / flujo

- [ ] **Loading**: Cargando el listado del equipo docente y métricas de clases semanales.
- [ ] **Listado de profesoras**: Vista de tarjetas (mobile) o tabla moderna (desktop) que muestra las profesoras activas, sus datos de contacto, especialidad y cantidad de clases semanales a cargo.
- [ ] **Modal de alta directa**: Formulario emergente flotante centrado (`ModalFormProfesora`) para registrar a la docente en un solo paso (nombre, apellido, email de Google, teléfono, fecha de nacimiento y especialidad).
- [ ] **Guardando**: Deshabilitación de botones y spinner mientras se persiste el alta o la baja.
- [ ] **Éxito**: Cierre automático del modal y notificación flotante (toast) confirmando la operación.
- [ ] **Error**: Manejo visual de errores con mensajes específicos (ej. email ya registrado, menor de edad o fallo de conexión).
- [ ] **Confirmación de baja**: Diálogo modal (`ModalBajaProfesora`) que valida si la docente tiene clases asignadas; si tiene clases activas, bloquea la acción indicando cuántos horarios debe reasignar primero.
- [ ] **Empty**: Estado visual amigable cuando no hay profesoras registradas o tras una búsqueda sin coincidencias.

## 5. Datos que necesita

### Datos que muestra

- **Identificador**: `id_profesora`.
- **Nombre y apellido**: Datos de identidad de la docente.
- **Correo electrónico**: Cuenta de Google vinculada para el inicio de sesión.
- **Teléfono de contacto**: Número para coordinación operativa.
- **Especialidad**: Disciplina o enfoque principal (ej. *Pilates Reformer*, *Funcional*, *Musculación*).
- **Fecha de incorporación**: Fecha de alta en el centro.
- **Clases semanales a cargo**: Métrica calculada que contabiliza los horarios semanales activos que dicta en el cronograma.

### Datos que se cargan / editan (Alta Directa)

- **Nombre** (`nombre`): Obligatorio. Texto entre 2 y 60 caracteres.
- **Apellido** (`apellido`): Obligatorio. Texto entre 2 y 60 caracteres.
- **Correo electrónico de Google** (`email`): Obligatorio. Formato válido de email (máx. 120 caracteres) requerido para inicio de sesión mediante Google Auth.
- **Teléfono de contacto** (`telefono`): Obligatorio. Entre 7 y 15 dígitos numéricos.
- **Fecha de nacimiento** (`fecha_nacimiento`): Obligatoria. Formato `AAAA-MM-DD`, validando mayoría de edad (mínimo 18 años).
- **Especialidad** (`especialidad`): Opcional. Texto libre de hasta 80 caracteres.

## 6. Acciones del usuario

- Visualizar el plantel de profesoras activas con sus datos de contacto y carga horaria semanal.
- Buscar o filtrar profesoras en tiempo real por nombre, apellido o especialidad mediante la barra de búsqueda en píldora.
- Dar de alta una nueva profesora mediante el modal flotante centrado de alta directa.
- Solicitar la baja lógica de una profesora.
- Verificar qué horarios semanales tiene asignados antes de concretar una baja.

## 7. Reglas de negocio

1. **Alta Directa Integral**: El alta crea de forma atómica la cuenta de usuario con rol `PROFESORA` y el perfil docente asociado, sin requerir una preexistencia de usuario en el sistema.
2. **Mayoría de Edad**: Toda profesora debe ser mayor de 18 años calculados a la fecha de registro.
3. **Unicidad de Cuenta**: No pueden coexistir dos profesoras con la misma dirección de correo electrónico (`email` único).
4. **Protección Contra Bajas con Clases Asignadas**: Si la profesora tiene uno o más horarios activos en el cronograma semanal (US-04), el sistema **bloquea la baja lógica** informando cuántas clases tiene a cargo e indicando que deben reasignarse o darse de baja primero.
5. **Baja Estrictamente Lógica**: La baja nunca borra registros físicos (`fecha_baja = fechaActualArgentina()`). Esto preserva intacto:
   - El historial de asistencias y clases dictadas (US-20).
   - El registro de suplencias (US-24).
   - Los informes y liquidaciones de honorarios cerrados o en revisión (US-23).
   - El control de cobros y rendiciones de efectivo (US-15 y US-19).
6. **Soporte de Auditoría e Historial**: Las consultas internas admiten el parámetro `incluirBajas=true` para garantizar la reconstrucción de auditorías históricas.
7. **Permisos de Acceso**:
   - Consulta (`GET /api/v1/profesoras`): Requiere permiso `HORARIOS_VER`.
   - Alta y Baja (`POST`, `DELETE /api/v1/profesoras`): Requiere permiso `HORARIOS_EDITAR` y rol `PROPIETARIA`.

## 8. Criterios de aceptación

- [ ] **CA-01 (Alta directa exitosa)**: Completar los datos personales requeridos y guardar → se crea la profesora y se muestra en la grilla.
- [ ] **CA-02 (Rechazo por email duplicado)**: Intentar registrar un correo ya existente → el sistema devuelve conflicto (409) y el formulario resalta el error.
- [ ] **CA-03 (Rechazo por minoría de edad)**: Ingresar fecha de nacimiento con menos de 18 años → validación Zod bloquea el guardado.
- [ ] **CA-04 (Bloqueo de baja con horarios)**: Intentar dar de baja a una docente con clases semanales asignadas → el modal `ModalBajaProfesora` deshabilita la confirmación y muestra advertencia con el conteo de clases a reasignar.
- [ ] **CA-05 (Baja lógica permitida)**: Confirmar baja en docente sin horarios activos → se registra la `fecha_baja` y se quita de la lista de docentes activas.
- [ ] **CA-06 (Búsqueda en tiempo real)**: El filtro por texto filtra instantáneamente por nombre, apellido o especialidad.

## 9. Casos borde / Errores

- Intento de baja de una profesora ya dada de baja → respuesta 404 o 409 controlada.
- Formato de teléfono con caracteres especiales o letras → validación Zod normaliza o rechaza antes del envío.
- Falla de conexión con el backend → toast de error con opción de reintentar.

## 10. Dependencias y Trazabilidad

- **US-01 y US-02**: Google Auth y control de accesos por rol.
- **US-04**: Asignación de horarios del cronograma a docentes activas.
- **US-23 y US-24**: Módulo de honorarios y suplencias.
- **Backend**:
  - `GET /api/v1/profesoras?incluirBajas=false`: listado del plantel.
  - `POST /api/v1/profesoras`: alta directa con perfil docente.
  - `DELETE /api/v1/profesoras/:id`: baja lógica con validación de horarios activos.

## 11. Notas de implementación (Frontend)

- **Ubicación en UI**: Ruta `/admin/profesoras` accesible desde el menú principal bajo "Centro" → "Profesoras" (`OwnerLayout`).
- **Componentes clave**:
  - `ProfesorasPage`: Vista principal con encabezado estándar, badge de píldora de conteo del staff y barra de búsqueda.
  - `ModalFormProfesora`: Modal flotante centrado con esquema `altaProfesoraDirectaSchema`.
  - `ModalBajaProfesora`: Diálogo de confirmación con validación reactiva de horarios activos.
  - `useProfesoras`: Hook TanStack Query con invalidación automática de caché tras mutaciones.
- **Tests**: `profesoras-page.test.tsx` (alta, búsqueda, bloqueo de baja con clases y baja exitosa).
