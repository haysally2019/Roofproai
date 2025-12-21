import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Init Admin Client (Bypass RLS for setup)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Auth Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization Header')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Invalid User Token')

    const { priceId, email } = await req.json()
    if (!priceId) throw new Error('Missing Price ID')

    // 3. Get/Create Customer
    let customerId: string
    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.customer_id
    } else {
      const stripeCustomer = await stripe.customers.create({ email, metadata: { userId: user.id } })
      customerId = stripeCustomer.id
      await supabaseAdmin.from('stripe_customers').insert({ user_id: user.id, customer_id: customerId })
    }

    // 4. Create Subscription
    // CRITICAL FIX: Expand both payment_intent AND pending_setup_intent
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      trial_period_days: 7, 
    })

    // 5. Save Record
    await supabaseAdmin.from('stripe_subscriptions').insert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: priceId,
      status: 'trialing',
    })

    // 6. Determine Client Secret (Trial vs Paid)
    // If it's a trial, use pending_setup_intent. If paid immediately, use payment_intent.
    const clientSecret = 
        subscription.pending_setup_intent?.client_secret || 
        subscription.latest_invoice?.payment_intent?.client_secret;

    if (!clientSecret) throw new Error("Stripe failed to generate a secret. Check if Price ID is correct.");

    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: clientSecret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})