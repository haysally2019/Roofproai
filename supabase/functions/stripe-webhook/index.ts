import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature || !endpointSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;
      const amountPaid = invoice.amount_paid / 100; // Convert cents to dollars

      // Init Supabase Admin
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // 1. Find Company by Stripe Customer ID
      const { data: company } = await supabase
        .from('companies')
        .select('id, referred_by_user_id')
        .eq('stripe_customer_id', customerId)
        .single();

      // 2. Calculate & Insert Commission
      if (company && company.referred_by_user_id) {
        const commissionRate = 0.10; // 10%
        const commissionAmount = amountPaid * commissionRate;

        await supabase.from('commissions').insert({
          rep_user_id: company.referred_by_user_id,
          company_id: company.id,
          amount: commissionAmount,
          status: 'Pending',
          stripe_invoice_id: invoice.id
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});