-- AlterTable
ALTER TABLE "actividades" ADD COLUMN     "requiere_medidas" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "registros_progreso" (
    "id_registro" SERIAL NOT NULL,
    "id_alumno" INTEGER NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "observaciones" VARCHAR(500),

    CONSTRAINT "PK_registros_progreso" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "tipos_medida" (
    "id_tipo_medida" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "unidad" VARCHAR(10) NOT NULL,

    CONSTRAINT "PK_tipos_medida" PRIMARY KEY ("id_tipo_medida")
);

-- CreateTable
CREATE TABLE "medidas_corporales" (
    "id_registro" INTEGER NOT NULL,
    "id_tipo_medida" INTEGER NOT NULL,
    "valor" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "PK_medidas_corporales" PRIMARY KEY ("id_registro","id_tipo_medida")
);

-- CreateIndex
CREATE INDEX "IXFK_registros_progreso_alumnos" ON "registros_progreso"("id_alumno");

-- CreateIndex
CREATE INDEX "IXFK_registros_progreso_profesoras" ON "registros_progreso"("id_profesora");

-- CreateIndex
CREATE UNIQUE INDEX "UK_tipos_medida_codigo" ON "tipos_medida"("codigo");

-- CreateIndex
CREATE INDEX "IXFK_medidas_corporales_registros_progreso" ON "medidas_corporales"("id_registro");

-- CreateIndex
CREATE INDEX "IXFK_medidas_corporales_tipos_medida" ON "medidas_corporales"("id_tipo_medida");

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "FK_registros_progreso_alumnos" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id_alumno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "FK_registros_progreso_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medidas_corporales" ADD CONSTRAINT "FK_medidas_corporales_registros_progreso" FOREIGN KEY ("id_registro") REFERENCES "registros_progreso"("id_registro") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medidas_corporales" ADD CONSTRAINT "FK_medidas_corporales_tipos_medida" FOREIGN KEY ("id_tipo_medida") REFERENCES "tipos_medida"("id_tipo_medida") ON DELETE NO ACTION ON UPDATE NO ACTION;
