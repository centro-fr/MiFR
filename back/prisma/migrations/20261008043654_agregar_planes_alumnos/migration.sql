-- CreateEnum
CREATE TYPE "tipo_plan" AS ENUM ('MENSUAL', 'CLASE_SUELTA');

-- CreateEnum
CREATE TYPE "estado_alumno" AS ENUM ('ACTIVO', 'INACTIVO', 'BAJA');

-- CreateTable
CREATE TABLE "planes" (
    "id_plan" SERIAL NOT NULL,
    "tipo" "tipo_plan" NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(255),
    "clases_por_semana" SMALLINT,
    "dias_gracia" SMALLINT NOT NULL,
    "id_actividad_exclusiva" INTEGER,
    "profesora_unica" BOOLEAN NOT NULL,
    "fecha_alta" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" DATE,

    CONSTRAINT "PK_planes" PRIMARY KEY ("id_plan")
);

-- CreateTable
CREATE TABLE "plan_precios" (
    "id_plan_precio" SERIAL NOT NULL,
    "id_plan" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "fecha_vigencia_desde" DATE NOT NULL,
    "fecha_vigencia_hasta" DATE,

    CONSTRAINT "PK_plan_precios" PRIMARY KEY ("id_plan_precio")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "id_alumno" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_usuario_responsable" INTEGER,
    "cont_emerg_nombre" VARCHAR(80),
    "cont_emerg_telefono" VARCHAR(20),
    "apto_medico" BOOLEAN NOT NULL DEFAULT false,
    "fecha_apto_medico" DATE,
    "observaciones" VARCHAR(500),
    "estado" "estado_alumno" NOT NULL,
    "fecha_alta" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(6),

    CONSTRAINT "PK_alumnos" PRIMARY KEY ("id_alumno")
);

-- CreateIndex
CREATE INDEX "IXFK_plan_precios_planes" ON "plan_precios"("id_plan");

-- CreateIndex
CREATE UNIQUE INDEX "UK_alumnos_id_usuario" ON "alumnos"("id_usuario");

-- AddForeignKey
ALTER TABLE "planes" ADD CONSTRAINT "FK_planes_actividad_exclusiva" FOREIGN KEY ("id_actividad_exclusiva") REFERENCES "actividades"("id_actividad") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_precios" ADD CONSTRAINT "FK_plan_precios_planes" FOREIGN KEY ("id_plan") REFERENCES "planes"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "FK_alumnos_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "FK_alumnos_usuario_responsable" FOREIGN KEY ("id_usuario_responsable") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE planes ADD CONSTRAINT "ck_planes_tipo" CHECK (tipo::text IN ('MENSUAL', 'CLASE_SUELTA'));
ALTER TABLE planes ADD CONSTRAINT "ck_planes_x1" CHECK (clases_por_semana IS NULL OR clases_por_semana BETWEEN 1 AND 7);
ALTER TABLE planes ADD CONSTRAINT "ck_planes_x2" CHECK (dias_gracia >= 0);
ALTER TABLE planes ADD CONSTRAINT "ck_planes_x3" CHECK (tipo::text <> 'CLASE_SUELTA' OR (clases_por_semana IS NULL AND dias_gracia = 0));
ALTER TABLE plan_precios ADD CONSTRAINT "ck_plan_precios_x1" CHECK (precio > 0);
ALTER TABLE plan_precios ADD CONSTRAINT "ck_plan_precios_x2" CHECK (fecha_vigencia_hasta IS NULL OR fecha_vigencia_hasta >= fecha_vigencia_desde);
ALTER TABLE alumnos ADD CONSTRAINT "ck_alumnos_estado" CHECK (estado::text IN ('ACTIVO', 'INACTIVO', 'BAJA'));
