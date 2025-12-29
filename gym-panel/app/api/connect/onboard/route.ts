import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/connect/onboard
 * Inicia o processo de onboarding do Stripe Connect para uma academia
 */
export async function POST(req: Request) {
    try {
        const { academyId } = await req.json();

        if (!academyId) {
            return NextResponse.json({ error: 'academyId required' }, { status: 400 });
        }

        logger.info('Starting Connect onboarding', { academyId });

        // 1. Buscar academia
        const { data: academy, error: fetchError } = await supabase
            .from('academies')
            .select('id, name, stripe_connect_account_id, owner_id')
            .eq('id', academyId)
            .single();

        if (fetchError || !academy) {
            return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
        }

        // 2. Se já tem conta, retornar link de dashboard
        if (academy.stripe_connect_account_id) {
            const loginLink = await stripe.accounts.createLoginLink(
                academy.stripe_connect_account_id
            );

            return NextResponse.json({
                success: true,
                existing: true,
                url: loginLink.url,
            });
        }

        // 3. Criar nova conta Connect (Express)
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'BR',
            email: `${academy.id}@evolve-temp.com`, // Placeholder, será atualizado no onboarding
            capabilities: {
                transfers: { requested: true },
            },
            business_type: 'company',
            metadata: {
                academy_id: academyId,
                academy_name: academy.name,
            },
        });

        logger.info('Connect account created', { accountId: account.id, academyId });

        // 4. Salvar no banco
        await supabase
            .from('academies')
            .update({
                stripe_connect_account_id: account.id,
                connect_onboarding_status: 'pending',
            })
            .eq('id', academyId);

        // 5. Criar Account Link (URL de onboarding)
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finance?refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finance?success=true`,
            type: 'account_onboarding',
        });

        logger.info('Account link created', { url: accountLink.url });

        return NextResponse.json({
            success: true,
            url: accountLink.url,
            accountId: account.id,
        });
    } catch (error: any) {
        logger.error('Connect onboarding failed', error);
        return NextResponse.json(
            { error: error.message || 'Internal error' },
            { status: 500 }
        );
    }
}
