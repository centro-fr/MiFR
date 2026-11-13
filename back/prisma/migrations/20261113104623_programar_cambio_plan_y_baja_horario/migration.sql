-- AlterTable
ALTER TABLE "horarios" ADD COLUMN     "fecha_baja_programada" DATE;

-- CreateTable
CREATE TABLE "cambios_plan_programados" (
    "id_cambio_plan" SERIAL NOT NULL,
    "id_inscripcion" INTEGER NOT NULL,
    "id_plan" INTEGER NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "fecha_aplicacion" DATE NOT NULL,
    "fecha_alta" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_cambios_plan_programados" PRIMARY KEY ("id_cambio_plan")
);

-- CreateTable
CREATE TABLE "cambio_plan_horarios" (
    "id_cambio_plan" INTEGER NOT NULL,
    "id_horario" INTEGER NOT NULL,

    CONSTRAINT "PK_cambio_plan_horarios" PRIMARY KEY ("id_cambio_plan","id_horario")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_cambios_plan_programados_inscripcion" ON "cambios_plan_programados"("id_inscripcion");

-- CreateIndex
CREATE INDEX "IXFK_cambios_plan_programados_planes" ON "cambios_plan_programados"("id_plan");

-- CreateIndex
CREATE INDEX "IXFK_cambios_plan_programados_profesoras" ON "cambios_plan_programados"("id_profesora");

-- CreateIndex
CREATE INDEX "IXFK_cambio_plan_horarios_horarios" ON "cambio_plan_horarios"("id_horario");

-- AddForeignKey
ALTER TABLE "cambios_plan_programados" ADD CONSTRAINT "FK_cambios_plan_programados_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cambios_plan_programados" ADD CONSTRAINT "FK_cambios_plan_programados_planes" FOREIGN KEY ("id_plan") REFERENCES "planes"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cambios_plan_programados" ADD CONSTRAINT "FK_cambios_plan_programados_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cambio_plan_horarios" ADD CONSTRAINT "FK_cambio_plan_horarios_cambios" FOREIGN KEY ("id_cambio_plan") REFERENCES "cambios_plan_programados"("id_cambio_plan") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cambio_plan_horarios" ADD CONSTRAINT "FK_cambio_plan_horarios_horarios" FOREIGN KEY ("id_horario") REFERENCES "horarios"("id_horario") ON DELETE NO ACTION ON UPDATE NO ACTION;
