import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Telnyx Webhook received:', JSON.stringify(body, null, 2))

    const eventType = body.data?.event_type
    const payload = body.data?.payload

    if (eventType === 'message.received') {
      const from = payload.from.phone_number
      const to = payload.to[0].phone_number
      const text = payload.text

      // 1. Find the user assigned to this number (in 'numeros' table)
      const { data: numData, error: numError } = await supabaseAdmin
        .from('numeros')
        .select('usuario_id')
        .eq('numero', to)
        .eq('ativo', true)
        .single()

      let userId = numData?.usuario_id || null

      // 2. Fetch profile limits (perfis)
      if (userId) {
        const { data: profile } = await supabaseAdmin
          .from('perfis')
          .select('id, sms_usados, plano')
          .eq('id', userId)
          .single()

        if (profile && profile.plano === 'gratis' && profile.sms_usados >= 10) {
          console.log('User limit reached for:', userId)
          return NextResponse.json({ status: 'limit_reached' })
        }
      }

      // 3. Store the message (sms_recebidos)
      const { error: insertError } = await supabaseAdmin
        .from('sms_recebidos')
        .insert([
          {
            usuario_id: userId,
            remetente: from,
            numero_destino: to,
            mensagem: text,
          }
        ])

      if (insertError) {
        console.error('Error inserting message:', insertError)
        return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
      }

      // 4. Update user SMS count
      if (userId) {
        // Increment 'sms_usados' in 'perfis'
        const { data: p } = await supabaseAdmin
            .from('perfis')
            .select('sms_usados')
            .eq('id', userId)
            .single()
        
        await supabaseAdmin
          .from('perfis')
          .update({ sms_usados: (p?.sms_usados || 0) + 1 })
          .eq('id', userId)
      }

      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
