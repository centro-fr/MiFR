# MiFR – Documento de Prueba: Pruebas de Frontend (Specs 02, 03 y 04)

**Universidad Tecnológica Nacional – Facultad Regional Córdoba**  
**Sistema de Gestión e Información para Centros Físicos · Proyecto Final · 2026**

---

## 1. Propósito y Estructura del Documento

Este documento define las pruebas de **Frontend (Componentes, Formularios, Validación de Esquemas e Interfaz)** para las Historias de Usuario de las especificaciones:
- **Spec 02 (Configuración Base):** US-03, US-04
- **Spec 03 (Alumnos e Inscripciones):** US-05, US-06, US-07, US-08, US-09, US-10
- **Spec 04 (Planes y Precios):** US-11, US-12

### Diferencia entre Historias de Usuario (US) y Casos de Prueba (CP)
Tal como establece la metodología del proyecto:
- **User Story (US):** Es el requisito funcional del negocio ("Como [rol], quiero [acción] para [beneficio]") con sus reglas de negocio y **Criterios de Aceptación (CA)**.
- **Caso de Prueba (CP):** Es un escenario de prueba concreto con precondiciones, pasos secuenciales (1, 2, 3...), resultado esperado observable en la interfaz y tests automatizados asociados que lo validan.

---

## 2. Matriz de Trazabilidad: User Stories vs Casos de Prueba Frontend

| User Story (US) | Título de la Historia | Caso de Prueba Frontend | Componente / Archivo de Test Frontend |
| :--- | :--- | :--- | :--- |
| **US-03** | Alta y administración de actividades y cupos | **CP-F01** | `modal-form-actividad.test.tsx`<br>`modal-baja-actividad.test.tsx` |
| **US-04** | Asignación de profesoras y horarios a actividades | **CP-F02** | `HorarioModalForm.test.tsx`<br>`CronogramaGridDesktop.test.tsx` |
| **US-05** | Pre-inscripción de alumno nuevo | **CP-F03** | `alumno-alta.schema.test.ts`<br>`pendientes-de-alta-page.test.tsx` |
| **US-06** | Asociación de tutor a alumno menor de edad | **CP-F04** | `alumno-alta.schema.test.ts`<br>`edad.test.ts` |
| **US-07** | Alta definitiva al confirmarse el primer pago | **CP-F05** | `modal-confirmar-alta.test.tsx`<br>`primer-pago.test.ts` |
| **US-08** | Baja lógica de alumno | **CP-F06** | `modal-baja-alumno.test.tsx` |
| **US-09** | Modificación de datos de alumno | **CP-F07** | `alumno-edicion-form.test.tsx`<br>`alumno-edicion.schema.test.ts` |
| **US-10** | Consulta y búsqueda de alumnos | **CP-F08** | `alumnos-page.test.tsx`<br>`alumnos-handlers.test.ts` |
| **US-11** | Alta y edición de planes vigentes | **CP-F09** | `formulario-plan.test.tsx`<br>`plan.ts` (esquema Zod) |
| **US-12** | Actualización de precios con fecha de vigencia | **CP-F10** | `precios-plan-dialogs.test.tsx`<br>`precio.test.ts` |

---

## 3. Detalle de los Casos de Prueba por User Story

---

### US-03: Alta y administración de actividades y cupos
#### Caso CP-F01 — Validación de cupos y modalidades en formularios de actividades
* **US:** US-03 · **Tipo:** Componentes / Interfaz.
* **Precondición:** Diálogos `ModalFormActividad` y `ModalBajaActividad` disponibles en la vista de administración.
* **Pasos:**
  1. Completar código y nombre, seleccionar modalidad "Personalizada" y dejar el cupo vacío. Intentar guardar.
  2. Seleccionar modalidad "Personalizada" e ingresar cupo mayor a 40 (ej: 45). Intentar guardar.
  3. Seleccionar modalidad "Grupal" e ingresar cupo mayor a 60 (ej: 65). Intentar guardar.
  4. Ingresar un valor con más de 2 dígitos en el input de cupo (ej: 99999).
  5. Completar una actividad grupal válida con cupo y una personalizada con cupo dentro del límite (hasta 40). Guardar.
  6. En `ModalBajaActividad`, abrir el diálogo de confirmación y hacer clic en "Cancelar".
  7. Confirmar baja en actividad sin conflictos.
  8. Intentar baja en actividad que posee horarios activos con alumnos inscriptos.
