-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "parametros_sistema"
  ADD CONSTRAINT "ck_parametros_sistema_tipo_dato"
  CHECK (tipo_dato::text IN ('ENTERO', 'DECIMAL', 'TEXTO', 'BOOLEANO'));
