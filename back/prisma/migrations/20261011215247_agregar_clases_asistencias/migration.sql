-- CreateEnum
CREATE TYPE "estado_clase" AS ENUM ('PROGRAMADA', 'DICTADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "clases" (
    "id_clase" SERIAL NOT NULL,
    "id_horario" INTEGER NOT NULL,
    "fecha_clase" DATE NOT NULL,
    "id_prof_dictante" INTEGER NOT NULL,
    "estado" "estado_clase" NOT NULL DEFAULT 'PROGRAMADA',
    "fecha_cierre_asist" TIMESTAMP(6),
    "observaciones" VARCHAR(255),

    CONSTRAINT "PK_clases" PRIMARY KEY ("id_clase")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id_clase" INTEGER NOT NULL,
    "id_alumno" INTEGER NOT NULL,
    "id_inscripcion" INTEGER NOT NULL,
    "asistio" BOOLEAN NOT NULL,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_registra" INTEGER,
    "observaciones" VARCHAR(255),

    CONSTRAINT "PK_asistencias" PRIMARY KEY ("id_clase","id_alumno")
);

-- CreateIndex
CREATE INDEX "IXFK_clases_horarios" ON "clases"("id_horario");

-- CreateIndex
CREATE INDEX "IXFK_clases_profesoras" ON "clases"("id_prof_dictante");

-- CreateIndex
CREATE UNIQUE INDEX "UK_clases_horario_fecha" ON "clases"("id_horario", "fecha_clase");

-- CreateIndex
CREATE INDEX "IXFK_asistencias_alumnos" ON "asistencias"("id_alumno");

-- CreateIndex
CREATE INDEX "IXFK_asistencias_inscripciones" ON "asistencias"("id_inscripcion");

-- CreateIndex
CREATE INDEX "IXFK_asistencias_usuarios" ON "asistencias"("id_usuario_registra");

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "FK_clases_horarios" FOREIGN KEY ("id_horario") REFERENCES "horarios"("id_horario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "FK_clases_profesoras" FOREIGN KEY ("id_prof_dictante") REFERENCES "profesoras"("id_profesora") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "FK_asistencias_clases" FOREIGN KEY ("id_clase") REFERENCES "clases"("id_clase") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "FK_asistencias_alumnos" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id_alumno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "FK_asistencias_inscripciones" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones"("id_inscripcion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "FK_asistencias_usuarios" FOREIGN KEY ("id_usuario_registra") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "clases"
    ADD CONSTRAINT "ck_clases_estado"
    CHECK (estado::text IN ('PROGRAMADA', 'DICTADA', 'CANCELADA'));
