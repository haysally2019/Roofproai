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
    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get User from Auth Header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) throw new Error('User not authenticated')

    const { priceId, email } = await req.json()

    // 3. Get or Create Stripe Customer (Using Bolt's Schema)
    let customerId: string

    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.customer_id
    } else {
      // Create new in Stripe
      const stripeCustomer = await stripe.customers.create({ 
        email: email, 
        metadata: { userId: user.id } 
      })
      customerId = stripeCustomer.id

      // Save to Bolt's Table
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: customerId
      })
    }

    // 4. Create Subscription with 7-Day Trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: 7, // <--- FORCE FREE TRIAL
    })

    // 5. Save Subscription Record (Using Bolt's Schema)
    await supabase.from('stripe_subscriptions').insert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: priceId,
      status: 'trialing',
    })

    // 6. Return Client Secret to Frontend
    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: subscription.latest_invoice.payment_intent.client_secret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})