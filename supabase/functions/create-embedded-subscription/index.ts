import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization Header');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid User Token');

    const { priceId, email } = await req.json();
    if (!priceId) throw new Error('Missing Price ID');

    let customerId: string;

    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.customer_id;
    } else {
      const stripeCustomer = await stripe.customers.create({ 
        email: email, 
        metadata: { userId: user.id } 
      });
      customerId = stripeCustomer.id;

      const { error: insertError } = await supabaseAdmin.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: customerId
      });
      
      if (insertError) {
        console.error('DB Insert Error:', insertError);
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: 7, 
    });

    await supabaseAdmin.from('stripe_subscriptions').insert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: priceId,
      status: 'trialing',
    });

    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: subscription.latest_invoice.payment_intent.client_secret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});