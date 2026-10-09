-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "cuotas"
  ADD CONSTRAINT "ck_cuotas_x1"
  CHECK (numero_cuota >= 1);

ALTER TABLE "cuotas"
  ADD CONSTRAINT "ck_cuotas_x2"
  CHECK (monto >= 0);

ALTER TABLE "pagos"
  ADD CONSTRAINT "ck_pagos_forma_pago"
  CHECK (forma_pago::text IN ('EFECTIVO', 'TRANSFERENCIA'));

ALTER TABLE "pagos"
  ADD CONSTRAINT "ck_pagos_estado"
  CHECK (estado::text IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO'));

ALTER TABLE "pagos"
  ADD CONSTRAINT "ck_pagos_x1"
  CHECK (monto > 0);

ALTER TABLE "pagos"
  ADD CONSTRAINT "ck_pagos_x2"
  CHECK (estado <> 'RECHAZADO'::estado_pago OR motivo_rechazo IS NOT NULL);

ALTER TABLE "pagos"
  ADD CONSTRAINT "ck_pagos_x3"
  CHECK (forma_pago = 'EFECTIVO'::forma_pago OR id_profesora_cobra IS NULL);