* **Resultado Esperado:**
  - El paso 1 no emite `onSave` (bloqueado por esquema Zod al ser personalizada sin cupo).
  - Los pasos 2 y 3 muestran alertas de error específicas ("El cupo máximo no puede superar los 40/60 alumnos").
  - El paso 4 recorta automáticamente a 2 dígitos numéricos.
  - El paso 5 llama a `onSave` con los datos limpios y normalizados.
  - El paso 6 cierra el modal sin alterar nada.
  - El paso 7 llama a `onConfirm` y muestra estado de carga ("Dando de baja...").
  - El paso 8 muestra la alerta con el mensaje de impedimento devuelto por el sistema.
* **Tests Automatizados:** `front/src/features/actividades/test/modal-form-actividad.test.tsx` (6 tests) y `modal-baja-actividad.test.tsx` (4 tests). **Estado: Aprobado.**

---

### US-04: Asignación de profesoras y horarios a actividades
#### Caso CP-F02 — Validación horaria, superposiciones y cronograma semanal
* **US:** US-04 · **Tipo:** Componentes / Interfaz.
* **Precondición:** `HorarioModalForm` abierto con catálogo de actividades y profesoras.
* **Pasos:**
  1. Verificar que se rendericen los campos requeridos: Actividad, Profesora, Día, Hora Inicio y Fin.
  2. Ingresar hora fin anterior o igual a hora inicio (ej: 12:00 a 10:00) y hacer clic en Aceptar.
  3. Seleccionar un horario en el cual la validación informe que la profesora ya tiene otra clase ese día a esa hora.
  4. Asignar un horario válido dentro de la franja operativa (07:00 a 23:00) sin superposición y guardar.
  5. Comprobar la visualización en la grilla semanal (`CronogramaGridDesktop`).
* **Resultado Esperado:**
  - El paso 1 muestra los selectores y campos correctamente.
  - El paso 2 muestra alerta roja: "La hora de fin debe ser posterior a la hora de inicio" y no llama a `onSave`.
  - El paso 3 muestra alerta de superposición: "La profesora ya está asignada a esa hora" e impide guardar.
  - El paso 4 llama a `onSave` y cierra el modal.
  - El paso 5 renderiza la tarjeta del horario con el nombre de la actividad y la profesora.
* **Tests Automatizados:** `front/src/features/horarios/components/__tests__/HorarioModalForm.test.tsx` (4 tests), `CronogramaGridDesktop.test.tsx` (7 tests), `horario.test.ts` (20 tests). **Estado: Aprobado.**

---

### US-05: Pre-inscripción de alumno nuevo
#### Caso CP-F03 — Captura de datos personales y estado pendiente de confirmación
* **US:** US-05 · **Tipo:** Formularios / Schemas.
* **Precondición:** Esquema de formulario de alta `alumnoFormSchema` y pantalla de pre-inscripciones.
* **Pasos:**
  1. Validar alumno mayor de edad con nombre, apellido, DNI, fecha de nacimiento, teléfono y email.
  2. Intentar validar alumno mayor de edad sin teléfono de contacto.
  3. Intentar validar alumno mayor de edad sin email.
  4. En la pantalla de pre-inscripciones pendientes (`PendientesDeAltaPage`), buscar por término de texto.
  5. Verificar visualización de datos de pre-inscripción: plan, profesora y horarios asignados.
  6. Visualizar estado vacío cuando no hay pendientes.
* **Resultado Esperado:**
  - El paso 1 valida exitosamente.
  - El paso 2 falla con error: "El teléfono de contacto es obligatorio para alumnos mayores".
  - El paso 3 falla por requerimiento de email para login en mayores.
  - El paso 4 filtra reactivamente la lista de pre-inscriptos.
  - El paso 5 muestra en la tabla el plan y horario elegido.
  - El paso 6 muestra el mensaje "No hay pre-inscripciones pendientes".
* **Tests Automatizados:** `front/src/features/alumnos/schemas/__tests__/alumno-alta.schema.test.ts` (7 tests), `pendientes-de-alta-page.test.tsx` (7 tests). **Estado: Aprobado.**

---

### US-06: Asociación de tutor a alumno menor de edad
#### Caso CP-F04 — Detección automática de menor y obligatoriedad de tutor legal
* **US:** US-06 · **Tipo:** Schemas / Utilidades.
* **Precondición:** Cálculo de edad con fecha simulada a 18 años.
* **Pasos:**
  1. Ingresar fecha de nacimiento correspondiente a un menor de 18 años (ej: 11 años) sin datos de tutor.
  2. Ingresar alumno menor con tutor legal completo (nombre, DNI, teléfono, email, fecha de nacimiento de mayor).
  3. Ingresar alumno menor con tutor que también es menor de edad.
  4. Ingresar alumno mayor de edad dejando el bloque de tutor vacío.
