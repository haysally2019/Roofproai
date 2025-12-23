import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  appInfo: { name: "Rafter AI", version: "1.0.0" },
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { repUserId } = await req.json();

    if (!repUserId) {
      return new Response(
        JSON.stringify({ error: "repUserId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: pendingCommissions, error: commissionsError } = await supabase
      .from("commissions")
      .select("*")
      .eq("rep_user_id", repUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (commissionsError) {
      throw new Error(`Failed to fetch commissions: ${commissionsError.message}`);
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending commissions to process" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalAmountCents = pendingCommissions.reduce(
      (sum, comm) => sum + comm.amount_cents,
      0
    );

    const { data: repData, error: repError } = await supabase
      .from("users")
      .select("stripe_connect_account_id")
      .eq("id", repUserId)
      .maybeSingle();

    if (repError) {
      throw new Error(`Failed to fetch rep data: ${repError.message}`);
    }

    let transferId = null;

    if (repData?.stripe_connect_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: totalAmountCents,
          currency: "usd",
          destination: repData.stripe_connect_account_id,
          description: `Commission payout for ${pendingCommissions.length} transactions`,
        });
        transferId = transfer.id;
      } catch (stripeError: any) {
        console.error("Stripe transfer failed:", stripeError);
        return new Response(
          JSON.stringify({
            error: "Failed to process payout",
            details: stripeError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const commissionIds = pendingCommissions.map((c) => c.id);
    const { error: updateError } = await supabase
      .from("commissions")
      .update({
        status: transferId ? "paid" : "processing",
        stripe_transfer_id: transferId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", commissionIds);

    if (updateError) {
      throw new Error(`Failed to update commissions: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingCommissions.length} commissions`,
        totalAmount: totalAmountCents / 100,
        transferId,
        status: transferId ? "paid" : "processing",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});