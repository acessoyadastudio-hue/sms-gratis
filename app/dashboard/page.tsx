'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Smartphone, RefreshCw, MessageSquare, LogOut, CheckCircle2 } from 'lucide-react'

type Message = {
  id: string
  from_number: string
  text: string
  created_at: string
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
      fetchMessages()
    }

    checkUser()

    // Real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setMessages(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white text-black p-2 rounded-lg font-bold">MS</div>
          <h1 className="text-xl font-bold hidden md:block">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{profile?.full_name}</p>
            <p className="text-xs text-zinc-500 capitalize">{profile?.plan_type} Plan</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-4">Seu Número Atribuído</h2>
            <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-zinc-800 mb-4">
              <Smartphone className="text-white" />
              <span className="text-2xl font-mono font-bold">+1 (202) 555-0192</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed italic">
              Use este número para receber SMS de qualquer plataforma. As mensagens aparecerão ao lado instantaneamente.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-4">Limites de Uso</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>SMS Recebidos</span>
                  <span>{messages.length} / {profile?.plan_type === 'free' ? 10 : '∞'}</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${Math.min((messages.length / 10) * 100, 100)}%` }} 
                  />
                </div>
              </div>
              {profile?.plan_type === 'free' && (
                 <button className="w-full text-xs text-white underline hover:zinc-400">Upgrade para Ilimitado</button>
              )}
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare size={24} /> 
              Mensagens Recebidas
            </h2>
            <button 
              onClick={fetchMessages}
              disabled={loading}
              className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center animate-pulse">
                   <Smartphone className="text-zinc-600" size={32} />
                </div>
                <p className="text-zinc-400">Aguardando seu primeiro SMS...</p>
                <p className="text-xs text-zinc-600 max-w-xs">Nosso sistema verifica novas mensagens a cada segundo automaticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-6 hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                         <CheckCircle2 size={14} className="text-green-500" />
                         De: {msg.from_number}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-lg leading-relaxed font-mono selection:bg-white selection:text-black">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
