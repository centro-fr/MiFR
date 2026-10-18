-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "notificaciones"
  ADD CONSTRAINT "ck_notificaciones_tipo"
  CHECK (tipo::text IN ('CUOTA_POR_VENCER', 'CUOTA_VENCIDA', 'RESUMEN_DIARIO', 'BIENVENIDA', 'CLASE_CANCELADA'));

ALTER TABLE "notificaciones"
  ADD CONSTRAINT "ck_notificaciones_estado_envio"
  CHECK (estado_envio::text IN ('PENDIENTE', 'ENVIADA', 'ERROR'));
