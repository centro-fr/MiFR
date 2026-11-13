-- CreateEnum
CREATE TYPE "estado_inscripcion" AS ENUM ('PREINSCRIPTA', 'ACTIVA', 'BAJA');

-- CreateEnum
CREATE TYPE "motivo_baja" AS ENUM ('ABANDONO', 'MUDANZA', 'SALUD', 'ECONOMICO', 'CAMBIO_PLAN', 'OTRO');

-- CreateTable
CREATE TABLE "inscripciones" (
    "id_inscripcion" SERIAL NOT NULL,
    "id_alumno" INTEGER NOT NULL,
    "id_plan" INTEGER NOT NULL,
    "id_plan_precio" INTEGER NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "id_promocion" INTEGER,
    "sin_cargo" BOOLEAN NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin_estimado" DATE,
    "estado" "estado_inscripcion" NOT NULL,
    "motivo_baja" "motivo_baja",
    "observaciones" VARCHAR(500),
    "fecha_alta" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(6),

    CONSTRAINT "PK_inscripciones" PRIMARY KEY ("id_inscripcion")
);

-- CreateTable
CREATE TABLE "inscripcion_horarios" (
    "id_inscripcion" INTEGER NOT NULL,
    "id_horario" INTEGER NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE,

    CONSTRAINT "PK_inscripcion_horarios" PRIMARY KEY ("id_inscripcion","id_horario")
);

-- CreateIndex
CREATE INDEX "IXFK_inscripciones_alumnos" ON "inscripciones"("id_alumno");

-- CreateIndex
CREATE INDEX "IXFK_inscripciones_plan_precios" ON "inscripciones"("id_plan_precio");

-- CreateIndex
CREATE INDEX "IXFK_inscripciones_planes" ON "inscripciones"("id_plan");

-- CreateIndex
CREATE INDEX "IXFK_inscripciones_profesoras" ON "inscripciones"("id_profesora");

-- CreateIndex
CREATE INDEX "IXFK_inscripcion_horarios_horarios" ON "inscripcion_horarios"("id_horario");

-- CreateIndex
CREATE INDEX "IXFK_inscripcion_horarios_inscripciones" ON "inscripcion_horarios"("id_inscripcion");

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_inscripciones_alumnos" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id_alumno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_inscripciones_planes" FOREIGN KEY ("id_plan") REFERENCES "planes"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_inscripciones_plan_precios" FOREIGN KEY ("id_plan_precio") REFERENCES "plan_precios"("id_plan_precio") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_inscripciones_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripcion_horarios" ADD CONSTRAINT "FK_inscripcion_horarios_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripcion_horarios" ADD CONSTRAINT "FK_inscripcion_horarios_horarios" FOREIGN KEY ("id_horario") REFERENCES "horarios"("id_horario") ON DELETE NO ACTION ON UPDATE NO ACTION;
