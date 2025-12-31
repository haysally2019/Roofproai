import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.json();
    console.log("Received form data:", JSON.stringify(formData));

    // Support both snake_case and camelCase field names
    const firstName = formData.first_name || formData.firstName || formData.name?.split(' ')[0] || '';
    const lastName = formData.last_name || formData.lastName || formData.name?.split(' ')[1] || '';
    const email = formData.email || '';
    const phone = formData.phone || formData.phoneNumber || '';
    const location = formData.location || formData.city || formData.state || null;
    const experience = formData.experience || formData.yearsExperience || formData.background || null;
    const linkedin = formData.linkedin || formData.linkedIn || formData.linkedin_url || null;
    const resume = formData.resume || formData.resumeUrl || formData.resume_url || null;
    const coverLetter = formData.cover_letter || formData.coverLetter || formData.message || null;

    // Validate required fields
    if (!firstName || firstName.trim() === '') {
      console.error("Missing first_name");
      return new Response(
        JSON.stringify({ error: "Missing required field: first_name (or firstName)", received: Object.keys(formData) }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!lastName || lastName.trim() === '') {
      console.error("Missing last_name");
      return new Response(
        JSON.stringify({ error: "Missing required field: last_name (or lastName)", received: Object.keys(formData) }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!email || email.trim() === '') {
      console.error("Missing email");
      return new Response(
        JSON.stringify({ error: "Missing required field: email", received: Object.keys(formData) }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!phone || phone.trim() === '') {
      console.error("Missing phone");
      return new Response(
        JSON.stringify({ error: "Missing required field: phone (or phoneNumber)", received: Object.keys(formData) }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert into database
    console.log("Inserting into database...");
    const { data, error } = await supabase
      .from("sales_rep_applicants")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: location,
        experience: experience,
        linkedin: linkedin,
        resume: resume,
        cover_letter: coverLetter,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Application submitted successfully:", data.id);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Application submitted successfully",
        id: data.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});