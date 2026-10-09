---
name: validar-arquitectura
description: Audita el backend contra los diagramas y las reglas del proyecto, sin modificar nada. Verifica que el esquema coincida con el DER, que los nombres salgan de la vista arquitectónica y que se respeten las reglas de instanciación, persistencia e interfaces. Usar antes de integrar una rama o al revisar código.
---

# Validar la arquitectura

Auditoría **de solo lectura**. Reporta hallazgos con `archivo:línea`, no corrige nada. Si algo amerita corrección, se propone al final y se espera confirmación.

## Qué verificar

### Contra el DER (`docs/diagrams/der.puml`)

- Cada modelo de `prisma/schema.prisma` existe en el DER.
- Los atributos coinciden en nombre y tipo, y los opcionales también.
- Los enumerados tienen exactamente los mismos valores, sin agregados ni faltantes.
- Las relaciones y cardinalidades se corresponden.

### Contra la vista arquitectónica (`docs/diagrams/vista_arquitectonica.puml`)

- Cada carpeta de `src/modules/` corresponde a un subsistema del diagrama.
- Cada componente del diagrama que ya esté implementado tiene su subcarpeta.
- Cada interfaz que el diagrama nombra existe como `interface/i-*.ts` con el nombre correspondiente.
- No hay módulos en el código que el diagrama no prevea.

### Contra las reglas del proyecto

- No hay `new` de clases concretas fuera del composition root (`src/index.ts` y `src/composicion.ts`), tampoco de librerías (`PrismaClient`, `OAuth2Client`, etc.). `prisma/seed.ts` queda afuera porque es otro punto de entrada.
- `PrismaClient` solo lo recibe por constructor un `*.repository.ts`; ningún service ni controller lo usa.
- Cada service que tiene interfaz la implementa con `implements`.
- Las dependencias entre componentes se tipan contra interfaces, no contra clases concretas. La fachada del subsistema puede recibir concretos los services de sus propios componentes; lo que viene de otro subsistema llega por interfaz (`IInfo*`).
- Cada controller y cada router de componente dependen de la parte de la `ILogica*` de su componente (`ILogicaPlanes`), no de la del subsistema entero.
- No hay `any` ni `console.log` de depuración.
- No hay comentarios que narren cambios (`// se agregó`, `// modificado`, `// antes era`) ni bloques de código comentado.
- Toda ruta que recibe cuerpo o parámetros pasa por `validate({ ... })`.
- Las rutas usan los guardias de `ControlDeAcceso` (`acceso.sesion`, `acceso.permiso(...)`), no `requierePermiso(autorizacion, ...)` armado a mano.
- Ningún middleware propio llama a un guardia async sin esperarlo (`await`).
- `app.ts` y `openapi.ts` montan un router y un registro por subsistema, no por componente.
- No hay secretos escritos en el código.

## Formato del reporte

Agrupar por severidad y ser concreto:

```text
BLOQUEANTE  src/modules/x/x.service.ts:14  usa el cliente de Prisma directamente; mover la consulta al repositorio
ATENCION    prisma/schema.prisma:52         enum estado_pago no tiene RECHAZADO, el DER si (der.puml:266)
MENOR       src/modules/x/x.controller.ts:8 usa any en el parametro input
```

Si no hay hallazgos, decirlo en una línea. No inflar el reporte con observaciones de estilo que no cambian el comportamiento.

## Deuda ya conocida

No hay deuda conocida pendiente. Si aparece, se anota acá para no reportarla como hallazgo nuevo en cada auditoría.
