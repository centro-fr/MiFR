/*
  Warnings:

  - Made the column `cont_emerg_nombre` on table `alumnos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cont_emerg_telefono` on table `alumnos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "alumnos" ALTER COLUMN "cont_emerg_nombre" SET NOT NULL,
ALTER COLUMN "cont_emerg_telefono" SET NOT NULL;
