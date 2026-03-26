'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Smartphone, 
  RefreshCw, 
  MessageSquare, 
  LogOut, 
  CheckCircle2, 
  PlusCircle, 
  PlayCircle, 
  XCircle,
  Users,
  Camera,
  Mail,
  Send,
  Music,
  Heart,
  Wallet,
  Globe,
  RefreshCcw,
  Clock
} from 'lucide-react'
import { 
  requestNumber, 
  simulateSMS, 
  pollPublicMessages, 
  deactivateNumber,
  requestRealNumber,
  checkRealSMS,
  cancelRealActivation
} from '@/app/actions'
import ServiceCard from '@/components/ServiceCard'

type Message = {
  id: string
  remetente: string
  mensagem: string
  numero_destino: string
  recebido_em: string
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [assignedNumber, setAssignedNumber] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [activationId, setActivationId] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [status, setStatus] = useState<'IDLE' | 'PENDING' | 'RECEIVED' | 'EXPIRED'>('IDLE')
  const [smsCode, setSmsCode] = useState<string | null>(null)
  const router = useRouter()

  const services = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, price: '5,47' },
    { id: 'google', name: 'Google/Gmail', icon: Mail, price: '1,21' },
    { id: 'telegram', name: 'Telegram', icon: Send, price: '6,06' },
    { id: 'facebook', name: 'Facebook', icon: Users, price: '1,09' },
    { id: 'instagram', name: 'Instagram', icon: Camera, price: '0,42' },
    { id: 'tiktok', name: 'TikTok', icon: Music, price: '0,54' },
    { id: 'tinder', name: 'Tinder', icon: Heart, price: '3,91' },
    { id: 'other', name: 'Outros', icon: Globe, price: '0,87' },
  ]

  const [showRecharge, setShowRecharge] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      
      // Fetch profile (perfis)
      const { data: profile } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)

      // Fetch assigned number (numeros)
      const { data: numData } = await supabase
        .from('numeros')
        .select('numero')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .limit(1)
        .single()
      
      if (numData) setAssignedNumber(numData.numero)

      fetchMessages()
    }

    checkUser()

    // Real-time subscription for sms_recebidos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_recebidos',
        },
        (payload) => {
           setMessages((prev) => [payload.new as Message, ...prev])
        }
      )
      .subscribe()

    // TIMER para expiração
    const timerInterval = setInterval(() => {
      if (expiresAt) {
        const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setTimeLeft(diff)
      }
    }, 1000)

    // Polling PROFISSIONAL (5sim) ou Público
    const pollInterval = setInterval(async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Se temos uma ativação real da 5sim
      if (activationId && status !== 'RECEIVED') {
        const res = await checkRealSMS(currentUser.id, activationId)
        if (res.success && res.sms) {
          setSmsCode(res.code || res.sms)
          setStatus('RECEIVED')
          fetchMessages()
        } else if (res.error === 'Número banido ou cancelado.' || res.error === 'Expired') {
          setActivationId(null)
          setAssignedNumber(null)
          setStatus('IDLE')
        }
        return
      }

      // Fallback para polling público (se não for 5sim)
      const { data: currentNum } = await supabase
        .from('numeros')
        .select('numero')
        .eq('usuario_id', currentUser.id)
        .eq('ativo', true)
        .single()

      if (currentNum?.numero && currentNum.numero.startsWith('+')) {
         const { messages: newMessages } = await pollPublicMessages(currentUser.id, currentNum.numero)
         if (newMessages && newMessages.length > 0) {
            setMessages((prev) => {
               const existingMessages = prev.map(m => m.mensagem)
               const uniqueNew = newMessages.filter((m: any) => !existingMessages.includes(m.mensagem))
               if (uniqueNew.length > 0) {
                 fetchProfile(currentUser.id)
                 return [...uniqueNew, ...prev]
               }
               return prev
            })
         }
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      clearInterval(timerInterval)
    }
  }, [activationId, expiresAt])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('perfis').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sms_recebidos')
      .select('*')
      .order('recebido_em', { ascending: false })
    
    if (data) setMessages(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getCountryName = (num: string | null) => {
    if (!num) return ''
    if (num.startsWith('+55')) return 'Brasil 🇧🇷'
    if (num.startsWith('+1')) return 'USA/Canada 🇺🇸🇨🇦'
    if (num.startsWith('+44')) return 'Reino Unido 🇬🇧'
    if (num.startsWith('+49')) return 'Alemanha 🇩🇪'
    if (num.startsWith('+31')) return 'Holanda 🇳🇱'
    if (num.startsWith('+33')) return 'França 🇫🇷'
    if (num.startsWith('+45')) return 'Dinamarca 🇩🇰'
    if (num.startsWith('+34')) return 'Espanha 🇪🇸'
    return 'Internacional 🌍'
  }

  if (!user) return null

  const limitReached = profile?.plano === 'gratis' && (profile?.sms_usados || 0) >= 10

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header Profissional */}
      <header className="p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white text-black p-2 rounded-xl font-black text-xl shadow-lg shadow-white/10">MS</div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Painel de Ativação</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Premium Gateway</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Seu Saldo</span>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <Wallet size={14} className="text-emerald-500" />
                <span className="font-mono font-bold text-emerald-500 text-base">R$ 0,00</span>
              </div>
            </div>

            <button 
              onClick={() => setShowRecharge(true)}
              className="bg-white text-black text-xs font-black py-2.5 px-6 rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
            >
              RECARREGAR
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Coluna Esquerda: Controle de Ativação */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm shadow-2xl">
              <h2 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <PlusCircle size={16} /> Status da Operação
              </h2>

              {!assignedNumber ? (
                <div className="space-y-6">
                  <div className="bg-black/40 rounded-2xl p-5 border border-zinc-800/50">
                    <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                      Selecione um dos serviços ao lado para obter um número exclusivo.
                    </p>
                    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
                      <span className="text-xs font-black text-white uppercase tracking-wider">{selectedService || 'Aguardando seleção...'}</span>
                      {selectedService && <CheckCircle2 size={14} className="text-emerald-500" />}
                    </div>
                  </div>

                  <button 
                    disabled={!selectedService || limitReached}
                    onClick={async () => {
                      setLoading(true)
                      const res = await requestRealNumber(user.id, selectedService!)
                      setLoading(false)
                      
                      if (res.error) {
                        alert(res.error)
                      } else {
                        setAssignedNumber(res.numero!)
                        setActivationId(res.activationId!)
                        setExpiresAt(res.expiresAt!)
                        setStatus('PENDING')
                        setSmsCode(null)
                      }
                    }}
                    className="w-full bg-white text-black font-black p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all disabled:opacity-30 shadow-xl shadow-white/10 active:scale-95"
                  >
                    {loading ? <RefreshCcw className="animate-spin" /> : <Smartphone size={20} />} 
                    OBTER NÚMERO REAL
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-inner">
      <div className="bg-blue-600/20 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-300">Número Reservado (BR)</p>
            <p className="text-lg font-bold text-white tracking-widest">{assignedNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-400 uppercase font-bold">Expira em</p>
          <div className="flex items-center gap-1 text-blue-200 font-mono text-xl">
            <Clock className="w-4 h-4" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center space-y-4">
        {smsCode ? (
          <div className="animate-in zoom-in duration-500">
            <p className="text-sm text-green-400 font-bold uppercase mb-2">Mensagem Recebida!</p>
            <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
              <p className="text-3xl font-black text-white tracking-widest">{smsCode}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[10px] font-bold text-blue-400">SMS</p>
                </div>
              </div>
            </div>
            <p className="text-slate-300">Aguardando o código SMS chegar...</p>
            <p className="text-xs text-slate-500 italic">Isso pode levar de 30 segundos a 5 minutos.</p>
            
            <button
              onClick={async () => {
                if (activationId) {
                  const res = await cancelRealActivation(activationId)
                  if (res.success) {
                    setAssignedNumber(null)
                    setActivationId(null)
                    setStatus('IDLE')
                    fetchProfile(user.id)
                  }
                }
              }}
              className="text-red-400 hover:text-red-300 text-sm font-medium underline underline-offset-4"
            >
              Cancelar e Pedir Reembolso
            </button>
          </>
        )}
      </div>
                    
                    <div className="w-full space-y-3">
                      <button 
                        disabled={limitReached}
                        onClick={async () => {
                          const res = await simulateSMS(user.id, assignedNumber!)
                          if (res.error) alert(res.error)
                          else fetchProfile(user.id)
                        }}
                        className="w-full bg-zinc-800 text-white text-xs font-bold p-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-[0.98]"
                      >
                        <PlayCircle size={18} /> Simular Recebimento
                      </button>

                      <button 
                        onClick={async () => {
                          if (confirm('Deseja cancelar esta ativação? (O saldo será estornado se disponível)')) {
                            if (activationId) await cancelRealActivation(activationId)
                            await deactivateNumber(user.id)
                            setAssignedNumber(null)
                            setActivationId(null)
                            window.location.reload()
                          }
                        }}
                        className="w-full text-[11px] text-zinc-500 hover:text-red-400 transition-all py-2 font-bold uppercase tracking-widest"
                      >
                        × Cancelar e Estornar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quota Progress */}
            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Sessões Utilizadas</h3>
                 <span className="text-xs font-mono font-bold">{profile?.sms_usados || 0} / 10</span>
               </div>
               <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-zinc-800">
                 <div 
                   className="h-full bg-white transition-all duration-1000 ease-out" 
                   style={{ width: `${Math.min(((profile?.sms_usados || 0) / 10) * 100, 100)}%` }}
                 />
               </div>
               {limitReached && (
                 <p className="mt-3 text-[10px] text-red-500 font-black italic flex items-center gap-1">
                   <XCircle size={10} /> Limite do plano grátis atingido!
                 </p>
               )}
            </div>
          </div>

          {/* Coluna Direita: Grid de Serviços e Mensagens */}
          <div className="lg:col-span-8 space-y-10">
            
            {!assignedNumber && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                    <Globe size={24} className="text-zinc-700" /> Selecione o Serviço
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Preços Variáveis</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      id={service.id}
                      name={service.name}
                      icon={service.icon}
                      price={service.price}
                      onSelect={(id) => setSelectedService(id)}
                      disabled={limitReached}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de Mensagens */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                  <MessageSquare size={24} className="text-zinc-700" /> Inbox em Tempo Real
                </h2>
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Monitorando Rede</span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </div>

              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((sms, i) => (
                    <div 
                      key={sms.id} 
                      className={`group p-8 border rounded-[2rem] transition-all duration-700 relative overflow-hidden ${
                        i === 0 
                          ? 'bg-zinc-900 border-zinc-700 shadow-2xl scale-[1.01] animate-in slide-in-from-top-8' 
                          : 'bg-transparent border-zinc-900/50 opacity-40 hover:opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Remetente</span>
                          <span className="text-sm font-black text-white bg-white/5 py-1 px-3 rounded-lg border border-white/10 uppercase tracking-tighter">
                            {sms.remetente}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Horário</span>
                          <span className="text-xs font-mono text-zinc-400">
                            {new Date(sms.recebido_em).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-2xl font-black tracking-tight text-white leading-tight relative z-10 selection:bg-white selection:text-black">
                        {sms.mensagem}
                      </p>
                      
                      {/* Background decorative element for the latest message */}
                      {i === 0 && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] -z-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-80 border-4 border-dotted border-zinc-900 rounded-[3rem] flex flex-col items-center justify-center text-zinc-700 gap-6 grayscale opacity-50">
                    <div className="p-6 bg-zinc-950 rounded-full border border-zinc-900 shadow-inner">
                      <RefreshCcw size={48} className="animate-spin-slow" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black uppercase tracking-[0.2em] mb-1">Aguardando Conexão</p>
                      <p className="text-xs font-medium">Os SMS aparecerão aqui assim que forem detectados.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Modal de Recarga PIX */}
      {showRecharge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRecharge(false)} />
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-md w-full relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black mb-2 tracking-tight">Recarregar Saldo</h2>
            <p className="text-zinc-500 text-sm mb-8">Pague via PIX e o saldo entra na hora.</p>
            
            <div className="bg-white p-4 rounded-3xl mb-8 flex flex-col items-center">
              {/* Representação de um QR Code */}
              <div className="w-48 h-48 bg-zinc-200 rounded-xl mb-4 flex items-center justify-center border-4 border-white">
                <div className="grid grid-cols-4 gap-2 opacity-20">
                  {[...Array(16)].map((_, i) => <div key={i} className="w-8 h-8 bg-black rounded" />)}
                </div>
              </div>
              <p className="text-black font-mono text-[10px] font-bold text-center break-all opacity-50">
                00020126360014br.gov.bcb.pix0114+5511999999995204000053039865802BR5913Yada Studio...
              </p>
            </div>

            <div className="space-y-3">
              <button className="w-full bg-white text-black font-black p-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-95">
                COPIAR CÓDIGO PIX
              </button>
              <button 
                onClick={() => setShowRecharge(false)}
                className="w-full text-zinc-500 hover:text-white transition-all py-2 text-xs font-bold uppercase tracking-widest"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
