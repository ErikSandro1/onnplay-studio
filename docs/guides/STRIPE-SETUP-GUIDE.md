# 🎯 Guia Completo de Configuração do Stripe

## 📋 Visão Geral

Este guia vai te ajudar a configurar o Stripe do zero, criar os produtos, configurar webhooks e testar o sistema completo. Tempo estimado: **15-20 minutos**.

---

## Passo 1: Criar Conta Stripe (5 minutos)

### 1.1 Acessar Stripe

1. Acesse https://dashboard.stripe.com/register
2. Preencha o formulário:
   - **Email**: Seu email profissional
   - **Nome completo**: Seu nome
   - **País**: Brasil
   - **Senha**: Senha forte
3. Clique em **Create account**
4. Verifique seu email e confirme a conta

### 1.2 Completar Perfil

1. No dashboard, clique em **Complete your profile**
2. Preencha:
   - **Business name**: OnnPlay Studio (ou seu nome)
   - **Business type**: Individual ou Company
   - **Industry**: Software/Technology
   - **Website**: https://onnplay-studio-production.up.railway.app
3. Clique em **Continue**

**✅ Checkpoint**: Você está no dashboard principal do Stripe

---

## Passo 2: Obter Chaves de API (2 minutos)

### 2.1 Acessar API Keys

1. No menu lateral, clique em **Developers**
2. Clique em **API keys**
3. Você verá duas chaves:
   - **Publishable key** (começa com `pk_test_...`)
   - **Secret key** (começa com `sk_test_...`)

### 2.2 Copiar Secret Key

1. Clique em **Reveal test key** na Secret key
2. Copie a chave completa
3. Abra o arquivo `.env` no projeto
4. Cole a chave:
   ```env
   STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
   ```

**✅ Checkpoint**: Secret key configurada no .env

---

## Passo 3: Criar Produtos e Preços (5 minutos)

### 3.1 Criar Produto Pro

1. No menu lateral, clique em **Products**
2. Clique em **Add product**
3. Preencha:
   - **Name**: `OnnPlay Studio Pro`
   - **Description**: `Plano profissional com transmissão ilimitada, 1080p, 10 participantes e AI Studio Assistant`
   - **Image**: (opcional) Upload de uma imagem do produto
4. Em **Pricing**:
   - **Pricing model**: Standard pricing
   - **Price**: `29.00`
   - **Currency**: USD (ou BRL se preferir)
   - **Billing period**: Monthly
   - **Recurring**: ✅ Checked
5. Clique em **Add product**

### 3.2 Copiar Price ID do Pro

1. Na página do produto, você verá a seção **Pricing**
2. Clique no preço que você criou
3. No topo da página, copie o **Price ID** (começa com `price_...`)
4. Abra o arquivo `.env` e cole:
   ```env
   STRIPE_PRO_PRICE_ID=price_seu_id_aqui
   ```

### 3.3 Criar Produto Enterprise

1. Volte para **Products** → **Add product**
2. Preencha:
   - **Name**: `OnnPlay Studio Enterprise`
   - **Description**: `Plano empresarial com 4K, 20 participantes, API access e suporte prioritário`
   - **Image**: (opcional)
3. Em **Pricing**:
   - **Price**: `99.00`
   - **Currency**: USD (ou BRL)
   - **Billing period**: Monthly
   - **Recurring**: ✅ Checked
4. Clique em **Add product**

### 3.4 Copiar Price ID do Enterprise

1. Copie o **Price ID** do produto Enterprise
2. Abra o arquivo `.env` e cole:
   ```env
   STRIPE_ENTERPRISE_PRICE_ID=price_seu_id_aqui
   ```

**✅ Checkpoint**: Dois produtos criados e Price IDs configurados

---

## Passo 4: Configurar Webhooks (5 minutos)

### 4.1 Instalar Stripe CLI (para testes locais)

**No Mac/Linux**:
```bash
brew install stripe/stripe-cli/stripe
```

**No Windows**:
```bash
# Baixar de https://github.com/stripe/stripe-cli/releases
# Extrair e adicionar ao PATH
```

### 4.2 Fazer Login no Stripe CLI

```bash
stripe login
```

Isso abrirá o navegador para você autorizar. Clique em **Allow access**.

### 4.3 Iniciar Webhook Forwarding

Em um terminal separado, execute:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Você verá algo como:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### 4.4 Copiar Webhook Secret

