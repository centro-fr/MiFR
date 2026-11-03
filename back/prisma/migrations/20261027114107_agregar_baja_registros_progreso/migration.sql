-- AlterTable
ALTER TABLE "registros_progreso" ADD COLUMN     "fecha_baja" TIMESTAMP(6),
ADD COLUMN     "fecha_modificacion" TIMESTAMP(6),
ADD COLUMN     "id_usuario_baja" INTEGER,
ADD COLUMN     "id_usuario_modifica" INTEGER;

-- CreateIndex
CREATE INDEX "IXFK_registros_progreso_usuario_modifica" ON "registros_progreso"("id_usuario_modifica");

-- CreateIndex
CREATE INDEX "IXFK_registros_progreso_usuario_baja" ON "registros_progreso"("id_usuario_baja");

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "FK_registros_progreso_usuario_modifica" FOREIGN KEY ("id_usuario_modifica") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "FK_registros_progreso_usuario_baja" FOREIGN KEY ("id_usuario_baja") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;
