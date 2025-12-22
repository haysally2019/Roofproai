import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Setup Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get Request Data
    const { email, name, role, companyId, avatarInitials } = await req.json()
    
    // Fix for broken links: Ensure it points to your actual site
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // 3. Generate Invite Link (Does NOT send email automatically)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { name, role, company_id: companyId },
        redirectTo: `${origin}/dashboard` // <--- Redirects user to dashboard after clicking
      }
    })

    if (linkError) throw linkError

    // 4. Create Public Profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: linkData.user.id,
        email,
        name,
        role,
        company_id: companyId,
        avatar_initials: avatarInitials
      })
      .select()
      .maybeSingle()

    if (profileError && !profileError.message.includes('duplicate')) {
        throw profileError
    }

    // 5. Send Branded Email via Resend
    const emailResponse = await resend.emails.send({
      from: 'Rafter AI <onboarding@resend.dev>', // Update to your verified domain
      to: email,
      subject: `Join ${name}'s Team on Rafter AI`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e293b; text-align: center; margin-bottom: 24px;">Welcome to Rafter AI</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">You have been invited to join the workspace as a <strong>${role}</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkData.properties.action_link}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Accept Invitation</a>
          </div>
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 32px;">Link expires in 24 hours. If you didn't expect this, please ignore this email.</p>
        </div>
      `
    })

    if (emailResponse.error) throw new Error("Failed to send email via Resend");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})