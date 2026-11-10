-- Restricciones del DER (SQL de Enterprise Architect) que Prisma no genera.
ALTER TABLE "usuarios"
  ADD CONSTRAINT "ck_usuarios_foto_url"
  CHECK ("foto_url" IS NULL OR "foto_url" ~ '^https://[^[:space:]]+$');
