-- El aviso de cuota sale cuando la cuota cambia de estado (US-25, 13/11/2026): ya no hay días previos
-- al vencimiento que configurar.
DELETE FROM "parametros_sistema" WHERE "clave" = 'DIAS_AVISO_VENCIMIENTO';
