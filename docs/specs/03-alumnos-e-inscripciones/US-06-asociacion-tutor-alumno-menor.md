# US-06 – Asociación de tutor a alumno menor de edad

## 1. Información general

- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Asociar de forma obligatoria un tutor (padre, madre o responsable legal) a los alumnos menores de 18 años, definiendo quién será el titular de contacto, responsable del consentimiento y usuario del portal para pagos y avisos.

## 3. Descripción

Como propietaria o profesora, quiero que el sistema detecte automáticamente si un alumno es menor de edad a partir de su fecha de nacimiento y exija los datos de su tutor en el mismo formulario de pre-inscripción o edición, para asegurar la comunicación legal, el seguimiento de emergencias y el acceso al portal de pagos por parte del adulto a cargo.

## 4. Estados de la pantalla / flujo

- [ ] **Formulario con fecha de nacimiento**: Campo de fecha en el Paso 1 de pre-inscripción o en la edición de datos personales.
- [ ] **Detección dinámica de edad**: Evaluación reactiva en tiempo real (`esMenorDeEdad(fechaNacimiento)`):
  - **Mayor de 18 años**: La sección de tutor permanece oculta o deshabilitada.
  - **Menor de 18 años**: Se expande inmediatamente la tarjeta "Datos del Tutor Responsable", activando la obligatoriedad de sus campos en el esquema Zod.
- [ ] **Validación de contacto**: Verificación de teléfono y correo electrónico del tutor.
- [ ] **Visualización en Ficha y Ausentes**: Despliegue de los datos del tutor responsable en la ficha del alumno (`AlumnoDetallePage`) y en el panel de ausencias (`AusentesPage`).
- [ ] **Guardado exitoso**: Persistencia vinculada del alumno con su tutor.

## 5. Datos que necesita

### Datos del alumno evaluados

- **Fecha de nacimiento** (`fecha_nacimiento`): Formato `AAAA-MM-DD`. Entrada base para el cálculo de la función `calcularEdad`.

### Datos del tutor responsable (Obligatorios si es menor)

- **Nombre del tutor**: Obligatorio (2 a 60 caracteres).
- **Apellido del tutor**: Obligatorio (2 a 60 caracteres).
- **Parentesco**: Obligatorio. Selector con opciones: `Madre`, `Padre`, `Tutor Legal`, `Otro`.
- **Teléfono de contacto**: Obligatorio (entre 7 y 15 dígitos numéricos).
- **Correo electrónico**: Obligatorio para vincular la cuenta de acceso al portal y notificaciones de cuotas.

## 6. Acciones del usuario

- Ingresar o modificar la fecha de nacimiento del alumno.
- Completar los datos del adulto responsable cuando el formulario lo requiera.
- Visualizar en la ficha del alumno la relación con su tutor.
- Enviar mensajes directos de WhatsApp o iniciar llamadas al teléfono del tutor desde el panel de ausencias (`/ausentes`).

## 7. Reglas de negocio

1. **Cálculo Preciso de Mayoría de Edad**: La función `calcularEdad` descuenta años teniendo en cuenta el día y mes exacto respecto a la fecha actual argentina. Se considera menor a quien tenga estrictamente menos de 18 años (`edad < 18`).
2. **Exigencia Ineludible**: Un alumno menor de 18 años no puede ser pre-inscripto ni guardado sin los datos completos de su tutor (nombre, apellido, parentesco, teléfono y email).
3. **Cuenta de Usuario del Portal**: Para los menores de edad, las credenciales de acceso al portal "Mi Plan" (US-16) y la recepción de comprobantes quedan a nombre del correo electrónico del tutor.
4. **Reutilización Familiar**: Un mismo tutor puede figurar como responsable de más de un alumno menor (hermanos o familiares a cargo).
5. **No Exigencia en Mayores**: En alumnos de 18 años o más, los campos de tutor no se solicitan ni se muestran.

## 8. Criterios de aceptación

- [ ] **CA-01 (Menor de edad detectado)**: Ingresar fecha de nacimiento correspondiente a un menor (ej. 15 años) → se despliega la sección de tutor con todos sus campos marcados como obligatorios.
- [ ] **CA-02 (Bloqueo por tutor incompleto)**: Intentar avanzar o guardar un alumno menor sin teléfono o parentesco del tutor → la validación Zod bloquea el formulario.
- [ ] **CA-03 (Mayor de edad)**: Ingresar fecha de nacimiento de mayor de edad (ej. 25 años) → la sección de tutor no se exige.
- [ ] **CA-04 (Trazabilidad en Ausencias)**: En `/ausentes`, las tarjetas de alumnos menores muestran el nombre del tutor y su teléfono con botón de contacto directo.
- [ ] **CA-05 (Ficha del alumno)**: En `AlumnoDetallePage`, se visualiza la tarjeta de información del tutor junto al estado de la inscripción.

## 9. Casos borde / Errores

- Alumno que cumple 18 años durante su estadía en el centro → conserva el registro histórico del tutor en su ficha sin alterar sus cuotas.
- Fecha de nacimiento futura o con más de 120 años → rechazo por validación en `obtenerLimitesFechaNacimiento`.
- Teléfono del tutor con formato inválido → feedback visual antes del envío.

## 10. Dependencias y Trazabilidad

- **US-05**: Asistente de pre-inscripción de alumnos nuevos (Paso 1).
- **US-09**: Edición de datos personales del alumno existente.
- **US-16**: Portal "Mi Plan" para consulta de cuotas y transferencias por parte del tutor.
- **US-22**: Detección de inactividad y contacto prioritario al tutor del menor.
- **Backend**:
  - Relación entre tablas `alumnos` y `usuarios` (rol `TUTOR`).
  - Endpoints `POST /api/v1/alumnos` y `PATCH /api/v1/alumnos/:id`.

## 11. Notas de implementación (Frontend)

- **Utilidades clave**:
  - `edad.ts`: Funciones `calcularEdad`, `esMenorDeEdad` y `obtenerLimitesFechaNacimiento`.
- **Componentes**:
  - `Paso1DatosPersonales`: Integración de campos condicionales en el wizard.
  - `alumno-edicion-form.tsx`: Edición de datos del tutor para alumnos ya registrados.
  - `AusentesPage`: Visualización del tutor en tarjetas y tablas de alumnos ausentes.
- **Tests**: `edad.test.ts` y `alumno-alta.schema.test.ts`.
