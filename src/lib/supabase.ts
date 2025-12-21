import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing'
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

export async function createCheckoutSession(priceId: string, mode: 'subscription' | 'payment' = 'subscription') {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      price_id: priceId,
      success_url: `${window.location.origin}/success`,
      cancel_url: `${window.location.origin}/pricing`,
      mode,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }

  const { url } = await response.json()
  return url
}

export async function getUserSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('No authenticated user');
      return null;
    }

    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return null;
    }

    if (!customer) {
      console.log('No Stripe customer found for user');
      return null;
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer_id', customer.customer_id)
      .maybeSingle();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Unexpected error in getUserSubscription:', error);
    return null;
  }
}