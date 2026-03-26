'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Shield, Zap, Smartphone, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">MEU SMS</div>
        <div className="space-x-8 hidden md:flex text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
          <Link href="/login" className="hover:text-white transition-colors">Login</Link>
        </div>
        <Link 
          href="/register" 
          className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95"
        >
          Começar Grátis
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-6">
            Lançamento 2026 • 100% Digital
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Receba SMS de um número online <br /> de forma totalmente gratuita.
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Privacy first. Use nossos números virtuais para verificações, cadastros e recebimento de códigos sem expor seu número real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all group"
            >
              Criar minha conta <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#pricing" 
              className="w-full sm:w-auto border border-zinc-800 px-8 py-4 rounded-xl font-bold hover:bg-zinc-900 transition-all"
            >
              Ver Planos
            </a>
          </div>
        </motion.div>

        {/* Hero Image / Mockup Placeholder */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
          <img 
            src="/sms_platform_hero.webp" 
            alt="Dashboard do Meu SMS" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute bottom-10 left-10 right-10 z-20 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-zinc-300">Sistema Online em Tempo Real</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-black/50 backdrop-blur-lg rounded-xl border border-white/10">
                <p className="text-xs text-zinc-500 mb-1">Último SMS recebido</p>
                <p className="text-sm font-medium italic">"Seu código de verificação é 4829..."</p>
              </div>
              <div className="p-4 bg-black/50 backdrop-blur-lg rounded-xl border border-white/10">
                <p className="text-xs text-zinc-500 mb-1">Status do Número</p>
                <p className="text-sm font-medium text-green-400">Ativo e Pronto</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Planos Simples e Transparentes</h2>
          <p className="text-zinc-500 mb-16">Confira os limites e tokens para cada plano.</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-10 rounded-3xl border border-zinc-800 bg-zinc-950 text-left relative overflow-hidden group">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Plano Grátis</h3>
                <p className="text-zinc-500 text-sm">Ideal para testes rápidos</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">R$ 0</span>
                <span className="text-zinc-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 text-zinc-300">
                <li className="flex items-center gap-2"><Zap size={18} className="text-zinc-500" /> Até 10 SMS por conta</li>
                <li className="flex items-center gap-2"><Smartphone size={18} className="text-zinc-500" /> Números Compartilhados</li>
                <li className="flex items-center gap-2"><Shield size={18} className="text-zinc-500" /> Verificação via Webhook</li>
              </ul>
              <Link 
                href="/register" 
                className="block w-full text-center p-4 rounded-xl bg-zinc-900 font-bold hover:bg-zinc-800 transition-all border border-zinc-800"
              >
                Começar Agora
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-10 rounded-3xl border border-white bg-white text-black text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-black text-white px-4 py-1 text-xs font-bold rounded-bl-xl">POPULAR</div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Plano Pro</h3>
                <p className="text-zinc-500 text-sm italic">Para quem precisa de mais potência</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">R$ 49</span>
                <span className="text-zinc-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 text-zinc-700">
                <li className="flex items-center gap-2 font-medium underline underline-offset-4 decoration-black/10">SMS Ilimitados</li>
                <li className="flex items-center gap-2 font-medium">Números Privados</li>
                <li className="flex items-center gap-2 font-medium">Prioridade Máxima</li>
                <li className="flex items-center gap-2 font-medium">Suporte 24/7</li>
              </ul>
              <Link 
                href="/register" 
                className="block w-full text-center p-4 rounded-xl bg-black text-white font-bold hover:bg-zinc-900 transition-all"
              >
                Assinar Plano Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
        <p>© 2026 Meu SMS Grátis. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
