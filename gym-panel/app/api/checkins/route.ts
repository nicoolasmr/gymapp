import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getDistance } from 'geolib';

export async function POST(request: Request) {
    const supabase = createClient();

    // 1. Validate User Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { academy_id, latitude, longitude } = body;

        if (!academy_id || !latitude || !longitude) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Validate Active Plan
        const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'No active plan found' }, { status: 403 });
        }

        // 3. Validate Daily Check-in Limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { count, error: checkinError } = await supabase
            .from('checkins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        if (checkinError) {
            return NextResponse.json({ error: 'Error checking daily limit' }, { status: 500 });
        }

        if (count && count > 0) {
            return NextResponse.json({ error: 'Daily check-in limit reached' }, { status: 403 });
        }

        // 4. Validate Geolocation
        const { data: academy, error: academyError } = await supabase
            .from('academies')
            .select('latitude, longitude')
            .eq('id', academy_id)
            .single();

        if (academyError || !academy) {
            return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
        }

        const distance = getDistance(
            { latitude, longitude },
            { latitude: academy.latitude, longitude: academy.longitude }
        );

        // Allow 300m radius
        if (distance > 300) {
            return NextResponse.json({
                error: `You are too far from the academy (${distance}m). Max allowed: 300m.`
            }, { status: 403 });
        }

        // 5. Create Check-in Record
        const { data: newCheckin, error: createError } = await supabase
            .from('checkins')
            .insert({
                user_id: user.id,
                academy_id: academy_id,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) {
            return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 });
        }

        return NextResponse.json({ success: true, checkin: newCheckin });

    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
