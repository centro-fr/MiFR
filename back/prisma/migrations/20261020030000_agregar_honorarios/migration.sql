-- CreateEnum
CREATE TYPE "concepto_tarifa_honorario" AS ENUM ('ALUMNO_A_CARGO', 'HORA_SUPLENCIA');

-- CreateEnum
CREATE TYPE "tipo_valor_honorario" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateEnum
CREATE TYPE "estado_liquidacion" AS ENUM ('BORRADOR', 'CERRADA', 'PAGADA');

-- CreateEnum
CREATE TYPE "concepto_liquidacion_detalle" AS ENUM ('ALUMNO_A_CARGO', 'CLASE_SUPLIDA', 'DESCUENTO_AUSENCIA');

-- CreateTable
CREATE TABLE "tarifas_honorario" (
    "id_tarifa" SERIAL NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "concepto" "concepto_tarifa_honorario" NOT NULL,
    "id_plan" INTEGER,
    "tipo_valor" "tipo_valor_honorario" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "fecha_vigencia_desde" DATE NOT NULL,
    "fecha_vigencia_hasta" DATE,

    CONSTRAINT "PK_tarifas_honorario" PRIMARY KEY ("id_tarifa")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id_liquidacion" SERIAL NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "periodo_desde" DATE NOT NULL,
    "periodo_hasta" DATE NOT NULL,
    "fecha_liquidacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "estado" "estado_liquidacion" NOT NULL,

    CONSTRAINT "PK_liquidaciones" PRIMARY KEY ("id_liquidacion")
);

-- CreateTable
CREATE TABLE "liquidacion_detalles" (
    "id_liq_detalle" SERIAL NOT NULL,
    "id_liquidacion" INTEGER NOT NULL,
    "id_tarifa" INTEGER NOT NULL,
    "concepto" "concepto_liquidacion_detalle" NOT NULL,
    "id_inscripcion" INTEGER,
    "id_clase" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PK_liquidacion_detalles" PRIMARY KEY ("id_liq_detalle")
);

-- CreateIndex
CREATE INDEX "IXFK_tarifas_honorario_planes" ON "tarifas_honorario"("id_plan");

-- CreateIndex
CREATE INDEX "IXFK_tarifas_honorario_profesoras" ON "tarifas_honorario"("id_profesora");

-- CreateIndex
CREATE INDEX "IXFK_liquidaciones_profesoras" ON "liquidaciones"("id_profesora");

-- CreateIndex
CREATE INDEX "IXFK_liquidacion_detalles_clases" ON "liquidacion_detalles"("id_clase");

-- CreateIndex
CREATE INDEX "IXFK_liquidacion_detalles_inscripciones" ON "liquidacion_detalles"("id_inscripcion");

-- CreateIndex
CREATE INDEX "IXFK_liquidacion_detalles_liquidaciones" ON "liquidacion_detalles"("id_liquidacion");

-- CreateIndex
CREATE INDEX "IXFK_liquidacion_detalles_tarifas_honorario" ON "liquidacion_detalles"("id_tarifa");

-- AddForeignKey
ALTER TABLE "tarifas_honorario" ADD CONSTRAINT "FK_tarifas_honorario_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tarifas_honorario" ADD CONSTRAINT "FK_tarifas_honorario_planes" FOREIGN KEY ("id_plan") REFERENCES "planes"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "FK_liquidaciones_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidacion_detalles" ADD CONSTRAINT "FK_liquidacion_detalles_liquidaciones" FOREIGN KEY ("id_liquidacion") REFERENCES "liquidaciones"("id_liquidacion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidacion_detalles" ADD CONSTRAINT "FK_liquidacion_detalles_tarifas_honorario" FOREIGN KEY ("id_tarifa") REFERENCES "tarifas_honorario"("id_tarifa") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidacion_detalles" ADD CONSTRAINT "FK_liquidacion_detalles_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liquidacion_detalles" ADD CONSTRAINT "FK_liquidacion_detalles_clases" FOREIGN KEY ("id_clase") REFERENCES "clases"("id_clase") ON DELETE NO ACTION ON UPDATE NO ACTION;
