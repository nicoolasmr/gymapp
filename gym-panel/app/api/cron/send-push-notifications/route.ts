import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { logger } from '@/lib/logger';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const expo = new Expo();

/**
 * CRON JOB: Send Push Notifications
 * Trigger: Daily at 18:00 (via Vercel Cron or external scheduler)
 * Route: POST /api/cron/send-push-notifications
 */
export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'streak_risk';

    // Auth: Verify cron secret (Vercel Cron sends Authorization header)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting push notification job', { type });

    try {
        if (type === 'streak_risk') {
            return await sendStreakRiskNotifications();
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        logger.error('Push notification job failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendStreakRiskNotifications() {
    const now = new Date();
    const hour = now.getHours();

    // Quiet Hours: Don't send between 22:00 and 08:00
    if (hour >= 22 || hour < 8) {
        logger.info('Skipping notifications: Quiet hours');
        return NextResponse.json({ message: 'Quiet hours, skipped' });
    }

    // 1. Get users at risk
    const { data: usersAtRisk, error } = await supabase.rpc('get_users_at_streak_risk');

    if (error) throw error;

    if (!usersAtRisk || usersAtRisk.length === 0) {
        logger.info('No users at streak risk');
        return NextResponse.json({ message: 'No users to notify', count: 0 });
    }

    logger.info(`Found ${usersAtRisk.length} users at streak risk`);

    // 2. Prepare messages
    const messages: ExpoPushMessage[] = [];
    const dedupKeys: string[] = [];

    for (const user of usersAtRisk) {
        const dedupKey = `user_${user.user_id}_streak_risk_${now.toISOString().split('T')[0]}`;

        // Check if already sent today
        const { data: existing } = await supabase
            .from('push_notifications_log')
            .select('id')
            .eq('dedup_key', dedupKey)
            .single();

        if (existing) {
            logger.info(`Skipping duplicate notification for user ${user.user_id}`);
            continue;
        }

        if (!Expo.isExpoPushToken(user.push_token)) {
            logger.warn(`Invalid push token for user ${user.user_id}`);
            continue;
        }

        messages.push({
            to: user.push_token,
            sound: 'default',
            title: `🔥 Sequência de ${user.streak_days} dias em risco!`,
            body: 'Não deixe sua sequência acabar! Faça um check-in hoje.',
            data: {
                type: 'streak_risk',
                userId: user.user_id,
                screen: '/home'
            },
        });

        dedupKeys.push(dedupKey);

        // Log as pending
        await supabase.from('push_notifications_log').insert({
            user_id: user.user_id,
            notification_type: 'streak_risk',
            dedup_key: dedupKey,
            title: `🔥 Sequência de ${user.streak_days} dias em risco!`,
            body: 'Não deixe sua sequência acabar! Faça um check-in hoje.',
            data: { streak_days: user.streak_days },
            status: 'pending',
        });
    }

    // 3. Send in chunks (Expo recommends batches of 100)
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failCount = 0;

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

            ticketChunk.forEach((ticket, index) => {
                if (ticket.status === 'ok') {
                    successCount++;
                    // Update log to 'sent'
                    supabase
                        .from('push_notifications_log')
                        .update({ status: 'sent', sent_at: new Date().toISOString() })
                        .eq('dedup_key', dedupKeys[index])
                        .then();
                } else {
                    failCount++;
                    logger.error('Push ticket error', { ticket });
                    supabase
                        .from('push_notifications_log')
                        .update({ status: 'failed', error_message: ticket.message })
                        .eq('dedup_key', dedupKeys[index])
                        .then();
                }
            });
        } catch (error: any) {
            logger.error('Failed to send push chunk', error);
            failCount += chunk.length;
        }
    }

    logger.info('Push notification job completed', { successCount, failCount });

    return NextResponse.json({
        success: true,
        sent: successCount,
        failed: failCount,
        total: messages.length,
    });
}
