import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    
    // Auth Check
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { priceId, email } = await req.json();

    // Create/Get Stripe Customer
    let customerId;
    const { data: existing } = await supabaseClient.from("stripe_customers").select("customer_id").eq("user_id", user.id).single();
    
    if (existing) {
      customerId = existing.customer_id;
    } else {
      const newCust = await stripe.customers.create({ email, metadata: { userId: user.id } });
      customerId = newCust.id;
      // Admin client needed to write to system table if RLS blocks user write
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabaseAdmin.from("stripe_customers").insert({ user_id: user.id, customer_id: customerId });
    }

    // Create Subscription (Incomplete = waiting for payment method)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
      trial_period_days: 7, // 7 Day Trial
    });

    // Determine the Client Secret (Setup Intent for trials, Payment Intent for direct charges)
    const clientSecret = 
        subscription.pending_setup_intent?.client_secret || 
        (subscription.latest_invoice as any)?.payment_intent?.client_secret;

    return new Response(JSON.stringify({ 
      subscriptionId: subscription.id, 
      clientSecret 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});