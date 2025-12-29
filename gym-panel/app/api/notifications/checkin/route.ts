import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This endpoint should be called after a successful check-in
export async function POST(req: Request) {
    try {
        const { userId, academyName } = await req.json();

        // 1. Get User Push Token
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('push_token, full_name')
            .eq('id', userId)
            .single();

        if (error || !user?.push_token) {
            return NextResponse.json({ error: 'User has no push token' }, { status: 400 });
        }

        // 2. Send Notification via Expo API
        const message = {
            to: user.push_token,
            sound: 'default',
            title: 'Check-in Confirmado! ✅',
            body: `Ótimo treino em ${academyName}! Continue assim 💪`,
            data: { type: 'checkin' },
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const data = await response.json();

        // 3. Log notification
        await supabaseAdmin.from('notifications_log').insert({
            user_id: userId,
            title: message.title,
            body: message.body,
            type: 'checkin',
            success: data.data?.status === 'ok',
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
