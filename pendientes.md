# Otro

- [x] Verifica estos [actualizar-schema.mjs] y [montar-honorarios.msj] para que estan y si deberian estar ahi. A mi me parece que no, y si no va fijate como deberia ser la forma correcta de esto.
  Eran scripts de un solo uso que editaban el código (la baja lógica de `registros_progreso` en el schema y el montaje de Honorarios en `app.ts` y `composicion.ts`). Ya estaban aplicados: el schema tiene sus migraciones y el back monta Honorarios. Se borraron. La forma correcta es commitear el cambio en el código y, para el schema, la migración que genera `pnpm prisma:migrate`.



# Página pública: pulido visual

Hecho el 13/11/2026 con las guías de `choreograph` y `mobile-native` (emilkowalski/skills), leídas desde el repositorio sin correr `npx`: la entrada de la portada en menos de un segundo, la curva `ease-fuerte`, la respuesta al tocar los botones, sin destello gris ni demora al tocar, la barra de estado del color de la página, los retrasos no uniformes al hacer scroll y la sección de actividades con nombres largos, una sola o ninguna.

- [ ] Probar en un celular real (iPhone y Android, abriendo el enlace desde Instagram y WhatsApp): la respuesta al tocar, la barra de estado y que nada quede pegado. La emulación de Chrome no reproduce estos problemas.
- [ ] Revisión completa con taste-skill (Leonxlnx/taste-skill) e impeccable (pbakaus/impeccable) cuando esté la foto real del centro: las dos son flujos completos con sus propios scripts, e impeccable además baja un motor en Rust (`npx impeccable install`); revisar ese código antes de correrlo.
- [ ] Las actividades tienen efecto al pasar el mouse pero no son enlaces: decidir si llevan a algo (los horarios o el contacto) o si se saca el efecto, que sugiere que se pueden tocar.

# Antes de desplegar

- [x] Historial de asistencia de la ficha en el front (falta correr los tests y probarlo en Chromium): el back ya responde `GET /alumnos/:id/asistencias` paginado (`datos`, `total`, `presentes`, `ausentes`, `limit`, `offset`; sin `dia`), pero el front espera una lista y `asistencias-api.ts` se traga el error, así que la ficha sigue mostrando el historial vacío. Falta: el schema de la página, sacar el `catch { return [] }`, que las pestañas manden `asistio` y cuenten con `presentes` y `ausentes`, `PaginacionTabla` de a 10, un estado de error con reintentar, el mock de MSW y sus tests (`alumnos-handlers.test.ts`, `alumno-detalle-page.test.tsx`) y probarlo en Chromium contra el compose.
- [x] `PRUEBAS-INTEGRACION.md`: el caso PI-94 (historial de la ficha) con E-28 y E-29, el archivo E en 29 tests, US-10 en la trazabilidad, el registro de ejecución y la versión 2.43. Corregir PI-93: la profesora de Valentina es Carla, no Lucía.
  Hecho el 13/11/2026 en la versión 2.44 (la 2.43 ya la usaban PI-95 y PI-96). La 2.45 suma PI-97 a PI-99 (cambio de plan programado y baja programada de un horario).
- [x] Correr `pnpm test:integration` completo y la skill `auditar-cambios` sobre el panel del alumno y el historial: se integraron con los unitarios y la suite de alumnos (PI-93 y PI-94).
  Hecho el 13/11/2026: 351 de integración y 2794 unitarios aprobados; la auditoría no encontró bloqueantes del cambio. Quedan tres puntos de negocio abiertos en la sección 9 de `PRUEBAS-INTEGRACION.md` (PI-98 y PI-99).
- [ ] Avisar al equipo que regenere su base local (`prisma migrate reset` y los seeds): además, desde el 13/11/2026 hay una migración nueva (`programar_cambio_plan_y_baja_horario`); las cargadas antes del 20/10 no tienen `REPORTES_RANKING_VER` para el alumno y el tutor (ni `PLANES_VER` y `ALUMNOS_EDITAR` para la profesora), y el ranking del portal les responde 403.
- [ ] Cargar las actividades reales del centro en `front/src/features/publico/utils/actividades-del-centro.ts`.
- [ ] Actualizar `docs/diagrams/enterprise_architect/MiFR.eap` a mano: sin DifusionPublica ni ResumenDiarioPropietaria, con SuscripcionPush.
- [ ] Probar los avisos push en un celular real (Android y iPhone con la app agregada a inicio) después del deploy: ver `docs/DESPLIEGUE.md`, paso 9.
