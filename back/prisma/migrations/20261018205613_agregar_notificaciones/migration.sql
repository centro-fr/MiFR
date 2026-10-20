-- CreateEnum
CREATE TYPE "tipo_notificacion" AS ENUM ('CUOTA_POR_VENCER', 'CUOTA_VENCIDA', 'RESUMEN_DIARIO', 'BIENVENIDA', 'CLASE_CANCELADA');

-- CreateEnum
CREATE TYPE "estado_envio_notificacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'ERROR');

-- CreateTable
CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" "tipo_notificacion" NOT NULL,
    "id_cuota" INTEGER,
    "mensaje" VARCHAR(1000) NOT NULL,
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_envio" TIMESTAMP(6),
    "estado_envio" "estado_envio_notificacion" NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PK_notificaciones" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE INDEX "IXFK_notificaciones_cuotas" ON "notificaciones"("id_cuota");

-- CreateIndex
CREATE INDEX "IXFK_notificaciones_usuarios" ON "notificaciones"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "UK_notificaciones_usuario_cuota_tipo" ON "notificaciones"("id_usuario", "id_cuota", "tipo");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "FK_notificaciones_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "FK_notificaciones_cuotas" FOREIGN KEY ("id_cuota") REFERENCES "cuotas"("id_cuota") ON DELETE NO ACTION ON UPDATE NO ACTION;
