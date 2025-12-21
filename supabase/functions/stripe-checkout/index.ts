import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: { name: 'Rafter AI', version: '1.0.0' },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    // 1. Verify User
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Invalid user token');

    const { priceId, email, redirectUrl } = await req.json();

    // 2. Get or Create Stripe Customer
    let customerId;
    const { data: existingCust } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.customer_id;
    } else {
      const newCust = await stripe.customers.create({ 
        email, 
        metadata: { userId: user.id } 
      });
      customerId = newCust.id;
      await supabase.from('stripe_customers').insert({ 
        user_id: user.id, 
        customer_id: customerId 
      });
    }

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${redirectUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectUrl}/onboarding`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id }
      },
      // *** CRITICAL FIX HERE ***
      // 'always' forces Stripe to ask for a card even if the trial is $0
      payment_method_collection: 'always', 
      allow_promotion_codes: true, // Optional: Enable promo codes
    });

    return new Response(
      JSON.stringify({ url: session.url }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});