* **Resultado Esperado:**
  - El paso 1 rechaza la validación indicando que el tutor es obligatorio para menores.
  - El paso 2 acepta la validación y no exige teléfono propio al menor.
  - El paso 3 rechaza indicando que el tutor debe ser mayor de edad.
  - El paso 4 acepta la validación sin requerir datos de tutor.
* **Tests Automatizados:** `front/src/features/alumnos/schemas/__tests__/alumno-alta.schema.test.ts`, `edad.test.ts`. **Estado: Aprobado.**

---

### US-07: Alta definitiva de alumno al confirmarse el primer pago
#### Caso CP-F05 — Modal de cobro del primer pago y habilitación definitiva
* **US:** US-07 · **Tipo:** Componentes / Interfaz.
* **Precondición:** `ModalConfirmarAlta` abierto desde una pre-inscripción pendiente.
* **Pasos:**
  1. Abrir modal: verificar que proponga el precio del plan en efectivo por defecto.
  2. Modificar el monto cobrado a un valor diferente e intentar confirmar sin tildar confirmación.
  3. Tildar "Confirmo el monto distinto" y registrar.
  4. Seleccionar forma de pago "Transferencia" y verificar campos adicionales (fecha, hora, titular).
  5. Simular error del servidor `MONTO_DISTINTO` y comprobar mensaje informativo.
  6. Verificar que si quien opera es profesora, el botón se adapte a "Informar transferencia".
* **Resultado Esperado:**
  - El paso 1 inicializa con el importe exacto del plan.
  - El paso 2 no envía y exige tildar la confirmación del monto distinto.
  - El paso 3 envía con `confirmar_monto_distinto: true`.
  - El paso 4 muestra los campos específicos de transferencia bancaria.
  - El paso 5 presenta la alerta de monto esperado devuelta por la API.
  - El paso 6 cambia el texto de acción a "Informar transferencia".
* **Tests Automatizados:** `front/src/features/alumnos/components/__tests__/modal-confirmar-alta.test.tsx` (7 tests), `primer-pago.test.ts` (7 tests). **Estado: Aprobado.**

---

### US-08: Baja lógica de alumno
#### Caso CP-F06 — Modal de baja lógica con selección de motivo y preservación de historial
* **US:** US-08 · **Tipo:** Componentes / Interfaz.
* **Precondición:** `ModalBajaAlumno` montado con el nombre de un alumno activo.
* **Pasos:**
  1. Verificar mensaje explicativo de que la baja conserva el historial y no elimina datos.
  2. Hacer clic en "Confirmar baja" sin seleccionar ningún motivo.
  3. Seleccionar motivo "Mudanza" y confirmar.
  4. Verificar que se muestren los 5 motivos válidos y no figure `CAMBIO_PLAN`.
  5. Simular error de API ("El alumno ya está dado de baja").
  6. Hacer clic en "Cancelar".
* **Resultado Esperado:**
  - El paso 1 muestra: "El alumno quedará inactivo pero se conservará todo su historial".
  - El paso 2 muestra alerta "Elegí el motivo de la baja" y no confirma.
  - El paso 3 ejecuta `onConfirm("MUDANZA")`.
  - El paso 4 presenta los 5 radios excluyendo `CAMBIO_PLAN`.
  - El paso 5 renderiza la alerta de error devuelta.
  - El paso 6 ejecuta `onClose` sin cambios.
* **Tests Automatizados:** `front/src/features/alumnos/components/__tests__/modal-baja-alumno.test.tsx` (7 tests). **Estado: Aprobado.**

---

### US-09: Modificación de datos de alumno
#### Caso CP-F07 — Formulario de edición, validaciones estrictas y permisos por rol
* **US:** US-09 · **Tipo:** Componentes / Interfaz.
* **Precondición:** `AlumnoEdicionForm` montado con datos de un alumno existente.
* **Pasos:**
  1. Ingresar números en el nombre (ej: "Camila2") e intentar guardar.
  2. Modificar fecha de nacimiento a menor de edad sin asignar tutor.
  3. Ingresar un teléfono de emergencia no numérico o inválido.
  4. Seleccionar fecha futura en el apto médico.
  5. Desmarcar "Apto médico presentado".
  6. Abrir formulario con rol `PROFESORA` (esPropietaria = false).
