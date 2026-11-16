# Comparación y Actualización – Definición del Producto (MiFR)

Este documento detalla todas las diferencias entre **"Copia de Definición del Producto"** (Drive: `SI - 3K2 - G14 - MiFR`, v1.1) y el código actual del sistema **MiFR**, manteniendo exactamente la misma estructura, tablas y formato de fichas (`Complejidad`, `Descripción`, `Criterios de aceptación` y `Pruebas de aceptación`) para copiar y reemplazar directamente en el documento de Google Docs.

---

## Resumen Ejecutivo de Cambios en el Product Backlog

| Categoría | Elementos afectados | Acción en el documento |
| :--- | :--- | :--- |
| **US Eliminadas** (retiradas del sistema) | **US-26** (*Resumen diario para la propietaria*)<br>**US-33** (*Informe de asistencia*)<br>**US-34** (*Informe de cuotas vencidas*) | **Eliminar** de la tabla de la Sección 5 y de las fichas de la Sección 5.1:<br>• **US-26:** Retirada del sistema.<br>• **US-33:** Retirada de reportes del front (el seguimiento se centralizó en el Ranking US-30).<br>• **US-34:** Retirada de reportes analíticos (absorbida operativamente en Alumnos con filtro por estado de cuota y en Cobros). |
| **US Nuevas** (implementadas en el código) | **US-38** (*Gestión del plantel de profesoras*)<br>**US-39** (*Consulta de perfil de usuario*) | **Agregar** en la tabla de la Sección 5 (`US-39` bajo *Autenticación y Seguridad* y `US-38` bajo *Actividades y Cupos*) y sumar sus fichas completas en la Sección 5.1. |
| **US Readecuadas por Arquitectura y Flujos** | **US-02** (*Control de acceso y perfiles de usuario por rol*)<br>**US-32** (*Portal público institucional y catálogo de actividades*) | **Actualizar** alcance y criterios:<br>• **US-02:** Pasa de "definición de permisos en panel" a modelo de **Control de Acceso Basado en Roles (RBAC) estático y predefinido**, donde la asignación de roles la absorben los flujos de negocio (rol `ALUMNO`/`TUTOR` en US-07 y rol `PROFESORA` en US-38).<br>• **US-32:** Pasa de panel dinámico de cupos en tiempo real a landing page institucional (`/`) y catálogo de disponibilidad (`/disponibilidad`) desacoplada del backend. |
| **Cambios de actor / permisos** | **US-14** (*Renovación o cambio de plan*)<br>**US-16** (*Registro de pago por transferencia*)<br>**US-23** (*Informe mensual de honorarios*) | **Actualizar**:<br>• **US-14:** En el código real lo ejecuta **exclusivamente la propietaria** desde la ficha del alumno (`...soloPropietaria`), no la profesora ni el alumno.<br>• **US-16:** Lo informa la **profesora o propietaria** (sin adjuntar archivo de comprobante; se registran datos para cotejar con el extracto bancario).<br>• **US-23:** Exclusivo de la propietaria. Los profesores **nunca pueden visualizar los honorarios** (regla estricta del negocio por confidencialidad financiera). |
| **Cambios de reglas de negocio y multi-plan** | **US-01, US-03 a US-13, US-15, US-17 a US-22, US-24, US-25, US-27 a US-31, US-35 a US-37** | **Actualizar** criterios y pruebas de aceptación según los bloques listos para copiar que siguen abajo. |

---

## 4. Roles del sistema (Actualización de Tabla)

### Qué cambió en el código
1. **Profesor/a:** Cobra en efectivo a sus alumnos a cargo (US-15), **informa transferencias bancarias** de sus alumnos (US-16), pre-inscribe alumnos a su cargo (US-05), edita datos de contacto y emergencia de sus alumnos asignados (US-09), carga rutinas y evolución física (US-27) y toma asistencia (US-20). En el código real, el cambio de plan y horarios (US-14), la baja/reactivación de alumnos (US-08) y la visualización y administración de honorarios (US-23) son **exclusivos de la Propietaria**.
2. **Alumno / Tutor:** Ya **no** registra transferencias ni realiza cambios de plan desde su portal (solo consulta los datos bancarios del centro en su perfil). Se incorporó el **selector de plan/actividad** cuando un alumno (o menor a cargo) tiene **2 o más planes activos**, además del selector de menor a cargo para el tutor y los avisos **Web Push** en el celular.
3. **Visitantes:** Se mantiene el rol pero readecuado al portal público institucional (US-32): landing page con catálogo de actividades, mapa interactivo, contactos y botón de login, desacoplado del backend para resguardar recursos en la nube.

### Bloque actualizado para pegar en Sección 4

| Rol | Descripción | Permisos principales |
| ----- | ----- | ----- |
| Responsable de Centro de Entrenamiento | Administra el negocio de forma integral. Es el único rol con acceso a datos financieros globales (liquidación general de honorarios, rendición de efectivo, reportes administrativos). | Control total sobre todos los módulos: alumnos, plantel de profesoras, actividades, horarios, planes, promociones, pagos, honorarios, suplencias, notificaciones, reportes y estadísticas. Gestión exclusiva de cambios de planes/horarios y bajas/reactivaciones de alumnos. Aprueba o rechaza transferencias y administra parámetros del sistema. |
| Profesor/a | Dicta una o más actividades y gestiona la operación diaria de sus clases y alumnos a cargo. | Registra pre-inscripciones a su cargo, toma asistencia, registra cobros en efectivo e informa transferencias bancarias de sus alumnos, edita información de contacto de sus alumnos a cargo, y carga rutinas y progreso físico (sin acceso a honorarios ni liquidaciones financieras). |
| Alumno / Tutor | Consume el servicio del centro. El tutor actúa en representación de uno o más alumnos menores de edad (pudiendo además ser alumno propio). | Consulta desde su portal (con selector de menor a cargo y selector de plan si posee 2 o más planes activos): estado de cuota, vencimiento, datos bancarios del centro, historial de asistencia y próximas clases; consulta de rutina y progreso físico por plan; visualización de ranking, racha e insignias; recepción de avisos de cuota en la app y por notificaciones push en el celular. |
| Visitante | Persona interesada en el centro que accede a la web sin autenticación. | Consulta la portada institucional, el catálogo de actividades con sus modalidades y días, la ubicación geográfica en el mapa interactivo y los accesos de contacto directo (WhatsApp e Instagram), disponiendo de enlace directo al inicio de sesión (`/login`). |

---

## 5. Epic y US asociada (Actualización de Tabla)

### Qué cambió en el código
- Se **agrega `US-39`** en *Autenticación y Seguridad* y **`US-38`** en *Actividades y Cupos*.
- Se **readecua `US-02`** como control de acceso por roles (RBAC) con asignación automática en US-07 y US-38.
- Se **eliminan `US-26`** (en *Notificaciones y Alertas*), y **`US-33` y `US-34`** (en *Reportes y Fidelización*).
- Se **mantiene la épica *Difusión y Analítica de Negocio* con `US-32`**, readecuada como portal público institucional y catálogo de actividades.

### Bloque actualizado para pegar en Sección 5

| Épica | USs asociadas |
| ----- | ----- |
| Autenticación y Seguridad | US-01, US-02, US-39 |
| Actividades y Cupos | US-03, US-04, US-38 |
| Alumnos e Inscripciones | US-05, US-06, US-07, US-08, US-09, US-10 |
| Planes y Precios | US-11, US-12, US-13, US-14 |
| Pagos y Cuotas | US-15, US-16, US-17, US-18, US-19 |
| Asistencia | US-20, US-21, US-22 |
| Honorarios de profesores | US-23, US-24 |
| Notificaciones y Alertas | US-25 |
| Rutina y Progreso | US-27, US-28 |
| Portal del Alumno | US-29, US-31 |
| Reportes y Fidelización | US-30, US-35, US-36, US-37 |
| Difusión y Analítica de Negocio | US-32 |

---

## 5.1 Fichas de USs (Comparación y Bloques Actualizados)

### ***5.1.1 Autenticación y Seguridad***

#### **US-01 – Inicio de sesión con Google Auth**
- **Qué cambió:** Al iniciar sesión con Google se sincroniza y almacena la foto de perfil (`foto_url`) del usuario y se expone en la sesión (`/auth/me`). Se admiten cuentas de Google con cualquier dominio de correo válido (no restringido únicamente a `@gmail.com`). Solo acceden usuarios previamente registrados y activos en el sistema.
- **Bloque actualizado:**

#### ***US-01 \- Inicio de sesión con Google Auth***

---

* **Complejidad**: Media
* **Descripción**: Como usuario del sistema (propietaria, profesora, alumno/tutor), quiero iniciar sesión mediante Google Auth para acceder de forma segura sin gestionar contraseñas locales.
* **Criterios de aceptación:**
  * El sistema no debe almacenar contraseñas propias; solo datos del usuario asociados a su cuenta de Google (incluyendo la sincronización de su foto de perfil en cada ingreso).
  * Admite cualquier dirección de correo electrónico válida vinculada a una cuenta de Google.
  * Al iniciar sesión, el sistema verifica que el correo corresponda a un usuario registrado y activo en el sistema; de lo contrario, rechaza el acceso indicando que la cuenta no está habilitada.
  * Cada usuario queda autenticado con todos los roles que tenga asignados (una persona puede tener más de un rol).
