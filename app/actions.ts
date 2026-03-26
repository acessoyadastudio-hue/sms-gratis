'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requestNumber(userId: string, phoneNumber?: string) {
  try {
    let finalNumber = phoneNumber
    
    // If no number provided, fetch a public one from a free service
    if (!finalNumber) {
      try {
        // Example: Fetching from a public list (simulated call to a free public provider)
        // In a real scenario, we'd fetch from https://receive-smss.com/ or similar API
        const publicNumbers = ['+12015550123', '+447700900123', '+16135550199', '+33644600123']
        finalNumber = publicNumbers[Math.floor(Math.random() * publicNumbers.length)]
      } catch (e) {
        return { error: 'Falha ao buscar número público gratuito.' }
      }
    }

    // Check if taken
    const { data: taken } = await supabaseAdmin
      .from('numeros')
      .select('usuario_id')
      .eq('numero', finalNumber)
      .eq('ativo', true)
      .single()

    if (taken && taken.usuario_id !== userId) {
      return { error: 'Este número já está em uso.' }
    }

    const { error: insertError } = await supabaseAdmin
      .from('numeros')
      .upsert([
        {
          usuario_id: userId,
          numero: finalNumber,
          ativo: true
        }
      ])

    if (insertError) throw insertError

    return { success: true, numero: finalNumber }
  } catch (err) {
    return { error: 'Erro ao ativar número.' }
  }
}

// Function to "poll" for messages from the public service
export async function pollPublicMessages(userId: string, phoneNumber: string) {
  // This would normally fetch from the public provider's HTML/API
  // For the demo, we'll auto-generate a message if it's a test
  return { messages: [] } 
}
export async function simulateSMS(userId: string, targetNumber: string) {
  try {
    const { error: insertError } = await supabaseAdmin
      .from('sms_recebidos')
      .insert([
        {
          usuario_id: userId,
          remetente: '+1' + Math.floor(Math.random() * 9000000000 + 1000000000),
          numero_destino: targetNumber,
          mensagem: `Simulação de Código: ${Math.floor(Math.random() * 900000 + 100000)}`,
        }
      ])

    if (insertError) throw insertError

    // Also increment counter
    const { data: p } = await supabaseAdmin
      .from('perfis')
      .select('sms_usados')
      .eq('id', userId)
      .single()

    await supabaseAdmin
      .from('perfis')
      .update({ sms_usados: (p?.sms_usados || 0) + 1 })
      .eq('id', userId)

    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: 'Falha na simulação.' }
  }
}
