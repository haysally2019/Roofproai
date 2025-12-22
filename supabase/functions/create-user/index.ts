import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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
    // Check for Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: Auth session missing!");
    }

    // Extract JWT token from Bearer header
    const jwt = authHeader.replace('Bearer ', '');

    // Setup Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate Caller using the JWT directly
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !caller) {
      throw new Error("Unauthorized: " + (authError?.message || "No user found"));
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, company_id")
      .eq("id", caller.id)
      .single();

    if (profileError) {
      throw new Error("Failed to load user profile: " + profileError.message);
    }

    // Parse Request
    const { email, name, role, companyId, avatarInitials } = await req.json();

    if (!email || !name || !role) {
      throw new Error("Missing required fields: email, name, or role");
    }

    // Permission Check
    const isSuperAdmin = callerProfile?.role === "Super Admin";
    const isCompanyAdmin = ["Company Owner", "Company Admin", "Admin"].includes(callerProfile?.role || "");
    const isTargetingOwnCompany = companyId === callerProfile?.company_id;

    if (!isSuperAdmin) {
      if (!isCompanyAdmin || !isTargetingOwnCompany) {
        throw new Error("Permission denied: You can only invite users to your own company.");
      }
    }

    // Generate Link & Create User
    const origin = req.headers.get("origin") || "https://rafterai.online";
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        data: { name, role, company_id: companyId },
        redirectTo: `${origin}/set-password`
      }
    });

    if (linkError) {
      throw new Error("Failed to generate invite link: " + linkError.message);
    }

    // Create Profile Record
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: linkData.user.id,
        email,
        name,
        role,
        company_id: companyId,
        avatar_initials: avatarInitials
      });

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error("Profile creation error:", insertError);
      throw new Error("Failed to create user profile: " + insertError.message);
    }

    // Try to send email via Resend
    let emailSent = false;
    let emailError = null;
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResponse = await resend.emails.send({
          from: "Rafter AI <hayden@rafterai.online>",
          to: email,
          subject: "You have been invited to join Rafter AI",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #1e293b; text-align: center;">Welcome to Rafter AI</h2>
              <p style="color: #475569; font-size: 16px;">Hello ${name},</p>
              <p style="color: #475569; font-size: 16px;">You have been invited to join <strong>${isSuperAdmin ? "the team" : "our workspace"}</strong> as a <strong>${role}</strong>.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${linkData.properties.action_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't expect this, you can ignore this email.</p>
            </div>
          `
        });

        if (emailResponse.error) {
          console.error("Resend Error:", emailResponse.error);
          emailError = JSON.stringify(emailResponse.error);
        } else if (emailResponse.data) {
          emailSent = true;
        } else {
          emailError = "No data or error in response";
        }
      } catch (error: any) {
        console.error("Email sending exception:", error);
        emailError = error.message || error.toString();
      }
    } else {
      console.error("RESEND_API_KEY environment variable not found");
      emailError = "RESEND_API_KEY not configured";
    }

    // Return success with invite link (even if email failed)
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: linkData.user,
        inviteLink: linkData.properties.action_link,
        emailSent,
        emailError
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }, 
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }, 
        status: 400 
      }
    );
  }
});