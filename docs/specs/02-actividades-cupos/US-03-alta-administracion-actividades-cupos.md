# US-03 – Alta y administración de actividades y cupos

## 1. Información general

- **Épica:** Configuración Base
- **Prioridad:** Alta
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 1

## 2. Objetivo

Permitir a la propietaria crear y administrar las actividades del centro, indicando si son clases grupales o personalizadas, y definir sus cupos máximos.

## 3. Descripción

Como propietaria, quiero crear y administrar las actividades indicando si son **clases grupales** o **clases personalizadas**, y definir sus cupos máximos (obligatorio en personalizadas y configurable en grupales), para definir la oferta de disciplinas del centro.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando listado de actividades)
- [ ] Listado de actividades (tabla o cards)
- [ ] Formulario de alta / edición
- [ ] Guardando
- [ ] Éxito
- [ ] Error
- [ ] Confirmación de baja
- [ ] Empty (no hay actividades cargadas)

## 5. Datos que necesita

### Datos que muestra

- Nombre de la actividad
- Descripción
- Tipo: Grupal / Personalizada
- Cupo máximo
- Estado (activa / inactiva)
- Cantidad de horarios asociados (opcional)

### Datos que se cargan / editan

- Nombre (obligatorio)
- Descripción (opcional)
- Tipo de actividad: `grupal` | `personalizada` (obligatorio)
- Cupo máximo (obligatorio si es personalizada, opcional si es grupal)
- Estado (activa/inactiva)

## 6. Acciones del usuario

- Ver listado de actividades
- Crear nueva actividad
- Editar actividad existente
- Dar de baja (lógica) una actividad
- Filtrar / buscar actividades

## 7. Reglas de negocio

- El **tipo de actividad** (grupal o personalizada) es obligatorio.
- En clases **personalizadas** el cupo máximo es **obligatorio**.
- En clases **grupales** el cupo máximo es opcional (puede limitarse por espacio físico).
- Una actividad puede dictarse en distintos horarios y por distintas profesoras (esto se gestiona en US-04).
- La baja de una actividad no debe eliminar el historial de clases ya dictadas.
- No se debe permitir eliminar una actividad que tenga horarios futuros con alumnos inscriptos (o se debe advertir).

## 8. Criterios de aceptación

- [ ] Alta de actividad grupal sin cupo → se permite
- [ ] Alta de clase personalizada sin definir cupo → falla (campo obligatorio)
- [ ] Modificación del tipo de una actividad ya existente → se permite
- [ ] Baja de una actividad sin horarios asociados → se permite
- [ ] Intentar dar de baja una actividad con horarios futuros y alumnos → mostrar advertencia

## 9. Casos borde / Errores

- Nombre de actividad duplicado
- Cupo máximo = 0 o número negativo → no permitido
- Error de red al guardar
- Actividad con muchos horarios asociados al intentar editar el tipo

## 10. Dependencias

- Backend: CRUD de actividades
- US-01 y US-02 (solo propietaria puede acceder)
- Relacionada con US-04 (asignación de profesoras y horarios)

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks primero
- Complejidad: Media
- Usar un Select o RadioGroup claro para el tipo (Grupal / Personalizada)
- Mostrar el campo “Cupo máximo” como obligatorio solo cuando el tipo sea Personalizada
- Recomendación de UI: tabla en desktop + cards en mobile
