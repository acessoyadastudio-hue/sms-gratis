# Meu SMS Grátis 🚀

Plataforma premium para recebimento de SMS online de forma totalmente gratuita e instantânea.

## 🛠️ Tecnologias
- **Frontend**: Next.js 16 (App Router), Tailwind CSS, Framer Motion.
- **Database/Auth**: Supabase.
- **SMS Infrastructure**: Telnyx.

## 🚀 Como Funciona
1. **Cadastro**: Nome e e-mail apenas.
2. **Dashboard**: Acesse seu número virtual exclusivo.
3. **Recebimento**: As mensagens aparecem em tempo real via Supabase Realtime.
4. **Limites**: Plano Free limitado a 10 mensagens.

## ⚙️ Configuração Telnyx
Para receber os SMS no projeto, siga estes passos no [Portal Telnyx](https://portal.telnyx.com):
1. No menu lateral, vá em **Messaging** -> **Messaging Profiles**.
2. Crie um novo perfil ou edite um existente.
3. Em **Inbound Settings**, selecione **V3** como API Version.
4. No campo **Webhook URL**, insira o domínio da sua Vercel seguido de: `/api/webhooks/telnyx`
   - Exemplo: `https://meu-sms-gratis.vercel.app/api/webhooks/telnyx`
5. Atribua um número a este perfil na seção **Numbers**.

## 🛡️ Variáveis de Ambiente (Vercel)
Certifique-se de que estas variáveis estão configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Necessária para o webhook atualizar os perfis)

## 📦 Desenvolvimento Local
```bash
npm install
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000)
