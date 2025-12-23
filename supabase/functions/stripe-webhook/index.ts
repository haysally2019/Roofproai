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

const COMMISSION_PERCENTAGE = 0.20; // 20% commission

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

    // 1. HANDLE NEW SUBSCRIPTION (Existing Logic)
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object;
      
      // Update local tracking
      await supabase.from("stripe_subscriptions").upsert({
        customer_id: subscription.customer,
        subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        current_period_end: subscription.current_period_end,
      }, { onConflict: "customer_id" });

      if (["active", "trialing"].includes(subscription.status)) {
        // Unlock Company Logic
        const { data: customerData } = await supabase.from("stripe_customers").select("user_id").eq("customer_id", subscription.customer).single();
        if (customerData?.user_id) {
          const { data: userData } = await supabase.from("users").select("company_id").eq("id", customerData.user_id).single();
          if (userData?.company_id) {
            await supabase.from("companies").update({ status: "Active", setup_complete: true }).eq("id", userData.company_id);
          }
        }
      }
    }

    // 2. HANDLE SUCCESSFUL PAYMENT (Commission Logic)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      
      if (invoice.amount_paid > 0) {
        
        // A. Find Company & Referrer
        const { data: stripeCust } = await supabase.from("stripe_customers").select("user_id").eq("customer_id", invoice.customer).single();
        
        if (stripeCust) {
           const { data: companyOwner } = await supabase.from("users").select("company_id").eq("id", stripeCust.user_id).single();
             
           if (companyOwner?.company_id) {
             const { data: company } = await supabase.from("companies").select("id, referred_by_user_id").eq("id", companyOwner.company_id).single();

             // B. Pay Referrer
             if (company?.referred_by_user_id) {
                const repId = company.referred_by_user_id;
                const commissionAmount = Math.floor(invoice.amount_paid * COMMISSION_PERCENTAGE);

                const { data: rep } = await supabase.from("users").select("stripe_connect_id").eq("id", repId).single();

                let transferId = null;
                let status = 'Pending';

                // C. Execute Transfer
                if (rep?.stripe_connect_id) {
                    try {
                      const transfer = await stripe.transfers.create({
                        amount: commissionAmount,
                        currency: invoice.currency,
                        destination: rep.stripe_connect_id,
                        description: `Commission for ${company.id}`,
                        source_transaction: invoice.charge 
                      });
                      transferId = transfer.id;
                      status = 'Paid';
                    } catch (err) {
                      console.error("Transfer failed:", err);
                      status = 'Failed';
                    }
                }

                // D. Record in Ledger
                await supabase.from("commissions").insert({
                  rep_user_id: repId,
                  company_id: company.id,
                  amount_cents: commissionAmount,
                  status: status,
                  stripe_transfer_id: transferId,
                  invoice_id: invoice.id
                });
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