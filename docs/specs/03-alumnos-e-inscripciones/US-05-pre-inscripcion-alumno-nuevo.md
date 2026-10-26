# US-05 – Pre-inscripción de alumno nuevo

## 1. Información general

- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo

Registrar los datos personales, de contacto y de salud de un alumno nuevo junto con el plan y los horarios elegidos, dejándolo en estado inicial "pendiente de pago" hasta que se registre y confirme su primer abono.

## 3. Descripción

Como propietaria o profesora, quiero registrar los datos de un alumno nuevo y vincularlo a un plan y a los horarios semanales de una docente a través de un asistente por pasos, para que quede registrado en el centro en estado pendiente de alta hasta que se confirme su primer pago.

## 4. Estados de la pantalla / flujo

- [ ] **Modal de Pre-inscripción (`ModalPreinscripcion`)**: Asistente interactivo flotante centrado con barra de progreso (`StepperBar`) dividido en 3 pasos:
  - **Paso 1 (Datos Personales y Contacto)**: Nombre, apellido, DNI, fecha de nacimiento (con cálculo dinámico de edad), teléfono, email, contacto de emergencia y despliegue automático de tutor si es menor.
  - **Paso 2 (Plan y Horarios)**: Selección de plan vigente y horarios disponibles de la profesora asignada que cumplan la frecuencia del plan.
  - **Paso 3 (Confirmación y Medidas)**: Resumen del alta y carga de peso y talla (`CamposMedidas`) si la actividad seleccionada requiere seguimiento antropométrico.
- [ ] **Pantalla de Éxito (`PantallaExito`)**: Confirmación visual dentro del modal con resumen del alumno pre-inscripto y botones de acción rápida.
- [ ] **Bandeja de Pendientes (`PendientesDeAltaPage`)**: Listado dedicado para consultar alumnos que completaron la pre-inscripción y esperan su primer pago (US-07).
- [ ] **Validación en tiempo real**: Validación paso a paso con esquemas Zod antes de habilitar el botón "Siguiente".
- [ ] **Error**: Feedback visual claro ante documento duplicado, falta de cupo o problemas de conexión.

## 5. Datos que necesita

### Datos personales y de contacto (Paso 1)

- **Nombre** y **Apellido**: Obligatorios (2 a 60 caracteres).
- **DNI**: Obligatorio. Documento numérico único.
- **Fecha de nacimiento**: Obligatoria (`AAAA-MM-DD`). Calcula dinámicamente la edad.
- **Teléfono de contacto**: Obligatorio (entre 7 y 15 dígitos).
- **Email**: Opcional en mayores; obligatorio en tutores.
- **Contacto de emergencia**: Nombre y teléfono de emergencia (obligatorios).
- **Datos del tutor**: Obligatorios si el alumno tiene menos de 18 años (US-06).

### Datos de plan y horarios (Paso 2)

- **Plan seleccionado**: Obligatorio. Define la frecuencia semanal, el precio sugerido y la modalidad de cobro.
- **Actividades disponibles**: Se filtran dinámicamente según el plan elegido. Para planes con frecuencia semanal de 5 clases (ej: Plan Premium, Plan 5 días), solo se presentan actividades con frecuencia semanal suficiente ($\ge 5$ días distintos). Para planes con actividad exclusiva (ej: Plan Kids), solo se muestra su actividad asociada (Kid Fit), quedando oculta en los demás planes.
- **Profesora a cargo**: Docente titular de la inscripción que dicta la actividad seleccionada con oferta horaria suficiente.
- **Horarios semanales elegidos**: Horarios que dicta la docente seleccionada que no excedan la frecuencia permitida por el plan.

### Datos antropométricos (Paso 3 - Condicionales)

- **Peso (kg)** y **Talla (cm)**: Obligatorios únicamente si la actividad elegida tiene activada la marca `requiere_medidas`.

### Datos que se generan

- **Estado de la inscripción**: `PENDIENTE` (pendiente de confirmación de pago).
- **Fecha de pre-inscripción**: Marca de tiempo del registro.

## 6. Acciones del usuario

