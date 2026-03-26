'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

export async function requestNumber(userId: string, phoneNumber?: string) {
  try {
    let finalNumber = phoneNumber
    
    // If no number provided, fetch a public one from a free service
    if (!finalNumber) {
      try {
        // Example: Fetching from a public list (simulated call to a free public provider)
        // In a real scenario, we'd fetch from https://receive-smss.com/ or similar API
        const publicNumbers = [
          '+559551583801', // Brazil
          '+13802603245',  // USA
          '+13473929868',  // USA
          '+12812166971',  // USA
          '+447538299689', // UK
          '+447931082241', // UK
          '+4915210947617',// Germany
          '+31651889518'   // Netherlands
        ]
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
    
    // New structure uses <div class="row message_details">
    // Let's use a more robust split-and-match approach
    const messageBlocks = html.split('<div class="row message_details">').slice(1)
    
    const messages = []
    for (const block of messageBlocks) {
      const senderMatch = block.match(/<a[^>]*class="sender_core_link"[^>]*>([\s\S]*?)<\/a>/) || 
                          block.match(/<div[^>]*class="col-md-2[^>]*>([\s\S]*?)<\/div>/)
      
      const contentMatch = block.match(/<div[^>]*class="col-md-8[^>]*>([\s\S]*?)<\/div>/)
      
      if (senderMatch && contentMatch) {
        let sender = senderMatch[1].replace(/<[^>]*>?/gm, '').trim()
        let content = contentMatch[1].replace(/<[^>]*>?/gm, '').trim()
        
        // Clean up "Message" label if present
        content = content.replace(/^Message/i, '').trim()
        sender = sender.replace(/^Sender/i, '').trim()

        if (content && sender) {
          messages.push({
            id: Math.random().toString(36).substr(2, 9),
            remetente: sender,
            mensagem: content,
            numero_destino: phoneNumber,
            recebido_em: new Date().toISOString()
          })
        }
      }
      if (messages.length >= 8) break
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

export async function deactivateNumber(userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('numeros')
      .update({ ativo: false })
      .eq('usuario_id', userId)
      .eq('ativo', true)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: 'Falha ao desativar número.' }
  }
}
