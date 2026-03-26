'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

const SIM5_TOKEN = process.env.SIM5_API_KEY || ''

export async function requestNumber(userId: string, phoneNumber?: string) {
  try {
    // Check limits before everything
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('sms_usados, plano')
      .eq('id', userId)
      .single()

    if (profile && profile.plano === 'gratis' && profile.sms_usados >= 10) {
      return { error: 'Limite de 10 SMS atingido. Faça upgrade para continuar.' }
    }

    let finalNumber = phoneNumber
    
    // If no number provided, fetch a public one from a free service
    if (!finalNumber) {
      try {
        // Example: Fetching from a public list (simulated call to a free public provider)
        // In a real scenario, we'd fetch from https://receive-smss.com/ or similar API
        // Expanded list with fresh numbers from multiple sources
        const publicNumbers = [
          // Source: Just Added / Active Seconds Ago (Highest Success Chance)
          '+12812166971', // USA (Active 34s ago)
          '+447598328056', // UK (Active 37s ago)
          '+447367524129', // UK (Active 5m ago)
          '+559551583801', // Brasil (Active 24m ago)
          // Other fresh ones
          '+16467041416', '+447392005004', '+33644633215', '+4915219430219',
          '+420722213451', '+48732151234', '+46765091211', '+351912341234'
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
    // Check limits
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('sms_usados, plano')
      .eq('id', userId)
      .single()

    if (profile && profile.plano === 'gratis' && profile.sms_usados >= 10) {
      return { messages: [] }
    }

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
            
            // Increment the counter for each new message
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
    // Check limits
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('sms_usados, plano')
      .eq('id', userId)
      .single()

    if (profile && profile.plano === 'gratis' && profile.sms_usados >= 10) {
      return { error: 'Limite de 10 SMS atingido no plano grátis.' }
    }

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

// --- 5SIM PROFESSIONAL API ---

export async function requestRealNumber(userId: string, service: string, operator: string = 'any') {
  try {
    const SIM5_TOKEN = process.env.SIM5_API_KEY
    if (!SIM5_TOKEN) {
      return { error: 'SIM5_API_KEY não configurada no servidor.' }
    }

    // Default to Brazil
    const country = 'brazil'
    const url = `https://5sim.net/v1/user/buy/activation/${country}/${operator}/${service}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SIM5_TOKEN}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const err = await response.text()
      return { error: `Erro 5sim: ${err || response.statusText}` }
    }

    const data = await response.json()
    // 5sim returns { id, phone, product, price, ... }

    // Store in DB
    const { error: dbError } = await supabaseAdmin
      .from('numeros')
      .upsert({
        usuario_id: userId,
        numero: data.phone,
        ativo: true,
      })

    return { 
      success: true, 
      numero: data.phone, 
      activationId: data.id,
      operator: data.operator, // Add operator name
      expiresAt: data.expires || new Date(Date.now() + 15 * 60 * 1000).toISOString() 
    }
  } catch (err) {
    console.error(err)
    return { error: 'Falha ao conectar com 5sim.' }
  }
}

export async function checkRealSMS(userId: string, id: number): Promise<{ 
  success: boolean; 
  sms?: string | null; 
  code?: string | null; 
  error?: string;
  status?: string;
}> {
  try {
    const SIM5_TOKEN = process.env.SIM5_API_KEY
    if (!SIM5_TOKEN) {
      return { success: false, error: 'SIM5_API_KEY não configurada no servidor.' }
    }

    const response = await fetch(`https://5sim.net/v1/user/check/${id}`, {
      headers: {
        'Authorization': `Bearer ${SIM5_TOKEN}`,
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
       return { success: false, error: 'Unauthorized or not found' }
    }

    const data = await response.json()
    
    // 5sim status can be PENDING, RECEIVED, FINISHED, BANNED, CANCELED
    const hasSms = data.sms && data.sms.length > 0
    
    if (hasSms) {
      const sms = data.sms[data.sms.length - 1] // Get latest SMS
      
      // Save to DB
      await supabaseAdmin.from('sms_recebidos').insert({
        usuario_id: userId,
        remetente: sms.sender || '5sim',
        numero_destino: data.phone,
        mensagem: sms.text
      })

      // Increment profile counter
      const { data: p } = await supabaseAdmin.from('perfis').select('sms_usados').eq('id', userId).single()
      await supabaseAdmin.from('perfis').update({ sms_usados: (p?.sms_usados || 0) + 1 }).eq('id', userId)

      // Finish activation on 5sim to confirm
      await fetch(`https://5sim.net/v1/user/finish/${id}`, {
        headers: { 'Authorization': `Bearer ${SIM5_TOKEN}` }
      })

      return { success: true, sms: sms.text, code: sms.code || sms.text, status: data.status }
    }

    if (data.status === 'FINISHED') {
      return { success: false, error: 'Expired' }
    }

    if (data.status === 'BANNED' || data.status === 'CANCELED') {
      return { success: false, error: 'Número banido ou cancelado.' }
    }

    return { success: true, sms: null, status: data.status }
  } catch (err) {
    console.error(err)
    return { success: false, error: 'Falha no polling da 5sim.' }
  }
}

export async function cancelRealActivation(id: number) {
  try {
    const SIM5_TOKEN = process.env.SIM5_API_KEY
    if (!SIM5_TOKEN) return { success: false, error: 'Token ausente.' }

    const url = `https://5sim.net/v1/user/cancel/${id}`
    await fetch(url, {
      headers: { 'Authorization': `Bearer ${SIM5_TOKEN}` }
    })
    return { success: true }
  } catch (err) {
    console.error(err)
    return { success: false, error: 'Erro ao cancelar.' }
  }
}
