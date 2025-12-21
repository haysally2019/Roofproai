import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // 1. Verify User
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized user");

    // 2. Admin Client for DB Writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { priceId, email } = await req.json();
    if (!priceId) throw new Error("Missing Price ID");

    // 3. Get or Create Stripe Customer
    let customerId: string;
    const { data: existingCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.customer_id;
    } else {
      const stripeCustomer = await stripe.customers.create({
        email: email,
        metadata: { userId: user.id },
      });
      customerId = stripeCustomer.id;
      await supabaseAdmin.from("stripe_customers").insert({
        user_id: user.id,
        customer_id: customerId,
      });
    }

    // 4. Create Subscription with 7-Day Trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"]
      },
      trial_period_days: 7,
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    console.log('Subscription created:', subscription.id, 'Status:', subscription.status);
    console.log('Setup Intent:', subscription.pending_setup_intent?.id);
    console.log('Latest Invoice:', subscription.latest_invoice);

    // 5. Store Initial State
    await supabaseAdmin.from("stripe_subscriptions").upsert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: priceId,
      status: subscription.status || "trialing",
    }, { onConflict: 'customer_id' });

    // 6. Return Client Secret
    // For trials with default_incomplete, Stripe creates a setup_intent
    const clientSecret =
      subscription.pending_setup_intent?.client_secret ||
      (subscription.latest_invoice as any)?.payment_intent?.client_secret;

    console.log('Client Secret type:', clientSecret?.substring(0, 5));

    if (!clientSecret) {
      console.error('No client secret found. Subscription:', JSON.stringify(subscription, null, 2));
      throw new Error("Stripe failed to generate client secret.");
    }

    return new Response(
      JSON.stringify({ subscriptionId: subscription.id, clientSecret }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});