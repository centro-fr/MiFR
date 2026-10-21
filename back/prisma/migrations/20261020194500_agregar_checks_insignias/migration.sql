-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "insignias"
  ADD CONSTRAINT "ck_insignias_tipo"
  CHECK (tipo::text IN ('MES_PERFECTO', 'RACHA', 'TOTAL_CLASES', 'PODIO_MES'));

ALTER TABLE "insignias"
  ADD CONSTRAINT "ck_insignias_valor_umbral"
  CHECK (valor_umbral > 0);
