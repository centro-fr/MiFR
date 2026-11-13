ALTER TABLE "inscripciones"
  ADD CONSTRAINT "ck_inscripciones_estado"
  CHECK (estado::text IN ('PREINSCRIPTA', 'ACTIVA', 'BAJA'));

ALTER TABLE "inscripciones"
  ADD CONSTRAINT "ck_inscripciones_motivo_baja"
  CHECK (motivo_baja IS NULL OR motivo_baja::text IN ('ABANDONO', 'MUDANZA', 'SALUD', 'ECONOMICO', 'CAMBIO_PLAN', 'OTRO'));

ALTER TABLE "inscripciones"
  ADD CONSTRAINT "ck_inscripciones_x1"
  CHECK (estado <> 'BAJA'::estado_inscripcion OR motivo_baja IS NOT NULL);
