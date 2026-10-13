-- CreateEnum
CREATE TYPE "tipo_descuento" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateTable
CREATE TABLE "promociones" (
    "id_promocion" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "tipo_descuento" "tipo_descuento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL,

    CONSTRAINT "PK_promociones" PRIMARY KEY ("id_promocion")
);

-- CreateTable
CREATE TABLE "promocion_planes" (
    "id_promocion" INTEGER NOT NULL,
    "id_plan" INTEGER NOT NULL,

    CONSTRAINT "PK_promocion_planes" PRIMARY KEY ("id_promocion","id_plan")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_promociones_codigo" ON "promociones"("codigo");

-- CreateIndex
CREATE INDEX "IXFK_promocion_planes_planes" ON "promocion_planes"("id_plan");

-- CreateIndex
CREATE INDEX "IXFK_promocion_planes_promociones" ON "promocion_planes"("id_promocion");

-- CreateIndex
CREATE INDEX "IXFK_inscripciones_promociones" ON "inscripciones"("id_promocion");

-- AddForeignKey
ALTER TABLE "promocion_planes" ADD CONSTRAINT "FK_promocion_planes_promociones" FOREIGN KEY ("id_promocion") REFERENCES "promociones"("id_promocion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promocion_planes" ADD CONSTRAINT "FK_promocion_planes_planes" FOREIGN KEY ("id_plan") REFERENCES "planes"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_inscripciones_promociones" FOREIGN KEY ("id_promocion") REFERENCES "promociones"("id_promocion") ON DELETE NO ACTION ON UPDATE NO ACTION;
