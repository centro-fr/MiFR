-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_concepto"
  CHECK (concepto::text IN ('ALUMNO_A_CARGO', 'HORA_SUPLENCIA'));

ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_tipo_valor"
  CHECK (tipo_valor::text IN ('PORCENTAJE', 'MONTO_FIJO'));

ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_x1"
  CHECK (valor > 0);

ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_x2"
  CHECK (tipo_valor <> 'PORCENTAJE'::tipo_valor_honorario OR valor <= 100);

ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_x3"
  CHECK (concepto = 'ALUMNO_A_CARGO'::concepto_tarifa_honorario OR id_plan IS NULL);

ALTER TABLE "tarifas_honorario"
  ADD CONSTRAINT "ck_tarifas_honorario_x4"
  CHECK (fecha_vigencia_hasta IS NULL OR fecha_vigencia_hasta >= fecha_vigencia_desde);

ALTER TABLE "liquidaciones"
  ADD CONSTRAINT "ck_liquidaciones_estado"
  CHECK (estado::text IN ('BORRADOR', 'CERRADA', 'PAGADA'));

ALTER TABLE "liquidaciones"
  ADD CONSTRAINT "ck_liquidaciones_x1"
  CHECK (periodo_hasta > periodo_desde);

ALTER TABLE "liquidacion_detalles"
  ADD CONSTRAINT "ck_liquidacion_detalles_concepto"
  CHECK (concepto::text IN ('ALUMNO_A_CARGO', 'CLASE_SUPLIDA', 'DESCUENTO_AUSENCIA'));

ALTER TABLE "liquidacion_detalles"
  ADD CONSTRAINT "ck_liquidacion_detalles_x1"
  CHECK (concepto <> 'ALUMNO_A_CARGO'::concepto_liquidacion_detalle OR id_inscripcion IS NOT NULL);

ALTER TABLE "liquidacion_detalles"
  ADD CONSTRAINT "ck_liquidacion_detalles_x2"
  CHECK (concepto = 'ALUMNO_A_CARGO'::concepto_liquidacion_detalle OR id_clase IS NOT NULL);

ALTER TABLE "liquidacion_detalles"
  ADD CONSTRAINT "ck_liquidacion_detalles_x3"
  CHECK (concepto <> 'DESCUENTO_AUSENCIA'::concepto_liquidacion_detalle OR monto < 0);
