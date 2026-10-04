-- CreateTable
CREATE TABLE "profesoras" (
    "id_profesora" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "especialidad" VARCHAR(80),
    "fecha_alta" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" DATE,

    CONSTRAINT "PK_profesoras" PRIMARY KEY ("id_profesora")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id_horario" SERIAL NOT NULL,
    "id_actividad" INTEGER NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "dia_semana" SMALLINT NOT NULL,
    "hora_inicio" TIME(6) NOT NULL,
    "hora_fin" TIME(6) NOT NULL,
    "cupo_maximo" SMALLINT,
    "fecha_alta" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" DATE,

    CONSTRAINT "PK_horarios" PRIMARY KEY ("id_horario")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_profesoras_id_usuario" ON "profesoras"("id_usuario");

-- CreateIndex
CREATE INDEX "IXFK_horarios_actividades" ON "horarios"("id_actividad");

-- CreateIndex
CREATE INDEX "IXFK_horarios_profesoras" ON "horarios"("id_profesora");

-- AddForeignKey
ALTER TABLE "profesoras" ADD CONSTRAINT "FK_profesoras_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "FK_horarios_actividades" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "FK_horarios_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;
