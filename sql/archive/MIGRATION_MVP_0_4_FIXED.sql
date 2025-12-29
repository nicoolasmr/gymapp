-- ============================================
-- MIGRATION MVP 0.4 - FIXED (SEM ERROS)
-- ============================================

-- 1. CRIAR TIPO (SE NÃO EXISTIR)
DO $$ BEGIN
    CREATE TYPE academy_modality AS ENUM ('gym_standard', 'crossfit_box', 'studio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ALTERAR TABELAS (SE COLUNAS NÃO EXISTIREM)
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS modality academy_modality DEFAULT 'gym_standard';

ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS modality academy_modality DEFAULT 'gym_standard';

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS weekly_limit INT,
ADD COLUMN IF NOT EXISTS requires_reservation BOOLEAN DEFAULT FALSE;

-- 3. NOVAS TABELAS (SE NÃO EXISTIREM)
CREATE TABLE IF NOT EXISTS payout_rules (
    id SERIAL PRIMARY KEY,
    modality academy_modality UNIQUE NOT NULL,
    payout_min DECIMAL(10, 2) NOT NULL,
    payout_max DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO payout_rules (modality, payout_min, payout_max) VALUES
('gym_standard', 6.00, 12.00),
('crossfit_box', 20.00, 35.00),
('studio', 25.00, 50.00)
ON CONFLICT (modality) DO UPDATE SET
payout_min = EXCLUDED.payout_min,
payout_max = EXCLUDED.payout_max;

CREATE TABLE IF NOT EXISTS class_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) NOT NULL,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) NOT NULL,
    name TEXT NOT NULL,
    instructor TEXT,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    class_id UUID REFERENCES studio_classes(id),
    window_id UUID REFERENCES class_windows(id),
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('reserved', 'checked_in', 'cancelled', 'noshow')) DEFAULT 'reserved',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, class_id, date),
    UNIQUE(user_id, window_id, date)
);

ALTER TABLE checkins
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id),
ADD COLUMN IF NOT EXISTS modality academy_modality;

-- 4. ATUALIZAR PLANOS
INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (3, 'Plano Gym Solo', 149.00, 1, 'Acesso diário a academias convencionais', 'gym_standard', NULL, FALSE)
ON CONFLICT (id) DO UPDATE SET price = 149.00, name = 'Plano Gym Solo', modality = 'gym_standard';

INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (4, 'Plano Gym Família', 449.00, 4, 'Acesso diário para família em academias convencionais', 'gym_standard', NULL, FALSE)
ON CONFLICT (id) DO UPDATE SET price = 449.00, name = 'Plano Gym Família', modality = 'gym_standard';

INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (5, 'CrossFit Flex Solo', 220.00, 1, '3 treinos por semana em Boxes de CrossFit', 'crossfit_box', 3, FALSE)
ON CONFLICT (id) DO UPDATE SET price = 220.00, name = 'CrossFit Flex Solo', modality = 'crossfit_box', weekly_limit = 3;

INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (6, 'CrossFit Flex Família', 700.00, 4, '3 treinos por semana para família em Boxes', 'crossfit_box', 3, FALSE)
ON CONFLICT (id) DO UPDATE SET price = 700.00, name = 'CrossFit Flex Família', modality = 'crossfit_box', weekly_limit = 3;

INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (7, 'Studio Pass Solo', 300.00, 1, '2 aulas por semana em Studios (Pilates, Yoga, etc)', 'studio', 2, TRUE)
ON CONFLICT (id) DO UPDATE SET price = 300.00, name = 'Studio Pass Solo', modality = 'studio', weekly_limit = 2, requires_reservation = TRUE;

INSERT INTO plans (id, name, price, max_members, description, modality, weekly_limit, requires_reservation)
VALUES (8, 'Studio Pass Família', 1000.00, 4, '2 aulas por semana para família em Studios', 'studio', 2, TRUE)
ON CONFLICT (id) DO UPDATE SET price = 1000.00, name = 'Studio Pass Família', modality = 'studio', weekly_limit = 2, requires_reservation = TRUE;

