# Especificación Funcional: Difusión y Analítica de Negocio

## 1. Origen

Esta especificación consolida las User Stories de la épica **Difusión y Analítica de Negocio**:

- **US-32**: Panel público de disponibilidad (`docs/specs/11-difusion-y-analitica/US-32-panel-publico-disponibilidad.md`)

---

## 2. Objetivo

Proveer una vidriera digital pública, atractiva y de libre acceso (sin requerir autenticación) para el centro de entrenamiento MiFR: permitir a cualquier visitante interesado consultar en tiempo real las disciplinas activas, el estado de cupos por franja horaria, la próxima clase próxima a comenzar y las promociones vigentes, optimizando la captación de nuevos alumnos con llamadas a la acción directas hacia el canal de contacto.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Visitante / Público General** | Acceso irrestricto desde internet para visualizar disciplinas, horarios, cupos y promociones. |
| **Propietaria** | Configuración de las promociones y visibilidad de las actividades expuestas en el panel público. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Acceso Público sin Autenticación (US-32)

- La ruta `/disponibilidad` o `/panel-publico` es accesible libremente sin token ni sesión.
- Tiempos de carga ultra rápidos y diseño responsivo para redes sociales e historias de Instagram.

#### RF-02: Visualización de Cupos en Tiempo Real (US-32)

- Exponer el listado de actividades y horarios con su indicador de vacantes:
  - Cupo disponible: $\text{CupoMaximo} - \text{InscriptosActivos}$.
  - Indicador visual semafórico: `Disponible` (verde), `Últimos Lugares` ($\le 2$ lugares, naranja), `Completo` (rojo).
- En clases grupales sin cupo fijado, mostrar "Cupos Abiertos".

#### RF-03: Próxima Clase a Comenzar (US-32)

- Tarjeta destacada con la clase más próxima en el día actual a partir de la hora actual del servidor.
- Muestra actividad, profesora, hora de inicio y si quedan vacantes disponibles.

#### RF-04: Promoción Destacada Vigente (US-32)

- Exposición automática del banner de la promoción vigente de mayor relevancia para nuevos ingresantes (ej: "15% OFF en tu primer mes").
- Botón flotante o llamada a la acción: "Contactar por WhatsApp para sumarme" con mensaje preconfigurado.

#### RF-05: Privacidad de Datos y Sanitización

- El endpoint público **nunca** debe exponer nombres, correos ni datos de los alumnos inscriptos. Solo expone métricas numéricas agregadas.

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Caching HTTP (`Cache-Control: public, max-age=60`) para soportar picos de tráfico sin sobrecargar la base de datos.
- **RNF-02**: Optimización SEO y Open Graph tags para previsualización enriquecida al compartir el enlace en WhatsApp o redes sociales.

---

## 5. Criterios de Aceptación

- **CA-01 (Acceso sin sesión)**: Un usuario sin autenticar puede ver el panel público sin ser redirigido al login.
- **CA-02 (Cálculo de cupo)**: Si una clase de cupo 4 tiene 3 inscriptos, el panel muestra "Último cupo disponible".
- **CA-03 (Próxima clase)**: A las 17:15 hs, el panel destaca la clase de las 18:00 hs.
- **CA-04 (Sanitización)**: La respuesta JSON del endpoint público no contiene información identificable de ningún alumno.

---

## 6. Casos Borde y Errores

- Sin clases restantes en el día: se muestra la primera clase del día siguiente.
- Sin promociones activas: el banner promocional se oculta elegantemente sin dejar espacios vacíos.

---

## 7. Fuera de Alcance

- Pasarela de pago o reserva pública directa de cupos con tarjeta de crédito desde el panel público.
