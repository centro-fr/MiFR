-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "seguimientos_inactividad"
  ADD CONSTRAINT "ck_seguimientos_inactividad_estado"
  CHECK (estado::text IN ('CONTACTADO', 'GESTIONADO', 'IGNORADO'));
