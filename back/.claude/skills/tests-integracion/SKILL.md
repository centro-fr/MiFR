---
name: tests-integracion
description: Escribe los tests de integración (app real contra Postgres) de una funcionalidad nueva o modificada del backend, los corre, comprueba que detectan fallas y completa PRUEBAS-INTEGRACION.md en la raíz del repo (casos PI-xx, tests, trazabilidad, registro de ejecución y defectos). Usar cada vez que se agrega o cambia un endpoint, un permiso, una regla de negocio o una US, y al cerrar un sprint.
---

# Tests de integración

Los unitarios prueban cada pieza con mocks. Estos prueban que las piezas funcionen juntas: el backend real (`construirDependencias`), por HTTP, contra un PostgreSQL real. Lo único simulado es Google.

El plan de pruebas (casos PI-xx, trazabilidad con las US, registro de corridas y defectos) vive en [`PRUEBAS-INTEGRACION.md`](../../../../PRUEBAS-INTEGRACION.md), en la raíz del repositorio. Esta skill lo completa en el mismo trabajo que agrega o modifica los tests; el documento de Drive se copia desde ese archivo.

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

1. Tomar el último caso PI de la sección 6.1 de `PRUEBAS-INTEGRACION.md` y numerar desde el siguiente.
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

Por cada regla nueva, romper a propósito el código que la implementa (invertir una condición, saltear una validación), correr la suite y verificar que falla al menos un test. Antes de romperlo, copiar el archivo y restaurarlo desde esa copia: `git checkout -- <archivo>` también borra los cambios que todavía no se commitearon. Confirmar con `git diff` que el archivo quedó como estaba.

Si ningún test falla, el test no prueba la regla: corregirlo. Suele pasar cuando los datos no ejercitan el caso (por ejemplo, un cupo que nunca está en los dos lados).

### 5. Actualizar `referencia.md`

Si se creó un archivo de tests, asignarle la siguiente letra libre y anotarlo. Actualizar el último código de cada archivo y el último caso PI.

### 6. Completar `PRUEBAS-INTEGRACION.md`

Editar las tablas existentes del archivo de la raíz (no reescribirlo ni dejar el bloque solo en el chat):

1. **Sección 6**: fila nueva en el resumen (6.1) y detalle del caso con la plantilla (6.2). Si se modificó un caso, actualizarlo en los dos lugares.
2. **Sección 5, trazabilidad**: sumar los casos a cada US y su estado de automatización (*Sí*, *Parcial*, *No* o *Manual*).
3. **Sección 4**: documentar las fábricas o datos nuevos.
4. **Sección 7, tests automatizados**: actualizar el total, la tabla de archivos (cantidad y último código) y la de tests (`Tests | Qué verifican | Caso`). Los códigos son la letra del archivo y un número correlativo (A-42, B-14, …).
5. **Sección 7.1**: qué regla se rompió y qué tests fallaron.
6. **Sección 8**: una fila de corrida en 8.1 (fecha, motivo, cantidad de tests, resultado, duración que informa Vitest, observaciones), el resultado de cada caso en 8.2 y los defectos en 8.3 (D-01, D-02…).
7. **Sección 9**: puntos a confirmar, si aparecieron. Cerrar los que se resolvieron.
8. **Sección 11**: una fila en el historial (`Versión | Fecha | Observaciones | Encargado`), con la versión siguiente a la última (1.2, 1.3, …) y en Observaciones qué casos y tests se sumaron o cambiaron.

Fechas en formato `dd/mm/aaaa`. No commitear: resumir lo hecho y dejar que la persona revise.

## Plantilla de caso

```markdown
#### PI-xx — Título del flujo

**US:** US-xx, US-yy · **Precondición:** …

1. Paso
2. Paso

**Resultado esperado:** códigos HTTP, mensajes y estado final en la base.

**Automatizado:** Sí / Parcial / No / Manual (tests X-01 a X-05).
```
