import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  appInfo: { name: "Rafter AI", version: "1.0.0" },
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );

    // Handle Subscription Changes (Created, Updated, Deleted)
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object;
      
      // 1. Sync Subscription Status to DB
      await supabase.from("stripe_subscriptions").upsert({
        customer_id: subscription.customer,
        subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        current_period_end: subscription.current_period_end,
      }, { onConflict: "customer_id" });

      // 2. Push to CRM (Unlock Company Access)
      // Only if status is 'active' or 'trialing'
      if (["active", "trialing"].includes(subscription.status)) {
        
        // Find the Supabase User ID linked to this Stripe Customer
        const { data: customerData } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", subscription.customer)
          .single();

        if (customerData?.user_id) {
          // Find the User's Company
          const { data: userData } = await supabase
            .from("users")
            .select("company_id")
            .eq("id", customerData.user_id)
            .single();

          if (userData?.company_id) {
            // UNLOCK THE COMPANY
            await supabase
              .from("companies")
              .update({ 
                status: "Active", 
                setup_complete: true // This allows them past the Onboarding screen
              })
              .eq("id", userData.company_id);
              
            console.log(`Company ${userData.company_id} unlocked for user ${customerData.user_id}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
});