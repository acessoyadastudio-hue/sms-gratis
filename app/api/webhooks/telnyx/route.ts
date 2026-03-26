import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for backend updates
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Telnyx Webhook received:', JSON.stringify(body, null, 2))

    // Telnyx DLR/Inbound SMS format
    const eventType = body.data?.event_type
    const payload = body.data?.payload

    if (eventType === 'message.received') {
      const from = payload.from.phone_number
      const to = payload.to[0].phone_number
      const text = payload.text

      // 1. Find the user assigned to this number
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, sms_count, plan_type')
        .eq('assigned_number', to)
        .single()

      if (profileError || !profile) {
        console.error('No user found for number:', to)
        // If no specific user, maybe it's a shared number or we log it globally
        // For this project, we'll store it but without a user_id if not found
      }

      // 2. Check limits for free plan
      if (profile && profile.plan_type === 'free' && profile.sms_count >= 10) {
        console.log('User limit reached for:', profile.id)
        return NextResponse.json({ status: 'limit_reached' })
      }

      // 3. Store the message
      const { error: insertError } = await supabaseAdmin
        .from('messages')
        .insert([
          {
            user_id: profile?.id || null,
            from_number: from,
            to_number: to,
            text: text,
          }
        ])

      if (insertError) {
        console.error('Error inserting message:', insertError)
        return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
      }

      // 4. Update user SMS count
      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({ sms_count: (profile.sms_count || 0) + 1 })
          .eq('id', profile.id)
      }

      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