* **Pruebas de aceptación:**
  * Probar login con cuenta de Google válida, registrada y activa (pasa, inicia sesión y actualiza foto de perfil).
  * Probar login con cuenta de Google válida no registrada o inactiva en el sistema (falla, muestra mensaje de cuenta no habilitada).
  * Probar login con cuenta de Google cancelada a mitad del proceso (falla, no genera sesión).
  * Probar acceso a una ruta protegida sin haber iniciado sesión (falla, redirige a login).

---

#### **US-02 – Control de acceso y perfiles de usuario por rol**
- **Qué cambió:** 
  1. **De matriz configurable a RBAC estático:** La propuesta original de una pantalla para "definir permisos" se reemplazó por un modelo de **Control de Acceso Basado en Roles (RBAC) predefinido en código**, garantizando que los datos financieros generales sean exclusivos de la propietaria.
  2. **Asignación de roles por negocio:** Los roles no se crean en un ABM aislado, sino que se asignan automáticamente en los flujos de negocio:
     - **Rol `ALUMNO` / `TUTOR`:** se asigna en la confirmación del primer pago (**US-07** y **US-06**).
     - **Rol `PROFESORA`:** se asigna en el alta directa de la docente (**US-38**).
     - **Rol `PROPIETARIA`:** gestionado con resguardo de que nunca pueda eliminarse ni revocarse el rol a la última propietaria activa del centro (`409`).
  3. **Permisos docentes acotados:** La profesora puede ver planes (`PLANES_VER`) y consultar/editar únicamente a los alumnos con inscripción vigente a su cargo (si intenta acceder a un alumno ajeno o inexistente recibe `403`), sin ningún acceso a liquidaciones ni honorarios.
- **Bloque actualizado:**

#### ***US-02 \- Control de acceso y perfiles de usuario por rol***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero que las acciones, pantallas y datos del sistema estén estrictamente restringidos según el perfil y roles asignados a cada usuario (`PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`), para garantizar la confidencialidad de datos financieros y la separación de responsabilidades operativas.
* **Criterios de aceptación:**
  * Cada rol accede únicamente a las vistas, endpoints y operaciones habilitadas según su matriz de permisos fija (RBAC).
  * Los datos financieros globales (liquidación general de honorarios, rendición de efectivo, caja y reportes analíticos del negocio) son visibles y gestionables exclusivamente por el rol `PROPIETARIA`.
  * La `PROFESORA` accede únicamente a sus clases asignadas, cobros en efectivo e informes de transferencias de sus alumnos, y a sus rutinas y asistencias (sin acceso a honorarios ni liquidaciones financieras bajo ninguna circunstancia).
  * El `ALUMNO` o `TUTOR` accede exclusivamente a sus datos personales, rutina y seguimiento de sus planes activos.
  * La asignación de roles se produce de forma atómica en los flujos operativos correspondientes (rol Alumno/Tutor en el alta definitiva por pago, rol Profesora en el alta de docente).
  * Una misma persona puede poseer más de un rol simultáneamente (ej. propietaria que también dicta clases) disponiendo de selectores para alternar de vista.
  * El sistema impide revocar el rol o desactivar a la última propietaria activa del centro.
* **Pruebas de aceptación:**
  * Probar que una profesora no pueda acceder al módulo ni endpoints de honorarios ni a la ficha de un alumno ajeno a sus clases (falla el acceso con 403, correctamente bloqueado).
  * Probar que un alumno o tutor no pueda acceder a la administración de planes ni a reportes administrativos (falla el acceso, redirige o deniega).
  * Probar que una persona con roles combinados (propietaria y profesora) acceda a ambos módulos y pueda alternar de panel (pasa).
  * Probar intento de quitar el rol a la única propietaria activa del sistema (falla con 409, bloquea la acción).

---

#### **US-39 [NUEVA] – Consulta de perfil de usuario**
- **Qué cambió:** Agregada en `docs/specs/01-autenticacion-y-seguridad/US-39-consulta-edicion-perfil-usuario.md` e implementada en `front/src/features/perfil/pages/perfil-page.tsx`. En el código real la vista de perfil es **de solo lectura** (los datos personales y el correo los administra la propietaria en las fichas oficiales), muestra el detalle contextual según el rol activo (para alumno/tutor: todos sus planes vigentes y profesoras, más sus insignias y la configuración de avisos push en el celular; para profesora: especialidad, teléfono y fecha de alta) y permite cambiar de panel cuando el usuario tiene múltiples roles o cerrar sesión en mobile.
- **Bloque nuevo para agregar al final de 5.1.1:**

#### ***US-39 \- Consulta de perfil de usuario***

---

* **Complejidad:** *Baja*
* **Descripción:** Como usuario autenticado (profesora, alumno o tutor), quiero acceder a mi sección de **Perfil** para consultar mis datos de cuenta registrados, el resumen contextual de mi rol, mis insignias (si soy alumno) y configurar las notificaciones push en mi dispositivo.
* **Criterios de aceptación:**
  * Muestra en modo lectura los datos de identidad y cuenta del usuario (nombre completo, correo electrónico de Google con indicación de que solo lo modifica la propietaria y rol activo).
  * Adapta la información contextual según el rol:
    * **Profesor/a:** muestra especialidad, teléfono y fecha de incorporación al centro.
    * **Alumno / Tutor:** muestra el/los plan/es vigente/s y su/s profesora/s a cargo (del propio alumno o del menor seleccionado en la barra superior), junto con la sección de insignias obtenidas y por obtener (US-31).
  * Permite activar o desactivar desde el perfil la recepción de avisos push en el celular actual (US-25), cambiar de vista si posee más de un rol y cerrar sesión desde dispositivos móviles.
* **Pruebas de aceptación:**
  * Probar acceso a la pantalla de perfil como alumno con 1 o más planes vigentes (muestra sus planes, profesoras, insignias y configuración de avisos push) (pasa).
  * Probar acceso a la pantalla de perfil como profesora (muestra su especialidad, fecha de alta y datos de contacto en modo lectura) (pasa).
  * Verificar que el correo electrónico y los datos de cuenta figuren protegidos en solo lectura (pasa).

---

### ***5.1.2 Actividades y cupos***

#### **US-03 – Alta y administración de actividades y cupos**
- **Qué cambió:**
  1. Cada actividad incluye el indicador `requiere_medidas` (define si exige peso y talla en la pre-inscripción, US-05).
  2. La baja lógica de una actividad se bloquea (`409`) si tiene horarios con alumnos inscriptos o si tiene **planes vigentes exclusivos** asociados. Si solo tiene horarios sin alumnos inscriptos, la baja de la actividad da de baja también esos horarios automáticamente.
- **Bloque actualizado:**

#### ***US-03 \- Alta y administración de actividades y cupos***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero crear y administrar las actividades indicando su modalidad (grupal o personalizada), su cupo máximo y si requieren registro de peso y talla inicial, para definir la oferta de disciplinas del centro.
* **Criterios de aceptación:**
  * Debe permitir alta, baja lógica y modificación de actividades (nombre, descripción, modalidad grupal/personalizada, cupo máximo e indicador `requiere_medidas`).
  * El cupo máximo es obligatorio en clases personalizadas y configurable en clases grupales.
  * La baja de una actividad debe bloquearse si posee horarios con alumnos inscriptos o planes vigentes exclusivos asociados; si posee horarios sin alumnos, los da de baja en el mismo paso.
* **Pruebas de aceptación:**
  * Probar alta de actividad grupal o personalizada con sus parámetros válidos (pasa).
  * Probar alta de clase personalizada sin definir cupo (falla, campo obligatorio).
  * Probar baja de una actividad con alumnos inscriptos o con un plan exclusivo vigente (falla con 409, indica el motivo del bloqueo).
  * Probar baja de una actividad sin alumnos ni planes exclusivos (pasa, y cierra sus horarios vacíos asociados).

---

#### **US-04 – Asignación de profesoras y horarios a actividades**
- **Qué cambió:**
  1. Los horarios deben estar dentro de la franja de apertura del centro: **lunes a sábado de 07:00 a 23:00** (no abre los domingos).
  2. **Baja programada de un horario con alumnos:** Si el horario no tiene alumnos inscriptos, se da de baja en el acto. Si tiene alumnos activos inscriptos, la baja queda **programada** (`fecha_baja_programada`): deja de admitir inscripciones nuevas, puede cancelarse la baja programada si se revierte la decisión, y se cierra automáticamente cuando los alumnos inscriptos finalizan la vigencia/gracia de su cuota.
- **Bloque actualizado:**

#### ***US-04 \- Asignación de profesoras y horarios a actividades***

---

* **Complejidad:** *Alta*
* **Descripción:** Como propietaria, quiero asignar profesoras y horarios a cada actividad dentro del horario de atención del centro para mantener organizado el cronograma semanal.
* **Criterios de aceptación:**
  * La asignación se realiza sobre profesoras activas registradas en el plantel (ver US-38) y dentro de la franja de lunes a sábado de 07:00 a 23:00 (domingos no permitidos).
  * No debe permitirse asignar dos actividades a la misma profesora en horarios que se superpongan.
  * El horario hereda el cupo máximo de la actividad salvo que se le defina un cupo específico propio.
  * Si se solicita la baja de un horario sin alumnos inscriptos, se da de baja inmediatamente; si tiene alumnos activos inscriptos, la baja queda programada (bloqueando nuevas inscripciones en ese horario hasta que finalicen las cuotas vigentes), pudiendo cancelarse antes de su ejecución.
