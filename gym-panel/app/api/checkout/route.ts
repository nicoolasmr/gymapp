import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2023-10-16', // Using default installed version
});

export async function POST(request: Request) {
    const supabase = createClient();

    // 1. Validate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { priceId } = body; // 'solo' or 'family'

        // Map internal IDs to Stripe Price IDs (Replace with your actual Stripe Price IDs)
        // Ideally these should be in env vars or DB
        const STRIPE_PRICE_ID = priceId === 'family'
            ? process.env.STRIPE_PRICE_FAMILY
            : process.env.STRIPE_PRICE_SOLO;

        if (!STRIPE_PRICE_ID) {
            return NextResponse.json({ error: 'Invalid price configuration' }, { status: 400 });
        }

        // 2. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [
                {
                    price: STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
            metadata: {
                userId: user.id,
                planType: priceId
            }
        });

        return NextResponse.json({ url: session.url });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
