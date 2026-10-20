-- CreateEnum
CREATE TYPE "estado_seguimiento_inactividad" AS ENUM ('CONTACTADO', 'GESTIONADO', 'IGNORADO');

-- CreateTable
CREATE TABLE "seguimientos_inactividad" (
    "id_inscripcion" INTEGER NOT NULL,
    "estado" "estado_seguimiento_inactividad" NOT NULL,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_registra" INTEGER NOT NULL,

    CONSTRAINT "PK_seguimientos_inactividad" PRIMARY KEY ("id_inscripcion")
);

-- CreateIndex
CREATE INDEX "IXFK_seguimientos_inactividad_usuarios" ON "seguimientos_inactividad"("id_usuario_registra");

-- AddForeignKey
ALTER TABLE "seguimientos_inactividad" ADD CONSTRAINT "FK_seguimientos_inactividad_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seguimientos_inactividad" ADD CONSTRAINT "FK_seguimientos_inactividad_usuarios" FOREIGN KEY ("id_usuario_registra") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;
