-- Los dispositivos suscriptos a los avisos push de cuota (US-25, 13/11/2026). Una fila por dispositivo:
-- el endpoint es único. Se borran con su usuario.

-- CreateTable
CREATE TABLE "suscripciones_push" (
    "id_suscripcion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "endpoint" VARCHAR(1000) NOT NULL,
    "clave_p256dh" VARCHAR(200) NOT NULL,
    "clave_auth" VARCHAR(100) NOT NULL,
    "fecha_alta" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_suscripciones_push" PRIMARY KEY ("id_suscripcion")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_suscripciones_push_endpoint" ON "suscripciones_push"("endpoint");

-- CreateIndex
CREATE INDEX "IXFK_suscripciones_push_usuarios" ON "suscripciones_push"("id_usuario");

-- AddForeignKey
ALTER TABLE "suscripciones_push" ADD CONSTRAINT "FK_suscripciones_push_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