- Iniciar el asistente de pre-inscripción desde el listado de alumnos o desde el cronograma.
- Avanzar o retroceder entre los pasos del formulario manteniendo los datos ingresados en memoria.
- Seleccionar plan, actividad y horarios disponibles verificando el cupo en tiempo real.
- Confirmar la pre-inscripción.
- Consultar el listado de alumnos pre-inscriptos en la bandeja de pendientes.

## 7. Reglas de negocio

1. **Estado Inicial Pendiente**: El alumno no queda formalmente habilitado para ingresar ni se le otorga acceso al sistema hasta que se registre el primer pago (US-07).
2. **Restricción por Rol Docente**: Si la pre-inscripción es iniciada por una **Profesora**, el selector de docente se fija a su propio usuario y solo se permite elegir horarios que estén a su cargo.
3. **Misma Profesora por Inscripción**: Todos los horarios elegidos para una misma inscripción deben corresponder a una única profesora titular.
4. **Filtrado y Respeto de Frecuencia y Cupo**: Las actividades mostradas deben garantizar que al menos una profesora posea clases en días distintos suficientes para completar la frecuencia semanal del plan. No se puede seleccionar una cantidad de horarios mayor a la frecuencia semanal permitida por el plan, y cada horario debe poseer cupo libre al momento de confirmar.
5. **Exclusividad de Actividades**: Los planes con actividad exclusiva restringen la selección únicamente a dicha disciplina, y esta se oculta del resto de los planes generales.
6. **Detección de Menores**: Si la fecha de nacimiento arroja menos de 18 años, el Paso 1 exige indefectiblemente los datos del adulto responsable (US-06).
7. **Medidas Condicionales**: Peso y talla solo se solicitan y validan si la disciplina de la inscripción así lo exige en su configuración base.

## 8. Criterios de aceptación

- [ ] **CA-01 (Pre-inscripción completa)**: Completar los 3 pasos con datos válidos → se registra la pre-inscripción en estado `PENDIENTE` y se muestra la pantalla de éxito.
- [ ] **CA-02 (Validación de rol docente)**: Una profesora autenticada solo visualiza y asigna sus propios horarios en el Paso 2.
- [ ] **CA-03 (Menor sin tutor)**: Intentar avanzar del Paso 1 con un menor de edad sin completar el tutor → el esquema Zod bloquea el paso.
- [ ] **CA-04 (Actividad con medidas requeridas)**: En actividades con `requiere_medidas`, el Paso 3 exige peso y talla válidos antes de confirmar.
- [ ] **CA-05 (Bandeja de pendientes)**: El alumno registrado aparece inmediatamente en `PendientesDeAltaPage` listo para recibir el cobro de la primera cuota.

## 9. Casos borde / Errores

- DNI ya registrado en el sistema → advertencia inmediata de documento duplicado.
- Horario seleccionado que agota su cupo antes de enviar → aviso de cupo completo al intentar guardar el Paso 2.
- Navegación hacia atrás en el wizard → conserva los valores ya completados sin resetear el formulario.

## 10. Dependencias y Trazabilidad

- **US-03 y US-04**: Catálogo de actividades, cupos y horarios semanales disponibles.
- **US-06**: Asociación obligatoria de tutores a menores de edad.
- **US-07 y US-15**: Alta definitiva activada al cobrar la primera cuota.
- **US-11**: Planes vigentes con su modalidad de cobro y frecuencia.
- **Backend**:
  - `POST /api/v1/alumnos`: alta del registro personal y pre-inscripción.
  - `GET /api/v1/alumnos/pendientes`: listado para la bandeja de pendientes.

## 11. Notas de implementación (Frontend)

- **Componentes clave**:
  - `ModalPreinscripcion`: Componente principal con estado multi-paso.
  - `StepperBar`: Barra de progreso de 3 etapas con indicadores de completitud.
  - `Paso1DatosPersonales`: Formulario reactivo con hooks para cálculo de minoridad (`esMenorDeEdad`).
  - `Paso2PlanYHorarios`: Grilla de planes y selector de horarios filtrados por profesora.
  - `Paso3Confirmar`: Resumen final y componente `CamposMedidas`.
  - `PendientesDeAltaPage`: Vista de gestión de pendientes con buscador y enlace a cobro.
- **Tests**: `alumno-alta.schema.test.ts`, `pendientes-de-alta.test.ts`, `preinscripcion.schema.ts`.
