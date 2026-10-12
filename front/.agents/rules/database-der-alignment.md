# Alineación Estricta con el DER y Especificaciones (Fuente de Verdad)

Este estándar es obligatorio para cualquier asistente de IA y desarrollador en el repositorio **MiFR**. Su objetivo es garantizar fidelidad absoluta entre la base de datos relacional, los contratos de API y el frontend.

---

## 1. El DER es la Única Fuente de Verdad del Modelo de Datos

Antes de escribir, modificar o sugerir cualquier interfaz TypeScript, DTO, esquema Zod, modelo ORM o mock:
1. **Paso Obligatorio Inicial**: Consultar siempre `docs/diagrams/puml/der.puml`.
2. **Cero Invención de Datos**: Prohibido agregar atributos, columnas o relaciones que no existan explícitamente en el DER o en las especificaciones funcionales (`docs/specs/`).
3. **Fidelidad de Nombres**: Respetar la nomenclatura y el género definidos en la BD:
   - Si en el DER es `modalidad`, está **prohibido** renombrarlo a `tipo` o `tipo_actividad`.
   - Si en el DER es `activo`, está **prohibido** renombrarlo a `activa`.
   - Si en el DER es `codigo`, es obligatorio incluirlo y no omitirlo.

---

## 2. Coherencia de Tipos de Datos (PostgreSQL ↔ TypeScript)

Todo tipo definido en TypeScript debe mapear fidedignamente al tipo de PostgreSQL del DER:

| Tipo en DER (`der.puml`) | Tipo en DTO / TypeScript | Restricciones / Reglas |
| :--- | :--- | :--- |
| `SERIAL` / `INTEGER` | `number` | **Prohibido usar strings** (ej. `'hor-1'`). Las PKs y FKs son numéricas. |
| `SMALLINT` (`dia_semana`) | `number` (`1..7`) | Mapea `1=Lun .. 7=Dom`. La UI usa mappers/adapters si necesita labels. |
| `VARCHAR(n)` | `string` | Respetar longitud máxima en validaciones Zod (`max(n)`). |
| `ENUM <<A\|B>>` | `'A' \| 'B'` (literal union) | Los valores deben ser exactamente los definidos en el enum del DER. |
| `BOOLEAN` | `boolean` | Respetar el nombre exacto (`activo`, `apto_medico`, etc.). |
| `TIME` / `DATE` / `TIMESTAMP` | `string` (formato ISO) | Documentar formato (`HH:mm`, `YYYY-MM-DD`). |

---

## 3. Separación Estricta: Modelo de Dominio vs. Necesidades de UI

1. **Aislamiento del Dominio**:
   - Está **estrictamente prohibido** agregar propiedades cosméticas de UI dentro de las interfaces de entidad del negocio.
   - Propiedades como `colorTheme`, `avatarUrl`, estilos CSS o flags de selección temporal pertenecen a tipos auxiliares de presentación (`UiState`, `ComponentProps`) y nunca al modelo de datos ni a los DTOs.
2. **Cálculos y Relaciones (Sin Desnormalización Artificial)**:
   - Si un campo no existe en la tabla física (por ejemplo, `inscriptos_actuales` en la tabla `horarios`), debe modelarse como un campo computado o proveniente de un endpoint de agregación/relación (`inscripcion_horarios`).
   - Prohibido inventar lógica de negocio ficticia (como "poner en cero" un horario para desvincular alumnos) sin ejecutar las operaciones relacionales reales sobre la entidad correspondiente.

---

## 4. No Inventar Reglas de Negocio

1. **Consulta de Specs**: Antes de implementar validaciones en el frontend o backend, leer la User Story en `docs/specs/<épica>/US-XX-*.md`.
2. **Prohibido asumir restricciones restrictivas**:
   - Ejemplo: La regla de "Salón Único" que impedía dictar dos clases simultáneas con distintas profesoras fue una asunción errónea.
   - Solo se deben aplicar las reglas de negocio descritas textualmente en la sección `7. Reglas de negocio` de la Spec correspondiente.
3. **Duda o Ambigüedad**: Si la Spec o el DER dejan un caso borde sin definir, se debe alertar explícitamente al usuario antes de asumir cualquier lógica.
