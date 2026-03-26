'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requestNumber(userId: string, phoneNumber: string) {
  try {
    if (!phoneNumber) return { error: 'Por favor, insira um número válido.' }
    
    // 1. Check if number is already in use by someone else
    const { data: taken } = await supabaseAdmin
      .from('numeros')
      .select('usuario_id')
      .eq('numero', phoneNumber)
      .eq('ativo', true)
      .single()

    if (taken) {
      return { error: 'Este número já está sendo usado por outra conta.' }
    }

    // 2. Here we would normally call Telnyx API to buy/allocate a number.
    // For now, to let the user test, we will assign a "System Number" 
    // that the user should configure in their Telnyx Messaging Profile.
    
    // NOTE: In a production SaaS, you'd use: 
    // telnyx.numberOrders.create({ phone_number: '...', messaging_profile_id: '...' })
    
    const { error: insertError } = await supabaseAdmin
      .from('numeros')
      .insert([
        {
          usuario_id: userId,
          numero: phoneNumber,
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
