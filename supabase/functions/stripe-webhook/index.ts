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

const SUBSCRIPTION_PLAN_MAPPING: Record<string, { tier: string; maxUsers: number }> = {
  'price_1SgX3WPi0ycIAEpYb38zmYPK': { tier: 'Starter', maxUsers: 5 },
  'price_1SgX5hPi0ycIAEpYimplJjy5': { tier: 'Professional', maxUsers: 15 },
  'price_1SgX6FPi0ycIAEpYUM5UikDS': { tier: 'Enterprise', maxUsers: 999 },
};

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
            // Get the price ID from the subscription
            const priceId = subscription.items.data[0].price.id;
            const planConfig = SUBSCRIPTION_PLAN_MAPPING[priceId];

            // UNLOCK THE COMPANY with correct tier and user limits
            const updateData: any = {
              status: "Active",
              setup_complete: true
            };

            // If we recognize the price ID, set tier and max_users
            if (planConfig) {
              updateData.tier = planConfig.tier;
              updateData.max_users = planConfig.maxUsers;
              console.log(`Setting company to ${planConfig.tier} with ${planConfig.maxUsers} max users`);
            }

            await supabase
              .from("companies")
              .update(updateData)
              .eq("id", userData.company_id);

            console.log(`Company ${userData.company_id} unlocked for user ${customerData.user_id}`);

            // 2a. Update software_leads to mark as converted
            const { data: userEmailData } = await supabase
              .from("users")
              .select("email")
              .eq("id", customerData.user_id)
              .single();

            if (userEmailData?.email) {
              await supabase
                .from("software_leads")
                .update({
                  status: "Converted",
                  tags: ["converted", "active-subscription"],
                  notes: "Successfully converted to paying customer.",
                })
                .eq("email", userEmailData.email);

              console.log(`Lead converted for ${userEmailData.email}`);
            }

            // 3. Check for referral and create referral_signup record if it's a new subscription
            if (event.type === "customer.subscription.created") {
              const { data: authUserData } = await supabase.auth.admin.getUserById(customerData.user_id);
              const referralCode = authUserData?.user?.user_metadata?.referral_code;

              if (referralCode) {
                const { data: referrerData } = await supabase
                  .from("users")
                  .select("id")
                  .eq("referral_code", referralCode)
                  .maybeSingle();

                if (referrerData) {
                  await supabase.from("referral_signups").insert({
                    company_id: userData.company_id,
                    referred_by_user_id: referrerData.id,
                    referral_code: referralCode,
                    metadata: {
                      subscription_id: subscription.id,
                      price_id: priceId,
                    }
                  });
                  console.log(`Referral tracked for company ${userData.company_id} by user ${referrerData.id}`);
                }
              }
            }
          }
        }
      }
    }

    // Handle Invoice Payments for Commission Tracking
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      if (invoice.subscription) {
        const { data: customerData } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", invoice.customer)
          .maybeSingle();

        if (customerData?.user_id) {
          const { data: userData } = await supabase
            .from("users")
            .select("company_id")
            .eq("id", customerData.user_id)
            .maybeSingle();

          if (userData?.company_id) {
            const { data: referralData } = await supabase
              .from("referral_signups")
              .select("referred_by_user_id, referral_code")
              .eq("company_id", userData.company_id)
              .maybeSingle();

            if (referralData) {
              const commissionRate = 20.00;
              const amountCents = invoice.amount_paid;
              const commissionAmountCents = Math.floor(amountCents * (commissionRate / 100));

              await supabase.from("commissions").insert({
                rep_user_id: referralData.referred_by_user_id,
                company_id: userData.company_id,
                amount: commissionAmountCents / 100,
                amount_cents: commissionAmountCents,
                currency: invoice.currency,
                commission_rate: commissionRate,
                stripe_subscription_id: invoice.subscription,
                invoice_id: invoice.id,
                status: 'pending',
                period_start: new Date(invoice.period_start * 1000).toISOString(),
                period_end: new Date(invoice.period_end * 1000).toISOString(),
              });

              console.log(`Commission created for rep ${referralData.referred_by_user_id}: $${(commissionAmountCents / 100).toFixed(2)}`);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
});