-- CreateEnum
CREATE TYPE "forma_pago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "estado_pago" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "cuotas" (
    "id_cuota" SERIAL NOT NULL,
    "id_inscripcion" INTEGER NOT NULL,
    "numero_cuota" SMALLINT NOT NULL,
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PK_cuotas" PRIMARY KEY ("id_cuota")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_cuota" INTEGER NOT NULL,
    "forma_pago" "forma_pago" NOT NULL,
    "estado" "estado_pago" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_pago" TIMESTAMP(6) NOT NULL,
    "titular_cuenta_origen" VARCHAR(80),
    "fecha_hora_transferencia" TIMESTAMP(6),
    "id_usuario_registra" INTEGER NOT NULL,
    "id_profesora_cobra" INTEGER,
    "rendido" BOOLEAN NOT NULL,
    "fecha_rendicion" TIMESTAMP(6),
    "id_usuario_confirma" INTEGER,
    "fecha_confirmacion" TIMESTAMP(6),
    "motivo_rechazo" VARCHAR(255),
    "observaciones" VARCHAR(255),

    CONSTRAINT "PK_pagos" PRIMARY KEY ("id_pago")
);

-- CreateIndex
CREATE INDEX "IXFK_cuotas_inscripciones" ON "cuotas"("id_inscripcion");

-- CreateIndex
CREATE UNIQUE INDEX "UK_cuotas_inscripcion_numero" ON "cuotas"("id_inscripcion", "numero_cuota");

-- CreateIndex
CREATE INDEX "IXFK_pagos_cuotas" ON "pagos"("id_cuota");

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "FK_cuotas_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_cuotas" FOREIGN KEY ("id_cuota") REFERENCES "cuotas"("id_cuota") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_usuario_registra" FOREIGN KEY ("id_usuario_registra") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_usuario_confirma" FOREIGN KEY ("id_usuario_confirma") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "FK_pagos_profesora_cobra" FOREIGN KEY ("id_profesora_cobra") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;