* **Pruebas de aceptación:**
  * Probar asignar una profesora activa a un horario libre de lunes a sábado entre 07:00 y 23:00 (pasa).
  * Probar asignar una profesora a dos horarios superpuestos o en día domingo / fuera de horario (falla).
  * Probar dar de baja un horario con alumnos activos (pasa, queda con baja programada y no admite nuevos inscriptos).

---

#### **US-38 [NUEVA] – Gestión del plantel de profesoras**
- **Qué cambió:** Esta US no estaba en el documento de Drive y fue implementada completa en el sistema (Sprint 4/5).
- **Bloque nuevo para agregar al final de 5.1.2:**

#### ***US-38 \- Gestión del plantel de profesoras***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero administrar el plantel de profesoras del centro (alta directa, edición de datos, consulta de carga horaria semanal, baja lógica y reincorporación) para gestionar el equipo docente e impedir la baja accidental de profesoras con horarios activos a cargo.
* **Criterios de aceptación:**
  * El alta directa registra en un único flujo atómico los datos de contacto y nacimiento de la docente (nombre, apellido, email, teléfono, fecha de nacimiento validando mayoría de edad >= 18 años) y su especialidad, creando automáticamente el usuario en el sistema, asignándole el rol `PROFESORA` y generando su perfil docente.
  * Permite editar los datos de una profesora y reincorporar a una profesora previamente dada de baja.
  * Si la profesora tiene horarios activos asignados en la grilla semanal, el sistema bloquea su baja lógica informando cuántas clases semanales debe reasignar o cerrar primero.
  * Los datos de contacto personales del plantel solo son visibles para la propietaria.
* **Pruebas de aceptación:**
  * Probar alta directa de una profesora mayor de edad con email único (pasa).
  * Probar alta de una profesora menor de 18 años o con email duplicado (falla).
  * Probar intento de baja de una profesora con horarios activos asignados (falla con 409, bloquea la baja).
  * Probar baja lógica de una profesora sin horarios activos y posterior reincorporación (pasa).

---

### ***5.1.3 Alumnos e Inscripciones***

#### **US-05 – Pre-inscripción de alumno nuevo**
- **Qué cambió:**
  1. Se registra en una única operación atómica (`POST /preinscripciones`), siendo **obligatorios el DNI y el contacto de emergencia (nombre y teléfono)**.
  2. **Reserva temporal de cupo:** La pre-inscripción reserva el lugar durante `DIAS_RESERVA_PREINSCRIPCION` días (parámetro configurable, 3 por defecto) desde la fecha de inicio; si no se confirma el primer pago en ese plazo, la reserva vence y libera el cupo automáticamente.
  3. Todos los horarios elegidos en una inscripción deben pertenecer a **una misma actividad**.
  4. Un alumno puede contar con **2 o más inscripciones (planes) vigentes en simultáneo**.
- **Bloque actualizado:**

#### ***US-05 \- Pre-inscripción de alumno nuevo***

---

* **Complejidad:** *Alta*
* **Descripción:** Como propietaria o profesora, quiero registrar los datos personales, contacto de emergencia y el plan con sus horarios de un alumno como pre-inscripción, reservando temporalmente su cupo hasta que se confirme su primer pago.
* **Criterios de aceptación:**
  * Debe registrar en un solo flujo los datos personales (incluyendo DNI obligatorio), contacto de emergencia obligatorio (nombre y teléfono) y, si la actividad tiene activo `requiere_medidas`, el peso y la talla iniciales.
  * Todos los horarios de una inscripción deben corresponder a una misma actividad (y a una misma profesora si el plan lo exige). La profesora solo puede pre-inscribir alumnos a su propio cargo.
  * El alumno nuevo queda en estado "inactivo / pre-inscripto" y su inscripción reserva cupo durante `DIAS_RESERVA_PREINSCRIPCION` días (3 por defecto); vencido ese plazo sin pago confirmado, deja de ocupar cupo automáticamente.
  * Un mismo alumno puede tener más de una inscripción vigente en simultáneo (contratación de 2 o más planes).
* **Pruebas de aceptación:**
  * Probar pre-inscripción con todos los datos obligatorios (DNI, contacto de emergencia, plan y horarios de una misma actividad) (pasa).
  * Probar pre-inscripción sin DNI, sin contacto de emergencia o combinando actividades distintas en la misma inscripción (falla).
  * Probar pre-inscripción en actividad que requiere peso y talla sin cargarlos (falla).
  * Probar que una pre-inscripción impaga deje de ocupar cupo una vez superados los días de reserva configurados (pasa).

---

#### **US-06 – Asociación de tutor a alumno menor de edad**
- **Qué cambió:** Si se reutiliza un tutor ya registrado por DNI, el sistema valida que el correo ingresado coincida con el de esa cuenta (`409` en caso contrario). Un tutor puede tener varios menores a cargo y además ser alumno propio. Por privacidad, la profesora solo visualiza nombre y apellido al asociar un tutor existente.
- **Bloque actualizado:**

#### ***US-06 \- Asociación de tutor a alumno menor de edad***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria o profesora, quiero asociar un adulto responsable (padre, madre o tutor) a los alumnos menores de 18 años para gestionar sus accesos, avisos y cobros a través de la cuenta del tutor.
* **Criterios de aceptación:**
  * Si el alumno es menor de 18 años según su fecha de nacimiento, el sistema exige asociar un tutor mayor de edad con correo electrónico válido.
  * Permite reutilizar un tutor ya registrado validando coincidencia de DNI y correo electrónico; un mismo tutor puede tener múltiples menores a su cargo (y también ser alumno propio).
  * El inicio de sesión y las notificaciones de los menores quedan asociados a la cuenta del tutor.
* **Pruebas de aceptación:**
  * Probar alta de alumno menor de 18 años sin cargar tutor (falla).
  * Probar alta de alumno menor asociando un tutor nuevo o existente válido (pasa).
  * Probar reutilizar un DNI de tutor existente ingresando un correo perteneciente a otra cuenta (falla con 409).

---

#### **US-07 – Alta definitiva de alumno al confirmarse el primer pago**
- **Qué cambió:** Ya no es una acción manual separada; ocurre **automáticamente dentro de la misma transacción** en la que se registra el primer pago en efectivo (US-15) o la propietaria aprueba la primera transferencia (US-17), activando la inscripción, activando al alumno y otorgando el rol `ALUMNO` (o `TUTOR` a su responsable).
- **Bloque actualizado:**

#### ***US-07 \- Alta definitiva de alumno al confirmarse el primer pago***

---

* **Complejidad:** *Media*
* **Descripción:** Como sistema, quiero activar automáticamente al alumno y su inscripción en el plan y horarios elegidos en el mismo acto en que se confirma su primer pago (en efectivo o al aprobarse su transferencia), otorgándole su rol de acceso sin recargar datos.
* **Criterios de aceptación:**
  * La inscripción pasa de `PREINSCRIPTA` a `ACTIVA`, el alumno pasa a `ACTIVO` y recibe el rol `ALUMNO` (o su responsable recibe el rol `TUTOR` si es menor) de forma atómica y automática únicamente al confirmarse el primer pago.
  * No debe existir activación manual sin pago confirmado.
* **Pruebas de aceptación:**
  * Probar confirmación del primer pago en efectivo o aprobación de primera transferencia de un pre-inscripto (el alumno, su inscripción y su rol se activan en una sola transacción) (pasa).
  * Probar que una pre-inscripción con transferencia aún pendiente o rechazada no active al alumno ni lo habilite en la lista de asistencia (pasa).

---

#### **US-08 – Baja lógica de alumno**
- **Qué cambió:**
  1. Exige indicar un **motivo de baja** del catálogo del sistema (`ABANDONO`, `MUDANZA`, `SALUD`, `ECONOMICO`, `OTRO`) y permite texto libre (`detalle_baja`) obligatorio cuando se elige `OTRO`.
  2. **Alcance de la baja con 2 o más planes:** Cuando el alumno tiene 2 o más planes activos, el modal solicita elegir el **alcance de la baja**: dar de baja **un solo plan** (el alumno sigue activo con su otro plan) o dar de baja **al alumno completo (todos los planes)**.
  3. **Reactivación:** Al reactivar un alumno dado de baja se informa si dejó deuda al irse y se selecciona nuevo plan y horarios (si alguna vez pagó vuelve como `ACTIVO`; si nunca había pagado vuelve como `PREINSCRIPTA` / `INACTIVO`).
- **Bloque actualizado:**

#### ***US-08 \- Baja lógica de alumno***

---

* **Complejidad:** Media
* **Descripción:** Como propietaria, quiero dar de baja lógicamente una inscripción o al alumno completo registrando el motivo de baja y conservando su historial de pagos y asistencia, para liberar los cupos correspondientes y poder reactivarlo si regresa más adelante.
* **Criterios de aceptación:**
  * Exige seleccionar un motivo de baja (`Abandono`, `Mudanza`, `Salud`, `Motivos económicos` u `Otro motivo` con detalle escrito).
  * Si el alumno tiene 2 o más planes activos, permite elegir entre dar de baja **un solo plan** (manteniendo al alumno activo con los restantes) o dar de baja **al alumno completo (todos sus planes)**.
  * La baja conserva todo el historial de cuotas, pagos y asistencias, y libera inmediatamente el cupo en los horarios de las inscripciones dadas de baja.
  * Permite reactivar a un alumno dado de baja asignándole plan y horarios con cupo disponible (informando en pantalla si registraba deuda al momento de su baja).
