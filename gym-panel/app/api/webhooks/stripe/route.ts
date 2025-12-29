import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error(`Webhook Error: ${error.message}`);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                // 1. Process Subscription Creation or Ad Payment
                if (session.metadata?.type === 'ad_campaign') {
                    // --- FLOW: MARKETPLACE ADS ---
                    const campaignId = session.metadata.campaignId;
                    console.log(`Processing Ad Campaign Payment: ${campaignId}`);

                    if (campaignId) {
                        await supabase
                            .from('ads_campaigns')
                            .update({ status: 'active', stripe_subscription_id: session.subscription as string }) // Or subscription ID if recurring
                            .eq('id', campaignId);
                    }
                }
                else if (session.metadata?.userId) {
                    // --- FLOW: USER SUBSCRIPTION ---
                    const userId = session.metadata.userId;
                    const subscriptionId = session.subscription as string;

                    // Update membership status
                    await supabase
                        .from('memberships')
                        .insert({
                            user_id: userId,
                            stripe_subscription_id: subscriptionId,
                            status: 'active',
                            plan_id: session.metadata.planId
                        })
                        .select(); // Ensure it exists

                    // 2. Process Referral (If code present)
                    const referralCode = session.metadata.referralCode;

                    if (referralCode) {
                        console.log(`Processing referral code ${referralCode} for user ${userId}`);

                        // A. Find Referrer
                        const { data: codeData } = await supabase
                            .from('referral_codes')
                            .select('user_id')
                            .eq('code', referralCode)
                            .single();

                        if (codeData) {
                            const referrerId = codeData.user_id;

                            // Prevent self-referral
                            if (referrerId !== userId) {
                                // B. Create Referral Record
                                await supabase
                                    .from('referrals')
                                    .insert({
                                        referrer_id: referrerId,
                                        referred_user_id: userId,
                                        status: 'converted'
                                    });

                                // C. Calculate Reward (10% of Session Amount)
                                // If amount_total is 10000 (R$ 100), reward is 1000 (R$ 10)
                                const rewardAmount = Math.round((session.amount_total || 0) * 0.10);

                                if (rewardAmount > 0) {
                                    // D. Create Reward Record
                                    const { data: reward } = await supabase
                                        .from('referral_rewards')
                                        .insert({
                                            referrer_id: referrerId,
                                            referred_user_id: userId,
                                            amount_cents: rewardAmount,
                                            status: 'earned'
                                        })
                                        .select()
                                        .single();

                                    // E. Apply Credit to Referrer's Stripe Customer
                                    // We need to find the Referrer's Stripe Customer ID first
                                    const { data: referrerMembership } = await supabase
                                        .from('memberships')
                                        .select('stripe_subscription_id') // We need customer_id actually
                                        // Realistically, we should have stripe_customer_id in 'users' or 'memberships'
                                        .eq('user_id', referrerId)
                                        .single();

                                    if (referrerMembership?.stripe_subscription_id) {
                                        // Fetch sub to get customer (inefficient but works for now)
                                        const referrerSub = await stripe.subscriptions.retrieve(referrerMembership.stripe_subscription_id);
                                        const customerId = referrerSub.customer as string;

                                        await stripe.customers.createBalanceTransaction(
                                            customerId,
                                            {
                                                amount: -rewardAmount, // Negative amount = Credit
                                                currency: 'brl',
                                                description: `Bônus indicação: Usuário ${userId}`
                                            }
                                        );

                                        // F. Mark as Processed
                                        if (reward) {
                                            await supabase
                                                .from('referral_rewards')
                                                .update({ status: 'processed', processed_at: new Date().toISOString() })
                                                .eq('id', reward.id);
                                        }
                                        console.log(`Credit of ${rewardAmount} applied to referrer ${referrerId}`);
                                    }
                                }
                            }
                        }
                    }
                }
                break;

            case 'invoice.payment_failed':
                // Send push notification: Payment Failed
                const failedInvoice = event.data.object as any; // Stripe Invoice type incomplete
                if (failedInvoice.subscription) {
                    const { data: membership } = await supabase
                        .from('memberships')
                        .select('user_id')
                        .eq('stripe_subscription_id', failedInvoice.subscription)
                        .single();

                    if (membership) {
                        await sendPushNotification(
                            membership.user_id,
                            'payment_failed',
                            '⚠️ Pagamento Recusado',
                            'Atualize seu método de pagamento para continuar usando o app.'
                        );
                    }
                }
                break;

            case 'invoice.payment_succeeded':
                // Send push notification: Payment Success
                const successInvoice = event.data.object as any; // Stripe Invoice type incomplete

                if (successInvoice.subscription && successInvoice.billing_reason === 'subscription_cycle') {
                    const { data: membership } = await supabase
                        .from('memberships')
                        .select('user_id')
                        .eq('stripe_subscription_id', successInvoice.subscription)
                        .single();

                    if (membership) {
                        await sendPushNotification(
                            membership.user_id,
                            'payment_success',
                            '✅ Pagamento Confirmado',
                            'Sua assinatura foi renovada com sucesso. Bons treinos!'
                        );
                    }
                }
                break;

            case 'customer.subscription.deleted':

                if (event.data.object.id) {
                    await supabase
                        .from('memberships')
                        .update({ status: 'canceled' })
                        .eq('stripe_subscription_id', event.data.object.id);
                }
                break;
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}

/**
 * Helper: Send Push Notification
 */
async function sendPushNotification(
    userId: string,
    type: string,
    title: string,
    body: string
) {
    try {
        const dedupKey = `user_${userId}_${type}_${new Date().toISOString().split('T')[0]}`;

        // Check if already sent today
        const { data: existing } = await supabase
            .from('push_notifications_log')
            .select('id')
            .eq('dedup_key', dedupKey)
            .single();

        if (existing) {
            console.log(`Push notification already sent: ${dedupKey}`);
            return;
        }

        // Get user's push token
        const { data: tokenData } = await supabase
            .from('user_push_tokens')
            .select('expo_push_token')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (!tokenData) {
            console.log(`No push token for user ${userId}`);
            return;
        }

        // Log notification
        await supabase.from('push_notifications_log').insert({
            user_id: userId,
            notification_type: type,
            dedup_key: dedupKey,
            title,
            body,
            status: 'pending',
        });

        // Send via Expo (simplified, in production use expo-server-sdk)
        // For now, we just log. The cron job will pick it up or we send inline.
        console.log(`Push notification queued for user ${userId}: ${title}`);
    } catch (error) {
        console.error('Failed to send push notification:', error);
    }
}
