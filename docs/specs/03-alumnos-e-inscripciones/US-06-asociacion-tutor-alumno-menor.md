# US-06 – Asociación de tutor a alumno menor de edad

## 1. Información general
- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria o Profesora
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Asociar un tutor (padre, madre o responsable) a los alumnos menores de edad para registrar correctamente a quienes asisten a clases infantiles y definir quién será el usuario del sistema.

## 3. Descripción
Como propietaria o profesora, quiero asociar un tutor a los alumnos menores de edad para registrar adecuadamente a quienes asisten a clases infantiles.

## 4. Estados de la pantalla / flujo
- [ ] Formulario de alta de alumno menor
- [ ] Sección de datos del tutor visible / oculta según edad
- [ ] Guardando
- [ ] Éxito
- [ ] Error de validación
- [ ] Error de red

## 5. Datos que necesita
### Datos del alumno menor:
- Nombre completo
- Fecha de nacimiento (para calcular si es menor)
- Otros datos personales

### Datos del tutor (obligatorios si es menor):
- Nombre completo del tutor
- Parentesco (padre / madre / tutor legal / otro)
- Teléfono del tutor
- Email del tutor (recomendado)
- Documento del tutor (opcional)

## 6. Acciones del usuario
- Indicar que el alumno es menor de edad (o que el sistema lo detecte por fecha de nacimiento)
- Completar datos del tutor
- Guardar la asociación
- Editar datos del tutor posteriormente

## 7. Reglas de negocio
- Si el alumno es **menor de edad**, el sistema **debe exigir** los datos de un tutor.
- El usuario del sistema (login, pagos, panel) queda asociado al **tutor**, no al menor.
- Un mismo tutor puede estar asociado a varios alumnos menores (hermanos).
- Si el alumno es mayor de edad, no se debe pedir ni mostrar los campos de tutor.
- La edad de corte se considera 18 años (configurable si en el futuro se necesita).

## 8. Criterios de aceptación
- [ ] Alta de alumno menor sin cargar tutor → falla
- [ ] Alta de alumno menor con tutor completo → se permite
- [ ] Alta de alumno mayor de edad → no debe pedir datos de tutor
- [ ] Un tutor puede estar vinculado a más de un alumno

## 9. Casos borde / Errores
- Fecha de nacimiento que hace que el alumno cumpla 18 años en el futuro cercano
- Tutor ya existente en el sistema (reutilizar en lugar de duplicar)
- Intentar eliminar el tutor de un alumno que sigue siendo menor
- Error de red al guardar

## 10. Dependencias
- US-05 (pre-inscripción) – normalmente se completa en el mismo flujo
- US-01 (el tutor será quien finalmente tenga usuario de acceso)
- Backend: relación Alumno ↔ Tutor

## 11. Notas de implementación (Front)
- Se puede hacer con mocks
- Complejidad: Media
- Recomendación de UI:
  - Detectar automáticamente si es menor según la fecha de nacimiento
  - Mostrar/ocultar la sección “Datos del Tutor” de forma dinámica
  - Permitir buscar un tutor ya existente (por teléfono o nombre) para no duplicar datos