* **Resultado Esperado:**
  - El paso 1 muestra error: "Usá solo letras, espacios, apóstrofes, puntos o guiones".
  - El paso 2 muestra error: "Un alumno menor de 18 años necesita un tutor responsable".
  - El paso 3 rechaza formato telefónico.
  - El paso 4 muestra alerta: "La fecha del apto médico no puede ser futura".
  - El paso 5 oculta y elimina la fecha de apto.
  - El paso 6 oculta campos de datos personales, planes y horarios, dejando solo contacto y observaciones.
* **Tests Automatizados:** `front/src/features/alumnos/components/__tests__/alumno-edicion-form.test.tsx` (6 tests), `alumno-edicion.schema.test.ts` (10 tests). **Estado: Aprobado.**

---

### US-10: Consulta y búsqueda de alumnos
#### Caso CP-F08 — Búsqueda incremental, debounce, filtros y paginación
* **US:** US-10 · **Tipo:** Páginas / Handlers.
* **Precondición:** `AlumnosPage` montada con mock de datos de alumnos.
* **Pasos:**
  1. Escribir término de búsqueda y verificar debounce de 300ms.
  2. Buscar por nombre sin distinguir tildes ni mayúsculas (ej: "Pérez").
  3. Buscar por DNI exacto.
  4. Tildar "Incluir dados de baja".
  5. Hacer clic en "Siguiente" en la paginación.
  6. Iniciar sesión con rol exclusivo `PROFESORA`.
* **Resultado Esperado:**
  - El paso 1 no dispara la consulta hasta transcurrir los 300ms.
  - El paso 2 encuentra los alumnos coincidentes.
  - El paso 3 filtra instantáneamente por DNI.
  - El paso 4 envía `incluir_bajas: true` e incluye registros inactivos.
  - El paso 5 incrementa el offset (`offset: 10`).
  - El paso 6 oculta el selector de profesoras para restringir la vista a sus alumnos asignados.
* **Tests Automatizados:** `front/src/features/alumnos/pages/__tests__/alumnos-page.test.tsx` (3 tests), `alumnos-handlers.test.ts` (8 tests). **Estado: Aprobado.**

---

### US-11: Alta y edición de planes vigentes
#### Caso CP-F09 — Formulario de planes, frecuencia semanal y confirmación de cambio
* **US:** US-11 · **Tipo:** Componentes / Schemas.
* **Precondición:** `FormularioPlan` montado con catálogo de actividades.
* **Pasos:**
  1. Intentar enviar formulario sin nombre, sin tipo y sin frecuencia.
  2. Seleccionar tipo `CLASE_SUELTA` y verificar que deshabilite la frecuencia semanal.
  3. Ingresar un nombre de plan idéntico a uno existente.
  4. En modo edición, cambiar la frecuencia de un plan existente (ej: de 2 a 3 clases por semana).
  5. Completar datos válidos y guardar.
* **Resultado Esperado:**
  - El paso 1 resalta campos requeridos y enfoca el primer error.
  - El paso 2 ajusta dinámicamente la UI deshabilitando selector de frecuencia.
  - El paso 3 muestra advertencia de nombre duplicado antes de guardar.
  - El paso 4 abre el modal `ModalCambioFrecuencia` pidiendo confirmación.
  - El paso 5 emite `onGuardar` con el objeto tipado.
* **Tests Automatizados:** `front/src/features/planes/components/__tests__/formulario-plan.test.tsx` (a crear/incorporar), `plan.ts` (esquema Zod). **Estado: Preparado.**

---

### US-12: Actualización de precios con fecha de vigencia
#### Caso CP-F10 — Diálogo de actualización de precio y consulta de histórico
* **US:** US-12 · **Tipo:** Componentes / Schemas.
* **Precondición:** `ActualizarPrecioDialog` y `HistorialPreciosDialog` montados con un plan activo.
* **Pasos:**
  1. Ingresar precio de $0 y presionar "Revisar y confirmar".
  2. Ingresar precio válido en formato moneda (ej: "32.000") y fecha de vigencia.
  3. Confirmar en el modal de confirmación.
  4. Abrir diálogo de historial y verificar el indicador "Vigente".
* **Resultado Esperado:**
  - El paso 1 muestra alerta: "Ingresá un precio mayor a $0" y no envía.
  - El paso 2 normaliza el importe y permite avanzar a la confirmación.
  - El paso 3 llama a `registrarPrecio` con `{ precio: 32000, fecha_vigencia_desde }` y cierra.
  - El paso 4 renderiza el listado histórico con fecha y badge "Vigente".
* **Tests Automatizados:** `front/src/features/planes/components/__tests__/precios-plan-dialogs.test.tsx` (3 tests), `precio.test.ts` (12 tests). **Estado: Aprobado.**
