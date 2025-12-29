-- MVP 0.3 Part 3 Schema Updates

-- 1. Notifications Log Table
CREATE TABLE IF NOT EXISTS notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- 'streak', 'checkin', 'payment', 'promo'
    sent_at TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT TRUE
);

-- 2. Soft Delete for Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. View for Finance: Monthly Stats (Helper)
CREATE OR REPLACE VIEW monthly_academy_stats AS
SELECT 
    academy_id,
    to_char(created_at, 'YYYY-MM') as month,
    count(*) as total_checkins,
    count(*) * 15.00 as estimated_value -- Example fixed rate
FROM checkins
GROUP BY academy_id, to_char(created_at, 'YYYY-MM');

-- 4. RPC: Soft Delete User
CREATE OR REPLACE FUNCTION soft_delete_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users SET deleted_at = now() WHERE id = _user_id;
    -- Also cancel active memberships?
    UPDATE memberships SET status = 'canceled' WHERE user_id = _user_id AND status = 'active';
    RETURN TRUE;
END;
$$;

-- 5. RPC: Get Frequent Users (for Finance)
CREATE OR REPLACE FUNCTION get_frequent_users(_academy_id UUID, _limit INT DEFAULT 5)
RETURNS TABLE (
    user_name TEXT,
    checkin_count BIGINT,
    last_checkin TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.full_name,
        count(c.id) as checkin_count,
        max(c.created_at) as last_checkin
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.academy_id = _academy_id
    AND c.created_at > (now() - INTERVAL '30 days')
    GROUP BY u.id, u.full_name
    ORDER BY checkin_count DESC
    LIMIT _limit;
END;
$$;

-- 6. RPC: Get Check-ins Per Day (Last 30 days) for Admin/Finance
CREATE OR REPLACE FUNCTION get_daily_checkins(_academy_id UUID DEFAULT NULL)
RETURNS TABLE (
    day DATE,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF _academy_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            created_at::date as day,
            count(*) as count
        FROM checkins
        WHERE academy_id = _academy_id
        AND created_at > (now() - INTERVAL '30 days')
        GROUP BY created_at::date
        ORDER BY day ASC;
    ELSE
        -- Admin view (all academies)
        RETURN QUERY
        SELECT 
            created_at::date as day,
            count(*) as count
        FROM checkins
        WHERE created_at > (now() - INTERVAL '30 days')
        GROUP BY created_at::date
        ORDER BY day ASC;
    END IF;
END;
$$;
