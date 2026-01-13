# 🚀 Quick Start - Sistema de Auth e Pagamentos

## Passo 1: Configurar Stripe (Modo Teste)

### 1.1 Criar Conta Stripe

Acesse https://dashboard.stripe.com/register e crie uma conta gratuita.

### 1.2 Obter Chaves de API

No dashboard Stripe:
1. Vá em **Developers** → **API keys**
2. Copie a **Secret key** (começa com `sk_test_...`)
3. Adicione no `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
   ```

### 1.3 Criar Produtos e Preços

No dashboard Stripe:

**Produto Pro:**
1. Vá em **Products** → **Add product**
2. Nome: `OnnPlay Studio Pro`
3. Preço: `$29.00` mensal recorrente
4. Copie o **Price ID** (começa com `price_...`)
5. Adicione no `.env`:
   ```env
   STRIPE_PRO_PRICE_ID=price_seu_id_aqui
   ```

**Produto Enterprise:**
1. Vá em **Products** → **Add product**
2. Nome: `OnnPlay Studio Enterprise`
3. Preço: `$99.00` mensal recorrente
4. Copie o **Price ID**
5. Adicione no `.env`:
   ```env
   STRIPE_ENTERPRISE_PRICE_ID=price_seu_id_aqui
   ```

### 1.4 Configurar Webhooks (Opcional para dev local)

Para testar webhooks localmente:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks para localhost
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copie o **webhook signing secret** (começa com `whsec_...`) e adicione no `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
```

## Passo 2: Iniciar Aplicação

### 2.1 Instalar Dependências (se ainda não fez)

```bash
pnpm install
```

### 2.2 Verificar .env

Certifique-se que o arquivo `.env` tem:

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

### 2.3 Iniciar Servidor

```bash
pnpm run dev
```

Isso iniciará:
- Backend em `http://localhost:3000`
- Frontend em `http://localhost:5173`

## Passo 3: Testar o Sistema

### 3.1 Criar Conta

1. Acesse http://localhost:5173/login-new
2. Clique em **Criar Conta**
3. Preencha:
   - Nome: `Seu Nome`
   - Email: `seu@email.com`
   - Senha: `senha123456` (mínimo 8 caracteres)
4. Clique em **Criar Conta**

✅ Você será redirecionado para `/studio` e estará logado!

### 3.2 Verificar Dashboard

1. Acesse http://localhost:5173/dashboard
2. Você verá:
   - Seu perfil
   - Plano atual: **Free**
   - Uso do mês (mock data)
   - Botão para fazer upgrade

### 3.3 Ver Planos

1. Acesse http://localhost:5173/pricing
2. Você verá os 3 planos:
   - **Free**: Grátis
   - **Pro**: $29/mês
   - **Enterprise**: $99/mês

### 3.4 Testar Checkout Stripe

1. Na página de Pricing, clique em **Assinar Pro**
2. Você será redirecionado para o Stripe Checkout
3. Use cartão de teste:
   - Número: `4242 4242 4242 4242`
   - Data: Qualquer data futura
   - CVC: Qualquer 3 dígitos
   - CEP: Qualquer CEP
4. Complete o pagamento

✅ Você será redirecionado de volta para `/dashboard?checkout=success`

### 3.5 Verificar Assinatura

1. No Dashboard, você verá:
   - Plano atual: **Pro**
   - Data de renovação
   - Botão **Gerenciar Assinatura**
2. Clique em **Gerenciar Assinatura**
3. Você será redirecionado para o Stripe Customer Portal
4. Lá você pode:
   - Atualizar método de pagamento
   - Cancelar assinatura
   - Ver histórico de faturas

### 3.6 Testar Logout

1. No Dashboard, clique no ícone de **Logout** (canto superior direito)
2. Você será deslogado e redirecionado para `/login`

## Passo 4: Testar API Diretamente (Opcional)

### 4.1 Registro via API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha12345",
    "name": "Usuário Teste"
  }'
```

Resposta:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "teste@example.com",
    "name": "Usuário Teste",
    "plan": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4.2 Login via API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha12345"
  }'
```

### 4.3 Obter Usuário Atual

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 4.4 Listar Planos

```bash
curl http://localhost:3000/api/payments/plans
```

Resposta:
```json
{
  "success": true,
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": { ... }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29,
      "features": { ... }
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 99,
      "features": { ... }
    }
  ]
}
```

## Passo 5: Verificar Logs

### 5.1 Logs do Servidor

No terminal onde você executou `pnpm run dev`, você verá:

```
🚀 Server running on http://localhost:3000/
📡 API available at http://localhost:3000/api
🎨 Frontend served from /path/to/dist/public
```

### 5.2 Logs de Webhooks (se configurado)

No terminal do Stripe CLI:

```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
2024-12-13 10:30:15   --> customer.subscription.created [evt_...]
2024-12-13 10:30:15  <--  [200] POST http://localhost:3000/api/payments/webhook
```

## 🐛 Troubleshooting

### Erro: "Missing authorization header"

Você não está autenticado. Faça login primeiro e certifique-se que o token está sendo enviado.

### Erro: "Invalid or expired token"

Seu token expirou (7 dias). Faça login novamente.

### Erro: "Invalid plan"

Verifique se os Price IDs do Stripe estão corretos no `.env`.

### Erro: "Failed to create checkout session"

Verifique:
1. Stripe Secret Key está correta
2. Price IDs existem no Stripe
3. Você está autenticado

### Página em branco após login

Verifique o console do navegador (F12). Pode ser um erro de CORS ou API URL incorreta.

## 📊 Dados de Teste

### Cartões de Teste Stripe

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Sucesso |
| 4000 0000 0000 0002 | Falha (cartão recusado) |
| 4000 0025 0000 3155 | Requer autenticação 3D Secure |

### Usuários de Teste

Crie quantos usuários quiser! O banco é in-memory, então os dados são perdidos ao reiniciar o servidor.

## 🎯 Próximos Passos

1. ✅ Sistema funcionando localmente
2. ⏳ Configurar banco de dados real (MySQL/PostgreSQL)
3. ⏳ Configurar OAuth (Google, GitHub)
4. ⏳ Implementar limites de uso baseados no plano
5. ⏳ Adicionar tracking de uso real
6. ⏳ Deploy em produção

## 🚀 Deploy em Produção

Quando estiver pronto:

1. Configure banco de dados em produção
2. Mude Stripe para modo live
3. Configure variáveis de ambiente no Railway
4. Configure webhook endpoint público
5. Teste tudo em staging primeiro!

## 📚 Recursos

- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [JWT Best Practices](https://jwt.io/introduction)
- [Documentação completa](./AUTH-PAYMENT-SYSTEM.md)

---

**Dúvidas?** Consulte `AUTH-PAYMENT-SYSTEM.md` para documentação completa!
