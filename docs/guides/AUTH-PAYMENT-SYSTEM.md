# Sistema de Autenticação e Pagamentos - OnnPlay Studio

## 📋 Visão Geral

Sistema completo de autenticação e monetização implementado no OnnPlay Studio, permitindo 3 níveis de planos (Free, Pro, Enterprise) com integração Stripe para pagamentos.

## 🏗️ Arquitetura

### Backend (Node.js + Express)

#### Serviços Criados

1. **AuthService** (`server/services/AuthService.ts`)
   - Registro de usuários (email/password)
   - Login com JWT
   - OAuth (Google, GitHub) - estrutura pronta
   - Gerenciamento de perfil
   - Troca de senha
   - Exclusão de conta

2. **StripeService** (`server/services/StripeService.ts`)
   - Criação de clientes Stripe
   - Checkout sessions para assinaturas
   - Customer portal para gerenciar assinaturas
   - Webhooks para eventos Stripe
   - Cancelamento/reativação de assinaturas

#### Rotas de API

1. **Auth Routes** (`server/routes/auth.ts`)
   - `POST /api/auth/register` - Criar conta
   - `POST /api/auth/login` - Login
   - `POST /api/auth/oauth/google` - OAuth Google
   - `POST /api/auth/oauth/github` - OAuth GitHub
   - `GET /api/auth/me` - Usuário atual (protegida)
   - `PUT /api/auth/profile` - Atualizar perfil (protegida)
   - `POST /api/auth/change-password` - Trocar senha (protegida)
   - `DELETE /api/auth/account` - Excluir conta (protegida)
   - `POST /api/auth/logout` - Logout

2. **Payment Routes** (`server/routes/payments.ts`)
   - `GET /api/payments/plans` - Listar planos
   - `POST /api/payments/create-checkout` - Criar checkout Stripe (protegida)
   - `POST /api/payments/create-portal` - Abrir portal Stripe (protegida)
   - `POST /api/payments/webhook` - Webhooks Stripe
   - `GET /api/payments/subscription` - Assinatura atual (protegida)
   - `POST /api/payments/cancel` - Cancelar assinatura (protegida)
   - `POST /api/payments/reactivate` - Reativar assinatura (protegida)

#### Banco de Dados

Schema SQL (`server/db/schema.sql`) com 8 tabelas:
- `users` - Dados dos usuários
- `subscriptions` - Assinaturas ativas
- `usage` - Uso mensal (minutos de streaming, gravação, comandos AI)
- `broadcasts` - Histórico de transmissões
- `recordings` - Gravações locais
- `webhook_events` - Log de eventos Stripe
- `api_keys` - Chaves de API (futuro)

**Modo de Desenvolvimento**: Banco in-memory para facilitar testes
**Modo de Produção**: MySQL/PostgreSQL

#### Middleware

**authMiddleware** (`server/middleware/auth.ts`)
- Verifica JWT token
- Anexa userId, email e plan ao request
- Middleware de verificação de plano (`requirePlan`)

### Frontend (React + TypeScript)

#### Contextos

**AuthContext** (`client/src/contexts/AuthContext.tsx`)
- Gerenciamento de estado de autenticação
- Login, registro, logout
- Atualização de usuário
- Persistência de token no localStorage
- Helper para headers autenticados

#### Páginas Criadas

1. **LoginNew** (`client/src/pages/LoginNew.tsx`)
   - Design profissional dark theme
   - Toggle entre Login/Registro
   - Validação de formulários
   - Botões OAuth (estrutura pronta)
   - Link para pricing

2. **Pricing** (`client/src/pages/Pricing.tsx`)
   - 3 planos (Free, Pro, Enterprise)
   - Comparação detalhada de recursos
   - Tabela de features
   - FAQ section
   - Integração com Stripe Checkout
   - Redirecionamento para login se não autenticado

3. **Dashboard** (`client/src/pages/Dashboard.tsx`)
   - Perfil do usuário
   - Plano atual com status
   - Uso mensal (streaming, gravação, AI commands)
   - Atividade recente
   - Gerenciamento de assinatura (portal Stripe)
   - Ações rápidas

#### Rotas Atualizadas

**App.tsx** atualizado com:
- `AuthProvider` wrapping toda a aplicação
- `/login-new` - Nova página de login
- `/pricing` - Página de planos
- `/dashboard` - Dashboard de conta (público, mas requer auth)
- `/analytics` - Dashboard de analytics (protegido, admin only)

## 💰 Planos e Preços

