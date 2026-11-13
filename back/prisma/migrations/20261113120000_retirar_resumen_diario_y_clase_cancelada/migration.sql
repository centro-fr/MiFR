-- Se retiran el resumen diario de la propietaria (US-26) y el aviso de clase cancelada (13/11/2026).
BEGIN;

-- Primero sus datos: el enumerado no puede perder valores que todavía usa alguna fila.
DELETE FROM "notificaciones" WHERE "tipo"::text IN ('RESUMEN_DIARIO', 'CLASE_CANCELADA');
DELETE FROM "parametros_sistema" WHERE "clave" = 'HORA_RESUMEN_DIARIO';

-- La restricción del DER lista los valores del enumerado: se rehace con los que quedan.
ALTER TABLE "notificaciones" DROP CONSTRAINT "ck_notificaciones_tipo";

-- AlterEnum
CREATE TYPE "tipo_notificacion_new" AS ENUM ('CUOTA_POR_VENCER', 'CUOTA_VENCIDA', 'BIENVENIDA');
ALTER TABLE "notificaciones" ALTER COLUMN "tipo" TYPE "tipo_notificacion_new" USING ("tipo"::text::"tipo_notificacion_new");
ALTER TYPE "tipo_notificacion" RENAME TO "tipo_notificacion_old";
ALTER TYPE "tipo_notificacion_new" RENAME TO "tipo_notificacion";
DROP TYPE "public"."tipo_notificacion_old";

ALTER TABLE "notificaciones"
  ADD CONSTRAINT "ck_notificaciones_tipo"
  CHECK (tipo::text IN ('CUOTA_POR_VENCER', 'CUOTA_VENCIDA', 'BIENVENIDA'));

COMMIT;