* **Pruebas de aceptación:**
  * Probar baja de un alumno indicando motivo (conserva historial y libera cupo en los horarios) (pasa).
  * Probar baja de un solo plan en un alumno con 2 planes activos (cierra solo ese plan y el alumno permanece activo con el otro) (pasa).
  * Probar reactivación de un alumno dado de baja seleccionando nuevo plan y horarios (pasa).

---

#### **US-09 – Modificación de datos de alumno**
- **Qué cambió:** Si al editar la fecha de nacimiento el alumno pasa a ser menor de edad, el sistema exige asociar un tutor. La edición del DNI y fecha de nacimiento requiere permiso de edición de usuarios, y el cambio de plan/horarios se gestiona por su flujo específico (US-14) sin alterar cuotas ya cobradas.
- **Bloque actualizado:**

#### ***US-09 \- Modificación de datos de alumno***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria o profesora a cargo, quiero modificar los datos personales, de contacto, contacto de emergencia, salud (apto médico y observaciones) o tutor de un alumno registrado, para mantener su ficha actualizada.
* **Criterios de aceptación:**
  * Permite editar datos personales, de contacto, contacto de emergencia y apto médico (la profesora solo sobre alumnos con inscripción vigente a su cargo).
  * Si la fecha de nacimiento se modifica a una edad menor de 18 años, exige asociar un tutor responsable.
* **Pruebas de aceptación:**
  * Probar modificación de teléfono, contacto de emergencia y apto médico de un alumno existente (pasa).
  * Probar cambio de fecha de nacimiento a menor de edad sin indicar tutor (falla).

---

#### **US-10 – Consulta y búsqueda de alumnos**
- **Qué cambió:**
  1. La profesora solo ve y busca alumnos con inscripción vigente a su cargo; la propietaria ve todos.
  2. Suma filtros por plan, profesora, actividad, **estado de cuota** y pestañas (*Todos*, *Dados de baja*, *Contactar*).
  3. **Visualización multi-plan:** En el listado, si el alumno tiene 2 o más planes activos muestra el badge `+N` junto al plan y el estado de cuota más crítico. En la ficha muestra el resumen `(+N)` en la cabecera y permite alternar entre sus planes activos mediante *pills* en la pestaña **Plan**, además de consultar su historial paginado de asistencias y (para la propietaria) su historial de cuotas y pagos.
- **Bloque actualizado:**

#### ***US-10 \- Consulta y búsqueda de alumnos***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria o profesora, quiero buscar, filtrar y consultar la ficha integral de los alumnos (datos, planes vigentes, horarios, estado de cuota, rutina, asistencias y cobros), para resolver consultas operativas del día a día.
* **Criterios de aceptación:**
  * Permite buscar por nombre, apellido o DNI, y filtrar de forma combinada por plan, profesora, actividad, estado del alumno y situación de cuota.
  * La profesora solo visualiza en el listado y en la ficha a los alumnos que tienen una inscripción vigente a su cargo; la propietaria visualiza la totalidad del padrón.
  * Si el alumno tiene 2 o más planes activos, el listado mantiene una única fila por alumno indicando la cantidad adicional de planes (`+1`) y su situación de cuota más crítica; y en la ficha permite alternar entre cada uno de sus planes activos para consultar sus horarios, profesora y vencimiento.
  * La ficha incluye el historial paginado de asistencias (con conteo de presentes y ausentes) y, para la propietaria, el historial de cuotas y cobros.
* **Pruebas de aceptación:**
  * Probar búsqueda por nombre o DNI y filtrado por estado de cuota (pasa).
  * Probar visualización en listado y ficha de un alumno con 2 planes activos (muestra indicador `+1` y selector de planes en la ficha) (pasa).
  * Probar que una profesora consulte la ficha de un alumno ajeno o inexistente (falla con 403).

---

### ***5.1.4 Planes y Precios***

#### **US-11 – Alta y edición de planes vigentes**
- **Qué cambió:** Los planes en el catálogo definen modalidad (`MENSUAL` o `CLASE_SUELTA`), frecuencia semanal (`clases_por_semana` o pase libre), si requieren `profesora_unica` y opcionalmente si son exclusivos de una actividad (`id_actividad_exclusiva`). La profesora concreta y los horarios se eligen al inscribir al alumno (no quedan fijos en el catálogo de planes).
- **Bloque actualizado:**

#### ***US-11 \- Alta y edición de planes vigentes***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero crear, editar y dar de baja los planes comerciales definiendo su tipo (mensual o clase suelta), cantidad de clases por semana, precio inicial y si son exclusivos de una actividad o requieren profesora única, para estructurar la oferta del centro.
* **Criterios de aceptación:**
  * Permite crear, editar y desactivar planes indicando nombre, tipo (`MENSUAL` o `CLASE_SUELTA`), cantidad de clases semanales (o pase libre), si exige profesora única y si es exclusivo de una disciplina específica.
  * Al inscribir un alumno en un plan, el sistema valida que los horarios elegidos pertenezcan a una única actividad, respeten la cantidad de clases semanales del plan y cuenten con cupo disponible.
* **Pruebas de aceptación:**
  * Probar alta de un plan mensual con su frecuencia semanal y precio inicial (pasa).
  * Probar edición de un plan existente (pasa).
  * Probar baja lógica de un plan que no deje inscripciones inconsistentes (pasa).

---

#### **US-12 – Actualización de precios con fecha de vigencia**
- **Qué cambió:** Se mantiene la misma lógica (el cobro aplica el precio vigente del plan al día del cobro sin alterar cuotas ya cobradas). No requiere cambios estructurales en la ficha.

---

#### **US-13 – Alta de descuentos y promociones temporales**
- **Qué cambió:** Las promociones admiten descuento por `PORCENTAJE` (mayor a 0 y menor a 100) o `MONTO_FIJO` (menor al precio de cada plan incluido, garantizando siempre un monto a cobrar mayor a 0), aplicables a uno o más planes vigentes en un rango de fechas (`fecha_desde` a `fecha_hasta`), sin campo código promocional. No se permiten dos promociones activas superpuestas sobre un mismo plan (`409`).
- **Bloque actualizado:**

#### ***US-13 \- Alta de descuentos y promociones temporales***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero crear y administrar descuentos y promociones temporales (por porcentaje o monto fijo) sobre uno o más planes vigentes, para incentivar inscripciones en períodos específicos.
* **Criterios de aceptación:**
  * Permite definir nombre, tipo de descuento (`PORCENTAJE` entre 1% y 99%, o `MONTO_FIJO` menor al precio del plan), rango de fechas de vigencia (`fecha_desde` y `fecha_hasta`) y los planes vigentes alcanzados, además de poder desactivarla manualmente.
  * No permite superponer dos promociones activas en el mismo rango de fechas para un mismo plan.
  * La promoción vigente al momento de la inscripción/cambio se vincula a la inscripción y se aplica al calcular la cuota, sin alterar cuotas ya cobradas.
* **Pruebas de aceptación:**
  * Probar alta de promoción y cobro durante su período de vigencia (aplica el descuento correctamente) (pasa).
  * Probar creación de una promoción que se superpone en fechas y plan con otra activa (falla con 409).
  * Probar cobro una vez vencida o desactivada la promoción (aplica el precio normal vigente) (pasa).

---

#### **US-14 – Renovación o cambio de plan**
- **Qué cambió:**
  1. **Actor exclusivo en el código:** Lo realiza **únicamente la propietaria** desde la ficha del alumno (la ruta exige `acceso.rol("PROPIETARIA")` y en la UI el botón solo se habilita a la propietaria; ni el alumno ni las profesoras pueden cambiar planes). Si el alumno tiene 2 o más planes activos, primero solicita elegir cuál de sus planes desea modificar (y no solicita fecha de inicio manual).
  2. **Cambio solo de horarios (mismo plan):** Requiere que la inscripción esté `ACTIVA`, mantiene la misma profesora y actividad, y se aplica de forma **inmediata**.
  3. **Cambio de plan con cuota vigente/en gracia:** Queda **programado** (`cambio_programado`) para aplicarse automáticamente al terminar los días de gracia de la cuota actual, mostrando una insignia/aviso en la ficha y permitiendo cancelarlo antes de su fecha de aplicación. Si la cuota actual ya está vencida, el cambio se aplica en el momento.
- **Bloque actualizado:**

#### ***US-14 \- Renovación o cambio de plan***

---

* **Complejidad:** *Alta*
* **Descripción:** Como propietaria, quiero modificar los horarios o cambiar el plan de una inscripción de un alumno desde su ficha, aplicando el cambio de horarios en el acto y programando el cambio de plan para el cierre del ciclo de cuota vigente cuando corresponda.
* **Criterios de aceptación:**
  * Si el alumno posee 2 o más planes activos, el sistema solicita primero elegir cuál de las inscripciones se desea modificar.
  * Si se mantiene el mismo plan y la inscripción está activa, permite cambiar únicamente los horarios dentro de la misma actividad y profesora, aplicándose de forma inmediata.
  * Si se cambia a otro plan mientras la cuota actual está al día o dentro de los días de gracia, el cambio queda **programado** para aplicarse automáticamente al finalizar la gracia de la cuota en curso (pudiendo cancelarse antes de esa fecha); si la cuota no está vigente, se aplica en el momento.
  * El cambio conserva intacto el historial de asistencias y cuotas previas del alumno.
