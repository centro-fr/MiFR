-- CreateEnum
CREATE TYPE "tipo_dato_parametro" AS ENUM ('ENTERO', 'DECIMAL', 'TEXTO', 'BOOLEANO');

-- CreateTable
CREATE TABLE "parametros_sistema" (
    "clave" VARCHAR(50) NOT NULL,
    "valor" VARCHAR(100) NOT NULL,
    "tipo_dato" "tipo_dato_parametro" NOT NULL,
    "descripcion" VARCHAR(150),
    "fecha_actualizacion" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "PK_parametros_sistema" PRIMARY KEY ("clave")
);
