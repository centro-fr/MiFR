-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "rutinas"
  ADD CONSTRAINT "ck_rutinas_fechas"
  CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde);

-- Solo una rutina vigente por alumno.
CREATE UNIQUE INDEX "UK_rutinas_alumno_activa"
  ON "rutinas"("id_alumno")
  WHERE "activa" = true;