* **Pruebas de aceptación:**
  * Probar cambio solo de horarios en una inscripción activa dentro de la misma actividad y profesora (pasa, se aplica en el acto).
  * Probar cambio de plan de un alumno con cuota vigente (queda programado para el fin de la gracia, se visualiza en la ficha y permite cancelarse) (pasa).
  * Probar aplicación automática del cambio programado al cumplirse la fecha (pasa, conserva historial).

---

### ***5.1.5 Pagos y Cuotas***

#### **US-15 – Registro de cobro en efectivo**
- **Qué cambió:** Si el alumno tiene 2 o más planes activos, antes de abrir el formulario solicita elegir qué inscripción cobrar. Permite pagos adelantados (cuyo nuevo ciclo inicia al día siguiente del vencimiento actual). Si cobra una profesora, el pago queda con `rendido = false` (para US-19); si cobra la propietaria, queda con `rendido = true`.
- **Bloque actualizado:**

#### ***US-15 \- Registro de cobro en efectivo***

---

* **Complejidad:** *Media*
* **Descripción:** Como profesora o propietaria, quiero registrar el cobro en efectivo de la cuota de una inscripción (primera cuota, renovación o pago adelantado) para actualizar en el acto el estado de habilitación del alumno.
* **Criterios de aceptación:**
  * El cobro en efectivo lo registra la profesora a cargo o la propietaria; si el alumno tiene 2 o más planes activos, permite elegir qué inscripción se está cobrando.
  * Al registrarse, confirma el pago en el acto: si era la primera cuota de una pre-inscripción, ejecuta el alta definitiva del alumno (US-07); si es renovación o pago adelantado, actualiza la fecha de vencimiento y deja la inscripción "al día".
  * Si el cobro lo registra una profesora, queda marcado como pendiente de rendición (`rendido = false`); si lo registra la propietaria, queda rendido automáticamente.
* **Pruebas de aceptación:**
  * Probar registro de cobro en efectivo de una cuota vencida o primera cuota (queda confirmado y la inscripción pasa a "al día") (pasa).
  * Probar registro de cobro en efectivo en alumno con 2 planes activos eligiendo el plan correspondiente (pasa).
  * Probar registro de cobro sin monto válido (falla).

---

#### **US-16 – Registro de pago por transferencia**
- **Qué cambió:**
  1. **Actor y flujo en el código:** La transferencia la informa la **profesora a cargo o la propietaria** en el sistema (el alumno recibe `403` si intenta registrarla; el alumno únicamente consulta el CBU/alias/titular en su portal para realizar la transferencia y avisar en el centro).
  2. **Sin archivo adjunto:** No se sube archivo de comprobante; se registran los datos de la operación (monto, fecha/hora, titular de cuenta de origen y observaciones) para conciliar contra el extracto bancario.
  3. En alumnos con 2 o más planes activos, la transferencia se registra asociada a la inscripción específica (`id_inscripcion`).
- **Bloque actualizado:**

#### ***US-16 \- Registro de pago por transferencia***

---

* **Complejidad:** *Media*
* **Descripción:** Como profesora a cargo o propietaria, quiero informar un pago realizado por el alumno mediante transferencia bancaria asociándolo a su inscripción, para que quede registrado como pendiente de verificación por la propietaria; y como alumno, quiero consultar los datos bancarios del centro desde mi portal para realizar la transferencia.
* **Criterios de aceptación:**
  * El alumno/tutor visualiza en su portal los datos bancarios configurados del centro (CBU, alias y titular) para efectuar la transferencia.
  * La profesora a cargo o la propietaria informa la transferencia en el sistema indicando la inscripción (`id_inscripcion`), el monto, la fecha/hora y el titular de la cuenta origen (sin requerir adjuntar archivo de imagen o comprobante).
  * El pago queda en estado `PENDIENTE` hasta que la propietaria lo apruebe o rechace (US-17).
  * En caso de renovación de un alumno activo, el alumno puede seguir asistiendo dentro del período habilitado mientras la transferencia está pendiente; si es la primera cuota de un pre-inscripto, el alta definitiva ocurre recién cuando la propietaria aprueba la transferencia.
* **Pruebas de aceptación:**
  * Probar informar una transferencia por parte de la profesora a cargo con monto válido (queda pendiente de confirmación asociada a la inscripción) (pasa).
  * Probar intento de informar una transferencia directamente con sesión de alumno o por una profesora ajena (falla con 403).
  * Probar consulta de datos bancarios (CBU, alias, titular) desde el portal del alumno (pasa).

---

#### **US-17 – Aprobación o rechazo de transferencias**
- **Qué cambió:** La bandeja de transferencias pendientes es paginada y permite filtrar por tipo (`PRIMERA_CUOTA` / `RENOVACION`), rango de fechas y orden de antigüedad, mostrando el plan, la inscripción y el monto esperado. El rechazo exige obligatoriamente registrar un motivo de rechazo (`motivo_rechazo`).
- **Bloque actualizado:**

#### ***US-17 \- Aprobación o rechazo de transferencias***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero consultar la bandeja de transferencias pendientes (filtrando por primera cuota o renovación y antigüedad) y aprobarlas o rechazarlas para validar los ingresos y actualizar el estado de la inscripción.
* **Criterios de aceptación:**
  * Lista las transferencias pendientes de forma paginada indicando alumno, plan/inscripción, tipo (primera cuota o renovación), monto informado, monto esperado y antigüedad.
  * Al aprobarse una transferencia de primera cuota, ejecuta en la misma transacción el alta definitiva del alumno (US-07); si es renovación, deja la cuota de esa inscripción "al día".
  * Al rechazarse, el sistema exige ingresar un motivo de rechazo obligatorio (`motivo_rechazo`), el pago pasa a `RECHAZADO` y la inscripción mantiene su estado previo (pendiente de pago o vencida).
* **Pruebas de aceptación:**
  * Probar aprobación de una transferencia pendiente (actualiza la cuota a "al día" o activa al pre-inscripto) (pasa).
  * Probar rechazo de una transferencia pendiente indicando motivo obligatorio (la inscripción vuelve a figurar pendiente de pago o vencida) (pasa).
  * Probar rechazo de una transferencia sin indicar motivo (falla, campo requerido).

---

#### **US-18 – Cálculo del estado de habilitación del alumno**
- **Qué cambió:** Se calcula por cada inscripción del alumno e incorpora los parámetros del sistema editables por la propietaria `DIAS_GRACIA_CUOTA` y `VENCIDOS_PUEDEN_ASISTIR`.
- **Bloque actualizado:**

#### ***US-18 \- Cálculo del estado de habilitación del alumno***

---

* **Complejidad:** *Alta*
* **Descripción:** Como sistema, quiero calcular el estado de cuota y habilitación de cada inscripción según el tipo de plan, los días de gracia configurados (`DIAS_GRACIA_CUOTA`) y la política de asistencia con cuota vencida (`VENCIDOS_PUEDEN_ASISTIR`).
* **Criterios de aceptación:**
  * Planes mensuales: calcula el estado de cada inscripción como “al día”, “por vencer / en gracia” (dentro de `DIAS_GRACIA_CUOTA`) o “vencida” (superados los días de gracia).
  * Clases sueltas / particulares: sin días de gracia; la habilitación rige únicamente para la clase contratada (`CLASE_SUELTA_VIGENTE` / `CLASE_SUELTA_VENCIDA`).
  * El parámetro `VENCIDOS_PUEDEN_ASISTIR` determina si una inscripción vencida permite o bloquea el registro de presente al tomar asistencia.
* **Pruebas de aceptación:**
  * Probar plan mensual dentro de los días de gracia configurados (estado “por vencer / en gracia”) y una vez superados (estado “vencida”) (pasa).
  * Probar clase suelta al día siguiente de la clase contratada (estado “vencida”, sin días de gracia) (pasa).
  * Probar bloqueo o permiso de asistencia en inscripción vencida según el parámetro `VENCIDOS_PUEDEN_ASISTIR` (pasa).

---

#### **US-19 – Control de efectivo pendiente de rendición**
- **Qué cambió:** Permite rendir un cobro individual o **en lote** (todos los pendientes de una profesora o una selección de cobros) y suma una pestaña con el **historial paginado de rendiciones** filtrable por profesora y fechas.
- **Bloque actualizado:**

#### ***US-19 \- Control de efectivo pendiente de rendición***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero controlar los cobros en efectivo pendientes de rendición por parte de cada profesora, marcarlos como rendidos (individualmente o en lote) y consultar el historial de rendiciones para cerrar la caja de manera consistente.
* **Criterios de aceptación:**
  * Lista los cobros en efectivo confirmados no rendidos (`rendido = false`), agrupados y filtrables por profesora y rango de fechas, con subtotales por profesora y total general.
  * Permite registrar la rendición de un cobro individual o de un lote de cobros en una sola operación transaccional, impidiendo rendir dos veces el mismo pago (`409`).
  * Permite consultar el historial paginado de cobros ya rendidos con su fecha de rendición.
* **Pruebas de aceptación:**
  * Probar listado de efectivo pendiente agrupado por profesora (pasa, excluye cobros realizados directamente por la propietaria).
  * Probar rendición individual y en lote por profesora (pasan al historial de rendiciones y dejan de figurar como pendientes) (pasa).
  * Probar intento de volver a rendir un cobro ya rendido (falla con 409).

