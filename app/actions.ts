'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requestNumber(userId: string) {
  try {
    // 1. Check if user already has an active number
    const { data: existing } = await supabaseAdmin
      .from('numeros')
      .select('numero')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .single()

    if (existing) {
      return { error: 'Você já possui um número ativo.' }
    }

    // 2. Here we would normally call Telnyx API to buy/allocate a number.
    // For now, to let the user test, we will assign a "System Number" 
    // that the user should configure in their Telnyx Messaging Profile.
    
    // NOTE: In a production SaaS, you'd use: 
    // telnyx.numberOrders.create({ phone_number: '...', messaging_profile_id: '...' })
    
    const testNumber = '+12025550192' // Example. User should change this to their real Telnyx number.

    const { error: insertError } = await supabaseAdmin
      .from('numeros')
      .insert([
        {
          usuario_id: userId,
          numero: testNumber,
          ativo: true
        }
      ])

    if (insertError) {
       console.error('Error inserting number:', insertError)
       return { error: 'Erro ao salvar número no banco de dados.' }
    }

    return { success: true, numero: testNumber }
  } catch (err) {
    return { error: 'Erro interno ao processar solicitação.' }
  }
}
