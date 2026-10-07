---
name: tests-integracion
description: Escribe los tests de integración (app real contra Postgres) de una funcionalidad nueva o modificada del backend, los corre, comprueba que detectan fallas y deja en el chat el bloque para actualizar el documento "Pruebas de Integración" de Drive (casos PI-xx, tests, trazabilidad y registro de ejecución). Usar cada vez que se agrega o cambia un endpoint, un permiso, una regla de negocio o una US, y al cerrar un sprint.
---

# Tests de integración

Los unitarios prueban cada pieza con mocks. Estos prueban que las piezas funcionen juntas: el backend real (`construirDependencias`), por HTTP, contra un PostgreSQL real. Lo único simulado es Google.

El plan de pruebas (casos PI-xx, trazabilidad con las US, registro de corridas y defectos) **vive en Drive**, en el documento "MiFR – Pruebas de Integración", y no en el repositorio. Esta skill no edita ningún archivo de documentación: al final deja en el chat lo que hay que pegar en ese documento.

El detalle técnico (decisiones, estructura, protecciones, archivos y códigos asignados) está en [`referencia.md`](referencia.md). Leerlo antes de escribir el primer test de la sesión.

## Cuándo corresponde

Siempre que el cambio cruce capas o dependa de la base:

- Un endpoint nuevo o un cambio en su contrato.
- Un permiso nuevo, o un cambio en la matriz inicial o en quién puede hacer qué.
- Una regla de negocio que se valida en la base o entre componentes: unicidad, `CHECK`, superposición, bajas bloqueadas, transacciones.
- Una US nueva: cada US tiene que quedar cubierta por al menos dos casos de integración.

No corresponde para lógica pura de un service o un cálculo: eso va en un unitario (ver `.claude/rules/testing.md`).

## Pasos

### 1. Definir los casos

1. Preguntar a la persona cuál es el último caso PI del documento de Drive. Si no lo sabe, usar el que figura en `referencia.md` y avisar que hay que confirmarlo.
2. Por cada flujo, escribir el caso: US que cubre, precondición, pasos y resultado esperado (códigos HTTP, mensajes y **estado final en la base**). Usar la plantilla del final.
3. Separar lo que solo pasa en la interfaz (menús, redirecciones, diálogos de Google) en un caso aparte marcado *Manual*. No se prueba desde el backend.
4. Mostrar los casos y esperar el visto bueno antes de escribir código.

### 2. Escribir los tests

- Archivo `*.integration.test.ts`. Los flujos que cruzan componentes van en `src/__tests__/integracion/`; los de un componente puntual, en su `__tests__/`. Si el tema ya tiene archivo, se suma ahí.
- Cada test arranca con `reiniciarBase(prisma)`. Escenario con las fábricas de `src/__tests__/integracion/fabricas.ts` o con `cargarDatosDemo` (los datos de `db:seed:demo`); sesión con `entorno.iniciarSesion(email)`.
- **Arrange con la base, act con HTTP, assert con los dos.** En cada rechazo, verificar además que la base quedó igual.
- Si el caso necesita una entidad nueva, sumar su fábrica a `fabricas.ts` para que la reusen los sprints siguientes.
- Nombres de tests en español, describiendo el comportamiento. En el `describe`, el código del caso cuando el archivo es por casos (`"PI-04: …"`).
- No repetir lo que ya cubre un unitario.

### 3. Correr

```bash
docker compose --profile test up -d db-test   # si no está levantada
pnpm test:integration
pnpm test
pnpm format:check
```

Todo tiene que pasar, incluidos los tests de los sprints anteriores (es la regresión).

### 4. Comprobar que los tests detectan fallas

Por cada regla nueva, romper a propósito el código que la implementa (invertir una condición, saltear una validación), correr la suite y verificar que falla al menos un test. Restaurar con `git checkout -- <archivo>` y confirmar con `git status` que no quedó nada roto.

Si ningún test falla, el test no prueba la regla: corregirlo. Suele pasar cuando los datos no ejercitan el caso (por ejemplo, un cupo que nunca está en los dos lados).

### 5. Actualizar `referencia.md`

Si se creó un archivo de tests, asignarle la siguiente letra libre y anotarlo. Actualizar el último código de cada archivo y el último caso PI.

### 6. Dejar el bloque para Drive

Cerrar con un bloque en Markdown, listo para pegar en el documento de Drive, con:

1. **Casos nuevos o modificados**, con la plantilla.
2. **Tests automatizados**: tabla `Código | Test | Caso`, con los nombres tal como están en el código. Los códigos son la letra del archivo y un número correlativo (A-42, B-14, …).
3. **Trazabilidad**: qué casos se suman a cada US y su estado de automatización (*Sí*, *Parcial*, *No* o *Manual*).
4. **Registro de ejecución**: una fila por caso con fecha, resultado y tests que pasan, y una fila de corrida con fecha, sprint, motivo, cantidad de tests, resultado y duración (la que informa Vitest).
5. **Fallas provocadas**: qué regla se rompió y qué tests fallaron.
6. **Defectos y puntos a confirmar**, si aparecieron.

No commitear: resumir lo hecho y dejar que la persona revise.

## Plantilla de caso

```markdown
#### PI-xx — Título del flujo

**US:** US-xx, US-yy · **Precondición:** …

1. Paso
2. Paso

**Resultado esperado:** códigos HTTP, mensajes y estado final en la base.

**Automatizado:** Sí / Parcial / No / Manual (tests X-01 a X-05).
```
