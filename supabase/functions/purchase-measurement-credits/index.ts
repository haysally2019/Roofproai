import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-11-20.acacia",
    });

    const { packageId, companyId } = await req.json();

    if (!packageId || !companyId) {
      throw new Error("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/measurement_credit_packages?id=eq.${packageId}`,
      {
        headers: {
          apikey: supabaseServiceKey!,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const packages = await supabaseResponse.json();
    const pkg = packages[0];

    if (!pkg) {
      throw new Error("Package not found");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: pkg.name,
              description: `${pkg.credits} measurement credits for DIY roof measurements`,
            },
            unit_amount: pkg.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?measurement_credits_purchased=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard?measurement_credits_cancelled=true`,
      metadata: {
        company_id: companyId,
        package_id: packageId,
        credits: pkg.credits.toString(),
        type: "measurement_credits",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});