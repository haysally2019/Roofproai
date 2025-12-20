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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Initialize Supabase ADMIN Client (Bypass RLS)
    // We use SERVICE_ROLE_KEY because new users might not have permission to write to 'stripe_customers' yet
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verify User Token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization Header')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Invalid User Token')

    const { priceId, email } = await req.json()

    if (!priceId) throw new Error("Missing Price ID")

    // 3. Get or Create Stripe Customer
    let customerId: string

    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.customer_id
    } else {
      // Create in Stripe
      const stripeCustomer = await stripe.customers.create({ 
        email: email, 
        metadata: { userId: user.id } 
      })
      customerId = stripeCustomer.id

      // Save to DB (Using Admin Client to bypass RLS)
      const { error: insertError } = await supabaseAdmin.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: customerId
      })
      
      if (insertError) {
          console.error("DB Insert Error:", insertError);
          // Don't throw here, proceed so we don't block payment, but log it
      }
    }

    // 4. Create Subscription with 7-Day Trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: 7, 
    })

    // 5. Save Subscription Record
    await supabaseAdmin.from('stripe_subscriptions').insert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: priceId,
      status: 'trialing',
    })

    // 6. Return Client Secret
    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: subscription.latest_invoice.payment_intent.client_secret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})