### Free (Grátis)
- 1 hora de transmissão/mês
- Qualidade até 720p
- Até 3 participantes
- Streaming multi-plataforma
- ❌ Sem AI Assistant
- ❌ Sem gravação
- Suporte: Comunidade

### Pro ($29/mês)
- ✅ Transmissão ilimitada
- Qualidade até 1080p
- Até 10 participantes
- ✅ AI Studio Assistant
- ✅ Gravação local ilimitada
- ✅ Controle PTZ de câmeras
- ✅ Overlay de comentários
- Suporte: Email

### Enterprise ($99/mês)
- ✅ Tudo do Pro +
- Qualidade 4K
- Até 20 participantes
- ✅ Transições customizadas
- ✅ API Access
- Suporte: Prioritário
- Onboarding personalizado

## 🔐 Segurança

- **JWT**: Tokens com expiração de 7 dias
- **Bcrypt**: Hash de senhas com 10 rounds
- **HTTPS**: Obrigatório em produção
- **Stripe**: PCI-compliant, sem armazenamento de dados de cartão
- **Webhooks**: Verificação de assinatura Stripe

## 🚀 Configuração

### Variáveis de Ambiente

Arquivo `.env` criado com:

```env
# Server
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=dev-secret-key-change-in-production-12345678

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Frontend
VITE_API_URL=http://localhost:3000/api
```

### Dependências Instaladas

Backend:
- `bcrypt` - Hash de senhas
- `jsonwebtoken` - JWT tokens
- `stripe` - Integração Stripe
- `mysql2` - Driver MySQL
- `cors` - CORS middleware
- `dotenv` - Variáveis de ambiente
- `uuid` - Geração de IDs

## 📝 Próximos Passos

### Para Desenvolvimento Local

1. **Configurar Stripe**:
   ```bash
   # Criar conta em https://stripe.com
   # Obter chaves de teste
   # Criar produtos e preços
   # Configurar webhook endpoint
   ```

2. **Configurar OAuth (Opcional)**:
   - Google Cloud Console
   - GitHub OAuth Apps

3. **Iniciar Servidor**:
   ```bash
   pnpm run dev
   ```

### Para Produção

1. **Banco de Dados**:
   - Provisionar MySQL/PostgreSQL
   - Executar `server/db/schema.sql`
   - Configurar DATABASE_URL

2. **Stripe**:
   - Mudar para chaves de produção
   - Configurar webhook em produção
   - Ativar modo live

3. **Segurança**:
   - Gerar JWT_SECRET forte
   - Configurar HTTPS
   - Configurar CORS para domínio específico
   - Rate limiting
   - Logs e monitoring

4. **Deploy**:
   - Railway (já configurado)
   - Variáveis de ambiente em produção
   - Testar webhooks Stripe

## 🧪 Testes

### Testar Localmente

1. **Registro**:
   - Acessar `/login-new`
   - Criar conta
   - Verificar JWT no localStorage

2. **Login**:
   - Fazer login
   - Verificar redirecionamento

3. **Dashboard**:
   - Acessar `/dashboard`
   - Verificar dados do usuário

4. **Pricing**:
   - Acessar `/pricing`
   - Clicar em "Assinar Pro"
   - Verificar redirecionamento para Stripe

5. **Webhooks** (requer ngrok ou similar):
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

## 📊 Métricas de Uso

O sistema rastreia:
- Minutos de transmissão
- Minutos de gravação
- Comandos AI executados
- Armazenamento usado

Limites aplicados baseado no plano do usuário.

## 🎯 Diferencial Competitivo

**OnnPlay Studio vs StreamYard**:
- ✅ AI Studio Assistant (exclusivo)
- ✅ Até 20 participantes (vs 10)
- ✅ Controle PTZ de câmeras
- ✅ Mixer de áudio profissional
- ✅ Plano Free generoso (1h/mês)
- ✅ Preço competitivo ($29 vs $39)

## 📚 Documentação Adicional

- `.env.example` - Template de variáveis
- `server/db/schema.sql` - Schema do banco
- Código com comentários detalhados
- TypeScript strict mode (100% type-safe)

## ✅ Status

- ✅ Backend completo (auth + payments)
- ✅ Frontend completo (login, pricing, dashboard)
- ✅ Integração com aplicação existente
- ✅ Compilação bem-sucedida
- ⏳ Testes end-to-end
- ⏳ Deploy em produção

---

**Versão**: 1.0.0  
**Data**: Dezembro 2024  
**Autor**: OnnPlay Studio Team
