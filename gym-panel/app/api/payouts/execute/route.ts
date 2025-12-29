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
 * POST /api/payouts/execute
 * Executa transferências automáticas via Stripe Connect
 * Body: { periodId: UUID, dryRun: boolean }
 */
export async function POST(req: Request) {
    try {
        const { periodId, dryRun = true } = await req.json();

        if (!periodId) {
            return NextResponse.json({ error: 'periodId required' }, { status: 400 });
        }

        logger.info('Executing automated payout', { periodId, dryRun });

        // 1. Executar RPC para preparar transferências
        const { data: result, error: rpcError } = await supabase.rpc(
            'execute_automated_payout',
            {
                p_period_id: periodId,
                p_dry_run: dryRun,
            }
        );

        if (rpcError) {
            logger.error('RPC failed', rpcError);
            return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }

        logger.info('RPC result', result);

        // Se dry run, retornar simulação
        if (dryRun) {
            return NextResponse.json({
                success: true,
                dryRun: true,
                ...result,
            });
        }

        // 2. Buscar transferências pendentes criadas pela RPC
        const { data: transfers, error: fetchError } = await supabase
            .from('payout_transfers')
            .select('*')
            .eq('status', 'pending')
            .is('stripe_transfer_id', null);

        if (fetchError) {
            logger.error('Failed to fetch transfers', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!transfers || transfers.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending transfers to process',
                ...result,
            });
        }

        // 3. Executar transferências no Stripe
        const results = [];
        for (const transfer of transfers) {
            try {
                logger.info('Creating Stripe transfer', {
                    transferId: transfer.id,
                    amount: transfer.amount_cents,
                    destination: transfer.stripe_connect_account_id,
                });

                const stripeTransfer = await stripe.transfers.create({
                    amount: transfer.amount_cents,
                    currency: 'brl',
                    destination: transfer.stripe_connect_account_id,
                    description: `Repasse ${transfer.metadata?.period_id || 'N/A'}`,
                    metadata: {
                        payout_transfer_id: transfer.id,
                        academy_id: transfer.academy_id,
                        payout_run_id: transfer.payout_run_id,
                    },
                });

                // Atualizar status
                await supabase
                    .from('payout_transfers')
                    .update({
                        status: 'completed',
                        stripe_transfer_id: stripeTransfer.id,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', transfer.id);

                // Atualizar payout_run
                await supabase
                    .from('payout_runs')
                    .update({
                        status: 'paid',
                        transfer_method: 'stripe_connect',
                        automated_at: new Date().toISOString(),
                    })
                    .eq('id', transfer.payout_run_id);

                results.push({
                    transferId: transfer.id,
                    stripeTransferId: stripeTransfer.id,
                    status: 'success',
                });

                logger.info('Transfer completed', {
                    transferId: transfer.id,
                    stripeTransferId: stripeTransfer.id,
                });
            } catch (error: any) {
                logger.error('Transfer failed', error, { transferId: transfer.id });

                // Atualizar status como failed
                await supabase
                    .from('payout_transfers')
                    .update({
                        status: 'failed',
                        error_message: error.message,
                    })
                    .eq('id', transfer.id);

                results.push({
                    transferId: transfer.id,
                    status: 'failed',
                    error: error.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            dryRun: false,
            totalProcessed: results.length,
            results,
        });
    } catch (error: any) {
        logger.error('Payout execution failed', error);
        return NextResponse.json(
            { error: error.message || 'Internal error' },
            { status: 500 }
        );
    }
}