---

### ***5.1.6 Asistencia***

#### **US-20 – Registro de asistencia por clase**
- **Qué cambió:**
  1. En la lista de la clase solo aparecen alumnos con inscripción **`ACTIVA`** (los pre-inscriptos no aparecen hasta confirmar su primer pago).
  2. La propietaria puede consultar y corregir la asistencia de **días anteriores**.
  3. **No se cancelan clases:** El sistema no dispone de una función para cancelar clases manualmente. Si un día feriado o imprevisto no se dicta una clase, simplemente **no se toma asistencia**; al no registrarse ninguna marca manual, el cierre automático del sistema (US-21) da a **todos los alumnos como presentes** para no penalizar sus rachas ni generar inasistencias indebidas.
- **Bloque actualizado:**

#### ***US-20 \- Registro de asistencia por clase***

---

* **Complejidad:** *Media*
* **Descripción:** Como profesora o propietaria, quiero visualizar la lista de alumnos con inscripción activa en cada clase y registrar su asistencia mediante marcado rápido (presente o ausente) desde el celular o la computadora, pudiendo la propietaria corregir clases de días anteriores; y en caso de que no se dicte una clase, no registrar marcas para que el sistema compute a todos presentes.
* **Criterios de aceptación:**
  * Muestra únicamente a los alumnos con inscripción `ACTIVA` en el horario correspondiente (excluyendo pre-inscriptos sin primer pago confirmado), junto con el indicador de su situación de cuota.
  * Permite marcar de forma rápida presente o ausente para cada alumno mediante botones de acción directa.
  * La propietaria puede consultar y corregir marcas de asistencia en clases de fechas anteriores.
  * No existe acción manual para cancelar clases: si una clase no se dicta (por feriado, fuerza mayor o ausencia docente), no se pasa lista y el sistema da por presentes a todos los inscriptos al cierre de la franja horaria (US-21).
* **Pruebas de aceptación:**
  * Probar marcar presente y ausente a un alumno con inscripción activa en el horario (pasa).
  * Probar que un alumno pre-inscripto (sin pago confirmado) o dado de baja no figure en la lista de asistencia (pasa).
  * Probar corrección de asistencia en una clase pasada por parte de la propietaria (pasa).

---

#### **US-21 – Registro automático de inasistencias**
- **Qué cambió:**
  - Si al cerrarse la ventana de la clase la profesora registró **al menos una marca manual**, todos los demás inscriptos que quedaron sin marcar pasan automáticamente a **ausentes**.
  - Si la ventana cierra **sin ninguna marca manual** (porque no se dictó la clase ese día o no se tomó lista), la clase se cierra automáticamente como dictada dando a **todos los inscriptos como presentes** (evitando penalizar la racha, el ranking o generar faltas injustificadas a los alumnos).
- **Bloque actualizado:**

#### ***US-21 \- Registro automático de inasistencias***

---

* **Complejidad:** *Media*
* **Descripción:** Como sistema, quiero cerrar automáticamente las clases cuya ventana de toma de asistencia haya finalizado, completando como "ausente" a los alumnos no marcados cuando se tomó lista, o dando por presentes a todos los inscriptos si no se registró ninguna marca manual en toda la clase.
* **Criterios de aceptación:**
  * Al cerrarse la ventana horaria de una clase en la que se registró al menos una marca manual, todo inscripto activo sin marca pasa automáticamente a "ausente" y la clase pasa a `DICTADA`.
  * Si la ventana cierra sin ninguna marca manual registrada (por no haberse dictado la clase o no haberse tomado lista), la clase se cierra automáticamente registrando a todos sus inscriptos activos como "presentes".
* **Pruebas de aceptación:**
  * Probar cierre automático de una clase con al menos un presente marcado y otro alumno sin marcar (el alumno sin marcar queda "ausente") (pasa).
  * Probar cierre automático de una clase que no se dictó o no tuvo marcas manuales (todos los inscriptos quedan "presentes" sin cortar rachas ni alterar asistencias) (pasa).

---

#### **US-22 – Detección de alumnos inactivos con cuota al día**
- **Qué cambió:**
  1. Evalúa las últimas asistencias en clases cerradas (`DICTADA`) comparando contra el parámetro `INASISTENCIAS_CONSECUTIVAS_INACTIVO` (3 por defecto) sobre inscripciones activas con cuota al día (`AL_DIA` o `POR_VENCER`).
  2. Funciona como listado/alerta de detección temprana con datos de contacto directo (WhatsApp o teléfono del alumno/tutor), **sin registrar estados de gestión** (`PENDIENTE`, `CONTACTADO`, `IGNORADO`), los cuales no se utilizan en la operación y quedan descartados para limpieza de código.
  3. Excluye a alumnos con cuotas vencidas (se canalizan por el módulo de cobranzas).
- **Bloque actualizado:**

#### ***US-22 \- Detección de alumnos inactivos con cuota al día***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero consultar un listado que detecte automáticamente a los alumnos con inscripción mensual activa y cuota al día que acumulen 3 o más inasistencias consecutivas en clases dictadas, para disponer de sus vías de contacto directo y coordinar acciones de retención temprana.
* **Criterios de aceptación:**
  * Identifica inscripciones mensuales activas con cuota al día (`AL_DIA` o `POR_VENCER`) cuya racha actual de ausencias consecutivas en clases cerradas sea igual o mayor al parámetro `INASISTENCIAS_CONSECUTIVAS_INACTIVO` (3 por defecto).
  * Despliega la información del alumno, plan, profesora a cargo, racha de inasistencias consecutivas, fecha de última asistencia y datos de contacto directo (WhatsApp y teléfono) del alumno o de su tutor en caso de menores de edad.
  * Excluye a alumnos con cuota vencida o inscripciones inactivas/dadas de baja.
  * Si el alumno asiste a una clase posterior dictada, la racha de inasistencias se reinicia inmediatamente y el alumno deja de figurar en el listado.
* **Pruebas de aceptación:**
  * Probar alumno con cuota al día y 3 o más ausencias consecutivas en clases cerradas (aparece en el listado de inactivos) (pasa).
  * Probar que un alumno con cuota vencida no figure en este listado (pasa).
  * Probar que al registrar una presencia posterior, el alumno desaparezca del listado de inactivos (pasa).

---

### ***5.1.7 Honorarios***

#### **US-23 – Informe mensual automático de honorarios**
- **Qué cambió:**
  1. **Regla de cálculo:** El honorario por alumnos a cargo se calcula aplicando el **porcentaje configurado en la tarifa de la profesora (50 % por defecto) sobre lo efectivamente cobrado en el período** (si la cuota tuvo descuento por promoción, se liquida proporcionalmente sobre el **precio de lista** vigente el día de la cuota para no descontarle la promoción a la profesora), sumando las suplencias realizadas y restando las suplencias recibidas (valorizadas por hora según tarifa de suplencia).
  2. **Estados y cierre automático:** Las liquidaciones tienen estados `BORRADOR`, `CERRADA` y `PAGADA`, y se cierran automáticamente a partir del día configurado en `DIA_CIERRE_HONORARIOS`.
  3. **Exclusividad para la propietaria:** Los profesores **nunca pueden visualizar honorarios ni liquidaciones** (es una regla estricta del negocio por confidencialidad financiera). La visualización, cálculo y gestión de pagos es potestad exclusiva de la Propietaria (`HONORARIOS_VER_TODOS`, `HONORARIOS_LIQUIDAR`).
- **Bloque actualizado:**

#### ***US-23 \- Informe mensual automático de honorarios***

---

* **Complejidad:** *Alta*
* **Descripción:** Como propietaria, quiero generar y administrar las liquidaciones mensuales de honorarios de cada profesora según el porcentaje configurado sobre las cuotas cobradas de sus alumnos a cargo y los ajustes por suplencias, manteniendo la confidencialidad financiera absoluta frente al plantel docente.
* **Criterios de aceptación:**
  * Módulo y endpoints de acceso estrictamente reservado para la propietaria (`PROPIETARIA`). Los profesores nunca tienen acceso para visualizar liquidaciones ni tarifas de honorarios (ni propias ni ajenas).
  * Calcula el honorario base aplicando la tarifa porcentual de la profesora (50 % por defecto) sobre los pagos confirmados en el período de sus inscripciones a cargo (tomando el precio de lista del día de la cuota cuando existió promoción), más créditos por suplencias dictadas y menos débitos por suplencias recibidas (valorizadas por hora).
  * Gestiona el ciclo de vida de la liquidación (`BORRADOR`, `CERRADA`, `PAGADA`), con cierre mensual automático a partir del parámetro `DIA_CIERRE_HONORARIOS`.
* **Pruebas de aceptación:**
  * Probar cálculo de liquidación mensual al 50 % de lo cobrado por parte de la propietaria (incluyendo el ajuste a precio de lista cuando hubo promoción y el impacto de suplencias) (pasa).
  * Probar que cualquier usuario con rol profesor/a que intente acceder a la sección o endpoints de liquidaciones y tarifas reciba error `403 Forbidden` (pasa).

---

