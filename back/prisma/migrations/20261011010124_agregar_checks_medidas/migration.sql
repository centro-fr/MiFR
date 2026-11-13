-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "medidas_corporales"
  ADD CONSTRAINT "ck_medidas_corporales_x1"
  CHECK (valor > 0);
