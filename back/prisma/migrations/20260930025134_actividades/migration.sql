-- CreateEnum
CREATE TYPE "modalidad_actividad" AS ENUM ('GRUPAL', 'PERSONALIZADA');

-- CreateTable
CREATE TABLE "actividades" (
    "id_actividad" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(255),
    "modalidad" "modalidad_actividad" NOT NULL,
    "cupo_maximo" SMALLINT,
    "activo" BOOLEAN NOT NULL,

    CONSTRAINT "PK_actividades" PRIMARY KEY ("id_actividad")
);

-- CreateIndex
CREATE UNIQUE INDEX "actividades_codigo_key" ON "actividades"("codigo");

ALTER TABLE actividades ADD CONSTRAINT "ck_actividades_modalidad" CHECK (modalidad::text IN ('GRUPAL', 'PERSONALIZADA'));
ALTER TABLE actividades ADD CONSTRAINT "ck_actividades_x1" CHECK (cupo_maximo IS NULL OR cupo_maximo > 0);
ALTER TABLE actividades ADD CONSTRAINT "ck_actividades_x2" CHECK (modalidad::text <> 'PERSONALIZADA' OR cupo_maximo IS NOT NULL);
