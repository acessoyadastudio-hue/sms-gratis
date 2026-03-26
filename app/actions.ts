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

// Function to "poll" for messages from a public service (Scraper)
export async function pollPublicMessages(userId: string, phoneNumber: string) {
  try {
    // We remove the '+' and use the clean number for the URL
    const cleanNumber = phoneNumber.replace('+', '')
    
    // Using a public provider like receive-smss.com
    const url = `https://receive-smss.com/sms/${cleanNumber}/`
    
    const response = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) return { messages: [] }

    const html = await response.text()
    
    // Simple regex to extract messages from the table 
    // This is a basic implementation and might need adjustment if the site changes
    const msgRegex = /<td data-header="Message">([\s\S]*?)<\/td>/g
    const timeRegex = /<td data-header="Time">([\s\S]*?)<\/td>/g
    const fromRegex = /<td data-header="From">([\s\S]*?)<\/td>/g
    
    const messages = []
    let match
    while ((match = msgRegex.exec(html)) !== null) {
       const content = match[1].trim().replace(/<[^>]*>?/gm, '')
       const fromMatch = fromRegex.exec(html)
       const timeMatch = timeRegex.exec(html)
       
       if (content && fromMatch) {
          messages.push({
             id: Math.random().toString(36).substr(2, 9),
             remetente: fromMatch[1].trim().replace(/<[^>]*>?/gm, ''),
             mensagem: content,
             numero_destino: phoneNumber,
             recebido_em: new Date().toISOString() // We use current time as we don't parse their relative time perfectly
          })
       }
       if (messages.length >= 5) break // Only latest 5
    }

    // Save to DB to keep history and trigger Realtime
    if (messages.length > 0) {
       for (const msg of messages) {
          // Check if already exists in our DB to avoid duplicates
          const { data: exists } = await supabaseAdmin
            .from('sms_recebidos')
            .select('id')
            .eq('usuario_id', userId)
            .eq('mensagem', msg.mensagem)
            .limit(1)
            .single()

          if (!exists) {
            await supabaseAdmin.from('sms_recebidos').insert({
              usuario_id: userId,
              remetente: msg.remetente,
              numero_destino: msg.numero_destino,
              mensagem: msg.mensagem
            })
          }
       }
    }

    return { messages } 
  } catch (err) {
    console.error('Polling error:', err)
    return { messages: [] }
  }
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
