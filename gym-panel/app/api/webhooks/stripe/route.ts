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
    const invoice = event.data.object as Stripe.Invoice;

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                // Pagamento inicial realizado com sucesso
                if (session.metadata?.userId) {
                    const userId = session.metadata.userId;
                    const planId = session.metadata.planId; // '1' (Solo) ou '2' (Familia)

                    console.log(`Processing checkout for user ${userId}, plan ${planId}`);

                    // 1. Atualizar status da assinatura
                    // (Isso já deve ser feito pelo seu backend de checkout, mas garantimos aqui)
                    // ...

                    // 2. Converter Indicação (Se houver)
                    // O RPC 'convert_referral' verifica se o usuário foi indicado e converte
                    const { error: referralError } = await supabase.rpc('convert_referral', {
                        p_referred_id: userId
                    });

                    if (referralError) {
                        console.error('Error converting referral:', referralError);
                    } else {
                        console.log('Referral converted successfully (if existed)');
                    }
                }
                break;

            case 'invoice.created':
                // Nova fatura gerada (renovação mensal)
                // Verificar se devemos aplicar desconto de indicação
                if (invoice.customer && invoice.subscription) {
                    // Precisamos achar o user_id baseado no customer_id do Stripe
                    // Assumindo que guardamos o customer_id na tabela users ou memberships
                    // Por simplificação, vamos tentar buscar na tabela memberships pelo subscription_id se possível
                    // Ou, idealmente, o metadata do subscription tem o userId.

                    // Como o invoice.created não traz metadata da subscription facilmente sem expandir,
                    // vamos assumir que a lógica de desconto será aplicada ANTES da fatura ser finalizada.
                    // O ideal é usar o webhook 'invoice.created' para adicionar o desconto.

                    const subscriptionId = invoice.subscription as string;

                    // Buscar usuário dono da subscription
                    const { data: membership } = await supabase
                        .from('memberships')
                        .select('user_id')
                        .eq('stripe_subscription_id', subscriptionId)
                        .single();

                    if (membership) {
                        console.log(`Applying discount for user ${membership.user_id} on invoice ${invoice.id}`);

                        // Chamar RPC para aplicar desconto
                        // Essa função deve retornar o valor do desconto ou aplicá-lo via Stripe API
                        const { data: discountAmount, error: discountError } = await supabase.rpc('apply_referral_discount', {
                            p_user_id: membership.user_id
                        });

                        if (!discountError && discountAmount > 0) {
                            // Aplicar desconto na fatura do Stripe (Adicionar item negativo)
                            await stripe.invoiceItems.create({
                                customer: invoice.customer as string,
                                invoice: invoice.id,
                                amount: -Math.round(discountAmount * 100), // Centavos negativos
                                currency: 'brl',
                                description: 'Desconto de Indicação (10%)'
                            });
                            console.log(`Discount of R$ ${discountAmount} applied to invoice.`);
                        }
                    }
                }
                break;

            case 'customer.subscription.deleted':
                // Assinatura cancelada
                const subscriptionId = event.data.object.id;
                await supabase
                    .from('memberships')
                    .update({ status: 'canceled' })
                    .eq('stripe_subscription_id', subscriptionId);
                break;
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Error processing webhook', { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