#### **US-24 – Registro de suplencias entre profesoras**
- **Qué cambió:** Permite crear (`POST`), modificar (`PATCH`) y eliminar (`DELETE`, devolviendo la clase a la titular) suplencias, cambiando a la profesora dictante de la clase para que la suplente pueda tomar asistencia. No permite modificar ni eliminar una suplencia perteneciente a un período cuya liquidación ya esté `CERRADA` o `PAGADA`.
- **Bloque actualizado:**

#### ***US-24 \- Registro de suplencias entre profesoras***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero registrar, modificar o anular suplencias entre profesoras para habilitar a la suplente a tomar asistencia en esa clase y reflejar automáticamente el crédito y descuento horario en la liquidación mensual de honorarios.
* **Criterios de aceptación:**
  * Permite registrar una suplencia indicando horario, fecha y profesora suplente activa (distinta de la titular), asignándola como dictante de la clase para la toma de asistencia.
  * Permite modificar la suplente o anular la suplencia (devolviendo la clase a la titular) siempre que el período no tenga una liquidación `CERRADA` o `PAGADA`.
  * En la liquidación mensual (US-23), las horas cubiertas se suman a la suplente y se descuentan a la titular según su tarifa por hora de suplencia.
* **Pruebas de aceptación:**
  * Probar registro de suplencia y verificar que se descuente de la titular y se acredite a la suplente en la liquidación (pasa).
  * Probar intento de asignar como suplente a la misma titular o a una profesora inactiva (falla).

---

### ***5.1.8 Notificaciones y Alertas***

#### **US-25 – Aviso automático de vencimiento de cuota (al alumno)**
- **Qué cambió:** El aviso se emite cuando la cuota **cambia de estado** a *por vencer / en gracia* (al vencer la fecha e iniciar los días de gracia) o a *vencida* (al terminar los días de gracia), incluyendo las fechas en el texto. Si el alumno es menor, el aviso se envía a su tutor. Además de figurar en la bandeja de notificaciones de la app, se envía mediante **notificaciones Web Push al celular**.
- **Bloque actualizado:**

#### ***US-25 \- Aviso automático de vencimiento de cuota (al alumno)***

---

* **Complejidad:** Media
* **Descripción:** Como sistema, quiero enviar un aviso automático al alumno (o a su tutor si es menor) cuando su cuota entre en el período de gracia ("por vencer") y cuando supere los días de gracia ("vencida"), tanto en la bandeja de notificaciones de la aplicación como mediante notificaciones push en su celular.
* **Criterios de aceptación:**
  * Genera automáticamente una notificación sin duplicados cuando la cuota pasa a estado "por vencer" (al iniciar los días de gracia) y cuando pasa a "vencida" (al finalizar la gracia).
  * Si el alumno es menor de edad, el destinatario de la notificación es su tutor responsable.
  * Entrega el aviso en la bandeja interna del usuario y, si activó los avisos en su dispositivo, mediante Web Push al navegador/celular.
* **Pruebas de aceptación:**
  * Probar generación de aviso al entrar en días de gracia y al vencer la gracia, verificando que llegue al dispositivo suscripto por push sin duplicarse (pasa).
  * Probar que un alumno con cuota al día no reciba aviso de vencimiento (pasa).

---

#### **US-26 – Resumen diario para la propietaria**
- **Qué cambió:** **Eliminada del código** el 13/11/2026 (`PRUEBAS-INTEGRACION.md` v2.39: se retiraron `ResumenDiarioPropietaria` y el endpoint `GET /resumen-diario`).
- **Acción en el documento:** **Borrar la ficha de US-26**.

---

### ***5.1.9 Rutina y Progreso***

#### **US-27 – Carga de rutina y evolución física**
- **Qué cambió:** En el código real, el módulo de rutinas incorpora un **catálogo interactivo de ejercicios** con buscador y tarjetas con miniaturas visuales, carga estructurada por días de entrenamiento (series, repeticiones, peso/carga y observaciones), y registro de evolución corporal (peso, talla y medidas) con validación de valores positivos. La profesora solo puede cargar rutinas y mediciones a alumnos a su cargo; la propietaria, a cualquier alumno.
- **Bloque actualizado:**

#### ***US-27 \- Carga de rutina y evolución física***

---

* **Complejidad:** *Media*
* **Descripción:** Como profesora a cargo o propietaria, quiero cargar y editar las rutinas de entrenamiento estructuradas por días (seleccionando ejercicios del catálogo visual) y los registros de evolución física de un alumno para hacer el seguimiento de sus metas.
* **Criterios de aceptación:**
  * Dispone de un catálogo de ejercicios predefinido con miniaturas y buscador para armar la rutina dividida por días de la semana, configurando series, repeticiones y cargas.
  * Permite registrar mediciones periódicas de evolución física (peso, talla y perímetros corporales en valores positivos).
  * La profesora solo puede gestionar rutinas y mediciones de alumnos a su cargo; la propietaria puede hacerlo sobre cualquier alumno.
* **Pruebas de aceptación:**
  * Probar armado de rutina por días seleccionando ejercicios del catálogo en un alumno a cargo (pasa, actualiza la rutina vigente).
  * Probar registro de medición de peso y medidas corporales (pasa, actualiza el historial).
  * Probar intento de carga de medición con valor negativo o sobre un alumno ajeno por parte de una profesora (falla).

---

#### **US-28 – Consulta de rutina y progreso físico**
- **Qué cambió:** El portal del alumno y del tutor expone la rutina vigente detallada por días y un **gráfico interactivo de evolución temporal** para seguir los cambios en peso y medidas corporales a lo largo de los meses. Soporta **selector de menor a cargo** para el tutor y **filtrado de rutina por plan activo** (`id_inscripcion`) cuando el alumno entrena en 2 o más planes.
- **Bloque actualizado:**

#### ***US-28 \- Consulta de rutina y progreso físico***

---

* **Complejidad:** *Media*
* **Descripción:** Como alumno o tutor, quiero consultar desde el celular la rutina vigente dividida por días y el gráfico de progreso de mis mediciones corporales según el plan seleccionado, para seguir mi entrenamiento y evaluar mi evolución física.
* **Criterios de aceptación:**
  * Muestra la rutina vigente organizada por días de entrenamiento con sus ejercicios, series y repeticiones.
  * Presenta un gráfico interactivo de evolución de mediciones corporales a lo largo del tiempo.
  * El alumno consulta su propia rutina y mediciones; el tutor puede alternar entre sus menores a cargo mediante el selector superior.
  * Si el alumno tiene 2 o más planes activos, la vista permite alternar entre las rutinas asociadas a cada plan (mostrando estado vacío si ese plan no posee rutina cargada).
* **Pruebas de aceptación:**
  * Probar consulta de rutina y gráfico de evolución física alternando entre planes activos o menores a cargo (pasa).
  * Probar intento de consulta de rutina o progreso de un alumno ajeno (falla con 403, acceso restringido).

---

### ***5.1.10 Portal del Alumno***

#### **US-29 – Consulta de estado de plan, asistencias y próximas clases**
- **Qué cambió:**
  1. Soporta el caso de alumnos con **2 o más planes activos**: muestra en la barra superior el selector de plan (`SelectorDePlan`, o integrado en `SelectorDeAlumno` si además es tutor con menores a cargo) con puntos de alerta de color (rojo si la cuota está vencida, ámbar si está en gracia) y filtra el panel principal, *Mis clases* y *Mi perfil* según el plan elegido.
- **Bloque actualizado:**

#### ***US-29 \- Consulta de estado de plan, asistencias y próximas clases***

---

* **Complejidad:** *Media*
* **Descripción:** Como alumno o tutor, quiero consultar desde mi celular el estado de cada uno de mis planes activos (o de mis menores a cargo), la situación y vencimiento de la cuota, el historial de asistencias y las próximas clases inscriptas, para llevar control de la actividad en el centro.
* **Criterios de aceptación:**
  * Muestra en el panel principal, *Mis clases* y *Mi perfil* el estado de cuota, fecha de vencimiento, profesora, horarios, próximas clases e historial de asistencias del plan activo.
  * Si el alumno (o el menor seleccionado por el tutor) cuenta con 2 o más planes activos, habilita en la barra superior un selector de plan con indicadores visuales de alerta de cuota (vencida o en gracia) que actualiza todas las vistas del portal según el plan elegido.
* **Pruebas de aceptación:**
  * Probar consulta del panel de un alumno con 1 plan activo y de un alumno con 2 planes activos alternando desde el selector superior (pasa, actualiza cuota, clases y asistencias de cada plan).
  * Probar consulta por parte de un tutor alternando entre sus menores a cargo (pasa).

---

#### **US-31 – Insignias y racha de asistencia**
- **Qué cambió:** Se cerró el criterio que el documento tenía *"a definir"*: el catálogo consta de **6 insignias** (*Racha de 10 clases*, *Racha de 25 clases*, *Total de 50 clases*, *Total de 100 clases*, *Mes perfecto* y *Podio del mes*). Las clases con suplencia o no dictadas (donde no se toma lista y se computa presente a todos) conservan la racha; y las insignias mensuales (*Mes perfecto* y *Podio del mes*) exigen haber tenido al menos `RANKING_MINIMO_CLASES` (4 por defecto) clases dictadas en el mes.
- **Bloque actualizado:**

#### ***US-31 \- Insignias y racha de asistencia***

---

