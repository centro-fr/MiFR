-- CreateTable
CREATE TABLE "suplencias" (
    "id_clase" INTEGER NOT NULL,
    "id_prof_ausente" INTEGER NOT NULL,
    "motivo" VARCHAR(255),
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_registra" INTEGER NOT NULL,

    CONSTRAINT "PK_suplencias" PRIMARY KEY ("id_clase","id_prof_ausente")
);

-- AddForeignKey
ALTER TABLE "suplencias" ADD CONSTRAINT "FK_suplencias_clases" FOREIGN KEY ("id_clase") REFERENCES "clases"("id_clase") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suplencias" ADD CONSTRAINT "FK_suplencias_prof_ausente" FOREIGN KEY ("id_prof_ausente") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suplencias" ADD CONSTRAINT "FK_suplencias_usuario_registra" FOREIGN KEY ("id_usuario_registra") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;
