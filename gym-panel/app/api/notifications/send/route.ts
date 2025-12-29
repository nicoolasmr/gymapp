import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { title, body, userId } = await req.json();

        // 1. Get User Push Token
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('push_token')
            .eq('id', userId)
            .single();

        if (error || !user?.push_token) {
            return NextResponse.json({ error: 'User has no push token' }, { status: 400 });
        }

        // 2. Send Notification via Expo API
        const message = {
            to: user.push_token,
            sound: 'default',
            title: title,
            body: body,
            data: { someData: 'goes here' },
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

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
