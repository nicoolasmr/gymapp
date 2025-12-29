import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    // This would be called by a Cron Job (e.g., GitHub Actions, Vercel Cron)
    // For MVP, we simulate the logic.

    // Logic: Find users who haven't checked in for > 24h but < 48h (to save streak)
    // This is complex to query efficiently without a specific 'last_checkin' column on users or a materialized view.
    // For MVP, let's just query checkins.

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Find users with last checkin around yesterday
        // Simplified: Just send a generic message to all users with push tokens for now to demonstrate capability
        // In production: Query specific users.

        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, push_token')
            .not('push_token', 'is', null);

        if (!users) return NextResponse.json({ message: 'No users found' });

        const messages = users.map(user => ({
            to: user.push_token,
            sound: 'default',
            title: 'Mantenha seu ritmo! 🔥',
            body: 'Você não treinou hoje ainda. Vamos lá?',
            data: { userId: user.id },
        }));

        // Send in batches to Expo (Expo handles arrays)
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        return NextResponse.json({ success: true, count: users.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
