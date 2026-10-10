---
name: auditar-cambios
description: Audita lo que agrega o cambia una rama del backend antes de integrarla. Junta dependencias, compilación, tests, arquitectura, seguridad y correctitud en un único reporte. No modifica nada. Usar cada vez que se agrega un endpoint, un permiso, una entidad, un módulo o una regla de negocio, y siempre antes de `revisar-antes-de-integrar`.
---

# Auditar los cambios del backend

Auditoría **de solo lectura** del diff `dev...HEAD` limitado a `back/`. Reporta y espera. Las correcciones van después, en sus propios commits y con su test, cuando la persona lo pida.

Es la versión acotada de la auditoría completa que se hizo sobre todo el backend. La completa se repite cuando cierra un sprint o cuando se toca autenticación, roles o pagos.

## 1. Chequeos mecánicos

Correr desde `back/`. Si alguno falla, se reporta como BLOQUEANTE:

```bash
pnpm build
pnpm format:check
pnpm test:coverage          # 100 % de sentencias, ramas y funciones
pnpm audit --prod           # vulnerabilidades en dependencias de producción
```

`pnpm test:integration` solo si la base de prueba está levantada (`docker compose --profile test up -d db-test`). Si no lo está, se avisa que no se corrió, sin rodearlo.

Para `pnpm audit`, separar lo que llega a producción (`--prod`) de lo que es solo de desarrollo (vitest, coverage). Una vulnerabilidad `high` o `critical` en producción es BLOQUEANTE. En desarrollo es ATENCION.

## 2. Arquitectura

Seguir la skill `validar-arquitectura`, pero solo sobre los archivos del diff y lo que dependa de ellos.

## 3. Seguridad

Primero el comando `/security-review` sobre la rama. Después, a mano, las preguntas del final de `.claude/rules/seguridad.md` sobre cada ruta nueva o modificada, y esta lista sobre cada archivo del diff. Son los puntos que ya fallaron en este backend; el porqué de cada uno está en esa regla:

- **Guardias:** toda ruta nueva pasa por `acceso.sesion` y además por `acceso.permiso(...)` o `acceso.rol(...)`. Si la ruta solo pide sesión, el service verifica que el recurso sea del solicitante. Lo que administra la seguridad (roles, bajas de cuentas, estado, matriz) exige también `acceso.rol("PROPIETARIA")`, porque los permisos se pueden delegar.
- **Orden:** la verificación de quién pide va antes de cualquier error que dependa del estado del recurso, y a quien no tiene derecho un recurso inexistente se le responde igual que uno ajeno.
- **Alcance por solicitante:** si una PROFESORA, un ALUMNO o un TUTOR pueden llegar a la operación, el service recibe al `solicitante` y filtra por él, tanto al leer como al escribir. Los datos de terceros no se aceptan por el body (`id_profesora`, `id_alumno`, `sin_cargo`, `estado`) sin chequear que el solicitante pueda usarlos.
- **Escalada de privilegios:** nada que asigne roles, permisos o tutorías, o que reactive usuarios, puede quedar al alcance de quien no sea la PROPIETARIA, salvo que la regla de negocio lo diga y tenga test.
- **Identidad:** no se vincula una identidad externa (Google) a una cuenta existente sin verificar `email_verified`, ni se pisa un `google_id` que ya estaba puesto.
- **Entrada:** todo body, params y query pasa por `validate` con los esquemas de `shared/utils/`. Ningún `$queryRawUnsafe` ni `Prisma.raw`. Ningún `orderBy` ni nombre de campo que venga del cliente.
- **Errores:** las carreras de "verificar y después insertar" terminan en `ConflictError` (409), no en un P2002 que responde 500. Ningún mensaje de error devuelve datos de otra persona.
- **Atomicidad:** si una operación cambia dos estados que dependen entre sí (alta de inscripción y pago, baja de alumno e inscripciones), los dos van en la misma transacción.
- **Volumen:** los listados nuevos tienen `take` o paginación y un `select` que no traiga columnas sensibles (`google_id`, `dni`, `direccion`) si el consumidor no las usa.
- **Logs:** no se loguean tokens, cuerpos completos ni datos personales que no hagan falta para auditar.
- **Configuración:** una variable de entorno nueva se valida al arrancar, igual que `CORS_ORIGENES`, y va a `.env.example` sin el valor real.

## 4. Correctitud

Correr `/code-review` sobre la rama para buscar bugs de lógica, fechas, montos y concurrencia. Correr `/simplify` solo como reporte: sus cambios se proponen, no se aplican en esta skill.

## Formato del reporte

Un único reporte, agrupado por severidad y con `archivo:línea`:

```text
BLOQUEANTE  pnpm audit --prod                         proxy-addr <2.0.8 (critical) vía express; actualizar
ATENCION    src/modules/x/x.routes.ts:20              ruta solo con sesión y el service no chequea dueño
MENOR       src/modules/x/x.repository.ts:40          findMany sin take
```

Cerrar con una línea por fuente (mecánicos, arquitectura, seguridad, correctitud) indicando cuántos hallazgos aportó y cuáles no se pudieron correr y por qué.

Si hay BLOQUEANTES, la rama no se integra. Si no hay hallazgos, decirlo en una línea.

## Deuda ya conocida

Se anota acá lo aceptado conscientemente, para no reportarlo en cada auditoría:

- `gestion-cuotas-y-pagos` todavía no está montado en `app.ts` ni en `composicion.ts`: espera los calculadores (ver `SPRINT-3.md`).
- El alta definitiva de una inscripción y el guardado de su primer pago van en transacciones separadas (ver el comentario de `GestionCuotasYPagosService`). Si el guardado falla después del alta, la inscripción queda ACTIVA sin cuota confirmada, pero no habilita a asistir. Unirlas en una sola transacción exige pasar la transacción entre componentes; se decidió no hacerlo por ahora.
- No hay linter: typescript-eslint no soporta TypeScript 7 (ver `back/CLAUDE.md`).
