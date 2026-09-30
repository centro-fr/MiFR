# Especificación Funcional: Rutina y Progreso

## 1. Origen
Esta especificación consolida las User Stories de la épica **Rutina y Progreso**:
- **US-27**: Carga de rutina y evolución física (`docs/specs/09-rutina-y-progreso/US-27-carga-rutina-evolucion-fisica.md`)
- **US-28**: Consulta de rutina y progreso físico (`docs/specs/09-rutina-y-progreso/US-28-consulta-rutina-progreso-fisico.md`)

---

## 2. Objetivo
Gestionar el seguimiento deportivo y antropométrico de los alumnos del centro MiFR: permitir a las profesoras diseñar y cargar rutinas de entrenamiento personalizadas y asentar registros periódicos de evolución física (peso, altura y medidas corporales), facilitando al alumno (o su tutor en menores) el acceso transparente y motivador a su plan de ejercicios y evolución histórica a través de gráficos de progreso.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Profesora** | Carga, edición y seguimiento de rutinas y mediciones antropométricas de los alumnos a su cargo. |
| **Alumno / Tutor** | Visualización en modo solo lectura de su rutina vigente, detalles de ejercicios y gráficos de evolución física. Si es menor, el tutor tiene acceso a la ficha de su hijo. |
| **Propietaria** | Supervisión global de planes de entrenamiento y evolución de alumnos del centro. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Carga y Administración de Rutinas de Entrenamiento (US-27)
- La profesora selecciona un alumno a su cargo y crea una rutina indicando: título/nombre (ej: "Adaptación Fuerza - Mes 1"), fecha de inicio, fecha de fin estimada, desglose de ejercicios/series/repeticiones (`contenido`) y observaciones técnicas.
- Solo una rutina puede estar marcada como `VIGENTE` por alumno al mismo tiempo.
- Historial de rutinas anteriores en modo consulta para evaluar la progresión del entrenamiento.

#### RF-02: Registro Antropométrico y Medidas Corporales (US-27)
- La profesora registra mediciones en una fecha determinada.
- Tipos de medidas parametrizables: Peso corporal (`kg`), Altura (`cm`), Perímetros (pecho, cintura, cadera, brazo, pierna en `cm`), Porcentaje de grasa estimado (opcional).
- Validaciones numéricas estrictas: valores positivos mayores a cero y dentro de rangos biológicamente coherentes.

#### RF-03: Consulta y Gráficos de Evolución para el Alumno (US-28)
- Vista en el portal del alumno de su rutina activa organizada por días o grupos musculares.
- Visualización del historial de mediciones ordenado cronológicamente de forma descendente.
- Representación visual de evolución mediante gráficos de líneas (ej: curva de peso o circunferencias a lo largo de las fechas registradas).
- En el caso de alumnos menores de edad, el tutor asociado visualiza la información desde su sesión.

---

### 4.2. Requisitos No Funcionales (RNF)
- **RNF-01**: Gráficos interactivos ligeros y fluidos en dispositivos móviles (usando Chart.js, Recharts o similar).
- **RNF-02**: Privacidad médica y deportiva: ningún alumno puede ver rutinas o medidas de otros miembros del centro.

---

## 5. Criterios de Aceptación
- **CA-01 (Carga de rutina por profesora)**: La profesora asigna una rutina a un alumno y este puede visualizarla en su aplicación inmediatamente.
- **CA-02 (Cálculo y validación de medidas)**: Intento de cargar un peso $\le 0$ es rechazado con error de validación.
- **CA-03 (Aislamiento de información)**: Un alumno solo accede a sus propios registros de rutina y mediciones.
- **CA-04 (Gráfico de evolución)**: El portal dibuja la evolución temporal conectando los puntos de cada fecha de medición.

---

## 6. Casos Borde y Errores
- Alumno sin rutina asignada: la interfaz muestra un estado vacío amigable ("Aún no tienes una rutina asignada; tu profesora la cargará a la brevedad").
- Alumno con una sola medición: el gráfico muestra un punto único sin quebrar la visualización.

---

## 7. Fuera de Alcance
- Videos explicativos de ejercicios alojados localmente (pueden admitirse enlaces externos de YouTube/Vimeo en el texto de la rutina).
