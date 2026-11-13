-- CreateEnum
CREATE TYPE "tipo_insignia" AS ENUM ('MES_PERFECTO', 'RACHA', 'TOTAL_CLASES', 'PODIO_MES');

-- CreateTable
CREATE TABLE "insignias" (
    "id_insignia" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(255),
    "tipo" "tipo_insignia" NOT NULL,
    "valor_umbral" SMALLINT NOT NULL,

    CONSTRAINT "PK_insignias" PRIMARY KEY ("id_insignia")
);

-- CreateTable
CREATE TABLE "alumno_insignias" (
    "id_alumno" INTEGER NOT NULL,
    "id_insignia" INTEGER NOT NULL,
    "periodo" VARCHAR(7) NOT NULL DEFAULT '',
    "fecha_obtencion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_alumno_insignias" PRIMARY KEY ("id_alumno","id_insignia","periodo")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_insignias_codigo" ON "insignias"("codigo");

-- CreateIndex
CREATE INDEX "IXFK_alumno_insignias_alumnos" ON "alumno_insignias"("id_alumno");

-- CreateIndex
CREATE INDEX "IXFK_alumno_insignias_insignias" ON "alumno_insignias"("id_insignia");

-- AddForeignKey
ALTER TABLE "alumno_insignias" ADD CONSTRAINT "FK_alumno_insignias_alumnos" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id_alumno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alumno_insignias" ADD CONSTRAINT "FK_alumno_insignias_insignias" FOREIGN KEY ("id_insignia") REFERENCES "insignias"("id_insignia") ON DELETE NO ACTION ON UPDATE NO ACTION;
