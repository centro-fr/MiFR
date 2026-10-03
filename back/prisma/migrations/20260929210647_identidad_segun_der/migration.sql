-- CreateEnum
CREATE TYPE "codigo_rol" AS ENUM ('PROPIETARIA', 'PROFESORA', 'ALUMNO', 'TUTOR');

-- DropForeignKey
ALTER TABLE "usuario_roles" DROP CONSTRAINT "usuario_roles_id_usuario_fkey";

-- AlterTable
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pkey",
DROP COLUMN "id_usuario",
ADD COLUMN     "id_usuario" SERIAL NOT NULL,
ALTER COLUMN "google_id" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(60),
ALTER COLUMN "apellido" SET DATA TYPE VARCHAR(60),
ALTER COLUMN "dni" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "fecha_nacimiento" SET NOT NULL,
ALTER COLUMN "fecha_nacimiento" SET DATA TYPE DATE,
ALTER COLUMN "direccion" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "fecha_alta" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "fecha_actualizacion" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "PK_usuarios" PRIMARY KEY ("id_usuario");

-- AlterTable
ALTER TABLE "usuario_roles" DROP CONSTRAINT "usuario_roles_pkey",
DROP COLUMN "rol",
ADD COLUMN     "id_rol" INTEGER NOT NULL,
DROP COLUMN "id_usuario",
ADD COLUMN     "id_usuario" INTEGER NOT NULL,
ALTER COLUMN "fecha_asignacion" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "PK_usuario_roles" PRIMARY KEY ("id_usuario", "id_rol");

-- DropEnum
DROP TYPE "rol";

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" SERIAL NOT NULL,
    "codigo" "codigo_rol" NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(150),

    CONSTRAINT "PK_roles" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id_permiso" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "modulo" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(150),

    CONSTRAINT "PK_permisos" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "rol_permisos" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_rol_permisos" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE INDEX "IXFK_rol_permisos_roles" ON "rol_permisos"("id_rol");

-- CreateIndex
CREATE INDEX "IXFK_rol_permisos_permisos" ON "rol_permisos"("id_permiso");

-- CreateIndex
CREATE INDEX "IXFK_usuario_roles_roles" ON "usuario_roles"("id_rol");

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "FK_usuario_roles_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "FK_usuario_roles_roles" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "FK_rol_permisos_roles" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "FK_rol_permisos_permisos" FOREIGN KEY ("id_permiso") REFERENCES "permisos"("id_permiso") ON DELETE NO ACTION ON UPDATE NO ACTION;