-- 5. RPCs (Funções)
CREATE OR REPLACE FUNCTION make_reservation(_user_id UUID, _class_id UUID, _date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _plan_id INT;
    _modality academy_modality;
    _weekly_limit INT;
    _reservations_this_week INT;
    _class_capacity INT;
    _current_reservations INT;
BEGIN
    SELECT p.id, p.modality, p.weekly_limit 
    INTO _plan_id, _modality, _weekly_limit
    FROM memberships m
    JOIN plans p ON m.plan_id = p.id
    WHERE m.user_id = _user_id AND m.status = 'active';

    IF _plan_id IS NULL THEN RAISE EXCEPTION 'Usuário não possui plano ativo'; END IF;
    IF _modality != 'studio' THEN RAISE EXCEPTION 'Seu plano não permite reservas em Studios'; END IF;

    SELECT count(*) INTO _reservations_this_week
    FROM reservations
    WHERE user_id = _user_id 
    AND date >= date_trunc('week', _date) 
    AND date < date_trunc('week', _date) + interval '1 week'
    AND status != 'cancelled';

    IF _reservations_this_week >= _weekly_limit THEN RAISE EXCEPTION 'Limite semanal de reservas atingido'; END IF;

    SELECT capacity INTO _class_capacity FROM studio_classes WHERE id = _class_id;
    
    SELECT count(*) INTO _current_reservations
    FROM reservations
    WHERE class_id = _class_id AND date = _date AND status = 'reserved';

    IF _current_reservations >= _class_capacity THEN RAISE EXCEPTION 'Aula lotada'; END IF;

    INSERT INTO reservations (user_id, class_id, date, status)
    VALUES (_user_id, _class_id, _date, 'reserved');

    RETURN json_build_object('success', true, 'message', 'Reserva realizada com sucesso');
END;
$$;

CREATE OR REPLACE FUNCTION perform_checkin(
  _user_id UUID, 
  _academy_id UUID, 
  _user_lat DOUBLE PRECISION, 
  _user_long DOUBLE PRECISION
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _academy_lat DOUBLE PRECISION;
  _academy_long DOUBLE PRECISION;
  _academy_active BOOLEAN;
  _academy_modality academy_modality;
  _distance DOUBLE PRECISION;
  _plan_id INT;
  _plan_modality academy_modality;
  _weekly_limit INT;
  _checkins_today INT;
  _checkins_week INT;
  _reservation_id UUID;
BEGIN
  SELECT lat, long, active, modality INTO _academy_lat, _academy_long, _academy_active, _academy_modality
  FROM academies WHERE id = _academy_id;

  IF _academy_lat IS NULL OR _academy_active IS FALSE THEN RAISE EXCEPTION 'Academia não encontrada ou inativa'; END IF;

  _distance := (6371 * acos(cos(radians(_user_lat)) * cos(radians(_academy_lat)) * cos(radians(_academy_long) - radians(_user_long)) + sin(radians(_user_lat)) * sin(radians(_academy_lat)))) * 1000;

  IF _distance > 300 THEN RAISE EXCEPTION 'Você está muito longe da academia (%m). Aproxime-se para fazer check-in.', floor(_distance); END IF;

  SELECT p.id, p.modality, p.weekly_limit 
  INTO _plan_id, _plan_modality, _weekly_limit
  FROM memberships m
  JOIN plans p ON m.plan_id = p.id
  WHERE m.user_id = _user_id AND m.status = 'active';

  IF _plan_id IS NULL THEN RAISE EXCEPTION 'Usuário não possui plano ativo'; END IF;

  IF _academy_modality = 'gym_standard' THEN
      SELECT count(*) INTO _checkins_today FROM checkins WHERE user_id = _user_id AND created_at > current_date;
      IF _checkins_today > 0 THEN RAISE EXCEPTION 'Limite diário de 1 check-in atingido'; END IF;

  ELSIF _academy_modality = 'crossfit_box' THEN
      IF _plan_modality = 'gym_standard' THEN RAISE EXCEPTION 'Seu plano não inclui CrossFit. Faça um upgrade!'; END IF;
      SELECT count(*) INTO _checkins_week FROM checkins WHERE user_id = _user_id AND created_at >= date_trunc('week', now());
      IF _checkins_week >= COALESCE(_weekly_limit, 3) THEN RAISE EXCEPTION 'Limite semanal de treinos atingido para seu plano'; END IF;

  ELSIF _academy_modality = 'studio' THEN
      IF _plan_modality != 'studio' THEN RAISE EXCEPTION 'Seu plano não inclui Studios. Faça um upgrade!'; END IF;
      SELECT id INTO _reservation_id FROM reservations WHERE user_id = _user_id AND date = current_date AND status = 'reserved' LIMIT 1;
      IF _reservation_id IS NULL THEN RAISE EXCEPTION 'Você não possui reserva agendada para hoje neste estúdio.'; END IF;
      UPDATE reservations SET status = 'checked_in' WHERE id = _reservation_id;
  END IF;

  INSERT INTO checkins (user_id, academy_id, modality, reservation_id)
  VALUES (_user_id, _academy_id, _academy_modality, _reservation_id);

  RETURN json_build_object('success', true, 'message', 'Check-in realizado com sucesso!', 'modality', _academy_modality);
END;
$$;

-- 6. ATUALIZAR ACADEMIA DE TESTE (SE EXISTIR)
UPDATE academies SET modality = 'crossfit_box' WHERE name = 'Academia Teste MVP 0.3';

INSERT INTO academies (name, address, lat, long, active, description, modality)
SELECT 'Studio Pilates Zen', 'Rua das Flores, 123', -22.878260606151592, -42.04539959521476, TRUE, 'Studio especializado em Pilates e Yoga', 'studio'
WHERE NOT EXISTS (SELECT 1 FROM academies WHERE name = 'Studio Pilates Zen');

INSERT INTO studio_classes (academy_id, name, instructor, day_of_week, start_time, end_time, capacity)
SELECT id, 'Pilates Solo', 'Instrutora Ana', EXTRACT(DOW FROM now()), '08:00', '20:00', 10
FROM academies WHERE name = 'Studio Pilates Zen'
AND NOT EXISTS (SELECT 1 FROM studio_classes WHERE name = 'Pilates Solo' AND academy_id = academies.id);
