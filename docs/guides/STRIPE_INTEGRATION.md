# Stripe Integration - OnnPlay Studio

## Configuração Completa

### Variáveis de Ambiente Configuradas no Railway:

- ✅ `STRIPE_SECRET_KEY` - Chave secreta do Stripe (Live mode)
- ✅ `STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe (Live mode)
- ✅ `STRIPE_WEBHOOK_SECRET` - Secret do webhook
- ✅ `STRIPE_PRO_PRICE_ID` - ID do preço PRO (mensal $39)
- ✅ `STRIPE_PRO_PRICE_ID_MONTHLY` - ID do preço PRO mensal
- ✅ `STRIPE_PRO_PRICE_ID_YEARLY` - ID do preço PRO anual ($348/ano)

### Endpoints Implementados:

- `POST /api/payments/create-checkout` - Criar sessão de checkout
- `POST /api/payments/webhook` - Receber eventos do Stripe
- `POST /api/payments/create-portal` - Criar portal do cliente
- `GET /api/payments/subscription` - Obter assinatura do usuário
- `POST /api/payments/cancel` - Cancelar assinatura
- `POST /api/payments/reactivate` - Reativar assinatura

### Webhook Configurado:

- URL: `https://www.onnplay.com/api/payments/webhook`
- Eventos: 
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### Próximos Passos:

1. ✅ Variáveis configuradas no Railway
2. 🔄 Deploy em andamento
3. ⏳ Criar componente de upgrade no frontend
4. ⏳ Testar fluxo completo de pagamento
