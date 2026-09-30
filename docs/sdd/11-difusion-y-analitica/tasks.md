# Tareas de Implementación: Difusión y Analítica de Negocio

Tareas técnicas, secuenciales y verificables para la épica **Difusión y Analítica de Negocio** (US-32).

---

## Fase 1: Backend – Consulta Pública y Caché

- [ ] **1.1. Query y Servicio de Disponibilidad Pública**
  - Implementar consulta SQL que compute cupos disponibles por horario y actividad sin filtrar por usuario autenticado.
  - Excluir del payload cualquier atributo de datos personales o sensibles.
  - *Criterio de verificación*: Test que valide que el payload devuelto no contiene claves como `dni`, `email` o `id_usuario`.

- [ ] **1.2. Endpoint `/publico/disponibilidad` con Caché y Rate Limiting**
  - Crear router público no protegido por tokens JWT.
  - Implementar rate limiter y cabeceras de caché HTTP.
  - *Criterio de verificación*: Petición curl sin headers de Authorization que retorne HTTP 200 con JSON estructurado.

---

## Fase 2: Frontend – Vista Pública de Disponibilidad

- [ ] **2.1. Maquetado y Diseño de la Vista `/disponibilidad`**
  - Desarrollar la landing pública responsive para móviles y desktop.
  - Bloque destacado con la próxima clase a comenzar del día.
  - Bloque de promoción vigente con badge destacado.
  - *Criterio de verificación*: Abrir la URL en modo incógnito (sin sesión iniciada) y comprobar que renderiza correctamente.

- [ ] **2.2. Tarjetas de Clases y Botón de Contacto por WhatsApp**
  - Renderizar lista de horarios con badges semafóricos (Verde: Disponible, Naranja: Últimos cupos, Rojo: Completo).
  - Botón flotante para contactar vía WhatsApp integrando mensaje predeterminado.
  - *Criterio de verificación*: Al hacer clic en el botón de WhatsApp se abre el enlace externo con el texto esperado.

---

## Fase 3: Validación End-to-End y Criterios de Aceptación

- [ ] **3.1. Verificación CA-01**: Comprobar acceso sin sesión a la ruta `/disponibilidad`.
- [ ] **3.2. Verificación CA-02 y CA-03**: Comprobar cálculo exacto de vacantes e identificación de la próxima clase.
- [ ] **3.3. Verificación CA-04**: Inspección de red para certificar ausencia total de datos de alumnos en el JSON.