1. Copie o **webhook signing secret** (começa com `whsec_...`)
2. Abra o arquivo `.env` e cole:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
   ```

**✅ Checkpoint**: Webhooks configurados e rodando

---

## Passo 5: Testar o Sistema (5 minutos)

### 5.1 Iniciar a Aplicação

Em outro terminal:

```bash
cd /home/ubuntu/onnplay-studio
pnpm run dev
```

Aguarde até ver:

```
🚀 Server running on http://localhost:3000/
📡 API available at http://localhost:3000/api
```

### 5.2 Criar Conta

1. Abra http://localhost:5173/login-new
2. Clique em **Criar Conta**
3. Preencha:
   - Nome: `Teste User`
   - Email: `teste@example.com`
   - Senha: `senha12345`
4. Clique em **Criar Conta**

**Resultado esperado**: Você será redirecionado para `/studio` e estará logado.

### 5.3 Acessar Pricing

1. Acesse http://localhost:5173/pricing
2. Você verá os 3 planos: Free, Pro, Enterprise
3. Seu plano atual deve estar destacado como **Free**

### 5.4 Testar Checkout

1. Clique em **Assinar Pro**
2. Você será redirecionado para o Stripe Checkout
3. Preencha com dados de teste:
   - **Email**: teste@example.com (ou qualquer)
   - **Card number**: `4242 4242 4242 4242`
   - **MM/YY**: `12/34` (qualquer data futura)
   - **CVC**: `123` (qualquer 3 dígitos)
   - **Name**: `Teste User`
   - **Country**: United States
   - **ZIP**: `12345`
4. Clique em **Subscribe**

**Resultado esperado**: 
- Você será redirecionado para `/dashboard?checkout=success`
- Verá uma notificação de sucesso
- No terminal do Stripe CLI, verá eventos sendo processados

### 5.5 Verificar Dashboard

1. No Dashboard, você verá:
   - **Plano atual**: Pro (com ícone laranja)
   - **Data de renovação**: Próximo mês
   - Botão **Gerenciar Assinatura**

### 5.6 Testar Customer Portal

1. Clique em **Gerenciar Assinatura**
2. Você será redirecionado para o Stripe Customer Portal
3. Lá você pode:
   - Ver detalhes da assinatura
   - Atualizar método de pagamento
   - Cancelar assinatura
   - Ver histórico de faturas

### 5.7 Verificar Webhooks

No terminal do Stripe CLI, você deve ver algo como:

```
2024-12-13 10:30:15   --> checkout.session.completed [evt_xxx]
2024-12-13 10:30:15  <--  [200] POST http://localhost:3000/api/payments/webhook
2024-12-13 10:30:16   --> customer.subscription.created [evt_xxx]
2024-12-13 10:30:16  <--  [200] POST http://localhost:3000/api/payments/webhook
```

**✅ Checkpoint**: Sistema funcionando end-to-end!

---

## Passo 6: Verificar no Dashboard Stripe (2 minutos)

### 6.1 Ver Customers

1. No Stripe Dashboard, vá em **Customers**
2. Você verá o cliente `teste@example.com`
3. Clique nele para ver detalhes

### 6.2 Ver Subscriptions

1. No menu lateral, clique em **Subscriptions**
2. Você verá a assinatura Pro ativa
3. Status: **Active**
4. Próxima cobrança: Próximo mês

### 6.3 Ver Payments

1. No menu lateral, clique em **Payments**
2. Você verá o pagamento de $29.00
3. Status: **Succeeded**

**✅ Checkpoint**: Tudo registrado corretamente no Stripe!

---

## 🎉 Parabéns! Stripe Configurado!

Você completou a configuração do Stripe! Agora o sistema está 100% funcional.

---

## 🧪 Testes Adicionais

### Testar Cancelamento

1. No Dashboard, clique em **Gerenciar Assinatura**
2. No Customer Portal, clique em **Cancel subscription**
3. Confirme o cancelamento
4. Volte para o Dashboard
5. Você verá: "Cancelado - Acesso até o fim do período"

### Testar Reativação

1. No Customer Portal, clique em **Renew subscription**
2. Confirme
3. A assinatura será reativada

### Testar Upgrade

1. Estando no plano Pro, vá para `/pricing`
2. Clique em **Assinar Enterprise**
3. Complete o checkout
4. Sua assinatura será atualizada para Enterprise

### Testar Cartão Recusado

Use o cartão `4000 0000 0000 0002` para simular falha de pagamento.

---

## 🐛 Troubleshooting

### Erro: "Invalid price ID"

**Solução**: Verifique se os Price IDs no `.env` estão corretos. Eles devem começar com `price_`.

### Erro: "Webhook signature verification failed"

**Solução**: 
1. Certifique-se que o Stripe CLI está rodando
2. Copie o webhook secret correto
3. Reinicie o servidor

### Checkout não abre

**Solução**:
1. Verifique se está logado
2. Abra o console do navegador (F12) e veja os erros
3. Verifique se a Secret Key está correta

### Plano não atualiza após checkout

**Solução**:
1. Verifique os logs do webhook no terminal
2. Certifique-se que os eventos estão sendo processados
3. Pode levar alguns segundos para atualizar

---

## 📊 Cartões de Teste

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | ✅ Sucesso |
| 4000 0000 0000 0002 | ❌ Cartão recusado |
| 4000 0025 0000 3155 | 🔐 Requer 3D Secure |
| 4000 0000 0000 9995 | ⏱️ Fundos insuficientes |

---

## 🚀 Próximos Passos

Agora que o Stripe está configurado, você pode:

1. ✅ Implementar limites de uso
2. ✅ Adicionar tracking de uso real
3. ✅ Configurar OAuth
4. ✅ Preparar para produção

---

## 📚 Recursos

- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)

---

**Configuração completa! 🎉**

Agora vamos para a próxima etapa: **Implementar Limites de Uso**!
