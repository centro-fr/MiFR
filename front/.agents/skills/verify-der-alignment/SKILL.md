---
name: verify-der-alignment
description: Audita y verifica la coherencia de datos, DTOs, schemas de Zod y reglas de negocio contra el Diagrama Entidad-Relación (der.puml) y las especificaciones tecnicas (docs/specs/).
---

# Procedimiento de Verificación de Coherencia con el DER

Esta skill define el protocolo de verificación obligatoria que el asistente debe ejecutar antes de crear o refactorizar cualquier tipo, DTO, esquema Zod, handler de mock o componente que maneje datos en el proyecto **MiFR**.

---

## Cuándo activar esta Skill

- Antes de crear una nueva feature o User Story (US).
- Al definir interfaces en `src/types/` o schemas en `src/features/<dominio>/schemas/`.
- Al crear o revisar handlers de mocks en `src/mocks/handlers/`.
- Siempre que el usuario solicite validar la coherencia del modelo con la base de datos.

---

## Pasos del Protocolo de Verificación

### Paso 1: Localizar la entidad en `docs/diagrams/puml/der.puml`
1. Abrir `docs/diagrams/puml/der.puml`.
2. Buscar la entidad o entidades involucradas en el módulo.
3. Tomar nota exhaustiva de:
   - Nombre exacto de cada columna.
   - Tipo de dato en PostgreSQL (`SERIAL`, `INTEGER`, `SMALLINT`, `VARCHAR(n)`, `ENUM`, `BOOLEAN`, `TIME`, etc.).
   - Restricciones de nulidad (`*` significa NOT NULL, sin asterisco admite NULL).
   - Claves foráneas y relaciones con otras tablas.
   - Restricciones CHECK o comentarios en gris.

### Paso 2: Localizar la User Story en `docs/specs/`
1. Identificar la Spec en `docs/specs/<épica>/US-XX-*.md`.
2. Verificar la sección **5. Datos que necesita** (Datos que muestra vs. Datos que se cargan/editan).
3. Verificar la sección **7. Reglas de negocio**.
4. Confirmar que ninguna regla de negocio inventada se esté agregando al código (ej. no asumir restricciones que la Spec no declare).

### Paso 3: Cotejo Campo por Campo (Matriz de Conformidad)

Antes de dar por válido cualquier archivo de código o types, verificar la siguiente lista de chequeo:

- [ ] **Nombres de Atributos**: ¿Los nombres coinciden exactamente con la tabla del DER (o snake_case para DTOs del backend)?
- [ ] **Tipos de Datos**:
  - ¿Los IDs son numéricos (`number`) y no strings?
  - ¿Los días de la semana son enteros `1..7` (`SMALLINT`) en el DTO en vez de strings literales?
  - ¿Los enums respetan las opciones exactas declaradas en el DER?
  - ¿Los campos obligatorios del DER (`*`) son requeridos en el esquema Zod?
- [ ] **Aislamiento de UI**: ¿El DTO o entidad está libre de propiedades de presentación (`colorTheme`, `avatarUrl`, clases CSS)? Si la UI necesita enriquecer el dato, ¿se usa un Mapper/ViewModel específico en la capa de vista?
- [ ] **Ubicación de Mocks**: ¿Los datos de prueba están estrictamente en `src/mocks/` y desacoplados de los hooks y componentes mediante MSW?
- [ ] **Terminología**: ¿Se respetan las restricciones del glosario de `front/AGENTS.md` (no usar "pago", etc.)?

---

## Plantilla de Informe de Verificación

Si se detectan inconsistencias durante el cotejo, emitir un informe estructurado con el siguiente formato:

```markdown
### 📋 Informe de Conformidad con el DER

| Entidad / Campo | En der.puml | En Código / DTO | Estado | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| `tabla.campo` | Tipo / Regla en DER | Tipo / Valor actual | ❌ Discrepancia / ✅ Conforme | Corrección sugerida |

**Observaciones de Reglas de Negocio:**
- [Detallar si alguna validación viola o inventa reglas respecto a la US correspondiente]
```
