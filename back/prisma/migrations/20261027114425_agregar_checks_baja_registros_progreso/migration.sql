-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "registros_progreso"
  ADD CONSTRAINT "ck_registros_progreso_modificacion"
  CHECK ((fecha_modificacion IS NULL) = (id_usuario_modifica IS NULL));

ALTER TABLE "registros_progreso"
  ADD CONSTRAINT "ck_registros_progreso_baja"
  CHECK ((fecha_baja IS NULL) = (id_usuario_baja IS NULL));
