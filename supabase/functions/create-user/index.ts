import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Verify Caller
    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) throw new Error('Unauthorized')

    // 2. Check Permissions (Allow Super Admin OR Company Admin/Owner)
    const { data: callerProfile } = await supabaseClient
      .from('users')
      .select('role, company_id')
      .eq('id', caller.id)
      .single()

    const { email, name, role, companyId, avatarInitials } = await req.json()

    // Authorization Check
    const isSuperAdmin = callerProfile?.role === 'Super Admin';
    const isCompanyAdmin = ['Company Owner', 'Admin', 'Company Admin'].includes(callerProfile?.role || '');
    const isTargetingOwnCompany = companyId === callerProfile?.company_id;

    if (!isSuperAdmin && (!isCompanyAdmin || !isTargetingOwnCompany)) {
       throw new Error('Permission denied: You can only invite users to your own company.')
    }

    // 3. Init Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Invite User (Triggers Supabase Email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, role, company_id: companyId } // Metadata for hooks if needed
    })

    if (authError) throw authError

    // 5. Create Public Profile immediately (so they appear in lists)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        company_id: companyId,
        avatar_initials: avatarInitials
      })

    if (profileError) {
        // If profile exists (duplicate invite), ignore error, otherwise throw
        if (!profileError.message.includes('duplicate key')) {
             throw profileError;
        }
    }

    return new Response(
      JSON.stringify({ user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})