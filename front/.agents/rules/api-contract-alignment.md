# Alineación Estricta con el Contrato OpenAPI y Especificaciones (Fuente de Verdad)

Este estándar es obligatorio para cualquier asistente de IA y desarrollador en el frontend del repositorio **MiFR**. Su objetivo es garantizar fidelidad absoluta entre el contrato oficial de la API (OpenAPI), los esquemas de datos y la interfaz de usuario.

---

## 1. OpenAPI es la Única Fuente de Verdad para el Frontend

El frontend **no interactúa directamente con la base de datos ni con el DER**, sino a través de la API HTTP. Por lo tanto:

1. **Paso Obligatorio Inicial**: Ante cualquier nueva integración, modificación de endpoints, esquemas Zod o DTOs, consultar la especificación OpenAPI del backend:
   - Definición central: [`back/src/openapi.ts`](file:///c:/Users/gasto/Seminario%20Repo/MiFR/back/src/openapi.ts)
   - Módulos por dominio: `back/src/modules/**/*.openapi.ts`
   - Documento generado: endpoint `/api/v1/docs/openapi.json`
2. **Relación con el DER (`der.puml`)**:
   - El DER es la fuente de verdad de la **persistencia física en PostgreSQL**.
   - OpenAPI es la proyección y agregación del dominio hacia la red (DTOs, payloads y respuestas).
   - Si existe una discrepancia aparente entre una tabla del DER y un DTO de la API, **el contrato OpenAPI prevalece para el cliente HTTP**.
3. **Cero Invención de Datos**:
   - Prohibido agregar campos, parámetros de query o cuerpos de petición que no estén declarados en la especificación OpenAPI del backend.
   - Respetar exactamente los nombres de los atributos (`id_alumno`, `codigo`, `precio`, `situacion_cuota`, etc.).

---

## 2. Coherencia de Tipos y Validación (OpenAPI ↔ TypeScript)

Todo tipo o esquema Zod definido en el frontend debe mapear fidedignamente al contrato OpenAPI:

| Tipo en OpenAPI / Zod Backend | Tipo en TypeScript Frontend | Reglas / Restricciones |
| :--- | :--- | :--- |
| `z.number().int()` (IDs) | `number` | **Prohibido usar strings** para PKs o FKs (usar `number`, nunca `'alu-1'`). |
| `z.enum([...])` | Union literal (`'A' \| 'B'`) | Los valores deben coincidir exactamente con el enum de la API. |
| `fechaSchema` (`YYYY-MM-DD`) | `string` | Formato fecha ISO `YYYY-MM-DD`. |
| `horaSchema` (`HH:mm`) | `string` | Formato de hora militar `HH:mm`. |
| `z.nullable()` | `T \| null` | Modelar explícitamente la posibilidad de `null`. |
| `z.optional()` | `T \| undefined` | Solo omitible si OpenAPI lo marca como opcional. |

---

## 3. Códigos de Estado y Manejo de Errores

El frontend debe contemplar y mapear los códigos HTTP documentados en OpenAPI:

* **`200 OK` / `201 Created`**: Éxito de la operación.
* **`400 Bad Request`**: Error de validación (mostrar mensajes contextuales por campo cuando la API devuelva detalles).
* **`401 Unauthorized`**: Sesión inexistente o expirada (redirigir al login correspondiente).
* **`403 Forbidden`**: Acción no permitida para el rol del usuario autenticado (ej. profesora intentando acceder a alumno ajeno).
* **`404 Not Found`**: Recurso no encontrado (mostrar vista o feedback correspondiente).
* **`409 Conflict`**: Conflicto de estado o regla de negocio (ej. falta de cupo, nombre duplicado, reserva vencida).

---

## 4. Separación Estricta: DTOs de Contrato vs. Estado de UI

1. **Aislamiento de DTOs**:
   - Las interfaces que representan datos de la API deben reflejar fielmente lo que envía o recibe el backend.
   - Propiedades cosméticas de UI (`isOpen`, `isLoading`, `colorTheme`, `selectedTab`, etc.) pertenecen a tipos auxiliares de presentación (`UiState`, `ComponentProps`) y nunca a los DTOs de red.
2. **Transformaciones en Adaptadores/Hooks**:
   - Si la UI requiere formatear datos (ej. transformar número de día de la semana `1` a `'Lunes'`), hacerlo mediante utilidades puras o mappers en el frontend, sin alterar el contrato base.

---

## 5. Validación con las Especificaciones de Negocio

1. **Consulta de Specs**: Antes de implementar flujos completos, contrastar OpenAPI con la User Story en `docs/specs/<épica>/US-XX-*.md`.
2. **Prohibido asumir reglas no documentadas**: Las restricciones de negocio deben provenir textualmente de las especificaciones o del contrato OpenAPI. En caso de duda o comportamiento no especificado, consultar antes de implementar.
