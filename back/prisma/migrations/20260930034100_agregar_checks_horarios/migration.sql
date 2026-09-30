ALTER TABLE horarios ADD CONSTRAINT "ck_horarios_x1" CHECK (dia_semana BETWEEN 1 AND 7);
ALTER TABLE horarios ADD CONSTRAINT "ck_horarios_x2" CHECK (hora_fin > hora_inicio);
ALTER TABLE horarios ADD CONSTRAINT "ck_horarios_x3" CHECK (cupo_maximo IS NULL OR cupo_maximo > 0);