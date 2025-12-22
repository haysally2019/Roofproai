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
    // 1. Setup Supabase Clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Authenticate Caller
    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) throw new Error('Unauthorized')

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('id', caller.id)
      .single()

    // 3. Parse Request
    const { email, name, role, companyId, avatarInitials } = await req.json()

    // 4. Permission Check (CRITICAL FIX)
    const isSuperAdmin = callerProfile?.role === 'Super Admin';
    const isCompanyAdmin = ['Company Owner', 'Company Admin', 'Admin'].includes(callerProfile?.role || '');
    const isTargetingOwnCompany = companyId === callerProfile?.company_id;

    if (!isSuperAdmin) {
        if (!isCompanyAdmin || !isTargetingOwnCompany) {
            throw new Error('Permission denied: You can only invite users to your own company.')
        }
    }

    // 5. Generate Link & Create User
    const origin = req.headers.get('origin') || 'https://your-app-url.com'; 
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { name, role, company_id: companyId },
        redirectTo: `${origin}/dashboard` // <--- FIX: Ensures link goes to your app
      }
    })

    if (linkError) throw linkError

    // 6. Create Profile Record
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

    if (profileError && !profileError.message.includes('duplicate')) throw profileError

    // 7. Send Email via Resend
    const emailResponse = await resend.emails.send({
      from: 'Rafter AI <onboarding@resend.dev>', // Update this if you have a custom domain
      to: email,
      subject: `You have been invited to join Rafter AI`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; text-align: center;">Welcome to Rafter AI</h2>
          <p style="color: #475569; font-size: 16px;">Hello ${name},</p>
          <p style="color: #475569; font-size: 16px;">You have been invited to join <strong>${isSuperAdmin ? 'the team' : 'our workspace'}</strong> as a <strong>${role}</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkData.properties.action_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't expect this, you can ignore this email.</p>
        </div>
      `
    })

    if (emailResponse.error) {
        console.error('Resend Error:', emailResponse.error);
        throw new Error('Failed to send email. Check API Key.');
    }

    return new Response(
      JSON.stringify({ success: true, user: linkData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})