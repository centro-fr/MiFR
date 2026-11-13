-- CreateTable
CREATE TABLE "rutinas" (
    "id_rutina" SERIAL NOT NULL,
    "id_alumno" INTEGER NOT NULL,
    "id_profesora" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE,
    "contenido" JSONB NOT NULL,
    "observaciones" VARCHAR(500),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PK_rutinas" PRIMARY KEY ("id_rutina")
);

-- CreateIndex
CREATE INDEX "IX_rutinas_alumno_activa" ON "rutinas"("id_alumno", "activa");

-- CreateIndex
CREATE INDEX "IXFK_rutinas_profesoras" ON "rutinas"("id_profesora");

-- AddForeignKey
ALTER TABLE "rutinas" ADD CONSTRAINT "FK_rutinas_alumnos" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id_alumno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rutinas" ADD CONSTRAINT "FK_rutinas_profesoras" FOREIGN KEY ("id_profesora") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;