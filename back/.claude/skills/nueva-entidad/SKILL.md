---
name: nueva-entidad
description: Agrega una entidad al schema.prisma copiando sus atributos, tipos y enumerados desde el DER, genera la migración y crea los tipos de dominio. Usar antes de crear el módulo que la va a usar, o al agregar campos a una entidad existente.
---

# Agregar una entidad al esquema

El objetivo es que `prisma/schema.prisma` no se aparte de `docs/diagrams/der.puml`. La deriva entre los dos es el error más caro de detectar tarde, porque se descubre cuando ya hay datos.

## Procedimiento

1. **Leer la entidad en el DER.** Abrir `docs/diagrams/der.puml` y ubicarla. Copiar de ahí: los atributos con sus nombres exactos, los tipos, los opcionales, los enumerados con todos sus valores, y las relaciones con otras entidades. No improvisar campos que el DER no tiene, ni omitir los que sí tiene.

   Si el DER no la tiene o está incompleto, **frenar y avisar**. Se corrige el DER primero; ese es el orden que fija `.claude/rules/arquitectura.md`.

2. **Escribir el modelo en `prisma/schema.prisma`**, siguiendo la convención del archivo:
   - Tablas en plural y `snake_case`: `inscripciones`, `liquidacion_detalles`.
   - Columnas en `snake_case`: `id_inscripcion`, `fecha_alta`.
   - Enumerados en minúscula, con los valores en mayúscula, igual que el DER: `enum estado_inscripcion { PREINSCRIPTA ACTIVA BAJA }`.
   - Identificadores `String @id @default(uuid())`, salvo que el DER indique otra cosa.
   - Fechas de auditoría: `@default(now())` y `@updatedAt`.
   - Relaciones con `@relation` y el `onDelete` que corresponda.

3. **Generar la migración** con `pnpm prisma:migrate` y un nombre descriptivo en snake_case (`agregar_inscripciones`). Si la base no está levantada, avisar en vez de intentar rodearlo.

4. **Regenerar el cliente** con `pnpm prisma:generate`.

5. **Crear o actualizar el `<x>.types.ts`** del módulo, re-exportando los tipos generados con nombres de dominio:

   ```ts
   export type Inscripcion = inscripciones;
   export type EstadoInscripcion = estado_inscripcion;
   ```

## Al terminar

Verificar que `pnpm build` compile y avisar qué quedó creado, incluyendo el nombre de la migración. La migración se commitea junto al cambio de esquema, en el mismo commit, con `feat(<modulo>): ...`.

No commitear sin que la persona lo pida.
