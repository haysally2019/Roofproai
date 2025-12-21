import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Rafter AI', version: '1.0.0' },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature found', { status: 400 });

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);

    // Process events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.mode === 'subscription') {
          await syncCustomerFromStripe(session.customer as string);
        }
        break;
        
      case 'invoice.payment_succeeded':
        // Optional: Update subscription status immediately on payment success if needed
        const invoice = event.data.object;
        if (invoice.subscription) {
           await handleSubscriptionChange(await stripe.subscriptions.retrieve(invoice.subscription as string));
        }
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

async function handleSubscriptionChange(subscription: any) {
  const customerId = subscription.customer;
  
  const { error } = await supabase.from('stripe_subscriptions').upsert(
    {
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: subscription.items.data[0].price.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      // Handle payment method details if available
      ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string' 
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand,
              payment_method_last4: subscription.default_payment_method.card?.last4
            } 
          : {})
    },
    { onConflict: 'customer_id' }
  );

  if (error) console.error('Error syncing subscription:', error);
  else console.info(`Synced subscription ${subscription.id} for customer ${customerId}`);
}

async function syncCustomerFromStripe(customerId: string) {
  // Same logic as before, retrieves fresh data from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'all',
  });
  
  if (subscriptions.data.length > 0) {
    await handleSubscriptionChange(subscriptions.data[0]);
  }
}