* **Complejidad:** *Media*
* **Descripción:** Como alumno, quiero recibir insignias por mis logros de asistencia y ver mi racha de clases consecutivas en mi panel, para sentirme motivado a sostener mi rutina.
* **Criterios de aceptación:**
  * La racha se calcula sobre clases dictadas seguidas con presente registrado; una inasistencia injustificada vuelve la racha a cero.
  * El sistema otorga automáticamente las 6 insignias del catálogo al alcanzarse su umbral: *Racha de 10 clases*, *Racha de 25 clases*, *Total de 50 clases*, *Total de 100 clases*, *Mes perfecto* (100 % de asistencia en el mes con al menos `RANKING_MINIMO_CLASES = 4` clases previstas) y *Podio del mes* (top 3 del ranking mensual con ese mismo mínimo).
* **Pruebas de aceptación:**
  * Probar incremento de racha y otorgamiento automático de insignia al alcanzar el umbral en clases dictadas (pasa).
  * Probar corte de racha tras una inasistencia registrada (pasa).

---

### ***5.1.11 Difusión y Analítica de Negocio***

#### **US-32 – Portal público institucional y catálogo de actividades**
- **Qué cambió:** 
  1. **Readecuación de arquitectura:** Se reemplazó el panel dinámico de cupos minuto a minuto por una **landing page institucional (`/`)** y una vista de **catálogo de disponibilidad (`/disponibilidad`)** desacopladas del backend.
  2. **Protección de recursos en la nube:** Para no despertar instancias de servidor ni agotar horas/cuota del plan gratuito de base de datos (PostgreSQL en Neon) por tráfico anónimo o bots de indexación, el catálogo de actividades, modalidades y días se sirve estáticamente desde el frontend (`actividades-del-centro.ts`).
  3. **Canales de contacto y conversión:** El visitante consulta las actividades y días vigentes, accede a la ubicación geográfica exacta mediante mapa interactivo con Leaflet, consulta disponibilidad de vacantes directamente a través de botones oficiales de WhatsApp e Instagram, y cuenta con acceso directo a la pantalla de inicio de sesión (`/login`).
- **Bloque actualizado:**

#### ***US-32 \- Portal público institucional y catálogo de actividades***

---

* **Complejidad:** *Media*
* **Descripción:** Como visitante (sin necesidad de iniciar sesión), quiero acceder al portal público del centro para conocer su oferta de actividades, modalidades y días de cursado, visualizar su ubicación física en el mapa y disponer de canales de contacto directo y enlace al inicio de sesión.
* **Criterios de aceptación:**
  * Acceso libre y sin autenticación previa a la página principal (`/`) y a la vista de disponibilidad (`/disponibilidad`).
  * Presenta la portada institucional del centro y el catálogo de actividades vigentes (nombre, descripción, modalidad grupal o personalizada, días de cursado y cantidad de horarios semanales).
  * Incluye mapa interactivo con la ubicación geográfica del centro e integración de enlaces directos a WhatsApp e Instagram para consultar cupos y tarifas.
  * Se sirve de forma desacoplada de la base de datos principal para optimizar tiempos de carga y evitar consumo innecesario de recursos ante visitas anónimas.
  * Dispone de botón visible de acceso para que los usuarios registrados naveguen directamente a la pantalla de login (`/login`).
* **Pruebas de aceptación:**
  * Probar navegación anónima en `/` y en `/disponibilidad` (pasa, renderiza portada, catálogo de actividades y mapa interactivo sin requerir token ni sesión).
  * Probar botón de ingreso a la plataforma desde el encabezado público (pasa, redirige a `/login`).
  * Probar enlaces de contacto por WhatsApp e Instagram (pasa, abren los canales oficiales del centro).

---

### ***5.1.12 Reportes y Fidelización***

#### **US-30 – Ranking de asistencia entre alumnos**
- **Qué cambió:** En el código real, el ranking incluye medallas para los primeros puestos del podio (oro, plata y bronce) y una función interactiva para que el alumno genere una imagen/tarjeta visual para compartir en redes. Exige que el alumno tenga al menos `RANKING_MINIMO_CLASES` (4 por defecto) clases previstas en el período para figurar; desempata por porcentaje de asistencia descendente, cantidad de clases asistidas descendente y nombre ascendente; permite filtrar por actividad y período, y destaca la fila propia (`es_propia`) cuando consulta un alumno/tutor.
- **Bloque actualizado:**

#### ***US-30 \- Ranking de asistencia entre alumnos***

---

* **Complejidad:** *Media*
* **Descripción:** Como usuario registrado (alumno, tutor, profesor/a o propietaria), quiero visualizar el ranking mensual de asistencia entre alumnos filtrable por actividad y período, con medallas en el podio y opción de generar una tarjeta para compartir mi progreso en redes.
* **Criterios de aceptación:**
  * Incluye a los alumnos que alcancen el mínimo de clases previstas en el período (`RANKING_MINIMO_CLASES = 4`), ordenados por porcentaje de asistencia descendente, cantidad de clases asistidas descendente y nombre ascendente.
  * Distingue con medallas visuales de oro, plata y bronce a las tres primeras posiciones del ranking mensual.
  * Es accesible para todos los roles registrados, resalta la fila del alumno o tutor en consulta y permite generar una imagen/tarjeta del resultado para compartir.
* **Pruebas de aceptación:**
  * Probar consulta del ranking verificando el orden de desempate y la exclusión de quienes tienen menos del mínimo de clases (pasa).
  * Probar acceso desde el portal del alumno (destaca su propia posición con medalla y tarjeta para compartir) y desde el panel de la propietaria/profesora (pasa).

---

#### **US-33 – Informe de asistencia**
- **Acción en el documento:** **Eliminar la ficha de US-33** de la sección de reportes.
- **Motivo del cambio en el sistema:** Retirada como pantalla de reporte independiente en el frontend (la ruta `/app/reportes/asistencia` redirige a `/app/reportes/ranking`). El compromiso y control de asistencia periódica quedaron centralizados y resueltos de forma más representativa a través del **Ranking de asistencia** (US-30).

---

#### **US-34 – Informe de cuotas vencidas**
- **Acción en el documento:** **Eliminar la ficha de US-34** de la sección de reportes.
- **Motivo del cambio en el sistema:** Retirada de la sección analítica de Reportes (la ruta redirige a cobros). El seguimiento de cuotas vencidas, deudores y montos impagos se trasladó a las herramientas operativas diarias: la **Búsqueda y listado de alumnos** (US-10, filtrando por estado de cuota "Vencida") y la bandeja de **Cobros**.

---

#### **US-35 – Reportes de inscriptos por mes**
- **Qué cambió:** Además de agrupar las altas definitivas por mes, el reporte incluye las **bajas por mes**, los **alumnos activos al cierre de cada mes**, el **desglose por motivos de baja** y la **permanencia promedio**, permitiendo comparar entre años.
- **Bloque actualizado:**

#### ***US-35 \- Reportes de inscriptos por mes***

---

* **Complejidad:** *Media*
* **Descripción:** Como propietaria, quiero visualizar reportes mensuales de evolución del padrón (nuevas altas definitivas, bajas, activos por mes, distribución por motivos de baja y permanencia promedio), para analizar el crecimiento y la retención del centro.
* **Criterios de aceptación:**
  * Agrupa por mes calendario las altas definitivas, las bajas registradas y el total de alumnos activos, permitiendo comparar períodos anuales.
  * Expone el desglose de bajas según el motivo registrado (US-08) y el indicador de permanencia promedio de los alumnos.
* **Pruebas de aceptación:**
  * Probar visualización del reporte en un año con altas y bajas registradas (muestra evolución mensual, motivos de baja y permanencia) (pasa).
  * Probar consulta de meses sin movimientos (muestra valores en cero sin error) (pasa).

---

#### **US-36 y US-37 – Planes más elegidos y Mapa de calor de ocupación**
- **Qué cambió:** Ambas se mantienen vigentes en el código sin cambios respecto a la especificación original, completando las 4 pestañas oficiales de Reportes (junto a US-30 e US-35):
  - **US-36** (*Planes más elegidos*): distribución y porcentaje de inscriptos por plan.
  - **US-37** (*Mapa de calor de ocupación de horarios*): matriz semanal de franjas horarias con niveles de ocupación.

---

## 5.2 Diseño de Interfaz (Ajustes en 5.2.2 y 5.2.4)

### Qué cambió en el código
1. En **5.2.2 Layouts por rol**, se debe actualizar la referencia a `US-02 Definición de permisos por rol` por los layouts fijos del sistema (`OwnerLayout`, `ClasesProfesoraLayout`, `AlumnoLayout`), ya que la matriz de permisos no se configura desde una pantalla administrativa sino que está fijada por código.
2. En **5.2.4 Panel principal del alumno**, se debe retirar la viñeta `* US-14 Renovación o cambio de plan` (ya que el cambio de plan y horarios se realiza desde la ficha del alumno en el panel de propietaria/profesora, no en el portal del alumno).

### Bloques actualizados para la Sección 5.2

#### ***5.2.2 Layouts por rol***
* Layouts predefinidos por rol en el sistema (Propietaria, Profesora, Alumno/Tutor) con navegación protegida por guardias de sesión y permisos (RBAC).

#### ***5.2.4 Panel principal del alumno***
* US-29 Consulta de estado de plan, asistencias y próximas clases (con selector de plan activo y selector de menor a cargo)
* US-31 Insignias y racha de asistencia
* US-30 Ranking de asistencia entre alumnos
* US-28 Consulta de rutina y progreso físico
