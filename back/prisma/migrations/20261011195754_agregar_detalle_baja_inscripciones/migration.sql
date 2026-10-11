-- AlterTable
ALTER TABLE "inscripciones" ADD COLUMN     "detalle_baja" VARCHAR(200);

-- Restricción del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "inscripciones"
  ADD CONSTRAINT "ck_inscripciones_x2"
  CHECK (detalle_baja IS NULL OR motivo_baja = 'OTRO');
