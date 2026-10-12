---
name: revisar-antes-de-integrar
description: Revisa el estado de la rama de trabajo antes de integrarla a la rama personal o a dev. Chequea commits, tests, diagramas actualizados, variables de entorno y que no queden secretos ni restos de depuración. Usar al terminar un tema, antes de hacer merge.
---

# Revisar antes de integrar

Checklist previo al merge. Mira el **estado del cambio**; para auditar el código contra los diagramas está la skill `validar-arquitectura`.

No hace merge ni commitea: reporta y espera.

## Qué revisar

### La auditoría

La rama tiene que haber pasado por la skill `auditar-cambios` sin hallazgos BLOQUEANTES. Si no se corrió, o si se commiteó algo después, correrla primero.

### El diff

Correr `git status` y `git diff dev...HEAD` para ver todo lo que trae la rama, no solo el último commit.

- No hay archivos que no deberían estar: `.env`, `dist/`, `node_modules/`, archivos temporales, diagramas de prueba sueltos.
- No hay secretos, claves ni tokens en el diff. Revisar también los archivos de nombre inocente.
- No quedaron `console.log` de depuración, código comentado ni `TODO` sin dueño.

### Los commits

`git log dev..HEAD --oneline`.

- Siguen Conventional Commits con la descripción en español: `feat(usuario): agregar validacion de rol`.
- El tipo es alguno de `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`.
- Cada commit es un cambio con sentido propio. Señalar los que mezclan cosas.

### Los tests y el formato

- `pnpm test` y `pnpm test:integration` pasan enteros (la base de prueba se levanta con `docker compose --profile test up -d db-test`).
- Si la rama agrega o cambia endpoints, permisos o reglas que dependen de la base, tiene sus tests de integración y quedaron registrados en `PRUEBAS-INTEGRACION.md` (skill `tests-integracion`).
- Todo lo que se agregó o cambió tiene sus tests (tabla de `.claude/rules/testing.md`): service, repositorio, schemas, rutas, fachada y `shared/`. Señalar cada archivo nuevo sin su `__tests__/` correspondiente.
- `pnpm test:coverage` sigue en 100 % de sentencias, ramas y funciones. Si bajó, la rama no se integra.
- Cada regla nueva se verificó rompiéndola a propósito, y quedó anotada en la sección 7.1 de `PRUEBAS-INTEGRACION.md`.
- `pnpm build` compila y `pnpm typecheck` pasa: el build excluye los tests, y un test mal tipado igual corre en Vitest.
- `pnpm format:check` pasa. Si no, el formateo va en un commit propio con `style(...)`.

### Los diagramas

- Si se agregó o cambió una entidad, `docs/diagrams/puml/der.puml` lo refleja.
- Si se agregó un módulo o una interfaz, `docs/diagrams/puml/vista_arquitectonica.puml` lo refleja.
- Si se implementó un ciclo de vida con estados, existe su diagrama de máquina de estados.

### La configuración

- Si aparecieron variables de entorno nuevas, están en `.env.example` con un valor de ejemplo.
- Si se agregaron dependencias, están justificadas y el lockfile está en el commit.

## Al terminar

Listar lo que falta, con archivo y línea donde aplique. Si está todo, recordar el orden del merge (`<tema> → <nombre> → dev`, trayendo `dev` a la rama personal antes de subir) y dejar que la persona lo haga.
