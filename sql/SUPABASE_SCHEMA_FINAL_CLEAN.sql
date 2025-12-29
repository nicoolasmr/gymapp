-- ============================================
-- SCHEMA COMPLETO E LIMPO - MVP 0.5
-- Execute este arquivo no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. EXTENSÕES NECESSÁRIAS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 2. TABELAS PRINCIPAIS
-- ============================================

-- 2.1 USERS (estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    birth_date DATE,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
    push_token TEXT,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 PLANS
CREATE TABLE IF NOT EXISTS public.plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    max_members INT DEFAULT 1,
    description TEXT,
    stripe_price_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 ACADEMIES
CREATE TABLE IF NOT EXISTS public.academies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    modality TEXT CHECK (modality IN ('gym_standard', 'crossfit', 'martial_arts', 'yoga', 'pilates', 'studio', 'other')),
    
    -- Endereço e Localização
    address JSONB,
    location GEOGRAPHY(POINT, 4326),
    
    -- Mídia
    logo_url TEXT,
    photos TEXT[],
    
    -- Informações Operacionais
    amenities TEXT[],
    rules TEXT[],
    opening_hours JSONB,
    contact JSONB,
    
    -- Gestão
    owner_id UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES public.plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete')),
    
    -- Stripe
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Período
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 FAMILY MEMBERS
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 CHECKINS
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326),
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 ACADEMY PLANS (relação N:N entre academias e planos)
CREATE TABLE IF NOT EXISTS public.academy_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
    plan_id INT REFERENCES public.plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(academy_id, plan_id)
);

-- 2.8 USER BADGES (gamificação)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_type)
);

-- 2.9 REFERRALS
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    reward_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE(referred_id)
);

-- 2.10 COMPETITIONS
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    prize_description TEXT,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.11 COMPETITION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    rank INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, user_id)
);

-- ============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

CREATE INDEX IF NOT EXISTS idx_academies_status ON public.academies(status);
CREATE INDEX IF NOT EXISTS idx_academies_modality ON public.academies(modality);
CREATE INDEX IF NOT EXISTS idx_academies_owner ON public.academies(owner_id);
CREATE INDEX IF NOT EXISTS idx_academies_location ON public.academies USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_stripe_sub ON public.memberships(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_academy ON public.checkins(academy_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.checkins(checked_in_at);

CREATE INDEX IF NOT EXISTS idx_family_members_membership ON public.family_members(membership_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

-- 4.1 POLICIES - USERS
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4.2 POLICIES - PLANS
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (active = TRUE);

-- 4.3 POLICIES - ACADEMIES
DROP POLICY IF EXISTS "Active academies are viewable by everyone" ON public.academies;
CREATE POLICY "Active academies are viewable by everyone"
    ON public.academies FOR SELECT
    USING (status = 'active');

DROP POLICY IF EXISTS "Owners can view their academies" ON public.academies;
CREATE POLICY "Owners can view their academies"
    ON public.academies FOR SELECT
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their academies" ON public.academies;
CREATE POLICY "Owners can update their academies"
    ON public.academies FOR UPDATE
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all academies" ON public.academies;
CREATE POLICY "Admins can view all academies"
    ON public.academies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update all academies" ON public.academies;
CREATE POLICY "Admins can update all academies"
    ON public.academies FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4.4 POLICIES - MEMBERSHIPS
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
CREATE POLICY "Users can view their own memberships"
    ON public.memberships FOR SELECT
    USING (user_id = auth.uid());

-- 4.5 POLICIES - FAMILY MEMBERS
DROP POLICY IF EXISTS "Users can view their family members" ON public.family_members;
CREATE POLICY "Users can view their family members"
    ON public.family_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE id = membership_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their family members" ON public.family_members;
CREATE POLICY "Users can manage their family members"
    ON public.family_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE id = membership_id AND user_id = auth.uid()
        )
    );

-- 4.6 POLICIES - CHECKINS
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.checkins;
CREATE POLICY "Users can view their own checkins"
    ON public.checkins FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create checkins" ON public.checkins;
CREATE POLICY "Users can create checkins"
    ON public.checkins FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Academy owners can view checkins" ON public.checkins;
CREATE POLICY "Academy owners can view checkins"
    ON public.checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.academies
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

-- 4.7 POLICIES - USER BADGES
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users can view their own badges"
    ON public.user_badges FOR SELECT
    USING (user_id = auth.uid());

-- 4.8 POLICIES - COMPETITIONS
DROP POLICY IF EXISTS "Everyone can view active competitions" ON public.competitions;
CREATE POLICY "Everyone can view active competitions"
    ON public.competitions FOR SELECT
    USING (status IN ('active', 'upcoming'));

-- 4.9 POLICIES - COMPETITION PARTICIPANTS
DROP POLICY IF EXISTS "Users can view competition participants" ON public.competition_participants;
CREATE POLICY "Users can view competition participants"
    ON public.competition_participants FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Users can join competitions" ON public.competition_participants;
CREATE POLICY "Users can join competitions"
    ON public.competition_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. FUNÇÕES ÚTEIS
-- ============================================

-- 5.1 Função para pegar academia do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_academy()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    modality TEXT,
    address JSONB,
    logo_url TEXT,
    photos TEXT[],
    amenities TEXT[],
    rules TEXT[],
    opening_hours JSONB,
    contact JSONB,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.modality,
        a.address,
        a.logo_url,
        a.photos,
        a.amenities,
        a.rules,
        a.opening_hours,
        a.contact,
        a.status,
        a.created_at
    FROM public.academies a
    WHERE a.owner_id = auth.uid()
    LIMIT 1;
END;
$$;

-- 5.2 Função para verificar membership ativa
CREATE OR REPLACE FUNCTION check_active_membership(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_active BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE user_id = p_user_id
        AND status = 'active'
        AND current_period_end > now()
    ) INTO v_has_active;
    
    RETURN v_has_active;
END;
$$;

-- 5.3 Função para calcular streak do usuário
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_streak INT := 0;
    v_current_date DATE := CURRENT_DATE;
    v_has_checkin BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM public.checkins
            WHERE user_id = p_user_id
            AND DATE(checked_in_at) = v_current_date
        ) INTO v_has_checkin;
        
        IF NOT v_has_checkin THEN
            EXIT;
        END IF;
        
        v_streak := v_streak + 1;
        v_current_date := v_current_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN v_streak;
END;
$$;

-- 5.4 Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_academies_updated_at ON public.academies;
CREATE TRIGGER update_academies_updated_at
    BEFORE UPDATE ON public.academies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON public.memberships;
CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. DADOS INICIAIS
-- ============================================

-- 6.1 Inserir Planos
INSERT INTO public.plans (id, name, slug, price, max_members, description, active)
VALUES 
    (1, 'Plano Solo', 'solo', 99.00, 1, 'Acesso individual a todas as academias parceiras', TRUE),
    (2, 'Plano Família', 'family', 149.00, 4, 'Acesso para até 4 pessoas da família', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    price = EXCLUDED.price,
    max_members = EXCLUDED.max_members,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- ============================================
-- 7. STORAGE BUCKETS (execute no Supabase Dashboard)
-- ============================================

-- Criar buckets (via Dashboard ou API):
-- - academy-logos (public)
-- - academy-photos (public)
-- - user-avatars (public)

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Verificar criação
SELECT 'Tabelas criadas:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT 'Planos disponíveis:' as info;
SELECT id, name, price, max_members FROM public.plans WHERE active = TRUE;
