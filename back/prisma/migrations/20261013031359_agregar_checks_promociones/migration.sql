-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "promociones"
  ADD CONSTRAINT "ck_promociones_tipo_descuento"
  CHECK (tipo_descuento::text IN ('PORCENTAJE', 'MONTO_FIJO'));

ALTER TABLE "promociones"
  ADD CONSTRAINT "ck_promociones_x1"
  CHECK (valor > 0);

ALTER TABLE "promociones"
  ADD CONSTRAINT "ck_promociones_x2"
  CHECK (tipo_descuento <> 'PORCENTAJE'::tipo_descuento OR valor <= 100);

ALTER TABLE "promociones"
  ADD CONSTRAINT "ck_promociones_x3"
  CHECK (fecha_hasta >= fecha_desde);
